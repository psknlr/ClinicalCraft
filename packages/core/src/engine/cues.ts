/**
 * What a bystander sees of the patient (docs/EMBODIED.md R7, §4): whether
 * they look critically ill and the oxygen accessory they wear — never a
 * number, a finding or a result. One implementation for every runtime: the
 * web world's voxel patient and the embodied agent runtime's
 * `ClinicalView.cues` (@clinicalcraft/agent).
 */
import { t } from "../i18n.js";
import type { CaseDefinition, Intervention } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { MONITORED_VITALS } from "./monitor.js";
import { alarmLevel, alarmLimitsFor, vitalsAt } from "./physiology.js";
import { vitalValue } from "./signal.js";

/**
 * Does the patient look critically ill — a monitored vital in its critical
 * band (engine truth: a sick patient looks sick whether or not a monitor is
 * attached)? No number is shown.
 */
export function inExtremis(c: CaseDefinition, s: SessionState): boolean {
  if (!c.physiology) return false;
  const limits = alarmLimitsFor(c);
  return MONITORED_VITALS.some((vital) => {
    const value = vitalValue(c, s, vital);
    return value != null && alarmLevel(value, limits[vital]) === "critical";
  });
}

/** What an oxygen intervention puts on the patient's face. */
export type OxygenAccessory = "oxygen-mask" | "nasal-cannula";

/** The accessory of an oxygen intervention (a mask, NRB, non-rebreather or Venturi mask — else nasal cannula); null for other kinds. */
export function oxygenAccessory(iv: Pick<Intervention, "id" | "name" | "kind">): OxygenAccessory | null {
  if (iv.kind !== "oxygen") return null;
  const label = `${iv.id} ${t(iv.name, "en")}`.toLowerCase();
  return /mask|nrb|non-rebreath|venturi/.test(label) ? "oxygen-mask" : "nasal-cannula";
}

/** Bystander cues of the patient at the session clock. */
export interface PatientBystanderCues {
  /** A critical alarm on the bedside snapshot, or — before the monitor is attached — `inExtremis`. Never for a case without a live reading (`baselineOnly`). */
  distressed: boolean;
  /** The accessory of the latest oxygen intervention given, or null. */
  accessory: OxygenAccessory | null;
}

/** The patient's bystander cues (see `PatientBystanderCues`). */
export function patientCues(c: CaseDefinition, s: SessionState): PatientBystanderCues {
  const v = vitalsAt(c, s);
  const distressed = !v.baselineOnly && (v.alarms.some((a) => a.level === "critical") || (v.monitorAttached === false && inExtremis(c, s)));
  let accessory: OxygenAccessory | null = null;
  for (const r of s.interventions) {
    const iv = c.interventions.find((i) => i.id === r.interventionId);
    const a = iv ? oxygenAccessory(iv) : null;
    if (a) accessory = a;
  }
  return { distressed, accessory };
}
