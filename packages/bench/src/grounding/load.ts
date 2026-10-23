/**
 * Grounding suites on disk: `packages/content/grounding/<suite>/<split>/*.json`
 * (validated with `parseGroundingSet`), the referential check of a set
 * against the loaded content (the case and every item, phase and fact it
 * names), and the digests that freeze a split (docs/GROUNDING.md §3).
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CaseDefinition } from "@clinicalcraft/core";
import { builtinContentDir, type LoadedContent } from "@clinicalcraft/agent/node";
import { GROUNDING_SPLITS, parseGroundingSet, TOOL_TRACKS, type GroundingSet, type GroundingSplit } from "./schema.js";

/** `packages/content/grounding` (null when the content package cannot be found). */
export function groundingRoot(): string | null {
  const content = builtinContentDir();
  return content ? join(content, "grounding") : null;
}

/** Grounding suites (directories) under a root, sorted. */
export async function listGroundingSuites(root: string | null = groundingRoot()): Promise<string[]> {
  if (!root) return [];
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export interface GroundingFile {
  split: GroundingSplit;
  /** `<split>/<name>.json`, relative to the suite directory. */
  path: string;
  set: GroundingSet;
  /** sha256 of the file's text (no byte-order mark, LF line ends). */
  sha256: string;
}

export interface LoadedGroundingSuite {
  suite: string;
  dir: string;
  /** Valid files, by split then file name. */
  files: GroundingFile[];
  /** Files that failed validation. */
  issues: { file: string; issues: string[] }[];
}

/** sha256 hex of a buffer or string. */
export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** A file's text without a byte-order mark and with LF line ends (so a checkout's line-end conversion keeps the digest). */
function normalizedText(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8").replace(/^\ufeff/, "").replace(/\r\n?/g, "\n");
}

/**
 * Pinned digests of held-out splits (docs/GROUNDING.md §3): a split whose
 * digest differs has been edited, and its numbers are not comparable with
 * published ones. A pin changes only with a new suite version.
 */
export const FROZEN_SPLIT_DIGESTS: Readonly<Record<string, Partial<Record<GroundingSplit, string>>>> = {
  "grounding-v1": { test: "a11921c293f06d6ee4f88898f06efe5dfc2d7ed86c11b9e1167bff844c026cad" },
};

/** Whether a split matches its pinned digest (`unpinned` when the suite pins none for it). */
export function frozenStatus(suite: string, split: GroundingSplit, digest: string): "frozen" | "modified" | "unpinned" {
  const pinned = FROZEN_SPLIT_DIGESTS[suite]?.[split];
  return pinned === undefined ? "unpinned" : pinned === digest ? "frozen" : "modified";
}

/**
 * Read and validate every file of a suite (both splits). A file must parse,
 * name the suite and split of its directories, and use item ids unique
 * within the split.
 */
export async function loadGroundingSuite(suite: string, root: string | null = groundingRoot()): Promise<LoadedGroundingSuite | null> {
  if (!root) return null;
  const dir = join(root, suite);
  try {
    await readdir(dir);
  } catch {
    return null;
  }
  const files: GroundingFile[] = [];
  const issues: { file: string; issues: string[] }[] = [];
  for (const split of GROUNDING_SPLITS) {
    let names: string[] = [];
    try {
      names = (await readdir(join(dir, split), { withFileTypes: true }))
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
        .map((e) => e.name)
        .sort();
    } catch {
      continue;
    }
    const ids = new Map<string, string>();
    for (const name of names) {
      const file = join(dir, split, name);
      const bytes = await readFile(file);
      let raw: unknown;
      try {
        raw = JSON.parse(normalizedText(bytes));
      } catch (err) {
        issues.push({ file, issues: [`invalid JSON: ${(err as Error).message}`] });
        continue;
      }
      const parsed = parseGroundingSet(raw);
      if (!parsed.ok) {
        issues.push({ file, issues: parsed.issues });
        continue;
      }
      const set = parsed.set;
      const problems: string[] = [];
      if (set.suite !== suite) problems.push(`suite: "${set.suite}" differs from the directory "${suite}"`);
      if (set.split !== split) problems.push(`split: "${set.split}" differs from the directory "${split}"`);
      for (const item of allItems(set)) {
        const other = ids.get(item.id);
        if (other && other !== name) problems.push(`item id "${item.id}" is also used in ${split}/${other}`);
        ids.set(item.id, name);
      }
      if (problems.length) {
        issues.push({ file, issues: problems });
        continue;
      }
      files.push({ split, path: `${split}/${name}`, set, sha256: sha256(normalizedText(bytes)) });
    }
  }
  return { suite, dir, files, issues };
}

function allItems(set: GroundingSet): { id: string }[] {
  return [...(set.history ?? []), ...(set.exam ?? []), ...(set.orders ?? []), ...(set.interventions ?? []), ...(set.routing ?? []), ...(set.verifier ?? [])];
}

/**
 * Digest of a split: sha256 over its files' `path␀sha256` lines in path
 * order — any edit, addition or removal changes it.
 */
export function splitDigest(files: readonly Pick<GroundingFile, "path" | "sha256">[]): string {
  const lines = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)).map((f) => `${f.path}\u0000${f.sha256}\n`);
  return sha256(lines.join(""));
}

/**
 * Referential problems of a set against loaded content: the case exists;
 * every history id (`expect`, `alsoOk`, `used`, `asked`), tool target and
 * phase names an item of that case. An empty list = consistent.
 */
export function groundingRefIssues(set: GroundingSet, content: Pick<LoadedContent, "cases">): string[] {
  if (!set.caseId) return [];
  const entry = content.cases.get(set.caseId);
  if (!entry) return [`caseId: unknown case "${set.caseId}"`];
  const c: CaseDefinition = entry.def;
  const out: string[] = [];
  const history = new Set(c.history.map((h) => h.id));
  const phases = new Set(c.phases.map((p) => p.id));
  const collections: Record<(typeof TOOL_TRACKS)[number], Set<string>> = {
    exam: new Set(c.exam.map((e) => e.id)),
    orders: new Set(c.investigations.map((i) => i.id)),
    interventions: new Set(c.interventions.map((i) => i.id)),
  };
  const checkHistory = (ids: readonly string[] | undefined, path: string) => {
    for (const id of ids ?? []) if (!history.has(id)) out.push(`${path}: unknown history item "${id}" in case ${c.id}`);
  };
  const checkPhase = (phase: string | undefined, path: string) => {
    if (phase !== undefined && !phases.has(phase)) out.push(`${path}.phase: unknown phase "${phase}" in case ${c.id}`);
  };
  (set.history ?? []).forEach((item, i) => {
    checkHistory(item.expect, `history.${i}.expect`);
    checkHistory(item.alsoOk, `history.${i}.alsoOk`);
    checkPhase(item.phase, `history.${i}`);
  });
  for (const track of TOOL_TRACKS) {
    (set[track] ?? []).forEach((item, i) => {
      if (item.expect !== null && !collections[track].has(item.expect)) out.push(`${track}.${i}.expect: unknown ${track} item "${item.expect}" in case ${c.id}`);
      checkPhase(item.phase, `${track}.${i}`);
    });
  }
  (set.verifier ?? []).forEach((item, i) => {
    checkHistory(item.used, `verifier.${i}.used`);
    checkHistory(item.asked, `verifier.${i}.asked`);
  });
  return out;
}
