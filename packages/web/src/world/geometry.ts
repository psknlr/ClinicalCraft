/**
 * Pure facility geometry: rotations, rotated footprints, wall lines and
 * opening segmentation. No three.js, no DOM — unit-tested.
 *
 * Conventions (docs/FACILITIES.md): 1 unit = 1 m, +Y up, rects are centred
 * ({x, z} = centre, w along X, d along Z), north = −Z, `rot` in degrees
 * about +Y with three.js semantics (local +Z → (sin rot, cos rot)).
 */

export type Side = "n" | "s" | "e" | "w";

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Box3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export const DEG = Math.PI / 180;

/** Normalise degrees to [0, 360). */
export function normDeg(rot: number): number {
  return ((rot % 360) + 360) % 360;
}

/** Rotate a local XZ offset by `rotDeg` about +Y (three.js `rotation.y`). */
export function rotateXZ(x: number, z: number, rotDeg: number): [number, number] {
  const r = normDeg(rotDeg);
  // exact for right angles (avoid 6e-17 noise in colliders)
  if (r === 0) return [x, z];
  if (r === 90) return [z, -x];
  if (r === 180) return [-x, -z];
  if (r === 270) return [-z, x];
  const a = rotDeg * DEG;
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
}

/** Footprint after rotation (w/d swap at 90°/270°; AABB of the rotated rect otherwise). */
export function rotatedFootprint(w: number, d: number, rotDeg: number): { w: number; d: number } {
  const r = normDeg(rotDeg);
  if (r === 0 || r === 180) return { w, d };
  if (r === 90 || r === 270) return { w: d, d: w };
  const a = rotDeg * DEG;
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return { w: w * c + d * s, d: w * s + d * c };
}

/** World AABB of a placement's footprint (origin = footprint centre on the floor). */
export function placementBox(p: { x: number; z: number; y?: number; rot?: number }, fp: { w: number; d: number; h: number }): Box3D {
  const { w, d } = rotatedFootprint(fp.w, fp.d, p.rot ?? 0);
  const y = p.y ?? 0;
  return { minX: p.x - w / 2, maxX: p.x + w / 2, minY: y, maxY: y + fp.h, minZ: p.z - d / 2, maxZ: p.z + d / 2 };
}

/** World AABB of one voxel part (centre p, size s, extra part rotation r) of a placement. */
export function partBox(
  place: { x: number; z: number; y?: number; rot?: number },
  part: { p: [number, number, number]; s: [number, number, number]; r?: number },
): Box3D {
  const [lx, ly, lz] = part.p;
  const [wx, wz] = rotateXZ(lx, lz, place.rot ?? 0);
  const { w, d } = rotatedFootprint(part.s[0], part.s[2], (place.rot ?? 0) + (part.r ?? 0));
  const cx = place.x + wx, cz = place.z + wz, cy = (place.y ?? 0) + ly;
  return { minX: cx - w / 2, maxX: cx + w / 2, minY: cy - part.s[1] / 2, maxY: cy + part.s[1] / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
}

export function unionBox(boxes: Box3D[]): Box3D | null {
  if (!boxes.length) return null;
  const out = { ...boxes[0] };
  for (const b of boxes) {
    out.minX = Math.min(out.minX, b.minX);
    out.maxX = Math.max(out.maxX, b.maxX);
    out.minY = Math.min(out.minY, b.minY);
    out.maxY = Math.max(out.maxY, b.maxY);
    out.minZ = Math.min(out.minZ, b.minZ);
    out.maxZ = Math.max(out.maxZ, b.maxZ);
  }
  return out;
}

export function rectContains(r: Rect, x: number, z: number, margin = 0): boolean {
  return Math.abs(x - r.x) <= r.w / 2 + margin && Math.abs(z - r.z) <= r.d / 2 + margin;
}

export function rectBounds(r: Rect): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return { minX: r.x - r.w / 2, maxX: r.x + r.w / 2, minZ: r.z - r.d / 2, maxZ: r.z + r.d / 2 };
}

/**
 * A straight wall. `axis` = direction the wall runs ("x" for north/south
 * walls, "z" for east/west walls); `line` = the fixed coordinate of its
 * centre line; `from`..`to` its extent along the axis; `outward` = unit
 * normal sign pointing out of the rect (+1 or −1 on the other axis).
 */
export interface WallLine {
  side: Side;
  axis: "x" | "z";
  line: number;
  from: number;
  to: number;
  /** Centre of the wall along its axis (openings' `offset` is relative to this). */
  centre: number;
  outward: 1 | -1;
}

