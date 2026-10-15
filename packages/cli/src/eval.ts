/**
 * `clinicalcraft eval --cases <ids|all> --provider --model [--runs n] [--out report.md]`
 *
 * Autopilot benchmark: each case is played headlessly by the clinician agent
 * (approval mode `bypass`), then assessed. Offline (`--provider offline`)
 * the autopilot replays each case's reference solution — a deterministic
 * smoke benchmark of the whole runtime. Writes a Markdown report (and JSON).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { assess as coreAssess, progress as caseProgress, t } from "@clinicalcraft/core";
import { DEFAULT_AUTOPILOT_TURNS, type TokenUsage } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { flagBool, flagList, flagPositiveInt, flagString, suggest, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, requireProviderKey, sessionFlagsLayer, type CliContext } from "./context.js";
import { autoAnswerApprovals, RunTracker } from "./exec.js";
import { m } from "./i18n.js";
import { openSession } from "./session.js";

export interface EvalRun {
  caseId: string;
  title: string;
  run: number;
  sessionId: string;
  subtype: "success" | "error_max_turns" | "error_during_execution";
  finished: boolean;
  completed: boolean;
  objectives: { done: number; total: number };
  decisions: { firstTry: number; decided: number; total: number };
  score: { earned: number; possible: number; percent: number };
  contraindicated: number;
  criticalAlarms: number;
  essentialMissing: string[];
  turns: number;
  usage: TokenUsage;
  durationMs: number;
  errors: string[];
}

export interface EvalReport {
  type: "eval";
  version: 1;
  startedAt: string;
  provider: string;
  model: string;
  runsPerCase: number;
  maxTurns: number;
  runs: EvalRun[];
  summary: { runs: number; finished: number; meanScore: number; errors: number; inputTokens: number; outputTokens: number };
  notice: string;
}

/** Markdown rendering of an eval report. */
export function evalMarkdown(report: EvalReport, L: string): string {
  const lines: string[] = [];
  lines.push(`# ${m(L, "eval.title")}`);
  lines.push("");
  lines.push(m(L, "eval.meta", { date: report.startedAt, provider: report.provider, model: report.model, runs: report.runsPerCase, turns: report.maxTurns }));
  lines.push("");
  lines.push(`> ${report.notice}`);
  lines.push("");
  lines.push(`| ${m(L, "eval.col.case")} | # | ${m(L, "eval.col.result")} | ${m(L, "eval.col.objectives")} | ${m(L, "eval.col.decisions")} | ${m(L, "eval.col.score")} | ${m(L, "eval.col.safety")} | ${m(L, "eval.col.turns")} | ${m(L, "eval.col.tokens")} | ${m(L, "eval.col.time")} |`);
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of report.runs) {
    const result = r.subtype !== "success" ? r.subtype : r.finished ? m(L, "eval.finished") : m(L, "eval.unfinished");
    const safety = r.contraindicated > 0 ? `☠ ${r.contraindicated}` : "—";
    lines.push(
      `| \`${r.caseId}\` | ${r.run} | ${result} | ${r.objectives.done}/${r.objectives.total} | ${r.decisions.firstTry}/${r.decisions.total} | ${r.score.percent}% | ${safety} | ${r.turns} | ${r.usage.inputTokens}/${r.usage.outputTokens} | ${(r.durationMs / 1000).toFixed(1)} s |`,
    );
  }
  lines.push("");
  const s = report.summary;
  lines.push(`## ${m(L, "eval.summaryTitle")}`);
  lines.push("");
  lines.push(m(L, "eval.summary", { finished: s.finished, runs: s.runs, score: s.meanScore, errors: s.errors, input: s.inputTokens, output: s.outputTokens }));
  const failures = report.runs.filter((r) => r.errors.length > 0 || r.essentialMissing.length > 0);
  if (failures.length > 0) {
    lines.push("");
    for (const r of failures) {
      for (const e of r.errors) lines.push(`- \`${r.caseId}\` #${r.run}: ${e}`);
      if (r.essentialMissing.length) lines.push(`- \`${r.caseId}\` #${r.run}: ${m(L, "eval.missing", { list: r.essentialMissing.join(", ") })}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export async function runEval(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const runs = flagPositiveInt(args, "runs", 100, ctx.locale) ?? 1;
  const maxTurns = flagPositiveInt(args, "max-turns", 500, ctx.locale) ?? DEFAULT_AUTOPILOT_TURNS;
  const flags = await sessionFlagsLayer(ctx, args, { approvalMode: "bypass" });
  await requireProviderKey(ctx, args, flags);
  const settings = await loadCliSettings(ctx, flags);
  const content = await loadContent({ dirs: settings.contentDirs });
  const requested = flagList(args, "cases");
  if (requested.length === 0) throw new UsageError(ctx.t("eval.needCases"));
  const ids = requested.includes("all") ? [...content.cases.keys()].sort() : requested;
  for (const id of ids) {
    if (!content.cases.has(id)) {
      const hint = suggest(id, [...content.cases.keys()]);
      throw new CliError(ctx.t("cases.unknown", { id }), EXIT.usage, hint ? ctx.t("argv.didYouMean", { value: hint }) : undefined);
    }
  }
  const transcripts = flagBool(args, "transcripts");
  const p = ctx.out;
  const report: EvalReport = {
    type: "eval",
    version: 1,
    startedAt: new Date().toISOString(),
    provider: settings.provider,
    model: settings.model ?? (settings.provider === "offline" ? "deterministic" : "default"),
    runsPerCase: runs,
    maxTurns,
    runs: [],
    summary: { runs: 0, finished: 0, meanScore: 0, errors: 0, inputTokens: 0, outputTokens: 0 },
    notice: m(ctx.locale, "assess.notice"),
  };

  for (const caseId of ids) {
    for (let run = 1; run <= runs; run++) {
      const started = Date.now();
      const session = await openSession(ctx, { caseId, flags, transcript: transcripts, content });
      const tracker = new RunTracker();
      session.subscribe((e) => tracker.observe(e));
      autoAnswerApprovals(session);
      try {
        await session.run({ type: "autopilot", maxTurns });
        await session.run({ type: "assess" });
      } catch (err) {
        tracker.errors.push((err as Error).message);
      }
      const c = session.caseDef;
      const state = session.state;
      const report0 = tracker.assessment?.report ?? coreAssess(c, state);
      const prog = caseProgress(c, state);
      const turns = tracker.turnsByAgent.clinician ?? 0;
      const subtype = tracker.errors.length > 0 ? "error_during_execution" : turns >= maxTurns && !state.finished ? "error_max_turns" : "success";
      const entry: EvalRun = {
        caseId,
        title: t(c.title, ctx.locale),
        run,
        sessionId: session.id,
        subtype,
        finished: state.finished,
        completed: prog.complete,
        objectives: { done: prog.done, total: prog.total },
        decisions: { firstTry: report0.decisions.filter((d) => d.firstTryCorrect).length, decided: report0.decisions.filter((d) => d.decided).length, total: report0.decisions.length },
        score: report0.score,
        contraindicated: report0.safety.contraindicated.length,
        criticalAlarms: report0.safety.criticalAlarms,
        essentialMissing: report0.investigations.essentialMissing,
        turns,
        usage: tracker.usage,
        durationMs: Date.now() - started,
        errors: tracker.errors,
      };
      await session.close();
      report.runs.push(entry);
      const mark = entry.subtype === "success" && entry.finished ? p.green("✓") : entry.subtype === "error_during_execution" ? p.red("✗") : p.yellow("·");
      ctx.printErr(`${mark} ${caseId} #${run} ${ctx.err.dim(ctx.t("eval.progress", { done: entry.objectives.done, total: entry.objectives.total, score: entry.score.percent, seconds: (entry.durationMs / 1000).toFixed(1) }))}`);
    }
  }

  const all = report.runs;
  report.summary = {
    runs: all.length,
    finished: all.filter((r) => r.finished).length,
    meanScore: all.length ? Math.round((all.reduce((sum, r) => sum + r.score.percent, 0) / all.length) * 10) / 10 : 0,
    errors: all.filter((r) => r.subtype === "error_during_execution").length,
    inputTokens: all.reduce((sum, r) => sum + r.usage.inputTokens, 0),
    outputTokens: all.reduce((sum, r) => sum + r.usage.outputTokens, 0),
  };
  const markdown = evalMarkdown(report, ctx.locale);
  const out = flagString(args, "out");
  const jsonOut = flagString(args, "json");
  if (out) {
    const mdPath = ctx.path(out);
    await mkdir(dirname(mdPath), { recursive: true });
    await writeFile(mdPath, markdown, "utf8");
    const jsonPath = jsonOut ? ctx.path(jsonOut) : mdPath.replace(/\.(md|markdown)$/i, "") + ".json";
    await mkdir(dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    ctx.print(ctx.t("eval.written", { md: mdPath, json: jsonPath }));
  } else {
    if (jsonOut) {
      const jsonPath = ctx.path(jsonOut);
      await mkdir(dirname(jsonPath), { recursive: true });
      await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    }
    ctx.print(markdown);
  }
  return report.summary.errors > 0 ? EXIT.error : EXIT.ok;
}
