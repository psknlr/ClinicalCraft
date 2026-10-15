/**
 * `POST /api/transcripts/:sessionId` — the browser session's transcript
 * uploads. Accepts NDJSON (`application/x-ndjson`, what the web app sends), a
 * JSON array of items or `{items: [...]}`, validates the item envelope and
 * appends to `<CLINICALCRAFT_HOME>/sessions/web/<sessionId>.jsonl` (mode
 * 0600) through `JsonlTranscript`, which masks credentials before writing.
 * Such files are found by `clinicalcraft sessions list` / `--resume`.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { TranscriptItem } from "@clinicalcraft/agent";
import { JsonlTranscript, sessionsDir, type Env } from "@clinicalcraft/agent/node";

const ITEM_TYPES = new Set(["session_meta", "op", "action", "message", "event", "compacted"]);
const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;
/** Open writers kept per server (least recently used beyond this are dropped). */
const MAX_WRITERS = 64;

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
  private readonly dir: string;

  /** `baseDir` = the sessions directory (default `<CLINICALCRAFT_HOME>/sessions`). */
  constructor(
    private readonly env: Env,
    baseDir?: string | null,
  ) {
    this.dir = join(baseDir || sessionsDir(env), "web");
  }

  /** Path of a session's file. */
  pathFor(sessionId: string): string {
    return join(this.dir, `${sessionId}.jsonl`);
  }

  /** Append items (in order) and resolve once they are on disk. */
  async append(sessionId: string, items: readonly TranscriptItem[]): Promise<{ path: string; written: number }> {
    if (!isValidSessionId(sessionId)) throw new Error("invalid session id");
    const writer = await this.writer(sessionId);
    let failures = writer.failures;
    for (const item of items) void writer.write(item);
    await writer.flush();
    failures = writer.failures - failures;
    if (failures > 0) throw new Error(`${failures} transcript line(s) could not be written`);
    return { path: writer.path, written: items.length };
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
    const writer = JsonlTranscript.at(this.pathFor(sessionId), undefined, { env: this.env });
    this.writers.set(sessionId, writer);
    while (this.writers.size > MAX_WRITERS) {
      const oldest = this.writers.keys().next().value as string;
      this.writers.delete(oldest);
    }
    return writer;
  }
}
