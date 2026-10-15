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
 * One-line monitor summary: "HR 88/min · BP 120/80 mmHg (MAP 93) · …".
 * Vitals the monitor cannot read (cardiac arrest) show "no reading", never
 * their placeholder 0; vitals the snapshot leaves out (an unmeasured glucose,
 * a pain score the patient cannot give) are not mentioned.
 */
export function formatVitals(snapshot: VitalsSnapshot, locale: string): string {
  const v = snapshot.vitals;
  const unread = new Set(snapshot.unmeasurable ?? []);
  const nr = noReading(locale);
  const arrow = (k: VitalKey) => (unread.has(k) ? "" : (TREND_ARROW[String(snapshot.trend[k] ?? 0)] ?? ""));
  const parts: string[] = [];
  parts.push(`${vitalLabel("hr", locale)} ${unread.has("hr") ? nr : `${v.hr}/min`}${arrow("hr")}`);
  parts.push(`${isZh(locale) ? "血压" : "BP"} ${unread.has("sbp") ? nr : `${v.sbp}/${v.dbp} mmHg${arrow("sbp")} (MAP ${v.map})`}`);
  parts.push(`${vitalLabel("rr", locale)} ${v.rr}/min${arrow("rr")}`);
  parts.push(`SpO₂ ${unread.has("spo2") ? nr : `${v.spo2}%`}${arrow("spo2")}`);
  parts.push(`${vitalLabel("temp", locale)} ${v.temp} °C${arrow("temp")}`);
  const optional: VitalKey[] = ["gcs", "glucose", "etco2", "pain"];
  for (const k of optional) {
    const value = v[k];
    if (typeof value === "number") parts.push(`${vitalLabel(k, locale)} ${vitalWithUnit(k, value)}${arrow(k)}`);
  }
  if (v.rhythm) parts.push(`${isZh(locale) ? "心律" : "rhythm"} ${v.rhythm}`);
  return parts.join(" · ");
}

/** Alarm list ("SpO₂ 86% (critical)"); during an arrest only the hr/rhythm alarm, never "SpO₂ 0%". */
export function formatAlarms(snapshot: VitalsSnapshot, locale: string): string {
  const unread = new Set(snapshot.unmeasurable ?? []);
  const alarms = snapshot.alarms.filter((a) => a.vital === "hr" || !unread.has(a.vital));
  if (alarms.length === 0) return rt(locale, "tool.vitals.none");
  const list = alarms.map((a) => `${vitalLabel(a.vital, locale)} ${unread.has(a.vital) ? noReading(locale) : vitalWithUnit(a.vital, a.value)} (${rt(locale, a.level === "critical" ? "level.critical" : "level.warning")})`);
  return rt(locale, "tool.vitals.alarms", { alarms: list.join(isZh(locale) ? "；" : "; ") });
}

/** Full vitals text for tools (handles baseline-only cases without presenting placeholders as facts). */
export function vitalsText(snapshot: VitalsSnapshot, locale: string, clockLabel?: string): string {
  if (snapshot.baselineOnly) return rt(locale, "tool.vitals.notRecorded");
  const head = clockLabel ? `[${clockLabel}] ` : "";
  return `${head}${formatVitals(snapshot, locale)}\n${formatAlarms(snapshot, locale)}`;
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function formatValue(v: LabValue, locale: string): string {
  const ref =
    v.refText ?? (v.refLow != null || v.refHigh != null ? `${v.refLow ?? ""}–${v.refHigh ?? ""}` : "");
  const flag = v.flag && v.flag !== "N" ? ` [${v.flag}]` : "";
  const unit = v.unit ? ` ${v.unit}` : "";
  return `- ${t(v.analyte, locale)}: ${v.value}${unit}${flag}${ref ? ` (${isZh(locale) ? "参考" : "ref"} ${ref})` : ""}`;
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
    lines.push(rt(locale, "tool.result.unavailable"));
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
