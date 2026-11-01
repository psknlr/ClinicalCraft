/**
 * @clinicalcraft/bench — the ClinicalCraft embodied agent benchmark
 * (docs/EMBODIED.md §13, R11; Node): the scenario schema
 * (`clinicalcraft/bench-scenario@1`) and suites, the agents (`reference`,
 * `scripted-llm`, `llm`), the runner with authoritative-state evaluation and
 * independent spatial / authorisation audits, metrics with Wilson 95 %
 * intervals, JSON + Markdown reports, and the reference demonstration.
 */
export * from "./schema.js";
export * from "./suites.js";
export * from "./i18n.js";
export * from "./stats.js";
export * from "./recorder.js";
export * from "./audit.js";
export * from "./predicates.js";
export * from "./session.js";
export * from "./pricing.js";
export * from "./metrics.js";
export * from "./environment.js";
export * from "./runner.js";
export * from "./report.js";
export * from "./demo.js";
// the grounding benchmark (docs/GROUNDING.md): the deterministic layer every agent stands on
export * from "./grounding/index.js";
// the operative benchmark (docs/BENCHMARK_OPERATIVE.md): agents at the operating table, anatomy hidden
export * from "./operative/index.js";
export * from "./agents/types.js";
export * from "./agents/model.js";
export * from "./agents/reference.js";
export * from "./agents/scripted.js";
export * from "./agents/llm.js";
