/**
 * Checks of a case's care team (docs/TEAM.md §1, "Checks"): its own consistency (`checkTeamDefinition`, part of
 * `checkCaseIntegrity`: members, duties, scenarios, positions and controls, the stand-in, line-ups, and that every place
 * it offers can be joined) and its fit to the case's facility (`teamFacilityIssues`: the room, the staff and their
 * positions, the items and the placements a scenario moves exist there).
 */
import type { CaseDefinition } from "../schema/case.js";
import type { ActorRole, EquipmentCatalog, FacilityDefinition } from "../schema/facility.js";
import { canonicalPosition, FIELD_CONTROLS, isSterilePosition, NON_STERILE_CONTROLS, TEAM_PLACES, type StaffPosition } from "../schema/positions.js";
import type { CaseTeam, TeamMember } from "../schema/team.js";
import { formatPath } from "./parse.js";
import { createSession, reduce } from "./reducer.js";
import { positionOfMember, seatsOf, staffPosition, standInOf } from "./seats.js";
import type { Issue } from "./types.js";

type PathPart = string | number;

const err = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "error" });
const warn = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "warning" });

/**
 * The team's own consistency: phases, members and their duties, scenarios, needs, who is absent and who relieves; the
 * positions and controls its members hold, the surgeon's stand-in, the line-ups; and, for a team that is otherwise
 * sound and names a stand-in, that every place it offers can be joined along the reference path.
 */
export function checkTeamDefinition(c: CaseDefinition): Issue[] {
  const team = c.team;
  if (!team) return [];
  const issues: Issue[] = [];
  const phases = new Set(c.phases.map((p) => p.id));
  team.phases.forEach((p, i) => {
    if (!phases.has(p)) issues.push(err(["team", "phases", i], `unknown phase "${p}"`));
  });
  const members = new Set<string>();
  team.members.forEach((m, i) => {
    if (members.has(m.staff)) issues.push(err(["team", "members", i, "staff"], `"${m.staff}" is listed twice`));
    members.add(m.staff);
    if ((m.staff === "surgeon") !== m.duties.includes("surgeon")) issues.push(err(["team", "members", i, "duties"], `the surgeon (and only the surgeon) has the duty "surgeon"`));
  });
  if (!team.members.some((m) => m.duties.includes("circulate"))) issues.push(err(["team", "members"], `no member circulates (someone has to notice needs and ask)`));
  (team.cover ?? []).forEach((m, i) => {
    if (members.has(m.staff)) issues.push(err(["team", "cover", i, "staff"], `"${m.staff}" is already a member of the team`));
    if (m.duties.includes("surgeon")) issues.push(err(["team", "cover", i, "duties"], `the surgeon is the learner: nobody covers "surgeon"`));
  });
  const scenarios = new Set<string>();
  // a line-up's assistants are members too when that line-up is chosen: a scenario may need something for them or make them absent
  const assistants = new Set((team.lineups ?? []).flatMap((l) => l.members.map((m) => m.staff)));
  team.scenarios.forEach((s, i) => {
    const at = ["team", "scenarios", i];
    if (scenarios.has(s.id)) issues.push(err([...at, "id"], `duplicate team scenario id "${s.id}"`));
    scenarios.add(s.id);
    const relief = new Set(s.relief.map((r) => r.staff));
    const known = (ref: string) => ref === "surgeon" || members.has(ref) || relief.has(ref) || assistants.has(ref);
    const needs = new Set<string>();
    s.needs.forEach((n, j) => {
      if (needs.has(n.id)) issues.push(err([...at, "needs", j, "id"], `duplicate need id "${n.id}"`));
      needs.add(n.id);
      if (!known(n.for)) issues.push(err([...at, "needs", j, "for"], `"${n.for}" is not a member of the team`));
      if (n.noticedBy && !members.has(n.noticedBy)) issues.push(err([...at, "needs", j, "noticedBy"], `"${n.noticedBy}" is not a member of the team`));
    });
    s.absent.forEach((a, j) => {
      if (!members.has(a) && !relief.has(a) && !assistants.has(a)) issues.push(err([...at, "absent", j], `"${a}" is not a member of the team`));
      if (a === "surgeon") issues.push(err([...at, "absent", j], `the surgeon cannot be absent (the learner is the surgeon)`));
    });
    s.relief.forEach((r, j) => {
      if (members.has(r.staff)) issues.push(err([...at, "relief", j, "staff"], `"${r.staff}" is already a member of the team`));
      if (r.duties.includes("surgeon") || r.duties.includes("circulate")) issues.push(err([...at, "relief", j, "duties"], `a relief colleague brings instruments or counts (not "surgeon" or "circulate")`));
    });
    if (s.expect?.delivered !== undefined && s.needs.length === 0) issues.push(err([...at, "expect", "delivered"], `nothing is needed in team scenario "${s.id}" (no need to deliver)`));
    if (s.expect?.count && !team.count) issues.push(err([...at, "expect", "count"], `the team keeps no count (team.count)`));
    // a control scenario (nothing set up) is fine when the team keeps a count: it measures false holds
    if (s.needs.length === 0 && s.items.length === 0 && s.absent.length === 0 && !team.count) issues.push(warn(at, `team scenario "${s.id}" sets nothing up (no need, no item moved, nobody absent)`));
  });
  c.solution.forEach((a, i) => {
    if (a.type === "start" && a.team !== undefined && !scenarios.has(a.team)) issues.push(err(["solution", i, "team"], `unknown team scenario "${a.team}"`));
  });
  issues.push(...checkPositionsAndControls(c), ...checkStandIn(c), ...checkLineups(c));
  // a place in the team joins at the team's phase along the reference path: only a team that is otherwise sound is tried
  if (!issues.some((i) => i.severity === "error")) issues.push(...checkJoin(c));
  return issues;
}

