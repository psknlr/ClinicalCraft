/**
 * What the case still needs, in words (docs/PROTOCOL.md §3.1): the current objective's requirements met and
 * open, with the next available action for each open one; standing holds; and the way into the operation. One
 * renderer for `case_status`, `intervene` (an operation asked for as an intervention), `observe_field` and
 * `operate` refusals, so every surface names the same unmet requirement.
 *
 * Work-up leaves (history, examination, orders, results) are counted, never named: choosing them is the case.
 */
import {
  activeHolds,
  createProcedureState,
  currentObjective,
  explainCondition,
  procedureFor,
  requirementLeaves,
  t,
  type CaseDefinition,
  type Condition,
  type ProcedurePredicate,
  type Requirement,
  type SessionState,
} from "@clinicalcraft/core";
import { joinList, rt } from "../session/i18n.js";
import { sentence } from "../session/i18n-checklist.js";
import { procedureLabel } from "../session/i18n-procedure.js";
import { interventionLabel, objectiveTitle, phaseLabel } from "./format.js";

/** Leaves that belong to the learner's own work-up: counted, not named. */
const WORKUP: readonly string[] = ["asked", "examined", "ordered", "read", "resultReady", "vital", "elapsed", "hints"];

function isWorkup(cond: Condition): boolean {
  return WORKUP.some((k) => k in cond);
}

/** The procedure step that brings a predicate about, when there is one. */
function procedureStep(p: ProcedurePredicate): string | null {
  if ("closed" in p) return "close";
  if ("specimen" in p) return p.specimen === "extracted" ? "extract" : p.specimen === "bagged" ? "bag" : null;
  if ("bailout" in p) return "bailout";
  if ("documented" in p) return "safety-pause";
  if ("plan" in p) return "plan-ports";
  if ("insufflated" in p) return "insufflate";
  return null;
}

function procedureWords(p: ProcedurePredicate, L: string): string {
  if ("closed" in p) return rt(L, "proc.closed");
  if ("specimen" in p) return rt(L, "proc.specimen", { value: procedureLabel(L, p.specimen) });
  if ("bailout" in p) return rt(L, "proc.bailout", { value: p.bailout });
  if ("documented" in p) return rt(L, "proc.documented", { value: p.documented });
  const [key, value] = Object.entries(p)[0] ?? ["?", ""];
  return rt(L, "proc.generic", { key, value: typeof value === "object" ? JSON.stringify(value) : String(value) });
}

function decisionLabel(c: CaseDefinition, s: SessionState, id: string, L: string): string {
  const d = c.decisions.find((x) => x.id === id);
  const n = c.decisions.findIndex((x) => x.id === id) + 1;
  // a decision's prompt may state results not yet obtained: shown only once it was answered or is unlocked
  return d && Object.prototype.hasOwnProperty.call(s.decisions, id) ? `[${id}] ${t(d.prompt, L)}` : `[${id}] ${rt(L, "label.decisionN", { n })}`;
}

