/**
 * A tongue picture drawn from structured data (docs/STUDIES.md §8): what the tongue looks like (`TongueAppearance`)
 * and how the picture was taken (`TongueCapture`). Pure and deterministic — the same data and seed give the same
 * pixels everywhere — so a learner in the browser and an agent over MCP look at the same image.
 *
 * It is an illustration of the recorded appearance, never a photograph: the dorsal view of a protruded tongue with
 * its body colour and shape (enlarged or thin, tooth marks, cracks, prickles, stasis spots), its coating (colour,
 * thickness, texture, where it lies), and the capture conditions as an image shows them — the colour cast of warm,
 * cool or dim light over everything in the frame, a colour reference card when one was in it (tinted by the same
 * light: that is what the card is for), a soft focus.
 */
import type { Picture, TongueAppearance, TongueAppearancePatch, TongueCapture, TongueCoating } from "../schema/tongue.js";
import { base64, encodePng } from "./png.js";

/** The side of a drawn picture, in pixels. */
export const PICTURE_SIZE = 256;

type Rgb = readonly [number, number, number];

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

const BODY: Readonly<Record<TongueAppearance["body"], Rgb>> = {
  pale: hex("#e6bcb6"),
  "pale-red": hex("#d98c88"),
  red: hex("#c8463f"),
  crimson: hex("#9c2a30"),
  purple: hex("#8c4c7a"),
  bluish: hex("#74608c"),
};

const COATING: Readonly<Record<TongueAppearance["coating"]["color"], Rgb>> = {
  white: hex("#f1ece2"),
  "pale-yellow": hex("#ecdfae"),
  yellow: hex("#dcc160"),
  brown: hex("#99693a"),
  grey: hex("#9c9b96"),
  black: hex("#4b4641"),
};

const THICKNESS: Readonly<Record<TongueAppearance["coating"]["thickness"], number>> = { none: 0, thin: 0.4, thick: 0.9 };
const SHEEN: Readonly<Record<TongueAppearance["coating"]["texture"], number>> = { moist: 0.2, dry: 0, slippery: 0.5, greasy: 0.3, curdy: 0.08 };

/** What a light does to every colour in the frame, and how bright the frame is. */
const LIGHT: Readonly<Record<TongueCapture["light"], { cast: Rgb; gain: number }>> = {
  standard: { cast: [1, 1, 1], gain: 1 },
  daylight: { cast: [0.99, 1, 1.03], gain: 1 },
  warm: { cast: [1.1, 0.94, 0.7], gain: 0.96 },
  cool: { cast: [0.88, 0.97, 1.12], gain: 0.98 },
  dim: { cast: [1.02, 0.98, 0.9], gain: 0.5 },
};

