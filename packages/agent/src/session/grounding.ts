/**
 * Grounding verifier for voiced NPC replies (ARCHITECTURE §4.2 step 4).
 *
 * Every number in a reply — integers, decimals, ranges, dates, numbers with
 * units (mg, mmol, cm, ×10⁹, %, litres, bottles, o'clock, 岁/天/周/月/年/点/楼…),
 * Chinese numerals (三十年, 两周, 一百二十) and English number words with a
 * unit ("two weeks", "six litres") — must appear in the allowed source texts
 * (the answers of the facts used, persona text, the learner's own words). A
 * number that carries a unit must appear with the same unit, or bare. Drug
 * names (by common suffixes, a small lexicon and the case's own medication
 * names), upper-case clinical acronyms (diagnoses/tests such as "STEMI",
 * "CT"), named conditions ("stroke", "heart attack", "糖尿病", the case's own
 * decision options; "甲减" is grounded by "甲状腺功能减退"), relative dates
 * without digits ("last year", "去年"), month and weekday names, habits'
 * frequencies ("every night", "每天") and a side of the body ("left hand",
 * "右前臂") must appear in the sources; a distinctive phrase of a fact not
 * yet revealed must not appear at all; and a yes/no answer must agree with
 * the facts used — or not be given when none was (`answer-polarity.ts`).
 * Anything else is a violation → the caller falls back to the authored answer.
 */
import { deniedDetailViolation, polarityViolation } from "./answer-polarity.js";

export interface NumericToken {
  /** Normalised numeric value ("4", "79.1"). */
  value: string;
  /** Normalised unit (null when bare). */
  unit: string | null;
  raw: string;
}

/**
 * Category of a grounding violation. Front-ends and MCP clients see only
 * these (`warning.notGrounded`): the detailed `violations` quote the reply
 * and may name an unasked fact or a decision option, so they stay in the
 * transcript's diagnostics (ARCHITECTURE §4.2 step 4).
 */
export type GroundingViolationKind = "number" | "unit" | "drug" | "term" | "claim" | "side" | "polarity" | "unasked" | "empty" | "length" | "sign" | "finding";

export interface GroundingCheck {
  ok: boolean;
  /** Detailed violations (quote the reply) — diagnostics only, never shown to the learner. */
  violations: string[];
  /** Distinct violation categories, in first-seen order — safe to show. */
  kinds: GroundingViolationKind[];
}

/** Collects violations with their categories. */
class ViolationList {
  readonly details: string[] = [];
  readonly kinds: GroundingViolationKind[] = [];
  add(kind: GroundingViolationKind, detail: string): void {
    if (!this.details.includes(detail)) this.details.push(detail);
    if (!this.kinds.includes(kind)) this.kinds.push(kind);
  }
  result(): GroundingCheck {
    return { ok: this.details.length === 0, violations: [...this.details], kinds: [...this.kinds] };
  }
}

const FULLWIDTH_DIGIT = /[０-９．]/g;