/** Every listing of a member — the members, the cover, the scenarios' relief, the line-ups' assistants — with its path. */
function everyMember(team: CaseTeam): { m: TeamMember; at: PathPart[] }[] {
  return [
    ...team.members.map((m, i) => ({ m, at: ["team", "members", i] })),
    ...(team.cover ?? []).map((m, i) => ({ m, at: ["team", "cover", i] })),
    ...team.scenarios.flatMap((s, i) => s.relief.map((m, j) => ({ m, at: ["team", "scenarios", i, "relief", j] }))),
    ...(team.lineups ?? []).flatMap((l, i) => l.members.map((m, j) => ({ m, at: ["team", "lineups", i, "members", j] }))),
  ];
}

/**
 * Positions and controls (docs/TEAM.md §1): `operate` and the position `surgeon` are the surgeon member's alone, and the
 * surgeon's own controls keep `operate`; the controls worked at the sterile field go to scrubbed positions only, the
 * equipment and the anaesthetic to positions that are not; a stand-in is named on the surgeon member only; one member
 * to each place in the team, in the base team and among the team as it is in each team scenario.
 */
function checkPositionsAndControls(c: CaseDefinition): Issue[] {
  const team = c.team!;
  const issues: Issue[] = [];
  for (const { m, at } of everyMember(team)) {
    const surgeon = m.staff === "surgeon";
    if (m.position === "surgeon" && !surgeon) issues.push(err([...at, "position"], `the position "surgeon" is the surgeon member's alone ("${m.staff}" is not the surgeon)`));
    if (surgeon && m.position !== undefined && m.position !== "surgeon") issues.push(err([...at, "position"], `the surgeon member's position is "surgeon" (not "${m.position}")`));
    if (m.standIn !== undefined && !surgeon) issues.push(err([...at, "standIn"], `only the surgeon member names a stand-in ("${m.staff}" is not the surgeon)`));
    if (!m.controls) continue;
    if (m.controls.includes("operate") && !surgeon) issues.push(err([...at, "controls"], `"operate" is the surgeon's control alone ("${m.staff}" is not the surgeon)`));
    if (surgeon && !m.controls.includes("operate")) issues.push(err([...at, "controls"], `the surgeon's controls keep "operate"`));
    const p = positionOfMember(m);
    if (!p) continue;
    const sterile = isSterilePosition(canonicalPosition(p));
    for (const control of m.controls) {
      if (!sterile && FIELD_CONTROLS.includes(control)) issues.push(err([...at, "controls"], `"${control}" is worked at the sterile field: a ${p} is not scrubbed`));
      if (sterile && NON_STERILE_CONTROLS.includes(control)) issues.push(err([...at, "controls"], `"${control}" is worked outside the sterile field: a ${p} is scrubbed`));
    }
  }
  issues.push(...onePerPlace([], team.members.map((m, i) => ({ m, at: ["team", "members", i] }))), ...scenarioPlaces(team));
  return issues;
}

