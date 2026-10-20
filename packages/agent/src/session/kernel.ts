/**
 * SessionKernel — the state of one `ClinicalSession` and its primitive operations: the event stream (with the
 * bookkeeping of open turns), hooks, the engine dispatch and its reactions, the workup plan. `session.ts` is the
 * public facade over it; the session's other parts take the kernel and reach each other through it (none of
 * them is exported by the package):
 *
 * - `op-dispatch.ts` — the submission queue: ops accepted, queued, cancelled and processed; `configure`, shutdown;
 * - `learner.ts` — the learner's input and tool path: messages, slash commands, clinical actions, tools;
 * - `agent-turns.ts` — agent turns: the patient pipeline, model agents, offline responders, the examiner, the autopilot;
 * - `tool-path.ts` — the `ToolContext` and `LoopHost` behind every agent's tool calls; `approval-gate.ts` — the gate;
 * - `agent-models.ts` — each agent's resolved model, its retry policy and request options, token usage;
 * - `conversations.ts` — the agents' conversations, the examiner's dialogue and compaction, as transcribed;
 * - `external-calls.ts` — an external agent's tool calls (world bridge);
 * - `embodied-wiring.ts` — what embodied mode needs of the session (`EmbodiedHost`, a caller's tool path);
 * - `resume.ts` — snapshots, and restoring a resumed session.
 */
import {
  createSession as createEngineState,
  currentWaypoint,
  progress,
  reduce,
  t,
  vitalsAt,
  type CaseDefinition,
  type ClinicalAction,
  type EquipmentCatalog,
  type FacilityDefinition,
  type ReduceResult,
  type SessionState,
} from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { BUILTIN_AGENTS, mergeAgentProfiles } from "../agents/builtin.js";
import { narrateAction } from "../agents/offline.js";
import { npcDisplayName, type PromptContext } from "../agents/prompts.js";
import type { AgentProfile, SlashCommand } from "../agents/types.js";
import { BUILTIN_COMMANDS } from "../commands.js";
import { EMBODIED_COMMANDS } from "../commands-world.js";
import { emptyHookResult, HookRunner } from "../hooks/runner.js";
import type { HookInput, HookResult } from "../hooks/types.js";
import type { HookSpec } from "../loop.js";
import type { AgentRole, EventMsg, PlanItem } from "../protocol.js";
import { DEFAULT_SETTINGS } from "../settings/merge.js";
import { canonicalLocale, type ResolvedSettings } from "../settings/schema.js";
import { BUILTIN_SKILLS } from "../skills/builtin.js";
import type { SkillDefinition } from "../skills/schema.js";
import { ToolRegistry } from "../tools/index.js";
import type { ToolDefinition } from "../tools/types.js";
import { redactValue, TranscriptRecorder } from "../transcript.js";
import { AgentModels } from "./agent-models.js";
import { AgentTurns } from "./agent-turns.js";
import { ApprovalGate } from "./approval-gate.js";
import type { AutopilotHost } from "./autopilot.js";
import { ConversationLog } from "./conversations.js";
import { EmbodiedSession, mergeSkills } from "./embodied.js";
import { embodiedHost } from "./embodied-wiring.js";
import { EventHub } from "./events.js";
import { ExternalCalls } from "./external-calls.js";
import { rt } from "./i18n.js";
import { LearnerPath } from "./learner.js";
import { reactToDomainEvent, type EventReaction } from "./notifications.js";
import { OpDispatcher } from "./op-dispatch.js";
import { initialAffectIntensity, type PatientMemory } from "./patient-pipeline.js";
import type { CreateSessionOptions } from "./session.js";
import { ToolPath } from "./tool-path.js";

