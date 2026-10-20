/**
 * ClinicalCraft voxel world (three.js) — implements `CreateWorld` from
 * src/contracts.ts. A data-driven generalisation of the Virtual Patient V4
 * world builder `Ld()`: the scene is built from a FacilityDefinition and the
 * equipment catalogs; player physics, doors, aiming, build zone, hand and
 * look are V4's.
 *
 * `createWorld` builds a `VoxelWorld` (voxel-world.ts: the shared state, and the
 * order its parts are built in — stage, facility, people, build zone, overlay,
 * aim, input, doors, elevator rides, auto-walk, walking staff, carts, culling,
 * frame loop, map) and returns the `WorldApi` over it; `debug` is qa.ts.
 */
import type { CreateWorld, WorldApi, WorldOptions, WorldSave } from "../contracts.js";
import { captureJpeg } from "./capture.js";
import { PHYSICS } from "./physics.js";
import { worldDebug } from "./qa.js";
import { VoxelWorld } from "./voxel-world.js";

export { monitorRenderer } from "../shared/monitor-render.js";

export const createWorld: CreateWorld = (opts: WorldOptions): WorldApi => {
  const buildStart = performance.now();
  const world = new VoxelWorld(opts);
  const { canvas, facility, stage, ctx, levels, level, locale, spawn, player, walkers } = world;
  const { camera, scene, renderer } = stage;

  const api: WorldApi = {
    start() {
      world.started = true;
      world.paused = false;
    },
    pause(p: boolean) {
      world.paused = p;
      world.keys = {};
      if (p) {
        world.input.dragFrom = null;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      }
    },
    select: (n) => world.blocks.select(n),
    interact: () => world.interaction.interact(),
    build: (place) => world.blocks.build(place),
    serialize(): WorldSave {
      return {
        facilityId: facility.id,
        position: [player.x, player.y, player.z],
        yaw: world.yaw,
        pitch: world.pitch,
        blocks: [...world.blocks.placed.values()].map((p) => ({ cell: [...p.cell] as [number, number, number], type: p.type })),
      };
    },
    setKey(code: string, down: boolean) {
      world.keys[code] = down;
      if (down && world.walk.current && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(code)) world.walk.cancel(new Error("interrupted by player"));
    },
    look: (dx, dy) => world.input.look(dx, dy),
    reset() {
      world.walk.cancel(new Error("reset"));
      world.rides.cancel(new Error("reset"));
      world.teleportTo(spawn.x, spawn.z, 0, spawn.yaw ?? 0, 0);
      world.doors.shutAll();
      stage.markShadows();
    },
    teleport(x: number, z: number, newYaw?: number, lv?: string) {
      world.walk.cancel(new Error("teleported"));
      world.rides.cancel(new Error("teleported"));
      world.teleportTo(x, z, levels.elevation(lv ?? level), newYaw);
    },
    setPatientState: (slotId, state) => world.people.setState(slotId, state),
    setStaffSpeaking(staffId, speaking) {
      const n = ctx.npcs.get(`staff:${staffId}`);
      if (n) n.speaking = speaking;
    },
    setWaypoint: (target) => world.overlay.setWaypoint(target),
    walkTo: (target, signal) => world.walk.walkTo(target, signal),
    drawMap: (target, o) => world.map.draw(target, o),
    locate: (id) => world.map.locate(id),
    levels(loc?: string) {
      return levels.list.map((l) => ({ id: l.id, name: levels.name(l.id, loc || locale), elevation: l.elevation }));
    },
    rideElevator: (connectorId, to) => world.rides.ride(connectorId, to),
    followRoute: (route, o) => world.walk.followRoute(route, o),
    walkStaff(staffId, route, o = {}) {
      const n = ctx.npcs.get(`staff:${staffId.replace(/^staff:/, "")}`);
      if (!n) return Promise.resolve({ arrived: route.length === 0, pose: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, level }, replans: 0 });
      return walkers.start(n, route, o);
    },
    placeStaff(staffId, pose) {
      const n = ctx.npcs.get(`staff:${staffId.replace(/^staff:/, "")}`);
      if (!n) return;
      walkers.place(n, pose);
      world.culling.invalidate();
    },
    staffPose(staffId) {
      const n = ctx.npcs.get(`staff:${staffId.replace(/^staff:/, "")}`);
      return n ? walkers.pose(n) : null;
    },
    placeEquipment: (placementId, at) => world.carts.place(placementId, at),
    pushEquipment: (placementId, by) => world.carts.push(placementId, by),
    placePatient: (slotId, at) => world.people.placeAt(slotId, at),
    pushPatient: (slotId, by, posture) => world.people.push(slotId, by, posture),
    setDoor: (doorId, open) => world.doors.set(doorId, open),
    setDoorLocked: (doorId, locked) => world.doors.setLocked(doorId, locked),
    captureFrame(o) {
      camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
      camera.rotation.set(world.pitch, world.yaw, 0);
      camera.updateMatrixWorld();
      const shot = captureJpeg(renderer, scene, camera, o.maxWidth, o.quality);
      if (!shot) return null;
      return { mimeType: "image/jpeg", ...shot, pose: { x: player.x, y: player.y + PHYSICS.eye, z: player.z, yaw: world.yaw, pitch: world.pitch, level: levels.multi ? world.currentLevel() : level } };
    },
    screenshot() {
      renderer.render(scene, camera);
      return canvas.toDataURL("image/png");
    },
    dispose: () => world.dispose(),
    get position() {
      return { x: player.x, y: player.y, z: player.z, yaw: world.yaw, pitch: world.pitch, level: levels.multi ? world.currentLevel() : level };
    },
    debug: worldDebug(world, () => buildMs),
  };
  const buildMs = performance.now() - buildStart;
  return api;
};

export default createWorld;
