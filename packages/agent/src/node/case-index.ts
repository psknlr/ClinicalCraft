/**
 * The case index over content directories (docs/EMBODIED.md §11): every
 * `<dir>/cases/<folder>/case.json`, read with bounded concurrency and turned
 * into `CaseIndexEntry`s by the shared builder (`caseIndexEntry`, ../library.ts)
 * without validating the cases — validation happens when a case is loaded.
 *
 * A `CaseIndexer` keeps one record per file and re-reads a file only when
 * its mtime or size changed (`refresh()` stats every file, reads the changed
 * ones). Used by `clinicalcraft serve` (case listing), `clinicalcraft cases
 * index` and the web build (the bundled index).
 *
 * Duplicate ids are resolved deterministically — the first file in
 * precedence order wins: later content directories before earlier ones (a
 * content directory overrides the built-in content, as `loadContent` does),
 * and within one directory the case folders in name order. Every other file
 * declaring the id gets a `duplicate-id` issue (a warning when a later
 * directory overrides it, an error for two folders of one directory).
 *
 * Self-contained on purpose (node builtins + isomorphic siblings, no
 * workspace package at runtime): the web's Vite config bundles it.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createLimiter, type Limiter } from "../concurrency.js";
import { caseIndexEntry, libraryOrder, type CaseIndexEntry } from "../library.js";

/** The `contentHash` of a case file: the first 16 hex digits of the SHA-256 of its bytes. */
export function contentHash(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 16);
}

/** A problem found while indexing (the file stays out of the index, or loses to another one). */
export interface CaseIndexIssue {
  code: "unreadable" | "invalid-json" | "missing-id" | "duplicate-id";
  severity: "error" | "warning";
  /** Absolute path of the case file. */
  file: string;
  /** The content directory it belongs to. */
  dir: string;
  /** The case id, when the file has one. */
  id: string | null;
  message: string;
  /** `duplicate-id`: the file whose case is used instead. */
  usedFile?: string;
}

/** The file behind an index entry. */
export interface IndexedCaseFile {
  entry: CaseIndexEntry;
  /** Absolute path of `case.json`. */
  file: string;
  /** The content directory (holds `cases/`). */
  dir: string;
  /** The case folder name (normally the id). */
  folder: string;
  mtimeMs: number;
  size: number;
}

export interface CaseIndexSnapshot {
  /** One entry per id, in library order. */
  entries: CaseIndexEntry[];
  /** id → the file its entry came from. */
  files: Map<string, IndexedCaseFile>;
  issues: CaseIndexIssue[];
  /** Grows whenever a refresh found a new, changed or removed file. */
  generation: number;
  /** The last refresh: case files found, files (re)read, wall time. */
  stats: { files: number; read: number; ms: number };
}

export interface CaseIndexerOptions {
  /** Content directories (each holds `cases/<folder>/case.json`), built-in first; later ones override earlier ids. */
  dirs: readonly string[];
  /** Concurrent `stat`/`readFile` calls (default 16). */
  concurrency?: number;
}

interface FileRecord {
  file: string;
  dir: string;
  folder: string;
  mtimeMs: number;
  size: number;
  entry: CaseIndexEntry | null;
  issue: CaseIndexIssue | null;
}

interface Candidate {
  file: string;
  dir: string;
  dirIndex: number;
  folder: string;
}

