import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import { RHYTHMS } from "../schema/common.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import {
  arrestKind,
  assess,
  checkCaseIntegrity,
  createSession,
  evaluate,
  parseCase,
  reduce,
  vitalsAt,
  vitalValue,
} from "./index.js";

type Json = { id: string; physiology: Record<string, unknown> & { baseline: Record<string, unknown>; trends: unknown[] } };

function caseWith(events: unknown[], patch: (json: Json) => void = () => {}): CaseDefinition {
  const json = JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Json;
  json.physiology.events = events;
  patch(json);
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

function play(c: CaseDefinition, actions: ClinicalAction[]): SessionState {
  return actions.reduce((s, a) => {
    const r = reduce(c, s, a);
    if (r.rejected) throw new Error(`${a.type}: ${r.rejected.code}`);
    return r.state;
  }, createSession(c));
}

const start: ClinicalAction = { type: "start" };
const advance = (minutes: number): ClinicalAction => ({ type: "advance-time", minutes });
const give = (interventionId: string): ClinicalAction => ({ type: "intervene", interventionId });
const at6 = (setVitals: Record<string, unknown>) => ({ id: "rhythm-change", atMinute: 6, setVitals, severity: "critical" });

/* Fixture reminders: baseline hr 118 sbp 100 dbp 60 rr 22 spo2 95 temp 36.9 gcs 15, noise 0;
 * trends sbp −2/min, dbp −1/min, spo2 −0.5/min (all from minute 0); `intervene` costs 2 minutes;
 * fluids sbp +10 (ramp 5, 20 min); epi sbp +30 (onset 1, ramp 3) and hr +10 (instant, 5 min). */

describe("arrestKind", () => {
  it("classifies VF/asystole, PEA and VT-with-sbp-0 as arrest; everything else perfuses", () => {
    expect(arrestKind({ rhythm: "ventricular-fibrillation" })).toBe("vf-asystole");
    expect(arrestKind({ rhythm: "asystole", hr: 30 })).toBe("vf-asystole");
    expect(arrestKind({ rhythm: "pea", sbp: 90 })).toBe("pea-pvt");
    expect(arrestKind({ rhythm: "ventricular-tachycardia", sbp: 0 })).toBe("pea-pvt");
    expect(arrestKind({ rhythm: "ventricular-tachycardia", sbp: 70 })).toBeNull();
    expect(arrestKind({ rhythm: "ventricular-tachycardia" })).toBeNull();
    expect(arrestKind({ sbp: 0 })).toBeNull();
    const perfusing = RHYTHMS.filter((r) => !["ventricular-fibrillation", "asystole", "pea", "ventricular-tachycardia"].includes(r));
    for (const rhythm of perfusing) expect(arrestKind({ rhythm, sbp: 0 })).toBeNull();
  });
});

describe("cardiac arrest rhythms (VF / asystole)", () => {
  for (const rhythm of ["ventricular-fibrillation", "asystole"] as const) {
    it(`${rhythm}: hr/sbp/dbp/map/spo2 read 0 and are unmeasurable, etco2 ≤ 10 — whatever the trends and drugs`, () => {
      const c = caseWith([at6({ rhythm })], (j) => (j.physiology.baseline.etco2 = 35));
      // fluids (+10 sbp) at 0, epi (+30 sbp, +10 hr) at 2, arrest at 6
      const s = play(c, [start, give("fluids"), give("epi"), advance(8)]);
      expect(s.clock).toBe(12);
      const snap = vitalsAt(c, s);
      expect(snap.vitals).toEqual({ hr: 0, sbp: 0, dbp: 0, map: 0, spo2: 0, rr: 22, temp: 36.9, gcs: 15, etco2: 10, rhythm });
      expect(snap.unmeasurable).toEqual(["hr", "sbp", "dbp", "spo2"]);
      // the noise-free signal used by `vital` conditions agrees
      expect(vitalValue(c, s, "hr")).toBe(0);
      expect(vitalValue(c, s, "spo2")).toBe(0);
      expect(vitalValue(c, s, "etco2")).toBe(10);
      expect(evaluate(c, s, { vital: "sbp", op: "eq", value: 0 })).toBe(true);
    });
  }

  it("applies from the minute the rhythm changes (past minutes are reconstructed)", () => {
    const c = caseWith([at6({ rhythm: "ventricular-fibrillation" })]);
    const s = play(c, [start, give("fluids"), give("epi"), advance(8)]);
    const before = vitalsAt(c, s, 5);
    expect(before.unmeasurable).toBeUndefined();
    expect(before.vitals.hr).toBe(128);
    expect(before.vitals.sbp).toBeGreaterThan(100);
    expect(vitalsAt(c, s, 6).vitals).toMatchObject({ hr: 0, sbp: 0, dbp: 0, map: 0, spo2: 0 });
  });

  it("never jitters the arrest values (noise on) and keeps etco2 at or below 10", () => {
    const c = caseWith([at6({ rhythm: "ventricular-fibrillation" })], (j) => {
      j.physiology.noise = 3;
      j.physiology.baseline.etco2 = 35;
    });
    const s = play(c, [start, give("fluids"), advance(30)]);
    for (let m = 6; m <= s.clock; m += 0.5) {
      const v = vitalsAt(c, s, m).vitals;
      expect([v.hr, v.sbp, v.dbp, v.map, v.spo2]).toEqual([0, 0, 0, 0, 0]);
      expect(v.etco2).toBeLessThanOrEqual(10);
    }
  });

  it("keeps a low etco2 as is and never invents etco2 for a case that does not monitor it", () => {
    const low = caseWith([at6({ rhythm: "asystole", etco2: 4 })]);
    expect(vitalsAt(low, play(low, [start, advance(10)])).vitals.etco2).toBe(4);
    const none = caseWith([at6({ rhythm: "asystole" })]);
    const v = vitalsAt(none, play(none, [start, advance(10)])).vitals;
    expect(v.etco2).toBeUndefined();
    expect(Object.keys(v)).not.toContain("etco2");
  });

  it("shows no trend arrows for unmeasurable vitals", () => {
    const c = caseWith([at6({ rhythm: "ventricular-fibrillation" })]);
    const s = play(c, [start, advance(10)]);
    // minute 8 vs minute 3: the signal fell to 0, but an unmeasurable value has no trend
    expect(vitalsAt(c, s, 8).trend).toMatchObject({ hr: 0, sbp: 0, dbp: 0, spo2: 0, rr: 0 });
  });

  it("raises a critical hr alarm even when the case's hr limits would not", () => {
    const c = caseWith([at6({ rhythm: "ventricular-fibrillation" })], (j) => (j.physiology.alarms = { hr: { low: 60, high: 100 } }));
    const s = play(c, [start, advance(10)]);
    const alarms = vitalsAt(c, s).alarms;
    expect(alarms).toContainEqual({ vital: "hr", level: "critical", value: 0 });
    expect(alarms).toContainEqual({ vital: "sbp", level: "critical", value: 0 });
    expect(alarms).toContainEqual({ vital: "spo2", level: "critical", value: 0 });
    const events = reduce(c, play(c, [start, advance(5)]), advance(2)).events;
    // value 0 is the arrest placeholder: the event says the monitor has no reading
    expect(events).toContainEqual({ type: "vitals.alarm", vital: "hr", level: "critical", value: 0, unmeasurable: true });
    expect(assess(c, s).safety.criticalAlarms).toBeGreaterThanOrEqual(3);
  });

  it("returns to the modelled values when a perfusing rhythm comes back (ROSC)", () => {
    const c = caseWith([at6({ rhythm: "ventricular-fibrillation" }), { id: "rosc", atMinute: 10, setVitals: { rhythm: "sinus" } }]);
    const s = play(c, [start, advance(12)]);
    const snap = vitalsAt(c, s);
    expect(snap.unmeasurable).toBeUndefined();
    // additive model again: 100 − 2×12, 60 − 12, 95 − 6
    expect(snap.vitals).toMatchObject({ hr: 118, sbp: 76, dbp: 48, spo2: 89, rhythm: "sinus" });
  });
});

describe("pulseless rhythms with an electrical rate (PEA / pulseless VT)", () => {
  it("PEA keeps the electrical hr but reads sbp/dbp/map/spo2 0 with a critical hr alarm", () => {
    const c = caseWith([at6({ rhythm: "pea", hr: 70 })], (j) => (j.physiology.baseline.etco2 = 35));
    const s = play(c, [start, give("fluids"), advance(10)]);
    const snap = vitalsAt(c, s);
    expect(snap.vitals).toMatchObject({ hr: 70, sbp: 0, dbp: 0, map: 0, spo2: 0, etco2: 10, rr: 22, rhythm: "pea" });
    expect(snap.unmeasurable).toEqual(["sbp", "dbp", "spo2"]);
    expect(snap.alarms).toContainEqual({ vital: "hr", level: "critical", value: 70 });
  });

  it("PEA hr still follows trends and effects (only the pressure and saturation are lost)", () => {
    const c = caseWith([at6({ rhythm: "pea", hr: 70 })]);
    const s = play(c, [start, advance(6), give("epi")]);
    expect(vitalsAt(c, s, 7).vitals.hr).toBe(80);
  });

  it("VT is perfusing by default: the model's values stand and alarms follow the limits", () => {
    const c = caseWith([at6({ rhythm: "ventricular-tachycardia", hr: 140 })]);
    const s = play(c, [start, advance(10)]);
    const snap = vitalsAt(c, s);
    expect(snap.unmeasurable).toBeUndefined();
    expect(snap.vitals).toMatchObject({ hr: 140, sbp: 80, dbp: 50, spo2: 90 });
    expect(snap.alarms).toContainEqual({ vital: "hr", level: "warning", value: 140 });
  });

  it("VT is pulseless when the scenario sets sbp 0: sbp/dbp/map/spo2 read 0 despite drugs", () => {
    const c = caseWith([at6({ rhythm: "ventricular-tachycardia", hr: 190, sbp: 0 })]);
    const s = play(c, [start, give("fluids"), give("epi"), advance(8)]);
    const snap = vitalsAt(c, s);
    expect(snap.vitals).toMatchObject({ hr: 190, sbp: 0, dbp: 0, map: 0, spo2: 0 });
    expect(snap.unmeasurable).toEqual(["sbp", "dbp", "spo2"]);
    expect(snap.alarms).toContainEqual({ vital: "hr", level: "critical", value: 190 });
  });
});

describe("absolute scenario events", () => {
  const reset = (absolute?: boolean) => ({ id: "reset", atMinute: 5, setVitals: { sbp: 120 }, ...(absolute == null ? {} : { absolute }) });
  const lateFall = (j: Json) => j.physiology.trends.push({ id: "late-fall", vital: "sbp", perMinute: -1, startMinute: 15 });
  // fluids at 0 (before the event) and again at 8 (after it)
  const script = [start, give("fluids"), advance(6), give("fluids"), advance(10)];

  it("replaces trend/effect contributions that started before the event for the vitals it sets", () => {
    const c = caseWith([reset(true)], lateFall);
    const s = play(c, script);
    expect(s.clock).toBe(20);
    const sbp = (m: number) => vitalsAt(c, s, m).vitals.sbp;
    expect(sbp(4)).toBe(100); // 100 − 8 (trend) + 8 (fluids ramp) — before the event nothing changes
    expect(sbp(5)).toBe(120); // from the event minute: trend and first bolus ignored
    expect(sbp(8)).toBe(120);
    expect(sbp(13)).toBe(130); // the bolus given after the event still adds
    expect(sbp(20)).toBe(125); // a trend starting after the event still applies (−1/min from 15)
    // vitals the event does not set keep their trends
    expect(vitalsAt(c, s, 13).vitals.dbp).toBe(47);
  });

  it("is additive by default (absolute omitted or false)", () => {
    for (const absolute of [undefined, false]) {
      const c = caseWith([reset(absolute)], lateFall);
      const s = play(c, script);
      // 120 − 26 (trend) + 10 (bolus at 0) + 10 (bolus at 8)
      expect(vitalsAt(c, s, 13).vitals.sbp).toBe(114);
    }
  });

  it("ignores an effect whose onset precedes the event and keeps one whose onset does not", () => {
    // epi at 3: hr +10 starts at 3 (before), sbp +30 starts at 4 (= event minute)
    const c = caseWith([{ id: "reset", atMinute: 4, absolute: true, setVitals: { sbp: 110, hr: 100 } }]);
    const s = play(c, [start, advance(3), give("epi"), advance(10)]);
    expect(s.firedEvents).toEqual({ reset: 4 });
    expect(vitalsAt(c, s, 6).vitals.hr).toBe(100);
    expect(vitalsAt(c, s, 10).vitals.sbp).toBe(140);
    expect(vitalsAt(c, s, 3).vitals.hr).toBe(128);
  });

  it("uses the latest absolute event for each vital", () => {
    const c = caseWith([
      { id: "first", atMinute: 2, absolute: true, setVitals: { sbp: 150 } },
      { id: "second", atMinute: 8, setVitals: { sbp: 90 } },
      { id: "third", atMinute: 12, absolute: true, setVitals: { sbp: 70 } },
    ]);
    const s = play(c, [start, give("fluids"), advance(16)]);
    // fluids given at 0 are ignored from minute 2; a later non-absolute baseline change stays exact
    expect(vitalsAt(c, s, 6).vitals.sbp).toBe(150);
    expect(vitalsAt(c, s, 10).vitals.sbp).toBe(90);
    expect(vitalsAt(c, s, 14).vitals.sbp).toBe(70);
  });

  it("is accepted by the schema, rejected when not a boolean, and flagged when it sets no numeric vital", () => {
    expect(() => caseWith([{ ...reset(), absolute: "yes" }])).toThrow(/absolute/);
    const c = caseWith([{ id: "rhythm-only", atMinute: 3, absolute: true, setVitals: { rhythm: "sinus" } }]);
    expect(checkCaseIntegrity(c)).toContainEqual({
      path: "physiology.events.0.absolute",
      message: 'scenario event "rhythm-only" is absolute but sets no numeric vital, so absolute has no effect',
      severity: "warning",
    });
    expect(checkCaseIntegrity(caseWith([reset(true)])).filter((i) => i.path.endsWith("absolute"))).toEqual([]);
  });
});
