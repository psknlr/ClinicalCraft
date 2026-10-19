import { describe, expect, it } from "vitest";
import {
  greedyRects,
  mergeWallPieces,
  partBox,
  placementBox,
  resolveOpenings,
  rotatedFootprint,
  rotateXZ,
  segmentWall,
  signWidth,
  splitInterval,
  wallLine,
} from "./geometry.js";

describe("rotations (three.js rotation.y semantics)", () => {
  it("rotates local +Z (equipment front) to (sin, cos)", () => {
    expect(rotateXZ(0, 1, 0)).toEqual([0, 1]);
    expect(rotateXZ(0, 1, 90)).toEqual([1, -0]);
    expect(rotateXZ(0, 1, 180)).toEqual([-0, -1]);
    expect(rotateXZ(0, 1, 270)).toEqual([-1, 0]);
    expect(rotateXZ(0, 1, -90)).toEqual([-1, 0]);
    const [x, z] = rotateXZ(0, 1, 45);
    expect(x).toBeCloseTo(Math.SQRT1_2);
    expect(z).toBeCloseTo(Math.SQRT1_2);
  });
  it("swaps footprints at 90/270 and bounds arbitrary angles", () => {
    expect(rotatedFootprint(3, 1.4, 90)).toEqual({ w: 1.4, d: 3 });
    expect(rotatedFootprint(3, 1.4, 180)).toEqual({ w: 3, d: 1.4 });
    const f = rotatedFootprint(2, 1, 45);
    expect(f.w).toBeCloseTo(f.d);
    expect(f.w).toBeCloseTo((3 * Math.SQRT2) / 2);
  });
  it("placement and part boxes follow rot", () => {
    expect(placementBox({ x: 10, z: 5, rot: 90 }, { w: 3, d: 1, h: 2 })).toEqual({ minX: 9.5, maxX: 10.5, minY: 0, maxY: 2, minZ: 3.5, maxZ: 6.5 });
    const b = partBox({ x: 0, z: 0, rot: 90 }, { p: [0, 1.5, 0.5], s: [1, 1, 0.2] });
    expect(b.minX).toBeCloseTo(0.4);
    expect(b.maxX).toBeCloseTo(0.6);
    expect(b.minZ).toBeCloseTo(-0.5);
    expect(b.minY).toBeCloseTo(1);
  });
});

describe("wall lines (V4 clinic)", () => {
  const rect = { x: 0, z: -3, w: 26, d: 22 };
  it("north/south walls run past the corners, east/west stop short (building mode)", () => {
    const s = wallLine(rect, "s", 1);
    expect(s).toMatchObject({ axis: "x", line: 8, from: -13.5, to: 13.5, outward: 1 });
    const e = wallLine(rect, "e", 1);
    expect(e).toMatchObject({ axis: "z", line: 13, from: -13.5, to: 7.5, centre: -3, outward: 1 });
    expect(wallLine(rect, "n", 1, "exact")).toMatchObject({ line: -14, from: -13, to: 13, outward: -1 });
  });
  it("splits intervals into ~1-unit pieces at breakpoints", () => {
    expect(splitInterval(-13.5, -1.5, [], 1)).toHaveLength(12);
    expect(splitInterval(0, 2.5, [1.25], 1).map(([a, b]) => +(b - a).toFixed(3))).toEqual([1.25, 1.25]);
    expect(splitInterval(0, 3, [0.5], 1).map(([a, b]) => +(b - a).toFixed(3))).toEqual([0.5, 1.25, 1.25]);
  });
});

