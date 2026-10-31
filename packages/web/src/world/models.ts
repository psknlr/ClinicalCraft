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
import {
  Box3,
  BoxGeometry,
  ClampToEdgeWrapping,
  Group,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearMipmapNearestFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MirroredRepeatWrapping,
  NearestFilter,
  NearestMipmapLinearFilter,
  NearestMipmapNearestFilter,
  Quaternion,
  RepeatWrapping,
  Texture,
  Vector3,
  type MagnificationTextureFilter,
  type Material,
  type MinificationTextureFilter,
  type Object3D,
  type Wrapping,
} from "three";
import { GLTFLoader, type GLTFLoaderPlugin, type GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
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

const FILTERS: Record<number, MagnificationTextureFilter | MinificationTextureFilter> = {
  9728: NearestFilter,
  9729: LinearFilter,
  9984: NearestMipmapNearestFilter,
  9985: LinearMipmapNearestFilter,
  9986: NearestMipmapLinearFilter,
  9987: LinearMipmapLinearFilter,
};
const WRAPPINGS: Record<number, Wrapping> = { 33071: ClampToEdgeWrapping, 33648: MirroredRepeatWrapping, 10497: RepeatWrapping };

/**
 * GLTFLoader plugin: an image embedded in the GLB (a bufferView: the palette texture of
 * scripts/blender's models) is decoded from its bytes with createImageBitmap — no blob: URL and
 * no fetch, so a strict `connect-src` allows it and a reload or a disposed world that cuts a
 * load short logs nothing. The texture is set up as GLTFParser.loadTextureImage does (sampler,
 * wrapping, mipmaps, flipY). Other images, or no createImageBitmap: three's own path.
 */
export function embeddedImages(parser: GLTFParser): GLTFLoaderPlugin {
  return {
    name: "clinicalcraft_embedded_images",
    loadTexture(index: number): Promise<Texture> | null {
      const json = parser.json;
      const def = json.textures?.[index];
      const image = def?.source !== undefined ? json.images?.[def.source] : undefined;
      if (!image || image.bufferView === undefined || typeof createImageBitmap !== "function") return null;
      return parser.getDependency("bufferView", image.bufferView).then(async (data: ArrayBuffer) => {
        const bitmap = await createImageBitmap(new Blob([data], { type: image.mimeType ?? "image/png" }), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
        const texture = new Texture(bitmap);
        texture.flipY = false;
        texture.name = def.name || image.name || "";
        const sampler = json.samplers?.[def.sampler] ?? {};
        texture.magFilter = (FILTERS[sampler.magFilter] as MagnificationTextureFilter | undefined) ?? LinearFilter;
        texture.minFilter = (FILTERS[sampler.minFilter] as MinificationTextureFilter | undefined) ?? LinearMipmapLinearFilter;
        texture.wrapS = WRAPPINGS[sampler.wrapS] ?? RepeatWrapping;
        texture.wrapT = WRAPPINGS[sampler.wrapT] ?? RepeatWrapping;
        texture.generateMipmaps = texture.minFilter !== NearestFilter && texture.minFilter !== LinearFilter;
        texture.needsUpdate = true;
        parser.associations.set(texture, { textures: index });
        return texture;
      });
    },
  };
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
    this.loader.register(embeddedImages);
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

/**
 * Models whose footprint is smaller than this on every side (m) cast no shadow: an instrument's
 * shadow is a texel or two of the shadow map, and every caster costs the shadow pass a draw call.
 */
export const MODEL_SHADOW_MIN = 0.3;

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
 * rotation holding a clone of the scene with the fit transform (shadows on, except
 * for small items: `MODEL_SHADOW_MIN`; never ray-tested) and an invisible footprint
 * box owned by the placement.
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
  const casts = shadows && Math.max(footprint.w, footprint.d, footprint.h) >= MODEL_SHADOW_MIN;
  model.traverse((o) => {
    o.raycast = () => {};
    if ((o as Mesh).isMesh) {
      o.castShadow = casts;
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

/** The invisible footprint box carrying the aim for one placement (world transform; owner = the placement). */
function aimProxy(footprint: { w: number; d: number; h: number }, at: { x: number; y: number; z: number; rot: number; id: string }): Mesh {
  const proxy = new Mesh(PROXY_BOX, PROXY_MATERIAL);
  proxy.scale.set(footprint.w, footprint.h, footprint.d);
  proxy.rotation.y = (at.rot * Math.PI) / 180;
  proxy.position.set(at.x, at.y + footprint.h / 2, at.z);
  proxy.userData.owner = at.id;
  proxy.updateMatrixWorld(true);
  return proxy;
}

export interface InstancedModel {
  /** One instanced mesh per mesh of the model: an instance per placement, at its fitted transform. */
  meshes: InstancedMesh[];
  /** The aim proxy of each placement (same order). */
  proxies: Mesh[];
  fits: ModelFit[];
}

/**
 * Draw the static placements of one model as instances: a draw call per mesh (primitive) of the
 * model however many placements there are, each instance where `placeModel` would put a clone
 * (shadows as there, never ray-tested), plus an invisible aim proxy per placement. Portable
 * placements (carts, handheld items) move one by one and keep `placeModel`.
 */
export function instanceModel(
  scene: Object3D,
  placements: readonly { ref: Pick<EquipmentModel, "scale" | "rot" | "offset">; footprint: { w: number; d: number; h: number }; at: { x: number; y: number; z: number; rot: number; id: string } }[],
  shadows: boolean,
): InstancedModel | null {
  const bounds = objectBounds(scene);
  if (!bounds || !placements.length) return null;
  scene.updateMatrixWorld(true);
  const sources = meshesOf(scene);
  const fits: ModelFit[] = [];
  const frames: Matrix4[] = [];
  const up = new Vector3(0, 1, 0);
  for (const p of placements) {
    const fit = fitModel(bounds, p.ref, p.footprint);
    fits.push(fit);
    const place = new Matrix4().compose(new Vector3(p.at.x, p.at.y, p.at.z), new Quaternion().setFromAxisAngle(up, (p.at.rot * Math.PI) / 180), new Vector3(1, 1, 1));
    const fitted = new Matrix4().compose(new Vector3(...fit.position), new Quaternion().setFromAxisAngle(up, fit.rotY), new Vector3(...fit.scale));
    frames.push(place.multiply(fitted));
  }
  const meshes = sources.map((src) => {
    const im = new InstancedMesh(src.geometry, src.material, placements.length);
    im.name = `model:${src.name || "mesh"}`;
    const m = new Matrix4();
    frames.forEach((frame, i) => im.setMatrixAt(i, m.multiplyMatrices(frame, src.matrixWorld)));
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = shadows && Math.max(placements[0].footprint.w, placements[0].footprint.d, placements[0].footprint.h) >= MODEL_SHADOW_MIN;
    im.receiveShadow = true;
    im.raycast = () => {};
    im.computeBoundingSphere();
    return im;
  });
  return { meshes, proxies: placements.map((p) => aimProxy(p.footprint, p.at)), fits };
}

function meshesOf(o: Object3D): Mesh[] {
  const out: Mesh[] = [];
  o.traverse((c) => {
    if ((c as Mesh).isMesh) out.push(c as Mesh);
  });
  return out;
}

/** The shared proxy geometry/material are module-level (never disposed with a world). */
export function isModelProxyResource(x: unknown): boolean {
  return x === PROXY_BOX || x === PROXY_MATERIAL;
}
