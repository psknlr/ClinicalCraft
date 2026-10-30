/**
 * Deterministic offline responders (docs/PROTOCOL.md §8): every built-in
 * agent works with `provider: "offline"` using the core matchers and case
 * data only — no network, no invented content.
 *
 *   patient/companion → the select → voice pipeline without a model
 *   nurse             → handover + monitor + pending/ready results
 *   radiologist/path. → text of results the learner has read + case knowledge
 *   attending         → a Socratic nudge naming the current objective; its hint (dispatches
 *                       `hint`, scored) only when the learner asks for one
 *   examiner          → deterministic report only (judged items stay null)
 *   clinician         → replays `case.solution` one tool call per step, narrated
 */
import {
  ClinicalActionSchema,
  createSession as createEngineState,
  currentObjective,
  matchOrders,
  orderStatus,
  reduce,
  resultKey,
  t,
  vitalsAt,
  type AssessmentReport,
  type CaseDefinition,
  type ClinicalAction,
  type ReduceResult,
  type SessionState,
  type VitalsSnapshot,
} from "@clinicalcraft/core";
import { runPatientTurn, type PatientTurnInput, type PatientTurnResult } from "../session/patient-pipeline.js";
import { isZh, joinList, joinSentences, rt, type RuntimeKey } from "../session/i18n.js";
import { obtainedResultsText } from "../tools/npc.js";
import { bedsideReadings, formatVitals, interventionLabel, investigationName, offMonitor, phaseLabel, withoutEcg } from "../tools/format.js";

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

const NURSE_VITALS = /vital|obs\b|observation|\bbp\b|blood pressure|pressure|heart rate|pulse|\bsats?\b|spo2|oxygen|temp|monitor|resp|pain|生命体征|血压|心率|脉搏|血氧|氧饱和|体温|呼吸|监护|指标|疼痛评分|痛/iu;
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

/**
 * What the nurse says about the observations: the bedside readings, or —
 * before the monitor is attached — that it is not on yet, the readings taken
 * by hand at the start and her current observations (never a live number).
 */
function nurseVitalsLine(snapshot: VitalsSnapshot, L: string): string {
  if (snapshot.baselineOnly) return rt(L, "nurse.offline.noVitals");
  if (withoutEcg(snapshot)) {
    // On the monitor without ECG leads (a pulse oximeter and cuff): the readings, but no rhythm yet.
    const vitals = rt(L, "nurse.offline.vitals", { vitals: bedsideReadings(snapshot, L).live.join(" · ") });
    return `${vitals}${isZh(L) ? "" : " "}${rt(L, "nurse.offline.noEcg")}`;
  }
  if (!offMonitor(snapshot)) return rt(L, "nurse.offline.vitals", { vitals: formatVitals(snapshot, L) });
  const { live, manual } = bedsideReadings(snapshot, L);
  const parts = [rt(L, "nurse.offline.noMonitor")];
  if (manual.length > 0) parts.push(rt(L, "nurse.offline.spotChecks", { readings: manual.join(" · ") }));
  if (live.length > 0) parts.push(rt(L, "nurse.offline.observations", { readings: live.join(" · ") }));
  return parts.join(isZh(L) ? "" : " ");
}

/**
 * What a colleague of a role without their own profile says offline (a porter, a receptionist, a pharmacist, a
 * laboratory technician speaking through the nurse's or the pathologist's): who they are and what they do here —
 * never another role's clinical knowledge (a porter does not read out the vital signs).
 */
export function staffOffline(role: string, name: string, locale: string): string {
  const key = (["porter", "receptionist", "pharmacist", "lab-tech"].includes(role) ? `staff.offline.${role}` : "staff.offline.generic") as RuntimeKey;
  return rt(locale, key, { name });
}