const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** A number in [0, 1) from two lattice coordinates and a seed. */
function hash(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
function noise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

/** The colour reference card's patches, as they are in neutral light: a grey scale above, primaries below. */
const CARD: readonly (readonly Rgb[])[] = [
  [hex("#f3f3f1"), hex("#808080"), hex("#2a2a2a")],
  [hex("#be3232"), hex("#3c9650"), hex("#3250aa")],
];

/**
 * The picture's pixels (8-bit RGB, rows top to bottom). `seed` varies what differs between two captures of the same
 * tongue — where the light glints — never what the tongue looks like.
 */
export function drawTongue(appearance: TongueAppearance, capture: TongueCapture, seed = ""): { width: number; height: number; rgb: Uint8Array } {
  const size = PICTURE_SIZE;
  const k = seedOf(seed);
  const px = 2 / size;
  const shape = new Set(appearance.shape);
  const body = BODY[appearance.body];
  const coat = appearance.coating;
  const coatColor = COATING[coat.color];
  const coatAlpha = THICKNESS[coat.thickness];
  const sheen = coatAlpha > 0 ? SHEEN[coat.texture] : 0.18;
  const halfWidth = shape.has("enlarged") ? 0.5 : shape.has("thin") ? 0.31 : 0.4;
  const centreY = 0.08;
  const halfHeight = 0.74;
  // where the light glints: two spots that move a little from capture to capture
  const glints: readonly [number, number, number][] = [
    [-0.13 + (hash(1, 0, k) - 0.5) * 0.06, 0.22 + (hash(2, 0, k) - 0.5) * 0.06, 0.1],
    [0.11 + (hash(3, 0, k) - 0.5) * 0.06, -0.08 + (hash(4, 0, k) - 0.5) * 0.06, 0.07],
  ];
  const out = new Float32Array(size * size * 3);
  for (let j = 0; j < size; j++) {
    const v = ((j + 0.5) / size) * 2 - 1;
    for (let i = 0; i < size; i++) {
      const u = ((i + 0.5) / size) * 2 - 1;
      // the face around the mouth
      const skinShade = 0.94 + 0.06 * noise(u * 3, v * 3, 7) - 0.1 * (u * u + v * v) * 0.5;
      let r = 0.86 * skinShade;
      let g = 0.68 * skinShade;
      let b = 0.58 * skinShade;
      const over = (c: Rgb, alpha: number, shade = 1) => {
        r += (c[0] * shade - r) * alpha;
        g += (c[1] * shade - g) * alpha;
        b += (c[2] * shade - b) * alpha;
      };
      // lips, then the open mouth
      const lips = 1 - (u / 0.74) ** 2 - ((v + 0.42) / 0.49) ** 2;
      over([0.74, 0.36, 0.36], smooth(0, 0.05, lips), 0.92 + 0.08 * noise(u * 9, v * 9, 3));
      const cavity = 1 - (u / 0.61) ** 2 - ((v + 0.42) / 0.37) ** 2;
      over([0.24, 0.07, 0.08], smooth(0, 0.06, cavity));
      // the upper teeth
      if (v < -0.6 && cavity > 0) {
        const tooth = Math.abs(((u + 2) / 0.115) % 1 - 0.5);
        const edge = smooth(-0.77, -0.74, v) * (1 - smooth(-0.655 - 0.012 * Math.cos(u * 27), -0.64 - 0.012 * Math.cos(u * 27), v)) * smooth(0.47, 0.44, Math.abs(u));
        over([0.93, 0.91, 0.84], edge * (0.75 + 0.25 * smooth(0.02, 0.08, tooth)));
      }
      // the tongue: straight sides from the root, a rounded tip; tooth marks scallop the edges
      const ty = (v - centreY) / halfHeight;
      if (ty > -1 && ty < 1) {
        let w = halfWidth * (ty <= 0.2 ? 0.9 + (0.1 * (ty + 1)) / 1.2 : Math.sqrt(Math.max(0, 1 - ((ty - 0.2) / 0.8) ** 2)));
        if (shape.has("teeth-marked") && ty > -0.35 && ty < 0.8) w *= 1 - 0.055 * (0.5 + 0.5 * Math.cos(ty * Math.PI * 9));
        const inside = w - Math.abs(u);
        const alpha = smooth(0, px * 1.5, inside) * smooth(-0.66, -0.6, v);
        if (alpha > 0) {
          const e = w > 0 ? clamp(inside / w) : 0; // 0 at the edge, 1 on the midline
          const form = (0.8 + 0.2 * smooth(0, 0.55, e)) * (0.7 + 0.3 * smooth(-0.62, -0.05, v));
          const papillae = 0.975 + 0.05 * noise(u * 46, v * 46, 11);
          // the margins and the tip are a little redder than the centre
          const margin = 1 - smooth(0.05, 0.4, e) * (1 - smooth(0.6, 0.95, ty));
          over([body[0] * (1 + 0.03 * margin), body[1] * (1 - 0.07 * margin), body[2] * (1 - 0.07 * margin)], alpha, form * papillae);
          // the coating
          if (coatAlpha > 0) {
            const centre = smooth(0.08, 0.42, e);
            let mask =
              coat.distribution === "root"
                ? centre * (1 - smooth(-0.4, 0.2, ty))
                : coat.distribution === "center"
                  ? smooth(0.3, 0.7, e) * smooth(-0.95, -0.55, ty) * (1 - smooth(0.3, 0.7, ty))
                  : centre * (1 - 0.65 * smooth(0.5, 0.95, ty));
            if (coat.distribution === "patchy") mask *= smooth(0.42, 0.5, noise(u * 4.2 + 3, v * 4.2, 23));
            let grain = 1;
            if (coat.texture === "greasy") grain = 0.95 + 0.1 * noise(u * 70, v * 70, 31);
            else if (coat.texture === "dry") grain = 0.86 + 0.26 * noise(u * 30, v * 30, 37);
            else if (coat.texture === "curdy") {
              grain = 0.9 + 0.16 * noise(u * 16, v * 16, 41);
              mask *= 0.55 + 0.45 * smooth(0.35, 0.6, noise(u * 11, v * 11, 43));
            } else grain = 0.97 + 0.06 * noise(u * 40, v * 40, 47);
            over(coatColor, alpha * mask * coatAlpha, form * grain * 1.04);
          }
          // the median groove, deeper and with side cracks on a cracked tongue
          const cracked = shape.has("cracked");
          const wobble = 0.012 * (noise(v * 6, 0, 53) - 0.5);
          const groove = (1 - smooth(0.004, cracked ? 0.02 : 0.012, Math.abs(u - wobble))) * smooth(-0.6, -0.4, v) * (1 - smooth(0.25, 0.5, ty));
          over([body[0] * 0.5, body[1] * 0.4, body[2] * 0.4], alpha * groove * (cracked ? 0.75 : 0.28));
          if (cracked) {
            for (let n = 0; n < 4; n++) {
              const cy = -0.28 + n * 0.17 + (hash(n, 5, 61) - 0.5) * 0.05;
              const side = n % 2 === 0 ? 1 : -1;
              const along = side * u;
              const line = Math.abs(v - (cy + 0.35 * along * (hash(n, 6, 61) - 0.3)) - 0.01 * Math.sin(along * 40));
              const span = smooth(0, 0.03, along) * (1 - smooth(0.1 + 0.08 * hash(n, 7, 61), 0.2 + 0.08 * hash(n, 7, 61), along));
              over([body[0] * 0.5, body[1] * 0.4, body[2] * 0.4], alpha * span * (1 - smooth(0.003, 0.011, line)) * 0.7);
            }
          }
          // prickles at the tip and margins; stasis spots along the sides
          if (shape.has("prickles") && (ty > 0.45 || e < 0.3)) {
            const cell = 0.035;
            const cx = Math.floor(u / cell);
            const cyc = Math.floor(v / cell);
            if (hash(cx, cyc, 71) > 0.45) {
              const dx = u - (cx + 0.3 + 0.4 * hash(cx, cyc, 72)) * cell;
              const dy = v - (cyc + 0.3 + 0.4 * hash(cx, cyc, 73)) * cell;
              over([0.72, 0.1, 0.14], alpha * (1 - smooth(0.005, 0.011, Math.hypot(dx, dy))) * 0.9);
            }
          }
          if (shape.has("stasis-spots") && e < 0.42 && ty > -0.3 && ty < 0.8) {
            const cell = 0.085;
            const cx = Math.floor(u / cell);
            const cyc = Math.floor(v / cell);
            if (hash(cx, cyc, 81) > 0.62) {
              const dx = u - (cx + 0.3 + 0.4 * hash(cx, cyc, 82)) * cell;
              const dy = v - (cyc + 0.3 + 0.4 * hash(cx, cyc, 83)) * cell;
              over([0.3, 0.12, 0.3], alpha * (1 - smooth(0.012, 0.024, Math.hypot(dx, dy))) * 0.85);
            }
          }
          // the light glinting on a wet surface (none on a dry one)
          for (const [gx, gy, radius] of glints) {
            const d = Math.hypot((u - gx) / radius, (v - gy) / (radius * 1.6));
            over([1, 1, 1], alpha * sheen * (1 - smooth(0.2, 1, d)));
          }
        }
      }
      // the lower lip in front of the tongue's root is not drawn: the tongue is put out over it
      // a colour reference card in the frame
      if (capture.colorCard && u > -0.96 && u < -0.5 && v > 0.62 && v < 0.94) {
        r = 0.97;
        g = 0.97;
        b = 0.96;
        const cu = (u + 0.94) / 0.42;
        const cv = (v - 0.64) / 0.28;
        if (cu > 0 && cu < 1 && cv > 0 && cv < 1) {
          const col = Math.min(2, Math.floor(cu * 3));
          const row = Math.min(1, Math.floor(cv * 2));
          const fx = cu * 3 - col;
          const fy = cv * 2 - row;
          if (fx > 0.08 && fx < 0.92 && fy > 0.08 && fy < 0.92) [r, g, b] = CARD[row]![col]!;
        }
      }
      const at = (j * size + i) * 3;
      out[at] = r;
      out[at + 1] = g;
      out[at + 2] = b;
    }
  }
  // a soft focus: everything in the frame is blurred alike
  const pixels = capture.focus === "soft" ? blur(blur(out, size), size) : out;
  const light = LIGHT[capture.light];
  const rgb = new Uint8Array(size * size * 3);
  for (let p = 0; p < size * size; p++) {
    // too little light: the sensor's grain shows
    const grain = capture.light === "dim" ? (hash(p % size, (p / size) | 0, k ^ 97) - 0.5) * 0.06 : 0;
    for (let c = 0; c < 3; c++) rgb[p * 3 + c] = Math.round(clamp(pixels[p * 3 + c]! * light.cast[c]! * light.gain + grain) * 255);
  }
  return { width: size, height: size, rgb };
}

/** A 5 × 5 box blur. */
function blur(src: Float32Array, size: number): Float32Array {
  const out = new Float32Array(src.length);
  const pass = (from: Float32Array, to: Float32Array, dx: number, dy: number) => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let t = -2; t <= 2; t++) {
            const xx = Math.min(size - 1, Math.max(0, x + t * dx));
            const yy = Math.min(size - 1, Math.max(0, y + t * dy));
            sum += from[(yy * size + xx) * 3 + c]!;
          }
          to[(y * size + x) * 3 + c] = sum / 5;
        }
  };
  const mid = new Float32Array(src.length);
  pass(src, mid, 1, 0);
  pass(mid, out, 0, 1);
  return out;
}

