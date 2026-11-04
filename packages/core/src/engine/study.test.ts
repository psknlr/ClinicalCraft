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
import { operativeImagingAsked, studyCategory, studyCollectors, studyOrderBlock, studyProfile, unmetPrerequisites } from "./study.js";
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

/** The acquisition as the session records it: assigned, at the patient (the world confirmed it), acquired. */
const collect = (o: string, collector: string, extra: Record<string, unknown> = {}): ClinicalAction[] => [
  study({ op: "assign", order: o, to: collector }),
  study({ op: "progress", order: o, stage: "en-route" }),
  study({ op: "progress", order: o, stage: "at-patient" }),
  study({ op: "acquire", order: o, collector, quality: "good", ...extra }),
];

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
    const standard = play([order(), ...collect("ord-1", "or-7.circulating-nurse")]).s.studies!.accessions[0]!;
    expect(standard).toMatchObject({ id: "ecg-new-1", collector: "or-7.circulating-nurse", dueAt: standard.at + 10 });
    expect(standard.observations.find((o) => o.id === "rate")).toMatchObject({ value: 78, unit: "/min", flag: "normal" });
    expect(standard.observations.map((o) => o.id)).toEqual(expect.arrayContaining(["lead-i", "progression"]));
    const mirrored = play([order(), ...collect("ord-1", "nurse", { configuration: "mirror" })]).s.studies!.accessions[0]!;
    expect(mirrored.observations.map((o) => o.id)).toContain("morphology");
    expect(mirrored.observations.map((o) => o.id)).not.toContain("lead-i");
  });

  it("a sample keeps the state it was drawn in; a deliberate repeat is a new accession", () => {
    const first = play([order("cbc-new"), ...collect("ord-1", "nurse")]);
    const hb1 = first.s.studies!.accessions[0]!.observations[0]!.value!;
    // the same order cannot be collected twice; a deliberate repeat is a new order
    expect(play([study({ op: "acquire", order: "ord-1", collector: "nurse", quality: "good" })], first.s).rejected[0]?.code).toBe("requirements-unmet");
    const later = play([{ type: "intervene", interventionId: "bleed" }, order("cbc-new", "k2"), ...collect("ord-2", "nurse")], first.s);
    const [a1, a2] = later.s.studies!.accessions;
    expect(a1!.observations[0]!.value).toBe(hb1);
    expect(a2!.id).toBe("cbc-new-2");
    expect(a2!.observations[0]!.value!).toBeLessThan(hb1 - 2);
    expect(a2!.observations[0]!.flag).toBe("low");
  });

  it("a report only from an acquired study, not before it is due; a review needs a released report", () => {
    const acquired = play([order(), ...collect("ord-1", "nurse")]);
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
    const actions: ClinicalAction[] = [{ type: "start" }, order("cbc-new"), ...collect("ord-1", "nurse")];
    expect(replay(c, actions).state.studies).toEqual(replay(c, actions).state.studies);
  });

  it("nothing is acquired before someone has reached the patient: blocked with its reason, then resumed once", () => {
    // no collector, or one still on the way: refused, no specimen
    expect(play([order("cbc-new"), study({ op: "acquire", order: "ord-1", collector: "nurse", quality: "good" })]).rejected[0]?.message).toMatch(/nobody has reached the patient/);
    const blocked = play([order("cbc-new"), study({ op: "assign", order: "ord-1", to: "nurse" }), study({ op: "progress", order: "ord-1", stage: "en-route" }), study({ op: "wait", order: "ord-1", reason: "the nurse cannot reach the patient: the door is locked" }), study({ op: "acquire", order: "ord-1", collector: "nurse", quality: "good" })]);
    expect(blocked.rejected.map((x) => x.code)).toEqual(["requirements-unmet"]);
    expect(blocked.s.studies!.accessions).toEqual([]);
    expect(blocked.s.studies!.orders[0]).toMatchObject({ stage: "blocked", waiting: { reason: expect.stringMatching(/door is locked/) } });
    // the way open again: the same order resumes, one accession
    const resumed = play([study({ op: "progress", order: "ord-1", stage: "en-route" }), study({ op: "progress", order: "ord-1", stage: "at-patient" }), study({ op: "acquire", order: "ord-1", collector: "nurse", quality: "good" })], blocked.s);
    expect(resumed.rejected).toEqual([]);
    expect(resumed.s.studies!.accessions.map((a) => a.order)).toEqual(["ord-1"]);
    expect(resumed.s.studies!.orders[0]!.waiting).toBeUndefined();
    expect(resumed.s.studies!.orders[0]!.stages!.map((x) => x.stage)).toEqual(["ordered", "assigned", "en-route", "blocked", "en-route", "at-patient", "acquired"]);
    // someone else's collection of an assigned order is refused
    expect(play([study({ op: "progress", order: "ord-1", stage: "en-route" }), study({ op: "progress", order: "ord-1", stage: "at-patient" }), study({ op: "acquire", order: "ord-1", collector: "porter", quality: "good" })], blocked.s).rejected[0]?.code).toBe("invalid");
  });

  it("one definition for every kind of study: category, when orderable, safety restrictions, prerequisites, who acquires it", () => {
    const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
    raw.interventions = [...(raw.interventions ?? []), { id: "iv", name: L("Intravenous access"), kind: "procedure", setFlags: ["iv"] }, { id: "open", name: L("The abdomen opened"), kind: "procedure", setFlags: ["open"] }];
    raw.studies = [
      { code: "lactate", name: L("Lactate"), acquisition: "sample", prerequisites: [{ when: { flag: "iv" }, reason: L("no intravenous access yet") }], model: { kind: "lab", analytes: [{ id: "lac", name: L("Lactate"), unit: "mmol/L", low: 0.5, high: 2, base: 1.1 }] } },
      { code: "poc-glucose", name: L("Capillary glucose"), acquisition: "bedside-device", category: "bedside", collectors: ["nurse"], model: { kind: "lab", analytes: [{ id: "glu", name: L("Glucose"), unit: "mmol/L", low: 3.9, high: 7.8, base: 6 }] } },
      { code: "ct-abdomen", name: L("CT abdomen"), acquisition: "department", requires: ["ct"], orderableWhen: { flag: "iv" }, restrictions: [{ when: { flag: "open" }, reason: L("the abdomen is open: a transfer to CT is not safe") }], model: { kind: "imaging", technique: L("CT"), findings: [{ id: "f", text: L("No free fluid") }] } },
    ];
    const parsed = parseCase(raw);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
    const k = parsed.value;
    const profile = (code: string) => studyProfile(k, code)!;
    // the category: its own, else from the acquisition
    expect(["lactate", "poc-glucose", "ct-abdomen"].map((x) => studyCategory(profile(x)))).toEqual(["lab", "bedside", "imaging"]);
    // who acquires it: the profile's, else the acquisition's defaults
    expect(studyCollectors(profile("poc-glucose"))).toEqual(["nurse"]);
    expect(studyCollectors(profile("lactate"))).toContain("nurse");
    expect(studyCollectors(profile("lactate"))).not.toContain("porter");
    expect(studyCollectors(profile("ct-abdomen"))).toContain("radiographer");
    const go = (s: SessionState, a: ClinicalAction) => reduce(k, s, a);
    let s = go(createSession(k), { type: "start" }).state;
    // not orderable yet: refused as not ready, and no order exists
    const early = go(s, study({ op: "order", code: "ct-abdomen", key: "ct", requester: "learner", priority: "routine" }));
    expect(early.rejected?.code).toBe("not-ready");
    expect(studyOrderBlock(k, s, profile("ct-abdomen"))).toEqual({ kind: "not-yet" });
    s = go(s, { type: "intervene", interventionId: "iv" }).state;
    expect(studyOrderBlock(k, s, profile("ct-abdomen"))).toBeNull();
    // a safety restriction that holds: refused with its reason
    const opened = go(s, { type: "intervene", interventionId: "open" }).state;
    const unsafe = go(opened, study({ op: "order", code: "ct-abdomen", key: "ct", requester: "learner", priority: "routine" }));
    expect(unsafe.rejected).toMatchObject({ code: "requirements-unmet", message: expect.stringMatching(/the abdomen is open/) });
    expect(opened.studies?.orders ?? []).toEqual([]);
    // a prerequisite that does not hold: the order is accepted but nothing is acquired until it holds
    let t = go(createSession(k), { type: "start" }).state;
    t = go(t, study({ op: "order", code: "lactate", key: "lac", requester: "learner", priority: "routine" })).state;
    expect(unmetPrerequisites(k, t, profile("lactate")).map((u) => u.reason)).toEqual([L("no intravenous access yet")]);
    for (const a of collect("ord-1", "nurse").slice(0, 3)) t = go(t, a).state;
    const tooSoon = go(t, collect("ord-1", "nurse")[3]!);
    expect(tooSoon.rejected).toMatchObject({ code: "requirements-unmet", message: expect.stringMatching(/no intravenous access yet/) });
    t = go(t, { type: "intervene", interventionId: "iv" }).state;
    const drawn = go(t, collect("ord-1", "nurse")[3]!);
    expect(drawn.rejected).toBeUndefined();
    expect(drawn.state.studies!.accessions.map((a) => a.code)).toEqual(["lactate"]);
  });

  it("operative imaging is named by the engine, never a study of the chart", () => {
    expect(operativeImagingAsked("intraoperative cholangiogram")).toBe("ioc");
    expect(operativeImagingAsked("Please do an IOC")).toBe("ioc");
    expect(operativeImagingAsked("术中胆道造影")).toBe("ioc");
    expect(operativeImagingAsked("laparoscopic ultrasound of the CBD")).toBe("lap-us");
    expect(operativeImagingAsked("a 12-lead ECG")).toBeNull();
    expect(operativeImagingAsked("a lustrous image")).toBeNull();
    expect(operativeImagingAsked("bioconjugate")).toBeNull();
  });
});

