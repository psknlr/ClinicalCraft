/**
 * Runs the agent package's clinical tools on a `ClinicalSession` for an
 * external caller (the MCP client plays the learner/clinician), using only
 * the session's public API:
 *
 *   validate (agent `validateArgs`) → PreToolUse hooks (settings command
 *   hooks via `HookRunner`) → approval gate (`checkPermission`, the same
 *   ladder the session uses) → start the encounter for state-changing tools →
 *   `tool.run()` with a `ToolContext` whose `dispatch` is `session.dispatch`
 *   and whose `ask` sends a `user_message` op to the NPC → PostToolUse hooks.
 *
 * Approvals are a two-step confirmation: a call the gate would `ask` about
 * (high-risk / always-ask actions such as thrombolysis, ask rules, strict
 * mode…) is refused with an explanation of the risk and asks the client to
 * call again with `confirm: true` once its user agreed; the confirmed repeat
 * of that same call (same tool, input and gate rule, within
 * `CONFIRM_TTL_MS`, once) runs. `confirm: true` on a first attempt is
 * refused like an unconfirmed call. Deny rules, plan mode and the practice
 * scope are never overridden.
 *
 * Embodied sessions (PROTOCOL §12): the session's own definitions run — the
 * spatially gated clinical tools and the world tools. An approval the
 * session asks for INSIDE a call (a world operation's clinical effect runs
 * the clinical tool through the session's learner path; delegated and skill
 * steps likewise) is answered `denied` and the call is refused as needing
 * confirmation, NAMING that step; the refusal records the ask (tool, rule,
 * specifier, arguments). A confirmed repeat approves exactly the inner asks
 * its refusals named — each once — and refuses any other the same way
 * (review S1): confirming the call itself (its own gate rule) never approves
 * what it asks inside, and the named asks accumulate across repeats (with
 * the call's own confirmation). A skill's clinical acts done by an earlier
 * attempt of the same call are not done again (`CallProgress`).
 *
 * Gap (CONTRACT CHANGE REQUEST): `ClinicalSessionApi` has no public
 * `runTool()`, so this mirrors the session's private learner-tool path, and
 * `update_workup` plans live here (the session's `workupPlan()` and
 * `plan_updated` events do not see them).
 */
import {
  checkPermission,
  clinicalTools,
  formatRule,
  HookRunner,
  PermissionState,
  rt,
  validateArgs,
  type RuntimeKey,
  type AgentEvent,
  type AgentRole,
  type CallProgress,
  type ClinicalSession,
  type CommandHookExecutor,
  type EventMsg,
  type HookInput,
  type HookResult,
  type PlanItem,
  type RiskLevel,
  type ToolContext,
  type ToolDefinition,
  type ToolOutput,
} from "@clinicalcraft/agent";
import { mm } from "./i18n.js";

/** Outcome of one bridged tool call. */
export type ToolRunOutcome =
  | {
      status: "done";
      output: ToolOutput;
      /** Learner-visible notifications raised while the tool ran (alarms, nurse calls…). */
      notices: string[];
      /**
       * Session warnings raised while the tool ran — e.g. an agent answering
       * with the deterministic offline responder (no API key, model error,
       * refusal) or a reply replaced by the authored answer. Never silent.
       */
      warnings?: string[];
    }
  | {
      status: "refused";
      reason: "deny" | "ask" | "hook";
      message: string;
      ruleId: string | null;
      /** For `ask`: the risk the gate saw (the client must re-call with `confirm: true`). */
      risk?: RiskLevel;
      /** For `ask`: `confirm: true` was sent without an earlier refusal of this exact call. */
      unconfirmed?: boolean;
      /** An approval asked inside the call: the tool it was for (e.g. `intervene` behind `interact_object`). */
      innerTool?: string;
      /** What the refused step or call does ("Give Tenecteplase?"; a skill: its steps). */
      summary?: string;
      /** What the call did before the refused step (its own output). */
      detail?: string;
    };

