/**
 * AnthropicProvider — Claude (and Anthropic-compatible endpoints) through the
 * official `@anthropic-ai/sdk`, streaming Messages API.
 *
 * Request rules (docs/PROTOCOL.md §5):
 *   - `system` = text blocks, `cache_control: {type:"ephemeral"}` on the last
 *     stable section (prompt-caching friendly prefix);
 *   - tools carry `eager_input_streaming: true`; inputs are re-validated as
 *     objects before they are emitted as `tool_call`;
 *   - never a forced `tool_choice`, never a `thinking` param (adaptive is the
 *     default on current models); depth via `output_config.effort`;
 *   - `responseFormat` → `output_config.format` (json_schema) on first-party
 *     Claude, else a JSON instruction appended to the system prompt;
 *   - sampling params only when the model accepts them;
 *   - server-side refusal fallbacks (`fallbacks: "default"` + beta
 *     `server-side-fallback-2026-07-01`) for the models that support them on
 *     the first-party API only;
 *   - history is append-only: assistant turns are echoed verbatim from
 *     `provider_raw` (minus pre-fallback-boundary model-internal blocks).
 */
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaMessageStreamParams,
  BetaOutputConfig,
  BetaTextBlockParam,
  BetaTool,
  BetaToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { ANTHROPIC_BASE_URL, capabilitiesFor } from "./catalog.js";
import { abortedError, classifyHttpError, networkError } from "./errors.js";
import { anthropicSupportsStructuredOutput, withJsonInstruction } from "./structured.js";
import type { ChatMessage, ChatRequest, LLMProvider, ModelCapabilities, ProviderConfig, ProviderErrorInfo, StreamEvent } from "./types.js";

/** Beta header that gates `fallbacks: "default"`. */
export const SERVER_SIDE_FALLBACK_BETA = "server-side-fallback-2026-07-01";
/** Models that accept server-side refusal fallbacks (`"default"` form) on the Claude API. */
export const FALLBACK_MODELS_RE = /^claude-(opus-5-5|opus-5|fable-5-1|sonnet-5-5)$/;
/** Default `max_tokens` when the caller does not pass one. */
export const ANTHROPIC_DEFAULT_MAX_TOKENS = 16_000;
/** Upper bound for `max_tokens` on a streaming request. */
export const ANTHROPIC_MAX_TOKENS_CAP = 64_000;

/** True when `baseUrl` is unset or the first-party Claude API. */
export function isFirstPartyAnthropic(baseUrl: string | undefined | null): boolean {
  if (!baseUrl) return true;
  const normalised = baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/, "");
  return normalised === ANTHROPIC_BASE_URL;
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** Block types that are model-internal and must not be echoed from before a fallback boundary. */
const PRE_BOUNDARY_KEEP = new Set(["text", "fallback"]);

/**
 * Prepare a provider-native assistant `content` array for echoing back:
 * after a mid-output fallback, drop every non-text block that precedes the
 * last `fallback` block (thinking, redacted_thinking, tool_use, unpaired
 * server tool blocks…). Everything after the boundary is kept verbatim.
 */
export function sanitizeEchoBlocks(blocks: readonly unknown[]): BetaContentBlockParam[] {
  let boundary = -1;
  blocks.forEach((b, i) => {
    if (isRecord(b) && b.type === "fallback") boundary = i;
  });
  const out: BetaContentBlockParam[] = [];
  blocks.forEach((b, i) => {
    if (!isRecord(b) || typeof b.type !== "string") return;
    if (i < boundary && !PRE_BOUNDARY_KEEP.has(b.type)) return;
    out.push(b as unknown as BetaContentBlockParam);
  });
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return isRecord(v) && Object.getPrototypeOf(v) === Object.prototype;
}

function assistantBlocks(message: ChatMessage): BetaContentBlockParam[] {
  const raw = message.content.find((p) => p.type === "provider_raw" && p.provider === "anthropic-messages");
  if (raw && raw.type === "provider_raw" && Array.isArray(raw.data)) {
    return sanitizeEchoBlocks(raw.data);
  }
  const blocks: BetaContentBlockParam[] = [];
  for (const part of message.content) {
    if (part.type === "text") {
      if (part.text.trim()) blocks.push({ type: "text", text: part.text });
    } else if (part.type === "tool_call") {
      blocks.push({ type: "tool_use", id: part.id, name: part.name, input: isPlainObject(part.args) ? part.args : {} });
    }
  }
  return blocks;
}

