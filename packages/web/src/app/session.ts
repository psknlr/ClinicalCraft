/**
 * Session bridge: runs a `ClinicalSession` (from @clinicalcraft/agent) in the
 * browser and feeds its event stream into the UI store.
 *
 *   settings   localStorage "clinicalcraft-v5-settings" merged with the agent's merge helpers
 *   providers  offline (default) | proxy (served by `clinicalcraft serve`) | direct (user key)
 *   transcript POST /api/transcripts/:id when served, else not kept (nothing in the browser reads it)
 *   dynamic    `walk_to` (executed by the 3D world, see world-bridge.ts)
 */
import {
  createSession,
  type ClinicalSession,
  type Op,
  type PlanItem,
  type ResolvedSettings,
  type SessionSnapshot,
  type TranscriptItem,
  type TranscriptSink,
} from "@clinicalcraft/agent";
import { ClinicalActionSchema, type CaseDefinition, type ClinicalAction, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { browserResolveProvider, type RuntimeChoice } from "./llm.js";
import { resolveAgentSettings, type StoredSettings } from "./settings.js";
import { SessionStore } from "./store.js";

/**
 * Largest NDJSON body per upload request. Browsers cap the bodies of
 * `keepalive` requests (in flight together) at 64 KiB; staying below that
 * lets the page-exit flush use `keepalive`, and keeps every request far below
 * the server's body limit.
 */
export const TRANSCRIPT_CHUNK_BYTES = 60 * 1024;

const encoder = new TextEncoder();

/** Split transcript items into NDJSON bodies of at most `maxBytes` (an oversized single item gets a body of its own). */
export function ndjsonChunks(items: readonly TranscriptItem[], maxBytes = TRANSCRIPT_CHUNK_BYTES): { body: string; count: number; bytes: number }[] {
  const chunks: { body: string; count: number; bytes: number }[] = [];
  let lines: string[] = [];
  let bytes = 0;
  for (const item of items) {
    const line = `${JSON.stringify(item)}\n`;
    const size = encoder.encode(line).length;
    if (lines.length > 0 && bytes + size > maxBytes) {
      chunks.push({ body: lines.join(""), count: lines.length, bytes });
      lines = [];
      bytes = 0;
    }
    lines.push(line);
    bytes += size;
  }
  if (lines.length > 0) chunks.push({ body: lines.join(""), count: lines.length, bytes });
  return chunks;
}

/**
 * Transcript sink for a page not served by `clinicalcraft serve`: there is
 * nowhere to upload to and nothing in the browser reads a transcript (saves
 * use `ClinicalSession.snapshot()`), so items are dropped instead of piling
 * up in memory for the life of the game. The session's recorder still numbers
 * them, so `snapshot().nextOrdinal` keeps its meaning.
 */
export class NullTranscriptSink implements TranscriptSink {
  readonly path = null;

  write(_item: TranscriptItem): void {
    /* not kept */
  }

  async flush(): Promise<void> {
    /* nothing buffered */
  }
}

/**
 * Transcript sink that appends JSONL items to `clinicalcraft serve` (it keeps
 * only what is waiting to be sent). Uploads are batched (1 s), sent in order as NDJSON
 * chunks of ≤ 60 KB; after 3 consecutive network failures — or a refusal
 * that retrying cannot fix (413 quota, 4xx) — it stops and reports it once
 * through `onStopped`. `flushOnExit()` (page hide) sends what still fits in
 * the browser's keepalive budget.
 */
export class HttpTranscriptSink implements TranscriptSink {
  readonly path = null;
  private buffer: TranscriptItem[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private stopped = false;
  private sending: Promise<void> = Promise.resolve();

  constructor(
    private readonly sessionId: string,
    private readonly onStopped?: (reason: "network" | "refused") => void,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  /** True once uploads stopped for good. */
  get uploadsStopped(): boolean {
    return this.stopped;
  }

  write(item: TranscriptItem): void {
    if (this.stopped) return;
    this.buffer.push(item);
    if (!this.timer) this.timer = setTimeout(() => void this.flush(), 1000);
  }

  /** Upload everything buffered (in order, chunked); resolves when done. Never rejects. */
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.sending = this.sending.then(() => this.drain(false));
    return this.sending;
  }

  /**
   * Page is going away (pagehide / hidden): send the buffer with `keepalive`
   * — only what fits the browser's 64 KiB keepalive budget, the rest stays
   * buffered (and is sent if the page comes back).
   */
  flushOnExit(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.stopped || this.buffer.length === 0) return;
    const chunk = ndjsonChunks(this.buffer)[0]!;
    if (chunk.bytes > TRANSCRIPT_CHUNK_BYTES) return; // one huge item: not sendable with keepalive
    const items = this.buffer.splice(0, chunk.count);
    // Sent right away (the page may not get another task): it can overtake an upload in flight,
    // which is harmless — replay orders items by ordinal.
    void this.post(chunk.body, true).then((outcome) => {
      if (outcome !== "ok") this.handleFailure(outcome, items);
    });
  }

  private async drain(keepalive: boolean): Promise<void> {
    while (!this.stopped && this.buffer.length > 0) {
      const chunk = ndjsonChunks(this.buffer)[0]!;
      const items = this.buffer.splice(0, chunk.count);
      const outcome = await this.post(chunk.body, keepalive && chunk.bytes <= TRANSCRIPT_CHUNK_BYTES);
      if (outcome !== "ok") {
        this.handleFailure(outcome, items);
        return;
      }
    }
  }

  private async post(body: string, keepalive: boolean): Promise<"ok" | "network" | "refused"> {
    try {
      const res = await this.fetchImpl(`/api/transcripts/${encodeURIComponent(this.sessionId)}`, {
        method: "POST",
        headers: { "content-type": "application/x-ndjson" },
        body,
        ...(keepalive ? { keepalive: true } : {}),
      });
      if (res.ok) {
        this.failures = 0;
        return "ok";
      }
      // Quota / bad request / auth: retrying the same body cannot succeed.
      return res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429 ? "refused" : "network";
    } catch {
      return "network";
    }
  }

  private handleFailure(outcome: "network" | "refused", items: TranscriptItem[]): void {
    if (outcome === "network" && ++this.failures < 3) {
      this.buffer.unshift(...items);
      if (!this.timer) this.timer = setTimeout(() => void this.flush(), 1000 * 2 ** this.failures);
      return;
    }
    this.stopped = true;
    this.buffer = [];
    this.onStopped?.(outcome);
  }
}

/** Session commands the web front-end handles itself (`disabledCommands`: `/help` omits them, the session refuses them). */
export const WEB_HANDLED_COMMANDS: readonly string[] = ["quit", "exit", "export", "clear", "lang", "provider", "model", "approval", "scope"];

export interface AppSessionOptions {
  caseDef: CaseDefinition;
  facility: FacilityDefinition | null;
  catalogs: EquipmentCatalog[];
  stored: StoredSettings;
  choice: RuntimeChoice;
  locale: string;
  served: boolean;
  resume?: SessionSnapshot | null;
  /** Transcript uploads to the server stopped for good (served only). */
  onTranscriptStopped?: (reason: "network" | "refused") => void;
}

export interface AppSession {
  readonly session: ClinicalSession;
  readonly store: SessionStore;
  readonly settings: ResolvedSettings;
  readonly transcript: TranscriptSink & { flushOnExit?: () => void };
  /** Submit an op (logged into the store first, so the learner's own line renders immediately); `view` = the conversation it came from. */
  submit(op: Op, view?: string): string;
  /** Shorthand for a learner clinical action. */
  act(action: ClinicalAction, rationale?: string): string;
  /** Run the clinician autopilot; resolves when it stops. */
  autopilot(goal?: string): Promise<void>;
  interrupt(): void;
  /** Update provider/model/locale/approval/scope on a running session. */
  reconfigure(stored: StoredSettings, choice: RuntimeChoice, locale: string): void;
  snapshot(): SessionSnapshot;
  close(): Promise<void>;
}

/** Validate saved actions before resuming (drops anything malformed). */
export function cleanActions(actions: unknown): ClinicalAction[] {
  if (!Array.isArray(actions)) return [];
  const out: ClinicalAction[] = [];
  for (const a of actions.slice(0, 20000)) {
    const r = ClinicalActionSchema.safeParse(a);
    if (r.success) out.push(r.data as ClinicalAction);
  }
  return out;
}

const PLAN_STATUSES: ReadonlySet<string> = new Set<PlanItem["status"]>(["pending", "in_progress", "completed"]);

/** The workup plan of a saved snapshot as `PlanItem`s (items with a non-string text or an unknown status are dropped). */
export function restoredPlan(plan: readonly { text: unknown; status: unknown }[] | null | undefined): PlanItem[] {
  if (!Array.isArray(plan)) return [];
  return plan
    .filter((p): p is PlanItem => !!p && typeof p.text === "string" && typeof p.status === "string" && PLAN_STATUSES.has(p.status))
    .map((p) => ({ text: p.text, status: p.status }));
}

export function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* insecure context */
  }
  return `s-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export async function startAppSession(o: AppSessionOptions): Promise<AppSession> {
  let { settings } = resolveAgentSettings(o.stored, { provider: o.choice.provider, model: o.choice.model, locale: o.locale });
  let mode = o.choice.mode;
  const store = new SessionStore(o.caseDef);
  const sessionId = o.resume?.sessionId ?? newId();
  const transcript: TranscriptSink & { flushOnExit?: () => void } = o.served ? new HttpTranscriptSink(sessionId, o.onTranscriptStopped) : new NullTranscriptSink();

  const resume = o.resume && o.resume.caseId === o.caseDef.id ? o.resume : null;
  if (resume) store.restore(resume.messages ?? {});
  // The published workup plan (`/plan`, the journal, the clinician's prompt) survives a save/load.
  const plan = resume ? restoredPlan(resume.plan) : [];
  if (plan.length) store.restorePlan(plan);

  const session = await createSession({
    caseDef: o.caseDef,
    facility: o.facility,
    catalogs: o.catalogs,
    settings,
    sessionId,
    transcript,
    dynamicTools: ["walk_to"],
    // Handled by the web UI itself (see ui/panels/conversation.ts webCommand): hidden from /help.
    disabledCommands: WEB_HANDLED_COMMANDS,
    resolveProvider: browserResolveProvider(() => settings, () => mode),
    ...(resume ? { resume: { sessionId, actions: cleanActions(resume.actions), messages: resume.messages ?? {}, ...(resume.dialogue?.length ? { dialogue: resume.dialogue } : {}) } } : {}),
    // A snapshot keeps no plan explanation (SessionSnapshot.plan is items only).
    ...(plan.length ? { restore: { plan: { items: plan, explanation: null } } } : {}),
    // Same transcript file (served: sessions/web/<id>.jsonl): continue its ordinal sequence.
    ...(resume && typeof resume.nextOrdinal === "number" && Number.isInteger(resume.nextOrdinal) && resume.nextOrdinal >= 0 ? { transcriptOrdinal: resume.nextOrdinal } : {}),
  });

  // The first events() iterator receives the startup backlog (session_configured, state_snapshot).
  void (async () => {
    try {
      for await (const event of session.events()) store.event(event);
    } catch (err) {
      console.error("event stream ended", err);
    }
  })();

  const submit = (op: Op, view?: string): string => {
    const id = session.submit(op);
    store.op(id, op, view);
    return id;
  };

  return {
    session,
    store,
    get settings() {
      return settings;
    },
    transcript,
    submit,
    act: (action, rationale) => submit({ type: "clinical_action", action, ...(rationale ? { rationale } : {}) }),
    async autopilot(goal) {
      const op: Op = { type: "autopilot", ...(goal?.trim() ? { goal: goal.trim() } : {}) };
      store.op("autopilot", op);
      try {
        await session.run(op);
      } finally {
        store.autopilotDone();
      }
    },
    interrupt: () => void session.submit({ type: "interrupt" }),
    reconfigure(stored, choice, locale) {
      settings = resolveAgentSettings(stored, { provider: choice.provider, model: choice.model, locale }).settings;
      mode = choice.mode;
      submit({
        type: "configure",
        patch: {
          provider: choice.provider,
          ...(choice.model ? { model: choice.model } : {}),
          approvalMode: settings.approvalMode,
          practiceScope: settings.practiceScope,
          locale,
        },
      });
    },
    snapshot: () => session.snapshot(),
    async close() {
      try {
        await session.close();
      } catch {
        /* already closed */
      }
      await transcript.flush?.();
    },
  };
}
