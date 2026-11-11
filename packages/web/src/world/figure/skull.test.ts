import { describe, expect, it } from "vitest";
import { HEAD_CENTRE, NU, NV, faceDepth, faceNormal, featureHeights, hairlineAt, jawLineAt, phiAt, phiOfHeight, remembered, skullPoint, thetaAt, type FaceSpec } from "./skull.js";

const ADULT: FaceSpec = { young: 0, wide: 1 };
const CHILD: FaceSpec = { young: 0.6, wide: 1 };

/** A point of the head from its centre. */
function at(theta: number, phi: number, face: FaceSpec): [number, number, number] {
  const p = skullPoint(theta, phi, face);
  return [p.x - HEAD_CENTRE[0], p.y - HEAD_CENTRE[1], p.z - HEAD_CENTRE[2]];
}

/** The widest the head is at each millimetre of height, seen from in front (half-widths by height in mm). */
function outline(face: FaceSpec): Map<number, number> {
  const rows = new Map<number, number>();
  for (let a = 0; a <= 180; a++) {
    for (let b = 1; b < 360; b++) {
      const [x, y] = at((a / 180) * Math.PI, (b / 360) * Math.PI, face);
      const mm = Math.round(y * 1000);
      rows.set(mm, Math.max(rows.get(mm) ?? 0, x));
    }
  }
  return rows;
}

