/**
 * The operative track on the procedure engine's fixture case (a laparoscopic cholecystectomy in situs
 * inversus with four authored variants): suites load from content directories; the reference and
 * scripted agents reach 100 % on trajectories built for each anatomy; the variant drawn from a pool is
 * deterministic per seed; a plan that does not look at the anatomy fails safely in the variants; the
 * hidden-state audit catches a leak; the report is reproducible.
 */
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSession as createEngineSession, procedureFor, reduce, type CaseDefinition, type ClinicalAction, type ProcedureOp } from "@clinicalcraft/core";
import { lapCholeCase } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { benchEnvironment } from "../environment.js";
import { createOperativeReferenceAgent, createOperativeScriptedAgent, planFromReference } from "./agents.js";
import { operativeMarkdown, operativeReportPasses, runOperativeSuite } from "./report.js";
import { drawVariant, leaksIn, runOperativeScenario } from "./run.js";
import { parseOperativeScenario, type OperativeScenario } from "./schema.js";
import { loadOperativeSuite, operativeRefIssues } from "./suites.js";

const c: CaseDefinition = lapCholeCase();
const content = { cases: new Map([[c.id, { def: c, dir: "", file: "" }]]) } as unknown as Parameters<typeof runOperativeScenario>[3]["content"];

const ACCESS: ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
  { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" },
];
const steps = (n: number, region: string, energy = false): ProcedureOp[] => Array.from({ length: n }, () => ({ op: "dissect", port: "C", region, energy }) as ProcedureOp);
const swap = (instrument: string): ProcedureOp[] => [{ op: "withdraw", port: "C" }, { op: "insert", port: "C", instrument } as ProcedureOp];

/** Test-only: the handles the engine gives a variant's structures after the triangle and the plate. */
function handlesAfterDissection(variant: string): Map<string, string> {
  let s = reduce(c, createEngineSession(c), { type: "start", ...(variant !== "reference" ? { variant } : {}) } as ClinicalAction).state;
  s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
  for (const op of [...ACCESS, ...steps(6, "hepatocystic-triangle"), ...steps(3, "cystic-plate")]) s = reduce(c, s, { type: "operate", op } as ClinicalAction).state;
  expect(procedureFor(c, s)).toBeTruthy();
  return new Map(s.procedure!.handles.map((h) => [h.structure, h.handle]));
}

/** An expert trajectory for each fixture anatomy. */
function trajectory(variant: string): ProcedureOp[] {
  if (variant === "frozen-triangle") return [...ACCESS, ...steps(3, "hepatocystic-triangle"), { op: "bailout", strategy: "subtotal-fenestrating" }, { op: "close" }];
  const h = handlesAfterDissection(variant);
  const secure = variant === "posterior-artery" ? ["cystic-duct", "cystic-artery", "posterior-cystic-artery"] : ["cystic-duct", "cystic-artery"];
  const handles = secure.map((id) => [h.get(id)!, id] as const);
  return [
    ...ACCESS,
    ...steps(6, "hepatocystic-triangle"),
    ...steps(3, "cystic-plate"),
    ...handles.map(([handle]) => ({ op: "isolate", port: "C", handle }) as ProcedureOp),
    ...handles.map(([handle, as]) => ({ op: "identify", handle, as }) as ProcedureOp),
    { op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: true } },
    ...swap("clip-applier"),
    ...handles.map(([handle]) => ({ op: "clip", port: "C", handle, count: 2 }) as ProcedureOp),
    ...swap("scissors"),
    ...handles.map(([handle]) => ({ op: "divide", port: "C", handle }) as ProcedureOp),
    ...swap("hook"),
    { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["anterior", "cephalad"], force: "firm" },
    ...steps(4, "gallbladder-bed", true),
    { op: "inspect" },
    ...swap("retrieval-bag"),
    { op: "bag", port: "C" },
    { op: "extract", port: "A" },
    { op: "close" },
  ];
}

const POOL = ["reference", "aberrant-duct", "posterior-artery", "frozen-triangle"];

