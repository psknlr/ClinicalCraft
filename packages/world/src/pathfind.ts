/**
 * Grid A* over the collider map (pure, unit-tested) for autopilot
 * `walkTo` (moved from packages/web/src/world/pathfind.ts; the per-level
 * navigation backend in ./nav builds on the same primitives). 0.5-unit cells; a cell is blocked when the player disc
 * (radius + margin) at its centre overlaps an enabled collider that
 * intersects the player's body height. Doors are passable (they are opened
 * automatically while walking). Paths are string-pulled into straight
 * segments with a line-of-sight test.
 */
import { PHYSICS, type Bounds, type PhysicsCollider } from "./physics.js";

export interface NavGrid {
  minX: number;
  minZ: number;
  cell: number;
  cols: number;
  rows: number;
  /** 1 = blocked. */
  blocked: Uint8Array;
}

export interface NavOptions {
  cell?: number;
  radius?: number;
  /** Treat door colliders as passable (default true). */
  doorsPassable?: boolean;
  /** Ignore colliders entirely above this height (jumpable/overhead). */
  bodyHeight?: number;
}

export function buildNavGrid(bounds: Bounds, colliders: Iterable<PhysicsCollider>, opts: NavOptions = {}): NavGrid {
  const cell = opts.cell ?? 0.5;
  const radius = (opts.radius ?? PHYSICS.radius) + 0.02;
  const bodyH = opts.bodyHeight ?? PHYSICS.height;
  const doorsPassable = opts.doorsPassable ?? true;
  const cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cell));
  const rows = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / cell));
  const blocked = new Uint8Array(cols * rows);
  for (const c of colliders) {
    if (c.door && doorsPassable) continue;
    if (c.enabled === false && !c.door) continue;
    // Only boxes the player cannot walk over or under: overlapping body height
    // and higher than a small step (rugs/slabs are not colliders anyway).
    if (c.maxY <= 0.05 || c.minY >= bodyH) continue;
    const x0 = Math.max(0, Math.floor((c.minX - radius - bounds.minX) / cell));
    const x1 = Math.min(cols - 1, Math.floor((c.maxX + radius - bounds.minX) / cell));
    const z0 = Math.max(0, Math.floor((c.minZ - radius - bounds.minZ) / cell));
    const z1 = Math.min(rows - 1, Math.floor((c.maxZ + radius - bounds.minZ) / cell));
    for (let iz = z0; iz <= z1; iz++) {
      const cz = bounds.minZ + (iz + 0.5) * cell;
      if (cz <= c.minZ - radius || cz >= c.maxZ + radius) continue;
      for (let ix = x0; ix <= x1; ix++) {
        const cx = bounds.minX + (ix + 0.5) * cell;
        if (cx <= c.minX - radius || cx >= c.maxX + radius) continue;
        blocked[iz * cols + ix] = 1;
      }
    }
  }
  return { minX: bounds.minX, minZ: bounds.minZ, cell, cols, rows, blocked };
}

export function cellOf(g: NavGrid, x: number, z: number): [number, number] {
  return [
    Math.max(0, Math.min(g.cols - 1, Math.floor((x - g.minX) / g.cell))),
    Math.max(0, Math.min(g.rows - 1, Math.floor((z - g.minZ) / g.cell))),
  ];
}

export function cellCentre(g: NavGrid, ix: number, iz: number): { x: number; z: number } {
  return { x: g.minX + (ix + 0.5) * g.cell, z: g.minZ + (iz + 0.5) * g.cell };
}

export function isFree(g: NavGrid, ix: number, iz: number): boolean {
  return ix >= 0 && iz >= 0 && ix < g.cols && iz < g.rows && g.blocked[iz * g.cols + ix] === 0;
}

/** Nearest free cell to (ix, iz) by BFS ring search within `maxRing` cells. */
export function nearestFree(g: NavGrid, ix: number, iz: number, maxRing = 12): [number, number] | null {
  if (isFree(g, ix, iz)) return [ix, iz];
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (let r = 1; r <= maxRing; r++) {
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        if (!isFree(g, ix + dx, iz + dz)) continue;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = [ix + dx, iz + dz];
        }
      }
    if (best) return best;
  }
  return null;
}

/** Binary min-heap keyed by f-score. */
class Heap {
  private items: number[] = [];
  private keys: number[] = [];
  get size(): number {
    return this.items.length;
  }
  push(item: number, key: number): void {
    this.items.push(item);
    this.keys.push(key);
    let i = this.items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      [this.items[p], this.items[i]] = [this.items[i], this.items[p]];
      [this.keys[p], this.keys[i]] = [this.keys[i], this.keys[p]];
      i = p;
    }
  }
  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastKey = this.keys.pop()!;
    if (this.items.length) {
      this.items[0] = lastItem;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < this.items.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.items.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        [this.items[m], this.items[i]] = [this.items[i], this.items[m]];
        [this.keys[m], this.keys[i]] = [this.keys[i], this.keys[m]];
        i = m;
      }
    }
    return top;
  }
}

const DIRS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/**
 * A* from `start` to `goal` (world coordinates). Blocked start/goal snap to
 * the nearest free cell. Diagonals never cut corners. Returns world-space
 * cell centres (start excluded, goal cell included) or null if unreachable.
 *
 * When that snapped goal cell cannot be reached (the nearest free cell of a
 * wall-mounted outlet or a bedside pump is often a sealed pocket between the
 * furniture and the wall), the path ends at the reachable cell closest to the
 * goal instead, if it lies within `fallbackRadius` metres (close enough to
 * aim at the target and press E).
 */
