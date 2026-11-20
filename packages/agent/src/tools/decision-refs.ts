/**
 * Decisions as every learner-facing surface names them (docs/PROTOCOL.md §3): by their number in case order —
 * "Decision 2" / "决策 2", the number a locked decision is shown under (`lockedDecisionLabel`) — never by their
 * authored ids, which can name the diagnosis or the answer ("carney", "phosphate-wasting", "lv-unloading",
 * "coagulopathy"). `list_options(decisions)`, `case_status`, `/board`, the web case board and the MCP resources
 * show the numbers; `answer_decision`'s `decision_id` and `/answer` read them back (`resolveDecisionRef`).
 *
 * A reference names a decision by
 *   - its number in case order: "2", "D2", "#2", "Decision 2", "决策2" / "决策 2" (any case; full-width digits and
 *     one pair of brackets too: "[2]", "（２）"),
 *   - else its exact authored id (callers that predate the numbers; no listing shows ids), else that id in
 *     another case when only one decision has it.
 * A number in range is always the decision of that number, also where an authored id is spelt the same: callers
 * that hold authored ids pass `decisionRefFor` (the id, or the number when the id would read as another one).
 */
import type { CaseDefinition } from "@clinicalcraft/core";
import { tokenText } from "./option-labels.js";

/** The 1-based number of a decision in case order (`c.decisions`); 0 when the case has no decision with that id. */
export function decisionNumber(c: Pick<CaseDefinition, "decisions">, decisionId: string): number {
  return c.decisions.findIndex((d) => d.id === decisionId) + 1;
}

/** "2", "D2", "#2", "Decision 2", "决策 2" (after `tokenText`). */
const NUMBERED_REF = /^(?:#|d|decision|决策)?\s*(\d+)$/iu;

/** The decision a reference names (its number, else its exact id — see the module docs), or undefined. */
export function resolveDecisionRef<D extends { id: string }>(decisions: readonly D[], ref: string): D | undefined {
  const numbered = NUMBERED_REF.exec(tokenText(ref));
  if (numbered) {
    const n = Number(numbered[1]);
    if (n >= 1 && n <= decisions.length) return decisions[n - 1];
  }
  const id = ref.trim();
  if (!id) return undefined;
  const exact = decisions.find((d) => d.id === id);
  if (exact) return exact;
  const folded = decisions.filter((d) => d.id.toLowerCase() === id.toLowerCase());
  return folded.length === 1 ? folded[0] : undefined;
}

/**
 * The `decision_id` a caller holding an authored id passes (the reference walkthrough, a learner action's tool
 * input): the id itself, or the decision's number when the id would read as another decision's number (an id
 * such as "2" or "d1"). An id the case lacks is kept as it is.
 */
export function decisionRefFor(c: Pick<CaseDefinition, "decisions">, decisionId: string): string {
  const n = decisionNumber(c, decisionId);
  if (n === 0) return decisionId;
  return resolveDecisionRef(c.decisions, decisionId)?.id === decisionId ? decisionId : String(n);
}
