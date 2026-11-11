/**
 * Putting one skin together from pieces: the head's grid with openings cut in it, and round each opening rings of
 * finer and finer points down to the edge of a lid or a lip. Everything shares its points, so the skin is one
 * surface with one smooth shading — no part sits on another. Loops of points are joined ring to ring (`strip`,
 * the same count) or zipped (`zip`, any two counts) by the angle each point is seen at from the opening's middle.
 * Points added `late` end up together at the end of the mesh (the upper lids: what a blink moves).
 */
import type { Paint } from "./sculpt.js";

/** A loop seen from in front, as [x, y] corners in order. */
export type Outline = readonly (readonly [number, number])[];

/** Where the ray from (cx, cy) at angle `theta` leaves a closed outline that surrounds it. */
export function leaves(outline: Outline, cx: number, cy: number, theta: number): [number, number] {
  const dx = Math.cos(theta), dy = Math.sin(theta);
  let best: [number, number] | null = null, bestR = Infinity;
  for (let j = 0; j < outline.length; j++) {
    const a = outline[j]!, b = outline[(j + 1) % outline.length]!;
    const ax = a[0] - cx, ay = a[1] - cy, ex = b[0] - a[0], ey = b[1] - a[1];
    const det = ex * dy - ey * dx;
    if (Math.abs(det) < 1e-14) continue;
    const u = (ay * dx - ax * dy) / det, r = (ay * ex - ax * ey) / det;
    if (u < -1e-6 || u > 1 + 1e-6 || r <= 0 || r >= bestR) continue;
    bestR = r;
    best = [a[0] + ex * u, a[1] + ey * u];
  }
  return best ?? [cx, cy];
}

/** A mesh being put together: points with their paint, and triangles (counter-clockwise seen from outside). */
export class Patchwork {
  private readonly pts: number[][] = [[], []];
  private readonly paints: Paint[][] = [[], []];
  private readonly tris: number[] = [];

  /** Add a point; `late` points are numbered after all the others. Returns its handle. */
  add(x: number, y: number, z: number, paint: Paint, late = false): number {
    const g = late ? 1 : 0;
    this.pts[g]!.push(x, y, z);
    this.paints[g]!.push(paint);
    const k = this.paints[g]!.length - 1;
    return late ? -1 - k : k;
  }

  /** Where a point is. */
  at(handle: number): [number, number, number] {
    const g = handle < 0 ? 1 : 0, k = handle < 0 ? -1 - handle : handle;
    return [this.pts[g]![3 * k]!, this.pts[g]![3 * k + 1]!, this.pts[g]![3 * k + 2]!];
  }

  tri(a: number, b: number, c: number): void {
    this.tris.push(a, b, c);
  }

  /** Two closed loops of the same count, point for point: `outer` round `inner`, both counter-clockwise seen from in front. */
  strip(outer: readonly number[], inner: readonly number[]): void {
    const n = outer.length;
    for (let k = 0; k < n; k++) {
      const l = (k + 1) % n;
      this.tri(outer[k]!, outer[l]!, inner[k]!);
      this.tri(inner[k]!, outer[l]!, inner[l]!);
    }
  }

  /**
   * Two closed loops of any two counts, `outer` round `inner`, both counter-clockwise seen from in front and both
   * surrounding (cx, cy): triangles between them, each loop going on as the angle from the middle does.
   */
  zip(outer: readonly number[], inner: readonly number[], cx: number, cy: number): void {
    const turned = (loop: readonly number[]): { ids: number[]; angles: number[] } => {
      const raw = loop.map((h) => {
        const p = this.at(h);
        return Math.atan2(p[1] - cy, p[0] - cx);
      });
      let first = 0;
      for (let k = 1; k < raw.length; k++) if (raw[k]! < raw[first]!) first = k;
      const ids: number[] = [], angles: number[] = [];
      for (let k = 0; k < loop.length; k++) {
        const i = (first + k) % loop.length;
        // counter-clockwise from the smallest angle, the angle only grows (a point seen a hair back from the
        // one before stays with it)
        const a = k > 0 ? Math.max(raw[i]!, angles[k - 1]!) : raw[i]!;
        ids.push(loop[i]!);
        angles.push(a);
      }
      return { ids, angles };
    };
    const A = turned(outer), B = turned(inner);
    const n = A.ids.length, m = B.ids.length;
    const a = (i: number) => (i < n ? A.angles[i]! : A.angles[i - n]! + 2 * Math.PI);
    const b = (j: number) => (j < m ? B.angles[j]! : B.angles[j - m]! + 2 * Math.PI);
    let i = 0, j = 0;
    while (i < n || j < m) {
      // go on along the loop whose next point makes the shorter new edge across (the smaller angle between its ends):
      // a point of a coarse loop is joined to the points of a fine one either side of it, never to far ones
      const viaA = i < n ? Math.abs(a(i + 1) - b(j)) : Infinity;
      const viaB = j < m ? Math.abs(a(i) - b(j + 1)) : Infinity;
      if (viaA <= viaB) {
        this.tri(A.ids[i % n]!, A.ids[(i + 1) % n]!, B.ids[j % m]!);
        i++;
      } else {
        this.tri(B.ids[j % m]!, A.ids[i % n]!, B.ids[(j + 1) % m]!);
        j++;
      }
    }
  }

  /** The mesh: flat points, a paint per point, triangles — and the range [start, count] of the points added `late`. */
  finish(): { points: number[]; paints: Paint[]; triangles: number[]; late: [number, number] } {
    const early = this.paints[0]!.length;
    const index = (h: number) => (h < 0 ? early + (-1 - h) : h);
    return { points: [...this.pts[0]!, ...this.pts[1]!], paints: [...this.paints[0]!, ...this.paints[1]!], triangles: this.tris.map(index), late: [early, this.paints[1]!.length] };
  }
}
