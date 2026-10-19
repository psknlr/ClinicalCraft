/**
 * Perception (EMBODIED §4, R7): what an actor knows about the world, with
 * an awareness level per entity — never more.
 *
 * - `visible`: same level, within `visibilityRange` (15 m) of its footprint,
 *   inside the field of view (120°) with line of sight at eye height
 *   (`VisibilityModel.canSee`); an item in hand; the room one stands in.
 * - `nearby`: same level, within `nearbyRange` (8 m), line of sight in any
 *   direction (what one notices by turning round — never through walls).
 * - `remembered`: seen earlier by this actor (`ActorState.seen`).
 * - `mapped`: on the public hospital directory — rooms, doors, connectors,
 *   fixed interactive equipment (workstations, devices, monitors, boards,
 *   atlases, craft benches, sinks) and the patient this encounter is about
 *   (the clinician knows which bed). Never portable equipment, staff or
 *   other actors: those are known only by seeing them.
 *
 * Observations are bounded: `observe` lists perceived entities (visible,
 * nearby) nearest first, then remembered ones nearest first, at most
 * `maxEntities` (`truncated`); mapped entities are for `find` / `roomInfo`.
 * Reachability (`reachable`, `pathDistance`) comes from the flood of
 * `Reachability`, cached per actor cell.
 *
 * Grounding: entities carry public data only — names, the patient's public
 * descriptor, behaviour states, capabilities, operations. Patient cues come
 * from `ClinicalView.cues` (posture, distress, accessory, speaking) and only
 * while the patient is perceived; a monitor shows its screen
 * (`ClinicalView.bedside`, the `check_vitals` snapshot) only while it is
 * visible, within the 6 m screen range, the patient's monitor and attached.
 * Never history answers, findings, results, diagnoses or decision options.
 *
 * Memory: `observe`, `find`, `inspect` and `roomInfo` record the entities
 * they report as `visible` in the actor's memory; navigation records what is
 * visible on arrival (`actor.discovered`). Memory changes no version and
 * emits no event, so read-only tools stay idempotent with respect to
 * `version`. `canSee` records nothing.
 */
import { t, type LocalizedText } from "@clinicalcraft/core";
import { RANGES, type ActorState, type Awareness, type ClinicalView, type CollisionModel, type EntityId, type EntityQuery, type InteractionKind, type ObservedEntity, type PerceptionOptions, type WorldEvent, type WorldEventSummary, type WorldObservation } from "./contracts.js";
import type { DeviceRules } from "./behaviors.js";
import { metres, operationName, postureName, roleName, stateName, worldMessage } from "./i18n.js";
import type { Placed, WorldLocator } from "./locate.js";
import type { Reachability } from "./reach.js";
import { formatScreen } from "./screen.js";
import type { WorldStateStore } from "./state.js";
import { forwardOf } from "./visibility.js";

export interface PerceptionDeps {
  store: WorldStateStore;
  locator: WorldLocator;
  rules: DeviceRules;
  reach: Reachability;
  clinical: ClinicalView;
  collision: Pick<CollisionModel, "doors">;
  locale: string;
  options: PerceptionOptions;
  newId: () => string;
}

/** Interaction kinds of fixed equipment on the public directory. */
export const MAPPED_INTERACTIONS: readonly InteractionKind[] = ["workstation", "device", "monitor", "board", "atlas", "craft", "sink"];

/** Events listed in an observation's `recentEvents` (the latest, task bookkeeping left out). */
export const RECENT_EVENTS = 8;

const AWARENESS_ORDER: Record<Awareness, number> = { visible: 0, nearby: 0, remembered: 1, mapped: 2 };
const round = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f || 0; // never -0
};

/** Inspection result (the runtime's `inspect`). */
export type Inspection = ObservedEntity & { description: string; usage?: string; operations: { op: string; name: string; available: boolean; reason?: string }[] };

/** Room information (the runtime's `roomInfo`). */
export interface RoomInfo {
  id: string;
  name: string;
  kind: string;
  level: string;
  exits: { door: EntityId; to: string | null }[];
  entities: ObservedEntity[];
}

export class Perception {
  private readonly staticIds: EntityId[];

  constructor(private readonly d: PerceptionDeps) {
    this.staticIds = d.locator.registry.entities.filter((e) => e.kind !== "level").map((e) => e.id);
  }

  private actorOf(actorId: string): ActorState {
    const a = this.d.store.actor(actorId);
    if (!a) throw new Error(`unknown actor "${actorId}"`);
    return a;
  }

