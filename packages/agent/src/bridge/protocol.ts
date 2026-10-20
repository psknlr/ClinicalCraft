/**
 * World bridge contract (docs/EMBODIED.md §12, docs/PROTOCOL.md §13): how an
 * external agent (`clinicalcraft mcp --attach`) acts in a learner's LIVE
 * browser session through `clinicalcraft serve`. Isomorphic (no `node:*`):
 * the server's `WorldSessionRouter`, the browser client (`connectWorldBridge`)
 * and the attach client (`WorldAttachClient`) share these shapes, limits and
 * validators.
 *
 *   browser ── POST   /api/world/sessions ──────────────▶ register → {id, secret}
 *   browser ◀─ GET    /api/world/sessions/:id/commands ── SSE `command` events (call / cancel)
 *   browser ── POST   /api/world/sessions/:id/results ──▶ ack / result, by correlation id
 *   browser ── POST   /api/world/sessions/:id/heartbeat ▶ liveness (+ current capabilities)
 *   browser ── DELETE /api/world/sessions/:id ──────────▶ unregister (the learner disconnects)
 *   attach  ── GET    /api/world/sessions ──────────────▶ the live sessions of the presented attach key (never a secret)
 *   attach  ── GET    /api/world/sessions/:id ──────────▶ one live session
 *   attach  ── POST   /api/world/sessions/:id/call ─────▶ enqueue, wait for the result (timeout, dedupe)
 *   attach  ── POST   /api/world/sessions/:id/cancel ───▶ a `cancel` command
 *
 * Every route needs the server's auth when it has a token (a token-less
 * server is loopback-only): the browser's routes take it as the page's
 * `cc_token` cookie (or Bearer), the attach routes ONLY as
 * `Authorization: Bearer` (no ambient cookie). The browser's channel routes
 * (commands, results, heartbeat, DELETE) also need the per-session channel
 * secret in the `x-clinicalcraft-channel` header; attach clients never see
 * it, so they can neither post results nor unregister a session. The attach
 * routes need the session's ATTACH KEY in `x-clinicalcraft-attach-key`: the
 * browser makes one when the learner opts in and shows it to the learner,
 * who hands it (with the live-session id) to their own external agent — a
 * holder of the server token alone cannot see, call or impersonate another
 * learner's session.
 */
import { hashString } from "@clinicalcraft/core";
import type { ApprovalDecision, RiskLevel } from "../protocol.js";
import { sanitizeTerminal } from "../terminal.js";
import { clinicalTools } from "../tools/clinical.js";
import { WORLD_TOOL_NAMES } from "../tools/world.js";

/** Base path of the bridge routes. */
export const WORLD_SESSIONS_PATH = "/api/world/sessions";

/** Request header carrying a live session's channel secret (browser routes only; never in a URL). */
export const CHANNEL_SECRET_HEADER = "x-clinicalcraft-channel";

/** Request header carrying a live session's attach key (attach routes only; never in a URL). */
export const ATTACH_KEY_HEADER = "x-clinicalcraft-attach-key";

/** Timing defaults (ms). The server announces its own values at registration. */
export const BRIDGE_DEFAULTS = {
  /** How often the browser sends a heartbeat. */
  heartbeatMs: 10_000,
  /** A session without any channel request (heartbeat, result, stream connect) for this long is removed. */
  expireAfterMs: 45_000,
  /** SSE `ping` events on the command stream (also wake a throttled background tab to send its heartbeat). */
  pingMs: 10_000,
  /** Default time an attach call waits for its result (approvals included). */
  callTimeoutMs: 120_000,
  minCallTimeoutMs: 1_000,
  maxCallTimeoutMs: 600_000,
} as const;

/** Size limits of the wire shapes. */
export const BRIDGE_LIMITS = {
  /** Correlation ids, live-session ids, case handles: characters. */
  id: 128,
  title: 200,
  facilityId: 128,
  /** Entries of `capabilities`. */
  capabilities: 64,
  /** Characters of a result's `output`. */
  outputChars: 200_000,
  /** Bytes of a result's `data` as JSON (larger data is dropped and the result marked `truncated`). */
  dataBytes: 1_000_000,
  /** Entries of `notices` / `warnings`, and characters of each. */
  lines: 32,
  lineChars: 2_000,
  approvals: 16,
  /** Bytes of a call's `args` as UTF-8 JSON (tool arguments are ids and short texts; well below the 2 MB body limit). */
  argsBytes: 64 * 1024,
} as const;