/** Deterministic nurse reply. */
export function nurseOffline(ctx: OfflineContext, utterance: string): string {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const wantsVitals = NURSE_VITALS.test(utterance);
  const wantsResults = NURSE_RESULTS.test(utterance);
  // Approaching the nurse (no words yet) is asking for the handover.
  const wantsHandover = NURSE_HANDOVER.test(utterance) || !utterance.trim();
  // A handover covers everything: story, monitor, results. An unspecific question gets the monitor and
  // results only — the triage note describes arrival ("no IV access yet") and is stale once the case moves.
  const all = wantsHandover || (!wantsVitals && !wantsResults);
  const parts: string[] = [];
  if (wantsHandover) {
    const note = c.patient.triageNote ? t(c.patient.triageNote, L) : t(c.patient.chiefComplaint, L);
    parts.push(rt(L, "nurse.offline.handover", { note }));
    for (const n of c.npcs.filter((x) => x.role === "nurse")) parts.push(t(n.knowledge, L));
  }
  if (wantsVitals || all) parts.push(nurseVitalsLine(vitalsAt(c, ctx.state()), L));
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

/** Deterministic radiologist/pathologist reply: obtained results within remit + the evidence boundary (never the authored knowledge brief). */
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
  // The authored `npcs[].knowledge` is a brief for model-backed consultants (it may describe other
  // studies): never recite it. Offline, state the evidence boundary itself.
  if (obtained.length > 0) parts.push(rt(L, "consultant.offline.boundary"));
  return parts.join("\n");
}

function resultLine(c: CaseDefinition, id: string, phase: string, locale: string): string {
  const inv = c.investigations.find((i) => i.id === id);
  const result = inv?.results[phase];
  const why = result && !result.available ? t(result.text, locale) : "";
  const text = result ? (result.available ? t(result.text, locale) : why ? joinSentences(locale, [why, rt(locale, "tool.result.notAvailable")]) : rt(locale, "tool.result.unavailable")) : rt(locale, "tool.result.unavailable");
  return rt(locale, "consultant.offline.result", { name: investigationName(c, id, locale), phase: phaseLabel(c, phase, locale), text });
}

/* ------------------------------------------------------------------ */
/* Attending                                                           */
/* ------------------------------------------------------------------ */

/** The learner asks the preceptor for a hint (en/zh phrasing: "hint", "stuck", "clue", "提示", "卡住"…). */
export function asksForHint(utterance: string): boolean {
  return /\b(?:hints?|clues?|stuck|help me|nudge|pointer)\b|提示|卡住|没思路|没有思路|帮帮我|点拨|指点/i.test(utterance);
}

/**
 * Deterministic preceptor. Consulting the attending is Socratic guidance and
 * costs nothing: it names the current objective (already on the status line)
 * and asks what the learner knows and still needs. Only when the learner asks
 * for a hint (`asksForHint`) does it give the objective's authored hint — and
 * that is recorded as a scored hint, like `/hint` and the LLM attending's
 * `give_hint`.
 */
export function attendingOffline(ctx: OfflineContext, dispatch: (action: ClinicalAction) => ReduceResult, utterance = ""): { text: string; hinted: boolean } {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const objective = currentObjective(c, ctx.state());
  if (!objective) return { text: rt(L, "attending.offline.done"), hinted: false };
  if (!asksForHint(utterance)) return { text: rt(L, "attending.offline.nudge", { objective: t(objective.title, L) }), hinted: false };
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
  const missingExam = report.exam.missingRequired.map((id) => {
    const e = c.exam.find((x) => x.id === id);
    return e ? t(e.maneuver, L) : id;
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
    missing:
      (missing.length > 0 ? rt(L, "examiner.offline.missing", { list: joinList(L, missing) }) : "") +
      (missingExam.length > 0 ? rt(L, "examiner.offline.missingExam", { list: joinList(L, missingExam) }) : ""),
    judged: judged > 0 ? rt(L, "examiner.offline.judged", { count: judged }) : "",
  });
  return { items: [], narrative: narrative.trim() };
}

/* ------------------------------------------------------------------ */
/* Clinician (autopilot)                                               */
/* ------------------------------------------------------------------ */

/**
 * Where a step sits in the reference walkthrough, so a resumed or
 * learner-advanced session can tell whether it is already done.
 */
