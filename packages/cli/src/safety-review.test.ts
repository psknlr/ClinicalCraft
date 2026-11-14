/**
 * The safety-review worksheet (`cases safety-review`, audit 2026-11-12 P2-14): every critical intervention and
 * high-risk drug of the library, with the contraindication the engine applies in words and the harm the case states,
 * and empty verdict columns — it says plainly that no independent review has been recorded.
 */
import { describe, expect, it } from "vitest";
import { isHighAlert } from "@clinicalcraft/core";
import { loadContent } from "@clinicalcraft/agent/node";
import { conditionWords, safetyReviewMarkdown, safetyReviewWorksheet } from "./safety-review.js";

const content = await loadContent({ dirs: [] });
const cases = [...content.cases.values()].map((e) => e.def);

describe("cases safety-review", () => {
  const sheet = safetyReviewWorksheet(cases, "en");

  it("lists every critical intervention and high-risk or high-alert medicine, and nothing else", () => {
    const expected = cases.flatMap((c) => c.interventions.filter((iv) => iv.critical || (iv.kind === "medication" && iv.risk === "high") || isHighAlert(iv)).map((iv) => `${c.id}/${iv.id}`));
    expect(sheet.items.map((i) => `${i.caseId}/${i.interventionId}`).sort()).toEqual(expected.sort());
    expect(sheet.items.length).toBeGreaterThan(0);
    for (const c of cases) for (const iv of c.interventions.filter((x) => x.critical)) expect(sheet.items.find((i) => i.caseId === c.id && i.interventionId === iv.id)?.reasons, `${c.id}/${iv.id}`).toContain("critical");
  });

  it("records no verdict: every review column is empty and the worksheet says no review was recorded", () => {
    expect(sheet.reviewed).toBe(false);
    expect(sheet.items.every((i) => i.review.clinician === null && i.review.nurse === null && i.review.disagreement === null)).toBe(true);
    const en = safetyReviewMarkdown(sheet, "en");
    const zh = safetyReviewMarkdown(safetyReviewWorksheet(cases, "zh-CN"), "zh-CN");
    expect(en).toContain("No independent review has been recorded yet.");
    expect(en).toContain("| Specialty clinician | Nurse | Disagreement |");
    expect(zh).toContain("目前尚未记录任何独立审核。");
    expect(zh).toContain("| 专科医师意见 | 护士意见 | 分歧 |");
  });

  it("states the contraindication the engine applies and the harm, from the case", () => {
    const tnk = sheet.items.find((i) => i.caseId === "acute-ischemic-stroke" && i.interventionId === "tenecteplase")!;
    expect(tnk.reasons).toEqual(["critical", "high-risk", "high-alert"]);
    expect(tnk.contraindication).toContain("SBP > 185");
    expect(tnk.contraindication).toMatch(/NOT \[asked: “Is he taking any blood thinners/);
    // the alternatives stay apart: "no glucose and no chemistry" is one bracketed group among them
    expect(tnk.contraindication).toMatch(/\[NOT \[result read: Capillary blood glucose[^\]]*\] AND NOT \[result read: Renal function/);
    expect(tnk.harm).toMatch(/symptomatic intracranial haemorrhage/);
    expect(tnk.preset).toBe("0.25–0.28 mg/kg IV");
    // the preset's parts in the worksheet's language (re-review)
    const zhAlteplase = safetyReviewWorksheet(cases, "zh-CN").items.find((i) => i.caseId === "acute-ischemic-stroke" && i.interventionId === "alteplase")!;
    expect(zhAlteplase.preset).toBe("0.9 mg/kg IV; 首剂推注 0.09 mg/kg, 随后 0.81 mg/kg/h");
  });

  it("words every leaf from the case", () => {
    const stroke = content.cases.get("acute-ischemic-stroke")!.def;
    expect(conditionWords(stroke, { all: [{ vital: "dbp", op: "gte", value: 110 }, { not: { intervened: "labetalol" } }] }, "en")).toBe("DBP ≥ 110 AND NOT [given: IV labetalol]");
    expect(conditionWords(stroke, { any: [{ read: "coag" }, { asked: "anticoagulants" }] }, "zh-CN")).toMatch(/^已看结果：|^已看结果: /);
  });
});
