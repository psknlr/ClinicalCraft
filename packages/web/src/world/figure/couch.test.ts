import { describe, expect, it } from "vitest";
import { Box3, Vector3, type BufferGeometry, type Mesh } from "three";
import { drawnManikin, EquipmentManikinSchema } from "@clinicalcraft/core";
import { ANKLE, FOREARM, frameOf, SHIN, SHOULDER, SHOULDER_X, skeletonOf, THIGH, UPPER_ARM } from "./anatomy.js";
import { trunkAt } from "./body.js";
import { buildFigure, type FigureSpec } from "./figure.js";
import { PLAIN } from "./wear.js";
import { breathOf, buildManikin, manikinFigure } from "../manikin.js";
import { buildPerson, type PersonRig } from "../npc.js";

/**
 * Someone flat on a treatment couch (docs/FACILITIES.md "A body drawn with equipment"): face down (`prone`) or on
 * their back, in their clothes or undressed under towels — bare skin where a treatment of the body's surface needs
 * it, a towel over the hips, and over the chest of someone on their back.
 */

const length = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
const F = frameOf("average", "adult");
const SPEC: FigureSpec = { skin: "#d9b596", hair: "#2b2420", hairStyle: "short", shirt: "#6d9fba", pants: "#354442", build: "average", stature: "adult", gown: false, accessory: "none", posture: "prone", seat: 0.62, wear: PLAIN };
const skinOf = (ranges: [number, number][]): number => ranges.reduce((n, [, count]) => n + count, 0);

function finite(g: BufferGeometry): boolean {
  for (const name of ["position", "normal", "color", "finish"]) {
    const a = g.getAttribute(name).array as Float32Array;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false;
  }
  return true;
}
function boxOf(g: BufferGeometry): Box3 {
  g.computeBoundingBox();
  return g.boundingBox!;
}
function drawnBox(rig: PersonRig): Box3 {
  rig.root.updateMatrixWorld(true);
  const box = new Box3();
  rig.root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && m.userData.figure) box.union(new Box3().setFromObject(m, true));
  });
  return box;
}

describe("someone face down (anatomy.ts: the prone position)", () => {
  const couch = trunkAt(1.3, F)[1] - 0.012;
  const sk = skeletonOf("prone", F, 0, "relaxed", 1, couch);

  it("keeps the bones their length: the legs straight, the feet on their insteps with the toes down the couch", () => {
    for (const arm of sk.arms) {
      expect(length(arm.root, arm.mid)).toBeCloseTo(UPPER_ARM, 3);
      expect(length(arm.mid, arm.end)).toBeCloseTo(FOREARM, 3);
    }
    for (const leg of sk.legs) {
      expect(Math.abs(length(leg.root, leg.mid) - THIGH)).toBeLessThan(0.005);
      expect(Math.abs(length(leg.mid, leg.end) - SHIN)).toBeLessThan(0.005);
      expect(leg.end[1]).toBeCloseTo(ANKLE, 6);
      // the instep towards the couch (in front of the body), the toes away from the head
      expect(leg.face[2]).toBeGreaterThan(0.95);
      expect(leg.along[1]).toBeLessThan(-0.95);
    }
    expect(sk.lift).toBe(0);
  });

  it("lays the arms along the trunk on the couch, clear of it, the palms up", () => {
    for (const arm of sk.arms) {
      // the hand on the couch (a hand's half-thickness above it), below the shoulder joint's level
      expect(arm.end[2]).toBeCloseTo(couch - 0.024, 6);
      expect(arm.end[2]).toBeGreaterThan(0.05);
      // beside the hip, a hand's breadth clear of the trunk
      expect(arm.end[0] - SHOULDER_X).toBeGreaterThan(0.09);
      expect(arm.end[1]).toBeLessThan(SHOULDER - UPPER_ARM - FOREARM + 0.05);
      // the palm away from the couch: up, once the body is laid on its front
      expect(arm.face[2]).toBeLessThan(-0.95);
    }
  });

  it("on their back under towels the arms lie on the couch too, the palms up — not on the covers of a bed", () => {
    const back = -(trunkAt(1.3, F)[2] - 0.012);
    const towelled = skeletonOf("lying", F, 0, "relaxed", 1, back);
    const inBed = skeletonOf("lying", F, 0, "relaxed");
    for (const arm of towelled.arms) {
      expect(arm.end[2]).toBeCloseTo(back + 0.024, 6);
      expect(arm.face[2]).toBeGreaterThan(0.95);
      expect(length(arm.root, arm.mid)).toBeCloseTo(UPPER_ARM, 3);
    }
    // in bed, as before: the hands on top of the covers, the palms down
    for (const arm of inBed.arms) {
      expect(arm.end[2]).toBeGreaterThan(0.05);
      expect(arm.face[2]).toBeLessThan(-0.95);
    }
  });
});

