/**
 * `clinicalcraft bench` — the embodied agent benchmark (docs/EMBODIED.md §13):
 *
 *   bench list [--suite embodied-v1] [--json]
 *   bench run --suite embodied-v1 --agent reference|scripted-llm|llm [--provider p --model m --live --max-tokens N --max-usd X]
 *             [--seeds 1-5] [--scenario ids] [--category cats] [--out dir] [--traces] [--require pct]
 *   bench demo --case stemi-inferior-rv [--lang zh-CN|en] [--out dir]
 *   bench grounding [--suite grounding-v1] [--split dev|test|all] [--track …] [--case …] [--locale …] [--tag …] [--out dir] [--compare report.json]
 *
 * Runs use the built-in content only (reproducible). `reference` and
 * `scripted-llm` validate the infrastructure and must score 100 % (the
 * default `--require`); `llm` calls a real model: opt-in with `--live`, a
 * spending cap (`--max-tokens`; `--max-usd` only with a catalogue price), a
 * configured key, never in CI. Any accepted action that violated the spatial
 * policy or the approval gate fails the run whatever the agent.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { t } from "@clinicalcraft/core";
import { loadContent } from "@clinicalcraft/agent/node";
import {
  benchEnvironment,
  bm,
  Budget,
  BENCH_CATEGORIES,
  createLlmAgent,
  createReferenceAgent,
  createScriptedAgent,
  DEFAULT_SUITE,
  demoVerdict,
  listSuites,
  LiveRunError,
  loadSuite,
  priceFor,
  reportMarkdown,
  reportPasses,
  runDemo,
  runSuite,
  type BenchAgent,
  type BenchMessageKey,
  type BenchRun,
  type BenchScenario,
  compareGroundingReports,
  DEFAULT_GROUNDING_SUITE,
  frozenStatus,
  GROUNDING_REPORT_FORMAT,
  GROUNDING_SPLITS,
  GROUNDING_TRACKS,
  groundingCompareMarkdown,
  groundingMarkdown,
  groundingRefIssues,
  listGroundingSuites,
  loadGroundingSuite,
  pct as groundingPct,
  runGrounding,
  type GroundingReport,
  type GroundingSplit,
  type GroundingTrack,
} from "@clinicalcraft/bench";
import { flagBool, flagList, flagNumber, flagString, suggest, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, sessionFlagsLayer, type CliContext } from "./context.js";
import { cliVersion } from "./paths.js";

export const BENCH_AGENTS = ["reference", "scripted-llm", "llm"] as const;

/** `1-5`, `1,2,7`, `3` → seeds (null when malformed). */
export function parseSeeds(text: string): number[] | null {
  const out: number[] = [];
  for (const part of text.split(",").map((s) => s.trim()).filter(Boolean)) {
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (b < a || b - a > 999) return null;
      for (let s = a; s <= b; s++) out.push(s);
    } else if (/^\d+$/.test(part)) out.push(Number(part));
    else return null;
  }
  return out.length ? [...new Set(out)] : null;
}

async function suiteOrFail(ctx: CliContext, args: ParsedArgs): Promise<{ suite: string; scenarios: BenchScenario[] }> {
  const suite = flagString(args, "suite") ?? DEFAULT_SUITE;
  const loaded = await loadSuite(suite);
  if (!loaded) {
    const suites = await listSuites();
    const hint = suggest(suite, suites);
    throw new CliError(bm(ctx.locale, "cli.unknownSuite", { suite, list: suites.join(", ") || "—" }), EXIT.usage, hint ? ctx.t("argv.didYouMean", { value: hint }) : undefined);
  }
  if (loaded.issues.length) {
    const lines = loaded.issues.flatMap((f) => [`${ctx.show(f.file)}:`, ...f.issues.slice(0, 5).map((i) => `  ${i}`)]);
    throw new CliError(bm(ctx.locale, "cli.invalidSuite", { suite }), EXIT.error, lines.join("\n"));
  }
  return { suite, scenarios: loaded.scenarios };
}

/** `bench list` */
export async function benchList(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const { suite, scenarios } = await suiteOrFail(ctx, args);
  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify(scenarios.map((s) => ({ id: s.id, category: s.category, caseId: s.caseId, facilityId: s.facilityId ?? null, locale: s.locale, title: s.title })), null, 2));
    return EXIT.ok;
  }
  ctx.print(ctx.out.bold(bm(ctx.locale, "cli.list.header", { suite, n: scenarios.length })));
  for (const c of BENCH_CATEGORIES) {
    const own = scenarios.filter((s) => s.category === c);
    if (!own.length) continue;
    ctx.print("");
    ctx.print(ctx.out.cyan(bm(ctx.locale, `category.${c}` as BenchMessageKey)));
    for (const s of own) ctx.print(`  ${s.id.padEnd(46)} ${ctx.out.dim(`${s.caseId} · ${s.locale}`)}  ${t(s.title, ctx.locale)}`);
  }
  return EXIT.ok;
}

