/**
 * UI localisation: flat message tables (zh-CN.ts / en.ts) for interface
 * strings; case content is resolved with core `t()` via `ct()`.
 */
import { normalizeLocale, t as coreT, type LocalizedText } from "@clinicalcraft/core";
import en from "./en.js";
import zh, { type Messages } from "./zh-CN.js";

export type UiLocale = "zh-CN" | "en";
export type MessageKey = keyof typeof zh;
export type Params = Record<string, string | number>;

const TABLES: Record<UiLocale, Messages> = { "zh-CN": zh, en };

let current: UiLocale = "zh-CN";
const listeners = new Set<(locale: UiLocale) => void>();

/** Default UI locale from the browser (zh* → zh-CN, otherwise en). */
export function detectLocale(): UiLocale {
  const langs = typeof navigator !== "undefined" ? [...(navigator.languages ?? []), navigator.language] : [];
  const first = langs.find(Boolean) ?? "zh-CN";
  return first.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function asUiLocale(tag: string | null | undefined): UiLocale {
  return normalizeLocale(tag) === "en" ? "en" : "zh-CN";
}

export function getLocale(): UiLocale {
  return current;
}

export function setLocale(locale: UiLocale): void {
  if (locale === current) return;
  current = locale;
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  for (const fn of listeners) fn(locale);
}

/** Initialise without notifying (startup). */
export function initLocale(locale: UiLocale): void {
  current = locale;
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

export function onLocaleChange(fn: (locale: UiLocale) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Translate a UI string. */
export function tr(key: MessageKey, params?: Params): string {
  const table = TABLES[current];
  return fill(table[key] ?? zh[key] ?? key, params);
}

/** Translate when the key may not exist (dynamic keys such as `topic.${id}`); falls back to `fallback`. */
export function trMaybe(key: string, fallback: string, params?: Params): string {
  const table = TABLES[current] as Record<string, string>;
  const v = table[key];
  return v == null ? fallback : fill(v, params);
}

/** A `|`-separated list message. */
export function trList(key: MessageKey): string[] {
  return tr(key)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Case content in the current locale (core `t`). */
export function ct(text: LocalizedText | undefined | null): string {
  return coreT(text, current);
}

/**
 * A case's disclaimer ("fictional teaching case — not medical advice") in the
 * current locale, or a generic one when the case has none.
 */
export function caseDisclaimer(text: LocalizedText | undefined | null): string {
  return (text != null && ct(text).trim()) || tr("case.disclaimerFallback");
}

/** Locale-aware list join. */
export function joinList(items: string[]): string {
  return items.join(current === "zh-CN" ? "、" : ", ");
}
