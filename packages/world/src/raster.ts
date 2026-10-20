/**
 * Per-level 2D grids over a facility's walkable bounds (shared by the
 * navigation grids and the occlusion grids): frames, cell indexing, box
 * rasterisation and a bucketed spatial index for local re-stamping.
 */
import type { Vec2, WorldDynamics } from "./contracts.js";

export type { WorldDynamics };

/** A grid over the facility bounds on one level. Cell (ix, iz) covers [minX + ix·cell, …) × [minZ + iz·cell, …). */
export interface GridFrame {
  level: string;
  /** Floor elevation of the level (m). */
  elevation: number;
  minX: number;
  minZ: number;
  cell: number;
  cols: number;
  rows: number;
}

/** An axis-aligned area on the ground plane. */
export interface Area {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Frame over the bounds with square cells of `cell` metres. */
export function makeFrame(bounds: Area, level: string, elevation: number, cell: number): GridFrame {
  return {
    level,
    elevation,
    minX: bounds.minX,
    minZ: bounds.minZ,
    cell,
    cols: Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cell)),
    rows: Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / cell)),
  };
}

/** Cell index of a point (clamped into the grid). */
export function cellIndex(g: GridFrame, x: number, z: number): number {
  const ix = Math.max(0, Math.min(g.cols - 1, Math.floor((x - g.minX) / g.cell)));
  const iz = Math.max(0, Math.min(g.rows - 1, Math.floor((z - g.minZ) / g.cell)));
  return iz * g.cols + ix;
}

/** Is the point inside the grid (not clamped)? */
export function inFrame(g: GridFrame, x: number, z: number): boolean {
  return x >= g.minX && z >= g.minZ && x < g.minX + g.cols * g.cell && z < g.minZ + g.rows * g.cell;
}

/** Centre of a cell. */
export function cellPoint(g: GridFrame, i: number): Vec2 {
  return { x: g.minX + ((i % g.cols) + 0.5) * g.cell, z: g.minZ + (Math.floor(i / g.cols) + 0.5) * g.cell };
}

/** Visit the cells whose centre lies inside an area (edges inclusive). */
export function forEachCellInArea(g: GridFrame, area: Area, fn: (i: number) => void): void {
  const x0 = Math.max(0, Math.ceil((area.minX - g.minX) / g.cell - 0.5));
  const x1 = Math.min(g.cols - 1, Math.floor((area.maxX - g.minX) / g.cell - 0.5));
  const z0 = Math.max(0, Math.ceil((area.minZ - g.minZ) / g.cell - 0.5));
  const z1 = Math.min(g.rows - 1, Math.floor((area.maxZ - g.minZ) / g.cell - 0.5));
  for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) fn(iz * g.cols + ix);
}

/**
 * Visit the cells whose centre lies strictly inside `box` grown by `grow`
 * (the web nav grid's rule: a body of radius `grow` at the centre would
 * overlap the box), optionally clipped to `clip`.
 */
export function forEachCellStrict(g: GridFrame, box: Area, grow: number, fn: (i: number) => void, clip?: Area): void {
  const minX = box.minX - grow, maxX = box.maxX + grow, minZ = box.minZ - grow, maxZ = box.maxZ + grow;
  const x0 = Math.max(0, Math.floor((Math.max(minX, clip?.minX ?? -Infinity) - g.minX) / g.cell));
  const x1 = Math.min(g.cols - 1, Math.floor((Math.min(maxX, clip?.maxX ?? Infinity) - g.minX) / g.cell));
  const z0 = Math.max(0, Math.floor((Math.max(minZ, clip?.minZ ?? -Infinity) - g.minZ) / g.cell));
  const z1 = Math.min(g.rows - 1, Math.floor((Math.min(maxZ, clip?.maxZ ?? Infinity) - g.minZ) / g.cell));
  for (let iz = z0; iz <= z1; iz++) {
    const cz = g.minZ + (iz + 0.5) * g.cell;
    if (cz <= minZ || cz >= maxZ) continue;
    if (clip && (cz < clip.minZ || cz > clip.maxZ)) continue;
    for (let ix = x0; ix <= x1; ix++) {
      const cx = g.minX + (ix + 0.5) * g.cell;
      if (cx <= minX || cx >= maxX) continue;
      if (clip && (cx < clip.minX || cx > clip.maxX)) continue;
      fn(iz * g.cols + ix);
    }
  }
}

