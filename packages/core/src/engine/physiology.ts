/**
 * Physiology model — `vitalsAt` (docs/ARCHITECTURE.md §3.2).
 *
 *   value(v, t) = clamp( base(v, t) + Σ trend(v, t) + Σ effect(v, t) + noise(v, t) )
 *
 * Everything here is a pure function of (case, state, minute). Past minutes
 * are reconstructed faithfully: interventions given after `t` contribute
 * nothing at `t`, trend stops recorded after `t` are ignored and scenario
 * `setVitals` only apply from the minute their event fired.
 *
 * Alarms, trend arrows and `vital` conditions use the noise-free signal
 * (monitors alarm on averaged values), so deterministic jitter never makes
 * alarms chatter. Displayed values include the jitter.
 */
import type { CaseDefinition, Intervention, Physiology } from "../schema/case.js";
import { VITAL_KEYS, type VitalKey, type Vitals } from "../schema/common.js";
import type { SessionState } from "../schema/session.js";
import { createRng, seedFrom } from "./random.js";
import type { AlarmLevel, VitalAlarm, VitalsSnapshot } from "./types.js";

/** Alarm thresholds for one vital sign. */
export interface AlarmLimit {
  low?: number;
  high?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

type NumericVitals = Partial<Record<VitalKey, number>>;
type TrendDef = Physiology["trends"][number];
type EffectDef = Intervention["effects"][number];

/** Hard physiological ranges every displayed value is clamped to. */
export const PHYSIOLOGICAL_RANGES: Readonly<Record<VitalKey, readonly [number, number]>> = {
  hr: [0, 250],
  sbp: [0, 260],
  dbp: [0, 160],
  rr: [0, 60],
  spo2: [40, 100],
  temp: [30, 43],
  gcs: [3, 15],
  glucose: [0.5, 60],
  etco2: [0, 100],
  pain: [0, 10],
};

/** Jitter amplitude per vital (multiplied by `physiology.noise`). */
export const NOISE_AMPLITUDE: Readonly<Partial<Record<VitalKey, number>>> = {
  hr: 2,
  sbp: 2,
  dbp: 1,
  rr: 1,
  spo2: 0.5,
  temp: 0.05,
  etco2: 1,
};

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

/** Placeholder for cases without a physiology model (flagged `baselineOnly`). */
export const NORMAL_ADULT_VITALS: Readonly<Vitals> = {
  hr: 78,
  sbp: 122,
  dbp: 76,
  rr: 14,
  spo2: 98,
  temp: 36.8,
  rhythm: "sinus",
};

/* ------------------------------------------------------------------ */
/* Small numeric helpers                                               */
/* ------------------------------------------------------------------ */

/** The minute to evaluate: `minute` when finite (clamped at 0), else the session clock. */
function minuteOf(s: SessionState, minute: number | undefined): number {
  return Math.max(0, minute != null && Number.isFinite(minute) ? minute : s.clock);
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Display precision: temperature and glucose to 0.1, everything else integer. */
export function roundVital(vital: VitalKey, value: number): number {
  return vital === "temp" || vital === "glucose" ? roundTo(value, 1) : Math.round(value);
}

function numericOf(vitals: Partial<Vitals>): NumericVitals {
  const out: NumericVitals = {};
  for (const key of VITAL_KEYS) {
    const v = vitals[key];
    if (typeof v === "number") out[key] = v;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Components                                                          */
/* ------------------------------------------------------------------ */

/**
 * Baseline vitals in force at minute `t`: the case baseline plus scenario
 * `setVitals` of events that had fired by `t`, applied in firing order
 * (`firedEvents` insertion order, stable-sorted by minute — events fired in
 * the same minute keep the order in which the reducer fired them). For the
 * present (and future) the state's `baselineOverrides` are authoritative.
 */
function baselineAt(c: CaseDefinition, s: SessionState, t: number): Partial<Vitals> {
  const physiology = c.physiology;
  if (!physiology) return { ...NORMAL_ADULT_VITALS };
  if (t >= s.clock) return { ...physiology.baseline, ...s.baselineOverrides };
  const byId = new Map(physiology.events.map((event) => [event.id, event]));
  const fired = Object.entries(s.firedEvents)
    .filter(([, at]) => at <= t)
    .sort((a, b) => a[1] - b[1]);
  let base: Partial<Vitals> = { ...physiology.baseline };
  for (const [id] of fired) base = { ...base, ...(byId.get(id)?.setVitals ?? {}) };
  return base;
}

/** Contribution of one trend at minute `t` (`stop` = minute its `until` became true). */
export function trendContribution(trend: TrendDef, t: number, stop: number | undefined): number {
  const bound = (v: number) => clamp(v, trend.min ?? -Infinity, trend.max ?? Infinity);
  const raw = (x: number) => bound(trend.perMinute * Math.max(0, x - trend.startMinute));
  if (stop == null || t <= stop) return noNegativeZero(raw(t));
  const frozen = raw(stop);
  if (!trend.recoverPerMinute) return noNegativeZero(frozen);
  const magnitude = Math.max(0, Math.abs(frozen) - trend.recoverPerMinute * (t - stop));
  return noNegativeZero(Math.sign(frozen) * magnitude);
}

function noNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}

/**
 * Fraction (0..1) of an effect in force at minute `t` for a dose given at `givenAt`:
 * 0 before onset, linear ramp over `rampMinutes`, full for `durationMinutes`
 * (or forever), then 0 (instant offset).
 */
export function effectFraction(effect: EffectDef, givenAt: number, t: number): number {
  const start = givenAt + effect.onsetMinutes;
  if (t < start) return 0;
  const ramp = effect.rampMinutes;
  if (effect.durationMinutes != null && t > start + ramp + effect.durationMinutes) return 0;
  return ramp > 0 ? Math.min(1, (t - start) / ramp) : 1;
}

function applyTrends(c: CaseDefinition, s: SessionState, t: number, values: NumericVitals): void {
  for (const trend of c.physiology?.trends ?? []) {
    const current = values[trend.vital];
    if (current == null) continue;
    const stopAt = s.trendStops[trend.id];
    const stop = stopAt != null && stopAt <= t ? stopAt : undefined;
    values[trend.vital] = current + trendContribution(trend, t, stop);
  }
}

const interventionIndexCache = new WeakMap<CaseDefinition["interventions"], Map<string, Intervention>>();

function interventionIndex(c: CaseDefinition): Map<string, Intervention> {
  let index = interventionIndexCache.get(c.interventions);
  if (!index) {
    index = new Map(c.interventions.map((i) => [i.id, i]));
    interventionIndexCache.set(c.interventions, index);
  }
  return index;
}

function applyEffects(c: CaseDefinition, s: SessionState, t: number, values: NumericVitals): void {
  const byId = interventionIndex(c);
  for (const record of s.interventions) {
    if (record.at > t) continue;
    const intervention = byId.get(record.interventionId);
    if (!intervention) continue;
    for (const effect of intervention.effects) {
      const current = values[effect.vital];
      if (current == null) continue;
      const fraction = effectFraction(effect, record.at, t);
      if (fraction === 0) continue;
      const full = effect.target != null ? effect.target - current : (effect.delta ?? 0);
      values[effect.vital] = current + fraction * full;
    }
  }
}

function clampAll(values: NumericVitals): NumericVitals {
  const out: NumericVitals = {};
  for (const key of VITAL_KEYS) {
    const v = values[key];
    if (v == null) continue;
    const [lo, hi] = PHYSIOLOGICAL_RANGES[key];
    out[key] = clamp(v, lo, hi);
  }
  return out;
}

/** Noise-free physiological values at minute `t` (clamped, unrounded) plus rhythm/ECG. */
function signalAt(c: CaseDefinition, s: SessionState, t: number): { values: NumericVitals; base: Partial<Vitals> } {
  const base = baselineAt(c, s, t);
  const values = numericOf(base);
  if (c.physiology) {
    applyTrends(c, s, t, values);
    applyEffects(c, s, t, values);
  }
  return { values: clampAll(values), base };
}

function noiseAt(c: CaseDefinition, vital: VitalKey, t: number): number {
  const amplitude = (NOISE_AMPLITUDE[vital] ?? 0) * (c.physiology?.noise ?? 0);
  if (amplitude === 0) return 0;
  const rng = createRng(seedFrom(c.id, roundTo(t, 3), vital));
  return (rng() * 2 - 1) * amplitude;
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
 * in `VITAL_KEYS` order. Cases without physiology never alarm.
 */
export function alarmsAt(c: CaseDefinition, s: SessionState, t: number = s.clock): VitalAlarm[] {
  if (!c.physiology) return [];
  return alarmsFor(c, signalAt(c, s, minuteOf(s, t)).values);
}

function alarmsFor(c: CaseDefinition, values: NumericVitals): VitalAlarm[] {
  const limits = alarmLimitsFor(c);
  const alarms: VitalAlarm[] = [];
  for (const vital of VITAL_KEYS) {
    const raw = values[vital];
    if (raw == null) continue;
    const value = roundVital(vital, raw);
    const level = alarmLevel(value, limits[vital]);
    if (level) alarms.push({ vital, level, value });
  }
  return alarms;
}

/**
 * Noise-free, display-rounded value of one vital at minute `t` (default: the
 * session clock); `undefined` when the case does not model that vital —
 * including every vital of a case without `physiology`, whose monitor shows
 * only a baseline-only placeholder (grounding rule 2: missing data stays
 * missing, so `vital` conditions on it are false). Used by `vital` conditions.
 */
export function vitalValue(c: CaseDefinition, s: SessionState, vital: VitalKey, t: number = s.clock): number | undefined {
  if (!c.physiology) return undefined;
  const raw = signalAt(c, s, minuteOf(s, t)).values[vital];
  return raw == null ? undefined : roundVital(vital, raw);
}

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */

function trendArrows(c: CaseDefinition, s: SessionState, t: number, now: NumericVitals): Partial<Record<VitalKey, -1 | 0 | 1>> {
  const before = signalAt(c, s, Math.max(0, t - TREND_WINDOW)).values;
  const arrows: Partial<Record<VitalKey, -1 | 0 | 1>> = {};
  for (const vital of VITAL_KEYS) {
    const a = now[vital];
    const b = before[vital];
    if (a == null || b == null) continue;
    const diff = a - b;
    const threshold = TREND_THRESHOLD[vital];
    arrows[vital] = diff >= threshold ? 1 : diff <= -threshold ? -1 : 0;
  }
  return arrows;
}

function displayVitals(c: CaseDefinition, t: number, values: NumericVitals, base: Partial<Vitals>): Vitals & { map: number } {
  const shown: NumericVitals = {};
  for (const vital of VITAL_KEYS) {
    const v = values[vital];
    if (v == null) continue;
    const [lo, hi] = PHYSIOLOGICAL_RANGES[vital];
    shown[vital] = roundVital(vital, clamp(v + noiseAt(c, vital, t), lo, hi));
  }
  const sbp = shown.sbp ?? 0;
  const dbp = shown.dbp ?? 0;
  const vitals: Vitals & { map: number } = {
    hr: shown.hr ?? 0,
    sbp,
    dbp,
    rr: shown.rr ?? 0,
    spo2: shown.spo2 ?? 0,
    temp: shown.temp ?? 0,
    map: Math.round((sbp + 2 * dbp) / 3),
  };
  for (const key of ["gcs", "glucose", "etco2", "pain"] as const) {
    if (shown[key] != null) vitals[key] = shown[key];
  }
  if (base.rhythm) vitals.rhythm = base.rhythm;
  if (base.ecg) vitals.ecg = base.ecg;
  return vitals;
}

/**
 * Bedside-monitor snapshot at `minute` (default — and for a non-finite
 * minute — the session clock; negative minutes clamp to 0).
 * Pure function of (case, state, minute) — see module docs for semantics.
 */
export function vitalsAt(c: CaseDefinition, s: SessionState, minute?: number): VitalsSnapshot {
  const t = minuteOf(s, minute);
  const { values, base } = signalAt(c, s, t);
  if (!c.physiology) {
    return { minute: t, vitals: displayVitals(c, t, values, base), alarms: [], trend: {}, baselineOnly: true };
  }
  return {
    minute: t,
    vitals: displayVitals(c, t, values, base),
    alarms: alarmsFor(c, values),
    trend: trendArrows(c, s, t, values),
  };
}
