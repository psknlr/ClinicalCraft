/**
 * Equipment models (EMBODIED §11, docs/ASSETS.md): an equipment type's
 * optional GLB/glTF `model` drawn instead of its voxel parts. Loaded with
 * three's GLTFLoader (+ MeshoptDecoder, imported only for a model that uses
 * it; DRACO only when a decoder path is configured), once per URL, checked
 * against the reference's pinned SHA-256,
 * fitted to the semantic footprint (`fitModel`: reference scale/rot/offset,
 * else a uniform fit), with shadows, and disposed with the world. Any error
 * or missing file leaves the voxel parts in place.
 *
 * Visual only: the collider is the type's footprint (the collision model),
 * and the interaction target stays the placement's — the model's own meshes
 * never take the aim; an invisible footprint box carries the placement id.
 */
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, type Material, type Object3D, type Texture } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import type { MeshoptDecoder as MeshoptDecoderType } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { fitModel, parseGlb, type EquipmentModel, type GlbBounds, type ModelFit } from "@clinicalcraft/core";

let meshopt: Promise<typeof MeshoptDecoderType> | null = null;
/**
 * The meshopt decoder, imported on first use only: it compiles WebAssembly as
 * soon as it is loaded, which a strict CSP (`script-src 'self'` without
 * `'wasm-unsafe-eval'`) reports — a world without meshopt models never loads it.
 */
function meshoptDecoder(): Promise<typeof MeshoptDecoderType> {
  meshopt ??= import("three/examples/jsm/libs/meshopt_decoder.module.js").then(async (m) => {
    await m.MeshoptDecoder.ready;
    return m.MeshoptDecoder;
  });
  return meshopt;
}

export interface ModelOptions {
  /** Base URL of relative model URIs (default "/local-assets/": the local-only asset route). */
  baseUrl?: string;
  /** DRACO decoder directory (e.g. "/draco/"); without it DRACO-compressed models fall back to voxels. */
  dracoPath?: string;
  /** Load models at all (default true). */
  enabled?: boolean;
  /** Fetch implementation (tests). */
  fetch?: (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;
}

/** URL of a model URI: absolute URLs, data:/blob: URIs and root paths as they are; relative ones under `baseUrl`. */
export function modelUrl(uri: string, baseUrl = "/local-assets/"): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(uri)) return uri;
  return `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}${uri.replace(/^\.\//, "")}`;
}

/** A URL short enough for a message (data: URIs by their type and length). */
export function shortUrl(url: string): string {
  if (url.startsWith("data:")) return `${url.slice(0, url.indexOf(",") > 0 ? Math.min(url.indexOf(","), 40) : 40)}… (${url.length} chars)`;
  return url.length > 120 ? `${url.slice(0, 117)}…` : url;
}

/** Lowercase hex SHA-256 with WebCrypto (null where it is unavailable: insecure contexts). */
export async function sha256Hex(buf: ArrayBuffer): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = new Uint8Array(await subtle.digest("SHA-256", buf));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Bounds of an object in its own frame (the loaded scene before any fit). */
export function objectBounds(o: Object3D): GlbBounds | null {
  o.updateMatrixWorld(true);
  const box = new Box3().setFromObject(o);
  if (box.isEmpty()) return null;
  const min: [number, number, number] = [box.min.x, box.min.y, box.min.z];
  const max: [number, number, number] = [box.max.x, box.max.y, box.max.z];
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

function disposeObject(o: Object3D): void {
  const textures = new Set<Texture>();
  o.traverse((c) => {
    const mesh = c as Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of mats as Material[]) {
      for (const v of Object.values(m)) if (v && typeof v === "object" && (v as Texture).isTexture) textures.add(v as Texture);
      m.dispose();
    }
  });
  for (const t of textures) t.dispose();
}

/**
 * Loads models once per URL (a placement gets a clone sharing geometry and
 * materials) and disposes everything it loaded.
 */
