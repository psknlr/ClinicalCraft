/** The intro footer must not reveal a case's diagnosis before it is played. */
import { describe, expect, it } from "vitest";
import { loadContent } from "../app/content.js";
import { setLocale } from "../i18n/index.js";
import { footLabel } from "./intro.js";

describe("intro footer label", () => {
  it("keeps the V4 prefix but uses the spoiler-free title", () => {
    const card = loadContent().cards.find((c) => c.id === "smzl-lung-adeno");
    if (!card) throw new Error("smzl-lung-adeno card missing");
    expect(card.label).not.toBeNull();
    for (const locale of ["zh-CN", "en"] as const) {
      setLocale(locale);
      const text = footLabel(card);
      expect(text.startsWith("CASE 01 · ")).toBe(true);
      expect(text).not.toMatch(/SMZL|腺癌|adenocarcinoma/i);
    }
  });

  it("falls back to the title when a case has no V4 label", () => {
    setLocale("en");
    expect(footLabel({ label: null, title: { "zh-CN": "胸痛", en: "Chest pain" } })).toBe("Chest pain");
  });
});
