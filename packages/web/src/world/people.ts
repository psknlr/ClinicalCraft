/**
 * The people of a voxel world: patients in their slots and staff at their posts, as voxel rigs with a name tag
 * (tags face the camera and never take the aim ray), an aim target and the collision model's body. A patient is
 * drawn where the world model has them (EMBODIED §8): in their own bed space (lying on the bed, sitting on it,
 * or standing), at a spot (a scanner table, another bed space), or travelling with a walker — lying on the
 * trolley it pushes, else walking upright where the walker walked (`Trail`: never lying in the air, never cutting
 * through a wall) — and walking with someone who asked them to follow (`escort`); no collider meanwhile. A posture
 * or accessory change rebuilds the rig.
 *
 * A case's companion (the parent, the spouse…) stands at the patient's side and goes where the patient goes —
 * drawn, speaking and looking at the learner, but with no body of the world model's: no collider (the renderer's
 * colliders are the world model's, EMBODIED R2) and the patient's aim target (talking to them opens the patient's
 * conversation, where the companion answers).
 */
import { MathUtils, type Object3D } from "three";
import { entityLevel } from "@clinicalcraft/core";
import { npcBodyBox, patientBodyBox } from "@clinicalcraft/world";
import type { InteractionTarget, PatientSpot, WorldApi, WorldPatient } from "../contracts.js";
import type { NpcRecord } from "./context.js";
import { rigRotationOf, yawOfRig } from "./embodiment.js";
import { surfaceTop, surfaceUnder } from "./equipment.js";
import { buildPerson, disposeRig, ROLE_UNIFORMS, setDistressed, type AppearanceLike, type Posture } from "./npc.js";
import { collides } from "./physics.js";
import { roleName, tx } from "./strings.js";
import { Trail } from "./trail.js";
import type { VoxelWorld } from "./voxel-world.js";

