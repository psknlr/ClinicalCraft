/**
 * World bridge, session side (docs/EMBODIED.md §12, PROTOCOL §13): an
 * external agent's tool call (`external_tool_call`) runs as the clinician
 * agent through its normal tool path, in a clinician turn of its own —
 * allow-list, deny rules, the spatial gate, the approval gate with the
 * approval prompt going to the learner — and `external_tool_cancel` (or an
 * interrupt) cancels exactly that call, queued or running.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, waitFor, type TestSession } from "../__fixtures__/harness.js";
import { bridgeResultOf } from "../bridge/world-client.js";
import type { AgentEvent } from "../protocol.js";
import { MemoryTranscript } from "../transcript.js";

const PATIENT = "patient:resus-1";

function external(t: TestSession, callId: string, tool: string, args: Record<string, unknown> = {}): Promise<AgentEvent[]> {
  return t.session.run({ type: "external_tool_call", callId, tool, args });
}

/** The engine's interventions so far (ids). */
const given = (t: TestSession) => t.session.state.interventions.map((i) => i.interventionId);

/** Distance from the learner's body to the patient's footprint (m), as the world measures it. */
function distanceToPatient(t: TestSession): number {
  const seen = t.session.world()!.find(PRIMARY_ACTOR, { kind: "patient" });
  return seen.find((e) => e.id === PATIENT)!.distance;
}

