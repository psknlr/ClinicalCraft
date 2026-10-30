/**
 * Learner clinical actions ↔ the input of their equivalent tool
 * (docs/PROTOCOL.md §6): a `clinical_action` goes through PreToolUse hooks and
 * the approval gate as that tool's input (`actionToolArgs`), and a hook's
 * `updatedInput` comes back as an action (`actionFromToolInput`), resolved the
 * same way the tool itself resolves ids and free-text queries. An answer's
 * options travel as their letters, as `answer_decision` reads them
 * (`tools/option-labels.ts`), and come back through the tool's own reading
 * (`answeredDecision`, `answeredOptions`). An answer naming an id its case
 * lacks never gets that far (`answerActionRefusal`).
 */
import { historyTwin, matchHistory, t, type CaseDefinition, type ClinicalAction, type LocalizedText, type SessionState } from "@clinicalcraft/core";
import {
  answeredDecision,
  answeredOptions,
  lockedDecisionRefusal,
  noSuchDecisionText,
  resolveFinding,
  resolveHits,
  resolveIntervention,
  resolveInvestigation,
  strArg,
  unknownOptionsText,
  unresolvedOutput,
  type Resolution,
} from "../tools/clinical.js";
import { decisionRefFor } from "../tools/decision-refs.js";
import { interventionLabel, investigationName } from "../tools/format.js";
import { optionLabelsFor } from "../tools/option-labels.js";

/** Tool arguments equivalent to a learner clinical action (for hooks and the approval gate). */
export function actionToolArgs(c: CaseDefinition, action: ClinicalAction, locale: string): Record<string, unknown> {
  switch (action.type) {
    case "ask": {
      const h = c.history.find((x) => x.id === action.itemId);
      return { question: h ? t(h.question, locale) : action.itemId };
    }
    case "examine":
      return { finding_id: action.findingId };
    case "order":
      return { investigation_id: action.investigationId };
    case "read":
      return { investigation_id: action.investigationId, ...(action.phase ? { phase: action.phase } : {}) };
    case "intervene":
      return { intervention_id: action.interventionId };
    case "answer": {
      // The letters `answer_decision` reads (a one-letter authored id would read as a letter); the decision by its id
      // (`decisionRefFor`: its number when the id would read as another decision's number).
      const d = c.decisions.find((x) => x.id === action.decisionId);
      return { decision_id: decisionRefFor(c, action.decisionId), option_ids: d ? optionLabelsFor(c, d, action.optionIds) : action.optionIds };
    }
    case "set-phase":
      return { phase: action.phase };
    case "advance-time":
      return { minutes: action.minutes };
    case "finish":
    case "start":
    case "hint":
    case "flag":
    case "note":
      return {};
    default: {
      const never: never = action;
      return never;
    }
  }
}

/**
 * Why a learner's `answer` action cannot go to the hooks and the gate, or null. The engine reads an action's ids as
 * they are, never as a letter or a number ("1", "b"), while `answer_decision` — whose input the hooks and the gate see
 * (`actionToolArgs`) — reads letters and numbers first: an action whose decision id is none of the case's, or whose
 * option ids include one its decision lacks, would have the learner approve an answer that is never sent. It is
 * refused with the decisions' numbers, or with the unknown ids and every option by letter — a decision still locked
 * (`state`) only with what it needs, never its options. Never names an authored id.
 */
export function answerActionRefusal(c: CaseDefinition, action: Extract<ClinicalAction, { type: "answer" }>, locale: string, state?: SessionState): string | null {
  const decision = c.decisions.find((d) => d.id === action.decisionId);
  if (!decision) return noSuchDecisionText(c, action.decisionId, locale);
  const unknown = [...new Set(action.optionIds.filter((id) => !decision.options.some((o) => o.id === id)))];
  if (unknown.length === 0) return null;
  const locked = state ? lockedDecisionRefusal({ caseDef: c, locale, state: () => state }, decision) : null;
  return locked ? locked.output : unknownOptionsText(c, decision, unknown, locale);
}

/** An action rebuilt from tool input, or why the input names no single case item. */
export type ActionFromInput = { ok: true; action: ClinicalAction } | { ok: false; detail: string };

function texts(text: LocalizedText): string[] {
  return typeof text === "string" ? [text] : Object.values(text);
}

/** `ask_patient {question}` → one history item: its id, its canonical question (any locale), else the history matcher. */
function resolveQuestion(c: CaseDefinition, question: string, locale: string, phase?: string): Resolution {
  const q = question.trim().toLowerCase();
  if (!q) return { kind: "missing" };
  const exact = c.history.find((h) => h.id.toLowerCase() === q || texts(h.question).some((x) => x.trim().toLowerCase() === q));
  // A canonical question of an item superseded in this phase asks its phase twin (`supersedes`).
  if (exact) return { kind: "id", id: (phase ? historyTwin(c, exact.id, phase) : null) ?? exact.id };
  return resolveHits(matchHistory(c, question, locale, phase ? { phase } : {}), question);
}

