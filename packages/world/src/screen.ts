/**
 * The bedside monitor's screen as one compact line: the session's bedside
 * snapshot (`ClinicalView.bedside()` — `vitalsAt`, exactly what
 * `check_vitals` shows) with the same rules: only the vitals the snapshot
 * shows, "no reading" for vitals the monitor cannot read (cardiac arrest),
 * trend arrows, the rhythm only when the snapshot has one (ECG leads on),
 * and the active alarms. A case without a physiology model shows no values
 * (the placeholder vitals are never presented as readings).
 */
import type { VitalKey, VitalsSnapshot } from "@clinicalcraft/core";
import { worldMessage } from "./i18n.js";

const ARROW: Record<string, string> = { "1": "↑", "-1": "↓", "0": "" };

const LABEL: Record<string, { zh: string; en: string; unit: string }> = {
  hr: { zh: "心率", en: "HR", unit: "/min" },
  rr: { zh: "呼吸", en: "RR", unit: "/min" },
  spo2: { zh: "SpO₂", en: "SpO₂", unit: "%" },
  temp: { zh: "体温", en: "T", unit: " °C" },
  gcs: { zh: "GCS", en: "GCS", unit: "" },
  glucose: { zh: "血糖", en: "Glucose", unit: " mmol/L" },
  etco2: { zh: "EtCO₂", en: "EtCO₂", unit: " mmHg" },
  pain: { zh: "疼痛", en: "Pain", unit: "/10" },
  sbp: { zh: "收缩压", en: "SBP", unit: " mmHg" },
};

const zh = (locale: string) => locale.toLowerCase().startsWith("zh");

/** Screen line and alarm line of a bedside snapshot (null: nothing to show). */
export function formatScreen(s: VitalsSnapshot, locale: string): { screen: string; alarms?: string } {
  if (s.baselineOnly) return { screen: worldMessage("screen.notRecorded", locale) };
  const v = s.vitals;
  const unread = new Set<VitalKey>(s.unmeasurable ?? []);
  const nr = worldMessage("screen.noReading", locale);
  const label = (k: string) => (zh(locale) ? LABEL[k].zh : LABEL[k].en);
  const arrow = (k: VitalKey) => (unread.has(k) ? "" : (ARROW[String(s.trend[k] ?? 0)] ?? ""));
  const parts: string[] = [];
  if (v.hr != null) parts.push(`${label("hr")} ${unread.has("hr") ? nr : `${v.hr}${LABEL.hr.unit}`}${arrow("hr")}`);
  if (v.sbp != null && v.dbp != null) parts.push(`${zh(locale) ? "血压" : "BP"} ${unread.has("sbp") ? nr : `${v.sbp}/${v.dbp} mmHg${arrow("sbp")}${v.map != null ? ` (MAP ${v.map})` : ""}`}`);
  else if (v.sbp != null) parts.push(`${label("sbp")} ${unread.has("sbp") ? nr : `${v.sbp}${LABEL.sbp.unit}`}${arrow("sbp")}`);
  for (const k of ["rr", "spo2", "temp", "gcs", "glucose", "etco2", "pain"] as const) {
    const value = v[k];
    if (typeof value === "number") parts.push(`${label(k)} ${unread.has(k) ? nr : `${value}${LABEL[k].unit}`}${arrow(k)}`);
  }
  if (v.rhythm) parts.push(`${zh(locale) ? "心律" : "rhythm"} ${v.rhythm}`);
  const out: { screen: string; alarms?: string } = { screen: parts.join(" · ") || nr };
  const alarms = s.alarms.filter((a) => a.vital === "hr" || !unread.has(a.vital));
  if (alarms.length) {
    const list = alarms.map((a) => `${LABEL[a.vital] ? label(a.vital) : a.vital} ${unread.has(a.vital) ? nr : a.value} (${worldMessage(a.level === "critical" ? "level.critical" : "level.warning", locale)})`);
    out.alarms = worldMessage("screen.alarms", locale, { alarms: list.join(zh(locale) ? "；" : "; ") });
  }
  return out;
}
