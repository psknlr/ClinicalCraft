/**
 * The generic tool-use loop (docs/PROTOCOL.md §4).
 *
 *   1. append the user message; `turn_phase awaiting_model`;
 *   2. stream the model: `text_delta` → `agent_message_delta`, tool calls are
 *      collected when complete (`tool_call`);
 *   3. on `finish` append the assistant message (text + tool calls +
 *      `provider_raw`); `refusal` stops, `max_tokens` never runs (possibly
 *      truncated) tool calls, `pause_turn` continues;
 *   4. every tool call: validate → PreToolUse hooks → approval gate → run →
 *      PostToolUse hooks (`additionalContext` appended as data); read-only
 *      calls run concurrently; ALL results go back in ONE user message;
 *   5. loop while the model calls tools and rounds < maxToolRounds; the Stop
 *      hook may force up to 3 continuations;
 *   6. retries via `withRetry` (`api_retry` events);
 *   7. abort: checked between chunks and before every tool. A partial
 *      assistant message is dropped; calls not yet run get "cancelled" results
 *      so tool calls and results always stay paired.
 */
import type { AgentProfile } from "./agents/types.js";
import type { HookInput, HookInputBase, HookResult } from "./hooks/types.js";
import type { AgentRole, EventMsg, TokenUsage } from "./protocol.js";
import { isAbortInfo } from "./providers/errors.js";
import { withRetry, type RetryPolicy } from "./providers/factory.js";
import type { ChatMessage, ChatPart, ChatRequest, LLMProvider, ProviderErrorInfo, StreamEvent, SystemSection } from "./providers/types.js";
import { rt } from "./session/i18n.js";
import { toToolSpec, type ToolContext, type ToolDefinition, type ToolOutput } from "./tools/types.js";
import { validateArgs } from "./tools/validate.js";

/* ------------------------------------------------------------------ */
/* Host contract                                                       */
/* ------------------------------------------------------------------ */

type BaseKeys = Exclude<keyof HookInputBase, "hook_event_name">;
/** A hook input without the session-level base fields (the host fills them in). */
export type HookSpec = HookInput extends infer H ? (H extends HookInput ? Omit<H, BaseKeys> : never) : never;

/** Outcome of the approval gate for one call. */
export type GateOutcome =
  | { kind: "allow"; ruleId?: string }
  | { kind: "deny"; reason: string; ruleId: string; byLearner?: boolean }
  /** The learner answered "abort": cancel the whole turn. */
  | { kind: "abort" };

export interface AuthorizeRequest {
  agent: AgentRole | "learner";
  tool: ToolDefinition<any>;
  args: unknown;
  ctx: ToolContext;
  /** A PreToolUse hook answered "approve" (skips the approval prompt, never a deny). */
  hookApproved: boolean;
  signal?: AbortSignal;
  turnId?: string;
  callId?: string;
}

/** What the loop needs from the session. */
export interface LoopHost {
  /** Tool context for `agent`. */
  toolContext(agent: AgentRole, signal?: AbortSignal): ToolContext;
  /** Permission ladder + approval_request flow. */
  authorize(request: AuthorizeRequest): Promise<GateOutcome>;
  /** Lifecycle hooks (PreToolUse, PostToolUse, Stop); optional. */
  runHooks?(input: HookSpec): Promise<HookResult>;
}

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

/** A zeroed usage record. */
export function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

/** Add `b` into `a` (mutates and returns `a`). */
export function addUsage(a: TokenUsage, b: Partial<TokenUsage> | undefined): TokenUsage {
  if (!b) return a;
  a.inputTokens += b.inputTokens ?? 0;
  a.outputTokens += b.outputTokens ?? 0;
  a.cacheReadTokens = (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0);
  a.cacheWriteTokens = (a.cacheWriteTokens ?? 0) + (b.cacheWriteTokens ?? 0);
  return a;
}

/* ------------------------------------------------------------------ */
/* One model call                                                      */
/* ------------------------------------------------------------------ */

export interface StreamedToolCall {
  id: string;
  name: string;
  args: unknown;
  index: number;
}

