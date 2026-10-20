/**
 * Visibility (EMBODIED §4, R7): per-level occlusion grids (0.25 m) from the
 * collision model's opaque colliders at eye height, line of sight by ray
 * marching, the horizontal field of view of a pose and `canSee`.
 *
 * Occluders: colliders with `opaque` that span the eye height (1.62 m above
 * their level's floor) — walls, partitions, trees, blocks, solid equipment
 * taller than eye height, and door leaves while the door is closed (door
 * state from `WorldDynamics.doorState`, read at query time). Windows,
 * bodies, low furniture and the lintel over an open doorway do not occlude.
 * A displaced cart occludes at its new position after `invalidate(area)`.
 *
 * Yaw convention (the renderer's): yaw 0 looks towards −Z; the view
 * direction is (−sin yaw, −cos yaw).
 */
import type { FacilityDefinition } from "@clinicalcraft/core";
import { DEFAULT_PERCEPTION, type Collider, type CollisionModel, type Pose, type Vec2 } from "./contracts.js";
import { spansEye } from "./collision.js";
import { levelInfos } from "./levels.js";
import { AreaIndex, cellIndex, distanceToArea, footprintArea, forEachCellCovered, inFrame, makeFrame, type Area, type GridFrame, type WorldDynamics } from "./raster.js";

/** Default occlusion cell (m). */
export const OCCLUSION_CELL = 0.25;

/** Something to look at: a level, a centre and an optional (rotated, axis-aligned) footprint. */
export interface SightTarget {
  level: string;
  position: { x: number; z: number };
  footprint?: { w: number; d: number };
  /**
   * Entity id of the target: a door's own leaves never hide it (closed
   * leaves are rasterised thin-safe, wider than the 0.2 m door footprint).
   */
  id?: string;
}

/** Occlusion raster of one level. */
export interface OcclusionGrid extends GridFrame {
  /** 1 = an opaque static collider covers the cell at eye height. */
  opaque: Uint8Array;
  /** Door index + 1 for cells covered by a door leaf (opaque while that door is closed). */
  door: Int32Array;
  /** 1 = a displaced cart (or other dynamic occluder) covers the cell. */
  dynamic: Uint8Array;
}

export interface VisibilityOptions {
  /** Cell size (default 0.25 m). */
  cell?: number;
  /** Physical state (door states, displaced carts). */
  dynamics?: WorldDynamics;
  /** Registry rotation of an entity (a displaced cart turned by 90° swaps its footprint); default 0. */
  rotOf?: (id: string) => number;
}

export interface SightOptions {
  /** Max distance (m, to the footprint). Default `DEFAULT_PERCEPTION.visibilityRange` (15). */
  range?: number;
  /** Horizontal field of view (degrees). Default 120; ≥ 360 disables the test. */
  fovDeg?: number;
}

/** Forward direction of a yaw (renderer convention: yaw 0 → −Z). */
export function forwardOf(yaw: number): Vec2 {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

/** Yaw that faces from `from` towards `to`. */
export function yawTowards(from: { x: number; z: number }, to: { x: number; z: number }): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/** Is `point` inside the horizontal field of view of a pose (degrees, total angle)? */
export function inFieldOfView(pose: Pick<Pose, "x" | "z" | "yaw">, point: { x: number; z: number }, fovDeg = DEFAULT_PERCEPTION.fovDeg): boolean {
  if (fovDeg >= 360) return true;
  const dx = point.x - pose.x, dz = point.z - pose.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-9) return true;
  const f = forwardOf(pose.yaw);
  const cos = (dx * f.x + dz * f.z) / len;
  return cos >= Math.cos(((fovDeg / 2) * Math.PI) / 180) - 1e-12;
}

/** Sample points of a target: the footprint centre and its four corners inset to 3/4 of the half-extents. */
export function sightSamples(target: SightTarget): Vec2[] {
  const { x, z } = target.position;
  if (!target.footprint) return [{ x, z }];
  const hw = (target.footprint.w / 2) * 0.75, hd = (target.footprint.d / 2) * 0.75;
  return [
    { x, z },
    { x: x - hw, z: z - hd },
    { x: x + hw, z: z - hd },
    { x: x - hw, z: z + hd },
    { x: x + hw, z: z + hd },
  ];
}

type Occluder = Collider & { door: number };

