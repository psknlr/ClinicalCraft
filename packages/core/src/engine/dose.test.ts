/**
 * Doses (docs/PROTOCOL.md §3.2): what a written order states, and how it compares with an intervention's preset
 * after unit conversion — the tenfold difference a free-text order must never lose (audit 2026-11-12, P0-2).
 */
import { describe, expect, it } from "vitest";
import { DOSE_UNITS, DoseSpecSchema, OrderedDoseSchema } from "../schema/common.js";
import { checkOrder, compareDose, doseErrorSeverity, doseMentions, doseRoute, formatDose, infusionMinutes, isHighAlert, parseDose, readOrder } from "./index.js";

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

  it("skips concentrations, percentages, ratios, daily totals and caps; a range states its two ends", () => {
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
    expect(parseDose("morphine 2-3 mg IV")).toEqual({ amount: 2, upTo: 3, unit: "mg", route: "IV" });
    // a cumulative cap is no dose; a cap after a dose per kg is that dose's
    expect(doseMentions("morphine 2–3 mg IV, up to 0.1 mg/kg")).toEqual([{ amount: 2, upTo: 3, unit: "mg" }]);
    expect(doseMentions("tenecteplase 0.25 mg/kg IV (max 25 mg)")).toEqual([{ amount: 0.25, unit: "mg/kg", max: { amount: 25, unit: "mg" } }]);
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
    expect(compareDose({ amount: 500, unit: "microgram", route: "IM" }, adrenaline)).toEqual({ equivalent: true, ratio: 1, far: 1, conflicts: [] });
    expect(compareDose({ amount: 0.0005, unit: "g" }, adrenaline)).toEqual({ equivalent: true, ratio: 1, far: 1, conflicts: [] });
    // a stated route alone, the same route
    expect(compareDose({ route: "IM" }, adrenaline)).toEqual({ equivalent: true, ratio: null, far: null, conflicts: [] });
  });

  it("a tenfold dose conflicts, with its ratio; so does another route", () => {
    expect(compareDose({ amount: 5, unit: "mg", route: "IM" }, adrenaline)).toEqual({ equivalent: false, ratio: 10, far: 10, conflicts: ["amount"] });
    expect(compareDose({ amount: 50, unit: "microgram" }, adrenaline)).toEqual({ equivalent: false, ratio: 0.1, far: 0.1, conflicts: ["amount"] });
    expect(compareDose({ amount: 0.5, unit: "mg", route: "IV" }, adrenaline)).toEqual({ equivalent: false, ratio: 1, far: 1, conflicts: ["route"] });
    expect(compareDose({ route: "IV" }, adrenaline)).toEqual({ equivalent: false, ratio: null, far: null, conflicts: ["route"] });
  });

  it("never reads a volume as a mass, nor a bolus as a rate", () => {
    expect(compareDose({ amount: 0.5, unit: "mL" }, adrenaline)).toEqual({ equivalent: false, ratio: null, far: null, conflicts: ["unit"] });
    expect(compareDose({ amount: 0.5, unit: "mg/h" }, adrenaline)).toEqual({ equivalent: false, ratio: null, far: null, conflicts: ["unit"] });
    expect(compareDose({ amount: 500, unit: "mL" }, { amount: 500, unit: "mL" })).toMatchObject({ equivalent: true });
  });

  it("converts rates per minute and per hour, and a dose per kg through the weight (within 10 %)", () => {
    expect(compareDose({ amount: 3, unit: "microgram/min" }, { amount: 0.18, unit: "mg/h" })).toEqual({ equivalent: true, ratio: 1, far: 1, conflicts: [] });
    const insulin = { amount: 0.1, unit: "unit/kg/h", route: "IV" } as const;
    expect(compareDose({ amount: 7, unit: "unit/h" }, insulin, 70)).toEqual({ equivalent: true, ratio: 1, far: 1, conflicts: [] });
    expect(compareDose({ amount: 70, unit: "unit/h" }, insulin, 70)).toEqual({ equivalent: false, ratio: 10, far: 10, conflicts: ["amount"] });
    // rounded: 15 mg/kg at 23 kg is 345 mg, given as 350 mg
    expect(compareDose({ amount: 350, unit: "mg" }, { amount: 15, unit: "mg/kg" }, 23)).toMatchObject({ equivalent: true });
    expect(compareDose({ amount: 400, unit: "mg" }, { amount: 15, unit: "mg/kg" }, 23)).toMatchObject({ equivalent: false, conflicts: ["amount"] });
    // without a weight a dose per kg cannot be compared with an absolute one
    expect(compareDose({ amount: 7, unit: "unit/h" }, insulin)).toEqual({ equivalent: false, ratio: null, far: null, conflicts: ["unit"] });
    // an order's own cap after the weight ("0.01 mg/kg, max 0.5 mg" at 62 kg is 0.5 mg)
    expect(compareDose({ amount: 0.01, unit: "mg/kg", max: { amount: 0.5, unit: "mg" } }, { amount: 0.5, unit: "mg" }, 62)).toMatchObject({ equivalent: true });
    expect(compareDose({ amount: 0.01, unit: "mg/kg" }, { amount: 0.5, unit: "mg" }, 62)).toMatchObject({ equivalent: false, conflicts: ["amount"] });
  });

  it("an amount within a preset range is the preset's; outside it, the ratio is to the nearer end and `far` to the farther", () => {
    const labetalol = DoseSpecSchema.parse({ amount: 10, upTo: 20, unit: "mg", route: "IV" });
    expect(compareDose({ amount: 15, unit: "mg" }, labetalol)).toEqual({ equivalent: true, ratio: 1, far: 1, conflicts: [] });
    expect(compareDose({ amount: 200, unit: "mg" }, labetalol)).toEqual({ equivalent: false, ratio: 10, far: 20, conflicts: ["amount"] });
    expect(compareDose({ amount: 5, unit: "mg" }, labetalol)).toEqual({ equivalent: false, ratio: 0.5, far: 0.25, conflicts: ["amount"] });
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
    // a dose given in parts (its preset says so: `bolus`): the parts add up to the whole, the first is the bolus
    const alteplase = { doseSpec: { amount: 0.9, unit: "mg/kg", route: "IV", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } }, risk: "high", critical: true } as const;
    expect(check("IV alteplase 7.2 mg bolus then 64.8 mg over 60 min", alteplase, 80)).toEqual({ outcome: "given", checked: true, dose: { amount: 72, unit: "mg", route: "IV" } });
    expect(check("阿替普酶 7.2 mg 静推，余 64.8 mg 60分钟泵入", alteplase, 80)).toMatchObject({ outcome: "given", dose: { amount: 72, unit: "mg" } });
    // a preset not given in parts: two doses that disagree are asked about, never added up
    const single = { doseSpec: { amount: 0.9, unit: "mg/kg", route: "IV" }, risk: "high", critical: true } as const;
    expect(check("IV alteplase 7.2 mg bolus then 64.8 mg over 60 min", single, 80)).toMatchObject({ outcome: "query", reason: "several" });
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
    // the words state two doses: a client that picks one does not decide it — the nurse asks (re-review: "0.5 mg,
    // sorry, 5 mg" was given as 0.5 mg)
    expect(checkOrder({ text: "adrenaline 0.5 mg IM (not 5 mg)", dose: { amount: 0.5, unit: "mg", route: "IM" } }, im)).toMatchObject({ outcome: "query", reason: "several", words: "0.5 mg, 5 mg" });
    // a route the words name among two is the client's choice
    expect(checkOrder({ text: "adrenaline 0.5 mg IV or IM", dose: { route: "IM" } }, im)).toMatchObject({ outcome: "given", dose: { amount: 0.5, unit: "mg", route: "IM" } });
  });
});

/* ------------------------------------------------------------------ */
/* The first set's re-review (audit 2026-11-12 follow-ups)             */
/* ------------------------------------------------------------------ */

