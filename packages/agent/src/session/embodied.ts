/**
 * Embodied mode of a session (docs/EMBODIED.md R3, R8, §4–§10): one world per
 * encounter (`@clinicalcraft/world` `createWorldRuntime`, headless unless a
 * front-end supplies a `Mover` / `CameraSensor`), wired to the session:
 *
 * - `ClinicalView` — the case, the engine state, the bedside snapshot
 *   (`vitalsAt`, exactly what `check_vitals` shows), the patient's bystander
 *   cues (core `patientCues`), the clock;
 * - `ClinicalPort` — `invoke(actor, tool, args)` runs a device operation's
 *   clinical tool through THE SAME tool path as the agent that asked for the
 *   world action (model agents: `executeToolCall` — hooks, precheck,
 *   approval gate; the learner: `runLearnerTool`); `elapse(seconds, reason)`
 *   dispatches `advance-time { reason }` (minutes × `clock.realtimeScale`) on
 *   simulated clocks only (EMBODIED R8);
 * - the spatial gate of the clinical tools (`tools/spatial.ts`), the world
 *   tools (`tools/world.ts`), delegation, skills;
 * - the episode trace (`SessionTrace`), `world_event` / `world_action_result`
 *   events, and `world` transcript snapshots after every committed
 *   state-changing action (resume restores them).
 *
 * The acting body of a call is `ctx.actorId`, else the learner's avatar
 * (`actor:clinician`, also driven by the clinician agent and the autopilot);
 * delegated staff act with their `staff:*` body. `world()` is a stable handle:
 * a language switch rebuilds the runtime from its snapshot behind it.
 */
import { assignPatientSlot, patientCues, t, vitalsAt, type ClinicalAction, type DomainEvent, type EquipmentCatalog, type FacilityDefinition, type CaseDefinition, type ReduceResult, type SessionState } from "@clinicalcraft/core";
import {
  createWorldRuntime,
  PRIMARY_ACTOR,
  rhythmAtBedside,
  type ActorId,
  type CameraSensor,
  type ClinicalIntent,
  type ClinicalInvokeResult,
  type ClinicalPort,
  type ClinicalView,
  type Mover,
  type Pose,
  type SpatialCheck,
  type WorldActionRequest,
  type WorldActionResult,
  type WorldEvent,
  type WorldRuntime,
  type WorldStateSnapshot,
} from "@clinicalcraft/world";
import type { EventMsg } from "../protocol.js";
import type { ResolvedSettings } from "../settings/schema.js";
import { parseSkill, type SkillDefinition } from "../skills/schema.js";
import { runSkill, skillResultText, type SkillRunner, type SkillToolCall } from "../skills/interpreter.js";
import { strArg } from "../tools/clinical.js";
import { spatiallyGated, SPATIALLY_GATED_TOOLS, spatialCodeOf, type SpatialGate } from "../tools/spatial.js";
import type { ToolContext, ToolDefinition, ToolOutput } from "../tools/types.js";
import { createWorldTools, taskLabel, type WorldRequestInput, type WorldToolHost } from "../tools/world.js";
import { runDelegation, type DelegationResult } from "./delegation.js";
import type { ClinicalCaller } from "./embodied-types.js";
import { rt, type RuntimeKey } from "./i18n.js";
import { SessionTrace } from "./trace.js";

export type { ClinicalCaller } from "./embodied-types.js";

/** Thrown when an embodied session cannot be built (bilingual message, stable `code`). */
export class EmbodimentError extends Error {
  readonly code = "embodiment_requires_facility";
  constructor(message: string) {
    super(message);
    this.name = "EmbodimentError";
  }
}

