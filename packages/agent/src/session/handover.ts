/**
 * The anaesthetic hand-over's content (docs/TEAM.md §5): taken from the record as it stands — the airway
 * interventions given, the vitals at the hand-over, the drugs given and when, the holds still open — never prose
 * made up for it; and its words in either language.
 */
import { handoverFromRecord as recordHandover, t, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import { rt } from "./i18n.js";

/** What an anaesthetist hands over to the colleague who relieves them (`AnaesthesiaOpSchema` "handover"). */
export interface HandoverContent {
  airway: string[];
  ventilation: Record<string, number>;
  haemodynamics: Record<string, number>;
  drugs: { id: string; at: number }[];
  unresolved: string[];
}

/** What the record holds for an anaesthetic hand-over now (core `handoverFromRecord`, the anaesthetic part of it). */
export function handoverFromRecord(c: CaseDefinition, s: SessionState): HandoverContent {
  const { airway, ventilation, haemodynamics, drugs, unresolved } = recordHandover(c, s);
  return { airway, ventilation, haemodynamics, drugs, unresolved };
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
