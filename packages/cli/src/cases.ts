/**
 * `clinicalcraft cases list|show|validate|verify|new|schema`.
 */
import { existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  checkCaseIntegrity,
  IdSchema,
  matchHistory,
  parseCase,
  t,
  verifyCase,
  type CaseDefinition,
  type Issue,
} from "@clinicalcraft/core";
import { builtinContentDir, findProjectRoot, loadContent, type LoadedContent } from "@clinicalcraft/agent/node";
import { table } from "@clinicalcraft/agent";
import { flagBool, flagString, suggest, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";
import type { MsgKey } from "./i18n.js";
import { sortedCases, stars } from "./picker.js";
import { caseTemplate, readmeTemplate } from "./scaffold.js";

/** The patient pipeline selects facts scoring ≥ 0.55 (docs/ARCHITECTURE.md §4.2). */
export const UTTERANCE_SELECT_THRESHOLD = 0.55;

interface TestUtterance {
  text: string;
  locale: string;
  expect: string[];
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

/**
 * Run the matcher regression corpus: hits ≥ 0.55 must contain every expected
 * id with an expected id ranked first; `expect: []` must select nothing.
 */
export function checkUtterances(c: CaseDefinition): { total: number; failures: Issue[] } {
  const corpus = testUtterances(c) ?? [];
  const failures: Issue[] = [];
  const ids = new Set(c.history.map((h) => h.id));
  corpus.forEach((u, i) => {
    const path = `extensions.testUtterances.${i}`;
    for (const id of u.expect) if (!ids.has(id)) failures.push({ path, message: `unknown history id "${id}"`, severity: "error" });
    const selected = matchHistory(c, u.text, u.locale).filter((h) => h.score >= UTTERANCE_SELECT_THRESHOLD);
    const got = selected.map((h) => h.id);
    if (u.expect.length === 0) {
      if (got.length > 0) failures.push({ path, message: `"${u.text}" should select nothing, selected ${got.join(", ")}`, severity: "error" });
      return;
    }
    const missing = u.expect.filter((id) => !got.includes(id));
    if (missing.length > 0 || !u.expect.includes(got[0]!)) {
      failures.push({ path, message: `"${u.text}" (${u.locale}) expected ${u.expect.join(", ")}, selected ${got.length ? got.join(", ") : "nothing"}`, severity: "error" });
    }
  });
  return { total: corpus.length, failures };
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
    ctx.print(`    ${tag} ${p.dim(issue.path || "(root)")} ${issue.message}`);
  }
}

/** Localised care setting ("emergency" → 急诊); unknown values are shown as is. */
function settingLabel(ctx: CliContext, setting: string): string {
  const key = `setting.${setting}` as MsgKey;
  const label = ctx.t(key);
  return label === key ? setting : label;
}

async function loadAll(ctx: CliContext): Promise<LoadedContent> {
  const settings = await loadCliSettings(ctx);
  return loadContent({ dirs: settings.contentDirs });
}

function findCase(ctx: CliContext, content: LoadedContent, id: string): { def: CaseDefinition; dir: string; file: string } {
  const entry = content.cases.get(id);
  if (entry) return entry;
  const hint = suggest(id, [...content.cases.keys()]);
  throw new CliError(ctx.t("cases.unknown", { id }), EXIT.usage, hint ? ctx.t("argv.didYouMean", { value: hint }) : ctx.t("cases.available", { list: [...content.cases.keys()].join(", ") }));
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
  for (const c of cases) rows.push([c.id, t(c.title, ctx.locale), stars(c.difficulty), settingLabel(ctx, c.setting), c.estimatedMinutes ? String(c.estimatedMinutes) : "-"]);
  ctx.print(table(rows, { header: true, maxCell: 60 }));
  const broken = content.issues.filter((f) => f.file.endsWith("case.json") && f.issues.some((i) => i.severity === "error"));
  for (const f of broken) ctx.printErr(ctx.err.red(ctx.t("cases.invalidFile", { file: f.file, n: f.issues.filter((i) => i.severity === "error").length })));
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
  ctx.print(`${p.bold(t(c.title, L))} ${p.dim(`(${c.id} v${c.version})`)}`);
  ctx.print(t(c.summary, L));
  ctx.print();
  const pt = c.patient;
  ctx.print(`${p.bold(ctx.t("show.patient"))} ${t(pt.displayName, L)} · ${ctx.t(`age.${pt.ageUnit}` as "age.years", { n: pt.age })} · ${ctx.t(`sex.${pt.sex}` as "sex.male")}`);
  ctx.print(`${p.bold(ctx.t("show.complaint"))} ${t(pt.chiefComplaint, L)}`);
  ctx.print(`${p.bold(ctx.t("show.setting"))} ${c.setting}${c.facility ? ` · ${c.facility}` : ""} · ${stars(c.difficulty)} · ${c.specialty.join(", ")}${c.estimatedMinutes ? ` · ~${c.estimatedMinutes} min` : ""}`);
  ctx.print(`${p.bold(ctx.t("show.locales"))} ${c.locales.join(", ")} · ${ctx.t("show.clock")} ${c.clock.mode}`);
  const prov = c.provenance;
  ctx.print(`${p.bold(ctx.t("show.provenance"))} ${prov.kind}${prov.citation ? ` — ${prov.citation}` : ""}${prov.doi ? ` (doi:${prov.doi})` : ""}`);
  if (c.disclaimer) ctx.print(p.dim(t(c.disclaimer, L)));
  ctx.print();
  ctx.print(p.bold(ctx.t("show.objectives")));
  c.objectives.forEach((o, i) => ctx.print(`  ${i + 1}. ${t(o.title, L)}`));
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
  ctx.print(p.dim(file));
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
export async function validateCaseFile(file: string): Promise<FileValidation> {
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
  const issues = [...parsed.warnings, ...checkCaseIntegrity(parsed.value)];
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
  const results = await Promise.all([...new Set(files)].map((f) => validateCaseFile(f)));
  const failed = results.filter((r) => !r.ok).length;
  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify(results.map(({ def, ...r }) => (void def, r)), null, 2));
    return failed > 0 ? EXIT.error : EXIT.ok;
  }
  const p = ctx.out;
  const showWarnings = !flagBool(args, "quiet");
  for (const r of results) {
    const rel = ctx.show(r.file);
    const label = r.ok ? p.green("✓") : p.red("✗");
    const counts = ctx.t("cases.counts", { errors: r.errors.length, warnings: r.warnings.length });
    ctx.print(`${label} ${rel}${r.id ? p.dim(` (${r.id})`) : ""} ${p.dim(counts)}`);
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
  utterances: { total: number; failed: number };
  issues: Issue[];
}

/** Replay the reference solution and run the utterance corpus. */
export function verifyCaseDefinition(c: CaseDefinition): CaseVerification {
  const integrity = checkCaseIntegrity(c);
  const result = verifyCase(c);
  const corpus = checkUtterances(c);
  const issues: Issue[] = [...integrity.filter((i) => i.severity === "error"), ...result.issues, ...corpus.failures];
  if (testUtterances(c) === null) issues.push({ path: "extensions.testUtterances", message: "missing matcher regression corpus (15–40 bilingual utterances)", severity: "warning" });
  if (c.solution.length === 0) issues.push({ path: "solution", message: "no reference solution", severity: "error" });
  const a = result.assessment;
  return {
    id: c.id,
    ok: issues.every((i) => i.severity !== "error") && result.ok,
    steps: c.solution.length,
    objectives: { done: a.objectives.filter((o) => o.done).length, total: a.objectives.length },
    decisions: { decided: a.decisions.filter((d) => d.decided).length, total: a.decisions.length },
    utterances: { total: corpus.total, failed: corpus.failures.length },
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

const SCHEMA_KINDS = { case: "case.schema.json", facility: "facility.schema.json", catalog: "equipment-catalog.schema.json" } as const;

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
