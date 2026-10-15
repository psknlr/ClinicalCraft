/**
 * Direct-mode base URL check (settings panel): a custom base URL must be
 * allowed by the page's `connect-src` — the server's `/api/health`
 * `connectOrigins` when served by `clinicalcraft serve`, else the page's own
 * CSP — or the browser blocks it (C7).
 */
import { describe, expect, it } from "vitest";
import en from "../../i18n/en.js";
import zh from "../../i18n/zh-CN.js";
import { checkDirectBaseUrl, connectSources } from "./pause.js";

const PAGE = "http://127.0.0.1:5178";
const SERVED = { served: true, pageOrigin: PAGE, connectOrigins: ["https://api.anthropic.com", "https://api.openai.com", "http://localhost:11434"] };

describe("checkDirectBaseUrl — served by clinicalcraft serve", () => {
  it("allows the origins /api/health lists and the page itself", () => {
    expect(checkDirectBaseUrl("https://api.openai.com/v1", SERVED)).toEqual({ ok: true });
    expect(checkDirectBaseUrl("http://localhost:11434/v1", SERVED)).toEqual({ ok: true });
    expect(checkDirectBaseUrl(`${PAGE}/v1`, SERVED)).toEqual({ ok: true });
  });

  it("flags any other origin as needing server configuration", () => {
    expect(checkDirectBaseUrl("https://my-gateway.example.com/v1", SERVED)).toEqual({ ok: false, origin: "https://my-gateway.example.com", reason: "server" });
    // origin = scheme + host + port: a different port or scheme is another origin
    expect(checkDirectBaseUrl("http://localhost:1234/v1", SERVED)).toMatchObject({ ok: false, origin: "http://localhost:1234" });
    expect(checkDirectBaseUrl("http://api.openai.com/v1", SERVED)).toMatchObject({ ok: false, reason: "server" });
  });

  it("does not guess when the server does not publish its list (older server) or the URL is invalid", () => {
    expect(checkDirectBaseUrl("https://my-gateway.example.com/v1", { served: true, pageOrigin: PAGE, connectOrigins: null })).toEqual({ ok: true });
    expect(checkDirectBaseUrl("not a url", SERVED)).toEqual({ ok: true });
  });
});

describe("checkDirectBaseUrl — not served (the page's own CSP)", () => {
  const page = "https://clinicalcraft.example";
  it("no policy: nothing blocks it here (CORS is warned about separately)", () => {
    expect(checkDirectBaseUrl("https://my-gateway.example.com/v1", { served: false, pageOrigin: page, csp: null })).toEqual({ ok: true });
    expect(checkDirectBaseUrl("https://x.example/v1", { served: false, pageOrigin: page, csp: "script-src 'self'" })).toEqual({ ok: true });
  });

  it("matches connect-src (else default-src) source expressions", () => {
    const csp = "default-src 'self'; connect-src 'self' https://api.anthropic.com *.openrouter.ai http://localhost:*";
    const check = (url: string) => checkDirectBaseUrl(url, { served: false, pageOrigin: page, csp });
    expect(check("https://api.anthropic.com/v1")).toEqual({ ok: true });
    expect(check("https://eu.openrouter.ai/api/v1")).toEqual({ ok: true });
    expect(check("http://localhost:1234/v1")).toEqual({ ok: true });
    expect(check(`${page}/proxy`)).toEqual({ ok: true });
    expect(check("https://api.openai.com/v1")).toEqual({ ok: false, origin: "https://api.openai.com", reason: "csp" });
    expect(check("http://api.anthropic.com/v1")).toMatchObject({ ok: false });
    expect(checkDirectBaseUrl("https://any.example/v1", { served: false, pageOrigin: page, csp: "default-src 'self'" })).toMatchObject({ ok: false, reason: "csp" });
    expect(checkDirectBaseUrl("https://any.example/v1", { served: false, pageOrigin: page, csp: "connect-src https:" })).toEqual({ ok: true });
    expect(checkDirectBaseUrl("https://any.example/v1", { served: false, pageOrigin: page, csp: "connect-src *" })).toEqual({ ok: true });
    expect(checkDirectBaseUrl("https://any.example/v1", { served: false, pageOrigin: page, csp: "connect-src 'none'" })).toMatchObject({ ok: false });
    // a scheme-less host source follows the page's scheme (https page: https only)
    expect(checkDirectBaseUrl("https://api.x.ai/v1", { served: false, pageOrigin: page, csp: "connect-src api.x.ai" })).toEqual({ ok: true });
    expect(checkDirectBaseUrl("http://api.x.ai/v1", { served: false, pageOrigin: page, csp: "connect-src api.x.ai" })).toMatchObject({ ok: false });
  });

  it("connectSources reads the governing directive", () => {
    expect(connectSources("default-src 'self'; connect-src 'self' https://a.example")).toEqual(["'self'", "https://a.example"]);
    expect(connectSources("default-src 'self' data:")).toEqual(["'self'", "data:"]);
    expect(connectSources("img-src *")).toBeNull();
  });
});

describe("the explanation is bilingual", () => {
  it("both tables explain the server and CSP cases with the origin", () => {
    for (const table of [en, zh] as Record<string, string>[]) {
      expect(table["llm.baseUrlServer"]).toContain("{origin}");
      expect(table["llm.baseUrlServer"]).toContain("providers.{provider}.baseUrl");
      expect(table["llm.baseUrlCsp"]).toContain("{origin}");
    }
    expect(en["llm.baseUrlServer"]).toMatch(/proxy mode/);
    expect(zh["llm.baseUrlServer"]).toMatch(/代理模式/);
  });
});
