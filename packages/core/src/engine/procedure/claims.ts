/**
 * What an operator claims at a safety pause, against what the field showed (docs/PROCEDURE.md §4). A criterion's
 * claim is a boolean (it holds), or for a counting criterion (`onlyEntering` with `count`) the number of structures
 * the operator sees entering — `true` standing for the usual number. A claim is right when it says what the field
 * showed: a boolean equal to the criterion's truth; a count equal to the true number entering, with the criterion
 * holding (the operator can only have counted what was freed and in view).
 */
import type { ProcedureDefinition, SafetyPause } from "../../schema/procedure.js";

/** The usual number of a counting criterion (null: a boolean criterion). */
export function criterionCount(def: ProcedureDefinition, viewId: string, criterionId: string): number | null {
  const test = def.views.find((v) => v.id === viewId)?.criteria.find((c) => c.id === criterionId)?.test;
  return test && "onlyEntering" in test && test.count != null ? test.count : null;
}

/** The number a claim reports for a counting criterion (`true`: the usual number; `false`: none reported). */
function reported(claim: boolean | number | undefined, usual: number): number | null {
  if (typeof claim === "number") return claim;
  return claim === true ? usual : null;
}

/** Is the operator's claim for one criterion what the field showed? */
export function claimMatches(def: ProcedureDefinition, pause: SafetyPause, criterionId: string): boolean {
  const claim = pause.claims[criterionId];
  const holds = pause.truth[criterionId] === true;
  const usual = criterionCount(def, pause.view, criterionId);
  if (usual === null || pause.entering?.[criterionId] == null) return typeof claim === "number" ? false : (claim === true) === holds;
  const n = reported(claim, usual);
  return holds ? n === pause.entering[criterionId] : n === null;
}

/** Did the operator claim this criterion holds (or report a count for it)? */
export function claimAsserts(pause: SafetyPause, criterionId: string): boolean {
  const claim = pause.claims[criterionId];
  return claim === true || (typeof claim === "number" && claim > 0);
}

/** Every criterion claimed to hold (with the right count) and truly met: a documented view that is valid. */
export function pauseValid(def: ProcedureDefinition, pause: SafetyPause): boolean {
  return pause.achieved && Object.keys(pause.truth).every((k) => claimAsserts(pause, k) && claimMatches(def, pause, k));
}

/** Every claim says what the field showed. */
export function claimsMatchField(def: ProcedureDefinition, pause: SafetyPause): boolean {
  return Object.keys(pause.truth).every((k) => claimMatches(def, pause, k));
}
