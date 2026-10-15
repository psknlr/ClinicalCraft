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
    const cells = [
      { x: 1, z: 1 },
      { x: 2, z: 1 },
      { x: 3, z: 1 },
    ];
    expect(smoothPath(g, { x: 0.9, z: 1 }, cells)).toEqual([{ x: 3, z: 1 }]);
  });
});

describe("corner clearance", () => {
  it("fat line of sight rejects segments that graze a wall corner the thin test accepts", () => {
    // wall block x ∈ [−10, 0], z ∈ [−0.2, 0.2]; a segment that passes the corner diagonally
    const g = buildNavGrid(bounds, [boxCollider(-5, 2, 0, 10, 4, 0.4)]);
    const a = { x: -0.25, z: 1.25 }, b = { x: 1.25, z: -1.25 };
    expect(isFree(g, ...cellOf(g, a.x, a.z))).toBe(true);
    expect(lineOfSight(g, a, b, g.cell / 2)).toBe(false);
  });
  it("smoothed paths keep a fat corridor clear of corners", () => {
    const g = buildNavGrid(bounds, wallWithDoor(false), { doorsPassable: false });
    const start = { x: -6, z: 6 };
    const path = findPath(g, start, { x: 9, z: 0.5 })!;
    expect(path).not.toBeNull();
    const pts = [start, ...path];
    for (let i = 2; i < pts.length; i++) expect(lineOfSight(g, pts[i - 1], pts[i], g.cell / 2)).toBe(true);
  });
});