/** Same JSON value (tool input compared with the input `actionToolArgs` gave). */
function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The learner action equivalent to (PreToolUse-updated, schema-validated)
 * tool input — the inverse of `actionToolArgs`. The action keeps its other
 * fields (`by`, `via`); ids and queries resolve as the tool resolves them, and
 * input that does not name exactly one case item is refused with `detail`
 * (the session refuses it with `invalid_action` before any approval is asked).
 * `at` — the session's state, or only its current phase — narrows free-text
 * history/exam queries to items of that phase, as the tools do; with the
 * state, an answer naming a decision that is still locked is refused with
 * what it needs, never its options (as `answer_decision` refuses it).
 */
export function actionFromToolInput(c: CaseDefinition, action: ClinicalAction, input: Record<string, unknown>, locale: string, at?: string | SessionState): ActionFromInput {
  const L = locale;
  const state = typeof at === "string" ? undefined : at;
  const phase = typeof at === "string" ? at : at?.phase;
  const refuse = (r: Exclude<Resolution, { kind: "id" }>, label: (id: string) => string, keys: [string, string]): ActionFromInput => ({ ok: false, detail: unresolvedOutput(L, r, label, keys).output });
  switch (action.type) {
    case "ask": {
      const r = resolveQuestion(c, strArg(input, "question"), L, phase);
      if (r.kind !== "id") return refuse(r, (id) => t(c.history.find((h) => h.id === id)?.question ?? id, L), ["question", "question"]);
      return { ok: true, action: { ...action, itemId: r.id } };
    }
    case "examine": {
      const r = resolveFinding(c, input, L, phase);
      if (r.kind !== "id") return refuse(r, (id) => t(c.exam.find((e) => e.id === id)?.maneuver ?? id, L), ["finding_id", "query"]);
      return { ok: true, action: { ...action, findingId: r.id } };
    }
    case "order": {
      const r = resolveInvestigation(c, input, L);
      if (r.kind !== "id") return refuse(r, (id) => investigationName(c, id, L), ["investigation_id", "query"]);
      return { ok: true, action: { ...action, investigationId: r.id } };
    }
    case "read": {
      const r = resolveInvestigation(c, input, L);
      if (r.kind !== "id") return refuse(r, (id) => investigationName(c, id, L), ["investigation_id", "query"]);
      const { phase: _previous, ...rest } = action;
      const phase = strArg(input, "phase");
      return { ok: true, action: { ...rest, investigationId: r.id, ...(phase ? { phase } : {}) } };
    }
    case "intervene": {
      const r = resolveIntervention(c, input, L);
      if (r.kind !== "id") return refuse(r, (id) => interventionLabel(c, id, L), ["intervention_id", "query"]);
      return { ok: true, action: { ...action, interventionId: r.id } };
    }
    case "answer": {
      // Input the hook left as `actionToolArgs` gave it keeps the action's own ids: they never pass through letters,
      // so an id the decision lacks stays one the engine refuses (never read as a letter or a number) — the session
      // refuses such an action before the hooks (`answerActionRefusal`).
      const asGiven = actionToolArgs(c, action, L);
      if (sameValue(input.decision_id, asGiven.decision_id) && sameValue(input.option_ids, asGiven.option_ids)) return { ok: true, action };
      // Changed input reads as `answer_decision` reads it: the decision by number or id, the options by letter, number
      // or id (one tokenizer: "A, C" is two; each option once). Anything that names no decision, or an option the
      // decision lacks, is refused with the decisions' numbers or every option by letter — a locked decision only
      // with what it still needs.
      const named = answeredDecision(c, strArg(input, "decision_id"), L);
      if (!named.ok) return { ok: false, detail: named.output };
      const locked = state ? lockedDecisionRefusal({ caseDef: c, locale: L, state: () => state }, named.decision) : null;
      if (locked) return { ok: false, detail: locked.output };
      const options = answeredOptions(c, named.decision, input.option_ids, L);
      if (!options.ok) return { ok: false, detail: options.output };
      return { ok: true, action: { ...action, decisionId: named.decision.id, optionIds: options.chosen.map((o) => o.option.id) } };
    }
    case "set-phase":
      return { ok: true, action: { ...action, phase: strArg(input, "phase") } };
    case "advance-time":
      return { ok: true, action: { ...action, minutes: Number(input.minutes) } };
    case "finish":
    case "start":
    case "hint":
    case "flag":
    case "note":
      return { ok: true, action };
    default: {
      const never: never = action;
      return never;
    }
  }
}
