/**
 * What is worn on the head: a theatre cap, a surgical mask, glasses, a nasal cannula, an oxygen mask, a peaked
 * cap. Opaque parts go into the head's geometry, see-through ones (lenses, the shell of an oxygen mask) into
 * `clear`.
 */
import { EYE_X, EYE_Y, HEAD_CENTRE, MOUTH_Y, hairlineAt, phiOfHeight, type FaceSpec } from "./head.js";
import { addScalpShell, scalpPoint, type HairStyle } from "./hair.js";
import { mix, rgb, shade, type Paint, type Rgb, type Sculpt, type V3 } from "./sculpt.js";

export type Accessory = "none" | "glasses" | "mask" | "nasal-cannula" | "oxygen-mask" | "sling" | "cap";

const gauss = (x: number, c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));

/** A point of the head's surface at height `y` above its centre, `theta` round it, `lift` off it. */
function onHead(theta: number, y: number, face: FaceSpec, lift: number): V3 {
  return scalpPoint(theta, phiOfHeight(theta, y, face), face, lift);
}

/** A theatre cap over the hair (fuller behind when there is long hair to hold); returns its top above the head's joint. */
export function addTheatreCap(sc: Sculpt, face: FaceSpec, paint: Paint, style: HairStyle): number {
  const full = style === "long" || style === "bun" || style === "ponytail" || style === "curly" ? 1 : 0.35;
  const cloth = (x: number, y: number, z: number): Paint => {
    // the gathers of the cloth: faint folds running down to the band
    const a = Math.atan2(x - HEAD_CENTRE[0], z - HEAD_CENTRE[2]);
    return { rgb: shade(paint.rgb, 0.97 + 0.04 * Math.sin(a * 19 + y * 30)), gloss: 0 };
  };
  const drop = (t: number) => 0.007 + 0.012 * gauss(Math.abs(t), 1.55, 0.5) + 0.004 * gauss(Math.abs(t), Math.PI, 0.9);
  const top = addScalpShell(sc, face, cloth, (t, s) => 0.011 + 0.006 * Math.sin(s * Math.PI) + full * 0.02 * gauss(Math.abs(t), Math.PI, 1.0) * Math.sin(Math.min(1, s * 1.2) * Math.PI) + 0.0012 * Math.sin(t * 19) * s, drop);
  // the band the cap is gathered into
  const band: V3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = -Math.PI + (i / 40) * Math.PI * 2;
    band.push(onHead(t, hairlineAt(t, face) - drop(t) + 0.004, face, 0.0105));
  }
  sc.sweep(band.map((p) => ({ p, rx: 0.0052, rz: 0.0022 })), { rgb: shade(paint.rgb, 0.88), gloss: 0 }, { seg: 6, front: [0, 0, -1], start: "open", end: "open" });
  return top;
}

/** A surgical mask: pleated, from the bridge of the nose to under the chin, a loop round each ear. */
export function addSurgicalMask(sc: Sculpt, face: FaceSpec): void {
  const e = EYE_Y - 0.012 * face.young, m = MOUTH_Y + 0.006 * face.young;
  const top = e - 0.014, bottom = -0.108;
  const span = 1.08;
  const cloth: Rgb = rgb("#d5e6ee");
  const nu = 15, nv = 9;
  const at = (u: number, v: number): V3 => {
    const theta = (u * 2 - 1) * span;
    const y = top + (bottom - top) * v;
    // it stands off the face over the nose and the mouth, and lies on the cheeks; three pleats across
    const mid = gauss(theta, 0, 0.5);
    const tent = 0.0035 + 0.015 * mid * gauss(y, m + 0.012, 0.03) + 0.004 * mid;
    const pleat = 0.0011 * Math.sin(v * Math.PI * 7) * (0.4 + 0.6 * mid);
    const p = onHead(theta, y, face, tent + pleat);
    // under the chin it tucks back
    return v > 0.9 ? [p[0], p[1], p[2] - 0.008 * ((v - 0.9) / 0.1)] : p;
  };
  sc.sheet(nu, nv, (i, j) => at(i / (nu - 1), 1 - j / (nv - 1)), (_x, y) => ({ rgb: shade(cloth, y - HEAD_CENTRE[1] > top - 0.006 ? 1.06 : 1), gloss: 0 }), { thickness: 0.002 });
  // ear loops
  const loop: Paint = { rgb: rgb("#f4f6f4"), gloss: 0.1 };
  for (const s of [-1, 1]) {
    sc.tube(
      [at(s > 0 ? 1 : 0, 0.06), onHead(s * 1.42, e - 0.004, face, 0.006), onHead(s * 1.72, e + 0.016, face, 0.009), onHead(s * 1.98, e - 0.012, face, 0.007), onHead(s * 1.8, e - 0.05, face, 0.006), onHead(s * 1.4, -0.085, face, 0.005), at(s > 0 ? 1 : 0, 0.88)],
      0.0011,
      loop,
      { seg: 4, steps: 3 },
    );
  }
}

