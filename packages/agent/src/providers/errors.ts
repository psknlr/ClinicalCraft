/**
 * Provider error classification → `ProviderErrorInfo` (ZCode-style
 * normalisation). Covers HTTP statuses, OpenAI-style `error.type`/`error.code`,
 * Anthropic error types and Zhipu (BigModel / Z.ai) business codes.
 */
import type { ProviderErrorInfo } from "./types.js";

type Kind = ProviderErrorInfo["kind"];

const CONTEXT_RE =
  /context[_ ]?length|context window|maximum context|too many tokens|prompt is too long|input is too long|input too long|exceeds? the (?:model'?s )?(?:maximum|context)|reduce the length|token limit|max_prompt_tokens|string_above_max_length/i;
const QUOTA_RE = /insufficient[_ ]quota|insufficient balance|exceeded your current quota|billing|credit balance|余额不足|欠费|arrear|quota exceeded|payment required/i;

/** Zhipu (open.bigmodel.cn / api.z.ai) business error codes. */
const ZHIPU_CODES: Record<number, { kind: Kind; retryable: boolean }> = {
  1000: { kind: "auth", retryable: false },
  1001: { kind: "auth", retryable: false },
  1002: { kind: "auth", retryable: false },
  1003: { kind: "auth", retryable: false },
  1004: { kind: "auth", retryable: false },
  1006: { kind: "auth", retryable: false },
  1110: { kind: "auth", retryable: false },
  1111: { kind: "auth", retryable: false },
  1112: { kind: "auth", retryable: false },
  1113: { kind: "quota", retryable: false },
  1210: { kind: "bad_request", retryable: false },
  1211: { kind: "bad_request", retryable: false },
  1213: { kind: "bad_request", retryable: false },
  1214: { kind: "bad_request", retryable: false },
  1220: { kind: "auth", retryable: false },
  1234: { kind: "network", retryable: true },
  1261: { kind: "context_exceeded", retryable: false },
  1301: { kind: "refusal", retryable: false },
  1302: { kind: "rate_limit", retryable: true },
  1303: { kind: "rate_limit", retryable: true },
  1304: { kind: "quota", retryable: false },
  1305: { kind: "rate_limit", retryable: true },
  1308: { kind: "quota", retryable: false },
  1310: { kind: "quota", retryable: false },
  1312: { kind: "overloaded", retryable: true },
  1313: { kind: "quota", retryable: false },
  1316: { kind: "quota", retryable: false },
  1317: { kind: "quota", retryable: false },
  1318: { kind: "quota", retryable: false },
  1319: { kind: "quota", retryable: false },
  1320: { kind: "quota", retryable: false },
  1321: { kind: "quota", retryable: false },
};

/** Map an OpenAI/Anthropic-style string `type`/`code` to a kind. */
const STRING_CODES: Record<string, { kind: Kind; retryable: boolean }> = {
  insufficient_quota: { kind: "quota", retryable: false },
  billing_error: { kind: "quota", retryable: false },
  billing_hard_limit_reached: { kind: "quota", retryable: false },
  context_length_exceeded: { kind: "context_exceeded", retryable: false },
  string_above_max_length: { kind: "context_exceeded", retryable: false },
  rate_limit_exceeded: { kind: "rate_limit", retryable: true },
  rate_limit_error: { kind: "rate_limit", retryable: true },
  tokens: { kind: "rate_limit", retryable: true },
  requests: { kind: "rate_limit", retryable: true },
  invalid_api_key: { kind: "auth", retryable: false },
  authentication_error: { kind: "auth", retryable: false },
  permission_error: { kind: "auth", retryable: false },
  permission_denied: { kind: "auth", retryable: false },
  overloaded_error: { kind: "overloaded", retryable: true },
  server_error: { kind: "overloaded", retryable: true },
  api_error: { kind: "overloaded", retryable: true },
  timeout_error: { kind: "timeout", retryable: true },
  not_found_error: { kind: "bad_request", retryable: false },
  model_not_found: { kind: "bad_request", retryable: false },
  content_filter: { kind: "refusal", retryable: false },
  // Alibaba DashScope (Qwen) — compatible-mode and native code spellings.
  Arrearage: { kind: "quota", retryable: false },
  data_inspection_failed: { kind: "refusal", retryable: false },
  DataInspectionFailed: { kind: "refusal", retryable: false },
  // Moonshot (Kimi).
  exceeded_current_quota_error: { kind: "quota", retryable: false },
  engine_overloaded_error: { kind: "overloaded", retryable: true },
};

interface ParsedErrorBody {
  message?: string;
  type?: string;
  code?: string | number;
}

/** Extract `{message, type, code}` from common error body shapes. */
export function parseErrorBody(bodyText: string): ParsedErrorBody {
  const text = bodyText?.trim() ?? "";
  if (!text) return {};
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
  const out: ParsedErrorBody = {};
  const root = isRecord(json) ? json : {};
  const err = isRecord(root.error) ? root.error : typeof root.error === "string" ? { message: root.error } : root;
  const message = err.message ?? root.message ?? root.detail ?? root.msg;
  if (typeof message === "string") out.message = message;
  else if (message != null) out.message = JSON.stringify(message).slice(0, 500);
  const type = err.type ?? root.type;
  if (typeof type === "string" && type !== "error") out.type = type;
  const code = err.code ?? root.code;
  if (typeof code === "string" || typeof code === "number") out.code = code;
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * `ProviderErrorInfo` plus the server's retry hint. The contract type has no
 * field for it yet (CONTRACT CHANGE REQUEST: `retryAfterMs?: number`), so it
 * travels as an extra own property — structurally still a `ProviderErrorInfo`
 * and preserved through JSON (the server proxy).
 */
export type ProviderErrorInfoWithRetry = ProviderErrorInfo & { retryAfterMs?: number };

/** The retry hint carried by an error info, if any. */
export function retryAfterMsOf(info: ProviderErrorInfo): number | undefined {
  const v = (info as ProviderErrorInfoWithRetry).retryAfterMs;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

/** Minimal header accessor (fetch `Headers`, SDK error headers). */
export interface HeaderLike {
  get(name: string): string | null;
}

/**
 * Parse `retry-after-ms` (OpenAI) or `retry-after` (seconds or an HTTP date)
 * into milliseconds. Undefined when absent or malformed.
 */
export function parseRetryAfter(headers: HeaderLike | null | undefined, now: () => number = Date.now): number | undefined {
  if (!headers || typeof headers.get !== "function") return undefined;
  const ms = headers.get("retry-after-ms")?.trim();
  if (ms && /^\d+(\.\d+)?$/.test(ms)) return Math.round(Number(ms));
  const value = headers.get("retry-after")?.trim();
  if (!value) return undefined;
  if (/^\d+(\.\d+)?$/.test(value)) return Math.round(Number(value) * 1000);
  if (!/[a-z]/i.test(value)) return undefined;
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - now()) : undefined;
}

/** Attach a parsed retry hint to a retryable error (no-op otherwise). */
export function withRetryAfter(info: ProviderErrorInfo, headers: HeaderLike | null | undefined): ProviderErrorInfo {
  if (!info.retryable) return info;
  const hint = parseRetryAfter(headers);
  return hint === undefined ? info : ({ ...info, retryAfterMs: hint } as ProviderErrorInfoWithRetry);
}

/**
 * Classify an HTTP error response. `bodyText` may be JSON or plain text.
 * Precedence: Zhipu business code → string type/code → message heuristics → status.
 * With `headers`, a `retry-after` hint is attached to retryable errors.
 */
export function classifyHttpError(status: number, bodyText: string, headers?: HeaderLike | null): ProviderErrorInfo {
  const parsed = parseErrorBody(bodyText);
  const message = parsed.message?.trim() || (status ? `HTTP ${status}` : "Provider error");
  const info = (kind: Kind, retryable: boolean): ProviderErrorInfo => {
    const result: ProviderErrorInfo = { message, kind, retryable };
    if (status) result.status = status;
    if (parsed.code !== undefined) result.code = parsed.code;
    else if (parsed.type) result.code = parsed.type;
    return headers ? withRetryAfter(result, headers) : result;
  };

  // 1. Zhipu business codes ("1302" or 1302).
  const numeric = typeof parsed.code === "number" ? parsed.code : typeof parsed.code === "string" && /^\d{4}$/.test(parsed.code) ? Number(parsed.code) : NaN;
  if (Number.isFinite(numeric) && Object.hasOwn(ZHIPU_CODES, numeric)) {
    const z = ZHIPU_CODES[numeric]!;
    return info(z.kind, z.retryable);
  }

  // 2. String codes / types.
  for (const key of [parsed.code, parsed.type]) {
    if (typeof key === "string" && Object.hasOwn(STRING_CODES, key)) {
      const s = STRING_CODES[key]!;
      // A 429 "rate_limit" that is really a quota exhaustion.
      if (s.kind === "rate_limit" && QUOTA_RE.test(message)) return info("quota", false);
      return info(s.kind, s.retryable);
    }
  }

  // 3. Message heuristics.
  if (CONTEXT_RE.test(message) && (status === 400 || status === 413 || status === 422 || !status)) return info("context_exceeded", false);
  if (QUOTA_RE.test(message) && (status === 402 || status === 429 || status === 403 || status === 400)) return info("quota", false);

  // 4. Status codes.
  if (status === 401 || status === 403) return info("auth", false);
  if (status === 402) return info("quota", false);
  if (status === 408) return info("timeout", true);
  if (status === 409) return info("overloaded", true);
  if (status === 413) return info("context_exceeded", false);
  if (status === 429) return info("rate_limit", true);
  if (status === 529) return info("overloaded", true);
  if (status >= 500) return info("overloaded", true);
  if (status === 400 || status === 404 || status === 405 || status === 422) return info("bad_request", false);
  return info("unknown", false);
}

/** Error info for an aborted request (never retried). */
export function abortedError(message = "Request aborted"): ProviderErrorInfo {
  return { message, kind: "network", code: "aborted", retryable: false };
}

/** True if this error info represents a caller abort. */
export function isAbortInfo(info: ProviderErrorInfo): boolean {
  return info.code === "aborted";
}

/** True for DOM/Node abort errors. */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: unknown }).name;
  return name === "AbortError" || name === "APIUserAbortError";
}

/** Classify a thrown fetch/network error. */
export function networkError(err: unknown, signal?: AbortSignal): ProviderErrorInfo {
  if (signal?.aborted || isAbortError(err)) return abortedError();
  const name = typeof err === "object" && err ? (err as { name?: unknown }).name : undefined;
  const message = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : "";
  if (name === "TimeoutError" || /timed? ?out|ETIMEDOUT/i.test(message)) {
    return { message: `Request timed out${cause}`, kind: "timeout", retryable: true };
  }
  return { message: `Network error: ${message}${cause}`, kind: "network", retryable: true };
}
