/**
 * The clinical and gameplay audit of 2026-11-12, replayed on the real content: its counterfactual reference paths
 * (one intervention added to a case's own `solution`) and its repeat-dose sequence. A dangerous error made on the
 * reference path keeps its score (the learner meets the consequence) but fails the safety outcome, names the critical
 * rubric item it costs, and fails `cases verify`; the unmodified paths and the single-agent stroke paths pass (P0-1,
 * P0-3, P1-5). A repeat IM adrenaline dose counts only when it is due: at least 5 minutes after the last dose, after a
 * reassessment made since that dose, while she is still compromised (P1-4).
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assess, checkContentStandard, checkOrder, createSession, evaluate, isHighAlert, parseCase, reduce, verifyCase, type CaseDefinition, type ClinicalAction, type DoseRoute, type SessionState } from "@clinicalcraft/core";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function load(id: string, patch?: (raw: Json) => void): CaseDefinition {
  const raw = JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8")) as Json;
  patch?.(raw);
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(`${id}: ${JSON.stringify(parsed.issues.slice(0, 3))}`);
  return parsed.value;
}

/** The case's reference path with `added` given right after the first `after`; the index of the added step. */
function withAdded(c: CaseDefinition, after: string, added: string): { c: CaseDefinition; step: number } {
  const at = c.solution.findIndex((a) => a.type === "intervene" && a.interventionId === after);
  if (at < 0) throw new Error(`${c.id}: no ${after} on the reference path`);
  const solution: ClinicalAction[] = [...c.solution.slice(0, at + 1), { type: "intervene", interventionId: added }, ...c.solution.slice(at + 1)];
  return { c: { ...c, solution }, step: at + 1 };
}

/** The audit's four counterfactual paths: the case, the step it follows, the intervention added, and what it costs. */
const REPLAYS = [
  { id: "acute-ischemic-stroke", after: "tenecteplase", added: "alteplase", score: [18, 20], reference: [20, 20], missed: "r-no-unsafe-lysis" },
  { id: "dka-adult", after: "iv-access", added: "kcl-push", score: [14, 16], reference: [16, 16], missed: "r-safety-avoid" },
  { id: "stemi-inferior-rv", after: "iv-access", added: "nitroglycerin", score: [19, 22], reference: [22, 22], missed: "r-no-nitrate" },
  { id: "pediatric-asthma", after: "prednisolone", added: "sedation", score: [18, 20], reference: [20, 20], missed: "r-safety" },
] as const;

