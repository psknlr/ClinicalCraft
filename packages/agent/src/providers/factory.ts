/**
 * Provider factory and retry wrapper.
 *
 * `withRetry` implements the agent-loop retry policy (docs/PROTOCOL.md §4.6):
 * exponential backoff 2 s × 2 capped at 60 s with jitter, up to 4 retries,
 * only for retryable errors that arrive BEFORE any content was streamed (a
 * partially streamed answer is never silently replayed). A server
 * `retry-after` hint lengthens the wait (within the cap). Sleeps are abortable.
 */
import { AnthropicProvider } from "./anthropic.js";
import { abortedError, isAbortInfo, retryAfterMsOf } from "./errors.js";
import { OfflineProvider } from "./offline.js";
import { OpenAICompatibleProvider } from "./openai.js";
import { ProxyProvider } from "./proxy.js";
import type { ChatRequest, LLMProvider, ModelCapabilities, ProviderConfig, ProviderErrorInfo, StreamEvent } from "./types.js";

export interface CreateProviderOptions {
  /** Injectable fetch for fetch-based wires (openai, proxy). */
  fetch?: typeof fetch;
}

/** Create a bare provider for a resolved config (no retries; wrap with `withRetry`). */
export function createProvider(config: ProviderConfig, options: CreateProviderOptions = {}): LLMProvider {
  switch (config.wire) {
    case "anthropic-messages":
      return new AnthropicProvider(config);
    case "openai-chat-completions":
      return new OpenAICompatibleProvider(config, options.fetch ? { fetch: options.fetch } : {});
    case "proxy":
      return new ProxyProvider(config, options.fetch ? { fetch: options.fetch } : {});
    case "offline":
      return new OfflineProvider(config);
    default: {
      const wire: never = config.wire;
      throw new Error(`Unsupported wire protocol: ${String(wire)}`);
    }
  }
}

export interface RetryPolicy {
  /** Maximum retries after the first attempt (default 4). */
  maxRetries?: number;
  /** First delay in ms (default 2000). */
  baseDelayMs?: number;
  /** Backoff multiplier (default 2). */
  factor?: number;
  /** Delay cap in ms (default 60000). */
  maxDelayMs?: number;
  /** Jitter: `true` (±20 %, default), `false`, or a fraction in [0, 1]. */
  jitter?: boolean | number;
  /** Called before each sleep; `attempt` is 1-based. */
  onRetry?: (attempt: number, delayMs: number, error: ProviderErrorInfo) => void;
  /** Injectable randomness (tests). */
  random?: () => number;
  /** Injectable sleep (tests). Must reject or resolve promptly on abort. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/** Compute the backoff delay before retry `attempt` (1-based). */
export function retryDelay(attempt: number, policy: RetryPolicy = {}): number {
  const base = policy.baseDelayMs ?? 2000;
  const factor = policy.factor ?? 2;
  const cap = policy.maxDelayMs ?? 60_000;
  let delay = Math.min(cap, base * factor ** Math.max(0, attempt - 1));
  const jitter = policy.jitter === undefined || policy.jitter === true ? 0.2 : policy.jitter === false ? 0 : Math.min(1, Math.max(0, policy.jitter));
  if (jitter > 0) {
    const r = (policy.random ?? Math.random)();
    delay = delay * (1 - jitter + 2 * jitter * r);
  }
  return Math.max(0, Math.round(Math.min(cap, delay)));
}

/** Sleep that resolves early (with `false`) when `signal` aborts. */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false);
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(true);
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

class RetryingProvider implements LLMProvider {
  readonly id: string;
  readonly wire: LLMProvider["wire"];
  readonly model: string;

  constructor(
    private readonly inner: LLMProvider,
    private readonly policy: RetryPolicy,
  ) {
    this.id = inner.id;
    this.wire = inner.wire;
    this.model = inner.model;
  }

  capabilities(): ModelCapabilities {
    return this.inner.capabilities();
  }

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    const maxRetries = this.policy.maxRetries ?? 4;
    for (let attempt = 0; ; attempt++) {
      let streamed = false;
      let heldStart: StreamEvent | null = null;
      let retryError: ProviderErrorInfo | null = null;
      for await (const event of this.inner.stream(request, signal)) {
        if (!streamed) {
          if (event.type === "start") {
            heldStart = event; // only released once the attempt is known to be good
            continue;
          }
          if (event.type === "error" && event.error.retryable && !isAbortInfo(event.error) && attempt < maxRetries && !signal?.aborted) {
            retryError = event.error;
            break;
          }
          streamed = true;
          if (heldStart) yield heldStart;
        }
        yield event;
      }
      if (!retryError) {
        if (!streamed && heldStart) yield heldStart;
        return;
      }
      // A server hint (retry-after) is honoured when longer than the backoff, within the cap.
      const hint = retryAfterMsOf(retryError);
      const backoff = retryDelay(attempt + 1, this.policy);
      const delay = hint === undefined ? backoff : Math.min(Math.max(backoff, hint), this.policy.maxDelayMs ?? 60_000);
      this.policy.onRetry?.(attempt + 1, delay, retryError);
      const completed = this.policy.sleep
        ? await this.policy.sleep(delay, signal).then(
            () => !signal?.aborted,
            () => false,
          )
        : await abortableSleep(delay, signal);
      if (!completed || signal?.aborted) {
        yield { type: "error", error: abortedError() };
        return;
      }
    }
  }
}

/** Wrap a provider with the retry policy. Retries only pre-content retryable errors. */
export function withRetry(provider: LLMProvider, policy: RetryPolicy = {}): LLMProvider {
  return new RetryingProvider(provider, policy);
}
