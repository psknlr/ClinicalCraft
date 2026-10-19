/**
 * Staff NPCs that walk (embodiment, EMBODIED §8 "delegated staff walk
 * physically"): a delegated nurse is moved by the world model's action bus,
 * and the browser `Mover` animates her rig along the route the world
 * planned — deterministic path following, no model per frame. Doors on the
 * way open as she comes and close behind her; stairs are climbed (the feet
 * follow the flight), an elevator hides her for the ride and she steps out
 * on the other level. Her body collider is lifted while she walks and put
 * down where she stops.
 */
import type { Object3D } from "three";
import type { BodyMove, BodyPose, RoutePoint } from "../contracts.js";
import type { DoorRecord, NpcRecord } from "./context.js";
import { connectorIdOf, normAngle, rigRotationOf, stepTowards, STAFF_RIDE_SECONDS, STAFF_SPEED, yawOfRig, type ConnectorKindOf } from "./embodiment.js";
import type { Aabb } from "./physics.js";

/** What walking needs from the world (index.ts). */
export interface WalkersHost {
  elevation(level: string): number;
  levelRoot(level: string): Object3D;
  connectorKind: ConnectorKindOf;
  doors(): readonly DoorRecord[];
  /** Open / close a door record (animation + its leaf colliders). */
  setDoorOpen(door: DoorRecord, open: boolean): void;
  /** Is anybody but `except` (the player, another NPC) standing in the doorway? */
  doorwayOccupied(door: DoorRecord, except: NpcRecord | null): boolean;
  /** A standing body box at (x, z) on a floor at `elevation`, registered as a collider of `level`. */
  addBody(x: number, z: number, elevation: number, level: string): Aabb;
  removeCollider(box: Aabb): void;
  /** The staff member's post (facility data): position, rig rotation (rad), level. */
  post(n: NpcRecord): { x: number; z: number; rot: number; level: string } | null;
  markShadows(): void;
}

interface Walk {
  n: NpcRecord;
  route: RoutePoint[];
  /** Index of the next route point. */
  i: number;
  /** Feet height now, and at the start of the current segment (stairs interpolate between them). */
  y: number;
  from: { x: number; z: number; y: number };
  /** Seconds left inside an elevator car (0: walking). */
  riding: number;
  yaw: number | undefined;
  phase: number;
  /** Doors this walk opened (closed again once passed and clear). */
  opened: Set<DoorRecord>;
  resolve(r: BodyMove): void;
  signal?: AbortSignal;
  onAbort?: () => void;
}

/** Doors open for a walker within this distance (m) of their centre, and close again beyond `DOOR_CLOSE`. */
const DOOR_OPEN = 1.9;
const DOOR_CLOSE = 2.6;

export class StaffWalkers {
  private readonly walks = new Map<string, Walk>();

  constructor(private readonly host: WalkersHost) {}

  /** Staff ids walking now. */
  get active(): number {
    return this.walks.size;
  }

  busy(staffId: string): boolean {
    return this.walks.has(staffId);
  }

  /** Walking NPC records (culling refreshes them every frame). */
  walking(): NpcRecord[] {
    return [...this.walks.values()].map((w) => w.n);
  }

  /** Is this NPC inside an elevator car right now (hidden)? */
  riding(staffId: string): boolean {
    return (this.walks.get(staffId)?.riding ?? 0) > 0;
  }

  /** Walk `n` along a world-model route; resolves where it stopped. */
  start(n: NpcRecord, route: readonly RoutePoint[], opts: { yaw?: number; signal?: AbortSignal } = {}): Promise<BodyMove> {
    this.stop(n.id, false);
    return new Promise<BodyMove>((resolve) => {
      if (opts.signal?.aborted) {
        resolve({ arrived: false, pose: this.pose(n), replans: 0 });
        return;
      }
      if (n.collider) {
        this.host.removeCollider(n.collider);
        n.collider = null;
      }
      const y = this.host.elevation(n.level);
      const w: Walk = { n, route: route.map((p) => ({ ...p })), i: 0, y, from: { x: n.x, z: n.z, y }, riding: 0, yaw: opts.yaw, phase: 0, opened: new Set(), resolve, ...(opts.signal ? { signal: opts.signal } : {}) };
      if (opts.signal) {
        w.onAbort = () => this.stop(n.id, false);
        opts.signal.addEventListener("abort", w.onAbort, { once: true });
      }
      this.walks.set(n.id, w);
      if (!w.route.length) this.finish(w, true);
    });
  }

  /** Stop a walk where the NPC is (`arrived` false unless it was done). */
  stop(staffId: string, arrived: boolean): void {
    const w = this.walks.get(staffId);
    if (w) this.finish(w, arrived);
  }

  /** Stop every walk (world disposed). */
  stopAll(): void {
    for (const w of [...this.walks.values()]) this.finish(w, false);
  }

  /** Advance every walk by `dt` seconds; true when anything moved (shadows, culling). */
  update(dt: number): boolean {
    if (!this.walks.size) return false;
    for (const w of [...this.walks.values()]) this.advance(w, dt);
    return true;
  }

  /** Put `n` at a pose at once (a restored world), or back at their post (`null`). */
  place(n: NpcRecord, pose: BodyPose | null): void {
    this.stop(n.id, false);
    const post = pose ? null : this.host.post(n);
    const level = pose?.level ?? post?.level ?? n.level;
    const x = pose?.x ?? post?.x ?? n.x;
    const z = pose?.z ?? post?.z ?? n.z;
    const rot = pose ? rigRotationOf(pose.yaw) : (post?.rot ?? n.rot);
    if (n.collider) this.host.removeCollider(n.collider);
    if (level !== n.level) this.host.levelRoot(level).add(n.rig.root);
    n.x = x;
    n.z = z;
    n.level = level;
    n.rot = rot;
    const y = this.host.elevation(level);
    n.rig.root.position.set(x, y, z);
    n.rig.root.rotation.y = rot;
    n.rig.root.visible = true;
    n.collider = this.host.addBody(x, z, y, level);
    this.host.markShadows();
  }