/**
 * Tools an external agent may call in a live session — as the clinician agent:
 * the clinical tools (PROTOCOL §3) and the world tools (§12.4). Never the
 * front-end's dynamic `walk_to`, nor `get_camera_frame` (images do not travel
 * over the bridge). The browser additionally requires the clinician's
 * allow-list, practice scope and bare deny rules (`toolsFor("clinician")`).
 */
export const BRIDGE_TOOLS: readonly string[] = Object.freeze([...clinicalTools().map((t) => t.name), ...WORLD_TOOL_NAMES.filter((name) => name !== "get_camera_frame")]);

const BRIDGE_TOOL_SET: ReadonlySet<string> = new Set(BRIDGE_TOOLS);

/** Whether `name` is a tool the bridge forwards. */
export function isBridgeTool(name: unknown): name is string {
  return typeof name === "string" && BRIDGE_TOOL_SET.has(name);
}

/**
 * Opaque, stable handle for a case. Case ids name the diagnosis
 * (`stemi-inferior-rv`), and an external agent plays the clinician being
 * assessed: it sees handles, never ids (MCP `list_cases`, live sessions).
 */
export function caseHandle(caseId: string): string {
  return `case-${hashString(`clinicalcraft-case:${caseId}`).toString(36).padStart(7, "0").slice(-7)}`;
}

const CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const LIVE_SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/;
const HANDLE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const FACILITY_ID = /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/;
const ATTACH_KEY = /^ak_[A-Za-z0-9_-]{32,96}$/;

/** An attach key (`newAttachKey`): `ak_` + 32–96 base64url characters. */
export function isAttachKey(value: unknown): value is string {
  return typeof value === "string" && ATTACH_KEY.test(value);
}

/**
 * A fresh attach key: `ak_` + 32 random bytes as base64url (43 characters).
 * The browser makes one when the learner opts in, keeps it in memory only and
 * shows it to the learner; the server keeps its SHA-256 digest. Isomorphic
 * (`crypto.getRandomValues`, available in browsers — secure context or not —
 * and Node 22).
 */
