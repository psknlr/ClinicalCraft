import { describe, expect, it } from "vitest";
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { FOREARM, frameOf, LATERAL, SHIN, SHOULDER, skeletonOf, THIGH, UPPER_ARM, type Limb } from "./anatomy.js";
import { bendGeometry, bendPoint, type SideBend } from "./bend.js";
import { buildFigure, type FigureSpec } from "./figure.js";
import { PLAIN } from "./wear.js";

const length = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
const F = frameOf("average", "adult");

const SPEC: FigureSpec = { skin: "#d9b596", hair: "#2b2420", hairStyle: "short", shirt: "#6d9fba", pants: "#354442", build: "average", stature: "adult", gown: false, accessory: "none", posture: "lateral", seat: 0.9, wear: { ...PLAIN, cap: true } };
/** How much of a mesh is skin (vertices in its skin ranges). */
const skinOf = (ranges: [number, number][]): number => ranges.reduce((n, [, count]) => n + count, 0);

function finite(g: BufferGeometry): boolean {
  for (const name of ["position", "normal", "color", "finish"]) {
    const a = g.getAttribute(name).array as Float32Array;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false;
  }
  return true;
}

describe("someone on their side (anatomy.ts: the lateral position)", () => {
  it("keeps the bones their length, the leg underneath bent and the upper one nearly straight — whichever side is up", () => {
    for (const up of [1, -1] as const) {
      const sk = skeletonOf("lateral", F, 0, "relaxed", up);
      expect(sk.up).toBe(up);
      for (const arm of sk.arms) {
        expect(length(arm.root, arm.mid)).toBeCloseTo(UPPER_ARM, 3);
        expect(length(arm.mid, arm.end)).toBeCloseTo(FOREARM, 3);
      }
      for (const leg of sk.legs) {
        expect(Math.abs(length(leg.root, leg.mid) - THIGH)).toBeLessThan(0.01);
        expect(Math.abs(length(leg.mid, leg.end) - SHIN)).toBeLessThan(0.01);
      }
      // limbs are held as [left, right]: the side that is up has the straight leg and the arm on the support
      const [over, under]: [Limb, Limb] = up === 1 ? [sk.legs[0], sk.legs[1]] : [sk.legs[1], sk.legs[0]];
      expect(under.mid[2]).toBeGreaterThan(0.24); // the knee well forward: hip and knee bent
      expect(under.mid[2]).toBeLessThan(LATERAL.tableHalf + LATERAL.shift - 0.05); // and still on the table
      expect(over.mid[2]).toBeLessThan(0.12);
      expect(under.end[2]).toBeLessThan(0.1); // the shin back under the thigh
    }
  });

  it("puts the arm underneath out in front on its board and the upper arm forward over it, neither beyond a right angle with the trunk", () => {
    const sk = skeletonOf("lateral", F, 0, "relaxed", 1);
    const [upper, lower] = sk.arms;
    for (const arm of [upper, lower]) {
      // forward of the trunk, the hand a forearm and more in front of the shoulder
      expect(arm.end[2]).toBeGreaterThan(0.45);
      // not raised towards the head beyond a right angle: the elbow no higher than the shoulder (a little, at most)
      expect(arm.mid[1] - SHOULDER).toBeLessThan(0.05);
      expect(arm.end[1] - SHOULDER).toBeLessThan(0.14);
    }
    // the palm of the arm underneath is up (towards the body's middle: −x of a left limb), the upper palm down on its pad
    expect(lower.face[0]).toBeLessThan(-0.9);
    expect(upper.face[0]).toBeLessThan(-0.9);
    // the shoulder underneath is drawn forward from under the trunk
    expect(lower.root[2]).toBeGreaterThan(0.02);
    expect(upper.root[2]).toBe(0);
    // the right side up: the same two arms the other way round
    const other = skeletonOf("lateral", F, 0, "relaxed", -1);
    expect(other.arms[0]).toEqual(lower);
    expect(other.arms[1]).toEqual(upper);
  });
});