/** What the embodied mode needs from its session. */
export interface EmbodiedHost {
  readonly sessionId: string;
  readonly caseDef: CaseDefinition;
  readonly facility: FacilityDefinition | null;
  readonly catalogs: EquipmentCatalog[];
  locale(): string;
  state(): SessionState;
  settings(): ResolvedSettings;
  now(): number;
  newId(): string;
  /** Dispatch an engine action outside any tool (travel / procedure time). */
  dispatch(action: ClinicalAction): ReduceResult;
  /** Run a tool through a caller's tool path, with the acting body (and the world action carrying it out). */
  runTool(caller: ClinicalCaller, tool: string, args: Record<string, unknown>, extra: { actorId: ActorId; worldActionId?: string }): Promise<SkillToolCall>;
  /** Emit an event (the caller's submission, else the current one). */
  emit(msg: EventMsg, submission?: string): void;
  /** Write a `world` transcript item. */
  recordWorld(snapshot: WorldStateSnapshot): void;
  /** The session clock as the learner reads it ("09:12 (12 min)"). */
  clockText(): string;
  /** Built-in + project skills. */
  skills(): readonly SkillDefinition[];
}

export interface EmbodiedOptions {
  mover?: Mover;
  camera?: CameraSensor;
  spawn?: Pose;
  snapshot?: WorldStateSnapshot;
}

/** Results kept in a transcript snapshot (without paths and events: resume needs states, not telemetry). */
const SNAPSHOT_RESULTS = 16;

type Listener = (event: WorldEvent, version: number) => void;

export class EmbodiedSession {
  readonly trace: SessionTrace;
  readonly slotId: string | null;
  private inner: WorldRuntime;
  private worldLocale: string;
  private unsubscribe: () => void = () => undefined;
  private readonly listeners = new Set<Listener>();
  private readonly callers = new Map<ActorId, { caller: ClinicalCaller; actionId: string }[]>();
  private readonly captures = new Set<{ id: string; type: DomainEvent["type"] }[]>();
  /** Engine changes of a world action's clinical effect (action id → events), for its `state_change` span. */
  private readonly engineChanges = new Map<string, { id: string; type: DomainEvent["type"] }[]>();
  private carry = 0;
  private dirty = false;
  private readonly facade: WorldRuntime;
  readonly view: ClinicalView;
  readonly port: ClinicalPort;

  constructor(
    private readonly host: EmbodiedHost,
    private readonly options: EmbodiedOptions = {},
  ) {
    const facility = host.facility;
    if (!facility) throw new EmbodimentError(`${rt("en", "embodied.requiresFacility")} / ${rt("zh-CN", "embodied.requiresFacility")}`);
    const c = host.caseDef;
    this.slotId = assignPatientSlot(facility, c)?.id ?? null;
    this.trace = new SessionTrace({ episodeId: host.sessionId, caseId: c.id, facilityId: facility.id, embodiment: "embodied", now: () => host.now(), clock: () => host.state().clock, newId: () => host.newId() });
    this.view = {
      caseDef: c,
      state: () => host.state(),
      bedside: () => vitalsAt(c, host.state()),
      cues: (slotId) => (slotId === this.slotId ? { posture: c.patient.posture, speaking: false, ...patientCues(c, host.state()) } : {}),
      clock: () => host.state().clock,
    };
    this.port = {
      invoke: (actorId, tool, args, signal) => this.invoke(actorId, tool, args, signal),
      elapse: (seconds, reason) => this.elapse(seconds, reason),
    };
    this.worldLocale = host.locale();
    this.inner = this.build(options.snapshot, this.worldLocale, true);
    this.facade = this.makeFacade();
  }

  /* ---------------------------------------------------------------- */
  /* The world                                                         */
  /* ---------------------------------------------------------------- */

