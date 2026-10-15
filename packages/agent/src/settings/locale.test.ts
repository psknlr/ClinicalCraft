/**
 * `locale` is constrained to the shipped languages in every settings layer
 * and in `configure` ops (web settings panel, MCP, server-built sessions),
 * with aliases normalised (C3).
 */
import { SUPPORTED_LOCALES } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { makeSession } from "../__fixtures__/harness.js";
import { resumedRuntimeConfig } from "../transcript.js";
import { applySettingsPatch, envLayer, mergeSettings, mergeSettingsDetailed, UNSUPPORTED_LOCALE } from "./merge.js";
import { canonicalLocale, LocaleSettingSchema, SETTINGS_LOCALES } from "./schema.js";

describe("canonicalLocale / LocaleSettingSchema", () => {
  it("mirrors the core's supported locales", () => {
    expect([...SETTINGS_LOCALES]).toEqual([...SUPPORTED_LOCALES]);
  });

  it("normalises aliases and rejects other languages", () => {
    for (const tag of ["zh", "ZH", "zh-CN", "zh_cn", "zh-Hans", "zh-Hans-CN", "zh-TW", " zh "]) expect(canonicalLocale(tag)).toBe("zh-CN");
    for (const tag of ["en", "EN", "en-US", "en_GB", "en-Latn-US"]) expect(canonicalLocale(tag)).toBe("en");
    for (const tag of ["fr", "", "english", "zhongwen", "en-", "e", "de-DE", 42, null]) expect(canonicalLocale(tag)).toBeNull();
    expect(LocaleSettingSchema.parse("en-US")).toBe("en");
    expect(LocaleSettingSchema.safeParse("fr").success).toBe(false);
  });
});

describe("settings layers", () => {
  it("store the canonical locale and ignore unsupported ones (with an `unsupported-locale` issue)", () => {
    expect(mergeSettings([{ source: "user", settings: { locale: "en-US" } }]).locale).toBe("en");
    const r = mergeSettingsDetailed([
      { source: "user", settings: { locale: "en" } },
      { source: "project", settings: { locale: "fr" } },
    ]);
    expect(r.settings.locale).toBe("en"); // the next layer down applies
    expect(r.issues).toEqual([expect.objectContaining({ source: "project", path: "locale", code: UNSUPPORTED_LOCALE, value: "fr", severity: "error" })]);
    // env (CLINICALCRAFT_LOCALE), flags and profiles go through the same check
    expect(mergeSettings([envLayer({ CLINICALCRAFT_LOCALE: "zh" })]).locale).toBe("zh-CN");
    expect(mergeSettings([envLayer({ CLINICALCRAFT_LOCALE: "klingon" })]).locale).toBe("zh-CN");
    expect(mergeSettings([{ source: "flag", settings: { locale: 7 } }]).locale).toBe("zh-CN");
    expect(mergeSettings([{ source: "user", settings: { profiles: { exam: { locale: "en_GB" } } } }], { profile: "exam" }).locale).toBe("en");
    const patched = applySettingsPatch(mergeSettings([]), { locale: "xx" });
    expect(patched.settings.locale).toBe("zh-CN");
    expect(patched.issues[0]?.code).toBe(UNSUPPORTED_LOCALE);
  });

  it("a resumed recording cannot switch to an unsupported language", () => {
    const meta = { type: "session_meta", ordinal: 0, payload: { sessionId: "s", caseId: "c", locale: "fr" } };
    const change = (locale: string, ordinal: number) => ({ type: "event", ordinal, payload: { msg: { type: "config_changed", patch: { locale } } } });
    expect(resumedRuntimeConfig([meta, change("de", 1)] as never).locale).toBeUndefined();
    expect(resumedRuntimeConfig([meta, change("en-US", 1)] as never).locale).toBe("en");
  });
});

describe("configure op (web settings panel, MCP, server)", () => {
  it("normalises an alias and refuses an unsupported locale", async () => {
    const t = await makeSession();
    expect(t.session.settings.locale).toBe("en");
    await t.session.run({ type: "configure", patch: { locale: "zh-Hans" } });
    expect(t.session.settings.locale).toBe("zh-CN");
    expect(t.msgs("config_changed").at(-1)?.patch.locale).toBe("zh-CN");
    await t.session.run({ type: "configure", patch: { locale: "fr" } });
    expect(t.session.settings.locale).toBe("zh-CN");
    expect(t.msgs("error").at(-1)?.code).toBe("invalid_config");
    expect(t.msgs("config_changed").at(-1)?.patch.locale).toBeUndefined();
  });

  it("a session built in code with an alias or unsupported locale runs in a supported one", async () => {
    const alias = await makeSession({ settingsPatch: {} });
    expect(alias.session.settings.locale).toBe("en");
    const settings = { ...alias.session.settings, locale: "fr" };
    const odd = await makeSession({ settings });
    expect(odd.session.settings.locale).toBe("zh-CN");
    const us = await makeSession({ settings: { ...alias.session.settings, locale: "en-US" } });
    expect(us.session.settings.locale).toBe("en");
  });
});
