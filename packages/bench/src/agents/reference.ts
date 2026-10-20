/**
 * The `reference` agent — infrastructure validation. A deterministic solver
 * that executes the scenario's `reference.steps` with the session and world
 * APIs as the learner: world actions and clinical actions are `world_action`
 * / `clinical_action` ops (so every clinical effect still passes the
 * learner's tool path: the spatial gate, hooks, the approval gate, the
 * engine), delegation and skills are slash commands, perception reads the
 * world. Each API call is recorded as the tool call a model would make
 * (`navigate_to`, `interact_object`, `order_test`…), so tool-call counts are
 * comparable across agents and a recorded run can be turned into a scripted
 * plan (`planFromCalls`).
 *
 * A `clinical` step is carried out with the body, like the embodied
 * autopilot: the spatial requirement is satisfied first (walk to the
 * refusal's hint; wheel a cart to the bedside when the policy asks for it),
 * a device operation that carries the act out is preferred (an ECG cart's
 * prepare → connect → record → reset, the patient's monitor `attach`, a
 * workstation's `order` / `read`, a device's `use`) — a busy or
 * out-of-service device is replaced by another provider —, else the
 * clinical act itself; then the engine state is verified.
 */
import {
  actionIntent,
  actionToolArgs,
  actionToolName,
  clinicalOperation,
  clinicianOfflineSteps,
  heldBy,
  minutesUntilReadable,
  operationPath,
  releaseOperation,
  stepAlreadySatisfied,
  stepForAction,
  type AgentEvent,
  type DeviceRoute,
  type OfflineClinicianStep,
} from "@clinicalcraft/agent";
import { assignPatientSlot, type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
import { behaviorOf, PRIMARY_ACTOR, type ClinicalIntent, type EntityQuery, type NavGoal, type ObservedEntity, type SpatialCheck, type WorldActionRequest, type WorldActionResult, type WorldRuntime } from "@clinicalcraft/world";
import { footprintDistance } from "../predicates.js";
import type { RecordedCall } from "../recorder.js";
import type { BenchFindQuery, ReferenceStep, ScriptedCall } from "../schema.js";
import { resolveAnswer } from "../session.js";
import type { BenchAgent, BenchAgentContext } from "./types.js";

/** The run was stopped (a limit): the solver ends quietly. */
class Stopped extends Error {}

/** The reference solver met an outcome its step did not expect (the run is reported as an error). */
export class ReferenceExpectationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceExpectationError";
  }
}

/** Codes of a learner `error` event → refusal codes. */
function errorCode(code: string | undefined): string {
  if (code === "SPATIAL_REQUIREMENT_UNMET" || code === "SPATIAL_PRECONDITION_CHANGED") return code;
  if (code === "permission_denied") return "APPROVAL_DENIED";
  if (code === "invalid_action") return "INVALID_ARGS";
  return "TOOL_ERROR";
}

/** Device outcomes after which the act must not be retried another way (a person or the engine said no). */
const FINAL_CODES = new Set(["APPROVAL_DENIED", "CANCELLED", "CLINICAL_REJECTED"]);
/** Device outcomes that call for another provider. */
const REPLACE_CODES = new Set(["DEVICE_BUSY", "DEVICE_UNAVAILABLE"]);

const MAX_APPROACHES = 4;
const MAX_WAIT = 240;

interface Outcome {
  ok: boolean;
  code?: string;
  output: string;
}

class ReferenceSolver {
  private readonly saved = new Map<string, ObservedEntity[]>();
  private seq = 0;
  private readonly c: CaseDefinition;
  private readonly L: string;

  constructor(private readonly ctx: BenchAgentContext) {
    this.c = ctx.session.caseDef;
    this.L = ctx.session.settings.locale;
  }

  private get world(): WorldRuntime {
    return this.ctx.world;
  }

  async run(): Promise<void> {
    try {
      for (const step of this.ctx.scenario.reference.steps) await this.step(step);
    } catch (err) {
      if (!(err instanceof Stopped)) throw err;
    }
  }

  /* ---------------- recording ---------------- */

  private guard(): void {
    if (this.ctx.signal.aborted) throw new Stopped();
  }

  private async call<T extends Outcome>(tool: string, args: unknown, fn: () => Promise<T>): Promise<T> {
    this.guard();
    const t0 = performance.now();
    const mark = this.ctx.recorder.refusals.length;
    const out = await fn();
    // Refusals the op caused are the refusals of this (tool-equivalent) call.
    this.ctx.recorder.tagSince(mark, tool);
    const rec: RecordedCall = { tool, args, ok: out.ok, ...(out.ok || !out.code ? {} : { code: out.code }), output: out.output, ms: performance.now() - t0 };
    this.ctx.recorder.record(rec);
    return out;
  }

