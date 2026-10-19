/**
 * Browser side of the world bridge (docs/EMBODIED.md §12, docs/PROTOCOL.md
 * §13): exposes a learner's LIVE session to an external agent attached through
 * `clinicalcraft serve` (`clinicalcraft mcp --attach`). Isomorphic — `fetch`
 * and SSE parsing over a `ReadableStream` (no EventSource, no `node:*`) — so
 * it runs in browsers and in Node 22.
 *
 * `connectWorldBridge({ serverUrl, session, auth, onStatus })`:
 * - registers the session (`POST /api/world/sessions` → live-session id +
 *   channel secret, kept in memory only) with a spoiler-free description
 *   (case handle, title, facility, embodiment, the tools it accepts);
 * - consumes the command channel (SSE): each `call` runs through the
 *   session's normal tool path AS THE CLINICIAN AGENT (op
 *   `external_tool_call`: the clinician's allow-list, scope and deny rules,
 *   hooks, the spatial gate, the approval gate — an approval prompt goes to
 *   the learner like any other, and nothing on the bridge can answer it); a
 *   `cancel` stops it (`external_tool_cancel`);
 * - acknowledges each call and posts its result by correlation id; a command
 *   delivered twice (a reconnect) never runs twice — the stored result is
 *   posted again;
 * - sends heartbeats (on a timer, and when a server ping arrives — background
 *   tabs throttle timers, not network events), reconnects with backoff,
 *   re-registers when the server forgot the session (expiry, restart) and
 *   cancels the calls of a lost registration (no orphaned action waits for an
 *   approval nobody asked for any more);
 * - `dispose()` cancels running calls and unregisters (`DELETE`); a session
 *   shutdown disposes it too.
 *
 * Safety: nothing happens until a front-end calls this (the learner's
 * explicit, per-encounter opt-in); only `BRIDGE_TOOLS` the clinician has are
 * run — never slash commands, configuration, approvals or other ops; calls are
 * refused while the session's approval mode is `bypass` (nothing would ask the
 * learner) unless `allowBypass`.
 */
import { t, type CaseDefinition } from "@clinicalcraft/core";
import type { AgentEvent, AgentRole, EventMsg, Op } from "../protocol.js";
import { parseSSE } from "../providers/sse.js";
import { rt } from "../session/i18n.js";
import type { ResolvedSettings } from "../settings/schema.js";
import {
  BRIDGE_DEFAULTS,
  BRIDGE_LIMITS,
  BRIDGE_TOOLS,
  boundBridgeResult,
  bridgeErrorOf,
  caseHandle,
  CHANNEL_SECRET_HEADER,
  cleanBridgeText,
  isLiveSessionId,
  parseBridgeCommand,
  WORLD_SESSIONS_PATH,
  type BridgeApproval,
  type BridgeCallStatus,
  type BridgeCommand,
  type BridgeRegistered,
  type BridgeRegistration,
  type BridgeToolResult,
} from "./protocol.js";

/** What the bridge needs of a session (`ClinicalSession` fits). */
export interface BridgeSession {
  readonly id: string;
  readonly caseDef: Pick<CaseDefinition, "id" | "title">;
  readonly facility: { readonly id: string } | null;
  readonly locale: string;
  readonly settings: Pick<ResolvedSettings, "approvalMode">;
  readonly embodiment: "clinical" | "embodied";
  readonly isClosed?: boolean;
  run(op: Op): Promise<AgentEvent[]>;
  submit(op: Op): string;
  subscribe(listener: (event: AgentEvent) => void): () => void;
  toolsFor(agent: AgentRole): readonly { name: string }[];
}

/** How the bridge authenticates to `clinicalcraft serve`. */
export interface WorldBridgeAuth {
  /**
   * The server's access token, sent as `Authorization: Bearer` (Node, or a page
   * not served by the server). A page served by `clinicalcraft serve` needs
   * none: its `cc_token` cookie (set by the `?token=` visit) goes with every
   * same-origin request.
   */
  token?: string | null;
  /** `fetch` credentials mode (default `same-origin`). */
  credentials?: RequestCredentials;
}

