/**
 * Session bridge: runs a `ClinicalSession` (from @clinicalcraft/agent) in the
 * browser and feeds its event stream into the UI store.
 *
 *   settings   localStorage "clinicalcraft-v5-settings" merged with the agent's merge helpers
 *   providers  offline (default) | proxy (served by `clinicalcraft serve`) | direct (user key)
 *   transcript POST /api/transcripts/:id when served, else in memory
 *   dynamic    `walk_to` (executed by the 3D world, see world-bridge.ts)
 */
import {
  createSession,
  MemoryTranscript,
  type ClinicalSession,
  type Op,
  type ResolvedSettings,
  type SessionSnapshot,
  type TranscriptItem,
  type TranscriptSink,
} from "@clinicalcraft/agent";
import { ClinicalActionSchema, type CaseDefinition, type ClinicalAction, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { browserResolveProvider, type RuntimeChoice } from "./llm.js";
import { resolveAgentSettings, type StoredSettings } from "./settings.js";
import { SessionStore } from "./store.js";

/** Transcript sink that appends JSONL items to `clinicalcraft serve` (falls back to memory on failure). */
export class HttpTranscriptSink implements TranscriptSink {
  readonly path = null;
  private buffer: TranscriptItem[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  readonly memory = new MemoryTranscript();

  constructor(private readonly sessionId: string) {}

  write(item: TranscriptItem): void {
    this.memory.write(item);
    if (this.failures >= 3) return;
    this.buffer.push(item);
    if (!this.timer) this.timer = setTimeout(() => void this.flush(), 1000);
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.buffer.length || this.failures >= 3) return;
    const batch = this.buffer;
    this.buffer = [];
    try {
      const res = await fetch(`/api/transcripts/${encodeURIComponent(this.sessionId)}`, {
        method: "POST",
        headers: { "content-type": "application/x-ndjson" },
        body: batch.map((i) => JSON.stringify(i)).join("\n") + "\n",
        keepalive: true,
      });
      if (!res.ok) throw new Error(String(res.status));
      this.failures = 0;
    } catch {
      this.failures++;
      if (this.failures < 3) this.buffer.unshift(...batch);
    }
  }
}

export interface AppSessionOptions {
  caseDef: CaseDefinition;
  facility: FacilityDefinition | null;
  catalogs: EquipmentCatalog[];
  stored: StoredSettings;
  choice: RuntimeChoice;
  locale: string;
  served: boolean;
  resume?: SessionSnapshot | null;
}

export interface AppSession {
  readonly session: ClinicalSession;
  readonly store: SessionStore;
  readonly settings: ResolvedSettings;
  readonly transcript: TranscriptSink;
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
  const transcript: TranscriptSink = o.served ? new HttpTranscriptSink(sessionId) : new MemoryTranscript();

  const resume = o.resume && o.resume.caseId === o.caseDef.id ? o.resume : null;
  if (resume) store.restore(resume.messages ?? {});

  const session = await createSession({
    caseDef: o.caseDef,
    facility: o.facility,
    catalogs: o.catalogs,
    settings,
    sessionId,
    transcript,
    dynamicTools: ["walk_to"],
    resolveProvider: browserResolveProvider(() => settings, () => mode),
    ...(resume ? { resume: { sessionId, actions: cleanActions(resume.actions), messages: resume.messages ?? {} } } : {}),
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
