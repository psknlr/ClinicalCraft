/**
 * The browser's world-bridge client (`connectWorldBridge`, agent
 * `bridge/world-client.ts`) and the attach client (`WorldAttachClient`)
 * against a real `clinicalcraft serve` request handler, in Node, with a real
 * headless embodied session (the STEMI case in its own hospital) standing in
 * for the learner's browser session: registration, calls as the clinician
 * through the session's tool path, approvals answered by the learner (never by
 * the caller), cancellation, a dropped stream (no call runs twice), expiry and
 * re-registration, dispose / session shutdown, the bypass guard, auth failures.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { caseHandle, connectWorldBridge, mergeSettings, WorldAttachClient, type ClinicalSession, type WorldBridgeOptions, type WorldBridgeStatus } from "@clinicalcraft/agent";
import { createNodeSession, loadContent } from "@clinicalcraft/agent/node";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { createRequestHandler, type ServerOptions } from "./server.js";
import type { WorldSessionRouterOptions } from "./world-sessions.js";

const root = mkdtempSync(join(tmpdir(), "cc-world-bridge-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();
const STEMI = "stemi-inferior-rv";
const PATIENT = "patient:resus-1";
const TOKEN = "bridge-token-0123456789";

interface Served {
  url: string;
  port: number;
  close(): Promise<void>;
}

async function serve(opts: Partial<ServerOptions> & { world?: WorldSessionRouterOptions; port?: number } = {}): Promise<Served> {
  const { world, port = 0, ...rest } = opts;
  const settings = mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false } } }]);
  const handler = createRequestHandler({ host: "127.0.0.1", settings, content, env: { CLINICALCRAFT_HOME: join(root, "srv") }, log: () => undefined, ...(world ? { worldSessions: world } : {}), ...rest });
  const server: Server = createServer(handler);
  await new Promise<void>((r) => server.listen(port, "127.0.0.1", () => r()));
  const actual = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${actual}`,
    port: actual,
    close: async () => {
      await handler.close();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}

/** A live embodied STEMI session (the learner's, in the browser) with an isolated home. */
async function liveSession(flags: Record<string, unknown> = {}): Promise<ClinicalSession> {
  const dir = mkdtempSync(join(root, "s-"));
  mkdirSync(join(dir, "home"), { recursive: true });
  return createNodeSession({
    caseId: STEMI,
    cwd: dir,
    env: { CLINICALCRAFT_HOME: join(dir, "home"), HOME: join(dir, "home") },
    flags: { embodiment: "embodied", approvalMode: "default", locale: "en", transcripts: { enabled: false }, ...flags },
    transcript: false,
    content,
  });
}

/** The learner at the approval dialog: answers each request with `decide` (or leaves it pending: null). */
function learner(session: ClinicalSession, decide: (tool: string, args: unknown) => "approved" | "denied" | null) {
  const asked: { agent: string; tool: string; requestId: string }[] = [];
  session.subscribe((e) => {
    if (e.msg.type !== "approval_request") return;
    asked.push({ agent: String(e.msg.agent), tool: e.msg.tool, requestId: e.msg.requestId });
    const decision = decide(e.msg.tool, e.msg.args);
    if (decision) session.submit({ type: "approval_response", requestId: e.msg.requestId, decision });
  });
  return asked;
}

function footprintDistance(session: ClinicalSession): number {
  return session.world()!.find(PRIMARY_ACTOR, { kind: "patient" }).find((e) => e.id === PATIENT)!.distance;
}

const given = (session: ClinicalSession) => session.state.interventions.map((i) => i.interventionId);

async function until(predicate: () => boolean, ms = 5000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}

function connect(session: ClinicalSession, s: Served, extra: Partial<WorldBridgeOptions> = {}) {
  const statuses: WorldBridgeStatus[] = [];
  const bridge = connectWorldBridge({ serverUrl: s.url, session, onStatus: (st) => statuses.push(st), backoff: { initialMs: 20, maxMs: 200 }, ...extra });
  return { bridge, statuses };
}

