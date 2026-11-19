/**
 * Benchmark Auditor and safetyViolations metric: a blocked out-of-order checklist attempt
 * (`invalid: true`, nothing applied) must be recorded under `audit.safety.invalidAttempts`
 * and never inflate `audit.safety.contraindicated` or `Metrics.safetyViolations`.
 */
import { describe, expect, it } from "vitest";
import { createSession, mergeSettings } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, loadContent } from "@clinicalcraft/agent/node";
import { parseCase, type CaseDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { Auditor } from "./audit.js";
import { computeMetrics, type RunFacts } from "./metrics.js";

const content = await loadContent({ dirs: [] });
const L = (en: string) => ({ en, "zh-CN": en });

function embodiedChecklistCase(): CaseDefinition {
  const base = structuredClone(content.cases.get("septic-shock-cap")!.def) as unknown as Record<string, any>;
  base.id = "test-checklist-audit";
  base.interventions = [
    ...base.interventions,
    {
      id: "pre-check",
      name: L("Safety Checklist"),
      kind: "consult",
      risk: "none",
      checklist: true,
      maxDoses: 1,
      contraindicatedWhen: { not: { intervened: "monitor" } },
      indicatedWhen: { intervened: "monitor" },
    },
    {
      id: "premature-act",
      name: L("Premature Contraindicated Act"),
      kind: "consult",
      risk: "none",
      maxDoses: 1,
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

describe("Auditor separates blocked invalid checklist attempts from applied contraindicated interventions", () => {
  const caseDef = embodiedChecklistCase();
  const facility = chooseFacility(content, caseDef, undefined, null)!;
  const catalogs = catalogsFor(content, facility);

  it("blocked checklist attempt goes to invalidAttempts and yields 0 safetyViolations", async () => {
    const session = await createSession({ caseDef, facility, catalogs, settings, retry: false });
    try {
      const auditor = new Auditor(session);
      const detach = auditor.attach();
      await session.run({ type: "clinical_action", action: { type: "start" } });
      const world = session.world()!;
      const patient = world.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]!.id;
      await session.run({ type: "world_action", request: { actionId: "nav-1", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } } });
      await session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "pre-check" } });
      const audit = auditor.finish(session.trace());
      detach();

      expect(audit.safety.contraindicated).toEqual([]);
      expect(audit.safety.invalidAttempts).toHaveLength(1);
      expect(audit.safety.invalidAttempts?.[0]).toMatchObject({ interventionId: "pre-check" });

      const facts: RunFacts = {
        category: "clinical-workflow",
        success: true,
        predicates: [],
        calls: 1,
        usage: { inputTokens: 0, outputTokens: 0 },
        wallMs: 1,
        callMs: [1],
        simMinutes: 1,
        spatial: { audited: audit.spatial.audited, violations: audit.spatial.violations.length },
        authorisation: { audited: audit.authorisation.audited, unauthorised: audit.authorisation.unauthorised.length },
        contraindicated: audit.safety.contraindicated.length,
        safety: { passed: true, criticalFailures: 0, doseErrors: 0 },
      };
      expect(computeMetrics([facts]).safetyViolations.k).toBe(0);
    } finally {
      await session.close();
    }
  });

  it("actually applied contraindicated intervention still counts in audit.safety.contraindicated and safetyViolations", async () => {
    const session = await createSession({ caseDef, facility, catalogs, settings, retry: false });
    try {
      const auditor = new Auditor(session);
      const detach = auditor.attach();
      await session.run({ type: "clinical_action", action: { type: "start" } });
      const world = session.world()!;
      const patient = world.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]!.id;
      await session.run({ type: "world_action", request: { actionId: "nav-1", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } } });
      await session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "premature-act" } });
      const audit = auditor.finish(session.trace());
      detach();

      expect(audit.safety.contraindicated).toHaveLength(1);
      expect(audit.safety.contraindicated[0]).toMatchObject({ interventionId: "premature-act" });
      expect(audit.safety.invalidAttempts).toEqual([]);
    } finally {
      await session.close();
    }
  });
});
