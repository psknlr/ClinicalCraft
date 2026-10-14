import { createSession as createEngineState, reduce, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase } from "../__fixtures__/harness.js";
import type { PlanItem } from "../protocol.js";
import { ToolRegistry, isHiddenByDeny } from "./index.js";
import type { ToolContext } from "./types.js";
import { validateArgs } from "./validate.js";

/** A tool context over the real engine (no session). */
function harness(locale = "en", agent: string = "clinician", utterance: string | null = null) {
  const caseDef = loadMiniCase();
  let state: SessionState = reduce(caseDef, createEngineState(caseDef), { type: "start" }).state;
  const plans: PlanItem[][] = [];
  const asked: string[] = [];
  const ctx: ToolContext = {
    caseDef,
    facility: null,
    catalogs: [],
    locale,
    agent,
    state: () => state,
    dispatch: (action: ClinicalAction) => {
      const r = reduce(caseDef, state, action);
      if (!r.rejected) state = r.state;
      return r;
    },
    ask: async (target, text) => {
      asked.push(`${target}:${text}`);
      return { text: `(${target}) reply`, grounded: [] };
    },
    updatePlan: (plan) => void plans.push(plan),
  };
  const registry = new ToolRegistry({ npc: { utterance: () => utterance } });
  const run = (name: string, args: Record<string, unknown> = {}) => registry.get(name)!.run(args, ctx);
  return { caseDef, ctx, registry, run, plans, asked, get state() {
    return state;
  } };
}

describe("clinical tools", () => {
  it("list_options returns names/ids only — never findings, results or correct answers", async () => {
    const h = harness();
    const all = ["history", "exam", "investigations", "interventions", "decisions", "phases"];
    const outputs = await Promise.all(all.map((kind) => h.run("list_options", { kind })));
    const text = outputs.map((o) => o.output + JSON.stringify(o.data)).join("\n");
    expect(text).toContain("[ecg] ECG");
    expect(text).toContain("When did the chest pain start?");
    for (const secret of ["ST elevation", "85 ng/L", "Normal heart sounds", "two hours ago", "Correct: ST elevation", "correct"]) expect(text).not.toContain(secret);
  });

  it("order_test: ambiguous queries list candidates and order nothing; ids order with readiness", async () => {
    const h = harness();
    const ambiguous = await h.run("order_test", { query: "ct" });
    expect(ambiguous.ok).toBe(false);
    expect(ambiguous.data).toMatchObject({ candidates: [{ id: "ct-head" }, { id: "ct-chest" }] });
    expect(h.state.orders).toEqual([]);
    const ok = await h.run("order_test", { query: "troponin" });
    expect(ok.output).toBe("Ordered Troponin (Emergency). Result expected at minute 45 (now 0).");
    expect((await h.run("order_test", { investigation_id: "troponin" })).output).toMatch(/already ordered/);
    const early = await h.run("read_result", { investigation_id: "troponin" });
    expect(early.ok).toBe(false);
    expect(early.output).toMatch(/not ready yet\. Result expected at minute 45/);
    expect((await h.run("order_test", {})).output).toMatch(/Provide either investigation_id or query/);
  });

  it("read_result returns the recorded text and values once ready; wait advances the clock", async () => {
    const h = harness();
    await h.run("order_test", { investigation_id: "troponin" });
    const waited = await h.run("wait", { minutes: 45 });
    expect(waited.output).toMatch(/Waited 45 min \(clock 0 → 45 min\)/);
    expect(waited.output).toContain("Troponin (Emergency) is back");
    const read = await h.run("read_result", { investigation_id: "troponin" });
    expect(read.output).toContain("hs-troponin T 85 ng/L (raised).");
    expect(read.output).toMatch(/- hs-troponin T: 85 ng\/L \[H\]/);
  });

  it("examine resolves free text; unrecorded manoeuvres say so without acting", async () => {
    const h = harness();
    expect((await h.run("examine", { query: "listen to the heart" })).output).toBe("Auscultate the heart: Normal heart sounds, no murmur.");
    const missing = await h.run("examine", { query: "fundoscopy" });
    expect(missing).toMatchObject({ ok: true, output: "Not recorded in this case." });
    expect(h.state.examined).toEqual(["heart"]);
  });

  it("intervene: risk from the case, alwaysAsk for high risk, localised summaries", async () => {
    const h = harness("zh-CN");
    const tool = h.registry.get("intervene")!;
    expect(tool.risk({ query: "溶栓" }, h.ctx)).toBe("high");
    expect(tool.alwaysAsk!({ query: "溶栓" }, h.ctx)).toBe(true);
    expect(tool.risk({ intervention_id: "aspirin" }, h.ctx)).toBe("low");
    expect(tool.summarize({ intervention_id: "lysis" }, h.ctx)).toBe("给予替奈普酶溶栓？");
    expect(tool.specifier!({ query: "aspirin" }, h.ctx)).toBe("aspirin");
    const given = await h.run("intervene", { intervention_id: "aspirin" });
    expect(given.output).toBe("已给予：阿司匹林 300 mg 嚼服。\n反应：患者嚼服了阿司匹林。");
  });

  it("answer_decision validates options and reports requirements", async () => {
    const h = harness();
    expect((await h.run("answer_decision", { decision_id: "dx", option_ids: ["zzz"] })).output).toMatch(/Unknown option id/);
    expect((await h.run("answer_decision", { decision_id: "dx", option_ids: ["stemi"] })).output).toBe("Not yet answerable: Review the ECG first.");
  });

  it("wait refuses on static clocks; update_workup publishes a plan; consult asks the role", async () => {
    const h = harness();
    expect((await h.run("update_workup", { plan: [{ text: "ECG", status: "pending" }] })).output).toBe("Plan updated (1 items).");
    expect(h.plans).toHaveLength(1);
    expect((await h.run("consult", { role: "radiologist", question: "CT?" })).output).toBe("(radiologist) reply");
    expect(h.asked).toEqual(["radiologist:CT?"]);
  });

  it("finish_case lists open objectives", async () => {
    const h = harness();
    expect((await h.run("finish_case")).output).toBe("Cannot finish yet — objectives still open: Take a history, Get an ECG, Make the diagnosis");
  });
});

