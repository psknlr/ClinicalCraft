/**
 * Items kept in custody through the session's tool path (docs/EMBODIED.md §8.1, audit 2026-11-12 P2-12), in
 * built-in cases in their own hospital: a blood specimen taken at the bedside, carried by a nurse to the laboratory
 * (`delegate_task deliver_item`) and handed over against receipts each receiver confirms with their own act; and a
 * nurse's hand-over of a medication box ("Pass me the medication box") that the clinician signs for. Nothing here
 * changes when a result is released: the hand-overs are recorded, nothing else.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type WorldActionRequest } from "@clinicalcraft/world";
import { makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { checkTaskScope } from "../tools/scope.js";

const TUBE = "eq:ed-specimen-tube";
const BOX = "eq:ed-medication-box";
const NURSE = "staff:ed-nurse";
const LAB = "staff:lab-tech";

let seq = 0;
/** The learner's own world action (`world_action` op): the session runs it, then the staff's round. */
async function act(t: TestSession, request: Omit<WorldActionRequest, "actionId" | "actorId">) {
  const events = await t.session.run({ type: "world_action", request: { actionId: `wa-${++seq}`, actorId: PRIMARY_ACTOR, ...request } });
  const result = msgsOf(events, "world_action_result").find((m) => m.result.actionId === `wa-${seq}`)!.result;
  expect(result.status, `${request.operation}: ${result.message}`).toBe("completed");
  return { result, events };
}

/** A tool call as an external agent makes it (the clinician's tool path). */
async function tool(t: TestSession, name: string, args: Record<string, unknown>) {
  const events = await t.session.run({ type: "external_tool_call", callId: `c-${++seq}`, tool: name, args, allowBypass: true });
  return { end: msgsOf(events, "tool_call_end").at(-1)!, events };
}

const lines = (events: Awaited<ReturnType<TestSession["session"]["run"]>>) => msgsOf(events, "agent_message").map((m) => ({ staffId: m.staffId, text: m.text }));

