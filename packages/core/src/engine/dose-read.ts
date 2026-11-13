/**
 * Reading a written order's dose (docs/PROTOCOL.md §3.2): what the words of an order say about its dose — zh-CN and
 * en. Pure: no I/O, no clock.
 *
 * * **Numbers** in Arabic numerals ("0.5", "0,5", "5,000", "40万"), Chinese numerals ("五", "零点五", "两千", "八十万")
 *   and English words ("five", "zero point five", "five hundred", "half a"), with "个" between a number and its unit
 *   ("5个毫克", "四个单位"). A Chinese or English number is a number only when a unit follows it.
 * * **Concentrations.** A volume is read as what it contains when the order states the strength — "0.5 mL of
 *   1 mg/mL", "1:1000 0.5 mL", "insulin 50 units in 50 mL at 5.5 mL/h" (5.5 units/h). A preparation ("50 units in
 *   50 mL", "50U+NS 50ml", "0.9% NaCl 1000 mL with KCl 40 mmol") is then not itself a dose; alone, it is the dose it
 *   holds ("adrenaline 5 mg in 5 mL" is 5 mg).
 * * **What cannot be read** (`unclear`): a fraction ("1/2 mg"), a number broken by a Chinese full stop or enumeration
 *   comma ("0。5 mg"), "5.000" (five, or five thousand?), a unit with no number ("几毫克", "x mg"), a range ("0.5–1 mg":
 *   which?) and a number with no unit ("adrenaline 0.5 IM"). The engine asks about these rather than guess.
 */
import type { DoseQuantity, DoseRoute, DoseUnit, OrderedDose } from "../schema/common.js";

/** A dose a text states: an amount (or a range `amount`–`upTo`) with its unit. */
export interface DoseMention {
  amount: number;
  upTo?: number;
  unit: DoseUnit;
  /** A volume the order converts through the strength it states ("0.5 mL of 1 mg/mL" → 0.5 mg): the volume as written. */
  volume?: { amount: number; unit: DoseUnit };
}

/** Why a dose the words state cannot be read: a number that cannot be read, a range, no unit. */
export type UnclearDoseReason = "unreadable" | "range" | "no-unit";

