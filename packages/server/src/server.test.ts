import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { request as httpRequest, createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  mergeSettings,
  ProxyProvider,
  ScriptedProvider,
  textScript,
  type ChatRequest,
  type LLMProvider,
  type ProviderConfig,
  type ResolvedSettings,
  type StreamEvent,
} from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { createRequestHandler, startServer, type RunningServer, type ServerOptions } from "./server.js";
import { TranscriptQuotaError, WebTranscriptStore } from "./transcripts.js";

const root = mkdtempSync(join(tmpdir(), "cc-server-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const SMZL = "smzl-lung-adeno";

const webDir = join(root, "web");
const assetsA = join(root, "assets-a");
const assetsB = join(root, "assets-b");
const home = join(root, "home");
const GZ = gzipSync(Buffer.from("glTF-binary-payload"));
mkdirSync(join(webDir, "assets"), { recursive: true });
mkdirSync(join(assetsA, "cases", SMZL), { recursive: true });
mkdirSync(join(assetsB, "anatomy"), { recursive: true });
mkdirSync(home, { recursive: true });
writeFileSync(join(webDir, "index.html"), "<!doctype html><title>ClinicalCraft</title>");
writeFileSync(join(webDir, "assets", "index-AbCdEf12.js"), "console.log('app');");
writeFileSync(join(webDir, "favicon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
writeFileSync(join(webDir, "model.glb.gz"), GZ);
writeFileSync(join(root, "secret.txt"), "TOP-SECRET");
symlinkSync(join(root, "secret.txt"), join(webDir, "leak.txt"));
writeFileSync(join(assetsA, "cases", SMZL, "fig1.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
writeFileSync(join(assetsB, "anatomy", "anatomy.glb.gz"), GZ);

const env = { CLINICALCRAFT_HOME: home, HOME: home, OPENAI_API_KEY: "sk-test-openai-key-123456" };

function settings(patch: Record<string, unknown> = {}): ResolvedSettings {
  return mergeSettings([{ source: "flag", settings: { locale: "en", ...patch } }]);
}

function baseOptions(extra: Partial<ServerOptions> = {}): ServerOptions {
  return { port: 0, host: "127.0.0.1", settings: settings(), staticDir: webDir, assetDirs: [assetsA, assetsB], content, env, log: () => undefined, ...extra };
}

/** Raw request (no URL normalisation, custom Host header). */
function raw(base: string, path: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: IncomingHttpHeaders; body: Buffer }> {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: u.hostname, port: u.port, path, method: init.method ?? "GET", headers: init.headers ?? {} }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end(init.body);
  });
}

describe("static files and local assets", () => {
  let server: RunningServer;
  beforeAll(async () => {
    server = await startServer(baseOptions());
  });
  afterAll(() => server.close());

  it("serves the web build with MIME types, cache policy, security headers and an index.html fallback", async () => {
    const index = await fetch(server.url);
    expect(index.status).toBe(200);
    expect(index.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(index.headers.get("cache-control")).toBe("no-cache");
    expect(index.headers.get("x-content-type-options")).toBe("nosniff");
    expect(index.headers.get("referrer-policy")).toBe("no-referrer");
    const csp = index.headers.get("content-security-policy")!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toMatch(/connect-src 'self'[^;]*https:\/\/api\.anthropic\.com/);
    expect(csp).not.toContain("unsafe-eval");
    expect(await index.text()).toContain("<title>ClinicalCraft</title>");

    const js = await fetch(new URL("assets/index-AbCdEf12.js", server.url));
    expect(js.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    expect(js.headers.get("cache-control")).toContain("immutable");
    expect((await fetch(new URL("favicon.svg", server.url))).headers.get("content-type")).toBe("image/svg+xml");

    const route = await fetch(new URL("library/smzl", server.url));
    expect(route.status).toBe(200);
    expect(await route.text()).toContain("<title>ClinicalCraft</title>");
    expect((await fetch(new URL("missing.png", server.url))).status).toBe(404);
  });

  it("streams .gz files byte-for-byte without Content-Encoding or ranges", async () => {
    const res = await raw(server.url, "/model.glb.gz", { headers: { "accept-encoding": "gzip", range: "bytes=0-3" } });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/gzip");
    expect(res.headers["content-encoding"]).toBeUndefined();
    expect(res.headers["accept-ranges"]).toBe("none");
    expect(res.headers["content-length"]).toBe(String(GZ.length));
    expect(res.body.equals(GZ)).toBe(true);

    const head = await raw(server.url, "/model.glb.gz", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.body.length).toBe(0);
    expect((await raw(server.url, "/", { method: "POST" })).status).toBe(405);
  });

  it.each([
    "/../secret.txt",
    "/%2e%2e/secret.txt",
    "/..%2fsecret.txt",
    "/%2e%2e%2fsecret.txt",
    "/assets/..%2f..%2fsecret.txt",
    "/assets/..%5c..%5csecret.txt",
    "/%00index.html",
    "/leak.txt",
    "/local-assets/..%2f..%2fsecret.txt",
    "/local-assets/%2e%2e/%2e%2e/secret.txt",
    "/local-assets/../secret.txt",
    "/local-assets//etc/passwd",
  ])("never serves files outside the roots: %s", async (path) => {
    const res = await raw(server.url, path);
    expect(res.body.toString()).not.toContain("TOP-SECRET");
    expect(res.body.toString()).not.toContain("root:");
    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) expect(res.headers["content-type"]).toBe("text/html; charset=utf-8"); // app-shell fallback only
  });

  it("serves local-only assets from the first root that has them; 404 JSON otherwise", async () => {
    const fig = await fetch(new URL(`local-assets/cases/${SMZL}/fig1.png`, server.url));
    expect(fig.status).toBe(200);
    expect(fig.headers.get("content-type")).toBe("image/png");
    const anatomy = await fetch(new URL("local-assets/anatomy/anatomy.glb.gz", server.url));
    expect(anatomy.status).toBe(200);
    expect(anatomy.headers.get("content-encoding")).toBeNull();
    expect(Buffer.from(await anatomy.arrayBuffer()).equals(GZ)).toBe(true);
    const missing = await fetch(new URL("local-assets/cases/x/fig9.png", server.url));
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { error: { code: string } }).error.code).toBe("asset_not_installed");
  });

  it("serves only passive asset types from /local-assets, sandboxed (an SVG/JS/HTML there would run same-origin)", async () => {
    const dir = join(assetsA, "cases", "evil");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "paper.svg"), `<svg xmlns="http://www.w3.org/2000/svg"><script href="/local-assets/cases/evil/steal.js"/></svg>`);
    writeFileSync(join(dir, "steal.js"), "document.title = JSON.stringify(localStorage)");
    writeFileSync(join(dir, "page.html"), "<script>alert(1)</script>");
    writeFileSync(join(dir, "feed.xml"), "<x/>");
    writeFileSync(join(dir, "report.pdf"), "%PDF-1.4");
    symlinkSync(join(dir, "steal.js"), join(dir, "alias.png"));
    for (const name of ["paper.svg", "steal.js", "page.html", "feed.xml", "alias.png"]) {
      const res = await fetch(new URL(`local-assets/cases/evil/${name}`, server.url));
      expect([name, res.status]).toEqual([name, 404]);
    }
    const fig = await fetch(new URL(`local-assets/cases/${SMZL}/fig1.png`, server.url));
    expect(fig.headers.get("content-security-policy")).toMatch(/default-src 'none'.*sandbox/);
    const pdf = await fetch(new URL("local-assets/cases/evil/report.pdf", server.url));
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(pdf.headers.get("content-security-policy")).toContain("script-src 'self'"); // the global policy (no sandbox: browsers block sandboxed PDFs)
  });

  it("answers without a web build with a JSON hint", async () => {
    const apiOnly = await startServer(baseOptions({ staticDir: null }));
    try {
      const res = await fetch(apiOnly.url, { headers: { "accept-language": "zh-CN" } });
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("no_web_build");
      expect(body.error.message).toContain("npm run build");
    } finally {
      await apiOnly.close();
    }
  });
});