  /* ---------------- world ---------------- */

  private async act(request: Omit<WorldActionRequest, "actionId" | "actorId">): Promise<WorldActionResult> {
    const actionId = `ref-${++this.seq}`;
    const events = await this.ctx.session.run({ type: "world_action", request: { actionId, actorId: PRIMARY_ACTOR, ...request } });
    const found = events.find((e) => e.msg.type === "world_action_result" && e.msg.result.actionId === actionId);
    const result = found && found.msg.type === "world_action_result" ? found.msg.result : this.world.feedback(actionId);
    if (!result) throw new ReferenceExpectationError(`world action ${request.operation} produced no result`);
    return result;
  }

  private worldOutcome(r: WorldActionResult): Outcome & { result: WorldActionResult } {
    return { ok: r.status === "completed", ...(r.status === "completed" ? {} : { code: r.errorCode ?? "TOOL_ERROR" }), output: r.message, result: r };
  }

  private navigate(goal: NavGoal): Promise<Outcome & { result: WorldActionResult }> {
    return this.call("navigate_to", { goal }, async () => this.worldOutcome(await this.act({ operation: "navigate", goal })));
  }

  /** A device / door / cart operation; a reach refusal's hint is followed once. */
  private async operate(targetId: string, operation: string, parameters?: Record<string, unknown>, goal?: NavGoal): Promise<Outcome & { result: WorldActionResult }> {
    const args = { target: targetId, operation, ...(parameters || goal ? { parameters: { ...(parameters ?? {}), ...(goal ? { goal } : {}) } } : {}) };
    const once = () => this.call("interact_object", args, async () => this.worldOutcome(await this.act({ operation, targetId, ...(parameters ? { parameters } : {}), ...(goal ? { goal } : {}) })));
    let out = await once();
    if (!out.ok && out.result.hint && (out.code === "NOT_IN_RANGE" || out.code === "NOT_VISIBLE")) {
      const nav = await this.navigate(out.result.hint.goal);
      if (nav.ok) out = await once();
    }
    return out;
  }

  private find(q: BenchFindQuery): ObservedEntity[] {
    const query: EntityQuery = {};
    if (q.kind) query.kind = q.kind;
    if (q.type) query.type = q.type;
    if (q.capabilities) query.capabilities = q.capabilities;
    if (q.name) query.name = q.name;
    if (q.room) query.room = q.room.replace(/^room:/, "");
    if (q.visibleOnly) query.visibleOnly = true;
    const filtered = Boolean(q.interaction || q.portableOnly);
    query.limit = filtered ? 500 : (q.limit ?? 12);
    let list = this.world.find(PRIMARY_ACTOR, query);
    if (filtered) {
      list = list.filter((e) => {
        const def = this.world.entity(e.id);
        return (!q.interaction || def?.interaction === q.interaction) && (!q.portableOnly || Boolean(def?.portable));
      });
      list = list.slice(0, q.limit ?? 8);
    }
    return list;
  }

  /* ---------------- clinical ---------------- */

  /** A learner `clinical_action` op: the act through the learner's tool path. */
  private clinicalOp(action: ClinicalAction): Promise<Outcome> {
    const tool = actionToolName(action) ?? action.type;
    const args = actionToolName(action) ? actionToolArgs(this.c, action, this.L) : { ...action };
    return this.call(tool, args, async () => {
      const events: AgentEvent[] = await this.ctx.session.run({ type: "clinical_action", action: { ...action, by: "learner" } as ClinicalAction });
      let rejected: string | null = null;
      let accepted = false;
      let error: { code?: string; message: string } | null = null;
      let warning = "";
      for (const e of events) {
        const m = e.msg;
        if (m.type === "clinical_event") {
          if (m.event.type === "action.rejected") rejected = m.event.code;
          else accepted = true;
        } else if (m.type === "error" && !error) error = { ...(m.code ? { code: m.code } : {}), message: m.message };
        else if (m.type === "warning" && !warning) warning = m.message;
      }
      if (error) return { ok: false, code: errorCode(error.code), output: error.message };
      if (rejected) return { ok: false, code: "CLINICAL_REJECTED", output: warning || rejected };
      if (!accepted) return { ok: false, code: "CLINICAL_REJECTED", output: warning || "refused before the engine" };
      return { ok: true, output: warning || "ok" };
    });
  }

