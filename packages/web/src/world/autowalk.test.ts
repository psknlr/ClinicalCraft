import { boxCollider, ColliderGrid, collides, stepPlayer, type PhysicsCollider } from "@clinicalcraft/world";
import { describe, expect, it } from "vitest";
import { AutoWalker } from "./autowalk.js";
import type { VoxelWorld } from "./voxel-world.js";

/** Exercise the actual renderer route follower and shared collision solver without WebGL. */
async function approach(dt: number, distance: number, obstacle?: PhysicsCollider) {
  const colliders = new ColliderGrid();
  if (obstacle) colliders.add(obstacle);
  const player = { x: 0, y: 0, z: 0, grounded: true, vy: 0 };
  const world = {
    player, yaw: 0, pitch: 0, levels: { multi: false }, level: "L0",
    ctx: { colliders, doors: [] }, doors: { closeBehind() {} }, input: { release() {} },
    stage: { camera: { position: { set() {} }, rotation: { set() {} } } },
  };
  const walker = new AutoWalker(world as unknown as VoxelWorld);
  const result = walker.followRoute([{ x: 0, z: -distance, level: "L0" }], { yaw: 1 });
  let careful = false, turnedInPlace = false;
  const bounds = { minX: -10, minZ: -10, maxX: 10, maxZ: 10 };
  for (let seconds = 0; walker.current && seconds < 10; seconds += dt) {
    const priorYaw = world.yaw;
    const input = walker.input(dt);
    if (!input) continue;
    careful ||= input.careful;
    turnedInPlace ||= input.forward === 0 && world.yaw > priorYaw && world.yaw < 1;
    stepPlayer(player, { ...input, yaw: world.yaw, jump: false }, dt, colliders.values(), bounds);
  }
  expect(walker.current).toBe(null);
  return { result: await result, careful, turnedInPlace, player, colliders };
}

describe("last steps of an agent's approach", () => {
  it("slows down and stops exactly on a clear interaction point at different frame rates", async () => {
    for (const dt of [1 / 20, 1 / 60, 1 / 144]) {
      const { result, careful, turnedInPlace } = await approach(dt, 2.5);
      expect(careful).toBe(true);
      expect(turnedInPlace).toBe(true);
      expect(result).toMatchObject({ arrived: true, pose: { z: -2.5, yaw: 1 } });
    }
  });

  it("reports the actual reachable pose when a colleague occupies the end of a planned route", async () => {
    const { result, player, colliders } = await approach(1 / 60, 0.35, boxCollider(0, 0.8, -0.57, 0.32, 1.6, 0.32));
    expect(result.arrived).toBe(true); // within the route's near-goal settling tolerance
    expect(result.pose.z).toBeGreaterThan(-0.2);
    expect(collides(player, colliders.values())).toBe(false);
  });
});
