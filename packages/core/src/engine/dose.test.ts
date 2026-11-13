/**
 * Doses (docs/PROTOCOL.md §3.2): what a written order states, and how it compares with an intervention's preset
 * after unit conversion — the tenfold difference a free-text order must never lose (audit 2026-11-12, P0-2).
 */
import { describe, expect, it } from "vitest";
import { DOSE_UNITS, DoseSpecSchema, OrderedDoseSchema } from "../schema/common.js";
import { checkOrder, compareDose, doseErrorSeverity, doseMentions, doseRoute, formatDose, parseDose, readOrder } from "./index.js";

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
    // a volume with the strength the order states is the dose it holds (0.5 mL of 1 mg/mL is 0.5 mg)
    expect(parseDose("adrenaline 1 mg/mL, 0.5 mL IM")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("adrenaline 1:1000 IM")).toEqual({ route: "IM" });
    expect(parseDose("20% mannitol 125 mL IV")).toEqual({ amount: 125, unit: "mL", route: "IV" });
    expect(parseDose("KCl 40 mmol/L in 1000 mL")).toEqual({ amount: 40, unit: "mmol" });
    // an oxygen flow is no dose
    expect(parseDose("oxygen 15 L/min via non-rebreather")).toBeNull();
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

  it("critical: tenfold for any medicine; for a critical or high-risk one also twice the dose or another route", () => {
    // tenfold either way, whatever the drug
    expect(doseErrorSeverity(10, ["amount"], { risk: "moderate" })).toBe("critical");
    expect(doseErrorSeverity(0.1, ["amount"], { risk: "low" })).toBe("critical");
    expect(doseErrorSeverity(9.9, ["amount"], { risk: "low" })).toBe("warning");
    expect(doseErrorSeverity(2, ["amount"], { risk: "moderate" })).toBe("warning");
    expect(doseErrorSeverity(1, ["route"], { risk: "moderate" })).toBe("warning");
    // a high-risk or critical intervention: twice the preset or more, or another route
    expect(doseErrorSeverity(2, ["amount"], { risk: "high" })).toBe("critical");
    expect(doseErrorSeverity(2.2, ["amount"], { risk: "low", critical: true })).toBe("critical");
    expect(doseErrorSeverity(1, ["route"], { risk: "high" })).toBe("critical");
    // …but a rounding or weight-band difference, or an under-dose that is not tenfold, is a warning
    expect(doseErrorSeverity(1.125, ["amount"], { risk: "high", critical: true })).toBe("warning");
    expect(doseErrorSeverity(1.9, ["amount"], { risk: "high" })).toBe("warning");
    expect(doseErrorSeverity(0.5, ["amount"], { risk: "high", critical: true })).toBe("warning");
    expect(doseErrorSeverity(0.11, ["amount"], { risk: "high" })).toBe("warning");
    expect(formatDose({ amount: 10, upTo: 20, unit: "mg", route: "IV" })).toBe("10–20 mg IV");
    expect(formatDose({ route: "IV" })).toBe("IV");
  });
});

