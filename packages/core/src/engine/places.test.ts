/**
 * A place in the care team (docs/TEAM.md §1): chosen once, at `start {seat, lineup}`. The operating surgeon's seat is
 * the learner as always (recorded as no place); a place in the team needs a team with a stand-in surgeon, the base
 * anatomy and a member present in it, and joins at the team's phase — the case's reference path up to it is applied by
 * the system within the start, one recorded action that a transcript replays to the same state. The reference path is
 * the operator's (its start takes no seat), a team with a stand-in must be joinable, and in a place only the place's
 * rubric items are scored while what the team did before is reported apart.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, DomainEvent, ReduceResult, SessionState } from "../schema/session.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";
import { PLACES_TEAM, placesCase } from "./__fixtures__/team-places.js";
import { assess, checkCaseIntegrity, checkTeamDefinition, createSession, evaluate, joinPath, parseCase, reduce, replay, seatsOf, verifyCase } from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const MINI: Json = JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));
const c = placesCase(MINI);
const noTeam = placesCase(MINI, undefined, { team: undefined });
const start = (k: CaseDefinition, action: Partial<Extract<ClinicalAction, { type: "start" }>> = {}): ReduceResult => reduce(k, createSession(k), { type: "start", ...action });
const L = (en: string) => ({ en, "zh-CN": en });

/** The actions reduced one by one, as a live session does (every one accepted). */
function live(k: CaseDefinition, actions: readonly ClinicalAction[]): { state: SessionState; events: DomainEvent[] } {
  let state = createSession(k);
  const events: DomainEvent[] = [];
  for (const a of actions) {
    const r = reduce(k, state, a);
    expect(r.rejected, a.type).toBeUndefined();
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

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

  it("is taken at the start of an untouched encounter: nothing before it, not even the team's phase switched to", () => {
    // a team phase the learner may switch to (the schema's default when an author leaves `learnerSwitchable` out)
    const switchable = structuredClone(MINI);
    delete switchable.phases[1].learnerSwitchable;
    const k = placesCase(switchable);
    expect(checkCaseIntegrity(k).filter((i) => i.severity === "error")).toEqual([]);
    const switched = reduce(k, createSession(k), { type: "set-phase", phase: "observation" });
    expect(switched.rejected).toBeUndefined();
    const r = reduce(k, switched.state, { type: "start", seat: "scrub-nurse" });
    expect(r.rejected).toEqual({
      code: "invalid",
      message: "a place in the team is taken at the start of an untouched encounter: the team's work up to its phase follows the reference path from the beginning (1 action came before this start)",
    });
    expect(r.state).toBe(switched.state);
    // a note before the start counts too
    const noted = reduce(c, createSession(c), { type: "note", text: "Ready." });
    expect(reduce(c, noted.state, { type: "start", seat: "first-assistant" }).rejected?.message).toMatch(/^a place in the team is taken at the start of an untouched encounter/u);
    // the operating surgeon's start stays as it always was
    expect(reduce(k, switched.state, { type: "start", seat: "surgeon" }).rejected).toBeUndefined();
    expect(reduce(k, switched.state, { type: "start" }).rejected).toBeUndefined();
  });

  it("a case served without its reference solution offers no place in the team, and its start refuses one — the places offered are the places a start accepts", () => {
    // the content API's form (`publicCase`, `learnerCase`): the solution left out, parsed as a front-end parses it
    const served = placesCase(MINI, PLACES_TEAM, { solution: undefined });
    expect(start(served, { seat: "scrub-nurse" }).rejected).toEqual({
      code: "invalid",
      message: "this case was loaded without its reference solution, which a place in the team joins along: only the operating surgeon's place is offered",
    });
    expect(start(served, { seat: "surgeon" }).rejected).toBeUndefined();
    for (const k of [c, served]) {
      for (const lineup of [undefined, "three-surgeons"]) {
        for (const team of [undefined, "scrub-break", "second-away"]) {
          const offered = seatsOf(k, { lineup, teamScenario: team });
          if (k === served) expect(offered).toEqual(["surgeon"]);
          for (const place of offered) {
            const r = start(k, { seat: place, ...(lineup ? { lineup } : {}), ...(team ? { team } : {}) });
            expect(r.rejected, `${place} ${lineup} ${team}`).toBeUndefined();
          }
        }
      }
    }
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
    // one recorded action with a sequence number for itself and one for each action it joined after: the records those
    // leave keep the operator's order, and the start is the last of its numbers (`act-6`)
    expect(r.state.seq).toBe(1 + 5);
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
    const session = live(c, actions);
    const again = replay(c, actions);
    expect(again.rejections).toEqual([]);
    expect(again.state).toEqual(session.state);
    expect(again.events).toEqual(session.events);
    expect(replay(c, actions)).toEqual(again);
    expect(session.state).toMatchObject({ finished: true, seat: "scrub-nurse", joined: { actions: 5 } });
    // the line-up, the team scenario and the place are replayed too, to the same state
    const three: ClinicalAction[] = [{ type: "start", seat: "second-assistant", lineup: "three-surgeons", team: "scrub-break" }, ...AFTER];
    const threeLive = live(c, three);
    const threeAgain = replay(c, three);
    expect(threeAgain.rejections).toEqual([]);
    expect(threeAgain.state).toEqual(threeLive.state);
    expect(threeAgain.events).toEqual(threeLive.events);
    expect(threeLive.state).toMatchObject({ seat: "second-assistant", lineup: "three-surgeons", teamScenario: "scrub-break", finished: true, joined: { actions: 5 } });
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

describe("the built-in library: an encounter without a place is assessed as it always was", () => {
  const dir = new URL("../../../content/cases/", import.meta.url);
  const library = readdirSync(dir).map((id) => {
    const parsed = parseCase(JSON.parse(readFileSync(new URL(`${id}/case.json`, dir), "utf8")));
    if (!parsed.ok) throw new Error(`${id}: ${JSON.stringify(parsed.issues)}`);
    return parsed.value;
  });

  it.each(library.map((k) => [k.id, k] as const))("%s: no place and nothing joined; an item is unscored only by its own scoredWhen (or another place's seats)", (_id, k) => {
    const run = replay(k, k.solution);
    expect(run.rejections).toEqual([]);
    const report = assess(k, run.state);
    expect(run.state).not.toHaveProperty("seat");
    expect(run.state).not.toHaveProperty("joined");
    expect(report).not.toHaveProperty("seat");
    expect(report).not.toHaveProperty("joined");
    for (const item of report.rubric) {
      const authored = k.rubric.find((r) => r.id === item.id)!;
      const anotherPlace = authored.seats !== undefined && !authored.seats.includes("surgeon");
      const notArisen = authored.scoredWhen !== undefined && !evaluate(k, run.state, authored.scoredWhen);
      expect(item.scored === false, item.id).toBe(anotherPlace || notArisen);
    }
    // naming the operating surgeon's seat is the same encounter: the same record, events and report
    const named = replay(k, k.solution.map((a) => (a.type === "start" ? { ...a, seat: "surgeon" as const } : a)));
    expect(named.state).toEqual(run.state);
    expect(named.events).toEqual(run.events);
    expect(assess(k, named.state)).toEqual(report);
  });
});