/**
 * Wall centre lines of a rect. `cornerMode = "building"`: north/south walls
 * run past the corners by t/2 and east/west walls stop t/2 short (V4: front
 * wall blocks x −13…13, side walls z −13…7 for rect x ±13, z −14…8).
 * `"exact"`: every wall spans exactly its side (room partitions).
 */
export function wallLine(rect: Rect, side: Side, thickness: number, cornerMode: "building" | "exact" = "building"): WallLine {
  const b = rectBounds(rect);
  const ext = cornerMode === "building" ? thickness / 2 : 0;
  switch (side) {
    case "n":
      return { side, axis: "x", line: b.minZ, from: b.minX - ext, to: b.maxX + ext, centre: rect.x, outward: -1 };
    case "s":
      return { side, axis: "x", line: b.maxZ, from: b.minX - ext, to: b.maxX + ext, centre: rect.x, outward: 1 };
    case "w":
      return { side, axis: "z", line: b.minX, from: b.minZ + ext, to: b.maxZ - ext, centre: rect.z, outward: -1 };
    case "e":
    default:
      return { side, axis: "z", line: b.maxX, from: b.minZ + ext, to: b.maxZ - ext, centre: rect.z, outward: 1 };
  }
}

/** World point at distance `u` along a wall line (u is an absolute axis coordinate). */
export function wallPoint(w: WallLine, u: number): { x: number; z: number } {
  return w.axis === "x" ? { x: u, z: w.line } : { x: w.line, z: u };
}

export type OpeningKind = "opening" | "door" | "double-door" | "sliding-door" | "window";

export interface OpeningSpec {
  offset: number;
  width: number;
  height: number;
  kind: OpeningKind;
  sill: number;
}

export interface ResolvedOpening extends OpeningSpec {
  /** Absolute extent along the wall axis (clamped to the wall). */
  a: number;
  b: number;
  /** Vertical extent of the hole. */
  y0: number;
  y1: number;
}

/** One solid wall piece (≈ 1 unit along the wall and ≤ 1 unit high, V4 block granularity). */
export interface WallPiece {
  a: number;
  b: number;
  y0: number;
  y1: number;
  /** Course: base (row touching the floor), top (row touching the wall top) or body. */
  course: "base" | "body" | "top";
}

const EPS = 1e-6;

/** Resolve openings to absolute wall coordinates and vertical hole ranges. */
export function resolveOpenings(wall: WallLine, height: number, openings: Partial<OpeningSpec>[]): ResolvedOpening[] {
  const out: ResolvedOpening[] = [];
  for (const o of openings) {
    const kind = (o.kind ?? "opening") as OpeningKind;
    const width = o.width ?? 2;
    const offset = o.offset ?? 0;
    const h = o.height ?? 3;
    const sill = o.sill ?? 1;
    const a = Math.max(wall.from, wall.centre + offset - width / 2);
    const b = Math.min(wall.to, wall.centre + offset + width / 2);
    if (b - a <= EPS) continue;
    const y0 = kind === "window" ? Math.min(height, sill) : 0;
    const y1 = Math.min(height, kind === "window" ? sill + h : h);
    if (y1 - y0 <= EPS) continue;
    out.push({ kind, width, offset, height: h, sill, a, b, y0, y1 });
  }
  return out.sort((p, q) => p.a - q.a);
}

/** Split [from, to] at breakpoints, then each part into round(len / maxLen) equal pieces (V4 block granularity). */
export function splitInterval(from: number, to: number, breaks: number[], maxLen = 1): [number, number][] {
  const pts = [from, ...breaks.filter((b) => b > from + EPS && b < to - EPS), to].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = b - a;
    if (len <= EPS) continue;
    const n = Math.max(1, Math.round(len / maxLen - 1e-9));
    const step = len / n;
    for (let k = 0; k < n; k++) out.push([a + k * step, k === n - 1 ? b : a + (k + 1) * step]);
  }
  return out;
}

/**
 * Segment a wall into solid pieces with holes for openings. Pieces follow
 * V4 block granularity: 1-unit courses (rows) and ≤ 1-unit columns, with
 * extra breakpoints at opening edges, sills and lintels.
 */
