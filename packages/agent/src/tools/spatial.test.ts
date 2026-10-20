/**
 * Spatial gating of the clinical tools (docs/EMBODIED.md R3, §6): intents
 * (queries resolved first), refusals, and the gate's two checks — before the
 * approval gate (precheck) and right before the engine commit (recheck).
 */
import { describe, expect, it } from "vitest";
import { createSession as createEngineState, type ClinicalAction, type ReduceResult } from "@clinicalcraft/core";
import type { ClinicalIntent, SpatialCheck } from "@clinicalcraft/world";
import { loadMiniCase } from "../__fixtures__/mini-case.js";
import { actionIntent, clinicalIntent, spatialCodeOf, spatiallyGated, spatialRefusal, SPATIALLY_GATED_TOOLS, type SpatialGate } from "./spatial.js";
import type { ToolContext, ToolDefinition, ToolOutput } from "./types.js";

const mini = loadMiniCase();
const state = createEngineState(mini);

function ctx(over: Partial<ToolContext> = {}): ToolContext {
  return {
    caseDef: mini,
    facility: null,
    catalogs: [],
    locale: "en",
    agent: "learner",
    state: () => state,
    dispatch: () => ({ state, events: [] }) as unknown as ReduceResult,
    ask: async () => ({ text: "", grounded: [] }),
    updatePlan: () => undefined,
    ...over,
  };
}

const unmet: Extract<SpatialCheck, { ok: false }> = {
  ok: false,
  code: "SPATIAL_REQUIREMENT_UNMET",
  reason: "not-at-patient",
  message: "You need to be at the patient's side (within 1.5 m); you are 12 m away.",
  requirement: { kind: "at-patient", range: 1.5 },
  hint: { goal: { kind: "interact", id: "patient:bay-1" }, label: "Go to the patient" },
  details: { distance: 12, range: 1.5 },
} as Extract<SpatialCheck, { ok: false }>;

describe("clinicalIntent / actionIntent", () => {
  it("maps every gated clinical tool to an intent, resolving queries to item ids first", () => {
    const c = ctx();
    expect(clinicalIntent("ask_patient", { question: "When did it start?" }, c)).toEqual({ tool: "ask_patient", kind: "ask" });
    expect(clinicalIntent("check_vitals", {}, c)).toEqual({ tool: "check_vitals", kind: "vitals" });
    expect(clinicalIntent("examine", { finding_id: "heart" }, c)).toMatchObject({ kind: "examine", findingId: "heart", itemId: "heart" });
    expect(clinicalIntent("order_test", { query: "trop" }, c)).toMatchObject({ kind: "order", investigationId: "troponin", itemId: "troponin" });
    expect(clinicalIntent("read_result", { investigation_id: "ecg" }, c)).toMatchObject({ kind: "read", investigationId: "ecg" });
    expect(clinicalIntent("intervene", { query: "thrombolysis" }, c)).toMatchObject({ kind: "intervene", interventionId: "lysis" });
    // An ambiguous query ("ct": head or chest) stays unresolved: no item id.
    expect(clinicalIntent("order_test", { query: "ct" }, c)).toEqual({ tool: "order_test", kind: "order" });
    // Chinese aliases resolve too.
    expect(clinicalIntent("order_test", { query: "肌钙蛋白" }, ctx({ locale: "zh-CN" }))).toMatchObject({ investigationId: "troponin" });
    expect(clinicalIntent("consult", { role: "attending" }, c)).toMatchObject({ kind: "consult", agent: "attending" });
  });

  it("leaves cognitive tools ungated", () => {
    for (const tool of ["answer_decision", "set_phase", "wait", "update_workup", "case_status", "list_options", "finish_case", "consult"]) {
      expect(SPATIALLY_GATED_TOOLS, tool).not.toContain(tool);
    }
    for (const tool of ["answer_decision", "set_phase", "wait", "case_status", "finish_case"]) expect(clinicalIntent(tool, {}, ctx()), tool).toBeNull();
  });

  it("maps learner clinical_action ops", () => {
    const cases: [ClinicalAction, ClinicalIntent | null][] = [
      [{ type: "ask", itemId: "onset" }, { tool: "ask_patient", kind: "ask", itemId: "onset" }],
      [{ type: "examine", findingId: "heart" }, { tool: "examine", kind: "examine", findingId: "heart", itemId: "heart" }],
      [{ type: "order", investigationId: "ecg" }, { tool: "order_test", kind: "order", investigationId: "ecg", itemId: "ecg" }],
      [{ type: "read", investigationId: "ecg" }, { tool: "read_result", kind: "read", investigationId: "ecg", itemId: "ecg" }],
      [{ type: "intervene", interventionId: "aspirin" }, { tool: "intervene", kind: "intervene", interventionId: "aspirin", itemId: "aspirin" }],
      [{ type: "start" }, null],
      [{ type: "note", text: "x" }, null],
    ];
    for (const [action, intent] of cases) expect(actionIntent(action), action.type).toEqual(intent);
  });
});