function selectScenarios(ctx: CliContext, args: ParsedArgs, all: readonly BenchScenario[]): BenchScenario[] {
  const ids = flagList(args, "scenario");
  const categories = flagList(args, "category");
  for (const id of ids) {
    if (!all.some((s) => s.id === id)) {
      const hint = suggest(id, all.map((s) => s.id));
      throw new UsageError(bm(ctx.locale, "cli.unknownScenario", { id }), hint ? ctx.t("argv.didYouMean", { value: hint }) : undefined);
    }
  }
  for (const c of categories) if (!(BENCH_CATEGORIES as readonly string[]).includes(c)) throw new UsageError(ctx.t("argv.choice", { flag: "--category", value: c, choices: BENCH_CATEGORIES.join(" | ") }));
  const picked = all.filter((s) => (!ids.length || ids.includes(s.id)) && (!categories.length || categories.includes(s.category)));
  if (!picked.length) throw new UsageError(bm(ctx.locale, "cli.run.noScenarios"));
  return picked;
}

async function liveAgent(ctx: CliContext, args: ParsedArgs): Promise<{ agent: BenchAgent; budget: Budget }> {
  const L = ctx.locale;
  if (!flagBool(args, "live")) throw new UsageError(bm(L, "cli.run.liveRequired"));
  const maxTokens = flagNumber(args, "max-tokens");
  const maxUsd = flagNumber(args, "max-usd");
  if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens < 1)) throw new UsageError(ctx.t("argv.int", { flag: "--max-tokens", max: Number.MAX_SAFE_INTEGER }));
  if (maxUsd !== undefined && !(maxUsd > 0)) throw new UsageError(ctx.t("argv.number", { flag: "--max-usd", value: String(maxUsd) }));
  if (maxTokens === undefined && maxUsd === undefined) throw new UsageError(bm(L, "cli.run.budgetRequired"));
  const flags = await sessionFlagsLayer(ctx, args);
  const settings = await loadCliSettings(ctx, flags);
  let agent: BenchAgent;
  try {
    agent = createLlmAgent({ live: true, settings, env: ctx.env, ...(flagString(args, "provider") ? { provider: flagString(args, "provider")! } : {}), ...(flagString(args, "model") ? { model: flagString(args, "model")! } : {}) });
  } catch (err) {
    if (!(err instanceof LiveRunError)) throw err;
    const key = err.code === "live-required" ? "cli.run.liveRequired" : err.code === "ci" ? "cli.run.ci" : err.code === "no-key" ? "cli.run.noKey" : "cli.run.offlineProvider";
    throw new CliError(bm(L, key, err.params), err.code === "no-key" || err.code === "ci" ? EXIT.error : EXIT.usage);
  }
  const price = priceFor(agent.provider ?? "", agent.model ?? "");
  if (maxUsd !== undefined && !price) throw new UsageError(bm(L, "cli.run.noPrice", { model: `${agent.provider}/${agent.model}` }));
  return { agent, budget: new Budget({ ...(maxTokens !== undefined ? { maxTokens } : {}), ...(maxUsd !== undefined ? { maxUsd } : {}), price }) };
}