/** The place in the team a member stands in (the first assistant, the second assistant, the scrub nurse), if any. */
function placeOf(m: TeamMember): StaffPosition | null {
  const p = positionOfMember(m);
  if (m.staff === "surgeon" || !p) return null;
  const place = canonicalPosition(p);
  return (TEAM_PLACES as readonly string[]).includes(place) ? place : null;
}

/**
 * At most one member in each place in the team: the `listed` members, in order, against the `present` ones and each
 * other — a clash is reported at the later listing (`within` says in which encounter).
 */
function onePerPlace(present: readonly TeamMember[], listed: readonly { m: TeamMember; at: PathPart[] }[], within = ""): Issue[] {
  const issues: Issue[] = [];
  const holder = new Map<string, string>();
  for (const m of present) {
    const place = placeOf(m);
    if (place && !holder.has(place)) holder.set(place, m.staff);
  }
  for (const { m, at } of listed) {
    const place = placeOf(m);
    if (!place) continue;
    const first = holder.get(place);
    if (first !== undefined) issues.push(err(at, `"${first}" and "${m.staff}" are both the ${place}${within}: one member to each place in the team`));
    else holder.set(place, m.staff);
  }
  return issues;
}

/**
 * One member to each place among the team as it is in each team scenario (`effectiveTeam`: the base team, with each
 * line-up, less whoever is absent, and the scenario's relief colleagues): a relief colleague never stands in a place a
 * present member holds — one camera holder, one "first assistant", one "scrub nurse" for everyone who asks.
 */
function scenarioPlaces(team: CaseTeam): Issue[] {
  const issues: Issue[] = [];
  const reported = new Set<string>();
  team.scenarios.forEach((s, i) => {
    const absent = new Set(s.absent);
    for (const lineup of [undefined, ...(team.lineups ?? [])]) {
      const present = [...team.members, ...(lineup?.members ?? [])].filter((m) => !absent.has(m.staff));
      const relief = s.relief.flatMap((m, j) => (absent.has(m.staff) ? [] : [{ m, at: ["team", "scenarios", i, "relief", j] }]));
      for (const issue of onePerPlace(present, relief, ` in team scenario "${s.id}"${lineup ? ` with line-up "${lineup.id}"` : ""}`)) {
        if (reported.has(issue.path)) continue;
        reported.add(issue.path);
        issues.push(issue);
      }
    }
  });
  return issues;
}

/**
 * The stand-in surgeon (`standIn` on the surgeon member): a colleague of the facility who is no member of the team in
 * any capacity, and a team that works in every phase of the operation — the stand-in operates only while it works.
 */
function checkStandIn(c: CaseDefinition): Issue[] {
  const team = c.team!;
  const index = team.members.findIndex((m) => m.staff === "surgeon");
  const standIn = team.members[index]?.standIn;
  if (index < 0 || standIn === undefined) return [];
  const at = ["team", "members", index, "standIn"];
  const issues: Issue[] = [];
  if (standIn === "surgeon") issues.push(err(at, `the stand-in is a member of staff (a staff id), not "surgeon"`));
  if (team.members.some((m) => m.staff === standIn)) issues.push(err(at, `the stand-in "${standIn}" is already a member of the team`));
  if ((team.cover ?? []).some((m) => m.staff === standIn)) issues.push(err(at, `the stand-in "${standIn}" covers a duty of the team (team.cover)`));
  for (const s of team.scenarios) if (s.relief.some((m) => m.staff === standIn)) issues.push(err(at, `the stand-in "${standIn}" is a relief colleague in team scenario "${s.id}"`));
  for (const l of team.lineups ?? []) if (l.members.some((m) => m.staff === standIn)) issues.push(err(at, `the stand-in "${standIn}" is an assistant in line-up "${l.id}"`));
  for (const p of c.procedure?.phases ?? []) if (!team.phases.includes(p)) issues.push(err(["team", "phases"], `the stand-in operates only while the team works: the team needs the operation's phase "${p}"`));
  return issues;
}

/**
 * Line-ups (`team.lineups`): unique ids; each adds assistants who are not base members — duties exactly `["assist"]`, a
 * first or second assistant —, and with the base team still one member to each place.
 */
