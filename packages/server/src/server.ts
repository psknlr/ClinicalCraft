/**
 * `@clinicalcraft/server` — node:http server for `clinicalcraft serve`
 * (docs/PROTOCOL.md §11, docs/ASSETS.md): the web build, the content API,
 * local-only assets, the provider list, the provider-neutral LLM proxy and
 * transcript uploads. Security policy: see `security.ts`.
 */
import { createServer, type IncomingMessage, type RequestListener, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { CLINICALCRAFT_VERSION, type LLMProvider, type ProviderConfig, type ResolvedSettings } from "@clinicalcraft/agent";
import { loadContent, localAssetDirs, type Env, type LoadedContent } from "@clinicalcraft/agent/node";
import { contentIndex, publicCase } from "./content.js";
import { HttpError, MAX_BODY_BYTES, mediaType, readBody, sendError, sendJson } from "./http.js";
import { localeFromAcceptLanguage, sm } from "./i18n.js";
import { parseProxyCall, providerList, resolveProxyConfig, streamProxy } from "./llm.js";
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
import { isValidSessionId, parseTranscriptUpload, WebTranscriptStore } from "./transcripts.js";

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
  /** Pre-loaded content (skips scanning; tests). */
  content?: LoadedContent;
  /** Environment for provider keys and CLINICALCRAFT_HOME (default `process.env`). */
  env?: Env;
  /** Working directory used to find `assets/local` (default `process.cwd()`). */
  cwd?: string;
  /** Local-only asset roots (default `localAssetDirs(cwd, env)`). */
  assetDirs?: string[];
  /** Build upstream providers for the LLM proxy (default `withRetry(createProvider(config))`). */
  providerFactory?: (config: ProviderConfig) => LLMProvider;
  /** Request body limit in bytes (default 2 MB). */
  maxBodyBytes?: number;
  /** Diagnostics sink (default: stderr). */
  log?: (message: string) => void;
}

/** A request handler plus its lifecycle hooks (embedding and tests). */
export interface RequestHandler extends RequestListener {
  /** Abort open LLM streams and flush transcript writes. */
  close(): Promise<void>;
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
  const assetDirs = opts.assetDirs ?? localAssetDirs(opts.cwd ?? process.cwd(), env);
  const csp = contentSecurityPolicy(providerOrigins(settings));
  const baseHeaders = securityHeaders(csp);
  const transcripts = new WebTranscriptStore(env);
  const shutdown = new AbortController();
  const streams = new Set<Promise<void>>();
  let contentPromise: Promise<LoadedContent> | null = opts.content ? Promise.resolve(opts.content) : null;
  const content = () => (contentPromise ??= loadContent({ dirs: opts.contentDirs ?? settings.contentDirs }));

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
    let cors: Record<string, string> = {};
    if (isApi) {
      const origin = classifyOrigin(req);
      if (origin.kind === "forbidden") return sendError(res, 403, "forbidden_origin", sm(L, "error.forbiddenOrigin", { origin: origin.origin }));
      if (origin.kind === "allowed") cors = corsHeaders(origin.origin, method === "OPTIONS");
      for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
      if (method === "OPTIONS") {
        res.writeHead(204, { "content-length": "0" });
        return void res.end();
      }
    }

    if (token) {
      const check = checkToken(req, url, token);
      if (check.ok && check.viaQuery) res.setHeader("set-cookie", tokenCookie(token));
      if (!check.ok && (isApi || isAsset)) {
        return sendError(res, 401, "unauthorized", sm(L, "error.unauthorized"), { "www-authenticate": 'Bearer realm="clinicalcraft"' });
      }
    }

    if (isApi) return routeApi(req, res, method, path, L);

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

  const routeApi = async (req: IncomingMessage, res: ServerResponse, method: string, path: string, L: string): Promise<void> => {
    const segments = path.split("/").filter(Boolean).map((s) => {
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
      return sendJson(res, 200, { status: "ok", name: "clinicalcraft", version: CLINICALCRAFT_VERSION, provider: settings.provider, locale: settings.locale, auth: token !== null });
    }
    if (area === "providers" && !kind) {
      if (!get) return notAllowed("GET, HEAD");
      return sendJson(res, 200, providerList(settings, env));
    }
    if (area === "content" && kind && rest.length === 0) {
      if (!get) return notAllowed("GET, HEAD");
      const loaded = await content();
      if (kind === "index" && id === undefined) return sendJson(res, 200, contentIndex(loaded));
      if (id !== undefined) {
        if (kind === "cases") {
          const entry = loaded.cases.get(id);
          return entry ? sendJson(res, 200, publicCase(entry.def)) : sendError(res, 404, "not_found", sm(L, "error.unknownCase", { id }));
        }
        if (kind === "facilities") {
          const entry = loaded.facilities.get(id);
          return entry ? sendJson(res, 200, entry.def) : sendError(res, 404, "not_found", sm(L, "error.unknownFacility", { id }));
        }
        if (kind === "catalogs") {
          const entry = loaded.catalogs.get(id);
          return entry ? sendJson(res, 200, entry.def) : sendError(res, 404, "not_found", sm(L, "error.unknownCatalog", { id }));
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
      const result = await transcripts.append(kind, items);
      return sendJson(res, 200, { ok: true, written: result.written });
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
      log(`${req.method} ${req.url}: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
      if (res.headersSent) res.destroy();
      else sendError(res, 500, "internal", sm(L, "error.internal"));
    });
  }) as RequestHandler;
  listener.close = async () => {
    shutdown.abort();
    await Promise.allSettled([...streams]);
    await transcripts.flush();
  };
  return listener;
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
