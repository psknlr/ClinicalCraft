/**
 * Operative suites on disk: `<content dir>/operative/<suite>/*.json` — the built-in content and every
 * directory in `contentDirs` (a content pack ships its own cases' suites). One scenario per file,
 * validated with `parseOperativeScenario`; each split is stamped with a digest of its files so a report
 * says exactly which scenarios it ran. `operativeRefIssues` checks a scenario against the loaded case.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { BASE_VARIANT, checkProcedureRef, conditionRefs, t, type CaseDefinition } from "@clinicalcraft/core";
import type { LoadedContent } from "@clinicalcraft/agent/node";
import { OPERATIVE_SPLITS, parseOperativeScenario, scenarioVariants, type OperativeScenario, type OperativeSplit } from "./schema.js";

/** The directory of operative suites inside a content directory. */
export const OPERATIVE_DIR = "operative";

/** Suites under the given content directories (name → the first directory that has it), sorted by name. */
export async function listOperativeSuites(contentDirs: readonly string[]): Promise<{ suite: string; dir: string }[]> {
  const out = new Map<string, string>();
  for (const root of contentDirs) {
    try {
      for (const e of await readdir(join(root, OPERATIVE_DIR), { withFileTypes: true })) if (e.isDirectory() && !out.has(e.name)) out.set(e.name, join(root, OPERATIVE_DIR, e.name));
    } catch {
      // no operative suites here
    }
  }
  return [...out.entries()].map(([suite, dir]) => ({ suite, dir })).sort((a, b) => a.suite.localeCompare(b.suite));
}

export interface LoadedOperativeSuite {
  suite: string;
  dir: string;
  scenarios: OperativeScenario[];
  /** sha256 of each split's files (name + content, in name order): what a report ran. */
  digests: Record<OperativeSplit, string>;
  issues: { file: string; issues: string[] }[];
}

/** Read and validate a suite (null when no content directory has it). */
export async function loadOperativeSuite(suite: string, contentDirs: readonly string[]): Promise<LoadedOperativeSuite | null> {
  const found = (await listOperativeSuites(contentDirs)).find((s) => s.suite === suite);
  if (!found) return null;
  const names = (await readdir(found.dir, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => e.name)
    .sort();
  const scenarios: OperativeScenario[] = [];
  const issues: LoadedOperativeSuite["issues"] = [];
  const hashes = Object.fromEntries(OPERATIVE_SPLITS.map((s) => [s, createHash("sha256")])) as Record<OperativeSplit, ReturnType<typeof createHash>>;
  const ids = new Set<string>();
  for (const name of names) {
    const file = join(found.dir, name);
    const text = (await readFile(file, "utf8")).replace(/^﻿/, "");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (err) {
      issues.push({ file, issues: [`invalid JSON: ${(err as Error).message}`] });
      continue;
    }
    const parsed = parseOperativeScenario(raw);
    if (!parsed.ok) {
      issues.push({ file, issues: parsed.issues });
      continue;
    }
    const s = parsed.scenario;
    const problems: string[] = [];
    if (s.suite !== suite) problems.push(`suite: "${s.suite}" differs from the directory "${suite}"`);
    if (basename(name, ".json") !== s.id) problems.push(`id: "${s.id}" differs from the file name "${name}"`);
    if (ids.has(s.id)) problems.push(`id: "${s.id}" is used twice`);
    if (problems.length) {
      issues.push({ file, issues: problems });
      continue;
    }
    ids.add(s.id);
    hashes[s.split].update(`${name}\n${text}\n`);
    scenarios.push(s);
  }
  const digests = Object.fromEntries(OPERATIVE_SPLITS.map((s) => [s, hashes[s].digest("hex")])) as Record<OperativeSplit, string>;
  return { suite, dir: found.dir, scenarios, digests, issues };
}

/** The case's reference solution up to (not including) its first `operate`: how the preamble brings the case to the table. */
export function preambleActions(c: CaseDefinition): CaseDefinition["solution"] {
  const solution = c.solution ?? [];
  const first = solution.findIndex((a) => a.type === "operate");
  return first < 0 ? [] : solution.slice(0, first).filter((a) => a.type !== "start");
}

/**
 * Referential problems of a scenario against the loaded content: the case exists and has a procedure; the
 * variants exist; the preamble exists; every condition names things the case and its procedure have; the
 * instruction does not name a variant. An empty list = consistent.
 */
export function operativeRefIssues(s: OperativeScenario, content: Pick<LoadedContent, "cases">): string[] {
  const entry = content.cases.get(s.caseId);
  if (!entry) return [`caseId: unknown case "${s.caseId}"`];
  const c = entry.def;
  const def = c.procedure;
  if (!def) return [`caseId: case "${s.caseId}" has no procedure`];
  const out: string[] = [];
  for (const v of scenarioVariants(s)) if (v !== BASE_VARIANT && !def.variants.some((x) => x.id === v)) out.push(`variant: case "${c.id}" has no procedure variant "${v}"`);
  if (s.setup.preamble === "solution" && !(c.solution ?? []).some((a) => a.type === "operate")) out.push(`setup.preamble: case "${c.id}" has no reference solution with an operate step`);
  s.predicates.forEach((p, i) => {
    if (!("clinical" in p)) return;
    for (const ref of conditionRefs(p.clinical)) {
      if (ref.kind === "procedure") out.push(...checkProcedureRef(c, ref.predicate, ref.path).filter((x) => x.severity === "error").map((x) => `predicates.${i}.clinical.${x.path}: ${x.message}`));
    }
  });
  const instruction = `${t(s.instruction, "en")} ${t(s.instruction, "zh-CN")}`.toLowerCase();
  for (const v of def.variants) {
    for (const word of [v.id, t(v.name, "en"), t(v.name, "zh-CN")]) if (word && instruction.includes(word.toLowerCase())) out.push(`instruction: names the variant "${v.id}" ("${word}") — the anatomy must stay hidden`);
  }
  return out;
}
