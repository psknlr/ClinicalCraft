/**
 * Shared, localised formatting of case data for tool outputs, slash commands
 * and offline responders. Every function here only formats data the caller
 * decided may be shown — none of them decides what the learner has obtained.
 */
import {
  resultFor,
  t,
  type CaseDefinition,
  type Investigation,
  type LabValue,
  type Rhythm,
  type SessionState,
  type VitalKey,
  type VitalsSnapshot,
} from "@clinicalcraft/core";
import { isZh, rt } from "../session/i18n.js";

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/** Localised phase label (falls back to the id). */
export function phaseLabel(c: CaseDefinition, phaseId: string, locale: string): string {
  const phase = c.phases.find((p) => p.id === phaseId);
  return phase ? t(phase.label, locale) || phaseId : phaseId;
}

/** Localised investigation name (falls back to the id). */
export function investigationName(c: CaseDefinition, id: string, locale: string): string {
  const inv = c.investigations.find((i) => i.id === id);
  return inv ? t(inv.name, locale) || id : id;
}

/** Localised intervention name with its dose (when declared). */
export function interventionLabel(c: CaseDefinition, id: string, locale: string): string {
  const iv = c.interventions.find((i) => i.id === id);
  if (!iv) return id;
  const dose = iv.dose ? t(iv.dose, locale) : "";
  const name = t(iv.name, locale) || id;
  return dose && !name.includes(dose) ? `${name} (${dose})` : name;
}

/** Localised objective title. */
export function objectiveTitle(c: CaseDefinition, id: string, locale: string): string {
  const o = c.objectives.find((x) => x.id === id);
  return o ? t(o.title, locale) || id : id;
}

const VITAL_LABELS: Record<VitalKey, { en: string; zh: string; unit: string }> = {
  hr: { en: "HR", zh: "心率", unit: "/min" },
  sbp: { en: "SBP", zh: "收缩压", unit: "mmHg" },
  dbp: { en: "DBP", zh: "舒张压", unit: "mmHg" },
  rr: { en: "RR", zh: "呼吸", unit: "/min" },
  spo2: { en: "SpO₂", zh: "SpO₂", unit: "%" },
  temp: { en: "T", zh: "体温", unit: "°C" },
  gcs: { en: "GCS", zh: "GCS", unit: "" },
  glucose: { en: "Glucose", zh: "血糖", unit: "mmol/L" },
  etco2: { en: "EtCO₂", zh: "EtCO₂", unit: "mmHg" },
  pain: { en: "Pain", zh: "疼痛评分", unit: "/10" },
};

/** Localised vital-sign label. */
export function vitalLabel(key: VitalKey, locale: string): string {
  const l = VITAL_LABELS[key];
  return l ? (isZh(locale) ? l.zh : l.en) : key;
}

const RHYTHM_LABELS: Record<Rhythm, { en: string; zh: string }> = {
  sinus: { en: "sinus rhythm", zh: "窦性心律" },
  "sinus-tachycardia": { en: "sinus tachycardia", zh: "窦性心动过速" },
  "sinus-bradycardia": { en: "sinus bradycardia", zh: "窦性心动过缓" },
  "atrial-fibrillation": { en: "atrial fibrillation", zh: "心房颤动" },
  "atrial-flutter": { en: "atrial flutter", zh: "心房扑动" },
  svt: { en: "SVT", zh: "室上性心动过速" },
  "ventricular-tachycardia": { en: "ventricular tachycardia", zh: "室性心动过速" },
  "ventricular-fibrillation": { en: "ventricular fibrillation", zh: "心室颤动" },
  asystole: { en: "asystole", zh: "心脏停搏" },
  pea: { en: "PEA", zh: "无脉性电活动" },
  paced: { en: "paced rhythm", zh: "起搏心律" },
};

/** Localised monitor rhythm ("sinus-tachycardia" → "窦性心动过速" / "sinus tachycardia"); unknown values are shown as recorded. */
export function rhythmLabel(rhythm: string, locale: string): string {
  const l = (RHYTHM_LABELS as Record<string, { en: string; zh: string } | undefined>)[rhythm];
  return l ? (isZh(locale) ? l.zh : l.en) : rhythm;
}

/**
 * A case-clock minute as the learner reads it, in whole minutes like the
 * front-ends' status line: the wall-clock time ("09:46") when the case has
 * `clock.startTime`, else "minute 46" / "第 46 分钟". Fractional action costs
 * never show. `floor` (default) is for "now"; `ceil` is for a due time — a
 * result due at minute 45.5 is announced for 09:46, the first whole minute at
 * which it is ready.
 */
