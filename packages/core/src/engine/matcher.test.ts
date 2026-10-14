import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import { EXCLUDE_KEYWORD_FACTOR, matchExam, matchHistory, matchInterventions, matchOrders, normalizeQuery, orderWarnings, parseCase } from "./index.js";
import { longestCommonSubstring, phraseScore, prepare, stem, tokenize, tokensMatch } from "./text.js";

const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const V4 = load(fixture("v4-smzl-mini.case.json"));
const SIM = load(fixture("mini-anaphylaxis.case.json"));

/* ------------------------------------------------------------------ */
/* V4 reference implementation — copied verbatim from Virtual Patient  */
/* V4 (custom_cn.js, investigations `is` and matcher `Xd`).            */
/* ------------------------------------------------------------------ */

/* eslint-disable */
var is = [{
  id: "cbc",
  name: "血常规",
  aliases: ["血常规", "血细胞分析", "全血细胞计数", "cbc"],
  type: "text"
}, {
  id: "abdct",
  name: "腹部增强CT",
  aliases: ["腹部增强ct", "全腹增强ct", "腹部ct", "脾脏ct", "胸腹部增强ct", "胸腹增强ct", "增强ct", "ct增强", "ct平扫", "全腹部ct", "全腹ct"],
  type: "image"
}, {
  id: "chestct",
  name: "胸部CT",
  aliases: ["胸部ct", "肺部ct", "肺ct", "胸部增强ct", "肺部增强ct", "胸ct"],
  type: "text"
}, {
  id: "us",
  name: "肝胆脾胰超声",
  aliases: ["超声", "彩超", "b超", "腹部b超", "脾脏超声", "脾脏彩超", "肝胆脾胰", "门静脉超声"],
  type: "image"
}, {
  id: "nodeus",
  name: "浅表淋巴结超声",
  aliases: ["淋巴结超声", "淋巴结彩超", "淋巴结b超"],
  type: "text"
}, {
  id: "pet",
  name: "全身PET/CT",
  aliases: ["petct", "pet/ct", "pet-ct", "pet", "派特"],
  type: "image"
}, {
  id: "marrow",
  name: "骨髓穿刺／细胞学",
  aliases: ["骨髓穿刺", "骨穿", "骨髓细胞学", "骨髓涂片", "骨髓检查"],
  type: "text"
}, {
  id: "biopsy",
  name: "骨髓活检／免疫组化",
  aliases: ["骨髓活检", "骨髓病理", "免疫组化", "ihc"],
  type: "image"
}, {
  id: "flow",
  name: "流式细胞术",
  aliases: ["流式", "免疫分型", "免疫表型", "flow"],
  type: "text"
}, {
  id: "karyo",
  name: "染色体核型分析",
  aliases: ["核型", "染色体", "细胞遗传", "karyotype"],
  type: "image"
}, {
  id: "hbv",
  name: "乙肝筛查／HBV DNA",
  aliases: ["乙肝", "hbv", "肝炎筛查"],
  type: "text"
}, {
  id: "ldh",
  name: "乳酸脱氢酶",
  aliases: ["乳酸脱氢酶", "ldh"],
  type: "text"
}, {
  id: "egfr",
  name: "EGFR基因检测记录",
  aliases: ["egfr", "基因检测", "驱动基因"],
  type: "text"
}];

function Xd(i: string): string[] {
  let e = i.toLowerCase().replace(/\s+/g, "").replace(/（/g, "(").replace(/）/g, ")");
  if (!e) return [];
  let t = is.filter(n => n.aliases.some(s => e.includes(s))).map(n => n.id);
  // @ts-ignore — V4's expression-statement style is preserved verbatim
  return t.includes("pet") && (/腹部|全腹|脾脏|胸腹/.test(e) || (t = t.filter(n => n !== "abdct")), /胸部|肺部/.test(e) || (t = t.filter(n => n !== "chestct"))), t.includes("chestct") && !/腹部|全腹|脾脏|胸腹/.test(e) && (t = t.filter(n => n !== "abdct")), /胸腹/.test(e) && /ct/.test(e) && !t.includes("chestct") && t.push("chestct"), t.includes("nodeus") && (t = t.filter(n => n !== "us")), /心脏|甲状腺|颈动脉|下肢|肾脏|乳腺/.test(e) && /超声|彩超|b超/.test(e) && (t = t.filter(n => n !== "us")), e === "超声" || e === "彩超" || e === "b超" ? ["us", "nodeus"] : e === "ct" || e === "ct检查" || e === "做ct" ? ["abdct", "chestct"] : (/骨髓穿刺/.test(e) && /活检/.test(e) && !t.includes("biopsy") && t.push("biopsy"), t)
}
/* eslint-enable */

