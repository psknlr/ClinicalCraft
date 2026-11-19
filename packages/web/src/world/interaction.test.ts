import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from "three";
import { describe, expect, it, vi } from "vitest";
import type { InteractionTarget } from "../contracts.js";
import { Interaction } from "./interaction.js";
import type { VoxelWorld } from "./voxel-world.js";

function person(id: string, x: number, z: number) {
  const rig = new Group();
  const clothes = new Group();
  clothes.add(new Mesh(new BoxGeometry(0.5, 1.5, 0.5), new MeshBasicMaterial()));
  rig.add(clothes);
  rig.position.set(x, 1.4, z);
  const target: InteractionTarget = { kind: "staff", staffId: id, role: "nurse", name: id, hint: "Talk" };
  rig.userData.action = target;
  rig.updateMatrixWorld(true);
  return { rig, clothes, target };
}

function bedside(...rigs: Group[]) {
  const camera = new PerspectiveCamera(70, 1, 0.05, 100);
  camera.rotation.order = "YXZ";
  camera.position.y = 1.4;
  const world = {
    started: true, paused: false, yaw: 0, pitch: 0, slot: 0,
    stage: { camera }, ctx: { pickables: rigs }, overlay: { highlight: new Group() },
    callbacks: { onInteract: vi.fn(), onTarget: vi.fn() }, S: { approach: ["Come closer", ""] }, toast: vi.fn(),
  };
  const aim = new Interaction(world as unknown as VoxelWorld);
  return { world, aim };
}

describe("bedside targeting", () => {
  it("uses the latest look direction when the player interacts between HUD samples", () => {
    const nurse = person("nurse", 0, -2);
    const colleague = person("colleague", 2, 0);
    const { world, aim } = bedside(nurse.rig, colleague.rig);
    aim.update();
    expect(aim.aimTarget).toBe(nurse.target);
    world.yaw = -Math.PI / 2;
    aim.interact();
    expect(world.callbacks.onInteract).toHaveBeenCalledExactlyOnceWith(colleague.target);
    expect(aim.aimTarget).toBe(colleague.target);
  });

  it("lets a visible person be addressed past hidden objects, while a visible partition blocks them", () => {
    const hidden = person("hidden", 0, -1);
    const nurse = person("nurse", 0, -2.8);
    const partition = new Group();
    partition.add(new Mesh(new BoxGeometry(2, 3, 0.1), new MeshBasicMaterial()));
    partition.position.set(0, 1.4, -2);
    partition.updateMatrixWorld(true);
    partition.visible = false;
    hidden.clothes.visible = false;
    const { world, aim } = bedside(hidden.rig, partition, nurse.rig);
    aim.interact();
    expect(world.callbacks.onInteract).toHaveBeenCalledExactlyOnceWith(nurse.target);

    partition.visible = true;
    aim.interact();
    expect(aim.aimTarget).toBeNull();
    expect(world.callbacks.onInteract).toHaveBeenCalledTimes(1);
  });
});
