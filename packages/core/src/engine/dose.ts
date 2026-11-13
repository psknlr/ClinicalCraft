/**
 * Doses (docs/CASE_AUTHORING.md §6, docs/PROTOCOL.md §3.2): an order's dose against an intervention's preset
 * (`interventions[].doseSpec`) after unit conversion, how serious a conflict is, and the dose a written order states
 * (`parseDose`, zh-CN and en). Pure: no I/O, no clock.
 */
import type { Intervention } from "../schema/case.js";
import type { DoseQuantity, DoseRoute, DoseSpec, DoseUnit, OrderedDose } from "../schema/common.js";
import type { DoseConflict } from "../schema/session.js";

/** A ratio this far from 1 — ×10 or more, ÷10 or more — is a tenfold error: always critical. */
export const TENFOLD = 10;
/**
 * How far an amount may be from a weight-based dose converted through the patient's weight (either way round) and
 * still be the same dose: weight-based doses are rounded in practice (15 mg/kg at 23 kg is given as 350 mg).
 */
export const WEIGHT_BASED_TOLERANCE = 0.1;
/** Relative tolerance of every other comparison: floating point only (500 microgram is 0.5 mg exactly). */
const EXACT = 1e-9;

/** What a unit measures, whether per kg and per time, and its factor to the base (mg, mL, unit, mmol; per hour). */
interface UnitParts {
  dimension: "mass" | "volume" | "unit" | "mmol";
  perKg: boolean;
  rate: boolean;
  factor: number;
}

const QUANTITY: Record<DoseQuantity, { dimension: UnitParts["dimension"]; factor: number }> = {
  g: { dimension: "mass", factor: 1000 },
  mg: { dimension: "mass", factor: 1 },
  microgram: { dimension: "mass", factor: 0.001 },
  mL: { dimension: "volume", factor: 1 },
  unit: { dimension: "unit", factor: 1 },
  mmol: { dimension: "mmol", factor: 1 },
};

function unitParts(unit: DoseUnit): UnitParts {
  const [quantity, ...rest] = unit.split("/") as [DoseQuantity, ...string[]];
  const time = rest.find((x) => x === "h" || x === "min");
  const q = QUANTITY[quantity];
  return { dimension: q.dimension, perKg: rest.includes("kg"), rate: time != null, factor: q.factor * (time === "min" ? 60 : 1) };
}

const tidy = (x: number) => Math.round(x * 1e6) / 1e6;

/** How an order's dose compares with a preset (`compareDose`). */
export interface DoseComparison {
  /** Nothing conflicts: the order is the preset dose. */
  equivalent: boolean;
  /**
   * The ordered amount over the preset's after conversion — over the nearer end of a preset range, 1 inside it. Null
   * when the order states no amount or its unit cannot be compared with the preset's.
   */
  ratio: number | null;
  /** What conflicts (empty when equivalent). */
  conflicts: DoseConflict[];
}

/**
 * Compare an order's dose with a preset. Amounts are converted to a common unit: g, mg and microgram into one
 * another, per minute into per hour, and a dose per kg into an absolute one through `weightKg` (the case's
 * `patient.weightKg`; then within `WEIGHT_BASED_TOLERANCE`). A volume, units and millimoles compare only with
 * themselves — a volume is never read as a mass (the concentration is not known) — and a dose with a rate only with
 * a rate: anything else is a `unit` conflict. An amount within `[amount, upTo]` is the preset's; outside it is an
 * `amount` conflict. Routes conflict when both are stated and differ. A dose that states nothing conflicts with nothing.
 */
