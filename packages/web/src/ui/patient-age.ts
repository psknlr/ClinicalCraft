import { tr, type MessageKey } from "../i18n/index.js";

type AgeUnit = "years" | "months" | "days";

function unitText(n: number, unit: AgeUnit | "hours"): string {
  const singular: Record<AgeUnit | "hours", MessageKey> = { years: "age.year", months: "age.month", days: "age.day", hours: "age.hour" };
  const plural: Record<AgeUnit | "hours", MessageKey> = { years: "age.years", months: "age.months", days: "age.days", hours: "age.hours" };
  return tr(n === 1 ? singular[unit] : plural[unit], { n });
}

/** Show recorded fractional ages in exact clinical units, without rounding an approximate age. */
export function patientAgeText(age: number, unit: AgeUnit = "years"): string {
  if (unit === "days" && !Number.isInteger(age)) {
    const hours = age * 24;
    if (Math.abs(hours - Math.round(hours)) < 1e-8) return unitText(Math.round(hours), "hours");
  }
  if (unit === "years" && !Number.isInteger(age)) {
    const totalMonths = age * 12;
    if (Math.abs(totalMonths - Math.round(totalMonths)) < 1e-8) {
      const years = Math.floor(Math.round(totalMonths) / 12);
      const months = Math.round(totalMonths) % 12;
      if (!years) return unitText(months, "months");
      if (!months) return unitText(years, "years");
      return tr("age.yearsAndMonths", { years: unitText(years, "years"), months: unitText(months, "months") });
    }
  }
  return unitText(age, unit);
}
