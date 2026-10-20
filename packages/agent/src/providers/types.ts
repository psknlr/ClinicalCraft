/**
 * Provider-neutral LLM interface.
 *
 * Two wire protocols cover every supported vendor (ZCode/Codex lesson:
 * keep the catalogue as data, keep adapters few):
 *   - "anthropic-messages"      → official @anthropic-ai/sdk (Claude; also Anthropic-compatible
 *                                 endpoints such as Zhipu/Z.ai, DeepSeek, Moonshot, Qwen, Ollama)
 *   - "openai-chat-completions" → raw fetch + SSE (OpenAI, xAI Grok, Zhipu GLM, DeepSeek,
 *                                 Moonshot/Kimi, Qwen/DashScope, OpenRouter, Ollama, LM Studio)
 * plus two non-network kinds:
 *   - "offline" → no model; agents use deterministic responders built on core matchers
 *   - "proxy"   → browser → `clinicalcraft serve` POST /api/llm/stream (keys stay server-side)
 */

export type WireApi = "anthropic-messages" | "openai-chat-completions" | "offline" | "proxy";

export type LocalizedName = { [locale: string]: string } | string;

/** A provider template in the data-driven catalogue (`providers/catalog.ts`). */
export interface ProviderTemplate {
  id: string;
  name: LocalizedName;
  wire: WireApi;
  baseUrl?: string;
  /** Environment variables checked in order for the API key (node only). */
  apiKeyEnv?: string[];
  /** Where to obtain a key (shown in settings UIs). */
  keyUrl?: string;
  /** Extra static headers (e.g. OpenRouter attribution). */
  headers?: Record<string, string>;
  /** Default model id and a few suggestions (model ids change monthly — users may type any id). */
  defaultModel?: string;
  models?: string[];
  /** Whether a browser may call it directly (CORS). */
  browserDirect?: boolean;
  /** True for local servers that need no key (Ollama, LM Studio). */
  noKey?: boolean;
  notes?: LocalizedName;
}

/** Capability rules matched by regex on the model id (ZCode-style), merged over a `.*` default. */
export interface ModelCapabilities {
  contextWindow: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  supportsImages: boolean;
  /**
   * Can look at camera frames (`get_camera_frame`, embodied mode): images in tool results. Defaults to
   * `supportsImages` unless a rule sets it (`capabilitiesFor`).
   */
  vision: boolean;
  supportsStreaming: boolean;
  /** Supports `{role:"system"}` messages mid-conversation (Claude Opus 5.5 does; most don't). */
  supportsMidConversationSystem: boolean;
  /** Reasoning control style. */
  reasoning: "none" | "anthropic-effort" | "openai-reasoning-effort" | "glm-thinking";
  /** Forced tool_choice ("any"/specific tool) is rejected by the model (Claude Opus 5.5 / Fable 5.1 / Sonnet 5.5). */
  forbidsForcedToolChoice: boolean;
  /** Sampling params (temperature/top_p) are rejected (Claude 4.7+). */
  rejectsSampling: boolean;
  /** Multiply temperature by this factor (Kimi Anthropic endpoint: 0.6). */
  temperatureScale?: number;
  /** Native structured-output support used for `ChatRequest.responseFormat`. */
  structuredOutput?: "json_schema" | "json_object" | "none";
}

export interface ModelRule {
  match: string;
  provider?: string;
  capabilities: Partial<ModelCapabilities>;
}