  private patientId(): string | null {
    const slot = this.ctx.session.facility ? assignPatientSlot(this.ctx.session.facility, this.c) : null;
    return slot && this.world.entity(`patient:${slot.id}`) ? `patient:${slot.id}` : null;
  }

  private patientMonitorId(): string | null {
    const slot = this.ctx.session.facility ? assignPatientSlot(this.ctx.session.facility, this.c) : null;
    return slot?.monitor && this.world.entity(`eq:${slot.monitor}`) ? `eq:${slot.monitor}` : null;
  }

  /** Walk (and fetch) until the act's spatial requirement holds. */
  private async satisfy(intent: ClinicalIntent): Promise<SpatialCheck> {
    const patient = this.patientId();
    let check = this.world.checkSpatial(PRIMARY_ACTOR, intent);
    for (let i = 0; i < MAX_APPROACHES && !check.ok && check.hint; i++) {
      const goal = check.hint.goal;
      if (check.reason === "provider-not-at-bedside" && goal.kind === "interact" && patient) {
        if (!(await this.navigate(goal)).ok) break;
        if (!(await this.operate(goal.id, "move_to", undefined, { kind: "interact", id: patient })).ok) break;
      } else if (!(await this.navigate(goal)).ok) break;
      check = this.world.checkSpatial(PRIMARY_ACTOR, intent);
    }
    return check;
  }

  /** Capabilities the act's case item requires. */
  private itemRequires(action: ClinicalAction): string[] {
    if (action.type === "order" || action.type === "read") return this.c.investigations.find((i) => i.id === action.investigationId)?.requires ?? [];
    if (action.type === "intervene") return this.c.interventions.find((i) => i.id === action.interventionId)?.requires ?? [];
    return [];
  }

  private routeFor(entityId: string, action: ClinicalAction): DeviceRoute | null {
    const tool = actionToolName(action);
    const item = action.type === "order" || action.type === "read" ? action.investigationId : action.type === "intervene" ? action.interventionId : null;
    if (!tool || !item) return null;
    return clinicalOperation(this.world, entityId, tool, item, this.c, this.L, action.type === "read" ? action.phase : undefined);
  }

  /**
   * Devices that could carry the act out: the patient's monitor for a monitoring intervention, then those that
   * satisfied the requirement. When the act needs the body at the patient, a fixed device is used only through an
   * operation done from the patient's side (a monitor's `attach`): a wall outlet or an IV pole may stand where no
   * spot is both within its reach and at the patient — the policy already counts it as the bedside provider, so the
   * act is done at the patient's side instead (carts are wheeled over, see `runDevice`).
   */
  private routes(action: ClinicalAction, satisfiedBy: readonly string[]): DeviceRoute[] {
    const patient = this.patientId();
    const needsPatient = patient !== null && satisfiedBy.includes(patient);
    const ids = satisfiedBy.filter((id) => id !== patient);
    if (action.type === "intervene" && this.c.interventions.find((i) => i.id === action.interventionId)?.kind === "monitoring") {
      const monitor = this.patientMonitorId();
      if (monitor) ids.unshift(monitor);
    }
    return [...new Set(ids)].flatMap((id) => {
      const r = this.routeFor(id, action);
      if (!r) return [];
      const fromPatientSide = r.op.requires.some((req) => "patientWithin" in req);
      if (needsPatient && !this.world.entity(id)?.portable && !fromPatientSide) return [];
      return [r];
    });
  }

  /** Other in-service equipment that provides what the act requires, nearest by walking first. */
  private alternates(action: ClinicalAction, exclude: ReadonlySet<string>): DeviceRoute[] {
    const needed = this.itemRequires(action);
    if (!needed.length) return [];
    const snapshot = this.world.snapshot();
    const candidates = this.world
      .entities()
      .filter((e) => e.kind === "equipment" && !exclude.has(e.id) && snapshot.entities[e.id]?.available !== false && needed.some((cap) => e.capabilities.includes(cap)))
      .map((e) => {
        const plan = this.world.plan(PRIMARY_ACTOR, { kind: "interact", id: e.id });
        return { id: e.id, length: plan.ok ? plan.length : Number.POSITIVE_INFINITY };
      })
      .filter((x) => Number.isFinite(x.length))
      .sort((a, b) => a.length - b.length || (a.id < b.id ? -1 : 1));
    return candidates.flatMap((x) => {
      const r = this.routeFor(x.id, action);
      return r ? [r] : [];
    });
  }