/** `bench run` */
export async function benchRun(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const L = ctx.locale;
  const kind = flagString(args, "agent") ?? "reference";
  if (!(BENCH_AGENTS as readonly string[]).includes(kind)) throw new UsageError(bm(L, "cli.badAgent", { value: kind }));
  const seedsText = flagString(args, "seeds") ?? "1-3";
  const seeds = parseSeeds(seedsText);
  if (!seeds) throw new UsageError(bm(L, "cli.badSeeds", { value: seedsText }));
  const { suite, scenarios } = await suiteOrFail(ctx, args);
  const picked = selectScenarios(ctx, args, scenarios);
  let agent: BenchAgent;
  let budget: Budget | undefined;
  if (kind === "llm") ({ agent, budget } = await liveAgent(ctx, args));
  else agent = kind === "reference" ? createReferenceAgent() : createScriptedAgent();
  const requireText = flagNumber(args, "require");
  const required = requireText !== undefined ? requireText : kind === "llm" ? null : 100;
  const outDir = ctx.path(flagString(args, "out") ?? "bench-results");
  const traces = flagBool(args, "traces");
  if (traces) await mkdir(join(outDir, "traces"), { recursive: true });

  // Built-in content only: a benchmark must not depend on the user's content directories.
  const content = await loadContent({ dirs: [] });
  const report = await runSuite({
    suite,
    scenarios: picked,
    agent,
    seeds,
    content,
    ...(budget ? { budget } : {}),
    environment: benchEnvironment(ctx.cwd, cliVersion()),
    onRun: (run: BenchRun) => {
      const mark = run.success ? ctx.err.green("✓") : run.status === "skipped" ? ctx.err.yellow("·") : ctx.err.red("✗");
      ctx.printErr(bm(L, "cli.run.progress", { mark, scenario: run.scenarioId, seed: run.seed, calls: run.calls.length, ms: run.wallMs }));
    },
    ...(traces ? { onTrace: (run: BenchRun, jsonl: string) => void writeFile(join(outDir, "traces", `${run.scenarioId}.s${run.seed}.jsonl`), jsonl, "utf8") } : {}),
  });

  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "bench-report.json");
  const mdPath = join(outDir, "bench-report.md");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(mdPath, reportMarkdown(report, L), "utf8");
  const m = report.metrics.overall;
  const verdict = reportPasses(report, required);
  const rate = `${verdict.successPercent.toFixed(1)} %`;
  ctx.print(bm(L, "cli.run.summary", { agent: agent.kind, success: m.taskSuccess.k, runs: m.taskSuccess.n, rate, spatial: `${m.spatialViolations.k}/${m.spatialViolations.n}`, unauthorised: `${m.unauthorisedAcceptance.k}/${m.unauthorisedAcceptance.n}` }));
  ctx.print(bm(L, "cli.run.written", { md: ctx.show(mdPath), json: ctx.show(jsonPath) }));
  if (traces) ctx.print(bm(L, "cli.run.traces", { dir: ctx.show(join(outDir, "traces")) }));
  if (verdict.violations) ctx.printErr(ctx.err.red(bm(L, "cli.run.violations")));
  if (required !== null && verdict.successPercent + 1e-9 < required) ctx.printErr(ctx.err.red(bm(L, "cli.run.below", { rate, required: `${required} %` })));
  return verdict.ok ? EXIT.ok : EXIT.error;
}

/** `bench demo` */
export async function benchDemo(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const L = ctx.locale;
  const caseId = flagString(args, "case") ?? "stemi-inferior-rv";
  const content = await loadContent({ dirs: [] });
  if (!content.cases.has(caseId)) {
    const hint = suggest(caseId, [...content.cases.keys()]);
    throw new CliError(ctx.t("cases.unknown", { id: caseId }), EXIT.usage, hint ? ctx.t("argv.didYouMean", { value: hint }) : undefined);
  }
  const facilityId = flagString(args, "facility");
  if (facilityId && !content.facilities.has(facilityId)) throw new CliError(ctx.t("facilities.unknown", { id: facilityId }), EXIT.usage);
  const result = await runDemo({ caseId, locale: L, content, ...(facilityId ? { facilityId } : {}), environment: benchEnvironment(ctx.cwd, cliVersion()) });
  const outDir = ctx.path(flagString(args, "out") ?? "bench-demo");
  await mkdir(outDir, { recursive: true });
  const tracePath = join(outDir, "trace.jsonl");
  const mdPath = join(outDir, "demo.md");
  await writeFile(tracePath, result.jsonl, "utf8");
  await writeFile(mdPath, result.markdown, "utf8");
  ctx.print(demoVerdict(result, L));
  ctx.print(bm(L, "cli.demo.written", { md: ctx.show(mdPath), trace: ctx.show(tracePath) }));
  if (!result.ok) {
    ctx.printErr(ctx.err.red(bm(L, "cli.demo.failed", { md: ctx.show(mdPath) })));
    return EXIT.error;
  }
  return EXIT.ok;
}

/**
 * `bench grounding` — the grounding benchmark (docs/GROUNDING.md): held-out
 * items through the deterministic layer every agent stands on, offline.
 * Built-in content only; a measurement, so it exits 0 unless the suite or
 * its references are invalid.
 */
