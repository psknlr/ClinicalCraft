/**
 * `clinicalcraft bench team` — the team benchmark (docs/TEAM.md §7): every team scenario of the cases that have
 * a care team (the built-in content and the `contentDirs` packs), run headless in observer mode through the same
 * `team` op the browser uses, scored from the session's own record against each scenario's authored `expect`.
 *
 *   bench team [--case ids] [--scenario ids] [--out dir]
 *
 * Writes `team-report.json` and `team-report.md`; every scenario must pass (exit 1 otherwise).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadContent } from "@clinicalcraft/agent/node";
import { runTeamBench, teamCases, teamMarkdown } from "@clinicalcraft/bench";
import { flagList, flagString, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";

const TEXT = {
  en: { none: "No case has team scenarios (case `team.scenarios`).", run: "{mark} {case} · {scenario}", summary: "{passed} of {total} team scenarios passed.", written: "Report: {md} (JSON: {json})" },
  "zh-CN": { none: "没有病例带团队情境（病例的 `team.scenarios`）。", run: "{mark} {case} · {scenario}", summary: "{total} 个团队情境中通过 {passed} 个。", written: "报告：{md}（JSON：{json}）" },
} as const;

function tm(locale: string, key: keyof (typeof TEXT)["en"], params: Record<string, string | number> = {}): string {
  const table = locale.startsWith("zh") ? TEXT["zh-CN"] : TEXT.en;
  return table[key].replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** `bench team` */
export async function benchTeam(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const L = ctx.locale;
  const settings = await loadCliSettings(ctx);
  const content = await loadContent({ dirs: settings.contentDirs });
  const caseIds = flagList(args, "case");
  if (!teamCases(content, caseIds).length) throw new CliError(tm(L, "none"), EXIT.usage);
  const report = await runTeamBench(content, { ...(caseIds.length ? { caseIds } : {}), ...(flagList(args, "scenario").length ? { scenarios: flagList(args, "scenario") } : {}), locale: L });
  for (const r of report.runs) ctx.printErr(tm(L, "run", { mark: r.pass ? ctx.err.green("✓") : ctx.err.red("✗"), case: r.caseId, scenario: r.scenario }) + (r.pass ? "" : ctx.err.red(`  ${r.failures.join("; ")}`)));
  const outDir = ctx.path(flagString(args, "out") ?? "team-results");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "team-report.json");
  const mdPath = join(outDir, "team-report.md");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(mdPath, teamMarkdown(report, L), "utf8");
  ctx.print(tm(L, "summary", { passed: report.passed, total: report.total }));
  ctx.print(tm(L, "written", { md: ctx.show(mdPath), json: ctx.show(jsonPath) }));
  return report.passed === report.total ? EXIT.ok : EXIT.error;
}
