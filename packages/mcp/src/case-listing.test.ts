/**
 * `list_cases` and `clinicalcraft://cases` (docs/GLOSSARY.md §4): the review status is stated honestly; the learning
 * outcomes only as a count — they usually name the diagnosis and the MCP client is the learner being assessed.
 */
import { describe, expect, it } from "vitest";
import { caseIndexEntry } from "@clinicalcraft/agent";
import { caseHandle, caseListing, casesText } from "./format.js";

const RAW = {
  id: "stemi-secret-diagnosis",
  title: { "zh-CN": "胸痛 · 58岁男性", en: "Chest pain · 58-year-old man" },
  summary: { "zh-CN": "急诊胸痛。", en: "Chest pain in the ED." },
  specialty: ["emergency-medicine"],
  difficulty: 3,
  setting: "emergency",
  locales: ["zh-CN", "en"],
  learningOutcomes: [{ "zh-CN": "识别右心室受累并避免硝酸酯", en: "Recognise right-ventricular involvement and withhold nitrates" }, { "zh-CN": "十分钟内完成心电图", en: "Record an ECG within ten minutes" }],
  provenance: { kind: "synthetic", review: { status: "editorial", reviewedAt: "2026-10-28", guidelines: ["ESC 2023 ACS"] } },
};

describe("MCP case listing", () => {
  const entry = caseIndexEntry(RAW, "0123456789abcdef")!;

  it("states the review and the outcome count, never the outcomes, the guidance or the id", () => {
    const en = casesText([entry], "en");
    expect(en).toContain(`- ${caseHandle(RAW.id)} — Chest pain · 58-year-old man`);
    expect(en).toContain("  Clinical review: Editorial review 2026-10-28 · not yet reviewed by a licensed clinician");
    expect(en).toContain("  2 learning outcome(s): get_debrief lists them once the case is complete.");
    const zh = casesText([entry], "zh-CN");
    expect(zh).toContain("  审核状态：编辑审核 2026-10-28 · 尚未经执业医师审核");
    expect(zh).toContain("  学习目标 2 条：病例完成后由 get_debrief 列出。");
    for (const text of [en, zh, JSON.stringify(caseListing(entry, "en"))]) {
      expect(text).not.toMatch(/right-ventricular|右心室|nitrates|ESC 2023|stemi-secret/);
    }
    expect(caseListing(entry, "zh-CN")).toMatchObject({
      id: caseHandle(RAW.id),
      review: { status: "editorial", reviewedAt: "2026-10-28", text: "编辑审核 2026-10-28 · 尚未经执业医师审核" },
      learningOutcomeCount: 2,
    });
  });

  it("says nothing about review or outcomes for a case that records neither", () => {
    const bare = caseIndexEntry({ ...RAW, learningOutcomes: undefined, provenance: { kind: "synthetic" } }, "0123456789abcdef")!;
    expect(casesText([bare], "en")).not.toMatch(/Clinical review|learning outcome/);
    expect(caseListing(bare, "en")).toMatchObject({ review: null, learningOutcomeCount: 0 });
  });
});
