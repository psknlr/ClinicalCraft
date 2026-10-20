import { Color } from "three";
import { describe, expect, it } from "vitest";
import { createLcg, hashString, patternOffset, texturePixels } from "./textures.js";

describe("V4 LCG (k = 7103)", () => {
  it("matches k = k * 1664525 + 1013904223 >>> 0", () => {
    let k = 7103;
    const ref = () => ((k = (k * 1664525 + 1013904223) >>> 0), k / 4294967296);
    const rnd = createLcg(7103);
    for (let i = 0; i < 1000; i++) expect(rnd()).toBe(ref());
  });
  it("is in [0, 1) and deterministic", () => {
    const a = createLcg(1), b = createLcg(1);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(hashString("grass")).toBe(hashString("grass"));
    expect(hashString("grass")).not.toBe(hashString("glass"));
  });
});

describe("pattern maths", () => {
  it("V4 brick / plank / tile overrides", () => {
    expect(patternOffset("brick", 3, 0, 0.01)).toBe(-0.15);
    expect(patternOffset("brick", 0, 3, 0.01)).toBe(-0.15);
    expect(patternOffset("brick", 8, 9, 0.01)).toBe(-0.15);
    expect(patternOffset("brick", 3, 3, 0.01)).toBe(0.01);
    expect(patternOffset("plank", 4, 2, 0.02)).toBe(-0.15);
    expect(patternOffset("plank", 3, 15, 0.02)).toBe(-0.15);
    expect(patternOffset("tile", 0, 5, 0.02)).toBe(-0.07);
    expect(patternOffset("tile", 5, 5, 0.02)).toBe(0.02);
    expect(patternOffset("noise", 0, 0, 0.03)).toBe(0.03);
  });
  it("extended patterns (stripe, grid, dots, screen)", () => {
    expect(patternOffset("stripe", 1, 3, 0)).toBeCloseTo(-0.06);
    expect(patternOffset("stripe", 2, 3, 0)).toBe(0);
    expect(patternOffset("grid", 4, 1, 0.05)).toBe(-0.08);
    expect(patternOffset("dots", 5, 9, 0)).toBe(0.12);
    expect(patternOffset("screen", 1, 3, 0)).toBeCloseTo(0.05);
  });
});

describe("texturePixels", () => {
  it("consumes exactly 256 draws and is reproducible", () => {
    let n = 0;
    const counted = createLcg(7103);
    texturePixels("#79a75f", "noise", 0.11, () => (n++, counted()));
    expect(n).toBe(256);
    const a = texturePixels("#79a75f", "noise", 0.11, createLcg(7103));
    const b = texturePixels("#79a75f", "noise", 0.11, createLcg(7103));
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
  it("flat pattern with zero variance reproduces the base colour", () => {
    const px = texturePixels("#354442", "flat", 0, createLcg(1));
    const hex = new Color("#354442").getHex();
    expect([px[0], px[1], px[2], px[3]]).toEqual([(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 255]);
    expect(px[1020]).toBe(px[0]);
  });
  it("brick mortar rows are darker than the base", () => {
    const px = texturePixels("#a9b2a8", "brick", 0, createLcg(1));
    const base = new Color("#a9b2a8").getHex() & 255;
    expect(px[2]).toBeLessThan(base); // pixel (0,0) is mortar
  });
  it("first V4 texture (grass) starts the V4 stream", () => {
    // V4 painted grass first from k = 7103; its top-left pixel is the base colour offset by the first draw.
    const rnd = createLcg(7103);
    const first = (createLcg(7103)() - 0.5) * 0.11;
    const px = texturePixels("#79a75f", "noise", 0.11, rnd);
    const c = new Color("#79a75f").offsetHSL(0, 0, first).getHex();
    expect([px[0], px[1], px[2]]).toEqual([(c >> 16) & 255, (c >> 8) & 255, c & 255]);
  });
});