/** A drawn picture as a PNG file, with its size and a base64 form for tools and data URLs. */
export interface DrawnPicture {
  mediaType: "image/png";
  width: number;
  height: number;
  png: Uint8Array;
  base64: string;
}

/** Draw a picture from its data (`PictureSchema`). `seed`: what tells two captures apart (an accession id). */
export function drawPicture(picture: Picture, seed = ""): DrawnPicture {
  const { width, height, rgb } = drawTongue(picture.appearance, picture.capture, seed);
  const png = encodePng(width, height, rgb);
  return { mediaType: "image/png", width, height, png, base64: base64(png) };
}

/**
 * The quality check of a tongue capture (what a tongue-imaging station checks of a frame): the light and the colour
 * reference decide whether colour can be judged, the focus whether texture can. It knows nothing of the patient — a
 * stain from food or drink passes it.
 */
export function captureQuality(capture: TongueCapture): { passed: boolean; reasons: { id: "light" | "color-card" | "focus"; text: { en: string; "zh-CN": string } }[] } {
  const reasons: ReturnType<typeof captureQuality>["reasons"] = [];
  if (capture.light !== "standard" && capture.light !== "daylight") {
    const what = { warm: { en: "warm room light", "zh-CN": "暖色室内光" }, cool: { en: "cool room light", "zh-CN": "冷色室内光" }, dim: { en: "too little light", "zh-CN": "光线不足" } }[capture.light];
    reasons.push({ id: "light", text: { en: `Non-standard light (${what.en}): colours are shifted.`, "zh-CN": `非标准光源（${what["zh-CN"]}）：颜色有偏差。` } });
  }
  if (!capture.colorCard) reasons.push({ id: "color-card", text: { en: "No colour reference card in the frame: colour cannot be checked.", "zh-CN": "画面中没有比色卡：无法校验颜色。" } });
  if (capture.focus === "soft") reasons.push({ id: "focus", text: { en: "Out of focus: texture and fine marks cannot be judged.", "zh-CN": "对焦不清：无法判断质地和细小特征。" } });
  return { passed: reasons.length === 0, reasons };
}