export function clockTime(c: CaseDefinition, minute: number, locale: string, round: "floor" | "ceil" = "floor"): string {
  const whole = Math.max(0, round === "ceil" ? Math.ceil(minute - 1e-9) : Math.floor(minute + 1e-9));
  const start = c.clock.startTime;
  if (!start) return rt(locale, "clock.minute", { n: whole });
  const [h, m] = start.split(":").map(Number);
  const total = ((((h ?? 0) * 60 + (m ?? 0) + whole) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** A vital value with its unit ("98%", "120 mmHg"). */
export function vitalWithUnit(key: VitalKey, value: number): string {
  const unit = VITAL_LABELS[key]?.unit ?? "";
  if (!unit) return String(value);
  return unit === "%" || unit.startsWith("/") ? `${value}${unit}` : `${value} ${unit}`;
}

const TREND_ARROW: Record<string, string> = { "-1": "↓", "0": "", "1": "↑" };

/** What the monitor shows for a vital it cannot read (cardiac arrest: `VitalsSnapshot.unmeasurable`). */
export function noReading(locale: string): string {
  return isZh(locale) ? "测不出" : "no reading";
}

/**
 * A snapshot's readings as text ("HR 88/min↑", "BP 120/80 mmHg (MAP 93)",
 * "rhythm sinus rhythm"…), split into live ones and static manual ones (the
 * spot checks shown before the monitor is attached).
 */
export function bedsideReadings(snapshot: VitalsSnapshot, locale: string): { live: string[]; manual: string[] } {
  const v = snapshot.vitals;
  const unread = new Set(snapshot.unmeasurable ?? []);
  const manualKeys = new Set(snapshot.spotChecks ?? []);
  const nr = noReading(locale);
  const arrow = (k: VitalKey) => (unread.has(k) || manualKeys.has(k) ? "" : (TREND_ARROW[String(snapshot.trend[k] ?? 0)] ?? ""));
  const live: string[] = [];
  const manual: string[] = [];
  const add = (k: VitalKey, text: string) => (manualKeys.has(k) ? manual : live).push(text);
  if (v.hr != null) add("hr", `${vitalLabel("hr", locale)} ${unread.has("hr") ? nr : `${v.hr}/min`}${arrow("hr")}`);
  if (v.sbp != null && v.dbp != null) {
    add("sbp", `${isZh(locale) ? "血压" : "BP"} ${unread.has("sbp") ? nr : `${v.sbp}/${v.dbp} mmHg${arrow("sbp")}${v.map != null ? ` (MAP ${v.map})` : ""}`}`);
  } else if (v.sbp != null) add("sbp", `${vitalLabel("sbp", locale)} ${unread.has("sbp") ? nr : vitalWithUnit("sbp", v.sbp)}${arrow("sbp")}`);
  if (v.rr != null) add("rr", `${vitalLabel("rr", locale)} ${v.rr}/min${arrow("rr")}`);
  if (v.spo2 != null) add("spo2", `SpO₂ ${unread.has("spo2") ? nr : `${v.spo2}%`}${arrow("spo2")}`);
  if (v.temp != null) add("temp", `${vitalLabel("temp", locale)} ${v.temp} °C${arrow("temp")}`);
  const optional: VitalKey[] = ["gcs", "glucose", "etco2", "pain"];
  for (const k of optional) {
    const value = v[k];
    if (typeof value === "number") add(k, `${vitalLabel(k, locale)} ${vitalWithUnit(k, value)}${arrow(k)}`);
  }
  if (v.rhythm) live.push(`${isZh(locale) ? "心律" : "rhythm"} ${rhythmLabel(v.rhythm, locale)}`);
  return { live, manual };
}

/** True while the case's bedside monitor is not attached (`VitalsSnapshot.monitorAttached === false`). */
export function offMonitor(snapshot: VitalsSnapshot): boolean {
  return snapshot.monitorAttached === false;
}

/** True while the monitor is attached without its ECG leads (`VitalsSnapshot.ecgAttached === false`): no rhythm to report. */
export function withoutEcg(snapshot: VitalsSnapshot): boolean {
  return !offMonitor(snapshot) && snapshot.ecgAttached === false;
}

/**
 * One-line summary of the bedside: "HR 88/min · BP 120/80 mmHg (MAP 93) · …".
 * Vitals the monitor cannot read (cardiac arrest) show "no reading", never
 * their placeholder 0; vitals the snapshot leaves out (an unmeasured glucose,
 * a pain score the patient cannot give, monitored vitals while the monitor
 * is not attached) are not mentioned. Before the monitor is attached the line
 * says so first and labels the spot checks as triage readings taken by hand
 * (never live values); there is no rhythm then — nor while the monitor has no
 * ECG leads yet (`ecgAttached: false`), which the line ends by saying.
 */
export function formatVitals(snapshot: VitalsSnapshot, locale: string): string {
  const { live, manual } = bedsideReadings(snapshot, locale);
  if (!offMonitor(snapshot)) {
    const line = live.join(" · ");
    if (!withoutEcg(snapshot)) return line;
    return `${line}${isZh(locale) ? "。" : ". "}${rt(locale, "tool.vitals.noEcg")}`;
  }
  const parts = [rt(locale, "tool.vitals.noMonitor")];
  if (manual.length > 0) parts.push(rt(locale, "tool.vitals.spotChecks", { readings: manual.join(" · ") }));
  if (live.length > 0) parts.push(rt(locale, "tool.vitals.observations", { readings: live.join(" · ") }));
  return parts.join(isZh(locale) ? "" : " ");
}

/** Alarm list ("SpO₂ 86% (critical)"); during an arrest only the hr/rhythm alarm, never "SpO₂ 0%". */
export function formatAlarms(snapshot: VitalsSnapshot, locale: string): string {
  const unread = new Set(snapshot.unmeasurable ?? []);
  const alarms = snapshot.alarms.filter((a) => a.vital === "hr" || !unread.has(a.vital));
  if (alarms.length === 0) return rt(locale, "tool.vitals.none");
  const list = alarms.map((a) => `${vitalLabel(a.vital, locale)} ${unread.has(a.vital) ? noReading(locale) : vitalWithUnit(a.vital, a.value)} (${rt(locale, a.level === "critical" ? "level.critical" : "level.warning")})`);
  return rt(locale, "tool.vitals.alarms", { alarms: list.join(isZh(locale) ? "；" : "; ") });
}

/**
 * Full vitals text for tools (handles baseline-only cases without presenting
 * placeholders as facts). Before the monitor is attached: that notice, the
 * triage readings taken by hand and the bedside observations (a read glucose
 * among them) on their own lines, and no alarm line — nothing alarms without
 * a monitor, and "no active alarms" would wrongly suggest one is watching.
 */
export function vitalsText(snapshot: VitalsSnapshot, locale: string, clockLabel?: string): string {
  if (snapshot.baselineOnly) return rt(locale, "tool.vitals.notRecorded");
  const head = clockLabel ? `[${clockLabel}] ` : "";
  if (offMonitor(snapshot)) {
    const { live, manual } = bedsideReadings(snapshot, locale);
    const lines = [`${head}${rt(locale, "tool.vitals.noMonitor")}`];
    if (manual.length > 0) lines.push(rt(locale, "tool.vitals.spotChecks", { readings: manual.join(" · ") }));
    if (live.length > 0) lines.push(rt(locale, "tool.vitals.observations", { readings: live.join(" · ") }));
    return lines.join("\n");
  }
  return `${head}${formatVitals(snapshot, locale)}\n${formatAlarms(snapshot, locale)}`;
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

/** A result value in the reader's language (numbers as authored; text values may be per-locale). */
export function labValueText(v: Pick<LabValue, "value">, locale: string): string {
  return typeof v.value === "number" ? String(v.value) : t(v.value, locale);
}

/** A result's reference range in the reader's language: `refText` (per locale) or `refLow–refHigh`. */
export function labRefText(v: Pick<LabValue, "refText" | "refLow" | "refHigh">, locale: string): string {
  if (v.refText !== undefined) return t(v.refText, locale);
  return v.refLow != null || v.refHigh != null ? `${v.refLow ?? ""}–${v.refHigh ?? ""}` : "";
}

function formatValue(v: LabValue, locale: string): string {
  const ref = labRefText(v, locale);
  const flag = v.flag && v.flag !== "N" ? ` [${v.flag}]` : "";
  const unit = v.unit ? ` ${v.unit}` : "";
  return `- ${t(v.analyte, locale)}: ${labValueText(v, locale)}${unit}${flag}${ref ? ` (${isZh(locale) ? "参考" : "ref"} ${ref})` : ""}`;
}

export interface FormattedResult {
  text: string;
  data: {
    investigationId: string;
    phase: string;
    name: string;
    date: string | null;
    available: boolean;
    text: string;
    values: LabValue[];
    figures: string[];
    note: string | null;
    critical: boolean;
  } | null;
}

/** Result text for one (investigation, phase) — call ONLY for results the viewer has obtained. */
export function formatResult(c: CaseDefinition, investigationId: string, phase: string, locale: string): FormattedResult {
  const name = investigationName(c, investigationId, locale);
  const result = resultFor(c, investigationId, phase);
  if (!result) return { text: `${name}: ${rt(locale, "tool.result.unavailable")}`, data: null };
  const date = result.date ? t(result.date, locale) : "";
  const lines = [rt(locale, "tool.result.header", { name, phase: phaseLabel(c, phase, locale), date: date ? ` (${date})` : "" })];
  if (!result.available) {
    // An `available: false` result is a record (ARCHITECTURE §3.4): its authored explanation (not
    // performed, referred, why) is shown, followed by a short notice; the generic line only when empty.
    const why = t(result.text, locale);
    if (why) lines.push(why, rt(locale, "tool.result.notAvailable"));
    else lines.push(rt(locale, "tool.result.unavailable"));
  } else {
    const body = t(result.text, locale);
    if (body) lines.push(body);
    if (result.values.length > 0) {
      lines.push(rt(locale, "tool.result.values"));
      for (const v of result.values) lines.push(formatValue(v, locale));
    }
  }
  if (result.note) lines.push(rt(locale, "tool.result.note", { text: t(result.note, locale) }));
  const figures = result.figures
    .map((id) => {
      const asset = c.assets.find((a) => a.id === id);
      return asset?.title ? t(asset.title, locale) : id;
    })
    .filter(Boolean);
  if (figures.length > 0) lines.push(rt(locale, "tool.result.figures", { list: figures.join(isZh(locale) ? "、" : ", ") }));
  return {
    text: lines.join("\n"),
    data: {
      investigationId,
      phase,
      name,
      date: date || null,
      available: result.available,
      text: t(result.text, locale),
      values: result.values,
      figures: result.figures,
      note: result.note ? t(result.note, locale) : null,
      critical: result.critical,
    },
  };
}

/** Investigation ids the case declares, with names, in declaration order. */
export function investigationIndex(c: CaseDefinition, locale: string): { id: string; name: string; category: Investigation["category"] }[] {
  return c.investigations.map((i) => ({ id: i.id, name: t(i.name, locale) || i.id, category: i.category }));
}

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

/** True when an item restricted to phases is available in the session's current phase. */
export function availableInPhase(item: { phases?: string[] | undefined }, state: SessionState): boolean {
  return !item.phases || item.phases.includes(state.phase);
}

/* ------------------------------------------------------------------ */
/* Plain-text tables                                                   */
/* ------------------------------------------------------------------ */

const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/;

/** Display width of a string in a terminal (CJK/full-width = 2 columns). */
export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += WIDE.test(ch) ? 2 : 1;
  return width;
}

function truncateWidth(text: string, max: number): string {
  if (displayWidth(text) <= max) return text;
  let out = "";
  let width = 0;
  for (const ch of text) {
    const w = WIDE.test(ch) ? 2 : 1;
    if (width + w > max - 1) break;
    out += ch;
    width += w;
  }
  return `${out}…`;
}

/**
 * Render rows as a compact aligned table (first row may be a header). Cells
 * are truncated to `maxCell` columns; the last column is never padded.
 */
export function table(rows: readonly (readonly string[])[], options: { header?: boolean; maxCell?: number } = {}): string {
  if (rows.length === 0) return "";
  const maxCell = options.maxCell ?? 48;
  const cells = rows.map((r) => r.map((c) => truncateWidth(c.replace(/\s+/g, " ").trim(), maxCell)));
  const columns = Math.max(...cells.map((r) => r.length));
  const widths = Array.from({ length: columns }, (_, i) => Math.max(0, ...cells.map((r) => displayWidth(r[i] ?? ""))));
  const lines = cells.map((r) =>
    r
      .map((c, i) => (i === r.length - 1 ? c : c + " ".repeat(widths[i]! - displayWidth(c))))
      .join("  ")
      .trimEnd(),
  );
  if (options.header && lines.length > 1) {
    const rule = widths.map((w) => "─".repeat(Math.max(1, w))).join("  ");
    lines.splice(1, 0, rule);
  }
  return lines.join("\n");
}