export function compareDose(ordered: OrderedDose, preset: DoseSpec, weightKg?: number): DoseComparison {
  const conflicts: DoseConflict[] = [];
  let ratio: number | null = null;
  if (ordered.amount != null && ordered.unit != null) {
    const o = unitParts(ordered.unit);
    const p = unitParts(preset.unit);
    const weight = weightKg != null && weightKg > 0 ? weightKg : null;
    if (o.dimension !== p.dimension || o.rate !== p.rate || (o.perKg !== p.perKg && weight == null)) conflicts.push("unit");
    else {
      // both per kg, or both absolute; else the one per kg is made absolute through the weight
      const mixed = o.perKg !== p.perKg;
      const scale = (perKg: boolean) => (mixed && perKg ? weight! : 1);
      const value = ordered.amount * o.factor * scale(o.perKg);
      const low = preset.amount * p.factor * scale(p.perKg);
      const high = (preset.upTo ?? preset.amount) * p.factor * scale(p.perKg);
      ratio = tidy(value < low ? value / low : value > high ? value / high : 1);
      const tolerance = mixed ? WEIGHT_BASED_TOLERANCE : EXACT;
      if (Math.abs(ratio - 1) > tolerance) conflicts.push("amount");
    }
  }
  if (ordered.route != null && preset.route != null && ordered.route !== preset.route) conflicts.push("route");
  return { equivalent: conflicts.length === 0, ratio, conflicts };
}

/**
 * How serious a dose error is: `critical` for a tenfold difference (ratio ≥ 10 or ≤ 0.1) or when the intervention is
 * `critical` or high-risk (any conflict there is dangerous); `warning` otherwise. Critical dose errors fail the
 * assessment's safety outcome.
 */
export function doseErrorSeverity(ratio: number | null, intervention: Pick<Intervention, "critical" | "risk">): "warning" | "critical" {
  const tenfold = ratio != null && (ratio >= TENFOLD || ratio <= 1 / TENFOLD);
  return tenfold || intervention.critical === true || intervention.risk === "high" ? "critical" : "warning";
}