describe("opening segmentation", () => {
  const rect = { x: 0, z: -3, w: 26, d: 22 };
  it("V4 front door: 3-wide, 3-high gap in a 5-high wall", () => {
    const wall = wallLine(rect, "s", 1);
    const ops = resolveOpenings(wall, 5, [{ kind: "double-door", offset: 0, width: 3, height: 3 }]);
    expect(ops[0]).toMatchObject({ a: -1.5, b: 1.5, y0: 0, y1: 3 });
    const pieces = segmentWall(wall, 5, ops);
    // 27 columns × 5 rows minus 3 × 3 door blocks
    expect(pieces).toHaveLength(27 * 5 - 9);
    expect(pieces.some((p) => p.a >= -1.5 && p.b <= 1.5 && p.y1 <= 3)).toBe(false);
    expect(pieces.filter((p) => p.course === "base")).toHaveLength(24);
    expect(pieces.filter((p) => p.course === "top")).toHaveLength(27);
    expect(pieces.filter((p) => p.a >= -1.5 && p.b <= 1.5)).toHaveLength(6); // rows 3–4 above the door
  });
  it("V4 side windows: glass rows 1–2 (sill 1, height 2) at z 0.5…5.5", () => {
    const wall = wallLine(rect, "e", 1);
    const ops = resolveOpenings(wall, 5, [{ kind: "window", offset: 6, width: 5, height: 2, sill: 1 }]);
    expect(ops[0]).toMatchObject({ a: 0.5, b: 5.5, y0: 1, y1: 3 });
    const pieces = segmentWall(wall, 5, ops);
    expect(pieces.filter((p) => p.a >= 0.5 && p.b <= 5.5).map((p) => p.y0).sort()).toEqual([0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4]);
  });
  it("clamps openings to the wall and drops empty ones", () => {
    const wall = wallLine({ x: 0, z: 0, w: 4, d: 4 }, "n", 0.35, "exact");
    const ops = resolveOpenings(wall, 4, [
      { kind: "door", offset: 1.5, width: 2 },
      { kind: "opening", offset: 10, width: 1 },
    ]);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ a: 0.5, b: 2 });
  });
  it("merges pieces into course boxes without changing coverage", () => {
    const wall = wallLine(rect, "s", 1);
    const ops = resolveOpenings(wall, 5, [{ kind: "double-door", offset: 0, width: 3, height: 3 }]);
    const pieces = segmentWall(wall, 5, ops);
    const merged = mergeWallPieces(pieces);
    const area = (ps: { a: number; b: number; y0: number; y1: number }[]) => ps.reduce((s, p) => s + (p.b - p.a) * (p.y1 - p.y0), 0);
    expect(area(merged)).toBeCloseTo(area(pieces));
    expect(merged.length).toBeLessThan(10);
    expect(new Set(merged.map((m) => m.key))).toEqual(new Set(["base", "body", "top"]));
  });
});

describe("greedyRects", () => {
  it("merges equal runs across rows and keeps different values apart", () => {
    const grid = ["aaab", "aaab", "ccab"];
    const rects = greedyRects(4, 3, (x, z) => grid[z][x] as "a" | "b" | "c");
    const cells = rects.reduce((n, r) => n + (r.ix1 - r.ix0 + 1) * (r.iz1 - r.iz0 + 1), 0);
    expect(cells).toBe(12);
    expect(rects.find((r) => r.value === "b")).toMatchObject({ ix0: 3, ix1: 3, iz0: 0, iz1: 2 });
    expect(rects.find((r) => r.value === "a" && r.ix0 === 0)).toMatchObject({ ix1: 2, iz1: 1 });
  });
  it("skips empty cells", () => {
    const rects = greedyRects(3, 3, (x, z) => (x === 1 && z === 1 ? null : "r"));
    expect(rects.reduce((n, r) => n + (r.ix1 - r.ix0 + 1) * (r.iz1 - r.iz0 + 1), 0)).toBe(8);
  });
});

describe("sign sizing", () => {
  it("matches V4 widths for short and long CJK labels", () => {
    expect(signWidth("接 诊")).toBe(2.4);
    expect(signWidth("检验工作台", 2.4, 3.8)).toBeCloseTo(3.55);
    expect(signWidth("A very long English sign")).toBe(4.2);
  });
});
