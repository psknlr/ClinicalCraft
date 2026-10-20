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
import { PRIMARY_ACTOR, type ActorId, type EpisodeTrace, type Pose, type WorldActionRequest, type WorldRuntime } from "@clinicalcraft/world";
import { BUILTIN_AGENTS, mergeAgentProfiles } from "../agents/builtin.js";
import { attendingOffline, consultantOffline, examinerOffline, narrateAction, nurseOffline } from "../agents/offline.js";
import { agentKind, buildSystemSections, clockLabel, npcDisplayName, patientLocation, type PromptContext } from "../agents/prompts.js";
import type { AgentProfile, SlashCommand } from "../agents/types.js";
import { BUILTIN_COMMANDS, executeCommand, type CommandHost } from "../commands.js";
import { EMBODIED_COMMANDS } from "../commands-world.js";
import { compactConversation, estimateTokens } from "../compaction.js";
import { emptyHookResult, HookRunner } from "../hooks/runner.js";
import type { HookInput, HookResult } from "../hooks/types.js";
import { addUsage, emptyUsage, executeToolCall, runAgentTurn, type AuthorizeRequest, type GateOutcome, type HookSpec, type LoopHost, type TurnResult } from "../loop.js";
import { actionToolName, callSpecifiers, checkPermission, PermissionState } from "../permissions.js";
import type { AgentEvent, AgentRole, ApprovalMode, EventMsg, Op, PlanItem, PracticeScope, RuntimeConfigPatch, TokenUsage } from "../protocol.js";
import type { RetryPolicy } from "../providers/factory.js";
import type { ChatMessage, ChatPart, ProviderConfig } from "../providers/types.js";
import { DEFAULT_SETTINGS } from "../settings/merge.js";
import { canonicalLocale, type HookEventName, type ResolvedSettings } from "../settings/schema.js";
import { BUILTIN_SKILLS } from "../skills/builtin.js";
import type { SkillToolCall } from "../skills/interpreter.js";
import type { SkillDefinition } from "../skills/schema.js";
import { rejectionText } from "../tools/clinical.js";
import { learnerVitals } from "../tools/format.js";
import { actionIntent, spatialCodeOf, spatialRefusal } from "../tools/spatial.js";
import { ToolRegistry } from "../tools/index.js";
import { isLearnerTool } from "../tools/learner.js";
import type { CallProgress, ToolContext, ToolDefinition, ToolOutput, VitalsView } from "../tools/types.js";
import { validateArgs } from "../tools/validate.js";
import { normaliseContent, redactValue, TranscriptRecorder } from "../transcript.js";
import { actionFromToolInput, actionToolArgs } from "./action-input.js";
import { ApprovalBroker } from "./approvals.js";
import { offlineClinicianTurn, runAutopilot, type AgentOutcome, type AutopilotHost } from "./autopilot.js";
import { EmbodiedSession, mergeSkills, type ClinicalCaller, type EmbodiedHost } from "./embodied.js";
import { embodiedOfflineTurn } from "./embodied-autopilot.js";
import { EventHub } from "./events.js";
import { RESERVED_DIALOGUE_LABEL, runExaminer, runExaminerPrompt, type DialogueEntry, type ExaminerVerdict } from "./examiner.js";
import { rt } from "./i18n.js";
import { resolveAgentModel, type AgentModel } from "./models.js";
import { reactToDomainEvent, type EventReaction } from "./notifications.js";
import { initialAffectIntensity, runPatientTurn, selectFacts, type PatientMemory } from "./patient-pipeline.js";
import { parseLearnerInput, resolveAgentAlias } from "./router.js";
import { emptyTrace } from "./trace.js";
import type { ClinicalSessionApi, SessionOptions, SessionSnapshot, TranscriptItem } from "./types.js";

/** Runtime version stamped into transcripts. */
export const CLINICALCRAFT_VERSION = "5.0.0";

/** How learner text reaches an agent: a message, or a custom slash command's prompt (PROTOCOL §9). */
type AgentTurnMode = "message" | "prompt";

/** Smallest real-time clock step dispatched by `advanceRealTime` (simulated minutes). */
export const REALTIME_MIN_STEP = 0.25;
/** Maximum nesting of agent-to-agent asks (clinician → patient, consultant → …). */
export const MAX_NESTED_ASKS = 3;

/** Options beyond the contract `SessionOptions`. */
export interface CreateSessionOptions extends SessionOptions {
  /** Retry policy for model calls (`false` disables; tests inject fast sleeps). */
  retry?: RetryPolicy | false;
  /** Write a `session_meta` item (default true). */
  writeSessionMeta?: boolean;
  /** Resume: runtime state beyond actions/messages (interlocutor, workup plan, patient/companion affect) — see `resumedRuntimeConfig`. */
  restore?: { interlocutor?: string; plan?: { items: PlanItem[]; explanation: string | null }; affect?: Partial<Record<"patient" | "companion", number>> };
}

const TOP_AGENT_ROLES = new Set(["patient", "companion"]);

/** Valid `approval_response` decisions (ops may arrive as untyped JSON). */
const APPROVAL_DECISIONS: ReadonlySet<string> = new Set(["approved", "approved_for_session", "denied", "abort"]);

/** Ops that start work and are cancelled while still queued by an interrupt or shutdown. */
const CANCELLABLE_OPS: ReadonlySet<Op["type"]> = new Set(["user_message", "clinical_action", "slash_command", "autopilot", "compact", "assess", "world_action", "external_tool_call"]);

/** Longest `external_tool_call` call id / tool name accepted (world bridge). */
const EXTERNAL_CALL_ID_MAX = 200;
const EXTERNAL_TOOL_NAME_MAX = 64;

/** What a tool path call carries beyond the caller (embodied mode): the acting body, the world action, the skill nesting. */
interface ToolPathExtra {
  actorId?: string;
  worldActionId?: string;
  skillDepth?: number;
  /** A nested skill's share of its caller's `CallProgress` (review S1). */
  progress?: CallProgress;
}

