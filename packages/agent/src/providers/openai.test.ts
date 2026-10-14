import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { withRetry } from "./factory.js";
import { buildOpenAIRequest, OpenAICompatibleProvider, toOpenAIMessages } from "./openai.js";
import type { ChatRequest, ProviderConfig, StreamEvent } from "./types.js";

interface Recorded {
  method: string;
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
      const rec: Recorded = { method: req.method ?? "", url: req.url ?? "", headers: req.headers, body: raw ? (JSON.parse(raw) as Record<string, unknown>) : {} };
      requests.push(rec);
      const handler = handlers.shift();
      if (!handler) {
        res.writeHead(500).end("no handler");
        return;
      }
      handler(rec, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
});

beforeEach(() => {
  handlers.length = 0;
  requests.length = 0;
});

function sse(chunks: unknown[], opts: { done?: boolean; split?: boolean } = {}): Handler {
  return (_req, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    const text = chunks.map((c) => `data: ${typeof c === "string" ? c : JSON.stringify(c)}\n\n`).join("") + (opts.done === false ? "" : "data: [DONE]\n\n");
    if (opts.split) {
      // dribble the bytes to exercise reassembly
      let i = 0;
      const tick = () => {
        if (i >= text.length) return res.end();
        res.write(text.slice(i, i + 7));
        i += 7;
        setImmediate(tick);
      };
      tick();
    } else {
      res.end(text);
    }
  };
}

function json(status: number, body: unknown): Handler {
  return (_req, res) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
}

const chunk = (delta: Record<string, unknown>, finish: string | null = null, extra: Record<string, unknown> = {}) => ({
  id: "chatcmpl-1",
  object: "chat.completion.chunk",
  model: "test-model",
  choices: [{ index: 0, delta, finish_reason: finish }],
  ...extra,
});

function config(over: Partial<ProviderConfig> = {}): ProviderConfig {
  return { id: "openai", wire: "openai-chat-completions", baseUrl, apiKey: "sk-test", model: "gpt-4.1", ...over };
}

const baseRequest = (over: Partial<ChatRequest> = {}): ChatRequest => ({
  model: "",
  system: [
    { id: "persona", text: "You are a patient.", cache: "stable" },
    { id: "facts", text: "Fact sheet.", cache: "dynamic" },
  ],
  messages: [{ role: "user", content: [{ type: "text", text: "What brings you in?" }] }],
  ...over,
});

