import { describe, expect, it } from "vitest";
import { addHair, coversEars, sculptHair, type HairStyle } from "./hair.js";
import { rgb, Sculpt, type Rgb } from "./sculpt.js";
import { EYE_Y, HEAD_CENTRE, phiOfHeight, skullPoint, type FaceSpec } from "./skull.js";

const ADULT: FaceSpec = { young: 0, wide: 1 };
const WOMAN: FaceSpec = { young: 0, wide: 1, feminine: 1 };
const MAN: FaceSpec = { young: 0, wide: 1.1, feminine: 0 };
const CHILD: FaceSpec = { young: 0.6, wide: 1 };
const STYLES: HairStyle[] = ["short", "long", "wavy", "bob", "bun", "ponytail", "curly"];
const DARK = rgb("#2b2420"), FAIR = rgb("#c9b28a");
const [CX, CY, CZ] = HEAD_CENTRE;

function hair(face: FaceSpec, style: HairStyle, colour: Rgb = DARK, opts: { capped?: boolean; infant?: boolean } = {}) {
  const sc = new Sculpt();
  const crown = addHair(sc, face, style, colour, opts);
  const geometry = sc.vertexCount ? sc.geometry() : null;
  if (geometry) geometry.computeBoundingBox();
  // its points from the head's centre
  const at: [number, number, number][] = [];
  const position = geometry ? (geometry.getAttribute("position").array as Float32Array) : new Float32Array(0);
  for (let i = 0; i < position.length; i += 3) at.push([position[i]! - CX, position[i + 1]! - CY, position[i + 2]! - CZ]);
  return { sc, crown, geometry, box: geometry?.boundingBox ?? null, at };
}

