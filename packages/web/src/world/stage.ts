/**
 * The three.js stage of a voxel world (V4 `Ld`): the WebGL renderer (pixel ratio and shadow map follow the
 * quality setting), the scene with its sky, fog and hemisphere light, the first-person camera and the sun —
 * its shadow box covers a V4-sized facility, or follows the player in steps over a large one; the scene is
 * static apart from doors, blocks and NPC rebuilds, so the shadow map is rendered on demand (`markShadows`).
 * `LightPool` moves a quality-sized pool of real point lights to the fixtures nearest the player; the other
 * fixtures stay emissive-only.
 */
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
  type Material,
  type Mesh,
} from "three";
import type { FacilityDefinition } from "@clinicalcraft/core";
import type { WorldSettings } from "../contracts.js";
import type { LightCandidate } from "./context.js";
import { PHYSICS } from "./physics.js";
import type { VoxelWorld } from "./voxel-world.js";

/** Render quality: pixel-ratio cap, shadow map size (0 = off) and real PointLight budget (rest stay emissive-only). */
export const QUALITY = {
  high: { ratio: 1.6, shadow: 2048, lights: 12 },
  medium: { ratio: 1.25, shadow: 1024, lights: 8 },
  low: { ratio: 1, shadow: 0, lights: 4 },
} as const;

/** Renderer exposure (V4); dimmed while an elevator car moves. */
export const EXPOSURE = 1.15;

// Shadow box: the whole facility when it is V4-sized (half ≤ 40, V4 ±37), else a ±SHADOW_HALF box
// that follows the player in SHADOW_STEP jumps (sharper texels, fewer shadow-pass draw calls).
const SHADOW_HALF = 40;
const SHADOW_STEP = 8;

/** Lights of another level only fill the pool when nothing on the avatar's level is left (multi-level). */
const OTHER_LEVEL_LIGHT = 60;

/** Renderer, scene, camera and sun of one world. */
export class Stage {
  readonly renderer: WebGLRenderer;
  /** The device pixel ratio (capped by the quality setting). */
  readonly dpr: number;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly sun: DirectionalLight;
  /** The facility's group (the default level's content; other levels are its child groups). */
  readonly root: Group;
  /** The quality the renderer is set up for (`applyQuality` follows the settings). */
  quality: WorldSettings["quality"];
  private readonly followShadow: boolean;
  private readonly aimSun: (x: number, z: number) => void;
  private shadowCentre = "";

