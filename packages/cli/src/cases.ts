/**
 * `clinicalcraft cases list|index|show|validate|verify|new|schema`.
 */
import { existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  caseCapabilityGaps,
  checkCaseIntegrity,
  distinctHistoryHits,
  hasHistoryTwins,
  historyTwin,
  IdSchema,
  matchHistory,
  parseCase,
  supersededIn,
  t,
  verifyCase,
  type CaseDefinition,
  type Issue,
  type MatchHit,
} from "@clinicalcraft/core";
import { buildCaseIndex, builtinContentDir, findProjectRoot, loadContent, type CaseIndexIssue, type LoadedContent } from "@clinicalcraft/agent/node";
import { sanitizeTerminal, table } from "@clinicalcraft/agent";
import { flagBool, flagString, suggest, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, contentDirsHint, EXIT, hints, loadCliSettings, type CliContext } from "./context.js";
import { clockModeLabel, languagesLabel, minutesLabel, provenanceLabel, settingLabel, specialtiesLabel, stars } from "./labels.js";
import { sortedCases } from "./picker.js";
import { caseTemplate, readmeTemplate } from "./scaffold.js";

/** The patient pipeline selects facts scoring ≥ 0.55 (docs/ARCHITECTURE.md §4.2). */
export const UTTERANCE_SELECT_THRESHOLD = 0.55;
/** …within this much of the best score… */
export const UTTERANCE_SELECT_RELATIVE = 0.25;
/** …and at most this many. */
export const UTTERANCE_MAX_SELECTED = 3;

interface TestUtterance {
  text: string;
  locale: string;
  expect: string[];
  /** Further ids the pipeline may select with the expected ones without a warning. */
  alsoOk?: string[];
}

/** Read `extensions.testUtterances` defensively. */
export function testUtterances(c: CaseDefinition): TestUtterance[] | null {
  const raw = (c.extensions as Record<string, unknown>).testUtterances;
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (u): u is TestUtterance =>
      !!u && typeof u === "object" && typeof (u as TestUtterance).text === "string" && typeof (u as TestUtterance).locale === "string" && Array.isArray((u as TestUtterance).expect),
  );
}

/** True when two items' phase restrictions overlap (no `phases` = every phase). */
function sharePhase(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  return !a || !b || a.some((p) => b.includes(p));
}

/**
 * Hits on items superseded by a phase twin in `phase` counted for the twin
 * (`historyTwin`, best score kept), as the patient pipeline selects them;
 * other hits are kept whatever their phases. Identity without `phase` or
 * twins.
 */
