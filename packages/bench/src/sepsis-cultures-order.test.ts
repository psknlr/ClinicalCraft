/**
 * Ordering regression for `workflow-sepsis-cultures-then-antibiotics`:
 * passing requires blood cultures to be ordered BEFORE the first antimicrobial (`cultures-first`).
 * What this scenario measures is ordering before antibiotics, not reading culture results (`read_result`).
 */
import { describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import type { ClinicalAction } from "@clinicalcraft/core";
import { createReferenceAgent } from "./agents/reference.js";
import type { BenchEnvironment } from "./environment.js";
import { runSuite } from "./runner.js";
import type { BenchScenario } from "./schema.js";
import { DEFAULT_SUITE, loadSuite } from "./suites.js";

const content = await loadContent({ dirs: [] });
const suite = (await loadSuite(DEFAULT_SUITE))!;
const base = suite.scenarios.find((s) => s.id === "workflow-sepsis-cultures-then-antibiotics")!;
const environment: BenchEnvironment = {
  commit: "0000000",
  dirty: false,
  node: process.version,
  platform: "test",
  arch: "x64",
  cpus: 1,
  cpuModel: null,
  memoryGiB: 1,
  clinicalcraft: "test",
};
const T = 120_000;

function withSteps(id: string, actions: ClinicalAction[]): BenchScenario {
  const s = structuredClone(base);
  s.id = id;
  s.reference = { steps: actions.map((action) => ({ op: "clinical", action })) };
  return s;
}

async function runPath(id: string, actions: ClinicalAction[]) {
  const scenario = withSteps(id, actions);
  const report = await runSuite({
    suite: DEFAULT_SUITE,
    scenarios: [scenario],
    agent: createReferenceAgent(),
    seeds: [1],
    content,
    environment,
  });
  return report.runs[0]!;
}

const ivAccess: ClinicalAction = { type: "intervene", interventionId: "iv-access" };
const orderCultures: ClinicalAction = { type: "order", investigationId: "blood-cultures" };
const ceftriaxone: ClinicalAction = { type: "intervene", interventionId: "abx-ceftriaxone" };
const azithromycin: ClinicalAction = { type: "intervene", interventionId: "abx-azithromycin" };

describe("workflow-sepsis-cultures-then-antibiotics order enforcement", () => {
  it(
    "Path A (expected order: IV access -> blood cultures -> ceftriaxone): passes without reading results",
    { timeout: T },
    async () => {
      const run = await runPath("sepsis-path-a-correct-order", [ivAccess, orderCultures, ceftriaxone]);
      expect(run.status).toBe("completed");
      expect(run.predicates.every((p) => p.ok)).toBe(true);
      expect(run.success).toBe(true);
      // What this scenario measures is ordering before antibiotics, not reading results.
      expect(run.calls.some((c) => c.tool === "read_result")).toBe(false);
    },
  );

  it(
    "Path B (wrong order: ceftriaxone BEFORE blood cultures): fails only on the cultures-first predicate",
    { timeout: T },
    async () => {
      const run = await runPath("sepsis-path-b-abx-before-cultures", [ivAccess, ceftriaxone, orderCultures]);
      expect(run.status).toBe("completed");
      expect(run.success).toBe(false);
      const failed = run.predicates.filter((p) => !p.ok);
      expect(failed).toHaveLength(1);
      expect(failed[0]!).toMatchObject({
        kind: "clinical",
        ok: false,
        detail: expect.stringContaining('"flag":"cultures-first"'),
      });
    },
  );

  it("Path C (no blood cultures at all): fails", { timeout: T }, async () => {
    const run = await runPath("sepsis-path-c-no-cultures", [ivAccess, ceftriaxone]);
    expect(run.status).toBe("completed");
    expect(run.success).toBe(false);
  });

  it("Path D1 (blood cultures only, no antibiotic): fails", { timeout: T }, async () => {
    const run = await runPath("sepsis-path-d1-cultures-only", [ivAccess, orderCultures]);
    expect(run.status).toBe("completed");
    expect(run.success).toBe(false);
  });

  it(
    "Path D2 (azithromycin before blood cultures, then ceftriaxone): fails because another antimicrobial came first",
    { timeout: T },
    async () => {
      const run = await runPath("sepsis-path-d2-azithro-first", [ivAccess, azithromycin, orderCultures, ceftriaxone]);
      expect(run.status).toBe("completed");
      expect(run.success).toBe(false);
    },
  );

  it(
    "Path D3 (correct order followed by repeated blood-cultures order): still passes",
    { timeout: T },
    async () => {
      const run = await runPath("sepsis-path-d3-repeat-after-correct", [ivAccess, orderCultures, ceftriaxone, orderCultures]);
      expect(run.status).toBe("completed");
      expect(run.predicates.every((p) => p.ok)).toBe(true);
      expect(run.success).toBe(true);
    },
  );

  it(
    "Path D4 (wrong order followed by repeated blood-cultures order): cannot launder wrong order, fails",
    { timeout: T },
    async () => {
      const run = await runPath("sepsis-path-d4-repeat-after-wrong", [ivAccess, ceftriaxone, orderCultures, orderCultures]);
      expect(run.status).toBe("completed");
      expect(run.success).toBe(false);
    },
  );
});
