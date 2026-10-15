/**
 * Anatomy atlas viewer — port of the Virtual Patient V4 viewer `Hd()`:
 * OrbitControls stage with rings, grid and dust, gzip GLB model with the
 * organ catalog in mesh userData, modes (cutaway / muscles / organs /
 * spleen), fly-to presets, scan ring, hover/pick highlighting. When the
 * model is not installed locally (modelUrl null or 404) the stage still
 * renders and `onStatus` explains how to install it.
 */
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Clock,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Points,
  PointsMaterial,
  Raycaster,
  SRGBColorSpace,
  Scene,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { AtlasApi, AtlasOptions, CreateAtlas } from "../contracts.js";
import { fetchCatalog, fetchModel, ModelNotInstalledError, type AtlasCatalogEntry } from "./loader.js";

export { ModelNotInstalledError } from "./loader.js";

type Mode = Parameters<AtlasApi["setMode"]>[0];
type FocusTarget = Parameters<AtlasApi["focus"]>[0];

interface Preset {
  pos: [number, number, number];
  target: [number, number, number];
}

/** V4 camera presets (+ heart / liver). */
export const ATLAS_PRESETS: Record<string, Preset> = {
  overview: { pos: [0.6, 1.45, 1.75], target: [0, 1.24, 0] },
  full: { pos: [0.48, 1, 3.05], target: [0, 0.88, 0] },
  spleen: { pos: [0.4, 1.23, 0.43], target: [0.07, 1.15, 0] },
  lung: { pos: [0.28, 1.43, 0.76], target: [0.02, 1.33, 0] },
  bone: { pos: [-0.33, 1.3, -0.85], target: [0, 1.15, -0.02] },
  heart: { pos: [0.26, 1.36, 0.66], target: [0.023, 1.29, 0.025] },
  liver: { pos: [-0.38, 1.2, 0.62], target: [-0.06, 1.13, 0.01] },
  front: { pos: [0, 1.24, 1.8], target: [0, 1.24, 0] },
  back: { pos: [0, 1.24, -1.8], target: [0, 1.24, 0] },
};

const MUSCULO = ["muscle", "tendon", "bone", "cartilage"];

function zh(): boolean {
  const lang = (typeof document !== "undefined" && document.documentElement.lang) || (typeof navigator !== "undefined" ? navigator.language : "") || "zh-CN";
  return lang.toLowerCase().startsWith("zh");
}

const TEXT = {
  loading: () => (zh() ? "下载解剖模型" : "Downloading anatomy model"),
  inflate: () => (zh() ? "解压解剖模型" : "Decompressing anatomy model"),
  build: () => (zh() ? "构建器官与材质" : "Building organs and materials"),
  missing: () =>
    zh()
      ? "未安装解剖模型：运行 clinicalcraft import-v4 <V4 压缩包> 安装到本地（docs/ASSETS.md）。病例原图与报告仍可正常调阅。"
      : "Anatomy model not installed: run `clinicalcraft import-v4 <V4 archives>` to install it locally (docs/ASSETS.md). Case figures and reports remain available.",
  failed: (e: unknown) => (zh() ? `解剖模型加载失败：${String((e as Error)?.message ?? e)}` : `Anatomy model failed to load: ${String((e as Error)?.message ?? e)}`),
};

/** Presets for heart / liver from the organ catalog centres when available. */
function catalogPresets(catalog: AtlasCatalogEntry[] | null): Record<string, Preset> {
  const out: Record<string, Preset> = {};
  if (!catalog) return out;
  for (const kind of ["heart", "liver", "spleen", "lung"]) {
    const items = catalog.filter((c) => c.kind === kind && Array.isArray(c.center));
    if (!items.length) continue;
    const c = items.reduce((a, it) => [a[0] + it.center[0] / items.length, a[1] + it.center[1] / items.length, a[2] + it.center[2] / items.length], [0, 0, 0] as number[]);
    if (kind === "heart" || kind === "liver") {
      const side = kind === "liver" ? -1 : 1;
      out[kind] = { pos: [c[0] + side * 0.26, c[1] + 0.07, c[2] + 0.62], target: [c[0], c[1], c[2]] };
    }
  }
  return out;
}

