import { describe, expect, it } from "vitest";
import { extractClaimTerms, extractDrugMentions, extractNumericTokens, extractSides, parseChineseNumber, verifyGrounding } from "./grounding.js";

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

describe("diagnoses, history and relative dates must be grounded (C2)", () => {
  const sources = ["Right in the middle of my chest, like a heavy weight.", "Nothing else really — just the blood pressure and the cholesterol."];
  it("rejects made-up conditions, family history and digit-free dates", () => {
    const made = verifyGrounding("Yes doctor, I had a stroke last year, and my father died of a heart attack.", sources);
    expect(made.ok).toBe(false);
    expect(made.violations).toEqual(expect.arrayContaining(['claim "stroke"', 'claim "last year"', 'claim "heart attack"']));
    const zh = verifyGrounding("是的医生，我去年中风过，我父亲死于心梗。", ["就在胸口正中间。"]);
    expect(zh.ok).toBe(false);
    expect(zh.violations).toEqual(expect.arrayContaining(['claim "中风"', 'claim "去年"', 'claim "心梗"']));
  });
  it("accepts the same words when the facts say them", () => {
    expect(verifyGrounding("My dad had a heart attack years ago.", ["My father had a heart attack years ago."]).ok).toBe(true);
    expect(verifyGrounding("我有高血压。", ["有高血压，一直在吃药。"]).ok).toBe(true);
    expect(verifyGrounding("It's right in the middle of my chest.", sources).ok).toBe(true);
  });
  it("case decision options and unrevealed facts", () => {
    expect(verifyGrounding("Maybe it's a pulmonary embolism?", sources, { conditionTerms: ["Pulmonary embolism"] }).ok).toBe(false);
    const unasked = verifyGrounding("It also goes down my left arm.", sources, { unrevealed: ["It goes down my left arm and into my jaw."] });
    expect(unasked.ok).toBe(false);
    expect(unasked.kinds).toEqual(["side", "unasked"]);
    expect(unasked.violations.join(" ")).toMatch(/unasked fact/);
    expect(verifyGrounding("It's right in the middle of my chest.", sources, { unrevealed: ["It goes down my left arm and into my jaw."] }).ok).toBe(true);
  });
});

describe("review round 3: claim-term boundaries, zh unasked-fact windows, violation kinds", () => {
  it("a lexicon term needs a trailing word boundary (plural allowed)", () => {
    expect(extractClaimTerms("I've got hives all over my arms.")).not.toContain("hiv");
    expect(extractClaimTerms("he stroked his beard")).not.toContain("stroke");
    expect(extractClaimTerms("he has had two strokes")).toContain("stroke");
    expect(extractClaimTerms("she had HIV once")).toContain("hiv");
    expect(verifyGrounding("I've got itchy hives all over my arms.", ["Itchy red welts came up all over my arms and chest."]).ok).toBe(true);
    // a plural in the reply is grounded by the singular in the facts (and vice versa)
    expect(verifyGrounding("He has had strokes before.", ["He had a stroke two years back."]).violations).not.toContain('claim "stroke"');
  });

  it("zh unasked-fact phrases stay inside punctuation-delimited runs and skip function-word windows", () => {
    expect(verifyGrounding("没有，从来没有过敏。", ["没有过敏。", "你有过敏吗？"], { unrevealed: ["没有，从来没用过。"] }).ok).toBe(true);
    expect(verifyGrounding("（女儿）没有，她没有已知的过敏。", ["（病人）过敏……没有。（女儿）没有已知过敏。"], { unrevealed: ["（女儿）没有，她一直很好。"] }).ok).toBe(true);
    expect(verifyGrounding("没有，他从来没有对什么药或者吃的东西过敏。", ["（妻子）没有，他不过敏。"], { unrevealed: ["（妻子）没有。他从来没抽过筋，也没有咬舌头。"] }).ok).toBe(true);
    // a distinctive content phrase of an unrevealed answer is still caught
    const leak = verifyGrounding("胸口像压了块大石头。", ["两个小时前开始的。"], { unrevealed: ["像压了块大石头一样，闷得慌。"] });
    expect(leak.ok).toBe(false);
    expect(leak.kinds).toEqual(["unasked"]);
  });

  it("reports violation kinds alongside the detailed list", () => {
    const check = verifyGrounding("Two hours ago, 40 of them. Feels like a heavy weight; I think it is an Inferior STEMI.", ["About two hours ago."], {
      conditionTerms: ["Inferior STEMI"],
      unrevealed: ["Like a heavy weight on my chest."],
    });
    expect(check.ok).toBe(false);
    expect(check.kinds).toEqual(expect.arrayContaining(["number", "term", "claim", "unasked"]));
    expect(check.violations.join(" ")).toMatch(/heavy weight/);
    expect(verifyGrounding("Fine.", ["Fine."]).kinds).toEqual([]);
  });
});

