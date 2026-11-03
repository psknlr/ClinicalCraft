/**
 * The team benchmark's denominator (docs/TEAM.md §7; the 2.3.0 audit, repair 5): obligations are enumerated by id
 * from the scenario, and a run passes only when every one is met or appropriately escalated — two requests for the
 * same instrument with one delivery is not a pass however many rounds it ran; a scenario whose work never started is
 * invalid; one item cannot answer two requests; closure on an open count fails the run, while the nurse's escalation
 * keeps its credit.
 */
import { describe, expect, it } from "vitest";
import type { CaseDefinition, CountRecord } from "@clinicalcraft/core";
import type { TeamCheckpoint, TeamTask } from "@clinicalcraft/agent";
import { score, teamCounts } from "./run.js";

const c = {
  id: "challenge",
  team: {
    room: "or-7",
    count: { item: "swab", when: { always: true }, searchPlaces: ["or-7.mayo"], closure: "record" },
    scenarios: [
      { id: "two-requests", needs: [{ id: "a", item: "needle-holder", for: "surgeon" }, { id: "b", item: "needle-holder", for: "surgeon" }] },
      { id: "gone", needs: [], expect: { count: "unresolved" } },
    ],
  },
} as unknown as CaseDefinition;

const supply = (need: string, set: Partial<TeamTask>): TeamTask => ({ id: `t-${need}`, kind: "supply", need, item: "needle-holder", for: "actor:clinician", owner: "staff:circ", initiator: "staff:circ", thread: `th-${need}`, status: "open", since: 0, tried: [], acts: 0, ...set });
const cp = (state: Partial<TeamCheckpoint["state"]>): TeamCheckpoint => ({
  format: "clinicalcraft-team@1",
  autonomy: "step",
  surgeon: "simulated",
  state: { version: 2, scenario: "two-requests", lifecycle: "active", round: 120, seq: 0, members: [], messages: [], receipts: [], tasks: [], claims: {}, completed: [], posted: ["a", "b"], extra: [], ...state },
});
const holding = (items: string[]) => () => items;

describe("the team benchmark counts obligations, not rounds", () => {
  it("two requests for one instrument, one delivery, 120 rounds: not a pass — the second is unfinished", () => {
    const r = score(c, "two-requests", { delivered: true }, cp({ tasks: [supply("a", { status: "done", verified: true, itemId: "eq:nh-1" }), supply("b", { status: "accepted" })] }), { holding: holding(["eq:nh-1"]) });
    expect(r.obligations.map((o) => [o.id, o.status])).toEqual([
      ["need:a", "met"],
      ["need:b", "unfinished"],
    ]);
    expect(r.pass).toBe(false);
    expect(r.completed).toBe(false);
    expect(r.failures).toContain("unfinished when the run stopped: need:b");
  });

  it("one item cannot answer two requests; both delivered with their own items passes", () => {
    const same = score(c, "two-requests", { delivered: true }, cp({ tasks: [supply("a", { status: "done", verified: true, itemId: "eq:nh-1" }), supply("b", { status: "done", verified: true, itemId: "eq:nh-1" })] }), { holding: holding(["eq:nh-1"]) });
    expect(same.obligations.map((o) => o.status)).toEqual(["met", "failed"]);
    expect(same.pass).toBe(false);
    const both = score(c, "two-requests", { delivered: true }, cp({ tasks: [supply("a", { status: "done", verified: true, itemId: "eq:nh-1" }), supply("b", { status: "done", verified: true, itemId: "eq:nh-2" })] }), { holding: holding(["eq:nh-1", "eq:nh-2"]) });
    expect(both.pass, both.failures.join("; ")).toBe(true);
    expect(both.completed).toBe(true);
  });

  it("a scenario whose work never started is invalid, never a pass", () => {
    const r = score(c, "two-requests", { delivered: true }, cp({ lifecycle: "pending", round: 0, posted: [] }));
    expect(r).toMatchObject({ activated: false, invalid: true, pass: false });
    expect(r.failures[0]).toMatch(/^invalid/);
  });

  it("the nurse's escalation of a missing swab is credited; closure on it fails the run all the same", () => {
    const record: CountRecord = {
      item: "swab",
      room: "or-7",
      expected: ["s1", "s2"],
      entries: [
        { op: "baseline", ids: ["s1", "s2"], staff: "system", at: 0, seq: 1 },
        { op: "count", ids: ["s1"], staff: "scrub", stage: "closing", at: 1, seq: 2, missing: ["s2"], unexpected: [] },
        { op: "escalate", staff: "circ", to: "surgeon", reason: "still short — X-ray", at: 2, seq: 3 },
      ],
      unsafe: [],
    };
    const state = { scenario: "gone", posted: [], count: { item: "swab", baseline: 2, holds: 1, dueRound: 0, detectedRound: 1, settledRound: 9, outcome: "unresolved" as const }, messages: [] };
    const escalated = score(c, "gone", { count: "unresolved" }, cp(state), { record });
    expect(escalated.obligations).toEqual([expect.objectContaining({ id: "count", status: "escalated", escalation: expect.objectContaining({ appropriate: true }) })]);
    expect(escalated.pass, escalated.failures.join("; ")).toBe(true);
    const closed = score(c, "gone", { count: "unresolved" }, cp(state), { record: { ...record, unsafe: [{ what: "closure", status: "unresolved", missing: ["s2"], unexpected: [], at: 3, seq: 4 }] } });
    expect(closed.obligations[0]?.status).toBe("escalated");
    expect(closed.pass).toBe(false);
    expect(closed.failures).toContain("closure began while the count was not settled");
    expect(teamCounts([escalated, closed])).toMatchObject({ assigned: 2, activated: 2, completed: 2, escalated: 2, invalid: 0 });
  });
});
