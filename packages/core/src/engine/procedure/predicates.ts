/**
 * The `procedure` leaf of the condition DSL (docs/PROCEDURE.md §6): predicates over the field state
 * for rubric items, objectives, phases, scenario events and safety gates. They read what really
 * happened (the true anatomy), not what the operator claimed — except `identified`, which is the claim.
 */
import type { ProcedurePredicate } from "../../schema/common.js";
import type { ProcedureDefinition } from "../../schema/procedure.js";
import { handleOf, viewCriteria, viewHolds } from "./field.js";
import type { ProcedureState } from "./state.js";

const inRange = (v: number, r: { gte?: number; lte?: number }) => (r.gte == null || v >= r.gte) && (r.lte == null || v <= r.lte);

/** Evaluate a procedure predicate; false when the case has no procedure or the operation has not begun. */
export function evaluateProcedure(def: ProcedureDefinition | undefined, s: ProcedureState | undefined, p: ProcedurePredicate): boolean {
  if (!def || !s) {
    // before the first step: only negative facts hold
    if ("insufflated" in p) return p.insufflated === false;
    if ("closed" in p) return p.closed === false;
    if ("inspected" in p) return p.inspected === false;
    if ("specimen" in p) return p.specimen === "in-situ";
    if ("counter" in p) return inRange(0, p);
    return false;
  }
  if ("view" in p) return viewHolds(def, s, p.view);
  if ("criterion" in p) return def.views.some((v) => viewCriteria(def, s, v.id)[p.criterion] === true);
  if ("documented" in p) {
    const pauses = s.pauses.filter((x) => x.view === p.documented);
    if (p.valid == null) return pauses.length > 0;
    const valid = pauses.some((x) => x.achieved && Object.keys(x.truth).every((k) => x.claims[k] === true));
    return p.valid ? valid : pauses.length > 0 && !valid;
  }
  if ("injury" in p) {
    const hits = s.injuries.filter((i) => p.injury === "any" || i.kind === p.injury);
    if (p.recognised == null) return hits.length > 0;
    return hits.some((i) => i.recognised === p.recognised);
  }
  if ("unsafe" in p) return s.unsafe.some((u) => p.unsafe === "any" || u.code === p.unsafe);
  if ("clipped" in p) return (s.clips[p.clipped] ?? 0) >= (p.minCount ?? 1);
  if ("divided" in p) return s.divided.includes(p.divided);
  if ("isolated" in p) return s.isolated.includes(p.isolated);
  if ("identified" in p) {
    const handle = handleOf(s, p.identified);
    if (p.as == null) return handle != null && s.claims[handle] === p.identified;
    // some handle was named `as` while it was really `identified`
    return handle != null && s.claims[handle] === p.as;
  }
  if ("specimen" in p) return s.specimen === p.specimen;
  if ("bailout" in p) return p.bailout === "any" ? s.bailouts.length > 0 : s.bailouts.includes(p.bailout);
  if ("imaged" in p) return s.imaged.includes(p.imaged);
  if ("plan" in p) return s.plan === p.plan;
  if ("insufflated" in p) return s.insufflated === p.insufflated && (!p.pressure || (s.insufflated && inRange(s.pressure, p.pressure)));
  if ("bleeding" in p) {
    const hits = s.bleeding.filter((b) => p.bleeding === "any" || b.severity === p.bleeding);
    if (p.controlled == null) return hits.length > 0;
    return hits.some((b) => b.controlled === p.controlled);
  }
  if ("spillage" in p) {
    const spilled = p.spillage === "bile" ? s.spillage.bile : s.spillage.stones;
    return p.cleared == null ? spilled : spilled && s.spillage.cleared === p.cleared;
  }
  if ("counter" in p) return inRange(s.counters[p.counter], p);
  if ("inspected" in p) return s.inspected === p.inspected;
  if ("dissectedExposed" in p) return (s.exposedMax[p.dissectedExposed] ?? 0) >= p.atLeast;
  if ("closed" in p) return s.closed === p.closed;
  return false;
}
