/**
 * Patient transport and truthful bystander cues (review G8 / G12, docs/EMBODIED.md §8,
 * docs/CASE_AUTHORING.md): the authored fields — an intervention's `posture`, `destination` and oxygen
 * `device`, a phase's `location`, an investigation's `performedAt` — and the cues derived from them.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DestinationSchema, InterventionSchema, InvestigationSchema, PhaseSchema, type CaseDefinition } from "../schema/case.js";
import { createSession, oxygenAccessory, parseCase, patientCues, patientPosture, reduce } from "./index.js";

function builtin(id: string): CaseDefinition {
  const parsed = parseCase(JSON.parse(readFileSync(new URL(`../../../content/cases/${id}/case.json`, import.meta.url), "utf8")));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.value;
}

const iv = (extra: Record<string, unknown>) => ({ id: "x", name: { "zh-CN": "x", en: "x" }, kind: "oxygen", ...extra });

describe("authored transport fields (schema)", () => {
  it("an intervention may author the posture it leaves the patient in and where it takes the patient", () => {
    const ok = InterventionSchema.safeParse(iv({ kind: "disposition", posture: "lying", destination: { setting: "icu" } }));
    expect(ok.success).toBe(true);
    expect(InterventionSchema.safeParse(iv({ posture: "upside-down" })).success).toBe(false);
  });

  it("a destination names exactly one of a setting, a room kind or a capability", () => {
    expect(DestinationSchema.safeParse({ setting: "emergency" }).success).toBe(true);
    expect(DestinationSchema.safeParse({ roomKind: "icu" }).success).toBe(true);
    expect(DestinationSchema.safeParse({ capability: "fluoroscopy" }).success).toBe(true);
    expect(DestinationSchema.safeParse({}).success).toBe(false);
    expect(DestinationSchema.safeParse({ setting: "icu", capability: "ct" }).success).toBe(false);
    expect(DestinationSchema.safeParse({ setting: "moon" }).success).toBe(false);
    expect(DestinationSchema.safeParse({ roomKind: "dungeon" }).success).toBe(false);
  });

  it("a phase may author where the patient is during it; an investigation where it is performed", () => {
    expect(PhaseSchema.safeParse({ id: "cath", label: { "zh-CN": "导管室", en: "Cath lab" }, location: { capability: "fluoroscopy" } }).success).toBe(true);
    const inv = { id: "cxr", name: { "zh-CN": "床旁胸片", en: "Portable CXR" }, category: "imaging", requires: ["xray"], results: {} };
    expect(InvestigationSchema.safeParse({ ...inv, performedAt: "bedside" }).success).toBe(true);
    expect(InvestigationSchema.safeParse({ ...inv, performedAt: "provider" }).success).toBe(true);
    expect(InvestigationSchema.safeParse({ ...inv, performedAt: "garden" }).success).toBe(false);
  });

  it("an oxygen intervention may name its delivery device", () => {
    expect(InterventionSchema.safeParse(iv({ device: "non-rebreather-mask" })).success).toBe(true);
    expect(InterventionSchema.safeParse(iv({ device: "snorkel" })).success).toBe(false);
  });
});

describe("oxygen accessory from the delivery device (G12)", () => {
  const base = { id: "oxygen-high-flow", name: { "zh-CN": "高流量吸氧", en: "High-flow oxygen" }, kind: "oxygen" as const };
  it("the authored device decides: a non-rebreather, Venturi or simple mask is a mask; nasal cannulae are cannulae", () => {
    for (const device of ["non-rebreather-mask", "venturi-mask", "simple-mask", "nebuliser-mask"] as const) expect(oxygenAccessory({ ...base, device })).toBe("oxygen-mask");
    for (const device of ["nasal-cannula", "high-flow-nasal-cannula"] as const) expect(oxygenAccessory({ ...base, device })).toBe("nasal-cannula");
  });

  it("without a device, the dose text is read too (\"15 L/min via non-rebreather mask\" is a mask)", () => {
    expect(oxygenAccessory({ ...base, dose: { "zh-CN": "经非重复呼吸面罩 15 L/min", en: "15 L/min via non-rebreather mask" } })).toBe("oxygen-mask");
    expect(oxygenAccessory({ ...base, dose: { "zh-CN": "储氧面罩 15 L/min", en: "15 L/min" } })).toBe("oxygen-mask");
    expect(oxygenAccessory({ ...base, dose: { "zh-CN": "鼻导管 2 L/min", en: "Nasal cannula 2 L/min" } })).toBe("nasal-cannula");
    expect(oxygenAccessory(base)).toBe("nasal-cannula");
  });

  it("the garden anaphylaxis patient on 15 L via a non-rebreather wears a mask (the reviewer's reproduction)", () => {
    const c = builtin("anaphylaxis-garden");
    let s = reduce(c, createSession(c), { type: "start" }).state;
    s = reduce(c, s, { type: "intervene", interventionId: "oxygen-high-flow" }).state;
    expect(patientCues(c, s).accessory).toBe("oxygen-mask");
  });

  it("every oxygen intervention of the built-in cases names its device", () => {
    for (const id of ["acute-appendicitis", "acute-ischemic-stroke", "anaphylaxis-garden", "dka-adult", "pediatric-asthma", "pulmonary-embolism-postop", "septic-shock-cap", "stemi-inferior-rv"]) {
      for (const i of builtin(id).interventions.filter((x) => x.kind === "oxygen")) expect(i.device, `${id} ${i.id}`).toBeDefined();
    }
  });
});

describe("perceived posture follows clinical state (G12)", () => {
  it("starts as the case's posture and follows the latest intervention that authors one", () => {
    const c = builtin("anaphylaxis-garden");
    let s = reduce(c, createSession(c), { type: "start" }).state;
    expect(patientPosture(c, s)).toBe("sitting");
    expect(patientCues(c, s).posture).toBe("sitting");
    s = reduce(c, s, { type: "intervene", interventionId: "position-supine-legs" }).state;
    expect(patientPosture(c, s)).toBe("lying");
    s = reduce(c, s, { type: "intervene", interventionId: "position-sit-upright" }).state;
    expect(patientPosture(c, s)).toBe("sitting");
    s = reduce(c, s, { type: "intervene", interventionId: "transfer-ed" }).state;
    expect(patientPosture(c, s)).toBe("lying");
  });

  it("interventions without an authored posture leave it unchanged", () => {
    const c = builtin("pulmonary-embolism-postop");
    let s = reduce(c, createSession(c), { type: "start" }).state;
    expect(patientPosture(c, s)).toBe("lying");
    s = reduce(c, s, { type: "intervene", interventionId: "o2-nasal" }).state;
    expect(patientPosture(c, s)).toBe("lying");
    s = reduce(c, s, { type: "intervene", interventionId: "positioning" }).state;
    expect(patientPosture(c, s)).toBe("sitting");
  });
});

describe("authored destinations and locations of the built-in cases", () => {
  it("transfers that move the patient at once say where; phases that happen elsewhere say where", () => {
    expect(builtin("stemi-inferior-rv").interventions.find((i) => i.id === "transfer-cath-lab")?.destination).toEqual({ capability: "fluoroscopy" });
    expect(builtin("pulmonary-embolism-postop").interventions.find((i) => i.id === "transfer-hdu")?.destination).toEqual({ setting: "icu" });
    expect(builtin("stemi-inferior-rv").phases.find((p) => p.id === "cath")?.location).toEqual({ capability: "fluoroscopy" });
    expect(builtin("acute-ischemic-stroke").phases.find((p) => p.id === "angio")?.location).toEqual({ capability: "fluoroscopy" });
    expect(builtin("anaphylaxis-garden").phases.find((p) => p.id === "ed-resus")?.location).toEqual({ setting: "emergency" });
    // a transfer that is only arranged (the move happens when the phase starts) has no destination of its own
    expect(builtin("acute-ischemic-stroke").interventions.find((i) => i.id === "transfer-angio")?.destination).toBeUndefined();
    expect(builtin("anaphylaxis-garden").interventions.find((i) => i.id === "transfer-ed")?.destination).toBeUndefined();
  });

  it("portable chest X-rays are performed at the bedside", () => {
    expect(builtin("stemi-inferior-rv").investigations.find((i) => i.id === "cxr-portable")?.performedAt).toBe("bedside");
    expect(builtin("septic-shock-cap").investigations.find((i) => i.id === "cxr")?.performedAt).toBe("bedside");
  });
});
