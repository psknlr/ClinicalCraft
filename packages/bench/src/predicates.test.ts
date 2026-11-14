/**
 * Success predicates — every kind, true and false, evaluated on the final
 * authoritative state of a real run (STEMI, general hospital: the reference
 * solver washes its hands, walks to the bedside past a locked door, is
 * refused a CT report at the bedside (an imaging report is read at the
 * radiology console — the study itself may be ordered at the bedside and is
 * done with the patient on the scanner, EMBODIED §8.7) and the ECG cart the nurse holds, attaches
 * the monitor and answers), plus edge cases on a hand-built view (audit
 * violations, a held item, hand hygiene expiry, refusal targets, a study's
 * stages and the patient's journeys).
 */
import { describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import { createSession as createEngineState, type OrderRecord } from "@clinicalcraft/core";
import type { PatientLeg, WorldRuntime, WorldStateSnapshot } from "@clinicalcraft/world";
import { createReferenceAgent } from "./agents/reference.js";
import type { AuditResult } from "./audit.js";
import { evaluatePredicate, footprintDistance, predicateClass, type FinalView } from "./predicates.js";
import { runScenario } from "./runner.js";
import { parseScenario, type BenchPredicate, type BenchScenario } from "./schema.js";
import { AnswerStore } from "./session.js";

const content = await loadContent({ dirs: [] });

/** [predicate, expected] — the run below makes each hold or fail on purpose. */
const EXPECTED: [BenchPredicate, boolean][] = [
  [{ clinical: { intervened: "cardiac-monitoring" } }, true],
  [{ clinical: { ordered: "ecg-12lead" } }, false],
  [{ clinical: { not: { ordered: "ct-aortogram" } } }, true],
  [{ world: { kind: "actorInRoom", room: "ed-resus" } }, true],
  [{ world: { kind: "actorInRoom", room: "room:rad-ct" } }, false],
  [{ world: { kind: "actorOnLevel", level: "L0" } }, true],
  [{ world: { kind: "actorOnLevel", level: "L1" } }, false],
  [{ world: { kind: "actorNear", target: "patient:resus-1", range: 1.5 } }, true],
  [{ world: { kind: "actorNear", target: "eq:radiology-console", range: 2 } }, false],
  [{ world: { kind: "actorNear", actor: "staff:ed-nurse", target: "eq:resus1-ecg", range: 1.5 } }, true],
  [{ world: { kind: "entityState", target: "eq:resus1-monitor", state: "attached" } }, true],
  [{ world: { kind: "entityState", target: "eq:resus1-monitor", state: ["off", "idle"] } }, false],
  [{ world: { kind: "entityState", target: "eq:resus1-ecg", state: "prepared" } }, true],
  [{ world: { kind: "deviceAtBedside", target: "eq:resus1-ecg" } }, true],
  [{ world: { kind: "deviceAtBedside", target: "eq:lab-workstation" } }, false],
  [{ world: { kind: "deviceAtBedside", capability: "ecg-12lead" } }, true],
  [{ world: { kind: "deviceAtBedside", capability: "ct" } }, false],
  [{ world: { kind: "handsClean" } }, true],
  [{ world: { kind: "handsClean", actor: "staff:ed-nurse" } }, false],
  [{ world: { kind: "holding", item: "eq:resus1-ecg" } }, false],
  [{ world: { kind: "doorState", door: "door:ed-resus:s:0", locked: true } }, true],
  [{ world: { kind: "doorState", door: "door:ed-resus:s:0", open: true } }, false],
  [{ answerEquals: "eq:resus1-ecg" }, true],
  [{ answerEquals: ["eq:resus2-ecg", "resus1-ecg"] }, true],
  [{ answerEquals: "eq:resus2-ecg" }, false],
  [{ refusedWith: "SPATIAL_REQUIREMENT_UNMET" }, true],
  [{ refusedWith: { code: "SPATIAL_REQUIREMENT_UNMET", tool: "read_result" } }, true],
  [{ refusedWith: { code: "SPATIAL_REQUIREMENT_UNMET", tool: "examine" } }, false],
  [{ refusedWith: { code: "DEVICE_BUSY", tool: "interact_object", target: "eq:resus1-ecg" } }, true],
  [{ refusedWith: { code: "DEVICE_BUSY", target: "eq:resus2-ecg" } }, false],
  [{ refusedWith: "HANDS_FULL" }, false],
  [{ noSpatialViolationsAccepted: true }, true],
  [{ noUnauthorisedAcceptance: true }, true],
  [{ toolCalledAtMostTimes: { tool: "submit_answer", max: 1 } }, true],
  [{ toolCalledAtMostTimes: { tool: "navigate_to", max: 0 } }, false],
  [{ caseFinished: true }, false],
  [{ studyStages: { investigation: "ct-aortogram" } }, false],
  [{ world: { kind: "patientTransit" } }, false],
];

function scenario(predicates: BenchPredicate[]): BenchScenario {
  const parsed = parseScenario({
    schema: "clinicalcraft/bench-scenario@1",
    id: "predicate-kinds",
    suite: "tests",
    category: "interaction",
    title: { "zh-CN": "谓词", en: "Predicates" },
    instruction: { "zh-CN": "测试", en: "Test" },
    caseId: "stemi-inferior-rv",
    locale: "en",
    answer: { kind: "entity" },
    setup: {
      actions: [
        { actor: "staff:ed-nurse", operation: "navigate", goal: { kind: "interact", id: "eq:resus1-ecg" } },
        { actor: "staff:ed-nurse", operation: "prepare", target: "eq:resus1-ecg" },
      ],
      doors: [{ id: "door:ed-resus:s:0", locked: true }],
      approvals: "approve",
    },
    predicates,
    reference: {
      steps: [
        { op: "find", query: { interaction: "sink", limit: 1 }, save: "sink" },
        { op: "interact", target: "@sink", operation: "wash_hands" },
        { op: "navigate", goal: { kind: "interact", id: "patient:resus-1" } },
        { op: "attempt", action: { type: "read", investigationId: "ct-aortogram" }, expect: "SPATIAL_REQUIREMENT_UNMET" },
        { op: "interact", target: "eq:resus1-ecg", operation: "connect", expect: "DEVICE_BUSY" },
        { op: "clinical", action: { type: "intervene", interventionId: "cardiac-monitoring" } },
        { op: "answer", entity: "eq:resus1-ecg" },
      ],
    },
    scripted: { plan: [] },
  });
  if (!parsed.ok) throw new Error(parsed.issues.join("\n"));
  return parsed.scenario;
}

describe("predicates on the final authoritative state of a real run", () => {
  it("every predicate kind holds or fails as the run left the world and the engine", { timeout: 60_000 }, async () => {
    // A scenario takes at most 32 predicates: the same deterministic run, evaluated in two halves (alternate predicates).
    const classes = new Set<string>();
    const digests = new Set<string>();
    for (const part of [EXPECTED.filter((_, i) => i % 2 === 0), EXPECTED.filter((_, i) => i % 2 === 1)]) {
      const run = await runScenario(scenario(part.map(([p]) => p)), createReferenceAgent(), 1, { content });
      expect(run.status, run.error).toBe("completed");
      expect(run.predicates).toHaveLength(part.length);
      run.predicates.forEach((p, i) => expect(p.ok, `${JSON.stringify(part[i]![0])}: ${p.detail}`).toBe(part[i]![1]));
      // Some predicate fails on purpose: the run is not a success.
      expect(run.success).toBe(false);
      for (const p of run.predicates) classes.add(p.class);
      digests.add(run.stateDigest);
    }
    expect(digests.size).toBe(1);
    // The classes the metrics use.
    expect(classes).toEqual(new Set(["clinical", "navigation", "interaction", "localisation", "safety", "other"]));
  });
});

/* ------------------------------------------------------------------ */
/* Hand-built views                                                    */
/* ------------------------------------------------------------------ */

const stemi = content.cases.get("stemi-inferior-rv")!.def;

function view(o: { audit?: Partial<AuditResult>; holding?: string[]; handsCleanUntil?: number | null; clock?: number; refusals?: FinalView["refusals"]; calls?: FinalView["calls"]; answers?: string[] } = {}): FinalView {
  const answers = new AnswerStore();
  for (const a of o.answers ?? []) answers.submit({ raw: a, resolved: a.startsWith("eq:") ? a : null });
  const actor = { id: "actor:clinician", pose: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, level: "L0" }, room: "ed-resus", holding: o.holding ?? [], handsCleanUntil: o.handsCleanUntil ?? null };
  const world = {
    actor: (id: string) => (id === "actor:clinician" ? actor : null),
    entity: () => null,
    inspect: () => null,
    resolveId: (raw: string) => (raw.startsWith("eq:") ? raw : null),
    entities: () => [],
  } as unknown as WorldRuntime;
  return {
    caseDef: stemi,
    facility: null,
    state: { ...createEngineState(stemi), clock: o.clock ?? 0 },
    world,
    snapshot: { entities: {} } as unknown as WorldStateSnapshot,
    answers,
    refusals: o.refusals ?? [],
    calls: o.calls ?? [],
    audit: { spatial: { audited: 0, violations: [] }, authorisation: { audited: 0, unauthorised: [] }, safety: { contraindicated: [] }, ...o.audit },
    targetOf: (actionId: string) => (actionId === "wa-1" ? "eq:a" : null),
  };
}

