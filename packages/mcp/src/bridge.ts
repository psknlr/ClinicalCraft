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
 * The MCP client owns approvals: a call the gate would `ask` about is refused
 * with an explanation instead of waiting for a person who is not there.
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
  validateArgs,
  type AgentEvent,
  type AgentRole,
  type ClinicalSession,
  type CommandHookExecutor,
  type EventMsg,
  type HookInput,
  type HookResult,
  type PlanItem,
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
    }
  | { status: "refused"; reason: "deny" | "ask" | "hook"; message: string; ruleId: string | null };

export interface SessionToolRunnerOptions {
  /** Executor for settings command hooks (node). Without it only in-process hooks run (none here). */
  executor?: CommandHookExecutor;
  /** Project directory reported to hooks. */
  cwd?: string | null;
  /** Diagnostics (stderr). */
  log?: (message: string) => void;
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

  constructor(
    readonly session: ClinicalSession,
    private readonly opts: SessionToolRunnerOptions = {},
  ) {}

  /** The latest plan published with `update_workup`. */
  workupPlan(): { items: PlanItem[]; explanation: string | null } {
    return { items: this.plan.items.map((p) => ({ ...p })), explanation: this.plan.explanation };
  }

  /** Tool context for the learner, built on the session's public API. */
  context(signal?: AbortSignal): ToolContext {
    const s = this.session;
    return {
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

  /** Validate, gate and run `name` with `rawArgs`. Throws only for an unknown tool name. */
  async run(name: string, rawArgs: unknown, signal?: AbortSignal): Promise<ToolRunOutcome> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`unknown tool ${name}`);
    const L = this.session.locale;
    const validated = validateArgs(tool.inputSchema, rawArgs);
    if (!validated.ok) return { status: "done", output: { ok: false, output: validated.errors.join("; ") }, notices: [] };
    let input = validated.value as Record<string, unknown>;
    const ctx = this.context(signal);

    const pre = await this.runHook({ hook_event_name: "PreToolUse", agent: "learner", tool_name: name, tool_input: input }, signal);
    if (pre.blocked) return { status: "refused", reason: "hook", message: mm(L, "hook.blocked", { tool: name, reason: pre.reason ?? "" }), ruleId: null };
    if (pre.updatedInput !== undefined) {
      const again = validateArgs(tool.inputSchema, pre.updatedInput);
      if (!again.ok) return { status: "done", output: { ok: false, output: again.errors.join("; ") }, notices: [] };
      input = again.value as Record<string, unknown>;
    }

    const settings = this.session.settings;
    const check = checkPermission(tool, input, ctx, settings.approvalMode, settings.practiceScope, settings.permissions, this.permissions);
    if (check.decision === "deny") {
      return { status: "refused", reason: "deny", message: mm(L, "approval.denied", { tool: name, reason: check.reason, ruleId: check.ruleId }), ruleId: check.ruleId };
    }
    if (check.decision === "ask" && !pre.approved) {
      let specifier: string | null = null;
      try {
        specifier = tool.specifier?.(input, ctx) ?? null;
      } catch {
        specifier = null;
      }
      return {
        status: "refused",
        reason: "ask",
        message: mm(L, "approval.needed", { tool: name, reason: check.reason, ruleId: check.ruleId, rule: formatRule(name, specifier) }),
        ruleId: check.ruleId,
      };
    }

    const s = this.session.state;
    if (!tool.readOnly && !s.started && !s.finished) this.session.dispatch({ type: "start", by: "system" });

    const notices: string[] = [];
    const off = this.session.subscribe((event: AgentEvent) => {
      const msg: EventMsg = event.msg;
      if (msg.type === "notification") notices.push(msg.body ? `${msg.title}: ${msg.body}` : msg.title);
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
    return { status: "done", output, notices };
  }

  /** Talk to an NPC through the session (UserPromptSubmit hooks, patient pipeline, transcript). */
  private async ask(agent: AgentRole, utterance: string, signal?: AbortSignal): Promise<{ text: string; grounded: string[] }> {
    const onAbort = () => this.session.submit({ type: "interrupt" });
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const events = await this.session.run({ type: "user_message", text: utterance, to: agent });
      const replies = events.flatMap((e) => (e.msg.type === "agent_message" ? [e.msg] : []));
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