describe("connectWorldBridge ⇄ clinicalcraft serve ⇄ WorldAttachClient", () => {
  it("registers spoiler-free; runs calls as the clinician through the session's tool path; reports results", async () => {
    const s = await serve();
    const session = await liveSession();
    const { bridge, statuses } = connect(session, s);
    try {
      expect((await bridge.ready).state).toBe("connected");
      const attach = new WorldAttachClient({ serverUrl: s.url });
      const list = await attach.list();
      expect(list.ok).toBe(true);
      const live = list.ok ? list.value : [];
      expect(live).toHaveLength(1);
      expect(live[0]).toMatchObject({ id: bridge.status.liveSessionId, caseHandle: caseHandle(STEMI), title: "Chest pain · 58-year-old man", facilityId: "general-hospital", embodiment: "embodied", connected: true });
      expect(live[0]!.capabilities).toEqual(expect.arrayContaining(["navigate_to", "interact_object", "intervene", "examine", "observe_world"]));
      expect(live[0]!.capabilities).not.toContain("get_camera_frame");
      expect(JSON.stringify(live)).not.toContain(STEMI); // the case id names the diagnosis: never sent

      const begins: { agent: string; callId: string; tool: string; id: string }[] = [];
      session.subscribe((e) => {
        if (e.msg.type === "tool_call_begin") begins.push({ agent: String(e.msg.agent), callId: e.msg.callId, tool: e.msg.tool, id: e.id });
      });
      const walk = await attach.call(live[0]!.id, { correlationId: "w-1", tool: "navigate_to", args: { target: "patient" } });
      expect(walk.ok && walk.value.result).toMatchObject({ ok: true, status: "ok", data: { result: { status: "completed" } } });
      expect(footprintDistance(session)).toBeLessThanOrEqual(1.5);
      expect(begins).toEqual([expect.objectContaining({ agent: "clinician", callId: "w-1", tool: "navigate_to" })]);
      expect(bridge.owns(begins[0]!.id)).toBe(true);

      const exam = await attach.call(live[0]!.id, { correlationId: "w-2", tool: "examine", args: { finding_id: "general" } });
      expect(exam.ok && exam.value.result.status).toBe("ok");
      expect(session.state.examined).toContain("general");
      // The same correlation id again: answered from the stored result, not run again.
      const again = await attach.call(live[0]!.id, { correlationId: "w-2", tool: "examine", args: { finding_id: "general" } });
      expect(again.ok && again.value.deduplicated).toBe(true);
      expect(begins.filter((b) => b.callId === "w-2")).toHaveLength(1);
      expect(statuses.map((st) => st.state)).toContain("connected");
      expect(statuses.some((st) => st.activeCalls === 1)).toBe(true);
    } finally {
      await bridge.dispose();
      await session.close();
      await s.close();
    }
  });

  it("approval prompts go to the learner — approved runs, denied is reported; the attach side has no way to answer", async () => {
    const s = await serve();
    const session = await liveSession();
    const asked = learner(session, (tool, args) => ((args as { intervention_id?: string }).intervention_id === "clopidogrel" ? "denied" : "approved"));
    const responses: string[] = [];
    session.subscribe((e) => {
      if (e.msg.type === "approval_resolved") responses.push(e.msg.decision);
    });
    const { bridge } = connect(session, s);
    try {
      await bridge.ready;
      const attach = new WorldAttachClient({ serverUrl: s.url });
      const id = bridge.status.liveSessionId!;
      await attach.call(id, { correlationId: "a-0", tool: "navigate_to", args: { target: "patient" } });
      const ok = await attach.call(id, { correlationId: "a-1", tool: "intervene", args: { intervention_id: "ticagrelor" } });
      expect(ok.ok && ok.value.result).toMatchObject({ ok: true, status: "ok", approvals: [{ tool: "intervene", risk: "moderate", decision: "approved" }] });
      expect(given(session)).toContain("ticagrelor");
      const no = await attach.call(id, { correlationId: "a-2", tool: "intervene", args: { intervention_id: "clopidogrel" } });
      expect(no.ok && no.value.result).toMatchObject({ ok: false, status: "denied", approvals: [{ decision: "denied" }] });
      expect(given(session)).not.toContain("clopidogrel");
      expect(asked.map((a) => a.agent)).toEqual(["clinician", "clinician"]);
      expect(responses).toEqual(["approved", "denied"]);
      // A `confirm` in the arguments is just an invalid argument: nothing on the bridge approves anything.
      const sneaky = await attach.call(id, { correlationId: "a-3", tool: "intervene", args: { intervention_id: "clopidogrel", confirm: true } });
      expect(sneaky.ok && sneaky.value.result).toMatchObject({ ok: false, status: "error" });
      expect(given(session)).not.toContain("clopidogrel");
      expect(asked).toHaveLength(2);
    } finally {
      await bridge.dispose();
      await session.close();
      await s.close();
    }
  });

  it("cancellation from the attach side withdraws the learner's pending approval; nothing is given", async () => {
    const s = await serve();
    const session = await liveSession();
    const asked = learner(session, () => null); // the learner does not answer
    const resolved: string[] = [];
    session.subscribe((e) => {
      if (e.msg.type === "approval_resolved") resolved.push(e.msg.decision);
    });
    const { bridge } = connect(session, s);
    try {
      await bridge.ready;
      const attach = new WorldAttachClient({ serverUrl: s.url });
      const id = bridge.status.liveSessionId!;
      await attach.call(id, { correlationId: "k-0", tool: "navigate_to", args: { target: "patient" } });
      const controller = new AbortController();
      const pending = attach.call(id, { correlationId: "k-1", tool: "intervene", args: { intervention_id: "nitroglycerin" } }, controller.signal);
      await until(() => asked.length === 1);
      expect(bridge.status.activeCalls).toBe(1);
      expect((await attach.cancel(id, "k-1")).ok).toBe(true);
      controller.abort();
      expect(await pending).toMatchObject({ ok: false, error: { code: "aborted" } });
      await until(() => resolved.length === 1 && bridge.status.activeCalls === 0);
      expect(resolved).toEqual(["abort"]);
      expect(given(session)).toEqual([]);
      // The cancelled call's result is kept: the same correlation id reports it.
      const replay = await attach.call(id, { correlationId: "k-1", tool: "intervene", args: { intervention_id: "nitroglycerin" } });
      expect(replay.ok && replay.value).toMatchObject({ deduplicated: true, result: { ok: false, status: "cancelled" } });
    } finally {
      await bridge.dispose();
      await session.close();
      await s.close();
    }
  });

  it("a dropped command stream reconnects with the same registration; a re-delivered call runs once", async () => {
    const s = await serve();
    const session = await liveSession();
    const asked = learner(session, () => null);
    const streams: AbortController[] = [];
    const delivered: string[] = [];
    const fetchWrap: typeof fetch = async (input, init) => {
      if (!String(input).endsWith("/commands")) return fetch(input, init);
      const drop = new AbortController();
      streams.push(drop);
      const res = await fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, drop.signal]) : drop.signal });
      if (!res.body) return res;
      // Watch what the server delivers on each stream.
      const [mine, theirs] = res.body.tee();
      void (async () => {
        const decoder = new TextDecoder();
        try {
          for await (const chunk of theirs as unknown as AsyncIterable<Uint8Array>) for (const m of decoder.decode(chunk, { stream: true }).matchAll(/"correlationId":"(r-\d)"/g)) delivered.push(m[1]!);
        } catch {
          /* dropped */
        }
      })();
      return new Response(mine, { status: res.status, headers: res.headers });
    };
    const { bridge, statuses } = connect(session, s, { fetch: fetchWrap });
    try {
      await bridge.ready;
      const id = bridge.status.liveSessionId!;
      const attach = new WorldAttachClient({ serverUrl: s.url });
      await attach.call(id, { correlationId: "r-0", tool: "navigate_to", args: { target: "patient" } });
      const pending = attach.call(id, { correlationId: "r-1", tool: "intervene", args: { intervention_id: "ticagrelor" } });
      await until(() => asked.length === 1);
      streams.at(-1)!.abort(); // the network drops the channel while the learner decides
      await until(() => streams.length === 2 && bridge.status.state === "connected");
      expect(statuses.map((st) => st.state)).toContain("reconnecting");
      expect(bridge.status.liveSessionId).toBe(id);
      await until(() => delivered.filter((c) => c === "r-1").length === 2); // delivered again on the new stream…
      session.submit({ type: "approval_response", requestId: asked[0]!.requestId, decision: "approved" });
      const res = await pending;
      expect(res.ok && res.value.result.status).toBe("ok");
      expect(asked).toHaveLength(1);
      expect(given(session).filter((x) => x === "ticagrelor")).toHaveLength(1);
    } finally {
      await bridge.dispose();
      await session.close();
      await s.close();
    }
  });

  it("re-registers when the server forgot the session (missed heartbeats) and keeps serving", async () => {
    const s = await serve({ world: { heartbeatMs: 60, pingMs: 60, expireAfterMs: 300, sweepMs: 20 } });
    const session = await liveSession();
    let frozen = false;
    const fetchWrap: typeof fetch = (input, init) => {
      if (frozen && String(input).endsWith("/heartbeat")) return Promise.reject(new TypeError("fetch failed"));
      return fetch(input, init);
    };
    const { bridge } = connect(session, s, { fetch: fetchWrap });
    try {
      await bridge.ready;
      const first = bridge.status.liveSessionId!;
      await new Promise((r) => setTimeout(r, 450)); // heartbeats keep it alive past expireAfterMs
      expect(bridge.status.liveSessionId).toBe(first);
      frozen = true; // a frozen tab: no heartbeats
      await until(() => bridge.status.liveSessionId !== null && bridge.status.liveSessionId !== first && bridge.status.state === "connected", 3000);
      frozen = false;
      const attach = new WorldAttachClient({ serverUrl: s.url });
      const gone = await attach.call(first, { correlationId: "x-1", tool: "observe_world" });
      expect(gone).toMatchObject({ ok: false, error: { code: "session_expired", status: 410 } });
      await new Promise((r) => setTimeout(r, 400));
      const look = await attach.call(bridge.status.liveSessionId!, { correlationId: "x-2", tool: "observe_world" });
      expect(look.ok && look.value.result.status).toBe("ok");
    } finally {
      await bridge.dispose();
      await session.close();
      await s.close();
    }
  });

  it("dispose() cancels running calls and unregisters; a session shutdown disposes the bridge", async () => {
    const s = await serve();
    const session = await liveSession();
    const asked = learner(session, () => null);
    const resolved: string[] = [];
    session.subscribe((e) => {
      if (e.msg.type === "approval_resolved") resolved.push(e.msg.decision);
    });
    const { bridge, statuses } = connect(session, s);
    const attach = new WorldAttachClient({ serverUrl: s.url });
    try {
      await bridge.ready;
      const id = bridge.status.liveSessionId!;
      await attach.call(id, { correlationId: "q-0", tool: "navigate_to", args: { target: "patient" } });
      const pending = attach.call(id, { correlationId: "q-1", tool: "intervene", args: { intervention_id: "ticagrelor" } });
      await until(() => asked.length === 1);
      await bridge.dispose();
      expect(await pending).toMatchObject({ ok: false, error: { code: "session_closed", status: 410 } });
      expect(statuses.at(-1)).toMatchObject({ state: "closed", liveSessionId: null, error: { code: "disconnected" } });
      const list = await attach.list();
      expect(list.ok && list.value).toEqual([]);
      // The learner's pending approval was withdrawn with the call: nothing was given.
      await until(() => resolved.length === 1);
      expect(resolved).toEqual(["abort"]);
      expect(given(session)).toEqual([]);
    } finally {
      await bridge.dispose();
      await session.close();
    }

    const other = await liveSession();
    const second = connect(other, s);
    await second.bridge.ready;
    expect((await attach.list()).ok).toBe(true);
    await other.close();
    await until(() => second.bridge.status.state === "closed");
    expect(second.bridge.status.error).toMatchObject({ code: "session_closed" });
    const after = await attach.list();
    expect(after.ok && after.value).toEqual([]);
    await s.close();
  });

  it("refuses calls while the session's approval mode is bypass, unless allowBypass", async () => {
    const s = await serve();
    const session = await liveSession({ approvalMode: "bypass" });
    const strict = connect(session, s);
    try {
      await strict.bridge.ready;
      const attach = new WorldAttachClient({ serverUrl: s.url });
      const refused = await attach.call(strict.bridge.status.liveSessionId!, { correlationId: "b-1", tool: "observe_world" });
      expect(refused.ok && refused.value.result).toMatchObject({ ok: false, status: "denied" });
      expect(refused.ok && refused.value.result.output).toMatch(/bypass/);
      await strict.bridge.dispose();
      const lax = connect(session, s, { allowBypass: true });
      await lax.bridge.ready;
      const look = await attach.call(lax.bridge.status.liveSessionId!, { correlationId: "b-2", tool: "observe_world" });
      expect(look.ok && look.value.result.status).toBe("ok");
      await lax.bridge.dispose();
    } finally {
      await session.close();
      await s.close();
    }
  });

  it("fails clearly without the server's token and against a server without the bridge", async () => {
    const s = await serve({ host: "0.0.0.0", token: TOKEN });
    const session = await liveSession();
    try {
      const noToken = connect(session, s);
      expect(await noToken.bridge.ready).toMatchObject({ state: "failed", error: { code: "unauthorized" } });
      expect(noToken.bridge.status.error!.message).toMatch(/token/);
      const withToken = connect(session, s, { auth: { token: TOKEN } });
      expect((await withToken.bridge.ready).state).toBe("connected");
      const attach = new WorldAttachClient({ serverUrl: s.url });
      expect(await attach.list()).toMatchObject({ ok: false, error: { code: "unauthorized", status: 401 } });
      const authed = new WorldAttachClient({ serverUrl: s.url, token: TOKEN });
      const look = await authed.call(withToken.bridge.status.liveSessionId!, { correlationId: "t-1", tool: "observe_world" });
      expect(look.ok && look.value.result.status).toBe("ok");
      await withToken.bridge.dispose();

      const old: typeof fetch = async () => new Response(JSON.stringify({ error: { code: "not_found", message: "Not found." } }), { status: 404, headers: { "content-type": "application/json" } });
      const unsupported = connect(session, s, { fetch: old });
      expect(await unsupported.bridge.ready).toMatchObject({ state: "failed", error: { code: "unsupported" } });
      const unreachable = await new WorldAttachClient({ serverUrl: "http://127.0.0.1:9" }).list();
      expect(unreachable).toMatchObject({ ok: false, error: { code: "network" } });
    } finally {
      await session.close();
      await s.close();
    }
  });
});
