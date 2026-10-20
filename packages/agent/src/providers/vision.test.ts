/**
 * Camera frames for vision models (embodied `get_camera_frame`): the
 * catalogue's `vision` capability, and the request bodies the providers send
 * for a tool result carrying images — Anthropic: image blocks inside the
 * tool_result; OpenAI-compatible: the tool message (text) plus a follow-up
 * user message with image_url parts. Checked on mock servers.
 */
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AnthropicProvider } from "./anthropic.js";
import { capabilitiesFor } from "./catalog.js";
import { OpenAICompatibleProvider } from "./openai.js";
import type { ChatRequest, StreamEvent } from "./types.js";

let server: Server;
let baseUrl = "";
const bodies: Record<string, unknown>[] = [];
const replies: ((res: ServerResponse) => void)[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (c: string) => (raw += c));
    req.on("end", () => {
      bodies.push(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      (replies.shift() ?? ((r) => r.writeHead(500).end("no reply")))(res);
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
  bodies.length = 0;
  replies.length = 0;
});

const PNG = "iVBORw0KGgoAAAANSUhEUg==";

/** A conversation whose last user turn returns a camera frame. */
const request = (): ChatRequest => ({
  model: "",
  system: [{ id: "persona", text: "You are the clinician.", cache: "stable" }],
  messages: [
    { role: "user", content: [{ type: "text", text: "What do you see?" }] },
    { role: "assistant", content: [{ type: "tool_call", id: "call_1", name: "get_camera_frame", args: {} }] },
    { role: "user", content: [{ type: "tool_result", callId: "call_1", content: "Camera frame 64×48 at 09:12.", images: [{ mediaType: "image/png", data: PNG }] }] },
  ],
  tools: [{ name: "get_camera_frame", description: "A camera frame", inputSchema: { type: "object", properties: {} } }],
});

async function drain(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

describe("vision capability (model catalogue)", () => {
  it("follows image support unless a rule says otherwise", () => {
    expect(capabilitiesFor("anthropic", "claude-opus-5-5").vision).toBe(true);
    expect(capabilitiesFor("openai", "gpt-4.1").vision).toBe(true);
    expect(capabilitiesFor("deepseek", "deepseek-chat").vision).toBe(false);
    expect(capabilitiesFor("xai", "grok-3-mini").vision).toBe(false);
    expect(capabilitiesFor("offline", "anything").vision).toBe(false);
    expect(capabilitiesFor("openai", "gpt-4.1", [{ match: "^gpt-4\\.1", capabilities: { supportsImages: true, vision: false } }]).vision).toBe(false);
  });
});

describe("tool results with images on the wire", () => {
  it("Anthropic Messages: image blocks inside the tool_result, after its text", async () => {
    replies.push((res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const events = [
        { type: "message_start", message: { id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } },
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "A corridor." } },
        { type: "content_block_stop", index: 0 },
        { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 3 } },
        { type: "message_stop" },
      ];
      res.end(events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(""));
    });
    const provider = new AnthropicProvider({ id: "anthropic", wire: "anthropic-messages", baseUrl, apiKey: "test-key", model: "claude-opus-5-5", timeoutMs: 10_000 });
    const events = await drain(provider.stream(request()));
    expect(events.some((e) => e.type === "finish")).toBe(true);
    const messages = bodies[0]!.messages as { role: string; content: unknown }[];
    const last = messages.at(-1)!;
    expect(last.role).toBe("user");
    expect(last.content).toEqual([
      {
        type: "tool_result",
        tool_use_id: "call_1",
        content: [
          { type: "text", text: "Camera frame 64×48 at 09:12." },
          { type: "image", source: { type: "base64", media_type: "image/png", data: PNG } },
        ],
      },
    ]);
  });

  it("OpenAI-compatible: the tool message keeps the text; a user message follows with image_url parts", async () => {
    replies.push((res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const chunk = (delta: Record<string, unknown>, finish: string | null = null) => ({ id: "c", object: "chat.completion.chunk", model: "gpt-4.1", choices: [{ index: 0, delta, finish_reason: finish }] });
      res.end([chunk({ role: "assistant", content: "A corridor." }), chunk({}, "stop")].map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n");
    });
    const provider = new OpenAICompatibleProvider({ id: "openai", wire: "openai-chat-completions", baseUrl: `${baseUrl}/v1`, apiKey: "sk-test", model: "gpt-4.1" });
    await drain(provider.stream(request()));
    const messages = bodies[0]!.messages as { role: string; content: unknown; tool_call_id?: string }[];
    const tool = messages.findIndex((m) => m.role === "tool");
    expect(messages[tool]).toMatchObject({ role: "tool", tool_call_id: "call_1", content: "Camera frame 64×48 at 09:12." });
    expect(messages[tool + 1]).toEqual({
      role: "user",
      content: [
        { type: "text", text: "Image(s) returned by tool call call_1:" },
        { type: "image_url", image_url: { url: `data:image/png;base64,${PNG}` } },
      ],
    });
  });
});