describe("external_tool_call — the clinician's tool path in its own turn", () => {
  it("runs a world tool as the clinician: turn_started → tool_call_begin/end → turn_complete; the body moved", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "default" } });
    const before = distanceToPatient(t);
    const events = await external(t, "c-walk", "navigate_to", { target: "patient" });
    const types = events.map((e) => e.msg.type).filter((type) => ["turn_started", "tool_call_begin", "tool_call_end", "turn_complete", "turn_aborted"].includes(type));
    expect(types).toEqual(["turn_started", "tool_call_begin", "tool_call_end", "turn_complete"]);
    expect(msgsOf(events, "turn_started")[0]).toMatchObject({ agent: "clinician" });
    expect(msgsOf(events, "tool_call_begin")[0]).toMatchObject({ agent: "clinician", callId: "c-walk", tool: "navigate_to" });
    expect(msgsOf(events, "tool_call_end")[0]).toMatchObject({ callId: "c-walk", ok: true });
    expect(msgsOf(events, "world_action_result").at(-1)!.result).toMatchObject({ status: "completed" });
    expect(before).toBeGreaterThan(5);
    expect(distanceToPatient(t)).toBeLessThanOrEqual(1.5);
    const result = bridgeResultOf(events, "c-walk", "en");
    expect(result).toMatchObject({ ok: true, status: "ok" });
    expect((result.data as { result?: { status?: string } }).result?.status).toBe("completed");
  });

  it("the spatial gate applies to the external agent: examine from afar is refused with a hint, then works at the bedside", async () => {
    const t = await makeEmbodiedSession();
    const far = await external(t, "c-exam-1", "examine", { finding_id: "general" });
    const refused = bridgeResultOf(far, "c-exam-1", "en");
    expect(refused).toMatchObject({ ok: false, status: "error", data: { code: "SPATIAL_REQUIREMENT_UNMET", hint: { goal: { kind: "interact", id: PATIENT } } } });
    expect(t.session.state.examined).toEqual([]);
    await external(t, "c-walk", "navigate_to", { goal: (refused.data as { hint: { goal: unknown } }).hint.goal });
    expect(bridgeResultOf(await external(t, "c-exam-2", "examine", { finding_id: "general" }), "c-exam-2", "en")).toMatchObject({ ok: true, status: "ok" });
    expect(t.session.state.examined).toContain("general");
  });

  it("approval prompts go to the learner (agent clinician); approved runs, denied does not — the caller cannot answer them", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "default" } });
    await external(t, "c-walk", "navigate_to", { target: "patient" });

    // Approved by the learner.
    const pending = external(t, "c-tica", "intervene", { intervention_id: "ticagrelor" });
    await waitFor(() => t.msgs("approval_request").length === 1);
    const ask = t.msgs("approval_request")[0]!;
    expect(ask).toMatchObject({ agent: "clinician", tool: "intervene", risk: "moderate" });
    expect(given(t)).not.toContain("ticagrelor"); // nothing runs while the approval is pending
    t.session.submit({ type: "approval_response", requestId: ask.requestId, decision: "approved" });
    const approved = bridgeResultOf(await pending, "c-tica", "en", { related: t.events });
    expect(approved).toMatchObject({ ok: true, status: "ok", approvals: [{ tool: "intervene", risk: "moderate", decision: "approved" }] });
    expect(given(t)).toContain("ticagrelor");

    // Denied by the learner: refused, its turn aborted as denied, nothing given.
    const second = external(t, "c-clop", "intervene", { intervention_id: "clopidogrel" });
    await waitFor(() => t.msgs("approval_request").length === 2);
    t.session.submit({ type: "approval_response", requestId: t.msgs("approval_request")[1]!.requestId, decision: "denied", reason: "not now" });
    const events = await second;
    expect(msgsOf(events, "turn_aborted")[0]).toMatchObject({ agent: "clinician", reason: "denied" });
    expect(bridgeResultOf(events, "c-clop", "en", { related: t.events })).toMatchObject({ ok: false, status: "denied", approvals: [{ decision: "denied" }] });
    // Without the learner's answer at hand, the decision is what the outcome implies.
    expect(bridgeResultOf(events, "c-clop", "en").approvals).toEqual([expect.objectContaining({ decision: "denied" })]);
    expect(given(t)).not.toContain("clopidogrel");
  });

  it("deny rules, the clinician's allow-list and the session's mode apply", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "default", permissions: { deny: ["intervene(aspirin)"] } } });
    await external(t, "c-walk", "navigate_to", { target: "patient" });
    const denied = await external(t, "c-asp", "intervene", { intervention_id: "aspirin" });
    expect(msgsOf(denied, "approval_request")).toEqual([]);
    expect(bridgeResultOf(denied, "c-asp", "en")).toMatchObject({ ok: false, status: "denied" });
    expect(given(t)).not.toContain("aspirin");

    // An NPC tool is not the clinician's: unknown to it.
    const npc = bridgeResultOf(await external(t, "c-npc", "reveal_facts", { fact_ids: ["onset"] }), "c-npc", "en");
    expect(npc).toMatchObject({ ok: false, status: "error" });
    expect(npc.output).toMatch(/Unknown tool|unknown tool/);

    // A clinical-mode session has no world tools.
    const clinical = await makeEmbodiedSession({ clinical: true });
    const noWorld = bridgeResultOf(await external(clinical, "c-w", "observe_world"), "c-w", "en");
    expect(noWorld).toMatchObject({ ok: false, status: "error" });
  });

  it("external_tool_cancel: a running call is aborted (its approval request withdrawn); a queued one never runs", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "default" } });
    await external(t, "c-walk", "navigate_to", { target: "patient" });
    const running = external(t, "c-nitro", "intervene", { intervention_id: "nitroglycerin" });
    await waitFor(() => t.msgs("approval_request").length === 1);
    const queued = external(t, "c-morph", "intervene", { intervention_id: "ticagrelor" });
    t.session.submit({ type: "external_tool_cancel", callId: "c-morph" });
    t.session.submit({ type: "external_tool_cancel", callId: "c-nitro" });
    const runEvents = await running;
    expect(msgsOf(runEvents, "approval_resolved")[0]).toMatchObject({ decision: "abort" });
    expect(msgsOf(runEvents, "turn_aborted")[0]).toMatchObject({ reason: "interrupted" });
    expect(bridgeResultOf(runEvents, "c-nitro", "en", { cancelRequested: true })).toMatchObject({ ok: false, status: "cancelled", approvals: [{ decision: "abort" }] });
    const queuedEvents = await queued;
    expect(msgsOf(queuedEvents, "tool_call_begin")).toEqual([]);
    expect(bridgeResultOf(queuedEvents, "c-morph", "en")).toMatchObject({ ok: false, status: "cancelled" });
    expect(given(t)).toEqual([]);
    // Cancelling something unknown or finished is a no-op.
    t.session.submit({ type: "external_tool_cancel", callId: "nope" });
    expect(bridgeResultOf(await external(t, "c-look", "observe_world"), "c-look", "en").status).toBe("ok");
  });

  it("an interrupt (the learner's stop) cancels a running external call", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "default" } });
    await external(t, "c-walk", "navigate_to", { target: "patient" });
    const running = external(t, "c-tica", "intervene", { intervention_id: "ticagrelor" });
    await waitFor(() => t.msgs("approval_request").length === 1);
    t.session.submit({ type: "interrupt" });
    expect(bridgeResultOf(await running, "c-tica", "en")).toMatchObject({ ok: false, status: "cancelled" });
    expect(given(t)).toEqual([]);
  });

  it("refuses malformed and duplicate calls; records the op in the transcript", async () => {
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ transcript, settingsPatch: { approvalMode: "default" } });
    const bad = await t.session.run({ type: "external_tool_call", callId: "", tool: "observe_world" });
    expect(msgsOf(bad, "error")[0]).toMatchObject({ code: "invalid_op" });
    expect(bridgeResultOf(bad, "", "en")).toMatchObject({ ok: false, status: "error" });
    const badArgs = await t.session.run({ type: "external_tool_call", callId: "c-x", tool: "observe_world", args: [1, 2] });
    expect(msgsOf(badArgs, "error")[0]).toMatchObject({ code: "invalid_op" });

    await external(t, "c-walk", "navigate_to", { target: "patient" });
    const first = external(t, "c-same", "intervene", { intervention_id: "ticagrelor" });
    await waitFor(() => t.msgs("approval_request").length === 1);
    const dup = await external(t, "c-same", "observe_world");
    expect(msgsOf(dup, "error")[0]).toMatchObject({ code: "duplicate_call" });
    t.session.submit({ type: "approval_response", requestId: t.msgs("approval_request")[0]!.requestId, decision: "approved" });
    expect(bridgeResultOf(await first, "c-same", "en").status).toBe("ok");

    const ops = transcript.ofType("op").map((i) => i.payload.op);
    expect(ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: "external_tool_call", callId: "c-same", tool: "intervene" })]));
  });
});

