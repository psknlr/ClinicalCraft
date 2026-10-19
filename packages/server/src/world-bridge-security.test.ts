/**
 * World bridge hardening (review R1: S5, S9, S10, S11 — server side) over
 * real HTTP with a hand-driven browser channel. Each block started as the
 * reviewer's reproduction and is kept as a regression test:
 *
 * - S5  attach keys: a live session is visible to, readable and callable by
 *       the holder of ITS attach key only (the server token alone is not
 *       enough); registrations per client are capped; a re-registration keeps
 *       its id only for the same key.
 * - S9  backpressure: a call's arguments are capped well below the body
 *       limit; calls written to a stream are bounded by an unacknowledged-bytes
 *       window; a replaced stream is destroyed; stream re-opens are
 *       rate-limited — a channel holder that never reads cannot make the
 *       server buffer every (re)delivered call.
 * - S10 the world routes get no dev-origin CORS exception; attach routes take
 *       the token from the Authorization header only (never the ambient cookie).
 * - S11 a cancel the browser missed (stream down) is re-sent on every new
 *       stream until the browser answers it; the timeout message says an
 *       acknowledged call may still run.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import { connect, type AddressInfo, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ATTACH_KEY_HEADER, BRIDGE_TOOLS, mergeSettings, newAttachKey, parseSSE } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { createRequestHandler, type RequestHandler, type ServerOptions } from "./server.js";
import type { WorldSessionRouterOptions } from "./world-sessions.js";

const root = mkdtempSync(join(tmpdir(), "cc-world-security-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent({ cases: false });
const TOKEN = "classroom-token-0123456789";
const CHANNEL = "x-clinicalcraft-channel";

interface Served {
  url: string;
  port: number;
  handler: RequestHandler;
  close(): Promise<void>;
}

async function serve(opts: Partial<ServerOptions> & { world?: WorldSessionRouterOptions } = {}): Promise<Served> {
  const { world, ...rest } = opts;
  const settings = mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false } } }]);
  const handler = createRequestHandler({ host: "127.0.0.1", settings, content, env: { CLINICALCRAFT_HOME: join(root, "srv") }, log: () => undefined, ...(world ? { worldSessions: world } : {}), ...rest });
  const server: Server = createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}/`,
    port,
    handler,
    close: async () => {
      await handler.close();
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}

function registration(attachKey = newAttachKey(), extra: Record<string, unknown> = {}) {
  return { caseHandle: "case-0abc123", title: "Chest pain in the ED", facilityId: "general-hospital", embodiment: "embodied", locale: "en", capabilities: [...BRIDGE_TOOLS], attachKey, ...extra };
}

function api(base: string, path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal } = {}): Promise<Response> {
  return fetch(new URL(`api/world/sessions${path}`, base), {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers: { ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) },
    ...(init.body !== undefined ? { body: typeof init.body === "string" ? init.body : JSON.stringify(init.body) } : {}),
    ...(init.signal ? { signal: init.signal } : {}),
  });
}

async function json(res: Response): Promise<any> {
  return res.json();
}

async function register(base: string, body: Record<string, unknown> = registration(), headers: Record<string, string> = {}): Promise<{ id: string; secret: string; key: string }> {
  const res = await api(base, "", { body, headers });
  expect(res.status, JSON.stringify(await res.clone().json())).toBe(201);
  return { ...(await json(res)), key: body.attachKey as string };
}

async function until(predicate: () => boolean, ms = 5000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}

/** The browser's side of the channel, by hand. */
class FakeBrowser {
  readonly events: { event: string; data: any }[] = [];
  private controller = new AbortController();
  ended = false;

  constructor(
    readonly base: string,
    readonly reg: { id: string; secret: string },
    readonly headers: Record<string, string> = {},
  ) {}

  async open(): Promise<number> {
    this.controller = new AbortController();
    this.ended = false;
    const res = await api(this.base, `/${this.reg.id}/commands`, { headers: { ...this.headers, [CHANNEL]: this.reg.secret }, signal: this.controller.signal });
    if (!res.ok) return res.status;
    const before = this.events.filter((e) => e.event === "hello").length;
    void (async () => {
      try {
        for await (const m of parseSSE(res.body!, { signal: this.controller.signal, stopOnDone: false })) this.events.push({ event: m.event ?? "message", data: JSON.parse(m.data) });
      } catch {
        /* aborted */
      }
      this.ended = true;
    })();
    await until(() => this.events.filter((e) => e.event === "hello").length > before);
    return res.status;
  }

  commands(): any[] {
    return this.events.filter((e) => e.event === "command").map((e) => e.data);
  }