describe("predicates on hand-built views", () => {
  it("noSpatialViolationsAccepted / noUnauthorisedAcceptance fail on any audited violation", () => {
    const spatial = { audited: 2, violations: [{ ev: "ev-3", type: "order.placed", intent: { tool: "order_test", kind: "order" }, requirement: "bedside-provider", checks: {}, actor: null, violation: true }] } as unknown as AuditResult["spatial"];
    const authorisation = { audited: 1, unauthorised: [{ ev: "ev-4", type: "intervention.applied", tool: "intervene", specifier: "alteplase", decision: "deny", ruleId: "rule.deny", authorised: false }] } as unknown as AuditResult["authorisation"];
    expect(evaluatePredicate(view({ audit: { spatial } }), { noSpatialViolationsAccepted: true }).ok).toBe(false);
    expect(evaluatePredicate(view({ audit: { authorisation } }), { noUnauthorisedAcceptance: true }).ok).toBe(false);
    expect(evaluatePredicate(view(), { noSpatialViolationsAccepted: true }).ok).toBe(true);
    expect(evaluatePredicate(view(), { noUnauthorisedAcceptance: true }).ok).toBe(true);
  });

  it("holding and hand hygiene (clean until a simulated minute)", () => {
    expect(evaluatePredicate(view({ holding: ["eq:mask"] }), { world: { kind: "holding", item: "eq:mask" } }).ok).toBe(true);
    expect(evaluatePredicate(view({ holding: [] }), { world: { kind: "holding", item: "eq:mask" } }).ok).toBe(false);
    expect(evaluatePredicate(view({ handsCleanUntil: 12, clock: 12 }), { world: { kind: "handsClean" } }).ok).toBe(true);
    expect(evaluatePredicate(view({ handsCleanUntil: 12, clock: 12.5 }), { world: { kind: "handsClean" } }).ok).toBe(false);
    expect(evaluatePredicate(view({ handsCleanUntil: null }), { world: { kind: "handsClean" } }).ok).toBe(false);
  });

  it("refusedWith matches code, tool and target (the action's target from the trace)", () => {
    const refusals = [{ code: "NOT_IN_RANGE", tool: "interact_object", actionId: "wa-1", source: "world" as const, message: "too far" }];
    const v = view({ refusals });
    expect(evaluatePredicate(v, { refusedWith: "NOT_IN_RANGE" }).ok).toBe(true);
    expect(evaluatePredicate(v, { refusedWith: { code: "NOT_IN_RANGE", tool: "interact_object", target: "eq:a" } }).ok).toBe(true);
    expect(evaluatePredicate(v, { refusedWith: { code: "NOT_IN_RANGE", target: "eq:b" } }).ok).toBe(false);
    expect(evaluatePredicate(v, { refusedWith: { code: "NOT_IN_RANGE", tool: "navigate_to" } }).ok).toBe(false);
    expect(evaluatePredicate(view(), { refusedWith: "NOT_IN_RANGE" }).ok).toBe(false);
  });

  it("toolCalledAtMostTimes counts the agent's calls (boundary inclusive); answerEquals reads the last answer", () => {
    const call = { tool: "submit_answer", args: {}, ok: true, output: "", ms: 0 };
    expect(evaluatePredicate(view({ calls: [call, call] }), { toolCalledAtMostTimes: { tool: "submit_answer", max: 2 } }).ok).toBe(true);
    expect(evaluatePredicate(view({ calls: [call, call] }), { toolCalledAtMostTimes: { tool: "submit_answer", max: 1 } }).ok).toBe(false);
    expect(evaluatePredicate(view({ answers: ["eq:a", "eq:b"] }), { answerEquals: "eq:b" }).ok).toBe(true);
    expect(evaluatePredicate(view({ answers: ["eq:a", "eq:b"] }), { answerEquals: "eq:a" }).ok).toBe(false);
    expect(evaluatePredicate(view({ answers: ["nonsense"] }), { answerEquals: "nonsense" }).ok).toBe(false);
    expect(evaluatePredicate(view(), { answerEquals: "eq:a" })).toMatchObject({ ok: false, detail: "no answer submitted" });
  });

  it("the clinical Condition DSL and caseFinished read the engine state", () => {
    expect(evaluatePredicate(view(), { clinical: { not: { ordered: "ecg-12lead" } } }).ok).toBe(true);
    expect(evaluatePredicate(view(), { caseFinished: true }).ok).toBe(false);
  });

  it("metric classes", () => {
    expect(predicateClass({ clinical: { ordered: "x" } })).toBe("clinical");
    expect(predicateClass({ caseFinished: true })).toBe("clinical");
    expect(predicateClass({ answerEquals: "eq:x" })).toBe("localisation");
    expect(predicateClass({ world: { kind: "actorNear", target: "x", range: 1 } })).toBe("navigation");
    expect(predicateClass({ world: { kind: "doorState", door: "d" } })).toBe("interaction");
    expect(predicateClass({ refusedWith: "DEVICE_BUSY" })).toBe("safety");
    expect(predicateClass({ toolCalledAtMostTimes: { tool: "submit_answer", max: 1 } })).toBe("other");
    expect(predicateClass({ studyStages: { investigation: "ctpa" } })).toBe("clinical");
    expect(predicateClass({ world: { kind: "patientTransit", monitored: true } })).toBe("safety");
  });

  it("studyStages: each stage of a study done at a device, in order; patientTransit: every journey monitored and held by a role (EMBODIED §8.7)", () => {
    const pe = content.cases.get("pulmonary-embolism-postop")!.def;
    const turnaround = pe.investigations.find((i) => i.id === "ctpa")!.turnaroundMinutes;
    const ward = { slot: "ward-1", provider: null, room: "ward" };
    const ct = { slot: null, provider: "eq:ct-scanner", room: "rad-ct" };
    const leg = (from: PatientLeg["from"], to: PatientLeg["to"], departedAt: number, arrivedAt: number, patch: Partial<PatientLeg> = {}): PatientLeg => ({ by: "actor:clinician", role: "clinician", from, to, departedAt, arrivedAt, monitor: "eq:ward-defibrillator", status: "arrived", ...patch });
    const legs = [leg(ward, ct, 2, 2.4), leg(ct, ward, 2.4, 2.8)];
    const order: OrderRecord = {
      key: "ctpa@ward", investigationId: "ctpa", phase: "ward", orderedAt: 1, seq: 3, by: "learner", modality: ["ct"],
      acquired: { at: 2.4, seq: 5, collector: "radiographer", where: "eq:ct-scanner" }, readyAt: 2.4 + turnaround,
      reviewed: { at: 33, seq: 7, by: "learner" }, next: { type: "intervene", id: "consult-pert", at: 34, seq: 8 },
    };
    const peView = (orders: OrderRecord[], clock: number, journeys: PatientLeg[]): FinalView => {
      const base = view({ clock });
      const world = { ...(base.world as object), entities: () => [{ id: "patient:ward-1", kind: "patient" }] } as unknown as WorldRuntime;
      const snapshot = { entities: { "patient:ward-1": { patient: { legs: journeys } } } } as unknown as WorldStateSnapshot;
      return { ...base, caseDef: pe, state: { ...createEngineState(pe), clock, orders }, world, snapshot };
    };
    const stages = (o: OrderRecord, clock = 40, journeys = legs) => evaluatePredicate(peView([o], clock, journeys), { studyStages: { investigation: "ctpa" } });
    expect(stages(order)).toMatchObject({ ok: true, class: "clinical" });
    expect(stages(order).detail).toMatch(/ordered 1 by learner → departed 2 → arrived 2.4 → acquired 2.4 by radiographer at eq:ct-scanner → released 32.4 → reviewed 33 by learner → then intervene consult-pert 34/);
    // a stage missing, or out of order, fails and says which
    expect(stages({ ...order, acquired: undefined, readyAt: undefined, reviewed: undefined, next: undefined }).detail).toMatch(/not acquired/);
    expect(stages({ ...order, acquired: { at: 1, seq: 3, implied: true }, readyAt: 1 + turnaround }).detail).toMatch(/acquired at the order/);
    expect(stages(order, 40, []).detail).toMatch(/no journey to eq:ct-scanner/);
    expect(stages({ ...order, orderedAt: 2.2 }).detail).toMatch(/left for the device before the order/);
    expect(stages({ ...order, readyAt: 2.4 }).detail).toMatch(/not at the acquisition \+ turnaround/);
    expect(stages(order, 30).detail).toMatch(/not released yet/);
    expect(stages({ ...order, reviewed: undefined, next: undefined }).detail).toMatch(/not reviewed/);
    expect(stages({ ...order, next: undefined }).detail).toMatch(/no resulting action/);
    expect(evaluatePredicate(peView([], 40, legs), { studyStages: { investigation: "ctpa" } }).detail).toMatch(/not ordered/);
    // the journeys: each one monitored, each one held by a clinician or a nurse
    const transit = (journeys: PatientLeg[], w: { monitored?: boolean; roles?: string[] }) => evaluatePredicate(peView([order], 40, journeys), { world: { kind: "patientTransit", ...w } });
    expect(transit(legs, { monitored: true, roles: ["clinician", "nurse"] })).toMatchObject({ ok: true, class: "safety" });
    expect(transit(legs, {}).detail).toMatch(/ward-1 → eq:ct-scanner 2–2.4 by actor:clinician \(clinician\), with eq:ward-defibrillator/);
    expect(transit([legs[0]!, leg(ct, ward, 2.4, 2.8, { monitor: null })], { monitored: true }).ok).toBe(false);
    expect(transit([legs[0]!, leg(ct, ward, 2.4, 2.8, { by: "staff:porter", role: "porter" })], { roles: ["clinician", "nurse"] }).ok).toBe(false);
    expect(transit([leg(ward, ct, 2, 2.4, { by: null, role: null })], { roles: ["clinician"] }).ok).toBe(false);
    // a relocation (the team's transfer by a phase or an intervention) is no journey: not judged (EMBODIED §8.4, P2-11)
    const icu = { slot: "icu-1", provider: null, room: "icu" };
    expect(transit([...legs, leg(ward, icu, 40, 40, { by: null, role: null, monitor: null, kind: "relocation", mode: null, cause: { intervention: "transfer-hdu" } })], { monitored: true, roles: ["clinician", "nurse"] }).ok).toBe(true);
    expect(transit([], {})).toMatchObject({ ok: false, detail: "the patient never travelled" });
  });

  it("footprintDistance: 0 inside the footprint, edge distance outside", () => {
    expect(footprintDistance({ x: 0.2, z: 0.1 }, { x: 0, z: 0 }, { w: 1, d: 1 })).toBe(0);
    expect(footprintDistance({ x: 2, z: 0 }, { x: 0, z: 0 }, { w: 1, d: 1 })).toBeCloseTo(1.5, 10);
    expect(footprintDistance({ x: 3, z: 4 }, { x: 0, z: 0 }, undefined)).toBeCloseTo(5, 10);
  });
});