describe("bridgeResultOf", () => {
  it("reports notices, warnings and the not-run case; bounds the output", () => {
    const ev = (msg: AgentEvent["msg"], seq: number): AgentEvent => ({ id: "s1", seq, msg });
    const events = [
      ev({ type: "turn_started", turnId: "t1", agent: "clinician" }, 1),
      ev({ type: "tool_call_begin", turnId: "t1", agent: "clinician", callId: "c1", tool: "wait", args: {} }, 2),
      ev({ type: "notification", level: "critical", title: "Alarm", body: "SpO2 85%" }, 3),
      ev({ type: "warning", message: "offline responder" }, 4),
      ev({ type: "tool_call_end", turnId: "t1", agent: "clinician", callId: "c1", tool: "wait", ok: true, output: "x".repeat(300_000), durationMs: 1 }, 5),
      ev({ type: "turn_complete", turnId: "t1", agent: "clinician", lastMessage: null, durationMs: 1 }, 6),
    ];
    const r = bridgeResultOf(events, "c1", "en");
    expect(r).toMatchObject({ ok: true, status: "ok", notices: ["Alarm: SpO2 85%"], warnings: ["offline responder"], truncated: true });
    expect(r.output.length).toBe(200_000);
    expect(bridgeResultOf([ev({ type: "warning", message: "cancelled before it started" }, 1)], "c9", "zh-CN")).toEqual({ ok: false, status: "cancelled", output: "cancelled before it started" });
    expect(bridgeResultOf([], "c9", "zh-CN").output).toMatch(/未执行/);
  });
});