export type WorldBridgeState = "connecting" | "connected" | "reconnecting" | "failed" | "closed";

export interface WorldBridgeStatus {
  state: WorldBridgeState;
  /** The id attach clients name (`--world-session`, `session_id`), once registered. */
  liveSessionId: string | null;
  /** External calls queued or running in the session. */
  activeCalls: number;
  /** Why the bridge is reconnecting, failed or closed: a stable code and a localised message. */
  error: { code: string; message: string } | null;
}

/** One external call: accepted, running (its submission id known), finished. */
export type WorldBridgeActivity =
  | { phase: "started"; correlationId: string; tool: string; args: Record<string, unknown> }
  /** The call's turn started: `submissionId` is the `AgentEvent.id` of its events (approval requests included). */
  | { phase: "running"; correlationId: string; tool: string; submissionId: string }
  | { phase: "finished"; correlationId: string; tool: string; result: BridgeToolResult };

export interface WorldBridgeOptions {
  /** `clinicalcraft serve`'s base URL — "" (the page's own origin) in a served page, `http://127.0.0.1:5178` in Node. */
  serverUrl: string;
  session: BridgeSession;
  auth?: WorldBridgeAuth;
  /** Status changes (state, live-session id, active calls, error). Exceptions are ignored. */
  onStatus?: (status: WorldBridgeStatus) => void;
  /** Each external call as it starts, runs and finishes (activity indicator, labelling approval requests). */
  onActivity?: (activity: WorldBridgeActivity) => void;
  /** Run calls even while the session's approval mode is `bypass` (default false: refused). */
  allowBypass?: boolean;
  /** Restrict the tools offered (default: every bridge tool the clinician has). */
  tools?: readonly string[];
  /** Spoiler-free title shown to attach clients (default: the case title in the session's language; null: none). */
  title?: string | null;
  fetch?: typeof fetch;
  /** Reconnect backoff in ms (default 1 000, doubling up to 15 000). */
  backoff?: { initialMs?: number; maxMs?: number };
}

/** A connected bridge. */
export interface WorldBridge {
  readonly status: WorldBridgeStatus;
  /** Resolves at the first `connected`, or at `failed` / `closed`. Never rejects. */
  readonly ready: Promise<WorldBridgeStatus>;
  /** Whether a submission (an `AgentEvent.id`) is an external call of this bridge — e.g. to label its approval requests. */
  owns(submissionId: string): boolean;
  /** Disconnect: cancel running external calls, unregister, stop. Idempotent. */
  dispose(): Promise<void>;
}

/** Register `session` with `clinicalcraft serve` and serve external calls until `dispose()`. */
export function connectWorldBridge(options: WorldBridgeOptions): WorldBridge {
  const bridge = new WorldBridgeClient(options);
  bridge.start();
  return bridge;
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

type Msg<T extends EventMsg["type"]> = Extract<EventMsg, { type: T }>;

function unique(list: readonly string[]): string[] {
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))];
}

export interface BridgeResultOptions {
  /** The bridge asked for a cancellation: a failed result is then `cancelled`. */
  cancelRequested?: boolean;
  /**
   * Other events seen while the call ran: a learner's answer to an approval
   * request (`approval_resolved`) carries the id of the learner's response, not
   * of the call's submission.
   */
  related?: readonly AgentEvent[];
}

/**
 * The result of an `external_tool_call` from the events of its submission
 * (`session.run`): the tool's output and data as the clinician saw them, how
 * the call ended (its turn: `turn_aborted denied` / `interrupted`), the
 * approvals the learner answered, notices and warnings.
 */