const PARITY_QUERIES = [
  "血常规", "CBC", "cbc", "血细胞分析", "全血细胞计数",
  "腹部CT", "腹部增强CT", "胸部CT", "胸腹增强CT", "胸腹部增强CT", "胸腹CT", "胸腹 平扫 CT", "脾脏CT", "全腹CT", "全腹CT平扫", "CT平扫", "增强CT", "肺部增强CT", "肺CT", "胸CT",
  "CT", "ct", " C T ", "CT检查", "做CT", "做 CT", "CT 检查",
  "超声", "彩超", "B超", "b超", " 超 声 ", "腹部B超", "脾脏超声", "脾脏彩超", "门静脉超声", "淋巴结超声", "淋巴结彩超", "淋巴结B超",
  "心脏超声", "甲状腺彩超", "颈动脉B超", "下肢静脉超声", "乳腺彩超", "肾脏超声和淋巴结超声", "心脏彩超+淋巴结超声", "心脏彩超+脾脏超声",
  "PET/CT", "PET-CT", "petct", "PET-CT 腹部", "PET 腹部CT", "PET 胸部CT", "PET 胸部", "petct 肺部 腹部", "PET 胸腹", "派特", "全身PET/CT",
  "骨髓穿刺+活检", "骨髓穿刺 活检", "骨髓穿刺", "骨穿", "骨髓活检", "骨髓病理", "免疫组化", "IHC", "骨髓检查", "骨髓涂片",
  "流式", "流式细胞术", "免疫分型", "Flow", "核型", "染色体核型分析", "Karyotype",
  "乙肝", "HBV DNA", "肝炎筛查", "LDH", "乳酸脱氢酶", "EGFR", "基因检测", "驱动基因",
  "血常规+腹部CT", "血常规，腹部增强CT", "血常规和肝胆脾胰超声", "胸部CT和腹部CT", "（腹部）增强CT", "（胸腹）CT",
  "complete blood count", "abdominal CT", "chest CT scan", "ultrasound", "bone marrow biopsy", "flow cytometry", "PET scan", "hepatitis B",
  "", "   ", "随便看看", "头颅MRI",
];

describe("normalizeQuery", () => {
  it("lower-cases, strips whitespace and maps full-width forms to ASCII", () => {
    expect(normalizeQuery("  血 常 规 ")).toBe("血常规");
    expect(normalizeQuery("（腹部）ＣＴ")).toBe("(腹部)ct");
    expect(normalizeQuery("PET / CT")).toBe("pet/ct");
    expect(normalizeQuery("\u3000CT\t检查\n")).toBe("ct检查");
    expect(normalizeQuery("骨髓穿刺／细胞学")).toBe("骨髓穿刺/细胞学");
  });
});

