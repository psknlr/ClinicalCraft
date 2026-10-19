/**
 * World bridge routes (`WorldSessionRouter`, docs/EMBODIED.md §12, PROTOCOL
 * §13) over real HTTP, with a fake browser on the SSE command channel: auth
 * (the server token; the channel secret), registration and its validation,
 * routing of calls and results, acknowledgements, dedupe by correlation id,
 * timeouts, cancellation (explicit and by a caller that goes away), expiry
 * after missed heartbeats, DELETE, re-delivery on reconnect, body limits, CORS.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { BRIDGE_TOOLS, mergeSettings, parseSSE, type BridgeToolResult, type ResolvedSettings } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { createRequestHandler, type ServerOptions } from "./server.js";
import type { WorldSessionRouterOptions } from "./world-sessions.js";

const root = mkdtempSync(join(tmpdir(), "cc-world-sessions-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent({ cases: false });
const TOKEN = "world-token-0123456789";
const env = { CLINICALCRAFT_HOME: join(root, "home"), HOME: join(root, "home") };
const CHANNEL = "x-clinicalcraft-channel";

function settings(): ResolvedSettings {
  return mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false } } }]);
}

interface Served {
  url: string;
  close(): Promise<void>;
}

async function serve(opts: Partial<ServerOptions> & { world?: WorldSessionRouterOptions } = {}): Promise<Served> {
  const { world, ...rest } = opts;
  const handler = createRequestHandler({ host: "127.0.0.1", settings: settings(), content, env, log: () => undefined, ...(world ? { worldSessions: world } : {}), ...rest });
  const server: Server = createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`,
    close: async () => {
      await handler.close();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}

const REGISTRATION = { caseHandle: "case-0abc123", title: "Chest pain in the ED", facilityId: "general-hospital", embodiment: "embodied", locale: "en", capabilities: [...BRIDGE_TOOLS] };

async function json(res: Response): Promise<any> {
  return res.json();
}

function api(base: string, path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal } = {}): Promise<Response> {
  return fetch(new URL(`api/world/sessions${path}`, base), {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers: { ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) },
    ...(init.body !== undefined ? { body: typeof init.body === "string" ? init.body : JSON.stringify(init.body) } : {}),
    ...(init.signal ? { signal: init.signal } : {}),
  });
}

async function register(base: string, body: Record<string, unknown> = REGISTRATION, headers: Record<string, string> = {}): Promise<{ id: string; secret: string; heartbeatMs: number; expireAfterMs: number; pingMs: number }> {
  const res = await api(base, "", { body, headers });
  expect(res.status).toBe(201);
  return json(res);
}

async function until(predicate: () => boolean, ms = 4000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}

const OK: BridgeToolResult = { ok: true, status: "ok", output: "You are in the Resuscitation Room.", data: { room: "ed-resus" } };

/** The browser's side of the channel, by hand. */
class FakeBrowser {
  readonly events: { event: string; data: any }[] = [];
  private readonly controller = new AbortController();
  ended = false;

  constructor(
    readonly base: string,
    readonly reg: { id: string; secret: string },
    readonly headers: Record<string, string> = {},
  ) {}

  async open(): Promise<number> {
    const res = await api(this.base, `/${this.reg.id}/commands`, { headers: { ...this.headers, [CHANNEL]: this.reg.secret }, signal: this.controller.signal });
    if (!res.ok) return res.status;
    void (async () => {
      try {
        for await (const m of parseSSE(res.body!, { signal: this.controller.signal, stopOnDone: false })) this.events.push({ event: m.event ?? "message", data: JSON.parse(m.data) });
      } catch {
        /* aborted */
      }
      this.ended = true;
    })();
    await until(() => this.events.some((e) => e.event === "hello"));
    return res.status;
  }

  commands(): any[] {
    return this.events.filter((e) => e.event === "command").map((e) => e.data);
  }

  post(action: string, body: unknown, secret = this.reg.secret): Promise<Response> {
    return api(this.base, `/${this.reg.id}/${action}`, { body, headers: { ...this.headers, [CHANNEL]: secret } });
  }

  close(): void {
    this.controller.abort();
  }
}