export function findPathCells(g: NavGrid, start: { x: number; z: number }, goal: { x: number; z: number }, maxExpanded = 200000, fallbackRadius = 3): { x: number; z: number }[] | null {
  const s0 = cellOf(g, start.x, start.z);
  const g0 = cellOf(g, goal.x, goal.z);
  const s = nearestFree(g, s0[0], s0[1], 4);
  const t = nearestFree(g, g0[0], g0[1], 12);
  if (!s || !t) return null;
  const N = g.cols * g.rows;
  const startI = s[1] * g.cols + s[0];
  const goalI = t[1] * g.cols + t[0];
  if (startI === goalI) return [cellCentre(g, t[0], t[1])];
  const gScore = new Float64Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const h = (i: number) => {
    const dx = Math.abs((i % g.cols) - t[0]);
    const dz = Math.abs(Math.floor(i / g.cols) - t[1]);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  const open = new Heap();
  gScore[startI] = 0;
  open.push(startI, h(startI));
  let expanded = 0;
  while (open.size) {
    const cur = open.pop();
    if (closed[cur]) continue;
    if (cur === goalI) break;
    closed[cur] = 1;
    if (++expanded > maxExpanded) return null;
    const cx = cur % g.cols, cz = Math.floor(cur / g.cols);
    for (const [dx, dz, cost] of DIRS) {
      const nx = cx + dx, nz = cz + dz;
      if (!isFree(g, nx, nz)) continue;
      if (dx && dz && (!isFree(g, cx + dx, cz) || !isFree(g, cx, cz + dz))) continue;
      const ni = nz * g.cols + nx;
      if (closed[ni]) continue;
      const ng = gScore[cur] + cost;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        came[ni] = cur;
        open.push(ni, ng + h(ni));
      }
    }
  }
  let endI = goalI;
  if (came[goalI] === -1) {
    // The search exhausted the start's component: settle for its cell nearest to the goal.
    let best = -1;
    let bestD = fallbackRadius;
    for (let i = 0; i < N; i++) {
      if (!closed[i] && came[i] === -1 && i !== startI) continue;
      const c = cellCentre(g, i % g.cols, Math.floor(i / g.cols));
      const d = Math.hypot(c.x - goal.x, c.z - goal.z);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) return null;
    if (best === startI) return [cellCentre(g, s[0], s[1])];
    endI = best;
  }
  const cells: number[] = [];
  for (let i = endI; i !== startI && i !== -1; i = came[i]) cells.push(i);
  cells.reverse();
  return cells.map((i) => cellCentre(g, i % g.cols, Math.floor(i / g.cols)));
}

/**
 * Line of sight between two world points across free cells (samples every
 * cell/3). `halfWidth` > 0 also tests two parallel lines that far to either
 * side ("fat" corridor): a point inside a free cell can sit half a cell
 * closer to an obstacle than the cell centre, so a thin line alone lets
 * string-pulled segments clip wall corners.
 */
export function lineOfSight(g: NavGrid, a: { x: number; z: number }, b: { x: number; z: number }, halfWidth = 0): boolean {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(len / (g.cell / 3)));
  const nx = len > 1e-9 ? -(b.z - a.z) / len : 0;
  const nz = len > 1e-9 ? (b.x - a.x) / len : 0;
  const offsets = halfWidth > 0 ? [0, -halfWidth, halfWidth] : [0];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
    for (const o of offsets) {
      const [ix, iz] = cellOf(g, px + nx * o, pz + nz * o);
      if (!isFree(g, ix, iz)) return false;
    }
  }
  return true;
}

/**
 * String-pull a cell path into straight segments (greedy farthest-visible,
 * fat line of sight of ±0.4 cell so shortcuts keep ≈ the player radius of
 * clearance at wall corners when the grid is inflated by radius + 0.1).
 */
export function smoothPath(g: NavGrid, start: { x: number; z: number }, cells: { x: number; z: number }[], halfWidth = g.cell * 0.4): { x: number; z: number }[] {
  if (cells.length <= 1) return cells.slice();
  const out: { x: number; z: number }[] = [];
  let from = start;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !lineOfSight(g, from, cells[j], halfWidth)) j--;
    out.push(cells[j]);
    from = cells[j];
    i = j + 1;
  }
  return out;
}

/** Full pipeline: A* + smoothing. The last waypoint is the exact goal when its cell is free. */
export function findPath(g: NavGrid, start: { x: number; z: number }, goal: { x: number; z: number }): { x: number; z: number }[] | null {
  const cells = findPathCells(g, start, goal);
  if (!cells) return null;
  const [gx, gz] = cellOf(g, goal.x, goal.z);
  const last = cells[cells.length - 1];
  // Only when the path actually ends in the goal's own (free) cell — not after a fallback.
  if (last && isFree(g, gx, gz)) {
    const [lx, lz] = cellOf(g, last.x, last.z);
    if (lx === gx && lz === gz) cells[cells.length - 1] = { x: goal.x, z: goal.z };
  }
  return smoothPath(g, start, cells);
}
