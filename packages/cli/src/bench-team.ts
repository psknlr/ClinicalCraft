/**
 * `clinicalcraft bench team` — the team benchmark (docs/TEAM.md §7): every team scenario of the cases that have
 * a care team (the built-in content and the `contentDirs` packs), run headless in observer mode through the same
 * `team` op the browser uses, scored from the session's own record against each scenario's authored `expect`.
 *
 *   bench team [--case ids] [--scenario ids] [--out dir]
 *   bench team --seat <place> [--lineup <id>] [--case ids] [--scenario ids] [--out dir]
 *
 * By place (`--seat first-assistant | second-assistant | scrub-nurse`): each scenario that offers the place starts in
 * it (the start joins the team at its phase), the place is played by its own policy while the stand-in surgeon operates,
 * and the run also owes the operation brought to its close; a scenario that leaves the place without its member is
 * skipped, saying why; `--lineup` chooses the line-up of a run by place only (alone, a usage error: it would be ignored;
 * one no selected case declares, a usage error naming the line-ups they have).
 * Writes `team-report.json` and `team-report.md`; every scenario must pass (exit 1 otherwise).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadContent } from "@clinicalcraft/agent/node";
import { placeCases, runTeamBench, teamCases, teamMarkdown } from "@clinicalcraft/bench";
import { POSITION_TITLES, t, type Place } from "@clinicalcraft/core";
import { flagList, flagString, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";

const TEXT = {
  en: {
    none: "No case has team scenarios (case `team.scenarios`).",
    nonePlace: "No case with team scenarios offers the {place}'s place{lineup} (a case team whose surgeon names a stand-in, with a member in that position).",
    lineupNeedsSeat: "--lineup chooses the line-up of a run by place: give --seat <place> with it (the default run takes each case's team as it is).",
    unknownLineup: "No case with team scenarios has the line-up {lineup} ({lineups}).",
    lineups: "their line-ups: {list}",
    noLineups: "none of them has a line-up",
    lineup: " with the line-up {lineup}",
    place: "By place: the {place}'s, played by its own policy while the stand-in surgeon operates.",
    skipped: "– {case} · {scenario}: {reason}",
    run: "{mark} {case} · {scenario}",
    summary: "{passed} of {total} team scenarios passed.",
    written: "Report: {md} (JSON: {json})",
  },
  "zh-CN": {
    none: "没有病例带团队情境（病例的 `team.scenarios`）。",
    nonePlace: "没有带团队情境的病例{lineup}提供{place}岗位（病例团队的术者需指定主刀同事，并有该岗位的成员）。",
    lineupNeedsSeat: "--lineup 用于选择按岗位运行时的团队配置：请同时给出 --seat <岗位>（默认运行按各病例团队本身进行）。",
    unknownLineup: "没有带团队情境的病例有团队配置 {lineup}（{lineups}）。",
    lineups: "这些病例的团队配置：{list}",
    noLineups: "这些病例都没有团队配置",
    lineup: "在团队配置 {lineup} 下",
    place: "按岗位：{place}岗位由其自身策略代为完成，由主刀同事主刀。",
    skipped: "– {case} · {scenario}：{reason}",
    run: "{mark} {case} · {scenario}",
    summary: "{total} 个团队情境中通过 {passed} 个。",
    written: "报告：{md}（JSON：{json}）",
  },
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
  const seat = flagString(args, "seat") as Place | undefined;
  const lineup = flagString(args, "lineup");
  // the line-up belongs to a run by place: alone it would be ignored
  if (lineup !== undefined && !seat) throw new UsageError(tm(L, "lineupNeedsSeat"));
  const cases = teamCases(content, caseIds);
  if (!cases.length) throw new CliError(tm(L, "none"), EXIT.usage);
  // a line-up no case declares is a usage error naming those they do — never a run of refused starts
  const declared = [...new Set(cases.flatMap((c) => (c.team!.lineups ?? []).map((l) => l.id)))];
  if (lineup !== undefined && !declared.includes(lineup)) {
    throw new CliError(tm(L, "unknownLineup", { lineup, lineups: declared.length ? tm(L, "lineups", { list: declared.join(", ") }) : tm(L, "noLineups") }), EXIT.usage);
  }
  const lang = L.startsWith("zh") ? "zh-CN" : "en";
  if (seat && !placeCases(content, seat, lineup, caseIds).length) throw new CliError(tm(L, "nonePlace", { place: t(POSITION_TITLES[seat], lang), lineup: lineup ? tm(L, "lineup", { lineup }) : "" }), EXIT.usage);
  const report = await runTeamBench(content, { ...(caseIds.length ? { caseIds } : {}), ...(flagList(args, "scenario").length ? { scenarios: flagList(args, "scenario") } : {}), locale: L, ...(seat ? { seat } : {}), ...(lineup ? { lineup } : {}) });
  if (seat) ctx.printErr(tm(L, "place", { place: t(POSITION_TITLES[seat], lang) }));
  for (const x of report.skipped ?? []) ctx.printErr(ctx.err.dim(tm(L, "skipped", { case: x.caseId, scenario: x.scenario, reason: x.reason })));
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
