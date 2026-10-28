/**
 * Critical rubric items missed (`rubric[].critical`, core `AssessmentReport.criticalMissed`): every debrief —
 * the web's, the CLI's (`/debrief`, the final assessment) and MCP's `get_debrief` — shows them prominently, once
 * the case is complete (mid-case they would be an answer key). They do not cap the score.
 */
import { t, type AssessmentReport, type CaseDefinition } from "@clinicalcraft/core";
import { rt } from "./session/i18n.js";

/** The critical items the report says were missed, with their rubric texts in `locale` (empty when none, or the case marks none). */
export function criticalMisses(c: CaseDefinition, report: Pick<AssessmentReport, "criticalMissed">, locale: string): { id: string; text: string }[] {
  return (report.criticalMissed ?? []).map((id) => ({ id, text: t(c.rubric.find((r) => r.id === id)?.text, locale) || id }));
}

/** One line per missed critical item: "⚠ Critical item missed: Withheld nitrates in RV infarction". */
export function criticalMissLines(c: CaseDefinition, report: Pick<AssessmentReport, "criticalMissed">, locale: string): string[] {
  return criticalMisses(c, report, locale).map((m) => rt(locale, "critical.missed", { text: m.text }));
}
