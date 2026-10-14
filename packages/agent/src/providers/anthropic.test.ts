import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { AnthropicProvider, buildAnthropicRequest, isFirstPartyAnthropic, mapAnthropicError, sanitizeEchoBlocks, SERVER_SIDE_FALLBACK_BETA, toAnthropicMessages } from "./anthropic.js";
import { withRetry } from "./factory.js";
import type { ChatMessage, ChatRequest, ProviderConfig, StreamEvent } from "./types.js";

interface Recorded {
  url: string;
  headers: IncomingMessage["headers"];
  body: Record<string, unknown>;
}
type Handler = (req: Recorded, res: ServerResponse) => void;

let server: Server;
let baseUrl = "";
const handlers: Handler[] = [];
const requests: Recorded[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (c: string) => (raw += c));
    req.on("end", () => {
      const rec: Recorded = { url: req.url ?? "", headers: req.headers, body: raw ? (JSON.parse(raw) as Record<string, unknown>) : {} };
      requests.push(rec);
      const handler = handlers.shift();
      if (!handler) {
        res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ type: "error", error: { type: "api_error", message: "no handler" } }));
        return;
      }
      handler(rec, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
});

beforeEach(() => {
  handlers.length = 0;
  requests.length = 0;
});

type Ev = { event: string; data: Record<string, unknown> };

const messageStart = (model = "claude-opus-5-5", usage: Record<string, number> = { input_tokens: 10, output_tokens: 1 }): Ev => ({
  event: "message_start",
  data: {
    type: "message_start",
    message: { id: "msg_1", type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage },
  },
});
const blockStart = (index: number, block: Record<string, unknown>): Ev => ({ event: "content_block_start", data: { type: "content_block_start", index, content_block: block } });
const delta = (index: number, d: Record<string, unknown>): Ev => ({ event: "content_block_delta", data: { type: "content_block_delta", index, delta: d } });
const blockStop = (index: number): Ev => ({ event: "content_block_stop", data: { type: "content_block_stop", index } });
const messageDelta = (stop: string, output = 20): Ev => ({
  event: "message_delta",
  data: { type: "message_delta", delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: output } },
});
const messageStop: Ev = { event: "message_stop", data: { type: "message_stop" } };

function sse(events: Ev[], opts: { hang?: boolean } = {}): Handler {
  return (_req, res) => {
    res.writeHead(200, { "content-type": "text/event-stream", "request-id": "req_test" });
    for (const e of events) res.write(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
    if (!opts.hang) res.end();
  };
}

function errorResponse(status: number, type: string, message: string): Handler {
  return (_req, res) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ type: "error", error: { type, message } }));
  };
}

function config(over: Partial<ProviderConfig> = {}): ProviderConfig {
  return { id: "anthropic", wire: "anthropic-messages", baseUrl, apiKey: "test-key", model: "claude-opus-5-5", timeoutMs: 10_000, ...over };
}

const tools = [{ name: "order_test", description: "Order an investigation", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } }];

const request = (over: Partial<ChatRequest> = {}): ChatRequest => ({
  model: "",
  system: [
    { id: "persona", text: "You are the attending.", cache: "stable" },
    { id: "facts", text: "Case summary.", cache: "stable" },
    { id: "turn", text: "Clock: 12 min.", cache: "dynamic" },
  ],
  messages: [{ role: "user", content: [{ type: "text", text: "Order a CBC please." }] }],
  tools,
  effort: "low",
  temperature: 0.3,
  ...over,
});

