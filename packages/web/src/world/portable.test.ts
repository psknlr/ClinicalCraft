/**
 * Portable equipment's draw-call budget (node, three.js without a renderer):
 * a cart is an instance of the level's static batch until the world model
 * moves it; then it is promoted once — its static instances hidden, its
 * boxes merged into its own movable group.
 */
import { Group, InstancedMesh, Matrix4, MeshStandardMaterial, Vector3, type Mesh, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import type { BuildContext } from "./context.js";
import type { MaterialLibrary } from "./materials.js";
import { beginPortable, placePortable, promotePortable, RecordingBatch, type PortableHost } from "./portable.js";
import { BoxBatch } from "./voxels.js";

/** Material library stand-in: one material per name, nothing goes to the atlas. */
function fakeLib(): MaterialLibrary {
  const mats = new Map<string, MeshStandardMaterial>();
  const get = (name: string) => {
    let m = mats.get(name);
    if (!m) mats.set(name, (m = new MeshStandardMaterial({ name })));
    return m;
  };
  return { get, tiled: get, castShadow: () => true, canAtlas: () => false } as unknown as MaterialLibrary;
}

function fixture() {
  const root = new Group();
  const batch = new BoxBatch();
  const ctx = { root, batch, lib: fakeLib(), shadows: true, pickables: [] as Object3D[], portables: new Map(), placements: new Map(), targets: new Map(), screens: [], lights: [], physics: new Map() } as unknown as BuildContext;
  const detached: string[] = [];
  const host: PortableHost = {
    ctx,
    levelRoot: () => root,
    elevation: () => 0,
    addCollider: (box) => box,
    removeCollider: () => undefined,
    markShadows: () => undefined,
    detachShared: (id) => {
      detached.push(id);
      return [];
    },
  };
  // a cart (two boxes) and a fixed bed (one box) in the same static batch
  const { record, finish } = beginPortable(ctx, { id: "cart", x: 2, z: 3, rot: 0 }, 0, "L0");
  ctx.batch.add("steel", 2, 0.5, 3, 0.6, 0.8, 0.4, 0, "cart");
  ctx.batch.add("plastic", 2, 1, 3, 0.6, 0.1, 0.4, 0, "cart");
  expect(finish()).toEqual([]);
  ctx.batch.add("steel", 6, 0.5, 6, 1, 1, 2, 0, "bed");
  const statics = batch.build(root, ctx.lib, true);
  ctx.pickables.push(...statics);
  return { ctx, host, record, statics, detached, batch };
}

const yOf = (mesh: InstancedMesh, i: number) => {
  const m = new Matrix4();
  mesh.getMatrixAt(i, m);
  return new Vector3().setFromMatrixPosition(m).y;
};

describe("portable placements", () => {
  it("are drawn by the static batch until the world moves them (no draw call of their own)", () => {
    const { record, statics, ctx } = fixture();
    expect(statics.map((m) => [m.name, m.count])).toEqual([
      ["voxels:steel", 2],
      ["voxels:plastic", 1],
    ]);
    expect(record.promoted).toBe(false);
    expect(record.parts).toHaveLength(2);
    expect(record.inner.children).toHaveLength(0);
    expect(ctx.portables.get("cart")).toBe(record);
  });

  it("are promoted once: static instances hidden, boxes merged into their own group, shared parts detached", () => {
    const { record, statics, ctx, host, detached } = fixture();
    const steel = statics[0] as InstancedMesh;
    promotePortable(host, record);
    expect(record.promoted).toBe(true);
    // the cart's instances left the picture; the bed's stayed
    expect(yOf(steel, 0)).toBeLessThan(-500);
    expect(yOf(statics[1] as InstancedMesh, 0)).toBeLessThan(-500);
    expect(yOf(steel, 1)).toBeCloseTo(0.5);
    expect((steel.userData.owners as (string | undefined)[])[0]).toBeUndefined();
    expect((steel.userData.owners as (string | undefined)[])[1]).toBe("bed");
    // its own meshes, aimable, carrying the placement
    const own = record.inner.children as Mesh[];
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((m) => m.userData.owner === "cart" && ctx.pickables.includes(m))).toBe(true);
    expect(detached).toEqual(["cart"]);
    promotePortable(host, record);
    expect(record.inner.children).toHaveLength(own.length);
    expect(detached).toEqual(["cart"]);
  });

  it("stay in the batch when sent home before ever moving, and are promoted by a real move", () => {
    const { record, host } = fixture();
    placePortable(host, record, "home");
    expect(record.promoted).toBe(false);
    placePortable(host, record, { x: 5, y: 0, z: 1, level: "L0" });
    expect(record.promoted).toBe(true);
    expect([record.group.position.x, record.group.position.z]).toEqual([5, 1]);
    expect([record.x, record.z]).toEqual([5, 1]);
  });

  it("records what it forwards (the recording batch)", () => {
    const target = new BoxBatch();
    const rec = new RecordingBatch(target);
    const a = rec.add("steel", 1, 2, 3);
    const b = rec.addTiled("floor", 0, 0, 0, 2, 0.1, 2);
    expect([a, b]).toEqual([
      { key: "steel", index: 0 },
      { key: "floor#tiled", index: 0 },
    ]);
    expect(rec.parts.map((p) => [p.mat, p.tiled])).toEqual([
      ["steel", false],
      ["floor", true],
    ]);
    expect(target.count).toBe(2);
  });
});
