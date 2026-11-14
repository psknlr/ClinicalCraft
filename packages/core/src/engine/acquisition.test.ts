/**
 * The stages of a study done on the patient at a device (audit 2026-11-12 P1-7, docs/EMBODIED.md §8.7): the order,
 * the acquisition, the report's release (acquisition + turnaround), the review and the resulting action are distinct
 * and recorded. In-world orders carry a `modality` and wait for the patient there; text mode keeps the acquisition
 * implied at the order (recorded as implied), so its play and its verification do not change.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import { assess, awaitingAcquisition, createSession, evaluate, isOrderReady, orderStatus, parseCase, reduce, replay, verifyCase } from "./index.js";
import { pendingEvents } from "./next-event.js";

function builtin(id: string): CaseDefinition {
  const parsed = parseCase(JSON.parse(readFileSync(new URL(`../../../content/cases/${id}/case.json`, import.meta.url), "utf8")));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.value;
}

const PE = builtin("pulmonary-embolism-postop");

/** Apply actions, each accepted. */
function play(c: CaseDefinition, actions: ClinicalAction[], from: SessionState = createSession(c)): SessionState {
  let s = from;
  for (const a of actions) {
    const r = reduce(c, s, a);
    if (r.rejected) throw new Error(`${a.type} rejected: ${r.rejected.code} ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}

/** The CTPA ordered in the world at minute 1 (the session sets `modality` from the world's rule). */
function orderedAtMinuteOne(): SessionState {
  const s = play(PE, [{ type: "start" }, { type: "advance-time", minutes: 1 }, { type: "order", investigationId: "ctpa", modality: ["ct"], by: "learner" }]);
  expect(s.orders.find((o) => o.investigationId === "ctpa")?.orderedAt).toBe(1);
  return s;
}

const ctpa = (s: SessionState) => s.orders.find((o) => o.investigationId === "ctpa")!;

describe("audit replay: a CTPA ordered at minute 1 while the patient stays on the ward", () => {
  it("is neither acquired nor released at minute 30 — nor ever, until the patient is at the CT", () => {
    let s = orderedAtMinuteOne();
    const order = ctpa(s);
    expect(order).toMatchObject({ orderedAt: 1, by: "learner", modality: ["ct"] });
    expect(order.acquired).toBeUndefined();
    expect(order.readyAt).toBeUndefined();
    expect(awaitingAcquisition(order)).toBe(true);
    s = play(PE, [{ type: "advance-time", minutes: 28 }], s);
    expect(s.clock).toBe(30);
    expect(isOrderReady(PE, s, ctpa(s))).toBe(false);
    // the requirement lists keep it outstanding: an objective or rubric leaf `ordered` holds for a test done
    expect(evaluate(PE, s, { ordered: "ctpa" })).toBe(false);
    expect(evaluate(PE, s, { resultReady: "ctpa" })).toBe(false);
    // the missing-tests list keeps it outstanding; the debrief lists it as never done; nothing waits on time for it
    const report = assess(PE, s).investigations;
    expect(report.essentialMissing).toContain("ctpa");
    expect(report.notAcquired).toEqual(["ctpa@ward"]);
    expect(report.unread).not.toContain("ctpa@ward");
    expect(pendingEvents(PE, s).map((e) => e.id)).not.toContain("ctpa@ward");
    expect(orderStatus(PE, s).find((x) => x.order.investigationId === "ctpa")).toMatchObject({ acquired: false, ready: false, read: false });
    // there is no result to read
    const read = reduce(PE, s, { type: "read", investigationId: "ctpa" });
    expect(read.rejected?.code).toBe("not-ready");
    expect(read.rejected?.message).toMatch(/not been acquired/);
    s = play(PE, [{ type: "advance-time", minutes: 60 }], s);
    expect(isOrderReady(PE, s, ctpa(s))).toBe(false);
  });

  it("with transport: acquired on arrival, released after the turnaround, then the read and the next action — in order", () => {
    let s = orderedAtMinuteOne();
    // the walk to the CT (the world charges the travel), then the acquisition on arrival at the scanner
    s = play(PE, [{ type: "advance-time", minutes: 4, reason: "travel" }], s);
    const arrival = s.clock;
    const acquired = reduce(PE, s, { type: "acquire", investigationId: "ctpa", collector: "radiographer", where: "eq:ct-scanner", by: "system" });
    expect(acquired.rejected).toBeUndefined();
    expect(acquired.events.map((e) => e.type)).toContain("order.acquired");
    s = acquired.state;
    const turnaround = PE.investigations.find((i) => i.id === "ctpa")!.turnaroundMinutes;
    expect(ctpa(s).acquired).toMatchObject({ at: arrival, collector: "radiographer", where: "eq:ct-scanner" });
    expect(ctpa(s).readyAt).toBe(arrival + turnaround);
    expect(evaluate(PE, s, { ordered: "ctpa" })).toBe(true);
    expect(assess(PE, s).investigations.essentialMissing).not.toContain("ctpa");
    // a second acquisition changes nothing
    expect(reduce(PE, s, { type: "acquire", investigationId: "ctpa" }).state).toBe(s);
    // not before the release
    expect(reduce(PE, s, { type: "read", investigationId: "ctpa" }).rejected?.code).toBe("not-ready");
    s = play(PE, [{ type: "advance-time", minutes: turnaround }], s);
    expect(isOrderReady(PE, s, ctpa(s))).toBe(true);
    // the review, then reading another result and asking (not management), then the resulting action
    s = play(PE, [{ type: "read", investigationId: "ctpa", by: "learner" }, { type: "ask", itemId: "h-bleeding" }, { type: "intervene", interventionId: "ufh", by: "learner" }], s);
    const o = ctpa(s);
    expect(o.reviewed).toMatchObject({ by: "learner" });
    expect(o.next).toMatchObject({ type: "intervene", id: "ufh" });
    const stages = [o.orderedAt, arrival, o.acquired!.at, o.readyAt!, o.reviewed!.at, o.next!.at];
    expect([...stages].sort((a, b) => a - b)).toEqual(stages);
    const seqs = [o.seq!, o.acquired!.seq, o.reviewed!.seq, o.next!.seq];
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
    expect(new Set(seqs).size).toBe(seqs.length);
    // a later read is not a new review; a later act is not the resulting action
    s = play(PE, [{ type: "read", investigationId: "ctpa" }, { type: "intervene", interventionId: "consult-pert" }], s);
    expect(ctpa(s).reviewed).toEqual(o.reviewed);
    expect(ctpa(s).next).toEqual(o.next);
  });

  it("the patient already on the device at the order: the scan starts as the order arrives — at the order's minute", () => {
    let s = orderedAtMinuteOne();
    expect(s.clock).toBe(2); // the order's own minute spent
    s = play(PE, [{ type: "acquire", investigationId: "ctpa", collector: "radiographer", where: "eq:ct-scanner", by: "system" }], s);
    expect(ctpa(s).acquired).toMatchObject({ at: 1, collector: "radiographer" });
    expect(ctpa(s).readyAt).toBe(1 + PE.investigations.find((i) => i.id === "ctpa")!.turnaroundMinutes);
  });

  it("an acquisition of a test ordered in text mode, or not ordered, is not an acquisition", () => {
    const s = play(PE, [{ type: "start" }, { type: "order", investigationId: "cbc" }]);
    expect(reduce(PE, s, { type: "acquire", investigationId: "cbc" }).state).toBe(s);
    expect(reduce(PE, s, { type: "acquire", investigationId: "ctpa" }).rejected?.code).toBe("not-ordered");
  });
});

describe("text mode keeps today's abstraction", () => {
  it("the acquisition is implied at the order and recorded as implied; the result's clock starts there", () => {
    const s = play(PE, [{ type: "start" }, { type: "advance-time", minutes: 1 }, { type: "order", investigationId: "ctpa" }]);
    const o = ctpa(s);
    expect(o.acquired).toEqual({ at: 1, seq: o.seq, implied: true });
    expect(o.readyAt).toBe(1 + PE.investigations.find((i) => i.id === "ctpa")!.turnaroundMinutes);
    expect(assess(PE, s).investigations.essentialMissing).not.toContain("ctpa");
    expect(assess(PE, s).investigations.notAcquired).toBeUndefined();
  });

  it("the reference path still verifies and finishes", () => {
    expect(verifyCase(PE).ok).toBe(true);
    const r = replay(PE, PE.solution as ClinicalAction[]);
    expect(r.rejections).toEqual([]);
    expect(r.state.finished).toBe(true);
    // its CTPA was reviewed; the resulting action after it is recorded
    const o = ctpa(r.state);
    expect(o.acquired?.implied).toBe(true);
    expect(o.reviewed).toBeDefined();
    expect(o.next).toBeDefined();
  });
});
