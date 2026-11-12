import { describe, expect, it } from "vitest";
import { Box3, Vector3, type Mesh } from "three";
import { drawnManikin, EquipmentManikinSchema, type DrawnManikin } from "@clinicalcraft/core";
import { LATERAL } from "./figure/anatomy.js";
import { MOVES } from "./figure/head.js";
import { rotateXZ } from "./geometry.js";
import { breathOf, buildManikin, manikinFigure, placedHeadPoint, placedPoint } from "./manikin.js";
import { buildPerson, PLAIN_WEAR, setBreath, type PersonRig } from "./npc.js";

/** A type's manikin as the world draws it with nothing changed by a state. */
const manikin = (patch: Record<string, unknown>): DrawnManikin => drawnManikin(EquipmentManikinSchema.parse(patch))!;
/** A patient simulator on its right side on a table flexed under the chest, as a thoracoscopy station has one. */
const ON_ITS_SIDE = manikin({ posture: "lateral", sideUp: "left", cover: "drapes", flex: 9, asleep: true, x: -0.27, z: -0.13, y: 0.93, rot: 90 });

function drawnBox(rig: PersonRig): Box3 {
  rig.root.updateMatrixWorld(true);
  const box = new Box3();
  rig.root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && m.userData.figure) box.union(new Box3().setFromObject(m, true));
  });
  return box;
}

describe("someone on their side, laid down by their rig (npc.ts)", () => {
  it("lies along −Z with the side that is up on top, the surface under the chest at the root", () => {
    for (const up of ["left", "right"] as const) {
      const sign = up === "left" ? 1 : -1;
      const rig = buildPerson(undefined, { posture: "lateral", surfaceY: 0.9, up, cover: "drapes", wear: { ...PLAIN_WEAR, cap: true } });
      // the figure's left is up (or down), its head towards −Z, its face to −X (the left side up) or +X
      const left = new Vector3(1, 0, 0).applyQuaternion(rig.body.quaternion), head = new Vector3(0, 1, 0).applyQuaternion(rig.body.quaternion);
      expect(left.y).toBeCloseTo(sign, 6);
      expect(head.z).toBeCloseTo(-1, 6);
      rig.root.updateMatrixWorld(true);
      expect(rig.head.getWorldDirection(new Vector3()).x).toBeCloseTo(-sign, 5);
      // where the table breaks under the chest: the root's origin, at the height of the surface
      const under = placedPoint(rig, [-sign * LATERAL.rest, LATERAL.break, LATERAL.shift]);
      expect(under.x).toBeCloseTo(0, 6);
      expect(under.y).toBeCloseTo(0.9, 6);
      expect(under.z).toBeCloseTo(0, 6);
      // the body is as long as a person and lies on the surface: the head end towards −Z, the sheet past the soles
      const box = drawnBox(rig);
      expect(box.min.z).toBeLessThan(-0.5);
      expect(box.min.z).toBeGreaterThan(-0.75);
      expect(box.max.z).toBeGreaterThan(1.25);
      expect(box.max.y).toBeGreaterThan(0.9 + 0.38); // the shoulder that is up
      expect(box.max.y).toBeLessThan(0.9 + 0.5);
      // the sheet hangs over both sides of the table, whose middle is under the root (the body lies back of it)
      expect(box.max.x).toBeGreaterThan(LATERAL.tableHalf);
      expect(box.min.x).toBeLessThan(-LATERAL.tableHalf);
      expect(placedPoint(rig, [0, LATERAL.break, 0]).x * sign).toBeCloseTo(LATERAL.shift, 6);
    }
  });

  it("asleep: the eyes are shut; over a flexed table the head end is lower and the head turned with it", () => {
    const flat = buildPerson(undefined, { posture: "lateral", surfaceY: 0.9, cover: "drapes" });
    const flexed = buildPerson(undefined, { posture: "lateral", surfaceY: 0.9, cover: "drapes", flex: 9, asleep: true });
    expect(flat.face.morphTargetInfluences![MOVES.blink]).toBe(0);
    expect(flexed.face.morphTargetInfluences![MOVES.blink]).toBe(1);
    expect(flat.bend).toBeNull();
    expect(flexed.bend).not.toBeNull();
    expect(flexed.head.rotation.z).toBeCloseTo((9 * Math.PI) / 180, 6);
    flat.root.updateMatrixWorld(true);
    flexed.root.updateMatrixWorld(true);
    const a = flat.head.getWorldPosition(new Vector3()), b = flexed.head.getWorldPosition(new Vector3());
    expect(b.y).toBeLessThan(a.y - 0.03);
    // the point under the chest has not moved
    expect(placedPoint(flexed, [-LATERAL.rest, LATERAL.break, LATERAL.shift]).y).toBeCloseTo(0.9, 6);
  });
});

