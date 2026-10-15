/**
 * The UI store: ONE append-only log of what happened in the session — the
 * learner's submitted ops, every `AgentEvent`, and (after a resume) the
 * restored conversation lines — plus caches folded from that log entry by
 * entry. Every panel and the HUD render from these caches; there is no
 * second history array anywhere in the UI (DESIGN_PRINCIPLES "UI derives
 * from the event log").
 */
import type { AgentEvent, AgentRole, ApprovalDecision, EventMsg, Op, PlanItem, TurnPhase } from "@clinicalcraft/agent";
import { t, type AssessmentReport, type CaseDefinition, type DomainEvent, type ObjectiveProgress, type SessionState, type VitalsSnapshot } from "@clinicalcraft/core";

export type LogEntry =
  | { kind: "event"; at: number; event: AgentEvent }
  | { kind: "op"; at: number; id: string; op: Op; view?: string }
  | { kind: "restored"; at: number; agent: string; role: "user" | "assistant"; text: string };

export type ChatTone = "speech" | "exam" | "treat" | "harm" | "note" | "error" | "command";

export interface ChatItem {
  key: string;
  role: "learner" | "agent" | "system";
  /** Speaking agent (agent items) or addressee (learner items). */
  agent: string;
  speaker: string;
  text: string;
  grounded: string[];
  turnId?: string;
  streaming: boolean;
  tone: ChatTone;
  at: number;
  grounding?: string;
  nonverbal?: string;
}

export interface Snapshot {
  state: SessionState;
  progress: ObjectiveProgress;
  vitals: VitalsSnapshot;
  waypoint: string | null;
}

export type ApprovalRequest = Extract<EventMsg, { type: "approval_request" }> & { submissionId: string };
export type Configured = Extract<EventMsg, { type: "session_configured" }>;

export interface ToolCallView {
  callId: string;
  turnId: string;
  agent: string;
  tool: string;
  args: unknown;
  status: "running" | "ok" | "failed";
  output: string;
  durationMs: number;
  at: number;
}

export interface AnswerRecord {
  optionIds: string[];
  correct: boolean;
  firstTry: boolean;
}

export interface InterventionOutcome {
  appropriateness: "indicated" | "neutral" | "contraindicated";
  count: number;
  at: number;
}

export interface AssessmentView {
  report: AssessmentReport;
  narrative: string | null;
  judged: { id: string; met: boolean; evidence: string }[];
}

/** Agents whose conversation the learner sees as chat (clinician/examiner have their own panels). */
const CHAT_AGENTS_EXCLUDED = new Set(["clinician", "examiner"]);

export class SessionStore {
  readonly log: LogEntry[] = [];
  version = 0;

  config: Configured | null = null;
  snapshot: Snapshot | null = null;
  readonly chat: ChatItem[] = [];
  readonly approvals = new Map<string, ApprovalRequest>();
  readonly resolved = new Map<string, ApprovalDecision>();
  readonly phases = new Map<string, TurnPhase>();
  plan: { agent: string; explanation?: string; items: PlanItem[] } | null = null;
  assessment: AssessmentView | null = null;
  assessing = false;
  readonly toolCalls: ToolCallView[] = [];
  readonly answers = new Map<string, AnswerRecord[]>();
  readonly interventions = new Map<string, InterventionOutcome>();
  /** Objectives the learner took a (scored) hint for in this session — the journal shows their hint text. */
  readonly hinted = new Set<string>();
  /** First refusal/problem per submission id (error or warning event, engine rejection) — e.g. an order that was not placed. */
  readonly failures = new Map<string, string>();
  /** An autopilot submission is being processed. */
  autopilotRunning = false;
  private readonly streams = new Map<string, ChatItem>();
  /**
   * Submission id → the conversation (agent) it belongs to: slash-command output, and warnings /
   * errors of that turn (model failure answered by the deterministic fallback, out-of-fiction
   * deflection, unverified reply) are shown in that conversation, not only as a passing toast.
   */
  private readonly views = new Map<string, string>();
  private readonly entryListeners = new Set<(entry: LogEntry) => void>();
  private readonly changeListeners = new Set<() => void>();
  private seq = 0;
  private interlocutor: AgentRole = "patient";

  constructor(private readonly caseDef: CaseDefinition) {}

  /* ---------------- ingestion ---------------- */

  append(entry: LogEntry): void {
    this.log.push(entry);
    this.fold(entry);
    this.version++;
    for (const fn of this.entryListeners) {
      try {
        fn(entry);
      } catch (err) {
        console.error(err);
      }
    }
    for (const fn of this.changeListeners) fn();
  }