function checkLineups(c: CaseDefinition): Issue[] {
  const team = c.team!;
  const issues: Issue[] = [];
  const ids = new Set<string>();
  const base = new Set(team.members.map((m) => m.staff));
  (team.lineups ?? []).forEach((l, i) => {
    const at = ["team", "lineups", i];
    if (ids.has(l.id)) issues.push(err([...at, "id"], `duplicate line-up id "${l.id}"`));
    ids.add(l.id);
    const listed = new Set<string>();
    l.members.forEach((m, j) => {
      if (base.has(m.staff)) issues.push(err([...at, "members", j, "staff"], `"${m.staff}" is already a member of the team (a line-up adds assistants)`));
      if (listed.has(m.staff)) issues.push(err([...at, "members", j, "staff"], `"${m.staff}" is listed twice`));
      listed.add(m.staff);
      if (m.duties.length !== 1 || m.duties[0] !== "assist") issues.push(err([...at, "members", j, "duties"], `a line-up adds assistants: their duties are ["assist"]`));
      if (m.position !== undefined && m.position !== "first-assistant" && m.position !== "second-assistant") issues.push(err([...at, "members", j, "position"], `a line-up's assistant is a first or second assistant (not "${m.position}")`));
    });
    issues.push(...onePerPlace(team.members, l.members.map((m, j) => ({ m, at: [...at, "members", j] }))));
  });
  return issues;
}

/**
 * Every place the team offers can be joined: with the base team and each line-up, a start in each place brings the
 * case to the team's phases along the reference path, every step of it accepted (the reducer's join).
 */
function checkJoin(c: CaseDefinition): Issue[] {
  const team = c.team!;
  const index = team.members.findIndex((m) => m.staff === "surgeon");
  if (index < 0 || !standInOf(c)) return [];
  const messages = new Set<string>();
  for (const lineup of [undefined, ...(team.lineups ?? []).map((l) => l.id)]) {
    for (const seat of seatsOf(c, { lineup })) {
      if (seat === "surgeon") continue;
      const r = reduce(c, createSession(c), { type: "start", seat, ...(lineup ? { lineup } : {}) });
      if (r.rejected) messages.add(`the ${seat} place${lineup ? ` (line-up "${lineup}")` : ""} cannot be joined: ${r.rejected.message}`);
    }
  }
  return [...messages].map((m) => err(["team", "members", index, "standIn"], m));
}

/** The facility roles that may do the operating surgeon's work (a doctor's: every clinical tool, the operation's too). */
const SURGEON_ROLES: readonly ActorRole[] = ["attending", "clinician"];

/**
 * The stand-in surgeon in the facility: staff of the team's room, and a surgeon there — position `surgeon` (their own,
 * a room template's, or what their role gives) and a doctor's role. They operate with the surgeon member's controls, so
 * the card they speak from, the dress they wear and the controls they hold are one job.
 */
function standInIssues(c: CaseDefinition, f: FacilityDefinition, standIn: string, at: PathPart[]): Issue[] {
  const s = f.staff.find((x) => x.id === standIn);
  if (!s) return [err(at, `facility "${f.id}" has no staff "${standIn}"`)];
  const issues: Issue[] = [];
  if (s.room !== c.team!.room) issues.push(err(at, `"${standIn}" works in "${s.room}", not in the team's room "${c.team!.room}"`));
  const p = staffPosition(c, f, standIn);
  if (!p || canonicalPosition(p) !== "surgeon") issues.push(err(at, `the stand-in "${standIn}" operates: their position in facility "${f.id}" is "surgeon" (not ${p ? `"${p}"` : "none"})`));
  if (!SURGEON_ROLES.includes(s.role)) issues.push(err(at, `the stand-in "${standIn}" operates: their role in facility "${f.id}" is a doctor's (${SURGEON_ROLES.map((r) => `"${r}"`).join(" or ")}, not "${s.role}")`));
  return issues;
}

/**
 * The team in its facility: the room; the members, the surgeon's stand-in (a surgeon of that room) and the line-ups'
 * assistants (staff of that room); each member's facility position agreeing with their position in the team; relief
 * and cover colleagues; the items needed; the placements moved.
 */
