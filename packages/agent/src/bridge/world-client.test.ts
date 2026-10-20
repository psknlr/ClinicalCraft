/**
 * The browser's bridge client (`connectWorldBridge`) against a fake
 * `clinicalcraft serve` (an injected `fetch`) and a fake session: the attach
 * key (made at opt-in, shown in the status, the same for every
 * re-registration, which also asks its old id back), call deadlines in the
 * server's clock (review S11: a call whose caller stopped waiting is never
 * started; a queued one is cancelled when its deadline passes; the session
 * gets the deadline in its own clock), `allowBypass` reaching the session only
 * when the front-end opted in (S4: the session enforces bypass at execution
 * time), and a cancel that arrives before its call.
 * The real server, session and attach client: packages/server/src/world-bridge*.test.ts.
 */
import { describe, expect, it } from "vitest";
import type { AgentEvent, Op } from "../protocol.js";
import { BRIDGE_TOOLS, isAttachKey, type BridgeCommand } from "./protocol.js";
import { connectWorldBridge, type BridgeSession, type WorldBridgeOptions } from "./world-client.js";

const encoder = new TextEncoder();
const sse = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function until(predicate: () => boolean, ms = 4000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** A fake `clinicalcraft serve`: registration, one command stream at a time, results and heartbeats recorded. */
class FakeServer {
  /** The server's clock runs this far ahead of the browser's. */
  skew = 0;
  readonly registrations: Record<string, any>[] = [];
  readonly results: { correlationId: string; kind: string; result?: any }[] = [];
  readonly deletes: string[] = [];
  private stream: ReadableStreamDefaultController<Uint8Array> | null = null;
  private seq = 0;

  now(): number {
    return Date.now() + this.skew;
  }

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input), "http://fake.invalid");
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    if (url.pathname === "/api/world/sessions" && method === "POST") {
      this.registrations.push(body);
      const id = typeof body.previousId === "string" ? body.previousId : `ls_fake${String(++this.seq).padStart(12, "0")}`;
      return json(201, { id, secret: "s".repeat(43), heartbeatMs: 60_000, expireAfterMs: 180_000, pingMs: 60_000 });
    }
    const m = /^\/api\/world\/sessions\/([^/]+)(?:\/(\w+))?$/.exec(url.pathname);
    if (!m) return json(404, { error: { code: "not_found", message: "Not found." } });
    if (m[2] === "commands") {
      const body = new ReadableStream<Uint8Array>({
        start: (controller) => {
          this.stream = controller;
          controller.enqueue(sse("hello", { id: m[1], heartbeatMs: 60_000, expireAfterMs: 180_000, pingMs: 60_000, now: this.now() }));
        },
      });
      init?.signal?.addEventListener("abort", () => {
        try {
          this.stream?.error(new DOMException("aborted", "AbortError"));
        } catch {
          /* closed */
        }
      });
      return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
    }
    if (m[2] === "results") {
      this.results.push(body);
      return json(200, { ok: true });
    }
    if (m[2] === "heartbeat") return json(200, { ok: true });
    if (method === "DELETE") {
      this.deletes.push(m[1]!);
      return json(200, { ok: true });
    }
    return json(404, { error: { code: "not_found", message: "Not found." } });
  };

  command(command: BridgeCommand): void {
    this.stream!.enqueue(sse("command", command));
  }

  /** The server forgot the session: its stream ends `closed {reason: expired}`. */
  expire(): void {
    this.stream!.enqueue(sse("closed", { reason: "expired" }));
    this.stream!.close();
  }

  resultOf(correlationId: string): any {
    return this.results.find((r) => r.correlationId === correlationId && r.kind === "result")?.result;
  }
}

/** A fake session: records the ops; external calls finish at once, or wait for their cancel (`hold`). */
class FakeSession implements BridgeSession {
  readonly id = "fake-session";
  readonly caseDef = { id: "stemi-inferior-rv", title: { en: "Chest pain · 58-year-old man", "zh-CN": "胸痛" } };
  readonly facility = { id: "general-hospital" };
  readonly locale = "en";
  readonly settings: { approvalMode: "default" | "bypass" } = { approvalMode: "default" };
  readonly embodiment = "embodied" as const;
  readonly isClosed = false;
  readonly runs: Extract<Op, { type: "external_tool_call" }>[] = [];
  readonly submitted: Op[] = [];
  hold = false;
  private readonly listeners = new Set<(event: AgentEvent) => void>();
  private readonly held = new Map<string, () => void>();
  private seq = 0;

