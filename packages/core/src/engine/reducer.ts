/**
 * The pure session reducer (docs/ARCHITECTURE.md §3.1).
 *
 * `reduce(case, state, action)` never mutates its inputs, never reads the
 * wall clock and never draws random numbers: replaying the same actions
 * always yields a deep-equal state and the same events.
 */
import type { CaseDefinition } from "../schema/case.js";
import {
  ClinicalActionSchema,
  SESSION_SCHEMA_ID,
  type ClinicalAction,
  type ClinicalActionType,
  type DomainEvent,
  type ReduceResult,
  type RejectionCode,
  type SessionState,
} from "../schema/session.js";
import { t } from "../i18n.js";
import { activeHolds, evaluate, resultFor, resultKey } from "./conditions.js";
import { currentObjective, progress } from "./queries.js";
import { historyVoice } from "./speech.js";
import { advanceClock, openTimeline, settle } from "./timeline.js";
import { supersededIn } from "./twins.js";
import { createProcedureState, operate, procedureFor, procedureStateOf } from "./procedure/index.js";
import { applyCount, closureOnOpenCount, countLedger, countStatus } from "./count.js";
import { applyStudy } from "./study.js";
import { reachPhase, recordAvailability } from "./records.js";
import { applyAnaesthesia } from "./anaesthesia.js";
import { applyAlarm } from "./alarm.js";
import { BASE_VARIANT } from "../schema/procedure.js";
import type { ReplayRejection, ReplayResult } from "./types.js";

type Action<T extends ClinicalActionType> = Extract<ClinicalAction, { type: T }>;

/** What an action handler decided. */
type Outcome =
  | { kind: "accepted"; cost: number }
  /** Accepted, but nothing changed (e.g. duplicate order): the input state is returned untouched. */
  | { kind: "unchanged" }
  | { kind: "rejected"; code: RejectionCode; message: string };

interface Ctx {
  c: CaseDefinition;
  /** State before the action (read-only). */
  before: SessionState;
  /** Private draft copy (mutable). */
  s: SessionState;
  events: DomainEvent[];
}

/** Actions allowed before `start` (V4: browsing phases, notes and flags). */
const PRE_START_ALLOWED: ReadonlySet<ClinicalActionType> = new Set(["start", "set-phase", "note", "flag"]);

/* ------------------------------------------------------------------ */
/* Session lifecycle                                                   */
/* ------------------------------------------------------------------ */

/** A fresh, not-yet-started session at minute 0 in the case's initial phase. */
export function createSession(c: CaseDefinition): SessionState {
  return {
    schema: SESSION_SCHEMA_ID,
    caseId: c.id,
    caseVersion: c.version,
    started: false,
    finished: false,
    clock: 0,
    phase: c.initialPhase ?? c.phases[0].id,
    phasesReached: [c.initialPhase ?? c.phases[0].id],
    asked: [],
    examined: [],
    orders: [],
    seen: [],
    decisions: {},
    attempts: [],
    interventions: [],
    flags: [],
    hints: 0,
    notes: [],
    firedEvents: {},
    trendStops: {},
    objectivesDone: {},
    baselineOverrides: {},
    seq: 0,
  };
}

/** Copy every mutable container of a state (records inside are immutable by convention). */
function cloneState(s: SessionState): SessionState {
  return {
    ...s,
    asked: [...s.asked],
    ...(s.phasesReached ? { phasesReached: [...s.phasesReached] } : {}),
    examined: [...s.examined],
    orders: [...s.orders],
    seen: [...s.seen],
    decisions: { ...s.decisions },
    attempts: [...s.attempts],
    interventions: [...s.interventions],
    flags: [...s.flags],
    notes: [...s.notes],
    firedEvents: { ...s.firedEvents },
    trendStops: { ...s.trendStops },
    objectivesDone: { ...s.objectivesDone },
    baselineOverrides: { ...s.baselineOverrides },
    ...(s.holds ? { holds: [...s.holds] } : {}),
  };
}

/** Simulated minutes an action consumes (0 on a static clock). */
function actionCost(c: CaseDefinition, type: ClinicalActionType): number {
  if (c.clock.mode !== "simulated") return 0;
  const costs = c.clock.actionCosts;
  switch (type) {
    case "ask":
    case "examine":
    case "order":
    case "read":
    case "intervene":
    case "answer":
      return costs[type];
    default:
      return 0;
  }
}

