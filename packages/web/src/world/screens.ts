/**
 * Equipment screens: static pixel-art panels (pacs / xray / ct / lab / text /
 * logo) drawn once, and live bedside-monitor canvases redrawn at ≤ 10 Hz.
 */
import { CanvasTexture, Color, LinearFilter, NearestFilter, SRGBColorSpace } from "three";
import { createLcg, hashString } from "./textures.js";

export type ScreenKind = "none" | "vitals" | "ecg" | "xray" | "ct" | "pacs" | "lab" | "text" | "logo";

/** Canvas size for a screen of physical size w×h (units). Static art is low-res pixel art. */
export function screenCanvasSize(kind: ScreenKind, w: number, h: number): [number, number] {
  const aspect = Math.max(0.3, Math.min(4, w / Math.max(0.05, h)));
  if (kind === "vitals" || kind === "ecg") {
    const cw = 320;
    return [cw, Math.max(96, Math.round(cw / aspect))];
  }
  const cw = kind === "text" ? 32 : 64;
  return [cw, Math.max(kind === "text" ? 8 : 16, Math.round(cw / aspect))];
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

function gray(v: number): string {
  const g = Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${g},${g},${g})`;
}

/** V4 workstation screen: tile-textured teal panel with four mint/teal bars. */
function paintV4Text(ctx: CanvasRenderingContext2D, W: number, H: number, bg: string, rnd: () => number): void {
  const base = new Color(bg);
  const c = new Color();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let d = (rnd() - 0.5) * 0.11;
      if (x % 8 === 0 || y % 8 === 0) d = -0.07;
      c.copy(base).offsetHSL(0, 0, d);
      px(ctx, x, y, 1, 1, "#" + c.getHexString());
    }
  // V4 Q(): bars at x = −.4 + i·.25 on a 1.29-wide screen, .14 wide, (.25 + rnd·.25) tall, centred .04 below the middle
  for (let i = 0; i < 4; i++) {
    const u = 0.5 + (-0.4 + i * 0.25) / 1.29;
    const bw = Math.max(2, Math.round((0.14 / 1.29) * W));
    const bh = Math.max(3, Math.round(((0.25 + rnd() * 0.25) / 0.85) * H));
    const cx = Math.round(u * W), cy = Math.round(0.547 * H);
    const col = i % 2 ? "#b6ccbb" : "#387c71";
    px(ctx, cx - Math.floor(bw / 2) - 1, cy - Math.floor(bh / 2) - 1, bw + 2, bh + 2, i % 2 ? "#7f9a8a" : "#123631");
    px(ctx, cx - Math.floor(bw / 2), cy - Math.floor(bh / 2), bw, bh, col);
    if (!(i % 2)) for (let y = cy - Math.floor(bh / 2); y < cy + Math.ceil(bh / 2); y += 2) px(ctx, cx - Math.floor(bw / 2), y, 1, 1, "#1c4a43");
  }
}

/** Paint static pixel art for a screen kind (deterministic per seed). `bg` = the part's material colour. */
export function paintStaticScreen(ctx: CanvasRenderingContext2D, W: number, H: number, kind: ScreenKind, seed: string, bg?: string): void {
  const rnd = createLcg(hashString(seed + kind));
  if (kind === "text" && bg) {
    paintV4Text(ctx, W, H, bg, rnd);
    return;
  }
  px(ctx, 0, 0, W, H, "#05090a");
  if (kind === "logo") {
    px(ctx, 0, 0, W, H, "#e4e4cd");
    const s = Math.floor(Math.min(W, H) * 0.6);
    const cx = Math.floor(W / 2), cy = Math.floor(H / 2), t = Math.max(2, Math.floor(s / 3));
    px(ctx, cx - s / 2, cy - t / 2, s, t, "#487c59");
    px(ctx, cx - t / 2, cy - s / 2, t, s, "#487c59");
    px(ctx, 0, H - 2, W, 2, "#e7c36b");
    return;
  }
  if (kind === "text" || kind === "lab") {
    px(ctx, 0, 0, W, 3, kind === "lab" ? "#2a6a5a" : "#33424a");
    let y = 5;
    let row = 0;
    while (y < H - 2) {
      const n = 3 + Math.floor(rnd() * 5);
      let x = 2;
      for (let i = 0; i < n && x < W - 4; i++) {
        const w = 2 + Math.floor(rnd() * 9);
        const flag = kind === "lab" && i === n - 1 && rnd() < 0.35;
        px(ctx, x, y, Math.min(w, W - 2 - x), 2, flag ? "#ff6b5a" : i === 0 ? "#9fd8b4" : "#d8e2dc");
        x += w + 2;
      }
      if (kind === "lab" && row % 3 === 2) px(ctx, 2, y + 3, W - 4, 1, "#1d3a33");
      y += 4;
      row++;
    }
    return;
  }
  // radiology-style: grey anatomy on black, UI ticks
  const cx = W / 2, cy = H / 2;
  if (kind === "xray") {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = (x - cx) / (W * 0.42), dy = (y - cy * 1.05) / (H * 0.48);
        const body = 1 - Math.min(1, dx * dx * 0.9 + dy * dy * 0.7);
        if (body <= 0) continue;
        const lungL = Math.hypot((x - cx + W * 0.16) / (W * 0.13), (y - cy) / (H * 0.32));
        const lungR = Math.hypot((x - cx - W * 0.16) / (W * 0.13), (y - cy) / (H * 0.32));
        let v = 70 + body * 90;
        if (lungL < 1 || lungR < 1) v = 35 + rnd() * 12;
        if (Math.abs(x - cx) < W * 0.04 && y > H * 0.08) v = 200; // spine
        const rib = Math.sin((y / H) * 28) > 0.82 && Math.abs(x - cx) > W * 0.05 && body > 0.2;
        if (rib) v = Math.max(v, 150);
        if (Math.hypot((x - cx + W * 0.05) / (W * 0.1), (y - cy - H * 0.12) / (H * 0.14)) < 1) v = 175; // heart
        px(ctx, x, y, 1, 1, gray(v + (rnd() - 0.5) * 14));
      }
  } else {
    // ct / pacs axial slice
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = (x - cx) / (W * 0.33), dy = (y - cy) / (H * 0.4);
        const r = dx * dx + dy * dy;
        if (r > 1) continue;
        let v = r > 0.86 ? 210 : 105 + (rnd() - 0.5) * 18;
        if (Math.hypot((x - cx + W * 0.11) / (W * 0.11), (y - cy) / (H * 0.25)) < 1) v = 28 + rnd() * 10;
        if (Math.hypot((x - cx - W * 0.11) / (W * 0.11), (y - cy) / (H * 0.25)) < 1) v = 28 + rnd() * 10;
        if (Math.hypot((x - cx) / (W * 0.04), (y - cy - H * 0.27) / (H * 0.07)) < 1) v = 230; // vertebra
        if (Math.hypot((x - cx + W * 0.02) / (W * 0.07), (y - cy - H * 0.03) / (H * 0.12)) < 1) v = 150; // heart/aorta
        px(ctx, x, y, 1, 1, gray(v));
      }
  }
  if (kind === "pacs") {
    px(ctx, 0, 0, W, 3, "#1d2b2b");
    px(ctx, W - 10, 5, 8, 6, "#3b5560");
    px(ctx, W - 10, 13, 8, 6, "#3b5560");
    px(ctx, W - 10, 21, 8, 6, "#2a6a5a");
  }
  ctx.fillStyle = "#e7c36b";
  ctx.fillRect(2, 2, 6, 1);
  ctx.fillRect(2, H - 3, 10, 1);
}

/** A CanvasTexture for a screen (static kinds are painted immediately). */
export function createScreenTexture(kind: ScreenKind, w: number, h: number, seed: string, bg?: string): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: CanvasTexture } {
  const [cw, ch] = screenCanvasSize(kind, w, h);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  if (kind === "vitals" || kind === "ecg") {
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    texture.generateMipmaps = false;
  } else {
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    paintStaticScreen(ctx, cw, ch, kind, seed, bg);
    texture.needsUpdate = true;
  }
  return { canvas, ctx, texture };
}
