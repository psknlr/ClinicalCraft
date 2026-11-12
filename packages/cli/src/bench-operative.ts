/**
 * `clinicalcraft bench operative` — the operative benchmark (docs/BENCHMARK_OPERATIVE.md):
 *
 *   bench operative --list [--suite s]
 *   bench operative --suite s --agent reference|scripted-llm|llm [--split dev|test|all] [--scenario ids] [--variant ids]
 *                   [--seeds 1-5] [--out dir] [--require pct] [--live --max-tokens N --max-usd X --provider p --model m]
 *
 * Suites come from `<content dir>/operative/<suite>/` — the built-in content and the directories in
 * `contentDirs` (content packs ship their own cases' suites); the report stamps the suite's per-split
 * digests and each case file's digest. `reference` and `scripted-llm` must score 100 % (the default
 * `--require`); `llm` calls a real model: opt-in with `--live`, a spending cap, never in CI. A
 * hidden-state leak fails the run whatever the agent.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { t } from "@clinicalcraft/core";
import { loadContent } from "@clinicalcraft/agent/node";
import {
  benchEnvironment,
  bm,
  Budget,
  createLlmAgent,
  createOperativeReferenceAgent,
  createOperativeScriptedAgent,
  listOperativeSuites,
  LiveRunError,
  loadOperativeSuite,
  om,
  operativeLlmAgent,
  operativeMarkdown,
  operativeRefIssues,
  operativeReportPasses,
  priceFor,
  runOperativeSuite,
  scenarioVariants,
  type OperativeAgent,
  type OperativeRun,
} from "@clinicalcraft/bench";
import { flagBool, flagList, flagNumber, flagString, suggest, UsageError, type ParsedArgs } from "./argv.js";
import { parseSeeds } from "./bench.js";
import { CliError, EXIT, loadCliSettings, sessionFlagsLayer, type CliContext } from "./context.js";
import { cliVersion } from "./paths.js";

async function liveOperativeAgent(ctx: CliContext, args: ParsedArgs): Promise<{ agent: OperativeAgent; budget: Budget }> {
  const L = ctx.locale;
  if (!flagBool(args, "live")) throw new UsageError(bm(L, "cli.run.liveRequired"));
  const maxTokens = flagNumber(args, "max-tokens");
  const maxUsd = flagNumber(args, "max-usd");
  if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens < 1)) throw new UsageError(ctx.t("argv.int", { flag: "--max-tokens", max: Number.MAX_SAFE_INTEGER }));
  if (maxUsd !== undefined && !(maxUsd > 0)) throw new UsageError(ctx.t("argv.number", { flag: "--max-usd", value: String(maxUsd) }));
  if (maxTokens === undefined && maxUsd === undefined) throw new UsageError(bm(L, "cli.run.budgetRequired"));
  const settings = await loadCliSettings(ctx, await sessionFlagsLayer(ctx, args));
  try {
    const live = createLlmAgent({ live: true, settings, env: ctx.env, ...(flagString(args, "provider") ? { provider: flagString(args, "provider")! } : {}), ...(flagString(args, "model") ? { model: flagString(args, "model")! } : {}) });
    const price = priceFor(live.provider ?? "", live.model ?? "");
    if (maxUsd !== undefined && !price) throw new UsageError(bm(L, "cli.run.noPrice", { model: `${live.provider}/${live.model}` }));
    return { agent: operativeLlmAgent(live), budget: new Budget({ ...(maxTokens !== undefined ? { maxTokens } : {}), ...(maxUsd !== undefined ? { maxUsd } : {}), price }) };
  } catch (err) {
    if (!(err instanceof LiveRunError)) throw err;
    const key = err.code === "live-required" ? "cli.run.liveRequired" : err.code === "ci" ? "cli.run.ci" : err.code === "no-key" ? "cli.run.noKey" : "cli.run.offlineProvider";
    throw new CliError(bm(L, key, err.params), err.code === "no-key" || err.code === "ci" ? EXIT.error : EXIT.usage);
  }
}

/** `bench operative` */
export async function benchOperative(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const L = ctx.locale;
  const settings = await loadCliSettings(ctx);
  const content = await loadContent({ dirs: settings.contentDirs });
  const suites = await listOperativeSuites(content.dirs);
  const suiteName = flagString(args, "suite") ?? (suites.length === 1 ? suites[0]!.suite : undefined);
  if (!suiteName || !suites.some((s) => s.suite === suiteName)) {
    if (flagBool(args, "list") && !suiteName) {
      for (const s of suites) ctx.print(`${s.suite}  ${ctx.out.dim(ctx.show(s.dir))}`);
      return EXIT.ok;
    }
    const hint = suiteName ? suggest(suiteName, suites.map((s) => s.suite)) : undefined;
    throw new CliError(om(L, "cli.unknownSuite", { suite: suiteName ?? "—", list: suites.map((s) => s.suite).join(", ") || "—" }), EXIT.usage, hint ? ctx.t("argv.didYouMean", { value: hint }) : undefined);
  }
  const suite = (await loadOperativeSuite(suiteName, content.dirs))!;
  if (suite.issues.length) {
    const lines = suite.issues.flatMap((f) => [`${ctx.show(f.file)}:`, ...f.issues.slice(0, 8).map((i) => `  ${i}`)]);
    throw new CliError(om(L, "cli.invalidSuite", { suite: suiteName }), EXIT.error, lines.join("\n"));
  }
  const refIssues = suite.scenarios.flatMap((s) => operativeRefIssues(s, content).map((i) => `${s.id}: ${i}`));
  if (refIssues.length) throw new CliError(om(L, "cli.refIssues"), EXIT.error, refIssues.slice(0, 20).join("\n"));

  if (flagBool(args, "list")) {
    ctx.print(ctx.out.bold(om(L, "cli.list.header", { suite: suiteName, n: suite.scenarios.length, dir: ctx.show(suite.dir) })));
    for (const s of suite.scenarios) ctx.print(`  ${s.id.padEnd(40)} ${ctx.out.dim(`${s.split} · ${s.caseId} · ${scenarioVariants(s).join("|")} · ${s.expect}`)}  ${t(s.title, L)}`);
    return EXIT.ok;
  }

  const split = flagString(args, "split") ?? "all";
  if (!["dev", "test", "all"].includes(split)) throw new UsageError(ctx.t("argv.choice", { flag: "--split", value: split, choices: "dev | test | all" }));
  const ids = flagList(args, "scenario");
  for (const id of ids) {
    if (!suite.scenarios.some((s) => s.id === id)) {
      const hint = suggest(id, suite.scenarios.map((s) => s.id));
      throw new UsageError(bm(L, "cli.unknownScenario", { id }), hint ? ctx.t("argv.didYouMean", { value: hint }) : undefined);
    }
  }
  const variants = flagList(args, "variant");
  const picked = suite.scenarios.filter((s) => (split === "all" || s.split === split) && (!ids.length || ids.includes(s.id)) && (!variants.length || scenarioVariants(s).some((v) => variants.includes(v))));
  if (!picked.length) throw new UsageError(om(L, "cli.noScenarios"));

  const kind = flagString(args, "agent") ?? "reference";
  if (!["reference", "scripted-llm", "llm"].includes(kind)) throw new UsageError(bm(L, "cli.badAgent", { value: kind }));
  const seedsText = flagString(args, "seeds") ?? "1-3";
  const seeds = parseSeeds(seedsText);
  if (!seeds) throw new UsageError(bm(L, "cli.badSeeds", { value: seedsText }));
  let agent: OperativeAgent;
  let budget: Budget | undefined;
  if (kind === "llm") ({ agent, budget } = await liveOperativeAgent(ctx, args));
  else agent = kind === "reference" ? createOperativeReferenceAgent() : createOperativeScriptedAgent();
  const requireText = flagNumber(args, "require");
  const required = requireText !== undefined ? requireText : kind === "llm" ? null : 100;

  const report = await runOperativeSuite({
    suite,
    scenarios: picked,
    agent,
    seeds,
    content,
    environment: benchEnvironment(ctx.cwd, cliVersion()),
    ...(budget ? { budget } : {}),
    onRun: (run: OperativeRun) => {
      const mark = run.success ? ctx.err.green("✓") : run.status === "skipped" ? ctx.err.yellow("·") : ctx.err.red("✗");
      ctx.printErr(om(L, "cli.progress", { mark, scenario: run.scenarioId, variant: run.variant, seed: run.seed, outcome: om(L, `outcome.${run.outcome}`), verdict: run.verdict, steps: run.steps }));
    },
  });
  const outDir = ctx.path(flagString(args, "out") ?? "operative-results");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "operative-report.json");
  const mdPath = join(outDir, "operative-report.md");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(mdPath, operativeMarkdown(report, L), "utf8");
  const m = report.metrics.overall;
  const verdict = operativeReportPasses(report, required);
  const rate = `${verdict.successPercent.toFixed(1)} %`;
  ctx.print(om(L, "cli.summary", { agent: agent.kind, k: m.taskSuccess.k, n: m.taskSuccess.n, rate, critical: `${m.safetyCritical.k}/${m.safetyCritical.n}`, leaks: m.leaks }));
  ctx.print(om(L, "cli.written", { md: ctx.show(mdPath), json: ctx.show(jsonPath) }));
  if (verdict.leaks) ctx.printErr(ctx.err.red(om(L, "cli.leaks")));
  if (required !== null && verdict.successPercent + 1e-9 < required) ctx.printErr(ctx.err.red(om(L, "cli.below", { rate, required: `${required} %` })));
  return verdict.ok ? EXIT.ok : EXIT.error;
}
