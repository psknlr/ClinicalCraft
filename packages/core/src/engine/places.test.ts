/**
 * A place in the care team (docs/TEAM.md §1): chosen once, at `start {seat, lineup}`. The operating surgeon's seat is
 * the learner as always (recorded as no place); a place in the team needs a team with a stand-in surgeon, the base
 * anatomy and a member present in it, and joins at the team's phase — the case's reference path up to it is applied by
 * the system within the start, one recorded action that a transcript replays to the same state. The reference path is
 * the operator's (its start takes no seat), a team with a stand-in must be joinable, and in a place only the place's
 * rubric items are scored while what the team did before is reported apart.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, ReduceResult, SessionState } from "../schema/session.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";
import { PLACES_TEAM, placesCase } from "./__fixtures__/team-places.js";
import { assess, checkCaseIntegrity, checkTeamDefinition, createSession, joinPath, parseCase, reduce, replay, verifyCase } from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const MINI: Json = JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));
const c = placesCase(MINI);
const noTeam = placesCase(MINI, undefined, { team: undefined });
const start = (k: CaseDefinition, action: Partial<Extract<ClinicalAction, { type: "start" }>> = {}): ReduceResult => reduce(k, createSession(k), { type: "start", ...action });
const L = (en: string) => ({ en, "zh-CN": en });

/** A path that ends before the team's phase: no oxygen, so the patient is never stabilised (and no disposition). */
const SHORT = [...MINI.solution.slice(0, 5), { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] }, { type: "finish" }];

/** The rest of the reference path once the team has reached its phase (the learner's part in these tests). */
const AFTER: ClinicalAction[] = [
  { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] },
  { type: "answer", decisionId: "disposition", optionIds: ["referral", "observe", "autoinjector"] },
  { type: "finish" },
];

describe("the operating surgeon's seat", () => {
  it("is the learner as always, with a team or without: accepted and recorded as no place", () => {
    for (const k of [c, noTeam]) {
      const r = start(k, { seat: "surgeon" });
      expect(r.rejected).toBeUndefined();
      expect(r.state.seat).toBeUndefined();
      expect(r).toEqual(start(k));
    }
  });
});