  /** Where `n` is drawn (world convention: yaw 0 looks −Z). */
  pose(n: NpcRecord): BodyPose {
    const w = this.walks.get(n.id);
    return { x: n.x, y: w ? w.y : this.host.elevation(n.level), z: n.z, yaw: yawOfRig(n.rig.root.rotation.y), pitch: 0, level: n.level };
  }

  private advance(w: Walk, dt: number): void {
    const { n } = w;
    const rig = n.rig;
    if (w.riding > 0) {
      w.riding -= dt;
      if (w.riding > 0) return;
      // out of the car on the destination level
      const p = w.route[w.i]!;
      w.riding = 0;
      this.moveLevel(n, p.level);
      n.x = p.x;
      n.z = p.z;
      w.y = this.host.elevation(p.level);
      w.from = { x: p.x, z: p.z, y: w.y };
      w.i++;
      rig.root.visible = true;
      rig.root.position.set(n.x, w.y, n.z);
    }
    let budget = STAFF_SPEED * dt;
    while (budget > 1e-6 && w.i < w.route.length) {
      const p = w.route[w.i]!;
      const kind = p.via ? this.host.connectorKind(connectorIdOf(p.via)) : null;
      if (kind === "elevator") {
        // into the car: hidden for the ride
        w.riding = STAFF_RIDE_SECONDS;
        rig.root.visible = false;
        return;
      }
      const seg = Math.hypot(p.x - w.from.x, p.z - w.from.z);
      const s = stepTowards(n.x, n.z, p, budget);
      if (Math.hypot(p.x - n.x, p.z - n.z) > 1e-4) rig.root.rotation.y = this.turn(rig.root.rotation.y, Math.atan2(p.x - n.x, p.z - n.z), dt);
      n.x = s.x;
      n.z = s.z;
      budget = s.rest;
      if (p.via) {
        // a flight: the feet follow it from the floor of one level to the other's
        const done = seg > 1e-6 ? Math.min(1, Math.hypot(n.x - w.from.x, n.z - w.from.z) / seg) : 1;
        w.y = w.from.y + (this.host.elevation(p.level) - w.from.y) * done;
      }
      if (s.reached) {
        if (p.level !== n.level) this.moveLevel(n, p.level);
        w.y = this.host.elevation(p.level);
        w.from = { x: p.x, z: p.z, y: w.y };
        w.i++;
      }
    }
    // walking bob (the merged body moves as one): a step every ~0.55 m
    w.phase += STAFF_SPEED * dt * 5.7;
    rig.body.position.y = Math.abs(Math.sin(w.phase)) * 0.045;
    rig.body.rotation.z = Math.sin(w.phase) * 0.035;
    rig.root.position.set(n.x, w.y, n.z);
    this.doors(w);
    if (w.i >= w.route.length) this.finish(w, true);
  }

  /** Turn smoothly towards `target` (rig rotation). */
  private turn(from: number, target: number, dt: number): number {
    const d = normAngle(target - from);
    return from + d * Math.min(1, dt * 10);
  }

  private moveLevel(n: NpcRecord, level: string): void {
    if (level === n.level) return;
    n.level = level;
    this.host.levelRoot(level).add(n.rig.root);
  }

  /** Open closed doors ahead, close the ones passed (when nobody stands in them). */
  private doors(w: Walk): void {
    const { n } = w;
    for (const d of this.host.doors()) {
      if (d.level !== n.level) continue;
      const dist = Math.hypot(d.centre.x - n.x, d.centre.z - n.z);
      if (!d.open && !d.locked && dist < DOOR_OPEN) {
        this.host.setDoorOpen(d, true);
        w.opened.add(d);
      }
    }
    for (const d of [...w.opened]) {
      if (d.level === n.level && Math.hypot(d.centre.x - n.x, d.centre.z - n.z) < DOOR_CLOSE) continue;
      if (this.host.doorwayOccupied(d, null)) continue;
      if (d.open) this.host.setDoorOpen(d, false);
      w.opened.delete(d);
    }
  }

  private finish(w: Walk, arrived: boolean): void {
    if (this.walks.get(w.n.id) !== w) return;
    this.walks.delete(w.n.id);
    const { n } = w;
    const rig = n.rig;
    if (w.signal && w.onAbort) w.signal.removeEventListener("abort", w.onAbort);
    // stopped inside a car: out on the level it was on
    rig.root.visible = true;
    rig.body.position.y = 0;
    rig.body.rotation.z = 0;
    if (arrived && w.yaw !== undefined) rig.root.rotation.y = rigRotationOf(w.yaw);
    n.rot = rig.root.rotation.y;
    // half-way up a flight: on the floor of the level it is assigned to
    w.y = this.host.elevation(n.level);
    rig.root.position.set(n.x, w.y, n.z);
    for (const d of w.opened) if (d.open && !this.host.doorwayOccupied(d, null) && Math.hypot(d.centre.x - n.x, d.centre.z - n.z) >= 1.2) this.host.setDoorOpen(d, false);
    n.collider = this.host.addBody(n.x, n.z, w.y, n.level);
    this.host.markShadows();
    w.resolve({ arrived, pose: { x: n.x, y: w.y, z: n.z, yaw: yawOfRig(rig.root.rotation.y), pitch: 0, level: n.level }, replans: 0 });
  }
}