/** One requirement in words (a leaf, or an `any` / `not` kept whole). */
export function requirementText(c: CaseDefinition, s: SessionState, r: Requirement, L: string, visible: ReadonlySet<string>): string {
  if (r.kind === "not") return rt(L, "req.not", { text: requirementText(c, s, r.child, L, visible) });
  if (r.kind !== "leaf") {
    const parts = r.children.map((x) => requirementText(c, s, x, L, visible));
    return r.kind === "any" ? rt(L, "req.any", { items: parts.join(" | ") }) : parts.join(" + ");
  }
  const cond = r.cond;
  if (isWorkup(cond)) return rt(L, "req.workupItem");
  if ("intervened" in cond) {
    const name = interventionLabel(c, cond.intervened, L);
    const invalidSeen = cond.valid === true && !r.met && s.interventions.some((x) => x.interventionId === cond.intervened && x.invalid);
    return rt(L, cond.valid === true ? "req.intervened.valid" : "req.intervened", { name }) + (invalidSeen ? rt(L, "req.intervened.invalidSeen") : "");
  }
  if ("inOrder" in cond) return rt(L, "req.inOrder", { names: cond.inOrder.map((id) => interventionLabel(c, id, L)).join(" → ") });
  if ("held" in cond) return rt(L, "req.held", { name: interventionLabel(c, cond.held, L) });
  if ("decided" in cond) return rt(L, "req.decided", { label: decisionLabel(c, s, cond.decided, L) });
  if ("decidedFirstTry" in cond) return rt(L, "req.decided", { label: decisionLabel(c, s, cond.decidedFirstTry, L) });
  if ("attempted" in cond) return rt(L, "req.decided", { label: decisionLabel(c, s, cond.attempted, L) });
  if ("objective" in cond) return rt(L, "req.objective", { title: objectiveTitle(c, cond.objective, L) });
  if ("phase" in cond && cond.phase) return rt(L, "req.phase", { label: visible.has(cond.phase) ? phaseLabel(c, cond.phase, L) : rt(L, "req.laterPhase") });
  if ("flag" in cond) return rt(L, "req.flag", { flag: cond.flag });
  if ("procedure" in cond) return rt(L, "req.procedure", { what: procedureWords(cond.procedure, L) });
  return rt(L, "req.other", { what: Object.keys(cond)[0] ?? "?" });
}

/** The next available action for an open requirement, or null. */
export function nextAction(c: CaseDefinition, s: SessionState, r: Requirement, L: string): string | null {
  if (r.met) return null;
  if (r.kind === "any") return r.children.map((x) => nextAction(c, s, x, L)).find((x) => x != null) ?? null;
  if (r.kind !== "leaf") return null;
  const cond = r.cond;
  if (isWorkup(cond)) return rt(L, "req.workupItem");
  if ("intervened" in cond) {
    const hold = activeHolds(s, cond.intervened)[0];
    return hold ? rt(L, "next.release", { holder: hold.placedBy }) : rt(L, "next.intervene", { id: cond.intervened });
  }
  if ("inOrder" in cond) {
    const missing = cond.inOrder.find((id: string) => !s.interventions.some((x) => x.interventionId === id && x.appropriateness !== "contraindicated"));
    return missing ? rt(L, "next.intervene", { id: missing }) : null;
  }
  if ("decided" in cond) return rt(L, "next.answer", { id: cond.decided });
  if ("procedure" in cond) {
    const step = procedureStep(cond.procedure);
    return step ? rt(L, "next.operate", { op: step }) : rt(L, "next.observe");
  }
  return null;
}

/**
 * Lines for a condition: each named requirement met (✓) or open (·) with its next action, and the open work-up
 * items as a count. Empty when the condition has no named requirement.
 */
export function requirementLines(c: CaseDefinition, s: SessionState, cond: Condition, L: string, visible: ReadonlySet<string>, opts: { onlyOpen?: boolean } = {}): string[] {
  const leaves = requirementLeaves(explainCondition(c, s, cond));
  const lines: string[] = [];
  let workup = 0;
  for (const r of leaves) {
    if (r.kind === "leaf" && isWorkup(r.cond)) {
      if (!r.met) workup += 1;
      continue;
    }
    if (r.met && opts.onlyOpen) continue;
    lines.push(rt(L, r.met ? "req.met" : "req.open", { text: requirementText(c, s, r, L, visible) }));
    const next = nextAction(c, s, r, L);
    if (next) lines.push(rt(L, "req.next", { action: next }));
  }
  if (workup > 0) lines.push(rt(L, "req.workup", { count: workup }));
  return lines;
}

/** The current objective's requirements (header + lines), or [] when every objective is done. */
export function objectiveRequirementLines(c: CaseDefinition, s: SessionState, L: string, visible: ReadonlySet<string>): string[] {
  const o = currentObjective(c, s);
  if (!o) return [];
  const lines = requirementLines(c, s, o.completeWhen, L, visible);
  return lines.length > 0 ? [rt(L, "req.header", { objective: objectiveTitle(c, o.id, L) }), ...lines] : [];
}

