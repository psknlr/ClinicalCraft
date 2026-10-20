/**
 * Bedside monitor renderer shared by in-world screens (small CanvasTextures)
 * and the monitor panel (large canvas). Classic look: black screen, green
 * ECG sweep, yellow SpO₂ pleth, blue respiration, white NIBP, orange temp;
 * alarms flash red (critical) / amber (warning). `baselineOnly` snapshots
 * (cases without a physiology model) are shown greyed as "not recorded".
 * Before the case's monitor is attached (`monitorAttached: false`) the
 * screen is dark: "monitor not attached", flat dim traces, no numbers, no
 * rhythm, no alarm — the triage readings taken by hand are not a monitor's.
 * Attached without its ECG leads (`ecgAttached: false`): the numbers and
 * the pleth, "ECG leads not attached" and a flat lead II — no rhythm.
 */
import type { MonitorRenderer } from "../contracts.js";
import { drawRate, ecgValue, isPulseless, plethValue, respValue, type MorphologyName, type RhythmName } from "./ecg.js";

/** Lethal-arrhythmia alarms raised by the monitor itself (on top of the engine's vital-sign alarms). */
const ARRHYTHMIA_ALARMS: Partial<Record<string, string>> = {
  "ventricular-fibrillation": "VF",
  "ventricular-tachycardia": "VT",
  asystole: "ASYSTOLE",
  pea: "PEA · NO PULSE",
};

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
    notAttached: "未连接监护",
    noEcg: "心电导联未连接",
    attachHint: "连接监护后显示持续读数",
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
    notAttached: "MONITOR NOT ATTACHED",
    noEcg: "ECG LEADS NOT ATTACHED",
    attachHint: "attach the monitor for continuous readings",
    baseline: "BASELINE ONLY · vitals not recorded in this case",
    minute: "min",
    bpm: "bpm",
    alarm: "ALARM",
  },
} as const;

function labelsFor(locale: string) {
  return locale.toLowerCase().startsWith("zh") ? LABELS["zh-CN"] : LABELS.en;
}

/**
 * Rhythm names for the header. A monitor names the rhythm it detects; it
 * never prints an ECG interpretation (ST changes are the 12-lead's job — the
 * waveform still shows them).
 */
const RHYTHM_LABELS: Record<string, { zh: string; en: string }> = {
  sinus: { zh: "窦性心律", en: "Sinus rhythm" },
  "sinus-tachycardia": { zh: "窦性心动过速", en: "Sinus tachycardia" },
  "sinus-bradycardia": { zh: "窦性心动过缓", en: "Sinus bradycardia" },
  "atrial-fibrillation": { zh: "心房颤动", en: "Atrial fibrillation" },
  "atrial-flutter": { zh: "心房扑动", en: "Atrial flutter" },
  svt: { zh: "室上性心动过速", en: "SVT" },
  "ventricular-tachycardia": { zh: "室性心动过速", en: "Ventricular tachycardia" },
  "ventricular-fibrillation": { zh: "心室颤动", en: "Ventricular fibrillation" },
  asystole: { zh: "心搏停止", en: "Asystole" },
  pea: { zh: "无脉电活动", en: "PEA" },
  paced: { zh: "起搏心律", en: "Paced rhythm" },
};

/** Alarm names (the header's "!!! SpO₂ 86"). */
const VITAL_NAMES: Record<string, { zh: string; en: string }> = {
  hr: { zh: "心率", en: "HR" },
  sbp: { zh: "收缩压", en: "SBP" },
  dbp: { zh: "舒张压", en: "DBP" },
  rr: { zh: "呼吸", en: "RR" },
  spo2: { zh: "血氧", en: "SpO₂" },
  temp: { zh: "体温", en: "TEMP" },
  gcs: { zh: "GCS", en: "GCS" },
  glucose: { zh: "血糖", en: "GLUCOSE" },
  etco2: { zh: "EtCO₂", en: "EtCO₂" },
  pain: { zh: "疼痛", en: "PAIN" },
};

const zhLocale = (locale: string) => locale.toLowerCase().startsWith("zh");

/** Localised rhythm name (unknown ids are shown as they are). */
export function rhythmLabel(rhythm: string, locale: string): string {
  const l = RHYTHM_LABELS[rhythm];
  return l ? (zhLocale(locale) ? l.zh : l.en) : rhythm;
}

