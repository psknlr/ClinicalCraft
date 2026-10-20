/**
 * Localised labels for case metadata the CLI lists (care setting, specialty,
 * clock mode, provenance, content languages, estimated minutes). Unknown
 * values are shown as recorded — never invented.
 */
import type { MsgKey } from "./i18n.js";

/** The part of a CLI context the labels need. */
export interface Translator {
  t(key: MsgKey, params?: Record<string, string | number>): string;
}

/** `ctx.t(key)` when the key exists, else `fallback`. */
function lookup(ctx: Translator, key: string, fallback: string): string {
  const label = ctx.t(key as MsgKey);
  return label === key ? fallback : label;
}

/** The locale's list separator ("、" / ", "). */
function listSeparator(ctx: Translator): string {
  return ctx.t("list.separator");
}

/** Localised care setting ("emergency" → 急诊); unknown values are shown as is. */
export function settingLabel(ctx: Translator, setting: string): string {
  return lookup(ctx, `setting.${setting}`, setting);
}

/** Localised specialty ("emergency-medicine" → 急诊医学 / Emergency medicine). */
export function specialtyLabel(ctx: Translator, specialty: string): string {
  return lookup(ctx, `specialty.${specialty}`, specialty.replace(/-/g, " "));
}

/** Specialties joined with the locale's list separator. */
export function specialtiesLabel(ctx: Translator, specialties: readonly string[]): string {
  return specialties.map((s) => specialtyLabel(ctx, s)).join(listSeparator(ctx));
}

/** "static" / "simulated" → 静态时钟 / 模拟时钟. */
export function clockModeLabel(ctx: Translator, mode: string): string {
  return lookup(ctx, `clock.${mode}`, mode);
}

/** Case provenance kind ("synthetic" → 虚构教学病例). */
export function provenanceLabel(ctx: Translator, kind: string): string {
  return lookup(ctx, `provenance.${kind}`, kind);
}

/** Content languages ("zh-CN", "en" → 简体中文（zh-CN）、英语（en）). */
export function languagesLabel(ctx: Translator, locales: readonly string[]): string {
  return locales.map((l) => ctx.t("show.language", { name: lookup(ctx, `language.${l}`, l), code: l })).join(listSeparator(ctx));
}

/** "~45 min" / "约 45 分钟". */
export function minutesLabel(ctx: Translator, minutes: number): string {
  return ctx.t("show.minutes", { n: minutes });
}

/** "★★★☆☆" for a 1–5 difficulty. */
export function stars(difficulty: number): string {
  const n = Math.max(0, Math.min(5, Math.round(difficulty)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** What the case picker shows after a title: difficulty and the localised setting. */
export function caseChoiceMeta(ctx: Translator, c: { difficulty: number; setting: string }): string {
  return `${stars(c.difficulty)} · ${settingLabel(ctx, c.setting)}`;
}
