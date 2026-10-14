import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../settings/merge.js";
import type { ResolvedSettings } from "../settings/schema.js";
import { capabilitiesFor, isProviderConfigured, localizedName, PROVIDER_TEMPLATES, ProviderConfigError, resolveProviderConfig } from "./catalog.js";

const settings = (patch: Partial<ResolvedSettings> = {}): ResolvedSettings => ({ ...structuredClone(DEFAULT_SETTINGS as ResolvedSettings), ...patch });

describe("PROVIDER_TEMPLATES", () => {
  it("covers every provider of PROTOCOL §5 with bilingual names", () => {
    const ids = PROVIDER_TEMPLATES.map((t) => t.id);
    for (const id of ["anthropic", "openai", "xai", "zhipu", "zai", "zhipu-anthropic", "deepseek", "moonshot", "qwen", "openrouter", "ollama", "lmstudio", "offline", "proxy"]) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PROVIDER_TEMPLATES) {
      expect(typeof t.name === "object" && t.name["zh-CN"] && t.name.en).toBeTruthy();
    }
    expect(PROVIDER_TEMPLATES.find((t) => t.id === "anthropic")).toMatchObject({ wire: "anthropic-messages", defaultModel: "claude-opus-5-5", apiKeyEnv: ["ANTHROPIC_API_KEY"] });
    expect(PROVIDER_TEMPLATES.find((t) => t.id === "xai")!.apiKeyEnv).toEqual(["XAI_API_KEY", "GROK_API_KEY"]);
    expect(PROVIDER_TEMPLATES.find((t) => t.id === "ollama")).toMatchObject({ noKey: true, baseUrl: "http://localhost:11434/v1" });
    expect(localizedName(PROVIDER_TEMPLATES.find((t) => t.id === "moonshot")!.name, "zh-CN")).toBe("月之暗面 Kimi");
    expect(localizedName(PROVIDER_TEMPLATES.find((t) => t.id === "moonshot")!.name, "en-GB")).toBe("Moonshot Kimi");
  });
});

