/**
 * Post-action processing: everything that happens "because time passed or
 * the facts changed" (docs/ARCHITECTURE.md §3.1).
 *
 * After an accepted action the reducer calls `settle` at the current clock
 * and, when the action consumed simulated time, `advanceClock`, which walks
 * every integer minute up to the target (plus the target itself and any
 * fractional `atMinute`/`readyAt` in between) and at each step:
 *
 * 1. emits `result.ready` for orders whose `readyAt` was crossed;
 * 2. settles: fires due scenario events (`atMinute` reached or `when` true),
 *    records trend stops (`until` true), applies automatic phase transitions
 *    (an `enterWhen` that turned from false to true) and completes
 *    objectives — repeated until nothing changes, because each of these can
 *    enable another;
 * 3. latches the minute the bedside monitor is attached
 *    (`physiology.monitor.attachedWhen` first true → `monitorAttachedAt`);
 * 4. emits `vitals.alarm` for vitals whose alarm level rose (a monitor just
 *    attached alarms on every abnormal monitored vital, like at `start`);
 * 5. finishes the case with `timedOut: true` when `clock.limitMinutes` is reached.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { VitalKey } from "../schema/common.js";
import type { DomainEvent, SessionState } from "../schema/session.js";
import { evaluate, resultFor } from "./conditions.js";
import { alarmsAt, unmeasurableAt } from "./physiology.js";
import type { AlarmLevel } from "./types.js";

/** Mutable working context shared by the reducer and the timeline. */
export interface Timeline {
  c: CaseDefinition;
  /** Draft state (already a private copy — safe to mutate). */
  s: SessionState;
  events: DomainEvent[];
  /** `enterWhen` truth per phase at the last check (edge detection). */
  phaseTruth: Map<string, boolean>;
  /** Alarm level per vital at the last check. */
  alarmLevels: Partial<Record<VitalKey, AlarmLevel>>;
}

const LEVEL_RANK: Record<AlarmLevel, number> = { warning: 1, critical: 2 };

function rank(level: AlarmLevel | undefined): number {
  return level ? LEVEL_RANK[level] : 0;
}

function levelsAt(c: CaseDefinition, s: SessionState): Partial<Record<VitalKey, AlarmLevel>> {
  const levels: Partial<Record<VitalKey, AlarmLevel>> = {};
  for (const alarm of alarmsAt(c, s, s.clock)) levels[alarm.vital] = alarm.level;
  return levels;
}

function phaseTruthOf(c: CaseDefinition, s: SessionState): Map<string, boolean> {
  const truth = new Map<string, boolean>();
  for (const phase of c.phases) {
    if (phase.enterWhen) truth.set(phase.id, evaluate(c, s, phase.enterWhen));
  }
  return truth;
}

/**
 * Open a timeline for a draft produced from `before`. Edge detection
 * (phase transitions, alarms) compares against `before`. A session that had
 * not started yet has no history: abnormal vitals alarm at start, and an
 * `enterWhen` that is already true at start (e.g. made true by a pre-start
 * `flag`) counts as a false→true edge.
 */
export function openTimeline(c: CaseDefinition, before: SessionState, draft: SessionState, events: DomainEvent[]): Timeline {
  return {
    c,
    s: draft,
    events,
    phaseTruth: before.started ? phaseTruthOf(c, before) : new Map(),
    alarmLevels: before.started ? levelsAt(c, before) : {},
  };
}

function addFlag(tl: Timeline, flag: string): void {
  if (tl.s.flags.includes(flag)) return;
  tl.s.flags.push(flag);
  tl.events.push({ type: "flag.changed", flag, value: true });
}

function fireDueEvents(tl: Timeline): boolean {
  const { c, s } = tl;
  let changed = false;
  for (const event of c.physiology?.events ?? []) {
    if (Object.prototype.hasOwnProperty.call(s.firedEvents, event.id)) continue;
    const due = (event.atMinute != null && s.clock >= event.atMinute) || (event.when != null && evaluate(c, s, event.when));
    if (!due) continue;
    s.firedEvents[event.id] = s.clock;
    if (event.setVitals) s.baselineOverrides = { ...s.baselineOverrides, ...event.setVitals };
    tl.events.push({ type: "scenario.event", eventId: event.id, severity: event.severity });
    for (const flag of event.setFlags) addFlag(tl, flag);
    changed = true;
  }
  return changed;
}

function stopTrends(tl: Timeline): boolean {
  const { c, s } = tl;
  let changed = false;
  for (const trend of c.physiology?.trends ?? []) {
    if (!trend.until || Object.prototype.hasOwnProperty.call(s.trendStops, trend.id)) continue;
    if (!evaluate(c, s, trend.until)) continue;
    s.trendStops[trend.id] = s.clock;
    changed = true;
  }
  return changed;
}

function applyPhaseEdges(tl: Timeline): boolean {
  const { c, s } = tl;
  let changed = false;
  for (const phase of c.phases) {
    if (!phase.enterWhen) continue;
    const now = evaluate(c, s, phase.enterWhen);
    const was = tl.phaseTruth.get(phase.id) ?? false;
    tl.phaseTruth.set(phase.id, now);
    if (!now || was || s.phase === phase.id) continue;
    tl.events.push({ type: "phase.changed", from: s.phase, to: phase.id, automatic: true });
    s.phase = phase.id;
    changed = true;
  }
  return changed;
}

