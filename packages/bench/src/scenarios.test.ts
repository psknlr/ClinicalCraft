/**
 * The built-in suite `embodied-v1` (packages/content/bench/embodied-v1):
 * every scenario file validates against `clinicalcraft/bench-scenario@1`
 * and its references (case, facility, case items, entities) resolve in the
 * built-in content; the suite covers every category, the examples the
 * benchmark is specified with, workflows for its fixed ten-case cohort and
 * both languages. The schema's cross-field rules reject malformed
 * scenarios, and the generated JSON Schema editors use is in place.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import { BENCH_CATEGORIES, BENCH_SCENARIO_SCHEMA_ID, parseScenario, type BenchScenario } from "./schema.js";
import { benchRoot, DEFAULT_SUITE, listSuites, loadSuite, scenarioRefIssues } from "./suites.js";

const content = await loadContent({ dirs: [] });
const root = benchRoot()!;
const suite = (await loadSuite(DEFAULT_SUITE))!;
const files = readdirSync(join(root, DEFAULT_SUITE)).filter((f) => f.endsWith(".json"));
// embodied-v1 is a versioned benchmark, not the ever-growing case catalogue.
const suiteCaseIds = [
  "acute-appendicitis", "acute-ischemic-stroke", "anaphylaxis-garden", "dka-adult", "new-onset-t2dm",
  "pediatric-asthma", "pulmonary-embolism-postop", "septic-shock-cap", "smzl-lung-adeno", "stemi-inferior-rv",
];

describe(`suite ${DEFAULT_SUITE}`, () => {
  it("is found under packages/content/bench", async () => {
    expect(root.replace(/\\/g, "/")).toMatch(/packages\/content\/bench$/);
    expect(await listSuites()).toContain(DEFAULT_SUITE);
  });

  it.each(files)("%s validates (schema + references in the built-in content)", (file) => {
    const raw = JSON.parse(readFileSync(join(root, DEFAULT_SUITE, file), "utf8")) as Record<string, unknown>;
    const parsed = parseScenario(raw);
    expect(parsed.ok ? [] : parsed.issues).toEqual([]);
    const s = (parsed as { scenario: BenchScenario }).scenario;
    expect(s.schema).toBe(BENCH_SCENARIO_SCHEMA_ID);
    expect(`${s.id}.json`).toBe(file);
    expect(s.suite).toBe(DEFAULT_SUITE);
    expect(raw.$schema).toBe("../../schemas/bench-scenario.schema.json");
    expect(scenarioRefIssues(s, content)).toEqual([]);
    // Bilingual task text; a reference solution and a scripted plan.
    for (const text of [s.title, s.instruction]) expect(typeof text === "object" && text["zh-CN"] && text.en, s.id).toBeTruthy();
    expect(s.reference.steps.length).toBeGreaterThan(0);
    expect(s.scripted.plan.length).toBeGreaterThan(0);
  });

  it("loads without issues: ≥ 24 scenarios, unique ids, every category, both languages", () => {
    expect(suite.issues).toEqual([]);
    expect(suite.scenarios).toHaveLength(files.length);
    expect(suite.scenarios.length).toBeGreaterThanOrEqual(24);
    expect(new Set(suite.scenarios.map((s) => s.id)).size).toBe(suite.scenarios.length);
    for (const c of BENCH_CATEGORIES) expect(suite.scenarios.filter((s) => s.category === c).length, c).toBeGreaterThanOrEqual(2);
    expect(new Set(suite.scenarios.map((s) => s.locale))).toEqual(new Set(["en", "zh-CN"]));
  });

  it("contains the specified examples", () => {
    const byId = new Map(suite.scenarios.map((s) => [s.id, s]));
    const examples: [string, BenchScenario["category"]][] = [
      ["perception-ecg-at-stemi-bedside", "perception"],
      ["spatial-nearest-defibrillator-on-foot", "spatial"],
      ["navigation-radiology-corridor-blocked", "navigation"],
      ["interaction-attach-monitor", "interaction"],
      ["interaction-ecg-cart-from-corridor", "interaction"],
      ["recovery-ecg-carts-out-of-service", "recovery"],
      ["recovery-ecg-device-busy", "recovery"],
      ["multi-agent-delegate-monitor", "multi-agent"],
      ["safety-thrombolysis-default-mode", "safety"],
      ["safety-examine-from-another-room", "safety"],
      ["safety-deny-rule-via-device", "safety"],
      ["safety-headless-auto-always-ask", "safety"],
      ["workflow-stemi-full-encounter", "clinical-workflow"],
    ];
    for (const [id, category] of examples) expect(byId.get(id)?.category, id).toBe(category);
    // The corridor is blocked, the cart starts in the corridor, carts are out of service, the nurse holds the cart.
    expect(byId.get("navigation-radiology-corridor-blocked")!.setup.obstacles?.length).toBeGreaterThan(0);
    expect(byId.get("recovery-ecg-carts-out-of-service")!.setup.unavailable?.length).toBeGreaterThan(0);
    expect(byId.get("recovery-ecg-device-busy")!.setup.actions?.some((a) => a.actor === "staff:ed-nurse" && a.operation === "prepare")).toBe(true);
    expect(byId.get("safety-thrombolysis-default-mode")!.setup.approvalMode ?? "default").toBe("default");
    expect(byId.get("safety-headless-auto-always-ask")!.setup).toMatchObject({ approvalMode: "auto", approvals: "headless" });
    expect(byId.get("safety-deny-rule-via-device")!.setup.permissions?.deny?.length).toBeGreaterThan(0);
  });

  it("has clinical workflows covering exactly its fixed ten-case cohort", () => {
    const workflows = suite.scenarios.filter((s) => s.category === "clinical-workflow");
    expect([...new Set(workflows.map((s) => s.caseId))].sort()).toEqual(suiteCaseIds);
    for (const caseId of suiteCaseIds) expect(content.cases.has(caseId), caseId).toBe(true);
  });
});

describe("schema rules", () => {
  const base = JSON.parse(readFileSync(join(root, DEFAULT_SUITE, "perception-ecg-at-stemi-bedside.json"), "utf8")) as Record<string, unknown>;
  const issues = (patch: Record<string, unknown>) => {
    const r = parseScenario({ ...structuredClone(base), ...patch });
    return r.ok ? [] : r.issues;
  };

  it("accepts the base scenario and fills defaults", () => {
    const r = parseScenario(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.scenario.limits.maxTurns).toBeGreaterThan(0);
  });

  it("rejects malformed scenarios with a readable path", () => {
    expect(issues({ schema: "clinicalcraft/bench-scenario@2" }).join()).toMatch(/schema/);
    expect(issues({ category: "telepathy" }).join()).toMatch(/category/);
    expect(issues({ answer: undefined }).join()).toMatch(/answer/);
    expect(issues({ predicates: [{ clinical: { ordered: "ecg-12lead" } }] }).join()).toMatch(/answerEquals/);
    expect(issues({ predicates: [{ answerEquals: "eq:x" }, { refusedWith: "NOT_A_CODE" }] }).join()).toMatch(/refusedWith/);
    expect(issues({ predicates: [{ answerEquals: "eq:x" }, { world: { kind: "deviceAtBedside", target: "eq:a", capability: "ecg-12lead" } }] }).join()).toMatch(/exactly one/);
    expect(issues({ predicates: [{ answerEquals: "eq:x" }, { toolCalledAtMostTimes: { tool: "teleport", max: 1 } }] }).join()).toMatch(/unknown tool "teleport"/);
    expect(issues({ scripted: { plan: [{ tool: "teleport" }] } }).join()).toMatch(/unknown tool/);
    expect(issues({ allowedTools: ["observe_world"] }).join()).toMatch(/submit_answer/);
    expect(issues({ reference: { steps: [{ op: "answer" }] } }).join()).toMatch(/exactly one of `entity` and `from`/);
    expect(issues({ reference: { steps: [{ op: "clinical", action: { type: "start" } }] } }).join()).toMatch(/starts the case/);
    expect(issues({ extra: true }).join()).toMatch(/Unrecognized key/);
  });

  it("submit_answer exists only in answer tasks", () => {
    const workflow = JSON.parse(readFileSync(join(root, DEFAULT_SUITE, "workflow-pe-ctpa.json"), "utf8")) as Record<string, unknown>;
    const r = parseScenario({ ...workflow, scripted: { plan: [{ tool: "submit_answer", args: { entity_id: "eq:x" } }] } });
    expect(r.ok ? [] : r.issues).toEqual([expect.stringMatching(/only in answer tasks/)]);
  });
});

describe("packages/content/schemas/bench-scenario.schema.json (generated: npm run schemas)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema = JSON.parse(readFileSync(join(root, "..", "schemas", "bench-scenario.schema.json"), "utf8")) as any;
  it("describes the scenario with shared definitions", () => {
    expect(schema.$ref).toBe("#/definitions/BenchScenario");
    for (const name of ["BenchScenario", "Condition", "ClinicalAction", "NavGoal", "LocalizedText", "Id", "JsonValue"]) expect(schema.definitions[name], name).toBeDefined();
    const props = schema.definitions.BenchScenario.properties;
    expect(props.schema.const).toBe(BENCH_SCENARIO_SCHEMA_ID);
    expect(props.category.enum).toEqual([...BENCH_CATEGORIES]);
    expect(JSON.stringify(props.predicates)).toContain('"$ref":"#/definitions/Condition"');
  });
});
