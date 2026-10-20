/**
 * The test / QA hooks of a voxel world (`WorldApi.debug`, `window.__QA__.world.debug` with `?qa`): the stage and
 * the facility as built (colliders, collision model, levels, elevators, models, doors, targets, NPCs, portable
 * placements, screens, warnings), live state (player, level, ride, walking staff, aim target, nav grid, the
 * auto-walk), QA actions (teleport, freeze, aim), and draw-call / build statistics.
 */
import type { WorldApi } from "../contracts.js";
import { PHYSICS } from "./physics.js";
import type { VoxelWorld } from "./voxel-world.js";

/** The `debug` object of a world; `buildMs` reads how long `createWorld` took. */
export function worldDebug(world: VoxelWorld, buildMs: () => number): WorldApi["debug"] {
  const { stage, ctx, collision, levels, levelRoots, level, elevators, models, blocks, people, walkers, lib, groundMeshes, staticMeshes } = world;
  const { camera, scene, renderer } = stage;
  const player = world.player;
  return {
    get player() {
      return player;
    },
    camera,
    scene,
    renderer,
    colliders: ctx.colliders,
    /** The facility's collision model (@clinicalcraft/world): the source of every collider above. */
    collision,
    /** Levels (elevations, flights, culling rules) and the group each non-default level is built into. */
    levels,
    levelRoots,
    /** Level the avatar stands on. */
    get level() {
      return levels.multi ? world.currentLevel() : level;
    },
    /** Elevators: cars (rooms), doors and stops per level. */
    elevators,
    /** Equipment models: placements requested, loaded and failed (voxel parts kept). */
    models: models.state,
    rideElevator: (connectorId: string, to: string) => world.rides.ride(connectorId, to),
    /** Current elevator ride (QA): phase and destination level. */
    get ride() {
      const ride = world.rides.current;
      return ride ? { phase: ride.phase, from: ride.from.level, to: ride.to.level } : null;
    },
    placed: blocks.placed,
    doors: ctx.doors,
    targets: ctx.targets,
    npcs: ctx.npcs,
    /** Portable placements (carts, items): their groups, where they are drawn, hidden while carried. */
    portables: ctx.portables,
    /** Where a patient is drawn (EMBODIED §8): position, level, posture, travelling with a walker. */
    patientPose(slotId: string) {
      return people.pose(slotId);
    },
    /** Staff ids walking world-model routes now. */
    get walkingStaff() {
      return walkers.walking().map((n) => n.id);
    },
    screens: ctx.screens,
    warnings: ctx.warnings,
    lib,
    groundMeshes,
    staticMeshes,
    get target() {
      return world.interaction.aimTarget;
    },
    get started() {
      return world.started;
    },
    get paused() {
      return world.paused;
    },
    get nav() {
      return world.walk.navGrid;
    },
    /** Current autopilot state (QA): path, waypoint index, goal, re-plans. */
    get walk() {
      const autoWalk = world.walk.current;
      return autoWalk
        ? { path: autoWalk.path, index: autoWalk.index, goal: autoWalk.goal, arrive: autoWalk.arrive, replans: autoWalk.replans, level: autoWalk.level, legs: autoWalk.legs.length, riding: !!autoWalk.riding }
        : null;
    },
    /** V4 signature: teleport(x, z, y = 0, yaw = 0, pitch = 0). */
    teleport(x: number, z: number, y = 0, newYaw = 0, newPitch = 0) {
      world.teleportTo(x, z, y, newYaw, newPitch);
    },
    /** Freeze physics (QA camera positions in mid-air) while aiming keeps working. */
    freeze(v: boolean) {
      world.frozen = v;
    },
    updateAim: () => world.interaction.update(),
    /**
     * Draw calls of one frame from the current camera. renderer.info resets after the shadow pass,
     * so `steady` (= renderer.info.render.calls) never includes it; `shadowPass` is measured
     * separately (it only runs when the shadow map is refreshed: doors, blocks, NPC rebuilds,
     * shadow-box moves).
     */
    drawCalls() {
      stage.followSun(player.x, player.z);
      world.lights.assign(player.x, player.z, true, player.y);
      camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
      world.culling.cull(true);
      const info = renderer.info;
      info.autoReset = false;
      info.reset();
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      const withShadows = info.render.calls;
      info.reset();
      renderer.render(scene, camera);
      const steady = info.render.calls;
      const triangles = info.render.triangles;
      info.autoReset = true;
      return { steady, shadowPass: withShadows - steady, withShadows, triangles };
    },
    stats() {
      return {
        draws: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        colliders: ctx.colliders.size,
        pickables: ctx.pickables.length,
        instanced: staticMeshes.reduce((a, m) => a + m.count, 0) + groundMeshes.reduce((a, m) => a + m.count, 0),
        pointLights: ctx.realLights.length,
        lightCandidates: ctx.lights.length,
        /** Milliseconds createWorld took (scene, colliders, NPCs; excludes the first render). */
        buildMs: Math.round(buildMs()),
        levels: levels.list.length,
      };
    },
  };
}
