import { describe, expect, it } from "vitest";
import { AnthropicProvider } from "./anthropic.js";
import { abortableSleep, createProvider, retryDelay, withRetry } from "./factory.js";
import { OFFLINE_ERROR_MESSAGE, OfflineProvider } from "./offline.js";
import { OpenAICompatibleProvider } from "./openai.js";
import { ProxyProvider } from "./proxy.js";
import { ScriptedProvider, textScript, toolCallScript } from "./scripted.js";
import type { ChatRequest, ProviderErrorInfo, StreamEvent } from "./types.js";

const req: ChatRequest = { model: "m", system: [], messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }] };
const err = (kind: ProviderErrorInfo["kind"], retryable: boolean): StreamEvent => ({ type: "error", error: { message: kind, kind, retryable } });

async function collect(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

const noSleep = { sleep: async () => undefined };

describe("createProvider", () => {
  it("creates the adapter for each wire", () => {
    expect(createProvider({ id: "anthropic", wire: "anthropic-messages", model: "claude-opus-5-5", apiKey: "k" })).toBeInstanceOf(AnthropicProvider);
    expect(createProvider({ id: "openai", wire: "openai-chat-completions", model: "gpt-5" })).toBeInstanceOf(OpenAICompatibleProvider);
    expect(createProvider({ id: "proxy", wire: "proxy", model: "x", proxyUrl: "/api/llm/stream" })).toBeInstanceOf(ProxyProvider);
    const offline = createProvider({ id: "offline", wire: "offline", model: "deterministic" });
    expect(offline).toBeInstanceOf(OfflineProvider);
    expect(offline.capabilities().supportsTools).toBe(false);
  });

  it("offline provider yields an explanatory error instead of a model call", async () => {
    expect(await collect(new OfflineProvider().stream(req))).toEqual([
      { type: "error", error: { message: OFFLINE_ERROR_MESSAGE, kind: "bad_request", code: "offline", retryable: false } },
    ]);
  });
});

describe("retryDelay", () => {
  it("is exponential from 2 s, ×2, capped at 60 s", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((a) => retryDelay(a, { jitter: false }))).toEqual([2000, 4000, 8000, 16000, 32000, 60000, 60000]);
  });
  it("applies ±20 % jitter by default", () => {
    expect(retryDelay(1, { random: () => 0 })).toBe(1600);
    expect(retryDelay(1, { random: () => 1 })).toBe(2400);
    expect(retryDelay(1, { random: () => 0.5, jitter: 0.5 })).toBe(2000);
  });
});

describe("withRetry", () => {
  it("retries retryable errors that happen before content, then streams the successful attempt", async () => {
    const inner = new ScriptedProvider([[{ type: "start", model: "m" }, err("overloaded", true)], [err("rate_limit", true)], textScript("Hello")]);
    const calls: [number, number, string][] = [];
    const p = withRetry(inner, { ...noSleep, jitter: false, onRetry: (a, d, e) => calls.push([a, d, e.kind]) });
    const events = await collect(p.stream(req));
    expect(calls).toEqual([
      [1, 2000, "overloaded"],
      [2, 4000, "rate_limit"],
    ]);
    expect(events.filter((e) => e.type === "start")).toHaveLength(1);
    expect(events.map((e) => e.type)).toEqual(["start", "text_delta", "finish"]);
    expect(inner.requests).toHaveLength(3);
  });

  it("gives up after maxRetries and surfaces the last error", async () => {
    const inner = new ScriptedProvider([[err("overloaded", true)], [err("overloaded", true)], [err("overloaded", true)]]);
    const events = await collect(withRetry(inner, { ...noSleep, maxRetries: 2 }).stream(req));
    expect(events).toEqual([err("overloaded", true)]);
    expect(inner.requests).toHaveLength(3);
  });

  it("never retries after content was streamed, nor non-retryable errors", async () => {
    const midStream = new ScriptedProvider([[{ type: "start", model: "m" }, { type: "text_delta", text: "par" }, err("network", true)], textScript("unused")]);
    const events = await collect(withRetry(midStream, noSleep).stream(req));
    expect(events.map((e) => e.type)).toEqual(["start", "text_delta", "error"]);
    expect(midStream.remaining).toBe(1);

    const auth = new ScriptedProvider([[err("auth", false)], textScript("unused")]);
    expect(await collect(withRetry(auth, noSleep).stream(req))).toEqual([err("auth", false)]);
    expect(auth.remaining).toBe(1);
  });

  it("aborts during the backoff sleep", async () => {
    const inner = new ScriptedProvider([[err("rate_limit", true)], textScript("unused")]);
    const controller = new AbortController();
    const p = withRetry(inner, { baseDelayMs: 10_000, jitter: false, onRetry: () => setTimeout(() => controller.abort(), 5) });
    const started = Date.now();
    const events = await collect(p.stream(req, controller.signal));
    expect(Date.now() - started).toBeLessThan(2000);
    expect(events).toEqual([{ type: "error", error: { message: "Request aborted", kind: "network", code: "aborted", retryable: false } }]);
  });

  it("abortableSleep resolves false on abort and true on timeout", async () => {
    expect(await abortableSleep(1)).toBe(true);
    const c = new AbortController();
    c.abort();
    expect(await abortableSleep(1000, c.signal)).toBe(false);
  });
});

describe("ScriptedProvider", () => {
  it("replays scripts in order, records deep copies of requests and supports function scripts", async () => {
    const p = new ScriptedProvider([toolCallScript([{ id: "c1", name: "order_test", args: { query: "cbc" } }]), (r) => textScript(`echo ${r.messages.length}`)]);
    const request: ChatRequest = { ...req, messages: [...req.messages] };
    const first = await collect(p.stream(request));
    expect(first.find((e) => e.type === "tool_call")).toEqual({ type: "tool_call", id: "c1", name: "order_test", args: { query: "cbc" }, index: 0 });
    request.messages.push({ role: "assistant", content: [{ type: "text", text: "x" }] });
    const second = await collect(p.stream(request));
    expect(second.filter((e) => e.type === "text_delta").map((e) => (e as { text: string }).text).join("")).toBe("echo 2");
    expect(p.requests[0]!.messages).toHaveLength(1);
    expect(p.requests[1]!.messages).toHaveLength(2);
    expect((await collect(p.stream(req)))[0]).toMatchObject({ type: "error", error: { kind: "bad_request" } });
  });

  it("stops on abort", async () => {
    const p = new ScriptedProvider([textScript("a long reply that streams slowly", { chunk: 2 })], { delayMs: 1 });
    const c = new AbortController();
    const events: StreamEvent[] = [];
    for await (const e of p.stream(req, c.signal)) {
      events.push(e);
      if (e.type === "text_delta") c.abort();
    }
    expect(events.at(-1)).toMatchObject({ type: "error", error: { code: "aborted" } });
  });
});
