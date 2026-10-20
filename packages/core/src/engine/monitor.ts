/**
 * The bedside monitor: which vitals it measures and when it is attached
 * (docs/ARCHITECTURE.md §3.2).
 *
 * A case with `physiology.monitor` starts with the patient off the monitor:
 * nobody is measuring hr, BP, rr, SpO₂, T or EtCO₂ continuously and nobody
 * sees the rhythm until `attachedWhen` holds — typically the learner's
 * monitoring intervention, or arrival in a monitored area. The reducer
 * latches the minute it first held (`SessionState.monitorAttachedAt`), so
 * the monitor stays on when a phase condition later stops holding, and past
 * minutes (trend look-back) know whether a monitor was there. Once on, it
 * shows what it `measures` (default: every monitored vital), and the rhythm
 * once its ECG leads are on (`ecgWhen`, when they come separately). A case
 * without `physiology.monitor` is monitored from minute 0.
 */
import type { CaseDefinition } from "../schema/case.js";
import { VITAL_KEYS, type VitalKey } from "../schema/common.js";
import type { SessionState } from "../schema/session.js";
import { evaluate } from "./conditions.js";

/** Vitals a bedside monitor measures: shown and alarmed while it is attached. */
export const MONITORED_VITALS: readonly VitalKey[] = ["hr", "sbp", "dbp", "rr", "spo2", "temp", "etco2"];

/** Nursing observations charted at the bedside (shown, monitor or not, but a monitor never alarms on them). */
export const OBSERVED_VITALS: readonly VitalKey[] = ["gcs", "pain"];

/**
 * Minute from which the bedside monitor is attached, or `null` while it is
 * not: 0 for a case without `physiology.monitor` (or without physiology);
 * otherwise the latched `s.monitorAttachedAt`. A state the reducer has not
 * settled since `attachedWhen` became true — before `start`, or built by
 * hand — counts as attached from minute 0 when the condition holds now.
 */
export function monitorAttachedAt(c: CaseDefinition, s: SessionState): number | null {
  const monitor = c.physiology?.monitor;
  if (!monitor) return 0;
  if (s.monitorAttachedAt != null) return s.monitorAttachedAt;
  return evaluate(c, s, monitor.attachedWhen) ? 0 : null;
}

/** Is the bedside monitor attached at `minute` (default: the session clock)? */
export function monitorAttached(c: CaseDefinition, s: SessionState, minute: number = s.clock): boolean {
  const at = monitorAttachedAt(c, s);
  return at != null && minute >= at;
}

/**
 * Does the bedside show the rhythm and ECG at `minute` (default: the session
 * clock)? The monitor is attached and, when the case sets
 * `physiology.monitor.ecgWhen` (ECG leads that come separately), that holds
 * on the session state.
 */
export function ecgAttached(c: CaseDefinition, s: SessionState, minute: number = s.clock): boolean {
  if (!monitorAttached(c, s, minute)) return false;
  const leads = c.physiology?.monitor?.ecgWhen;
  return !leads || evaluate(c, s, leads);
}

/**
 * The monitored vitals the case's monitor measures once attached:
 * `physiology.monitor.measures` (monitored vitals only, in `VITAL_KEYS`
 * order), or all `MONITORED_VITALS` when it does not say.
 */
export function measuredVitals(c: CaseDefinition): VitalKey[] {
  const listed = c.physiology?.monitor?.measures;
  return VITAL_KEYS.filter((v) => MONITORED_VITALS.includes(v) && (!listed || listed.includes(v)));
}

/**
 * The vitals shown as static manual readings while the monitor is not
 * attached: `physiology.monitor.spotChecks` that are monitored vitals the
 * baseline models, in `VITAL_KEYS` order (empty without a monitor step).
 */
export function spotCheckVitals(c: CaseDefinition): VitalKey[] {
  const physiology = c.physiology;
  const listed = physiology?.monitor?.spotChecks ?? [];
  if (!physiology || listed.length === 0) return [];
  return VITAL_KEYS.filter((v) => listed.includes(v) && MONITORED_VITALS.includes(v) && typeof physiology.baseline[v] === "number");
}
