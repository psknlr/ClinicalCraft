/**
 * What the player holds, seen in first person: their right hand (`hand.ts`, in full detail) out of a shirt cuff
 * and a white-coat sleeve, the chest piece of their stethoscope pinched by its near edge between the thumb and
 * the first two fingers — the diaphragm turned away to the patient, the stem back between the two fingers — and
 * the tubing trailing back over the hand. One mesh of the figure material; `overlay.ts` hangs it on the camera.
 */
import { Group, Matrix4, Mesh, Vector3 } from "three";
import { addHand, HAND_HOLD } from "./hand.js";
import { SKIN_GLOW } from "./head.js";
import { figureMaterial } from "./material.js";
import { paint, rgb, shade, Sculpt, type Paint, type V3 } from "./sculpt.js";
import { addChestPiece, addTubing, STEM_END } from "./stethoscope.js";

/** The hand's frame in the overlay's hand group: where the wrist is, which way the fingers point and the palm faces. */
const WRIST = new Vector3(0.0, 0.17, 0.12);
const FINGERS = new Vector3(-0.5, 0.66, -0.56).normalize();
const PALM = new Vector3(-0.6, -0.5, -0.62).normalize();
/** How much larger than life it is drawn (it is held closer to the eye than the hand group sits). */
const SCALE = 1.8;

/** The held stethoscope and the hand holding it (see the module doc). */
export function buildHeld(skinHex = "#dbb597"): Group {
  const sc = new Sculpt();
  const skin: Paint = { rgb: rgb(skinHex), gloss: 0.24, glow: SKIN_GLOW };
  const coat = paint("#f1f2ee");
  const cuff = paint("#7fa9c4");
  // a left hand is built; the player's right is its mirror
  const mirror = new Matrix4().makeScale(-1, 1, 1);
  sc.within(mirror, () => {
    const pads = addHand(sc, skin, HAND_HOLD, { detail: true });
    // the wrist, a shirt cuff, and the coat's sleeve back to the elbow
    sc.sweep([{ p: [0, -0.09, 0.002], rx: 0.0285, rz: 0.021, back: 0.021 }, { p: [0, -0.05, 0.001], rx: 0.0268, rz: 0.0192, back: 0.0196 }, { p: [0, -0.02, 0], rx: 0.0262, rz: 0.0186, back: 0.019 }], skin, { seg: 16, start: "open", end: "open" });
    // the knob of the wrist on the little finger's side
    sc.ball([-0.0205, -0.022, 0.0165], 0.0075, 0.009, 0.0045, skin, 8, 5);
    sc.sweep([{ p: [0, -0.2, 0.004], rx: 0.036, rz: 0.03 }, { p: [0, -0.046, 0.002], rx: 0.0312, rz: 0.0255 }, { p: [0, -0.03, 0.002], rx: 0.0308, rz: 0.025 }], cuff, { seg: 14, start: "open", end: "flat", capPaint: { rgb: shade(cuff.rgb, 0.5), gloss: 0 } });
    sc.sweep(
      [
        { p: [0.004, -0.46, 0.012], rx: 0.058, rz: 0.054 },
        { p: [0.002, -0.3, 0.008], rx: 0.05, rz: 0.045 },
        { p: [0, -0.11, 0.004], rx: 0.0405, rz: 0.035 },
        { p: [0, -0.05, 0.003], rx: 0.039, rz: 0.0335 },
      ],
      coat,
      { seg: 16, start: "open", end: "flat", capPaint: { rgb: shade(coat.rgb, 0.5), gloss: 0 } },
    );
    // the chest piece pinched by its near edge between the thumb's pad and the pads of the index and the middle
    // finger: the diaphragm looks away from the hand, the stem runs back between the fingers
    const fingers = pads.fingers[0]!.clone().add(pads.fingers[1]!).multiplyScalar(0.5);
    const away = fingers.clone().sub(pads.thumb).normalize();
    const reach = pads.pointing[0]!.clone().add(pads.pointing[1]!);
    reach.addScaledVector(away, -reach.dot(away)).normalize();
    const centre = fingers.clone().add(pads.thumb).multiplyScalar(0.5).addScaledVector(reach, 0.017).addScaledVector(away, 0.002);
    const stemDir = reach.clone().multiplyScalar(-1);
    const piece = new Matrix4().makeBasis(new Vector3().crossVectors(stemDir, away), stemDir, away).setPosition(centre);
    sc.within(piece, () => addChestPiece(sc, 28));
    const stem = new Vector3(0, STEM_END - 0.004, -0.0024).applyMatrix4(piece);
    // the tubing comes up between the two fingers and trails back over the hand, then falls away beside the wrist
    const pts: V3[] = [
      [stem.x, stem.y, stem.z],
      [stem.x + stemDir.x * 0.02, stem.y + stemDir.y * 0.02, stem.z + stemDir.z * 0.02],
      [0.019, 0.116, 0.014],
      [0.027, 0.07, 0.031],
      [0.037, 0.0, 0.03],
      [0.042, -0.1, 0.004],
      [0.036, -0.25, -0.06],
      [0.03, -0.46, -0.11],
    ];
    addTubing(sc, pts, undefined, 10, 5);
  });
  const mesh = new Mesh(sc.geometry(), figureMaterial());
  mesh.userData.figure = true;
  mesh.frustumCulled = false;
  const y = FINGERS.clone();
  const z = PALM.clone().multiplyScalar(-1);
  z.addScaledVector(y, -z.dot(y)).normalize();
  const x = new Vector3().crossVectors(y, z);
  const g = new Group();
  g.name = "held";
  g.applyMatrix4(new Matrix4().makeBasis(x, y, z).scale(new Vector3(SCALE, SCALE, SCALE)).setPosition(WRIST));
  g.add(mesh);
  return g;
}
