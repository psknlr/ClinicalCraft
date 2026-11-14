/**
 * Items kept in custody (EMBODIED §8.1, audit 2026-11-12 P2-12): the built-in catalog's handheld items — the blood
 * specimen tube and the medication box — on the general hospital's ED nurse station desk. The tube is taken at the
 * bedside (in hand, clean hands, at the patient's side) and labelled there; every hand-over writes a receipt (who
 * handed what to whom, where, at which minute) that only the receiver confirms, by their own act; whoever sees a
 * carried item sees whose hands it is in; receipts survive a save and restore and are in the trace.
 */
import { describe, expect, it } from "vitest";
import { behaviorOf } from "./behaviors.js";
import { PRIMARY_ACTOR, type HandoffReceipt } from "./contracts.js";
import { createWorldRuntime } from "./runtime.js";
import { catalogs, makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const NURSE = "staff:ed-nurse";
const LAB = "staff:lab-tech";
const TUBE = "eq:ed-specimen-tube";
const BOX = "eq:ed-medication-box";

async function ok(w: TestWorld, request: Parameters<TestWorld["act"]>[0]) {
  const r = await w.act(request);
  expect(r.status, `${request.operation}: ${r.message}`).toBe("completed");
  return r;
}

/** Walk up to someone (asked where they are first: one seeks a person where one believes they are, P1-8). */
async function stepTo(w: TestWorld, actorId: string, toId: string) {
  w.runtime.askWhereabouts(actorId, toId, toId);
  await ok(w, { actorId, operation: "navigate", goal: { kind: "entity", id: toId, range: 1 } });
}

/** The tube taken at the bedside: picked up at the desk, hands cleaned at the station sink, filled and labelled at the patient. */
async function collected(w: TestWorld): Promise<void> {
  await ok(w, { actorId: A, operation: "approach", targetId: TUBE });
  await ok(w, { actorId: A, operation: "pick_up", targetId: TUBE });
  await ok(w, { actorId: A, operation: "approach", targetId: "eq:ed-station-sink" });
  await ok(w, { actorId: A, operation: "wash_hands", targetId: "eq:ed-station-sink" });
  await ok(w, { actorId: A, operation: "approach", targetId: w.patientId });
  await ok(w, { actorId: A, operation: "collect", targetId: TUBE });
}

describe("built-in handheld items (the default catalog)", () => {
  it("a specimen tube and a medication box, handheld and kept in custody, on the ED nurse station desk", () => {
    const w = makeWorld("dka-adult");
    const handheld = catalogs().flatMap((c) => c.equipment.filter((e) => e.portable === "handheld").map((e) => [e.id, !!e.custody]));
    expect(handheld).toEqual([
      ["specimen-tube", true],
      ["medication-box", true],
    ]);
    for (const id of [TUBE, BOX]) expect(w.runtime.entity(id), id).toMatchObject({ kind: "equipment", portable: "handheld", room: "ed-station" });
    expect(behaviorOf(w.runtime.entity(TUBE)!).operations.map((o) => o.id)).toEqual(["collect", "pick_up", "put_down", "equip", "hand_over", "confirm_receipt"]);
    expect(behaviorOf(w.runtime.entity(BOX)!).operations.map((o) => o.id)).toEqual(["use", "pick_up", "put_down", "equip", "hand_over", "confirm_receipt"]);
    // lying on the desk: nobody holds it, nothing to confirm
    expect(w.runtime.inspect(NURSE, TUBE)).toMatchObject({ state: "empty" });
    expect(w.runtime.inspect(NURSE, TUBE)!.availableActions).not.toContain("confirm_receipt");
    expect(w.runtime.receipts()).toEqual([]);
  });
});

describe("the specimen is taken at the bedside", () => {
  it("in hand, with clean hands, at the patient's side — refused otherwise, with the way to put it right", async () => {
    const w = makeWorld("dka-adult");
    await ok(w, { actorId: A, operation: "approach", targetId: TUBE });
    // on the desk: picked up first
    const lying = await w.act({ actorId: A, operation: "collect", targetId: TUBE });
    expect(lying).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED", hint: { then: { operation: "pick_up", targetId: TUBE } } });
    await ok(w, { actorId: A, operation: "pick_up", targetId: TUBE });
    // hands not cleaned: to the nearest sink
    const dirty = await w.act({ actorId: A, operation: "collect", targetId: TUBE });
    expect(dirty).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED", hint: { then: { operation: "wash_hands" } } });
    await ok(w, { actorId: A, operation: "approach", targetId: "eq:ed-station-sink" });
    await ok(w, { actorId: A, operation: "wash_hands", targetId: "eq:ed-station-sink" });
    // away from the patient: to their side
    const away = await w.act({ actorId: A, operation: "collect", targetId: TUBE });
    expect(away).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE", hint: { goal: { kind: "interact", id: w.patientId } } });
    // a porter may not take blood
    expect(behaviorOf(w.runtime.entity(TUBE)!).operations.find((o) => o.id === "collect")!.roles).toEqual(["clinician", "attending", "nurse", "paramedic"]);
    await ok(w, { actorId: A, operation: "approach", targetId: w.patientId });
    const r = await ok(w, { actorId: A, operation: "collect", targetId: TUBE });
    expect(r.message).toBe("Done: Take the sample and label it at the bedside (Blood specimen tube); it is now Filled and labelled.");
    // three minutes at the bedside, charged as procedure time
    expect(r.elapsedSeconds).toBe(180);
    expect(w.harness.elapsed.at(-1)).toEqual({ seconds: 180, reason: "procedure" });
    expect(w.runtime.inspect(A, TUBE)!.state).toBe("held");
    expect(w.runtime.snapshot().entities[TUBE]).toMatchObject({ state: "collected", heldBy: A });
  });
});

describe("hand-over against a receipt", () => {
  it("records who handed what to whom, where and when; only the receiver confirms it; whoever sees it sees whose hands it is in", async () => {
    const w = makeWorld("dka-adult");
    await collected(w);
    await stepTo(w, A, NURSE);
    const at = w.harness.view.clock();
    const handed = await ok(w, { actionId: "give-1", actorId: A, operation: "hand_over", targetId: TUBE, parameters: { to: NURSE } });
    const first: HandoffReceipt = { id: `${TUBE}#1`, item: TUBE, type: "specimen-tube", state: "collected", from: A, fromRole: "clinician", to: NURSE, toRole: "nurse", room: w.runtime.actor(A)!.room, at, actionId: "give-1", confirmedAt: null };
    expect(handed.receipt).toEqual(first);
    expect(handed.message).toMatch(/for Lin Xiao to confirm/);
    expect(handed.events.map((e) => e.type)).toEqual(["item.held", "item.held", "item.handoff", "action.completed"]);
    expect(w.runtime.receipts(TUBE)).toEqual([first]);
    expect(w.runtime.snapshot().entities[TUBE]!.receipts).toEqual([first]);
    // the holder named: the clinician sees the tube in the nurse's hands
    expect(w.runtime.inspect(A, TUBE)).toMatchObject({ state: "held", holder: { id: NURSE, name: "Lin Xiao (Nurse)" } });
    // the giver cannot confirm it (no longer holds it), nor can anyone but the receiver
    expect(await w.act({ actorId: A, operation: "confirm_receipt", targetId: TUBE })).toMatchObject({ status: "failed", errorCode: "DEVICE_BUSY" });
    expect(w.runtime.inspect(NURSE, TUBE)!.availableActions).toContain("confirm_receipt");
    // THE custody rule, asked of the world (what a front-end offers "Sign for it" on): the receiver's, nobody else's
    expect(w.runtime.receiptsToConfirm(NURSE)).toEqual([first]);
    expect(w.runtime.receiptsToConfirm(A)).toEqual([]);
    const confirmed = await ok(w, { actionId: "sign-1", actorId: NURSE, operation: "confirm_receipt", targetId: TUBE });
    expect(confirmed.receipt).toEqual({ ...first, confirmedAt: w.harness.view.clock(), confirmActionId: "sign-1" });
    expect(confirmed.message).toMatch(/Receipt confirmed: "Blood specimen tube" from Clinician, handed over at minute/);
    const again = await w.act({ actorId: NURSE, operation: "confirm_receipt", targetId: TUBE });
    expect(again).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect(again.message).toMatch(/already confirmed at minute/);
    expect(w.runtime.inspect(NURSE, TUBE)!.availableActions).not.toContain("confirm_receipt");
    expect(w.runtime.receiptsToConfirm(NURSE)).toEqual([]);
    // the receipt and the confirmation in the trace
    const spans = w.trace.spans().filter((s) => s.data?.receipt);
    expect(spans.map((s) => [s.name, (s.data?.receipt as { confirmedAt: number | null }).confirmedAt === null])).toEqual([
      ["hand_over", true],
      ["confirm_receipt", false],
    ]);
    expect(w.trace.spans().some((s) => s.kind === "state_change" && s.name.includes("item.handoff"))).toBe(true);
  });

  it("the specimen carried to the laboratory: a chain of receipts, each confirmed by its receiver; restored from a snapshot", async () => {
    const w = makeWorld("dka-adult");
    await collected(w);
    await stepTo(w, A, NURSE);
    await ok(w, { actorId: A, operation: "hand_over", targetId: TUBE, parameters: { to: NURSE } });
    await ok(w, { actorId: NURSE, operation: "confirm_receipt", targetId: TUBE });
    // the nurse carries it to the laboratory and hands it to the laboratory technician, who signs for it
    await stepTo(w, NURSE, LAB);
    expect(w.runtime.actor(NURSE)!.room).toBe("laboratory");
    const handed = await ok(w, { actorId: NURSE, operation: "hand_over", targetId: TUBE, parameters: { to: LAB } });
    expect(handed.receipt).toMatchObject({ id: `${TUBE}#2`, from: NURSE, to: LAB, toRole: "lab-tech", room: "laboratory", state: "collected", confirmedAt: null });
    // the receiver knows of the hand-over even before they look (a summary in their recent events)
    expect(w.runtime.observe(LAB).recentEvents.map((e) => e.summary)).toContain("Lin Xiao handed Blood specimen tube to Wang Yue, to be confirmed");
    await ok(w, { actorId: LAB, operation: "confirm_receipt", targetId: TUBE });
    const chain = w.runtime.receipts(TUBE);
    expect(chain.map((r) => [r.from, r.to, r.confirmedAt !== null])).toEqual([
      [A, NURSE, true],
      [NURSE, LAB, true],
    ]);
    expect(chain[1]!.confirmedAt).toBeGreaterThanOrEqual(chain[0]!.confirmedAt!);
    // a save and a restore keep the chain, byte for byte
    const snapshot = w.runtime.snapshot();
    const restored = createWorldRuntime({ facility: w.facility, catalogs: catalogs(), binding: { caseDef: w.caseDef, slotId: w.slotId, locale: "en" }, clinical: w.harness.view, now: () => 0, newId: () => "x", snapshot });
    expect(restored.receipts(TUBE)).toEqual(chain);
    expect(JSON.stringify(restored.snapshot())).toBe(JSON.stringify(snapshot));
  });

  it("a nurse hands the medication box to the clinician; the clinician confirms; in Chinese too", async () => {
    const w = makeWorld("stemi-inferior-rv", { locale: "zh-CN" });
    await ok(w, { actorId: NURSE, operation: "approach", targetId: BOX });
    await ok(w, { actorId: NURSE, operation: "pick_up", targetId: BOX });
    await stepTo(w, NURSE, A);
    const handed = await ok(w, { actorId: NURSE, operation: "hand_over", targetId: BOX, parameters: { to: A } });
    expect(handed.receipt).toMatchObject({ item: BOX, type: "medication-box", state: null, from: NURSE, fromRole: "nurse", to: A, toRole: "clinician", confirmedAt: null });
    expect(handed.message).toBe("已把「药盒」递给医生，交接已记录，待医生签收。");
    expect(w.runtime.inspect(NURSE, BOX)).toMatchObject({ holder: { id: A } });
    const r = await ok(w, { actorId: A, operation: "confirm_receipt", targetId: BOX });
    expect(r.message).toMatch(/^已签收「药盒」：林晓于第 \d+(\.\d+)? 分钟递交。$/);
    expect(w.runtime.inspect(A, "eq:ed-medication-box")!.holder).toBeUndefined(); // one's own hands: no holder line
  });

  it("many hand-overs in one minute keep their order; an item put down unconfirmed is nobody's to confirm", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await ok(w, { actorId: NURSE, operation: "approach", targetId: BOX });
    await ok(w, { actorId: NURSE, operation: "pick_up", targetId: BOX });
    await stepTo(w, NURSE, A);
    // passed back and forth eleven times — a hand-over takes no simulated time: receipts #1 … #11, in that order
    for (let i = 0; i < 11; i++) {
      const [from, to] = i % 2 === 0 ? [NURSE, A] : [A, NURSE];
      await ok(w, { actorId: from, operation: "hand_over", targetId: BOX, parameters: { to } });
    }
    const all = w.runtime.receipts();
    expect(new Set(all.map((r) => r.at)).size).toBe(1);
    expect(all.map((r) => r.id)).toEqual(Array.from({ length: 11 }, (_, i) => `${BOX}#${i + 1}`));
    expect(w.runtime.receiptsToConfirm(A)).toEqual([all.at(-1)]);
    // the last one (to the clinician) put down unconfirmed: nobody holds it, nobody is to confirm it …
    await ok(w, { actorId: A, operation: "put_down", targetId: BOX });
    expect(w.runtime.receiptsToConfirm(A)).toEqual([]);
    // … and whoever picks it up was not handed it: no receipt of theirs, the open one stays open (the record shows the gap)
    await ok(w, { actorId: NURSE, operation: "approach", targetId: BOX });
    await ok(w, { actorId: NURSE, operation: "pick_up", targetId: BOX });
    expect(w.runtime.receiptsToConfirm(NURSE)).toEqual([]);
    const r = await w.act({ actorId: NURSE, operation: "confirm_receipt", targetId: BOX });
    expect(r).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect(r.message).toMatch(/No hand-over of "Medication box" to you awaits your confirmation/);
    expect(w.runtime.receipts(BOX).at(-1)).toMatchObject({ id: `${BOX}#11`, to: A, confirmedAt: null });
  });
});
