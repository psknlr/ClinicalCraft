/**
 * The benchmark end to end: three scenarios (an answer task, a recovery, a
 * safety refusal) run by each agent kind — the reference solver, the
 * scripted model through the real LLM tool path, and the live `llm` agent
 * wired from settings with a fake provider — score 100 % with no rule
 * violation; a deliberately broken agent that claims success in text
 * without acting scores 0 over the whole suite; limits and the spending
 * budget stop runs; the live agent refuses to run unless it may.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { LiveRunError, createLlmAgent } from "./agents/llm.js";
import { createReferenceAgent } from "./agents/reference.js";
import { createScriptedAgent, PlanProvider } from "./agents/scripted.js";
import type { BenchAgent } from "./agents/types.js";
import type { BenchEnvironment } from "./environment.js";
import { Budget } from "./pricing.js";
import { reportMarkdown } from "./report.js";
import { reportPasses, runScenario, runSuite, type BenchReport } from "./runner.js";
import type { BenchScenario } from "./schema.js";
import { DEFAULT_SUITE, loadSuite } from "./suites.js";

const content = await loadContent({ dirs: [] });
const suite = (await loadSuite(DEFAULT_SUITE))!;
const byId = (id: string): BenchScenario => suite.scenarios.find((s) => s.id === id)!;
const THREE = ["perception-ecg-at-stemi-bedside", "recovery-ecg-device-busy", "safety-thrombolysis-default-mode"].map(byId);
const environment: BenchEnvironment = { commit: "0000000", dirty: false, node: process.version, platform: "test", arch: "x64", cpus: 1, cpuModel: null, memoryGiB: 1, clinicalcraft: "test" };
const T = 120_000;

/** The live agent, wired from settings, its model replaced by a provider that replays each scenario's plan. */
function fakeLiveAgent(scenarios: readonly BenchScenario[], env: Record<string, string> = { ANTHROPIC_API_KEY: "test-key" }): BenchAgent {
  const agent = createLlmAgent({
    live: true,
    settings: { ...DEFAULT_SETTINGS, provider: "anthropic", model: "claude-test" },
    env,
    providerFactory: () => {
      const s = scenarios[current]!;
      return new PlanProvider(s.scripted.plan, "Done.");
    },
  });
  let current = 0;
  return {
    ...agent,
    wiring(scenario, tap) {
      current = scenarios.indexOf(scenario);
      return agent.wiring(scenario, tap);
    },
  };
}

async function suiteReport(agent: BenchAgent, scenarios: readonly BenchScenario[], seeds: number[] = [1], budget?: Budget): Promise<BenchReport> {
  return runSuite({ suite: DEFAULT_SUITE, scenarios, agent, seeds, content, environment, ...(budget ? { budget } : {}) });
}

