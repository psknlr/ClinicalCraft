/**
 * Agents under test. An agent wires itself into a run's session (the
 * provider of the clinician — NPCs stay offline) and then works the task:
 * the reference solver through the session / world APIs, model agents
 * through the real LLM tool path (`user_message` to the clinician).
 */
import type { ChatRequest, ClinicalSession, LLMProvider, ModelCapabilities, StreamEvent, TokenUsage } from "@clinicalcraft/agent";
import type { WorldRuntime } from "@clinicalcraft/world";
import type { RunRecorder } from "../recorder.js";
import type { BenchLimits, BenchScenario } from "../schema.js";
import type { AgentWiring, AnswerStore } from "../session.js";

export type BenchAgentKind = "reference" | "scripted-llm" | "llm";

export interface BenchAgentContext {
  scenario: BenchScenario;
  /** The run seed (`--seeds`). */
  seed: number;
  /** Session language. */
  locale: string;
  session: ClinicalSession;
  world: WorldRuntime;
  recorder: RunRecorder;
  answers: AnswerStore;
  /** Aborted when a limit is hit (wall time, tool calls, simulated minutes, budget). */
  signal: AbortSignal;
  limits: BenchLimits;
}

/** Hooks a model provider reports to (filled in once the run's recorder exists). */
export interface ProviderTap {
  onToolCall?: (callId: string, tool: string) => void;
  onUsage?: (usage: TokenUsage) => void;
}

export interface BenchAgent {
  /** `reference`, `scripted-llm`, `llm` (tests may add their own). */
  readonly kind: string;
  /** Provider and model of the agent under test (null for the reference solver). */
  readonly provider: string | null;
  readonly model: string | null;
  /** True when the token counts the agent reports are estimates, not a provider's usage. */
  readonly syntheticTokens?: boolean;
  /** Session wiring for one run. */
  wiring(scenario: BenchScenario, tap: ProviderTap): AgentWiring;
  /** Work the task. */
  run(ctx: BenchAgentContext): Promise<void>;
}

/**
 * A provider that reports the tool calls the model issues and its usage to
 * the run (`ProviderTap`), forwarding every stream event unchanged.
 */
export function tapProvider(inner: LLMProvider, tap: ProviderTap): LLMProvider {
  return {
    id: inner.id,
    wire: inner.wire,
    model: inner.model,
    capabilities(): ModelCapabilities {
      return inner.capabilities();
    },
    async *stream(request: ChatRequest, signal?: AbortSignal): AsyncIterable<StreamEvent> {
      for await (const event of inner.stream(request, signal)) {
        if (event.type === "tool_call") tap.onToolCall?.(event.id, event.name);
        else if (event.type === "finish") tap.onUsage?.(event.usage);
        yield event;
      }
    },
  };
}