describe("readOrder: numbers in words, concentrations, and doses that cannot be read (audit P0-2, review)", () => {
  it("reads Chinese numerals and English number words before a unit", () => {
    expect(parseDose("肌注肾上腺素五毫克")).toEqual({ amount: 5, unit: "mg", route: "IM" });
    expect(parseDose("肌注肾上腺素零点五毫克")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("肌注肾上腺素5个毫克")).toEqual({ amount: 5, unit: "mg", route: "IM" });
    expect(parseDose("胰岛素四个单位皮下")).toEqual({ amount: 4, unit: "unit", route: "SC" });
    expect(parseDose("八十万单位青霉素")).toEqual({ amount: 800000, unit: "unit" });
    expect(parseDose("两千单位肝素")).toEqual({ amount: 2000, unit: "unit" });
    expect(parseDose("IM adrenaline five milligrams")).toEqual({ amount: 5, unit: "mg", route: "IM" });
    expect(parseDose("IM adrenaline zero point five mg")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("IM adrenaline half a milligram")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("one hundred and fifty milligrams of aspirin")).toEqual({ amount: 150, unit: "mg" });
    // a number word without a unit is no dose ("give one dose", "第一针")
    expect(parseDose("give one dose of adrenaline")).toBeNull();
  });

  it("reads a volume through the strength the order states, and a preparation as the rate it delivers", () => {
    expect(parseDose("IM adrenaline 0.5 mL of 1 mg/mL")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("IM adrenaline 1:1000 0.5 mL")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(parseDose("肌注1:1000肾上腺素0.5ml")).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    expect(doseMentions("IM adrenaline 1:1000 0.5 mL")).toEqual([{ amount: 0.5, unit: "mg", volume: { amount: 0.5, unit: "mL" } }]);
    // the syringe or bag is how it is made up, the rate is the dose
    expect(parseDose("insulin 50 units in 50 mL at 5.5 mL/h")).toEqual({ amount: 5.5, unit: "unit/h" });
    expect(parseDose("胰岛素 50U+NS 50ml 5.5ml/h 泵入")).toEqual({ amount: 5.5, unit: "unit/h" });
    expect(parseDose("0.9% NaCl 1000 mL with KCl 40 mmol at 500 mL/h")).toEqual({ amount: 20, unit: "mmol/h" });
    // a preparation alone is the dose it holds; a volume without a strength stays a volume
    expect(parseDose("IM adrenaline 5 mg in 5 mL")).toEqual({ amount: 5, unit: "mg", route: "IM" });
    expect(parseDose("肌注肾上腺素0.3毫升")).toEqual({ amount: 0.3, unit: "mL", route: "IM" });
  });

  it("marks what it cannot read: a fraction, a broken number, five-or-five-thousand, a placeholder, a range, a bare number", () => {
    const unclear = (text: string) => readOrder(text).unclear;
    expect(unclear("肌注肾上腺素0。5mg")).toEqual({ reason: "unreadable", words: "0。5mg" });
    expect(unclear("adrenaline 1/2 mg IM")).toEqual({ reason: "unreadable", words: "1/2 mg" });
    expect(unclear("heparin 5.000 units IV")).toEqual({ reason: "unreadable", words: "5.000 units" });
    expect(unclear("肌注肾上腺素几毫克")).toEqual({ reason: "unreadable", words: "几毫克" });
    expect(unclear("IM adrenaline x mg")).toEqual({ reason: "unreadable", words: "x mg" });
    expect(unclear("IM adrenaline 0.5–1 mg")).toEqual({ reason: "range", words: "0.5–1 mg" });
    expect(unclear("IM adrenaline 0.5")).toEqual({ reason: "no-unit", words: "0.5" });
    // places and counts are not doses
    expect(unclear("adrenaline to bed 3")).toBeNull();
    expect(unclear("IM adrenaline 0.5 mg")).toBeNull();
    // nothing read in their place: no amount
    expect(parseDose("肌注肾上腺素0。5mg")).toEqual({ route: "IM" });
  });
});

describe("checkOrder: an order as written against an intervention's preset", () => {
  const im = { doseSpec: { amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" }, risk: "moderate" } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1] = im, weightKg?: number) => checkOrder({ text }, iv, weightKg);

  it("gives an equivalent dose, written any way, with the dose read", () => {
    for (const text of ["IM adrenaline 0.5 mg", "adrenaline 500 micrograms IM", "肾上腺素0.5毫克肌注", "肌注肾上腺素零点五毫克", "EpiPen 0.3 mg IM", "IM adrenaline 0.5 mL of 1 mg/mL", "肌注1:1000肾上腺素0.5ml"]) {
      expect(check(text), text).toMatchObject({ outcome: "given", checked: true });
    }
    expect(check("IM adrenaline 0.5 mL of 1 mg/mL")).toEqual({ outcome: "given", checked: true, dose: { amount: 0.5, unit: "mg", route: "IM" } });
    // an order that states no dose gives the preset; an intervention without a preset is not checked
    expect(check("give the adrenaline now")).toEqual({ outcome: "given", checked: true, dose: null });
    expect(checkOrder({ text: "IM adrenaline 5 mg" }, { risk: "moderate" })).toEqual({ outcome: "given", checked: false, dose: { amount: 5, unit: "mg", route: "IM" } });
  });

  it("refuses a conflicting dose or route as a dose error — in figures, in words or in Chinese numerals", () => {
    for (const text of ["IM adrenaline 5 mg", "肌注肾上腺素 5 mg", "肌注肾上腺素五毫克", "IM adrenaline five milligrams", "肌注肾上腺素5个毫克"]) {
      expect(check(text), text).toEqual({ outcome: "conflict", dose: { amount: 5, unit: "mg", route: "IM" }, ratio: 10, conflicts: ["amount"], severity: "critical" });
    }
    expect(check("IM adrenaline 1 mg")).toMatchObject({ outcome: "conflict", ratio: 2, severity: "warning" });
    expect(check("adrenaline 0.5 mg IV")).toMatchObject({ outcome: "conflict", conflicts: ["route"], severity: "warning" });
  });

  it("asks about a dose it cannot read or compare: nothing given, no dose error", () => {
    expect(check("肌注肾上腺素0。5mg")).toEqual({ outcome: "query", reason: "unreadable", words: "0。5mg", dose: { route: "IM" } });
    expect(check("IM adrenaline 0.5")).toMatchObject({ outcome: "query", reason: "no-unit" });
    expect(check("IM adrenaline 0.5–1 mg")).toMatchObject({ outcome: "query", reason: "range" });
    // a volume without its strength; a dose per kg without the weight; a rate against a single dose
    expect(check("肌注肾上腺素0.3毫升")).toEqual({ outcome: "query", reason: "strength", words: null, dose: { amount: 0.3, unit: "mL", route: "IM" } });
    expect(check("adrenaline 0.01 mg/kg IM")).toMatchObject({ outcome: "query", reason: "weight" });
    const ufh = { doseSpec: { amount: 70, upTo: 80, unit: "unit/kg", route: "IV" }, risk: "moderate" } as const;
    expect(check("heparin infusion 18 units/kg/h", ufh, 70)).toMatchObject({ outcome: "query", reason: "rate" });
    const insulin = { doseSpec: { amount: 0.1, unit: "unit/kg/h", route: "IV" }, risk: "moderate", critical: true } as const;
    expect(check("insulin 50 units in 50 mL", insulin, 55)).toMatchObject({ outcome: "query", reason: "rate" });
  });

  it("reads a dose given in parts as their total, and the dose in the preset's form when the order gives several", () => {
    const alteplase = { doseSpec: { amount: 0.9, unit: "mg/kg", route: "IV" }, risk: "high", critical: true } as const;
    expect(check("IV alteplase 7.2 mg bolus then 64.8 mg over 60 min", alteplase, 80)).toEqual({ outcome: "given", checked: true, dose: { amount: 72, unit: "mg", route: "IV" } });
    expect(check("阿替普酶 7.2 mg 静推，余 64.8 mg 60分钟泵入", alteplase, 80)).toMatchObject({ outcome: "given", dose: { amount: 72, unit: "mg" } });
    const ufh = { doseSpec: { amount: 70, upTo: 80, unit: "unit/kg", route: "IV" }, risk: "moderate" } as const;
    expect(check("heparin 80 units/kg IV bolus then 18 units/kg/h", ufh, 70)).toMatchObject({ outcome: "given", dose: { amount: 80, unit: "unit/kg" } });
    // a weight-band dose within 10 % of the preset range through the weight; a thrombolytic at twice the dose is critical
    const tnk = { doseSpec: { amount: 0.25, upTo: 0.28, unit: "mg/kg", route: "IV" }, risk: "high", critical: true } as const;
    expect(check("IV tenecteplase 22.5 mg bolus", tnk, 80)).toMatchObject({ outcome: "given" });
    expect(check("IV tenecteplase 25 mg", tnk, 80)).toMatchObject({ outcome: "conflict", severity: "warning" });
    expect(check("IV tenecteplase 50 mg", tnk, 80)).toMatchObject({ outcome: "conflict", severity: "critical" });
    expect(check("tenecteplase 4 mL", tnk, 80)).toMatchObject({ outcome: "query", reason: "strength" });
  });

  it("reads the words itself: a client's dose the words do not state is not believed (review: the engine trusted the client)", () => {
    // the words say 5 mg; a client that read 0.5 mg (or none) does not hide it
    expect(checkOrder({ text: "IM adrenaline 5 mg", dose: { amount: 0.5, unit: "mg", route: "IM" } }, im)).toMatchObject({ outcome: "conflict", ratio: 10, severity: "critical" });
    expect(checkOrder({ text: "IM adrenaline 5 mg", dose: { route: "IM" } }, im)).toMatchObject({ outcome: "conflict", ratio: 10 });
    // a client's choice among the doses the words state is kept
    expect(checkOrder({ text: "adrenaline 0.5 mg IM (not 5 mg)", dose: { amount: 0.5, unit: "mg", route: "IM" } }, im)).toMatchObject({ outcome: "given", dose: { amount: 0.5, unit: "mg", route: "IM" } });
  });
});
