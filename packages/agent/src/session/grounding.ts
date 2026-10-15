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
  const violations: string[] = [];
  const text = nonverbal.trim();
  if (text.length > MAX_NONVERBAL_CHARS) violations.push("nonverbal too long");
  if (/[0-9０-９]/.test(text)) violations.push("number in nonverbal");
  const sign = SIGN_WORDS_EN.exec(text)?.[0] ?? SIGN_WORDS_ZH.exec(text)?.[0];
  if (sign) violations.push(`sign "${sign}" in nonverbal`);
  const grounded = verifyGrounding(text, sources, options);
  violations.push(...grounded.violations);
  const words = new Set(latinWords(text));
  for (const finding of options.unexaminedFindings ?? []) {
    const shared = latinWords(finding).find((w) => words.has(w));
    if (shared || sharesCjkRun(text, finding)) {
      violations.push(`nonverbal describes an unexamined finding${shared ? ` ("${shared}")` : ""}`);
      break;
    }
  }
  return { ok: violations.length === 0, violations };
}