export interface StepResult {
  text: string;
  reasoning: string;
  toolCalls: StreamedToolCall[];
  stopReason: Extract<StreamEvent, { type: "finish" }>["stopReason"];
  usage: TokenUsage;
  raw: unknown;
  error: ProviderErrorInfo | null;
  aborted: boolean;
}

export interface StreamStepOptions {
  signal?: AbortSignal;
  onTextDelta?: (delta: string) => void;
  /** Called once, on the first streamed content. */
  onFirstContent?: () => void;
}

/** Stream one model response and collect it. Never throws. */
export async function streamStep(provider: LLMProvider, request: ChatRequest, options: StreamStepOptions = {}): Promise<StepResult> {
  const step: StepResult = { text: "", reasoning: "", toolCalls: [], stopReason: "end_turn", usage: emptyUsage(), raw: undefined, error: null, aborted: false };
  let finished = false;
  let started = false;
  const first = () => {
    if (!started) {
      started = true;
      options.onFirstContent?.();
    }
  };
  try {
    for await (const event of provider.stream(request, options.signal)) {
      if (options.signal?.aborted) {
        step.aborted = true;
        break;
      }
      switch (event.type) {
        case "start":
        case "tool_call_start":
        case "tool_call_delta":
          break;
        case "text_delta":
          first();
          step.text += event.text;
          options.onTextDelta?.(event.text);
          break;
        case "reasoning_delta":
          first();
          step.reasoning += event.text;
          break;
        case "tool_call":
          first();
          step.toolCalls.push({ id: event.id || `call_${step.toolCalls.length + 1}`, name: event.name, args: event.args, index: event.index });
          break;
        case "finish":
          finished = true;
          step.stopReason = event.stopReason;
          addUsage(step.usage, event.usage);
          step.raw = event.raw;
          break;
        case "error":
          if (isAbortInfo(event.error) || options.signal?.aborted) step.aborted = true;
          else step.error = event.error;
          break;
        default: {
          const never: never = event;
          void never;
        }
      }
      if (step.error || step.aborted) break;
    }
  } catch (err) {
    if (options.signal?.aborted) step.aborted = true;
    else step.error = { message: err instanceof Error ? err.message : String(err), kind: "unknown", retryable: false };
  }
  if (options.signal?.aborted) step.aborted = true;
  if (!finished && !step.error && !step.aborted) {
    if (step.toolCalls.length > 0) step.stopReason = "tool_use";
    else if (!step.text) step.error = { message: "stream ended without a finish event", kind: "network", retryable: false };
  }
  step.toolCalls.sort((a, b) => a.index - b.index);
  return step;
}

/* ------------------------------------------------------------------ */
/* Tool execution                                                      */
/* ------------------------------------------------------------------ */

export interface ToolCallRequest {
  id: string;
  name: string;
  args: unknown;
}

export type ToolCallStatus = "ok" | "error" | "invalid" | "blocked" | "denied" | "cancelled" | "interrupted";

export interface ToolCallOutcome {
  callId: string;
  tool: string;
  status: ToolCallStatus;
  output: ToolOutput;
  /** The `tool_result` part returned to the model. */
  result: Extract<ChatPart, { type: "tool_result" }>;
  /** Fact ids revealed by the tool (`data.grounded`). */
  grounded: string[];
}

export interface ExecuteToolCallParams {
  host: LoopHost;
  agent: AgentRole;
  tools: readonly ToolDefinition<any>[];
  call: ToolCallRequest;
  ctx: ToolContext;
  emit: (msg: EventMsg) => void;
  turnId: string;
  signal?: AbortSignal;
  now?: () => number;
}

function groundedOf(data: unknown): string[] {
  if (data && typeof data === "object" && Array.isArray((data as { grounded?: unknown }).grounded)) {
    return ((data as { grounded: unknown[] }).grounded).filter((x): x is string => typeof x === "string");
  }
  return [];
}

function emitHookWarnings(emit: (msg: EventMsg) => void, result: HookResult | undefined): void {
  for (const message of result?.warnings ?? []) emit({ type: "warning", message });
}

