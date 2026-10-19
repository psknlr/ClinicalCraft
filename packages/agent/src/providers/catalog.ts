/**
 * Data-driven provider catalogue (ZCode lesson: keep vendors as data, keep
 * adapters few). Two wire protocols cover every networked vendor; `offline`
 * and `proxy` are the non-network kinds.
 *
 * Model ids change monthly — templates only carry a default and a few
 * suggestions; users may type any id. Capabilities are derived from
 * regex rules on the model id (`MODEL_RULES`), merged over a `.*` default.
 */
import type { ResolvedSettings } from "../settings/schema.js";
import type { LocalizedName, ModelCapabilities, ModelRule, ProviderConfig, ProviderTemplate } from "./types.js";

/** Default first-party Anthropic endpoint. */
export const ANTHROPIC_BASE_URL = "https://api.anthropic.com";

/** Default path of the provider-neutral proxy served by `clinicalcraft serve`. */
export const DEFAULT_PROXY_URL = "/api/llm/stream";

/** Built-in provider templates (names in zh-CN / en). */
export const PROVIDER_TEMPLATES: readonly ProviderTemplate[] = [
  {
    id: "anthropic",
    name: { "zh-CN": "Anthropic Claude", en: "Anthropic Claude" },
    wire: "anthropic-messages",
    baseUrl: ANTHROPIC_BASE_URL,
    apiKeyEnv: ["ANTHROPIC_API_KEY"],
    keyUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-opus-5-5",
    models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"],
    browserDirect: true,
    notes: {
      "zh-CN": "官方 SDK（Messages API 流式）。浏览器直连仅在使用你自己的密钥时启用。",
      en: "Official SDK (streaming Messages API). Direct browser calls only with your own key.",
    },
  },
  {
    id: "openai",
    name: { "zh-CN": "OpenAI", en: "OpenAI" },
    wire: "openai-chat-completions",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: ["OPENAI_API_KEY"],
    keyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-5",
    models: ["gpt-5", "gpt-5-mini", "gpt-4.1"],
    browserDirect: true,
  },
  {
    id: "xai",
    name: { "zh-CN": "xAI Grok", en: "xAI Grok" },
    wire: "openai-chat-completions",
    baseUrl: "https://api.x.ai/v1",
    apiKeyEnv: ["XAI_API_KEY", "GROK_API_KEY"],
    keyUrl: "https://console.x.ai",
    defaultModel: "grok-4.6",
    models: ["grok-4.6", "grok-4", "grok-3-mini"],
    browserDirect: false,
  },
  {
    id: "zhipu",
    name: { "zh-CN": "智谱 GLM（开放平台）", en: "Zhipu GLM (BigModel)" },
    wire: "openai-chat-completions",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: ["ZHIPU_API_KEY", "ZHIPUAI_API_KEY"],
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    defaultModel: "glm-4.6",
    models: ["glm-4.6", "glm-5", "glm-4.5-air", "glm-4.5v"],
    browserDirect: false,
  },
  {
    id: "zai",
    name: { "zh-CN": "Z.ai（智谱国际站）", en: "Z.ai (GLM international)" },
    wire: "openai-chat-completions",
    baseUrl: "https://api.z.ai/api/paas/v4",
    apiKeyEnv: ["ZAI_API_KEY"],
    keyUrl: "https://z.ai/manage-apikey/apikey-list",
    defaultModel: "glm-4.6",
    models: ["glm-4.6", "glm-5", "glm-4.5-air"],
    browserDirect: false,
  },
  {
    id: "zhipu-anthropic",
    name: { "zh-CN": "智谱 GLM（Anthropic 兼容端点）", en: "Zhipu GLM (Anthropic-compatible)" },
    wire: "anthropic-messages",
    baseUrl: "https://open.bigmodel.cn/api/anthropic",
    apiKeyEnv: ["ZHIPU_API_KEY", "ZHIPUAI_API_KEY"],
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    defaultModel: "glm-4.6",
    models: ["glm-4.6", "glm-5"],
    browserDirect: false,
  },
  {
    id: "deepseek",
    name: { "zh-CN": "深度求索 DeepSeek", en: "DeepSeek" },
    wire: "openai-chat-completions",
    baseUrl: "https://api.deepseek.com",
    apiKeyEnv: ["DEEPSEEK_API_KEY"],
    keyUrl: "https://platform.deepseek.com/api_keys",
    defaultModel: "deepseek-v4-pro",
    models: ["deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
    browserDirect: false,
  },
  {
    id: "moonshot",
    name: { "zh-CN": "月之暗面 Kimi", en: "Moonshot Kimi" },
    wire: "openai-chat-completions",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnv: ["MOONSHOT_API_KEY"],
    keyUrl: "https://platform.moonshot.cn/console/api-keys",
    defaultModel: "kimi-k2.6",
    models: ["kimi-k2.6", "kimi-k2-turbo-preview"],
    browserDirect: false,
  },
  {
    id: "moonshot-anthropic",
    name: { "zh-CN": "月之暗面 Kimi（Anthropic 兼容端点）", en: "Moonshot Kimi (Anthropic-compatible)" },
    wire: "anthropic-messages",
    baseUrl: "https://api.moonshot.cn/anthropic",
    apiKeyEnv: ["MOONSHOT_API_KEY"],
    keyUrl: "https://platform.moonshot.cn/console/api-keys",
    defaultModel: "kimi-k2.6",
    models: ["kimi-k2.6"],
    browserDirect: false,
    notes: { "zh-CN": "温度自动 ×0.6（Kimi Anthropic 端点约定）。", en: "Temperature is scaled ×0.6 (Kimi Anthropic endpoint convention)." },
  },
  {
    id: "qwen",
    name: { "zh-CN": "通义千问（百炼 DashScope）", en: "Alibaba Qwen (DashScope)" },
    wire: "openai-chat-completions",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: ["DASHSCOPE_API_KEY"],
    keyUrl: "https://bailian.console.aliyun.com/?apiKey=1",
    defaultModel: "qwen-plus",
    models: ["qwen-plus", "qwen-max", "qwen-turbo", "qwen3-coder-plus"],
    browserDirect: false,
  },
  {
    id: "openrouter",
    name: { "zh-CN": "OpenRouter", en: "OpenRouter" },
    wire: "openai-chat-completions",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: ["OPENROUTER_API_KEY"],
    keyUrl: "https://openrouter.ai/keys",
    headers: { "HTTP-Referer": "https://github.com/clinicalcraft/clinicalcraft", "X-Title": "ClinicalCraft" },
    defaultModel: "z-ai/glm-5.3",
    models: ["z-ai/glm-5.3", "anthropic/claude-opus-5-5", "openai/gpt-5", "x-ai/grok-4.6", "qwen/qwen3-235b-a22b"],
    browserDirect: true,
  },
  {
    id: "ollama",
    name: { "zh-CN": "Ollama（本地）", en: "Ollama (local)" },
    wire: "openai-chat-completions",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen3",
    models: ["qwen3", "llama3.3", "gpt-oss"],
    browserDirect: true,
    noKey: true,
    notes: { "zh-CN": "浏览器直连需设置 OLLAMA_ORIGINS。", en: "Direct browser calls need OLLAMA_ORIGINS." },
  },
  {
    id: "lmstudio",
    name: { "zh-CN": "LM Studio（本地）", en: "LM Studio (local)" },
    wire: "openai-chat-completions",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    browserDirect: true,
    noKey: true,
    notes: { "zh-CN": "使用 LM Studio 当前加载的模型。", en: "Uses whichever model LM Studio has loaded." },
  },
  {
    id: "offline",
    name: { "zh-CN": "离线（确定性应答，无需密钥）", en: "Offline (deterministic, no key)" },
    wire: "offline",
    defaultModel: "deterministic",
    browserDirect: true,
    noKey: true,
  },
  {
    id: "proxy",
    name: { "zh-CN": "本地服务器代理", en: "Local server proxy" },
    wire: "proxy",
    baseUrl: DEFAULT_PROXY_URL,
    browserDirect: true,
    noKey: true,
    notes: {
      "zh-CN": "浏览器经 `clinicalcraft serve` 调用模型，密钥只保存在服务器端。可用 `proxy:<供应商>` 指定上游。",
      en: "The browser calls models through `clinicalcraft serve`; keys stay server-side. Use `proxy:<provider>` to pick the upstream.",
    },
  },
];

/** Capabilities assumed for an unknown model (`.*`). */
export const DEFAULT_CAPABILITIES: Readonly<ModelCapabilities> = Object.freeze({
  contextWindow: 128_000,
  maxOutputTokens: 8_192,
  supportsTools: true,
  supportsImages: false,
  vision: false,
  supportsStreaming: true,
  supportsMidConversationSystem: false,
  reasoning: "none",
  forbidsForcedToolChoice: false,
  rejectsSampling: false,
});

/**
 * Capability rules, applied in order; every matching rule is merged over the
 * previous result (later rules refine earlier ones). `match` is a
 * case-insensitive regex tested against the model id; `provider` restricts a
 * rule to one provider id.
 */
export const MODEL_RULES: readonly ModelRule[] = [
  /* ---------------- Anthropic Claude ---------------- */
  // Claude 4.7+ reject sampling parameters (temperature/top_p/top_k); unknown (future) Claude ids are
  // treated the same way because omitting sampling is always accepted while sending it may be a 400.
  { match: "^claude-", capabilities: { contextWindow: 200_000, maxOutputTokens: 64_000, supportsImages: true, reasoning: "anthropic-effort", rejectsSampling: true } },
  {
    match: "^claude-(opus-4-[678]|sonnet-4-6|opus-5|sonnet-5|haiku-5-5|fable-5|mythos-5)",
    capabilities: { contextWindow: 1_000_000, maxOutputTokens: 128_000 },
  },
  // Claude 4.6 and older accept sampling (incl. dated ids such as claude-opus-4-20250514).
  { match: "^claude-(3|2|instant|haiku-4|sonnet-4|opus-4-[0-6]|opus-4$)", capabilities: { rejectsSampling: false } },
  // Forced tool_choice is rejected (we never force; recorded for clients that might).
  { match: "^claude-(opus-5|opus-5-5|fable-5|mythos-5|sonnet-5-5)", capabilities: { forbidsForcedToolChoice: true, rejectsSampling: true } },
  // Mid-conversation `{role:"system"}` messages.
  {
    match: "^claude-(opus-4-8|opus-5|opus-5-5|fable-5|mythos-5|sonnet-5-5|haiku-5-5)",
    capabilities: { supportsMidConversationSystem: true },
  },
  // Haiku 4.5, Sonnet 4.5, Claude 4.0/4.1 (incl. dated ids) and Claude 3 reject `effort`.
  {
    match: "^claude-(haiku-4|sonnet-4-5|sonnet-4-0|sonnet-4-\\d{8}|sonnet-4$|opus-4-1|opus-4-0|opus-4-\\d{8}|opus-4$|3|2|instant)",
    capabilities: { reasoning: "none" },
  },

  /* ---------------- OpenAI ---------------- */
  { match: "^gpt-4o", capabilities: { contextWindow: 128_000, maxOutputTokens: 16_384, supportsImages: true } },
  { match: "^gpt-4\\.1", capabilities: { contextWindow: 1_047_576, maxOutputTokens: 32_768, supportsImages: true } },
  {
    match: "^gpt-5",
    capabilities: { contextWindow: 400_000, maxOutputTokens: 128_000, supportsImages: true, reasoning: "openai-reasoning-effort", rejectsSampling: true },
  },
  {
    match: "^o[1-9]",
    capabilities: { contextWindow: 200_000, maxOutputTokens: 100_000, supportsImages: true, reasoning: "openai-reasoning-effort", rejectsSampling: true },
  },

  /* ---------------- xAI Grok ---------------- */
  { match: "^grok-", capabilities: { contextWindow: 256_000, maxOutputTokens: 32_768, supportsImages: true } },
  { match: "^grok-3-mini", capabilities: { contextWindow: 131_072, supportsImages: false, reasoning: "openai-reasoning-effort" } },

  /* ---------------- Zhipu / Z.ai GLM ---------------- */
  { match: "^glm-", capabilities: { contextWindow: 128_000, maxOutputTokens: 32_768, reasoning: "glm-thinking" } },
  { match: "^glm-(4\\.[6-9]|5)", capabilities: { contextWindow: 200_000, maxOutputTokens: 128_000 } },
  { match: "^glm-[0-9.]+v", capabilities: { supportsImages: true, maxOutputTokens: 16_384 } },
  // GLM behind an Anthropic-compatible endpoint: reasoning flags are vendor-specific — send none.
  { match: "^glm-", provider: "zhipu-anthropic", capabilities: { reasoning: "none" } },
  { match: "^(z-ai/)?glm-", provider: "openrouter", capabilities: { reasoning: "none", contextWindow: 200_000 } },

  /* ---------------- DeepSeek ---------------- */
  { match: "^deepseek-", capabilities: { contextWindow: 128_000, maxOutputTokens: 32_768 } },
  { match: "^deepseek-reasoner", capabilities: { rejectsSampling: true, supportsTools: true } },

  /* ---------------- Moonshot Kimi ---------------- */
  { match: "^kimi-", capabilities: { contextWindow: 256_000, maxOutputTokens: 32_768 } },
  { match: "^kimi-", provider: "moonshot-anthropic", capabilities: { temperatureScale: 0.6 } },

  /* ---------------- Qwen ---------------- */
  { match: "^qwen", capabilities: { contextWindow: 131_072, maxOutputTokens: 16_384 } },
  { match: "^qwen-(max|plus)", capabilities: { contextWindow: 131_072, maxOutputTokens: 32_768 } },
  { match: "^qwen.*vl", capabilities: { supportsImages: true } },
  { match: "^qwen3", provider: "ollama", capabilities: { contextWindow: 40_960, maxOutputTokens: 8_192 } },

  /* ---------------- Offline ---------------- */
  { match: ".*", provider: "offline", capabilities: { supportsTools: false, supportsStreaming: false, contextWindow: 1_000_000 } },
];

const ruleCache = new Map<string, RegExp | null>();
function ruleRegex(pattern: string): RegExp | null {
  let re = ruleCache.get(pattern);
  if (re === undefined) {
    try {
      re = new RegExp(pattern, "i");
    } catch {
      re = null;
    }
    ruleCache.set(pattern, re);
  }
  return re;
}

/**
 * Capabilities for a model on a provider: the `.*` default with every
 * matching rule merged in order. OpenRouter-style ids (`vendor/model`) are
 * also tested without the vendor prefix. `vision` (camera frames in tool
 * results) follows `supportsImages` unless a matching rule sets it.
 */
export function capabilitiesFor(providerId: string, model: string, rules: readonly ModelRule[] = MODEL_RULES): ModelCapabilities {
  const caps: ModelCapabilities = { ...DEFAULT_CAPABILITIES };
  const id = (model ?? "").trim();
  const bare = id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id;
  let visionSet = false;
  for (const rule of rules) {
    if (rule.provider && rule.provider !== providerId) continue;
    const re = ruleRegex(rule.match);
    if (!re) continue;
    if (re.test(id) || (bare !== id && re.test(bare))) {
      Object.assign(caps, rule.capabilities);
      if (rule.capabilities.vision !== undefined) visionSet = true;
    }
  }
  if (!visionSet) caps.vision = caps.supportsImages;
  return caps;
}

/** Find a built-in template by id. */
export function findProviderTemplate(id: string): ProviderTemplate | undefined {
  return PROVIDER_TEMPLATES.find((t) => t.id === id);
}

/** Pick a localised display name (`zh-CN` → `zh` → `en` → first). */
export function localizedName(name: LocalizedName | undefined, locale: string): string {
  if (name == null) return "";
  if (typeof name === "string") return name;
  const lang = locale.split("-")[0];
  return name[locale] ?? (lang ? name[lang] : undefined) ?? name.en ?? Object.values(name)[0] ?? "";
}

/** Thrown by `resolveProviderConfig` for unknown/misconfigured providers. */
export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

export interface ResolveProviderOptions {
  /** The caller runs in a browser (Anthropic `dangerouslyAllowBrowser` when a key is present). */
  browser?: boolean;
}

/**
 * Resolve a ready-to-use provider configuration (isomorphic; env is passed in).
 *
 * - Template fields are overridden by `settings.providers[id]`; a provider
 *   that exists only in settings must declare `wire`.
 * - API key: `settings.providers[id].apiKey` (user/local settings only — the
 *   merge layer strips it from project files), else the first non-empty
 *   variable of `apiKeyEnv`.
 * - Model: explicit `model`, else `settings.model` when `providerId` is the
 *   active provider, else the override/template `defaultModel`.
 * - `proxy` and `proxy:<upstream>`: `proxyUrl` = base URL (default
 *   `/api/llm/stream`), `proxyProvider` = upstream id (omitted → server default).
 */
export function resolveProviderConfig(
  settings: Pick<ResolvedSettings, "provider" | "model" | "providers">,
  providerId: string,
  model: string | null | undefined,
  env: Record<string, string | undefined>,
  options: ResolveProviderOptions = {},
): ProviderConfig {
  let id = providerId.trim();
  let proxyUpstream: string | undefined;
  if (id.startsWith("proxy:")) {
    proxyUpstream = id.slice("proxy:".length).trim() || undefined;
    id = "proxy";
  }
  const template = findProviderTemplate(id);
  const override = settings.providers?.[id];
  if (!template && !override) {
    throw new ProviderConfigError(`Unknown provider "${providerId}". Known providers: ${PROVIDER_TEMPLATES.map((t) => t.id).join(", ")}`);
  }
  const wire = override?.wire ?? template?.wire;
  if (!wire) throw new ProviderConfigError(`Provider "${id}" is defined in settings without a "wire" (anthropic-messages | openai-chat-completions).`);

  const baseUrl = override?.baseUrl ?? template?.baseUrl;
  const headers = { ...(template?.headers ?? {}), ...(override?.headers ?? {}) };
  const explicitModel = model?.trim() || undefined;
  const settingsModel = settings.provider === providerId || settings.provider === id ? settings.model?.trim() || undefined : undefined;
  const resolvedModel =
    explicitModel ?? settingsModel ?? override?.defaultModel ?? template?.defaultModel ?? override?.models?.[0] ?? template?.models?.[0] ?? "";

  const config: ProviderConfig = { id, wire, model: resolvedModel };
  if (Object.keys(headers).length > 0) config.headers = headers;
  if (override?.timeoutMs != null) config.timeoutMs = override.timeoutMs;
  if (override?.maxRetries != null) config.maxRetries = override.maxRetries;

  if (wire === "offline") {
    config.model = resolvedModel || "deterministic";
    return config;
  }
  if (wire === "proxy") {
    config.proxyUrl = baseUrl ?? DEFAULT_PROXY_URL;
    if (proxyUpstream) config.proxyProvider = proxyUpstream;
    const token = override?.apiKey ?? firstEnv(env, override?.apiKeyEnv ?? template?.apiKeyEnv);
    if (token) config.apiKey = token;
    return config;
  }

  if (baseUrl) config.baseUrl = baseUrl;
  const noKey = template?.noKey === true && !override?.apiKey && !override?.apiKeyEnv;
  if (!noKey) {
    const key = override?.apiKey ?? firstEnv(env, override?.apiKeyEnv ?? template?.apiKeyEnv);
    if (key) config.apiKey = key;
  }
  if (options.browser) config.browser = true;
  return config;
}

function firstEnv(env: Record<string, string | undefined>, names: readonly string[] | undefined): string | undefined {
  for (const name of names ?? []) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Whether a provider has a usable key in `env`/settings (never returns the key). */
export function isProviderConfigured(
  settings: Pick<ResolvedSettings, "provider" | "model" | "providers">,
  providerId: string,
  env: Record<string, string | undefined>,
): boolean {
  try {
    const config = resolveProviderConfig(settings, providerId, null, env);
    if (config.wire === "offline" || config.wire === "proxy") return true;
    const template = findProviderTemplate(config.id);
    return Boolean(config.apiKey) || template?.noKey === true;
  } catch {
    return false;
  }
}