describe("the form of a head (skull.ts)", () => {
  it("is one smooth closed surface of a head's size, the same on both sides", () => {
    for (const face of [ADULT, CHILD, { young: 0, wide: 1.25 }]) {
      for (let a = 0; a <= 24; a++) {
        for (let b = 1; b < 24; b++) {
          const theta = (a / 24) * Math.PI, phi = (b / 24) * Math.PI;
          const p = at(theta, phi, face), q = at(-theta, phi, face);
          expect(p.every(Number.isFinite)).toBe(true);
          expect(q[0]).toBeCloseTo(-p[0], 10);
          expect(q[1]).toBeCloseTo(p[1], 10);
          expect(q[2]).toBeCloseTo(p[2], 10);
          expect(Math.hypot(...p)).toBeGreaterThan(0.045);
          expect(Math.hypot(...p)).toBeLessThan(0.135);
        }
      }
    }
    // a small step in either angle is a small step on the surface (the largest are up the sides of the nose): no tear
    for (let a = -40; a < 40; a++) {
      for (let b = 2; b < 78; b++) {
        const p = at(a * 0.04, b * 0.04, ADULT), q = at(a * 0.04 + 0.04, b * 0.04, ADULT), r = at(a * 0.04, b * 0.04 + 0.04, ADULT);
        expect(Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2])).toBeLessThan(0.011);
        expect(Math.hypot(r[0] - p[0], r[1] - p[1], r[2] - p[2])).toBeLessThan(0.012);
      }
    }
  });

  it("seen from in front is an oval: widest at the eyes, a soft line in to a small chin, with no corner on the way", () => {
    const rows = outline(ADULT);
    const widest = Math.max(...rows.values());
    expect(widest).toBeGreaterThan(0.07);
    expect(widest).toBeLessThan(0.08);
    expect(rows.get(0)!).toBeGreaterThan(widest - 0.001);
    // narrower and narrower below the eyes, and never by a jump
    let before = rows.get(-4)!;
    let steepest = 0, turn = 0, slope = 0;
    for (let mm = -6; mm >= -92; mm -= 2) {
      const now = rows.get(mm)!;
      expect(now, `at ${mm} mm`).toBeLessThanOrEqual(before + 1e-4);
      const fall = before - now;
      steepest = Math.max(steepest, fall);
      if (mm < -8) turn = Math.max(turn, Math.abs(fall - slope));
      slope = fall;
      before = now;
    }
    expect(steepest).toBeLessThan(0.004);
    expect(turn).toBeLessThan(0.0012);
    // the jaw at the height of the mouth is about three quarters of the face; the chin is small
    expect(rows.get(-58)! / widest).toBeGreaterThan(0.68);
    expect(rows.get(-58)! / widest).toBeLessThan(0.82);
    expect(rows.get(-94)!).toBeLessThan(0.034);
  });

  it("in profile has a chin under the lips, and a jaw line that rises from it to an angle under the ear", () => {
    const { mouth, eye } = featureHeights(ADULT);
    const depth = (y: number) => faceDepth(0, y, ADULT);
    let tip = 0;
    for (let y = eye - 0.015; y > eye - 0.04; y -= 0.0005) tip = Math.max(tip, depth(y));
    const lips = depth(mouth), fold = depth(mouth - 0.0165), chin = depth(mouth - 0.031);
    // the nose stands well before the lips; the chin a little behind them, before the fold over it
    expect(tip - lips).toBeGreaterThan(0.012);
    expect(tip - lips).toBeLessThan(0.026);
    expect(lips - chin).toBeGreaterThan(0.002);
    expect(lips - chin).toBeLessThan(0.011);
    expect(chin).toBeGreaterThan(fold);
    // the lower third of the face is no longer than its middle third (brow to the base of the nose)
    const chinBottom = jawLineAt(0.07, ADULT);
    expect(eye - 0.041 - chinBottom).toBeLessThan(0.0635);
    expect(eye - 0.041 - chinBottom).toBeGreaterThan(0.05);
    // the jaw line: lowest at the chin, rising gently to the angle, then up behind it
    const line = [0.08, 0.065, 0.04, 0.01, -0.005, -0.03].map((z) => jawLineAt(z, ADULT));
    for (let k = 0; k + 1 < line.length; k++) expect(line[k + 1]!).toBeGreaterThan(line[k]!);
    const body = (line[4]! - line[1]!) / 0.07, ramus = (line[5]! - line[4]!) / 0.025;
    expect(body).toBeGreaterThan(0.25);
    expect(body).toBeLessThan(0.55);
    expect(ramus).toBeGreaterThan(body);
    // nothing of the head hangs under that line
    for (let a = -30; a <= 30; a++) {
      for (let b = 40; b < 100; b++) {
        const p = at((a / 30) * Math.PI, (b / 100) * Math.PI, ADULT);
        expect(p[1]).toBeGreaterThan(jawLineAt(p[2], ADULT) - 0.006);
      }
    }
  });

  it("a child's face is a small one under a large cranium: features lower, the chin higher, the nose smaller", () => {
    const a = featureHeights(ADULT), c = featureHeights(CHILD);
    expect(c.eye).toBeLessThan(a.eye);
    expect(c.mouth).toBeGreaterThan(a.mouth);
    expect(jawLineAt(0.07, CHILD)).toBeGreaterThan(jawLineAt(0.07, ADULT));
    const nose = (face: FaceSpec) => {
      const e = featureHeights(face).eye;
      let tip = 0;
      for (let y = e - 0.015; y > e - 0.04; y -= 0.0005) tip = Math.max(tip, faceDepth(0, y, face));
      return tip - faceDepth(0.02, e - 0.03, face);
    };
    expect(nose(CHILD)).toBeLessThan(nose(ADULT));
    // over the eyes the head is wider and deeper
    expect(at(Math.PI / 2, 1.0, CHILD)[0]).toBeGreaterThan(at(Math.PI / 2, 1.0, ADULT)[0]);
    expect(hairlineAt(0, CHILD)).toBeGreaterThan(hairlineAt(0, ADULT));
  });

  it("finds the face by where it is seen from in front (faceDepth), and the angle a height is at (phiOfHeight)", () => {
    for (const face of [ADULT, CHILD, { young: 0, wide: 1.3 }]) {
      let worst = 0;
      for (let theta = -1.1; theta <= 1.1; theta += 0.07) {
        for (let phi = 0.7; phi <= 2.3; phi += 0.05) {
          const [x, y, z] = at(theta, phi, face);
          if (z < 0.03) continue;
          worst = Math.max(worst, Math.abs(faceDepth(x, y, face) - z));
        }
      }
      expect(worst).toBeLessThan(0.0004);
      for (const theta of [0, 0.6, 1.3, 2.2, Math.PI]) {
        for (const y of [0.09, 0.05, 0.01, -0.03]) {
          const phi = phiOfHeight(theta, y, face);
          expect(at(theta, phi, face)[1]).toBeCloseTo(y, 4);
        }
      }
    }
    // the same place twice is the same answer, and the face looks out of itself
    expect(faceDepth(0.02, -0.03, ADULT)).toBe(faceDepth(0.02, -0.03, ADULT));
    const n = faceNormal(0, 0.03, ADULT);
    expect(n.z).toBeGreaterThan(0.9);
    expect(Math.abs(n.x)).toBeLessThan(1e-6);
    expect(faceNormal(0.03, -0.03, ADULT).x).toBeGreaterThan(0.05);
  });

  it("lays its grid closer over the face, and remembers what it worked out for a face", () => {
    // columns crowd towards the face, rows towards its features
    const col = (i: number) => thetaAt(i + 1) - thetaAt(i);
    expect(col(NU / 2)).toBeLessThan(col(1) * 0.5);
    expect(thetaAt(NU / 2)).toBeCloseTo(0, 10);
    const row = (j: number) => at(0, phiAt(j), ADULT)[1];
    let features = 0;
    for (let j = 0; j <= NV; j++) if (row(j) < 0.03 && row(j) > -0.09) features++;
    expect(features).toBeGreaterThan(NV * 0.5);
    expect(phiAt(0)).toBe(0);
    expect(phiAt(NV)).toBeCloseTo(Math.PI, 10);
    const store = new Map<string, { n: number }>();
    let made = 0;
    const first = remembered(store, { young: 0.2, wide: 1.1 }, () => ({ n: ++made }));
    expect(remembered(store, { young: 0.2, wide: 1.1 }, () => ({ n: ++made }))).toBe(first);
    expect(remembered(store, { young: 0.2, wide: 1.2 }, () => ({ n: ++made }))).not.toBe(first);
    expect(made).toBe(2);
  });
});
