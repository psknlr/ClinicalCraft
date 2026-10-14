/**
 * ClinicalSession — the runtime core (Codex `Codex`/`Session` analogue).
 *
 * Owns: case + engine state, facility context, agent conversations, the
 * approval gate, hooks, the transcript sink and the event stream. Processes
 * submissions serially (one turn at a time); `interrupt` and
 * `approval_response` are handled out-of-band so they stay responsive.
 */
import type { CaseDefinition, ClinicalAction, EquipmentCatalog, FacilityDefinition, ReduceResult, SessionState } from "@clinicalcraft/core";
import type { AgentProfile, SlashCommand } from "../agents/types.js";
import type { CommandHookExecutor, HookHandler } from "../hooks/types.js";
import type { AgentEvent, AgentRole, Op } from "../protocol.js";
import type { LLMProvider, ProviderConfig } from "../providers/types.js";
import type { HookEventName, ResolvedSettings } from "../settings/schema.js";
import type { ToolDefinition } from "../tools/types.js";

/** Append-only transcript sink (JSONL rollouts in node; IndexedDB/localStorage or no-op in browsers). */
export interface TranscriptSink {
  write(item: TranscriptItem): void | Promise<void>;
  flush?(): Promise<void>;
  readonly path?: string | null;
}

/** One JSONL line. `ordinal` is monotonic. Durable types are enough to resume a session. */
export type TranscriptItem =
  | { type: "session_meta"; ordinal: number; ts: string; payload: { sessionId: string; caseId: string; caseVersion: string; facilityId: string | null; locale: string; provider: string; model: string; clinicalcraftVersion: string } }
  | { type: "op"; ordinal: number; ts: string; payload: { id: string; op: Op } }
  | { type: "action"; ordinal: number; ts: string; payload: { action: ClinicalAction; accepted: boolean } }
  | { type: "message"; ordinal: number; ts: string; payload: { agent: AgentRole; role: "user" | "assistant"; content: unknown } }
  | { type: "event"; ordinal: number; ts: string; payload: AgentEvent }
  | { type: "compacted"; ordinal: number; ts: string; payload: { agent: AgentRole; summary: string } };

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
  /** Restore from a previous session (resume). */
  resume?: { sessionId: string; actions: ClinicalAction[]; messages?: Partial<Record<AgentRole, unknown[]>> };
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
  /** Serializable snapshot for save/export/resume. */
  snapshot(): SessionSnapshot;
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
}