describe("NPC tools", () => {
  it("get_results: content only for results the learner has read; nurse also reports readiness", async () => {
    const h = harness("en", "radiologist");
    await h.run("order_test", { investigation_id: "ct-chest" });
    await h.run("wait", { minutes: 20 });
    expect((await h.run("get_results", { investigation_id: "ct-chest" })).output).toMatch(/has not obtained this result/);
    expect((await h.run("get_results", { investigation_id: "ecg" })).output).toMatch(/outside your remit/);
    const nurse = harness("en", "nurse");
    await nurse.run("order_test", { investigation_id: "ct-chest" });
    await nurse.run("wait", { minutes: 20 });
    const status = await nurse.run("get_results");
    expect(status.output).toBe("CT chest (Emergency) is back — the learner should review it.");
    await nurse.run("read_result", { investigation_id: "ct-chest" });
    expect((await nurse.run("get_results")).output).toContain("No aortic dissection.");
  });

  it("reveal_facts enforces phase and `specific` disclosure and credits asks", async () => {
    const h = harness("en", "patient", "anything else?");
    const res = await h.run("reveal_facts", { fact_ids: ["meds", "cocaine", "nope"] });
    expect(res.output).toContain("[meds] I take metformin 500 mg twice a day.");
    expect(res.output).toMatch(/cocaine need a direct, specific question/);
    expect(res.output).toMatch(/unknown id\(s\): nope/);
    expect(h.state.asked).toEqual(["meds"]);
    const direct = harness("en", "patient", "Have you ever used cocaine?");
    expect((await direct.run("reveal_facts", { fact_ids: ["cocaine"] })).data).toMatchObject({ grounded: ["cocaine"] });
  });

  it("get_progress shows hints but never answers; give_hint records a hint", async () => {
    const h = harness("en", "attending");
    const progress = await h.run("get_progress");
    expect(progress.output).toContain("Current objective hint: Ask when the pain started and what it feels like.");
    expect(progress.output).not.toMatch(/stemi|Inferior STEMI/);
    const hint = await h.run("give_hint");
    expect(hint.output).toBe("Ask when the pain started and what it feels like.");
    expect(h.state.hints).toBe(1);
  });
});

describe("registry & validation", () => {
  it("filters by allow-list, scope, bare deny rules and clock mode", () => {
    const registry = new ToolRegistry({ dynamicTools: ["walk_to"] });
    const c = loadMiniCase();
    const names = (scope: "history-only" | "workup" | "full", deny: string[] = []) =>
      registry.forAgent({ tools: ["ask_patient", "order_test", "intervene", "wait", "walk_to", "nonexistent"] }, { scope, deny, caseDef: c }).map((t) => t.name);
    expect(names("full")).toEqual(["ask_patient", "order_test", "intervene", "wait", "walk_to"]);
    expect(names("workup")).toEqual(["ask_patient", "order_test", "wait", "walk_to"]);
    expect(names("history-only")).toEqual(["ask_patient", "walk_to"]);
    expect(names("full", ["intervene", "order_test(ct-*)"])).toEqual(["ask_patient", "order_test", "wait", "walk_to"]);
    expect(isHiddenByDeny("intervene", ["intervene(lysis)"])).toBe(false);
    const staticCase = loadMiniCase((x) => {
      x.clock = { mode: "static" };
    });
    expect(registry.forAgent({ tools: ["wait"] }, { scope: "full", caseDef: staticCase })).toEqual([]);
  });

  it("validateArgs checks types, required, enums, bounds and unknown properties, with lenient coercion", () => {
    const schema = {
      type: "object",
      properties: { kind: { type: "string", enum: ["a", "b"] }, n: { type: "number", minimum: 1, maximum: 5 }, ids: { type: "array", items: { type: "string" }, minItems: 1 } },
      required: ["kind"],
      additionalProperties: false,
    };
    expect(validateArgs(schema, { kind: "a", n: "3", ids: "x" })).toEqual({ ok: true, value: { kind: "a", n: 3, ids: ["x"] }, errors: [] });
    expect(validateArgs(schema, '{"kind":"b"}').ok).toBe(true);
    const bad = validateArgs(schema, { kind: "c", n: 9, extra: 1, ids: [] });
    expect(bad.ok).toBe(false);
    expect(bad.errors).toEqual(["kind: must be one of \"a\", \"b\"", "n: must be ≤ 5", "extra: unknown property", "ids: must have at least 1 item(s)"]);
    expect(validateArgs(schema, {}).errors).toEqual(["kind: is required"]);
  });
});
