/** The team benchmark's report (docs/TEAM.md §7): Markdown in either language; the JSON is the `TeamReport` itself. */
import { POSITION_TITLES, t } from "@clinicalcraft/core";
import type { TeamReport, TeamRunResult } from "./run.js";

const TEXT = {
  en: {
    title: "Team benchmark",
    summary: "{passed} of {total} team scenarios passed.",
    counts: "Scenarios assigned {assigned} · activated {activated} · completed {completed} · appropriately escalated {escalated} · invalid (never activated) {invalid}. Obligations {obligations}, unfinished when their run stopped {unfinished}.",
    cols: ["Case", "Scenario", "Expected", "Obligations: met / escalated / unfinished / failed", "Needs: delivered / verified / escalated", "Count: outcome · holds · latency", "Exactly once", "Rounds · messages · acts", "Seconds", "Result"],
    pass: "pass",
    fail: "FAIL",
    yes: "yes",
    no: "NO",
    delivered: "delivered",
    escalated: "escalated",
    none: "—",
    failures: "Why it failed",
    note: "Observer mode (the simulated surgeon); every act through the session's `team` op and the world's action bus. Detection latency is in scheduler rounds from the count falling due to the hold asked for.",
    place: "By place: the {place}'s, played by its own policy (observer mode) while the stand-in surgeon operates{lineup}; each run also owes the operation brought to its close.",
    lineup: " (line-up {lineup})",
    operation: "operation closed",
    skipped: "Not run (the place is not offered)",
  },
  "zh-CN": {
    title: "团队协作基准测试",
    summary: "{total} 个团队情境中通过 {passed} 个。",
    counts: "情境：分配 {assigned} · 已激活 {activated} · 已完成 {completed} · 恰当上报 {escalated} · 无效（从未激活）{invalid}。职责共 {obligations} 项，运行结束时未完成 {unfinished} 项。",
    cols: ["病例", "情境", "预期", "职责：完成 / 上报 / 未完成 / 失败", "需求：送达 / 核实 / 上报", "清点：结果 · 暂停 · 发现延迟", "恰好一次", "轮次 · 消息 · 动作", "秒", "结果"],
    pass: "通过",
    fail: "未通过",
    yes: "是",
    no: "否",
    delivered: "送达",
    escalated: "上报",
    none: "—",
    failures: "未通过的原因",
    note: "观察模式（模拟术者）；每个动作都经会话的 `team` 操作和世界的动作总线。发现延迟以调度轮次计：从清点到期到提出暂停。",
    place: "按岗位：{place}岗位由其自身策略代为完成（观察模式），由主刀同事主刀{lineup}；每次运行还要求把手术做到关闭。",
    lineup: "（团队配置 {lineup}）",
    operation: "手术已关闭",
    skipped: "未运行（不提供该岗位）",
  },
} as const;

function expected(r: TeamRunResult, L: (typeof TEXT)[keyof typeof TEXT]): string {
  const parts: string[] = [];
  if (r.expect.delivered !== undefined) parts.push(r.expect.delivered ? L.delivered : L.escalated);
  if (r.expect.count) parts.push(r.expect.count);
  if (r.operation) parts.push(L.operation);
  return parts.join(", ") || L.none;
}

/** The report as Markdown. */
export function teamMarkdown(report: TeamReport, locale: string): string {
  const L = locale.startsWith("zh") ? TEXT["zh-CN"] : TEXT.en;
  const counts = Object.entries(report.counts).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), L.counts as string);
  const lang = locale.startsWith("zh") ? "zh-CN" : "en";
  const place = report.seat ? [L.place.replace("{place}", t(POSITION_TITLES[report.seat], lang)).replace("{lineup}", report.lineup ? L.lineup.replace("{lineup}", report.lineup) : ""), ""] : [];
  const lines = [`# ${L.title}`, "", L.summary.replace("{passed}", String(report.passed)).replace("{total}", String(report.total)), "", counts, "", L.note, "", ...place, `| ${L.cols.join(" | ")} |`, `|${L.cols.map(() => "---").join("|")}|`];
  for (const r of report.runs) {
    const by = (s: string) => r.obligations.filter((o) => o.status === s).length;
    const owed = r.obligations.length ? `${by("met")} / ${by("escalated")} / ${by("unfinished")} / ${by("failed")}` : L.none;
    const needs = r.needs ? `${r.delivered} / ${r.verified} / ${r.escalated}` : L.none;
    const count = r.count ? `${r.count.outcome ?? L.none} · ${r.count.holds} · ${r.count.detectionLatency ?? L.none}` : L.none;
    lines.push(`| ${r.caseId} | ${r.scenario} | ${expected(r, L)} | ${owed} | ${needs} | ${count} | ${r.exactlyOnce ? L.yes : L.no} | ${r.rounds} · ${r.messages} · ${r.acts} | ${r.seconds} | ${r.pass ? L.pass : L.fail} |`);
  }
  if (report.skipped?.length) {
    lines.push("", `## ${L.skipped}`, "");
    for (const x of report.skipped) lines.push(`- ${x.caseId} · ${x.scenario}: ${x.reason}`);
  }
  const failed = report.runs.filter((r) => !r.pass);
  if (failed.length) {
    lines.push("", `## ${L.failures}`, "");
    for (const r of failed) lines.push(`- ${r.caseId} · ${r.scenario}: ${r.failures.join("; ")}`);
  }
  return lines.join("\n") + "\n";
}
