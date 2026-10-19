/**
 * Per-level navigation grids built from the collision model (EMBODIED §7).
 *
 * 0.5 m cells; a cell is blocked when a body of radius `NAV_INFLATE`
 * (avatar radius 0.28 + 0.08 margin + 0.02, as the web autopilot) at its
 * centre would overlap a collider that intersects the body height (0.05 m …
 * 1.78 m above the level's floor) — the web nav grid's rule. Layers:
 *
 * - `base`: static blockers — walls, partitions, windows, solid equipment,
 *   patient bodies and beds, trees, blocks, sign posts, stairs flights and
 *   balustrades — and, off the default level, the void outside its floor
 *   slabs (stairwells included; the flights are connector portals).
 *   Staff bodies are NOT static (staff walk; the mover avoids them).
 * - `door`: door leaves (passable unless the door is locked).
 * - `dynamic`: temporary obstacles and displaced carts (re-stamped by
 *   `invalidate(area)` from `WorldDynamics`).
 * - `zone`: access zones (only the listed roles may enter).
 */
import type { FacilityDefinition } from "@clinicalcraft/core";
import type { ActorRole, Collider, CollisionModel, DynamicObstacle, EntityId } from "../contracts.js";
import { buildingLevelInfos, accessZones, defaultLevelId, levelInfos } from "../levels.js";
import { PHYSICS } from "../physics.js";
import { AreaIndex, forEachCellInArea, forEachCellStrict, makeFrame, type Area, type GridFrame, type WorldDynamics } from "../raster.js";
import { shiftBox } from "../visibility.js";

/** Navigation cell size (m). */
export const NAV_CELL = 0.5;
/** Avatar clearance used for planning (V4 radius + 0.08 m margin, the web autopilot's NAV_RADIUS). */
export const NAV_RADIUS = PHYSICS.radius + 0.08;
/** Inflation of colliders on the grid (NAV_RADIUS + 0.02, as the web nav grid). */
export const NAV_INFLATE = NAV_RADIUS + 0.02;

/** Navigation grid of one level. */
export interface NavLevelGrid extends GridFrame {
  /** 1 = statically blocked (or outside the level's floor). */
  base: Uint8Array;
  /** Door index + 1 (into `NavGrids.doorIds`) for cells covered by a door leaf. */
  door: Int32Array;
  /** Dynamic blocker index + 1 (into `NavGrids.dynamicIds`): obstacle or displaced entity. */
  dynamic: Int32Array;
  /** Zone-set id (index + 1 into `NavGrids.zoneSets`), 0 = unrestricted. */
  zone: Uint16Array;
}

/** What a planning mask leaves out (diagnosis of failures). */
export interface MaskOptions {
  role: ActorRole;
  /** Ignore access zones (ACCESS_DENIED diagnosis). */
  ignoreZones?: boolean;
  /** Treat locked doors as passable (PATH_BLOCKED diagnosis). */
  ignoreLocks?: boolean;
  /** Ignore obstacles and displaced carts (PATH_BLOCKED diagnosis). */
  ignoreDynamic?: boolean;
  /** Zones the actor already stands in (it may always leave them). */
  allowZones?: readonly string[];
}

type Blocker = Collider;

/** The navigation grids of a facility, one per level, with local re-stamping. */
export class NavGrids {
  readonly levels = new Map<string, NavLevelGrid>();
  readonly doorIds: string[];
  /** Ids of dynamic blockers: obstacle ids and displaced entity ids (index + 1 in `dynamic`). */
  dynamicIds: string[] = [];
  /** Access zones per zone-set id (index + 1). */
  readonly zoneSets: { ids: string[]; roles: Set<string> }[] = [];
  readonly zones: ReturnType<typeof accessZones>;
  private readonly blockers = new Map<string, AreaIndex<Blocker>>();
  private readonly byEntity = new Map<string, Blocker[]>();
  private readonly bounds: Area;
  private readonly floors = new Map<string, Area[] | null>();
  private readonly dynamics: WorldDynamics;
  private readonly rotOf: (id: EntityId) => number;
  /** Bumped by every `invalidate` (cache key of composed masks). */
  version = 0;

