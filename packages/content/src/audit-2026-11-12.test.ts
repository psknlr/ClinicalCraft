/**
 * The clinical and gameplay audit of 2026-11-12, replayed on the real content: its counterfactual reference paths
 * (one intervention added to a case's own `solution`) and its repeat-dose sequence. A dangerous error made on the
 * reference path keeps its score (the learner meets the consequence) but fails the safety outcome, names the critical
 * rubric item it costs, and fails `cases verify`; the unmodified paths and the single-agent stroke paths pass (P0-1,
 * P0-3, P1-5). A repeat IM adrenaline dose counts only when it is due: at least 5 minutes after the last dose, after a
 * reassessment made since that dose, while she is still compromised (P1-4).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assess, createSession, evaluate, parseCase, reduce, verifyCase, type CaseDefinition, type ClinicalAction, type SessionState } from "@clinicalcraft/core";

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