export interface OfflineStepContext {
  /** 1-based count of this step's repeatable action (same intervention, hint) in `solution[0..i]`. */
  occurrence?: number;
  /** Clock of the reference run (`solution` replayed from the start) after this step. */
  refClockAfter?: number;
}

/** One step of the offline reference walkthrough. */
export type OfflineClinicianStep = (
  /** Run through the same tool path as an LLM clinician (approvals and hooks apply). */
  | { kind: "tool"; tool: string; args: Record<string, unknown>; action: ClinicalAction; narration: string }
  /** Ungated direct action (start, note, flag, hint). */
  | { kind: "action"; action: ClinicalAction; narration: string | null }
) &
  OfflineStepContext;

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

/**
 * The offline clinician's plan: `case.solution` as tool steps (invalid entries
 * are skipped), each with its `OfflineStepContext` (occurrence counts and the
 * reference run's clock, from replaying the solution through the engine).
 */
export function clinicianOfflineSteps(c: CaseDefinition, locale: string): OfflineClinicianStep[] {
  const steps: OfflineClinicianStep[] = [];
  const counts = new Map<string, number>();
  let ref: SessionState | null = createEngineState(c);
  for (const raw of c.solution) {
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (!parsed.success) continue;
    const action = parsed.data;
    const step: OfflineClinicianStep = stepForAction(c, action, locale);
    const key = action.type === "intervene" ? `intervene:${action.interventionId}` : action.type === "hint" ? "hint" : null;
    if (key) {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      step.occurrence = n;
    }
    if (ref) {
      try {
        ref = reduce(c, ref, action).state;
        step.refClockAfter = ref.clock;
      } catch {
        ref = null; // a broken solution: no reference clock for the rest
      }
    }
    steps.push(step);
  }
  return steps;
}

/**
 * True when a step no longer needs doing in the current state — the learner
 * already did it, or the session was resumed past it: start/finish/answers by
 * state; asks, exams, orders (same phase), reads, phase switches, flags and
 * notes when already recorded; an intervention or hint when the state holds at
 * least as many as the reference walkthrough has given by then (so a repeated
 * dose in the solution still happens, but never twice after a resume); a wait
 * when the clock already reaches the reference run's clock after it.
 */
export function stepAlreadySatisfied(step: OfflineClinicianStep, state: SessionState): boolean {
  const a = step.action;
  switch (a.type) {
    case "start":
      return state.started;
    case "answer":
      return Object.prototype.hasOwnProperty.call(state.decisions, a.decisionId);
    case "finish":
      return state.finished;
    case "ask":
      return state.asked.includes(a.itemId);
    case "examine":
      return state.examined.includes(a.findingId);
    case "order":
      return state.orders.some((o) => o.key === resultKey(a.investigationId, state.phase));
    case "read":
      return state.seen.includes(resultKey(a.investigationId, a.phase ?? state.phase));
    case "set-phase":
      return state.phase === a.phase;
    case "intervene":
      return state.interventions.filter((r) => r.interventionId === a.interventionId).length >= (step.occurrence ?? 1);
    case "hint":
      return state.hints >= (step.occurrence ?? 1);
    case "advance-time":
      return step.refClockAfter !== undefined && state.clock >= step.refClockAfter;
    case "flag":
      return state.flags.includes(a.flag) === (a.value !== false);
    case "note":
      return state.notes.some((n) => n.text === a.text);
    default: {
      const never: never = a;
      return never;
    }
  }
}

/**
 * Minutes until the order behind a `read` step is ready (simulated clock;
 * 0 when ready, not ordered, or the clock is static) — a learner who ordered
 * later than the reference run did would otherwise read too early.
 */
export function minutesUntilReadable(c: CaseDefinition, state: SessionState, action: ClinicalAction): number {
  if (action.type !== "read" || c.clock.mode === "static") return 0;
  const order = state.orders.find((o) => o.key === resultKey(action.investigationId, action.phase ?? state.phase));
  return order ? Math.max(0, order.readyAt - state.clock) : 0;
}

/** PROTOCOL §2 name for the offline clinician plan (see `offlineClinicianTurn` in session/autopilot.ts for execution). */
export const clinicianOffline = clinicianOfflineSteps;
