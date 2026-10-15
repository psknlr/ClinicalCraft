/**
 * Provider-neutral LLM proxy (`POST /api/llm/stream`) and the provider list
 * (`GET /api/providers`). The browser's `ProxyProvider` sends
 * `{provider?, model?, request: ChatRequest}`; the server resolves the
 * provider with its own environment (keys never leave the server), streams
 * normalised `StreamEvent`s as SSE (`data: <json>\n\n`) and ends with
 * `event: done`. A client disconnect aborts the upstream request.
 */
import type { ServerResponse } from "node:http";
import {
  createProvider,
  findProviderTemplate,
  isProviderConfigured,
  PROVIDER_TEMPLATES,
  ProviderConfigError,
  redactSecrets,
  secretsFromEnv,
  withRetry,
  type ChatMessage,
  type ChatPart,
  type ChatRequest,
  type LLMProvider,
  type ProviderConfig,
  type ProviderErrorInfo,
  type ResolvedSettings,
  type StreamEvent,
  type SystemSection,
  type ToolSpec,
  type WireApi,
} from "@clinicalcraft/agent";
import { resolveNodeProviderConfig, type Env } from "@clinicalcraft/agent/node";

/** Upper bounds that keep a single proxied request sane. */
const LIMITS = { messages: 4000, parts: 500, system: 64, tools: 128, maxTokens: 1_000_000 };
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);
const CACHE_KINDS = new Set(["stable", "dynamic"]);
const WIRES = new Set(["anthropic-messages", "openai-chat-completions", "offline", "proxy"]);

/** Parsed `POST /api/llm/stream` body. */
export interface ProxyCall {
  provider: string | null;
  model: string | null;
  request: ChatRequest;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): v is string {
  return typeof v === "string";
}

function parsePart(raw: unknown, where: string): ChatPart {
  if (!isObject(raw) || !str(raw.type)) throw new Error(`${where}: expected a part object with a string "type"`);
  switch (raw.type) {
    case "text":
      if (!str(raw.text)) throw new Error(`${where}.text must be a string`);
      return { type: "text", text: raw.text };
    case "image":
      if (!str(raw.mediaType) || !str(raw.data)) throw new Error(`${where}: image parts need string "mediaType" and "data"`);
      return { type: "image", mediaType: raw.mediaType, data: raw.data };
    case "tool_call":
      if (!str(raw.id) || !str(raw.name)) throw new Error(`${where}: tool_call parts need string "id" and "name"`);
      return { type: "tool_call", id: raw.id, name: raw.name, args: raw.args ?? {} };
    case "tool_result":
      if (!str(raw.callId) || !str(raw.content)) throw new Error(`${where}: tool_result parts need string "callId" and "content"`);
      return { type: "tool_result", callId: raw.callId, content: raw.content, ...(raw.isError === true ? { isError: true } : {}) };
    case "provider_raw":
      if (!str(raw.provider) || !WIRES.has(raw.provider)) throw new Error(`${where}.provider must be a wire id`);
      return { type: "provider_raw", provider: raw.provider as WireApi, data: raw.data };
    default:
      throw new Error(`${where}.type "${raw.type}" is not a known part type`);
  }
}

function parseMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) throw new Error("request.messages must be an array");
  if (raw.length > LIMITS.messages) throw new Error(`request.messages has more than ${LIMITS.messages} items`);
  return raw.map((m, i) => {
    const where = `request.messages.${i}`;
    if (!isObject(m) || (m.role !== "user" && m.role !== "assistant")) throw new Error(`${where}.role must be "user" or "assistant"`);
    const content = typeof m.content === "string" ? [{ type: "text", text: m.content }] : m.content;
    if (!Array.isArray(content)) throw new Error(`${where}.content must be an array of parts`);
    if (content.length > LIMITS.parts) throw new Error(`${where}.content has more than ${LIMITS.parts} parts`);
    return { role: m.role, content: content.map((p, j) => parsePart(p, `${where}.content.${j}`)) };
  });
}

function parseSystem(raw: unknown): SystemSection[] {
  if (raw === undefined) return [];
  if (typeof raw === "string") return [{ id: "system", text: raw, cache: "stable" }];
  if (!Array.isArray(raw) || raw.length > LIMITS.system) throw new Error("request.system must be an array of sections");
  return raw.map((s, i) => {
    if (!isObject(s) || !str(s.text)) throw new Error(`request.system.${i}.text must be a string`);
    return { id: str(s.id) ? s.id : `s${i}`, text: s.text, cache: str(s.cache) && CACHE_KINDS.has(s.cache) ? (s.cache as SystemSection["cache"]) : "dynamic" };
  });
}

function parseTools(raw: unknown): ToolSpec[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > LIMITS.tools) throw new Error(`request.tools must be an array of at most ${LIMITS.tools} tools`);
  return raw.map((t, i) => {
    if (!isObject(t) || !str(t.name) || (t.description !== undefined && !str(t.description)) || !isObject(t.inputSchema)) {
      throw new Error(`request.tools.${i} needs a string "name" and an object "inputSchema"`);
    }
    return { name: t.name, description: str(t.description) ? t.description : "", inputSchema: t.inputSchema };
  });
}

