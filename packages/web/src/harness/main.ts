/**
 * World QA harness (world-harness.html). Loads a facility
 * (?facility=clinic-v4|general-hospital|test-clinic, default clinic-v4 with
 * fallback to the built-in test facility) with every catalog, places a demo
 * patient in the first slot (?patients=all fills every slot), feeds
 * synthetic vitals to bedside monitors and exposes window.__WORLD__ /
 * window.__READY__ for scripts/qa-world.mjs.
 *
 * Query: facility, patients=all, quality=low|medium|high, locale=zh-CN|en,
 * rhythm=<rhythm>, vitals=baseline|none, autostart=0.
 */
import type { VitalsSnapshot } from "@clinicalcraft/core";
import { createAtlas } from "../atlas/index.js";
import type { AtlasApi, InteractionTarget, WorldApi, WorldPatient, WorldSettings } from "../contracts.js";
import { monitorRenderer } from "../shared/monitor-render.js";
import { createWorld } from "../world/index.js";
import { loadContent } from "./content.js";

declare global {
  interface Window {
    __WORLD__?: WorldApi;
    __READY__?: boolean;
    __HARNESS__?: Record<string, unknown>;
  }
}

type Snapshot = VitalsSnapshot;

const q = new URLSearchParams(location.search);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const locale = q.get("locale") || "zh-CN";
document.documentElement.lang = locale;

const content = loadContent();
const wanted = q.get("facility") || "clinic-v4";
const facility = content.facilities.get(wanted) ?? content.facilities.get("clinic-v4") ?? content.facilities.get("test-clinic") ?? [...content.facilities.values()][0];
const issues: string[] = [...content.issues];
if (facility.id !== wanted) issues.unshift(`facility "${wanted}" not found — using "${facility.id}"`);

const sel = $<HTMLSelectElement>("sel-facility");
for (const id of content.facilities.keys()) {
  const o = document.createElement("option");
  o.value = o.textContent = id;
  if (id === facility.id) o.selected = true;
  sel.appendChild(o);
}
sel.onchange = () => {
  q.set("facility", sel.value);
  location.search = q.toString();
};

const settings: WorldSettings = {
  sound: false,
  bob: true,
  pointer: q.get("pointer") !== "0",
  sensitivity: 1,
  quality: (q.get("quality") as WorldSettings["quality"]) || "high",
  locale,
};

/* ---------- demo patients ---------- */
const DEMO: Omit<WorldPatient, "slotId" | "posture">[] = [
  {
    caseId: "demo-v4",
    name: locale.startsWith("zh") ? "患者 · 74岁男性" : "Patient · 74 M",
    tag: locale.startsWith("zh") ? "患者 · 74岁男性" : "Patient · 74-year-old man",
    appearance: { skin: "#cba88a", hair: "#c6c6ba", hairStyle: "short", shirt: "#6d9fba", pants: "#354442", build: "average", stature: "adult", gown: false, accessory: "none" },
  },
  {
    caseId: "demo-ward",
    name: locale.startsWith("zh") ? "患者 · 58岁女性" : "Patient · 58 F",
    tag: locale.startsWith("zh") ? "患者 · 58岁女性 · 胸痛" : "Patient · 58 F · chest pain",
    appearance: { skin: "#d9b494", hair: "#3b3027", hairStyle: "long", shirt: "#b9d3dc", pants: "#b9d3dc", build: "slim", stature: "adult", gown: true, accessory: "nasal-cannula" },
  },
  {
    caseId: "demo-sit",
    name: locale.startsWith("zh") ? "患者 · 33岁男性" : "Patient · 33 M",
    tag: locale.startsWith("zh") ? "患者 · 33岁男性 · 哮喘" : "Patient · 33 M · asthma",
    appearance: { skin: "#a8805f", hair: "#1f1a16", hairStyle: "curly", shirt: "#aa6854", pants: "#34506b", build: "heavy", stature: "adult", gown: false, accessory: "oxygen-mask" },
  },
  {
    caseId: "demo-child",
    name: locale.startsWith("zh") ? "患儿 · 6岁女孩" : "Child · 6 F",
    tag: locale.startsWith("zh") ? "患儿 · 6岁女孩" : "Child · 6-year-old girl",
    appearance: { skin: "#e0bc9c", hair: "#5a3b22", hairStyle: "ponytail", shirt: "#e3c04f", pants: "#6d9fba", build: "slim", stature: "child", gown: false, accessory: "none" },
  },
];

const slots = facility.patientSlots;
const fill = q.get("patients") === "all" ? slots : slots.slice(0, 1);
const patients: WorldPatient[] = fill.map((s, i) => ({ ...DEMO[i % DEMO.length], slotId: s.id, posture: s.posture ?? "standing" }));

