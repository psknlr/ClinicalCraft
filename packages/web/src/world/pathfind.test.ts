import { describe, expect, it } from "vitest";
import { buildNavGrid, cellOf, findPath, findPathCells, isFree, lineOfSight, nearestFree, smoothPath } from "./pathfind.js";
import { boxCollider } from "./physics.js";

const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

/** A wall along z = 0 from x −10…10 with a 3-wide doorway at x ∈ [−1.5, 1.5]. */
const wallWithDoor = (doorEnabled = true) => [
  boxCollider(-5.75, 2, 0, 8.5, 4, 0.4),
  boxCollider(5.75, 2, 0, 8.5, 4, 0.4),
  { ...boxCollider(0, 1.5, 0, 3, 3, 0.2), door: true, enabled: doorEnabled },
];

describe("nav grid", () => {
  it("blocks cells overlapped by colliders (inflated by the player radius)", () => {
    const g = buildNavGrid(bounds, [boxCollider(0, 1, 0, 2, 2, 2)]);
    const [cx, cz] = cellOf(g, 0, 0);
    expect(isFree(g, cx, cz)).toBe(false);
    const [fx, fz] = cellOf(g, 1.6, 0);
    expect(isFree(g, fx, fz)).toBe(true);
  });
  it("ignores overhead and flat colliders", () => {
    const g = buildNavGrid(bounds, [boxCollider(0, 3, 0, 4, 0.2, 4), boxCollider(3, 0.02, 3, 2, 0.04, 2)]);
    expect(g.blocked.every((b) => b === 0)).toBe(true);
  });
  it("treats doors as passable even when closed", () => {
    const g = buildNavGrid(bounds, wallWithDoor(true));
    const [dx, dz] = cellOf(g, 0, 0);
    expect(isFree(g, dx, dz)).toBe(true);
    const strict = buildNavGrid(bounds, wallWithDoor(true), { doorsPassable: false });
    expect(isFree(strict, dx, dz)).toBe(false);
  });
});

describe("A*", () => {
  it("routes through the doorway", () => {
    const g = buildNavGrid(bounds, wallWithDoor());
    const path = findPath(g, { x: -6, z: 6 }, { x: 6, z: -6 });
    expect(path).not.toBeNull();
    const pts = [{ x: -6, z: 6 }, ...path!];
    // some segment crosses z = 0 inside the doorway
    const crossing = pts.slice(1).some((p, i) => {
      const a = pts[i];
      if ((a.z > 0) === (p.z > 0)) return false;
      const t = a.z / (a.z - p.z);
      return Math.abs(a.x + (p.x - a.x) * t) < 1.5;
    });
    expect(crossing).toBe(true);
    expect(path![path!.length - 1]).toEqual({ x: 6, z: -6 });
    // smoothed into few straight segments
    expect(path!.length).toBeLessThanOrEqual(4);
    for (let i = 1; i < pts.length; i++) expect(lineOfSight(g, pts[i - 1], pts[i])).toBe(true);
  });
  it("returns null when the goal is sealed off", () => {
    const sealed = [boxCollider(0, 2, 0, 20, 4, 0.4)];
    const g = buildNavGrid(bounds, sealed);
    expect(findPathCells(g, { x: 0, z: 5 }, { x: 0, z: -5 })).toBeNull();
  });
  it("snaps a goal inside furniture to the nearest free cell", () => {
    const desk = boxCollider(0, 0.5, -5, 3, 1, 1.4);
    const g = buildNavGrid(bounds, [desk]);
    const path = findPath(g, { x: 0, z: 5 }, { x: 0, z: -5 })!;
    const end = path[path.length - 1];
    expect(Math.hypot(end.x, end.z + 5)).toBeLessThan(1.5);
    const [ex, ez] = cellOf(g, end.x, end.z);
    expect(isFree(g, ex, ez)).toBe(true);
  });
  it("nearestFree finds a ring neighbour and smoothPath keeps endpoints", () => {
    const g = buildNavGrid(bounds, [boxCollider(0, 1, 0, 1, 2, 1)]);
    const [cx, cz] = cellOf(g, 0, 0);
    const nf = nearestFree(g, cx, cz)!;
    expect(isFree(g, nf[0], nf[1])).toBe(true);
    // real cell paths run through cell centres (… .25 / .75)
    const cells = [
      { x: 1.25, z: 1.25 },
      { x: 2.25, z: 1.25 },
      { x: 3.25, z: 1.25 },
    ];
    expect(smoothPath(g, { x: 0.9, z: 1.25 }, cells)).toEqual([{ x: 3.25, z: 1.25 }]);
  });
});

describe("corner clearance", () => {
  // a long wall plus two cabinets; nav grid inflated like the world (player radius + .08)
  const boxes = [boxCollider(-5, 2, 0, 10, 4, 0.4), boxCollider(3.1, 1, 3.3, 1.3, 2, 2.1), boxCollider(4.37, 1, -4.1, 2.2, 2, 0.9)];
  /** Chebyshev clearance of a point from the nearest box (the player collider is a square). */
  const clearance = (x: number, z: number) => Math.min(...boxes.map((w) => Math.max(w.minX - x, x - w.maxX, w.minZ - z, z - w.maxZ)));
  const worstClearance = (pts: { x: number; z: number }[]) => {
    let worst = Infinity;
    for (let i = 1; i < pts.length; i++)
      for (let k = 0; k <= 60; k++) {
        const t = k / 60;
        worst = Math.min(worst, clearance(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t));
      }
    return worst;
  };
  it("fat smoothing keeps the player radius (.28) clear of corners; thin smoothing grazes them", () => {
    const g = buildNavGrid(bounds, boxes, { radius: 0.36 });
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let thin = Infinity, fat = Infinity, n = 0;
    for (let k = 0; k < 400; k++) {
      const s = { x: -9 + rnd() * 18, z: -9 + rnd() * 18 }, e = { x: -9 + rnd() * 18, z: -9 + rnd() * 18 };
      if (clearance(s.x, s.z) < 0.6 || clearance(e.x, e.z) < 0.6) continue;
      const cells = findPathCells(g, s, e);
      if (!cells) continue;
      n++;
      thin = Math.min(thin, worstClearance([cells[0], ...smoothPath(g, cells[0], cells, 0)]));
      fat = Math.min(fat, worstClearance([cells[0], ...smoothPath(g, cells[0], cells)]));
    }
    expect(n).toBeGreaterThan(200);
    expect(thin).toBeLessThan(0.28);
    expect(fat).toBeGreaterThanOrEqual(0.28);
  });
});