/**
 * Run one tool call through validation, PreToolUse hooks, the approval gate,
 * the tool itself and PostToolUse hooks. Emits `tool_call_begin/end`.
 * Never throws.
 */
export async function executeToolCall(p: ExecuteToolCallParams): Promise<ToolCallOutcome> {
  const now = p.now ?? (() => Date.now());
  const L = p.ctx.locale;
  const startedAt = now();
  p.emit({ type: "tool_call_begin", turnId: p.turnId, agent: p.agent, callId: p.call.id, tool: p.call.name, args: p.call.args });

  const finish = (status: ToolCallStatus, output: ToolOutput): ToolCallOutcome => {
    p.emit({
      type: "tool_call_end",
      turnId: p.turnId,
      agent: p.agent,
      callId: p.call.id,
      tool: p.call.name,
      ok: output.ok,
      output: output.output,
      ...(output.data !== undefined ? { data: output.data } : {}),
      durationMs: Math.max(0, now() - startedAt),
    });
    return {
      callId: p.call.id,
      tool: p.call.name,
      status,
      output,
      result: { type: "tool_result", callId: p.call.id, content: output.output, ...(output.ok ? {} : { isError: true }) },
      grounded: status === "ok" ? groundedOf(output.data) : [],
    };
  };
  const fail = (status: ToolCallStatus, text: string) => finish(status, { ok: false, output: text });

  const tool = p.tools.find((t) => t.name === p.call.name);
  if (!tool) return fail("invalid", rt(L, "tool.unknownTool", { tool: p.call.name, tools: p.tools.map((t) => t.name).join(", ") || "-" }));

  let validated = validateArgs(tool.inputSchema, p.call.args);
  if (!validated.ok) return fail("invalid", rt(L, "tool.invalidArgs", { tool: tool.name, errors: validated.errors.join("; ") }));
  let args = validated.value;

  const pre = await p.host.runHooks?.({ hook_event_name: "PreToolUse", agent: String(p.agent), tool_name: tool.name, tool_input: args });
  emitHookWarnings(p.emit, pre);
  if (pre?.blocked) return fail("blocked", rt(L, "tool.blockedByHook", { reason: pre.reason ?? "" }));
  if (pre && pre.updatedInput !== undefined) {
    validated = validateArgs(tool.inputSchema, pre.updatedInput);
    if (!validated.ok) return fail("invalid", rt(L, "tool.invalidArgs", { tool: tool.name, errors: validated.errors.join("; ") }));
    args = validated.value;
  }
  if (p.signal?.aborted) return fail("interrupted", rt(L, "tool.aborted"));

  const gate = await p.host.authorize({
    agent: p.agent,
    tool,
    args,
    ctx: p.ctx,
    hookApproved: pre?.approved ?? false,
    ...(p.signal ? { signal: p.signal } : {}),
    turnId: p.turnId,
    callId: p.call.id,
  });
  if (gate.kind === "abort") return fail("cancelled", rt(L, "tool.aborted"));
  if (gate.kind === "deny") {
    const text = gate.byLearner ? rt(L, "tool.deniedByLearner", { reason: gate.reason ? `: ${gate.reason}` : "" }) : rt(L, "tool.denied", { reason: gate.reason });
    return fail("denied", text);
  }
  if (p.signal?.aborted) return fail("interrupted", rt(L, "tool.aborted"));

  let output: ToolOutput;
  try {
    output = await tool.run(args as Record<string, unknown>, p.ctx);
  } catch (err) {
    output = { ok: false, output: rt(L, "tool.failed", { message: err instanceof Error ? err.message : String(err) }) };
  }

  const post = await p.host.runHooks?.({
    hook_event_name: "PostToolUse",
    agent: String(p.agent),
    tool_name: tool.name,
    tool_input: args,
    tool_response: { ok: output.ok, output: output.output },
  });
  emitHookWarnings(p.emit, post);
  if (post && post.additionalContext.length > 0) output = { ...output, output: `${output.output}\n\n${post.additionalContext.join("\n")}` };
  return finish(output.ok ? "ok" : "error", output);
}