describe("a blood specimen taken at the bedside and carried to the laboratory (DKA, general hospital)", () => {
  it("collected and labelled at the bedside, handed to the nurse, carried by her to the laboratory: every hand-over against a receipt its receiver confirms", async () => {
    const t = await makeEmbodiedSession({ caseId: "dka-adult", settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    const patient = w.patientPlace()!;
    expect(patient.room).toBe("ed-resus");
    // taken at the bedside: the tube from the ED desk, clean hands, then filled and labelled at the patient's side
    await act(t, { operation: "approach", targetId: TUBE });
    await act(t, { operation: "pick_up", targetId: TUBE });
    await act(t, { operation: "approach", targetId: "eq:ed-station-sink" });
    await act(t, { operation: "wash_hands", targetId: "eq:ed-station-sink" });
    await act(t, { operation: "approach", targetId: "patient" });
    const collected = await act(t, { operation: "collect", targetId: TUBE });
    expect(collected.result.message).toMatch(/Filled and labelled/);
    expect(w.roomOf(PRIMARY_ACTOR)).toBe("ed-resus");
    // handed to the nurse: a receipt she signs for, in her own round, with her own act and in her own voice
    await act(t, { operation: "navigate", goal: { kind: "entity", id: NURSE, range: 1 } });
    const handed = await act(t, { operation: "hand_over", targetId: TUBE, parameters: { to: NURSE } });
    expect(handed.result.receipt).toMatchObject({ item: TUBE, state: "collected", from: PRIMARY_ACTOR, to: NURSE, confirmedAt: null });
    const signed = msgsOf(handed.events, "world_action_result").find((m) => m.result.receipt?.confirmedAt != null)!.result;
    expect(signed).toMatchObject({ status: "completed", receipt: { id: `${TUBE}#1`, from: PRIMARY_ACTOR, to: NURSE } });
    expect(lines(handed.events)).toContainEqual({ staffId: "ed-nurse", text: "Received the Blood specimen tube from you — checked and signed for." });
    // the clinician sees whose hands it is in
    expect(w.inspect(PRIMARY_ACTOR, TUBE)).toMatchObject({ holder: { id: NURSE, name: "Lin Xiao (Nurse)" } });
    const seen = await tool(t, "inspect_object", { target: TUBE });
    expect(seen.end.output).toContain("held by Lin Xiao (Nurse)");
    // carried by the nurse to the laboratory (delegate_task deliver_item) and handed to the laboratory technician
    const delivery = await tool(t, "delegate_task", { role: "staff:ed-nurse", task: "deliver_item", target: TUBE, params: { to: "lab-tech" } });
    expect(delivery.end.ok, delivery.end.output).toBe(true);
    const d = (delivery.end.data as { delegation: { status: string; receipt?: { id: string; to: string } } }).delegation;
    expect(d).toMatchObject({ status: "completed", receipt: { id: `${TUBE}#2`, to: LAB } });
    expect(delivery.end.output).toMatch(/Handed over against a receipt: Blood specimen tube to Wang Yue at minute \d+(\.\d+)?, for Wang Yue to confirm\./);
    expect(w.roomOf(NURSE)).toBe("laboratory");
    expect(w.actor(LAB)!.holding).toEqual([TUBE]);
    expect(lines(delivery.events)).toContainEqual({ staffId: "lab-tech", text: "Received the Blood specimen tube from Lin Xiao — checked and signed for." });
    // the chain of custody, as the world keeps it: who handed it to whom, where and when — each confirmed by its receiver
    const chain = w.receipts(TUBE);
    expect(chain.map((r) => ({ from: r.from, to: r.to, room: r.room, state: r.state, confirmed: r.confirmedAt !== null }))).toEqual([
      { from: PRIMARY_ACTOR, to: NURSE, room: w.roomOf(PRIMARY_ACTOR), state: "collected", confirmed: true },
      { from: NURSE, to: LAB, room: "laboratory", state: "collected", confirmed: true },
    ]);
    expect(chain[0]!.at).toBeLessThanOrEqual(chain[1]!.at);
    // a save keeps it (the world snapshot of the session)
    expect(t.session.snapshot().world?.entities[TUBE]?.receipts).toEqual(chain);
    await t.session.close();
  });

  it("deliver_item is a porter's and a nurse's task, not the front desk's; it needs an item and someone to receive it", async () => {
    const t = await makeEmbodiedSession({ caseId: "dka-adult", settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const c = t.session.caseDef;
    expect(checkTaskScope({ role: "porter" }, "deliver_item", c, "en").ok).toBe(true);
    expect(checkTaskScope({ role: "nurse" }, "deliver_item", c, "en").ok).toBe(true);
    expect(checkTaskScope({ role: "receptionist" }, "deliver_item", c, "en").ok).toBe(false);
    const noItem = await tool(t, "delegate_task", { role: "nurse", task: "deliver_item", target: "eq:ed-station-sink", params: { to: "lab-tech" } });
    expect(noItem.end.output).toMatch(/needs a handheld item to take/);
    const nobody = await tool(t, "delegate_task", { role: "nurse", task: "deliver_item", target: TUBE, params: { to: "nobody-here" } });
    expect(nobody.end.output).toMatch(/needs who receives it/);
    expect(t.session.world()!.receipts()).toEqual([]);
    await t.session.close();
  });
});

describe("a nurse hands over a medication box (STEMI, general hospital)", () => {
  it("'Pass me the medication box': the nurse brings it and hands it over against a receipt; the clinician signs for it", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    const events = await t.session.run({ type: "user_message", text: "Pass me the medication box", to: "nurse", staff: "ed-nurse" });
    expect(lines(events).at(-1)).toEqual({ staffId: "ed-nurse", text: "Here you are: Medication box." });
    expect(w.actor(PRIMARY_ACTOR)!.holding).toEqual([BOX]);
    const open = w.receipts(BOX);
    expect(open).toEqual([expect.objectContaining({ id: `${BOX}#1`, type: "medication-box", from: NURSE, fromRole: "nurse", to: PRIMARY_ACTOR, toRole: "clinician", confirmedAt: null })]);
    // nobody signs for the clinician: it waits for their own act
    expect(w.inspect(PRIMARY_ACTOR, BOX)!.availableActions).toContain("confirm_receipt");
    const confirmed = await act(t, { operation: "confirm_receipt", targetId: BOX });
    expect(confirmed.result.message).toMatch(/^Receipt confirmed: "Medication box" from Lin Xiao, handed over at minute \d+(\.\d+)?\.$/);
    expect(w.receipts(BOX)[0]!.confirmedAt).not.toBeNull();
    expect(w.inspect(PRIMARY_ACTOR, BOX)!.availableActions).not.toContain("confirm_receipt");
    await t.session.close();
  });

  it("delegate_task deliver_item to 'me': the nurse brings it to the delegating clinician, whose receipt it is to sign", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    const r = await tool(t, "delegate_task", { role: "staff:ed-nurse", task: "deliver_item", target: BOX, params: { to: "me" } });
    expect(r.end.ok, r.end.output).toBe(true);
    expect(w.actor(PRIMARY_ACTOR)!.holding).toEqual([BOX]);
    // the world says whose receipt it is to confirm: the clinician's — nobody signs it for them, the nurse included
    expect(w.receiptsToConfirm(PRIMARY_ACTOR)).toEqual([expect.objectContaining({ id: `${BOX}#1`, item: BOX, from: NURSE, to: PRIMARY_ACTOR, confirmedAt: null })]);
    expect(w.receiptsToConfirm(NURSE)).toEqual([]);
    expect(r.end.output).toMatch(/Handed over against a receipt: Medication box to Clinician at minute \d+(\.\d+)?, for Clinician to confirm\./);
    await t.session.close();
  });

  it("in Chinese: 把药盒递给我 — handed over, signed for", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", settingsPatch: { locale: "zh-CN" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const events = await t.session.run({ type: "user_message", text: "把药盒递给我", to: "nurse", staff: "ed-nurse" });
    expect(lines(events).at(-1)).toEqual({ staffId: "ed-nurse", text: "给您，药盒。" });
    const confirmed = await act(t, { operation: "confirm_receipt", targetId: BOX });
    expect(confirmed.result.message).toMatch(/^已签收「药盒」：林晓于第 \d+(\.\d+)? 分钟递交。$/);
    await t.session.close();
  });
});
