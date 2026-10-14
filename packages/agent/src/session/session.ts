/**
 * ClinicalSession — the runtime core (Codex `Session` analogue, docs/PROTOCOL.md).
 *
 * Front-ends `submit(Op)` and consume `AgentEvent`s. Submissions are processed
 * serially; `interrupt`, `approval_response` and `dynamic_tool_response` are
 * handled the moment they arrive so a waiting turn can be cancelled or
 * answered. Every op, clinical action, conversation message and durable event
 * is written to the transcript; `snapshot()` / `resume` replay accepted
 * actions through the pure engine and restore conversations.
 */
import {
  ClinicalActionSchema,
  assess,
  createSession as createEngineState,
  currentWaypoint,
  progress,
  reduce,
  replay,
  t,
  vitalsAt,
  type CaseDefinition,
  type ClinicalAction,
  type EquipmentCatalog,
  type FacilityDefinition,
  type ReduceResult,
  type SessionState,
} from "@clinicalcraft/core";
import { BUILTIN_AGENTS, mergeAgentProfiles } from "../agents/builtin.js";
import { attendingOffline, consultantOffline, examinerOffline, narrateAction, nurseOffline } from "../agents/offline.js";
import { agentKind, buildSystemSections, npcDisplayName, patientLocation, type PromptContext } from "../agents/prompts.js";
import type { AgentProfile, SlashCommand } from "../agents/types.js";
import { BUILTIN_COMMANDS, executeCommand, type CommandHost } from "../commands.js";
import { compactConversation, estimateTokens } from "../compaction.js";
import { emptyHookResult, HookRunner } from "../hooks/runner.js";
import type { HookInput, HookResult } from "../hooks/types.js";
import { addUsage, emptyUsage, executeToolCall, runAgentTurn, type AuthorizeRequest, type GateOutcome, type HookSpec, type LoopHost, type TurnResult } from "../loop.js";
import { actionToolName, checkPermission, PermissionState } from "../permissions.js";
import type { AgentEvent, AgentRole, ApprovalMode, EventMsg, Op, PlanItem, PracticeScope, RuntimeConfigPatch, TokenUsage } from "../protocol.js";
import type { RetryPolicy } from "../providers/factory.js";
import type { ChatMessage, ChatPart, ProviderConfig } from "../providers/types.js";
import type { HookEventName, ResolvedSettings } from "../settings/schema.js";
import { rejectionText } from "../tools/clinical.js";
import { ToolRegistry } from "../tools/index.js";
import type { ToolContext, ToolDefinition, ToolOutput } from "../tools/types.js";
import { validateArgs } from "../tools/validate.js";
import { normaliseContent, redactValue, TranscriptRecorder } from "../transcript.js";
import { ApprovalBroker } from "./approvals.js";
import { offlineClinicianTurn, runAutopilot, type AgentOutcome, type AutopilotHost } from "./autopilot.js";
import { EventHub } from "./events.js";
import { runExaminer, type DialogueEntry, type ExaminerVerdict } from "./examiner.js";
import { rt } from "./i18n.js";
import { resolveAgentModel, type AgentModel } from "./models.js";
import { reactToDomainEvent, type EventReaction } from "./notifications.js";
import { initialAffectIntensity, runPatientTurn, type PatientMemory } from "./patient-pipeline.js";
import { parseLearnerInput } from "./router.js";
import type { ClinicalSessionApi, SessionOptions, SessionSnapshot } from "./types.js";

/** Runtime version stamped into transcripts. */
export const CLINICALCRAFT_VERSION = "5.0.0";

/** Smallest real-time clock step dispatched by `advanceRealTime` (simulated minutes). */
export const REALTIME_MIN_STEP = 0.25;
/** Maximum nesting of agent-to-agent asks (clinician → patient, consultant → …). */
export const MAX_NESTED_ASKS = 3;

/** Options beyond the contract `SessionOptions`. */
export interface CreateSessionOptions extends SessionOptions {
  /** Project directory (hook `cwd`). */
  cwd?: string | null;
  /** Client-executed dynamic tools the front-end supports (e.g. ["walk_to"]). */
  dynamicTools?: readonly string[];
  /** Retry policy for model calls (`false` disables; tests inject fast sleeps). */
  retry?: RetryPolicy | false;
  /** First transcript ordinal (resume continues after the previous file's last one). */
  transcriptOrdinal?: number;
  /** Write a `session_meta` item (default true). */
  writeSessionMeta?: boolean;
}

const TOP_AGENT_ROLES = new Set(["patient", "companion"]);

/** Valid `approval_response` decisions (ops may arrive as untyped JSON). */
const APPROVAL_DECISIONS: ReadonlySet<string> = new Set(["approved", "approved_for_session", "denied", "abort"]);

/** Ops that start work and are cancelled while still queued by an interrupt or shutdown. */
const CANCELLABLE_OPS: ReadonlySet<Op["type"]> = new Set(["user_message", "clinical_action", "slash_command", "autopilot", "compact", "assess"]);

function defaultNewId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Remove anything that looks like a credential from an op before it is transcribed. */
export function sanitizeOp(op: Op): Op {
  const scrub = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = /api[-_]?key|secret|token|password|authorization/i.test(k) ? "[redacted]" : scrub(v);
      return out;
    }
    return value;
  };
  return scrub(op) as Op;
}

/** Only the known `RuntimeConfigPatch` fields (never echo unknown keys such as credentials). */
export function cleanConfigPatch(patch: RuntimeConfigPatch): RuntimeConfigPatch {
  const out: RuntimeConfigPatch = {};
  if (typeof patch.provider === "string") out.provider = patch.provider;
  if (typeof patch.model === "string") out.model = patch.model;
  if (typeof patch.approvalMode === "string") out.approvalMode = patch.approvalMode;
  if (typeof patch.practiceScope === "string") out.practiceScope = patch.practiceScope;
  if (typeof patch.locale === "string") out.locale = patch.locale;
  if (typeof patch.interlocutor === "string") out.interlocutor = patch.interlocutor;
  if (patch.agents && typeof patch.agents === "object") {
    out.agents = {};
    for (const [name, o] of Object.entries(patch.agents)) {
      if (!o || typeof o !== "object") continue;
      out.agents[name] = {
        ...(typeof o.provider === "string" ? { provider: o.provider } : {}),
        ...(typeof o.model === "string" ? { model: o.model } : {}),
        ...(typeof o.effort === "string" ? { effort: o.effort } : {}),
        ...(typeof o.temperature === "number" ? { temperature: o.temperature } : {}),
      };
    }
  }
  return out;
}

/** Tool arguments equivalent to a learner clinical action (for the approval gate). */
export function actionToolArgs(c: CaseDefinition, action: ClinicalAction, locale: string): Record<string, unknown> {
  switch (action.type) {
    case "ask": {
      const h = c.history.find((x) => x.id === action.itemId);
      return { question: h ? t(h.question, locale) : action.itemId };
    }
    case "examine":
      return { finding_id: action.findingId };
    case "order":
      return { investigation_id: action.investigationId };
    case "read":
      return { investigation_id: action.investigationId, ...(action.phase ? { phase: action.phase } : {}) };
    case "intervene":
      return { intervention_id: action.interventionId };
    case "answer":
      return { decision_id: action.decisionId, option_ids: action.optionIds };
    case "set-phase":
      return { phase: action.phase };
    case "advance-time":
      return { minutes: action.minutes };
    case "finish":
    case "start":
    case "hint":
    case "flag":
    case "note":
      return {};
    default: {
      const never: never = action;
      return never;
    }
  }
}

export class ClinicalSession implements ClinicalSessionApi {
  readonly id: string;
  readonly caseDef: CaseDefinition;
  readonly facility: FacilityDefinition | null;
  readonly catalogs: EquipmentCatalog[];
  readonly hooks: { on(event: HookEventName, handler: Parameters<HookRunner["on"]>[1]): () => void };

