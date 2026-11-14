/**
 * Doses (docs/PROTOCOL.md §3.2): what a written order states, and how it compares with an intervention's preset
 * after unit conversion — the tenfold difference a free-text order must never lose (audit 2026-11-12, P0-2).
 */
import { describe, expect, it } from "vitest";
import { DOSE_UNITS, DoseSpecSchema, OrderedDoseSchema } from "../schema/common.js";
import { checkOrder, compareDose, doseErrorSeverity, doseMentions, doseRoute, formatDose, isHighAlert, parseDose, readOrder } from "./index.js";

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
    expect(doseMentions("阿替普酶7.2mg静推，剩余64.8mg在60分钟内泵入")).toEqual([{ amount: 7.2, unit: "mg" }, { amount: 64.8, unit: "mg", over: 60 }]);
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
