/**
 * The picture a rigid endoscope gives inside the chest (thoracoscopy), drawn in code for equipment screens of
 * that kind: the round field of the scope on a dark monitor — the chest wall arching over the top (ribs under
 * the pleura, an intercostal vessel along the lower edge of each), the collapsed lung below it (its lobules
 * outlined in carbon pigment, a fissure between two lobes), a pad of fat, a grasper coming in from a port, the
 * light falling off towards the rim.
 *
 * A representative picture, as the chest film of an `xray` screen and the slice of a `pacs` screen are: it shows
 * what the equipment is for, never a patient's own findings. No random source: the same pixels every time.
 */

type Rgb = [number, number, number];

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (a: Rgb, k: number): Rgb => [a[0] * k, a[1] * k, a[2] * k];

/** A number in [0, 1) for a lattice point (an integer hash: no state). */
function hash(ix: number, iy: number): number {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth noise in [0, 1). */
function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Noise of three octaves in [0, 1). */
function cloud(x: number, y: number): number {
  return (noise(x, y) * 4 + noise(x * 2.1 + 5.2, y * 2.1 + 1.3) * 2 + noise(x * 4.3 + 9.1, y * 4.3 + 7.7)) / 7;
}

/** Cells: how far to the nearest cell centre and to the next (the difference is small on the line between two cells). */
function cells(x: number, y: number): [number, number] {
  const ix = Math.floor(x), iy = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i + 0.15 + 0.7 * hash(ix + i, iy + j), cy = iy + j + 0.15 + 0.7 * hash(iy + j + 31, ix + i + 17);
      const d = Math.hypot(x - cx, y - cy);
      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) d2 = d;
    }
  return [d1, d2];
}

/** How far the point is from the segment a–b, and how far along it (0 at a … 1 at b). */
function along(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number, number] {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / len2);
  const cx = ax + dx * t, cy = ay + dy * t;
  // which side of the line (for the round of a shaft: lit from above)
  const side = ((px - ax) * dy - (py - ay) * dx) / Math.sqrt(len2);
  return [Math.hypot(px - cx, py - cy), t, side];
}

/** Where the lung's upper edge runs under the chest wall (the field is the unit disc: u right, v down). */
const lungEdge = (u: number): number => -0.16 + 0.2 * u + 0.17 * u * u + 0.035 * Math.sin(3.1 * u + 0.6);
/** The fissure between the two lobes. */
const fissure = (u: number): number => 0.5 - 0.4 * u + 0.2 * u * u;

const RIB: Rgb = [240, 214, 192];
const SPACE: Rgb = [208, 112, 94];
const SPACE_FAT: Rgb = [234, 190, 116];
const ARTERY: Rgb = [156, 26, 36];
const VEIN: Rgb = [112, 70, 118];
const LUNG: Rgb = [232, 150, 142];
const LUNG_LOWER: Rgb = [206, 124, 138];
const PIGMENT: Rgb = [58, 58, 72];
const CLEFT: Rgb = [84, 24, 30];
const FAT: Rgb = [240, 202, 104];
const STEEL: Rgb = [184, 190, 198];
const GLINT: Rgb = [255, 251, 246];
const DARK: Rgb = [5, 9, 10];

