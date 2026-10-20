/**
 * Concise, localised text of world tool results (embodied mode): what a
 * model or a learner reads. Typed payloads (`data`) carry the full
 * observation / inspection / action result for UIs. Never case facts: the
 * world's observations already hold only public data (EMBODIED R7).
 */
import { t } from "@clinicalcraft/core";
import type { ActionHint, ActorState, ObservedEntity, WorldActionResult, WorldObservation, WorldRuntime } from "@clinicalcraft/world";
import { isZh, joinList, rt, type RuntimeKey } from "../session/i18n.js";

const round1 = (v: number) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : v);

/** A bearing (degrees, + = right) as a direction word. */
export function directionText(bearing: number, locale: string): string {
  const b = Math.abs(bearing);
  const side = bearing >= 0 ? "Right" : "Left";
  if (b <= 25) return rt(locale, "dir.ahead");
  if (b <= 70) return rt(locale, `dir.ahead${side}` as RuntimeKey);
  if (b <= 135) return rt(locale, side === "Right" ? "dir.right" : "dir.left");
  return rt(locale, "dir.behind");
}

function cuesText(cues: Record<string, string> | undefined, locale: string): string {
  if (!cues) return "";
  const parts = Object.entries(cues)
    .filter(([, v]) => v !== "" && v !== "false")
    .map(([k, v]) => (v === "true" ? k : `${k}: ${v}`));
  return parts.length ? joinList(locale, parts) : "";
}

/** One entity line (`- name [id] · 2.1 m ahead · state · in reach · can: …`). */
export function entityLine(e: ObservedEntity, locale: string, actorLevel: string): string {
  const direction = e.level !== actorLevel ? rt(locale, "dir.otherLevel", { level: e.level }) : directionText(e.bearing, locale);
  // a movable thing not perceived: where it is believed to be ("usually kept in …", "last seen in …")
  const where = e.lastKnown ? (isZh(locale) ? `（${e.lastKnown.label}）` : ` (${e.lastKnown.label})`) : null;
  const awareness = where ?? (e.awareness === "remembered" ? rt(locale, "world.entity.awareness.remembered") : e.awareness === "mapped" ? rt(locale, "world.entity.awareness.mapped") : "");
  const cues = cuesText(e.cues, locale);
  return (
    rt(locale, "world.entity", {
      name: e.name,
      id: e.id,
      distance: round1(e.distance),
      direction,
      state: e.state ? rt(locale, "world.entity.state", { state: e.state }) : "",
      reach: e.inReach ? rt(locale, "world.entity.inReach") : "",
      actions: e.availableActions.length ? rt(locale, "world.entity.actions", { actions: e.availableActions.join(", ") }) : "",
      cues: cues ? rt(locale, "world.entity.cues", { cues }) : "",
    }) + awareness
  );
}

/** "You are in … at … facing …" for an actor. */
export function whereText(world: WorldRuntime, actor: Pick<ActorState, "pose" | "room">, locale: string, clock: string): string {
  // no room: a building's corridor, or the facility's outdoor region (never "outside / a corridor")
  const room = actor.room ? (world.entity(`room:${actor.room}`) ? nameOf(world, `room:${actor.room}`, locale) : actor.room) : world.regionName({ level: actor.pose.level, x: actor.pose.x, z: actor.pose.z }, locale);
  const level = world.levels.find((l) => l.id === actor.pose.level);
  const levelName = level ? t(level.name, locale) : actor.pose.level;
  return rt(locale, "world.where", { room, level: levelName, x: round1(actor.pose.x), z: round1(actor.pose.z), facing: compass(actor.pose.yaw, locale), clock });
}

/** Localised name of a registry entity (falls back to the id). */
export function nameOf(world: WorldRuntime, id: string, locale: string): string {
  const e = world.entity(id);
  return e ? t(e.name, locale) : id;
}

/** Compass direction of a yaw (0 looks towards −Z = north). */
function compass(yaw: number, locale: string): string {
  const deg = (((-yaw * 180) / Math.PI) % 360 + 360) % 360; // clockwise from north
  const en = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  const zh = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const i = Math.round(deg / 45) % 8;
  return (isZh(locale) ? zh : en)[i]!;
}