describe("three scenarios per agent kind", () => {
  it("reference: 100 %, no violation, deterministic across seeds; it recovers from DEVICE_BUSY", { timeout: T }, async () => {
    const report = await suiteReport(createReferenceAgent(), THREE, [1, 2]);
    expect(report.runs.map((r) => [r.scenarioId, r.success, r.status])).toEqual(THREE.flatMap((s) => [[s.id, true, "completed"], [s.id, true, "completed"]]));
    expect(reportPasses(report, 100)).toMatchObject({ ok: true, successPercent: 100, violations: false });
    expect(report.scenarios.every((s) => s.deterministic === true)).toBe(true);
    const busy = report.runs.find((r) => r.scenarioId === "recovery-ecg-device-busy")!;
    expect(busy.refusals.map((r) => r.code)).toContain("DEVICE_BUSY");
    expect(busy.calls.at(-1)).toMatchObject({ tool: "interact_object", ok: true });
    const perception = report.runs.find((r) => r.scenarioId === "perception-ecg-at-stemi-bedside")!;
    expect(perception.answer).toEqual({ raw: "eq:resus1-ecg", resolved: "eq:resus1-ecg" });
    expect(report.agent).toEqual({ kind: "reference", provider: null, model: null, syntheticTokens: false });
    expect(report.metrics.overall.avgInputTokens).toBe(0);
  });

  it("scripted-llm: 100 % through the real LLM tool path (model tool calls recorded, synthetic tokens)", { timeout: T }, async () => {
    const report = await suiteReport(createScriptedAgent(), THREE);
    expect(reportPasses(report, 100).ok).toBe(true);
    for (const run of report.runs) {
      const scenario = byId(run.scenarioId);
      expect(run.success, run.scenarioId).toBe(true);
      // Every planned call reached the session's tool path and was recorded with its result.
      expect(run.calls.map((c) => c.tool)).toEqual(scenario.scripted.plan.map((c) => c.tool));
      expect(run.usage.inputTokens).toBeGreaterThan(0);
      // World actions are traced (the safety run is refused before acting).
      if (run.category !== "safety") expect(run.trace.spans).toBeGreaterThan(run.trace.setupSpans);
    }
    const safety = report.runs.find((r) => r.scenarioId === "safety-thrombolysis-default-mode")!;
    expect(safety.refusals.some((r) => r.code === "APPROVAL_DENIED" && r.tool === "intervene")).toBe(true);
    expect(safety.calls.some((c) => c.tool === "intervene" && !c.ok && c.code === "APPROVAL_DENIED")).toBe(true);
    expect(report.agent).toMatchObject({ kind: "scripted-llm", syntheticTokens: true });
  });

  it("llm (live agent from settings, fake provider): 100 %; token usage is metered against the budget", { timeout: T }, async () => {
    const budget = new Budget({ maxTokens: 10_000_000 });
    const report = await suiteReport(fakeLiveAgent(THREE), THREE, [1], budget);
    expect(report.runs.map((r) => r.success)).toEqual([true, true, true]);
    expect(report.agent).toMatchObject({ kind: "llm", provider: "anthropic", model: "claude-test", syntheticTokens: false });
    const used = report.runs.reduce((s, r) => s + r.usage.inputTokens + r.usage.outputTokens, 0);
    expect(used).toBeGreaterThan(0);
    expect(report.budget).toMatchObject({ maxTokens: 10_000_000, maxUsd: null, usedTokens: used, costUsd: null, skipped: 0 });
    expect(report.disclaimer.en).toMatch(/model/i);
  });
});

describe("a broken agent", () => {
  it("that claims success in text without acting scores 0 over the whole suite", { timeout: T }, async () => {
    const liar = createScriptedAgent({
      kind: "broken-claims-success",
      planFor: () => [],
      finalFor: () => "Done: I recorded the 12-lead ECG, attached the monitor, washed my hands and submitted eq:resus1-ecg. All objectives complete.",
    });
    const report = await suiteReport(liar, suite.scenarios);
    expect(report.runs).toHaveLength(suite.scenarios.length);
    expect(report.runs.filter((r) => r.success).map((r) => r.scenarioId)).toEqual([]);
    expect(report.metrics.overall.taskSuccess).toMatchObject({ k: 0, n: suite.scenarios.length, rate: 0 });
    expect(report.runs.every((r) => r.status === "completed" && r.calls.length === 0)).toBe(true);
    expect(reportPasses(report, 100).ok).toBe(false);
  });
});

