/**
 * GLB / glTF inspection for equipment models (EMBODIED §11, docs/ASSETS.md):
 * parse a binary glTF container (or a .gltf JSON document) without any
 * renderer, count what it holds, compute its bounding box from the
 * accessors' min/max through the default scene's node transforms, list its
 * extensions, and check it against a catalog `model` reference (scale vs
 * the semantic footprint, licence, attribution, pinned SHA-256, extensions
 * the web renderer can load). Pure and isomorphic: bytes in, data out — the
 * caller reads the file and computes the SHA-256.
 *
 * `fitModel` is the one placement rule the renderer uses: scale (from the
 * reference, else a uniform fit inside the footprint), the reference's extra
 * Y rotation, then the bounding box centred on the footprint and standing on
 * the floor, plus the reference's offset.
 */
import type { EquipmentModel } from "../schema/facility.js";

/** `glTF` little-endian. */
const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

export type Vec3 = [number, number, number];

export interface GlbBounds {
  min: Vec3;
  max: Vec3;
  size: Vec3;
}

export interface AssetIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

export interface GlbInfo {
  /** "glb" (binary container) or "gltf" (JSON document). */
  container: "glb" | "gltf";
  /** glTF container version (2) and declared byte length (GLB only). */
  version: number;
  byteLength: number;
  chunks: { type: string; length: number }[];
  asset: { version: string; generator?: string; copyright?: string; minVersion?: string };
  counts: {
    scenes: number;
    nodes: number;
    meshes: number;
    primitives: number;
    triangles: number;
    vertices: number;
    materials: number;
    textures: number;
    images: number;
    accessors: number;
    animations: number;
    skins: number;
  };
  /** Bounding box in metres (glTF units, Y up) of the default scene; null without POSITION min/max. */
  bounds: GlbBounds | null;
  extensionsUsed: string[];
  extensionsRequired: string[];
  /** Problems of the file itself (container, references, missing bounds). */
  issues: AssetIssue[];
}

export class GlbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GlbError";
  }
}

/**
 * Extensions the web renderer (three's GLTFLoader + MeshoptDecoder) loads.
 * KHR_draco_mesh_compression needs a configured DRACO decoder path, KHR_texture_basisu a KTX2 transcoder (not bundled).
 */
export const GLB_RENDERER_EXTENSIONS: readonly string[] = [
  "EXT_mesh_gpu_instancing",
  "EXT_meshopt_compression",
  "EXT_texture_avif",
  "EXT_texture_webp",
  "KHR_lights_punctual",
  "KHR_materials_anisotropy",
  "KHR_materials_clearcoat",
  "KHR_materials_dispersion",
  "KHR_materials_emissive_strength",
  "KHR_materials_ior",
  "KHR_materials_iridescence",
  "KHR_materials_sheen",
  "KHR_materials_specular",
  "KHR_materials_transmission",
  "KHR_materials_unlit",
  "KHR_materials_volume",
  "KHR_mesh_quantization",
  "KHR_texture_transform",
];
/** Loadable only when the renderer is configured with a decoder for them. */
export const GLB_DECODER_EXTENSIONS: readonly string[] = ["KHR_draco_mesh_compression", "KHR_texture_basisu"];

type Json = Record<string, unknown>;
type Mat4 = number[];

