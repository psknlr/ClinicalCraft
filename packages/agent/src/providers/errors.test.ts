import { describe, expect, it } from "vitest";
import { abortedError, classifyHttpError, isAbortInfo, networkError, parseErrorBody, parseRetryAfter, retryAfterMsOf } from "./errors.js";

const zhipu = (code: string, message = "msg") => JSON.stringify({ error: { code, message } });

describe("classifyHttpError", () => {
  it.each([
    ["1261", "context_exceeded", false],
    ["1302", "rate_limit", true],
    ["1303", "rate_limit", true],
    ["1305", "rate_limit", true],
    ["1304", "quota", false],
    ["1308", "quota", false],
    ["1310", "quota", false],
    ["1313", "quota", false],
    ["1316", "quota", false],
    ["1321", "quota", false],
    ["1312", "overloaded", true],
    ["1234", "network", true],
    ["1006", "auth", false],
    ["1113", "quota", false],
  ] as const)("maps Zhipu business code %s → %s (retryable %s)", (code, kind, retryable) => {
    const info = classifyHttpError(429, zhipu(code));
    expect(info.kind).toBe(kind);
    expect(info.retryable).toBe(retryable);
    expect(info.code).toBe(code);
    expect(info.status).toBe(429);
  });

  it("accepts numeric Zhipu codes", () => {
    expect(classifyHttpError(400, JSON.stringify({ error: { code: 1261, message: "Prompt 超长" } })).kind).toBe("context_exceeded");
  });

  it("maps OpenAI-style types/codes", () => {
    expect(classifyHttpError(429, JSON.stringify({ error: { message: "You exceeded your current quota", type: "insufficient_quota", code: "insufficient_quota" } }))).toMatchObject({
      kind: "quota",
      retryable: false,
    });
    expect(classifyHttpError(400, JSON.stringify({ error: { message: "too long", type: "invalid_request_error", code: "context_length_exceeded" } }))).toMatchObject({
      kind: "context_exceeded",
      retryable: false,
    });
    expect(classifyHttpError(429, JSON.stringify({ error: { message: "slow down", code: "rate_limit_exceeded" } }))).toMatchObject({ kind: "rate_limit", retryable: true });
  });

  it("detects context-length errors from the message", () => {
    expect(classifyHttpError(400, JSON.stringify({ error: { message: "This model's maximum context length is 128000 tokens" } })).kind).toBe("context_exceeded");
    expect(classifyHttpError(400, JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "prompt is too long: 210000 tokens > 200000 maximum" } })).kind).toBe(
      "context_exceeded",
    );
  });

  it("falls back to HTTP status", () => {
    expect(classifyHttpError(401, "")).toMatchObject({ kind: "auth", retryable: false, message: "HTTP 401" });
    expect(classifyHttpError(403, "forbidden")).toMatchObject({ kind: "auth", retryable: false, message: "forbidden" });
    expect(classifyHttpError(408, "")).toMatchObject({ kind: "timeout", retryable: true });
    expect(classifyHttpError(429, "")).toMatchObject({ kind: "rate_limit", retryable: true });
    expect(classifyHttpError(500, "")).toMatchObject({ kind: "overloaded", retryable: true });
    expect(classifyHttpError(503, "<html>bad gateway</html>")).toMatchObject({ kind: "overloaded", retryable: true });
    expect(classifyHttpError(529, JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } }))).toMatchObject({
      kind: "overloaded",
      retryable: true,
      message: "Overloaded",
    });
    expect(classifyHttpError(404, "")).toMatchObject({ kind: "bad_request", retryable: false });
    expect(classifyHttpError(418, "")).toMatchObject({ kind: "unknown", retryable: false });
  });

  it("parses assorted body shapes", () => {
    expect(parseErrorBody('{"message":"plain"}')).toEqual({ message: "plain" });
    expect(parseErrorBody('{"detail":"fastapi"}')).toEqual({ message: "fastapi" });
    expect(parseErrorBody('{"error":"just a string"}')).toEqual({ message: "just a string" });
    expect(parseErrorBody("not json")).toEqual({ message: "not json" });
  });
});

describe("network/abort helpers", () => {
  it("classifies aborts and timeouts", () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(isAbortInfo(networkError(abort))).toBe(true);
    expect(isAbortInfo(abortedError())).toBe(true);
    expect(networkError(Object.assign(new Error("x"), { name: "TimeoutError" }))).toMatchObject({ kind: "timeout", retryable: true });
    expect(networkError(new TypeError("fetch failed"))).toMatchObject({ kind: "network", retryable: true });
  });
});

describe("parseRetryAfter", () => {
  it("reads retry-after-ms, retry-after seconds and HTTP dates", () => {
    expect(parseRetryAfter(new Headers({ "retry-after-ms": "1500" }))).toBe(1500);
    expect(parseRetryAfter(new Headers({ "retry-after": "3" }))).toBe(3000);
    expect(parseRetryAfter(new Headers({ "retry-after": "0.5" }))).toBe(500);
    const at = Date.UTC(2030, 0, 1, 0, 0, 10);
    expect(parseRetryAfter(new Headers({ "retry-after": new Date(at).toUTCString() }), () => at - 10_000)).toBe(10_000);
    expect(parseRetryAfter(new Headers({ "retry-after": "soon" }))).toBeUndefined();
    expect(parseRetryAfter(new Headers({ "retry-after": "-4" }))).toBeUndefined();
    expect(parseRetryAfter(new Headers())).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
  });

  it("classifyHttpError attaches the hint for retryable errors only", () => {
    const limited = classifyHttpError(429, JSON.stringify({ error: { type: "rate_limit_error", message: "x" } }), new Headers({ "retry-after": "2" }));
    expect(retryAfterMsOf(limited)).toBe(2000);
    const auth = classifyHttpError(401, "", new Headers({ "retry-after": "2" }));
    expect(retryAfterMsOf(auth)).toBeUndefined();
    expect(retryAfterMsOf({ message: "x", kind: "unknown", retryable: true })).toBeUndefined();
  });
});

describe("vendor error codes (DashScope, Moonshot, DeepSeek)", () => {
  const body = (error: Record<string, unknown>) => JSON.stringify({ error });
  it("classifies arrears/quota and content moderation codes", () => {
    expect(classifyHttpError(400, body({ code: "Arrearage", type: "Arrearage", message: "Access denied, please make sure your account is in good standing." }))).toMatchObject({ kind: "quota", retryable: false });
    expect(classifyHttpError(400, body({ code: "data_inspection_failed", type: "data_inspection_failed", message: "Input data may contain inappropriate content." }))).toMatchObject({
      kind: "refusal",
      retryable: false,
    });
    expect(classifyHttpError(400, body({ code: "DataInspectionFailed", message: "Output data may contain inappropriate content." }))).toMatchObject({ kind: "refusal" });
    expect(classifyHttpError(429, body({ type: "exceeded_current_quota_error", message: "Your account org-1 is suspended, please check your plan" }))).toMatchObject({ kind: "quota", retryable: false });
    expect(classifyHttpError(429, body({ type: "engine_overloaded_error", message: "The engine is currently overloaded, please try again later" }))).toMatchObject({ kind: "overloaded", retryable: true });
    expect(classifyHttpError(402, body({ message: "Insufficient Balance", type: "unknown_error" }))).toMatchObject({ kind: "quota", retryable: false });
    expect(classifyHttpError(429, body({ code: "Throttling.RateQuota", message: "Requests rate limit exceeded" }))).toMatchObject({ kind: "rate_limit", retryable: true });
  });
});
