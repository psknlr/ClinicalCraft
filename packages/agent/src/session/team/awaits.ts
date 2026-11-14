/**
 * What the stand-in surgeon waits on the learner for (docs/TEAM.md §4.5): one rule for the scheduler — a `team run` in
 * learner mode stops there (`TeamScheduler.awaitsLearner`) — and for a front-end, which shows it as the learner's to do
 * (the web's team panel). Read from the team's own record (`TeamState`), nothing else: pure.
 */
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import type { SurgeonMode, TeamMessage, TeamState, TeamTask } from "./types.js";

const TERMINAL = new Set(["done", "declined", "escalated"]);

/**
 * The stand-in's plan task (`operate`, not ended) that waits on the learner playing their place, in learner mode: its
 * request said to them open — a camera, a traction, a pass, their own step of the reference, its stop after their Stop
 * (`stop:<k>`), its word that it cannot go on (`cannot:<k>`) —, or the closure while the count it waits for is theirs to
 * say (their member holds the `count` duty). Null: nothing waits on them (observing: their part is played for them).
 */
export function learnerAwaited(state: Pick<TeamState, "tasks" | "members">, surgeon: SurgeonMode): TeamTask | null {
  if (surgeon !== "learner") return null;
  const counts = state.members.find((m) => m.id === PRIMARY_ACTOR)?.duties.includes("count") ?? false;
  return state.tasks.find((t) => t.kind === "operate" && !TERMINAL.has(t.status) && (t.request?.to === PRIMARY_ACTOR || (counts && t.reason === "count"))) ?? null;
}

/**
 * A halt of the stand-in's the learner ends with their word (`team reply {kind: "confirm"}`): its stop after their Stop
 * to a call-out (`stop`), its word that it cannot go on (`cannot`) — when `m` is what it said for that halt, still open.
 * Null: `m` is no open halt of the stand-in's.
 */
export function haltOf(state: Pick<TeamState, "tasks">, m: Pick<TeamMessage, "thread" | "to">): "stop" | "cannot" | null {
  if (m.to !== PRIMARY_ACTOR) return null;
  for (const t of state.tasks) {
    const req = t.kind === "operate" && !TERMINAL.has(t.status) ? t.request : undefined;
    if (!req || req.thread !== m.thread) continue;
    if (req.key.startsWith("stop:")) return "stop";
    if (req.key.startsWith("cannot:")) return "cannot";
  }
  return null;
}
