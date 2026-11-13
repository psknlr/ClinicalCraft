/**
 * The care team's positions, places and controls as one set of pure resolvers (docs/TEAM.md §1): which position a
 * member holds, which controls they may work, which body is whose, which places a learner may take. The reducer, the
 * world, the agent and the front-ends all ask these, so a member's controls never depend on who asks. Everything is read
 * from the case and the start's choices (`seat`, `lineup`, the team scenario); the facility only for a staff member
 * outside the team.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { ActorRole, FacilityDefinition } from "../schema/facility.js";
import { canonicalPosition, DEFAULT_CONTROLS, SURGICAL_CONTROLS, TEAM_PLACES, type Place, type Seat, type StaffPosition, type SurgicalControl } from "../schema/positions.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import type { TeamDuty, TeamMember } from "../schema/team.js";

/** The learner's body in the world (the world's `PRIMARY_ACTOR`). */
export const LEARNER_BODY = "actor:clinician";

/** The member token of the operating surgeon: the learner — or, while the learner holds a place, the stand-in. */
const SURGEON = "surgeon";

/** The start's choices that shape the team: the learner's place, the line-up and the team scenario (a session state will do). */
export type TeamChoice = Pick<SessionState, "seat" | "lineup" | "teamScenario">;

/** Every control: whoever operates is unrestricted. */
export type Controls = "all" | SurgicalControl[];

/** What controls are asked for: the operative field (`field`) or the world's operations (`world`). */
export type ControlPurpose = "field" | "world";

/** The position each team duty stands for. */
export const DUTY_POSITION: Readonly<Record<TeamDuty, StaffPosition>> = {
  surgeon: "surgeon",
  anaesthesia: "anaesthetist",
  instruments: "scrub-nurse",
  assist: "first-assistant",
  circulate: "circulating-nurse",
  count: "circulating-nurse",
};

/** The order in which a member's duties decide their position — never the order they are listed in: `[count, instruments]` is a scrub nurse. */
export const DUTY_PRIORITY: readonly TeamDuty[] = ["surgeon", "anaesthesia", "instruments", "assist", "circulate", "count"];

/** The position of a facility role when nothing else names one. */
export const ROLE_POSITION: Readonly<Partial<Record<ActorRole, StaffPosition>>> = {
  nurse: "ward-nurse",
  attending: "physician",
  radiologist: "radiologist",
  pathologist: "pathologist",
  "lab-tech": "lab-technician",
  pharmacist: "pharmacist",
  receptionist: "receptionist",
  paramedic: "paramedic",
  porter: "porter",
};

/**
 * What a colleague outside the case team may work in the operative field: traction and suction with a port handed to
 * them. The engine cannot see their facility position; the session narrows this by position first (`bodyControls`).
 */
export const LEGACY_COLLEAGUE: readonly SurgicalControl[] = ["retract", "suction"];

/** Controls in their canonical order (`SURGICAL_CONTROLS`), each once. */
function ordered(xs: Iterable<SurgicalControl>): SurgicalControl[] {
  const set = new Set(xs);
  return SURGICAL_CONTROLS.filter((x) => set.has(x));
}

/** The position a list of duties stands for, by `DUTY_PRIORITY` (null: no duty). */
export function dutyPosition(duties: readonly TeamDuty[]): StaffPosition | null {
  for (const d of DUTY_PRIORITY) if (duties.includes(d)) return DUTY_POSITION[d];
  return null;
}

/** A team member's position: their own `position`, else their duties by priority. */
export function positionOfMember(m: TeamMember): StaffPosition | null {
  return m.position ?? dutyPosition(m.duties);
}

/** A member's position as controls, places and sterility read it (`assistant-surgeon` is the first assistant). */
function canonicalOf(m: TeamMember): StaffPosition | null {
  const p = positionOfMember(m);
  return p ? canonicalPosition(p) : null;
}

/** The facility staff member who operates while the learner holds a place: the surgeon member's `standIn`. */
export function standInOf(c: CaseDefinition): string | undefined {
  return c.team?.members.find((m) => m.staff === SURGEON)?.standIn;
}

/** The members a place is taken from: the base team and the chosen line-up's assistants (never a relief colleague). */
function placeMembers(c: CaseDefinition, lineup: string | undefined): TeamMember[] {
  const team = c.team;
  if (!team) return [];
  const added = lineup ? ((team.lineups ?? []).find((l) => l.id === lineup)?.members ?? []) : [];
  return [...team.members, ...added];
}

/**
 * The team as it is in this encounter: the base members, the chosen line-up's assistants and the chosen team scenario's
 * relief colleagues (with their own duties), less the members that scenario makes absent; a staff member counts once
 * (their first listing). Every resolver here reads it: who is present decides who holds the camera and whose controls a
 * colleague has.
 */
