/**
 * Reading a written order's dose (docs/PROTOCOL.md §3.2): what the words of an order say about its dose — zh-CN and
 * en. Pure: no I/O, no clock.
 *
 * * **Numbers** in Arabic numerals ("0.5", "0,5", "5,000", "40万", "50k"), Chinese numerals ("五", "零点五", "两千",
 *   "八十万") and English words ("five", "zero point five", "five hundred", "half a", "a milligram"), with "个" between
 *   a number and its unit ("5个毫克", "四个单位"). A Chinese or English number is a number only when a unit follows it.
 * * **Units** in their usual spellings ("mcg", "microg", "µg", "gm", "I.U.", "mmols", "毫克"), also written onto the
 *   drug's name ("adrenaline5mg"); a dose per kg and per hour or minute however written ("0.1 units/kg/h",
 *   "0.1U/(kg·h)", "0.1 U·kg-1·h-1", "5.5 units hourly", "每小时5.5单位", "每千克体重40毫克"); "max 0.5 mg" after a dose is
 *   its cap — with no dose before it ("up to 5 mg", "最多5mg") it is the dose; a time is how long a dose is given over
 *   ("over 2 hours", "over six minutes", "infused for 60 min", "64.8 mg in 6 min", "60分钟内泵入", "6min内", "六分钟内",
 *   "6分钟泵完", "持续滴注1小时" — `DURATION_FORMS`); a later dose after "then" at a frequency ("then 75 mg daily",
 *   "随后90mg每日两次") is the regimen's maintenance (`then`); a daily total or a dose per m² ("20 g/day", "每日2g",
 *   "1.5 g/m2") is no single dose (`totals`).
 * * **Concentrations.** A volume is read as what it contains when the order states the strength — "0.5 mL of
 *   1 mg/mL", "1:1000 0.5 mL", "insulin 50 units in 50 mL at 5.5 mL/h" (5.5 units/h). A preparation ("50 units in
 *   50 mL", "50U+NS 50ml", "0.9% NaCl 1000 mL with KCl 40 mmol") is then not itself a dose; alone, it is the dose it
 *   holds ("adrenaline 5 mg in 5 mL" is 5 mg). A combination's strengths are its total ("piperacillin/tazobactam
 *   4 g/0.5 g" is 4.5 g), and so many tablets of a dose theirs ("90mg×2片" is 180 mg).
 * * **Not doses**: a body weight ("62千克", "62 kg"), a cannula's gauge where the words say so ("via the 18G", "18G
 *   cannula"), a lab value ("K+ 3.8 mmol/L", "血糖25mmol/L"), a diluent ("with 2.5 mL saline"), a vital sign, score,
 *   age, place or clock time ("HR 130", "GCS 14", "bed 3", "at 1430"), a count ("×2"). A number with no unit after a
 *   measurement that is also a medicine ("potassium 40 IV", "K+ 4") is a lab value or that medicine's dose
 *   (`labNumbers`: `checkOrder` asks when the order is for it).
 * * **What cannot be read** (`unclear`): a fraction ("1/2 mg", "½ mg"), a number broken by a Chinese full stop, a middle
 *   dot or a space ("0。5 mg", "0·5 mg", "0. 5 mg"), "5.000" or "50 000" (five, or five thousand?), zero, a unit with no
 *   number ("几毫克", "x mg"), a unit no preset is counted in ("200 mEq/h"), a count of tablets or ampoules ("一支"), a
 *   repeat that may be a total ("81 mg x 4"), "20G" alone (grams, or a gauge?), a range ("0.5–1 mg") and a number with
 *   no unit ("adrenaline 0.5 IM").
 *   The engine asks about these rather than guess (a range is compared end for end, `checkOrder`).
 */
import type { DoseQuantity, DoseRoute, DoseUnit, OrderedDose } from "../schema/common.js";

/** A dose a text states: an amount (or a range `amount`–`upTo`) with its unit. */
export interface DoseMention {
  amount: number;
  upTo?: number;
  unit: DoseUnit;
  /** A volume the order converts through the strength it states ("0.5 mL of 1 mg/mL" → 0.5 mg): the volume as written. */
  volume?: { amount: number; unit: DoseUnit };
  /**
   * Minutes the order gives it over ("64.8 mg over 60 min", "KCl 40 mmol in 1 L over 2 hours" — also the time given
   * after the volume it is made up in, "72 mg IV in 100 mL over 60 min"): as a rate, amount ÷ hours. Of several times
   * after one dose, the longest ("0.9 mg/kg over 60 min, over 1 min for its first 10%"); a dose written again in
   * brackets has the time of the copy ("5000 units (5000 IU) over 5 min"). When the order names the dose in parts — a
   * share ("10%"), "the rest", or a bolus and then its infusion —, a time after a part named after the dose is that
   * part's: its bolus's is not the dose's ("0.9 mg/kg, 10% as a bolus over 1 min"), its rest's is `restOver`; a bolus or
   * an infusion word alone names no part ("72 mg IV, bolus over 1 min" is the whole over 1 min).
   */
  over?: number;
  /**
   * Minutes the rest of it runs after its bolus, as the order names that rest ("7.2 mg bolus, the rest over 60 min",
   * "0.9 mg/kg, 10% bolus, the remaining 90% over 60 min", "其余60分钟内泵入"): how long the infusion of a dose given in
   * parts runs (`checkOrder` compares it with the preset's).
   */
  restOver?: number;
  /** The cap the order states with a dose per kg ("0.01 mg/kg, max 0.5 mg"): never more than this, absolute. */
  max?: { amount: number; unit: DoseUnit };
  /**
   * A later dose of the order, after "then" and at a frequency ("300 mg now, then 75 mg daily", "180mg负荷，随后90mg每日
   * 两次"): what it continues with, not this order's dose (`checkOrder` checks it only for more than the preset).
   */
  then?: true;
}

/**
 * Why a dose the words state cannot be read: a number that cannot be read, a range, no unit, a unit no preset is
 * counted in (mEq, ng, nmol…), a count of tablets, ampoules or puffs.
 */
export type UnclearDoseReason = "unreadable" | "range" | "no-unit" | "unit" | "count";

/** A dose the words state that cannot be read, and the words. */
export interface UnclearDose {
  reason: UnclearDoseReason;
  words: string;
}

/** A measurement that is also a medicine: a number after its name may be a lab value, or that medicine's dose. */
export type LabAnalyte = "potassium" | "sodium" | "glucose" | "lactate";

/**
 * A number with no unit after the name of a measurement that is also a medicine ("potassium 40 IV", "K+ 4", "血糖25"):
 * a lab value — or the medicine's dose with its unit left out. `checkOrder` asks about it when the order is for that
 * medicine.
 */
export interface LabNumber {
  analyte: LabAnalyte;
  words: string;
}

/**
 * A dose that is not a single dose: a daily total ("20 g/day", "每日2g", "50 mg/kg/day") or a dose per m² of body
 * surface. `checkOrder` compares a daily total that is the order's only dose (a once-daily dose) and asks about the rest.
 */
export interface DoseTotal {
  amount: number;
  upTo?: number;
  unit: DoseUnit;
  per: "day" | "m2";
  words: string;
}

/** What an order's words say about its dose (`readOrder`). */
export interface OrderReading {
  /** Every dose stated, in order (volumes converted through a stated strength; a preparation that is not the dose left out). */
  mentions: DoseMention[];
  /** The route stated; null when none, or more than one, is named. */
  route: DoseRoute | null;
  /** Every route the words name. */
  routes: DoseRoute[];
  /** The first dose stated that cannot be read; null when none. */
  unclear: UnclearDose | null;
  /** Every dose stated that cannot be read, in order. */
  unclears: UnclearDose[];
  /** Numbers with no unit after a measurement that is also a medicine ("potassium 40"), in order. */
  labNumbers: LabNumber[];
  /** Daily totals and doses per m², in order: never in `mentions`. */
  totals: DoseTotal[];
  /**
   * Where the doses, preparations and the words that only qualify them stand in `text.normalize("NFKC")`: [start, end)
   * — what `withoutDoses` removes.
   */
  spans: [number, number][];
}

const tidy = (x: number) => Math.round(x * 1e9) / 1e9;

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

/** A number in the text: where it stands and its value; `bad` when it cannot be read (fraction, "0。5", "5.000"). */
interface Num {
  start: number;
  end: number;
  value: number;
  bad?: true;
  /** Arabic numerals (a bare one may be a dose without its unit); words and Chinese numerals need a unit to count. */
  arabic?: true;
}

