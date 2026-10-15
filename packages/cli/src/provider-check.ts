/**
 * Provider lookups shared by `providers …`, the session flags and `exec`:
 * known ids and whether an API key is missing. Never returns key values.
 */
import { findProviderTemplate, PROVIDER_TEMPLATES } from "@clinicalcraft/agent";
import type { ResolvedSettings } from "@clinicalcraft/agent";
import { resolveNodeProviderConfig, type Env } from "@clinicalcraft/agent/node";

type ProviderSettings = Pick<ResolvedSettings, "provider" | "model" | "providers">;

/** Provider ids known from the catalogue and settings. */
export function providerIds(settings: Pick<ResolvedSettings, "providers">): string[] {
  return [...new Set([...PROVIDER_TEMPLATES.map((p) => p.id), ...Object.keys(settings.providers)])];
}

/** Whether `id` names a provider (`proxy:<upstream>` included). */
export function isKnownProvider(settings: Pick<ResolvedSettings, "providers">, id: string): boolean {
  return providerIds(settings).includes(id) || id.startsWith("proxy:");
}

/**
 * The env vars a key is expected in when `providerId` needs one and none is
 * configured (env or user/local settings); null when a key is present or not
 * needed (offline, proxy, local servers, custom providers without `apiKeyEnv`).
 */
export function missingKeyEnv(settings: ProviderSettings, providerId: string, env: Env): string[] | null {
  let config;
  try {
    config = resolveNodeProviderConfig(settings, providerId, null, env);
  } catch {
    return null; // unknown/misconfigured providers are reported elsewhere
  }
  if (config.wire === "offline" || config.wire === "proxy" || config.apiKey) return null;
  const template = findProviderTemplate(config.id);
  if (template?.noKey) return null;
  const keyEnv = settings.providers[config.id]?.apiKeyEnv ?? template?.apiKeyEnv ?? [];
  return keyEnv.length > 0 ? keyEnv : null;
}
