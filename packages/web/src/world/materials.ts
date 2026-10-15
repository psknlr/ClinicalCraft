/**
 * Material library: catalog materials (merged by id, later catalogs win)
 * → three.js MeshStandardMaterials with V4 pixel textures.
 */
import {
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  NearestFilter,
  NearestMipmapNearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Material,
  type Texture,
} from "three";
import type { EquipmentCatalog, EquipmentType, MaterialDef } from "@clinicalcraft/core";
import { createLcg, hashString, pixelsToCanvas, texturePixels, V4_SEED, type TexturePattern } from "./textures.js";

/** Atlas grid (tiles per side, 16 px each): 32 → 1024 materials in a 512² texture. */
const ATLAS_TILES = 32;

export interface MergedCatalogs {
  materials: Map<string, MaterialDef>;
  equipment: Map<string, EquipmentType>;
  /** Material ids in first-seen order (texture stream order). */
  materialOrder: string[];
}

const FALLBACK_MATERIALS: MaterialDef[] = [
  { id: "__missing", color: "#ff00ff", pattern: "flat", variance: 0, emissiveIntensity: 0.3, opacity: 1, roughness: 0.9, metalness: 0, castShadow: true },
];

/** Normalise a material def that may come from un-parsed JSON (zod defaults missing). */
export function normalizeMaterial(m: Partial<MaterialDef> & { id: string; color: string }): MaterialDef {
  return {
    id: m.id,
    color: m.color,
    pattern: (m.pattern ?? "noise") as MaterialDef["pattern"],
    variance: m.variance ?? 0.11,
    emissive: m.emissive,
    emissiveIntensity: m.emissiveIntensity ?? 0.3,
    opacity: m.opacity ?? 1,
    roughness: m.roughness ?? 0.93,
    metalness: m.metalness ?? 0,
    castShadow: m.castShadow ?? true,
  };
}

/** Merge catalogs (+ facility-local materials) by id; later definitions replace earlier ones. */
export function mergeCatalogs(catalogs: EquipmentCatalog[], extraMaterials: MaterialDef[] = []): MergedCatalogs {
  const materials = new Map<string, MaterialDef>();
  const equipment = new Map<string, EquipmentType>();
  const materialOrder: string[] = [];
  const addMat = (m: MaterialDef) => {
    if (!materials.has(m.id)) materialOrder.push(m.id);
    materials.set(m.id, normalizeMaterial(m));
  };
  for (const c of catalogs) {
    for (const m of c.materials ?? []) addMat(m);
    for (const e of c.equipment ?? []) equipment.set(e.id, e);
  }
  for (const m of extraMaterials) addMat(m);
  return { materials, equipment, materialOrder };
}

export class MaterialLibrary {
  private readonly mats = new Map<string, MeshStandardMaterial>();
  private readonly defs = new Map<string, MaterialDef>();
  private readonly textures: Texture[] = [];
  private readonly missing = new Set<string>();
  private readonly tints = new Map<string, MeshStandardMaterial>();
  private readonly tiledMats = new Map<string, MeshStandardMaterial>();

  constructor(merged: MergedCatalogs) {
    // One V4 LCG stream across all catalog materials in first-seen order.
    const rnd = createLcg(V4_SEED);
    for (const id of merged.materialOrder) {
      const def = merged.materials.get(id);
      if (def) this.create(def, rnd);
    }
    for (const def of FALLBACK_MATERIALS) if (!this.mats.has(def.id)) this.create(def, createLcg(1));
  }

  private create(def: MaterialDef, rnd: () => number): MeshStandardMaterial {
    const pixels = texturePixels(def.color, def.pattern as TexturePattern, def.variance, rnd);
    const tex = new CanvasTexture(pixelsToCanvas(pixels));
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestMipmapNearestFilter;
    tex.colorSpace = SRGBColorSpace;
    this.textures.push(tex);
    const transparent = def.opacity < 1;
    const mat = new MeshStandardMaterial({
      map: tex,
      roughness: def.roughness,
      metalness: def.metalness,
      transparent,
      opacity: def.opacity,
      depthWrite: def.opacity >= 0.5,
      emissive: def.emissive ? new Color(def.emissive) : new Color(0x000000),
      emissiveIntensity: def.emissive ? def.emissiveIntensity : 0,
    });
    mat.name = def.id;
    this.mats.set(def.id, mat);
    this.defs.set(def.id, def);
    return mat;
  }

  has(id: string): boolean {
    return this.mats.has(id);
  }

  def(id: string): MaterialDef | undefined {
    return this.defs.get(id);
  }

  /** Material by id (magenta fallback + one console warning for unknown ids). */
  get(id: string): MeshStandardMaterial {
    const m = this.mats.get(id);
    if (m) return m;
    if (!this.missing.has(id)) {
      this.missing.add(id);
      console.warn(`[world] unknown material "${id}"`);
    }
    return this.mats.get("__missing")!;
  }

  castShadow(id: string): boolean {
    return this.defs.get(id)?.castShadow ?? true;
  }

