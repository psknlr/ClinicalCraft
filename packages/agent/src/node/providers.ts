/**
 * Node provider resolution: reads API keys from `process.env` (or a supplied env).
 */
import { resolveProviderConfig } from "../providers/catalog.js";
import type { ProviderConfig } from "../providers/types.js";
import type { ResolvedSettings } from "../settings/schema.js";
import type { Env } from "./home.js";

/**
 * Resolve the config for `providerId` (default: `settings.provider`) and
 * `model` (default: `settings.model` when the provider is the active one).
 * Throws `ProviderConfigError` for unknown providers.
 */
export function resolveNodeProviderConfig(
  settings: Pick<ResolvedSettings, "provider" | "model" | "providers">,
  providerId?: string | null,
  model?: string | null,
  env: Env = process.env,
): ProviderConfig {
  return resolveProviderConfig(settings, providerId || settings.provider, model ?? null, env);
}
