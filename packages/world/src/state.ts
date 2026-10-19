/**
 * `WorldStateStore` — the physical layer of an encounter (EMBODIED §2, R4,
 * R6): actor bodies, per-entity runtime state (device states, door states,
 * moved carts, held items, reservations, availability), dynamic obstacles,
 * per-actor memory, a bounded event log and the idempotency window of recent
 * action results. Derived states that mirror clinical facts are never stored.
 *
 * Versions (optimistic concurrency, EMBODIED R4):
 * - `version` (global) is monotonic and increases with every committed
 *   physical change made by the action bus or a scenario control — one step
 *   per mutation (`setActorPose`, `patchEntity`, `setObstacle`, …).
 * - Every entity (actors included) has its own monotonic version
 *   (`entityVersion`, 0 until first changed), bumped only when that entity
 *   changes. A device's version is therefore untouched by anyone walking.
 * - Sensor updates of human-driven bodies (`sensorPose`, ~10 Hz) bump only
 *   the actor's own version — never the global version, never another entity.
 * - Memory (`remember`), current tasks (`setTask`), events, results and
 *   transient in-flight locks bump nothing: read-only tools stay idempotent
 *   with respect to every version.
 *
 * Snapshots (`WorldStateSnapshot`) are canonical JSON: keys sorted at every
 * level, actors sorted by id, `seen` sorted — so the same history gives the
 * same bytes, and `new WorldStateStore({ snapshot }).snapshot()` reproduces
 * the snapshot exactly.
 */
import type { FacilityDefinition } from "@clinicalcraft/core";
import {
  PRIMARY_ACTOR,
  type ActorId,
  type ActorState,
  type DynamicObstacle,
  type EntityId,
  type EntityRuntimeState,
  type Pose,
  type Vec3,
  type WorldActionResult,
  type WorldDynamics,
  type WorldEvent,
  type WorldStateSnapshot,
} from "./contracts.js";
import { DEG } from "./geometry.js";
import { defaultLevelId, levelElevation } from "./levels.js";
import type { SemanticRegistry } from "./registry.js";

/** Snapshot format id. */
export const WORLD_SNAPSHOT_FORMAT = "clinicalcraft-world@1" as const;

/** A world event before the store assigns its id. */
export type WorldEventInput = WorldEvent extends infer E ? (E extends WorldEvent ? Omit<E, "id"> : never) : never;

/** Listener of committed events (`version` = the global version after the change). */
export type WorldListener = (event: WorldEvent, version: number) => void;

export interface WorldStateStoreOptions {
  facility: FacilityDefinition;
  registry: SemanticRegistry;
  /** Id generator (events). */
  newId: () => string;
  /** Initial pose of the primary actor (default: the facility spawn on the default level). */
  spawn?: Pose;
  /** Restore this state instead of the initial one (resume). */
  snapshot?: WorldStateSnapshot;
  /** Event log bound (default 256). */
  maxEvents?: number;
  /** Idempotency window: results kept by action id (default 128). */
  maxResults?: number;
}

/** Deep copy with object keys sorted at every level and `undefined` members dropped (canonical JSON form). */
export function canonical<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => canonical(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = canonical(v);
    }
    return out as T;
  }
  return value;
}

const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The facility spawn as a pose on the default level. */
export function spawnPose(f: FacilityDefinition): Pose {
  const level = defaultLevelId(f);
  return { x: f.spawn.x, y: levelElevation(f, level), z: f.spawn.z, yaw: f.spawn.yaw ?? 0, pitch: 0, level };
}

export class WorldStateStore implements WorldDynamics {
  readonly facilityId: string;
  private _version = 0;
  private readonly actorMap = new Map<ActorId, ActorState>();
  private readonly memory = new Map<ActorId, Set<EntityId>>();
  private readonly entityMap = new Map<EntityId, EntityRuntimeState>();
  private obstacleList: DynamicObstacle[] = [];
  private resultList: WorldActionResult[] = [];
  private readonly resultIndex = new Map<string, WorldActionResult>();
  private readonly log: WorldEvent[] = [];
  private readonly listeners = new Set<WorldListener>();
  private readonly newId: () => string;
  private readonly registry: SemanticRegistry;
  private readonly maxEvents: number;
  private readonly maxResults: number;

  constructor(opts: WorldStateStoreOptions) {
    this.facilityId = opts.facility.id;
    this.newId = opts.newId;
    this.registry = opts.registry;
    this.maxEvents = opts.maxEvents ?? 256;
    this.maxResults = opts.maxResults ?? 128;
    if (opts.snapshot) this.load(opts.snapshot);
    else this.init(opts.facility, opts.spawn ?? spawnPose(opts.facility));
  }

  /* ---------------- initial state / restore ---------------- */

