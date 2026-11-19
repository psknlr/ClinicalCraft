/**
 * CLI assessment renderer must report blocked out-of-order checklist attempts
 * (`safety.invalidAttempts`) separately from applied contraindicated interventions.
 */
import { describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import { assess, parseCase, replay, type CaseDefinition } from "@clinicalcraft/core";
import { createPalette } from "./ansi.js";
import { EventRenderer } from "./render.js";

const content = await loadContent({ dirs: [] });
const L = (en: string, zh = en) => ({ en, "zh-CN": zh });

function checklistCase(): CaseDefinition {
  const raw = structuredClone(content.cases.get("septic-shock-cap")!.def) as unknown as Record<string, any>;
  raw.id = "test-cli-invalid-attempt";
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

function render(caseDef: CaseDefinition, actions: Parameters<typeof replay>[1], locale: string): string {
  const report = assess(caseDef, replay(caseDef, actions).state);
  let out = "";
  const renderer = new EventRenderer({
    out: { write: (s: string) => ((out += s), true) },
    palette: createPalette(false),
    caseDef,
    locale: () => locale,
    interactive: false,
  });
  renderer.renderAssessment(report, null, []);
  return out;
}

describe("CLI EventRenderer separates blocked checklist attempts from contraindicated interventions", () => {
  const c = checklistCase();

  it("out-of-order checklist attempt only: prints invalid-attempt line, never contraindicated given", () => {
    const en = render(c, [{ type: "start" }, { type: "intervene", interventionId: "pre-check" }], "en");
    expect(en).toContain("Out-of-order checklist attempts (not applied): 1.");
    expect(en).not.toContain("Contraindicated interventions given");

    const zh = render(c, [{ type: "start" }, { type: "intervene", interventionId: "pre-check" }], "zh-CN");
    expect(zh).toContain("顺序不符的核查尝试（未执行）：1 项。");
    expect(zh).not.toContain("给予了禁忌处置");
  });

  it("mixed path prints both counts distinctly", () => {
    const en = render(
      c,
      [
        { type: "start" },
        { type: "intervene", interventionId: "pre-check" },
        { type: "intervene", interventionId: "fluid-restrict" },
      ],
      "en",
    );
    expect(en).toContain("Contraindicated interventions given: 1.");
    expect(en).toContain("Out-of-order checklist attempts (not applied): 1.");
  });
});
