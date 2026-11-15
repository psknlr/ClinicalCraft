/**
 * The team benchmark by place (docs/TEAM.md §7): on the agent's theatre fixture (core's lap-chole team in
 * general-hospital's theatre, scenarios `scrub-break` and `second-away`), `--seat` starts each scenario that offers the
 * place in it (the start joins the team at its phase), plays the place with its own policy (observer mode) while the
 * stand-in surgeon operates, and scores the scenario's obligations plus the operation — closed in every run: the first
 * assistant's (two surgeons), the second assistant's (three surgeons) and the scrub nurse's places. A scenario whose
 * absences leave the place without its member is skipped, saying why; the scorer reads whose body is whose through core
 * `memberBody` (the surgeon is the stand-in's body in a place, never the learner's); the default run — no place — owes
 * no operation and its report is as before.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent, type LoadedContent } from "@clinicalcraft/agent/node";
import type { TeamCheckpoint } from "@clinicalcraft/agent";
import { THEATRE, theatreCase, theatreFacility } from "../../../world/src/__fixtures__/theatre.js";
import { teamMarkdown } from "./report.js";
import { obligations, placeCases, runTeamBench } from "./run.js";

const builtin = await loadContent();

/** The built-in content and the theatre fixture: its case (with the team) and a hospital whose theatre has its staff. */
function fixtureContent(): LoadedContent {
  const c = theatreCase();
  const facility = theatreFacility();
  facility.id = "bench-theatre-hospital";
  facility.placements = facility.placements.filter((p) => !p.type.startsWith("test-"));
  const caseDef = { ...c, facility: facility.id };
  return {
    ...builtin,
    cases: new Map([[caseDef.id, { def: caseDef, dir: "/fixture", file: join("/fixture", "case.json") }]]),
    facilities: new Map([...builtin.facilities, [facility.id, { def: facility, file: "/fixture/facility.json" }]]),
  };
}

const T = 300_000;

describe("bench team by place", () => {
  it("the first assistant's place: every scenario run in the place, the operation closed, the obligations met", { timeout: T }, async () => {
    const content = fixtureContent();
    expect(placeCases(content, "first-assistant").map((c) => c.id)).toEqual(["mini-lap-chole-sit"]);
    const report = await runTeamBench(content, { seat: "first-assistant" });
    expect(report).toMatchObject({ seat: "first-assistant", skipped: [] });
    expect(report.runs.map((r) => [r.scenario, r.pass, r.operation])).toEqual([
      ["scrub-break", true, { closed: true }],
      ["second-away", true, { closed: true }],
    ]);
    for (const r of report.runs) {
      expect(r.failures, r.scenario).toEqual([]);
      expect(r).toMatchObject({ seat: "first-assistant", activated: true, completed: true, invalid: false, exactlyOnce: true });
      // whose body is whose by place: the operation is the stand-in's, never the learner's
      expect(r.obligations).toEqual([expect.objectContaining({ id: "operation", kind: "operation", recipient: "staff:doc-0", item: "lap-chole", status: "met", physical: true, verified: true })]);
    }
    const md = teamMarkdown(report, "en");
    expect(md).toMatch(/By place: the first assistant's, played by its own policy \(observer mode\) while the stand-in surgeon operates; each run also owes the operation brought to its close\./u);
    expect(md).toMatch(/\| mini-lap-chole-sit \| scrub-break \| operation closed \| 1 \/ 0 \/ 0 \/ 0 \|/u);
    expect(teamMarkdown(report, "zh-CN")).toMatch(/按岗位：第一助手岗位由其自身策略代为完成/u);
  });

  it("the second assistant's place with three surgeons, and the scrub nurse's: run where the place is offered, skipped where its member is away", { timeout: T }, async () => {
    const content = fixtureContent();
    // without the line-up there is no second assistant: no case offers the place
    expect(placeCases(content, "second-assistant")).toEqual([]);
    const second = await runTeamBench(content, { seat: "second-assistant", lineup: "three-surgeons" });
    expect(second).toMatchObject({ seat: "second-assistant", lineup: "three-surgeons" });
    expect(second.skipped).toEqual([{ caseId: "mini-lap-chole-sit", scenario: "second-away", reason: "the second assistant's place is not offered in this scenario (its member is away)" }]);
    expect(second.runs.map((r) => [r.scenario, r.pass, r.operation?.closed, r.failures])).toEqual([["scrub-break", true, true, []]]);
    const scrub = await runTeamBench(content, { seat: "scrub-nurse" });
    expect(scrub.skipped?.map((x) => x.scenario)).toEqual(["scrub-break"]);
    expect(scrub.runs.map((r) => [r.scenario, r.pass, r.operation?.closed, r.failures])).toEqual([["second-away", true, true, []]]);
    expect(teamMarkdown(scrub, "en")).toMatch(/## Not run \(the place is not offered\)\n\n- mini-lap-chole-sit · scrub-break: the scrub nurse's place is not offered in this scenario \(its member is away\)/u);
  });

  it("without a place: the same runs as ever — no operation owed, the surgeon the learner's body", { timeout: T }, async () => {
    const report = await runTeamBench(fixtureContent());
    expect(report.seat).toBeUndefined();
    expect(report.skipped).toBeUndefined();
    expect(report.runs.map((r) => [r.scenario, r.pass, r.operation])).toEqual([
      ["scrub-break", true, undefined],
      ["second-away", true, undefined],
    ]);
    for (const r of report.runs) expect(r.obligations).toEqual([]);
  });

  it("the scorer resolves recipients by place through core memberBody: the surgeon is the stand-in's body in a place, the learner's without one", () => {
    const c = theatreCase({ team: { ...theatreCase().team!, room: THEATRE, count: { item: "test-swab", when: { always: true }, searchPlaces: ["or-instrument-table"] }, scenarios: [{ id: "needs", name: { en: "n", "zh-CN": "n" }, summary: { en: "n", "zh-CN": "n" }, provenance: "authored", needs: [{ id: "a", item: "test-swab", for: "surgeon" }, { id: "b", item: "test-swab", for: "doc-1" }] }] } });
    const cp: TeamCheckpoint = { format: "clinicalcraft-team@1", autonomy: "step", surgeon: "simulated", state: { version: 2, scenario: "needs", lifecycle: "active", round: 3, seq: 0, members: [], messages: [], receipts: [], tasks: [], claims: {}, completed: [], posted: ["a", "b"], extra: [] } };
    const recipients = (choice: Record<string, unknown>) => obligations(c, "needs", { count: "correct" }, cp, { choice }).map((o) => [o.id, o.recipient]);
    expect(recipients({})).toEqual([
      ["need:a", "actor:clinician"],
      ["need:b", "staff:doc-1"],
      ["count", "actor:clinician"],
    ]);
    // in the first assistant's place: the surgeon is the stand-in (doc-0), and the place's member is the learner
    expect(recipients({ seat: "first-assistant" })).toEqual([
      ["need:a", "staff:doc-0"],
      ["need:b", "actor:clinician"],
      ["count", "staff:doc-0"],
    ]);
  });
});