/** Every standing hold, with who placed it, why, and who must release it. */
export function holdLines(c: CaseDefinition, s: SessionState, L: string): string[] {
  const standing = (s.holds ?? []).filter((h) => !h.released);
  if (standing.length === 0) return [];
  return [rt(L, "status.holds"), ...standing.map((h) => rt(L, "status.hold", { name: interventionLabel(c, h.interventionId, L), by: h.placedBy, reason: sentence(h.reason) }))];
}

/** The condition that opens the operation: its first procedure phase's `enterWhen` (null without one). */
function operationOpens(c: CaseDefinition, s: SessionState): Condition | null {
  const def = procedureFor(c, s);
  const first = def?.phases.map((id) => c.phases.find((p) => p.id === id)).find((p) => p?.enterWhen != null);
  return first?.enterWhen ?? null;
}

/** True when the operation is under way (the current phase is one of the procedure's phases). */
export function operationUnderWay(c: CaseDefinition, s: SessionState): boolean {
  return procedureFor(c, s)?.phases.includes(s.phase) === true;
}

/** "ports three-port-left, insufflated, specimen in situ" — the operation's state in a few words. */
function operationState(c: CaseDefinition, s: SessionState, L: string): string {
  const p = s.procedure ?? createProcedureState();
  const parts = [
    p.plan ? rt(L, "op.state.plan", { plan: p.plan }) : rt(L, "op.state.noPlan"),
    p.insufflated ? rt(L, "op.state.insufflated") : "",
    rt(L, "op.state.specimen", { specimen: procedureLabel(L, p.specimen) }),
    ...p.bailouts.map((b) => rt(L, "op.state.bailout", { bailout: b })),
    p.closed ? rt(L, "op.state.closed") : "",
  ].filter(Boolean);
  return joinList(L, parts);
}

/**
 * The operation's status for `case_status`: under way (what to use), done, or not yet (what still opens it,
 * named). [] for a case without a procedure.
 */
export function operationLines(c: CaseDefinition, s: SessionState, L: string, visible: ReadonlySet<string>): string[] {
  if (!procedureFor(c, s)) return [];
  if (operationUnderWay(c, s)) return [rt(L, "status.op.underWay", { state: operationState(c, s, L) })];
  if (s.procedure) return [rt(L, "status.op.done", { state: operationState(c, s, L) })];
  const opens = operationOpens(c, s);
  return [rt(L, "status.op.locked"), ...(opens ? requirementLines(c, s, opens, L, visible) : [])];
}

/** What still opens the operation, as lines (for refusals): [] when it is under way or nothing is named. */
export function operationPrerequisiteLines(c: CaseDefinition, s: SessionState, L: string, visible: ReadonlySet<string>): string[] {
  if (operationUnderWay(c, s)) return [];
  const opens = operationOpens(c, s);
  return opens ? requirementLines(c, s, opens, L, visible, { onlyOpen: true }) : [];
}

const SURGICAL = /(?<![a-z])(?:surgery|surgical|operat(?:e|ion|ing)|\w+ectomy|\w+otomy|\w+ostomy|laparoscop\w*|incision|incise|resect\w*)(?![a-z])|手术|切除|开腹|腹腔镜|切开/i;

/** Distinctive words of the procedure's name in every locale (latin words of 6+ letters; the whole CJK name). */
function procedureWordsOf(c: CaseDefinition, s: SessionState): string[] {
  const def = procedureFor(c, s);
  if (!def) return [];
  const names = typeof def.name === "string" ? [def.name] : Object.values(def.name as Record<string, string>);
  const words = names.flatMap((n) => n.toLowerCase().match(/[a-z]{6,}/g) ?? []);
  const cjk = names.filter((n) => /[一-鿿]/.test(n)).map((n) => n.replace(/[^一-鿿]/g, ""));
  return [...new Set([def.id.toLowerCase(), ...words, ...cjk.filter((x) => x.length >= 2)])];
}

/** True when an `intervene` query asks for the operation itself (its name, or a surgical procedure). */
export function asksForOperation(c: CaseDefinition, s: SessionState, query: string): boolean {
  if (!procedureFor(c, s) || !query.trim()) return false;
  const q = query.toLowerCase();
  return SURGICAL.test(q) || procedureWordsOf(c, s).some((w) => q.includes(w));
}
