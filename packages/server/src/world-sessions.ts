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
 *   headers. Same-origin only: these routes get no dev-origin CORS exception
 *   (`server.ts`), and the channel and attach-key headers are not in any
 *   CORS allow-list;
 * - the browser's routes (registration; the channel routes commands,
 *   results, heartbeat, DELETE — the latter also need the session's channel
 *   secret in `x-clinicalcraft-channel`: 32 random bytes returned once,
 *   kept only as a SHA-256 digest, compared in constant time) take the page's
 *   `cc_token` cookie;
 * - the attach routes (list, read, call, cancel) take the server token ONLY as
 *   `Authorization: Bearer` (never the ambient cookie) and need the session's
 *   ATTACH KEY in `x-clinicalcraft-attach-key`: the browser makes it when the
 *   learner opts in and shows it to the learner, the server keeps its digest.
 *   The list shows only the sessions of the presented key, so a holder of the
 *   server token alone can neither see, nor drive, nor impersonate another
 *   learner's session (review S5). Attach clients never see the channel
 *   secret: they cannot post a result or unregister a session;
 * - a session exists only between the learner's opt-in (registration) and the
 *   learner's disconnect (`DELETE`) or missed heartbeats (expiry); calls to a
 *   missing or expired session are refused, and calls pending when a session
 *   goes away are answered at once;
 * - bounded (review S9): live sessions (in all and per client address),
 *   pending calls per session, stored results, body sizes, a call's arguments
 *   (64 KiB), timeouts; command streams honour backpressure — call commands
 *   go out within a window of unacknowledged bytes, a stream holding too much
 *   unsent data or not draining in time is destroyed, a replaced stream is
 *   destroyed, and stream (re)opens are rate-limited per session;
 * - a cancel the browser may have missed (its stream was down) is re-sent on
 *   every new stream until the browser answers it (review S11);
 * - the server never runs a tool: the browser runs each call through its
 *   session's own tool path as the clinician — the approval gate included, so
 *   an approval prompt goes to the learner, never to the caller.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ATTACH_KEY_HEADER,
  BRIDGE_DEFAULTS,
  BRIDGE_LIMITS,
  bridgeArgsBytes,
  CHANNEL_SECRET_HEADER,
  cleanBridgeText,
  isAttachKey,
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

/** Bodies of registration, heartbeat and cancel requests (and a call's fields besides its arguments). */
const CONTROL_BODY_BYTES = 16 * 1024;
/** Ids of ended sessions remembered to answer "expired" / "closed" instead of "unknown" (and to give an id back to its key). */
const TOMBSTONES = 256;
/** Requests waiting on one call (the first one and repeats of its correlation id). */
const MAX_WAITERS = 8;
/** Cancels per session the router keeps re-sending until the browser answers them. */
const MAX_CANCELS = 256;
/** How long an ended stream may take to flush its last event before its socket is destroyed (ms). */
const CLOSE_GRACE_MS = 1_000;
/** Ids this server issues (`ls_` + 12 random bytes as base64url): the only ids a re-registration may ask back. */
const SERVER_SESSION_ID = /^ls_[A-Za-z0-9_-]{16}$/;

export interface WorldSessionRouterOptions {
  /** Limit of result bodies (default: the server's, 2 MB); call bodies are bounded by `maxArgsBytes`. */
  maxBodyBytes?: number;
  /** Bytes of a call's arguments as JSON (default `BRIDGE_LIMITS.argsBytes`, 64 KiB). */
  maxArgsBytes?: number;
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
  /** Live sessions one client address may hold (default 4): its own least recently seen session without a stream makes room, else 429. */
  maxSessionsPerClient?: number;
  /** Calls waiting per session (default 32). */
  maxPendingCalls?: number;
  /** Results kept to answer a repeated correlation id: how long and how many per session (default 10 min, 256). */
  resultTtlMs?: number;
  maxStoredResults?: number;
  /** Call commands written to a stream and not yet acknowledged, in bytes (default 1 MiB): later calls wait for acks. */
  streamWindowBytes?: number;
  /** Bytes a stream may hold unsent — its client does not read — before it is destroyed (default 1 MiB). */
  streamBufferBytes?: number;
  /** How long a congested stream (a write that has not drained) may stay so before it is destroyed (ms, default 15 s). */
  streamStallMs?: number;
  /** Command-stream (re)opens per session: a burst, then one per `streamRefillMs` (default 6, 2 s). */
  streamBurst?: number;
  streamRefillMs?: number;
  /** Expiry sweep interval (ms, default 1 s). */
  sweepMs?: number;
  now?: () => number;
  log?: (message: string) => void;
}

