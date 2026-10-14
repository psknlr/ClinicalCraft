/**
 * Case-schema extensions: typed reference solutions, the `decidedFirstTry`
 * condition leaf and `alternativeTo` investigations (docs/ARCHITECTURE.md §2–3).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction } from "../schema/session.js";
import { assess, checkCaseIntegrity, conditionRefs, evaluate, parseCase, reduce, replay, verifyCase, type Issue } from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const fixture = (name: string): Json => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const V4 = load(fixture("v4-smzl-mini.case.json"));
const SIM = load(fixture("mini-anaphylaxis.case.json"));

const at = (issues: Issue[], path: string) => issues.filter((i) => i.path === path);

/* ------------------------------------------------------------------ */
/* solution: ClinicalAction[]                                          */
/* ------------------------------------------------------------------ */

describe("CaseSchema.solution is typed as ClinicalAction[]", () => {
  it("parses steps as actions (defaults applied, usable without casts)", () => {
    const json = fixture("mini-anaphylaxis.case.json");
    json.solution.splice(1, 0, { type: "flag", flag: "handover-read" });
    const c = load(json);
    const steps: ClinicalAction[] = c.solution;
    expect(steps[1]).toEqual({ type: "flag", flag: "handover-read", value: true });
    expect(replay(c, steps).rejections).toEqual([]);
    expect(verifyCase(c).ok).toBe(true);
  });

  it("rejects malformed steps at parse time with per-step paths", () => {
    const json = fixture("v4-smzl-mini.case.json");
    const n = json.solution.length;
    json.solution.push({ type: "teleport" }, { type: "ask" }, { type: "start", why: "extra key" }, { type: "answer", decisionId: "diagnosis", optionIds: [] });
    const r = parseCase(json);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.map((i) => i.path)).toEqual([`solution.${n}.type`, `solution.${n + 1}.itemId`, `solution.${n + 2}`, `solution.${n + 3}.optionIds`]);
    expect(at(r.issues, `solution.${n}.type`)[0].message).toMatch(/Invalid discriminator value/);
    expect(at(r.issues, `solution.${n + 2}`)[0].message).toMatch(/Unrecognized key\(s\) in object: 'why'/);
  });

  it("still lets integrity report unknown ids per step (and malformed steps of cases built in code)", () => {
    const c = structuredClone(V4);
    const n = c.solution.length;
    c.solution.push({ type: "examine", findingId: "ghost" }, { type: "teleport" } as unknown as ClinicalAction, { type: "set-phase", phase: "later" });
    const issues = checkCaseIntegrity(c);
    expect(issues.map((i) => [i.path, i.severity])).toEqual([
      [`solution.${n}.findingId`, "error"],
      [`solution.${n + 1}.type`, "error"],
      [`solution.${n + 2}.phase`, "error"],
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* { decidedFirstTry }                                                 */
/* ------------------------------------------------------------------ */

describe("condition leaf { decidedFirstTry }", () => {
  const ready = replay(SIM, [
    { type: "start" },
    { type: "examine", findingId: "airway" },
    { type: "ask", itemId: "allergies" },
  ]).state;
  const answer = (s: typeof ready, optionId: string) => reduce(SIM, s, { type: "answer", decisionId: "dx", optionIds: [optionId] }).state;

  it("is true iff the first recorded attempt was correct", () => {
    expect(evaluate(SIM, ready, { decidedFirstTry: "dx" })).toBe(false);

    const right = answer(ready, "anaphylaxis");
    expect(evaluate(SIM, right, { decidedFirstTry: "dx" })).toBe(true);
    expect(evaluate(SIM, right, { decided: "dx" })).toBe(true);

    const wrong = answer(ready, "asthma");
    expect(evaluate(SIM, wrong, { decidedFirstTry: "dx" })).toBe(false);
    const recovered = answer(wrong, "anaphylaxis");
    expect(evaluate(SIM, recovered, { decided: "dx" })).toBe(true);
    expect(evaluate(SIM, recovered, { attempted: "dx" })).toBe(true);
    expect(evaluate(SIM, recovered, { decidedFirstTry: "dx" })).toBe(false);
    expect(evaluate(SIM, recovered, { decidedFirstTry: "disposition" })).toBe(false);
  });

  it("ignores rejected answers (a locked decision is not an attempt)", () => {
    const started = replay(SIM, [{ type: "start" }]).state;
    const locked = reduce(SIM, started, { type: "answer", decisionId: "dx", optionIds: ["asthma"] });
    expect(locked.rejected?.code).toBe("requirements-unmet");
    let s = locked.state;
    for (const a of [
      { type: "examine", findingId: "airway" },
      { type: "ask", itemId: "allergies" },
      { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] },
    ] as ClinicalAction[]) {
      s = reduce(SIM, s, a).state;
    }
    expect(s.attempts.map((x) => x.correct)).toEqual([true]);
    expect(evaluate(SIM, s, { decidedFirstTry: "dx" })).toBe(true);
  });

  it("parses strictly, scores rubric items and is collected by conditionRefs", () => {
    const json = fixture("mini-anaphylaxis.case.json");
    json.rubric.push({ id: "dx-first", domain: "diagnosis", text: "Diagnosis right first time", weight: 2, met: { decidedFirstTry: "dx" } });
    const c = load(json);
    const wrongFirst = replay(c, [{ type: "start" }, { type: "examine", findingId: "airway" }, { type: "ask", itemId: "allergies" }, { type: "answer", decisionId: "dx", optionIds: ["panic"] }]).state;
    expect(assess(c, wrongFirst).rubric.find((r) => r.id === "dx-first")?.met).toBe(false);
    expect(assess(c, replay(c, c.solution).state).rubric.find((r) => r.id === "dx-first")?.met).toBe(true);

    expect(conditionRefs({ any: [{ decided: "a" }, { not: { decidedFirstTry: "b" } }] }, ["rubric", 0, "met"])).toEqual([
      { kind: "decision", id: "a", path: ["rubric", 0, "met", "any", 0, "decided"] },
      { kind: "decision", id: "b", path: ["rubric", 0, "met", "any", 1, "not", "decidedFirstTry"] },
    ]);

    json.rubric[json.rubric.length - 1].met = { decidedFirstTry: "dx", extra: true };
    const bad = parseCase(json);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.issues[0].path).toBe(`rubric.${json.rubric.length - 1}.met`);
  });

  it("is checked by integrity: unknown ids, and decisions that can never be unlocked", () => {
    const c = structuredClone(SIM);
    const n = c.rubric.length;
    c.rubric.push({ id: "ghost-first", domain: "diagnosis", text: "x", weight: 1, met: { decidedFirstTry: "ghost" } });
    expect(at(checkCaseIntegrity(c), `rubric.${n}.met.decidedFirstTry`)).toEqual([
      { path: `rubric.${n}.met.decidedFirstTry`, message: 'unknown decision "ghost"', severity: "error" },
    ]);

    const locked = structuredClone(SIM);
    locked.decisions[0].requires = { decided: "dx" }; // self-locked → dx can never be answered
    locked.rubric.push({ id: "dx-first", domain: "diagnosis", text: "x", weight: 1, met: { decidedFirstTry: "dx" } });
    const issues = checkCaseIntegrity(locked);
    expect(at(issues, `rubric.${n}.met`)).toEqual([{ path: `rubric.${n}.met`, message: expect.stringMatching(/can never be met/), severity: "warning" }]);
  });
});

/* ------------------------------------------------------------------ */
/* InvestigationSchema.alternativeTo                                   */
/* ------------------------------------------------------------------ */

describe("InvestigationSchema.alternativeTo", () => {
  const withAlternative = (owner: string, target: string): CaseDefinition => {
    const json = fixture("v4-smzl-mini.case.json");
    json.investigations.find((i: Json) => i.id === owner).alternativeTo = [target];
    return load(json);
  };

  it("defaults to []", () => {
    expect(V4.investigations.every((i) => Array.isArray(i.alternativeTo) && i.alternativeTo.length === 0)).toBe(true);
  });

  it("satisfies an essential investigation in essentialMissing once an alternative was read (either direction, any phase)", () => {
    // V4 reference walkthrough leaves the essential marrow aspirate unordered but reads the trephine biopsy
    expect(assess(V4, replay(V4, V4.solution).state).investigations.essentialMissing).toEqual(["marrow"]);
    for (const c of [withAlternative("marrow", "biopsy"), withAlternative("biopsy", "marrow")]) {
      expect(assess(c, replay(c, c.solution).state).investigations.essentialMissing).toEqual([]);
    }

    // flow cytometry read only in the post-treatment phase still counts
    const c = withAlternative("flow", "marrow");
    const postOnly = replay(c, [{ type: "start" }, { type: "set-phase", phase: "post" }, { type: "order", investigationId: "flow" }, { type: "read", investigationId: "flow" }]).state;
    expect(assess(c, postOnly).investigations.essentialMissing).toEqual(["cbc", "biopsy", "hbv"]);
  });

  it("does not count an alternative that was only ordered, nor link unrelated investigations", () => {
    const c = withAlternative("marrow", "flow");
    const orderedOnly = replay(c, [{ type: "start" }, { type: "order", investigationId: "flow" }]).state;
    expect(assess(c, orderedOnly).investigations.essentialMissing).toEqual(["cbc", "marrow", "biopsy", "hbv"]);
    const readCbc = replay(c, [{ type: "start" }, { type: "order", investigationId: "cbc" }, { type: "read", investigationId: "cbc" }]).state;
    expect(assess(c, readCbc).investigations.essentialMissing).toEqual(["marrow", "biopsy", "flow", "hbv"]);
  });

  it("is checked by integrity: ids must exist; self-references are flagged", () => {
    const c = structuredClone(V4);
    const i = c.investigations.findIndex((x) => x.id === "marrow");
    c.investigations[i].alternativeTo = ["biopsy", "ghost", "marrow"];
    expect(checkCaseIntegrity(c).map((x) => [x.path, x.severity, x.message])).toEqual([
      [`investigations.${i}.alternativeTo.1`, "error", 'unknown investigation "ghost"'],
      [`investigations.${i}.alternativeTo.2`, "warning", 'investigation "marrow" lists itself as an alternative'],
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* Generated JSON Schema (scripts/gen-json-schemas.ts)                 */
/* ------------------------------------------------------------------ */

describe("packages/content/schemas/case.schema.json", () => {
  const schema = JSON.parse(readFileSync(new URL("../../../content/schemas/case.schema.json", import.meta.url), "utf8")) as Json;
  const caseProps = schema.definitions.Case.properties as Json;

  it("describes the new fields (regenerate with `npx tsx scripts/gen-json-schemas.ts`)", () => {
    expect(caseProps.solution.items).toEqual({ $ref: "#/definitions/ClinicalAction" });
    expect(schema.definitions.ClinicalAction.anyOf.length).toBeGreaterThanOrEqual(13);
    expect(schema.definitions.Condition.anyOf.some((v: Json) => v.properties?.decidedFirstTry)).toBe(true);
    for (const key of ["history", "exam", "interventions"]) {
      expect(caseProps[key].items.properties.excludeKeywords, key).toEqual({ $ref: "#/definitions/LocalizedList", default: [] });
    }
    expect(caseProps.investigations.items.properties.alternativeTo).toEqual({ type: "array", items: { $ref: "#/definitions/Id" }, default: [] });
  });
});
