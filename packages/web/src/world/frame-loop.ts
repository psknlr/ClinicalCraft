/**
 * The frame loop of a voxel world (V4): every animation frame, the player's physics (keys, or the auto-walk's
 * input in physics sub-steps so an agent's walk keeps real time on slow frames, while a human's step stays
 * clamped), the camera (head bob, sprint FOV), the hand, aiming and the position report to the app, elevator
 * rides, walking staff and pushed carts and patients, doors, sun, lights and detail culling, the NPCs' head
 * tracking, speech and breathing, name tags, particles, clouds, the beacon, animated parts and live monitor
 * screens. While paused the scene is redrawn at a low rate; the auto-walk runs even while paused.
 */
import { MathUtils, Vector3 } from "three";
import { monitorRenderer } from "../shared/monitor-render.js";
import { clampPitch, PHYSICS, stepPlayer, targetFov, type Aabb } from "./physics.js";
import { regionAt } from "./region.js";
import { animateDoors } from "./structures.js";
import { normAngle, rigRotationOf, yawTowards } from "./embodiment.js";
import type { NpcRecord } from "./context.js";
import type { VoxelWorld } from "./voxel-world.js";

/** Within this distance (m) someone speaking to the learner turns to face them. */
const FACE_RANGE = 6;

/** May this NPC turn where it stands (not walking a route, not travelling with or walking behind someone)? */
function facesSpeaker(world: VoxelWorld, n: NpcRecord): boolean {
  if (n.kind === "staff") return !world.walkers.busy(n.id);
  return !world.people.patientPushes.has(n.id) && !world.people.patientEscorts.has(n.id);
}

/**
 * While paused (intro, a window or the approval dialog covers the view behind a blurred
 * backdrop) the scene is redrawn at ~8 fps instead of every frame: idle NPCs, clouds and
 * monitor screens still move, but the GPU/CPU (and the compositor re-blurring the
 * backdrop) are not busy at 60 fps behind a static panel. Autopilot walks run at full rate.
 */
const PAUSED_FRAME_MS = 125;
/** Longest stretch of an agent's walk (s) simulated in one slow frame (in physics sub-steps). */
const AGENT_FRAME_MAX = 0.5;

/** The frame loop of one world (`start` requests the first frame; `stop` cancels the pending one). */
export class FrameLoop {
  private raf = 0;
  private lastFrame = performance.now();
  private aimTimer = 0;
  private walkPhase = 0;
  private lastStep = 0;
  private qualityCheck = 0;
  private readonly tmpV = new Vector3();
  private readonly tmpCam = new Vector3();
  private lastMove = 0;

  constructor(private readonly world: VoxelWorld) {}

  /** Request the first frame. */
  start(): void {
    this.raf = requestAnimationFrame(this.frame);
  }

  /** Cancel the pending frame (dispose). */
  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /** The room / region the player is in (the level's, in a multi-level facility). */
  private region() {
    const world = this.world;
    const { facility, player, locale, levels } = world;
    return regionAt(facility, player.x, player.z, locale, levels.multi ? world.currentLevel() : undefined);
  }

  /** Colliders near the player (the physics step tests these). */
  private nearbyColliders(): Aabb[] {
    const { ctx, player } = this.world;
    return ctx.colliders.query(player.x, player.z, 1.6);
  }

  /** Redraw the live vitals / ECG screens near the player (≤ 10 Hz each; far ones only once). */
  private updateScreens(now: number): void {
    const { ctx, player, people, opts, locale } = this.world;
    for (const sc of ctx.screens) {
      if (sc.kind !== "vitals" && sc.kind !== "ecg") continue;
      if (now - sc.lastDraw < 100) continue;
      const d = Math.hypot(sc.x - player.x, sc.z - player.z);
      if (d > 14 && sc.lastDraw > 0) continue;
      sc.lastDraw = now;
      let snap = null;
      if (sc.slotId && people.patients.has(sc.slotId) && opts.vitals) {
        try {
          snap = opts.vitals(sc.slotId);
        } catch {
          snap = null;
        }
      }
      monitorRenderer.draw(sc.ctx, sc.canvas.width, sc.canvas.height, snap, now, locale);
      sc.texture.needsUpdate = true;
    }
  }