describe("world bridge: auth and registration", () => {
  it("every route needs the server's token when one is set; the list never shows a secret", async () => {
    const s = await serve({ host: "0.0.0.0", token: TOKEN });
    const auth = { authorization: `Bearer ${TOKEN}` };
    try {
      expect((await api(s.url, "", { body: REGISTRATION })).status).toBe(401);
      const reg = await register(s.url, REGISTRATION, auth);
      expect(reg.id).toMatch(/^ls_[A-Za-z0-9_-]{16}$/);
      expect(reg.secret.length).toBeGreaterThanOrEqual(43);
      expect(reg).toMatchObject({ heartbeatMs: 10_000, expireAfterMs: 45_000, pingMs: 10_000 });
      expect((await api(s.url, "")).status).toBe(401);
      const list = await api(s.url, "", { headers: auth });
      const text = await list.text();
      expect(text).not.toContain(reg.secret);
      expect(JSON.parse(text).sessions).toEqual([
        expect.objectContaining({ id: reg.id, caseHandle: "case-0abc123", title: "Chest pain in the ED", facilityId: "general-hospital", embodiment: "embodied", connected: false, pendingCalls: 0 }),
      ]);
      expect((await api(s.url, `/${reg.id}/call`, { body: { correlationId: "c1", tool: "observe_world" } })).status).toBe(401);
      // The browser's channel needs the token too (cookie or Bearer) — the secret alone is not enough.
      expect((await api(s.url, `/${reg.id}/commands`, { headers: { [CHANNEL]: reg.secret } })).status).toBe(401);
      const health = await json(await fetch(new URL("api/health", s.url), { headers: auth }));
      expect(health).toMatchObject({ worldBridge: true });
    } finally {
      await s.close();
    }
  });

  it("validates registrations: media type, size, fields, tools; caps the number of sessions", async () => {
    const s = await serve({ world: { maxSessions: 2 } });
    try {
      const code = async (res: Response) => [res.status, (await json(res)).error.code];
      expect(await code(await api(s.url, "", { body: "{}", headers: { "content-type": "text/plain" } }))).toEqual([415, "unsupported_media_type"]);
      expect(await code(await api(s.url, "", { body: { ...REGISTRATION, title: "x".repeat(20_000) } }))).toEqual([413, "body_too_large"]);
      expect(await code(await api(s.url, "", { body: "{nope" }))).toEqual([400, "bad_json"]);
      for (const bad of [{ caseHandle: "stemi inferior/rv" }, { embodiment: "ghost" }, { locale: "fr" }, { capabilities: ["observe_world", "rm_rf"] }, { capabilities: "observe_world" }, { facilityId: "../etc" }]) {
        expect(await code(await api(s.url, "", { body: { ...REGISTRATION, ...bad } })), JSON.stringify(bad)).toEqual([400, "bad_request"]);
      }
      // A title loses control characters and escape sequences (shown in an agent's terminal).
      const reg = await register(s.url, { ...REGISTRATION, title: "Chest\u001b[31m pain\u0007" });
      expect((await json(await api(s.url, `/${reg.id}`))).title).toBe("Chest pain");
      expect((await api(s.url, "", { method: "PUT", body: REGISTRATION })).status).toBe(405);

      // Two sessions, both connected: a third is refused; once one disconnects, it makes room.
      const other = await register(s.url);
      const a = new FakeBrowser(s.url, reg);
      const b = new FakeBrowser(s.url, other);
      await a.open();
      await b.open();
      expect(await code(await api(s.url, "", { body: REGISTRATION }))).toEqual([429, "too_many_sessions"]);
      b.close();
      await until(() => b.ended);
      await new Promise((r) => setTimeout(r, 50));
      const third = await register(s.url);
      const ids = (await json(await api(s.url, ""))).sessions.map((x: { id: string }) => x.id);
      expect(ids.sort()).toEqual([reg.id, third.id].sort());
      a.close();
    } finally {
      await s.close();
    }
  });

  it("channel routes need the session's secret; unknown and malformed ids are 404", async () => {
    const s = await serve();
    try {
      const reg = await register(s.url);
      const other = await register(s.url);
      for (const [action, method] of [["commands", "GET"], ["results", "POST"], ["heartbeat", "POST"], ["", "DELETE"]] as const) {
        const path = `/${reg.id}${action ? `/${action}` : ""}`;
        const body = method === "POST" ? { correlationId: "c1", kind: "ack" } : undefined;
        for (const secret of [undefined, "wrong-secret", other.secret]) {
          const res = await api(s.url, path, { method, ...(body ? { body } : {}), headers: secret ? { [CHANNEL]: secret } : {} });
          expect([action, secret ? "bad" : "none", res.status, (await json(res)).error.code]).toEqual([action, secret ? "bad" : "none", 403, "forbidden_channel"]);
        }
      }
      expect((await api(s.url, `/${reg.id}`)).status).toBe(200); // attach clients read a session without a secret
      for (const id of ["ls_doesnotexist0000", "..%2F..%2Fetc", "%00"]) {
        const res = await api(s.url, `/${id}/call`, { body: { correlationId: "c1", tool: "observe_world" } });
        expect(res.status).toBe(404);
        expect((await json(res)).error.code).toBe("unknown_session");
      }
      expect((await api(s.url, `/${reg.id}/nope`)).status).toBe(404);
      expect((await api(s.url, `/${reg.id}/commands/extra`)).status).toBe(404);
      expect((await api(s.url, `/${reg.id}/call`)).status).toBe(405);
      expect((await fetch(new URL("api/world/other", s.url))).status).toBe(404);
    } finally {
      await s.close();
    }
  });
});

