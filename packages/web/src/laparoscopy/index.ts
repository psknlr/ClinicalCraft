/**
 * The laparoscopic view of the surgery window: draws a `LapSceneSpec` (contracts.ts) — organs as smooth
 * blobs along their points, ducts and vessels as tubes along their centrelines with clips and a gap where
 * divided, tissue still over the regions, instrument shafts from their ports, blood, bile and stones —
 * from the scope at the camera port looking at the operative target (70° field of view, a slight orbit on
 * request). Handle labels ("T1"…) are buttons over the canvas; a click on a label or a tube picks it.
 * Optionally the case's anatomy model (GLB) supplies the organ surfaces: nodes named by structure id (or
 * `mesh`) replace the drawn organs; every other node stays hidden, and tubes are always drawn here (their
 * names are never shown). Like the atlas, every window gets a fresh canvas and `dispose()` releases its
 * WebGL context at once (reopening never piles up contexts).
 */
import {
  ACESFilmicToneMapping,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Clock,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  PropertyBinding,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Spherical,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { LapSceneSpec, LapVec3, LaparoscopeApi, LaparoscopeOptions } from "../contracts.js";

const TINT: Record<LapSceneSpec["organs"][number]["tint"], number> = {
  liver: 0x7a2c22,
  gallbladder: 0x587a5c,
  bowel: 0xd09684,
  stomach: 0xd7a08f,
  plate: 0xd8ccb0,
  ligament: 0xe1d2a6,
  tissue: 0xc58c76,
};
const TUBE: Record<LapSceneSpec["tubes"][number]["kind"], number> = { duct: 0xd6cd93, artery: 0xc04e3d, vein: 0x5b4f8a };
const FAT = 0xe8c66a;
const CLIP = 0x3b4046;
const SHAFT = 0x2a2e33;
const BACKGROUND = 0x1b0907;
const BLOOD = 0x6e0b09;
const BILE = 0x6f8a26;
/** How far into the abdomen the scope tip sits, as a fraction of the way from its port to the target. */
const SCOPE_DEPTH = 0.32;
/** Orbit limit about the scope's own view (radians). */
const ORBIT = 0.3;
/** Gap left where a tube is divided (m). */
const GAP = 0.004;

const v3 = (p: LapVec3): Vector3 => new Vector3(p[0], p[1], p[2]);

/** A smooth closed blob swept along `points` (radius tapering to the ends past the first and last point). */
function sweptBlob(points: Vector3[], radius: number, rings = 28, segments = 20): BufferGeometry {
  const first = points[0];
  const last = points[points.length - 1];
  const t0 = points[1].clone().sub(first).normalize();
  const t1 = last.clone().sub(points[points.length - 2]).normalize();
  const curve = new CatmullRomCurve3([first.clone().addScaledVector(t0, -radius * 0.9), ...points, last.clone().addScaledVector(t1, radius * 0.9)], false, "centripetal");
  const frames = curve.computeFrenetFrames(rings, false);
  const pos: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const u = i / rings;
    const c = curve.getPointAt(u);
    const r = radius * Math.pow(Math.sin(Math.PI * u), 0.55);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      pos.push(c.x + r * (ca * n.x + sa * b.x), c.y + r * (ca * n.y + sa * b.y), c.z + r * (ca * n.z + sa * b.z));
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j, b = a + segments + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** A curve through a centreline (a 1-point centreline becomes a 2 mm stub). */
function centreline(points: LapVec3[]): CatmullRomCurve3 {
  const pts = points.map(v3);
  if (pts.length === 1) pts.push(pts[0].clone().add(new Vector3(0.002, 0, 0)));
  return new CatmullRomCurve3(pts, false, "centripetal");
}

/** The part of a curve between `a` and `b` (0–1) as a curve of its own. */
function subCurve(curve: CatmullRomCurve3, a: number, b: number, n = 12): CatmullRomCurve3 {
  return new CatmullRomCurve3(Array.from({ length: n + 1 }, (_, i) => curve.getPointAt(a + ((b - a) * i) / n)), false, "centripetal");
}

/** Place a unit-height Y cylinder from `from` to `to`. */
function orientCylinder(m: Mesh, from: Vector3, to: Vector3): void {
  const d = to.clone().sub(from);
  m.position.copy(from).addScaledVector(d, 0.5);
  m.scale.set(1, Math.max(d.length(), 1e-6), 1);
  m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d.normalize());
}

/** Where along a tube its clips sit (0–1), alternating either side of the middle (and of the gap when divided). */
export function clipPositions(count: number, length: number, divided: boolean): number[] {
  const out: number[] = [];
  const half = divided ? GAP / 2 + 0.0025 : 0.002;
  for (let k = 0; k < count; k++) {
    const side = k % 2 === 0 ? 1 : -1;
    const step = Math.floor(k / 2);
    out.push(Math.min(0.97, Math.max(0.03, 0.5 + (side * (half + step * 0.0045)) / Math.max(length, 0.01))));
  }
  return out;
}

export function createLaparoscope(opts: LaparoscopeOptions): LaparoscopeApi {
  const { canvas, labels } = opts;
  const reduced = () => {
    try {
      return !!opts.reducedMotion();
    } catch {
      return false;
    }
  };
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(BACKGROUND);

  const scene = new Scene();
  const camera = new PerspectiveCamera(70, 1, 0.002, 2);
  const hemi = new HemisphereLight(0xffe9e2, 0x3a0f0b, 0.55);
  const lamp = new PointLight(0xfff3e4, 2.4, 0, 0);
  scene.add(hemi, lamp);
  const content = new Group();
  scene.add(content);

  let spec: LapSceneSpec | null = null;
  let key = "";
  let cameraKey = "";
  let selected: string | null = null;
  let orbit = false;
  let controls: OrbitControls | null = null;
  let home = { at: new Vector3(), target: new Vector3() };
  let disposed = false;
  let raf = 0;
  const tubeMeshes = new Map<string, Mesh[]>();
  const pickables: Mesh[] = [];
  const labelEls = new Map<string, { el: HTMLButtonElement; at: Vector3 }>();

  // the case's anatomy model (optional): organ nodes by (sanitised) name
  let model: Object3D | null = null;
  const modelNodes = new Map<string, Object3D>();
  const modelBase = new Map<Object3D, Vector3>();
  const modelMats: Material[] = [];

  /* ---------------- building ---------------- */

  function clearContent(): void {
    for (const o of [...content.children]) {
      content.remove(o);
      o.traverse((c) => {
        const m = c as Mesh;
        if (m.geometry) m.geometry.dispose();
        const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
        for (const x of mats as Material[]) x.dispose();
      });
    }
    tubeMeshes.clear();
    pickables.length = 0;
  }

  function add(m: Mesh): Mesh {
    content.add(m);
    return m;
  }

  function organMaterial(color: number, seeThrough: boolean): MeshStandardMaterial {
    return new MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.02, side: DoubleSide, transparent: seeThrough, opacity: seeThrough ? 0.24 : 1, depthWrite: !seeThrough });
  }

  function buildOrgan(o: LapSceneSpec["organs"][number]): void {
    const node = modelNodes.get(PropertyBinding.sanitizeNodeName(o.mesh ?? o.id));
    if (node) {
      for (let p: Object3D | null = node; p; p = p.parent) p.visible = true;
      node.traverse((c) => {
        c.visible = true;
        const m = c as Mesh;
        if (m.isMesh) {
          const mat = m.material as MeshStandardMaterial;
          mat.transparent = o.seeThrough;
          mat.opacity = o.seeThrough ? 0.24 : 1;
          mat.depthWrite = !o.seeThrough;
          mat.needsUpdate = true;
          m.userData.organ = o.id;
          if (!o.seeThrough) pickables.push(m);
        }
      });
      const base = modelBase.get(node);
      if (base) node.position.copy(base).add(v3(o.offset));
      return;
    }
    const pts = o.points.map(v3);
    const mat = organMaterial(TINT[o.tint], o.seeThrough);
    let mesh: Mesh;
    if (o.shape === "band" && pts.length >= 2) mesh = new Mesh(new TubeGeometry(centreline(o.points), 24, o.radius * 0.35, 10, false), mat);
    else if (pts.length >= 2) mesh = new Mesh(sweptBlob(pts, o.radius), mat);
    else {
      mesh = new Mesh(new SphereGeometry(o.radius, 32, 22), mat);
      mesh.position.copy(pts[0]);
      // organs are wider than deep; a plate is a thin sheet
      mesh.scale.set(1, o.shape === "plate" ? 1 : 0.9, o.shape === "plate" ? 0.22 : 0.72);
    }
    mesh.userData.organ = o.id;
    mesh.renderOrder = o.seeThrough ? 2 : 0;
    add(mesh);
    if (!o.seeThrough) pickables.push(mesh);
  }

  function buildTube(t: LapSceneSpec["tubes"][number]): void {
    const curve = centreline(t.points);
    const length = curve.getLength();
    const mat = new MeshStandardMaterial({ color: TUBE[t.kind], roughness: t.kind === "duct" ? 0.5 : 0.35, metalness: 0, emissive: new Color(0x000000) });
    const meshes: Mesh[] = [];
    const g = Math.min(0.2, GAP / 2 / Math.max(length, 0.01));
    const parts: [number, number][] = t.divided ? [[0, 0.5 - g], [0.5 + g, 1]] : [[0, 1]];
    for (const [a, b] of parts) {
      const piece = a === 0 && b === 1 ? curve : subCurve(curve, a, b);
      const m = add(new Mesh(new TubeGeometry(piece, 32, t.radius, 10, false), mat.clone()));
      m.userData.handle = t.handle;
      meshes.push(m);
      if (t.divided) {
        // a rounded stump at the cut end
        const stump = add(new Mesh(new SphereGeometry(t.radius, 10, 8), m.material as Material));
        stump.position.copy(curve.getPointAt(a === 0 ? b : a));
        stump.userData.handle = t.handle;
        meshes.push(stump);
      }
    }
    mat.dispose();
    for (const u of clipPositions(t.clips, length, t.divided)) {
      const clip = add(new Mesh(new CylinderGeometry(1, 1, 1, 12), new MeshStandardMaterial({ color: CLIP, roughness: 0.35, metalness: 0.7 })));
      const c = curve.getPointAt(u);
      const tan = curve.getTangentAt(u);
      orientCylinder(clip, c.clone().addScaledVector(tan, -0.0014), c.clone().addScaledVector(tan, 0.0014));
      clip.scale.x = clip.scale.z = t.radius + 0.0011;
      clip.userData.handle = t.handle;
      meshes.push(clip);
    }
    // a wider invisible sleeve: a thin tube is easy to click
    const sleeve = add(new Mesh(new TubeGeometry(curve, 24, Math.max(t.radius * 3, 0.004), 8, false), new MeshBasicMaterial({ visible: false })));
    sleeve.userData.handle = t.handle;
    pickables.push(sleeve);
    tubeMeshes.set(t.handle, meshes);
    const at = curve.getPointAt(t.divided ? 0.62 : 0.5);
    let label = labelEls.get(t.handle);
    if (!label) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "lap-label";
      el.dataset.handle = t.handle;
      el.textContent = t.handle;
      el.addEventListener("click", () => opts.onPick({ kind: "tube", handle: t.handle }));
      labels.appendChild(el);
      label = { el, at };
      labelEls.set(t.handle, label);
    }
    label.at = at;
    label.el.setAttribute("aria-label", opts.labelTitle(t.handle));
  }

  function buildTissue(r: LapSceneSpec["tissue"][number]): void {
    const m = add(new Mesh(new SphereGeometry(r.radius, 28, 18), new MeshStandardMaterial({ color: FAT, roughness: 0.75, transparent: true, opacity: r.opacity, depthWrite: false })));
    m.position.copy(v3(r.centre));
    m.scale.set(1, 1, 0.8);
    m.renderOrder = 1;
  }

  function buildShaft(s: LapSceneSpec["shafts"][number]): void {
    const from = v3(s.from);
    const to = v3(s.to);
    const shaft = add(new Mesh(new CylinderGeometry(1, 1, 1, 14), new MeshStandardMaterial({ color: SHAFT, roughness: 0.3, metalness: 0.75 })));
    orientCylinder(shaft, from, to);
    shaft.scale.x = shaft.scale.z = s.radius;
    const tip = add(new Mesh(new SphereGeometry(s.radius * 1.25, 12, 10), new MeshStandardMaterial({ color: s.instrument === "hook" ? 0xb07a4a : 0x9aa3ab, roughness: 0.3, metalness: 0.8 })));
    tip.position.copy(to);
  }

  function buildFluids(sp: LapSceneSpec): void {
    const pool = v3(sp.pool);
    if (sp.blood !== "none") {
      const m = add(new Mesh(new CircleGeometry(sp.blood === "haze" ? 0.04 : 0.026, 40), new MeshStandardMaterial({ color: BLOOD, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85, depthWrite: false })));
      m.position.copy(pool);
      m.renderOrder = 3;
    }
    if (sp.bile) {
      const m = add(new Mesh(new CircleGeometry(0.018, 32), new MeshStandardMaterial({ color: BILE, roughness: 0.2, transparent: true, opacity: 0.7, depthWrite: false })));
      m.position.copy(pool).add(new Vector3(0.012, -0.006, 0.0005));
      m.renderOrder = 3;
    }
    if (sp.stones)
      for (let i = 0; i < 5; i++) {
        const a = i * 2.39996;
        const m = add(new Mesh(new SphereGeometry(0.0028 + (i % 3) * 0.0006, 10, 8), new MeshStandardMaterial({ color: 0x8d6d2c, roughness: 0.8 })));
        m.position.copy(pool).add(new Vector3(Math.cos(a) * 0.012, Math.sin(a) * 0.009, 0.002));
      }
    scene.fog = sp.blood === "haze" ? new FogExp2(0x4a0806, 9) : sp.bile ? new FogExp2(0x2c3a10, 2.2) : null;
    renderer.setClearColor(sp.blood === "haze" ? 0x3a0705 : BACKGROUND);
  }

  /* ---------------- camera ---------------- */

  function placeCamera(at: Vector3, target: Vector3): void {
    camera.position.copy(at);
    camera.lookAt(target);
    controls?.target.copy(target);
    controls?.update();
  }

  function setCamera(c: NonNullable<LapSceneSpec["camera"]>): void {
    const k = JSON.stringify(c);
    if (k === cameraKey) return;
    cameraKey = k;
    const target = v3(c.target);
    const at = v3(c.at).lerp(target, SCOPE_DEPTH);
    home = { at, target };
    camera.up.copy(v3(c.up));
    controls?.dispose();
    camera.position.copy(at);
    controls = new OrbitControls(camera, canvas);
    controls.target.copy(target);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    const d = at.distanceTo(target);
    controls.minDistance = d * 0.55;
    controls.maxDistance = d * 1.25;
    // the scope's own direction in the controls' frame: the orbit stays within ORBIT of it
    const offset = at.clone().sub(target).applyQuaternion(new Quaternion().setFromUnitVectors(camera.up, new Vector3(0, 1, 0)));
    const sph = new Spherical().setFromVector3(offset);
    controls.minAzimuthAngle = sph.theta - ORBIT;
    controls.maxAzimuthAngle = sph.theta + ORBIT;
    controls.minPolarAngle = Math.max(0.01, sph.phi - ORBIT);
    controls.maxPolarAngle = Math.min(Math.PI - 0.01, sph.phi + ORBIT);
    controls.enabled = orbit;
    placeCamera(at, target);
  }

  /* ---------------- update ---------------- */

  function rebuild(sp: LapSceneSpec): void {
    clearContent();
    if (model) model.traverse((o) => o !== model && (o.visible = false));
    const live = sp.live && !!sp.camera;
    if (live && sp.camera) setCamera(sp.camera);
    const handles = new Set(live ? sp.tubes.map((t) => t.handle) : []);
    for (const [h, l] of labelEls)
      if (!handles.has(h)) {
        l.el.remove();
        labelEls.delete(h);
      }
    if (!live) {
      scene.fog = null;
      renderer.setClearColor(0x000000);
      return;
    }
    for (const o of sp.organs) buildOrgan(o);
    for (const t of sp.tubes) buildTube(t);
    for (const r of sp.tissue) buildTissue(r);
    for (const s of sp.shafts) buildShaft(s);
    buildFluids(sp);
    highlight();
  }

  function highlight(): void {
    for (const [h, meshes] of tubeMeshes)
      for (const m of meshes) {
        const mat = m.material as MeshStandardMaterial;
        if (mat.emissive) mat.emissive.setHex(h === selected ? 0x2f6f5a : 0x000000);
      }
    for (const [h, l] of labelEls) l.el.classList.toggle("selected", h === selected);
  }

  /* ---------------- picking ---------------- */

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let downAt: [number, number] | null = null;
  const onDown = (e: PointerEvent) => {
    downAt = [e.clientX, e.clientY];
  };
  const onUp = (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) >= 5) {
      downAt = null;
      return;
    }
    downAt = null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (!hit) return;
    const ud = hit.object.userData as { handle?: string; organ?: string };
    if (ud.handle) opts.onPick({ kind: "tube", handle: ud.handle });
    else if (ud.organ) opts.onPick({ kind: "organ", id: ud.organ });
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);

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

  /* ---------------- frame loop ---------------- */

  const clock = new Clock();
  const projected = new Vector3();
  function placeLabels(): void {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const l of labelEls.values()) {
      projected.copy(l.at).project(camera);
      const visible = projected.z < 1 && Math.abs(projected.x) <= 1.05 && Math.abs(projected.y) <= 1.05;
      l.el.hidden = !visible;
      if (visible) l.el.style.transform = `translate(${Math.round(((projected.x + 1) / 2) * w)}px, ${Math.round(((1 - projected.y) / 2) * h)}px)`;
    }
  }
  function frame(): void {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (document.hidden || !canvas.isConnected || !canvas.getClientRects().length) return;
    if (orbit && controls) controls.update(dt);
    else if (spec?.live && !reduced()) {
      // the scope is held by hand: the faintest drift
      const now = performance.now();
      camera.position.copy(home.at).add(new Vector3(Math.sin(now * 7e-4) * 4e-4, Math.cos(now * 5e-4) * 3e-4, 0));
      camera.lookAt(home.target);
    }
    lamp.position.copy(camera.position);
    placeLabels();
    renderer.render(scene, camera);
  }
  frame();

  /* ---------------- the anatomy model (optional) ---------------- */

  if (opts.modelUrl)
    void new GLTFLoader()
      .loadAsync(opts.modelUrl)
      .then((gltf) => {
        const root = gltf.scene;
        if (disposed) {
          root.traverse((c) => {
            const m = c as Mesh;
            m.geometry?.dispose();
            (m.material as Material | undefined)?.dispose?.();
          });
          return;
        }
        root.traverse((c) => {
          if (c.name) modelNodes.set(PropertyBinding.sanitizeNodeName(c.name), c);
          modelBase.set(c, c.position.clone());
          const m = c as Mesh;
          if (!m.isMesh) return;
          const old = m.material as MeshStandardMaterial;
          const mat = new MeshStandardMaterial({ color: old.color ? old.color.clone() : 0xc58c76, roughness: 0.45, metalness: 0.02, side: DoubleSide });
          old.dispose?.();
          m.material = mat;
          modelMats.push(mat);
        });
        model = root;
        scene.add(root);
        const sp = spec;
        key = "";
        if (sp) api.update(sp);
      })
      .then(
        () => !disposed && opts.onModel?.(true),
        () => !disposed && opts.onModel?.(false),
      );

  const api: LaparoscopeApi = {
    update(next) {
      spec = next;
      const k = JSON.stringify(next);
      if (k === key) return;
      key = k;
      rebuild(next);
    },
    select(handle) {
      selected = handle;
      highlight();
    },
    setOrbit(on) {
      orbit = on;
      if (controls) controls.enabled = on;
      if (!on) placeCamera(home.at, home.target);
      return orbit;
    },
    resetView() {
      placeCamera(home.at, home.target);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      ro?.disconnect();
      controls?.dispose();
      clearContent();
      for (const l of labelEls.values()) l.el.remove();
      labelEls.clear();
      if (model) {
        model.traverse((c) => (c as Mesh).geometry?.dispose());
        scene.remove(model);
      }
      for (const m of modelMats) m.dispose();
      renderer.dispose();
      // a fresh canvas per window: release its WebGL context now, not at GC time (Chrome keeps ~16)
      renderer.forceContextLoss();
    },
  };
  return api;
}
