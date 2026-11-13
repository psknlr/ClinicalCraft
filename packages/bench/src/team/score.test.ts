/**
 * The team benchmark's denominator (docs/TEAM.md §7; the 2.3.0 audit, repair 5): obligations are enumerated by id
 * from the scenario, and a run passes only when every one is met or appropriately escalated — two requests for the
 * same instrument with one delivery is not a pass however many rounds it ran; a scenario whose work never started is
 * invalid; one item cannot answer two requests; closure on an open count fails the run, while the nurse's escalation
 * keeps its credit.
 */
import { describe, expect, it } from "vitest";
import type { CaseDefinition, CountRecord, SiteLedger } from "@clinicalcraft/core";
import type { TeamCheckpoint, TeamTask } from "@clinicalcraft/agent";
import { teamMarkdown } from "./report.js";
import { score, teamCounts } from "./run.js";

const c = {
  id: "challenge",
  team: {
    room: "or-7",
    count: { item: "swab", when: { always: true }, searchPlaces: ["or-7.mayo"], closure: "record" },
    site: { sides: { left: { en: "left" }, right: { en: "right" } }, evidence: [], when: { always: true }, holds: "induction" },
    scenarios: [
      { id: "two-requests", needs: [{ id: "a", item: "needle-holder", for: "surgeon" }, { id: "b", item: "needle-holder", for: "surgeon" }] },
      { id: "gone", needs: [], expect: { count: "unresolved" } },
      { id: "mark-wrong", needs: [], site: { mark: "right" }, expect: { site: "corrected" } },
      { id: "site-control", needs: [], expect: { site: "confirmed" } },
      { id: "consent-wrong", needs: [], site: { evidence: { consent: "right" } }, expect: { site: "unresolved" } },
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

/**
 * A site scenario (docs/TEAM.md §4.5) is read from the case's site record and its holds: who detected, who called the
 * pause, who verified what, what justified resuming. It passes only as the scenario expects — and never with a pause
 * where the mark agreed with the plan, a discrepancy nobody paused for, a pause left standing on a confirmed site, or
 * a release before the site was verified and confirmed.
 */
describe("the team benchmark reads the site's story from the record", () => {
  const NURSE = "or-7.circulating-nurse";
  const none: SiteLedger = { status: "unchecked", detected: null, pause: null, verified: [], corrections: [], confirmed: null, resumed: null, escalated: null, unjustified: false };
  const corrected: SiteLedger = {
    status: "corrected",
    detected: { by: NURSE, at: 10, sources: ["mark", "consent"], values: ["right", "left"] },
    pause: { by: NURSE, at: 10.1, reason: "the mark and the consent form do not agree" },
    verified: [
      { source: "consent", value: "left", by: "surgeon", at: 11 },
      { source: "imaging", value: "left", by: "surgeon", at: 11.5 },
    ],
    corrections: [{ what: "mark", side: "left", by: "surgeon", at: 12 }],
    confirmed: { by: NURSE, at: 13, side: "left" },
    resumed: { by: NURSE, at: 13.1, justification: "verified against the consent form and the CT; re-marked by the surgeon" },
    escalated: null,
    unjustified: false,
  };
  const before = (scenario: string, site: TeamCheckpoint["state"]["site"]) => cp({ scenario, lifecycle: "pending", round: 20, posted: [], ...(site ? { site } : {}) });
  const timing = { dueRound: 0, detectedRound: 6, pausedRound: 7, settledRound: 20 };

  it("corrected as expected: met, with who detected, who paused, who verified and what justified resuming", () => {
    const r = score(c, "mark-wrong", { site: "corrected" }, before("mark-wrong", timing), { site: corrected });
    expect(r.pass, r.failures.join("; ")).toBe(true);
    expect(r).toMatchObject({ activated: true, completed: true, invalid: false });
    expect(r.obligations).toEqual([expect.objectContaining({ id: "site", kind: "site", status: "met", physical: true, verified: true })]);
    expect(r.site).toMatchObject({
      outcome: "corrected",
      detected: { by: NURSE, between: "mark: right / consent: left" },
      pause: { by: NURSE },
      verified: [
        { source: "consent", says: "left", by: "surgeon" },
        { source: "imaging", says: "left", by: "surgeon" },
      ],
      corrections: [{ what: "mark → left", by: "surgeon" }],
      confirmed: { by: NURSE, side: "left" },
      resumed: { by: NURSE, justification: expect.stringContaining("re-marked by the surgeon") },
      detectionLatency: 6,
      secondsToPause: 6,
      secondsHeld: 180,
      falsePause: false,
      unjustifiedResume: false,
    });
    // the report says it in words, in either language
    const md = teamMarkdown({ format: "clinicalcraft-team-report@2", runs: [r], passed: 1, total: 1, counts: teamCounts([r]) }, "en");
    expect(md).toContain("## The operative site");
    expect(md).toContain(`| ${NURSE} (mark: right / consent: left) | ${NURSE} · 6 s |`);
    expect(md).toContain("verified against the consent form and the CT; re-marked by the surgeon");
    expect(teamMarkdown({ format: "clinicalcraft-team-report@2", runs: [r], passed: 1, total: 1, counts: teamCounts([r]) }, "zh-CN")).toContain("## 手术部位核查");
  });

  it("the control: confirmed with no pause passes; a pause where the mark agreed with the plan is a false pause", () => {
    const confirmed: SiteLedger = { ...none, status: "confirmed", confirmed: { by: NURSE, at: 9, side: "left" } };
    expect(score(c, "site-control", { site: "confirmed" }, before("site-control", { dueRound: 0, settledRound: 8 }), { site: confirmed })).toMatchObject({ pass: true, site: { falsePause: false } });
    const paused = score(c, "site-control", { site: "confirmed" }, before("site-control", { dueRound: 0, settledRound: 8 }), { site: { ...confirmed, pause: { by: NURSE, at: 8, reason: "to be sure" } } });
    expect(paused.pass).toBe(false);
    expect(paused.failures).toContain("a pause on the site when the mark agreed with the plan (false pause)");
  });

  it("a wrong mark confirmed as it stood, a discrepancy nobody paused for, a pause never released: none passes", () => {
    const missed = score(c, "mark-wrong", { site: "corrected" }, before("mark-wrong", { dueRound: 0, settledRound: 8 }), { site: { ...none, status: "confirmed", confirmed: { by: NURSE, at: 9, side: "right" } } });
    expect(missed.obligations[0]?.status).toBe("failed");
    expect(missed.failures).toEqual(expect.arrayContaining(["site: expected corrected, got confirmed", "a discrepancy on the site, and nobody called a pause"]));
    const noPause = score(c, "mark-wrong", { site: "corrected" }, before("mark-wrong", timing), { site: { ...corrected, pause: null, resumed: null } });
    expect(noPause.obligations[0]?.status).toBe("failed");
    expect(noPause.failures).toContain("a discrepancy on the site, and nobody called a pause");
    const standing = score(c, "mark-wrong", { site: "corrected" }, before("mark-wrong", timing), { site: { ...corrected, resumed: null } });
    expect(standing.pass).toBe(false);
    expect(standing.failures).toContain("the site was confirmed, but the pause was never released");
  });

  it("resumed before the site was verified and confirmed fails, even when it was put right afterwards", () => {
    const r = score(c, "mark-wrong", { site: "corrected" }, before("mark-wrong", timing), { site: { ...corrected, unjustified: true } });
    expect(r.obligations[0]?.status).toBe("failed");
    expect(r.failures).toContain("resumed before the site was verified and confirmed");
    expect(r.site?.unjustifiedResume).toBe(true);
  });

  it("evidence that disagrees with itself: escalated with a reason is credited — and the pause must still stand", () => {
    const unresolved: SiteLedger = { ...corrected, status: "unresolved", corrections: [], confirmed: null, resumed: null, escalated: { by: NURSE, at: 12, reason: "the consent form says right, the CT says left" } };
    const r = score(c, "consent-wrong", { site: "unresolved" }, before("consent-wrong", { dueRound: 0, detectedRound: 6, pausedRound: 7, settledRound: 16 }), { site: unresolved });
    expect(r.obligations).toEqual([expect.objectContaining({ id: "site", status: "escalated", escalation: { reason: "the consent form says right, the CT says left", appropriate: true } })]);
    expect(r.pass, r.failures.join("; ")).toBe(true);
    expect(teamCounts([r])).toMatchObject({ assigned: 1, activated: 1, completed: 1, escalated: 1 });
    // escalated where it should have been put right is not appropriate; a release on an unresolved site fails
    expect(score(c, "mark-wrong", { site: "corrected" }, before("mark-wrong", timing), { site: unresolved }).pass).toBe(false);
    const released = score(c, "consent-wrong", { site: "unresolved" }, before("consent-wrong", timing), { site: { ...unresolved, resumed: { by: NURSE, at: 13, justification: "carry on" } } });
    expect(released.failures).toContain("the pause was released on a site that is not resolved");
  });

  it("still open when the run stopped is unfinished; a site whose verification never fell due is invalid", () => {
    const open = score(c, "mark-wrong", { site: "corrected" }, before("mark-wrong", { dueRound: 0, detectedRound: 6, pausedRound: 7 }), { site: { ...corrected, status: "discrepancy", confirmed: null, resumed: null, corrections: [] } });
    expect(open.obligations[0]?.status).toBe("unfinished");
    expect(open.pass).toBe(false);
    const never = score(c, "mark-wrong", { site: "corrected" }, before("mark-wrong", undefined), { site: { ...none, status: "none" } });
    expect(never).toMatchObject({ activated: false, invalid: true, pass: false });
  });
});
