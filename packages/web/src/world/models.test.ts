/**
 * Equipment models (EMBODIED §11): GLTFLoader on a GLB generated here (no
 * binary file is committed), the per-URL cache, the hash check, the voxel
 * fallback triggers, and the fit to the semantic footprint.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Box3, Matrix4, Mesh, type Object3D } from "three";
import { encodeGlb, fitModel } from "@clinicalcraft/core";
import { instanceModel, MODEL_SHADOW_MIN, ModelCache, modelUrl, objectBounds, placeModel, sha256Hex } from "./models.js";

/** A box mesh w × h × d standing on y = 0 (8 vertices, 12 triangles). */
function boxGlb(w: number, h: number, d: number): Uint8Array {
  const pos = new Float32Array(24);
  for (let i = 0; i < 8; i++) pos.set([i & 1 ? w / 2 : -w / 2, i & 2 ? h : 0, i & 4 ? d / 2 : -d / 2], i * 3);
  const idx = new Uint16Array([0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3]);
  const bin = new Uint8Array(pos.byteLength + idx.byteLength);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(idx.buffer), pos.byteLength);
  return encodeGlb(
    {
      asset: { version: "2.0" },
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
      materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.8, 0.8, 0.8, 1] } }],
      buffers: [{ byteLength: bin.byteLength }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 },
        { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength, target: 34963 },
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 8, type: "VEC3", min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
        { bufferView: 1, componentType: 5123, count: 36, type: "SCALAR" },
      ],
    },
    bin,
  );
}

const glb = boxGlb(2, 1, 4);
const sha = createHash("sha256").update(glb).digest("hex");
/** A fetch serving `files` (url → bytes) and counting requests. */
function server(files: Record<string, Uint8Array>) {
  const calls: string[] = [];
  const fetch = async (url: string) => {
    calls.push(url);
    const body = files[url];
    return { ok: !!body, status: body ? 200 : 404, arrayBuffer: async () => (body ? body.slice().buffer : new ArrayBuffer(0)) };
  };
  return { fetch, calls };
}
const meshes = (o: Object3D) => {
  const out: Mesh[] = [];
  o.traverse((c) => (c as Mesh).isMesh && out.push(c as Mesh));
  return out;
};

describe("model URLs", () => {
  it("resolves relative URIs under the local-only asset route; keeps absolute ones", () => {
    expect(modelUrl("models/bed.glb")).toBe("/local-assets/models/bed.glb");
    expect(modelUrl("./models/bed.glb", "/assets")).toBe("/assets/models/bed.glb");
    expect(modelUrl("/static/bed.glb")).toBe("/static/bed.glb");
    expect(modelUrl("https://example.org/bed.glb")).toBe("https://example.org/bed.glb");
    expect(modelUrl("data:model/gltf-binary;base64,AAAA")).toMatch(/^data:/);
  });
  it("hashes with WebCrypto", async () => {
    expect(await sha256Hex(glb.slice().buffer)).toBe(sha);
  });
});

describe("ModelCache", () => {
  it("loads a GLB once per URL (GLTFLoader) and checks the pinned sha256", async () => {
    const srv = server({ "/local-assets/models/bed.glb": glb });
    const cache = new ModelCache({ fetch: srv.fetch });
    const [a, b] = await Promise.all([cache.load("models/bed.glb", sha), cache.load("models/bed.glb", sha)]);
    expect(a).toBe(b);
    expect(srv.calls).toEqual(["/local-assets/models/bed.glb"]);
    expect(meshes(a)).toHaveLength(1);
    const box = new Box3().setFromObject(a);
    expect(box.max.x - box.min.x).toBeCloseTo(2);
    expect(box.max.z - box.min.z).toBeCloseTo(4);
    cache.dispose();
  });
  it("loads the meshopt decoder only for a model that uses EXT_meshopt_compression", async () => {
    // the same box declaring the extension (its buffers are plain): the decoder is imported, then GLTFLoader parses it
    const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + new DataView(glb.buffer, glb.byteOffset).getUint32(12, true))));
    const bin = glb.subarray(20 + new DataView(glb.buffer, glb.byteOffset).getUint32(12, true) + 8);
    const withExt = encodeGlb({ ...json, extensionsUsed: ["EXT_meshopt_compression"] }, bin);
    const cache = new ModelCache({ fetch: server({ "/local-assets/m.glb": withExt }).fetch });
    expect(meshes(await cache.load("m.glb"))).toHaveLength(1);
    cache.dispose();
  });
  it("rejects a missing file, a hash mismatch and bytes that are no model (the voxel parts stay)", async () => {
    const srv = server({ "/local-assets/bed.glb": glb, "/local-assets/junk.glb": new TextEncoder().encode("not a model") });
    const cache = new ModelCache({ fetch: srv.fetch });
    await expect(cache.load("missing.glb")).rejects.toThrow(/404/);
    await expect(cache.load("bed.glb", "0".repeat(64))).rejects.toThrow(/sha256/);
    await expect(cache.load("junk.glb")).rejects.toThrow();
    cache.dispose();
  });
});

