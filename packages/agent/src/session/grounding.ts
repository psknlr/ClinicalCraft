/**
 * Grounding verifier for voiced NPC replies (ARCHITECTURE §4.2 step 4).
 *
 * Every number in a reply — integers, decimals, ranges, dates, numbers with
 * units (mg, mmol, cm, ×10⁹, %, 岁/天/周/月/年…), Chinese numerals
 * (三十年, 两周, 一百二十) and English number words with a unit ("two
 * weeks") — must appear in the allowed source texts (the answers of the facts
 * used, persona text, the learner's own words). A number that carries a unit
 * must appear with the same unit, or bare. Drug names (by common suffixes,
 * a small lexicon and the case's own medication names) and upper-case
 * clinical acronyms (diagnoses/tests such as "STEMI", "CT") must appear in
 * the sources. Anything else is a violation → the caller falls back to the
 * authored answer.
 */

export interface NumericToken {
  /** Normalised numeric value ("4", "79.1"). */
  value: string;
  /** Normalised unit (null when bare). */
  unit: string | null;
  raw: string;
}

export interface GroundingCheck {
  ok: boolean;
  violations: string[];
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
};

const ASCII_UNIT_RE = "(?:mg|mcg|μg|µg|kg|g|ml|mmol|μmol|µmol|umol|mol|cm|mm|m|%|bpm|mmhg|iu|units?|u|years?|yrs?|yr|days?|weeks?|wks?|wk|months?|hours?|hrs?|hr|h|minutes?|mins?|min|times?|tablets?|pills?|cycles?|°c)";
const CJK_UNIT_RE = "(?:个月|小时|分钟|星期|周期|疗程|毫克|毫升|厘米|公分|毫米|公斤|千克|微克|单位|百分|岁|天|日|周|月|年|次|回|片|粒|斤|克|升|米|度|号)";

const ARABIC_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)(?:\\s*[×xX*]\\s*10\\s*[⁰¹²³⁴⁵⁶⁷⁸⁹\\^\\d]+)?\\s*(?:(${CJK_UNIT_RE})|(${ASCII_UNIT_RE})(?![a-z]))?`,
  "giu",
);

const CN_DIGITS: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
const CN_NUMERAL_RE = new RegExp(`([零〇一二两三四五六七八九十百千万]+)(${CJK_UNIT_RE})?`, "gu");
/** Units that make a lone "一" a quantity (not "一直", "一下", "一个"…). */
const ONE_UNITS = new Set(["岁", "天", "日", "周", "星期", "个月", "年", "小时", "分钟", "毫克", "克", "毫升", "片", "粒", "斤", "公斤", "千克", "厘米", "周期", "疗程", "次"]);
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

const EN_DRUG_SUFFIX =
  /\b[a-z][a-z-]{2,}(?:mab|tinib|pril|sartan|olol|statin|cillin|mycin|floxacin|azole|prazole|dipine|formin|gliptin|gliflozin|parin|xaban|gatran|cycline|navir|ciclovir|semide|thiazide|lukast|tidine|setron|triptan|profen|fenac|zepam|zolam|codone|platin|rubicin|taxel|olone|asone|tropin|caine)\b/giu;
const EN_DRUGS = [
  "aspirin", "paracetamol", "acetaminophen", "insulin", "warfarin", "morphine", "adrenaline", "epinephrine", "nitroglycerin", "glyceryl trinitrate",
  "salbutamol", "albuterol", "prednisone", "vincristine", "digoxin", "amiodarone", "metformin", "levothyroxine", "heparin", "codeine", "tramadol",
  "fentanyl", "ketamine", "atropine", "naloxone", "ondansetron", "clopidogrel", "ticagrelor", "alteplase", "tenecteplase", "antibiotic", "antibiotics",
];
const ZH_DRUG_SUFFIXES = ["替尼", "单抗", "沙坦", "普利", "洛尔", "他汀", "地平", "西林", "霉素", "沙星", "拉唑", "康唑", "肝素", "新碱", "米松", "尼松", "格雷", "替普酶", "地尔"];
const ZH_DRUGS = ["胰岛素", "阿司匹林", "布洛芬", "对乙酰氨基酚", "吗啡", "肾上腺素", "硝酸甘油", "华法林", "二甲双胍", "地高辛", "胺碘酮", "阿托品", "抗生素"];

function compact(text: string): string {
  return toAsciiDigits(text).toLowerCase().replace(/\s+/g, "");
}

/** Drug-like names mentioned in `text` (lower-cased; Chinese names with up to two preceding characters). */
export function extractDrugMentions(text: string, extraLexicon: readonly string[] = []): string[] {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  for (const m of lower.matchAll(EN_DRUG_SUFFIX)) out.add(m[0]);
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
/* Verification                                                        */
/* ------------------------------------------------------------------ */

export interface VerifyOptions {
  /** Case-specific drug names (medication interventions, aliases). */
  drugLexicon?: readonly string[];
}

/**
 * Check that every number/date/unit and drug name in `say` is supported by
 * `sources`. Pure and deterministic.
 */
export function verifyGrounding(say: string, sources: readonly string[], options: VerifyOptions = {}): GroundingCheck {
  const violations: string[] = [];
  const allowedText = sources.join("\n");
  const allowed = extractNumericTokens(allowedText);
  const values = new Set(allowed.map((t) => t.value));
  const pairs = new Set(allowed.map((t) => `${t.value}|${t.unit ?? ""}`));
  for (const token of extractNumericTokens(say)) {
    if (!values.has(token.value)) {
      violations.push(`number "${token.raw}"`);
      continue;
    }
    if (token.unit && !pairs.has(`${token.value}|${token.unit}`) && !pairs.has(`${token.value}|`)) violations.push(`unit "${token.raw}"`);
  }
  const flatAllowed = compact(allowedText);
  for (const drug of extractDrugMentions(say, options.drugLexicon)) {
    if (!flatAllowed.includes(compact(drug))) violations.push(`drug "${drug}"`);
  }
  const allowedAcronyms = new Set(extractAcronyms(allowedText));
  for (const term of extractAcronyms(say)) {
    if (!allowedAcronyms.has(term) && !flatAllowed.includes(term.toLowerCase())) violations.push(`term "${term}"`);
  }
  return { ok: violations.length === 0, violations: [...new Set(violations)] };
}