describe("readOrder: spellings the first reader missed (re-review)", () => {
  const unclear = (text: string) => readOrder(text).unclear;

  it("reads every usual spelling of a unit, and a thousand as k; asks about mEq and the units no preset is counted in", () => {
    expect(parseDose("adrenaline 500 microg IM")).toEqual({ amount: 500, unit: "microgram", route: "IM" });
    for (const text of ["ceftriaxone 2 gm IV", "Ceftriaxone 2 Gm IV", "ceftriaxone 2 gms IV"]) expect(parseDose(text), text).toEqual({ amount: 2, unit: "g", route: "IV" });
    expect(parseDose("IV heparin 50000 I.U. bolus")).toEqual({ amount: 50000, unit: "unit", route: "IV" });
    expect(parseDose("heparin 50k units IV bolus")).toEqual({ amount: 50000, unit: "unit", route: "IV" });
    expect(parseDose("0.9% NaCl 1000 mL with KCl 40 mmols at 500 mL/h")).toEqual({ amount: 20, unit: "mmol/h" });
    expect(parseDose("a milligram of adrenaline IM")).toEqual({ amount: 1, unit: "mg", route: "IM" });
    expect(unclear("KCl 200 mEq/h IV")).toEqual({ reason: "unit", words: "200 mEq/h" });
    expect(unclear("vitamin B12 500 ng IM")).toEqual({ reason: "unit", words: "500 ng" });
  });

  it("never guesses a number it cannot read: thousands by spaces, a middle dot, a point then a space, a vulgar fraction, zero", () => {
    for (const space of [" ", "\u00a0", "\u2009", "\u202f"]) expect(unclear(`IV heparin 50${space}000 units bolus`)).toEqual({ reason: "unreadable", words: `50${space}000 units` });
    // as the learner wrote them, not as NFKC rewrites them
    expect(unclear("肾上腺素0·5mg肌注")).toEqual({ reason: "unreadable", words: "0·5mg" });
    expect(unclear("IM adrenaline 0. 5 mg")).toEqual({ reason: "unreadable", words: "0. 5 mg" });
    expect(unclear("IM adrenaline ½ mg")).toEqual({ reason: "unreadable", words: "½ mg" });
    expect(unclear("insulin 5½ units IV bolus")).toEqual({ reason: "unreadable", words: "5½ units" });
    expect(unclear("替奈普酶 ¼ mg/kg 静推")).toEqual({ reason: "unreadable", words: "¼ mg/kg" });
    expect(unclear("IM adrenaline 0 mg")).toEqual({ reason: "unreadable", words: "0 mg" });
    expect(doseMentions("IM adrenaline ⅛ mg")).toEqual([]);
  });

  it("a body weight, a cannula's gauge, a lab value, a vital sign, a place, a time or a count is no dose", () => {
    expect(doseMentions("体重62千克，肌注肾上腺素0.5mg")).toEqual([{ amount: 0.5, unit: "mg" }]);
    expect(doseMentions("体重五十五千克")).toEqual([]);
    expect(doseMentions("weight 62 kg, IM adrenaline 0.5 mg")).toEqual([{ amount: 0.5, unit: "mg" }]);
    for (const text of ["via the 18G, ceftriaxone 2 g IV", "18G cannula, ceftriaxone 2 g IV", "16 g venflon: ceftriaxone 2 g IV", "18G留置针，头孢曲松2 g静滴"]) expect(doseMentions(text), text).toEqual([{ amount: 2, unit: "g" }]);
    // a capital G with any other number: grams, or a gauge? asked
    expect(unclear("ceftriaxone 2G IV")).toEqual({ reason: "unreadable", words: "2G" });
    expect(parseDose("K+ 3.8 mmol/L: KCl 40 mmol in 1 L 0.9% NaCl at 500 mL/h")).toEqual({ amount: 20, unit: "mmol/h" });
    expect(parseDose("血糖25mmol/L，胰岛素50U+NS 50ml 5.5ml/h泵入")).toEqual({ amount: 5.5, unit: "unit/h" });
    expect(parseDose("glucose 450 mg/dL: insulin 5.5 mL/h of 1 unit/mL")).toEqual({ amount: 5.5, unit: "unit/h" });
    for (const text of ["sats are 88, give IM adrenaline now", "HR 130, give IM adrenaline", "心率130，立即肌注肾上腺素", "IM adrenaline; GCS 14", "IM adrenaline, she is 30", "give the IM adrenaline at 1430", "肌注肾上腺素，送抢救室2", "IM adrenaline to resus 2", "IM adrenaline ×2"]) {
      expect(readOrder(text).unclears, text).toEqual([]);
    }
    // a pulse rate is no rectal route; s/c is subcutaneous
    expect(doseRoute("adrenaline 0.5 mg, PR 120")).toBeNull();
    expect(doseRoute("insulin infusion 0.1 units/kg/h s/c")).toBe("SC");
    // a count of ampoules or tablets states no amount: asked when it is all the order says
    expect(unclear("肾上腺素一支肌注")).toEqual({ reason: "count", words: "一支" });
    expect(unclear("2 tablets of paracetamol")).toEqual({ reason: "count", words: "2 tablets" });
    expect(doseMentions("阿司匹林3片（300mg）嚼服")).toEqual([{ amount: 300, unit: "mg" }]);
  });

  it("reads a dose per kg and per hour however written, a combination's total, so many tablets, a cap and a time to give it over", () => {
    for (const text of ["胰岛素0.1U/(kg·h)静脉泵入", "胰岛素0.1 U·kg-1·h-1 静脉泵入", "胰岛素0.1 U·kg⁻¹·h⁻¹ 静脉泵入", "胰岛素按每千克体重每小时0.1单位静脉泵入"]) {
      expect(parseDose(text), text).toEqual({ amount: 0.1, unit: "unit/kg/h", route: "IV" });
    }
    expect(parseDose("多巴胺5μg/(kg·min)")).toEqual({ amount: 5, unit: "microgram/kg/min" });
    expect(parseDose("去甲肾上腺素0.1μg·kg-1·min-1")).toEqual({ amount: 0.1, unit: "microgram/kg/min" });
    expect(parseDose("硫酸镁每千克体重40毫克静滴")).toEqual({ amount: 40, unit: "mg/kg", route: "IV" });
    for (const text of ["insulin 5.5 units hourly IV", "insulin 5.5 units an hour IV", "胰岛素每小时5.5单位静脉泵入"]) expect(parseDose(text), text).toEqual({ amount: 5.5, unit: "unit/h", route: "IV" });
    expect(parseDose("piperacillin/tazobactam 4 g/0.5 g IV")).toEqual({ amount: 4.5, unit: "g", route: "IV" });
    expect(parseDose("替格瑞洛 90mg×2片 口服")).toEqual({ amount: 180, unit: "mg", route: "PO" });
    expect(parseDose("阿司匹林 100mg×3片 嚼服")).toEqual({ amount: 300, unit: "mg", route: "PO" });
    // a bare multiplier: two doses, or two tablets now? asked
    expect(unclear("aspirin 81 mg x 4 chewed")).toEqual({ reason: "unreadable", words: "81 mg x 4" });
    expect(unclear("IM adrenaline 5 x 0.1 mg")).toEqual({ reason: "unreadable", words: "5 x 0.1 mg" });
    expect(doseMentions("IM adrenaline 0.01 mg/kg, max 0.5 mg")).toEqual([{ amount: 0.01, unit: "mg/kg", max: { amount: 0.5, unit: "mg" } }]);
    expect(doseMentions("KCl 40 mmol in 1 L 0.9% NaCl over 2 hours")).toEqual([{ amount: 40, unit: "mmol", over: 120 }]);
    expect(doseMentions("阿替普酶7.2mg静推，剩余64.8mg在60分钟内泵入")).toEqual([{ amount: 7.2, unit: "mg" }, { amount: 64.8, unit: "mg", over: 60, infusionAmount: true }]);
    // a diluent is no dose
    expect(doseMentions("salbutamol 0.5 mL of 5 mg/mL nebulised with 2.5 mL saline")).toEqual([{ amount: 2.5, unit: "mg", volume: { amount: 0.5, unit: "mL" } }]);
  });
});