/**
 * Visit the cells a thin-safe rasterisation of `box` covers: cells whose
 * centre lies inside the box (edges inclusive), each axis grown to at least
 * one cell (a 0.2 m door leaf still covers a row of 0.25 m cells).
 */
export function forEachCellCovered(g: GridFrame, box: Area, fn: (i: number) => void, clip?: Area): void {
  const gx = Math.max(0, (g.cell - (box.maxX - box.minX)) / 2) + 1e-9;
  const gz = Math.max(0, (g.cell - (box.maxZ - box.minZ)) / 2) + 1e-9;
  const minX = box.minX - gx, maxX = box.maxX + gx, minZ = box.minZ - gz, maxZ = box.maxZ + gz;
  const x0 = Math.max(0, Math.ceil((Math.max(minX, clip?.minX ?? -Infinity) - g.minX) / g.cell - 0.5));
  const x1 = Math.min(g.cols - 1, Math.floor((Math.min(maxX, clip?.maxX ?? Infinity) - g.minX) / g.cell - 0.5));
  const z0 = Math.max(0, Math.ceil((Math.max(minZ, clip?.minZ ?? -Infinity) - g.minZ) / g.cell - 0.5));
  const z1 = Math.min(g.rows - 1, Math.floor((Math.min(maxZ, clip?.maxZ ?? Infinity) - g.minZ) / g.cell - 0.5));
  for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) fn(iz * g.cols + ix);
}

/** Do two areas overlap (open intervals)? */
export function areasOverlap(a: Area, b: Area): boolean {
  return a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;
}

/** Distance from a point to an area (0 inside). */
export function distanceToArea(x: number, z: number, a: Area): number {
  const dx = Math.max(a.minX - x, 0, x - a.maxX);
  const dz = Math.max(a.minZ - z, 0, z - a.maxZ);
  return Math.hypot(dx, dz);
}

/** Ground footprint of an entity (centre ± rotated half-extents), or a 0.2 m square around its position. */
export function footprintArea(e: { position: { x: number; z: number }; footprint?: { w: number; d: number } }): Area {
  const hw = (e.footprint?.w ?? 0.2) / 2, hd = (e.footprint?.d ?? 0.2) / 2;
  return { minX: e.position.x - hw, maxX: e.position.x + hw, minZ: e.position.z - hd, maxZ: e.position.z + hd };
}

/**
 * Bucketed spatial index over items with an XZ box (cell `size` m), for
 * local re-stamping of an area.
 */
export class AreaIndex<T extends Area> {
  private readonly buckets = new Map<number, T[]>();
  constructor(
    items: Iterable<T>,
    private readonly size = 4,
  ) {
    for (const item of items) this.add(item);
  }
  private key(ix: number, iz: number): number {
    return (ix + 32768) * 65536 + (iz + 32768);
  }
  add(item: T): void {
    const x0 = Math.floor(item.minX / this.size), x1 = Math.floor(item.maxX / this.size);
    const z0 = Math.floor(item.minZ / this.size), z1 = Math.floor(item.maxZ / this.size);
    for (let ix = x0; ix <= x1; ix++)
      for (let iz = z0; iz <= z1; iz++) {
        const k = this.key(ix, iz);
        let list = this.buckets.get(k);
        if (!list) this.buckets.set(k, (list = []));
        list.push(item);
      }
  }
  /** Items whose box (grown by `grow`) overlaps the area, each once, in insertion order per bucket. */
  query(area: Area, grow = 0): T[] {
    const seen = new Set<T>();
    const out: T[] = [];
    const x0 = Math.floor((area.minX - grow) / this.size), x1 = Math.floor((area.maxX + grow) / this.size);
    const z0 = Math.floor((area.minZ - grow) / this.size), z1 = Math.floor((area.maxZ + grow) / this.size);
    for (let ix = x0; ix <= x1; ix++)
      for (let iz = z0; iz <= z1; iz++) {
        for (const item of this.buckets.get(this.key(ix, iz)) ?? []) {
          if (seen.has(item)) continue;
          seen.add(item);
          if (item.minX - grow <= area.maxX && item.maxX + grow >= area.minX && item.minZ - grow <= area.maxZ && item.maxZ + grow >= area.minZ) out.push(item);
        }
      }
    return out;
  }
}