function userBlocks(message: ChatMessage): { results: BetaToolResultBlockParam[]; other: BetaContentBlockParam[] } {
  const results: BetaToolResultBlockParam[] = [];
  const other: BetaContentBlockParam[] = [];
  for (const part of message.content) {
    switch (part.type) {
      case "tool_result":
        results.push({
          type: "tool_result",
          tool_use_id: part.callId,
          content: part.content === "" ? "(no output)" : part.content,
          ...(part.isError ? { is_error: true } : {}),
        });
        break;
      case "text":
        if (part.text.trim()) other.push({ type: "text", text: part.text });
        break;
      case "image":
        other.push({ type: "image", source: { type: "base64", media_type: part.mediaType as ImageMediaType, data: part.data } });
        break;
      default:
        break;
    }
  }
  return { results, other };
}

/**
 * Convert provider-neutral history to Messages API params. Consecutive user
 * messages are merged so that every tool_result of a turn travels in ONE user
 * message (tool_results first, as the API requires). Empty messages are
 * dropped; a leading assistant message gets a minimal user turn before it.
 */
export function toAnthropicMessages(messages: readonly ChatMessage[]): BetaMessageParam[] {
  const out: BetaMessageParam[] = [];
  for (const message of messages) {
    if (message.role === "assistant") {
      const blocks = assistantBlocks(message);
      if (blocks.length === 0) continue;
      const prev = out[out.length - 1];
      if (prev && prev.role === "assistant" && Array.isArray(prev.content)) {
        prev.content.push(...blocks);
      } else {
        out.push({ role: "assistant", content: blocks });
      }
      continue;
    }
    const { results, other } = userBlocks(message);
    if (results.length === 0 && other.length === 0) continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === "user" && Array.isArray(prev.content)) {
      const prevResults = prev.content.filter((b) => b.type === "tool_result");
      const prevOther = prev.content.filter((b) => b.type !== "tool_result");
      prev.content = [...prevResults, ...results, ...prevOther, ...other];
    } else {
      out.push({ role: "user", content: [...results, ...other] });
    }
  }
  if (out[0]?.role === "assistant") out.unshift({ role: "user", content: [{ type: "text", text: "(conversation start)" }] });
  return out;
}

/** System sections → text blocks; cache breakpoint on the last stable section. */
export function toAnthropicSystem(system: ChatRequest["system"]): BetaTextBlockParam[] {
  const sections = system.filter((s) => s.text.trim().length > 0);
  let lastStable = -1;
  sections.forEach((s, i) => {
    if (s.cache === "stable") lastStable = i;
  });
  return sections.map((s, i) => (i === lastStable ? { type: "text", text: s.text, cache_control: { type: "ephemeral" } } : { type: "text", text: s.text }));
}

/** Build the exact `client.beta.messages.stream()` params for a request (pure; unit-tested). */
export function buildAnthropicRequest(config: Pick<ProviderConfig, "id" | "baseUrl" | "model">, request: ChatRequest, caps?: ModelCapabilities): BetaMessageStreamParams {
  const model = request.model || config.model;
  const capabilities = caps ?? capabilitiesFor(config.id, model);
  const firstParty = isFirstPartyAnthropic(config.baseUrl);
  const maxTokens = Math.max(1, Math.min(request.maxTokens ?? ANTHROPIC_DEFAULT_MAX_TOKENS, capabilities.maxOutputTokens, ANTHROPIC_MAX_TOKENS_CAP));

  const params: BetaMessageStreamParams = {
    model,
    max_tokens: maxTokens,
    messages: toAnthropicMessages(request.messages),
  };
  const outputConfig: BetaOutputConfig = {};
  let systemSections = request.system;
  if (request.responseFormat) {
    if (anthropicSupportsStructuredOutput(model, firstParty)) outputConfig.format = { type: "json_schema", schema: request.responseFormat.schema };
    else systemSections = withJsonInstruction(request.system, request.responseFormat);
  }
  const system = toAnthropicSystem(systemSections);
  if (system.length > 0) params.system = system;
  if (request.tools && request.tools.length > 0) {
    params.tools = request.tools.map(
      (t): BetaTool => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as unknown as BetaTool.InputSchema,
        eager_input_streaming: true,
      }),
    );
  }
  if (request.temperature != null && !capabilities.rejectsSampling) {
    params.temperature = Math.min(1, Math.max(0, request.temperature * (capabilities.temperatureScale ?? 1)));
  }
  if (request.effort && capabilities.reasoning === "anthropic-effort") outputConfig.effort = request.effort;
  if (Object.keys(outputConfig).length > 0) params.output_config = outputConfig;
  if (firstParty) {
    // Automatic caching of the conversation prefix (second breakpoint after the system one).
    params.cache_control = { type: "ephemeral" };
    if (FALLBACK_MODELS_RE.test(model)) {
      params.betas = [SERVER_SIDE_FALLBACK_BETA];
      params.fallbacks = "default";
    }
  }
  return params;
}

