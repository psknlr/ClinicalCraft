/**
 * A body drawn with equipment (`EquipmentType.manikin`, docs/FACILITIES.md): the patient simulator of a training
 * station, a manikin on a trolley. It is one of the world's own figures (`npc.ts` — the people of the world are
 * drawn the same way) put where the type says, and it is nobody: no name tag, no aim target of its own (the aim
 * finds the equipment), no part in the world model. What it is like may follow the equipment's state (a state's
 * `look`: covered differently, its chest moving or still) — `live.ts` rebuilds or animates it.
 */
import { Vector3 } from "three";
import { manikinCover, type DrawnManikin, type EquipmentManikin } from "@clinicalcraft/core";
import { bendPoint } from "./figure/bend.js";
import { DEG, rotateXZ } from "./geometry.js";
import { buildPerson, PLAIN_WEAR, type AppearanceLike, type PersonOptions, type PersonRig } from "./npc.js";

/**
 * How a manikin is drawn: its looks and the figure's options (`seed`: the placement, so two stations' manikins are
 * two figures). `m` is the manikin as it is in a state (`lookOf`) — or a type's as written, the drapes perhaps in
 * their earlier spelling (`draped`): how its chest moves is not the figure's, the world animates it (`breathOf`).
 */
export function manikinFigure(m: DrawnManikin | EquipmentManikin, seed: string): { appearance: AppearanceLike; options: PersonOptions } {
  const lateral = m.posture === "lateral";
  const cover = lateral ? manikinCover(m as EquipmentManikin) : "clothes";
  return {
    appearance: { ...(m.appearance ?? {}) },
    options: {
      posture: m.posture,
      surfaceY: m.posture === "standing" ? undefined : (m.y ?? 0),
      // undressed on the table, under a blanket or the drapes: nothing on but a theatre cap
      wear: cover !== "clothes" ? { ...PLAIN_WEAR, cap: true } : PLAIN_WEAR,
      seed: `manikin:${seed}`,
      asleep: !!m.asleep,
      ...(lateral ? { up: m.sideUp ?? "left", cover, flex: m.flex ?? 0 } : {}),
    },
  };
}

/**
 * The manikin of a placement at world (x, y, z) turned `rot` degrees — `y`: the placement's own floor. The rig's
 * root is where the type puts the body (its frame turns with the placement, as the type's parts do).
 */
export function buildManikin(m: DrawnManikin | EquipmentManikin, at: { x: number; y: number; z: number; rot: number }, seed: string): PersonRig {
  const { appearance, options } = manikinFigure(m, seed);
  const rig = buildPerson(appearance, options);
  const [wx, wz] = rotateXZ(m.x ?? 0, m.z ?? 0, at.rot);
  rig.root.name = "manikin";
  rig.root.position.set(at.x + wx, at.y + (m.posture === "standing" ? (m.y ?? 0) : 0), at.z + wz);
  rig.root.rotation.y = (at.rot + (m.rot ?? 0)) * DEG;
  return rig;
}

/** A ventilator's rhythm: twelve breaths a minute, a third of each breathing in. */
const BREATH_MS = 5000;
const INSPIRATION = 1 / 3;

/**
 * How far a manikin's chest is out at time `now` (ms): [depth, rise] for `setBreath` — nothing for one that does
 * not breathe; in and out with both lungs; and with one lung, on its side, the chest wall that is up all but
 * still (the lung under it is down) while the rest moves a little. The wall that is up rises by a millimetre at
 * most: what a model puts on that skin — marks, ports, dressings — does not move with it, and must not sink in.
 */
export function breathOf(m: Pick<EquipmentManikin, "breathing" | "posture">, now: number, phase = 0): [number, number] {
  if (!m.breathing || m.breathing === "none") return [0, 0];
  const t = (((now / BREATH_MS + phase) % 1) + 1) % 1;
  // in over a third of the breath, out — quickly at first — over the rest
  const filled = t < INSPIRATION ? 0.5 - 0.5 * Math.cos((Math.PI * t) / INSPIRATION) : Math.exp(-4.2 * ((t - INSPIRATION) / (1 - INSPIRATION))) * (1 - (t - INSPIRATION) / (1 - INSPIRATION) * 0.02);
  const lateral = m.posture === "lateral";
  if (m.breathing === "one-lung") return [0.012 * filled, lateral ? 0.0015 * filled : 0];
  return [0.024 * filled, lateral ? 0.006 * filled : 0];
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
