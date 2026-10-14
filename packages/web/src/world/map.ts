/**
 * Minimap / big map (V4 `Qa()` generalised to any facility).
 * North (−Z) is up; the canvas y axis grows with world z (V4).
 */
import type { Side } from "./geometry.js";

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MapProjection {
  scale: number;
  /** World → canvas pixels. */
  toCanvas(x: number, z: number): [number, number];
  /** Canvas pixels → world. */
  toWorld(px: number, py: number): [number, number];
}

/** Uniform fit of the bounds (+margin units) into width×height, centred. Pure. */
export function mapProjection(bounds: MapBounds, width: number, height: number, margin = 2.5): MapProjection {
  const minX = bounds.minX - margin, maxX = bounds.maxX + margin;
  const minZ = bounds.minZ - margin, maxZ = bounds.maxZ + margin;
  const spanX = Math.max(1e-6, maxX - minX), spanZ = Math.max(1e-6, maxZ - minZ);
  const scale = Math.min(width / spanX, height / spanZ);
  const ox = (width - spanX * scale) / 2 - minX * scale;
  const oz = (height - spanZ * scale) / 2 - minZ * scale;
  return {
    scale,
    toCanvas: (x, z) => [ox + x * scale, oz + z * scale],
    toWorld: (px, py) => [(px - ox) / scale, (py - oz) / scale],
  };
}

export interface MapRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface MapWall {
  /** Wall centre line from (x0,z0) to (x1,z1), thickness t, gaps (absolute along-axis ranges). */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  t: number;
  gaps: [number, number][];
  windows: [number, number][];
  partition: boolean;
}

export interface MapData {
  bounds: MapBounds;
  ground: string;
  paths: (MapRect & { color: string })[];
  ponds: MapRect[];
  trees: { x: number; z: number }[];
  buildZone: MapRect | null;
  buildZoneLabel: string;
  buildings: (MapRect & { name: string })[];
  rooms: (MapRect & { name: string; kind: string })[];
  walls: MapWall[];
  placements: { x: number; z: number; w: number; d: number; kind: string; solid: boolean; label: string | null }[];
  slots: { x: number; z: number; occupied: boolean; label: string }[];
  staff: { x: number; z: number; label: string }[];
  northLabel: string;
}

/** Dot colours by interaction kind (V4 station colours). */
export const KIND_COLORS: Record<string, string> = {
  workstation: "#f2c978",
  monitor: "#66cca8",
  device: "#79c9e6",
  board: "#e9be61",
  atlas: "#77d9c4",
  craft: "#c99a5b",
  bed: "#b6ccbb",
  sink: "#9fc2cc",
  storage: "#b8b49a",
  door: "#c9b37a",
  none: "#9aa98c",
};

const PALETTE = {
  ground: "#c7d6ad",
  building: "#e6e5c9",
  room: "#ecebd3",
  wall: "#668369",
  partition: "#a4b194",
  window: "#8fc3c6",
  pond: "#86bcc0",
  tree: "#7c9960",
  treeCore: "#648557",
  zone: "#d7bd7e",
  stroke: "#44644d",
  label: "#2e4e38",
  waypoint: "#c68836",
  player: "#325c49",
  playerStroke: "#fff4cf",
};

export interface DrawMapOptions {
  big: boolean;
  waypoint: { x: number; z: number } | null;
  player: { x: number; z: number; yaw: number };
  timeMs?: number;
}