describe("matchOrders — V4 parity", () => {
  it("uses the V4 investigation aliases verbatim", () => {
    expect(V4.investigations.map((i) => ({ id: i.id, name: i.name, aliases: i.aliases }))).toEqual(is.map(({ id, name, aliases }) => ({ id, name, aliases })));
  });

  it.each(PARITY_QUERIES)("reproduces V4 Xd for %j", (query) => {
    expect(matchOrders(V4, query, "zh-CN")).toEqual(Xd(query));
    expect(matchOrders(V4, query, "en")).toEqual(Xd(query));
  });

  it("covers the interesting V4 branches", () => {
    const outcomes = Object.fromEntries(PARITY_QUERIES.map((q) => [q, Xd(q)]));
    expect(PARITY_QUERIES.length).toBeGreaterThanOrEqual(40);
    expect(outcomes["超声"]).toEqual(["us", "nodeus"]);
    expect(outcomes["做CT"]).toEqual(["abdct", "chestct"]);
    expect(outcomes["胸腹增强CT"]).toEqual(["abdct", "chestct"]);
    expect(outcomes["PET-CT 腹部"]).toEqual(["pet"]);
    expect(outcomes["PET 腹部CT"]).toEqual(["abdct", "pet"]);
    expect(outcomes["PET/CT"]).toEqual(["pet"]);
    expect(outcomes["淋巴结超声"]).toEqual(["nodeus"]);
    expect(outcomes["心脏超声"]).toEqual([]);
    expect(outcomes["骨髓穿刺+活检"]).toEqual(["marrow", "biopsy"]);
    expect(outcomes["胸部CT"]).toEqual(["chestct"]);
    expect(outcomes["complete blood count"]).toEqual([]);
  });

  it("applies exact overrides after rules (equivalent to V4's ordering)", () => {
    // V4 checks exact keys before the biopsy rule; no exact key mentions 骨髓穿刺, so results agree.
    for (const key of Object.keys(V4.orderMatching.exact)) expect(key).not.toMatch(/骨髓穿刺/);
    expect(matchOrders(V4, "ct", "zh-CN")).toEqual(["abdct", "chestct"]);
  });

  it("normalises full-width input beyond V4 (ＣＴ → ct)", () => {
    expect(matchOrders(V4, "腹部ＣＴ", "zh-CN")).toEqual(["abdct"]);
  });
});

describe("matchOrders — generalised", () => {
  it("matches aliases and names across locales", () => {
    expect(matchOrders(SIM, "blood gas", "zh-CN")).toEqual(["abg"]);
    expect(matchOrders(SIM, "查个血气", "en")).toEqual(["abg"]);
    expect(matchOrders(SIM, "Arterial blood gas please", "en")).toEqual(["abg"]);
    expect(matchOrders(SIM, "Chest X-ray", "en")).toEqual(["cxr"]);
    expect(matchOrders(SIM, "头颅CT", "en")).toEqual(["ct-head"]);
    expect(matchOrders(SIM, "tryptase and a CXR", "en")).toEqual(["tryptase", "cxr"]);
    expect(matchOrders(SIM, "MRI spine", "en")).toEqual([]);
  });

  it("drops unknown ids produced by rules and tolerates invalid regexes", () => {
    const json = fixture("mini-anaphylaxis.case.json") as Record<string, unknown>;
    json.orderMatching = { rules: [{ ifMatches: "gas", add: ["ghost", "tryptase"] }, { ifMatches: "(", remove: ["abg"] }], exact: { "全部": ["abg", "ghost"] } };
    const c = load(json);
    expect(matchOrders(c, "blood gas", "en")).toEqual(["abg", "tryptase"]);
    expect(matchOrders(c, "全部", "en")).toEqual(["abg"]);
  });
});

describe("orderWarnings", () => {
  it("returns localized notices whose pattern matches the query", () => {
    expect(orderWarnings(V4, "全腹CT平扫", "abdct", "zh-CN")).toEqual(["原包仅提供腹部增强CT代表图，平扫与增强CT不能视为等价。"]);
    expect(orderWarnings(V4, "全腹CT平扫", "abdct", "en")).toEqual(["Only contrast-enhanced abdominal CT images exist in the source; a non-contrast CT is not equivalent."]);
    expect(orderWarnings(V4, "腹部增强CT", "abdct", "en")).toEqual([]);
    expect(orderWarnings(V4, "胸部CT平扫", "chestct", "zh-CN")).toEqual([]);
  });
});