/** Resolved, ready-to-use provider configuration. */
export interface ProviderConfig {
  id: string;
  wire: WireApi;
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  model: string;
  /** Browser only: allow direct calls with a user-supplied key (Anthropic `dangerouslyAllowBrowser`). */
  browser?: boolean;
  /** Proxy endpoint for wire "proxy". */
  proxyUrl?: string;
  /** Upstream provider id the proxy should use. */
  proxyProvider?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

/* ------------------------------------------------------------------ */
/* Provider-neutral conversation                                        */
/* ------------------------------------------------------------------ */

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: string; data: string /* base64 */ }
  | { type: "tool_call"; id: string; name: string; args: unknown }
  /** `images`: pictures the tool returned (camera frames) — Anthropic sends them inside the tool_result, OpenAI-compatible wires as a follow-up user message. */
  | { type: "tool_result"; callId: string; content: string; isError?: boolean; images?: { mediaType: string; data: string }[] }
  /**
   * Opaque provider-native blocks that must be echoed back verbatim on the
   * same provider (Anthropic thinking/redacted_thinking/compaction blocks —
   * append-only history, "preserved thinking"). Other providers ignore them.
   */
  | { type: "provider_raw"; provider: WireApi; data: unknown };

export interface ChatMessage {
  role: "user" | "assistant";
  content: ChatPart[];
}

/** One section of the system prompt; stable sections first so prompt caching works. */
export interface SystemSection {
  id: string;
  text: string;
  cache: "stable" | "dynamic";
}

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema (draft 2020-12 subset): type object, properties, required, additionalProperties false. */
  inputSchema: Record<string, unknown>;
}

export interface ChatRequest {
  model: string;
  system: SystemSection[];
  messages: ChatMessage[];
  tools?: ToolSpec[];
  maxTokens?: number;
  temperature?: number;
  /** Normalised reasoning effort; mapped per wire (Anthropic output_config.effort, OpenAI reasoning_effort, GLM thinking). */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /**
   * Ask for a JSON object matching `schema` (patient voice, examiner verdicts).
   * Anthropic → output_config.format {type:"json_schema", schema}; OpenAI-compatible →
   * response_format {type:"json_schema", json_schema:{name, schema, strict:true}} when the
   * model supports it, else a JSON instruction appended to the system prompt. Callers must
   * still parse defensively.
   */
  responseFormat?: { name: string; schema: Record<string, unknown> };
  /** Stable id for tracing/caching (per agent conversation). */
  conversationId?: string;
  metadata?: Record<string, string>;
}

/** Normalised stream events (union of ZCode/Grok CLI/Codex shapes). */
export type StreamEvent =
  | { type: "start"; model: string }
  | { type: "text_delta"; text: string }
  | { type: "reasoning_delta"; text: string }
  | { type: "tool_call_start"; id: string; name: string; index: number }
  | { type: "tool_call_delta"; id: string; index: number; argsDelta: string }
  /** Emitted once the arguments JSON is complete and parsed. */
  | { type: "tool_call"; id: string; name: string; args: unknown; index: number }
  | {
      type: "finish";
      stopReason: "end_turn" | "tool_use" | "max_tokens" | "refusal" | "pause_turn" | "error" | "other";
      usage: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number };
      /** Provider-native assistant content to append to history verbatim (e.g. Anthropic blocks incl. thinking). */
      raw?: unknown;
    }
  | { type: "error"; error: ProviderErrorInfo };

export interface ProviderErrorInfo {
  message: string;
  kind: "auth" | "rate_limit" | "overloaded" | "context_exceeded" | "quota" | "bad_request" | "network" | "timeout" | "refusal" | "unknown";
  status?: number;
  code?: string | number;
  retryable: boolean;
  /** Server-suggested delay (Retry-After / retry-after-ms) in milliseconds. */
  retryAfterMs?: number;
}

export interface LLMProvider {
  readonly id: string;
  readonly wire: WireApi;
  readonly model: string;
  capabilities(): ModelCapabilities;
  /** Stream one model response. Must honour `signal`. Never throws for HTTP errors: yields an `error` event. */
  stream(request: ChatRequest, signal?: AbortSignal): AsyncIterable<StreamEvent>;
}

export class ProviderError extends Error {
  constructor(public readonly info: ProviderErrorInfo) {
    super(info.message);
    this.name = "ProviderError";
  }
}
