/**
 * Server security policy (ZCode lesson: loopback-only unless a token is set):
 *
 * - **Binding** — 127.0.0.1 by default; a non-loopback bind requires a token.
 * - **Auth** — when a token is configured, `/api/*` and `/local-assets/*`
 *   require it as `Authorization: Bearer <token>`, `?token=<token>` or the
 *   `cc_token` cookie (set, HttpOnly + SameSite=Strict, when a valid `?token=`
 *   is presented so the web app keeps working after the first visit; a page
 *   visit with `?token=` is then redirected to the same URL without it, so the
 *   token leaves the address bar and history). Logs carry paths, never query
 *   strings.
 * - **Secrets in responses** — `/api/providers` shows base URLs without
 *   credentials; proxied upstream error text is redacted (`llm.ts`).
 * - **DNS rebinding** — a loopback-only server accepts only loopback `Host`
 *   headers.
 * - **CORS** — same origin only; the Vite dev origins
 *   `http://localhost:5173-5199` (and 127.0.0.1) are allowed for `/api/*` —
 *   except the world bridge (`/api/world/*`): any local dev page could
 *   otherwise use the learner's cookie there. Cross-origin API requests from
 *   anywhere else are refused (403), which also stops "simple" cross-site
 *   POSTs that a browser would send without a preflight.
 * - **Headers** — nosniff, no-referrer, frame-ancestors none and a CSP that
 *   fits the Vite build.
 * - **World bridge** (`/api/world/sessions…`, `world-sessions.ts`) — all of
 *   the above applies, same-origin only; the browser's channel routes also
 *   need the live session's secret in `x-clinicalcraft-channel`; the attach
 *   routes take the token only as `Authorization: Bearer` (never the ambient
 *   cookie) plus the session's attach key in `x-clinicalcraft-attach-key`
 *   (docs/PROTOCOL.md §13.5).
 */
import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { PROVIDER_TEMPLATES, type ResolvedSettings } from "@clinicalcraft/agent";

/** Name of the cookie that carries the access token after a `?token=` visit. */
export const TOKEN_COOKIE = "cc_token";

/** Dev-server origins allowed to call `/api/*` cross-origin (Vite picks 5173 and up). */
export const DEV_ORIGIN_PATTERN = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(517[3-9]|51[89]\d)$/;

/** Whether `host` (a bind address or a hostname without port) is a loopback name. */
export function isLoopbackHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "0:0:0:0:0:0:0:1" || /^127(?:\.\d{1,3}){3}$/.test(h) || h === "::ffff:127.0.0.1";
}

/** Hostname part of a `Host` header (`[::1]:5178` → `::1`, `localhost:5178` → `localhost`). */
export function hostnameOf(hostHeader: string): string {
  const h = hostHeader.trim();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    return end > 0 ? h.slice(1, end) : h;
  }
  const colon = h.lastIndexOf(":");
  return colon > 0 && h.indexOf(":") === colon ? h.slice(0, colon) : h;
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Parse a `Cookie` header into a map (first value wins). */
export function parseCookies(header: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name || out.has(name)) continue;
    let value = part.slice(eq + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep raw */
    }
    out.set(name, value);
  }
  return out;
}

export interface TokenCheck {
  ok: boolean;
  /** The token arrived as `?token=` (the caller may set the cookie). */
  viaQuery: boolean;
  /** Where the valid token came from (null when none was valid): the world bridge's attach routes accept only "header". */
  via: "header" | "query" | "cookie" | null;
}

/** Check the request's token (Bearer header, `?token=` or cookie) against `token`. */
export function checkToken(req: IncomingMessage, url: URL, token: string): TokenCheck {
  const auth = req.headers.authorization;
  if (typeof auth === "string") {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m && safeEqual(m[1]!.trim(), token)) return { ok: true, viaQuery: false, via: "header" };
  }
  const query = url.searchParams.get("token");
  if (query !== null && safeEqual(query, token)) return { ok: true, viaQuery: true, via: "query" };
  const cookie = parseCookies(req.headers.cookie).get(TOKEN_COOKIE);
  if (cookie !== undefined && safeEqual(cookie, token)) return { ok: true, viaQuery: false, via: "cookie" };
  return { ok: false, viaQuery: false, via: null };
}

/** `Set-Cookie` value for the access token. */
export function tokenCookie(token: string): string {
  return `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict`;
}

export type OriginVerdict =
  /** No `Origin` header (same-origin navigation, curl, server-to-server). */
  | { kind: "none" }
  | { kind: "same-origin" }
  /** An allowed cross-origin caller (dev server): echo it in CORS headers. */
  | { kind: "allowed"; origin: string }
  | { kind: "forbidden"; origin: string };

/** Classify the request's `Origin` against the request's own origin and the dev allow-list. */
export function classifyOrigin(req: IncomingMessage, extraOrigins: readonly string[] = []): OriginVerdict {
  const origin = req.headers.origin;
  if (typeof origin !== "string" || origin === "") return { kind: "none" };
  const host = req.headers.host;
  if (typeof host === "string" && host && (origin === `http://${host}` || origin === `https://${host}`)) return { kind: "same-origin" };
  if (DEV_ORIGIN_PATTERN.test(origin) || extraOrigins.includes(origin)) return { kind: "allowed", origin };
  return { kind: "forbidden", origin };
}

/** CORS response headers for an allowed cross-origin caller. */
export function corsHeaders(origin: string, preflight: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    vary: "Origin",
  };
  if (preflight) {
    headers["access-control-allow-methods"] = "GET, HEAD, POST, OPTIONS";
    headers["access-control-allow-headers"] = "authorization, content-type, accept";
    headers["access-control-max-age"] = "600";
  }
  return headers;
}

/** Origin (`scheme://host[:port]`) of a URL, or null when it is not absolute http(s). */
export function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * Origins the web app may call directly (direct mode): every networked
 * provider template plus base URLs configured in settings.
 */
export function providerOrigins(settings: Pick<ResolvedSettings, "providers">): string[] {
  const out = new Set<string>();
  for (const t of PROVIDER_TEMPLATES) {
    if (t.wire !== "anthropic-messages" && t.wire !== "openai-chat-completions") continue;
    const o = originOf(t.baseUrl);
    if (o) out.add(o);
  }
  for (const p of Object.values(settings.providers ?? {})) {
    const o = originOf(p.baseUrl);
    if (o) out.add(o);
  }
  return [...out].sort();
}

/** Content-Security-Policy compatible with the Vite build (module scripts, inline styles, blob workers). */
export function contentSecurityPolicy(connectOrigins: readonly string[]): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    ["connect-src 'self' data: blob:", ...connectOrigins].join(" "),
  ].join("; ");
}

/** Headers sent with every response. */
export function securityHeaders(csp: string): Record<string, string> {
  return {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "cross-origin-opener-policy": "same-origin",
    "content-security-policy": csp,
  };
}
