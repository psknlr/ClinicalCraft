/**
 * World bridge routes of `clinicalcraft serve` (docs/EMBODIED.md §12,
 * docs/PROTOCOL.md §13): the `WorldSessionRouter` keeps the learners' live
 * browser sessions, their SSE command channels, the calls attach clients wait
 * on (correlation ids, timeouts, dedupe, cancellation) and their expiry.
 * Shapes, limits and validators: `@clinicalcraft/agent` `bridge/protocol.ts`.
 *
 * Security, on top of the server's own policy (`security.ts`, applied before
 * these routes — nothing there is widened):
 * - every route needs the server's auth: its token when one is configured; a
 *   token-less server is loopback-only and rejects non-loopback `Host`
 *   headers; same-origin / dev-origin CORS only. The channel header is not in
 *   the CORS allow-list, so only a same-origin page can open a channel;
 * - the browser's channel routes (commands, results, heartbeat, DELETE) also
 *   need the session's channel secret (`x-clinicalcraft-channel`): 32 random
 *   bytes returned once at registration, kept only as a SHA-256 digest and
 *   compared in constant time. Attach clients never see it: they can call and
 *   cancel, never post a result or unregister a session;
 * - a session exists only between the learner's opt-in (registration) and the
 *   learner's disconnect (`DELETE`) or missed heartbeats (expiry); calls to a
 *   missing or expired session are refused, and calls pending when a session
 *   goes away are answered at once;
 * - bounded: live sessions, pending calls per session, stored results, body
 *   sizes, timeouts;
 * - the server never runs a tool: the browser runs each call through its
 *   session's own tool path as the clinician — the approval gate included, so
 *   an approval prompt goes to the learner, never to the caller.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  BRIDGE_DEFAULTS,
  BRIDGE_LIMITS,
  CHANNEL_SECRET_HEADER,
  cleanBridgeText,
  isBridgeTool,
  isCaseHandle,
  isCorrelationId,
  isFacilityId,
  isLiveSessionId,
  parseBridgeResult,
  type BridgeClosedReason,
  type BridgeCommand,
  type BridgeRegistration,
  type BridgeToolResult,
  type LiveSessionInfo,
} from "@clinicalcraft/agent";
import { HttpError, MAX_BODY_BYTES, mediaType, readBody, sendJson } from "./http.js";
import { sm, type ServerMessageKey } from "./i18n.js";

/** Bodies of registration, heartbeat and cancel requests. */
const CONTROL_BODY_BYTES = 16 * 1024;
/** Ids of ended sessions remembered to answer "expired" / "closed" instead of "unknown". */
const TOMBSTONES = 256;
/** Requests waiting on one call (the first one and repeats of its correlation id). */
const MAX_WAITERS = 8;

export interface WorldSessionRouterOptions {
  /** Limit of call and result bodies (default: the server's, 2 MB). */
  maxBodyBytes?: number;
  /** Heartbeat interval announced to the browser (ms, default 10 s). */
  heartbeatMs?: number;
  /** A session with no channel request for this long is removed (ms, default 45 s). */
  expireAfterMs?: number;
  /** SSE `ping` interval on command streams (ms, default 10 s). */
  pingMs?: number;
  /** Default and largest wait of a call (ms; default 120 s, at most 10 min). */
  defaultCallTimeoutMs?: number;
  maxCallTimeoutMs?: number;
  /** How long a call waits for a browser with no command stream before `not_connected` (ms, default 10 s). */
  connectGraceMs?: number;
  /** How long a cancelled call waits for the browser's final result (ms, default 30 s). */
  cancelGraceMs?: number;
  /** Live sessions at once (default 16). */
  maxSessions?: number;
  /** Calls waiting per session (default 32). */
  maxPendingCalls?: number;
  /** Results kept to answer a repeated correlation id: how long and how many per session (default 10 min, 256). */
  resultTtlMs?: number;
  maxStoredResults?: number;
  /** Expiry sweep interval (ms, default 1 s). */
  sweepMs?: number;
  now?: () => number;
  log?: (message: string) => void;
}

/** An attach client waiting on `POST …/call`. */
interface Waiter {
  res: ServerResponse;
  L: string;
  /** Joined a call already pending under the same correlation id (dedupe). */
  joined: boolean;
  done: boolean;
}

