import { createSession as createEngineState, presentedOptions, reduce, RHYTHMS, type CaseInput, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase } from "../__fixtures__/harness.js";
import type { PlanItem } from "../protocol.js";
import { clockTime, rhythmLabel } from "./format.js";
import { ToolRegistry, isHiddenByDeny } from "./index.js";
import type { ToolContext } from "./types.js";
import { validateArgs } from "./validate.js";

/** A tool context over the real engine (no session); `mutate` edits the mini case first. */
function harness(locale = "en", agent: string = "clinician", utterance: string | null = null, mutate?: (input: CaseInput) => void) {
  const caseDef = loadMiniCase(mutate);
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
    expect(ok.output).toBe("Ordered Troponin (Emergency). Result expected at 09:45 (now 09:00).");
    expect((await h.run("order_test", { investigation_id: "troponin" })).output).toMatch(/already ordered/);
    const early = await h.run("read_result", { investigation_id: "troponin" });
    expect(early.ok).toBe(false);
    expect(early.output).toMatch(/not ready yet\. Result expected at 09:45/);
    expect((await h.run("order_test", {})).output).toMatch(/Provide either investigation_id or query/);
  });

  it("read_result returns the recorded text and values once ready; wait advances the clock", async () => {
    const h = harness();
    await h.run("order_test", { investigation_id: "troponin" });
    const waited = await h.run("wait", { minutes: 45 });
    expect(waited.output).toMatch(/Waited 45 min \(09:00 → 09:45\)/);
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

  it("intervene: a negated instruction acts on nothing and says why (en + zh-CN)", async () => {
    const en = harness("en");
    const tool = en.registry.get("intervene")!;
    expect(tool.risk({ query: "do not thrombolyse, no tenecteplase" }, en.ctx)).toBe("none");
    const refused = await en.run("intervene", { query: "don't give tenecteplase" });
    expect(refused.ok).toBe(false);
    expect(refused.output).toBe('Nothing was done: "don\'t give tenecteplase" is an instruction not to act (not given: Tenecteplase thrombolysis). intervene only performs actions; to withhold one, do not call it.');
    expect(refused.data).toMatchObject({ unresolved: "negated", withheld: [{ id: "lysis" }], candidates: [], doubleNegative: false });
    const double = await en.run("intervene", { query: "do not delay the aspirin" });
    expect(double.output).toBe('Nothing was done: "do not delay the aspirin" contains a double negative. Say plainly what to do ("give …", "stop …").');
    const kept = await en.run("intervene", { query: "no thrombolysis, give aspirin" });
    expect(kept.ok).toBe(true);
    expect(en.state.interventions.map((i) => i.interventionId)).toEqual(["aspirin"]);
    const zh = harness("zh-CN");
    const zhRefused = await zh.run("intervene", { query: "溶栓先不做" });
    expect(zhRefused.output).toBe("未执行任何操作：“溶栓先不做”是一条不做某事的指示（未给予：替奈普酶溶栓）。intervene 只执行操作；若要暂不给予某项，不调用即可。");
    expect(zh.state.interventions).toEqual([]);
  });

  it("answer_decision validates options and reports requirements", async () => {
    const h = harness();
    expect((await h.run("answer_decision", { decision_id: "dx", option_ids: ["stemi"] })).output).toBe("Not yet answerable: Review the ECG first.");
    // Once unlocked, an unknown option id lists the options in presentation order.
    h.ctx.dispatch({ type: "order", investigationId: "ecg" });
    h.ctx.dispatch({ type: "advance-time", minutes: 10 });
    h.ctx.dispatch({ type: "read", investigationId: "ecg" });
    const bad = await h.run("answer_decision", { decision_id: "dx", option_ids: ["zzz"] });
    expect(bad.output).toMatch(/Unknown option id/);
    const presented = presentedOptions(h.caseDef, h.caseDef.decisions[0]!).map((o) => o.id);
    expect(bad.output.indexOf(`${presented[0]} (`)).toBeLessThan(bad.output.indexOf(`${presented[1]} (`));
  });

  it("answer_decision on a locked decision never names its prompt or options (F0/F1)", async () => {
    for (const locale of ["en", "zh-CN"]) {
      const h = harness(locale);
      const tool = h.registry.get("answer_decision")!;
      const out = await h.run("answer_decision", { decision_id: "dx", option_ids: ["zzz"] });
      expect(out.ok).toBe(false);
      for (const secret of ["Inferior STEMI", "Pulmonary embolism", "下壁STEMI", "肺栓塞", "stemi", "pe (", "Most likely", "最可能"]) expect(out.output).not.toContain(secret);
      expect(out.output).toContain(locale === "en" ? "Review the ECG first." : "先查看心电图。");
      // The pre-gate refusal and the approval summary say no more.
      expect(tool.precheck!({ decision_id: "dx", option_ids: ["stemi"] }, h.ctx)?.ok).toBe(false);
      const summary = tool.summarize({ decision_id: "dx", option_ids: ["pe"] }, h.ctx);
      for (const secret of ["Pulmonary", "肺栓塞", "Most likely", "最可能", "pe"]) expect(summary).not.toContain(secret);
      expect(summary).toContain(locale === "en" ? "Decision 1" : "判断 1");
    }
    const h = harness();
    h.ctx.dispatch({ type: "order", investigationId: "ecg" });
    h.ctx.dispatch({ type: "advance-time", minutes: 10 });
    h.ctx.dispatch({ type: "read", investigationId: "ecg" });
    expect(h.registry.get("answer_decision")!.precheck!({ decision_id: "dx", option_ids: ["stemi"] }, h.ctx)).toBeNull();
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

const LT = (zh: string, en: string) => ({ "zh-CN": zh, en });

describe("learner-facing wording (zh-CN + en)", () => {
  /** Two automatic phases: "ed" (initial) and "ward" (entered at minute 10). */
  const autoPhases = (x: CaseInput) => {
    x.phases = [
      { id: "ed", label: LT("急诊", "Emergency"), learnerSwitchable: false },
      { id: "ward", label: LT("病房", "Ward"), learnerSwitchable: false, enterWhen: { elapsed: { gte: 10 } } },
    ] as CaseInput["phases"];
  };

  it("phases: the current phase is only 'current'; other automatic phases advance automatically; switching one says why (L14)", async () => {
    const en = harness("en", "learner", null, autoPhases);
    const start = (await en.run("list_options", { kind: "phases" })).output;
    expect(start).toContain("- [ed] Emergency (current)\n");
    expect(start).not.toMatch(/locked/);
    const refused = await en.run("set_phase", { phase: "ward" });
    expect(refused.ok).toBe(false);
    expect(refused.output).toContain("This phase follows the case clock and cannot be switched manually.");
    expect(refused.output).not.toContain("Not available in the current phase");
    await en.run("wait", { minutes: 10 });
    expect(en.state.phase).toBe("ward");
    const later = (await en.run("list_options", { kind: "phases" })).output;
    expect(later).toContain("- [ed] Emergency (advances automatically)");
    expect(later).toContain("- [ward] Ward (current)");
    expect(later).not.toMatch(/locked|current\) \(/);

    const zh = harness("zh-CN", "learner", null, autoPhases);
    const zhStart = (await zh.run("list_options", { kind: "phases" })).output;
    expect(zhStart).toContain("- [ed] 急诊 (当前)");
    expect(zhStart).not.toContain("未解锁");
    const zhRefused = await zh.run("set_phase", { phase: "ward" });
    expect(zhRefused.output).toContain("该阶段随病例时钟推进，不能手动切换。");
    expect(zhRefused.output).not.toContain("当前阶段不可用");
    await zh.run("wait", { minutes: 10 });
    expect((await zh.run("list_options", { kind: "phases" })).output).toContain("- [ed] 急诊 (随病情自动推进)");
  });

  it("vitals name the rhythm in words, never the enum id (L15)", async () => {
    const tachy = (x: CaseInput) => {
      x.physiology!.baseline.rhythm = "sinus-tachycardia";
    };
    const zh = (await harness("zh-CN", "learner", null, tachy).run("check_vitals")).output;
    expect(zh).toContain("心律 窦性心动过速");
    expect(zh).not.toContain("sinus");
    const en = (await harness("en", "learner", null, tachy).run("check_vitals")).output;
    expect(en).toContain("rhythm sinus tachycardia");
    expect(en).not.toContain("sinus-tachycardia");
    for (const rhythm of RHYTHMS) {
      expect(rhythmLabel(rhythm, "zh-CN")).toMatch(/^[一-鿿]+$/);
      expect(rhythmLabel(rhythm, "en")).not.toContain("-");
    }
    expect(rhythmLabel("junctional", "zh-CN")).toBe("junctional"); // unknown values are shown as recorded
  });

  it("clock times are whole minutes (case clock time when the case has a start time), never fractional action costs (L17)", async () => {
    const halfMinutes = (x: CaseInput) => {
      x.clock = { ...x.clock, actionCosts: { ask: 0.5, examine: 0.5, order: 0.5, read: 0.5, intervene: 1, answer: 0 } };
    };
    const en = harness("en", "learner", null, halfMinutes);
    await en.run("examine", { finding_id: "heart" }); // 0 → 0.5
    const ordered = await en.run("order_test", { investigation_id: "troponin" }); // ordered at 0.5, ready at 45.5; clock → 1
    expect(ordered.output).toBe("Ordered Troponin (Emergency). Result expected at 09:46 (now 09:01).");
    const status = await en.run("case_status");
    expect(status.output).toContain("Phase Emergency · 09:01");
    expect(status.output).toContain("pending (expected 09:46)");
    const waited = await en.run("wait", { minutes: 30 });
    expect(waited.output).toMatch(/^Waited 30 min \(09:01 → 09:31\)\./);
    expect((await en.run("check_vitals")).output).toMatch(/^\[09:31\] /);
    const early = await en.run("read_result", { investigation_id: "troponin" });
    expect(early.output).toContain("Result expected at 09:46 (now 09:31).");
    for (const out of [ordered, status, waited, early]) expect(out.output).not.toMatch(/\d\.5\b/);

    const zh = harness("zh-CN", "learner", null, (x) => {
      halfMinutes(x);
      delete x.clock.startTime;
    });
    await zh.run("examine", { finding_id: "heart" });
    expect((await zh.run("order_test", { investigation_id: "troponin" })).output).toBe("已开具肌钙蛋白（急诊）。预计第 46 分钟出结果（现在第 1 分钟）。");
    expect((await zh.run("wait", { minutes: 30 })).output).toMatch(/^已等待 30 分钟（第 1 分钟 → 第 31 分钟）。/);
    expect((await zh.run("case_status")).output).toContain("待出（预计第 46 分钟）");
    expect(clockTime(loadMiniCase(), 59.9, "en")).toBe("09:59");
    expect(clockTime(loadMiniCase(), 45.5, "en", "ceil")).toBe("09:46");
  });

  it("the wait summary never reports an arrest's placeholder zeros as alarm readings", async () => {
    const vf = (x: CaseInput) => {
      x.physiology!.events.push({ id: "vf", atMinute: 10, setVitals: { rhythm: "ventricular-fibrillation", rr: 0 }, severity: "critical" } as never);
    };
    for (const [locale, noReading] of [["en", "HR no reading (critical)"], ["zh-CN", "心率 测不出 (危急)"]] as const) {
      const h = harness(locale, "clinician", null, vf);
      const meanwhile = ((await h.run("wait", { minutes: 12 })).data as { meanwhile: string }).meanwhile;
      expect(meanwhile).toContain(noReading);
      expect(meanwhile).not.toMatch(/ 0 mmHg|SpO₂ 0%|(HR|心率) 0\/min/); // RR 0 is a reading: apnoea
    }
  });

  it("the wait summary addresses whoever waited and never doubles punctuation (L21)", async () => {
    const en = harness("en", "learner");
    await en.run("order_test", { investigation_id: "troponin" });
    const waited = await en.run("wait", { minutes: 45 });
    const meanwhile = (waited.data as { meanwhile: string }).meanwhile;
    expect(meanwhile).toMatch(/^Meanwhile: /);
    expect(meanwhile).toContain("The patient says the pain is getting worse; ");
    expect(meanwhile).toContain("Troponin (Emergency) is back — review it");
    expect(meanwhile).toMatch(/\.$/);
    expect(meanwhile).not.toMatch(/learner|[.;]{2}|\.;/);
    const zh = harness("zh-CN", "learner");
    await zh.run("order_test", { investigation_id: "troponin" });
    const zhMeanwhile = ((await zh.run("wait", { minutes: 45 })).data as { meanwhile: string }).meanwhile;
    expect(zhMeanwhile).toMatch(/^期间：/);
    expect(zhMeanwhile).toContain("患者诉胸痛加重；");
    expect(zhMeanwhile).toContain("肌钙蛋白（急诊）结果已出，请查看");
    expect(zhMeanwhile).toMatch(/。$/);
    expect(zhMeanwhile).not.toMatch(/学习者|[。；]{2}/);
  });
});

describe("per-locale result values and reference texts (J3)", () => {
  it("read_result shows each locale's own value and reference text", async () => {
    const mutate = (x: CaseInput) => {
      const ua = x.investigations.find((i) => i.id === "troponin")!;
      ua.results = { ed: { text: { "zh-CN": "尿常规。", en: "Urinalysis." }, values: [{ analyte: { "zh-CN": "白细胞酯酶", en: "Leukocyte esterase" }, value: { "zh-CN": "阴性", en: "negative" }, unit: "", refText: { "zh-CN": "阴性", en: "negative" } }, { analyte: { "zh-CN": "血酮", en: "Ketones" }, value: 0.4, unit: "mmol/L", refText: { "zh-CN": "< 0.6 正常", en: "< 0.6 normal" } }] } } as never;
    };
    for (const locale of ["en", "zh-CN"]) {
      const h = harness(locale, "clinician", null, mutate);
      h.ctx.dispatch({ type: "order", investigationId: "troponin" });
      h.ctx.dispatch({ type: "advance-time", minutes: 60 });
      const out = (await h.run("read_result", { investigation_id: "troponin" })).output;
      if (locale === "en") {
        expect(out).toContain("Leukocyte esterase: negative (ref negative)");
        expect(out).toContain("(ref < 0.6 normal)");
        expect(out).not.toMatch(/[一-鿿]/);
      } else {
        expect(out).toContain("白细胞酯酶: 阴性 (参考 阴性)");
        expect(out).not.toContain("normal");
      }
    }
  });
});