function scenario(id: string, variant: OperativeScenario["variant"], expect: OperativeScenario["expect"], split: "dev" | "test" = "dev"): Record<string, unknown> {
  const variants = typeof variant === "string" ? [variant] : variant.pool;
  return {
    schema: "clinicalcraft/operative-scenario@1",
    id,
    suite: "mini-v1",
    split,
    title: { en: id, "zh-CN": id },
    instruction: { en: "Remove the gallbladder safely, or stop safely.", "zh-CN": "安全地切除胆囊，或安全地停止。" },
    caseId: c.id,
    locale: "en",
    variant,
    setup: { preamble: "none", clinical: [{ type: "set-phase", phase: "theatre" }] },
    expect,
    predicates: [{ verdict: ["clear"] }, { clinical: { procedure: { closed: true } } }],
    reference: Object.fromEntries(variants.map((v) => [v, trajectory(v)])),
  };
}

function parsed(raw: Record<string, unknown>): OperativeScenario {
  const r = parseOperativeScenario(raw);
  if (!r.ok) throw new Error(r.issues.join("\n"));
  return r.scenario;
}

const environment = benchEnvironment(process.cwd(), "test");

describe("operative scenarios", () => {
  it("validate: every variant a scenario can draw needs a reference trajectory", () => {
    const bad = scenario("x", { pool: ["reference", "aberrant-duct"] }, "either");
    delete (bad.reference as Record<string, unknown>)["aberrant-duct"];
    const r = parseOperativeScenario(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.join("\n")).toContain('no reference trajectory for variant "aberrant-duct"');
  });

  it("refer only to what the case has, and never name the variant in the instruction", () => {
    expect(operativeRefIssues(parsed(scenario("ok", "aberrant-duct", "complete")), content)).toEqual([]);
    const leaky = scenario("leaky", "aberrant-duct", "complete");
    leaky.instruction = { en: "Watch for the aberrant right posterior duct.", "zh-CN": "注意变异胆管。" };
    expect(operativeRefIssues(parsed(leaky), content).join("\n")).toContain("names the variant");
    expect(operativeRefIssues(parsed({ ...scenario("v", "reference", "complete"), variant: "nope", reference: { nope: trajectory("reference") } }), content).join("\n")).toContain('no procedure variant "nope"');
  });

  it("draw the same anatomy for the same seed, and several over seeds", () => {
    const s = parsed(scenario("pool", { pool: POOL }, "either"));
    expect(drawVariant(s, 3)).toBe(drawVariant(s, 3));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seed) => drawVariant(s, seed))).size).toBeGreaterThan(2);
  });
});

describe("the operative agents", () => {
  it("the reference solver succeeds on every anatomy, without leaks", async () => {
    for (const v of POOL) {
      const s = parsed(scenario(`ref-${v}`, v, v === "frozen-triangle" ? "bailout" : "complete"));
      const run = await runOperativeScenario(s, createOperativeReferenceAgent(), 1, { content });
      expect({ v, success: run.success, error: run.error, predicates: run.predicates.filter((p) => !p.ok) }).toEqual({ v, success: true, error: undefined, predicates: [] });
      expect(run.verdict).toBe("clear");
      expect(run.outcome).toBe(v === "frozen-triangle" ? "bailout" : "completed");
    }
  });

  it("the scripted agent succeeds through the real tool path, and the tool outputs leak nothing", async () => {
    for (const v of ["aberrant-duct", "frozen-triangle"]) {
      const s = parsed(scenario(`scripted-${v}`, v, "either"));
      const run = await runOperativeScenario(s, createOperativeScriptedAgent(), 1, { content });
      expect({ v, success: run.success, error: run.error, leaks: run.leaks }).toEqual({ v, success: true, error: undefined, leaks: [] });
      expect(run.calls).toBeGreaterThan(s.reference[v]!.length);
    }
  });

  it("a plan that does not look at the anatomy fails in the variants: the reference-anatomy routine misses the second artery", async () => {
    const s = parsed(scenario("blind", "posterior-artery", "complete"));
    const blind = createOperativeScriptedAgent({ kind: "blind", planFor: () => planFromReference(trajectory("reference") as never) });
    const run = await runOperativeScenario(s, blind, 1, { content });
    expect(run.success).toBe(false);
    expect(run.verdict).toBe("safety-critical");
    expect(run.irreversibleWithoutView).toBeGreaterThan(0);
    expect(run.injuries.map((i) => i.structure)).toContain("posterior-cystic-artery");
    expect(run.pauses.at(-1)?.overclaims).toBeGreaterThan(0);
  });
});