const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Column-major 4×4 identity / multiply / TRS, as glTF stores matrices. */
const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a: Mat4, b: Mat4): Mat4 {
  const o = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function trs(t: number[] = [0, 0, 0], q: number[] = [0, 0, 0, 1], s: number[] = [1, 1, 1]): Mat4 {
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * s[0], 2 * (xy + wz) * s[0], 2 * (xz - wy) * s[0], 0,
    2 * (xy - wz) * s[1], (1 - 2 * (xx + zz)) * s[1], 2 * (yz + wx) * s[1], 0,
    2 * (xz + wy) * s[2], 2 * (yz - wx) * s[2], (1 - 2 * (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}
function nodeMatrix(n: Json): Mat4 {
  if (Array.isArray(n.matrix) && n.matrix.length === 16) return (n.matrix as unknown[]).map((v) => num(v));
  return trs(n.translation as number[] | undefined, n.rotation as number[] | undefined, n.scale as number[] | undefined);
}
function apply(m: Mat4, p: Vec3): Vec3 {
  return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
}

/** Largest value of a normalized integer component type (glTF componentType). */
const NORMALIZED_MAX: Record<number, number> = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

function readHeader(bytes: Uint8Array): { json: Json; version: number; byteLength: number; chunks: { type: string; length: number }[]; issues: AssetIssue[] } {
  const issues: AssetIssue[] = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20) throw new GlbError(`too short for a GLB (${bytes.byteLength} bytes)`);
  const version = dv.getUint32(4, true);
  const byteLength = dv.getUint32(8, true);
  if (version !== 2) throw new GlbError(`unsupported glTF container version ${version} (expected 2)`);
  if (byteLength !== bytes.byteLength) issues.push({ severity: byteLength > bytes.byteLength ? "error" : "warning", code: "length", message: `header length ${byteLength} B ≠ file size ${bytes.byteLength} B` });
  const chunks: { type: string; length: number }[] = [];
  let json: Json | null = null;
  let offset = 12;
  const end = Math.min(byteLength, bytes.byteLength);
  while (offset + 8 <= end) {
    const length = dv.getUint32(offset, true);
    const type = dv.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + length > end) throw new GlbError(`chunk ${chunks.length} overruns the file (${length} B at ${start})`);
    const name = type === CHUNK_JSON ? "JSON" : type === CHUNK_BIN ? "BIN" : `0x${type.toString(16).padStart(8, "0")}`;
    chunks.push({ type: name, length });
    if (chunks.length === 1 && type !== CHUNK_JSON) throw new GlbError("the first chunk is not JSON");
    if (type === CHUNK_JSON && !json) {
      const text = new TextDecoder("utf-8").decode(bytes.subarray(start, start + length));
      try {
        json = JSON.parse(text) as Json;
      } catch (e) {
        throw new GlbError(`the JSON chunk does not parse: ${(e as Error).message}`);
      }
    }
    if (length % 4) issues.push({ severity: "warning", code: "padding", message: `chunk ${chunks.length - 1} (${name}) is not 4-byte aligned` });
    offset = start + length + ((4 - (length % 4)) % 4);
  }
  if (!json) throw new GlbError("no JSON chunk");
  return { json, version, byteLength, chunks, issues };
}

/**
 * Parse a GLB (or a .gltf JSON document) and describe it. Throws `GlbError`
 * when the container itself is unreadable; problems inside a readable file
 * are returned in `issues`.
 */
export function parseGlb(bytes: Uint8Array): GlbInfo {
  const isGlb = bytes.byteLength >= 4 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) === GLB_MAGIC;
  let head: ReturnType<typeof readHeader>;
  if (isGlb) head = readHeader(bytes);
  else {
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder("utf-8").decode(bytes));
    } catch {
      throw new GlbError("neither a GLB (no glTF magic) nor a glTF JSON document");
    }
    if (!json || typeof json !== "object" || !(json as Json).asset) throw new GlbError("a JSON document without a glTF `asset`");
    head = { json: json as Json, version: 2, byteLength: bytes.byteLength, chunks: [], issues: [] };
  }
  const { json } = head;
  const issues = [...head.issues];
  const asset = (json.asset ?? {}) as Json;
  if (typeof asset.version !== "string") issues.push({ severity: "error", code: "asset", message: "asset.version is missing" });
  else if (!asset.version.startsWith("2.")) issues.push({ severity: "error", code: "asset", message: `glTF ${asset.version} (expected 2.x)` });

  const accessors = arr(json.accessors);
  const meshes = arr(json.meshes);
  const nodes = arr(json.nodes);
  const scenes = arr(json.scenes);
  let primitives = 0, triangles = 0, vertices = 0;
  for (const m of meshes) {
    for (const p of arr(m.primitives)) {
      primitives++;
      const attrs = (p.attributes ?? {}) as Record<string, unknown>;
      const pos = typeof attrs.POSITION === "number" ? accessors[attrs.POSITION] : undefined;
      if (typeof attrs.POSITION === "number" && !pos) issues.push({ severity: "error", code: "reference", message: `a primitive references missing accessor ${attrs.POSITION}` });
      const count = num(pos?.count);
      vertices += count;
      const idx = typeof p.indices === "number" ? accessors[p.indices] : undefined;
      const n = idx ? num(idx.count) : count;
      const mode = num(p.mode, 4);
      triangles += mode === 4 ? Math.floor(n / 3) : mode === 5 || mode === 6 ? Math.max(0, n - 2) : 0;
    }
  }

  // bounds: POSITION min/max of every mesh instance in the default scene (all meshes untransformed without scenes)
  let bmin: Vec3 = [Infinity, Infinity, Infinity], bmax: Vec3 = [-Infinity, -Infinity, -Infinity];
  let missingBounds = 0;
  const addMesh = (meshIndex: number, m: Mat4) => {
    const mesh = meshes[meshIndex];
    if (!mesh) {
      issues.push({ severity: "error", code: "reference", message: `a node references missing mesh ${meshIndex}` });
      return;
    }
    for (const p of arr(mesh.primitives)) {
      const pos = accessors[num(((p.attributes ?? {}) as Json).POSITION, -1)];
      if (!pos) continue;
      if (!Array.isArray(pos.min) || !Array.isArray(pos.max) || pos.min.length < 3 || pos.max.length < 3) {
        missingBounds++;
        continue;
      }
      const k = pos.normalized === true ? NORMALIZED_MAX[num(pos.componentType)] ?? 1 : 1;
      const lo = (pos.min as number[]).slice(0, 3).map((v) => num(v) / k);
      const hi = (pos.max as number[]).slice(0, 3).map((v) => num(v) / k);
      for (let c = 0; c < 8; c++) {
        const w = apply(m, [c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]]);
        for (let a = 0; a < 3; a++) {
          bmin[a] = Math.min(bmin[a], w[a]);
          bmax[a] = Math.max(bmax[a], w[a]);
        }
      }
    }
  };
  const scene = scenes[num(json.scene, 0)];
  if (scene) {
    const seen = new Set<number>();
    const walk = (i: number, parent: Mat4) => {
      const n = nodes[i];
      if (!n || seen.has(i)) {
        if (!n) issues.push({ severity: "error", code: "reference", message: `a scene references missing node ${i}` });
        return;
      }
      seen.add(i);
      const m = mul(parent, nodeMatrix(n));
      if (typeof n.mesh === "number") addMesh(n.mesh, m);
      for (const c of Array.isArray(n.children) ? (n.children as unknown[]) : []) walk(num(c, -1), m);
    };
    for (const i of Array.isArray(scene.nodes) ? (scene.nodes as unknown[]) : []) walk(num(i, -1), IDENTITY);
  } else meshes.forEach((_, i) => addMesh(i, IDENTITY));
  if (missingBounds) issues.push({ severity: "warning", code: "bounds", message: `${missingBounds} POSITION accessor(s) without min/max (required by glTF 2.0): the bounding box leaves them out` });
  const bounds = Number.isFinite(bmin[0]) ? { min: bmin, max: bmax, size: [bmax[0] - bmin[0], bmax[1] - bmin[1], bmax[2] - bmin[2]] as Vec3 } : null;
  if (!meshes.length) issues.push({ severity: "error", code: "empty", message: "no meshes" });
  else if (!bounds) issues.push({ severity: "error", code: "bounds", message: "no bounding box: no mesh in the default scene has POSITION min/max" });

  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    container: isGlb ? "glb" : "gltf",
    version: head.version,
    byteLength: head.byteLength,
    chunks: head.chunks,
    asset: {
      version: String(asset.version ?? ""),
      ...(typeof asset.generator === "string" ? { generator: asset.generator } : {}),
      ...(typeof asset.copyright === "string" ? { copyright: asset.copyright } : {}),
      ...(typeof asset.minVersion === "string" ? { minVersion: asset.minVersion } : {}),
    },
    counts: {
      scenes: scenes.length,
      nodes: nodes.length,
      meshes: meshes.length,
      primitives,
      triangles,
      vertices,
      materials: arr(json.materials).length,
      textures: arr(json.textures).length,
      images: arr(json.images).length,
      accessors: accessors.length,
      animations: arr(json.animations).length,
      skins: arr(json.skins).length,
    },
    bounds,
    extensionsUsed: strs(json.extensionsUsed),
    extensionsRequired: strs(json.extensionsRequired),
    issues,
  };
}

