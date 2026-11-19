import { expect, it } from "vitest";
import { Group } from "three";
import type { NpcRecord } from "./context.js";
import { STAFF_RIDE_SECONDS, STAFF_SPEED } from "./embodiment.js";
import { buildPerson } from "./npc.js";
import { StaffWalkers } from "./walkers.js";

function setup() {
  const root = new Group();
  const rig = buildPerson(undefined, { posture: "standing" });
  root.add(rig.root);
  const n: NpcRecord = { kind: "staff", id: "ward", rig, x: 0, z: 0, rot: 0, speaking: false, distressed: false, collider: null, target: { kind: "staff", staffId: "ward", role: "nurse", name: "Ward", hint: "" }, label: "Ward", level: "A" };
  const walkers = new StaffWalkers({
    elevation: l => l === "B" ? 4 : 0, levelRoot: () => root, connectorKind: () => "elevator", doors: () => [],
    setDoorOpen() {}, doorwayOccupied: () => false, pushing: () => false,
    addBody: (x, z) => ({ minX: x - 0.2, maxX: x + 0.2, minZ: z - 0.2, maxZ: z + 0.2, minY: 0, maxY: 1.8 }),
    removeCollider() {}, post: () => null, markShadows() {},
  });
  return { n, walkers };
}

it("covers the same route through a corner and lift at either frame rate; a cancellation restores the stance and collider", async () => {
  const once = setup(), split = setup();
  const route = [{ x: 0.24, z: 0, level: "A" }, { x: 0.24, z: 0, level: "B", via: "connector:lift" }, { x: 0.24, z: 3, level: "B" }];
  const a = once.walkers.start(once.n, route), b = split.walkers.start(split.n, route);
  const elapsed = STAFF_RIDE_SECONDS + 0.24 / STAFF_SPEED + 0.14;
  once.walkers.update(elapsed);
  for (let i = 0; i < 120; i++) split.walkers.update(elapsed / 120);
  expect(once.n.level).toBe("B");
  expect(once.n.z).toBeCloseTo(0.14 * STAFF_SPEED, 7);
  expect(split.n.z).toBeCloseTo(once.n.z, 7);
  expect(split.n.rig.body.position.y).toBeCloseTo(once.n.rig.body.position.y, 7);
  expect(split.n.rig.root.rotation.y).toBeCloseTo(once.n.rig.root.rotation.y, 7);
  expect(split.n.rig.body.position.y).toBeLessThan(-0.001);
  once.walkers.stopAll();
  split.walkers.stopAll();
  for (const result of await Promise.all([a, b])) expect(result).toMatchObject({ arrived: false, pose: { level: "B", y: 4 } });
  expect(split.n.collider).not.toBeNull();
  expect(split.n.rig.body.position.y).toBe(0);
});

it("turns to face the bedside after the last step before reporting the assigned pose", async () => {
  const { n, walkers } = setup();
  const move = walkers.start(n, [{ x: 0, z: 0.8, level: "A" }], { yaw: 0 });
  walkers.update(0.8 / STAFF_SPEED);
  expect(n.z).toBeCloseTo(0.8);
  expect(walkers.busy(n.id)).toBe(true);
  expect(n.rig.root.rotation.y).toBeCloseTo(0);
  walkers.update(0.04);
  expect(Math.abs(n.rig.root.rotation.y)).toBeGreaterThan(0.1);
  expect(Math.abs(n.rig.root.rotation.y)).toBeLessThan(Math.PI - 0.1);
  walkers.update(0.7);
  expect((await move).pose.yaw).toBeCloseTo(0);
  expect(n.rig.body.position.y).toBe(0);
});
