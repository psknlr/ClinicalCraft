/**
 * Condition DSL evaluation (`schema/common.ts` → `Condition`).
 *
 * Conditions are pure predicates over (case, session state). `vital`
 * conditions read the noise-free, display-rounded value at the session clock
 * (see signal.ts), so they never flicker with monitor jitter — and they read
 * the patient, not the bedside: an unattached monitor or an unread glucose
 * does not change them.
 */
import type { CaseDefinition, Result } from "../schema/case.js";
import type { Condition } from "../schema/common.js";
import type { OrderRecord, SessionState } from "../schema/session.js";
import { vitalValue } from "./signal.js";
import { historyCredited } from "./twins.js";

/** Composite key of a result: `${investigationId}@${phase}`. */
export function resultKey(investigationId: string, phase: string): string {
  return `${investigationId}@${phase}`;
}

/** Split a result key back into its parts (ids cannot contain "@"). */
export function parseResultKey(key: string): { investigationId: string; phase: string } {
  const at = key.lastIndexOf("@");
  return at < 0 ? { investigationId: key, phase: "" } : { investigationId: key.slice(0, at), phase: key.slice(at + 1) };
}

/**
 * The case result for an investigation in a phase, or `null` when the case
 * has no record for that phase (a result with `available: false` is returned:
 * its text explains the absence).
 */
export function resultFor(c: CaseDefinition, investigationId: string, phase: string): Result | null {
  const investigation = c.investigations.find((i) => i.id === investigationId);
  if (!investigation) return null;
  return Object.prototype.hasOwnProperty.call(investigation.results, phase) ? investigation.results[phase] : null;
}

/** True when the order's result can be read: static clock, or turnaround elapsed. */
export function isOrderReady(c: CaseDefinition, s: SessionState, order: OrderRecord): boolean {
  return c.clock.mode === "static" || s.clock >= order.readyAt;
}

function inRange(value: number, range: { gte?: number; lte?: number }): boolean {
  return (range.gte == null || value >= range.gte) && (range.lte == null || value <= range.lte);
}

function compare(value: number, op: "lt" | "lte" | "gt" | "gte" | "eq", target: number): boolean {
  switch (op) {
    case "lt":
      return value < target;
    case "lte":
      return value <= target;
    case "gt":
      return value > target;
    case "gte":
      return value >= target;
    case "eq":
      return value === target;
  }
}

function matchesOrder(order: OrderRecord, investigationId: string, phase: string | undefined): boolean {
  return order.investigationId === investigationId && (phase == null || order.phase === phase);
}

function wasRead(s: SessionState, investigationId: string, phase: string | undefined): boolean {
  if (phase != null) return s.seen.includes(resultKey(investigationId, phase));
  return s.seen.some((key) => parseResultKey(key).investigationId === investigationId);
}

function resultReady(c: CaseDefinition, s: SessionState, investigationId: string, phase: string | undefined): boolean {
  return s.orders.some(
    (o) => matchesOrder(o, investigationId, phase) && isOrderReady(c, s, o) && resultFor(c, o.investigationId, o.phase) != null,
  );
}

/**
 * Evaluate a condition against a session.
 *
 * `all: []` is true, `any: []` is false; `read`/`ordered`/`resultReady`
 * without `phase` match any phase. `asked` also holds when an item that
 * supersedes it (`history[].supersedes`, transitively) was asked. `decidedFirstTry` looks only at the first
 * recorded attempt (rejected answers are not attempts).
 */