export class ModelCache {
  private readonly loader = new GLTFLoader();
  private readonly draco: DRACOLoader | null = null;
  private readonly cache = new Map<string, Promise<Object3D>>();
  private readonly fetchFn: NonNullable<ModelOptions["fetch"]>;
  readonly baseUrl: string;
  private disposed = false;

  constructor(opts: ModelOptions = {}) {
    this.baseUrl = opts.baseUrl ?? "/local-assets/";
    if (opts.dracoPath) {
      this.draco = new DRACOLoader();
      this.draco.setDecoderPath(opts.dracoPath);
      this.loader.setDRACOLoader(this.draco);
    }
    this.fetchFn = opts.fetch ?? ((url) => fetch(url));
  }

  /** The model's scene (shared: clone it before adding it to the world). Rejects on a missing file, a hash mismatch or a parse error. */
  load(uri: string, sha256?: string): Promise<Object3D> {
    const url = modelUrl(uri, this.baseUrl);
    let p = this.cache.get(url);
    if (!p) {
      p = (async () => {
        const res = await this.fetchFn(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (sha256) {
          const got = await sha256Hex(buf);
          if (got && got !== sha256) throw new Error(`sha256 ${got} ≠ ${sha256}`);
        }
        // the container's extensions decide which decoders to load (an unreadable file fails here)
        const info = parseGlb(new Uint8Array(buf));
        if (info.extensionsUsed.includes("EXT_meshopt_compression")) this.loader.setMeshoptDecoder(await meshoptDecoder());
        const base = url.slice(0, url.lastIndexOf("/") + 1);
        const gltf = await this.loader.parseAsync(buf, base);
        if (this.disposed) {
          disposeObject(gltf.scene);
          throw new Error("disposed");
        }
        return gltf.scene;
      })();
      this.cache.set(url, p);
    }
    return p;
  }

  dispose(): void {
    this.disposed = true;
    for (const p of this.cache.values()) p.then(disposeObject, () => {});
    this.cache.clear();
    this.draco?.dispose();
  }
}

/** An invisible box (the footprint) that carries the aim for a modelled placement: rendered never, ray-tested always. */
const PROXY_MATERIAL = new MeshBasicMaterial({ visible: false });
const PROXY_BOX = new BoxGeometry(1, 1, 1);

export interface PlacedModel {
  /** Placement group: position/rotation of the placement; children: the fitted model and the aim proxy. */
  group: Group;
  proxy: Mesh;
  fit: ModelFit;
}

/**
 * Put a loaded model at a placement: a group at the placement's origin and
 * rotation holding a clone of the scene with the fit transform (shadows on,
 * never ray-tested) and an invisible footprint box owned by the placement.
 */
export function placeModel(
  scene: Object3D,
  ref: Pick<EquipmentModel, "scale" | "rot" | "offset">,
  footprint: { w: number; d: number; h: number },
  at: { x: number; y: number; z: number; rot: number; id: string },
  shadows: boolean,
): PlacedModel | null {
  const bounds = objectBounds(scene);
  if (!bounds) return null;
  const fit = fitModel(bounds, ref, footprint);
  const model = scene.clone(true);
  model.scale.set(...fit.scale);
  model.rotation.set(0, fit.rotY, 0);
  model.position.set(...fit.position);
  model.traverse((o) => {
    o.raycast = () => {};
    if ((o as Mesh).isMesh) {
      o.castShadow = shadows;
      o.receiveShadow = true;
    }
  });
  const group = new Group();
  group.name = `model:${at.id}`;
  group.position.set(at.x, at.y, at.z);
  group.rotation.y = (at.rot * Math.PI) / 180;
  group.add(model);
  const proxy = new Mesh(PROXY_BOX, PROXY_MATERIAL);
  proxy.scale.set(footprint.w, footprint.h, footprint.d);
  proxy.position.set(0, footprint.h / 2, 0);
  proxy.userData.owner = at.id;
  group.add(proxy);
  group.updateMatrixWorld(true);
  return { group, proxy, fit };
}

/** The shared proxy geometry/material are module-level (never disposed with a world). */
export function isModelProxyResource(x: unknown): boolean {
  return x === PROXY_BOX || x === PROXY_MATERIAL;
}
