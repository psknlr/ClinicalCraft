/**
 * What the player holds, seen in first person: their right hand out of a white-coat sleeve, the chest piece
 * of their stethoscope under the tips of the fingers — the stem between the index and the middle finger, the
 * diaphragm turned to the patient — and the tubing running back past the wrist. One mesh of the figure
 * material; `overlay.ts` hangs it on the camera.
 */
import { Group, Matrix4, Mesh, Vector3 } from "three";
import { addHand, HAND_HOLD } from "./body.js";
import { SKIN_GLOW } from "./head.js";
import { figureMaterial } from "./material.js";
import { paint, rgb, shade, Sculpt, type Paint, type V3 } from "./sculpt.js";
import { addChestPiece, addTubing, STEM_END } from "./stethoscope.js";

/** The hand's frame in the overlay's hand group: where the wrist is, which way the fingers point and the palm faces. */
const WRIST = new Vector3(0.02, 0.15, 0.13);
const FINGERS = new Vector3(-0.5, 0.66, -0.56).normalize();
const PALM = new Vector3(-0.6, -0.5, -0.62).normalize();
/** How much larger than life it is drawn (it is held closer to the eye than the hand group sits). */
const SCALE = 2.0;

/** The held stethoscope and the hand holding it (see the module doc). */
export function buildHeld(skinHex = "#e2c1a4"): Group {
  const sc = new Sculpt();
  const skin: Paint = { rgb: rgb(skinHex), gloss: 0.16, glow: SKIN_GLOW };
  const nail: Paint = { rgb: shade(rgb(skinHex), 1.12), gloss: 0.55, glow: SKIN_GLOW };
  const coat = paint("#f1f2ee");
  const cuff = paint("#7fa9c4");
  // a left hand is built; the player's right is its mirror
  const mirror = new Matrix4().makeScale(-1, 1, 1);
  sc.within(mirror, () => {
    addHand(sc, skin, HAND_HOLD, { detail: true, nail });
    // the wrist, a shirt cuff, and the coat's sleeve back to the elbow
    sc.sweep([{ p: [0, -0.06, 0.002], rx: 0.0268, rz: 0.0205 }, { p: [0, -0.008, 0], rx: 0.0262, rz: 0.019 }], skin, { seg: 14, start: "open", end: "open" });
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
    // the chest piece under the fingertips: the diaphragm away from the palm, the stem back between the fingers
    const piece = new Matrix4().makeRotationX(Math.PI).setPosition(0.019, 0.138, -0.078);
    sc.within(piece, () => addChestPiece(sc, 28));
    const stem = new Vector3(0, STEM_END - 0.004, -0.0024).applyMatrix4(piece);
    const pts: V3[] = [
      [stem.x, stem.y, stem.z],
      [stem.x - 0.002, stem.y - 0.03, stem.z + 0.004],
      [stem.x - 0.012, 0.02, -0.058],
      [-0.03, -0.06, -0.05],
      [-0.05, -0.17, -0.03],
      [-0.075, -0.3, 0.0],
      [-0.09, -0.46, 0.03],
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
