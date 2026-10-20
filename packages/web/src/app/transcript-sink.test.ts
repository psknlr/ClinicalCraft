/**
 * `HttpTranscriptSink`: chunked, ordered NDJSON uploads (browsers refuse
 * `keepalive` bodies over 64 KiB, so a single big batch must never be sent
 * that way), bounded retries, a visible stop, and the page-exit flush.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptItem } from "@clinicalcraft/agent";
import { HttpTranscriptSink, ndjsonChunks, TRANSCRIPT_CHUNK_BYTES } from "./session.js";

const item = (ordinal: number, size = 900): TranscriptItem => ({ type: "action", ordinal, ts: "2026-01-01T00:00:00.000Z", payload: { action: { type: "note", text: "说".repeat(size / 3) }, accepted: true } }) as TranscriptItem;

interface Call {
  body: string;
  keepalive: boolean;
  bytes: number;
}

function fakeFetch(respond: (call: Call, n: number) => Response | Promise<Response> = () => new Response("{}", { status: 200 })) {
  const calls: Call[] = [];
  const fn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = String(init?.body ?? "");
    const call = { body, keepalive: init?.keepalive === true, bytes: new TextEncoder().encode(body).length };
    calls.push(call);
    // What Chromium does with an oversized keepalive body.
    if (call.keepalive && call.bytes > 64 * 1024) throw new TypeError("Failed to fetch");
    return respond(call, calls.length);
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const ordinalsOf = (calls: Call[]) => calls.flatMap((c) => c.body.trim().split("\n").map((l) => (JSON.parse(l) as { ordinal: number }).ordinal));

describe("HttpTranscriptSink", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("splits a large batch (an autopilot run writes >100 KB in a second) into ordered ≤60 KB chunks", async () => {
    const f = fakeFetch();
    const sink = new HttpTranscriptSink("s1", undefined, f.fn);
    for (let i = 0; i < 300; i++) sink.write(item(i)); // ~270 KB
    await sink.flush();
    expect(f.calls.length).toBeGreaterThan(3);
    expect(f.calls.every((c) => c.bytes <= TRANSCRIPT_CHUNK_BYTES && !c.keepalive)).toBe(true);
    expect(ordinalsOf(f.calls)).toEqual([...Array(300).keys()]);
    expect(sink.uploadsStopped).toBe(false);
  });

  it("retries network failures with backoff and stops (once, visibly) after three in a row", async () => {
    let fail = true;
    const f = fakeFetch(() => {
      if (fail) throw new TypeError("offline");
      return new Response("{}", { status: 200 });
    });
    const stopped: string[] = [];
    const sink = new HttpTranscriptSink("s1", (r) => stopped.push(r), f.fn);
    sink.write(item(0));
    await sink.flush();
    sink.write(item(1));
    fail = false;
    await vi.advanceTimersByTimeAsync(2500);
    expect(ordinalsOf(f.calls.slice(1))).toEqual([0, 1]); // the failed chunk is resent first, in order
    fail = true;
    sink.write(item(2));
    await sink.flush();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(stopped).toEqual(["network"]);
    expect(sink.uploadsStopped).toBe(true);
    const before = f.calls.length;
    sink.write(item(3));
    await sink.flush();
    expect(f.calls.length).toBe(before);
    // Once stopped it keeps nothing (no unbounded in-memory copy of the transcript).
    expect(Object.values(sink).some((v) => Array.isArray(v) && v.length > 0)).toBe(false);
  });

  it("keeps only what is waiting to be sent", async () => {
    const f = fakeFetch();
    const sink = new HttpTranscriptSink("s1", undefined, f.fn);
    for (let i = 0; i < 50; i++) sink.write(item(i));
    await sink.flush();
    expect(ordinalsOf(f.calls)).toEqual([...Array(50).keys()]);
    expect("memory" in sink).toBe(false);
    expect(Object.values(sink).some((v) => Array.isArray(v) && v.length > 0)).toBe(false);
  });

  it("stops at once when the server refuses (quota)", async () => {
    const f = fakeFetch(() => new Response(JSON.stringify({ error: { code: "transcript_quota" } }), { status: 413 }));
    const stopped: string[] = [];
    const sink = new HttpTranscriptSink("s1", (r) => stopped.push(r), f.fn);
    sink.write(item(0));
    await sink.flush();
    expect(stopped).toEqual(["refused"]);
    expect(f.calls).toHaveLength(1);
  });

  it("page exit sends the buffer with keepalive, within the 64 KiB budget", async () => {
    const f = fakeFetch();
    const sink = new HttpTranscriptSink("s1", undefined, f.fn);
    for (let i = 0; i < 150; i++) sink.write(item(i));
    sink.flushOnExit();
    await vi.advanceTimersByTimeAsync(0);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.keepalive).toBe(true);
    expect(f.calls[0]!.bytes).toBeLessThanOrEqual(TRANSCRIPT_CHUNK_BYTES);
    await sink.flush(); // the page came back: the rest follows normally
    expect(ordinalsOf(f.calls)).toEqual([...Array(150).keys()]);
  });

  it("ndjsonChunks keeps an oversized single item in a chunk of its own", () => {
    const chunks = ndjsonChunks([item(0, 300), item(1, 90_000), item(2, 300)]);
    expect(chunks.map((c) => c.count)).toEqual([1, 1, 1]);
  });
});