describe("world bridge: calls", () => {
  it("routes a call to the browser and the result back; acknowledges; dedupes by correlation id; refuses conflicts", async () => {
    const s = await serve();
    try {
      const reg = await register(s.url, { ...REGISTRATION, capabilities: ["observe_world", "navigate_to"] });
      const browser = new FakeBrowser(s.url, reg);
      await browser.open();
      expect(browser.events[0]).toEqual({ event: "hello", data: { id: reg.id, heartbeatMs: 10_000, expireAfterMs: 45_000, pingMs: 10_000 } });
      expect((await json(await api(s.url, `/${reg.id}`))).connected).toBe(true);

      const first = api(s.url, `/${reg.id}/call`, { body: { correlationId: "c-1", tool: "observe_world", args: { max_entities: 5 } } });
      await until(() => browser.commands().length === 1);
      const command = browser.commands()[0];
      expect(command).toMatchObject({ type: "call", correlationId: "c-1", tool: "observe_world", args: { max_entities: 5 } });
      expect(command.deadline).toBeGreaterThan(Date.now());
      expect(await json(await browser.post("results", { correlationId: "c-1", kind: "ack" }))).toEqual({ ok: true });
      expect((await json(await api(s.url, `/${reg.id}`))).pendingCalls).toBe(1);
      // The same correlation id again while pending: joins the call (no second command).
      const joined = api(s.url, `/${reg.id}/call`, { body: { correlationId: "c-1", tool: "observe_world", args: { max_entities: 5 } } });
      await new Promise((r) => setTimeout(r, 50));
      expect(browser.commands()).toHaveLength(1);
      expect(await json(await browser.post("results", { correlationId: "c-1", kind: "result", result: OK }))).toEqual({ ok: true, accepted: true });
      expect(await json(await first)).toEqual({ correlationId: "c-1", result: OK, deduplicated: false });
      expect(await json(await joined)).toEqual({ correlationId: "c-1", result: OK, deduplicated: true });
      // … and after it finished: answered from the stored result.
      expect(await json(await api(s.url, `/${reg.id}/call`, { body: { correlationId: "c-1", tool: "observe_world", args: { max_entities: 5 } } }))).toEqual({ correlationId: "c-1", result: OK, deduplicated: true });
      const conflict = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "c-1", tool: "observe_world", args: { max_entities: 6 } } });
      expect([conflict.status, (await json(conflict)).error.code]).toEqual([409, "correlation_conflict"]);
      expect(browser.commands()).toHaveLength(1);

      // A late or repeated result is accepted and dropped; a malformed one is refused.
      expect(await json(await browser.post("results", { correlationId: "c-1", kind: "result", result: OK }))).toEqual({ ok: true, accepted: false });
      expect((await browser.post("results", { correlationId: "c-2", kind: "result", result: { ok: true, status: "maybe", output: "" } })).status).toBe(400);
      expect((await browser.post("results", { correlationId: "c-2", kind: "result", result: { ...OK, output: "x".repeat(200_001) } })).status).toBe(400);
      expect((await browser.post("results", { correlationId: "bad id!", kind: "ack" })).status).toBe(400);

      // Tools the session does not accept, unknown tools, bad arguments and timeouts are refused up front.
      const refused = async (body: unknown) => {
        const res = await api(s.url, `/${reg.id}/call`, { body });
        return [res.status, (await json(res)).error.code];
      };
      expect(await refused({ correlationId: "c-3", tool: "intervene", args: {} })).toEqual([400, "tool_not_available"]);
      expect(await refused({ correlationId: "c-3", tool: "rm_rf" })).toEqual([400, "bad_request"]);
      expect(await refused({ correlationId: "c-3", tool: "observe_world", args: [1] })).toEqual([400, "bad_request"]);
      expect(await refused({ correlationId: "c 3", tool: "observe_world" })).toEqual([400, "bad_request"]);
      expect(await refused({ correlationId: "c-3", tool: "observe_world", timeoutMs: 10 })).toEqual([400, "bad_request"]);
      expect(await refused({ correlationId: "c-3", tool: "observe_world", timeoutMs: 3_600_000 })).toEqual([400, "bad_request"]);
      browser.close();
    } finally {
      await s.close();
    }
  });

  it("times out (504, acknowledged or not) and sends the browser a cancel; a browser that is not connected is reported", async () => {
    const s = await serve({ world: { connectGraceMs: 300 } });
    try {
      const reg = await register(s.url);
      const browser = new FakeBrowser(s.url, reg);
      await browser.open();
      const acked = api(s.url, `/${reg.id}/call`, { body: { correlationId: "t-1", tool: "navigate_to", args: { target: "patient" }, timeoutMs: 1000 } });
      await until(() => browser.commands().length === 1);
      await browser.post("results", { correlationId: "t-1", kind: "ack" });
      const res = await acked;
      expect(res.status).toBe(504);
      expect((await json(res)).error).toMatchObject({ code: "call_timeout", acknowledged: true });
      await until(() => browser.commands().length === 2);
      expect(browser.commands()[1]).toEqual({ type: "cancel", correlationId: "t-1" });
      // The browser's final (cancelled) result is still stored: the same correlation id gets it.
      await browser.post("results", { correlationId: "t-1", kind: "result", result: { ok: false, status: "cancelled", output: "cancelled" } });
      expect((await json(await api(s.url, `/${reg.id}/call`, { body: { correlationId: "t-1", tool: "navigate_to", args: { target: "patient" } } }))).result.status).toBe("cancelled");

      const unacked = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "t-2", tool: "observe_world", timeoutMs: 1000 } });
      expect(unacked.status).toBe(504);
      expect((await json(unacked)).error).toMatchObject({ code: "call_timeout", acknowledged: false });
      browser.close();
      await until(() => browser.ended);
      await new Promise((r) => setTimeout(r, 50));
      const lonely = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "t-3", tool: "observe_world" } });
      expect([lonely.status, (await json(lonely)).error.code]).toEqual([503, "not_connected"]);
    } finally {
      await s.close();
    }
  });

  it("cancels: by POST …/cancel (the browser's cancelled result answers the caller) and when the caller goes away", async () => {
    const s = await serve({ world: { connectGraceMs: 60_000 } });
    try {
      const reg = await register(s.url);
      const browser = new FakeBrowser(s.url, reg);
      await browser.open();
      const waiting = api(s.url, `/${reg.id}/call`, { body: { correlationId: "x-1", tool: "intervene", args: { intervention_id: "ticagrelor" } } });
      await until(() => browser.commands().length === 1);
      expect(await json(await api(s.url, `/${reg.id}/cancel`, { body: { correlationId: "x-1" } }))).toEqual({ ok: true, cancelled: true });
      await until(() => browser.commands().length === 2);
      expect(browser.commands()[1]).toEqual({ type: "cancel", correlationId: "x-1" });
      expect(await json(await api(s.url, `/${reg.id}/cancel`, { body: { correlationId: "x-1" } }))).toEqual({ ok: true, cancelled: false });
      await browser.post("results", { correlationId: "x-1", kind: "result", result: { ok: false, status: "cancelled", output: "The call was cancelled." } });
      expect((await json(await waiting)).result).toMatchObject({ status: "cancelled" });

      // The caller aborts its request (MCP notifications/cancelled, a crash): nobody waits any more → cancel.
      const controller = new AbortController();
      const gone = api(s.url, `/${reg.id}/call`, { body: { correlationId: "x-2", tool: "observe_world" }, signal: controller.signal }).catch(() => null);
      await until(() => browser.commands().length === 3);
      controller.abort();
      await gone;
      await until(() => browser.commands().length === 4);
      expect(browser.commands()[3]).toEqual({ type: "cancel", correlationId: "x-2" });
      browser.close();

      // Never delivered (the browser is away): cancelling answers the caller at once — nothing ran.
      await until(() => browser.ended);
      await new Promise((r) => setTimeout(r, 50));
      const undelivered = api(s.url, `/${reg.id}/call`, { body: { correlationId: "x-3", tool: "observe_world" } });
      await new Promise((r) => setTimeout(r, 50));
      await api(s.url, `/${reg.id}/cancel`, { body: { correlationId: "x-3" } });
      const res = await undelivered;
      expect([res.status, (await json(res)).error.code]).toEqual([409, "call_cancelled"]);
    } finally {
      await s.close();
    }
  });

  it("re-delivers pending calls to a reconnecting browser; a new stream replaces the old one", async () => {
    const s = await serve();
    try {
      const reg = await register(s.url);
      const first = new FakeBrowser(s.url, reg);
      await first.open();
      const waiting = api(s.url, `/${reg.id}/call`, { body: { correlationId: "r-1", tool: "observe_world" } });
      await until(() => first.commands().length === 1);
      const second = new FakeBrowser(s.url, reg);
      await second.open();
      await until(() => first.ended);
      expect(first.events.at(-1)).toEqual({ event: "closed", data: { reason: "replaced" } });
      expect(second.commands()).toEqual([expect.objectContaining({ type: "call", correlationId: "r-1" })]);
      await second.post("results", { correlationId: "r-1", kind: "result", result: OK });
      expect((await json(await waiting)).result).toEqual(OK);
      second.close();
    } finally {
      await s.close();
    }
  });
});