export function drawMap(ctx: CanvasRenderingContext2D, width: number, height: number, data: MapData, opts: DrawMapOptions): MapProjection {
  const proj = mapProjection(data.bounds, width, height, opts.big ? 3 : 2);
  const s = proj.scale;
  const P = proj.toCanvas;
  const rect = (r: MapRect, fill: string) => {
    const [x, y] = P(r.x - r.w / 2, r.z - r.d / 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, r.w * s, r.d * s);
  };
  ctx.save();
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 0, width, height);
  for (const p of data.paths) rect(p, p.color);
  if (data.buildZone) rect(data.buildZone, PALETTE.zone);
  for (const p of data.ponds) rect(p, PALETTE.pond);
  for (const t of data.trees) {
    rect({ x: t.x, z: t.z, w: 4, d: 4 }, PALETTE.tree);
    rect({ x: t.x, z: t.z, w: 1.2, d: 1.2 }, PALETTE.treeCore);
  }
  for (const b of data.buildings) rect(b, PALETTE.building);
  for (const r of data.rooms) if (r.kind !== "garden" && r.kind !== "build-zone") rect(r, PALETTE.room);
  // walls with gaps
  for (const w of data.walls) {
    const horiz = Math.abs(w.z1 - w.z0) < 1e-6;
    const t = w.partition ? Math.max(0.4, w.t) : Math.max(0.6, w.t * 0.6);
    const a0 = horiz ? Math.min(w.x0, w.x1) : Math.min(w.z0, w.z1);
    const a1 = horiz ? Math.max(w.x0, w.x1) : Math.max(w.z0, w.z1);
    const cuts = [...w.gaps].sort((p, q) => p[0] - q[0]);
    let cur = a0;
    const seg = (u0: number, u1: number, color: string) => {
      if (u1 - u0 <= 0) return;
      if (horiz) rect({ x: (u0 + u1) / 2, z: w.z0, w: u1 - u0, d: t }, color);
      else rect({ x: w.x0, z: (u0 + u1) / 2, w: t, d: u1 - u0 }, color);
    };
    for (const [g0, g1] of cuts) {
      seg(cur, Math.min(g0, a1), w.partition ? PALETTE.partition : PALETTE.wall);
      cur = Math.max(cur, g1);
    }
    seg(cur, a1, w.partition ? PALETTE.partition : PALETTE.wall);
    for (const [g0, g1] of w.windows) seg(g0, g1, PALETTE.window);
  }
  // placements
  for (const p of data.placements) {
    if (p.kind === "none" || p.kind === "storage" || p.kind === "sink") {
      if (!p.solid) continue;
      rect({ x: p.x, z: p.z, w: Math.max(0.4, p.w), d: Math.max(0.4, p.d) }, "#b9bba3");
      continue;
    }
    const [x, y] = P(p.x, p.z);
    ctx.fillStyle = KIND_COLORS[p.kind] ?? KIND_COLORS.none;
    ctx.strokeStyle = PALETTE.stroke;
    ctx.lineWidth = opts.big ? 1.5 : 1;
    ctx.beginPath();
    ctx.arc(x, y, opts.big ? 5 : 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const st of data.staff) {
    const [x, y] = P(st.x, st.z);
    ctx.fillStyle = "#c7a1e5";
    ctx.strokeStyle = "#4a2b6b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, opts.big ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const sl of data.slots) {
    if (!sl.occupied && !opts.big) continue;
    const [x, y] = P(sl.x, sl.z);
    ctx.fillStyle = sl.occupied ? "#66cca8" : "#66cca855";
    ctx.strokeStyle = PALETTE.stroke;
    ctx.lineWidth = opts.big ? 2 : 1;
    ctx.beginPath();
    ctx.arc(x, y, opts.big ? 7 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // labels (big map)
  if (opts.big) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontPx = Math.max(10, Math.min(13, s * 0.9));
    ctx.font = `bold ${fontPx}px system-ui, "Microsoft YaHei", sans-serif`;
    for (const r of data.rooms) {
      if (r.kind === "corridor") continue;
      const [x, y] = P(r.x, r.z);
      if (r.w * s < 24) continue;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#f3eed8";
      ctx.strokeText(r.name, x, y, r.w * s - 4);
      ctx.fillStyle = PALETTE.label;
      ctx.fillText(r.name, x, y, r.w * s - 4);
    }
    for (const sl of data.slots) {
      if (!sl.occupied) continue;
      const [x, y] = P(sl.x, sl.z);
      ctx.font = `bold 11px system-ui, sans-serif`;
      ctx.fillStyle = "#1d4f3d";
      ctx.fillText(sl.label, x, y - 13);
    }
    if (data.buildZone) {
      const [x, y] = P(data.buildZone.x, data.buildZone.z);
      ctx.fillStyle = "#678058";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(data.buildZoneLabel, x, y);
    }
    ctx.fillStyle = "#678058";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(data.northLabel, width - 10, 18);
  }
  // waypoint
  if (opts.waypoint) {
    const [x, y] = P(opts.waypoint.x, opts.waypoint.z);
    const pulse = opts.timeMs ? 1 + Math.sin(opts.timeMs / 260) * 0.18 : 1;
    ctx.strokeStyle = PALETTE.waypoint;
    ctx.fillStyle = "#e7c36b";
    ctx.lineWidth = opts.big ? 3 : 2;
    ctx.beginPath();
    ctx.arc(x, y, (opts.big ? 9 : 5.5) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, opts.big ? 3.5 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // player arrow (V4)
  const [px, py] = P(opts.player.x, opts.player.z);
  ctx.translate(px, py);
  ctx.rotate(-opts.player.yaw);
  if (opts.big) ctx.scale(1.4, 1.4);
  ctx.fillStyle = PALETTE.player;
  ctx.strokeStyle = PALETTE.playerStroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  return proj;
}

/** Map-wall helper: wall line endpoints for a rect side. */
export function sideSegment(r: MapRect, side: Side): { x0: number; z0: number; x1: number; z1: number } {
  const minX = r.x - r.w / 2, maxX = r.x + r.w / 2, minZ = r.z - r.d / 2, maxZ = r.z + r.d / 2;
  switch (side) {
    case "n":
      return { x0: minX, z0: minZ, x1: maxX, z1: minZ };
    case "s":
      return { x0: minX, z0: maxZ, x1: maxX, z1: maxZ };
    case "w":
      return { x0: minX, z0: minZ, x1: minX, z1: maxZ };
    case "e":
    default:
      return { x0: maxX, z0: minZ, x1: maxX, z1: maxZ };
  }
}