/**
 * Assemble a GLB container (glTF 2.0 binary): the JSON chunk (space-padded)
 * and an optional BIN chunk (zero-padded). The inverse of `parseGlb`'s
 * container reading — for tools and tests that generate models.
 */
export function encodeGlb(json: object, bin?: Uint8Array): Uint8Array {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonLen = Math.ceil(text.byteLength / 4) * 4;
  const binLen = bin ? Math.ceil(bin.byteLength / 4) * 4 : 0;
  const total = 12 + 8 + jsonLen + (bin ? 8 + binLen : 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, GLB_MAGIC, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonLen, true);
  dv.setUint32(16, CHUNK_JSON, true);
  out.set(text, 20);
  out.fill(0x20, 20 + text.byteLength, 20 + jsonLen);
  if (bin) {
    const at = 20 + jsonLen;
    dv.setUint32(at, binLen, true);
    dv.setUint32(at + 4, CHUNK_BIN, true);
    out.set(bin, at + 8);
  }
  return out;
}

/** A model reference's scale as [x, y, z] (undefined: fit inside the footprint). */
export function modelScale(ref: Pick<EquipmentModel, "scale">): Vec3 | undefined {
  if (ref.scale === undefined) return undefined;
  return typeof ref.scale === "number" ? [ref.scale, ref.scale, ref.scale] : [ref.scale[0], ref.scale[1], ref.scale[2]];
}