describe("text scoring primitives", () => {
  it("tokenises English with stop-words and light stemming", () => {
    expect(tokenize("Do you have any allergies?")).toEqual(["allergy"]);
    expect(tokenize("Are you SMOKING these days?")).toEqual(["smok", "day"]);
    expect(tokenize("胸痛 chest pain")).toEqual(["chest", "pain"]);
    expect(tokenize("What's it like? Don't you\u2019re patient's chest")).toEqual(["chest"]);
    expect(stem("breathing")).toBe("breath");
    expect(stem("gas")).toBe("gas");
  });

  it("computes longest common substrings", () => {
    expect(longestCommonSubstring("什么时候开始的", "哪里疼什么时候开始")).toBe(6);
    expect(longestCommonSubstring("", "abc")).toBe(0);
    expect(longestCommonSubstring("abcxyz", "xyzabc")).toBe(3);
  });

  it("scores CJK by LCS ratio and Latin by token coverage", () => {
    expect(phraseScore(prepare("你哪里疼"), prepare("疼"))).toBe(1);
    expect(phraseScore(prepare("什么时候开始的"), prepare("哪里疼，什么时候开始？"))).toBeCloseTo(6 / 9);
    expect(phraseScore(prepare("短"), prepare("哪里疼，什么时候开始？"))).toBe(0);
    expect(phraseScore(prepare("are you breathless"), prepare("short of breath"))).toBe(0.5);
    expect(phraseScore(prepare("pet-ct"), prepare("petct"))).toBe(0.9);
    expect(phraseScore(prepare("doctor"), prepare("ct"))).toBe(0);
  });
});

describe("matchHistory", () => {
  it("matches Chinese utterances (substring/LCS)", () => {
    expect(matchHistory(V4, "以前是否发现过脾大？", "zh-CN")).toEqual([{ id: "spleen", score: 1 }]);
    expect(matchHistory(V4, "你哪里疼", "zh-CN")).toEqual([{ id: "pain", score: 1 }]);
    expect(matchHistory(V4, "什么时候开始的", "zh-CN")).toEqual([{ id: "pain", score: 0.6667 }]);
    expect(matchHistory(V4, "今天天气怎么样", "zh-CN")).toEqual([]);
  });

  it("matches English utterances (tokens, stop-words, stems)", () => {
    expect(matchHistory(SIM, "Are you allergic to anything?", "en")).toEqual([{ id: "allergies", score: 1 }]);
    expect(matchHistory(V4, "Do you smoke?", "en")).toEqual([{ id: "other", score: 1 }]);
    expect(matchHistory(SIM, "what's the weather like", "en")).toEqual([]);
    expect(matchHistory(SIM, "", "en")).toEqual([]);
  });

  it("is cross-lingual", () => {
    expect(matchHistory(SIM, "有没有过敏", "en")).toEqual([{ id: "allergies", score: 1 }]);
    expect(matchHistory(V4, "any lung cancer before?", "zh-CN")).toEqual([{ id: "lung", score: 1 }]);
  });

  it("orders by score, then declaration order", () => {
    expect(matchHistory(V4, "脾大和肿瘤", "zh-CN")).toEqual([
      { id: "spleen", score: 1 },
      { id: "lung", score: 1 },
    ]);
    expect(matchHistory(V4, "什么时候开始发现脾大", "zh-CN")).toEqual([
      { id: "spleen", score: 1 },
      { id: "pain", score: 0.6667 },
    ]);
  });
});

describe("matchExam", () => {
  it("matches maneuvers and keywords in both languages", () => {
    expect(matchExam(SIM, "listen to the chest", "en")).toEqual([{ id: "chest", score: 1 }]);
    expect(matchExam(SIM, "听诊肺部", "zh-CN")).toEqual([{ id: "chest", score: 1 }]);
    expect(matchExam(SIM, "check for hives", "zh-CN")).toEqual([{ id: "skin", score: 1 }]);
    expect(matchExam(V4, "摸一下肚子", "zh-CN")).toEqual([{ id: "abdomen", score: 0.6667 }]);
    expect(matchExam(V4, "Palpate the abdomen", "zh-CN")[0]).toEqual({ id: "abdomen", score: 1 });
  });
});

