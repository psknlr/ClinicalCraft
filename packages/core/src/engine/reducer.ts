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
import { evaluate, resultFor, resultKey } from "./conditions.js";
import { currentObjective, progress } from "./queries.js";
import { historyVoice } from "./speech.js";
import { advanceClock, openTimeline, settle } from "./timeline.js";
import { supersededIn } from "./twins.js";
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

function onStart(ctx: Ctx): Outcome {
  if (ctx.s.started) return rejected("invalid", "session already started");
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
  if (!phase.learnerSwitchable) return rejected("phase-locked", `phase "${phase.id}" cannot be selected manually`);
  if (s.phase !== phase.id) {
    ctx.events.push({ type: "phase.changed", from: s.phase, to: phase.id, automatic: false });
    s.phase = phase.id;
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
  const given = s.interventions.filter((r) => r.interventionId === intervention.id).length;
  if (intervention.maxDoses != null && given >= intervention.maxDoses) {
    return rejected("max-doses", `"${intervention.id}" may be given at most ${intervention.maxDoses} time(s)`);
  }
  const appropriateness =
    intervention.contraindicatedWhen && evaluate(c, before, intervention.contraindicatedWhen)
      ? "contraindicated"
      : intervention.indicatedWhen && evaluate(c, before, intervention.indicatedWhen)
        ? "indicated"
        : "neutral";
  s.interventions.push({ interventionId: intervention.id, at: s.clock, appropriateness });
  ctx.events.push({ type: "intervention.applied", interventionId: intervention.id, appropriateness });
  for (const flag of intervention.setFlags) {
    if (s.flags.includes(flag)) continue;
    s.flags.push(flag);
    ctx.events.push({ type: "flag.changed", flag, value: true });
  }
  return accepted(actionCost(c, "intervene"));
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
      return onStart(ctx);
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
    case "finish":
      return onFinish(ctx);
  }
}

/* ------------------------------------------------------------------ */
/* reduce / replay                                                     */
/* ------------------------------------------------------------------ */

function rejection(s: SessionState, action: ClinicalActionType, code: RejectionCode, message: string): ReduceResult {
  return { state: s, events: [{ type: "action.rejected", action, code, message }], rejected: { code, message } };
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
  if (blocked) return rejection(s, action.type, blocked.code, blocked.message);

  const ctx: Ctx = { c, before: s, s: cloneState(s), events: [] };
  const outcome = dispatch(ctx, action);
  if (outcome.kind === "rejected") return rejection(s, action.type, outcome.code, outcome.message);
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