  private build(snapshot: WorldStateSnapshot | undefined, locale: string, first: boolean): WorldRuntime {
    const h = this.host;
    const perception = h.settings().perception ?? {};
    const runtime = createWorldRuntime({
      facility: h.facility!,
      catalogs: h.catalogs,
      binding: { caseDef: h.caseDef, slotId: this.slotId, locale },
      clinical: this.view,
      port: this.port,
      now: () => h.now(),
      newId: () => h.newId(),
      perception,
      trace: this.trace,
      ...(this.options.mover ? { mover: this.options.mover } : {}),
      ...(this.options.camera ? { camera: this.options.camera } : {}),
      ...(snapshot ? { snapshot } : {}),
      ...(first && !snapshot && this.options.spawn ? { spawn: this.options.spawn } : {}),
    });
    this.unsubscribe();
    this.unsubscribe = runtime.subscribe((event, version) => {
      this.dirty = true;
      this.host.emit({ type: "world_event", event, version });
      for (const l of [...this.listeners]) {
        try {
          l(event, version);
        } catch {
          // a failing listener never breaks the world
        }
      }
    });
    return runtime;
  }

  /** The world (a stable handle; see the module docs). */
  world(): WorldRuntime {
    return this.facade;
  }

  /** Rebuild the world in another language (state kept). */
  setLocale(locale: string): void {
    if (locale === this.worldLocale) return;
    this.worldLocale = locale;
    this.inner = this.build(this.inner.snapshot(), locale, false);
  }

  private makeFacade(): WorldRuntime {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const w = () => self.inner;
    return {
      get facility() {
        return w().facility;
      },
      get levels() {
        return w().levels;
      },
      get collision() {
        return w().collision;
      },
      get version() {
        return w().version;
      },
      entity: (id) => w().entity(id),
      entities: () => w().entities(),
      resolveId: (alias) => w().resolveId(alias),
      actor: (id) => w().actor(id),
      actors: () => w().actors(),
      updatePose: (actorId, pose) => self.updatePose(actorId, pose),
      observe: (actorId, opts) => w().observe(actorId, opts),
      find: (actorId, query) => w().find(actorId, query),
      inspect: (actorId, id) => w().inspect(actorId, id),
      roomInfo: (actorId, roomId) => w().roomInfo(actorId, roomId),
      canSee: (actorId, id) => w().canSee(actorId, id),
      regionName: (at, locale) => w().regionName(at, locale),
      plan: (actorId, goal) => w().plan(actorId, goal),
      checkSpatial: (actorId, intent, opts) => w().checkSpatial(actorId, intent, opts),
      atBedside: (id) => w().atBedside(id),
      bedsideProviders: (capability) => w().bedsideProviders(capability),
      // The learner's world action (a `world_action` op does the same, queued with the turns).
      execute: (request, signal) => self.act({ agent: "learner" }, request, signal),
      feedback: (actionId) => w().feedback(actionId),
      cancel: (actorId) => w().cancel(actorId),
      setObstacle: (o, present) => self.control(() => w().setObstacle(o, present)),
      setAvailability: (id, available) => self.control(() => w().setAvailability(id, available)),
      setDoor: (id, state) => self.control(() => w().setDoor(id, state)),
      subscribe: (listener) => {
        self.listeners.add(listener);
        return () => self.listeners.delete(listener);
      },
      snapshot: () => w().snapshot(),
    };
  }

  private control(fn: () => void): void {
    const before = this.inner.version;
    fn();
    if (this.inner.version !== before) this.record();
  }

  /** Sensor pose of a human-driven body (`world_pose`): applied at once, never queued, bumps only that actor's version. */
  updatePose(actorId: ActorId, pose: Pose): void {
    const before = this.inner.actor(actorId)?.pose;
    this.inner.updatePose(actorId, pose);
    const after = this.inner.actor(actorId)?.pose;
    if (after && (!before || before.x !== after.x || before.z !== after.z || before.yaw !== after.yaw || before.level !== after.level)) this.dirty = true;
  }

