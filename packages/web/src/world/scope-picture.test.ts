import { describe, expect, it } from "vitest";
import { thoracoscopyPixels } from "./scope-picture.js";
import { isShadedScreen, screenCanvasSize } from "./screens.js";

const W = 320, H = 180;
const R = 0.49 * H;

/** The pixel at a point of the scope's field (u right, v down, in units of the field's radius). */
function at(px: Uint8ClampedArray, u: number, v: number, w = W, h = H): [number, number, number] {
  const r = 0.49 * Math.min(w, h);
  const x = Math.floor(w / 2 + u * r), y = Math.floor(h / 2 + v * r);
  const i = 4 * (y * w + x);
  return [px[i]!, px[i + 1]!, px[i + 2]!];
}
const lum = ([r, g, b]: [number, number, number]): number => 0.3 * r + 0.59 * g + 0.11 * b;

describe("the thoracoscope's picture", () => {
  const px = thoracoscopyPixels(W, H);

  it("is the same pixels every time, opaque, of the size asked for", () => {
    expect(px.length).toBe(W * H * 4);
    expect(Buffer.from(thoracoscopyPixels(W, H)).equals(Buffer.from(px))).toBe(true);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
  });

  it("is the round field of a scope on a dark screen", () => {
    // lit inside the field, dark outside it — to the sides and in the corners
    expect(lum(at(px, 0, 0))).toBeGreaterThan(90);
    expect(lum(at(px, -0.55, -0.55))).toBeGreaterThan(60);
    for (const [u, v] of [[1.15, 0], [-1.15, 0], [1.6, 0.9], [-1.7, -0.95]] as const) expect(lum(at(px, u, v))).toBeLessThan(12);
    // the light falls off towards the rim
    expect(lum(at(px, -0.1, -0.1))).toBeGreaterThan(lum(at(px, -0.62, 0.7)));
    void R;
  });

  it("shows the chest wall over the top: ribs lighter than the spaces between them, several of them", () => {
    // down a line that crosses the ribs: the brightness rises and falls rib by rib
    const line: number[] = [];
    for (let v = -0.92; v <= -0.3; v += 0.01) line.push(lum(at(px, -0.2, v)));
    const mid = (Math.max(...line) + Math.min(...line)) / 2;
    let ribs = 0, below = true;
    for (const l of line) {
      if (below && l > mid + 6) {
        ribs++;
        below = false;
      } else if (!below && l < mid - 6) below = true;
    }
    expect(ribs).toBeGreaterThanOrEqual(2);
    expect(Math.max(...line) - Math.min(...line)).toBeGreaterThan(35);
  });

  it("shows the lung below it: pink, with darker pigment in places and a dark fissure across it", () => {
    let pink = 0, dark = 0, n = 0;
    for (let u = -0.5; u <= 0.1; u += 0.03)
      for (let v = 0.35; v <= 0.8; v += 0.03) {
        if (Math.hypot(u, v) > 0.9) continue;
        const c = at(px, u, v);
        n++;
        if (c[0] > c[1] + 25 && c[0] > c[2] + 20) pink++;
        if (lum(c) < 95) dark++;
      }
    expect(pink / n).toBeGreaterThan(0.7);
    expect(dark).toBeGreaterThan(3);
    expect(dark / n).toBeLessThan(0.4);
  });

  it("shows a steel grasper coming in from the right", () => {
    // on the shaft: bright and nearly colourless, unlike the tissue round it
    const steel = at(px, 0.72, 0.44);
    expect(Math.abs(steel[0] - steel[1])).toBeLessThan(26);
    expect(Math.abs(steel[1] - steel[2])).toBeLessThan(26);
    expect(lum(steel)).toBeGreaterThan(90);
  });

  it("keeps its composition at another size", () => {
    const small = thoracoscopyPixels(160, 90);
    for (const [u, v] of [[0, 0], [-0.2, -0.6], [-0.3, 0.6], [1.2, 0]] as const) {
      const a = lum(at(px, u, v)), b = lum(at(small, u, v, 160, 90));
      expect(Math.abs(a - b)).toBeLessThan(60);
    }
    expect(lum(at(small, 1.3, 0, 160, 90))).toBeLessThan(12);
  });
});

describe("screens that show a shaded picture", () => {
  it("are drawn finer than pixel art, at the screen's own shape", () => {
    expect(isShadedScreen("thoracoscopy")).toBe(true);
    expect(isShadedScreen("pacs")).toBe(false);
    expect(screenCanvasSize("thoracoscopy", 1.28, 0.72)).toEqual([320, 180]);
    expect(screenCanvasSize("pacs", 1.28, 0.72)[0]).toBe(64);
  });
});
