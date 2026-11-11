import { describe, expect, it } from "vitest";
import { Vector3, type BufferGeometry } from "three";
import { along, Locks, type LockPoint } from "./locks.js";
import { Sculpt, type Rgb } from "./sculpt.js";

const HAIR: Rgb = [0.2, 0.1, 0.05];

/** A lock straight down from the origin: `n` points `step` apart, facing +Z. */
function straight(n: number, width: (t: number) => number, more: Partial<LockPoint> = {}): LockPoint[] {
  return Array.from({ length: n }, (_, i) => ({ p: new Vector3(0, -i * 0.01, 0), out: new Vector3(0, 0, 1), width: width(i / (n - 1)), ...more }));
}

function built(locks: Locks): { sc: Sculpt; geometry: BufferGeometry } {
  const sc = new Sculpt();
  locks.into(sc);
  return { sc, geometry: sc.geometry() };
}

/** The volume a closed geometry encloses (positive when its faces look outward). */
function volumeOf(g: BufferGeometry): number {
  const index = g.getIndex()!.array, pos = g.getAttribute("position").array;
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  let v = 0;
  for (let i = 0; i < index.length; i += 3) {
    a.fromArray(pos, index[i]! * 3);
    b.fromArray(pos, index[i + 1]! * 3);
    c.fromArray(pos, index[i + 2]! * 3);
    v += a.dot(b.cross(c)) / 6;
  }
  return v;
}

