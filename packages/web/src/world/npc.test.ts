import { describe, expect, it } from "vitest";
import { Box3, Group, type BufferAttribute, type Mesh } from "three";
import { buildPerson, disposeRig, heightOf, looksOf, PATIENT_WEAR, PERSON_HEIGHT, ROLE_UNIFORMS, setBlink, setBreath, setDistressed, setMouth, STATURE_SCALE, uniformOf, type AppearanceLike, type PersonRig } from "./npc.js";

/** The drawn meshes of a rig (not the unseen aim box). */
function meshes(rig: PersonRig): Mesh[] {
  const out: Mesh[] = [];
  rig.root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && m.userData.figure) out.push(m);
  });
  return out;
}

/** The box round what is drawn of a rig, in its root's frame. */
function drawnBox(rig: PersonRig): Box3 {
  rig.root.updateMatrixWorld(true);
  const box = new Box3();
  for (const m of meshes(rig)) box.union(new Box3().setFromObject(m, true));
  return box;
}

function finite(rig: PersonRig): boolean {
  return meshes(rig).every((m) => {
    for (const name of ["position", "normal", "color", "finish"]) {
      const a = m.geometry.getAttribute(name).array as Float32Array;
      for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) return false;
    }
    return true;
  });
}

const POSITIONS = ["surgeon", "assistant-surgeon", "anaesthetist", "scrub-nurse", "circulating-nurse", "ward-nurse", "recovery-nurse", "theatre-coordinator", "physician", "educator", "radiologist", "radiographer", "pathologist", "lab-technician", "transfusion-scientist", "pharmacist", "receptionist", "porter", "paramedic"];