/** A dose in words, technical (units as the schema writes them): "0.5 mg IM", "10–20 mg IV", "IV". */
export function formatDose(d: OrderedDose | DoseSpec): string {
  const upTo = "upTo" in d && d.upTo != null && d.upTo !== d.amount ? `–${d.upTo}` : "";
  const amount = d.amount != null && d.unit != null ? `${d.amount}${upTo} ${d.unit}` : "";
  return [amount, d.route ?? ""].filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Reading a written order                                             */
/* ------------------------------------------------------------------ */

/** A dose a text states: an amount (or a range `amount`–`upTo`) with its unit. */
export interface DoseMention {
  amount: number;
  upTo?: number;
  unit: DoseUnit;
}

/** A number: thousands separated by commas ("5,000"), else a decimal point or a decimal comma ("0,5"). */
const NUMBER = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d+)?(?!\d)|\d+(?:[.,]\d+)?|\.\d+)`;
const RANGE = String.raw`(?:\s*(?:-|–|—|~|～|to|至|到)\s*${NUMBER})?`;
/** Unit words, longest alternatives first; the quantity each means (litres become millilitres). */
const UNIT_WORDS: [RegExp, DoseQuantity | "L"][] = [
  [/^(?:microgram(?:me)?s?|mcgs?|μg|ug|微克)/u, "microgram"],
  [/^(?:milligram(?:me)?s?|mgs?|毫克)/u, "mg"],
  [/^(?:millilit(?:re|er)s?|mls?|cc|毫升)/u, "mL"],
  [/^(?:millimol(?:e)?s?|mmol|毫摩尔|毫摩)/u, "mmol"],
  [/^(?:gram(?:me)?s?|g|克)/u, "g"],
  [/^(?:lit(?:re|er)s?|l|升)/u, "L"],
  [/^(?:units?|iu|u|国际单位|单位)/u, "unit"],
];
const PER = String.raw`\s*(?:/|per\s+|每)\s*`;
const PER_KG = new RegExp(String.raw`^${PER}(?:kg|kilograms?|公斤|千克)(?![a-z])`, "u");
const PER_TIME = new RegExp(String.raw`^${PER}(h|hrs?|hours?|小时|min|mins|minutes?|分钟)(?![a-z])`, "u");
/**
 * A denominator that makes the number a concentration (1 mg/mL, 40 mmol/L), a dose per body-surface area (mg/m²) or
 * a daily total (50 mg/kg/day, 50 mg/kg/日 — but "500 mg每日1次" is 500 mg once a day): not a dose of this kind.
 */
const NOT_A_DOSE = new RegExp(String.raw`^(?:${PER}(?:ml|l|dl|毫升|升|m2)|\s*(?:/|per\s+)\s*(?:d|days?|天|日))(?![a-z])`, "u");
const AMOUNT = new RegExp(`${NUMBER}${RANGE}\\s*(万)?\\s*`, "gu");

/** A matched number's value: commas between thousands dropped, a decimal comma read as a point. */
const num = (s: string) => Number(/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s) ? s.replace(/,/g, "") : s.replace(",", "."));

/** The unit after an amount (at `rest`), with how much of `rest` it took; null when none follows or it is no dose. */
function unitAt(rest: string): { unit: DoseUnit; scale: number; length: number } | null {
  for (const [pattern, quantity] of UNIT_WORDS) {
    const m = pattern.exec(rest);
    if (!m) continue;
    let length = m[0].length;
    // an English unit is a whole word ("5 gtt" is no gram, "5 units" no "u")
    if (/[a-z]/.test(rest[length] ?? "")) continue;
    let unit: string = quantity === "L" ? "mL" : quantity;
    const kg = PER_KG.exec(rest.slice(length));
    if (kg) {
      unit += "/kg";
      length += kg[0].length;
    }
    const time = PER_TIME.exec(rest.slice(length));
    if (time) {
      unit += /^(?:h|hr|hrs|hour|hours|小时)$/u.test(time[1]!) ? "/h" : "/min";
      length += time[0].length;
    }
    if (NOT_A_DOSE.test(rest.slice(length))) return null;
    return { unit: unit as DoseUnit, scale: quantity === "L" ? 1000 : 1, length };
  }
  return null;
}

/**
 * Every dose a text states, in order: an amount (or a range, "2–3 mg") followed by its unit — "0.5 mg", "500
 * micrograms", "500mcg", "0.5毫克", "1 g", "20 mL/kg", "0.1 units/kg/h", "5 mg per hour", "40万单位". A
 * concentration ("1 mg/mL", "16 µg/mL", "40 mmol/L"), a percentage, a ratio ("1:1000") or a daily total
 * ("50 mg/kg/day") is not a dose. Numbers are Arabic numerals.
 */
export function doseMentions(text: string): DoseMention[] {
  const s = text.normalize("NFKC").toLowerCase();
  const out: DoseMention[] = [];
  for (const m of s.matchAll(AMOUNT)) {
    const before = s.slice(0, m.index);
    // a ratio's second number (1:1000), a digit run's tail, a percentage are not amounts
    if (/[\d.:]$/.test(before)) continue;
    const after = s.slice(m.index + m[0].length);
    const u = unitAt(after);
    if (!u) continue;
    const factor = (m[3] ? 10_000 : 1) * u.scale;
    const amount = num(m[1]!) * factor;
    const upTo = m[2] != null ? num(m[2]) * factor : undefined;
    if (!(amount > 0) || (upTo != null && !(upTo > amount))) continue;
    out.push({ amount: tidy(amount), ...(upTo != null ? { upTo: tidy(upTo) } : {}), unit: u.unit });
  }
  return out;
}

/** Route words (zh-CN and en, after NFKC and lower-casing). "IN" is never read as intranasal (it is the word "in"). */
const ROUTE_WORDS: [DoseRoute, RegExp][] = [
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

/** The route a text states; null when it names none, or more than one ("IV or IM" states none). */
export function doseRoute(text: string): DoseRoute | null {
  const s = text.normalize("NFKC").toLowerCase();
  const found = ROUTE_WORDS.filter(([, pattern]) => pattern.test(s)).map(([route]) => route);
  return found.length === 1 ? found[0]! : null;
}

/**
 * The dose a written order states (`intervene` `ordered.dose`): its first dose (`doseMentions`) and its route
 * (`doseRoute`). A range states no amount — which end was meant is not known. Null when it states neither.
 */
export function parseDose(text: string): OrderedDose | null {
  const first = doseMentions(text)[0];
  const route = doseRoute(text);
  const amount = first && first.upTo == null ? { amount: first.amount, unit: first.unit } : {};
  const dose: OrderedDose = { ...amount, ...(route ? { route } : {}) };
  return dose.amount != null || dose.route != null ? dose : null;
}
