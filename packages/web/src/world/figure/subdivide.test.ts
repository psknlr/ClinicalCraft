import { describe, expect, it } from "vitest";
import { fitCage, limitPoints, smoothSurface, subdivide, type PolyMesh } from "./subdivide.js";

/** A cube of side 2 about the origin (faces outward). */
function cube(): PolyMesh {
  const points = Float64Array.from([-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1]);
  return { stride: 3, points, faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]] };
}

/** An open tube along Y: `rings` rings of four points, with a channel that is the ring's number. */
function tube(rings: number): PolyMesh {
  const pts: number[] = [], faces: number[][] = [];
  for (let j = 0; j < rings; j++) for (const [x, z] of [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const) pts.push(x, j, z, j);
  for (let j = 0; j + 1 < rings; j++) for (let i = 0; i < 4; i++) faces.push([4 * j + i, 4 * (j + 1) + i, 4 * (j + 1) + ((i + 1) % 4), 4 * j + ((i + 1) % 4)]);
  return { stride: 4, points: Float64Array.from(pts), faces };
}

const volume = (points: Float64Array, stride: number, triangles: number[]): number => {
  let v = 0;
  for (let i = 0; i < triangles.length; i += 3) {
    const [a, b, c] = [triangles[i]! * stride, triangles[i + 1]! * stride, triangles[i + 2]! * stride];
    v += (points[a]! * (points[b + 1]! * points[c + 2]! - points[b + 2]! * points[c + 1]!) - points[a + 1]! * (points[b]! * points[c + 2]! - points[b + 2]! * points[c]!) + points[a + 2]! * (points[b]! * points[c + 1]! - points[b + 1]! * points[c]!)) / 6;
  }
  return v;
};

describe("smooth skin from a cage (figure/subdivide.ts)", () => {
  it("one step: a point per point, per face and per edge; a quad per corner, in the order of the faces", () => {
    const once = subdivide(cube());
    expect(once.points.length / 3).toBe(8 + 6 + 12);
    expect(once.faces).toHaveLength(24);
    for (const face of once.faces) expect(face).toHaveLength(4);
    // face 0's children come first, each beginning at one of its corners
    expect(once.faces.slice(0, 4).map((f) => f[0])).toEqual([0, 3, 2, 1]);
    // each of them meets the face's own point (the 9th: after the 8 corners)
    for (const f of once.faces.slice(0, 4)) expect(f[2]).toBe(8);
    // a triangle becomes three quads
    const tri = subdivide({ stride: 3, points: Float64Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]), faces: [[0, 1, 2]] });
    expect(tri.faces).toHaveLength(3);
  });

  it("a cube becomes a ball: every point of its smooth surface the same distance out, faces still outward", () => {
    const s = smoothSurface(cube(), 2);
    expect(s.border).toHaveLength(0);
    const radii: number[] = [];
    for (let i = 0; i < s.points.length; i += 3) radii.push(Math.hypot(s.points[i]!, s.points[i + 1]!, s.points[i + 2]!));
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.08);
    // well inside the cage it was drawn as
    expect(Math.max(...radii)).toBeLessThan(1.25);
    // a ball of radius 0.84 or so, where the cube held 8: positive, so its faces still look outward
    const v = volume(s.points, 3, s.triangles);
    expect(v).toBeGreaterThan(2.2);
    expect(v).toBeLessThan(2.8);
  });

  it("an open end stays a clean loop, and channels are refined with the points", () => {
    const s = smoothSurface(tube(5), 2);
    // two ends of sixteen points each, on their own planes
    expect(s.border).toHaveLength(32);
    for (const v of s.border) expect(Math.min(Math.abs(s.points[4 * v + 1]!), Math.abs(s.points[4 * v + 1]! - 4))).toBeLessThan(1e-9);
    // the channel was the height: it still is, everywhere
    for (let i = 0; i < s.points.length; i += 4) expect(s.points[i + 3]!).toBeCloseTo(s.points[i + 1]!, 9);
  });

  it("a fitted cage's surface passes through where the cage was drawn", () => {
    const target = cube();
    const miss = (cage: PolyMesh): number => {
      const limit = limitPoints(subdivide(cage));
      let worst = 0;
      for (let i = 0; i < target.points.length; i++) worst = Math.max(worst, Math.abs(limit[i]! - target.points[i]!));
      return worst;
    };
    // unfitted, a corner's place on the surface is far inside the corner
    expect(miss(target)).toBeGreaterThan(0.3);
    expect(miss(fitCage(target, 5))).toBeLessThan(0.07);
    expect(miss(fitCage(target, 12))).toBeLessThan(0.005);
    // the target itself is left as it was
    expect(Array.from(target.points)).toEqual(Array.from(cube().points));
  });

  it("limit points need quads", () => {
    expect(() => limitPoints({ stride: 3, points: Float64Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]), faces: [[0, 1, 2]] })).toThrow(/quad/);
  });
});