function toAsciiDigits(text: string): string {
  return text.replace(FULLWIDTH_DIGIT, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

/** Unit synonyms → canonical unit. */
const UNIT_MAP: Record<string, string> = {
  mg: "mg", 毫克: "mg", mcg: "mcg", μg: "mcg", µg: "mcg", 微克: "mcg", g: "g", 克: "g", kg: "kg", 公斤: "kg", 千克: "kg", 斤: "jin",
  ml: "ml", 毫升: "ml", l: "l", 升: "l", mmol: "mmol", μmol: "umol", µmol: "umol", umol: "umol", mol: "mol",
  cm: "cm", 厘米: "cm", 公分: "cm", mm: "mm", 毫米: "mm", m: "m", 米: "m",
  "%": "%", 百分: "%", bpm: "bpm", mmhg: "mmhg", iu: "iu", u: "u", units: "u", unit: "u", 单位: "u",
  岁: "year", year: "year", years: "year", yr: "year", yrs: "year", 年: "year",
  天: "day", 日: "day", day: "day", days: "day",
  周: "week", 星期: "week", week: "week", weeks: "week", wk: "week", wks: "week",
  个月: "month", 月: "month", month: "month", months: "month",
  小时: "hour", hour: "hour", hours: "hour", hr: "hour", hrs: "hour", h: "hour",
  分钟: "min", min: "min", mins: "min", minute: "min", minutes: "min",
  次: "time", time: "time", times: "time", 回: "time",
  片: "tablet", 粒: "tablet", tablet: "tablet", tablets: "tablet", pill: "tablet", pills: "tablet",
  周期: "cycle", cycle: "cycle", cycles: "cycle", 疗程: "course",
  度: "degree", "°c": "degree", 号: "date",
  "x10": "x10",
  litre: "l", litres: "l", liter: "l", liters: "l", bottle: "bottle", bottles: "bottle", 瓶: "bottle", glass: "glass", glasses: "glass",
  can: "can", cans: "can", cup: "cup", cups: "cup", 杯: "cup", pint: "pint", pints: "pint", cigarette: "cigarette", cigarettes: "cigarette",
  pack: "pack", packs: "pack", 包: "pack", 支: "stick", 根: "stick", puff: "puff", puffs: "puff", pound: "lb", pounds: "lb", lb: "lb", lbs: "lb",
  stone: "stone", stones: "stone", kilo: "kg", kilos: "kg", mile: "mile", miles: "mile", floor: "floor", floors: "floor", storey: "floor",
  storeys: "floor", 楼: "floor", 层: "floor", "o'clock": "oclock", "o’clock": "oclock", 点: "oclock", 点钟: "oclock", 口: "people",
  碗: "bowl", 顿: "meal", 礼拜: "week", 个礼拜: "week", 个星期: "week", 个小时: "hour", 个钟头: "hour", 钟头: "hour",
};

const ASCII_UNIT_RE =
  "(?:mg|mcg|μg|µg|kg|g|ml|mmol|μmol|µmol|umol|mol|cm|mm|m|%|bpm|mmhg|iu|units?|u|years?|yrs?|yr|days?|weeks?|wks?|wk|months?|hours?|hrs?|hr|h|minutes?|mins?|min|times?|tablets?|pills?|cycles?|°c|" +
  "lit(?:re|er)s?|bottles?|glass(?:es)?|cans?|cups?|pints?|cigarettes?|packs?|puffs?|pounds?|lbs?|stones?|kilos?|miles?|floors?|storeys?|o[’']clock)";
const CJK_UNIT_RE =
  "(?:个月|个小时|个钟头|个星期|个礼拜|小时|钟头|分钟|星期|礼拜|周期|疗程|毫克|毫升|厘米|公分|毫米|公斤|千克|微克|单位|百分|点钟|岁|天|日|周|月|年|次|回|片|粒|斤|克|升|米|度|号|点|楼|层|口|瓶|杯|包|支|根|碗|顿)";

const ARABIC_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)(?:\\s*[×xX*]\\s*10\\s*[⁰¹²³⁴⁵⁶⁷⁸⁹\\^\\d]+)?\\s*(?:(${CJK_UNIT_RE})|(${ASCII_UNIT_RE})(?![a-z]))?`,
  "giu",
);

const CN_DIGITS: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
const CN_NUMERAL_RE = new RegExp(`([零〇一二两三四五六七八九十百千万]+)(${CJK_UNIT_RE})?`, "gu");
/** Units that make a lone "一" a quantity (not "一直", "一下", "一个"…). */
const ONE_UNITS = new Set(["岁", "天", "日", "周", "星期", "个星期", "礼拜", "个礼拜", "个月", "年", "小时", "个小时", "钟头", "个钟头", "分钟", "毫克", "克", "毫升", "片", "粒", "斤", "公斤", "千克", "厘米", "周期", "疗程", "次"]);
const CN_IDIOMS = new Set(["千万", "万一", "一一", "三三两两", "十分", "百分"]);

/** Parse a Chinese numeral string (up to 万) → number, or null. */
export function parseChineseNumber(text: string): number | null {
  if (!text) return null;
  let total = 0;
  let section = 0;
  let digit = -1;
  for (const ch of text) {
    if (ch in CN_DIGITS) {
      digit = CN_DIGITS[ch]!;
    } else if (ch in CN_UNITS) {
      const unit = CN_UNITS[ch]!;
      if (unit === 10000) {
        section = (section + Math.max(digit, 0)) * unit;
        total += section;
        section = 0;
      } else {
        section += (digit < 0 ? 1 : digit) * unit;
      }
      digit = -1;
    } else {
      return null;
    }
  }
  if (digit >= 0) section += digit;
  return total + section;
}

const EN_NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
const EN_WORD_RE = new RegExp(`\\b(${Object.keys(EN_NUMBER_WORDS).join("|")})\\s+(${ASCII_UNIT_RE})\\b`, "giu");

function normaliseValue(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? String(n) : raw;
}

function normaliseUnit(raw: string | undefined): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase();
  return UNIT_MAP[key] ?? UNIT_MAP[raw] ?? key;
}

/** Extract every numeric token (Arabic, Chinese numerals, English number words + unit). */
export function extractNumericTokens(text: string): NumericToken[] {
  const source = toAsciiDigits(text);
  const tokens: NumericToken[] = [];
  for (const m of source.matchAll(ARABIC_RE)) {
    tokens.push({ value: normaliseValue(m[1]!), unit: normaliseUnit(m[2] ?? m[3]), raw: m[0].trim() });
  }
  for (const m of source.matchAll(CN_NUMERAL_RE)) {
    const numeral = m[1]!;
    const unit = m[2];
    if (m.index !== undefined && source[m.index - 1] === "第") continue; // ordinals (第一次)
    if (CN_IDIOMS.has(numeral) || CN_IDIOMS.has(numeral + (unit ?? "").slice(0, 1))) continue;
    const chars = [...numeral];
    if (chars.length === 1) {
      if (!unit) continue; // 四肢, 三餐, 十分…
      if (numeral === "一" && !ONE_UNITS.has(unit)) continue;
    }
    const value = parseChineseNumber(numeral);
    if (value === null) continue;
    tokens.push({ value: String(value), unit: normaliseUnit(unit), raw: m[0] });
  }
  for (const m of source.matchAll(EN_WORD_RE)) {
    tokens.push({ value: String(EN_NUMBER_WORDS[m[1]!.toLowerCase()]), unit: normaliseUnit(m[2]), raw: m[0] });
  }
  return tokens;
}

/* ------------------------------------------------------------------ */
/* Drug names                                                          */
/* ------------------------------------------------------------------ */

const EN_DRUG_SUFFIX = new RegExp(
  "\\b[a-z][a-z-]{2,}(?:" +
    "mab|tinib|pril|sartan|olol|statin|cillin|mycin|floxacin|azole|prazole|dipine|formin|gliptin|gliflozin|parin|xaban|gatran|cycline|navir|ciclovir|semide|thiazide|" +
    "lukast|tidine|setron|triptan|profen|fenac|zepam|zolam|codone|platin|rubicin|taxel|olone|asone|tropin|caine|" +
    "purinol|xostat|chicine|oxetine|faxine|opram|traline|pentin|gabalin|proxen|pramide|peridone|atadine|tirizine|phenamine|racetam|azepine|trigine|valproate|" +
    "peridol|tiapine|zapine|piclone|lactone|tanide|pamide|pamil|tiazem|sorbide|dronate|sulosin|steride|denafil|glutide|natide|clazide|piride|glitazone|" +
    "fibrate|timibe|triptyline|ipramine|thyroxine|tropium|(?<!choles)terol|butaline|phylline|cortisone|sonide|salazine|salamine|thioprine|trexate|toin|axone)\\b",
  "giu",
);
/** Cephalosporins: cefalexin, ceftriaxone, cefuroxime. */
const EN_DRUG_PREFIX = /\bce(?:f|ph)[a-z]{4,}\b/giu;
const EN_DRUGS = [
  "aspirin", "paracetamol", "acetaminophen", "insulin", "warfarin", "morphine", "adrenaline", "epinephrine", "nitroglycerin", "glyceryl trinitrate",
  "salbutamol", "albuterol", "prednisone", "vincristine", "digoxin", "amiodarone", "metformin", "levothyroxine", "heparin", "codeine", "tramadol",
  "fentanyl", "ketamine", "atropine", "naloxone", "ondansetron", "clopidogrel", "ticagrelor", "alteplase", "tenecteplase", "antibiotic", "antibiotics",
  "steroid", "steroids", "blood thinner", "blood thinners", "lithium", "co-codamol", "co-amoxiclav", "trimethoprim", "colchicine", "prasugrel",
  "thyroxine", "cortisone", "valproate",
];
/** Class suffixes of Chinese drug names, taken with the two characters before them (阿美替尼, 西格列汀). */
const ZH_DRUG_SUFFIXES = [
  "替尼", "单抗", "沙坦", "普利", "洛尔", "他汀", "地平", "西林", "霉素", "沙星", "拉唑", "康唑", "肝素", "新碱", "米松", "尼松", "格雷", "替普酶", "地尔",
  "利嗪", "奈德", "胺醇", "特罗", "列净", "列汀", "鲁肽", "瑞洛", "沙班", "加群", "瑞林",
];
/** Chinese drug names and distinctive parts of names (嘌醇 in 别嘌醇), matched as written. */
const ZH_DRUGS = [
  "胰岛素", "阿司匹林", "布洛芬", "对乙酰氨基酚", "吗啡", "肾上腺素", "硝酸甘油", "华法林", "二甲双胍", "地高辛", "胺碘酮", "阿托品", "抗生素", "头孢", "激素", "避孕药",
  "嘌醇", "水仙碱", "布司他", "甲状腺素", "优甲乐", "雷他定", "鲁司特", "茶碱", "塞米", "螺内酯", "山梨酯", "曲马多", "芬太尼", "西泮", "唑仑", "硝唑", "洛韦",
  "可的松", "西汀", "曲林", "酞普兰", "巴喷丁", "瑞巴林", "格列美脲", "格列齐特", "格列吡嗪", "阿卡波糖", "格列酮", "噻托溴铵",
];

function compact(text: string): string {
  return toAsciiDigits(text).toLowerCase().replace(/\s+/g, "");
}

/** Drug-like names mentioned in `text` (lower-cased; Chinese names with up to two preceding characters). */
export function extractDrugMentions(text: string, extraLexicon: readonly string[] = []): string[] {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  for (const m of lower.matchAll(EN_DRUG_SUFFIX)) out.add(m[0]);
  for (const m of lower.matchAll(EN_DRUG_PREFIX)) out.add(m[0]);
  for (const name of EN_DRUGS) if (new RegExp(`\\b${name}\\b`, "u").test(lower)) out.add(name);
  const flat = compact(text);
  for (const name of ZH_DRUGS) if (flat.includes(name)) out.add(name);
  for (const suffix of ZH_DRUG_SUFFIXES) {
    let from = 0;
    for (;;) {
      const i = flat.indexOf(suffix, from);
      if (i < 0) break;
      const start = Math.max(0, i - 2);
      const candidate = flat.slice(start, i + suffix.length);
      if (/^[一-龥]+$/u.test(candidate)) out.add(candidate);
      from = i + suffix.length;
    }
  }
  for (const name of extraLexicon) {
    const n = compact(name);
    if (n.length >= 3 && flat.includes(n)) out.add(n);
  }
  return [...out];
}

/* ------------------------------------------------------------------ */
/* Clinical acronyms                                                   */
/* ------------------------------------------------------------------ */

const ACRONYM_RE = /(?<![A-Za-z0-9])[A-Z][A-Z0-9]{1,7}(?![A-Za-z0-9])/g;
/** Everyday capitals a patient may say without them being clinical terms. */
const ACRONYM_STOPLIST = new Set(["OK", "TV", "AM", "PM", "ID", "UK", "US", "USA", "ER", "GP", "DR", "MR", "MRS", "MS", "NO", "OH", "SO", "MY", "IT", "IS", "AN", "AT", "TO", "IN", "ON", "OR", "BE", "DO", "GO", "HI", "UP", "WE", "ME", "HE", "A", "I"]);

/**
 * Upper-case clinical acronyms in `text` ("STEMI", "SMZL", "CT", "EGFR"):
 * diagnoses and test names a patient should only repeat from their own facts.
 */
export function extractAcronyms(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(ACRONYM_RE)) if (!ACRONYM_STOPLIST.has(m[0])) out.add(m[0]);
  return [...out];
}

/* ------------------------------------------------------------------ */
/* Diagnoses, history, dates and habits                                */
/* ------------------------------------------------------------------ */

/**
 * Conditions a patient might claim (history, family history, diagnoses).
 * Each must appear in the sources when the reply names it: a model may not
 * add "I had a stroke" or "my father died of a heart attack".
 */
const CONDITIONS_EN = [
  "stroke", "mini-stroke", "heart attack", "myocardial infarction", "heart failure", "heart disease", "angina", "diabetes", "diabetic", "cancer", "tumour", "tumor",
  "leukaemia", "leukemia", "lymphoma", "asthma", "copd", "emphysema", "bronchitis", "hypertension", "high blood pressure", "epilepsy", "tuberculosis",
  "hepatitis", "cirrhosis", "kidney failure", "kidney disease", "dialysis", "pneumonia", "sepsis", "embolism", "blood clot", "thrombosis", "dvt",
  "appendicitis", "pancreatitis", "ulcer", "dementia", "alzheimer", "parkinson", "hiv", "lupus", "arthritis", "thyroid", "anaemia", "anemia",
  "gallstones", "kidney stones", "aneurysm", "brain bleed", "haemorrhage", "hemorrhage", "anaphylaxis",
  "crohn", "colitis", "ulcerative colitis", "coeliac", "celiac", "irritable bowel", "diverticulitis", "gout", "migraine", "depression", "atrial fibrillation",
  "arrhythmia", "glaucoma", "cataract", "osteoporosis", "psoriasis", "eczema", "hay fever", "sleep apnoea", "sleep apnea", "hypothyroidism", "hyperthyroidism",
  "underactive thyroid", "overactive thyroid", "shingles", "meningitis", "hernia", "endometriosis", "flu", "influenza", "covid", "measles", "chickenpox",
  "whooping cough", "bronchiolitis", "croup", "kidney infection",
];
const CONDITIONS_ZH = [
  "中风", "脑梗", "脑卒中", "脑出血", "心梗", "心肌梗死", "心肌梗塞", "心脏病", "心衰", "心力衰竭", "冠心病", "心绞痛", "糖尿病", "癌", "肿瘤", "白血病", "淋巴瘤", "哮喘",
  "慢阻肺", "肺气肿", "支气管炎", "高血压", "癫痫", "结核", "肝炎", "肝硬化", "肾衰", "尿毒症", "透析", "肺炎", "败血症", "脓毒症", "栓塞", "血栓", "阑尾炎", "胰腺炎",
  "溃疡", "痴呆", "帕金森", "艾滋", "红斑狼疮", "关节炎", "甲亢", "甲减", "贫血", "胆结石", "肾结石", "动脉瘤", "过敏性休克",
  "克罗恩", "结肠炎", "乳糜泻", "肠易激", "憩室炎", "痛风", "偏头痛", "抑郁", "房颤", "心房颤动", "心律失常", "青光眼", "白内障", "骨质疏松", "银屑病", "牛皮癣",
  "湿疹", "花粉症", "过敏性鼻炎", "睡眠呼吸暂停", "甲状腺功能减退", "甲状腺功能亢进", "甲状腺功能低下", "带状疱疹", "脑膜炎", "疝气", "子宫内膜异位", "流感",
  "新冠", "麻疹", "水痘", "百日咳", "毛细支气管炎", "胆囊炎", "肾炎", "尿路感染",
];
/** Relative dates without digits ("last year", "去年"): a date claim like any other (ARCHITECTURE §4.2 step 4). */
const RELATIVE_DATES_EN = [
  "the day before yesterday", "yesterday", "last night", "last week", "last month", "last year", "last summer", "last winter", "a year ago", "years ago",
  "months ago", "weeks ago", "a few days ago", "since childhood", "as a child",
  "a week ago", "a month ago", "a fortnight ago", "days ago", "a couple of days ago", "a couple of weeks ago", "a few weeks ago", "the other day", "this morning",
  "this afternoon", "this evening", "tonight", "last weekend", "earlier today", "yesterday evening",
];
const RELATIVE_DATES_ZH = [
  "大前天", "前天", "昨天", "昨晚", "上周", "上星期", "上礼拜", "上个月", "去年", "前年", "几年前", "多年前", "几个月前", "小时候",
  "前几天", "几天前", "几周前", "几个星期前", "几个礼拜前", "半年前", "半个月前", "今天早上", "今早", "今天上午", "今天下午", "今天晚上", "今晚", "上周末",
  "上个周末", "上个礼拜", "上个星期", "前一阵", "前段时间",
];
/** How often a habit happens ("every night", "每天"): a claim like a date — "half a bottle every night" is not "a glass at the weekend". */
const FREQUENCIES_EN = ["every day", "every night", "every morning", "every evening", "every week", "every weekend", "every month", "daily", "nightly", "twice a day", "once a day", "twice a week", "once a week"];
const FREQUENCIES_ZH = ["每天", "天天", "每晚", "每天晚上", "每天早上", "每周", "每星期", "每个星期", "每个月", "每月"];
/** Month and weekday names (capitalised; "May" is too often the verb): a date claim. */
const CALENDAR_EN = /\b(?:January|February|March|April|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g;

/**
 * Terms that ground each other: a reply may say "甲减" when the fact says
 * "甲状腺功能减退", "a few days ago" for "the other day", "every day" for
 * "three litres a day". Matching is on the lexicon spelling.
 */
const CLAIM_SYNONYMS: readonly (readonly string[])[] = [
  ["甲减", "甲状腺功能减退", "甲状腺功能低下", "甲低"],
  ["甲亢", "甲状腺功能亢进"],
  ["心梗", "心肌梗死", "心肌梗塞"],
  ["脑梗", "脑梗死", "脑梗塞"],
  ["中风", "脑卒中"],
  ["慢阻肺", "慢性阻塞性肺疾病", "慢性阻塞性肺病"],
  ["心衰", "心力衰竭", "心功能衰竭"],
  ["肾衰", "肾功能衰竭", "肾衰竭"],
  ["高血压", "血压高"],
  ["房颤", "心房颤动"],
  ["heart attack", "myocardial infarction"],
  ["high blood pressure", "hypertension"],
  ["kidney failure", "renal failure"],
  ["mini-stroke", "tia", "transient ischaemic attack", "transient ischemic attack"],
  ["diabetes", "diabetic"],
  ["underactive thyroid", "hypothyroidism"],
  ["overactive thyroid", "hyperthyroidism"],
  ["blood clot", "thrombosis", "thrombus"],
  ["heart failure", "cardiac failure"],
  ["coeliac", "celiac"],
  ["sleep apnoea", "sleep apnea"],
  ["flu", "influenza"],
  ["leukaemia", "leukemia"],
  ["anaemia", "anemia"],
  ["tumour", "tumor"],
  ["haemorrhage", "hemorrhage"],
  ["昨晚", "昨天晚上", "昨天夜里"],
  ["今晚", "今天晚上", "晚上"],
  ["今早", "今天早上", "今天早晨", "今晨", "早上"],
  ["今天上午", "上午"],
  ["今天下午", "下午"],
  ["上周", "上星期", "上礼拜", "上个星期", "上个礼拜"],
  ["几天前", "前几天"],
  ["last night", "yesterday evening"],
  ["a few days ago", "a couple of days ago", "the other day", "days ago"],
  ["a week ago", "last week"],
  ["a month ago", "last month"],
  ["a year ago", "last year"],
  ["this morning", "in the morning"],
  ["this afternoon", "in the afternoon"],
  ["this evening", "in the evening", "tonight"],
  ["every day", "each day", "daily", "a day", "per day", "everyday"],
  ["every night", "each night", "nightly", "a night", "per night", "at night"],
  ["every morning", "each morning", "in the morning", "mornings"],
  ["every evening", "each evening", "in the evening", "evenings"],
  ["every week", "each week", "weekly", "a week", "per week"],
  ["every weekend", "at the weekend", "at weekends", "on weekends", "at the weekends", "on the weekend", "weekends"],
  ["every month", "each month", "monthly", "a month", "per month"],
  ["twice a day", "two times a day", "twice daily"],
  ["once a day", "once daily"],
  ["twice a week", "two times a week"],
  ["每天", "天天", "每日", "一天"],
  ["每晚", "每天晚上", "天天晚上", "每个晚上", "晚上"],
  ["每天早上", "每天早晨", "天天早上", "早上"],
  ["每周", "每星期", "每个星期", "每礼拜", "每个礼拜", "一周", "一个星期"],
  ["每月", "每个月", "一个月"],
];
const SYNONYMS_OF = new Map<string, readonly string[]>();
for (const group of CLAIM_SYNONYMS) for (const term of group) SYNONYMS_OF.set(term, [...(SYNONYMS_OF.get(term) ?? []), ...group]);

/** A lexicon term as a whole word: "hiv" ≁ "hives", "stroke" ≁ "stroked"; a plural "-s" is allowed ("strokes"). */
function termPattern(term: string): RegExp {
  return new RegExp(`(?<![a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}s?(?![a-z])`, "iu");
}

/** Conditions, relative dates, frequencies and calendar names in `text` (lexicon terms, then `extraTerms` of the case), lower-cased / compact. */
export function extractClaimTerms(text: string, extraTerms: readonly string[] = []): string[] {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  for (const term of [...CONDITIONS_EN, ...RELATIVE_DATES_EN, ...FREQUENCIES_EN]) if (termPattern(term).test(lower)) out.add(term);
  for (const m of text.matchAll(CALENDAR_EN)) out.add(m[0].toLowerCase());
  const flat = compact(text);
  for (const term of [...CONDITIONS_ZH, ...RELATIVE_DATES_ZH, ...FREQUENCIES_ZH]) if (flat.includes(term)) out.add(term);
  for (const term of extraTerms) {
    const n = compact(term);
    if (n.length >= 4 && flat.includes(n)) out.add(n);
  }
  return [...out];
}

/** True when `term` (a lexicon entry or compact case term), or a term that grounds it (`CLAIM_SYNONYMS`), is present in the source text. */
function termInSources(term: string, sourcesLower: string, sourcesFlat: string): boolean {
  return (SYNONYMS_OF.get(term) ?? [term]).some((t) => (/[一-龥]/u.test(t) ? sourcesFlat.includes(compact(t)) : termPattern(t).test(sourcesLower) || sourcesFlat.includes(compact(t))));
}

/* ------------------------------------------------------------------ */
/* Sides of the body                                                   */
/* ------------------------------------------------------------------ */

const SIDE_EN =
  /\b(left|right)(?:[\s-]+(?:hand(?:ed)?|sided?))?[\s-]+(?:(?:upper|lower|front|back|inner|outer|side\s+of\s+(?:the|my|his|her))\s+)?(?:hands?|arms?|forearms?|wrists?|elbows?|shoulders?|legs?|knees?|ankles?|foot|feet|toes?|fingers?|thumbs?|eyes?|ears?|side|chest|breast|flank|hip|groin|calf|thigh|buttock|lung|kidney|face|cheek|jaw|temple|neck|abdomen|tummy|belly|iliac|ventricle|pupil|half|lobe)\b/giu;
const SIDE_ZH = /(?<!左)([左右])(?!右)[上下前后中]?(?:侧|边|手|臂|胳膊|腿|肢|脚|足|眼|耳|肩|膝|髋|胸|腹|肋|腰|肺|叶|肾|乳|脸|面|颊|半身|心|髂|颈|背|臀|踝|腕|肘|指|趾|拇)/gu;

/** Sides of the body a text names ("left hand" → left, "右前臂" → right). */
export function extractSides(text: string): { side: "left" | "right"; raw: string }[] {
  const out: { side: "left" | "right"; raw: string }[] = [];
  for (const m of text.matchAll(SIDE_EN)) out.push({ side: m[1]!.toLowerCase() === "left" ? "left" : "right", raw: m[0] });
  for (const m of text.matchAll(SIDE_ZH)) out.push({ side: m[1] === "左" ? "left" : "right", raw: m[0] });
  return out;
}

const CONTENT_STOP = new Set(["about", "after", "again", "always", "around", "because", "before", "could", "doctor", "every", "never", "really", "should", "since", "still", "there", "these", "thing", "think", "those", "would", "maybe", "much", "just", "very", "that", "this", "with", "what", "when", "have", "been", "were", "they", "them", "then", "than", "from", "your", "yours", "will", "some", "only", "like", "know", "feel", "felt"]);

/**
 * Chinese function characters (pronouns, negation, particles, generic verbs and
 * adverbs): a 4-character window made mostly of these ("他从来没", "没有过敏")
 * is everyday phrasing, not a distinctive fact.
 */
const CJK_FUNCTION_CHARS = new Set([..."我你他她它们的了着过很太也都就还又再才只是在和与或跟及把被给对让叫向从到于为以而且但却并没有不无别吗呢吧啊呀哦嘛么这那哪个些种样什怎谁每各一二两几多少点下上里外中前后时候来去说讲想要会能可以得地知道清楚觉感像好真挺最更比较已经直曾"]);

/** Whether a 4-character CJK window carries content (at least 2 non-function characters). */
function distinctiveCjkWindow(window: string): boolean {
  let content = 0;
  for (const ch of window) if (!CJK_FUNCTION_CHARS.has(ch)) content++;
  return content >= 2;
}

/**
 * Distinctive phrases of a text: consecutive pairs of ≥ 4-letter content
 * words, and 4-character CJK windows taken inside each punctuation-delimited
 * run (never across "，" or a speaker label "（妻子）") that are not mostly
 * function characters.
 */
function distinctivePhrases(text: string): string[] {
  const words = text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4 && !CONTENT_STOP.has(w));
  const out: string[] = [];
  for (let i = 0; i + 1 < words.length; i++) out.push(`${words[i]} ${words[i + 1]}`);
  for (const run of text.split(/[^一-龥]+/u)) {
    for (let i = 0; i + 4 <= run.length; i++) {
      const window = run.slice(i, i + 4);
      if (distinctiveCjkWindow(window)) out.push(window);
    }
  }
  return out;
}

export interface VerifyOptions {
  /** Case-specific drug names (medication interventions, aliases). */
  drugLexicon?: readonly string[];
  /** Case-specific condition/diagnosis phrases (e.g. decision option texts) that must come from the sources. */
  conditionTerms?: readonly string[];
  /**
   * Answers of history facts the speaker has not revealed (nor been asked):
   * a reply sharing a distinctive phrase with one of them — absent from the
   * sources — tells an unasked fact.
   */
  unrevealed?: readonly string[];
  /** The learner's words the reply answers: a yes/no question there is checked against `answered`. */
  question?: string;
  /**
   * Answers of the facts the reply was voiced from (`[]`: none). With
   * `question`, a yes or no must agree with them, and may not be given when
   * there are none (`answer-polarity.ts`).
   */
  answered?: readonly string[];
}

/**
 * Check that every number/date/unit, drug name, named condition, date, habit
 * frequency and side of the body in `say` is supported by `sources`, and —
 * given `question` and `answered` — that a yes/no answer agrees with the
 * facts used. Pure and deterministic.
 */
export function verifyGrounding(say: string, sources: readonly string[], options: VerifyOptions = {}): GroundingCheck {
  const list = new ViolationList();
  collectGroundingViolations(say, sources, options, list);
  if (options.answered !== undefined) {
    const flip = options.question !== undefined ? polarityViolation(say, options.question, options.answered) : null;
    const denied = deniedDetailViolation(say, options.answered, sources);
    for (const detail of [flip, denied]) if (detail) list.add("polarity", detail);
  }
  return list.result();
}

function collectGroundingViolations(say: string, sources: readonly string[], options: VerifyOptions, list: ViolationList): void {
  const allowedText = sources.join("\n");
  const allowed = extractNumericTokens(allowedText);
  const values = new Set(allowed.map((t) => t.value));
  const pairs = new Set(allowed.map((t) => `${t.value}|${t.unit ?? ""}`));
  for (const token of extractNumericTokens(say)) {
    if (!values.has(token.value)) {
      list.add("number", `number "${token.raw}"`);
      continue;
    }
    if (token.unit && !pairs.has(`${token.value}|${token.unit}`) && !pairs.has(`${token.value}|`)) list.add("unit", `unit "${token.raw}"`);
  }
  const flatAllowed = compact(allowedText);
  for (const drug of extractDrugMentions(say, options.drugLexicon)) {
    if (!flatAllowed.includes(compact(drug))) list.add("drug", `drug "${drug}"`);
  }
  const allowedAcronyms = new Set(extractAcronyms(allowedText));
  for (const term of extractAcronyms(say)) {
    if (!allowedAcronyms.has(term) && !flatAllowed.includes(term.toLowerCase())) list.add("term", `term "${term}"`);
  }
  const lowerAllowed = allowedText.toLowerCase();
  for (const term of extractClaimTerms(say, options.conditionTerms)) {
    if (!termInSources(term, lowerAllowed, flatAllowed)) list.add("claim", `claim "${term}"`);
  }
  const allowedSides = new Set(extractSides(allowedText).map((x) => x.side));
  for (const { side, raw } of extractSides(say)) {
    if (!allowedSides.has(side)) list.add("side", `side "${raw}"`);
  }
  if (options.unrevealed && options.unrevealed.length > 0) {
    const sayPhrases = new Set(distinctivePhrases(say));
    const allowedPhrases = new Set(distinctivePhrases(allowedText));
    outer: for (const answer of options.unrevealed) {
      for (const phrase of distinctivePhrases(answer)) {
        if (sayPhrases.has(phrase) && !allowedPhrases.has(phrase)) {
          list.add("unasked", `unasked fact "${phrase}"`);
          break outer;
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Nonverbal cues                                                      */
/* ------------------------------------------------------------------ */

/** Longest nonverbal cue kept (a short stage direction, not a description of findings). */
export const MAX_NONVERBAL_CHARS = 120;

/**
 * Words naming examinable signs or measurements. A nonverbal cue is a
 * behaviour (winces, nods, looks at her husband); signs are found by
 * examining the patient, so a cue that names one is dropped.
 */
const SIGN_WORDS_EN =
  /\b(droop\w*|deviat\w*|asymmetr\w*|cyano\w*|blue\s+lips|wheez\w*|stridor|crackl\w*|jaundic\w*|icter\w*|yellow\w*|rash\w*|hives|urticari\w*|wheals?|pupil\w*|dilat\w*|constrict\w*|pallor|pale|mottl\w*|clammy|diaphore\w*|flush\w*|swell\w*|swollen|oedema\w*|edema\w*|bruis\w*|bleed\w*|haemorrh\w*|hemorrh\w*|vomit\w*|seiz\w*|convuls\w*|tremor\w*|twitch\w*|paraly\w*|weak(ness)?|slurr\w*|aphasi\w*|kussmaul|tachypn\w*|ketot\w*|ketone\w*|acetone|fruity|dehydrat\w*|dry\s+(lips|mouth|mucous)|sunken|guard\w*|rigid\w*|rebound|tender\w*|distend\w*|murmur\w*|gallop|bradycard\w*|tachycard\w*|arrhythm\w*|irregular\w*|monitor|saturation|sats|spo2|oxygen|blood\s+pressure|pulse|glucose|sugar|temperature|fever\w*|febrile)\b/i;
const SIGN_WORDS_ZH = /(下垂|歪斜|偏斜|凝视|紫绀|发绀|口唇发紫|喘鸣|哮鸣|啰音|黄疸|皮疹|荨麻疹|风团|瞳孔|散大|缩小|苍白|花斑|湿冷|大汗|潮红|肿胀|水肿|淤青|瘀斑|出血|呕吐|抽搐|震颤|瘫|无力|口齿不清|失语|深大呼吸|酮味|烂苹果|脱水|口唇干|口干|凹陷|肌紧张|反跳痛|压痛|腹胀|杂音|心律不齐|心跳不规|监护|血氧|血压|脉搏|血糖|体温|发热|发烧)/;

/** Nonverbal check context: the grounding sources plus the exam findings the learner has not elicited yet. */
export interface NonverbalCheckOptions extends VerifyOptions {
  /** Texts of exam findings not yet examined (any locale). */
  unexaminedFindings?: readonly string[];
}

function latinWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 5);
}

function sharesCjkRun(a: string, b: string, run = 3): boolean {
  const cjk = (s: string) => s.replace(/[^㐀-鿿]/g, "");
  const x = cjk(a);
  const y = cjk(b);
  if (x.length < run || y.length < run) return false;
  for (let i = 0; i + run <= x.length; i++) if (y.includes(x.slice(i, i + run))) return true;
  return false;
}

/**
 * Whether a voiced nonverbal cue may be shown (ARCHITECTURE §4.2 step 4):
 * short, no numbers, drugs or acronyms outside the sources (`verifyGrounding`),
 * no named sign or measurement, and nothing shared with a finding the
 * learner has not examined yet (a ≥ 5-letter word, or a 3-character CJK run).
 */
export function checkNonverbal(nonverbal: string, sources: readonly string[], options: NonverbalCheckOptions = {}): GroundingCheck {
  const list = new ViolationList();
  const text = nonverbal.trim();
  if (text.length > MAX_NONVERBAL_CHARS) list.add("length", "nonverbal too long");
  if (/[0-9０-９]/.test(text)) list.add("number", "number in nonverbal");
  const sign = SIGN_WORDS_EN.exec(text)?.[0] ?? SIGN_WORDS_ZH.exec(text)?.[0];
  if (sign) list.add("sign", `sign "${sign}" in nonverbal`);
  collectGroundingViolations(text, sources, options, list);
  const words = new Set(latinWords(text));
  for (const finding of options.unexaminedFindings ?? []) {
    const shared = latinWords(finding).find((w) => words.has(w));
    if (shared || sharesCjkRun(text, finding)) {
      list.add("finding", `nonverbal describes an unexamined finding${shared ? ` ("${shared}")` : ""}`);
      break;
    }
  }
  return list.result();
}