/** Per-call options of `SessionToolRunner.run`. */
export interface ToolRunOptions {
  /** The client confirmed this exact call with its user (`confirm: true`): an `ask` from the gate runs. */
  confirmed?: boolean;
}

export interface SessionToolRunnerOptions {
  /** Executor for settings command hooks (node). Without it only in-process hooks run (none here). */
  executor?: CommandHookExecutor;
  /** Project directory reported to hooks. */
  cwd?: string | null;
  /** Diagnostics (stderr). */
  log?: (message: string) => void;
  /** Clock for confirmation expiry (default `Date.now`). */
  now?: () => number;
}

/** How long a refused call waits for its `confirm: true` repeat. */
export const CONFIRM_TTL_MS = 10 * 60_000;
const MAX_PENDING_CONFIRMATIONS = 32;

/** Canonical JSON (sorted keys) of a value. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Identity of a call for the two-step confirmation: tool + validated input. */
function callKey(tool: string, input: unknown): string {
  return `${tool}\u0000${canonicalJson(input)}`;
}

/** Identity of an approval asked inside a call: its tool, gate rule, canonical specifier and arguments. */
function innerAskKey(tool: string, ruleId: string, specifier: string | null, args: unknown): string {
  return `${tool}\u0000${ruleId}\u0000${specifier ?? ""}\u0000${canonicalJson(args ?? {})}`;
}

/** An approval the session asked for inside a bridged call. */
interface InnerAsk {
  key: string;
  tool: string;
  specifier: string | null;
  ruleId: string;
  risk: RiskLevel;
  reason: string;
  summary: string;
}

/** A call refused as needing confirmation, waiting for its confirmed repeat (review S1). */
interface PendingCall {
  /** Expiry (ms since epoch). */
  until: number;
  /** The gate rule that asked about the call itself — a confirmed repeat passes it (null: it did not ask). */
  outer: string | null;
  /** Keys of the inner asks the refusals named (accumulated across repeats): each approves ONE matching ask. */
  inner: string[];
  /** Clinical acts earlier attempts of the call did (a skill's steps): never done again. */
  progress: CallProgress;
}

type HookSpec =
  | { hook_event_name: "PreToolUse"; agent: string; tool_name: string; tool_input: unknown }
  | { hook_event_name: "PostToolUse"; agent: string; tool_name: string; tool_input: unknown; tool_response: { ok: boolean; output: string } };

/** Every bridged tool by name (the clinical tools of PROTOCOL §3, without the dynamic `walk_to`). */
export function bridgedTools(): Map<string, ToolDefinition<Record<string, unknown>>> {
  return new Map(clinicalTools().map((t) => [t.name, t]));
}

/** Runs tools as the learner on one session. Not re-entrant: callers serialise calls per session. */
export class SessionToolRunner {
  private readonly tools = bridgedTools();
  private readonly hookRunner = new HookRunner();
  private readonly permissions = new PermissionState();
  private plan: { items: PlanItem[]; explanation: string | null } = { items: [], explanation: null };
  /** Calls refused as needing confirmation, by `callKey`. */
  private readonly pending = new Map<string, PendingCall>();

  constructor(
    readonly session: ClinicalSession,
    private readonly opts: SessionToolRunnerOptions = {},
  ) {}

  private setPending(key: string, call: Omit<PendingCall, "until">): void {
    const now = this.now();
    for (const [k, p] of this.pending) if (p.until <= now) this.pending.delete(k);
    this.pending.delete(key);
    this.pending.set(key, { ...call, until: now + CONFIRM_TTL_MS });
    while (this.pending.size > MAX_PENDING_CONFIRMATIONS) this.pending.delete(this.pending.keys().next().value!);
  }

  /** The unexpired record of a refused call (left in place). */
  private pendingCall(key: string): PendingCall | null {
    const p = this.pending.get(key);
    if (p && p.until > this.now()) return p;
    this.pending.delete(key);
    return null;
  }

