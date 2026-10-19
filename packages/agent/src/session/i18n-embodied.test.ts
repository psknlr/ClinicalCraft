/**
 * Embodied-mode runtime strings are bilingual: every key in both tables with
 * the same `{placeholders}`, merged into the runtime tables (`rt`).
 */
import { describe, expect, it } from "vitest";
import { rt, type RuntimeKey } from "./i18n.js";
import { EMBODIED_EN, EMBODIED_ZH } from "./i18n-embodied.js";

const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("embodied runtime strings", () => {
  it("have the same keys and placeholders in English and Chinese", () => {
    expect(Object.keys(EMBODIED_ZH).sort()).toEqual(Object.keys(EMBODIED_EN).sort());
    for (const [key, en] of Object.entries(EMBODIED_EN)) {
      const zh = EMBODIED_ZH[key as keyof typeof EMBODIED_ZH];
      expect(params(zh), key).toEqual(params(en));
      // Wording (not pure formatting such as " · {state}") is translated.
      if (/[A-Za-z]{3,}/.test(en.replace(/\{\w+\}/g, "").replace(/\b(ECG|SpO|NIBP|id)\b/g, ""))) expect(zh, key).not.toBe(en);
    }
  });

  it("resolve through rt() in both languages", () => {
    expect(rt("en", "embodied.notEmbodied" as RuntimeKey)).toBe(EMBODIED_EN["embodied.notEmbodied"]);
    expect(rt("zh-CN", "embodied.notEmbodied" as RuntimeKey)).toBe(EMBODIED_ZH["embodied.notEmbodied"]);
  });
});
