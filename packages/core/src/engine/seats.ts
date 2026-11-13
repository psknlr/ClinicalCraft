/**
 * The care team's positions, places and controls as one set of pure resolvers (docs/TEAM.md §1): which position a
 * member holds, which controls they may work, which body is whose, which places a learner may take — and the operative
 * field's gate by control (docs/PROCEDURE.md §3: `seatCheck`, `passingRequired`). The reducer, the world, the agent and
 * the front-ends all ask these, so a member's controls never depend on who asks. Everything is read from the case and
 * the start's choices (`seat`, `lineup`, the team scenario); the facility only for a staff member outside the team.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { ActorRole, FacilityDefinition } from "../schema/facility.js";
import { canonicalPosition, DEFAULT_CONTROLS, SURGICAL_CONTROLS, TEAM_PLACES, type Place, type Seat, type StaffPosition, type SurgicalControl } from "../schema/positions.js";
import type { FieldRefusal, InstrumentId, ProcedureOp, RefusalReason } from "../schema/procedure.js";
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

/** The phase an encounter of the case starts in (`createSession`). */
export function initialPhase(c: CaseDefinition): string {
  return c.initialPhase ?? c.phases[0].id;
}

/**
 * Whether a place in the team can join this case's team at its phase: the case starts in one of the team's phases, or
 * it carries the reference solution the join follows (`joinPath`). A case served without its solution — the content
 * API's forms, `publicCase` and `learnerCase` — cannot be joined in a place: it offers the operating surgeon's only.
 */