/** A valid patient affect intensity (0 calm … 3 most intense). */
function isAffectIntensity(value: unknown): value is PatientMemory["affectIntensity"] {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

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

export { actionFromToolInput, actionToolArgs } from "./action-input.js";

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
  private readonly offlineCursor: AutopilotHost["cursor"] = { value: 0, missed: [] };
  /** Started-but-not-ended turns per agent (a synthetic line turn never idles a running turn of its agent). */
  private readonly openTurns = new Map<string, number>();
  private closing = false;
  private closed = false;
  /** Embodied mode (settings `embodiment: "embodied"`): the encounter's world and everything wired to it; null in clinical mode. */
  private readonly embodied: EmbodiedSession | null;
  /** Built-in + project skills (embodied mode). */
  private readonly skillList: SkillDefinition[];
  /** `world_pose` refusals already reported (once per session in clinical mode). */
  private poseRefused = false;
  /** External agents' tool calls (world bridge) queued or running, by call id: their own cancellation. */
  private readonly externalCalls = new Map<string, { controller: AbortController }>();

  constructor(opts: CreateSessionOptions) {
    this.opts = opts;
    this.caseDef = opts.caseDef;
    this.facility = opts.facility ?? null;
    this.catalogs = opts.catalogs ?? [];
    this._settings = structuredClone(opts.settings);
    // Settings built in code (not through the settings schema) may carry an alias or an unsupported language.
    this._settings.locale = canonicalLocale(this._settings.locale) ?? DEFAULT_SETTINGS.locale;
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
    const disabled = new Set((opts.disabledCommands ?? []).map((n) => n.toLowerCase()));
    this.slash = [...BUILTIN_COMMANDS.filter((c) => !disabled.has(c.name)), ...(opts.commands ?? []).filter((c) => !builtinNames.has(c.name))];
    this.hooks = { on: (event, handler) => this.hookRunner.on(event, handler) };
    const affect = initialAffectIntensity(this.caseDef.patient.persona.affect);
    this.patientMemory = { patient: { approached: false, affectIntensity: affect }, companion: { approached: false, affectIntensity: Math.min(affect, 1) as 0 | 1 } };
    this.ownedFlags = new Set([...this.caseDef.interventions.flatMap((i) => i.setFlags), ...(this.caseDef.physiology?.events ?? []).flatMap((e) => e.setFlags)]);
    for (const p of Object.values(this._settings.providers)) if (p.apiKey) this.secrets.add(p.apiKey);
    this._state = createEngineState(this.caseDef);
    this.skillList = mergeSkills(BUILTIN_SKILLS, opts.skills ?? []);
    // Embodied mode (EMBODIED R3): the session builds the world; the clinical tools are spatially gated, world tools are added.
    this.embodied = this._settings.embodiment === "embodied" ? new EmbodiedSession(this.embodiedHost(), opts.embodied ?? {}) : null;
    if (this.embodied) {
      for (const tool of this.embodied.gatedTools((name) => this.registry.get(name))) this.registry.replace(tool);
      for (const tool of this.embodied.worldTools()) this.registry.replace(tool);
      // Bodies move through the world (its Mover animates them): a front-end's dynamic `walk_to` would bypass it.
      this.registry.remove("walk_to");
      // `/look`, `/go`, `/use`… after the built-in commands (custom commands keep their place after them).
      const disabled = new Set((opts.disabledCommands ?? []).map((n) => n.toLowerCase()));
      const at = this.slash.filter((cmd) => cmd.source === "builtin").length;
      this.slash.splice(at, 0, ...EMBODIED_COMMANDS.filter((cmd) => !disabled.has(cmd.name) && !this.slash.some((x) => x.name === cmd.name)));
    }
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

  /** `clinical` or `embodied` (fixed for the encounter). */
  get embodiment(): "clinical" | "embodied" {
    return this.embodied ? "embodied" : "clinical";
  }

  /** The encounter's world (embodied mode), or null. */
  world(): WorldRuntime | null {
    return this.embodied?.world() ?? null;
  }

  /** The episode trace (empty in clinical mode). */
  trace(): EpisodeTrace {
    return this.embodied?.trace.trace() ?? emptyTrace(this.id, this.caseDef.id, this.facility?.id ?? null);
  }

  /**
   * A registered tool by name — in embodied mode the spatially gated clinical tools and the world tools
   * (front-ends that run tools themselves, e.g. the MCP bridge, use these definitions).
   */
  tool(name: string): ToolDefinition<any> | undefined {
    return this.registry.get(name);
  }

  /** Where the learner's body is (embodied mode; the REPL status line), or null. */
  placeLabel(): string | null {
    return this.embodied?.roomName(PRIMARY_ACTOR, this.locale) ?? null;
  }

  /**
   * The bedside vitals as the learner may see them now (reviews G3/G11) — for front-ends' vitals channels (the
   * MCP state resource, the REPL status line): `learnerVitals` of the snapshot (no ECG morphology); in embodied
   * mode only where the learner's body can see them (`checkSpatial` vitals: the attached monitor's screen, hands
   * at the patient, a records terminal), else nothing and why. Audible alarms are announced regardless.
   */
  vitalsView(): VitalsView {
    return this.embodied ? this.embodied.vitalsView(PRIMARY_ACTOR) : { inView: true, snapshot: learnerVitals(vitalsAt(this.caseDef, this._state)) };
  }

  /** Start-up: restore (resume), SessionStart hooks, session_meta, session_configured. Called by `createSession`. */
  async start(): Promise<void> {
    const resume = this.opts.resume;
    const derivedDialogue = resume ? this.restore(resume) : [];
    const extra = this.opts.restore;
    if (extra?.plan) {
      this.plan = extra.plan.items.map((p) => ({ text: p.text, status: p.status }));
      this.planExplanation = extra.plan.explanation;
    }
    if (extra?.interlocutor) {
      const target = extra.interlocutor.replace(/^@/, "").toLowerCase();
      if (this.availableAgents().includes(target)) this.interlocutor = target;
    }
    for (const speaker of ["patient", "companion"] as const) {
      const intensity = extra?.affect?.[speaker];
      if (isAffectIntensity(intensity)) this.patientMemory[speaker].affectIntensity = intensity;
    }
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
        ...(this.embodied ? { embodiment: "embodied" as const } : {}),
      });
    }
    for (const entry of derivedDialogue) this.recorder?.record("dialogue", { ...entry });
    const hook = await this.runHook({ hook_event_name: "SessionStart", source: resume ? "resume" : "startup" });
    for (const w of hook.warnings) this.emit("", { type: "warning", message: w });
    for (const issue of this.opts.skillIssues ?? []) this.emit("", { type: "warning", message: rt(this.locale, "embodied.skillIssue", { issue }) });
    const untrusted = this.opts.skillsUntrusted;
    if (untrusted && this.embodied) this.emit("", { type: "warning", message: rt(this.locale, "embodied.skillsUntrusted", { files: untrusted.files, dir: untrusted.dir }) });
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
    const tools = this.registry.forAgent(profile, { scope: this._settings.practiceScope, deny: this._settings.permissions.deny, caseDef: this.caseDef });
    // Camera frames only for a model that can look at images (embodied mode with a camera).
    return tools.some((t) => t.name === "get_camera_frame") && !this.visionFor(agent) ? tools.filter((t) => t.name !== "get_camera_frame") : tools;
  }

  /** Can this agent's model look at images (capability `vision`)? */
  private visionFor(agent: AgentRole): boolean {
    const m = this.model(String(agent), false);
    try {
      return !!m.provider && m.provider.capabilities().vision === true;
    } catch {
      return false;
    }
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

  /** Add examiner evidence lines (and record them, so a resume can restore them). */
  private addDialogue(...entries: DialogueEntry[]): void {
    for (const entry of entries) {
      this.dialogue.push(entry);
      this.recorder?.record("dialogue", { ...entry });
    }
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
      ...(this.recorder ? { nextOrdinal: this.recorder.nextOrdinal } : {}),
      dialogue: this.dialogue.map((d) => ({ ...d })),
      ...(this.embodied ? { embodiment: "embodied" as const, world: this.embodied.persistentSnapshot() } : {}),
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
    if (c.clock.mode !== "simulated" || c.clock.realtimeScale <= 0 || !s.started || s.finished || this.closed || this.closing || !(ms > 0)) return null;
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
    if (op?.type === "world_pose") {
      // Sensor data (~10 Hz): applied at once, never queued behind a turn, never transcribed.
      if (!this.closed && !this.closing) this.applyPose(id, op.actorId, op.pose);
      return Promise.resolve();
    }
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
      case "external_tool_cancel": {
        // Out-of-band, like an interrupt — but only this call: queued, it never runs; running, it is aborted.
        const entry = typeof op.callId === "string" ? this.externalCalls.get(op.callId) : undefined;
        entry?.controller.abort();
        return Promise.resolve();
      }
      case "external_tool_call":
        return this.acceptExternalCall(id, op);
      case "shutdown":
        this.closing = true;
        this.interrupt(id);
        return this.enqueue(id, op);
      default:
        return this.enqueue(id, op);
    }
  }

  /** Queue an external agent's tool call (world bridge): validated, one per call id, cancellable on its own. */
  private acceptExternalCall(id: string, op: Extract<Op, { type: "external_tool_call" }>): Promise<void> {
    const L = this.locale;
    const callId = op?.callId;
    const valid =
      typeof callId === "string" &&
      callId.length > 0 &&
      callId.length <= EXTERNAL_CALL_ID_MAX &&
      typeof op.tool === "string" &&
      op.tool.length > 0 &&
      op.tool.length <= EXTERNAL_TOOL_NAME_MAX &&
      (op.args === undefined || (typeof op.args === "object" && op.args !== null && !Array.isArray(op.args)));
    if (!valid) {
      this.emit(id, { type: "error", message: rt(L, "bridge.invalidCall"), code: "invalid_op" });
      return Promise.resolve();
    }
    if (this.externalCalls.has(callId)) {
      this.emit(id, { type: "error", message: rt(L, "bridge.duplicateCall", { callId }), code: "duplicate_call" });
      return Promise.resolve();
    }
    const entry = { controller: new AbortController() };
    this.externalCalls.set(callId, entry);
    return this.enqueue(id, op).finally(() => {
      if (this.externalCalls.get(callId) === entry) this.externalCalls.delete(callId);
    });
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
        case "world_action":
          return void (await this.withTurn(id, (signal) => this.worldAction(id, op.request, signal)));
        case "external_tool_call":
          return await this.withTurn(id, (signal) => this.externalToolCall(id, op, signal));
        case "configure":
          return this.configure(id, op.patch);
        case "compact":
          return await this.withTurn(id, (signal) => this.compact(id, op.agent ?? null, "manual", signal));
        case "assess":
          return void (await this.withTurn(id, (signal) => this.runAssessment(id, signal)));
        case "shutdown":
          return await this.shutdownSequence(id);
        case "interrupt":
        case "approval_response":
        case "dynamic_tool_response":
        case "world_pose":
        case "external_tool_cancel":
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

  /** A learner world action (`world_action` op): the learner's tool path runs any clinical effect. */
  private async worldAction(id: string, request: WorldActionRequest, signal: AbortSignal): Promise<void> {
    if (!this.embodied) {
      this.emit(id, { type: "error", message: rt(this.locale, "embodied.notEmbodied"), code: "not_embodied" });
      return;
    }
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      this.emit(id, { type: "error", message: rt(this.locale, "error.internal", { message: "world_action.request must be an object" }), code: "invalid_op" });
      return;
    }
    await this.embodied.act({ agent: "learner", submission: id, signal }, request, signal);
  }

  /**
   * An external agent's tool call (`external_tool_call`, world bridge — docs/EMBODIED.md §12): the clinician's
   * tool path (`executeToolCall` with the clinician's tools: allow-list, scope, deny rules, hooks, precheck, the
   * approval gate — an ask goes to the learner as an `approval_request`) in a clinician turn of its own. Its
   * outcome ends the turn: `turn_complete` when the tool ran (ok or not), `turn_aborted` `denied` (a rule, a hook
   * or the learner refused) or `interrupted` (cancelled by `external_tool_cancel` or an interrupt).
   */
  private async externalToolCall(id: string, op: Extract<Op, { type: "external_tool_call" }>, turnSignal: AbortSignal): Promise<void> {
    const entry = this.externalCalls.get(op.callId);
    if (!entry || entry.controller.signal.aborted || turnSignal.aborted) {
      this.emit(id, { type: "warning", message: rt(this.locale, "bridge.cancelledBeforeStart", { tool: String(op.tool) }) });
      return;
    }
    // Its caller stopped waiting while it was queued (and was told it timed out): never start it (review S11).
    if (typeof op.deadline === "number" && Number.isFinite(op.deadline) && this.now() >= op.deadline) {
      this.emit(id, { type: "warning", message: rt(this.locale, "bridge.deadlinePassed", { tool: String(op.tool) }) });
      return;
    }
    const signal = entry.controller.signal;
    // An interrupt (the learner's Esc, shutdown) cancels the call too.
    const onInterrupt = () => entry.controller.abort();
    turnSignal.addEventListener("abort", onInterrupt, { once: true });
    const turnId = this.newId();
    const started = this.now();
    this.emit(id, { type: "turn_started", turnId, agent: "clinician" });
    // The bypass guard, checked when the call RUNS (review S4): a call queued before the learner switched to
    // bypass would otherwise act with nothing asking the learner. Only a front-end that opted in is exempt.
    if (this._settings.approvalMode === "bypass" && op.allowBypass !== true) {
      turnSignal.removeEventListener("abort", onInterrupt);
      const output = rt(this.locale, "bridge.bypass");
      this.emit(id, { type: "tool_call_begin", turnId, agent: "clinician", callId: op.callId, tool: op.tool, args: op.args ?? {} });
      this.emit(id, { type: "tool_call_end", turnId, agent: "clinician", callId: op.callId, tool: op.tool, ok: false, output, durationMs: 0 });
      this.finishTurn(id, turnId, "clinician", { status: "denied", text: "", grounded: [] }, started);
      return;
    }
    // A state-changing tool starts the encounter once the gate let it through (as the learner's and MCP's paths do).
    const tools = this.toolsFor("clinician").map((tool): ToolDefinition<any> =>
      tool.readOnly
        ? tool
        : {
            ...tool,
            run: (args: Record<string, unknown>, ctx: ToolContext) => {
              this.ensureStarted(id);
              return tool.run(args, ctx);
            },
          },
    );
    let status: AgentOutcome["status"] = "end_turn";
    try {
      const outcome = await executeToolCall({
        host: this.loopHost(id),
        agent: "clinician",
        tools,
        call: { id: op.callId, name: op.tool, args: op.args ?? {} },
        ctx: this.toolContext("clinician", id, signal),
        emit: (msg) => this.emit(id, msg),
        turnId,
        signal,
        now: this.now,
      });
      if (outcome.status === "denied" || outcome.status === "blocked") status = "denied";
      // A tool that stopped short because the call was cancelled (a walk interrupted mid-way) was cancelled too.
      else if (outcome.status === "cancelled" || outcome.status === "interrupted" || (signal.aborted && outcome.status !== "ok")) status = "interrupted";
    } finally {
      turnSignal.removeEventListener("abort", onInterrupt);
    }
    this.finishTurn(id, turnId, "clinician", { status, text: "", grounded: [] }, started);
  }

  /** A sensor pose (`world_pose` op). */
  private applyPose(id: string, actorId: ActorId, pose: Pose): void {
    if (!this.embodied) {
      if (!this.poseRefused) this.emit(id, { type: "error", message: rt(this.locale, "embodied.notEmbodied"), code: "not_embodied" });
      this.poseRefused = true;
      return;
    }
    this.embodied.updatePose(actorId, pose);
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
    if (msg.type === "turn_started") this.openTurns.set(String(msg.agent), (this.openTurns.get(String(msg.agent)) ?? 0) + 1);
    else if (msg.type === "turn_complete" || msg.type === "turn_aborted") {
      const left = (this.openTurns.get(String(msg.agent)) ?? 0) - 1;
      if (left > 0) this.openTurns.set(String(msg.agent), left);
      else this.openTurns.delete(String(msg.agent));
    }
    this.hub.emit(id, msg);
  }

  /**
   * A line spoken outside any agent turn — ward staff (critical-result call,
   * monitor alarm, scenario announcement) or a button-style authored answer —
   * in its own synthetic turn with a fresh id: turn_started → agent_message →
   * turn_complete → turn_phase idle, so every agent_message belongs to a
   * started turn. The idle phase is skipped while another turn of the same
   * agent is still running (that turn's own end idles it).
   */
  private speakLine(id: string, line: Omit<Extract<EventMsg, { type: "agent_message" }>, "type" | "turnId">): void {
    const turnId = this.newId();
    const started = this.now();
    const agent = line.agent;
    this.emit(id, { type: "turn_started", turnId, agent, synthetic: true });
    this.emit(id, { type: "agent_message", turnId, ...line });
    this.emit(id, { type: "turn_complete", turnId, agent, lastMessage: line.text || null, durationMs: Math.max(0, this.now() - started) });
    if (!this.openTurns.has(String(agent))) this.emit(id, { type: "turn_phase", turnId, agent, phase: "idle" });
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
      embodiment: this.embodiment,
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

  /**
   * Transcript item for one conversation message. Patient/companion messages
   * also carry the speaker's current affect intensity (`affectIntensity`,
   * 0–3) so a resume restores the emotional state (`resumedRuntimeConfig`).
   */
  private recordMessage(agent: AgentRole, m: ChatMessage): void {
    if (!this.recorder) return;
    const payload: Extract<TranscriptItem, { type: "message" }>["payload"] = { agent, role: m.role, content: m.content };
    const speaker = agent === "patient" ? "patient" : agent === "companion" ? "companion" : null;
    if (speaker) {
      const withAffect: typeof payload & { affectIntensity: number } = { ...payload, affectIntensity: this.patientMemory[speaker].affectIntensity };
      this.recorder.record("message", withAffect);
    } else {
      this.recorder.record("message", payload);
    }
  }

  private appendMessages(agent: AgentRole, messages: readonly ChatMessage[]): void {
    const list = this.conversation(agent);
    for (const m of messages) {
      list.push(m);
      this.recordMessage(agent, m);
    }
  }

  /**
   * Persist a finished model turn: append only the messages the turn added.
   * `turn.messages` is the history snapshot taken when the turn started plus
   * those messages, so replacing the list with it would drop staff lines
   * (alarms, scenario announcements) appended to this agent's conversation
   * while the turn ran; appending keeps them, in the transcript's order.
   */
  private commitTurn(agent: AgentRole, turn: TurnResult): void {
    this.appendMessages(agent, turn.appended);
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
      this.embodied?.noteClinicalEvent(this.hub.lastSeq, event);
      this.queueHook({ hook_event_name: "ClinicalEvent", event }, id);
      // A `vitals.alarm` says itself whether its value is an arrest placeholder (`unmeasurable`, set at the minute it fired).
      for (const reaction of reactToDomainEvent(this.caseDef, event, this.locale)) this.react(id, reaction);
    }
    if (accepted) {
      this.emitSnapshot(id);
      if (action.type === "note") {
        // Free text is the author's words, never an engine-verified ACTION line for the examiner.
        const who = !action.by || action.by === "learner" ? "learner" : String(action.by);
        if (action.text.trim()) this.addDialogue({ who, speaker: who, text: `[note] ${action.text}` });
      } else if (action.type !== "ask" && action.type !== "start") {
        const narration = narrateAction(this.caseDef, action, this.locale);
        if (narration) this.addDialogue({ who: "action", speaker: String(action.by ?? "learner"), text: narration });
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
      const companion = this.caseDef.patient.persona.companion;
      const speaker =
        line.speaker === "monitor"
          ? rt(this.locale, "speaker.monitor")
          : line.speaker === "narrator"
            ? rt(this.locale, "speaker.narrator")
            : line.speaker === "patient"
              ? t(this.caseDef.patient.displayName, this.locale)
              : line.speaker === "companion" && companion
                ? t(companion.name, this.locale)
                : npcDisplayName(this.caseDef, this.facility, "nurse", this.locale);
      this.speakLine(id, { agent: line.agent, speaker, text: line.text, grounded: [] });
      this.appendMessages(line.agent, [{ role: "assistant", content: [{ type: "text", text: line.text }] }]);
      this.addDialogue({ who: line.agent, speaker, text: line.text });
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

  /**
   * The retry policy for an agent's model calls: the session's policy, with
   * `providers.<id>.maxRetries` (resolved into the provider config) taking
   * precedence over its `maxRetries`. `false` (no retries) stays false.
   */
  private retryFor(m: AgentModel): RetryPolicy | false | undefined {
    if (this.retry === false) return false;
    const max = m.config?.maxRetries;
    if (max === undefined || max === null) return this.retry;
    return { ...(this.retry ?? {}), maxRetries: max };
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
      ...(this.embodied ? { embodied: { place: this.embodied.roomName(PRIMARY_ACTOR, this.locale), skills: this.skillList.map((sk) => sk.id), vitals: this.embodied.vitalsView(PRIMARY_ACTOR) } } : {}),
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

  private toolContext(agent: AgentRole | "learner", id: string, signal?: AbortSignal, extra: ToolPathExtra & { turnId?: string } = {}): ToolContext {
    const dynamic = this.registry.has("walk_to");
    return {
      ...(extra.actorId ? { actorId: extra.actorId } : {}),
      ...(extra.worldActionId ? { worldActionId: extra.worldActionId } : {}),
      ...(extra.turnId ? { turnId: extra.turnId } : {}),
      ...(extra.skillDepth ? { skillDepth: extra.skillDepth } : {}),
      ...(extra.progress ? { progress: extra.progress } : {}),
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
          this.addDialogue({ who, speaker, text: target === "patient" ? utterance : `@${target} ${utterance}` });
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
        // One rule per thing the call acts on (its canonical name): a composite walk covers exactly its leaves.
        if (check.allowSession) for (const [name] of callSpecifiers(req.tool, req.args as never, req.ctx, specifier)) this.permissionState.addSessionRule(req.tool.name, name ?? null);
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
      const parsed = parseLearnerInput(text, this.availableAgents());
      if (parsed.kind === "command") return this.handleCommand(id, parsed.name, parsed.args);
      target = parsed.to ?? this.interlocutor;
      body = parsed.text;
    } else {
      target = resolveAgentAlias(String(to));
    }
    await this.withTurn(id, (signal) => this.sendLearnerMessage(id, target, body, signal));
  }

  /**
   * Learner text to an agent — typed (`user_message`) or produced by a slash
   * command (`/ask …`, `/consult …`, custom templates): UserPromptSubmit hooks
   * (may block or add context) → start → transcript → the agent's turn.
   */
  private async sendLearnerMessage(id: string, target: string, body: string, signal: AbortSignal, mode: AgentTurnMode = "message"): Promise<void> {
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
      this.addDialogue({ who: "learner", speaker: "learner", text: target === "patient" ? body : `@${target} ${body}` });
    }
    await this.runAgent(id, target, body, signal, hook.additionalContext, mode);
  }

  private async handleCommand(id: string, name: string, args: string): Promise<void> {
    const lower = name.toLowerCase();
    if ((this.opts.disabledCommands ?? []).some((n) => n.toLowerCase() === lower)) {
      this.emit(id, { type: "command_output", name: lower, text: rt(this.locale, "cmd.disabled", { name: lower }) });
      return;
    }
    await this.withTurn(id, (signal) => executeCommand(this.commandHost(id, name, signal), lower, args));
  }

  private async handleClinicalAction(id: string, raw: ClinicalAction, rationale?: string): Promise<ReduceResult | null> {
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (!parsed.success) {
      this.emit(id, { type: "error", message: rt(this.locale, "error.invalidAction", { errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }), code: "invalid_action" });
      return null;
    }
    const action = { ...parsed.data, by: parsed.data.by ?? "learner" } as ClinicalAction;
    if (rationale?.trim()) this.addDialogue({ who: "learner", speaker: "learner", text: `[${action.type}] ${rationale.trim()}` });
    return this.withTurn(id, (signal) => this.learnerAction(id, action, signal));
  }

  /**
   * A learner action through PreToolUse hooks and the approval gate (as its
   * equivalent tool), then the engine. A hook's `updatedInput` is re-validated
   * and mapped back to the action, so the gate, the engine and PostToolUse all
   * see the rewritten input.
   */
  private async learnerAction(id: string, requested: ClinicalAction, signal?: AbortSignal): Promise<ReduceResult | null> {
    const L = this.locale;
    // Flags owned by the simulation (set by interventions / scenario events) drive objectives,
    // rubric items and trend stops: setting or clearing them directly would bypass the
    // approval gate and the practice scope of the action that owns them.
    if (requested.type === "flag" && this.ownedFlags.has(requested.flag)) {
      this.emit(id, { type: "error", message: rt(L, "action.denied", { reason: rt(L, "action.flagOwned", { flag: requested.flag }) }), code: "permission_denied" });
      return null;
    }
    let action = requested;
    const toolName = actionToolName(action);
    const tool = toolName ? this.registry.get(toolName) : undefined;
    let args = tool ? actionToolArgs(this.caseDef, action, L) : null;
    if (tool && args) {
      const pre = await this.learnerPreToolUse(id, tool, args, signal);
      if (!pre.ok) return null;
      if (pre.updated) {
        const mapped = actionFromToolInput(this.caseDef, action, pre.input, L, this._state.phase);
        if (!mapped.ok) {
          this.emit(id, { type: "error", message: rt(L, "action.hookInputUnresolved", { tool: tool.name, detail: mapped.detail }), code: "invalid_action" });
          return null;
        }
        action = mapped.action;
        args = pre.input;
      }
      const early = tool.precheck?.(args, this.toolContext("learner", id, signal));
      if (early) {
        const code = spatialCodeOf(early);
        this.emit(id, code ? { type: "error", message: early.output, code } : { type: "warning", message: early.output });
        return null;
      }
      if (await this.authorizeLearnerTool(id, tool, args, pre.approved, signal)) return null;
    }
    if (!["start", "set-phase", "note", "flag"].includes(action.type)) this.ensureStarted(id);
    // Embodied: the body may have moved while the approval was pending — re-check right before the engine commit.
    const intent = this.embodied && tool ? actionIntent(action) : null;
    if (intent && this.embodied) {
      const check = this.embodied.check(PRIMARY_ACTOR, intent, true);
      if (!check.ok) {
        this.emit(id, { type: "error", message: spatialRefusal(check, L).output, code: check.code });
        return null;
      }
    }
    let result!: ReduceResult;
    const commit = () => (result = this.dispatchInternal(action, id));
    if (intent && this.embodied && tool) {
      await this.embodied.gate().traced!(PRIMARY_ACTOR, tool.name, args ?? {}, async () => (commit(), { ok: !result.rejected, output: "" }));
    } else commit();
    // The action type picks the specific wording (a `set-phase` to an automatic phase is "not switchable", not "locked").
    const rejection = result.rejected ? rt(L, "action.rejected", { code: result.rejected.code, message: rejectionText(L, result.rejected.code, action.type) }) : null;
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

  /**
   * PreToolUse hooks for a learner tool use (direct action or slash command):
   * a block refuses; an `updatedInput` replaces the input after validation
   * against the tool's schema (as for model tool calls in `executeToolCall`).
   */
  private async learnerPreToolUse(
    id: string,
    tool: ToolDefinition<any>,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ ok: true; input: Record<string, unknown>; updated: boolean; approved: boolean } | { ok: false; refusal: ToolOutput }> {
    const L = this.locale;
    const pre = await this.runHook({ hook_event_name: "PreToolUse", agent: "learner", tool_name: tool.name, tool_input: args }, signal);
    for (const w of pre.warnings) this.emit(id, { type: "warning", message: w });
    if (pre.blocked) {
      const message = rt(L, "action.denied", { reason: pre.reason ?? "" });
      this.emit(id, { type: "error", message, code: "permission_denied" });
      return { ok: false, refusal: { ok: false, output: message } };
    }
    if (pre.updatedInput === undefined) return { ok: true, input: args, updated: false, approved: pre.approved };
    const validated = validateArgs(tool.inputSchema, pre.updatedInput);
    if (!validated.ok) {
      const message = rt(L, "action.hookInputInvalid", { tool: tool.name, errors: validated.errors.join("; ") });
      this.emit(id, { type: "error", message, code: "invalid_action" });
      return { ok: false, refusal: { ok: false, output: message } };
    }
    return { ok: true, input: validated.value as Record<string, unknown>, updated: true, approved: pre.approved };
  }

  /** The approval gate for a learner tool use; returns a refusal output or null when allowed. */
  private async authorizeLearnerTool(id: string, tool: ToolDefinition<any>, args: Record<string, unknown>, hookApproved: boolean, signal?: AbortSignal): Promise<ToolOutput | null> {
    return (await this.authorizeLearnerToolDetailed(id, tool, args, hookApproved, signal))?.refusal ?? null;
  }

  /** `authorizeLearnerTool` with the kind of refusal (a denial, or an abort that cancels the call). */
  private async authorizeLearnerToolDetailed(
    id: string,
    tool: ToolDefinition<any>,
    args: Record<string, unknown>,
    hookApproved: boolean,
    signal?: AbortSignal,
    ctx: ToolContext = this.toolContext("learner", id, signal),
  ): Promise<{ refusal: ToolOutput; status: "denied" | "cancelled" } | null> {
    const L = this.locale;
    const gate = await this.authorize(id, { agent: "learner", tool, args, ctx, hookApproved, ...(signal ? { signal } : {}) });
    if (gate.kind === "deny") {
      const message = rt(L, "action.denied", { reason: gate.reason || gate.ruleId });
      this.emit(id, { type: "error", message, code: "permission_denied" });
      return { refusal: { ok: false, output: message }, status: "denied" };
    }
    if (gate.kind === "abort") {
      const message = rt(L, "action.cancelled");
      this.emit(id, { type: "warning", message });
      return { refusal: { ok: false, output: message }, status: "cancelled" };
    }
    return null;
  }

  /** Button-style ask: the patient (or companion) speaks the authored answer. */
  private speakAuthoredAnswer(id: string, itemId: string): void {
    const c = this.caseDef;
    const item = c.history.find((h) => h.id === itemId);
    if (!item) return;
    const companion = c.patient.persona.companion;
    const agent = companion?.answersHistory && item.speaker !== "patient" ? "companion" : "patient";
    const speaker = agent === "companion" && companion ? t(companion.name, this.locale) : t(c.patient.displayName, this.locale);
    const question = t(item.question, this.locale);
    const text = t(item.answer, this.locale);
    this.patientMemory[agent].approached = true;
    this.appendMessages(agent, [
      { role: "user", content: [{ type: "text", text: question }] },
      { role: "assistant", content: [{ type: "text", text }] },
    ]);
    this.addDialogue({ who: "learner", speaker: "learner", text: question }, { who: agent, speaker, text });
    this.speakLine(id, { agent, speaker, text, grounded: [itemId] });
  }

  /* ---------------------------------------------------------------- */
  /* Agents                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Run one agent turn (also used for nested asks from tools). `mode`
   * "prompt" (custom slash commands): the examiner answers the text instead
   * of running an assessment; every other agent takes it as a message.
   */
  private async runAgent(
    id: string,
    name: string,
    utterance: string,
    signal?: AbortSignal,
    extraContext: readonly string[] = [],
    mode: AgentTurnMode = "message",
  ): Promise<{ text: string; grounded: string[] }> {
    const turnId = this.newId();
    const started = this.now();
    // Staff speak under their case/facility name: say it now, before the first streamed text.
    const speaker = TOP_AGENT_ROLES.has(name) ? null : npcDisplayName(this.caseDef, this.facility, name, this.locale);
    this.emit(id, { type: "turn_started", turnId, agent: name, ...(speaker && speaker !== name ? { speaker } : {}) });
    let outcome: AgentOutcome;
    try {
      const profile = this.profiles.get(name);
      if (!profile) {
        outcome = { status: "error", text: "", grounded: [], error: { message: rt(this.locale, "warning.unknownAgent", { agent: name }) } };
      } else {
        const kind = agentKind(profile);
        if (kind === "patient" || kind === "companion") outcome = await this.runPatientAgent(id, turnId, kind, utterance, signal);
        else if (kind === "examiner") outcome = mode === "prompt" ? await this.examinerPromptTurn(id, turnId, profile, utterance, signal) : await this.examinerTurn(id, turnId, signal);
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

  private emitAgentMessage(id: string, turnId: string, agent: AgentRole, text: string, grounded: string[]): void {
    const speaker = TOP_AGENT_ROLES.has(agent) ? agent : npcDisplayName(this.caseDef, this.facility, agent, this.locale);
    this.emit(id, { type: "agent_message", turnId, agent, speaker, text, grounded });
    this.addDialogue({ who: agent, speaker, text });
  }

  private async runPatientAgent(id: string, turnId: string, target: "patient" | "companion", utterance: string, signal?: AbortSignal): Promise<AgentOutcome> {
    const c = this.caseDef;
    const companion = c.patient.persona.companion;
    if (target === "companion" && !companion) {
      this.emit(id, { type: "warning", message: rt(this.locale, "warning.noCompanion") });
      return { status: "end_turn", text: "", grounded: [] };
    }
    let speaker: "patient" | "companion" = target;
    if (speaker === "patient" && utterance.trim() && companion?.answersHistory) {
      // The companion answers history — except items authored as the patient's own words (`speaker: "patient"`).
      const selected = selectFacts(c, this._state, utterance, this.locale).selected;
      const own = selected.length > 0 && selected.every((id) => c.history.find((h) => h.id === id)?.speaker === "patient");
      if (!own) speaker = "companion";
    }
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
          ...retryOption(this.retryFor(m)),
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
                  ...retryOption(this.retryFor(m)),
                  onUsage: (u) => this.trackUsage(id, profile.name, u),
                  now: this.now,
                }),
            }
          : {}),
      });
      for (const w of res.warnings) this.emit(id, { type: "warning", message: w });
      if (res.diagnostics?.length) this.recorder?.record("diagnostic", { agent: speaker, source: "grounding", detail: res.diagnostics });
      if (res.aborted) return { status: "interrupted", text: "", grounded: [] };
      if (res.error) return { status: "error", text: "", grounded: [], error: res.error };
      this.appendMessages(speaker, res.messages);
      if (res.text) {
        this.emit(id, { type: "agent_message_delta", turnId, agent: speaker, delta: res.text });
        this.emit(id, { type: "agent_message", turnId, agent: speaker, speaker: res.speakerName, text: res.text, grounded: res.grounded, grounding: res.grounding, nonverbal: res.nonverbal });
        this.addDialogue({ who: speaker, speaker: res.speakerName, text: res.text });
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
      ...retryOption(this.retryFor(m)),
      onAssistantText: (text) => this.emitAgentMessage(id, turnId, profile.name, text, []),
      onUsage: (u) => this.trackUsage(id, profile.name, u),
      now: this.now,
    });
    this.commitTurn(profile.name, turn);
    const fallback = this._settings.patient.offlineFallback && agentKind(profile) !== "clinician" && !signal?.aborted;
    if (turn.stopReason === "error" && fallback) {
      this.emit(id, { type: "warning", message: rt(this.locale, "warning.offlineFallback", { agent: profile.name, error: turn.error?.message ?? "error" }) });
      return this.offlineReply(id, turnId, profile, utterance, true);
    }
    // A refusal with nothing said (the loop already warned): the deterministic responder answers, as for an error.
    if (turn.stopReason === "refusal" && !turn.text.trim() && fallback) {
      this.emit(id, { type: "warning", message: rt(this.locale, "warning.refusalFallback", { agent: profile.name }) });
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
        text = attendingOffline(ctx, (action) => this.dispatchInternal(action, id), utterance).text;
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
    const host = this.autopilotHost(id);
    return host.offlineTurn ? host.offlineTurn(turnId, maxSteps, signal) : offlineClinicianTurn(host, turnId, maxSteps, signal);
  }

  private autopilotHost(id: string, embodied = true): AutopilotHost {
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
      ...(this.embodied && embodied
        ? {
            offlineTurn: (turnId: string, maxSteps: number, signal?: AbortSignal) => {
              const e = this.embodied!;
              return embodiedOfflineTurn(this.autopilotHost(id, false), {
                world: () => e.world(),
                trace: e.trace,
                act: (request, turn, sig) => e.act({ agent: "clinician", submission: id, turnId: turn, ...(sig ? { signal: sig } : {}) }, request, sig),
                patientId: () => e.patientId(),
                patientMonitorId: () => e.patientMonitorId(),
              }, turnId, maxSteps, signal);
            },
          }
        : {}),
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

  /**
   * A prompt addressed to the examiner (custom slash command): its model
   * answers it from the transcript (`runExaminerPrompt`; the debrief only
   * after `finish`). Without a model it says a language model is needed
   * (front-ends normally refuse earlier: `ignoresPromptsOffline`).
   */
  private async examinerPromptTurn(id: string, turnId: string, profile: AgentProfile, prompt: string, signal?: AbortSignal): Promise<AgentOutcome> {
    const m = this.model(profile.name);
    if (!m.provider) {
      const text = rt(this.locale, "agent.examiner.promptNeedsModel", { agent: profile.name });
      this.emitAgentMessage(id, turnId, profile.name, text, []);
      return { status: "end_turn", text, grounded: [] };
    }
    const res = await runExaminerPrompt({
      caseDef: this.caseDef,
      state: this._state,
      locale: this.locale,
      dialogue: this.dialogue,
      profile,
      provider: m.provider,
      model: m.model,
      prompt,
      ...(m.effort ? { effort: m.effort } : {}),
      ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
      memory: this.opts.memory ?? null,
      ...(signal ? { signal } : {}),
      emit: (msg) => this.emit(id, msg),
      ...retryOption(this.retryFor(m)),
      onUsage: (u) => this.trackUsage(id, profile.name, u),
    });
    if (res.aborted || signal?.aborted) return { status: "interrupted", text: "", grounded: [] };
    if (res.error) return { status: "error", text: "", grounded: [], error: res.error };
    const text = res.text.trim();
    if (text) this.emitAgentMessage(id, turnId, profile.name, text, []);
    return { status: res.stopReason === "refusal" || res.stopReason === "max_tokens" ? res.stopReason : "end_turn", text, grounded: [] };
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
      ...retryOption(this.retryFor(m)),
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

  private async compact(id: string, agent: AgentRole | null, trigger: "manual" | "auto", signal?: AbortSignal): Promise<void> {
    const targets = agent ? [agent] : [...this.conversations.keys()];
    for (const name of targets) {
      if (signal?.aborted) return;
      await this.compactAgent(id, name, trigger, signal);
    }
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
    for (const m of tail) this.recordMessage(agent, m);
    this.emit(id, { type: "compacted", agent, beforeTokens: before, afterTokens: estimateTokens(history) });
  }

  private configure(id: string, rawPatch: RuntimeConfigPatch): void {
    const patch = cleanConfigPatch(rawPatch);
    const next = structuredClone(this._settings);
    const issues: string[] = [];
    // Fixed for an encounter (EMBODIED R3): a patch that would change it is refused.
    if (rawPatch?.embodiment !== undefined && rawPatch.embodiment !== this.embodiment) issues.push(rt(this.locale, "embodied.fixed", { mode: this.embodiment }));
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
    if (patch.locale !== undefined && patch.locale.trim()) {
      // Only a supported language ("zh", "en-US"… normalised); anything else is reported and ignored.
      const locale = canonicalLocale(patch.locale);
      if (locale) next.locale = patch.locale = locale;
      else {
        issues.push(`locale "${patch.locale}"`);
        delete patch.locale;
      }
    }
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
    this.embodied?.setLocale(this._settings.locale);
    if (issues.length > 0) this.emit(id, { type: "error", message: rt(this.locale, "error.config", { issues: issues.join(", ") }), code: "invalid_config" });
    this.emit(id, { type: "config_changed", patch: cleanConfigPatch(patch) });
  }

  private async shutdownSequence(id: string): Promise<void> {
    if (this.closed) return;
    this.closing = true;
    this.broker.cancelAll(id);
    // SessionEnd is the last hook: let queued ClinicalEvent/Notification hooks finish first.
    await this.hookChain;
    const hook = await this.runHook({ hook_event_name: "SessionEnd", reason: this._state.finished ? "finished" : "shutdown" });
    for (const w of hook.warnings) this.emit(id, { type: "warning", message: w });
    await this.hookChain;
    this.embodied?.flush();
    this.emit(id, { type: "shutdown_complete" });
    this.closed = true;
    await this.recorder?.flush();
    this.hub.close();
  }

  /* ---------------------------------------------------------------- */
  /* Resume                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Recorded dialogue entries a resume may keep (a transcript file or a web
   * snapshot is not trusted to say what the engine did): `who` must be the
   * learner, an engine actor or one of this session's agents; an `ACTION`
   * line must be the narration (in either locale) of the next accepted
   * replayed action — anything else, such as an "ACTION: Explained the
   * diagnosis…" line no action produced, is dropped.
   */
  private trustedDialogue(entries: readonly unknown[]): DialogueEntry[] {
    // Engine actors are recorded with speaker === who; agents with their display name.
    const actors = new Set<string>(["learner", "agent", "system", "replay"]);
    const people = new Set<string>([...actors, ...this.profiles.keys()]);
    const narrations = this.acceptedActions
      .filter((a) => a.type !== "ask" && a.type !== "start" && a.type !== "note")
      .map((a) => new Set((["en", "zh-CN"] as const).map((l) => narrateAction(this.caseDef, a, l)).filter((x): x is string => !!x)));
    let next = 0;
    const kept: DialogueEntry[] = [];
    for (const raw of entries) {
      const d = raw as Partial<DialogueEntry> | null;
      if (!d || typeof d.who !== "string" || typeof d.speaker !== "string" || typeof d.text !== "string") continue;
      if (d.who === "action") {
        const at = narrations.findIndex((set, i) => i >= next && set.has(d.text!));
        if (at < 0) continue;
        next = at + 1;
      } else if (!people.has(d.who)) continue;
      // A speaker label the examiner reads as another role ("ACTION (system): …") is not kept.
      else if (actors.has(d.who) ? d.speaker !== d.who : RESERVED_DIALOGUE_LABEL.test(d.speaker)) continue;
      kept.push({ who: d.who, speaker: d.speaker, text: d.text });
    }
    return kept;
  }

  /**
   * Restore a resumed session. Returns dialogue lines rebuilt for a transcript
   * that predates `dialogue` items (recorded by `start` after `session_meta`).
   */
  private restore(resume: NonNullable<SessionOptions["resume"]>): DialogueEntry[] {
    const replayed = replay(this.caseDef, resume.actions);
    const rejected = new Set(replayed.rejections.map((r) => r.index));
    this._state = replayed.state;
    this.acceptedActions = resume.actions.filter((_, i) => !rejected.has(i));
    const recorded = this.trustedDialogue(resume.dialogue ?? []);
    // Already in the transcript (or the snapshot): restored, not re-recorded.
    this.dialogue.push(...recorded);
    const derived: DialogueEntry[] = [];
    for (const [agent, raw] of Object.entries(resume.messages ?? {})) {
      const list: ChatMessage[] = [];
      for (const m of raw ?? []) {
        const msg = m as { role?: unknown; content?: unknown };
        const content = normaliseContent(msg?.content);
        if ((msg?.role === "user" || msg?.role === "assistant") && content) list.push({ role: msg.role, content });
      }
      this.conversations.set(agent, list);
      if (recorded.length > 0) continue;
      for (const m of list) {
        const text = m.content.filter((p): p is Extract<ChatPart, { type: "text" }> => p.type === "text").map((p) => p.text).join(" ");
        if (text.trim()) derived.push(m.role === "user" ? { who: "learner", speaker: "learner", text } : { who: agent, speaker: agent, text });
      }
    }
    if (recorded.length === 0) {
      // A transcript from before dialogue items: the accepted actions' ACTION lines and notes (order within them kept).
      for (const action of this.acceptedActions) {
        if (action.type === "note") {
          const who = !action.by || action.by === "learner" ? "learner" : String(action.by);
          if (action.text.trim()) derived.push({ who, speaker: who, text: `[note] ${action.text}` });
        } else if (action.type !== "ask" && action.type !== "start") {
          const narration = narrateAction(this.caseDef, action, this.locale);
          if (narration) derived.push({ who: "action", speaker: String(action.by ?? "learner"), text: narration });
        }
      }
    }
    this.dialogue.push(...derived);
    for (const speaker of ["patient", "companion"] as const) {
      if ((this.conversations.get(speaker)?.length ?? 0) > 0) this.patientMemory[speaker].approached = true;
    }
    return derived;
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
      resolvedModel: () => {
        if (this._settings.provider === "offline") return "deterministic";
        const m = this.model("patient", false);
        return m.model ?? m.config?.model ?? this._settings.model ?? null;
      },
      runTool: (toolName, args) => this.runLearnerTool(id, toolName, args, signal),
      learnerAction: (action) => this.learnerAction(id, { ...action, by: action.by ?? "learner" } as ClinicalAction, signal),
      sendMessage: (to, text) => this.sendLearnerMessage(id, (to ?? this.interlocutor).replace(/^@/, "").toLowerCase(), text, signal),
      promptAgent: (to, text) => this.sendLearnerMessage(id, resolveAgentAlias((to ?? this.interlocutor).replace(/^@/, "").toLowerCase()), text, signal, "prompt"),
      ignoresPromptsOffline: (agent) => {
        const profile = this.profiles.get(resolveAgentAlias(agent));
        if (!profile || this.model(profile.name).provider) return false;
        const kind = agentKind(profile);
        return kind === "examiner" || kind === "attending";
      },
      autopilot: (goal) => this.runAutopilot(id, goal, undefined, signal),
      assess: async () => void (await this.runAssessment(id, signal)),
      compact: (agent) => this.compact(id, agent ?? null, "manual", signal),
      configure: async (patch) => this.configure(id, patch),
      clearConversations: () => {
        // Persisted as an empty compaction per agent, so a resume does not resurrect them.
        for (const agent of this.conversations.keys()) this.recorder?.record("compacted", { agent, summary: "" });
        this.conversations.clear();
        this.patientMemory.patient.approached = false;
        this.patientMemory.companion.approached = false;
      },
      snapshot: () => this.snapshot(),
      embodied: () => this.embodied !== null,
      skills: () => this.skillList.map((sk) => ({ id: sk.id, name: t(sk.name, this.locale) })),
      shutdown: async () => {
        this.closing = true;
        this.enqueue(id, { type: "shutdown" }).catch(() => undefined);
      },
    };
  }

  /** Run a tool as the learner (slash commands): validation, PreToolUse hooks (`updatedInput` re-validated), the approval gate, the tool, PostToolUse. */
  private async runLearnerTool(id: string, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolOutput> {
    return (await this.runLearnerToolDetailed(id, name, args, signal)).output;
  }

  /**
   * `runLearnerTool` with the tool path's status (ok, error, invalid, blocked, denied, cancelled) — and, in
   * embodied mode, the acting body and the world action carrying the call out (`extra`).
   */
  private async runLearnerToolDetailed(id: string, name: string, args: Record<string, unknown>, signal?: AbortSignal, extra: ToolPathExtra = {}): Promise<{ output: ToolOutput; status: string }> {
    const L = this.locale;
    // Only the learner's tools — never an NPC's (reveal_facts, get_progress…) or a front-end's (review S2).
    if (!isLearnerTool(name)) return { output: { ok: false, output: rt(L, "tool.notLearnerTool", { tool: name }), data: { code: "NOT_A_LEARNER_TOOL" } }, status: "invalid" };
    const tool = this.registry.get(name);
    if (!tool) return { output: { ok: false, output: rt(L, "tool.unknownTool", { tool: name, tools: "-" }) }, status: "invalid" };
    const validated = validateArgs(tool.inputSchema, args);
    if (!validated.ok) return { output: { ok: false, output: rt(L, "tool.invalidArgs", { tool: name, errors: validated.errors.join("; ") }) }, status: "invalid" };
    const pre = await this.learnerPreToolUse(id, tool, validated.value as Record<string, unknown>, signal);
    if (!pre.ok) return { output: pre.refusal, status: "blocked" };
    const input = pre.input;
    const ctx = () => this.toolContext("learner", id, signal, extra);
    // Refused before the gate (no approval prompt for a call that cannot run, e.g. a locked decision).
    const early = tool.precheck?.(input, ctx());
    if (early) return { output: early, status: "error" };
    const refused = await this.authorizeLearnerToolDetailed(id, tool, input, pre.approved, signal, ctx());
    if (refused) return { output: refused.refusal, status: refused.status };
    if (!tool.readOnly) this.ensureStarted(id);
    let out: ToolOutput;
    try {
      out = await tool.run(input, ctx());
    } catch (err) {
      out = { ok: false, output: rt(L, "tool.failed", { message: err instanceof Error ? err.message : String(err) }) };
    }
    const post = await this.runHook({ hook_event_name: "PostToolUse", agent: "learner", tool_name: name, tool_input: input, tool_response: { ok: out.ok, output: out.output } }, signal);
    for (const w of post.warnings) this.emit(id, { type: "warning", message: w });
    return { output: out, status: out.ok ? "ok" : "error" };
  }

  /**
   * Run a tool through a caller's tool path with an acting body (embodied mode: world operations' clinical
   * effects, skill steps, delegated staff): the learner's (`runLearnerTool`) or a model agent's
   * (`executeToolCall` with its allow-list, hooks and approval gate). Never a shortcut.
   */
  private async runToolAs(caller: ClinicalCaller, tool: string, args: Record<string, unknown>, extra: ToolPathExtra & { actorId: ActorId }): Promise<SkillToolCall> {
    const id = caller.submission ?? this.currentSubmission;
    const signal = caller.signal ?? this.active?.controller.signal;
    // A skill or delegated step is a learner tool whoever the caller is (review S2): checked before anything else.
    if (!isLearnerTool(tool)) return { ok: false, output: { ok: false, output: rt(this.locale, "tool.notLearnerTool", { tool }), data: { code: "NOT_A_LEARNER_TOOL" } }, status: "invalid" };
    if (caller.agent === "learner") {
      const r = await this.runLearnerToolDetailed(id, tool, args, signal, extra);
      return { ok: r.output.ok && r.status === "ok", output: r.output, status: r.status };
    }
    const agent = String(caller.agent);
    const turnId = caller.turnId ?? this.newId();
    const outcome = await executeToolCall({
      host: this.loopHost(id),
      agent,
      tools: this.toolsFor(agent),
      call: { id: this.newId(), name: tool, args },
      ctx: this.toolContext(agent, id, signal, { ...extra, turnId }),
      emit: (msg) => this.emit(id, msg),
      turnId,
      ...(signal ? { signal } : {}),
      now: this.now,
    });
    return { ok: outcome.status === "ok" && outcome.output.ok, output: outcome.output, status: outcome.status };
  }

  /** What the embodied mode needs from this session. */
  private embodiedHost(): EmbodiedHost {
    return {
      sessionId: this.id,
      caseDef: this.caseDef,
      facility: this.facility,
      catalogs: this.catalogs,
      locale: () => this.locale,
      state: () => this._state,
      settings: () => this._settings,
      now: () => this.now(),
      newId: () => this.newId(),
      dispatch: (action) => this.dispatchInternal(action, this.currentSubmission),
      runTool: (caller, tool, args, extra) => this.runToolAs(caller, tool, args, extra),
      tool: (name) => this.registry.get(name),
      emit: (msg, submission) => this.emit(submission ?? this.currentSubmission, msg),
      recordWorld: (snapshot) => void this.recorder?.record("world", { snapshot }),
      clockText: () => clockLabel(this.caseDef, this._state.clock, this.locale),
      skills: () => this.skillList,
    };
  }
}

/** `{retry}` for a request when a policy is set (spread into the call's options). */
function retryOption(policy: RetryPolicy | false | undefined): { retry?: RetryPolicy | false } {
  return policy !== undefined ? { retry: policy } : {};
}

/** Create and start a session (SessionStart hooks, `session_configured`). */
export async function createSession(opts: CreateSessionOptions): Promise<ClinicalSession> {
  const session = new ClinicalSession(opts);
  await session.start();
  return session;
}
