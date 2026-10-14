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
