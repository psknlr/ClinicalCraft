/**
 * Autopilot: the clinician agent drives the case. With a model it runs
 * clinician turns (goal first, then "continue" with the case status) until the
 * case is finished, the turn budget is spent, the learner aborts, or the model
 * stops acting. Offline it replays `case.solution` one step at a time through
 * the SAME tool path (approval gate, hooks, events) as an LLM clinician.
 */
import { progress, type CaseDefinition, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { clinicianOfflineSteps, minutesUntilReadable, stepAlreadySatisfied, stepForAction, type OfflineClinicianStep } from "../agents/offline.js";
import type { ToolCallOutcome, TurnStopReason } from "../loop.js";
import type { EventMsg } from "../protocol.js";
import { actionSpecifier, formatRule } from "../permissions.js";
import type { ProviderErrorInfo } from "../providers/types.js";
import { caseStatusText } from "../tools/clinical.js";
import { joinList, rt } from "./i18n.js";

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

/** Longest single `wait` tool call (its input schema's maximum). */
const MAX_WAIT_MINUTES = 240;

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
  /**
   * Position in the offline walkthrough (persists across autopilot runs) and
   * the tool steps that did not go through (denied, blocked, rejected).
   */
  cursor: { value: number; missed: OfflineClinicianStep[]; extraOps?: number };
  /**
   * The offline clinician's turn, when it is not `offlineClinicianTurn` — embodied mode replays the
   * walkthrough with the body (`embodiedOfflineTurn`).
   */
  offlineTurn?(turnId: string, maxSteps: number, signal?: AbortSignal): Promise<AgentOutcome>;
  /**
   * After each step of the walkthrough: the session's care team takes its turn (docs/TEAM.md §2) — the same path the
   * browser, the learner and external agents drive after their own acts, so a headless run works the assigned team
   * scenario too and never runs ahead of it.
   */
  afterStep?(signal?: AbortSignal): Promise<void>;
}

/**
 * What the offline clinician says when the walkthrough is exhausted: "complete"
 * only when every objective is; otherwise that the case is not complete, with
 * the steps that were denied or blocked and still are not done.
 */
export function walkthroughEndText(c: CaseDefinition, state: SessionState, missed: readonly OfflineClinicianStep[], locale: string): string {
  const prog = progress(c, state);
  if (prog.complete || state.finished) return rt(locale, "clinician.narrate.done");
  const labels = [
    ...new Set(
      missed.flatMap((step) => (step.kind === "tool" && step.tool !== "finish_case" && !stepAlreadySatisfied(step, state) ? [formatRule(step.tool, actionSpecifier(step.action))] : [])),
    ),
  ];
  const list = labels.length > 0 ? rt(locale, "clinician.narrate.missed", { steps: joinList(locale, labels) }) : "";
  return rt(locale, "clinician.narrate.incomplete", { done: prog.done, total: prog.total, missed: list });
}

/**
 * Offline clinician: execute up to `maxSteps` reference-walkthrough steps.
 * Steps already satisfied are skipped; denied steps are skipped (and listed
 * when the walkthrough ends with the case incomplete); an "abort" approval
 * answer stops the turn.
 */