export function teamFacilityIssues(c: CaseDefinition, f: FacilityDefinition, catalogs: readonly EquipmentCatalog[]): Issue[] {
  const team = c.team;
  if (!team) return [];
  const issues: Issue[] = [];
  if (!f.rooms.some((r) => r.id === team.room)) issues.push(err(["team", "room"], `facility "${f.id}" has no room "${team.room}"`));
  const staff = new Map(f.staff.map((s) => [s.id, s]));
  const inRoom = (id: string, at: PathPart[]) => {
    const s = staff.get(id);
    if (!s) issues.push(err(at, `facility "${f.id}" has no staff "${id}"`));
    else if (s.room !== team.room) issues.push(err(at, `"${id}" works in "${s.room}", not in the team's room "${team.room}"`));
  };
  team.members.forEach((m, i) => {
    if (m.staff === "surgeon") {
      if (m.standIn !== undefined) issues.push(...standInIssues(c, f, m.standIn, ["team", "members", i, "standIn"]));
      return;
    }
    inRoom(m.staff, ["team", "members", i, "staff"]);
  });
  // the line-ups' assistants are the room's staff too
  (team.lineups ?? []).forEach((l, i) => l.members.forEach((m, j) => inRoom(m.staff, ["team", "lineups", i, "members", j, "staff"])));
  // the card a colleague speaks from (their facility position) and the controls the team gives them (their position in
  // the team) are one job
  for (const { m, at } of everyMember(team)) {
    const own = staff.get(m.staff)?.position;
    const p = positionOfMember(m);
    if (own && p && canonicalPosition(own) !== canonicalPosition(p)) issues.push(err([...at, "staff"], `"${m.staff}" is a ${own} in facility "${f.id}" but a ${p} in the team: give them one position`));
  }
  const types = new Map(catalogs.flatMap((cat) => cat.equipment.map((e) => [e.id, e] as const)));
  const placements = new Map(f.placements.map((p) => [p.id, p]));
  if (team.count) {
    const type = types.get(team.count.item);
    if (!type) issues.push(err(["team", "count", "item"], `no equipment type "${team.count.item}" in the facility's catalogs`));
    else if (type.portable !== "handheld") issues.push(err(["team", "count", "item"], `"${team.count.item}" is not a handheld item (it cannot be counted one by one)`));
    else if (!f.placements.some((p) => p.type === team.count!.item && p.room === team.room)) issues.push(err(["team", "count", "item"], `no "${team.count.item}" is placed in "${team.room}" (nothing to count)`));
    team.count.searchPlaces.forEach((id, j) => {
      const p = placements.get(id);
      if (!p) issues.push(err(["team", "count", "searchPlaces", j], `facility "${f.id}" has no placement "${id}"`));
      else if (p.room !== team.room) issues.push(err(["team", "count", "searchPlaces", j], `"${id}" is in "${p.room}", not in the team's room "${team.room}"`));
    });
  }
  (team.cover ?? []).forEach((m, i) => {
    if (!staff.has(m.staff)) issues.push(err(["team", "cover", i, "staff"], `facility "${f.id}" has no staff "${m.staff}"`));
  });
  team.scenarios.forEach((s, i) => {
    const at = ["team", "scenarios", i];
    s.relief.forEach((r, j) => {
      if (!staff.has(r.staff)) issues.push(err([...at, "relief", j, "staff"], `facility "${f.id}" has no staff "${r.staff}"`));
    });
    s.needs.forEach((n, j) => {
      const type = types.get(n.item);
      if (!type) issues.push(err([...at, "needs", j, "item"], `no equipment type "${n.item}" in the facility's catalogs`));
      else if (type.portable !== "handheld") issues.push(err([...at, "needs", j, "item"], `"${n.item}" is not a handheld item (it cannot be passed by hand)`));
    });
    s.items.forEach((item, j) => {
      const p = placements.get(item.placement);
      if (!p) issues.push(err([...at, "items", j, "placement"], `facility "${f.id}" has no placement "${item.placement}"`));
      else if (types.get(p.type)?.portable !== "handheld") issues.push(err([...at, "items", j, "placement"], `"${item.placement}" is not a handheld item`));
      if (item.beside !== "patient" && !placements.has(item.beside)) issues.push(err([...at, "items", j, "beside"], `facility "${f.id}" has no placement "${item.beside}" (or "patient")`));
    });
  });
  return issues;
}
