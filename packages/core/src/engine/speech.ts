/**
 * Who can speak for the patient now (`patient.nonVerbalWhen`, docs/CASE_AUTHORING.md §2).
 *
 * While `nonVerbalWhen` holds the patient never speaks: history goes to the
 * companion when the case has one — whatever `answersHistory` says — and
 * otherwise nobody can answer (the reducer refuses `ask` with
 * `cannot-answer`, so no fact is credited from the patient; the runtime
 * narrates `nonVerbalReason`). Otherwise the usual rule: the companion who
 * answers history speaks, except items authored as the patient's own words
 * (`speaker: "patient"`).
 */
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { evaluate } from "./conditions.js";

/** Does the patient lack speech right now (`patient.nonVerbalWhen` holds)? False when the case sets none. */
export function patientNonVerbal(c: CaseDefinition, s: SessionState): boolean {
  const when = c.patient.nonVerbalWhen;
  return when ? evaluate(c, s, when) : false;
}

/** Who answers a history question: the patient, the companion, or nobody (the patient cannot speak and there is no companion). */
export type HistoryVoice = "patient" | "companion" | "none";

/**
 * Who answers history now — for the item `itemId`, or for a question in
 * general (no item: as for an item without `speaker`).
 */
export function historyVoice(c: CaseDefinition, s: SessionState, itemId?: string): HistoryVoice {
  const companion = c.patient.persona.companion;
  if (patientNonVerbal(c, s)) return companion ? "companion" : "none";
  if (!companion?.answersHistory) return "patient";
  const item = itemId === undefined ? undefined : c.history.find((h) => h.id === itemId);
  return item?.speaker === "patient" ? "patient" : "companion";
}