/** A session-unique id: a random UUID where the platform has one. */
function defaultNewId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The state of one session and its primitive operations (see the module docs). */
export class SessionKernel {
  readonly id: string;
  readonly caseDef: CaseDefinition;
  readonly facility: FacilityDefinition | null;
  readonly catalogs: EquipmentCatalog[];
  readonly opts: CreateSessionOptions;
  readonly now: () => number;
  readonly newId: () => string;
  readonly recorder: TranscriptRecorder | null;
  readonly hub: EventHub;
  readonly hookRunner = new HookRunner();
  readonly registry: ToolRegistry;
  readonly profiles: Map<string, AgentProfile>;
  /** Slash commands: the built-ins this front-end supports, then custom ones (embodied commands after the built-ins). */
  readonly slash: SlashCommand[];
  readonly patientMemory: Record<"patient" | "companion", PatientMemory>;
  /** Flags set by the case's interventions and scenario events (never settable by the learner directly). */
  readonly ownedFlags: ReadonlySet<string>;
  /** Context added by SessionStart hooks (every agent's prompt carries it). */
  readonly sessionContext: string[] = [];
  readonly createdAt: number;
  /** Credentials known to the session (resolved provider keys), masked in every transcript item. */
  readonly secrets = new Set<string>();
  /** Position in the offline walkthrough (persists across autopilot runs). */
  readonly offlineCursor: AutopilotHost["cursor"] = { value: 0, missed: [] };
  /** Built-in + project skills (embodied mode). */
  readonly skillList: SkillDefinition[];
  /** Embodied mode (settings `embodiment: "embodied"`): the encounter's world and everything wired to it; null in clinical mode. */
  readonly embodied: EmbodiedSession | null;

  settings: ResolvedSettings;
  /** The engine state (core `reduce`). */
  state: SessionState;
  acceptedActions: ClinicalAction[] = [];
  plan: PlanItem[] = [];
  planExplanation: string | null = null;
  interlocutor: AgentRole = "patient";
  /** The submission being processed ("" outside any): where events of code without a submission of its own go. */
  currentSubmission = "";
  /** What the learner said to the NPC whose turn is running (NPC tools read it). */
  currentUtterance: string | null = null;
  closing = false;
  closed = false;

  readonly conversations: ConversationLog;
  readonly models: AgentModels;
  readonly gate: ApprovalGate;
  readonly tools: ToolPath;
  readonly agents: AgentTurns;
  readonly learner: LearnerPath;
  readonly external: ExternalCalls;
  readonly ops: OpDispatcher;

  private hookChain: Promise<void> = Promise.resolve();
  /** Started-but-not-ended turns per agent (a synthetic line turn never idles a running turn of its agent). */
  private readonly openTurns = new Map<string, number>();

