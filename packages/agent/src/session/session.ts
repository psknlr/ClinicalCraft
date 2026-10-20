/**
 * ClinicalSession — the runtime core (Codex `Session` analogue, docs/PROTOCOL.md).
 *
 * Front-ends `submit(Op)` and consume `AgentEvent`s. Submissions are processed
 * serially; `interrupt`, `approval_response` and `dynamic_tool_response` are
 * handled the moment they arrive so a waiting turn can be cancelled or
 * answered. Every op, clinical action, conversation message and durable event
 * is written to the transcript; `snapshot()` / `resume` replay accepted
 * actions through the pure engine and restore conversations.
 *
 * This module is the public facade. The session's state and primitives are its
 * `SessionKernel` (kernel.ts), which lists the parts the session is built from:
 * op dispatch, the learner's tool path, agent turns, the tool path and approval
 * gate, agent models, conversations, external calls, the embodied wiring, resume.
 */
import { vitalsAt, type CaseDefinition, type ClinicalAction, type EquipmentCatalog, type FacilityDefinition, type ReduceResult, type SessionState } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type EpisodeTrace, type WorldRuntime } from "@clinicalcraft/world";
import type { AgentProfile, SlashCommand } from "../agents/types.js";
import type { HookRunner } from "../hooks/runner.js";
import type { AgentEvent, AgentRole, Op, PlanItem } from "../protocol.js";
import type { RetryPolicy } from "../providers/factory.js";
import type { ChatMessage } from "../providers/types.js";
import type { HookEventName, ResolvedSettings } from "../settings/schema.js";
import { learnerVitals } from "../tools/format.js";
import type { ToolDefinition, VitalsView } from "../tools/types.js";
import { rt } from "./i18n.js";
import { SessionKernel } from "./kernel.js";
import { restoreRuntime, restoreSession, sessionSnapshot } from "./resume.js";
import { emptyTrace } from "./trace.js";
import type { ClinicalSessionApi, SessionOptions, SessionSnapshot } from "./types.js";

/** Runtime version stamped into transcripts. */
export const CLINICALCRAFT_VERSION = "5.0.0";

/** Smallest real-time clock step dispatched by `advanceRealTime` (simulated minutes). */
export const REALTIME_MIN_STEP = 0.25;

export { MAX_NESTED_ASKS } from "./tool-path.js";

/** Options beyond the contract `SessionOptions`. */
export interface CreateSessionOptions extends SessionOptions {
  /** Retry policy for model calls (`false` disables; tests inject fast sleeps). */
  retry?: RetryPolicy | false;
  /** Write a `session_meta` item (default true). */
  writeSessionMeta?: boolean;
  /** Resume: runtime state beyond actions/messages (interlocutor, workup plan, patient/companion affect) — see `resumedRuntimeConfig`. */
  restore?: { interlocutor?: string; plan?: { items: PlanItem[]; explanation: string | null }; affect?: Partial<Record<"patient" | "companion", number>> };
}

export { cleanConfigPatch, sanitizeOp } from "./op-dispatch.js";

export { actionFromToolInput, actionToolArgs } from "./action-input.js";

export class ClinicalSession implements ClinicalSessionApi {
  readonly id: string;
  readonly caseDef: CaseDefinition;
  readonly facility: FacilityDefinition | null;
  readonly catalogs: EquipmentCatalog[];
  readonly hooks: { on(event: HookEventName, handler: Parameters<HookRunner["on"]>[1]): () => void };

  /** The session's state, primitives and parts (kernel.ts). */
  private readonly k: SessionKernel;
  private realtimeCarry = 0;

