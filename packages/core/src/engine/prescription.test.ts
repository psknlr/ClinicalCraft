/**
 * Prescriptions as versioned, executable records (docs/PRESCRIPTIONS.md): versions and what supersedes what, the
 * dispensary's review computed from stock, units, doses and the case's rules, a supply only of the current confirmed
 * version, every refused attempt and every discrepancy on the record, and requests that are idempotent by key.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { PrescriptionOp } from "../schema/prescription.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import {
  caseCapabilityGaps,
  checkCaseIntegrity,
  createSession,
  currentVersion,
  evaluate,
  parseCase,
  parseCatalog,
  parseFacility,
  preparationDiscrepancies,
  prescriptionDef,
  prescriptionStatus,
  reduce,
  replay,
  reviewFindings,
  stockOnHand,
  unreadVersion,
  verifyCase,
  versionStatus,
} from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const fixture = (name: string): Json => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));
const L = (en: string, zh: string) => ({ en, "zh-CN": zh });

/**
 * The mini anaphylaxis case with a discharge prescription: an antihistamine course whose first choice is out of
 * stock, a look-alike on the shelf, a dose written in the wrong unit, and a rule that asks for the allergy history.
 */
function rxJson(edit?: (rx: Json, json: Json) => void): Json {
  const json = fixture("mini-anaphylaxis.case.json");
  const rx: Json = {
    id: "discharge",
    name: L("Discharge prescription", "出院处方"),
    requires: ["medications"],
    products: [
      { id: "cetirizine", name: L("Cetirizine 10 mg tablets", "西替利嗪片 10 mg"), unit: "tablet", usualDose: [1, 1], stock: { quantity: 0, note: L("Expected on Thursday; loratadine is in stock.", "预计周四到货；氯雷他定有货。") }, confusedWith: ["cetrimide"] },
      { id: "loratadine", name: L("Loratadine 10 mg tablets", "氯雷他定片 10 mg"), unit: "tablet", usualDose: [1, 1], stock: { quantity: 30, batch: "L2406" } },
      { id: "cetrimide", name: L("Cetrimide cream", "西曲溴铵乳膏"), unit: "tube", stock: { quantity: 4 } },
      { id: "prednisolone", name: L("Prednisolone 5 mg tablets", "泼尼松龙片 5 mg"), unit: "tablet", usualDose: [1, 12], stock: { quantity: 100, batch: "P77" } },
    ],
    formulations: [
      { id: "cetirizine-course", name: L("Cetirizine for 5 days", "西替利嗪 5 天"), form: "proprietary", frequency: L("1 tablet once daily", "每日一次，每次1片"), dosesPerDay: 1, days: 5, lines: [{ product: "cetirizine", dose: 1, unit: "tablet" }] },
      {
        id: "loratadine-course",
        name: L("Loratadine and prednisolone for 3 days", "氯雷他定加泼尼松龙 3 天"),
        form: "proprietary",
        frequency: L("once daily in the morning", "每日早晨一次"),
        dosesPerDay: 1,
        days: 3,
        lines: [{ product: "loratadine", dose: 1, unit: "tablet" }, { product: "prednisolone", dose: 8, unit: "tablet" }],
        signableWhen: { asked: "allergies" },
        refusal: L("Not signed: the allergy history is not on the prescription yet.", "不能签发：处方尚未记录过敏史。"),
      },
      { id: "wrong-unit", name: L("Prednisolone in milligrams", "以毫克开具的泼尼松龙"), form: "proprietary", frequency: L("once daily", "每日一次"), dosesPerDay: 1, days: 3, lines: [{ product: "prednisolone", dose: 40, unit: "mg" }, { product: "prednisolone", dose: 8, unit: "tablet" }] },
      { id: "overdose", name: L("Prednisolone, too much", "过量泼尼松龙"), form: "proprietary", frequency: L("once daily", "每日一次"), dosesPerDay: 1, days: 3, lines: [{ product: "prednisolone", dose: 40, unit: "tablet" }] },
    ],
    review: [{ id: "regular-medicines", kind: "history", when: { not: { asked: "meds" } }, text: L("The regular medicines are not recorded: please confirm them with the patient.", "未记录长期用药：请向患者确认。") }],
  };
  json.prescriptions = [rx];
  edit?.(rx, json);
  return json;
}

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const CASE = load(rxJson());
const rx = (op: Record<string, unknown>, by: "learner" | "system" = "learner"): ClinicalAction => ({ type: "prescription", prescription: { prescription: "discharge", ...op } as PrescriptionOp, by });
const sign = (formulation: string, key = formulation) => rx({ op: "submit", formulation, key, by: "learner" });
const review = (version: number) => rx({ op: "review", version, by: "pharmacist" }, "system");
const dispense = (key: string, version?: number) => rx({ op: "dispense", key, by: "pharmacist", ...(version != null ? { version } : {}) }, "system");