export function evaluate(c: CaseDefinition, s: SessionState, cond: Condition): boolean {
  if ("all" in cond) return cond.all.every((x) => evaluate(c, s, x));
  if ("any" in cond) return cond.any.some((x) => evaluate(c, s, x));
  if ("not" in cond) return !evaluate(c, s, cond.not);
  if ("always" in cond) return cond.always;
  if ("asked" in cond) return historyCredited(c, s, cond.asked);
  if ("examined" in cond) return s.examined.includes(cond.examined);
  if ("ordered" in cond) return s.orders.some((o) => matchesOrder(o, cond.ordered, cond.phase));
  if ("read" in cond) return wasRead(s, cond.read, cond.phase);
  if ("resultReady" in cond) return resultReady(c, s, cond.resultReady, cond.phase);
  if ("decided" in cond) return Object.prototype.hasOwnProperty.call(s.decisions, cond.decided);
  if ("attempted" in cond) return s.attempts.some((a) => a.decisionId === cond.attempted);
  if ("decidedFirstTry" in cond) return s.attempts.find((a) => a.decisionId === cond.decidedFirstTry)?.correct === true;
  if ("intervened" in cond) {
    const count = s.interventions.filter((r) => r.interventionId === cond.intervened).length;
    return count >= (cond.minCount ?? 1);
  }
  if ("phase" in cond) return s.phase === cond.phase;
  if ("flag" in cond) return s.flags.includes(cond.flag);
  if ("objective" in cond) return Object.prototype.hasOwnProperty.call(s.objectivesDone, cond.objective);
  if ("vital" in cond) {
    const value = vitalValue(c, s, cond.vital);
    return value != null && compare(value, cond.op, cond.value);
  }
  if ("elapsed" in cond) return inRange(s.clock, cond.elapsed);
  if ("hints" in cond) return inRange(s.hints, cond.hints);
  return false;
}

/* ------------------------------------------------------------------ */
/* Static analysis                                                     */
/* ------------------------------------------------------------------ */

/** A leaf reference found inside a condition, with its path relative to the condition root. */
export type ConditionRef =
  | { kind: "history"; id: string; path: (string | number)[] }
  | { kind: "exam"; id: string; path: (string | number)[] }
  | { kind: "investigation"; id: string; phase?: string; requiresRecord: boolean; path: (string | number)[] }
  | { kind: "decision"; id: string; path: (string | number)[] }
  | { kind: "intervention"; id: string; minCount?: number; path: (string | number)[] }
  | { kind: "phase"; id: string; path: (string | number)[] }
  | { kind: "flag"; id: string; path: (string | number)[] }
  | { kind: "objective"; id: string; path: (string | number)[] }
  | { kind: "vital"; id: string; path: (string | number)[] };

/** Collect every id referenced by a condition tree (depth-first, document order). */
export function conditionRefs(cond: Condition, base: (string | number)[] = []): ConditionRef[] {
  const out: ConditionRef[] = [];
  const visit = (node: Condition, path: (string | number)[]) => {
    if ("all" in node) node.all.forEach((x, i) => visit(x, [...path, "all", i]));
    else if ("any" in node) node.any.forEach((x, i) => visit(x, [...path, "any", i]));
    else if ("not" in node) visit(node.not, [...path, "not"]);
    else if ("asked" in node) out.push({ kind: "history", id: node.asked, path: [...path, "asked"] });
    else if ("examined" in node) out.push({ kind: "exam", id: node.examined, path: [...path, "examined"] });
    else if ("ordered" in node) out.push({ kind: "investigation", id: node.ordered, phase: node.phase, requiresRecord: false, path: [...path, "ordered"] });
    else if ("read" in node) out.push({ kind: "investigation", id: node.read, phase: node.phase, requiresRecord: true, path: [...path, "read"] });
    else if ("resultReady" in node)
      out.push({ kind: "investigation", id: node.resultReady, phase: node.phase, requiresRecord: true, path: [...path, "resultReady"] });
    else if ("decided" in node) out.push({ kind: "decision", id: node.decided, path: [...path, "decided"] });
    else if ("attempted" in node) out.push({ kind: "decision", id: node.attempted, path: [...path, "attempted"] });
    else if ("decidedFirstTry" in node) out.push({ kind: "decision", id: node.decidedFirstTry, path: [...path, "decidedFirstTry"] });
    else if ("intervened" in node)
      out.push({ kind: "intervention", id: node.intervened, ...(node.minCount != null ? { minCount: node.minCount } : {}), path: [...path, "intervened"] });
    else if ("phase" in node) out.push({ kind: "phase", id: node.phase, path: [...path, "phase"] });
    else if ("flag" in node) out.push({ kind: "flag", id: node.flag, path: [...path, "flag"] });
    else if ("objective" in node) out.push({ kind: "objective", id: node.objective, path: [...path, "objective"] });
    else if ("vital" in node) out.push({ kind: "vital", id: node.vital, path: [...path, "vital"] });
  };
  visit(cond, base);
  return out;
}
