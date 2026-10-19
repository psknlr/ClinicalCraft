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

/** A stairs/ramp flight or an elevator car on the map (multi-level facilities). */
export interface MapConnector extends MapRect {
  kind: "stairs" | "ramp" | "elevator";
  label: string;
  /** Flights: the axis they climb along (treads are drawn across it). */
  axis?: "x" | "z";
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
  /** Staff where they are now; `moving`: walking a delegated task (highlighted, labelled on the big map). */
  staff: { x: number; z: number; label: string; moving?: boolean }[];
  northLabel: string;
  /** Stairs and elevators on the level shown (multi-level facilities only). */
  connectors?: MapConnector[];
  /** Name of the level shown (multi-level facilities only). */
  levelLabel?: string;
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
  /** The avatar is on another level than the one shown: its arrow is drawn faded. */
  playerGhost?: boolean;
  /** The destination is on another level than the one shown: drawn faded. */
  waypointGhost?: boolean;
}

const CONNECTOR_FILL = { stairs: "#d9cfae", ramp: "#d9cfae", elevator: "#b9c8cc" } as const;

/** Stairs (treads across the climbing axis) and elevator cars (a box with a cross). */
function drawConnectors(ctx: CanvasRenderingContext2D, list: MapConnector[], P: MapProjection["toCanvas"], s: number, big: boolean): void {
  for (const c of list) {
    const [x0, y0] = P(c.x - c.w / 2, c.z - c.d / 2);
    const w = c.w * s, h = c.d * s;
    ctx.fillStyle = CONNECTOR_FILL[c.kind];
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = PALETTE.stroke;
    ctx.lineWidth = big ? 1.5 : 1;
    ctx.strokeRect(x0, y0, w, h);
    ctx.beginPath();
    if (c.kind === "elevator") {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + w, y0 + h);
      ctx.moveTo(x0 + w, y0);
      ctx.lineTo(x0, y0 + h);
    } else {
      // one line per ~0.6 m of run, across the axis
      const along = c.axis === "x" ? w : h;
      const n = Math.max(2, Math.round(along / Math.max(2, s * 0.6)));
      for (let i = 1; i < n; i++) {
        const k = i / n;
        if (c.axis === "x") {
          ctx.moveTo(x0 + w * k, y0);
          ctx.lineTo(x0 + w * k, y0 + h);
        } else {
          ctx.moveTo(x0, y0 + h * k);
          ctx.lineTo(x0 + w, y0 + h * k);
        }
      }
    }
    ctx.stroke();
  }
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
  if (data.connectors?.length) drawConnectors(ctx, data.connectors, P, s, opts.big);
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
    if (st.moving) {
      // a delegated staff member on the move: a pulsing ring around the dot
      const pulse = opts.timeMs ? 1 + Math.sin(opts.timeMs / 180) * 0.2 : 1;
      ctx.strokeStyle = "#e0559b";
      ctx.lineWidth = opts.big ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(x, y, (opts.big ? 10 : 6) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = st.moving ? "#f08cc0" : "#c7a1e5";
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
  // labels (big map): rooms first, then occupied slots; labels that would overlap are skipped
  if (opts.big) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const taken: [number, number, number, number][] = [];
    const place = (text: string, x: number, y: number, maxW: number, font: string, fill: string, halo = true) => {
      const fit = fitLabel(ctx, text, maxW, font);
      if (!fit) return;
      const w = Math.min(maxW, fit.width) + 4;
      const h = fit.lines.length * fit.lineH + 2;
      const r: [number, number, number, number] = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
      if (taken.some((t) => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1])) return;
      taken.push(r);
      ctx.font = fit.font;
      fit.lines.forEach((line, i) => {
        const ly = y + (i - (fit.lines.length - 1) / 2) * fit.lineH;
        if (halo) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#f3eed8";
          ctx.strokeText(line, x, ly, maxW);
        }
        ctx.fillStyle = fill;
        ctx.fillText(line, x, ly, maxW);
      });
    };
    const fontPx = Math.max(10, Math.min(13, s * 0.9));
    const rooms = [...data.rooms].filter((r) => r.kind !== "corridor").sort((a, b) => b.w * b.d - a.w * a.d);
    for (const r of rooms) {
      if (r.w * s < 24) continue;
      const [x, y] = P(r.x, r.z);
      place(r.name, x, y, r.w * s - 4, `bold ${fontPx}px system-ui, "Microsoft YaHei", sans-serif`, PALETTE.label);
    }
    for (const sl of data.slots) {
      if (!sl.occupied) continue;
      const [x, y] = P(sl.x, sl.z);
      place(sl.label, x, y - 13, 160, "bold 11px system-ui, sans-serif", "#1d4f3d");
    }
    // staff walking a delegated task: who it is
    for (const st of data.staff) {
      if (!st.moving) continue;
      const [x, y] = P(st.x, st.z);
      place(st.label, x, y + 15, 180, "bold 11px system-ui, sans-serif", "#7a2350");
    }
    if (data.buildZone && !data.rooms.some((r) => r.kind === "build-zone")) {
      const [x, y] = P(data.buildZone.x, data.buildZone.z);
      place(data.buildZone.w * s > 30 ? data.buildZoneLabel : "", x, y, data.buildZone.w * s, "11px system-ui, sans-serif", "#678058", false);
    }
    ctx.fillStyle = "#678058";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(data.northLabel, width - 10, 18);
  }
  if (data.levelLabel) {
    // the level shown (multi-level facilities): a badge in the top-left corner
    const font = opts.big ? "bold 13px system-ui, sans-serif" : "bold 10px system-ui, sans-serif";
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const pad = opts.big ? 6 : 3;
    const tw = ctx.measureText(data.levelLabel).width;
    const bh = opts.big ? 22 : 15;
    ctx.fillStyle = "rgba(46, 78, 56, 0.82)";
    ctx.fillRect(4, 4, tw + pad * 2, bh);
    ctx.fillStyle = "#fff4cf";
    ctx.fillText(data.levelLabel, 4 + pad, 4 + bh / 2);
  }
  // waypoint
  if (opts.waypoint) {
    const [x, y] = P(opts.waypoint.x, opts.waypoint.z);
    if (opts.waypointGhost) ctx.globalAlpha = 0.4;
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
    if (opts.waypointGhost) ctx.globalAlpha = 1;
  }
  // player arrow (V4)
  const [px, py] = P(opts.player.x, opts.player.z);
  if (opts.playerGhost) ctx.globalAlpha = 0.35;
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

