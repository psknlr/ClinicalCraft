/**
 * A case's care team (docs/TEAM.md §6): its own consistency and its fit to the facility; a team scenario is chosen
 * at `start` (hidden state) and an unknown one is refused.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { EquipmentCatalog, FacilityDefinition } from "../schema/facility.js";
import { checkCaseIntegrity, checkTeamDefinition, createSession, parseCase, parseCatalog, parseFacility, reduce, teamFacilityIssues } from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const fixture = (name: string): Json => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

const L = (en: string) => ({ en, "zh-CN": en });
const TEAM = {
  room: "consult",
  phases: ["observation"],
  members: [
    { staff: "nurse-1", duties: ["circulate"] },
    { staff: "nurse-2", duties: ["instruments"] },
    { staff: "surgeon", duties: ["surgeon"] },
  ],
  scenarios: [
    {
      id: "pass-forceps",
      name: L("Forceps"),
      summary: L("The surgeon needs forceps."),
      provenance: "authored",
      needs: [{ id: "forceps", item: "forceps", for: "surgeon" }],
      items: [{ placement: "forceps-1", beside: "couch-1" }],
    },
  ],
};

function withTeam(team: unknown = TEAM, extra: Json = {}): CaseDefinition {
  const parsed = parseCase({ ...fixture("mini-anaphylaxis.case.json"), team, ...extra });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

/** The mini facility with a second nurse and a pair of forceps (a handheld item) in the consult room. */
function facility(): { f: FacilityDefinition; catalogs: EquipmentCatalog[] } {
  const raw = fixture("mini.facility.json");
  raw.staff.push({ ...raw.staff[0], id: "nurse-2" });
  raw.placements.push({ id: "forceps-1", type: "forceps", x: raw.placements[0].x, z: raw.placements[0].z, room: "consult" });
  const cat = fixture("mini.catalog.json");
  cat.equipment.push({ ...cat.equipment[0], id: "forceps", portable: "handheld", screen: undefined, interaction: { kind: "none" }, footprint: { w: 0.2, d: 0.1, h: 0.05 } });
  const f = parseFacility(raw);
  const c = parseCatalog(cat);
  if (!f.ok || !c.ok) throw new Error(JSON.stringify([f, c].flatMap((r) => (r.ok ? [] : r.issues)), null, 2));
  return { f: f.value, catalogs: [c.value] };
}