describe("locks of hair (locks.ts)", () => {
  it("an open lock is a ribbon with a ridge: three points across, its faces outward", () => {
    const locks = new Locks();
    locks.add(straight(5, () => 0.02), HAIR, { arch: 0.2 });
    expect(locks.count).toBe(1);
    expect(locks.triangleCount).toBe(4 * 4);
    const { sc, geometry } = built(locks);
    expect(sc.vertexCount).toBe(5 * 3);
    const pos = geometry.getAttribute("position"), normal = geometry.getAttribute("normal");
    for (let i = 0; i < 5; i++) {
      // its edges a width apart, its ridge a fifth of that proud of them
      expect(Math.abs(pos.getX(3 * i + 2) - pos.getX(3 * i))).toBeCloseTo(0.02, 9);
      expect(pos.getX(3 * i + 1)).toBeCloseTo(0, 9);
      expect(pos.getZ(3 * i + 1)).toBeCloseTo(0.004, 9);
      expect(pos.getZ(3 * i)).toBeCloseTo(0, 9);
      for (let k = 0; k < 3; k++) expect(normal.getZ(3 * i + k)).toBeGreaterThan(0.5);
    }
    // darker at its edges than on its ridge, glossier on the ridge
    const colour = geometry.getAttribute("color"), finish = geometry.getAttribute("finish");
    expect(colour.getX(1)).toBeCloseTo(HAIR[0], 6);
    expect(finish.getX(1)).toBeGreaterThan(finish.getX(0));
  });

  it("takes its light along and across it from its look", () => {
    const locks = new Locks();
    locks.add(straight(3, () => 0.01), HAIR, { light: (t, a) => (1 + t) * (1 - 0.5 * a * a), gloss: 0.8 });
    const { geometry } = built(locks);
    const colour = geometry.getAttribute("color");
    // root: ridge 1, edges a half; end: twice that
    expect(colour.getX(1)).toBeCloseTo(HAIR[0], 6);
    expect(colour.getX(0)).toBeCloseTo(HAIR[0] * 0.5, 6);
    expect(colour.getX(7)).toBeCloseTo(HAIR[0] * 2, 6);
    expect(colour.getY(8)).toBeCloseTo(HAIR[1], 6);
    expect(geometry.getAttribute("finish").getX(4)).toBeCloseTo(0.8, 6);
  });

  it("a closed lock is a solid seen from every side, in shade underneath, thinning to its end", () => {
    const locks = new Locks();
    const path = straight(6, (t) => 0.02 * (1 - 0.9 * t));
    locks.add(path, HAIR, { arch: 0.2, closed: 0.25 });
    // four faces a step, and its root closed
    expect(locks.triangleCount).toBe(5 * 8 + 2);
    const { sc, geometry } = built(locks);
    expect(sc.vertexCount).toBe(6 * 4);
    expect(volumeOf(geometry)).toBeGreaterThan(0);
    // about the volume of a kite section drawn out to (nearly) a point
    const kite = (w: number) => 0.5 * w * (0.2 + 0.25) * w;
    let expected = 0;
    for (let i = 0; i + 1 < 6; i++) expected += 0.01 * 0.5 * (kite(path[i]!.width) + kite(path[i + 1]!.width));
    expect(volumeOf(geometry)).toBeGreaterThan(expected * 0.85);
    expect(volumeOf(geometry)).toBeLessThan(expected * 1.05);
    const pos = geometry.getAttribute("position"), colour = geometry.getAttribute("color");
    expect(pos.getZ(3)).toBeCloseTo(-0.25 * 0.02, 9);
    expect(colour.getX(3)).toBeLessThan(colour.getX(1));
  });

  it("is round with what it lies on (sink), flat where it is combed (round), and reaches down to it (deep)", () => {
    const locks = new Locks();
    locks.add(straight(3, () => 0.02, { round: 0.25, deep: 0.006 }), HAIR, { arch: 0.2, sink: 0.05, closed: 0.1 });
    const { geometry } = built(locks);
    const pos = geometry.getAttribute("position");
    // its edges lie under its middle line; its ridge stands a quarter as high as it would; its underside is deeper than its own thickness
    expect(pos.getZ(0)).toBeCloseTo(-0.001, 9);
    expect(pos.getZ(2)).toBeCloseTo(-0.001, 9);
    expect(pos.getZ(1)).toBeCloseTo(0.2 * 0.02 * 0.25, 9);
    expect(pos.getZ(3)).toBeCloseTo(-0.006, 9);
    // without `deep`, as thick as its look says
    const plain = new Locks();
    plain.add(straight(3, () => 0.02), HAIR, { sink: 0.05, closed: 0.1 });
    expect(built(plain).geometry.getAttribute("position").getZ(3)).toBeCloseTo(-(0.1 + 0.05) * 0.02, 9);
  });

  it("follows a path that turns, its faces square to it; gathers many locks into one part", () => {
    const locks = new Locks();
    // a quarter circle from pointing down to pointing forward, facing out of the turn
    const path: LockPoint[] = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 8) * (Math.PI / 2);
      return { p: new Vector3(0, -0.05 * Math.sin(a), 0.05 * (1 - Math.cos(a))), out: new Vector3(0, -Math.sin(a), Math.cos(a)), width: 0.01 };
    });
    locks.add(path, HAIR, { closed: 0.2 });
    locks.add(straight(4, () => 0.01), HAIR);
    locks.add([{ p: new Vector3(), out: new Vector3(0, 0, 1), width: 0.01 }], HAIR);
    // (a path of one point is no lock)
    expect(locks.count).toBe(2);
    const { sc, geometry } = built(locks);
    expect(sc.vertexCount).toBe(9 * 4 + 4 * 3);
    expect(geometry.getIndex()!.count / 3).toBe(locks.triangleCount);
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < 9; i++) {
      // every section is as wide as the lock and square to the path: its edges differ only across it
      const dx = pos.getX(4 * i + 2) - pos.getX(4 * i), dy = pos.getY(4 * i + 2) - pos.getY(4 * i), dz = pos.getZ(4 * i + 2) - pos.getZ(4 * i);
      expect(Math.hypot(dx, dy, dz)).toBeCloseTo(0.01, 9);
      expect(Math.abs(dy) + Math.abs(dz)).toBeLessThan(1e-9);
    }
    for (let i = 0; i < pos.count * 3; i++) expect(Number.isFinite(pos.array[i])).toBe(true);
    // nothing added, nothing put
    const none = new Sculpt();
    new Locks().into(none);
    expect(none.vertexCount).toBe(0);
  });

  it("draws a smooth line through points", () => {
    const through = [new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(1, 1, 0), new Vector3(2, 1, 0)];
    const line = along(through, 13);
    expect(line).toHaveLength(13);
    // it passes through every point it was given, in order
    for (const [k, p] of [[0, 0], [4, 1], [8, 2], [12, 3]] as const) expect(line[k]!.distanceTo(through[p]!)).toBeLessThan(1e-9);
    // and between them it stays near: no step longer than a straight run would take, by much
    for (let k = 0; k + 1 < line.length; k++) expect(line[k]!.distanceTo(line[k + 1]!)).toBeLessThan(0.4);
    // two points: the straight line between them
    const two = along([new Vector3(0, 0, 0), new Vector3(0, 2, 0)], 5);
    expect(two[2]!.y).toBeCloseTo(1, 9);
    expect(two[2]!.x).toBeCloseTo(0, 9);
  });
});