describe("flat on a treatment couch (figure.ts)", () => {
  it("face down under towels: bare skin on the trunk and the limbs, bare feet, one towel over the hips — and no bedclothes", () => {
    const dressed = buildFigure(SPEC);
    const towelled = buildFigure({ ...SPEC, cover: "towels" });
    for (const fig of [dressed, towelled]) for (const g of [fig.body, fig.chest, fig.head]) expect(finite(g)).toBe(true);
    // undressed: far more skin on the trunk and on the limbs
    expect(skinOf(towelled.skin.chest)).toBeGreaterThan(skinOf(dressed.skin.chest) * 1.5);
    // (the hands and the bare feet are most of a limb mesh's skin either way: the bare upper arms and legs add to it)
    expect(skinOf(towelled.skin.body)).toBeGreaterThan(skinOf(dressed.skin.body) * 1.1);
    // the feet are drawn (on a couch nobody is in shoes), toes past the ankles
    for (const fig of [dressed, towelled]) expect(boxOf(fig.body).min.y).toBeLessThan(ANKLE - 0.12);
    // the towel is on the back (−Z of the upright figure), over the hips only: nothing covers the trunk above the waist
    const back = trunkAt(0.9, F)[2];
    expect(boxOf(towelled.body).min.z).toBeLessThan(-back);
    expect(boxOf(towelled.body).min.z).toBeGreaterThan(-back - 0.04);
    expect(boxOf(towelled.chest).min.z).toBeGreaterThan(boxOf(towelled.body).min.z);
    expect(towelled.skeleton.posture).toBe("prone");
    expect(towelled.bend).toBeNull();
  });

  it("on their back under towels: a towel over the hips and one over the chest, the legs and the feet bare, no blanket", () => {
    const inBed = buildFigure({ ...SPEC, posture: "lying" });
    const towelled = buildFigure({ ...SPEC, posture: "lying", cover: "towels" });
    for (const g of [towelled.body, towelled.chest]) expect(finite(g)).toBe(true);
    // in bed the covers reach past the feet and hang over the mattress's edges: on the couch nothing does
    expect(boxOf(inBed.chest).min.y).toBeLessThan(0);
    expect(boxOf(towelled.chest).min.y).toBeGreaterThan(0.7);
    expect(boxOf(inBed.chest).max.x).toBeGreaterThan(0.33);
    expect(boxOf(towelled.chest).max.x).toBeLessThan(0.3);
    // the chest towel lies on the chest (it breathes with it): in front of the bare skin there
    expect(boxOf(towelled.chest).max.z).toBeGreaterThan(trunkAt(1.3, F)[1]);
    expect(boxOf(towelled.chest).max.z).toBeLessThan(trunkAt(1.3, F)[1] + 0.04);
    // bare legs and feet
    expect(skinOf(towelled.skin.body)).toBeGreaterThan(skinOf(inBed.skin.body) * 1.2);
    expect(boxOf(towelled.body).min.y).toBeLessThan(ANKLE);
  });

  it("a cover a posture does not take is its own clothes", () => {
    const same = (a: FigureSpec, b: FigureSpec) => expect(buildFigure(a).triangles).toBe(buildFigure(b).triangles);
    same({ ...SPEC, posture: "standing", cover: "towels" }, { ...SPEC, posture: "standing" });
    same({ ...SPEC, posture: "sitting", cover: "towels" }, { ...SPEC, posture: "sitting" });
    same({ ...SPEC, posture: "lateral", cover: "towels" }, { ...SPEC, posture: "lateral" });
    same({ ...SPEC, posture: "prone", cover: "drapes" }, SPEC);
    same({ ...SPEC, posture: "lying", cover: "blanket" }, { ...SPEC, posture: "lying" });
  });

  it("every build lies on the couch under its towels", () => {
    for (const build of ["slim", "average", "heavy"] as const) {
      for (const posture of ["prone", "lying"] as const) {
        const fig = buildFigure({ ...SPEC, build, posture, cover: "towels" });
        for (const g of [fig.body, fig.chest]) expect(finite(g), `${build} ${posture}`).toBe(true);
        expect(fig.triangles).toBeLessThan(40_000);
      }
    }
  });
});