describe("content and provider API", () => {
  let server: RunningServer;
  beforeAll(async () => {
    server = await startServer(baseOptions());
  });
  afterAll(() => server.close());

  it("GET /api/health answers JSON", async () => {
    const res = await fetch(new URL("api/health", server.url));
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toMatchObject({ status: "ok", name: "clinicalcraft", provider: "offline", auth: false });
  });

  it("GET /api/content/index lists spoiler-free case summaries in every locale, facilities and catalogs", async () => {
    const index = (await (await fetch(new URL("api/content/index", server.url))).json()) as {
      cases: Record<string, unknown>[];
      facilities: { id: string }[];
      catalogs: { id: string }[];
    };
    const smzl = index.cases.find((c) => c.id === SMZL)!;
    expect(smzl).toBeDefined();
    expect(Object.keys(smzl).sort()).toEqual(
      ["id", "version", "title", "summary", "specialty", "difficulty", "setting", "facility", "estimatedMinutes", "provenance", "tags", "locales"].sort(),
    );
    expect(smzl.title).toMatchObject({ "zh-CN": expect.any(String), en: expect.any(String) });
    expect(smzl.provenance).toEqual({ kind: "published-case" });
    expect(JSON.stringify(index.cases)).not.toContain("solution");
    expect(index.cases.map((c) => c.id)).toEqual([...content.cases.keys()].sort());
    expect(index.facilities.map((f) => f.id)).toContain("general-hospital");
    expect(index.catalogs.length).toBe(content.catalogs.size);
  });

  it("GET /api/content/cases/:id strips the reference solution; unknown ids are 404", async () => {
    const res = await fetch(new URL(`api/content/cases/${SMZL}`, server.url));
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.id).toBe(SMZL);
    expect(body).not.toHaveProperty("solution");
    expect(body).toHaveProperty("history");
    expect((await fetch(new URL("api/content/cases/nope", server.url))).status).toBe(404);
    expect((await fetch(new URL("api/content/cases/..%2f..%2fetc", server.url))).status).toBe(404);
    const facility = await fetch(new URL("api/content/facilities/general-hospital", server.url));
    expect(((await facility.json()) as { id: string }).id).toBe("general-hospital");
    const catalogId = [...content.catalogs.keys()][0]!;
    expect((await fetch(new URL(`api/content/catalogs/${catalogId}`, server.url))).status).toBe(200);
    expect((await fetch(new URL("api/content/catalogs/nope", server.url))).status).toBe(404);
    expect((await fetch(new URL("api/content/index", server.url), { method: "POST" })).status).toBe(405);
    expect((await fetch(new URL("api/nothing", server.url))).status).toBe(404);
  });

  it("GET /api/providers reports configured:boolean and never leaks keys", async () => {
    const res = await fetch(new URL("api/providers", server.url));
    const text = await res.text();
    expect(text).not.toContain(env.OPENAI_API_KEY);
    const body = JSON.parse(text) as { providers: { id: string; configured: boolean }[]; active: { provider: string } };
    const by = new Map(body.providers.map((p) => [p.id, p]));
    expect(by.get("openai")!.configured).toBe(true);
    expect(by.get("anthropic")!.configured).toBe(false);
    expect(by.get("offline")!.configured).toBe(true);
    expect(by.has("proxy")).toBe(false);
    expect(body.active.provider).toBe("offline");
  });
});