describe("world bridge: lifetime and limits", () => {
  it("expires a session after missed heartbeats (its calls end, later calls are refused); heartbeats keep one alive", async () => {
    const s = await serve({ world: { expireAfterMs: 400, sweepMs: 25, connectGraceMs: 60_000 } });
    try {
      const silent = await register(s.url);
      const alive = await register(s.url);
      const pending = api(s.url, `/${silent.id}/call`, { body: { correlationId: "e-1", tool: "observe_world" } });
      const beat = setInterval(() => void api(s.url, `/${alive.id}/heartbeat`, { body: { capabilities: ["observe_world"] }, headers: { [CHANNEL]: alive.secret } }), 100);
      try {
        const res = await pending;
        expect([res.status, (await json(res)).error.code]).toEqual([410, "session_expired"]);
        const later = await api(s.url, `/${silent.id}/call`, { body: { correlationId: "e-2", tool: "observe_world" } });
        expect([later.status, (await json(later)).error.code]).toEqual([410, "session_expired"]);
        await new Promise((r) => setTimeout(r, 450));
        const listed = (await json(await api(s.url, ""))).sessions;
        expect(listed.map((x: { id: string }) => x.id)).toEqual([alive.id]);
        // The heartbeat refreshed the tools the session accepts.
        expect(listed[0].capabilities).toEqual(["observe_world"]);
      } finally {
        clearInterval(beat);
      }
      const bad = await api(s.url, `/${alive.id}/heartbeat`, { body: { capabilities: ["format_disk"] }, headers: { [CHANNEL]: alive.secret } });
      expect(bad.status).toBe(400);
    } finally {
      await s.close();
    }
  });

  it("DELETE unregisters: the stream ends `closed`, waiting calls get session_closed, later calls are refused", async () => {
    const s = await serve();
    try {
      const reg = await register(s.url);
      const browser = new FakeBrowser(s.url, reg);
      await browser.open();
      const waiting = api(s.url, `/${reg.id}/call`, { body: { correlationId: "d-1", tool: "observe_world" } });
      await until(() => browser.commands().length === 1);
      expect(await json(await api(s.url, `/${reg.id}`, { method: "DELETE", headers: { [CHANNEL]: reg.secret } }))).toEqual({ ok: true });
      const res = await waiting;
      expect([res.status, (await json(res)).error.code]).toEqual([410, "session_closed"]);
      await until(() => browser.ended);
      expect(browser.events.at(-1)).toEqual({ event: "closed", data: { reason: "unregistered" } });
      const later = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "d-2", tool: "observe_world" } });
      expect([later.status, (await json(later)).error.code]).toEqual([410, "session_closed"]);
      expect((await json(await api(s.url, ""))).sessions).toEqual([]);
    } finally {
      await s.close();
    }
  });

  it("bounds call bodies and pending calls; keeps CORS closed (the channel header is not offered cross-origin)", async () => {
    const s = await serve({ maxBodyBytes: 64 * 1024, world: { maxPendingCalls: 2, connectGraceMs: 60_000 } });
    try {
      const reg = await register(s.url);
      const big = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "b-1", tool: "observe_world", args: { pad: "x".repeat(70 * 1024) } } });
      expect([big.status, (await json(big)).error.code]).toEqual([413, "body_too_large"]);
      const controllers = [new AbortController(), new AbortController()];
      const held = controllers.map((c, i) => api(s.url, `/${reg.id}/call`, { body: { correlationId: `p-${i}`, tool: "observe_world" }, signal: c.signal }).catch(() => null));
      await until(() => true);
      await new Promise((r) => setTimeout(r, 50));
      const third = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "p-2", tool: "observe_world" } });
      expect([third.status, (await json(third)).error.code]).toEqual([429, "too_many_calls"]);
      // Repeats of a pending correlation id wait with it — at most 8 requests per call.
      const joiners = Array.from({ length: 7 }, () => new AbortController());
      const joined = joiners.map((c) => api(s.url, `/${reg.id}/call`, { body: { correlationId: "p-0", tool: "observe_world" }, signal: c.signal }).catch(() => null));
      await new Promise((r) => setTimeout(r, 100));
      const ninth = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "p-0", tool: "observe_world" } });
      expect([ninth.status, (await json(ninth)).error.code]).toEqual([429, "too_many_calls"]);
      for (const c of [...controllers, ...joiners]) c.abort();
      await Promise.all([...held, ...joined]);

      const evil = await api(s.url, "", { body: REGISTRATION, headers: { origin: "https://evil.example" } });
      expect(evil.status).toBe(403);
      expect(evil.headers.get("access-control-allow-origin")).toBeNull();
      const preflight = await fetch(new URL(`api/world/sessions/${reg.id}/commands`, s.url), {
        method: "OPTIONS",
        headers: { origin: "http://localhost:5173", "access-control-request-method": "GET", "access-control-request-headers": CHANNEL },
      });
      expect(preflight.headers.get("access-control-allow-headers") ?? "").not.toContain(CHANNEL);
    } finally {
      await s.close();
    }
  });

  it("closing the server ends streams and answers waiting calls", async () => {
    const s = await serve();
    const reg = await register(s.url);
    const browser = new FakeBrowser(s.url, reg);
    await browser.open();
    const waiting = api(s.url, `/${reg.id}/call`, { body: { correlationId: "z-1", tool: "observe_world" } }).then(
      async (res) => [res.status, (await json(res)).error.code],
      () => "dropped",
    );
    await until(() => browser.commands().length === 1);
    await s.close();
    expect(await waiting).toEqual([503, "server_closing"]);
    await until(() => browser.ended);
    expect(browser.events.some((e) => e.event === "closed" && e.data.reason === "server_closing")).toBe(true);
  });
});