async function collect(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

const toolTurn: Ev[] = [
  messageStart("claude-opus-5-5", { input_tokens: 10, output_tokens: 1, cache_read_input_tokens: 500, cache_creation_input_tokens: 40 }),
  blockStart(0, { type: "thinking", thinking: "", signature: "" }),
  delta(0, { type: "thinking_delta", thinking: "Need a CBC." }),
  delta(0, { type: "signature_delta", signature: "sig-abc" }),
  blockStop(0),
  blockStart(1, { type: "text", text: "" }),
  delta(1, { type: "text_delta", text: "Ordering " }),
  delta(1, { type: "text_delta", text: "a CBC." }),
  blockStop(1),
  blockStart(2, { type: "tool_use", id: "toolu_1", name: "order_test", input: {} }),
  delta(2, { type: "input_json_delta", partial_json: '{"query":' }),
  delta(2, { type: "input_json_delta", partial_json: '"cbc"}' }),
  blockStop(2),
  messageDelta("tool_use", 33),
  messageStop,
];

describe("AnthropicProvider (mock Messages API)", () => {
  it("maps the stream, emits validated tool calls and returns raw content + usage", async () => {
    handlers.push(sse(toolTurn));
    const events = await collect(new AnthropicProvider(config()).stream(request()));
    expect(events.map((e) => e.type)).toEqual([
      "start",
      "reasoning_delta",
      "text_delta",
      "text_delta",
      "tool_call_start",
      "tool_call_delta",
      "tool_call_delta",
      "tool_call",
      "finish",
    ]);
    expect(events[0]).toEqual({ type: "start", model: "claude-opus-5-5" });
    expect(events.find((e) => e.type === "tool_call_start")).toEqual({ type: "tool_call_start", id: "toolu_1", name: "order_test", index: 0 });
    expect(events.find((e) => e.type === "tool_call")).toEqual({ type: "tool_call", id: "toolu_1", name: "order_test", args: { query: "cbc" }, index: 0 });
    const finish = events.at(-1) as Extract<StreamEvent, { type: "finish" }>;
    expect(finish.stopReason).toBe("tool_use");
    expect(finish.usage).toEqual({ inputTokens: 10, outputTokens: 33, cacheReadTokens: 500, cacheWriteTokens: 40 });
    expect(finish.raw).toEqual([
      { type: "thinking", thinking: "Need a CBC.", signature: "sig-abc" },
      { type: "text", text: "Ordering a CBC." },
      { type: "tool_use", id: "toolu_1", name: "order_test", input: { query: "cbc" } },
    ]);
  });

  it("sends the request per PROTOCOL §5 (no thinking, no tool_choice, eager streaming, cache breakpoint, effort, no fallbacks on third-party base URL)", async () => {
    handlers.push(sse(toolTurn));
    await collect(new AnthropicProvider(config()).stream(request()));
    const req = requests[0]!;
    expect(req.url).toBe("/v1/messages?beta=true");
    expect(req.headers["x-api-key"]).toBe("test-key");
    expect(req.headers["anthropic-beta"]).toBeUndefined();
    const body = req.body;
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.stream).toBe(true);
    expect(body.max_tokens).toBe(16_000);
    expect(body).not.toHaveProperty("thinking");
    expect(body).not.toHaveProperty("tool_choice");
    expect(body).not.toHaveProperty("temperature"); // Opus 5.5 rejects sampling params
    expect(body).not.toHaveProperty("fallbacks");
    expect(body).not.toHaveProperty("betas");
    expect(body).not.toHaveProperty("cache_control");
    expect(body.output_config).toEqual({ effort: "low" });
    expect(body.tools).toEqual([{ name: "order_test", description: "Order an investigation", input_schema: tools[0]!.inputSchema, eager_input_streaming: true }]);
    expect(body.system).toEqual([
      { type: "text", text: "You are the attending." },
      { type: "text", text: "Case summary.", cache_control: { type: "ephemeral" } },
      { type: "text", text: "Clock: 12 min." },
    ]);
  });

  it("keeps temperature (scaled) for models that accept sampling", async () => {
    handlers.push(sse([messageStart("kimi-k2.6"), blockStart(0, { type: "text", text: "" }), delta(0, { type: "text_delta", text: "hi" }), blockStop(0), messageDelta("end_turn"), messageStop]));
    const p = new AnthropicProvider(config({ id: "moonshot-anthropic", model: "kimi-k2.6" }));
    const events = await collect(p.stream(request({ tools: undefined })));
    expect(events.at(-1)).toMatchObject({ type: "finish", stopReason: "end_turn" });
    expect(requests[0]!.body.temperature).toBeCloseTo(0.18);
    expect(requests[0]!.body).not.toHaveProperty("output_config"); // kimi has no Anthropic effort
    expect(requests[0]!.body).not.toHaveProperty("tools");
  });

  it("echoes provider_raw verbatim and batches tool results into one user message", async () => {
    handlers.push(sse([messageStart(), blockStart(0, { type: "text", text: "" }), delta(0, { type: "text_delta", text: "CBC is normal." }), blockStop(0), messageDelta("end_turn"), messageStop]));
    const raw = [
      { type: "thinking", thinking: "", signature: "sig-1" },
      { type: "text", text: "Ordering both." },
      { type: "tool_use", id: "toolu_a", name: "order_test", input: { query: "cbc" } },
      { type: "tool_use", id: "toolu_b", name: "order_test", input: { query: "bmp" } },
    ];
    const history: ChatMessage[] = [
      { role: "user", content: [{ type: "text", text: "Order labs." }] },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Ordering both." },
          { type: "tool_call", id: "toolu_a", name: "order_test", args: { query: "cbc" } },
          { type: "tool_call", id: "toolu_b", name: "order_test", args: { query: "bmp" } },
          { type: "provider_raw", provider: "anthropic-messages", data: raw },
        ],
      },
      { role: "user", content: [{ type: "tool_result", callId: "toolu_a", content: "CBC ordered" }] },
      { role: "user", content: [{ type: "tool_result", callId: "toolu_b", content: "rejected", isError: true }] },
    ];
    await collect(new AnthropicProvider(config()).stream(request({ messages: history })));
    const messages = requests[0]!.body.messages as { role: string; content: unknown[] }[];
    expect(messages).toHaveLength(3);
    expect(messages[1]).toEqual({ role: "assistant", content: raw });
    expect(messages[2]).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "toolu_a", content: "CBC ordered" },
        { type: "tool_result", tool_use_id: "toolu_b", content: "rejected", is_error: true },
      ],
    });
  });

  it("drops pre-fallback model-internal blocks and only emits post-boundary tool calls", async () => {
    handlers.push(
      sse([
        messageStart("claude-opus-5-5"),
        blockStart(0, { type: "text", text: "" }),
        delta(0, { type: "text_delta", text: "Partial " }),
        blockStop(0),
        blockStart(1, { type: "tool_use", id: "toolu_pre", name: "order_test", input: {} }),
        blockStop(1),
        blockStart(2, { type: "fallback", from: { model: "claude-opus-5-5" }, to: { model: "claude-opus-5" }, trigger: { type: "refusal" } }),
        blockStop(2),
        blockStart(3, { type: "tool_use", id: "toolu_post", name: "order_test", input: {} }),
        delta(3, { type: "input_json_delta", partial_json: '{"query":"ecg"}' }),
        blockStop(3),
        messageDelta("tool_use"),
        messageStop,
      ]),
    );
    const events = await collect(new AnthropicProvider(config()).stream(request()));
    const calls = events.filter((e) => e.type === "tool_call");
    expect(calls).toEqual([{ type: "tool_call", id: "toolu_post", name: "order_test", args: { query: "ecg" }, index: 1 }]);
    const raw = (events.at(-1) as Extract<StreamEvent, { type: "finish" }>).raw as Record<string, unknown>[];
    expect(raw.map((b) => b.type)).toEqual(["text", "tool_use", "fallback", "tool_use"]);
    // Echo rule: pre-boundary tool_use/thinking are dropped, text and post-boundary blocks kept.
    expect(sanitizeEchoBlocks(raw).map((b) => `${b.type}:${(b as { id?: string }).id ?? ""}`)).toEqual(["text:", "fallback:", "tool_use:toolu_post"]);
  });

  it("refusal: finish only, no tool calls, tool_use stripped from raw", async () => {
    handlers.push(
      sse([
        messageStart(),
        blockStart(0, { type: "tool_use", id: "toolu_x", name: "order_test", input: {} }),
        delta(0, { type: "input_json_delta", partial_json: '{"que' }),
        blockStop(0),
        messageDelta("refusal"),
        messageStop,
      ]),
    );
    const events = await collect(new AnthropicProvider(config()).stream(request()));
    expect(events.some((e) => e.type === "tool_call" || e.type === "error")).toBe(false);
    expect(events.at(-1)).toMatchObject({ type: "finish", stopReason: "refusal", raw: [] });
  });

  it("maps typed SDK errors: 429 retryable, 401 auth, 400 context, 529 overloaded, mid-stream error", async () => {
    const p = new AnthropicProvider(config());
    handlers.push(errorResponse(429, "rate_limit_error", "Number of request tokens has exceeded your per-minute rate limit"));
    expect(await collect(p.stream(request()))).toEqual([
      { type: "error", error: expect.objectContaining({ kind: "rate_limit", retryable: true, status: 429, code: "rate_limit_error" }) },
    ]);
    handlers.push(errorResponse(401, "authentication_error", "invalid x-api-key"));
    expect((await collect(p.stream(request())))[0]).toMatchObject({ type: "error", error: { kind: "auth", retryable: false, message: "invalid x-api-key" } });
    handlers.push(errorResponse(400, "invalid_request_error", "prompt is too long: 1200000 tokens > 1000000 maximum"));
    expect((await collect(p.stream(request())))[0]).toMatchObject({ type: "error", error: { kind: "context_exceeded", retryable: false } });
    handlers.push(errorResponse(529, "overloaded_error", "Overloaded"));
    expect((await collect(p.stream(request())))[0]).toMatchObject({ type: "error", error: { kind: "overloaded", retryable: true } });
    handlers.push((_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(`event: message_start\ndata: ${JSON.stringify(messageStart().data)}\n\n`);
      res.end(`event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } })}\n\n`);
    });
    const mid = await collect(p.stream(request()));
    expect(mid.at(-1)).toMatchObject({ type: "error", error: { kind: "overloaded", retryable: true } });
  });

  it("withRetry retries a 429 before any content and then succeeds", async () => {
    handlers.push(errorResponse(429, "rate_limit_error", "slow down"), sse([messageStart(), blockStart(0, { type: "text", text: "" }), delta(0, { type: "text_delta", text: "ok" }), blockStop(0), messageDelta("end_turn"), messageStop]));
    const attempts: number[] = [];
    const p = withRetry(new AnthropicProvider(config()), { baseDelayMs: 1, jitter: false, onRetry: (a) => attempts.push(a) });
    const events = await collect(p.stream(request()));
    expect(attempts).toEqual([1]);
    expect(events.map((e) => e.type)).toEqual(["start", "text_delta", "finish"]);
  });

  it("honours abort mid-stream", async () => {
    handlers.push(sse([messageStart(), blockStart(0, { type: "text", text: "" }), delta(0, { type: "text_delta", text: "Hel" })], { hang: true }));
    const controller = new AbortController();
    const events: StreamEvent[] = [];
    for await (const e of new AnthropicProvider(config()).stream(request(), controller.signal)) {
      events.push(e);
      if (e.type === "text_delta") controller.abort();
    }
    expect(events.at(-1)).toMatchObject({ type: "error", error: { code: "aborted", retryable: false } });
  });
});