type Bi = { en: string; "zh-CN": string };

const BODY_WORDS: Readonly<Record<TongueAppearance["body"], Bi>> = {
  pale: { en: "pale", "zh-CN": "淡白" },
  "pale-red": { en: "pale red", "zh-CN": "淡红" },
  red: { en: "red", "zh-CN": "红" },
  crimson: { en: "crimson", "zh-CN": "绛" },
  purple: { en: "purple", "zh-CN": "紫" },
  bluish: { en: "bluish purple", "zh-CN": "青紫" },
};
const SHAPE_WORDS: Readonly<Record<TongueAppearance["shape"][number], Bi>> = {
  enlarged: { en: "enlarged", "zh-CN": "胖大" },
  thin: { en: "thin", "zh-CN": "瘦薄" },
  "teeth-marked": { en: "tooth marks at the edges", "zh-CN": "边有齿痕" },
  cracked: { en: "cracked", "zh-CN": "有裂纹" },
  prickles: { en: "red prickles", "zh-CN": "有芒刺" },
  "stasis-spots": { en: "stasis spots", "zh-CN": "有瘀点" },
};
const COAT_WORDS: Readonly<Record<TongueCoating["color"], Bi>> = {
  white: { en: "white", "zh-CN": "白" },
  "pale-yellow": { en: "pale yellow", "zh-CN": "淡黄" },
  yellow: { en: "yellow", "zh-CN": "黄" },
  brown: { en: "yellow-brown", "zh-CN": "黄褐" },
  grey: { en: "grey", "zh-CN": "灰" },
  black: { en: "black", "zh-CN": "黑" },
};
const THICK_WORDS: Readonly<Record<TongueCoating["thickness"], Bi>> = { none: { en: "", "zh-CN": "" }, thin: { en: "thin", "zh-CN": "薄" }, thick: { en: "thick", "zh-CN": "厚" } };
const TEXTURE_WORDS: Readonly<Record<TongueCoating["texture"], Bi>> = {
  moist: { en: "moist", "zh-CN": "润" },
  dry: { en: "dry", "zh-CN": "燥" },
  slippery: { en: "slippery", "zh-CN": "滑" },
  greasy: { en: "greasy", "zh-CN": "腻" },
  curdy: { en: "curdy", "zh-CN": "腐" },
};
const WHERE_WORDS: Readonly<Record<TongueCoating["distribution"], Bi>> = {
  full: { en: "over the whole surface", "zh-CN": "满布" },
  center: { en: "over the centre", "zh-CN": "居中" },
  root: { en: "over the root", "zh-CN": "以舌根为主" },
  patchy: { en: "in patches, peeled between", "zh-CN": "呈花剥" },
};
const LIGHT_WORDS: Readonly<Record<TongueCapture["light"], Bi>> = {
  standard: { en: "standard light", "zh-CN": "标准光源" },
  daylight: { en: "daylight", "zh-CN": "自然光" },
  warm: { en: "warm room light", "zh-CN": "暖色室内光" },
  cool: { en: "cool room light", "zh-CN": "冷色室内光" },
  dim: { en: "dim light", "zh-CN": "光线昏暗" },
};