async function collect(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

describe("OpenAICompatibleProvider (mock server)", () => {
  it("streams text and reasoning, reports usage and sends a well-formed request", async () => {
    handlers.push(
      sse(
        [
          chunk({ role: "assistant", reasoning_content: "thinking…" }),
          chunk({ content: "Chest " }),
          chunk({ content: "pain." }),
          chunk({}, "stop"),
          { id: "x", object: "chat.completion.chunk", choices: [], usage: { prompt_tokens: 120, completion_tokens: 7, prompt_tokens_details: { cached_tokens: 100 } } },
        ],
        { split: true },
      ),
    );
    const provider = new OpenAICompatibleProvider(config());
    const events = await collect(provider.stream(baseRequest({ temperature: 0.4, maxTokens: 300 })));
    expect(events.map((e) => e.type)).toEqual(["start", "reasoning_delta", "text_delta", "text_delta", "finish"]);
    expect(events.filter((e) => e.type === "text_delta").map((e) => (e as { text: string }).text).join("")).toBe("Chest pain.");
    expect(events.at(-1)).toEqual({ type: "finish", stopReason: "end_turn", usage: { inputTokens: 20, outputTokens: 7, cacheReadTokens: 100 } });

    const req = requests[0]!;
    expect(req.url).toBe("/v1/chat/completions");
    expect(req.headers.authorization).toBe("Bearer sk-test");
    expect(req.body).toMatchObject({ model: "gpt-4.1", stream: true, stream_options: { include_usage: true }, temperature: 0.4, max_tokens: 300 });
    const msgs = req.body.messages as { role: string; content: unknown }[];
    expect(msgs[0]).toEqual({ role: "system", content: "You are a patient.\n\nFact sheet." });
    expect(msgs.filter((m) => m.role === "system")).toHaveLength(1);
    expect(req.body).not.toHaveProperty("tool_choice");
  });

  it("assembles interleaved tool_calls by index (id/name only on the first fragment)", async () => {
    handlers.push(
      sse([
        chunk({ content: "Let me check." }),
        chunk({ tool_calls: [{ index: 0, id: "call_a", type: "function", function: { name: "order_test", arguments: "" } }] }),
        chunk({ tool_calls: [{ index: 1, id: "call_b", type: "function", function: { name: "examine", arguments: '{"qu' } }] }),
        chunk({ tool_calls: [{ index: 0, function: { arguments: '{"query":' } }] }),
        chunk({ tool_calls: [{ index: 1, function: { arguments: 'ery":"chest"}' } }, { index: 0, function: { arguments: '"cbc"}' } }] }),
        chunk({}, "tool_calls"),
        { choices: [], usage: { prompt_tokens: 50, completion_tokens: 20 } },
      ]),
    );
    const provider = new OpenAICompatibleProvider(config());
    const events = await collect(
      provider.stream(baseRequest({ tools: [{ name: "order_test", description: "Order", inputSchema: { type: "object", properties: { query: { type: "string" } } } }] })),
    );
    const calls = events.filter((e): e is Extract<StreamEvent, { type: "tool_call" }> => e.type === "tool_call");
    expect(calls).toEqual([
      { type: "tool_call", id: "call_a", name: "order_test", args: { query: "cbc" }, index: 0 },
      { type: "tool_call", id: "call_b", name: "examine", args: { query: "chest" }, index: 1 },
    ]);
    const starts = events.filter((e) => e.type === "tool_call_start");
    expect(starts).toEqual([
      { type: "tool_call_start", id: "call_a", name: "order_test", index: 0 },
      { type: "tool_call_start", id: "call_b", name: "examine", index: 1 },
    ]);
    const deltas0 = events.filter((e) => e.type === "tool_call_delta" && e.index === 0).map((e) => (e as { argsDelta: string }).argsDelta);
    expect(deltas0.join("")).toBe('{"query":"cbc"}');
    expect(events.at(-1)).toMatchObject({ type: "finish", stopReason: "tool_use", usage: { inputTokens: 50, outputTokens: 20 } });
    expect(requests[0]!.body.tools).toEqual([
      { type: "function", function: { name: "order_test", description: "Order", parameters: { type: "object", properties: { query: { type: "string" } } } } },
    ]);
  });

  it("emits invalid JSON arguments as {__invalid_json} and flushes calls when the stream ends", async () => {
    handlers.push(sse([chunk({ tool_calls: [{ index: 0, id: "c1", function: { name: "examine", arguments: '{"query": "abd' } }] }), chunk({}, "stop")]));
    const events = await collect(new OpenAICompatibleProvider(config()).stream(baseRequest()));
    const call = events.find((e) => e.type === "tool_call");
    expect(call).toEqual({ type: "tool_call", id: "c1", name: "examine", args: { __invalid_json: '{"query": "abd' }, index: 0 });
    // finish_reason "stop" with tool calls is still a tool_use turn
    expect(events.at(-1)).toMatchObject({ type: "finish", stopReason: "tool_use" });
  });

  it("maps finish reasons length/content_filter", async () => {
    handlers.push(sse([chunk({ content: "abc" }, "length")]), sse([chunk({ content: "" }, "content_filter")]));
    const p = new OpenAICompatibleProvider(config());
    expect((await collect(p.stream(baseRequest()))).at(-1)).toMatchObject({ type: "finish", stopReason: "max_tokens" });
    expect((await collect(p.stream(baseRequest()))).at(-1)).toMatchObject({ type: "finish", stopReason: "refusal" });
  });

  it("classifies HTTP error bodies and retries Zhipu 1302 through withRetry", async () => {
    handlers.push(json(429, { error: { code: "1302", message: "您当前使用该API的并发数过高" } }), sse([chunk({ content: "ok" }, "stop")]));
    const retries: { attempt: number; delay: number; kind: string }[] = [];
    const provider = withRetry(new OpenAICompatibleProvider(config({ id: "zhipu", model: "glm-4.6" })), {
      baseDelayMs: 5,
      jitter: false,
      onRetry: (attempt, delay, error) => retries.push({ attempt, delay, kind: error.kind }),
    });
    const events = await collect(provider.stream(baseRequest()));
    expect(retries).toEqual([{ attempt: 1, delay: 5, kind: "rate_limit" }]);
    expect(events.map((e) => e.type)).toEqual(["start", "text_delta", "finish"]);
    expect(requests).toHaveLength(2);
  });

  it("does not retry auth errors and surfaces them as error events", async () => {
    handlers.push(json(401, { error: { message: "Incorrect API key provided", type: "invalid_request_error", code: "invalid_api_key" } }));
    const retries: number[] = [];
    const provider = withRetry(new OpenAICompatibleProvider(config()), { baseDelayMs: 1, onRetry: (a) => retries.push(a) });
    const events = await collect(provider.stream(baseRequest()));
    expect(events).toEqual([
      { type: "error", error: { message: "Incorrect API key provided", kind: "auth", retryable: false, status: 401, code: "invalid_api_key" } },
    ]);
    expect(retries).toEqual([]);
  });

  it("reports an error chunk inside the stream and a truncated stream", async () => {
    handlers.push(sse([chunk({ content: "partial" }), { error: { code: "1234", message: "网络错误" } }]), sse([chunk({ content: "cut" })], { done: false }));
    const p = new OpenAICompatibleProvider(config());
    expect((await collect(p.stream(baseRequest()))).at(-1)).toMatchObject({ type: "error", error: { kind: "network", retryable: true, code: "1234" } });
    expect((await collect(p.stream(baseRequest()))).at(-1)).toMatchObject({ type: "error", error: { kind: "network", message: expect.stringMatching(/ended/) } });
  });

  it("network failures become retryable error events (never throws)", async () => {
    const p = new OpenAICompatibleProvider(config({ baseUrl: "http://127.0.0.1:1/v1" }));
    const events = await collect(p.stream(baseRequest()));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error", error: { kind: "network", retryable: true } });
  });

  it("honours abort mid-stream", async () => {
    handlers.push((_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(`data: ${JSON.stringify(chunk({ content: "hello" }))}\n\n`);
      // never ends
    });
    const controller = new AbortController();
    const events: StreamEvent[] = [];
    for await (const e of new OpenAICompatibleProvider(config()).stream(baseRequest(), controller.signal)) {
      events.push(e);
      if (e.type === "text_delta") controller.abort();
    }
    expect(events.at(-1)).toMatchObject({ type: "error", error: { code: "aborted", retryable: false } });
  });

  it("omits Authorization for no-key local servers", async () => {
    handlers.push(sse([chunk({ content: "hi" }, "stop")]));
    await collect(new OpenAICompatibleProvider(config({ id: "ollama", apiKey: undefined, model: "qwen3" })).stream(baseRequest()));
    expect(requests[0]!.headers.authorization).toBeUndefined();
  });
});

describe("buildOpenAIRequest", () => {
  it("OpenAI reasoning models use reasoning_effort + max_completion_tokens and no temperature", () => {
    const body = buildOpenAIRequest({ id: "openai", model: "gpt-5" }, baseRequest({ effort: "xhigh", maxTokens: 2000, temperature: 0.7 }));
    expect(body).toMatchObject({ model: "gpt-5", reasoning_effort: "high", max_completion_tokens: 2000 });
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("max_tokens");
  });

  it("GLM: thinking by effort, tool_stream for glm-4.6+/glm-5 with tools", () => {
    const tools = [{ name: "t", description: "d", inputSchema: { type: "object" } }];
    expect(buildOpenAIRequest({ id: "zhipu", model: "glm-4.6" }, baseRequest({ effort: "high", tools }))).toMatchObject({ thinking: { type: "enabled" }, tool_stream: true });
    expect(buildOpenAIRequest({ id: "zhipu", model: "glm-5" }, baseRequest({ effort: "low", tools }))).toMatchObject({ thinking: { type: "disabled" }, tool_stream: true });
    const old = buildOpenAIRequest({ id: "zhipu", model: "glm-4.5-air" }, baseRequest({ tools, temperature: 0.5 }));
    expect(old).toMatchObject({ thinking: { type: "disabled" }, temperature: 0.5 });
    expect(old).not.toHaveProperty("tool_stream");
  });

  it("responseFormat → json_schema (OpenAI) or json_object + instruction (Zhipu)", () => {
    const responseFormat = { name: "patient voice", schema: { type: "object", properties: { say: { type: "string" } }, required: ["say"], additionalProperties: false } };
    const oa = buildOpenAIRequest({ id: "openai", model: "gpt-5" }, baseRequest({ responseFormat }));
    expect(oa.response_format).toEqual({ type: "json_schema", json_schema: { name: "patient_voice", schema: responseFormat.schema, strict: true } });
    const zp = buildOpenAIRequest({ id: "zhipu", model: "glm-4.6" }, baseRequest({ responseFormat }));
    expect(zp.response_format).toEqual({ type: "json_object" });
    expect((zp.messages as { content: string }[])[0]!.content).toMatch(/JSON Schema/);
    const other = buildOpenAIRequest({ id: "openrouter", model: "z-ai/glm-5.3" }, baseRequest({ responseFormat }));
    expect(other).not.toHaveProperty("response_format");
    expect((other.messages as { content: string }[])[0]!.content).toMatch(/only one JSON object/i);
  });

  it("converts history: tool calls as JSON strings, results as role tool, images as data URLs", () => {
    const msgs = toOpenAIMessages(
      [{ id: "s", text: "sys", cache: "stable" }],
      [
        { role: "user", content: [{ type: "text", text: "Order a CBC" }] },
        {
          role: "assistant",
          content: [
            { type: "text", text: "Ordering." },
            { type: "tool_call", id: "c1", name: "order_test", args: { query: "cbc" } },
            { type: "tool_call", id: "c2", name: "examine", args: { __invalid_json: '{"q' } },
            { type: "provider_raw", provider: "anthropic-messages", data: [{ type: "thinking" }] },
          ],
        },
        {
          role: "user",
          content: [
            { type: "tool_result", callId: "c1", content: "CBC ordered" },
            { type: "tool_result", callId: "c2", content: "bad args", isError: true },
            { type: "text", text: "And this image?" },
            { type: "image", mediaType: "image/png", data: "AAAA" },
          ],
        },
      ],
    );
    expect(msgs).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "Order a CBC" },
      {
        role: "assistant",
        content: "Ordering.",
        tool_calls: [
          { id: "c1", type: "function", function: { name: "order_test", arguments: '{"query":"cbc"}' } },
          { id: "c2", type: "function", function: { name: "examine", arguments: '{"q' } },
        ],
      },
      { role: "tool", tool_call_id: "c1", content: "CBC ordered" },
      { role: "tool", tool_call_id: "c2", content: "[error] bad args" },
      {
        role: "user",
        content: [
          { type: "text", text: "And this image?" },
          { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
        ],
      },
    ]);
  });
});
