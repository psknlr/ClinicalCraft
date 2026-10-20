/**
 * ProxyProvider — browser → `clinicalcraft serve` (`POST /api/llm/stream`).
 * Keys stay server-side. Request body: `{provider, model, request}`; the
 * response is `text/event-stream` whose `data:` lines are `StreamEvent` JSON,
 * terminated by `event: done`.
 */
import { capabilitiesFor, DEFAULT_PROXY_URL } from "./catalog.js";
import { abortedError, classifyHttpError, networkError } from "./errors.js";
import { parseSSE } from "./sse.js";
import type { ChatRequest, LLMProvider, ModelCapabilities, ProviderConfig, StreamEvent } from "./types.js";

const EVENT_TYPES = new Set(["start", "text_delta", "reasoning_delta", "tool_call_start", "tool_call_delta", "tool_call", "finish", "error"]);

/** Body sent to the proxy endpoint. */
export interface ProxyRequestBody {
  provider?: string;
  model: string;
  request: ChatRequest;
}

export interface ProxyProviderOptions {
  fetch?: typeof fetch;
  capabilities?: ModelCapabilities;
}

/** LLMProvider for wire `proxy`. */
export class ProxyProvider implements LLMProvider {
  readonly id: string;
  readonly wire = "proxy" as const;
  readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly caps?: ModelCapabilities;

  constructor(
    private readonly config: ProviderConfig,
    options: ProxyProviderOptions = {},
  ) {
    this.id = config.id;
    this.model = config.model;
    this.fetchImpl = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
    if (options.capabilities) this.caps = options.capabilities;
  }

  capabilities(): ModelCapabilities {
    return this.caps ?? capabilitiesFor(this.config.proxyProvider ?? this.id, this.model);
  }

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    if (signal?.aborted) {
      yield { type: "error", error: abortedError() };
      return;
    }
    const model = request.model || this.model;
    const body: ProxyRequestBody = { model, request: { ...request, model } };
    if (this.config.proxyProvider) body.provider = this.config.proxyProvider;
    const headers: Record<string, string> = { "content-type": "application/json", accept: "text/event-stream", ...(this.config.headers ?? {}) };
    if (this.config.apiKey) headers.authorization = `Bearer ${this.config.apiKey}`;

    let response: Response;
    try {
      response = await this.fetchImpl(this.config.proxyUrl ?? DEFAULT_PROXY_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        ...(signal ? { signal } : {}),
      });
    } catch (err) {
      yield { type: "error", error: networkError(err, signal) };
      return;
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      yield { type: "error", error: classifyHttpError(response.status, text, response.headers) };
      return;
    }
    if (!response.body) {
      yield { type: "error", error: { message: "Proxy returned an empty body", kind: "network", retryable: true } };
      return;
    }

    let terminal = false;
    try {
      for await (const message of parseSSE(response.body, { signal, stopOnDone: true })) {
        if (message.event === "done" || message.data === "[DONE]") break;
        let event: unknown;
        try {
          event = JSON.parse(message.data);
        } catch {
          continue;
        }
        if (!event || typeof event !== "object" || !EVENT_TYPES.has(String((event as { type?: unknown }).type))) continue;
        const e = event as StreamEvent;
        if (e.type === "finish" || e.type === "error") terminal = true;
        yield e;
        if (e.type === "error") return;
      }
    } catch (err) {
      yield { type: "error", error: networkError(err, signal) };
      return;
    }
    if (signal?.aborted) {
      yield { type: "error", error: abortedError() };
      return;
    }
    if (!terminal) yield { type: "error", error: { message: "Proxy stream ended before the model finished", kind: "network", retryable: true } };
  }
}
