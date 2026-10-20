/**
 * The run recorder: everything a benchmark run observed, taken from the
 * session's event stream — the tool calls of the agent under test (model
 * tool calls, identified by the ids the model issued; the reference
 * solver's API calls are recorded by the solver itself), every refusal
 * normalised to a stable code (`REFUSAL_CODES`), approvals, world action
 * results, clinical events, token usage and the simulated clock.
 *
 * Refusal sources: a failed world action (`world_action_result`, any actor,
 * nested ones included); a denied approval request (`APPROVAL_DENIED`); a
 * tool call refused by the approval gate without asking (deny rule, scope,
 * plan mode → `APPROVAL_DENIED`), by a hook (`HOOK_BLOCKED`), by its own
 * validation (`UNKNOWN_TOOL`, `INVALID_ARGS`) or the spatial gate (its
 * `data.code`); a learner action's `error` event; an engine rejection
 * (`action.rejected` → `CLINICAL_REJECTED`, the engine code as `detail`).
 */
import { ACTION_TOOL, rt, type AgentEvent, type ApprovalDecision, type ClinicalSession, type RiskLevel, type TokenUsage } from "@clinicalcraft/agent";
import type { DomainEvent } from "@clinicalcraft/core";
import type { WorldActionResult } from "@clinicalcraft/world";

/** One tool call of the agent under test. */
export interface RecordedCall {
  tool: string;
  args: unknown;
  ok: boolean;
  /** The refusal code when the call failed. */
  code?: string;
  /** First line of the tool output (≤ 240 characters). */
  output: string;
  /** Real wall time of the call (ms). */
  ms: number;
}

/** A refusal, normalised. */
export interface RecordedRefusal {
  code: string;
  /** Engine rejection code, world message… */
  detail?: string;
  tool?: string;
  target?: string;
  actionId?: string;
  source: "world" | "tool" | "approval" | "gate" | "learner" | "engine";
  message: string;
}

export interface RecordedApproval {
  requestId: string;
  agent: string;
  tool: string;
  args: unknown;
  risk: RiskLevel;
  ruleId: string;
  decision: ApprovalDecision | null;
}

const SENTINEL = "\u0000";

/** The text of a runtime message up to its first placeholder, in both languages. */
function prefixes(key: Parameters<typeof rt>[1]): string[] {
  return ["en", "zh-CN"].map((l) => rt(l, key, { reason: SENTINEL, tool: SENTINEL, errors: SENTINEL, tools: SENTINEL, message: SENTINEL }).split(SENTINEL)[0]!).filter((p) => p.length > 3);
}

const DENIED = prefixes("tool.denied");
const DENIED_BY_PERSON = prefixes("tool.deniedByLearner");
const HOOK = prefixes("tool.blockedByHook");
const UNKNOWN_TOOL = prefixes("tool.unknownTool");
const INVALID_ARGS = prefixes("tool.invalidArgs");

const startsWithAny = (text: string, list: readonly string[]) => list.some((p) => text.startsWith(p));

