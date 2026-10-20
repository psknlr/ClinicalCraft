/**
 * Content for front-ends that open ONE case at a time (CLI `play` / `exec`,
 * the MCP server): facilities, catalogs and room templates are loaded as by
 * `loadContent({ cases: false })`; the cases are only indexed
 * (`CaseIndexer`: library order, no validation) for listing and picking, and
 * a case is parsed and validated (`parseCase`) when it is started — the
 * verdict is kept until its file changes. `cases validate --all` /
 * `verify --all` and `eval` keep validating every case (`loadContent`).
 */
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseCase, type CaseDefinition } from "@clinicalcraft/core";
import { caseIndexEntryOf, libraryOrder, type CaseIndexEntry } from "../library.js";
import { CaseIndexer, contentHash, type CaseIndexSnapshot, type IndexedCaseFile } from "./case-index.js";
import { loadContent, type ContentIssue, type LoadedContent } from "./content.js";

/** A loaded case, as `LoadedContent.cases` holds it. */
export type LoadedCase = { def: CaseDefinition; dir: string; file: string };

/** Outcome of loading one case. */
export type CaseLoadResult =
  | { status: "ok"; entry: LoadedCase; warnings: ContentIssue[] }
  | { status: "not-found" }
  | { status: "invalid"; file: string; issues: ContentIssue[] };

export interface CaseLibraryOptions {
  /** Extra content directories (after the built-in one; later ones override earlier ids). */
  dirs?: readonly string[];
  /** Include the built-in content directory (default true). */
  builtin?: boolean;
  /** Concurrent file reads while indexing (default 16). */
  concurrency?: number;
}

/**
 * Read, parse and validate one `case.json` — the per-case step of
 * `loadContent` (a case whose id differs from its folder gets a warning).
 */
export async function loadCaseFile(file: string): Promise<{ ok: true; entry: LoadedCase; warnings: ContentIssue[] } | { ok: false; issues: ContentIssue[] }> {
  let raw: unknown;
  try {
    raw = JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, ""));
  } catch (err) {
    return { ok: false, issues: [{ path: "", message: err instanceof SyntaxError ? `invalid JSON: ${err.message}` : `cannot read: ${(err as Error).message}`, severity: "error" }] };
  }
  let parsed: ReturnType<typeof parseCase>;
  try {
    parsed = parseCase(raw);
  } catch (err) {
    return { ok: false, issues: [{ path: "", message: `validator crashed: ${err instanceof Error ? err.message : String(err)}`, severity: "error" }] };
  }
  if (!parsed.ok) return { ok: false, issues: parsed.issues.map((i) => ({ path: i.path, message: i.message, severity: i.severity })) };
  const dir = dirname(file);
  const folder = dir.split(/[\\/]/).pop() ?? "";
  const warnings: ContentIssue[] = parsed.warnings.map((i) => ({ path: i.path, message: i.message, severity: i.severity }));
  if (parsed.value.id !== folder) warnings.push({ path: "id", message: `case id "${parsed.value.id}" differs from its directory name "${folder}"`, severity: "warning" });
  return { ok: true, entry: { def: parsed.value, dir, file }, warnings };
}

/** The case index plus on-demand validation of the case being started (see the module comment). */
export class CaseLibrary {
  private snapshotPromise: Promise<CaseIndexSnapshot> | null = null;
  private readonly verdicts = new Map<string, { hash: string; result: CaseLoadResult }>();

  private constructor(
    /** Facilities, catalogs and templates (compiled); `cases` holds the cases loaded so far. */
    readonly content: LoadedContent,
    /** Null for a library over pre-loaded content (its cases are all loaded and validated). */
    private readonly indexer: CaseIndexer | null,
  ) {}

  /** Load facilities, catalogs and templates; index (not validate) the cases. */
  static async open(opts: CaseLibraryOptions = {}): Promise<CaseLibrary> {
    const content = await loadContent({ ...(opts.dirs ? { dirs: opts.dirs } : {}), ...(opts.builtin !== undefined ? { builtin: opts.builtin } : {}), cases: false });
    return new CaseLibrary(content, new CaseIndexer({ dirs: content.dirs, concurrency: opts.concurrency ?? 16 }));
  }

  /** A library over already loaded (and validated) content: no scanning (tests, embedding, `eval`). */
  static fromContent(content: LoadedContent): CaseLibrary {
    return new CaseLibrary(content, null);
  }

  /** The case index (scanned once; `refresh()` re-stats the files). */
  index(): Promise<CaseIndexSnapshot> {
    this.snapshotPromise ??= this.indexer ? this.indexer.refresh() : Promise.resolve(preloadedSnapshot(this.content));
    return this.snapshotPromise;
  }

  /** Re-stat the case files (re-reading changed ones). */
  refresh(): Promise<CaseIndexSnapshot> {
    this.snapshotPromise = null;
    return this.index();
  }

  /** Index entries in library order. */
  async entries(): Promise<CaseIndexEntry[]> {
    return (await this.index()).entries;
  }

  /** Every known case id, sorted. */
  async ids(): Promise<string[]> {
    return this.indexer ? [...(await this.index()).files.keys()].sort() : [...this.content.cases.keys()].sort();
  }

  /** Whether the library knows `id` (an indexed case may still turn out invalid). */
  async has(id: string): Promise<boolean> {
    return this.indexer ? (await this.index()).files.has(id) : this.content.cases.has(id);
  }

  /** Parse and validate one case (cached until its file changes); a valid case joins `content.cases`. */
  async load(id: string): Promise<CaseLoadResult> {
    if (!this.indexer) {
      const entry = this.content.cases.get(id);
      return entry ? { status: "ok", entry, warnings: [] } : { status: "not-found" };
    }
    const indexed = (await this.index()).files.get(id);
    if (!indexed) return { status: "not-found" };
    const hash = indexed.entry.contentHash;
    const known = this.verdicts.get(id);
    if (known && known.hash === hash) return known.result;
    const loaded = await loadCaseFile(indexed.file);
    let result: CaseLoadResult;
    if (!loaded.ok) result = { status: "invalid", file: indexed.file, issues: loaded.issues };
    else if (loaded.entry.def.id !== id) result = { status: "invalid", file: indexed.file, issues: [{ path: "id", message: `the file now declares case "${loaded.entry.def.id}"`, severity: "error" }] };
    else result = { status: "ok", entry: loaded.entry, warnings: loaded.warnings };
    this.verdicts.set(id, { hash, result });
    if (result.status === "ok") this.content.cases.set(id, result.entry);
    else this.content.cases.delete(id);
    return result;
  }
}

/** The index of pre-loaded cases (entries hashed from their JSON). */
function preloadedSnapshot(content: LoadedContent): CaseIndexSnapshot {
  const files = new Map<string, IndexedCaseFile>();
  for (const [id, e] of content.cases) {
    files.set(id, { entry: caseIndexEntryOf(e.def, contentHash(JSON.stringify(e.def))), file: e.file, dir: dirname(dirname(e.dir)), folder: id, mtimeMs: 0, size: 0 });
  }
  return { entries: libraryOrder([...files.values()].map((f) => f.entry)), files, issues: [], generation: 1, stats: { files: files.size, read: 0, ms: 0 } };
}