describe("the trunk over the break of a flexed table (bend.ts)", () => {
  const B: SideBend = { at: 1.2, span: 0.17, angle: (9 * Math.PI) / 180, up: 1 };

  it("leaves the middle where it is and takes both ends down, turned by the table's angle", () => {
    expect(bendPoint({ ...B, angle: 0 }, 0.1, 1.6)).toEqual({ x: 0.1, y: 1.6, turn: 0 });
    const mid = bendPoint(B, 0, 1.2);
    expect(mid.x).toBeCloseTo(0, 9);
    expect(mid.y).toBeCloseTo(1.2, 9);
    expect(mid.turn).toBeCloseTo(0, 9);
    const head = bendPoint(B, 0, 1.7), feet = bendPoint(B, 0, 0.1);
    expect(head.x).toBeLessThan(-0.05);
    expect(feet.x).toBeLessThan(-0.12);
    expect(head.turn).toBeCloseTo(B.angle, 9);
    expect(feet.turn).toBeCloseTo(-B.angle, 9);
    // the other side up: the ends go the other way
    const right = bendPoint({ ...B, up: -1 }, 0, 1.7);
    expect(right.x).toBeCloseTo(-head.x, 9);
    expect(right.turn).toBeCloseTo(-head.turn, 9);
  });

  it("keeps the middle line its length, opens the side that is up and closes the one underneath", () => {
    let along = 0;
    let last = bendPoint(B, 0, 0.9);
    for (let y = 0.91; y <= 1.5 + 1e-9; y += 0.01) {
      const p = bendPoint(B, 0, y);
      along += Math.hypot(p.x - last.x, p.y - last.y);
      last = p;
    }
    expect(along).toBeCloseTo(0.6, 3);
    const across = (x: number) => {
      const a = bendPoint(B, x, 1.03), b = bendPoint(B, x, 1.37);
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    expect(across(0.16)).toBeGreaterThan(0.34 + 0.04); // the spaces between the ribs of the upper side open
    expect(across(-0.16)).toBeLessThan(0.34 - 0.04);
    // no step where the arc ends
    const before = bendPoint(B, 0.1, 1.2 + B.span - 1e-6), after = bendPoint(B, 0.1, 1.2 + B.span + 1e-6);
    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(1e-5);
  });

  it("bends a geometry: its points and its normals, which stay of unit length", () => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute([0.1, 1.7, 0.05, -0.1, 0.4, -0.05, 0, 1.2, 0], 3));
    g.setAttribute("normal", new Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
    bendGeometry(g, B);
    const p = g.getAttribute("position"), n = g.getAttribute("normal");
    const at = bendPoint(B, 0.1, 1.7);
    expect(p.getX(0)).toBeCloseTo(at.x, 6);
    expect(p.getY(0)).toBeCloseTo(at.y, 6);
    expect(p.getZ(0)).toBeCloseTo(0.05, 6);
    for (let i = 0; i < 3; i++) expect(new Vector3(n.getX(i), n.getY(i), n.getZ(i)).length()).toBeCloseTo(1, 6);
    // a normal that looked to the figure's left at the head end looks a little towards the head now
    expect(n.getY(0)).toBeCloseTo(Math.sin(B.angle), 6);
    expect(n.getZ(2)).toBeCloseTo(1, 6);
  });
});