describe("deviceAtBedside is the world's bedside rule (C14)", () => {
  it("a cart wheeled across the patient's room, > 6 m from the slot, is at the bedside — as the world and the policy say", { timeout: 60_000 }, async () => {
    const parsed = parseScenario({
      schema: "clinicalcraft/bench-scenario@1",
      id: "bedside-rule",
      suite: "tests",
      category: "interaction",
      title: { "zh-CN": "床旁", en: "Bedside" },
      instruction: { "zh-CN": "测试", en: "Test" },
      caseId: "stemi-inferior-rv",
      locale: "en",
      setup: { approvals: "approve" },
      predicates: [{ world: { kind: "deviceAtBedside", target: "eq:resus2-ecg" } }, { world: { kind: "deviceAtBedside", target: "eq:lab-workstation" } }],
      reference: {
        steps: [
          { op: "navigate", goal: { kind: "interact", id: "eq:resus2-ecg" } },
          { op: "interact", target: "eq:resus2-ecg", operation: "move_to", goal: { kind: "point", x: 40.5, z: -14.6 } },
        ],
      },
      scripted: { plan: [] },
    });
    if (!parsed.ok) throw new Error(parsed.issues.join("\n"));
    const run = await runScenario(parsed.scenario, createReferenceAgent(), 1, { content });
    expect(run.status, run.error).toBe("completed");
    expect(run.predicates.map((p) => p.ok)).toEqual([true, false]);
  });
});