export interface ExecuteToolCallsResult {
  results: Extract<ChatPart, { type: "tool_result" }>[];
  outcomes: ToolCallOutcome[];
  grounded: string[];
  /** Set when the turn must stop: signal abort or an "abort" approval answer. */
  stop: "interrupted" | "denied" | null;
}

/**
 * Execute a round of tool calls. Consecutive read-only calls run concurrently;
 * state-changing calls run one at a time. After an abort the remaining calls
 * get "cancelled" results (no execution).
 */
export async function executeToolCalls(base: Omit<ExecuteToolCallParams, "call">, calls: readonly ToolCallRequest[]): Promise<ExecuteToolCallsResult> {
  const outcomes: (ToolCallOutcome | null)[] = calls.map(() => null);
  let stop: ExecuteToolCallsResult["stop"] = null;
  const isReadOnly = (call: ToolCallRequest) => base.tools.find((t) => t.name === call.name)?.readOnly === true;
  let i = 0;
  while (i < calls.length && stop === null) {
    if (base.signal?.aborted) {
      stop = "interrupted";
      break;
    }
    const batch: number[] = [i];
    if (isReadOnly(calls[i]!)) while (batch.length + i < calls.length && isReadOnly(calls[i + batch.length]!)) batch.push(i + batch.length);
    const results = await Promise.all(batch.map((index) => executeToolCall({ ...base, call: calls[index]! })));
    results.forEach((r, k) => (outcomes[batch[k]!] = r));
    if (results.some((r) => r.status === "cancelled")) stop = "denied";
    else if (results.some((r) => r.status === "interrupted") || base.signal?.aborted) stop = "interrupted";
    i += batch.length;
  }
  const L = base.ctx.locale;
  const final = outcomes.map((o, index) => {
    if (o) return o;
    const call = calls[index]!;
    const output: ToolOutput = { ok: false, output: rt(L, "tool.aborted") };
    return {
      callId: call.id,
      tool: call.name,
      status: "cancelled" as const,
      output,
      result: { type: "tool_result" as const, callId: call.id, content: output.output, isError: true },
      grounded: [],
    };
  });
  return { results: final.map((o) => o.result), outcomes: final, grounded: final.flatMap((o) => o.grounded), stop };
}

/* ------------------------------------------------------------------ */
/* The turn                                                            */
/* ------------------------------------------------------------------ */

export type TurnStopReason = "end_turn" | "max_tool_rounds" | "interrupted" | "denied" | "error" | "refusal" | "max_tokens";

export interface TurnRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  effort?: ChatRequest["effort"];
  responseFormat?: ChatRequest["responseFormat"];
  conversationId?: string;
  metadata?: Record<string, string>;
}

export interface RunAgentTurnParams {
  host: LoopHost;
  agent: Pick<AgentProfile, "name">;
  provider: LLMProvider;
  system: SystemSection[];
  history: readonly ChatMessage[];
  /** The new user message (empty = continue without a new message). */
  userParts: ChatPart[];
  tools: readonly ToolDefinition<any>[];
  maxToolRounds: number;
  turnId: string;
  emit: (msg: EventMsg) => void;
  signal?: AbortSignal;
  request?: TurnRequestOptions;
  /** Retry policy (default: withRetry defaults); `false` disables retries. */
  retry?: RetryPolicy | false;
  /** Forward text deltas as `agent_message_delta` (default true). */
  streamText?: boolean;
  /** Called with the text of every assistant message that has text. */
  onAssistantText?: (text: string) => void;
  /** Called with the usage of every model call. */
  onUsage?: (usage: TokenUsage) => void;
  /** Maximum Stop-hook continuations (default 3). */
  maxStopContinuations?: number;
  now?: () => number;
}

export interface TurnResult {
  /** Text of the last assistant message with text ("" when none). */
  text: string;
  /** The full, consistent history after the turn. */
  messages: ChatMessage[];
  /** Messages appended during this turn (to persist). */
  appended: ChatMessage[];
  /** Fact ids revealed by tools during the turn. */
  grounded: string[];
  usage: TokenUsage;
  stopReason: TurnStopReason;
  error?: ProviderErrorInfo;
  toolCalls: number;
  rounds: number;
}

