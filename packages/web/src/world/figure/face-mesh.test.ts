import { describe, expect, it } from "vitest";
import { leaves, Patchwork, type Outline } from "./face-mesh.js";

const PAINT = { rgb: [1, 1, 1] as const };

/** A loop of `n` points round the origin at `radius`, counter-clockwise from `start` radians, at depth `z`. */
function loop(mesh: Patchwork, n: number, radius: number, start = 0, z = 0, late = false): number[] {
  return Array.from({ length: n }, (_, k) => {
    const a = start + (k / n) * Math.PI * 2;
    return mesh.add(Math.cos(a) * radius, Math.sin(a) * radius, z, PAINT, late);
  });
}

/** The area of each triangle seen from in front (positive: counter-clockwise), and how often each edge is used. */
function facts(points: number[], triangles: number[]): { areas: number[]; edges: Map<string, number> } {
  const areas: number[] = [];
  const edges = new Map<string, number>();
  for (let i = 0; i < triangles.length; i += 3) {
    const [a, b, c] = [triangles[i]!, triangles[i + 1]!, triangles[i + 2]!];
    const ax = points[3 * a]!, ay = points[3 * a + 1]!;
    areas.push(((points[3 * b]! - ax) * (points[3 * c + 1]! - ay) - (points[3 * c]! - ax) * (points[3 * b + 1]! - ay)) / 2);
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const key = p < q ? `${p}:${q}` : `${q}:${p}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  return { areas, edges };
}

describe("putting a skin together from loops (face-mesh.ts)", () => {
  it("finds where a ray from inside leaves an outline", () => {
    const square: Outline = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    expect(leaves(square, 0, 0, 0)).toEqual([1, 0]);
    const up = leaves(square, 0.5, 0, Math.PI / 2);
    expect(up[0]).toBeCloseTo(0.5, 10);
    expect(up[1]).toBeCloseTo(1, 10);
    const corner = leaves(square, 0, 0, Math.PI / 4);
    expect(corner[0]).toBeCloseTo(1, 6);
    expect(corner[1]).toBeCloseTo(1, 6);
    // from off the middle the far wall is further
    expect(leaves(square, 0.8, 0, Math.PI)[0]).toBeCloseTo(-1, 10);
  });

  it("joins two loops of the same count ring to ring, faces outward", () => {
    const mesh = new Patchwork();
    const outer = loop(mesh, 12, 2), inner = loop(mesh, 12, 1);
    mesh.strip(outer, inner);
    const { points, triangles } = mesh.finish();
    const { areas, edges } = facts(points, triangles);
    expect(areas).toHaveLength(24);
    for (const a of areas) expect(a).toBeGreaterThan(0);
    // the ring between two twelve-sided loops, exactly
    const ring = (r: number) => 6 * r * r * Math.sin(Math.PI / 6);
    expect(areas.reduce((s, a) => s + a, 0)).toBeCloseTo(ring(2) - ring(1), 10);
    expect([...edges.values()].filter((n) => n === 1)).toHaveLength(24);
    expect([...edges.values()].every((n) => n <= 2)).toBe(true);
  });

  it("zips two loops of any two counts, wherever each begins", () => {
    for (const [n, m, startA, startB] of [[20, 7, 0, 0], [9, 31, 1.3, -2.1], [16, 16, 0.2, 3], [5, 44, -0.7, 0.4]] as const) {
      const mesh = new Patchwork();
      const outer = loop(mesh, n, 2, startA), inner = loop(mesh, m, 1, startB);
      mesh.zip(outer, inner, 0, 0);
      const { points, triangles } = mesh.finish();
      const { areas, edges } = facts(points, triangles);
      expect(areas, `${n} to ${m}`).toHaveLength(n + m);
      for (const a of areas) expect(a, `${n} to ${m}`).toBeGreaterThan(0);
      const sided = (k: number, r: number) => (k / 2) * r * r * Math.sin((2 * Math.PI) / k);
      expect(areas.reduce((s, a) => s + a, 0)).toBeCloseTo(sided(n, 2) - sided(m, 1), 9);
      // every edge between the loops is shared by two triangles; only the loops' own edges are open
      expect([...edges.values()].filter((k) => k === 1)).toHaveLength(n + m);
      expect([...edges.values()].every((k) => k <= 2)).toBe(true);
    }
  });

  it("numbers the points added late after all the others, wherever they were added", () => {
    const mesh = new Patchwork();
    const a = mesh.add(0, 0, 0, PAINT);
    const late = [mesh.add(1, 0, 0, PAINT, true), mesh.add(2, 0, 0, PAINT, true)];
    const b = mesh.add(3, 0, 0, PAINT);
    expect(late.every((h) => h < 0)).toBe(true);
    expect(mesh.at(late[1]!)).toEqual([2, 0, 0]);
    expect(mesh.at(b)).toEqual([3, 0, 0]);
    mesh.tri(a, late[0]!, b);
    mesh.tri(b, late[0]!, late[1]!);
    const done = mesh.finish();
    expect(done.late).toEqual([2, 2]);
    expect(done.points).toEqual([0, 0, 0, 3, 0, 0, 1, 0, 0, 2, 0, 0]);
    expect(done.triangles).toEqual([0, 2, 1, 1, 2, 3]);
    expect(done.paints).toHaveLength(4);
  });
});
