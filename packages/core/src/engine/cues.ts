/**
 * What a bystander sees of the patient (docs/EMBODIED.md R7, §4): whether
 * they look critically ill, the oxygen accessory they wear and their posture
 * — never a number, a finding or a result. One implementation for every
 * runtime: the web world's voxel patient and the embodied agent runtime's
 * `ClinicalView.cues` (@clinicalcraft/agent). Review G12: the posture and the
 * accessory follow clinical state (an intervention's authored `posture`, an
 * oxygen intervention's `device` or dose text), never the case's static data.
 */
import { t } from "../i18n.js";
import type { CaseDefinition, Intervention, Posture } from "../schema/case.js";
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

/** Oxygen delivery devices that put a mask on the face (the rest — nasal cannulae — do not). */
const MASK_DEVICES: ReadonlySet<string> = new Set(["simple-mask", "non-rebreather-mask", "venturi-mask", "nebuliser-mask"]);

/** Words of a mask in an oxygen intervention's id, name or dose (either language). */
const MASK_WORDS = /mask|nrb|non-rebreath|venturi|reservoir|面罩|储氧/;

/**
 * The accessory of an oxygen intervention (null for other kinds): its authored `device` decides (a simple,
 * non-rebreather, Venturi or nebuliser mask is a mask; nasal cannulae, high-flow ones included, are
 * cannulae); without one, a mask named in its id, name or dose text in either language ("15 L/min via
 * non-rebreather mask", "储氧面罩") — else nasal cannulae.
 */
export function oxygenAccessory(iv: Pick<Intervention, "id" | "name" | "kind"> & Partial<Pick<Intervention, "device" | "dose">>): OxygenAccessory | null {
  if (iv.kind !== "oxygen") return null;
  if (iv.device) return MASK_DEVICES.has(iv.device) ? "oxygen-mask" : "nasal-cannula";
  const label = [iv.id, t(iv.name, "en"), t(iv.name, "zh-CN"), iv.dose ? t(iv.dose, "en") : "", iv.dose ? t(iv.dose, "zh-CN") : ""].join(" ").toLowerCase();
  return MASK_WORDS.test(label) ? "oxygen-mask" : "nasal-cannula";
}

/**
 * The patient's posture now (G12): that of the latest intervention given that authors one (positioning,
 * transfers — "lie her flat" → lying, a trolley transfer → lying), else the case's own.
 */
export function patientPosture(c: CaseDefinition, s: SessionState): Posture {
  let posture: Posture = c.patient.posture ?? "standing";
  for (const r of s.interventions) {
    const authored = c.interventions.find((i) => i.id === r.interventionId)?.posture;
    if (authored) posture = authored;
  }
  return posture;
}

/** Bystander cues of the patient at the session clock. */
export interface PatientBystanderCues {
  /** A critical alarm on the bedside snapshot, or — before the monitor is attached — `inExtremis`. Never for a case without a live reading (`baselineOnly`). */
  distressed: boolean;
  /** The accessory of the latest oxygen intervention given, or null. */
  accessory: OxygenAccessory | null;
  /** The posture now (`patientPosture`). */
  posture: Posture;
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
  return { distressed, accessory, posture: patientPosture(c, s) };
}