  private _settings: ResolvedSettings;
  private _state: SessionState;
  private readonly opts: CreateSessionOptions;
  private readonly now: () => number;
  private readonly newId: () => string;
  private readonly retry: RetryPolicy | false | undefined;
  private readonly recorder: TranscriptRecorder | null;
  private readonly hub: EventHub;
  private readonly hookRunner = new HookRunner();
  private readonly permissionState = new PermissionState();
  private readonly broker: ApprovalBroker;
  private readonly registry: ToolRegistry;
  private readonly profiles: Map<string, AgentProfile>;
  private readonly slash: SlashCommand[];
  private readonly conversations = new Map<string, ChatMessage[]>();
  private readonly models = new Map<string, AgentModel>();
  private readonly warnedOffline = new Set<string>();
  private readonly usage = new Map<string, TokenUsage>();
  private readonly totalUsage = emptyUsage();
  private readonly pendingDynamic = new Map<string, (r: { ok: boolean; output: string }) => void>();
  private readonly patientMemory: Record<"patient" | "companion", PatientMemory>;
  /** Flags set by the case's interventions and scenario events (never settable by the learner directly). */
  private readonly ownedFlags: ReadonlySet<string>;
  private readonly dialogue: DialogueEntry[] = [];
  private readonly sessionContext: string[] = [];
  private readonly createdAt: number;
  private acceptedActions: ClinicalAction[] = [];
  private plan: PlanItem[] = [];
  private planExplanation: string | null = null;
  private interlocutor: AgentRole = "patient";
  private queue: Promise<void> = Promise.resolve();
  private hookChain: Promise<void> = Promise.resolve();
  private active: { id: string; controller: AbortController } | null = null;
  private currentSubmission = "";
  private currentUtterance: string | null = null;
  private realtimeCarry = 0;
  private askDepth = 0;
  /** Bumped by every interrupt/shutdown: queued turns submitted before it are cancelled before they start. */
  private interruptEpoch = 0;
  /** Credentials known to the session (resolved provider keys), masked in every transcript item. */
  private readonly secrets = new Set<string>();
  private readonly offlineCursor = { value: 0 };
  private closing = false;
  private closed = false;

