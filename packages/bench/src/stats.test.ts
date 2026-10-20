/**
 * Report statistics: Wilson score intervals against published values
 * (Newcombe 1998, "Two-sided confidence intervals for the single
 * proportion", method 3 — score interval without continuity correction)
 * and the R-7 percentile.
 */
import { describe, expect, it } from "vitest";
import { mean, percentile, proportion, round, wilsonInterval, Z_95 } from "./stats.js";

const close = (actual: [number, number] | null, expected: [number, number], digits = 4) => {
  expect(actual).not.toBeNull();
  expect(actual![0]).toBeCloseTo(expected[0], digits);
  expect(actual![1]).toBeCloseTo(expected[1], digits);
};

describe("wilsonInterval", () => {
  it("matches Newcombe (1998) method 3", () => {
    close(wilsonInterval(81, 263), [0.2553, 0.3662]);
    close(wilsonInterval(15, 148), [0.0624, 0.1605]);
    close(wilsonInterval(0, 20), [0, 0.1611]);
    close(wilsonInterval(1, 29), [0.0061, 0.1718]);
    close(wilsonInterval(29, 29), [0.883, 1]);
  });

  it("known small-sample values; the bounds are exactly 0 and 1 at the extremes", () => {
    close(wilsonInterval(5, 10), [0.2366, 0.7634]);
    close(wilsonInterval(9, 10), [0.5958, 0.9821]);
    expect(wilsonInterval(0, 10)![0]).toBe(0);
    close(wilsonInterval(0, 10), [0, 0.2775]);
    expect(wilsonInterval(10, 10)![1]).toBe(1);
    close(wilsonInterval(10, 10), [0.7225, 1]);
    // 108 / 108 runs (the reference agent over embodied-v1 × 3 seeds).
    close(wilsonInterval(108, 108), [0.9657, 1]);
  });

  it("is symmetric: [lo, hi](k, n) = [1 − hi, 1 − lo](n − k, n)", () => {
    for (const [k, n] of [[3, 17], [0, 5], [12, 40]] as const) {
      const a = wilsonInterval(k, n)!;
      const b = wilsonInterval(n - k, n)!;
      expect(a[0]).toBeCloseTo(1 - b[1], 12);
      expect(a[1]).toBeCloseTo(1 - b[0], 12);
    }
  });

  it("no trials → no interval; k outside 0..n is an error; z is the 0.975 normal quantile", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(() => wilsonInterval(3, 2)).toThrow(RangeError);
    expect(Z_95).toBeCloseTo(1.96, 2);
  });

  it("proportion: rate and interval (null rate and interval without trials)", () => {
    expect(proportion(0, 0)).toEqual({ k: 0, n: 0, rate: null, ci: null });
    const p = proportion(3, 4);
    expect(p.rate).toBe(0.75);
    expect(p.ci![0]).toBeLessThan(0.75);
    expect(p.ci![1]).toBeGreaterThan(0.75);
  });
});

describe("percentile (R-7) / mean / round", () => {
  it("interpolates between closest ranks", () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([4, 1, 3, 2], 50)).toBe(2.5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 95)).toBeCloseTo(19.05, 10);
    expect(percentile([10, 20, 30], 0)).toBe(10);
    expect(percentile([10, 20, 30], 100)).toBe(30);
  });

  it("mean of nothing is null; round to n decimals", () => {
    expect(mean([])).toBeNull();
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(round(2.34567, 2)).toBe(2.35);
    expect(round(2.5, 0)).toBe(3);
  });
});