  /** Every entity an actor could know about: registry entities (no levels) and the other actors' bodies. */
  private universe(actorId: string): EntityId[] {
    const extra = this.d.store
      .actors()
      .map((a) => a.id)
      .filter((id) => id !== actorId && !this.d.locator.registry.entity(id));
    return [...this.staticIds.filter((id) => id !== actorId), ...extra];
  }

  /** On the public directory (see module docs)? */
  mapped(p: Placed): boolean {
    if (p.kind === "room" || p.kind === "door" || p.kind === "connector") return true;
    if (p.kind === "patient") return p.id === this.d.locator.patientId;
    return p.kind === "equipment" && !p.entity?.portable && MAPPED_INTERACTIONS.includes(p.entity?.interaction ?? "none");
  }

  /** Awareness of an entity for an actor at its current pose, or null when it does not know it. */
  awareness(actor: ActorState, p: Placed, o: PerceptionOptions = this.d.options): Awareness | null {
    if (p.heldBy === actor.id) return "visible";
    if (p.kind === "room") return actor.room !== null && p.id === `room:${actor.room}` ? "visible" : "mapped";
    const loc = this.d.locator;
    if (p.level === actor.pose.level) {
      const distance = loc.distance(actor.pose, p);
      if (distance <= o.visibilityRange && loc.visibility.canSee(actor.pose, loc.sight(p), { range: o.visibilityRange, fovDeg: o.fovDeg })) return "visible";
      if (distance <= o.nearbyRange && loc.lineOfSight(actor.pose, p)) return "nearby";
    }
    if (this.d.store.remembers(actor.id, p.id)) return "remembered";
    return this.mapped(p) ? "mapped" : null;
  }

  /** Ids visible from the actor's pose right now (discovery after a move). */
  visibleIds(actor: ActorState): EntityId[] {
    const out: EntityId[] = [];
    for (const id of this.universe(actor.id)) {
      const p = this.d.locator.place(id);
      if (!p || p.kind === "room" || p.level !== actor.pose.level) continue;
      if (this.d.locator.distance(actor.pose, p) > this.d.options.visibilityRange) continue;
      if (this.awareness(actor, p) === "visible") out.push(id);
    }
    return out;
  }

  /** Metres from the actor to the entity (another level: straight-line 3D distance to its centre). */
  private distanceTo(actor: ActorState, p: Placed): number {
    if (p.level === actor.pose.level) return this.d.locator.distance(actor.pose, p);
    return Math.hypot(p.position.x - actor.pose.x, p.position.y - actor.pose.y, p.position.z - actor.pose.z);
  }

  /** Degrees from the actor's facing to the entity (−180…180, + = right). */
  private bearing(actor: ActorState, p: Placed): number {
    const dx = p.position.x - actor.pose.x, dz = p.position.z - actor.pose.z;
    if (Math.hypot(dx, dz) < 1e-9) return 0;
    const f = forwardOf(actor.pose.yaw);
    const right = { x: -f.z, z: f.x };
    return (Math.atan2(dx * right.x + dz * right.z, dx * f.x + dz * f.z) * 180) / Math.PI;
  }

  /** The observed form of an entity for an actor. */
  observed(actor: ActorState, p: Placed, awareness: Awareness, withReach: boolean): ObservedEntity {
    const loc = this.d.locator;
    const e = p.entity;
    const distance = this.distanceTo(actor, p);
    const inReach = p.kind === "room" ? awareness === "visible" : p.heldBy === actor.id || (p.level === actor.pose.level && distance <= loc.reach(p) + 1e-6 && loc.lineOfSight(actor.pose, p));
    const actorState = this.d.store.actor(p.id);
    const out: ObservedEntity = {
      id: p.id,
      kind: p.kind,
      type: e?.type ?? actorState?.role ?? p.kind,
      name: this.nameOf(p),
      level: p.level,
      room: p.room,
      distance: round(distance, 2),
      bearing: round(this.bearing(actor, p), 1),
      awareness,
      visible: awareness === "visible",
      reachable: null,
      inReach,
      stateVersion: this.d.store.entityVersion(p.id),
      availableActions: this.d.rules.availableActions(p.id, actor),
    };
    if (withReach) {
      const path = this.d.reach.pathDistance(actor, p);
      if (path !== null) {
        out.reachable = Number.isFinite(path);
        if (Number.isFinite(path)) out.pathDistance = round(path, 2);
      }
    }
    if (e?.kind === "equipment" && e.capabilities.length) out.capabilities = [...e.capabilities];
    const state = this.d.store.available(p.id) ? this.d.rules.state(p.id) : "out-of-service";
    if (state !== null) out.state = state;
    const cues = awareness === "visible" || awareness === "nearby" ? this.cues(actor, p, awareness) : null;
    if (cues) out.cues = cues;
    return out;
  }

