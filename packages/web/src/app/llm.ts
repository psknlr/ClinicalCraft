/**
 * How the browser reaches a language model (docs/PROTOCOL.md §11 Web):
 *
 *   offline  default; deterministic responders, no network
 *   proxy    page served by `clinicalcraft serve` (GET /api/health answers JSON):
 *            ProxyProvider → POST /api/llm/stream, keys stay server-side
 *   direct   user-entered key (sessionStorage by default): Anthropic through the
 *            official SDK with `dangerouslyAllowBrowser` ONLY in this explicit
 *            user-key mode; OpenAI-compatible providers through fetch
 *
 * The standalone single-file build is offline only.
 */
import {
  createProvider,
  findProviderTemplate,
  localizedName,
  PROVIDER_TEMPLATES,
  resolveProviderConfig,
  type ProviderConfig,
  type ProviderTemplate,
  type ResolvedSettings,
  type StreamEvent,
} from "@clinicalcraft/agent";
import { getLocale } from "../i18n/index.js";
import { KeyStore, type LlmPrefs } from "./settings.js";

export interface ServerInfo {
  served: boolean;
  health: Record<string, unknown> | null;
  /** Providers configured on the server (from GET /api/providers), when known. */
  providers: { id: string; configured: boolean; name: string; defaultModel?: string; models?: string[] }[];
}

export const STANDALONE: boolean = typeof __STANDALONE__ !== "undefined" && __STANDALONE__;

let serverPromise: Promise<ServerInfo> | null = null;

async function fetchJson(url: string, timeoutMs: number): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    // The Vite dev server answers unknown routes with index.html: require JSON.
    if (!(res.headers.get("content-type") ?? "").includes("json")) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Detect `clinicalcraft serve` (memoised). */
export function detectServer(): Promise<ServerInfo> {
  if (serverPromise) return serverPromise;
  serverPromise = (async (): Promise<ServerInfo> => {
    if (STANDALONE || location.protocol === "file:") return { served: false, health: null, providers: [] };
    const health = await fetchJson("/api/health", 6000);
    if (!health || typeof health !== "object") return { served: false, health: null, providers: [] };
    const raw = await fetchJson("/api/providers", 6000);
    const list = Array.isArray(raw) ? raw : Array.isArray((raw as { providers?: unknown })?.providers) ? (raw as { providers: unknown[] }).providers : [];
    const providers = list
      .filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && typeof (p as { id?: unknown }).id === "string")
      .map((p) => ({
        id: String(p.id),
        configured: p.configured === true,
        name: localizedName(p.name as never, getLocale()) || String(p.id),
        ...(typeof p.defaultModel === "string" ? { defaultModel: p.defaultModel } : {}),
        ...(Array.isArray(p.models) ? { models: (p.models as unknown[]).filter((m): m is string => typeof m === "string") } : {}),
      }));
    return { served: true, health: health as Record<string, unknown>, providers };
  })();
  return serverPromise;
}

/** Templates offered for direct browser use (networked wires only). */
export function directTemplates(): ProviderTemplate[] {
  return PROVIDER_TEMPLATES.filter((t) => t.wire === "anthropic-messages" || t.wire === "openai-chat-completions");
}

export function providerName(id: string): string {
  const tpl = findProviderTemplate(id);
  return tpl ? localizedName(tpl.name, getLocale()) : id;
}

export interface RuntimeChoice {
  /** Settings `provider` id ("offline", "proxy", "proxy:zhipu", "anthropic"…). */
  provider: string;
  model: string | null;
  /** Mode actually in effect (proxy without a server / direct without a key fall back to offline). */
  mode: LlmPrefs["mode"];
  /** The preferred mode could not be used. */
  fellBack: boolean;
}

/** Decide the provider for a session from the preferences and what is available. */
export function runtimeChoice(llm: LlmPrefs, server: ServerInfo | null): RuntimeChoice {
  if (STANDALONE || llm.mode === "offline") return { provider: "offline", model: null, mode: "offline", fellBack: false };
  if (llm.mode === "proxy") {
    if (!server?.served) return { provider: "offline", model: null, mode: "offline", fellBack: true };
    const upstream = llm.proxyProvider.trim();
    return { provider: upstream ? `proxy:${upstream}` : "proxy", model: llm.proxyModel.trim() || null, mode: "proxy", fellBack: false };
  }
  const tpl = findProviderTemplate(llm.directProvider);
  if (!tpl || (tpl.wire !== "anthropic-messages" && tpl.wire !== "openai-chat-completions")) return { provider: "offline", model: null, mode: "offline", fellBack: true };
  if (!tpl.noKey && !KeyStore.get(tpl.id)) return { provider: "offline", model: null, mode: "offline", fellBack: true };
  return { provider: tpl.id, model: llm.directModel.trim() || tpl.defaultModel || null, mode: "direct", fellBack: false };
}

/**
 * `SessionOptions.resolveProvider` for the browser: catalogue + settings
 * overrides; direct mode adds the user's key and the explicit browser flag.
 */
export function browserResolveProvider(settings: () => ResolvedSettings, mode: () => LlmPrefs["mode"]) {
  return (providerId: string, model: string | null): ProviderConfig => {
    const s = settings();
    const config = resolveProviderConfig(s, providerId, model, {});
    if (config.wire === "offline" || config.wire === "proxy") return config;
    // A networked wire: only in explicit direct mode, with the user's own key.
    if (mode() !== "direct") return { ...config, wire: "offline", model: "deterministic" };
    const key = KeyStore.get(config.id);
    const out: ProviderConfig = { ...config };
    if (key) out.apiKey = key;
    // Anthropic SDK `dangerouslyAllowBrowser`: only with a user-supplied key.
    if (config.wire === "anthropic-messages") out.browser = !!key;
    return out;
  };
}

/** Pill / badge text for the current choice. */
export function statusLabel(choice: RuntimeChoice): { mode: RuntimeChoice["mode"]; provider: string; model: string } {
  if (choice.mode === "offline") return { mode: "offline", provider: "offline", model: "deterministic" };
  if (choice.mode === "proxy") {
    const upstream = choice.provider.startsWith("proxy:") ? choice.provider.slice(6) : "";
    return { mode: "proxy", provider: upstream ? providerName(upstream) : "proxy", model: choice.model ?? (upstream ? findProviderTemplate(upstream)?.defaultModel ?? "" : "") };
  }
  return { mode: "direct", provider: providerName(choice.provider), model: choice.model ?? "" };
}

/** Send a tiny request through a provider config and report the outcome. */
export async function testConnection(config: ProviderConfig, timeoutMs = 20000): Promise<{ ok: boolean; message: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const provider = createProvider(config);
    let text = "";
    let error: string | null = null;
    for await (const e of provider.stream(
      {
        model: config.model,
        system: [{ id: "ping", text: "Reply with the single word: pong", cache: "stable" }],
        messages: [{ role: "user", content: [{ type: "text", text: "ping" }] }],
        maxTokens: 16,
      },
      ctrl.signal,
    ) as AsyncIterable<StreamEvent>) {
      if (e.type === "text_delta") text += e.text;
      if (e.type === "error") error = e.error.message;
      if (e.type === "finish") break;
    }
    if (error) return { ok: false, message: error };
    return { ok: true, message: text.trim().slice(0, 40) || config.model };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