/** Visibility model of one facility (static occlusion + dynamic door/cart state). */
export class VisibilityModel {
  private readonly grids = new Map<string, OcclusionGrid>();
  private readonly occluders = new Map<string, AreaIndex<Occluder>>();
  private readonly byEntity = new Map<string, Occluder[]>();
  private readonly doorIds: string[];
  private readonly doorIndex: Map<string, number>;
  private readonly dynamics: WorldDynamics;
  private readonly rotOf: (id: string) => number;
  private readonly bounds: Area;

  constructor(facility: Pick<FacilityDefinition, "levels" | "bounds">, collision: CollisionModel, opts: VisibilityOptions = {}) {
    const cell = opts.cell ?? OCCLUSION_CELL;
    this.dynamics = opts.dynamics ?? {};
    this.rotOf = opts.rotOf ?? (() => 0);
    this.bounds = collision.bounds;
    this.doorIds = collision.doors.map((d) => d.id);
    const doorIndex = new Map(this.doorIds.map((id, i) => [id, i + 1]));
    this.doorIndex = doorIndex;
    for (const level of levelInfos(facility)) {
      const frame = makeFrame(collision.bounds, level.id, level.elevation, cell);
      const n = frame.cols * frame.rows;
      this.grids.set(level.id, { ...frame, opaque: new Uint8Array(n), door: new Int32Array(n), dynamic: new Uint8Array(n) });
      const occluders = collision.colliders
        .filter((c) => c.level === level.id && c.opaque && spansEye(c, level.elevation))
        .map((c) => ({ ...c, door: c.kind === "door" && c.entity ? (doorIndex.get(c.entity) ?? 0) : 0 }));
      this.occluders.set(level.id, new AreaIndex(occluders));
      for (const c of occluders) if (c.entity && c.kind === "equipment") this.byEntity.set(c.entity, [...(this.byEntity.get(c.entity) ?? []), c]);
    }
    this.invalidate();
  }

  /** Occlusion grid of a level (null for unknown levels). */
  grid(level: string): OcclusionGrid | null {
    return this.grids.get(level) ?? null;
  }

  /**
   * Re-rasterise occluders in an area (all levels when `area.level` is
   * omitted; everything when `area` is omitted) — after a cart moved.
   * Door open/closed state needs no invalidation (read at query time).
   */
  invalidate(area?: Area & { level?: string }): void {
    const displaced = new Map((this.dynamics.displaced?.() ?? []).map((d) => [d.id, d.position]));
    const removed = new Set(this.dynamics.removed?.() ?? []);
    for (const [level, g] of this.grids) {
      if (area?.level && area.level !== level) continue;
      const clip = area ?? this.bounds;
      forEachCellCovered(g, clip, (i) => {
        g.opaque[i] = 0;
        g.door[i] = 0;
        g.dynamic[i] = 0;
      });
      for (const c of this.occluders.get(level)!.query(clip, g.cell)) {
        if (c.entity && (displaced.has(c.entity) || removed.has(c.entity))) continue;
        if (c.door) forEachCellCovered(g, c, (i) => (g.door[i] = c.door), clip);
        else forEachCellCovered(g, c, (i) => (g.opaque[i] = 1), clip);
      }
      // displaced carts occlude where they stand now (same footprint and height)
      for (const [id, pos] of displaced) {
        if (pos.level !== level) continue;
        for (const c of this.byEntity.get(id) ?? []) forEachCellCovered(g, shiftBox(c, pos, this.rotOf(id)), (i) => (g.dynamic[i] = 1), clip);
      }
    }
  }

  /** Is the cell opaque right now (static, closed door, displaced cart)? `ownDoor`: the target door's index (its leaves never hide it). */
  private blocked(g: OcclusionGrid, i: number, ownDoor = 0): boolean {
    if (g.opaque[i] || g.dynamic[i]) return true;
    const d = g.door[i];
    if (!d || d === ownDoor) return false;
    return !this.dynamics.doorState?.(this.doorIds[d - 1])?.open;
  }

