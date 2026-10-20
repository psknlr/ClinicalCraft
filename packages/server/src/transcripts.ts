/**
 * `POST /api/transcripts/:sessionId` — the browser session's transcript
 * uploads. Accepts NDJSON (`application/x-ndjson`, what the web app sends), a
 * JSON array of items or `{items: [...]}`, validates the item envelope and
 * appends to `<CLINICALCRAFT_HOME>/sessions/web/<sessionId>.jsonl` (mode
 * 0600) through `JsonlTranscript`, which masks credentials before writing.
 *
 * Anyone who can reach the API can upload, so these files are kept apart from
 * the user's own recordings: `clinicalcraft sessions list --web` lists them,
 * `--continue` / `--resume <prefix>` never pick them, `--resume <exact id>`
 * resumes one without its recorded provider or approval mode
 * (docs/PROTOCOL.md §10). Each file is capped at `maxFileBytes` and the
 * directory at `maxSessions` files (`TranscriptQuotaError`, HTTP 413).
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { TranscriptItem } from "@clinicalcraft/agent";
import { JsonlTranscript, sessionsDir, type Env } from "@clinicalcraft/agent/node";

/**
 * Every `TranscriptItem` type a session records (embodied encounters add `world` snapshots). Exhaustive by type:
 * a new item type must be listed here, or an upload containing it would fail and the browser stop uploading.
 */
const ITEM_TYPE_LIST: Record<TranscriptItem["type"], true> = { session_meta: true, op: true, action: true, message: true, event: true, compacted: true, dialogue: true, diagnostic: true, world: true };
const ITEM_TYPES: ReadonlySet<string> = new Set(Object.keys(ITEM_TYPE_LIST));
const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;
/** Open writers kept per server (least recently used beyond this are dropped). */
const MAX_WRITERS = 64;
/** Default cap on one uploaded transcript file (bytes). */
export const MAX_WEB_TRANSCRIPT_BYTES = 16 * 1024 * 1024;
/** Default cap on the number of uploaded transcript files. */
export const MAX_WEB_TRANSCRIPTS = 500;

/** An upload that would exceed the per-file size or the file-count cap. */
export class TranscriptQuotaError extends Error {
  constructor(
    message: string,
    readonly kind: "file-size" | "session-count",
  ) {
    super(message);
    this.name = "TranscriptQuotaError";
  }
}

export interface WebTranscriptStoreOptions {
  /** Cap on one session's file (default 16 MiB). */
  maxFileBytes?: number;
  /** Cap on the number of files under `sessions/web/` (default 500). */
  maxSessions?: number;
}

/** Whether `id` is acceptable as a transcript file name. */
export function isValidSessionId(id: string): boolean {
  return SESSION_ID.test(id);
}

function checkItem(value: unknown, index: number): TranscriptItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`item ${index} is not an object`);
  const item = value as Record<string, unknown>;
  if (typeof item.type !== "string" || !ITEM_TYPES.has(item.type)) throw new Error(`item ${index} has an unknown type`);
  if (typeof item.ordinal !== "number" || !Number.isFinite(item.ordinal)) throw new Error(`item ${index} needs a numeric ordinal`);
  if (typeof item.ts !== "string") throw new Error(`item ${index} needs a string ts`);
  if (!("payload" in item)) throw new Error(`item ${index} has no payload`);
  return item as unknown as TranscriptItem;
}

/** Parse an upload body (NDJSON, JSON array or `{items}`) into validated items. Throws on bad input. */
export function parseTranscriptUpload(text: string): TranscriptItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  let values: unknown[];
  if (trimmed.startsWith("[")) {
    values = JSON.parse(trimmed) as unknown[];
  } else if (trimmed.startsWith("{") && !trimmed.includes("\n")) {
    const one = JSON.parse(trimmed) as Record<string, unknown>;
    values = Array.isArray(one.items) ? one.items : [one];
  } else {
    values = trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, i) => {
        try {
          return JSON.parse(line) as unknown;
        } catch (err) {
          throw new Error(`line ${i + 1}: ${(err as Error).message}`);
        }
      });
  }
  return values.map(checkItem);
}