  async run(op: Op): Promise<AgentEvent[]> {
    if (op.type !== "external_tool_call") return [];
    this.runs.push(op);
    const id = `sub-${++this.seq}`;
    const event = (msg: AgentEvent["msg"]): AgentEvent => ({ id, seq: ++this.seq, msg });
    if (this.hold) {
      await new Promise<void>((resolve) => this.held.set(op.callId, resolve));
      const events = [event({ type: "warning", message: `The external agent's ${op.tool} call was cancelled before it started.` })];
      for (const e of events) for (const fn of this.listeners) fn(e);
      return events;
    }
    const turnId = `t-${this.seq}`;
    const events = [
      event({ type: "turn_started", turnId, agent: "clinician" }),
      event({ type: "tool_call_begin", turnId, agent: "clinician", callId: op.callId, tool: op.tool, args: op.args ?? {} }),
      event({ type: "tool_call_end", turnId, agent: "clinician", callId: op.callId, tool: op.tool, ok: true, output: "done", durationMs: 1 }),
      event({ type: "turn_complete", turnId, agent: "clinician", lastMessage: null, durationMs: 1 }),
    ];
    for (const e of events) for (const fn of this.listeners) fn(e);
    return events;
  }

  submit(op: Op): string {
    this.submitted.push(op);
    if (op.type === "external_tool_cancel") this.held.get(op.callId)?.();
    return `sub-${++this.seq}`;
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  toolsFor(): readonly { name: string }[] {
    return BRIDGE_TOOLS.map((name) => ({ name }));
  }
}

function start(extra: Partial<WorldBridgeOptions> = {}) {
  const server = new FakeServer();
  const session = new FakeSession();
  const bridge = connectWorldBridge({ serverUrl: "http://fake.invalid", session, fetch: server.fetch, backoff: { initialMs: 10, maxMs: 20 }, ...extra });
  return { server, session, bridge };
}

describe("connectWorldBridge (fake server)", () => {
  it("makes an attach key at opt-in, shows it in its status, and re-registers with the same key asking its old id back (S5)", async () => {
    const { server, bridge } = start();
    try {
      const status = await bridge.ready;
      expect(status.state).toBe("connected");
      expect(isAttachKey(status.attachKey)).toBe(true);
      expect(server.registrations[0]).toMatchObject({ attachKey: status.attachKey, caseHandle: expect.stringMatching(/^case-/) });
      expect(server.registrations[0]!.previousId ?? null).toBeNull();
      const first = status.liveSessionId!;
      server.expire(); // the server forgot it (missed heartbeats, a restart)
      await until(() => server.registrations.length === 2 && bridge.status.state === "connected");
      expect(server.registrations[1]).toMatchObject({ attachKey: status.attachKey, previousId: first });
      expect(bridge.status).toMatchObject({ attachKey: status.attachKey, liveSessionId: first });
      // Another opt-in is another key.
      const other = start();
      expect((await other.bridge.ready).attachKey).not.toBe(status.attachKey);
      await other.bridge.dispose();
    } finally {
      await bridge.dispose();
    }
  });

  it("never starts a call whose deadline (server clock) has passed; a live one reaches the session with the deadline in the browser's clock (S11)", async () => {
    const { server, session, bridge } = start();
    server.skew = 60_000; // the server's clock runs a minute ahead of the browser's
    try {
      await bridge.ready;
      server.command({ type: "call", correlationId: "late", tool: "observe_world", args: {}, deadline: server.now() - 1_000 });
      await until(() => !!server.resultOf("late"));
      expect(server.resultOf("late")).toMatchObject({ ok: false, status: "cancelled", output: expect.stringMatching(/not run.*deadline/) });
      expect(session.runs).toEqual([]);
      // Delivered again (a reconnect): still answered, still not run.
      server.command({ type: "call", correlationId: "late", tool: "observe_world", args: {}, deadline: server.now() - 1_000 });
      await until(() => server.results.filter((r) => r.correlationId === "late" && r.kind === "result").length === 2);
      expect(session.runs).toEqual([]);

      server.command({ type: "call", correlationId: "fresh", tool: "observe_world", args: {}, deadline: server.now() + 30_000 });
      await until(() => !!server.resultOf("fresh"));
      expect(session.runs).toHaveLength(1);
      const op = session.runs[0]! as Extract<Op, { type: "external_tool_call" }> & { deadline?: number; allowBypass?: boolean };
      // in the browser's clock (≈ now + 30 s), not the server's (≈ now + 90 s)
      expect(op.deadline).toBeGreaterThan(Date.now() + 25_000);
      expect(op.deadline).toBeLessThan(Date.now() + 31_000);
      expect(op.allowBypass).toBeUndefined();
      expect(server.resultOf("fresh")).toMatchObject({ ok: true, status: "ok" });
    } finally {
      await bridge.dispose();
    }
  });

  it("cancels a queued call when its deadline passes — the caller stopped waiting, so it never runs later (S11)", async () => {
    const { server, session, bridge } = start();
    session.hold = true; // queued behind something else (e.g. an approval the learner has not answered)
    try {
      await bridge.ready;
      server.command({ type: "call", correlationId: "queued", tool: "intervene", args: { intervention_id: "aspirin" }, deadline: server.now() + 300 });
      await until(() => session.runs.length === 1);
      expect(bridge.status.activeCalls).toBe(1);
      await until(() => session.submitted.some((op) => op.type === "external_tool_cancel" && op.callId === "queued"), 3000);
      await until(() => !!server.resultOf("queued"));
      expect(server.resultOf("queued")).toMatchObject({ ok: false, status: "cancelled" });
      expect(bridge.status.activeCalls).toBe(0);
    } finally {
      await bridge.dispose();
    }
  });

  it("passes allowBypass to the session only when the front-end opted in (S4: the session re-checks bypass when the call runs)", async () => {
    const strict = start();
    const lax = start({ allowBypass: true });
    try {
      await Promise.all([strict.bridge.ready, lax.bridge.ready]);
      strict.server.command({ type: "call", correlationId: "a", tool: "observe_world", args: {}, deadline: strict.server.now() + 10_000 });
      lax.server.command({ type: "call", correlationId: "b", tool: "observe_world", args: {}, deadline: lax.server.now() + 10_000 });
      await until(() => strict.session.runs.length === 1 && lax.session.runs.length === 1);
      expect((strict.session.runs[0] as { allowBypass?: boolean }).allowBypass).toBeUndefined();
      expect((lax.session.runs[0] as { allowBypass?: boolean }).allowBypass).toBe(true);
      // The early refusal stays: in bypass mode a call is refused before it is queued.
      strict.session.settings.approvalMode = "bypass";
      strict.server.command({ type: "call", correlationId: "c", tool: "observe_world", args: {}, deadline: strict.server.now() + 10_000 });
      await until(() => !!strict.server.resultOf("c"));
      expect(strict.server.resultOf("c")).toMatchObject({ ok: false, status: "denied", output: expect.stringMatching(/bypass/) });
      expect(strict.session.runs).toHaveLength(1);
    } finally {
      await strict.bridge.dispose();
      await lax.bridge.dispose();
    }
  });

  it("a call whose cancel arrived first is never run when it is delivered afterwards", async () => {
    const { server, session, bridge } = start();
    try {
      await bridge.ready;
      server.command({ type: "cancel", correlationId: "gone" });
      await until(() => !!server.resultOf("gone"));
      expect(server.resultOf("gone")).toMatchObject({ ok: false, status: "cancelled" });
      server.command({ type: "call", correlationId: "gone", tool: "observe_world", args: {}, deadline: server.now() + 10_000 });
      await until(() => server.results.filter((r) => r.correlationId === "gone" && r.kind === "result").length === 2);
      expect(session.runs).toEqual([]);
    } finally {
      await bridge.dispose();
    }
  });
});
