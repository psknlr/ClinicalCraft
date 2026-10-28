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
 *   atlases, craft benches, sinks), where the departments keep their
 *   portable equipment (every clinician and staff member knows where the
 *   ECG cart lives) and the patient this encounter is about (the clinician
 *   knows which bed). Never staff or other actors: those are known only by
 *   seeing them.
 *
 * Whereabouts (lead note 1): a movable thing (portable equipment, staff,
 * other actors) not perceived now is reported where the actor believes it
 * is — where it last saw it (`ActorState.lastSeen`, updated at every
 * sighting), else, for portable equipment, where it is usually kept — with
 * `lastKnown` saying which; the room, level and distance filters, the
 * distances, bearing and reachability all measure to that place, and it is
 * never `inReach`. Moving a thing out of an actor's sight changes nothing
 * the actor is told. (Navigation by id still finds the thing where it is.)
 *
 * Recent events (G13): an observation lists the actor's own events (in the
 * second person), those of actions done on its behalf (a delegated task,
 * `WorldActionRequest.onBehalfOf`), and those about an actor or entity it
 * perceives now — never another actor's walk out of sight.
 *
 * Observations are bounded: `observe` lists perceived entities (visible,
 * nearby) nearest first, then remembered ones nearest first, at most
 * `maxEntities` (`truncated`); mapped entities are for `find` / `roomInfo`.
 * Reachability (`reachable`, `pathDistance`) comes from the flood of
 * `Reachability`, cached per actor cell.
 *
 * Grounding: entities carry public data only — names, the patient's public
 * descriptor, behaviour states, capabilities, operations. Patient cues come
 * from `ClinicalView.cues` (posture, distress, accessory, speaking, cannot speak) and only
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
import { RANGES, type ActorId, type ActorState, type Awareness, type ClinicalView, type CollisionModel, type DoorSpec, type EntityId, type EntityQuery, type InteractionKind, type ObservedEntity, type PerceptionOptions, type SeenPlace, type WorldEvent, type WorldEventSummary, type WorldObservation } from "./contracts.js";
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

/** Where an actor believes a thing is (`Perception.believed`). */
interface Belief {
  p: Placed;
  lastKnown?: ObservedEntity["lastKnown"];
}

/** A candidate entry of a listing: where it is believed to be, the awareness, the distance. */
interface Row extends Belief {
  a: Awareness;
  d: number;
}

/** Unit outward normal of a wall side (north is −Z). */
const SIDE_NORMAL: Record<DoorSpec["side"], { x: number; z: number }> = { n: { x: 0, z: -1 }, s: { x: 0, z: 1 }, e: { x: 1, z: 0 }, w: { x: -1, z: 0 } };

/** Inspection result (the runtime's `inspect`). */
export type Inspection = ObservedEntity & { description: string; usage?: string; operations: { op: string; name: string; available: boolean; reason?: string }[] };

