/**
 * A patient's age as clinicians write it, from the recorded `patient.age` and `patient.ageUnit`: one formatter for
 * every front-end (the web world's name tag and portrait caption, the runtime's `/case` card) and for the
 * model-facing prompts, whatever unit a case stored the age in.
 *
 *   newborns   part of a day in the first week: completed hours ("18小时" / "18 hours", hour-specific neonatal
 *              charts); otherwise days, through the second month ("34天" / "34 days": febrile-infant guidance
 *              counts days to day 60)
 *   infants    completed months ("10个月" / "10 months"); under a month, days
 *   children   1–17 years: years, and the months when the record gives them ("8岁4个月" / "8 years 4 months",
 *              whether stored as 100 months or as 8.333… years)
 *   adults     18 and over: completed years ("74岁" / "74 years")
 *
 * Never a raw fraction ("4.083333333333333 years") and never a dozen months or more. Ages count completed units,
 * the clinical convention, so 21.2 years reads "21 years". Months and years convert exactly; days convert to months
 * at the mean month length (365.25 / 12 days). Pure: no I/O, no clock. The unit words are bilingual below.
 */
import { DEFAULT_LOCALE, type Locale } from "./i18n.js";
import type { Patient } from "./schema/index.js";

/** The units a case records an age in (`patient.ageUnit`). */
export type PatientAgeUnit = Patient["ageUnit"];

/** A unit an age is shown in: the recorded units, plus hours for a newborn's first days. */
export type PatientAgeDisplayUnit = PatientAgeUnit | "hours";

/** One part of a displayed age: a count of completed units ("8 years", then "4 months"). */
export interface PatientAgePart {
  n: number;
  unit: PatientAgeDisplayUnit;
}

/** What the formatter reads of a case's patient. */
export interface PatientAge {
  age: number;
  /** Absent means years, the schema's default. */
  ageUnit?: PatientAgeUnit;
}

/** The unit words: Chinese, then English singular and plural. */
const AGE_UNIT_WORDS: Readonly<Record<PatientAgeDisplayUnit, { "zh-CN": string; en: readonly [string, string] }>> = {
  years: { "zh-CN": "岁", en: ["year", "years"] },
  months: { "zh-CN": "个月", en: ["month", "months"] },
  days: { "zh-CN": "天", en: ["day", "days"] },
  hours: { "zh-CN": "小时", en: ["hour", "hours"] },
};

const DAYS_PER_MONTH = 365.25 / 12;
/** Binary fractions: (11 + 5/12) × 12 is 136.99999999999997, which is 137 completed months. */
const EPSILON = 1e-6;
/** Part of a day is shown in hours through the first week (168 hours). */
const HOURS_BEFORE_DAY = 7;
/** Whole days are kept through day 60. */
const LAST_DAY_IN_DAYS = 60;
const ADULT_YEARS = 18;

/** Completed units of `x`, tolerating binary-fraction noise. */
function completed(x: number, tolerance = EPSILON): number {
  return Math.max(0, Math.floor(x + tolerance));
}

function isWhole(x: number): boolean {
  return Math.abs(x - Math.round(x)) < EPSILON;
}

/** Months of a child or an adult: months under a year, then years (and the months of a child). */
function fromMonths(totalMonths: number, tolerance = EPSILON): PatientAgePart[] {
  const months = completed(totalMonths, tolerance);
  if (months < 12) return [{ n: months, unit: "months" }];
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return years >= ADULT_YEARS || rest === 0 ? [{ n: years, unit: "years" }] : [{ n: years, unit: "years" }, { n: rest, unit: "months" }];
}

/**
 * The recorded age in the units a clinician would write it, largest first: `[{ n: 8, unit: "years" }, { n: 4,
 * unit: "months" }]` for 100 months. An age of 0 keeps its recorded unit; an invalid one reads as 0.
 */
export function patientAgeParts(patient: PatientAge): PatientAgePart[] {
  const unit = patient.ageUnit ?? "years";
  const age = patient.age;
  if (!Number.isFinite(age) || age <= 0) return [{ n: 0, unit }];
  switch (unit) {
    case "days":
      if (age < 1 || (!isWhole(age) && age < HOURS_BEFORE_DAY)) return [{ n: completed(age * 24), unit: "hours" }];
      if (completed(age) <= LAST_DAY_IN_DAYS) return [{ n: completed(age), unit: "days" }];
      // Mean-length months: half a day of tolerance, so 365 days is a year.
      return fromMonths(age / DAYS_PER_MONTH, 0.5 / DAYS_PER_MONTH);
    case "months":
      return age < 1 ? patientAgeParts({ age: age * DAYS_PER_MONTH, ageUnit: "days" }) : fromMonths(age);
    default:
      return age < 1 ? patientAgeParts({ age: age * 12, ageUnit: "months" }) : fromMonths(age * 12);
  }
}

function isZh(locale: Locale): boolean {
  return locale.toLowerCase().startsWith("zh");
}

/**
 * The patient's age for learners in `locale` (`patientAgeParts`): "8岁4个月", "18小时", "74岁" / "8 years 4 months",
 * "18 hours", "1 year" — Chinese close-set, English spaced with singular and plural; other locales read English.
 */
export function patientAgeText(patient: PatientAge, locale: Locale = DEFAULT_LOCALE): string {
  const parts = patientAgeParts(patient);
  if (isZh(locale)) return parts.map((p) => `${p.n}${AGE_UNIT_WORDS[p.unit]["zh-CN"]}`).join("");
  return parts.map((p) => `${p.n} ${AGE_UNIT_WORDS[p.unit].en[p.n === 1 ? 0 : 1]}`).join(" ");
}

/**
 * The age as an English compound adjective, for the model-facing prompts ("a 74-year-old male patient"):
 * "74-year-old", "8-year-4-month-old", "18-hour-old".
 */
export function patientAgeAdjective(patient: PatientAge): string {
  return `${patientAgeParts(patient)
    .map((p) => `${p.n}-${AGE_UNIT_WORDS[p.unit].en[0]}`)
    .join("-")}-old`;
}