/** Smallest font size (px) a big-map label may shrink to before wrapping / being dropped. */
export const MIN_LABEL_PX = 8;

/** Split a label into two lines at " · ", a space, or the middle (CJK). */
export function splitLabel(text: string): [string, string] | null {
  const t = text.trim();
  if (t.length < 3) return null;
  const seps = [" · ", "·", " "];
  for (const sep of seps) {
    const hits: number[] = [];
    for (let i = t.indexOf(sep); i > 0; i = t.indexOf(sep, i + 1)) hits.push(i);
    if (!hits.length) continue;
    const mid = t.length / 2;
    const at = hits.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best), hits[0]);
    const a = t.slice(0, at).trim(), b = t.slice(at + sep.length).trim();
    if (a && b) return [a, b];
  }
  const chars = [...t];
  const half = Math.ceil(chars.length / 2);
  return [chars.slice(0, half).join(""), chars.slice(half).join("")];
}

/**
 * Fit a label into `maxW` px: keep the requested font, else shrink (≥ MIN_LABEL_PX),
 * else wrap onto two lines, else allow ≤ 15 % horizontal squeeze; null = drop the label
 * (canvas `fillText(maxWidth)` squeezing beyond that makes CJK text unreadable).
 */
export function fitLabel(
  ctx: Pick<CanvasRenderingContext2D, "font" | "measureText">,
  text: string,
  maxW: number,
  font: string,
): { lines: string[]; font: string; width: number; lineH: number } | null {
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  const px0 = m ? parseFloat(m[1]) : 12;
  const withSize = (px: number) => (m ? font.replace(m[0], `${px}px`) : font);
  const measure = (lines: string[], f: string) => {
    ctx.font = f;
    return Math.max(...lines.map((l) => ctx.measureText(l).width));
  };
  if (maxW <= 0 || !text) return null;
  for (let px = px0; px >= Math.min(px0, MIN_LABEL_PX); px -= 1) {
    const f = withSize(px);
    const w = measure([text], f);
    if (w <= maxW) return { lines: [text], font: f, width: w, lineH: px + 1 };
  }
  const parts = splitLabel(text);
  if (parts) {
    for (let px = px0; px >= Math.min(px0, MIN_LABEL_PX); px -= 1) {
      const f = withSize(px);
      const w = measure(parts, f);
      if (w <= maxW) return { lines: parts, font: f, width: w, lineH: px + 1 };
    }
  }
  const fMin = withSize(Math.min(px0, MIN_LABEL_PX));
  const w1 = measure([text], fMin);
  if (w1 <= maxW * 1.15) return { lines: [text], font: fMin, width: w1, lineH: Math.min(px0, MIN_LABEL_PX) + 1 };
  if (parts) {
    const w2 = measure(parts, fMin);
    if (w2 <= maxW * 1.15) return { lines: parts, font: fMin, width: w2, lineH: Math.min(px0, MIN_LABEL_PX) + 1 };
  }
  return null;
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