/** How a request authenticated to the server (`checkToken`), for the routes that care where the token came from. */
export interface WorldRequestAuth {
  /** The server has an access token (without one it is loopback-only and nothing was checked). */
  token: boolean;
  /** Where the request's valid token came from. */
  via: "header" | "query" | "cookie" | null;
}

/** Counters for monitoring and tests. */
export interface WorldSessionStats {
  sessions: number;
  /** Command-stream responses still open (replaced ones are destroyed at once). */
  openStreams: number;
  pendingCalls: number;
  /** Bytes of call commands written to current streams and not yet acknowledged. */
  inflightBytes: number;
  /** Bytes the current streams hold unsent. */
  bufferedBytes: number;
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
  /** Bytes of its `call` command on the wire. */
  bytes: number;
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

/** A browser's command stream. */
interface Stream {
  res: ServerResponse;
  ping: ReturnType<typeof setInterval>;
  /** Calls written on this stream → their bytes still counted in `inflight` (0 once acknowledged or answered). */
  sent: Map<string, number>;
  inflight: number;
  /** A write waits to drain: the stream is destroyed when it does not drain in time. */
  stall: ReturnType<typeof setTimeout> | null;
}

interface LiveSession {
  id: string;
  secretDigest: Buffer;
  keyDigest: Buffer;
  /** The registering client's address (per-client cap). */
  client: string;
  info: Omit<LiveSessionInfo, "id" | "createdAt" | "lastSeenAt" | "connected" | "pendingCalls">;
  createdAt: number;
  lastSeen: number;
  stream: Stream | null;
  calls: Map<string, PendingCall>;
  results: Map<string, StoredResult>;
  /** Cancels of delivered calls the browser has not answered yet (correlation id → when): re-sent on every new stream. */
  cancels: Map<string, number>;
  /** Stream-open rate limit (token bucket). */
  opens: { tokens: number; at: number };
}

interface Tombstone {
  reason: "expired" | "closed";
  keyDigest: Buffer;
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

/** The client address of a request (IPv4-mapped IPv6 as plain IPv4). */
function clientOf(req: IncomingMessage): string {
  const address = req.socket?.remoteAddress ?? "unknown";
  return address.startsWith("::ffff:") ? address.slice(7) : address;
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
  if (!isAttachKey(body.attachKey)) return { ok: false, message: "attachKey must be an attach key (ak_ + 32–96 base64url characters)" };
  if (body.previousId !== undefined && body.previousId !== null && typeof body.previousId !== "string") return { ok: false, message: "previousId must be a live-session id or null" };
  const caps = parseCapabilities(body.capabilities);
  if (!caps.ok) return caps;
  const title = typeof body.title === "string" ? cleanBridgeText(body.title, BRIDGE_LIMITS.title) || null : null;
  return {
    ok: true,
    value: {
      caseHandle: body.caseHandle,
      title,
      facilityId: (body.facilityId as string | null | undefined) ?? null,
      embodiment: body.embodiment,
      locale: body.locale,
      capabilities: caps.value,
      attachKey: body.attachKey,
      previousId: typeof body.previousId === "string" ? body.previousId : null,
    },
  };
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
  private readonly tombstones = new Map<string, Tombstone>();
  /** Every command-stream response still open (current or on its way out). */
  private readonly openStreams = new Set<ServerResponse>();
  private readonly o: Required<Omit<WorldSessionRouterOptions, "log" | "now">>;
  private readonly now: () => number;
  private readonly log: (message: string) => void;
  private sweeper: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  constructor(options: WorldSessionRouterOptions = {}) {
    const maxTimeout = Math.max(BRIDGE_DEFAULTS.minCallTimeoutMs, options.maxCallTimeoutMs ?? BRIDGE_DEFAULTS.maxCallTimeoutMs);
    this.o = {
      maxBodyBytes: options.maxBodyBytes ?? MAX_BODY_BYTES,
      maxArgsBytes: Math.max(1024, options.maxArgsBytes ?? BRIDGE_LIMITS.argsBytes),
      heartbeatMs: options.heartbeatMs ?? BRIDGE_DEFAULTS.heartbeatMs,
      expireAfterMs: options.expireAfterMs ?? BRIDGE_DEFAULTS.expireAfterMs,
      pingMs: options.pingMs ?? BRIDGE_DEFAULTS.pingMs,
      defaultCallTimeoutMs: Math.min(options.defaultCallTimeoutMs ?? BRIDGE_DEFAULTS.callTimeoutMs, maxTimeout),
      maxCallTimeoutMs: maxTimeout,
      connectGraceMs: options.connectGraceMs ?? 10_000,
      cancelGraceMs: options.cancelGraceMs ?? 30_000,
      maxSessions: Math.max(1, options.maxSessions ?? 16),
      maxSessionsPerClient: Math.max(1, options.maxSessionsPerClient ?? 4),
      maxPendingCalls: Math.max(1, options.maxPendingCalls ?? 32),
      resultTtlMs: options.resultTtlMs ?? 10 * 60_000,
      maxStoredResults: Math.max(1, options.maxStoredResults ?? 256),
      streamWindowBytes: Math.max(1024, options.streamWindowBytes ?? 1024 * 1024),
      streamBufferBytes: Math.max(64 * 1024, options.streamBufferBytes ?? 1024 * 1024),
      streamStallMs: Math.max(10, options.streamStallMs ?? 15_000),
      streamBurst: Math.max(1, options.streamBurst ?? 6),
      streamRefillMs: Math.max(1, options.streamRefillMs ?? 2_000),
      sweepMs: options.sweepMs ?? 1_000,
    };
    this.now = options.now ?? Date.now;
    this.log = options.log ?? (() => undefined);
  }

  /** Every live session (monitoring and embedding; attach clients see only their key's — the routes filter). Connected first, then the most recent. */
  list(): LiveSessionInfo[] {
    this.sweep();
    return this.sorted([...this.sessions.values()]);
  }

  /** Counters for monitoring and tests. */
  stats(): WorldSessionStats {
    let pendingCalls = 0;
    let inflightBytes = 0;
    let bufferedBytes = 0;
    for (const s of this.sessions.values()) {
      pendingCalls += s.calls.size;
      if (s.stream) {
        inflightBytes += s.stream.inflight;
        bufferedBytes += s.stream.res.writableLength;
      }
    }
    return { sessions: this.sessions.size, openStreams: this.openStreams.size, pendingCalls, inflightBytes, bufferedBytes };
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
   * (decoded); `L`: the response language; `auth`: where the request's server
   * token came from (the attach routes accept only the Authorization header).
   */
  async handle(req: IncomingMessage, res: ServerResponse, method: string, parts: readonly string[], L: string, auth: WorldRequestAuth = { token: false, via: null }): Promise<void> {
    const notAllowed = (allow: string) => this.fail(res, 405, "method_not_allowed", L, "error.methodNotAllowed", { method }, { allow });
    if (this.closed) return this.fail(res, 503, "server_closing", L, "error.world.serverClosing");
    const [id, action, ...extra] = parts;
    if (extra.length > 0) return this.fail(res, 404, "not_found", L, "error.notFound");
    const read = method === "GET" || method === "HEAD";
    if (id === undefined) {
      if (method === "POST") return this.register(req, res, L);
      if (!read) return notAllowed("GET, HEAD, POST");
      // attach: the sessions of the presented attach key (none without one)
      if (!this.attachAuth(res, auth, L)) return;
      const key = req.headers[ATTACH_KEY_HEADER];
      if (key !== undefined && !isAttachKey(key)) return this.fail(res, 403, "forbidden_attach_key", L, "error.world.forbiddenAttachKeyList");
      const keyDigest = typeof key === "string" ? digest(key) : null;
      this.sweep();
      const mine = keyDigest ? [...this.sessions.values()].filter((s) => timingSafeEqual(s.keyDigest, keyDigest)) : [];
      return void sendJson(res, 200, { sessions: this.sorted(mine) });
    }
    // Which side a route serves decides its credentials: the browser's channel, or an attach client.
    const attachRoute = (action === undefined && read) || action === "call" || action === "cancel";
    if (attachRoute && !this.attachAuth(res, auth, L)) return;
    const session = this.lookup(res, id, L);
    if (!session) return;
    switch (action) {
      case undefined:
        if (read) {
          if (!this.attachKey(req, res, session, L)) return;
          return void sendJson(res, 200, this.infoOf(session));
        }
        if (method === "DELETE") {
          if (!this.channel(req, res, session, L)) return;
          this.remove(session, "unregistered");
          return void sendJson(res, 200, { ok: true });
        }
        return notAllowed("GET, HEAD, DELETE");
      case "commands":
        if (method !== "GET") return notAllowed("GET");
        if (!this.channel(req, res, session, L)) return;
        return this.openStream(res, session, L);
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
        if (!this.attachKey(req, res, session, L)) return;
        return this.call(req, res, session, L);
      case "cancel": {
        if (method !== "POST") return notAllowed("POST");
        if (!this.attachKey(req, res, session, L)) return;
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

  private sorted(list: LiveSession[]): LiveSessionInfo[] {
    return list.sort((a, b) => Number(b.stream !== null) - Number(a.stream !== null) || b.createdAt - a.createdAt).map((s) => this.infoOf(s));
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
    const ended = isLiveSessionId(id) ? this.tombstones.get(id)?.reason : undefined;
    const shown = isLiveSessionId(id) ? id : "?";
    if (ended === "expired") this.fail(res, 410, "session_expired", L, "error.world.expired", { id: shown });
    else if (ended === "closed") this.fail(res, 410, "session_closed", L, "error.world.closed", { id: shown });
    else this.fail(res, 404, "unknown_session", L, "error.world.unknownSession", { id: shown });
    return null;
  }

  /** Attach routes: a server with a token takes it from the Authorization header only (no ambient cookie, no URL). */
  private attachAuth(res: ServerResponse, auth: WorldRequestAuth, L: string): boolean {
    if (!auth.token || auth.via === "header") return true;
    this.fail(res, 401, "unauthorized", L, "error.world.attachAuth", {}, { "www-authenticate": 'Bearer realm="clinicalcraft"' });
    return false;
  }

  /** Attach routes: the session's attach key (403 otherwise). */
  private attachKey(req: IncomingMessage, res: ServerResponse, s: LiveSession, L: string): boolean {
    const given = req.headers[ATTACH_KEY_HEADER];
    if (typeof given === "string" && isAttachKey(given) && timingSafeEqual(digest(given), s.keyDigest)) return true;
    this.fail(res, 403, "forbidden_attach_key", L, "error.world.forbiddenAttachKey", { id: s.id });
    return false;
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
    const client = clientOf(req);
    // The least recently heard-from session without a stream (a browser that went away) makes room.
    const idleOf = (list: LiveSession[]) => list.filter((s) => s.stream === null).sort((a, b) => a.lastSeen - b.lastSeen)[0];
    const own = [...this.sessions.values()].filter((s) => s.client === client);
    if (own.length >= this.o.maxSessionsPerClient) {
      const idle = idleOf(own);
      if (!idle) return this.fail(res, 429, "too_many_sessions", L, "error.world.tooManyClientSessions", { max: this.o.maxSessionsPerClient });
      this.remove(idle, "expired");
    }
    if (this.sessions.size >= this.o.maxSessions) {
      const idle = idleOf([...this.sessions.values()]);
      if (!idle) return this.fail(res, 429, "too_many_sessions", L, "error.world.tooManySessions", { max: this.o.maxSessions });
      this.remove(idle, "expired");
    }
    const { title, attachKey, previousId, ...rest } = parsed.value;
    const keyDigest = digest(attachKey);
    const id = this.reusableId(previousId, keyDigest) ?? `ls_${randomBytes(12).toString("base64url")}`;
    const secret = randomBytes(32).toString("base64url");
    const now = this.now();
    this.sessions.set(id, {
      id,
      secretDigest: digest(secret),
      keyDigest,
      client,
      info: { ...rest, title: title ?? null },
      createdAt: now,
      lastSeen: now,
      stream: null,
      calls: new Map(),
      results: new Map(),
      cancels: new Map(),
      opens: { tokens: this.o.streamBurst, at: now },
    });
    this.tombstones.delete(id);
    this.ensureSweeper();
    this.log(`live session ${id} registered (${parsed.value.embodiment}, ${parsed.value.capabilities.length} tools${id === previousId ? ", same id again" : ""})`);
    sendJson(res, 201, { id, secret, heartbeatMs: this.o.heartbeatMs, expireAfterMs: this.o.expireAfterMs, pingMs: this.o.pingMs });
  }

  /**
   * A re-registration may have its old id back (its learner's external agent keeps `--world-session`): an id this
   * server issues, not in use, and — when the server remembers it — registered with the same attach key.
   */
  private reusableId(previous: string | null | undefined, keyDigest: Buffer): string | null {
    if (typeof previous !== "string" || !SERVER_SESSION_ID.test(previous) || this.sessions.has(previous)) return null;
    const ended = this.tombstones.get(previous);
    if (ended && !timingSafeEqual(ended.keyDigest, keyDigest)) return null;
    return previous;
  }

  /** Remove a session: answer its waiting calls, end its stream, remember why. */
  private remove(s: LiveSession, reason: Exclude<BridgeClosedReason, "replaced">): void {
    if (this.sessions.get(s.id) !== s) return;
    this.sessions.delete(s.id);
    if (reason !== "server_closing") {
      this.tombstones.delete(s.id);
      this.tombstones.set(s.id, { reason: reason === "expired" ? "expired" : "closed", keyDigest: s.keyDigest });
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
    s.cancels.clear();
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

  /** Expire sessions that missed their heartbeats; forget old results and cancels. */
  private sweep(): void {
    const now = this.now();
    for (const s of [...this.sessions.values()]) {
      if (now - s.lastSeen > this.o.expireAfterMs) {
        this.remove(s, "expired");
        continue;
      }
      for (const [cid, stored] of s.results) if (now - stored.at > this.o.resultTtlMs) s.results.delete(cid);
      for (const [cid, at] of s.cancels) if (now - at > this.o.resultTtlMs) s.cancels.delete(cid);
      // calls that ended without an answer on this stream (timed out, cancelled) leave the window
      const st = s.stream;
      if (st) {
        let freed = false;
        for (const [cid, bytes] of st.sent) {
          if (s.calls.has(cid)) continue;
          st.sent.delete(cid);
          st.inflight = Math.max(0, st.inflight - bytes);
          freed ||= bytes > 0;
        }
        if (freed) this.deliver(s);
      }
    }
  }

  /* --------------------------- command stream --------------------------- */

  /**
   * Write an event to a stream, honouring backpressure: a stream holding more than `streamBufferBytes` unsent is
   * destroyed (its client does not read); a write that does not drain within `streamStallMs` destroys it too.
   * (Not on the first `false`: Node buffers a response's writes until the next tick, so a healthy reader also
   * sees one for a large command.) Returns false when the stream is gone.
   */
  private send(s: LiveSession, st: Stream, event: string, data: unknown): boolean {
    const res = st.res;
    if (res.writableEnded || res.destroyed) return false;
    const drained = res.write(sse(event, data));
    if (res.writableLength > this.o.streamBufferBytes) {
      this.dropStream(s, st, `holds ${res.writableLength} bytes its client does not read`);
      return false;
    }
    if (!drained && !st.stall) {
      st.stall = unref(setTimeout(() => this.dropStream(s, st, `did not drain for ${this.o.streamStallMs} ms`), this.o.streamStallMs));
      res.once("drain", () => {
        if (st.stall) clearTimeout(st.stall);
        st.stall = null;
      });
    }
    return true;
  }

  /** Destroy a stream that does not take what it is sent (the browser reconnects if it is alive). */
  private dropStream(s: LiveSession, st: Stream, why: string): void {
    clearInterval(st.ping);
    if (st.stall) clearTimeout(st.stall);
    st.stall = null;
    if (s.stream === st) {
      s.stream = null;
      s.lastSeen = Math.max(s.lastSeen, this.now());
    }
    if (!st.res.destroyed) {
      this.log(`live session ${s.id}: command stream dropped (${why})`);
      st.res.destroy();
    }
  }

  /**
   * Write pending calls to the session's stream in order, within the window of unacknowledged bytes (the first
   * one always goes): a browser that does not acknowledge gets nothing more until it does.
   */
  private deliver(s: LiveSession): void {
    const st = s.stream;
    if (!st) return;
    const now = this.now();
    for (const call of s.calls.values()) {
      if (call.cancelled || st.sent.has(call.correlationId)) continue;
      if (st.inflight > 0 && st.inflight + call.bytes > this.o.streamWindowBytes) return;
      if (!this.send(s, st, "command", this.command(call))) return;
      st.sent.set(call.correlationId, call.bytes);
      st.inflight += call.bytes;
      call.deliveredAt ??= now;
    }
  }

  /** The browser acknowledged or answered a call: its bytes leave the window, more calls may go. */
  private settle(s: LiveSession, correlationId: string): void {
    const st = s.stream;
    if (!st) return;
    const bytes = st.sent.get(correlationId);
    if (bytes === undefined) return;
    st.inflight = Math.max(0, st.inflight - bytes);
    // Still pending (acknowledged, not answered yet): remembered with nothing in flight, so it is not written again.
    if (s.calls.has(correlationId)) st.sent.set(correlationId, 0);
    else st.sent.delete(correlationId);
    if (bytes > 0) this.deliver(s);
  }

  private command(call: PendingCall): BridgeCommand {
    return { type: "call", correlationId: call.correlationId, tool: call.tool, args: call.args, deadline: call.deadline };
  }

  /** End the session's stream with a `closed` event; a socket that cannot flush it in time is destroyed. */
  private endStream(s: LiveSession, reason: BridgeClosedReason): void {
    const st = s.stream;
    if (!st) return;
    s.stream = null;
    clearInterval(st.ping);
    if (st.stall) clearTimeout(st.stall);
    st.stall = null;
    const res = st.res;
    if (res.writableEnded || res.destroyed) return;
    res.write(sse("closed", { reason }));
    res.end();
    const timer = unref(
      setTimeout(() => {
        if (!res.writableFinished) res.destroy();
      }, CLOSE_GRACE_MS),
    );
    res.once("finish", () => clearTimeout(timer));
  }

  /** Stream (re)opens per session: a token bucket. Null when allowed, else the seconds until the next one. */
  private openDenied(s: LiveSession): number | null {
    const now = this.now();
    const b = s.opens;
    b.tokens = Math.min(this.o.streamBurst, b.tokens + (now - b.at) / this.o.streamRefillMs);
    b.at = now;
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return null;
    }
    return Math.max(1, Math.ceil(((1 - b.tokens) * this.o.streamRefillMs) / 1000));
  }

  private openStream(res: ServerResponse, s: LiveSession, L: string): void {
    const wait = this.openDenied(s);
    if (wait !== null) return this.fail(res, 429, "too_many_streams", L, "error.world.tooManyStreams", { id: s.id, seconds: wait }, { "retry-after": String(wait) });
    // A replaced stream is destroyed at once: a client that stopped reading must not keep its buffer alive (S9).
    const old = s.stream;
    if (old) this.dropStream(s, old, "replaced");
    res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" });
    res.flushHeaders();
    this.openStreams.add(res);
    const st: Stream = { res, ping: unref(setInterval(() => this.send(s, st, "ping", {}), this.o.pingMs)), sent: new Map(), inflight: 0, stall: null };
    s.stream = st;
    res.on("close", () => {
      this.openStreams.delete(res);
      clearInterval(st.ping);
      if (st.stall) clearTimeout(st.stall);
      if (s.stream !== st) return;
      s.stream = null;
      // The grace before expiry starts when the browser goes away.
      s.lastSeen = Math.max(s.lastSeen, this.now());
    });
    if (!this.send(s, st, "hello", { id: s.id, heartbeatMs: this.o.heartbeatMs, expireAfterMs: this.o.expireAfterMs, pingMs: this.o.pingMs, now: this.now() })) return;
    // Cancels the browser may have missed — sent again on every stream until it answers them (S11) — then the
    // pending calls (a re-delivered call never runs twice: the browser keeps its results).
    for (const correlationId of s.cancels.keys()) if (!this.send(s, st, "command", { type: "cancel", correlationId } satisfies BridgeCommand)) return;
    this.deliver(s);
  }

  /* ------------------------------- calls ------------------------------- */

  private async call(req: IncomingMessage, res: ServerResponse, s: LiveSession, L: string): Promise<void> {
    // A call is small (ids and short texts): its body is bounded by the arguments limit, not the 2 MB result limit.
    const body = await readJsonObject(req, Math.min(this.o.maxBodyBytes, this.o.maxArgsBytes + CONTROL_BODY_BYTES), L);
    const { correlationId, tool } = body;
    if (!isCorrelationId(correlationId)) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "correlationId is missing or malformed" });
    if (!isBridgeTool(tool)) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "tool is not a bridge tool" });
    const args = body.args === undefined ? {} : body.args;
    if (!isRecord(args)) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "args must be a JSON object" });
    if (bridgeArgsBytes(args) > this.o.maxArgsBytes) return this.fail(res, 413, "args_too_large", L, "error.world.argsTooLarge", { limit: this.o.maxArgsBytes });
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
    const call: PendingCall = { correlationId, tool, args, fingerprint, bytes: 0, timeoutMs: rawTimeout, deadline: now + rawTimeout, deliveredAt: null, ackedAt: null, cancelled: false, waiters: new Set(), timers: [] };
    call.bytes = Buffer.byteLength(sse("command", this.command(call)));
    s.calls.set(correlationId, call);
    // A correlation id used again after its cancel was answered is a new call: no stale cancel follows it.
    s.cancels.delete(correlationId);
    call.timers.push(unref(setTimeout(() => this.timeout(s, call), rawTimeout)));
    this.deliver(s);
    if (call.deliveredAt === null && !s.stream && this.o.connectGraceMs < rawTimeout) {
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

  /**
   * Stop a call: never delivered → it simply did not run; delivered → a `cancel` command (re-sent on every new
   * stream until the browser answers it), then wait for the final result.
   */
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
    s.cancels.delete(call.correlationId);
    s.cancels.set(call.correlationId, this.now());
    while (s.cancels.size > MAX_CANCELS) s.cancels.delete(s.cancels.keys().next().value!);
    if (s.stream) this.send(s, s.stream, "command", { type: "cancel", correlationId: call.correlationId } satisfies BridgeCommand);
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
      this.settle(s, body.correlationId);
      return void sendJson(res, 200, { ok: true });
    }
    if (body.kind !== "result") return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: 'kind must be "ack" or "result"' });
    const result = parseBridgeResult(body.result);
    if (!result) return this.fail(res, 400, "bad_request", L, "error.badRequest", { message: "result is malformed or exceeds the bridge limits" });
    // The browser answered: a cancel it may have missed need not be sent again.
    s.cancels.delete(body.correlationId);
    // A late or repeated result (the call ended, or was answered already) is accepted and dropped.
    if (call) this.complete(s, call, result);
    this.settle(s, body.correlationId);
    sendJson(res, 200, { ok: true, accepted: !!call });
  }
}
