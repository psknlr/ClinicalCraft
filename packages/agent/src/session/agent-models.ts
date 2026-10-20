/**
 * The model each agent of a session calls: resolved from its profile and the settings (`resolveAgentModel`),
 * cached until a `configure` changes the settings, with a one-time warning when an agent falls back to its
 * offline responder; the retry policy and request options of its calls; whether it can look at images; the
 * token usage per agent and in total (`token_usage` events). Resolved credentials are remembered so the
 * transcript masks them.
 */
import type { RetryPolicy } from "../providers/factory.js";
import type { AgentRole, TokenUsage } from "../protocol.js";
import type { ProviderConfig } from "../providers/types.js";
import { addUsage, emptyUsage } from "../loop.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { resolveAgentModel, type AgentModel } from "./models.js";

/** `{retry}` for a request when a policy is set (spread into the call's options). */
export function retryOption(policy: RetryPolicy | false | undefined): { retry?: RetryPolicy | false } {
  return policy !== undefined ? { retry: policy } : {};
}

/** The resolved models of one session's agents. */
export class AgentModels {
  private readonly models = new Map<string, AgentModel>();
  private readonly warnedOffline = new Set<string>();
  private readonly usage = new Map<string, TokenUsage>();
  private readonly totalUsage = emptyUsage();
  /** Retry policy for model calls (`false` disables; tests inject fast sleeps). */
  private readonly retry: RetryPolicy | false | undefined;

  constructor(private readonly k: SessionKernel) {
    this.retry = k.opts.retry;
  }

  /** An agent's model (resolved once); warns once, in the current submission, when it has none and why. */
  model(agent: string, warn = true): AgentModel {
    const k = this.k;
    let m = this.models.get(agent);
    if (!m) {
      const profile = k.profiles.get(agent) ?? k.profiles.get("patient")!;
      m = resolveAgentModel(profile, k.settings, {
        ...(k.opts.resolveProvider ? { resolveProvider: k.opts.resolveProvider } : {}),
        ...(k.opts.providerFactory ? { providerFactory: k.opts.providerFactory } : {}),
      });
      this.models.set(agent, m);
      this.rememberSecrets(m.config);
    }
    if (warn && !m.provider && m.offlineReason && !this.warnedOffline.has(agent)) {
      this.warnedOffline.add(agent);
      const reason = rt(k.locale, m.offlineReason.key, m.offlineReason.params);
      k.emit(k.currentSubmission, { type: "warning", message: rt(k.locale, "warning.offline", { agent, reason }) });
    }
    return m;
  }

  /** Forget the resolved models and offline warnings (the settings changed). */
  reset(): void {
    this.models.clear();
    this.warnedOffline.clear();
  }

  /** Can this agent's model look at images (capability `vision`)? */
  visionFor(agent: AgentRole): boolean {
    const m = this.model(String(agent), false);
    try {
      return !!m.provider && m.provider.capabilities().vision === true;
    } catch {
      return false;
    }
  }

  /**
   * The retry policy for an agent's model calls: the session's policy, with
   * `providers.<id>.maxRetries` (resolved into the provider config) taking
   * precedence over its `maxRetries`. `false` (no retries) stays false.
   */
  retryFor(m: AgentModel): RetryPolicy | false | undefined {
    if (this.retry === false) return false;
    const max = m.config?.maxRetries;
    if (max === undefined || max === null) return this.retry;
    return { ...(this.retry ?? {}), maxRetries: max };
  }

  /** Model request options of an agent's calls (model, max tokens, temperature, effort). */
  requestOptions(m: AgentModel) {
    return {
      ...(m.model ? { model: m.model } : {}),
      ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
      ...(m.temperature !== undefined ? { temperature: m.temperature } : {}),
      ...(m.effort ? { effort: m.effort } : {}),
    };
  }

  /** Add a model call's usage to the agent's and the session's totals (`token_usage`). */
  trackUsage(id: string, agent: AgentRole, usage: TokenUsage): void {
    const mine = this.usage.get(agent) ?? emptyUsage();
    addUsage(mine, usage);
    this.usage.set(agent, mine);
    addUsage(this.totalUsage, usage);
    this.k.emit(id, { type: "token_usage", agent, usage: { ...usage }, total: { ...this.totalUsage } });
  }

  /** Remember credentials of a resolved provider config so transcripts mask them. */
  private rememberSecrets(config: ProviderConfig | null): void {
    if (!config) return;
    const secrets = this.k.secrets;
    if (config.apiKey) secrets.add(config.apiKey);
    for (const [name, value] of Object.entries(config.headers ?? {})) if (/auth|key|token|secret/i.test(name) && value) secrets.add(value.replace(/^Bearer\s+/i, ""));
  }
}