describe("hair (hair.ts)", () => {
  it("every style lies on the head it is for: over the crown, round the sides, clear of the eyes and out of the head", () => {
    for (const face of [ADULT, WOMAN, MAN, CHILD]) {
      const e = EYE_Y - 0.012 * face.young;
      for (const style of STYLES) {
        const { sc, crown, box, at } = hair(face, style);
        const id = `${style} ${JSON.stringify(face)}`;
        expect(sc.triangleCount, id).toBeGreaterThan(2400);
        expect(sc.triangleCount, id).toBeLessThan(7000);
        for (const p of at) expect(p.every(Number.isFinite), id).toBe(true);
        // its top is a little over the top of the head, and is what it says it is
        expect(crown - CY, id).toBeGreaterThan(0.118);
        expect(crown - CY, id).toBeLessThan(0.14);
        expect(box!.max.y, id).toBeGreaterThan(crown - 0.012);
        expect(box!.max.y, id).toBeLessThan(crown + 0.006);
        // as wide as the head and a little more — waves most — on both sides alike within a parting's width
        expect(box!.max.x, id).toBeGreaterThan(0.075);
        expect(box!.max.x, id).toBeLessThan(0.12);
        expect(Math.abs(box!.max.x + box!.min.x), id).toBeLessThan(0.012);
        let inside = 0, deepest = 0;
        for (const [x, y, z] of at) {
          // nothing of it hangs before the eyes or the mouth
          if (z > 0.06 && Math.abs(x) < 0.045) expect(y, id).toBeGreaterThan(e - 0.002);
          // and it lies on the head, not in it (told where the head's sides are steep enough to tell by): only the
          // corners of locks that end on the hairline behind the ears, where the head turns under, go in — by millimetres
          if (y > -0.04 && y < 0.085) {
            const theta = Math.atan2(x, z);
            const s = skullPoint(theta, phiOfHeight(theta, y, face), face);
            const off = Math.hypot(x, z) - Math.hypot(s.x - CX, s.z - CZ);
            if (off < -0.0015) inside++;
            deepest = Math.min(deepest, off);
          }
        }
        expect(inside, id).toBeLessThan(at.length * 0.012);
        expect(deepest, id).toBeGreaterThan(-0.008);
      }
    }
  });

  it("is as long as its style: to the shoulders before and behind, to the chin, cropped, or tied back", () => {
    const of = (style: HairStyle, face = ADULT) => hair(face, style);
    // long hair and waves reach the shoulders, some of it before them and some behind — and keep clear of the neck
    for (const style of ["long", "wavy"] as const) {
      const { box, at } = of(style);
      expect(box!.min.y - CY).toBeLessThan(-0.24);
      expect(box!.min.y - CY).toBeGreaterThan(-0.34);
      expect(at.some(([, y, z]) => y < -0.18 && z > 0.07)).toBe(true);
      expect(at.some(([, y, z]) => y < -0.18 && z < -0.09)).toBe(true);
      for (const [x, y, z] of at) if (y < -0.15) expect(Math.hypot(x, z + 0.012)).toBeGreaterThan(0.045);
    }
    // waves stand further out than hair that hangs straight
    expect(of("wavy").box!.max.x).toBeGreaterThan(of("long").box!.max.x + 0.005);
    // a bob ends about the chin, all round; a perm at the jaw
    for (const style of ["bob", "curly"] as const) {
      const { box } = of(style);
      expect(box!.min.y - CY).toBeLessThan(-0.09);
      expect(box!.min.y - CY).toBeGreaterThan(-0.135);
      expect(box!.min.z - CZ).toBeGreaterThan(-0.14);
    }
    // short hair ends at the nape; a bun is a knot behind the head; a tail hangs from where it is tied down the back
    expect(of("short").box!.min.y - CY).toBeGreaterThan(-0.07);
    expect(of("bun").box!.min.y - CY).toBeGreaterThan(-0.08);
    expect(of("bun").box!.min.z - CZ).toBeLessThan(-0.14);
    expect(of("ponytail").box!.min.y - CY).toBeLessThan(-0.16);
    expect(of("ponytail").box!.min.z - CZ).toBeLessThan(of("short").box!.min.z - CZ - 0.04);
    expect(of("ponytail").box!.min.z - CZ).toBeGreaterThan(-0.22);
    // a child's long hair is cut shorter for its smaller shoulders
    expect(of("long", CHILD).box!.min.y).toBeGreaterThan(of("long").box!.min.y + 0.03);
    // which styles come down over the ears
    expect(STYLES.filter(coversEars)).toEqual(["long", "wavy", "bob", "curly"]);
    expect(coversEars("bald")).toBe(false);
  });

  it("frames the face its own way: a curtain parted over a bare forehead, or wisps down to the brows", () => {
    // wisps: over the middle of the brow hair comes down to just above the eyes
    for (const style of ["wavy", "bob"] as const) {
      const { at } = hair(WOMAN, style);
      const brow = at.filter(([x, , z]) => Math.abs(x) < 0.03 && z > 0.07).map(([, y]) => y);
      expect(Math.min(...brow)).toBeLessThan(EYE_Y + 0.024);
      expect(Math.min(...brow)).toBeGreaterThan(EYE_Y + 0.004);
    }
    // a curtain: the middle of the forehead is bare, and the hair comes down beside the eyes to the cheekbones
    const { at } = hair(WOMAN, "long");
    for (const [x, y, z] of at) if (Math.abs(x) < 0.02 && z > 0.07) expect(y).toBeGreaterThan(0.034);
    expect(at.some(([x, y, z]) => Math.abs(x) > 0.05 && z > 0.04 && y < EYE_Y - 0.01 && y > EYE_Y - 0.05)).toBe(true);
    // short hair's fringe stays well over the brows
    const short = hair(MAN, "short").at.filter(([x, , z]) => Math.abs(x) < 0.03 && z > 0.07).map(([, y]) => y);
    expect(Math.min(...short)).toBeGreaterThan(EYE_Y + 0.02);
  });

  it("a cast in a figure's hair colour is the hair sculpted in it — the band a tail is tied with keeps its own", () => {
    for (const style of STYLES) {
      for (const colour of [DARK, FAIR]) {
        const direct = new Sculpt();
        const crown = sculptHair(direct, WOMAN, style, colour);
        const { sc, crown: cast } = hair(WOMAN, style, colour);
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
      const dark = hair(WOMAN, style, DARK).geometry!.getAttribute("color").array as Float32Array, fair = hair(WOMAN, style, FAIR).geometry!.getAttribute("color").array as Float32Array;
      let same = 0;
      for (let i = 0; i < dark.length; i += 3) if (dark[i] === fair[i] && dark[i + 1] === fair[i + 1] && dark[i + 2] === fair[i + 2]) same++;
      if (style === "bun" || style === "ponytail") expect(same).toBeGreaterThan(20);
      else expect(same).toBe(0);
    }
    // a woman's head and a man's are not the same head: each has hair cast for it
    const a = hair(WOMAN, "bob").geometry!.getAttribute("position").array as Float32Array, b = hair({ ...WOMAN, feminine: 0 }, "bob").geometry!.getAttribute("position").array as Float32Array;
    expect(a).toHaveLength(b.length);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it("a bald head has none; under a cap, and on an infant, only a close layer", () => {
    const bald = hair(ADULT, "bald");
    expect(bald.sc.vertexCount).toBe(0);
    expect(bald.crown - CY).toBeCloseTo(0.115, 6);
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
