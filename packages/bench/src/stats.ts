/**
 * Statistics of the benchmark report: Wilson score intervals for
 * proportions (success rates over runs, violation rates over accepted acts)
 * and percentiles for latencies.
 */

/** z for a two-sided 95 % interval (the 0.975 quantile of the standard normal). */
export const Z_95 = 1.959963984540054;

/** A proportion with its Wilson score interval. */
export interface Proportion {
  /** Successes (or events). */
  k: number;
  /** Trials. */
  n: number;
  /** k / n (null when n = 0). */
  rate: number | null;
  /** Wilson score interval [low, high] (null when n = 0). */
  ci: [number, number] | null;
}

/**
 * Wilson score interval for k successes in n trials:
 * centre = (p̂ + z²/2n) / (1 + z²/n),
 * half-width = z·√(p̂(1−p̂)/n + z²/4n²) / (1 + z²/n),
 * clamped to [0, 1]. n = 0 has no interval (null).
 */
export function wilsonInterval(k: number, n: number, z = Z_95): [number, number] | null {
  if (!Number.isFinite(k) || !Number.isFinite(n) || n <= 0) return null;
  if (k < 0 || k > n) throw new RangeError(`wilsonInterval: k=${k} outside 0..n=${n}`);
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  // k = 0 / k = n: the bound is exactly 0 / 1 (avoid -1e-17 from rounding).
  const low = k === 0 ? 0 : Math.max(0, centre - half);
  const high = k === n ? 1 : Math.min(1, centre + half);
  return [low, high];
}

/** A proportion with its Wilson interval. */
export function proportion(k: number, n: number): Proportion {
  return { k, n, rate: n > 0 ? k / n : null, ci: wilsonInterval(k, n) };
}

/**
 * Percentile by linear interpolation between closest ranks (the "R-7" /
 * spreadsheet definition): p in [0, 100]; null for an empty list.
 */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0]!;
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (rank - lo);
}

/** Arithmetic mean (null for an empty list). */
export function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

/** Round to `digits` decimals (for reports). */
export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
