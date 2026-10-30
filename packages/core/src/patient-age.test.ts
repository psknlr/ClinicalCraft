/**
 * A patient's age reads as clinicians write it, in both languages, whatever unit the case stored it in: hours and
 * days for a newborn, months for an infant, years and months for a child, completed years for an adult — never a
 * raw fraction, never a dozen months or more.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { patientAgeAdjective, patientAgeParts, patientAgeText, type PatientAge } from "./index.js";

const zh = (age: number, ageUnit?: PatientAge["ageUnit"]) => patientAgeText({ age, ageUnit }, "zh-CN");
const en = (age: number, ageUnit?: PatientAge["ageUnit"]) => patientAgeText({ age, ageUnit }, "en");

describe("patient age", () => {
  it("gives a newborn's first days in completed hours", () => {
    expect(zh(18 / 24, "days")).toBe("18小时");
    expect(en(18 / 24, "days")).toBe("18 hours");
    // the stored binary fractions of the library's newborns (cmcr-639083, cmcr-33497, cmcr-44848, cmcr-655460)
    expect(en(0.4583333333333333, "days")).toBe("11 hours");
    expect(en(0.6666666666666666, "days")).toBe("16 hours");
    expect(zh(1.5833333333333333, "days")).toBe("38小时");
    expect(zh(45 / 24, "days")).toBe("45小时");
    expect(en(1 / 24, "days")).toBe("1 hour");
    // part of a day that is not a whole hour: completed hours, not "1.2 days"
    expect(en(1.2, "days")).toBe("28 hours");
  });

  it("keeps whole days through day 60, then months", () => {
    expect(en(1, "days")).toBe("1 day");
    expect(zh(8, "days")).toBe("8天");
    expect(en(34, "days")).toBe("34 days");
    expect(zh(60, "days")).toBe("60天");
    expect(en(10.5, "days")).toBe("10 days");
    expect(en(61, "days")).toBe("2 months");
    expect(en(365, "days")).toBe("1 year");
    expect(zh(400, "days")).toBe("1岁1个月");
  });

  it("gives an infant's age under a year in months, and days under a month", () => {
    expect(zh(2, "months")).toBe("2个月");
    expect(en(1, "months")).toBe("1 month");
    expect(en(11, "months")).toBe("11 months");
    expect(en(10.5, "months")).toBe("10 months");
    expect(en(0.5, "months")).toBe("15 days");
    expect(zh(0.5)).toBe("6个月");
    expect(en(0.25)).toBe("3 months");
  });

  it("turns 12 months or more into years and months", () => {
    expect(zh(12, "months")).toBe("1岁");
    expect(en(12, "months")).toBe("1 year");
    expect(en(13, "months")).toBe("1 year 1 month");
    expect(zh(18, "months")).toBe("1岁6个月");
    expect(en(23, "months")).toBe("1 year 11 months");
  });

  it("gives a child of two or more years and months, never dozens of months", () => {
    expect(en(24, "months")).toBe("2 years");
    expect(zh(37, "months")).toBe("3岁1个月");
    expect(zh(45, "months")).toBe("3岁9个月");
    // cmcr-33610: 100 months, titled "8岁4月男孩" / "boy aged 8 years 4 months"
    expect(zh(100, "months")).toBe("8岁4个月");
    expect(en(100, "months")).toBe("8 years 4 months");
    expect(en(216, "months")).toBe("18 years");
  });

  it("reads a fractional year as years and months, without the fraction", () => {
    expect(zh(11 + 5 / 12)).toBe("11岁5个月");
    expect(zh(11.583333333333334)).toBe("11岁7个月");
    expect(en(4.083333333333333)).toBe("4 years 1 month");
    expect(zh(9.25)).toBe("9岁3个月");
    expect(en(16.583333333333332)).toBe("16 years 7 months");
    expect(en(17.99)).toBe("17 years 11 months");
    expect(en(6)).toBe("6 years");
  });

  it("gives an adult completed years only", () => {
    expect(zh(48)).toBe("48岁");
    expect(en(48)).toBe("48 years");
    expect(en(21.2)).toBe("21 years");
    expect(en(18.75)).toBe("18 years");
    expect(en(74, "years")).toBe("74 years");
  });

  it("parts, the English adjective for prompts, other locales and edge values", () => {
    expect(patientAgeParts({ age: 100, ageUnit: "months" })).toEqual([
      { n: 8, unit: "years" },
      { n: 4, unit: "months" },
    ]);
    expect(patientAgeAdjective({ age: 58 })).toBe("58-year-old");
    expect(patientAgeAdjective({ age: 100, ageUnit: "months" })).toBe("8-year-4-month-old");
    expect(patientAgeAdjective({ age: 0.75, ageUnit: "days" })).toBe("18-hour-old");
    expect(patientAgeAdjective({ age: 10, ageUnit: "months" })).toBe("10-month-old");
    expect(patientAgeText({ age: 4.083333333333333 }, "zh")).toBe("4岁1个月");
    expect(patientAgeText({ age: 4.083333333333333 }, "en-GB")).toBe("4 years 1 month");
    expect(patientAgeText({ age: 4.083333333333333 }, "fr")).toBe("4 years 1 month");
    expect(patientAgeText({ age: 58 })).toBe("58岁");
    expect(en(0)).toBe("0 years");
    expect(zh(0, "days")).toBe("0天");
    expect(en(Number.NaN)).toBe("0 years");
  });

  it("never shows a fraction or a dozen months or more, for any month count or the library's own patients", () => {
    const shown: PatientAge[] = [];
    for (let m = 0; m <= 240; m++) shown.push({ age: m, ageUnit: "months" }, { age: m / 12 });
    for (let d = 0; d <= 400; d++) shown.push({ age: d, ageUnit: "days" }, { age: d / 24, ageUnit: "days" });
    const cases = new URL("../../content/cases/", import.meta.url);
    for (const dir of readdirSync(cases)) {
      const patient = (JSON.parse(readFileSync(new URL(`${dir}/case.json`, cases), "utf8")) as { patient: PatientAge }).patient;
      shown.push(patient);
    }
    expect(shown.length).toBeGreaterThan(1000);
    for (const patient of shown) {
      for (const text of [patientAgeText(patient, "zh-CN"), patientAgeText(patient, "en")]) expect(text, JSON.stringify(patient)).not.toMatch(/\./);
      for (const part of patientAgeParts(patient)) {
        expect(Number.isInteger(part.n), JSON.stringify(patient)).toBe(true);
        if (part.unit === "months") expect(part.n, JSON.stringify(patient)).toBeLessThan(12);
      }
    }
  });
});