function firstLine(text: string, max = 240): string {
  const line = (text ?? "").split("\n")[0] ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** Classify a failed tool output (null: covered by another source — a world action or an approval). */
export function classifyToolFailure(output: string, data: unknown): { code: string; detail?: string } | "covered" {
  const d = (data ?? {}) as { code?: unknown; result?: { errorCode?: unknown }; rejected?: { code?: unknown } };
  if (typeof d.code === "string") return { code: d.code };
  if (d.result && typeof d.result === "object") return "covered";
  if (d.rejected && typeof d.rejected === "object") return { code: "CLINICAL_REJECTED", ...(typeof d.rejected.code === "string" ? { detail: d.rejected.code } : {}) };
  if (startsWithAny(output, DENIED_BY_PERSON)) return "covered";
  if (startsWithAny(output, DENIED)) return { code: "APPROVAL_DENIED" };
  if (startsWithAny(output, HOOK)) return { code: "HOOK_BLOCKED" };
  if (startsWithAny(output, UNKNOWN_TOOL)) return { code: "UNKNOWN_TOOL" };
  if (startsWithAny(output, INVALID_ARGS)) return { code: "INVALID_ARGS" };
  return { code: "TOOL_ERROR" };
}

export interface RunRecorderOptions {
  /** The agent under test (its model tool calls are the run's calls). */
  agent?: string;
  /** Called after every recorded call (limit checks). */
  onCall?: (count: number) => void;
  /** Called on every token usage update (budget checks). */
  onUsage?: (total: TokenUsage, delta: TokenUsage) => void;
  /** Called when the simulated clock changes. */
  onClock?: (clock: number) => void;
  /** Real clock (ms) for call latencies. */
  now?: () => number;
}

export class RunRecorder {
  readonly calls: RecordedCall[] = [];
  readonly refusals: RecordedRefusal[] = [];
  readonly approvals: RecordedApproval[] = [];
  /** World action results by action id (any actor). */
  readonly worldResults = new Map<string, WorldActionResult>();
  /** Clinical (engine) events in order, with their trace id (`ev-<seq>`). */
  readonly clinicalEvents: { ev: string; event: DomainEvent }[] = [];
  usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  clock = 0;
  private readonly modelCalls = new Set<string>();
  private readonly open = new Map<string, { tool: string; args: unknown; t0: number }>();
  private readonly agent: string;
  private readonly now: () => number;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly session: ClinicalSession,
    private readonly options: RunRecorderOptions = {},
  ) {
    this.agent = options.agent ?? "clinician";
    this.now = options.now ?? (() => performance.now());
    this.clock = session.state.clock;
  }

  /** Start listening (returns a function that stops). */
  attach(): () => void {
    this.unsubscribe = this.session.subscribe((e) => this.observe(e));
    return () => this.detach();
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** A tool call the model issued (the provider wrapper reports it before the loop runs it). */
  noteModelToolCall(callId: string): void {
    this.modelCalls.add(callId);
  }

  /** Record a call made by the reference solver (it does not go through a model). */
  record(call: RecordedCall): void {
    this.calls.push({ ...call, output: firstLine(call.output) });
    this.options.onCall?.(this.calls.length);
  }

  /** Name the tool of the refusals recorded since `index` that have none (a solver's call that ran as an op). */
  tagSince(index: number, tool: string): void {
    for (const r of this.refusals.slice(index)) if (!r.tool) r.tool = tool;
  }

  private pushRefusal(r: RecordedRefusal): void {
    const last = this.refusals.at(-1);
    // The same refusal reported twice in a row (a learner error after its approval denial) counts once.
    if (last && last.code === r.code && last.tool === r.tool && last.actionId === r.actionId && last.message === r.message) return;
    this.refusals.push(r);
  }

  private observe(e: AgentEvent): void {
    const msg = e.msg;
    switch (msg.type) {
      case "tool_call_begin":
        if (this.modelCalls.has(msg.callId)) this.open.set(msg.callId, { tool: msg.tool, args: msg.args, t0: this.now() });
        break;
      case "tool_call_end": {
        let code: string | undefined;
        if (!msg.ok) {
          const c = classifyToolFailure(msg.output, msg.data);
          if (c === "covered") {
            const actionId = (msg.data as { result?: WorldActionResult } | undefined)?.result?.actionId;
            const covered = actionId ? this.refusals.find((r) => r.actionId === actionId) : [...this.refusals].reverse().find((r) => r.source === "approval");
            if (covered && !covered.tool) covered.tool = msg.tool;
            code = covered?.code ?? (msg.data as { result?: WorldActionResult } | undefined)?.result?.errorCode ?? "APPROVAL_DENIED";
          } else {
            code = c.code;
            this.pushRefusal({ code: c.code, ...(c.detail ? { detail: c.detail } : {}), tool: msg.tool, source: c.code === "APPROVAL_DENIED" ? "gate" : "tool", message: firstLine(msg.output) });
          }
        }
        const open = this.open.get(msg.callId);
        if (open && String(msg.agent) === this.agent) {
          this.open.delete(msg.callId);
          this.calls.push({ tool: msg.tool, args: open.args, ok: msg.ok, ...(code ? { code } : {}), output: firstLine(msg.output), ms: Math.max(0, this.now() - open.t0) });
          this.options.onCall?.(this.calls.length);
        }
        break;
      }
      case "world_action_result": {
        const r = msg.result;
        this.worldResults.set(r.actionId, r);
        if (r.status !== "completed") this.pushRefusal({ code: r.errorCode ?? "TOOL_ERROR", source: "world", actionId: r.actionId, message: firstLine(r.message) });
        break;
      }
      case "approval_request":
        this.approvals.push({ requestId: msg.requestId, agent: String(msg.agent), tool: msg.tool, args: msg.args, risk: msg.risk, ruleId: msg.ruleId, decision: null });
        break;
      case "approval_resolved": {
        const a = this.approvals.find((x) => x.requestId === msg.requestId);
        if (a) a.decision = msg.decision;
        if (msg.decision === "denied" || msg.decision === "abort") this.pushRefusal({ code: "APPROVAL_DENIED", source: "approval", ...(a ? { tool: a.tool } : {}), message: msg.reason ?? msg.decision });
        break;
      }
      case "error": {
        const code = msg.code ?? "";
        if (code === "SPATIAL_REQUIREMENT_UNMET" || code === "SPATIAL_PRECONDITION_CHANGED") this.pushRefusal({ code, source: "learner", message: firstLine(msg.message) });
        else if (code === "permission_denied") {
          const last = this.refusals.at(-1);
          // The learner's error repeats a denied approval request's reason: one refusal.
          if (!(last?.source === "approval" && msg.message.includes(last.message))) this.pushRefusal({ code: "APPROVAL_DENIED", source: "gate", message: firstLine(msg.message) });
        } else if (code === "invalid_action") this.pushRefusal({ code: "INVALID_ARGS", source: "learner", message: firstLine(msg.message) });
        break;
      }
      case "clinical_event": {
        this.clinicalEvents.push({ ev: `ev-${e.seq}`, event: msg.event });
        if (msg.event.type === "action.rejected") {
          const tool = ACTION_TOOL[msg.event.action] ?? undefined;
          this.pushRefusal({ code: "CLINICAL_REJECTED", detail: msg.event.code, ...(tool ? { tool } : {}), source: "engine", message: firstLine(msg.event.message) });
        }
        break;
      }
      case "token_usage": {
        this.usage = { ...msg.total };
        this.options.onUsage?.(this.usage, msg.usage);
        break;
      }
      case "state_snapshot":
        if (msg.state.clock !== this.clock) {
          this.clock = msg.state.clock;
          this.options.onClock?.(this.clock);
        }
        break;
      default:
        break;
    }
  }
}
