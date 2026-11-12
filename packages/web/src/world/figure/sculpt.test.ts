import { describe, expect, it } from "vitest";
import { Matrix4, Vector3, type BufferGeometry } from "three";
import { Sculpt, type Paint } from "./sculpt.js";

const RED: Paint = { rgb: [1, 0, 0], gloss: 0.3, glow: 0.1 };
const BLUE: Paint = { rgb: [0, 0, 1] };

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

describe("the sculpting kit (sculpt.ts)", () => {
  it("takes a cast of what it holds and puts it into another, tags and all, after whatever is there", () => {
    const made = new Sculpt();
    made.tagged("skin", () => made.ball([0, 0.1, 0], 0.03, 0.04, 0.03, RED, 10, 6));
    made.box([0.1, 0, 0], 0.02, 0.02, 0.02, BLUE);
    const cast = made.cast();
    expect(cast.position).toHaveLength(made.vertexCount * 3);
    expect(cast.index).toHaveLength(made.triangleCount * 3);
    expect(cast.tags.skin).toEqual(made.ranges("skin"));

    const into = new Sculpt();
    into.box([0, 0, 0], 0.01, 0.01, 0.01, BLUE);
    const before = into.vertexCount, trianglesBefore = into.triangleCount;
    expect(into.put(cast)).toBe(before);
    expect(into.vertexCount).toBe(before + made.vertexCount);
    expect(into.triangleCount).toBe(trianglesBefore + made.triangleCount);
    expect(into.ranges("skin")).toEqual(made.ranges("skin").map(([start, count]) => [start + before, count]));
    const a = made.geometry(), b = into.geometry();
    for (const [name, size] of [["position", 3], ["normal", 3], ["color", 3], ["finish", 2]] as const) {
      const from = a.getAttribute(name).array as Float32Array, to = b.getAttribute(name).array as Float32Array;
      expect(Array.from(to.subarray(before * size))).toEqual(Array.from(from));
    }
    expect(Array.from(b.getIndex()!.array).slice(trianglesBefore * 3)).toEqual(Array.from(a.getIndex()!.array).map((v) => v + before));
    // taking a cast leaves what it was taken from alone, and a cast is its own
    cast.position[0] = 99;
    expect(made.geometry().getAttribute("position").getX(0)).not.toBe(99);
  });

  it("puts a cast in colours of the figure's own, and in the frame it is put in", () => {
    const made = new Sculpt();
    made.ball([0.05, 0, 0], 0.02, 0.02, 0.02, RED, 10, 6);
    const cast = made.cast();
    const colour = new Float32Array(cast.colour.length).fill(0.25);
    const into = new Sculpt();
    into.put(cast, colour);
    const g = into.geometry();
    expect(Array.from(g.getAttribute("color").array as Float32Array).every((v) => v === 0.25)).toBe(true);
    expect(Array.from(g.getAttribute("finish").array as Float32Array)).toEqual(Array.from(cast.finish));
    // moved and mirrored: where the frame puts it, its faces still outward
    const mirrored = new Sculpt();
    mirrored.within(new Matrix4().makeScale(-1, 1, 1).setPosition(0, 0.5, 0), () => mirrored.put(cast));
    const m = mirrored.geometry();
    m.computeBoundingBox();
    expect(m.boundingBox!.min.x).toBeCloseTo(-0.07, 6);
    expect(m.boundingBox!.max.y).toBeCloseTo(0.52, 6);
    expect(volumeOf(m)).toBeGreaterThan(0);
    expect(volumeOf(m)).toBeCloseTo(volumeOf(made.geometry()), 9);
  });

  it("gives a sheet a thickness that may differ over it, down to none at an edge", () => {
    const even = new Sculpt(), thinning = new Sculpt();
    const at = (i: number, j: number): [number, number, number] => [i * 0.01, j * 0.01, 0];
    even.sheet(5, 4, at, RED, { thickness: 0.004 });
    thinning.sheet(5, 4, at, RED, { thickness: (_i, j) => 0.004 * (1 - j / 3) });
    expect(thinning.vertexCount).toBe(even.vertexCount);
    expect(thinning.triangleCount).toBe(even.triangleCount);
    const a = even.geometry().getAttribute("position"), b = thinning.geometry().getAttribute("position");
    // the second face lies behind the first: everywhere as far, or less and less up the sheet
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 5; i++) {
        const k = 20 + j * 5 + i;
        expect(Math.abs(a.getZ(k))).toBeCloseTo(0.004, 9);
        expect(Math.abs(b.getZ(k))).toBeCloseTo(0.004 * (1 - j / 3), 9);
      }
    }
    expect(volumeOf(even.geometry())).toBeCloseTo(0.04 * 0.03 * 0.004, 9);
    expect(volumeOf(thinning.geometry())).toBeCloseTo((0.04 * 0.03 * 0.004) / 2, 9);
  });

  it("takes a mesh made elsewhere, remembering ranges of its points under tags of their own", () => {
    const sc = new Sculpt();
    sc.box([0, 0, 0], 0.01, 0.01, 0.01, BLUE);
    const before = sc.vertexCount;
    sc.tagged("skin", () => sc.mesh([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3], [RED, RED, BLUE, BLUE], { lid: [[2, 2]], none: [[0, 0]] }));
    expect(sc.ranges("skin")).toEqual([[before, 4]]);
    expect(sc.ranges("lid")).toEqual([[before + 2, 2]]);
    expect(sc.ranges("none")).toEqual([]);
    const g = sc.geometry();
    expect(g.getAttribute("color").getX(before)).toBe(1);
    expect(g.getAttribute("color").getZ(before + 3)).toBe(1);
    expect(g.getAttribute("finish").getX(before)).toBeCloseTo(0.3, 6);
  });
});
