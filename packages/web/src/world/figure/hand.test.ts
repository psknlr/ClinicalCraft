import { describe, expect, it } from "vitest";
import { Box3, Vector3, type BufferGeometry } from "three";
import { frameOf, skeletonOf } from "./anatomy.js";
import { fingerBones, FINGERS, thumbBones } from "./hand-bones.js";
import { handCage, onRing, WRIST } from "./hand-cage.js";
import { addHand, HAND_CLASPED, HAND_FLAT, HAND_HOLD, HAND_RELAXED, type HandOptions, type HandPose } from "./hand.js";
import { rgb, Sculpt, sweepEnd, type Station } from "./sculpt.js";

const SKIN = { rgb: rgb("#dbb597"), gloss: 0.2, glow: 0.1 };
const POSES: [string, HandPose][] = [["relaxed", HAND_RELAXED], ["flat", HAND_FLAT], ["clasped", HAND_CLASPED], ["hold", HAND_HOLD]];

function built(pose: HandPose, opts: HandOptions = {}) {
  const sc = new Sculpt();
  const points = addHand(sc, SKIN, pose, opts);
  const geometry = sc.geometry();
  return { sc, points, geometry, box: new Box3().setFromBufferAttribute(geometry.getAttribute("position") as never) };
}

/** Edges of a geometry that belong to one triangle only: the open rims. */
function rims(g: BufferGeometry): [number, number][] {
  const index = g.getIndex()!.array;
  const count = new Map<string, [number, number, number]>();
  for (let i = 0; i < index.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = index[i + k]!, b = index[i + ((k + 1) % 3)]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const e = count.get(key) ?? [a, b, 0];
      e[2]++;
      count.set(key, e);
    }
  }
  return [...count.values()].filter((e) => e[2] === 1).map((e) => [e[0], e[1]]);
}

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

