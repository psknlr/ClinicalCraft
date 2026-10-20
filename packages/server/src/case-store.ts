/**
 * Cases for the content API at scale (docs/EMBODIED.md §11, PROTOCOL §11):
 *
 * - the index (`CaseIndexer`): every case file of the content directories,
 *   re-stat'ed at most every `revalidateMs`, re-read only when its mtime or
 *   size changed, with bounded concurrency; duplicate ids resolved
 *   deterministically (first in precedence order wins, an issue for the rest);
 * - incremental validation: a case is validated (`parseCase`) the first time
 *   it is requested and the verdict is cached until its file changes; valid
 *   cases keep their public JSON (`solution` stripped) and strong ETag in a
 *   byte-bounded LRU;
 * - paginated, filtered listings and the legacy index, serialised once per
 *   index generation and query, each with its strong ETag.
 */
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { parseCase } from "@clinicalcraft/core";
import { caseIndexEntryOf, createLimiter, libraryOrder, type Limiter } from "@clinicalcraft/agent";
import { CaseIndexer, contentHash, type CaseIndexSnapshot, type IndexedCaseFile, type LoadedContent } from "@clinicalcraft/agent/node";
import { caseListing, legacyContentIndex, listingKey, publicCase, type ListingIssue, type ListingQuery } from "./content.js";
import { strongEtag } from "./http.js";

export interface CaseStoreOptions {
  /** Content directories in precedence order (built-in first; later ones override earlier ids). */
  dirs: readonly string[];
  /** Already loaded (and validated) cases: no scanning (tests, embedding). */
  preloaded?: LoadedContent["cases"];
  /** Concurrent file reads while indexing or validating (default 16). */
  concurrency?: number;
  /** Re-stat the case files at most this often, in ms (default 1000; 0 = on every request). */
  revalidateMs?: number;
  /** Byte budget of the cached public case bodies (default 64 MiB). */
  maxCachedBytes?: number;
  /** Clock (tests). */
  now?: () => number;
}

/** A full case request. */
export type CaseLoad =
  | { status: "ok"; body: string; etag: string }
  | { status: "not-found" }
  | { status: "invalid"; issues: { path: string; message: string }[] };

/** A cached serialised response. */
export interface CachedBody {
  body: string;
  etag: string;
}

type Verdict = { hash: string; ok: true; body?: string; etag: string } | { hash: string; ok: false; issues: { path: string; message: string }[] };

/** Counters for diagnostics, tests and the content-scale benchmark. */
export interface CaseStoreStats {
  /** Cases validated (`parseCase`) so far. */
  validations: number;
  /** Bytes of cached public case bodies. */
  cachedBytes: number;
}

const MAX_REPORTED_ISSUES = 20;
const RESPONSE_CACHE_SIZE = 128;

export class CaseStore {
  private readonly dirs: string[];
  private readonly indexer: CaseIndexer | null;
  private readonly preloaded: { snapshot: CaseIndexSnapshot; cases: LoadedContent["cases"] } | null;
  private readonly revalidateMs: number;
  private readonly maxCachedBytes: number;
  private readonly now: () => number;
  private readonly limit: Limiter;
  private lastRefresh = Number.NEGATIVE_INFINITY;
  private readonly verdicts = new Map<string, Verdict>();
  private readonly loading = new Map<string, Promise<CaseLoad>>();
  private readonly responses = new Map<string, CachedBody>();
  private readonly counters: CaseStoreStats = { validations: 0, cachedBytes: 0 };

  constructor(opts: CaseStoreOptions) {
    this.dirs = [...opts.dirs];
    this.revalidateMs = opts.revalidateMs ?? 1000;
    this.maxCachedBytes = opts.maxCachedBytes ?? 64 * 1024 * 1024;
    this.now = opts.now ?? (() => performance.now());
    this.limit = createLimiter(opts.concurrency ?? 16);
    if (opts.preloaded) {
      const files = new Map<string, IndexedCaseFile>();
      for (const [id, e] of opts.preloaded) {
        files.set(id, { entry: caseIndexEntryOf(e.def, contentHash(JSON.stringify(e.def))), file: e.file, dir: e.dir, folder: id, mtimeMs: 0, size: 0 });
      }
      const snapshot: CaseIndexSnapshot = { entries: libraryOrder([...files.values()].map((f) => f.entry)), files, issues: [], generation: 1, stats: { files: files.size, read: 0, ms: 0 } };
      this.preloaded = { snapshot, cases: opts.preloaded };
      this.indexer = null;
    } else {
      this.preloaded = null;
      this.indexer = new CaseIndexer({ dirs: this.dirs, concurrency: opts.concurrency ?? 16 });
    }
  }

  get stats(): Readonly<CaseStoreStats> {
    return this.counters;
  }

  /** The case index, re-stat'ed when older than `revalidateMs`. */
  async index(): Promise<CaseIndexSnapshot> {
    if (this.preloaded) return this.preloaded.snapshot;
    const indexer = this.indexer!;
    const current = indexer.snapshot;
    if (current && this.now() - this.lastRefresh < this.revalidateMs) return current;
    const fresh = await indexer.refresh();
    this.lastRefresh = this.now();
    if (fresh.generation !== current?.generation) this.responses.clear();
    return fresh;
  }

