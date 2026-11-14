/**
 * What the people of the world know of where things are (docs/EMBODIED.md §4, audit 2026-11-12 P1-8), through the
 * session: a walk goes where the body believes a thing is; "where is …?" to a colleague is answered from what they
 * know and the learner then knows it too; a delegated task's staff member and the in-world demonstration ask around
 * when the thing is not there; a relocation's leg names what moved the patient (P2-11).
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type WorldActionRequest } from "@clinicalcraft/world";
import { answerAll, command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";

const ECG = "eq:resus1-ecg";
const NURSE = "staff:ed-nurse";
let n = 0;

async function act(t: TestSession, request: Omit<WorldActionRequest, "actionId">) {
  const actionId = `wt-${++n}`;
  const events = await t.session.run({ type: "world_action", request: { actionId, ...request } });
  return msgsOf(events, "world_action_result").find((m) => m.result.actionId === actionId)!.result;
}

async function tool(t: TestSession, name: string, args: Record<string, unknown>) {
  const events = await t.session.run({ type: "external_tool_call", callId: `wt-call-${++n}`, tool: name, args, allowBypass: true });
  return msgsOf(events, "tool_call_end").at(-1) as { ok: boolean; output: string; data?: any };
}

const say = (t: TestSession, text: string, staff: string) => t.session.run({ type: "user_message", text, to: "nurse", staff });
const lines = (events: Awaited<ReturnType<TestSession["session"]["run"]>>) => msgsOf(events, "agent_message").map((m) => ({ staffId: m.staffId, text: m.text }));

/** The audit's set-up: the clinician in the doctors' office, the nurse wheels the bay's cart into cubicle 1. */
async function cartMoved(t: TestSession): Promise<void> {
  expect((await act(t, { actorId: PRIMARY_ACTOR, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
  expect((await act(t, { actorId: NURSE, operation: "approach", targetId: ECG })).status).toBe("completed");
  expect((await act(t, { actorId: NURSE, operation: "move_to", targetId: ECG, goal: { kind: "room", id: "ed-cubicle-1" } })).status).toBe("completed");
}

describe("where is …? — a colleague's knowledge, then the learner's (audit P1-8)", () => {
  it("not where the learner believed it; the receptionist does not know, the nurse who moved it does — and the walk goes there", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    await cartMoved(t);
    const stale = await act(t, { actorId: PRIMARY_ACTOR, operation: "approach", targetId: ECG });
    expect(stale).toMatchObject({ status: "failed", errorCode: "STALE_DESTINATION", belief: { found: "absent" } });
    // listed as missing: no distance or direction to where it was looked for, no state, nothing to do with it
    const listed = (await tool(t, "find_entities", { capabilities: ["ecg-12lead"], limit: 8 })).output.split("\n").find((l) => l.includes(`[${ECG}]`))!;
    expect(listed).toBe(`- 12-lead ECG 1 [${ECG}] (not in Resuscitation Room when you looked — whereabouts unknown)`);
    const unknown = await say(t, "Where is 12-lead ECG 1?", "receptionist");
    expect(lines(unknown)[0]).toMatchObject({ staffId: "receptionist", text: "I don't know where 12-lead ECG 1 is right now — usually kept in Resuscitation Room." });
    expect(t.session.world()!.whereabouts(PRIMARY_ACTOR, ECG)!.kind).toBe("missing");
    const known = await say(t, "Where is 12-lead ECG 1?", "ed-nurse");
    expect(lines(known)[0]!.text).toMatch(/^12-lead ECG 1: in ED Cubicle 1, about \d+ m from here\.$/);
    expect(t.session.world()!.whereabouts(PRIMARY_ACTOR, ECG)).toMatchObject({ kind: "told", toldBy: NURSE, room: "ed-cubicle-1" });
    expect((await act(t, { actorId: PRIMARY_ACTOR, operation: "approach", targetId: ECG })).status).toBe("completed");
    await t.session.close();
  });

  it("the ask_whereabouts tool: asked through the tool path (read-only, no approval); a colleague by role who does not know says so", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    await cartMoved(t);
    await act(t, { actorId: PRIMARY_ACTOR, operation: "approach", targetId: ECG });
    const nobody = await tool(t, "ask_whereabouts", { target: ECG, colleague: "receptionist" });
    expect(nobody).toMatchObject({ ok: false, output: "He Jing does not know where 12-lead ECG 1 is now (usually kept in Resuscitation Room)." });
    const around = await tool(t, "ask_whereabouts", { target: "ECG 1" });
    expect(around).toMatchObject({ ok: true, output: "Lin Xiao: 12-lead ECG 1 is in ED Cubicle 1.", data: { answer: { answeredBy: NURSE, updated: true } } });
    expect((await tool(t, "navigate_to", { target: ECG })).ok).toBe(true);
    await t.session.close();
  });
});

describe("staff and the in-world demonstration go by the same rule (audit P1-8)", () => {
  it("a delegated ECG: the cart moved out of the nurse's sight — she asks around, fetches it from the cubicle and records it", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", settingsPatch: { approvalMode: "bypass" } });
    const w = t.session.world()!;
    // the clinician wheels the bay's cart out to cubicle 1 (the nurse at her station does not see it); the other
    // carts nearby are out of service
    expect((await act(t, { actorId: PRIMARY_ACTOR, operation: "approach", targetId: ECG })).status).toBe("completed");
    expect((await act(t, { actorId: PRIMARY_ACTOR, operation: "move_to", targetId: ECG, goal: { kind: "room", id: "ed-cubicle-1" } })).status).toBe("completed");
    w.setAvailability("eq:resus2-ecg", false);
    w.setAvailability("eq:cub2-ecg", false);
    expect(w.whereabouts(NURSE, ECG)!.kind).toBe("usual");
    const r = await command(t, "delegate", "nurse record_ecg");
    const steps = (r.data as { delegation: { steps: { operation: string; status: string; target?: string }[] } }).delegation.steps;
    expect(steps).toEqual(expect.arrayContaining([expect.objectContaining({ operation: "navigate", target: ECG, status: "failed" }), expect.objectContaining({ operation: "ask_whereabouts", target: ECG, status: "completed" })]));
    expect(t.session.state.orders.some((o) => o.investigationId === "ecg-12lead")).toBe(true);
    expect(w.atBedside(ECG)).toBe(true);
    await t.session.close();
  });

  it("the in-world demonstration: a cart moved out of the clinician's sight is asked after (a tool call), fetched and used", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", settingsPatch: { approvalMode: "bypass" } });
    answerAll(t);
    const w = t.session.world()!;
    expect((await act(t, { actorId: NURSE, operation: "approach", targetId: ECG })).status).toBe("completed");
    expect((await act(t, { actorId: NURSE, operation: "move_to", targetId: ECG, goal: { kind: "room", id: "ed-cubicle-1" } })).status).toBe("completed");
    w.setAvailability("eq:resus2-ecg", false);
    w.setAvailability("eq:cub2-ecg", false);
    const asked: string[] = [];
    t.session.subscribe((e) => {
      if (e.msg.type === "tool_call_end" && e.msg.tool === "ask_whereabouts") asked.push(e.msg.output);
    });
    await t.session.run({ type: "autopilot", maxTurns: 60 });
    expect(t.session.state.orders.some((o) => o.investigationId === "ecg-12lead")).toBe(true);
    expect(asked[0]).toBe("Lin Xiao: 12-lead ECG 1 is in ED Cubicle 1.");
    expect(t.session.state.finished).toBe(true);
    await t.session.close();
  });
});

describe("a relocation's leg names what moved the patient (audit P2-11)", () => {
  it("PE: the HDU transfer is a relocation caused by the intervention — no journey", async () => {
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const r = t.session.dispatch({ type: "intervene", interventionId: "transfer-hdu", by: "system" });
    expect(r.rejected).toBeUndefined();
    const legs = Object.values(t.session.world()!.snapshot().entities).flatMap((e) => e.patient?.legs ?? []);
    expect(legs.at(-1)).toMatchObject({ kind: "relocation", mode: null, by: null, cause: { intervention: "transfer-hdu" }, to: { slot: "icu-1" } });
    await t.session.close();
  });
});