describe("limits and budget", () => {
  it("maxToolCalls and maxSimMinutes stop a run (limit, not success)", { timeout: T }, async () => {
    const busy = byId("recovery-ecg-device-busy");
    const capped = await runScenario({ ...busy, limits: { ...busy.limits, maxToolCalls: 2 } }, createScriptedAgent(), 1, { content });
    expect(capped).toMatchObject({ success: false, status: "limit", limit: "maxToolCalls" });
    const waiting = { ...busy, limits: { ...busy.limits, maxSimMinutes: 5 }, scripted: { plan: [{ tool: "wait", args: { minutes: 30 } }, { tool: "wait", args: { minutes: 30 } }] } };
    const slow = await runScenario(waiting, createScriptedAgent(), 1, { content });
    expect(slow).toMatchObject({ success: false, status: "limit", limit: "maxSimMinutes" });
  });

  it("an exhausted token budget stops the run and skips the rest", { timeout: T }, async () => {
    const budget = new Budget({ maxTokens: 50 });
    const report = await suiteReport(fakeLiveAgent(THREE), THREE, [1], budget);
    expect(report.runs[0]).toMatchObject({ status: "limit", limit: "budget", success: false });
    expect(report.runs.slice(1).every((r) => r.status === "skipped")).toBe(true);
    expect(report.budget!.skipped).toBe(2);
    expect(report.metrics.overall.runs).toBe(1);
  });

  it("a dollar cap needs a price", () => {
    expect(() => new Budget({ maxUsd: 1 })).toThrow(/price/);
    const b = new Budget({ maxUsd: 1, price: { match: ".*", inputPerMTok: 1_000_000, outputPerMTok: 1_000_000 } });
    b.add({ inputTokens: 1, outputTokens: 0 });
    expect(b.costUsd()).toBe(1);
    expect(b.exhausted()).toBe(true);
  });
});

describe("the live agent refuses unless it may run", () => {
  const settings = { ...DEFAULT_SETTINGS, provider: "anthropic", model: "claude-test" };
  const code = (f: () => unknown) => {
    try {
      f();
    } catch (err) {
      return err instanceof LiveRunError ? err.code : String(err);
    }
    return "ran";
  };
  it("without --live, in CI, with an offline provider or without a key", () => {
    expect(code(() => createLlmAgent({ live: false, settings, env: { ANTHROPIC_API_KEY: "k" } }))).toBe("live-required");
    expect(code(() => createLlmAgent({ live: true, settings, env: { ANTHROPIC_API_KEY: "k", CI: "true" } }))).toBe("ci");
    expect(code(() => createLlmAgent({ live: true, settings: { ...settings, provider: "offline" }, env: {} }))).toBe("offline-provider");
    expect(code(() => createLlmAgent({ live: true, settings, env: {} }))).toBe("no-key");
    expect(code(() => createLlmAgent({ live: true, settings, env: { ANTHROPIC_API_KEY: "k", CI: "false" } }))).toBe("ran");
  });
});

describe("reports", () => {
  it("JSON carries environment, agent, seeds, disclaimer and Wilson intervals; Markdown in both languages", { timeout: T }, async () => {
    const report = await suiteReport(createReferenceAgent(), THREE.slice(0, 1), [1, 2, 3]);
    expect(report).toMatchObject({ format: "clinicalcraft-bench-report@1", suite: DEFAULT_SUITE, seeds: [1, 2, 3], environment });
    expect(report.metrics.overall.taskSuccess).toMatchObject({ k: 3, n: 3, rate: 1 });
    expect(report.metrics.overall.taskSuccess.ci![0]).toBeCloseTo(0.4385, 4);
    expect(report.metrics.byCategory.perception?.localisation).toMatchObject({ k: 3, n: 3 });
    expect(report.disclaimer.en).toMatch(/infrastructure/i);
    expect(report.disclaimer["zh-CN"]).toMatch(/基础设施/);
    const en = reportMarkdown(report, "en");
    const zh = reportMarkdown(report, "zh-CN");
    for (const md of [en, zh]) {
      expect(md).toContain("0000000");
      expect(md).toContain(process.version);
      expect(md).toContain("perception-ecg-at-stemi-bedside");
      expect(md).toContain("43.9 % – 100.0 %");
    }
    expect(en).toMatch(/Wilson 95 %/);
    expect(zh).toMatch(/[一-鿿]/);
  });
});
