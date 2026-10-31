/**
 * GLB inspection (EMBODIED §11): models are generated here, byte by byte —
 * no binary file is committed.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { EquipmentModel } from "../schema/facility.js";
import { checkModelReference, encodeGlb, fitModel, GlbError, parseGlb, type GlbInfo } from "./glb.js";

/** A box mesh (8 vertices, 12 triangles) of `size` centred on `centre`, as a GLB with optional node transform and extensions. */
function boxGlb(
  size: [number, number, number],
  opts: { centre?: [number, number, number]; node?: Record<string, unknown>; used?: string[]; required?: string[]; materials?: number; minMax?: boolean; generator?: string } = {},
): Uint8Array {
  const [w, h, d] = size;
  const [cx, cy, cz] = opts.centre ?? [0, h / 2, 0];
  const pos = new Float32Array(24);
  for (let i = 0; i < 8; i++) {
    pos[i * 3] = cx + (i & 1 ? w / 2 : -w / 2);
    pos[i * 3 + 1] = cy + (i & 2 ? h / 2 : -h / 2);
    pos[i * 3 + 2] = cz + (i & 4 ? d / 2 : -d / 2);
  }
  const idx = new Uint16Array([0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3]);
  const bin = new Uint8Array(pos.byteLength + idx.byteLength);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(idx.buffer), pos.byteLength);
  const json = {
    asset: { version: "2.0", generator: opts.generator ?? "clinicalcraft test" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, ...(opts.node ?? {}) }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, ...(opts.materials ? { material: 0 } : {}) }] }],
    materials: Array.from({ length: opts.materials ?? 0 }, (_, i) => ({ name: `m${i}` })),
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 8,
        type: "VEC3",
        ...(opts.minMax === false ? {} : { min: [cx - w / 2, cy - h / 2, cz - d / 2], max: [cx + w / 2, cy + h / 2, cz + d / 2] }),
      },
      { bufferView: 1, componentType: 5123, count: 36, type: "SCALAR" },
    ],
    ...(opts.used ? { extensionsUsed: opts.used } : {}),
    ...(opts.required ? { extensionsRequired: opts.required } : {}),
  };
  return encodeGlb(json, bin);
}

const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const close = (v: number[], w: number[]) => v.forEach((x, i) => expect(x).toBeCloseTo(w[i], 6));
const ref = (over: Partial<EquipmentModel> = {}): EquipmentModel => ({ uri: "models/bed.glb", license: "CC0-1.0", use: "cleared", source: { name: "test" }, ...over });

describe("parseGlb", () => {
  it("reads the container, counts and the accessor bounding box", () => {
    const bytes = boxGlb([0.9, 0.6, 2.1], { materials: 2 });
    const info = parseGlb(bytes);
    expect(info.container).toBe("glb");
    expect(info.version).toBe(2);
    expect(info.byteLength).toBe(bytes.byteLength);
    expect(info.chunks.map((c) => c.type)).toEqual(["JSON", "BIN"]);
    expect(info.asset).toEqual({ version: "2.0", generator: "clinicalcraft test" });
    expect(info.counts).toMatchObject({ scenes: 1, nodes: 1, meshes: 1, primitives: 1, triangles: 12, vertices: 8, materials: 2, accessors: 2, textures: 0, images: 0 });
    close(info.bounds!.min, [-0.45, 0, -1.05]);
    close(info.bounds!.size, [0.9, 0.6, 2.1]);
    expect(info.issues).toEqual([]);
  });

  it("applies node transforms (TRS and matrices) of the default scene", () => {
    // scale 2, then 90° about Y (x → −z), then translate
    const q = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
    const info = parseGlb(boxGlb([1, 1, 3], { node: { translation: [5, 0, 0], rotation: q, scale: [2, 2, 2] } }));
    close(info.bounds!.size, [6, 2, 2]);
    close(info.bounds!.min, [2, 0, -1]);
    const m = parseGlb(boxGlb([1, 1, 1], { node: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 3, 0, 1] } }));
    close(m.bounds!.min, [-0.5, 3, -0.5]);
  });

  it("lists extensions and reports missing bounds", () => {
    const info = parseGlb(boxGlb([1, 1, 1], { used: ["KHR_mesh_quantization", "EXT_meshopt_compression"], required: ["EXT_meshopt_compression"], minMax: false }));
    expect(info.extensionsUsed).toEqual(["KHR_mesh_quantization", "EXT_meshopt_compression"]);
    expect(info.extensionsRequired).toEqual(["EXT_meshopt_compression"]);
    expect(info.bounds).toBeNull();
    expect(info.issues.map((i) => i.code)).toEqual(["bounds", "bounds"]);
  });

  it("reads a .gltf JSON document too", () => {
    const glb = parseGlb(boxGlb([1, 2, 1]));
    const doc = new TextEncoder().encode(JSON.stringify({ asset: { version: "2.0" }, meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], accessors: [{ count: 3, type: "VEC3", componentType: 5126, min: [0, 0, 0], max: [1, 2, 1] }] }));
    const info = parseGlb(doc);
    expect(info.container).toBe("gltf");
    expect(info.counts.triangles).toBe(1);
    close(info.bounds!.size, glb.bounds!.size);
  });

  it("rejects what is not a glTF container", () => {
    expect(() => parseGlb(new Uint8Array([1, 2, 3]))).toThrow(GlbError);
    const bad = boxGlb([1, 1, 1]);
    new DataView(bad.buffer).setUint32(4, 1, true); // version 1
    expect(() => parseGlb(bad)).toThrow(/version 1/);
    const cut = boxGlb([1, 1, 1]).slice(0, 40);
    expect(() => parseGlb(cut)).toThrow(GlbError);
  });
});

