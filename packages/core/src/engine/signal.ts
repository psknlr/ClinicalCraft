/**
 * The physiological signal — what the patient's body is doing, before anyone
 * measures it (docs/ARCHITECTURE.md §3.2):
 *
 *   value(v, t) = clamp( base(v, t) + Σ trend(v, t) + Σ effect(v, t) + noise(v, t) )
 *
 * Everything here is a pure function of (case, state, minute). Past minutes
 * are reconstructed faithfully: interventions given after `t` contribute
 * nothing at `t`, trend stops recorded after `t` are ignored and scenario
 * `setVitals` only apply from the minute their event fired. An `absolute`
 * event's vitals drop the trends/effects that started before it fired, and
 * a cardiac-arrest rhythm overrides the sum (see `./arrest.ts`).
 *
 * The signal is engine truth: `vital` conditions read it whatever the
 * bedside shows. What is displayed, charted and alarmed — and when — is
 * decided in `./physiology.ts` (monitor attachment, revealed vitals).
 */
import type { CaseDefinition, Intervention, Physiology } from "../schema/case.js";
import { VITAL_KEYS, type VitalKey, type Vitals } from "../schema/common.js";
import type { SessionState } from "../schema/session.js";
import { applyArrest, arrestKind, type ArrestKind } from "./arrest.js";
import { createRng, seedFrom } from "./random.js";

/** Numeric vitals by key (absent = not modelled). */
export type NumericVitals = Partial<Record<VitalKey, number>>;
/** Per vital: the minute of the latest fired `absolute` event that set it (contributions starting earlier are dropped). */
type Cutoffs = Partial<Record<VitalKey, number>>;
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
export function minuteOf(s: SessionState, minute: number | undefined): number {
  return Math.max(0, minute != null && Number.isFinite(minute) ? minute : s.clock);
}

export function clamp(value: number, lo: number, hi: number): number {
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

/** The numeric entries of a (partial) vitals record. */
export function numericOf(vitals: Partial<Vitals>): NumericVitals {
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

/**
 * For each vital, the firing minute of the latest `absolute` scenario event
 * fired by `t` whose `setVitals` gives that vital a number.
 */
function absoluteCutoffs(c: CaseDefinition, s: SessionState, t: number): Cutoffs {
  const cutoffs: Cutoffs = {};
  for (const event of c.physiology?.events ?? []) {
    if (!event.absolute || !event.setVitals || !Object.prototype.hasOwnProperty.call(s.firedEvents, event.id)) continue;
    const firedAt = s.firedEvents[event.id];
    if (firedAt > t) continue;
    for (const vital of VITAL_KEYS) {
      if (typeof event.setVitals[vital] === "number") cutoffs[vital] = Math.max(cutoffs[vital] ?? -Infinity, firedAt);
    }
  }
  return cutoffs;
}

/** True when a contribution starting at `startedAt` predates the absolute reset of `vital`. */
function superseded(cutoffs: Cutoffs, vital: VitalKey, startedAt: number): boolean {
  const cutoff = cutoffs[vital];
  return cutoff != null && startedAt < cutoff;
}

function applyTrends(c: CaseDefinition, s: SessionState, t: number, values: NumericVitals, cutoffs: Cutoffs): void {
  for (const trend of c.physiology?.trends ?? []) {
    const current = values[trend.vital];
    if (current == null || superseded(cutoffs, trend.vital, trend.startMinute)) continue;
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

function applyEffects(c: CaseDefinition, s: SessionState, t: number, values: NumericVitals, cutoffs: Cutoffs): void {
  const byId = interventionIndex(c);
  for (const record of s.interventions) {
    if (record.at > t) continue;
    const intervention = byId.get(record.interventionId);
    if (!intervention) continue;
    for (const effect of intervention.effects) {
      const current = values[effect.vital];
      if (current == null || superseded(cutoffs, effect.vital, record.at + effect.onsetMinutes)) continue;
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

/** Noise-free physiological state at one minute. */
export interface Signal {
  /** Clamped, unrounded values (arrest overrides applied). */
  values: NumericVitals;
  /** Scenario baseline in force (rhythm/ECG come from here). */
  base: Partial<Vitals>;
  /** Cardiac-arrest class of the rhythm in force, null when perfusing. */
  arrest: ArrestKind | null;
}

/** Noise-free physiological values at minute `t` (clamped, unrounded) plus rhythm/ECG and arrest class. */
export function signalAt(c: CaseDefinition, s: SessionState, t: number): Signal {
  const base = baselineAt(c, s, t);
  const values = numericOf(base);
  if (!c.physiology) return { values: clampAll(values), base, arrest: null };
  const cutoffs = absoluteCutoffs(c, s, t);
  applyTrends(c, s, t, values, cutoffs);
  applyEffects(c, s, t, values, cutoffs);
  const clamped = clampAll(values);
  const arrest = arrestKind(base);
  if (arrest) applyArrest(arrest, clamped);
  return { values: clamped, base, arrest };
}

/** Deterministic monitor jitter of one vital at minute `t` (0 when the case sets no noise). */
export function noiseAt(c: CaseDefinition, vital: VitalKey, t: number): number {
  const amplitude = (NOISE_AMPLITUDE[vital] ?? 0) * (c.physiology?.noise ?? 0);
  if (amplitude === 0) return 0;
  const rng = createRng(seedFrom(c.id, roundTo(t, 3), vital));
  return (rng() * 2 - 1) * amplitude;
}

/**
 * Noise-free, display-rounded value of one vital at minute `t` (default: the
 * session clock); `undefined` when the case does not model that vital —
 * including every vital of a case without `physiology`, whose monitor shows
 * only a baseline-only placeholder (grounding rule 2: missing data stays
 * missing, so `vital` conditions on it are false). Used by `vital` conditions.
 * Engine truth: independent of what the bedside shows (an unattached monitor,
 * an unread glucose).
 */
export function vitalValue(c: CaseDefinition, s: SessionState, vital: VitalKey, t: number = s.clock): number | undefined {
  if (!c.physiology) return undefined;
  const raw = signalAt(c, s, minuteOf(s, t)).values[vital];
  return raw == null ? undefined : roundVital(vital, raw);
}
