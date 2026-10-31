import { afterEach, expect, test } from "vitest";
import { setLocale } from "../i18n/index.js";
import { patientAgeText } from "./patient-age.js";

afterEach(() => setLocale("zh-CN"));

test("preserves recorded neonatal hours and paediatric months in both languages", () => {
  setLocale("zh-CN");
  expect(patientAgeText(18 / 24, "days")).toBe("18小时");
  expect(patientAgeText(38 / 24, "days")).toBe("38小时");
  expect(patientAgeText(45 / 24, "days")).toBe("45小时");
  expect(patientAgeText(11 + 5 / 12)).toBe("11岁5个月");
  setLocale("en");
  expect(patientAgeText(18 / 24, "days")).toBe("18 hours");
  expect(patientAgeText(4 + 1 / 12)).toBe("4 years 1 month");
  expect(patientAgeText(1, "days")).toBe("1 day");
  expect(patientAgeText(10, "months")).toBe("10 months");
});

test("does not round ages that are not exact hours or months", () => {
  setLocale("en");
  expect(patientAgeText(21.2)).toBe("21.2 years");
  expect(patientAgeText(1.2, "days")).toBe("1.2 days");
  expect(patientAgeText(48)).toBe("48 years");
});