describe("a place in the team, at start", () => {
  it("needs a team whose surgeon names a stand-in, a member in that place, present; a line-up the team has", () => {
    expect(start(noTeam, { seat: "scrub-nurse" }).rejected).toEqual({ code: "invalid", message: "this case has no care team: the learner operates (there is no scrub-nurse place)" });
    const noStandIn = structuredClone(PLACES_TEAM) as Json;
    delete noStandIn.members[4].standIn;
    expect(start(placesCase(MINI, noStandIn), { seat: "first-assistant" }).rejected?.message).toMatch(/^nobody in this case's team stands in for the surgeon/u);
    expect(start(c, { seat: "second-assistant" }).rejected).toEqual({ code: "invalid", message: "this case's team has no second-assistant: there is no such place" });
    expect(start(c, { seat: "scrub-nurse", team: "scrub-break" }).rejected).toEqual({ code: "invalid", message: `"nurse-2" is absent in team scenario "scrub-break": the scrub-nurse place is not offered` });
    expect(start(c, { lineup: "nope" }).rejected).toEqual({ code: "unknown-id", message: `this case's team has no line-up "nope"` });
    expect(start(noTeam, { lineup: "three-surgeons" }).rejected?.code).toBe("invalid");
    // a refused start leaves the session as it was: not started, no place
    expect(start(c, { seat: "second-assistant" }).state).toEqual(createSession(c));
  });

  it("is offered with the base anatomy only: the stand-in surgeon follows the reference path", () => {
    const lap = parseCase({
      ...structuredClone(LAP_CHOLE_SIT),
      team: { room: "or", phases: ["theatre"], members: [{ staff: "or.circulating", duties: ["circulate"] }, { staff: "or.assistant", duties: ["assist"] }, { staff: "surgeon", duties: ["surgeon"], standIn: "or.surgeon" }] },
      solution: [{ type: "start" }, { type: "set-phase", phase: "theatre" }],
    });
    if (!lap.ok) throw new Error(JSON.stringify(lap.issues));
    expect(start(lap.value, { seat: "first-assistant", variant: "aberrant-duct" }).rejected?.message).toBe("the first-assistant place is offered with the base anatomy only: the stand-in surgeon follows the reference path");
    expect(start(lap.value, { seat: "first-assistant", variant: "reference" }).rejected).toBeUndefined();
    expect(start(lap.value, { seat: "first-assistant" }).state).toMatchObject({ seat: "first-assistant", phase: "theatre", joined: { actions: 1 } });
  });

  it("records the place and the line-up chosen; the first assistant's place stands with the scrub nurse on a break", () => {
    expect(start(c, { seat: "second-assistant", lineup: "three-surgeons" }).state).toMatchObject({ seat: "second-assistant", lineup: "three-surgeons" });
    expect(start(c, { lineup: "three-surgeons" }).state).toMatchObject({ lineup: "three-surgeons" });
    expect(start(c, { lineup: "three-surgeons" }).state.seat).toBeUndefined();
    const relieved = start(c, { seat: "first-assistant", team: "scrub-break" });
    expect(relieved.rejected).toBeUndefined();
    expect(relieved.state).toMatchObject({ seat: "first-assistant", teamScenario: "scrub-break", phase: "observation" });
  });
});

describe("joining at the team's phase", () => {
  it("applies the reference path up to the team's phase, by the system, within the start — the same path, events and state", () => {
    const r = start(c, { seat: "scrub-nurse" });
    expect(r.rejected).toBeUndefined();
    const prefix = joinPath(c).slice(0, 5);
    expect(prefix.map((a) => a.type)).toEqual(["examine", "ask", "ask", "intervene", "intervene"]);
    expect(r.state).toMatchObject({ seat: "scrub-nurse", phase: "observation", joined: { actions: 5, asked: ["allergies", "trigger"], examined: ["airway"], orders: [], decisions: [], objectives: ["assess", "treat", "stabilise"] } });
    expect(r.state.joined).toMatchObject({ seq: r.state.seq, at: r.state.clock });
    // exactly what the reference path does when the operator works it: the start's events first, then the path's
    const classic = replay(c, [{ type: "start" }, ...prefix.map((a) => ({ ...a, by: "system" as const }))]);
    expect(classic.rejections).toEqual([]);
    expect(r.events[0]).toEqual({ type: "session.started" });
    expect(r.events).toEqual(classic.events);
    const { seat, joined, ...rest } = r.state;
    expect(seat).toBe("scrub-nurse");
    expect(joined).toBeDefined();
    expect(rest).toEqual(classic.state);
  });

  it("is one recorded action: a transcript with start {seat} replays to the state the session reached", () => {
    const actions: ClinicalAction[] = [{ type: "start", seat: "scrub-nurse" }, ...AFTER];
    let live: SessionState = createSession(c);
    const events: unknown[] = [];
    for (const a of actions) {
      const r = reduce(c, live, a);
      expect(r.rejected, a.type).toBeUndefined();
      live = r.state;
      events.push(...r.events);
    }
    const again = replay(c, actions);
    expect(again.rejections).toEqual([]);
    expect(again.state).toEqual(live);
    expect(again.events).toEqual(events);
    expect(replay(c, actions)).toEqual(again);
    expect(live).toMatchObject({ finished: true, seat: "scrub-nurse", joined: { actions: 5 } });
    // the line-up and the place are replayed too
    const three: ClinicalAction[] = [{ type: "start", seat: "second-assistant", lineup: "three-surgeons", team: "scrub-break" }, ...AFTER];
    expect(replay(c, three).state).toMatchObject({ seat: "second-assistant", lineup: "three-surgeons", teamScenario: "scrub-break", finished: true });
  });

  it("is refused when the reference path cannot bring the team to its phase", () => {
    const path = (solution: unknown[]) => placesCase(MINI, PLACES_TEAM, { solution });
    const withoutOxygen = path(SHORT);
    expect(start(withoutOxygen, { seat: "first-assistant" }).rejected).toEqual({ code: "invalid", message: "the case's reference path never reaches the team's phases (observation)" });
    const refusedStep = path([MINI.solution[0], { type: "read", investigationId: "abg" }, ...MINI.solution.slice(1)]);
    expect(start(refusedStep, { seat: "first-assistant" }).rejected?.message).toBe(`the case's reference path cannot bring the team to its phase: its "read" was refused ("abg" has not been ordered in phase "arrival")`);
    // the operating surgeon's seat never joins: nothing to refuse
    expect(start(withoutOxygen, { seat: "surgeon" }).rejected).toBeUndefined();
  });
});

describe("the case's checks", () => {
  it("the reference path is the operating surgeon's: its start takes no seat; a line-up it names exists", () => {
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
    const seated = placesCase(MINI, PLACES_TEAM, { solution: [{ type: "start", seat: "scrub-nurse" }, ...MINI.solution.slice(1)] });
    expect(checkCaseIntegrity(seated)).toContainEqual({ path: "solution.0.seat", message: `the reference solution is the operating surgeon's: its start takes no seat (here "scrub-nurse")`, severity: "error" });
    const lineup = placesCase(MINI, PLACES_TEAM, { solution: [{ type: "start", lineup: "nope" }, ...MINI.solution.slice(1)] });
    expect(checkCaseIntegrity(lineup)).toContainEqual({ path: "solution.0.lineup", message: `unknown line-up "nope"`, severity: "error" });
    expect(checkCaseIntegrity(placesCase(MINI, PLACES_TEAM, { solution: [{ type: "start", lineup: "three-surgeons" }, ...MINI.solution.slice(1)] })).filter((i) => i.path.startsWith("solution"))).toEqual([]);
  });

  it("a team with a stand-in can be joined in every place it offers, with every line-up", () => {
    const k = placesCase(MINI, PLACES_TEAM, { solution: SHORT });
    const messages = checkTeamDefinition(k).map((i) => `${i.path}: ${i.message}`);
    expect(messages).toEqual([
      "team.members.4.standIn: the first-assistant place cannot be joined: the case's reference path never reaches the team's phases (observation)",
      "team.members.4.standIn: the scrub-nurse place cannot be joined: the case's reference path never reaches the team's phases (observation)",
      `team.members.4.standIn: the first-assistant place (line-up "three-surgeons") cannot be joined: the case's reference path never reaches the team's phases (observation)`,
      `team.members.4.standIn: the second-assistant place (line-up "three-surgeons") cannot be joined: the case's reference path never reaches the team's phases (observation)`,
      `team.members.4.standIn: the scrub-nurse place (line-up "three-surgeons") cannot be joined: the case's reference path never reaches the team's phases (observation)`,
    ]);
    expect(checkTeamDefinition(c)).toEqual([]);
  });
});

describe("assessment in a place", () => {
  /** The reference path with a test ordered and the diagnosis made before the team's phase: both the team's in a place. */
  const EARLY = [
    MINI.solution[0],
    ...MINI.solution.slice(1, 4),
    { type: "order", investigationId: "abg" },
    { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] },
    ...MINI.solution.slice(4, 6),
    { type: "answer", decisionId: "disposition", optionIds: ["referral", "observe", "autoinjector"] },
    { type: "finish" },
  ];
  const rubric = [
    ...MINI.rubric,
    { id: "for-scrub", domain: "management", text: L("Disposition planned with the team"), weight: 4, met: { decided: "disposition" }, seats: ["scrub-nurse"] },
    { id: "for-assistant", domain: "management", text: L("Disposition planned with the surgeon"), weight: 5, met: { decided: "disposition" }, seats: ["first-assistant"] },
    { id: "for-both", domain: "safety", text: L("No beta-blocker in the room"), weight: 1, met: { not: { intervened: "beta-blocker" } }, seats: ["surgeon", "scrub-nurse"] },
  ];
  const k = placesCase(MINI, PLACES_TEAM, { solution: EARLY, rubric });
  const scrub = replay(k, [{ type: "start", seat: "scrub-nurse" }, { type: "answer", decisionId: "disposition", optionIds: ["referral", "observe", "autoinjector"] }, { type: "finish" }]);

  it("the operating surgeon's session scores as it always has: a team, line-ups and places change nothing", () => {
    expect(verifyCase(k).ok).toBe(true);
    const plain = assess(noTeam, replay(noTeam, MINI.solution).state);
    expect(assess(c, replay(c, MINI.solution).state)).toEqual(plain);
    expect(plain).not.toHaveProperty("seat");
    expect(plain).not.toHaveProperty("joined");
    // an item for another place is not the operator's: not scored; one listing the surgeon is
    const classic = assess(k, replay(k, EARLY).state);
    expect(classic.rubric.filter((r) => r.scored === false).map((r) => r.id)).toEqual(["for-scrub", "for-assistant"]);
    expect(classic.rubric.find((r) => r.id === "for-both")).toEqual({ id: "for-both", domain: "safety", weight: 1, met: true });
  });

  it("only the place's items are scored; what the team had done is the team's, never credited", () => {
    expect(scrub.rejections).toEqual([]);
    const report = assess(k, scrub.state);
    expect(report.seat).toBe("scrub-nurse");
    expect(report.rubric.filter((r) => r.scored !== false).map((r) => r.id)).toEqual(["for-scrub", "for-both"]);
    expect(report.score).toEqual({ earned: 5, possible: 5, percent: 100 });
    expect(report.joined).toEqual({ history: ["trigger", "allergies"], exam: ["airway"], investigations: ["abg"], decisions: ["dx"], objectives: ["assess", "treat", "stabilise", "diagnose"] });
    // the history, the examination, the tests and the decisions count what was left to do when the learner joined
    expect(report.history).toEqual({ asked: 0, required: 0, requiredAsked: 0, missingRequired: [] });
    expect(report.exam).toEqual({ performed: 0, required: 0, requiredPerformed: 0, missingRequired: [] });
    expect(report.investigations).toMatchObject({ ordered: 0, essentialMissing: [], unread: [] });
    expect(report.decisions.map((d) => d.id)).toEqual(["disposition"]);
    // the case's progress is the case's: every objective is done, the team's among them
    expect(report.completed).toBe(true);
    expect(report.objectives.every((o) => o.done)).toBe(true);
    // the same encounter worked by the operator credits it all
    const classic = assess(k, replay(k, EARLY).state);
    expect(classic.history).toEqual({ asked: 2, required: 2, requiredAsked: 2, missingRequired: [] });
    expect(classic.investigations).toMatchObject({ ordered: 1 });
    expect(classic.decisions.map((d) => d.id)).toEqual(["dx", "disposition"]);
  });

  it("safety gates stay the team's outcomes, in every place", () => {
    const gated = placesCase(MINI, PLACES_TEAM, { solution: EARLY, rubric, safetyGates: [{ id: "no-oxygen-first", label: L("Oxygen before adrenaline"), when: { flag: "oxygen-on" }, verdict: "complication" }] });
    const report = assess(gated, replay(gated, [{ type: "start", seat: "scrub-nurse" }, ...AFTER.slice(1)]).state);
    expect(report.safety).toMatchObject({ gates: [{ id: "no-oxygen-first", verdict: "complication" }], verdict: "complication" });
  });
});
