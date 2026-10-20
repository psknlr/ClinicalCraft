/**
 * Per-agent model resolution: `settings.agents[name]` > profile
 * `provider`/`model` (unless "inherit") > `settings.provider`/`model`.
 * A missing key, an unknown provider or `offline` resolves to the
 * deterministic offline responder (the caller warns once per agent).
 */
import type { AgentProfile } from "../agents/types.js";
import { findProviderTemplate, resolveProviderConfig } from "../providers/catalog.js";
import { createProvider } from "../providers/factory.js";
import type { ChatRequest, LLMProvider, ProviderConfig } from "../providers/types.js";
import type { ResolvedSettings } from "../settings/schema.js";

export interface AgentModel {
  agent: string;
  providerId: string;
  model: string | null;
  /** null → offline responder. */
  provider: LLMProvider | null;
  config: ProviderConfig | null;
  /** Why the agent is offline (null when online or explicitly offline). */
  offlineReason: { key: "reason.noKey" | "reason.offline" | "reason.unknownProvider"; params: Record<string, string> } | null;
  effort?: ChatRequest["effort"];
  temperature?: number;
  maxTokens?: number;
  maxToolRounds: number;
}

export interface ModelResolverOptions {
  resolveProvider?: (providerId: string, model: string | null) => ProviderConfig;
  providerFactory?: (agent: AgentProfile, config: ProviderConfig) => LLMProvider;
}

function needsKey(config: ProviderConfig): boolean {
  if (config.wire === "offline" || config.wire === "proxy") return false;
  return findProviderTemplate(config.id)?.noKey !== true;
}

/** Resolve the provider/model and request options for an agent. Never throws. */
export function resolveAgentModel(profile: AgentProfile, settings: ResolvedSettings, options: ModelResolverOptions = {}): AgentModel {
  const own = settings.agents[profile.name] ?? {};
  const providerId = own.provider ?? (profile.provider !== "inherit" ? profile.provider : settings.provider);
  const model = own.model ?? (profile.model !== "inherit" ? profile.model : providerId === settings.provider ? settings.model : null);
  const effort = own.effort ?? profile.effort ?? settings.effort ?? undefined;
  const temperature = own.temperature ?? profile.temperature;
  const maxToolRounds = own.maxToolRounds ?? (settings.sources.maxToolRounds && settings.sources.maxToolRounds !== "default" ? settings.maxToolRounds : profile.maxToolRounds);
  const base: AgentModel = {
    agent: profile.name,
    providerId,
    model: model ?? null,
    provider: null,
    config: null,
    offlineReason: null,
    ...(effort ? { effort } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
    ...(own.maxTokens !== undefined ? { maxTokens: own.maxTokens } : {}),
    maxToolRounds,
  };
  if (providerId === "offline") return { ...base, offlineReason: null };
  let config: ProviderConfig;
  try {
    config = options.resolveProvider ? options.resolveProvider(providerId, model ?? null) : resolveProviderConfig(settings, providerId, model ?? null, {});
  } catch (err) {
    return { ...base, offlineReason: { key: "reason.unknownProvider", params: { message: err instanceof Error ? err.message : String(err) } } };
  }
  if (config.wire === "offline") return { ...base, config, offlineReason: { key: "reason.offline", params: {} } };
  if (needsKey(config) && !config.apiKey) return { ...base, config, offlineReason: { key: "reason.noKey", params: { provider: config.id } } };
  try {
    const provider = options.providerFactory ? options.providerFactory(profile, config) : createProvider(config);
    return { ...base, model: config.model || base.model, provider, config };
  } catch (err) {
    return { ...base, config, offlineReason: { key: "reason.unknownProvider", params: { message: err instanceof Error ? err.message : String(err) } } };
  }
}
