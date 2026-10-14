import { describe, expect, it } from "vitest";
import { extractDrugMentions, extractNumericTokens, parseChineseNumber, verifyGrounding } from "./grounding.js";

describe("numeric token extraction", () => {
  it("handles decimals, ranges, dates, units and ×10⁹", () => {
    const tokens = extractNumericTokens("WBC 3.2×10⁹/L, Hb 79.10 g/L on 2025-04-28; 55 mg on odd days; SpO₂ 93%");
    const pairs = tokens.map((t) => `${t.value}|${t.unit ?? ""}`);
    expect(pairs).toContain("3.2|");
    expect(pairs).toContain("79.1|g");
    expect(pairs).toContain("2025|");
    expect(pairs).toContain("4|");
    expect(pairs).toContain("28|");
    expect(pairs).toContain("55|mg");
    expect(pairs).toContain("93|%");
  });

  it("parses Chinese numerals with units and skips idioms/ordinals", () => {
    expect(parseChineseNumber("三十")).toBe(30);
    expect(parseChineseNumber("十五")).toBe(15);
    expect(parseChineseNumber("一百二十")).toBe(120);
    expect(parseChineseNumber("两")).toBe(2);
    const pairs = extractNumericTokens("三十年前发现，两周前加重，四肢发麻，一直不好，第一次住院").map((t) => `${t.value}|${t.unit ?? ""}`);
    expect(pairs).toEqual(["30|year", "2|week"]);
  });

  it("reads English number words with a unit", () => {
    expect(extractNumericTokens("for two weeks, three times").map((t) => `${t.value}|${t.unit}`)).toEqual(["2|week", "3|time"]);
  });
});

describe("verifyGrounding", () => {
  const answer = "大约30年前就发现脾大了。2024年11月的PET/CT又提示脾脏明显增大。";
  it("accepts paraphrases that keep the numbers", () => {
    expect(verifyGrounding("脾大是三十年前发现的，2024年11月又查过。", [answer]).ok).toBe(true);
    expect(verifyGrounding("About two hours ago, lifting boxes.", ["About two hours ago, while I was lifting boxes."]).ok).toBe(true);
  });

  it("rejects invented numbers, changed units and new drugs", () => {
    expect(verifyGrounding("大概20年前发现的。", [answer]).ok).toBe(false);
    expect(verifyGrounding("30天前发现的。", [answer]).ok).toBe(false);
    const drug = verifyGrounding("I take metformin and atorvastatin.", ["I take metformin 500 mg twice a day."]);
    expect(drug.ok).toBe(false);
    expect(drug.violations.join(" ")).toMatch(/atorvastatin/);
    expect(verifyGrounding("我吃吉非替尼。", ["服用阿美替尼。"]).ok).toBe(false);
    expect(verifyGrounding("我吃阿美替尼。", ["服用阿美替尼。"]).ok).toBe(true);
  });

  it("rejects clinical acronyms the facts do not contain", () => {
    expect(verifyGrounding("I think it's a STEMI, doctor.", ["My chest hurts."]).violations).toEqual(['term "STEMI"']);
    expect(verifyGrounding("The PET/CT showed it again.", ["2024年11月的PET/CT又提示脾脏明显增大。"]).ok).toBe(true);
    expect(verifyGrounding("OK, I understand. I'll go to the GP.", ["x"]).ok).toBe(true);
  });

  it("detects case-specific drug names", () => {
    expect(extractDrugMentions("they gave me the clot buster tenecteplase")).toContain("tenecteplase");
    expect(verifyGrounding("I had aspirin earlier", ["nothing about drugs"], { drugLexicon: ["aspirin"] }).ok).toBe(false);
  });
});