/** A dose the words state that cannot be read, and the words. */
export interface UnclearDose {
  reason: UnclearDoseReason;
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
  /** Where the doses (and preparations) stand in `text.normalize("NFKC")`: [start, end) — what `withoutDoses` removes. */
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
const CN_DIGIT: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
const CHINESE = /[零〇一二两三四五六七八九十百千万]+(?:点[零〇一二三四五六七八九]+)?|半/gu;

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

/** English number words with their positions: "five", "zero point five", "one hundred and fifty", "half a". */
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
 * Every number of a text, in order: Arabic numerals (a fraction "1/2", a number broken by "。" or "、", "5.000" are
 * `bad`; a ratio's or a word's numbers — "1:1000", "co2", "q4h" — are not numbers here), Chinese numerals, English
 * words. A "万" or "千" after Arabic numerals multiplies ("40万").
 */
function numbers(s: string): Num[] {
  const out: Num[] = [];
  for (const m of s.matchAll(ARABIC)) {
    const start = m.index;
    let end = start + m[0].length;
    const before = s[start - 1] ?? "";
    // a word's digits ("co2", "q4h", "x2"), a ratio's or a fraction's second number, a percentage's part
    if (/[a-z:/]/u.test(before)) continue;
    const after = s.slice(end);
    // a ratio ("1:1000", "10:30"): not an amount
    if (/^\s*:\s*\d/u.test(after)) continue;
    // a fraction ("1/2 mg"), a number broken by a Chinese full stop or enumeration comma ("0。5"): cannot be read
    const broken = after.match(/^\s*\/\s*\d+(?:[.,]\d+)?|^[。、]\d+(?:[.,]\d+)?/u);
    if (broken) {
      out.push({ start, end: end + broken[0].length, value: NaN, bad: true, arabic: true });
      continue;
    }
    let value = arabicValue(m[0]);
    const bad = AMBIGUOUS_THOUSANDS.test(m[0]);
    const scale = after.match(/^\s*([万千])/u);
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
  [/^(?:microgram(?:me)?s?|mcgs?|μg|ug|微克)/u, "microgram"],
  [/^(?:milligram(?:me)?s?|mgs?|毫克)/u, "mg"],
  [/^(?:millilit(?:re|er)s?|mls?|cc|毫升)/u, "mL"],
  [/^(?:millimol(?:e)?s?|mmol|毫摩尔|毫摩)/u, "mmol"],
  [/^(?:gram(?:me)?s?|g|克)/u, "g"],
  [/^(?:decilit(?:re|er)s?|dl)/u, "dL"],
  [/^(?:lit(?:re|er)s?|l|升)/u, "L"],
  [/^(?:units?|iu|u|国际单位|单位)/u, "unit"],
];
const PER = String.raw`\s*(?:/|per\s+|每)\s*`;
const PER_KG = new RegExp(String.raw`^${PER}(?:kg|kilograms?|公斤|千克)(?![a-z])`, "u");
const PER_TIME = new RegExp(String.raw`^${PER}(h|hrs?|hours?|小时|min|mins|minutes?|分钟)(?![a-z])`, "u");
/** A dose per body-surface area (mg/m²) or a daily total (50 mg/kg/day — but "500 mg每日1次" is 500 mg once a day). */
const NOT_A_DOSE = new RegExp(String.raw`^(?:${PER}m2|\s*(?:/|per\s+)\s*(?:d|days?|天|日))(?![a-z])`, "u");
/** Per volume: a strength ("1 mg/mL", "40 mmol/L", "50 units/50 mL"). */
const PER_VOLUME = /^\s*(?:\/|per\s+|每)\s*(\d+(?:[.,]\d+)?)?\s*(ml|毫升|l|升|dl)(?![a-z])/u;

/** The unit right after a number (an optional "个" between), with its per-kg and per-time parts. */
interface UnitHere {
  quantity: DoseQuantity;
  /** Multiplier to the quantity (litres → mL ×1000). */
  scale: number;
  perKg: boolean;
  time: "" | "/h" | "/min";
  /** End of the unit (and its per parts) in the text. */
  end: number;
  /** A strength: so much per this many mL. */
  perMl?: number;
  /** The strength's volume was a number ("50 units/50 mL"): so much in so many mL — also a preparation. */
  perCount?: true;
  /** A dose per area, a daily total or a gas flow in litres per minute: no dose of this kind. */
  notDose?: true;
}

function unitAt(s: string, pos: number): UnitHere | null {
  const lead = s.slice(pos).match(/^\s*(?:个\s*)?/u)![0].length;
  const rest = s.slice(pos + lead);
  for (const [pattern, quantity] of UNIT_WORDS) {
    const m = pattern.exec(rest);
    if (!m) continue;
    let length = m[0].length;
    // an English unit is a whole word ("5 gtt" is no gram, "5 units" no "u")
    if (/[a-z]/u.test(rest[length] ?? "")) continue;
    // a decilitre is only ever a strength's denominator
    if (quantity === "dL") return null;
    const unit: UnitHere = { quantity: quantity === "L" ? "mL" : quantity, scale: quantity === "L" ? 1000 : 1, perKg: false, time: "", end: 0 };
    const perVolume = PER_VOLUME.exec(rest.slice(length));
    if (perVolume) {
      const n = perVolume[1] != null ? arabicValue(perVolume[1]) : 1;
      const ml = n * (perVolume[2] === "l" || perVolume[2] === "升" ? 1000 : perVolume[2] === "dl" ? 100 : 1);
      return { ...unit, perMl: ml, ...(perVolume[1] != null ? { perCount: true as const } : {}), end: pos + lead + length + perVolume[0].length };
    }
    const kg = PER_KG.exec(rest.slice(length));
    if (kg) {
      unit.perKg = true;
      length += kg[0].length;
    }
    const time = PER_TIME.exec(rest.slice(length));
    if (time) {
      unit.time = /^(?:h|hr|hrs|hour|hours|小时)$/u.test(time[1]!) ? "/h" : "/min";
      length += time[0].length;
    }
    // a dose per area or a daily total; litres per minute is a gas flow (oxygen 15 L/min), not a dose
    if (NOT_A_DOSE.test(rest.slice(length)) || (quantity === "L" && unit.time === "/min")) unit.notDose = true;
    unit.end = pos + lead + length;
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
/** What joins a preparation's content to its volume ("50 units in 50 mL", "50U+NS 50ml", "加入生理盐水50毫升"). */
const PREP_JOIN =
  /^\s*(?:made up to|made up with|up to|into|in|\+|加入|加至|溶于|溶入|配成|配至|稀释至|稀释到|稀释于|加|兑)\s*(?:(?:0\.9|5|10)\s*%\s*)?(?:(?:normal saline|sodium chloride|saline|nacl|n\.s\.|ns|gs|glucose|dextrose|water|生理盐水|氯化钠|盐水|注射用水|葡萄糖)\s*)?(?:(?:至|到|to)\s*)?/u;
/** What joins a volume to what it holds ("0.9% NaCl 1000 mL with KCl 40 mmol", "NS 500ml+氯化钾10mmol"). */
const HOLDS_JOIN = /^\s*(?:with|containing|含|加|\+)\s*(?:[a-z\u4e00-\u9fff]+\s*)?/u;
/** A strength written as a ratio: 1:1000 or 1/1000 (1 mg/mL), 1 in 10,000 (0.1 mg/mL). */
const RATIO = /(?<![\d.])1\s*(?::|\/|in)\s*([1-9]\d{0,2}(?:[, ]\d{3})+|[1-9]\d{2,})(?![\d.]|\s*(?:ml|毫升|mg|毫克))/gu;
/** Unit words that only ever mean a unit (a number should stand before them). */
const CHINESE_UNIT_ALONE = /毫克|微克|毫升|毫摩尔|国际单位|个单位/gu;
/** An English unit after a placeholder instead of a number ("x mg", "? mg", "some mg"). */
const PLACEHOLDER_UNIT = /(?:^|[\s(])(?:x|y|n|\?|some|few|several)\s*(?:mg|mcg|μg|ug|micrograms?|milligrams?|ml|mmol|units?)(?![a-z])/gu;
/** After a number with no unit: what lets it stand for a dose (the end, punctuation, a route, "now"). */
const BARE_AFTER =
  /^\s*(?:$|[,，;；)）]|\.(?!\d)|(?:i\.?m|i\.?v|im|iv|io|sc|sq|po|sl|pr|inh|neb)\b|(?:intramuscular|intravenous|subcutaneous|oral|now|stat|immediately)\b|肌注|肌内|静推|静注|静滴|静脉|皮下|口服|舌下|雾化|吸入|立即|马上|立刻)/u;
/** Before a number that is a place or a count, not a dose ("bed 3", "3号床", "第2"). */
const BARE_BEFORE = /(?:bed|room|bay|cubicle|no\.?|number|#|第|床)\s*$/u;

/** Route words (zh-CN and en, after NFKC and lower-casing). "IN" is never read as intranasal (it is the word "in"). */
export const ROUTE_WORDS: readonly [DoseRoute, RegExp][] = [
  ["IM", /\bi\.?m\b\.?|\bintramuscular(?:ly)?\b|肌注|肌内|肌肉注射|肌肉内/u],
  ["IV", /\bi\.?v\b\.?|\bintravenous(?:ly)?\b|静注|静推|静滴|静点|静脉/u],
  ["IO", /\bi\.?o\b\.?|\bintraosseous(?:ly)?\b|骨髓腔|骨内|骨髓内/u],
  ["SC", /\bs\.?c\b\.?|\bs\.?q\b\.?|\bsubcut(?:aneous(?:ly)?)?\b|皮下/u],
  ["PO", /\bp\.?o\b\.?|\boral(?:ly)?\b|\bby mouth\b|\bchew(?:ed)?\b|口服|嚼服/u],
  ["SL", /\bs\.?l\b\.?|\bsublingual(?:ly)?\b|舌下/u],
  // not p.r.n. (as needed)
  ["PR", /\bp\.?r\b(?!\.?n\b)\.?|\brectal(?:ly)?\b|\bper rectum\b|直肠|纳肛|塞肛/u],
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
}

/**
 * What an order's words say about its dose: every dose (in order), the route, the first dose that cannot be read,
 * and where the doses stand. See the module's documentation for what is read and how.
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
  let unclear: (UnclearDose & { at: number }) | null = null;
  const note = (reason: UnclearDoseReason, start: number, end: number) => {
    if (!unclear || start < unclear.at) unclear = { reason, words: nfkc.slice(start, end).trim(), at: start };
  };
  const isTaken = (i: number) => taken.some(([a, b]) => i >= a && i < b);

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
    const unit = unitAt(s, (upTo ?? n).end);
    if (!unit) {
      // an Arabic number (or range) with no unit, where a dose would stand ("adrenaline 0.5 IM", "0.5-1 IM")
      const last = upTo ?? n;
      if (n.arabic && !n.bad && !last.bad && BARE_AFTER.test(s.slice(last.end)) && !BARE_BEFORE.test(s.slice(0, n.start))) note("no-unit", n.start, last.end);
      if (upTo) i++;
      continue;
    }
    if (upTo) i++;
    taken.push([n.start, unit.end]);
    if (n.bad || upTo?.bad) {
      note("unreadable", n.start, unit.end);
      continue;
    }
    if (unit.notDose) continue;
    const amount = n.value * unit.scale;
    const top = upTo ? upTo.value * unit.scale : undefined;
    if (!(amount > 0) || (top != null && !(top > amount))) continue;
    if (top != null) note("range", n.start, unit.end);
    if (unit.perMl != null) {
      // "1 mg/mL" is a strength; "50 units/50 mL" also holds a dose (the preparation)
      strengths.push({ quantity: unit.quantity, perMl: amount / unit.perMl });
      if (unit.perCount) preparations.push({ start: n.start, end: unit.end, amount: tidy(amount), quantity: unit.quantity, perKg: false, time: "" });
      spans.push([n.start, unit.end]);
      continue;
    }
    const dose: Found = { start: n.start, end: unit.end, amount: tidy(amount), ...(top != null ? { upTo: tidy(top) } : {}), quantity: unit.quantity, perKg: unit.perKg, time: unit.time };
    spans.push([n.start, unit.end]);
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
          taken.push([vol.start, volUnit.end]);
          spans.push([vol.start, volUnit.end]);
          continue;
        }
      }
    }
    if (absolute && dose.quantity === "mL") {
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
          continue;
        }
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

  // one strength stated (however often): volumes are read as what they hold
  const distinct = strengths.filter((x, i) => strengths.findIndex((y) => y.quantity === x.quantity && Math.abs(y.perMl - x.perMl) <= 1e-9 * Math.max(1, x.perMl)) === i);
  const strength = distinct.length === 1 ? distinct[0]! : null;
  const mentions = found.map((f): DoseMention => {
    const unit = unitOf(f);
    if (f.quantity !== "mL" || !strength || strength.quantity === "mL") return { amount: f.amount, ...(f.upTo != null ? { upTo: f.upTo } : {}), unit };
    const held = (x: number) => tidy(x * strength.perMl);
    return {
      amount: held(f.amount),
      ...(f.upTo != null ? { upTo: held(f.upTo) } : {}),
      unit: unitOf({ ...f, quantity: strength.quantity }),
      volume: { amount: f.amount, unit },
    };
  });
  // a preparation alone is the dose it holds ("adrenaline 5 mg in 5 mL")
  if (mentions.length === 0 && preparations.length > 0) {
    const p = preparations[0]!;
    mentions.push({ amount: p.amount, unit: unitOf(p) });
  }
  const routes = ROUTE_WORDS.filter(([, pattern]) => pattern.test(s)).map(([route]) => route);
  const reading: OrderReading = {
    mentions,
    route: routes.length === 1 ? routes[0]! : null,
    routes,
    unclear: unclear ? { reason: (unclear as UnclearDose).reason, words: (unclear as UnclearDose).words } : null,
    spans: sameLength ? spans.sort((a, b) => a[0] - b[0]) : [],
  };
  return reading;
}

/**
 * Every dose a text states, in order: an amount (or a range, "2–3 mg") followed by its unit — "0.5 mg", "500
 * micrograms", "五毫克", "0.1 units/kg/h", "40万单位"; a volume as what it holds when the text states the strength. A
 * concentration ("1 mg/mL", "40 mmol/L"), a percentage, a ratio ("1:1000"), a daily total ("50 mg/kg/day"), a dose per
 * m² or a gas flow ("oxygen 15 L/min") is not a dose; nor is a preparation when the text also gives the dose ("50 units
 * in 50 mL at 5.5 mL/h").
 */
export function doseMentions(text: string): DoseMention[] {
  return readOrder(text).mentions;
}

/** The route a text states; null when it names none, or more than one ("IV or IM" states none). */
export function doseRoute(text: string): DoseRoute | null {
  return readOrder(text).route;
}

/** The dose of a reading: its first dose (a range states no amount — which end was meant is not known) and its route. */
export function readingDose(reading: Pick<OrderReading, "mentions" | "route">): OrderedDose | null {
  const first = reading.mentions[0];
  const amount = first && first.upTo == null ? { amount: first.amount, unit: first.unit } : {};
  const dose: OrderedDose = { ...amount, ...(reading.route ? { route: reading.route } : {}) };
  return dose.amount != null || dose.route != null ? dose : null;
}

/**
 * The dose a written order states (`intervene` `ordered.dose`): its first dose (`doseMentions`) and its route
 * (`doseRoute`). A range states no amount — which end was meant is not known. Null when it states neither.
 */
export function parseDose(text: string): OrderedDose | null {
  return readingDose(readOrder(text));
}