describe("mapAnthropicError", () => {
  it("maps client-side SDK errors without retrying configuration problems", () => {
    expect(mapAnthropicError(new Anthropic.AnthropicError("Could not resolve authentication method. Expected either apiKey or authToken to be set."))).toMatchObject({
      kind: "auth",
      retryable: false,
    });
    expect(mapAnthropicError(new Anthropic.AnthropicError("Unable to parse tool parameter JSON from model."))).toMatchObject({ code: "invalid_tool_json", retryable: true });
    expect(mapAnthropicError(new Anthropic.APIConnectionTimeoutError())).toMatchObject({ kind: "timeout", retryable: true });
    expect(mapAnthropicError(new Anthropic.APIConnectionError({ message: "Connection error.", cause: new Error("ECONNREFUSED") }))).toMatchObject({ kind: "network", retryable: true });
    expect(mapAnthropicError(new Error("boom"))).toMatchObject({ kind: "unknown", retryable: false });
    const aborted = new AbortController();
    aborted.abort();
    expect(mapAnthropicError(new Error("x"), aborted.signal)).toMatchObject({ code: "aborted" });
  });

  it("yields an auth error (never throws) when no credentials can be resolved", async () => {
    const p = new AnthropicProvider({ id: "anthropic", wire: "anthropic-messages", baseUrl, model: "claude-opus-5-5" }, {});
    const saved = { key: process.env.ANTHROPIC_API_KEY, token: process.env.ANTHROPIC_AUTH_TOKEN };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    try {
      handlers.push(errorResponse(401, "authentication_error", "x-api-key header is required"));
      const events = await collect(p.stream(request()));
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ type: "error", error: { kind: "auth", retryable: false } });
    } finally {
      if (saved.key !== undefined) process.env.ANTHROPIC_API_KEY = saved.key;
      if (saved.token !== undefined) process.env.ANTHROPIC_AUTH_TOKEN = saved.token;
    }
  });
});

