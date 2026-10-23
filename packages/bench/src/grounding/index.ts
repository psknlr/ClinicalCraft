/**
 * The ClinicalCraft grounding benchmark (docs/GROUNDING.md): held-out
 * free-text items that measure the deterministic layer every agent stands on
 * — the patient's fact selection, the clinical tools' argument resolution,
 * the patient router and the voice grounding check — offline and
 * reproducibly, with a frozen `test` split and Wilson 95 % intervals.
 */
export * from "./schema.js";
export * from "./load.js";
export * from "./evaluate.js";
export * from "./report.js";