export function bridgeResultOf(events: readonly AgentEvent[], callId: string, locale: string, options: BridgeResultOptions = {}): BridgeToolResult {
  const msgs = events.map((e) => e.msg);
  const begin = msgs.find((m): m is Msg<"tool_call_begin"> => m.type === "tool_call_begin" && m.callId === callId);
  const end = begin ? msgs.find((m): m is Msg<"tool_call_end"> => m.type === "tool_call_end" && m.callId === callId && m.turnId === begin.turnId) : undefined;
  const turnEnd = begin ? msgs.find((m): m is Msg<"turn_complete"> | Msg<"turn_aborted"> => (m.type === "turn_complete" || m.type === "turn_aborted") && m.turnId === begin.turnId) : undefined;
  const aborted = turnEnd?.type === "turn_aborted" ? turnEnd.reason : null;
  const decisions = new Map<string, Msg<"approval_resolved">["decision"]>();
  for (const e of [...(options.related ?? []), ...events]) if (e.msg.type === "approval_resolved") decisions.set(e.msg.requestId, e.msg.decision);
  // An answer not seen (no `related` events): what the outcome implies.
  const implied = end?.ok ? "approved" : aborted === "denied" ? "denied" : "abort";
  const approvals: BridgeApproval[] = msgs
    .filter((m): m is Msg<"approval_request"> => m.type === "approval_request")
    .map((r) => ({ tool: r.tool, risk: r.risk, summary: r.summary, decision: decisions.get(r.requestId) ?? implied }));
  const notices = unique(msgs.filter((m): m is Msg<"notification"> => m.type === "notification").map((n) => (n.body ? `${n.title}: ${n.body}` : n.title)));
  const errors = unique(msgs.filter((m): m is Msg<"error"> => m.type === "error").map((m) => m.message));
  const warnings = unique([...msgs.filter((m): m is Msg<"warning"> => m.type === "warning").map((m) => m.message), ...errors]);
  const extras = { ...(notices.length ? { notices } : {}), ...(approvals.length ? { approvals } : {}) };
  if (!end) {
    // Never ran: refused as malformed / duplicate (an error), else cancelled before it started or the session ended.
    const [first, ...rest] = errors.length ? errors : warnings;
    const status: BridgeCallStatus = errors.length ? "error" : "cancelled";
    return boundBridgeResult({ ok: false, status, output: first ?? rt(locale, "bridge.notRun"), ...(rest.length ? { warnings: rest } : {}), ...extras });
  }
  const status: BridgeCallStatus = end.ok ? "ok" : aborted === "denied" ? "denied" : aborted === "interrupted" || options.cancelRequested ? "cancelled" : "error";
  return boundBridgeResult({ ok: end.ok, status, output: end.output, ...(end.data !== undefined ? { data: end.data } : {}), ...(warnings.length ? { warnings } : {}), ...extras });
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

/** An HTTP refusal of a bridge route (`{error: {code, message}}`). */
class BridgeHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BridgeHttpError";
  }
}

/** The server forgot this registration (expired, unregistered, restarted): register again. */
const REREGISTER = new Set(["forbidden_channel", "unknown_session", "session_expired", "session_closed"]);

type Verdict = "retry" | "reregister" | "fatal";

function verdictOf(err: unknown): Verdict {
  if (!(err instanceof BridgeHttpError)) return "retry"; // network errors, a dropped stream
  if (REREGISTER.has(err.code)) return "reregister";
  // No token (401), another origin or host (403), no bridge on this server (404), a malformed request (400, 405, 415).
  if (err.status === 401 || err.status === 403 || err.status === 404 || err.status === 400 || err.status === 405 || err.status === 415) return "fatal";
  return "retry"; // 429 (too many sessions), 5xx
}

async function httpError(res: Response): Promise<BridgeHttpError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  const e = bridgeErrorOf(body);
  return new BridgeHttpError(res.status, e?.code ?? (res.status === 404 ? "not_found" : `http_${res.status}`), e?.message ?? `HTTP ${res.status}`);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function unref(timer: unknown): void {
  (timer as { unref?: () => void } | null)?.unref?.();
}

/** Results kept to answer a command delivered again (correlation id → result). */
const RESULTS_KEPT = 128;
/** Submission ids of external calls remembered for `owns()`. */
const SUBMISSIONS_KEPT = 256;
/** Attempts to post a result. */
const RESULT_ATTEMPTS = 4;
/** External calls queued or running at once (the server allows fewer per session: a misbehaving peer). */
const MAX_RUNNING = 64;