describe("capabilitiesFor", () => {
  it("Claude Opus 5.5: no forced tool choice, no sampling, mid-conversation system, effort", () => {
    const c = capabilitiesFor("anthropic", "claude-opus-5-5");
    expect(c).toMatchObject({
      forbidsForcedToolChoice: true,
      rejectsSampling: true,
      supportsMidConversationSystem: true,
      reasoning: "anthropic-effort",
      contextWindow: 1_000_000,
      supportsImages: true,
    });
  });

  it("covers the Claude 5 family", () => {
    for (const m of ["claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]) {
      expect(capabilitiesFor("anthropic", m).forbidsForcedToolChoice).toBe(true);
      expect(capabilitiesFor("anthropic", m).rejectsSampling).toBe(true);
    }
    expect(capabilitiesFor("anthropic", "claude-fable-5-1").supportsMidConversationSystem).toBe(true);
    expect(capabilitiesFor("anthropic", "claude-sonnet-5").supportsMidConversationSystem).toBe(false);
    expect(capabilitiesFor("anthropic", "claude-haiku-4-5").reasoning).toBe("none");
    expect(capabilitiesFor("anthropic", "claude-sonnet-4-6").rejectsSampling).toBe(false);
  });

  it("OpenAI reasoning models, GLM thinking, Kimi temperature scale", () => {
    expect(capabilitiesFor("openai", "gpt-5").reasoning).toBe("openai-reasoning-effort");
    expect(capabilitiesFor("openai", "o4-mini").reasoning).toBe("openai-reasoning-effort");
    expect(capabilitiesFor("openai", "gpt-4.1").reasoning).toBe("none");
    expect(capabilitiesFor("zhipu", "glm-4.6")).toMatchObject({ reasoning: "glm-thinking", contextWindow: 200_000 });
    expect(capabilitiesFor("zhipu-anthropic", "glm-4.6").reasoning).toBe("none");
    expect(capabilitiesFor("moonshot-anthropic", "kimi-k2.6").temperatureScale).toBe(0.6);
    expect(capabilitiesFor("moonshot", "kimi-k2.6").temperatureScale).toBeUndefined();
    expect(capabilitiesFor("openrouter", "anthropic/claude-opus-5-5").reasoning).toBe("anthropic-effort");
  });

  it("unknown models get sensible defaults", () => {
    const c = capabilitiesFor("custom", "my-model");
    expect(c).toMatchObject({ contextWindow: 128_000, maxOutputTokens: 8_192, supportsTools: true, reasoning: "none", rejectsSampling: false });
  });
});

describe("resolveProviderConfig", () => {
  const env = { ANTHROPIC_API_KEY: "sk-ant-test", GROK_API_KEY: "xai-key", ZHIPUAI_API_KEY: "zp" };

  it("resolves template defaults and keys from the env list", () => {
    expect(resolveProviderConfig(settings(), "anthropic", null, env)).toEqual({
      id: "anthropic",
      wire: "anthropic-messages",
      baseUrl: "https://api.anthropic.com",
      apiKey: "sk-ant-test",
      model: "claude-opus-5-5",
    });
    expect(resolveProviderConfig(settings(), "xai", "grok-4", env)).toMatchObject({ apiKey: "xai-key", model: "grok-4" });
    expect(resolveProviderConfig(settings(), "zhipu", null, env)).toMatchObject({ apiKey: "zp", model: "glm-4.6" });
    expect(resolveProviderConfig(settings(), "openai", null, {}).apiKey).toBeUndefined();
  });

  it("uses settings.model for the active provider and applies overrides", () => {
    const s = settings({
      provider: "openrouter",
      model: "openai/gpt-5",
      providers: { openrouter: { baseUrl: "https://example.test/v1", headers: { "X-Title": "Course" }, apiKeyEnv: ["MY_KEY"], timeoutMs: 1000, maxRetries: 2 } },
    });
    const c = resolveProviderConfig(s, "openrouter", null, { MY_KEY: "k", OPENROUTER_API_KEY: "ignored" });
    expect(c).toMatchObject({ baseUrl: "https://example.test/v1", apiKey: "k", model: "openai/gpt-5", timeoutMs: 1000, maxRetries: 2 });
    expect(c.headers).toMatchObject({ "X-Title": "Course", "HTTP-Referer": expect.any(String) });
    // Another provider does not inherit the active provider's model.
    expect(resolveProviderConfig(s, "anthropic", null, env).model).toBe("claude-opus-5-5");
  });

  it("supports custom providers defined in settings and rejects unknown ones", () => {
    const s = settings({ providers: { campus: { wire: "openai-chat-completions", baseUrl: "https://llm.campus.edu/v1", defaultModel: "med-7b", apiKeyEnv: ["CAMPUS_KEY"] } } });
    expect(resolveProviderConfig(s, "campus", null, { CAMPUS_KEY: "c" })).toMatchObject({ wire: "openai-chat-completions", model: "med-7b", apiKey: "c" });
    expect(() => resolveProviderConfig(settings(), "nope", null, {})).toThrow(ProviderConfigError);
    const noWire = settings({ providers: { half: { baseUrl: "https://x.test" } } });
    expect(() => resolveProviderConfig(noWire, "half", null, {})).toThrow(/wire/);
  });

  it("handles offline, proxy and local no-key providers", () => {
    expect(resolveProviderConfig(settings(), "offline", null, {})).toEqual({ id: "offline", wire: "offline", model: "deterministic" });
    expect(resolveProviderConfig(settings(), "proxy", "glm-4.6", {})).toEqual({ id: "proxy", wire: "proxy", model: "glm-4.6", proxyUrl: "/api/llm/stream" });
    expect(resolveProviderConfig(settings(), "proxy:zhipu", null, {})).toMatchObject({ wire: "proxy", proxyProvider: "zhipu" });
    expect(resolveProviderConfig(settings(), "ollama", null, { OPENAI_API_KEY: "x" })).toEqual({
      id: "ollama",
      wire: "openai-chat-completions",
      baseUrl: "http://localhost:11434/v1",
      model: "qwen3",
    });
    expect(resolveProviderConfig(settings(), "anthropic", null, env, { browser: true }).browser).toBe(true);
  });

  it("reports configuration status without exposing keys", () => {
    expect(isProviderConfigured(settings(), "anthropic", env)).toBe(true);
    expect(isProviderConfigured(settings(), "openai", {})).toBe(false);
    expect(isProviderConfigured(settings(), "ollama", {})).toBe(true);
    expect(isProviderConfigured(settings(), "offline", {})).toBe(true);
    expect(isProviderConfigured(settings(), "nope", {})).toBe(false);
  });
});