  constructor(opts: CreateSessionOptions) {
    const k = new SessionKernel(opts);
    this.k = k;
    this.id = k.id;
    this.caseDef = k.caseDef;
    this.facility = k.facility;
    this.catalogs = k.catalogs;
    this.hooks = { on: (event, handler) => k.hookRunner.on(event, handler) };
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  get settings(): ResolvedSettings {
    return this.k.settings;
  }

  get state(): SessionState {
    return this.k.state;
  }

  /** Session language. */
  get locale(): string {
    return this.k.locale;
  }

  /** True after `shutdown_complete`. */
  get isClosed(): boolean {
    return this.k.closed;
  }

  /** `clinical` or `embodied` (fixed for the encounter). */
  get embodiment(): "clinical" | "embodied" {
    return this.k.embodiment;
  }

  /** The encounter's world (embodied mode), or null. */
  world(): WorldRuntime | null {
    return this.k.embodied?.world() ?? null;
  }

  /** The episode trace (empty in clinical mode). */
  trace(): EpisodeTrace {
    return this.k.embodied?.trace.trace() ?? emptyTrace(this.id, this.caseDef.id, this.facility?.id ?? null);
  }

  /**
   * A registered tool by name — in embodied mode the spatially gated clinical tools and the world tools
   * (front-ends that run tools themselves, e.g. the MCP bridge, use these definitions).
   */
  tool(name: string): ToolDefinition<any> | undefined {
    return this.k.registry.get(name);
  }

  /** Where the learner's body is (embodied mode; the REPL status line), or null. */
  placeLabel(): string | null {
    return this.k.embodied?.roomName(PRIMARY_ACTOR, this.locale) ?? null;
  }

  /**
   * The bedside vitals as the learner may see them now (reviews G3/G11) — for front-ends' vitals channels (the
   * MCP state resource, the REPL status line): `learnerVitals` of the snapshot (no ECG morphology); in embodied
   * mode only where the learner's body can see them (`checkSpatial` vitals: the attached monitor's screen, hands
   * at the patient, a records terminal), else nothing and why. Audible alarms are announced regardless.
   */
  vitalsView(): VitalsView {
    const k = this.k;
    return k.embodied ? k.embodied.vitalsView(PRIMARY_ACTOR) : { inView: true, snapshot: learnerVitals(vitalsAt(k.caseDef, k.state)) };
  }

  /** Start-up: restore (resume), SessionStart hooks, session_meta, session_configured. Called by `createSession`. */
  async start(): Promise<void> {
    const k = this.k;
    const resume = k.opts.resume;
    const derivedDialogue = resume ? restoreSession(k, resume) : [];
    restoreRuntime(k, k.opts.restore);
    if (k.opts.writeSessionMeta !== false) {
      k.recorder?.record("session_meta", {
        sessionId: this.id,
        caseId: this.caseDef.id,
        caseVersion: this.caseDef.version,
        facilityId: this.facility?.id ?? null,
        locale: this.locale,
        provider: k.settings.provider,
        model: k.settings.model ?? "",
        clinicalcraftVersion: CLINICALCRAFT_VERSION,
        ...(k.embodied ? { embodiment: "embodied" as const } : {}),
      });
    }
    for (const entry of derivedDialogue) k.recorder?.record("dialogue", { ...entry });
    const hook = await k.runHook({ hook_event_name: "SessionStart", source: resume ? "resume" : "startup" });
    for (const w of hook.warnings) k.emit("", { type: "warning", message: w });
    for (const issue of k.opts.skillIssues ?? []) k.emit("", { type: "warning", message: rt(this.locale, "embodied.skillIssue", { issue }) });
    const untrusted = k.opts.skillsUntrusted;
    if (untrusted && k.embodied) k.emit("", { type: "warning", message: rt(this.locale, "embodied.skillsUntrusted", { files: untrusted.files, dir: untrusted.dir }) });
    k.sessionContext.push(...hook.additionalContext);
    k.emitConfigured("");
    k.emitSnapshot("");
  }

  submit(op: Op): string {
    const id = this.k.newId();
    void this.k.ops.accept(id, op);
    return id;
  }

  async run(op: Op): Promise<AgentEvent[]> {
    const k = this.k;
    const id = k.newId();
    if (k.closed) {
      // The event stream has ended: answer directly instead of emitting.
      return [{ id, seq: k.hub.lastSeq, msg: { type: "error", message: rt(this.locale, "error.closed"), code: "closed" } }];
    }
    const events: AgentEvent[] = [];
    const off = k.hub.subscribe((e) => {
      if (e.id === id) events.push(e);
    });
    try {
      await k.ops.accept(id, op);
    } finally {
      off();
    }
    return events;
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    return this.k.hub.subscribe(listener);
  }

  events(): AsyncIterable<AgentEvent> {
    return this.k.hub.events();
  }

  dispatch(action: ClinicalAction): ReduceResult {
    return this.k.dispatch(action, this.k.currentSubmission);
  }

  toolsFor(agent: AgentRole): ToolDefinition<any>[] {
    return this.k.toolsFor(agent);
  }

  commands(): SlashCommand[] {
    return [...this.k.slash];
  }

  agents(): AgentProfile[] {
    return [...this.k.profiles.values()].map((p) => ({ ...p, tools: [...p.tools] }));
  }

  /** Names of the agents a learner can talk to in this case. */
  availableAgents(): string[] {
    return this.k.availableAgents();
  }

  /** Current workup plan. */
  workupPlan(): { items: PlanItem[]; explanation: string | null } {
    return this.k.workupPlan();
  }

  /** A copy of an agent's conversation. */
  conversationOf(agent: AgentRole): ChatMessage[] {
    return this.k.conversations.copyOf(agent);
  }

  snapshot(): SessionSnapshot {
    return sessionSnapshot(this.k);
  }

  async close(): Promise<void> {
    const k = this.k;
    if (k.closed || k.closing) return k.ops.queue;
    await k.ops.accept(k.newId(), { type: "shutdown" });
  }

  /**
   * Advance a simulated clock in real time (3D world): `ms` of wall time ×
   * `clock.realtimeScale`. Small steps accumulate; returns the dispatched
   * result or null when nothing was dispatched.
   */
  advanceRealTime(ms: number): ReduceResult | null {
    const k = this.k;
    const c = k.caseDef;
    const s = k.state;
    if (c.clock.mode !== "simulated" || c.clock.realtimeScale <= 0 || !s.started || s.finished || k.closed || k.closing || !(ms > 0)) return null;
    this.realtimeCarry += (ms / 60_000) * c.clock.realtimeScale;
    if (this.realtimeCarry < REALTIME_MIN_STEP) return null;
    const minutes = Math.min(Math.round(this.realtimeCarry * 100) / 100, 24 * 60);
    this.realtimeCarry = 0;
    return k.dispatch({ type: "advance-time", minutes, by: "system" }, "");
  }
}

/** Create and start a session (SessionStart hooks, `session_configured`). */
export async function createSession(opts: CreateSessionOptions): Promise<ClinicalSession> {
  const session = new ClinicalSession(opts);
  await session.start();
  return session;
}
