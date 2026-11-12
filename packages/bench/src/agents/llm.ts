/**
 * The `llm` agent — a real provider and model from the user's settings
 * drives the clinician (model competence; docs/EMBODIED.md R11). Opt-in
 * only: it refuses to be built without `live: true`, with an offline or
 * proxy provider, or without a configured API key (it never falls back to
 * the offline responders). NPCs (patient, nurse…) stay deterministic
 * offline responders, so runs differ only by the model under test. The
 * spending cap is enforced by the runner from the session's `token_usage`
 * events (`Budget`).
 */
import { createProvider, findProviderTemplate, type AgentProfile, type LLMProvider, type ProviderConfig, type ResolvedSettings } from "@clinicalcraft/agent";
import { resolveNodeProviderConfig, type Env } from "@clinicalcraft/agent/node";
import type { BenchScenario } from "../schema.js";
import type { AgentWiring } from "../session.js";
import { driveModel } from "./model.js";
import { tapProvider, type BenchAgent, type BenchAgentContext, type ProviderTap } from "./types.js";

/** A configuration problem of a live run (the CLI maps `code` to a localised message). */
export class LiveRunError extends Error {
  constructor(
    readonly code: "live-required" | "offline-provider" | "no-key" | "ci",
    readonly params: Record<string, string> = {},
  ) {
    super(`${code}${Object.keys(params).length ? `: ${JSON.stringify(params)}` : ""}`);
    this.name = "LiveRunError";
  }
}

export interface LlmAgentOptions {
  /** Must be true: a live run calls a real model and spends money. */
  live: boolean;
  /** Settings the provider configuration (base URL, key, model) comes from. */
  settings: Pick<ResolvedSettings, "provider" | "model" | "providers">;
  env: Env;
  /** Provider and model (default: the settings'). */
  provider?: string;
  model?: string | null;
  /** Refuse in CI (default: when `env.CI` is set). */
  refuseInCi?: boolean;
  /** Tests: build the provider (default: `createProvider`). */
  providerFactory?: (agent: AgentProfile, config: ProviderConfig) => LLMProvider;
}

/** The env variables a key is expected in when none is configured (null: present or not needed). */
export function missingKey(config: ProviderConfig, settings: LlmAgentOptions["settings"]): string[] | null {
  if (config.wire === "offline" || config.wire === "proxy" || config.apiKey) return null;
  const template = findProviderTemplate(config.id);
  if (template?.noKey) return null;
  const env = settings.providers[config.id]?.apiKeyEnv ?? template?.apiKeyEnv ?? [];
  return env.length ? env : [`${config.id.toUpperCase()}_API_KEY`];
}

/** The live agent: a bench agent, plus its session wiring for any task with a tool-call limit (the operative track). */
export interface LlmAgent extends BenchAgent {
  wiringFor(maxToolCalls: number, tap: ProviderTap): AgentWiring;
}

/** Build the live agent (throws `LiveRunError` when it must not run). */
export function createLlmAgent(o: LlmAgentOptions): LlmAgent {
  if (!o.live) throw new LiveRunError("live-required");
  if ((o.refuseInCi ?? true) && o.env.CI && o.env.CI !== "false" && o.env.CI !== "0") throw new LiveRunError("ci");
  const providerId = o.provider ?? o.settings.provider;
  if (providerId === "offline" || providerId === "proxy" || providerId.startsWith("proxy:")) throw new LiveRunError("offline-provider", { provider: providerId });
  const config = resolveNodeProviderConfig(o.settings, providerId, o.model ?? null, o.env);
  if (config.wire === "offline") throw new LiveRunError("offline-provider", { provider: providerId });
  const missing = missingKey(config, o.settings);
  if (missing) throw new LiveRunError("no-key", { provider: providerId, env: missing.join(" / ") });
  const model = config.model;
  const wiringFor = (maxToolCalls: number, tap: ProviderTap): AgentWiring => ({
    clinician: { provider: providerId, model, maxToolRounds: Math.min(100, maxToolCalls) },
    resolveProvider: (id: string, m: string | null) => resolveNodeProviderConfig(o.settings, id, m, o.env),
    providerFactory: (agent: AgentProfile, cfg: ProviderConfig) => tapProvider(o.providerFactory ? o.providerFactory(agent, cfg) : createProvider(cfg), tap),
  });
  return {
    kind: "llm",
    provider: providerId,
    model,
    wiring: (scenario: BenchScenario, tap: ProviderTap): AgentWiring => wiringFor(scenario.limits.maxToolCalls, tap),
    wiringFor,
    run: (ctx: BenchAgentContext) => driveModel(ctx),
  };
}