  /** A tool's rule specifier for these arguments (null when it has none or it fails). */
  private specifierOf(tool: ToolDefinition<Record<string, unknown>> | undefined, args: Record<string, unknown>, ctx: ToolContext): string | null {
    try {
      return tool?.specifier?.(args, ctx) ?? null;
    } catch {
      return null;
    }
  }

  /** A tool's approval summary ("" when it fails). */
  private summaryOf(tool: ToolDefinition<Record<string, unknown>> | undefined, args: Record<string, unknown>, ctx: ToolContext): string {
    try {
      return tool?.summarize(args, ctx) ?? "";
    } catch {
      return "";
    }
  }

  private now(): number {
    return this.opts.now?.() ?? Date.now();
  }

  /** The latest plan published with `update_workup`. */
  workupPlan(): { items: PlanItem[]; explanation: string | null } {
    return { items: this.plan.items.map((p) => ({ ...p })), explanation: this.plan.explanation };
  }

  /**
   * The definition a call runs: an embodied session's own (spatially gated clinical tools, world tools),
   * else the bridged clinical tool.
   */
  private toolFor(name: string): ToolDefinition<Record<string, unknown>> | undefined {
    if (this.session.embodiment === "embodied") return (this.session.tool(name) as ToolDefinition<Record<string, unknown>> | undefined) ?? this.tools.get(name);
    return this.tools.get(name);
  }

  /** Tool context for the learner, built on the session's public API. */
  context(signal?: AbortSignal, progress?: CallProgress): ToolContext {
    const s = this.session;
    return {
      ...(progress ? { progress } : {}),
      caseDef: s.caseDef,
      facility: s.facility,
      catalogs: s.catalogs,
      locale: s.locale,
      agent: "learner",
      state: () => s.state,
      dispatch: (action) => s.dispatch(action),
      ask: (agent, utterance, sig) => this.ask(agent, utterance, sig ?? signal),
      updatePlan: (plan, explanation) => {
        this.plan = { items: plan.map((p) => ({ text: p.text, status: p.status })), explanation: explanation ?? null };
      },
      ...(signal ? { signal } : {}),
    };
  }

