/**
 * Bedside monitor renderer shared by in-world screens (small CanvasTextures)
 * and the monitor panel (large canvas). Classic look: black screen, green
 * ECG sweep, yellow SpO₂ pleth, blue respiration, white NIBP, orange temp;
 * alarms flash red (critical) / amber (warning). `baselineOnly` snapshots
 * (cases without a physiology model) are shown greyed as "not recorded".
 */
import type { MonitorRenderer } from "../contracts.js";
import { ecgValue, plethValue, respValue, type MorphologyName, type RhythmName } from "./ecg.js";

type Snapshot = Parameters<MonitorRenderer["draw"]>[3];

export const MONITOR_COLORS = {
  bg: "#000000",
  grid: "#0c1f14",
  ecg: "#3dff7a",
  spo2: "#ffe34d",
  nibp: "#f2f2f2",
  rr: "#58b4ff",
  temp: "#ffb066",
  dim: "#6b6b6b",
  critical: "#ff3b30",
  warning: "#ffb020",
  header: "#0d1a14",
} as const;

const LABELS = {
  "zh-CN": {
    hr: "心率 HR",
    spo2: "血氧 SpO₂",
    nibp: "无创血压 NIBP",
    rr: "呼吸 RR",
    etco2: "EtCO₂",
    temp: "体温 T",
    noPatient: "无患者 · 未连接",
    baseline: "仅基线 · 本病例未记录生命体征",
    minute: "分钟",
    bpm: "次/分",
    alarm: "报警",
  },
  en: {
    hr: "HR",
    spo2: "SpO₂",
    nibp: "NIBP",
    rr: "RR",
    etco2: "EtCO₂",
    temp: "TEMP",
    noPatient: "NO PATIENT · not connected",
    baseline: "BASELINE ONLY · vitals not recorded in this case",
    minute: "min",
    bpm: "bpm",
    alarm: "ALARM",
  },
} as const;

function labelsFor(locale: string) {
  return locale.toLowerCase().startsWith("zh") ? LABELS["zh-CN"] : LABELS.en;
}

function alarmLevel(s: Snapshot, vital: string): "warning" | "critical" | null {
  if (!s) return null;
  let lvl: "warning" | "critical" | null = null;
  for (const a of s.alarms ?? []) {
    if (a.vital !== vital) continue;
    if (a.level === "critical") return "critical";
    lvl = "warning";
  }
  return lvl;
}

interface Lane {
  y: number;
  h: number;
  color: string;
  window: number;
  sample: (t: number) => number;
  /** value range mapped to the lane height */
  min: number;
  max: number;
}

function drawSweep(ctx: CanvasRenderingContext2D, x0: number, w: number, lane: Lane, tNow: number, lineW: number): void {
  const n = Math.max(16, Math.floor(w / Math.max(1, lineW * 0.75)));
  const xNow = ((tNow % lane.window) / lane.window) * w;
  const gap = Math.max(6, w * 0.035);
  ctx.strokeStyle = lane.color;
  ctx.lineWidth = lineW;
  ctx.lineJoin = "round";
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i <= n; i++) {
    const px = (i / n) * w;
    let ahead = xNow - px;
    if (ahead < 0) ahead += w;
    // erase bar just ahead of the write head
    if (w - ahead < gap && ahead > 0) {
      pen = false;
      continue;
    }
    const age = (ahead / w) * lane.window;
    const v = lane.sample(tNow - age);
    const norm = (v - lane.min) / (lane.max - lane.min);
    const py = lane.y + lane.h - Math.max(-0.1, Math.min(1.1, norm)) * lane.h;
    if (!pen) ctx.moveTo(x0 + px, py);
    else ctx.lineTo(x0 + px, py);
    pen = true;
    // break the line at the write head
    if (ahead < (w / n) * 1.01 && ahead >= 0 && i < n) pen = false;
  }
  ctx.stroke();
}

function fmt(n: number | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "--";
  return n.toFixed(digits);
}