describe("a figure on its side (figure.ts)", () => {
  it("draped for an operation on the chest: bare skin on the trunk and both arms, towels and a sheet, no feet to see", () => {
    const draped = buildFigure({ ...SPEC, cover: "drapes" });
    const clothed = buildFigure({ ...SPEC, gown: true });
    for (const fig of [draped, clothed]) {
      expect(finite(fig.body)).toBe(true);
      expect(finite(fig.chest)).toBe(true);
      expect(fig.triangles).toBeLessThan(36000);
    }
    // the whole trunk is skin under the drapes (a gown shows it at the neck only), and the arms are bare from the shoulder
    expect(skinOf(draped.skin.chest)).toBeGreaterThan(3 * skinOf(clothed.skin.chest));
    expect(skinOf(draped.skin.body)).toBeGreaterThan(skinOf(clothed.skin.body) * 0.9);
    // the towels round the field lie on the trunk's mesh, and breathe with it: more of it than a bare trunk is
    expect(draped.chest.getAttribute("position").count).toBeGreaterThan(skinOf(draped.skin.chest) + 250);
    // the sheet lies on the legs (it does not breathe): it reaches past the soles and hangs below the surface the body lies on
    draped.body.computeBoundingBox();
    const box = draped.body.boundingBox!;
    expect(box.min.y).toBeLessThan(LATERAL.foot + 0.01);
    expect(box.min.x).toBeLessThan(-LATERAL.rest - 0.25);
    expect(box.max.z).toBeGreaterThan(LATERAL.shift + LATERAL.tableHalf);
    expect(box.min.z).toBeLessThan(LATERAL.shift - LATERAL.tableHalf);
    // the trunk's own mesh stays on the table: nothing of it hangs over the side
    draped.chest.computeBoundingBox();
    expect(draped.chest.boundingBox!.min.x).toBeGreaterThan(-LATERAL.rest - 0.05);
  });

  it("under a blanket before the drapes go on: as bare, no towels, a blanket to the waist that hangs less far than the sheet", () => {
    const draped = buildFigure({ ...SPEC, cover: "drapes" }), blanket = buildFigure({ ...SPEC, cover: "blanket" });
    expect(finite(blanket.body)).toBe(true);
    expect(skinOf(blanket.skin.chest)).toBe(skinOf(draped.skin.chest));
    // no towels: the trunk's mesh is skin and nothing else
    expect(blanket.chest.getAttribute("position").count).toBe(skinOf(blanket.skin.chest));
    expect(blanket.chest.getAttribute("position").count).toBeLessThan(draped.chest.getAttribute("position").count - 250);
    blanket.body.computeBoundingBox();
    draped.body.computeBoundingBox();
    const b = blanket.body.boundingBox!, d = draped.body.boundingBox!;
    // it covers hips and legs past the soles, and hangs a hand's breadth over the table's side — the sheet far lower
    expect(b.min.y).toBeLessThan(LATERAL.foot + 0.01);
    expect(b.min.x).toBeLessThan(-LATERAL.rest - 0.1);
    expect(b.min.x).toBeGreaterThan(d.min.x + 0.12);
    // someone in their own clothes on their side has neither
    expect(buildFigure({ ...SPEC, cover: "clothes" }).triangles).toBe(buildFigure({ ...SPEC }).triangles);
  });

  it("the right side up is the mirror of the left side up", () => {
    const left = buildFigure({ ...SPEC, cover: "drapes", up: "left" }), right = buildFigure({ ...SPEC, cover: "drapes", up: "right" });
    left.chest.computeBoundingBox();
    right.chest.computeBoundingBox();
    expect(right.chest.boundingBox!.max.x).toBeCloseTo(-left.chest.boundingBox!.min.x, 3);
    expect(right.chest.boundingBox!.min.x).toBeCloseTo(-left.chest.boundingBox!.max.x, 3);
    expect(right.triangles).toBe(left.triangles);
  });

  it("over a flexed table the figure is bent and its head turned with its end of the trunk", () => {
    const flat = buildFigure({ ...SPEC, cover: "drapes" });
    const flexed = buildFigure({ ...SPEC, cover: "drapes", flex: (9 * Math.PI) / 180 });
    expect(flat.bend).toBeNull();
    expect(flat.pivotTurn).toBe(0);
    expect(flexed.bend).toMatchObject({ at: LATERAL.break, up: 1 });
    expect(flexed.pivotTurn).toBeCloseTo((9 * Math.PI) / 180, 6);
    expect(flexed.pivot[0]).toBeLessThan(flat.pivot[0] - 0.03); // the head end has gone down (the left side is up: down is −x)
    flat.body.computeBoundingBox();
    flexed.body.computeBoundingBox();
    expect(flexed.body.boundingBox!.min.x).toBeLessThan(flat.body.boundingBox!.min.x - 0.05);
    // a figure that is not on its side is never bent
    expect(buildFigure({ ...SPEC, posture: "lying", flex: 0.2 }).bend).toBeNull();
  });
});
