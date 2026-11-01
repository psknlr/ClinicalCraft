/**
 * The operative track's suite run and report (`clinicalcraft-operative-report@1`): every scenario ×
 * seed, metrics overall, by anatomy (variant) and by split with Wilson 95 % intervals, and the stamps
 * that make a report reproducible — the environment, the suite's per-split digests, each case file's
 * digest, the seeds — plus a determinism check (runs of the same scenario and anatomy must end in the
 * same state for the deterministic agents).
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { t } from "@clinicalcraft/core";
import type { LoadedContent } from "@clinicalcraft/agent/node";
import { commitLabel, type BenchEnvironment } from "../environment.js";
import type { Budget } from "../pricing.js";
import { percentile, proportion, type Proportion } from "../stats.js";
import type { OperativeAgent } from "./agents.js";
import { om } from "./i18n.js";
import { runOperativeScenario, type OperativeRun } from "./run.js";
import type { OperativeScenario, OperativeSplit } from "./schema.js";
import type { LoadedOperativeSuite } from "./suites.js";

export const OPERATIVE_REPORT_FORMAT = "clinicalcraft-operative-report@1" as const;

export interface OperativeMetrics {
  runs: number;
  taskSuccess: Proportion;
  safetyCritical: Proportion;
  injury: Proportion;
  unrecognisedInjury: Proportion;
  irreversibleWithoutView: Proportion;
  /** Over safety pauses: a pause claiming at least one criterion the field did not show. */
  overclaim: Proportion;
  /** Over runs whose scenario expects a bail-out. */
  bailoutWhenIndicated: Proportion;
  /** Over runs whose scenario expects completion. */
  bailoutWhenUnneeded: Proportion;
  medianSteps: number | null;
  medianSimMinutes: number | null;
  medianCalls: number | null;
  leaks: number;
}

export interface OperativeReport {
  format: typeof OPERATIVE_REPORT_FORMAT;
  suite: string;
  suiteDir: string;
  digests: Record<OperativeSplit, string>;
  /** sha256 of each case file the suite used. */
  cases: Record<string, string>;
  agent: { kind: string; provider: string | null; model: string | null; syntheticTokens: boolean };
  seeds: number[];
  startedAt: string;
  finishedAt: string;
  wallMs: number;
  environment: BenchEnvironment;
  disclaimer: { en: string; "zh-CN": string };
  scenarios: { id: string; split: OperativeSplit; caseId: string; locale: string; title: OperativeScenario["title"]; expect: OperativeScenario["expect"] }[];
  runs: OperativeRun[];
  metrics: { overall: OperativeMetrics; byVariant: Record<string, OperativeMetrics>; bySplit: Partial<Record<OperativeSplit, OperativeMetrics>> };
  /** Same scenario + anatomy → identical final state (null: no scenario ran twice with the same anatomy). */
  deterministic: boolean | null;
  budget?: { maxTokens: number | null; maxUsd: number | null; usedTokens: number; costUsd: number | null; skipped: number };
}

/** The metrics of a set of runs (skipped runs count nowhere). */
export function operativeMetrics(all: readonly OperativeRun[]): OperativeMetrics {
  const runs = all.filter((r) => r.status !== "skipped");
  const n = runs.length;
  const count = (f: (r: OperativeRun) => boolean) => runs.filter(f).length;
  const pauses = runs.flatMap((r) => r.pauses);
  const indicated = runs.filter((r) => r.expect === "bailout");
  const unneeded = runs.filter((r) => r.expect === "complete");
  return {
    runs: n,
    taskSuccess: proportion(count((r) => r.success), n),
    safetyCritical: proportion(count((r) => r.verdict === "safety-critical"), n),
    injury: proportion(count((r) => r.injuries.length > 0), n),
    unrecognisedInjury: proportion(count((r) => r.injuries.some((i) => !i.recognised)), n),
    irreversibleWithoutView: proportion(count((r) => r.irreversibleWithoutView > 0), n),
    overclaim: proportion(pauses.filter((p) => p.overclaims > 0).length, pauses.length),
    bailoutWhenIndicated: proportion(indicated.filter((r) => r.outcome === "bailout").length, indicated.length),
    bailoutWhenUnneeded: proportion(unneeded.filter((r) => r.outcome === "bailout").length, unneeded.length),
    medianSteps: percentile(runs.map((r) => r.steps), 50),
    medianSimMinutes: percentile(runs.map((r) => r.simMinutes), 50),
    medianCalls: percentile(runs.map((r) => r.calls), 50),
    leaks: runs.reduce((sum, r) => sum + r.leaks.length, 0),
  };
}

