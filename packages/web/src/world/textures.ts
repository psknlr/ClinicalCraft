/**
 * V4 procedural 16×16 pixel textures.
 *
 * V4 (`M()` in the world builder) painted every material into a 16×16
 * canvas: each pixel is the base colour with its HSL lightness offset by
 * `(rnd() − .5) × variance`, plus pattern rules (brick mortar, plank seams,
 * tile grout…). One LCG stream (k = 7103) feeds all textures in creation
 * order, so creating `catalogs/materials.json` in file order reproduces the
 * V4 pixels exactly. The pixel maths here is pure (no DOM) and unit-tested.
 */
import { Color } from "three";

export type TexturePattern = "noise" | "brick" | "plank" | "tile" | "flat" | "stripe" | "grid" | "dots" | "screen";

export const TEXTURE_SIZE = 16;
export const V4_SEED = 7103;

/** V4 LCG: `k = k * 1664525 + 1013904223 >>> 0`, returns k / 2³² ∈ [0, 1). */
export function createLcg(seed: number = V4_SEED): () => number {
  let k = seed >>> 0;
  return () => {
    k = (Math.imul(k, 1664525) + 1013904223) >>> 0;
    return k / 4294967296;
  };
}

/** FNV-1a 32-bit hash (stable seeds for lazily created textures, e.g. NPC colours). */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Lightness offset of pixel (x, y). `noise` is the random draw (already
 * `(rnd() − .5) × variance`). Pattern rules follow V4 (brick/plank/tile) and
 * the preview tool (stripe/grid/dots/screen).
 */
export function patternOffset(pattern: TexturePattern, x: number, y: number, noise: number): number {
  let d = noise;
  switch (pattern) {
    case "brick":
      if (y % 8 === 0 || (x + (y < 8 ? 0 : 8)) % 16 === 0) d = -0.15;
      break;
    case "plank":
      if (x % 4 === 0 || y % 15 === 0) d = -0.15;
      break;
    case "tile":
      if (x === 0 || y === 0) d = -0.07;
      break;
    case "stripe":
      if (x % 4 < 2) d -= 0.06;
      break;
    case "grid":
      if (x % 4 === 0 || y % 4 === 0) d = -0.08;
      break;
    case "dots":
      if (x % 4 === 1 && y % 4 === 1) d = 0.12;
      break;
    case "screen":
      if (y % 3 === 0) d += 0.05;
      break;
    default:
      break;
  }
  return d;
}

/**
 * RGBA pixels (sRGB bytes, row-major, 16×16) of a V4 texture. Consumes
 * exactly 256 draws from `rnd` (V4 draws for every pixel, even when the
 * pattern overrides the value), so streams stay aligned with V4.
 */
export function texturePixels(color: string, pattern: TexturePattern, variance: number, rnd: () => number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  const base = new Color(color);
  const c = new Color();
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const noise = (rnd() - 0.5) * variance;
      const d = patternOffset(pattern, x, y, noise);
      c.copy(base).offsetHSL(0, 0, d);
      const hex = c.getHex();
      const i = (y * TEXTURE_SIZE + x) * 4;
      out[i] = (hex >> 16) & 255;
      out[i + 1] = (hex >> 8) & 255;
      out[i + 2] = hex & 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

/** Paint pixels into a fresh 16×16 canvas (browser only). */
export function pixelsToCanvas(pixels: Uint8ClampedArray, size = TEXTURE_SIZE): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const img = ctx.createImageData(size, size);
    img.data.set(pixels);
    ctx.putImageData(img, 0, 0);
  }
  return canvas;
}
