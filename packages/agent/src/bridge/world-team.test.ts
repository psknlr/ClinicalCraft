/**
 * The care team's `team` tool over the world bridge (docs/PROTOCOL.md §13; docs/TEAM.md §5): a live in-world session of
 * a case with a care team offers `team` among its tools (never a clinical session, nor a case without a team), and a
 * forwarded call is the session's own `team` op, worded by the agent — what the team said, what the stand-in waits on
 * the learner for. A call-out stays the learner's to answer in the browser: `callout` is refused over the bridge. A real
 * theatre session (the agent's fixture: core's lap-chole team in general-hospital's theatre) in the first assistant's
 * place, against a fake `clinicalcraft serve`.
 */
import { describe, expect, it } from "vitest";
import { makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { theatreSession } from "../session/__fixtures__/theatre.js";
import type { BridgeCommand } from "./protocol.js";
import { connectWorldBridge, type BridgeSession } from "./world-client.js";

const encoder = new TextEncoder();
const sse = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function until(predicate: () => boolean, ms = 8000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** A fake `clinicalcraft serve`: one registration, its command stream, the results posted. */
class FakeServer {
  readonly registrations: Record<string, any>[] = [];
  readonly results: { correlationId: string; kind: string; result?: any }[] = [];
  private stream: ReadableStreamDefaultController<Uint8Array> | null = null;

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input), "http://fake.invalid");
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    if (url.pathname === "/api/world/sessions" && method === "POST") {
      this.registrations.push(body);
      return json(201, { id: "ls_fake000000000001", secret: "s".repeat(43), heartbeatMs: 60_000, expireAfterMs: 180_000, pingMs: 60_000 });
    }
    const m = /^\/api\/world\/sessions\/([^/]+)(?:\/(\w+))?$/.exec(url.pathname);
    if (!m) return json(404, { error: { code: "not_found", message: "Not found." } });
    if (m[2] === "commands") {
      const stream = new ReadableStream<Uint8Array>({
        start: (controller) => {
          this.stream = controller;
          controller.enqueue(sse("hello", { id: m[1], heartbeatMs: 60_000, expireAfterMs: 180_000, pingMs: 60_000, now: Date.now() }));
        },
      });
      init?.signal?.addEventListener("abort", () => {
        try {
          this.stream?.error(new DOMException("aborted", "AbortError"));
        } catch {
          /* closed */
        }
      });
      return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
    }
    if (m[2] === "results") {
      this.results.push(body);
      return json(200, { ok: true });
    }
    return json(200, { ok: true });
  };

  command(command: BridgeCommand): void {
    this.stream!.enqueue(sse("command", command));
  }

  async call(correlationId: string, args: Record<string, unknown>): Promise<any> {
    this.command({ type: "call", correlationId, tool: "team", args, deadline: Date.now() + 60_000 });
    await until(() => this.results.some((r) => r.correlationId === correlationId && r.kind === "result"));
    return this.results.find((r) => r.correlationId === correlationId && r.kind === "result")!.result;
  }
}

describe("the team tool of a live session (world bridge)", () => {
  it("is offered by an in-world session of a case with a team, runs the session's team op and says what waits on the learner; a call-out stays the learner's", async () => {
    const t = await theatreSession({ settingsPatch: { approvalMode: "default" } });
    await t.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
    const server = new FakeServer();
    const bridge = connectWorldBridge({ serverUrl: "http://fake.invalid", session: t.session as unknown as BridgeSession, fetch: server.fetch });
    try {
      expect((await bridge.ready).state).toBe("connected");
      expect(server.registrations[0]!.capabilities).toContain("team");
      const status = await server.call("c1", { action: "status" });
      expect(status).toMatchObject({ ok: true, status: "ok" });
      expect(status.output).toMatch(/^Team: round \d+ · pace auto · you play your place \(first assistant\)/u);
      const run = await server.call("c2", { action: "run" });
      expect(run.ok).toBe(true);
      expect(run.output).toMatch(/Dr Ito → you: The first assistant \(you\), take the camera, please\. \[msg-\d+\]/u);
      expect(run.output).toMatch(/answer: team \{action: "reply", message: "msg-\d+", kind: "readback"\}/u);
      const reply = await server.call("c3", { action: "reply", kind: "readback" });
      expect(reply.ok).toBe(true);
      expect(t.session.team()!.state.messages.some((m) => m.from === "actor:clinician" && m.kind === "readback")).toBe(true);
      const callout = await server.call("c4", { action: "callout", decision: "approve" });
      expect(callout).toMatchObject({ ok: false, status: "denied", output: "The learner answers the stand-in surgeon's call-outs in the browser: this tool cannot." });
      const bad = await server.call("c5", { action: "dance" });
      expect(bad).toMatchObject({ ok: false, status: "error" });
    } finally {
      await bridge.dispose();
      await t.session.close();
    }
  });

  it("is not offered by a clinical session, nor by a case without a team", async () => {
    for (const t of [await theatreSession({ clinical: true, settingsPatch: { approvalMode: "default" } }), await makeEmbodiedSession({ settingsPatch: { approvalMode: "default" } })]) {
      expect(t.session.caseDef.team === undefined || t.session.embodiment === "clinical").toBe(true);
      const server = new FakeServer();
      const bridge = connectWorldBridge({ serverUrl: "http://fake.invalid", session: t.session as unknown as BridgeSession, fetch: server.fetch });
      try {
        await bridge.ready;
        expect(server.registrations[0]!.capabilities).not.toContain("team");
      } finally {
        await bridge.dispose();
        await t.session.close();
      }
    }
  });
});
