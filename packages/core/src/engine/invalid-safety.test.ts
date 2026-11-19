/**
 * Blocked out-of-order checklist attempts (`invalid: true`, nothing applied) must be recorded
 * apart from actually applied contraindicated interventions in `AssessmentReport.safety`
 * (docs/ARCHITECTURE.md §3.1, docs/PROTOCOL.md §3.2).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ClinicalAction } from "../schema/session.js";
import { assess } from "./assessment.js";
import { parseCase } from "./parse.js";
import { replay } from "./reducer.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";

const L = (en: string) => ({ en, "zh-CN": en });

function checklistCase() {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.clock = { mode: "simulated", startTime: "08:00", actionCosts: { ask: 1, examine: 1, order: 1, read: 1, intervene: 0, answer: 0 } };
  raw.phases = [
    { id: "ward", label: L("Ward") },
    { id: "theatre", label: L("Theatre") },
    { id: "operation", label: L("Operation"), enterWhen: { intervened: "time-out", valid: true } },
  ];
  raw.procedure.phases = ["operation"];
  raw.interventions = [
    { id: "sign-in", name: L("WHO Sign In"), kind: "monitoring", checklist: true, maxDoses: 1, indicatedWhen: { phase: "theatre" } },
    { id: "induction", name: L("Induction"), kind: "airway", risk: "high", maxDoses: 1, contraindicatedWhen: { not: { intervened: "sign-in", valid: true } } },
    { id: "time-out", name: L("WHO Time Out"), kind: "consult", checklist: true, maxDoses: 1, contraindicatedWhen: { not: { intervened: "induction", valid: true } } },
  ];
  raw.safetyGates = [
    ...raw.safetyGates,
    { id: "induction-before-sign-in", label: L("Induction before Sign In"), when: { intervened: "induction", valid: false }, verdict: "safety-critical", capPercent: 70 },
  ];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const septicRaw = JSON.parse(fs.readFileSync(path.resolve(here, "../../../content/cases/septic-shock-cap/case.json"), "utf8"));
const septicParsed = parseCase(septicRaw);
if (!septicParsed.ok) throw new Error("septic-shock-cap failed to parse");
const septic = septicParsed.value;

describe("blocked invalid checklist attempts vs applied contraindicated interventions", () => {
  const c = checklistCase();

  it("an out-of-order checklist attempt (invalid: true) is recorded under invalidAttempts, not safety.contraindicated", () => {
    const actions: ClinicalAction[] = [
      { type: "start" },
      { type: "set-phase", phase: "theatre" },
      { type: "intervene", interventionId: "time-out" },
    ];
    const report = assess(c, replay(c, actions).state);
    expect(report.safety.contraindicated).toEqual([]);
    expect(report.safety.invalidAttempts).toEqual([{ interventionId: "time-out", at: 0 }]);
    expect(report.safety.passed).toBe(true);

    // Repeating in valid order and replaying (save/resume) keeps the separation intact.
    const recovered: ClinicalAction[] = [
      ...actions,
      { type: "intervene", interventionId: "sign-in" },
      { type: "intervene", interventionId: "induction" },
      { type: "intervene", interventionId: "time-out" },
    ];
    const after = assess(c, replay(c, recovered).state);
    expect(after.safety.contraindicated).toEqual([]);
    expect(after.safety.invalidAttempts).toEqual([{ interventionId: "time-out", at: 0 }]);
    expect(after.safety.passed).toBe(true);
  });

  it("mixed path separates a blocked checklist attempt from an actually applied contraindicated intervention", () => {
    const actions: ClinicalAction[] = [
      { type: "start" },
      { type: "set-phase", phase: "theatre" },
      { type: "intervene", interventionId: "time-out" }, // blocked (invalid: true)
      { type: "intervene", interventionId: "induction" }, // applied while contraindicated
    ];
    const report = assess(c, replay(c, actions).state);
    expect(report.safety.contraindicated).toEqual([{ interventionId: "induction", at: 0 }]);
    expect(report.safety.invalidAttempts).toEqual([{ interventionId: "time-out", at: 0 }]);
    expect(report.safety.passed).toBe(false);
  });

  it("happy path omits invalidAttempts and keeps contraindicated empty (checklist in order and septic-shock-cap)", () => {
    const inOrder = assess(
      c,
      replay(c, [
        { type: "start" },
        { type: "set-phase", phase: "theatre" },
        { type: "intervene", interventionId: "sign-in" },
        { type: "intervene", interventionId: "induction" },
        { type: "intervene", interventionId: "time-out" },
      ]).state,
    );
    expect(inOrder.safety.contraindicated).toEqual([]);
    expect(inOrder.safety.invalidAttempts).toBeUndefined();
    expect(inOrder.safety.passed).toBe(true);

    const sepsisReport = assess(septic, replay(septic, septic.solution).state);
    expect(sepsisReport.safety.contraindicated).toEqual([]);
    expect(sepsisReport.safety.invalidAttempts).toBeUndefined();
    expect(sepsisReport.safety.passed).toBe(true);
    expect(sepsisReport.score.percent).toBe(100);
  });
});
