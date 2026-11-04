/**
 * The anaesthetic hand-over's content (docs/TEAM.md §5): taken from the record as it stands — the airway
 * interventions given, the vitals at the hand-over, the drugs given and when, the holds still open — never prose
 * made up for it; and its words in either language.
 */
import { activeHolds, t, vitalsAt, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import { rt } from "./i18n.js";

export interface HandoverContent {
  airway: string[];
  ventilation: Record<string, number>;
  haemodynamics: Record<string, number>;
  drugs: { id: string; at: number }[];
  unresolved: string[];
}

/** What the record holds for a hand-over now. */
export function handoverFromRecord(c: CaseDefinition, s: SessionState): HandoverContent {
  const kind = (id: string) => c.interventions.find((i) => i.id === id)?.kind;
  const given = s.interventions.filter((r) => !r.invalid);
  const v = vitalsAt(c, s).vitals;
  const pick = (keys: readonly string[]) => Object.fromEntries(keys.flatMap((key) => (typeof (v as Record<string, unknown>)[key] === "number" ? [[key, (v as Record<string, number>)[key]!]] : [])));
  const holds = c.interventions.filter((i) => activeHolds(s, i.id).length > 0).map((i) => i.id);
  return {
    airway: [...new Set(given.filter((r) => kind(r.interventionId) === "airway").map((r) => r.interventionId))],
    ventilation: pick(["spo2", "rr", "etco2"]),
    haemodynamics: pick(["hr", "sbp", "dbp", "map"]),
    drugs: given.filter((r) => kind(r.interventionId) === "medication").map((r) => ({ id: r.interventionId, at: r.at })),
    unresolved: holds,
  };
}

/** The hand-over in words ("Airway: …; SpO₂ 98, …; drugs: …; open: …"). */
export function handoverText(c: CaseDefinition, h: HandoverContent, L: string): string {
  const name = (id: string) => {
    const i = c.interventions.find((x) => x.id === id);
    return i ? t(i.name, L) : id;
  };
  const sep = L === "zh-CN" ? "、" : ", ";
  const values = (r: Record<string, number>) => Object.entries(r).map(([k, n]) => `${k.toUpperCase()} ${Math.round(n)}`).join(sep) || "—";
  return rt(L, "relief.summary", {
    airway: h.airway.map(name).join(sep) || "—",
    ventilation: values(h.ventilation),
    haemodynamics: values(h.haemodynamics),
    drugs: h.drugs.map((d) => name(d.id)).join(sep) || "—",
    unresolved: h.unresolved.map(name).join(sep) || "—",
  });
}
