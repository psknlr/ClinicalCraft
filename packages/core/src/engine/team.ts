/**
 * Checks of a case's care team (docs/TEAM.md §6): its own consistency (`checkTeamDefinition`, part of
 * `checkCaseIntegrity`) and its fit to the case's facility (`teamFacilityIssues`: the room, the staff, the
 * items and the placements a scenario moves exist there).
 */
import type { CaseDefinition } from "../schema/case.js";
import type { EquipmentCatalog, FacilityDefinition } from "../schema/facility.js";
import { formatPath } from "./parse.js";
import type { Issue } from "./types.js";

type PathPart = string | number;

const err = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "error" });
const warn = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "warning" });

/** The team's own consistency: phases, members and their duties, scenarios, needs, who is absent and who relieves. */
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
  // the operative site the team verifies: sides, evidence that names them, primary evidence to verify against, the step held
  const site = team.site;
  const sides = new Set(Object.keys(site?.sides ?? {}));
  const evidence = new Map((site?.evidence ?? []).map((e) => [e.id, e]));
  if (site) {
    const at = ["team", "site"];
    if (sides.size < 2) issues.push(err([...at, "sides"], `a site is verified between at least two sides (or sites, or levels)`));
    const seen = new Set<string>();
    site.evidence.forEach((e, i) => {
      if (seen.has(e.id) || e.id === "mark") issues.push(err([...at, "evidence", i, "id"], e.id === "mark" ? `"mark" is the skin mark: a piece of evidence needs another id` : `"${e.id}" is listed twice`));
      seen.add(e.id);
      if (!sides.has(e.says)) issues.push(err([...at, "evidence", i, "says"], `unknown side "${e.says}"`));
    });
    if (!site.evidence.some((e) => e.primary)) issues.push(err([...at, "evidence"], `no primary evidence: a discrepancy has nothing to be verified against`));
    if (!site.evidence.some((e) => e.kind === "document")) issues.push(err([...at, "evidence"], `no document: the check compares the mark with what a document says`));
    if (new Set(site.evidence.filter((e) => e.primary).map((e) => e.says)).size > 1) issues.push(err([...at, "evidence"], `the case's own primary evidence disagrees with itself (a team scenario may make it so; the case may not)`));
    if (site.mark !== undefined && !sides.has(site.mark)) issues.push(err([...at, "mark"], `unknown side "${site.mark}"`));
    if (!c.interventions.some((x) => x.id === site.holds)) issues.push(err([...at, "holds"], `unknown intervention "${site.holds}"`));
  }
  const scenarios = new Set<string>();
  team.scenarios.forEach((s, i) => {
    const at = ["team", "scenarios", i];
    if (scenarios.has(s.id)) issues.push(err([...at, "id"], `duplicate team scenario id "${s.id}"`));
    scenarios.add(s.id);
    const relief = new Set(s.relief.map((r) => r.staff));
    const known = (ref: string) => ref === "surgeon" || members.has(ref) || relief.has(ref);
    const needs = new Set<string>();
    s.needs.forEach((n, j) => {
      if (needs.has(n.id)) issues.push(err([...at, "needs", j, "id"], `duplicate need id "${n.id}"`));
      needs.add(n.id);
      if (!known(n.for)) issues.push(err([...at, "needs", j, "for"], `"${n.for}" is not a member of the team`));
      if (n.noticedBy && !members.has(n.noticedBy)) issues.push(err([...at, "needs", j, "noticedBy"], `"${n.noticedBy}" is not a member of the team`));
    });
    s.absent.forEach((a, j) => {
      if (!members.has(a) && !relief.has(a)) issues.push(err([...at, "absent", j], `"${a}" is not a member of the team`));
      if (a === "surgeon") issues.push(err([...at, "absent", j], `the surgeon cannot be absent (the learner is the surgeon)`));
    });
    s.relief.forEach((r, j) => {
      if (members.has(r.staff)) issues.push(err([...at, "relief", j, "staff"], `"${r.staff}" is already a member of the team`));
      if (r.duties.includes("surgeon") || r.duties.includes("circulate")) issues.push(err([...at, "relief", j, "duties"], `a relief colleague brings instruments or counts (not "surgeon" or "circulate")`));
    });
    if (s.expect?.delivered !== undefined && s.needs.length === 0) issues.push(err([...at, "expect", "delivered"], `nothing is needed in team scenario "${s.id}" (no need to deliver)`));
    if (s.expect?.count && !team.count) issues.push(err([...at, "expect", "count"], `the team keeps no count (team.count)`));
    if ((s.expect?.site || s.site) && !site) issues.push(err([...at, s.site ? "site" : "expect"], `the team verifies no operative site (team.site)`));
    if (s.site && site) {
      if (typeof s.site.mark === "string" && !sides.has(s.site.mark)) issues.push(err([...at, "site", "mark"], `unknown side "${s.site.mark}"`));
      for (const [id, side] of Object.entries(s.site.evidence ?? {})) {
        if (!evidence.has(id)) issues.push(err([...at, "site", "evidence", id], `unknown site evidence "${id}"`));
        if (!sides.has(side)) issues.push(err([...at, "site", "evidence", id], `unknown side "${side}"`));
      }
      if (!s.expect?.site) issues.push(warn([...at, "site"], `team scenario "${s.id}" changes the site and expects nothing of it (expect.site)`));
    }
    // a control scenario (nothing set up) is fine when the team keeps a count or verifies a site: it measures false holds
    if (s.needs.length === 0 && s.items.length === 0 && s.absent.length === 0 && !s.site && !team.count && !site) issues.push(warn(at, `team scenario "${s.id}" sets nothing up (no need, no item moved, nobody absent)`));
  });
  c.solution.forEach((a, i) => {
    if (a.type === "start" && a.team !== undefined && !scenarios.has(a.team)) issues.push(err(["solution", i, "team"], `unknown team scenario "${a.team}"`));
  });
  return issues;
}

/** The team in its facility: the room, members (in that room), relief colleagues, the items needed, the placements moved. */
export function teamFacilityIssues(c: CaseDefinition, f: FacilityDefinition, catalogs: readonly EquipmentCatalog[]): Issue[] {
  const team = c.team;
  if (!team) return [];
  const issues: Issue[] = [];
  if (!f.rooms.some((r) => r.id === team.room)) issues.push(err(["team", "room"], `facility "${f.id}" has no room "${team.room}"`));
  const staff = new Map(f.staff.map((s) => [s.id, s]));
  team.members.forEach((m, i) => {
    if (m.staff === "surgeon") return;
    const s = staff.get(m.staff);
    if (!s) issues.push(err(["team", "members", i, "staff"], `facility "${f.id}" has no staff "${m.staff}"`));
    else if (s.room !== team.room) issues.push(err(["team", "members", i, "staff"], `"${m.staff}" works in "${s.room}", not in the team's room "${team.room}"`));
  });
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