export const monitorRenderer: MonitorRenderer = {
  draw(ctx, width, height, snapshot, timeMs, locale) {
    const L = labelsFor(locale);
    const s = snapshot;
    const baseline = !!s?.baselineOnly;
    const live = !!s && !baseline;
    const t = timeMs / 1000;
    const W = width, H = height;
    const u = Math.max(1, Math.min(W / 320, H / 200));
    const flashOn = Math.floor(timeMs / 450) % 2 === 0;

    ctx.save();
    ctx.fillStyle = MONITOR_COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // header
    const headH = Math.round(H * 0.1);
    const critical = (s?.alarms ?? []).filter((a) => a.level === "critical");
    const warnings = (s?.alarms ?? []).filter((a) => a.level === "warning");
    const alarmActive = live && (critical.length > 0 || warnings.length > 0);
    ctx.fillStyle = alarmActive && flashOn ? (critical.length ? "#5a0d0a" : "#4a3708") : MONITOR_COLORS.header;
    ctx.fillRect(0, 0, W, headH);
    ctx.textBaseline = "middle";
    const headFont = Math.max(8, Math.round(headH * 0.55));
    ctx.font = `bold ${headFont}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = "left";
    ctx.fillStyle = "#9fd8b4";
    const rhythm = (s?.vitals.rhythm ?? "sinus") as RhythmName;
    const morph = (s?.vitals.ecg ?? "normal") as MorphologyName;
    const leftText = !s ? L.noPatient : baseline ? L.baseline : `II · ${rhythm.toUpperCase()}${morph !== "normal" ? " · " + morph.toUpperCase() : ""}`;
    ctx.fillText(leftText, 6 * u, headH / 2, W * 0.62);
    ctx.textAlign = "right";
    if (alarmActive) {
      const a = critical[0] ?? warnings[0];
      ctx.fillStyle = critical.length ? MONITOR_COLORS.critical : MONITOR_COLORS.warning;
      if (flashOn || !critical.length) ctx.fillText(`${critical.length ? "!!!" : "!!"} ${a.vital.toUpperCase()} ${fmt(a.value, a.vital === "temp" ? 1 : 0)}`, W - 6 * u, headH / 2);
    } else if (s) {
      ctx.fillStyle = "#6f8f7c";
      ctx.fillText(`T+${fmt(s.minute)} ${L.minute}`, W - 6 * u, headH / 2);
    }

    // layout
    const waveW = Math.round(W * 0.64);
    const colX = waveW + Math.round(4 * u);
    const colW = W - colX - Math.round(3 * u);
    const top = headH + Math.round(3 * u);
    const avail = H - top - Math.round(3 * u);

    // grid
    ctx.strokeStyle = MONITOR_COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gstep = Math.max(8, Math.round(20 * u));
    for (let x = 0; x < waveW; x += gstep) {
      ctx.moveTo(x + 0.5, top);
      ctx.lineTo(x + 0.5, H);
    }
    for (let y = top; y < H; y += gstep) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(waveW, y + 0.5);
    }
    ctx.stroke();

    const v = s?.vitals;
    const hr = v?.hr ?? 0;
    const rr = v?.rr ?? 0;
    const capno = v?.etco2 != null;
    const dim = (c: string) => (live ? c : MONITOR_COLORS.dim);
    const lanes: Lane[] = [
      {
        y: top,
        h: avail * 0.4,
        color: dim(MONITOR_COLORS.ecg),
        window: 6,
        min: -0.55,
        max: 1.25,
        sample: s ? (tt) => ecgValue(tt, rhythm, morph, hr) : () => 0,
      },
      {
        y: top + avail * 0.42,
        h: avail * 0.27,
        color: dim(MONITOR_COLORS.spo2),
        window: 6,
        min: -0.05,
        max: 1.05,
        sample: s ? (tt) => plethValue(tt, rhythm, hr) : () => 0,
      },
      {
        y: top + avail * 0.72,
        h: avail * 0.25,
        color: dim(MONITOR_COLORS.rr),
        window: 12,
        min: -0.05,
        max: 1.1,
        sample: s ? (tt) => respValue(tt, rr, capno) : () => 0,
      },
    ];
    const lw = Math.max(1, 1.4 * u);
    for (const lane of lanes) drawSweep(ctx, 0, waveW, lane, t, lw);
    // lane captions
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `${Math.max(7, Math.round(9 * u))}px ui-monospace, Menlo, monospace`;
    ctx.fillStyle = dim(MONITOR_COLORS.ecg);
    ctx.fillText("II", 3 * u, lanes[0].y + 2 * u);
    ctx.fillStyle = dim(MONITOR_COLORS.spo2);
    ctx.fillText("Pleth", 3 * u, lanes[1].y + 1 * u);
    ctx.fillStyle = dim(MONITOR_COLORS.rr);
    ctx.fillText(capno ? "CO₂" : "Resp", 3 * u, lanes[2].y + 1 * u);

    // numerics column
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(waveW, headH, W - waveW, H - headH);
    const boxes: { key: string; label: string; value: string; unit: string; color: string; weight: number; sub?: string }[] = [
      { key: "hr", label: L.hr, value: live ? fmt(v?.hr) : "--", unit: L.bpm, color: MONITOR_COLORS.ecg, weight: 1.3 },
      { key: "spo2", label: L.spo2, value: live ? fmt(v?.spo2) : "--", unit: "%", color: MONITOR_COLORS.spo2, weight: 1.1 },
      {
        key: "sbp",
        label: L.nibp,
        value: live ? `${fmt(v?.sbp)}/${fmt(v?.dbp)}` : "--/--",
        unit: "mmHg",
        color: MONITOR_COLORS.nibp,
        weight: 1,
        sub: live ? `(${fmt(v?.map)})` : "",
      },
      {
        key: "rr",
        label: capno ? `${L.rr} · ${L.etco2} ${live ? fmt(v?.etco2) : "--"}` : L.rr,
        value: live ? fmt(v?.rr) : "--",
        unit: "/min",
        color: MONITOR_COLORS.rr,
        weight: 0.9,
      },
      { key: "temp", label: L.temp, value: live ? fmt(v?.temp, 1) : "--", unit: "°C", color: MONITOR_COLORS.temp, weight: 0.8 },
    ];
    const totalW = boxes.reduce((a, b) => a + b.weight, 0);
    let y = headH + 2 * u;
    const colH = H - headH - 4 * u;
    for (const b of boxes) {
      const bh = (colH * b.weight) / totalW;
      const lvl = live ? alarmLevel(s, b.key) ?? (b.key === "sbp" ? alarmLevel(s, "dbp") : null) : null;
      if (lvl && (flashOn || lvl === "warning")) {
        ctx.fillStyle = lvl === "critical" ? "#7a1410" : "#5a4208";
        ctx.fillRect(colX - 2 * u, y, colW + 4 * u, bh - 2 * u);
      }
      const color = live ? (lvl === "critical" && flashOn ? "#ffffff" : b.color) : MONITOR_COLORS.dim;
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const lf = Math.max(6, Math.round(Math.min(bh * 0.22, 10 * u)));
      ctx.font = `${lf}px ui-monospace, Menlo, monospace`;
      ctx.fillText(b.label, colX, y + 1 * u, colW);
      ctx.textAlign = "right";
      ctx.fillText(b.unit, colX + colW, y + 1 * u);
      const vf = Math.max(8, Math.round(Math.min(bh * 0.62, (colW / Math.max(3, b.value.length)) * 1.6)));
      ctx.font = `bold ${vf}px ui-monospace, Menlo, Consolas, monospace`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(b.value, colX + colW, y + bh - 3 * u - (b.sub ? 0 : 0));
      if (b.sub) {
        ctx.textAlign = "left";
        ctx.font = `${Math.max(6, Math.round(vf * 0.45))}px ui-monospace, Menlo, monospace`;
        ctx.fillText(b.sub, colX, y + bh - 3 * u);
      }
      y += bh;
    }

    if (!live) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#9a9a9a";
      ctx.font = `bold ${Math.max(8, Math.round(12 * u))}px ui-monospace, Menlo, monospace`;
      ctx.fillText(s ? L.baseline : L.noPatient, waveW / 2, top + avail / 2, waveW - 8);
    }
    ctx.restore();
  },
};

export default monitorRenderer;