describe("fitModel", () => {
  const bounds = parseGlb(boxGlb([2, 1, 4], { centre: [1, 0.5, -2] })).bounds!;
  it("uses the reference scale and centres the box on the footprint, standing on the floor", () => {
    const fit = fitModel(bounds, { scale: 0.5 }, { w: 1, d: 2, h: 0.5 });
    expect(fit.fitted).toBe(false);
    close(fit.scale, [0.5, 0.5, 0.5]);
    close(fit.size, [1, 0.5, 2]);
    // scaled centre (0.5, 0.25, −1) moved to the origin, floor at y 0
    close(fit.position, [-0.5, 0, 1]);
  });
  it("fits uniformly inside the footprint without a scale, after the reference rotation and with the offset", () => {
    const fit = fitModel(bounds, { rot: 90, offset: [0, 0.1, 0.2] }, { w: 2, d: 1, h: 2 });
    expect(fit.fitted).toBe(true);
    // turned 90°: 4 m along x, 2 m along z → ×0.5 fits 2 × 1
    close(fit.scale, [0.5, 0.5, 0.5]);
    close(fit.size, [2, 0.5, 1]);
    // scaled centre (0.5, ·, −1) rotated by 90° → (c·x + s·z, −s·x + c·z) = (−1, −0.5)
    close(fit.position, [1, 0.1, 0.7]);
    expect(fit.rotY).toBeCloseTo(Math.PI / 2);
  });
});

