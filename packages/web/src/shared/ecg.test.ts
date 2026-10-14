import { describe, expect, it } from "vitest";
import { beatTime, drawRate, ecgValue, isPulseless, plethValue, respValue } from "./ecg.js";

const sample = (f: (t: number) => number, t0: number, t1: number, dt = 0.002) => {
  const out: number[] = [];
  for (let t = t0; t < t1; t += dt) out.push(f(t));
  return out;
};

/** Count R peaks (local maxima above a threshold). */
const peaks = (xs: number[], thr: number) => xs.filter((v, i) => i > 0 && i < xs.length - 1 && v > thr && v >= xs[i - 1] && v > xs[i + 1]).length;

describe("ECG synthesis", () => {
  it("sinus at 60 bpm has one R wave per second", () => {
    const xs = sample((t) => ecgValue(t, "sinus", "normal", 60), 9.5, 19.5);
    expect(peaks(xs, 0.7)).toBe(10);
  });
  it("rate follows HR", () => {
    expect(peaks(sample((t) => ecgValue(t, "sinus-tachycardia", "normal", 120), 0, 10), 0.7)).toBeGreaterThanOrEqual(19);
  });
  it("atrial fibrillation is irregular but keeps the mean rate", () => {
    const xs = sample((t) => ecgValue(t, "atrial-fibrillation", "normal", 120), 0, 30);
    const n = peaks(xs, 0.7);
    expect(n).toBeGreaterThan(54);
    expect(n).toBeLessThan(66);
    const intervals = [1, 2, 3, 4, 5, 6].map((k) => beatTime(k + 1, 0.5, true) - beatTime(k, 0.5, true));
    expect(Math.max(...intervals) - Math.min(...intervals)).toBeGreaterThan(0.05);
    for (const i of intervals) expect(i).toBeGreaterThan(0);
  });
  it("ST elevation raises the ST segment", () => {
    const st = (morph: string) => ecgValue(0.12, "sinus", morph, 60) - ecgValue(-0.3, "sinus", morph, 60);
    expect(st("st-elevation")).toBeGreaterThan(st("normal") + 0.15);
    expect(st("st-depression")).toBeLessThan(st("normal") - 0.05);
  });
  it("asystole is flat, VF is chaotic and pulseless", () => {
    const flat = sample((t) => ecgValue(t, "asystole", "normal", 0), 0, 5);
    expect(Math.max(...flat.map(Math.abs))).toBeLessThan(0.05);
    const vf = sample((t) => ecgValue(t, "ventricular-fibrillation", "normal", 0), 0, 5);
    expect(Math.max(...vf) - Math.min(...vf)).toBeGreaterThan(0.6);
    expect(isPulseless("ventricular-fibrillation")).toBe(true);
    expect(drawRate("asystole", 80)).toBe(0);
    expect(Math.max(...sample((t) => plethValue(t, "pea", 80), 0, 5))).toBeLessThan(0.05);
  });
  it("paced rhythm shows pacing spikes; VT is wide and large", () => {
    expect(Math.max(...sample((t) => ecgValue(t, "paced", "normal", 70), 0, 3, 0.0005))).toBeGreaterThan(1.2);
    expect(Math.max(...sample((t) => ecgValue(t, "ventricular-tachycardia", "normal", 170), 0, 3))).toBeGreaterThan(1.1);
  });
  it("low voltage scales the trace", () => {
    expect(Math.abs(ecgValue(5, "sinus", "low-voltage", 60))).toBeLessThan(0.5);
  });
});

describe("pleth and respiration", () => {
  it("pleth pulses at the heart rate", () => {
    const xs = sample((t) => plethValue(t, "sinus", 75), 10.1, 22.1);
    expect(peaks(xs, 0.6)).toBe(15);
  });
  it("capnogram plateaus during expiration; impedance resp is smooth", () => {
    expect(respValue(0.3 * (60 / 15), 15, true)).toBeGreaterThan(0.8);
    expect(respValue(0.8 * (60 / 15), 15, true)).toBeLessThan(0.05);
    expect(respValue(1, 0, false)).toBe(0);
    const r = sample((t) => respValue(t, 12, false), 0, 10, 0.01);
    expect(Math.max(...r)).toBeLessThanOrEqual(0.95);
    expect(Math.min(...r)).toBeGreaterThanOrEqual(0.049);
  });
});