export interface RunOperativeSuiteOptions {
  suite: LoadedOperativeSuite;
  scenarios: readonly OperativeScenario[];
  agent: OperativeAgent;
  seeds: readonly number[];
  content: Pick<LoadedContent, "cases">;
  environment: BenchEnvironment;
  budget?: Budget;
  onRun?: (run: OperativeRun) => void;
}

async function fileDigest(file: string): Promise<string> {
  try {
    return createHash("sha256").update(await readFile(file)).digest("hex");
  } catch {
    return "";
  }
}

/** Run every scenario with every seed and build the report. */
export async function runOperativeSuite(o: RunOperativeSuiteOptions): Promise<OperativeReport> {
  const started = new Date();
  const t0 = performance.now();
  const runs: OperativeRun[] = [];
  for (const s of o.scenarios) {
    for (const seed of o.seeds) {
      const run = await runOperativeScenario(s, o.agent, seed, { content: o.content, ...(o.budget ? { budget: o.budget } : {}) });
      runs.push(run);
      o.onRun?.(run);
    }
  }
  const cases: Record<string, string> = {};
  for (const id of new Set(o.scenarios.map((s) => s.caseId))) {
    const entry = o.content.cases.get(id) as { file?: string } | undefined;
    cases[id] = entry?.file ? await fileDigest(entry.file) : "";
  }
  const groups = new Map<string, Set<string>>();
  for (const r of runs) {
    if (r.status === "skipped" || !r.stateDigest) continue;
    const key = `${r.scenarioId}|${r.variant}`;
    groups.set(key, (groups.get(key) ?? new Set()).add(r.stateDigest));
  }
  const repeated = [...groups.entries()].filter(([key]) => runs.filter((r) => `${r.scenarioId}|${r.variant}` === key && r.stateDigest).length > 1);
  const n = o.scenarios.length;
  const live = o.agent.kind === "llm";
  const variants = [...new Set(runs.map((r) => r.variant))].sort();
  const splits = [...new Set(runs.map((r) => r.split))].sort() as OperativeSplit[];
  const report: OperativeReport = {
    format: OPERATIVE_REPORT_FORMAT,
    suite: o.suite.suite,
    suiteDir: o.suite.dir,
    digests: o.suite.digests,
    cases,
    agent: { kind: o.agent.kind, provider: o.agent.provider, model: o.agent.model, syntheticTokens: o.agent.syntheticTokens === true },
    seeds: [...o.seeds],
    startedAt: started.toISOString(),
    finishedAt: new Date().toISOString(),
    wallMs: Math.round(performance.now() - t0),
    environment: o.environment,
    disclaimer: { en: om("en", live ? "report.disclaimer.live" : "report.disclaimer.infra", { n }), "zh-CN": om("zh-CN", live ? "report.disclaimer.live" : "report.disclaimer.infra", { n }) },
    scenarios: o.scenarios.map((s) => ({ id: s.id, split: s.split, caseId: s.caseId, locale: s.locale, title: s.title, expect: s.expect })),
    runs,
    metrics: {
      overall: operativeMetrics(runs),
      byVariant: Object.fromEntries(variants.map((v) => [v, operativeMetrics(runs.filter((r) => r.variant === v))])),
      bySplit: Object.fromEntries(splits.map((sp) => [sp, operativeMetrics(runs.filter((r) => r.split === sp))])),
    },
    deterministic: repeated.length ? repeated.every(([, digests]) => digests.size === 1) : null,
  };
  if (o.budget) {
    const b = o.budget;
    report.budget = { maxTokens: b.limits.maxTokens ?? null, maxUsd: b.limits.maxUsd ?? null, usedTokens: b.used.inputTokens + b.used.outputTokens, costUsd: b.costUsd(), skipped: b.skipped };
  }
  return report;
}

/** Does a report meet a required success rate (in %) with no hidden-state leak? */
export function operativeReportPasses(report: OperativeReport, required: number | null): { ok: boolean; successPercent: number; leaks: number } {
  const m = report.metrics.overall;
  const successPercent = m.taskSuccess.rate === null ? 0 : m.taskSuccess.rate * 100;
  const enough = required === null || successPercent + 1e-9 >= required;
  return { ok: enough && m.leaks === 0, successPercent, leaks: m.leaks };
}

const pct = (p: Proportion) => (p.rate === null ? "—" : `${p.k}/${p.n} · ${(p.rate * 100).toFixed(1)} %${p.ci ? ` [${(p.ci[0] * 100).toFixed(1)}–${(p.ci[1] * 100).toFixed(1)}]` : ""}`);
const num = (x: number | null) => (x === null ? "—" : String(Math.round(x * 10) / 10));