  /* ---------------------------------------------------------------- */
  /* Actions                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Run a world action for a caller: its clinical effect (if any) runs through
   * the caller's tool path; emits `world_action_result`; a committed change is
   * written to the transcript.
   */
  async act(caller: ClinicalCaller, input: WorldRequestInput | WorldActionRequest, signal?: AbortSignal): Promise<WorldActionResult> {
    const actorId = input.actorId ?? PRIMARY_ACTOR;
    const actionId = input.actionId ?? `wa-${this.host.newId()}`;
    const request: WorldActionRequest = { ...input, actorId, actionId };
    const entry = { caller, actionId };
    const stack = this.callers.get(actorId) ?? [];
    stack.push(entry);
    this.callers.set(actorId, stack);
    const before = this.inner.version;
    let result: WorldActionResult;
    try {
      result = await this.inner.execute(request, signal ?? caller.signal);
    } finally {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      if (!stack.length) this.callers.delete(actorId);
    }
    this.traceEngineChanges(actionId, actorId);
    this.host.emit({ type: "world_action_result", result }, caller.submission);
    if (result.worldVersion !== before) this.record();
    return result;
  }

  /**
   * The engine side of a device operation's clinical effect: a `state_change` span (source `engine`) under the
   * `clinical_action` span the world recorded for the action — interaction → clinical_action → state_change.
   */
  private traceEngineChanges(actionId: string, actorId: ActorId): void {
    const changes = this.engineChanges.get(actionId);
    this.engineChanges.delete(actionId);
    if (!changes?.length) return;
    const action = this.trace.spans().findLast((sp) => sp.kind === "clinical_action" && sp.refs.actionId === actionId);
    if (!action) return;
    const patient = this.patientId();
    this.trace.add({
      parentId: action.id,
      kind: "state_change",
      name: [...new Set(changes.map((e) => e.type))].join(","),
      actorId,
      startedAt: action.startedAt,
      endedAt: action.endedAt,
      clockStart: action.clockStart,
      clockEnd: action.clockEnd,
      worldVersion: action.worldVersion,
      ok: true,
      refs: { actionId, clinicalEventIds: changes.map((e) => e.id), ...(patient ? { entities: [patient] } : {}) },
      data: { source: "engine" },
    });
  }