/* ---------- synthetic vitals ---------- */
const RHYTHMS = ["sinus", "atrial-fibrillation", "sinus-tachycardia", "ventricular-tachycardia", "paced", "atrial-flutter", "sinus-bradycardia", "ventricular-fibrillation"];
const t0 = performance.now();
function vitals(slotId: string): Snapshot | null {
  if (q.get("vitals") === "none") return null;
  const idx = Math.max(0, slots.findIndex((s) => s.id === slotId));
  const minute = (performance.now() - t0) / 60000;
  const rhythm = (q.get("rhythm") || RHYTHMS[idx % RHYTHMS.length]) as NonNullable<Snapshot["vitals"]["rhythm"]>;
  const hr = rhythm === "ventricular-tachycardia" ? 168 : rhythm === "atrial-fibrillation" ? 128 : rhythm === "sinus-tachycardia" ? 118 : rhythm === "sinus-bradycardia" ? 46 : 84;
  const sbp = idx === 1 ? 92 : 128, dbp = idx === 1 ? 58 : 78;
  const snap: Snapshot = {
    minute: Math.round(minute * 10) / 10,
    vitals: { hr, sbp, dbp, rr: idx === 2 ? 28 : 16, spo2: idx === 2 ? 89 : 97, temp: 37.2, etco2: idx === 1 ? 34 : undefined, rhythm, ecg: idx === 1 ? "st-elevation" : "normal", map: Math.round((sbp + 2 * dbp) / 3) },
    alarms: [],
    trend: {},
  };
  if (hr > 120) snap.alarms.push({ vital: "hr", level: hr > 150 ? "critical" : "warning", value: hr });
  if (snap.vitals.spo2 < 92) snap.alarms.push({ vital: "spo2", level: "warning", value: snap.vitals.spo2 });
  if (q.get("vitals") === "baseline") snap.baselineOnly = true;
  return snap;
}

/* ---------- HUD ---------- */
const hud = $("hud");
const targetEl = $("target");
const toastEl = $("toast");
let toastTimer = 0;
let lastMove = { x: 0, z: 0, region: "", room: "" as string | null };
let target: InteractionTarget | null = null;
function renderHud() {
  const w = window.__WORLD__;
  const p = w?.position;
  hud.innerHTML = [
    `<b>${facility.id}</b> · ${lastMove.region || "—"}${lastMove.room ? ` (${lastMove.room})` : ""}`,
    p ? `x ${p.x.toFixed(1)} · y ${p.y.toFixed(1)} · z ${p.z.toFixed(1)} · yaw ${p.yaw.toFixed(2)}` : "",
    `target: ${target ? `${target.kind} · ${target.name}` : "—"}`,
  ].join("<br>");
}
function toast(title: string, body?: string) {
  toastEl.innerHTML = `<b>${title}</b>${body ? `<br><small>${body}</small>` : ""}`;
  toastEl.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.style.display = "none"), 2600);
}
if (issues.length) {
  const el = $("issues");
  el.style.display = "block";
  el.textContent = issues.join("\n");
}

/* ---------- world ---------- */
const inventory: Record<string, number> = { wood: 32, stone: 32, glass: 16, lamp: 8 };
const world = createWorld({
  canvas: $<HTMLCanvasElement>("world"),
  facility,
  catalogs: content.catalogs,
  patients,
  settings: () => settings,
  saved: null,
  vitals,
  callbacks: {
    onInteract(t) {
      toast(t.name, `${t.kind}${t.kind === "equipment" ? ` · ${t.interaction} · ${t.capabilities.join(", ")}` : ""}`);
      if (t.kind === "equipment" && t.interaction === "atlas") openAtlas();
      if (t.kind === "equipment" && t.interaction === "monitor") openMonitor();
      if (t.kind === "patient") world.setPatientState(t.slotId, { speaking: true });
    },
    onTarget(t) {
      target = t;
      targetEl.innerHTML = t ? `${t.name}<small>${t.hint}</small>` : "";
      renderHud();
    },
    onMove(info) {
      lastMove = { x: info.x, z: info.z, region: info.region, room: info.roomId };
      renderHud();
    },
    onBlock(kind, type) {
      if (kind === "check") return (inventory[type] ?? 0) > 0;
      if (kind === "mine") inventory[type] = (inventory[type] ?? 0) + 1;
      if (kind === "place") inventory[type] = Math.max(0, (inventory[type] ?? 0) - 1);
      return true;
    },
    onToast: toast,
    onSound() {},
    onShortcut(action, arg) {
      if (action === "map") toggle("bigmap-wrap");
      if (action === "hotbar" && typeof arg === "number") world.select(arg);
      if (action === "pause") world.pause(true);
    },
    onPauseRequest() {},
  },
});
window.__WORLD__ = world;

