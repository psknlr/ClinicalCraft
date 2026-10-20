/**
 * An external agent's tool calls (`external_tool_call`, the world bridge — docs/EMBODIED.md §12): validated and
 * queued one per call id, each cancellable on its own (`external_tool_cancel`: queued, it never runs; running,
 * it is aborted), and run as a clinician turn of their own through the clinician's tool path.
 */
import { executeToolCall } from "../loop.js";
import type { Op } from "../protocol.js";
import type { ToolContext, ToolDefinition } from "../tools/types.js";
import type { AgentOutcome } from "./autopilot.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";

/** Longest `external_tool_call` call id / tool name accepted (world bridge). */
const EXTERNAL_CALL_ID_MAX = 200;
const EXTERNAL_TOOL_NAME_MAX = 64;

type ExternalToolCall = Extract<Op, { type: "external_tool_call" }>;

/** The external agents' tool calls of one session. */
export class ExternalCalls {
  /** External agents' tool calls (world bridge) queued or running, by call id: their own cancellation. */
  private readonly calls = new Map<string, { controller: AbortController }>();

  constructor(private readonly k: SessionKernel) {}

  /** Queue an external agent's tool call (world bridge): validated, one per call id, cancellable on its own. */
  accept(id: string, op: ExternalToolCall): Promise<void> {
    const k = this.k;
    const L = k.locale;
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
      k.emit(id, { type: "error", message: rt(L, "bridge.invalidCall"), code: "invalid_op" });
      return Promise.resolve();
    }
    if (this.calls.has(callId)) {
      k.emit(id, { type: "error", message: rt(L, "bridge.duplicateCall", { callId }), code: "duplicate_call" });
      return Promise.resolve();
    }
    const entry = { controller: new AbortController() };
    this.calls.set(callId, entry);
    return k.ops.enqueue(id, op).finally(() => {
      if (this.calls.get(callId) === entry) this.calls.delete(callId);
    });
  }

  /** `external_tool_cancel`: out-of-band, like an interrupt — but only this call. */
  cancel(callId: unknown): void {
    const entry = typeof callId === "string" ? this.calls.get(callId) : undefined;
    entry?.controller.abort();
  }

  /**
   * An external agent's tool call (`external_tool_call`, world bridge — docs/EMBODIED.md §12): the clinician's
   * tool path (`executeToolCall` with the clinician's tools: allow-list, scope, deny rules, hooks, precheck, the
   * approval gate — an ask goes to the learner as an `approval_request`) in a clinician turn of its own. Its
   * outcome ends the turn: `turn_complete` when the tool ran (ok or not), `turn_aborted` `denied` (a rule, a hook
   * or the learner refused) or `interrupted` (cancelled by `external_tool_cancel` or an interrupt).
   */
  async run(id: string, op: ExternalToolCall, turnSignal: AbortSignal): Promise<void> {
    const k = this.k;
    const entry = this.calls.get(op.callId);
    if (!entry || entry.controller.signal.aborted || turnSignal.aborted) {
      k.emit(id, { type: "warning", message: rt(k.locale, "bridge.cancelledBeforeStart", { tool: String(op.tool) }) });
      return;
    }
    // Its caller stopped waiting while it was queued (and was told it timed out): never start it (review S11).
    if (typeof op.deadline === "number" && Number.isFinite(op.deadline) && k.now() >= op.deadline) {
      k.emit(id, { type: "warning", message: rt(k.locale, "bridge.deadlinePassed", { tool: String(op.tool) }) });
      return;
    }
    const signal = entry.controller.signal;
    // An interrupt (the learner's Esc, shutdown) cancels the call too.
    const onInterrupt = () => entry.controller.abort();
    turnSignal.addEventListener("abort", onInterrupt, { once: true });
    const turnId = k.newId();
    const started = k.now();
    k.emit(id, { type: "turn_started", turnId, agent: "clinician" });
    // The bypass guard, checked when the call RUNS (review S4): a call queued before the learner switched to
    // bypass would otherwise act with nothing asking the learner. Only a front-end that opted in is exempt.
    if (k.settings.approvalMode === "bypass" && op.allowBypass !== true) {
      turnSignal.removeEventListener("abort", onInterrupt);
      const output = rt(k.locale, "bridge.bypass");
      k.emit(id, { type: "tool_call_begin", turnId, agent: "clinician", callId: op.callId, tool: op.tool, args: op.args ?? {} });
      k.emit(id, { type: "tool_call_end", turnId, agent: "clinician", callId: op.callId, tool: op.tool, ok: false, output, durationMs: 0 });
      k.agents.finishTurn(id, turnId, "clinician", { status: "denied", text: "", grounded: [] }, started);
      return;
    }
    // A state-changing tool starts the encounter once the gate let it through (as the learner's and MCP's paths do).
    const tools = k.toolsFor("clinician").map((tool): ToolDefinition<any> =>
      tool.readOnly
        ? tool
        : {
            ...tool,
            run: (args: Record<string, unknown>, ctx: ToolContext) => {
              k.ensureStarted(id);
              return tool.run(args, ctx);
            },
          },
    );
    let status: AgentOutcome["status"] = "end_turn";
    try {
      const outcome = await executeToolCall({
        host: k.tools.loopHost(id),
        agent: "clinician",
        tools,
        call: { id: op.callId, name: op.tool, args: op.args ?? {} },
        ctx: k.tools.context("clinician", id, signal),
        emit: (msg) => k.emit(id, msg),
        turnId,
        signal,
        now: k.now,
      });
      if (outcome.status === "denied" || outcome.status === "blocked") status = "denied";
      // A tool that stopped short because the call was cancelled (a walk interrupted mid-way) was cancelled too.
      else if (outcome.status === "cancelled" || outcome.status === "interrupted" || (signal.aborted && outcome.status !== "ok")) status = "interrupted";
    } finally {
      turnSignal.removeEventListener("abort", onInterrupt);
    }
    k.agents.finishTurn(id, turnId, "clinician", { status, text: "", grounded: [] }, started);
  }
}