describe("laid down by their rig (npc.ts) and drawn with equipment (manikin.ts)", () => {
  it("face down: the back up, the head towards −Z, their left to −X, the chest on the surface", () => {
    const surface = 0.62;
    const rig = buildPerson(undefined, { posture: "prone", surfaceY: surface, cover: "towels" });
    const up = new Vector3(0, 0, -1).applyQuaternion(rig.body.quaternion), head = new Vector3(0, 1, 0).applyQuaternion(rig.body.quaternion), left = new Vector3(1, 0, 0).applyQuaternion(rig.body.quaternion);
    expect(up.y).toBeCloseTo(1, 6);
    expect(head.z).toBeCloseTo(-1, 6);
    expect(left.x).toBeCloseTo(-1, 6);
    const box = drawnBox(rig);
    // on the surface (the chest sinks a little into the mattress; the face goes into the couch's hole), not through it
    expect(box.min.y).toBeGreaterThan(surface - 0.06);
    expect(box.max.y).toBeLessThan(surface + 0.3);
    expect(box.max.z - box.min.z).toBeGreaterThan(1.7);
    expect(box.max.z - box.min.z).toBeLessThan(2.05);
    rig.root.updateMatrixWorld(true);
    expect(rig.head.getWorldPosition(new Vector3()).z).toBeLessThan(-0.45);
    expect(rig.tagY).toBeGreaterThan(box.max.y);
    expect(rig.posture).toBe("prone");
  });

  it("a manikin on a couch: under towels it wears no theatre cap; it breathes with both lungs; its cover follows its posture", () => {
    const m = drawnManikin(EquipmentManikinSchema.parse({ posture: "prone", cover: "towels", breathing: "both", y: 0.62, appearance: { hairStyle: "bun" } }))!;
    const drawn = manikinFigure(m, "couch-1");
    expect(drawn.options).toMatchObject({ posture: "prone", cover: "towels", surfaceY: 0.62 });
    expect(drawn.options.wear!.cap).toBe(false);
    expect(drawn.options).not.toHaveProperty("up");
    // on its side under a blanket it is in theatre: a cap
    expect(manikinFigure(drawnManikin(EquipmentManikinSchema.parse({ posture: "lateral", cover: "blanket" }))!, "t").options.wear!.cap).toBe(true);
    // in its clothes nothing is said of a cover
    expect(manikinFigure(drawnManikin(EquipmentManikinSchema.parse({ posture: "prone" }))!, "t").options).not.toHaveProperty("cover");
    const [depth, rise] = breathOf(m, 800);
    expect(depth).toBeGreaterThan(0);
    expect(rise).toBe(0);
    // what a model stands on the skin that is up — a mark, a needle — does not move with it: that skin rises by a
    // millimetre at most, face down (the back) and on the back under towels (the front); in bed a chest moves freely
    const deepest = (posture: "prone" | "lying", cover?: "towels") => {
      const body = drawnManikin(EquipmentManikinSchema.parse({ posture, cover, breathing: "both" }))!;
      return Math.max(...Array.from({ length: 50 }, (_, i) => breathOf(body, i * 100)[0]));
    };
    const [, front, back] = trunkAt(1.3, F);
    expect(deepest("prone") * back).toBeLessThanOrEqual(0.0011);
    expect(deepest("prone") * back).toBeGreaterThan(0.0005);
    expect(deepest("lying", "towels") * front).toBeLessThanOrEqual(0.0012);
    expect(deepest("lying") * front).toBeGreaterThan(0.002);
    const rig = buildManikin(m, { x: 3, y: 0, z: -2, rot: 90 }, "couch-1");
    expect(rig.root.name).toBe("manikin");
    expect(rig.root.position.x).toBeCloseTo(3, 6);
    expect(rig.root.rotation.y).toBeCloseTo(Math.PI / 2, 6);
  });
});
