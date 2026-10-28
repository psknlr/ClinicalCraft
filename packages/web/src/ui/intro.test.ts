/** The intro footer must not reveal a case's diagnosis before it is played; the selected case shows its disclaimer. */
import { describe, expect, it } from "vitest";
import { loadContent } from "../app/content.js";
import { caseDisclaimer, reviewLine, setLocale } from "../i18n/index.js";
import { footLabel } from "./intro.js";

describe("intro footer label", () => {
  it("keeps the V4 prefix but uses the spoiler-free title", () => {
    const card = loadContent().cards.find((c) => c.id === "smzl-lung-adeno");
    if (!card) throw new Error("smzl-lung-adeno card missing");
    expect(card.labelPrefix).not.toBeNull();
    // The index never carries the diagnosis-bearing rest of the V4 label.
    const { id: _id, ...rest } = card;
    expect(JSON.stringify(rest)).not.toMatch(/SMZL|腺癌|adenocarcinoma/i);
    for (const locale of ["zh-CN", "en"] as const) {
      setLocale(locale);
      const text = footLabel(card);
      expect(text.startsWith("CASE 01 · ")).toBe(true);
      expect(text).not.toMatch(/SMZL|腺癌|adenocarcinoma/i);
    }
  });

  it("falls back to the title when a case has no V4 label", () => {
    setLocale("en");
    expect(footLabel({ labelPrefix: null, title: { "zh-CN": "胸痛", en: "Chest pain" } })).toBe("Chest pain");
  });
});

describe("case disclaimer (selected-case summary, quest card, Sources)", () => {
  it("uses the case's own disclaimer, which every built-in case carries", () => {
    const cards = loadContent().cards;
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.disclaimer, card.id).not.toBeNull();
      for (const locale of ["zh-CN", "en"] as const) {
        setLocale(locale);
        expect(caseDisclaimer(card.disclaimer)).toBe((card.disclaimer as Record<string, string>)[locale]);
      }
    }
  });

  it("falls back to a bilingual generic notice", () => {
    setLocale("en");
    expect(caseDisclaimer(null)).toBe("Fictional teaching case — not medical advice; simulation for education only.");
    expect(caseDisclaimer({ "zh-CN": " ", en: " " })).toMatch(/not medical advice/);
    setLocale("zh-CN");
    expect(caseDisclaimer(undefined)).toBe("虚构教学病例，不构成医疗建议；仅供教学模拟。");
  });
});

describe("review status and learning outcomes on the case card (docs/GLOSSARY.md §4)", () => {
  it("words each review status as the glossary fixes it, in both languages", () => {
    setLocale("en");
    expect(reviewLine({ status: "editorial", reviewedAt: "2026-10-28" })).toBe("Editorial review 2026-10-28 · not yet reviewed by a licensed clinician");
    expect(reviewLine({ status: "clinician-reviewed", reviewedAt: null })).toBe("Reviewed by a licensed clinician");
    expect(reviewLine({ status: "unknown-status" })).toBe("");
    expect(reviewLine(null)).toBe("");
    setLocale("zh-CN");
    expect(reviewLine({ status: "editorial", reviewedAt: "2026-10-28" })).toBe("编辑审核 2026-10-28 · 尚未经执业医师审核");
    expect(reviewLine({ status: "editorial" })).toBe("编辑审核 · 尚未经执业医师审核");
    expect(reviewLine({ status: "unreviewed" })).toBe("尚未审核（未经编辑审核，也未经执业医师审核）");
  });

  it("the library index carries the review and the outcome count; the outcomes' text stays in the full case", async () => {
    const content = loadContent();
    for (const card of content.cards) {
      const loaded = await content.loadCase(card.id);
      if (!loaded.ok) throw new Error(`${card.id} did not load`);
      const def = loaded.def;
      expect(card.learningOutcomeCount, card.id).toBe(def.learningOutcomes.length);
      expect(card.review, card.id).toEqual(def.provenance.review ? { status: def.provenance.review.status, reviewedAt: def.provenance.review.reviewedAt ?? null } : null);
      for (const outcome of def.learningOutcomes) {
        for (const text of typeof outcome === "string" ? [outcome] : Object.values(outcome)) expect(JSON.stringify(card), card.id).not.toContain(text.slice(0, 30));
      }
    }
  });
});

describe("facility choices can complete the case (C3)", () => {
  it("never offers a facility whose equipment cannot complete an objective (new-onset T2DM is not offered the V4 clinic)", () => {
    const content = loadContent();
    const t2dm = content.cards.find((c) => c.id === "new-onset-t2dm");
    if (!t2dm) return;
    const offered = content.facilitiesFor(t2dm).map((f) => f.id);
    expect(offered).not.toContain("clinic-v4");
    expect(offered).toContain(t2dm.facility ?? "general-hospital");
    // Every card still has at least its own facility.
    for (const card of content.cards) expect(content.facilitiesFor(card).length, card.id).toBeGreaterThan(0);
  });
});