/** Arabic numerals: thousands with commas ("5,000"), a decimal point or a decimal comma ("0,5"). */
const ARABIC = /(?<![\d.])(?:[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?(?!\d)|\d+(?:[.,]\d+)?|\.\d+)/gu;
/** Five, or five thousand? A dot with exactly three digits after a non-zero integer part ("5.000", "12.500"). */
const AMBIGUOUS_THOUSANDS = /^[1-9]\d{0,2}\.\d{3}$/;
/** Thousands grouped by spaces ("50 000"; NFKC makes no-break and thin spaces plain ones): one number, or two? */
const SPACED_THOUSANDS = /^(?: \d{3})+(?![\d.,])/u;
/**
 * What breaks a number: a fraction ("1/2", "1⁄2" — NFKC of "½"), a Chinese full stop or enumeration comma, a middle or
 * katakana dot ("0·5"), a point then a space ("0. 5").
 */
const BROKEN = /^(?:\s*[/\u2044]\s*|[。、·・⋅∙]|\.[ \t])\d+(?:[.,]\d+)?/u;
/** Before a number that is the second half of another: a word's digits ("co2", "q4h", "x2"), a ratio, a fraction, a count. */
const NOT_ALONE = /[a-z:/×\u2044·・⋅∙。、]/u;
const CN_DIGIT: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
/** Chinese numerals — but not the 千 of 千克 (kilogram). */
const CHINESE = /(?:[零〇一二两三四五六七八九十百万]|千(?!克))+(?:点[零〇一二三四五六七八九]+)?|半/gu;

/** A Chinese numeral's value ("零点五" 0.5, "十五" 15, "两千" 2000, "八十万" 800000, "半" 0.5); null when malformed. */
function chineseValue(text: string): number | null {
  if (text === "半") return 0.5;
  const [whole, frac] = text.split("点") as [string, string | undefined];
  let total = 0;
  let section = 0;
  let digit: number | null = null;
  for (const ch of whole) {
    if (ch in CN_DIGIT) {
      // 零 holds a place ("一百零五"); two digits in a row ("五五", "一零") are no numeral
      if (CN_DIGIT[ch] === 0 && digit == null) continue;
      if (digit != null) return null;
      digit = CN_DIGIT[ch]!;
    } else if (ch in CN_UNIT) {
      section += (digit ?? 1) * CN_UNIT[ch]!;
      digit = null;
    } else if (ch === "万") {
      total += (section + (digit ?? 0)) * 10_000;
      section = 0;
      digit = null;
    }
  }
  total += section + (digit ?? 0);
  if (frac != null) total += Number(`0.${[...frac].map((ch) => CN_DIGIT[ch]).join("")}`);
  return Number.isFinite(total) ? total : null;
}

const EN_SMALL: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
/** "a" or "an" before a unit word is one ("a milligram"). */
const ARTICLE_UNIT = /^\s+(?:milligram|microgram|gram|millilit|unit|millimol|lit(?:re|er))/u;

/** English number words with their positions: "five", "zero point five", "one hundred and fifty", "half a", "a milligram". */
function englishNumbers(s: string): Num[] {
  const words = [...s.matchAll(/[a-z]+/gu)].map((m) => ({ w: m[0], start: m.index, end: m.index + m[0].length }));
  const joined = (i: number) => i > 0 && /^[\s-]+$/u.test(s.slice(words[i - 1]!.end, words[i]!.start));
  const out: Num[] = [];
  for (let i = 0; i < words.length; i++) {
    const first = words[i]!;
    if (first.w === "half") {
      // "half a milligram", "half mg"
      const next = words[i + 1];
      const end = next && (next.w === "a" || next.w === "an") && joined(i + 1) ? next.end : first.end;
      out.push({ start: first.start, end, value: 0.5 });
      if (end !== first.end) i++;
      continue;
    }
    if ((first.w === "a" || first.w === "an") && ARTICLE_UNIT.test(s.slice(first.end))) {
      out.push({ start: first.start, end: first.end, value: 1 });
      continue;
    }
    if (!(first.w in EN_SMALL) && first.w !== "point") continue;
    let total = 0;
    let current = 0;
    let decimals = "";
    let point = false;
    let j = i;
    let end = first.end;
    for (; j < words.length; j++) {
      const w = words[j]!.w;
      if (j > i && !joined(j)) break;
      if (point) {
        if (!(w in EN_SMALL) || EN_SMALL[w]! > 9) break;
        decimals += String(EN_SMALL[w]);
      } else if (w === "point") point = true;
      else if (w in EN_SMALL) current += EN_SMALL[w]!;
      else if (w === "hundred") current = (current || 1) * 100;
      else if (w === "thousand") {
        total += (current || 1) * 1000;
        current = 0;
      } else if (w === "and" && words[j + 1] && words[j + 1]!.w in EN_SMALL) continue;
      else break;
      end = words[j]!.end;
    }
    if (point && !decimals) continue;
    let value = total + current + (decimals ? Number(`0.${decimals}`) : 0);
    // "one and a half"
    const tail = s.slice(end).match(/^\s+and\s+a\s+half\b/u);
    if (tail) {
      value += 0.5;
      end += tail[0].length;
    }
    out.push({ start: first.start, end, value });
    i = Math.max(i, j - 1);
  }
  return out;
}

/** A number's value: commas between thousands dropped, a decimal comma read as a point. */
const arabicValue = (x: string) => Number(/^[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?$/u.test(x) ? x.replace(/,/gu, "") : x.replace(",", "."));

/**
 * Every number of a text, in order: Arabic numerals (a fraction "1/2" or "½", a number broken by "。", "、", "·" or a
 * space after its point, "5.000" and "50 000" are `bad`; a ratio's or a word's numbers — "1:1000", "co2", "q4h", "×2"
 * — are not numbers here), Chinese numerals, English words. A "万" or "千" after Arabic numerals multiplies ("40万"),
 * as does a "k" ("50k") — never the 千 of 千克 (kilogram).
 */
function numbers(s: string): Num[] {
  const out: Num[] = [];
  let consumed = 0;
  for (const m of s.matchAll(ARABIC)) {
    const start = m.index;
    if (start < consumed) continue;
    let end = start + m[0].length;
    const before = s[start - 1] ?? "";
    // a word's digits ("co2", "q4h", "x2"), a ratio's or a fraction's second number, a count, a broken number's half —
    // but a drug's name written onto its dose ("adrenaline5mg", "KCl400mmol/h") is a dose: a unit follows the digits;
    // and a colon is a ratio's or a clock's only after a number ("1:1000", "10:30"): after a word the number stands
    // alone ("剂量：5mg", "72mg：7.2mg静推" — NFKC writes "：" as ":"); so does one after an enumeration comma that
    // follows a word ("7.2mg静推、64.8mg…" — "0、5" is a broken number)
    const afterWord = (before === ":" || before === "、") && !/\d\s*$/u.test(s.slice(0, start - 1));
    if (NOT_ALONE.test(before) && !afterWord && !(/[a-z]/u.test(before) && before !== "x" && unitAt(s, end) != null)) continue;
    const after = s.slice(end);
    // a ratio ("1:1000", "10:30"): not an amount
    if (/^\s*:\s*\d/u.test(after)) continue;
    // a fraction, a number broken by a full stop, a dot or a space after its point: cannot be read
    const broken = after.match(BROKEN);
    if (broken) {
      out.push({ start, end: end + broken[0].length, value: NaN, bad: true, arabic: true });
      consumed = end + broken[0].length;
      continue;
    }
    // thousands grouped by spaces: "50 000" — or 50 and 000?
    const spaced = /^\d{1,3}$/u.test(m[0]) ? after.match(SPACED_THOUSANDS) : null;
    if (spaced) {
      out.push({ start, end: end + spaced[0].length, value: NaN, bad: true, arabic: true });
      consumed = end + spaced[0].length;
      continue;
    }
    let value = arabicValue(m[0]);
    const bad = AMBIGUOUS_THOUSANDS.test(m[0]);
    const scale = after.match(/^\s*(万|千(?!克))|^k(?![a-z])/u);
    if (scale) {
      value *= scale[1] === "万" ? 10_000 : 1000;
      end += scale[0].length;
    }
    out.push({ start, end, value, ...(bad ? { bad: true as const } : {}), arabic: true });
  }
  for (const m of s.matchAll(CHINESE)) {
    // a 万 / 千 after Arabic numerals belongs to them
    if (/\d\s*$/u.test(s.slice(0, m.index))) continue;
    const value = chineseValue(m[0]);
    if (value != null) out.push({ start: m.index, end: m.index + m[0].length, value });
  }
  out.push(...englishNumbers(s));
  return out.sort((a, b) => a.start - b.start);
}

/* ------------------------------------------------------------------ */
/* Units                                                               */
/* ------------------------------------------------------------------ */

/** Unit words, longest alternatives first; the quantity each means (litres become millilitres, decilitres too). */
const UNIT_WORDS: [RegExp, DoseQuantity | "L" | "dL"][] = [
  [/^(?:microgram(?:me)?s?|microgs?|mcgs?|μgs?|ug|微克)/u, "microgram"],
  [/^(?:milligram(?:me)?s?|mgs?|毫克)/u, "mg"],
  [/^(?:millilit(?:re|er)s?|mls?|cc|毫升)/u, "mL"],
  [/^(?:millimol(?:e)?s?|mmols?|毫摩尔|毫摩)/u, "mmol"],
  [/^(?:gram(?:me)?s?|gms?|g|克)/u, "g"],
  [/^(?:decilit(?:re|er)s?|dl)/u, "dL"],
  [/^(?:lit(?:re|er)s?|l|升)/u, "L"],
  [/^(?:units?|i\.u\.?|iu|u|国际单位|单位)/u, "unit"],
];
/**
 * Units no preset is counted in: milliequivalents (millimoles only for a monovalent ion), nanograms, micro-, nano- and
 * picomoles, kallikrein inhibitor units, milliunits.
 */
const FOREIGN_UNIT = /^(?:m?eqs?|milliequivalents?|nanograms?|ng|[nμup]mols?|kiu|miu|mu|毫当量|纳克|微摩尔)(?![a-z])/u;
/** A number of tablets, ampoules, puffs…: how much drug that is depends on a strength the order does not state. */
const COUNT_WORDS = /^(?:tablets?|tabs?|capsules?|caps?|ampoules?|ampules?|amps?|vials?|puffs?|sprays?|drops?|sachets?|syringes?|auto-?injectors?|pens?|片|粒|支|安瓿|喷|揿|袋|瓶)(?![a-z])/u;
const PER = String.raw`\s*(?:/|per\s+|每)\s*`;
const PER_KG = new RegExp(String.raw`^${PER}(?:kg|kilograms?|公斤|千克)(?![a-z])`, "u");
const PER_TIME = new RegExp(String.raw`^${PER}(h|hrs?|hours?|小时|min|mins|minutes?|分钟)(?![a-z])`, "u");
/** "U/(kg·h)", "μg/(kg·min)": per kg and per hour or minute in one bracket. */
const PER_KG_TIME = /^\s*\/\s*\(\s*(?:kg|公斤|千克)\s*[·・⋅∙.*×x]?\s*(h|hrs?|hours?|小时|min|mins|minutes?|分钟|分)\s*\)/u;
/** "U·kg-1·h-1", "mg·kg-1": per kg (then per hour or minute) as negative powers (NFKC writes ⁻¹ as −1). */
const DOT_KG = /^\s*[·・⋅∙.*]\s*kg\s*[-−‐]\s*1(?!\d)/u;
const DOT_TIME = /^\s*[·・⋅∙.*]\s*(h|min)\s*[-−‐]\s*1(?!\d)/u;
/** A rate in words after the unit: "5.5 units hourly", "an hour" ("every hour" is a repeated dose, not a rate). */
const RATE_WORDS = /^\s*(?:hourly|an?\s+(hour|minute))(?![a-z])/u;
/** A dose per body-surface area (mg/m²) or a daily total (50 mg/kg/day — but "500 mg每日1次" is 500 mg once a day). */
const PER_AREA = new RegExp(String.raw`^${PER}m2(?![a-z])`, "u");
const PER_DAY = /^\s*(?:\/|per\s+)\s*(?:d|days?|天|日)(?![a-z])/u;
/** Per volume: a strength ("1 mg/mL", "40 mmol/L", "50 units/50 mL"). */
const PER_VOLUME = /^\s*(?:\/|per\s+|每)\s*(\d+(?:[.,]\d+)?)?\s*(ml|毫升|l|升|dl)(?![a-z])/u;

/** The unit right after a number (an optional "个" between), with its per-kg and per-time parts. */
interface UnitHere {
  quantity: DoseQuantity;
  /** Multiplier to the quantity (litres → mL ×1000). */
  scale: number;
  perKg: boolean;
  time: "" | "/h" | "/min";
  /** Where the unit word starts in the text, and the word as matched (lower case). */
  at: number;
  word: string;
  /** End of the unit (and its per parts) in the text. */
  end: number;
  /** A strength: so much per this many mL. */
  perMl?: number;
  /** The strength's volume was a number ("50 units/50 mL"): so much in so many mL — also a preparation. */
  perCount?: true;
  /** Per decilitre: a laboratory value (glucose 450 mg/dL), never a drug's strength. */
  perDl?: true;
  /** A gas flow in litres per minute: no dose. */
  notDose?: true;
  /** A daily total ("50 mg/kg/day") or a dose per m²: not a single dose (`DoseTotal`). */
  per?: "day" | "m2";
}

/** Where the word after a number starts: past spaces and a "个". */
const leadAt = (s: string, pos: number) => pos + s.slice(pos).match(/^\s*(?:个\s*)?/u)![0].length;

function unitAt(s: string, pos: number): UnitHere | null {
  const at = leadAt(s, pos);
  const rest = s.slice(at);
  for (const [pattern, quantity] of UNIT_WORDS) {
    const m = pattern.exec(rest);
    if (!m) continue;
    let length = m[0].length;
    // an English unit is a whole word ("5 gtt" is no gram, "5 units" no "u")
    if (/[a-z]/u.test(rest[length] ?? "")) continue;
    // a decilitre is only ever a strength's denominator
    if (quantity === "dL") return null;
    const unit: UnitHere = { quantity: quantity === "L" ? "mL" : quantity, scale: quantity === "L" ? 1000 : 1, perKg: false, time: "", at, word: m[0], end: 0 };
    const perVolume = PER_VOLUME.exec(rest.slice(length));
    if (perVolume) {
      const n = perVolume[1] != null ? arabicValue(perVolume[1]) : 1;
      const ml = n * (perVolume[2] === "l" || perVolume[2] === "升" ? 1000 : perVolume[2] === "dl" ? 100 : 1);
      return { ...unit, perMl: ml, ...(perVolume[1] != null ? { perCount: true as const } : {}), ...(perVolume[2] === "dl" ? { perDl: true as const } : {}), end: at + length + perVolume[0].length };
    }
    const both = PER_KG_TIME.exec(rest.slice(length));
    if (both) {
      unit.perKg = true;
      unit.time = /^(?:h|hr|hrs|hour|hours|小时)$/u.test(both[1]!) ? "/h" : "/min";
      length += both[0].length;
    } else {
      const kg = PER_KG.exec(rest.slice(length)) ?? DOT_KG.exec(rest.slice(length));
      if (kg) {
        unit.perKg = true;
        length += kg[0].length;
      }
      const time = PER_TIME.exec(rest.slice(length)) ?? DOT_TIME.exec(rest.slice(length));
      if (time) {
        unit.time = /^(?:h|hr|hrs|hour|hours|小时)$/u.test(time[1]!) ? "/h" : "/min";
        length += time[0].length;
      } else {
        const words = RATE_WORDS.exec(rest.slice(length));
        if (words) {
          unit.time = words[1] === "minute" ? "/min" : "/h";
          length += words[0].length;
        }
      }
    }
    // a dose per area or a daily total (with what says so); litres per minute is a gas flow (oxygen 15 L/min), not a dose
    const area = PER_AREA.exec(rest.slice(length));
    const day = area ? null : PER_DAY.exec(rest.slice(length));
    if (area || day) {
      unit.per = area ? "m2" : "day";
      length += (area ?? day)![0].length;
    } else if (quantity === "L" && unit.time === "/min") unit.notDose = true;
    unit.end = at + length;
    return unit;
  }
  return null;
}

const unitOf = (u: Pick<UnitHere, "quantity" | "perKg" | "time">): DoseUnit => `${u.quantity}${u.perKg ? "/kg" : ""}${u.time}` as DoseUnit;

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

/** A range between two numbers ("0.5–1", "2 to 3", "2至3"). */
const RANGE_SEP = /^\s*(?:-|–|—|~|～|to|至|到)\s*/u;
/** What a drug is made up in, by name (`DILUENT` without its strength). */
const DILUENT_NAME = String.raw`(?:normal\s+saline|saline|sodium\s+chloride|nacl|n\.s\.|ns|gs|glucose|dextrose|water(?:\s+for\s+injections?)?|wfi|diluent|生理盐水|氯化钠|盐水|注射用水|葡萄糖|稀释液)`;
/** Diluents (after an optional 0.9 %, 5 % or 10 %): the vehicle a drug is made up in, never itself the dose. */
const DILUENT = String.raw`(?:(?:0\.9|5|10)\s*%\s*)?${DILUENT_NAME}`;
/**
 * What joins a preparation's content to its volume ("50 units in 50 mL", "50U+NS 50ml", "加入生理盐水50毫升"), also
 * after the route ("72 mg IV in 100 mL": a time after the volume is the drug's).
 */
const PREP_JOIN = new RegExp(
  String.raw`^\s*(?:(?:i\.?v\.?|intravenous(?:ly)?|静脉)\s*)?(?:made up to|made up with|up to|into|in|\+|加入|加至|溶于|溶入|配成|配至|稀释至|稀释到|稀释于|加|兑)\s*(?:${DILUENT}\s*)?(?:(?:至|到|to)\s*)?`,
  "u",
);
/** A diluent named after a preparation's volume ("50 units in 50 mL normal saline"). */
const DILUENT_AFTER = new RegExp(String.raw`^\s*(?:(?:of|with|in)\s+|用|以)?${DILUENT}(?![a-z])`, "u");
/** A diluent named right before a bag's volume ("0.9% NaCl 1000 mL with KCl 40 mmol", "生理盐水1000ml+氯化钾40mmol"). */
const DILUENT_LEADS = new RegExp(String.raw`${DILUENT}(?:\s*(?:0\.9|5|10)\s*%)?\s*$`, "u");
/** Before a volume that is a diluent: "with 2.5 mL saline", "plus 2 mL water". */
const DILUENT_BEFORE = /(?:with|plus|\+|加入?|用|兑)\s*$/u;
/** What joins a volume to what it holds ("0.9% NaCl 1000 mL with KCl 40 mmol", "NS 500ml+氯化钾10mmol"). */
const HOLDS_JOIN = /^(\s*(?:with|containing|含|加|\+)\s*)(?:[a-z\u4e00-\u9fff]+\s*)?/u;
/** A strength written as a ratio: 1:1000 or 1/1000 (1 mg/mL), 1 in 10,000 (0.1 mg/mL). */
const RATIO = /(?<![\d.])1\s*(?::|\/|in)\s*([1-9]\d{0,2}(?:[, ]\d{3})+|[1-9]\d{2,})(?![\d.]|\s*(?:ml|毫升|mg|毫克))/gu;
/** Unit words that only ever mean a unit (a number should stand before them). */
const CHINESE_UNIT_ALONE = /毫克|微克|毫升|毫摩尔|国际单位|个单位/gu;
/** An English unit after a placeholder instead of a number ("x mg", "? mg", "some mg"). */
const PLACEHOLDER_UNIT = /(?:^|[\s(])(?:x|y|n|\?|some|few|several)\s*(?:mg|mcg|μg|ug|micrograms?|milligrams?|ml|mmol|units?)(?![a-z])/gu;
/** After a number with no unit: what lets it stand for a dose (the end, punctuation, a route, "now"). */
const BARE_AFTER =
  /^\s*(?:$|[,，;；)）]|\.(?!\d)|(?:i\.?m|i\.?v|im|iv|io|sc|sq|po|sl|pr|inh|neb)\b|(?:intramuscular|intravenous|subcutaneous|oral|now|stat|immediately)\b|肌注|肌内|静推|静注|静滴|静脉|皮下|口服|舌下|雾化|吸入|立即|马上|立刻)/u;
/**
 * Before a number that is not a dose: a place or a count ("bed 3", "resus 2", "3号床", "第2", "×2"), a vital sign or a
 * score ("HR 130", "sats are 88", "GCS 14", "T: 38.5", "心率130"), a laboratory value that is no medicine ("Hb 70",
 * "pH 7.1"), an age ("she is 30"). A single letter counts only with a colon or an equals sign after it ("P: 120"):
 * "vitamin K 10", "factor X 5" are doses with their unit left out.
 */
const BARE_BEFORE = new RegExp(
  String.raw`(?:(?<![a-z])(?:(?:bed|room|bay|cubicle|resus(?:citation)?(?:\s+(?:room|bay))?|trolley|no\.?|number|hr|heart\s+rate|pulse(?:\s+rate)?|pr|bp|sbp|dbp|map|spo2|sp02|sats?|saturations?|rr|resp(?:iratory)?\s+rate|gcs|temp(?:erature)?|news2?|score|pain(?:\s+score)?|vas|nrs|aged?|she\s+is|he\s+is|ph|hb)(?:\s+(?:are|is|was|of|now))?\s*[:=：]?|[tp]\s*[:=：])|#|第|床|室|号|心率|脉搏|血压|收缩压|舒张压|血氧|饱和度|呼吸|体温|评分|年龄|岁|[×*])\s*$`,
  "u",
);
/**
 * Before a number: the name of a measurement that is also a medicine ("potassium 3.2", "K+ 4", "K: 3.8", "glucose 25",
 * "血钾3.2", "血糖25") — a lab value, or that medicine's dose with its unit left out (`LabNumber`).
 */
const ANALYTE_BEFORE: readonly [LabAnalyte, RegExp][] = [
  ["potassium", /(?:(?<![a-z])(?:k\+|k(?=\s*[:=：])|potassium)(?:\s+(?:level|is|was|of|now))*|血钾|钾离子)\s*[:=：为是]?\s*$/u],
  ["sodium", /(?:(?<![a-z])(?:na\+|na(?=\s*[:=：])|sodium)(?:\s+(?:level|is|was|of|now))*|血钠|钠离子)\s*[:=：为是]?\s*$/u],
  ["glucose", /(?:(?<![a-z])(?:glucose|blood\s+(?:glucose|sugar)|sugar|bg|cbg|bm)(?:\s+(?:level|is|was|of|now))*|血糖)\s*[:=：为是]?\s*$/u],
  ["lactate", /(?:(?<![a-z])lactate(?:\s+(?:level|is|was|of|now))*|乳酸)\s*[:=：为是]?\s*$/u],
];
const analyteBefore = (before: string): LabAnalyte | null => ANALYTE_BEFORE.find(([, re]) => re.test(before))?.[0] ?? null;
/** Before a clock time: "at 1430", "by 0900" (three or four digits), or a time with its word after ("at 3 pm", "3点"). */
const CLOCK_BEFORE = /(?<![a-z])(?:at|@|by|until|from)\s*$/u;
const CLOCK_AFTER = /^\s*(?:am|pm|o'?clock|点|时)(?![a-z])/u;
/** Before a dose: so much per kg (and per hour or minute) in Chinese word order ("每千克体重40毫克", "按每千克体重每小时0.1单位"). */
const PREFIX_PER_KG = /每\s*(?:千克|公斤|kg)\s*(?:体重)?\s*(?:每\s*(小时|分钟|h|min)\s*)?$/u;
/** Before a dose: so much per hour or minute ("每小时5.5单位"), or a day's total ("每日2g"). */
const PREFIX_PER_TIME = /每\s*(小时|分钟|h|min)\s*$/u;
const PREFIX_PER_DAY = /每\s*(?:日|天)\s*$/u;
/** Before a dose: its cap ("max 0.5 mg", "maximum of 25 mg", "(max. 90 mg)", "not exceeding", "最大25mg", "不超过"). */
const CAP_BEFORE =
  /(?:max(?:imum)?\.?(?:\s+(?:of|dose(?:\s+of)?))?|up\s+to(?:\s+a\s+max(?:imum)?(?:\s+of)?)?|not\s+(?:to\s+)?exceed(?:ing)?|no\s+more\s+than|最大(?:剂量|量)?(?:为|是)?|不超过|不得超过|最多|上限(?:为)?|极量(?:为)?)\s*[:：]?\s*[~≈约]?\s*$/u;
/**
 * A cannula's gauge (14–27), not grams — only with words that say so: "18G cannula", "16 g venflon", "18G留置针", "via
 * the 18 g", "IV access: 18G". "20G" alone is asked about (grams, or a gauge?).
 */
const GAUGE_AFTER = /^\s*(?:gauge|cannulae?|cannulas|venflons?|needles?|catheters?|access|lines?|留置针|套管针|针头)/u;
const GAUGE_BEFORE = /(?:via|through|thru|insert(?:ed)?|place(?:d)?|cannulae?|cannulas|venflons?|access|lines?|经|置入|留置针|套管针)\s*(?:an?\s+|the\s+)?[:：]?\s*$/u;
const GAUGES = new Set([14, 16, 18, 20, 21, 22, 23, 24, 25, 26, 27]);
/** A measurement per volume after a laboratory name ("K+ 3.8 mmol/L", "glucose 25 mmol/L", "血糖25mmol/L"): not a strength. */
const LAB_BEFORE =
  /(?:(?<![a-z])(?:k\+?|potassium|na\+?|sodium|glucose|blood\s+(?:glucose|sugar)|sugar|bg|cbg|bm|lactate|bicarb(?:onate)?|hco3-?|creat(?:inine)?|urea|hb|ha?emoglobin|ketones?|bhb|ph)(?:\s+level)?(?:\s+(?:is|of|was))?|血钾|血钠|血糖|血酮|乳酸|肌酐|尿素|血红蛋白|酮体|钾离子|钠离子)\s*[:=：为是]?\s*$/u;
/** After a dose: "×2片", "x 4 tablets" — so many tablets of it; a bare "x 4" — four doses, or four tablets at once? */
const TIMES_AFTER = /^\s*(?:片|粒|支|tablets?|tabs?)?\s*[x×*]\s*(\d+)\s*(片|粒|支|tablets?|tabs?|capsules?|caps?)?(?![a-z\d.])/u;
/** Before a dose: "5 x 0.1 mg", "2片×90mg" — so many of it. */
const TIMES_BEFORE = /\d+\s*(片|粒|支|tablets?|tabs?)?\s*(?:of\s+)?[x×*]\s*$/u;
/** After a dose: a second strength ("4 g/0.5 g"; "875/125 mg" is read as a fraction). */
const COMBINATION = /^\s*\/\s*(\d+(?:[.,]\d+)?)/u;
/** A combination product's name before its strengths ("piperacillin/tazobactam", "piperacillin–tazobactam", "哌拉西林/他唑巴坦"). */
const COMBINATION_NAME = /[a-z\u4e00-\u9fff]\s*[/+–-]\s*[a-z\u4e00-\u9fff]/u;
/** What moves an order on to a later dose: "then", "followed by", "随后", "之后"… */
const THEN = /(?<![a-z])(?:then|followed\s+by|thereafter|after\s+that|subsequently)(?![a-z])|随后|之后|然后|接着|继以|续以|以后/u;
/**
 * A frequency: "daily", "twice daily", "bd", "tds", "every 20 minutes", "q4h", "prn", "每日两次", "每8小时", "一日三次",
 * "必要时" — a dose at one is a regimen's maintenance or repeat, not the dose given now.
 */
const FREQUENCY =
  /(?<![a-z])(?:(?:once|twice|three\s+times|four\s+times)\s+(?:a\s+)?(?:day|daily)|daily|nightly|b\.?i?\.?d\.?|t\.?[id]\.?[sd]\.?|q\.?[id]\.?[sd]\.?|nocte|mane|o\.d\.|every\s+(?:\d+(?:[.,]\d+)?\s*(?:(?:-|–|to)\s*\d+\s*)?)?(?:h|hrs?|hours?|min(?:ute)?s?|days?|morning|evening|night)|q\s*\d+\s*(?:h|hrs?|min)|prn|p\.r\.n\.|as\s+(?:needed|required)|if\s+(?:needed|required))(?![a-z])|每\s*(?:日|天|晚|早|\d+\s*(?:小时|分钟|天|日)|[一二两三四五六七八九十]+\s*(?:小时|分钟|天|日))|(?:一日|一天|日)\s*[一二两三四\d]\s*次|必要时|按需/u;
/** A time's number in English words ("six", "sixty", "one hundred and twenty"). */
const EN_NUMBER_WORD = String.raw`(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)`;
/** A time's number in English: numerals, "an", "half an", words. */
const EN_TIME_NUMBER = String.raw`(\d+(?:[.,]\d+)?|half\s+an?|an?|${EN_NUMBER_WORD}(?:[\s-]+(?:and\s+)?${EN_NUMBER_WORD})*)`;
const EN_TIME_UNIT = String.raw`(min(?:ute)?s?|h(?:ou)?rs?|hours?|h)(?![a-z])`;
/** A time's number in Chinese text: numerals, Chinese numerals ("六", "六十", "两"), "半" (half an hour). */
const ZH_TIME_NUMBER = String.raw`(\d+(?:\.\d+)?|[零〇一二两三四五六七八九十百]+(?:点[零〇一二三四五六七八九]+)?|半)`;
const ZH_TIME_UNIT = String.raw`(?:个\s*)?(分钟|小时|min(?:ute)?s?|h(?:ou)?rs?|hours?|h(?![a-z]))`;
/**
 * The forms of how long a dose is given over (`over`, `restOver`; zh-CN and en, numbers in numerals or words), each
 * with its number and unit as its first two groups and whether it is an infusion's own time ("1小时静滴"):
 * - "over 60 min", "over 2 hours", "over an hour", "over half an hour", "over six minutes";
 * - "infused for 60 minutes", "infusion for 1 h", "run for 2 hours" — "for" only after an infusion's word ("for 3 days"
 *   is how long a course lasts); "as a 60-minute infusion", "6 min infusion";
 * - "64.8 mg in 6 min", "IV in 60 min" — "in" only after a dose, a route or an infusion's word ("repeat in 5 min",
 *   "recheck in 1 hour" say when, not how long);
 * - "在60分钟内", "60分钟内泵入", "60分钟泵入", "20分钟以上", "6分钟泵完", "6min内", "六十分钟内", "半小时内", "1个小时内"
 *   (never "每60分钟", every 60 minutes, nor "第1小时");
 * - "持续滴注6分钟", "泵入1小时", "静滴1h", "历时60分钟" — after an infusion's word (never "静滴1小时后", after an hour).
 */
const DURATION_FORMS: readonly { re: RegExp; infusion: boolean; before?: RegExp; zh?: true }[] = [
  { re: new RegExp(String.raw`\bover\s+${EN_TIME_NUMBER}\s*${EN_TIME_UNIT}`, "dgu"), infusion: false },
  { re: new RegExp(String.raw`\b(?:infus(?:e|ed|es|ion|ing)|run(?:ning)?|drip)\s+(?:(?:iv|i\.v\.?|intravenously)\s+)?for\s+${EN_TIME_NUMBER}\s*${EN_TIME_UNIT}`, "dgu"), infusion: true },
  { re: new RegExp(String.raw`\b${EN_TIME_NUMBER}[\s-]*${EN_TIME_UNIT}\s+(?:(?:iv|i\.v\.?|intravenous)\s+)?(?:infusion|drip)\b`, "dgu"), infusion: true },
  {
    re: new RegExp(String.raw`\bin\s+${EN_TIME_NUMBER}\s*${EN_TIME_UNIT}`, "dgu"),
    infusion: false,
    before: /(?:\d\s*(?:mg|mcg|μg|ug|micrograms?|milligrams?|g|grams?|units?|u|iu|mmols?|millimoles?|ml|l)|(?<![a-z])(?:iv|i\.v\.?|intravenous(?:ly)?|infus(?:e|ed|es|ion|ing)|bolus|push(?:ed)?|given))\s*$/u,
  },
  { re: new RegExp(String.raw`(?<!每\s*|第\s*)(?:在|于)?\s*${ZH_TIME_NUMBER}\s*${ZH_TIME_UNIT}\s*(?:内|以上|以内|泵入|静滴|滴注|输注|输入|静脉泵入|静脉滴注|泵完|滴完|输完)`, "dgu"), infusion: false, zh: true },
  { re: new RegExp(String.raw`(?:(?:持续)?(?:静脉)?(?:泵入|静滴|滴注|输注|输入|泵注)|历时|持续)\s*(?:时间\s*)?${ZH_TIME_NUMBER}\s*${ZH_TIME_UNIT}(?!\s*(?:后|以后|之后))`, "dgu"), infusion: true },
];
/**
 * A share of a dose: a whole percentage ("10%", "90%") followed by how or when it is given — never a strength: one
 * with decimals ("0.9%"), one right after a volume or a diluent ("in 100 mL 0.9%", "NaCl 0.9%", "1000ml 5%"), or one
 * followed by what it is the strength of ("10%氯化钾", "5% dextrose": `SHARE_AFTER` fails).
 */
const SHARE = /(?<!\d|\d[.,])([1-9]\d?)\s*%/gu;
const STRENGTH_BEFORE = new RegExp(String.raw`(?:\d\s*(?:mls?|毫升|l|升|cc)|(?<![a-z])${DILUENT_NAME})\s*$`, "u");
const SHARE_AFTER =
  /^\s*(?:$|[,，;；:：)）(（\]、。.]|\d|(?:bolus|push|stat|as|given|administered|of|over|iv|i\.v|intravenous(?:ly)?|by|infus[a-z]*|then|and|via|rapid(?:ly)?|immediately|now)(?![a-z])|静推|静注|静脉推注|静脉注射|推注|快速|于|在|的|剂量|药量|量|泵入|静滴|静脉滴注|静脉泵入|滴注|输注|持续|立即|先|然后|随后)/u;
/** Words for the rest of a dose, after its bolus ("the rest", "the remaining 90%", "其余", "剩余"). */
const REST_WORDS = /(?<![a-z])(?:rest|remainder|remaining)(?![a-z])|其余|剩余|余下|余量/gu;
/** Before a share that is the rest of the dose ("the remaining 90%", "剩余90%"). */
const REST_BEFORE = /(?:(?<![a-z])(?:rest|remainder|remaining)(?:\s+of\s+(?:the\s+|it\s*)?(?:dose)?)?|其余|剩余|余下|余)\s*[(（]?\s*$/u;
/**
 * A bolus ("bolus", "push", "静推") or an infusion ("infusion", "泵入") — a part of the dose when its clause names no dose
 * before it, and the order names the dose in parts (`partsOf`).
 */
const BOLUS_WORDS = /(?<![a-z])(?:bolus|push)(?![a-z])|静推|静注|推注/gu;
const INFUSION_WORDS = /(?<![a-z])(?:infusion|infuse[ds]?|infusing)(?![a-z])|泵入|静滴|滴注|输注/gu;
/** A Chinese time that is an infusion's: "60分钟内泵入", "1小时静滴", "6分钟泵完", "6分钟内持续泵完". */
const ZH_INFUSION = /(?:泵入|静滴|滴注|输注|输入|泵完|滴完|输完)$/u;
const ZH_INFUSION_AFTER = /^\s*(?:持续)?(?:静脉)?(?:泵入|静滴|滴注|输注|输入|泵完|滴完)/u;
/**
 * Between a dose and the same dose written again: a bracket, "=", "i.e." or "即", after the route at most ("5000 units
 * (5000 IU)", "0.9 mg/kg IV (72 mg)", "0.9mg/kg（即72mg）").
 */
const RESTATES =
  /^\s*(?:(?:i\.?v|i\.?m|s\.?c|p\.?o|intravenous(?:ly)?|intramuscular(?:ly)?|静脉|静推|肌注|皮下|口服)\.?\s*)?(?:[(（]\s*(?:(?:i\.e\.|即|total(?:\s+of)?|总量|共|约|approx(?:\.|imately)?|=|≈)\s*[:：,]?\s*)?|(?:=|≈|i\.e\.|即|相当于)\s*)$/u;
/** Where an order's clause starts: after a comma, a colon, a bracket or "、", "then", "with", "其中", "随后"… */
const CLAUSE_START = /[,，;；:：(（、]|(?<![a-z])(?:then|followed\s+by|after\s+that|and|with)(?![a-z])|随后|然后|之后|接着|其中|另/gu;

/** Route words (zh-CN and en, after NFKC and lower-casing). "IN" is never read as intranasal (it is the word "in"). */
export const ROUTE_WORDS: readonly [DoseRoute, RegExp][] = [
  ["IM", /\bi\.?m\b\.?|\bintramuscular(?:ly)?\b|肌注|肌内|肌肉注射|肌肉内/u],
  ["IV", /\bi\.?v\b\.?|\bintravenous(?:ly)?\b|静注|静推|静滴|静点|静脉/u],
  ["IO", /\bi\.?o\b\.?|\bintraosseous(?:ly)?\b|骨髓腔|骨内|骨髓内/u],
  ["SC", /\bs\.?c\b\.?|\bs\/c\b|\bs\.?q\b\.?|\bsubcut(?:aneous(?:ly)?)?\b|皮下/u],
  ["PO", /\bp\.?o\b\.?|\boral(?:ly)?\b|\bby mouth\b|\bchew(?:ed)?\b|口服|嚼服/u],
  ["SL", /\bs\.?l\b\.?|\bsublingual(?:ly)?\b|舌下/u],
  // not p.r.n. (as needed), nor a pulse rate ("PR 120")
  ["PR", /\bp\.?r\b(?!\.?n\b)(?!\s*[:=]?\s*\d)\.?|\brectal(?:ly)?\b|\bper rectum\b|直肠|纳肛|塞肛/u],
  ["IN", /\bintranasal(?:ly)?\b|鼻内|滴鼻|鼻喷/u],
  ["INH", /\binhal(?:e|ed|ation|er)?\b|\bnebuli[sz](?:e|ed|er|ation)?\b|\bnebs?\b|\binh\b|雾化|吸入/u],
  ["TOP", /\btopical(?:ly)?\b|外用|外涂/u],
];

/** A strength, per mL of what it is counted in. */
interface Strength {
  quantity: DoseQuantity;
  perMl: number;
}

/** A dose found before strengths are applied: where it stands, its amount (or range), its unit. */
interface Found {
  start: number;
  end: number;
  amount: number;
  upTo?: number;
  quantity: DoseQuantity;
  perKg: boolean;
  time: "" | "/h" | "/min";
  over?: number;
  restOver?: number;
  max?: { amount: number; quantity: DoseQuantity };
  then?: true;
}

/**
 * A part of a dose named after it, before a time (`partsOf`): the time is its bolus's, or how long its rest runs. A share
 * or "the rest" names the dose in parts (`strong`); a bolus or an infusion word alone does not.
 */
interface Part {
  end: number;
  kind: "bolus" | "rest";
  strong: boolean;
}

/** Where the clause that holds `at` starts (`CLAUSE_START`; 0 for the first). */
function clauseStart(s: string, at: number): number {
  let from = 0;
  for (const m of s.matchAll(CLAUSE_START)) if (m.index + m[0].length <= at) from = m.index + m[0].length;
  return from;
}

/**
 * The parts of a dose an order names after it, each where its words end — only when the order names the dose in parts
 * (none otherwise): a share ("a 10% bolus", "其中10%": under half its bolus, half or more — or after "the rest", "剩余" —
 * its rest), "the rest" ("the rest over 60 min", "其余60分钟内泵入"), and a bolus or an infusion at the start of a clause
 * that names no dose before it (", bolus over 1 min", ", then infusion over 60 min") — not one that says how the dose
 * before it is given ("72 mg IV bolus over 1 min" gives the whole dose as a bolus). A share or "the rest" names the dose
 * in parts; a bolus does when an infusion, or a time that comes "then", follows it ("72 mg, bolus over 1 min, then
 * infusion over 60 min") — a bolus or an infusion word alone names none ("72 mg IV, bolus over 1 min", "insulin 5.5 units
 * IV, infusion over 1 h": the time is the dose's).
 */
function partsOf(s: string, doses: readonly Pick<Found, "start" | "end">[], durations: readonly { at: number }[]): Part[] {
  const parts: Part[] = [];
  for (const m of s.matchAll(SHARE)) {
    const end = m.index + m[0].length;
    if (!SHARE_AFTER.test(s.slice(end)) || STRENGTH_BEFORE.test(s.slice(0, m.index))) continue;
    parts.push({ end, kind: Number(m[1]) >= 50 || REST_BEFORE.test(s.slice(0, m.index)) ? "rest" : "bolus", strong: true });
  }
  for (const m of s.matchAll(REST_WORDS)) parts.push({ end: m.index + m[0].length, kind: "rest", strong: true });
  const opensClause = (at: number) => {
    const from = clauseStart(s, at);
    return !doses.some((d) => d.start >= from && d.end <= at);
  };
  for (const [re, kind] of [[BOLUS_WORDS, "bolus"], [INFUSION_WORDS, "rest"]] as const) {
    for (const m of s.matchAll(re)) if (opensClause(m.index)) parts.push({ end: m.index + m[0].length, kind, strong: false });
  }
  const bolusWords = [...s.matchAll(BOLUS_WORDS)].map((m) => m.index + m[0].length);
  const inParts =
    parts.some((p) => p.strong) ||
    bolusWords.some((b) => parts.some((p) => p.kind === "rest" && p.end > b) || durations.some((d) => d.at > b && THEN.test(s.slice(b, d.at))));
  return inParts ? parts : [];
}

/** A number in English words alone ("six", "one hundred and twenty"); NaN otherwise. */
function englishValue(text: string): number {
  const n = englishNumbers(text);
  return n.length === 1 && n[0]!.start === 0 && n[0]!.end === text.length ? n[0]!.value : NaN;
}

/**
 * Minutes in a time's words (`DURATION_FORMS`): "2", "hours" → 120; "an", "hour" → 60; "half an", "hour" → 30; "six",
 * "minutes" → 6; "六十", "分钟" → 60; "半", "小时" → 30.
 */
function minutesOf(amount: string, unit: string): number {
  const t = amount.trim().replace(/\s+/gu, " ");
  const n = /^[\d.]/u.test(t)
    ? arabicValue(t)
    : /^an?$/u.test(t)
      ? 1
      : /^half\b|^半$/u.test(t)
        ? 0.5
        : /^[零〇一二两三四五六七八九十百点]+$/u.test(t)
          ? (chineseValue(t) ?? NaN)
          : englishValue(t);
  return /^(?:h|hr|hrs|hour|hours|小时)$/u.test(unit) ? n * 60 : n;
}

/**
 * What an order's words say about its dose: every dose (in order), the route, the doses that cannot be read, and
 * where the doses stand. See the module's documentation for what is read and how.
 */
export function readOrder(text: string): OrderReading {
  const nfkc = text.normalize("NFKC");
  const s = nfkc.toLowerCase();
  const sameLength = s.length === nfkc.length;
  const strengths: Strength[] = [];
  const preparations: Found[] = [];
  const found: Found[] = [];
  const taken: [number, number][] = [];
  const spans: [number, number][] = [];
  const unclears: (UnclearDose & { at: number })[] = [];
  const labNumbers: LabNumber[] = [];
  const totals: (Found & { per: DoseTotal["per"] })[] = [];
  const asWritten = original(text, nfkc);
  const note = (reason: UnclearDoseReason, start: number, end: number) => {
    unclears.push({ reason, words: asWritten(start, end).trim(), at: start });
  };
  const isTaken = (i: number) => taken.some(([a, b]) => i >= a && i < b);
  // a duration's or a clock's numbers are not doses
  // how long a dose is given over (`DURATION_FORMS`), each time once (where its number stands), and whether it is an
  // infusion's ("60分钟内泵入", "1小时静滴", "infused for 60 min")
  const durations: { at: number; minutes: number; infusion: boolean }[] = [];
  for (const form of DURATION_FORMS) {
    for (const m of s.matchAll(form.re)) {
      if (form.before && !form.before.test(s.slice(0, m.index))) continue;
      taken.push([m.index, m.index + m[0].length]);
      const at = m.indices?.[1]?.[0] ?? m.index;
      if (durations.some((d) => d.at === at)) continue;
      const infusion = form.infusion || (form.zh === true && (ZH_INFUSION.test(m[0]) || ZH_INFUSION_AFTER.test(s.slice(m.index + m[0].length))));
      durations.push({ at, minutes: minutesOf(m[1]!, m[2]!), infusion });
    }
  }
  durations.sort((a, b) => a.at - b.at);

  // strengths written as a ratio: 1:1000 is 1 g in 1000 mL
  for (const m of s.matchAll(RATIO)) {
    strengths.push({ quantity: "mg", perMl: 1000 / Number(m[1]!.replace(/[, ]/gu, "")) });
    taken.push([m.index, m.index + m[0].length]);
  }
  const nums = numbers(s).filter((n) => !isTaken(n.start));
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i]!;
    if (isTaken(n.start)) continue;
    // a range: two numbers, then the unit
    let upTo: Num | undefined;
    const next = nums[i + 1];
    const sep = RANGE_SEP.exec(s.slice(n.end));
    if (next && sep && n.end + sep[0].length === next.start) upTo = next;
    const last = upTo ?? n;
    const unit = unitAt(s, last.end);
    const before = s.slice(0, n.start);
    if (!unit) {
      if (upTo) i++;
      const after = s.slice(leadAt(s, last.end));
      const analyte = analyteBefore(before);
      const notDose = BARE_BEFORE.test(before) || analyte != null;
      // a unit no preset is counted in ("200 mEq/h", "5 ng"): a dose that cannot be checked
      const foreign = FOREIGN_UNIT.exec(after);
      if (foreign) {
        const end = leadAt(s, last.end) + foreign[0].length + (s.slice(leadAt(s, last.end) + foreign[0].length).match(/^\s*\/\s*(?:kg|h|hr|min)(?![a-z])/u)?.[0].length ?? 0);
        taken.push([n.start, end]);
        spans.push([n.start, end]);
        note("unit", n.start, end);
        continue;
      }
      // a count of tablets, ampoules or puffs ("一支", "2 tablets")
      const count = COUNT_WORDS.exec(after);
      if (count && !/^\s*[x×*]/u.test(after.slice(count[0].length)) && !notDose) {
        const end = leadAt(s, last.end) + count[0].length;
        taken.push([n.start, end]);
        note("count", n.start, end);
        continue;
      }
      // an Arabic number (or range) with no unit, where a dose would stand ("adrenaline 0.5 IM", "0.5-1 IM") — not a
      // place, count, vital sign, score, age or clock time; after a measurement that is also a medicine ("potassium
      // 40 IV"), a lab value or that medicine's dose (`LabNumber`: asked when the order is for it)
      const clock = CLOCK_BEFORE.test(before) && (/^\d{3,4}$/u.test(s.slice(n.start, n.end)) || CLOCK_AFTER.test(s.slice(last.end)));
      if (n.arabic && !n.bad && !last.bad && !clock && BARE_AFTER.test(s.slice(last.end)) && !BARE_BEFORE.test(before)) {
        if (analyte) labNumbers.push({ analyte, words: asWritten(n.start, last.end).trim() });
        else note("no-unit", n.start, last.end);
      }
      continue;
    }
    if (upTo) i++;
    taken.push([n.start, unit.end]);
    if (n.bad || upTo?.bad) {
      note("unreadable", n.start, unit.end);
      spans.push([n.start, unit.end]);
      continue;
    }
    if (unit.notDose) continue;
    // a cannula's gauge ("via the 18G", "18G cannula"), not grams — only where the words say so; a capital G
    // otherwise ("20G", "2G") is not read: grams, or a gauge?
    if (unit.quantity === "g" && unit.word === "g" && !unit.perKg && !unit.time && unit.perMl == null && !unit.per && !upTo) {
      const capital = sameLength && nfkc[unit.at] === "G";
      if (GAUGES.has(n.value) && (GAUGE_AFTER.test(s.slice(unit.end)) || GAUGE_BEFORE.test(before))) continue;
      if (capital) {
        note("unreadable", n.start, unit.end);
        spans.push([n.start, unit.end]);
        continue;
      }
    }
    // a laboratory value per volume ("K+ 3.8 mmol/L", "glucose 450 mg/dL"): neither a strength nor a dose
    if (unit.perMl != null && (unit.perDl || LAB_BEFORE.test(before))) continue;
    let amount = n.value * unit.scale;
    let top = upTo ? upTo.value * unit.scale : undefined;
    // nothing, or a range that does not rise: no dose that can be read
    if (!(amount > 0) || (top != null && !(top > amount))) {
      note("unreadable", n.start, unit.end);
      continue;
    }
    // a cap after a dose: the most of a dose per kg ("0.01 mg/kg, max 0.5 mg"), or of a titration ("2.5 mg IV, max
    // 10 mg") — not a dose. A cap with no dose before it ("up to 5 mg", "最多5mg") is the order's dose: read on.
    if (CAP_BEFORE.test(before) && unit.perMl == null && (found.length > 0 || preparations.length > 0)) {
      const capped = found.at(-1);
      if (capped && capped.perKg && !unit.perKg && capped.time === unit.time && capped.quantity === unit.quantity && top == null) capped.max = { amount: tidy(amount), quantity: unit.quantity };
      spans.push([n.start, unit.end]);
      continue;
    }
    // a daily total or a dose per m² ("20 g/day", "50 mg/kg/day", "每日2g", "1.5 g/m2"): not a single dose (`DoseTotal`)
    const perDay = !unit.per && !unit.perKg && !unit.time && PREFIX_PER_DAY.test(before);
    if (unit.per || perDay) {
      totals.push({ start: n.start, end: unit.end, amount: tidy(amount), ...(top != null ? { upTo: tidy(top) } : {}), quantity: unit.quantity, perKg: unit.perKg, time: unit.time, per: unit.per ?? "day" });
      spans.push([n.start, unit.end]);
      continue;
    }
    // so many of it, written before ("5 x 0.1 mg"): a repeat, or a total?
    const timesBefore = TIMES_BEFORE.exec(before);
    if (timesBefore) {
      const start = timesBefore.index;
      if (!timesBefore[1]) {
        note("unreadable", start, unit.end);
        continue;
      }
    }
    if (top != null) note("range", n.start, unit.end);
    if (unit.perMl != null) {
      // "1 mg/mL" is a strength; "50 units/50 mL" also holds a dose (the preparation)
      strengths.push({ quantity: unit.quantity, perMl: amount / unit.perMl });
      if (unit.perCount) preparations.push({ start: n.start, end: unit.end, amount: tidy(amount), quantity: unit.quantity, perKg: false, time: "" });
      spans.push([n.start, unit.end]);
      continue;
    }
    let end = unit.end;
    // a combination's second strength ("piperacillin/tazobactam 4 g/0.5 g"): their total — after any other name, two
    // doses ("adrenaline 0.5 mg/5 mg": which?)
    const combination = !unit.perKg && !unit.time && top == null ? COMBINATION.exec(s.slice(end)) : null;
    if (combination) {
      const second = unitAt(s, end + combination[0].length);
      if (second && !second.perKg && !second.time && second.perMl == null && second.quantity !== "mL" && sameDimension(second.quantity, unit.quantity)) {
        taken.push([unit.end, second.end]);
        if (!COMBINATION_NAME.test(before)) {
          note("unreadable", n.start, second.end);
          spans.push([n.start, second.end]);
          continue;
        }
        amount += (arabicValue(combination[1]!) * second.scale * FACTOR[second.quantity]) / FACTOR[unit.quantity];
        end = second.end;
      }
    }
    // so many tablets of it ("90mg×2片", "81 mg x 4 tablets"): their total; a bare "x 4" — four doses, or a total?
    const timesAfter = top == null ? TIMES_AFTER.exec(s.slice(end)) : null;
    if (timesAfter) {
      const times = timesAfter[0].length;
      taken.push([end, end + times]);
      if (!timesAfter[2] || unit.perKg || unit.time) {
        note("unreadable", n.start, end + times);
        spans.push([n.start, end + times]);
        continue;
      }
      amount *= Number(timesAfter[1]);
      end += times;
    } else if (timesBefore?.[1]) amount *= Number(/\d+/u.exec(timesBefore[0])![0]);
    // so much per kg, per hour or minute, in Chinese word order before the number (a day's total is read above)
    let perKg = unit.perKg;
    let time = unit.time;
    if (!perKg && !time) {
      const pk = PREFIX_PER_KG.exec(before);
      const pt = pk ? null : PREFIX_PER_TIME.exec(before);
      if (pk) perKg = true;
      const t = pk?.[1] ?? pt?.[1];
      if (t) time = /^(?:h|小时)$/u.test(t) ? "/h" : "/min";
    }
    const dose: Found = { start: n.start, end, amount: tidy(amount), ...(top != null ? { upTo: tidy(top) } : {}), quantity: unit.quantity, perKg, time };
    spans.push([n.start, end]);
    // a preparation: what is made up in a volume ("50 units in 50 mL", "50U+NS至50ml"), or a volume and what it holds
    const absolute = !dose.perKg && !dose.time && dose.upTo == null;
    if (absolute && dose.quantity !== "mL") {
      const join = PREP_JOIN.exec(s.slice(dose.end));
      const vol = join && nums.find((x) => x.start === dose.end + join[0].length && !x.bad);
      const volUnit = vol && unitAt(s, vol.end);
      if (vol && volUnit && volUnit.quantity === "mL" && !volUnit.perKg && !volUnit.time && volUnit.perMl == null) {
        const ml = vol.value * volUnit.scale;
        if (ml > 0) {
          strengths.push({ quantity: dose.quantity, perMl: dose.amount / ml });
          preparations.push(dose);
          const tail = DILUENT_AFTER.exec(s.slice(volUnit.end))?.[0].length ?? 0;
          taken.push([vol.start, volUnit.end + tail]);
          // the whole preparation, its diluent included, is how the drug is made up (never the item's name)
          spans.push([dose.start, volUnit.end + tail]);
          continue;
        }
      }
    }
    if (absolute && dose.quantity === "mL") {
      // a diluent ("with 2.5 mL saline"): the vehicle, not the dose
      if (DILUENT_BEFORE.test(before) && DILUENT_AFTER.test(s.slice(dose.end))) {
        const tail = DILUENT_AFTER.exec(s.slice(dose.end))![0].length;
        spans.push([n.start, dose.end + tail]);
        continue;
      }
      const join = HOLDS_JOIN.exec(s.slice(dose.end));
      const held = join && nums.find((x) => x.start === dose.end + join[0].length && !x.bad);
      const heldUnit = held && unitAt(s, held.end);
      if (held && heldUnit && heldUnit.quantity !== "mL" && !heldUnit.perKg && !heldUnit.time && heldUnit.perMl == null && !heldUnit.notDose) {
        const amountHeld = held.value * heldUnit.scale;
        if (amountHeld > 0) {
          strengths.push({ quantity: heldUnit.quantity, perMl: amountHeld / dose.amount });
          preparations.push({ ...dose, start: held.start, end: heldUnit.end, amount: tidy(amountHeld), quantity: heldUnit.quantity });
          taken.push([held.start, heldUnit.end]);
          spans.push([held.start, heldUnit.end]);
          // the bag — its diluent, its volume and the join — is how the drug is made up: one preparation, never an
          // order of its own (what it holds keeps its name)
          const vehicle = DILUENT_LEADS.exec(before);
          spans.push([vehicle ? vehicle.index : dose.start, dose.end + join[1]!.length]);
          continue;
        }
      }
      // a volume added to a diluent's ("10%氯化钾30ml加入生理盐水1000ml"): the diluent's volume is how it is made up
      const into = PREP_JOIN.exec(s.slice(dose.end));
      const bag = into && /\S/u.test(into[0]) ? nums.find((x) => x.start === dose.end + into[0].length && !x.bad) : undefined;
      const bagUnit = bag && unitAt(s, bag.end);
      if (bag && bagUnit && bagUnit.quantity === "mL" && !bagUnit.perKg && !bagUnit.time && bagUnit.perMl == null) {
        taken.push([bag.start, bagUnit.end]);
        spans.push([dose.end, bagUnit.end]);
      }
    }
    found.push(dose);
  }
  // a unit with no number before it ("几毫克", "x mg")
  for (const m of s.matchAll(CHINESE_UNIT_ALONE)) {
    // with the words that stood for its number ("几毫克", "多少毫克")
    if (!isTaken(m.index)) note("unreadable", m.index - s.slice(Math.max(0, m.index - 3), m.index).match(/[几若干多少数个]*$/u)![0].length, m.index + m[0].length);
  }
  for (const m of s.matchAll(PLACEHOLDER_UNIT)) if (!isTaken(m.index + m[0].length - 1)) note("unreadable", m.index, m.index + m[0].length);
  // a duration belongs to the dose (or preparation) last before it; of several, the longest is how long it runs
  // ("0.9 mg/kg over 60 min, over 1 min for its first 10%") — unless a part of the dose is named after it: then the time is that
  // part's. Its bolus's is none of the dose's ("0.9 mg/kg, 10% as a bolus over 1 min", "其中10%于1分钟内静推"); its
  // rest's — or, after the bolus, a time that comes "then" or is an infusion's ("72 mg, bolus over 1 min, then over
  // 60 min", "10%静推，60分钟内泵入") — is how long the infusion runs (`restOver`: "7.2 mg bolus, the rest over 60 min")
  const parts = partsOf(s, [...found, ...preparations], durations);
  const last = <T extends { end: number }>(xs: readonly T[], at: number) => xs.filter((x) => x.end <= at).sort((a, b) => b.end - a.end)[0];
  for (const d of durations) {
    if (!(d.minutes > 0)) continue;
    const owner = last([...found, ...preparations], d.at);
    const part = last(parts, d.at);
    if (!owner || owner.time || owner.upTo != null) continue;
    if (part && part.end > owner.end) {
      if (part.kind === "rest" || d.infusion || THEN.test(s.slice(part.end, d.at))) owner.restOver = Math.max(owner.restOver ?? 0, d.minutes);
      continue;
    }
    owner.over = Math.max(owner.over ?? 0, d.minutes);
    // the same dose written again just before it ("5000 units (5000 IU) over 5 min"): the time is that dose's too
    const i = found.indexOf(owner);
    const restated = i > 0 ? found[i - 1]! : null;
    if (restated && !restated.time && restated.upTo == null && RESTATES.test(s.slice(restated.end, owner.start))) restated.over = Math.max(restated.over ?? 0, d.minutes);
  }
  // a later single dose after "then" and at a frequency ("300 mg now, then 75 mg daily"): the regimen's maintenance
  for (let i = 1; i < found.length; i++) {
    const f = found[i]!;
    if (f.time || f.over != null) continue;
    const between = s.slice(found[i - 1]!.end, f.start);
    const after = s.slice(f.end, found[i + 1]?.start ?? s.length);
    if (THEN.test(between) && (FREQUENCY.test(between) || FREQUENCY.test(after))) f.then = true;
  }

  // one strength stated (however often): volumes are read as what they hold
  const distinct = strengths.filter((x, i) => strengths.findIndex((y) => y.quantity === x.quantity && Math.abs(y.perMl - x.perMl) <= 1e-9 * Math.max(1, x.perMl)) === i);
  const strength = distinct.length === 1 ? distinct[0]! : null;
  const extras = (f: Found) => ({
    ...(f.over != null ? { over: f.over } : {}),
    ...(f.restOver != null ? { restOver: f.restOver } : {}),
    ...(f.max ? { max: { amount: f.max.amount, unit: f.max.quantity as DoseUnit } } : {}),
    ...(f.then ? { then: true as const } : {}),
  });
  const mentions = found.map((f): DoseMention => {
    const unit = unitOf(f);
    if (f.quantity !== "mL" || !strength || strength.quantity === "mL") return { amount: f.amount, ...(f.upTo != null ? { upTo: f.upTo } : {}), unit, ...extras(f) };
    const held = (x: number) => tidy(x * strength.perMl);
    return {
      amount: held(f.amount),
      ...(f.upTo != null ? { upTo: held(f.upTo) } : {}),
      unit: unitOf({ ...f, quantity: strength.quantity }),
      volume: { amount: f.amount, unit },
      ...extras(f),
    };
  });
  // a preparation alone is the dose it holds ("adrenaline 5 mg in 5 mL")
  if (mentions.length === 0 && preparations.length > 0) {
    const p = preparations[0]!;
    mentions.push({ amount: p.amount, unit: unitOf(p), ...extras(p) });
  }
  const routes = ROUTE_WORDS.filter(([, pattern]) => pattern.test(s)).map(([route]) => route);
  const ordered = unclears.sort((a, b) => a.at - b.at).map(({ reason, words }) => ({ reason, words }));
  return {
    mentions,
    route: routes.length === 1 ? routes[0]! : null,
    routes,
    unclear: ordered[0] ?? null,
    unclears: ordered,
    labNumbers,
    totals: totals.map((f) => ({ amount: f.amount, ...(f.upTo != null ? { upTo: f.upTo } : {}), unit: unitOf(f), per: f.per, words: asWritten(f.start, f.end).trim() })),
    spans: sameLength ? mergeSpans(spans) : [],
  };
}

/**
 * The words of the text as written for a stretch of its NFKC form ("5½ units", not "51⁄2 units"): each character is
 * normalised alone, and when that gives the same text the stretch maps back; else the NFKC words.
 */
function original(text: string, nfkc: string): (start: number, end: number) => string {
  const from: number[] = [];
  let built = "";
  for (let i = 0; i < text.length; ) {
    const ch = String.fromCodePoint(text.codePointAt(i)!);
    const n = ch.normalize("NFKC");
    for (let k = 0; k < n.length; k++) from.push(i);
    built += n;
    i += ch.length;
  }
  if (built !== nfkc) return (start, end) => nfkc.slice(start, end);
  const after = (i: number) => i + String.fromCodePoint(text.codePointAt(i)!).length;
  return (start, end) => (end <= start ? "" : text.slice(from[start] ?? text.length, end > 0 ? after(from[end - 1]!) : 0));
}

/** Spans sorted, nested ones dropped. */
function mergeSpans(spans: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const span of [...spans].sort((a, b) => a[0] - b[0] || b[1] - a[1])) {
    const last = out.at(-1);
    if (last && span[0] < last[1]) last[1] = Math.max(last[1], span[1]);
    else out.push([...span]);
  }
  return out;
}

/** Each mass quantity's factor to mg (the combination of two strengths). */
const FACTOR: Record<DoseQuantity, number> = { g: 1000, mg: 1, microgram: 0.001, mL: 1, unit: 1, mmol: 1 };
const sameDimension = (a: DoseQuantity, b: DoseQuantity) => a === b || (["g", "mg", "microgram"].includes(a) && ["g", "mg", "microgram"].includes(b));

/**
 * Every dose a text states, in order: an amount (or a range, "2–3 mg") followed by its unit — "0.5 mg", "500
 * micrograms", "五毫克", "0.1 units/kg/h", "40万单位"; a volume as what it holds when the text states the strength. A
 * concentration ("1 mg/mL", "40 mmol/L"), a percentage, a ratio ("1:1000"), a daily total ("50 mg/kg/day"), a dose per
 * m², a gas flow ("oxygen 15 L/min"), a cap ("max 25 mg") or a body weight ("62 kg") is not a dose; nor is a preparation
 * when the text also gives the dose ("50 units in 50 mL at 5.5 mL/h").
 */
export function doseMentions(text: string): DoseMention[] {
  return readOrder(text).mentions;
}

/** The route a text states; null when it names none, or more than one ("IV or IM" states none). */
export function doseRoute(text: string): DoseRoute | null {
  return readOrder(text).route;
}

/** The dose of a reading: its first dose (a range as its two ends) and its route. */
export function readingDose(reading: Pick<OrderReading, "mentions" | "route">): OrderedDose | null {
  const first = reading.mentions[0];
  const amount = first ? { amount: first.amount, ...(first.upTo != null ? { upTo: first.upTo } : {}), unit: first.unit } : {};
  const dose: OrderedDose = { ...amount, ...(reading.route ? { route: reading.route } : {}) };
  return dose.amount != null || dose.route != null ? dose : null;
}

/**
 * The dose a written order states (`intervene` `ordered.dose`): its first dose (`doseMentions`; a range as its two
 * ends) and its route (`doseRoute`). Null when it states neither.
 */
export function parseDose(text: string): OrderedDose | null {
  return readingDose(readOrder(text));
}
