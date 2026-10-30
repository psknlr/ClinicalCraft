import { afterEach, describe, expect, it } from "vitest";
import { loadContent, type CaseCard } from "../app/content.js";
import { setLocale, tr } from "../i18n/index.js";
import { caseCollectionBadge, caseCollections, matchesLibraryQuery } from "./library.js";

const base = loadContent().cards[0]!;
const card: CaseCard = {
  ...base, id: "secret-final-diagnosis", tags: ["cmcr-105", "historical-review"],
  title: { "zh-CN": "反复胸痛 · 42岁女性", en: "Recurrent chest pain · woman aged 42" },
  summary: { "zh-CN": "运动后出现胸痛，需要复核既往检查。", en: "Pain after exercise; review the previous investigations." },
  specialty: ["cardiology"], setting: "inpatient",
};
/** Specialty and setting appear only as ids and labels: the texts never name them. */
const plain = (specialty: string[], setting: string): CaseCard => ({
  ...card, tags: [], specialty, setting,
  title: { "zh-CN": "发热 · 7岁男孩", en: "Fever · boy aged 7" },
  summary: { "zh-CN": "发热三天。", en: "Three days of fever." },
});

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
      { id: "cmcr-105", label: "CMCR · additional cases (105)" },
      { id: "cmcr-20", label: "CMCR · original selection (20)" },
    ]);
    expect(caseCollections([card])).toEqual([{ id: "cmcr-105", label: "CMCR · additional cases (1)" }]);
    expect(caseCollections([{ ...card, tags: [] }])).toEqual([]);
    expect(caseCollectionBadge(card)).toBe("Additional collection");
    setLocale("zh-CN");
    expect(caseCollections(cards)[0]!.label).toBe("中华病例说 · 新增病例（105 例）");
    expect(caseCollectionBadge(card)).toBe("新增病例集");
    expect(caseCollectionBadge({ tags: ["cmcr-20"] })).toBe("原选病例集");
  });

  it("words the library as the glossary does, the same in both languages", () => {
    // A library entry is a case (病例); an encounter (接诊) is one session of a case (docs/GLOSSARY.md).
    setLocale("en");
    expect(tr("library.browseHint")).toBe("Find a case by presenting complaint or specialty");
    setLocale("zh-CN");
    expect(tr("library.browseHint")).toBe("按主诉或专科查找病例");
    // A collection is named for how it joined the library, in both languages — never for difficulty (疑难).
    for (const key of ["library.cmcr105Collection", "library.cmcr105Badge", "library.cmcrCollection", "library.cmcr20Badge"] as const) {
      expect(tr(key, { n: 1 })).not.toMatch(/疑难|接诊/);
      setLocale("en");
      expect(tr(key, { n: 1 })).not.toMatch(/multispecialty|encounter|difficult|complex/i);
      setLocale("zh-CN");
    }
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

  it("finds specialty and setting terms in either language, whatever the interface language", () => {
    const icu = plain(["critical-care"], "icu");
    const haem = plain(["hematology", "pediatrics"], "emergency");
    setLocale("zh-CN");
    expect(matchesLibraryQuery(icu, "ICU")).toBe(true);
    expect(matchesLibraryQuery(icu, "icu critical care")).toBe(true);
    expect(matchesLibraryQuery(haem, "haematology")).toBe(true);
    expect(matchesLibraryQuery(haem, "Paediatrics emergency")).toBe(true);
    expect(matchesLibraryQuery(haem, "ICU")).toBe(false);
    setLocale("en");
    expect(matchesLibraryQuery(icu, "重症监护")).toBe(true);
    expect(matchesLibraryQuery(icu, "重症医学")).toBe(true);
    expect(matchesLibraryQuery(haem, "急诊 血液科")).toBe(true);
    expect(matchesLibraryQuery(haem, "儿科")).toBe(true);
    expect(matchesLibraryQuery(haem, "重症监护")).toBe(false);
    // The setting id itself, hyphen and all.
    expect(matchesLibraryQuery(plain(["general-surgery"], "operating-room"), "operating room")).toBe(true);
    expect(matchesLibraryQuery(plain(["general-surgery"], "operating-room"), "手术室")).toBe(true);
  });

  it("does not turn a diagnosis-bearing id, review date or hash into searchable information", () => {
    const hidden = { ...card, contentHash: "secretchecksum", review: { status: "editorial" as const, reviewedAt: "1999-12-31" } };
    expect(matchesLibraryQuery(hidden, "secret-final-diagnosis")).toBe(false);
    expect(matchesLibraryQuery(hidden, "secretchecksum")).toBe(false);
    expect(matchesLibraryQuery(hidden, "1999-12-31")).toBe(false);
  });
});
