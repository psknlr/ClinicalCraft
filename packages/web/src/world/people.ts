/**
 * The people of a voxel world: patients in their slots and staff at their posts, as voxel rigs with a name tag
 * (tags face the camera and never take the aim ray), an aim target and the collision model's body. A patient is
 * drawn where the world model has them (EMBODIED §8): in their own bed space (lying on the bed, sitting on it,
 * or standing), at a spot (a scanner table, another bed space), or travelling with a walker — on the trolley
 * it pushes, else just ahead of it, with no collider meanwhile. A posture or accessory change rebuilds the rig.
 */
import { MathUtils, type Object3D } from "three";
import { entityLevel } from "@clinicalcraft/core";
import { npcBodyBox, patientBodyBox } from "@clinicalcraft/world";
import type { InteractionTarget, PatientSpot, WorldApi, WorldPatient } from "../contracts.js";
import type { NpcRecord } from "./context.js";
import { rigRotationOf, yawOfRig } from "./embodiment.js";
import { surfaceTop, surfaceUnder } from "./equipment.js";
import { buildPerson, disposeRig, ROLE_UNIFORMS, setDistressed, type AppearanceLike, type Posture } from "./npc.js";
import { PUSH_AHEAD } from "./portable.js";
import { roleName, tx } from "./strings.js";
import type { VoxelWorld } from "./voxel-world.js";

/** Name tags / labels never take the aim ray. */
function noRaycast(o: Object3D): void {
  o.traverse((c) => (c.raycast = () => {}));
}

/** Patients and staff of one world. */
export class People {
  /** Patients by slot id. */
  readonly patients = new Map<string, WorldPatient>();
  /** Where the world model has a patient when not in their own bed space (EMBODIED §8): slot → spot. */
  readonly patientSpots = new Map<string, PatientSpot>();
  /** Patients travelling with a walker ("avatar" or a staff id): slot → walker (drawn on its trolley or ahead of it). */
  readonly patientPushes = new Map<string, string>();
  /** Name tags (turned towards the camera every frame). */
  readonly tagSigns: Object3D[] = [];

  constructor(private readonly world: VoxelWorld) {
    for (const p of world.opts.patients ?? []) this.place(p);
    this.buildStaff();
  }

  /** Draw a patient where the world model has them (their slot, a spot, or travelling with a walker). */
  place(p: WorldPatient): void {
    const { facility, ctx, levels, lib, signs, S, merged, levelRoots, colliderLevels, stage } = this.world;
    const root = stage.root;
    const { patientSpots, patientPushes, tagSigns } = this;
    const slot = facility.patientSlots.find((s) => s.id === p.slotId);
    if (!slot) {
      ctx.warnings.push(`unknown patient slot "${p.slotId}"`);
      return;
    }
    // where the world model has them: their own bed space, or a spot (a scanner table, another bed space…)
    const spot = patientSpots.get(p.slotId) ?? null;
    const slotLevel = spot ? spot.level : entityLevel(facility, slot);
    const elevation = levels.elevation(slotLevel);
    const old = ctx.npcs.get(`patient:${p.slotId}`);
    if (old) this.remove(old);
    const posture: Posture = spot ? spot.posture : (p.posture ?? slot.posture ?? "standing");
    const bed = spot ? (spot.support ? ctx.placements.get(spot.support) : undefined) : slot.bed ? ctx.placements.get(slot.bed) : undefined;
    let x = spot ? spot.x : slot.x, z = spot ? spot.z : slot.z, rot = spot ? spot.rot : (slot.rot ?? 0);
    let surface: number | undefined;
    // on a support at a spot (a scanner's table): the top of what is under the patient there, not the gantry
    const top = (b: NonNullable<typeof bed>) => b.y + (spot ? surfaceUnder(b.type, b.rot, x - b.x, z - b.z) : surfaceTop(b.type));
    if (posture === "lying") {
      if (bed) {
        surface = top(bed);
        x = bed.x;
        z = bed.z;
        rot = bed.rot;
      } else surface = 0.05;
    } else if (posture === "sitting") {
      surface = bed ? top(bed) : 0.5;
    }
    const rig = buildPerson(lib, p.appearance as AppearanceLike, { posture, surfaceY: surface, badge: true });
    rig.root.position.set(x, elevation, z);
    rig.root.rotation.y = MathUtils.degToRad(rot);
    (levelRoots.get(slotLevel) ?? root).add(rig.root);
    rig.root.updateMatrixWorld(true);
    const tag = signs.make(p.tag || p.name, 2.2);
    tag.position.set(0, rig.tagY, 0);
    noRaycast(tag);
    rig.root.add(tag);
    tagSigns.push(tag);
    const target: InteractionTarget = { kind: "patient", slotId: p.slotId, caseId: p.caseId, name: p.name, hint: S.talk };
    rig.root.userData.action = target;
    rig.root.userData.highlight = rig.body;
    ctx.pickables.push(rig.root);
    // the collision model's body for this slot and posture (none on a bed or chair); at a spot: standing, a body
    // box there (on a table or a trolley, the support collides); travelling with a walker: none
    const body = patientPushes.has(p.slotId) ? null : spot ? (posture === "standing" || !bed ? npcBodyBox(posture, false, x, z) : null) : patientBodyBox(facility, merged.equipment, p.slotId, posture);
    const collider = body ? ctx.colliders.add({ ...body, minY: body.minY + elevation, maxY: body.maxY + elevation }) : null;
    if (collider) colliderLevels.set(collider, slotLevel);
    ctx.npcs.set(`patient:${p.slotId}`, {
      kind: "patient",
      id: p.slotId,
      rig,
      x,
      z,
      rot: MathUtils.degToRad(rot),
      speaking: false,
      distressed: false,
      collider,
      target,
      label: p.name,
      level: slotLevel,
    });
    this.patients.set(p.slotId, p);
    stage.markShadows();
    this.world.culling.invalidate(); // re-evaluate interior culling for the new rig
  }