export function canJoinTeam(c: CaseDefinition): boolean {
  return (c.team?.phases ?? []).includes(initialPhase(c)) || c.solution.length > 0;
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
 * team or without. A place in the team is offered when the team's surgeon member names a stand-in (`standIn`), the case
 * can be joined at the team's phase (`canJoinTeam`: not a case served without its reference solution) and the team,
 * with the chosen line-up, has a member in that position who is present (not absent in the chosen team scenario). A
 * start in a place also needs the base anatomical variant and an untouched encounter: the join follows the reference
 * path from the beginning.
 */
export function seatsOf(c: CaseDefinition, choice: Pick<TeamChoice, "lineup" | "teamScenario"> = {}): Seat[] {
  const seats: Seat[] = ["surgeon"];
  if (!c.team || !standInOf(c) || !canJoinTeam(c)) return seats;
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
 * Whom a body works the operative field as (an `operate` action's `actor`; `memberBody` the other way round). A call
 * with no body is the learner's body. The answer is closed:
 * - `undefined` — the operator: the learner's body while the learner operates; the stand-in's body while the learner
 *   holds a place;
 * - a staff id — the learner's body in a place (that place's member), and any other staff body (its own id);
 * - `null` — no part in the field, so the caller refuses the step: the colleague standing by while the learner holds
 *   their place, a place with no member, and every body that is neither the learner's nor a member of staff's.
 * Only a raw dispatch that names no actor (a replay, the system) is the operator without a body.
 */
export function refOfBody(c: CaseDefinition, s: TeamChoice, body: string = LEARNER_BODY): string | null | undefined {
  const seat = seatMember(c, s);
  if (body === LEARNER_BODY) return s.seat ? (seat?.staff ?? null) : undefined;
  const id = body.startsWith("staff:") ? body.slice("staff:".length) : "";
  if (!id) return null;
  if (s.seat && id === standInOf(c)) return undefined;
  if (s.seat && id === seat?.staff) return null;
  return id;
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
 * a colleague outside it, traction and suction (`LEGACY_COLLEAGUE`); a body with no part in the field (`refOfBody`'s
 * `null`), nothing.
 */
export function fieldControls(c: CaseDefinition, s: TeamChoice, ref?: string | null): Controls {
  if (ref === null) return [];
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
  if (body === LEARNER_BODY) return s.seat ? (seat ? (memberControls(c, s, seat.staff) ?? []) : []) : "all";
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

/**
 * The staff ids standing in a place in the team as it is (`effectiveTeam`; the learner's member when it is the
 * learner's place): whose steps a condition's `by` names (docs/PROCEDURE.md §6).
 */
export function placeRefs(c: CaseDefinition, choice: TeamChoice, place: Place): string[] {
  return effectiveTeam(c, choice)
    .filter((m) => m.staff !== SURGEON && canonicalOf(m) === place)
    .map((m) => m.staff);
}

/* ------------------------------------------------------------------ */
/* The operative field's gate by control (docs/PROCEDURE.md §3)        */
/* ------------------------------------------------------------------ */

/** Whether `ref` names the operator in this encounter: the `surgeon` token, or the stand-in while the learner holds a place. */
function isOperator(c: CaseDefinition, s: TeamChoice, ref: string): boolean {
  return ref === SURGEON || (s.seat !== undefined && ref === operatorOf(c, s));
}

/**
 * A step as the field records it (docs/PROCEDURE.md §3): an actor who is the operator — the stand-in while the learner
 * holds a place, or the `surgeon` token — is no actor, and a `hand-over` or `pass` `to` the operator has no `to`. Every
 * gate and the physics read the step so; the record's `procedure.step` carries it so.
 */
export function normaliseStep(c: CaseDefinition, s: TeamChoice, op: ProcedureOp, actor?: string): { op: ProcedureOp; actor?: string } {
  const who = actor !== undefined && isOperator(c, s, actor) ? undefined : actor;
  if ((op.op === "hand-over" || op.op === "pass") && op.to !== undefined && isOperator(c, s, op.to)) {
    const { to: _operator, ...rest } = op;
    return { op: rest as ProcedureOp, ...(who !== undefined ? { actor: who } : {}) };
  }
  return { op, ...(who !== undefined ? { actor: who } : {}) };
}

/** A gate's refusal of a step: its code, the engine's English message and the reason a front-end says. */
export interface FieldGateRefusal {
  code: "invalid" | "unknown-id" | "requirements-unmet";
  message: string;
  reason: RefusalReason;
}

const refusal = (code: FieldGateRefusal["code"], message: string, key: FieldRefusal, params: Record<string, string>): FieldGateRefusal => ({ code, message, reason: { key, params } });

/**
 * Whom a (normalised) step hands to or passes to must be someone of the team as it is: a pass's `to` always, and a
 * hand-over's `to` while the learner holds a place (otherwise a colleague outside the team may still take a port handed
 * to them, as always). Null: nothing to refuse.
 */
export function stepPartyRefusal(c: CaseDefinition, s: TeamChoice, op: ProcedureOp): FieldGateRefusal | null {
  if ((op.op !== "pass" && op.op !== "hand-over") || op.to === undefined) return null;
  if (op.op === "hand-over" && s.seat === undefined) return null;
  if (effectiveTeam(c, s).some((m) => m.staff === op.to)) return null;
  return refusal("unknown-id", `There is no "${op.to}" in the team.`, "unknown-member", { who: op.to });
}

/** The control a colleague works an instrument with: the laparoscope the camera, a grasper traction, the suction suction; null for every other instrument — the operator's own. */
export function instrumentControl(instrument: InstrumentId): SurgicalControl | null {
  if (instrument === "laparoscope") return "camera";
  if (instrument === "grasper") return "retract";
  if (instrument === "suction") return "suction";
  return null;
}

/**
 * The control a colleague needs for a step in the operative field (docs/PROCEDURE.md §3): the camera's steps (`aim`,
 * `zoom`) the camera; traction and letting go `retract`; suction and irrigation `suction`; a pass `instruments`;
 * putting an instrument in, taking it out or handing it on the control that instrument is worked with
 * (`instrumentControl`; `instrument`: the port's, for a withdrawal or a hand-over). `null`: no control — saying an
 * injury aloud, which anyone in the room may, and a port with nothing in it (the field's own refusal answers);
 * `"operator"`: nobody's but the operator's — every other step, and an operating instrument.
 */
export function fieldControlFor(op: ProcedureOp, instrument?: InstrumentId | null): SurgicalControl | "operator" | null {
  switch (op.op) {
    case "aim":
    case "zoom":
      return "camera";
    case "retract":
    case "release":
      return "retract";
    case "suction":
    case "irrigate":
      return "suction";
    case "pass":
      return "instruments";
    case "recognise":
      return null;
    case "insert":
      return instrumentControl(op.instrument) ?? "operator";
    case "withdraw":
    case "hand-over":
      return instrument ? (instrumentControl(instrument) ?? "operator") : null;
    default:
      return "operator";
  }
}

/** A control is in a set (`all`: the operator's). */
const holds = (controls: Controls, control: SurgicalControl): boolean => controls === "all" || controls.includes(control);

/** What a step does, in the words of a refusal ("take the grasper in port "B""). */
function doing(op: ProcedureOp, instrument: InstrumentId | null | undefined, taking: boolean): string {
  switch (op.op) {
    case "insert":
      return `put the ${op.instrument} in`;
    case "withdraw":
      return `take the ${instrument ?? "instrument"} out of port "${op.port}"`;
    case "hand-over":
      return `${taking ? "take" : "hand over"} the ${instrument ?? "instrument"} in port "${op.port}"`;
    case "release":
      return "let go of the traction";
    case "pass":
      return `pass the ${op.instrument}`;
    case "aim":
    case "zoom":
      return `${op.op} the camera`;
    default:
      return op.op;
  }
}

/**
 * The control gate of the operative field (docs/PROCEDURE.md §3; the reducer asks it before the physics, and it only
 * refuses): an operator's step (no `actor`) is free; a colleague's step that only the operator does is left to the field,
 * which says so itself ("Only the operator does …"); any other step of a colleague needs the control it is worked with
 * (`fieldControlFor`) — their own (`fieldControls`), or `controls` when a session narrows them (a colleague outside the
 * team, by their facility position) — and putting in, taking out or handing on an instrument only the operator works is
 * refused. A hand-over to a colleague also needs the one who takes it to hold that instrument's control. `s.procedure`:
 * the field the step is asked of (the port's instrument). Null: nothing to refuse.
 */
export function seatCheck(c: CaseDefinition, s: TeamChoice & Pick<SessionState, "procedure">, op: ProcedureOp, actor?: string, controls?: Controls): FieldGateRefusal | null {
  const port = "port" in op ? s.procedure?.ports.find((p) => p.site === op.port) : undefined;
  const instrument = "instrument" in op ? op.instrument : port?.instrument;
  const own = actor === undefined ? "all" : (controls ?? fieldControls(c, s, actor));
  // the operator's own step — whoever operates is unrestricted
  if (actor !== undefined && own !== "all") {
    const need = fieldControlFor(op, port?.instrument);
    if (need === "operator") {
      // an instrument only the operator works: never put in, taken out or handed on by a colleague
      if (op.op === "insert" || op.op === "withdraw" || op.op === "hand-over") {
        return refusal("invalid", `The ${instrument} is the operator's own instrument: ${actor} cannot ${doing(op, instrument, op.op === "hand-over" && op.to === actor)}.`, "needs-control", { who: actor, control: "operate", op: op.op, instrument: instrument ?? "", port: port?.site ?? "" });
      }
      return null;
    }
    if (need !== null && !own.includes(need)) {
      return refusal("invalid", `${actor} cannot ${doing(op, instrument, op.op === "hand-over" && op.to === actor)}: it needs the ${need} control, which ${actor} does not hold.`, "needs-control", { who: actor, control: need, op: op.op, instrument: instrument ?? "", port: port?.site ?? "" });
    }
  }
  // the one who takes an instrument holds its control
  if (op.op === "hand-over" && op.to !== undefined && op.to !== actor && port?.instrument) {
    const need = instrumentControl(port.instrument);
    const theirs = fieldControls(c, s, op.to);
    if (need === null) return refusal("invalid", `The ${port.instrument} is the operator's own instrument: ${op.to} cannot take it.`, "needs-control", { who: op.to, control: "operate", op: op.op, instrument: port.instrument, port: port.site });
    if (!holds(theirs, need)) return refusal("invalid", `${op.to} cannot take the ${port.instrument} in port "${port.site}": it needs the ${need} control, which ${op.to} does not hold.`, "needs-control", { who: op.to, control: need, op: op.op, instrument: port.instrument, port: port.site });
  }
  return null;
}

/**
 * Whether every instrument is passed before it goes in (`pass`; docs/PROCEDURE.md §3): in the scrub nurse's place only —
 * the learner's work there. Everywhere else a pass is taken when one is waiting and never needed.
 */
export function passingRequired(_c: CaseDefinition, s: TeamChoice): boolean {
  return s.seat === "scrub-nurse";
}