/** The chest wall: ribs under the glistening pleura, the spaces between them, the vessels that run with each rib. */
function wall(u: number, v: number): Rgb {
  // ribs cross the field in shallow arcs, a little obliquely; those nearer the scope (lower in the field) lie wider apart
  const a = -0.34, ca = Math.cos(a), sa = Math.sin(a);
  const across = v * ca - u * sa, alongRib = u * ca + v * sa;
  const q = Math.pow(across + 0.16 * alongRib * alongRib + 1.25, 0.82) / 0.31;
  const t = q - Math.floor(q);
  const band = 0.5;
  // a rib is rounded: brightest along its middle, turning away at both edges
  const rib = smooth(0, 0.1, t) * smooth(band, band - 0.1, t);
  const bulge = Math.sin(Math.PI * clamp01(t / band));
  const bone = scale(RIB, 0.84 + 0.16 * bulge + 0.05 * (noise(u * 11, v * 11) - 0.5));
  // an intercostal space: muscle through the pleura, its fibres oblique, fat under the pleura here and there
  const fibres = noise(alongRib * 30 + across * 11, across * 6);
  let space = scale(SPACE, 0.88 + 0.18 * fibres);
  space = mix(space, SPACE_FAT, 0.7 * smooth(0.5, 0.72, cloud(u * 3.1 + 2.7, v * 3.1 + 9.3)));
  // the vessels run in the groove under the rib above: the vein nearest the rib, then the artery
  const groove = (t - band) / (1 - band);
  space = mix(space, VEIN, 0.6 * smooth(0.075, 0.03, Math.abs(groove - 0.1)));
  space = mix(space, ARTERY, 0.8 * smooth(0.07, 0.025, Math.abs(groove - 0.26)));
  let c = mix(space, bone, rib);
  // fine vessels branching over the pleura
  const fine = 1 - Math.abs(2 * noise(u * 6.1 + 3.1, v * 6.1 + 8.4) - 1);
  c = mix(c, ARTERY, 0.45 * smooth(0.965, 0.99, fine) * smooth(0.3, 0.55, noise(u * 2.3 + 0.7, v * 2.3 + 5.5)));
  return c;
}

/** The lung: pink lobules outlined here and there in carbon pigment, a fissure, the lower lobe a little darker. */
function lung(u: number, v: number): Rgb {
  const f = v - fissure(u);
  let c = f > 0 ? LUNG_LOWER : LUNG;
  c = scale(c, 0.92 + 0.16 * cloud(u * 2.4 + 1.7, v * 2.4 + 4.2));
  // pigment: soft grey-blue along the borders of lobules, broken; gathered into blotches; a few specks
  const lx = u * 7.5 + 2.3, ly = v * 7.5 + 6.1;
  const [d1, d2] = cells(lx, ly);
  const patch = smooth(0.38, 0.6, cloud(u * 1.7 + 7.9, v * 1.7 + 2.6));
  const broken = smooth(0.32, 0.6, noise(u * 13 + 4.1, v * 13 + 1.9));
  c = mix(c, PIGMENT, 0.6 * patch * broken * smooth(0.17, 0.02, d2 - d1));
  const blotch = smooth(0.56, 0.74, cloud(u * 4.3 + 0.4, v * 4.3 + 8.8));
  c = mix(c, PIGMENT, 0.5 * patch * blotch * (0.55 + 0.45 * noise(u * 27, v * 27)));
  const speck = hash(Math.floor(lx) + 7, Math.floor(ly) + 3);
  if (speck > 0.62) c = mix(c, PIGMENT, 0.7 * patch * smooth(0.09, 0.025, d1));
  // the fissure: a dark cleft, each lobe rounding into it
  c = scale(c, 1 - 0.25 * smooth(0.16, 0.0, Math.abs(f)));
  c = mix(c, CLEFT, 0.92 * smooth(0.03, 0.006, Math.abs(f)));
  return c;
}

/** A steel instrument part from a to b, radius r0 at a and r1 at b, over the colour underneath; `slot`: a window along its middle. */
function steelOver(c: Rgb, u: number, v: number, ax: number, ay: number, bx: number, by: number, r0: number, r1: number, slot = 0): Rgb {
  const [d, t, side] = along(u, v, ax, ay, bx, by);
  const r = r0 + (r1 - r0) * t;
  if (d >= r) return c;
  const round = side / r;
  // lit from above the shaft: a bright line off its middle, dark at the far edge
  let steel = scale(STEEL, 0.5 + 0.62 * (1 - (round + 0.35) * (round + 0.35)));
  if (slot > 0 && t > 0.3 && t < 0.86 && Math.abs(round) < slot) steel = scale(steel, 0.25);
  return mix(c, steel, smooth(r, r * 0.82, d));
}

