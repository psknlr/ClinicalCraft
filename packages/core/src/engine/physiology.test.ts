import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import {
  alarmLevel,
  alarmLimitsFor,
  createSession,
  DEFAULT_ALARM_LIMITS,
  effectFraction,
  evaluate,
  parseCase,
  reduce,
  trendContribution,
  vitalsAt,
  vitalValue,
} from "./index.js";

const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const SIM = load(fixture("mini-anaphylaxis.case.json"));
const V4 = load(fixture("v4-smzl-mini.case.json"));

function withPhysiology(patch: (json: { physiology: Record<string, unknown>; id: string }) => void): CaseDefinition {
  const json = fixture("mini-anaphylaxis.case.json") as { physiology: Record<string, unknown>; id: string };
  patch(json);
  return load(json);
}

function play(c: CaseDefinition, actions: ClinicalAction[]): SessionState {
  return actions.reduce((s, a) => {
    const r = reduce(c, s, a);
    if (r.rejected) throw new Error(`${a.type}: ${r.rejected.code}`);
    return r.state;
  }, createSession(c));
}

const trend = (over: Partial<Parameters<typeof trendContribution>[0]> = {}) => ({ id: "t", vital: "sbp" as const, perMinute: -2, startMinute: 0, ...over });

describe("trendContribution", () => {
  it("accumulates linearly from startMinute and clamps to min/max", () => {
    expect(trendContribution(trend(), 10, undefined)).toBe(-20);
    expect(trendContribution(trend({ min: -50 }), 30, undefined)).toBe(-50);
    expect(trendContribution(trend({ startMinute: 5 }), 3, undefined)).toBe(0);
    expect(trendContribution(trend({ startMinute: 5 }), 8, undefined)).toBe(-6);
    expect(trendContribution(trend({ perMinute: 3, max: 10 }), 8, undefined)).toBe(10);
  });

  it("freezes at the stop minute and recovers towards zero when configured", () => {
    expect(trendContribution(trend(), 20, 4)).toBe(-8);
    expect(trendContribution(trend({ recoverPerMinute: 1 }), 6, 4)).toBe(-6);
    expect(trendContribution(trend({ recoverPerMinute: 1 }), 30, 4)).toBe(0);
    expect(trendContribution(trend({ perMinute: 2, recoverPerMinute: 0.5 }), 8, 4)).toBe(6);
    expect(trendContribution(trend(), 3, 4)).toBe(-6);
  });
});

describe("effectFraction", () => {
  const fluids = { vital: "sbp" as const, delta: 10, onsetMinutes: 0, rampMinutes: 5, durationMinutes: 20 };
  const epi = { vital: "sbp" as const, delta: 30, onsetMinutes: 1, rampMinutes: 3 };
  const instant = { vital: "hr" as const, delta: 10, onsetMinutes: 0, rampMinutes: 0, durationMinutes: 5 };

  it("is 0 before onset, ramps linearly, holds for the duration, then stops", () => {
    expect(effectFraction(fluids, 10, 9)).toBe(0);
    expect(effectFraction(fluids, 10, 12.5)).toBe(0.5);
    expect(effectFraction(fluids, 10, 15)).toBe(1);
    expect(effectFraction(fluids, 10, 35)).toBe(1);
    expect(effectFraction(fluids, 10, 35.5)).toBe(0);
    expect(effectFraction(epi, 0, 1)).toBe(0);
    expect(effectFraction(epi, 0, 2.5)).toBe(0.5);
    expect(effectFraction(epi, 0, 500)).toBe(1);
    expect(effectFraction(instant, 4, 4)).toBe(1);
    expect(effectFraction(instant, 4, 9)).toBe(1);
    expect(effectFraction(instant, 4, 9.01)).toBe(0);
  });
});