describe("placeModel", () => {
  it("fits the model to the footprint at the placement (shadows on, never ray-tested) with an invisible aim proxy", async () => {
    const cache = new ModelCache({ fetch: server({ "/local-assets/bed.glb": glb }).fetch });
    const scene = await cache.load("bed.glb");
    const footprint = { w: 1, d: 2, h: 0.5 };
    const ref = { scale: 0.5, rot: 0 };
    const placed = placeModel(scene, ref, footprint, { x: 3, y: 4.5, z: -2, rot: 90, id: "icu-1.bed" }, true)!;
    expect(placed.fit).toEqual(fitModel(objectBounds(scene)!, ref, footprint));
    const g = placed.group;
    expect([g.position.x, g.position.y, g.position.z]).toEqual([3, 4.5, -2]);
    expect(g.rotation.y).toBeCloseTo(Math.PI / 2);
    // the fitted model (world space): the footprint turned 90°, standing on the level's floor
    const model = g.children.find((c) => c !== placed.proxy)!;
    const box = new Box3().setFromObject(model);
    expect(box.min.y).toBeCloseTo(4.5);
    expect(box.max.y - box.min.y).toBeCloseTo(0.5);
    expect(box.max.x - box.min.x).toBeCloseTo(2); // d along world x after the 90° turn
    expect(box.max.z - box.min.z).toBeCloseTo(1);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(3);
    for (const m of meshes(model)) {
      expect(m.castShadow).toBe(true);
      const hits: unknown[] = [];
      m.raycast({} as never, hits as never);
      expect(hits).toEqual([]);
    }
    // the aim goes to the placement through the footprint box (never drawn)
    expect(placed.proxy.userData.owner).toBe("icu-1.bed");
    expect([placed.proxy.scale.x, placed.proxy.scale.y, placed.proxy.scale.z]).toEqual([1, 0.5, 2]);
    expect((placed.proxy.material as { visible: boolean }).visible).toBe(false);
    // the cached scene itself is untouched (clones per placement)
    expect(scene.scale.x).toBe(1);
    // a small item (an instrument on the back table) casts no shadow
    const small = placeModel(scene, {}, { w: 0.16, d: 0.04, h: 0.03 }, { x: 0, y: 0.9, z: 0, rot: 0, id: "or-1.scalpel" }, true)!;
    expect(MODEL_SHADOW_MIN).toBeGreaterThan(0.16);
    for (const m of meshes(small.group.children.find((c) => c !== small.proxy)!)) expect(m.castShadow).toBe(false);
    cache.dispose();
  });
});

describe("instanceModel", () => {
  it("draws static placements as instances where placeModel would put each clone, with an aim proxy each", async () => {
    const cache = new ModelCache({ fetch: server({ "/local-assets/bed.glb": glb }).fetch });
    const scene = await cache.load("bed.glb");
    const footprint = { w: 1, d: 2, h: 0.5 };
    const placements = [
      { ref: { scale: 0.5 }, footprint, at: { x: 3, y: 5, z: -2, rot: 90, id: "or-1.bed" } },
      { ref: { offset: [0, 0.2, 0.1] as [number, number, number] }, footprint, at: { x: -4, y: 5, z: 6, rot: 180, id: "or-2.bed" } },
    ];
    const inst = instanceModel(scene, placements, true)!;
    expect(inst.meshes).toHaveLength(meshes(scene).length);
    const im = inst.meshes[0];
    expect(im.count).toBe(2);
    expect(im.castShadow).toBe(true);
    const hits: unknown[] = [];
    im.raycast({} as never, hits as never);
    expect(hits).toEqual([]);
    placements.forEach((p, i) => {
      const clone = placeModel(scene, p.ref, p.footprint, p.at, true)!;
      const mesh = meshes(clone.group.children.find((c) => c !== clone.proxy)!)[0];
      const got = new Matrix4();
      im.getMatrixAt(i, got);
      got.elements.forEach((v, k) => expect(v).toBeCloseTo(mesh.matrixWorld.elements[k], 6));
      expect(inst.proxies[i].userData.owner).toBe(p.at.id);
      expect(inst.proxies[i].matrixWorld.elements.map((v) => +v.toFixed(6))).toEqual(clone.proxy.matrixWorld.elements.map((v) => +v.toFixed(6)));
    });
    expect(instanceModel(scene, [{ ...placements[0], footprint: { w: 0.16, d: 0.04, h: 0.03 } }], true)!.meshes[0].castShadow).toBe(false);
    cache.dispose();
  });
});
