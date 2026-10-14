/**
 * Deterministic offline responders (docs/PROTOCOL.md §8): every built-in
 * agent works with `provider: "offline"` using the core matchers and case
 * data only — no network, no invented content.
 *
 *   patient/companion → the select → voice pipeline without a model
 *   nurse             → handover + monitor + pending/ready results
 *   radiologist/path. → text of results the learner has read + case knowledge
 *   attending         → the current objective's hint, Socratically (dispatches `hint`)
 *   examiner          → deterministic report only (judged items stay null)
 *   clinician         → replays `case.solution` one tool call per step, narrated
 */
import {
  ClinicalActionSchema,
  currentObjective,
  matchOrders,
  orderStatus,
  t,
  vitalsAt,
  type AssessmentReport,
  type CaseDefinition,
  type ClinicalAction,
  type ReduceResult,
  type SessionState,
} from "@clinicalcraft/core";
import { runPatientTurn, type PatientTurnInput, type PatientTurnResult } from "../session/patient-pipeline.js";
import { isZh, joinList, joinSentences, rt } from "../session/i18n.js";
import { obtainedResultsText } from "../tools/npc.js";
import { formatVitals, interventionLabel, investigationName, phaseLabel } from "../tools/format.js";

/** What an offline responder may look at. */
export interface OfflineContext {
  caseDef: CaseDefinition;
  locale: string;
  state(): SessionState;
}

/* ------------------------------------------------------------------ */
/* Patient                                                             */
/* ------------------------------------------------------------------ */

/** The patient/companion pipeline with no model (authored answers verbatim). */
export function patientOffline(input: Omit<PatientTurnInput, "llm">): Promise<PatientTurnResult> {
  return runPatientTurn({ ...input, llm: null });
}

/* ------------------------------------------------------------------ */
/* Nurse                                                               */
/* ------------------------------------------------------------------ */

