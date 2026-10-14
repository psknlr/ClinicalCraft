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
  SRGBColorSpace,
  type Texture,
} from "three";
import type { EquipmentCatalog, EquipmentType, MaterialDef } from "@clinicalcraft/core";
import { createLcg, hashString, pixelsToCanvas, texturePixels, V4_SEED, type TexturePattern } from "./textures.js";

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

  dispose(): void {
    for (const m of this.mats.values()) m.dispose();
    for (const m of this.tints.values()) m.dispose();
    for (const t of this.textures) t.dispose();
    this.mats.clear();
    this.tints.clear();
  }
}
