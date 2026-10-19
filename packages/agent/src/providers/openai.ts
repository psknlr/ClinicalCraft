/**
 * OpenAICompatibleProvider — Chat Completions over raw `fetch` + SSE.
 * Works with OpenAI, xAI Grok, Zhipu GLM / Z.ai, DeepSeek, Moonshot Kimi,
 * Qwen (DashScope), OpenRouter, Ollama and LM Studio.
 *
 *   - ONE leading system message (sections joined with blank lines);
 *   - tools as `{type:"function", function:{name, description, parameters}}`,
 *     `tool_choice` never forced;
 *   - `delta.tool_calls[i]` assembled by `index` (id/name may arrive only on
 *     the first fragment); `tool_call` emitted when `finish_reason` arrives or
 *     the stream ends; invalid JSON → `{__invalid_json: raw}`;
 *   - `reasoning_content` / `reasoning` deltas → `reasoning_delta`;
 *   - per-model options from capabilities (OpenAI reasoning effort, GLM thinking);
 *   - `responseFormat` → `response_format` json_schema / json_object (+ instruction).
 */
import { capabilitiesFor } from "./catalog.js";
import { abortedError, classifyHttpError, MISSING_TOOL_RESULT, networkError } from "./errors.js";
import { parseSSE } from "./sse.js";
import { isStrictCompatibleSchema, sanitizeSchemaName, structuredOutputMode, withJsonInstruction } from "./structured.js";
import type { ChatMessage, ChatPart, ChatRequest, LLMProvider, ModelCapabilities, ProviderConfig, StreamEvent, SystemSection } from "./types.js";

