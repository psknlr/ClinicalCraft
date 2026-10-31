import { afterEach, describe, expect, it } from "vitest";
import { loadContent, type CaseCard } from "../app/content.js";
import { setLocale } from "../i18n/index.js";
import { caseCollectionBadge, caseCollections, matchesLibraryQuery } from "./library.js";

const base = loadContent().cards[0]!;
const card: CaseCard = {
  ...base, id: "secret-final-diagnosis", tags: ["cmcr-105", "historical-review"],
  title: { "zh-CN": "反复胸痛 · 42岁女性", en: "Recurrent chest pain · woman aged 42" },
  summary: { "zh-CN": "运动后出现胸痛，需要复核既往检查。", en: "Pain after exercise; review the previous investigations." },
  specialty: ["cardiology"], setting: "inpatient",
};

afterEach(() => setLocale("zh-CN"));

describe("case library at 135 cases", () => {
  it("keeps the 105 and 20 collections separate with counts from the index, including partial server catalogues", () => {
    const cards = [
      ...Array.from({ length: 105 }, (_, n) => ({ ...card, id: `new-${n}` })),
      ...Array.from({ length: 20 }, (_, n) => ({ ...card, id: `original-${n}`, tags: ["cmcr-20"] })),
      ...Array.from({ length: 10 }, (_, n) => ({ ...card, id: `other-${n}`, tags: [] })),
    ];
    setLocale("en");
    expect(caseCollections(cards)).toEqual([
      { id: "cmcr-105", label: "CMCR · multispecialty cases (105)" },
      { id: "cmcr-20", label: "CMCR · original selection (20)" },
    ]);
    expect(caseCollections([card])).toEqual([{ id: "cmcr-105", label: "CMCR · multispecialty cases (1)" }]);
    expect(caseCollections([{ ...card, tags: [] }])).toEqual([]);
    setLocale("zh-CN");
    expect(caseCollections(cards)[0]!.label).toBe("中华病例说 · 多专科疑难（105 例）");
    expect(caseCollectionBadge(card)).toBe("多专科疑难病例集");
    expect(caseCollectionBadge({ tags: ["cmcr-20"] })).toBe("原选病例集");
  });

  it("finds both languages, multi-term summaries and full-width punctuation without loading case files", () => {
    setLocale("zh-CN");
    expect(matchesLibraryQuery(card, "胸痛，运动 心内科")).toBe(true);
    expect(matchesLibraryQuery(card, "ＣＨＥＳＴ，exercise")).toBe(true);
    expect(matchesLibraryQuery(card, "胸痛 神经")).toBe(false);
    expect(matchesLibraryQuery(card, "   ")).toBe(true);
    setLocale("en");
    expect(matchesLibraryQuery(card, "chest-pain cardiology inpatient")).toBe(true);
  });

  it("does not turn a diagnosis-bearing id, review date or hash into searchable information", () => {
    const hidden = { ...card, contentHash: "secretchecksum", review: { status: "editorial" as const, reviewedAt: "1999-12-31" } };
    expect(matchesLibraryQuery(hidden, "secret-final-diagnosis")).toBe(false);
    expect(matchesLibraryQuery(hidden, "secretchecksum")).toBe(false);
    expect(matchesLibraryQuery(hidden, "1999-12-31")).toBe(false);
  });
});
