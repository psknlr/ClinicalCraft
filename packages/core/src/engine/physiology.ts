/**
 * What the bedside shows — `vitalsAt`, `shownVitals`, `alarmingVitals`,
 * `alarmsAt` (docs/ARCHITECTURE.md §3.2) — on top of the physiological
 * signal of `./signal.ts`:
 *
 * * monitored vitals (hr, BP, rr, SpO₂, T, EtCO₂ — those the monitor
 *   `measures`) and the rhythm (once its ECG leads are on, `ecgWhen`) while
 *   the bedside monitor is attached (`./monitor.ts`); before that only the
 *   case's spot checks, as static manual readings — and no alarm at all;
 * * nursing observations (GCS, pain), never alarmed;
 * * other vitals (glucose) once a `physiology.revealedBy` test was read.
 *
 * Alarms, trend arrows and `vital` conditions use the noise-free signal
 * (monitors alarm on averaged values), so deterministic jitter never makes
 * alarms chatter. Displayed values include the jitter.
 */
import type { CaseDefinition } from "../schema/case.js";
import { VITAL_KEYS, type VitalKey } from "../schema/common.js";
import type { SessionState } from "../schema/session.js";
import { applyArrest, UNMEASURABLE_IN_ARREST } from "./arrest.js";
import { evaluate } from "./conditions.js";
import { MONITORED_VITALS, OBSERVED_VITALS, measuredVitals, monitorAttachedAt, spotCheckVitals } from "./monitor.js";
import { clamp, minuteOf, noiseAt, PHYSIOLOGICAL_RANGES, roundVital, signalAt, type NumericVitals, type Signal } from "./signal.js";
import type { AlarmLevel, DisplayedVitals, VitalAlarm, VitalsSnapshot } from "./types.js";

export {
  PHYSIOLOGICAL_RANGES,
  NOISE_AMPLITUDE,
  NORMAL_ADULT_VITALS,
  roundVital,
  trendContribution,
  effectFraction,
  vitalValue,
} from "./signal.js";
export { MONITORED_VITALS, OBSERVED_VITALS, ecgAttached, measuredVitals, monitorAttached, monitorAttachedAt, spotCheckVitals } from "./monitor.js";

