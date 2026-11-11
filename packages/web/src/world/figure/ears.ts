/**
 * The ears of a head (`skull.ts`): each a shell on the side of the head from the level of the brow to the level of
 * the nose's tip, its top a little further back than its lobe. Its front edge lies on the head and its back edge
 * stands a centimetre off it; a rolled rim runs round the top and down the back to a soft lobe; inside the rim a
 * shallow groove, then the ridge round the hollow, the hollow itself in shade, and before it the small flap that
 * guards it. One closed mesh an ear, so its rim shades round.
 */
import { Vector3 } from "three";
import { mix, rgb, shade, type Paint, type Rgb, type Sculpt } from "./sculpt.js";
import { SKIN_GLOW, featureHeights, phiOfHeight, skullPoint, type FaceSpec } from "./skull.js";

/** Round the head from the face to where an ear is (radians). */
const EAR_AT = 1.64;
const SEG = 24;
/** From the hollow out to the rim: how far out (a share of the ear's outline), how high the surface stands against the ear's own plane (m), and how light it is. */
const RINGS: readonly (readonly [number, number, number])[] = [
  [0.2, -0.0058, 0.66],
  [0.38, -0.0048, 0.76],
  [0.54, -0.0006, 1],
  [0.7, -0.0024, 0.88],
  [0.86, 0.0002, 1],
  [1, 0.0008, 1.03],
];
const ROSE = rgb("#c9666a");

/** The ears on `sides` (−1 the figure's right, 1 its left) of a head, as skin. */
export function addEars(sc: Sculpt, face: FaceSpec, skin: Rgb, sides: readonly number[] = [-1, 1]): void {
  const e = featureHeights(face).eye;
  // (a child's ears are nearly their grown size on a smaller face)
  const size = 1 - 0.1 * face.young;
  const high = 0.0305 * size;
  const flesh = mix(skin, ROSE, 0.1);
  for (const s of sides) {
    const theta = s * EAR_AT;
    const top = skullPoint(theta, phiOfHeight(theta, e + 0.021, face), face), bottom = skullPoint(theta, phiOfHeight(theta, e - 0.037, face), face);
    // (its plane touches the head at its middle: the head is round, so its top and its lobe stand a little off)
    const o = skullPoint(theta, phiOfHeight(theta, e - 0.008, face), face);
    // the ear's own frame: up along the head (the top leaning back), back along it, and out from it
    const up = top.clone().sub(bottom);
    up.z -= 0.24 * up.length();
    up.normalize();
    const back = new Vector3(0, 0, -1);
    back.addScaledVector(up, -back.dot(up)).normalize();
    const out = new Vector3().crossVectors(up, back);
    if (out.x * s < 0) out.negate();
    /** The outline: how far from the hollow the rim is, round from the back (0) by the top (π/2), the front and the lobe. */
    const reach = (a: number): number => {
      const c = Math.cos(a), sn = Math.sin(a);
      // broad at the back and the top, close at the front where it joins the head, narrow at the lobe
      const wide = (c > 0 ? 0.0158 : 0.0118) * size * (1 - 0.34 * Math.pow(Math.max(0, -sn), 1.6));
      return 1 / Math.sqrt((c / wide) ** 2 + (sn / high) ** 2);
    };
    const at = (a: number, share: number, lift: number): Vector3 => {
      const r = reach(a) * share;
      const b = Math.cos(a) * r, h = Math.sin(a) * r - 0.002 * size;
      // off the head: hardly at the front edge, a centimetre and more at the back
      const off = 0.0012 + 0.0098 * size * Math.pow(Math.min(1, Math.max(0, (b + 0.0118 * size) / (0.0276 * size))), 1.25);
      // (the hollow is never deeper than the ear stands off the head)
      return o.clone().addScaledVector(up, h).addScaledVector(back, b).addScaledVector(out, Math.max(0.0007, off + lift));
    };
    const points: number[] = [], paints: Paint[] = [], tris: number[] = [];
    const put = (p: Vector3, light: number, gloss = 0.14): number => {
      points.push(p.x, p.y, p.z);
      paints.push({ rgb: mix(shade(flesh, light), ROSE, light < 0.8 ? 0.16 : 0), gloss, glow: SKIN_GLOW });
      return paints.length - 1;
    };
    const tri = (a: number, b: number, c: number) => (s > 0 ? tris.push(a, b, c) : tris.push(a, c, b));
    const ring = (share: number, lift: (a: number) => number, light: number): number[] =>
      Array.from({ length: SEG }, (_, k) => {
        const a = (k / SEG) * Math.PI * 2;
        return put(at(a, share, lift(a)), light);
      });
    // the relief is the upper ear's: it fades into the lobe, and towards the cheek, where the small flap stands
    const relief = (a: number) => (1 - 0.8 * Math.pow(Math.max(0, -Math.sin(a)), 2)) * (1 - 0.45 * Math.pow(Math.max(0, -Math.cos(a)), 2));
    const flap = (a: number) => Math.exp(-(((a - Math.PI) / 0.42) ** 2));
    const rings = RINGS.map(([share, lift, light], i) => ring(share, (a) => lift * relief(a) + (i === 2 || i === 3 ? 0.0026 * flap(a) : 0), light));
    // the hollow's middle lies towards the front of it (where the ear's opening is)
    const middle = put(at(Math.PI, 0.08, -0.0062), 0.5);
    for (let k = 0; k < SEG; k++) tri(middle, rings[0]![k]!, rings[0]![(k + 1) % SEG]!);
    const join = (inner: readonly number[], outer: readonly number[]) => {
      for (let k = 0; k < SEG; k++) {
        const l = (k + 1) % SEG;
        tri(inner[k]!, outer[k]!, outer[l]!);
        tri(inner[k]!, outer[l]!, inner[l]!);
      }
    };
    for (let i = 0; i + 1 < rings.length; i++) join(rings[i]!, rings[i + 1]!);
    // behind the rim: round it and back down to the head
    const behind = ring(0.9, () => -0.0034, 0.9), root = ring(0.6, (a) => -(0.0012 + 0.0098 * size * Math.pow(Math.min(1, Math.max(0, (Math.cos(a) * reach(a) * 0.6 + 0.0118 * size) / (0.0276 * size))), 1.25)) - 0.0015, 0.84);
    join(rings[rings.length - 1]!, behind);
    join(behind, root);
    sc.tagged("skin", () => sc.mesh(points, tris, paints));
  }
}
