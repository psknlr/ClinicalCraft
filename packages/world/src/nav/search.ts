/**
 * Grid search on a blocked mask (1 = blocked): A* towards a goal predicate
 * (lazy goals: the first goal cell popped is the cheapest) and Dijkstra
 * floods. 8-connected, diagonals never cut corners (the web A*'s rule);
 * costs in cells (1 or √2).
 */
import type { GridFrame } from "../raster.js";

/** Binary min-heap of cell indices keyed by a float. */
export class MinHeap {
  private items: number[] = [];
  private keys: number[] = [];
  get size(): number {
    return this.items.length;
  }
  push(item: number, key: number): void {
    const items = this.items, keys = this.keys;
    items.push(item);
    keys.push(key);
    let i = items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= keys[i]) break;
      [items[p], items[i]] = [items[i], items[p]];
      [keys[p], keys[i]] = [keys[i], keys[p]];
      i = p;
    }
  }
  pop(): number {
    const items = this.items, keys = this.keys;
    const top = items[0];
    const lastItem = items.pop()!;
    const lastKey = keys.pop()!;
    if (items.length) {
      items[0] = lastItem;
      keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < items.length && keys[l] < keys[m]) m = l;
        if (r < items.length && keys[r] < keys[m]) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        [keys[m], keys[i]] = [keys[i], keys[m]];
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

export type SearchResult =
  | { found: true; goal: number; cost: number; cells: number[]; expanded: number }
  | { found: false; exhausted: boolean; expanded: number };

/**
 * A* from `start` to the first cell satisfying `isGoal` (tested when a cell
 * is popped, so lazy/expensive goal tests run on few cells). `h` must be
 * admissible and consistent (in cells). `cells` runs from the start to the
 * goal (inclusive). `exhausted` false = the expansion budget ran out.
 */
export function astar(g: GridFrame, blocked: Uint8Array, start: number, isGoal: (i: number) => boolean, h: (i: number) => number, maxExpanded = 200000): SearchResult {
  const n = g.cols * g.rows;
  const gScore = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open = new MinHeap();
  gScore[start] = 0;
  open.push(start, h(start));
  let expanded = 0;
  while (open.size) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (isGoal(cur)) {
      const cells: number[] = [];
      for (let i = cur; i !== -1; i = came[i]) cells.push(i);
      cells.reverse();
      return { found: true, goal: cur, cost: gScore[cur], cells, expanded };
    }
    if (++expanded > maxExpanded) return { found: false, exhausted: false, expanded };
    const cx = cur % g.cols, cz = (cur - cx) / g.cols;
    for (const [dx, dz, cost] of DIRS) {
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= g.cols || nz >= g.rows) continue;
      const ni = nz * g.cols + nx;
      if (blocked[ni] || closed[ni]) continue;
      if (dx && dz && (blocked[cz * g.cols + nx] || blocked[nz * g.cols + cx])) continue;
      const ng = gScore[cur] + cost;
      if (ng < gScore[ni]) {
        gScore[ni] = ng;
        came[ni] = cur;
        open.push(ni, ng + h(ni));
      }
    }
  }
  return { found: false, exhausted: true, expanded };
}

/** Dijkstra flood from `start`: cost (cells) to every reachable cell, Infinity elsewhere. */
export function flood(g: GridFrame, blocked: Uint8Array, start: number, maxExpanded = Infinity): Float64Array {
  const n = g.cols * g.rows;
  const dist = new Float64Array(n).fill(Infinity);
  const closed = new Uint8Array(n);
  const open = new MinHeap();
  dist[start] = 0;
  open.push(start, 0);
  let expanded = 0;
  while (open.size) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (++expanded > maxExpanded) break;
    const cx = cur % g.cols, cz = (cur - cx) / g.cols;
    for (const [dx, dz, cost] of DIRS) {
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= g.cols || nz >= g.rows) continue;
      const ni = nz * g.cols + nx;
      if (blocked[ni] || closed[ni]) continue;
      if (dx && dz && (blocked[cz * g.cols + nx] || blocked[nz * g.cols + cx])) continue;
      const nd = dist[cur] + cost;
      if (nd < dist[ni]) {
        dist[ni] = nd;
        open.push(ni, nd);
      }
    }
  }
  return dist;
}

/** Nearest free cell to `i` by ring search (Euclidean in cells), within `maxRing` rings; null if none. */
export function nearestFreeCell(g: GridFrame, blocked: Uint8Array, i: number, maxRing = 4): number | null {
  if (!blocked[i]) return i;
  const ix = i % g.cols, iz = (i - ix) / g.cols;
  for (let r = 1; r <= maxRing; r++) {
    let best = -1, bestD = Infinity;
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = ix + dx, z = iz + dz;
        if (x < 0 || z < 0 || x >= g.cols || z >= g.rows) continue;
        const j = z * g.cols + x;
        if (blocked[j]) continue;
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
    if (best >= 0) return best;
  }
  return null;
}
