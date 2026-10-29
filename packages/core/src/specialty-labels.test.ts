/**
 * Specialty display labels: one bilingual table for every front-end (the web library, the CLI, MCP) —
 * learners read "急诊医学" / "Emergency medicine", never the id `emergency-medicine`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPECIALTY_LABELS, specialtyLabel, specialtyLabels } from "./index.js";

/** Specialty ids the content in progress uses (the CMCR collection), beyond the built-in library. */
const REQUIRED = [
  "colorectal-surgery",
  "hepatobiliary-surgery",
  "urology",
  "pathology",
  "dermatology",
  "obstetrics",
  "anesthesiology",
  "sleep-medicine",
  "genetics",
  "vascular-medicine",
  "hepatology",
  "clinical-pharmacology",
  "immunology",
  "neonatology",
  "pediatric-cardiology",
  "rheumatology",
  "hematology",
  "nephrology",
  "oncology",
  "endocrinology",
  "infectious-disease",
  "respiratory-medicine",
  "critical-care",
  "emergency-medicine",
  "pediatrics",
  "neurology",
  "cardiology",
  "general-surgery",
  "cardiac-surgery",
  "integrative-medicine",
  "traditional-chinese-medicine",
];

function libraryIds(): string[] {
  const dir = new URL("../../content/cases/", import.meta.url);
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => (JSON.parse(readFileSync(new URL(`${e.name}/case.json`, dir), "utf8")) as { specialty: string[] }).specialty);
}

describe("specialty labels", () => {
  it("label every specialty of the library and of the content in progress, in zh-CN and en", () => {
    const ids = [...new Set([...libraryIds(), ...REQUIRED])].sort();
    expect(ids.length).toBeGreaterThan(REQUIRED.length);
    for (const id of ids) {
      const label = SPECIALTY_LABELS[id];
      expect(label, id).toBeDefined();
      expect(label!.en.trim(), id).not.toBe("");
      expect(label!["zh-CN"].trim(), id).not.toBe("");
      expect(label!.en, id).not.toBe(id);
      expect(/[一-鿿]/.test(label!["zh-CN"]), `${id}: ${label!["zh-CN"]}`).toBe(true);
      // sentence case, British spelling (paediatrics, haematology, anaesthesia)
      expect(label!.en[0], id).toBe(label!.en[0]!.toUpperCase());
      expect(/pediatric|hematolog|anesthes/i.test(label!.en), `${id}: ${label!.en}`).toBe(false);
    }
  });

  it("resolve per locale; an unknown id reads as words, never as a hyphenated id", () => {
    expect(specialtyLabel("emergency-medicine", "en")).toBe("Emergency medicine");
    expect(specialtyLabel("emergency-medicine", "zh-CN")).toBe("急诊医学");
    expect(specialtyLabel("pediatric-cardiology", "en")).toBe("Paediatric cardiology");
    expect(specialtyLabel("space-medicine", "en")).toBe("space medicine");
    expect(specialtyLabels(["hematology", "oncology"], "zh")).toEqual(["血液科", "肿瘤科"]);
  });
});