  private nameOf(p: Placed): string {
    const L = this.d.locale;
    const e = p.entity;
    if (e?.kind === "patient" && e.public) return `${e.public.name} (${e.public.tag})`;
    if (e) return t(e.name, L);
    const a = this.d.store.actor(p.id);
    return a ? roleName(a.role, L) : p.id;
  }

  /** Bystander cues: the patient (perceived), a monitor screen (visible, in screen range, the patient's, attached). */
  private cues(actor: ActorState, p: Placed, awareness: Awareness): Record<string, string> | null {
    const L = this.d.locale;
    const loc = this.d.locator;
    if (p.kind === "patient" && loc.slot) {
      const c = this.d.clinical.cues(loc.slot.id);
      const posture = c.posture ?? p.entity?.public?.posture;
      const out: Record<string, string> = {};
      if (posture) out.posture = postureName(posture, L);
      if (c.distressed) out.distressed = worldMessage("cue.distressed", L);
      if (c.accessory) out.accessory = c.accessory;
      if (c.speaking) out.speaking = worldMessage("cue.speaking", L);
      return out;
    }
    if (p.entity?.interaction === "monitor" && awareness === "visible" && loc.isPatientMonitor(p.id) && loc.distance(actor.pose, p) <= RANGES.screen + 1e-6 && this.d.rules.state(p.id) === "attached") {
      const snapshot = this.d.clinical.bedside();
      if (!snapshot) return null;
      const screen = formatScreen(snapshot, L);
      return screen.alarms ? { screen: screen.screen, alarms: screen.alarms } : { screen: screen.screen };
    }
    return null;
  }

  private record(actor: ActorState, entities: ObservedEntity[]): void {
    this.d.store.remember(
      actor.id,
      entities.filter((e) => e.awareness === "visible").map((e) => e.id),
    );
  }

  private ordered(rows: { p: Placed; a: Awareness; d: number }[]): { p: Placed; a: Awareness; d: number }[] {
    return rows.sort((x, y) => AWARENESS_ORDER[x.a] - AWARENESS_ORDER[y.a] || x.d - y.d || (x.p.id < y.p.id ? -1 : x.p.id > y.p.id ? 1 : 0));
  }

  /** `observe`: perceived and remembered entities around the actor (bounded; see module docs). */
  observe(actorId: string, opts: Partial<PerceptionOptions> = {}): WorldObservation {
    const actor = this.actorOf(actorId);
    const o = { ...this.d.options, ...opts };
    const rows: { p: Placed; a: Awareness; d: number }[] = [];
    for (const id of this.universe(actorId)) {
      const p = this.d.locator.place(id);
      if (!p || p.kind === "room") continue;
      const a = this.awareness(actor, p, o);
      if (!a || a === "mapped") continue;
      rows.push({ p, a, d: this.distanceTo(actor, p) });
    }
    const sorted = this.ordered(rows);
    const kept = sorted.slice(0, Math.max(0, o.maxEntities));
    const entities = kept.map((r) => this.observed(actor, r.p, r.a, o.reachability));
    this.record(actor, entities);
    const room = actor.room ? this.d.locator.registry.entity(`room:${actor.room}`) : null;
    return {
      observationId: this.d.newId(),
      worldVersion: this.d.store.version,
      clock: this.d.clinical.clock(),
      actor: { id: actor.id, role: actor.role, pose: { ...actor.pose }, room: actor.room, roomName: room ? t(room.name, this.d.locale) : null, level: actor.pose.level, task: actor.task ? { ...actor.task } : null, holding: [...actor.holding] },
      entities,
      truncated: sorted.length > kept.length,
      recentEvents: this.d.store
        .recentEvents(64)
        .filter((e) => e.type !== "task.changed")
        .slice(-RECENT_EVENTS)
        .map((e) => this.summary(e)),
    };
  }