  constructor(facility: FacilityDefinition, collision: CollisionModel, opts: { dynamics?: WorldDynamics; rotOf?: (id: EntityId) => number; cell?: number } = {}) {
    const cell = opts.cell ?? NAV_CELL;
    this.dynamics = opts.dynamics ?? {};
    this.rotOf = opts.rotOf ?? (() => 0);
    this.bounds = collision.bounds;
    this.doorIds = collision.doors.map((d) => d.id);
    this.zones = accessZones(facility);
    const ground = defaultLevelId(facility);
    const levels = levelInfos(facility);
    for (const level of levels) {
      const frame = makeFrame(collision.bounds, level.id, level.elevation, cell);
      const n = frame.cols * frame.rows;
      this.levels.set(level.id, { ...frame, base: new Uint8Array(n), door: new Int32Array(n), dynamic: new Int32Array(n), zone: new Uint16Array(n) });
      // the walkable floor: everywhere on the default level; on an upper level its floor slabs (the buildings
      // spanning it minus their stairwells, collision model `slab` colliders), else inside those buildings
      const slabs = collision.colliders.filter((c) => c.kind === "slab" && c.level === level.id);
      this.floors.set(
        level.id,
        level.id === ground
          ? null
          : slabs.length
            ? slabs.map((c) => ({ minX: c.minX - 1e-6, maxX: c.maxX + 1e-6, minZ: c.minZ - 1e-6, maxZ: c.maxZ + 1e-6 }))
            : facility.buildings.filter((b) => buildingLevelInfos(facility, b).some((l) => l.id === level.id)).map((b) => ({ minX: b.rect.x - b.rect.w / 2, maxX: b.rect.x + b.rect.w / 2, minZ: b.rect.z - b.rect.d / 2, maxZ: b.rect.z + b.rect.d / 2 })),
      );
      const relevant = collision.colliders.filter((c) => c.level === level.id && !(c.kind === "npc" && c.entity?.startsWith("staff:")) && c.maxY - level.elevation > 0.05 && c.minY - level.elevation < PHYSICS.height);
      this.blockers.set(level.id, new AreaIndex(relevant));
      for (const c of relevant) if (c.entity && c.kind !== "door") this.byEntity.set(c.entity, [...(this.byEntity.get(c.entity) ?? []), c]);
    }
    // access zones (static)
    const setIds = new Map<string, number>();
    for (const [level, g] of this.levels) {
      const zones = this.zones.filter((z) => z.level === level);
      if (!zones.length) continue;
      for (let i = 0; i < g.zone.length; i++) {
        const x = g.minX + ((i % g.cols) + 0.5) * g.cell, z = g.minZ + (Math.floor(i / g.cols) + 0.5) * g.cell;
        const inside = zones.filter((zone) => Math.abs(x - zone.rect.x) <= zone.rect.w / 2 && Math.abs(z - zone.rect.z) <= zone.rect.d / 2);
        if (!inside.length) continue;
        const key = inside.map((zone) => zone.id).join("|");
        let id = setIds.get(key);
        if (id === undefined) {
          const roles = new Set<string>(inside[0].roles);
          for (const zone of inside.slice(1)) for (const r of [...roles]) if (!zone.roles.includes(r as ActorRole)) roles.delete(r);
          this.zoneSets.push({ ids: inside.map((zone) => zone.id), roles });
          id = this.zoneSets.length;
          setIds.set(key, id);
        }
        g.zone[i] = id;
      }
    }
    this.invalidate();
  }

  /** Grid of a level (null when unknown). */
  grid(level: string): NavLevelGrid | null {
    return this.levels.get(level) ?? null;
  }