  /**
   * A device's behaviour state: as the clinician perceives it, else (the solver is privileged: a cart it has not
   * seen yet) as stored, else the behaviour's initial state.
   */
  private deviceState(route: DeviceRoute): string | null {
    const seen = this.world.inspect(PRIMARY_ACTOR, route.entityId)?.state;
    if (seen) return seen;
    if (route.spec.stateSource !== "stored") return null;
    return this.world.snapshot().entities[route.entityId]?.state ?? route.spec.initial;
  }

  /** A cart that cannot be operated from where the clinician stands at the patient's side (it must be wheeled there). */
  private cartAway(entityId: string): boolean {
    const e = this.world.entity(entityId);
    const patient = this.patientId();
    if (e?.portable !== "cart" || !patient) return false;
    const plan = this.world.plan(PRIMARY_ACTOR, { kind: "interact", id: patient });
    if (!plan.ok) return false;
    const moved = this.world.snapshot().entities[entityId]?.position;
    const at = moved ? { x: moved.x, z: moved.z, level: moved.level } : { x: e.position.x, z: e.position.z, level: e.level };
    return at.level !== plan.target.level || footprintDistance(plan.target, at, e.footprint) > e.reach;
  }

  /** Operate a device up to its clinical operation (wheeling a cart to the patient first when it is out of reach of the bedside), then release it. */
  private async runDevice(route: DeviceRoute): Promise<"done" | "final" | "replace" | "fallback"> {
    const before = new Set(heldBy(this.world, PRIMARY_ACTOR));
    try {
      return await this.runDeviceSteps(route);
    } finally {
      // Whatever happened — done, refused, failed — the solver leaves no device it reserved reserved (review C3).
      await this.releaseHeldDevices(before);
    }
  }

  /** Reset every device the clinician holds now that it did not hold `before` (best effort). */
  private async releaseHeldDevices(before: ReadonlySet<string>): Promise<void> {
    for (const id of heldBy(this.world, PRIMARY_ACTOR)) {
      const e = this.world.entity(id);
      if (before.has(id) || !e || e.kind !== "equipment") continue;
      const release = releaseOperation(behaviorOf(e), this.world.inspect(PRIMARY_ACTOR, id)?.state ?? null);
      if (release) await this.operate(id, release.id);
    }
  }

  private async runDeviceSteps(route: DeviceRoute): Promise<"done" | "final" | "replace" | "fallback"> {
    const path = operationPath(route.spec, this.deviceState(route), route.op);
    if (!path) return "fallback";
    const patient0 = this.patientId();
    if (patient0 && this.cartAway(route.entityId)) {
      if (!(await this.navigate({ kind: "interact", id: route.entityId })).ok) return "fallback";
      const moved = await this.operate(route.entityId, "move_to", undefined, { kind: "interact", id: patient0 });
      if (!moved.ok) return REPLACE_CODES.has(moved.code ?? "") ? "replace" : "fallback";
    }
    for (const op of path) {
      const r = await this.operate(route.entityId, op);
      if (!r.ok) return REPLACE_CODES.has(r.code ?? "") ? "replace" : r.code === "CANCELLED" ? "final" : "fallback";
    }
    let done = await this.operate(route.entityId, route.op.id, route.parameters);
    const patient = this.patientId();
    if (!done.ok && done.code === "SPATIAL_REQUIREMENT_UNMET" && patient && this.world.entity(route.entityId)?.portable === "cart") {
      // The act needs the body at the patient and the cart within reach: wheel the cart to the patient.
      const moved = await this.operate(route.entityId, "move_to", undefined, { kind: "interact", id: patient });
      if (moved.ok) done = await this.operate(route.entityId, route.op.id, route.parameters);
    }
    if (done.ok) {
      const release = releaseOperation(route.spec, this.deviceState(route));
      if (release) await this.operate(route.entityId, release.id);
      return "done";
    }
    if (FINAL_CODES.has(done.code ?? "")) return "final";
    return REPLACE_CODES.has(done.code ?? "") ? "replace" : "fallback";
  }

  private satisfied(action: ClinicalAction, before?: OfflineClinicianStep): boolean {
    return stepAlreadySatisfied(before ?? stepForAction(this.c, action, this.L), this.ctx.session.state);
  }

  /** Wait (simulated time) until a read's result is ready. */
  private async readyToRead(action: ClinicalAction): Promise<void> {
    const pending = minutesUntilReadable(this.c, this.ctx.session.state, action);
    if (pending > 0) await this.clinicalOp({ type: "advance-time", minutes: Math.min(MAX_WAIT, Math.max(0.01, Math.round(pending * 100) / 100)) });
  }