export function segmentWall(wall: WallLine, height: number, openings: ResolvedOpening[]): WallPiece[] {
  const colBreaks: number[] = [];
  const rowBreaks: number[] = [];
  for (const o of openings) {
    colBreaks.push(o.a, o.b);
    rowBreaks.push(o.y0, o.y1);
  }
  for (let y = 1; y < height; y++) rowBreaks.push(y);
  const cols = splitInterval(wall.from, wall.to, colBreaks, 1);
  const rows = splitInterval(0, height, rowBreaks, 1);
  const pieces: WallPiece[] = [];
  for (const [y0, y1] of rows) {
    const yc = (y0 + y1) / 2;
    const course: WallPiece["course"] = y0 < EPS ? "base" : y1 > height - EPS && height > 1 ? "top" : yc < 1 ? "base" : "body";
    // merge consecutive columns? No — keep block granularity for texture scale.
    for (const [a, b] of cols) {
      const c = (a + b) / 2;
      const hole = openings.some((o) => c > o.a - EPS && c < o.b + EPS && yc > o.y0 && yc < o.y1);
      if (!hole) pieces.push({ a, b, y0, y1, course });
    }
  }
  return pieces;
}

/** Point-in-wall test along the axis: is `u` within an opening of the given kinds? */
export function inOpening(openings: ResolvedOpening[], u: number, kinds?: OpeningKind[]): ResolvedOpening | null {
  for (const o of openings) if (u >= o.a && u <= o.b && (!kinds || kinds.includes(o.kind))) return o;
  return null;
}

/** Visual width units of a label: CJK glyphs count 1, others .55 (sign sizing). */
export function textUnits(text: string): number {
  let u = 0;
  for (const ch of text) {
    if (ch === " ") u += 0.3;
    else u += /[⺀-鿿가-힯＀-￯]/.test(ch) ? 1 : 0.55;
  }
  return u;
}

/** Sign width heuristic (V4: "接 诊" 2.4, "检验工作台" 3.8). */
export function signWidth(text: string, min = 2.4, max = 4.2): number {
  return Math.max(min, Math.min(max, 0.55 * textUnits(text) + 0.8));
}

/** A merged rectangle of grid cells [ix0..ix1] × [iz0..iz1] (inclusive) sharing one value. */
export interface GridRect<T> {
  ix0: number;
  ix1: number;
  iz0: number;
  iz1: number;
  value: T;
}

/**
 * Greedy rectangle merge of a cols×rows grid (row runs, then identical runs
 * stacked across consecutive rows). `get` returns null for empty cells.
 * Used to turn per-block V4 voxels (ground, roofs) into few tiled boxes.
 */
export function greedyRects<T extends string>(cols: number, rows: number, get: (ix: number, iz: number) => T | null): GridRect<T>[] {
  const out: GridRect<T>[] = [];
  let open = new Map<string, GridRect<T>>();
  for (let iz = 0; iz < rows; iz++) {
    const next = new Map<string, GridRect<T>>();
    let ix = 0;
    while (ix < cols) {
      const v = get(ix, iz);
      if (v == null) {
        ix++;
        continue;
      }
      let ix1 = ix;
      while (ix1 + 1 < cols && get(ix1 + 1, iz) === v) ix1++;
      const key = `${ix}|${ix1}|${v}`;
      const prev = open.get(key);
      if (prev) {
        prev.iz1 = iz;
        open.delete(key);
        next.set(key, prev);
      } else {
        const r: GridRect<T> = { ix0: ix, ix1, iz0: iz, iz1: iz, value: v };
        out.push(r);
        next.set(key, r);
      }
      ix = ix1 + 1;
    }
    open = next;
  }
  return out;
}

/** Merge wall pieces: contiguous pieces of one row and course join, then equal spans stack across rows. */
export function mergeWallPieces(pieces: WallPiece[], courseOf: (p: WallPiece) => string = (p) => p.course): (WallPiece & { key: string })[] {
  const rows: (WallPiece & { key: string })[] = [];
  const sorted = [...pieces].sort((p, q) => p.y0 - q.y0 || p.a - q.a);
  for (const p of sorted) {
    const key = courseOf(p);
    const last = rows[rows.length - 1];
    if (last && last.key === key && Math.abs(last.y0 - p.y0) < 1e-6 && Math.abs(last.y1 - p.y1) < 1e-6 && Math.abs(last.b - p.a) < 1e-6) last.b = p.b;
    else rows.push({ ...p, key });
  }
  // vertical stacking of identical spans
  const out: (WallPiece & { key: string })[] = [];
  for (const r of rows) {
    const below = out.find((o) => o.key === r.key && Math.abs(o.a - r.a) < 1e-6 && Math.abs(o.b - r.b) < 1e-6 && Math.abs(o.y1 - r.y0) < 1e-6);
    if (below) below.y1 = r.y1;
    else out.push({ ...r });
  }
  return out;
}
