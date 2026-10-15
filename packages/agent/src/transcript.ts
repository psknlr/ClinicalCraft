/**
 * Transcripts ("rollouts", Codex): append-only `TranscriptItem` streams.
 * `MemoryTranscript` is the isomorphic in-memory sink (tests, browsers);
 * `@clinicalcraft/agent/node` adds the JSONL file sink. `replayTranscript`
 * turns items back into what a session needs to resume: session meta,
 * accepted clinical actions (to replay through `reduce`), per-agent
 * conversations and the op log. `redactSecrets` / `redactValue` mask
 * credentials before anything is persisted.
 */
import type { ClinicalAction } from "@clinicalcraft/core";
import type { AgentRole, ApprovalMode, Op, PlanItem, PracticeScope } from "./protocol.js";
import type { ChatMessage, ChatPart } from "./providers/types.js";
import type { DialogueEntry, TranscriptItem, TranscriptSink } from "./session/types.js";

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
  /**
   * Conversation per agent; a `compacted` item restarts that agent's history
   * with its summary (an empty summary — written by `/clear` — empties it).
   */
  messages: Partial<Record<AgentRole, ChatMessage[]>>;
  /** Latest compaction summary per agent. */
  summaries: Partial<Record<AgentRole, string>>;
  /** Submitted ops in order. */
  ops: { id: string; op: Op }[];
  /** Highest ordinal seen (resume continues from ordinal + 1). */
  lastOrdinal: number;
  /** The examiner's dialogue lines (`dialogue` items) in order. */
  dialogue: DialogueEntry[];
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
 * Transcript items in replay order: by ordinal within a recording segment
 * (stable for equal ordinals), segments in file order. A later `session_meta`
 * (a resume) whose ordinal does not continue the sequence (≤ the highest
 * ordinal so far) starts a new segment — e.g. a resume that restarted its
 * ordinals at 0 (old web saves) — so two runs never interleave. Malformed
 * items are dropped.
 */
export function orderTranscriptItems(items: readonly TranscriptItem[]): TranscriptItem[] {
  let segment = 0;
  let maxOrdinal = -Infinity;
  let metas = 0;
  const keyed: { item: TranscriptItem; i: number; segment: number }[] = [];
  items.forEach((item, i) => {
    if (!item || typeof item !== "object" || typeof item.type !== "string") return;
    const ordinal = typeof item.ordinal === "number" ? item.ordinal : 0;
    if (item.type === "session_meta" && metas++ > 0 && ordinal <= maxOrdinal) {
      segment++;
      maxOrdinal = -Infinity;
    }
    if (ordinal > maxOrdinal) maxOrdinal = ordinal;
    keyed.push({ item, i, segment });
  });
  return keyed.sort((a, b) => a.segment - b.segment || (a.item.ordinal ?? 0) - (b.item.ordinal ?? 0) || a.i - b.i).map(({ item }) => item);
}

/**
 * Rebuild resumable state from transcript items, in `orderTranscriptItems`
 * order; malformed items are skipped.
 */
export function replayTranscript(items: readonly TranscriptItem[]): ReplayedTranscript {
  const sorted = orderTranscriptItems(items);

  const result: ReplayedTranscript = { sessionMeta: null, actions: [], messages: {}, summaries: {}, ops: [], lastOrdinal: -1, dialogue: [] };
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
      case "dialogue": {
        const d = item.payload;
        if (d && typeof d.who === "string" && typeof d.speaker === "string" && typeof d.text === "string") result.dialogue.push({ who: d.who, speaker: d.speaker, text: d.text });
        break;
      }
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
        const summary = typeof item.payload.summary === "string" ? item.payload.summary : "";
        if (!summary.trim()) {
          // `/clear`: the conversation was discarded.
          delete result.summaries[agent];
          result.messages[agent] = [];
          break;
        }
        result.summaries[agent] = summary;
        result.messages[agent] = [{ role: "user", content: [{ type: "text", text: summary }] }];
        break;
      }
      default:
        break;
    }
  }
  return result;
}

/** Runtime configuration a resumed session should continue with (PROTOCOL §10). */
export interface ResumedRuntimeConfig {
  locale?: string;
  provider?: string;
  model?: string | null;
  approvalMode?: ApprovalMode;
  practiceScope?: PracticeScope;
  interlocutor?: string;
  /** Last published workup plan. */
  plan?: { items: PlanItem[]; explanation: string | null };
  /** Last persisted affect intensity (0–3) per speaker, from patient/companion `message` items (`affectIntensity`). */
  affect?: Partial<Record<"patient" | "companion", 0 | 1 | 2 | 3>>;
}

/**
 * The configuration in effect at the end of a transcript: the last
 * `session_meta` (locale, provider, model), then every `config_changed`
 * patch in order (`/lang`, `/approval`, `/scope`, `/talk`, `/model`…), plus
 * the last `plan_updated` and the patient's/companion's last affect.
 */
