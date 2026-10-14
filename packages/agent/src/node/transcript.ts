/**
 * JSONL transcripts ("rollouts"): one `TranscriptItem` per line under
 * `<home>/sessions/YYYY/MM/DD/<iso-ts>-<sessionId>.jsonl` (mode 0600).
 * A single writer appends through a promise chain so lines never interleave.
 */
import { closeSync, openSync, readSync } from "node:fs";
import { appendFile, mkdir, open, readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TranscriptItem, TranscriptSink } from "../session/types.js";
import { clinicalcraftHome, type Env } from "./home.js";

export interface JsonlTranscriptOptions {
  /** Base sessions directory (default `<home>/sessions`). */
  dir?: string | null;
  sessionId: string;
  env?: Env;
  /** Clock (ms since epoch), injectable for tests. */
  now?: () => number;
  /** Called when a write fails (the sink keeps going). */
  onError?: (err: Error) => void;
}

/** Default base directory for transcripts. */
export function sessionsDir(env: Env = process.env): string {
  return join(clinicalcraftHome(env), "sessions");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `<base>/YYYY/MM/DD/<YYYY-MM-DDTHH-MM-SSZ>-<id>.jsonl` (UTC). */
export function transcriptPath(base: string, sessionId: string, at: Date): string {
  const y = at.getUTCFullYear();
  const m = pad(at.getUTCMonth() + 1);
  const d = pad(at.getUTCDate());
  const stamp = `${y}-${m}-${d}T${pad(at.getUTCHours())}-${pad(at.getUTCMinutes())}-${pad(at.getUTCSeconds())}Z`;
  const safeId = sessionId.replace(/[^A-Za-z0-9_-]/g, "_");
  return join(base, String(y), m, d, `${stamp}-${safeId}.jsonl`);
}

/** Append-only JSONL transcript sink. */
export class JsonlTranscript implements TranscriptSink {
  readonly path: string;
  private chain: Promise<void> = Promise.resolve();
  private dirReady = false;
  /** Resumed files may end with a torn line (crash mid-write): terminate it before appending. */
  private checkTail = false;
  private readonly onError: ((err: Error) => void) | undefined;
  /** Number of failed writes so far. */
  failures = 0;

  private constructor(path: string, onError?: (err: Error) => void) {
    this.path = path;
    this.onError = onError;
  }

  /** New transcript file for a session (directories are created on first write). */
  static create(options: JsonlTranscriptOptions): JsonlTranscript {
    const base = options.dir || sessionsDir(options.env);
    const now = new Date((options.now ?? Date.now)());
    return new JsonlTranscript(transcriptPath(base, options.sessionId, now), options.onError);
  }

  /** Append to an existing transcript (resume). */
  static at(path: string, onError?: (err: Error) => void): JsonlTranscript {
    const t = new JsonlTranscript(path, onError);
    t.dirReady = true;
    t.checkTail = true;
    return t;
  }

  write(item: TranscriptItem): Promise<void> {
    let line: string;
    try {
      line = `${JSON.stringify(item)}\n`;
    } catch (err) {
      this.report(err);
      return this.chain;
    }
    this.chain = this.chain.then(async () => {
      try {
        if (!this.dirReady) {
          await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
          this.dirReady = true;
        }
        let prefix = "";
        if (this.checkTail) {
          this.checkTail = false;
          if (!(await endsWithNewline(this.path))) prefix = "\n";
        }
        await appendFile(this.path, prefix + line, { encoding: "utf8", mode: 0o600 });
      } catch (err) {
        this.report(err);
      }
    });
    return this.chain;
  }

  /** Resolves once every queued line is on disk. Never rejects. */
  flush(): Promise<void> {
    return this.chain;
  }

  private report(err: unknown): void {
    this.failures++;
    this.onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

async function endsWithNewline(path: string): Promise<boolean> {
  let handle;
  try {
    handle = await open(path, "r");
  } catch {
    return true; // missing file: nothing to repair
  }
  try {
    const { size } = await handle.stat();
    if (size === 0) return true;
    const buf = Buffer.alloc(1);
    await handle.read(buf, 0, 1, size - 1);
    return buf[0] === 0x0a;
  } finally {
    await handle.close();
  }
}

/** Read every item of a JSONL transcript; malformed lines (e.g. a torn last line) are skipped. */
export async function readTranscript(path: string): Promise<TranscriptItem[]> {
  const text = await readFile(path, "utf8");
  const items: TranscriptItem[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const value = JSON.parse(trimmed) as TranscriptItem;
      if (value && typeof value === "object" && typeof value.type === "string") items.push(value);
    } catch {
      /* torn line */
    }
  }
  return items;
}

export interface SessionSummary {
  id: string;
  path: string;
  caseId: string;
  startedAt: string;
}

function readHead(path: string, bytes = 64 * 1024): string {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

async function walkJsonl(dir: string, depth: number): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && depth < 4) out.push(...(await walkJsonl(path, depth + 1)));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) out.push(path);
  }
  return out;
}

/**
 * List recorded sessions (newest first) from `<home>/sessions` (or `dir`).
 * Uses each file's `session_meta` line; files without one fall back to the
 * file name and modification time.
 */
export async function listSessions(env: Env = process.env, options: { dir?: string | null; limit?: number } = {}): Promise<SessionSummary[]> {
  const base = options.dir || sessionsDir(env);
  const files = await walkJsonl(base, 0);
  const sessions: SessionSummary[] = [];
  for (const path of files) {
    let meta: Extract<TranscriptItem, { type: "session_meta" }> | undefined;
    try {
      for (const line of readHead(path).split("\n")) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line) as TranscriptItem;
          if (item?.type === "session_meta") {
            meta = item;
            break;
          }
        } catch {
          break;
        }
      }
    } catch {
      continue;
    }
    if (meta) {
      sessions.push({ id: meta.payload.sessionId, path, caseId: meta.payload.caseId, startedAt: meta.ts });
    } else {
      const m = /Z-([A-Za-z0-9_-]+)\.jsonl$/.exec(path);
      const info = await stat(path).catch(() => null);
      sessions.push({ id: m?.[1] ?? path, path, caseId: "", startedAt: info ? info.mtime.toISOString() : "" });
    }
  }
  sessions.sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0));
  return options.limit ? sessions.slice(0, options.limit) : sessions;
}