/** How far (m) behind a walker, along its trail, the patient walking with it goes — and their companion. */
const STEP_BEHIND = 1.05;
const COMPANION_BEHIND = 1.95;

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
  /** Patients travelling with a walker ("avatar" or a staff id): slot → walker (drawn on its trolley, or walking with it). */
  readonly patientPushes = new Map<string, string>();
  /** Patients walking with someone who asked them to follow (`escort`): slot → walker ("avatar" or a staff id). */
  readonly patientEscorts = new Map<string, string>();
  /** Where each walker went (slot → trail): the patient and their companion walk it. */
  private readonly trails = new Map<string, Trail>();
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
    // box there (on a table or a trolley, the support collides); travelling or walking with someone: none
    const body = patientPushes.has(p.slotId) || this.patientEscorts.has(p.slotId) ? null : spot ? (posture === "standing" || !bed ? npcBodyBox(posture, false, x, z) : null) : patientBodyBox(facility, merged.equipment, p.slotId, posture);
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
    this.placeCompanion(p, { x, z, rot, level: slotLevel, elevation, lying: posture === "lying", bed: bed ?? null });
    stage.markShadows();
    this.world.culling.invalidate(); // re-evaluate interior culling for the new rig
  }

  /**
   * The companion at the patient's side (see the module docs): beside the bed (the head end) or beside a patient
   * standing or sitting, on a spot no collider takes (else the other side, else the foot), facing the patient.
   */
  private placeCompanion(p: WorldPatient, at: { x: number; z: number; rot: number; level: string; elevation: number; lying: boolean; bed: { w: number; d: number } | null }): void {
    const { ctx, lib, signs, levelRoots, stage } = this.world;
    const old = ctx.npcs.get(`companion:${p.slotId}`);
    if (old) this.remove(old);
    const c = p.companion;
    if (!c) return;
    const r = MathUtils.degToRad(at.rot);
    const side = at.bed ? Math.min(at.bed.w, at.bed.d) / 2 + 0.55 : 0.85;
    const along = at.bed ? -Math.max(at.bed.w, at.bed.d) * 0.18 : 0.2;
    // local offsets (side, along the body) turned by the patient's rotation; the first free one
    const offsets: [number, number][] = [
      [side, along],
      [-side, along],
      [0, (at.bed ? Math.max(at.bed.w, at.bed.d) / 2 : 0.4) + 0.6],
      [side, -along],
    ];
    const world = (lx: number, lz: number) => ({ x: at.x + lx * Math.cos(r) + lz * Math.sin(r), z: at.z - lx * Math.sin(r) + lz * Math.cos(r) });
    let spot = world(...offsets[0]!);
    for (const [lx, lz] of offsets) {
      const q = world(lx, lz);
      if (!collides({ x: q.x, y: at.elevation, z: q.z }, ctx.colliders.query(q.x, q.z, 1))) {
        spot = q;
        break;
      }
    }
    const rig = buildPerson(lib, { ...c.appearance } as AppearanceLike, { posture: "standing", badge: false });
    rig.root.position.set(spot.x, at.elevation, spot.z);
    rig.root.rotation.y = rigRotationOf(Math.atan2(-(at.x - spot.x), -(at.z - spot.z)));
    (levelRoots.get(at.level) ?? stage.root).add(rig.root);
    rig.root.updateMatrixWorld(true);
    const tag = signs.make(c.label, 2.0, "#7a6a3c");
    tag.position.set(0, rig.tagY, 0);
    noRaycast(tag);
    rig.root.add(tag);
    this.tagSigns.push(tag);
    const target = ctx.npcs.get(`patient:${p.slotId}`)?.target;
    if (target) {
      rig.root.userData.action = target;
      rig.root.userData.highlight = rig.body;
      ctx.pickables.push(rig.root);
    }
    ctx.npcs.set(`companion:${p.slotId}`, { kind: "companion", id: p.slotId, rig, x: spot.x, z: spot.z, rot: rig.root.rotation.y, speaking: false, distressed: false, collider: null, target: target ?? { kind: "patient", slotId: p.slotId, caseId: p.caseId, name: p.name, hint: "" }, label: c.label, level: at.level });
  }

  /** `WorldApi.setCompanionSpeaking`: the companion's speaking animation (no companion: nothing). */
  setCompanionSpeaking(slotId: string, speaking: boolean): void {
    const n = this.world.ctx.npcs.get(`companion:${slotId}`);
    if (n) n.speaking = speaking;
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
    this.patientEscorts.delete(slotId);
    this.trails.delete(slotId);
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
      if (!this.patientEscorts.has(slotId)) this.trails.delete(slotId);
      return;
    }
    this.patientPushes.set(slotId, by);
    // rebuilt travelling: lying on the trolley the walker pushes (its surface), else walking upright — no collider.
    // Lying needs a trolley under them: without one they walk (EMBODIED §8.4), whatever was asked.
    const trolley = [...ctx.portables.values()].find((r) => r.trolley && r.pushedBy === by);
    const want: Posture = trolley ? (posture ?? "lying") : "standing";
    this.follow(slotId, by, n);
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

  /**
   * `WorldApi.escortPatient`: the patient walks with `by` ("avatar" or a staff id) wherever it goes — upright, no
   * collider — or not any more (`null`: drawn where they are until the world model places them).
   */
  escort(slotId: string, by: string | null): void {
    const { ctx } = this.world;
    const p = this.patients.get(slotId);
    const n = ctx.npcs.get(`patient:${slotId}`);
    if (!p || !n) return;
    if (!by) {
      this.patientEscorts.delete(slotId);
      if (!this.patientPushes.has(slotId)) this.trails.delete(slotId);
      return;
    }
    this.patientEscorts.set(slotId, by);
    this.follow(slotId, by, n);
    this.patientSpots.set(slotId, { x: n.x, z: n.z, level: n.level, rot: 0, posture: "standing", support: null });
    const speaking = n.speaking, distressed = n.distressed;
    this.place(p);
    const nn = ctx.npcs.get(`patient:${slotId}`);
    if (nn) {
      nn.speaking = speaking;
      nn.distressed = distressed;
      setDistressed(nn.rig, distressed);
    }
    this.drag();
  }

  /** Start the trail a patient walks behind `by`: from where the patient is drawn to the walker. */
  private follow(slotId: string, by: string, n: NpcRecord): void {
    if (this.trails.has(slotId)) return;
    const w = this.walker(by);
    this.trails.set(slotId, new Trail([{ x: n.x, z: n.z, level: n.level }, ...(w ? [{ x: w.x, z: w.z, level: w.level }] : [])]));
  }

  /** Where a walker is now ("avatar": the learner's body; else a staff rig). */
  private walker(by: string): { x: number; z: number; yaw: number; level: string } | null {
    const world = this.world;
    const { ctx, player, levels, level } = world;
    if (by === "avatar") return { x: player.x, z: player.z, yaw: world.yaw, level: levels.multi ? world.currentLevel() : level };
    const w = ctx.npcs.get(`staff:${by}`);
    return w ? { x: w.x, z: w.z, yaw: yawOfRig(w.rig.root.rotation.y), level: w.level } : null;
  }

  /** Move a rig to a point (and to that level's root), facing `yaw` (a rig's rotation: `rigRotationOf`). */
  private moveRig(n: NpcRecord, x: number, z: number, level: string, rotation: number): void {
    const { levels, levelRoots, stage } = this.world;
    if (level !== n.level) {
      (levelRoots.get(level) ?? stage.root).add(n.rig.root);
      n.level = level;
    }
    n.rig.root.position.set(x, levels.elevation(level), z);
    n.rig.root.rotation.y = rotation;
    n.x = x;
    n.z = z;
    n.rot = rotation;
  }

  /**
   * Draw the patients travelling with a walker or walking with someone (each frame while any is): on the trolley the
   * walker pushes, else a step behind it on its trail; their companion a step further back.
   */
  drag(): void {
    const { ctx } = this.world;
    for (const slotId of new Set([...this.patientPushes.keys(), ...this.patientEscorts.keys()])) {
      const by = this.patientPushes.get(slotId) ?? this.patientEscorts.get(slotId)!;
      const n = ctx.npcs.get(`patient:${slotId}`);
      const walker = this.walker(by);
      if (!n || !walker) continue;
      let trail = this.trails.get(slotId);
      if (!trail) this.trails.set(slotId, (trail = new Trail([{ x: n.x, z: n.z, level: n.level }])));
      trail.push(walker.x, walker.z, walker.level, walker.yaw);
      const trolley = this.patientPushes.has(slotId) ? [...ctx.portables.values()].find((r) => r.trolley && r.pushedBy === by) : undefined;
      if (trolley) {
        // lying along the trolley (its long axis follows the walking direction)
        this.moveRig(n, trolley.x, trolley.z, walker.level, walker.yaw);
      } else {
        // walking: a step behind the walker where it walked, facing the way
        const at = trail.at(STEP_BEHIND);
        if (at) this.moveRig(n, at.x, at.z, at.level, rigRotationOf(at.yaw ?? walker.yaw));
      }
      const companion = ctx.npcs.get(`companion:${slotId}`);
      const back = trail.at(trolley ? STEP_BEHIND : COMPANION_BEHIND);
      if (companion && back) this.moveRig(companion, back.x, back.z, back.level, rigRotationOf(back.yaw ?? walker.yaw));
    }
  }

  /** Where a patient is drawn (EMBODIED §8): position, level, posture, travelling or walking with someone, their companion (QA). */
  pose(slotId: string) {
    const n = this.world.ctx.npcs.get(`patient:${slotId}`);
    const c = this.world.ctx.npcs.get(`companion:${slotId}`);
    return n
      ? {
          x: n.x,
          z: n.z,
          level: n.level,
          posture: n.rig.posture,
          speaking: n.speaking,
          travelling: this.patientPushes.get(slotId) ?? null,
          escort: this.patientEscorts.get(slotId) ?? null,
          spot: this.patientSpots.get(slotId) ?? null,
          companion: c ? { x: c.x, z: c.z, level: c.level, speaking: c.speaking } : null,
        }
      : null;
  }
}