  post(action: string, body: unknown): Promise<Response> {
    return api(this.base, `/${this.reg.id}/${action}`, { body, headers: { ...this.headers, [CHANNEL]: this.reg.secret } });
  }

  close(): void {
    this.controller.abort();
  }
}

/** An attach client's headers: the server token as Bearer (when given) and the attach key. */
function attach(key: string | null, token: string | null = null): Record<string, string> {
  return { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(key ? { [ATTACH_KEY_HEADER]: key } : {}) };
}

/** A raw HTTP request (explicit Host / Origin / Cookie headers). */
function raw(port: number, method: string, path: string, headers: Record<string, string>, body?: string): Promise<{ status: number; headers: Record<string, unknown>; body: string }> {
  return new Promise((resolve, reject) => {
    const r = httpRequest({ host: "127.0.0.1", port, method, path, headers }, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body: b }));
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

describe("S5 — a live session belongs to the holder of its attach key", () => {
  it("lists, reads, calls and cancels only with the session's own key; the server token alone gets nothing", async () => {
    const s = await serve({ host: "0.0.0.0", token: TOKEN, world: { connectGraceMs: 60_000 } });
    const bearer = { authorization: `Bearer ${TOKEN}` };
    try {
      const a = await register(s.url, registration(), bearer);
      const b = await register(s.url, registration(), bearer);
      const browserB = new FakeBrowser(s.url, b, bearer);
      await browserB.open();

      // No key: an empty list, and no way into a session.
      expect((await json(await api(s.url, "", { headers: attach(null, TOKEN) }))).sessions).toEqual([]);
      for (const [path, init] of [[`/${b.id}`, {}], [`/${b.id}/call`, { body: { correlationId: "x1", tool: "intervene", args: { intervention_id: "fluid-bolus" } } }], [`/${b.id}/cancel`, { body: { correlationId: "x1" } }]] as const) {
        for (const key of [null, a.key, newAttachKey(), "not-a-key"]) {
          const res = await api(s.url, path, { ...init, headers: attach(key, TOKEN) });
          expect([path, key === null ? "none" : "other", res.status, (await json(res)).error.code]).toEqual([path, key === null ? "none" : "other", 403, "forbidden_attach_key"]);
        }
      }
      // A's key shows A only; B's key shows B only.
      expect((await json(await api(s.url, "", { headers: attach(a.key, TOKEN) }))).sessions.map((x: { id: string }) => x.id)).toEqual([a.id]);
      expect((await json(await api(s.url, "", { headers: attach(b.key, TOKEN) }))).sessions.map((x: { id: string }) => x.id)).toEqual([b.id]);
      // Nothing reached B's browser from A's key.
      expect(browserB.commands()).toEqual([]);

      // With its own key the call goes through (and the key never shows in a listing or a command).
      const call = api(s.url, `/${b.id}/call`, { body: { correlationId: "ok-1", tool: "observe_world" }, headers: attach(b.key, TOKEN) });
      await until(() => browserB.commands().length === 1);
      expect(JSON.stringify(browserB.events)).not.toContain(b.key);
      await browserB.post("results", { correlationId: "ok-1", kind: "result", result: { ok: true, status: "ok", output: "You are in the Resuscitation Room." } });
      expect((await json(await call)).result.status).toBe("ok");
      const listed = await (await api(s.url, "", { headers: attach(b.key, TOKEN) })).text();
      expect(listed).not.toContain(b.key);
      expect(listed).not.toContain(b.secret);
      browserB.close();
    } finally {
      await s.close();
    }
  });

  it("registrations need a well-formed attach key; one client address holds a bounded number of sessions", async () => {
    const s = await serve({ world: { maxSessionsPerClient: 2, maxSessions: 16 } });
    try {
      for (const bad of [{ attachKey: undefined }, { attachKey: "" }, { attachKey: "ak_short" }, { attachKey: 42 }]) {
        const res = await api(s.url, "", { body: registration(undefined, bad) });
        expect([JSON.stringify(bad), res.status, (await json(res)).error.code]).toEqual([JSON.stringify(bad), 400, "bad_request"]);
      }
      const first = await register(s.url);
      const second = await register(s.url);
      const one = new FakeBrowser(s.url, first);
      const two = new FakeBrowser(s.url, second);
      await one.open();
      await two.open();
      // Both connected: a third from the same client is refused…
      const third = await api(s.url, "", { body: registration() });
      expect([third.status, (await json(third)).error.code]).toEqual([429, "too_many_sessions"]);
      // … once one of them has no stream, the client's own idle session makes room.
      two.close();
      await until(() => two.ended);
      await new Promise((r) => setTimeout(r, 50));
      const fourth = await register(s.url);
      const ids = (await json(await api(s.url, "", { headers: attach(fourth.key) }))).sessions.map((x: { id: string }) => x.id);
      expect(ids).toEqual([fourth.id]);
      const gone = await api(s.url, `/${second.id}`, { headers: attach(second.key) });
      expect([gone.status, (await json(gone)).error.code]).toEqual([410, "session_expired"]);
      one.close();
    } finally {
      await s.close();
    }
  });

  it("a re-registration keeps its id for the same key (the external agent keeps --world-session), never for another key", async () => {
    const s = await serve({ world: { expireAfterMs: 200, sweepMs: 20 } });
    try {
      const key = newAttachKey();
      const first = await register(s.url, registration(key));
      await new Promise((r) => setTimeout(r, 350)); // no heartbeat: expired
      expect((await api(s.url, `/${first.id}`, { headers: attach(key) })).status).toBe(410);
      // Someone else asks for that id with their own key: a fresh id.
      const squatter = await register(s.url, registration(newAttachKey(), { previousId: first.id }));
      expect(squatter.id).not.toBe(first.id);
      // The learner's browser comes back with the same key: the same id again.
      const again = await register(s.url, registration(key, { previousId: first.id }));
      expect(again.id).toBe(first.id);
      expect((await json(await api(s.url, `/${first.id}`, { headers: attach(key) }))).id).toBe(first.id);
      // An id in use is never handed out twice; a made-up one is ignored.
      const other = await register(s.url, registration(key, { previousId: first.id }));
      expect(other.id).not.toBe(first.id);
      const madeUp = await register(s.url, registration(newAttachKey(), { previousId: "ls_mine-mine-mine-mi" }));
      expect(madeUp.id).not.toBe("ls_mine-mine-mine-mi");
    } finally {
      await s.close();
    }
  });
});

describe("S10 — no CORS exception, no ambient cookie for the bridge", () => {
  it("dev origins (localhost:5173–5199) get no access to the world routes; other APIs keep the dev exception", async () => {
    const s = await serve({ host: "0.0.0.0", token: TOKEN });
    try {
      const host = `127.0.0.1:${s.port}`;
      const origin = "http://localhost:5173";
      const pre = await raw(s.port, "OPTIONS", "/api/world/sessions", { host, origin, "access-control-request-method": "POST", "access-control-request-headers": "content-type" });
      expect(pre.status).toBe(403);
      expect(pre.headers["access-control-allow-origin"]).toBeUndefined();
      const list = await raw(s.port, "GET", "/api/world/sessions", { host, origin, cookie: `cc_token=${TOKEN}` });
      expect([list.status, JSON.parse(list.body).error.code]).toEqual([403, "forbidden_origin"]);
      expect(list.headers["access-control-allow-origin"]).toBeUndefined();
      const reg = await raw(s.port, "POST", "/api/world/sessions", { host, origin, cookie: `cc_token=${TOKEN}`, "content-type": "application/json" }, JSON.stringify(registration()));
      expect([reg.status, JSON.parse(reg.body).error.code]).toEqual([403, "forbidden_origin"]);
      // The content API keeps its dev-server exception (the Vite dev page reads it).
      const health = await raw(s.port, "GET", "/api/health", { host, origin, cookie: `cc_token=${TOKEN}` });
      expect(health.status).toBe(200);
      expect(health.headers["access-control-allow-origin"]).toBe(origin);
    } finally {
      await s.close();
    }
  });

  it("the browser's routes take the page's cookie; the attach routes only the Authorization header", async () => {
    const s = await serve({ host: "0.0.0.0", token: TOKEN });
    try {
      const host = `127.0.0.1:${s.port}`;
      const cookie = `cc_token=${TOKEN}`;
      // The page (same origin, its cookie): registration and the channel routes work.
      const regRes = await raw(s.port, "POST", "/api/world/sessions", { host, cookie, "content-type": "application/json" }, JSON.stringify(registration()));
      expect(regRes.status).toBe(201);
      const reg = JSON.parse(regRes.body) as { id: string; secret: string };
      const key = newAttachKey(); // not this session's: the cookie path is refused before the key is even looked at
      const beat = await raw(s.port, "POST", `/api/world/sessions/${reg.id}/heartbeat`, { host, cookie, [CHANNEL]: reg.secret, "content-type": "application/json" }, "{}");
      expect(beat.status).toBe(200);
      // An attach client riding the cookie (or a ?token= query) is refused before anything else.
      for (const [path, method, body] of [["/api/world/sessions", "GET", undefined], [`/api/world/sessions/${reg.id}`, "GET", undefined], [`/api/world/sessions/${reg.id}/call`, "POST", JSON.stringify({ correlationId: "c1", tool: "observe_world" })], [`/api/world/sessions/${reg.id}/cancel`, "POST", JSON.stringify({ correlationId: "c1" })]] as const) {
        const viaCookie = await raw(s.port, method, path, { host, cookie, [ATTACH_KEY_HEADER]: key, ...(body ? { "content-type": "application/json" } : {}) }, body);
        expect([path, "cookie", viaCookie.status, JSON.parse(viaCookie.body).error.code]).toEqual([path, "cookie", 401, "unauthorized"]);
        const viaQuery = await raw(s.port, method, `${path}?token=${TOKEN}`, { host, [ATTACH_KEY_HEADER]: key, ...(body ? { "content-type": "application/json" } : {}) }, body);
        expect([path, "query", viaQuery.status]).toEqual([path, "query", 401]);
      }
      // With Bearer the attach route answers (here: the key is not this session's).
      const bearer = await raw(s.port, "GET", `/api/world/sessions/${reg.id}`, { host, authorization: `Bearer ${TOKEN}`, [ATTACH_KEY_HEADER]: key });
      expect([bearer.status, JSON.parse(bearer.body).error.code]).toEqual([403, "forbidden_attach_key"]);
    } finally {
      await s.close();
    }
  });
});

describe("S9 — a channel holder that never reads cannot make the server buffer every call", () => {
  it("caps a call's arguments well below the body limit", async () => {
    const s = await serve({ world: { connectGraceMs: 60_000 } });
    try {
      const reg = await register(s.url);
      const huge = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "big-1", tool: "navigate_to", args: { target: "x".repeat(1_900_000) } }, headers: attach(reg.key) });
      expect(huge.status).toBe(413);
      const over = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "big-2", tool: "navigate_to", args: { target: "x".repeat(70 * 1024) } }, headers: attach(reg.key) });
      expect([over.status, (await json(over)).error.code]).toEqual([413, "args_too_large"]);
    } finally {
      await s.close();
    }
  });

  it("bounds what is written to a stream by an acknowledgement window; acks let the rest through", async () => {
    const s = await serve({ world: { streamWindowBytes: 64 * 1024, connectGraceMs: 60_000 } });
    try {
      const reg = await register(s.url);
      const browser = new FakeBrowser(s.url, reg);
      await browser.open();
      const pad = "p".repeat(20 * 1024);
      const calls = Array.from({ length: 8 }, (_, i) => api(s.url, `/${reg.id}/call`, { body: { correlationId: `w-${i}`, tool: "navigate_to", args: { target: pad } }, headers: attach(reg.key) }).catch(() => null));
      await until(() => browser.commands().length >= 3);
      await new Promise((r) => setTimeout(r, 300)); // every call has reached the server by now
      // ~20 KiB each, a 64 KiB window: at most 4 unacknowledged calls on the wire, not 8.
      expect(browser.commands().length).toBeLessThanOrEqual(4);
      // Acknowledging what arrived lets the rest through.
      const acked = new Set<string>();
      await until(() => {
        for (const c of browser.commands()) {
          if (c.type !== "call" || acked.has(c.correlationId)) continue;
          acked.add(c.correlationId);
          void browser.post("results", { correlationId: c.correlationId, kind: "ack" });
        }
        return acked.size === 8;
      }, 10_000);
      expect([...acked].sort()).toEqual(Array.from({ length: 8 }, (_, i) => `w-${i}`).sort());
      for (let i = 0; i < 8; i++) await browser.post("results", { correlationId: `w-${i}`, kind: "result", result: { ok: true, status: "ok", output: "ok" } });
      expect((await Promise.all(calls)).every((r) => r?.status === 200)).toBe(true);
      browser.close();
    } finally {
      await s.close();
    }
  });

  it("a non-reading stream: replaced streams are destroyed, re-opens are rate-limited, memory stays bounded (the reviewer's 1.7 GB repro)", async () => {
    const s = await serve({ world: { connectGraceMs: 60_000 } });
    const sockets: Socket[] = [];
    try {
      const reg = await register(s.url);
      const statuses: number[] = [];
      // A raw socket that opens the command stream and never reads.
      const openStream = () =>
        new Promise<void>((resolve) => {
          const sock = connect(s.port, "127.0.0.1", () => {
            sock.pause();
            let head = "";
            const onData = (d: Buffer) => {
              head += d.toString("latin1");
              const m = /^HTTP\/1\.1 (\d{3})/.exec(head);
              if (m) {
                statuses.push(Number(m[1]));
                sock.off("data", onData);
                sock.pause();
                resolve();
              }
            };
            sock.on("data", onData);
            sock.resume();
            sock.write(`GET /api/world/sessions/${reg.id}/commands HTTP/1.1\r\nHost: 127.0.0.1:${s.port}\r\n${CHANNEL}: ${reg.secret}\r\n\r\n`);
          });
          sock.on("error", () => undefined);
          sockets.push(sock);
        });
      await openStream();
      const pad = "x".repeat(60 * 1024); // just below the args limit
      const calls: Promise<unknown>[] = [];
      for (let i = 0; i < 32; i++) calls.push(api(s.url, `/${reg.id}/call`, { body: { correlationId: `c${i}`, tool: "navigate_to", args: { target: pad }, timeoutMs: 600_000 }, headers: attach(reg.key) }).catch(() => null));
      await new Promise((r) => setTimeout(r, 500));
      const m0 = process.memoryUsage();
      for (let k = 0; k < 15; k++) await openStream();
      await new Promise((r) => setTimeout(r, 800));
      const m1 = process.memoryUsage();
      const grown = (m1.rss - m0.rss) / 1048576;
      // re-opens beyond the burst are refused…
      expect(statuses.filter((st) => st === 429).length).toBeGreaterThanOrEqual(5);
      // … replaced streams are gone (one stream at most), and what is held for a stream stays within its window.
      const stats = s.handler.worldSessions.stats();
      expect(stats.openStreams).toBeLessThanOrEqual(1);
      expect(stats.inflightBytes).toBeLessThanOrEqual(1024 * 1024 + 70 * 1024);
      expect(grown).toBeLessThan(150);
    } finally {
      for (const sock of sockets) sock.destroy();
      await s.close();
    }
  });
});

