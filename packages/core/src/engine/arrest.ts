/**
 * Cardiac-arrest physiology (docs/ARCHITECTURE.md §3.2).
 *
 * A rhythm that produces no cardiac output overrides the additive vitals
 * model: whatever the baseline, trends and intervention effects add up to,
 * a pulseless patient has no measurable blood pressure or pulse-oximetry
 * reading and (no pulmonary blood flow) a very low end-tidal CO₂.
 */
import type { VitalKey, Vitals } from "../schema/common.js";

/**
 * Arrest class of the rhythm in force:
 * - `"vf-asystole"` — ventricular fibrillation or asystole: no countable
 *   heart rate and no output (hr, sbp, dbp, spo2 unmeasurable);
 * - `"pea-pvt"` — pulseless electrical activity, or ventricular
 *   tachycardia whose scenario baseline sets `sbp: 0`: the monitor still
 *   counts an electrical rate (hr kept) but there is no output (sbp, dbp,
 *   spo2 unmeasurable).
 */
export type ArrestKind = "vf-asystole" | "pea-pvt";

/** Vitals a monitor cannot measure in each arrest class, in `VITAL_KEYS` order. */
export const UNMEASURABLE_IN_ARREST: Readonly<Record<ArrestKind, readonly VitalKey[]>> = {
  "vf-asystole": ["hr", "sbp", "dbp", "spo2"],
  "pea-pvt": ["sbp", "dbp", "spo2"],
};

/** Highest end-tidal CO₂ (mmHg) reported during an arrest. */
export const ARREST_MAX_ETCO2 = 10;

/**
 * Arrest class of a scenario baseline (case baseline plus the `setVitals`
 * of fired events — before trends and effects), or `null` for a perfusing
 * rhythm. Ventricular tachycardia counts as perfusing unless that baseline
 * has `sbp: 0` (pulseless VT); a missing rhythm is perfusing.
 */
export function arrestKind(base: Partial<Vitals>): ArrestKind | null {
  switch (base.rhythm) {
    case "ventricular-fibrillation":
    case "asystole":
      return "vf-asystole";
    case "pea":
      return "pea-pvt";
    case "ventricular-tachycardia":
      return base.sbp === 0 ? "pea-pvt" : null;
    default:
      return null;
  }
}

/**
 * Apply an arrest to numeric vitals in place: the unmeasurable vitals read
 * 0 and etco2 is capped at `ARREST_MAX_ETCO2`. Vitals the case does not
 * model stay absent (no etco2 is invented for a case without capnography).
 */
export function applyArrest(kind: ArrestKind, values: Partial<Record<VitalKey, number>>): void {
  for (const vital of UNMEASURABLE_IN_ARREST[kind]) if (values[vital] != null) values[vital] = 0;
  if (values.etco2 != null) values.etco2 = Math.min(values.etco2, ARREST_MAX_ETCO2);
}