function run(actions: ClinicalAction[], c: CaseDefinition = CASE): SessionState {
  const r = replay(c, [{ type: "start" }, ...actions]);
  expect(r.rejections).toEqual([]);
  return r.state;
}

const READY: ClinicalAction[] = [{ type: "ask", itemId: "allergies" }, { type: "ask", itemId: "meds" }];
const status = (s: SessionState) => prescriptionStatus(s, "discharge");

describe("a prescription's versions", () => {
  it("the fixture is sound", () => {
    expect(checkCaseIntegrity(CASE).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("signing makes version 1; a revision supersedes it", () => {
    let s = run([...READY, sign("cetirizine-course")]);
    expect(status(s)).toBe("submitted");
    expect(currentVersion(s, "discharge")).toMatchObject({ n: 1, formulation: "cetirizine-course" });
    s = run([...READY, sign("cetirizine-course"), sign("loratadine-course")]);
    expect(s.prescriptions!.versions.map((v) => [v.n, v.formulation, v.supersededBy])).toEqual([[1, "cetirizine-course", 2], [2, "loratadine-course", undefined]]);
    expect(versionStatus(s, s.prescriptions!.versions[0]!)).toBe("superseded");
    expect(currentVersion(s, "discharge")!.n).toBe(2);
  });

  it("the same request key is the same version: nothing new, no event", () => {
    const s = run([...READY, sign("cetirizine-course", "k1")]);
    const again = reduce(CASE, s, sign("cetirizine-course", "k1"));
    expect(again.state).toBe(s);
    expect(again.rejected).toBeUndefined();
    expect(again.events).toEqual([]);
  });

  it("a formulation that may not be signed yet is refused and recorded; nothing is signed", () => {
    const s = run([sign("loratadine-course")]);
    expect(s.prescriptions!.versions).toEqual([]);
    expect(s.prescriptions!.refusals).toMatchObject([{ op: "submit", formulation: "loratadine-course", code: "not-signable", by: "learner" }]);
    expect(s.prescriptions!.refusals[0]!.reason).toContain("allergy history");
    expect(status(s)).toBe("none");
    expect(evaluate(CASE, s, { prescription: { id: "discharge", refused: "submit" } })).toBe(true);
    expect(evaluate(CASE, s, { prescription: { id: "discharge" } })).toBe(false);
  });

  it("the event says what was recorded", () => {
    const s = run([]);
    const refused = reduce(CASE, s, sign("loratadine-course"));
    expect(refused.events.find((e) => e.type === "prescription.recorded")).toMatchObject({ op: "submit", prescription: "discharge", refused: { code: "not-signable" } });
    const signed = reduce(CASE, run(READY), sign("loratadine-course"));
    expect(signed.events.find((e) => e.type === "prescription.recorded")).toEqual({ type: "prescription.recorded", op: "submit", prescription: "discharge", version: 1 });
  });

  it("an unknown prescription or formulation is a rejected request, not a recorded refusal", () => {
    const s = run([]);
    expect(reduce(CASE, s, { type: "prescription", prescription: { op: "submit", prescription: "nope", formulation: "x", key: "k", by: "learner" } }).rejected?.code).toBe("unknown-id");
    expect(reduce(CASE, s, sign("nope")).rejected?.code).toBe("unknown-id");
    expect(reduce(CASE, s, review(1)).rejected?.code).toBe("unknown-id");
  });
});

describe("the dispensary's review", () => {
  it("finds what the data shows: stock short of the supply, with what the dispensary says about it", () => {
    const s = run([...READY, sign("cetirizine-course"), review(1)]);
    const findings = s.prescriptions!.versions[0]!.reviews[0]!.findings;
    expect(findings).toMatchObject([{ kind: "stock", product: "cetirizine" }]);
    expect(findings[0]!.text.en).toContain("0 tablet on hand, 5 tablet needed");
    expect(findings[0]!.text.en).toContain("loratadine is in stock");
    expect(findings[0]!.text["zh-CN"]).toContain("氯雷他定有货");
    expect(status(s)).toBe("queried");
  });

  it("applies the case's rules as they hold at review", () => {
    const early = run([{ type: "ask", itemId: "allergies" }, sign("loratadine-course"), review(1)]);
    expect(early.prescriptions!.versions[0]!.reviews[0]!.findings).toMatchObject([{ kind: "history", rule: "regular-medicines" }]);
    const ready = run([...READY, sign("loratadine-course"), review(1)]);
    expect(ready.prescriptions!.versions[0]!.reviews[0]!.findings).toEqual([]);
    expect(status(ready)).toBe("confirmed");
  });

  it("a rule can be kept to a dose of its product, or to named formulations", () => {
    const c = load(
      rxJson((p) => {
        p.review = [
          { id: "high-steroid", kind: "interaction", products: ["prednisolone"], minDose: 20, text: L("High-dose steroid: confirm.", "大剂量激素：请确认。") },
          { id: "only-cetirizine", kind: "other", formulations: ["cetirizine-course"], text: L("Why cetirizine?", "为何选西替利嗪？") },
        ];
      }),
    );
    const def = prescriptionDef(c, "discharge")!;
    const s = run(READY, c);
    const found = (id: string) => reviewFindings(c, s, def, def.formulations.find((f) => f.id === id)!).map((f) => f.rule ?? f.kind);
    const dose = (id: string) => def.formulations.find((f) => f.id === id)!.lines.find((l) => l.product === "prednisolone")?.dose;
    for (const f of def.formulations) {
      const d = dose(f.id);
      expect(found(f.id).includes("high-steroid"), f.id).toBe(d != null && d >= 20);
      expect(found(f.id).includes("only-cetirizine"), f.id).toBe(f.id === "cetirizine-course");
    }
    // the fixture has a formulation on each side of the threshold
    expect(def.formulations.some((f) => (dose(f.id) ?? 0) >= 20)).toBe(true);
    expect(def.formulations.some((f) => dose(f.id) != null && dose(f.id)! < 20)).toBe(true);
    const bad = rxJson((p) => (p.review = [{ id: "r", kind: "other", minDose: 2, formulations: ["nope"], text: L("x", "x") }]));
    const messages = checkCaseIntegrity(load(bad)).map((i) => i.message);
    expect(messages.some((m) => m.includes('unknown formulation "nope"'))).toBe(true);
    expect(messages.some((m) => m.includes("minDose but names no products"))).toBe(true);
  });

  it("a query the prescriber resolves is confirmed by a second review of the same version", () => {
    let s = run([{ type: "ask", itemId: "allergies" }, sign("loratadine-course"), review(1)]);
    expect(status(s)).toBe("queried");
    // unchanged while nothing has changed
    expect(reduce(CASE, s, review(1)).state).toBe(s);
    s = reduce(CASE, s, { type: "ask", itemId: "meds" }).state;
    s = reduce(CASE, s, review(1)).state;
    expect(s.prescriptions!.versions[0]!.reviews.map((r) => r.findings.length)).toEqual([1, 0]);
    expect(status(s)).toBe("confirmed");
    // the query stays on the record
    expect(evaluate(CASE, s, { prescription: { id: "discharge", queried: true } })).toBe(true);
  });

  it("catches a unit error and a dose outside the usual range at item level, and a product named twice", () => {
    const def = prescriptionDef(CASE, "discharge")!;
    const s = run(READY);
    const unit = reviewFindings(CASE, s, def, def.formulations.find((f) => f.id === "wrong-unit")!);
    expect(unit.map((f) => f.kind)).toEqual(["unit", "duplicate"]);
    expect(unit[0]!.text.en).toContain("prescribed in mg; it is dispensed in tablet");
    const dose = reviewFindings(CASE, s, def, def.formulations.find((f) => f.id === "overdose")!);
    expect(dose.map((f) => f.kind)).toEqual(["dose", "stock"]);
    expect(dose[0]!.text.en).toContain("40 tablet a day is outside the usual 1–12 tablet a day");
  });

  it("an expired batch is no stock", () => {
    const c = load(rxJson((p) => (p.products.find((x: Json) => x.id === "loratadine").stock.expired = true)));
    const s = run([...READY, sign("loratadine-course"), review(1)], c);
    expect(s.prescriptions!.versions[0]!.reviews[0]!.findings).toMatchObject([{ kind: "stock", product: "loratadine" }]);
    expect(s.prescriptions!.versions[0]!.reviews[0]!.findings[0]!.text.en).toContain("expired");
  });

  it("the review is read by the prescriber; reading it again changes nothing", () => {
    let s = run([...READY, sign("cetirizine-course")]);
    expect(reduce(CASE, s, rx({ op: "acknowledge", version: 1, by: "learner" })).rejected?.code).toBe("requirements-unmet");
    s = reduce(CASE, s, review(1)).state;
    expect(evaluate(CASE, s, { prescription: { id: "discharge", queried: true, acknowledged: true } })).toBe(false);
    s = reduce(CASE, s, rx({ op: "acknowledge", version: 1, by: "learner" })).state;
    expect(evaluate(CASE, s, { prescription: { id: "discharge", queried: true, acknowledged: true } })).toBe(true);
    expect(reduce(CASE, s, rx({ op: "acknowledge", version: 1, by: "learner" })).state).toBe(s);
  });

  it("a superseded version is not reviewed", () => {
    const s = run([...READY, sign("cetirizine-course"), sign("loratadine-course")]);
    expect(reduce(CASE, s, review(1)).rejected?.code).toBe("invalid");
  });
});

describe("the supply", () => {
  const CONFIRMED: ClinicalAction[] = [...READY, sign("cetirizine-course"), review(1), sign("loratadine-course"), review(2)];

  it("only the current version, confirmed, is supplied — the dispensary's whole act", () => {
    const s = run([...CONFIRMED, dispense("d1")]);
    expect(status(s)).toBe("dispensed");
    const d = s.prescriptions!.dispensings[0]!;
    expect(d).toMatchObject({ version: 2, by: "pharmacist", labelChecked: true, discrepancies: [] });
    expect(d.lines).toEqual([
      { line: "loratadine", product: "loratadine", batch: "L2406", quantity: 3, unit: "tablet" },
      { line: "prednisolone", product: "prednisolone", batch: "P77", quantity: 24, unit: "tablet" },
    ]);
    expect(d.label).toMatchObject({ dosesPerDay: 1, days: 3, frequency: { en: "once daily in the morning" } });
    // the inventory transaction
    const def = prescriptionDef(CASE, "discharge")!;
    expect(stockOnHand(CASE, s, def, def.products.find((p) => p.id === "loratadine")!)).toBe(27);
    expect(stockOnHand(CASE, s, def, def.products.find((p) => p.id === "prednisolone")!)).toBe(76);
    expect(stockOnHand(CASE, s, def, def.products.find((p) => p.id === "cetrimide")!)).toBe(4);
  });

  it("refuses and records a supply of a superseded, an unreviewed or a queried version", () => {
    const superseded = run([...CONFIRMED, dispense("d1", 1)]);
    expect(superseded.prescriptions!.dispensings).toEqual([]);
    expect(superseded.prescriptions!.refusals).toMatchObject([{ op: "dispense", version: 1, code: "not-current" }]);
    const unreviewed = run([...READY, sign("loratadine-course"), dispense("d1")]);
    expect(unreviewed.prescriptions!.refusals).toMatchObject([{ op: "dispense", version: 1, code: "not-reviewed" }]);
    const queried = run([...READY, sign("cetirizine-course"), review(1), dispense("d1")]);
    expect(queried.prescriptions!.refusals).toMatchObject([{ op: "dispense", version: 1, code: "queried" }]);
    expect(evaluate(CASE, queried, { prescription: { id: "discharge", refused: "dispense" } })).toBe(true);
    expect(evaluate(CASE, queried, { prescription: { id: "discharge", refused: "submit" } })).toBe(false);
    expect(evaluate(CASE, queried, { prescription: { id: "discharge", dispensed: true } })).toBe(false);
  });

  it("a retried supply (the same key) is the same supply; another key is a refused second supply", () => {
    const s = run([...CONFIRMED, dispense("d1")]);
    expect(reduce(CASE, s, dispense("d1")).state).toBe(s);
    const second = reduce(CASE, s, dispense("d2")).state;
    expect(second.prescriptions!.dispensings).toHaveLength(1);
    expect(second.prescriptions!.refusals).toMatchObject([{ op: "dispense", version: 2, code: "already-dispensed" }]);
    // the stock moved once
    const def = prescriptionDef(CASE, "discharge")!;
    expect(stockOnHand(CASE, second, def, def.products.find((p) => p.id === "loratadine")!)).toBe(27);
  });

  it("a new version may be signed after a supply (a review changes the plan), and is supplied in its turn", () => {
    const s = run([...CONFIRMED, dispense("d1"), sign("overdose", "v3")]);
    expect(currentVersion(s, "discharge")).toMatchObject({ n: 3, formulation: "overdose" });
    expect(status(s)).toBe("submitted");
    expect(evaluate(CASE, s, { prescription: { id: "discharge", dispensed: "loratadine-course" } })).toBe(true);
    expect(evaluate(CASE, s, { prescription: { id: "discharge", dispensed: "overdose" } })).toBe(false);
    expect(evaluate(CASE, s, { prescription: { id: "discharge", current: "overdose", versions: { gte: 3 } } })).toBe(true);
  });

  it("an authored supply deviation is what the dispensary supplies, and it is on the record", () => {
    const c = load(
      rxJson((p) => {
        p.deviations = [{ formulation: "loratadine-course", label: { frequency: L("twice daily", "每日两次"), dosesPerDay: 2 }, substitutions: [], summary: L("The label says twice daily.", "标签写成每日两次。") }];
      }),
    );
    const s = run([...CONFIRMED, dispense("d1")], c);
    const d = s.prescriptions!.dispensings[0]!;
    expect(d.label).toMatchObject({ dosesPerDay: 2, frequency: { en: "twice daily" } });
    expect(d.labelChecked).toBe(false);
    expect(d.discrepancies).toMatchObject([{ kind: "label" }]);
    expect(d.discrepancies[0]!.detail.en).toContain("twice daily");
    expect(evaluate(c, s, { prescription: { id: "discharge", discrepancy: "label" } })).toBe(true);
    expect(evaluate(c, s, { prescription: { id: "discharge", discrepancy: "identity" } })).toBe(false);
    expect(evaluate(c, s, { prescription: { labelChecked: false } })).toBe(true);
  });

  it("the deviation is what the dispensary supplies however its steps are recorded — and no event gives it away", () => {
    const c = load(
      rxJson((p) => {
        p.deviations = [{ formulation: "loratadine-course", label: { days: 5 }, substitutions: [{ product: "loratadine", with: "cetrimide" }] }];
      }),
    );
    const by = (op: Record<string, unknown>) => rx({ by: "pharmacist", ...op }, "system");
    // worked step by step at the device: selected, picked as prescribed, supplied
    const stepwise = replay(c, [{ type: "start" }, ...CONFIRMED, by({ op: "prepare" }), by({ op: "pick" }), by({ op: "dispense", key: "d1" })]);
    const whole = replay(c, [{ type: "start" }, ...CONFIRMED, dispense("d1")]);
    for (const r of [stepwise, whole]) {
      expect(r.rejections).toEqual([]);
      const d = r.state.prescriptions!.dispensings[0]!;
      expect(d.lines[0]).toMatchObject({ line: "loratadine", product: "cetrimide" });
      expect(d.label.days).toBe(5);
      expect(d.labelChecked).toBe(false);
      expect(d.discrepancies.map((x) => x.kind).sort()).toEqual(["identity", "label"]);
      const event = r.events.findLast((e) => e.type === "prescription.recorded" && e.op === "dispense")!;
      expect(event).not.toHaveProperty("discrepancies");
    }
    // a learner's own supply is never changed by it
    const own = rxJson((p) => {
      p.deviations = [{ formulation: "loratadine-course", label: { days: 5 }, substitutions: [] }];
      p.dispensedBy = "learner";
    });
    const s = run([...CONFIRMED, rx({ op: "dispense", key: "d1", by: "learner" })], load(own));
    expect(s.prescriptions!.dispensings[0]).toMatchObject({ labelChecked: true, discrepancies: [] });
  });

  it("the prescriber reads the record of a supply: recorded once, and a later supply is unread again", () => {
    const read = (version: number) => rx({ op: "acknowledge", version, by: "learner" });
    let s = run([...CONFIRMED, read(2)]);
    // nothing supplied: neither value of supplyRead holds
    expect(evaluate(CASE, s, { prescription: { id: "discharge", supplyRead: true } })).toBe(false);
    expect(evaluate(CASE, s, { prescription: { id: "discharge", supplyRead: false } })).toBe(false);
    expect(unreadVersion(s, "discharge")).toBeUndefined();
    s = reduce(CASE, s, dispense("d1")).state;
    expect(unreadVersion(s, "discharge")?.n).toBe(2);
    expect(evaluate(CASE, s, { prescription: { id: "discharge", supplyRead: false } })).toBe(true);
    s = reduce(CASE, s, read(2)).state;
    expect(s.prescriptions!.dispensings[0]!.read).toMatchObject({ by: "learner" });
    expect(evaluate(CASE, s, { prescription: { id: "discharge", supplyRead: true } })).toBe(true);
    expect(unreadVersion(s, "discharge")).toBeUndefined();
    expect(reduce(CASE, s, read(2)).state).toBe(s);
    // a revision supplied in its turn: its supply is unread, and reading names the version it belongs to
    s = reduce(CASE, s, sign("cetirizine-course", "again")).state;
    expect(unreadVersion(s, "discharge")).toBeUndefined();
    s = reduce(CASE, s, review(3)).state;
    expect(unreadVersion(s, "discharge")?.n).toBe(3);
    s = reduce(CASE, s, read(3)).state;
    s = reduce(CASE, s, sign("loratadine-course", "once more")).state;
    s = reduce(CASE, s, review(4)).state;
    s = reduce(CASE, s, read(4)).state;
    s = reduce(CASE, s, dispense("d2")).state;
    expect(s.prescriptions!.dispensings.map((d) => !!d.read)).toEqual([true, false]);
    expect(evaluate(CASE, s, { prescription: { id: "discharge", supplyRead: true } })).toBe(false);
    expect(unreadVersion(s, "discharge")?.n).toBe(4);
  });
});

describe("a supply put together step by step (a dispensing station)", () => {
  const CONFIRMED: ClinicalAction[] = [...READY, sign("cetirizine-course"), review(1), sign("loratadine-course"), review(2)];
  const step = (op: Record<string, unknown>) => rx({ by: "learner", ...op });

  it("select the version, pick each product, check the label, supply", () => {
    const s = run([...CONFIRMED, step({ op: "prepare" }), step({ op: "pick", line: "loratadine" }), step({ op: "pick", line: "prednisolone" }), step({ op: "check-label" }), step({ op: "dispense", key: "s1" })]);
    expect(s.prescriptions!.dispensings[0]).toMatchObject({ version: 2, by: "learner", labelChecked: true, discrepancies: [] });
    expect(s.prescriptions!.preparations).toEqual([]);
    expect(evaluate(CASE, s, { prescription: { id: "discharge", status: "dispensed", labelChecked: true, discrepancy: false, refused: false } })).toBe(true);
  });

  it("selecting an earlier version is refused and recorded; nothing is prepared", () => {
    const s = run([...CONFIRMED, step({ op: "prepare", version: 1 })]);
    expect(s.prescriptions!.preparations).toEqual([]);
    expect(s.prescriptions!.refusals).toMatchObject([{ op: "prepare", version: 1, code: "not-current" }]);
    expect(status(s)).toBe("confirmed");
  });

  it("a look-alike picked is recorded as picked: the label check shows it, a second pick corrects it", () => {
    let s = run([...CONFIRMED, step({ op: "prepare" }), step({ op: "pick", line: "loratadine", product: "cetrimide" }), step({ op: "pick", line: "prednisolone" })]);
    expect(status(s)).toBe("preparing");
    expect(preparationDiscrepancies(CASE, s, "discharge")).toMatchObject([{ kind: "identity", line: "loratadine" }]);
    const checked = reduce(CASE, s, step({ op: "check-label" }));
    expect(checked.events.find((e) => e.type === "prescription.recorded")).toMatchObject({ op: "check-label", discrepancies: 1 });
    s = reduce(CASE, checked.state, step({ op: "pick", line: "loratadine", product: "loratadine" })).state;
    // the label was checked against what lay there before
    expect(s.prescriptions!.preparations[0]!.labelChecked).toBeUndefined();
    s = reduce(CASE, s, step({ op: "check-label" })).state;
    s = reduce(CASE, s, step({ op: "dispense", key: "s1" })).state;
    expect(s.prescriptions!.dispensings[0]!.discrepancies).toEqual([]);
  });

  it("supplied uncorrected, every error is on the record: the wrong product, the line left out, the unchecked label", () => {
    const s = run([...CONFIRMED, step({ op: "prepare" }), step({ op: "pick", line: "loratadine", product: "cetrimide" }), step({ op: "dispense", key: "s1" })]);
    const d = s.prescriptions!.dispensings[0]!;
    expect(d.discrepancies.map((x) => x.kind)).toEqual(["identity", "omitted", "label-unchecked"]);
    expect(d.lines).toEqual([{ line: "loratadine", product: "cetrimide", quantity: 3, unit: "tablet" }]);
    expect(evaluate(CASE, s, { prescription: { id: "discharge", discrepancy: "identity" } })).toBe(true);
    expect(evaluate(CASE, s, { prescription: { id: "discharge", labelChecked: true } })).toBe(false);
  });

  it("a pick the shelf cannot cover is not supplied: refused and recorded, the supply stays open to be corrected", () => {
    // version 2 is confirmed; the dispenser picks cetirizine (none on hand) for the loratadine line
    let s = run([...CONFIRMED, step({ op: "prepare" }), step({ op: "pick", line: "loratadine", product: "cetirizine" }), step({ op: "pick", line: "prednisolone" })]);
    const r = reduce(CASE, s, step({ op: "dispense", key: "d1" }));
    expect(r.rejected).toBeUndefined();
    s = r.state;
    expect(s.prescriptions!.dispensings).toEqual([]);
    expect(s.prescriptions!.refusals.at(-1)).toMatchObject({ op: "dispense", code: "out-of-stock", version: 2 });
    expect(evaluate(CASE, s, { prescription: { id: "discharge", refused: "dispense" } })).toBe(true);
    // corrected, it is supplied
    s = reduce(CASE, s, step({ op: "pick", line: "loratadine", product: "loratadine" })).state;
    s = reduce(CASE, s, step({ op: "check-label" })).state;
    s = reduce(CASE, s, step({ op: "dispense", key: "d1" })).state;
    expect(s.prescriptions!.dispensings).toHaveLength(1);
    expect(s.prescriptions!.dispensings[0]!.discrepancies).toEqual([]);
  });

  it("`pick` with no line picks every remaining line as prescribed", () => {
    const s = run([...CONFIRMED, step({ op: "prepare" }), step({ op: "pick" })]);
    expect(s.prescriptions!.preparations[0]!.picks).toEqual({ loratadine: "loratadine", prednisolone: "prednisolone" });
    expect(reduce(CASE, s, step({ op: "pick" })).state).toBe(s);
  });

  it("picking or checking with nothing prepared, a line the version does not have, a product the dispensary does not have: refused and recorded", () => {
    const none = run([...CONFIRMED, step({ op: "pick", line: "loratadine" }), step({ op: "check-label" })]);
    expect(none.prescriptions!.refusals.map((x) => x.code)).toEqual(["not-prepared", "not-prepared"]);
    const wrong = run([...CONFIRMED, step({ op: "prepare" }), step({ op: "pick", line: "cetirizine" }), step({ op: "pick", line: "loratadine", product: "aspirin" })]);
    expect(wrong.prescriptions!.refusals.map((x) => x.code)).toEqual(["unknown-line", "unknown-product"]);
    expect(wrong.prescriptions!.preparations[0]!.picks).toEqual({});
  });

  it("a revision signed while a supply is being prepared ends that preparation", () => {
    const s = run([...CONFIRMED, step({ op: "prepare" }), step({ op: "pick" }), sign("overdose", "v3")]);
    expect(s.prescriptions!.preparations).toEqual([]);
    const after = reduce(CASE, s, step({ op: "dispense", key: "s1" })).state;
    expect(after.prescriptions!.refusals.at(-1)).toMatchObject({ op: "dispense", version: 3, code: "not-reviewed" });
  });
});

describe("conditions on the prescription record", () => {
  it("with no id, one of the case's prescriptions must satisfy every field", () => {
    const s = run([...READY, sign("loratadine-course"), review(1)]);
    expect(evaluate(CASE, s, { prescription: { status: "confirmed", current: "loratadine-course" } })).toBe(true);
    expect(evaluate(CASE, s, { prescription: { status: ["submitted", "queried"] } })).toBe(false);
    expect(evaluate(CASE, s, { prescription: {} })).toBe(true);
    expect(evaluate(CASE, run([]), { prescription: {} })).toBe(false);
    expect(evaluate(CASE, run([]), { prescription: { status: "none" } })).toBe(true);
  });

  it("an objective, a decision's requirement and a branch can read it", () => {
    const c = load(
      rxJson((_p, json) => {
        json.objectives.push({ id: "supply", title: L("Supply", "发药"), hint: L("The current version.", "当前版本。"), completeWhen: { prescription: { id: "discharge", dispensed: "loratadine-course" } } });
        json.history.find((h: Json) => h.id === "meds").branches = [{ id: "on-antihistamine", when: { prescription: { id: "discharge", dispensed: true } }, answer: L("Just the allergy tablets from the pharmacy.", "只有药房配的抗过敏药。") }];
      }),
    );
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
    const s = run([...READY, sign("loratadine-course"), review(1), dispense("d1")], c);
    expect(Object.keys(s.objectivesDone)).toContain("supply");
  });

  it("an unknown prescription or formulation in a condition is an integrity error", () => {
    const issues = checkCaseIntegrity(
      load(
        rxJson((_p, json) => {
          json.rubric.push({ id: "r1", domain: "management", text: L("x", "x"), met: { prescription: { id: "nope" } } });
          json.rubric.push({ id: "r2", domain: "management", text: L("x", "x"), met: { prescription: { id: "discharge", dispensed: "no-such-course" } } });
        }),
      ),
    );
    const paths = issues.filter((i) => i.severity === "error").map((i) => i.path);
    expect(paths.some((p) => p.endsWith("met.prescription.id"))).toBe(true);
    expect(paths.some((p) => p.endsWith("met.prescription.dispensed"))).toBe(true);
  });

  it("a prescription condition in a case without prescriptions can never hold", () => {
    const json = fixture("mini-anaphylaxis.case.json");
    json.rubric.push({ id: "r1", domain: "management", text: L("x", "x"), met: { prescription: {} } });
    expect(checkCaseIntegrity(load(json)).some((i) => i.severity === "error" && i.message.includes("no prescriptions"))).toBe(true);
  });
});

describe("prescriptions in validation and verification", () => {
  it("reports unknown products in lines, look-alikes, rules and deviations", () => {
    const issues = checkCaseIntegrity(
      load(
        rxJson((p) => {
          p.formulations[0].lines[0].product = "ghost";
          p.products[0].confusedWith = ["ghost"];
          p.review[0].products = ["ghost"];
          p.deviations = [{ formulation: "ghost", substitutions: [{ product: "loratadine", with: "ghost" }] }];
        }),
      ),
    );
    const paths = issues.filter((i) => i.severity === "error").map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["prescriptions.0.formulations.0.lines.0.product", "prescriptions.0.products.0.confusedWith.0", "prescriptions.0.review.0.products.0", "prescriptions.0.deviations.0.formulation", "prescriptions.0.deviations.0.substitutions.0.with"]));
  });

  it("a solution's prescription steps are checked and replayed like any other", () => {
    const json = rxJson((_p, j) => {
      j.solution.splice(-1, 0, { type: "ask", itemId: "meds" }, sign("loratadine-course"), review(1), dispense("d1"));
    });
    const ok = verifyCase(load(json));
    expect(ok.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(prescriptionStatus(ok.finalState, "discharge")).toBe("dispensed");
    const bad = rxJson((_p, j) => j.solution.splice(-1, 0, sign("no-such-course")));
    expect(checkCaseIntegrity(load(bad)).some((i) => i.severity === "error" && i.path.endsWith("prescription.formulation"))).toBe(true);
  });

  it("a facility without the dispensing device cannot supply it: a capability gap", () => {
    const facility = parseFacility(fixture("mini.facility.json"));
    const catalog = parseCatalog(fixture("mini.catalog.json"));
    if (!facility.ok || !catalog.ok) throw new Error("fixtures");
    const c = load(
      rxJson((p, json) => {
        p.requires = ["tcm-dispensing"];
        json.objectives.push({ id: "supply", title: L("Supply", "发药"), hint: L("x", "x"), completeWhen: { prescription: { id: "discharge", dispensed: true } } });
      }),
    );
    const gaps = caseCapabilityGaps(c, facility.value, [catalog.value]).filter((g) => g.kind === "prescription");
    expect(gaps).toMatchObject([{ kind: "prescription", id: "discharge", missing: ["tcm-dispensing"], neededBy: ["supply"], blocking: true }]);
  });

  it("the same actions replay to the same record", () => {
    const actions: ClinicalAction[] = [{ type: "start" }, ...READY, sign("cetirizine-course"), review(1), sign("loratadine-course"), review(2), dispense("d1")];
    expect(replay(CASE, actions).state).toEqual(replay(CASE, actions).state);
    expect(createSession(CASE)).not.toHaveProperty("prescriptions");
  });
});