/** Record newly completed objectives (definition order); emit `case.completed` when the last one completes. */
export function completeObjectives(tl: Timeline): boolean {
  const { c, s } = tl;
  let completed = 0;
  c.objectives.forEach((objective, index) => {
    if (Object.prototype.hasOwnProperty.call(s.objectivesDone, objective.id)) return;
    if (!evaluate(c, s, objective.completeWhen)) return;
    s.objectivesDone[objective.id] = s.clock;
    tl.events.push({ type: "objective.completed", objectiveId: objective.id, index });
    completed++;
  });
  if (completed > 0 && c.objectives.every((o) => Object.prototype.hasOwnProperty.call(s.objectivesDone, o.id))) {
    tl.events.push({ type: "case.completed" });
  }
  return completed > 0;
}

function checkAlarms(tl: Timeline): void {
  const { c, s } = tl;
  if (!c.physiology) return;
  const next: Partial<Record<VitalKey, AlarmLevel>> = {};
  let unread: VitalKey[] | null = null;
  for (const alarm of alarmsAt(c, s, s.clock)) {
    next[alarm.vital] = alarm.level;
    if (rank(alarm.level) > rank(tl.alarmLevels[alarm.vital])) {
      // An arrest's placeholder 0 is no reading: say so on the event, so no front-end prints "SBP 0 mmHg".
      unread ??= unmeasurableAt(c, s, s.clock);
      const event: Extract<DomainEvent, { type: "vitals.alarm" }> = { type: "vitals.alarm", vital: alarm.vital, level: alarm.level, value: alarm.value };
      if (unread.includes(alarm.vital)) event.unmeasurable = true;
      tl.events.push(event);
    }
  }
  tl.alarmLevels = next;
}

function emitReadyResults(tl: Timeline, from: number, to: number): void {
  const { c, s } = tl;
  for (const order of s.orders) {
    if (order.readyAt <= from || order.readyAt > to) continue;
    const result = resultFor(c, order.investigationId, order.phase);
    if (!result) continue;
    tl.events.push({ type: "result.ready", key: order.key, investigationId: order.investigationId, phase: order.phase, critical: result.critical });
  }
}

function checkLimit(tl: Timeline): boolean {
  const { c, s } = tl;
  const limit = c.clock.limitMinutes;
  if (limit == null || s.finished || s.clock < limit) return false;
  s.finished = true;
  tl.events.push({ type: "case.finished", timedOut: true });
  return true;
}

/**
 * Latch the minute the bedside monitor is attached: the first settle at which
 * `physiology.monitor.attachedWhen` holds. It stays attached afterwards, even
 * when the condition stops holding (a phase left behind, a flag cleared).
 */
function attachMonitor(tl: Timeline): void {
  const { c, s } = tl;
  const monitor = c.physiology?.monitor;
  if (!monitor || s.monitorAttachedAt != null) return;
  if (evaluate(c, s, monitor.attachedWhen)) s.monitorAttachedAt = s.clock;
}

/** Settle the draft at its current clock (see module docs, step 2–4). */
export function settle(tl: Timeline): void {
  const maxPasses = 2 + settleBound(tl.c);
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = fireDueEvents(tl);
    changed = stopTrends(tl) || changed;
    changed = applyPhaseEdges(tl) || changed;
    changed = completeObjectives(tl) || changed;
    if (!changed) break;
  }
  attachMonitor(tl);
  checkAlarms(tl);
}

/** Upper bound on settle passes: every pass that changes something consumes at least one of these. */
function settleBound(c: CaseDefinition): number {
  return (c.physiology?.events.length ?? 0) + (c.physiology?.trends.length ?? 0) + c.phases.length + c.objectives.length;
}

/**
 * Clock values to settle at when moving from `from` to `to`: every integer
 * minute strictly between them, plus the exact (possibly fractional) times
 * at which something is scheduled — scenario events' `atMinute` and orders'
 * `readyAt` — so they happen at their own minute, then `to` itself.
 */
function steps(tl: Timeline, from: number, to: number): number[] {
  const points = new Set<number>();
  for (let m = Math.floor(from) + 1; m < to; m++) points.add(m);
  const scheduled = [
    ...(tl.c.physiology?.events ?? []).map((e) => e.atMinute),
    ...(tl.c.clock.mode === "simulated" ? tl.s.orders.map((o) => o.readyAt) : []),
  ];
  for (const at of scheduled) if (at != null && at > from && at < to) points.add(at);
  points.add(to);
  return [...points].sort((a, b) => a - b);
}

/**
 * Move the draft clock to `to` (capped at `clock.limitMinutes`), processing
 * every intermediate minute (and scheduled fractional time). Emits
 * `time.advanced` once.
 */
export function advanceClock(tl: Timeline, to: number): void {
  const { c, s } = tl;
  const limit = c.clock.limitMinutes;
  const target = limit != null ? Math.min(to, limit) : to;
  if (target <= s.clock) {
    checkLimit(tl);
    return;
  }
  tl.events.push({ type: "time.advanced", from: s.clock, to: target });
  for (const minute of steps(tl, s.clock, target)) {
    const previous = s.clock;
    s.clock = minute;
    emitReadyResults(tl, previous, minute);
    settle(tl);
    if (checkLimit(tl)) break;
  }
}
