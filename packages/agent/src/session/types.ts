/**
 * ClinicalSession — the runtime core (Codex `Codex`/`Session` analogue).
 *
 * Owns: case + engine state, facility context, agent conversations, the
 * approval gate, hooks, the transcript sink and the event stream. Processes
 * submissions serially (one turn at a time); `interrupt` and
 * `approval_response` are handled out-of-band so they stay responsive.
 */
import type { CaseDefinition, ClinicalAction, EquipmentCatalog, FacilityDefinition, ReduceResult, SessionState } from "@clinicalcraft/core";
import type { CameraSensor, EpisodeTrace, Mover, Pose, WorldRuntime, WorldStateSnapshot } from "@clinicalcraft/world";
import type { AgentProfile, SlashCommand } from "../agents/types.js";
import type { CommandHookExecutor, HookHandler } from "../hooks/types.js";
import type { AgentEvent, AgentRole, Op, PlanItem } from "../protocol.js";
import type { ChatMessage, LLMProvider, ProviderConfig } from "../providers/types.js";
import type { Embodiment, HookEventName, ResolvedSettings } from "../settings/schema.js";
import type { SkillDefinition } from "../skills/schema.js";
import type { ToolDefinition } from "../tools/types.js";

/** Append-only transcript sink (JSONL rollouts in node; IndexedDB/localStorage or no-op in browsers). */
export interface TranscriptSink {
  write(item: TranscriptItem): void | Promise<void>;
  flush?(): Promise<void>;
  readonly path?: string | null;
}

/** One JSONL line. `ordinal` is monotonic. Durable types are enough to resume a session. */
/** One line of the encounter as the examiner sees it (learner words, agent replies, ACTION narrations, notes, rationales). */
export interface DialogueEntry {
  /** "learner", an agent name, or "action" for clinical actions. */
  who: string;
  speaker: string;
  text: string;
}

export type TranscriptItem =
  | {
      type: "session_meta";
      ordinal: number;
      ts: string;
      /** `embodiment`: the encounter's mode (absent = clinical; a resume keeps it — docs/EMBODIED.md R3). */
      payload: { sessionId: string; caseId: string; caseVersion: string; facilityId: string | null; locale: string; provider: string; model: string; clinicalcraftVersion: string; embodiment?: Embodiment };
    }
  /** The examiner's evidence line (resume restores the dialogue from these). */
  | { type: "dialogue"; ordinal: number; ts: string; payload: DialogueEntry }
  | { type: "op"; ordinal: number; ts: string; payload: { id: string; op: Op } }
  | { type: "action"; ordinal: number; ts: string; payload: { action: ClinicalAction; accepted: boolean } }
  | { type: "message"; ordinal: number; ts: string; payload: { agent: AgentRole; role: "user" | "assistant"; content: unknown } }
  | { type: "event"; ordinal: number; ts: string; payload: AgentEvent }
  | { type: "compacted"; ordinal: number; ts: string; payload: { agent: AgentRole; summary: string } }
  /**
   * Transcript-only diagnostics, never emitted as an event: e.g. the detailed
   * grounding violations of a rejected patient reply (they may quote an
   * unasked fact or a diagnosis; the learner's `warning` names only their
   * categories). Ignored by resume.
   */
  | { type: "diagnostic"; ordinal: number; ts: string; payload: { agent: AgentRole; source: "grounding"; detail: string[] } }
  /**
   * Embodied mode: the physical world after a committed state-changing world action (and at shutdown when a
   * sensor pose moved since) — a resume restores the last one (`SessionOptions.embodied.snapshot`); the engine
   * state comes from the replayed actions (device states that mirror clinical facts are derived from it).
   * The idempotency window is trimmed (`results` without paths and events).
   */
  | { type: "world"; ordinal: number; ts: string; payload: { snapshot: WorldStateSnapshot } };

