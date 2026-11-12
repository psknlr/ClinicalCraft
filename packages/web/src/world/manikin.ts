/**
 * A body drawn with equipment (`EquipmentType.manikin`, docs/FACILITIES.md): the patient simulator of a training
 * station, a manikin on a trolley. It is one of the world's own figures (`npc.ts` — the people of the world are
 * drawn the same way) put where the type says, and it is nobody: no name tag, no aim target of its own (the aim
 * finds the equipment), no part in the world model, and it does not move.
 */
import { Vector3 } from "three";
import type { EquipmentManikin } from "@clinicalcraft/core";
import { bendPoint } from "./figure/bend.js";
import { DEG, rotateXZ } from "./geometry.js";
import { buildPerson, PLAIN_WEAR, type AppearanceLike, type PersonOptions, type PersonRig } from "./npc.js";

/** How a manikin is drawn: its looks and the figure's options (`seed`: the placement, so two stations' manikins are two figures). */
export function manikinFigure(m: EquipmentManikin, seed: string): { appearance: AppearanceLike; options: PersonOptions } {
  const lateral = m.posture === "lateral";
  const draped = lateral && !!m.draped;
  return {
    appearance: { ...(m.appearance ?? {}) },
    options: {
      posture: m.posture,
      surfaceY: m.posture === "standing" ? undefined : (m.y ?? 0),
      // draped for theatre: nothing on but a theatre cap
      wear: draped ? { ...PLAIN_WEAR, cap: true } : PLAIN_WEAR,
      seed: `manikin:${seed}`,
      asleep: !!m.asleep,
      ...(lateral ? { up: m.sideUp ?? "left", draped, flex: m.flex ?? 0 } : {}),
    },
  };
}

/**
 * The manikin of a placement at world (x, y, z) turned `rot` degrees — `y`: the placement's own floor. The rig's
 * root is where the type puts the body (its frame turns with the placement, as the type's parts do).
 */
export function buildManikin(m: EquipmentManikin, at: { x: number; y: number; z: number; rot: number }, seed: string): PersonRig {
  const { appearance, options } = manikinFigure(m, seed);
  const rig = buildPerson(appearance, options);
  const [wx, wz] = rotateXZ(m.x ?? 0, m.z ?? 0, at.rot);
  rig.root.name = "manikin";
  rig.root.position.set(at.x + wx, at.y + (m.posture === "standing" ? (m.y ?? 0) : 0), at.z + wz);
  rig.root.rotation.y = (at.rot + (m.rot ?? 0)) * DEG;
  return rig;
}

/**
 * Where a point of a rig's own upright figure frame (`figure/anatomy.ts`: a joint, a point of the trunk's surface)
 * is once the body is bent over its table and laid down — in the frame the rig's root is in. A model that has to
 * fit the body (a support under an arm, a port through the chest wall) is built from these (docs/BLENDER.md).
 */
export function placedPoint(rig: PersonRig, p: readonly [number, number, number]): Vector3 {
  const at = rig.bend ? bendPoint(rig.bend, p[0], p[1]) : { x: p[0], y: p[1] };
  rig.root.updateMatrixWorld(true);
  return new Vector3(at.x, at.y, p[2]).applyMatrix4(rig.body.matrixWorld);
}

/** Where a point of the head's own frame (`figure/skull.ts`: the mouth, the crown) is, in the frame the rig's root is in. */
export function placedHeadPoint(rig: PersonRig, p: readonly [number, number, number]): Vector3 {
  rig.root.updateMatrixWorld(true);
  return new Vector3(p[0], p[1], p[2]).applyMatrix4(rig.head.matrixWorld);
}
