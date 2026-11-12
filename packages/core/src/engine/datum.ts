/**
 * Safety-critical data and what the encounter knows of them (the engineering recommendations, P1-9): asking is not
 * confirming. A history item tagged `safety {datum, finding}` establishes a datum when asked — an answer that the
 * record does not know leaves it unknown; an intervention that `mitigates` it (a documented precaution) manages an
 * unknown. Never converted into a normal finding.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";

export type DatumStatus = "not-asked" | "asked-unknown" | "verified-negative" | "verified-positive" | "mitigated";

/** The safety data a case models (from its history items' `safety` tags), in order. */
export function caseData(c: CaseDefinition): string[] {
  return [...new Set(c.history.flatMap((h) => (h.safety ? [h.safety.datum] : [])))];
}

/** What the encounter knows of a datum now (null: the case does not model it). */
export function datumStatus(c: CaseDefinition, s: SessionState, datum: string): DatumStatus | null {
  const items = c.history.filter((h) => h.safety?.datum === datum);
  if (!items.length) return null;
  const asked = items.filter((h) => s.asked.includes(h.id));
  const findings = asked.map((h) => h.safety!.finding ?? (h.disclosure === "unknown" ? "unknown" : "negative"));
  if (findings.includes("positive")) return "verified-positive";
  if (findings.includes("negative")) return "verified-negative";
  const mitigated = c.interventions.some((i) => i.mitigates.includes(datum) && s.interventions.some((r) => r.interventionId === i.id && !r.invalid));
  if (mitigated) return "mitigated";
  return asked.length ? "asked-unknown" : "not-asked";
}