describe("spatialRefusal / spatialCodeOf", () => {
  it("carries the code, the localised reason and hint.goal (for navigate_to) in data", () => {
    const en = spatialRefusal(unmet, "en");
    expect(en.ok).toBe(false);
    expect(en.output).toContain(unmet.message);
    expect(en.output).toContain(JSON.stringify(unmet.hint!.goal));
    expect(en.output).toMatch(/navigate_to/);
    expect(en.data).toMatchObject({ code: "SPATIAL_REQUIREMENT_UNMET", reason: "not-at-patient", requirement: { kind: "at-patient" }, hint: { goal: { kind: "interact", id: "patient:bay-1" } }, details: { distance: 12 } });
    const zh = spatialRefusal(unmet, "zh-CN");
    expect(zh.output).not.toEqual(en.output);
    expect(zh.output).toMatch(/[一-鿿]/);
    expect(spatialCodeOf(en)).toBe("SPATIAL_REQUIREMENT_UNMET");

    const changed = spatialRefusal({ ...unmet, code: "SPATIAL_PRECONDITION_CHANGED", hint: null } as Extract<SpatialCheck, { ok: false }>, "en");
    expect(spatialCodeOf(changed)).toBe("SPATIAL_PRECONDITION_CHANGED");
    expect(changed.output).not.toEqual(en.output);
    expect(spatialCodeOf({ ok: false, output: "x", data: { code: "OTHER" } })).toBeNull();
    expect(spatialCodeOf(null)).toBeNull();
  });
});

describe("spatiallyGated", () => {
  function fixture(checks: SpatialCheck[]) {
    const calls: { intent: ClinicalIntent; recheck: boolean }[] = [];
    const traced: string[] = [];
    const gate: SpatialGate = {
      actorOf: (c) => c.actorId ?? "actor:clinician",
      check: (_actor, intent, recheck) => {
        calls.push({ intent, recheck });
        return checks.shift() ?? ({ ok: true } as SpatialCheck);
      },
      traced: async (_actor, tool, _args, run) => {
        traced.push(tool);
        return run();
      },
    };
    const dispatched: ClinicalAction[] = [];
    const tool: ToolDefinition<Record<string, unknown>> = {
      name: "examine",
      description: "Examine",
      inputSchema: { type: "object" },
      readOnly: false,
      sideEffect: "record",
      scope: "history-only",
      risk: () => "low",
      summarize: () => "examine",
      specifier: (a) => String(a.finding_id),
      precheck: (a) => (a.finding_id === "locked" ? { ok: false, output: "locked" } : null),
      run: async (_a, c) => {
        c.dispatch({ type: "examine", findingId: "heart" });
        c.dispatch({ type: "examine", findingId: "lungs" });
        return { ok: true, output: "examined" };
      },
    };
    const context = ctx({ dispatch: (a) => (dispatched.push(a), { state, events: [] }) as unknown as ReduceResult });
    return { gated: spatiallyGated(tool, gate), tool, calls, traced, dispatched, context };
  }

  it("keeps the tool's own members (schema, risk, specifier) so the approval gate and rules see the same call", () => {
    const { gated, tool } = fixture([]);
    expect(gated.name).toBe(tool.name);
    expect(gated.inputSchema).toBe(tool.inputSchema);
    expect(gated.specifier!({ finding_id: "heart" }, ctx())).toBe("heart");
    expect(gated.risk({}, ctx())).toBe("low");
  });

  it("precheck: the tool's own refusal first, then the spatial check (before the approval gate)", () => {
    const own = fixture([unmet]);
    expect(own.gated.precheck!({ finding_id: "locked" }, own.context)).toEqual({ ok: false, output: "locked" });
    expect(own.calls).toEqual([]);
    const refused = own.gated.precheck!({ finding_id: "heart" }, own.context) as ToolOutput;
    expect(spatialCodeOf(refused)).toBe("SPATIAL_REQUIREMENT_UNMET");
    expect(own.calls).toEqual([{ intent: { tool: "examine", kind: "examine", findingId: "heart", itemId: "heart" }, recheck: false }]);
    const ok = fixture([]);
    expect(ok.gated.precheck!({ finding_id: "heart" }, ok.context)).toBeNull();
  });

  it("run: re-checks once, right before the first engine commit; a failure commits nothing (SPATIAL_PRECONDITION_CHANGED)", async () => {
    const pass = fixture([]);
    expect((await pass.gated.run({ finding_id: "heart" }, pass.context)).ok).toBe(true);
    expect(pass.calls).toEqual([{ intent: expect.objectContaining({ kind: "examine" }), recheck: true }]);
    expect(pass.dispatched).toHaveLength(2);
    expect(pass.traced).toEqual(["examine"]);

    const moved = fixture([{ ...unmet, code: "SPATIAL_PRECONDITION_CHANGED" } as SpatialCheck]);
    const out = await moved.gated.run({ finding_id: "heart" }, moved.context);
    expect(out.ok).toBe(false);
    expect(spatialCodeOf(out)).toBe("SPATIAL_PRECONDITION_CHANGED");
    expect(moved.dispatched).toEqual([]);
  });

  it("does not trace a world operation's clinical effect twice (the world records it)", async () => {
    const f = fixture([]);
    await f.gated.run({ finding_id: "heart" }, { ...f.context, worldActionId: "wa-1" });
    expect(f.traced).toEqual([]);
  });

  it("measures from the acting body (ctx.actorId: a delegated staff member)", () => {
    const actors: string[] = [];
    const gate: SpatialGate = {
      actorOf: (c) => c.actorId ?? "actor:clinician",
      check: (actor) => (actors.push(actor), { ok: true } as SpatialCheck),
    };
    const { tool } = fixture([]);
    spatiallyGated(tool, gate).precheck!({ finding_id: "heart" }, ctx({ actorId: "staff:ed-nurse" }));
    expect(actors).toEqual(["staff:ed-nurse"]);
  });
});