  /** Take an NPC's rig, tag, aim target and collider out of the world. */
  private remove(n: NpcRecord): void {
    const { ctx, stage } = this.world;
    const i = ctx.pickables.indexOf(n.rig.root);
    if (i >= 0) ctx.pickables.splice(i, 1);
    if (n.collider) ctx.colliders.remove(n.collider);
    n.rig.root.traverse((o) => {
      const k = this.tagSigns.indexOf(o);
      if (k >= 0) this.tagSigns.splice(k, 1);
    });
    disposeRig(n.rig);
    ctx.npcs.delete(`${n.kind}:${n.id}`);
    stage.markShadows();
  }

  /** Staff at their posts: uniform by role, a "role · name" tag, their greeting as the aim hint. */
  private buildStaff(): void {
    const { facility, ctx, levels, lib, signs, S, locale, levelRoots, stage } = this.world;
    const root = stage.root;
    const physics = ctx.physics;
    for (const st of facility.staff ?? []) {
      const staffLevel = entityLevel(facility, st);
      const uni = ROLE_UNIFORMS[st.role] ?? { shirt: "#f1ead5", pants: "#354442" };
      const ap: AppearanceLike = { shirt: uni.shirt, pants: uni.pants, hairStyle: uni.hairStyle, ...(st.appearance ?? {}) };
      const rig = buildPerson(lib, ap, { posture: "standing", coat: !!uni.coat, stripe: uni.stripe, badge: true });
      rig.root.position.set(st.x, levels.elevation(staffLevel), st.z);
      rig.root.rotation.y = MathUtils.degToRad(st.rot ?? 0);
      (levelRoots.get(staffLevel) ?? root).add(rig.root);
      const name = tx(st.name, locale);
      const role = roleName(st.role, locale);
      const tag = signs.make(`${role} · ${name}`, 2.2, "#417868");
      tag.position.set(0, rig.tagY, 0);
      noRaycast(tag);
      rig.root.add(tag);
      this.tagSigns.push(tag);
      const greeting = st.greeting ? tx(st.greeting, locale) : "";
      const target: InteractionTarget = { kind: "staff", staffId: st.id, role: st.role, name, hint: greeting ? `${S.talk} · ${greeting}` : S.talk };
      rig.root.userData.action = target;
      rig.root.userData.highlight = rig.body;
      ctx.pickables.push(rig.root);
      const collider = physics.get(`staff:${st.id}`) ?? null; // the collision model's staff body
      ctx.npcs.set(`staff:${st.id}`, { kind: "staff", id: st.id, rig, x: st.x, z: st.z, rot: MathUtils.degToRad(st.rot ?? 0), speaking: false, distressed: false, collider, target, label: `${role} · ${name}`, level: staffLevel });
    }
  }

  /** `WorldApi.setPatientState`: speaking, posture, accessory (a rebuilt rig keeps speaking/distress), affect tint. */
  setState(slotId: string, state: Parameters<WorldApi["setPatientState"]>[1]): void {
    const { ctx } = this.world;
    const n = ctx.npcs.get(`patient:${slotId}`);
    const p = this.patients.get(slotId);
    if (!n || !p) return;
    if ((state.posture && state.posture !== n.rig.posture) || (state.accessory && state.accessory !== p.appearance.accessory)) {
      const next: WorldPatient = { ...p, posture: state.posture ?? p.posture, appearance: { ...p.appearance, accessory: state.accessory ?? p.appearance.accessory } };
      const speaking = n.speaking, distressed = n.distressed;
      this.place(next);
      const nn = ctx.npcs.get(`patient:${slotId}`);
      if (nn) {
        nn.speaking = speaking;
        nn.distressed = distressed;
      }
    }
    const cur = ctx.npcs.get(`patient:${slotId}`);
    if (!cur) return;
    if (state.speaking != null) cur.speaking = state.speaking;
    if (state.distressed != null) cur.distressed = state.distressed;
    // (re)apply the skin tint: a rebuilt rig (posture/accessory change) starts with plain skin
    setDistressed(cur.rig, cur.distressed);
  }