interface Running {
  correlationId: string;
  tool: string;
  cancelled: boolean;
  reg: BridgeRegistered;
}

class WorldBridgeClient implements WorldBridge {
  readonly ready: Promise<WorldBridgeStatus>;
  private resolveReady!: (status: WorldBridgeStatus) => void;
  private readySettled = false;
  private readonly session: BridgeSession;
  private readonly fetchImpl: typeof fetch;
  private readonly base: string;
  private readonly initialBackoff: number;
  private readonly maxBackoff: number;
  private state: WorldBridgeState = "connecting";
  private error: WorldBridgeStatus["error"] = null;
  private reg: BridgeRegistered | null = null;
  private disposed = false;
  private disposing: Promise<void> | null = null;
  private stream: AbortController | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatInFlight = false;
  private lastHeartbeat = 0;
  private backoffMs: number;
  private wake: (() => void) | null = null;
  private unsubscribe: () => void = () => undefined;
  private readonly running = new Map<string, Running>();
  private readonly done = new Map<string, BridgeToolResult>();
  private readonly submissions = new Set<string>();
  private lastReported = "";

  constructor(private readonly options: WorldBridgeOptions) {
    this.session = options.session;
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
    this.base = options.serverUrl.replace(/\/+$/, "");
    this.initialBackoff = Math.max(10, options.backoff?.initialMs ?? 1_000);
    this.maxBackoff = Math.max(this.initialBackoff, options.backoff?.maxMs ?? 15_000);
    this.backoffMs = this.initialBackoff;
    this.ready = new Promise((resolve) => (this.resolveReady = resolve));
  }

  get status(): WorldBridgeStatus {
    return { state: this.state, liveSessionId: this.reg?.id ?? null, activeCalls: this.running.size, error: this.error ? { ...this.error } : null };
  }

  owns(submissionId: string): boolean {
    return this.submissions.has(submissionId);
  }

  start(): void {
    this.unsubscribe = this.session.subscribe((event) => this.onSessionEvent(event));
    if (this.session.isClosed) {
      void this.shutdown({ code: "session_closed", message: rt(this.session.locale, "bridge.closed") });
      return;
    }
    this.report();
    void this.loop();
  }

  dispose(): Promise<void> {
    this.disposing ??= this.shutdown({ code: "disconnected", message: rt(this.session.locale, "bridge.disconnected") });
    return this.disposing;
  }

  /* -------------------------- lifecycle -------------------------- */