  /** `ClinicalPort.invoke`: the clinical tool through the tool path of the caller driving `actorId`. */
  private async invoke(actorId: ActorId, tool: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ClinicalInvokeResult> {
    const entry = this.callers.get(actorId)?.at(-1);
    const caller = entry?.caller ?? { agent: "learner" as const };
    const captured: { id: string; type: DomainEvent["type"] }[] = [];
    this.captures.add(captured);
    let call: SkillToolCall;
    try {
      call = await this.host.runTool(signal && !caller.signal ? { ...caller, signal } : caller, tool, args, { actorId, ...(entry ? { worldActionId: entry.actionId } : {}) });
    } finally {
      this.captures.delete(captured);
    }
    if (entry) {
      const changes = captured.filter((e) => e.type !== "action.rejected");
      if (changes.length) this.engineChanges.set(entry.actionId, [...(this.engineChanges.get(entry.actionId) ?? []), ...changes]);
    }
    const data = call.output.data as { rejected?: unknown } | undefined;
    const outcome: ClinicalInvokeResult["outcome"] =
      call.ok && call.status === "ok"
        ? "ok"
        : call.status === "denied" || call.status === "blocked"
          ? "denied"
          : call.status === "cancelled" || call.status === "interrupted"
            ? "cancelled"
            : data?.rejected || spatialCodeOf(call.output)
              ? "rejected"
              : "error";
    return { ok: outcome === "ok", output: call.output.output, outcome, clinicalEventIds: captured.map((e) => e.id) };
  }

  /** `ClinicalPort.elapse` (EMBODIED R8): simulated clocks only; minutes × realtimeScale, dispatched in hundredths. */
  private elapse(seconds: number, reason: "travel" | "procedure"): void {
    const c = this.host.caseDef;
    const s = this.host.state();
    if (c.clock.mode !== "simulated" || !(c.clock.realtimeScale > 0) || !s.started || s.finished || !(seconds > 0)) return;
    this.carry += (seconds / 60) * c.clock.realtimeScale;
    const minutes = Math.min(Math.floor(this.carry * 100 + 1e-9) / 100, 24 * 60);
    if (minutes < 0.01) return;
    this.carry = Math.max(0, this.carry - minutes);
    this.host.dispatch({ type: "advance-time", minutes, reason, by: "system" });
  }

  /** The session noted a clinical event (`ev-<seq>` ids for traces). */
  noteClinicalEvent(seq: number, event: DomainEvent): void {
    for (const c of this.captures) c.push({ id: `ev-${seq}`, type: event.type });
  }

  /* ---------------------------------------------------------------- */
  /* Spatial gate, tools                                               */
  /* ---------------------------------------------------------------- */

  /** The body acting for a tool call. */
  actorOf(ctx: Pick<ToolContext, "actorId">): ActorId {
    return ctx.actorId ?? PRIMARY_ACTOR;
  }

  /** `checkSpatial` of the world. */
  check(actorId: ActorId, intent: ClinicalIntent, recheck = false): SpatialCheck {
    return this.inner.checkSpatial(actorId, intent, recheck ? { recheck: true } : undefined);
  }

  /** The gate the clinical tools are wrapped with. */
  gate(): SpatialGate {
    return {
      actorOf: (ctx) => this.actorOf(ctx),
      check: (actorId, intent, recheck) => this.check(actorId, intent, recheck),
      traced: (actorId, tool, args, run) => this.traced(actorId, tool, args, run),
      rhythm: () => rhythmAtBedside(this.inner),
    };
  }

  /** The clinical tools of a registry, spatially gated (EMBODIED §6). */
  gatedTools(get: (name: string) => ToolDefinition<any> | undefined): ToolDefinition<any>[] {
    const gate = this.gate();
    return SPATIALLY_GATED_TOOLS.flatMap((name) => {
      const tool = get(name);
      return tool ? [spatiallyGated(tool, gate)] : [];
    });
  }

  /** The world tools (`get_camera_frame` only with a camera). */
  worldTools(): ToolDefinition<Record<string, unknown>>[] {
    const all = createWorldTools(this.toolHost());
    return this.options.camera ? all : all.filter((t) => t.name !== "get_camera_frame");
  }

  /** Record a direct clinical tool call as clinical_action (+ state_change) spans. */
  private async traced(actorId: ActorId, tool: string, args: Record<string, unknown>, run: () => Promise<ToolOutput>): Promise<ToolOutput> {
    const span = this.trace.start("clinical_action", tool, { actorId, data: { args } });
    const captured: { id: string; type: DomainEvent["type"] }[] = [];
    this.captures.add(captured);
    let out: ToolOutput | undefined;
    try {
      out = await run();
      return out;
    } finally {
      this.captures.delete(captured);
      const ids = captured.map((e) => e.id);
      const patient = this.patientId();
      const done = span.end({ ok: out?.ok === true, worldVersion: this.inner.version, refs: { ...(ids.length ? { clinicalEventIds: ids } : {}), ...(patient ? { entities: [patient] } : {}) } });
      const changes = captured.filter((e) => e.type !== "action.rejected");
      if (changes.length) {
        this.trace.add({
          parentId: done.id,
          kind: "state_change",
          name: [...new Set(changes.map((e) => e.type))].join(","),
          actorId,
          startedAt: done.startedAt,
          endedAt: done.endedAt,
          clockStart: done.clockStart,
          clockEnd: done.clockEnd,
          worldVersion: done.worldVersion,
          ok: true,
          refs: { clinicalEventIds: changes.map((e) => e.id), ...(patient ? { entities: [patient] } : {}) },
          data: { source: "engine" },
        });
      }
    }
  }

  /** Resolve a target for tools: entity ids and aliases, `patient`, `patient-monitor`, actors. */
  resolve(target: string, actorId: ActorId = PRIMARY_ACTOR): string | null {
    const t0 = target.trim();
    if (!t0) return null;
    if (t0 === "patient-monitor" || t0 === "monitor:patient") return this.patientMonitorId();
    if (t0 === "self" || t0 === "me") return actorId;
    return this.inner.resolveId(t0);
  }

  /** The bound patient's entity id. */
  patientId(): string | null {
    return this.slotId && this.inner.entity(`patient:${this.slotId}`) ? `patient:${this.slotId}` : null;
  }

  /** The patient's monitor: the slot's linked monitor, else a monitor at the bedside. */
  patientMonitorId(): string | null {
    const f = this.host.facility!;
    const slot = f.patientSlots.find((s) => s.id === this.slotId);
    if (!slot) return null;
    if (slot.monitor && this.inner.entity(`eq:${slot.monitor}`)) return `eq:${slot.monitor}`;
    const monitors = this.inner.entities().filter((e) => e.interaction === "monitor");
    return monitors.find((m) => this.atBedside(m.id))?.id ?? null;
  }


  /** THE bedside rule of the world (`WorldRuntime.atBedside`). */
  atBedside(id: string): boolean {
    return this.inner.atBedside(id);
  }

  /** Where a body is (its room; else a building's corridor or the facility's outdoor region) — the REPL status line; null for an unknown actor. */
  roomName(actorId: ActorId = PRIMARY_ACTOR, locale = this.host.locale()): string | null {
    const a = this.inner.actor(actorId);
    if (!a) return null;
    return this.inner.regionName({ level: a.pose.level, x: a.pose.x, z: a.pose.z }, locale);
  }

  /** The host world tools run on. */
  toolHost(): WorldToolHost {
    return {
      world: () => this.facade,
      actorOf: (ctx) => this.actorOf(ctx),
      resolve: (target, actorId) => this.resolve(target, actorId),
      act: (ctx, request) => this.act(this.callerOf(ctx), { ...request, actorId: request.actorId ?? this.actorOf(ctx) }),
      clockText: () => this.host.clockText(),
      delegate: (ctx, args) => this.delegate(ctx, args),
      executeSkill: (ctx, args) => this.executeSkill(ctx, args),
      skillSafety: (args) => this.skillOf(args)?.safety ?? null,
      camera: () => this.options.camera ?? null,
    };
  }

  /** The caller of a tool call (its agent's tool path, its turn). */
  callerOf(ctx: Pick<ToolContext, "agent" | "turnId" | "signal">): ClinicalCaller {
    return { agent: ctx.agent, ...(ctx.turnId ? { turnId: ctx.turnId } : {}), ...(ctx.signal ? { signal: ctx.signal } : {}) };
  }

  /* ---------------------------------------------------------------- */
  /* Delegation, skills                                                */
  /* ---------------------------------------------------------------- */

  /** `delegate_task`. */
  async delegate(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolOutput> {
    const L = ctx.locale;
    const caller = this.callerOf(ctx);
    const result = await runDelegation(
      {
        caseDef: this.host.caseDef,
        locale: () => this.host.locale(),
        state: () => this.host.state(),
        world: () => this.facade,
        trace: this.trace,
        act: (c, request) => this.act(c, request),
        runTool: (c, tool, a, extra) => this.host.runTool(c, tool, a, extra),
        patientId: () => this.patientId(),
        patientMonitorId: () => this.patientMonitorId(),
        atBedside: (id) => this.atBedside(id),
        resolve: (target, actorId) => this.resolve(target, actorId),
      },
      caller,
      args,
    );
    return { ok: result.status === "completed", output: delegationText(result, L, this.facade), data: { delegation: result } };
  }

  private skillOf(args: Record<string, unknown>): SkillDefinition | null {
    if (args.skill !== undefined) {
      const parsed = parseSkill(args.skill);
      return parsed.ok ? parsed.skill : null;
    }
    const id = strArg(args, "skill_id");
    return this.host.skills().find((s) => s.id === id) ?? null;
  }

  /** `execute_skill`: a built-in, project or inline skill, run as the caller. */
  async executeSkill(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolOutput> {
    const L = ctx.locale;
    let skill: SkillDefinition | null;
    if (args.skill !== undefined) {
      const parsed = parseSkill(args.skill);
      if (!parsed.ok) return { ok: false, output: rt(L, "skill.invalid", { issues: parsed.issues.join("; ") }), data: { issues: parsed.issues } };
      skill = parsed.skill;
    } else {
      skill = this.skillOf(args);
      if (!skill) return { ok: false, output: rt(L, "skill.unknown", { id: strArg(args, "skill_id") || "—", skills: this.host.skills().map((s) => s.id).join(", ") }) };
    }
    const caller = this.callerOf(ctx);
    const actorId = this.actorOf(ctx);
    const runner: SkillRunner = {
      caseDef: this.host.caseDef,
      locale: L,
      actorId,
      state: () => this.host.state(),
      world: () => this.facade,
      patientId: () => this.patientId(),
      patientMonitorId: () => this.patientMonitorId(),
      resolveEntity: (alias) => this.resolve(alias, actorId),
      atBedside: (id) => this.atBedside(id),
      callTool: (tool, a) => this.host.runTool(caller, tool, a, { actorId }),
      trace: this.trace,
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    };
    const params = args.params && typeof args.params === "object" && !Array.isArray(args.params) ? (args.params as Record<string, unknown>) : {};
    const result = await runSkill(skill, params, runner);
    return { ok: result.status === "succeeded", output: skillResultText(result, L), data: { skill: result } };
  }

  /* ---------------------------------------------------------------- */
  /* Persistence                                                       */
  /* ---------------------------------------------------------------- */

  /** The world snapshot as the transcript keeps it (idempotency window trimmed). */
  transcriptSnapshot(): WorldStateSnapshot {
    const s = this.inner.snapshot();
    return {
      ...s,
      results: s.results.slice(-SNAPSHOT_RESULTS).map((r) => {
        const { navigation, ...rest } = r;
        return { ...rest, events: [], ...(navigation ? { navigation: { ...navigation, path: [] } } : {}) };
      }),
    };
  }

  /** Write the world to the transcript now. */
  record(): void {
    this.host.recordWorld(this.transcriptSnapshot());
    this.dirty = false;
  }

  /** At shutdown: write the world if a sensor pose moved since the last snapshot. */
  flush(): void {
    if (this.dirty) this.record();
  }
}

/** The text of a delegation result. */
export function delegationText(r: DelegationResult, locale: string, world: WorldRuntime): string {
  if (r.message === "unknown-task") return rt(locale, "delegate.unknownTask", { task: r.task });
  if (r.message === "unknown-role") return rt(locale, "delegate.unknownRole", { role: r.role });
  const staff = r.staffId ? (world.entity(r.staffId) ? t(world.entity(r.staffId)!.name, locale) : r.staffId) : r.role;
  const task = taskLabel(locale, r.task);
  if (r.message === "no-item" || r.message === "no-target") return rt(locale, r.message === "no-item" ? "delegate.noItem" : "delegate.needTarget", { task, what: task, param: "target" });
  const lines = [rt(locale, "delegate.result", { staff, task, status: rt(locale, `delegate.status.${r.status}` as RuntimeKey), steps: r.steps.length, seconds: Math.round(r.elapsedSeconds) })];
  r.steps.forEach((s, i) =>
    lines.push(
      rt(locale, "delegate.step", {
        n: i + 1,
        operation: s.operation,
        target: s.target ? ` ${s.target}` : "",
        status: rt(locale, `delegate.status.${s.status}` as RuntimeKey),
        message: s.status === "completed" ? "" : ` — ${s.message.split("\n")[0]}`,
      }),
    ),
  );
  return lines.join("\n");
}

/** Build a parsed skill list (built-in first; a project skill with a built-in's id replaces it). */
export function mergeSkills(builtin: readonly SkillDefinition[], project: readonly SkillDefinition[] = []): SkillDefinition[] {
  const byId = new Map<string, SkillDefinition>();
  for (const s of [...builtin, ...project]) byId.set(s.id, s);
  return [...byId.values()];
}