describe("a hand (figure/hand.ts)", () => {
  it("every pose builds at both levels of detail, within a triangle budget", () => {
    for (const [name, pose] of POSES) {
      for (const detail of [false, true]) {
        const { sc, geometry } = built(pose, { detail });
        const pos = geometry.getAttribute("position").array as Float32Array;
        expect(pos.every((v) => Number.isFinite(v)), `${name} ${detail}`).toBe(true);
        expect(sc.triangleCount, `${name} ${detail}`).toBeGreaterThan(detail ? 10000 : 2600);
        expect(sc.triangleCount, `${name} ${detail}`).toBeLessThan(detail ? 13500 : 3400);
      }
    }
  });

  it("is ONE skin: closed everywhere but at the wrist, facing outward, with a hand's volume", () => {
    for (const [name, pose] of POSES) {
      // a glove is the skin alone (nails are sheets of their own)
      const { geometry } = built(pose, { gloved: true });
      const open = rims(geometry);
      const pos = geometry.getAttribute("position").array;
      // the only rim is the wrist's: one loop of 28 edges on the plane of the wrist
      expect(open, name).toHaveLength(28);
      for (const [a, b] of open) for (const v of [a, b]) expect(Math.abs(pos[3 * v + 1]!), name).toBeLessThan(1e-6);
      const v = volumeOf(geometry);
      expect(v, name).toBeGreaterThan(0.00018);
      expect(v, name).toBeLessThan(0.00045);
    }
  });

  it("has a hand's proportions: 18 cm long, 7 to 8 cm across, the knuckles half-way, the fingertips on their arc", () => {
    const { box, points } = built(HAND_FLAT, { detail: true });
    expect(box.max.y).toBeGreaterThan(0.172);
    expect(box.max.y).toBeLessThan(0.19);
    // across the knuckles (the thumb reaches further out on its own side)
    expect(-box.min.x).toBeGreaterThan(0.033);
    expect(-box.min.x).toBeLessThan(0.041);
    expect(points.thumb.x).toBeGreaterThan(0.045);
    // seen from the back a finger is as long as the back of the hand
    for (const k of points.knuckles) {
      expect(k.y / box.max.y).toBeGreaterThan(0.38);
      expect(k.y / box.max.y).toBeLessThan(0.5);
    }
    expect(points.knuckles[1]!.y).toBeGreaterThan(points.knuckles[0]!.y);
    expect(points.knuckles[3]!.y).toBeLessThan(points.knuckles[2]!.y);
    // the middle finger is the longest, the little finger the shortest; index and ring end near one another
    const tips = points.fingers.map((p) => p.y);
    expect(tips[1]!).toBeGreaterThan(tips[0]!);
    expect(tips[1]!).toBeGreaterThan(tips[2]!);
    expect(tips[3]!).toBeLessThan(tips[2]!);
    expect(Math.abs(tips[0]! - tips[2]!)).toBeLessThan(0.008);
    // the heel of the hand is as thick as a hand is, and the fingers are much thinner than the palm
    const heel = built(HAND_FLAT).box;
    expect(heel.max.z - heel.min.z).toBeGreaterThan(0.036);
    expect(FINGERS[0]!.w * 2).toBeLessThan(0.02);
  });

  it("a resting hand curls more towards the little finger; a flat one lies flat", () => {
    const relaxed = built(HAND_RELAXED).points, flat = built(HAND_FLAT).points;
    // curled fingers bring their pads forward of the palm (−Z), the little finger most of all for its length
    expect(relaxed.fingers[0]!.z).toBeLessThan(flat.fingers[0]!.z);
    const curl = relaxed.fingers.map((p, i) => flat.fingers[i]!.y - p.y);
    const length = FINGERS.map((f) => f.bones[0] + f.bones[1] + f.bones[2]);
    expect(curl[3]! / length[3]!).toBeGreaterThan(curl[0]! / length[0]!);
    for (const p of flat.fingers) expect(p.z).toBeGreaterThan(-0.035);
    // the thumb of a resting hand lies beside the index, not out to the side
    expect(relaxed.thumb.distanceTo(relaxed.fingers[0]!)).toBeLessThan(flat.thumb.distanceTo(flat.fingers[0]!));
  });

  it("the pinch closes pad to pad: thumb and first two fingers a centimetre apart, the other two tucked away", () => {
    const { points } = built(HAND_HOLD, { detail: true });
    const fingers = points.fingers[0]!.clone().add(points.fingers[1]!).multiplyScalar(0.5);
    expect(points.thumb.distanceTo(fingers)).toBeGreaterThan(0.006);
    expect(points.thumb.distanceTo(fingers)).toBeLessThan(0.016);
    expect(points.thumb.distanceTo(points.fingers[3]!)).toBeGreaterThan(0.02);
    // the thumb comes forward and turns to face the fingers (opposition): pads look at one another
    const towards = fingers.clone().sub(points.thumb).normalize();
    const thumbPad = thumbBones(HAND_HOLD).bones[2]!.up.clone().multiplyScalar(-1);
    const fingerPad = fingerBones(0, HAND_HOLD).bones[2]!.up.clone().multiplyScalar(-1);
    expect(thumbPad.dot(towards)).toBeGreaterThan(0.4);
    expect(fingerPad.dot(towards)).toBeLessThan(-0.4);
    const open = built(HAND_FLAT).points;
    expect(open.thumb.distanceTo(open.fingers[0]!.clone().add(open.fingers[1]!).multiplyScalar(0.5))).toBeGreaterThan(0.06);
    expect(points.pointing).toHaveLength(4);
    expect(points.knuckles).toHaveLength(4);
  });

  it("a bent finger keeps its knuckle: the skin over a joint stands further from it the more it bends", () => {
    const top = (pose: HandPose) => handCage(pose).knuckles[0]!.distanceTo(fingerBones(0, pose).bones[0]!.a);
    expect(top(HAND_HOLD)).toBeGreaterThan(top(HAND_FLAT));
    // and the cage's rings never fold through one another in front of a bent joint: the skin of a fist has no
    // point inside the palm's slab under the knuckles
    const { geometry } = built(HAND_CLASPED, { gloved: true });
    expect(volumeOf(geometry)).toBeGreaterThan(0.00018);
  });

  it("bare skin has tones and nails; a glove has neither", () => {
    const bare = built(HAND_RELAXED, { detail: true }), gloved = built(HAND_RELAXED, { detail: true, gloved: true });
    // five nails
    expect(bare.sc.triangleCount - gloved.sc.triangleCount).toBe(5 * 6 * 6 * 2);
    // a glove's colour only varies with shade: one hue everywhere
    const colours = gloved.geometry.getAttribute("color").array as Float32Array;
    for (let i = 0; i < colours.length; i += 3) {
      expect(colours[i + 1]! / colours[i]!).toBeCloseTo(SKIN.rgb[1] / SKIN.rgb[0], 4);
      expect(colours[i + 2]! / colours[i]!).toBeCloseTo(SKIN.rgb[2] / SKIN.rgb[0], 4);
    }
    // bare skin: the palm paler than the back
    const skin = bare.geometry.getAttribute("color").array as Float32Array, pos = bare.geometry.getAttribute("position").array as Float32Array;
    let back = 0, backs = 0, front = 0, fronts = 0;
    for (let i = 0; i < pos.length; i += 3) {
      if (pos[i + 1]! < 0.03 || pos[i + 1]! > 0.07 || Math.abs(pos[i]!) > 0.012) continue;
      if (pos[i + 2]! > 0.008) {
        back += skin[i]!;
        backs++;
      } else if (pos[i + 2]! < -0.01) {
        front += skin[i]!;
        fronts++;
      }
    }
    expect(backs).toBeGreaterThan(10);
    expect(fronts).toBeGreaterThan(10);
    expect(front / fronts).toBeGreaterThan(back / backs);
    // nothing of the hand shades the middle of its back; the skin between two fingers is in shade
    let between = 1, open = 0;
    for (let i = 0; i < pos.length; i += 3) {
      const lum = skin[i]! / SKIN.rgb[0];
      if (Math.abs(pos[i]! - 0.0165) < 0.002 && Math.abs(pos[i + 1]! - 0.105) < 0.006) between = Math.min(between, lum);
      if (Math.abs(pos[i]!) < 0.004 && Math.abs(pos[i + 1]! - 0.045) < 0.006 && pos[i + 2]! > 0.008) open = Math.max(open, lum);
    }
    expect(open).toBeGreaterThan(0.97);
    expect(between).toBeLessThan(0.9);
  });

  it("the palm of a dark hand is paler than its back by much more than a fair hand's", () => {
    const contrast = (hex: string): number => {
      const sc = new Sculpt();
      addHand(sc, { rgb: rgb(hex), gloss: 0.2, glow: 0.1 }, HAND_FLAT, { detail: true });
      const g = sc.geometry();
      const col = g.getAttribute("color").array as Float32Array, pos = g.getAttribute("position").array as Float32Array;
      let back = 0, backs = 0, front = 0, fronts = 0;
      for (let i = 0; i < pos.length; i += 3) {
        if (pos[i + 1]! < 0.03 || pos[i + 1]! > 0.07 || Math.abs(pos[i]!) > 0.012) continue;
        const sum = col[i]! + col[i + 1]! + col[i + 2]!;
        if (pos[i + 2]! > 0.008) {
          back += sum;
          backs++;
        } else if (pos[i + 2]! < -0.01) {
          front += sum;
          fronts++;
        }
      }
      return front / fronts / (back / backs);
    };
    const fair = contrast("#dbb597"), dark = contrast("#7a4f35");
    expect(fair).toBeGreaterThan(1);
    expect(fair).toBeLessThan(1.2);
    expect(dark).toBeGreaterThan(1.5);
  });

  it("two hands held together lie one over the other, a hand's thickness apart", () => {
    const sk = skeletonOf("standing", frameOf("average", "adult"), 0, "clasped");
    // the left arm as given, the right one mirrored to its own side
    const left = new Vector3(...sk.arms[0].end), right = new Vector3(...sk.arms[1].end).multiply(new Vector3(-1, 1, 1));
    const palm = new Vector3(...sk.arms[0].face).normalize();
    // both in front of the lower chest, their wrists either side of the middle, the palms towards the body
    expect(left.x).toBeGreaterThan(0);
    expect(right.x).toBeLessThan(0);
    expect(palm.z).toBeLessThan(-0.8);
    // the left lies out from the right along the way its back faces
    const apart = left.clone().sub(new Vector3(-right.x, right.y, right.z)).dot(palm.clone().multiplyScalar(-1));
    expect(apart).toBeGreaterThan(0.025);
    expect(apart).toBeLessThan(0.04);
    expect(left.z).toBeGreaterThan(right.z + 0.02);
  });

  it("grows out of the arm it is given: its edge lies on the arm's last ring, a point on every corner", () => {
    // an arm that ends in an oval turned a little about its own line, sixteen sides
    const forearm: Station[] = [{ p: [0, -0.1, 0], rx: 0.03, rz: 0.022, twist: 0.2 }, { p: [0, 0, 0], rx: WRIST[0] * 0.97, rz: WRIST[1] * 1.04, twist: 0.2 }];
    const ring = sweepEnd(forearm, { seg: 16, front: [0, 0, 1] });
    expect(ring).toHaveLength(48);
    const { geometry } = built(HAND_RELAXED, { gloved: true, wrist: ring });
    const pos = geometry.getAttribute("position").array;
    const edge = new Set(rims(geometry).flat());
    expect(edge.size).toBe(28);
    const corners = new Set<number>();
    for (const v of edge) {
      const p = new Vector3(pos[3 * v]!, pos[3 * v + 1]!, pos[3 * v + 2]!);
      expect(p.distanceTo(onRing(ring, Math.atan2(p.z, p.x)))).toBeLessThan(2e-5);
      for (let j = 0; j < 16; j++) if (p.distanceTo(new Vector3(ring[3 * j]!, ring[3 * j + 1]!, ring[3 * j + 2]!)) < 2e-5) corners.add(j);
    }
    expect(corners.size).toBe(16);
    // and it is still one closed skin of a hand's size
    expect(volumeOf(geometry)).toBeGreaterThan(0.00018);
  });
});
