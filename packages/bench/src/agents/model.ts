/**
 * Driving a model agent through a task: the scenario's instruction (plus the
 * answer instruction of answer tasks) is sent to the clinician as a learner
 * message — the real LLM tool path: the model's tool calls run through
 * validation, hooks, the spatial gate, the approval gate and the engine. A
 * turn that ends normally ends the task (the model considers it done); a
 * turn cut off at its tool-round limit is continued, up to `maxTurns`.
 * Limits abort the turn (`interrupt`).
 */
import { t } from "@clinicalcraft/core";
import type { AgentEvent } from "@clinicalcraft/agent";
import { bm } from "../i18n.js";
import { isAnswerTask, type BenchScenario } from "../schema.js";
import type { BenchAgentContext } from "./types.js";

/** The instruction a model receives for a scenario (scenario locale). */
export function taskInstruction(scenario: BenchScenario, locale: string): string {
  const text = t(scenario.instruction, locale).trim();
  return isAnswerTask(scenario) ? `${text}\n\n${bm(locale, "task.answer")}` : text;
}

/** How the clinician's turn in a `run` ended. */
function turnEnd(events: readonly AgentEvent[]): "complete" | "max_tool_rounds" | "stopped" {
  const started = events.find((e) => e.msg.type === "turn_started" && String(e.msg.agent) === "clinician");
  const turnId = started && started.msg.type === "turn_started" ? started.msg.turnId : null;
  for (const e of events) {
    const m = e.msg;
    if (m.type === "turn_complete" && m.turnId === turnId) return "complete";
    if (m.type === "turn_aborted" && m.turnId === turnId) return m.reason === "max_tool_rounds" ? "max_tool_rounds" : "stopped";
  }
  return "stopped";
}

/** Run model turns until the model ends the task, a limit aborts it, or `maxTurns` is spent. */
export async function driveModel(ctx: BenchAgentContext): Promise<void> {
  const { session, scenario, locale } = ctx;
  for (let turn = 0; turn < ctx.limits.maxTurns; turn++) {
    if (ctx.signal.aborted) return;
    const text = turn === 0 ? taskInstruction(scenario, locale) : bm(locale, "task.continue");
    const events = await session.run({ type: "user_message", text, to: "clinician" });
    if (ctx.signal.aborted) return;
    if (turnEnd(events) !== "max_tool_rounds") return;
  }
}