  /** A clinical act carried out with the body (see the module docs); true when the engine state shows it done. */
  private async embodied(action: ClinicalAction, step?: OfflineClinicianStep): Promise<boolean> {
    if (action.type === "read") await this.readyToRead(action);
    const intent = actionIntent(action);
    if (intent) {
      let check = await this.satisfy(intent);
      if (!check.ok) return false;
      const tried = new Set<string>();
      let queue = this.routes(action, check.satisfiedBy);
      while (queue.length) {
        const route = queue.shift()!;
        if (tried.has(route.entityId)) continue;
        tried.add(route.entityId);
        const outcome = await this.runDevice(route);
        if (outcome === "done") return this.satisfied(action, step);
        if (outcome === "final") return false;
        if (outcome === "replace") queue = [...queue, ...this.alternates(action, tried)];
      }
      if (tried.size) {
        // A device detour may have moved the body: back to where the act itself can be done.
        check = await this.satisfy(intent);
        if (!check.ok) return false;
      }
    }
    const r = await this.clinicalOp(action);
    return r.ok && this.satisfied(action, step);
  }

  /** The whole case: every step of its reference solution (the embodied autopilot's walkthrough rules). */
  private async solveCase(): Promise<void> {
    const steps = clinicianOfflineSteps(this.c, this.L);
    let cursor = 0;
    while (cursor < steps.length && !this.ctx.session.state.finished) {
      this.guard();
      const step = steps[cursor]!;
      const state = this.ctx.session.state;
      if (stepAlreadySatisfied(step, state)) {
        cursor++;
        continue;
      }
      if (step.kind === "action") {
        // start / hint / flag / note: the walkthrough's own bookkeeping, not a clinical act.
        this.ctx.session.dispatch({ ...step.action, by: "agent" } as ClinicalAction);
        cursor++;
        continue;
      }
      const a = step.action;
      const pending =
        a.type === "advance-time" && step.refClockAfter !== undefined ? step.refClockAfter - state.clock : a.type === "advance-time" ? a.minutes : minutesUntilReadable(this.c, state, a);
      if (a.type === "advance-time") {
        if (pending > 0) await this.clinicalOp({ type: "advance-time", minutes: Math.min(MAX_WAIT, Math.max(0.01, Math.round(pending * 100) / 100)) });
        cursor++;
        continue;
      }
      await this.embodied(a, step);
      cursor++;
    }
  }

  /* ---------------- steps ---------------- */

