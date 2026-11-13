/**
 * Doses (docs/PROTOCOL.md §3.2): what a written order states, and how it compares with an intervention's preset
 * after unit conversion — the tenfold difference a free-text order must never lose (audit 2026-11-12, P0-2).
 */
import { describe, expect, it } from "vitest";
import { DOSE_UNITS, DoseSpecSchema, OrderedDoseSchema } from "../schema/common.js";
import { compareDose, doseErrorSeverity, doseMentions, doseRoute, formatDose, parseDose } from "./index.js";

describe("parseDose: the dose a written order states", () => {
  it("reads the amount, its unit and the route, in English and Chinese", () => {
    expect(parseDose("IM adrenaline 0.5 mg")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("IM adrenaline 5 mg")).toEqual({ amount: 5, unit: "mg", route: "IM" });
    expect(parseDose("肌注肾上腺素 5 mg")).toEqual({ amount: 5, unit: "mg", route: "IM" });
    expect(parseDose("肾上腺素0.5毫克肌内注射")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("adrenaline 500 micrograms intramuscularly")).toEqual({ amount: 500, unit: "microgram", route: "IM" });
    expect(parseDose("adrenaline 500mcg i.m.")).toEqual({ amount: 500, unit: "microgram", route: "IM" });
    // the micro sign and the Greek mu, full-width digits
    expect(parseDose("adrenaline 500 µg IM")).toEqual({ amount: 500, unit: "microgram", route: "IM" });
    expect(parseDose("adrenaline 500 μg IM")).toEqual({ amount: 500, unit: "microgram", route: "IM" });
    expect(parseDose("肾上腺素０．５ｍｇ肌注")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    // a decimal comma is a decimal; a thousands separator is not; plurals of abbreviations
    expect(parseDose("adrenaline 0,5 mg IM")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("500 mcgs IM")).toEqual({ amount: 500, unit: "microgram", route: "IM" });
  });

  it("reads weight-based doses and rates, litres as millilitres, and 万 as ten thousand", () => {
    expect(parseDose("alteplase 0.9 mg/kg IV")).toEqual({ amount: 0.9, unit: "mg/kg", route: "IV" });
    expect(parseDose("insulin 0.1 units/kg/h IV infusion")).toEqual({ amount: 0.1, unit: "unit/kg/h", route: "IV" });
    expect(parseDose("noradrenaline 0.05 mcg/kg/min")).toEqual({ amount: 0.05, unit: "microgram/kg/min" });
    expect(parseDose("nicardipine 5 mg per hour")).toEqual({ amount: 5, unit: "mg/h" });
    expect(parseDose("Hartmann's 1 L over an hour")).toEqual({ amount: 1000, unit: "mL" });
    expect(parseDose("bolus 20 mL/kg")).toEqual({ amount: 20, unit: "mL/kg" });
    expect(parseDose("heparin 5,000 U IV bolus")).toEqual({ amount: 5000, unit: "unit", route: "IV" });
    expect(parseDose("青霉素80万单位肌注")).toEqual({ amount: 800000, unit: "unit", route: "IM" });
    expect(parseDose("KCl 20 mmol/h")).toEqual({ amount: 20, unit: "mmol/h" });
  });

  it("skips concentrations, percentages, ratios and daily totals; a range states no amount", () => {
    expect(parseDose("adrenaline 1 mg/mL, 0.5 mL IM")).toEqual({ amount: 0.5, unit: "mL", route: "IM" });
    expect(parseDose("adrenaline 1:1000 IM")).toEqual({ route: "IM" });
    expect(parseDose("20% mannitol 125 mL IV")).toEqual({ amount: 125, unit: "mL", route: "IV" });
    expect(parseDose("KCl 40 mmol/L in 1000 mL")).toEqual({ amount: 1000, unit: "mL" });
    expect(parseDose("amoxicillin 50 mg/kg/day")).toBeNull();
    expect(parseDose("阿莫西林50 mg/kg/日")).toBeNull();
    expect(parseDose("二甲双胍500 mg每日1次")).toEqual({ amount: 500, unit: "mg" }); // once a day, not a daily total
    expect(parseDose("morphine 2-3 mg IV")).toEqual({ route: "IV" });
    expect(doseMentions("morphine 2–3 mg IV, up to 0.1 mg/kg")).toEqual([
      { amount: 2, upTo: 3, unit: "mg" },
      { amount: 0.1, unit: "mg/kg" },
    ]);
  });

  it("states no route when it names none or more than one, and never reads the word 'in' as intranasal", () => {
    expect(parseDose("give adrenaline now")).toBeNull();
    expect(parseDose("adrenaline 0.5 mg IV or IM")).toEqual({ amount: 0.5, unit: "mg" });
    expect(doseRoute("salbutamol 5 mg nebulised")).toBe("INH");
    expect(doseRoute("aspirin 300 mg chewed")).toBe("PO");
    expect(doseRoute("midazolam in 5 minutes")).toBeNull();
    expect(doseRoute("midazolam 5 mg intranasally")).toBe("IN");
    expect(doseRoute("I'm giving adrenaline")).toBeNull();
    expect(doseRoute("硝酸甘油舌下含服")).toBe("SL");
    expect(doseRoute("morphine 2.5 mg IV p.r.n.")).toBe("IV"); // as needed, not rectal
    expect(doseRoute("paracetamol 1 g PR")).toBe("PR");
  });

  it("always yields a dose the action schema accepts", () => {
    for (const text of ["IM adrenaline 5 mg", "肌注肾上腺素 5 mg", "IV", "0.1 units/kg/h", "青霉素80万单位肌注"]) {
      const dose = parseDose(text);
      expect(dose && OrderedDoseSchema.safeParse(dose).success, text).toBe(true);
    }
    expect(DOSE_UNITS).toContain("microgram/kg/min");
    expect(DOSE_UNITS).toHaveLength(36);
  });
});

describe("compareDose: an order against the preset", () => {
  const adrenaline = { amount: 0.5, unit: "mg", route: "IM" } as const;

  it("an equivalent dose in other units is the preset's", () => {
    expect(compareDose({ amount: 500, unit: "microgram", route: "IM" }, adrenaline)).toEqual({ equivalent: true, ratio: 1, conflicts: [] });
    expect(compareDose({ amount: 0.0005, unit: "g" }, adrenaline)).toEqual({ equivalent: true, ratio: 1, conflicts: [] });
    // a stated route alone, the same route
    expect(compareDose({ route: "IM" }, adrenaline)).toEqual({ equivalent: true, ratio: null, conflicts: [] });
  });

  it("a tenfold dose conflicts, with its ratio; so does another route", () => {
    expect(compareDose({ amount: 5, unit: "mg", route: "IM" }, adrenaline)).toEqual({ equivalent: false, ratio: 10, conflicts: ["amount"] });
    expect(compareDose({ amount: 50, unit: "microgram" }, adrenaline)).toEqual({ equivalent: false, ratio: 0.1, conflicts: ["amount"] });
    expect(compareDose({ amount: 0.5, unit: "mg", route: "IV" }, adrenaline)).toEqual({ equivalent: false, ratio: 1, conflicts: ["route"] });
    expect(compareDose({ route: "IV" }, adrenaline)).toEqual({ equivalent: false, ratio: null, conflicts: ["route"] });
  });

  it("never reads a volume as a mass, nor a bolus as a rate", () => {
    expect(compareDose({ amount: 0.5, unit: "mL" }, adrenaline)).toEqual({ equivalent: false, ratio: null, conflicts: ["unit"] });
    expect(compareDose({ amount: 0.5, unit: "mg/h" }, adrenaline)).toEqual({ equivalent: false, ratio: null, conflicts: ["unit"] });
    expect(compareDose({ amount: 500, unit: "mL" }, { amount: 500, unit: "mL" })).toMatchObject({ equivalent: true });
  });

  it("converts rates per minute and per hour, and a dose per kg through the weight (within 10 %)", () => {
    expect(compareDose({ amount: 3, unit: "microgram/min" }, { amount: 0.18, unit: "mg/h" })).toEqual({ equivalent: true, ratio: 1, conflicts: [] });
    const insulin = { amount: 0.1, unit: "unit/kg/h", route: "IV" } as const;
    expect(compareDose({ amount: 7, unit: "unit/h" }, insulin, 70)).toEqual({ equivalent: true, ratio: 1, conflicts: [] });
    expect(compareDose({ amount: 70, unit: "unit/h" }, insulin, 70)).toEqual({ equivalent: false, ratio: 10, conflicts: ["amount"] });
    // rounded: 15 mg/kg at 23 kg is 345 mg, given as 350 mg
    expect(compareDose({ amount: 350, unit: "mg" }, { amount: 15, unit: "mg/kg" }, 23)).toMatchObject({ equivalent: true });
    expect(compareDose({ amount: 400, unit: "mg" }, { amount: 15, unit: "mg/kg" }, 23)).toMatchObject({ equivalent: false, conflicts: ["amount"] });
    // without a weight a dose per kg cannot be compared with an absolute one
    expect(compareDose({ amount: 7, unit: "unit/h" }, insulin)).toEqual({ equivalent: false, ratio: null, conflicts: ["unit"] });
  });

  it("an amount within a preset range is the preset's; outside it, the ratio is to the nearer end", () => {
    const labetalol = DoseSpecSchema.parse({ amount: 10, upTo: 20, unit: "mg", route: "IV" });
    expect(compareDose({ amount: 15, unit: "mg" }, labetalol)).toEqual({ equivalent: true, ratio: 1, conflicts: [] });
    expect(compareDose({ amount: 200, unit: "mg" }, labetalol)).toEqual({ equivalent: false, ratio: 10, conflicts: ["amount"] });
    expect(compareDose({ amount: 5, unit: "mg" }, labetalol)).toEqual({ equivalent: false, ratio: 0.5, conflicts: ["amount"] });
    expect(DoseSpecSchema.safeParse({ amount: 20, upTo: 10, unit: "mg" }).success).toBe(false);
  });

  it("a tenfold error, or any conflict on a critical or high-risk intervention, is critical", () => {
    expect(doseErrorSeverity(10, { risk: "moderate" })).toBe("critical");
    expect(doseErrorSeverity(0.1, { risk: "low" })).toBe("critical");
    expect(doseErrorSeverity(2, { risk: "moderate" })).toBe("warning");
    expect(doseErrorSeverity(null, { risk: "moderate" })).toBe("warning");
    expect(doseErrorSeverity(1.2, { risk: "high" })).toBe("critical");
    expect(doseErrorSeverity(null, { risk: "low", critical: true })).toBe("critical");
    expect(formatDose({ amount: 10, upTo: 20, unit: "mg", route: "IV" })).toBe("10–20 mg IV");
    expect(formatDose({ route: "IV" })).toBe("IV");
  });
});