describe("checkModelReference", () => {
  const bytes = boxGlb([0.9, 0.6, 2.1]);
  const info: GlbInfo = parseGlb(bytes);
  const bed = { w: 0.9, d: 2.1, h: 0.6 };
  const codes = (list: { code: string; severity: string }[]) => list.map((i) => `${i.severity}:${i.code}`);
  it("passes a model that matches its footprint, licence and pinned hash", () => {
    expect(codes(checkModelReference(info, ref({ sha256: sha(bytes), scale: 1 }), bed, { sha256: sha(bytes) }))).toEqual([]);
  });
  it("flags a scale mismatch against the footprint (warning, then error)", () => {
    expect(codes(checkModelReference(info, ref({ sha256: sha(bytes), scale: 1.4 }), bed))).toEqual(["warning:scale"]);
    expect(codes(checkModelReference(info, ref({ sha256: sha(bytes), scale: 100 }), bed))).toEqual(["error:scale"]); // authored in cm
    // no scale: fitted (info) — and a warning when the proportions are far from the footprint
    expect(codes(checkModelReference(info, ref({ sha256: sha(bytes) }), bed))).toEqual(["info:scale"]);
    expect(codes(checkModelReference(info, ref({ sha256: sha(bytes) }), { w: 0.9, d: 2.1, h: 3 }))).toEqual(["info:scale", "warning:scale"]);
  });
  it("treats footprint axes under 5 cm as an aim allowance: a thinner model fits, a thicker one does not", () => {
    // a scalpel lying flat: 16 × 0.9 × 1.6 cm in a 16 × 3 × 4 cm footprint
    const flat = boxGlb([0.16, 0.009, 0.016]);
    const fp = { w: 0.16, d: 0.04, h: 0.03 };
    expect(codes(checkModelReference(parseGlb(flat), ref({ scale: 1, sha256: sha(flat) }), fp))).toEqual([]);
    const thick = boxGlb([0.16, 0.07, 0.016]);
    expect(codes(checkModelReference(parseGlb(thick), ref({ scale: 1, sha256: sha(thick) }), fp))).toEqual(["error:scale"]);
    // a long axis still catches a model authored in centimetres
    const cm = boxGlb([16, 0.9, 1.6]);
    expect(codes(checkModelReference(parseGlb(cm), ref({ scale: 1, sha256: sha(cm) }), fp))).toEqual(["error:scale"]);
  });
  it("requires a usable licence, attribution for CC-BY, and a pinned, matching sha256", () => {
    expect(codes(checkModelReference(info, ref({ license: "UNKNOWN", scale: 1, sha256: sha(bytes) }), bed))).toEqual(["error:license"]);
    expect(codes(checkModelReference(info, ref({ license: "CC-BY-4.0", scale: 1, sha256: sha(bytes) }), bed))).toEqual(["warning:attribution"]);
    expect(codes(checkModelReference(info, ref({ license: "CC-BY-4.0", attribution: { en: "A. Author", "zh-CN": "作者" }, scale: 1, sha256: sha(bytes) }), bed))).toEqual([]);
    expect(codes(checkModelReference(info, ref({ scale: 1 }), bed))).toEqual(["warning:sha256"]);
    expect(codes(checkModelReference(info, ref({ scale: 1, sha256: "0".repeat(64) }), bed, { sha256: sha(bytes) }))).toEqual(["error:sha256"]);
  });
  it("checks the use status and provenance: pending fails, research-only and non-commercial-but-cleared warn", () => {
    const ok = { scale: 1, sha256: sha(bytes) };
    expect(codes(checkModelReference(info, ref({ ...ok, use: undefined }), bed))).toEqual(["info:use"]);
    expect(codes(checkModelReference(info, ref({ ...ok, use: "pending", source: undefined }), bed))).toEqual(["error:use"]);
    expect(codes(checkModelReference(info, ref({ ...ok, use: "research-only" }), bed))).toEqual(["warning:use"]);
    expect(codes(checkModelReference(info, ref({ ...ok, source: undefined }), bed))).toEqual(["info:source"]);
    const by = { en: "A. Author", "zh-CN": "作者" };
    for (const license of ["CC-BY-NC-4.0", "CC BY-NC-SA 4.0", "CC-BY-NC-ND-4.0", "research and non-commercial use only"]) {
      expect([license, codes(checkModelReference(info, ref({ ...ok, license, attribution: by }), bed))]).toEqual([license, ["warning:use"]]);
      expect([license, codes(checkModelReference(info, ref({ ...ok, license, attribution: by, use: "research-only" }), bed))]).toEqual([license, ["warning:use"]]);
    }
    expect(codes(checkModelReference(info, ref({ ...ok, license: "CC-BY-4.0", attribution: by }), bed))).toEqual([]);
  });
  it("rejects required extensions the renderer cannot load (DRACO only with a decoder)", () => {
    const draco = parseGlb(boxGlb([0.9, 0.6, 2.1], { used: ["KHR_draco_mesh_compression"], required: ["KHR_draco_mesh_compression"] }));
    const r = ref({ scale: 1, sha256: "a".repeat(64) });
    expect(codes(checkModelReference(draco, r, bed))).toEqual(["error:extension"]);
    expect(codes(checkModelReference(draco, r, bed, { draco: true }))).toEqual([]);
    const meshopt = parseGlb(boxGlb([0.9, 0.6, 2.1], { used: ["EXT_meshopt_compression", "VENDOR_thing"], required: ["EXT_meshopt_compression"] }));
    expect(codes(checkModelReference(meshopt, r, bed))).toEqual(["info:extension"]);
  });
});
