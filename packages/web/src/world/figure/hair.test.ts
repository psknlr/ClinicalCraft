import { describe, expect, it } from "vitest";
import { addHair, sculptHair, type HairStyle } from "./hair.js";
import { rgb, Sculpt, type Rgb } from "./sculpt.js";
import { HEAD_CENTRE, type FaceSpec } from "./skull.js";

const ADULT: FaceSpec = { young: 0, wide: 1 };
const CHILD: FaceSpec = { young: 0.6, wide: 1 };
const STYLES: HairStyle[] = ["short", "long", "bun", "ponytail", "curly"];
const DARK = rgb("#2b2420"), FAIR = rgb("#c9b28a");

function hair(face: FaceSpec, style: HairStyle, colour: Rgb = DARK, opts: { capped?: boolean; infant?: boolean } = {}) {
  const sc = new Sculpt();
  const crown = addHair(sc, face, style, colour, opts);
  const geometry = sc.vertexCount ? sc.geometry() : null;
  if (geometry) geometry.computeBoundingBox();
  return { sc, crown, geometry, box: geometry?.boundingBox ?? null };
}

describe("hair (hair.ts)", () => {
  it("every style lies on the head it is for: over the crown, round the sides, clear of the face", () => {
    for (const face of [ADULT, CHILD]) {
      for (const style of STYLES) {
        const { sc, crown, geometry, box } = hair(face, style);
        const id = `${style} ${face.young}`;
        expect(sc.triangleCount, id).toBeGreaterThan(1200);
        expect(sc.triangleCount, id).toBeLessThan(4000);
        const position = geometry!.getAttribute("position").array as Float32Array;
        for (let i = 0; i < position.length; i++) expect(Number.isFinite(position[i]), id).toBe(true);
        // its top is a little over the top of the head, and is what it says it is
        expect(crown - HEAD_CENTRE[1], id).toBeGreaterThan(0.118);
        expect(crown - HEAD_CENTRE[1], id).toBeLessThan(0.145);
        expect(box!.max.y, id).toBeGreaterThan(crown - 0.012);
        expect(box!.max.y, id).toBeLessThan(crown + 0.012);
        // as wide as the head and a little more, on both sides alike within a parting's width
        expect(box!.max.x, id).toBeGreaterThan(0.075);
        expect(box!.max.x, id).toBeLessThan(0.105);
        expect(box!.max.x + box!.min.x, id).toBeLessThan(0.012);
        expect(box!.max.x + box!.min.x, id).toBeGreaterThan(-0.012);
        // nothing of it hangs before the eyes and the mouth
        for (let i = 0; i < position.length; i += 3) {
          const x = position[i]! - HEAD_CENTRE[0], y = position[i + 1]! - HEAD_CENTRE[1], z = position[i + 2]! - HEAD_CENTRE[2];
          if (z > 0.06 && Math.abs(x) < 0.045) expect(y, id).toBeGreaterThan(0.012 - 0.012 * face.young);
        }
      }
    }
    // long hair comes down to the shoulders, a tail down the back; short hair does neither
    expect(hair(ADULT, "long").box!.min.y - HEAD_CENTRE[1]).toBeLessThan(-0.15);
    expect(hair(ADULT, "ponytail").box!.min.z).toBeLessThan(hair(ADULT, "short").box!.min.z - 0.02);
    expect(hair(ADULT, "short").box!.min.y - HEAD_CENTRE[1]).toBeGreaterThan(-0.09);
  });

  it("a cast in a figure's hair colour is the hair sculpted in it — the band a tail is tied with keeps its own", () => {
    for (const style of STYLES) {
      for (const colour of [DARK, FAIR]) {
        const direct = new Sculpt();
        const crown = sculptHair(direct, ADULT, style, colour);
        const { sc, crown: cast } = hair(ADULT, style, colour);
        expect(cast).toBe(crown);
        expect(sc.vertexCount).toBe(direct.vertexCount);
        const a = direct.geometry(), b = sc.geometry();
        for (const name of ["position", "normal", "finish"]) expect(Array.from(b.getAttribute(name).array as Float32Array)).toEqual(Array.from(a.getAttribute(name).array as Float32Array));
        const ca = a.getAttribute("color").array as Float32Array, cb = b.getAttribute("color").array as Float32Array;
        let worst = 0;
        for (let i = 0; i < ca.length; i++) worst = Math.max(worst, Math.abs(ca[i]! - cb[i]!));
        expect(worst).toBeLessThan(2e-6);
      }
      // what does not change with the hair's colour is the band — only tied hair has one
      const dark = hair(ADULT, style, DARK).geometry!.getAttribute("color").array as Float32Array, fair = hair(ADULT, style, FAIR).geometry!.getAttribute("color").array as Float32Array;
      let same = 0;
      for (let i = 0; i < dark.length; i += 3) if (dark[i] === fair[i] && dark[i + 1] === fair[i + 1] && dark[i + 2] === fair[i + 2]) same++;
      if (style === "bun" || style === "ponytail") expect(same).toBeGreaterThan(20);
      else expect(same).toBe(0);
    }
  });

  it("a bald head has none; under a cap, and on an infant, only a close layer", () => {
    const bald = hair(ADULT, "bald");
    expect(bald.sc.vertexCount).toBe(0);
    expect(bald.crown - HEAD_CENTRE[1]).toBeCloseTo(0.115, 6);
    for (const style of STYLES) {
      const open = hair(ADULT, style), capped = hair(ADULT, style, DARK, { capped: true });
      expect(capped.sc.triangleCount).toBeLessThan(open.sc.triangleCount);
      expect(capped.crown).toBeLessThan(open.crown);
      // (a cap holds whatever the style is: the same close layer)
      expect(capped.sc.vertexCount).toBe(hair(ADULT, "short", DARK, { capped: true }).sc.vertexCount);
    }
    const infant = hair({ young: 1, wide: 1 }, "short", DARK, { infant: true });
    expect(infant.crown).toBeLessThan(hair({ young: 1, wide: 1 }, "short").crown);
  });
});