describe("S11 — a call reported as timed out or cancelled does not run later", () => {
  it("re-sends a cancel the browser missed on every new stream until the browser answers it", async () => {
    const s = await serve({ world: { cancelGraceMs: 150, connectGraceMs: 60_000 } });
    try {
      const reg = await register(s.url);
      const browser = new FakeBrowser(s.url, reg);
      await browser.open();
      const waiting = api(s.url, `/${reg.id}/call`, { body: { correlationId: "late-1", tool: "intervene", args: { intervention_id: "aspirin" }, timeoutMs: 1000 }, headers: attach(reg.key) });
      await until(() => browser.commands().length === 1);
      await browser.post("results", { correlationId: "late-1", kind: "ack" });
      browser.close(); // the tab loses its connection with the call queued
      await until(() => browser.ended);
      const res = await waiting;
      expect(res.status).toBe(504);
      const error = (await json(res)).error;
      expect(error).toMatchObject({ code: "call_timeout", acknowledged: true });
      expect(error.message).toMatch(/may still run/);
      await new Promise((r) => setTimeout(r, 300)); // > cancelGrace: the call itself is forgotten…
      await browser.open(); // … but its cancel is not
      await until(() => browser.commands().some((c) => c.type === "cancel" && c.correlationId === "late-1"));
      browser.close();
      await until(() => browser.ended);
      await browser.open(); // still unanswered: sent again
      await until(() => browser.commands().filter((c) => c.type === "cancel" && c.correlationId === "late-1").length === 2);
      // The browser answers it: never sent again.
      await browser.post("results", { correlationId: "late-1", kind: "result", result: { ok: false, status: "cancelled", output: "The call did not run." } });
      browser.close();
      await until(() => browser.ended);
      await browser.open();
      await new Promise((r) => setTimeout(r, 100));
      expect(browser.commands().filter((c) => c.type === "cancel" && c.correlationId === "late-1")).toHaveLength(2);
      browser.close();

      // A call that never reached the browser is not "may still run".
      const unacked = await api(s.url, `/${reg.id}/call`, { body: { correlationId: "late-2", tool: "observe_world", timeoutMs: 1000 }, headers: attach(reg.key) });
      expect((await json(unacked)).error).toMatchObject({ code: "call_timeout", acknowledged: false });
    } finally {
      await s.close();
    }
  });

  it("hello carries the server clock (the browser compares call deadlines with it)", async () => {
    const s = await serve();
    try {
      const reg = await register(s.url);
      const browser = new FakeBrowser(s.url, reg);
      const before = Date.now();
      await browser.open();
      const hello = browser.events.find((e) => e.event === "hello")!.data;
      expect(hello.now).toBeGreaterThanOrEqual(before - 5);
      expect(hello.now).toBeLessThanOrEqual(Date.now() + 5);
      browser.close();
    } finally {
      await s.close();
    }
  });
});