describe("a body drawn with equipment (manikin.ts)", () => {
  it("is one of the world's figures: draped for theatre it wears a theatre cap and nothing else; each placement's is its own", () => {
    const a = manikinFigure(ON_ITS_SIDE, "station-1"), b = manikinFigure(ON_ITS_SIDE, "station-2");
    expect(a.options).toMatchObject({ posture: "lateral", up: "left", cover: "drapes", flex: 9, asleep: true, surfaceY: 0.93 });
    expect(a.options.wear).toEqual({ ...PLAIN_WEAR, cap: true });
    expect(a.options.seed).not.toBe(b.options.seed);
    // one that sits wears what its appearance says, and what describes one on its side is left out
    const sitting = manikinFigure(manikin({ posture: "sitting", y: 0.5, appearance: { gown: true } }), "chair");
    expect(sitting.options).toMatchObject({ posture: "sitting", surfaceY: 0.5, asleep: false });
    expect(sitting.options.wear).toEqual(PLAIN_WEAR);
    expect(sitting.options).not.toHaveProperty("cover");
    expect(sitting.appearance).toEqual({ gown: true });
    // the earlier spelling of the drapes is the same figure; under a blanket it is as bare, with a theatre cap on
    expect(manikinFigure(manikin({ posture: "lateral", draped: true, flex: 9, asleep: true, x: -0.27, z: -0.13, y: 0.93, rot: 90 }), "station-1").options).toEqual(a.options);
    const blanket = manikinFigure(manikin({ posture: "lateral", cover: "blanket" }), "s");
    expect(blanket.options).toMatchObject({ cover: "blanket", up: "left", flex: 0 });
    expect(blanket.options.wear).toEqual({ ...PLAIN_WEAR, cap: true });
    // one on its side in its own clothes keeps them
    expect(manikinFigure(manikin({ posture: "lateral" }), "s").options.wear).toEqual(PLAIN_WEAR);
  });

  it("breathes as its state says: not at all, with both lungs, or with the lung that is down only", () => {
    const still = manikin({ posture: "lateral", cover: "drapes" });
    expect(still.breathing).toBe("none");
    expect(breathOf(still, 1234)).toEqual([0, 0]);
    const both = manikin({ posture: "lateral", cover: "blanket", breathing: "both" }), one = manikin({ posture: "lateral", cover: "drapes", breathing: "one-lung" });
    // a ventilator's breath: five seconds, in over the first third, and the chest is never drawn in
    const depth = (m: DrawnManikin, t: number) => breathOf(m, t)[0], rise = (m: DrawnManikin, t: number) => breathOf(m, t)[1];
    expect(depth(both, 0)).toBeCloseTo(0, 6);
    expect(depth(both, 5000 / 3)).toBeCloseTo(0.024, 4);
    expect(depth(both, 5000)).toBeCloseTo(depth(both, 0), 3);
    for (let t = 0; t < 5000; t += 125) {
      expect(depth(both, t)).toBeGreaterThanOrEqual(0);
      expect(depth(both, t)).toBeLessThanOrEqual(0.0241);
      // one lung: half as deep, and the chest wall that is up hardly rises at all
      expect(depth(one, t)).toBeCloseTo(depth(both, t) / 2, 6);
      expect(rise(one, t)).toBeLessThanOrEqual(rise(both, t) / 4 + 1e-9);
    }
    // the chest wall that is up rises a millimetre at most (what a model puts on that skin stays on it)
    expect(rise(both, 5000 / 3)).toBeCloseTo(0.006, 4);
    expect(rise(both, 5000 / 3) * 0.17).toBeLessThan(0.0011);
    // each placement's manikin in its own time; one that lies on its back breathes forwards only
    expect(breathOf(both, 0, 0.5)).not.toEqual(breathOf(both, 0, 0));
    expect(breathOf(manikin({ posture: "lying", breathing: "both" }), 5000 / 3)[1]).toBe(0);

    // the rig takes it on its trunk — what lies on the chest (the towels) moves with it, the sheet on the legs does not
    const rig = buildManikin(both, { x: 0, y: 0, z: 0, rot: 0 }, "s");
    setBreath(rig, 0.02, 0.01);
    expect(rig.torso.scale.z).toBeCloseTo(1.02, 6);
    expect(rig.torso.scale.x).toBeCloseTo(1.01, 6);
    setBreath(rig, 0);
    expect(rig.torso.scale.toArray()).toEqual([1, 1, 1]);
  });

  it("is put where the type says, turned with its placement as the type's parts are", () => {
    const flat = buildManikin(ON_ITS_SIDE, { x: 0, y: 0, z: 0, rot: 0 }, "s");
    expect(flat.root.name).toBe("manikin");
    // in the type's frame: under the chest the middle of the table, the head towards −x, the face to the front (+z)
    const chest = placedPoint(flat, [-LATERAL.rest, LATERAL.break, LATERAL.shift]);
    expect(chest.x).toBeCloseTo(-0.27, 6);
    expect(chest.y).toBeCloseTo(0.93, 6);
    expect(chest.z).toBeCloseTo(-0.13, 6);
    const crown = placedHeadPoint(flat, [0, 0.18, 0]), mouth = placedHeadPoint(flat, [0, 0, 0.1]), joint = placedHeadPoint(flat, [0, 0, 0]);
    expect(crown.x).toBeLessThan(joint.x - 0.1);
    expect(mouth.z).toBeGreaterThan(joint.z + 0.05);
    // the left side is up: the upper shoulder is above the middle of the body
    expect(placedPoint(flat, [0.17, 1.386, 0]).y).toBeGreaterThan(placedPoint(flat, [0, 1.386, 0]).y + 0.1);

    // the placement turned and moved: every point of the body goes with it
    const at = { x: -16.3, y: 4.2, z: -9, rot: 90 };
    const placed = buildManikin(ON_ITS_SIDE, at, "s");
    for (const p of [[0, 1.2, 0], [0.17, 1.386, 0.2], [-0.1, 0.5, 0.1]] as const) {
      const local = placedPoint(flat, p), world = placedPoint(placed, p);
      const [wx, wz] = rotateXZ(local.x, local.z, at.rot);
      expect(world.x).toBeCloseTo(at.x + wx, 5);
      expect(world.y).toBeCloseTo(at.y + local.y, 5);
      expect(world.z).toBeCloseTo(at.z + wz, 5);
    }
  });

  it("one that stands is raised to what it stands on; one that sits or lies is at its seat or surface", () => {
    const standing = buildManikin(manikin({ posture: "standing", x: 0.2, y: 0.3 }), { x: 1, y: 2, z: 3, rot: 0 }, "p");
    expect(standing.root.position.toArray()).toEqual([1.2, 2.3, 3]);
    const lying = buildManikin(manikin({ posture: "lying", y: 0.7 }), { x: 1, y: 2, z: 3, rot: 0 }, "p");
    expect(lying.root.position.toArray()).toEqual([1, 2, 3]);
    const box = drawnBox(lying);
    expect(box.min.y).toBeGreaterThan(2.7 - 0.25); // the covers hang a little below the mattress's top
    expect(box.max.y).toBeLessThan(2.7 + 0.4);
  });
});