/** The text of an observation (`observe_world`, `/look`). */
export function observationText(world: WorldRuntime, obs: WorldObservation, locale: string, clock: string): string {
  const lines = [whereText(world, obs.actor, locale, clock)];
  if (obs.actor.holding.length) lines.push(rt(locale, "world.holding", { items: joinList(locale, obs.actor.holding.map((id) => nameOf(world, id, locale))) }));
  if (obs.actor.task) lines.push(rt(locale, "world.task", { task: obs.actor.task.label }));
  if (obs.entities.length) {
    lines.push(rt(locale, "world.seen"));
    for (const e of obs.entities) lines.push(entityLine(e, locale, obs.actor.level));
    if (obs.truncated) lines.push(rt(locale, "world.truncated"));
  } else lines.push(rt(locale, "world.nothingSeen"));
  if (obs.recentEvents.length) lines.push(rt(locale, "world.recent", { events: obs.recentEvents.map((e) => e.summary).filter(Boolean).slice(-4).join(isZh(locale) ? "；" : "; ") }));
  return lines.join("\n");
}

/** A list of entities (`find_entities`, `find_objects`, nearby/visible lists). */
export function entitiesText(list: readonly ObservedEntity[], locale: string, actorLevel: string): string {
  if (!list.length) return rt(locale, "world.foundNone");
  return [rt(locale, "world.found", { count: list.length }), ...list.map((e) => entityLine(e, locale, actorLevel))].join("\n");
}

/** The text of an inspection (`inspect_object`). */
export function inspectionText(i: NonNullable<ReturnType<WorldRuntime["inspect"]>>, locale: string, actorLevel: string): string {
  const lines = [rt(locale, "world.inspect", { name: i.name, id: i.id, description: i.description || "—" }), entityLine(i, locale, actorLevel)];
  if (i.usage) lines.push(rt(locale, "world.inspect.usage", { usage: i.usage }));
  for (const op of i.operations) {
    lines.push(rt(locale, "world.inspect.op", { name: op.name, op: op.op, status: op.available ? rt(locale, "world.inspect.available") : rt(locale, "world.inspect.unavailable", { reason: op.reason ?? "—" }) }));
  }
  return lines.join("\n");
}

/** The text of a room report (`get_room_info`). */
export function roomText(info: NonNullable<ReturnType<WorldRuntime["roomInfo"]>>, locale: string, actorLevel: string): string {
  const exits = info.exits.length ? info.exits.map((x) => rt(locale, "world.room.exit", { door: x.door, to: x.to ? `${x.toName} (${x.to})` : x.toName })).join(isZh(locale) ? "；" : "; ") : rt(locale, "world.room.none");
  const lines = [rt(locale, "world.room", { name: info.name, id: info.id, kind: info.kind, level: info.level, exits })];
  if (info.entities.length) lines.push(...info.entities.map((e) => entityLine(e, locale, actorLevel)));
  return lines.join("\n");
}

/**
 * The tool call a hint's `then` asks for once there, as a model makes it (extra review item 2: the learner
 * sentence names no tool; this line does): `transport_patient {"destination":…}` or
 * `interact_object {"target":…,"operation":…,"parameters":…}` (a cart to wheel: `move_to` with its goal).
 */
export function thenCall(then: NonNullable<ActionHint["then"]>): string {
  if (then.operation === "transport_patient") return `transport_patient ${JSON.stringify(then.parameters ?? {})}`;
  const parameters = { ...(then.parameters ?? {}), ...(then.goal ? { goal: then.goal } : {}) };
  return `interact_object ${JSON.stringify({ target: then.targetId, operation: then.operation, ...(Object.keys(parameters).length ? { parameters } : {}) })}`;
}

/** The lines of a hint for a model: where to go (`navigate_to`), then what to call there. */
export function hintLines(hint: ActionHint, locale: string): string[] {
  const lines = [rt(locale, "spatial.hint", { goal: JSON.stringify(hint.goal), label: hint.label })];
  if (hint.then) lines.push(rt(locale, "spatial.then", { call: thenCall(hint.then) }));
  return lines;
}

/** The text of a world action result (its own localised message, plus the hint when it failed). */
export function actionResultText(result: WorldActionResult, locale: string): string {
  const lines = [result.errorCode ? `${result.message} [${result.errorCode}]` : result.message];
  if (result.status !== "completed" && result.hint) lines.push(...hintLines(result.hint, locale));
  return lines.join("\n");
}
