/**
 * The reporting agent's validator (docs/STUDIES.md §5, the engineering recommendations P1-6): a model never owns the
 * values — every number it writes is bound to the observation it states and checked against that observation, so a
 * heart rate and a PR interval swapped are refused, as are numbers bound to nothing, an impression resting on an
 * observation that does not exist, and a finding the study did not make. The template passes the same check.
 */
import { describe, expect, it } from "vitest";
import type { StudyAccession, StudyProfile } from "@clinicalcraft/core";
import { templateReport, validateReport, type ReportText } from "./studies.js";

const L = (en: string, zh = en) => ({ en, "zh-CN": zh });
const accession: StudyAccession = {
  id: "ecg-1",
  order: "ord-1",
  code: "ecg",
  collector: "nurse",
  at: 10,
  revision: 3,
  quality: "good",
  dueAt: 20,
  profileVersion: "1",
  observations: [
    { id: "rate", label: L("Ventricular rate", "心室率"), value: 78, unit: "/min", low: 60, high: 100, flag: "normal" },
    { id: "pr", label: L("PR interval", "PR 间期"), value: 169, unit: "ms", low: 120, high: 200, flag: "normal" },
    { id: "rhythm", label: L("Rhythm", "节律"), text: L("sinus rhythm", "窦性心律") },
  ],
};
const profile = { code: "ecg", name: L("ECG"), aliases: [], acquisition: "bedside-device", requires: [], turnaroundMinutes: 10, version: "1", model: { kind: "ecg", rhythm: L("sinus"), prMs: [120, 200], qrsMs: [80, 100], qtcMs: [400, 440], dextrocardia: false, findings: [] } } as unknown as StudyProfile;

/** A model's report: bound phrases inside the findings. */
function written(rate: string, pr: string, extra: Partial<ReportText> = {}): ReportText {
  const findings = `${rate}. ${pr}. Rhythm: sinus rhythm`;
  return {
    findings: L(findings, findings),
    impression: L("Sinus rhythm.", "窦性心律。"),
    limitations: L("simulated"),
    generator: "a-model",
    bindings: [
      { observation: "rate", en: rate, "zh-CN": rate },
      { observation: "pr", en: pr, "zh-CN": pr },
    ],
    supportedBy: ["rhythm"],
    ...extra,
  };
}

describe("the report validator binds every number to its observation", () => {
  it("the template passes", () => {
    expect(validateReport(accession, templateReport(profile, accession))).toEqual([]);
  });

  it("a correct narrative passes", () => {
    expect(validateReport(accession, written("Sinus rhythm at 78/min", "PR interval 169 ms"))).toEqual([]);
  });

  it("a heart rate and a PR interval swapped are refused, though both numbers are observations", () => {
    const problems = validateReport(accession, written("Sinus rhythm at 169/min", "PR interval 78 ms"));
    expect(problems).toEqual(expect.arrayContaining([expect.stringMatching(/169 stated for "rate" is not its value \(78\)/), expect.stringMatching(/78 stated for "pr" is not its value \(169\)/)]));
  });

  it("every conclusion is an inference from the observations it cites: no certainty, no term they do not support (the audit's \"pulmonary embolism confirmed\")", () => {
    const pe = validateReport(accession, written("Rate 78/min", "PR 169 ms", { impression: L("Acute pulmonary embolism confirmed.", "急性肺栓塞已确诊。"), supportedBy: [] }));
    expect(pe).toEqual(expect.arrayContaining([
      expect.stringMatching(/en: "confirm…" claims a certainty a simulated study cannot give/),
      expect.stringMatching(/en: the impression's "acute, pulmonary, embolism[^"]*" rests on no observation it cites/),
      expect.stringMatching(/zh-CN: "确诊…" claims a certainty/),
      expect.stringMatching(/zh-CN: the impression's "[^"]*肺[^"]*" rests on no observation it cites/),
    ]));
    // a term the cited observation does support passes; the same term with nothing cited does not
    expect(validateReport(accession, written("Rate 78/min", "PR 169 ms", { impression: L("Sinus rhythm.", "窦性心律。"), supportedBy: ["rhythm"] }))).toEqual([]);
    expect(validateReport(accession, written("Rate 78/min", "PR 169 ms", { impression: L("Sinus rhythm.", "窦性心律。"), supportedBy: [] }))).toEqual(expect.arrayContaining([expect.stringMatching(/en: the impression's "sinus, rhythm" rests on no observation/)]));
    // wording that states no finding stands without a citation
    expect(validateReport(accession, written("Rate 78/min", "PR 169 ms", { impression: L("Within the reference intervals.", "在参考范围内。"), supportedBy: [] }))).toEqual([]);
  });

  it("numbers bound to nothing, a binding to no observation, an impression resting on nothing, an unsupported finding", () => {
    const loose: ReportText = { findings: L("Rate 78, PR 169."), impression: L("Normal."), limitations: L("x"), generator: "a-model" };
    expect(validateReport(accession, loose)).toEqual(expect.arrayContaining([expect.stringMatching(/the number 78 is bound to no observation/)]));
    expect(validateReport(accession, written("Rate 78/min", "PR 169 ms", { bindings: [{ observation: "qtc", en: "Rate 78/min", "zh-CN": "Rate 78/min" }] }))).toEqual(expect.arrayContaining([expect.stringMatching(/"qtc", which is no observation/)]));
    expect(validateReport(accession, written("Rate 78/min", "PR 169 ms", { supportedBy: ["st-segment"] }))).toEqual(expect.arrayContaining([expect.stringMatching(/rests on "st-segment"/)]));
    expect(validateReport(accession, written("Rate 78/min", "PR 169 ms", { impression: L("Acute infarction."), supportedBy: ["rhythm"] }))).toEqual(expect.arrayContaining([expect.stringMatching(/"infarct" is not a finding of this study/)]));
    expect(validateReport(accession, written("Rate 78/min", "PR 169 ms", { impression: L("Rate 95."), supportedBy: ["rhythm"] }))).toEqual(expect.arrayContaining([expect.stringMatching(/impression's 95 rests on no observation/)]));
  });
});