  constructor(opts: CreateSessionOptions) {
    this.opts = opts;
    this.caseDef = opts.caseDef;
    this.facility = opts.facility ?? null;
    this.catalogs = opts.catalogs ?? [];
    this._settings = structuredClone(opts.settings);
    this.now = opts.now ?? (() => Date.now());
    this.newId = opts.newId ?? defaultNewId;
    this.retry = opts.retry;
    this.id = opts.sessionId ?? opts.resume?.sessionId ?? this.newId();
    this.createdAt = this.now();
    // Every transcript item passes through redaction: provider keys the session resolved (and
    // well-known key formats) never reach a sink — JSONL on disk, IndexedDB, or a server upload.
    this.recorder = opts.transcript ? new TranscriptRecorder(opts.transcript, this.now, opts.transcriptOrdinal ?? 0, (item) => redactValue(item, [...this.secrets])) : null;
    this.hub = new EventHub(this.recorder);
    this.broker = new ApprovalBroker((id, msg) => this.emit(id, msg), this.newId);
    this.registry = new ToolRegistry({
      ...(opts.dynamicTools ? { dynamicTools: opts.dynamicTools } : {}),
      ...(opts.tools ? { extra: opts.tools } : {}),
      npc: { utterance: () => this.currentUtterance },
    });
    this.profiles = new Map(mergeAgentProfiles(BUILTIN_AGENTS, opts.agents).map((p) => [p.name, p]));
    const builtinNames = new Set(BUILTIN_COMMANDS.map((c) => c.name));
    this.slash = [...BUILTIN_COMMANDS, ...(opts.commands ?? []).filter((c) => !builtinNames.has(c.name))];
    this.hooks = { on: (event, handler) => this.hookRunner.on(event, handler) };
    const affect = initialAffectIntensity(this.caseDef.patient.persona.affect);
    this.patientMemory = { patient: { approached: false, affectIntensity: affect }, companion: { approached: false, affectIntensity: Math.min(affect, 1) as 0 | 1 } };
    this.ownedFlags = new Set([...this.caseDef.interventions.flatMap((i) => i.setFlags), ...(this.caseDef.physiology?.events ?? []).flatMap((e) => e.setFlags)]);
    for (const p of Object.values(this._settings.providers)) if (p.apiKey) this.secrets.add(p.apiKey);
    this._state = createEngineState(this.caseDef);
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  get settings(): ResolvedSettings {
    return this._settings;
  }

  get state(): SessionState {
    return this._state;
  }

  /** Session language. */
  get locale(): string {
    return this._settings.locale;
  }

  /** True after `shutdown_complete`. */
  get isClosed(): boolean {
    return this.closed;
  }

  /** Start-up: restore (resume), SessionStart hooks, session_meta, session_configured. Called by `createSession`. */
  async start(): Promise<void> {
    const resume = this.opts.resume;
    if (resume) this.restore(resume);
    if (this.opts.writeSessionMeta !== false) {
      this.recorder?.record("session_meta", {
        sessionId: this.id,
        caseId: this.caseDef.id,
        caseVersion: this.caseDef.version,
        facilityId: this.facility?.id ?? null,
        locale: this.locale,
        provider: this._settings.provider,
        model: this._settings.model ?? "",
        clinicalcraftVersion: CLINICALCRAFT_VERSION,
      });
    }
    const hook = await this.runHook({ hook_event_name: "SessionStart", source: resume ? "resume" : "startup" });
    for (const w of hook.warnings) this.emit("", { type: "warning", message: w });
    this.sessionContext.push(...hook.additionalContext);
    this.emitConfigured("");
    this.emitSnapshot("");
  }

  submit(op: Op): string {
    const id = this.newId();
    void this.accept(id, op);
    return id;
  }

  async run(op: Op): Promise<AgentEvent[]> {
    const id = this.newId();
    if (this.closed) {
      // The event stream has ended: answer directly instead of emitting.
      return [{ id, seq: this.hub.lastSeq, msg: { type: "error", message: rt(this.locale, "error.closed"), code: "closed" } }];
    }
    const events: AgentEvent[] = [];
    const off = this.hub.subscribe((e) => {
      if (e.id === id) events.push(e);
    });
    try {
      await this.accept(id, op);
    } finally {
      off();
    }
    return events;
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    return this.hub.subscribe(listener);
  }

  events(): AsyncIterable<AgentEvent> {
    return this.hub.events();
  }

  dispatch(action: ClinicalAction): ReduceResult {
    return this.dispatchInternal(action, this.currentSubmission);
  }

  toolsFor(agent: AgentRole): ToolDefinition<any>[] {
    const profile = this.profiles.get(agent);
    if (!profile) return [];
    return this.registry.forAgent(profile, { scope: this._settings.practiceScope, deny: this._settings.permissions.deny, caseDef: this.caseDef });
  }

  commands(): SlashCommand[] {
    return [...this.slash];
  }

  agents(): AgentProfile[] {
    return [...this.profiles.values()].map((p) => ({ ...p, tools: [...p.tools] }));
  }

  /** Names of the agents a learner can talk to in this case. */
  availableAgents(): string[] {
    return [...this.profiles.keys()].filter((name) => name !== "companion" || this.caseDef.patient.persona.companion !== undefined);
  }

  /** Current workup plan. */
  workupPlan(): { items: PlanItem[]; explanation: string | null } {
    return { items: [...this.plan], explanation: this.planExplanation };
  }

  /** A copy of an agent's conversation. */
  conversationOf(agent: AgentRole): ChatMessage[] {
    return [...(this.conversations.get(agent) ?? [])];
  }

  snapshot(): SessionSnapshot {
    return {
      format: "clinicalcraft-session@1",
      sessionId: this.id,
      caseId: this.caseDef.id,
      caseVersion: this.caseDef.version,
      facilityId: this.facility?.id ?? null,
      locale: this.locale,
      actions: structuredClone(this.acceptedActions),
      messages: Object.fromEntries([...this.conversations].map(([agent, msgs]) => [agent, structuredClone(msgs)])),
      plan: this.plan.map((p) => ({ ...p })),
      createdAt: new Date(this.createdAt).toISOString(),
    };
  }

  async close(): Promise<void> {
    if (this.closed || this.closing) return this.queue;
    await this.accept(this.newId(), { type: "shutdown" });
  }

  /**
   * Advance a simulated clock in real time (3D world): `ms` of wall time ×
   * `clock.realtimeScale`. Small steps accumulate; returns the dispatched
   * result or null when nothing was dispatched.
   */
  advanceRealTime(ms: number): ReduceResult | null {
    const c = this.caseDef;
    const s = this._state;
    if (c.clock.mode !== "simulated" || c.clock.realtimeScale <= 0 || !s.started || s.finished || this.closed || !(ms > 0)) return null;
    this.realtimeCarry += (ms / 60_000) * c.clock.realtimeScale;
    if (this.realtimeCarry < REALTIME_MIN_STEP) return null;
    const minutes = Math.min(Math.round(this.realtimeCarry * 100) / 100, 24 * 60);
    this.realtimeCarry = 0;
    return this.dispatchInternal({ type: "advance-time", minutes, by: "system" }, "");
  }

  /* ---------------------------------------------------------------- */
  /* Submission queue                                                  */
  /* ---------------------------------------------------------------- */

  private accept(id: string, op: Op): Promise<void> {
    if (this.closed || (this.closing && op.type !== "shutdown")) {
      this.emit(id, { type: "error", message: rt(this.locale, "error.closed"), code: "closed" });
      return Promise.resolve();
    }
    this.recorder?.record("op", { id, op: sanitizeOp(op) });
    switch (op.type) {
      case "interrupt":
        this.interrupt(id);
        return Promise.resolve();
      case "approval_response":
        if (!APPROVAL_DECISIONS.has(op.decision)) {
          // Wire input: an unknown decision must never settle (and so never run) the pending call.
          this.emit(id, { type: "warning", message: rt(this.locale, "warning.invalidApprovalDecision", { decision: String(op.decision), id: String(op.requestId) }) });
        } else if (!this.broker.respond(id, op.requestId, op.decision, typeof op.reason === "string" ? op.reason : undefined)) {
          this.emit(id, { type: "warning", message: rt(this.locale, "warning.unknownApproval", { id: op.requestId }) });
        }
        return Promise.resolve();
      case "dynamic_tool_response": {
        const resolve = this.pendingDynamic.get(op.callId);
        if (resolve) {
          this.pendingDynamic.delete(op.callId);
          resolve({ ok: op.ok, output: op.output });
        } else this.emit(id, { type: "warning", message: rt(this.locale, "warning.unknownDynamicCall", { id: op.callId }) });
        return Promise.resolve();
      }
      case "shutdown":
        this.closing = true;
        this.interrupt(id);
        return this.enqueue(id, op);
      default:
        return this.enqueue(id, op);
    }
  }

  private enqueue(id: string, op: Op): Promise<void> {
    const epoch = this.interruptEpoch;
    const task = this.queue
      .then(() => {
        // A turn queued before an interrupt (or a shutdown) is cancelled before it starts: an
        // interrupt that arrives while its submission is still queued must not be lost.
        if (CANCELLABLE_OPS.has(op.type) && (epoch !== this.interruptEpoch || this.closing)) {
          const reason = rt(this.locale, this.closing ? "submission.reason.shutdown" : "submission.reason.interrupt");
          this.emit(id, { type: "warning", message: rt(this.locale, "submission.cancelled", { reason }) });
          return;
        }
        return this.process(id, op);
      })
      .catch((err: unknown) => this.emit(id, { type: "error", message: rt(this.locale, "error.internal", { message: err instanceof Error ? err.message : String(err) }), code: "internal" }));
    this.queue = task;
    return task;
  }

  private async process(id: string, op: Op): Promise<void> {
    const previous = this.currentSubmission;
    this.currentSubmission = id;
    try {
      switch (op.type) {
        case "user_message":
          return await this.handleUserMessage(id, op.text, op.to ?? null);
        case "clinical_action":
          await this.handleClinicalAction(id, op.action, op.rationale);
          return;
        case "slash_command":
          return await this.handleCommand(id, op.name, op.args);
        case "autopilot":
          return await this.withTurn(id, (signal) => this.runAutopilot(id, op.goal, op.maxTurns, signal));
        case "configure":
          return this.configure(id, op.patch);
        case "compact":
          return await this.compact(id, op.agent ?? null, "manual");
        case "assess":
          return void (await this.withTurn(id, (signal) => this.runAssessment(id, signal)));
        case "shutdown":
          return await this.shutdownSequence(id);
        case "interrupt":
        case "approval_response":
        case "dynamic_tool_response":
          return;
        default: {
          const never: never = op;
          return never;
        }
      }
    } finally {
      this.currentSubmission = previous;
    }
  }

  private async withTurn<T>(id: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    this.active = { id, controller };
    try {
      return await fn(controller.signal);
    } finally {
      if (this.active?.controller === controller) this.active = null;
    }
  }

  private interrupt(id: string): void {
    this.interruptEpoch++;
    this.active?.controller.abort();
    this.broker.cancelAll(id);
    for (const [callId, resolve] of [...this.pendingDynamic]) {
      this.pendingDynamic.delete(callId);
      resolve({ ok: false, output: rt(this.locale, "tool.aborted") });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Events, hooks, transcript                                         */
  /* ---------------------------------------------------------------- */

  private emit(id: string, msg: EventMsg): void {
    if (this.hub.isClosed) return;
    this.hub.emit(id, msg);
  }

  private emitConfigured(id: string): void {
    const model = this.model("patient", false);
    this.emit(id, {
      type: "session_configured",
      sessionId: this.id,
      caseId: this.caseDef.id,
      caseVersion: this.caseDef.version,
      facilityId: this.facility?.id ?? null,
      locale: this.locale,
      provider: this._settings.provider,
      model: this._settings.model ?? model.config?.model ?? (this._settings.provider === "offline" ? "deterministic" : ""),
      approvalMode: this._settings.approvalMode,
      practiceScope: this._settings.practiceScope,
      agents: this.availableAgents(),
      interlocutor: this.interlocutor,
      offline: this._settings.provider === "offline" || this.model("clinician", false).provider === null,
    });
  }

  private emitSnapshot(id: string): void {
    const c = this.caseDef;
    const s = this._state;
    this.emit(id, { type: "state_snapshot", state: s, progress: progress(c, s), vitals: vitalsAt(c, s), waypoint: currentWaypoint(c, s) });
  }

  private hookInput(spec: HookSpec): HookInput {
    return {
      session_id: this.id,
      case_id: this.caseDef.id,
      transcript_path: this.opts.transcript?.path ?? null,
      cwd: this.opts.cwd ?? null,
      approval_mode: this._settings.approvalMode,
      locale: this.locale,
      ...spec,
    } as HookInput;
  }

  private async runHook(spec: HookSpec, signal?: AbortSignal): Promise<HookResult> {
    if (!this.hookRunner.has(spec.hook_event_name, this._settings.hooks)) return emptyHookResult();
    return this.hookRunner.runHooks(spec.hook_event_name, this.hookInput(spec), {
      settingsHooks: this._settings.hooks,
      ...(this.opts.commandHooks ? { executor: this.opts.commandHooks } : {}),
      ...(signal ? { signal } : {}),
    });
  }

  /** Fire-and-forget hooks (ClinicalEvent, Notification), run in order. */
  private queueHook(spec: HookSpec, id: string): void {
    if (!this.hookRunner.has(spec.hook_event_name, this._settings.hooks)) return;
    this.hookChain = this.hookChain
      .then(async () => {
        const result = await this.runHook(spec);
        for (const w of result.warnings) this.emit(id, { type: "warning", message: w });
      })
      .catch(() => undefined);
  }

  private conversation(agent: AgentRole): ChatMessage[] {
    let list = this.conversations.get(agent);
    if (!list) {
      list = [];
      this.conversations.set(agent, list);
    }
    return list;
  }

  private appendMessages(agent: AgentRole, messages: readonly ChatMessage[]): void {
    const list = this.conversation(agent);
    for (const m of messages) {
      list.push(m);
      this.recorder?.record("message", { agent, role: m.role, content: m.content });
    }
  }

  private commitTurn(agent: AgentRole, turn: TurnResult): void {
    const list = this.conversation(agent);
    list.length = 0;
    list.push(...turn.messages);
    for (const m of turn.appended) this.recorder?.record("message", { agent, role: m.role, content: m.content });
  }

  private trackUsage(id: string, agent: AgentRole, usage: TokenUsage): void {
    const mine = this.usage.get(agent) ?? emptyUsage();
    addUsage(mine, usage);
    this.usage.set(agent, mine);
    addUsage(this.totalUsage, usage);
    this.emit(id, { type: "token_usage", agent, usage: { ...usage }, total: { ...this.totalUsage } });
  }

  /* ---------------------------------------------------------------- */
  /* Engine                                                            */
  /* ---------------------------------------------------------------- */

  private dispatchInternal(action: ClinicalAction, id: string): ReduceResult {
    const result = reduce(this.caseDef, this._state, action);
    const accepted = !result.rejected;
    if (accepted) {
      this._state = result.state;
      this.acceptedActions.push(action);
    }
    this.recorder?.record("action", { action, accepted });
    for (const event of result.events) {
      this.emit(id, { type: "clinical_event", event });
      this.queueHook({ hook_event_name: "ClinicalEvent", event }, id);
      for (const reaction of reactToDomainEvent(this.caseDef, event, this.locale)) this.react(id, reaction);
    }
    if (accepted) {
      this.emitSnapshot(id);
      if (action.type !== "ask" && action.type !== "start") {
        const narration = action.type === "note" ? action.text : narrateAction(this.caseDef, action, this.locale);
        if (narration) this.dialogue.push({ who: "action", speaker: String(action.by ?? "learner"), text: narration });
      }
    }
    return result;
  }

  private react(id: string, reaction: EventReaction): void {
    if (reaction.notification) {
      const n = reaction.notification;
      this.emit(id, { type: "notification", level: n.level, title: n.title, body: n.body });
      this.queueHook({ hook_event_name: "Notification", level: n.level, title: n.title, body: n.body }, id);
    }
    if (reaction.staffLine) {
      const line = reaction.staffLine;
      const speaker = line.speaker === "monitor" ? rt(this.locale, "speaker.monitor") : npcDisplayName(this.caseDef, this.facility, "nurse", this.locale);
      this.emit(id, { type: "agent_message", turnId: this.newId(), agent: line.agent, speaker, text: line.text, grounded: [] });
      this.appendMessages(line.agent, [{ role: "assistant", content: [{ type: "text", text: line.text }] }]);
      this.dialogue.push({ who: line.agent, speaker, text: line.text });
    }
  }

  private ensureStarted(id: string): void {
    if (!this._state.started && !this._state.finished) this.dispatchInternal({ type: "start", by: "system" }, id);
  }

  /* ---------------------------------------------------------------- */
  /* Models, prompts, tools                                            */
  /* ---------------------------------------------------------------- */

  private model(agent: string, warn = true): AgentModel {
    let m = this.models.get(agent);
    if (!m) {
      const profile = this.profiles.get(agent) ?? this.profiles.get("patient")!;
      m = resolveAgentModel(profile, this._settings, {
        ...(this.opts.resolveProvider ? { resolveProvider: this.opts.resolveProvider } : {}),
        ...(this.opts.providerFactory ? { providerFactory: this.opts.providerFactory } : {}),
      });
      this.models.set(agent, m);
      this.rememberSecrets(m.config);
    }
    if (warn && !m.provider && m.offlineReason && !this.warnedOffline.has(agent)) {
      this.warnedOffline.add(agent);
      const reason = rt(this.locale, m.offlineReason.key, m.offlineReason.params);
      this.emit(this.currentSubmission, { type: "warning", message: rt(this.locale, "warning.offline", { agent, reason }) });
    }
    return m;
  }

  /** Remember credentials of a resolved provider config so transcripts mask them. */
  private rememberSecrets(config: ProviderConfig | null): void {
    if (!config) return;
    if (config.apiKey) this.secrets.add(config.apiKey);
    for (const [name, value] of Object.entries(config.headers ?? {})) if (/auth|key|token|secret/i.test(name) && value) this.secrets.add(value.replace(/^Bearer\s+/i, ""));
  }

  private promptContext(): PromptContext {
    return {
      caseDef: this.caseDef,
      state: this._state,
      locale: this.locale,
      facility: this.facility,
      catalogs: this.catalogs,
      memory: this.opts.memory ?? null,
      sessionContext: this.sessionContext,
      plan: this.plan,
    };
  }

  private requestOptions(m: AgentModel) {
    return {
      ...(m.model ? { model: m.model } : {}),
      ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
      ...(m.temperature !== undefined ? { temperature: m.temperature } : {}),
      ...(m.effort ? { effort: m.effort } : {}),
    };
  }

  private toolContext(agent: AgentRole | "learner", id: string, signal?: AbortSignal): ToolContext {
    const dynamic = this.registry.has("walk_to");
    return {
      caseDef: this.caseDef,
      facility: this.facility,
      catalogs: this.catalogs,
      locale: this.locale,
      agent,
      state: () => this._state,
      dispatch: (action) => this.dispatchInternal(action, id),
      ask: async (target, utterance, sig) => {
        if (this.askDepth >= MAX_NESTED_ASKS) return { text: rt(this.locale, "tool.nestedLimit", { agent: target }), grounded: [] };
        // The examiner judges the encounter from this dialogue: keep the asker's words with the reply.
        if (utterance.trim()) {
          const who = agent === "learner" ? "learner" : String(agent);
          const speaker = agent === "learner" ? "learner" : npcDisplayName(this.caseDef, this.facility, String(agent), this.locale);
          this.dialogue.push({ who, speaker, text: target === "patient" ? utterance : `@${target} ${utterance}` });
        }
        this.askDepth++;
        try {
          const reply = await this.runAgent(id, target, utterance, sig ?? signal);
          return { text: reply.text, grounded: reply.grounded };
        } finally {
          this.askDepth--;
        }
      },
      updatePlan: (plan, explanation) => this.updatePlan(id, agent, plan, explanation),
      ...(dynamic ? { dynamicTool: (tool: string, args: unknown, sig?: AbortSignal) => this.callDynamicTool(id, tool, args, sig ?? signal) } : {}),
      ...(signal ? { signal } : {}),
    };
  }

  private loopHost(id: string): LoopHost {
    return {
      toolContext: (agent, signal) => this.toolContext(agent, id, signal),
      authorize: (request) => this.authorize(id, request),
      // Tool/Stop hooks belong to the running turn: an interrupt also cancels a slow hook command.
      runHooks: (spec) => this.runHook(spec, this.active?.controller.signal),
    };
  }

  private updatePlan(id: string, agent: AgentRole | "learner", plan: PlanItem[], explanation?: string): void {
    this.plan = plan.map((p) => ({ text: p.text, status: p.status }));
    this.planExplanation = explanation ?? null;
    this.emit(id, { type: "plan_updated", agent: agent === "learner" ? "learner" : agent, ...(explanation ? { explanation } : {}), plan: this.plan });
  }

  private callDynamicTool(id: string, tool: string, args: unknown, signal?: AbortSignal): Promise<{ ok: boolean; output: string }> {
    const callId = this.newId();
    return new Promise((resolve) => {
      if (signal?.aborted) return resolve({ ok: false, output: rt(this.locale, "tool.aborted") });
      const onAbort = () => {
        this.pendingDynamic.delete(callId);
        resolve({ ok: false, output: rt(this.locale, "tool.aborted") });
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.pendingDynamic.set(callId, (r) => {
        signal?.removeEventListener("abort", onAbort);
        resolve(r);
      });
      this.emit(id, { type: "dynamic_tool_call", callId, tool, args });
    });
  }

  /** The approval gate (permission ladder + approval_request flow). */
  private async authorize(id: string, req: AuthorizeRequest): Promise<GateOutcome> {
    const s = this._settings;
    const check = checkPermission(req.tool, req.args as never, req.ctx, s.approvalMode, s.practiceScope, s.permissions, this.permissionState);
    if (check.decision === "deny") return { kind: "deny", reason: check.reason, ruleId: check.ruleId };
    if (check.decision === "allow" || req.hookApproved) return { kind: "allow", ruleId: check.ruleId };
    const phase = (p: "awaiting_approval" | "executing_tools") => {
      if (req.turnId) this.emit(id, { type: "turn_phase", turnId: req.turnId, agent: String(req.agent), phase: p });
    };
    phase("awaiting_approval");
    let summary: string;
    try {
      summary = req.tool.summarize(req.args as never, req.ctx);
    } catch {
      summary = req.tool.name;
    }
    const answer = await this.broker.request(
      id,
      { agent: req.agent, tool: req.tool.name, args: req.args, risk: check.risk, summary, reason: check.reason, ruleId: check.ruleId, allowSession: check.allowSession },
      req.signal,
    );
    phase("executing_tools");
    switch (answer.decision) {
      case "approved":
        return { kind: "allow", ruleId: "learner.approved" };
      case "approved_for_session": {
        let specifier: string | null = null;
        try {
          specifier = req.tool.specifier?.(req.args as never, req.ctx) ?? null;
        } catch {
          specifier = null;
        }
        if (check.allowSession) this.permissionState.addSessionRule(req.tool.name, specifier);
        return { kind: "allow", ruleId: "learner.approved_for_session" };
      }
      case "denied":
        return { kind: "deny", reason: answer.reason ?? "", ruleId: "learner.denied", byLearner: true };
      case "abort":
        return { kind: "abort" };
      default: {
        const never: never = answer.decision;
        return never;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Learner input                                                     */
  /* ---------------------------------------------------------------- */

  private async handleUserMessage(id: string, text: string, to: string | null): Promise<void> {
    if (typeof text !== "string") {
      this.emit(id, { type: "error", message: rt(this.locale, "error.internal", { message: "user_message.text must be a string" }), code: "invalid_op" });
      return;
    }
    let target: string;
    let body = text;
    if (to === null) {
      const parsed = parseLearnerInput(text);
      if (parsed.kind === "command") return this.handleCommand(id, parsed.name, parsed.args);
      target = parsed.to ?? this.interlocutor;
      body = parsed.text;
    } else {
      target = String(to).replace(/^@/, "").toLowerCase();
    }
    await this.withTurn(id, (signal) => this.sendLearnerMessage(id, target, body, signal));
  }

  /**
   * Learner text to an agent — typed (`user_message`) or produced by a slash
   * command (`/ask …`, `/consult …`, custom templates): UserPromptSubmit hooks
   * (may block or add context) → start → transcript → the agent's turn.
   */
  private async sendLearnerMessage(id: string, target: string, body: string, signal: AbortSignal): Promise<void> {
    if (!this.availableAgents().includes(target)) {
      this.emit(id, { type: "error", message: rt(this.locale, "warning.unknownAgent", { agent: target }), code: "unknown_agent" });
      return;
    }
    const hook = await this.runHook({ hook_event_name: "UserPromptSubmit", prompt: body, to: target }, signal);
    for (const w of hook.warnings) this.emit(id, { type: "warning", message: w });
    if (hook.blocked) {
      this.emit(id, { type: "warning", message: rt(this.locale, "warning.promptBlocked", { reason: hook.reason ?? "" }) });
      return;
    }
    if (signal.aborted) {
      this.emit(id, { type: "warning", message: rt(this.locale, "submission.cancelled", { reason: rt(this.locale, "submission.reason.interrupt") }) });
      return;
    }
    if (body.trim()) {
      this.ensureStarted(id);
      this.dialogue.push({ who: "learner", speaker: "learner", text: target === "patient" ? body : `@${target} ${body}` });
    }
    await this.runAgent(id, target, body, signal, hook.additionalContext);
  }

  private async handleCommand(id: string, name: string, args: string): Promise<void> {
    await this.withTurn(id, (signal) => executeCommand(this.commandHost(id, name, signal), name.toLowerCase(), args));
  }

  private async handleClinicalAction(id: string, raw: ClinicalAction, rationale?: string): Promise<ReduceResult | null> {
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (!parsed.success) {
      this.emit(id, { type: "error", message: rt(this.locale, "error.invalidAction", { errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }), code: "invalid_action" });
      return null;
    }
    const action = { ...parsed.data, by: parsed.data.by ?? "learner" } as ClinicalAction;
    if (rationale?.trim()) this.dialogue.push({ who: "learner", speaker: "learner", text: `[${action.type}] ${rationale.trim()}` });
    return this.withTurn(id, (signal) => this.learnerAction(id, action, signal));
  }

  /** A learner action through PreToolUse hooks and the approval gate, then the engine. */
  private async learnerAction(id: string, action: ClinicalAction, signal?: AbortSignal): Promise<ReduceResult | null> {
    const L = this.locale;
    // Flags owned by the simulation (set by interventions / scenario events) drive objectives,
    // rubric items and trend stops: setting or clearing them directly would bypass the
    // approval gate and the practice scope of the action that owns them.
    if (action.type === "flag" && this.ownedFlags.has(action.flag)) {
      this.emit(id, { type: "error", message: rt(L, "action.denied", { reason: rt(L, "action.flagOwned", { flag: action.flag }) }), code: "permission_denied" });
      return null;
    }
    const toolName = actionToolName(action);
    const tool = toolName ? this.registry.get(toolName) : undefined;
    const args = tool ? actionToolArgs(this.caseDef, action, L) : null;
    if (tool && args) {
      const gate = await this.gateLearnerTool(id, tool, args, signal);
      if (gate) return null;
    }
    if (!["start", "set-phase", "note", "flag"].includes(action.type)) this.ensureStarted(id);
    const result = this.dispatchInternal(action, id);
    const rejection = result.rejected ? rt(L, "action.rejected", { code: result.rejected.code, message: rejectionText(L, result.rejected.code) }) : null;
    if (rejection) {
      this.emit(id, { type: "warning", message: rejection });
    } else if (action.type === "ask") {
      this.speakAuthoredAnswer(id, action.itemId);
    }
    if (tool && args) {
      // Same hook sequence as an agent's tool call: PreToolUse → gate → run → PostToolUse.
      let output = rejection ?? "";
      if (!rejection) {
        try {
          output = tool.summarize(args, this.toolContext("learner", id, signal));
        } catch {
          output = tool.name;
        }
      }
      const post = await this.runHook({ hook_event_name: "PostToolUse", agent: "learner", tool_name: tool.name, tool_input: args, tool_response: { ok: !rejection, output } }, signal);
      for (const w of post.warnings) this.emit(id, { type: "warning", message: w });
    }
    return result;
  }

  /** Hooks + gate for a learner tool use; returns a refusal output or null when allowed. */
  private async gateLearnerTool(id: string, tool: ToolDefinition<any>, args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolOutput | null> {
    const L = this.locale;
    const ctx = this.toolContext("learner", id, signal);
    const pre = await this.runHook({ hook_event_name: "PreToolUse", agent: "learner", tool_name: tool.name, tool_input: args }, signal);
    for (const w of pre.warnings) this.emit(id, { type: "warning", message: w });
    if (pre.blocked) {
      const message = rt(L, "action.denied", { reason: pre.reason ?? "" });
      this.emit(id, { type: "error", message, code: "permission_denied" });
      return { ok: false, output: message };
    }
    const gate = await this.authorize(id, { agent: "learner", tool, args, ctx, hookApproved: pre.approved, ...(signal ? { signal } : {}) });
    if (gate.kind === "deny") {
      const message = rt(L, "action.denied", { reason: gate.reason || gate.ruleId });
      this.emit(id, { type: "error", message, code: "permission_denied" });
      return { ok: false, output: message };
    }
    if (gate.kind === "abort") {
      const message = rt(L, "action.cancelled");
      this.emit(id, { type: "warning", message });
      return { ok: false, output: message };
    }
    return null;
  }

  /** Button-style ask: the patient (or companion) speaks the authored answer. */
  private speakAuthoredAnswer(id: string, itemId: string): void {
    const c = this.caseDef;
    const item = c.history.find((h) => h.id === itemId);
    if (!item) return;
    const companion = c.patient.persona.companion;
    const agent = companion?.answersHistory ? "companion" : "patient";
    const speaker = agent === "companion" && companion ? t(companion.name, this.locale) : t(c.patient.displayName, this.locale);
    const question = t(item.question, this.locale);
    const text = t(item.answer, this.locale);
    this.patientMemory[agent].approached = true;
    this.appendMessages(agent, [
      { role: "user", content: [{ type: "text", text: question }] },
      { role: "assistant", content: [{ type: "text", text }] },
    ]);
    this.dialogue.push({ who: "learner", speaker: "learner", text: question }, { who: agent, speaker, text });
    this.emit(id, { type: "agent_message", turnId: this.newId(), agent, speaker, text, grounded: [itemId] });
  }

  /* ---------------------------------------------------------------- */
  /* Agents                                                            */
  /* ---------------------------------------------------------------- */

  /** Run one agent turn (also used for nested asks from tools). */
  private async runAgent(id: string, name: string, utterance: string, signal?: AbortSignal, extraContext: readonly string[] = []): Promise<{ text: string; grounded: string[] }> {
    const turnId = this.newId();
    const started = this.now();
    this.emit(id, { type: "turn_started", turnId, agent: name });
    let outcome: AgentOutcome;
    try {
      const profile = this.profiles.get(name);
      if (!profile) {
        outcome = { status: "error", text: "", grounded: [], error: { message: rt(this.locale, "warning.unknownAgent", { agent: name }) } };
      } else {
        const kind = agentKind(profile);
        if (kind === "patient" || kind === "companion") outcome = await this.runPatientAgent(id, turnId, kind, utterance, signal);
        else if (kind === "examiner") outcome = await this.examinerTurn(id, turnId, signal);
        else if (kind === "clinician" && !this.model("clinician").provider) outcome = await this.offlineClinicianBlock(id, turnId, this.model("clinician").maxToolRounds, signal);
        else outcome = await this.runModelAgent(id, turnId, profile, utterance, signal, extraContext);
      }
    } catch (err) {
      outcome = { status: "error", text: "", grounded: [], error: { message: err instanceof Error ? err.message : String(err) } };
    }
    this.finishTurn(id, turnId, name, outcome, started);
    return { text: outcome.text, grounded: outcome.grounded };
  }

  private finishTurn(id: string, turnId: string, agent: AgentRole, outcome: AgentOutcome, started: number): void {
    const durationMs = Math.max(0, this.now() - started);
    switch (outcome.status) {
      case "end_turn":
      case "refusal":
      case "max_tokens":
        this.emit(id, { type: "turn_complete", turnId, agent, lastMessage: outcome.text || null, durationMs });
        break;
      case "max_tool_rounds":
      case "interrupted":
      case "denied":
        this.emit(id, { type: "turn_aborted", turnId, agent, reason: outcome.status });
        break;
      case "error": {
        const e = outcome.error;
        const info = e && "kind" in e ? e : null;
        this.emit(id, {
          type: "error",
          message: e?.message ?? "error",
          ...(info?.code !== undefined ? { code: String(info.code) } : {}),
          ...(info ? { retryable: info.retryable, auth: info.kind === "auth" } : {}),
        });
        this.emit(id, { type: "turn_aborted", turnId, agent, reason: "error" });
        break;
      }
      default: {
        const never: never = outcome.status;
        void never;
      }
    }
    this.emit(id, { type: "turn_phase", turnId, agent, phase: "idle" });
  }

  private emitAgentMessage(id: string, turnId: string, agent: AgentRole, text: string, grounded: string[], extra: Record<string, unknown> = {}): void {
    const speaker = TOP_AGENT_ROLES.has(agent) ? agent : npcDisplayName(this.caseDef, this.facility, agent, this.locale);
    const msg = { type: "agent_message" as const, turnId, agent, speaker, text, grounded, ...extra };
    this.emit(id, msg as EventMsg);
    this.dialogue.push({ who: agent, speaker, text });
  }

  private async runPatientAgent(id: string, turnId: string, target: "patient" | "companion", utterance: string, signal?: AbortSignal): Promise<AgentOutcome> {
    const c = this.caseDef;
    const companion = c.patient.persona.companion;
    if (target === "companion" && !companion) {
      this.emit(id, { type: "warning", message: rt(this.locale, "warning.noCompanion") });
      return { status: "end_turn", text: "", grounded: [] };
    }
    let speaker: "patient" | "companion" = target;
    if (speaker === "patient" && utterance.trim() && companion?.answersHistory) speaker = "companion";
    const profile = this.profiles.get(speaker)!;
    const m = this.model(profile.name);
    const settings = this._settings.patient;
    const llm = m.provider
      ? {
          provider: m.provider,
          ...(m.model ? { model: m.model } : {}),
          ...(m.temperature !== undefined ? { temperature: m.temperature } : {}),
          ...(m.effort ? { effort: m.effort } : {}),
          ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
          ...(this.retry !== undefined ? { retry: this.retry } : {}),
        }
      : null;
    this.currentUtterance = utterance;
    try {
      const res = await runPatientTurn({
        caseDef: c,
        locale: this.locale,
        utterance,
        speaker,
        profile,
        state: () => this._state,
        dispatch: (action) => this.dispatchInternal(action, id),
        memory: this.patientMemory[speaker],
        history: this.conversation(speaker),
        llm,
        pipeline: settings.pipeline,
        strictGrounding: settings.strictGrounding,
        offlineFallback: settings.offlineFallback,
        scene: patientLocation(c, this.facility, this.locale),
        ...(signal ? { signal } : {}),
        emit: (msg) => this.emit(id, msg),
        onUsage: (u) => this.trackUsage(id, profile.name, u),
        ...(m.provider
          ? {
              runToolTurn: (system, parts) =>
                runAgentTurn({
                  host: this.loopHost(id),
                  agent: profile,
                  provider: m.provider!,
                  system,
                  history: this.conversation(speaker),
                  userParts: parts,
                  tools: this.toolsFor(profile.name),
                  maxToolRounds: m.maxToolRounds,
                  turnId,
                  emit: (msg) => this.emit(id, msg),
                  ...(signal ? { signal } : {}),
                  streamText: false,
                  request: this.requestOptions(m),
                  ...(this.retry !== undefined ? { retry: this.retry } : {}),
                  onUsage: (u) => this.trackUsage(id, profile.name, u),
                  now: this.now,
                }),
            }
          : {}),
      });
      for (const w of res.warnings) this.emit(id, { type: "warning", message: w });
      if (res.aborted) return { status: "interrupted", text: "", grounded: [] };
      if (res.error) return { status: "error", text: "", grounded: [], error: res.error };
      this.appendMessages(speaker, res.messages);
      if (res.text) {
        this.emit(id, { type: "agent_message_delta", turnId, agent: speaker, delta: res.text });
        const msg = { type: "agent_message" as const, turnId, agent: speaker, speaker: res.speakerName, text: res.text, grounded: res.grounded, grounding: res.grounding, nonverbal: res.nonverbal };
        this.emit(id, msg as EventMsg);
        this.dialogue.push({ who: speaker, speaker: res.speakerName, text: res.text });
      }
      return { status: "end_turn", text: res.text, grounded: res.grounded };
    } finally {
      this.currentUtterance = null;
    }
  }

  private async runModelAgent(id: string, turnId: string, profile: AgentProfile, utterance: string, signal?: AbortSignal, extraContext: readonly string[] = []): Promise<AgentOutcome> {
    const m = this.model(profile.name);
    if (!m.provider) return this.offlineReply(id, turnId, profile, utterance, false);
    await this.maybeAutoCompact(id, profile.name, signal);
    const parts: ChatPart[] = [{ type: "text", text: utterance.trim() || rt(this.locale, "npc.approach") }];
    for (const extra of extraContext) parts.push({ type: "text", text: extra });
    const turn = await runAgentTurn({
      host: this.loopHost(id),
      agent: profile,
      provider: m.provider,
      system: buildSystemSections(profile, this.promptContext()),
      history: this.conversation(profile.name),
      userParts: parts,
      tools: this.toolsFor(profile.name),
      maxToolRounds: m.maxToolRounds,
      turnId,
      emit: (msg) => this.emit(id, msg),
      ...(signal ? { signal } : {}),
      request: this.requestOptions(m),
      ...(this.retry !== undefined ? { retry: this.retry } : {}),
      onAssistantText: (text) => this.emitAgentMessage(id, turnId, profile.name, text, []),
      onUsage: (u) => this.trackUsage(id, profile.name, u),
      now: this.now,
    });
    this.commitTurn(profile.name, turn);
    if (turn.stopReason === "error" && this._settings.patient.offlineFallback && agentKind(profile) !== "clinician" && !signal?.aborted) {
      this.emit(id, { type: "warning", message: rt(this.locale, "warning.offlineFallback", { agent: profile.name, error: turn.error?.message ?? "error" }) });
      return this.offlineReply(id, turnId, profile, utterance, true);
    }
    return { status: turn.stopReason, text: turn.text, grounded: turn.grounded, ...(turn.error ? { error: turn.error } : {}), toolCalls: turn.toolCalls };
  }

  /** Deterministic responder for agents without a model. */
  private offlineReply(id: string, turnId: string, profile: AgentProfile, utterance: string, userAlreadyRecorded: boolean): AgentOutcome {
    const ctx = { caseDef: this.caseDef, locale: this.locale, state: () => this._state };
    const kind = agentKind(profile);
    let text: string;
    switch (kind) {
      case "nurse":
        text = nurseOffline(ctx, utterance);
        break;
      case "radiologist":
      case "pathologist":
        text = consultantOffline(kind, ctx, utterance);
        break;
      case "attending":
        text = attendingOffline(ctx, (action) => this.dispatchInternal(action, id)).text;
        break;
      case "examiner":
        text = examinerOffline(this.caseDef, assess(this.caseDef, this._state), this.locale).narrative;
        break;
      default:
        text = rt(this.locale, "agent.offline.generic", { agent: profile.name });
    }
    const messages: ChatMessage[] = [];
    if (utterance.trim() && !userAlreadyRecorded) messages.push({ role: "user", content: [{ type: "text", text: utterance }] });
    messages.push({ role: "assistant", content: [{ type: "text", text }] });
    this.appendMessages(profile.name, messages);
    this.emit(id, { type: "agent_message_delta", turnId, agent: profile.name, delta: text });
    this.emitAgentMessage(id, turnId, profile.name, text, []);
    return { status: "end_turn", text, grounded: [] };
  }

  /* ---------------------------------------------------------------- */
  /* Autopilot                                                         */
  /* ---------------------------------------------------------------- */

  private runAutopilot(id: string, goal: string | undefined, maxTurns: number | undefined, signal: AbortSignal): Promise<void> {
    return runAutopilot(this.autopilotHost(id), { goal, maxTurns, signal });
  }

  private offlineClinicianBlock(id: string, turnId: string, maxSteps: number, signal?: AbortSignal): Promise<AgentOutcome> {
    return offlineClinicianTurn(this.autopilotHost(id), turnId, maxSteps, signal);
  }

  private autopilotHost(id: string): AutopilotHost {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const session = this;
    return {
      caseDef: this.caseDef,
      get locale() {
        return session.locale;
      },
      state: () => this._state,
      newId: () => this.newId(),
      now: () => this.now(),
      emit: (msg) => this.emit(id, msg),
      ensureStarted: () => this.ensureStarted(id),
      clinicianOnline: () => this.model("clinician").provider !== null,
      clinicianMaxSteps: () => this.model("clinician").maxToolRounds,
      runModelTurn: (turnId, text, signal) => this.runModelAgent(id, turnId, this.profiles.get("clinician")!, text, signal),
      finishTurn: (turnId, outcome, started) => this.finishTurn(id, turnId, "clinician", outcome, started),
      narrate: (turnId, text) => this.emitAgentMessage(id, turnId, "clinician", text, []),
      dispatch: (action) => void this.dispatchInternal(action, id),
      executeTool: (turnId, name, args, signal) =>
        executeToolCall({
          host: this.loopHost(id),
          agent: "clinician",
          tools: this.toolsFor("clinician"),
          call: { id: this.newId(), name, args },
          ctx: this.toolContext("clinician", id, signal),
          emit: (msg) => this.emit(id, msg),
          turnId,
          ...(signal ? { signal } : {}),
          now: this.now,
        }),
      cursor: this.offlineCursor,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Assessment, compaction, configuration, shutdown                   */
  /* ---------------------------------------------------------------- */

  /** Talking to the examiner runs an assessment; the narrative is its reply. */
  private async examinerTurn(id: string, turnId: string, signal?: AbortSignal): Promise<AgentOutcome> {
    const verdict = await this.runAssessment(id, signal ?? new AbortController().signal);
    if (signal?.aborted) return { status: "interrupted", text: "", grounded: [] };
    const text = verdict.narrative ?? "";
    if (text) this.emitAgentMessage(id, turnId, "examiner", text, []);
    return { status: "end_turn", text, grounded: [] };
  }

  private async runAssessment(id: string, signal: AbortSignal): Promise<ExaminerVerdict> {
    const report = assess(this.caseDef, this._state);
    const profile = this.profiles.get("examiner")!;
    const m = this.model("examiner");
    const verdict = await runExaminer({
      caseDef: this.caseDef,
      state: this._state,
      locale: this.locale,
      report,
      dialogue: this.dialogue,
      profile,
      provider: m.provider,
      model: m.model,
      ...(m.effort ? { effort: m.effort } : {}),
      ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
      memory: this.opts.memory ?? null,
      signal,
      emit: (msg) => this.emit(id, msg),
      ...(this.retry !== undefined ? { retry: this.retry } : {}),
      onUsage: (u) => this.trackUsage(id, "examiner", u),
    });
    this.emit(id, { type: "assessment", report, narrative: verdict.narrative, judged: verdict.judged });
    return verdict;
  }

  private async maybeAutoCompact(id: string, agent: AgentRole, signal?: AbortSignal): Promise<void> {
    const cfg = this._settings.autoCompact;
    if (!cfg.enabled) return;
    const history = this.conversations.get(agent);
    if (!history || history.length < 4) return;
    if (estimateTokens(history) <= cfg.thresholdTokens) return;
    await this.compactAgent(id, agent, "auto", signal);
  }

  private async compact(id: string, agent: AgentRole | null, trigger: "manual" | "auto"): Promise<void> {
    const targets = agent ? [agent] : [...this.conversations.keys()];
    for (const name of targets) await this.compactAgent(id, name, trigger);
  }

  private async compactAgent(id: string, agent: AgentRole, trigger: "manual" | "auto", signal?: AbortSignal): Promise<void> {
    const history = this.conversations.get(agent);
    if (!history || history.length < 2) return;
    const hook = await this.runHook({ hook_event_name: "PreCompact", agent, trigger });
    for (const w of hook.warnings) this.emit(id, { type: "warning", message: w });
    if (hook.blocked) {
      this.emit(id, { type: "warning", message: rt(this.locale, "warning.compactBlocked", { agent, reason: hook.reason ?? "" }) });
      return;
    }
    const before = estimateTokens(history);
    const provider = this.profiles.has(agent) ? this.model(agent, false).provider : null;
    const result = await compactConversation({ provider, messages: history, locale: this.locale, ...(signal ? { signal } : {}) });
    if (result.compactedCount === 0) return;
    if (provider && result.deterministic && !signal?.aborted) this.emit(id, { type: "warning", message: rt(this.locale, "warning.compactFallback", { agent }) });
    history.length = 0;
    history.push(...result.messages);
    const [first, ...rest] = result.messages;
    const block = first?.content[0]?.type === "text" ? first.content[0].text : result.summary;
    this.recorder?.record("compacted", { agent, summary: block });
    const tail: ChatMessage[] = [];
    if (first && first.content.length > 1) tail.push({ role: first.role, content: first.content.slice(1) });
    tail.push(...rest);
    for (const m of tail) this.recorder?.record("message", { agent, role: m.role, content: m.content });
    this.emit(id, { type: "compacted", agent, beforeTokens: before, afterTokens: estimateTokens(history) });
  }

  private configure(id: string, rawPatch: RuntimeConfigPatch): void {
    const patch = cleanConfigPatch(rawPatch);
    const next = structuredClone(this._settings);
    const issues: string[] = [];
    const modes: ApprovalMode[] = ["default", "strict", "auto", "plan", "bypass"];
    const scopes: PracticeScope[] = ["history-only", "workup", "full"];
    if (patch.provider !== undefined) {
      next.provider = patch.provider;
      if (patch.model === undefined) next.model = null;
    }
    if (patch.model !== undefined) next.model = patch.model || null;
    if (patch.approvalMode !== undefined) {
      if (modes.includes(patch.approvalMode)) next.approvalMode = patch.approvalMode;
      else issues.push(`approvalMode "${String(patch.approvalMode)}"`);
    }
    if (patch.practiceScope !== undefined) {
      if (scopes.includes(patch.practiceScope)) next.practiceScope = patch.practiceScope;
      else issues.push(`practiceScope "${String(patch.practiceScope)}"`);
    }
    if (patch.locale !== undefined && patch.locale.trim()) next.locale = patch.locale.trim();
    for (const [agent, override] of Object.entries(patch.agents ?? {})) {
      const merged = { ...(next.agents[agent] ?? {}) } as Record<string, unknown>;
      for (const [k, v] of Object.entries(override)) if (v !== undefined) merged[k] = v;
      next.agents[agent] = merged as ResolvedSettings["agents"][string];
    }
    if (patch.interlocutor !== undefined) {
      const target = patch.interlocutor.replace(/^@/, "").toLowerCase();
      if (this.availableAgents().includes(target)) this.interlocutor = target;
      else issues.push(`interlocutor "${patch.interlocutor}"`);
    }
    this._settings = next;
    this.models.clear();
    this.warnedOffline.clear();
    if (issues.length > 0) this.emit(id, { type: "error", message: rt(this.locale, "error.config", { issues: issues.join(", ") }), code: "invalid_config" });
    this.emit(id, { type: "config_changed", patch: cleanConfigPatch(patch) });
  }

  private async shutdownSequence(id: string): Promise<void> {
    if (this.closed) return;
    this.closing = true;
    this.broker.cancelAll(id);
    const hook = await this.runHook({ hook_event_name: "SessionEnd", reason: this._state.finished ? "finished" : "shutdown" });
    for (const w of hook.warnings) this.emit(id, { type: "warning", message: w });
    await this.hookChain;
    this.emit(id, { type: "shutdown_complete" });
    this.closed = true;
    await this.recorder?.flush();
    this.hub.close();
  }

  /* ---------------------------------------------------------------- */
  /* Resume                                                            */
  /* ---------------------------------------------------------------- */

  private restore(resume: NonNullable<SessionOptions["resume"]>): void {
    const replayed = replay(this.caseDef, resume.actions);
    const rejected = new Set(replayed.rejections.map((r) => r.index));
    this._state = replayed.state;
    this.acceptedActions = resume.actions.filter((_, i) => !rejected.has(i));
    for (const [agent, raw] of Object.entries(resume.messages ?? {})) {
      const list: ChatMessage[] = [];
      for (const m of raw ?? []) {
        const msg = m as { role?: unknown; content?: unknown };
        const content = normaliseContent(msg?.content);
        if ((msg?.role === "user" || msg?.role === "assistant") && content) list.push({ role: msg.role, content });
      }
      this.conversations.set(agent, list);
      for (const m of list) {
        const text = m.content.filter((p): p is Extract<ChatPart, { type: "text" }> => p.type === "text").map((p) => p.text).join(" ");
        if (text.trim()) this.dialogue.push(m.role === "user" ? { who: "learner", speaker: "learner", text } : { who: agent, speaker: agent, text });
      }
    }
    for (const speaker of ["patient", "companion"] as const) {
      if ((this.conversations.get(speaker)?.length ?? 0) > 0) this.patientMemory[speaker].approached = true;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Slash-command host                                                */
  /* ---------------------------------------------------------------- */

  private commandHost(id: string, name: string, signal: AbortSignal): CommandHost {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const session = this;
    return {
      caseDef: this.caseDef,
      get settings() {
        return session._settings;
      },
      get locale() {
        return session.locale;
      },
      state: () => this._state,
      plan: () => this.workupPlan(),
      interlocutor: () => this.interlocutor,
      sessionRules: () => this.permissionState.sessionRules,
      agentNames: () => this.availableAgents(),
      commands: () => this.commands(),
      output: (text, data) => this.emit(id, { type: "command_output", name, text, ...(data !== undefined ? { data } : {}) }),
      warn: (message) => this.emit(id, { type: "warning", message }),
      runTool: (toolName, args) => this.runLearnerTool(id, toolName, args, signal),
      learnerAction: (action) => this.learnerAction(id, { ...action, by: action.by ?? "learner" } as ClinicalAction, signal),
      sendMessage: (to, text) => this.sendLearnerMessage(id, (to ?? this.interlocutor).replace(/^@/, "").toLowerCase(), text, signal),
      autopilot: (goal) => this.runAutopilot(id, goal, undefined, signal),
      assess: async () => void (await this.runAssessment(id, signal)),
      compact: (agent) => this.compact(id, agent ?? null, "manual"),
      configure: async (patch) => this.configure(id, patch),
      clearConversations: () => {
        this.conversations.clear();
        this.patientMemory.patient.approached = false;
        this.patientMemory.companion.approached = false;
      },
      snapshot: () => this.snapshot(),
      shutdown: async () => {
        this.closing = true;
        this.enqueue(id, { type: "shutdown" }).catch(() => undefined);
      },
    };
  }

  /** Run a tool as the learner: validation, PreToolUse hooks, the approval gate, then the tool. */
  private async runLearnerTool(id: string, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolOutput> {
    const L = this.locale;
    const tool = this.registry.get(name);
    if (!tool) return { ok: false, output: rt(L, "tool.unknownTool", { tool: name, tools: "-" }) };
    const validated = validateArgs(tool.inputSchema, args);
    if (!validated.ok) return { ok: false, output: rt(L, "tool.invalidArgs", { tool: name, errors: validated.errors.join("; ") }) };
    const input = validated.value as Record<string, unknown>;
    const refused = await this.gateLearnerTool(id, tool, input, signal);
    if (refused) return refused;
    if (!tool.readOnly) this.ensureStarted(id);
    let out: ToolOutput;
    try {
      out = await tool.run(input, this.toolContext("learner", id, signal));
    } catch (err) {
      out = { ok: false, output: rt(L, "tool.failed", { message: err instanceof Error ? err.message : String(err) }) };
    }
    const post = await this.runHook({ hook_event_name: "PostToolUse", agent: "learner", tool_name: name, tool_input: input, tool_response: { ok: out.ok, output: out.output } }, signal);
    for (const w of post.warnings) this.emit(id, { type: "warning", message: w });
    return out;
  }
}

/** Create and start a session (SessionStart hooks, `session_configured`). */
export async function createSession(opts: CreateSessionOptions): Promise<ClinicalSession> {
  const session = new ClinicalSession(opts);
  await session.start();
  return session;
}
