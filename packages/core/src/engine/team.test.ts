/**
 * A case's care team (docs/TEAM.md §6): its own consistency and its fit to the facility; a team scenario is chosen
 * at `start` (hidden state) and an unknown one is refused.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { EquipmentCatalog, FacilityDefinition } from "../schema/facility.js";
import { checkCaseIntegrity, checkTeamDefinition, createSession, parseCase, parseCatalog, parseFacility, reduce, teamFacilityIssues } from "./index.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";
import { PLACES_TEAM } from "./__fixtures__/team-places.js";

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

describe("care team · positions, controls, the stand-in and line-ups", () => {
  /** The places team (docs/TEAM.md §1) changed by `patch`, and what checkTeamDefinition says of it. */
  const issuesOf = (patch: (t: Json) => void, extra: Json = {}) => {
    const t = structuredClone(PLACES_TEAM) as Json;
    patch(t);
    return checkTeamDefinition(withTeam(t, extra)).map((i) => `${i.path}: ${i.message}`);
  };

  it("a well-formed team with places, a stand-in and a line-up has no issues", () => {
    expect(issuesOf(() => undefined)).toEqual([]);
  });

  it("operate is the surgeon's alone, and the surgeon's own controls keep it", () => {
    expect(issuesOf((t) => (t.members[2].controls = ["operate", "retract"]))).toEqual(['team.members.2.controls: "operate" is the surgeon\'s control alone ("doc-1" is not the surgeon)']);
    expect(issuesOf((t) => (t.members[4].controls = ["camera", "retract"]))).toEqual(['team.members.4.controls: the surgeon\'s controls keep "operate"']);
  });

  it("the sterile field's controls go to scrubbed positions, the equipment and the anaesthetic to the others", () => {
    expect(issuesOf((t) => (t.members[0].controls = ["count", "camera"]))).toEqual(['team.members.0.controls: "camera" is worked at the sterile field: a circulating-nurse is not scrubbed']);
    expect(issuesOf((t) => (t.members[1].controls = ["instruments", "anaesthesia"]))).toEqual(['team.members.1.controls: "anaesthesia" is worked outside the sterile field: a scrub-nurse is scrubbed']);
    // the same holds for a relief colleague and a line-up's assistant
    expect(issuesOf((t) => (t.scenarios[0].relief[0].controls = ["instruments", "equipment"]))).toEqual(['team.scenarios.0.relief.0.controls: "equipment" is worked outside the sterile field: a scrub-nurse is scrubbed']);
  });

  it("one member to each place, in the base team and with each line-up", () => {
    expect(issuesOf((t) => t.members.splice(2, 0, { staff: "nurse-3", duties: ["instruments"] }))).toEqual([
      'team.members.2: "nurse-2" and "nurse-3" are both the scrub-nurse: one member to each place in the team',
      // with nurse-2 on a break, nurse-3 is still there: her relief would be a second scrub nurse
      'team.scenarios.0.relief.0: "nurse-3" and "nurse-9" are both the scrub-nurse in team scenario "scrub-break": one member to each place in the team',
    ]);
    // the old name of the first assistant is the first assistant
    expect(issuesOf((t) => t.members.splice(3, 0, { staff: "doc-3", duties: ["assist"], position: "assistant-surgeon" }))).toEqual(['team.members.3: "doc-1" and "doc-3" are both the first-assistant: one member to each place in the team']);
    expect(issuesOf((t) => (t.lineups[0].members[0].position = "first-assistant"))).toEqual(['team.lineups.0.members.0: "doc-1" and "doc-2" are both the first-assistant: one member to each place in the team']);
  });

  it("one member to each place among the team as it is in each scenario: a relief colleague never doubles a present member", () => {
    const scenario = (relief: Json[], extra: Json = {}) => ({ id: "extra-hands", name: L("Extra hands"), summary: L("Colleagues come to help."), provenance: "authored", relief, needs: [{ id: "n", item: "forceps", for: "surgeon" }], ...extra });
    // nobody is absent: a second first assistant (two camera holders) and a second scrub nurse
    expect(issuesOf((t) => t.scenarios.push(scenario([{ staff: "doc-8", duties: ["assist"] }, { staff: "nurse-8", duties: ["instruments"] }])))).toEqual([
      'team.scenarios.2.relief.0: "doc-1" and "doc-8" are both the first-assistant in team scenario "extra-hands": one member to each place in the team',
      'team.scenarios.2.relief.1: "nurse-2" and "nurse-8" are both the scrub-nurse in team scenario "extra-hands": one member to each place in the team',
    ]);
    // a relief second assistant doubles only the three-surgeon line-up's
    expect(issuesOf((t) => t.scenarios.push(scenario([{ staff: "doc-7", duties: ["assist"], position: "second-assistant" }])))).toEqual([
      'team.scenarios.2.relief.0: "doc-2" and "doc-7" are both the second-assistant in team scenario "extra-hands" with line-up "three-surgeons": one member to each place in the team',
    ]);
    // two relief colleagues in one place
    expect(issuesOf((t) => t.scenarios.push(scenario([{ staff: "nurse-8", duties: ["instruments"] }, { staff: "nurse-7", duties: ["count", "instruments"] }], { absent: ["nurse-2"] })))).toEqual([
      'team.scenarios.2.relief.1: "nurse-8" and "nurse-7" are both the scrub-nurse in team scenario "extra-hands": one member to each place in the team',
    ]);
    // relieving the member who is away, or counting beside the scrub nurse, is fine
    expect(issuesOf((t) => t.scenarios.push(scenario([{ staff: "doc-8", duties: ["assist"] }, { staff: "nurse-8", duties: ["count"] }], { absent: ["doc-1"] })))).toEqual([]);
  });

  it("the position surgeon is the surgeon member's, and the surgeon member's position is surgeon", () => {
    expect(issuesOf((t) => (t.members[2].position = "surgeon"))).toEqual(['team.members.2.position: the position "surgeon" is the surgeon member\'s alone ("doc-1" is not the surgeon)']);
    expect(issuesOf((t) => (t.members[4].position = "first-assistant"))).toEqual(['team.members.4.position: the surgeon member\'s position is "surgeon" (not "first-assistant")']);
  });

  it("a stand-in is named on the surgeon member only, is no member of the team in any capacity, and the team works through the operation", () => {
    expect(issuesOf((t) => (t.members[2].standIn = "doc-0"))).toEqual(["team.members.2.standIn: only the surgeon member names a stand-in (\"doc-1\" is not the surgeon)"]);
    expect(issuesOf((t) => (t.members[4].standIn = "doc-1"))).toEqual(['team.members.4.standIn: the stand-in "doc-1" is already a member of the team']);
    expect(issuesOf((t) => (t.members[4].standIn = "surgeon"))).toEqual(expect.arrayContaining(['team.members.4.standIn: the stand-in is a member of staff (a staff id), not "surgeon"']));
    expect(issuesOf((t) => (t.members[4].standIn = "nurse-9"))).toEqual(['team.members.4.standIn: the stand-in "nurse-9" is a relief colleague in team scenario "scrub-break"']);
    expect(issuesOf((t) => (t.members[4].standIn = "doc-2"))).toEqual(['team.members.4.standIn: the stand-in "doc-2" is an assistant in line-up "three-surgeons"']);
    expect(issuesOf((t) => (t.cover = [{ staff: "doc-0", duties: ["anaesthesia"] }]))).toEqual(['team.members.4.standIn: the stand-in "doc-0" covers a duty of the team (team.cover)']);
    // the operation's phase is one of the team's: the stand-in operates only while the team works
    const lap = parseCase({
      ...structuredClone(LAP_CHOLE_SIT),
      team: { room: "or", phases: ["ward"], members: [{ staff: "or.circulating", duties: ["circulate"] }, { staff: "surgeon", duties: ["surgeon"], standIn: "or.surgeon" }] },
    });
    if (!lap.ok) throw new Error(JSON.stringify(lap.issues));
    expect(checkTeamDefinition(lap.value).map((i) => `${i.path}: ${i.message}`)).toEqual(['team.phases: the stand-in operates only while the team works: the team needs the operation\'s phase "theatre"']);
  });

  it("a line-up adds first or second assistants who are not members already, each listed once, unique ids", () => {
    const assistant = (extra: Json = {}) => ({ staff: "doc-5", duties: ["assist"], ...extra });
    const lineup = (id: string, members: Json[]) => ({ id, name: L(id), provenance: "authored", members });
    expect(issuesOf((t) => t.lineups.push(lineup("three-surgeons", [assistant({ position: "second-assistant" })])))).toEqual(['team.lineups.1.id: duplicate line-up id "three-surgeons"']);
    expect(issuesOf((t) => t.lineups.push(lineup("again", [{ staff: "doc-1", duties: ["assist"], position: "second-assistant" }])))).toEqual(['team.lineups.1.members.0.staff: "doc-1" is already a member of the team (a line-up adds assistants)']);
    expect(issuesOf((t) => t.lineups.push(lineup("twice", [assistant({ position: "second-assistant" }), assistant({ position: "second-assistant" })])))).toEqual(
      expect.arrayContaining(['team.lineups.1.members.1.staff: "doc-5" is listed twice']),
    );
    expect(issuesOf((t) => t.lineups.push(lineup("nurse", [assistant({ duties: ["instruments"] })])))).toEqual(
      expect.arrayContaining(['team.lineups.1.members.0.duties: a line-up adds assistants: their duties are ["assist"]']),
    );
    expect(issuesOf((t) => t.lineups.push(lineup("anaes", [assistant({ position: "anaesthetist" })])))).toEqual(['team.lineups.1.members.0.position: a line-up\'s assistant is a first or second assistant (not "anaesthetist")']);
  });

  it("a scenario may make a line-up's assistant absent; the existing rules and their messages stand", () => {
    expect(issuesOf((t) => (t.scenarios[1].absent = ["doc-2"]))).toEqual([]);
    expect(issuesOf((t) => (t.scenarios[1].absent = ["doc-9"]))).toEqual(['team.scenarios.1.absent.0: "doc-9" is not a member of the team']);
  });
});