  /** `find`: entities matching a query that the actor is aware of (default: any awareness). */
  find(actorId: string, q: EntityQuery = {}): ObservedEntity[] {
    const actor = this.actorOf(actorId);
    const o = this.d.options;
    const kinds = q.kind === undefined ? null : Array.isArray(q.kind) ? q.kind : [q.kind];
    const allowed = new Set<Awareness>(q.awareness ?? ["visible", "nearby", "remembered", "mapped"]);
    const room = q.room?.startsWith("room:") ? q.room.slice(5) : q.room;
    const needle = q.name?.trim().toLowerCase();
    const rows: { p: Placed; a: Awareness; d: number }[] = [];
    for (const id of this.universe(actorId)) {
      const p = this.d.locator.place(id);
      if (!p) continue;
      if (kinds && !kinds.includes(p.kind)) continue;
      if (q.type !== undefined && (p.entity?.type ?? this.d.store.actor(id)?.role) !== q.type) continue;
      if (q.capabilities?.length && !q.capabilities.every((c) => p.entity?.capabilities.includes(c))) continue;
      if (room !== undefined && p.room !== room) continue;
      if (q.level !== undefined && p.level !== q.level) continue;
      if (needle && !this.nameMatches(p, needle)) continue;
      const a = this.awareness(actor, p, o);
      if (!a || !allowed.has(a) || (q.visibleOnly && a !== "visible")) continue;
      const d = this.distanceTo(actor, p);
      if (q.maxDistance !== undefined && !(d <= q.maxDistance)) continue;
      rows.push({ p, a, d });
    }
    const withReach = o.reachability || !!q.reachableOnly || q.sort === "path";
    let found = rows.map((r) => ({ r, e: this.observed(actor, r.p, r.a, withReach) }));
    if (q.reachableOnly) found = found.filter((x) => x.e.reachable === true);
    const sort = q.sort ?? (withReach ? "path" : "distance");
    found.sort((x, y) => {
      if (sort === "path") {
        const px = x.e.pathDistance ?? Infinity, py = y.e.pathDistance ?? Infinity;
        if (px !== py) return px - py;
      }
      return x.r.d - y.r.d || (x.e.id < y.e.id ? -1 : x.e.id > y.e.id ? 1 : 0);
    });
    const out = found.slice(0, Math.max(0, q.limit ?? o.maxEntities)).map((x) => x.e);
    this.record(actor, out);
    return out;
  }

  private nameMatches(p: Placed, needle: string): boolean {
    const texts: string[] = [];
    const push = (x: LocalizedText | undefined) => {
      if (!x) return;
      if (typeof x === "string") texts.push(x);
      else texts.push(...Object.values(x));
    };
    push(p.entity?.name);
    if (p.entity?.public) texts.push(...Object.values(p.entity.public));
    const a = this.d.store.actor(p.id);
    if (a) texts.push(roleName(a.role, "zh-CN"), roleName(a.role, "en"));
    return texts.some((x) => x.toLowerCase().includes(needle));
  }

  /** `inspect`: an entity the actor knows about, with its description and every operation (available now, or why not). */
  inspect(actorId: string, id: EntityId): Inspection | null {
    const actor = this.actorOf(actorId);
    const p = this.d.locator.place(id);
    if (!p) return null;
    const a = this.awareness(actor, p);
    if (!a) return null;
    const base = this.observed(actor, p, a, this.d.options.reachability);
    this.record(actor, [base]);
    const L = this.d.locale;
    const rules = this.d.rules;
    const operations = rules.spec(p.id).operations.map((op) => {
      const fail = rules.precheck(p.id, op, actor) ?? rules.spatial(p.id, op, actor);
      const row: { op: string; name: string; available: boolean; reason?: string } = { op: op.id, name: operationName(op.id, L, op.name), available: !fail };
      if (fail) row.reason = fail.message;
      return row;
    });
    const out: Inspection = { ...base, description: this.describe(p), operations };
    const usage = p.entity?.equipmentType?.usage;
    if (usage) out.usage = t(usage, L);
    return out;
  }

  private describe(p: Placed): string {
    const L = this.d.locale;
    const e = p.entity;
    const name = this.nameOf(p);
    if (!e) return name;
    switch (e.kind) {
      case "equipment":
        return e.equipmentType ? t(e.equipmentType.description, L) : name;
      case "patient":
        return [e.public?.name, e.public?.tag, e.public?.posture ? postureName(e.public.posture, L) : undefined].filter(Boolean).join(L.toLowerCase().startsWith("zh") ? "，" : ", ");
      case "staff":
        return `${roleName(e.type, L)} · ${t(e.name, L)}`;
      case "door": {
        const door = this.d.collision.doors.find((d) => d.id === e.id);
        const side = (r: string | null) => (r ? t(this.d.locator.registry.entity(`room:${r}`)?.name ?? r, L) : L.toLowerCase().startsWith("zh") ? "室外" : "outside");
        return door ? `${name}: ${side(door.rooms[0])} ↔ ${side(door.rooms[1])}` : name;
      }
      default:
        return name;
    }
  }