describe("vitalsAt", () => {
  it("returns the baseline (with MAP) at minute 0", () => {
    const snap = vitalsAt(SIM, play(SIM, [{ type: "start" }]));
    expect(snap).toEqual({
      minute: 0,
      vitals: { hr: 118, sbp: 100, dbp: 60, rr: 22, spo2: 95, temp: 36.9, gcs: 15, rhythm: "sinus-tachycardia", map: 73 },
      alarms: [],
      trend: { hr: 0, sbp: 0, dbp: 0, rr: 0, spo2: 0, temp: 0, gcs: 0 },
    });
  });

  it("is a pure function of (case, state, minute) and reconstructs the past", () => {
    const s = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 16 }]);
    // stridor fired at 10 (rr 30), collapse at 15 (hr 140): baseline changes apply from their minute only
    expect(vitalsAt(SIM, s, 9).vitals).toMatchObject({ rr: 22, hr: 118, sbp: 82 });
    expect(vitalsAt(SIM, s, 12).vitals).toMatchObject({ rr: 30, hr: 118, sbp: 76, dbp: 48, spo2: 89 });
    expect(vitalsAt(SIM, s).vitals).toMatchObject({ rr: 30, hr: 140, sbp: 68, dbp: 44, spo2: 87 });
    expect(vitalsAt(SIM, s, 30).vitals).toMatchObject({ sbp: 50, dbp: 35, spo2: 83 });
    expect(vitalsAt(SIM, s, 12)).toEqual(vitalsAt(SIM, s, 12));
  });

  it("shows trend arrows against minute − 5", () => {
    const s = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 16 }]);
    expect(vitalsAt(SIM, s).trend).toEqual({ hr: 1, sbp: -1, dbp: -1, rr: 0, spo2: -1, temp: 0, gcs: 0 });
  });

  it("stops a trend at `until` and recovers it at recoverPerMinute", () => {
    const s = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 4 }, { type: "intervene", interventionId: "epi" }]);
    expect(s.trendStops).toEqual({ "bp-fall": 4, "dbp-fall": 4 });
    // sbp = 100 + trend(−8 → recovering 1/min) + epi (+30, onset 1, ramp 3 from minute 4)
    expect(vitalsAt(SIM, s, 4).vitals.sbp).toBe(92);
    expect(vitalsAt(SIM, s, 6).vitals.sbp).toBe(104);
    expect(vitalsAt(SIM, s, 8).vitals.sbp).toBe(126);
    expect(vitalsAt(SIM, s, 12).vitals.sbp).toBe(130);
    expect(vitalsAt(SIM, s, 40).vitals.sbp).toBe(130);
    // dbp trend has no recovery: frozen at −4
    expect(vitalsAt(SIM, s, 40).vitals.dbp).toBe(56);
    // hr +10 instantly for 5 minutes
    expect([4, 9, 10].map((m) => vitalsAt(SIM, s, m).vitals.hr)).toEqual([128, 128, 118]);
  });

  it("applies `target` effects relative to the running value", () => {
    const s = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 6 }, { type: "intervene", interventionId: "oxygen" }]);
    expect(s.trendStops).toEqual({ desat: 6 });
    expect([6, 7, 8, 30].map((m) => vitalsAt(SIM, s, m).vitals.spo2)).toEqual([92, 95, 98, 98]);
  });

  it("ignores interventions given after the requested minute", () => {
    const s = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 10 }, { type: "intervene", interventionId: "fluids" }]);
    expect(vitalsAt(SIM, s, 9).vitals.sbp).toBe(82);
    expect(vitalsAt(SIM, s, 12).vitals.sbp).toBe(100 - 24 + 4);
  });

  it("reports alarms from the noise-free signal", () => {
    const s = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 16 }]);
    expect(vitalsAt(SIM, s, 12).alarms).toEqual([
      { vital: "sbp", level: "critical", value: 76 },
      { vital: "rr", level: "critical", value: 30 },
      { vital: "spo2", level: "warning", value: 89 },
    ]);
  });

  it("adds deterministic noise seeded by case, minute and vital", () => {
    const noisy = withPhysiology((j) => (j.physiology.noise = 1));
    const s = play(noisy, [{ type: "start" }, { type: "advance-time", minutes: 30 }]);
    const clean = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 30 }]);
    const samples = Array.from({ length: 31 }, (_, m) => vitalsAt(noisy, s, m).vitals.hr);
    expect(samples).toEqual(Array.from({ length: 31 }, (_, m) => vitalsAt(noisy, s, m).vitals.hr));
    expect(new Set(samples.slice(0, 15)).size).toBeGreaterThan(1);
    for (let m = 0; m <= 30; m++) {
      const a = vitalsAt(noisy, s, m);
      const b = vitalsAt(SIM, clean, m);
      expect(Math.abs(a.vitals.hr - b.vitals.hr)).toBeLessThanOrEqual(2);
      expect(Math.abs(a.vitals.temp - b.vitals.temp)).toBeLessThanOrEqual(0.1);
      expect(a.vitals.gcs).toBe(b.vitals.gcs);
      expect(a.alarms).toEqual(b.alarms);
      expect(a.trend).toEqual(b.trend);
    }
    const other = withPhysiology((j) => {
      j.physiology.noise = 1;
      j.id = "another-case";
    });
    const s2 = play(other, [{ type: "start" }, { type: "advance-time", minutes: 30 }]);
    const otherSamples = Array.from({ length: 31 }, (_, m) => vitalsAt(other, s2, m).vitals.hr);
    expect(otherSamples).not.toEqual(samples);
  });

  it("clamps to physiological ranges", () => {
    const crash = withPhysiology((j) => {
      (j.physiology.trends as unknown[]).push({ id: "crash", vital: "spo2", perMinute: -10 }, { id: "fever", vital: "temp", perMinute: 1 });
    });
    const s = play(crash, [{ type: "start" }, { type: "advance-time", minutes: 20 }]);
    expect(vitalsAt(crash, s).vitals).toMatchObject({ spo2: 40, temp: 43 });
  });

  it("returns a flagged normal adult placeholder for cases without physiology", () => {
    const snap = vitalsAt(V4, createSession(V4), 7);
    expect(snap).toEqual({
      minute: 7,
      vitals: { hr: 78, sbp: 122, dbp: 76, rr: 14, spo2: 98, temp: 36.8, rhythm: "sinus", map: 91 },
      alarms: [],
      trend: {},
      baselineOnly: true,
    });
  });
});