/** Appends uploaded items to per-session JSONL files. */
export class WebTranscriptStore {
  private readonly writers = new Map<string, JsonlTranscript>();
  /** Bytes on disk (or queued) per open writer. */
  private readonly sizes = new Map<string, number>();
  private readonly dir: string;
  private readonly maxFileBytes: number;
  private readonly maxSessions: number;
  /** Serialises quota checks and writes (the checks read the directory). */
  private queue: Promise<unknown> = Promise.resolve();

  /** `baseDir` = the sessions directory (default `<CLINICALCRAFT_HOME>/sessions`). */
  constructor(
    private readonly env: Env,
    baseDir?: string | null,
    options: WebTranscriptStoreOptions = {},
  ) {
    this.dir = join(baseDir || sessionsDir(env), "web");
    this.maxFileBytes = options.maxFileBytes ?? MAX_WEB_TRANSCRIPT_BYTES;
    this.maxSessions = options.maxSessions ?? MAX_WEB_TRANSCRIPTS;
  }

  /** Path of a session's file. */
  pathFor(sessionId: string): string {
    return join(this.dir, `${sessionId}.jsonl`);
  }

  /**
   * Append items (in order) and resolve once they are on disk. Throws
   * `TranscriptQuotaError` (nothing written) when the file would exceed
   * `maxFileBytes` or a new file would exceed `maxSessions`.
   */
  append(sessionId: string, items: readonly TranscriptItem[]): Promise<{ path: string; written: number }> {
    const run = this.queue.then(() => this.appendNow(sessionId, items));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async appendNow(sessionId: string, items: readonly TranscriptItem[]): Promise<{ path: string; written: number }> {
    if (!isValidSessionId(sessionId)) throw new Error("invalid session id");
    // Nothing to write: no writer, no file — an empty upload must not reserve a slot past the quota.
    if (items.length === 0) return { path: this.pathFor(sessionId), written: 0 };
    const incoming = items.reduce((n, item) => n + Buffer.byteLength(JSON.stringify(item)) + 1, 0);
    const writer = await this.writer(sessionId);
    // The file-count quota is checked whenever the file is about to be created — not only when its
    // writer was (a cached writer whose file does not exist yet would otherwise skip the check).
    const onDisk = await stat(writer.path).then(
      () => true,
      () => false,
    );
    if (!onDisk) {
      const files = (await readdir(this.dir).catch(() => [] as string[])).filter((f) => f.endsWith(".jsonl"));
      if (files.length >= this.maxSessions) {
        this.drop(sessionId);
        throw new TranscriptQuotaError(`at most ${this.maxSessions} web transcripts are kept`, "session-count");
      }
    }
    const size = this.sizes.get(sessionId) ?? 0;
    if (size + incoming > this.maxFileBytes) {
      if (!onDisk) this.drop(sessionId);
      throw new TranscriptQuotaError(`transcript ${sessionId} would exceed ${this.maxFileBytes} bytes`, "file-size");
    }
    this.sizes.set(sessionId, size + incoming);
    let failures = writer.failures;
    for (const item of items) void writer.write(item);
    await writer.flush();
    failures = writer.failures - failures;
    if (failures > 0) throw new Error(`${failures} transcript line(s) could not be written`);
    return { path: writer.path, written: items.length };
  }

  /** Forget a cached writer (its file was never written). */
  private drop(sessionId: string): void {
    this.writers.delete(sessionId);
    this.sizes.delete(sessionId);
  }

  /** Wait for every pending write. */
  async flush(): Promise<void> {
    await Promise.all([...this.writers.values()].map((w) => w.flush()));
  }

  private async writer(sessionId: string): Promise<JsonlTranscript> {
    const existing = this.writers.get(sessionId);
    if (existing) {
      this.writers.delete(sessionId); // re-insert: most recently used last
      this.writers.set(sessionId, existing);
      return existing;
    }
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const path = this.pathFor(sessionId);
    const existingSize = await stat(path).then(
      (info) => info.size,
      () => null,
    );
    // The file-count quota is checked by `appendNow` before the file is first written.
    const writer = JsonlTranscript.at(path, undefined, { env: this.env });
    this.writers.set(sessionId, writer);
    this.sizes.set(sessionId, existingSize ?? 0);
    while (this.writers.size > MAX_WRITERS) {
      const oldest = this.writers.keys().next().value as string;
      this.writers.delete(oldest);
      this.sizes.delete(oldest);
    }
    return writer;
  }
}