export const createAtlas: CreateAtlas = async (opts: AtlasOptions): Promise<AtlasApi> => {
  const { canvas } = opts;
  const reduced = () => {
    try {
      return !!opts.reducedMotion();
    } catch {
      return false;
    }
  };
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.localClippingEnabled = true;

  const scene = new Scene();
  const camera = new PerspectiveCamera(33, 1, 0.005, 15);
  camera.position.set(...ATLAS_PRESETS.overview.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...ATLAS_PRESETS.overview.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 0.12;
  controls.maxDistance = 4.5;
  controls.autoRotateSpeed = 0.6;
  controls.update();
  scene.add(new HemisphereLight(0xcbe4ee, 0x37332a, 1.8));
  for (const [pos, color, intensity] of [
    [[-1, 2, 2], 0xffe9d2, 3],
    [[1, 1.3, 1], 0x9ed6e8, 1.9],
    [[0.3, 1.8, -1], 0x91c9dd, 3],
  ] as [[number, number, number], number, number][]) {
    const l = new DirectionalLight(color, intensity);
    l.position.set(...pos);
    scene.add(l);
  }

  // stage: rings, grid, dust (V4)
  const stage = new Group();
  scene.add(stage);
  const stageGeoms: BufferGeometry[] = [];
  const stageMats: Material[] = [];
  for (const r of [0.23, 0.35, 0.55]) {
    const g = new TorusGeometry(r, 8e-4, 5, 100);
    const m = new MeshBasicMaterial({ color: 0x5ea6a5, transparent: true, opacity: 0.3, depthWrite: false });
    stageGeoms.push(g);
    stageMats.push(m);
    const ring = new Mesh(g, m);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.002;
    stage.add(ring);
  }
  const grid = new GridHelper(3, 50, 0x254949, 0x132c32);
  grid.position.y = -0.003;
  stage.add(grid);
  const dustPos = new Float32Array(240);
  for (let i = 0; i < 80; i++) {
    const a = i * 2.399963;
    dustPos[i * 3] = Math.cos(a) * (0.3 + (i % 7) * 0.06);
    dustPos[i * 3 + 1] = 0.7 + (i % 23) * 0.045;
    dustPos[i * 3 + 2] = Math.sin(a) * 0.25 - 0.22;
  }
  const dustGeom = new BufferGeometry();
  dustGeom.setAttribute("position", new BufferAttribute(dustPos, 3));
  const dustMat = new PointsMaterial({ color: 0x6da3a8, size: 0.002, transparent: true, opacity: 0.32, depthWrite: false });
  const dust = new Points(dustGeom, dustMat);
  stage.add(dust);
  stageGeoms.push(dustGeom);
  stageMats.push(dustMat);
  const scanGeom = new TorusGeometry(0.18, 9e-4, 5, 100);
  const scanMat = new MeshBasicMaterial({ color: 0x8ae3d0, transparent: true, opacity: 0, depthWrite: false });
  const scanRing = new Mesh(scanGeom, scanMat);
  scanRing.rotation.x = Math.PI / 2;
  scene.add(scanRing);

  let model: Object3D | null = null;
  let mode: Mode = "cutaway";
  const meshes: Mesh[] = [];
  let focusKind = "";
  let hovered: Mesh | null = null;
  let flight: { start: number; from: Vector3; targetFrom: Vector3; to: Vector3; targetTo: Vector3 } | null = null;
  let rotating = false;
  let scanT = 10;
  let disposed = false;
  let raf = 0;
  let presets: Record<string, Preset> = { ...ATLAS_PRESETS };

  function fly(name: string): void {
    const p = presets[name] ?? presets.overview;
    rotating = false;
    controls.autoRotate = false;
    if (reduced()) {
      camera.position.set(...p.pos);
      controls.target.set(...p.target);
      controls.update();
      flight = null;
      return;
    }
    flight = { start: performance.now(), from: camera.position.clone(), targetFrom: controls.target.clone(), to: new Vector3(...p.pos), targetTo: new Vector3(...p.target) };
  }

  function setMode(next: Mode): void {
    mode = next;
    for (const m of meshes) {
      const ud = m.userData as { kind?: string; region?: string; thorax?: boolean };
      const kind = ud.kind ?? "";
      const mat = m.material as MeshStandardMaterial;
      m.visible = true;
      mat.clippingPlanes = [];
      mat.transparent = false;
      mat.opacity = 1;
      mat.depthWrite = true;
      if (mode === "cutaway") {
        if ((kind === "muscle" || kind === "tendon") && ud.region === "trunk") m.visible = false;
        if (ud.thorax) mat.clippingPlanes = [new Plane(new Vector3(0, 0, -1), 0.025)];
      } else if (mode === "muscles") m.visible = MUSCULO.includes(kind);
      else if (mode === "organs") m.visible = !MUSCULO.includes(kind);
      else if (mode === "spleen") {
        m.visible = kind === "spleen" || kind === "stomach" || kind === "pancreas";
        if (kind === "stomach") {
          mat.transparent = true;
          mat.opacity = 0.18;
          mat.depthWrite = false;
        }
      }
      mat.needsUpdate = true;
    }
  }

  function focus(target: FocusTarget): void {
    if (target === "overview") {
      focusKind = "";
      setMode("cutaway");
      fly("overview");
      scanT = 0;
      return;
    }
    focusKind = target;
    setMode(target === "spleen" ? "spleen" : "cutaway");
    fly(target);
    scanT = 0;
  }

  // picking (V4)
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let downAt: [number, number] | null = null;
  let lastHover = 0;
  const pick = (e: PointerEvent): Mesh | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster
      .intersectObjects(meshes.filter((m) => m.visible), false)
      .find((h) => !((h.object as Mesh).material as MeshStandardMaterial).clippingPlanes?.length || h.point.z <= 0.025);
    return (hit?.object as Mesh) ?? null;
  };
  const onDown = (e: PointerEvent) => {
    flight = null;
    downAt = [e.clientX, e.clientY];
  };
  const onMove = (e: PointerEvent) => {
    if (e.buttons || performance.now() - lastHover < 90) return;
    lastHover = performance.now();
    hovered = pick(e);
    canvas.style.cursor = hovered ? "pointer" : "grab";
  };
  const onLeave = () => (hovered = null);
  const onUp = (e: PointerEvent) => {
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5) {
      const m = pick(e);
      if (m) {
        const ud = m.userData as { kind?: string; label?: string };
        focusKind = ud.kind ?? "";
        scanT = 0;
        opts.onSelect({ kind: ud.kind ?? "", label: ud.label || ud.kind || m.name });
      }
    }
    downAt = null;
  };
  const onWheel = () => (flight = null);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("wheel", onWheel, { passive: true });

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  resize();

  const clock = new Clock();
  function frame(): void {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (document.hidden || !canvas.isConnected || !canvas.getClientRects().length) return;
    const now = performance.now();
    if (flight) {
      const k = Math.min(1, (now - flight.start) / 1100);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(flight.from, flight.to, e);
      controls.target.lerpVectors(flight.targetFrom, flight.targetTo, e);
      if (k === 1) flight = null;
    }
    controls.update(dt);
    const rm = reduced();
    for (const m of meshes) {
      const mat = m.material as MeshStandardMaterial;
      const focused = !!focusKind && (m.userData as { kind?: string }).kind === focusKind;
      mat.emissive.setHex(focused ? 0x387e6a : m === hovered ? 0x35595e : 0);
      mat.emissiveIntensity = focused ? (rm ? 0.17 : 0.17 + Math.sin(now * 0.002) * 0.045) : m === hovered ? 0.16 : 0;
    }
    scanT += dt;
    scanRing.visible = !rm && scanT < 1.8;
    if (scanRing.visible) {
      scanRing.position.y = 0.95 + scanT * 0.3;
      scanMat.opacity = (1 - scanT / 1.8) * 0.5;
    }
    if (!rm) dust.rotation.y = Math.sin(now * 15e-5) * 0.12;
    renderer.render(scene, camera);
  }
  frame();

  const api: AtlasApi = {
    setMode,
    focus,
    reset() {
      focusKind = "";
      setMode("cutaway");
      fly("overview");
    },
    rotate() {
      rotating = !rotating;
      controls.autoRotate = rotating && !reduced();
      return rotating;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      ro?.disconnect();
      controls.dispose();
      for (const m of meshes) {
        m.geometry.dispose();
        (m.material as Material).dispose();
      }
      for (const g of stageGeoms) g.dispose();
      for (const m of stageMats) m.dispose();
      scanGeom.dispose();
      scanMat.dispose();
      grid.geometry.dispose();
      (grid.material as Material).dispose();
      renderer.dispose();
      // Every atlas window gets a fresh canvas: release its WebGL context now instead of at GC time —
      // otherwise reopening the atlas piles up contexts until Chrome's limit (~16) evicts the oldest
      // one, which is the 3D world's.
      renderer.forceContextLoss();
    },
  };

  // load model + catalog
  try {
    if (!opts.modelUrl) throw new ModelNotInstalledError(null);
    opts.onStatus(TEXT.loading());
    const catalogPromise = opts.catalog ? Promise.resolve(opts.catalog) : fetchCatalog(opts.modelUrl);
    const buffer = await fetchModel(opts.modelUrl, (loaded, total) => {
      const mb = (n: number) => (n / 1048576).toFixed(1);
      opts.onStatus(total ? `${TEXT.loading()} ${mb(loaded)} / ${mb(total)} MB` : `${TEXT.loading()} ${mb(loaded)} MB`);
    });
    if (disposed) return api;
    opts.onStatus(TEXT.build());
    const gltf = await new GLTFLoader().parseAsync(buffer, "");
    if (disposed) return api;
    model = gltf.scene;
    scene.add(model);
    const catalog = await catalogPromise;
    presets = { ...ATLAS_PRESETS, ...catalogPresets(catalog) };
    const byId = new Map((catalog ?? []).map((c) => [c.id, c]));
    model.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      Object.assign(m.userData, byId.get(m.name) ?? {});
      const old = m.material as MeshStandardMaterial;
      m.material = new MeshStandardMaterial({ color: old.color ? old.color.clone() : 0xcccccc, roughness: 0.48, metalness: 0.015, side: DoubleSide });
      old.dispose?.();
      meshes.push(m);
    });
    setMode(mode);
    opts.onReady();
  } catch (e) {
    if (e instanceof ModelNotInstalledError) opts.onStatus(TEXT.missing());
    else {
      console.error(e);
      opts.onStatus(TEXT.failed(e));
    }
  }
  return api;
};

export default createAtlas;
