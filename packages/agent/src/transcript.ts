/**
 * Transcripts ("rollouts", Codex): append-only `TranscriptItem` streams.
 * `MemoryTranscript` is the isomorphic in-memory sink (tests, browsers);
 * `@clinicalcraft/agent/node` adds the JSONL file sink. `replayTranscript`
 * turns items back into what a session needs to resume: session meta,
 * accepted clinical actions (to replay through `reduce`), per-agent
 * conversations and the op log.
 */
import type { ClinicalAction } from "@clinicalcraft/core";
import type { AgentRole, Op } from "./protocol.js";
import type { ChatMessage, ChatPart } from "./providers/types.js";
import type { TranscriptItem, TranscriptSink } from "./session/types.js";

/** In-memory transcript sink. */
export class MemoryTranscript implements TranscriptSink {
  readonly items: TranscriptItem[] = [];
  readonly path = null;

  write(item: TranscriptItem): void {
    this.items.push(item);
  }

  async flush(): Promise<void> {
    /* nothing buffered */
  }

  /** Items of one type. */
  ofType<T extends TranscriptItem["type"]>(type: T): Extract<TranscriptItem, { type: T }>[] {
    return this.items.filter((i): i is Extract<TranscriptItem, { type: T }> => i.type === type);
  }

  clear(): void {
    this.items.length = 0;
  }
}

type SessionMeta = Extract<TranscriptItem, { type: "session_meta" }>["payload"];

export interface ReplayedTranscript {
  /** Last `session_meta` payload (null when missing). */
  sessionMeta: SessionMeta | null;
  /** Accepted clinical actions in order (rejected ones are dropped). */
  actions: ClinicalAction[];
  /** Conversation per agent; a `compacted` item restarts that agent's history with its summary. */
  messages: Partial<Record<AgentRole, ChatMessage[]>>;
  /** Latest compaction summary per agent. */
  summaries: Partial<Record<AgentRole, string>>;
  /** Submitted ops in order. */
  ops: { id: string; op: Op }[];
  /** Highest ordinal seen (resume continues from ordinal + 1). */
  lastOrdinal: number;
}

const PART_TYPES = new Set(["text", "image", "tool_call", "tool_result", "provider_raw"]);

/** Normalise a stored message content (ChatPart[] or plain string) to ChatPart[]. */
export function normaliseContent(content: unknown): ChatPart[] | null {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (!Array.isArray(content)) return null;
  const parts = content.filter((p): p is ChatPart => typeof p === "object" && p !== null && PART_TYPES.has(String((p as { type?: unknown }).type)));
  return parts;
}

/**
 * Rebuild resumable state from transcript items. Items are processed in
 * ordinal order (stable for equal ordinals); malformed items are skipped.
 */
export function replayTranscript(items: readonly TranscriptItem[]): ReplayedTranscript {
  const sorted = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item && typeof item === "object" && typeof item.type === "string")
    .sort((a, b) => (a.item.ordinal ?? 0) - (b.item.ordinal ?? 0) || a.i - b.i)
    .map(({ item }) => item);

  const result: ReplayedTranscript = { sessionMeta: null, actions: [], messages: {}, summaries: {}, ops: [], lastOrdinal: -1 };
  for (const item of sorted) {
    if (typeof item.ordinal === "number" && item.ordinal > result.lastOrdinal) result.lastOrdinal = item.ordinal;
    switch (item.type) {
      case "session_meta":
        result.sessionMeta = item.payload;
        break;
      case "op":
        if (item.payload?.op) result.ops.push({ id: item.payload.id, op: item.payload.op });
        break;
      case "action":
        if (item.payload?.accepted && item.payload.action) result.actions.push(item.payload.action);
        break;
      case "message": {
        const agent = item.payload?.agent;
        const role = item.payload?.role;
        const content = normaliseContent(item.payload?.content);
        if (!agent || (role !== "user" && role !== "assistant") || !content) break;
        (result.messages[agent] ??= []).push({ role, content });
        break;
      }
      case "compacted": {
        const agent = item.payload?.agent;
        if (!agent) break;
        result.summaries[agent] = item.payload.summary;
        result.messages[agent] = [{ role: "user", content: [{ type: "text", text: item.payload.summary }] }];
        break;
      }
      default:
        break;
    }
  }
  return result;
}

/** Monotonic item factory: stamps `ordinal` and `ts` (clock injectable). */
export class TranscriptRecorder {
  private ordinal: number;

  constructor(
    private readonly sink: TranscriptSink,
    private readonly now: () => number = () => Date.now(),
    startOrdinal = 0,
  ) {
    this.ordinal = startOrdinal;
  }

  /** Write one item; returns the stamped item. */
  record<T extends TranscriptItem["type"]>(type: T, payload: Extract<TranscriptItem, { type: T }>["payload"]): Extract<TranscriptItem, { type: T }> {
    const item = { type, ordinal: this.ordinal++, ts: new Date(this.now()).toISOString(), payload } as Extract<TranscriptItem, { type: T }>;
    void Promise.resolve(this.sink.write(item)).catch(() => undefined);
    return item;
  }

  flush(): Promise<void> {
    return this.sink.flush?.() ?? Promise.resolve();
  }
}