/**
 * Validate a proxy body and copy only the known `ChatRequest` fields
 * (unknown keys are dropped, never forwarded). Throws `Error` with a
 * human-readable path on bad input.
 */
export function parseProxyCall(body: unknown): ProxyCall {
  if (!isObject(body)) throw new Error("body must be a JSON object");
  if (body.provider !== undefined && body.provider !== null && !str(body.provider)) throw new Error("provider must be a string");
  if (body.model !== undefined && body.model !== null && !str(body.model)) throw new Error("model must be a string");
  const r = body.request;
  if (!isObject(r)) throw new Error("request must be an object");
  if (r.model !== undefined && !str(r.model)) throw new Error("request.model must be a string");

  const request: ChatRequest = { model: str(r.model) ? r.model : "", system: parseSystem(r.system), messages: parseMessages(r.messages) };
  const tools = parseTools(r.tools);
  if (tools) request.tools = tools;
  if (r.maxTokens !== undefined) {
    if (!Number.isInteger(r.maxTokens) || (r.maxTokens as number) <= 0 || (r.maxTokens as number) > LIMITS.maxTokens) throw new Error("request.maxTokens must be a positive integer");
    request.maxTokens = r.maxTokens as number;
  }
  if (r.temperature !== undefined) {
    if (typeof r.temperature !== "number" || !Number.isFinite(r.temperature) || r.temperature < 0 || r.temperature > 2) throw new Error("request.temperature must be a number in [0, 2]");
    request.temperature = r.temperature;
  }
  if (r.effort !== undefined) {
    if (!str(r.effort) || !EFFORTS.has(r.effort)) throw new Error("request.effort must be one of low|medium|high|xhigh|max");
    request.effort = r.effort as NonNullable<ChatRequest["effort"]>;
  }
  if (r.responseFormat !== undefined) {
    const f = r.responseFormat;
    if (!isObject(f) || !str(f.name) || !isObject(f.schema)) throw new Error("request.responseFormat needs a string \"name\" and an object \"schema\"");
    request.responseFormat = { name: f.name, schema: f.schema };
  }
  if (r.conversationId !== undefined) {
    if (!str(r.conversationId)) throw new Error("request.conversationId must be a string");
    request.conversationId = r.conversationId;
  }
  if (r.metadata !== undefined) {
    if (!isObject(r.metadata) || !Object.values(r.metadata).every(str)) throw new Error("request.metadata must map strings to strings");
    request.metadata = { ...(r.metadata as Record<string, string>) };
  }
  const provider = str(body.provider) && body.provider.trim() ? body.provider.trim() : null;
  const model = str(body.model) && body.model.trim() ? body.model.trim() : request.model.trim() || null;
  return { provider, model, request };
}

/** Why a proxy call cannot be served (mapped to an HTTP error by the router). */
export type ProxyRefusal =
  | { kind: "unknown-provider"; message: string }
  | { kind: "proxy-loop"; provider: string }
  | { kind: "not-configured"; provider: string; env: string };

/** Resolve the upstream provider config server-side, or explain why not. */
export function resolveProxyConfig(settings: ResolvedSettings, call: ProxyCall, env: Env): { config: ProviderConfig } | { refusal: ProxyRefusal } {
  let config: ProviderConfig;
  try {
    config = resolveNodeProviderConfig(settings, call.provider, call.model, env);
  } catch (err) {
    if (err instanceof ProviderConfigError) return { refusal: { kind: "unknown-provider", message: err.message } };
    throw err;
  }
  if (config.wire === "proxy") return { refusal: { kind: "proxy-loop", provider: config.id } };
  if (config.wire !== "offline" && !config.apiKey) {
    const template = findProviderTemplate(config.id);
    const override = settings.providers[config.id];
    const noKey = template?.noKey === true && !override?.apiKey && !override?.apiKeyEnv;
    if (!noKey) {
      const env = (override?.apiKeyEnv ?? template?.apiKeyEnv ?? []).join(" / ") || "an API key";
      return { refusal: { kind: "not-configured", provider: config.id, env } };
    }
  }
  return { config };
}

/**
 * A base URL as it may be shown to API clients: no userinfo, query string or
 * fragment (gateways sometimes carry credentials there). Null when unparsable.
 */
