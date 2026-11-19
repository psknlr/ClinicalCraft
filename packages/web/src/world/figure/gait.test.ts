import { describe, expect, it } from "vitest";
import { Mesh, Vector3 } from "three";
import { buildPerson, PATIENT_WEAR, uniformOf } from "../npc.js";

describe("the feet of a walking figure", () => {
  for (const stature of ["adult", "child"] as const) {
    it(`plants alternating soles, lifting the swing foot to clear the floor (${stature})`, () => {
      const rig = buildPerson({ stature, gown: true }, { posture: "standing", wear: PATIENT_WEAR });
      const gait = rig.gait!;
      const limbs = rig.body.children[0] as Mesh;
      const pos = limbs.geometry.getAttribute("position");
      // Pick a sole vertex on each actual shoe and measure its morphed world position.
      const lowest = (side: number) => {
        let index = -1;
        for (let i = 0; i < pos.count; i++) {
          if (side * pos.getX(i) > 0 && (index < 0 || pos.getY(i) < pos.getY(index))) index = i;
        }
        return index;
      };
      const left = lowest(1), right = lowest(-1);
      const foot = (i: number) => limbs.localToWorld(limbs.getVertexPosition(i, new Vector3()));
      const soleY = foot(left).y;
      let travel = 0;
      function walk(metres: number) {
        travel += metres;
        rig.root.position.z = travel;
        gait.advance(metres, metres / 1.5);
      }
      gait.advance(0, 1);
      expect(limbs.geometry.morphAttributes.position).toBeUndefined();
      const quarter = 0.29 * rig.scale * rig.frame.legs;
      walk(4 * quarter);
      const landed = foot(left);
      walk(quarter);
      expect(foot(left).z).toBeCloseTo(landed.z, 5);
      expect(foot(left).y).toBeCloseTo(soleY, 5);
      expect(foot(right).y - soleY).toBeGreaterThan(0.06 * rig.scale);
      walk(quarter);
      const exchanged = foot(right);
      expect(exchanged.y).toBeCloseTo(soleY, 5);
      walk(quarter);
      expect(foot(right).z).toBeCloseTo(exchanged.z, 5);
      expect(foot(left).y - soleY).toBeGreaterThan(0.06 * rig.scale);
      expect(rig.torso.geometry.morphAttributes.normal).toHaveLength(4);
      expect(rig.torso.geometry.morphAttributes.position![2]!.array.some(v => Math.abs(v) > 0.04)).toBe(true);
      // At a stop the chest, clothes and legs settle while both soles meet the floor again.
      gait.advance(0, 0.2);
      expect(limbs.morphTargetInfluences).toEqual([0, 0, 0, 0, 0, 0]);
      expect(rig.torso.morphTargetInfluences).toEqual([0, 0, 0, 0]);
      expect(foot(left).y).toBeCloseTo(soleY, 6);
      expect(foot(right).y).toBeCloseTo(soleY, 6);
    });
  }

  it("swings free arms in opposition, and keeps hands still on a trolley or in a sling", () => {
    for (const slung of [false, true]) {
      const r = buildPerson({ accessory: slung ? "sling" : "none" }, { posture: "standing" });
      const limbs = r.body.children[0] as Mesh;
      const pos = limbs.geometry.getAttribute("position");
      for (const pushing of [false, true]) {
        r.gait!.rest();
        r.gait!.advance(1.16, 0.5, Infinity, !pushing);
        const v = new Vector3();
        let left = 0, right = 0, sling = 0;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          if (y < 0.96 || y > 1.25) continue;
          const dz = limbs.getVertexPosition(i, v).z - z;
          if (pushing) expect(dz).toBe(0);
          if (slung && z > 0.13) {
            expect(dz).toBe(0);
            sling++;
          }
          if (x > 0 && dz < -0.01) left++;
          if (x < 0 && dz > 0.01) right++;
        }
        expect(left > 0).toBe(!slung && !pushing);
        expect(right > 0).toBe(!pushing);
        if (slung) expect(sling).toBeGreaterThan(100);
      }
    }
  });

  it("keeps a sterile team's hands clasped, and leaves the rig on a trolley in its lying pose", () => {
    const r = buildPerson(undefined, { posture: "standing", wear: uniformOf("nurse", "scrub-nurse").wear });
    const limbs = r.body.children[0] as Mesh;
    r.gait!.advance(0.45, 0.25);
    const pos = limbs.geometry.getAttribute("position");
    const v = new Vector3(), p = new Vector3();
    let held = 0;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      if (p.y > 1 && p.z > 0.15) {
        expect(limbs.getVertexPosition(i, v).distanceTo(p)).toBe(0);
        held++;
      }
    }
    expect(held).toBeGreaterThan(100);
    expect(buildPerson(undefined, { posture: "lying", surfaceY: 0.9 }).gait).toBeNull();
  });
});
