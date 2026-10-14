/**
 * Read-only session queries used by every front-end (quest track, waypoint,
 * evidence board, order list).
 */
import type { CaseDefinition, Objective } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { evaluate, isOrderReady } from "./conditions.js";
import type { DecisionAvailability, ObjectiveProgress, OrderStatus } from "./types.js";

function isDone(s: SessionState, objectiveId: string): boolean {
  return Object.prototype.hasOwnProperty.call(s.objectivesDone, objectiveId);
}

/**
 * Objective progress. Completion is sticky (recorded in `objectivesDone`);
 * the current objective is the first one not yet done (V4 quest order).
 */
export function progress(c: CaseDefinition, s: SessionState): ObjectiveProgress {
  const firstOpen = c.objectives.findIndex((o) => !isDone(s, o.id));
  const currentIndex = firstOpen < 0 ? c.objectives.length : firstOpen;
  const objectives = c.objectives.map((o, index) => {
    const done = isDone(s, o.id);
    return done
      ? { id: o.id, done, doneAt: s.objectivesDone[o.id], current: index === currentIndex }
      : { id: o.id, done, current: index === currentIndex };
  });
  const done = objectives.filter((o) => o.done).length;
  return { objectives, currentIndex, done, total: c.objectives.length, complete: done === c.objectives.length };
}

/** The current objective definition, or null when every objective is done. */
export function currentObjective(c: CaseDefinition, s: SessionState): Objective | null {
  return c.objectives.find((o) => !isDone(s, o.id)) ?? null;
}

/** Target of the first waypoint of the current objective whose `unless` is false (or absent). */
export function currentWaypoint(c: CaseDefinition, s: SessionState): string | null {
  const objective = currentObjective(c, s);
  if (!objective) return null;
  const waypoint = objective.waypoints.find((w) => !w.unless || !evaluate(c, s, w.unless));
  return waypoint?.target ?? null;
}

/** Every decision with whether its `requires` condition holds and whether it was answered correctly. */
export function availableDecisions(c: CaseDefinition, s: SessionState): DecisionAvailability[] {
  return c.decisions.map((decision) => ({
    decision,
    unlocked: evaluate(c, s, decision.requires),
    decided: Object.prototype.hasOwnProperty.call(s.decisions, decision.id),
  }));
}

/** Orders in placement order with readiness (turnaround elapsed) and read status. */
export function orderStatus(c: CaseDefinition, s: SessionState): OrderStatus[] {
  return s.orders.map((order) => ({ order, ready: isOrderReady(c, s, order), read: s.seen.includes(order.key) }));
}
