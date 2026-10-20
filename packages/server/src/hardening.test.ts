/**
 * Server hardening: no secrets in `/api/providers` or proxied error text,
 * `?token=` dropped from the address bar (302) and from logs, and the
 * direct-mode origins the CSP allows published in `/api/health`.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings, type ChatRequest, type LLMProvider, type ModelCapabilities, type ResolvedSettings, type StreamEvent } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { providerList } from "./llm.js";
import { createRequestHandler, type ServerOptions } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-server-hard-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();

const KEY = "sk-test-openai-key-123456";
const OTHER = "zz-other-service-token-98765";
const env = { CLINICALCRAFT_HOME: join(root, "home"), HOME: join(root, "home"), OPENAI_API_KEY: KEY, BILLING_SERVICE_TOKEN: OTHER };

function settings(patch: Record<string, unknown> = {}): ResolvedSettings {
  return mergeSettings([{ source: "flag", settings: { locale: "en", ...patch } }]);
}

async function serve(opts: Partial<ServerOptions> & { settings?: ResolvedSettings }): Promise<{ url: string; close(): Promise<void> }> {
  const handler = createRequestHandler({ host: "127.0.0.1", settings: settings(), content, env, log: () => undefined, ...opts });
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

const chat: ChatRequest = { model: "", system: [], messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }] };

/** An upstream that fails with credentials in its error text (as some gateways echo them). */
class LeakyProvider implements LLMProvider {
  readonly id = "openai";
  readonly wire = "openai-chat-completions" as const;
  readonly model = "gpt-5";
  constructor(private readonly mode: "event" | "throw") {}
  capabilities(): ModelCapabilities {
    return {} as ModelCapabilities;
  }
  async *stream(): AsyncGenerator<StreamEvent> {
    const message = `401 from https://alice:pa55word-xyz-123@gw.example/v1?api_key=q-secret-123456: invalid key ${KEY} (billing ${OTHER}) Authorization: Bearer abcdefghijklmnop`;
    yield { type: "start", model: "gpt-5" } as StreamEvent;
    if (this.mode === "throw") throw new Error(message);
    yield { type: "error", error: { message, kind: "auth", retryable: false } };
  }
}

describe("L5: no secrets in provider listings or proxied errors", () => {
  const gateway = { wire: "openai-chat-completions", baseUrl: "https://alice:pa55word-xyz-123@gw.example/v1?api_key=q-secret-123456#frag", apiKeyEnv: ["OPENAI_API_KEY"] };

  it("GET /api/providers shows base URLs without userinfo, query or fragment", async () => {
    const list = providerList(settings({ providers: { gw: gateway } }), env);
    const gw = list.providers.find((p) => p.id === "gw")!;
    expect(gw.baseUrl).toBe("https://gw.example/v1");
    const text = JSON.stringify(list);
    for (const secret of ["alice", "pa55word", "q-secret", "frag", KEY]) expect(text).not.toContain(secret);
    expect(list.providers.find((p) => p.id === "anthropic")!.baseUrl).toBe("https://api.anthropic.com");
  });

  for (const mode of ["event", "throw"] as const) {
    it(`redacts upstream error text before it reaches the SSE stream (${mode})`, async () => {
      const s = await serve({ settings: settings({ providers: { gw: gateway } }), providerFactory: () => new LeakyProvider(mode) });
      try {
        const res = await fetch(new URL("api/llm/stream", s.url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "gw", request: chat }) });
        const text = await res.text();
        expect(text).toContain("\"type\":\"error\"");
        expect(text).toContain("[REDACTED]");
        for (const secret of [KEY, OTHER, "pa55word-xyz-123", "q-secret-123456", "abcdefghijklmnop"]) expect(text, secret).not.toContain(secret);
      } finally {
        await s.close();
      }
    });
  }
});

describe("L6: the access token leaves the URL and the logs", () => {
  const TOKEN = "s3cret-token-0123456789";

  it("a page visit with a valid ?token= sets the cookie and redirects to the same URL without it", async () => {
    const s = await serve({ host: "0.0.0.0", token: TOKEN, staticDir: null });
    try {
      const res = await fetch(new URL(`play?case=x&token=${TOKEN}&lang=en`, s.url), { redirect: "manual" });
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/play?case=x&lang=en");
      expect(res.headers.get("set-cookie")).toMatch(/^cc_token=s3cret-token-0123456789; Path=\/; HttpOnly; SameSite=Strict/);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const bare = await fetch(new URL(`?token=${TOKEN}`, s.url), { redirect: "manual" });
      expect([bare.status, bare.headers.get("location")]).toEqual([302, "/"]);
      // A wrong token is not redirected (nor given a cookie); API calls keep working with ?token= (no redirect).
      const wrong = await fetch(new URL("?token=nope", s.url), { redirect: "manual" });
      expect(wrong.status).not.toBe(302);
      expect(wrong.headers.get("set-cookie")).toBeNull();
      expect((await fetch(new URL(`api/health?token=${TOKEN}`, s.url), { redirect: "manual" })).status).toBe(200);
    } finally {
      await s.close();
    }
  });

  it("logs only the path of a failing request, never its query string", async () => {
    const logs: string[] = [];
    const notADir = join(root, "home-is-a-file");
    writeFileSync(notADir, "x");
    const s = await serve({ env: { ...env, CLINICALCRAFT_HOME: notADir }, log: (m) => logs.push(m) });
    try {
      const item = { type: "action", ordinal: 0, ts: "2026-01-01T00:00:00.000Z", payload: { action: { type: "start" }, accepted: true } };
      const res = await fetch(new URL("api/transcripts/web-x?token=leak-me-please&x=1", s.url), { method: "POST", headers: { "content-type": "application/x-ndjson" }, body: `${JSON.stringify(item)}\n` });
      expect(res.status).toBe(500);
      expect(logs.join("\n")).toContain("/api/transcripts/web-x");
      expect(logs.join("\n")).not.toContain("leak-me-please");
      expect(logs.join("\n")).not.toContain("?");
    } finally {
      await s.close();
    }
  });
});

describe("L7: direct-mode origins are published", () => {
  it("GET /api/health lists the origins the CSP lets the page call directly", async () => {
    const s = await serve({ settings: settings({ providers: { gw: { wire: "openai-chat-completions", baseUrl: "https://alice:pw@llm.campus.example:8443/v1?k=1" } } }) });
    try {
      const res = await fetch(new URL("api/health", s.url));
      const body = (await res.json()) as { connectOrigins: string[] };
      expect(body.connectOrigins).toEqual(expect.arrayContaining(["https://api.anthropic.com", "https://api.openai.com", "https://llm.campus.example:8443"]));
      expect(JSON.stringify(body)).not.toContain("alice");
      const csp = res.headers.get("content-security-policy")!;
      for (const origin of body.connectOrigins) expect(csp).toContain(origin);
    } finally {
      await s.close();
    }
  });
});