describe("alarm limits", () => {
  it("uses the documented adult defaults", () => {
    expect(DEFAULT_ALARM_LIMITS).toMatchObject({
      hr: { low: 50, high: 120, criticalLow: 40, criticalHigh: 150 },
      sbp: { low: 90, high: 180, criticalLow: 80, criticalHigh: 220 },
      rr: { low: 10, high: 24, criticalLow: 8, criticalHigh: 30 },
      spo2: { low: 92, criticalLow: 88 },
      temp: { low: 36, high: 38.3, criticalLow: 35, criticalHigh: 40 },
      gcs: { low: 13, criticalLow: 8 },
      glucose: { low: 3.9, high: 15, criticalLow: 3, criticalHigh: 25 },
    });
  });

  it("classifies warning (outside low/high) and critical (at or beyond critical limits)", () => {
    const limits = alarmLimitsFor(SIM);
    expect([92, 91, 89, 88, 70].map((v) => alarmLevel(v, limits.spo2))).toEqual([null, "warning", "warning", "critical", "critical"]);
    expect([38.3, 38.4, 39.9, 40].map((v) => alarmLevel(v, limits.temp))).toEqual([null, "warning", "warning", "critical"]);
    expect([50, 49, 41, 40, 120, 121, 150].map((v) => alarmLevel(v, limits.hr))).toEqual([null, "warning", "warning", "critical", null, "warning", "critical"]);
    expect([8, 9, 13, 15].map((v) => alarmLevel(v, limits.gcs))).toEqual(["critical", "warning", null, null]);
    expect(alarmLevel(100, undefined)).toBeNull();
  });

  it("lets a case replace a vital's limits (paediatric override)", () => {
    const paeds = withPhysiology((j) => (j.physiology.alarms = { hr: { low: 60, high: 100 } }));
    const limits = alarmLimitsFor(paeds);
    expect(limits.hr).toEqual({ low: 60, high: 100 });
    expect(alarmLevel(160, limits.hr)).toBe("warning");
    expect(limits.sbp).toEqual(DEFAULT_ALARM_LIMITS.sbp);
    const s = play(paeds, [{ type: "start" }]);
    expect(vitalsAt(paeds, s).alarms).toEqual([{ vital: "hr", level: "warning", value: 118 }]);
    const started = reduce(paeds, createSession(paeds), { type: "start" });
    expect(started.events).toContainEqual({ type: "vitals.alarm", vital: "hr", level: "warning", value: 118 });
  });
});

describe("vital conditions", () => {
  it("compare the noise-free value at the session clock", () => {
    const s = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 5 }]);
    expect(vitalValue(SIM, s, "sbp")).toBe(90);
    expect(vitalValue(SIM, s, "etco2")).toBeUndefined();
    expect(evaluate(SIM, s, { vital: "sbp", op: "lte", value: 90 })).toBe(true);
    expect(evaluate(SIM, s, { vital: "sbp", op: "lt", value: 90 })).toBe(false);
    expect(evaluate(SIM, s, { vital: "sbp", op: "eq", value: 90 })).toBe(true);
    expect(evaluate(SIM, s, { vital: "etco2", op: "gt", value: 0 })).toBe(false);
  });
});

describe("hardening: physiology edge cases", () => {
  it("never evaluates vital conditions against the baseline-only placeholder (missing data stays missing)", () => {
    const s = play(V4, [{ type: "start" }]);
    expect(vitalsAt(V4, s).baselineOnly).toBe(true);
    expect(vitalValue(V4, s, "spo2")).toBeUndefined();
    expect(evaluate(V4, s, { vital: "spo2", op: "gte", value: 98 })).toBe(false);
    expect(evaluate(V4, s, { vital: "hr", op: "gt", value: 0 })).toBe(false);
    expect(evaluate(V4, s, { not: { vital: "hr", op: "gt", value: 0 } })).toBe(true);
  });

  it("reconstructs past baselines in the order scenario events actually fired", () => {
    // b-spike (declared second) fires at minute 2 and immediately triggers a-reset (declared first) in the same minute
    const c = withPhysiology((j) => {
      j.physiology.trends = [];
      j.physiology.events = [
        { id: "a-reset", when: { vital: "hr", op: "gte", value: 150 }, setVitals: { hr: 60 } },
        { id: "b-spike", atMinute: 2, setVitals: { hr: 160 } },
      ];
    });
    const s = play(c, [{ type: "start" }, { type: "advance-time", minutes: 5 }]);
    expect(s.firedEvents).toEqual({ "b-spike": 2, "a-reset": 2 });
    expect(s.baselineOverrides.hr).toBe(60);
    expect(vitalsAt(c, s, 5).vitals.hr).toBe(60);
    expect(vitalsAt(c, s, 3).vitals.hr).toBe(60);
    expect(vitalsAt(c, s, 2).vitals.hr).toBe(60);
    expect(vitalsAt(c, s, 1).vitals.hr).toBe(118);
  });
});