  /**
   * Validate, gate and run `name` with `rawArgs`. A gate `ask` runs only with
   * `options.confirmed` (else it is refused with the reason, for a second,
   * confirmed call). Throws only for an unknown tool name.
   */
  async run(name: string, rawArgs: unknown, signal?: AbortSignal, options: ToolRunOptions = {}): Promise<ToolRunOutcome> {
    const tool = this.toolFor(name);
    if (!tool) throw new Error(`unknown tool ${name}`);
    const L = this.session.locale;
    // A call cancelled while it waited behind another call on this session must not act.
    const aborted = (): ToolRunOutcome => ({ status: "done", output: { ok: false, output: mm(L, "tool.aborted", { tool: name }) }, notices: [] });
    if (signal?.aborted) return aborted();
    const validated = validateArgs(tool.inputSchema, rawArgs);
    if (!validated.ok) return { status: "done", output: { ok: false, output: validated.errors.join("; ") }, notices: [] };
    let input = validated.value as Record<string, unknown>;

    const pre = await this.runHook({ hook_event_name: "PreToolUse", agent: "learner", tool_name: name, tool_input: input }, signal);
    if (pre.blocked) return { status: "refused", reason: "hook", message: mm(L, "hook.blocked", { tool: name, reason: pre.reason ?? "" }), ruleId: null };
    if (pre.updatedInput !== undefined) {
      const again = validateArgs(tool.inputSchema, pre.updatedInput);
      if (!again.ok) return { status: "done", output: { ok: false, output: again.errors.join("; ") }, notices: [] };
      input = again.value as Record<string, unknown>;
    }

    // What earlier refused attempts of this very call recorded (review S1): the approvals they named, the acts done.
    const key = callKey(name, input);
    const prior = this.pendingCall(key);
    const confirming = options.confirmed === true && prior !== null;
    const progress: CallProgress = prior?.progress ?? { done: new Map() };
    const ctx = this.context(signal, progress);

    // A call that cannot run is refused before the gate (e.g. a locked decision: no confirmation round-trip).
    const early = tool.precheck?.(input, ctx);
    if (early) return { status: "done", output: early, notices: [] };

    const settings = this.session.settings;
    const check = checkPermission(tool, input, ctx, settings.approvalMode, settings.practiceScope, settings.permissions, this.permissions);
    if (check.decision === "deny") {
      return { status: "refused", reason: "deny", message: mm(L, "approval.denied", { tool: name, reason: check.reason, ruleId: check.ruleId }), ruleId: check.ruleId };
    }
    // The gate asks about the call itself: only the confirmed repeat of a call refused for that rule runs.
    const outer = check.decision === "ask" && !pre.approved ? check.ruleId : null;
    if (outer !== null && !(confirming && prior!.outer === outer)) {
      this.setPending(key, { outer, inner: prior?.inner ?? [], progress });
      const summary = this.summaryOf(tool, input, ctx);
      const message = mm(L, options.confirmed === true && !confirming ? "approval.confirmFirst" : "approval.needed", {
        tool: name,
        reason: check.reason,
        ruleId: check.ruleId,
        rule: formatRule(name, this.specifierOf(tool, input, ctx)),
        risk: rt(L, `perm.risk.${check.risk}` as RuntimeKey),
      });
      return {
        status: "refused",
        reason: "ask",
        // What the call does — a skill: every step it runs (its clinical acts are confirmed one by one when asked).
        message: summary ? `${message}\n${rt(L, "confirm.what", { summary })}` : message,
        ruleId: check.ruleId,
        risk: check.risk,
        ...(summary ? { summary } : {}),
        ...(options.confirmed === true && !confirming ? { unconfirmed: true } : {}),
      };
    }

    if (signal?.aborted) return aborted(); // cancelled while hooks ran
    const s = this.session.state;
    if (!tool.readOnly && !s.started && !s.finished) this.session.dispatch({ type: "start", by: "system" });

    const notices: string[] = [];
    const warnings: string[] = [];
    // Approvals the session asks for inside this call: on a confirmed repeat, exactly the asks its refusals named
    // (each once); anything else is denied and named in a new refusal — never derived from confirming the call.
    const approvable = confirming ? [...prior!.inner] : [];
    const refusedAsks: InnerAsk[] = [];
    const off = this.session.subscribe((event: AgentEvent) => {
      const msg: EventMsg = event.msg;
      if (msg.type === "notification") notices.push(msg.body ? `${msg.title}: ${msg.body}` : msg.title);
      if (msg.type === "warning" && !warnings.includes(msg.message)) warnings.push(msg.message);
      if (msg.type === "approval_request") {
        const args = (msg.args && typeof msg.args === "object" ? msg.args : {}) as Record<string, unknown>;
        const specifier = this.specifierOf(this.toolFor(msg.tool), args, ctx);
        const askKey = innerAskKey(msg.tool, msg.ruleId, specifier, args);
        const at = approvable.indexOf(askKey);
        if (at >= 0) approvable.splice(at, 1);
        else refusedAsks.push({ key: askKey, tool: msg.tool, specifier, ruleId: msg.ruleId, risk: msg.risk, reason: msg.reason, summary: msg.summary });
        this.session.submit({
          type: "approval_response",
          requestId: msg.requestId,
          decision: at >= 0 ? "approved" : "denied",
          reason: at >= 0 ? "confirmed by the MCP client (confirm: true)" : "needs confirmation: the MCP client must call again with confirm: true",
        });
      }
    });
    let output: ToolOutput;
    try {
      output = await tool.run(input, ctx);
    } catch (err) {
      output = { ok: false, output: signal?.aborted ? mm(L, "tool.aborted", { tool: name }) : mm(L, "tool.failed", { tool: name, message: err instanceof Error ? err.message : String(err) }) };
    } finally {
      off();
    }
    await this.runHook({ hook_event_name: "PostToolUse", agent: "learner", tool_name: name, tool_input: input, tool_response: { ok: output.ok, output: output.output } }, signal);
    for (const w of warnings) this.opts.log?.(w);
    const asked = refusedAsks[0];
    if (asked) {
      // Named now: confirmable on the next repeat, with the call's own confirmation and what is still unused (an
      // unconfirmed attempt keeps what earlier refusals named — once: naming an ask again never doubles it).
      const inner = confirming ? [...approvable] : [...(prior?.inner ?? [])];
      for (const a of refusedAsks) if (confirming || !inner.includes(a.key)) inner.push(a.key);
      this.setPending(key, { outer, inner, progress });
      const message = mm(L, "approval.needed", {
        tool: name,
        reason: asked.reason,
        ruleId: asked.ruleId,
        rule: formatRule(asked.tool, asked.specifier),
        risk: rt(L, `perm.risk.${asked.risk}` as RuntimeKey),
      });
      return {
        status: "refused",
        reason: "ask",
        message: `${message}\n${rt(L, "confirm.innerStep", { tool: name, summary: asked.summary || formatRule(asked.tool, asked.specifier) })}`,
        ruleId: asked.ruleId,
        risk: asked.risk,
        innerTool: asked.tool,
        ...(asked.summary ? { summary: asked.summary } : {}),
        detail: output.output,
      };
    }
    // Done: the confirmation (and the record of this call's attempts) is used up.
    this.pending.delete(key);
    return { status: "done", output, notices, ...(warnings.length > 0 ? { warnings } : {}) };
  }