export interface SessionOptions {
  caseDef: CaseDefinition;
  facility?: FacilityDefinition | null;
  catalogs?: EquipmentCatalog[];
  settings: ResolvedSettings;
  /** Extra/overriding agent profiles (project `.clinicalcraft/agents`). */
  agents?: AgentProfile[];
  /** Extra slash commands (project `.clinicalcraft/commands`). */
  commands?: SlashCommand[];
  /** Extra tools (plugins). */
  tools?: ToolDefinition<any>[];
  /** CLINICALCRAFT.md memory text (already assembled with imports). */
  memory?: string;
  /** Build a provider for an agent; defaults to `createProvider` with settings + env. */
  providerFactory?: (agent: AgentProfile, config: ProviderConfig) => LLMProvider;
  /** Resolve provider configs (keys from env etc.). Node supplies one; browsers supply user keys/proxy. */
  resolveProvider?: (providerId: string, model: string | null) => ProviderConfig;
  commandHooks?: CommandHookExecutor;
  transcript?: TranscriptSink;
  /** Project directory (passed to command hooks as `cwd`). */
  cwd?: string | null;
  /** Client-executed dynamic tools the front-end supports, e.g. ["walk_to"]. */
  dynamicTools?: readonly string[];
  /**
   * Built-in slash commands this front-end does not support (e.g. the web's
   * ["quit", "export", "lang", …], which it handles through its own menus):
   * left out of `/help` and `commands()`, and refused with a localised notice.
   */
  disabledCommands?: readonly string[];
  /** First transcript ordinal (a resumed transcript continues after the previous file's last ordinal). */
  transcriptOrdinal?: number;
  /**
   * Embodied mode (settings `embodiment: "embodied"`, docs/EMBODIED.md R3): the session builds the world itself
   * (facility, catalogs, the case bound to its slot with core `assignPatientSlot`); a facility is required
   * (`EmbodimentError`, code `embodiment_requires_facility`). `mover` animates bodies (browser; default instant),
   * `camera` gives camera frames (`get_camera_frame`, vision models only), `spawn` the learner's start pose,
   * `snapshot` the physical state to restore (resume: the last transcript `world` item).
   */
  embodied?: { mover?: Mover; camera?: CameraSensor; spawn?: Pose; snapshot?: WorldStateSnapshot };
  /**
   * Project skills (`.clinicalcraft/skills/*.json`, validated; embodied mode) — they extend the built-in skills,
   * registered as `project:<id>` (they never shadow a built-in; `execute_skill {skill_id: "<id>"}` finds them when
   * no built-in has that id).
   */
  skills?: SkillDefinition[];
  /** Problems found while loading project skills (each becomes a startup `warning`). */
  skillIssues?: string[];
  /** The project's skill files left out because the project is not trusted (a bilingual startup `warning`). */
  skillsUntrusted?: { dir: string; files: number };
  /** Restore from a previous session (resume). */
  resume?: {
    sessionId: string;
    actions: ClinicalAction[];
    messages?: Partial<Record<AgentRole, unknown[]>>;
    /**
     * The examiner's dialogue (transcript `dialogue` items / `SessionSnapshot.dialogue`).
     * Without it the dialogue is rebuilt from the messages and accepted actions.
     */
    dialogue?: DialogueEntry[];
  };
  sessionId?: string;
  /** Clock for timestamps (ms since epoch); injectable for tests. */
  now?: () => number;
  /** Id generator; injectable for tests. */
  newId?: () => string;
}

export interface ClinicalSessionApi {
  readonly id: string;
  readonly caseDef: CaseDefinition;
  readonly facility: FacilityDefinition | null;
  readonly settings: ResolvedSettings;
  /** Current engine state. */
  readonly state: SessionState;
  /** Queue a submission; returns its id immediately. */
  submit(op: Op): string;
  /** Submit and resolve when the resulting turn completes (convenience for CLI/tests/MCP). */
  run(op: Op): Promise<AgentEvent[]>;
  /** Subscribe to events; returns an unsubscribe function. */
  subscribe(listener: (event: AgentEvent) => void): () => void;
  /** Async iterator over events (ends after shutdown_complete). */
  events(): AsyncIterable<AgentEvent>;
  /** In-process hooks. */
  readonly hooks: { on(event: HookEventName, handler: HookHandler): () => void };
  /** Synchronous deterministic action path (bypasses LLMs but NOT the approval gate when `gate` is true). */
  dispatch(action: ClinicalAction): ReduceResult;
  /** Tools available to an agent under the current scope/mode. */
  toolsFor(agent: AgentRole): ToolDefinition<any>[];
  /** Registered slash commands. */
  commands(): SlashCommand[];
  agents(): AgentProfile[];
  /** Advance a simulated-clock case by real elapsed time (uses `clock.realtimeScale`); null when nothing advanced. */
  advanceRealTime(ms: number): ReduceResult | null;
  /** Agent names that can be addressed in this session (built-in + custom, filtered by case). */
  availableAgents(): string[];
  /** Provider-neutral conversation history of one agent (read-only copy). */
  conversationOf(agent: AgentRole): ChatMessage[];
  /** Current workup/differential plan published via `update_workup`. */
  workupPlan(): { items: PlanItem[]; explanation: string | null };
  /** Serializable snapshot for save/export/resume. */
  snapshot(): SessionSnapshot;
  /** The encounter's world (embodied mode; a stable handle across language switches), or null in clinical mode. */
  world(): WorldRuntime | null;
  /** The episode trace (docs/EMBODIED.md §10): embodied tool calls, world actions and clinical actions as linked spans (empty in clinical mode). */
  trace(): EpisodeTrace;
  close(): Promise<void>;
}

export interface SessionSnapshot {
  format: "clinicalcraft-session@1";
  sessionId: string;
  caseId: string;
  caseVersion: string;
  facilityId: string | null;
  locale: string;
  actions: ClinicalAction[];
  messages: Partial<Record<AgentRole, unknown[]>>;
  plan: { text: string; status: string }[];
  createdAt: string;
  /**
   * Ordinal the session's transcript recorder would stamp next (absent without
   * a transcript). A front-end that resumes from this snapshot into the same
   * transcript passes it as `transcriptOrdinal`, so the ordinals continue.
   */
  nextOrdinal?: number;
  /** The examiner's dialogue so far (evidence for transcript-judged rubric items after a resume). */
  dialogue?: DialogueEntry[];
  /** Embodied mode: the encounter's mode and its physical world (resume with `SessionOptions.embodied.snapshot`). */
  embodiment?: Embodiment;
  world?: WorldStateSnapshot;
}