describe("buildAnthropicRequest", () => {
  const firstParty = { id: "anthropic", baseUrl: "https://api.anthropic.com", model: "claude-opus-5-5" };

  it("adds server-side fallbacks + beta for claude-opus-5-5 on the first-party API", () => {
    const params = buildAnthropicRequest(firstParty, request());
    expect(params.betas).toEqual([SERVER_SIDE_FALLBACK_BETA]);
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.fallbacks).toBe("default");
    expect(params.cache_control).toEqual({ type: "ephemeral" });
    expect(params).not.toHaveProperty("thinking");
    expect(params).not.toHaveProperty("tool_choice");
    for (const model of ["claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]) {
      expect(buildAnthropicRequest({ ...firstParty, model }, request()).fallbacks).toBe("default");
    }
    expect(buildAnthropicRequest({ id: "anthropic", model: "claude-opus-5-5" }, request()).fallbacks).toBe("default"); // unset base URL = first party
  });

  it("omits fallbacks for other models and third-party endpoints", () => {
    expect(buildAnthropicRequest({ ...firstParty, model: "claude-haiku-5-5" }, request())).not.toHaveProperty("fallbacks");
    const third = buildAnthropicRequest({ id: "zhipu-anthropic", baseUrl: "https://open.bigmodel.cn/api/anthropic", model: "claude-opus-5-5" }, request());
    expect(third).not.toHaveProperty("fallbacks");
    expect(third).not.toHaveProperty("betas");
    expect(isFirstPartyAnthropic("https://api.anthropic.com/")).toBe(true);
    expect(isFirstPartyAnthropic("https://api.anthropic.com/v1")).toBe(true);
    expect(isFirstPartyAnthropic("http://127.0.0.1:9999")).toBe(false);
  });

  it("caps max_tokens and honours responseFormat", () => {
    expect(buildAnthropicRequest(firstParty, request({ maxTokens: 200_000 })).max_tokens).toBe(64_000);
    expect(buildAnthropicRequest(firstParty, request({ maxTokens: 512 })).max_tokens).toBe(512);
    const schema = { type: "object", properties: { say: { type: "string" } }, required: ["say"], additionalProperties: false };
    const params = buildAnthropicRequest(firstParty, request({ responseFormat: { name: "voice", schema } }));
    expect(params.output_config).toEqual({ effort: "low", format: { type: "json_schema", schema } });
    const third = buildAnthropicRequest({ id: "zhipu-anthropic", baseUrl: "https://open.bigmodel.cn/api/anthropic", model: "glm-4.6" }, request({ responseFormat: { name: "voice", schema } }));
    expect(third).not.toHaveProperty("output_config");
    expect(JSON.stringify(third.system)).toMatch(/JSON Schema/);
  });
});

describe("toAnthropicMessages", () => {
  it("builds blocks from parts, images as base64, tool results first, leading assistant guarded", () => {
    const out = toAnthropicMessages([
      { role: "assistant", content: [{ type: "text", text: "Hello, I'm Mr Li." }] },
      {
        role: "user",
        content: [
          { type: "text", text: "Look at this ECG" },
          { type: "image", mediaType: "image/png", data: "iVBOR" },
        ],
      },
      { role: "assistant", content: [{ type: "tool_call", id: "t1", name: "read_result", args: "not-an-object" }] },
      { role: "user", content: [{ type: "text", text: "and?" }, { type: "tool_result", callId: "t1", content: "" }] },
    ]);
    expect(out).toEqual([
      { role: "user", content: [{ type: "text", text: "(conversation start)" }] },
      { role: "assistant", content: [{ type: "text", text: "Hello, I'm Mr Li." }] },
      {
        role: "user",
        content: [
          { type: "text", text: "Look at this ECG" },
          { type: "image", source: { type: "base64", media_type: "image/png", data: "iVBOR" } },
        ],
      },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "read_result", input: {} }] },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "t1", content: "(no output)" },
          { type: "text", text: "and?" },
        ],
      },
    ]);
  });
});