describe("people of the world (npc.ts)", () => {
  it("a standing adult is of real size: feet on the floor, the head at 1.74 m, three meshes of one material", () => {
    const rig = buildPerson(undefined, { posture: "standing" });
    const box = drawnBox(rig);
    expect(box.min.y).toBeGreaterThan(-0.005);
    expect(box.min.y).toBeLessThan(0.01);
    expect(box.max.y).toBeGreaterThan(PERSON_HEIGHT - 0.06);
    expect(box.max.y).toBeLessThan(PERSON_HEIGHT + 0.05);
    expect(box.max.x - box.min.x).toBeLessThan(0.62);
    const drawn = meshes(rig);
    expect(drawn).toHaveLength(3);
    expect(new Set(drawn.map((m) => m.material)).size).toBe(1);
    expect(finite(rig)).toBe(true);
    // the head group turns about the top of the neck, a little below the chin's height
    expect(rig.headBaseY).toBeGreaterThan(1.5);
    expect(rig.headBaseY).toBeLessThan(1.62);
    expect(rig.tagY).toBeGreaterThan(box.max.y);
  });

  it("every role and every position builds, within a triangle budget, and wears what the job wears", () => {
    for (const role of Object.keys(ROLE_UNIFORMS)) {
      for (const position of [undefined, ...POSITIONS]) {
        const uni = uniformOf(role, position);
        const id = `${role}-${position ?? "none"}`;
        const rig = buildPerson({ ...looksOf(id), shirt: uni.shirt, pants: uni.pants }, { posture: "standing", wear: uni.wear, seed: id, height: heightOf(id) });
        expect(finite(rig), id).toBe(true);
        expect(rig.triangles, id).toBeGreaterThan(6000);
        expect(rig.triangles, id).toBeLessThan(24000);
        disposeRig(rig);
      }
    }
    // nobody wears a white coat in theatre; whoever is scrubbed is gowned and gloved with their hands held in front
    for (const position of ["surgeon", "assistant-surgeon", "scrub-nurse"]) {
      const wear = uniformOf(position === "scrub-nurse" ? "nurse" : "attending", position).wear;
      expect(wear).toMatchObject({ over: "sterile", gloves: true, cap: true, mask: true, hands: "clasped", stethoscope: false });
    }
    for (const position of ["anaesthetist", "circulating-nurse"]) {
      const wear = uniformOf(position === "anaesthetist" ? "attending" : "nurse", position).wear;
      expect(wear).toMatchObject({ over: "none", top: "scrub", cap: true, mask: true });
    }
    expect(uniformOf("attending").wear).toMatchObject({ over: "coat", stethoscope: true });
    expect(uniformOf("attending", "physician").wear).toMatchObject({ over: "coat", stethoscope: true });
    expect(uniformOf("nurse").wear).toMatchObject({ over: "none", top: "scrub", watch: true, stethoscope: false });
    // an unknown role still dresses someone
    expect(uniformOf("visitor").wear.top).toBe("shirt");
  });

  it("statures, builds, hair styles and accessories all build", () => {
    const heights: number[] = [];
    for (const stature of ["infant", "child", "teen", "adult"] as const) {
      const rig = buildPerson({ stature }, { posture: "standing" });
      expect(rig.scale).toBe(STATURE_SCALE[stature]);
      heights.push(drawnBox(rig).max.y);
      expect(finite(rig)).toBe(true);
    }
    expect(heights[0]!).toBeLessThan(heights[1]!);
    expect(heights[1]!).toBeLessThan(heights[2]!);
    expect(heights[2]!).toBeLessThan(heights[3]!);
    expect(heights[0]!).toBeGreaterThan(0.6);
    const widths = (["slim", "average", "heavy"] as const).map((build) => {
      const b = drawnBox(buildPerson({ build }, { posture: "standing" }));
      return b.max.z - b.min.z;
    });
    expect(widths[0]!).toBeLessThan(widths[2]!);
    for (const hairStyle of ["short", "long", "bald", "bun", "ponytail", "curly"] as const) expect(finite(buildPerson({ hairStyle }, { posture: "standing" })), hairStyle).toBe(true);
    for (const accessory of ["none", "glasses", "mask", "nasal-cannula", "oxygen-mask", "sling", "cap"] as const) {
      const rig = buildPerson({ accessory, gown: true }, { posture: "standing", wear: PATIENT_WEAR });
      expect(finite(rig), accessory).toBe(true);
      // only an oxygen mask adds a see-through part
      expect(meshes(rig).length, accessory).toBe(accessory === "oxygen-mask" ? 4 : 3);
    }
    // an appearance that leaves a field undefined falls back to the default, not to nothing
    expect(finite(buildPerson({ hairStyle: undefined, shirt: undefined } as AppearanceLike, { posture: "standing" }))).toBe(true);
  });

  it("sitting puts the thighs on the seat and the feet on the floor; a child on the same seat lets them hang", () => {
    const adult = buildPerson({ gown: true }, { posture: "sitting", surfaceY: 0.5, wear: PATIENT_WEAR });
    const box = drawnBox(adult);
    expect(box.min.y).toBeGreaterThan(-0.01);
    expect(box.min.y).toBeLessThan(0.03);
    expect(box.max.y).toBeGreaterThan(1.25);
    expect(box.max.y).toBeLessThan(1.45);
    expect(box.max.z).toBeGreaterThan(0.45);
    const child = buildPerson({ stature: "child" }, { posture: "sitting", surfaceY: 0.5 });
    expect(drawnBox(child).min.y).toBeGreaterThan(0.1);
  });

  it("lying lays the figure on the mattress: head towards −Z, nothing under the bed, the covers low over it", () => {
    const surface = 0.62;
    const rig = buildPerson({ gown: true }, { posture: "lying", surfaceY: surface, wear: PATIENT_WEAR });
    const box = drawnBox(rig);
    rig.root.updateMatrixWorld(true);
    const head = rig.head.getWorldPosition(rig.head.position.clone());
    expect(head.z).toBeLessThan(-0.45);
    expect(head.y).toBeGreaterThan(surface);
    expect(head.y).toBeLessThan(surface + 0.3);
    expect(box.max.y).toBeLessThan(surface + 0.42);
    // the covers hang a little over the mattress's edge, never to the floor
    expect(box.min.y).toBeGreaterThan(surface - 0.12);
    expect(box.max.z - box.min.z).toBeGreaterThan(1.6);
    expect(box.max.z - box.min.z).toBeLessThan(2.05);
    expect(rig.tagY).toBeGreaterThan(box.max.y);
  });

  it("distress flushes the skin and nothing else, and lifts again exactly", () => {
    const rig = buildPerson({ shirt: "#336699" }, { posture: "standing", wear: uniformOf("nurse").wear });
    const before = meshes(rig).map((m) => (m.geometry.getAttribute("color").array as Float32Array).slice());
    const skinCount = rig.skin.reduce((n, s) => n + s.ranges.reduce((k, [, c]) => k + c, 0), 0);
    expect(skinCount).toBeGreaterThan(1000);
    setDistressed(rig, true);
    expect(rig.distressed).toBe(true);
    let changed = 0;
    meshes(rig).forEach((m, k) => {
      const now = m.geometry.getAttribute("color").array as Float32Array;
      for (let i = 0; i < now.length; i += 3) if (now[i] !== before[k]![i] || now[i + 1] !== before[k]![i + 1] || now[i + 2] !== before[k]![i + 2]) changed++;
    });
    expect(changed).toBeGreaterThan(skinCount * 0.9);
    expect(changed).toBeLessThanOrEqual(skinCount);
    setDistressed(rig, false);
    meshes(rig).forEach((m, k) => expect(Array.from(m.geometry.getAttribute("color").array as Float32Array)).toEqual(Array.from(before[k]!)));
  });

  it("the face moves: the jaw opens below the lips, the lids come down over the eyes, the trunk breathes", () => {
    const rig = buildPerson(undefined, { posture: "standing" });
    const morphs = rig.face.geometry.morphAttributes.position as BufferAttribute[];
    expect(morphs).toHaveLength(2);
    expect(rig.face.geometry.morphTargetsRelative).toBe(true);
    const pos = rig.face.geometry.getAttribute("position");
    const moved = (target: BufferAttribute) => {
      let n = 0, top = -Infinity, bottom = Infinity, down = 0;
      for (let i = 0; i < target.count; i++) {
        if (Math.abs(target.getY(i)) + Math.abs(target.getZ(i)) < 1e-7) continue;
        n++;
        top = Math.max(top, pos.getY(i));
        bottom = Math.min(bottom, pos.getY(i));
        down = Math.min(down, target.getY(i));
      }
      return { n, top, bottom, down };
    };
    const jaw = moved(morphs[0]!), lids = moved(morphs[1]!);
    expect(jaw.n).toBeGreaterThan(50);
    expect(lids.n).toBeGreaterThan(10);
    // the jaw's vertices lie below the eyes' (the lids are up at eye height); both move down
    expect(jaw.top).toBeLessThan(lids.bottom);
    expect(jaw.down).toBeLessThan(-0.004);
    expect(lids.down).toBeLessThan(-0.006);
    setMouth(rig, 0.7);
    setBlink(rig, 1);
    expect(rig.face.morphTargetInfluences).toEqual([0.7, 1]);
    setBreath(rig, 0.02);
    expect(rig.torso.scale.z).toBeCloseTo(1.02);
  });

  it("staff nobody described differ from one another, and are the same every time", () => {
    const ids = Array.from({ length: 40 }, (_, i) => `or-${i}.scrub-nurse`);
    const looks = ids.map((id) => JSON.stringify(looksOf(id)));
    expect(new Set(looks).size).toBeGreaterThan(20);
    expect(ids.map((id) => JSON.stringify(looksOf(id)))).toEqual(looks);
    for (const id of ids) {
      expect(heightOf(id)).toBeGreaterThanOrEqual(0.94);
      expect(heightOf(id)).toBeLessThanOrEqual(1.05);
    }
    const a = buildPerson(looksOf("a"), { posture: "standing", seed: "a" }), b = buildPerson(looksOf("a"), { posture: "standing", seed: "a" });
    expect(a.phase).toBe(b.phase);
    expect(Array.from(a.face.geometry.getAttribute("position").array as Float32Array)).toEqual(Array.from(b.face.geometry.getAttribute("position").array as Float32Array));
  });

  it("a rig takes the aim with one unseen box and gives up what it owns", () => {
    const parent = new Group();
    const rig = buildPerson(undefined, { posture: "standing" });
    parent.add(rig.root);
    const seen: Mesh[] = [], aim: Mesh[] = [];
    rig.root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      (m.userData.figure ? seen : aim).push(m);
    });
    expect(aim).toHaveLength(1);
    let disposed = 0;
    for (const m of seen) m.geometry.addEventListener("dispose", () => disposed++);
    disposeRig(rig);
    expect(disposed).toBe(seen.length);
    expect(rig.root.parent).toBeNull();
  });
});