/** Maximum consecutive `pause_turn` continuations. */
const MAX_PAUSE_CONTINUATIONS = 5;

/** Run one agent turn (the tool-use loop). Never throws. */
export async function runAgentTurn(p: RunAgentTurnParams): Promise<TurnResult> {
  const role = p.agent.name;
  const messages: ChatMessage[] = [...p.history];
  const appended: ChatMessage[] = [];
  const push = (m: ChatMessage) => {
    messages.push(m);
    appended.push(m);
  };
  if (p.userParts.length > 0) push({ role: "user", content: p.userParts });

  const provider =
    p.retry === false
      ? p.provider
      : withRetry(p.provider, {
          ...(p.retry ?? {}),
          onRetry: (attempt, delayMs, error) => {
            p.emit({ type: "api_retry", agent: role, attempt, delayMs, error: error.message });
            if (p.retry) p.retry.onRetry?.(attempt, delayMs, error);
          },
        });
  const ctx = p.host.toolContext(role, p.signal);
  const L = ctx.locale;
  const usage = emptyUsage();
  const grounded = new Set<string>();
  const maxStop = p.maxStopContinuations ?? 3;
  let rounds = 0;
  let toolCalls = 0;
  let stopContinuations = 0;
  let pauses = 0;
  let text = "";
  const phase = (ph: "awaiting_model" | "streaming" | "executing_tools" | "completing") => p.emit({ type: "turn_phase", turnId: p.turnId, agent: role, phase: ph });
  const done = (stopReason: TurnStopReason, error?: ProviderErrorInfo): TurnResult => {
    if (stopReason !== "interrupted") phase("completing");
    return { text, messages, appended, grounded: [...grounded], usage, stopReason, ...(error ? { error } : {}), toolCalls, rounds };
  };
  const toolSpecs = p.tools.map(toToolSpec);

  for (;;) {
    if (p.signal?.aborted) return done("interrupted");
    phase("awaiting_model");
    const request: ChatRequest = {
      model: p.request?.model ?? p.provider.model,
      system: p.system,
      messages: [...messages],
      ...(toolSpecs.length > 0 ? { tools: toolSpecs } : {}),
      ...(p.request?.maxTokens !== undefined ? { maxTokens: p.request.maxTokens } : {}),
      ...(p.request?.temperature !== undefined ? { temperature: p.request.temperature } : {}),
      ...(p.request?.effort !== undefined ? { effort: p.request.effort } : {}),
      ...(p.request?.responseFormat !== undefined ? { responseFormat: p.request.responseFormat } : {}),
      ...(p.request?.conversationId !== undefined ? { conversationId: p.request.conversationId } : {}),
      ...(p.request?.metadata !== undefined ? { metadata: p.request.metadata } : {}),
    };
    const step = await streamStep(provider, request, {
      ...(p.signal ? { signal: p.signal } : {}),
      onFirstContent: () => phase("streaming"),
      onTextDelta: (delta) => {
        if (p.streamText !== false) p.emit({ type: "agent_message_delta", turnId: p.turnId, agent: role, delta });
      },
    });
    addUsage(usage, step.usage);
    if (step.usage.inputTokens > 0 || step.usage.outputTokens > 0) p.onUsage?.(step.usage);
    if (step.aborted) return done("interrupted");
    if (step.error) return done("error", step.error);

    let calls = step.toolCalls;
    let raw = step.raw;
    if (step.stopReason === "max_tokens" && calls.length > 0) {
      calls = [];
      raw = undefined; // the echoed blocks would contain unpaired tool_use blocks
    }
    const content: ChatPart[] = [];
    if (step.text) content.push({ type: "text", text: step.text });
    for (const c of calls) content.push({ type: "tool_call", id: c.id, name: c.name, args: c.args });
    if (raw !== undefined && raw !== null) content.push({ type: "provider_raw", provider: p.provider.wire, data: raw });
    if (content.length > 0) push({ role: "assistant", content });
    if (step.reasoning.trim()) p.emit({ type: "agent_reasoning", turnId: p.turnId, agent: role, text: step.reasoning });
    if (step.text.trim()) {
      text = step.text;
      p.onAssistantText?.(step.text);
    }

    if (step.stopReason === "refusal") {
      p.emit({ type: "warning", message: rt(L, "warning.refusal", { agent: role }) });
      return done("refusal");
    }
    if (calls.length === 0) {
      if (step.stopReason === "pause_turn" && pauses < MAX_PAUSE_CONTINUATIONS) {
        pauses++;
        continue;
      }
      if (step.stopReason === "max_tokens") {
        p.emit({ type: "warning", message: rt(L, "warning.maxTokens", { agent: role }) });
        return done("max_tokens");
      }
      if (p.host.runHooks && stopContinuations < maxStop && !p.signal?.aborted) {
        const stop = await p.host.runHooks({ hook_event_name: "Stop", agent: role, last_message: text || null, stop_hook_active: stopContinuations > 0 });
        emitHookWarnings(p.emit, stop);
        if (stop.blocked) {
          stopContinuations++;
          push({ role: "user", content: [{ type: "text", text: rt(L, "loop.stopHook", { reason: stop.reason ?? "" }) }] });
          continue;
        }
      }
      return done("end_turn");
    }

    if (rounds >= p.maxToolRounds) {
      push({ role: "user", content: calls.map((c) => ({ type: "tool_result" as const, callId: c.id, content: rt(L, "tool.maxRounds"), isError: true })) });
      return done("max_tool_rounds");
    }
    rounds++;
    phase("executing_tools");
    const executed = await executeToolCalls(
      { host: p.host, agent: role, tools: p.tools, ctx, emit: p.emit, turnId: p.turnId, ...(p.signal ? { signal: p.signal } : {}), ...(p.now ? { now: p.now } : {}) },
      calls,
    );
    toolCalls += calls.length;
    push({ role: "user", content: executed.results });
    for (const id of executed.grounded) grounded.add(id);
    if (executed.stop) return done(executed.stop);
  }
}

