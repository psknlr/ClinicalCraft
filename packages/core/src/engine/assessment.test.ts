import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction } from "../schema/session.js";
import { assess, countCriticalAlarms, createSession, parseCase, reduce, replay } from "./index.js";

const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

function load(name: string): CaseDefinition {
  const parsed = parseCase(fixture(name));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const V4 = load("v4-smzl-mini.case.json");
const SIM = load("mini-anaphylaxis.case.json");

describe("assess", () => {
  it("scores the V4 reference walkthrough", () => {
    const { state } = replay(V4, V4.solution as ClinicalAction[]);
    expect(assess(V4, state)).toEqual({
      caseId: "v4-smzl-mini",
      completed: true,
      minutes: 0,
      hints: 0,
      objectives: ["history", "pattern", "evidence", "diagnosis", "safety"].map((id) => ({ id, done: true, at: 0 })),
      history: { asked: 3, required: 3, requiredAsked: 3, missingRequired: [] },
      exam: { performed: 0, required: 1, requiredPerformed: 0, missingRequired: ["abdomen"] },
      investigations: { ordered: 8, essentialMissing: ["marrow"], lowValue: [], harmful: [], unread: [] },
      decisions: ["diagnosis", "safety", "genetics", "response"].map((id) => ({ id, firstTryCorrect: true, attempts: 1, decided: true })),
      safety: { contraindicated: [], criticalAlarms: 0 },
      rubric: [
        { id: "r-history", domain: "history", weight: 2, met: true },
        { id: "r-biopsy", domain: "investigations", weight: 2, met: true },
        { id: "r-diagnosis", domain: "diagnosis", weight: 3, met: true },
        { id: "r-exam", domain: "examination", weight: 1, met: false },
        { id: "r-comms", domain: "communication", weight: 1, met: null },
      ],
      score: { earned: 7, possible: 8, percent: 88 },
    });
  });

  it("reports gaps, waste, harm and safety events of a messy simulated run", () => {
    const actions: ClinicalAction[] = [
      { type: "start" },
      { type: "intervene", interventionId: "beta-blocker" },
      { type: "order", investigationId: "cxr" },
      { type: "order", investigationId: "ct-head" },
      { type: "order", investigationId: "tryptase" },
      { type: "hint" },
      { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] }, // locked → rejected, not an attempt
      { type: "examine", findingId: "airway" },
      { type: "ask", itemId: "allergies" },
      { type: "answer", decisionId: "dx", optionIds: ["asthma"] },
      { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] },
      { type: "advance-time", minutes: 25 },
      { type: "read", investigationId: "cxr" },
    ];
    const { state, rejections } = replay(SIM, actions);
    expect(rejections.map((r) => r.code)).toEqual(["requirements-unmet"]);
    const report = assess(SIM, state);
    expect(report).toMatchObject({
      caseId: "mini-anaphylaxis",
      completed: false,
      minutes: 34,
      hints: 1,
      history: { asked: 1, required: 2, requiredAsked: 1, missingRequired: ["trigger"] },
      exam: { performed: 1, required: 1, requiredPerformed: 1, missingRequired: [] },
      investigations: { ordered: 3, essentialMissing: ["abg"], lowValue: ["cxr"], harmful: ["ct-head"], unread: ["ct-head@arrival", "tryptase@arrival"] },
      decisions: [
        { id: "dx", firstTryCorrect: false, attempts: 2, decided: true },
        { id: "disposition", firstTryCorrect: false, attempts: 0, decided: false },
      ],
      safety: { contraindicated: [{ interventionId: "beta-blocker", at: 0 }], criticalAlarms: 3 },
      score: { earned: 1, possible: 6, percent: 17 },
    });
    expect(report.objectives).toEqual([
      { id: "assess", done: true, at: 7 },
      { id: "treat", done: false },
      { id: "stabilise", done: false },
      { id: "diagnose", done: true, at: 8 },
      { id: "dispose", done: false },
    ]);
    expect(report.rubric.map((r) => r.met)).toEqual([false, false, true, null]);
  });

  it("counts critical-alarm onsets consistently with the reducer's alarm events", () => {
    const { state, events } = replay(SIM, [{ type: "start" }, { type: "advance-time", minutes: 40 }]);
    const critical = events.filter((e) => e.type === "vitals.alarm" && e.level === "critical");
    expect(critical.length).toBe(3);
    expect(countCriticalAlarms(SIM, state)).toBe(3);
    expect(countCriticalAlarms(SIM, createSession(SIM))).toBe(0);
    expect(countCriticalAlarms(V4, state)).toBe(0);
  });

  it("is a pure function of the state", () => {
    const s = reduce(SIM, createSession(SIM), { type: "start" }).state;
    expect(assess(SIM, s)).toEqual(assess(SIM, s));
    expect(assess(SIM, s).score).toEqual({ earned: 2, possible: 6, percent: 33 });
  });
});
