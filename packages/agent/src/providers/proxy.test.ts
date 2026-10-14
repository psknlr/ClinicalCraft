import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ProxyProvider } from "./proxy.js";
import type { ChatRequest, StreamEvent } from "./types.js";

let server: Server;
let url = "";
const handlers: ((req: { headers: IncomingMessage["headers"]; body: Record<string, unknown> }, res: ServerResponse) => void)[] = [];
const seen: { headers: IncomingMessage["headers"]; body: Record<string, unknown> }[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c: Buffer) => (raw += c.toString("utf8")));
    req.on("end", () => {
      const rec = { headers: req.headers, body: JSON.parse(raw || "{}") as Record<string, unknown> };
      seen.push(rec);
      (handlers.shift() ?? ((_r, s) => s.writeHead(500).end()))(rec, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/llm/stream`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
});
beforeEach(() => {
  handlers.length = 0;
  seen.length = 0;
});

const request: ChatRequest = { model: "", system: [{ id: "s", text: "sys", cache: "stable" }], messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }] };

async function collect(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of stream) out.push(e);
  return out;
}

describe("ProxyProvider", () => {
  it("posts {provider, model, request} and relays StreamEvents until `event: done`", async () => {
    const events: StreamEvent[] = [
      { type: "start", model: "glm-4.6" },
      { type: "text_delta", text: "你好" },
      { type: "finish", stopReason: "end_turn", usage: { inputTokens: 3, outputTokens: 2 } },
    ];
    handlers.push((_r, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "event: done\ndata: {}\n\n" + `data: ${JSON.stringify({ type: "text_delta", text: "late" })}\n\n`);
    });
    const p = new ProxyProvider({ id: "proxy", wire: "proxy", model: "glm-4.6", proxyUrl: url, proxyProvider: "zhipu", apiKey: "server-token" });
    expect(await collect(p.stream(request))).toEqual(events);
    expect(seen[0]!.body).toEqual({ provider: "zhipu", model: "glm-4.6", request: { ...request, model: "glm-4.6" } });
    expect(seen[0]!.headers.authorization).toBe("Bearer server-token");
    expect(p.capabilities().reasoning).toBe("glm-thinking");
  });

  it("maps HTTP errors, truncated streams and network failures to error events", async () => {
    handlers.push((_r, res) => res.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: "missing token" } })));
    handlers.push((_r, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(`data: ${JSON.stringify({ type: "text_delta", text: "cut" })}\n\n`);
    });
    const p = new ProxyProvider({ id: "proxy", wire: "proxy", model: "m", proxyUrl: url });
    expect(await collect(p.stream(request))).toEqual([{ type: "error", error: { message: "missing token", kind: "auth", retryable: false, status: 401 } }]);
    const cut = await collect(p.stream(request));
    expect(cut.map((e) => e.type)).toEqual(["text_delta", "error"]);
    expect(seen[0]!.body).not.toHaveProperty("provider");

    const dead = new ProxyProvider({ id: "proxy", wire: "proxy", model: "m", proxyUrl: "http://127.0.0.1:1/api/llm/stream" });
    expect((await collect(dead.stream(request)))[0]).toMatchObject({ type: "error", error: { kind: "network", retryable: true } });
  });

  it("stops after a relayed error event", async () => {
    handlers.push((_r, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(
        `data: ${JSON.stringify({ type: "error", error: { message: "upstream 429", kind: "rate_limit", retryable: true } })}\n\n` +
          `data: ${JSON.stringify({ type: "text_delta", text: "ignored" })}\n\n`,
      );
    });
    const p = new ProxyProvider({ id: "proxy", wire: "proxy", model: "m", proxyUrl: url });
    expect(await collect(p.stream(request))).toEqual([{ type: "error", error: { message: "upstream 429", kind: "rate_limit", retryable: true } }]);
  });
});
