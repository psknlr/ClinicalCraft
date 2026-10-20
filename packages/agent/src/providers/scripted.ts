/**
 * ScriptedProvider — deterministic test double. Each `stream()` call consumes
 * the next script (a fixed `StreamEvent[]` or a function of the request) and
 * records a deep copy of the request in `requests`.
 */
import { DEFAULT_CAPABILITIES } from "./catalog.js";
import { abortedError } from "./errors.js";
import type { ChatRequest, LLMProvider, ModelCapabilities, StreamEvent, WireApi } from "./types.js";

/** One scripted response. */
export type Script = StreamEvent[] | ((request: ChatRequest, callIndex: number) => StreamEvent[]);

export interface ScriptedProviderOptions {
  id?: string;
  model?: string;
  wire?: WireApi;
  capabilities?: Partial<ModelCapabilities>;
  /** Delay between events (ms) to exercise streaming/abort paths. */
  delayMs?: number;
}

function clone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

/** Build a minimal text response script (`start`, deltas, `finish`). */
export function textScript(text: string, opts: { model?: string; chunk?: number } = {}): StreamEvent[] {
  const chunk = opts.chunk ?? 16;
  const events: StreamEvent[] = [{ type: "start", model: opts.model ?? "scripted" }];
  for (let i = 0; i < text.length; i += chunk) events.push({ type: "text_delta", text: text.slice(i, i + chunk) });
  events.push({ type: "finish", stopReason: "end_turn", usage: { inputTokens: 0, outputTokens: Math.ceil(text.length / 4) } });
  return events;
}

/** Build a tool-call response script. */
export function toolCallScript(calls: { id: string; name: string; args: unknown }[], opts: { text?: string; model?: string } = {}): StreamEvent[] {
  const events: StreamEvent[] = [{ type: "start", model: opts.model ?? "scripted" }];
  if (opts.text) events.push({ type: "text_delta", text: opts.text });
  calls.forEach((c, index) => {
    events.push({ type: "tool_call_start", id: c.id, name: c.name, index });
    events.push({ type: "tool_call_delta", id: c.id, index, argsDelta: JSON.stringify(c.args) });
    events.push({ type: "tool_call", id: c.id, name: c.name, args: c.args, index });
  });
  events.push({ type: "finish", stopReason: "tool_use", usage: { inputTokens: 0, outputTokens: 0 } });
  return events;
}

export class ScriptedProvider implements LLMProvider {
  readonly id: string;
  readonly wire: WireApi;
  readonly model: string;
  /** Every request received, deep-copied at call time. */
  readonly requests: ChatRequest[] = [];
  private readonly scripts: Script[];
  private readonly caps: ModelCapabilities;
  private readonly delayMs: number;

  constructor(responses: Script[], options: ScriptedProviderOptions = {}) {
    this.scripts = [...responses];
    this.id = options.id ?? "scripted";
    this.model = options.model ?? "scripted";
    this.wire = options.wire ?? "openai-chat-completions";
    this.caps = { ...DEFAULT_CAPABILITIES, ...(options.capabilities ?? {}) };
    this.delayMs = options.delayMs ?? 0;
  }

  capabilities(): ModelCapabilities {
    return { ...this.caps };
  }

  /** Scripts not yet consumed. */
  get remaining(): number {
    return this.scripts.length;
  }

  /** Append more scripts. */
  push(...scripts: Script[]): void {
    this.scripts.push(...scripts);
  }

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    const callIndex = this.requests.length;
    this.requests.push(clone(request));
    const script = this.scripts.shift();
    if (!script) {
      yield { type: "error", error: { message: "ScriptedProvider: no scripted response left", kind: "bad_request", retryable: false } };
      return;
    }
    const events = typeof script === "function" ? script(request, callIndex) : script;
    for (const event of events) {
      if (signal?.aborted) {
        yield { type: "error", error: abortedError() };
        return;
      }
      if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
      if (signal?.aborted) {
        yield { type: "error", error: abortedError() };
        return;
      }
      yield clone(event);
    }
  }
}