/** Alarm thresholds for one vital sign. */
export interface AlarmLimit {
  low?: number;
  high?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

/** Default adult alarm limits (a case's `physiology.alarms` entry replaces a vital's defaults). */
export const DEFAULT_ALARM_LIMITS: Readonly<Partial<Record<VitalKey, AlarmLimit>>> = {
  hr: { low: 50, high: 120, criticalLow: 40, criticalHigh: 150 },
  sbp: { low: 90, high: 180, criticalLow: 80, criticalHigh: 220 },
  rr: { low: 10, high: 24, criticalLow: 8, criticalHigh: 30 },
  spo2: { low: 92, criticalLow: 88 },
  temp: { low: 36, high: 38.3, criticalLow: 35, criticalHigh: 40 },
  gcs: { low: 13, criticalLow: 8 },
  glucose: { low: 3.9, high: 15, criticalLow: 3, criticalHigh: 25 },
};

/** Minimum change over 5 minutes that shows a trend arrow. */
const TREND_THRESHOLD: Readonly<Record<VitalKey, number>> = {
  hr: 3,
  sbp: 3,
  dbp: 2,
  rr: 2,
  spo2: 1,
  temp: 0.2,
  gcs: 1,
  glucose: 0.5,
  etco2: 2,
  pain: 1,
};

/** Look-back window (minutes) for trend arrows. */
const TREND_WINDOW = 5;

/* ------------------------------------------------------------------ */
/* What the bedside shows                                              */
/* ------------------------------------------------------------------ */

const isMonitored = (vital: VitalKey) => MONITORED_VITALS.includes(vital);
const isObserved = (vital: VitalKey) => OBSERVED_VITALS.includes(vital);

/** A vital listed in `physiology.revealedBy` whose investigation has been read (any phase). */
function revealed(c: CaseDefinition, s: SessionState, vital: VitalKey): boolean {
  const ids = c.physiology?.revealedBy?.[vital] ?? [];
  return ids.length > 0 && s.seen.some((key) => ids.includes(key.slice(0, key.lastIndexOf("@"))));
}

/** The bedside at one minute: whether the monitor is on and which vitals are shown / static / alarmed. */
interface Bedside {
  attached: boolean;
  /** Minute the monitor was attached (`null` while it is not). */
  attachedAt: number | null;
  /** The rhythm and ECG are shown: attached, with its ECG leads (`physiology.monitor.ecgWhen`). */
  ecg: boolean;
  shown: Set<VitalKey>;
  /** Shown as static manual readings (spot checks before the monitor is attached). */
  manual: VitalKey[];
  alarming: Set<VitalKey>;
}

/**
 * The bedside at minute `t`. `assumeAttached` evaluates it as if the monitor
 * had been on from minute 0 — what the patient's signal would have alarmed
 * (`patientAlarmsAt`), whatever the learner did about the monitor.
 */
function bedsideAt(c: CaseDefinition, s: SessionState, t: number, assumeAttached = false): Bedside {
  const attachedAt = assumeAttached ? 0 : monitorAttachedAt(c, s);
  const attached = attachedAt != null && t >= attachedAt;
  const manual = attached ? [] : spotCheckVitals(c);
  const shown = new Set<VitalKey>([...(attached ? measuredVitals(c) : manual), ...OBSERVED_VITALS]);
  for (const vital of VITAL_KEYS) if (!isMonitored(vital) && !isObserved(vital) && revealed(c, s, vital)) shown.add(vital);
  // Nursing observations never alarm; without a monitor nothing does — not the static spot checks, not a
  // read glucose (a test result: a critical one is called through as such, never as a monitor alarm).
  const alarming = new Set(attached ? [...shown].filter((v) => !isObserved(v)) : []);
  const leads = c.physiology?.monitor?.ecgWhen;
  const ecg = attached && (assumeAttached || !leads || evaluate(c, s, leads));
  return { attached, attachedAt, ecg, shown, manual, alarming };
}

/**
 * Vitals the bedside shows at `minute` (default: the session clock): the
 * monitored ones it measures (`measuredVitals`) while the monitor is
 * attached — before that only the
 * case's spot checks (static manual readings) —, nursing observations, and
 * other vitals (glucose) once a `physiology.revealedBy` investigation was
 * read. The rest are engine-only (conditions, trends): never displayed,
 * charted or alarmed — grounding rule 2, nobody has measured them.
 */
export function shownVitals(c: CaseDefinition, s: SessionState, minute: number = s.clock): Set<VitalKey> {
  return bedsideAt(c, s, minuteOf(s, minute)).shown;
}

/**
 * Vitals that can raise a monitor alarm at `minute`: while the monitor is
 * attached, the monitored ones plus revealed ones (a read glucose) — never
 * nursing observations; before it is attached, none (not the spot checks,
 * not a read glucose).
 */
export function alarmingVitals(c: CaseDefinition, s: SessionState, minute: number = s.clock): Set<VitalKey> {
  return bedsideAt(c, s, minuteOf(s, minute)).alarming;
}

/* ------------------------------------------------------------------ */
/* Alarms                                                              */
/* ------------------------------------------------------------------ */

/** Effective alarm limits for a case: defaults with per-vital case overrides. */
export function alarmLimitsFor(c: CaseDefinition): Partial<Record<VitalKey, AlarmLimit>> {
  return { ...DEFAULT_ALARM_LIMITS, ...(c.physiology?.alarms ?? {}) };
}

/**
 * Alarm level of a value: critical when `≤ criticalLow` or `≥ criticalHigh`,
 * warning when `< low` or `> high`, otherwise null.
 */
export function alarmLevel(value: number, limit: AlarmLimit | undefined): AlarmLevel | null {
  if (!limit) return null;
  if ((limit.criticalLow != null && value <= limit.criticalLow) || (limit.criticalHigh != null && value >= limit.criticalHigh)) {
    return "critical";
  }
  if ((limit.low != null && value < limit.low) || (limit.high != null && value > limit.high)) return "warning";
  return null;
}

/**
 * Active alarms at minute `t` (noise-free signal, display-rounded values),
 * in `VITAL_KEYS` order, for `alarmingVitals` only (the monitor never alarms
 * on a nursing observation or an unmeasured glucose, nor on anything before
 * it is attached). Cases without physiology never alarm. During a
 * cardiac-arrest rhythm hr is always critical, whatever the case's limits.
 */
export function alarmsAt(c: CaseDefinition, s: SessionState, t: number = s.clock): VitalAlarm[] {
  if (!c.physiology) return [];
  const minute = minuteOf(s, t);
  return alarmsFor(c, signalAt(c, s, minute), bedsideAt(c, s, minute).alarming);
}

/**
 * The alarms the patient's signal raises at minute `t` on a monitor attached
 * from the start: `alarmsAt` as if `physiology.monitor` were absent (still
 * no nursing observation, and a glucose only once it has been read). What
 * the safety metric counts (`countCriticalAlarms`): it measures the
 * patient, so attaching the monitor early, late or never scores the same
 * course the same.
 */
export function patientAlarmsAt(c: CaseDefinition, s: SessionState, t: number = s.clock): VitalAlarm[] {
  if (!c.physiology) return [];
  const minute = minuteOf(s, t);
  return alarmsFor(c, signalAt(c, s, minute), bedsideAt(c, s, minute, true).alarming);
}

function alarmsFor(c: CaseDefinition, { values, arrest }: Signal, alarming: ReadonlySet<VitalKey>): VitalAlarm[] {
  const limits = alarmLimitsFor(c);
  const alarms: VitalAlarm[] = [];
  for (const vital of VITAL_KEYS) {
    const raw = values[vital];
    if (raw == null || !alarming.has(vital)) continue;
    const value = roundVital(vital, raw);
    const level = arrest && vital === "hr" ? "critical" : alarmLevel(value, limits[vital]);
    if (level) alarms.push({ vital, level, value });
  }
  return alarms;
}

/**
 * Vitals the bedside monitor cannot read at minute `t`: during a
 * cardiac-arrest rhythm on an attached monitor, `UNMEASURABLE_IN_ARREST`
 * (their value is the placeholder 0); otherwise none. The same list as
 * `vitalsAt(...).unmeasurable`.
 */
export function unmeasurableAt(c: CaseDefinition, s: SessionState, t: number = s.clock): VitalKey[] {
  if (!c.physiology) return [];
  const minute = minuteOf(s, t);
  const { arrest } = signalAt(c, s, minute);
  return arrest && bedsideAt(c, s, minute).attached ? [...UNMEASURABLE_IN_ARREST[arrest]] : [];
}

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */

/**
 * Trend arrows against `t − TREND_WINDOW`; an unmeasurable vital has no
 * trend (0). A monitored vital looks back no further than the minute the
 * monitor was attached: it has no earlier readings to compare with.
 */
function trendArrows(c: CaseDefinition, s: SessionState, t: number, now: Signal, attachedAt: number | null): Partial<Record<VitalKey, -1 | 0 | 1>> {
  const from = Math.max(0, t - TREND_WINDOW);
  const before = signalAt(c, s, from).values;
  const monitoredFrom = attachedAt != null && attachedAt > from ? Math.min(attachedAt, t) : from;
  const beforeMonitored = monitoredFrom === from ? before : signalAt(c, s, monitoredFrom).values;
  const unmeasurable: readonly VitalKey[] = now.arrest ? UNMEASURABLE_IN_ARREST[now.arrest] : [];
  const arrows: Partial<Record<VitalKey, -1 | 0 | 1>> = {};
  for (const vital of VITAL_KEYS) {
    const a = now.values[vital];
    const b = (isMonitored(vital) ? beforeMonitored : before)[vital];
    if (a == null || b == null) continue;
    if (unmeasurable.includes(vital)) {
      arrows[vital] = 0;
      continue;
    }
    const diff = a - b;
    const threshold = TREND_THRESHOLD[vital];
    arrows[vital] = diff >= threshold ? 1 : diff <= -threshold ? -1 : 0;
  }
  return arrows;
}

/**
 * Displayed values: the signal plus jitter, rounded; arrest readings (0, etco2
 * cap) are re-applied after the jitter. Only `bedside.shown` vitals are
 * included (all of them for a baseline-only case, `bedside` null); spot
 * checks show the case baseline as measured by hand (no jitter, no arrest
 * readings). The rhythm and ECG need an attached monitor. A self-reported
 * pain score is left out while the patient cannot report one (cardiac
 * arrest, GCS ≤ 8). `map` accompanies a shown blood pressure.
 */
function displayVitals(c: CaseDefinition, t: number, { values, base, arrest }: Signal, bedside: Bedside | null): DisplayedVitals {
  const shown: NumericVitals = {};
  for (const vital of VITAL_KEYS) {
    if (bedside && !bedside.shown.has(vital)) continue;
    if (bedside?.manual.includes(vital)) {
      const measured = c.physiology?.baseline[vital];
      if (typeof measured === "number") shown[vital] = roundVital(vital, measured);
      continue;
    }
    const v = values[vital];
    if (v == null) continue;
    const [lo, hi] = PHYSIOLOGICAL_RANGES[vital];
    shown[vital] = roundVital(vital, clamp(v + noiseAt(c, vital, t), lo, hi));
  }
  const attached = !bedside || bedside.attached;
  const ecg = !bedside || bedside.ecg;
  if (arrest && attached) applyArrest(arrest, shown);
  if (shown.pain != null && (arrest || (shown.gcs != null && shown.gcs <= 8))) delete shown.pain;
  const vitals: DisplayedVitals = {};
  for (const key of ["hr", "sbp", "dbp", "rr", "spo2", "temp"] as const) if (shown[key] != null) vitals[key] = shown[key];
  if (shown.sbp != null && shown.dbp != null) vitals.map = Math.round((shown.sbp + 2 * shown.dbp) / 3);
  for (const key of ["gcs", "glucose", "etco2", "pain"] as const) if (shown[key] != null) vitals[key] = shown[key];
  if (ecg && base.rhythm) vitals.rhythm = base.rhythm;
  if (ecg && base.ecg) vitals.ecg = base.ecg;
  return vitals;
}

/**
 * Bedside snapshot at `minute` (default — and for a non-finite minute — the
 * session clock; negative minutes clamp to 0). Pure function of (case,
 * state, minute) — see module docs for semantics. A case with
 * `physiology.monitor` reports `monitorAttached`; while it is false the
 * snapshot has no rhythm, no monitor alarms and no monitored vital but the
 * `spotChecks` (static). During a cardiac-arrest rhythm an attached monitor
 * lists `unmeasurable` vitals (shown as 0, no jitter, no trend arrow).
 */
export function vitalsAt(c: CaseDefinition, s: SessionState, minute?: number): VitalsSnapshot {
  const t = minuteOf(s, minute);
  const signal = signalAt(c, s, t);
  if (!c.physiology) {
    return { minute: t, vitals: displayVitals(c, t, signal, null), alarms: [], trend: {}, baselineOnly: true };
  }
  const bedside = bedsideAt(c, s, t);
  const trend = trendArrows(c, s, t, signal, bedside.attachedAt);
  for (const vital of VITAL_KEYS) if (!bedside.shown.has(vital) || bedside.manual.includes(vital)) delete trend[vital];
  const snapshot: VitalsSnapshot = {
    minute: t,
    vitals: displayVitals(c, t, signal, bedside),
    alarms: alarmsFor(c, signal, bedside.alarming),
    trend,
  };
  if (c.physiology.monitor) snapshot.monitorAttached = bedside.attached;
  if (c.physiology.monitor?.ecgWhen) snapshot.ecgAttached = bedside.ecg;
  if (bedside.manual.length > 0) snapshot.spotChecks = [...bedside.manual];
  if (signal.arrest && bedside.attached) snapshot.unmeasurable = [...UNMEASURABLE_IN_ARREST[signal.arrest]];
  return snapshot;
}