describe("care team · consistency", () => {
  it("a well-formed team has no issues", () => {
    expect(checkTeamDefinition(withTeam())).toEqual([]);
    expect(checkCaseIntegrity(withTeam()).filter((i) => i.path.startsWith("team"))).toEqual([]);
  });

  it("unknown phases, a twice-listed member, nobody circulating, a need for a stranger, an absent surgeon", () => {
    const bad = withTeam({
      ...TEAM,
      phases: ["surgery"],
      members: [
        { staff: "nurse-2", duties: ["instruments"] },
        { staff: "nurse-2", duties: ["count"] },
        { staff: "surgeon", duties: ["surgeon"] },
      ],
      scenarios: [{ ...TEAM.scenarios[0], needs: [{ id: "x", item: "forceps", for: "nurse-9" }], absent: ["surgeon"] }],
    });
    const messages = checkTeamDefinition(bad).map((i) => `${i.path}: ${i.message}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        'team.phases.0: unknown phase "surgery"',
        'team.members.1.staff: "nurse-2" is listed twice',
        "team.members: no member circulates (someone has to notice needs and ask)",
        'team.scenarios.0.needs.0.for: "nurse-9" is not a member of the team',
        "team.scenarios.0.absent.0: the surgeon cannot be absent (the learner is the surgeon)",
      ]),
    );
  });

  it("the solution's start names a scenario the team has", () => {
    const c = withTeam(TEAM, { solution: [{ type: "start", team: "nope" }, ...fixture("mini-anaphylaxis.case.json").solution.slice(1)] });
    expect(checkTeamDefinition(c).map((i) => i.message)).toContain('unknown team scenario "nope"');
  });
});

describe("care team · in its facility", () => {
  it("the room, the members (in that room), the items and the placements exist", () => {
    const { f, catalogs } = facility();
    expect(teamFacilityIssues(withTeam(), f, catalogs)).toEqual([]);
  });

  it("a member from another room, a relief colleague nobody knows, a need for a cart, a placement that does not exist", () => {
    const { f, catalogs } = facility();
    const c = withTeam({
      ...TEAM,
      members: [...TEAM.members.slice(0, 1), { staff: "nurse-3", duties: ["instruments"] }, TEAM.members[2]],
      scenarios: [{ ...TEAM.scenarios[0], needs: [{ id: "x", item: "patient-monitor", for: "surgeon" }], relief: [{ staff: "ghost", duties: ["instruments"] }], items: [{ placement: "nope", beside: "couch-1" }] }],
    });
    const messages = teamFacilityIssues(c, f, catalogs).map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        `facility "${f.id}" has no staff "nurse-3"`,
        `facility "${f.id}" has no staff "ghost"`,
        '"patient-monitor" is not a handheld item (it cannot be passed by hand)',
        `facility "${f.id}" has no placement "nope"`,
      ]),
    );
  });
});

describe("care team · information a colleague holds (docs/TEAM.md §4.5)", () => {
  const informScenario = (inform: Json, extra: Json = {}) => ({
    id: "allergy-history",
    name: L("Allergy history"),
    summary: L("The triage nurse heard the allergy history; the surgeon has not asked."),
    provenance: "authored",
    inform: [inform],
    relief: [{ staff: "triage", duties: ["inform"] }],
    expect: { informed: true },
    ...extra,
  });
  const good = { id: "allergies-held", history: "allergies", heldBy: "triage", for: "surgeon", blocks: "epi", when: { asked: "trigger" } };

  it("a fact the case records, held by a member or relief colleague, for a member, holding up an intervention", () => {
    expect(checkTeamDefinition(withTeam({ ...TEAM, scenarios: [informScenario(good)] }))).toEqual([]);
  });

  it("an unknown history item or intervention, a holder nobody knows, information for a stranger, an expectation with nothing to inform", () => {
    const c = withTeam({
      ...TEAM,
      scenarios: [
        informScenario({ ...good, history: "nope", heldBy: "ghost", for: "stranger", blocks: "nothing" }),
        { ...TEAM.scenarios[0], id: "plain", expect: { informed: true } },
        informScenario({ ...good, heldBy: "surgeon" }, { id: "self" }),
      ],
    });
    const messages = checkTeamDefinition(c).map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'unknown history item "nope" (the information is a fact the case records)',
        '"ghost" is not a member or relief colleague who could hold it',
        '"stranger" is not a member of the team',
        'unknown intervention "nothing"',
        'no information is needed in team scenario "plain" (no inform)',
        '"surgeon" is not a member or relief colleague who could hold it',
      ]),
    );
  });

  it("the member who circulates may be posted in another room (she comes to the team's room); the others may not", () => {
    const { f, catalogs } = facility();
    const raw = structuredClone(f);
    raw.staff.find((x) => x.id === "nurse-1")!.room = "bay-1";
    expect(teamFacilityIssues(withTeam(), raw, catalogs)).toEqual([]);
    raw.staff.find((x) => x.id === "nurse-2")!.room = "bay-1";
    expect(teamFacilityIssues(withTeam(), raw, catalogs).map((i) => i.message)).toEqual(['"nurse-2" works in "bay-1", not in the team\'s room "consult"']);
  });

  it("relayed by the team, a history item is recorded as known to the clinician (`ask` via the team)", () => {
    const c = withTeam();
    const started = reduce(c, createSession(c), { type: "start" }).state;
    const r = reduce(c, started, { type: "ask", itemId: "allergies", via: "team", by: "system" });
    expect(r.rejected).toBeUndefined();
    expect(r.state.asked).toContain("allergies");
    expect(r.events).toContainEqual(expect.objectContaining({ type: "history.asked", itemId: "allergies", via: "team" }));
  });
});

describe("care team · the scenario is chosen at start", () => {
  it("recorded as hidden state; an unknown one is refused", () => {
    const c = withTeam();
    const ok = reduce(c, createSession(c), { type: "start", team: "pass-forceps" });
    expect(ok.rejected).toBeUndefined();
    expect(ok.state.teamScenario).toBe("pass-forceps");
    const no = reduce(c, createSession(c), { type: "start", team: "nope" });
    expect(no.rejected).toBeDefined();
  });
});