export async function offlineClinicianTurn(host: AutopilotHost, turnId: string, maxSteps: number, signal?: AbortSignal): Promise<AgentOutcome> {
  const steps = clinicianOfflineSteps(host.caseDef, host.locale);
  let executed = 0;
  let last = "";
  /** Cursor positions a re-grasp was tried at (once each: a traction that cannot be set again is not retried). */
  const regrasped = new Set<number>();
  host.ensureStarted();
  while (executed < Math.max(1, maxSteps)) {
    if (signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
    if (host.state().finished) return { status: "end_turn", text: last, grounded: [], done: true, toolCalls: executed };
    if (host.cursor.value >= steps.length) {
      last = walkthroughEndText(host.caseDef, host.state(), host.cursor.missed, host.locale);
      host.narrate(turnId, last);
      return { status: "end_turn", text: last, grounded: [], done: true, toolCalls: executed };
    }
    const step = steps[host.cursor.value]!;
    if (stepAlreadySatisfied(step, host.state(), host.cursor.extraOps)) {
      host.cursor.value++;
      continue;
    }
    if (step.kind === "action") {
      host.cursor.value++;
      host.dispatch({ ...step.action, by: "agent" } as ClinicalAction);
      continue;
    }
    // A wait the timeline needs before this step: the result of a read ordered later than in the
    // reference run (learner actions, resume), or the rest of a reference wait (until its clock;
    // skipped steps cost no time, so a session can be behind the reference timeline).
    const pending =
      step.action.type === "advance-time" && step.refClockAfter !== undefined
        ? step.refClockAfter - host.state().clock
        : step.action.type === "advance-time"
          ? step.action.minutes
          : minutesUntilReadable(host.caseDef, host.state(), step.action);
    let run: OfflineClinicianStep = step;
    if (pending > 0 && (step.action.type !== "advance-time" || pending !== step.action.minutes)) {
      const minutes = Math.min(MAX_WAIT_MINUTES, Math.max(0.01, Math.round(pending * 100) / 100));
      run = stepForAction(host.caseDef, { type: "advance-time", minutes }, host.locale);
    }
    if (run.kind !== "tool") {
      host.cursor.value++;
      continue;
    }
    // A traction the reference run set up — and never let go — has gone (a colleague holding it left the table):
    // re-grasp before the next instrument step, once, and say so; the step itself follows.
    const regrasp = run === step && !regrasped.has(host.cursor.value) ? lostTraction(host.state(), steps, host.cursor.value) : null;
    if (regrasp) {
      regrasped.add(host.cursor.value);
      const again = stepForAction(host.caseDef, regrasp.action, host.locale);
      if (again.kind === "tool") {
        last = rt(host.locale, "clinician.narrate.regrasp", { structure: regrasp.structure });
        host.narrate(turnId, last);
        const stepsBefore = host.state().procedure?.counters.steps ?? 0;
        const outcome = await host.executeTool(turnId, again.tool, again.args, signal);
        executed++;
        // a step the reference does not have: the walkthrough's place in the operation is not moved by it
        if ((host.state().procedure?.counters.steps ?? 0) > stepsBefore) host.cursor.extraOps = (host.cursor.extraOps ?? 0) + 1;
        if (outcome.status === "interrupted" || signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
        if (outcome.status === "cancelled") return { status: "denied", text: last, grounded: [], toolCalls: executed };
        continue;
      }
    }
    const clockBefore = host.state().clock;
    last = run.narration;
    host.narrate(turnId, run.narration);
    const outcome = await host.executeTool(turnId, run.tool, run.args, signal);
    executed++;
    if (outcome.status === "interrupted" || signal?.aborted) return { status: "interrupted", text: last, grounded: [], toolCalls: executed };
    if (outcome.status === "cancelled") return { status: "denied", text: last, grounded: [], toolCalls: executed };
    if (run === step && (outcome.status !== "ok" || !outcome.output.ok)) host.cursor.missed.push(step);
    // An inserted wait leaves the step in place (re-checked next round) unless time could not pass.
    if (run === step || host.state().clock === clockBefore) host.cursor.value++;
  }
  return { status: "end_turn", text: last, grounded: [], done: host.state().finished, toolCalls: executed };
}

/** Operative steps that work with an instrument in a field the traction exposes. */
const INSTRUMENT_STEPS: ReadonlySet<string> = new Set(["dissect", "isolate", "clip", "divide", "coagulate", "identify", "safety-pause"]);

/**
 * The traction to set again before the step at `cursor` (null: none lost): the reference run's last `retract` of a
 * structure before this step, not released by it since, that the field no longer holds.
 */
export function lostTraction(s: SessionState, steps: readonly OfflineClinicianStep[], cursor: number): { action: Extract<ClinicalAction, { type: "operate" }>; structure: string } | null {
  const step = steps[cursor];
  const p = s.procedure;
  if (!p || step?.action.type !== "operate" || !INSTRUMENT_STEPS.has(step.action.op.op) || (p.bailouts ?? []).length) return null;
  const held = new Map<string, Extract<ClinicalAction, { type: "operate" }>>();
  for (const x of steps.slice(0, cursor)) {
    if (x.action.type !== "operate") continue;
    const op = x.action.op as { op: string; structure?: string };
    if (op.op === "retract" && op.structure) held.set(op.structure, x.action as Extract<ClinicalAction, { type: "operate" }>);
    if (op.op === "release" && op.structure) held.delete(op.structure);
  }
  for (const [structure, action] of held) if (!p.retractions[structure]) return { action: { type: "operate", op: structuredClone(action.op) }, structure };
  return null;
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
      outcome = host.offlineTurn ? await host.offlineTurn(turnId, host.clinicianMaxSteps(), signal) : await offlineClinicianTurn(host, turnId, host.clinicianMaxSteps(), signal);
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
