import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, DomainEvent, SessionState } from "../schema/session.js";
import {
  alarmingVitals,
  alarmsAt,
  assess,
  checkCaseIntegrity,
  countCriticalAlarms,
  createSession,
  evaluate,
  monitorAttached,
  monitorAttachedAt,
  parseCase,
  reduce,
  replay,
  shownVitals,
  spotCheckVitals,
  verifyCase,
  vitalsAt,
  vitalValue,
} from "./index.js";

type Json = {
  id: string;
  interventions: Record<string, unknown>[];
  phases: Record<string, unknown>[];
  physiology: Record<string, unknown> & { baseline: Record<string, unknown>; events: unknown[] };
};

const raw = (): Json => JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Json;

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

/** The mini-anaphylaxis fixture with a "monitor" intervention and `physiology.monitor`. */
function monitored(monitor: Record<string, unknown> = { attachedWhen: { intervened: "monitor" } }, patch: (json: Json) => void = () => {}): CaseDefinition {
  const json = raw();
  json.interventions.push({
    id: "monitor",
    name: { en: "Attach the monitor", "zh-CN": "连接监护" },
    kind: "monitoring",
    risk: "none",
    maxDoses: 1,
    setFlags: ["monitored"],
  });
  json.physiology.monitor = monitor;
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

const start: ClinicalAction = { type: "start" };
const advance = (minutes: number): ClinicalAction => ({ type: "advance-time", minutes });
const give = (interventionId: string): ClinicalAction => ({ type: "intervene", interventionId });
const alarms = (events: DomainEvent[]) => events.filter((e) => e.type === "vitals.alarm");
const TRIAGE = ["hr", "sbp", "dbp", "rr", "spo2", "temp"];

/* Fixture reminders: baseline hr 118 sbp 100 dbp 60 rr 22 spo2 95 temp 36.9 gcs 15 sinus tachycardia, noise 0;
 * trends sbp −2/min, dbp −1/min, spo2 −0.5/min from minute 0; stridor (rr 30) at minute 10; `intervene` costs 2 minutes. */

describe("physiology.monitor schema", () => {
  it("is optional and strict; attachedWhen is a condition and spotChecks vital keys", () => {
    expect(() => monitored({ attachedWhen: { intervened: "monitor" }, spotChecks: ["hr", "sbp", "dbp"] })).not.toThrow();
    expect(() => monitored({ spotChecks: ["hr"] })).toThrow(/attachedWhen/);
    expect(() => monitored({ attachedWhen: { intervened: "monitor" }, attached: true })).toThrow();
    expect(() => monitored({ attachedWhen: { intervened: "monitor" }, spotChecks: ["heart-rate"] })).toThrow();
  });
});

describe("a case without physiology.monitor", () => {
  it("is monitored from minute 0 and its snapshot carries no monitor fields", () => {
    const c = load(raw());
    const s = play(c, [start]);
    expect(monitorAttachedAt(c, s)).toBe(0);
    expect(monitorAttached(c, s)).toBe(true);
    expect(s.monitorAttachedAt).toBeUndefined();
    const snap = vitalsAt(c, s);
    expect(snap).not.toHaveProperty("monitorAttached");
    expect(snap).not.toHaveProperty("spotChecks");
    expect(snap.vitals).toMatchObject({ hr: 118, sbp: 100, rhythm: "sinus-tachycardia" });
  });
});

describe("before the monitor is attached", () => {
  const c = monitored();
  const { state: s, events } = replay(c, [start, advance(16)]);

  it("shows no monitored vital and no rhythm — only nursing observations", () => {
    const snap = vitalsAt(c, s);
    expect(snap.monitorAttached).toBe(false);
    expect(snap.vitals).toEqual({ gcs: 15 });
    expect(snap.trend).toEqual({ gcs: 0 });
    expect(snap).not.toHaveProperty("spotChecks");
    expect(snap).not.toHaveProperty("unmeasurable");
    expect([...shownVitals(c, s)].sort()).toEqual(["gcs", "pain"]);
  });

  it("raises no monitor alarm, though the patient is critically hypotensive", () => {
    expect(vitalValue(c, s, "sbp")).toBe(68);
    expect(alarmsAt(c, s)).toEqual([]);
    expect(vitalsAt(c, s).alarms).toEqual([]);
    expect(alarmingVitals(c, s).size).toBe(0);
    expect(alarms(events)).toEqual([]);
  });

  it("a read glucose is shown (a test result at the bedside) but alarms only once the monitor is on", () => {
    const g = monitored(undefined, (j) => {
      j.physiology.baseline.glucose = 28;
      j.physiology.revealedBy = { glucose: ["abg"] };
    });
    const read = play(g, [start, { type: "order", investigationId: "abg" }, advance(6)]);
    const r = reduce(g, read, { type: "read", investigationId: "abg" });
    expect(vitalsAt(g, r.state).vitals.glucose).toBe(28);
    expect(vitalsAt(g, r.state).alarms).toEqual([]);
    expect(alarmingVitals(g, r.state).size).toBe(0);
    expect(alarms(r.events)).toEqual([]);
    // Attaching the monitor: it alarms on the glucose with the monitored vitals.
    const on = reduce(g, r.state, give("monitor"));
    expect(alarms(on.events)).toContainEqual({ type: "vitals.alarm", vital: "glucose", level: "critical", value: 28 });
    expect(alarmingVitals(g, on.state).has("glucose")).toBe(true);
  });

  it("still counts the patient's critical episodes for the debrief (the safety metric measures the patient, not the monitor)", () => {
    const plain = load(raw());
    const p = play(plain, [start, advance(16)]);
    expect(countCriticalAlarms(plain, p)).toBe(3); // sbp, rr (stridor), spo2
    expect(countCriticalAlarms(c, s)).toBe(3);
    expect(assess(c, s).safety.criticalAlarms).toBe(3);
  });

  it("leaves the engine untouched: vital conditions, events and trends read the patient", () => {
    expect(evaluate(c, s, { vital: "sbp", op: "lte", value: 70 })).toBe(true);
    expect(s.flags).toContain("collapsed");
    const plain = load(raw());
    const p = play(plain, [start, advance(16)]);
    for (const vital of ["hr", "sbp", "dbp", "rr", "spo2"] as const) expect(vitalValue(c, s, vital)).toBe(vitalValue(plain, p, vital));
    expect(s.firedEvents).toEqual(p.firedEvents);
  });
});

describe("spot checks", () => {
  const c = monitored({ attachedWhen: { intervened: "monitor" }, spotChecks: ["temp", "hr", "sbp", "dbp", "rr", "spo2"] }, (j) => (j.physiology.noise = 1));

  it("are static manual readings of the case baseline: no jitter, trend, alarm or rhythm", () => {
    const s = play(c, [start, advance(16)]);
    const snap = vitalsAt(c, s);
    expect(snap.monitorAttached).toBe(false);
    expect(snap.spotChecks).toEqual(TRIAGE);
    expect(snap.vitals).toEqual({ hr: 118, sbp: 100, dbp: 60, map: 73, rr: 22, spo2: 95, temp: 36.9, gcs: 15 });
    expect(snap.trend).toEqual({ gcs: 0 });
    expect(snap.alarms).toEqual([]);
    expect(spotCheckVitals(c)).toEqual(TRIAGE);
    expect(vitalsAt(c, s, 3).vitals).toEqual(snap.vitals);
  });

  it("give way to live readings once the monitor is attached", () => {
    const s = play(c, [start, advance(16), give("monitor")]);
    const snap = vitalsAt(c, s);
    expect(snap.monitorAttached).toBe(true);
    expect(snap).not.toHaveProperty("spotChecks");
    expect(snap.vitals.rhythm).toBe("sinus-tachycardia");
    expect(Math.abs((snap.vitals.sbp ?? 0) - 64)).toBeLessThanOrEqual(2);
  });

  it("keep their triage values during an arrest before the monitor (no 'unmeasurable' without a monitor)", () => {
    const arrest = monitored({ attachedWhen: { intervened: "monitor" }, spotChecks: TRIAGE }, (j) => {
      j.physiology.events = [{ id: "vf", atMinute: 6, setVitals: { rhythm: "ventricular-fibrillation" }, severity: "critical" }];
    });
    const s = play(arrest, [start, advance(8)]);
    const snap = vitalsAt(arrest, s);
    expect(snap.vitals).toMatchObject({ hr: 118, sbp: 100, spo2: 95 });
    expect(snap.vitals).not.toHaveProperty("rhythm");
    expect(snap).not.toHaveProperty("unmeasurable");
    expect(snap.alarms).toEqual([]);
  });
});

describe("attaching the monitor", () => {
  const c = monitored();

  it("latches the minute attachedWhen first holds and alarms on every abnormal vital then", () => {
    const before = play(c, [start, advance(10)]);
    const r = reduce(c, before, give("monitor"));
    expect(r.state.monitorAttachedAt).toBe(10);
    expect(r.state.clock).toBe(12);
    const raised = alarms(r.events);
    // minute 10: sbp 80 (critical), rr 30 after stridor (critical), spo2 90 (warning)
    expect(raised.slice(0, 3)).toEqual([
      { type: "vitals.alarm", vital: "sbp", level: "critical", value: 80 },
      { type: "vitals.alarm", vital: "rr", level: "critical", value: 30 },
      { type: "vitals.alarm", vital: "spo2", level: "warning", value: 90 },
    ]);
  });

  it("is time-aware: minutes before the attachment stay unmonitored", () => {
    const s = play(c, [start, advance(10), give("monitor")]);
    expect(monitorAttached(c, s, 9.5)).toBe(false);
    expect(monitorAttached(c, s, 10)).toBe(true);
    expect(vitalsAt(c, s, 9).monitorAttached).toBe(false);
    expect(vitalsAt(c, s, 9).vitals).toEqual({ gcs: 15 });
    expect(alarmsAt(c, s, 9)).toEqual([]);
    expect(vitalsAt(c, s, 10).vitals).toMatchObject({ sbp: 80, rr: 30, rhythm: "sinus-tachycardia" });
    expect(vitalsAt(c, s).vitals).toMatchObject({ hr: 118, sbp: 76, dbp: 48, map: 57, spo2: 89, temp: 36.9, gcs: 15 });
  });

  it("trend arrows look back no further than the attachment", () => {
    const s = play(c, [start, advance(10), give("monitor")]);
    expect(vitalsAt(c, s, 10).trend).toEqual({ hr: 0, sbp: 0, dbp: 0, rr: 0, spo2: 0, temp: 0, gcs: 0 });
    // minute 11: sbp 78 vs 80 at attachment (−2, below the threshold of 3) — not vs 88 at minute 6
    expect(vitalsAt(c, s, 11).trend).toMatchObject({ sbp: 0, dbp: 0 });
    const plain = load(raw());
    expect(vitalsAt(plain, play(plain, [start, advance(10), give("oxygen")]), 11).trend).toMatchObject({ sbp: -1, dbp: -1 });
  });

  it("does not change the critical-alarm count: attaching early, late or never scores the same patient the same", () => {
    // minute 16: sbp 68, rr 30, spo2 87 — all critical when the monitor goes on
    const plain = load(raw());
    const expected = countCriticalAlarms(plain, play(plain, [start, give("chlorphenamine"), advance(14)]));
    expect(expected).toBe(3);
    expect(countCriticalAlarms(c, play(c, [start, give("monitor"), advance(14)]))).toBe(expected);
    expect(countCriticalAlarms(c, play(c, [start, advance(14), give("monitor")]))).toBe(expected);
    expect(countCriticalAlarms(c, play(c, [start, give("chlorphenamine"), advance(14)]))).toBe(expected);
    // a critical rr that settled before the monitor went on still counts: the patient was critical
    const settled = monitored(undefined, (j) => {
      j.physiology.events = [
        { id: "stridor", atMinute: 2, setVitals: { rr: 34 }, severity: "warning" },
        { id: "settles", atMinute: 4, setVitals: { rr: 20 }, severity: "info" },
      ];
      j.physiology.trends = [];
    });
    const unmonitored = load({ ...raw(), physiology: settled.physiology && { ...JSON.parse(JSON.stringify(settled.physiology)), monitor: undefined } });
    expect(countCriticalAlarms(unmonitored, play(unmonitored, [start, advance(6)]))).toBe(1);
    expect(countCriticalAlarms(settled, play(settled, [start, advance(6), give("monitor")]))).toBe(1);
    expect(countCriticalAlarms(settled, play(settled, [start, give("monitor"), advance(4)]))).toBe(1);
  });

  it("stays attached when attachedWhen stops holding (latched)", () => {
    const byFlag = monitored({ attachedWhen: { flag: "monitored" } });
    const s = play(byFlag, [start, give("monitor"), { type: "flag", flag: "monitored", value: false }, advance(5)]);
    expect(s.flags).not.toContain("monitored");
    expect(s.monitorAttachedAt).toBe(0);
    expect(vitalsAt(byFlag, s).monitorAttached).toBe(true);
  });

  it("counts a condition true before start (not yet settled) as attached from minute 0, then latches it at start", () => {
    const byFlag = monitored({ attachedWhen: { flag: "monitored" } });
    const pre = play(byFlag, [{ type: "flag", flag: "monitored" }]);
    expect(pre.monitorAttachedAt).toBeUndefined();
    expect(monitorAttachedAt(byFlag, pre)).toBe(0);
    expect(play(byFlag, [{ type: "flag", flag: "monitored" }, start]).monitorAttachedAt).toBe(0);
    expect(monitorAttachedAt(byFlag, createSession(byFlag))).toBeNull();
  });

  it("by a phase: attached on entering it", () => {
    const byPhase = monitored({ attachedWhen: { phase: "observation" } });
    const s = play(byPhase, [start, give("epi"), give("oxygen")]);
    expect(s.phase).toBe("observation");
    expect(s.monitorAttachedAt).toBe(2);
  });
});

describe("a monitor without ECG leads yet (ecgWhen)", () => {
  // A pulse oximeter and cuff go on with "monitor"; the ECG leads come with the team ("call-team").
  const c = monitored({ attachedWhen: { intervened: "monitor" }, ecgWhen: { intervened: "call-team" } }, (j) => {
    j.interventions.push({ id: "call-team", name: { en: "Call the team", "zh-CN": "呼叫抢救小组" }, kind: "consult", risk: "none", maxDoses: 1 });
  });

  it("shows the measured vitals live and alarms on them, but no rhythm or ECG", () => {
    const { state: s, events } = replay(c, [start, advance(10), give("monitor")]);
    const snap = vitalsAt(c, s);
    expect(snap.monitorAttached).toBe(true);
    expect(snap.ecgAttached).toBe(false);
    expect(snap.vitals).toMatchObject({ hr: 118, sbp: 76, spo2: 89, temp: 36.9 });
    expect(snap.vitals).not.toHaveProperty("rhythm");
    expect(snap.vitals).not.toHaveProperty("ecg");
    expect(alarms(events).map((e) => (e as { vital: string }).vital)).toEqual(expect.arrayContaining(["sbp", "rr", "spo2"]));
  });

  it("shows the rhythm and ECG once the leads are on", () => {
    const s = play(c, [start, give("monitor"), give("call-team")]);
    const snap = vitalsAt(c, s);
    expect(snap.ecgAttached).toBe(true);
    expect(snap.vitals).toMatchObject({ rhythm: "sinus-tachycardia" });
    // the leads alone attach nothing: no monitor, no rhythm
    const leadsOnly = vitalsAt(c, play(c, [start, give("call-team")]));
    expect(leadsOnly.monitorAttached).toBe(false);
    expect(leadsOnly.vitals).not.toHaveProperty("rhythm");
  });

  it("is not reported for a case whose monitor has no ecgWhen (the rhythm comes with the monitor)", () => {
    const plain = monitored();
    expect(vitalsAt(plain, play(plain, [start, give("monitor")]))).not.toHaveProperty("ecgAttached");
  });

  it("is checked like any condition", () => {
    const bad = monitored({ attachedWhen: { intervened: "monitor" }, ecgWhen: { intervened: "no-such-step" } });
    expect(checkCaseIntegrity(bad).some((i) => i.severity === "error" && i.path.startsWith("physiology.monitor.ecgWhen"))).toBe(true);
  });
});

describe("a monitor that measures only some vitals (measures)", () => {
  // e.g. a monitor-defibrillator in the garden: no temperature probe
  const c = monitored({ attachedWhen: { intervened: "monitor" }, measures: ["hr", "sbp", "dbp", "rr", "spo2"] }, (j) => {
    j.physiology.baseline.temp = 40.5; // critical, but nothing measures it
  });

  it("shows, trends and alarms only what it measures once attached", () => {
    const { state: s, events } = replay(c, [start, advance(10), give("monitor"), advance(4)]);
    const snap = vitalsAt(c, s);
    expect(Object.keys(snap.vitals).sort()).toEqual(["dbp", "gcs", "hr", "map", "rhythm", "rr", "sbp", "spo2"]);
    expect(snap.trend).not.toHaveProperty("temp");
    expect([...shownVitals(c, s)]).not.toContain("temp");
    expect(alarms(events).map((e) => (e as { vital: string }).vital)).not.toContain("temp");
    expect(vitalValue(c, s, "temp")).toBe(40.5); // the engine still has it
  });

  it("counts no critical episode of a vital nobody measures", () => {
    const plain = monitored(undefined, (j) => (j.physiology.baseline.temp = 40.5));
    const s = [start, give("chlorphenamine"), advance(14)] as ClinicalAction[];
    expect(countCriticalAlarms(plain, play(plain, s)) - countCriticalAlarms(c, play(c, s))).toBe(1);
  });

  it("must list monitored vitals (errors), once, with the blood pressure as a pair (warnings)", () => {
    const issues = checkCaseIntegrity(monitored({ attachedWhen: { intervened: "monitor" }, measures: ["hr", "gcs", "sbp", "hr"] })).filter((i) => i.path.startsWith("physiology.monitor.measures"));
    expect(issues.map((i) => [i.path, i.severity])).toEqual([
      ["physiology.monitor.measures.1", "error"],
      ["physiology.monitor.measures.3", "warning"],
      ["physiology.monitor.measures", "warning"],
    ]);
  });
});

describe("cardiac arrest and the monitor", () => {
  const c = monitored({ attachedWhen: { intervened: "monitor" } }, (j) => {
    j.physiology.events = [{ id: "vf", atMinute: 6, setVitals: { rhythm: "ventricular-fibrillation", rr: 0 }, severity: "critical" }];
  });

  it("before attachment: no readings, no rhythm, no alarm — the engine still sees the arrest", () => {
    const { state: s, events } = replay(c, [start, advance(8)]);
    const snap = vitalsAt(c, s);
    expect(snap.vitals).toEqual({ gcs: 15 });
    expect(snap).not.toHaveProperty("unmeasurable");
    expect(alarms(events)).toEqual([]);
    expect(evaluate(c, s, { vital: "hr", op: "eq", value: 0 })).toBe(true);
  });

  it("after attachment: the arrest readings, unmeasurable vitals and the critical hr alarm", () => {
    const before = play(c, [start, advance(8)]);
    const r = reduce(c, before, give("monitor"));
    const snap = vitalsAt(c, r.state);
    expect(snap.vitals).toMatchObject({ hr: 0, sbp: 0, dbp: 0, map: 0, spo2: 0, rr: 0, rhythm: "ventricular-fibrillation" });
    expect(snap.unmeasurable).toEqual(["hr", "sbp", "dbp", "spo2"]);
    expect(alarms(r.events)[0]).toMatchObject({ vital: "hr", level: "critical", value: 0 });
    // The alarm events say which values are arrest placeholders (no reading), so no front-end prints "SBP 0 mmHg".
    const raised = alarms(r.events) as Extract<DomainEvent, { type: "vitals.alarm" }>[];
    expect(raised.filter((a) => a.unmeasurable).map((a) => a.vital)).toEqual(["hr", "sbp", "spo2"]);
    expect(raised.find((a) => a.vital === "rr")).not.toHaveProperty("unmeasurable");
  });
});

describe("integrity and verification", () => {
  const issues = (c: CaseDefinition) => checkCaseIntegrity(c).filter((i) => i.path.startsWith("physiology.monitor"));

  it("checks attachedWhen like any condition", () => {
    expect(issues(monitored({ attachedWhen: { intervened: "nope" } }))).toEqual([
      { path: "physiology.monitor.attachedWhen.intervened", message: 'unknown intervention "nope"', severity: "error" },
    ]);
    expect(issues(monitored())).toEqual([]);
  });

  it("warns when the monitor can never be attached", () => {
    const c = monitored({ attachedWhen: { phase: "never" } }, (j) => j.phases.push({ id: "never", label: { en: "Never", "zh-CN": "从不" }, learnerSwitchable: false, enterWhen: { always: false } }));
    expect(issues(c).map((i) => [i.severity, i.message])).toEqual([["warning", expect.stringMatching(/can never be attached/)]]);
  });

  it("allows only monitored vitals the baseline models as spot checks", () => {
    const found = issues(monitored({ attachedWhen: { intervened: "monitor" }, spotChecks: ["hr", "gcs", "glucose", "etco2", "hr", "sbp"] }));
    expect(found.map((i) => [i.path, i.severity])).toEqual([
      ["physiology.monitor.spotChecks.1", "error"],
      ["physiology.monitor.spotChecks.2", "error"],
      ["physiology.monitor.spotChecks.3", "error"],
      ["physiology.monitor.spotChecks.4", "warning"],
      ["physiology.monitor.spotChecks", "warning"],
    ]);
    expect(found[0]!.message).toMatch(/nursing observation/);
    expect(found[1]!.message).toMatch(/revealedBy/);
    expect(found[2]!.message).toMatch(/not part of the physiology baseline/);
    expect(found[4]!.message).toMatch(/sbp\/dbp/);
    expect(spotCheckVitals(monitored({ attachedWhen: { intervened: "monitor" }, spotChecks: ["gcs", "etco2", "spo2"] }))).toEqual(["spo2"]);
  });

  it("verifyCase warns when the reference solution never attaches the monitor", () => {
    const result = verifyCase(monitored());
    expect(result.ok).toBe(true);
    expect(result.issues).toContainEqual({ path: "physiology.monitor.attachedWhen", message: "the reference solution never attaches the bedside monitor", severity: "warning" });
    const json = raw();
    expect(verifyCase(load(json)).issues.filter((i) => i.path.startsWith("physiology.monitor"))).toEqual([]);
  });

  it("verifyCase warns when the reference solution attaches the monitor but never its ECG leads", () => {
    // the fixture's solution gives oxygen; "monitor" on it, leads that never come
    const leads = monitored({ attachedWhen: { intervened: "oxygen" }, ecgWhen: { intervened: "monitor" } });
    expect(verifyCase(leads).issues).toContainEqual({ path: "physiology.monitor.ecgWhen", message: "the reference solution never puts the ECG leads on (no rhythm on the monitor)", severity: "warning" });
    const both = monitored({ attachedWhen: { intervened: "oxygen" }, ecgWhen: { intervened: "oxygen" } });
    expect(verifyCase(both).issues.filter((i) => i.path.startsWith("physiology.monitor"))).toEqual([]);
  });
});
