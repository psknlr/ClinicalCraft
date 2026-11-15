/**
 * The `team` tool over MCP (docs/PROTOCOL.md §11; docs/TEAM.md §5): the learner's part in the care team — the team now,
 * a round, a run, a reply, a request about the field, a need, the count, playing the part or watching it played — each
 * the session's own `team` op (agent `teamToolCall`), worded by the agent (`teamToolResult`, an observer refusal naming
 * this tool's `play`); and the stand-in surgeon's call-out answered (A7).
 *
 * A call-out is an approval request raised in the middle of a team round (the stand-in's clip, division, coagulation or
 * bail-out): the round waits for the learner's answer, and over MCP the learner answers with another call. So a `step`
 * or `run` that meets one returns at once with the call-out pending (`status` lists it), the op still running; `callout
 * {decision}` answers it (approve: No objection; deny: Stop — the stand-in stops, looks and asks what the learner sees,
 * until they say go on: `reply {kind: "confirm"}`) and the call returns where the run then stops — its end or the next
 * call-out. While one is pending, a call that would queue behind the waiting round is refused, saying so (only reading
 * tools and the team's status run). A `run` stops where the stand-in waits on the learner (agent `owedByLearner`): while
 * their answer or count is still owed it does not start. After a round or a run the staff take their own round
 * (`staff_step`), as a headless driver does, so the stand-in sees the world as it now is.
 */
import { isCalloutRequest, rt, runHeld, staffName, TEAM_TOOL, teamToolCall, teamToolResult, type AgentEvent, type CalloutPending, type ClinicalSession, type TeamOp } from "@clinicalcraft/agent";
import { mm } from "./i18n.js";
import type { McpSession } from "./sessions.js";
import { textResult, type McpToolResult } from "./tools.js";

/** A `step` or `run` under way: its events since the last call reported them, and a call-out waiting for the learner. */
export interface TeamRun {
  /** Every event since the op began (`reported`: how many a call has already reported). */
  events: AgentEvent[];
  reported: number;
  finished: boolean;
  /** The stand-in's call-out waiting for the learner's answer (an approval request of the round). */
  callout: CalloutPending | null;
  /** Wakes the call waiting on the run (a call-out raised, or the op done). */
  wake: (() => void) | null;
}

/** The runs under way, by MCP session. */
const runs = new WeakMap<McpSession, TeamRun>();

/** The call-out waiting for this session's learner (the team tool's `callout`), or null. */
export function pendingCallout(entry: McpSession): CalloutPending | null {
  return runs.get(entry)?.callout ?? null;
}

/** How the learner answers a call-out with this tool. */
function calloutHow(locale: string): string {
  return mm(locale, "team.calloutHow");
}

/** The result of a team call: what was said since the last report, the session's words, the team now, a call-out pending. */
function result(entry: McpSession, events: readonly AgentEvent[], callout: CalloutPending | null): McpToolResult {
  const s = entry.session;
  const L = s.locale;
  const out = teamToolResult({ caseDef: s.caseDef, facility: s.facility, state: s.state, locale: L }, s.team(), events, callout ? { pending: callout, how: calloutHow(L) } : null);
  return textResult(out.text, { session_id: entry.id, tool: TEAM_TOOL.name, ok: out.ok, ...out.data }, !out.ok);
}

/**
 * Begin a team op (`step` or `run`, or any other `team` op) and wait until it ends or meets a call-out; the run is kept
 * while a call-out waits, so `callout` can answer it and wait on.
 */
function begin(entry: McpSession, op: TeamOp): TeamRun {
  const s = entry.session;
  const run: TeamRun = { events: [], reported: 0, finished: false, callout: null, wake: null };
  const off = s.subscribe((e) => {
    run.events.push(e);
    if (e.msg.type !== "approval_request") return;
    const req = e.msg;
    if (isCalloutRequest(s.caseDef, s.state, req)) {
      run.callout = { requestId: req.requestId, actorId: req.actorId, who: staffName({ facility: s.facility, locale: s.locale }, req.actorId), line: req.callout };
      run.wake?.();
      return;
    }
    // the team's own steps are never asked about but the stand-in's call-out: anything else is not answered here
    s.submit({ type: "approval_response", requestId: req.requestId, decision: "denied", reason: "not a call-out: the MCP team tool answers only the stand-in's call-out" });
  });
  runs.set(entry, run);
  void s
    .run(op)
    .catch(() => undefined)
    .then(async () => {
      off();
      // the staff's own round, as a headless driver sends it: the world as it now is reaches the record (a gas fault)
      if (op.action === "step" || op.action === "run") await s.run({ type: "staff_step" }).catch(() => undefined);
      run.finished = true;
      if (runs.get(entry) === run) runs.delete(entry);
      run.wake?.();
    });
  return run;
}

/** Wait until the run ends or a call-out waits; what it said since the last report. */
async function settle(entry: McpSession, run: TeamRun): Promise<McpToolResult> {
  if (!run.finished && !run.callout) await new Promise<void>((resolve) => (run.wake = resolve));
  run.wake = null;
  const fresh = run.events.slice(run.reported);
  run.reported = run.events.length;
  return result(entry, fresh, run.finished ? null : run.callout);
}

/** The `team` tool on one session (serialised with its other calls by the caller). */
export async function teamTool(entry: McpSession, args: Record<string, unknown>): Promise<McpToolResult> {
  const s: ClinicalSession = entry.session;
  const L = s.locale;
  // no care team that works on its own here (a case without a team, a clinical session): every action says so
  if (!s.caseDef.team || s.embodiment !== "embodied") return textResult(rt(L, "teamText.noTeam"), { session_id: entry.id, tool: TEAM_TOOL.name, ok: false, error: "no_team", team: null, callout: null }, true);
  const { session_id: _sid, ...rest } = args;
  const call = teamToolCall(rest, s.team(), L);
  if ("error" in call) return textResult(call.error, { session_id: entry.id, tool: TEAM_TOOL.name, ok: false, error: "invalid_op" }, true);
  const run = runs.get(entry) ?? null;
  if (call.action === "status") return result(entry, [], run?.callout ?? null);
  if (call.action === "callout") {
    const pending = run?.callout ?? null;
    if (!run || !pending) return textResult(rt(L, "teamText.calloutNone"), { session_id: entry.id, tool: TEAM_TOOL.name, ok: false, error: "no_callout" }, true);
    run.callout = null;
    s.submit({ type: "approval_response", requestId: pending.requestId, decision: call.approve ? "approved" : "denied", ...(call.approve ? {} : { reason: "Stop" }) });
    return settle(entry, run);
  }
  // a call-out waits: the round it stopped in holds the session's queue until the learner answers it
  if (run?.callout) return calloutFirst(entry, run.callout);
  // a run stops where the stand-in waits on the learner: while their answer or count is owed it does not start
  if (runHeld(call.op, s.team())) return result(entry, [], null);
  return settle(entry, begin(entry, call.op));
}

/** A call refused while the stand-in's call-out waits for the learner's answer (it would wait behind the round). */
export function calloutFirst(entry: McpSession, pending: CalloutPending): McpToolResult {
  const L = entry.session.locale;
  return textResult(rt(L, "teamText.calloutPending", { how: calloutHow(L) }), { session_id: entry.id, ok: false, error: "callout_pending", callout: pending }, true);
}