  private readonly frame = (now: number): void => {
    const world = this.world;
    const { stage, ctx, player, levels, locale, callbacks, walkBounds, walkers, overlay, people, clouds } = world;
    const { camera, renderer, scene } = stage;
    const { tmpV, tmpCam } = this;
    if (world.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    if (typeof document !== "undefined" && document.hidden) {
      this.lastFrame = now;
      return;
    }
    if (!world.playing() && !world.walk.current && !world.rides.current && !walkers.active && now - this.lastFrame < PAUSED_FRAME_MS) return;
    const realDt = Math.max(0, (now - this.lastFrame) / 1000);
    const dt = Math.min(PHYSICS.maxDt, realDt);
    this.lastFrame = now;
    const s = world.settings();
    if (now - this.qualityCheck > 1000) {
      this.qualityCheck = now;
      stage.applyQuality(world.settings(), () => world.lights.assign(player.x, player.z, true, player.y));
    }
    // autopilot (walk_to) runs even while paused / before start(): a panel may be open
    // while the agent walks the learner somewhere; user input stays blocked (playing()).
    // An agent's walk keeps (nearly) real time on slow frames: physics sub-steps of ≤ maxDt
    // (a human's step stays clamped — a hitch must not throw the player forward).
    const walkTime = world.walk.current && !world.frozen ? Math.min(realDt, AGENT_FRAME_MAX) : dt;
    const subSteps = Math.max(1, Math.ceil(walkTime / PHYSICS.maxDt - 1e-9));
    const stepDt = walkTime / subSteps;
    const walking = world.walk.current ? world.walk.input(world.frozen ? 0 : stepDt) : null;
    world.rides.update(Math.min(realDt, 1)); // an animation, not physics: real time (slow frames do not stretch the ride)
    if (world.playing() || walking) {
      const keys = world.keys;
      const px = player.x, pz = player.z;
      const sprint = walking ? walking.sprint : !!keys.ShiftLeft || !!keys.ShiftRight;
      const input = walking
        ? { forward: walking.forward, side: 0, yaw: world.yaw, sprint, jump: false }
        : { forward: (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), side: (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), yaw: world.yaw, sprint, jump: !!keys.Space };
      if (!world.frozen && !world.rides.current) {
        stepPlayer(player, input, walking ? stepDt : dt, this.nearbyColliders(), walkBounds);
        for (let i = 1; i < subSteps && walking && world.walk.current && !world.rides.current; i++) {
          const more = world.walk.input(stepDt);
          if (!more) break;
          stepPlayer(player, { forward: more.forward, side: 0, yaw: world.yaw, sprint: more.sprint, jump: false }, stepDt, this.nearbyColliders(), walkBounds);
        }
      }
      if (!walking) {
        if (world.keys.ArrowLeft) world.yaw += dt * PHYSICS.turnSpeed;
        if (world.keys.ArrowRight) world.yaw -= dt * PHYSICS.turnSpeed;
        if (world.keys.ArrowUp) world.pitch = clampPitch(world.pitch + dt);
        if (world.keys.ArrowDown) world.pitch = clampPitch(world.pitch - dt);
      }
      const moved = Math.hypot(player.x - px, player.z - pz);
      this.walkPhase += moved * 2.7;
      if (moved > 0.001 && player.grounded && now - this.lastStep > (sprint ? PHYSICS.stepMsSprint : PHYSICS.stepMs)) {
        this.lastStep = now;
        callbacks.onSound("step");
      }
      const bob = s.bob !== false;
      camera.position.set(player.x, player.y + PHYSICS.eye + (bob ? Math.sin(this.walkPhase * 2) * 0.026 : 0), player.z);
      camera.rotation.set(world.pitch, world.yaw, 0);
      camera.fov = MathUtils.lerp(camera.fov, targetFov(sprint, moved > 0.001), dt * 5);
      camera.updateProjectionMatrix();
      world.swing = Math.max(0, world.swing - dt * 4);
      overlay.hand.rotation.x = -0.12 - world.swing * 0.7;
      overlay.hand.position.y = -0.39 + (bob ? Math.sin(this.walkPhase) * 0.013 : 0);
      this.aimTimer += dt;
      if (this.aimTimer > 0.09) {
        this.aimTimer = 0;
        world.interaction.update();
        if (now - this.lastMove > 95) {
          this.lastMove = now;
          const r = this.region();
          const lv = levels.multi ? world.currentLevel() : null;
          // the level's name is shown indoors (outdoors is the ground anyway)
          const levelInfo = lv ? (world.culling.buildingAt(player.x, player.z) >= 0 ? { level: lv, levelName: levels.name(lv, locale) } : { level: lv }) : {};
          callbacks.onMove({ x: player.x, z: player.z, yaw: world.yaw, region: r.name, roomId: r.roomId, moving: moved > 0.001, ...levelInfo });
        }
      }
    } else {
      camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
      camera.rotation.set(world.pitch, world.yaw, 0);
    }
    // staff walking world-model routes (delegated tasks): an animation, real time
    if (walkers.update(Math.min(realDt, 0.25))) world.culling.cullWalkers();
    world.carts.drag();
    people.drag();
    if (animateDoors(ctx.doors, Math.max(dt, walkTime))) stage.markShadows();
    stage.followSun(player.x, player.z);
    world.lights.assign(player.x, player.z, false, player.y);
    world.culling.cull();
    // NPCs: head tracking (V4: within 5 units, ±.55 rad, lerp dt·3), speaking, distress
    camera.getWorldPosition(tmpCam);
    for (const n of ctx.npcs.values()) {
      const rig = n.rig;
      const dist = Math.hypot(player.x - n.x, player.z - n.z);
      // body language: someone standing who speaks to the learner nearby turns to face them (never mid-walk, never
      // a patient lying or sitting on a bed, nor one travelling or walking with someone)
      if (n.speaking && dist < FACE_RANGE && dist > 0.3 && rig.posture === "standing" && facesSpeaker(world, n)) {
        const want = rigRotationOf(yawTowards(n.x, n.z, player.x, player.z));
        const turn = normAngle(want - rig.root.rotation.y);
        rig.root.rotation.y += turn * Math.min(1, dt * 4);
        n.rot = rig.root.rotation.y;
      }
      if (dist < 5) {
        tmpV.copy(tmpCam);
        rig.body.worldToLocal(tmpV);
        const local = tmpV.sub(rig.head.position);
        const ang = Math.atan2(local.x, local.z);
        const lim = rig.posture === "lying" ? 0.8 : 0.55;
        rig.head.rotation.y = MathUtils.lerp(rig.head.rotation.y, Math.max(-lim, Math.min(lim, ang)), dt * 3);
      }
      const bob = s.bob !== false;
      let hy = rig.headBaseY + (bob ? Math.sin(now * 0.0018) * 0.005 : 0);
      if (n.speaking) {
        rig.mouth.scale.y = 0.025 * (1 + Math.abs(Math.sin(now * 0.022)) * 2.6);
        rig.head.rotation.x = Math.sin(now * 0.011) * 0.05;
        hy += Math.abs(Math.sin(now * 0.011)) * 0.012;
      } else {
        rig.mouth.scale.y = 0.025;
        rig.head.rotation.x *= 0.9;
      }
      rig.head.position.y = hy;
      const breath = n.distressed ? 0.035 * Math.sin(now * 0.016) : 0.012 * Math.sin(now * 0.004);
      rig.torso.scale.z = (rig.torso.userData.baseZ as number) * (1 + breath);
    }
    for (const tag of people.tagSigns) {
      tag.getWorldPosition(tmpV);
      const parentYaw = tag.parent ? tag.parent.rotation.y : 0;
      tag.rotation.y = Math.atan2(tmpCam.x - tmpV.x, tmpCam.z - tmpV.z) - parentYaw;
    }
    // particles
    world.blocks.updateParticles(dt);
    clouds.position.x = Math.sin(now * 12e-6) * 3;
    overlay.animateBeacon(now, tmpCam);
    for (const a of ctx.animated) {
      const t = now / 1000 + a.phase;
      if (a.anim === "blink") a.material.emissiveIntensity = Math.floor(t * 1.6) % 2 ? 1.1 : 0.05;
      else if (a.anim === "pulse") a.material.emissiveIntensity = 0.35 + 0.35 * (1 + Math.sin(t * 4));
      else if (a.anim === "spin") a.mesh.rotation.y = a.base.ry + t * 2.4;
    }
    this.updateScreens(now);
    renderer.render(scene, camera);
  };
}