/** Header alarm text, e.g. "!!! 血糖 3.4" — one decimal for temperature and glucose. */
export function alarmText(alarm: { vital: string; value: number; level: "warning" | "critical" }, locale: string): string {
  const name = VITAL_NAMES[alarm.vital];
  const label = name ? (zhLocale(locale) ? name.zh : name.en) : alarm.vital;
  const digits = alarm.vital === "temp" || alarm.vital === "glucose" ? 1 : 0;
  return `${alarm.level === "critical" ? "!!!" : "!!"} ${label} ${Number.isFinite(alarm.value) ? alarm.value.toFixed(digits) : "--"}`;
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
  /** Peak-preserving sub-sampling step (s) per column; 0 = one point per column (smooth waves). */
  resolution?: number;
}

/**
 * Sweep columns as (time-ordered) value extremes: each column covers
 * `window / n` seconds and is sampled every ≤ `resolution` s, keeping its
 * min and max. Point-sampling one value per column (≈ 30 ms on a 6 s sweep)
 * misses narrow QRS peaks, so R waves of a regular rhythm come out with
 * random heights — the min/max envelope keeps every peak. Pure (tested).
 */
export function sweepColumn(sample: (t: number) => number, tEnd: number, span: number, resolution: number): [number, number] {
  const m = Math.max(1, Math.min(12, Math.ceil(span / Math.max(1e-4, resolution))));
  let lo = Infinity, hi = -Infinity, loAt = 0, hiAt = 0;
  for (let k = 1; k <= m; k++) {
    const v = sample(tEnd - span + (span * k) / m);
    if (v < lo) {
      lo = v;
      loAt = k;
    }
    if (v > hi) {
      hi = v;
      hiAt = k;
    }
  }
  // earlier extreme first so the stroke runs forward in time
  return hiAt <= loAt ? [hi, lo] : [lo, hi];
}

