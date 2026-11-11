import { describe, expect, it } from "vitest";
import { Box3 } from "three";
import { addHand, HAND_CLASPED, HAND_FLAT, HAND_HOLD, HAND_RELAXED, type HandPose } from "./hand.js";
import { rgb, Sculpt } from "./sculpt.js";

const SKIN = { rgb: rgb("#dbb597"), gloss: 0.2, glow: 0.1 };
const POSES: [string, HandPose][] = [["relaxed", HAND_RELAXED], ["flat", HAND_FLAT], ["clasped", HAND_CLASPED], ["hold", HAND_HOLD]];

function built(pose: HandPose, opts: Parameters<typeof addHand>[3] = {}) {
  const sc = new Sculpt();
  const points = addHand(sc, SKIN, pose, opts);
  const geometry = sc.geometry();
  return { sc, points, geometry, box: new Box3().setFromBufferAttribute(geometry.getAttribute("position") as never) };
}

describe("a hand (figure/hand.ts)", () => {
  it("every pose builds at both levels of detail, within a triangle budget", () => {
    for (const [name, pose] of POSES) {
      for (const detail of [false, true]) {
        const { sc, geometry } = built(pose, { detail });
        const pos = geometry.getAttribute("position").array as Float32Array;
        expect(pos.every((v) => Number.isFinite(v)), `${name} ${detail}`).toBe(true);
        expect(sc.triangleCount, `${name} ${detail}`).toBeGreaterThan(detail ? 2500 : 1200);
        expect(sc.triangleCount, `${name} ${detail}`).toBeLessThan(detail ? 4600 : 2300);
      }
    }
  });

  it("is the size of a hand: about 19 cm from the wrist to the middle fingertip, 8 cm across the knuckles, the thumb on +X", () => {
    const { box, points } = built(HAND_FLAT, { detail: true });
    expect(box.max.y).toBeGreaterThan(0.17);
    expect(box.max.y).toBeLessThan(0.195);
    // across the palm (the thumb reaches further out on its own side)
    expect(-box.min.x).toBeGreaterThan(0.036);
    expect(-box.min.x).toBeLessThan(0.046);
    expect(points.thumb.x).toBeGreaterThan(0.045);
    // the middle finger is the longest, the little finger the shortest
    const tips = points.fingers.map((p) => p.y);
    expect(tips[1]!).toBeGreaterThan(tips[0]!);
    expect(tips[1]!).toBeGreaterThan(tips[2]!);
    expect(tips[3]!).toBeLessThan(tips[2]!);
    // the heel of the hand is as thick as a hand is (not a paddle): some 3.5 cm at the wrist
    const { box: wrist } = built(HAND_FLAT);
    expect(wrist.max.z - wrist.min.z).toBeGreaterThan(0.034);
  });

  it("a resting hand curls more towards the little finger; a flat one lies flat", () => {
    const relaxed = built(HAND_RELAXED).points, flat = built(HAND_FLAT).points;
    // curled fingers bring their pads forward of the palm (−Z), the little finger most of all
    expect(relaxed.fingers[0]!.z).toBeLessThan(flat.fingers[0]!.z);
    const curl = relaxed.fingers.map((p, i) => flat.fingers[i]!.y - p.y);
    expect(curl[3]! / 0.059).toBeGreaterThan(curl[0]! / 0.073);
    for (const p of flat.fingers) expect(p.z).toBeGreaterThan(-0.03);
  });

  it("the pinch closes: thumb and first two fingers a centimetre apart, the other two tucked away", () => {
    const { points } = built(HAND_HOLD, { detail: true });
    const fingers = points.fingers[0]!.clone().add(points.fingers[1]!).multiplyScalar(0.5);
    expect(points.thumb.distanceTo(fingers)).toBeGreaterThan(0.006);
    expect(points.thumb.distanceTo(fingers)).toBeLessThan(0.016);
    expect(points.thumb.distanceTo(points.fingers[3]!)).toBeGreaterThan(0.02);
    const open = built(HAND_FLAT).points;
    expect(open.thumb.distanceTo(open.fingers[0]!.clone().add(open.fingers[1]!).multiplyScalar(0.5))).toBeGreaterThan(0.06);
    expect(points.pointing).toHaveLength(4);
  });

  it("a glove has no nails and one colour", () => {
    const bare = built(HAND_RELAXED, { detail: true }), gloved = built(HAND_RELAXED, { detail: true, gloved: true });
    expect(gloved.sc.triangleCount).toBeLessThan(bare.sc.triangleCount);
    const colours = gloved.geometry.getAttribute("color").array as Float32Array;
    for (let i = 3; i < colours.length; i += 3) expect([colours[i], colours[i + 1], colours[i + 2]]).toEqual([colours[0], colours[1], colours[2]]);
    const skin = bare.geometry.getAttribute("color").array as Float32Array;
    let differs = false;
    for (let i = 3; i < skin.length && !differs; i += 3) differs = skin[i] !== skin[0];
    expect(differs).toBe(true);
  });
});
