/**
 * Facts that follow the record (case `branches`; docs/CASE_AUTHORING.md §3.1).
 *
 * A history answer, an examination finding or a result may carry authored **branches**: the same question, the same
 * manoeuvre, the same record — a different truth when the record of the encounter is a certain way (he was needled or
 * he deferred it; this version of the prescription was supplied or that one). The first branch whose `when` holds on
 * the session answers; none holds: the item's own text.
 *
 * What is true now and what the learner was told are kept apart:
 * - `historyBranch` / `examBranch` / `resultBranch` — the branch that holds **now** (the reducer records it as the
 *   item is asked, examined or read: `SessionState.told`);
 * - `toldHistory` / `toldFinding` / `toldResult` — the fact **as it was obtained**: the recorded branch for an item
 *   already obtained, else the one that holds now (a preview for readers that may see it: prompts, facilitator views).
 *
 * Every reader of an answer, a finding or a result's content goes through these, so the patient, the tools, the
 * chart and the transcript agree by construction. Pure.
 */
import type { CaseDefinition, ExamFinding, HistoryItem, Result } from "../schema/case.js";
import type { Condition } from "../schema/common.js";
import type { LocalizedText } from "../i18n.js";
import type { SessionState } from "../schema/session.js";
import { evaluate, resultFor, resultKey } from "./conditions.js";

/** Fact keys of `SessionState.told`. */
export const toldKey = {
  history: (id: string) => `history:${id}`,
  exam: (id: string) => `exam:${id}`,
  result: (investigationId: string, phase: string) => `result:${resultKey(investigationId, phase)}`,
};

/** The first branch whose `when` holds on the session (declaration order), or null. */
function holding<B extends { id: string; when: Condition }>(c: CaseDefinition, s: SessionState, branches: readonly B[] | undefined): B | null {
  return branches?.find((b) => evaluate(c, s, b.when)) ?? null;
}

/** The branch recorded for a fact key: its id, `""` for the item's own text, or undefined when it was never obtained. */
function recorded(s: SessionState, key: string): string | undefined {
  return s.told && Object.prototype.hasOwnProperty.call(s.told, key) ? s.told[key] : undefined;
}

/** The branch of a history item that holds now (null: its own answer, or the item has no branches). */
export function historyBranch(c: CaseDefinition, s: SessionState, item: HistoryItem): string | null {
  return holding(c, s, item.branches)?.id ?? null;
}

/** The branch of an examination finding that holds now (null: its own finding). */
export function examBranch(c: CaseDefinition, s: SessionState, finding: ExamFinding): string | null {
  return holding(c, s, finding.branches)?.id ?? null;
}

/** The branch of a result that holds now (null: the result's own fields, or no record for that phase). */
export function resultBranch(c: CaseDefinition, s: SessionState, investigationId: string, phase: string): string | null {
  return holding(c, s, resultFor(c, investigationId, phase)?.branches)?.id ?? null;
}

/** A history answer as it is told: the text, and the branch it comes from (null: the item's own). */
export interface ToldAnswer {
  answer: LocalizedText;
  branch: string | null;
}

/** A history item's answer as it would be given **now**: the first branch that holds on this state, else its own. */
export function currentHistory(c: CaseDefinition, s: SessionState, item: HistoryItem): ToldAnswer {
  const branch = holding(c, s, item.branches);
  return branch ? { answer: branch.answer, branch: branch.id } : { answer: item.answer, branch: null };
}

/**
 * A history item's answer as the learner was told it — the branch recorded when it was last asked — or, for an item
 * not asked yet, the one that holds now.
 */
export function toldHistory(c: CaseDefinition, s: SessionState, item: HistoryItem): ToldAnswer {
  if (!item.branches?.length) return { answer: item.answer, branch: null };
  const heard = recorded(s, toldKey.history(item.id));
  const branch = heard === undefined ? holding(c, s, item.branches) : (item.branches.find((b) => b.id === heard) ?? null);
  return branch ? { answer: branch.answer, branch: branch.id } : { answer: item.answer, branch: null };
}

/** An examination finding as it is found: text, abnormality, media, and the branch (null: the item's own). */
export interface ToldFinding {
  finding: LocalizedText;
  abnormal: boolean;
  media: string | null;
  branch: string | null;
}

/** An examination finding as the learner found it (the recorded branch), or as it would be found now. */
export function toldFinding(c: CaseDefinition, s: SessionState, item: ExamFinding): ToldFinding {
  const own: ToldFinding = { finding: item.finding, abnormal: item.abnormal, media: item.media ?? null, branch: null };
  if (!item.branches?.length) return own;
  const heard = recorded(s, toldKey.exam(item.id));
  const branch = heard === undefined ? holding(c, s, item.branches) : (item.branches.find((b) => b.id === heard) ?? null);
  return branch ? { finding: branch.finding, abnormal: branch.abnormal ?? item.abnormal, media: branch.media ?? item.media ?? null, branch: branch.id } : own;
}

/**
 * A result as the learner read it (the recorded branch laid over the result's own fields), or as it would read now;
 * null when the case has no record for that phase. The returned result carries no `branches`.
 */
export function toldResult(c: CaseDefinition, s: SessionState, investigationId: string, phase: string): { result: Result; branch: string | null } | null {
  const own = resultFor(c, investigationId, phase);
  if (!own) return null;
  if (!own.branches?.length) return { result: own, branch: null };
  const { branches, ...base } = own;
  const heard = recorded(s, toldKey.result(investigationId, phase));
  const branch = heard === undefined ? holding(c, s, branches) : (branches.find((b) => b.id === heard) ?? null);
  if (!branch) return { result: base, branch: null };
  return {
    result: {
      ...base,
      ...(branch.date != null ? { date: branch.date } : {}),
      ...(branch.text != null ? { text: branch.text } : {}),
      ...(branch.values != null ? { values: branch.values } : {}),
      ...(branch.figures != null ? { figures: branch.figures } : {}),
      ...(branch.note != null ? { note: branch.note } : {}),
      ...(branch.source != null ? { source: branch.source } : {}),
    },
    branch: branch.id,
  };
}

/** Every text a history item can answer with (its own answer and each branch's): what a grounding check must know. */
export function historyAnswers(item: HistoryItem): LocalizedText[] {
  return [item.answer, ...(item.branches ?? []).map((b) => b.answer)];
}

/** Every text an examination finding can show (its own and each branch's). */
export function examFindings(item: ExamFinding): LocalizedText[] {
  return [item.finding, ...(item.branches ?? []).map((b) => b.finding)];
}