  /** `WorldApi.placePatient`: at a spot, or back in their own bed space (`null`). */
  placeAt(slotId: string, at: PatientSpot | null): void {
    const { ctx } = this.world;
    const p = this.patients.get(slotId);
    if (!p) return;
    this.patientPushes.delete(slotId);
    if (at) this.patientSpots.set(slotId, { ...at });
    else this.patientSpots.delete(slotId);
    const n = ctx.npcs.get(`patient:${slotId}`);
    const speaking = n?.speaking ?? false, distressed = n?.distressed ?? false;
    this.place(p);
    const nn = ctx.npcs.get(`patient:${slotId}`);
    if (nn) {
      nn.speaking = speaking;
      nn.distressed = distressed;
      setDistressed(nn.rig, distressed);
    }
    this.world.map.invalidate();
    this.world.culling.invalidate();
  }

  /** `WorldApi.pushPatient`: travelling with a walker (`by`), or not any more (`null`: drawn where it was until placed). */
  push(slotId: string, by: string | null, posture?: WorldPatient["posture"]): void {
    const { ctx } = this.world;
    const p = this.patients.get(slotId);
    const n = ctx.npcs.get(`patient:${slotId}`);
    if (!p || !n) return;
    if (!by) {
      // stays where it was drawn until the world model says where the patient is (`placePatient`)
      this.patientPushes.delete(slotId);
      return;
    }
    this.patientPushes.set(slotId, by);
    // rebuilt travelling: lying on the trolley the walker pushes (its surface), else walking — no collider
    const trolley = [...ctx.portables.values()].find((r) => r.trolley && r.pushedBy === by);
    const want: Posture = posture ?? (trolley ? "lying" : "standing");
    this.patientSpots.set(slotId, { x: n.x, z: n.z, level: n.level, rot: 0, posture: want, support: want === "lying" && trolley ? trolley.id : null });
    const speaking = n.speaking, distressed = n.distressed;
    this.place(p);
    const nn = ctx.npcs.get(`patient:${slotId}`);
    if (nn) {
      nn.speaking = speaking;
      nn.distressed = distressed;
      setDistressed(nn.rig, distressed);
      // pushed by the avatar her name tag would fill the first-person view: hidden until she is placed
      if (by === "avatar") nn.rig.root.traverse((o) => {
        if (this.tagSigns.includes(o)) o.visible = false;
      });
    }
    this.drag();
  }

  /** Draw the patients travelling with a walker (each frame while any is): on the trolley it pushes, else ahead of it. */
  drag(): void {
    const world = this.world;
    const { ctx, player, levels, level, levelRoots, stage } = world;
    const root = stage.root;
    for (const [slotId, by] of this.patientPushes) {
      const n = ctx.npcs.get(`patient:${slotId}`);
      if (!n) continue;
      const walker = by === "avatar" ? { x: player.x, z: player.z, yaw: world.yaw, level: levels.multi ? world.currentLevel() : level } : (() => {
        const w = ctx.npcs.get(`staff:${by}`);
        return w ? { x: w.x, z: w.z, yaw: yawOfRig(w.rig.root.rotation.y), level: w.level } : null;
      })();
      if (!walker) continue;
      const trolley = [...ctx.portables.values()].find((r) => r.trolley && r.pushedBy === by);
      const at = trolley ? { x: trolley.x, z: trolley.z } : { x: walker.x - Math.sin(walker.yaw) * PUSH_AHEAD, z: walker.z - Math.cos(walker.yaw) * PUSH_AHEAD };
      if (walker.level !== n.level) {
        (levelRoots.get(walker.level) ?? root).add(n.rig.root);
        n.level = walker.level;
      }
      n.rig.root.position.set(at.x, levels.elevation(walker.level), at.z);
      // lying along the trolley (its long axis follows the walking direction); walking: facing the way
      n.rig.root.rotation.y = n.rig.posture === "lying" ? walker.yaw : rigRotationOf(walker.yaw);
      n.x = at.x;
      n.z = at.z;
      n.rot = n.rig.root.rotation.y;
    }
  }

  /** Where a patient is drawn (EMBODIED §8): position, level, posture, travelling with a walker (QA). */
  pose(slotId: string) {
    const n = this.world.ctx.npcs.get(`patient:${slotId}`);
    return n ? { x: n.x, z: n.z, level: n.level, posture: n.rig.posture, travelling: this.patientPushes.get(slotId) ?? null, spot: this.patientSpots.get(slotId) ?? null } : null;
  }
}