/** Map an SDK error (typed classes) to `ProviderErrorInfo`. */
export function mapAnthropicError(err: unknown, signal?: AbortSignal): ProviderErrorInfo {
  if (signal?.aborted || err instanceof Anthropic.APIUserAbortError) return abortedError();
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { message: "Request to Claude API timed out", kind: "timeout", retryable: true };
  if (err instanceof Anthropic.APIConnectionError) return networkError(err.cause ?? err);
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === "number" ? err.status : undefined;
    const type = typeof err.type === "string" ? err.type : errorTypeOf(err.error);
    const message = cleanMessage(err) || `Claude API error${status ? ` ${status}` : ""}`;
    const base = (kind: ProviderErrorInfo["kind"], retryable: boolean): ProviderErrorInfo => ({
      message,
      kind,
      retryable,
      ...(status ? { status } : {}),
      ...(type ? { code: type } : {}),
    });
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return base("auth", false);
    if (err instanceof Anthropic.NotFoundError) return base("bad_request", false);
    if (err instanceof Anthropic.RateLimitError) return base("rate_limit", true);
    if (err instanceof Anthropic.BadRequestError) {
      if (type === "billing_error" || /credit balance|billing/i.test(message)) return base("quota", false);
      const classified = classifyHttpError(400, JSON.stringify({ error: { type, message } }));
      return base(classified.kind === "context_exceeded" ? "context_exceeded" : "bad_request", false);
    }
    if (status === 529 || type === "overloaded_error") return base("overloaded", true);
    if (err instanceof Anthropic.InternalServerError) return base("overloaded", true);
    if (status === undefined) {
      // Error event received mid-stream (`event: error`).
      if (type === "overloaded_error" || type === "api_error") return base("overloaded", true);
      if (type === "rate_limit_error") return base("rate_limit", true);
      if (type === "invalid_request_error") return base("bad_request", false);
      return base("unknown", false);
    }
    const classified = classifyHttpError(status, JSON.stringify(err.error ?? { error: { type, message } }));
    return { ...classified, message };
  }
  if (err instanceof SyntaxError || (err instanceof Anthropic.AnthropicError && /parse tool parameter JSON|JSON/i.test(err.message))) {
    // A tool input that could not be parsed at all (eager input streaming): re-issuing the turn may succeed.
    return { message: `Invalid tool input JSON from model: ${err.message.slice(0, 300)}`, kind: "bad_request", code: "invalid_tool_json", retryable: true };
  }
  if (err instanceof Anthropic.AnthropicError) {
    // Client-side configuration problems (no credentials, browser without opt-in…).
    if (/authenticat|api ?key|authToken|credential/i.test(err.message)) return { message: err.message, kind: "auth", retryable: false };
    return { message: err.message, kind: "bad_request", retryable: false };
  }
  if (err instanceof Error) return { message: err.message, kind: "unknown", retryable: false };
  return { message: String(err), kind: "unknown", retryable: false };
}

function errorTypeOf(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  const inner = isRecord(body.error) ? body.error : body;
  return typeof inner.type === "string" && inner.type !== "error" ? inner.type : undefined;
}

function cleanMessage(err: InstanceType<typeof Anthropic.APIError>): string {
  const body = err.error;
  if (isRecord(body)) {
    const inner = isRecord(body.error) ? body.error : body;
    if (typeof inner.message === "string") return inner.message;
  }
  return err.message;
}

type FinishReason = Extract<StreamEvent, { type: "finish" }>["stopReason"];

function mapStopReason(reason: string | null | undefined): FinishReason {
  switch (reason) {
    case "end_turn":
    case "stop_sequence":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "max_tokens":
    case "model_context_window_exceeded":
      return "max_tokens";
    case "pause_turn":
      return "pause_turn";
    case "refusal":
      return "refusal";
    default:
      return "other";
  }
}

export interface AnthropicProviderOptions {
  /** Inject a pre-built client (tests). */
  client?: Anthropic;
  /** Override capabilities (tests / custom models). */
  capabilities?: ModelCapabilities;
}

/** LLMProvider for wire `anthropic-messages`. */
export class AnthropicProvider implements LLMProvider {
  readonly id: string;
  readonly wire = "anthropic-messages" as const;
  readonly model: string;
  private client: Anthropic | null;
  private readonly caps?: ModelCapabilities;

