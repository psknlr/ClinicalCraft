/**
 * Locks of hair. Hair is not a shell: it is strands that lie together in locks, each a narrow ribbon with a soft
 * ridge along its middle that catches the light, thinning to a point at its end. A lock is given by points along
 * its middle — where it is, which way its outer face looks, how wide it is there — and is drawn either open
 * underneath (it lies on the hair under it, and is only ever seen from outside) or closed (a strand that hangs
 * free — a fringe, a lock beside the face — and is seen from every side). `Locks` gathers the locks of a head of
 * hair into one mesh.
 */
import { Vector3 } from "three";
import type { Paint, Rgb, Sculpt } from "./sculpt.js";

/** One point along a lock: its middle, the way its outer face looks there (a unit vector), and its width (m). */
export interface LockPoint {
  p: Vector3;
  out: Vector3;
  width: number;
  /** How much of the lock's ridge it has here (default 1): hair combed flat on the head has little, hair hanging free all of it. */
  round?: number;
  /** How far under its middle line a closed lock's underside is here (m), in place of its own thickness: down to the hair it lies on, and no further. */
  deep?: number;
}

/** How a lock is drawn. */
export interface LockLook {
  /** How far its ridge stands over its middle line, as a share of its width (default 0.2). */
  arch?: number;
  /** How far its edges lie under its middle line, as a share of its width: a broad lock on a round head is round with it (default 0). */
  sink?: number;
  /** Closed underneath, this thick below its edges as a share of its width; left out, it is open underneath. */
  closed?: number;
  /** How light it is along it (`t` 0 at its root … 1 at its end) and across it (`a` −1 and 1 its edges, 0 its ridge), against the hair's own colour. */
  light?: (t: number, a: number) => number;
  /** Its gloss on the ridge (its edges have a little less; default 0.5). */
  gloss?: number;
}

const tmpT = new Vector3(), tmpN = new Vector3(), tmpS = new Vector3();

/** The locks of a head of hair, as one mesh in the making. */
export class Locks {
  private readonly points: number[] = [];
  private readonly paints: Paint[] = [];
  private readonly triangles: number[] = [];
  /** Locks added so far. */
  count = 0;

  /** Triangles so far. */
  get triangleCount(): number {
    return this.triangles.length / 3;
  }

  /** Add a lock along `path` (root first, at least two points) in the hair colour `hair`. */
  add(path: readonly LockPoint[], hair: Rgb, look: LockLook = {}): void {
    const n = path.length;
    if (n < 2) return;
    const arch = look.arch ?? 0.2, sink = look.sink ?? 0, closed = look.closed ?? 0, gloss = look.gloss ?? 0.5;
    const light = look.light ?? (() => 1);
    const per = closed > 0 ? 4 : 3;
    const v0 = this.paints.length;
    const put = (p: Vector3, k: number, g: number) => {
      this.points.push(p.x, p.y, p.z);
      this.paints.push({ rgb: [hair[0] * k, hair[1] * k, hair[2] * k], gloss: g });
    };
    const q = new Vector3();
    for (let i = 0; i < n; i++) {
      const at = path[i]!;
      const t = i / (n - 1);
      // along the lock, squarely across it, and out of it
      tmpT.copy(path[Math.min(n - 1, i + 1)]!.p).sub(path[Math.max(0, i - 1)]!.p).normalize();
      tmpN.copy(at.out).addScaledVector(tmpT, -at.out.dot(tmpT));
      if (tmpN.lengthSq() < 1e-10) tmpN.set(0, 0, 1).addScaledVector(tmpT, -tmpT.z);
      tmpN.normalize();
      tmpS.crossVectors(tmpT, tmpN);
      const half = at.width / 2;
      put(q.copy(at.p).addScaledVector(tmpS, -half).addScaledVector(tmpN, -sink * at.width), light(t, -1), gloss * 0.7);
      put(q.copy(at.p).addScaledVector(tmpN, arch * at.width * (at.round ?? 1)), light(t, 0), gloss);
      put(q.copy(at.p).addScaledVector(tmpS, half).addScaledVector(tmpN, -sink * at.width), light(t, 1), gloss * 0.7);
      // (underneath a lock is in its own shade)
      // (its underside: its own thickness under its edges, or as deep as this point says — never over its edges)
      if (closed > 0) put(q.copy(at.p).addScaledVector(tmpN, -(at.deep === undefined ? (closed + sink) * at.width : Math.max(at.deep, sink * at.width + 0.0002))), light(t, 0) * 0.62, gloss * 0.4);
    }
    for (let i = 0; i + 1 < n; i++) {
      const a = v0 + i * per, b = a + per;
      // left edge to ridge, ridge to right edge: faces outward
      this.triangles.push(a, a + 1, b, b, a + 1, b + 1);
      this.triangles.push(a + 1, a + 2, b + 1, b + 1, a + 2, b + 2);
      if (closed > 0) {
        this.triangles.push(a + 2, a + 3, b + 2, b + 2, a + 3, b + 3);
        this.triangles.push(a + 3, a, b + 3, b + 3, a, b);
      }
    }
    if (closed > 0) {
      // closed at its root too (its end is a point)
      this.triangles.push(v0, v0 + 3, v0 + 1, v0 + 1, v0 + 3, v0 + 2);
    }
    this.count++;
  }

  /** Put the locks into `sc` as one part. */
  into(sc: Sculpt): void {
    if (this.paints.length) sc.mesh(this.points, this.triangles, this.paints);
  }
}

/** Points evenly along a line through `through` (a smooth curve through them all), `n` of them. */
export function along(through: readonly Vector3[], n: number): Vector3[] {
  const m = through.length;
  const out: Vector3[] = [];
  const at = (i: number) => through[Math.min(m - 1, Math.max(0, i))]!;
  for (let k = 0; k < n; k++) {
    const u = (k / (n - 1)) * (m - 1);
    const i = Math.min(m - 2, Math.floor(u)), t = u - i;
    // Catmull–Rom through the points
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const t2 = t * t, t3 = t2 * t;
    out.push(
      new Vector3(
        0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (p2.y - p0.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
        0.5 * (2 * p1.z + (p2.z - p0.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (3 * p1.z - p0.z - 3 * p2.z + p3.z) * t3),
      ),
    );
  }
  return out;
}