/** The colour of a point of the scope's field (u right, v down, both in units of the field's radius). */
function field(u: number, v: number): Rgb {
  const edge = v - lungEdge(u);
  let c: Rgb;
  let wet: number;
  if (edge < 0) {
    c = wall(u, v);
    // the space behind the lung is dark: the wall falls into shadow towards it
    c = scale(c, 1 - 0.6 * smooth(-0.17, 0, edge));
    wet = 0.55;
  } else {
    c = lung(u, v);
    // the lung's rounded edge catches the light
    c = scale(c, 1 + 0.14 * smooth(0.12, 0.03, edge) - 0.4 * smooth(0.022, 0, edge));
    wet = 1;
  }
  // a pad of fat by the mediastinum (left): lobules, a vessel or two
  const fu = (u + 0.7) / 0.34, fv = (v - 0.16 + 0.3 * (u + 0.7)) / 0.2;
  const [g1, g2] = cells(u * 10 + 4.4, v * 10 + 0.9);
  const inFat = 1 - smooth(0.8, 1.0, Math.hypot(fu, fv) + 0.22 * (g1 - 0.3));
  if (inFat > 0) {
    let fat = scale(FAT, 0.78 + 0.34 * (1 - g1) - 0.2 * smooth(0.12, 0.02, g2 - g1));
    fat = mix(fat, ARTERY, 0.6 * smooth(0.955, 0.985, 1 - Math.abs(2 * noise(u * 7.1 + 6.6, v * 7.1 + 2.2) - 1)));
    c = mix(c, fat, inFat);
  }
  // wet surfaces glisten where they face the light: small soft highlights, more of them near the middle of the light
  const rho = Math.hypot(u + 0.08, v + 0.1);
  const glint = noise(u * 17 + 1.1, v * 15 + 3.3);
  c = mix(c, GLINT, wet * 0.8 * smooth(0.95, 0.3, rho) * smooth(0.83, 0.93, glint));

  // the grasper: a steel shaft from a port at the right, its fenestrated jaws open on the lung
  const jx = 0.3, jy = 0.24, ex = 1.1, ey = 0.62;
  const [hd] = along(u, v, ex, ey + 0.09, jx + 0.02, jy + 0.09);
  c = scale(c, 1 - 0.32 * smooth(0.12, 0.03, hd));
  c = steelOver(c, u, v, ex, ey, jx, jy, 0.075, 0.07);
  const [, st] = along(u, v, ex, ey, jx, jy);
  const [cd] = along(u, v, ex, ey, jx, jy);
  if (cd < 0.075 && Math.abs(st - 0.9) < 0.018) c = scale(c, 0.55);
  const len = Math.hypot(ex - jx, ey - jy), dx = (jx - ex) / len, dy = (jy - ey) / len;
  for (const turn of [-0.3, 0.3]) {
    const cs = Math.cos(turn), sn = Math.sin(turn);
    const tx = dx * cs - dy * sn, ty = dx * sn + dy * cs;
    c = steelOver(c, u, v, jx, jy, jx + tx * 0.3, jy + ty * 0.3, 0.05, 0.028, 0.34);
  }

  // the scope's own light: brightest a little above the middle, falling off to the rim
  return scale(c, 1.1 - 0.52 * Math.pow(rho, 2.2));
}

/**
 * The thoracoscope's picture as RGBA pixels (row by row from the top), W × H: the round field in the middle of
 * a dark screen, with the marks of a camera system in its corners.
 */
export function thoracoscopyPixels(W: number, H: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(W * H * 4);
  const R = 0.49 * Math.min(W, H);
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - cx) / R, v = (y + 0.5 - cy) / R;
      const rho = Math.hypot(u, v);
      let c = DARK;
      if (rho < 1.02) c = mix(DARK, field(u, v), smooth(1.0, 0.97, rho));
      const i = 4 * (y * W + x);
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = 255;
    }
  // the camera system's marks, where the field leaves room: recording (top left), the scale bar (bottom left)
  const mark = (x0: number, y0: number, w: number, h: number, c: Rgb) => {
    for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++)
      for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) {
        const i = 4 * (y * W + x);
        out[i] = c[0];
        out[i + 1] = c[1];
        out[i + 2] = c[2];
      }
  };
  const s = Math.max(1, Math.round(H / 48));
  mark(3 * s, 3 * s, 2 * s, 2 * s, [226, 60, 52]);
  mark(6 * s, 3 * s, 7 * s, s, [231, 195, 107]);
  mark(3 * s, H - 4 * s, 10 * s, s, [231, 195, 107]);
  return out;
}