  /**
   * Line of sight at eye height on a level from `a` to `b`. The march starts
   * half a cell from `a` and stops when it reaches `b` or enters `stopIn`
   * (the target's own footprint, so a tall target does not hide itself);
   * `ownDoor` (index + 1 of a door) makes that door's leaves transparent.
   */
  lineOfSight(level: string, a: { x: number; z: number }, b: { x: number; z: number }, stopIn?: Area, ownDoor = 0, extra?: ReadonlySet<number>): boolean {
    const g = this.grids.get(level);
    if (!g) return false;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const step = g.cell / 3;
    const steps = Math.max(1, Math.ceil(len / step));
    const skip = Math.ceil(g.cell / 2 / step);
    for (let s = skip; s <= steps; s++) {
      const t = s / steps;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (stopIn && x >= stopIn.minX && x <= stopIn.maxX && z >= stopIn.minZ && z <= stopIn.maxZ) return true;
      if (!inFrame(g, x, z)) continue;
      const i = cellIndex(g, x, z);
      if (this.blocked(g, i, ownDoor) || extra?.has(i)) return false;
    }
    return true;
  }

  /**
   * `visibleFrom` with an entity's occluders standing somewhere else too (`moved`: a cart about to be parked
   * there) — would it hide the target? Its occlusion where it stands now is kept (conservative).
   */
  visibleWith(level: string, eye: { x: number; z: number }, target: SightTarget, moved: { id: string; x: number; z: number; rot?: number }): boolean {
    const g = this.grids.get(level);
    if (!g || target.level !== level) return false;
    const extra = new Set<number>();
    for (const c of this.byEntity.get(moved.id) ?? []) forEachCellCovered(g, shiftBox(c, moved, this.rotOf(moved.id)), (i) => extra.add(i));
    const own = footprintArea(target);
    const stopIn = { minX: own.minX - 0.05, maxX: own.maxX + 0.05, minZ: own.minZ - 0.05, maxZ: own.maxZ + 0.05 };
    const ownDoor = target.id ? (this.doorIndex.get(target.id) ?? 0) : 0;
    return sightSamples(target).some((p) => this.lineOfSight(level, eye, p, stopIn, ownDoor, extra));
  }

  /** Line of sight from a point to any sample of a target (no range or field-of-view test). */
  visibleFrom(level: string, eye: { x: number; z: number }, target: SightTarget): boolean {
    if (target.level !== level) return false;
    const own = footprintArea(target);
    const stopIn = { minX: own.minX - 0.05, maxX: own.maxX + 0.05, minZ: own.minZ - 0.05, maxZ: own.maxZ + 0.05 };
    const ownDoor = target.id ? (this.doorIndex.get(target.id) ?? 0) : 0;
    return sightSamples(target).some((p) => this.lineOfSight(level, eye, p, stopIn, ownDoor));
  }

  /**
   * Can an actor at `pose` see the target: same level, within range of its
   * footprint, and at least one sample (centre or an inset corner) inside
   * the field of view with line of sight — partial occlusion still counts.
   */
  canSee(pose: Pose, target: SightTarget, opts: SightOptions = {}): boolean {
    if (pose.level !== target.level) return false;
    const range = opts.range ?? DEFAULT_PERCEPTION.visibilityRange;
    const own = footprintArea(target);
    if (distanceToArea(pose.x, pose.z, own) > range) return false;
    const stopIn = { minX: own.minX - 0.05, maxX: own.maxX + 0.05, minZ: own.minZ - 0.05, maxZ: own.maxZ + 0.05 };
    const inside = pose.x >= own.minX && pose.x <= own.maxX && pose.z >= own.minZ && pose.z <= own.maxZ;
    if (inside) return true;
    const ownDoor = target.id ? (this.doorIndex.get(target.id) ?? 0) : 0;
    return sightSamples(target).some((p) => inFieldOfView(pose, p, opts.fovDeg) && this.lineOfSight(pose.level, pose, p, stopIn, ownDoor));
  }
}

/** A collider box moved to a new floor position (rotations by an odd multiple of 90° swap width and depth). */
export function shiftBox(c: Area & { minY?: number; maxY?: number }, pos: { x: number; z: number; rot?: number }, fromRot = 0): Area {
  const w = c.maxX - c.minX, d = c.maxZ - c.minZ;
  const turn = pos.rot === undefined ? 0 : Math.round((((pos.rot - fromRot) % 180) + 180) % 180);
  const [hw, hd] = turn === 90 ? [d / 2, w / 2] : [w / 2, d / 2];
  return { minX: pos.x - hw, maxX: pos.x + hw, minZ: pos.z - hd, maxZ: pos.z + hd };
}