interface PendingCall {
  correlationId: string;
  tool: string;
  args: Record<string, unknown>;
  /** Canonical JSON of tool + args: a repeated correlation id must name the same call. */
  fingerprint: string;
  timeoutMs: number;
  deadline: number;
  deliveredAt: number | null;
  ackedAt: number | null;
  cancelled: boolean;
  waiters: Set<Waiter>;
  timers: ReturnType<typeof setTimeout>[];
}

interface StoredResult {
  fingerprint: string;
  result: BridgeToolResult;
  at: number;
}

interface LiveSession {
  id: string;
  secretDigest: Buffer;
  info: Omit<LiveSessionInfo, "id" | "createdAt" | "lastSeenAt" | "connected" | "pendingCalls">;
  createdAt: number;
  lastSeen: number;
  stream: ServerResponse | null;
  ping: ReturnType<typeof setInterval> | null;
  calls: Map<string, PendingCall>;
  results: Map<string, StoredResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Canonical JSON (sorted keys). */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function digest(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function unref<T>(timer: T): T {
  (timer as { unref?: () => void }).unref?.();
  return timer;
}

/** The body as a JSON object (415 / 413 / 400 otherwise); an empty body is `{}` when `optional`. */
async function readJsonObject(req: IncomingMessage, limit: number, L: string, optional = false): Promise<Record<string, unknown>> {
  const declared = Number(req.headers["content-length"] ?? "0");
  const chunked = req.headers["transfer-encoding"] !== undefined;
  if (optional && !chunked && !(declared > 0)) {
    req.resume();
    return {};
  }
  if (mediaType(req) !== "application/json") throw new HttpError(415, "unsupported_media_type", sm(L, "error.unsupportedMedia", { type: "application/json" }));
  const body = await readBody(req, limit, () => new HttpError(413, "body_too_large", sm(L, "error.bodyTooLarge", { limit })));
  if (optional && body.length === 0) return {};
  let value: unknown;
  try {
    value = JSON.parse(body.toString("utf8"));
  } catch (err) {
    throw new HttpError(400, "bad_json", sm(L, "error.badJson", { message: (err as Error).message }));
  }
  if (!isRecord(value)) throw new HttpError(400, "bad_request", sm(L, "error.badRequest", { message: "the body must be a JSON object" }));
  return value;
}

/** Validate a registration body: a message naming the problem, or the registration (title cleaned). */
export function parseRegistration(body: Record<string, unknown>): { ok: true; value: BridgeRegistration } | { ok: false; message: string } {
  if (!isCaseHandle(body.caseHandle)) return { ok: false, message: "caseHandle must be an opaque case handle" };
  if (body.title !== undefined && body.title !== null && typeof body.title !== "string") return { ok: false, message: "title must be a string" };
  if (body.facilityId !== null && body.facilityId !== undefined && !isFacilityId(body.facilityId)) return { ok: false, message: "facilityId must be a facility id or null" };
  if (body.embodiment !== "clinical" && body.embodiment !== "embodied") return { ok: false, message: 'embodiment must be "clinical" or "embodied"' };
  if (body.locale !== "zh-CN" && body.locale !== "en") return { ok: false, message: 'locale must be "zh-CN" or "en"' };
  const caps = parseCapabilities(body.capabilities);
  if (!caps.ok) return caps;
  const title = typeof body.title === "string" ? cleanBridgeText(body.title, BRIDGE_LIMITS.title) || null : null;
  return { ok: true, value: { caseHandle: body.caseHandle, title, facilityId: (body.facilityId as string | null | undefined) ?? null, embodiment: body.embodiment, locale: body.locale, capabilities: caps.value } };
}

function parseCapabilities(value: unknown): { ok: true; value: string[] } | { ok: false; message: string } {
  if (!Array.isArray(value) || value.length > BRIDGE_LIMITS.capabilities) return { ok: false, message: `capabilities must be an array of at most ${BRIDGE_LIMITS.capabilities} tool names` };
  const unknown = value.filter((name) => !isBridgeTool(name));
  if (unknown.length) return { ok: false, message: `not bridge tools: ${unknown.map((n) => String(n).slice(0, 40)).join(", ")}` };
  return { ok: true, value: [...new Set(value as string[])] };
}

/**
 * Live sessions of the world bridge and their HTTP routes. `handle` serves
 * `/api/world/sessions[/:id[/commands|results|heartbeat|call|cancel]]` after
 * the server checked auth, origin and host.
 */
export class WorldSessionRouter {
  private readonly sessions = new Map<string, LiveSession>();
  private readonly tombstones = new Map<string, "expired" | "closed">();
  private readonly o: Required<Omit<WorldSessionRouterOptions, "log" | "now">>;
  private readonly now: () => number;
  private readonly log: (message: string) => void;
  private sweeper: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  constructor(options: WorldSessionRouterOptions = {}) {
    const maxTimeout = Math.max(BRIDGE_DEFAULTS.minCallTimeoutMs, options.maxCallTimeoutMs ?? BRIDGE_DEFAULTS.maxCallTimeoutMs);
    this.o = {
      maxBodyBytes: options.maxBodyBytes ?? MAX_BODY_BYTES,
      heartbeatMs: options.heartbeatMs ?? BRIDGE_DEFAULTS.heartbeatMs,
      expireAfterMs: options.expireAfterMs ?? BRIDGE_DEFAULTS.expireAfterMs,
      pingMs: options.pingMs ?? BRIDGE_DEFAULTS.pingMs,
      defaultCallTimeoutMs: Math.min(options.defaultCallTimeoutMs ?? BRIDGE_DEFAULTS.callTimeoutMs, maxTimeout),
      maxCallTimeoutMs: maxTimeout,
      connectGraceMs: options.connectGraceMs ?? 10_000,
      cancelGraceMs: options.cancelGraceMs ?? 30_000,
      maxSessions: Math.max(1, options.maxSessions ?? 16),
      maxPendingCalls: Math.max(1, options.maxPendingCalls ?? 32),
      resultTtlMs: options.resultTtlMs ?? 10 * 60_000,
      maxStoredResults: Math.max(1, options.maxStoredResults ?? 256),
      sweepMs: options.sweepMs ?? 1_000,
    };
    this.now = options.now ?? Date.now;
    this.log = options.log ?? (() => undefined);
  }

  /** The live sessions as attach clients see them (connected first, then the most recent). */
  list(): LiveSessionInfo[] {
    this.sweep();
    return [...this.sessions.values()].sort((a, b) => Number(b.stream !== null) - Number(a.stream !== null) || b.createdAt - a.createdAt).map((s) => this.infoOf(s));
  }

  /** End every stream and answer every waiting call (server shutdown). */
  close(): void {
    this.closed = true;
    if (this.sweeper) clearInterval(this.sweeper);
    this.sweeper = null;
    for (const s of [...this.sessions.values()]) this.remove(s, "server_closing");
  }

  /**
   * Serve a bridge route. `parts`: the path segments after `/api/world/sessions`
   * (decoded); `L`: the response language.
   */
  async handle(req: IncomingMessage, res: ServerResponse, method: string, parts: readonly string[], L: string): Promise<void> {
    const notAllowed = (allow: string) => this.fail(res, 405, "method_not_allowed", L, "error.methodNotAllowed", { method }, { allow });
    if (this.closed) return this.fail(res, 503, "server_closing", L, "error.world.serverClosing");
    const [id, action, ...extra] = parts;
    if (extra.length > 0) return this.fail(res, 404, "not_found", L, "error.notFound");
    if (id === undefined) {
      if (method === "POST") return this.register(req, res, L);
      if (method === "GET" || method === "HEAD") return void sendJson(res, 200, { sessions: this.list() });
      return notAllowed("GET, HEAD, POST");
    }
    const session = this.lookup(res, id, L);
    if (!session) return;
    switch (action) {
      case undefined:
        if (method === "GET" || method === "HEAD") return void sendJson(res, 200, this.infoOf(session));
        if (method === "DELETE") {
          if (!this.channel(req, res, session, L)) return;
          this.remove(session, "unregistered");
          return void sendJson(res, 200, { ok: true });
        }
        return notAllowed("GET, HEAD, DELETE");
      case "commands":
        if (method !== "GET") return notAllowed("GET");
        if (!this.channel(req, res, session, L)) return;
        return this.openStream(res, session);
      case "results":
        if (method !== "POST") return notAllowed("POST");
        if (!this.channel(req, res, session, L)) return;
        return this.results(req, res, session, L);
      case "heartbeat": {
        if (method !== "POST") return notAllowed("POST");
        if (!this.channel(req, res, session, L)) return;
        const body = await readJsonObject(req, CONTROL_BODY_BYTES, L, true);
        if (body.capabilities !== undefined) {
          const caps = parseCapabilities(body.capabilities);
          if (!caps.ok) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: caps.message });
          session.info.capabilities = caps.value;
        }
        return void sendJson(res, 200, { ok: true, heartbeatMs: this.o.heartbeatMs, expireAfterMs: this.o.expireAfterMs });
      }
      case "call":
        if (method !== "POST") return notAllowed("POST");
        return this.call(req, res, session, L);
      case "cancel": {
        if (method !== "POST") return notAllowed("POST");
        const body = await readJsonObject(req, CONTROL_BODY_BYTES, L);
        if (!isCorrelationId(body.correlationId)) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "correlationId is missing or malformed" });
        const call = session.calls.get(body.correlationId);
        const cancelled = !!call && !call.cancelled;
        if (call) this.cancel(session, call);
        return void sendJson(res, 200, { ok: true, cancelled });
      }
      default:
        return this.fail(res, 404, "not_found", L, "error.notFound");
    }
  }

  /* ------------------------------------------------------------------ */

  private fail(res: ServerResponse, status: number, code: string, L: string, key: ServerMessageKey, params: Record<string, string | number> = {}, headers: Record<string, string> = {}, extra: Record<string, unknown> = {}): void {
    sendJson(res, status, { error: { code, message: sm(L, key, params), ...extra } }, headers);
  }

  private infoOf(s: LiveSession): LiveSessionInfo {
    return {
      id: s.id,
      ...s.info,
      capabilities: [...s.info.capabilities],
      createdAt: new Date(s.createdAt).toISOString(),
      lastSeenAt: new Date(s.lastSeen).toISOString(),
      connected: s.stream !== null,
      pendingCalls: [...s.calls.values()].filter((c) => !c.cancelled).length,
    };
  }

  /** The session `id` names, or null after answering 404 (unknown) / 410 (expired, closed). */
  private lookup(res: ServerResponse, id: string, L: string): LiveSession | null {
    const s = isLiveSessionId(id) ? this.sessions.get(id) : undefined;
    if (s && this.now() - s.lastSeen > this.o.expireAfterMs) this.remove(s, "expired");
    else if (s) return s;
    const ended = isLiveSessionId(id) ? this.tombstones.get(id) : undefined;
    const shown = isLiveSessionId(id) ? id : "?";
    if (ended === "expired") this.fail(res, 410, "session_expired", L, "error.world.expired", { id: shown });
    else if (ended === "closed") this.fail(res, 410, "session_closed", L, "error.world.closed", { id: shown });
    else this.fail(res, 404, "unknown_session", L, "error.world.unknownSession", { id: shown });
    return null;
  }

  /** The browser's channel secret (403 otherwise); a valid request counts as a heartbeat. */
  private channel(req: IncomingMessage, res: ServerResponse, s: LiveSession, L: string): boolean {
    const given = req.headers[CHANNEL_SECRET_HEADER];
    if (typeof given !== "string" || given.length === 0 || given.length > 256 || !timingSafeEqual(digest(given), s.secretDigest)) {
      this.fail(res, 403, "forbidden_channel", L, "error.world.forbiddenChannel");
      return false;
    }
    s.lastSeen = Math.max(s.lastSeen, this.now());
    return true;
  }

  /* ------------------------- registration ------------------------- */

  private async register(req: IncomingMessage, res: ServerResponse, L: string): Promise<void> {
    const body = await readJsonObject(req, CONTROL_BODY_BYTES, L);
    const parsed = parseRegistration(body);
    if (!parsed.ok) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: parsed.message });
    this.sweep();
    if (this.sessions.size >= this.o.maxSessions) {
      // Make room by dropping the session least recently heard from whose browser is not connected.
      const idle = [...this.sessions.values()].filter((s) => s.stream === null).sort((a, b) => a.lastSeen - b.lastSeen)[0];
      if (!idle) return this.fail(res, 429, "too_many_sessions", L, "error.world.tooManySessions", { max: this.o.maxSessions });
      this.remove(idle, "expired");
    }
    const id = `ls_${randomBytes(12).toString("base64url")}`;
    const secret = randomBytes(32).toString("base64url");
    const now = this.now();
    const { title, ...rest } = parsed.value;
    this.sessions.set(id, { id, secretDigest: digest(secret), info: { ...rest, title: title ?? null }, createdAt: now, lastSeen: now, stream: null, ping: null, calls: new Map(), results: new Map() });
    this.tombstones.delete(id);
    this.ensureSweeper();
    this.log(`live session ${id} registered (${parsed.value.embodiment}, ${parsed.value.capabilities.length} tools)`);
    sendJson(res, 201, { id, secret, heartbeatMs: this.o.heartbeatMs, expireAfterMs: this.o.expireAfterMs, pingMs: this.o.pingMs });
  }

  /** Remove a session: answer its waiting calls, end its stream, remember why. */
  private remove(s: LiveSession, reason: Exclude<BridgeClosedReason, "replaced">): void {
    if (this.sessions.get(s.id) !== s) return;
    this.sessions.delete(s.id);
    if (reason !== "server_closing") {
      this.tombstones.set(s.id, reason === "expired" ? "expired" : "closed");
      while (this.tombstones.size > TOMBSTONES) this.tombstones.delete(this.tombstones.keys().next().value!);
    }
    for (const call of s.calls.values()) {
      for (const t of call.timers) clearTimeout(t);
      for (const w of call.waiters) {
        if (reason === "server_closing") this.answerError(w, 503, "server_closing", "error.world.serverClosing", {});
        else if (reason === "expired") this.answerError(w, 410, "session_expired", "error.world.expired", { id: s.id });
        else this.answerError(w, 410, "session_closed", "error.world.closed", { id: s.id });
      }
      call.waiters.clear();
    }
    s.calls.clear();
    s.results.clear();
    this.endStream(s, reason);
    if (this.sessions.size === 0 && this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
    this.log(`live session ${s.id} ${reason === "unregistered" ? "unregistered" : reason}`);
  }

  private ensureSweeper(): void {
    if (this.sweeper || this.closed) return;
    this.sweeper = unref(setInterval(() => this.sweep(), this.o.sweepMs));
  }

  /** Expire sessions that missed their heartbeats; forget old results. */
  private sweep(): void {
    const now = this.now();
    for (const s of [...this.sessions.values()]) {
      if (now - s.lastSeen > this.o.expireAfterMs) {
        this.remove(s, "expired");
        continue;
      }
      for (const [cid, stored] of s.results) if (now - stored.at > this.o.resultTtlMs) s.results.delete(cid);
    }
  }

  /* --------------------------- command stream --------------------------- */

  private write(res: ServerResponse, event: string, data: unknown): void {
    if (res.writableEnded || res.destroyed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  private command(call: PendingCall): BridgeCommand {
    return { type: "call", correlationId: call.correlationId, tool: call.tool, args: call.args, deadline: call.deadline };
  }

  private endStream(s: LiveSession, reason: BridgeClosedReason): void {
    const res = s.stream;
    if (s.ping) clearInterval(s.ping);
    s.stream = null;
    s.ping = null;
    if (!res) return;
    this.write(res, "closed", { reason });
    if (!res.writableEnded) res.end();
  }

  private openStream(res: ServerResponse, s: LiveSession): void {
    if (s.stream) this.endStream(s, "replaced");
    res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" });
    res.flushHeaders();
    s.stream = res;
    s.ping = unref(setInterval(() => this.write(res, "ping", {}), this.o.pingMs));
    res.on("close", () => {
      if (s.stream !== res) return;
      if (s.ping) clearInterval(s.ping);
      s.stream = null;
      s.ping = null;
      // The grace before expiry starts when the browser goes away.
      s.lastSeen = Math.max(s.lastSeen, this.now());
    });
    this.write(res, "hello", { id: s.id, heartbeatMs: this.o.heartbeatMs, expireAfterMs: this.o.expireAfterMs, pingMs: this.o.pingMs });
    // (Re)deliver what is pending: a re-delivered call never runs twice (the browser keeps its results),
    // and a cancelled call the browser may have seen gets its cancel again.
    const now = this.now();
    for (const call of s.calls.values()) {
      if (call.cancelled) this.write(res, "command", { type: "cancel", correlationId: call.correlationId } satisfies BridgeCommand);
      else {
        this.write(res, "command", this.command(call));
        call.deliveredAt ??= now;
      }
    }
  }

  /* ------------------------------- calls ------------------------------- */

  private async call(req: IncomingMessage, res: ServerResponse, s: LiveSession, L: string): Promise<void> {
    const body = await readJsonObject(req, this.o.maxBodyBytes, L);
    const { correlationId, tool } = body;
    if (!isCorrelationId(correlationId)) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "correlationId is missing or malformed" });
    if (!isBridgeTool(tool)) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "tool is not a bridge tool" });
    const args = body.args === undefined ? {} : body.args;
    if (!isRecord(args)) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "args must be a JSON object" });
    const rawTimeout = body.timeoutMs === undefined ? this.o.defaultCallTimeoutMs : body.timeoutMs;
    if (typeof rawTimeout !== "number" || !Number.isInteger(rawTimeout) || rawTimeout < BRIDGE_DEFAULTS.minCallTimeoutMs || rawTimeout > this.o.maxCallTimeoutMs) {
      return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: `timeoutMs must be an integer from ${BRIDGE_DEFAULTS.minCallTimeoutMs} to ${this.o.maxCallTimeoutMs}` });
    }
    if (!s.info.capabilities.includes(tool)) {
      return this.fail(res, 400, "tool_not_available", L, "error.world.toolNotAvailable", { id: s.id, tool, tools: s.info.capabilities.join(", ") || "-" });
    }
    const fingerprint = canonicalJson({ tool, args });
    const stored = s.results.get(correlationId);
    if (stored) {
      if (stored.fingerprint !== fingerprint) return this.fail(res, 409, "correlation_conflict", L, "error.world.conflict", { correlationId });
      return void sendJson(res, 200, { correlationId, result: stored.result, deduplicated: true });
    }
    const pending = s.calls.get(correlationId);
    if (pending) {
      if (pending.fingerprint !== fingerprint) return this.fail(res, 409, "correlation_conflict", L, "error.world.conflict", { correlationId });
      if (pending.waiters.size >= MAX_WAITERS) return this.fail(res, 429, "too_many_calls", L, "error.world.tooManyCalls", { id: s.id, max: this.o.maxPendingCalls });
      return this.wait(s, pending, res, L, true);
    }
    if (s.calls.size >= this.o.maxPendingCalls) return this.fail(res, 429, "too_many_calls", L, "error.world.tooManyCalls", { id: s.id, max: this.o.maxPendingCalls });
    const now = this.now();
    const call: PendingCall = { correlationId, tool, args, fingerprint, timeoutMs: rawTimeout, deadline: now + rawTimeout, deliveredAt: null, ackedAt: null, cancelled: false, waiters: new Set(), timers: [] };
    s.calls.set(correlationId, call);
    call.timers.push(unref(setTimeout(() => this.timeout(s, call), rawTimeout)));
    if (s.stream) {
      this.write(s.stream, "command", this.command(call));
      call.deliveredAt = now;
    } else if (this.o.connectGraceMs < rawTimeout) {
      call.timers.push(unref(setTimeout(() => this.notConnected(s, call), this.o.connectGraceMs)));
    }
    this.wait(s, call, res, L, false);
  }

  /** Hold `res` until the call ends; a caller that goes away while nobody else waits cancels the call. */
  private wait(s: LiveSession, call: PendingCall, res: ServerResponse, L: string, joined: boolean): void {
    const waiter: Waiter = { res, L, joined, done: false };
    call.waiters.add(waiter);
    res.on("close", () => {
      if (waiter.done) return;
      waiter.done = true;
      call.waiters.delete(waiter);
      if (call.waiters.size === 0 && s.calls.get(call.correlationId) === call && !call.cancelled) this.cancel(s, call);
    });
  }

  private answer(w: Waiter, status: number, body: unknown): void {
    if (w.done) return;
    w.done = true;
    sendJson(w.res, status, body);
  }

  private answerError(w: Waiter, status: number, code: string, key: ServerMessageKey, params: Record<string, string | number>, extra: Record<string, unknown> = {}): void {
    this.answer(w, status, { error: { code, message: sm(w.L, key, params), ...extra } });
  }

  /** The browser's result: answer every waiter, keep it for repeated correlation ids. */
  private complete(s: LiveSession, call: PendingCall, result: BridgeToolResult): void {
    s.calls.delete(call.correlationId);
    for (const t of call.timers) clearTimeout(t);
    s.results.set(call.correlationId, { fingerprint: call.fingerprint, result, at: this.now() });
    while (s.results.size > this.o.maxStoredResults) s.results.delete(s.results.keys().next().value!);
    for (const w of call.waiters) this.answer(w, 200, { correlationId: call.correlationId, result, deduplicated: w.joined });
    call.waiters.clear();
  }

  /** Stop a call: never delivered → it simply did not run; delivered → a `cancel` command, then wait for the final result. */
  private cancel(s: LiveSession, call: PendingCall): void {
    if (call.cancelled) return;
    call.cancelled = true;
    for (const t of call.timers) clearTimeout(t);
    call.timers = [];
    if (call.deliveredAt === null) {
      s.calls.delete(call.correlationId);
      for (const w of call.waiters) this.answerError(w, 409, "call_cancelled", "error.world.cancelled", { tool: call.tool });
      call.waiters.clear();
      return;
    }
    if (s.stream) this.write(s.stream, "command", { type: "cancel", correlationId: call.correlationId } satisfies BridgeCommand);
    call.timers.push(
      unref(
        setTimeout(() => {
          if (s.calls.get(call.correlationId) !== call) return;
          s.calls.delete(call.correlationId);
          for (const w of call.waiters) this.answerError(w, 409, "call_cancelled", "error.world.cancelled", { tool: call.tool });
          call.waiters.clear();
        }, this.o.cancelGraceMs),
      ),
    );
  }

  private timeout(s: LiveSession, call: PendingCall): void {
    if (s.calls.get(call.correlationId) !== call || call.cancelled) return;
    const acknowledged = call.ackedAt !== null;
    const seconds = Math.round(call.timeoutMs / 100) / 10;
    for (const w of call.waiters) this.answerError(w, 504, "call_timeout", acknowledged ? "error.world.timeout" : "error.world.timeoutUnacked", { tool: call.tool, seconds }, { acknowledged });
    call.waiters.clear();
    this.cancel(s, call);
  }

  private notConnected(s: LiveSession, call: PendingCall): void {
    if (s.calls.get(call.correlationId) !== call || call.deliveredAt !== null || call.cancelled) return;
    s.calls.delete(call.correlationId);
    for (const t of call.timers) clearTimeout(t);
    const seconds = Math.round(this.o.connectGraceMs / 100) / 10;
    for (const w of call.waiters) this.answerError(w, 503, "not_connected", "error.world.notConnected", { id: s.id, seconds });
    call.waiters.clear();
  }

  private async results(req: IncomingMessage, res: ServerResponse, s: LiveSession, L: string): Promise<void> {
    const body = await readJsonObject(req, this.o.maxBodyBytes, L);
    if (!isCorrelationId(body.correlationId)) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "correlationId is missing or malformed" });
    const call = s.calls.get(body.correlationId);
    if (body.kind === "ack") {
      if (call && call.ackedAt === null) call.ackedAt = this.now();
      return void sendJson(res, 200, { ok: true });
    }
    if (body.kind !== "result") return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: 'kind must be "ack" or "result"' });
    const result = parseBridgeResult(body.result);
    if (!result) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "result is malformed or exceeds the bridge limits" });
    // A late or repeated result (the call ended, or was answered already) is accepted and dropped.
    if (!call) return void sendJson(res, 200, { ok: true, accepted: false });
    this.complete(s, call, result);
    sendJson(res, 200, { ok: true, accepted: true });
  }
}