/** A peaked cap; returns its top above the head's joint. */
function addPeakedCap(sc: Sculpt, face: FaceSpec, paint: Paint): number {
  const drop = (t: number) => 0.012 * gauss(t, 0, 1.0) + 0.006;
  const top = addScalpShell(sc, face, paint, (_t, s) => 0.0105 + 0.004 * Math.sin(s * Math.PI), drop);
  const nu = 11, nv = 5;
  sc.sheet(
    nu,
    nv,
    (i, j) => {
      const u = (i / (nu - 1)) * 2 - 1, v = j / (nv - 1);
      const theta = u * 0.82;
      const base = onHead(theta, hairlineAt(theta, face) - drop(theta) + 0.005, face, 0.009);
      const reach = 0.072 * v * Math.pow(Math.cos(u * 1.25), 0.8);
      return [base[0] + Math.sin(theta) * reach * 0.55, base[1] - 0.016 * v * v - 0.004 * u * u * v, base[2] + Math.cos(theta * 0.6) * reach];
    },
    { rgb: shade(paint.rgb, 0.9), gloss: 0 },
    { thickness: 0.0036 },
  );
  const tip = scalpPoint(0, 0, face, 0.0145);
  sc.ball(tip, 0.006, 0.003, 0.006, { rgb: shade(paint.rgb, 0.85), gloss: 0 }, 8, 4);
  return top;
}

