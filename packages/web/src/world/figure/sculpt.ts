/**
 * A small sculpting kit for the people of the world and what they hold: smooth surfaces built in code —
 * closed rings swept along a path (limbs, trunks, tubes), grids of points (a head, a sheet of cloth with a
 * thickness), balls, lathes and boxes — gathered into ONE indexed geometry with a colour and a gloss per vertex
 * (`figureMaterial`). Each part gets smooth normals of its own, so two parts meet in a crease (a sleeve on an
 * arm) and one part never does. Everything is added in the frame set by `within` (a limb's bone, a mirrored
 * side); `tagged` remembers the vertices a block added (skin, for the flush of distress).
 */
import { BufferAttribute, BufferGeometry, Color, Matrix4, Vector3 } from "three";

/** A point or a direction. */
export type V3 = readonly [number, number, number];
/** A colour in the renderer's working space (linear), as vertex colours are. */
export type Rgb = readonly [number, number, number];

/** What a surface looks like: its colour and how polished it is (0 = matt cloth and skin … 1 = polished steel). */
export interface Paint {
  rgb: Rgb;
  gloss?: number;
  /** How much of its own colour the surface gives back unlit (0 … about 0.2): the soft light living skin has in shade. */
  glow?: number;
}
/** One paint, or a paint per vertex from its place in the part's own frame. */
export type Painter = Paint | ((x: number, y: number, z: number) => Paint);

/** The linear colour of a CSS hex colour. */
export function rgb(hex: string): Rgb {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
}

