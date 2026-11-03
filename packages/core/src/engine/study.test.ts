/**
 * New investigations (docs/STUDIES.md): an order is idempotent by its key; an acquisition captures the patient's
 * state and computes the observations once (a sample before a bleed keeps its values; a deliberate repeat gets a new
 * accession); a report is released only from an acquired study and not before it is due; an ECG shows what its lead
 * placement shows; the record replays to the same numbers.
 */
import { describe, expect, it } from "vitest";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import type { StudyOp } from "../schema/study.js";
import { evaluate } from "./conditions.js";
import { checkCaseIntegrity } from "./integrity.js";
import { parseCase } from "./parse.js";
import { createSession, reduce, replay } from "./reducer.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";

const L = (en: string) => ({ en, "zh-CN": en });

function studyCase() {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.clock = { mode: "simulated", startTime: "08:00", actionCosts: { ask: 1, examine: 1, order: 1, read: 1, intervene: 0, answer: 0 } };
  raw.physiology = { baseline: { hr: 78, sbp: 128, dbp: 78, rr: 16, spo2: 96, temp: 36.6 }, noise: 0, events: [], trends: [] };
  raw.interventions = [...(raw.interventions ?? []), { id: "bleed", name: L("A simulated bleed"), kind: "procedure", setFlags: ["bled"] }];
  raw.studies = [
    {
      code: "ecg-new",
      name: L("12-lead ECG"),
      aliases: { en: ["ecg", "electrocardiogram"], "zh-CN": ["心电图"] },
      acquisition: "bedside-device",
      requires: ["ecg-12lead"],
      turnaroundMinutes: 10,
      reviewer: "anaesthetist",
      model: { kind: "ecg", rhythm: L("sinus rhythm"), prMs: [140, 180], qrsMs: [80, 100], qtcMs: [400, 430], dextrocardia: true },
    },
    {
      code: "cbc-new",
      name: L("Blood count"),
      acquisition: "sample",
      turnaroundMinutes: 30,
      model: { kind: "lab", analytes: [{ id: "hb", name: L("Haemoglobin"), unit: "g/dL", low: 13, high: 17, base: 14, spread: 0.3, decimals: 1, effects: [{ when: { flag: "bled" }, delta: -3 }] }] },
    },
  ];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

const c = studyCase();
const study = (op: StudyOp): ClinicalAction => ({ type: "study", study: op, by: "system" });
const order = (code = "ecg-new", key = "k1"): ClinicalAction => study({ op: "order", code, key, requester: "learner", priority: "routine" });

function play(actions: ClinicalAction[], from?: SessionState) {
  let s = from ?? reduce(c, createSession(c), { type: "start" }).state;
  const rejected: { code: string; message: string }[] = [];
  for (const a of actions) {
    const r = reduce(c, s, a);
    if (r.rejected) rejected.push(r.rejected);
    s = r.state;
  }
  return { s, rejected };
}

describe("new investigations", () => {
  it("a case with test profiles passes the integrity checks", () => {
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("an order: unknown codes refused; the same key is the same order (a retry returns it, nothing new)", () => {
    expect(play([order("nope")]).rejected[0]?.code).toBe("unknown-id");
    const r = play([order(), order()]);
    expect(r.rejected).toEqual([]);
    expect(r.s.studies!.orders).toHaveLength(1);
    expect(r.s.studies!.orders[0]).toMatchObject({ id: "ord-1", code: "ecg-new", reviewer: "anaesthetist" });
    expect(play([order(), order("ecg-new", "k2")]).s.studies!.orders.map((o) => o.id)).toEqual(["ord-1", "ord-2"]);
  });

  it("an ECG shows what its lead placement shows; its rate is the patient's at acquisition", () => {
    const standard = play([order(), study({ op: "acquire", order: "ord-1", collector: "or-7.circulating-nurse", quality: "good" })]).s.studies!.accessions[0]!;
    expect(standard).toMatchObject({ id: "ecg-new-1", collector: "or-7.circulating-nurse", dueAt: standard.at + 10 });
    expect(standard.observations.find((o) => o.id === "rate")).toMatchObject({ value: 78, unit: "/min", flag: "normal" });
    expect(standard.observations.map((o) => o.id)).toEqual(expect.arrayContaining(["lead-i", "progression"]));
    const mirrored = play([order(), study({ op: "acquire", order: "ord-1", collector: "nurse", configuration: "mirror", quality: "good" })]).s.studies!.accessions[0]!;
    expect(mirrored.observations.map((o) => o.id)).toContain("morphology");
    expect(mirrored.observations.map((o) => o.id)).not.toContain("lead-i");
  });

  it("a sample keeps the state it was drawn in; a deliberate repeat is a new accession", () => {
    const first = play([order("cbc-new"), study({ op: "acquire", order: "ord-1", collector: "nurse", quality: "good" })]);
    const hb1 = first.s.studies!.accessions[0]!.observations[0]!.value!;
    const later = play([{ type: "intervene", interventionId: "bleed" }, study({ op: "acquire", order: "ord-1", collector: "nurse", quality: "good" })], first.s);
    const [a1, a2] = later.s.studies!.accessions;
    expect(a1!.observations[0]!.value).toBe(hb1);
    expect(a2!.id).toBe("cbc-new-2");
    expect(a2!.observations[0]!.value!).toBeLessThan(hb1 - 2);
    expect(a2!.observations[0]!.flag).toBe("low");
  });

  it("a report only from an acquired study, not before it is due; a review needs a released report", () => {
    const acquired = play([order(), study({ op: "acquire", order: "ord-1", collector: "nurse", quality: "good" })]);
    const text = { findings: L("Sinus rhythm, rate 78/min."), impression: L("Dextrocardia pattern."), generator: "template" };
    expect(play([study({ op: "release", accession: "nope", ...text })], acquired.s).rejected[0]?.code).toBe("requirements-unmet");
    expect(play([study({ op: "release", accession: "ecg-new-1", ...text })], acquired.s).rejected[0]?.code).toBe("not-ready");
    expect(play([study({ op: "review", accession: "ecg-new-1", by: "or-7.anaesthetist" })], acquired.s).rejected[0]?.code).toBe("requirements-unmet");
    const due = play([{ type: "advance-time", minutes: 10 }, study({ op: "release", accession: "ecg-new-1", ...text }), study({ op: "review", accession: "ecg-new-1", by: "or-7.anaesthetist" })], acquired.s);
    expect(due.rejected).toEqual([]);
    expect(due.s.studies!.reports).toMatchObject([{ accession: "ecg-new-1", revision: 1, generator: "template" }]);
    expect(evaluate(c, due.s, { study: "ecg-new", status: "reviewed" })).toBe(true);
    expect(evaluate(c, acquired.s, { study: "ecg-new", status: "released" })).toBe(false);
  });

  it("the record replays to the same numbers", () => {
    const actions: ClinicalAction[] = [{ type: "start" }, order("cbc-new"), study({ op: "acquire", order: "ord-1", collector: "nurse", quality: "good" })];
    expect(replay(c, actions).state.studies).toEqual(replay(c, actions).state.studies);
  });
});