/** An accessory of an appearance; returns the top of what it adds above the head's joint (0: nothing above the hair). */
export function addAccessory(sc: Sculpt, clear: Sculpt, accessory: Accessory, face: FaceSpec, faceZ: (x: number, y: number) => number, tones: { shirt: Rgb; skin: Rgb }): number {
  const e = EYE_Y - 0.012 * face.young, m = MOUTH_Y + 0.006 * face.young;
  const cx = HEAD_CENTRE[0], cy = HEAD_CENTRE[1], cz = HEAD_CENTRE[2];
  switch (accessory) {
    case "glasses": {
      // thin round metal frames, the lenses barely there
      const frame: Paint = { rgb: rgb("#3a3532"), gloss: 0.75 };
      const z = faceZ(EYE_X, e) + cz + 0.0125;
      const rx = 0.0212, ry = 0.0178;
      for (const s of [-1, 1]) {
        const rim: V3[] = [];
        for (let i = 0; i <= 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          // a soft square: rounder below than above; the lens wraps a little round the face
          const k = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), 2.6) + Math.pow(Math.abs(Math.sin(a)), 2.6), 1 / 2.6);
          const x = Math.cos(a) * rx * k;
          rim.push([cx + s * (EYE_X + 0.0008) + x, cy + e - 0.0012 + Math.sin(a) * ry * k, z - 0.0035 * (s * x > 0 ? (s * x) / rx : 0)]);
        }
        sc.tube(rim, 0.00095, frame, { seg: 5, start: "open", end: "open" });
        // the arm back to the ear, hooked behind it
        sc.tube([[cx + s * (EYE_X + rx * 0.98), cy + e + 0.004, z - 0.004], onHead(s * 1.1, e + 0.006, face, 0.005), onHead(s * 1.6, e + 0.01, face, 0.006), onHead(s * 1.86, e - 0.006, face, 0.006), onHead(s * 1.9, e - 0.022, face, 0.005)], 0.0009, frame, { seg: 4, steps: 2 });
      }
      sc.tube([[cx - (EYE_X - rx * 0.92), cy + e + 0.004, z], [cx, cy + e + 0.0075, z + 0.0012], [cx + (EYE_X - rx * 0.92), cy + e + 0.004, z]], 0.00095, frame, { seg: 5, steps: 3 });
      return 0;
    }
    case "nasal-cannula": {
      const tube: Paint = { rgb: rgb("#dcefeb"), gloss: 0.55 };
      const under = (x: number): V3 => [cx + x, cy + e - 0.0445, faceZ(x, e - 0.0445) + cz + 0.003];
      for (const s of [-1, 1]) {
        // from under the nose across the cheek, over the ear, and down under the chin
        sc.tube([under(0), under(s * 0.012), onHead(s * 0.55, e - 0.04, face, 0.003), onHead(s * 1.15, e - 0.02, face, 0.003), onHead(s * 1.62, e + 0.017, face, 0.008), onHead(s * 1.95, e - 0.005, face, 0.006), onHead(s * 1.85, -0.07, face, 0.006), [cx + s * 0.03, cy - 0.13, cz + 0.035], [cx, cy - 0.155, cz + 0.05]], 0.0016, tube, { seg: 5, steps: 3 });
        // a prong into each nostril
        sc.tube([under(s * 0.0062), [cx + s * 0.0062, cy + e - 0.0405, faceZ(s * 0.0062, e - 0.0405) + cz - 0.001]], 0.0014, tube, { seg: 5 });
      }
      // the slide under the chin and the single tube on from it
      sc.ball([cx, cy - 0.155, cz + 0.05], 0.004, 0.005, 0.004, tube, 8, 4);
      sc.tube([[cx, cy - 0.158, cz + 0.05], [cx + 0.004, cy - 0.2, cz + 0.058], [cx + 0.012, cy - 0.25, cz + 0.07]], 0.002, tube, { seg: 5, steps: 3 });
      return 0;
    }
    case "oxygen-mask": {
      // a clear mask over nose and mouth, its rim on the face, a strap round the head, green tubing from its port
      const centre: V3 = [cx, cy + m + 0.014, faceZ(0, m + 0.014) + cz - 0.002];
      const rings: number[][] = [];
      const seg = 16;
      const rimPts: V3[] = [];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * (Math.PI / 2);
        const ring: number[] = [];
        for (let j = 0; j < seg; j++) {
          const b = (j / seg) * Math.PI * 2;
          const x = Math.cos(b) * 0.039 * Math.cos(a), y = -Math.sin(b) * 0.047 * Math.cos(a) * (Math.sin(b) > 0 ? 0.92 : 1.08);
          // the rim follows the face; the dome stands off it
          const zRim = faceZ(x, m + 0.014 + y) + cz + 0.0015;
          ring.push(centre[0] + x, centre[1] + y, k === 0 ? zRim : centre[2] + 0.004 + 0.034 * Math.sin(a));
          if (k === 0) rimPts.push([centre[0] + x, centre[1] + y, zRim]);
        }
        rings.push(ring);
      }
      clear.rings(rings, seg, { rgb: rgb("#cfeee0"), gloss: 0.9 }, { endPole: [centre[0], centre[1] - 0.004, centre[2] + 0.04] });
      const soft: Paint = { rgb: rgb("#bfe3d4"), gloss: 0.5 };
      sc.tube([...rimPts, rimPts[0]!], 0.0017, soft, { seg: 4, start: "open", end: "open" });
      // the port and the oxygen tubing
      sc.sweep([{ p: [centre[0], centre[1] - 0.03, centre[2] + 0.03], rx: 0.007, rz: 0.007 }, { p: [centre[0], centre[1] - 0.05, centre[2] + 0.034], rx: 0.0062, rz: 0.0062 }], { rgb: rgb("#e8eeea"), gloss: 0.5 }, { seg: 8, front: [0, 0, 1], start: "flat", end: "flat" });
      sc.tube([[centre[0], centre[1] - 0.05, centre[2] + 0.034], [centre[0] + 0.004, centre[1] - 0.1, centre[2] + 0.03], [centre[0] + 0.014, centre[1] - 0.17, centre[2] + 0.02], [centre[0] + 0.03, centre[1] - 0.24, centre[2] + 0.025]], 0.003, { rgb: rgb("#8fd0b3"), gloss: 0.5 }, { seg: 6, steps: 3 });
      // the elastic round the head
      const strap: V3[] = [rimPts[0]!];
      for (let i = 0; i <= 10; i++) {
        const t = 0.95 + (i / 10) * (Math.PI * 2 - 1.9);
        strap.push(onHead(t, e - 0.03 + 0.016 * gauss(Math.abs(t - Math.PI), 0, 1.4), face, 0.012));
      }
      strap.push(rimPts[seg / 2]!);
      sc.tube(strap, 0.0014, { rgb: rgb("#f1f3f0"), gloss: 0.1 }, { seg: 4, steps: 2 });
      return 0;
    }
    case "cap":
      return addPeakedCap(sc, face, { rgb: mix(tones.shirt, [0.02, 0.02, 0.03], 0.25), gloss: 0 });
    default:
      return 0;
  }
}
