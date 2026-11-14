/**
 * Operations restricted by a surgical control, and who checks the wound (docs/EMBODIED.md §8.2, §8.6): the words a
 * refusal names — the positions that hold the control, the acting body's position — and when the wound rule holds.
 * Which controls a body holds is core's (`bodyControls`, asked through `DeviceRules.controlsOf`): a body stores no
 * position and no control, and the world reads only the case, the start's choices and the facility.
 */
import {
  canonicalPosition,
  DEFAULT_CONTROLS,
  effectiveTeam,
  LEARNER_BODY,
  memberControls,
  memberPosition,
  positionOfMember,
  procedureFor,
  staffPosition,
  StaffPositionSchema,
  standInOf,
  type CaseDefinition,
  type Controls,
  type FacilityDefinition,
  type SessionState,
  type StaffPosition,
  type SurgicalControl,
  type TeamChoice,
} from "@clinicalcraft/core";

/** The control it takes to check the patient's wound while the operation is under way in the team's room (§8.6). */
export const WOUND_CONTROL: SurgicalControl = "retract";

/** Whether a set of controls holds one (`all`: whoever holds every control — the learner while operating). */
export function holdsControl(controls: Controls, control: SurgicalControl): boolean {
  return controls === "all" || controls.includes(control);
}

/**
 * The positions that hold a control in this encounter, as a refusal names them: those of the team's members (the team
 * as it is: `effectiveTeam`) whose controls include it — else, with no team or nobody in it holding it, every position
 * whose defaults do (`DEFAULT_CONTROLS`). Each once, in the order of `StaffPositionSchema`; `assistant-surgeon` is the
 * first assistant.
 */
export function controlHolders(c: CaseDefinition, s: TeamChoice, control: SurgicalControl): StaffPosition[] {
  const held = new Set<StaffPosition>();
  for (const m of effectiveTeam(c, s)) {
    const p = positionOfMember(m);
    if (p && memberControls(c, s, m.staff)?.includes(control)) held.add(canonicalPosition(p));
  }
  if (!held.size) for (const p of StaffPositionSchema.options) if (DEFAULT_CONTROLS[p].includes(control)) held.add(canonicalPosition(p));
  return StaffPositionSchema.options.filter((p) => held.has(p));
}

/**
 * A body's position in this encounter, as a refusal names it: the learner's body — the learner's place, else the
 * operating surgeon; the stand-in's body while the learner holds a place — the operating surgeon; a member of the team
 * as it is — their own (`memberPosition`, facility-free like every rule); any other member of staff — the facility's
 * (`staffPosition`). Null: a body with no position.
 */
export function bodyPosition(c: CaseDefinition, s: TeamChoice, facility: FacilityDefinition | null | undefined, body: string): StaffPosition | null {
  if (body === LEARNER_BODY) return s.seat ?? "surgeon";
  if (!body.startsWith("staff:")) return null;
  const id = body.slice("staff:".length);
  if (s.seat && id === standInOf(c)) return "surgeon";
  return memberPosition(c, s, id) ?? staffPosition(c, facility, id);
}

/**
 * Whether the operation is in progress (§8.6): begun — the first accepted `operate` opened the field
 * (`SessionState.procedure`) —, the case in one of the operation's phases (`procedure.phases`: the engine's own test
 * for an operation under way, which takes no step in any other phase) and neither closed nor abandoned
 * (`abandon-refer`). A conversion to open does not end it — the wound is open all the more, though the engine takes no
 * `close` after it —; the case moving on to a phase outside the operation does.
 */
export function operationInProgress(c: Pick<CaseDefinition, "procedure">, s: Pick<SessionState, "procedure" | "phase" | "variant">): boolean {
  const p = s.procedure;
  if (!p || p.closed || p.bailouts.includes("abandon-refer")) return false;
  return procedureFor(c, s)?.phases.includes(s.phase) ?? false;
}
