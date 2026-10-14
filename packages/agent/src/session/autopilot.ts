/**
 * Autopilot: the clinician agent drives the case. With a model it runs
 * clinician turns (goal first, then "continue" with the case status) until the
 * case is finished, the turn budget is spent, the learner aborts, or the model
 * stops acting. Offline it replays `case.solution` one step at a time through
 * the SAME tool path (approval gate, hooks, events) as an LLM clinician.
 */
import type { CaseDefinition, ClinicalAction, SessionState } from "@clinicalcraft/core";
import { clinicianOfflineSteps, stepAlreadySatisfied } from "../agents/offline.js";
import type { ToolCallOutcome, TurnStopReason } from "../loop.js";
import type { EventMsg } from "../protocol.js";
import type { ProviderErrorInfo } from "../providers/types.js";
import { caseStatusText } from "../tools/clinical.js";
import { rt } from "./i18n.js";

/** Outcome of one agent turn as the session reports it. */
export interface AgentOutcome {
  status: TurnStopReason;
  text: string;
  grounded: string[];
  error?: ProviderErrorInfo | { message: string };
  /** Offline clinician: nothing left to do (walkthrough exhausted or case finished). */
  done?: boolean;
  toolCalls?: number;
}

/** Default autopilot turn budget. */
export const DEFAULT_AUTOPILOT_TURNS = 12;

/** What the autopilot needs from the session (bound to one submission). */
export interface AutopilotHost {
  readonly caseDef: CaseDefinition;
  readonly locale: string;
  state(): SessionState;
  newId(): string;
  now(): number;
  emit(msg: EventMsg): void;
  ensureStarted(): void;
  /** True when the clinician has a model (else the offline walkthrough runs). */
  clinicianOnline(): boolean;
  /** Steps per offline turn (the clinician's tool-round budget). */
  clinicianMaxSteps(): number;
  /** One LLM clinician turn with `text` as the user message (no turn_started/finish events). */
  runModelTurn(turnId: string, text: string, signal: AbortSignal): Promise<AgentOutcome>;
  /** Emit turn_complete / turn_aborted for a finished turn. */
  finishTurn(turnId: string, outcome: AgentOutcome, started: number): void;
  /** The clinician says something (agent_message). */
  narrate(turnId: string, text: string): void;
  /** Ungated direct action (start, note, flag, hint). */
  dispatch(action: ClinicalAction): void;
  /** Run one tool call through the full tool path. */
  executeTool(turnId: string, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolCallOutcome>;
  /** Position in the offline walkthrough (persists across autopilot runs). */
  cursor: { value: number };
}

/**
 * Offline clinician: execute up to `maxSteps` reference-walkthrough steps.
 * Steps already satisfied are skipped; denied steps are skipped; an "abort"
 * approval answer stops the turn.
 */
export async function offlineClinicianTurn(host: AutopilotHost, turnId: string, maxSteps: number, signal?: AbortSignal): Promise<AgentOutcome> {
  const steps = clinicianOfflineSteps(host.caseDef, host.locale);
  let executed = 0;
  let last = "";
  host.ensureStarted();
  while (executed < Math.max(1, maxSteps)) {
    if (signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
    if (host.state().finished) return { status: "end_turn", text: last, grounded: [], done: true, toolCalls: executed };
    if (host.cursor.value >= steps.length) {
      last = rt(host.locale, "clinician.narrate.done");
      host.narrate(turnId, last);
      return { status: "end_turn", text: last, grounded: [], done: true, toolCalls: executed };
    }
    const step = steps[host.cursor.value++]!;
    if (stepAlreadySatisfied(step, host.state())) continue;
    if (step.kind === "action") {
      host.dispatch({ ...step.action, by: "agent" } as ClinicalAction);
      continue;
    }
    last = step.narration;
    host.narrate(turnId, step.narration);
    const outcome = await host.executeTool(turnId, step.tool, step.args, signal);
    executed++;
    if (outcome.status === "interrupted" || signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
    if (outcome.status === "cancelled") return { status: "denied", text: last, grounded: [], toolCalls: executed };
  }
  return { status: "end_turn", text: last, grounded: [], done: host.state().finished, toolCalls: executed };
}

/** Run the autopilot loop (one `turn_started` … `turn_complete` per clinician turn). */
export async function runAutopilot(host: AutopilotHost, options: { goal?: string | undefined; maxTurns?: number | undefined; signal: AbortSignal }): Promise<void> {
  const { signal } = options;
  host.ensureStarted();
  const turns = Math.max(1, Math.min(Math.floor(options.maxTurns ?? DEFAULT_AUTOPILOT_TURNS), 500));
  const online = host.clinicianOnline();
  let idleTurns = 0;
  for (let i = 0; i < turns; i++) {
    if (host.state().finished || signal.aborted) break;
    const turnId = host.newId();
    const started = host.now();
    host.emit({ type: "turn_started", turnId, agent: "clinician" });
    let outcome: AgentOutcome;
    if (!online) {
      outcome = await offlineClinicianTurn(host, turnId, host.clinicianMaxSteps(), signal);
    } else {
      const status = caseStatusText({ caseDef: host.caseDef, locale: host.locale, state: () => host.state() }).text;
      const text = i === 0 ? options.goal?.trim() || rt(host.locale, "clinician.goal") : rt(host.locale, "clinician.continue", { status });
      outcome = await host.runModelTurn(turnId, text, signal);
    }
    host.finishTurn(turnId, outcome, started);
    if (outcome.status === "interrupted" || outcome.status === "denied" || outcome.status === "error" || outcome.status === "refusal") break;
    if (outcome.done) break;
    // A model that keeps answering without acting is done (or stuck): stop after two idle turns.
    idleTurns = (outcome.toolCalls ?? 1) === 0 ? idleTurns + 1 : 0;
    if (idleTurns >= 2) break;
  }
}