/** An appearance with a patch laid over it (a change of state, something on the tongue). */
export function patchTongue(a: TongueAppearance, patch: TongueAppearancePatch): TongueAppearance {
  return {
    ...a,
    ...(patch.body ? { body: patch.body } : {}),
    ...(patch.shape ? { shape: [...patch.shape] } : {}),
    ...(patch.sublingual ? { sublingual: patch.sublingual } : {}),
    coating: { ...a.coating, ...(patch.coating ?? {}) },
  };
}

const WARMER: Readonly<Partial<Record<TongueAppearance["body"], TongueAppearance["body"]>>> = { pale: "pale-red", "pale-red": "red" };
const COOLER: Readonly<Partial<Record<TongueAppearance["body"], TongueAppearance["body"]>>> = { "pale-red": "pale", red: "pale-red", purple: "bluish" };

/**
 * How a reader names what a picture shows (the categories, not the truth): warm light reads one step redder and a
 * white coating yellowish; cool light one step paler or bluer. Standard light, daylight and dim light shift nothing —
 * a dim or soft capture fails its quality check instead.
 */
export function apparentTongue(a: TongueAppearance, capture: TongueCapture): TongueAppearance {
  if (capture.light === "warm") {
    const coat = a.coating.color === "white" ? "pale-yellow" : a.coating.color === "pale-yellow" ? "yellow" : a.coating.color;
    return { ...a, body: WARMER[a.body] ?? a.body, coating: { ...a.coating, color: coat } };
  }
  if (capture.light === "cool") return { ...a, body: COOLER[a.body] ?? a.body };
  return a;
}