export async function benchGrounding(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const L = ctx.locale;
  const suiteName = flagString(args, "suite") ?? DEFAULT_GROUNDING_SUITE;
  const loaded = await loadGroundingSuite(suiteName);
  if (!loaded) {
    const suites = await listGroundingSuites();
    const hint = suggest(suiteName, suites);
    throw new CliError(bm(L, "grounding.cli.unknownSuite", { suite: suiteName, list: suites.join(", ") || "—" }), EXIT.usage, hint ? ctx.t("argv.didYouMean", { value: hint }) : undefined);
  }
  if (loaded.issues.length) {
    const lines = loaded.issues.flatMap((f) => [`${ctx.show(f.file)}:`, ...f.issues.slice(0, 8).map((i) => `  ${i}`)]);
    throw new CliError(bm(L, "grounding.cli.invalid", { suite: suiteName }), EXIT.error, lines.join("\n"));
  }
  const splitText = flagString(args, "split") ?? "all";
  if (!["dev", "test", "all"].includes(splitText)) throw new UsageError(bm(L, "grounding.cli.badSplit", { value: splitText }));
  const splits: GroundingSplit[] = splitText === "all" ? [...GROUNDING_SPLITS] : [splitText as GroundingSplit];
  const tracks = flagList(args, "track");
  for (const track of tracks) {
    if (!(GROUNDING_TRACKS as readonly string[]).includes(track)) throw new UsageError(bm(L, "grounding.cli.badTrack", { value: track, list: GROUNDING_TRACKS.join(" | ") }));
  }
  // The report to compare with is read first: a bad path fails before the run.
  const compareFile = flagString(args, "compare");
  let before: GroundingReport | null = null;
  if (compareFile) {
    try {
      before = JSON.parse(await readFile(ctx.path(compareFile), "utf8")) as GroundingReport;
      if (before.format !== GROUNDING_REPORT_FORMAT) throw new Error(before.format);
    } catch {
      throw new CliError(bm(L, "grounding.cli.badCompare", { file: ctx.show(ctx.path(compareFile)) }), EXIT.usage);
    }
  }
  // Built-in content only: the benchmark must not depend on the user's content directories.
  const content = await loadContent({ dirs: [] });
  const refIssues = loaded.files.flatMap((f) => groundingRefIssues(f.set, content).map((i) => `${f.path}: ${i}`));
  if (refIssues.length) throw new CliError(bm(L, "grounding.cli.refIssues"), EXIT.error, refIssues.slice(0, 20).join("\n"));
  const report = runGrounding({
    suite: loaded,
    splits,
    content,
    filter: { tracks: tracks as GroundingTrack[], cases: flagList(args, "case"), locales: flagList(args, "locale"), tags: flagList(args, "tag") },
    environment: benchEnvironment(ctx.cwd, cliVersion()),
  });
  if (report.items.length === 0) throw new UsageError(bm(L, "grounding.cli.noItems"));
  // An edited held-out split is still evaluated, but its numbers are not the published ones (docs/GROUNDING.md §3).
  for (const [split, digest] of Object.entries(report.digests)) {
    if (frozenStatus(report.suite, split as GroundingSplit, digest) === "modified") ctx.printErr(ctx.err.yellow(bm(L, "grounding.cli.modified", { split })));
  }

  const compare = before ? groundingCompareMarkdown(compareGroundingReports(before, report), L, ctx.show(ctx.path(compareFile!))) : "";

  const outDir = ctx.path(flagString(args, "out") ?? "grounding-results");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "grounding-report.json");
  const mdPath = join(outDir, "grounding-report.md");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const failures = flagNumber(args, "failures");
  await writeFile(mdPath, `${groundingMarkdown(report, L, failures !== undefined ? { failures } : {})}${compare ? `\n${compare}` : ""}`, "utf8");
  const m = report.metrics;
  ctx.print(bm(L, "grounding.cli.summary", { suite: report.suite, splits: splits.join("+"), k: m.overall.k, n: m.overall.n, rate: groundingPct(m.overall) }));
  for (const t of m.tracks) ctx.print(bm(L, "grounding.cli.track", { track: t.track, k: t.accuracy.k, n: t.accuracy.n, rate: groundingPct(t.accuracy) }));
  for (const t of m.byTag) ctx.print(bm(L, "grounding.cli.tag", { tag: t.tag, k: t.accuracy.k, n: t.accuracy.n, rate: groundingPct(t.accuracy) }));
  if (compare) ctx.print(compare);
  ctx.print(bm(L, "grounding.cli.written", { md: ctx.show(mdPath), json: ctx.show(jsonPath) }));
  return EXIT.ok;
}
