/**
 * MCP session registry: one `ClinicalSession` per `start_case`, created with
 * `createNodeSession` (settings layers, memory, project agents/commands,
 * command hooks, JSONL transcript). The resolved settings the server was
 * started with are re-applied as the session's flag layer, with the MCP
 * approval default (`bypass` — the MCP client owns approvals) unless the
 * settings chose a mode explicitly.
 *
 * Calls on one session are serialised; sessions beyond `maxSessions` evict
 * the least recently used one (closed cleanly, transcript flushed).
 */
import type { AgentEvent, AgentProfile, ApprovalMode, ClinicalSession, LLMProvider, ProviderConfig, ResolvedSettings, SettingsLayerData } from "@clinicalcraft/agent";
import { createCommandHookExecutor, createNodeSession, findProjectRoot, type Env, type LoadedContent } from "@clinicalcraft/agent/node";
import { SessionToolRunner } from "./bridge.js";

/** Kept per session for the `transcript` resource (bounded). */
export interface LoggedEvent {
  seq: number;
  type: string;
  [key: string]: unknown;
}

export interface McpSession {
  readonly id: string;
  readonly session: ClinicalSession;
  readonly runner: SessionToolRunner;
  readonly createdAt: number;
  lastUsed: number;
  readonly log: LoggedEvent[];
}

export interface SessionManagerOptions {
  settings: ResolvedSettings;
  env: Env;
  cwd: string;
  content: () => Promise<LoadedContent>;
  maxSessions?: number;
  log?: (message: string) => void;
  /** Model provider override for every agent (tests). */
  providerFactory?: (agent: AgentProfile, config: ProviderConfig) => LLMProvider;
  now?: () => number;
}

const LOG_LIMIT = 2000;
const LOGGED_TYPES = new Set(["agent_message", "clinical_event", "plan_updated", "assessment", "notification", "warning", "error", "command_output"]);

/**
 * Approval mode for MCP sessions: `bypass` unless a settings layer (user,
 * project, local, env, flag or profile) chose a mode.
 */
export function mcpApprovalMode(settings: Pick<ResolvedSettings, "approvalMode" | "sources">): ApprovalMode {
  const source = settings.sources?.approvalMode;
  return !source || source === "default" ? "bypass" : settings.approvalMode;
}

/** The resolved settings as a flag layer for `createNodeSession` (never provider credentials). */
export function sessionFlags(settings: ResolvedSettings, locale: string | null): SettingsLayerData {
  return {
    provider: settings.provider,
    ...(settings.model ? { model: settings.model } : {}),
    ...(settings.effort ? { effort: settings.effort } : {}),
    locale: locale ?? settings.locale,
    approvalMode: mcpApprovalMode(settings),
    practiceScope: settings.practiceScope,
    maxToolRounds: settings.maxToolRounds,
    permissions: settings.permissions,
    patient: settings.patient,
    transcripts: { enabled: settings.transcripts.enabled, ...(settings.transcripts.dir ? { dir: settings.transcripts.dir } : {}) },
    ...(Object.keys(settings.agents).length > 0 ? { agents: settings.agents } : {}),
  };
}

function loggable(event: AgentEvent): LoggedEvent | null {
  const msg = event.msg;
  if (!LOGGED_TYPES.has(msg.type)) return null;
  switch (msg.type) {
    case "agent_message":
      return { seq: event.seq, type: msg.type, agent: msg.agent, speaker: msg.speaker, text: msg.text, grounded: msg.grounded, grounding: msg.grounding ?? null };
    case "assessment":
      return { seq: event.seq, type: msg.type, score: msg.report.score, completed: msg.report.completed, narrative: msg.narrative };
    case "command_output":
      return { seq: event.seq, type: msg.type, name: msg.name, text: msg.text };
    default:
      return { seq: event.seq, ...msg };
  }
}

export class SessionManager {
  private readonly sessions = new Map<string, McpSession>();
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly maxSessions: number;
  private readonly now: () => number;

  constructor(private readonly opts: SessionManagerOptions) {
    this.maxSessions = Math.max(1, opts.maxSessions ?? 32);
    this.now = opts.now ?? Date.now;
  }

  /** Open sessions, most recently used last. */
  list(): McpSession[] {
    return [...this.sessions.values()];
  }

  get(id: string): McpSession | undefined {
    const entry = this.sessions.get(id);
    if (entry) entry.lastUsed = this.now();
    return entry;
  }

  /** Start a case. Throws `BootstrapError` (unknown case/facility) and settings errors. */
  async start(params: { caseId: string; locale?: string | null; facilityId?: string | null }): Promise<McpSession> {
    const settings = this.opts.settings;
    const session = await createNodeSession({
      caseId: params.caseId,
      cwd: this.opts.cwd,
      env: this.opts.env,
      flags: sessionFlags(settings, params.locale ?? null),
      ...(params.facilityId ? { facilityId: params.facilityId } : {}),
      transcript: settings.transcripts.enabled,
      content: await this.opts.content(),
      ...(this.opts.providerFactory ? { providerFactory: this.opts.providerFactory } : {}),
    });
    const projectRoot = findProjectRoot(this.opts.cwd, this.opts.env) ?? this.opts.cwd;
    const runner = new SessionToolRunner(session, { executor: createCommandHookExecutor(projectRoot), cwd: projectRoot, ...(this.opts.log ? { log: this.opts.log } : {}) });
    const entry: McpSession = { id: session.id, session, runner, createdAt: this.now(), lastUsed: this.now(), log: [] };
    session.subscribe((event) => {
      const item = loggable(event);
      if (!item) return;
      entry.log.push(item);
      if (entry.log.length > LOG_LIMIT) entry.log.splice(0, entry.log.length - LOG_LIMIT);
    });
    this.sessions.set(session.id, entry);
    await this.evict();
    return entry;
  }

  /** Run `fn` after every earlier call on the same session has finished. */
  exclusive<T>(entry: McpSession, fn: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(entry.id) ?? Promise.resolve();
    const next = previous.then(fn, fn);
    const settled = next.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(entry.id, settled);
    void settled.then(() => {
      if (this.queues.get(entry.id) === settled) this.queues.delete(entry.id);
    });
    return next;
  }

  /** Close every session (flushes transcripts). */
  async closeAll(): Promise<void> {
    const entries = [...this.sessions.values()];
    this.sessions.clear();
    await Promise.allSettled(entries.map((e) => this.closeEntry(e)));
  }

  private async evict(): Promise<void> {
    while (this.sessions.size > this.maxSessions) {
      const oldest = [...this.sessions.values()].sort((a, b) => a.lastUsed - b.lastUsed)[0]!;
      this.sessions.delete(oldest.id);
      this.opts.log?.(`closing least recently used session ${oldest.id}`);
      await this.closeEntry(oldest);
    }
  }

  private async closeEntry(entry: McpSession): Promise<void> {
    const pending = this.queues.get(entry.id);
    if (pending) await pending;
    try {
      await entry.session.close();
    } catch (err) {
      this.opts.log?.(`closing session ${entry.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