  constructor(
    private readonly config: ProviderConfig,
    options: AnthropicProviderOptions = {},
  ) {
    this.id = config.id;
    this.model = config.model;
    this.client = options.client ?? null;
    if (options.capabilities) this.caps = options.capabilities;
  }

  capabilities(): ModelCapabilities {
    return this.caps ?? capabilitiesFor(this.id, this.model);
  }

  private getClient(): Anthropic {
    if (!this.client) {
      const headers = this.config.headers;
      this.client = new Anthropic({
        apiKey: this.config.apiKey ?? null,
        baseURL: this.config.baseUrl ?? ANTHROPIC_BASE_URL,
        ...(headers && Object.keys(headers).length > 0 ? { defaultHeaders: headers } : {}),
        maxRetries: 0, // retries are owned by withRetry()
        timeout: this.config.timeoutMs ?? 10 * 60 * 1000,
        dangerouslyAllowBrowser: this.config.browser === true,
      });
    }
    return this.client;
  }

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    if (signal?.aborted) {
      yield { type: "error", error: abortedError() };
      return;
    }
    const model = request.model || this.model;
    const caps = this.caps ?? capabilitiesFor(this.id, model);
    let stream: ReturnType<Anthropic["beta"]["messages"]["stream"]>;
    try {
      const params = buildAnthropicRequest(this.config, { ...request, model }, caps);
      stream = this.getClient().beta.messages.stream(params, signal ? { signal } : undefined);
    } catch (err) {
      yield { type: "error", error: mapAnthropicError(err, signal) };
      return;
    }

    // Stream-order index of each tool_use block (keyed by content block index / id).
    const toolIndexByBlock = new Map<number, { id: string; index: number }>();
    const toolIndexById = new Map<string, number>();
    let nextToolIndex = 0;
    let final: BetaMessage;
    try {
      for await (const event of stream) {
        switch (event.type) {
          case "message_start":
            yield { type: "start", model: event.message.model };
            break;
          case "content_block_start": {
            const block = event.content_block;
            if (block.type === "tool_use") {
              const index = nextToolIndex++;
              toolIndexByBlock.set(event.index, { id: block.id, index });
              toolIndexById.set(block.id, index);
              yield { type: "tool_call_start", id: block.id, name: block.name, index };
            }
            break;
          }
          case "content_block_delta": {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              if (delta.text) yield { type: "text_delta", text: delta.text };
            } else if (delta.type === "thinking_delta") {
              if (delta.thinking) yield { type: "reasoning_delta", text: delta.thinking };
            } else if (delta.type === "input_json_delta") {
              const tool = toolIndexByBlock.get(event.index);
              if (tool && delta.partial_json) yield { type: "tool_call_delta", id: tool.id, index: tool.index, argsDelta: delta.partial_json };
            }
            break;
          }
          default:
            break;
        }
      }
      final = await stream.finalMessage();
    } catch (err) {
      yield { type: "error", error: mapAnthropicError(err, signal) };
      return;
    }

    const stopReason = mapStopReason(final.stop_reason);
    // Plain JSON copy: drops the SDK's non-enumerable helper props so history/transcripts hold pure data.
    const content = JSON.parse(JSON.stringify(final.content ?? [])) as Record<string, unknown>[];
    let boundary = -1;
    content.forEach((b, i) => {
      if (b.type === "fallback") boundary = i;
    });
    if (stopReason !== "refusal") {
      for (let i = boundary + 1; i < content.length; i++) {
        const block = content[i]!;
        if (block.type !== "tool_use") continue;
        const id = String(block.id);
        const name = String(block.name);
        let index = toolIndexById.get(id);
        if (index === undefined) {
          index = nextToolIndex++;
          toolIndexById.set(id, index);
        }
        const args = isPlainObject(block.input) ? block.input : { __invalid_json: JSON.stringify(block.input ?? null) };
        yield { type: "tool_call", id, name, args, index };
      }
    }

    // A refusal can cut a tool_use off mid-input: never echo those back (no tool_result will follow).
    const raw = stopReason === "refusal" ? content.filter((b) => b.type !== "tool_use") : content;
    const usage = final.usage;
    const finish: StreamEvent = {
      type: "finish",
      stopReason,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        ...(usage?.cache_read_input_tokens != null ? { cacheReadTokens: usage.cache_read_input_tokens } : {}),
        ...(usage?.cache_creation_input_tokens != null ? { cacheWriteTokens: usage.cache_creation_input_tokens } : {}),
      },
      raw,
    };
    yield finish;
  }
}