export function publicBaseUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return url.replace(/[?#].*$/s, "");
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname === "/" && !url.replace(/[?#].*$/s, "").endsWith("/") ? "" : u.pathname}`;
  } catch {
    return null;
  }
}

/** Credentials that may appear in an upstream's error text for `config` (key, header values, URL userinfo/query values) and in `env`. */
export function proxySecrets(config: ProviderConfig, env: Env): string[] {
  const out = new Set<string>(secretsFromEnv(env));
  if (config.apiKey) out.add(config.apiKey);
  for (const value of Object.values(config.headers ?? {})) if (value) out.add(value);
  for (const url of [config.baseUrl, config.proxyUrl]) {
    if (!url) continue;
    try {
      const u = new URL(url);
      for (const part of [decodeURIComponent(u.username), decodeURIComponent(u.password), u.username, u.password]) if (part) out.add(part);
      for (const value of u.searchParams.values()) if (value) out.add(value);
    } catch {
      /* relative or invalid: nothing embedded */
    }
  }
  return [...out];
}

/** Provider list for `GET /api/providers`: templates and settings-defined providers, never keys (base URLs without credentials). */
export function providerList(settings: ResolvedSettings, env: Env) {
  const ids = new Set<string>(PROVIDER_TEMPLATES.map((t) => t.id));
  for (const [id, o] of Object.entries(settings.providers)) if (o.wire) ids.add(id);
  ids.delete("proxy"); // the server is the proxy
  const providers = [...ids].map((id) => {
    const template = findProviderTemplate(id);
    const override = settings.providers[id];
    return {
      id,
      name: override?.name ?? template?.name ?? id,
      wire: override?.wire ?? template?.wire ?? null,
      baseUrl: publicBaseUrl(override?.baseUrl ?? template?.baseUrl),
      defaultModel: override?.defaultModel ?? template?.defaultModel ?? null,
      models: override?.models ?? template?.models ?? [],
      keyUrl: template?.keyUrl ?? null,
      browserDirect: template?.browserDirect === true,
      noKey: template?.noKey === true,
      configured: isProviderConfigured(settings, id, env),
    };
  });
  return { active: { provider: settings.provider, model: settings.model }, providers };
}

export interface StreamProxyOptions {
  config: ProviderConfig;
  request: ChatRequest;
  /** Build the upstream provider (default: `withRetry(createProvider(config))`). */
  providerFactory?: (config: ProviderConfig) => LLMProvider;
  /** Server shutdown signal (aborts the upstream request too). */
  shutdown?: AbortSignal;
  /** Keep-alive comment interval (ms). */
  heartbeatMs?: number;
  /** Values masked in error text sent to the client (default: `proxySecrets(config, {})`; the server adds its environment's). */
  secrets?: readonly string[];
}

function defaultProvider(config: ProviderConfig, res: ServerResponse): LLMProvider {
  return withRetry(createProvider(config), {
    maxRetries: config.maxRetries ?? 2,
    // SSE comments keep the connection (and intermediaries) alive while backing off.
    onRetry: (attempt, delayMs, error) => writeSse(res, `: retry ${attempt} in ${delayMs} ms (${error.kind})\n\n`),
  });
}

function writeSse(res: ServerResponse, chunk: string): boolean {
  if (res.writableEnded || res.destroyed) return false;
  return res.write(chunk);
}

/**
 * Stream one model response as SSE. Resolves when the stream ended (normally,
 * upstream error, or client disconnect — which aborts the upstream call).
 */
export async function streamProxy(res: ServerResponse, opts: StreamProxyOptions): Promise<void> {
  const controller = new AbortController();
  const onClose = () => {
    if (!res.writableFinished) controller.abort();
  };
  res.on("close", onClose);
  const onShutdown = () => controller.abort();
  opts.shutdown?.addEventListener("abort", onShutdown, { once: true });

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.flushHeaders();
  const heartbeat = setInterval(() => writeSse(res, ": ping\n\n"), opts.heartbeatMs ?? 15_000);
  heartbeat.unref?.();

  const request: ChatRequest = { ...opts.request, model: opts.config.model };
  // Upstream error text can echo keys, gateway credentials or other secrets: mask them (as the CLI does).
  const secrets = opts.secrets ?? proxySecrets(opts.config, {});
  const clean = (message: string) => redactSecrets(message, secrets);
  try {
    const provider = opts.providerFactory ? opts.providerFactory(opts.config) : defaultProvider(opts.config, res);
    for await (const event of provider.stream(request, controller.signal)) {
      if (controller.signal.aborted) break;
      const safe: StreamEvent = event.type === "error" ? { ...event, error: { ...event.error, message: clean(event.error.message) } } : event;
      writeSse(res, `data: ${JSON.stringify(safe)}\n\n`);
      if (event.type === "error") break;
    }
  } catch (err) {
    if (!controller.signal.aborted) {
      const error: ProviderErrorInfo = { message: clean(err instanceof Error ? err.message : String(err)), kind: "unknown", retryable: false };
      writeSse(res, `data: ${JSON.stringify({ type: "error", error } satisfies StreamEvent)}\n\n`);
    }
  } finally {
    clearInterval(heartbeat);
    opts.shutdown?.removeEventListener("abort", onShutdown);
    if (!controller.signal.aborted) writeSse(res, "event: done\ndata: {}\n\n");
    if (!res.writableEnded) res.end();
    res.off("close", onClose);
  }
}