  private init(f: FacilityDefinition, spawn: Pose): void {
    this.addActor({ id: PRIMARY_ACTOR, role: "clinician", controller: "agent", pose: { ...spawn }, room: this.registry.roomAt(spawn.level, spawn.x, spawn.z), task: null, holding: [], seen: [], handsCleanUntil: null });
    for (const st of f.staff ?? []) {
      const e = this.registry.entity(`staff:${st.id}`);
      if (!e) continue;
      const pose: Pose = { x: e.position.x, y: e.position.y, z: e.position.z, yaw: (st.rot ?? 0) * DEG, pitch: 0, level: e.level };
      this.addActor({ id: e.id, role: st.role, controller: "npc", pose, room: e.room, task: null, holding: [], seen: [], handsCleanUntil: null });
    }
  }

  private load(s: WorldStateSnapshot): void {
    if (s.format !== WORLD_SNAPSHOT_FORMAT) throw new Error(`unsupported world snapshot format "${String(s.format)}"`);
    if (s.facilityId !== this.facilityId) throw new Error(`world snapshot of facility "${s.facilityId}" cannot be restored into "${this.facilityId}"`);
    this._version = s.version;
    for (const a of s.actors) this.addActor(canonical(a));
    for (const [id, e] of Object.entries(s.entities)) this.entityMap.set(id, canonical(e));
    this.obstacleList = s.obstacles.map((o) => canonical(o));
    for (const r of s.results) this.recordResult(canonical(r));
  }

  private addActor(a: ActorState): void {
    const seen = [...new Set(a.seen)].sort();
    this.actorMap.set(a.id, { ...a, seen, holding: [...a.holding] });
    this.memory.set(a.id, new Set(seen));
  }

  /* ---------------- reads ---------------- */

  /** Global version (see module docs). */
  get version(): number {
    return this._version;
  }

  /** The live actor record (do not mutate; use the store's mutators). */
  actor(id: ActorId): ActorState | null {
    return this.actorMap.get(id) ?? null;
  }

  /** Every actor, sorted by id. */
  actors(): ActorState[] {
    return [...this.actorMap.values()].sort(byId);
  }

  /** Runtime state of an entity, if any was ever stored. */
  entity(id: EntityId): Readonly<EntityRuntimeState> | undefined {
    return this.entityMap.get(id);
  }

  /** Per-entity version (0 until the entity first changes). Actors are entities too. */
  entityVersion(id: EntityId): number {
    return this.entityMap.get(id)?.version ?? 0;
  }

  /** Has this actor seen the entity (memory)? */
  remembers(actorId: ActorId, id: EntityId): boolean {
    return this.memory.get(actorId)?.has(id) ?? false;
  }

  /** Is the device available (not taken out of service by a scenario)? */
  available(id: EntityId): boolean {
    return this.entityMap.get(id)?.available !== false;
  }

  /** Current obstacles (insertion order). */
  obstacleSet(): readonly DynamicObstacle[] {
    return this.obstacleList;
  }

  /** The last `n` events (oldest first). */
  recentEvents(n = 20): WorldEvent[] {
    return this.log.slice(Math.max(0, this.log.length - n));
  }

  /** Recorded result of an action id (idempotency window), or null. */
  result(actionId: string): WorldActionResult | null {
    return this.resultIndex.get(actionId) ?? null;
  }

  /* ---------------- WorldDynamics ---------------- */

  doorState(doorId: EntityId): { open: boolean; locked: boolean } | null {
    return this.entityMap.get(doorId)?.door ?? null;
  }

  obstacles(): readonly DynamicObstacle[] {
    return this.obstacleList;
  }

  displaced(): readonly { id: EntityId; position: Vec3 & { level: string; rot?: number } }[] {
    const out: { id: EntityId; position: Vec3 & { level: string; rot?: number } }[] = [];
    for (const [id, e] of this.entityMap) if (e.position && !e.heldBy) out.push({ id, position: e.position });
    return out.sort(byId);
  }

  removed(): readonly EntityId[] {
    const out: EntityId[] = [];
    for (const [id, e] of this.entityMap) if (e.heldBy) out.push(id);
    return out.sort();
  }

  actorPose(id: ActorId): Pose | null {
    return this.actorMap.get(id)?.pose ?? null;
  }

  /* ---------------- mutators ---------------- */

  private bump(id?: EntityId, global = true): void {
    if (global) this._version++;
    if (id === undefined) return;
    const e = this.entityMap.get(id);
    if (e) e.version++;
    else this.entityMap.set(id, { version: 1 });
  }

  private mutableActor(id: ActorId): ActorState {
    const a = this.actorMap.get(id);
    if (!a) throw new Error(`unknown actor "${id}"`);
    return a;
  }

  /** Commit an actor pose (action bus): global + actor version. Returns the previous room when the room changed. */
  setActorPose(id: ActorId, pose: Pose): { roomChanged: boolean; room: string | null } {
    return this.writePose(id, pose, true);
  }