export interface ModelFit {
  /** Scale applied to the model (from the reference, or the uniform fit). */
  scale: Vec3;
  /** Whether the scale was fitted (no `scale` in the reference). */
  fitted: boolean;
  /** Rotation about Y (radians) of the model inside the equipment's local frame. */
  rotY: number;
  /** Position of the model's origin in the equipment's local frame (floor centre of the footprint). */
  position: Vec3;
  /** Size (m) the model occupies in the local frame: x across, y up, z deep. */
  size: Vec3;
}

/**
 * Where a model goes in the equipment's local frame (origin: the footprint's
 * floor centre, before the placement's own rotation): scaled (reference
 * scale, else uniformly to fit inside the footprint), rotated by the
 * reference `rot`, its bounding box centred on the footprint and standing on
 * the floor, then moved by the reference `offset`. three.js applies it as
 * `object.scale`, `object.rotation.y`, `object.position` (T·R·S).
 */
export function fitModel(bounds: GlbBounds, ref: Pick<EquipmentModel, "scale" | "rot" | "offset">, footprint: { w: number; d: number; h: number }): ModelFit {
  const rotY = ((ref.rot ?? 0) * Math.PI) / 180;
  const c = Math.cos(rotY), s = Math.sin(rotY);
  // footprint-aligned extent of a box of size (sx, sz) rotated by rotY (about Y; +X → −Z at 90°)
  const turned = (sx: number, sz: number): [number, number] => [Math.abs(c) * sx + Math.abs(s) * sz, Math.abs(s) * sx + Math.abs(c) * sz];
  let scale = modelScale(ref);
  const fitted = !scale;
  if (!scale) {
    const [tx, tz] = turned(bounds.size[0], bounds.size[2]);
    const k = Math.min(...[footprint.w / tx, footprint.h / bounds.size[1], footprint.d / tz].filter((v) => Number.isFinite(v) && v > 0));
    const u = Number.isFinite(k) && k > 0 ? k : 1;
    scale = [u, u, u];
  }
  // scaled box, rotated: its centre and floor
  const lo: Vec3 = [bounds.min[0] * scale[0], bounds.min[1] * scale[1], bounds.min[2] * scale[2]];
  const hi: Vec3 = [bounds.max[0] * scale[0], bounds.max[1] * scale[1], bounds.max[2] * scale[2]];
  const cx = (lo[0] + hi[0]) / 2, cz = (lo[2] + hi[2]) / 2;
  // three.js rotation.y: x' = c·x + s·z, z' = −s·x + c·z
  const rcx = c * cx + s * cz, rcz = -s * cx + c * cz;
  const [wx, wz] = turned(hi[0] - lo[0], hi[2] - lo[2]);
  const off = ref.offset ?? [0, 0, 0];
  return { scale, fitted, rotY, position: [off[0] - rcx, off[1] - lo[1], off[2] - rcz], size: [wx, hi[1] - lo[1], wz] };
}