/** `a` towards `b` by `t` (0 … 1). */
export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** `a` darker (k < 1) or lighter (k > 1). */
export function shade(a: Rgb, k: number): Rgb {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/** A paint of a hex colour. */
export function paint(hex: string, gloss = 0): Paint {
  return { rgb: rgb(hex), gloss };
}

/** One cross-section of a sweep: where it is and how wide (side) and deep (front, back) it is. */
export interface Station {
  p: V3;
  /** Half-width along the section's side axis. */
  rx: number;
  /** Half-depth towards the front. */
  rz: number;
  /** Half-depth towards the back (default: `rz`). */
  back?: number;
  /** Superellipse exponent: 2 an ellipse, larger a rounder-cornered box (default 2). */
  power?: number;
}

/** How a sweep is closed at an end: a dome, a flat face with a hard edge, or left open. */
export type Cap = "round" | "flat" | "open";

export interface SweepOptions {
  /** Points round each section (default 12). */
  seg?: number;
  /** The direction the sections' front faces at the first station (default +Z); carried along the path. */
  front?: V3;
  start?: Cap;
  end?: Cap;
  /** Length of a round cap as a fraction of the end section's smaller radius (default 1). */
  dome?: number;
  /** Paint of flat caps (default: the sweep's). */
  capPaint?: Painter;
}

const TAU = Math.PI * 2;
const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpC = new Vector3();

function sub(a: V3, b: V3): Vector3 {
  return new Vector3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * A smooth path through `points` (centripetal Catmull-Rom, `steps` pieces between neighbours): no overshoot
 * where the points are unevenly spaced.
 */
export function smoothPath(points: readonly V3[], steps = 4): V3[] {
  if (points.length < 3) return [...points];
  const P = points.map((p) => new Vector3(p[0], p[1], p[2]));
  const first = P[0]!.clone().multiplyScalar(2).sub(P[1]!);
  const last = P[P.length - 1]!.clone().multiplyScalar(2).sub(P[P.length - 2]!);
  const Q = [first, ...P, last];
  const out: V3[] = [];
  const knot = (t: number, a: Vector3, b: Vector3) => t + Math.max(1e-6, Math.sqrt(a.distanceTo(b)));
  for (let i = 1; i + 2 < Q.length; i++) {
    const p0 = Q[i - 1]!, p1 = Q[i]!, p2 = Q[i + 1]!, p3 = Q[i + 2]!;
    const t0 = 0, t1 = knot(t0, p0, p1), t2 = knot(t1, p1, p2), t3 = knot(t2, p2, p3);
    for (let s = 0; s < steps; s++) {
      const t = t1 + ((t2 - t1) * s) / steps;
      const a1 = p0.clone().multiplyScalar((t1 - t) / (t1 - t0)).addScaledVector(p1, (t - t0) / (t1 - t0));
      const a2 = p1.clone().multiplyScalar((t2 - t) / (t2 - t1)).addScaledVector(p2, (t - t1) / (t2 - t1));
      const a3 = p2.clone().multiplyScalar((t3 - t) / (t3 - t2)).addScaledVector(p3, (t - t2) / (t3 - t2));
      const b1 = a1.multiplyScalar((t2 - t) / (t2 - t0)).addScaledVector(a2, (t - t0) / (t2 - t0));
      const b2 = a2.multiplyScalar((t3 - t) / (t3 - t1)).addScaledVector(a3, (t - t1) / (t3 - t1));
      const c = b1.multiplyScalar((t2 - t) / (t2 - t1)).addScaledVector(b2, (t - t1) / (t2 - t1));
      out.push([c.x, c.y, c.z]);
    }
  }
  const e = P[P.length - 1]!;
  out.push([e.x, e.y, e.z]);
  return out;
}

/** Vertex ranges [start, count] a `tagged` block added, in the geometry `Sculpt.geometry` returns. */
export type Ranges = [number, number][];

/** Gathers parts into one geometry (see the module doc). */
export class Sculpt {
  private readonly pos: number[] = [];
  private readonly col: number[] = [];
  private readonly gls: number[] = [];
  private readonly idx: number[] = [];
  private matrix: Matrix4 | null = null;
  private readonly tags = new Map<string, Ranges>();

  /** Vertices so far. */
  get vertexCount(): number {
    return this.pos.length / 3;
  }

  /** Triangles so far. */
  get triangleCount(): number {
    return this.idx.length / 3;
  }

  /** Add what `fn` adds in the frame `m` (inside the current frame). A mirroring frame keeps faces outward. */
  within(m: Matrix4, fn: () => void): void {
    const before = this.matrix;
    this.matrix = before ? before.clone().multiply(m) : m.clone();
    try {
      fn();
    } finally {
      this.matrix = before;
    }
  }

  /** Remember the vertices `fn` adds under `tag` (`ranges`). */
  tagged(tag: string, fn: () => void): void {
    const start = this.vertexCount;
    fn();
    const count = this.vertexCount - start;
    if (!count) return;
    const list = this.tags.get(tag) ?? [];
    list.push([start, count]);
    this.tags.set(tag, list);
  }

  /** The vertex ranges remembered under `tag`. */
  ranges(tag: string): Ranges {
    return this.tags.get(tag) ?? [];
  }

  /* ---------------- parts: vertices, triangles, then normals ---------------- */

  private vertex(x: number, y: number, z: number, painter: Painter): number {
    const p = typeof painter === "function" ? painter(x, y, z) : painter;
    this.pos.push(x, y, z);
    this.col.push(p.rgb[0], p.rgb[1], p.rgb[2]);
    this.gls.push(p.gloss ?? 0, p.glow ?? 0);
    return this.pos.length / 3 - 1;
  }

  private tri(a: number, b: number, c: number): void {
    this.idx.push(a, b, c);
  }

  /** Close a part begun at vertex `v0` / index `i0`: into the current frame (winding kept outward when it mirrors). */
  private finish(v0: number, i0: number): void {
    const m = this.matrix;
    if (!m) return;
    const pos = this.pos;
    for (let i = v0 * 3; i < pos.length; i += 3) {
      tmpA.set(pos[i]!, pos[i + 1]!, pos[i + 2]!).applyMatrix4(m);
      pos[i] = tmpA.x;
      pos[i + 1] = tmpA.y;
      pos[i + 2] = tmpA.z;
    }
    if (m.determinant() < 0) {
      const idx = this.idx;
      for (let i = i0; i < idx.length; i += 3) {
        const t = idx[i + 1]!;
        idx[i + 1] = idx[i + 2]!;
        idx[i + 2] = t;
      }
    }
  }

  /**
   * Closed rings of `n` points each (flat xyz arrays), joined ring to ring; optionally closed by a point at
   * either end (a dome's tip) or by a flat face with a hard edge. Faces look outward when the rings run from
   * the side axis towards the front axis as the path runs along their cross product (`sweep` does).
   */
  rings(rings: readonly (readonly number[])[], n: number, painter: Painter, opts: { startPole?: V3; endPole?: V3; startFlat?: boolean; endFlat?: boolean; capPaint?: Painter } = {}): void {
    if (rings.length < 1 || n < 3) return;
    const v0 = this.vertexCount, i0 = this.idx.length;
    for (const ring of rings) for (let j = 0; j < n; j++) this.vertex(ring[3 * j]!, ring[3 * j + 1]!, ring[3 * j + 2]!, painter);
    for (let i = 0; i + 1 < rings.length; i++) {
      for (let j = 0; j < n; j++) {
        const k = (j + 1) % n;
        const a = v0 + i * n + j, b = v0 + (i + 1) * n + j, c = v0 + (i + 1) * n + k, d = v0 + i * n + k;
        this.tri(a, b, d);
        this.tri(b, c, d);
      }
    }
    const last = v0 + (rings.length - 1) * n;
    if (opts.startPole) {
      const p = this.vertex(opts.startPole[0], opts.startPole[1], opts.startPole[2], painter);
      for (let j = 0; j < n; j++) this.tri(v0 + j, v0 + ((j + 1) % n), p);
    }
    if (opts.endPole) {
      const p = this.vertex(opts.endPole[0], opts.endPole[1], opts.endPole[2], painter);
      for (let j = 0; j < n; j++) this.tri(last + j, p, last + ((j + 1) % n));
    }
    this.finish(v0, i0);
    const flat = (ring: readonly number[], start: boolean) => {
      const f0 = this.vertexCount, fi = this.idx.length;
      const cp = opts.capPaint ?? painter;
      let cx = 0, cy = 0, cz = 0;
      for (let j = 0; j < n; j++) {
        cx += ring[3 * j]!;
        cy += ring[3 * j + 1]!;
        cz += ring[3 * j + 2]!;
        this.vertex(ring[3 * j]!, ring[3 * j + 1]!, ring[3 * j + 2]!, cp);
      }
      const c = this.vertex(cx / n, cy / n, cz / n, cp);
      for (let j = 0; j < n; j++) {
        if (start) this.tri(f0 + j, f0 + ((j + 1) % n), c);
        else this.tri(f0 + j, c, f0 + ((j + 1) % n));
      }
      this.finish(f0, fi);
    };
    if (opts.startFlat) flat(rings[0]!, true);
    if (opts.endFlat) flat(rings[rings.length - 1]!, false);
  }

  /**
   * Sections swept along a path: a limb, a trunk, a tube. Each station's section is a superellipse about its
   * point, across the path there; the front axis is carried along the path from `front`, so a bend keeps the
   * section the right way round.
   */
  sweep(stations: readonly Station[], painter: Painter, opts: SweepOptions = {}): void {
    const count = stations.length;
    if (count < 2) return;
    const seg = opts.seg ?? 12;
    const start = opts.start ?? "round", end = opts.end ?? "round";
    const tangents: Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const a = stations[Math.max(0, i - 1)]!.p, b = stations[Math.min(count - 1, i + 1)]!.p;
      const t = sub(b, a);
      if (t.lengthSq() < 1e-12) t.set(0, 1, 0);
      tangents.push(t.normalize());
    }
    const front = new Vector3(...(opts.front ?? [0, 0, 1]));
    const frames: { s: Vector3; f: Vector3; t: Vector3 }[] = [];
    for (let i = 0; i < count; i++) {
      const t = tangents[i]!;
      front.addScaledVector(t, -front.dot(t));
      if (front.lengthSq() < 1e-8) {
        // the front lies along the path: any direction across it
        front.set(Math.abs(t.x) < 0.9 ? 1 : 0, 0, Math.abs(t.x) < 0.9 ? 0 : 1);
        front.addScaledVector(t, -front.dot(t));
      }
      front.normalize();
      const f = front.clone();
      const s = new Vector3().crossVectors(t, f).normalize();
      frames.push({ s, f, t });
    }
    const ring = (i: number, k: number, along: number): number[] => {
      const st = stations[i]!, fr = frames[i]!;
      const e = 2 / (st.power ?? 2);
      const out: number[] = [];
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * TAU;
        const c = Math.cos(a), sn = Math.sin(a);
        const x = Math.sign(c) * Math.pow(Math.abs(c), e) * st.rx * k;
        const z = Math.sign(sn) * Math.pow(Math.abs(sn), e) * (sn >= 0 ? st.rz : (st.back ?? st.rz)) * k;
        out.push(st.p[0] + fr.s.x * x + fr.f.x * z + fr.t.x * along, st.p[1] + fr.s.y * x + fr.f.y * z + fr.t.y * along, st.p[2] + fr.s.z * x + fr.f.z * z + fr.t.z * along);
      }
      return out;
    };
    const rings: number[][] = [];
    const dome = opts.dome ?? 1;
    let startPole: V3 | undefined, endPole: V3 | undefined;
    if (start === "round") {
      const st = stations[0]!, t = frames[0]!.t;
      const r = Math.min(st.rx, st.rz, st.back ?? st.rz) * dome;
      startPole = [st.p[0] - t.x * r, st.p[1] - t.y * r, st.p[2] - t.z * r];
      for (const a of [1.2, 0.8, 0.4]) rings.push(ring(0, Math.cos(a), -Math.sin(a) * r));
    }
    for (let i = 0; i < count; i++) rings.push(ring(i, 1, 0));
    if (end === "round") {
      const st = stations[count - 1]!, t = frames[count - 1]!.t;
      const r = Math.min(st.rx, st.rz, st.back ?? st.rz) * dome;
      for (const a of [0.4, 0.8, 1.2]) rings.push(ring(count - 1, Math.cos(a), Math.sin(a) * r));
      endPole = [st.p[0] + t.x * r, st.p[1] + t.y * r, st.p[2] + t.z * r];
    }
    this.rings(rings, seg, painter, { startPole, endPole, startFlat: start === "flat", endFlat: end === "flat", capPaint: opts.capPaint });
  }

  /** A tube of one radius through `points` (smoothed when `steps` > 0). */
  tube(points: readonly V3[], radius: number, painter: Painter, opts: SweepOptions & { steps?: number } = {}): void {
    const path = opts.steps ? smoothPath(points, opts.steps) : points;
    this.sweep(path.map((p) => ({ p, rx: radius, rz: radius })), painter, { seg: 6, ...opts });
  }

  /** An ellipsoid about `c` (its poles along Y). */
  ball(c: V3, rx: number, ry: number, rz: number, painter: Painter, seg = 12, rows = 7): void {
    const rings: number[][] = [];
    for (let i = 1; i < rows; i++) {
      const a = -Math.PI / 2 + (i / rows) * Math.PI;
      const y = Math.sin(a) * ry, k = Math.cos(a);
      const ring: number[] = [];
      for (let j = 0; j < seg; j++) {
        const b = (j / seg) * TAU;
        ring.push(c[0] + Math.cos(b) * rx * k, c[1] + y, c[2] + Math.sin(b) * rz * k);
      }
      rings.push(ring);
    }
    this.rings(rings, seg, painter, { startPole: [c[0], c[1] - ry, c[2]], endPole: [c[0], c[1] + ry, c[2]] });
  }

  /**
   * A surface of revolution about Y through `c`: `profile` is [radius, height] pairs from the bottom up. Each
   * `hard` break (an index into the profile) starts a new part, so the edge there is crisp; a radius of 0 at
   * either end closes it with a point.
   */
  lathe(c: V3, profile: readonly (readonly [number, number])[], painter: Painter, opts: { seg?: number; hard?: readonly number[] } = {}): void {
    const seg = opts.seg ?? 16;
    const cuts = [0, ...(opts.hard ?? []), profile.length - 1];
    for (let k = 0; k + 1 < cuts.length; k++) {
      const piece = profile.slice(cuts[k]!, cuts[k + 1]! + 1);
      if (piece.length < 2) continue;
      const rings: number[][] = [];
      let startPole: V3 | undefined, endPole: V3 | undefined;
      piece.forEach(([r, y], i) => {
        if (r <= 1e-6 && i === 0) startPole = [c[0], c[1] + y, c[2]];
        else if (r <= 1e-6 && i === piece.length - 1) endPole = [c[0], c[1] + y, c[2]];
        else {
          const ring: number[] = [];
          for (let j = 0; j < seg; j++) {
            const b = (j / seg) * TAU;
            ring.push(c[0] + Math.cos(b) * r, c[1] + y, c[2] + Math.sin(b) * r);
          }
          rings.push(ring);
        }
      });
      this.rings(rings, seg, painter, { startPole, endPole });
    }
  }

  /**
   * A surface through an `nu` × `nv` grid of points `f(i, j)`: open, or closed round `i` (`wrap`). With a
   * `thickness` it is a thin solid (a second face that far behind the first, joined round the border): cloth,
   * a card, a lens. Faces look along (f(i+1, j) − f(i, j)) × (f(i, j+1) − f(i, j)); `flip` turns them.
   */
  sheet(nu: number, nv: number, f: (i: number, j: number) => V3, painter: Painter, opts: { thickness?: number; flip?: boolean; wrap?: boolean; backPaint?: Painter } = {}): void {
    if (nu < 2 || nv < 2) return;
    const v0 = this.vertexCount, i0 = this.idx.length;
    const pts: V3[] = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) pts.push(f(i, j));
    const at = (i: number, j: number) => j * nu + (i % nu);
    const flip = !!opts.flip, wrap = !!opts.wrap;
    const cols = wrap ? nu : nu - 1;
    const quad = (a: number, b: number, c: number, d: number, turned: boolean) => {
      if (turned) {
        this.tri(a, d, b);
        this.tri(b, d, c);
      } else {
        this.tri(a, b, d);
        this.tri(b, c, d);
      }
    };
    for (const p of pts) this.vertex(p[0], p[1], p[2], painter);
    for (let j = 0; j + 1 < nv; j++) for (let i = 0; i < cols; i++) quad(v0 + at(i, j), v0 + at(i + 1, j), v0 + at(i + 1, j + 1), v0 + at(i, j + 1), flip);
    const t = opts.thickness ?? 0;
    if (t > 0) {
      // the grid's own normals (in its frame) set the second face back
      const nrm = pts.map(() => new Vector3());
      const face = (a: number, b: number, c: number) => {
        tmpA.set(pts[b]![0] - pts[a]![0], pts[b]![1] - pts[a]![1], pts[b]![2] - pts[a]![2]);
        tmpB.set(pts[c]![0] - pts[a]![0], pts[c]![1] - pts[a]![1], pts[c]![2] - pts[a]![2]);
        tmpC.crossVectors(tmpA, tmpB);
        nrm[a]!.add(tmpC);
        nrm[b]!.add(tmpC);
        nrm[c]!.add(tmpC);
      };
      for (let j = 0; j + 1 < nv; j++) {
        for (let i = 0; i < cols; i++) {
          face(at(i, j), at(i + 1, j), at(i, j + 1));
          face(at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
        }
      }
      const b0 = this.vertexCount;
      const back = opts.backPaint ?? painter;
      const sgn = flip ? 1 : -1;
      pts.forEach((p, k) => {
        const n = nrm[k]!.lengthSq() > 0 ? nrm[k]!.normalize() : nrm[k]!.set(0, 0, 1);
        this.vertex(p[0] + n.x * t * sgn, p[1] + n.y * t * sgn, p[2] + n.z * t * sgn, back);
      });
      for (let j = 0; j + 1 < nv; j++) for (let i = 0; i < cols; i++) quad(b0 + at(i, j), b0 + at(i + 1, j), b0 + at(i + 1, j + 1), b0 + at(i, j + 1), !flip);
      // the border, front to back
      const edge = (a: number, b: number) => quad(v0 + a, b0 + a, b0 + b, v0 + b, flip);
      for (let i = 0; i < cols; i++) {
        edge(at(i, 0), at(i + 1, 0));
        edge(at(i + 1, nv - 1), at(i, nv - 1));
      }
      if (!wrap) {
        for (let j = 0; j + 1 < nv; j++) {
          edge(at(0, j + 1), at(0, j));
          edge(at(nu - 1, j), at(nu - 1, j + 1));
        }
      }
    }
    this.finish(v0, i0);
  }

  /** A box about `c` (hard edges). */
  box(c: V3, sx: number, sy: number, sz: number, painter: Painter): void {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const faces: [V3, V3, V3][] = [
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
      [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
      [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
    ];
    for (const [n, u, v] of faces) {
      const v0 = this.vertexCount, i0 = this.idx.length;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        this.vertex(c[0] + (n[0] + u[0] * a + v[0] * b) * hx, c[1] + (n[1] + u[1] * a + v[1] * b) * hy, c[2] + (n[2] + u[2] * a + v[2] * b) * hz, painter);
      }
      this.tri(v0, v0 + 1, v0 + 2);
      this.tri(v0, v0 + 2, v0 + 3);
      this.finish(v0, i0);
    }
  }

  /** A flat disc about `c` facing `normal` (an iris, a diaphragm, a button). */
  disc(c: V3, normal: V3, radius: number, painter: Painter, seg = 12): void {
    const n = new Vector3(...normal).normalize();
    const u = new Vector3(Math.abs(n.y) < 0.9 ? 0 : 1, Math.abs(n.y) < 0.9 ? 1 : 0, 0);
    u.addScaledVector(n, -u.dot(n)).normalize();
    const v = new Vector3().crossVectors(n, u);
    const v0 = this.vertexCount, i0 = this.idx.length;
    const centre = this.vertex(c[0], c[1], c[2], painter);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * TAU;
      this.vertex(c[0] + (u.x * Math.cos(a) + v.x * Math.sin(a)) * radius, c[1] + (u.y * Math.cos(a) + v.y * Math.sin(a)) * radius, c[2] + (u.z * Math.cos(a) + v.z * Math.sin(a)) * radius, painter);
    }
    for (let j = 0; j < seg; j++) this.tri(centre, centre + 1 + j, centre + 1 + ((j + 1) % seg));
    this.finish(v0, i0);
  }

  /** The geometry of everything added: position, normal, colour and finish (gloss, glow) per vertex, indexed. */
  geometry(): BufferGeometry {
    const count = this.vertexCount;
    const pos = new Float32Array(this.pos);
    const nrm = new Float32Array(count * 3);
    const idx = this.idx;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i]! * 3, b = idx[i + 1]! * 3, c = idx[i + 2]! * 3;
      const ux = pos[b]! - pos[a]!, uy = pos[b + 1]! - pos[a + 1]!, uz = pos[b + 2]! - pos[a + 2]!;
      const vx = pos[c]! - pos[a]!, vy = pos[c + 1]! - pos[a + 1]!, vz = pos[c + 2]! - pos[a + 2]!;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const k of [a, b, c]) {
        nrm[k] = nrm[k]! + nx;
        nrm[k + 1] = nrm[k + 1]! + ny;
        nrm[k + 2] = nrm[k + 2]! + nz;
      }
    }
    for (let i = 0; i < nrm.length; i += 3) {
      const l = Math.hypot(nrm[i]!, nrm[i + 1]!, nrm[i + 2]!) || 1;
      nrm[i] = nrm[i]! / l;
      nrm[i + 1] = nrm[i + 1]! / l;
      nrm[i + 2] = nrm[i + 2]! / l;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("normal", new BufferAttribute(nrm, 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(this.col), 3));
    g.setAttribute("finish", new BufferAttribute(new Float32Array(this.gls), 2));
    g.setIndex(new BufferAttribute(count > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}