/** Room information (the runtime's `roomInfo`). */
export interface RoomInfo {
  id: string;
  name: string;
  kind: string;
  level: string;
  /** Doors out of the room: the room beyond (`to`, null for none) and the name of what lies there (a room, a corridor, the outdoor region). */
  exits: { door: EntityId; to: string | null; toName: string }[];
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
    if (p.kind !== "equipment") return false;
    // portable equipment: where the department keeps it (lead note 1; reported there until seen elsewhere)
    return !!p.entity?.portable || MAPPED_INTERACTIONS.includes(p.entity?.interaction ?? "none");
  }

  /** Things that move: portable equipment, staff and other actors' bodies (believed where last seen). */
  private movable(p: Placed): boolean {
    return p.kind === "staff" || p.kind === "actor" || (p.kind === "equipment" && !!p.entity?.portable);
  }

  /**
   * Where the actor believes a thing is (lead note 1): where it is while
   * perceived (and for things that never move); else where it was last seen;
   * else, for portable equipment, where it is usually kept.
   */
  private believed(actor: ActorState, p: Placed, a: Awareness): Belief {
    if (a === "visible" || a === "nearby" || !this.movable(p)) return { p };
    const loc = this.d.locator;
    const L = this.d.locale;
    const where = (q: Placed) => loc.regionName({ level: q.level, x: q.position.x, z: q.position.z });
    const seen = this.d.store.lastSeen(actor.id, p.id);
    const last = seen ? loc.placedAt(p.id, seen) : null;
    if (last) return { p: last, lastKnown: { kind: "last-seen", label: worldMessage("whereabouts.lastSeen", L, { where: where(last) }) } };
    const home = p.kind === "equipment" ? loc.home(p.id) : null;
    if (home) return { p: home, lastKnown: { kind: "usual", label: worldMessage("whereabouts.usual", L, { where: where(home) }) } };
    return { p };
  }

  /** Where a movable thing is now, as a sighting (null for things that never move). */
  private seenPlace(id: EntityId): SeenPlace | null {
    const p = this.d.locator.place(id);
    if (!p || !this.movable(p)) return null;
    return { level: p.level, x: p.position.x, y: p.position.y, z: p.position.z, rot: p.rot };
  }

  /** Remember what is visible from the actor's pose now, where it is (a walk's arrival); returns the newly seen ids. */
  notice(actor: ActorState): EntityId[] {
    return this.d.store.remember(actor.id, this.visibleIds(actor), (id) => this.seenPlace(id));
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
  observed(actor: ActorState, p: Placed, awareness: Awareness, withReach: boolean, lastKnown?: ObservedEntity["lastKnown"]): ObservedEntity {
    const loc = this.d.locator;
    const e = p.entity;
    const distance = this.distanceTo(actor, p);
    // a believed place (lastKnown) is never within reach: the thing may not be there
    const inReach = p.kind === "room" ? awareness === "visible" : p.heldBy === actor.id || (!lastKnown && p.level === actor.pose.level && distance <= loc.reach(p) + 1e-6 && loc.lineOfSight(actor.pose, p));
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
    if (lastKnown) out.lastKnown = lastKnown;
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
      // the posture now (G12): the place's (lying on a table or a trolley, standing at a station), else clinical state's
      const posture = loc.patientPosture() ?? c.posture ?? p.entity?.public?.posture;
      const out: Record<string, string> = {};
      if (posture) out.posture = postureName(posture, L);
      if (c.distressed) out.distressed = worldMessage("cue.distressed", L);
      if (c.accessory) out.accessory = c.accessory;
      if (c.speaking) out.speaking = worldMessage("cue.speaking", L);
      if (c.cannotSpeak !== undefined) out.speech = c.cannotSpeak ? worldMessage("cue.cannotSpeakWhy", L, { reason: c.cannotSpeak }) : worldMessage("cue.cannotSpeak", L);
      return out;
    }
    // THE screen rule (`WorldLocator.screenInView`): from the monitor's own room, never through a window
    if (p.entity?.interaction === "monitor" && awareness === "visible" && loc.isPatientMonitor(p.id) && loc.screenInView(actor, p, RANGES.screen) && this.d.rules.state(p.id) === "attached") {
      const snapshot = this.d.clinical.bedside();
      if (!snapshot) return null;
      const screen = formatScreen(snapshot, L);
      return screen.alarms ? { screen: screen.screen, alarms: screen.alarms } : { screen: screen.screen };
    }
    return null;
  }

  private record(actor: ActorState, entities: ObservedEntity[]): void {
    const placeOf = (id: EntityId) => this.seenPlace(id);
    this.d.store.remember(
      actor.id,
      entities.filter((e) => e.awareness === "visible").map((e) => e.id),
      placeOf,
    );
    // a known thing noticed nearby (not looked at) is now known to be here
    const nearby = entities.filter((e) => e.awareness === "nearby" && this.d.store.remembers(actor.id, e.id)).map((e) => e.id);
    if (nearby.length) this.d.store.remember(actor.id, nearby, placeOf);
  }

  private ordered<R extends Row>(rows: R[]): R[] {
    return rows.sort((x, y) => AWARENESS_ORDER[x.a] - AWARENESS_ORDER[y.a] || x.d - y.d || (x.p.id < y.p.id ? -1 : x.p.id > y.p.id ? 1 : 0));
  }

  /** `observe`: perceived and remembered entities around the actor (bounded; see module docs). */
  observe(actorId: string, opts: Partial<PerceptionOptions> = {}): WorldObservation {
    const actor = this.actorOf(actorId);
    const o = { ...this.d.options, ...opts };
    const rows: Row[] = [];
    for (const id of this.universe(actorId)) {
      const truth = this.d.locator.place(id);
      if (!truth || truth.kind === "room") continue;
      const a = this.awareness(actor, truth, o);
      if (!a || a === "mapped") continue;
      const { p, lastKnown } = this.believed(actor, truth, a);
      rows.push({ p, a, d: this.distanceTo(actor, p), lastKnown });
    }
    const sorted = this.ordered(rows);
    const kept = sorted.slice(0, Math.max(0, o.maxEntities));
    const entities = kept.map((r) => this.observed(actor, r.p, r.a, o.reachability, r.lastKnown));
    this.record(actor, entities);
    const room = actor.room ? this.d.locator.registry.entity(`room:${actor.room}`) : null;
    return {
      observationId: this.d.newId(),
      worldVersion: this.d.store.version,
      clock: this.d.clinical.clock(),
      actor: { id: actor.id, role: actor.role, pose: { ...actor.pose }, room: actor.room, roomName: room ? t(room.name, this.d.locale) : null, level: actor.pose.level, task: actor.task ? { ...actor.task } : null, holding: [...actor.holding] },
      entities,
      truncated: sorted.length > kept.length,
      recentEvents: this.recent(actor, o),
    };
  }

  /**
   * The recent events an actor knows of (G13): its own, its delegates'
   * (done on its behalf), and those about an actor or entity it perceives
   * now (visible or nearby) — never another actor's walk out of sight or a
   * device changed behind a wall. Its own in the second person.
   */
  private recent(actor: ActorState, o: PerceptionOptions): WorldEventSummary[] {
    const perceived = new Map<string, boolean>();
    const sees = (id: string | null | undefined): boolean => {
      if (!id) return false;
      if (id === actor.id) return true;
      let v = perceived.get(id);
      if (v === undefined) {
        const p = this.d.locator.place(id);
        const a = p ? this.awareness(actor, p, o) : null;
        v = a === "visible" || a === "nearby";
        perceived.set(id, v);
      }
      return v;
    };
    const out: WorldEventSummary[] = [];
    for (const e of this.d.store.recentEvents(64)) if (e.type !== "task.changed" && this.knows(actor, e, sees, o)) out.push(this.summary(e, actor.id));
    return out.slice(-RECENT_EVENTS);
  }

  private knows(actor: ActorState, e: WorldEvent, sees: (id: string | null | undefined) => boolean, o: PerceptionOptions): boolean {
    if (e.onBehalfOf === actor.id) return true;
    switch (e.type) {
      case "actor.discovered":
        return e.actorId === actor.id; // what another actor noticed is in its head
      case "actor.moved":
      case "actor.entered-room":
      case "hygiene":
      case "action.completed":
        return sees(e.actorId);
      case "item.held":
      case "entity.state":
      case "entity.moved":
        return sees(e.actorId) || sees(e.entityId);
      case "door.changed":
        return e.actorId === actor.id || sees(e.entityId);
      case "reservation.changed":
        return e.reservedBy === actor.id || sees(e.entityId);
      case "entity.availability":
        return sees(e.entityId);
      case "patient.moved":
        return e.by === actor.id || sees(e.entityId);
      case "patient.posture":
        return sees(e.entityId);
      case "obstacle.changed": {
        const r = e.obstacle.rect;
        const at = { x: r.x, z: r.z };
        return e.obstacle.level === actor.pose.level && Math.hypot(at.x - actor.pose.x, at.z - actor.pose.z) <= o.visibilityRange && this.d.locator.visibility.visibleFrom(actor.pose.level, actor.pose, { level: e.obstacle.level, position: at, footprint: { w: r.w, d: r.d } });
      }
      default:
        return false;
    }
  }

  /** `find`: entities matching a query that the actor is aware of (default: any awareness). */
  find(actorId: string, q: EntityQuery = {}): ObservedEntity[] {
    const actor = this.actorOf(actorId);
    const o = this.d.options;
    const kinds = q.kind === undefined ? null : Array.isArray(q.kind) ? q.kind : [q.kind];
    const allowed = new Set<Awareness>(q.awareness ?? ["visible", "nearby", "remembered", "mapped"]);
    const room = q.room?.startsWith("room:") ? q.room.slice(5) : q.room;
    const needle = q.name?.trim().toLowerCase();
    const rows: Row[] = [];
    for (const id of this.universe(actorId)) {
      const truth = this.d.locator.place(id);
      if (!truth) continue;
      if (kinds && !kinds.includes(truth.kind)) continue;
      if (q.type !== undefined && (truth.entity?.type ?? this.d.store.actor(id)?.role) !== q.type) continue;
      if (q.capabilities?.length && !q.capabilities.every((c) => truth.entity?.capabilities.includes(c))) continue;
      if (needle && !this.nameMatches(truth, needle)) continue;
      const a = this.awareness(actor, truth, o);
      if (!a || !allowed.has(a) || (q.visibleOnly && a !== "visible")) continue;
      // where the actor believes it is (lead note 1): the room, level and distance filters follow the belief
      const { p, lastKnown } = this.believed(actor, truth, a);
      if (room !== undefined && p.room !== room) continue;
      if (q.level !== undefined && p.level !== q.level) continue;
      const d = this.distanceTo(actor, p);
      if (q.maxDistance !== undefined && !(d <= q.maxDistance)) continue;
      rows.push({ p, a, d, lastKnown });
    }
    const withReach = o.reachability || !!q.reachableOnly || q.sort === "path";
    let found = rows.map((r) => ({ r, e: this.observed(actor, r.p, r.a, withReach, r.lastKnown) }));
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
    const belief = this.believed(actor, p, a);
    const base = this.observed(actor, belief.p, a, this.d.options.reachability, belief.lastKnown);
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
      case "patient": {
        const posture = this.d.locator.patientPosture() ?? e.public?.posture;
        return [e.public?.name, e.public?.tag, posture ? postureName(posture, L) : undefined].filter(Boolean).join(L.toLowerCase().startsWith("zh") ? "，" : ", ");
      }
      case "staff":
        return `${roleName(e.type, L)} · ${t(e.name, L)}`;
      case "door": {
        const door = this.d.collision.doors.find((d) => d.id === e.id);
        return door ? `${name}: ${this.sideName(door, 0)} ↔ ${this.sideName(door, 1)}` : name;
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
    const exits = this.d.collision.doors
      .filter((d) => d.rooms.includes(rid))
      .map((d) => {
        const i = d.rooms[0] === rid ? 1 : 0;
        return { door: d.id, to: d.rooms[i], toName: this.sideName(d, i) };
      });
    const rows: Row[] = [];
    for (const id of this.universe(actorId)) {
      const truth = this.d.locator.place(id);
      if (!truth || truth.kind === "room") continue;
      const a = this.awareness(actor, truth);
      if (!a) continue;
      const { p, lastKnown } = this.believed(actor, truth, a);
      if (p.room === rid) rows.push({ p, a, d: this.distanceTo(actor, p), lastKnown });
    }
    const entities = this.ordered(rows)
      .slice(0, this.d.options.maxEntities)
      .map((r) => this.observed(actor, r.p, r.a, this.d.options.reachability, r.lastKnown));
    this.record(actor, entities);
    return { id: room.id, name: t(room.name, this.d.locale), kind: room.type, level: room.level, exits, entities };
  }

  /**
   * Name of one side of a door (0: inside its owner's wall, 1: outside): the
   * room there, else what lies beyond the wall — a building's corridor or
   * the facility's outdoor region (lead note 2).
   */
  private sideName(door: DoorSpec, i: 0 | 1): string {
    const room = door.rooms[i];
    if (room) return t(this.d.locator.registry.entity(`room:${room}`)?.name ?? room, this.d.locale);
    const n = SIDE_NORMAL[door.side];
    const sign = i === 0 ? -1 : 1;
    return this.d.locator.regionName({ level: door.level, x: door.centre.x + sign * n.x * 0.6, z: door.centre.z + sign * n.z * 0.6 });
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
  summary(e: WorldEvent, observer?: ActorId): WorldEventSummary {
    const L = this.d.locale;
    const n = (id: string) => this.d.locator.name(id);
    /** The observer's own event: the second-person key (`self.*`), else the third-person one. */
    const key = (actorId: string | null | undefined, third: string, self: string) => (observer !== undefined && actorId === observer ? self : third);
    let summary: string;
    switch (e.type) {
      case "actor.moved":
        summary = worldMessage(key(e.actorId, "actor.moved", "self.moved"), L, { actor: n(e.actorId), distance: metres(e.distance) });
        break;
      case "actor.entered-room": {
        const room = e.room ? this.d.locator.registry.entity(`room:${e.room}`) : null;
        summary = room ? worldMessage(key(e.actorId, "actor.entered-room", "self.entered-room"), L, { actor: n(e.actorId), room: t(room.name, L) }) : worldMessage(key(e.actorId, "actor.left", "self.left"), L, { actor: n(e.actorId) });
        break;
      }
      case "actor.discovered":
        summary = worldMessage(key(e.actorId, "actor.discovered", "self.discovered"), L, { actor: n(e.actorId), count: e.entities.length });
        break;
      case "entity.state":
        summary = worldMessage("entity.state", L, { target: n(e.entityId), from: e.from ? (this.d.rules.stateLabel(e.entityId, e.from) ?? e.from) : "—", to: e.to ? (this.d.rules.stateLabel(e.entityId, e.to) ?? e.to) : "—" });
        break;
      case "entity.moved":
        summary = worldMessage("entity.moved", L, { target: n(e.entityId) });
        break;
      case "item.held":
        summary = worldMessage(e.held ? key(e.actorId, "item.held", "self.held") : key(e.actorId, "item.dropped", "self.dropped"), L, { actor: n(e.actorId), target: n(e.entityId) });
        break;
      case "door.changed":
        summary = worldMessage("door.changed", L, { target: n(e.entityId), state: stateName(e.locked ? "locked" : e.open ? "open" : "closed", L) });
        break;
      case "reservation.changed":
        summary = e.reservedBy ? worldMessage(key(e.reservedBy, "reservation.changed", "self.reserved"), L, { target: n(e.entityId), actor: n(e.reservedBy) }) : worldMessage("reservation.released", L, { target: n(e.entityId) });
        break;
      case "obstacle.changed":
        summary = worldMessage(e.present ? "obstacle.changed" : "obstacle.cleared", L, { label: t(e.obstacle.label, L) });
        break;
      case "entity.availability":
        summary = worldMessage(e.available ? "entity.available" : "entity.availability", L, { target: n(e.entityId) });
        break;
      case "hygiene":
        summary = worldMessage(key(e.actorId, "hygiene", "self.hygiene"), L, { actor: n(e.actorId) });
        break;
      case "task.changed":
        summary = e.task ? worldMessage("task.changed", L, { actor: n(e.actorId), label: e.task.label }) : worldMessage("task.idle", L, { actor: n(e.actorId) });
        break;
      case "action.completed":
        summary = worldMessage(key(e.actorId, "action.completed", "self.action"), L, { actor: n(e.actorId), operation: operationName(e.operation, L), status: e.errorCode ?? e.status });
        break;
      case "patient.moved": {
        const place = this.d.locator.patientBody?.placeName(e.to) ?? "—";
        summary = e.by ? worldMessage(key(e.by, "patient.transported", "self.transported"), L, { actor: n(e.by), patient: n(e.entityId), place }) : worldMessage("patient.moved", L, { patient: n(e.entityId), place });
        break;
      }
      case "patient.posture":
        summary = worldMessage("patient.posture", L, { patient: n(e.entityId), posture: postureName(e.to, L) });
        break;
    }
    return { id: e.id, type: e.type, summary };
  }
}
