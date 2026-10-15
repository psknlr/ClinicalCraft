/**
 * Learner clinical actions ↔ the input of their equivalent tool
 * (docs/PROTOCOL.md §6): a `clinical_action` goes through PreToolUse hooks and
 * the approval gate as that tool's input (`actionToolArgs`), and a hook's
 * `updatedInput` comes back as an action (`actionFromToolInput`), resolved the
 * same way the tool itself resolves ids and free-text queries.
 */
import { matchHistory, t, type CaseDefinition, type ClinicalAction, type LocalizedText } from "@clinicalcraft/core";
import { resolveFinding, resolveHits, resolveIntervention, resolveInvestigation, strArg, unresolvedOutput, type Resolution } from "../tools/clinical.js";
import { interventionLabel, investigationName } from "../tools/format.js";

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
    case "answer":
      return { decision_id: action.decisionId, option_ids: action.optionIds };
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
  if (exact) return { kind: "id", id: exact.id };
  return resolveHits(matchHistory(c, question, locale, phase ? { phase } : {}), question);
}

/**
 * The learner action equivalent to (PreToolUse-updated, schema-validated)
 * tool input — the inverse of `actionToolArgs`. The action keeps its other
 * fields (`by`, `via`); ids and queries resolve as the tool resolves them, and
 * input that does not name exactly one case item is refused with `detail`.
 * `phase` (the session's current phase) narrows free-text history/exam
 * queries to items of that phase, as the tools do.
 */
export function actionFromToolInput(c: CaseDefinition, action: ClinicalAction, input: Record<string, unknown>, locale: string, phase?: string): ActionFromInput {
  const L = locale;
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
      const optionIds = Array.isArray(input.option_ids) ? input.option_ids.filter((x): x is string => typeof x === "string") : [];
      return { ok: true, action: { ...action, decisionId: strArg(input, "decision_id"), optionIds } };
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