async function caseFolders(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(join(dir, "cases"), { withFileTypes: true });
    // Same order as loadContent.
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function readRecord(c: Candidate, mtimeMs: number, size: number): Promise<FileRecord> {
  const base = { file: c.file, dir: c.dir, folder: c.folder, mtimeMs, size };
  const issue = (code: CaseIndexIssue["code"], message: string, id: string | null = null): FileRecord => ({ ...base, entry: null, issue: { code, severity: "error", file: c.file, dir: c.dir, id, message } });
  let bytes: Buffer;
  try {
    bytes = await readFile(c.file);
  } catch (err) {
    return issue("unreadable", `cannot read: ${(err as Error).message}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(bytes.toString("utf8").replace(/^﻿/, ""));
  } catch (err) {
    return issue("invalid-json", `invalid JSON: ${(err as Error).message}`);
  }
  const entry = caseIndexEntry(raw, contentHash(bytes));
  if (!entry) {
    const id = raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string" ? (raw as { id: string }).id : null;
    return issue("missing-id", id === null ? "no case id" : `unusable case id "${id}"`, id);
  }
  return { ...base, entry, issue: null };
}

/** Incremental case index over content directories (see the module comment). */
export class CaseIndexer {
  private readonly dirs: string[];
  private readonly limit: Limiter;
  private records = new Map<string, FileRecord>();
  private current: CaseIndexSnapshot | null = null;
  private running: Promise<CaseIndexSnapshot> | null = null;
  private generation = 0;

  constructor(opts: CaseIndexerOptions) {
    this.dirs = [...new Set(opts.dirs.map((d) => resolve(d)))];
    this.limit = createLimiter(opts.concurrency ?? 16);
  }

  /** The last snapshot (null before the first refresh). */
  get snapshot(): CaseIndexSnapshot | null {
    return this.current;
  }

  /** Re-stat every case file and re-read the changed ones. Concurrent calls share one scan. */
  refresh(): Promise<CaseIndexSnapshot> {
    this.running ??= this.scan().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async scan(): Promise<CaseIndexSnapshot> {
    const started = performance.now();
    const candidates: Candidate[] = [];
    const folders = await Promise.all(this.dirs.map((dir) => caseFolders(dir)));
    this.dirs.forEach((dir, dirIndex) => {
      for (const folder of folders[dirIndex]!) candidates.push({ file: join(dir, "cases", folder, "case.json"), dir, dirIndex, folder });
    });
    const stats = await Promise.all(
      candidates.map((c) =>
        this.limit(() =>
          stat(c.file).then(
            (s) => (s.isFile() ? s : null),
            () => null,
          ),
        ),
      ),
    );
    let read = 0;
    const next = new Map<string, FileRecord>();
    await Promise.all(
      candidates.map(async (c, i) => {
        const st = stats[i];
        if (!st) return;
        const previous = this.records.get(c.file);
        if (previous && previous.mtimeMs === st.mtimeMs && previous.size === st.size) {
          next.set(c.file, previous);
          return;
        }
        read++;
        next.set(c.file, await this.limit(() => readRecord(c, st.mtimeMs, st.size)));
      }),
    );
    const removed = [...this.records.keys()].some((file) => !next.has(file));
    this.records = next;
    if (read > 0 || removed || this.current === null) this.generation++;

    // Precedence: later directories first, then folders in name order; the first file of an id wins.
    const issues: CaseIndexIssue[] = [];
    const winners = new Map<string, IndexedCaseFile & { dirIndex: number }>();
    const ordered = [...candidates].sort((a, b) => b.dirIndex - a.dirIndex);
    for (const c of ordered) {
      const record = next.get(c.file);
      if (!record) continue;
      if (record.issue) {
        issues.push(record.issue);
        continue;
      }
      const entry = record.entry!;
      const used = winners.get(entry.id);
      if (used) {
        const override = used.dirIndex > c.dirIndex;
        issues.push({
          code: "duplicate-id",
          severity: override ? "warning" : "error",
          file: c.file,
          dir: c.dir,
          id: entry.id,
          usedFile: used.file,
          message: override
            ? `case "${entry.id}" is overridden by ${used.file} (a later content directory)`
            : `duplicate case id "${entry.id}": ${used.file} is used (the first folder of this directory)`,
        });
        continue;
      }
      winners.set(entry.id, { entry, file: c.file, dir: c.dir, folder: c.folder, mtimeMs: record.mtimeMs, size: record.size, dirIndex: c.dirIndex });
    }
    const files = new Map<string, IndexedCaseFile>();
    for (const [id, { dirIndex: _dirIndex, ...file }] of winners) files.set(id, file);
    this.current = {
      entries: libraryOrder([...files.values()].map((f) => f.entry)),
      files,
      issues,
      generation: this.generation,
      stats: { files: next.size, read, ms: performance.now() - started },
    };
    return this.current;
  }
}

/** One-shot index of the given content directories. */
export function buildCaseIndex(opts: CaseIndexerOptions): Promise<CaseIndexSnapshot> {
  return new CaseIndexer(opts).refresh();
}
