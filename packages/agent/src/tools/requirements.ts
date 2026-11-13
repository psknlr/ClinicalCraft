/**
 * What the case still needs, in words (docs/PROTOCOL.md §3.1): the current objective's requirements met and
 * open, with the next available action for each open one; standing holds; the surgical count; and the way into the operation. One
 * renderer for `case_status`, `intervene` (an operation asked for as an intervention), `observe_field` and
 * `operate` refusals, so every surface names the same unmet requirement.
 *
 * Work-up leaves (history, examination, orders, results) are counted, never named: choosing them is the case.
 */
import {
  activeHolds,
  countOpenItems,
  countStatus,
  currentVersion,
  formulationOf,
  prescriptionDef,
  prescriptionStatus,
  unreadVersion,
  procedureStateOf,
  currentObjective,
  explainCondition,
  procedureFor,
  reduce,
  requirementLeaves,
  t,
  type CaseDefinition,
  type ClinicalAction,
  type Condition,
  type CountPredicate,
  type PrescriptionPredicate,
  type ProcedurePredicate,
  type Requirement,
  type SessionState,
} from "@clinicalcraft/core";
import { joinList, rt, type RuntimeKey } from "../session/i18n.js";
import { countItemName, openItemsText } from "../session/notifications.js";
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

/** A count condition in words: the statuses (one of), the stage, the scan, an escalation, an unsafe progression. */
function countWords(p: CountPredicate, L: string): string {
  const parts: string[] = [];
  if (p.status !== undefined) parts.push((Array.isArray(p.status) ? p.status : [p.status]).map((x) => rt(L, `count.status.${x}` as RuntimeKey)).join(" / "));
  if (p.stage !== undefined) parts.push(rt(L, `count.stage.${p.stage}` as RuntimeKey));
  if (p.scan !== undefined) parts.push(rt(L, "req.count.scan", { result: p.scan }));
  if (p.escalated) parts.push(rt(L, "req.count.escalated"));
  if (p.unsafe) parts.push(rt(L, "req.count.unsafe"));
  return parts.join(", ") || rt(L, "count.status.baseline");
}

/** A prescription condition in words (docs/PRESCRIPTIONS.md §6): the prescription it names, then every field it gives. */
function prescriptionWords(c: CaseDefinition, p: PrescriptionPredicate, L: string): string {
  const def = p.id != null ? prescriptionDef(c, p.id) : undefined;
  const formulation = (id: string) => {
    const f = def ? formulationOf(def, id) : (c.prescriptions ?? []).flatMap((d) => d.formulations).find((x) => x.id === id);
    return f ? t(f.name, L) : id;
  };
  const parts: string[] = [];
  if (p.status !== undefined) parts.push((Array.isArray(p.status) ? p.status : [p.status]).map((x) => rt(L, `req.rx.status.${x}` as RuntimeKey)).join(" / "));
  if (p.current !== undefined) parts.push(rt(L, "req.rx.current", { name: formulation(p.current) }));
  if (p.signed !== undefined) parts.push(rt(L, "req.rx.signed", { name: formulation(p.signed) }));
  if (p.dispensed !== undefined) parts.push(p.dispensed === true ? rt(L, "req.rx.dispensedAny") : rt(L, "req.rx.dispensed", { name: formulation(p.dispensed) }));
  if (p.versions?.gte !== undefined) parts.push(rt(L, "req.rx.versions.gte", { n: p.versions.gte }));
  if (p.versions?.lte !== undefined) parts.push(rt(L, "req.rx.versions.lte", { n: p.versions.lte }));
  if (p.queried !== undefined) parts.push(rt(L, p.queried ? "req.rx.queried" : "req.rx.notQueried"));
  if (p.acknowledged !== undefined) parts.push(rt(L, p.acknowledged ? "req.rx.acknowledged" : "req.rx.notAcknowledged"));
  if (p.refused !== undefined) parts.push(rt(L, p.refused === false ? "req.rx.notRefused" : "req.rx.refused"));
  if (p.discrepancy !== undefined) parts.push(rt(L, p.discrepancy === false ? "req.rx.noDiscrepancy" : "req.rx.discrepancy"));
  if (p.labelChecked !== undefined) parts.push(rt(L, p.labelChecked ? "req.rx.labelChecked" : "req.rx.labelUnchecked"));
  if (p.supplyRead !== undefined) parts.push(rt(L, p.supplyRead ? "req.rx.supplyRead" : "req.rx.supplyUnread"));
  const what = parts.join(", ") || rt(L, "req.rx.any");
  return def ? rt(L, "req.rx", { name: t(def.name, L), what }) : what;
}