  constructor(
    private readonly canvas: HTMLCanvasElement,
    facility: FacilityDefinition,
    quality: WorldSettings["quality"],
  ) {
    this.quality = quality;
    const q0 = QUALITY[quality] ?? QUALITY.high;

    /* ---------------- renderer / scene (V4 Ld) ---------------- */
    const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    this.renderer = renderer;
    const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
    this.dpr = dpr;
    renderer.setPixelRatio(Math.min(dpr, q0.ratio));
    {
      const [w, h] = this.viewSize();
      renderer.setSize(w, h, false);
    }
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    renderer.shadowMap.enabled = q0.shadow > 0;
    renderer.shadowMap.type = PCFSoftShadowMap;

    const env = facility.environment ?? ({} as NonNullable<typeof facility.environment>);
    const scene = new Scene();
    this.scene = scene;
    scene.background = new Color(env.sky ?? "#a8d5e0");
    const fogDef = env.fog ?? { color: "#b9d8d6", near: 38, far: 82 };
    scene.fog = new Fog(fogDef.color, fogDef.near, fogDef.far);
    const [vw, vh] = this.viewSize();
    const camera = new PerspectiveCamera(PHYSICS.fov, vw / vh, 0.05, Math.max(110, fogDef.far + 28));
    this.camera = camera;
    camera.rotation.order = "YXZ";
    scene.add(camera);
    const hemi = env.hemisphere ?? { sky: "#d5f4ff", ground: "#83936c", intensity: 2.6 };
    scene.add(new HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

    const b = facility.bounds;
    const cX = (b.minX + b.maxX) / 2;
    const cZ = (b.minZ + b.maxZ) / 2;
    const half = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
    const followShadow = half > SHADOW_HALF;
    this.followShadow = followShadow;
    const boxHalf = followShadow ? SHADOW_HALF : half + 1.5;
    const sunScale = Math.max(1, (followShadow ? SHADOW_HALF : half) / 35.5);
    const sun = new DirectionalLight("#fff4d4", env.sunIntensity ?? 3.4);
    this.sun = sun;
    const aimSun = (x: number, z: number) => {
      sun.position.set(x - 23 * sunScale, 36 * sunScale, z + 19 * sunScale);
      sun.target.position.set(x, 0, z);
      sun.target.updateMatrixWorld();
    };
    this.aimSun = aimSun;
    aimSun(cX, cZ);
    sun.castShadow = q0.shadow > 0;
    sun.shadow.mapSize.set(q0.shadow || 1024, q0.shadow || 1024);
    Object.assign(sun.shadow.camera, { left: -boxHalf, right: boxHalf, top: boxHalf, bottom: -boxHalf, near: 1, far: 90 * sunScale });
    sun.shadow.normalBias = 0.05;
    sun.shadow.bias = -3e-4;
    scene.add(sun);
    scene.add(sun.target);
    // The scene is static apart from doors, blocks and NPC rebuilds: render the shadow map on demand
    // (halves the per-frame draw calls; NPC breathing / head turns do not need new shadows).
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;

    const root = new Group();
    this.root = root;
    root.name = "facility";
    scene.add(root);
  }

  /** The canvas size in CSS pixels (at least 1 × 1). */
  viewSize(): readonly [number, number] {
    const w = this.canvas.clientWidth || innerWidth;
    const h = this.canvas.clientHeight || innerHeight;
    return [Math.max(1, w), Math.max(1, h)] as const;
  }

  /** Render the shadow map again on the next frame (something that casts shadows moved). */
  readonly markShadows = (): void => {
    this.renderer.shadowMap.needsUpdate = true;
  };

  /** Re-centre a following shadow box on the player (in SHADOW_STEP jumps). */
  followSun(px: number, pz: number): void {
    if (!this.followShadow) return;
    const sx = Math.round(px / SHADOW_STEP) * SHADOW_STEP;
    const sz = Math.round(pz / SHADOW_STEP) * SHADOW_STEP;
    const key = `${sx},${sz}`;
    if (key === this.shadowCentre) return;
    this.shadowCentre = key;
    this.aimSun(sx, sz);
    this.markShadows();
  }

  /** Fit the renderer and the camera to the canvas. */
  readonly resize = (): void => {
    const [w, h] = this.viewSize();
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Follow a changed quality setting: pixel ratio, shadow map, light pool (`relight`). */
  applyQuality(s: WorldSettings, relight: () => void): void {
    const { renderer, sun, scene } = this;
    if (s.quality === this.quality) return;
    const prevShadows = renderer.shadowMap.enabled;
    this.quality = s.quality;
    const q = QUALITY[this.quality] ?? QUALITY.high;
    renderer.setPixelRatio(Math.min(this.dpr, q.ratio));
    this.resize();
    renderer.shadowMap.enabled = q.shadow > 0;
    sun.castShadow = q.shadow > 0;
    this.markShadows();
    relight();
    if (q.shadow > 0 && sun.shadow.mapSize.x !== q.shadow) {
      sun.shadow.mapSize.set(q.shadow, q.shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    if (prevShadows !== renderer.shadowMap.enabled)
      scene.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
        else if (m) m.needsUpdate = true;
      });
  }
}

/**
 * Point lights: a fixed pool (quality budget) of real PointLights is moved to the candidates nearest
 * the player (re-assigned as the player walks); the other fixtures stay emissive-only. A static
 * "nearest to spawn" choice left every room far from the entrance without its ceiling light.
 */
export class LightPool {
  private lightsAt: { x: number; z: number; level: string } | null = null;

  constructor(private readonly world: VoxelWorld) {}

  /** Move the pool to the fixtures nearest (px, pz) on the level at height py (`force`: even when it barely moved). */
  assign(px: number, pz: number, force = false, py = 0): void {
    const { ctx, levels, level, stage } = this.world;
    const here = levels.at(py);
    if (!force && this.lightsAt && this.lightsAt.level === here && Math.hypot(px - this.lightsAt.x, pz - this.lightsAt.z) < 1.5) return;
    this.lightsAt = { x: px, z: pz, level: here };
    const budget = Math.min(ctx.lights.length, (QUALITY[stage.quality] ?? QUALITY.high).lights);
    // pool size only changes with the quality setting (a different light count recompiles shaders)
    while (ctx.realLights.length < budget) {
      const pl = new PointLight();
      stage.root.add(pl);
      ctx.realLights.push(pl);
    }
    while (ctx.realLights.length > budget) ctx.realLights.pop()!.removeFromParent();
    const nearest = ctx.lights
      .map((l) => ({ l, d: Math.hypot(l.x - px, l.z - pz) + (levels.multi && (l.level ?? level) !== here ? OTHER_LEVEL_LIGHT : 0) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, budget)
      .map((e) => e.l);
    // keep lights that stay selected where they are (no flicker), move the freed ones to the new candidates
    const free: PointLight[] = [];
    const taken = new Set<LightCandidate>();
    for (const pl of ctx.realLights) {
      const cur = pl.userData.candidate as LightCandidate | undefined;
      if (cur && nearest.includes(cur) && !taken.has(cur)) taken.add(cur);
      else free.push(pl);
    }
    for (const l of nearest) {
      if (taken.has(l)) continue;
      const pl = free.pop();
      if (!pl) break;
      pl.userData.candidate = l;
      pl.color.set(l.color);
      pl.intensity = l.intensity;
      pl.distance = l.distance;
      pl.decay = l.decay;
      pl.position.set(l.x, l.y, l.z);
    }
  }
}
