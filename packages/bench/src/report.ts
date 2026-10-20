/**
 * The benchmark report as Markdown (`bench-report.md`; the JSON report is
 * the `BenchReport` object itself): environment, agent / model, seeds, the
 * disclaimer, overall and per-category metrics with Wilson 95 % intervals,
 * the per-scenario results and the failed runs with their failing
 * predicates.
 */
import { t } from "@clinicalcraft/core";
import { commitLabel } from "./environment.js";
import { bm, type BenchMessageKey } from "./i18n.js";
import type { Metrics } from "./metrics.js";
import type { BenchReport } from "./runner.js";
import { BENCH_CATEGORIES } from "./schema.js";
import type { Proportion } from "./stats.js";

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)} %`);

function propCells(p: Proportion): [string, string, string] {
  return [pct(p.rate), p.ci ? `${pct(p.ci[0])} – ${pct(p.ci[1])}` : "—", `${p.k} / ${p.n}`];
}

const num = (v: number | null, digits = 1) => (v === null ? "—" : v.toFixed(digits));

function metricRows(m: Metrics, L: string): string[] {
  const rows: [BenchMessageKey, Proportion][] = [
    ["report.metric.taskSuccess", m.taskSuccess],
    ["report.metric.navigation", m.navigation],
    ["report.metric.localisation", m.localisation],
    ["report.metric.interaction", m.interaction],
    ["report.metric.clinical", m.clinical],
    ["report.metric.recovery", m.recovery],
    ["report.metric.safety", m.safetyViolations],
    ["report.metric.spatial", m.spatialViolations],
    ["report.metric.unauthorised", m.unauthorisedAcceptance],
  ];
  const lines = [`| ${bm(L, "report.metric")} | ${bm(L, "report.value")} | ${bm(L, "report.ci")} | ${bm(L, "report.trials")} |`, "|---|---:|---|---:|"];
  for (const [key, p] of rows) lines.push(`| ${bm(L, key)} | ${propCells(p).join(" | ")} |`);
  lines.push(`| ${bm(L, "report.metric.toolCalls")} | ${num(m.avgToolCalls)} | | |`);
  lines.push(`| ${bm(L, "report.metric.tokens")} | ${num(m.avgInputTokens, 0)} / ${num(m.avgOutputTokens, 0)} | | |`);
  lines.push(`| ${bm(L, "report.metric.latency")} | ${num(m.latencyMs.p50, 0)} / ${num(m.latencyMs.p95, 0)} | | |`);
  lines.push(`| ${bm(L, "report.metric.callLatency")} | ${num(m.callLatencyMs.p50, 1)} / ${num(m.callLatencyMs.p95, 1)} | | |`);
  lines.push(`| ${bm(L, "report.metric.sim")} | ${num(m.avgSimMinutes, 2)} | | |`);
  return lines;
}

/** Markdown of a benchmark report in `locale`. */
export function reportMarkdown(r: BenchReport, locale: string): string {
  const L = locale;
  const out: string[] = [];
  const env = r.environment;
  out.push(`# ${bm(L, "report.title", { suite: r.suite })}`, "");
  out.push(`> ${r.agent.kind === "llm" ? bm(L, "report.disclaimer.live", { n: r.scenarios.length }) : bm(L, "report.disclaimer.infra", { n: r.scenarios.length })}`, "");
  if (r.agent.syntheticTokens) out.push(`> ${bm(L, "report.tokensSynthetic")}`, "");
  out.push(`## ${bm(L, "report.environment")}`, "");
  out.push("| | |", "|---|---|");
  out.push(`| ${bm(L, "report.agent")} | \`${r.agent.kind}\` |`);
  out.push(`| ${bm(L, "report.model")} | ${r.agent.provider ? `\`${r.agent.provider}\` / \`${r.agent.model ?? "default"}\`` : "—"} |`);
  out.push(`| ${bm(L, "report.seeds")} | ${r.seeds.join(", ")} |`);
  out.push(`| ${bm(L, "report.commit")} | \`${commitLabel(env, bm(L, "report.dirty"))}\` |`);
  out.push(`| ${bm(L, "report.date")} | ${r.startedAt} |`);
  out.push(`| ${bm(L, "report.duration")} | ${(r.wallMs / 1000).toFixed(1)} s |`);
  out.push(`| ${bm(L, "report.node")} | ${env.node} |`);
  out.push(`| ${bm(L, "report.platform")} | ${env.platform} (${env.arch}) |`);
  out.push(`| ${bm(L, "report.cpus")} | ${env.cpus}${env.cpuModel ? ` × ${env.cpuModel}` : ""} · ${env.memoryGiB} GiB |`);
  if (r.budget) {
    const cost = r.budget.costUsd === null ? bm(L, "report.costNa") : `$${r.budget.costUsd.toFixed(4)}${r.budget.maxUsd !== null ? ` / $${r.budget.maxUsd}` : ""}`;
    out.push(`| ${bm(L, "report.budget")} | ${bm(L, "report.budgetLine", { used: r.budget.usedTokens, limit: r.budget.maxTokens ?? "∞", cost, skipped: r.budget.skipped })} |`);
  }
  out.push("");
  out.push(`## ${bm(L, "report.overall")}`, "", ...metricRows(r.metrics.overall, L), "", bm(L, "report.definitions"), "");
  out.push(`## ${bm(L, "report.byCategory")}`, "");
  out.push(
    `| ${bm(L, "report.category")} | ${bm(L, "report.runs")} | ${bm(L, "report.metric.taskSuccess")} | ${bm(L, "report.ci")} | ${bm(L, "report.metric.spatial")} | ${bm(L, "report.metric.unauthorised")} | ${bm(L, "report.metric.toolCalls")} | ${bm(L, "report.metric.latency")} |`,
    "|---|---:|---:|---|---:|---:|---:|---:|",
  );
  for (const c of BENCH_CATEGORIES) {
    const m = r.metrics.byCategory[c];
    if (!m) continue;
    const [rate, ci] = propCells(m.taskSuccess);
    out.push(`| ${bm(L, `category.${c}` as BenchMessageKey)} | ${m.runs} | ${rate} | ${ci} | ${m.spatialViolations.k} / ${m.spatialViolations.n} | ${m.unauthorisedAcceptance.k} / ${m.unauthorisedAcceptance.n} | ${num(m.avgToolCalls)} | ${num(m.latencyMs.p50, 0)} / ${num(m.latencyMs.p95, 0)} |`);
  }
  out.push("");
  out.push(`## ${bm(L, "report.scenarios")}`, "");
  out.push(
    `| ${bm(L, "report.scenario")} | ${bm(L, "report.category")} | ${bm(L, "report.case")} | ${bm(L, "report.success")} | ${bm(L, "report.calls")} | ${bm(L, "report.tokens")} | ${bm(L, "report.wall")} | ${bm(L, "report.sim")} | ${bm(L, "report.deterministic")} |`,
    "|---|---|---|---:|---:|---:|---:|---:|---|",
  );
  for (const s of r.scenarios) {
    const runs = r.runs.filter((x) => x.scenarioId === s.id && x.status !== "skipped");
    const ok = runs.filter((x) => x.success).length;
    const avg = (f: (x: (typeof runs)[number]) => number) => (runs.length ? runs.reduce((sum, x) => sum + f(x), 0) / runs.length : 0);
    const det = s.deterministic === null ? "—" : bm(L, s.deterministic ? "report.yes" : "report.no");
    out.push(
      `| \`${s.id}\` — ${t(s.title, L)} | ${bm(L, `category.${s.category}` as BenchMessageKey)} | \`${s.caseId}\` | ${ok}/${runs.length} | ${avg((x) => x.calls.length).toFixed(1)} | ${avg((x) => x.usage.inputTokens).toFixed(0)}/${avg((x) => x.usage.outputTokens).toFixed(0)} | ${avg((x) => x.wallMs).toFixed(0)} | ${avg((x) => x.simMinutes).toFixed(2)} | ${det} |`,
    );
  }
  out.push("");
  out.push(`## ${bm(L, "report.failures")}`, "");
  const failed = r.runs.filter((x) => !x.success && x.status !== "skipped");
  if (!failed.length) out.push(bm(L, "report.noFailures"));
  for (const f of failed) {
    const why = [f.limit ? `limit ${f.limit}` : null, f.error ?? null, ...f.predicates.filter((p) => !p.ok).map((p) => `${p.kind}: ${p.detail}`)].filter(Boolean).join("; ");
    out.push(`- \`${f.scenarioId}\` seed ${f.seed}: ${why.replace(/\|/g, "\\|")}`);
  }
  out.push("");
  return out.join("\n");
}