describe("the audit's counterfactual reference paths (P0-1, P0-3, P1-5)", () => {
  for (const r of REPLAYS) {
    it(`${r.id}: ${r.added} after ${r.after} keeps its score, fails the safety outcome and fails cases verify`, () => {
      const c = load(r.id);
      // the authors' decision, pinned: the added intervention is the case's dangerous error
      expect(c.interventions.find((i) => i.id === r.added)?.critical).toBe(true);
      // the unmodified reference path: full score, safety passed, verified
      const reference = verifyCase(c);
      expect(reference.ok).toBe(true);
      expect([reference.assessment.score.earned, reference.assessment.score.possible]).toEqual([...r.reference]);
      expect(reference.assessment.safety).toMatchObject({ passed: true, criticalFailures: [], doseErrors: [] });
      // one dangerous error added
      const { c: modified, step } = withAdded(c, r.after, r.added);
      const v = verifyCase(modified);
      const a = v.assessment;
      expect([a.score.earned, a.score.possible]).toEqual([...r.score]);
      expect(a.objectives.every((o) => o.done)).toBe(true);
      expect(a.safety.passed).toBe(false);
      expect(a.safety.criticalFailures.map((f) => f.interventionId)).toEqual([r.added]);
      expect(a.safety.criticalFailures[0]!.harm).toBeDefined();
      expect(a.criticalMissed).toContain(r.missed);
      expect(v.ok).toBe(false);
      expect(v.issues.filter((i) => i.severity === "error")).toEqual([
        { path: `solution.${step}`, message: expect.stringMatching(new RegExp(`^gives "${r.added}" while it is contraindicated — a critical safety failure`)), severity: "error" },
      ]);
    });
  }

  it("acute-ischemic-stroke: either thrombolytic alone passes; the second, in either order, fails", () => {
    const stroke = load("acute-ischemic-stroke");
    const swap = stroke.solution.map((a): ClinicalAction => (a.type === "intervene" && a.interventionId === "tenecteplase" ? { ...a, interventionId: "alteplase" } : a));
    const alteplaseOnly = verifyCase({ ...stroke, solution: swap });
    expect(alteplaseOnly.ok).toBe(true);
    expect([alteplaseOnly.assessment.score.earned, alteplaseOnly.assessment.score.possible]).toEqual([20, 20]);
    expect(alteplaseOnly.assessment.safety.passed).toBe(true);
    // alteplase first, then tenecteplase: the second agent is the critical failure
    const reverse = verifyCase(withAdded({ ...stroke, solution: swap }, "alteplase", "tenecteplase").c);
    expect(reverse.assessment.safety.passed).toBe(false);
    expect(reverse.assessment.safety.criticalFailures.map((f) => f.interventionId)).toEqual(["tenecteplase"]);
    expect([reverse.assessment.score.earned, reverse.assessment.score.possible]).toEqual([18, 20]);
  });

  it("dka-adult: declared as taught error recovery the push verifies, with a warning — and the path still fails safety", () => {
    const dka = load("dka-adult");
    const { c } = withAdded(dka, "iv-access", "kcl-push");
    const declared = verifyCase({ ...c, errorRecovery: { interventions: ["kcl-push"], rationale: { en: "Recognise and treat a potassium push.", "zh-CN": "识别并处理推注氯化钾。" } } });
    expect(declared.ok).toBe(true);
    expect(declared.issues.map((i) => i.severity)).toContain("warning");
    expect(declared.assessment.safety.passed).toBe(false);
    // any other contraindicated step still fails it
    const other = verifyCase({ ...withAdded(c, "kcl-push", "insulin-bolus").c, errorRecovery: { interventions: ["kcl-push"], rationale: { en: "x", "zh-CN": "x" } } });
    expect(other.ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Repeat IM adrenaline in the anaphylaxis case (P1-4)                 */
/* ------------------------------------------------------------------ */

describe("anaphylaxis-garden: a repeat dose counts only when it is due (P1-4)", () => {
  const ana = load("anaphylaxis-garden");
  const dose: ClinicalAction = { type: "intervene", interventionId: "adrenaline-im" };
  const reassess: ClinicalAction = { type: "examine", findingId: "ex-airway-treated" };
  const wait = (minutes: number): ClinicalAction => ({ type: "advance-time", minutes, reason: "wait" });

  function play(c: CaseDefinition, actions: ClinicalAction[]): SessionState {
    let s = createSession(c);
    for (const a of [{ type: "start" } as ClinicalAction, ...actions]) {
      const r = reduce(c, s, a);
      if (r.rejected) throw new Error(`${a.type} rejected: ${r.rejected.message}`);
      s = r.state;
    }
    return s;
  }
  const doses = (s: SessionState) => s.interventions.filter((r) => r.interventionId === "adrenaline-im").map((r) => [r.at, r.appropriateness]);
  const met = (c: CaseDefinition, s: SessionState, id: string) => assess(c, s).rubric.find((x) => x.id === id)?.met;

  it("the audit's sequence (dose, reassessment, dose at 1.5 min): the repeat is neutral and earns nothing; the reassessment is scored", () => {
    const s = play(ana, [dose, reassess, dose]);
    expect(doses(s)).toEqual([[0, "indicated"], [1.5, "neutral"]]);
    expect(met(ana, s, "r-adr-repeat")).toBe(false);
    expect(met(ana, s, "r-adr-reassess")).toBe(true);
  });

  it("at 5 minutes after a reassessment, still compromised, the repeat is due; at 4.9, or without a reassessment, it is not", () => {
    const due = play(ana, [dose, reassess, wait(3.5), dose]);
    expect(doses(due)).toEqual([[0, "indicated"], [5, "indicated"]]);
    expect(met(ana, due, "r-adr-repeat")).toBe(true);
    expect(doses(play(ana, [dose, reassess, wait(3.4), dose]))).toEqual([[0, "indicated"], [4.9, "neutral"]]);
    const unassessed = play(ana, [dose, wait(4), dose]);
    expect(doses(unassessed)).toEqual([[0, "indicated"], [5, "neutral"]]);
    expect(met(ana, unassessed, "r-adr-reassess")).toBe(false);
    // a third dose 5 minutes later, once two doses have lifted her: not due
    expect(doses(play(ana, [dose, reassess, wait(3.5), dose, wait(4), dose])).at(-1)).toEqual([10, "neutral"]);
  });

  it("in a patient who has improved after one dose, the repeat at 5 minutes is not due", () => {
    const improved = load("anaphylaxis-garden", (raw) => {
      raw.interventions.find((i: Json) => i.id === "adrenaline-im").effects = [
        { vital: "sbp", delta: 50, onsetMinutes: 0.5, rampMinutes: 1 },
        { vital: "spo2", delta: 10, onsetMinutes: 0.5, rampMinutes: 1 },
        { vital: "rr", delta: -12, onsetMinutes: 0.5, rampMinutes: 1 },
      ];
    });
    const s = play(improved, [dose, reassess, wait(3.5), dose]);
    expect(doses(s)).toEqual([[0, "indicated"], [5, "neutral"]]);
    expect(met(improved, s, "r-adr-repeat")).toBe(false);
  });

  it("the reassessment a repeat needs is one made since the last dose: a dose since undoes it", () => {
    const since = { examined: "ex-airway-treated", afterLast: "adrenaline-im" } as const;
    expect(evaluate(ana, play(ana, [dose, reassess]), since)).toBe(true);
    expect(evaluate(ana, play(ana, [dose, reassess, dose]), since)).toBe(false);
    expect(evaluate(ana, play(ana, [dose, reassess, dose, reassess]), since)).toBe(true);
    // the review's edge: doses at 0 and 2, a reassessment, a third dose at 8.5 — the reassessment counts for it, but
    // the two doses have lifted her by then, so it is not due; the reassessment itself is scored
    const edge = play(ana, [dose, wait(1), dose, reassess, wait(5), dose]);
    expect(doses(edge)).toEqual([[0, "indicated"], [2, "neutral"], [8.5, "neutral"]]);
    expect(met(ana, edge, "r-adr-reassess")).toBe(true);
    expect(met(ana, edge, "r-adr-repeat")).toBe(false);
  });

  it("the reference path still scores 19/19 with the safety outcome passed", () => {
    const v = verifyCase(ana);
    expect(v.ok).toBe(true);
    expect([v.assessment.score.earned, v.assessment.score.possible]).toEqual([19, 19]);
    expect(v.assessment.safety.passed).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* The first set's follow-ups: every preset of the built-in cases      */
/* ------------------------------------------------------------------ */

/** The built-in cases outside the CMCR 105 collection (re-authored elsewhere): the 30 whose presets this audit set. */
const BUILT_IN = readdirSync(new URL("../cases/", import.meta.url))
  .filter((id) => !(JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8")) as Json).tags?.includes("cmcr-105"))
  .sort();
const ROUTE_WORDS: Record<DoseRoute, string> = { IM: "IM", IV: "IV", IO: "IO", SC: "SC", PO: "PO", SL: "SL", PR: "PR", IN: "intranasal", INH: "inhaled", TOP: "topical" };

describe("every preset of the built-in cases, ordered as written (re-review of the first set)", () => {
  it("covers the 30 built-in cases, with no dose lint left", () => {
    expect(BUILT_IN).toHaveLength(30);
    for (const id of BUILT_IN) expect(checkContentStandard(load(id)).filter((i) => i.path.endsWith(".doseSpec")), id).toEqual([]);
  });

  it("the preset as an order is given; ten times it is a critical dose error; a high-alert medicine at three times it is critical", () => {
    let presets = 0;
    for (const id of BUILT_IN) {
      const c = load(id);
      for (const iv of c.interventions) {
        const spec = iv.doseSpec;
        if (!spec) continue;
        presets++;
        const route = spec.route ? ` ${ROUTE_WORDS[spec.route]}` : "";
        const order = (amount: string) => checkOrder({ text: `${amount} ${spec.unit}${route}` }, iv, c.patient.weightKg);
        const label = `${id}/${iv.id}`;
        expect(order(String(spec.amount)), label).toMatchObject({ outcome: "given", checked: true });
        if (spec.upTo != null) expect(order(`${spec.amount}–${spec.upTo}`), `${label} range`).toMatchObject({ outcome: "given" });
        expect(order(String((spec.upTo ?? spec.amount) * 10)), `${label} ×10`).toMatchObject({ outcome: "conflict", severity: "critical" });
        // a tenth of a dose given in parts is its bolus — asked about ("is that the whole dose?"); a hundredth is critical
        expect(order(String(spec.amount / 10)), `${label} ÷10`).toMatchObject(spec.bolus ? { outcome: "query", reason: "partial" } : { outcome: "conflict", severity: "critical" });
        if (spec.bolus) expect(order(String(spec.amount / 100)), `${label} ÷100`).toMatchObject({ outcome: "conflict", severity: "critical" });
        if (isHighAlert(iv) || iv.critical === true || iv.risk === "high") expect(order(String((spec.upTo ?? spec.amount) * 3)), `${label} ×3`).toMatchObject({ outcome: "conflict", severity: "critical" });
        // an infusion's rate alone: given beside a bolus, asked about as part of a dose given in parts
        if (spec.maintenance) {
          const rate = checkOrder({ text: `${spec.maintenance.amount} ${spec.maintenance.unit}` }, iv, c.patient.weightKg);
          expect(rate, `${label} rate`).toMatchObject(spec.bolus ? { outcome: "query", reason: "partial" } : { outcome: "given" });
        }
      }
    }
    expect(presets).toBeGreaterThanOrEqual(30);
  });

  it("the cases whose items run as a bolus and an infusion state both parts: PE heparin, stroke alteplase", () => {
    expect(load("pulmonary-embolism-postop").interventions.find((i) => i.id === "ufh")?.doseSpec?.maintenance).toEqual({ amount: 18, unit: "unit/kg/h" });
    expect(load("acute-ischemic-stroke").interventions.find((i) => i.id === "alteplase")?.doseSpec).toMatchObject({ bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } });
    // the STEMI cardiac-arrest adrenaline (IV adrenaline is high-alert) now has a preset: ten milligrams is not given
    const stemi = load("stemi-inferior-rv");
    expect(checkOrder({ text: "adrenaline 10 mg IV" }, stemi.interventions.find((i) => i.id === "adrenaline")!, stemi.patient.weightKg)).toMatchObject({ outcome: "conflict", severity: "critical" });
    expect(checkOrder({ text: "adrenaline 1 mg IV" }, stemi.interventions.find((i) => i.id === "adrenaline")!, stemi.patient.weightKg)).toMatchObject({ outcome: "given" });
  });
});