describe("reference trajectories", () => {
  it("name structures (`@id`); the runner resolves them to the handles the field gives, per anatomy", async () => {
    const named = trajectory("aberrant-duct").map((op) => {
      if (!("handle" in op)) return op;
      const h = handlesAfterDissection("aberrant-duct");
      const id = [...h.entries()].find(([, handle]) => handle === op.handle)?.[0];
      return { ...op, handle: `@${id}` };
    });
    const raw = { ...scenario("named", "aberrant-duct", "complete"), reference: { "aberrant-duct": named } };
    const s = parsed(raw);
    expect(JSON.stringify(s.reference)).toContain("@cystic-duct");
    const run = await runOperativeScenario(s, createOperativeReferenceAgent(), 1, { content });
    expect({ success: run.success, error: run.error }).toEqual({ success: true, error: undefined });
    // a placeholder for something not in view is a scenario error
    const early = { ...raw, reference: { "aberrant-duct": [...ACCESS, { op: "isolate", port: "C", handle: "@cystic-artery" }] } };
    const bad = await runOperativeScenario(parsed(early), createOperativeReferenceAgent(), 1, { content });
    expect(bad.status).toBe("error");
    expect(bad.error).toContain("cystic-artery is not in view yet");
  });
});

describe("the hidden-state audit", () => {
  it("catches a variant's name or a duct's name before imaging, and ignores the agent's own words", () => {
    const s = reduce(c, createEngineSession(c), { type: "start", variant: "aberrant-duct" }).state;
    expect(leaksIn(c, s, "T3: a small duct (Aberrant right posterior duct)", {})).toEqual([{ kind: "variant", text: "Aberrant right posterior duct" }]);
    expect(leaksIn(c, s, "T2 is the Cystic duct", {}).map((l) => l.kind)).toEqual(["structure-name"]);
    expect(leaksIn(c, s, '"Cystic duct" is not a structure of this operation.', { as: "Cystic duct" })).toEqual([]);
  });
});

describe("a suite on disk and its report", () => {
  it("loads from a content directory, runs at 100 % for the deterministic agents, and is reproducible", async () => {
    const root = await mkdtemp(join(tmpdir(), "cc-operative-"));
    const dir = join(root, "operative", "mini-v1");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "mini-pool.json"), JSON.stringify(scenario("mini-pool", { pool: POOL }, "either")));
    await writeFile(join(dir, "mini-frozen.json"), JSON.stringify(scenario("mini-frozen", "frozen-triangle", "bailout", "test")));
    const suite = await loadOperativeSuite("mini-v1", [root]);
    expect(suite?.issues).toEqual([]);
    expect(suite?.scenarios.map((s) => s.id)).toEqual(["mini-frozen", "mini-pool"]);
    const report = await runOperativeSuite({ suite: suite!, scenarios: suite!.scenarios, agent: createOperativeReferenceAgent(), seeds: [1, 2, 3, 4], content, environment });
    expect(operativeReportPasses(report, 100)).toEqual({ ok: true, successPercent: 100, leaks: 0 });
    expect(report.deterministic).toBe(true);
    expect(report.metrics.bySplit.test?.bailoutWhenIndicated.rate).toBe(1);
    expect(Object.keys(report.metrics.byVariant).length).toBeGreaterThan(1);
    expect(report.digests.dev).toMatch(/^[0-9a-f]{64}$/);
    const again = await runOperativeSuite({ suite: suite!, scenarios: suite!.scenarios, agent: createOperativeReferenceAgent(), seeds: [1, 2, 3, 4], content, environment });
    expect(again.runs.map((r) => r.stateDigest)).toEqual(report.runs.map((r) => r.stateDigest));
    const md = operativeMarkdown(report, "zh-CN");
    expect(md).toContain("手术基准测试");
    expect(md).toContain("mini-pool");
  });
});