function withPhaseTwins(c: CaseDefinition, hits: readonly MatchHit[], phase: string | undefined): MatchHit[] {
  if (phase === undefined || !hasHistoryTwins(c)) return [...hits];
  const best = new Map<string, number>();
  for (const h of hits) {
    const id = supersededIn(c, h.id, phase) !== null ? (historyTwin(c, h.id, phase) ?? h.id) : h.id;
    best.set(id, Math.max(best.get(id) ?? 0, h.score));
  }
  const order = new Map(c.history.map((h, i) => [h.id, i]));
  return [...best].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/**
 * Run the matcher regression corpus: hits ≥ 0.55 must contain every expected
 * id with an expected id ranked first; `expect: []` must select nothing.
 * `extras` (warnings) lists facts the patient pipeline would also select and
 * credit with the expected ones — ≥ 0.55, within 0.25 of the best, at most 3,
 * available in a phase of the first expected item — that are neither
 * expected nor in the utterance's `alsoOk`. Phase twins (`supersedes`) apply
 * in the first phase of the first expected item: a hit on an item superseded
 * there counts for its twin, as in the pipeline; so does `distinctHistoryHits`
 * (a hit that a more specific one accounts for entirely is not selected).
 */
export function checkUtterances(c: CaseDefinition): { total: number; failures: Issue[]; extras: Issue[] } {
  const corpus = testUtterances(c) ?? [];
  const failures: Issue[] = [];
  const extras: Issue[] = [];
  const byId = new Map(c.history.map((h) => [h.id, h]));
  corpus.forEach((u, i) => {
    const path = `extensions.testUtterances.${i}`;
    for (const id of u.expect) if (!byId.has(id)) failures.push({ path, message: `unknown history id "${id}"`, severity: "error" });
    const phase = u.expect.length > 0 ? byId.get(u.expect[0]!)?.phases?.[0] : undefined;
    const strong = withPhaseTwins(c, matchHistory(c, u.text, u.locale), phase).filter((h) => h.score >= UTTERANCE_SELECT_THRESHOLD);
    const selected = distinctHistoryHits(c, u.text, u.locale, strong, phase);
    const got = selected.map((h) => h.id);
    if (u.expect.length === 0) {
      if (got.length > 0) failures.push({ path, message: `"${u.text}" should select nothing, selected ${got.join(", ")}`, severity: "error" });
      return;
    }
    const missing = u.expect.filter((id) => !got.includes(id));
    if (missing.length > 0 || !u.expect.includes(got[0]!)) {
      failures.push({ path, message: `"${u.text}" (${u.locale}) expected ${u.expect.join(", ")}, selected ${got.length ? got.join(", ") : "nothing"}`, severity: "error" });
      return;
    }
    const phases = byId.get(u.expect[0]!)?.phases;
    const inPhase = selected.filter((h) => sharePhase(phases, byId.get(h.id)?.phases));
    const best = inPhase[0]?.score ?? 0;
    const pipeline = inPhase.filter((h) => h.score >= best - UTTERANCE_SELECT_RELATIVE).slice(0, UTTERANCE_MAX_SELECTED);
    const allowed = new Set([...u.expect, ...(Array.isArray(u.alsoOk) ? u.alsoOk : [])]);
    const extra = pipeline.filter((h) => !allowed.has(h.id));
    if (extra.length > 0) {
      extras.push({ path, message: `"${u.text}" (${u.locale}) also selects ${extra.map((h) => `${h.id} (${h.score.toFixed(2)})`).join(", ")} (list it in alsoOk if intended)`, severity: "warning" });
    }
  });
  return { total: corpus.length, failures, extras };
}

function printIssues(ctx: CliContext, issues: readonly Issue[], showWarnings: boolean, limit = 50): void {
  const p = ctx.out;
  let shown = 0;
  for (const issue of issues) {
    if (issue.severity === "warning" && !showWarnings) continue;
    if (shown++ >= limit) {
      ctx.print(p.dim(`    … ${ctx.t("cases.moreIssues", { n: issues.length - limit })}`));
      break;
    }
    const tag = issue.severity === "error" ? p.red("error  ") : p.yellow("warning");
    // Paths and messages quote case content (utterances, ids, regexes): terminal-sanitised.
    ctx.print(`    ${tag} ${p.dim(sanitizeTerminal(issue.path || "(root)"))} ${sanitizeTerminal(issue.message)}`);
  }
}

async function loadAll(ctx: CliContext): Promise<LoadedContent> {
  const settings = await loadCliSettings(ctx);
  return loadContent({ dirs: settings.contentDirs });
}

function findCase(ctx: CliContext, content: LoadedContent, id: string): { def: CaseDefinition; dir: string; file: string } {
  const entry = content.cases.get(id);
  if (entry) return entry;
  const hint = suggest(id, [...content.cases.keys()]);
  throw new CliError(ctx.t("cases.unknown", { id }), EXIT.usage, hints(hint ? ctx.t("argv.didYouMean", { value: hint }) : ctx.t("cases.available", { list: [...content.cases.keys()].join(", ") }), contentDirsHint(ctx, content)));
}

/* ------------------------------------------------------------------ */
/* list / show                                                         */
/* ------------------------------------------------------------------ */

export async function casesList(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const content = await loadAll(ctx);
  const cases = sortedCases(content, ctx.locale);
  if (flagBool(args, "json")) {
    ctx.print(
      JSON.stringify(
        cases.map((c) => ({
          id: c.id,
          title: t(c.title, ctx.locale),
          summary: t(c.summary, ctx.locale),
          specialty: c.specialty,
          difficulty: c.difficulty,
          setting: c.setting,
          estimatedMinutes: c.estimatedMinutes ?? null,
          locales: c.locales,
          provenance: c.provenance.kind,
          file: content.cases.get(c.id)?.file ?? null,
        })),
        null,
        2,
      ),
    );
    return EXIT.ok;
  }
  const rows = [[ctx.t("col.id"), ctx.t("col.title"), ctx.t("col.difficulty"), ctx.t("col.setting"), ctx.t("col.minutes")]];
  for (const c of cases) rows.push([c.id, sanitizeTerminal(t(c.title, ctx.locale)), stars(c.difficulty), settingLabel(ctx, c.setting), c.estimatedMinutes ? String(c.estimatedMinutes) : "-"]);
  ctx.print(table(rows, { header: true, maxCell: 60 }));
  const broken = content.issues.filter((f) => f.file.endsWith("case.json") && f.issues.some((i) => i.severity === "error"));
  for (const f of broken) ctx.printErr(ctx.err.red(ctx.t("cases.invalidFile", { file: sanitizeTerminal(f.file), n: f.issues.filter((i) => i.severity === "error").length })));
  return EXIT.ok;
}

/** One index problem, localised (the file path as found; ids and paths terminal-sanitised). */
function indexIssueText(ctx: CliContext, issue: CaseIndexIssue): string {
  const file = sanitizeTerminal(issue.file);
  const id = sanitizeTerminal(issue.id ?? "");
  switch (issue.code) {
    case "unreadable":
      return ctx.t("cases.index.unreadable", { file });
    case "invalid-json":
      return ctx.t("cases.index.invalidJson", { file });
    case "missing-id":
      return ctx.t("cases.index.missingId", { file });
    case "duplicate-id":
      return ctx.t(issue.severity === "warning" ? "cases.index.overridden" : "cases.index.duplicate", { file, id, used: sanitizeTerminal(issue.usedFile ?? "") });
  }
}

/**
 * `cases index [--json]`: the library index — the metadata the web library,
 * `clinicalcraft serve` (`GET /api/content/cases`) and this command share
 * (`caseIndexEntry`), read from the case files without validating them, in
 * library order. Problems (unreadable files, invalid JSON, duplicate ids) go
 * to stderr.
 */
export async function casesIndex(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const builtin = builtinContentDir();
  const dirs = [...new Set([...(builtin ? [builtin] : []), ...settings.contentDirs.map((d) => resolve(d))])];
  const index = await buildCaseIndex({ dirs });
  if (flagBool(args, "json")) ctx.print(JSON.stringify(index.entries, null, 2));
  else {
    const rows = [[ctx.t("col.id"), ctx.t("col.title"), ctx.t("col.difficulty"), ctx.t("col.setting"), ctx.t("col.minutes"), ctx.t("col.hash")]];
    for (const e of index.entries) {
      rows.push([sanitizeTerminal(e.id), sanitizeTerminal(t(e.title, ctx.locale)), stars(e.difficulty), settingLabel(ctx, sanitizeTerminal(e.setting)), e.estimatedMinutes ? String(e.estimatedMinutes) : "-", e.contentHash]);
    }
    ctx.print(table(rows, { header: true, maxCell: 60 }));
    ctx.print(ctx.out.dim(ctx.t("cases.index.summary", { n: index.entries.length, dirs: dirs.length })));
  }
  for (const issue of index.issues) {
    const text = indexIssueText(ctx, issue);
    ctx.printErr(issue.severity === "error" ? ctx.err.red(text) : ctx.err.yellow(text));
  }
  return EXIT.ok;
}

export async function casesShow(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const id = args.positionals[0];
  if (!id) throw new UsageError(ctx.t("cases.needId"));
  const content = await loadAll(ctx);
  const { def: c, file } = findCase(ctx, content, id);
  const L = ctx.locale;
  if (flagBool(args, "json")) {
    const { solution, ...publicView } = c;
    ctx.print(JSON.stringify(flagBool(args, "full") ? c : publicView, null, 2));
    void solution;
    return EXIT.ok;
  }
  const p = ctx.out;
  // Case files may come from any content directory: every text from them is terminal-sanitised
  // (escape sequences — colours included — and control characters stripped) before the palette's codes.
  const ct = (text: Parameters<typeof t>[0]) => sanitizeTerminal(t(text, L));
  const raw = (text: string) => sanitizeTerminal(text);
  ctx.print(`${p.bold(ct(c.title))} ${p.dim(`(${raw(c.id)} v${raw(c.version)})`)}`);
  ctx.print(ct(c.summary));
  ctx.print();
  const pt = c.patient;
  ctx.print(`${p.bold(ctx.t("show.patient"))} ${ct(pt.displayName)} · ${ctx.t(`age.${pt.ageUnit}` as "age.years", { n: pt.age })} · ${ctx.t(`sex.${pt.sex}` as "sex.male")}`);
  ctx.print(`${p.bold(ctx.t("show.complaint"))} ${ct(pt.chiefComplaint)}`);
  // The facility by its name in the UI language (its id when it is not installed).
  const facility = c.facility ? content.facilities.get(c.facility)?.def : undefined;
  const facilityName = raw(c.facility ? (facility ? t(facility.name, L) || c.facility : c.facility) : "");
  ctx.print(
    `${p.bold(ctx.t("show.setting"))} ${settingLabel(ctx, c.setting)}${facilityName ? ` · ${facilityName}` : ""} · ${stars(c.difficulty)} · ${specialtiesLabel(ctx, c.specialty)}${c.estimatedMinutes ? ` · ${minutesLabel(ctx, c.estimatedMinutes)}` : ""}`,
  );
  ctx.print(`${p.bold(ctx.t("show.locales"))} ${languagesLabel(ctx, c.locales)} · ${clockModeLabel(ctx, c.clock.mode)}`);
  const prov = c.provenance;
  ctx.print(`${p.bold(ctx.t("show.provenance"))} ${provenanceLabel(ctx, prov.kind)}${prov.citation ? ` — ${raw(prov.citation)}` : ""}${prov.doi ? ` (doi:${raw(prov.doi)})` : ""}`);
  if (c.disclaimer) ctx.print(p.dim(ct(c.disclaimer)));
  ctx.print();
  ctx.print(p.bold(ctx.t("show.objectives")));
  c.objectives.forEach((o, i) => ctx.print(`  ${i + 1}. ${ct(o.title)}`));
  ctx.print();
  ctx.print(
    p.dim(
      ctx.t("show.counts", {
        history: c.history.length,
        exam: c.exam.length,
        investigations: c.investigations.length,
        interventions: c.interventions.length,
        decisions: c.decisions.length,
        rubric: c.rubric.length,
      }),
    ),
  );
  const localOnly = c.assets.filter((a) => a.localOnly);
  if (localOnly.length) ctx.print(p.dim(ctx.t("show.localAssets", { n: localOnly.length })));
  ctx.print(p.dim(raw(file)));
  return EXIT.ok;
}

/* ------------------------------------------------------------------ */
/* validate / verify                                                   */
/* ------------------------------------------------------------------ */

/** Every `cases/<id>/case.json` under the content directories. */
export async function caseFiles(contentDirs: readonly string[]): Promise<string[]> {
  const out: string[] = [];
  const builtin = builtinContentDir();
  const dirs = [...(builtin ? [builtin] : []), ...contentDirs.map((d) => resolve(d))];
  for (const dir of [...new Set(dirs)]) {
    let entries: string[] = [];
    try {
      entries = (await readdir(join(dir, "cases"), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    } catch {
      continue;
    }
    for (const name of entries) {
      const file = join(dir, "cases", name, "case.json");
      if (existsSync(file)) out.push(file);
    }
  }
  return out;
}

export interface FileValidation {
  file: string;
  id: string | null;
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  def: CaseDefinition | null;
}

/** Schema + referential-integrity validation of one case file. */
/**
 * Capability issues of a case in its own facility (`caseCapabilityGaps`): an
 * error when an objective or decision cannot be completed there, a warning
 * when only the reference solution uses an item the facility lacks.
 */
export function facilityIssues(c: CaseDefinition, content: Pick<LoadedContent, "facilities" | "catalogs"> | undefined): Issue[] {
  if (!c.facility || !content) return [];
  const f = content.facilities.get(c.facility)?.def;
  if (!f) return [];
  const listed = (f.catalogs ?? []).map((id) => content.catalogs.get(id)?.def).filter((x): x is NonNullable<typeof x> => !!x);
  const catalogs = listed.length > 0 ? listed : [...content.catalogs.values()].map((e) => e.def);
  return caseCapabilityGaps(c, f, catalogs).map((g) => ({
    path: "facility",
    message: `facility "${f.id}" lacks ${g.missing.join(", ")} for ${g.kind} "${g.id}" (needed by ${g.neededBy.join(", ")})${g.blocking ? ": the case cannot be completed there" : ""}`,
    severity: g.blocking ? ("error" as const) : ("warning" as const),
  }));
}

export async function validateCaseFile(file: string, content?: Pick<LoadedContent, "facilities" | "catalogs">): Promise<FileValidation> {
  let json: unknown;
  try {
    json = JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, ""));
  } catch (err) {
    const message = err instanceof SyntaxError ? `invalid JSON: ${err.message}` : `cannot read: ${(err as Error).message}`;
    return { file, id: null, ok: false, errors: [{ path: "", message, severity: "error" }], warnings: [], def: null };
  }
  const parsed = parseCase(json);
  if (!parsed.ok) {
    const id = json && typeof json === "object" && typeof (json as { id?: unknown }).id === "string" ? (json as { id: string }).id : null;
    return { file, id, ok: false, errors: parsed.issues.filter((i) => i.severity === "error"), warnings: parsed.issues.filter((i) => i.severity === "warning"), def: null };
  }
  const issues = [...parsed.warnings, ...checkCaseIntegrity(parsed.value), ...facilityIssues(parsed.value, content)];
  const dirName = basename(dirname(file));
  if (basename(file) === "case.json" && dirName !== parsed.value.id) issues.push({ path: "id", message: `case id "${parsed.value.id}" differs from its directory name "${dirName}"`, severity: "warning" });
  const errors = issues.filter((i) => i.severity === "error");
  return { file, id: parsed.value.id, ok: errors.length === 0, errors, warnings: issues.filter((i) => i.severity === "warning"), def: parsed.value };
}

function resolveTargets(ctx: CliContext, paths: readonly string[]): string[] {
  return paths.map((p) => {
    const abs = ctx.path(p);
    try {
      if (statSync(abs).isDirectory()) return join(abs, "case.json");
    } catch {
      /* reported when read */
    }
    return abs;
  });
}

export async function casesValidate(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const all = flagBool(args, "all") || args.positionals.length === 0;
  const files = all ? await caseFiles(settings.contentDirs) : resolveTargets(ctx, args.positionals);
  if (all && args.positionals.length > 0) files.push(...resolveTargets(ctx, args.positionals));
  if (files.length === 0) throw new CliError(ctx.t("cases.noFiles"), EXIT.error);
  // Facilities and catalogs of the same content directories: a case must be completable in its own facility.
  const content = await loadContent({ dirs: settings.contentDirs });
  const results = await Promise.all([...new Set(files)].map((f) => validateCaseFile(f, content)));
  const failed = results.filter((r) => !r.ok).length;
  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify(results.map(({ def, ...r }) => (void def, r)), null, 2));
    return failed > 0 ? EXIT.error : EXIT.ok;
  }
  const p = ctx.out;
  const showWarnings = !flagBool(args, "quiet");
  for (const r of results) {
    const rel = sanitizeTerminal(ctx.show(r.file));
    const label = r.ok ? p.green("✓") : p.red("✗");
    const counts = ctx.t("cases.counts", { errors: r.errors.length, warnings: r.warnings.length });
    // The id of a file that failed to parse is whatever string it holds.
    ctx.print(`${label} ${rel}${r.id ? p.dim(` (${sanitizeTerminal(r.id)})`) : ""} ${p.dim(counts)}`);
    printIssues(ctx, [...r.errors, ...r.warnings], showWarnings);
  }
  ctx.print(failed > 0 ? p.red(ctx.t("cases.validateFailed", { failed, total: results.length })) : p.green(ctx.t("cases.validateOk", { total: results.length })));
  return failed > 0 ? EXIT.error : EXIT.ok;
}

