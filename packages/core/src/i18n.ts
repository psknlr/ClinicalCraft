/**
 * Localisation primitives shared by every ClinicalCraft package.
 *
 * Content (cases, facilities, equipment) stores human-readable text as
 * `LocalizedText`: either a plain string (single-language content) or a map
 * from BCP-47-ish locale tags ("zh-CN", "en") to strings.
 */

export type Locale = string;

/** Locales the first-party UI ships translations for. Content may add more. */
export const SUPPORTED_LOCALES = ["zh-CN", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "zh-CN";

export type LocalizedText = string | { [locale: string]: string };

/** Per-locale keyword lists (aliases, intent keywords). A plain array applies to every locale. */
export type LocalizedList = string[] | { [locale: string]: string[] };

/** Normalise a locale tag to the closest supported one ("zh", "zh-Hans", "zh-TW" -> "zh-CN"; "en-US" -> "en"). */
export function normalizeLocale(tag: string | undefined | null): SupportedLocale {
  if (!tag) return DEFAULT_LOCALE;
  const lower = tag.toLowerCase();
  if (lower.startsWith("zh")) return "zh-CN";
  if (lower.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

/**
 * Resolve localized text for `locale`, falling back to the base language,
 * then English, then Chinese, then the first available value.
 */
export function t(text: LocalizedText | undefined | null, locale: Locale = DEFAULT_LOCALE): string {
  if (text == null) return "";
  if (typeof text === "string") return text;
  if (text[locale] != null) return text[locale];
  const base = locale.split("-")[0];
  for (const key of Object.keys(text)) {
    if (key.split("-")[0] === base) return text[key];
  }
  return text.en ?? text["zh-CN"] ?? Object.values(text)[0] ?? "";
}

/** Resolve a localized keyword list; plain arrays apply to every locale. Includes all locales when `locale` is "*". */
export function tList(list: LocalizedList | undefined | null, locale: Locale | "*" = DEFAULT_LOCALE): string[] {
  if (!list) return [];
  if (Array.isArray(list)) return list;
  if (locale === "*") return Object.values(list).flat();
  if (list[locale]) return list[locale];
  const base = locale.split("-")[0];
  for (const key of Object.keys(list)) {
    if (key.split("-")[0] === base) return list[key];
  }
  return [];
}

/** True when the localized text has a value for `locale` (or is a plain string). */
export function hasLocale(text: LocalizedText | undefined | null, locale: Locale): boolean {
  if (text == null) return false;
  if (typeof text === "string") return true;
  return text[locale] != null && text[locale] !== "";
}

/** Merge two localized texts (right wins). Plain strings are treated as locale-agnostic. */
export function mergeText(a: LocalizedText, b: LocalizedText): LocalizedText {
  if (typeof a === "string" || typeof b === "string") return b;
  return { ...a, ...b };
}

/* ------------------------------------------------------------------ */
/* Capability display labels                                           */
/* ------------------------------------------------------------------ */

/**
 * Display labels of the canonical capabilities (schema `CAPABILITIES`): what
 * learners and models read wherever a message names a capability ("needs
 * clinical chemistry", "需要临床生化") — never the id. One table for every
 * package; a capability outside the vocabulary is shown as its id.
 */
export const CAPABILITY_LABELS: Readonly<Record<string, { "zh-CN": string; en: string }>> = {
  // Laboratory
  "lab-hematology": { "zh-CN": "血液学检验", en: "haematology" },
  "lab-chemistry": { "zh-CN": "临床生化", en: "clinical chemistry" },
  "lab-blood-gas": { "zh-CN": "血气分析", en: "blood-gas analysis" },
  "lab-serology": { "zh-CN": "血清学检验", en: "serology" },
  "lab-microbiology": { "zh-CN": "微生物检验", en: "microbiology" },
  "lab-urinalysis": { "zh-CN": "尿液检验", en: "urinalysis" },
  "lab-endocrine": { "zh-CN": "内分泌检验", en: "endocrine testing" },
  "flow-cytometry": { "zh-CN": "流式细胞术", en: "flow cytometry" },
  "point-of-care": { "zh-CN": "床旁快速检测", en: "point-of-care testing" },
  // Imaging
  xray: { "zh-CN": "X线摄影", en: "X-ray" },
  ct: { "zh-CN": "CT扫描", en: "a CT scanner" },
  mri: { "zh-CN": "磁共振成像", en: "an MRI scanner" },
  ultrasound: { "zh-CN": "超声", en: "ultrasound" },
  "pet-ct": { "zh-CN": "PET-CT显像", en: "PET-CT" },
  fluoroscopy: { "zh-CN": "透视/血管造影", en: "fluoroscopy (cath lab)" },
  echocardiography: { "zh-CN": "超声心动图", en: "echocardiography" },
  // Pathology / genetics
  histopathology: { "zh-CN": "组织病理", en: "histopathology" },
  cytology: { "zh-CN": "细胞学检查", en: "cytology" },
  cytogenetics: { "zh-CN": "细胞遗传学检查", en: "cytogenetics" },
  molecular: { "zh-CN": "分子检测", en: "molecular testing" },
  // Bedside diagnostics & monitoring
  "ecg-12lead": { "zh-CN": "十二导联心电图", en: "a 12-lead ECG" },
  "cardiac-monitor": { "zh-CN": "心电监护", en: "cardiac monitoring" },
  capnography: { "zh-CN": "呼气末二氧化碳监测", en: "capnography" },
  stethoscope: { "zh-CN": "听诊器", en: "a stethoscope" },
  otoscope: { "zh-CN": "耳镜/检眼镜", en: "an otoscope" },
  "reflex-hammer": { "zh-CN": "叩诊锤", en: "a reflex hammer" },
  thermometer: { "zh-CN": "体温计", en: "a thermometer" },
  scale: { "zh-CN": "体重秤", en: "a weighing scale" },
  "peak-flow": { "zh-CN": "峰流速测定", en: "peak-flow measurement" },
  // Therapy & resuscitation
  oxygen: { "zh-CN": "氧气", en: "oxygen" },
  suction: { "zh-CN": "吸引装置", en: "suction" },
  airway: { "zh-CN": "高级气道设备", en: "advanced airway equipment" },
  ventilator: { "zh-CN": "呼吸机", en: "a ventilator" },
  nebulizer: { "zh-CN": "雾化器", en: "a nebuliser" },
  "iv-access": { "zh-CN": "静脉通路", en: "IV access" },
  "infusion-pump": { "zh-CN": "输液泵", en: "an infusion pump" },
  defibrillator: { "zh-CN": "除颤仪", en: "a defibrillator" },
  "crash-cart": { "zh-CN": "抢救车", en: "a crash cart" },
  medications: { "zh-CN": "药品", en: "medications" },
  "blood-bank": { "zh-CN": "血库血制品", en: "blood-bank products" },
  surgery: { "zh-CN": "手术室", en: "an operating theatre" },
  anesthesia: { "zh-CN": "麻醉机", en: "an anaesthesia machine" },
  endoscopy: { "zh-CN": "内镜室", en: "an endoscopy suite" },
  dialysis: { "zh-CN": "血液透析", en: "haemodialysis" },
  // Teaching & records
  "anatomy-atlas": { "zh-CN": "解剖图谱", en: "the anatomy atlas" },
  "evidence-board": { "zh-CN": "会诊板", en: "the case board" },
  records: { "zh-CN": "电子病历终端", en: "an electronic health record terminal" },
  crafting: { "zh-CN": "制作台", en: "a crafting bench" },
};

/** Display label of a capability in `locale` (`CAPABILITY_LABELS`); an unknown capability is returned as is. */
export function capabilityLabel(capability: string, locale: Locale = DEFAULT_LOCALE): string {
  const label = CAPABILITY_LABELS[capability];
  return label ? t(label, locale) : capability;
}

/** Display labels of capabilities, in order (`capabilityLabel` of each). */
export function capabilityLabels(capabilities: readonly string[], locale: Locale = DEFAULT_LOCALE): string[] {
  return capabilities.map((c) => capabilityLabel(c, locale));
}
