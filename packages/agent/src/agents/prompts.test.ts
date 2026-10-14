import { createSession as createEngineState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase } from "../__fixtures__/harness.js";
import { buildPatientContext } from "../session/patient-pipeline.js";
import { BUILTIN_AGENTS, builtinAgent, mergeAgentProfiles } from "./builtin.js";
import { clinicianOfflineSteps, narrateAction } from "./offline.js";
import { agentKind, buildSystemSections, clockLabel, renderTemplate, type PromptContext } from "./prompts.js";
import type { AgentProfile } from "./types.js";

const caseDef = loadMiniCase();
const state = createEngineState(caseDef);
const ctx = (extra: Partial<PromptContext> = {}): PromptContext => ({ caseDef, state, locale: "zh-CN", memory: "# Course\nBe kind.", ...extra });
const text = (profile: AgentProfile, extra: Partial<PromptContext> = {}) => buildSystemSections(profile, ctx(extra)).map((s) => s.text).join("\n\n");

describe("built-in agents", () => {
  it("defines the PROTOCOL §8 roster with tool allow-lists", () => {
    expect(BUILTIN_AGENTS.map((a) => a.name)).toEqual(["patient", "companion", "nurse", "radiologist", "pathologist", "attending", "examiner", "clinician"]);
    expect(builtinAgent("nurse")!.tools).toEqual(["get_vitals", "get_results"]);
    expect(builtinAgent("attending")!.tools).toEqual(["get_progress", "give_hint"]);
    expect(builtinAgent("examiner")!.tools).toEqual([]);
    expect(builtinAgent("clinician")!.tools).toEqual(expect.arrayContaining(["ask_patient", "order_test", "update_workup", "finish_case"]));
    expect(builtinAgent("patient")!.injectMemory).toBe(false);
  });

  it("merges profiles builtin < user < project", () => {
    const user = { ...builtinAgent("nurse")!, source: "user" as const, description: "user nurse" };
    const project = { ...builtinAgent("nurse")!, source: "project" as const, description: "project nurse" };
    const merged = mergeAgentProfiles(BUILTIN_AGENTS, [project, user]);
    expect(merged.find((a) => a.name === "nurse")!.description).toBe("project nurse");
  });
});

describe("buildSystemSections", () => {
  it("puts stable sections first and dynamic last for every agent", () => {
    for (const profile of BUILTIN_AGENTS) {
      const patient = profile.name === "patient" || profile.name === "companion" ? buildPatientContext({ caseDef, locale: "zh-CN", speaker: "patient", memory: { approached: true, affectIntensity: 1 }, scene: null }, state, [], [], null) : undefined;
      const sections = buildSystemSections(profile, ctx(patient ? { patient } : {}));
      const caches = sections.map((s) => s.cache);
      const firstDynamic = caches.indexOf("dynamic");
      if (firstDynamic >= 0) expect(caches.slice(firstDynamic).every((c) => c === "dynamic")).toBe(true);
      expect(sections[0]!.id).toBe("identity");
      expect(sections.find((s) => s.id === "language")!.text).toContain("Simplified Chinese (zh-CN)");
      expect(sections.find((s) => s.id === "rules")).toBeDefined();
    }
  });

  it("patient prompt: persona and need-to-know facts only; no memory, results, diagnosis or vitals", () => {
    const patient = buildPatientContext({ caseDef, locale: "zh-CN", speaker: "patient", memory: { approached: true, affectIntensity: 1 }, scene: "急诊" }, { ...state, asked: ["onset"] }, ["meds"], [], null);
    const t = text(builtinAgent("patient")!, { patient });
    expect(t).toContain("You are role-playing 李明, a 58-year-old male patient");
    expect(t).toContain("[onset] 大概两个小时前");
    expect(t).toContain("[meds] (answer_now) 我每天吃二甲双胍500毫克");
    expect(t).toContain('"say": string');
    for (const secret of ["抽了30年", "ST段抬高", "STEMI", "Be kind", "SpO₂", "心率"]) expect(t).not.toContain(secret);
  });

  it("assistants get memory, monitor and progress; the attending never sees the diagnosis unless allowed", () => {
    const attending = text(builtinAgent("attending")!);
    expect(attending).toContain("<project_memory>");
    expect(attending).toContain("<monitor>");
    expect(attending).toContain("当前目标提示");
    expect(attending).not.toContain("下壁STEMI。");
    const revealing = loadMiniCase((c) => {
      c.npcs = [{ role: "attending", knowledge: "x", revealsDiagnosis: true }];
    });
    expect(buildSystemSections(builtinAgent("attending")!, { caseDef: revealing, state, locale: "zh-CN" }).map((s) => s.text).join("\n")).toContain("下壁STEMI。");
    const clinician = text(builtinAgent("clinician")!, { plan: [{ text: "ECG", status: "pending" }] });
    expect(clinician).toContain("<case_status>");
    expect(clinician).toContain("- [pending] ECG");
    expect(clinician).toContain("Clock: simulated");
  });

  it("a project override of a built-in prompt keeps the non-removable grounding rules", () => {
    const override: AgentProfile = { ...builtinAgent("nurse")!, source: "project", prompt: "You are {{npc.name}}. Say anything you like." };
    const t = text(override);
    expect(t).toContain("You are 王护士. Say anything you like.");
    expect(t).toContain("Never guess a result");
    expect(agentKind({ name: "pharmacist", role: "npc" })).toBe("npc");
  });

  it("renders templates and clock labels", () => {
    expect(renderTemplate("{{patient.displayName}} / {{missing.key}} / {{ case.title }}", { patient: { displayName: "A" }, case: { title: "T" } })).toBe("A /  / T");
    expect(clockLabel(caseDef, 75, "en")).toBe("10:15 (75 min)");
  });
});

describe("offline clinician plan", () => {
  it("maps the reference solution to tool calls with localised narration", () => {
    const steps = clinicianOfflineSteps(caseDef, "zh-CN");
    expect(steps.map((s) => (s.kind === "tool" ? s.tool : `action:${s.action.type}`))).toEqual([
      "action:start",
      "ask_patient",
      "ask_patient",
      "order_test",
      "wait",
      "read_result",
      "answer_decision",
      "finish_case",
    ]);
    const ask = steps[1]!;
    expect(ask.kind === "tool" && ask.args).toEqual({ question: "胸痛什么时候开始的？" });
    expect(narrateAction(caseDef, { type: "answer", decisionId: "dx", optionIds: ["stemi"] }, "en")).toBe("Deciding: Most likely diagnosis? → Inferior STEMI");
  });
});