export interface CaseVerification {
  id: string;
  ok: boolean;
  steps: number;
  objectives: { done: number; total: number };
  decisions: { decided: number; total: number };
  /** `extra`: utterances that also select (and credit) unexpected facts (warnings). */
  utterances: { total: number; failed: number; extra: number };
  issues: Issue[];
}

/** Replay the reference solution and run the utterance corpus. */
export function verifyCaseDefinition(c: CaseDefinition): CaseVerification {
  const integrity = checkCaseIntegrity(c);
  const result = verifyCase(c);
  const corpus = checkUtterances(c);
  const issues: Issue[] = [...integrity.filter((i) => i.severity === "error"), ...result.issues, ...corpus.failures, ...corpus.extras];
  if (testUtterances(c) === null) issues.push({ path: "extensions.testUtterances", message: "missing matcher regression corpus (15–40 bilingual utterances)", severity: "warning" });
  if (c.solution.length === 0) issues.push({ path: "solution", message: "no reference solution", severity: "error" });
  const a = result.assessment;
  return {
    id: c.id,
    ok: issues.every((i) => i.severity !== "error") && result.ok,
    steps: c.solution.length,
    objectives: { done: a.objectives.filter((o) => o.done).length, total: a.objectives.length },
    decisions: { decided: a.decisions.filter((d) => d.decided).length, total: a.decisions.length },
    utterances: { total: corpus.total, failed: corpus.failures.length, extra: corpus.extras.length },
    issues,
  };
}

