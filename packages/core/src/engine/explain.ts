/**
 * What a condition still needs (docs/PROTOCOL.md §3.1): the condition's tree with each node marked met or not,
 * so a front-end or a tool can name the specific unmet requirement ("Induction is recorded. The Time Out is still
 * pending.") instead of a bare "locked". Pure: it only calls `evaluate`.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { Condition } from "../schema/common.js";
import type { SessionState } from "../schema/session.js";
import { evaluate } from "./conditions.js";

/** One node of an explained condition. Leaves carry the condition itself; `all`/`any`/`not` carry their children. */
export type Requirement =
  | { kind: "all" | "any"; met: boolean; children: Requirement[] }
  | { kind: "not"; met: boolean; child: Requirement; cond: Condition }
  | { kind: "leaf"; met: boolean; cond: Condition };

/** The condition as a tree of requirements, each marked met or not at this state. */
export function explainCondition(c: CaseDefinition, s: SessionState, cond: Condition): Requirement {
  if ("all" in cond) {
    const children = cond.all.map((x) => explainCondition(c, s, x));
    return { kind: "all", met: children.every((x) => x.met), children };
  }
  if ("any" in cond) {
    const children = cond.any.map((x) => explainCondition(c, s, x));
    return { kind: "any", met: children.some((x) => x.met), children };
  }
  if ("not" in cond) return { kind: "not", met: !evaluate(c, s, cond.not), child: explainCondition(c, s, cond.not), cond };
  return { kind: "leaf", met: evaluate(c, s, cond), cond };
}

/**
 * The leaves of a requirement in document order, flattened through `all` (an `any` and a `not` stay whole: the
 * caller words them as one alternative or one prohibition). `met` is each leaf's own state.
 */
export function requirementLeaves(r: Requirement): Requirement[] {
  if (r.kind === "all") return r.children.flatMap(requirementLeaves);
  return [r];
}