/**
 * The prescriber's next step towards an open prescription condition: sign (the formulation it names, when it names
 * one and that is not the current version already), read the record when the dispensary has written something
 * unread, else nothing of theirs — the dispensary reviews and supplies on its own.
 */
function prescriptionNext(c: CaseDefinition, s: SessionState, p: PrescriptionPredicate, L: string): string | null {
  const defs = (c.prescriptions ?? []).filter((d) => p.id == null || d.id === p.id);
  if (!defs.length) return null;
  if (defs.some((d) => unreadVersion(s, d.id))) return rt(L, "next.readPrescription");
  const wanted = typeof p.dispensed === "string" ? p.dispensed : (p.current ?? p.signed);
  const def = defs[0]!;
  const current = currentVersion(s, def.id);
  if (wanted && current?.formulation !== wanted) return rt(L, "next.prescribe", { id: wanted });
  const status = prescriptionStatus(s, def.id);
  if (status === "none") return rt(L, "next.prescribeAny");
  // signed and nothing to read: what is open is the dispensary's (a review, a supply) — or a revision after a query
  if (status === "queried") return rt(L, "next.prescribeAny");
  return def.dispensedBy === "staff" && (status === "submitted" || status === "confirmed" || status === "preparing") ? rt(L, "next.awaitDispensary") : null;
}

/** The count's lines for `case_status` (docs/TEAM.md §4.3): its status, what is open, escalations, unsafe progression. */
export function countLines(c: CaseDefinition, s: SessionState, L: string): string[] {
  if (!c.team?.count) return [];
  const r = s.count;
  const status = countStatus(r);
  const item = countItemName(c, L);
  const open = r && status !== "correct" && status !== "reconciled" ? countOpenItems(r) : { missing: [], unexpected: [] };
  const lines = [rt(L, "count.line", { item, status: rt(L, `count.status.${status}` as RuntimeKey), open: openItemsText(L, open) })];
  for (const e of r?.entries ?? []) if (e.op === "escalate") lines.push(rt(L, "count.line.escalated", { who: e.staff, to: e.to }));
  for (const u of r?.unsafe ?? []) lines.push(rt(L, "count.line.unsafe", { status: rt(L, `count.status.${u.status}` as RuntimeKey), open: openItemsText(L, u) }));
  return lines;
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
  if ("count" in cond) return rt(L, "req.count", { what: countWords(cond.count, L) });
  if ("prescription" in cond) return prescriptionWords(c, cond.prescription, L);
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
  if ("prescription" in cond) return prescriptionNext(c, s, cond.prescription, L);
  return null;
}

/** Operative steps that need no arguments: they can be tried as they are named. */
const BARE_OPS = new Set(["close", "inspect", "desufflate"]);

/** The clinical action a requirement's next step names (to try it, never shown), or null when it cannot be built. */
export function candidateAction(c: CaseDefinition, s: SessionState, r: Requirement): ClinicalAction | null {
  if (r.met) return null;
  // one of several: the same child whose next step is named (`nextAction`)
  if (r.kind === "any") {
    const child = r.children.find((x) => nextAction(c, s, x, "en") != null);
    return child ? candidateAction(c, s, child) : null;
  }
  if (r.kind !== "leaf") return null;
  const cond = r.cond;
  if ("intervened" in cond) return activeHolds(s, cond.intervened).length ? null : { type: "intervene", interventionId: cond.intervened };
  if ("inOrder" in cond) {
    const missing = cond.inOrder.find((id: string) => !s.interventions.some((x) => x.interventionId === id && x.appropriateness !== "contraindicated"));
    return missing ? { type: "intervene", interventionId: missing } : null;
  }
  if ("decided" in cond) {
    const d = c.decisions.find((x) => x.id === cond.decided);
    return d ? { type: "answer", decisionId: d.id, optionIds: d.options.filter((o) => o.correct).map((o) => o.id) } : null;
  }
  if ("procedure" in cond) {
    const step = procedureStep(cond.procedure);
    return step && BARE_OPS.has(step) ? ({ type: "operate", op: { op: step } } as ClinicalAction) : null;
  }
  return null;
}