const accepted = (cost = 0): Outcome => ({ kind: "accepted", cost });
const rejected = (code: RejectionCode, message: string): Outcome => ({ kind: "rejected", code, message });
const has = (record: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(record, key);

/* ------------------------------------------------------------------ */
/* Action handlers                                                     */
/* ------------------------------------------------------------------ */

function onStart(ctx: Ctx, a: Action<"start">): Outcome {
  if (ctx.s.started) return rejected("invalid", "session already started");
  if (a.variant != null && a.variant !== BASE_VARIANT) {
    if (!ctx.c.procedure?.variants.some((v) => v.id === a.variant)) return rejected("unknown-id", `this case has no procedure variant "${a.variant}"`);
    ctx.s.variant = a.variant;
  }
  if (a.team != null) {
    if (!ctx.c.team?.scenarios.some((x) => x.id === a.team)) return rejected("unknown-id", `this case has no team scenario "${a.team}"`);
    ctx.s.teamScenario = a.team;
  }
  ctx.s.started = true;
  ctx.events.push({ type: "session.started" });
  return accepted();
}

function onAsk(ctx: Ctx, a: Action<"ask">): Outcome {
  const { c, s } = ctx;
  const item = c.history.find((h) => h.id === a.itemId);
  if (!item) return rejected("unknown-id", `unknown history item "${a.itemId}"`);
  if (item.phases && !item.phases.includes(s.phase)) return rejected("phase-locked", `history item "${item.id}" is not available in phase "${s.phase}"`);
  const twin = supersededIn(c, item.id, s.phase);
  if (twin) return rejected("phase-locked", `history item "${item.id}" is superseded by "${twin}" in phase "${s.phase}"`);
  // The patient cannot speak (`patient.nonVerbalWhen`) and no companion can answer: nothing is learned.
  if (historyVoice(c, s, item.id) === "none") return rejected("cannot-answer", `the patient cannot speak now and the case has no companion to answer "${item.id}"`);
  const firstTime = !s.asked.includes(item.id);
  if (firstTime) s.asked.push(item.id);
  ctx.events.push({ type: "history.asked", itemId: item.id, firstTime, disclosure: item.disclosure });
  return accepted(actionCost(c, "ask"));
}

function onExamine(ctx: Ctx, a: Action<"examine">): Outcome {
  const { c, s } = ctx;
  const finding = c.exam.find((e) => e.id === a.findingId);
  if (!finding) return rejected("unknown-id", `unknown exam finding "${a.findingId}"`);
  if (finding.phases && !finding.phases.includes(s.phase)) {
    return rejected("phase-locked", `exam finding "${finding.id}" is not available in phase "${s.phase}"`);
  }
  const firstTime = !s.examined.includes(finding.id);
  if (firstTime) s.examined.push(finding.id);
  ctx.events.push({ type: "exam.performed", findingId: finding.id, firstTime });
  return accepted(actionCost(c, "examine"));
}

function onOrder(ctx: Ctx, a: Action<"order">): Outcome {
  const { c, s } = ctx;
  const investigation = c.investigations.find((i) => i.id === a.investigationId);
  if (!investigation) return rejected("unknown-id", `unknown investigation "${a.investigationId}"`);
  // a document written later in the encounter (the operation record, the pathology report) does not exist yet
  if (investigation.performedAt === "records" && recordAvailability(c, s, investigation.id).kind === "not-yet")
    return rejected("not-ready", `"${investigation.id}" does not exist yet at this stage of care: nothing was retrieved`);
  const key = resultKey(investigation.id, s.phase);
  if (s.orders.some((o) => o.key === key)) {
    ctx.events.push({ type: "order.duplicate", investigationId: investigation.id, phase: s.phase, key });
    return { kind: "unchanged" };
  }
  const readyAt = c.clock.mode === "simulated" ? s.clock + investigation.turnaroundMinutes : s.clock;
  s.orders.push({ key, investigationId: investigation.id, phase: s.phase, orderedAt: s.clock, readyAt, ...(a.at != null ? { at: a.at } : {}) });
  ctx.events.push({ type: "order.placed", investigationId: investigation.id, phase: s.phase, key, readyAt });
  const result = resultFor(c, investigation.id, s.phase);
  if (readyAt <= s.clock && result) {
    ctx.events.push({ type: "result.ready", key, investigationId: investigation.id, phase: s.phase, critical: result.critical });
  }
  return accepted(actionCost(c, "order"));
}

function onRead(ctx: Ctx, a: Action<"read">): Outcome {
  const { c, s } = ctx;
  const investigation = c.investigations.find((i) => i.id === a.investigationId);
  if (!investigation) return rejected("unknown-id", `unknown investigation "${a.investigationId}"`);
  const phase = a.phase ?? s.phase;
  if (!c.phases.some((p) => p.id === phase)) return rejected("unknown-id", `unknown phase "${phase}"`);
  const key = resultKey(investigation.id, phase);
  const order = s.orders.find((o) => o.key === key);
  if (!order) return rejected("not-ordered", `"${investigation.id}" has not been ordered in phase "${phase}"`);
  if (c.clock.mode === "simulated" && s.clock < order.readyAt) {
    return rejected("not-ready", `result "${key}" is not ready until minute ${order.readyAt}`);
  }
  if (!resultFor(c, investigation.id, phase)) return rejected("no-record", `the case has no "${investigation.id}" record for phase "${phase}"`);
  const firstTime = !s.seen.includes(key);
  if (firstTime) s.seen.push(key);
  ctx.events.push({ type: "result.read", key, investigationId: investigation.id, phase, firstTime });
  return accepted(actionCost(c, "read"));
}

function onSetPhase(ctx: Ctx, a: Action<"set-phase">): Outcome {
  const { c, s } = ctx;
  const phase = c.phases.find((p) => p.id === a.phase);
  if (!phase) return rejected("unknown-id", `unknown phase "${a.phase}"`);
  // A locked phase opens to the learner once the case has reached it (its `enterWhen` holds): a learner who looked
  // back at an earlier phase can return — the automatic transition fires only on a false→true edge.
  const reached = phase.enterWhen != null && evaluate(c, s, phase.enterWhen);
  if (!phase.learnerSwitchable && !reached) return rejected("phase-locked", `phase "${phase.id}" cannot be selected manually`);
  if (s.phase !== phase.id) {
    ctx.events.push({ type: "phase.changed", from: s.phase, to: phase.id, automatic: false });
    s.phase = phase.id;
    reachPhase(s, phase.id);
  }
  return accepted();
}

function onHint(ctx: Ctx): Outcome {
  ctx.s.hints += 1;
  ctx.events.push({ type: "hint.used", objectiveId: currentObjective(ctx.c, ctx.before)?.id ?? null });
  return accepted();
}

function onAnswer(ctx: Ctx, a: Action<"answer">): Outcome {
  const { c, s, before } = ctx;
  const decision = c.decisions.find((d) => d.id === a.decisionId);
  if (!decision) return rejected("unknown-id", `unknown decision "${a.decisionId}"`);
  const unknown = a.optionIds.filter((id) => !decision.options.some((o) => o.id === id));
  if (unknown.length) return rejected("unknown-id", `unknown option(s) ${unknown.map((u) => `"${u}"`).join(", ")} for decision "${decision.id}"`);
  const chosen = [...new Set(a.optionIds)];
  if (decision.kind === "single" && chosen.length !== 1) return rejected("invalid", `decision "${decision.id}" takes exactly one option`);
  if (has(s.decisions, decision.id)) return rejected("already-decided", `decision "${decision.id}" was already answered correctly`);
  if (!evaluate(c, before, decision.requires)) {
    return rejected("requirements-unmet", t(decision.need, c.locales[0]) || `decision "${decision.id}" is locked`);
  }
  const correctIds = decision.options.filter((o) => o.correct).map((o) => o.id);
  // single: the chosen option is correct; multiple: the chosen set equals the set of correct options (§3.1)
  const correct =
    decision.kind === "single"
      ? correctIds.includes(chosen[0])
      : chosen.length === correctIds.length && chosen.every((id) => correctIds.includes(id));
  const firstTry = !s.attempts.some((x) => x.decisionId === decision.id);
  s.attempts.push({ decisionId: decision.id, optionIds: chosen, correct, at: s.clock });
  if (correct) s.decisions[decision.id] = s.clock;
  ctx.events.push({ type: "decision.answered", decisionId: decision.id, correct, firstTry, optionIds: chosen });
  return accepted(actionCost(c, "answer"));
}

function onIntervene(ctx: Ctx, a: Action<"intervene">): Outcome {
  const { c, s, before } = ctx;
  const intervention = c.interventions.find((i) => i.id === a.interventionId);
  if (!intervention) return rejected("unknown-id", `unknown intervention "${a.interventionId}"`);
  // a checklist step's out-of-order attempts are logged but use none of its doses
  const given = s.interventions.filter((r) => r.interventionId === intervention.id && !r.invalid).length;
  if (intervention.maxDoses != null && given >= intervention.maxDoses) {
    return rejected("max-doses", `"${intervention.id}" may be given at most ${intervention.maxDoses} time(s)`);
  }
  // an explicit hold (who placed it, why) stands until its holder records a reassessment and releases it
  const hold = activeHolds(s, intervention.id)[0];
  if (hold) {
    return rejected(
      "on-hold",
      `"${intervention.id}" is on hold — placed by ${hold.placedBy}: ${hold.reason}. It needs a recorded reassessment and release by ${hold.placedBy}.`,
    );
  }
  const appropriateness =
    intervention.contraindicatedWhen && evaluate(c, before, intervention.contraindicatedWhen)
      ? "contraindicated"
      : intervention.indicatedWhen && evaluate(c, before, intervention.indicatedWhen)
        ? "indicated"
        : "neutral";
  const invalid = intervention.checklist === true && appropriateness === "contraindicated";
  s.interventions.push({ interventionId: intervention.id, at: s.clock, appropriateness, seq: s.seq + 1, ...(invalid ? { invalid: true as const } : {}) });
  ctx.events.push({ type: "intervention.applied", interventionId: intervention.id, appropriateness, ...(invalid ? { invalid: true as const } : {}) });
  if (invalid) return accepted(actionCost(c, "intervene"));
  for (const flag of intervention.setFlags) {
    if (s.flags.includes(flag)) continue;
    s.flags.push(flag);
    ctx.events.push({ type: "flag.changed", flag, value: true });
  }
  return accepted(actionCost(c, "intervene"));
}

const sameHolder = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** An explicit hold on an intervention: who placed it and why (see the `hold` action). */
function onHold(ctx: Ctx, a: Action<"hold">): Outcome {
  const { c, s } = ctx;
  const intervention = c.interventions.find((i) => i.id === a.interventionId);
  if (!intervention) return rejected("unknown-id", `unknown intervention "${a.interventionId}"`);
  const given = s.interventions.filter((r) => r.interventionId === intervention.id && !r.invalid).length;
  if (intervention.maxDoses != null && given >= intervention.maxDoses) return rejected("invalid", `"${intervention.id}" has already been given; there is nothing left to hold`);
  if (activeHolds(s, intervention.id).some((h) => sameHolder(h.placedBy, a.placedBy))) {
    return rejected("invalid", `${a.placedBy} already holds "${intervention.id}"`);
  }
  s.holds = [...(s.holds ?? []), { interventionId: intervention.id, placedBy: a.placedBy, reason: a.reason, at: s.clock, seq: s.seq + 1 }];
  ctx.events.push({ type: "hold.placed", interventionId: intervention.id, placedBy: a.placedBy, reason: a.reason });
  return accepted();
}

/** Release a hold after a recorded reassessment: only whoever placed it can (another holder's hold still stands). */
function onReleaseHold(ctx: Ctx, a: Action<"release-hold">): Outcome {
  const { c, s } = ctx;
  if (!c.interventions.some((i) => i.id === a.interventionId)) return rejected("unknown-id", `unknown intervention "${a.interventionId}"`);
  const standing = activeHolds(s, a.interventionId);
  if (standing.length === 0) return rejected("invalid", `"${a.interventionId}" is not on hold`);
  const mine = standing.filter((h) => sameHolder(h.placedBy, a.releasedBy));
  if (mine.length === 0) {
    const by = [...new Set(standing.map((h) => h.placedBy))].join(", ");
    return rejected("requirements-unmet", `the hold on "${a.interventionId}" was placed by ${by}; only ${by} can release it, after a recorded reassessment`);
  }
  const released = { by: a.releasedBy, reassessment: a.reassessment, at: s.clock, seq: s.seq + 1 };
  s.holds = (s.holds ?? []).map((h) => (mine.includes(h) ? { ...h, released } : h));
  ctx.events.push({ type: "hold.released", interventionId: a.interventionId, releasedBy: a.releasedBy, reassessment: a.reassessment });
  return accepted();
}

function onAdvanceTime(a: Action<"advance-time">): Outcome {
  return accepted(a.minutes);
}

function onFlag(ctx: Ctx, a: Action<"flag">): Outcome {
  const { s } = ctx;
  const present = s.flags.includes(a.flag);
  if (a.value && !present) s.flags.push(a.flag);
  if (!a.value && present) s.flags = s.flags.filter((f) => f !== a.flag);
  if (a.value !== present) ctx.events.push({ type: "flag.changed", flag: a.flag, value: a.value });
  return accepted();
}

function onNote(ctx: Ctx, a: Action<"note">): Outcome {
  ctx.s.notes.push({ at: ctx.s.clock, text: a.text });
  ctx.events.push({ type: "note.added" });
  return accepted();
}

/**
 * One step of the operation (docs/PROCEDURE.md §5): the field changes only here. Closure reads the count (docs/TEAM.md
 * §4.3): while it is not settled, closure is refused (`team.count.closure: "refuse"`) or carried out and recorded as
 * an unsafe progression — kept for the debrief whatever is pressed later.
 */
function onOperate(ctx: Ctx, a: Action<"operate">): Outcome {
  const def = procedureFor(ctx.c, ctx.s);
  if (!def) return rejected("invalid", "this case has no operation");
  if (!def.phases.includes(ctx.s.phase)) return rejected("phase-locked", `the operation is not under way in phase "${ctx.s.phase}"`);
  const open = a.op.op === "close" ? closureOnOpenCount(ctx.c, ctx.s) : null;
  if (open?.policy === "refuse") return rejected("requirements-unmet", openCountMessage(open));
  // the operation's first step: it opens with the equipment as recorded so far (a fault before it stays a fault)
  const step = operate(def, procedureStateOf(ctx.s), a.op, ctx.s.clock, a.actor);
  if (step.rejected) return rejected(step.rejected.code, step.rejected.message);
  ctx.s.procedure = step.state;
  const n = step.state.counters.steps;
  ctx.events.push({ type: "procedure.step", op: a.op.op, signals: step.signals, id: `op-${n}`, step: n, seq: ctx.s.seq + 1, at: ctx.s.clock, ...(a.by ? { by: a.by } : {}), ...(a.actor ? { actor: a.actor } : {}), detail: structuredClone(a.op) });
  if (open && ctx.s.count) {
    ctx.s.count = { ...ctx.s.count, unsafe: [...ctx.s.count.unsafe, { what: "closure", status: open.status, missing: open.missing, unexpected: open.unexpected, at: ctx.s.clock, seq: ctx.s.seq + 1 }] };
    ctx.events.push({ type: "count.unsafe", what: "closure", status: open.status, missing: open.missing, unexpected: open.unexpected });
  }
  return accepted(ctx.c.clock.mode === "simulated" ? step.minutes : 0);
}

function openCountMessage(open: { status: string; missing: string[]; unexpected: string[] }): string {
  const parts = [open.missing.length ? `missing: ${open.missing.join(", ")}` : "", open.unexpected.length ? `not in the count: ${open.unexpected.join(", ")}` : ""].filter(Boolean);
  return `the count is ${open.status}${parts.length ? ` (${parts.join("; ")})` : ""}: closure waits for a reconciled count, or an escalation and a clear scan of the patient`;
}

/** A count's figures for its event: stage, accounted for of the items in the count, missing, not in the count. */
function countFigures(r: NonNullable<SessionState["count"]>, e: Extract<NonNullable<SessionState["count"]>["entries"][number], { op: "count" }>) {
  const { expected, transferred } = countLedger(r);
  const of = expected.filter((id) => !transferred.includes(id)).length;
  const missing = e.missing ?? [];
  return { stage: e.stage, accounted: of - missing.length, of, missing, unexpected: e.unexpected ?? [] };
}

/** A new investigation's order, acquisition, release or review (docs/STUDIES.md). A retried order is unchanged. */
function onStudy(ctx: Ctx, a: Action<"study">): Outcome {
  const r = applyStudy(ctx.c, ctx.s, a.study);
  if (!r.ok) return rejected(r.code, r.message);
  if (!r.changed) return { kind: "unchanged" };
  ctx.s.studies = r.record;
  const code = a.study.op === "order" ? a.study.code : (r.record.orders.find((o) => o.id === r.id || o.accessions.includes(r.id ?? ""))?.code ?? "");
  ctx.events.push({ type: "study.recorded", op: a.study.op, code, id: r.id ?? "", ...(a.study.op === "wait" ? { reason: a.study.reason } : {}) });
  return accepted();
}

/** A step of anaesthesia responsibility: a relief requested or arrived, a hand-over accepted (`engine/anaesthesia.ts`). */
function onAnaesthesia(ctx: Ctx, a: Action<"anaesthesia">): Outcome {
  const r = applyAnaesthesia(ctx.c, ctx.s, a.anaesthesia);
  if (!r.ok) return rejected(r.code, r.message);
  ctx.s.anaesthesia = r.record;
  ctx.events.push({ type: "anaesthesia.recorded", op: a.anaesthesia.op, responsible: r.record.responsible, ...(r.record.relief ? { relief: r.record.relief } : {}) });
  return accepted();
}

/**
 * The operation's equipment supply (docs/PROCEDURE.md "Equipment"): no picture without a working camera and light
 * source; without gas the pneumoperitoneum is lost at once. The same supply again changes nothing.
 */
/**
 * What the equipment supplies, recorded apart from the operation (`SessionState.equipment`); an operation under way
 * follows it (no gas: the pneumoperitoneum is lost). Before the operation opens it is an equipment fault only — no
 * operative state is made, nothing counts as begun.
 */
function onProcedureSupply(ctx: Ctx, a: Action<"procedure-supply">): Outcome {
  const p = ctx.s.procedure;
  const was = p?.supply ?? ctx.s.equipment;
  const now = { image: was?.image !== false, gas: was?.gas !== false };
  if (now.image === a.supply.image && now.gas === a.supply.gas) return { kind: "unchanged" };
  ctx.s.equipment = { image: a.supply.image, gas: a.supply.gas, ...(a.supply.source ? { source: a.supply.source } : {}) };
  let deflated = false;
  if (p) {
    const next = structuredClone(p);
    next.supply = { image: a.supply.image, gas: a.supply.gas };
    deflated = !a.supply.gas && next.insufflated;
    if (deflated) {
      next.insufflated = false;
      next.pressure = 0;
    }
    ctx.s.procedure = next;
  }
  ctx.events.push({ type: "procedure.supply", image: a.supply.image, gas: a.supply.gas, ...(a.supply.source ? { source: a.supply.source } : {}), ...(deflated ? { deflated: true as const } : {}) });
  return accepted();
}

/** A step of a staff member's response to a critical alarm (`engine/alarm.ts`); an unchanged one changes nothing. */
function onAlarmResponse(ctx: Ctx, a: Action<"alarm-response">): Outcome {
  const r = applyAlarm(ctx.s, a.alarm);
  if (!r.ok) return rejected(r.code, r.message);
  if (!r.changed) return { kind: "unchanged" };
  ctx.s.alarms = r.alarms;
  const by = "by" in a.alarm ? a.alarm.by : undefined;
  ctx.events.push({ type: "alarm.response", op: a.alarm.op, id: r.id, vital: a.alarm.vital, ...(by ? { by } : {}), ...(a.alarm.op === "blocked" ? { reason: a.alarm.reason } : {}) });
  return accepted();
}

/** An entry of the surgical count's record (docs/TEAM.md §4.3), by item identity. */
function onCount(ctx: Ctx, a: Action<"count">): Outcome {
  const { c, s } = ctx;
  const r = applyCount(c, s.count, a.count, s.clock, s.seq + 1);
  if (!r.ok) return rejected(r.code, r.message);
  s.count = r.record;
  const e = r.entry;
  ctx.events.push({
    type: "count.recorded",
    op: e.op,
    staff: e.staff,
    status: countStatus(r.record),
    ...(e.op === "count" ? countFigures(r.record, e) : {}),
    ...(e.op === "scan" ? { detected: e.detected } : {}),
  });
  return accepted();
}

function onFinish(ctx: Ctx): Outcome {
  const p = progress(ctx.c, ctx.s);
  if (!p.complete) return rejected("objectives-incomplete", `${p.total - p.done} objective(s) still open`);
  ctx.s.finished = true;
  ctx.events.push({ type: "case.finished", timedOut: false });
  return accepted();
}

function dispatch(ctx: Ctx, a: ClinicalAction): Outcome {
  switch (a.type) {
    case "start":
      return onStart(ctx, a);
    case "ask":
      return onAsk(ctx, a);
    case "examine":
      return onExamine(ctx, a);
    case "order":
      return onOrder(ctx, a);
    case "read":
      return onRead(ctx, a);
    case "set-phase":
      return onSetPhase(ctx, a);
    case "hint":
      return onHint(ctx);
    case "answer":
      return onAnswer(ctx, a);
    case "intervene":
      return onIntervene(ctx, a);
    case "advance-time":
      return onAdvanceTime(a);
    case "flag":
      return onFlag(ctx, a);
    case "note":
      return onNote(ctx, a);
    case "operate":
      return onOperate(ctx, a);
    case "hold":
      return onHold(ctx, a);
    case "release-hold":
      return onReleaseHold(ctx, a);
    case "count":
      return onCount(ctx, a);
    case "study":
      return onStudy(ctx, a);
    case "anaesthesia":
      return onAnaesthesia(ctx, a);
    case "alarm-response":
      return onAlarmResponse(ctx, a);
    case "procedure-supply":
      return onProcedureSupply(ctx, a);
    case "finish":
      return onFinish(ctx);
  }
}

/* ------------------------------------------------------------------ */
/* reduce / replay                                                     */
/* ------------------------------------------------------------------ */

function rejection(s: SessionState, action: ClinicalActionType, code: RejectionCode, message: string, a?: ClinicalAction): ReduceResult {
  // a refused operative step carries what was asked and where in the record (the scope shows it in order)
  const op = a?.type === "operate" ? { at: s.clock, after: s.seq, detail: structuredClone(a.op), ...(a.actor ? { actor: a.actor } : {}) } : {};
  return { state: s, events: [{ type: "action.rejected", action, code, message, ...op }], rejected: { code, message } };
}

function guard(s: SessionState, type: ClinicalActionType): { code: RejectionCode; message: string } | null {
  if (s.finished) return { code: "finished", message: "the case has finished" };
  if (!s.started && !PRE_START_ALLOWED.has(type)) return { code: "not-started", message: "start the case first" };
  return null;
}

function describeInvalid(action: unknown, issues: { path: (string | number)[]; message: string }[]): string {
  const first = issues[0];
  const where = first && first.path.length ? `${first.path.join(".")}: ` : "";
  return `invalid action${typeof action === "object" && action && "type" in action ? ` "${String((action as { type: unknown }).type)}"` : ""}: ${where}${first?.message ?? "malformed"}`;
}

/**
 * Apply one action. Rejections return the input state unchanged with a
 * single `action.rejected` event and `rejected` set. Accepted actions return
 * a new state, the action's events and the events of everything that
 * followed from it (results ready, scenario events, alarms, phase changes,
 * objectives, timeout).
 */
export function reduce(c: CaseDefinition, s: SessionState, a: ClinicalAction): ReduceResult {
  const parsed = ClinicalActionSchema.safeParse(a);
  if (!parsed.success) {
    const type = (typeof a === "object" && a && "type" in a ? String(a.type) : "invalid") as ClinicalActionType;
    return rejection(s, type, "invalid", describeInvalid(a, parsed.error.issues));
  }
  const action = parsed.data;
  const blocked = guard(s, action.type);
  if (blocked) return rejection(s, action.type, blocked.code, blocked.message, action);

  const ctx: Ctx = { c, before: s, s: cloneState(s), events: [] };
  const outcome = dispatch(ctx, action);
  if (outcome.kind === "rejected") return rejection(s, action.type, outcome.code, outcome.message, action);
  if (outcome.kind === "unchanged") return { state: s, events: ctx.events };

  ctx.s.seq += 1;
  if (ctx.s.started && !ctx.s.finished) {
    const timeline = openTimeline(c, s, ctx.s, ctx.events);
    settle(timeline);
    if (outcome.cost > 0) advanceClock(timeline, ctx.s.clock + outcome.cost);
  }
  return { state: ctx.s, events: ctx.events };
}

/** Replay actions from a fresh session. Rejected actions are recorded and skipped. */
export function replay(c: CaseDefinition, actions: ClinicalAction[]): ReplayResult {
  let state = createSession(c);
  const events: DomainEvent[] = [];
  const rejections: ReplayRejection[] = [];
  actions.forEach((action, index) => {
    const result = reduce(c, state, action);
    state = result.state;
    events.push(...result.events);
    if (result.rejected) rejections.push({ index, action, ...result.rejected });
  });
  return { state, events, rejections };
}