describe("security policy", () => {
  /** Run the handler on 127.0.0.1 while it believes it is bound to `host`. */
  async function serveHandler(opts: ServerOptions): Promise<{ url: string; close(): Promise<void> }> {
    const handler = createRequestHandler(opts);
    const server: Server = createServer(handler);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
    return {
      url,
      close: async () => {
        await handler.close();
        server.closeAllConnections();
        await new Promise<void>((r) => server.close(() => r()));
      },
    };
  }

  it("refuses a non-loopback bind without a token", async () => {
    expect(() => createRequestHandler(baseOptions({ host: "0.0.0.0" }))).toThrow(/token/);
    await expect(startServer(baseOptions({ host: "0.0.0.0" }))).rejects.toThrow(/token/);
  });

  it("requires the token for /api/* and /local-assets/* on a non-loopback host (Bearer, ?token=, cookie)", async () => {
    const s = await serveHandler(baseOptions({ host: "0.0.0.0", token: "s3cret-token" }));
    try {
      const health = new URL("api/health", s.url);
      const denied = await fetch(health);
      expect(denied.status).toBe(401);
      expect(denied.headers.get("www-authenticate")).toContain("Bearer");
      expect((await fetch(health, { headers: { authorization: "Bearer wrong" } })).status).toBe(401);
      expect((await fetch(new URL("api/health?token=wrong", s.url))).status).toBe(401);
      const bearer = await fetch(health, { headers: { authorization: "Bearer s3cret-token" } });
      expect(bearer.status).toBe(200);
      expect(await bearer.json()).toMatchObject({ auth: true });

      const viaQuery = await fetch(new URL("api/health?token=s3cret-token", s.url));
      expect(viaQuery.status).toBe(200);
      const cookie = viaQuery.headers.get("set-cookie")!;
      expect(cookie).toMatch(/^cc_token=s3cret-token; Path=\/; HttpOnly; SameSite=Strict/);
      expect((await fetch(health, { headers: { cookie: cookie.split(";")[0]! } })).status).toBe(200);

      expect((await fetch(new URL(`local-assets/cases/${SMZL}/fig1.png`, s.url))).status).toBe(401);
      expect((await fetch(new URL(`local-assets/cases/${SMZL}/fig1.png?token=s3cret-token`, s.url))).status).toBe(200);
      // The app shell itself is public; any Host is fine on a non-loopback bind.
      expect((await raw(s.url, "/", { headers: { host: "clinic.lan:5178" } })).status).toBe(200);
    } finally {
      await s.close();
    }
  });

  it("rejects non-loopback Host headers on a loopback-only server (DNS rebinding)", async () => {
    const s = await serveHandler(baseOptions());
    try {
      expect((await raw(s.url, "/api/health", { headers: { host: "evil.example:5178" } })).status).toBe(403);
      expect((await raw(s.url, "/", { headers: { host: "evil.example" } })).status).toBe(403);
      expect((await raw(s.url, "/api/health", { headers: { host: "localhost:5178" } })).status).toBe(200);
      expect((await raw(s.url, "/api/health", { headers: { host: "[::1]:5178" } })).status).toBe(200);
    } finally {
      await s.close();
    }
  });

  it("CORS: same origin and the Vite dev origins only — never a wildcard", async () => {
    const s = await serveHandler(baseOptions());
    try {
      const health = new URL("api/health", s.url);
      const same = await fetch(health, { headers: { origin: s.url.replace(/\/$/, "") } });
      expect(same.status).toBe(200);
      expect(same.headers.get("access-control-allow-origin")).toBeNull();

      const dev = await fetch(health, { headers: { origin: "http://localhost:5173" } });
      expect(dev.status).toBe(200);
      expect(dev.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
      expect(dev.headers.get("vary")).toContain("Origin");

      const preflight = await fetch(new URL("api/llm/stream", s.url), {
        method: "OPTIONS",
        headers: { origin: "http://localhost:5199", "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("access-control-allow-origin")).toBe("http://localhost:5199");
      expect(preflight.headers.get("access-control-allow-methods")).toContain("POST");

      for (const origin of ["https://evil.example", "http://localhost:5200", "http://localhost:3000", "null"]) {
        const res = await fetch(health, { headers: { origin } });
        expect(res.status).toBe(403);
        expect(res.headers.get("access-control-allow-origin")).toBeNull();
      }
      // A "simple" cross-site POST (no preflight in a browser) never reaches the proxy.
      const csrf = await fetch(new URL("api/llm/stream", s.url), { method: "POST", headers: { origin: "https://evil.example", "content-type": "text/plain" }, body: "{}" });
      expect(csrf.status).toBe(403);
    } finally {
      await s.close();
    }
  });
});

/** A provider that streams until aborted and records the abort. */
class HangingProvider implements LLMProvider {
  readonly id = "openai";
  readonly wire = "openai-chat-completions" as const;
  readonly model = "hang";
  aborted: Promise<void>;
  private markAborted!: () => void;
  constructor() {
    this.aborted = new Promise((r) => (this.markAborted = r));
  }
  capabilities() {
    return new ScriptedProvider([]).capabilities();
  }
  async *stream(_request: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    signal?.addEventListener("abort", () => this.markAborted(), { once: true });
    yield { type: "start", model: this.model };
    for (let i = 0; i < 1000 && !signal?.aborted; i++) {
      yield { type: "text_delta", text: `chunk ${i} ` };
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

describe("POST /api/llm/stream", () => {
  const configs: ProviderConfig[] = [];
  let next: () => LLMProvider = () => new ScriptedProvider([textScript("Hello from upstream", { chunk: 5 })]);
  let server: RunningServer;
  beforeAll(async () => {
    server = await startServer(
      baseOptions({
        maxBodyBytes: 64 * 1024,
        providerFactory: (config) => {
          configs.push(config);
          return next();
        },
      }),
    );
  });
  afterAll(() => server.close());

  const endpoint = () => new URL("api/llm/stream", server.url).toString();
  const chat: ChatRequest = { model: "", system: [{ id: "s", text: "Be brief.", cache: "stable" }], messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }] };

  it("relays StreamEvents as SSE and ends with event: done (ProxyProvider round trip)", async () => {
    const provider = new ProxyProvider({ id: "proxy", wire: "proxy", model: "gpt-5-mini", proxyUrl: endpoint(), proxyProvider: "openai" });
    const events: StreamEvent[] = [];
    for await (const e of provider.stream(chat)) events.push(e);
    expect(events.map((e) => e.type)).toEqual(["start", "text_delta", "text_delta", "text_delta", "text_delta", "finish"]);
    expect(events.filter((e) => e.type === "text_delta").map((e) => (e as { text: string }).text).join("")).toBe("Hello from upstream");
    const config = configs.at(-1)!;
    expect(config).toMatchObject({ id: "openai", wire: "openai-chat-completions", model: "gpt-5-mini", apiKey: env.OPENAI_API_KEY });

    const res = await fetch(endpoint(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "openai", request: { ...chat, model: "gpt-5" } }) });
    expect(res.headers.get("content-type")).toBe("text/event-stream; charset=utf-8");
    const text = await res.text();
    expect(text.startsWith("data: {\"type\":\"start\"")).toBe(true);
    expect(text.endsWith("event: done\ndata: {}\n\n")).toBe(true);
    expect(text).not.toContain(env.OPENAI_API_KEY);
  });

  it("aborts the upstream request when the client disconnects", async () => {
    const hanging = new HangingProvider();
    next = () => hanging;
    const controller = new AbortController();
    const res = await fetch(endpoint(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "openai", request: chat }), signal: controller.signal });
    const reader = res.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain("\"type\":\"start\"");
    controller.abort();
    await expect(Promise.race([hanging.aborted.then(() => "aborted"), new Promise((r) => setTimeout(() => r("timeout"), 3000))])).resolves.toBe("aborted");
  });

  it("validates the request and refuses providers it cannot serve", async () => {
    const post = (body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) =>
      fetch(endpoint(), { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
    const code = async (r: Response) => ((await r.json()) as { error: { code: string } }).error.code;

    expect((await post({ request: chat }, { "content-type": "text/plain" })).status).toBe(415);
    let r = await post("{not json");
    expect([r.status, await code(r)]).toEqual([400, "bad_json"]);
    r = await post({ provider: "openai", request: { messages: "hi" } });
    expect([r.status, await code(r)]).toEqual([400, "bad_request"]);
    r = await post({ provider: "openai", request: { ...chat, messages: [{ role: "system", content: [] }] } });
    expect(r.status).toBe(400);
    r = await post({ provider: "openai", request: { ...chat, temperature: 9 } });
    expect(r.status).toBe(400);
    r = await post({ provider: "nope", request: chat });
    expect([r.status, await code(r)]).toEqual([400, "unknown_provider"]);
    r = await post({ provider: "proxy", request: chat });
    expect([r.status, await code(r)]).toEqual([400, "proxy_loop"]);
    r = await post({ provider: "anthropic", request: chat });
    expect([r.status, await code(r)]).toEqual([401, "provider_not_configured"]);
    r = await post({ provider: "openai", request: { ...chat, messages: [{ role: "user", content: [{ type: "text", text: "x".repeat(70 * 1024) }] }] } });
    expect([r.status, await code(r)]).toEqual([413, "body_too_large"]);
    expect((await fetch(endpoint())).status).toBe(405);
  });
});

describe("POST /api/transcripts/:sessionId", () => {
  let server: RunningServer;
  beforeAll(async () => {
    server = await startServer(baseOptions());
  });
  afterAll(() => server.close());

  it("appends NDJSON items to <home>/sessions/web/<id>.jsonl with secrets masked", async () => {
    const items = [
      { type: "session_meta", ordinal: 0, ts: "2026-01-01T00:00:00.000Z", payload: { sessionId: "web-1", caseId: SMZL, caseVersion: "1.0.0", facilityId: null, locale: "en", provider: "offline", model: "", clinicalcraftVersion: "5.0.0" } },
      { type: "op", ordinal: 1, ts: "2026-01-01T00:00:01.000Z", payload: { id: "a", op: { type: "user_message", text: `my key is ${env.OPENAI_API_KEY}` } } },
    ];
    const url = new URL("api/transcripts/web-1", server.url);
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/x-ndjson" }, body: items.map((i) => JSON.stringify(i)).join("\n") + "\n" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, written: 2, stored: true });
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify([{ type: "action", ordinal: 2, ts: "t", payload: { action: { type: "start" }, accepted: true } }]) });

    const file = readFileSync(join(home, "sessions", "web", "web-1.jsonl"), "utf8");
    const lines = file.trim().split("\n").map((l) => JSON.parse(l) as { ordinal: number });
    expect(lines.map((l) => l.ordinal)).toEqual([0, 1, 2]);
    expect(file).not.toContain(env.OPENAI_API_KEY);
  });

  it("caps each uploaded file and the number of uploaded files", async () => {
    const dir = mkdtempSync(join(root, "quota-"));
    const store = new WebTranscriptStore({ CLINICALCRAFT_HOME: dir }, null, { maxFileBytes: 400, maxSessions: 2 });
    const item = (ordinal: number) => ({ type: "action", ordinal, ts: "2026-01-01T00:00:00.000Z", payload: { action: { type: "note", text: "x".repeat(60) }, accepted: true } }) as never;
    await store.append("a", [item(0), item(1)]);
    await expect(store.append("a", [item(2), item(3), item(4)])).rejects.toBeInstanceOf(TranscriptQuotaError);
    expect(readFileSync(store.pathFor("a"), "utf8").trim().split("\n")).toHaveLength(2); // nothing partial written
    await store.append("b", [item(0)]);
    await expect(store.append("c", [item(0)])).rejects.toMatchObject({ kind: "session-count" });
    await store.append("b", [item(1)]); // existing files can still grow within their cap
    // A fresh store (server restart) counts the bytes already on disk.
    const again = new WebTranscriptStore({ CLINICALCRAFT_HOME: dir }, null, { maxFileBytes: 400, maxSessions: 2 });
    await expect(again.append("a", [item(2), item(3), item(4)])).rejects.toMatchObject({ kind: "file-size" });

    const small = await startServer({ ...baseOptions(), env: { ...baseOptions().env, CLINICALCRAFT_HOME: dir }, transcriptQuota: { maxFileBytes: 400, maxSessions: 2 } });
    try {
      const res = await fetch(new URL("api/transcripts/c", small.url), { method: "POST", headers: { "content-type": "application/x-ndjson", "accept-language": "en" }, body: `${JSON.stringify(item(0))}\n` });
      expect(res.status).toBe(413);
      expect(await res.json()).toMatchObject({ error: { code: "transcript_quota" } });
    } finally {
      await small.close();
    }
  });

  it("empty uploads reserve nothing: the file-count cap holds when items follow (F7)", async () => {
    const dir = mkdtempSync(join(root, "quota-empty-"));
    const store = new WebTranscriptStore({ CLINICALCRAFT_HOME: dir }, null, { maxFileBytes: 400, maxSessions: 2 });
    const item = (ordinal: number) => ({ type: "action", ordinal, ts: "2026-01-01T00:00:00.000Z", payload: { action: { type: "note", text: "x" }, accepted: true } }) as never;
    for (const id of ["a", "b", "c", "d"]) expect(await store.append(id, [])).toMatchObject({ written: 0 });
    await store.append("a", [item(0)]);
    await store.append("b", [item(0)]);
    await expect(store.append("c", [item(0)])).rejects.toMatchObject({ kind: "session-count" });
    await expect(store.append("d", [item(0)])).rejects.toMatchObject({ kind: "session-count" });
    expect(readdirSync(join(dir, "sessions", "web")).filter((f) => f.endsWith(".jsonl"))).toHaveLength(2);

    // Over HTTP: empty POSTs for new ids, then real items.
    const http = mkdtempSync(join(root, "quota-http-"));
    const small = await startServer({ ...baseOptions(), env: { ...baseOptions().env, CLINICALCRAFT_HOME: http }, transcriptQuota: { maxFileBytes: 4000, maxSessions: 2 } });
    try {
      const post = (id: string, body: string) => fetch(new URL(`api/transcripts/${id}`, small.url), { method: "POST", headers: { "content-type": "application/x-ndjson" }, body });
      for (const id of ["u1", "u2", "u3", "u4"]) expect((await post(id, "")).status).toBe(200);
      const codes = [];
      for (const id of ["u1", "u2", "u3", "u4"]) codes.push((await post(id, `${JSON.stringify(item(0))}\n`)).status);
      expect(codes).toEqual([200, 200, 413, 413]);
      expect(readdirSync(join(http, "sessions", "web")).filter((f) => f.endsWith(".jsonl"))).toHaveLength(2);
    } finally {
      await small.close();
    }
  });

  it("accepts every item a session records — embodied world snapshots and external agents' calls too", async () => {
    // A rejected item fails the whole upload, and the browser then stops uploading for the rest of the encounter
    // (an embodied encounter recorded a `world` item after its first world action — the audit trail of
    // external calls, `external_tool_call` ops, was lost with it).
    const items = [
      { type: "op", ordinal: 0, ts: "2026-01-01T00:00:00.000Z", payload: { id: "e1", op: { type: "external_tool_call", callId: "mcp-1", tool: "navigate_to", args: { target: "patient" }, deadline: 1_760_000_000_000 } } },
      { type: "world", ordinal: 1, ts: "2026-01-01T00:00:01.000Z", payload: { snapshot: { format: "clinicalcraft-world@1", version: 3, actors: [], entities: {} } } },
      { type: "dialogue", ordinal: 2, ts: "2026-01-01T00:00:02.000Z", payload: { agent: "patient", text: "…" } },
      { type: "diagnostic", ordinal: 3, ts: "2026-01-01T00:00:03.000Z", payload: { agent: "patient", source: "grounding", detail: [] } },
    ];
    const res = await fetch(new URL("api/transcripts/web-world", server.url), { method: "POST", headers: { "content-type": "application/x-ndjson" }, body: items.map((i) => JSON.stringify(i)).join("\n") + "\n" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, written: 4, stored: true });
    const file = readFileSync(join(home, "sessions", "web", "web-world.jsonl"), "utf8");
    expect(file.trim().split("\n").map((l) => (JSON.parse(l) as { type: string }).type)).toEqual(["op", "world", "dialogue", "diagnostic"]);
  });

  it("rejects bad session ids and malformed items", async () => {
    const post = (id: string, body: string) => fetch(new URL(`api/transcripts/${id}`, server.url), { method: "POST", headers: { "content-type": "application/x-ndjson" }, body });
    expect((await post("..%2f..%2fevil", "{}")).status).toBe(400);
    expect((await post("ok-id", "{\"type\":\"bogus\",\"ordinal\":0,\"ts\":\"t\",\"payload\":{}}")).status).toBe(400);
    expect((await post("ok-id", "not json\n")).status).toBe(400);
  });
});