/**
 * Would this action run now? The engine's own reducer decides — the same function that executes it — on a copy (pure:
 * nothing is recorded, nothing is shown of how it would be judged). An intervention it would record as invalid (a
 * checklist step out of order) is not runnable either.
 */
export function tryAction(c: CaseDefinition, s: SessionState, action: ClinicalAction, L = "en"): { allowed: true } | { allowed: false; blockedBy: string } {
  const r = reduce(c, s, { ...action, by: "system" } as ClinicalAction);
  if (r.rejected) {
    // a locked decision says what it needs in the learner's language (the engine words it in the case's first)
    const d = action.type === "answer" && r.rejected.code === "requirements-unmet" ? c.decisions.find((x) => x.id === action.decisionId) : undefined;
    return { allowed: false, blockedBy: d?.need ? t(d.need, L) : r.rejected.message };
  }
  if (action.type === "intervene" && r.state.interventions.length > s.interventions.length && r.state.interventions.at(-1)!.invalid) {
    // out of order: what has to come first (the step's own indication, requirement by requirement)
    const iv = c.interventions.find((x) => x.id === action.interventionId);
    const visible = new Set(c.phases.map((p) => p.id));
    // the prerequisites: what its contraindication says is missing (`not: {all: [...]}`), else its indication
    const cw = iv?.contraindicatedWhen as Condition | undefined;
    const needed: Condition | undefined = cw && "not" in cw ? (cw.not as Condition) : iv?.indicatedWhen;
    const first = needed ? requirementLeaves(explainCondition(c, s, needed)).filter((x) => !x.met).map((x) => requirementText(c, s, x, L, visible)) : [];
    return { allowed: false, blockedBy: first.length ? rt(L, "req.outOfOrder", { first: joinList(L, first) }) : rt(L, "req.outOfOrderBare", { harm: iv?.harm ? t(iv.harm, L) : "—" }) };
  }
  return { allowed: true };
}

/** A recommendation as data: the next step, whether it would run now, and what blocks it. */
export interface Recommendation {
  action: string;
  available: boolean;
  blockedBy: string[];
}

/** The current objective's open requirements as recommendations (`case_status` data): only runnable ones are "next". */
export function recommendations(c: CaseDefinition, s: SessionState, L: string): Recommendation[] {
  const o = currentObjective(c, s);
  if (!o) return [];
  return requirementLeaves(explainCondition(c, s, o.completeWhen)).flatMap((r) => {
    const next = nextAction(c, s, r, L);
    if (!next || (r.kind === "leaf" && isWorkup(r.cond))) return [];
    const cand = candidateAction(c, s, r);
    const tried = cand ? tryAction(c, s, cand, L) : ({ allowed: true } as const);
    return [{ action: next, available: tried.allowed, blockedBy: tried.allowed ? [] : [tried.blockedBy] }];
  });
}

/**
 * Lines for a condition: each named requirement met (✓) or open (·) with its next action — "next" only when the
 * engine would run it now, else "not yet" with what blocks it — and the open work-up items as a count. Empty when
 * the condition has no named requirement.
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
    if (next) {
      const cand = candidateAction(c, s, r);
      const tried = cand ? tryAction(c, s, cand, L) : ({ allowed: true } as const);
      lines.push(tried.allowed ? rt(L, "req.next", { action: next }) : rt(L, "req.notYet", { action: next, reason: tried.blockedBy }));
    }
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
  const p = procedureStateOf(s);
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
  return [rt(L, "status.op.locked"), ...(opens ? requirementLines(c, s, opens, L, visible) : []), ...equipmentLines(s, L)];
}

/**
 * The operation's equipment fault, apart from its progress (`SessionState.equipment`): what does not work now, and
 * which devices supply what does. [] when everything works.
 */
export function equipmentLines(s: SessionState, L: string): string[] {
  const e = s.procedure?.supply ?? s.equipment;
  if (!e || (e.image !== false && e.gas !== false)) return [];
  const missing = [e.image === false ? rt(L, "status.equipment.image") : "", e.gas === false ? rt(L, "status.equipment.gas") : ""].filter(Boolean);
  return [rt(L, "status.equipment.fault", { missing: joinList(L, missing) })];
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