/* ---------- overlays ---------- */
function toggle(id: string, force?: boolean): boolean {
  const el = $(id);
  const open = force ?? !el.classList.contains("open");
  el.classList.toggle("open", open);
  world.pause(open || !running);
  return open;
}
let running = false;
$("btn-start").onclick = () => {
  running = !running;
  if (running) world.start();
  world.pause(!running);
};

let atlas: AtlasApi | null = null;
let atlasPromise: Promise<AtlasApi> | null = null;
const atlasStatus = $("atlas-status");
function openAtlas(): Promise<AtlasApi> {
  toggle("atlas-wrap", true);
  if (!atlasPromise) {
    atlasPromise = createAtlas({
      canvas: $<HTMLCanvasElement>("atlas"),
      modelUrl: q.get("model") === "none" ? null : q.get("model") || "/local-assets/anatomy/anatomy.glb.gz",
      catalog: null,
      reducedMotion: () => false,
      onStatus: (s) => {
        atlasStatus.textContent = s;
        atlasStatus.style.display = "block";
      },
      onReady: () => {
        atlasStatus.style.display = "none";
        (window.__HARNESS__ as Record<string, unknown>).atlasReady = true;
      },
      onSelect: (info) => toast(info.label, info.kind),
    }).then((a) => (atlas = a));
  } else atlas?.reset();
  return atlasPromise;
}
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => (b.onclick = () => atlas?.setMode(b.dataset.mode as Parameters<AtlasApi["setMode"]>[0])));
document.querySelectorAll<HTMLButtonElement>("[data-focus]").forEach((b) => (b.onclick = () => atlas?.focus(b.dataset.focus as Parameters<AtlasApi["focus"]>[0])));
$("atlas-rotate").onclick = () => atlas?.rotate();
$("atlas-reset").onclick = () => atlas?.reset();
$("atlas-close").onclick = () => toggle("atlas-wrap", false);
$("btn-atlas").onclick = () => void openAtlas();

const bigmap = $<HTMLCanvasElement>("bigmap");
$("btn-map").onclick = () => toggle("bigmap-wrap");
$("bigmap-wrap").onclick = () => toggle("bigmap-wrap", false);

let monitorSlot = slots[0]?.id ?? "";
function openMonitor(slotId?: string) {
  if (slotId) monitorSlot = slotId;
  toggle("monitor-wrap", true);
}
$("btn-monitor").onclick = () => toggle("monitor-wrap");
$("monitor-wrap").onclick = () => toggle("monitor-wrap", false);

$("btn-walk").onclick = async () => {
  const dest = world.locate("board") ?? world.locate(facility.placements[0]?.id ?? "");
  if (!dest) return;
  world.setWaypoint(dest);
  try {
    await world.walkTo(dest);
    toast("arrived", dest.label);
  } catch (e) {
    toast("walk failed", String(e));
  }
};

const mini = $<HTMLCanvasElement>("mini");
const monitorCanvas = $<HTMLCanvasElement>("monitor");
const monitorCtx = monitorCanvas.getContext("2d")!;
let lastMini = 0;
function loop(now: number) {
  requestAnimationFrame(loop);
  if (now - lastMini > 200) {
    lastMini = now;
    world.drawMap(mini, { big: false, waypoint: null, locale });
    if ($("bigmap-wrap").classList.contains("open")) world.drawMap(bigmap, { big: true, waypoint: null, locale });
  }
  if ($("monitor-wrap").classList.contains("open")) monitorRenderer.draw(monitorCtx, monitorCanvas.width, monitorCanvas.height, vitals(monitorSlot), now, locale);
}
requestAnimationFrame(loop);

window.__HARNESS__ = {
  facility,
  content,
  openAtlas,
  closeAtlas: () => toggle("atlas-wrap", false),
  get atlas() {
    return atlas;
  },
  atlasReady: false,
  openMonitor,
  closeMonitor: () => toggle("monitor-wrap", false),
  openMap: () => toggle("bigmap-wrap", true),
  closeMap: () => toggle("bigmap-wrap", false),
  start: () => {
    running = true;
    world.start();
    world.pause(false);
  },
  vitals,
  issues,
};

if (q.get("autostart") !== "0") {
  running = true;
  world.start();
  world.pause(false);
}
renderHud();
requestAnimationFrame(() => requestAnimationFrame(() => (window.__READY__ = true)));