  constructor(opts: CreateSessionOptions) {
    this.opts = opts;
    this.caseDef = opts.caseDef;
    this.facility = opts.facility ?? null;
    this.catalogs = opts.catalogs ?? [];
    this.settings = structuredClone(opts.settings);
    // Settings built in code (not through the settings schema) may carry an alias or an unsupported language.
    this.settings.locale = canonicalLocale(this.settings.locale) ?? DEFAULT_SETTINGS.locale;
    this.now = opts.now ?? (() => Date.now());
    this.newId = opts.newId ?? defaultNewId;
    this.id = opts.sessionId ?? opts.resume?.sessionId ?? this.newId();
    this.createdAt = this.now();
    // Every transcript item passes through redaction: provider keys the session resolved (and
    // well-known key formats) never reach a sink — JSONL on disk, IndexedDB, or a server upload.
    this.recorder = opts.transcript ? new TranscriptRecorder(opts.transcript, this.now, opts.transcriptOrdinal ?? 0, (item) => redactValue(item, [...this.secrets])) : null;
    this.hub = new EventHub(this.recorder);
    this.gate = new ApprovalGate(this);
    this.registry = new ToolRegistry({
      ...(opts.dynamicTools ? { dynamicTools: opts.dynamicTools } : {}),
      ...(opts.tools ? { extra: opts.tools } : {}),
      npc: { utterance: () => this.currentUtterance },
    });
    this.profiles = new Map(mergeAgentProfiles(BUILTIN_AGENTS, opts.agents).map((p) => [p.name, p]));
    const builtinNames = new Set(BUILTIN_COMMANDS.map((c) => c.name));
    const disabled = new Set((opts.disabledCommands ?? []).map((n) => n.toLowerCase()));
    this.slash = [...BUILTIN_COMMANDS.filter((c) => !disabled.has(c.name)), ...(opts.commands ?? []).filter((c) => !builtinNames.has(c.name))];
    const affect = initialAffectIntensity(this.caseDef.patient.persona.affect);
    this.patientMemory = { patient: { approached: false, affectIntensity: affect }, companion: { approached: false, affectIntensity: Math.min(affect, 1) as 0 | 1 } };
    this.ownedFlags = new Set([...this.caseDef.interventions.flatMap((i) => i.setFlags), ...(this.caseDef.physiology?.events ?? []).flatMap((e) => e.setFlags)]);
    for (const p of Object.values(this.settings.providers)) if (p.apiKey) this.secrets.add(p.apiKey);
    this.state = createEngineState(this.caseDef);
    this.skillList = mergeSkills(BUILTIN_SKILLS, opts.skills ?? []);
    this.conversations = new ConversationLog(this);
    this.models = new AgentModels(this);
    this.tools = new ToolPath(this);
    this.agents = new AgentTurns(this);
    this.learner = new LearnerPath(this);
    this.external = new ExternalCalls(this);
    this.ops = new OpDispatcher(this);
    // Embodied mode (EMBODIED R3): the session builds the world; the clinical tools are spatially gated, world tools are added.
    this.embodied = this.settings.embodiment === "embodied" ? new EmbodiedSession(embodiedHost(this), opts.embodied ?? {}) : null;
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

  /** Session language. */
  get locale(): string {
    return this.settings.locale;
  }

  /** `clinical` or `embodied` (fixed for the encounter). */
  get embodiment(): "clinical" | "embodied" {
    return this.embodied ? "embodied" : "clinical";
  }

  /* ---------------------------------------------------------------- */
  /* Agents, tools, plan                                               */
  /* ---------------------------------------------------------------- */

  /** Names of the agents a learner can talk to in this case. */
  availableAgents(): string[] {
    return [...this.profiles.keys()].filter((name) => name !== "companion" || this.caseDef.patient.persona.companion !== undefined);
  }

  /** Tools available to an agent under the current scope and deny rules. */
  toolsFor(agent: AgentRole): ToolDefinition<any>[] {
    const profile = this.profiles.get(agent);
    if (!profile) return [];
    const tools = this.registry.forAgent(profile, { scope: this.settings.practiceScope, deny: this.settings.permissions.deny, caseDef: this.caseDef });
    // Camera frames only for a model that can look at images (embodied mode with a camera).
    return tools.some((t) => t.name === "get_camera_frame") && !this.models.visionFor(agent) ? tools.filter((t) => t.name !== "get_camera_frame") : tools;
  }

  /** Current workup plan. */
  workupPlan(): { items: PlanItem[]; explanation: string | null } {
    return { items: [...this.plan], explanation: this.planExplanation };
  }

  /** Publish a workup plan (`update_workup`). */
  updatePlan(id: string, agent: AgentRole | "learner", plan: PlanItem[], explanation?: string): void {
    this.plan = plan.map((p) => ({ text: p.text, status: p.status }));
    this.planExplanation = explanation ?? null;
    this.emit(id, { type: "plan_updated", agent: agent === "learner" ? "learner" : agent, ...(explanation ? { explanation } : {}), plan: this.plan });
  }

  /** What every agent's system prompt is built from. */
  promptContext(): PromptContext {
    return {
      caseDef: this.caseDef,
      state: this.state,
      locale: this.locale,
      facility: this.facility,
      catalogs: this.catalogs,
      memory: this.opts.memory ?? null,
      sessionContext: this.sessionContext,
      plan: this.plan,
      ...(this.embodied ? { embodied: { place: this.embodied.roomName(PRIMARY_ACTOR, this.locale), skills: this.skillList.map((sk) => sk.id), vitals: this.embodied.vitalsView(PRIMARY_ACTOR) } } : {}),
    };
  }

  /* ---------------------------------------------------------------- */
  /* Events                                                            */
  /* ---------------------------------------------------------------- */

  /** Emit an event of a submission (nothing once the stream has ended); keeps count of each agent's open turns. */
  emit(id: string, msg: EventMsg): void {
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
  speakLine(id: string, line: Omit<Extract<EventMsg, { type: "agent_message" }>, "type" | "turnId">): void {
    const turnId = this.newId();
    const started = this.now();
    const agent = line.agent;
    this.emit(id, { type: "turn_started", turnId, agent, synthetic: true });
    this.emit(id, { type: "agent_message", turnId, ...line });
    this.emit(id, { type: "turn_complete", turnId, agent, lastMessage: line.text || null, durationMs: Math.max(0, this.now() - started) });
    if (!this.openTurns.has(String(agent))) this.emit(id, { type: "turn_phase", turnId, agent, phase: "idle" });
  }

  /** `session_configured`: the session as it is now configured. */
  emitConfigured(id: string): void {
    const model = this.models.model("patient", false);
    this.emit(id, {
      type: "session_configured",
      sessionId: this.id,
      caseId: this.caseDef.id,
      caseVersion: this.caseDef.version,
      facilityId: this.facility?.id ?? null,
      locale: this.locale,
      provider: this.settings.provider,
      model: this.settings.model ?? model.config?.model ?? (this.settings.provider === "offline" ? "deterministic" : ""),
      approvalMode: this.settings.approvalMode,
      practiceScope: this.settings.practiceScope,
      agents: this.availableAgents(),
      interlocutor: this.interlocutor,
      offline: this.settings.provider === "offline" || this.models.model("clinician", false).provider === null,
      embodiment: this.embodiment,
    });
  }

  /** `state_snapshot`: engine state, progress, bedside vitals, the current waypoint. */
  emitSnapshot(id: string): void {
    const c = this.caseDef;
    const s = this.state;
    this.emit(id, { type: "state_snapshot", state: s, progress: progress(c, s), vitals: vitalsAt(c, s), waypoint: currentWaypoint(c, s) });
  }

  /* ---------------------------------------------------------------- */
  /* Hooks                                                             */
  /* ---------------------------------------------------------------- */

  private hookInput(spec: HookSpec): HookInput {
    return {
      session_id: this.id,
      case_id: this.caseDef.id,
      transcript_path: this.opts.transcript?.path ?? null,
      cwd: this.opts.cwd ?? null,
      approval_mode: this.settings.approvalMode,
      locale: this.locale,
      ...spec,
    } as HookInput;
  }

  /** Run the hooks of an event (in-process handlers and settings hooks). */
  async runHook(spec: HookSpec, signal?: AbortSignal): Promise<HookResult> {
    if (!this.hookRunner.has(spec.hook_event_name, this.settings.hooks)) return emptyHookResult();
    return this.hookRunner.runHooks(spec.hook_event_name, this.hookInput(spec), {
      settingsHooks: this.settings.hooks,
      ...(this.opts.commandHooks ? { executor: this.opts.commandHooks } : {}),
      ...(signal ? { signal } : {}),
    });
  }

  /** Fire-and-forget hooks (ClinicalEvent, Notification), run in order. */
  queueHook(spec: HookSpec, id: string): void {
    if (!this.hookRunner.has(spec.hook_event_name, this.settings.hooks)) return;
    this.hookChain = this.hookChain
      .then(async () => {
        const result = await this.runHook(spec);
        for (const w of result.warnings) this.emit(id, { type: "warning", message: w });
      })
      .catch(() => undefined);
  }

  /** Settles once the fire-and-forget hooks queued so far have run. */
  hooksSettled(): Promise<void> {
    return this.hookChain;
  }

  /* ---------------------------------------------------------------- */
  /* Engine                                                            */
  /* ---------------------------------------------------------------- */

  /** Dispatch an engine action: transcript, events, hooks, staff reactions, the examiner's dialogue. */
  dispatch(action: ClinicalAction, id: string): ReduceResult {
    const result = reduce(this.caseDef, this.state, action);
    const accepted = !result.rejected;
    if (accepted) {
      this.state = result.state;
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
        if (action.text.trim()) this.conversations.addDialogue({ who, speaker: who, text: `[note] ${action.text}` });
      } else if (action.type !== "ask" && action.type !== "start") {
        const narration = narrateAction(this.caseDef, action, this.locale);
        if (narration) this.conversations.addDialogue({ who: "action", speaker: String(action.by ?? "learner"), text: narration });
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
      this.conversations.append(line.agent, [{ role: "assistant", content: [{ type: "text", text: line.text }] }]);
      this.conversations.addDialogue({ who: line.agent, speaker, text: line.text });
    }
  }

  /** Start the encounter (a `start` action by the system) unless it has started or finished. */
  ensureStarted(id: string): void {
    if (!this.state.started && !this.state.finished) this.dispatch({ type: "start", by: "system" }, id);
  }
}
