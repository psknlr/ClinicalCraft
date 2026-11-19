/**
 * EmbodiedSession.followClinicalEvent must not relocate the patient on an invalid
 * (blocked out-of-order) checklist attempt (`event.invalid === true`).
 */
import { describe, expect, it } from "vitest";
import { parseCase, type CaseDefinition } from "@clinicalcraft/core";
import { catalogsFor, chooseFacility, loadContent } from "../node/index.js";
import { mergeSettings } from "../settings/merge.js";
import { createSession } from "./session.js";

const content = await loadContent({ dirs: [] });
const L = (en: string) => ({ en, "zh-CN": en });

function transferChecklistCase(): CaseDefinition {
  const base = structuredClone(content.cases.get("septic-shock-cap")!.def) as unknown as Record<string, any>;
  base.id = "test-invalid-checklist-relocate";
  base.interventions = [
    ...base.interventions,
    {
      id: "icu-checklist-transfer",
      name: L("ICU Transfer Checklist"),
      kind: "disposition",
      risk: "none",
      checklist: true,
      maxDoses: 1,
      destination: { roomKind: "icu" },
      contraindicatedWhen: { not: { intervened: "monitor" } },
      indicatedWhen: { intervened: "monitor" },
    },
  ];
  const parsed = parseCase(base);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

const settings = mergeSettings([
  {
    source: "flag",
    settings: {
      provider: "offline",
      locale: "en",
      embodiment: "embodied",
      approvalMode: "bypass",
      practiceScope: "full",
      permissions: { allow: [], ask: [], deny: [] },
      transcripts: { enabled: false },
      autoCompact: { enabled: false, thresholdTokens: 120_000 },
    },
  },
]);

describe("EmbodiedSession ignores invalid checklist attempts for world relocations", () => {
  it("an invalid checklist attempt with a destination does not move the patient; a valid one does", async () => {
    const caseDef = transferChecklistCase();
    const facility = chooseFacility(content, caseDef, undefined, null)!;
    const session = await createSession({ caseDef, facility, catalogs: catalogsFor(content, facility), settings, retry: false });
    try {
      session.dispatch({ type: "start" });
      const before = session.world()!.patientPlace();
      // Premature checklist attempt -> invalid: true, nothing applied -> patient must stay put.
      const early = session.dispatch({ type: "intervene", interventionId: "icu-checklist-transfer" });
      expect(early.rejected).toBeUndefined();
      expect(session.state.interventions.at(-1)?.invalid).toBe(true);
      expect(session.world()!.patientPlace()?.slot).toBe(before?.slot);

      // Satisfy prerequisite, then valid checklist attempt -> patient relocates to ICU.
      session.dispatch({ type: "intervene", interventionId: "monitor" });
      const valid = session.dispatch({ type: "intervene", interventionId: "icu-checklist-transfer" });
      expect(valid.rejected).toBeUndefined();
      expect(session.state.interventions.at(-1)?.invalid).toBeUndefined();
      expect(session.world()!.patientPlace()?.slot).not.toBe(before?.slot);
    } finally {
      await session.close();
    }
  });
});