/** Licences that do not grant reuse (or say nothing). */
const NO_LICENCE = /^(?:|unknown|none|noassertion|todo|tbd|proprietary|all rights reserved|unlicensed)$/i;
/** Licences whose terms require attribution. */
const NEEDS_ATTRIBUTION = /^(?:CC-BY|CC BY|OGL|ODC-By)/i;

export interface ModelCheckOptions {
  /** Lowercase hex SHA-256 of the file (checked against the reference's pinned hash). */
  sha256?: string;
  /** The renderer is configured with a DRACO decoder path. */
  draco?: boolean;
  /** Relative tolerance of the size check before a warning (default 0.25), and before an error (default 1 = twice / half). */
  tolerance?: number;
  errorTolerance?: number;
}

/**
 * Check a parsed model against a catalog `model` reference and the
 * equipment's semantic footprint (the collider): licence and attribution,
 * pinned SHA-256, extensions the renderer cannot load, and whether the model
 * as placed (`fitModel`) matches the footprint's size.
 */
export function checkModelReference(info: GlbInfo, ref: EquipmentModel, footprint: { w: number; d: number; h: number }, opts: ModelCheckOptions = {}): AssetIssue[] {
  const out: AssetIssue[] = [...info.issues];
  const licence = (ref.license ?? "").trim();
  if (NO_LICENCE.test(licence)) out.push({ severity: "error", code: "license", message: `no usable licence ("${licence}"): a model needs an SPDX id or licence text that allows reuse` });
  else if (NEEDS_ATTRIBUTION.test(licence) && !ref.attribution) out.push({ severity: "warning", code: "attribution", message: `${licence} requires attribution: add \`attribution\` (author, source, changes)` });
  if (!ref.sha256) out.push({ severity: "warning", code: "sha256", message: "the reference pins no sha256: a changed file would be loaded silently" });
  else if (opts.sha256 && opts.sha256 !== ref.sha256) out.push({ severity: "error", code: "sha256", message: `sha256 mismatch: file ${opts.sha256}, reference ${ref.sha256}` });
  for (const ext of info.extensionsRequired) {
    if (GLB_RENDERER_EXTENSIONS.includes(ext)) continue;
    if (ext === "KHR_draco_mesh_compression" && opts.draco) continue;
    out.push({ severity: "error", code: "extension", message: GLB_DECODER_EXTENSIONS.includes(ext) ? `requires ${ext}: needs a decoder the renderer is not configured with (the voxel parts are shown instead)` : `requires ${ext}, which the renderer does not support` });
  }
  for (const ext of info.extensionsUsed) if (!info.extensionsRequired.includes(ext) && !GLB_RENDERER_EXTENSIONS.includes(ext) && !GLB_DECODER_EXTENSIONS.includes(ext)) out.push({ severity: "info", code: "extension", message: `uses ${ext} (optional; ignored by the renderer)` });
  if (info.bounds) {
    const fit = fitModel(info.bounds, ref, footprint);
    const fp: Vec3 = [footprint.w, footprint.h, footprint.d];
    const tol = opts.tolerance ?? 0.25, err = opts.errorTolerance ?? 1;
    const fmt = (v: Vec3) => v.map((x) => x.toFixed(2)).join(" × ");
    const ratios = fit.size.map((v, i) => (fp[i] > 0 ? v / fp[i] : 1));
    const worst = Math.max(...ratios.map((r) => (r > 0 ? Math.max(r, 1 / r) : Infinity)));
    if (fit.fitted) {
      out.push({ severity: "info", code: "scale", message: `no scale in the reference: fitted uniformly ×${fit.scale[0].toPrecision(3)} to ${fmt(fit.size)} m inside the footprint ${fmt(fp)} m` });
      const fill = Math.min(...ratios);
      if (fill < 0.5) out.push({ severity: "warning", code: "scale", message: `proportions differ from the footprint: fitted ${fmt(fit.size)} m fills ${(fill * 100).toFixed(0)} % of one footprint axis (${fmt(fp)} m)` });
    } else if (worst > 1 + err) out.push({ severity: "error", code: "scale", message: `scale mismatch: the model at its reference scale is ${fmt(fit.size)} m, the footprint ${fmt(fp)} m (w × h × d)` });
    else if (worst > 1 + tol) out.push({ severity: "warning", code: "scale", message: `scale mismatch: the model at its reference scale is ${fmt(fit.size)} m, the footprint ${fmt(fp)} m (w × h × d)` });
  }
  return out;
}
