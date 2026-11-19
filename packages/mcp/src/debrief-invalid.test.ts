/**
 * MCP assessment formatter must report blocked out-of-order checklist attempts
 * (`safety.invalidAttempts`) separately from applied contraindicated interventions.
 */
import { describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import { assess, parseCase, replay, type CaseDefinition } from "@clinicalcraft/core";
import { assessmentText } from "./format.js";

const content = await loadContent({ dirs: [] });
const L = (en: string, zh = en) => ({ en, "zh-CN": zh });

function checklistCase(): CaseDefinition {
  const raw = structuredClone(content.cases.get("septic-shock-cap")!.def) as unknown as Record<string, any>;
  raw.id = "test-mcp-invalid-attempt";
  raw.interventions = [
    ...raw.interventions,
    {
      id: "pre-check",
      name: L("Safety Checklist", "安全核查"),
      kind: "consult",
      risk: "none",
      checklist: true,
      maxDoses: 1,
      contraindicatedWhen: { not: { intervened: "monitor" } },
      indicatedWhen: { intervened: "monitor" },
    },
  ];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

describe("MCP assessmentText separates blocked checklist attempts from contraindicated interventions", () => {
  const c = checklistCase();

  it("out-of-order checklist attempt only: reports out-of-order attempt, never contraindicated given", () => {
    const report = assess(c, replay(c, [{ type: "start" }, { type: "intervene", interventionId: "pre-check" }]).state);
    const en = assessmentText(c, report, null, [], "en");
    expect(en).toContain("Out-of-order checklist attempts (not applied): 1");
    expect(en).not.toContain("Contraindicated interventions given");

    const zh = assessmentText(c, report, null, [], "zh-CN");
    expect(zh).toContain("顺序不符的核查尝试（未执行）：1 次");
    expect(zh).not.toContain("给予了禁忌的处置");
  });

  it("mixed path prints both counts distinctly", () => {
    const report = assess(
      c,
      replay(c, [
        { type: "start" },
        { type: "intervene", interventionId: "pre-check" },
        { type: "intervene", interventionId: "fluid-restrict" },
      ]).state,
    );
    const en = assessmentText(c, report, null, [], "en");
    expect(en).toContain("Contraindicated interventions given: 1");
    expect(en).toContain("Out-of-order checklist attempts (not applied): 1");
  });
});