  /**
   * Sensor update of a human-driven body: bumps only the actor's own version
   * (EMBODIED R4). Returns whether the room changed.
   */
  sensorPose(id: ActorId, pose: Pose): { roomChanged: boolean; room: string | null } {
    return this.writePose(id, pose, false);
  }

  private writePose(id: ActorId, pose: Pose, global: boolean): { roomChanged: boolean; room: string | null } {
    const a = this.mutableActor(id);
    const room = this.registry.roomAt(pose.level, pose.x, pose.z);
    const roomChanged = room !== a.room;
    a.pose = { x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw, pitch: pose.pitch, level: pose.level };
    a.room = room;
    this.bump(id, global);
    return { roomChanged, room };
  }

  /** Current task of an actor (bookkeeping: no version change). */
  setTask(id: ActorId, task: ActorState["task"]): void {
    this.mutableActor(id).task = task ? { ...task } : null;
  }

  /** Hand hygiene valid until a simulated minute (global + actor version). */
  setHands(id: ActorId, until: number | null): void {
    this.mutableActor(id).handsCleanUntil = until;
    this.bump(id);
  }

  /** Items an actor carries (global + actor version). */
  setHolding(id: ActorId, holding: EntityId[]): void {
    this.mutableActor(id).holding = [...holding];
    this.bump(id);
  }

  /**
   * Remember entities seen by an actor (EMBODIED R7 "remembered"). Memory is
   * epistemic, not physical: no version changes. Returns the newly remembered ids (sorted).
   */
  remember(actorId: ActorId, ids: Iterable<EntityId>): EntityId[] {
    const a = this.actorMap.get(actorId);
    const set = this.memory.get(actorId);
    if (!a || !set) return [];
    const added: EntityId[] = [];
    for (const id of ids) {
      if (id === actorId || set.has(id)) continue;
      set.add(id);
      added.push(id);
    }
    if (added.length) a.seen = [...set].sort();
    return added.sort();
  }

  /**
   * Patch an entity's runtime state (global + entity version). A member set
   * to `undefined` is removed; `version` cannot be patched.
   */
  patchEntity(id: EntityId, patch: Partial<Omit<EntityRuntimeState, "version">>): void {
    this.bump(id);
    const e = this.entityMap.get(id)!;
    for (const [key, value] of Object.entries(patch) as [keyof EntityRuntimeState, unknown][]) {
      if (key === "version") continue;
      if (value === undefined) delete e[key];
      else (e as unknown as Record<string, unknown>)[key] = value;
    }
  }

  /** Add (present) or remove an obstacle by id (global version). */
  setObstacle(o: DynamicObstacle, present: boolean): boolean {
    const i = this.obstacleList.findIndex((x) => x.id === o.id);
    if (present) {
      if (i >= 0) this.obstacleList[i] = { ...o, rect: { ...o.rect } };
      else this.obstacleList.push({ ...o, rect: { ...o.rect } });
    } else if (i >= 0) this.obstacleList.splice(i, 1);
    else return false;
    this.bump();
    return true;
  }

  /* ---------------- events ---------------- */

  /** Append an event (id from `newId`) to the bounded log and notify listeners. */
  emit(input: WorldEventInput): WorldEvent {
    const event = { id: this.newId(), ...input } as WorldEvent;
    this.log.push(event);
    if (this.log.length > this.maxEvents) this.log.splice(0, this.log.length - this.maxEvents);
    for (const listener of [...this.listeners]) {
      try {
        listener(event, this._version);
      } catch {
        // a failing listener never breaks the world
      }
    }
    return event;
  }

  /** Subscribe to committed events; returns the unsubscribe function. */
  subscribe(listener: WorldListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /* ---------------- idempotency ---------------- */

  /** Record an action result (bounded window, oldest dropped first). */
  recordResult(result: WorldActionResult): void {
    if (this.resultIndex.has(result.actionId)) return;
    this.resultList.push(result);
    this.resultIndex.set(result.actionId, result);
    while (this.resultList.length > this.maxResults) this.resultIndex.delete(this.resultList.shift()!.actionId);
  }

  /* ---------------- persistence ---------------- */

  /** Canonical, JSON-serialisable snapshot (see module docs). */
  snapshot(): WorldStateSnapshot {
    const entities: Record<EntityId, EntityRuntimeState> = {};
    for (const id of [...this.entityMap.keys()].sort()) entities[id] = this.entityMap.get(id)!;
    return canonical({
      format: WORLD_SNAPSHOT_FORMAT,
      facilityId: this.facilityId,
      version: this._version,
      actors: this.actors(),
      entities,
      obstacles: this.obstacleList,
      results: this.resultList,
    });
  }
}