  /** `roomInfo`: a room (default: the actor's), its exits and the entities in it the actor knows about. */
  roomInfo(actorId: string, roomId?: string): RoomInfo | null {
    const actor = this.actorOf(actorId);
    const rid = roomId ? (roomId.startsWith("room:") ? roomId.slice(5) : roomId) : actor.room;
    if (!rid) return null;
    const room = this.d.locator.registry.entity(`room:${rid}`);
    if (!room) return null;
    const exits = this.d.collision.doors.filter((d) => d.rooms.includes(rid)).map((d) => ({ door: d.id, to: d.rooms[0] === rid ? d.rooms[1] : d.rooms[0] }));
    const rows: { p: Placed; a: Awareness; d: number }[] = [];
    for (const id of this.universe(actorId)) {
      const p = this.d.locator.place(id);
      if (!p || p.kind === "room" || p.room !== rid) continue;
      const a = this.awareness(actor, p);
      if (a) rows.push({ p, a, d: this.distanceTo(actor, p) });
    }
    const entities = this.ordered(rows)
      .slice(0, this.d.options.maxEntities)
      .map((r) => this.observed(actor, r.p, r.a, this.d.options.reachability));
    this.record(actor, entities);
    return { id: room.id, name: t(room.name, this.d.locale), kind: room.type, level: room.level, exits, entities };
  }

  /** `canSee`: field of view, range and line of sight now (records nothing). */
  canSee(actorId: string, id: EntityId): boolean {
    const actor = this.actorOf(actorId);
    const p = this.d.locator.place(id);
    if (!p) return false;
    if (p.heldBy === actor.id) return true;
    return this.d.locator.visibility.canSee(actor.pose, this.d.locator.sight(p), { range: this.d.options.visibilityRange, fovDeg: this.d.options.fovDeg });
  }

  /** Localised one-line summary of an event. */
  summary(e: WorldEvent): WorldEventSummary {
    const L = this.d.locale;
    const n = (id: string) => this.d.locator.name(id);
    let summary: string;
    switch (e.type) {
      case "actor.moved":
        summary = worldMessage("actor.moved", L, { actor: n(e.actorId), distance: metres(e.distance) });
        break;
      case "actor.entered-room": {
        const room = e.room ? this.d.locator.registry.entity(`room:${e.room}`) : null;
        summary = room ? worldMessage("actor.entered-room", L, { actor: n(e.actorId), room: t(room.name, L) }) : worldMessage("actor.left", L, { actor: n(e.actorId) });
        break;
      }
      case "actor.discovered":
        summary = worldMessage("actor.discovered", L, { actor: n(e.actorId), count: e.entities.length });
        break;
      case "entity.state":
        summary = worldMessage("entity.state", L, { target: n(e.entityId), from: e.from ? (this.d.rules.stateLabel(e.entityId, e.from) ?? e.from) : "—", to: e.to ? (this.d.rules.stateLabel(e.entityId, e.to) ?? e.to) : "—" });
        break;
      case "entity.moved":
        summary = worldMessage("entity.moved", L, { target: n(e.entityId) });
        break;
      case "item.held":
        summary = worldMessage(e.held ? "item.held" : "item.dropped", L, { actor: n(e.actorId), target: n(e.entityId) });
        break;
      case "door.changed":
        summary = worldMessage("door.changed", L, { target: n(e.entityId), state: stateName(e.locked ? "locked" : e.open ? "open" : "closed", L) });
        break;
      case "reservation.changed":
        summary = e.reservedBy ? worldMessage("reservation.changed", L, { target: n(e.entityId), actor: n(e.reservedBy) }) : worldMessage("reservation.released", L, { target: n(e.entityId) });
        break;
      case "obstacle.changed":
        summary = worldMessage(e.present ? "obstacle.changed" : "obstacle.cleared", L, { label: t(e.obstacle.label, L) });
        break;
      case "entity.availability":
        summary = worldMessage(e.available ? "entity.available" : "entity.availability", L, { target: n(e.entityId) });
        break;
      case "hygiene":
        summary = worldMessage("hygiene", L, { actor: n(e.actorId) });
        break;
      case "task.changed":
        summary = e.task ? worldMessage("task.changed", L, { actor: n(e.actorId), label: e.task.label }) : worldMessage("task.idle", L, { actor: n(e.actorId) });
        break;
      case "action.completed":
        summary = worldMessage("action.completed", L, { actor: n(e.actorId), operation: operationName(e.operation, L), status: e.errorCode ?? e.status });
        break;
    }
    return { id: e.id, type: e.type, summary };
  }
}
