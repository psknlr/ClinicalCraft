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
import { assignPatientSlot, patientCues, t, VITAL_KEYS, vitalsAt, type ClinicalAction, type DomainEvent, type EquipmentCatalog, type FacilityDefinition, type CaseDefinition, type ReduceResult, type SessionState, type VitalKey, type VitalsSnapshot } from "@clinicalcraft/core";
import {
  behaviorOf,
  createWorldRuntime,
  operationName,
  PRIMARY_ACTOR,
  rhythmAtBedside,
  type ActionHint,
  type ActorId,
  type CameraSensor,
  type ClinicalIntent,
  type ClinicalInvokeContext,
  type ClinicalInvokeResult,
  type ClinicalPort,
  type ClinicalView,
  type Mover,
  type PatientDestination,
  type PatientRelocation,
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
import { findSkill, parseSkill, PROJECT_SKILL_PREFIX, type SkillDefinition } from "../skills/schema.js";
import { runSkill, skillResultText, type SkillRunner, type SkillToolCall } from "../skills/interpreter.js";
import { assessSkill, inlineSkillSpecifier, skillSummary, type SkillAssessment } from "../skills/risk.js";
import { strArg } from "../tools/clinical.js";
import { learnerVitals } from "../tools/format.js";
import type { ScopeActor } from "../tools/scope.js";
import { spatiallyGated, SPATIALLY_GATED_TOOLS, spatialCodeOf, vitalsGated, type SpatialGate } from "../tools/spatial.js";
import type { CallProgress, ToolContext, ToolDefinition, ToolOutput, VitalsView } from "../tools/types.js";
import { createWorldTools, DELEGATION_TASKS, MAX_SKILL_NESTING, taskLabel, type WorldRequestInput, type WorldToolHost } from "../tools/world.js";
import { nameOf } from "../tools/world-format.js";
import { runDelegation, type DelegationResult } from "./delegation.js";
import { heldBy, releaseHeld } from "./device-ops.js";
import type { ClinicalCaller } from "./embodied-types.js";
import { rt, type RuntimeKey } from "./i18n.js";
import { nonVerbalReason } from "./nonverbal.js";
import { anySignal } from "./signals.js";
import { SessionTrace } from "./trace.js";

export type { ClinicalCaller } from "./embodied-types.js";

/** Stable codes of `EmbodimentError`. */
export type EmbodimentErrorCode = "embodiment_requires_facility" | "embodiment_no_slot";

/**
 * Thrown when an embodied session cannot be built: a stable `code` and the reason in both languages (`message`
 * joins them; `localized(locale)` picks one) — no facility, or no place in it for the case (review C15).
 */
export class EmbodimentError extends Error {
  constructor(
    readonly code: EmbodimentErrorCode,
    readonly messages: { en: string; "zh-CN": string },
  ) {
    super(`${messages.en} / ${messages["zh-CN"]}`);
    this.name = "EmbodimentError";
  }

  /** The reason in one language. */
  localized(locale: string): string {
    return locale.startsWith("zh") ? this.messages["zh-CN"] : this.messages.en;
  }
}

/**
 * Why an embodied encounter of this case cannot be built in this facility (null: it can) — no facility, or no
 * patient place that accepts the case's setting (review C15: a world without the patient refuses every act).
 * Front-ends check it before they start a session (`createNodeSession`, the CLI, MCP `start_case`).
 */
export function embodimentProblem(facility: FacilityDefinition | null, caseDef: Pick<CaseDefinition, "setting">): EmbodimentError | null {
  const both = (key: RuntimeKey, params: Record<string, string> = {}, name?: (locale: string) => string) => ({
    en: rt("en", key, { ...params, ...(name ? { facility: name("en") } : {}) }),
    "zh-CN": rt("zh-CN", key, { ...params, ...(name ? { facility: name("zh-CN") } : {}) }),
  });
  if (!facility) return new EmbodimentError("embodiment_requires_facility", both("embodied.requiresFacility"));
  if (!assignPatientSlot(facility, caseDef)) return new EmbodimentError("embodiment_no_slot", both("embodied.noSlot", { setting: caseDef.setting }, (L) => t(facility.name, L)));
  return null;
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
  /** Run a tool through a caller's tool path, with the acting body (and the world action carrying it out, the skill nesting). */
  runTool(caller: ClinicalCaller, tool: string, args: Record<string, unknown>, extra: { actorId: ActorId; worldActionId?: string; skillDepth?: number; progress?: CallProgress }): Promise<SkillToolCall>;
  /** The session's definition of a tool (risk and summaries of a skill's steps). */
  tool(name: string): ToolDefinition<any> | undefined;
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

export { MAX_SKILL_NESTING };

/**
 * Results kept in a transcript snapshot — the world's whole idempotency window (128), so a retried action id is
 * answered from its record after a resume too (review C12); without paths and events (resume needs states, not
 * telemetry).
 */
const SNAPSHOT_RESULTS = 128;

/**
 * A world snapshot as the session persists it (transcript `world` items, `SessionSnapshot.world`): the world's own
 * snapshot plus `elapseCarry` — simulated minutes charged by world actions (travel, procedures) but not yet
 * dispatched to the engine, which advances in hundredths. Restored with the snapshot, so a resumed session's clock
 * equals an uninterrupted one's (review C12). The world ignores the extra field.
 */
export type PersistedWorldSnapshot = WorldStateSnapshot & { elapseCarry?: number };

/** The elapse remainder a persisted snapshot carries (0 when absent or malformed). */
function carryOf(snapshot: WorldStateSnapshot | undefined): number {
  const v = (snapshot as PersistedWorldSnapshot | undefined)?.elapseCarry;
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1 ? v : 0;
}

type Listener = (event: WorldEvent, version: number) => void;

export class EmbodiedSession {
  readonly trace: SessionTrace;
  readonly slotId: string | null;
  private inner: WorldRuntime;
  private worldLocale: string;
  private unsubscribe: () => void = () => undefined;
  private readonly listeners = new Set<Listener>();
  /** The caller of every world action in flight, by action id: its clinical effect runs through exactly that caller's tool path (review C4). */
  private readonly callers = new Map<string, { caller: ClinicalCaller; actorId: ActorId }>();
  /** World actions in flight (`act`): a language switch waits until there are none (review C6). */
  private inflight = 0;
  /** A language switch deferred while actions were in flight. */
  private pendingLocale: string | null = null;
  /** Staff carrying out a delegation right now (their whereabouts are the delegating clinician's to know — G13). */
  private readonly delegates = new Map<ActorId, number>();
  private readonly captures = new Set<{ id: string; type: DomainEvent["type"] }[]>();
  /** Engine changes of a world action's clinical effect (action id → events), for its `state_change` span. */
  private readonly engineChanges = new Map<string, { id: string; type: DomainEvent["type"] }[]>();
  private carry = 0;
  private dirty = false;
  /** Relocation lines for the tool calls running now: each appends them to its output (EMBODIED §8). */
  private readonly noteCaptures = new Set<string[]>();
  /** `transport_patient` actions in flight: a relocation clinical state asks for meanwhile waits for them. */
  private transporting = 0;
  /** Relocations deferred while a transport was in flight. */
  private readonly deferred: PatientDestination[] = [];
  private readonly facade: WorldRuntime;
  readonly view: ClinicalView;
  readonly port: ClinicalPort;

  constructor(
    private readonly host: EmbodiedHost,
    private readonly options: EmbodiedOptions = {},
  ) {
    const facility = host.facility;
    const problem = embodimentProblem(facility, host.caseDef);
    if (problem || !facility) throw problem;
    const c = host.caseDef;
    this.slotId = assignPatientSlot(facility, c)?.id ?? null;
    this.trace = new SessionTrace({ episodeId: host.sessionId, caseId: c.id, facilityId: facility.id, embodiment: "embodied", now: () => host.now(), clock: () => host.state().clock, newId: () => host.newId() });
    this.view = {
      caseDef: c,
      state: () => host.state(),
      bedside: () => vitalsAt(c, host.state()),
      // the posture follows clinical state (G12: an intervention's authored posture, else the case's — core `patientPosture`);
      // a patient who cannot speak (`patient.nonVerbalWhen`) shows it, with the authored reason
      cues: (slotId) => {
        if (slotId !== this.slotId) return {};
        const { nonVerbal: _nonVerbal, ...cues } = patientCues(c, host.state());
        const reason = nonVerbalReason(c, host.state(), host.locale());
        return { speaking: false, ...cues, ...(reason !== null ? { cannotSpeak: reason } : {}) };
      },
      clock: () => host.state().clock,
    };
    this.port = {
      invoke: (actorId, tool, args, signal, context) => this.invoke(actorId, tool, args, signal, context),
      elapse: (seconds, reason) => this.elapse(seconds, reason),
    };
    this.worldLocale = host.locale();
    this.carry = carryOf(options.snapshot);
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

  /**
   * Rebuild the world in another language (state kept). Never while world actions are in flight (review C6): the
   * rebuild would drop their committed state and recorded results while their time is still charged — it waits
   * until the last one has finished.
   */
  setLocale(locale: string): void {
    if (this.inflight > 0) {
      this.pendingLocale = locale;
      return;
    }
    this.pendingLocale = null;
    if (locale === this.worldLocale) return;
    this.worldLocale = locale;
    this.inner = this.build(this.inner.snapshot(), locale, false);
  }

  private applyPendingLocale(): void {
    const locale = this.pendingLocale;
    if (locale !== null) this.setLocale(locale);
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
      nearby: (aroundId, type, within) => w().nearby(aroundId, type, within),
      roomInfo: (actorId, roomId) => w().roomInfo(actorId, roomId),
      canSee: (actorId, id) => w().canSee(actorId, id),
      regionName: (at, locale) => w().regionName(at, locale),
      plan: (actorId, goal) => w().plan(actorId, goal),
      checkSpatial: (actorId, intent, opts) => w().checkSpatial(actorId, intent, opts),
      atBedside: (id) => w().atBedside(id),
      bedsideProviders: (capability) => w().bedsideProviders(capability),
      patientPlace: () => w().patientPlace(),
      patientMonitor: () => w().patientMonitor(),
      screenInView: (actorId) => w().screenInView(actorId),
      relocatePatient: (destination) => {
        let r: PatientRelocation | undefined;
        self.control(() => (r = w().relocatePatient(destination)));
        return r!;
      },
      refreshPatient: () => {
        let changed = false;
        self.control(() => (changed = w().refreshPatient()));
        return changed;
      },
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
    // A retry of an action id still in flight shares that run, and its caller.
    const entry = { caller, actorId };
    const owned = !this.callers.has(actionId);
    if (owned) this.callers.set(actionId, entry);
    const transport = request.operation === "transport_patient";
    if (transport) this.transporting++;
    this.inflight++;
    try {
      const inner = this.inner;
      const before = inner.version;
      let result: WorldActionResult;
      try {
        result = await inner.execute(request, signal ?? caller.signal);
      } finally {
        if (owned && this.callers.get(actionId) === entry) this.callers.delete(actionId);
      }
      this.traceEngineChanges(actionId, actorId);
      this.host.emit({ type: "world_action_result", result }, caller.submission);
      if (inner.version !== before) this.record();
      return result;
    } finally {
      if (transport) {
        this.transporting--;
        if (this.transporting === 0) this.flushRelocations();
      }
      this.inflight--;
      if (this.inflight === 0) this.applyPendingLocale();
    }
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

  /** The caller of the most recent world action of `actorId` still in flight (a port called without an action id). */
  private lastCallerOf(actorId: ActorId): ClinicalCaller | null {
    let found: ClinicalCaller | null = null;
    for (const entry of this.callers.values()) if (entry.actorId === actorId) found = entry.caller;
    return found;
  }

  /**
   * `ClinicalPort.invoke`: the clinical tool through the tool path of the caller of exactly this world action
   * (`context.actionId`, review C4) — never another caller's that happens to drive the same body. It is cancelled
   * by its caller (a turn, an external call) and by the world (`cancel(actorId)`, a cancel operation): either
   * withdraws a pending approval (review C5). The session's own refusals keep their code: a spatial refusal its
   * hint (review C13), an acting body outside its role's authority `unauthorized`.
   */
  private async invoke(actorId: ActorId, tool: string, args: Record<string, unknown>, signal?: AbortSignal, context?: ClinicalInvokeContext): Promise<ClinicalInvokeResult> {
    const actionId = context?.actionId;
    const caller = (actionId ? this.callers.get(actionId)?.caller : undefined) ?? this.lastCallerOf(actorId) ?? { agent: "learner" as const };
    const combined = anySignal([caller.signal, signal]);
    const captured: { id: string; type: DomainEvent["type"] }[] = [];
    this.captures.add(captured);
    let call: SkillToolCall;
    try {
      call = await this.host.runTool(combined ? { ...caller, signal: combined } : caller, tool, args, { actorId, ...(actionId ? { worldActionId: actionId } : {}) });
    } finally {
      this.captures.delete(captured);
    }
    if (actionId) {
      const changes = captured.filter((e) => e.type !== "action.rejected");
      if (changes.length) this.engineChanges.set(actionId, [...(this.engineChanges.get(actionId) ?? []), ...changes]);
    }
    const data = call.output.data as { rejected?: unknown; code?: unknown; hint?: unknown } | undefined;
    const spatial = spatialCodeOf(call.output);
    const outcome: ClinicalInvokeResult["outcome"] =
      call.ok && call.status === "ok"
        ? "ok"
        : call.status === "denied" || call.status === "blocked"
          ? "denied"
          : call.status === "cancelled" || call.status === "interrupted"
            ? "cancelled"
            : spatial
              ? "spatial"
              : data?.code === "NOT_AUTHORIZED"
                ? "unauthorized"
                : data?.rejected
                  ? "rejected"
                  : "error";
    const firstLine = call.output.output.split("\n")[0] ?? "";
    return {
      ok: outcome === "ok",
      output: call.output.output,
      outcome,
      clinicalEventIds: captured.map((e) => e.id),
      ...(spatial ? { code: spatial, message: firstLine, hint: (data?.hint ?? null) as ActionHint | null } : {}),
      ...(outcome === "unauthorized" ? { message: firstLine } : {}),
    };
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
    this.dirty = true; // the remainder is persisted with the world (review C12)
    this.host.dispatch({ type: "advance-time", minutes, reason, by: "system" });
  }

  /** The session noted a clinical event (`ev-<seq>` ids for traces); the patient's body follows it. */
  noteClinicalEvent(seq: number, event: DomainEvent): void {
    for (const c of this.captures) c.push({ id: `ev-${seq}`, type: event.type });
    this.followClinicalEvent(event);
  }

  /**
   * The patient's body follows clinical state (EMBODIED §8, reviews G8 / G12): an intervention with an authored
   * `destination` (a transfer) or a phase with a `location` moves the patient there — the team does it, nothing
   * charged; an authored `posture` changes the body (its collider, what bystanders see).
   */
  private followClinicalEvent(event: DomainEvent): void {
    const c = this.host.caseDef;
    if (event.type === "intervention.applied") {
      const destination = c.interventions.find((i) => i.id === event.interventionId)?.destination;
      if (destination) this.relocate(destination);
      if (this.inner.refreshPatient()) this.record();
    } else if (event.type === "phase.changed") {
      const location = c.phases.find((p) => p.id === event.to)?.location;
      if (location) this.relocate(location);
    }
  }

  /**
   * Relocate the patient (see `followClinicalEvent`); while someone wheels the patient, after that transport. The
   * outcome — moved, or no such place here — is appended to the outputs of the tool calls running now and sent as
   * a notification; already there: nothing to say.
   */
  private relocate(destination: PatientDestination): void {
    if (this.transporting > 0) {
      this.deferred.push(destination);
      return;
    }
    const r = this.inner.relocatePatient(destination);
    if (r.ok && !r.moved) {
      this.record();
      return;
    }
    this.record();
    for (const lines of this.noteCaptures) lines.push(r.message);
    this.host.emit({ type: "notification", level: r.ok ? "info" : "warning", title: rt(this.host.locale(), "world.relocated"), body: r.message });
  }

  private flushRelocations(): void {
    for (const destination of this.deferred.splice(0)) this.relocate(destination);
  }

  /** A tool whose call may relocate the patient: the relocation's line is appended to its output. */
  private withNotes<A extends Record<string, unknown>>(tool: ToolDefinition<A>): ToolDefinition<A> {
    return {
      ...tool,
      run: async (args, ctx) => {
        const lines: string[] = [];
        this.noteCaptures.add(lines);
        let out: ToolOutput;
        try {
          out = await tool.run(args, ctx);
        } finally {
          this.noteCaptures.delete(lines);
        }
        return lines.length ? { ...out, output: [out.output, ...lines].filter(Boolean).join("\n") } : out;
      },
    };
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
      staff: (actorId, locale) => this.staffActor(actorId, locale),
      vitals: (actorId) => this.vitalsView(actorId),
    };
  }

  /** A body other than the learner's avatar, as its scope of practice sees it (review S3); null for the avatar. */
  staffActor(actorId: ActorId, locale: string): ScopeActor | null {
    if (actorId === PRIMARY_ACTOR) return null;
    const actor = this.facade.actor(actorId);
    if (!actor) return { role: "porter", name: actorId }; // an unknown body: no clinical authority
    const entity = this.facade.entity(actorId);
    return { role: actor.role, name: entity ? t(entity.name, locale) : actorId };
  }

  /**
   * The clinical tools of a registry, spatially gated (EMBODIED §6); `wait` reports only the vitals in view (G11);
   * every tool whose call can change the phase or give a transfer appends where the patient was moved (§8).
   */
  gatedTools(get: (name: string) => ToolDefinition<any> | undefined): ToolDefinition<any>[] {
    const gate = this.gate();
    const wait = get("wait");
    return [
      ...SPATIALLY_GATED_TOOLS.flatMap((name) => {
        const tool = get(name);
        return tool ? [this.withNotes(spatiallyGated(tool, gate))] : [];
      }),
      ...(wait ? [this.withNotes(vitalsGated(wait, gate))] : []),
      ...NOTED_TOOLS.flatMap((name) => {
        const tool = get(name);
        return tool ? [this.withNotes(tool)] : [];
      }),
    ];
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

  /** The patient's monitor where the patient is now: the bed space's linked monitor, else a monitor at the bedside (the world's). */
  patientMonitorId(): string | null {
    return this.inner.patientMonitor();
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
      skillAssessment: (ctx, args) => this.skillAssessment(ctx, args),
      skillSpecifier: (args) => (args.skill !== undefined ? inlineSkillSpecifier(args.skill) : strArg(args, "skill_id") || "inline"),
      camera: () => this.options.camera ?? null,
      isDelegate: (actorId) => this.delegates.has(actorId),
    };
  }

  /**
   * What the bedside shows `actorId` (reviews G3/G11 — the one source of every vitals channel: the clinician's
   * prompt, the MCP state resource, the REPL status line, skill predicates): the world's spatial check for
   * vitals (the attached monitor's screen within 6 m in its room · hands at the patient · a records terminal);
   * in view, the learner's view of the snapshot (no ECG morphology; no rhythm without a monitor, ECG machine or
   * defibrillator at the bedside); else why not.
   */
  vitalsView(actorId: ActorId = PRIMARY_ACTOR): VitalsView {
    const check = this.check(actorId, { tool: "check_vitals", kind: "vitals" });
    if (!check.ok) return { inView: false, reason: check.reason, message: check.message };
    const snapshot = vitalsAt(this.host.caseDef, this.host.state());
    if (!rhythmAtBedside(this.inner)) {
      delete snapshot.vitals.rhythm;
      delete snapshot.vitals.ecg;
    }
    return { inView: true, snapshot: learnerVitals(snapshot) };
  }

  /** The vital values the bedside shows `actorId` (null: none in view) — skill `vital` predicates (G1). */
  shownVitals(actorId: ActorId): Partial<Record<VitalKey, number>> | null {
    const view = this.vitalsView(actorId);
    if (!view.inView) return null;
    const unread = new Set(view.snapshot.unmeasurable ?? []);
    const out: Partial<Record<VitalKey, number>> = {};
    for (const key of VITAL_KEYS) {
      const value = view.snapshot.vitals[key];
      if (typeof value === "number" && !unread.has(key)) out[key] = value;
    }
    return out;
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
    // Inside a skill that another skill runs: no further work handed out (review C10).
    if ((ctx.skillDepth ?? 0) > MAX_SKILL_NESTING) return { ok: false, output: rt(L, "skill.tooDeep", { max: MAX_SKILL_NESTING }), data: { code: "SKILL_TOO_DEEP" } };
    const caller = this.callerOf(ctx);
    // While the staff member works on it, the delegating clinician knows where they are (G13).
    let staff: ActorId | null = null;
    try {
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
          onStaff: (id) => {
            staff = id;
            this.delegates.set(id, (this.delegates.get(id) ?? 0) + 1);
          },
        },
        caller,
        args,
      );
      return { ok: result.status === "completed", output: delegationText(result, L, this.facade, this.host.caseDef), data: { delegation: result } };
    } finally {
      if (staff) {
        const left = (this.delegates.get(staff) ?? 1) - 1;
        if (left > 0) this.delegates.set(staff, left);
        else this.delegates.delete(staff);
      }
    }
  }

  private skillOf(args: Record<string, unknown>): SkillDefinition | null {
    if (args.skill !== undefined) {
      const parsed = parseSkill(args.skill);
      return parsed.ok ? parsed.skill : null;
    }
    return findSkill(this.host.skills(), strArg(args, "skill_id")) ?? null;
  }

  /** What running a skill can do (review S8): risk, always-ask and the step list of its approval summary. */
  skillAssessment(ctx: ToolContext, args: Record<string, unknown>): (SkillAssessment & { summary: string }) | null {
    const skill = this.skillOf(args);
    if (!skill) return null;
    const actorId = this.actorOf(ctx);
    const params = args.params && typeof args.params === "object" && !Array.isArray(args.params) ? (args.params as Record<string, unknown>) : {};
    const assessment = assessSkill(
      {
        caseDef: this.host.caseDef,
        tool: (name) => this.host.tool(name),
        ctx,
        skills: () => this.host.skills(),
        world: () => this.facade,
        resolveEntity: (alias) => this.resolve(alias, actorId),
        patientId: () => this.patientId(),
        patientMonitorId: () => this.patientMonitorId(),
      },
      skill,
      params,
    );
    return { ...assessment, summary: skillSummary(ctx.locale, skill, assessment) };
  }

  /**
   * Release what a flow (a skill run) reserved and left reserved (review C3): the device's release operation, as
   * the same caller but without its (possibly aborted) signal, following a reach hint once.
   */
  private async releaseFor(caller: ClinicalCaller, actorId: ActorId, before: ReadonlySet<string>): Promise<void> {
    const { signal: _cancelled, ...detached } = caller;
    await releaseHeld(this.facade, actorId, before, async (id, operation) => {
      const request = { actorId, operation, targetId: id };
      let r = await this.act(detached, request);
      if (r.status === "failed" && r.hint && (r.errorCode === "NOT_IN_RANGE" || r.errorCode === "NOT_VISIBLE")) {
        if ((await this.act(detached, { actorId, operation: "navigate", goal: r.hint.goal })).status === "completed") r = await this.act(detached, request);
      }
      return r;
    });
  }

  /** `execute_skill`: a built-in, project or inline skill, run as the caller. */
  async executeSkill(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolOutput> {
    const L = ctx.locale;
    const depth = ctx.skillDepth ?? 0;
    // A skill run by a skill may not run another (review C10): recursion ends here, at once.
    if (depth > MAX_SKILL_NESTING) return { ok: false, output: rt(L, "skill.tooDeep", { max: MAX_SKILL_NESTING }), data: { code: "SKILL_TOO_DEEP" } };
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
      callTool: (tool, a, progress) => this.host.runTool(caller, tool, a, { actorId, skillDepth: depth + 1, ...(progress ? { progress } : {}) }),
      shownVitals: () => this.shownVitals(actorId),
      trace: this.trace,
      ...(ctx.progress ? { progress: ctx.progress } : {}),
      ...(ctx.signal ? { signal: ctx.signal } : {}),
    };
    const params = args.params && typeof args.params === "object" && !Array.isArray(args.params) ? (args.params as Record<string, unknown>) : {};
    const heldBefore = new Set(heldBy(this.facade, actorId));
    let result: Awaited<ReturnType<typeof runSkill>> | null = null;
    try {
      result = await runSkill(skill, params, runner);
    } finally {
      // A skill that did not succeed leaves no device it reserved reserved (review C3).
      if (result?.status !== "succeeded") await this.releaseFor(caller, actorId, heldBefore);
    }
    return { ok: result.status === "succeeded", output: skillResultText(result, L), data: { skill: result } };
  }

  /* ---------------------------------------------------------------- */
  /* Persistence                                                       */
  /* ---------------------------------------------------------------- */

  /** The world snapshot as a session save keeps it (`SessionSnapshot.world`): the world's own plus the elapse remainder. */
  persistentSnapshot(): PersistedWorldSnapshot {
    return { ...this.inner.snapshot(), ...(this.carry > 0 ? { elapseCarry: this.carry } : {}) };
  }

  /** The world snapshot as the transcript keeps it (results without telemetry; the elapse remainder). */
  transcriptSnapshot(): PersistedWorldSnapshot {
    const s = this.persistentSnapshot();
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

/** Clinical tools (besides the spatially gated ones) whose calls can relocate the patient: a phase, a decision. */
const NOTED_TOOLS: readonly string[] = ["set_phase", "answer_decision"];

/**
 * A delegation step in words (extra review item 5): the operation's name (an entity's own name for a catalog
 * operation, a delegated clinical act's label) and its target by name — never the ids.
 */
function stepWords(s: DelegationResult["steps"][number], locale: string, world: WorldRuntime, caseDef?: CaseDefinition): { operation: string; target: string } {
  if (s.operation === "intervene") {
    const iv = caseDef?.interventions.find((i) => i.id === s.target);
    return { operation: rt(locale, "delegate.op.intervene"), target: iv ? t(iv.name, locale) : (s.target ?? "") };
  }
  const e = s.target ? world.entity(s.target) : null;
  // the patient wheeled somewhere: "Transport the patient" says whom
  if (s.operation === "transport_patient") return { operation: operationName(s.operation, locale), target: "" };
  // a task refused before anyone moved (scope of practice): the task itself
  if (!e && (DELEGATION_TASKS as readonly string[]).includes(s.operation)) return { operation: taskLabel(locale, s.operation), target: "" };
  const own = e ? behaviorOf(e).operations.find((o) => o.id === s.operation)?.name : undefined;
  return { operation: operationName(s.operation, locale, own), target: s.target ? nameOf(world, s.target, locale) : "" };
}

/** The text of a delegation result (operations and entities in words: CLI, MCP and transcripts show it). */
export function delegationText(r: DelegationResult, locale: string, world: WorldRuntime, caseDef?: CaseDefinition): string {
  if (r.message === "unknown-task") return rt(locale, "delegate.unknownTask", { task: r.task });
  if (r.message === "unknown-role") return rt(locale, "delegate.unknownRole", { role: r.role });
  if (r.message === "not-authorized") return rt(locale, "delegate.notAuthorized", { message: r.refusal ?? "" });
  const staff = r.staffId ? (world.entity(r.staffId) ? t(world.entity(r.staffId)!.name, locale) : r.staffId) : r.role;
  const task = taskLabel(locale, r.task);
  if (r.message === "no-item" || r.message === "no-target") return rt(locale, r.message === "no-item" ? "delegate.noItem" : "delegate.needTarget", { task, what: task, param: "target" });
  const lines = [rt(locale, "delegate.result", { staff, task, status: rt(locale, `delegate.status.${r.status}` as RuntimeKey), steps: r.steps.length, seconds: Math.round(r.elapsedSeconds) })];
  r.steps.forEach((s, i) => {
    const words = stepWords(s, locale, world, caseDef);
    lines.push(
      rt(locale, "delegate.step", {
        n: i + 1,
        operation: words.operation,
        target: words.target ? ` ${words.target}` : "",
        status: rt(locale, `delegate.status.${s.status}` as RuntimeKey),
        message: s.status === "completed" ? "" : ` — ${s.message.split("\n")[0]}`,
      }),
    );
  });
  return lines.join("\n");
}

/**
 * Build a parsed skill list: the built-ins, then every project (or user) skill as `project:<id>` — a project
 * skill never shadows a built-in (review S8); `findSkill` finds `project:<id>` by its bare id when no built-in
 * has it.
 */
export function mergeSkills(builtin: readonly SkillDefinition[], project: readonly SkillDefinition[] = []): SkillDefinition[] {
  const byId = new Map<string, SkillDefinition>();
  for (const s of builtin) byId.set(s.id, s);
  for (const s of project) {
    const id = s.id.startsWith(PROJECT_SKILL_PREFIX) ? s.id : `${PROJECT_SKILL_PREFIX}${s.id}`;
    byId.set(id, { ...s, id });
  }
  return [...byId.values()];
}