  /** The index problems in API form (no absolute paths). */
  listingIssues(snapshot: CaseIndexSnapshot): ListingIssue[] {
    const where = (dir: string, file: string) => ({ dir: Math.max(0, this.dirs.indexOf(dir)), file: relative(dir, file).split("\\").join("/") });
    return snapshot.issues.map((i) => {
      const at = where(i.dir, i.file);
      const used = i.usedFile ? [...snapshot.files.values()].find((f) => f.file === i.usedFile) : undefined;
      return {
        code: i.code,
        severity: i.severity,
        id: i.id,
        dir: at.dir,
        file: at.file,
        ...(used ? { usedDir: where(used.dir, used.file).dir, usedFile: where(used.dir, used.file).file } : {}),
      };
    });
  }

  /** One page of the case listing, serialised with its ETag (cached per index generation and query). */
  async listing(query: ListingQuery): Promise<CachedBody> {
    const snapshot = await this.index();
    return this.cached(`listing:${snapshot.generation}:${listingKey(query)}`, () => caseListing(snapshot.entries, query, this.listingIssues(snapshot)));
  }

  /** The legacy `GET /api/content/index` body (cached per index generation). */
  async legacyIndex(content: Pick<LoadedContent, "facilities" | "catalogs">): Promise<CachedBody> {
    const snapshot = await this.index();
    return this.cached(`legacy:${snapshot.generation}`, () => legacyContentIndex(snapshot.entries, content));
  }

  /**
   * The ETag of a case known to be valid in its current version (also when
   * its body was evicted), so a revalidation can be answered without
   * rebuilding it; null when unknown.
   */
  async currentEtag(id: string): Promise<string | null> {
    const file = (await this.index()).files.get(id);
    const known = this.verdicts.get(id);
    return file && known?.ok && known.hash === file.entry.contentHash ? known.etag : null;
  }

  /** A full public case: validated on first request, verdict cached until the file changes. */
  async load(id: string): Promise<CaseLoad> {
    const snapshot = await this.index();
    const file = snapshot.files.get(id);
    if (!file) return { status: "not-found" };
    const hash = file.entry.contentHash;
    const known = this.verdicts.get(id);
    if (known && known.hash === hash) {
      if (!known.ok) return { status: "invalid", issues: known.issues };
      if (known.body !== undefined) {
        // Most recently used last (LRU eviction order).
        this.verdicts.delete(id);
        this.verdicts.set(id, known);
        return { status: "ok", body: known.body, etag: known.etag };
      }
    }
    const key = `${id}\u0000${hash}`;
    let running = this.loading.get(key);
    if (!running) {
      running = this.limit(() => this.validate(id, file)).finally(() => this.loading.delete(key));
      this.loading.set(key, running);
    }
    return running;
  }

  private async validate(id: string, file: IndexedCaseFile): Promise<CaseLoad> {
    if (this.preloaded) {
      // Validated when it was loaded.
      const def = this.preloaded.cases.get(id)?.def;
      if (!def) return { status: "not-found" };
      const body = JSON.stringify(publicCase(def));
      return this.remember(id, { hash: file.entry.contentHash, ok: true, body, etag: strongEtag(body) });
    }
    let bytes: Buffer;
    try {
      bytes = await readFile(file.file);
    } catch {
      this.lastRefresh = Number.NEGATIVE_INFINITY; // gone: index again
      return { status: "not-found" };
    }
    const hash = contentHash(bytes);
    // Changed since it was indexed: the next request re-indexes (its entry may differ).
    if (hash !== file.entry.contentHash) this.lastRefresh = Number.NEGATIVE_INFINITY;
    let raw: unknown;
    try {
      raw = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
    } catch (err) {
      return this.remember(id, { hash, ok: false, issues: [{ path: "", message: `invalid JSON: ${(err as Error).message}` }] });
    }
    this.counters.validations++;
    const parsed = parseCase(raw);
    if (!parsed.ok) {
      const errors = parsed.issues.filter((i) => i.severity === "error").slice(0, MAX_REPORTED_ISSUES);
      return this.remember(id, { hash, ok: false, issues: errors.map((i) => ({ path: i.path, message: i.message })) });
    }
    if (parsed.value.id !== id) {
      this.lastRefresh = Number.NEGATIVE_INFINITY;
      return { status: "not-found" };
    }
    const body = JSON.stringify(publicCase(parsed.value));
    return this.remember(id, { hash, ok: true, body, etag: strongEtag(body) });
  }

  private remember(id: string, verdict: Verdict): CaseLoad {
    const old = this.verdicts.get(id);
    if (old?.ok && old.body !== undefined) this.counters.cachedBytes -= old.body.length;
    this.verdicts.delete(id);
    this.verdicts.set(id, verdict);
    if (!verdict.ok) return { status: "invalid", issues: verdict.issues };
    const body = verdict.body!;
    this.counters.cachedBytes += body.length;
    // Evict the least recently used bodies (their verdicts stay; a body is rebuilt on demand).
    for (const [otherId, v] of this.verdicts) {
      if (this.counters.cachedBytes <= this.maxCachedBytes) break;
      if (otherId === id || !v.ok || v.body === undefined) continue;
      this.counters.cachedBytes -= v.body.length;
      this.verdicts.set(otherId, { hash: v.hash, ok: true, etag: v.etag });
    }
    return { status: "ok", body, etag: verdict.etag };
  }

  private cached(key: string, build: () => unknown): CachedBody {
    const hit = this.responses.get(key);
    if (hit) return hit;
    const body = JSON.stringify(build());
    const entry = { body, etag: strongEtag(body) };
    if (this.responses.size >= RESPONSE_CACHE_SIZE) this.responses.delete(this.responses.keys().next().value!);
    this.responses.set(key, entry);
    return entry;
  }
}