describe("checkOrder: a bolus and an infusion — each part against its own (items i and ii)", () => {
  const ufh = { doseSpec: DoseSpecSchema.parse({ amount: 70, upTo: 80, unit: "unit/kg", route: "IV", maintenance: { amount: 18, unit: "unit/kg/h" } }), risk: "moderate", name: "Unfractionated heparin IV infusion" } as const;
  const alteplase = { doseSpec: DoseSpecSchema.parse({ amount: 0.9, unit: "mg/kg", route: "IV", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } }), risk: "high", critical: true } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1], weightKg: number) => checkOrder({ text }, iv, weightKg);

  it("heparin: the bolus, the infusion's rate, or both — each checked, each given; a tenfold rate is a critical dose error", () => {
    expect(check("heparin infusion 18 units/kg/h", ufh, 70)).toEqual({ outcome: "given", checked: true, dose: { amount: 18, unit: "unit/kg/h" } });
    expect(check("普通肝素18U/(kg·h)静脉泵入", ufh, 70)).toMatchObject({ outcome: "given" });
    expect(check("heparin infusion 1260 units/h", ufh, 70)).toMatchObject({ outcome: "given" });
    expect(check("heparin 5000 units IV bolus then 18 units/kg/h", ufh, 70)).toMatchObject({ outcome: "given", dose: { amount: 5000, unit: "unit" } });
    expect(check("肝素5000单位静推，随后18单位/kg/h泵入", ufh, 70)).toMatchObject({ outcome: "given" });
    expect(check("heparin 5000 units IV bolus then 180 units/kg/h", ufh, 70)).toMatchObject({ outcome: "conflict", dose: { amount: 180, unit: "unit/kg/h" }, ratio: 10, severity: "critical" });
    expect(check("heparin 50000 units IV bolus then 18 units/kg/h", ufh, 70)).toMatchObject({ outcome: "conflict", dose: { amount: 50000, unit: "unit" }, severity: "critical" });
  });

  it("alteplase: the whole, its parts or the bolus with the rate are given; a part alone is asked about; any other amount is a dose error", () => {
    for (const text of ["alteplase 0.9 mg/kg IV", "alteplase 72 mg IV", "alteplase 0.9 mg/kg (72 mg) IV", "alteplase 7.2 mg IV bolus then 64.8 mg over 60 min", "alteplase bolus 7.2 mg, infusion 64.8 mg/h"]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    // the parts with their stated total (the first set refused these as a critical tenfold error)
    expect(check("alteplase 7.2 mg IV bolus then 64.8 mg over 60 min (total 72 mg)", alteplase, 80)).toMatchObject({ outcome: "given", dose: { amount: 72, unit: "mg" } });
    expect(check("阿替普酶7.2mg静推，剩余64.8mg在60分钟内泵入，总量72mg", alteplase, 80)).toMatchObject({ outcome: "given" });
    expect(check("阿替普酶0.9mg/kg，总量72mg，其中10%即7.2mg静推，余64.8mg 1小时内泵入", alteplase, 80)).toMatchObject({ outcome: "given" });
    // a part alone: is that the whole dose?
    expect(check("alteplase 7.2 mg IV bolus", alteplase, 80)).toEqual({ outcome: "query", reason: "partial", words: null, dose: { amount: 7.2, unit: "mg", route: "IV" } });
    expect(check("alteplase infusion 64.8 mg/h", alteplase, 80)).toMatchObject({ outcome: "query", reason: "partial" });
    // the rest alone (the whole less the bolus), however written — not the whole within the weight's tolerance
    for (const text of ["alteplase 64.8 mg IV", "alteplase 64.8 mg IV over 60 min"]) expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "query", reason: "partial" });
    // any other amount below the whole is the whole dose's (re-review): an under-dose, recorded — the mg-for-mg/kg slip
    // tenfold and critical
    expect(check("alteplase 30 mg IV", alteplase, 80)).toMatchObject({ outcome: "conflict", severity: "warning" });
    expect(check("alteplase 50 mg IV", alteplase, 80)).toMatchObject({ outcome: "conflict", ratio: 0.694444, severity: "warning" });
    expect(check("alteplase 0.9 mg IV", alteplase, 80)).toMatchObject({ outcome: "conflict", ratio: 0.0125, severity: "critical" });
    // an amount over a stated time is the infusion's rate: a tenfold infusion is a critical dose error, never "several"
    expect(check("alteplase 7.2 mg IV bolus, then 648 mg over 60 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 648, unit: "mg/h" }, ratio: 10, severity: "critical" });
    // a bolus that is not the preset's, a tenfold dose either way: dose errors
    expect(check("alteplase 36 mg bolus then 36 mg over 60 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 36, unit: "mg" }, ratio: 5, severity: "critical" });
    expect(check("alteplase 720 mg IV", alteplase, 80)).toMatchObject({ outcome: "conflict", severity: "critical" });
    expect(check("alteplase 0.5 mg IV", alteplase, 80)).toMatchObject({ outcome: "conflict", severity: "critical" });
  });

  it("the schema: a maintenance is a rate beside a single dose; a bolus is less than the whole, in its unit", () => {
    expect(DoseSpecSchema.safeParse({ amount: 70, unit: "unit/kg", maintenance: { amount: 18, unit: "unit/kg" } }).success).toBe(false);
    expect(DoseSpecSchema.safeParse({ amount: 0.1, unit: "unit/kg/h", maintenance: { amount: 0.1, unit: "unit/kg/h" } }).success).toBe(false);
    expect(DoseSpecSchema.safeParse({ amount: 0.9, unit: "mg/kg", bolus: { amount: 7.2, unit: "mg" } }).success).toBe(false);
    expect(DoseSpecSchema.safeParse({ amount: 0.9, unit: "mg/kg", bolus: { amount: 0.9, unit: "mg/kg" } }).success).toBe(false);
    expect(OrderedDoseSchema.safeParse({ amount: 2, upTo: 3, unit: "mg" }).success).toBe(true);
    expect(OrderedDoseSchema.safeParse({ amount: 3, upTo: 2, unit: "mg" }).success).toBe(false);
    expect(formatDose(ufh.doseSpec)).toBe("70–80 unit/kg IV, then 18 unit/kg/h");
    expect(formatDose(alteplase.doseSpec)).toBe("0.9 mg/kg IV (0.09 mg/kg bolus, then 0.81 mg/kg/h)");
  });
});

describe("checkOrder: ranges, several doses, units it cannot check (item iv; re-review)", () => {
  const im = { doseSpec: { amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" }, risk: "moderate" } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1] = im, weightKg?: number) => checkOrder({ text }, iv, weightKg);

  it("a range within the preset's is given; wholly outside it, a dose error; across its ends, asked", () => {
    expect(check("IM adrenaline 0.3-0.5 mg")).toEqual({ outcome: "given", checked: true, dose: { amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" } });
    const morphine = { doseSpec: { amount: 2, upTo: 4, unit: "mg", route: "IV" }, risk: "moderate", name: "IV morphine" } as const;
    expect(check("morphine 2–3 mg IV", morphine)).toMatchObject({ outcome: "given", dose: { amount: 2, upTo: 3 } });
    expect(check("morphine 2-4 mg IV", morphine)).toMatchObject({ outcome: "given" });
    for (const text of ["IM adrenaline 5-10 mg", "肾上腺素5~10mg肌注"]) expect(check(text), text).toMatchObject({ outcome: "conflict", dose: { amount: 5, upTo: 10, unit: "mg" }, ratio: 10, severity: "critical" });
    expect(check("IM adrenaline 0.5–1 mg")).toEqual({ outcome: "query", reason: "range", words: "0.5–1 mg", dose: { route: "IM" } });
  });

  it("two doses that disagree are asked about — never the first given (a correction, two drugs in one order)", () => {
    for (const text of ["IM adrenaline 0.5 mg, sorry, 5 mg", "肌注肾上腺素0.5mg，改为5mg"]) expect(check(text), text).toMatchObject({ outcome: "query", reason: "several" });
    // "0.5 mg / 5 mg" after a single drug's name: which? (a combination's strengths add up: piperacillin/tazobactam 4 g/0.5 g)
    expect(check("IM adrenaline 0.5 mg / 5 mg")).toMatchObject({ outcome: "query", reason: "unreadable", words: "0.5 mg / 5 mg" });
    const ipratropium = { doseSpec: { amount: 250, unit: "microgram", route: "INH" }, risk: "low" } as const;
    expect(check("沙丁胺醇2.5毫克+异丙托溴铵250微克雾化", ipratropium)).toMatchObject({ outcome: "query", reason: "several" });
    // the same dose twice, or a dose and its volume, is one dose
    expect(check("IM adrenaline 0.5 mg (0.5 mL of 1 mg/mL)")).toMatchObject({ outcome: "given" });
  });

  it("asks about a dose it cannot check — mEq, a count of ampoules, five thousand or fifty thousand — and gives an order with only vital signs", () => {
    const kcl = { doseSpec: { amount: 20, unit: "mmol/h", route: "IV" }, risk: "moderate", name: "IV potassium replacement (KCl infusion)" } as const;
    expect(check("KCl 200 mEq/h IV", kcl)).toEqual({ outcome: "query", reason: "unit", words: "200 mEq/h", dose: { route: "IV" } });
    expect(check("KCl 40 mmol in 1 L 0.9% NaCl over 2 hours", kcl)).toMatchObject({ outcome: "given", dose: { amount: 20, unit: "mmol/h" } });
    expect(check("肾上腺素一支肌注")).toMatchObject({ outcome: "query", reason: "count", words: "一支" });
    expect(check("IV heparin 50 000 units bolus", { doseSpec: { amount: 70, upTo: 80, unit: "unit/kg", route: "IV" }, risk: "moderate" }, 70)).toMatchObject({ outcome: "query", reason: "unreadable" });
    expect(check("sats are 88, give IM adrenaline now")).toEqual({ outcome: "given", checked: true, dose: { route: "IM" } });
    expect(check("IM adrenaline 0.01 mg/kg, max 0.5 mg", im, 62)).toMatchObject({ outcome: "given" });
    expect(check("IM adrenaline 0.01 mg/kg", { doseSpec: { amount: 0.5, unit: "mg", route: "IM" }, risk: "moderate" }, 62)).toMatchObject({ outcome: "conflict", severity: "warning" });
  });
});

describe("severity: a tenfold slip of any dose the preset allows; twice the dose of a high-alert medicine (re-review)", () => {
  it("measures tenfold from the range's farther end", () => {
    const aspirin = { doseSpec: { amount: 150, upTo: 325, unit: "mg", route: "PO" }, risk: "low", name: "Aspirin loading dose" } as const;
    expect(checkOrder({ text: "aspirin 3000 mg chewed" }, aspirin)).toMatchObject({ outcome: "conflict", ratio: 9.230769, severity: "critical" });
    expect(checkOrder({ text: "aspirin 650 mg chewed" }, aspirin)).toMatchObject({ outcome: "conflict", severity: "warning" });
    const im = { doseSpec: { amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" }, risk: "moderate", name: "Intramuscular adrenaline" } as const;
    expect(checkOrder({ text: "IM adrenaline 4 mg" }, im)).toMatchObject({ outcome: "conflict", ratio: 8, severity: "critical" });
    // twice the top of the range, IM adrenaline (not high-alert by that route): a warning
    expect(checkOrder({ text: "IM adrenaline 1 mg" }, im)).toMatchObject({ outcome: "conflict", ratio: 2, severity: "warning" });
    expect(doseErrorSeverity(9.23, ["amount"], { risk: "low" }, 20)).toBe("critical");
  });

  it("a high-alert medicine is dangerous whatever the case's risk label: twice the dose, or another route, is critical", () => {
    const kcl = { doseSpec: { amount: 20, unit: "mmol/h", route: "IV" }, risk: "moderate", name: { en: "IV potassium replacement (KCl infusion)", "zh-CN": "静脉补钾" } } as const;
    expect(checkOrder({ text: "KCl 60 mmol/h IV" }, kcl)).toMatchObject({ outcome: "conflict", ratio: 3, severity: "critical" });
    const mg = { doseSpec: { amount: 25, upTo: 50, unit: "mg/kg", route: "IV" }, risk: "moderate", name: "IV magnesium sulfate" } as const;
    expect(checkOrder({ text: "magnesium sulfate 8 g IV" }, mg, 20)).toMatchObject({ outcome: "conflict", ratio: 8, severity: "critical" });
    expect(checkOrder({ text: "magnesium sulfate 1.1 g IV" }, mg, 20)).toMatchObject({ outcome: "conflict", severity: "warning" });
    expect(doseErrorSeverity(2, ["amount"], { risk: "moderate", name: "IV morphine" })).toBe("critical");
    expect(doseErrorSeverity(1, ["route"], { risk: "low", name: "Insulin infusion" })).toBe("critical");
    expect(doseErrorSeverity(2, ["amount"], { risk: "moderate", name: "Ceftriaxone 2 g IV" })).toBe("warning");
    // the class (ISMP): by any route, or IV only
    expect(isHighAlert({ name: "Enoxaparin treatment dose SC" })).toBe(true);
    expect(isHighAlert({ name: { en: "Oral rivaroxaban", "zh-CN": "利伐沙班口服" } })).toBe(true);
    expect(isHighAlert({ name: "Adrenaline (epinephrine) 1 mg IV" })).toBe(true);
    expect(isHighAlert({ name: "Intramuscular adrenaline", doseSpec: { amount: 0.5, unit: "mg", route: "IM" } })).toBe(false);
    expect(isHighAlert({ name: "Noradrenaline (norepinephrine) infusion" })).toBe(true);
    expect(isHighAlert({ name: "Aspirin loading dose" })).toBe(false);
    expect(isHighAlert({ name: "Insulin glargine", kind: "procedure" })).toBe(false);
    // potassium as ISMP names it: for injection — never oral potassium (re-review)
    expect(isHighAlert({ name: "IV potassium replacement (KCl infusion)", doseSpec: { amount: 20, unit: "mmol/h", route: "IV" } })).toBe(true);
    expect(isHighAlert({ name: { en: "Potassium citrate", "zh-CN": "枸橼酸钾" }, doseSpec: { amount: 10, unit: "mmol", route: "PO" } })).toBe(false);
    expect(isHighAlert({ name: "Oral potassium chloride (KCl) tablets", dose: "KCl 24 mmol PO" })).toBe(false);
  });
});

describe("no exemption leaves an order without the dose it states (re-review of the order reader)", () => {
  const kcl = { doseSpec: { amount: 20, unit: "mmol/h", route: "IV" }, risk: "moderate", name: "IV potassium replacement (KCl infusion)", aliases: ["KCl", "补钾"] } as const;
  const im = { doseSpec: { amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" }, risk: "moderate", name: "Intramuscular adrenaline" } as const;
  const ceftriaxone = { doseSpec: { amount: 1, upTo: 2, unit: "g", route: "IV" }, risk: "low", name: "Ceftriaxone 2 g IV" } as const;
  const morphine = { doseSpec: { amount: 2.5, unit: "mg", route: "IV" }, risk: "moderate", name: "IV morphine" } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1], weightKg?: number) => checkOrder({ text }, iv, weightKg);
  const never = (r: ReturnType<typeof checkOrder>) => r.outcome !== "given" || r.dose?.amount != null;

  it("a number after the ordered medicine's own lab word is its dose, or a lab value: asked — after another's, a lab value", () => {
    for (const text of ["potassium 40 IV", "potassium 400 IV", "K+ 40 IV", "K: 40 IV", "血钾40静滴"]) expect(check(text, kcl), text).toMatchObject({ outcome: "query", reason: "no-unit" });
    expect(readOrder("potassium 40 IV").labNumbers).toEqual([{ analyte: "potassium", words: "40" }]);
    // a lab value beside the medicine's own dose, or beside another medicine: no question
    expect(check("K+ 3.2, KCl 20 mmol/h IV", kcl)).toMatchObject({ outcome: "given", dose: { amount: 20, unit: "mmol/h" } });
    expect(check("glucose 25, give IM adrenaline", im)).toMatchObject({ outcome: "given" });
    // a single letter is a vital sign only with a colon ("T: 38.5"); "x 2" is no count without its sign
    expect(readOrder("IM adrenaline, P: 120").unclears).toEqual([]);
    expect(check("IM adrenaline x 2", im)).toMatchObject({ outcome: "query", reason: "no-unit", words: "2" });
  });

  it("a gauge only where the words say so: \"20G\" alone is asked about; a drug's name written onto its dose is read", () => {
    for (const text of ["ceftriaxone 20G IV", "Ceftriaxone 20 G IV"]) expect(check(text, ceftriaxone), text).toMatchObject({ outcome: "query", reason: "unreadable" });
    for (const text of ["IV access 18G, ceftriaxone 2 g IV", "ceftriaxone 2 g IV via 18G cannula"]) expect(check(text, ceftriaxone), text).toMatchObject({ outcome: "given", dose: { amount: 2, unit: "g" } });
    expect(check("adrenaline5mg IM", im)).toMatchObject({ outcome: "conflict", ratio: 10, severity: "critical" });
    expect(check("KCl400mmol/h静滴", kcl)).toMatchObject({ outcome: "conflict", severity: "critical" });
    // a word's digits are still no dose
    expect(doseMentions("SpO2 88%, CO2 retainer, q4h obs")).toEqual([]);
  });

  it("a cap with no dose before it is the dose; after a dose, its cap", () => {
    for (const text of ["IM adrenaline up to 5 mg", "肾上腺素肌注，最多5mg"]) expect(check(text, im), text).toMatchObject({ outcome: "conflict", dose: { amount: 5, unit: "mg" }, ratio: 10, severity: "critical" });
    expect(check("titrate morphine IV to a maximum of 25 mg", morphine)).toMatchObject({ outcome: "conflict", severity: "critical" });
    expect(check("IM adrenaline up to 0.5 mg", im)).toMatchObject({ outcome: "given", dose: { amount: 0.5, unit: "mg" } });
    expect(check("morphine 2.5 mg IV, max 10 mg", morphine)).toMatchObject({ outcome: "given", dose: { amount: 2.5, unit: "mg" } });
  });

  it("a daily total that is the only dose: the preset's (once daily) given, a tenfold slip a dose error, else asked", () => {
    expect(check("头孢曲松每日2g静滴", ceftriaxone)).toMatchObject({ outcome: "given", dose: { amount: 2, unit: "g" } });
    for (const text of ["头孢曲松每日20g静滴", "ceftriaxone 20 g/day IV"]) expect(check(text, ceftriaxone), text).toMatchObject({ outcome: "conflict", ratio: 10, severity: "critical" });
    expect(check("ceftriaxone 4 g/day IV", ceftriaxone)).toMatchObject({ outcome: "query", reason: "total", words: "4 g/day" });
    expect(check("ceftriaxone 1.5 g/m2 IV", ceftriaxone)).toMatchObject({ outcome: "query", reason: "total" });
    expect(readOrder("amoxicillin 50 mg/kg/day").totals).toEqual([{ amount: 50, unit: "mg/kg", per: "day", words: "50 mg/kg/day" }]);
  });

  it("a loading dose then its maintenance at a frequency: the first is the order's dose; a maintenance above the preset is a dose error", () => {
    const aspirin = { doseSpec: { amount: 150, upTo: 325, unit: "mg", route: "PO" }, risk: "low", name: "Aspirin loading dose" } as const;
    const ticagrelor = { doseSpec: { amount: 180, unit: "mg", route: "PO" }, risk: "moderate", name: "Ticagrelor loading dose" } as const;
    const salbutamol = { doseSpec: { amount: 2.5, upTo: 5, unit: "mg", route: "INH" }, risk: "low", name: "Salbutamol nebuliser" } as const;
    expect(check("aspirin 300 mg PO now, then 75 mg daily", aspirin)).toMatchObject({ outcome: "given", dose: { amount: 300, unit: "mg" } });
    expect(check("阿司匹林300mg嚼服，之后每日100mg", aspirin)).toMatchObject({ outcome: "given", dose: { amount: 300 } });
    for (const text of ["ticagrelor 180 mg PO loading, then 90 mg twice daily", "替格瑞洛180mg口服负荷，随后90mg每日两次"]) expect(check(text, ticagrelor), text).toMatchObject({ outcome: "given", dose: { amount: 180 } });
    expect(check("salbutamol 5 mg nebulised, then 2.5 mg every 20 minutes", salbutamol)).toMatchObject({ outcome: "given", dose: { amount: 5 } });
    expect(readOrder("aspirin 300 mg PO now, then 75 mg daily").mentions).toEqual([{ amount: 300, unit: "mg" }, { amount: 75, unit: "mg", then: true }]);
    // a maintenance above the preset, or a tenfold one, is not the regimen's: a dose error
    expect(check("aspirin 300 mg PO now, then 3000 mg daily", aspirin)).toMatchObject({ outcome: "conflict", dose: { amount: 3000 }, severity: "critical" });
    // corrections and two doses with no frequency are still asked about
    expect(check("IM adrenaline 0.5 mg, then 5 mg", im)).toMatchObject({ outcome: "query", reason: "several" });
  });

  it("no exemption gives the preset when the order's only number is a dose: it is compared, or asked about", () => {
    const rows: [string, Parameters<typeof checkOrder>[1]][] = [
      ["potassium 40 IV", kcl], ["K+ 400 IV", kcl], ["ceftriaxone 20G IV", ceftriaxone], ["IM adrenaline up to 5 mg", im], ["最多5mg肌注肾上腺素", im],
      ["头孢曲松每日20g静滴", ceftriaxone], ["ceftriaxone 4 g/day IV", ceftriaxone], ["adrenaline5mg IM", im], ["IM adrenaline x 5", im], ["vitamin K 10 IV", { doseSpec: { amount: 10, unit: "mg", route: "IV" }, risk: "low", name: "Vitamin K" }],
    ];
    for (const [text, iv] of rows) expect(never(check(text, iv)), text).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* The second set's verification (audit 2026-11-12 follow-ups, D1–D2)   */
/* ------------------------------------------------------------------ */

describe("checkOrder: an infusion's rate is checked even when the parts add up to the whole (verification D1, D2)", () => {
  const alteplase = { doseSpec: DoseSpecSchema.parse({ amount: 0.9, unit: "mg/kg", route: "IV", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } }), risk: "high", critical: true, name: "IV alteplase" } as const;
  const ufh = { doseSpec: DoseSpecSchema.parse({ amount: 70, upTo: 80, unit: "unit/kg", route: "IV", maintenance: { amount: 18, unit: "unit/kg/h" } }), risk: "moderate", name: "Unfractionated heparin IV infusion" } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1], weightKg: number) => checkOrder({ text }, iv, weightKg);

  it("the infusion of a dose given in parts runs for its own duration: the whole less the bolus at the maintenance rate", () => {
    expect(infusionMinutes(alteplase.doseSpec)).toEqual({ low: 60, high: 60 });
    // a per-kg whole beside an absolute rate needs the weight
    expect(infusionMinutes({ amount: 0.9, unit: "mg/kg", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 64.8, unit: "mg/h" } }, 80)).toEqual({ low: 60, high: 60 });
    expect(infusionMinutes({ amount: 0.9, unit: "mg/kg", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 64.8, unit: "mg/h" } })).toBeNull();
    expect(infusionMinutes(ufh.doseSpec)).toBeNull();
  });

  it("a tenfold infusion is a critical dose error, whether its parts add up to the whole or the whole is given too fast — en and zh-CN", () => {
    // the parts are the preset's, the infusion runs over 6 min instead of 60: 648 mg/h, ten times 64.8 mg/h
    for (const text of ["alteplase 7.2 mg IV bolus then 64.8 mg over 6 min", "阿替普酶7.2mg静推，随后64.8mg于6分钟内泵入", "alteplase 7.2 mg IV bolus then 64.8 mg over 6 min (total 72 mg)"]) {
      expect(check(text, alteplase, 80), text).toEqual({ outcome: "conflict", dose: { amount: 648, unit: "mg/h", route: "IV" }, ratio: 10, conflicts: ["amount"], severity: "critical" });
    }
    // the whole over 6 min: ten times as fast as the infusion's own 60 min (as the rate it runs at, 720 mg/h)
    for (const text of ["alteplase 72 mg IV over 6 min", "阿替普酶72mg静脉，6分钟内泵入"]) {
      expect(check(text, alteplase, 80), text).toEqual({ outcome: "conflict", dose: { amount: 720, unit: "mg/h", route: "IV" }, ratio: 10, conflicts: ["amount"], severity: "critical" });
    }
    expect(check("alteplase 0.9 mg/kg IV over 6 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 9, unit: "mg/kg/h" }, ratio: 10, severity: "critical" });
    // twice as fast is critical for a thrombolytic; slower than the preset is a dose error to review
    expect(check("alteplase 72 mg IV over 30 min", alteplase, 80)).toMatchObject({ outcome: "conflict", ratio: 2, severity: "critical" });
    expect(check("alteplase 72 mg IV over 90 min", alteplase, 80)).toMatchObject({ outcome: "conflict", ratio: 0.666667, severity: "warning" });
  });

  it("the right regimen stays given in either language, however its times are written", () => {
    for (const text of [
      "alteplase 7.2 mg IV bolus then 64.8 mg over 60 min",
      "阿替普酶7.2mg静推，随后64.8mg于60分钟内泵入",
      "alteplase 72 mg IV over 60 min",
      "alteplase 0.9 mg/kg IV over 1 hour",
      // the bolus given over its own minute is no infusion
      "alteplase 7.2 mg IV bolus over 1 min, then 64.8 mg over 60 min",
      // of two times after one dose, the longer is how long it runs
      "alteplase 0.9 mg/kg over 60 min with 10% given as a bolus over 1 min",
      "阿替普酶0.9mg/kg静脉，其中10%在1分钟内静推，其余60分钟内泵入",
      "阿替普酶0.9mg/kg，总量72mg，其中10%即7.2mg静推，余64.8mg 1小时内泵入",
    ]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    expect(doseMentions("alteplase 0.9 mg/kg over 60 min with 10% given as a bolus over 1 min")).toEqual([{ amount: 0.9, unit: "mg/kg", over: 60 }]);
  });

  it("a time after a part of the dose is that part's: the bolus's minute is no infusion, the rest's time is how long it runs — en and zh-CN", () => {
    // the bolus's own minute, after the whole (these were critical 60-fold errors when it was read as the whole's time)
    for (const text of [
      "alteplase 0.9 mg/kg IV, 10% bolus over 1 min",
      "alteplase 72 mg IV, 10% as a bolus over 1 minute, rest as infusion",
      "阿替普酶0.9mg/kg，其中10%于1分钟内静推",
      "阿替普酶72mg静脉，10%在1分钟内推注，其余持续泵入",
      "alteplase 0.9 mg/kg IV, bolus over 1 min, rest over 60 min",
      "alteplase 72 mg IV, bolus over 1 minute then infusion over 60 minutes",
      "alteplase 0.9 mg/kg IV (10% bolus over 1 min, 90% over 60 min)",
      "alteplase 0.9 mg/kg IV, 10% as IV bolus over 1 minute, remaining 90% infused over 60 minutes",
      "阿替普酶0.9mg/kg（最大90mg），10%在1分钟内静推，剩余90%在60分钟内静滴",
      "阿替普酶0.9mg/kg静脉溶栓，其中10%静推，剩余60分钟内泵入",
      // the bolus's clause goes on after a comma; a time that comes "then", or an infusion's, is the rest's
      "alteplase 0.9 mg/kg, 10% as an IV bolus, over 1 min",
      "alteplase 72 mg, bolus over 1 min, then over 60 min",
      "阿替普酶0.9mg/kg，10%静推，60分钟内泵入",
    ]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    expect(doseMentions("alteplase 0.9 mg/kg IV, 10% bolus over 1 min")).toEqual([{ amount: 0.9, unit: "mg/kg" }]);
    expect(doseMentions("阿替普酶0.9mg/kg，其中10%于1分钟内静推，其余60分钟内泵入")).toEqual([{ amount: 0.9, unit: "mg/kg", restOver: 60 }]);
    // a percentage that is a strength is no part of the dose: the time stays the dose's
    expect(doseMentions("KCl 40 mmol in 1 L 0.9% NaCl over 2 hours")).toEqual([{ amount: 40, unit: "mmol", over: 120 }]);
    expect(doseMentions("magnesium sulfate 2 g in 100 mL 5% dextrose over 20 min")).toEqual([{ amount: 2, unit: "g", over: 20 }]);
    // the rest given too fast: tenfold, as the rate it runs at in the unit of the dose stated
    for (const [text, dose] of [
      ["alteplase 0.9 mg/kg IV, 10% bolus over 1 min, rest over 6 min", { amount: 8.1, unit: "mg/kg/h" }],
      ["阿替普酶0.9mg/kg，其中10%于1分钟内静推，其余6分钟内泵入", { amount: 8.1, unit: "mg/kg/h" }],
      ["alteplase 72 mg IV, bolus over 1 minute then infusion over 6 minutes", { amount: 648, unit: "mg/h" }],
      ["alteplase 7.2 mg IV bolus, the rest over 6 min", { amount: 648, unit: "mg/h" }],
      ["阿替普酶7.2mg静推，其余6分钟内泵入", { amount: 648, unit: "mg/h" }],
      ["alteplase 72 mg, bolus over 1 min, then over 6 min", { amount: 648, unit: "mg/h" }],
      ["阿替普酶0.9mg/kg，10%静推，6分钟内泵入", { amount: 8.1, unit: "mg/kg/h" }],
    ] as const) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "conflict", dose, ratio: 10, severity: "critical" });
    }
    // the bolus with the time its rest runs over is the whole, given in its parts (a warning dose error before)
    for (const text of ["alteplase 7.2 mg IV bolus, the rest over 60 min", "阿替普酶7.2mg静推，其余60分钟内泵入"]) {
      expect(check(text, alteplase, 80), text).toEqual({ outcome: "given", checked: true, dose: { amount: 7.2, unit: "mg", route: "IV" } });
    }
    // the bolus alone over its own minute is the bolus, asked about — not a critical dose error at 432 mg/h
    expect(check("alteplase 7.2 mg IV over 1 min", alteplase, 80)).toMatchObject({ outcome: "query", reason: "partial" });
    // the whole dose given as a bolus over a minute is still the 60-fold error it says
    expect(check("alteplase 72 mg IV bolus over 1 minute", alteplase, 80)).toMatchObject({ outcome: "conflict", ratio: 60, severity: "critical" });
  });

  it("a time is stated rounded: within 10 % of the infusion's own it is the preset's", () => {
    for (const text of ["alteplase 0.9 mg/kg IV over 61 min", "alteplase 0.9 mg/kg IV over 65 min", "alteplase 0.09 mg/kg bolus then 0.81 mg/kg over 61 min", "heparin 80 units/kg IV bolus then 36 units/kg over 121 min"]) {
      expect(check(text, text.startsWith("heparin") ? ufh : alteplase, text.startsWith("heparin") ? 70 : 80), text).toMatchObject({ outcome: "given" });
    }
    expect(check("alteplase 0.9 mg/kg IV over 50 min", alteplase, 80)).toMatchObject({ outcome: "conflict", severity: "warning" });
  });

  it("a colon after a word is no ratio: the dose after it is read (zh-CN \"：\")", () => {
    expect(doseMentions("肾上腺素剂量：5mg肌注")).toEqual([{ amount: 5, unit: "mg" }]);
    expect(check("阿替普酶72mg：7.2mg 1分钟内静推，64.8mg 60分钟内泵入", alteplase, 80)).toMatchObject({ outcome: "given", checked: true });
    // a ratio and a clock time are still no doses
    expect(doseMentions("时间：10:30 肾上腺素0.5mg肌注")).toEqual([{ amount: 0.5, unit: "mg" }]);
    expect(doseMentions("IM adrenaline 1:1000 0.5 mL")).toEqual([{ amount: 0.5, unit: "mg", volume: { amount: 0.5, unit: "mL" } }]);
    expect(doseMentions("BP：180/100，拉贝洛尔10mg静推")).toEqual([{ amount: 10, unit: "mg" }]);
  });

  it("beside a single dose, an amount over a time at the infusion's rate is the infusion — never a second dose to ask about (en and zh-CN)", () => {
    // 2520 units over 2 h is 1260 units/h, the preset's 18 units/kg/h at 70 kg (a833280 gave it; the second set asked "several")
    for (const text of ["heparin 5000 units IV bolus then 2520 units over 2 h", "肝素5000单位静推，随后2520单位于2小时内泵入"]) {
      expect(check(text, ufh, 70), text).toEqual({ outcome: "given", checked: true, dose: { amount: 5000, unit: "unit", route: "IV" } });
    }
    expect(check("heparin 2520 units over 2 h", ufh, 70)).toEqual({ outcome: "given", checked: true, dose: { amount: 1260, unit: "unit/h" } });
    // the single dose given over a time is that dose; an infusion at ten times the rate is still a critical dose error
    expect(check("heparin 5000 units IV over 5 min", ufh, 70)).toMatchObject({ outcome: "given", dose: { amount: 5000, unit: "unit" } });
    expect(check("heparin 5000 units IV bolus then 25200 units over 2 h", ufh, 70)).toMatchObject({ outcome: "conflict", dose: { amount: 12600, unit: "unit/h" }, ratio: 10, severity: "critical" });
    // two single doses that disagree are still asked about
    expect(check("heparin 5000 units IV, sorry, 7000 units", ufh, 70)).toMatchObject({ outcome: "query", reason: "several" });
  });
});

/* ------------------------------------------------------------------ */
/* The verification of the second set's fixes (D1, D2)                 */
/* ------------------------------------------------------------------ */

describe("checkOrder: the verification of the D1–D2 fixes (whole beside its bolus, strengths, times, equal amounts)", () => {
  const alteplase = { doseSpec: DoseSpecSchema.parse({ amount: 0.9, unit: "mg/kg", route: "IV", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } }), risk: "high", critical: true, name: "IV alteplase" } as const;
  const ufh = { doseSpec: DoseSpecSchema.parse({ amount: 70, upTo: 80, unit: "unit/kg", route: "IV", maintenance: { amount: 18, unit: "unit/kg/h" } }), risk: "moderate", name: "Unfractionated heparin IV infusion" } as const;
  const kcl = { doseSpec: DoseSpecSchema.parse({ amount: 20, unit: "mmol/h", route: "IV" }), risk: "moderate", name: "IV potassium replacement (KCl infusion)" } as const;
  const insulin = { doseSpec: DoseSpecSchema.parse({ amount: 0.1, unit: "unit/kg/h", route: "IV" }), risk: "moderate", critical: true, name: "Fixed-rate IV insulin infusion" } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1], weightKg: number) => checkOrder({ text }, iv, weightKg);
  const tenfoldRest = { outcome: "conflict", dose: { amount: 648, unit: "mg/h" }, ratio: 10, severity: "critical" } as const;

  it("the whole beside its bolus alone, the rest in words, is the whole given in its parts — never a 432 mg/h dose error (en and zh-CN)", () => {
    for (const text of [
      "alteplase 72 mg IV: 7.2 mg bolus over 1 min, rest over 60 min",
      "alteplase 0.9 mg/kg (72 mg) IV: 10% (7.2 mg) bolus over 1 minute, the rest over 60 minutes",
      "alteplase 0.9 mg/kg (total 72 mg), 7.2 mg bolus over 1 min, remainder over 60 min",
      "alteplase 0.9 mg/kg: 0.09 mg/kg over 1 min, rest over 60 min",
      "阿替普酶72mg，其中7.2mg 1分钟内静推，其余60分钟内泵入",
      "阿替普酶72毫克，其中7.2毫克1分钟内静推，余量60分钟内静滴",
      "阿替普酶72mg，先7.2mg 1分钟内静推，剩余60分钟内泵入",
      // without the bolus's minute, and with no time for the rest at all (it runs at the preset's rate)
      "alteplase 72 mg IV, 7.2 mg bolus, rest over 60 min",
      "阿替普酶72mg，7.2mg静推，其余60分钟内泵入",
      "alteplase 72 mg IV, 7.2 mg bolus",
      "alteplase 72 mg IV with a 7.2 mg bolus over 1 min",
    ]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    // its rest over 6 min: the tenfold infusion, at the rate it runs (648 mg/h, not the bolus's 432 mg/h)
    for (const text of ["alteplase 72 mg IV: 7.2 mg bolus over 1 min, rest over 6 min", "阿替普酶72mg，其中7.2mg 1分钟内静推，其余6分钟内泵入", "alteplase 72 mg IV with a 7.2 mg bolus over 1 min, the rest over 6 min"]) {
      expect(check(text, alteplase, 80), text).toMatchObject(tenfoldRest);
    }
    // a "bolus" over more than a bolus's few minutes is no bolus: its rate is checked
    expect(check("alteplase 72 mg IV: 7.2 mg over 30 min, rest over 60 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 14.4, unit: "mg/h" }, severity: "warning" });
  });

  it("reads a time however it is written — words, Chinese numerals, \"for\", \"in\", 泵完, 持续滴注, min in Chinese text — the right one given, the tenfold one a critical dose error", () => {
    const pairs: [string, string][] = [
      ["阿替普酶0.9mg/kg静脉滴注，其中10%在最初1分钟内静脉推注，其余持续滴注1小时", "阿替普酶0.9mg/kg静脉滴注，其中10%在最初1分钟内静脉推注，其余持续滴注6分钟"],
      ["阿替普酶0.9mg/kg静脉滴注，其中10%在最初1分钟内静脉推注，其余持续滴注60min", "阿替普酶0.9mg/kg静脉滴注，其中10%在最初1分钟内静脉推注，其余持续滴注6min"],
      ["阿替普酶7.2mg静推，64.8mg 60分钟泵完", "阿替普酶7.2mg静推，64.8mg 6分钟泵完"],
      ["阿替普酶7.2mg静推后，余64.8mg 60min内泵入", "阿替普酶7.2mg静推后，余64.8mg 6min内泵入"],
      ["阿替普酶7.2mg静推，随后六十四点八毫克于六十分钟内泵入", "阿替普酶7.2mg静推，随后六十四点八毫克于六分钟内泵入"],
      ["阿替普酶72mg，其中7.2mg静推，剩余64.8mg于一个小时内泵入", "阿替普酶72mg，其中7.2mg静推，剩余64.8mg于六分钟内泵入"],
      ["alteplase 7.2 mg IV bolus then 64.8 mg IV over sixty minutes", "alteplase 7.2 mg IV bolus then 64.8 mg IV over six minutes"],
      ["alteplase 7.2 mg IV bolus then 64.8 mg infused for 60 minutes", "alteplase 7.2 mg IV bolus then 64.8 mg infused for 6 minutes"],
      ["alteplase 7.2 mg IV bolus then 64.8 mg in 60 min", "alteplase 7.2 mg IV bolus then 64.8 mg in 6 min"],
      ["alteplase 0.9 mg/kg IV, 10% bolus over 1 min, rest infused for 60 minutes", "alteplase 0.9 mg/kg IV, 10% bolus over 1 min, rest infused for 6 minutes"],
      ["alteplase 7.2 mg IV bolus then 64.8 mg as a 60-minute infusion", "alteplase 7.2 mg IV bolus then 64.8 mg as a 6-minute infusion"],
      ["alteplase 72 mg IV, bolus over 1 min, then 60 min infusion", "alteplase 72 mg IV, bolus over 1 min, then 6 min infusion"],
    ];
    for (const [right, tenfold] of pairs) {
      expect(check(right, alteplase, 80), right).toMatchObject({ outcome: "given", checked: true });
      expect(check(tenfold, alteplase, 80), tenfold).toMatchObject({ outcome: "conflict", ratio: 10, severity: "critical" });
    }
    expect(check("alteplase 72 mg IV over ten minutes", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 432, unit: "mg/h" }, ratio: 6, severity: "critical" });
    expect(check("阿替普酶72mg，其中7.2mg静推，剩余64.8mg于半小时内泵入", alteplase, 80)).toMatchObject({ outcome: "conflict", ratio: 2, severity: "critical" });
    // a rate preset: the time in Chinese words, in English words, after "in"
    for (const text of ["胰岛素5.5单位静脉，泵入1小时", "insulin 5.5 units IV over sixty minutes", "KCl 20 mmol IV in 1 h", "氯化钾20mmol静滴1小时", "KCl 40 mmol in 1 L over two hours"]) {
      expect(check(text, text.includes("单位") || text.includes("insulin") ? insulin : kcl, 55), text).toMatchObject({ outcome: "given", checked: true });
    }
    expect(check("KCl 40 mmol IV in 10 min", kcl, 55)).toMatchObject({ outcome: "conflict", dose: { amount: 240, unit: "mmol/h" }, ratio: 12, severity: "critical" });
  });

  it("a time that says when, not how long, is none: \"repeat in 5 min\", \"recheck in 1 hour\", \"…后\", \"每6小时\", \"第1小时\"", () => {
    expect(doseMentions("adrenaline 0.5 mg IM, repeat in 5 min")).toEqual([{ amount: 0.5, unit: "mg" }]);
    expect(doseMentions("insulin 5.5 units IV, recheck glucose in 1 hour")).toEqual([{ amount: 5.5, unit: "unit" }]);
    expect(doseMentions("氯化钾40mmol静滴，1小时后复查血钾")).toEqual([{ amount: 40, unit: "mmol" }]);
    expect(doseMentions("氯化钾40mmol静滴1小时后复查血钾")).toEqual([{ amount: 40, unit: "mmol" }]);
    expect(doseMentions("吗啡2.5mg静推，每6小时内可重复")).toEqual([{ amount: 2.5, unit: "mg" }]);
    expect(check("insulin 5.5 units IV, recheck glucose in 1 hour", insulin, 55)).toMatchObject({ outcome: "query", reason: "rate" });
  });

  it("beside heparin's single dose, the same amount again over a time is the infusion, at the rate it runs — never the bolus written twice (en and zh-CN)", () => {
    for (const [text, rate] of [
      ["heparin 5000 units bolus then 5000 units over 20 min", 15000],
      ["肝素5000单位静推，随后5000单位于20分钟内泵入", 15000],
      ["heparin 5000 units IV bolus then 5000 units IV over 30 min", 10000],
      ["heparin 5000 units bolus then 5000 units over 80 min", 3750],
      ["heparin 4900 units IV bolus then 5040 units over 2 h", 2520],
    ] as const) {
      expect(check(text, ufh, 70), text).toMatchObject({ outcome: "conflict", dose: { amount: rate, unit: "unit/h" }, severity: "critical" });
    }
    for (const text of ["heparin 5000 units bolus then 5000 units over 4 h", "肝素5000单位静推，随后5000单位于4小时内泵入", "heparin 5000 units over 5 min, then 5000 units over 4 hours"]) {
      expect(check(text, ufh, 70), text).toMatchObject({ outcome: "given", dose: { amount: 5000, unit: "unit" } });
    }
    // the same dose written again in brackets is one dose, given over its time; a bolus's own minutes are no infusion
    for (const text of ["heparin 5000 units (5000 IU) IV over 20 min", "heparin 5000 units IV over 5 min", "heparin 5000 units IV over 5 min then 2520 units over 2 h"]) {
      expect(check(text, ufh, 70), text).toMatchObject({ outcome: "given", dose: { amount: 5000, unit: "unit" } });
    }
    expect(doseMentions("heparin 5000 units (5000 IU) IV over 20 min")).toEqual([{ amount: 5000, unit: "unit", over: 20 }, { amount: 5000, unit: "unit", copy: true }]);
    // the bolus's 5 min is never read as a 60000 units/h infusion
    expect(check("heparin 5000 units IV over 5 min then 25200 units over 2 h", ufh, 70)).toMatchObject({ outcome: "conflict", dose: { amount: 12600, unit: "unit/h" }, ratio: 10, severity: "critical" });
  });

  it("a strength is never a share of the dose, and a bolus or an infusion word alone names no part: the time stays the dose's (en and zh-CN)", () => {
    expect(check("KCl 40 mmol in 100 mL 0.9% over 10 min", kcl, 55)).toMatchObject({ outcome: "conflict", dose: { amount: 240, unit: "mmol/h" }, ratio: 12, severity: "critical" });
    expect(check("氯化钾40mmol加入1000ml 0.9%，1小时内静滴", kcl, 55)).toMatchObject({ outcome: "conflict", dose: { amount: 40, unit: "mmol/h" }, ratio: 2, severity: "critical" });
    expect(check("insulin 55 units IV, infusion over 1 h", insulin, 55)).toMatchObject({ outcome: "conflict", dose: { amount: 55, unit: "unit/h" }, ratio: 10, severity: "critical" });
    for (const [text, iv] of [
      ["KCl 40 mmol in 1 L NaCl 0.9% over 2 hours", kcl],
      ["KCl 40 mmol IV in 1 L NaCl 0.9% over 2 hours", kcl],
      ["氯化钾40mmol加入1000ml 0.9%，2小时内静滴", kcl],
      ["KCl 20 mmol IV, infusion over 1 h", kcl],
      ["insulin 5.5 units IV, infusion over 1 h", insulin],
      ["insulin 50 units IV in 50 mL at 5.5 mL/h", insulin],
    ] as const) {
      expect(check(text, iv, 55), text).toMatchObject({ outcome: "given", checked: true });
    }
    expect(doseMentions("KCl 40 mmol in 100 mL 0.9% over 10 min")).toEqual([{ amount: 40, unit: "mmol", over: 10 }]);
    for (const text of ["heparin 5000 units IV bolus then 25200 units 0.9% over 2 h", "heparin 5000 units IV bolus; 25200 units, infusion over 2 h", "heparin 5000 units IV bolus then 25200 units (50%) over 2 h"]) {
      expect(check(text, ufh, 70), text).toMatchObject({ outcome: "conflict", dose: { amount: 12600, unit: "unit/h" }, ratio: 10, severity: "critical" });
    }
    expect(check("heparin 5000 units IV bolus; 2520 units, infusion over 2 h", ufh, 70)).toMatchObject({ outcome: "given", dose: { amount: 5000, unit: "unit" } });
    expect(check("alteplase 7.2 mg bolus then 648 mg in 0.9% over 60 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 648, unit: "mg/h" }, ratio: 10, severity: "critical" });
    // the whole dose pushed as a bolus, the bolus word after a comma: 60-fold
    for (const text of ["alteplase 72 mg IV, bolus over 1 min", "alteplase 72 mg, push over 1 min", "阿替普酶72mg，静推，1分钟内"]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "conflict", ratio: 60, severity: "critical" });
    }
    // a time after the volume the drug is made up in is the drug's
    expect(check("alteplase 72 mg IV in 100 mL 0.9% saline over 6 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 720, unit: "mg/h" }, ratio: 10, severity: "critical" });
    expect(check("alteplase 72 mg IV in 100 mL 0.9% saline over 60 min", alteplase, 80)).toMatchObject({ outcome: "given", checked: true });
  });

  it("the bolus's amount alone is asked about over the bolus's own few minutes only; over a longer time its rate is checked", () => {
    for (const text of ["alteplase 7.2 mg IV over 1 min", "alteplase 7.2 mg IV over 5 min", "alteplase 7.2 mg IV bolus"]) expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "query", reason: "partial" });
    expect(check("alteplase 7.2 mg IV over 120 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 3.6, unit: "mg/h" }, severity: "critical" });
    expect(check("alteplase 7.2 mg over 60 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 7.2, unit: "mg/h" }, severity: "warning" });
    expect(check("alteplase 7.2 mg IV infusion over 30 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 14.4, unit: "mg/h" }, severity: "warning" });
  });

  it("a number after an enumeration comma that follows a word is read (\"静推、64.8mg\"); \"0、5mg\" is still a broken number", () => {
    expect(check("阿替普酶7.2mg静推、64.8mg于6分钟内泵入", alteplase, 80)).toMatchObject(tenfoldRest);
    expect(check("阿替普酶7.2mg静推、64.8mg于60分钟内泵入", alteplase, 80)).toMatchObject({ outcome: "given", checked: true });
    expect(readOrder("肾上腺素0、5mg肌注").unclear).toEqual({ reason: "unreadable", words: "0、5mg" });
  });
});

describe("checkOrder: the final check's regressions of the second fix round (a whole after its bolus, a dose restated after its bolus word)", () => {
  const alteplase = { doseSpec: DoseSpecSchema.parse({ amount: 0.9, unit: "mg/kg", route: "IV", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } }), risk: "high", critical: true, name: "IV alteplase" } as const;
  const ufh = { doseSpec: DoseSpecSchema.parse({ amount: 70, upTo: 80, unit: "unit/kg", route: "IV", maintenance: { amount: 18, unit: "unit/kg/h" } }), risk: "moderate", name: "Unfractionated heparin IV infusion" } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1], weightKg: number) => checkOrder({ text }, iv, weightKg);

  it("the whole written after its bolus is its infusion, not the whole given in parts: 72 mg over an hour after the bolus is a dose error (en and zh-CN)", () => {
    for (const [text, amount, unit] of [
      ["alteplase 7.2 mg IV bolus, then 72 mg infusion over 1 hour", 72, "mg/h"],
      ["阿替普酶7.2mg静推，随后72mg于60分钟内泵入", 72, "mg/h"],
      ["alteplase 0.09 mg/kg bolus, then 0.9 mg/kg over 60 min", 0.9, "mg/kg/h"],
    ] as const) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "conflict", dose: { amount, unit }, severity: "warning" });
    }
    // the bolus's own minute is no infusion: the 72 mg's rate is what is wrong
    expect(check("alteplase 7.2 mg IV bolus over 1 min, then 72 mg infusion over 1 hour", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 72, unit: "mg/h" }, severity: "warning" });
    // with no time for it, the bolus and the whole again are two doses: asked about, never given
    for (const text of ["alteplase 7.2 mg IV push, 72 mg IV infusion", "alteplase 7.2 mg IV bolus over 1 min, then 72 mg IV infusion"]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "query", reason: "several" });
    }
    // the whole written first, or after its bolus as what the rest is of, or as the total: the whole given in its parts
    for (const text of [
      "alteplase 72 mg IV, 7.2 mg bolus",
      "alteplase 72 mg IV with a 7.2 mg bolus over 1 min",
      "阿替普酶72mg，7.2mg静推，其余60分钟内泵入",
      "alteplase 7.2 mg IV bolus over 1 min, then the rest of the 72 mg over 60 min",
      "alteplase bolus 7.2 mg over 1 minute, then infuse the remainder of the 72 mg total dose over 60 minutes",
      "alteplase 7.2 mg IV bolus over 1 min, the rest over 60 min (total dose 72 mg)",
      "alteplase 0.09 mg/kg IV bolus, then the rest of the 0.9 mg/kg over 60 min",
      "alteplase 7.2 mg IV bolus over 1 min, then infusion over 60 min; 72 mg total",
      "alteplase 7.2 mg IV bolus over 1 min, then infusion over 60 min (72 mg in total)",
      "alteplase 7.2 mg IV bolus over 1 min, then infuse the balance of the 72 mg over 60 min",
      "alteplase 7.2 mg IV bolus over 1 min, followed by infusion to complete 72 mg over 60 min",
      "阿替普酶7.2mg静推，然后泵入60分钟，72mg总量",
    ]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    // a bolus rounded so that it and the whole again fall within the whole's rounding is still the whole again (79 mg)
    expect(check("alteplase 7 mg IV bolus, then 72 mg IV infusion", alteplase, 80)).toMatchObject({ outcome: "query", reason: "several" });
  });

  it("a dose written again after its route and bolus word or a comma (\"IV bolus (70 units/kg)\", \"，即4900单位\") is the same dose over the same time — never a 420 units/kg/h infusion (en and zh-CN)", () => {
    for (const [text, amount, unit] of [
      ["heparin 5000 units IV bolus (70 units/kg) over 10 min", 5000, "unit"],
      ["heparin 80 units/kg IV bolus (5600 units) over 10 min, then 18 units/kg/h", 80, "unit/kg"],
      ["肝素70单位/kg，即4900单位，10分钟内静推", 70, "unit/kg"],
      ["heparin 5000 units IV push, i.e. 70 units/kg, over 10 min", 5000, "unit"],
      ["肝素5000单位静推（70单位/kg），10分钟内推完", 5000, "unit"],
    ] as const) {
      expect(check(text, ufh, 70), text).toMatchObject({ outcome: "given", dose: { amount, unit } });
    }
    expect(doseMentions("heparin 5000 units IV bolus (70 units/kg) over 10 min")).toEqual([{ amount: 5000, unit: "unit", over: 10 }, { amount: 70, unit: "unit/kg", copy: true }]);
    // however the copy says how it is given (inside its bracket or after it)
    for (const text of ["肝素5000单位（70单位/kg静推，10分钟内推完）", "heparin 5000 units IV (70 units/kg IV bolus over 10 min)", "heparin 5000 units (70 units/kg bolus) IV over 10 min", "heparin 5000 units (i.e. 70 units/kg as a bolus) over 10 minutes", "heparin 70 units/kg (4900 units IV push) over 10 minutes, then 18 units/kg/h"]) {
      expect(check(text, ufh, 70), text).toMatchObject({ outcome: "given" });
    }
    // a time is copied only onto the same dose written again — through the weight —, never from a bracketed part onto
    // the whole ("0.9 mg/kg (7.2 mg over 1 min, …)")
    for (const text of [
      "阿替普酶72mg，（7.2mg 1分钟内静推，64.8mg 60分钟内泵入）",
      "alteplase 72 mg, (7.2 mg bolus over 1 min, then 64.8 mg over 60 min)",
      "alteplase 0.9 mg/kg IV (7.2 mg bolus over 1 min, the rest over 60 min)",
      "阿替普酶0.9mg/kg，（7.2mg 1分钟内静推，64.8mg 60分钟内泵入）",
      "阿替普酶0.9mg/kg，即7.2mg 1分钟内静推，64.8mg 60分钟内泵入",
      "alteplase 0.9 mg/kg IV (7.2 mg over 1 min, 64.8 mg over 60 min)",
      "alteplase 0.9 mg/kg IV = 7.2 mg over 1 min + 64.8 mg over 60 min",
    ]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    // the same amount again after "then", over a time, is still the infusion at the rate it runs
    expect(check("heparin 5000 units IV bolus, then 5000 units over 20 min", ufh, 70)).toMatchObject({ outcome: "conflict", dose: { amount: 15000, unit: "unit/h" }, severity: "critical" });
  });
});

describe("checkOrder: the time forms and doses written twice the final check left open (en and zh-CN)", () => {
  const alteplase = { doseSpec: DoseSpecSchema.parse({ amount: 0.9, unit: "mg/kg", route: "IV", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } }), risk: "high", critical: true, name: "IV alteplase" } as const;
  const kcl = { doseSpec: DoseSpecSchema.parse({ amount: 20, unit: "mmol/h", route: "IV" }), risk: "moderate", name: "IV potassium replacement (KCl infusion)" } as const;
  const aspirin = { doseSpec: DoseSpecSchema.parse({ amount: 300, unit: "mg", route: "PO" }), risk: "moderate", name: "Aspirin loading dose" } as const;
  const adrenaline = { doseSpec: DoseSpecSchema.parse({ amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" }), risk: "high", critical: true, name: "IM adrenaline" } as const;
  const methylpred = { doseSpec: DoseSpecSchema.parse({ amount: 1, unit: "g", route: "IV" }), risk: "high", critical: true, name: "IV methylprednisolone" } as const;
  const paracetamol = { doseSpec: DoseSpecSchema.parse({ amount: 1, unit: "g", route: "IV" }), risk: "low", name: "Paracetamol" } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1], weightKg: number) => checkOrder({ text }, iv, weightKg);
  const tenfold = { outcome: "conflict", ratio: 10, severity: "critical" } as const;

  it("an hour and a half is 90 minutes — never the half hour at its end — and hours with minutes are one time wherever they stand", () => {
    for (const text of ["阿替普酶72mg一个半小时内泵入", "阿替普酶72mg 1个半小时内泵入", "alteplase 72 mg IV over one and a half hours", "alteplase 72 mg IV over an hour and a half", "alteplase 72 mg IV over 1.5 hours", "阿替普酶72mg 1小时30分钟内泵入", "alteplase 72 mg IV over 1 hour and 30 minutes", "alteplase 72 mg IV over 1 h 30 min"]) {
      expect(doseMentions(text), text).toEqual([{ amount: 72, unit: "mg", over: 90 }]);
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "conflict", dose: { amount: 48, unit: "mg/h" }, severity: "warning" });
    }
    for (const text of ["KCl 30 mmol IV for 1 h 30 min", "KCl 30 mmol IV infusion x 1 h 30 min", "氯化钾30mmol静滴，用时1小时30分钟", "氯化钾30mmol静脉泵入，时间1小时30分钟", "氯化钾30mmol 1小时30分钟静脉泵入", "KCl 30 mmol IV over one hour and thirty minutes", "KCl 30 mmol infused for 1 hour 30 minutes", "KCl 30 mmol IV as a 1 hour 30 minute infusion", "氯化钾30mmol 一个半小时内静滴"]) {
      expect(check(text, kcl, 55), text).toMatchObject({ outcome: "given", dose: { amount: 20, unit: "mmol/h" } });
    }
  });

  it("reads a tenfold infusion however its time is written — for or x after a route, 时间/用时 after an infusion's word, 推完", () => {
    for (const [right, wrong] of [
      ["alteplase 7.2 mg bolus then 64.8 mg IV for 60 min", "alteplase 7.2 mg bolus then 64.8 mg IV for 6 min"],
      ["alteplase 7.2 mg bolus then 64.8 mg IV infusion x 60 min", "alteplase 7.2 mg bolus then 64.8 mg IV infusion x 6 min"],
      ["阿替普酶7.2mg静推，64.8mg静脉泵入，时间60分钟", "阿替普酶7.2mg静推，64.8mg静脉泵入，时间6分钟"],
      ["阿替普酶7.2mg静推，64.8mg静脉泵入，用时60分钟", "阿替普酶7.2mg静推，64.8mg静脉泵入，用时6分钟"],
      ["阿替普酶7.2mg静推，余量60分钟推完", "阿替普酶7.2mg静推，余量6分钟推完"],
    ] as const) {
      expect(check(right, alteplase, 80), right).toMatchObject({ outcome: "given", checked: true });
      expect(check(wrong, alteplase, 80), wrong).toMatchObject(tenfold);
    }
    // the bolus's own time however written stays the bolus's ("用时1分钟", "历时1分钟", "IV x 1 min" after a 10% bolus)
    for (const text of ["阿替普酶72mg，10%静推，用时1分钟", "阿替普酶72mg，10%静推，耗时1分钟", "阿替普酶72mg，10%静推，历时1分钟", "阿替普酶72mg，10%静推，持续1分钟", "阿替普酶0.9mg/kg，10%静推用时1分钟，其余泵入", "alteplase 72 mg: 10% bolus IV x 1 min, remainder infused"]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    // a window, or "within", says when — not how long
    for (const text of ["alteplase 0.9 mg/kg IV within 4.5 hours of symptom onset", "alteplase 0.9 mg/kg IV; start infusion within 30 minutes", "alteplase 72 mg IV in 3 h of onset", "阿替普酶0.9mg/kg静脉溶栓（发病4.5小时内）", "阿替普酶72mg静脉，发病3小时内，10%静推，其余60分钟内泵入"]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    expect(doseMentions("KCl 20 mmol IV, recheck potassium within 1 hour")).toEqual([{ amount: 20, unit: "mmol" }]);
    expect(doseMentions("ceftriaxone 2 g IV daily for 5 days")).toEqual([{ amount: 2, unit: "g" }]);
  });

  it("a check done within a time is not the dose's time (\"1小时内复查血钾\")", () => {
    for (const text of ["氯化钾40mmol静滴，1小时内复查血钾", "氯化钾40mmol静滴1小时内复查血钾", "氯化钾40mmol静滴，2小时内监测血钾"]) {
      expect(doseMentions(text), text).toEqual([{ amount: 40, unit: "mmol" }]);
      expect(check(text, kcl, 55), text).toMatchObject({ outcome: "query", reason: "rate" });
    }
    expect(check("氯化钾40mmol 2小时内静滴", kcl, 55)).toMatchObject({ outcome: "given", dose: { amount: 20, unit: "mmol/h" } });
    expect(check("阿替普酶72mg，10%静推，其余60分钟内泵入，24小时内复查头颅CT", alteplase, 80)).toMatchObject({ outcome: "given", checked: true });
  });

  it("the same dose written again with nothing else is asked about when it is the preset's; a wrong one stays a dose error; a later dose with a time, a frequency, another route or another drug is no second dose now", () => {
    for (const text of ["aspirin 300 mg then 300 mg", "阿司匹林300mg，之后再300mg", "aspirin 300 mg PO, followed by 300 mg PO", "aspirin 300 mg then 300 mg again"]) {
      expect(check(text, aspirin, 70), text).toMatchObject({ outcome: "query", reason: "several", words: "300 mg, 300 mg" });
    }
    for (const text of ["adrenaline 5 mg IM then 5 mg IM", "肾上腺素5mg肌注，之后再5mg肌注"]) expect(check(text, adrenaline, 62), text).toMatchObject({ outcome: "conflict", severity: "critical" });
    for (const [text, iv] of [
      ["aspirin 300 mg PO, then 300 mg OD", aspirin],
      ["阿司匹林300mg嚼服，之后300mg qd", aspirin],
      ["aspirin 300 mg (300 mg)", aspirin],
      ["adrenaline 0.5 mg IM, then 0.5 mg IM 5 minutes later", adrenaline],
      ["adrenaline 0.5 mg IM, then 0.5 mg IM after 5 minutes if no improvement", adrenaline],
      ["methylprednisolone 1 g IV, then 1 g IV the next day", methylpred],
      ["甲泼尼龙1g静滴，之后1g，24小时一次", methylpred],
      ["aspirin 300 mg PO, then clopidogrel 300 mg PO", aspirin],
      ["paracetamol 1 g IV then 1 g PO", paracetamol],
    ] as const) {
      expect(check(text, iv, 70), text).toMatchObject({ outcome: "given", checked: true });
    }
  });
});

describe("checkOrder: the comparison of the fix rounds with main (a dose written again, a time that is no dose's, per kg each hour)", () => {
  const alteplase = { doseSpec: DoseSpecSchema.parse({ amount: 0.9, unit: "mg/kg", route: "IV", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } }), risk: "high", critical: true, name: "IV alteplase" } as const;
  const ufh = { doseSpec: DoseSpecSchema.parse({ amount: 70, upTo: 80, unit: "unit/kg", route: "IV", maintenance: { amount: 18, unit: "unit/kg/h" } }), risk: "moderate", name: "Unfractionated heparin IV infusion" } as const;
  const kcl = { doseSpec: DoseSpecSchema.parse({ amount: 20, unit: "mmol/h", route: "IV" }), risk: "moderate", name: "IV potassium replacement (KCl infusion)" } as const;
  const aspirin = { doseSpec: DoseSpecSchema.parse({ amount: 300, unit: "mg", route: "PO" }), risk: "moderate", name: "Aspirin loading dose" } as const;
  const check = (text: string, iv: Parameters<typeof checkOrder>[1], weightKg: number) => checkOrder({ text }, iv, weightKg);
  const tenfold = { outcome: "conflict", dose: { amount: 648, unit: "mg/h" }, ratio: 10, severity: "critical" } as const;

  it("每小时 before a dose per kg is per hour (\"每小时18单位/kg\"), and the bolus's own 用时 is the bolus's: heparin's regimen is given, a tenfold maintenance a dose error", () => {
    expect(doseMentions("肝素每小时18单位/kg泵入")).toEqual([{ amount: 18, unit: "unit/kg/h" }]);
    expect(check("肝素每小时18单位/kg泵入", ufh, 70)).toMatchObject({ outcome: "given", dose: { amount: 18, unit: "unit/kg/h" } });
    for (const text of ["肝素80单位/kg静推，用时5分钟，然后每小时18单位/kg泵入", "肝素5600单位静推，用时5分钟，随后每小时18单位/kg持续泵入"]) {
      expect(check(text, ufh, 70), text).toMatchObject({ outcome: "given", checked: true });
    }
    expect(check("肝素80单位/kg静推，用时5分钟，然后每小时180单位/kg泵入", ufh, 70)).toMatchObject({ outcome: "conflict", dose: { amount: 180, unit: "unit/kg/h" }, ratio: 10, severity: "critical" });
  });

  it("a part written again in brackets (\"7.2 mg (0.09 mg/kg)\", \"7.2 mg (10%)\") is counted once, and its time is its own — the infusion's rate as it runs", () => {
    for (const text of [
      "alteplase 7.2 mg (0.09 mg/kg) IV bolus over 1 min, then 64.8 mg (0.81 mg/kg) over 60 min",
      "阿替普酶7.2mg（0.09mg/kg）1分钟内静推，64.8mg（0.81mg/kg）60分钟内泵入",
      "alteplase 7.2 mg (10%) over 1 min, then 64.8 mg (90%) over 60 min",
      "阿替普酶7.2mg（10%）1分钟内静推，64.8mg（90%）60分钟内泵入",
      "alteplase 72 mg, 7.2 mg (10%) IV bolus over 1 min, 64.8 mg (90%) IV infusion over 60 min",
      "alteplase 7.2 mg (10% of 72 mg) bolus over 1 min, then 64.8 mg over 60 min",
    ]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
      expect(check(text.replace(/60 min|60分钟/u, (t) => t.replace("60", "6")), alteplase, 80), text).toMatchObject(tenfold);
    }
    expect(doseMentions("alteplase 7.2 mg (10%) over 1 min, then 64.8 mg (90%) over 6 min")).toEqual([{ amount: 7.2, unit: "mg", over: 1 }, { amount: 64.8, unit: "mg", over: 6, infusionAmount: true }]);
    // a share of the order's only dose still names its part: the time after it is the bolus's, the rest's its own
    expect(check("alteplase 0.9 mg/kg (10%) bolus over 1 min, rest over 60 min", alteplase, 80)).toMatchObject({ outcome: "given", checked: true });
    expect(check("alteplase 0.9 mg/kg (10%) bolus over 1 min, rest over 6 min", alteplase, 80)).toMatchObject({ outcome: "conflict", dose: { amount: 8.1, unit: "mg/kg/h" }, ratio: 10, severity: "critical" });
  });

  it("the whole an infusion runs to (\"to 72 mg\", \"补足72mg\", \"泵入至72mg\") is the whole given in its parts", () => {
    for (const text of [
      "alteplase 7.2 mg IV bolus over 1 min, then infusion to 72 mg over 60 min",
      "alteplase 7.2 mg IV bolus over 1 min, then infuse up to 72 mg over 60 min",
      "阿替普酶7.2mg静推，余量补足72mg于60分钟内泵入",
      "阿替普酶7.2mg 1分钟内静推，再泵入至72mg，60分钟",
      "阿替普酶7.2mg 1分钟内静推，然后泵入到72mg，60分钟内",
    ]) {
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
  });

  it("a dose written again in its other unit keeps the one the preset is counted in: KCl in grams with its mmol", () => {
    for (const text of ["KCl 1.5 g (20 mmol) IV over 60 minutes", "KCl 20 mmol (1.5 g) IV over 1 h", "10%氯化钾15ml（20mmol）1小时内静滴", "氯化钾1.5g，即20mmol，1小时内静滴", "氯化钾1.5g（20mmol）静滴1小时"]) {
      expect(check(text, kcl, 55), text).toMatchObject({ outcome: "given", dose: { amount: 20, unit: "mmol/h" } });
    }
    expect(check("KCl 1.5 g (20 mmol) IV over 6 min", kcl, 55)).toMatchObject({ outcome: "conflict", dose: { amount: 200, unit: "mmol/h" }, ratio: 10, severity: "critical" });
    // the two units disagree: the preset's is the dose ordered
    expect(check("KCl 40 mmol (1.5 g) IV over 1 h", kcl, 55)).toMatchObject({ outcome: "conflict", dose: { amount: 40, unit: "mmol/h" }, ratio: 2 });
  });

  it("a dose written again after \"-\", \"/\", \"which is\", \"that is\" or \"namely\" is the same dose over the same time", () => {
    for (const text of ["heparin 80 units/kg - 5600 units - IV bolus over 10 min", "heparin 80 units/kg / 5600 units IV bolus over 10 min", "heparin 80 units/kg, which is 5600 units, IV bolus over 10 min", "heparin 80 units/kg, that is 5600 units, IV bolus over 10 min", "heparin 80 units/kg, namely 5600 units, IV bolus over 10 min"]) {
      expect(check(text, ufh, 70), text).toMatchObject({ outcome: "given", dose: { amount: 80, unit: "unit/kg" } });
    }
    // after a closing bracket, the time is the dose's before the bracket
    expect(doseMentions("heparin 5000 units (70 units/kg) over 10 min, then 18 units/kg/h")).toEqual([{ amount: 5000, unit: "unit", over: 10 }, { amount: 70, unit: "unit/kg", copy: true }, { amount: 18, unit: "unit/kg/h" }]);
  });

  it("a time is no dose's when it is an onset window (最后正常时间, 发病后, 4个半小时, 四点五小时) or when its clause is about monitoring", () => {
    for (const text of ["阿替普酶0.9mg/kg静脉溶栓（最后正常时间4.5小时内）", "阿替普酶0.9mg/kg静脉溶栓（末次正常4.5小时内）", "阿替普酶0.9mg/kg静脉溶栓（发病后4.5小时内）", "阿替普酶0.9mg/kg静脉溶栓（发病4个半小时内）", "阿替普酶0.9mg/kg静脉溶栓，发病四点五小时内", "阿替普酶0.9mg/kg，时间窗4.5小时内", "alteplase 0.9 mg/kg IV, monitor BP for 24 hours"]) {
      expect(doseMentions(text), text).toEqual([{ amount: 0.9, unit: "mg/kg" }]);
      expect(check(text, alteplase, 80), text).toMatchObject({ outcome: "given", checked: true });
    }
    expect(check("阿替普酶72mg，症状出现后3小时内，10%静推，其余60分钟内泵入", alteplase, 80)).toMatchObject({ outcome: "given", checked: true });
    expect(doseMentions("alteplase 72 mg IV, 10% bolus over 1 min, rest over 60 min; BP checks over 24 h")).toEqual([{ amount: 72, unit: "mg", restOver: 60 }]);
    for (const text of ["KCl 20 mmol IV, monitor ECG for 2 h", "氯化钾20mmol静滴，心电监护2小时"]) {
      expect(check(text, kcl, 55), text).toMatchObject({ outcome: "query", reason: "rate" });
    }
    expect(check("KCl 20 mmol IV over 1 h, monitor ECG for 2 h", kcl, 55)).toMatchObject({ outcome: "given", dose: { amount: 20, unit: "mmol/h" } });
  });

  it("the same dose again after a route written before it is still the dose written twice", () => {
    for (const text of ["aspirin PO 300 mg then 300 mg", "aspirin PO 300 mg then PO 300 mg", "阿司匹林口服300mg，之后再口服300mg"]) {
      expect(check(text, aspirin, 70), text).toMatchObject({ outcome: "query", reason: "several", words: "300 mg, 300 mg" });
    }
  });
});

describe("checkOrder: an amount after the bolus is what runs next, unless the words make it the whole (the comparison with main)", () => {
  const alteplase = { doseSpec: DoseSpecSchema.parse({ amount: 0.9, unit: "mg/kg", route: "IV", bolus: { amount: 0.09, unit: "mg/kg" }, maintenance: { amount: 0.81, unit: "mg/kg/h" } }), risk: "high", critical: true, name: "IV alteplase" } as const;
  const kcl = { doseSpec: DoseSpecSchema.parse({ amount: 20, unit: "mmol/h", route: "IV" }), risk: "moderate", name: "IV potassium replacement (KCl infusion)" } as const;
  const check = (text: string, weightKg = 80) => checkOrder({ text }, alteplase, weightKg);
  const overrun = { outcome: "conflict", dose: { amount: 72, unit: "mg/h" }, severity: "warning" } as const;

  it("the whole written after its bolus — however joined, before or after an infusion's word — runs after it: 79.2 mg, a dose error or asked, never given", () => {
    for (const text of [
      "alteplase 7.2 mg IV bolus, 72 mg IV over 60 min",
      "alteplase 7.2 mg IV push and 72 mg over 60 min",
      "alteplase 7.2 mg IV push, 72 mg IV drip over 60 min",
      "alteplase IV push 7.2 mg, IV infusion 72 mg over 60 min",
      "alteplase bolus 7.2 mg over 1 min, infusion 72 mg over 60 min",
      "alteplase bolus 7.2 mg, infusion of 72 mg over 60 min",
      "alteplase 7.2 mg IV bolus, then the remaining 72 mg over 60 min",
      "alteplase 7.2 mg IV bolus, then 72 mg infusion over 60 min to complete treatment",
      "阿替普酶7.2mg 1分钟内静推，余下的72mg 60分钟内泵入",
      "阿替普酶7.2mg静推，72mg 1小时滴完",
      "阿替普酶7.2mg静推，随后72mg共60分钟泵完",
      "alteplase 72 mg IV: 7.2 mg bolus over 1 min, then 72 mg over 60 min",
    ]) {
      expect(check(text), text).toMatchObject(overrun);
    }
    for (const text of ["阿替普酶静推7.2mg，泵入72mg", "alteplase 7.2 mg IV bolus, then 72 mg infusion over a total of 60 min", "alteplase 7.2 mg IV bolus, the rest (72 mg) over 60 min"]) {
      expect(check(text), text).toMatchObject({ outcome: "query", reason: "several" });
    }
  });

  it("the words that make it the whole: a total, the rest *of* it, a share of it, what it runs to, the bolus taken from it", () => {
    for (const text of [
      "alteplase 7.2 mg IV bolus, then the rest of the 72 mg over 60 min",
      "alteplase 7.2 mg IV bolus then the other 90% of 72 mg over 60 min",
      "alteplase 10% bolus (7.2 mg) of the 72 mg dose, the rest over 60 min",
      "alteplase 7.2 mg IV bolus, then 72 mg in total over 60 min",
      "alteplase 7.2 mg IV bolus, then infuse 72 mg (including the bolus) over 60 min",
      "阿替普酶7.2mg静推，随后72mg（含推注量）60分钟内泵入",
      "alteplase 72 mg — 7.2 mg IV bolus followed by 72 mg minus bolus over 60 min",
      "alteplase bolus 7.2 mg, infusion to 72 mg over 60 min",
      "alteplase 7.2 mg IV bolus over 1 min followed by infusion to complete 72 mg over 60 min",
      "alteplase 72 mg infusion, 7.2 mg bolus",
      "alteplase 0.09 mg/kg IV bolus then 0.81 mg/kg/h for 1 h (total 0.9 mg/kg = 72 mg)",
    ]) {
      expect(check(text), text).toMatchObject({ outcome: "given", checked: true });
    }
    // the first dose written again is the first dose, whatever words follow it ("(72 mg) IV infusion")
    for (const text of ["alteplase 0.9 mg/kg (72 mg) IV infusion, 7.2 mg bolus over 1 min, rest over 60 min", "阿替普酶0.9mg/kg（72mg）静脉泵入，其中7.2mg 1分钟内静推，其余60分钟内泵入"]) {
      expect(check(text), text).toMatchObject({ outcome: "given", checked: true });
    }
  });

  it("the rest's time is kept when its dose is written again (\"0.9 mg/kg (72 mg) …, the rest over 6 minutes\")", () => {
    expect(check("alteplase 0.9 mg/kg (72 mg) IV: 10% (7.2 mg) bolus over 1 minute, the rest over 6 minutes")).toMatchObject({ outcome: "conflict", dose: { amount: 8.1, unit: "mg/kg/h" }, ratio: 10, severity: "critical" });
    expect(check("alteplase 0.9 mg/kg (72 mg) IV: 10% (7.2 mg) bolus over 1 minute, the rest over 60 minutes")).toMatchObject({ outcome: "given", checked: true });
  });

  it("a range of times is none in English, in every form (\"as a 1-2 hour infusion\")", () => {
    for (const text of ["KCl 40 mmol as a 1-2 hour infusion", "KCl 40 mmol as a 1 to 2 hour infusion", "KCl 40 mmol over 1-2 hours", "KCl 40 mmol IV for 1 h to 2 h", "KCl 40 mmol IV over 60 minutes - 2 hours"]) {
      expect(doseMentions(text), text).toEqual([{ amount: 40, unit: "mmol" }]);
      expect(checkOrder({ text }, kcl, 55), text).toMatchObject({ outcome: "query", reason: "rate" });
    }
    expect(checkOrder({ text: "KCl 40 mmol as a 2-hour infusion" }, kcl, 55)).toMatchObject({ outcome: "given", dose: { amount: 20, unit: "mmol/h" } });
    expect(doseMentions("alteplase 72 mg IV over 30 min to 1 hour")).toEqual([{ amount: 72, unit: "mg" }]);
  });
});