function drawSweep(ctx: CanvasRenderingContext2D, x0: number, w: number, lane: Lane, tNow: number, lineW: number): void {
  const n = Math.max(16, Math.floor(w / Math.max(1, lineW * 0.75)));
  const xNow = ((tNow % lane.window) / lane.window) * w;
  const gap = Math.max(6, w * 0.035);
  const colDt = lane.window / n;
  const toY = (v: number) => lane.y + lane.h - Math.max(-0.1, Math.min(1.1, (v - lane.min) / (lane.max - lane.min))) * lane.h;
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
    const [a, b] = lane.resolution ? sweepColumn(lane.sample, tNow - age, colDt, lane.resolution) : [lane.sample(tNow - age), NaN];
    const ya = toY(a);
    if (!pen) ctx.moveTo(x0 + px, ya);
    else ctx.lineTo(x0 + px, ya);
    if (!Number.isNaN(b)) ctx.lineTo(x0 + px, toY(b));
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
    const detached = !!s && s.monitorAttached === false;
    const live = !!s && !baseline && !detached;
    // On the monitor without its ECG leads (a pulse oximeter and cuff): numbers, but no rhythm and a flat lead II.
    const noEcg = live && s.ecgAttached === false;
    const t = timeMs / 1000;
    const W = width, H = height;
    const u = Math.max(1, Math.min(W / 320, H / 200));
    const flashOn = Math.floor(timeMs / 450) % 2 === 0;

    ctx.save();
    ctx.fillStyle = MONITOR_COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // header
    const headH = Math.round(H * 0.1);
    // A vital the monitor cannot read (arrest) has no value to alarm on: the arrhythmia alarm covers it.
    const unread = new Set<string>(s?.unmeasurable ?? []);
    const readable = (s?.alarms ?? []).filter((a) => !unread.has(a.vital));
    const critical = readable.filter((a) => a.level === "critical");
    const warnings = readable.filter((a) => a.level === "warning");
    const arrhythmia = live ? ARRHYTHMIA_ALARMS[s?.vitals.rhythm ?? ""] ?? null : null;
    const alarmActive = live && (!!arrhythmia || critical.length > 0 || warnings.length > 0);
    ctx.fillStyle = alarmActive && flashOn ? (critical.length || arrhythmia ? "#5a0d0a" : "#4a3708") : MONITOR_COLORS.header;
    ctx.fillRect(0, 0, W, headH);
    ctx.textBaseline = "middle";
    const headFont = Math.max(8, Math.round(headH * 0.55));
    ctx.font = `bold ${headFont}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = "left";
    ctx.fillStyle = "#9fd8b4";
    const rhythm = (s?.vitals.rhythm ?? "sinus") as RhythmName;
    const morph = (s?.vitals.ecg ?? "normal") as MorphologyName;
    const leftText = !s ? L.noPatient : detached ? L.notAttached : baseline ? L.baseline : noEcg ? L.noEcg : `II · ${rhythmLabel(rhythm, locale)}`;
    ctx.fillText(leftText, 6 * u, headH / 2, W * 0.62);
    ctx.textAlign = "right";
    if (alarmActive && arrhythmia) {
      ctx.fillStyle = MONITOR_COLORS.critical;
      if (flashOn) ctx.fillText(`!!! ${arrhythmia}`, W - 6 * u, headH / 2);
    } else if (alarmActive) {
      const a = critical[0] ?? warnings[0];
      ctx.fillStyle = critical.length ? MONITOR_COLORS.critical : MONITOR_COLORS.warning;
      if (flashOn || !critical.length) ctx.fillText(alarmText(a, locale), W - 6 * u, headH / 2);
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
        resolution: 0.004,
        sample: s && !detached && !noEcg ? (tt) => ecgValue(tt, rhythm, morph, hr) : () => 0,
      },
      {
        y: top + avail * 0.42,
        h: avail * 0.27,
        color: dim(MONITOR_COLORS.spo2),
        window: 6,
        min: -0.05,
        max: 1.05,
        sample: s && !detached ? (tt) => plethValue(tt, rhythm, hr) : () => 0,
      },
      {
        y: top + avail * 0.72,
        h: avail * 0.25,
        color: dim(MONITOR_COLORS.rr),
        window: 12,
        min: -0.05,
        max: 1.1,
        sample: s && !detached ? (tt) => respValue(tt, rr, capno) : () => 0,
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
      { key: "hr", label: L.hr, value: live && drawRate(rhythm, hr) > 0 && !unread.has("hr") ? fmt(v?.hr) : live ? "---" : "--", unit: L.bpm, color: MONITOR_COLORS.ecg, weight: 1.3 },
      { key: "spo2", label: L.spo2, value: live && !isPulseless(rhythm) && !unread.has("spo2") ? fmt(v?.spo2) : live ? "---" : "--", unit: "%", color: MONITOR_COLORS.spo2, weight: 1.1 },
      {
        key: "sbp",
        label: L.nibp,
        value: live && !unread.has("sbp") ? `${fmt(v?.sbp)}/${fmt(v?.dbp)}` : live ? "---/---" : "--/--",
        unit: "mmHg",
        color: MONITOR_COLORS.nibp,
        weight: 1,
        sub: live && !unread.has("sbp") ? `(${fmt(v?.map)})` : "",
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
    for (const [i, b] of boxes.entries()) {
      const bh = (colH * b.weight) / totalW;
      const lvl = live && !unread.has(b.key) ? alarmLevel(s, b.key) ?? (b.key === "sbp" ? alarmLevel(s, "dbp") : null) : null;
      if (lvl && (flashOn || lvl === "warning")) {
        ctx.fillStyle = lvl === "critical" ? "#7a1410" : "#5a4208";
        ctx.fillRect(colX - 2 * u, y, colW + 4 * u, bh - 2 * u);
      }
      if (i > 0) {
        ctx.fillStyle = "#1f2a26";
        ctx.fillRect(colX - 2 * u, y - 1 * u, colW + 4 * u, Math.max(1, u));
      }
      const color = live ? (lvl === "critical" && flashOn ? "#ffffff" : b.color) : MONITOR_COLORS.dim;
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const lf = Math.max(6, Math.round(Math.min(bh * 0.2, 10 * u)));
      ctx.font = `${lf}px ui-monospace, Menlo, monospace`;
      ctx.fillText(b.label, colX, y + 1.5 * u, colW * 0.72);
      ctx.textAlign = "right";
      ctx.fillText(b.sub ? `${b.unit} ${b.sub}` : b.unit, colX + colW, y + 1.5 * u, colW * 0.5);
      const vf = Math.max(8, Math.round(Math.min((bh - lf - 4 * u) * 0.95, (colW / Math.max(3, b.value.length)) * 1.6)));
      ctx.font = `bold ${vf}px ui-monospace, Menlo, Consolas, monospace`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(b.value, colX + colW, y + bh - 3 * u);
      y += bh;
    }

    if (!s || detached) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#9a9a9a";
      ctx.font = `bold ${Math.max(8, Math.round(12 * u))}px ui-monospace, Menlo, monospace`;
      ctx.fillText(s ? L.notAttached : L.noPatient, waveW / 2, top + avail / 2, waveW - 8);
      if (s) {
        ctx.font = `${Math.max(7, Math.round(9 * u))}px ui-monospace, Menlo, monospace`;
        ctx.fillText(L.attachHint, waveW / 2, top + avail / 2 + Math.max(10, 16 * u), waveW - 8);
      }
    }
    ctx.restore();
  },
};

export default monitorRenderer;