export function resumedRuntimeConfig(items: readonly TranscriptItem[]): ResumedRuntimeConfig {
  const sorted = orderTranscriptItems(items);
  const out: ResumedRuntimeConfig = {};
  for (const item of sorted) {
    if (item.type === "session_meta" && item.payload) {
      if (item.payload.locale) out.locale = item.payload.locale;
      if (item.payload.provider) out.provider = item.payload.provider;
      out.model = item.payload.model || null;
      continue;
    }
    if (item.type === "message") {
      const agent = item.payload?.agent;
      const speaker = agent === "patient" ? "patient" : agent === "companion" ? "companion" : null;
      const intensity = (item.payload as { affectIntensity?: unknown } | undefined)?.affectIntensity;
      if (speaker && (intensity === 0 || intensity === 1 || intensity === 2 || intensity === 3)) (out.affect ??= {})[speaker] = intensity;
      continue;
    }
    if (item.type !== "event" || !item.payload?.msg) continue;
    const msg = item.payload.msg;
    if (msg.type === "plan_updated") out.plan = { items: msg.plan.map((p) => ({ text: p.text, status: p.status })), explanation: msg.explanation ?? null };
    if (msg.type !== "config_changed") continue;
    const p = msg.patch;
    if (!p || typeof p !== "object") continue; // malformed (e.g. hand-edited or uploaded) item
    if (p.locale) out.locale = p.locale;
    if (p.provider) {
      out.provider = p.provider;
      if (p.model === undefined) out.model = null;
    }
    if (p.model !== undefined) out.model = p.model || null;
    if (p.approvalMode) out.approvalMode = p.approvalMode;
    if (p.practiceScope) out.practiceScope = p.practiceScope;
    if (p.interlocutor) out.interlocutor = p.interlocutor;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Secret redaction (persisted transcripts, logs)                      */
/* ------------------------------------------------------------------ */

/** Replacement text for redacted secrets. */
export const REDACTED = "[REDACTED]";
/** Values shorter than this are never treated as secrets (avoids masking ordinary words). */
const MIN_SECRET_LENGTH = 8;

/** Well-known credential formats (Anthropic, OpenAI-style `sk-…`, xAI, Google, Zhipu `id.secret`). */
const SECRET_PATTERNS: readonly RegExp[] = [
  /\bsk-ant-[A-Za-z0-9_-]{8,}/g,
  /\bsk-[A-Za-z0-9][A-Za-z0-9_-]{15,}/g,
  /\bxai-[A-Za-z0-9]{20,}/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\b[0-9a-f]{32}\.[A-Za-z0-9]{16}\b/g,
];
const BEARER_RE = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi;
const KEY_FIELD_RE = /\b((?:x-api-key|api[_-]?key|access[_-]?token|auth[_-]?token|authorization)["']?\s*[:=]\s*["']?)(?!Bearer\b)[^\s"',;}]{8,}/gi;
/** Environment variable names whose values are credentials. */
const SECRET_ENV_RE = /(?:API_?KEY|AUTH_?TOKEN|ACCESS_?TOKEN|_TOKEN|SECRET|PASSWORD|PASSWD)$/i;

/** Credential values found in an environment (`*_API_KEY`, `*_TOKEN`, `*SECRET`…; ≥ 8 chars). */
export function secretsFromEnv(env: Record<string, string | undefined>): string[] {
  const out = new Set<string>();
  for (const [name, value] of Object.entries(env)) {
    const v = value?.trim();
    if (v && v.length >= MIN_SECRET_LENGTH && SECRET_ENV_RE.test(name)) out.add(v);
  }
  return [...out];
}

/** Mask credentials in a string: the listed `secrets` (≥ 8 chars), well-known key formats, bearer tokens and `api_key=`-style fields. */
export function redactSecrets(text: string, secrets: readonly string[] = []): string {
  let out = text;
  for (const secret of [...secrets].filter((x) => x && x.length >= MIN_SECRET_LENGTH).sort((a, b) => b.length - a.length)) {
    if (out.includes(secret)) out = out.split(secret).join(REDACTED);
  }
  for (const re of SECRET_PATTERNS) out = out.replace(re, REDACTED);
  out = out.replace(BEARER_RE, `$1${REDACTED}`);
  out = out.replace(KEY_FIELD_RE, `$1${REDACTED}`);
  return out;
}

/**
 * Deep copy of `value` with every string passed through `redactSecrets`.
 * `provider_raw` parts are kept byte-exact: they are echoed back to the
 * provider on resume and carry signed blocks (thinking signatures).
 */
export function redactValue<T>(value: T, secrets: readonly string[] = []): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return redactSecrets(v, secrets);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      if ((v as { type?: unknown }).type === "provider_raw") return v;
      if (typeof (v as { toJSON?: unknown }).toJSON === "function") return v;
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return walk(value) as T;
}

/**
 * Monotonic item factory: stamps `ordinal` and `ts` (clock injectable) and
 * passes each item through `redact` (credential masking) before the sink.
 */
export class TranscriptRecorder {
  private ordinal: number;

  /** Ordinal the next item will get (a resume of this recording continues from it). */
  get nextOrdinal(): number {
    return this.ordinal;
  }

  constructor(
    private readonly sink: TranscriptSink,
    private readonly now: () => number = () => Date.now(),
    startOrdinal = 0,
    private readonly redact: ((item: TranscriptItem) => TranscriptItem) | null = null,
  ) {
    this.ordinal = startOrdinal;
  }

  /** Write one item; returns the stamped item (as written). */
  record<T extends TranscriptItem["type"]>(type: T, payload: Extract<TranscriptItem, { type: T }>["payload"]): Extract<TranscriptItem, { type: T }> {
    let item = { type, ordinal: this.ordinal++, ts: new Date(this.now()).toISOString(), payload } as Extract<TranscriptItem, { type: T }>;
    try {
      if (this.redact) item = this.redact(item) as Extract<TranscriptItem, { type: T }>;
      void Promise.resolve(this.sink.write(item)).catch(() => undefined);
    } catch {
      /* a failing transcript sink must never break the session */
    }
    return item;
  }

  flush(): Promise<void> {
    return this.sink.flush?.() ?? Promise.resolve();
  }
}
