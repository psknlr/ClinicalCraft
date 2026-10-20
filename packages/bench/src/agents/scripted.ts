/**
 * The `scripted-llm` agent — harness validation. A mock provider replays the
 * scenario's scripted tool-call plan, one call per model response, and then
 * a final text; everything else is real: the session's LLM loop, tool
 * schemas and validation, hooks, the spatial and approval gates, the world,
 * the engine, the tool results flowing back into the next request. It
 * proves the plumbing, never reasoning: the plan is the known solution.
 *
 * Token usage is synthetic (⌈characters ÷ 4⌉ of each request and response),
 * so budget accounting is exercised; reports label it as an estimate.
 */
import { DEFAULT_CAPABILITIES, type ChatRequest, type LLMProvider, type ModelCapabilities, type ProviderConfig, type StreamEvent } from "@clinicalcraft/agent";
import { t } from "@clinicalcraft/core";
import { bm } from "../i18n.js";
import type { BenchScenario, ScriptedCall } from "../schema.js";
import type { AgentWiring } from "../session.js";
import { driveModel } from "./model.js";
import { tapProvider, type BenchAgent, type BenchAgentContext, type ProviderTap } from "./types.js";

/** Provider id of the scripted plans (resolved by the bench session only). */
export const SCRIPTED_PROVIDER_ID = "bench-scripted";
export const SCRIPTED_MODEL = "scripted-plan";

/** ⌈characters ÷ 4⌉ — the synthetic token estimate of the scripted provider. */
export function estimateTokens(value: unknown): number {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? "";
  return Math.ceil(text.length / 4);
}

/**
 * Replays a fixed plan: response k carries plan call k (id `call-<k>`);
 * after the plan, one final text (end of turn). Further requests (a model
 * asked to continue after it finished) answer with the final text again.
 */
export class PlanProvider implements LLMProvider {
  readonly id = SCRIPTED_PROVIDER_ID;
  readonly wire = "openai-chat-completions" as const;
  readonly model = SCRIPTED_MODEL;
  private cursor = 0;
  /** Requests received (for tests). */
  readonly requests: ChatRequest[] = [];

  constructor(
    private readonly plan: readonly ScriptedCall[],
    private readonly finalText: string,
  ) {}

  capabilities(): ModelCapabilities {
    return { ...DEFAULT_CAPABILITIES, supportsTools: true, vision: false, supportsImages: false };
  }

  /** Plan calls not yet issued. */
  get remaining(): number {
    return this.plan.length - this.cursor;
  }

  async *stream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    this.requests.push(request);
    const inputTokens = estimateTokens(request.system.map((s) => s.text).join("\n")) + estimateTokens(request.messages) + estimateTokens(request.tools ?? []);
    if (signal?.aborted) {
      yield { type: "error", error: { message: "aborted", kind: "unknown", retryable: false } };
      return;
    }
    yield { type: "start", model: this.model };
    const call = this.plan[this.cursor];
    if (call) {
      this.cursor++;
      const id = `call-${this.cursor}`;
      const args = call.args ?? {};
      yield { type: "tool_call_start", id, name: call.tool, index: 0 };
      yield { type: "tool_call_delta", id, index: 0, argsDelta: JSON.stringify(args) };
      yield { type: "tool_call", id, name: call.tool, args, index: 0 };
      yield { type: "finish", stopReason: "tool_use", usage: { inputTokens, outputTokens: estimateTokens({ name: call.tool, args }) } };
      return;
    }
    yield { type: "text_delta", text: this.finalText };
    yield { type: "finish", stopReason: "end_turn", usage: { inputTokens, outputTokens: estimateTokens(this.finalText) } };
  }
}

export interface ScriptedAgentOptions {
  /** The plan of a scenario (default: its `scripted.plan`). */
  planFor?: (scenario: BenchScenario) => readonly ScriptedCall[];
  /** The final text (default: the scenario's `scripted.final`, else "Done."). */
  finalFor?: (scenario: BenchScenario, locale: string) => string;
  /** Agent kind label (tests use other kinds for deliberately broken agents). */
  kind?: string;
}

/** The scripted-llm agent (see the module docs). */
export function createScriptedAgent(options: ScriptedAgentOptions = {}): BenchAgent {
  const planFor = options.planFor ?? ((s: BenchScenario) => s.scripted.plan);
  const finalFor = options.finalFor ?? ((s: BenchScenario, locale: string) => (s.scripted.final ? t(s.scripted.final, locale) : bm(locale, "task.final")));
  return {
    kind: options.kind ?? "scripted-llm",
    provider: SCRIPTED_PROVIDER_ID,
    model: SCRIPTED_MODEL,
    syntheticTokens: true,
    wiring(scenario: BenchScenario, tap: ProviderTap): AgentWiring {
      const provider = tapProvider(new PlanProvider(planFor(scenario), finalFor(scenario, scenario.locale)), tap);
      return {
        clinician: { provider: SCRIPTED_PROVIDER_ID, model: SCRIPTED_MODEL, maxToolRounds: 100 },
        resolveProvider: (id: string, model: string | null): ProviderConfig => ({ id, wire: "openai-chat-completions", model: model ?? SCRIPTED_MODEL, apiKey: "scripted" }),
        providerFactory: () => provider,
        retry: false,
      };
    },
    run: (ctx: BenchAgentContext) => driveModel(ctx),
  };
}