export async function casesVerify(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const content = await loadAll(ctx);
  const all = flagBool(args, "all");
  if (!all && args.positionals.length === 0) throw new UsageError(ctx.t("cases.verifyNeedId"));
  const defs = all ? sortedCases(content, "en") : args.positionals.map((id) => findCase(ctx, content, id).def);
  const results = defs.map((c) => verifyCaseDefinition(c));
  const failed = results.filter((r) => !r.ok).length;
  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify(results, null, 2));
    return failed > 0 ? EXIT.error : EXIT.ok;
  }
  const p = ctx.out;
  for (const r of results) {
    const label = r.ok ? p.green("✓") : p.red("✗");
    ctx.print(
      `${label} ${r.id} ${p.dim(
        ctx.t("cases.verifyLine", {
          steps: r.steps,
          done: r.objectives.done,
          objectives: r.objectives.total,
          decided: r.decisions.decided,
          decisions: r.decisions.total,
          passed: r.utterances.total - r.utterances.failed,
          utterances: r.utterances.total,
        }),
      )}`,
    );
    printIssues(ctx, r.issues, !flagBool(args, "quiet"));
  }
  if (all) {
    const loadErrors = content.issues.filter((f) => f.file.endsWith("case.json") && f.issues.some((i) => i.severity === "error"));
    for (const f of loadErrors) ctx.print(p.red(ctx.t("cases.invalidFile", { file: f.file, n: f.issues.filter((i) => i.severity === "error").length })));
    if (loadErrors.length > 0) return EXIT.error;
  }
  ctx.print(failed > 0 ? p.red(ctx.t("cases.verifyFailed", { failed, total: results.length })) : p.green(ctx.t("cases.verifyOk", { total: results.length })));
  return failed > 0 ? EXIT.error : EXIT.ok;
}