  /** Talk to an NPC through the session (UserPromptSubmit hooks, patient pipeline, transcript). */
  private async ask(agent: AgentRole, utterance: string, signal?: AbortSignal): Promise<{ text: string; grounded: string[] }> {
    const onAbort = () => this.session.submit({ type: "interrupt" });
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const events = await this.session.run({ type: "user_message", text: utterance, to: agent });
      // Only the addressed agent's own turn (a companion answers in the patient's turn). Staff lines
      // its actions triggered (alarms, critical-result calls, announcements) are synthetic turns:
      // the client gets those as notices from their `notification` events, never as the reply.
      const speakers = new Set<string>(agent === "patient" ? ["patient", "companion"] : [agent]);
      const turns = new Set(events.flatMap((e) => (e.msg.type === "turn_started" && !e.msg.synthetic && speakers.has(e.msg.agent) ? [e.msg.turnId] : [])));
      const replies = events.flatMap((e) => (e.msg.type === "agent_message" && turns.has(e.msg.turnId) ? [e.msg] : []));
      if (replies.length > 0) {
        return { text: replies.map((r) => r.text).join("\n"), grounded: [...new Set(replies.flatMap((r) => r.grounded))] };
      }
      const problems = events.flatMap((e) => (e.msg.type === "error" || e.msg.type === "warning" ? [e.msg.message] : []));
      throw new Error(problems.join("; ") || `no reply from ${agent}`);
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
  }

  private async runHook(spec: HookSpec, signal?: AbortSignal): Promise<HookResult> {
    const s = this.session;
    const input = {
      session_id: s.id,
      case_id: s.caseDef.id,
      transcript_path: null,
      cwd: this.opts.cwd ?? null,
      approval_mode: s.settings.approvalMode,
      locale: s.locale,
      ...spec,
    } as HookInput;
    const result = await this.hookRunner.runHooks(spec.hook_event_name, input, {
      settingsHooks: s.settings.hooks,
      ...(this.opts.executor ? { executor: this.opts.executor } : {}),
      ...(signal ? { signal } : {}),
    });
    for (const w of result.warnings) this.opts.log?.(w);
    return result;
  }
}