/* ------------------------------------------------------------------ */
/* Single completion (structured replies)                              */
/* ------------------------------------------------------------------ */

export interface CompleteTextParams {
  provider: LLMProvider;
  request: ChatRequest;
  agent: AgentRole;
  emit?: (msg: EventMsg) => void;
  signal?: AbortSignal;
  retry?: RetryPolicy | false;
  onUsage?: (usage: TokenUsage) => void;
}

export interface CompleteTextResult {
  text: string;
  usage: TokenUsage;
  stopReason: StepResult["stopReason"];
  error: ProviderErrorInfo | null;
  aborted: boolean;
}

/**
 * One model call without tools, collecting the text (patient voice, fact
 * re-rank, examiner verdicts). Retries like the loop. Never throws.
 */
export async function completeText(p: CompleteTextParams): Promise<CompleteTextResult> {
  const provider =
    p.retry === false
      ? p.provider
      : withRetry(p.provider, {
          ...(p.retry ?? {}),
          onRetry: (attempt, delayMs, error) => {
            p.emit?.({ type: "api_retry", agent: p.agent, attempt, delayMs, error: error.message });
            if (p.retry) p.retry.onRetry?.(attempt, delayMs, error);
          },
        });
  const step = await streamStep(provider, p.request, p.signal ? { signal: p.signal } : {});
  if (step.usage.inputTokens > 0 || step.usage.outputTokens > 0) p.onUsage?.(step.usage);
  return { text: step.text, usage: step.usage, stopReason: step.stopReason, error: step.error, aborted: step.aborted };
}

/**
 * Extract the first JSON object from model text (tolerates code fences and
 * surrounding prose). Returns null when none parses.
 */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(s) as unknown;
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(trimmed);
  if (direct) return direct;
  const start = trimmed.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return tryParse(trimmed.slice(start, i + 1));
    }
  }
  return null;
}