function metricsTable(m: OperativeMetrics, L: string): string[] {
  const rows: [string, string][] = [
    [om(L, "report.runs"), String(m.runs)],
    [om(L, "report.m.success"), pct(m.taskSuccess)],
    [om(L, "report.m.safetyCritical"), pct(m.safetyCritical)],
    [om(L, "report.m.injury"), pct(m.injury)],
    [om(L, "report.m.unrecognised"), pct(m.unrecognisedInjury)],
    [om(L, "report.m.withoutView"), pct(m.irreversibleWithoutView)],
    [om(L, "report.m.overclaim"), pct(m.overclaim)],
    [om(L, "report.m.bailoutIndicated"), pct(m.bailoutWhenIndicated)],
    [om(L, "report.m.bailoutUnneeded"), pct(m.bailoutWhenUnneeded)],
    [om(L, "report.m.steps"), num(m.medianSteps)],
    [om(L, "report.m.minutes"), num(m.medianSimMinutes)],
    [om(L, "report.m.calls"), num(m.medianCalls)],
    [om(L, "report.m.leaks"), String(m.leaks)],
  ];
  return [`| ${om(L, "report.metric")} | ${om(L, "report.value")} |`, "|---|---|", ...rows.map(([a, b]) => `| ${a} | ${b} |`)];
}

/** The report as Markdown (in `L`). */
export function operativeMarkdown(r: OperativeReport, L: string): string {
  const lines: string[] = [`# ${om(L, "report.title", { suite: r.suite })}`, "", `> ${r.disclaimer[L === "en" ? "en" : "zh-CN"]}`, ""];
  lines.push(
    `- ${om(L, "report.agent")}: ${r.agent.kind}${r.agent.model ? ` (${r.agent.provider}/${r.agent.model})` : ""}`,
    `- ${om(L, "report.seeds")}: ${r.seeds.join(", ")}`,
    `- ${om(L, "report.commit")}: ${commitLabel(r.environment)} · Node ${r.environment.node}`,
    `- ${om(L, "report.suite")}: ${r.suite} (${r.suiteDir})`,
    ...Object.entries(r.digests).map(([split, d]) => `- ${om(L, "report.digest", { split })}: \`${d.slice(0, 16)}\``),
    ...Object.entries(r.cases).map(([id, d]) => `- ${om(L, "report.case", { id })}: \`${d.slice(0, 16)}\``),
    `- ${om(L, "report.deterministic", { value: r.deterministic === null ? "—" : String(r.deterministic) })}`,
    "",
    `## ${om(L, "report.overall")}`,
    "",
    ...metricsTable(r.metrics.overall, L),
    "",
    `## ${om(L, "report.byVariant")}`,
    "",
  );
  for (const [v, m] of Object.entries(r.metrics.byVariant)) lines.push(`### ${v}`, "", ...metricsTable(m, L), "");
  lines.push(`## ${om(L, "report.bySplit")}`, "");
  for (const [sp, m] of Object.entries(r.metrics.bySplit)) if (m) lines.push(`### ${sp}`, "", ...metricsTable(m, L), "");
  lines.push(`## ${om(L, "report.runsTitle")}`, "");
  lines.push(
    `| ${om(L, "report.col.scenario")} | ${om(L, "report.col.split")} | ${om(L, "report.col.variant")} | ${om(L, "report.col.seed")} | ${om(L, "report.col.ok")} | ${om(L, "report.col.outcome")} | ${om(L, "report.col.verdict")} | ${om(L, "report.col.injuries")} | ${om(L, "report.col.unsafe")} | ${om(L, "report.col.steps")} |`,
    "|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const run of r.runs) {
    const title = r.scenarios.find((s) => s.id === run.scenarioId)?.title;
    lines.push(
      `| ${run.scenarioId}${title ? ` — ${t(title, L)}` : ""} | ${run.split} | ${run.variant} | ${run.seed} | ${run.success ? "✓" : "✗"}${run.status !== "completed" ? ` (${run.limit ?? run.status})` : ""} | ${om(L, `outcome.${run.outcome}`)} | ${run.verdict} | ${run.injuries.map((i) => `${i.kind}:${i.structure}${i.recognised ? "" : " (!)"}`).join(", ") || "—"} | ${[...new Set(run.unsafe.map((u) => u.code))].join(", ") || "—"} | ${run.steps} |`,
    );
  }
  const failed = r.runs.filter((x) => !x.success);
  if (failed.length) {
    lines.push("", `## ${om(L, "report.failed")}`, "");
    for (const run of failed) {
      const why = [...run.predicates.filter((p) => !p.ok).map((p) => `${p.kind}: ${p.detail}`), ...(run.error ? [run.error] : []), ...run.leaks.map((l) => `${om(L, "report.leaks")}: ${l.tool} → ${l.kind} "${l.text}"`)];
      lines.push(`- ${run.scenarioId} [${run.variant}] seed ${run.seed}: ${why.join("; ") || run.status}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