describe("grounding benchmark, dev split: units, sides, dates, habits, lexicon and yes/no answers", () => {
  const pairs = (text: string) => extractNumericTokens(text).map((t) => `${t.value}|${t.unit ?? ""}`);

  it("reads amounts, clock times, floors and household sizes with their units", () => {
    expect(pairs("About six litres a day, three bottles, 9 o'clock")).toEqual(["9|oclock", "6|l", "3|bottle"]);
    expect(pairs("早上九点吃的，住2楼，一家三口，两个小时前")).toEqual(["2|floor", "9|oclock", "3|people", "2|hour"]);
    expect(pairs("好一点了，差一点晕过去")).toEqual([]);
    expect(verifyGrounding("About six litres a day.", ["I get through three or four litres a day."]).kinds).toEqual(["number"]);
    expect(verifyGrounding("Three or four litres a day.", ["I get through three or four litres a day."]).ok).toBe(true);
    expect(verifyGrounding("早上九点吃的。", ["早上七点吃的早饭。"]).kinds).toEqual(["number"]);
    expect(verifyGrounding("两个小时前开始的。", ["2小时前开始疼。"]).ok).toBe(true);
  });

  it("a side of the body must come from the sources", () => {
    expect(extractSides("my left hand, the right-hand side, 右前臂, 左下腹")).toEqual([
      { side: "left", raw: "left hand" },
      { side: "right", raw: "right-hand side" },
      { side: "right", raw: "右前臂" },
      { side: "left", raw: "左下腹" },
    ]);
    expect(extractSides("50岁左右, right in the middle, I left work, 左右为难")).toEqual([]);
    expect(verifyGrounding("On my left hand.", ["Right forearm, here…"]).kinds).toEqual(["side"]);
    expect(verifyGrounding("My right forearm.", ["Right forearm, here…"]).ok).toBe(true);
    expect(verifyGrounding("左手被蛰的。", ["右前臂这里……"]).kinds).toEqual(["side"]);
  });

  it("months, weekdays and habits' frequencies are claims; synonyms ground each other", () => {
    expect(verifyGrounding("Yes, in March 2025.", ["In April 2025 I had a fever."]).violations).toEqual(['claim "march"']);
    expect(verifyGrounding("In April 2025.", ["In April 2025 I had a fever."]).ok).toBe(true);
    expect(verifyGrounding("Quite a lot — half a bottle every night.", ["One or two small glasses with his workmates at the weekend."]).violations).toEqual(['claim "every night"']);
    expect(verifyGrounding("A glass or two every weekend.", ["One or two small glasses with his workmates at the weekend."]).ok).toBe(true);
    expect(verifyGrounding("I drink that much every day.", ["I get through three or four litres a day."]).ok).toBe(true);
    expect(verifyGrounding("About a week ago.", ["It started the day before yesterday."]).violations).toEqual(['claim "a week ago"']);
    expect(verifyGrounding("三年前查出甲减。", ["三年前查出甲状腺功能减退。"]).ok).toBe(true);
    expect(verifyGrounding("I'm diabetic.", ["I've had type 1 diabetes since I was 11."]).ok).toBe(true);
    expect(verifyGrounding("我妈有克罗恩病。", ["家里人身体都还好。"]).violations).toEqual(['claim "克罗恩"']);
  });

  it("knows more drug names without mistaking everyday words for them", () => {
    expect(extractDrugMentions("I take allopurinol and sertraline, and cefalexin")).toEqual(expect.arrayContaining(["allopurinol", "sertraline", "cefalexin"]));
    expect(extractDrugMentions("my cholesterol is high")).toEqual([]);
    expect(extractDrugMentions("一直吃别嘌醇和恩格列净")).toEqual(expect.arrayContaining(["嘌醇", "恩格列净"]));
    expect(verifyGrounding("Nothing serious, apart from gout — I take allopurinol for it.", ["Nothing serious — never been in hospital."]).kinds).toEqual(["drug", "claim"]);
  });

  it("checks a yes/no answer against the facts used (answer-polarity.ts)", () => {
    const fact = "I've felt sick since about midday. I threw up once around 10 last night. Nothing since.";
    expect(verifyGrounding("No, I haven't vomited at all.", [fact], { question: "Any vomiting?", answered: [fact] }).kinds).toEqual(["polarity"]);
    expect(verifyGrounding("I threw up once around 10 last night.", [fact], { question: "Any vomiting?", answered: [fact] }).ok).toBe(true);
    expect(verifyGrounding("No, my heart's fine.", ["x"], { question: "Do you have any heart problems?", answered: [] }).kinds).toEqual(["polarity"]);
    expect(verifyGrounding("I'm not sure, doctor.", ["x"], { question: "Do you have any heart problems?", answered: [] }).ok).toBe(true);
    // without `answered` (the tool pipeline, nonverbal cues) the polarity rules do not run
    expect(verifyGrounding("No, my heart's fine.", ["x"], { question: "Do you have any heart problems?" }).ok).toBe(true);
    const stockings = "They put stockings on me before the operation. I've never had a leg-pump machine.";
    expect(verifyGrounding("Yes, and the leg pumps too.", [stockings], { question: "Have you been wearing stockings?", answered: [stockings] }).violations).toEqual(['denied detail "pump"']);
  });
});
