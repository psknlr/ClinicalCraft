/**
 * What the operative field truly shows (docs/PROCEDURE.md §4–5): which structures are in view, how far
 * each region is cleared and exposed, what a structure appears to be, and whether each criterion of a
 * safety view holds. Everything here reads the anatomy and the state — never the operator's claims.
 */
import { TUBULAR_KINDS, type ProcedureDefinition, type Region, type Structure } from "../../schema/procedure.js";
import { directionVector, dot } from "./geometry.js";
import type { ProcedureState } from "./state.js";

export function structureOf(def: ProcedureDefinition, id: string): Structure | undefined {
  return def.anatomy.find((s) => s.id === id);
}

export function regionOf(def: ProcedureDefinition, id: string): Region | undefined {
  return def.regions.find((r) => r.id === id);
}

export const isTubular = (s: Structure): boolean => TUBULAR_KINDS.includes(s.kind);

/** Fraction (0–1) of a region dissected. */
export function clearedFraction(def: ProcedureDefinition, s: ProcedureState, regionId: string): number {
  const r = regionOf(def, regionId);
  return r ? Math.min(1, (s.cleared[regionId] ?? 0) / r.units) : 0;
}

/** The laparoscope is in and the abdomen is insufflated: the operator sees the field. */
export function fieldOpen(s: ProcedureState): boolean {
  return s.insufflated && s.ports.some((p) => p.instrument === "laparoscope");
}

/** The structure is held by a retraction on it or on a part of it (`parent` chain). */
function retractionOn(def: ProcedureDefinition, s: ProcedureState, structureId: string) {
  if (s.retractions[structureId]) return s.retractions[structureId];
  return undefined;
}

/**
 * Exposure of a region (0–1): the weakest of its retraction needs, each the cosine between the pull and
 * the needed direction over `full` (default 0.8), 0 when the part is not held. 1 when it needs none.
 * Excessive force does not improve exposure.
 */
export function exposure(def: ProcedureDefinition, s: ProcedureState, regionId: string): number {
  const r = regionOf(def, regionId);
  if (!r) return 0;
  if (!r.exposure.length) return 1;
  let worst = 1;
  for (const need of r.exposure) {
    const held = retractionOn(def, s, need.structure);
    const e = held ? Math.min(1, Math.max(0, dot(held.direction, directionVector(need.direction))) / (need.full ?? 0.8)) : 0;
    worst = Math.min(worst, e);
  }
  return worst;
}

/** The structure is in view: the field is open and its region (if any) is cleared to `revealAt`. Divided parts stay in view. */
export function isVisible(def: ProcedureDefinition, s: ProcedureState, st: Structure): boolean {
  if (!fieldOpen(s)) return false;
  if (!st.in) return true;
  return clearedFraction(def, s, st.in) >= (st.revealAt ?? 0.5);
}

/** The appearance rule in force for a structure (the first `when` whose exposure or clearance test holds), if any. */
export function appearanceRule(def: ProcedureDefinition, s: ProcedureState, st: Structure) {
  return st.appearsAs?.when.find((w) => (w.cleared != null ? clearedFraction(def, s, w.cleared) : exposure(def, s, w.exposure!)) < w.below);
}

/** Visible tubular structures, in the order their handles were assigned. */
export function visibleTubes(def: ProcedureDefinition, s: ProcedureState): Structure[] {
  return s.handles.map((h) => structureOf(def, h.structure)!).filter((st) => st && isVisible(def, s, st));
}

/** Assign handles to tubular structures newly in view (in anatomy order — deterministic). */
export function assignHandles(def: ProcedureDefinition, s: ProcedureState): void {
  for (const st of def.anatomy) {
    if (!isTubular(st) || s.handles.some((h) => h.structure === st.id)) continue;
    if (isVisible(def, s, st)) s.handles.push({ handle: `T${s.handles.length + 1}`, structure: st.id });
  }
}

export function structureOfHandle(def: ProcedureDefinition, s: ProcedureState, handle: string): Structure | undefined {
  const h = s.handles.find((x) => x.handle === handle);
  return h ? structureOf(def, h.structure) : undefined;
}

export function handleOf(s: ProcedureState, structureId: string): string | undefined {
  return s.handles.find((h) => h.structure === structureId)?.handle;
}

/** The structures that truly enter `organ` (or one of its parts). */
function entering(def: ProcedureDefinition, organ: string): Structure[] {
  const parts = new Set([organ, ...def.anatomy.filter((x) => x.parent === organ).map((x) => x.id)]);
  return def.anatomy.filter((x) => x.enters != null && parts.has(x.enters));
}

/** Structures that, as seen now, appear to enter `organ` without doing so (a tented common bile duct). */
export function apparentlyEntering(def: ProcedureDefinition, s: ProcedureState, organ: string): Structure[] {
  const parts = new Set([organ, ...def.anatomy.filter((x) => x.parent === organ).map((x) => x.id)]);
  return def.anatomy.filter((st) => {
    if (!isVisible(def, s, st)) return false;
    const rule = appearanceRule(def, s, st);
    return rule?.appearsToEnter != null && parts.has(rule.appearsToEnter);
  });
}

/** Does criterion `id` of view `viewId` hold in the field now? */
export function criterionHolds(def: ProcedureDefinition, s: ProcedureState, viewId: string, id: string): boolean {
  const view = def.views.find((v) => v.id === viewId);
  const criterion = view?.criteria.find((c) => c.id === id);
  if (!criterion || !fieldOpen(s)) return false;
  const test = criterion.test;
  if ("cleared" in test) return clearedFraction(def, s, test.cleared) >= test.atLeast;
  if ("exposure" in test) return exposure(def, s, test.exposure) >= test.atLeast;
  // onlyEntering: every structure that enters the organ is in view, free all round and still whole;
  // and nothing else appears to enter it
  const truly = entering(def, test.onlyEntering);
  if (!truly.length) return false;
  const allSeen = truly.every((st) => isVisible(def, s, st) && s.isolated.includes(st.id) && !s.divided.includes(st.id));
  return allSeen && apparentlyEntering(def, s, test.onlyEntering).length === 0;
}

/** Each criterion of a view → whether it holds now. */
export function viewCriteria(def: ProcedureDefinition, s: ProcedureState, viewId: string): Record<string, boolean> {
  const view = def.views.find((v) => v.id === viewId);
  return Object.fromEntries((view?.criteria ?? []).map((c) => [c.id, criterionHolds(def, s, viewId, c.id)]));
}

/** Every criterion of the view holds now. */
export function viewHolds(def: ProcedureDefinition, s: ProcedureState, viewId: string): boolean {
  const view = def.views.find((v) => v.id === viewId);
  return !!view && view.criteria.every((c) => criterionHolds(def, s, viewId, c.id));
}

/** The field is obscured: an uncontrolled major bleed, or a brisk one not yet suctioned. */
export function obscured(s: ProcedureState): boolean {
  return s.bleeding.some((b) => !b.controlled && (b.severity === "major" || (b.severity === "brisk" && !b.suctioned)));
}

/** The specimen and its parts. */
export function specimenParts(def: ProcedureDefinition): Set<string> {
  return new Set([def.specimen, ...def.anatomy.filter((x) => x.parent === def.specimen).map((x) => x.id)]);
}
