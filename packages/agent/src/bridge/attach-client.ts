/**
 * Attach side of the world bridge (docs/EMBODIED.md §12, docs/PROTOCOL.md
 * §13): lists the live sessions a `clinicalcraft serve` hosts and forwards
 * tool calls to one of them — what `clinicalcraft mcp --attach` uses.
 * Isomorphic (`fetch`). It authenticates with the server's token (as
 * `Authorization: Bearer` — the attach routes take no cookie) and the live
 * session's ATTACH KEY, which the learner copies from the web world's
 * "External agent" badge: the list holds only that key's sessions, and every
 * call names one of them. It never sees a channel secret: it can call and
 * cancel, never post results, answer approvals or unregister a session.
 *
 * Every method resolves (never rejects) to `{ok: true, value}` or
 * `{ok: false, error: {code, status, message}}` — `code` is a bridge error
 * code (`BridgeErrorCode`), `network` (the server is unreachable), `aborted`
 * (the caller's signal) or `bad_response`.
 */
import {
  ATTACH_KEY_HEADER,
  bridgeErrorOf,
  isCorrelationId,
  parseBridgeResult,
  parseLiveSessionInfo,
  WORLD_SESSIONS_PATH,
  type BridgeCallRequest,
  type BridgeCallResponse,
  type LiveSessionInfo,
} from "./protocol.js";

export interface WorldAttachOptions {
  /** `clinicalcraft serve`'s base URL, e.g. `http://127.0.0.1:5178`. */
  serverUrl: string;
  /** The server's access token (`Authorization: Bearer`), when it has one. */
  token?: string | null;
  /** The live session's attach key (`ak_…`, shown to the learner when they enabled external control). */
  attachKey?: string | null;
  fetch?: typeof fetch;
}

/** Why an attach request failed. `acknowledged` (call_timeout): the browser had received the call. */
export interface AttachFailure {
  code: string;
  status: number;
  message: string;
  acknowledged?: boolean;
}

export type AttachResult<T> = { ok: true; value: T } | { ok: false; error: AttachFailure };

export class WorldAttachClient {
  readonly serverUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: WorldAttachOptions) {
    this.serverUrl = options.serverUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
  }

  /** The live sessions of the attach key (connected first, then the most recent); none without a key. */
  async list(signal?: AbortSignal): Promise<AttachResult<LiveSessionInfo[]>> {
    const res = await this.request("GET", WORLD_SESSIONS_PATH, undefined, signal);
    if (!res.ok) return res;
    const raw = (res.value as { sessions?: unknown } | null)?.sessions;
    if (!Array.isArray(raw)) return bad();
    return { ok: true, value: raw.map(parseLiveSessionInfo).filter((s): s is LiveSessionInfo => s !== null) };
  }

  /** One live session. */
  async get(id: string, signal?: AbortSignal): Promise<AttachResult<LiveSessionInfo>> {
    const res = await this.request("GET", `${WORLD_SESSIONS_PATH}/${encodeURIComponent(id)}`, undefined, signal);
    if (!res.ok) return res;
    const info = parseLiveSessionInfo(res.value);
    return info ? { ok: true, value: info } : bad();
  }

  /**
   * Run a tool in a live session and wait for its result (the server's timeout:
   * `request.timeoutMs`). A network failure is retried once with the same
   * correlation id — the server answers a repeated id from the same call.
   */
  async call(id: string, request: BridgeCallRequest, signal?: AbortSignal): Promise<AttachResult<BridgeCallResponse>> {
    const path = `${WORLD_SESSIONS_PATH}/${encodeURIComponent(id)}/call`;
    let res = await this.request("POST", path, request, signal);
    if (!res.ok && res.error.code === "network" && !signal?.aborted) res = await this.request("POST", path, request, signal);
    if (!res.ok) return res;
    const value = res.value as Partial<BridgeCallResponse> | null;
    const result = parseBridgeResult(value?.result);
    if (!result || !isCorrelationId(value?.correlationId)) return bad();
    return { ok: true, value: { correlationId: value.correlationId, result, deduplicated: value.deduplicated === true } };
  }

  /** Ask the live session to stop a call (a `cancel` command); `cancelled`: it was still pending. */
  async cancel(id: string, correlationId: string): Promise<AttachResult<{ cancelled: boolean }>> {
    const res = await this.request("POST", `${WORLD_SESSIONS_PATH}/${encodeURIComponent(id)}/cancel`, { correlationId });
    if (!res.ok) return res;
    return { ok: true, value: { cancelled: (res.value as { cancelled?: unknown } | null)?.cancelled === true } };
  }

  private async request(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<AttachResult<unknown>> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (this.options.token) headers.authorization = `Bearer ${this.options.token}`;
    if (this.options.attachKey) headers[ATTACH_KEY_HEADER] = this.options.attachKey;
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.serverUrl}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), ...(signal ? { signal } : {}) });
    } catch (err) {
      if (signal?.aborted) return { ok: false, error: { code: "aborted", status: 0, message: "aborted" } };
      const cause = (err as { cause?: { message?: string } }).cause?.message;
      return { ok: false, error: { code: "network", status: 0, message: cause ?? (err instanceof Error ? err.message : String(err)) } };
    }
    let value: unknown = null;
    try {
      value = await res.json();
    } catch {
      if (signal?.aborted) return { ok: false, error: { code: "aborted", status: 0, message: "aborted" } };
      if (res.ok) return bad(res.status);
    }
    if (res.ok) return { ok: true, value };
    const e = bridgeErrorOf(value);
    return { ok: false, error: { code: e?.code ?? (res.status === 404 ? "not_found" : `http_${res.status}`), status: res.status, message: e?.message ?? `HTTP ${res.status}`, ...(e?.acknowledged !== undefined ? { acknowledged: e.acknowledged } : {}) } };
  }
}

function bad(status = 200): { ok: false; error: AttachFailure } {
  return { ok: false, error: { code: "bad_response", status, message: "unexpected answer from the server" } };
}