  /**
   * Re-stamp blocked cells in an area (a level, or every level), or
   * everything when `area` is omitted: after a cart moved (call it for the
   * old and the new spot), a door was locked/unlocked, an obstacle appeared
   * or disappeared, or an item was picked up / put down.
   */
  invalidate(area?: Area & { level?: string }): void {
    this.version++;
    const obstacles: readonly DynamicObstacle[] = this.dynamics.obstacles?.() ?? [];
    const displaced = this.dynamics.displaced?.() ?? [];
    const away = new Set([...displaced.map((d) => d.id), ...(this.dynamics.removed?.() ?? [])]);
    this.dynamicIds = [...obstacles.map((o) => o.id), ...displaced.map((d) => d.id)];
    const doorIndex = new Map(this.doorIds.map((id, i) => [id, i + 1]));
    for (const [level, g] of this.levels) {
      if (area?.level && area.level !== level) continue;
      // cells whose blocking may change: the area grown by the inflation radius
      const clip: Area = area ? { minX: area.minX - NAV_INFLATE, maxX: area.maxX + NAV_INFLATE, minZ: area.minZ - NAV_INFLATE, maxZ: area.maxZ + NAV_INFLATE } : this.bounds;
      const floors = this.floors.get(level) ?? null;
      // reset, then the void outside the level's floor
      forEachCellInArea(g, clip, (i) => {
        const x = g.minX + ((i % g.cols) + 0.5) * g.cell, z = g.minZ + (Math.floor(i / g.cols) + 0.5) * g.cell;
        g.base[i] = floors && !floors.some((f) => x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ) ? 1 : 0;
        g.door[i] = 0;
        g.dynamic[i] = 0;
      });
      for (const c of this.blockers.get(level)!.query(clip, NAV_INFLATE)) {
        if (c.entity && away.has(c.entity)) continue;
        if (c.kind === "door") {
          const d = doorIndex.get(c.entity ?? "") ?? 0;
          forEachCellStrict(g, c, NAV_INFLATE, (i) => {
            if (!g.door[i]) g.door[i] = d;
          }, clip);
        } else forEachCellStrict(g, c, NAV_INFLATE, (i) => (g.base[i] = 1), clip);
      }
      obstacles.forEach((o, k) => {
        if (o.level !== level) return;
        const box = { minX: o.rect.x - o.rect.w / 2, maxX: o.rect.x + o.rect.w / 2, minZ: o.rect.z - o.rect.d / 2, maxZ: o.rect.z + o.rect.d / 2 };
        forEachCellStrict(g, box, NAV_INFLATE, (i) => {
          if (!g.dynamic[i]) g.dynamic[i] = k + 1;
        }, clip);
      });
      displaced.forEach((d, k) => {
        if (d.position.level !== level) return;
        for (const c of this.byEntity.get(d.id) ?? []) {
          forEachCellStrict(g, shiftBox(c, d.position, this.rotOf(d.id)), NAV_INFLATE, (i) => {
            if (!g.dynamic[i]) g.dynamic[i] = obstacles.length + k + 1;
          }, clip);
        }
      });
    }
  }

  /** Is the door locked right now? */
  locked(doorIndex: number): boolean {
    return this.dynamics.doorState?.(this.doorIds[doorIndex - 1])?.locked === true;
  }

  /** May `role` enter cells of a zone set (zones the actor stands in are allowed)? */
  zoneAllows(zoneSet: number, role: string, allow: readonly string[] = []): boolean {
    if (!zoneSet) return true;
    const set = this.zoneSets[zoneSet - 1];
    return set.roles.has(role) || set.ids.every((id) => allow.includes(id));
  }

  /** Blocked mask (1 = blocked) of a level for a role and diagnosis options. */
  compose(level: string, opts: MaskOptions): Uint8Array | null {
    const g = this.levels.get(level);
    if (!g) return null;
    const out = new Uint8Array(g.base.length);
    const lockedDoors = new Map<number, boolean>();
    const zoneOk = new Map<number, boolean>();
    for (let i = 0; i < out.length; i++) {
      if (g.base[i]) {
        out[i] = 1;
        continue;
      }
      if (!opts.ignoreDynamic && g.dynamic[i]) {
        out[i] = 1;
        continue;
      }
      const d = g.door[i];
      if (d && !opts.ignoreLocks) {
        let l = lockedDoors.get(d);
        if (l === undefined) lockedDoors.set(d, (l = this.locked(d)));
        if (l) {
          out[i] = 1;
          continue;
        }
      }
      const z = g.zone[i];
      if (z && !opts.ignoreZones) {
        let ok = zoneOk.get(z);
        if (ok === undefined) zoneOk.set(z, (ok = this.zoneAllows(z, opts.role, opts.allowZones)));
        if (!ok) out[i] = 1;
      }
    }
    return out;
  }

  /** Zones (ids) containing a point on a level. */
  zonesAt(level: string, x: number, z: number): string[] {
    return this.zones.filter((zone) => zone.level === level && Math.abs(x - zone.rect.x) <= zone.rect.w / 2 && Math.abs(z - zone.rect.z) <= zone.rect.d / 2).map((zone) => zone.id);
  }
}
