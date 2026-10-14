import { describe, expect, it } from "vitest";
import { formatSSE, parseSSE, type SSEMessage } from "./sse.js";

function streamOf(chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(typeof c === "string" ? enc.encode(c) : c);
      controller.close();
    },
  });
}

async function collect(chunks: (string | Uint8Array)[], opts?: Parameters<typeof parseSSE>[1]): Promise<SSEMessage[]> {
  const out: SSEMessage[] = [];
  for await (const m of parseSSE(streamOf(chunks), opts)) out.push(m);
  return out;
}

describe("parseSSE", () => {
  it("parses LF-delimited events with event names and ids (last event id persists, per spec)", async () => {
    const msgs = await collect(["event: ping\nid: 7\ndata: {\"a\":1}\n\n", "data: two\n\n"]);
    expect(msgs).toEqual([{ event: "ping", id: "7", data: '{"a":1}' }, { id: "7", data: "two" }]);
  });

  it("handles CRLF and lone CR line endings, including CRLF split across chunks", async () => {
    const msgs = await collect(["data: a\r", "\n\r\n", "data: b\r\rdata: c\r\n\r\n"]);
    expect(msgs.map((m) => m.data)).toEqual(["a", "b", "c"]);
  });

  it("joins multi-line data with newlines and strips one leading space only", async () => {
    const msgs = await collect(["data: line1\ndata:  line2\ndata:line3\n\n"]);
    expect(msgs[0]!.data).toBe("line1\n line2\nline3");
  });

  it("ignores comments, unknown fields and events without data", async () => {
    const msgs = await collect([": keep-alive\n\nretry: 100\nevent: empty\n\nfoo: bar\ndata: x\n\n"]);
    expect(msgs).toEqual([{ data: "x" }]);
  });

  it("reassembles events split at arbitrary byte boundaries, including inside UTF-8 sequences", async () => {
    const enc = new TextEncoder();
    const bytes = enc.encode("data: 患者胸痛 🫀\n\ndata: ok\n\n");
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += 3) chunks.push(bytes.slice(i, i + 3));
    const msgs = await collect(chunks);
    expect(msgs.map((m) => m.data)).toEqual(["患者胸痛 🫀", "ok"]);
  });

  it("strips a leading BOM", async () => {
    const msgs = await collect(["﻿data: hi\n\n"]);
    expect(msgs[0]!.data).toBe("hi");
  });

  it("emits a trailing event without a final blank line", async () => {
    const msgs = await collect(["data: a\n\ndata: tail"]);
    expect(msgs.map((m) => m.data)).toEqual(["a", "tail"]);
  });

  it("yields [DONE] and stops reading by default", async () => {
    const msgs = await collect(["data: 1\n\ndata: [DONE]\n\ndata: after\n\n"]);
    expect(msgs.map((m) => m.data)).toEqual(["1", "[DONE]"]);
    const all = await collect(["data: 1\n\ndata: [DONE]\n\ndata: after\n\n"], { stopOnDone: false });
    expect(all.map((m) => m.data)).toEqual(["1", "[DONE]", "after"]);
  });

  it("stops when the signal aborts", async () => {
    const controller = new AbortController();
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode("data: first\n\n"));
        // never closes
      },
    });
    const seen: string[] = [];
    for await (const m of parseSSE(stream, { signal: controller.signal })) {
      seen.push(m.data);
      controller.abort();
    }
    expect(seen).toEqual(["first"]);
  });

  it("formatSSE round-trips multi-line payloads", async () => {
    const msgs = await collect([formatSSE("a\nb", "done"), formatSSE('{"x":1}')]);
    expect(msgs).toEqual([{ event: "done", data: "a\nb" }, { data: '{"x":1}' }]);
  });
});