const NURSE_VITALS = /vital|obs\b|observation|\bbp\b|blood pressure|pressure|heart rate|pulse|\bsats?\b|spo2|oxygen|temp|monitor|resp|生命体征|血压|心率|脉搏|血氧|氧饱和|体温|呼吸|监护|指标/iu;
const NURSE_RESULTS = /result|\blab|test|back|pending|report|ready|order|结果|化验|检查|报告|出来|回来|送检/iu;
const NURSE_HANDOVER = /handover|hand over|triage|story|background|who is|what('s| is) (going on|the story|happening)|交班|分诊|情况|病史|怎么回事|什么病人/iu;

/** Results summary for the nurse: names only (ready-but-unread vs pending). */
export function nurseResultsLine(ctx: OfflineContext): string {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const orders = orderStatus(c, ctx.state());
  if (orders.length === 0) return rt(L, "nurse.offline.noOrders");
  const label = (o: (typeof orders)[number]) => `${investigationName(c, o.order.investigationId, L)} (${phaseLabel(c, o.order.phase, L)})`;
  const ready = orders.filter((o) => o.ready && !o.read).map(label);
  const pending = orders.filter((o) => !o.ready).map(label);
  const parts: string[] = [];
  if (ready.length > 0) parts.push(rt(L, "nurse.offline.ready", { list: joinList(L, ready) }));
  if (pending.length > 0) parts.push(rt(L, "nurse.offline.pending", { list: joinList(L, pending) }));
  if (parts.length === 0) {
    const read = obtainedResultsText({ ...ctx, agent: "nurse" }, null);
    return read.ok ? (isZh(L) ? "已开的检查结果您都看过了。" : "You have reviewed every result that has come back.") : rt(L, "nurse.offline.noOrders");
  }
  return joinSentences(L, parts);
}

/** Deterministic nurse reply. */
export function nurseOffline(ctx: OfflineContext, utterance: string): string {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const wantsVitals = NURSE_VITALS.test(utterance);
  const wantsResults = NURSE_RESULTS.test(utterance);
  const wantsHandover = NURSE_HANDOVER.test(utterance);
  // A handover (or an unspecific question) covers everything: story, monitor, results.
  const all = wantsHandover || (!wantsVitals && !wantsResults);
  const parts: string[] = [];
  if (wantsHandover || all) {
    const note = c.patient.triageNote ? t(c.patient.triageNote, L) : t(c.patient.chiefComplaint, L);
    parts.push(rt(L, "nurse.offline.handover", { note }));
    if (wantsHandover) for (const n of c.npcs.filter((x) => x.role === "nurse")) parts.push(t(n.knowledge, L));
  }
  if (wantsVitals || all) {
    const snapshot = vitalsAt(c, ctx.state());
    parts.push(snapshot.baselineOnly ? rt(L, "nurse.offline.noVitals") : rt(L, "nurse.offline.vitals", { vitals: formatVitals(snapshot, L) }));
  }
  if (wantsResults || all) parts.push(nurseResultsLine(ctx));
  return parts.join(isZh(L) ? "" : " ");
}

/* ------------------------------------------------------------------ */
/* Consultants                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_REMIT: Record<string, readonly string[]> = {
  radiologist: ["imaging"],
  pathologist: ["pathology", "genetics", "lab", "microbiology"],
};

/** Investigation ids within a consultant's remit (case `interprets`, else by category). */
export function consultantRemit(c: CaseDefinition, role: string): string[] {
  const listed = c.npcs.filter((n) => n.role === role).flatMap((n) => n.interprets);
  if (listed.length > 0) return listed;
  const categories = DEFAULT_REMIT[role] ?? [];
  return c.investigations.filter((i) => categories.includes(i.category)).map((i) => i.id);
}

/** Deterministic radiologist/pathologist reply: obtained results within remit + the case's evidence boundaries. */
export function consultantOffline(role: "radiologist" | "pathologist" | string, ctx: OfflineContext, utterance: string): string {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const s = ctx.state();
  const remit = new Set(consultantRemit(c, role));
  const asked = matchOrders(c, utterance, L).filter((id) => remit.has(id));
  const readKeys = new Set(s.seen);
  const obtained = s.orders.filter((o) => remit.has(o.investigationId) && readKeys.has(o.key));
  const parts: string[] = [];
  if (obtained.length === 0) {
    const kind = role === "radiologist" || role === "pathologist" ? rt(L, `consultant.kind.${role}`) : role;
    parts.push(rt(L, "consultant.offline.nothing", { kind }));
  } else if (asked.length > 0) {
    for (const id of asked) {
      const mine = obtained.filter((o) => o.investigationId === id);
      if (mine.length === 0) parts.push(rt(L, "consultant.offline.notObtained", { name: investigationName(c, id, L) }));
      for (const o of mine) parts.push(resultLine(c, o.investigationId, o.phase, L));
    }
  } else {
    for (const o of obtained) parts.push(resultLine(c, o.investigationId, o.phase, L));
  }
  const knowledge = c.npcs.filter((n) => n.role === role).map((n) => t(n.knowledge, L));
  if (knowledge.length > 0 && obtained.length > 0) parts.push(rt(L, "consultant.offline.boundary", { knowledge: knowledge.join(" ") }));
  return parts.join("\n");
}

function resultLine(c: CaseDefinition, id: string, phase: string, locale: string): string {
  const inv = c.investigations.find((i) => i.id === id);
  const result = inv?.results[phase];
  const text = result ? (result.available ? t(result.text, locale) : rt(locale, "tool.result.unavailable")) : rt(locale, "tool.result.unavailable");
  return rt(locale, "consultant.offline.result", { name: investigationName(c, id, locale), phase: phaseLabel(c, phase, locale), text });
}

/* ------------------------------------------------------------------ */
/* Attending                                                           */
/* ------------------------------------------------------------------ */

/** Deterministic preceptor: paraphrases the current objective's hint as a question and records the hint. */
export function attendingOffline(ctx: OfflineContext, dispatch: (action: ClinicalAction) => ReduceResult): { text: string; hinted: boolean } {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const objective = currentObjective(c, ctx.state());
  if (!objective) return { text: rt(L, "attending.offline.done"), hinted: false };
  const r = dispatch({ type: "hint", by: "agent" });
  return { text: rt(L, "attending.offline.hint", { hint: t(objective.hint, L) }), hinted: !r.rejected };
}

/* ------------------------------------------------------------------ */
/* Examiner                                                            */
/* ------------------------------------------------------------------ */

/** Deterministic examiner: no transcript judging (judged items stay null) + a narrative of the report. */
export function examinerOffline(c: CaseDefinition, report: AssessmentReport, locale: string): { items: { id: string; met: boolean; evidence: string }[]; narrative: string } {
  const L = locale;
  const missing = report.history.missingRequired.map((id) => {
    const h = c.history.find((x) => x.id === id);
    return h ? t(h.question, L) : id;
  });
  const judged = report.rubric.filter((r) => r.met === null).length;
  const narrative = rt(L, "examiner.offline.narrative", {
    percent: report.score.percent,
    earned: report.score.earned,
    possible: report.score.possible,
    done: report.objectives.filter((o) => o.done).length,
    total: report.objectives.length,
    hAsked: report.history.requiredAsked,
    hRequired: report.history.required,
    eDone: report.exam.requiredPerformed,
    eRequired: report.exam.required,
    missing: missing.length > 0 ? rt(L, "examiner.offline.missing", { list: joinList(L, missing) }) : "",
    judged: judged > 0 ? rt(L, "examiner.offline.judged", { count: judged }) : "",
  });
  return { items: [], narrative: narrative.trim() };
}

/* ------------------------------------------------------------------ */
/* Clinician (autopilot)                                               */
/* ------------------------------------------------------------------ */

/** One step of the offline reference walkthrough. */
export type OfflineClinicianStep =
  /** Run through the same tool path as an LLM clinician (approvals and hooks apply). */
  | { kind: "tool"; tool: string; args: Record<string, unknown>; action: ClinicalAction; narration: string }
  /** Ungated direct action (start, note, flag, hint). */
  | { kind: "action"; action: ClinicalAction; narration: string | null };

/** Localised narration of a clinical action. */
export function narrateAction(c: CaseDefinition, action: ClinicalAction, locale: string): string | null {
  const L = locale;
  switch (action.type) {
    case "ask": {
      const h = c.history.find((x) => x.id === action.itemId);
      return rt(L, "clinician.narrate.ask", { question: h ? t(h.question, L) : action.itemId });
    }
    case "examine": {
      const f = c.exam.find((x) => x.id === action.findingId);
      return rt(L, "clinician.narrate.examine", { maneuver: f ? t(f.maneuver, L) : action.findingId });
    }
    case "order":
      return rt(L, "clinician.narrate.order", { name: investigationName(c, action.investigationId, L) });
    case "read":
      return rt(L, "clinician.narrate.read", { name: investigationName(c, action.investigationId, L), phase: action.phase ? phaseLabel(c, action.phase, L) : "—" });
    case "answer": {
      const d = c.decisions.find((x) => x.id === action.decisionId);
      const options = action.optionIds.map((id) => {
        const o = d?.options.find((x) => x.id === id);
        return o ? t(o.text, L) : id;
      });
      return rt(L, "clinician.narrate.answer", { prompt: d ? t(d.prompt, L) : action.decisionId, options: joinList(L, options) });
    }
    case "set-phase":
      return rt(L, "clinician.narrate.phase", { label: phaseLabel(c, action.phase, L) });
    case "intervene":
      return rt(L, "clinician.narrate.intervene", { name: interventionLabel(c, action.interventionId, L) });
    case "advance-time":
      return rt(L, "clinician.narrate.wait", { minutes: action.minutes });
    case "finish":
      return rt(L, "clinician.narrate.finish");
    case "start":
    case "hint":
    case "flag":
    case "note":
      return null;
    default: {
      const never: never = action;
      return never;
    }
  }
}

/** Map one solution action to the equivalent tool call (or a direct action). */
export function stepForAction(c: CaseDefinition, action: ClinicalAction, locale: string): OfflineClinicianStep {
  const narration = narrateAction(c, action, locale) ?? "";
  const tool = (name: string, args: Record<string, unknown>): OfflineClinicianStep => ({ kind: "tool", tool: name, args, action, narration });
  switch (action.type) {
    case "ask": {
      const h = c.history.find((x) => x.id === action.itemId);
      return tool("ask_patient", { question: h ? t(h.question, locale) : action.itemId });
    }
    case "examine":
      return tool("examine", { finding_id: action.findingId });
    case "order":
      return tool("order_test", { investigation_id: action.investigationId });
    case "read":
      return tool("read_result", { investigation_id: action.investigationId, ...(action.phase ? { phase: action.phase } : {}) });
    case "answer":
      return tool("answer_decision", { decision_id: action.decisionId, option_ids: action.optionIds });
    case "set-phase":
      return tool("set_phase", { phase: action.phase });
    case "intervene":
      return tool("intervene", { intervention_id: action.interventionId });
    case "advance-time":
      return tool("wait", { minutes: action.minutes });
    case "finish":
      return tool("finish_case", {});
    case "start":
    case "hint":
    case "flag":
    case "note":
      return { kind: "action", action, narration: null };
    default: {
      const never: never = action;
      return never;
    }
  }
}

/** The offline clinician's plan: `case.solution` as tool steps (invalid entries are skipped). */
export function clinicianOfflineSteps(c: CaseDefinition, locale: string): OfflineClinicianStep[] {
  const steps: OfflineClinicianStep[] = [];
  for (const raw of c.solution) {
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (parsed.success) steps.push(stepForAction(c, parsed.data, locale));
  }
  return steps;
}

/** True when a step no longer needs doing in the current state (resumed or learner already did it). */
export function stepAlreadySatisfied(step: OfflineClinicianStep, state: SessionState): boolean {
  const a = step.action;
  switch (a.type) {
    case "start":
      return state.started;
    case "answer":
      return Object.prototype.hasOwnProperty.call(state.decisions, a.decisionId);
    case "finish":
      return state.finished;
    default:
      return false;
  }
}

/** PROTOCOL §2 name for the offline clinician plan (see `offlineClinicianTurn` in session/autopilot.ts for execution). */
export const clinicianOffline = clinicianOfflineSteps;