export function newAttachKey(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `ak_${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

/** A correlation id (chosen by the attach client; dedupe key of a call). */
export function isCorrelationId(value: unknown): value is string {
  return typeof value === "string" && CORRELATION_ID.test(value);
}

/** A live-session id as the server issues them. */
export function isLiveSessionId(value: unknown): value is string {
  return typeof value === "string" && LIVE_SESSION_ID.test(value);
}

/** An opaque case handle (`caseHandle`). */
export function isCaseHandle(value: unknown): value is string {
  return typeof value === "string" && HANDLE.test(value);
}

/** A facility id. */
export function isFacilityId(value: unknown): value is string {
  return typeof value === "string" && FACILITY_ID.test(value);
}

/** Bidirectional-text controls (they can make shown text read differently from what it is). */
const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/g;

/** Text from another party as it may be shown: no control, escape or bidi sequences, trimmed, at most `max` characters. */
export function cleanBridgeText(text: string, max: number): string {
  const clean = sanitizeTerminal(text).replace(BIDI_CONTROLS, "").trim();
  return clean.length > max ? `${clean.slice(0, Math.max(0, max - 1))}…` : clean;
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

/** `POST /api/world/sessions` body: what the browser tells attach clients about its session. */
export interface BridgeRegistration {
  /** `caseHandle(caseId)` — never the case id (it names the diagnosis). */
  caseHandle: string;
  /** Spoiler-free case title in the session's language (optional). */
  title?: string | null;
  facilityId: string | null;
  embodiment: "clinical" | "embodied";
  /** `zh-CN` or `en`. */
  locale: string;
  /** Tools the session accepts now (⊆ `BRIDGE_TOOLS`). */
  capabilities: string[];
  /**
   * The attach key the learner hands to their external agent (`newAttachKey`, made at opt-in, the same for
   * every re-registration of that opt-in). The server keeps its digest; attach clients must present it.
   */
  attachKey: string;
  /**
   * Re-registration after the server forgot the session (expiry, restart): the id it had, kept when it is
   * free and was not another key's — so the learner's external agent keeps its `--world-session`.
   */
  previousId?: string | null;
}

/** `POST /api/world/sessions` answer (201). `secret` is shown once: the browser keeps it in memory only. */
export interface BridgeRegistered {
  id: string;
  secret: string;
  heartbeatMs: number;
  expireAfterMs: number;
  pingMs: number;
}

/** A live session as attach clients see it (`GET /api/world/sessions`). */
export interface LiveSessionInfo {
  id: string;
  caseHandle: string;
  title: string | null;
  facilityId: string | null;
  embodiment: "clinical" | "embodied";
  locale: string;
  capabilities: string[];
  /** ISO timestamps. */
  createdAt: string;
  lastSeenAt: string;
  /** The browser's command stream is open. */
  connected: boolean;
  /** Calls waiting for a result. */
  pendingCalls: number;
}

/** `POST …/heartbeat` body (optional). */
export interface BridgeHeartbeat {
  capabilities?: string[];
}

/** A command on the browser's SSE stream (`event: command`). */
export type BridgeCommand =
  /** Run `tool` with `args` as the clinician; `deadline` (ms since epoch, server clock) is when the caller stops waiting. */
  | { type: "call"; correlationId: string; tool: string; args: Record<string, unknown>; deadline: number }
  /** Stop the call (queued: never runs; running: aborted, its approval request withdrawn). */
  | { type: "cancel"; correlationId: string };

/** First event on a command stream (`event: hello`). */
export interface BridgeHello {
  id: string;
  heartbeatMs: number;
  expireAfterMs: number;
  pingMs: number;
  /** The server's clock (ms since epoch; null from an older server): call deadlines are in this clock. */
  now: number | null;
}

/** Why the server ended a command stream (`event: closed`). */
export type BridgeClosedReason = "unregistered" | "expired" | "replaced" | "server_closing";

/**
 * How a call ended: `ok` (the tool succeeded), `error` (it ran and failed, or
 * the call was invalid), `denied` (a deny rule, plan mode, a hook, the bridge's
 * safety rules, or the learner refused the approval), `cancelled` (cancelled,
 * interrupted by the learner, or never run).
 */
export type BridgeCallStatus = "ok" | "error" | "denied" | "cancelled";

/** An approval request the learner answered during a call (the external agent cannot answer one). */
export interface BridgeApproval {
  tool: string;
  risk: RiskLevel;
  summary: string;
  decision: ApprovalDecision;
}

/** The outcome of one call, as the clinician agent would see it. */
export interface BridgeToolResult {
  ok: boolean;
  status: BridgeCallStatus;
  /** The tool's text — exactly what a clinician model reads. */
  output: string;
  /** Typed payload (`ToolOutput.data`: the finding, the world action result with its `hint`…) when it fits. */
  data?: unknown;
  /** Learner-visible notifications raised while it ran (alarms, critical results…). */
  notices?: string[];
  /** Session warnings raised while it ran. */
  warnings?: string[];
  approvals?: BridgeApproval[];
  /** `output` or `data` was cut to the bridge's limits. */
  truncated?: boolean;
}

/** `POST …/results` body: an acknowledgement (the command arrived) or the final result. */
export type BridgeResultPost = { correlationId: string; kind: "ack" } | { correlationId: string; kind: "result"; result: BridgeToolResult };

/** `POST …/call` body. */
export interface BridgeCallRequest {
  correlationId: string;
  tool: string;
  args?: Record<string, unknown>;
  /** How long to wait for the result (ms; default `BRIDGE_DEFAULTS.callTimeoutMs`). */
  timeoutMs?: number;
}

/** `POST …/call` answer (200). `deduplicated`: answered from an earlier call with the same correlation id. */
export interface BridgeCallResponse {
  correlationId: string;
  result: BridgeToolResult;
  deduplicated: boolean;
}

/** `POST …/cancel` body. */
export interface BridgeCancelRequest {
  correlationId: string;
}

/** Stable error codes of the bridge routes (`{error: {code, message}}`). */
export type BridgeErrorCode =
  | "unauthorized"
  | "forbidden_origin"
  | "forbidden_host"
  | "forbidden_channel"
  | "forbidden_attach_key"
  | "unknown_session"
  | "session_expired"
  | "session_closed"
  | "bad_request"
  | "bad_json"
  | "unsupported_media_type"
  | "body_too_large"
  | "args_too_large"
  | "method_not_allowed"
  | "not_found"
  | "too_many_sessions"
  | "too_many_calls"
  | "too_many_streams"
  | "tool_not_available"
  | "correlation_conflict"
  | "call_timeout"
  | "not_connected"
  | "call_cancelled"
  | "server_closing";

/** Error body of a bridge route. `acknowledged` (call_timeout): the browser had received the call. */
export interface BridgeErrorBody {
  error: { code: BridgeErrorCode; message: string; acknowledged?: boolean };
}

/* ------------------------------------------------------------------ */
/* Validation (both sides read what the other party sent)              */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const STATUSES: ReadonlySet<string> = new Set<BridgeCallStatus>(["ok", "error", "denied", "cancelled"]);
const RISKS: ReadonlySet<string> = new Set<RiskLevel>(["none", "low", "moderate", "high"]);
const DECISIONS: ReadonlySet<string> = new Set<ApprovalDecision>(["approved", "approved_for_session", "denied", "abort"]);

function lines(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > BRIDGE_LIMITS.lines) return null;
  const out: string[] = [];
  for (const line of value) {
    if (typeof line !== "string" || line.length > BRIDGE_LIMITS.lineChars) return null;
    out.push(line);
  }
  return out;
}

/** Bytes of a call's arguments as UTF-8 JSON (`Infinity` when not serialisable): at most `BRIDGE_LIMITS.argsBytes`. */
export function bridgeArgsBytes(args: unknown): number {
  try {
    return utf8Length(JSON.stringify(args) ?? "null");
  } catch {
    return Infinity;
  }
}

/** Byte length of a string as UTF-8 (no `TextEncoder` allocation for ASCII-heavy text). */
function utf8Length(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

/**
 * Validate a result another party sent (the server reads the browser's; the
 * attach client reads the server's). Null when it is not a well-formed result
 * within the limits.
 */
export function parseBridgeResult(value: unknown): BridgeToolResult | null {
  if (!isRecord(value)) return null;
  const { ok, status, output } = value;
  if (typeof ok !== "boolean" || typeof status !== "string" || !STATUSES.has(status) || typeof output !== "string") return null;
  if (output.length > BRIDGE_LIMITS.outputChars) return null;
  const notices = lines(value.notices);
  const warnings = lines(value.warnings);
  if (!notices || !warnings) return null;
  const approvals: BridgeApproval[] = [];
  if (value.approvals !== undefined) {
    if (!Array.isArray(value.approvals) || value.approvals.length > BRIDGE_LIMITS.approvals) return null;
    for (const a of value.approvals) {
      if (!isRecord(a) || typeof a.tool !== "string" || a.tool.length > 64 || typeof a.summary !== "string" || a.summary.length > BRIDGE_LIMITS.lineChars) return null;
      if (typeof a.risk !== "string" || !RISKS.has(a.risk) || typeof a.decision !== "string" || !DECISIONS.has(a.decision)) return null;
      approvals.push({ tool: a.tool, risk: a.risk as RiskLevel, summary: a.summary, decision: a.decision as ApprovalDecision });
    }
  }
  let data: unknown;
  if (value.data !== undefined) {
    let json: string;
    try {
      json = JSON.stringify(value.data) ?? "null";
    } catch {
      return null;
    }
    if (utf8Length(json) > BRIDGE_LIMITS.dataBytes) return null;
    data = value.data;
  }
  return {
    ok,
    status: status as BridgeCallStatus,
    output,
    ...(data !== undefined ? { data } : {}),
    ...(notices.length ? { notices } : {}),
    ...(warnings.length ? { warnings } : {}),
    ...(approvals.length ? { approvals } : {}),
    ...(value.truncated === true ? { truncated: true } : {}),
  };
}

/**
 * Fit a result into the bridge's limits before it is sent (the browser):
 * `output` cut, extra lines and approvals dropped, `data` dropped when its JSON
 * is too large or not serialisable — marked `truncated`.
 */
export function boundBridgeResult(result: BridgeToolResult): BridgeToolResult {
  let truncated = result.truncated === true;
  const cut = (text: string, max: number) => {
    if (text.length <= max) return text;
    truncated = true;
    return `${text.slice(0, Math.max(0, max - 1))}…`;
  };
  const cutLines = (list: readonly string[] | undefined) => {
    if (!list?.length) return undefined;
    if (list.length > BRIDGE_LIMITS.lines) truncated = true;
    return list.slice(0, BRIDGE_LIMITS.lines).map((line) => cut(line, BRIDGE_LIMITS.lineChars));
  };
  let data: unknown = undefined;
  if (result.data !== undefined) {
    try {
      const json = JSON.stringify(result.data);
      if (json !== undefined && utf8Length(json) <= BRIDGE_LIMITS.dataBytes) data = JSON.parse(json) as unknown;
      else truncated = true;
    } catch {
      truncated = true;
    }
  }
  const notices = cutLines(result.notices);
  const warnings = cutLines(result.warnings);
  if ((result.approvals?.length ?? 0) > BRIDGE_LIMITS.approvals) truncated = true;
  const approvals = result.approvals?.slice(0, BRIDGE_LIMITS.approvals).map((a) => ({ ...a, tool: a.tool.slice(0, 64), summary: cut(a.summary, BRIDGE_LIMITS.lineChars) }));
  const output = cut(result.output, BRIDGE_LIMITS.outputChars);
  return {
    ok: result.ok,
    status: result.status,
    output,
    ...(data !== undefined ? { data } : {}),
    ...(notices ? { notices } : {}),
    ...(warnings ? { warnings } : {}),
    ...(approvals?.length ? { approvals } : {}),
    ...(truncated ? { truncated: true } : {}),
  };
}

/** A command from the SSE stream (the browser reads what the server sent). Null when malformed. */
export function parseBridgeCommand(value: unknown): BridgeCommand | null {
  if (!isRecord(value) || !isCorrelationId(value.correlationId)) return null;
  if (value.type === "cancel") return { type: "cancel", correlationId: value.correlationId };
  if (value.type !== "call" || !isBridgeTool(value.tool)) return null;
  const args = value.args === undefined ? {} : value.args;
  if (!isRecord(args)) return null;
  const deadline = typeof value.deadline === "number" && Number.isFinite(value.deadline) ? value.deadline : 0;
  return { type: "call", correlationId: value.correlationId, tool: value.tool, args, deadline };
}

/** The `hello` event of a command stream (the browser reads it). Null when malformed. */
export function parseBridgeHello(value: unknown): BridgeHello | null {
  if (!isRecord(value) || !isLiveSessionId(value.id)) return null;
  const ms = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const heartbeatMs = ms(value.heartbeatMs);
  const expireAfterMs = ms(value.expireAfterMs);
  const pingMs = ms(value.pingMs);
  if (heartbeatMs === null || expireAfterMs === null || pingMs === null) return null;
  return { id: value.id, heartbeatMs, expireAfterMs, pingMs, now: ms(value.now) };
}

/** A live session entry (the attach client reads the server's list). Null when malformed. */
export function parseLiveSessionInfo(value: unknown): LiveSessionInfo | null {
  if (!isRecord(value) || !isLiveSessionId(value.id) || !isCaseHandle(value.caseHandle)) return null;
  if (value.embodiment !== "clinical" && value.embodiment !== "embodied") return null;
  const capabilities = Array.isArray(value.capabilities) ? value.capabilities.filter(isBridgeTool) : [];
  return {
    id: value.id,
    caseHandle: value.caseHandle,
    title: typeof value.title === "string" ? cleanBridgeText(value.title, BRIDGE_LIMITS.title) || null : null,
    facilityId: isFacilityId(value.facilityId) ? value.facilityId : null,
    embodiment: value.embodiment,
    locale: value.locale === "zh-CN" ? "zh-CN" : "en",
    capabilities,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    lastSeenAt: typeof value.lastSeenAt === "string" ? value.lastSeenAt : "",
    connected: value.connected === true,
    pendingCalls: typeof value.pendingCalls === "number" && Number.isFinite(value.pendingCalls) ? value.pendingCalls : 0,
  };
}

/** `{error: {code, message}}` of a response body, if it is one. */
export function bridgeErrorOf(value: unknown): { code: string; message: string; acknowledged?: boolean } | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  const { code, message, acknowledged } = value.error;
  if (typeof code !== "string") return null;
  return { code, message: typeof message === "string" ? message : code, ...(typeof acknowledged === "boolean" ? { acknowledged } : {}) };
}