  private async loop(): Promise<void> {
    while (!this.disposed) {
      try {
        if (!this.reg) await this.register();
        if (this.disposed) break;
        const reg = this.reg;
        if (!reg) throw new Error("not registered");
        await this.consume(reg);
        if (this.disposed) break;
        if (this.state === "connected") this.error = { code: "stream_ended", message: rt(this.session.locale, "bridge.streamEnded") };
      } catch (err) {
        if (this.disposed) break;
        this.error = this.describe(err);
        const verdict = verdictOf(err);
        if (verdict === "fatal") {
          this.dropRegistration();
          this.setState("failed");
          return;
        }
        if (verdict === "reregister") this.dropRegistration();
      }
      if (this.disposed) break;
      this.setState("reconnecting");
      await this.sleep(this.backoffMs);
      this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoff);
    }
  }

  private async shutdown(reason: { code: string; message: string }): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    for (const r of this.running.values()) this.cancelRunning(r);
    const reg = this.reg;
    this.reg = null;
    this.stopHeartbeats();
    this.stream?.abort();
    this.wake?.();
    if (reg) {
      try {
        await this.http("DELETE", `${WORLD_SESSIONS_PATH}/${encodeURIComponent(reg.id)}`, { reg, keepalive: true });
      } catch {
        /* already expired, or the server is gone: it forgets the session itself */
      }
    }
    this.error = reason;
    this.setState("closed");
  }

  /** The registration is gone (or unusable): stop its heartbeats and stream, cancel the calls it delivered. */
  private dropRegistration(): void {
    const reg = this.reg;
    this.reg = null;
    this.stopHeartbeats();
    this.stream?.abort();
    for (const r of this.running.values()) if (r.reg === reg) this.cancelRunning(r);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        if (this.wake === done) this.wake = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.wake = done;
    });
  }

  /* --------------------------- status ---------------------------- */

  private setState(state: WorldBridgeState): void {
    this.state = state;
    if (state === "connected") this.error = null;
    this.report();
    if (!this.readySettled && (state === "connected" || state === "failed" || state === "closed")) {
      this.readySettled = true;
      this.resolveReady(this.status);
    }
  }

  private report(): void {
    const status = this.status;
    const key = JSON.stringify(status);
    if (key === this.lastReported) return;
    this.lastReported = key;
    try {
      this.options.onStatus?.(status);
    } catch {
      /* a failing UI callback never breaks the bridge */
    }
  }

  private activity(activity: WorldBridgeActivity): void {
    try {
      this.options.onActivity?.(activity);
    } catch {
      /* ignored */
    }
  }

  private describe(err: unknown): { code: string; message: string } {
    const L = this.session.locale;
    if (err instanceof BridgeHttpError) {
      if (err.status === 401) return { code: err.code, message: rt(L, "bridge.unauthorized") };
      if (err.code === "not_found") return { code: "unsupported", message: rt(L, "bridge.unsupported") };
      if (REREGISTER.has(err.code)) return { code: err.code, message: err.message };
      return { code: err.code, message: rt(L, "bridge.refused", { message: err.message }) };
    }
    return { code: "network", message: rt(L, "bridge.network", { message: err instanceof Error ? err.message : String(err) }) };
  }

  /* ---------------------------- HTTP ----------------------------- */

  /** A JSON request; resolves to the parsed answer (its body always consumed), throws `BridgeHttpError` on a refusal. */
  private async http(method: string, path: string, opts: { body?: unknown; reg?: BridgeRegistered; keepalive?: boolean } = {}): Promise<unknown> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    const token = this.options.auth?.token;
    if (token) headers.authorization = `Bearer ${token}`;
    if (opts.reg) headers[CHANNEL_SECRET_HEADER] = opts.reg.secret;
    const res = await this.fetchImpl(`${this.base}${path}`, {
      method,
      headers,
      credentials: this.options.auth?.credentials ?? "same-origin",
      cache: "no-store",
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      ...(opts.keepalive ? { keepalive: true } : {}),
    });
    if (!res.ok) throw await httpError(res);
    try {
      return (await res.json()) as unknown;
    } catch {
      return null;
    }
  }

  private capabilities(): string[] {
    const own = new Set(this.session.toolsFor("clinician").map((tool) => tool.name));
    const only = this.options.tools ? new Set(this.options.tools) : null;
    return BRIDGE_TOOLS.filter((name) => own.has(name) && (!only || only.has(name)));
  }

  private async register(): Promise<void> {
    const s = this.session;
    const title = this.options.title === undefined ? t(s.caseDef.title, s.locale) : this.options.title;
    const body: BridgeRegistration = {
      caseHandle: caseHandle(s.caseDef.id),
      title: title ? cleanBridgeText(title, BRIDGE_LIMITS.title) || null : null,
      facilityId: s.facility?.id ?? null,
      embodiment: s.embodiment,
      locale: s.locale.toLowerCase().startsWith("zh") ? "zh-CN" : "en",
      capabilities: this.capabilities(),
    };
    const value = (await this.http("POST", WORLD_SESSIONS_PATH, { body })) as Partial<BridgeRegistered> | null;
    const ms = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 10 ? v : fallback);
    if (!value || !isLiveSessionId(value.id) || typeof value.secret !== "string" || value.secret.length < 16) throw new Error("malformed registration answer");
    if (this.disposed) {
      // Disposed while registering: undo it.
      await this.http("DELETE", `${WORLD_SESSIONS_PATH}/${encodeURIComponent(value.id)}`, { reg: value as BridgeRegistered }).catch(() => undefined);
      return;
    }
    this.reg = {
      id: value.id,
      secret: value.secret,
      heartbeatMs: ms(value.heartbeatMs, BRIDGE_DEFAULTS.heartbeatMs),
      expireAfterMs: ms(value.expireAfterMs, BRIDGE_DEFAULTS.expireAfterMs),
      pingMs: ms(value.pingMs, BRIDGE_DEFAULTS.pingMs),
    };
    this.startHeartbeats();
    this.report();
  }

  /** Read the command stream until it ends. */
  private async consume(reg: BridgeRegistered): Promise<void> {
    const controller = new AbortController();
    this.stream = controller;
    try {
      const res = await this.fetchImpl(`${this.base}${WORLD_SESSIONS_PATH}/${encodeURIComponent(reg.id)}/commands`, {
        method: "GET",
        headers: { accept: "text/event-stream", [CHANNEL_SECRET_HEADER]: reg.secret, ...(this.options.auth?.token ? { authorization: `Bearer ${this.options.auth.token}` } : {}) },
        credentials: this.options.auth?.credentials ?? "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw await httpError(res);
      if (!res.body) throw new Error("the command stream has no body");
      this.lastHeartbeat = Date.now(); // connecting counts as a heartbeat on the server
      this.backoffMs = this.initialBackoff;
      this.setState("connected");
      for await (const message of parseSSE(res.body, { signal: controller.signal, stopOnDone: false })) {
        if (this.disposed || this.reg !== reg) return;
        this.maybeHeartbeat();
        if (message.event === "command") {
          const command = parseBridgeCommand(safeJson(message.data));
          if (command) this.onCommand(command, reg);
        } else if (message.event === "closed") {
          const reason = (safeJson(message.data) as { reason?: unknown } | null)?.reason;
          if (reason === "unregistered" || reason === "expired") throw new BridgeHttpError(410, reason === "expired" ? "session_expired" : "session_closed", String(reason));
          return; // replaced or the server is closing: reconnect
        }
      }
    } finally {
      if (this.stream === controller) this.stream = null;
      controller.abort();
    }
  }

  /* ------------------------- heartbeats -------------------------- */

  private startHeartbeats(): void {
    this.stopHeartbeats();
    const reg = this.reg;
    if (!reg) return;
    this.lastHeartbeat = Date.now();
    this.heartbeatTimer = setInterval(() => void this.heartbeat(), reg.heartbeatMs);
    unref(this.heartbeatTimer);
  }

  private stopHeartbeats(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  /** A server ping woke a (possibly throttled) page: send the heartbeat if it is due. */
  private maybeHeartbeat(): void {
    if (this.reg && Date.now() - this.lastHeartbeat >= this.reg.heartbeatMs) void this.heartbeat();
  }

  private async heartbeat(): Promise<void> {
    const reg = this.reg;
    if (!reg || this.disposed || this.heartbeatInFlight) return;
    this.heartbeatInFlight = true;
    this.lastHeartbeat = Date.now();
    try {
      await this.http("POST", `${WORLD_SESSIONS_PATH}/${encodeURIComponent(reg.id)}/heartbeat`, { reg, body: { capabilities: this.capabilities() } });
    } catch (err) {
      if (this.disposed || this.reg !== reg) return;
      const verdict = verdictOf(err);
      if (verdict === "retry") return; // the stream loop notices a dead server by itself
      this.error = this.describe(err);
      if (verdict === "reregister") this.dropRegistration();
      else this.stream?.abort(); // fatal: the loop's reconnect meets the same refusal and stops
    } finally {
      this.heartbeatInFlight = false;
    }
  }

  /* -------------------------- commands --------------------------- */

  private onSessionEvent(event: AgentEvent): void {
    const msg = event.msg;
    if (msg.type === "shutdown_complete") {
      void this.shutdown({ code: "session_closed", message: rt(this.session.locale, "bridge.closed") });
      return;
    }
    if (msg.type === "tool_call_begin") {
      const running = this.running.get(msg.callId);
      if (!running || String(msg.agent) !== "clinician") return;
      this.submissions.add(event.id);
      while (this.submissions.size > SUBMISSIONS_KEPT) this.submissions.delete(this.submissions.values().next().value!);
      this.activity({ phase: "running", correlationId: running.correlationId, tool: running.tool, submissionId: event.id });
    }
  }

  private onCommand(command: BridgeCommand, reg: BridgeRegistered): void {
    const stored = this.done.get(command.correlationId);
    if (command.type === "cancel") {
      const running = this.running.get(command.correlationId);
      if (running) this.cancelRunning(running);
      // Unknown here: finished already (post it again), or the call never arrived (it did not run).
      else void this.postResult(reg, command.correlationId, stored ?? { ok: false, status: "cancelled", output: rt(this.session.locale, "bridge.notRun") });
      return;
    }
    if (stored) {
      void this.postResult(reg, command.correlationId, stored); // delivered again after a reconnect: never run twice
      return;
    }
    if (this.running.has(command.correlationId)) return;
    if (this.running.size >= MAX_RUNNING) {
      void this.postResult(reg, command.correlationId, { ok: false, status: "error", output: rt(this.session.locale, "bridge.busy", { max: MAX_RUNNING }) });
      return;
    }
    void this.execute(command, reg);
  }

  /** Why a call is refused without running (null: run it). */
  private refusal(tool: string): BridgeToolResult | null {
    const s = this.session;
    const L = s.locale;
    if (s.isClosed) return { ok: false, status: "cancelled", output: rt(L, "bridge.closed") };
    if (s.settings.approvalMode === "bypass" && !this.options.allowBypass) return { ok: false, status: "denied", output: rt(L, "bridge.bypass") };
    if (!this.capabilities().includes(tool)) return { ok: false, status: "denied", output: rt(L, "bridge.toolNotAllowed", { tool }) };
    return null;
  }

  private async execute(command: Extract<BridgeCommand, { type: "call" }>, reg: BridgeRegistered): Promise<void> {
    const { correlationId, tool, args } = command;
    // Registered synchronously, so a `cancel` that follows on the stream finds it.
    const running: Running = { correlationId, tool, cancelled: false, reg };
    this.running.set(correlationId, running);
    this.report();
    this.activity({ phase: "started", correlationId, tool, args });
    void this.http("POST", `${WORLD_SESSIONS_PATH}/${encodeURIComponent(reg.id)}/results`, { reg, body: { correlationId, kind: "ack" } }).catch(() => undefined);
    let result = this.refusal(tool);
    if (!result) {
      // The learner's answers to the call's approval requests carry the id of their own response.
      const related: AgentEvent[] = [];
      const off = this.session.subscribe((event) => {
        if (event.msg.type === "approval_resolved") related.push(event);
      });
      try {
        const events = await this.session.run({ type: "external_tool_call", callId: correlationId, tool, args });
        result = bridgeResultOf(events, correlationId, this.session.locale, { cancelRequested: running.cancelled, related });
      } catch (err) {
        result = { ok: false, status: "error", output: err instanceof Error ? err.message : String(err) };
      } finally {
        off();
      }
    }
    result = boundBridgeResult(result);
    this.running.delete(correlationId);
    this.done.set(correlationId, result);
    while (this.done.size > RESULTS_KEPT) this.done.delete(this.done.keys().next().value!);
    this.report();
    this.activity({ phase: "finished", correlationId, tool, result });
    await this.postResult(reg, correlationId, result);
  }

  private cancelRunning(running: Running): void {
    if (running.cancelled) return;
    running.cancelled = true;
    this.session.submit({ type: "external_tool_cancel", callId: running.correlationId });
  }

  /** Post a result to the registration the call came from (retried on network errors). */
  private async postResult(reg: BridgeRegistered, correlationId: string, result: BridgeToolResult): Promise<void> {
    for (let attempt = 0; attempt < RESULT_ATTEMPTS; attempt++) {
      if (this.reg !== reg) return; // that registration is gone: so is the caller's wait
      try {
        await this.http("POST", `${WORLD_SESSIONS_PATH}/${encodeURIComponent(reg.id)}/results`, { reg, body: { correlationId, kind: "result", result } });
        return;
      } catch (err) {
        if (verdictOf(err) !== "retry") return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
}