/** Chat Completions message (the subset we send). */
export type OpenAIMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | OpenAIContentPart[] }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type OpenAIContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** Merge system sections into one system message text. */
export function joinSystem(system: readonly SystemSection[]): string {
  return system
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function argsToString(args: unknown): string {
  if (args && typeof args === "object" && !Array.isArray(args)) {
    const invalid = (args as Record<string, unknown>).__invalid_json;
    if (typeof invalid === "string" && Object.keys(args).length === 1) return invalid;
  }
  try {
    return JSON.stringify(args ?? {});
  } catch {
    return "{}";
  }
}

/**
 * Convert provider-neutral history to Chat Completions messages.
 *
 * Consecutive user messages form one group: its tool results become
 * `role:"tool"` messages placed directly after the assistant turn that made
 * the calls (in result order), followed by ONE user message with the
 * remaining text/images. Tool pairing is repaired so the request is always
 * valid: calls without a result get a synthetic error result, results without
 * a matching call of the preceding assistant turn (orphans, duplicates) are
 * dropped.
 */
export function toOpenAIMessages(system: readonly SystemSection[], messages: readonly ChatMessage[]): OpenAIMessage[] {
  const out: OpenAIMessage[] = [];
  const sys = joinSystem(system);
  if (sys) out.push({ role: "system", content: sys });
  /** Tool call ids of the latest assistant turn that still await a result. */
  let pending: string[] = [];
  const answerPending = (results: Extract<ChatPart, { type: "tool_result" }>[]) => {
    const answered = new Set<string>();
    for (const r of results) {
      if (!pending.includes(r.callId) || answered.has(r.callId)) continue; // orphan or duplicate
      answered.add(r.callId);
      out.push({ role: "tool", tool_call_id: r.callId, content: r.isError ? `[error] ${r.content}` : r.content });
    }
    for (const id of pending) if (!answered.has(id)) out.push({ role: "tool", tool_call_id: id, content: `[error] ${MISSING_TOOL_RESULT}` });
    pending = [];
  };

  for (let i = 0; i < messages.length; ) {
    const message = messages[i]!;
    if (message.role === "assistant") {
      i++;
      const text = message.content
        .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("");
      const calls: OpenAIToolCall[] = message.content
        .filter((p): p is Extract<typeof p, { type: "tool_call" }> => p.type === "tool_call")
        .map((p) => ({ id: p.id, type: "function", function: { name: p.name, arguments: argsToString(p.args) } }));
      if (!text && calls.length === 0) continue;
      answerPending([]);
      const msg: OpenAIMessage = { role: "assistant", content: text || null };
      if (calls.length > 0) msg.tool_calls = calls;
      out.push(msg);
      pending = calls.map((c) => c.id);
      continue;
    }
    // A group of consecutive user messages.
    const results: Extract<ChatPart, { type: "tool_result" }>[] = [];
    const parts: OpenAIContentPart[] = [];
    for (; i < messages.length && messages[i]!.role === "user"; i++) {
      for (const part of messages[i]!.content) {
        if (part.type === "tool_result") {
          results.push(part);
          // `role: "tool"` messages carry text only: a tool's images (camera frames) follow in the user message.
          if (part.images?.length) {
            parts.push({ type: "text", text: `Image(s) returned by tool call ${part.callId}:` });
            for (const img of part.images) parts.push({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.data}` } });
          }
        } else if (part.type === "text") {
          if (part.text) parts.push({ type: "text", text: part.text });
        } else if (part.type === "image") {
          parts.push({ type: "image_url", image_url: { url: `data:${part.mediaType};base64,${part.data}` } });
        }
      }
    }
    answerPending(results);
    if (parts.length === 0) continue;
    if (parts.every((p) => p.type === "text")) {
      out.push({ role: "user", content: parts.map((p) => (p as { text: string }).text).join("\n\n") });
    } else {
      out.push({ role: "user", content: parts });
    }
  }
  answerPending([]);
  return out;
}

function openAIEffort(effort: NonNullable<ChatRequest["effort"]>, providerId: string, model: string): string {
  // xAI documents only low|high for reasoning_effort (grok-3-mini).
  if (providerId === "xai" || /^(x-ai\/)?grok-/i.test(model)) return effort === "low" ? "low" : "high";
  switch (effort) {
    case "low":
      return "low";
    case "medium":
      return "medium";
    default:
      return "high";
  }
}

/** Build the Chat Completions request body (pure; unit-tested). */
export function buildOpenAIRequest(config: Pick<ProviderConfig, "id" | "model">, request: ChatRequest, caps?: ModelCapabilities): Record<string, unknown> {
  const model = request.model || config.model;
  const capabilities = caps ?? capabilitiesFor(config.id, model);
  const format = request.responseFormat;
  const formatMode = format ? structuredOutputMode(config.id, model) : "none";
  const system = format && formatMode !== "json_schema" ? withJsonInstruction(request.system, format) : request.system;
  const body: Record<string, unknown> = {
    model,
    messages: toOpenAIMessages(system, request.messages),
    stream: true,
    stream_options: { include_usage: true },
  };
  if (format && formatMode === "json_schema") {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: sanitizeSchemaName(format.name), schema: format.schema, strict: isStrictCompatibleSchema(format.schema) },
    };
  } else if (format && formatMode === "json_object") {
    body.response_format = { type: "json_object" };
  }
  const hasTools = Boolean(request.tools && request.tools.length > 0 && capabilities.supportsTools);
  if (hasTools) {
    body.tools = request.tools!.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
  }
  const maxTokens = request.maxTokens != null ? Math.max(1, Math.min(request.maxTokens, capabilities.maxOutputTokens)) : undefined;
  const temperature =
    request.temperature != null && !capabilities.rejectsSampling ? Math.min(2, Math.max(0, request.temperature * (capabilities.temperatureScale ?? 1))) : undefined;

  switch (capabilities.reasoning) {
    case "openai-reasoning-effort":
      if (request.effort) body.reasoning_effort = openAIEffort(request.effort, config.id, model);
      if (maxTokens != null) body.max_completion_tokens = maxTokens;
      break;
    case "glm-thinking":
      body.thinking = { type: request.effort && request.effort !== "low" ? "enabled" : "disabled" };
      if (hasTools && /^glm-(4\.(?:[6-9])|5)/i.test(model)) body.tool_stream = true;
      if (maxTokens != null) body.max_tokens = maxTokens;
      if (temperature != null) body.temperature = temperature;
      break;
    default:
      if (maxTokens != null) body.max_tokens = maxTokens;
      if (temperature != null) body.temperature = temperature;
      break;
  }
  return body;
}

type FinishReason = Extract<StreamEvent, { type: "finish" }>["stopReason"];

function mapFinishReason(reason: string | null | undefined, hasToolCalls: boolean): FinishReason {
  switch (reason) {
    case "tool_calls":
    case "function_call":
      return "tool_use";
    case "length":
      return "max_tokens";
    case "content_filter":
    case "sensitive":
      return "refusal";
    case "stop":
    case "end_turn":
    case null:
    case undefined:
      return hasToolCalls ? "tool_use" : "end_turn";
    default:
      return hasToolCalls ? "tool_use" : "other";
  }
}

interface PendingCall {
  /** Emitted index: order of first appearance in the stream. */
  index: number;
  id: string;
  name: string;
  args: string;
  started: boolean;
  emitted: boolean;
  bufferedDeltas: string[];
}

export interface OpenAIProviderOptions {
  /** Injectable fetch (tests, custom agents). Defaults to global fetch. */
  fetch?: typeof fetch;
  capabilities?: ModelCapabilities;
}

/** LLMProvider for wire `openai-chat-completions`. */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly id: string;
  readonly wire = "openai-chat-completions" as const;
  readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly caps?: ModelCapabilities;

  constructor(
    private readonly config: ProviderConfig,
    options: OpenAIProviderOptions = {},
  ) {
    this.id = config.id;
    this.model = config.model;
    this.fetchImpl = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
    if (options.capabilities) this.caps = options.capabilities;
  }

  capabilities(): ModelCapabilities {
    return this.caps ?? capabilitiesFor(this.id, this.model);
  }

  /** Endpoint URL (`{baseUrl}/chat/completions`). */
  endpoint(): string {
    const base = (this.config.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    return `${base}/chat/completions`;
  }

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    if (signal?.aborted) {
      yield { type: "error", error: abortedError() };
      return;
    }
    const model = request.model || this.model;
    const caps = this.caps ?? capabilitiesFor(this.id, model);
    const body = buildOpenAIRequest(this.config, { ...request, model }, caps);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "text/event-stream",
      ...(this.config.headers ?? {}),
    };
    if (this.config.apiKey) headers.authorization = `Bearer ${this.config.apiKey}`;

    // Connect timeout: abort if response headers do not arrive in time.
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", onAbort, { once: true });
    let timedOut = false;
    const timeoutMs = this.config.timeoutMs ?? 120_000;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint(), { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (timedOut) yield { type: "error", error: { message: `No response within ${timeoutMs} ms`, kind: "timeout", retryable: true } };
      else yield { type: "error", error: networkError(err, signal) };
      return;
    }
    clearTimeout(timer);

    try {
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        yield { type: "error", error: classifyHttpError(response.status, text, response.headers) };
        return;
      }
      if ((response.headers.get("content-type") ?? "").includes("application/json")) {
        // Some compatible servers ignore `stream: true` and answer with one JSON completion;
        // others stream SSE but mislabel it as JSON.
        const text = await response.text();
        if (/^\s*(data|event|id|retry)?:/.test(text)) {
          yield* this.consume(new Response(text).body!, model, controller.signal, signal);
        } else {
          yield* fromCompletionJson(text, model);
        }
        return;
      }
      if (!response.body) {
        yield { type: "error", error: { message: "Empty response body", kind: "network", retryable: true } };
        return;
      }
      yield* this.consume(response.body, model, controller.signal, signal);
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
  }

  private async *consume(body: ReadableStream<Uint8Array>, model: string, innerSignal: AbortSignal, outerSignal?: AbortSignal): AsyncGenerator<StreamEvent> {
    yield { type: "start", model };
    /** Every call in order of first appearance; `slots` maps the wire index to its current call. */
    const calls: PendingCall[] = [];
    const slots = new Map<number, PendingCall>();
    const newCall = (wireIndex: number): PendingCall => {
      const call: PendingCall = { index: calls.length, id: "", name: "", args: "", started: false, emitted: false, bufferedDeltas: [] };
      calls.push(call);
      slots.set(wireIndex, call);
      return call;
    };
    let finishReason: string | null | undefined;
    let sawDone = false;
    let sawFinish = false;
    let usage = { inputTokens: 0, outputTokens: 0 } as Extract<StreamEvent, { type: "finish" }>["usage"];

    const flush = function* (): Generator<StreamEvent> {
      for (const call of calls) {
        if (call.emitted) continue;
        call.emitted = true;
        if (!call.id) call.id = `call_${call.index}`;
        if (!call.started) {
          call.started = true;
          yield { type: "tool_call_start", id: call.id, name: call.name, index: call.index };
          if (call.args) yield { type: "tool_call_delta", id: call.id, index: call.index, argsDelta: call.args };
        }
        yield { type: "tool_call", id: call.id, name: call.name, args: parseArgs(call.args), index: call.index };
      }
    };

    try {
      for await (const message of parseSSE(body, { signal: innerSignal })) {
        if (message.data === "[DONE]") {
          sawDone = true;
          break;
        }
        let chunk: Record<string, unknown>;
        try {
          chunk = JSON.parse(message.data) as Record<string, unknown>;
        } catch {
          continue; // keep-alive or vendor noise
        }
        if (chunk.error) {
          yield { type: "error", error: classifyHttpError(0, JSON.stringify({ error: chunk.error })) };
          return;
        }
        const u = chunk.usage as Record<string, unknown> | undefined | null;
        if (u && typeof u === "object") usage = parseUsage(u);
        const choices = Array.isArray(chunk.choices) ? (chunk.choices as Record<string, unknown>[]) : [];
        for (const choice of choices) {
          const delta = (choice.delta ?? {}) as Record<string, unknown>;
          const reasoning = typeof delta.reasoning_content === "string" ? delta.reasoning_content : typeof delta.reasoning === "string" ? delta.reasoning : "";
          if (reasoning) yield { type: "reasoning_delta", text: reasoning };
          if (typeof delta.content === "string" && delta.content) yield { type: "text_delta", text: delta.content };
          if (Array.isArray(delta.tool_calls)) {
            for (const [position, raw] of (delta.tool_calls as Record<string, unknown>[]).entries()) {
              const wireIndex = typeof raw.index === "number" ? raw.index : position;
              const rawId = typeof raw.id === "string" ? raw.id : "";
              let call = slots.get(wireIndex);
              // A different id at an occupied index is a new call (servers that put every call at index 0).
              if (!call || (rawId && call.id && rawId !== call.id)) call = newCall(wireIndex);
              const index = call.index;
              if (rawId && !call.id) call.id = rawId;
              const fn = (raw.function ?? {}) as Record<string, unknown>;
              if (typeof fn.name === "string" && fn.name && !call.name) call.name = fn.name;
              const fragment = typeof fn.arguments === "string" ? fn.arguments : "";
              if (fragment) {
                call.args += fragment;
                call.bufferedDeltas.push(fragment);
              }
              if (!call.started && call.id && call.name) {
                call.started = true;
                yield { type: "tool_call_start", id: call.id, name: call.name, index };
              }
              if (call.started && call.bufferedDeltas.length > 0) {
                for (const d of call.bufferedDeltas.splice(0)) yield { type: "tool_call_delta", id: call.id, index, argsDelta: d };
              }
            }
          }
          if (choice.finish_reason != null) {
            finishReason = String(choice.finish_reason);
            sawFinish = true;
            if (finishReason === "network_error") {
              yield { type: "error", error: { message: "Upstream network error during generation", kind: "network", code: "network_error", retryable: true } };
              return;
            }
            yield* flush();
          }
        }
      }
    } catch (err) {
      yield { type: "error", error: outerSignal?.aborted ? abortedError() : networkError(err, outerSignal) };
      return;
    }
    if (outerSignal?.aborted) {
      yield { type: "error", error: abortedError() };
      return;
    }
    if (!sawFinish && !sawDone) {
      yield { type: "error", error: { message: "Stream ended before the model finished", kind: "network", retryable: true } };
      return;
    }
    yield* flush();
    yield { type: "finish", stopReason: mapFinishReason(finishReason, calls.length > 0), usage };
  }
}

/** Map a non-streaming `chat.completion` JSON body to stream events. */
function* fromCompletionJson(text: string, model: string): Generator<StreamEvent> {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    yield { type: "error", error: { message: "Invalid JSON response", kind: "bad_request", retryable: false } };
    return;
  }
  if (body.error) {
    yield { type: "error", error: classifyHttpError(0, JSON.stringify({ error: body.error })) };
    return;
  }
  const choice = (Array.isArray(body.choices) ? body.choices[0] : undefined) as Record<string, unknown> | undefined;
  const message = (choice?.message ?? {}) as Record<string, unknown>;
  yield { type: "start", model: typeof body.model === "string" ? body.model : model };
  const reasoning = typeof message.reasoning_content === "string" ? message.reasoning_content : typeof message.reasoning === "string" ? message.reasoning : "";
  if (reasoning) yield { type: "reasoning_delta", text: reasoning };
  if (typeof message.content === "string" && message.content) yield { type: "text_delta", text: message.content };
  const calls = Array.isArray(message.tool_calls) ? (message.tool_calls as Record<string, unknown>[]) : [];
  for (const [index, call] of calls.entries()) {
    const fn = (call.function ?? {}) as Record<string, unknown>;
    const id = typeof call.id === "string" && call.id ? call.id : `call_${index}`;
    const name = typeof fn.name === "string" ? fn.name : "";
    const args = typeof fn.arguments === "string" ? fn.arguments : JSON.stringify(fn.arguments ?? {});
    yield { type: "tool_call_start", id, name, index };
    if (args) yield { type: "tool_call_delta", id, index, argsDelta: args };
    yield { type: "tool_call", id, name, args: parseArgs(args), index };
  }
  const usage = body.usage && typeof body.usage === "object" ? parseUsage(body.usage as Record<string, unknown>) : { inputTokens: 0, outputTokens: 0 };
  yield { type: "finish", stopReason: mapFinishReason(choice?.finish_reason as string | undefined, calls.length > 0), usage };
}

function parseArgs(raw: string): unknown {
  const text = raw.trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed;
  } catch {
    return { __invalid_json: raw };
  }
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Usage → normalised `TokenUsage` (inputTokens excludes cache reads, as on Anthropic). */
function parseUsage(u: Record<string, unknown>): Extract<StreamEvent, { type: "finish" }>["usage"] {
  const prompt = num(u.prompt_tokens ?? u.input_tokens);
  const completion = num(u.completion_tokens ?? u.output_tokens);
  const details = (u.prompt_tokens_details ?? u.input_tokens_details) as Record<string, unknown> | undefined;
  const cached = num(details?.cached_tokens ?? u.prompt_cache_hit_tokens);
  const usage: Extract<StreamEvent, { type: "finish" }>["usage"] = { inputTokens: Math.max(0, prompt - cached), outputTokens: completion };
  if (cached > 0) usage.cacheReadTokens = cached;
  return usage;
}
