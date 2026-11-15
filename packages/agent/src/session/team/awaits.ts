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

/** A reply to a line said to the learner (`team reply {kind}`). */
export type ReplyKind = "readback" | "confirm" | "decline" | "report";

/** Whether the learner has answered a line said to their member (a reply of theirs to it). */
export function answered(state: Pick<TeamState, "messages">, m: Pick<TeamMessage, "id">): boolean {
  return state.messages.some((x) => x.replyTo === m.id && x.from === PRIMARY_ACTOR);
}

/**
 * What the stand-in waits on the learner for now, as a text front-end shows it (`learnerAwaited`): the latest line of
 * its open request said to them — its request, its confirmation of their read-back, its stop, its word that it cannot go
 * on — and whether they have answered it (the stand-in goes on in its next round), or the count it waits for before
 * closing. Null when nothing waits on them (observing included).
 */
export function awaitedLine(state: Pick<TeamState, "tasks" | "members" | "messages">, surgeon: SurgeonMode): { kind: "line"; task: TeamTask; message: TeamMessage; answered: boolean } | { kind: "count"; task: TeamTask } | null {
  const task = learnerAwaited(state, surgeon);
  if (!task) return null;
  const thread = task.request?.to === PRIMARY_ACTOR ? task.request.thread : null;
  const message = thread ? [...state.messages].reverse().find((m) => m.thread === thread && m.to === PRIMARY_ACTOR) : undefined;
  if (message) return { kind: "line", task, message, answered: answered(state, message) };
  return task.reason === "count" ? { kind: "count", task } : null;
}

/**
 * The replies that fit a line said to the learner's own member while they play their part (learner mode; observing:
 * none), until they have answered it — what the browser's team window offers, for a text front-end (the `/team`
 * command, the `team` tool of an external agent):
 * - the stand-in's stop after their Stop, or its word that it cannot go on, open (`haltOf`): `confirm` — "go on";
 * - a request: `readback` — and, about the field, `decline` (they cannot);
 * - a read-back of the learner's own ask or need: `confirm` or `decline`;
 * - the confirmation of their read-back of a request about the field: theirs to do, then `report`;
 * - an escalation: `report` — understood.
 * What the stand-in says is about its open request: a request it gave up, or saw done in the field, is over.
 */
export function repliesTo(state: Pick<TeamState, "tasks" | "members" | "messages">, surgeon: SurgeonMode, m: TeamMessage): ReplyKind[] {
  if (surgeon !== "learner" || m.to !== PRIMARY_ACTOR || answered(state, m)) return [];
  const standIn = state.tasks.some((x) => x.kind === "operate" && x.owner === m.from);
  if (standIn) {
    const open = learnerAwaited(state, "learner")?.request;
    if (open?.to !== PRIMARY_ACTOR || open.thread !== m.thread) return [];
  }
  if (haltOf(state, m)) return ["confirm"];
  if (m.kind === "request") return m.about.field ? ["readback", "decline"] : ["readback"];
  if (m.kind === "readback") return ["confirm", "decline"];
  if (m.kind === "confirm") {
    const asked = state.messages.find((x) => x.thread === m.thread && x.to === PRIMARY_ACTOR && x.kind === "request" && x.about.field);
    const readBack = state.messages.some((x) => x.thread === m.thread && x.from === PRIMARY_ACTOR && x.kind === "readback");
    return asked && readBack ? ["report"] : [];
  }
  return m.kind === "escalate" ? ["report"] : [];
}