export function effectiveTeam(c: CaseDefinition, choice: TeamChoice = {}): TeamMember[] {
  const team = c.team;
  if (!team) return [];
  const scenario = choice.teamScenario ? (team.scenarios ?? []).find((x) => x.id === choice.teamScenario) : undefined;
  const absent = new Set(scenario?.absent ?? []);
  const seen = new Set<string>();
  const out: TeamMember[] = [];
  for (const m of [...placeMembers(c, choice.lineup), ...(scenario?.relief ?? [])]) {
    if (absent.has(m.staff) || seen.has(m.staff)) continue;
    seen.add(m.staff);
    out.push(m);
  }
  return out;
}

/** A member of the team as it is in this encounter, by reference (`surgeon` or a staff id). */
export function teamMember(c: CaseDefinition, choice: TeamChoice, ref: string): TeamMember | undefined {
  return effectiveTeam(c, choice).find((m) => m.staff === ref);
}

/**
 * A member's position, facility-free — controls and places are decided by it: their own `position`, else their duties
 * by priority; null when the reference is not in the team as it is in this encounter.
 */
export function memberPosition(c: CaseDefinition, choice: TeamChoice, ref: string): StaffPosition | null {
  const m = teamMember(c, choice, ref);
  return m ? positionOfMember(m) : null;
}

/**
 * A staff member's position, for role cards and dress: the case team's `position` for them, else the facility's
 * `staff.position` (or a room template's override), else their team duties by priority (the line-ups' assistants and
 * the team scenarios' relief colleagues too), else the facility role's default; null for an unknown staff id.
 */
export function staffPosition(c: CaseDefinition, facility: FacilityDefinition | null | undefined, staffId: string): StaffPosition | null {
  const id = staffId.replace(/^staff:/u, "");
  const team = c.team;
  const members = team ? [...team.members, ...(team.lineups ?? []).flatMap((l) => l.members), ...(team.scenarios ?? []).flatMap((x) => x.relief ?? [])] : [];
  const m = members.find((x) => x.staff === id);
  if (m?.position) return m.position;
  const s = facility?.staff.find((x) => x.id === id);
  if (s?.position) return s.position;
  const byDuty = m ? dutyPosition(m.duties) : null;
  if (byDuty) return byDuty;
  return s ? (ROLE_POSITION[s.role] ?? null) : null;
}

/** Whether the learner holds a place in the team (`seat`): one of the places besides the operating surgeon's. */
export function isPlace(s: Pick<SessionState, "seat">): boolean {
  return s.seat !== undefined;
}

/**
 * The member a place is, with a line-up: the base team's or the line-up's member in that position (a relief colleague
 * never is one). Present or absent alike: `seatsOf` and the start say whether the place can be taken.
 */
export function placeMember(c: CaseDefinition, place: Place, lineup?: string): TeamMember | undefined {
  return placeMembers(c, lineup).find((m) => m.staff !== SURGEON && canonicalOf(m) === place);
}

/** The member whose place the learner holds (undefined: the learner operates). */
export function seatMember(c: CaseDefinition, s: TeamChoice): TeamMember | undefined {
  return s.seat ? placeMember(c, s.seat, s.lineup) : undefined;
}

/**
 * The places a learner may take in a case (docs/TEAM.md §1), the operating surgeon's first — always offered, with a
 * team or without. A place in the team is offered when the team's surgeon member names a stand-in (`standIn`) and the
 * team, with the chosen line-up, has a member in that position who is present (not absent in the chosen team scenario).
 * A start in a place also needs the base anatomical variant: the stand-in follows the reference path.
 */
export function seatsOf(c: CaseDefinition, choice: Pick<TeamChoice, "lineup" | "teamScenario"> = {}): Seat[] {
  const seats: Seat[] = ["surgeon"];
  if (!c.team || !standInOf(c)) return seats;
  const scenario = choice.teamScenario ? (c.team.scenarios ?? []).find((x) => x.id === choice.teamScenario) : undefined;
  const absent = new Set(scenario?.absent ?? []);
  for (const place of TEAM_PLACES) {
    const m = placeMember(c, place, choice.lineup);
    if (m && !absent.has(m.staff)) seats.push(place);
  }
  return seats;
}

/** Whoever operates, as the operative field names them: the stand-in's staff id while the learner holds a place, else undefined (no actor: the learner). */
export function operatorOf(c: CaseDefinition, s: TeamChoice): string | undefined {
  return s.seat ? standInOf(c) : undefined;
}

/** The body of the colleague whose place the learner holds: standing by (null without a place). */
export function standingBy(c: CaseDefinition, s: TeamChoice): string | null {
  const m = seatMember(c, s);
  return m ? `staff:${m.staff}` : null;
}

/**
 * The body a member reference acts with: `surgeon` is the learner's body — the stand-in's while the learner holds a
 * place —, the member whose place the learner holds is the learner's body, every other member their own staff body.
 */