  event(event: AgentEvent): void {
    this.append({ kind: "event", at: Date.now(), event });
  }

  /** Log a submitted op; `view` = the conversation it was typed in (slash-command output is shown there). */
  op(id: string, op: Op, view?: string): void {
    this.append({ kind: "op", at: Date.now(), id, op, ...(view ? { view } : {}) });
  }

  /** Seed conversation lines restored from a saved session (before any event). */
  restore(messages: Partial<Record<string, unknown[]>>): void {
    const order = ["patient", "companion", ...Object.keys(messages).filter((a) => a !== "patient" && a !== "companion")];
    for (const agent of order) {
      if (CHAT_AGENTS_EXCLUDED.has(agent)) continue;
      for (const m of messages[agent] ?? []) {
        const msg = m as { role?: unknown; content?: unknown };
        if (msg.role !== "user" && msg.role !== "assistant") continue;
        const text = textOf(msg.content);
        if (text.trim()) this.append({ kind: "restored", at: Date.now(), agent, role: msg.role, text });
      }
    }
  }

  onEntry(fn: (entry: LogEntry) => void): () => void {
    this.entryListeners.add(fn);
    return () => this.entryListeners.delete(fn);
  }

  onChange(fn: () => void): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }

  /* ---------------- selectors ---------------- */

  /** Chat items visible in a conversation with `agents` (null = every chat agent). */
  chatFor(agents: ReadonlySet<string> | null): ChatItem[] {
    if (!agents) return this.chat;
    // Exam/treatment lines carry agent "patient"; command output and turn warnings carry the
    // conversation they belong to — each shows only in its own window.
    return this.chat.filter((c) => agents.has(c.agent));
  }

  /** The conversation (agent) a submission belongs to, if it came from one. */
  viewOf(submissionId: string): string | null {
    return this.views.get(submissionId) ?? null;
  }

  /** The non-idle phase of an agent's current turn. */
  phaseOf(agent: string): TurnPhase | null {
    return this.phases.get(agent) ?? null;
  }

  /** First agent (in `agents`) that is busy. */
  busyAmong(agents: ReadonlySet<string>): { agent: string; phase: TurnPhase } | null {
    for (const [agent, phase] of this.phases) if (agents.has(agent)) return { agent, phase };
    return null;
  }

  pendingApprovals(): ApprovalRequest[] {
    return [...this.approvals.values()];
  }

  /** Last `n` domain events of a type (newest last). */
  domainEvents<T extends DomainEvent["type"]>(type: T): Extract<DomainEvent, { type: T }>[] {
    const out: Extract<DomainEvent, { type: T }>[] = [];
    for (const e of this.log) {
      if (e.kind === "event" && e.event.msg.type === "clinical_event" && e.event.msg.event.type === type) out.push(e.event.msg.event as Extract<DomainEvent, { type: T }>);
    }
    return out;
  }

  get offline(): boolean {
    return this.config?.offline ?? true;
  }

  /* ---------------- folding ---------------- */

  private key(prefix: string): string {
    return `${prefix}-${++this.seq}`;
  }

  private displaySpeaker(agent: string, speaker: string): string {
    const c = this.caseDef;
    if (speaker && speaker !== agent) return speaker;
    if (agent === "patient") return t(c.patient.displayName, this.config?.locale ?? "zh-CN");
    if (agent === "companion" && c.patient.persona.companion) return t(c.patient.persona.companion.name, this.config?.locale ?? "zh-CN");
    return speaker || agent;
  }

  private fold(entry: LogEntry): void {
    if (entry.kind === "restored") {
      this.chat.push({
        key: this.key("r"),
        role: entry.role === "user" ? "learner" : "agent",
        agent: entry.agent,
        speaker: entry.role === "user" ? "learner" : this.displaySpeaker(entry.agent, ""),
        text: entry.text,
        grounded: [],
        streaming: false,
        tone: "speech",
        at: entry.at,
      });
      return;
    }
    if (entry.kind === "op") return this.foldOp(entry.id, entry.op, entry.at, entry.view);
    this.foldEvent(entry.event, entry.at);
  }

  private foldOp(id: string, op: Op, at: number, view?: string): void {
    const L = this.config?.locale ?? "zh-CN";
    if (op.type === "user_message") {
      let to = op.to ?? this.interlocutor;
      let text = op.text;
      const trimmed = op.text.trim();
      const m = /^@(\S+)\s+([\s\S]*)$/.exec(trimmed);
      if (!op.to && m) {
        to = m[1].toLowerCase();
        text = m[2];
      }
      if (!op.to && /^[/／](?![/／])/.test(trimmed)) {
        // A slash command: echo it in the conversation it was typed in; its output follows (command_output).
        const where = view ?? this.interlocutor;
        this.views.set(id, where);
        this.chat.push({ key: this.key("u"), role: "learner", agent: where, speaker: "learner", text: trimmed, grounded: [], streaming: false, tone: "command", at });
        return;
      }
      if (!op.to && /^[/／]{2}/.test(trimmed)) text = trimmed.slice(1);
      this.views.set(id, to);
      this.chat.push({ key: this.key("u"), role: "learner", agent: to, speaker: "learner", text, grounded: [], streaming: false, tone: "speech", at });
    } else if (op.type === "clinical_action" && op.action.type === "ask") {
      const itemId = op.action.itemId;
      const item = this.caseDef.history.find((h) => h.id === itemId);
      if (!item) return;
      const companion = this.caseDef.patient.persona.companion;
      const agent = companion?.answersHistory ? "companion" : "patient";
      this.views.set(id, agent);
      this.chat.push({ key: this.key("q"), role: "learner", agent, speaker: "learner", text: t(item.question, L), grounded: [], streaming: false, tone: "speech", at });
    } else if (op.type === "autopilot") {
      this.autopilotRunning = true;
    } else if (op.type === "assess") {
      this.assessing = true;
    }
  }

  private foldEvent(ev: AgentEvent, at: number): void {
    const msg = ev.msg;
    const L = this.config?.locale ?? "zh-CN";
    switch (msg.type) {
      case "session_configured":
        this.config = msg;
        this.interlocutor = msg.interlocutor;
        break;
      case "config_changed":
        if (this.config) {
          const p = msg.patch;
          this.config = {
            ...this.config,
            ...(p.provider !== undefined ? { provider: p.provider } : {}),
            ...(p.model !== undefined ? { model: p.model } : {}),
            ...(p.approvalMode !== undefined ? { approvalMode: p.approvalMode } : {}),
            ...(p.practiceScope !== undefined ? { practiceScope: p.practiceScope } : {}),
            ...(p.locale !== undefined ? { locale: p.locale } : {}),
            ...(p.interlocutor !== undefined ? { interlocutor: p.interlocutor } : {}),
          };
          if (p.provider !== undefined) this.config.offline = p.provider === "offline";
          if (p.interlocutor) this.interlocutor = p.interlocutor;
        }
        break;
      case "state_snapshot":
        this.snapshot = { state: msg.state, progress: msg.progress, vitals: msg.vitals, waypoint: msg.waypoint };
        break;
      case "turn_phase":
        if (msg.phase === "idle") this.phases.delete(String(msg.agent));
        else this.phases.set(String(msg.agent), msg.phase);
        break;
      case "turn_started":
        this.phases.set(String(msg.agent), "awaiting_model");
        break;
      case "agent_message_delta": {
        if (CHAT_AGENTS_EXCLUDED.has(String(msg.agent))) break;
        let item = this.streams.get(msg.turnId);
        if (!item) {
          item = { key: this.key("s"), role: "agent", agent: String(msg.agent), speaker: this.displaySpeaker(String(msg.agent), ""), text: "", grounded: [], turnId: msg.turnId, streaming: true, tone: "speech", at };
          this.streams.set(msg.turnId, item);
          this.chat.push(item);
        }
        item.text += msg.delta;
        this.phases.set(String(msg.agent), "streaming");
        break;
      }
      case "agent_message": {
        if (CHAT_AGENTS_EXCLUDED.has(String(msg.agent))) break;
        const extra = msg as typeof msg & { grounding?: string; nonverbal?: string };
        const stream = this.streams.get(msg.turnId);
        const speaker = this.displaySpeaker(String(msg.agent), msg.speaker);
        if (stream) {
          this.streams.delete(msg.turnId);
          Object.assign(stream, { text: msg.text, grounded: msg.grounded, streaming: false, speaker });
          if (extra.grounding) stream.grounding = extra.grounding;
          if (extra.nonverbal) stream.nonverbal = extra.nonverbal;
        } else {
          this.chat.push({
            key: this.key("a"),
            role: "agent",
            agent: String(msg.agent),
            speaker,
            text: msg.text,
            grounded: msg.grounded,
            turnId: msg.turnId,
            streaming: false,
            tone: "speech",
            at,
            ...(extra.grounding ? { grounding: extra.grounding } : {}),
            ...(extra.nonverbal ? { nonverbal: extra.nonverbal } : {}),
          });
        }
        break;
      }
      case "turn_complete":
      case "turn_aborted": {
        for (const [turnId, item] of this.streams) {
          if (turnId === msg.turnId) {
            item.streaming = false;
            this.streams.delete(turnId);
          }
        }
        break;
      }
      case "approval_request":
        this.approvals.set(msg.requestId, { ...msg, submissionId: ev.id });
        break;
      case "approval_resolved":
        this.approvals.delete(msg.requestId);
        this.resolved.set(msg.requestId, msg.decision);
        break;
      case "tool_call_begin":
        this.toolCalls.push({ callId: msg.callId, turnId: msg.turnId, agent: String(msg.agent), tool: msg.tool, args: msg.args, status: "running", output: "", durationMs: 0, at });
        this.phases.set(String(msg.agent), "executing_tools");
        break;
      case "tool_call_end": {
        const call = [...this.toolCalls].reverse().find((c) => c.callId === msg.callId);
        if (call) Object.assign(call, { status: msg.ok ? "ok" : "failed", output: msg.output, durationMs: msg.durationMs });
        break;
      }
      case "command_output": {
        const where = this.views.get(ev.id) ?? this.interlocutor;
        if (msg.text.trim()) this.chat.push({ key: this.key("c"), role: "system", agent: where, speaker: `/${msg.name}`, text: msg.text, grounded: [], streaming: false, tone: "command", at });
        break;
      }
      case "plan_updated":
        this.plan = { agent: String(msg.agent), ...(msg.explanation ? { explanation: msg.explanation } : {}), items: msg.plan };
        break;
      case "assessment":
        this.assessment = { report: msg.report, narrative: msg.narrative, judged: msg.judged };
        this.assessing = false;
        break;
      case "clinical_event":
        if (msg.event.type === "action.rejected" && ev.id && !this.failures.has(ev.id)) this.failures.set(ev.id, msg.event.message);
        this.foldDomain(msg.event, at, L);
        break;
      case "warning":
      case "error": {
        if (msg.type === "error") this.assessing = false;
        const where = this.views.get(ev.id);
        const text = msg.message.trim();
        if (ev.id && text && !this.failures.has(ev.id)) this.failures.set(ev.id, text);
        if (where && text) this.chat.push({ key: this.key("w"), role: "system", agent: where, speaker: "", text, grounded: [], streaming: false, tone: "error", at });
        break;
      }
      default:
        break;
    }
  }

  /** Mark the autopilot as finished (called when its submission resolves). */
  autopilotDone(): void {
    this.autopilotRunning = false;
    this.version++;
    for (const fn of this.changeListeners) fn();
  }

  private foldDomain(event: DomainEvent, at: number, L: string): void {
    const c = this.caseDef;
    switch (event.type) {
      case "exam.performed": {
        const f = c.exam.find((x) => x.id === event.findingId);
        if (f) this.chat.push({ key: this.key("e"), role: "system", agent: "patient", speaker: t(f.maneuver, L), text: t(f.finding, L), grounded: [], streaming: false, tone: "exam", at });
        break;
      }
      case "intervention.applied": {
        const iv = c.interventions.find((x) => x.id === event.interventionId);
        const prev = this.interventions.get(event.interventionId);
        this.interventions.set(event.interventionId, { appropriateness: event.appropriateness, count: (prev?.count ?? 0) + 1, at: this.snapshot?.state.clock ?? 0 });
        if (iv) {
          const harm = event.appropriateness === "contraindicated" && iv.harm ? t(iv.harm, L) : "";
          const text = [iv.dose ? t(iv.dose, L) : "", iv.response ? t(iv.response, L) : "", harm].filter(Boolean).join(" ");
          this.chat.push({ key: this.key("i"), role: "system", agent: "patient", speaker: t(iv.name, L), text, grounded: [], streaming: false, tone: harm ? "harm" : "treat", at });
        }
        break;
      }
      case "hint.used":
        if (event.objectiveId) this.hinted.add(event.objectiveId);
        break;
      case "decision.answered": {
        const list = this.answers.get(event.decisionId) ?? [];
        list.push({ optionIds: event.optionIds, correct: event.correct, firstTry: event.firstTry });
        this.answers.set(event.decisionId, list);
        break;
      }
      default:
        break;
    }
  }
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((p): p is { type: "text"; text: string } => !!p && typeof p === "object" && (p as { type?: unknown }).type === "text" && typeof (p as { text?: unknown }).text === "string")
    .map((p) => p.text)
    .join(" ");
}
