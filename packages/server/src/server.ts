/**
 * `@clinicalcraft/server` — node:http server for `clinicalcraft serve`
 * (docs/PROTOCOL.md §11, docs/ASSETS.md): the web build, the content API,
 * local-only assets, the provider list, the provider-neutral LLM proxy,
 * transcript uploads and the world bridge (`world-sessions.ts`: live browser
 * sessions an external agent acts in through `clinicalcraft mcp --attach`).
 * Security policy: see `security.ts`.
 */
import { createServer, type IncomingMessage, type RequestListener, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { join, resolve as resolvePath } from "node:path";
import { CLINICALCRAFT_VERSION, type LLMProvider, type ProviderConfig, type ResolvedSettings } from "@clinicalcraft/agent";
import { builtinContentDir, loadContent, localAssetDirs, type Env, type LoadedContent } from "@clinicalcraft/agent/node";
import { CaseStore, type CachedBody } from "./case-store.js";
import { parseListingQuery } from "./content.js";
import { etagMatches, HttpError, MAX_BODY_BYTES, mediaType, readBody, sendCachedJson, sendError, sendJson, strongEtag } from "./http.js";
import { localeFromAcceptLanguage, sm } from "./i18n.js";
import { parseProxyCall, providerList, proxySecrets, resolveProxyConfig, streamProxy } from "./llm.js";
import {
  checkToken,
  classifyOrigin,
  contentSecurityPolicy,
  corsHeaders,
  hostnameOf,
  isLoopbackHost,
  providerOrigins,
  securityHeaders,
  tokenCookie,
} from "./security.js";
import { serveLocalAsset, serveStatic } from "./static.js";
import { isValidSessionId, parseTranscriptUpload, TranscriptQuotaError, WebTranscriptStore, type WebTranscriptStoreOptions } from "./transcripts.js";
import { WorldSessionRouter, type WorldRequestAuth, type WorldSessionRouterOptions } from "./world-sessions.js";

export interface ServerOptions {
  /** Port to listen on (0 = any free port). Default `settings.server.port`. */
  port?: number;
  /** Bind address. Default `settings.server.host` (127.0.0.1). */
  host?: string;
  /** Access token; required when `host` is not a loopback address. */
  token?: string | null;
  /** Web build directory (index.html + assets/). Omit to serve the API only. */
  staticDir?: string | null;
  settings: ResolvedSettings;
  /** Extra content directories (default `settings.contentDirs`). */
  contentDirs?: string[];
  /** Serve the built-in `@clinicalcraft/content` too (default true). */
  builtinContent?: boolean;
  /** Pre-loaded content (skips scanning; tests). */
  content?: LoadedContent;
  /**
   * How often (ms) the case files are re-stat'ed for changes (default 1000;
   * 0 = on every content request). Changed files are re-indexed and
   * re-validated; unchanged ones are not read again.
   */
  contentRevalidateMs?: number;
  /** Concurrent file reads while indexing or validating cases (default 16). */
  contentConcurrency?: number;
  /** Environment for provider keys and CLINICALCRAFT_HOME (default `process.env`). */
  env?: Env;
  /** Working directory used to find `assets/local` (default `process.cwd()`). */
  cwd?: string;
  /**
   * Local-only asset roots (default `localAssetDirs(cwd, env)`). Each content
   * directory's `assets/` folder is searched after them (a pack's own,
   * redistributable models and figures: docs/ASSETS.md).
   */
  assetDirs?: string[];
  /** Build upstream providers for the LLM proxy (default `withRetry(createProvider(config))`). */
  providerFactory?: (config: ProviderConfig) => LLMProvider;
  /** Request body limit in bytes (default 2 MB). */
  maxBodyBytes?: number;
  /** Caps on uploaded web transcripts (default 16 MiB per file, 500 files). */
  transcriptQuota?: WebTranscriptStoreOptions;
  /** World bridge timing and limits (live browser sessions for `clinicalcraft mcp --attach`; tests, embedding). */
  worldSessions?: WorldSessionRouterOptions;
  /** Diagnostics sink (default: stderr). */
  log?: (message: string) => void;
}

/** A request handler plus its lifecycle hooks (embedding and tests). */
export interface RequestHandler extends RequestListener {
  /** Abort open LLM streams and flush transcript writes. */
  close(): Promise<void>;
  /** The world bridge's live sessions (monitoring: `stats()`; embedding). */
  readonly worldSessions: WorldSessionRouter;
}

export interface RunningServer {
  url: string;
  port: number;
  host: string;
  close(): Promise<void>;
}

const API_PREFIX = "/api/";
const ASSET_PREFIX = "/local-assets/";

/** Throw when a non-loopback bind has no token (ZCode rule). */
export function assertBindAllowed(host: string, token: string | null | undefined): void {
  if (!isLoopbackHost(host) && !token) {
    throw new Error(`Refusing to listen on non-loopback host "${host}" without an access token (set server.token or pass --token).`);
  }
}

/**
 * Build the request handler. `host` is the bind address the handler assumes
 * (it decides whether `Host` headers must be loopback names).
 */
export function createRequestHandler(opts: ServerOptions): RequestHandler {
  const settings = opts.settings;
  const env: Env = opts.env ?? process.env;
  const host = opts.host ?? settings.server.host;
  const token = opts.token ?? settings.server.token ?? null;
  assertBindAllowed(host, token);
  const loopbackOnly = isLoopbackHost(host);
  const maxBody = opts.maxBodyBytes ?? MAX_BODY_BYTES;
  const log = opts.log ?? ((m: string) => void process.stderr.write(`[clinicalcraft serve] ${m}\n`));
  // Origins the page may call directly (direct mode); published in /api/health so the web settings
  // panel can tell a custom base URL needs server configuration instead of failing on the CSP.
  const connectOrigins = providerOrigins(settings);
  const csp = contentSecurityPolicy(connectOrigins);
  const baseHeaders = securityHeaders(csp);
  const transcripts = new WebTranscriptStore(env, settings.transcripts.dir, opts.transcriptQuota);
  // Live browser sessions an external agent may act in (docs/EMBODIED.md §12): the routes run after auth, origin and host checks.
  const world = new WorldSessionRouter({ maxBodyBytes: maxBody, log, ...(opts.worldSessions ?? {}) });
  const shutdown = new AbortController();
  const streams = new Set<Promise<void>>();
  const contentDirs = opts.contentDirs ?? settings.contentDirs;
  // local-only roots first (a local copy overrides a pack's), then each content pack's own assets/
  const assetDirs = [...(opts.assetDirs ?? localAssetDirs(opts.cwd ?? process.cwd(), env)), ...contentDirs.map((d) => join(resolvePath(d), "assets"))];
  // Facilities and catalogs (small) are loaded once; cases are indexed and validated on demand (`CaseStore`).
  let contentPromise: Promise<LoadedContent> | null = opts.content ? Promise.resolve(opts.content) : null;
  const content = () => (contentPromise ??= loadContent({ dirs: contentDirs, cases: false, builtin: opts.builtinContent !== false }));
  const builtin = opts.builtinContent === false ? null : builtinContentDir();
  const cases = new CaseStore({
    dirs: [...new Set([...(builtin ? [builtin] : []), ...contentDirs.map((d) => resolvePath(d))])],
    ...(opts.content ? { preloaded: opts.content.cases } : {}),
    ...(opts.contentRevalidateMs !== undefined ? { revalidateMs: opts.contentRevalidateMs } : {}),
    ...(opts.contentConcurrency !== undefined ? { concurrency: opts.contentConcurrency } : {}),
  });
  // Facility and catalog bodies never change while the server runs.
  const documentBodies = new Map<string, CachedBody>();
  const documentBody = (key: string, value: unknown): CachedBody => {
    let hit = documentBodies.get(key);
    if (!hit) {
      const body = JSON.stringify(value);
      hit = { body, etag: strongEtag(body) };
      documentBodies.set(key, hit);
    }
    return hit;
  };

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    for (const [k, v] of Object.entries(baseHeaders)) res.setHeader(k, v);
    const L = localeFromAcceptLanguage(req.headers["accept-language"], settings.locale);
    const method = (req.method ?? "GET").toUpperCase();
    let url: URL;
    try {
      url = new URL(req.url ?? "/", "http://localhost");
    } catch {
      return sendError(res, 400, "bad_request", sm(L, "error.badRequest", { message: "bad URL" }));
    }
    const path = url.pathname;

    // DNS-rebinding guard: a loopback-only server only answers loopback host names.
    const hostHeader = req.headers.host;
    if (loopbackOnly && typeof hostHeader === "string" && hostHeader && !isLoopbackHost(hostnameOf(hostHeader))) {
      return sendError(res, 403, "forbidden_host", sm(L, "error.forbiddenHost", { host: hostHeader }));
    }

    const isApi = path.startsWith(API_PREFIX) || path === "/api";
    const isAsset = path.startsWith(ASSET_PREFIX);
    // The world bridge is same-origin only: no dev-origin exception (a local dev page must not ride the learner's cookie).
    const isWorld = path === "/api/world" || path.startsWith("/api/world/");
    let cors: Record<string, string> = {};
    let tokenVia: WorldRequestAuth["via"] = null;
    if (isApi) {
      const origin = classifyOrigin(req);
      if (origin.kind === "forbidden" || (origin.kind === "allowed" && isWorld)) return sendError(res, 403, "forbidden_origin", sm(L, "error.forbiddenOrigin", { origin: origin.origin }));
      if (origin.kind === "allowed") cors = corsHeaders(origin.origin, method === "OPTIONS");
      for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
      if (method === "OPTIONS") {
        res.writeHead(204, { "content-length": "0" });
        return void res.end();
      }
    }

    if (token) {
      const check = checkToken(req, url, token);
      tokenVia = check.via;
      if (check.ok && check.viaQuery) res.setHeader("set-cookie", tokenCookie(token));
      // A page visit (the app shell, not an API call or asset) with ?token=: keep the cookie, drop the
      // token from the address bar and history.
      if (check.ok && check.viaQuery && !isApi && !isAsset && (method === "GET" || method === "HEAD")) {
        url.searchParams.delete("token");
        res.writeHead(302, { location: `${path}${url.search}`, "cache-control": "no-store", "content-length": "0" });
        return void res.end();
      }
      if (!check.ok && (isApi || isAsset)) {
        return sendError(res, 401, "unauthorized", sm(L, "error.unauthorized"), { "www-authenticate": 'Bearer realm="clinicalcraft"' });
      }
    }

    if (isApi) return routeApi(req, res, method, url, L, { token: token !== null, via: tokenVia });

    if (method !== "GET" && method !== "HEAD") {
      return sendError(res, 405, "method_not_allowed", sm(L, "error.methodNotAllowed", { method }), { allow: "GET, HEAD" });
    }
    if (isAsset) {
      const served = await serveLocalAsset(req, res, assetDirs, path.slice(ASSET_PREFIX.length));
      if (!served.served) sendError(res, 404, "asset_not_installed", sm(L, "error.assetMissing"));
      return;
    }
    if (opts.staticDir) {
      const served = await serveStatic(req, res, opts.staticDir, path);
      if (served.served) return;
      return sendError(res, 404, "not_found", sm(L, "error.notFound"));
    }
    return sendError(res, 404, "no_web_build", sm(L, "error.noWebBuild"));
  };

  const routeApi = async (req: IncomingMessage, res: ServerResponse, method: string, url: URL, L: string, auth: WorldRequestAuth): Promise<void> => {
    const segments = url.pathname.split("/").filter(Boolean).map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return "\0";
      }
    });
    const [, area, kind, id, ...rest] = segments; // segments[0] === "api"
    const get = method === "GET" || method === "HEAD";
    const notAllowed = (allow: string) => sendError(res, 405, "method_not_allowed", sm(L, "error.methodNotAllowed", { method }), { allow });

    if (area === "health" && !kind) {
      if (!get) return notAllowed("GET, HEAD");
      return sendJson(res, 200, { status: "ok", name: "clinicalcraft", version: CLINICALCRAFT_VERSION, provider: settings.provider, locale: settings.locale, auth: token !== null, connectOrigins, worldBridge: true });
    }
    if (area === "providers" && !kind) {
      if (!get) return notAllowed("GET, HEAD");
      return sendJson(res, 200, providerList(settings, env));
    }
    if (area === "content" && kind && rest.length === 0) {
      if (!get) return notAllowed("GET, HEAD");
      // Library index (legacy shape: every case summary, facilities, catalogs).
      if (kind === "index" && id === undefined) {
        const page = await cases.legacyIndex(await content());
        return sendCachedJson(req, res, page.body, page.etag);
      }
      // Paginated, filtered case index in library order.
      if (kind === "cases" && id === undefined) {
        const parsed = parseListingQuery(url.searchParams);
        if (!parsed.ok) return sendError(res, 400, "bad_request", sm(L, "error.badQuery", { message: parsed.message }));
        const page = await cases.listing(parsed.query);
        return sendCachedJson(req, res, page.body, page.etag);
      }
      if (id !== undefined) {
        if (kind === "cases") {
          // A published case's source (citation, DOI, references) only on request: `?spoilers=1` (the web asks, and
          // shows it once the case is complete).
          const spoilers = url.searchParams.get("spoilers") === "1";
          const etag = await cases.currentEtag(id, spoilers);
          if (etag && etagMatches(req.headers["if-none-match"], etag)) return sendCachedJson(req, res, "", etag);
          const found = await cases.load(id, spoilers);
          if (found.status === "ok") return sendCachedJson(req, res, found.body, found.etag);
          if (found.status === "invalid") {
            const first = found.issues[0];
            const message = first ? `${first.path || "(root)"}: ${first.message}` : "-";
            return sendJson(res, 422, { error: { code: "invalid_case", message: sm(L, "error.invalidCase", { id, message }), issues: found.issues } });
          }
          return sendError(res, 404, "not_found", sm(L, "error.unknownCase", { id }));
        }
        const loaded = await content();
        if (kind === "facilities") {
          const entry = loaded.facilities.get(id);
          if (!entry) return sendError(res, 404, "not_found", sm(L, "error.unknownFacility", { id }));
          const page = documentBody(`facility:${id}`, entry.def);
          return sendCachedJson(req, res, page.body, page.etag);
        }
        if (kind === "catalogs") {
          const entry = loaded.catalogs.get(id);
          if (!entry) return sendError(res, 404, "not_found", sm(L, "error.unknownCatalog", { id }));
          const page = documentBody(`catalog:${id}`, entry.def);
          return sendCachedJson(req, res, page.body, page.etag);
        }
      }
    }
    if (area === "llm" && kind === "stream" && id === undefined) {
      if (method !== "POST") return notAllowed("POST");
      return proxyLlm(req, res, L);
    }
    if (area === "transcripts" && kind !== undefined && id === undefined) {
      if (method !== "POST") return notAllowed("POST");
      if (!isValidSessionId(kind)) return sendError(res, 400, "bad_request", sm(L, "error.badSessionId"));
      const body = await readBody(req, maxBody, () => new HttpError(413, "body_too_large", sm(L, "error.bodyTooLarge", { limit: maxBody })));
      let items;
      try {
        items = parseTranscriptUpload(body.toString("utf8"));
      } catch (err) {
        return sendError(res, 400, "bad_request", sm(L, "error.badRequest", { message: (err as Error).message }));
      }
      // Transcripts switched off in settings: accept and drop (the browser keeps its own copy).
      if (!settings.transcripts.enabled) return sendJson(res, 200, { ok: true, written: 0, stored: false });
      let result;
      try {
        result = await transcripts.append(kind, items);
      } catch (err) {
        if (err instanceof TranscriptQuotaError) return sendError(res, 413, "transcript_quota", sm(L, "error.transcriptQuota"));
        throw err;
      }
      return sendJson(res, 200, { ok: true, written: result.written, stored: true });
    }
    if (area === "world") {
      if (kind !== "sessions") return sendError(res, 404, "not_found", sm(L, "error.notFound"));
      return world.handle(req, res, method, [id, ...rest].filter((part): part is string => part !== undefined), L, auth);
    }
    return sendError(res, 404, "not_found", sm(L, "error.notFound"));
  };

  const proxyLlm = async (req: IncomingMessage, res: ServerResponse, L: string): Promise<void> => {
    if (mediaType(req) !== "application/json") return sendError(res, 415, "unsupported_media_type", sm(L, "error.unsupportedMedia", { type: "application/json" }));
    const body = await readBody(req, maxBody, () => new HttpError(413, "body_too_large", sm(L, "error.bodyTooLarge", { limit: maxBody })));
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.toString("utf8"));
    } catch (err) {
      return sendError(res, 400, "bad_json", sm(L, "error.badJson", { message: (err as Error).message }));
    }
    let call;
    try {
      call = parseProxyCall(parsed);
    } catch (err) {
      return sendError(res, 400, "bad_request", sm(L, "error.badRequest", { message: (err as Error).message }));
    }
    const resolved = resolveProxyConfig(settings, call, env);
    if ("refusal" in resolved) {
      const r = resolved.refusal;
      if (r.kind === "unknown-provider") return sendError(res, 400, "unknown_provider", sm(L, "error.unknownProvider", { message: r.message }));
      if (r.kind === "proxy-loop") return sendError(res, 400, "proxy_loop", sm(L, "error.proxyLoop", { provider: r.provider }));
      return sendError(res, 401, "provider_not_configured", sm(L, "error.providerNotConfigured", { provider: r.provider, env: r.env }));
    }
    const done = streamProxy(res, {
      config: resolved.config,
      request: call.request,
      shutdown: shutdown.signal,
      secrets: proxySecrets(resolved.config, env),
      ...(opts.providerFactory ? { providerFactory: opts.providerFactory } : {}),
    });
    streams.add(done);
    try {
      await done;
    } finally {
      streams.delete(done);
    }
  };

  const listener = ((req: IncomingMessage, res: ServerResponse) => {
    handle(req, res).catch((err: unknown) => {
      const L = localeFromAcceptLanguage(req.headers["accept-language"], settings.locale);
      if (err instanceof HttpError) {
        sendError(res, err.status, err.code, err.message, err.headers);
        if (err.status === 413) res.once("finish", () => req.socket.destroy());
        return;
      }
      // The path only: a query string can carry the access token (`?token=`).
      log(`${req.method} ${pathOnly(req.url)}: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
      if (res.headersSent) res.destroy();
      else sendError(res, 500, "internal", sm(L, "error.internal"));
    });
  }) as RequestHandler;
  listener.close = async () => {
    world.close();
    shutdown.abort();
    await Promise.allSettled([...streams]);
    await transcripts.flush();
  };
  (listener as { worldSessions: WorldSessionRouter }).worldSessions = world;
  return listener;
}

/** The path of a request URL, without query string or fragment (for logs). */
function pathOnly(raw: string | undefined): string {
  try {
    return new URL(raw ?? "/", "http://localhost").pathname;
  } catch {
    return (raw ?? "/").replace(/[?#].*$/s, "");
  }
}

function formatHost(host: string): string {
  const h = host === "0.0.0.0" || host === "::" || host === "" ? "127.0.0.1" : host;
  return h.includes(":") && !h.startsWith("[") ? `[${h}]` : h;
}

/** Start the HTTP server. Resolves once it is listening. */
export async function startServer(opts: ServerOptions): Promise<RunningServer> {
  const host = opts.host ?? opts.settings.server.host;
  const port = opts.port ?? opts.settings.server.port;
  const handler = createRequestHandler({ ...opts, host });
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolve();
    });
  });
  const actual = (server.address() as AddressInfo).port;
  let closing: Promise<void> | null = null;
  return {
    url: `http://${formatHost(host)}:${actual}/`,
    port: actual,
    host,
    close: () =>
      (closing ??= (async () => {
        const closed = new Promise<void>((resolve) => server.close(() => resolve()));
        await handler.close();
        server.closeAllConnections();
        await closed;
      })()),
  };
}