describe("matchInterventions", () => {
  it("matches names and aliases in both languages", () => {
    expect(matchInterventions(SIM, "give adrenaline now", "en")).toEqual([{ id: "epi", score: 1 }]);
    expect(matchInterventions(SIM, "给予肾上腺素", "zh-CN")).toEqual([{ id: "epi", score: 1 }]);
    expect(matchInterventions(SIM, "epinephrine", "zh-CN")).toEqual([{ id: "epi", score: 1 }]);
    expect(matchInterventions(SIM, "start oxygen", "en")).toEqual([{ id: "oxygen", score: 1 }]);
    expect(matchInterventions(SIM, "吸氧", "en")).toEqual([{ id: "oxygen", score: 1 }]);
    expect(matchInterventions(SIM, "give a beta blocker", "en")).toEqual([{ id: "beta-blocker", score: 1 }]);
    expect(matchInterventions(SIM, "fluid bolus", "en")).toEqual([{ id: "fluids", score: 1 }]);
    expect(matchInterventions(SIM, "something unrelated", "en")).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Stemming regression: "medical" ≠ "medication"                       */
/* ------------------------------------------------------------------ */

/** SIM plus a past-medical-history item next to its medications item (the collision the tighter stemmer fixes). */
function withPmh(): CaseDefinition {
  const json = fixture("mini-anaphylaxis.case.json") as { history: unknown[] };
  json.history.push({
    id: "pmh",
    topic: "pmh",
    question: { en: "Any past medical history?", "zh-CN": "既往有什么病？" },
    answer: { en: "Only mild asthma as a child.", "zh-CN": "小时候有轻度哮喘。" },
    keywords: { en: ["medical history", "medical problems", "illnesses"], "zh-CN": ["既往史", "以前得过什么病"] },
  });
  return load(json);
}

describe("token matching (tightened shared-prefix rule)", () => {
  it("keeps inflections and close derivations together", () => {
    const same = (a: string, b: string) => tokensMatch(tokenize(a)[0], tokenize(b)[0]);
    expect(same("allergy", "allergic")).toBe(true);
    expect(same("breath", "breathless")).toBe(true);
    expect(same("nausea", "nauseous")).toBe(true);
    expect(same("pregnant", "pregnancy")).toBe(true);
    expect(same("diabetes", "diabetic")).toBe(true);
    expect(same("smoking", "smoker")).toBe(true);
    expect(same("palpate", "palpation")).toBe(true);
  });

  it("separates words that merely share a long prefix", () => {
    const same = (a: string, b: string) => tokensMatch(tokenize(a)[0], tokenize(b)[0]);
    expect(same("medical", "medication")).toBe(false);
    expect(same("medical", "medicines")).toBe(false);
    expect(same("history", "historical")).toBe(false);
    expect(same("history", "histology")).toBe(false);
    expect(same("hypertension", "hyperthermia")).toBe(false);
    expect(same("pneumonia", "pneumothorax")).toBe(false);
    expect(same("thrombosis", "thrombolysis")).toBe(false);
    expect(same("aspirin", "aspiration")).toBe(false);
    expect(same("constant", "constipation")).toBe(false);
    // long shared prefixes still separate different procedures/diagnoses
    expect(same("cholecystitis", "cholecystectomy")).toBe(false);
    expect(same("appendicitis", "appendicectomy")).toBe(false);
    expect(same("encephalitis", "encephalopathy")).toBe(false);
    expect(same("laparoscopy", "laparotomy")).toBe(false);
    expect(same("gastroscopy", "gastrostomy")).toBe(false);
  });

  it("keeps long clinical derivations together (one more letter of tail after an 8-letter shared prefix)", () => {
    const same = (a: string, b: string) => tokensMatch(tokenize(a)[0], tokenize(b)[0]);
    expect(same("anticoagulants", "anticoagulation")).toBe(true);
    expect(same("prophylaxis", "prophylactic")).toBe(true);
    expect(same("anaphylaxis", "anaphylactic")).toBe(true);
    expect(same("echocardiogram", "echocardiographic")).toBe(true);
    expect(same("haematology", "haematological")).toBe(true);
  });

  it("folds -ological adjectives onto their -ology noun", () => {
    expect(tokenize("pathological oncological serological cytological neurological")).toEqual(tokenize("pathology oncology serology cytology neurology"));
    expect(tokenize("logical")).toEqual(["logical"]);
  });

  it("finds a medication-history item from its derived forms (stroke-case regression)", () => {
    const json = fixture("mini-anaphylaxis.case.json") as { history: unknown[] };
    json.history.push({
      id: "anticoag",
      topic: "medications",
      question: { en: "Do you take blood thinners?", "zh-CN": "吃抗凝药吗？" },
      answer: { en: "No.", "zh-CN": "不吃。" },
      keywords: { en: ["anticoagulant", "warfarin"], "zh-CN": ["抗凝"] },
    });
    const c = load(json);
    for (const q of ["Is he on any anticoagulation?", "Any anticoagulants?", "Is she anticoagulated?"]) {
      expect(matchHistory(c, q, "en")[0], q).toEqual({ id: "anticoag", score: 1 });
    }
  });

  it("folds British spellings and maps a few lemmas", () => {
    expect(tokenize("haemoglobin oedema anaemia")).toEqual(tokenize("hemoglobin edema anemia"));
    expect(tokenize("immunisation nebuliser")).toEqual(tokenize("immunization nebulizer"));
    expect(tokenize("medicines meds medications medicated")).toEqual(["medication", "medication", "medication", "medication"]);
    expect(tokenize("abdominal exam")).toEqual(["abdomen", "exam"]);
    expect(tokenize("medical")).toEqual(["medical"]);
  });

  it('"past medical history" selects the PMH item, never the medications item', () => {
    const c = withPmh();
    for (const q of ["past medical history", "Any medical history?", "medical problems?"]) {
      const ids = matchHistory(c, q, "en").map((h) => h.id);
      expect(ids[0], q).toBe("pmh");
      expect(ids, q).not.toContain("meds");
    }
    // also without a PMH item to fall back on
    expect(matchHistory(SIM, "past medical history", "en").map((h) => h.id)).not.toContain("meds");
  });

  it('"medications" / "medicines" / "drugs" / "meds" still find the medications item', () => {
    const c = withPmh();
    for (const q of ["medications", "medicines", "drugs", "any meds?", "What medicines do you take?", "Are you on any medication?"]) {
      const hits = matchHistory(c, q, "en");
      expect(hits[0], q).toEqual({ id: "meds", score: 1 });
      expect(hits.map((h) => h.id), q).not.toContain("pmh");
    }
  });
});

/* ------------------------------------------------------------------ */
/* excludeKeywords                                                     */
/* ------------------------------------------------------------------ */

describe("excludeKeywords", () => {
  it("defaults to [] on history items, exam findings and interventions", () => {
    expect(SIM.history[0].excludeKeywords).toEqual([]);
    expect(SIM.exam[0].excludeKeywords).toEqual([]);
    expect(SIM.interventions[0].excludeKeywords).toEqual([]);
  });

  it("multiplies the score of a history item by 0.2 when the normalised utterance contains one (any locale)", () => {
    expect(EXCLUDE_KEYWORD_FACTOR).toBe(0.2);
    const json = fixture("mini-anaphylaxis.case.json") as { history: { id: string; excludeKeywords?: unknown }[] };
    json.history.find((h) => h.id === "meds")!.excludeKeywords = { en: ["drug allergy", "allergic to"], "zh-CN": ["药物过敏"] };
    const c = load(json);
    // without the exclusion "drug allergy" hits both items with score 1
    expect(matchHistory(SIM, "Any drug allergy?", "en").map((h) => h.id)).toEqual(["allergies", "meds"]);
    // 1 × 0.2 < MATCH_THRESHOLD: the medications item drops out; other items are untouched
    expect(matchHistory(c, "Any drug allergy?", "en")).toEqual([{ id: "allergies", score: 1 }]);
    expect(matchHistory(c, "Any DRUG-allergy?", "en")).toEqual([{ id: "allergies", score: 1 }]); // case, spacing, punctuation ignored
    expect(matchHistory(c, "Are you allergic to any drugs?", "en").map((h) => h.id)).toEqual(["allergies"]);
    expect(matchHistory(c, "有药物过敏吗", "en").map((h) => h.id)).not.toContain("meds"); // zh keyword applies to an en-locale query
    expect(matchHistory(c, "what drugs do you take", "zh-CN")).toEqual([{ id: "meds", score: 1 }]); // no exclude phrase present
  });

  it("applies to matchExam and matchInterventions with the same semantics", () => {
    const json = fixture("mini-anaphylaxis.case.json") as { exam: { id: string; excludeKeywords?: unknown }[]; interventions: { id: string; excludeKeywords?: unknown }[] };
    json.exam.find((e) => e.id === "chest")!.excludeKeywords = ["chest x-ray", "胸片"];
    json.interventions.find((i) => i.id === "oxygen")!.excludeKeywords = { en: ["oxygen saturation"] };
    const c = load(json);
    expect(matchExam(SIM, "chest x-ray", "en")).toEqual([{ id: "chest", score: 1 }]);
    expect(matchExam(c, "chest x-ray", "en")).toEqual([]);
    expect(matchExam(c, "Chest X ray", "en")).toEqual([]);
    expect(matchExam(c, "胸片", "en")).toEqual([]);
    expect(matchExam(c, "listen to the chest", "en")).toEqual([{ id: "chest", score: 1 }]);
    expect(matchInterventions(SIM, "what is the oxygen saturation", "en")).toEqual([{ id: "oxygen", score: 1 }]);
    expect(matchInterventions(c, "what is the oxygen saturation", "en")).toEqual([]);
    expect(matchInterventions(c, "start oxygen", "en")).toEqual([{ id: "oxygen", score: 1 }]);
  });
});

/* ------------------------------------------------------------------ */
/* match options                                                       */
/* ------------------------------------------------------------------ */

describe("matchHistory / matchExam options", () => {
  function phased(): CaseDefinition {
    const json = fixture("mini-anaphylaxis.case.json") as { history: Record<string, unknown>[]; exam: Record<string, unknown>[] };
    json.history.push({
      id: "meds-later",
      topic: "medications",
      question: { en: "Which medicines were you sent home with?", "zh-CN": "出院带了什么药？" },
      answer: { en: "Two adrenaline pens.", "zh-CN": "两支肾上腺素笔。" },
      keywords: { en: ["discharge medicines"], "zh-CN": ["出院带药"] },
      phases: ["observation"],
    });
    json.history.push({
      id: "unknown-family",
      topic: "family",
      question: { en: "Does anyone in your family have allergies?", "zh-CN": "家里人有过敏的吗？" },
      answer: { en: "I don't know.", "zh-CN": "不清楚。" },
      keywords: { en: ["family allergies"], "zh-CN": ["家族过敏"] },
      disclosure: "unknown",
    });
    (json.history.find((h) => h.id === "meds") as Record<string, unknown>).phases = ["arrival"];
    json.exam.find((e) => e.id === "skin")!.phases = ["observation"];
    return load(json);
  }

  it("keeps the 3-argument form (all phases, unknown items included)", () => {
    const c = phased();
    expect(matchHistory(c, "what medicines", "en").map((h) => h.id)).toEqual(["meds", "meds-later"]);
    expect(matchHistory(c, "family allergies", "en").map((h) => h.id)).toContain("unknown-family");
    expect(matchHistory(c, "what medicines", "en", {})).toEqual(matchHistory(c, "what medicines", "en"));
  });

  it("drops items whose phases exclude options.phase (unrestricted items stay)", () => {
    const c = phased();
    expect(matchHistory(c, "what medicines", "en", { phase: "arrival" }).map((h) => h.id)).toEqual(["meds"]);
    expect(matchHistory(c, "what medicines", "en", { phase: "observation" }).map((h) => h.id)).toEqual(["meds-later"]);
    expect(matchHistory(c, "any allergies?", "en", { phase: "observation" }).map((h) => h.id)).toContain("allergies");
    expect(matchExam(c, "check for hives", "en", { phase: "arrival" })).toEqual([]);
    expect(matchExam(c, "check for hives", "en", { phase: "observation" })).toEqual([{ id: "skin", score: 1 }]);
    expect(matchExam(c, "check for hives", "en")).toEqual([{ id: "skin", score: 1 }]);
  });

  it("includeUnknown: false drops unknown-disclosure history items", () => {
    const c = phased();
    expect(matchHistory(c, "family allergies", "en", { includeUnknown: false }).map((h) => h.id)).not.toContain("unknown-family");
    expect(matchHistory(c, "family allergies", "en", { includeUnknown: true }).map((h) => h.id)).toContain("unknown-family");
    expect(matchExam(c, "listen to the chest", "en", { includeUnknown: false })).toEqual([{ id: "chest", score: 1 }]);
  });
});
