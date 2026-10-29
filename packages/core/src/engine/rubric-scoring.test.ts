/**
 * Assessment integrity (docs/CASE_AUTHORING.md §7): a rubric item with
 * `scoredWhen` counts only once its precondition holds — an "avoided harm"
 * item is not earned by doing nothing — and a `critical` item's miss is
 * reported (`criticalMissed`) so every debrief can show it prominently.
 * Every built-in case scores 0 for a learner who does nothing.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction } from "../schema/session.js";
import { assess, checkCaseIntegrity, parseCase, replay, verifyCase } from "./index.js";

type Json = Record<string, any>;
const raw = (): Json => JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));

function build(patch: (json: Json) => void = () => undefined): CaseDefinition {
  const json = raw();
  patch(json);
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const rubricItem = (j: Json, id: string): Json => j.rubric.find((r: Json) => r.id === id);
/** "No beta-blocker" counts once the learner has started treatment (any intervention of the anaphylaxis bundle or the beta-blocker). */
const GUARDED = (j: Json) => {
  rubricItem(j, "no-beta").scoredWhen = { any: [{ intervened: "epi" }, { intervened: "beta-blocker" }, { intervened: "fluids" }] };
  rubricItem(j, "no-beta").critical = true;
  rubricItem(j, "epi-given").critical = true;
};
const scoreOf = (c: CaseDefinition, actions: ClinicalAction[]) => assess(c, replay(c, actions).state);
const NOTHING: ClinicalAction[] = [{ type: "start" }, { type: "finish" }];

describe("rubric scoredWhen", () => {
  it("doing nothing earns an avoided-harm item without it (the problem)…", () => {
    const report = scoreOf(build(), NOTHING);
    expect(report.rubric.find((r) => r.id === "no-beta")).toEqual({ id: "no-beta", domain: "safety", weight: 2, met: true });
    expect(report.score).toEqual({ earned: 2, possible: 6, percent: 33 });
  });

  it("…and nothing once the item counts only when treatment has started", () => {
    const c = build(GUARDED);
    const report = scoreOf(c, NOTHING);
    expect(report.rubric.find((r) => r.id === "no-beta")).toEqual({ id: "no-beta", domain: "safety", weight: 2, met: true, scored: false, critical: true });
    expect(report.score).toEqual({ earned: 0, possible: 4, percent: 0 });
  });

  it("counts the item as soon as its precondition holds — met or not", () => {
    const c = build(GUARDED);
    const right = scoreOf(c, [{ type: "start" }, { type: "intervene", interventionId: "epi" }]);
    expect(right.rubric.find((r) => r.id === "no-beta")).toEqual({ id: "no-beta", domain: "safety", weight: 2, met: true, critical: true });
    expect(right.score).toEqual({ earned: 5, possible: 6, percent: 83 });
    const harmful = scoreOf(c, [{ type: "start" }, { type: "intervene", interventionId: "beta-blocker" }]);
    expect(harmful.rubric.find((r) => r.id === "no-beta")).toEqual({ id: "no-beta", domain: "safety", weight: 2, met: false, critical: true });
    expect(harmful.score).toEqual({ earned: 0, possible: 6, percent: 0 });
  });

  it("keeps the reference path's score", () => {
    const before = verifyCase(build()).assessment.score;
    const after = verifyCase(build(GUARDED)).assessment.score;
    expect(after).toEqual(before);
  });

  it("is checked like every condition, and warns when it can never hold", () => {
    const unknown = build((j) => (rubricItem(j, "no-beta").scoredWhen = { intervened: "propranolol" }));
    expect(checkCaseIntegrity(unknown)).toContainEqual({ path: "rubric.1.scoredWhen.intervened", message: 'unknown intervention "propranolol"', severity: "error" });
    // a phase that can never be entered (not switchable, no enterWhen): the item would never count
    const never = build((j) => {
      j.phases.push({ id: "icu", label: { en: "ICU", "zh-CN": "ICU" }, learnerSwitchable: false });
      rubricItem(j, "no-beta").scoredWhen = { phase: "icu" };
    });
    expect(checkCaseIntegrity(never)).toContainEqual({ path: "rubric.1.scoredWhen", message: 'rubric item "no-beta" can never be scored: scoredWhen depends on objectives, decisions or phases that can never be reached', severity: "warning" });
  });
});

describe("rubric critical", () => {
  it("lists the critical items missed (scored and unmet), and none for a case without critical items", () => {
    const c = build(GUARDED);
    expect(scoreOf(c, NOTHING).criticalMissed).toEqual(["epi-given"]);
    expect(scoreOf(c, [{ type: "start" }, { type: "intervene", interventionId: "beta-blocker" }]).criticalMissed).toEqual(["epi-given", "no-beta"]);
    expect(verifyCase(c).assessment.criticalMissed).toEqual([]);
    expect(scoreOf(build(), NOTHING).criticalMissed).toBeUndefined();
  });

  it("does not cap the score", () => {
    const c = build(GUARDED);
    const report = scoreOf(c, [{ type: "start" }, { type: "intervene", interventionId: "beta-blocker" }, { type: "examine", findingId: "airway" }]);
    expect(report.criticalMissed).toEqual(["epi-given", "no-beta"]);
    expect(report.score).toEqual({ earned: 1, possible: 6, percent: 17 });
  });
});

describe("the built-in library", () => {
  const dir = new URL("../../../content/cases/", import.meta.url);
  const library = readdirSync(dir).map((id) => {
    const parsed = parseCase(JSON.parse(readFileSync(new URL(`${id}/case.json`, dir), "utf8")));
    if (!parsed.ok) throw new Error(`${id}: ${JSON.stringify(parsed.issues)}`);
    return parsed.value;
  });

  it.each(library.map((c) => [c.id, c] as const))("%s: a learner who does nothing earns nothing, at once or at the time limit", (_id, c) => {
    expect(scoreOf(c, NOTHING).score.earned, "finished at once").toBe(0);
    if (c.clock.mode === "simulated") {
      const waited = scoreOf(c, [{ type: "start" }, { type: "advance-time", minutes: c.clock.limitMinutes ?? 120 }, { type: "finish" }]);
      expect(waited.score.earned, "waited out the time limit").toBe(0);
    }
  });
});