export function memberBody(c: CaseDefinition, s: TeamChoice, ref: string): string {
  if (ref === SURGEON) {
    const standIn = operatorOf(c, s);
    return standIn ? `staff:${standIn}` : LEARNER_BODY;
  }
  if (s.seat && seatMember(c, s)?.staff === ref) return LEARNER_BODY;
  return `staff:${ref}`;
}

/**
 * Whom a body works the operative field as (an `operate` action's `actor`; `memberBody` the other way round): the
 * learner's body is the operator (undefined) — holding a place, that place's member —, the stand-in's body is the
 * operator while the learner holds a place, any other staff body its own staff id. Any other body is the operator, as
 * an actor-less step always was.
 */
export function refOfBody(c: CaseDefinition, s: TeamChoice, body: string): string | undefined {
  if (body === LEARNER_BODY) return seatMember(c, s)?.staff;
  if (!body.startsWith("staff:")) return undefined;
  const id = body.slice("staff:".length);
  return s.seat && id === standInOf(c) ? undefined : id;
}

/** A member's controls among the team as it is: their own set, else their position's defaults and the camera when no second assistant is present. */
function controlsOfMember(m: TeamMember, team: readonly TeamMember[]): SurgicalControl[] {
  if (m.controls) return ordered(m.controls);
  const p = canonicalOf(m);
  if (!p) return [];
  const own: SurgicalControl[] = [...DEFAULT_CONTROLS[p]];
  if (p === "first-assistant" && !team.some((x) => canonicalOf(x) === "second-assistant")) own.push("camera");
  return ordered(own);
}

/**
 * A member's controls in this encounter: their own `controls` when the team gives them a set, else their position's
 * defaults (`DEFAULT_CONTROLS`) — and a first assistant also holds the camera when no second assistant is present
 * (the line-up chosen, nobody absent counted). Never read from the learner's place: who holds the camera does not depend
 * on where the learner sits. Null: not in the team as it is in this encounter.
 */
export function memberControls(c: CaseDefinition, choice: TeamChoice, ref: string): SurgicalControl[] | null {
  const team = effectiveTeam(c, choice);
  const m = team.find((x) => x.staff === ref);
  return m ? controlsOfMember(m, team) : null;
}

/**
 * What a step's actor may work in the operative field: the operator — no actor, the `surgeon` token, the stand-in while
 * the learner holds a place — is unrestricted; a member of the team as it is holds their controls (`memberControls`);
 * a colleague outside it, traction and suction (`LEGACY_COLLEAGUE`).
 */
export function fieldControls(c: CaseDefinition, s: TeamChoice, ref?: string): Controls {
  if (ref === undefined || ref === SURGEON || ref === operatorOf(c, s)) return "all";
  return memberControls(c, s, ref) ?? [...LEGACY_COLLEAGUE];
}

/**
 * The controls of a body: the learner's body holds every control — holding a place, that place member's; the stand-in's
 * body, while the learner holds a place, the surgeon member's; the colleague standing by, none; a member's staff body,
 * the member's (`memberControls`). A staff body outside the team holds its position's defaults (`staffPosition`) in the
 * world, and in the field only the traction and suction its position allows (an anaesthetist none, a surgeon both).
 * Any other body holds none.
 */
export function bodyControls(c: CaseDefinition, s: TeamChoice, facility: FacilityDefinition | null | undefined, body: string, purpose: ControlPurpose): Controls {
  const seat = seatMember(c, s);
  if (body === LEARNER_BODY) return seat ? (memberControls(c, s, seat.staff) ?? []) : "all";
  if (!body.startsWith("staff:")) return [];
  const id = body.slice("staff:".length);
  if (s.seat && id === standInOf(c)) return memberControls(c, s, SURGEON) ?? [];
  if (seat && id === seat.staff) return [];
  const own = memberControls(c, s, id);
  if (own) return own;
  const p = staffPosition(c, facility, id);
  const defaults = p ? DEFAULT_CONTROLS[canonicalPosition(p)] : [];
  return purpose === "world" ? ordered(defaults) : ordered(LEGACY_COLLEAGUE.filter((x) => defaults.includes(x)));
}

/**
 * The reference actions a place joins after: the case's reference solution after its own `start` (all of it when it
 * has none), up to — never including — a `finish` or the operation's `close`. A start in a place applies them, by the
 * system, until the case is in one of the team's phases (the reducer; docs/TEAM.md §1).
 */
export function joinPath(c: CaseDefinition): ClinicalAction[] {
  const after = c.solution.slice(c.solution.findIndex((a) => a.type === "start") + 1);
  const stop = after.findIndex((a) => a.type === "finish" || (a.type === "operate" && a.op.op === "close"));
  return stop < 0 ? after : after.slice(0, stop);
}
