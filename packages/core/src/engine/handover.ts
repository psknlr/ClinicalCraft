/**
 * The content of a hand-over (docs/TEAM.md §5), from the record as it stands: an anaesthetist's relief, the advance
 * report to the recovery room, the hand-over at the recovery bed. What is handed over is what the record holds — the
 * airway interventions given, the vitals now, the drugs given and when, the holds still open, whether the patient can
 * speak, how the operation ended and the count — never prose made up for it.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { HandoverContent, SessionState } from "../schema/session.js";
import { activeHolds } from "./conditions.js";
import { countStatus } from "./count.js";
import { vitalsAt } from "./physiology.js";
import { patientNonVerbal } from "./speech.js";

/** What the record holds for a hand-over now. */
export function handoverFromRecord(c: CaseDefinition, s: SessionState): HandoverContent {
  const kind = (id: string) => c.interventions.find((i) => i.id === id)?.kind;
  const given = s.interventions.filter((r) => !r.invalid);
  const v = vitalsAt(c, s).vitals as unknown as Record<string, unknown>;
  const pick = (keys: readonly string[]) => Object.fromEntries(keys.flatMap((key) => (typeof v[key] === "number" ? [[key, v[key] as number]] : [])));
  const holds = c.interventions.filter((i) => activeHolds(s, i.id).length > 0).map((i) => i.id);
  const p = s.procedure;
  return {
    airway: [...new Set(given.filter((r) => kind(r.interventionId) === "airway").map((r) => r.interventionId))],
    ventilation: pick(["spo2", "rr", "etco2"]),
    haemodynamics: pick(["hr", "sbp", "dbp", "map"]),
    drugs: given.filter((r) => kind(r.interventionId) === "medication").map((r) => ({ id: r.interventionId, at: r.at })),
    unresolved: holds,
    speaks: !patientNonVerbal(c, s),
    ...(p
      ? {
          procedure: {
            closed: p.closed,
            specimen: p.specimen,
            bailouts: [...p.bailouts],
            injuries: p.injuries.map((i) => ({ kind: i.kind, structure: i.structure, recognised: i.recognised })),
          },
        }
      : {}),
    ...(s.count ? { count: countStatus(s.count) } : {}),
  };
}