  private async step(step: ReferenceStep): Promise<void> {
    const world = this.world;
    switch (step.op) {
      case "observe":
        await this.call("observe_world", {}, async () => {
          const obs = world.observe(PRIMARY_ACTOR);
          return { ok: true, output: `${obs.entities.length} entities` };
        });
        return;
      case "find": {
        const q = step.query;
        const objects = Boolean(q.interaction || q.portableOnly || q.kind === "equipment") && !q.room && !q.visibleOnly;
        // Recorded with the tool's own argument names (a recorded run converts to a valid scripted plan).
        const args = objects
          ? { ...(q.name ? { query: q.name } : {}), ...(q.capabilities ? { capabilities: q.capabilities } : {}), ...(q.type ? { type: q.type } : {}), ...(q.interaction ? { interaction: q.interaction } : {}), ...(q.portableOnly ? { portable_only: true } : {}), ...(q.limit ? { limit: q.limit } : {}) }
          : { ...(q.name ? { name: q.name } : {}), ...(q.kind ? { kind: q.kind } : {}), ...(q.type ? { type: q.type } : {}), ...(q.capabilities ? { capabilities: q.capabilities } : {}), ...(q.room ? { room: q.room } : {}), ...(q.visibleOnly ? { visible_only: true } : {}), ...(q.limit ? { limit: q.limit } : {}) };
        const list = await this.call(objects ? "find_objects" : "find_entities", args, async () => {
          const found = this.find(q);
          return { ok: true, output: found.map((e) => e.id).join(", ") || "none", found };
        });
        if (step.save) this.saved.set(step.save, list.found);
        return;
      }
      case "inspect": {
        const id = world.resolveId(step.target) ?? step.target;
        await this.call("inspect_object", { target: id }, async () => {
          const info = world.inspect(PRIMARY_ACTOR, id);
          return info ? { ok: true, output: `${info.id}: ${info.state ?? "-"}` } : { ok: false, code: "TARGET_NOT_FOUND", output: `not aware of ${id}` };
        });
        return;
      }
      case "answer": {
        const first = step.from ? this.saved.get(step.from)?.[0] : undefined;
        const raw = step.entity ?? (step.room ? (first?.room ? `room:${first.room}` : "") : (first?.id ?? ""));
        await this.call("submit_answer", { entity_id: raw }, async () => {
          const resolved = resolveAnswer(world, raw);
          this.ctx.answers.submit({ raw, resolved });
          return resolved ? { ok: true, output: `answer ${resolved}` } : { ok: false, code: "TOOL_ERROR", output: `unknown entity ${raw}` };
        });
        return;
      }
      case "navigate": {
        let goal = step.goal;
        if (!goal && step.target) {
          const id = world.resolveId(step.target);
          if (!id) throw new ReferenceExpectationError(`unknown navigation target ${step.target}`);
          goal = id.startsWith("room:") ? { kind: "room", id: id.slice(5) } : { kind: "interact", id };
        }
        const r = await this.navigate(goal!);
        if (!r.ok) throw new ReferenceExpectationError(`navigation failed: ${r.code} ${r.output}`);
        return;
      }
      case "interact": {
        const ref = step.target.startsWith("@") ? (this.saved.get(step.target.slice(1))?.[0]?.id ?? step.target) : step.target;
        const id = world.resolveId(ref) ?? ref;
        const r = await this.operate(id, step.operation, step.parameters as Record<string, unknown> | undefined, step.goal);
        if (step.expect ? r.ok || r.code !== step.expect : !r.ok) throw new ReferenceExpectationError(`interact ${step.operation} ${id}: expected ${step.expect ?? "success"}, got ${r.ok ? "success" : r.code}`);
        return;
      }
      case "clinical": {
        const ok = await this.embodied(step.action);
        if (!ok) throw new ReferenceExpectationError(`clinical ${step.action.type} was not carried out`);
        return;
      }
      case "attempt": {
        const r = await this.clinicalOp(step.action);
        if (r.ok || r.code !== step.expect) throw new ReferenceExpectationError(`attempt ${step.action.type}: expected ${step.expect}, got ${r.ok ? "success" : r.code}`);
        return;
      }
      case "delegate":
      case "skill": {
        const isDelegate = step.op === "delegate";
        const tool = isDelegate ? "delegate_task" : "execute_skill";
        const kv = (params: Record<string, unknown> | undefined) => Object.entries(params ?? {}).map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`);
        const args = isDelegate
          ? { role: step.role, task: step.task, ...(step.target ? { target: step.target } : {}) }
          : { skill_id: step.id, ...(step.params ? { params: step.params } : {}) };
        const line = isDelegate ? [step.role, step.task, ...(step.target ? [step.target] : [])].join(" ") : [step.id, ...kv(step.params as Record<string, unknown> | undefined)].join(" ");
        const r = await this.call(tool, args, async () => {
          const events = await this.ctx.session.run({ type: "slash_command", name: isDelegate ? "delegate" : "skill", args: line });
          const out = events.flatMap((e) => (e.msg.type === "command_output" ? [e.msg] : []))[0];
          const data = (out?.data ?? null) as { ok?: boolean } | null;
          return data?.ok ? { ok: true, output: out?.text ?? "" } : { ok: false, code: "TOOL_ERROR", output: out?.text ?? "no output" };
        });
        if (!r.ok) throw new ReferenceExpectationError(`${tool} failed: ${r.output.split("\n")[0]}`);
        return;
      }
      case "solve-case":
        await this.solveCase();
        return;
    }
  }
}

/** The reference agent. */
export function createReferenceAgent(): BenchAgent {
  return {
    kind: "reference",
    provider: null,
    model: null,
    wiring: () => ({}),
    run: (ctx) => new ReferenceSolver(ctx).run(),
  };
}

/**
 * A scripted plan from recorded calls (the reference solver's tool-equivalent
 * calls): what a model would have called, in order — for authoring a
 * scenario's `scripted.plan` from its reference run.
 */
export function planFromCalls(calls: readonly RecordedCall[], options: { onlySuccessful?: boolean } = {}): ScriptedCall[] {
  return calls
    .filter((c) => !options.onlySuccessful || c.ok)
    .map((c) => ({ tool: c.tool, ...(c.args && typeof c.args === "object" && Object.keys(c.args as object).length ? { args: c.args as Record<string, never> } : {}) }));
}