  /**
   * Tiled variant for merged boxes: the texture repeats once per world unit
   * on every face (UV × instance scale in the vertex shader), so one long
   * box looks exactly like a row of V4 1×1 blocks.
   */
  tiled(id: string): MeshStandardMaterial {
    let m = this.tiledMats.get(id);
    if (m) return m;
    const base = this.get(id);
    m = base.clone();
    if (base.map) {
      const tex = base.map.clone();
      tex.wrapS = tex.wrapT = RepeatWrapping;
      tex.needsUpdate = true;
      this.textures.push(tex);
      m.map = tex;
    }
    m.name = base.name;
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
#if defined( USE_MAP ) && defined( USE_INSTANCING )
{
  vec3 sc = vec3( length( instanceMatrix[0].xyz ), length( instanceMatrix[1].xyz ), length( instanceMatrix[2].xyz ) );
  vec3 an = abs( normal );
  vec2 rep = an.x > 0.5 ? sc.zy : ( an.y > 0.5 ? sc.xz : sc.xy );
  vMapUv *= rep;
}
#endif`,
      );
    };
    m.customProgramCacheKey = () => "cc-tiled";
    this.tiledMats.set(id, m);
    return m;
  }

  /** A V4-textured material for an arbitrary colour (NPC skin/hair/clothes). Deterministic per colour. */
  color(hex: string, pattern: TexturePattern = "noise", variance = 0.11): MeshStandardMaterial {
    const key = `${hex}|${pattern}|${variance}`;
    let m = this.mats.get(key);
    if (m) return m;
    const def: MaterialDef = { id: key, color: hex, pattern, variance, emissiveIntensity: 0, opacity: 1, roughness: 0.93, metalness: 0, castShadow: true };
    m = this.create(def, createLcg(hashString(key) ^ V4_SEED));
    return m;
  }

  /** A per-object clone (for highlight/tint) of a library material; cached by key. */
  tinted(id: string, key: string, apply: (m: MeshStandardMaterial) => void): MeshStandardMaterial {
    const k = `${id}::${key}`;
    let m = this.tints.get(k);
    if (!m) {
      m = this.get(id).clone();
      apply(m);
      this.tints.set(k, m);
    }
    return m;
  }

  get missingIds(): string[] {
    return [...this.missing];
  }

  /* ---------------- texture atlas (merging movable multi-material groups) ---------------- */

  private atlasCanvas: HTMLCanvasElement | null = null;
  private atlasTex: CanvasTexture | null = null;
  private atlasMat: MeshStandardMaterial | null = null;
  private readonly atlasTiles = new Map<string, number>();

  /**
   * Whether a library material can be drawn through the shared atlas material
   * (opaque, not emissive, default V4 shading) — its pixels are then sampled
   * from an atlas tile, so boxes of many such materials merge into one mesh.
   */
  canAtlas(m: Material | null | undefined): boolean {
    if (!m || !(m as MeshStandardMaterial).isMeshStandardMaterial || !this.mats.has(m.name) || this.mats.get(m.name) !== m) return false;
    const d = this.defs.get(m.name);
    return !!d && d.opacity >= 1 && !d.emissive && d.metalness === 0 && Math.abs(d.roughness - 0.93) < 0.05;
  }

  /** The shared atlas material (vertex colours multiply the texel: used for tints such as flushed skin). */
  atlasMaterial(): MeshStandardMaterial {
    this.ensureAtlas();
    return this.atlasMat!;
  }

  /**
   * UV rectangle [u0, v0, u1, v1] of a material's 16×16 texture in the atlas
   * (added on first use), inset by half a texel so nearest sampling never
   * reads a neighbouring tile.
   */
  atlasUv(id: string): [number, number, number, number] {
    this.ensureAtlas();
    let idx = this.atlasTiles.get(id);
    if (idx == null) {
      idx = this.atlasTiles.size;
      if (idx >= ATLAS_TILES * ATLAS_TILES) idx = 0; // full: degrade (never reached by facility content)
      else {
        const src = (this.get(id).map?.image ?? null) as CanvasImageSource | null;
        const ctx = this.atlasCanvas!.getContext("2d");
        const tx = (idx % ATLAS_TILES) * 16, ty = Math.floor(idx / ATLAS_TILES) * 16;
        if (ctx && src) ctx.drawImage(src, tx, ty, 16, 16);
        this.atlasTiles.set(id, idx);
        this.atlasTex!.needsUpdate = true;
      }
    }
    const size = ATLAS_TILES * 16;
    const tx = (idx % ATLAS_TILES) * 16, ty = Math.floor(idx / ATLAS_TILES) * 16;
    // canvas y grows downwards; texture v grows upwards (flipY)
    return [(tx + 0.5) / size, 1 - (ty + 15.5) / size, (tx + 15.5) / size, 1 - (ty + 0.5) / size];
  }

  private ensureAtlas(): void {
    if (this.atlasMat) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = ATLAS_TILES * 16;
    this.atlasCanvas = canvas;
    const tex = new CanvasTexture(canvas);
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter; // no mipmaps: they would blend neighbouring tiles
    tex.generateMipmaps = false;
    tex.colorSpace = SRGBColorSpace;
    this.atlasTex = tex;
    this.textures.push(tex);
    this.atlasMat = new MeshStandardMaterial({ map: tex, roughness: 0.93, metalness: 0, vertexColors: true });
    this.atlasMat.name = "__atlas";
  }

  dispose(): void {
    for (const m of this.mats.values()) m.dispose();
    for (const m of this.tints.values()) m.dispose();
    for (const m of this.tiledMats.values()) m.dispose();
    this.atlasMat?.dispose();
    this.atlasMat = null;
    this.tiledMats.clear();
    for (const t of this.textures) t.dispose();
    this.mats.clear();
    this.tints.clear();
  }
}