describe("care team · in its facility", () => {
  it("the room, the members (in that room), the items and the placements exist", () => {
    const { f, catalogs } = facility();
    expect(teamFacilityIssues(withTeam(), f, catalogs)).toEqual([]);
  });

  it("the stand-in is a surgeon of the team's room, the line-ups' assistants work there too; a member's facility position is their position in the team", () => {
    const { f, catalogs } = facility();
    const team = {
      ...TEAM,
      members: [{ staff: "nurse-1", duties: ["circulate"] }, { staff: "nurse-2", duties: ["instruments"] }, { staff: "surgeon", duties: ["surgeon"], standIn: "doc-0" }],
      lineups: [{ id: "three", name: L("Three"), provenance: "authored", members: [{ staff: "doc-2", duties: ["assist"] }] }],
    };
    const messages = (c: CaseDefinition, at: FacilityDefinition) => teamFacilityIssues(c, at, catalogs).map((i) => `${i.path}: ${i.message}`);
    expect(messages(withTeam(team), f)).toEqual([
      `team.members.2.standIn: facility "${f.id}" has no staff "doc-0"`,
      `team.lineups.0.members.0.staff: facility "${f.id}" has no staff "doc-2"`,
    ]);
    const staffed = structuredClone(f);
    staffed.staff.push({ ...f.staff[0], id: "doc-0", role: "attending", position: "surgeon", room: "bay-1" }, { ...f.staff[0], id: "doc-2", role: "attending", room: "bay-1" });
    expect(messages(withTeam(team), staffed)).toEqual([`team.members.2.standIn: "doc-0" works in "bay-1", not in the team's room "consult"`, `team.lineups.0.members.0.staff: "doc-2" works in "bay-1", not in the team's room "consult"`]);
    for (const s of staffed.staff) if (s.id === "doc-0" || s.id === "doc-2") s.room = "consult";
    expect(messages(withTeam(team), staffed)).toEqual([]);
    // the stand-in operates with the surgeon member's controls: a surgeon of the facility, with a doctor's role — not
    // the assistant surgeon, an attending whose role gives a physician, or a nurse
    const standIn = staffed.staff.find((s) => s.id === "doc-0")!;
    standIn.position = "assistant-surgeon";
    expect(messages(withTeam(team), staffed)).toEqual([`team.members.2.standIn: the stand-in "doc-0" operates: their position in facility "${f.id}" is "surgeon" (not "assistant-surgeon")`]);
    delete standIn.position;
    expect(messages(withTeam(team), staffed)).toEqual([`team.members.2.standIn: the stand-in "doc-0" operates: their position in facility "${f.id}" is "surgeon" (not "physician")`]);
    Object.assign(standIn, { position: "surgeon", role: "nurse" });
    expect(messages(withTeam(team), staffed)).toEqual([`team.members.2.standIn: the stand-in "doc-0" operates: their role in facility "${f.id}" is a doctor's ("attending" or "clinician", not "nurse")`]);
    Object.assign(standIn, { role: "attending" });
    // the card a colleague speaks from and the controls the team gives them are one job: the old name of the first
    // assistant agrees with a first assistant, a circulating nurse does not with the scrub nurse's duty
    staffed.staff.find((s) => s.id === "doc-2")!.position = "assistant-surgeon";
    staffed.staff.find((s) => s.id === "nurse-2")!.position = "circulating-nurse";
    expect(messages(withTeam(team), staffed)).toEqual([`team.members.1.staff: "nurse-2" is a circulating-nurse in facility "${f.id}" but a scrub-nurse in the team: give them one position`]);
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