const join = (L: "en" | "zh-CN", parts: string[]) => parts.filter(Boolean).join(L === "zh-CN" ? "，" : ", ");

/** A tongue in words, both languages: the body, its shape (absent: nothing to name), the coating, the sublingual veins. */
export function describeTongue(a: TongueAppearance): { body: Bi; shape: Bi | null; coating: Bi; sublingual: Bi | null } {
  const shape = a.shape.length ? { en: a.shape.map((x) => SHAPE_WORDS[x].en).join(", "), "zh-CN": a.shape.map((x) => SHAPE_WORDS[x]["zh-CN"]).join("、") } : null;
  const c = a.coating;
  const coating: Bi =
    c.thickness === "none"
      ? { en: "no coating (peeled)", "zh-CN": "无苔（光剥）" }
      : {
          en: join("en", [`${THICK_WORDS[c.thickness].en} ${COAT_WORDS[c.color].en}`, TEXTURE_WORDS[c.texture].en, WHERE_WORDS[c.distribution].en]),
          "zh-CN": `${THICK_WORDS[c.thickness]["zh-CN"]}${COAT_WORDS[c.color]["zh-CN"]}${TEXTURE_WORDS[c.texture]["zh-CN"]}苔，${WHERE_WORDS[c.distribution]["zh-CN"]}`,
        };
  const sublingual = a.sublingual ? (a.sublingual === "engorged" ? { en: "sublingual veins engorged", "zh-CN": "舌下络脉迂曲增粗" } : { en: "sublingual veins not engorged", "zh-CN": "舌下络脉无迂曲增粗" }) : null;
  return { body: BODY_WORDS[a.body], shape, coating, sublingual };
}

/** How a picture was taken, in words. */
export function describeCapture(capture: TongueCapture): Bi {
  return {
    en: join("en", [LIGHT_WORDS[capture.light].en, capture.colorCard ? "colour card in the frame" : "no colour card", capture.focus === "soft" ? "out of focus" : "in focus"]),
    "zh-CN": join("zh-CN", [LIGHT_WORDS[capture.light]["zh-CN"], capture.colorCard ? "画面内有比色卡" : "无比色卡", capture.focus === "soft" ? "对焦不清" : "对焦清晰"]),
  };
}