/* ------------------------------------------------------------------ */
/* new / schema                                                        */
/* ------------------------------------------------------------------ */

/** Default directory for new cases: `<repo>/packages/content/cases` in a checkout, else `<cwd>/cases`. */
export function defaultCasesDir(ctx: CliContext): string {
  const root = findProjectRoot(ctx.cwd, ctx.env);
  if (root && existsSync(join(root, "packages", "content", "cases"))) return join(root, "packages", "content", "cases");
  return join(ctx.cwd, "cases");
}

export async function casesNew(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const id = args.positionals[0];
  if (!id) throw new UsageError(ctx.t("cases.newNeedId"));
  if (!IdSchema.safeParse(id).success) throw new UsageError(ctx.t("cases.badId", { id }));
  const dirFlag = flagString(args, "dir");
  const casesDir = dirFlag ? ctx.path(dirFlag) : defaultCasesDir(ctx);
  const caseDir = join(casesDir, id);
  const file = join(caseDir, "case.json");
  if (existsSync(file) && !flagBool(args, "force")) throw new CliError(ctx.t("cases.exists", { file }), EXIT.error, ctx.t("cases.existsHint"));
  await mkdir(caseDir, { recursive: true });
  await writeFile(file, `${JSON.stringify(caseTemplate(id), null, 2)}\n`, "utf8");
  const readme = join(caseDir, "README.md");
  if (!existsSync(readme) || flagBool(args, "force")) await writeFile(readme, readmeTemplate(id), "utf8");
  const p = ctx.out;
  ctx.print(p.green(ctx.t("cases.created", { file })));
  ctx.print(p.dim(`  ${readme}`));

  const validation = await validateCaseFile(file);
  const verification = validation.def ? verifyCaseDefinition(validation.def) : null;
  const ok = validation.ok && (verification?.ok ?? false);
  ctx.print(`${ok ? p.green("✓") : p.red("✗")} ${ctx.t("cases.templateChecked")}`);
  printIssues(ctx, [...validation.errors, ...(verification?.issues ?? [])], false);
  // Content directories hold cases as <dir>/cases/<id>/case.json: only a folder named "cases" can be found via its parent.
  const next = basename(casesDir) === "cases" ? ctx.t("cases.nextSteps", { file, id, dir: dirname(casesDir) }) : ctx.t("cases.nextStepsLayout", { file, id });
  ctx.print(p.dim(next));
  return ok ? EXIT.ok : EXIT.error;
}

const SCHEMA_KINDS = { case: "case.schema.json", facility: "facility.schema.json", catalog: "equipment-catalog.schema.json", template: "room-template.schema.json", skill: "skill.schema.json" } as const;

export async function casesSchema(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const kind = (args.positionals[0] ?? "case") as keyof typeof SCHEMA_KINDS;
  if (!Object.hasOwn(SCHEMA_KINDS, kind)) {
    const hint = suggest(kind, Object.keys(SCHEMA_KINDS));
    throw new UsageError(ctx.t("cases.schemaKind", { kind, kinds: Object.keys(SCHEMA_KINDS).join(" | ") }), hint ? ctx.t("argv.didYouMean", { value: hint }) : undefined);
  }
  const root = builtinContentDir();
  const file = root ? join(root, "schemas", SCHEMA_KINDS[kind]) : null;
  if (!file || !existsSync(file)) throw new CliError(ctx.t("cases.schemaMissing", { kind }), EXIT.error, ctx.t("cases.schemaHint"));
  if (flagBool(args, "content")) ctx.print((await readFile(file, "utf8")).replace(/\n$/, ""));
  else ctx.print(file);
  return EXIT.ok;
}
