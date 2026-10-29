/**
 * Patients who cannot speak (`patient.nonVerbalWhen`, docs/CASE_AUTHORING.md §2) in the session: the patient
 * never speaks — history goes to the companion when the case has one (whatever `answersHistory` says), else
 * the reply is an honest narration (speaker: the narrator, no fact revealed); the opening line too.
 */
import { readFileSync } from "node:fs";
import { parseCase, t, type CaseInput } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase, makeSession, msgsOf } from "../__fixtures__/harness.js";
import { buildSystemSections } from "../agents/prompts.js";
import { BUILTIN_AGENTS } from "../agents/builtin.js";
import { textScript, toolCallScript } from "../providers/scripted.js";
import { buildPatientContext, voiceGroundingInputs } from "./patient-pipeline.js";
import { rt } from "./i18n.js";

const REASON = { "zh-CN": "气管插管镇静中", en: "intubated and sedated" };
const COMPANION = { role: "spouse" as const, name: { "zh-CN": "王芳", en: "Wang Fang" }, persona: { "zh-CN": "他的妻子", en: "His wife" } };

function quiet(patch: (x: CaseInput) => void = () => undefined) {
  return loadMiniCase((x) => {
    x.patient.nonVerbalWhen = { intervened: "aspirin" };
    x.patient.nonVerbalReason = REASON;
    patch(x);
  });
}

describe("a patient who cannot speak", () => {
  it("speaks until the condition holds; then every reply is a narration and reveals nothing", async () => {
    const c = quiet();
    const t1 = await makeSession({ caseDef: c });
    await t1.session.run({ type: "clinical_action", action: { type: "start" } });
    const before = msgsOf(await t1.session.run({ type: "user_message", text: "When did the chest pain start?" }), "agent_message").at(-1)!;
    expect(before).toMatchObject({ agent: "patient", speaker: "Li Ming", grounded: ["onset"] });
    await t1.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "aspirin" } });
    const events = await t1.session.run({ type: "user_message", text: "What does the pain feel like?" });
    const reply = msgsOf(events, "agent_message").at(-1)!;
    expect(reply).toMatchObject({ agent: "patient", speaker: rt("en", "speaker.narrator"), text: "Li Ming cannot answer: intubated and sedated.", grounded: [], grounding: "narrated" });
    // a narration is not streamed as the patient's words, and nothing is credited
    expect(msgsOf(events, "agent_message_delta").filter((d) => d.turnId === reply.turnId)).toEqual([]);
    expect(t1.session.state.asked).toEqual(["onset"]);
  });

  it("narrates in Chinese too, and on approach (not the opening line)", async () => {
    const c = quiet((x) => (x.patient.nonVerbalWhen = { always: true }));
    const t1 = await makeSession({ caseDef: c, settingsPatch: { locale: "zh-CN" } });
    const approach = msgsOf(await t1.session.run({ type: "user_message", text: "", to: "patient" }), "agent_message").at(-1)!;
    expect(approach).toMatchObject({ agent: "patient", speaker: rt("zh-CN", "speaker.narrator"), text: "李明无法说话：气管插管镇静中。", grounding: "narrated" });
    const reply = msgsOf(await t1.session.run({ type: "user_message", text: "胸痛什么时候开始的？" }), "agent_message").at(-1)!;
    expect(reply.text).toBe("李明无法回答：气管插管镇静中。");
    expect(t1.session.state.asked).toEqual([]);
  });

  it("a parenthesised opening line is narration, never the patient's speech", async () => {
    const c = quiet((x) => {
      x.patient.nonVerbalWhen = { always: true };
      x.patient.persona.openingLine = { "zh-CN": "（他接着呼吸机，无法说话；妻子在床旁。）", en: "(He is on a ventilator and cannot speak; his wife is at the bedside.)" };
    });
    const t1 = await makeSession({ caseDef: c });
    const approach = msgsOf(await t1.session.run({ type: "user_message", text: "", to: "patient" }), "agent_message").at(-1)!;
    expect(approach).toMatchObject({ agent: "patient", speaker: rt("en", "speaker.narrator"), text: "He is on a ventilator and cannot speak; his wife is at the bedside.", grounding: "narrated" });
  });

  it("a button question nobody can answer is refused, with no patient line", async () => {
    const c = quiet((x) => (x.patient.nonVerbalWhen = { always: true }));
    const t1 = await makeSession({ caseDef: c });
    await t1.session.run({ type: "clinical_action", action: { type: "start" } });
    const events = await t1.session.run({ type: "clinical_action", action: { type: "ask", itemId: "onset", via: "button" } });
    expect(msgsOf(events, "agent_message")).toEqual([]);
    expect(msgsOf(events, "warning").map((w) => w.message).join("\n")).toContain(rt("en", "reject.cannot-answer"));
    expect(t1.session.state.asked).toEqual([]);
  });

  it("the companion answers instead, whatever answersHistory says — the patient's own words relayed", async () => {
    const c = quiet((x) => {
      x.patient.nonVerbalWhen = { always: true };
      x.patient.persona.companion = { ...COMPANION, answersHistory: false };
    });
    const meds = t(c.history.find((h) => h.id === "meds")!.answer, "en");
    const t1 = await makeSession({ caseDef: c });
    await t1.session.run({ type: "clinical_action", action: { type: "start" } });
    const reply = msgsOf(await t1.session.run({ type: "user_message", text: "What medicines do you take?" }), "agent_message").at(-1)!;
    expect(reply).toMatchObject({ agent: "companion", speaker: "Wang Fang", text: `He told us: “${meds}”`, grounded: ["meds"] });
    expect(t1.session.state.asked).toContain("meds");
    // addressed directly, the companion no longer defers history to the patient
    const direct = msgsOf(await t1.session.run({ type: "user_message", text: "When did the chest pain start?", to: "companion" }), "agent_message").at(-1)!;
    expect(direct).toMatchObject({ agent: "companion", grounded: ["onset"] });
    // a button question goes to the companion as well
    const button = msgsOf(await t1.session.run({ type: "clinical_action", action: { type: "ask", itemId: "character", via: "button" } }), "agent_message").at(-1)!;
    expect(button.agent).toBe("companion");
    expect(button.text.startsWith("He told us: “")).toBe(true);
    const zh = await makeSession({ caseDef: c, settingsPatch: { locale: "zh-CN" } });
    await zh.session.run({ type: "clinical_action", action: { type: "start" } });
    const zhReply = msgsOf(await zh.session.run({ type: "user_message", text: "平时吃什么药？" }), "agent_message").at(-1)!;
    expect(zhReply.text).toBe(`他跟我们说过：“${t(c.history.find((h) => h.id === "meds")!.answer, "zh-CN")}”`);
  });

  it("a companion who answers history speaks their own authored answers; the patient's own words are relayed", async () => {
    const c = quiet((x) => {
      x.patient.nonVerbalWhen = { always: true };
      x.patient.persona.companion = { ...COMPANION, answersHistory: true };
      x.history.find((h) => h.id === "character")!.speaker = "patient";
    });
    const t1 = await makeSession({ caseDef: c });
    await t1.session.run({ type: "clinical_action", action: { type: "start" } });
    const own = msgsOf(await t1.session.run({ type: "user_message", text: "What does the pain feel like?" }), "agent_message").at(-1)!;
    expect(own.agent).toBe("companion");
    expect(own.text.startsWith("He told us: “")).toBe(true);
    const theirs = msgsOf(await t1.session.run({ type: "user_message", text: "What medicines do you take?" }), "agent_message").at(-1)!;
    expect(theirs).toMatchObject({ agent: "companion", text: t(c.history.find((h) => h.id === "meds")!.answer, "en") });
  });

  it("the model companion is told the patient cannot speak; the verifier may quote the reason", async () => {
    const c = quiet((x) => {
      x.patient.nonVerbalWhen = { always: true };
      x.patient.nonVerbalReason = { "zh-CN": "插管镇静，呼吸机频率 14 次/分", en: "intubated and sedated, ventilator rate 14/min" };
      x.patient.persona.companion = { ...COMPANION, answersHistory: false };
    });
    const t1 = await makeSession({ caseDef: c, scripts: [textScript(JSON.stringify({ say: "He takes nothing regular, as far as I know.", nonverbal: null, usedFactIds: ["meds"], affectHint: "same" }))] });
    await t1.session.run({ type: "clinical_action", action: { type: "start" } });
    await t1.session.run({ type: "user_message", text: "What medicines do you take?" });
    const system = t1.provider!.requests.at(-1)!.system.map((s) => s.text).join("\n");
    expect(system).toContain("The patient cannot speak now (intubated and sedated, ventilator rate 14/min)");
    const state = t1.session.state;
    const { sources } = voiceGroundingInputs(c, state, ["meds"], new Set(["meds"]), "What medicines?", null, "en");
    expect(sources).toContain("intubated and sedated, ventilator rate 14/min");
    // speaking normally, the reason is no source (it is never shown)
    const speaking = loadMiniCase((x) => {
      x.patient.nonVerbalWhen = { intervened: "aspirin" };
      x.patient.nonVerbalReason = { "zh-CN": "插管镇静，呼吸机频率 14 次/分", en: "intubated and sedated, ventilator rate 14/min" };
    });
    expect(voiceGroundingInputs(speaking, state, [], new Set(), "?", null, "en").sources).not.toContain("intubated and sedated, ventilator rate 14/min");
    // the companion's prompt context carries it; the patient's own voice is never called while it holds
    const profile = BUILTIN_AGENTS.find((a) => a.name === "companion")!;
    const ctx = buildPatientContext({ caseDef: c, locale: "en", speaker: "companion", memory: { approached: true, affectIntensity: 1 }, scene: null }, state, [], [], null);
    expect(ctx.patientNonVerbal).toBe("intubated and sedated, ventilator rate 14/min");
    expect(buildSystemSections(profile, { caseDef: c, state, locale: "en", patient: ctx }).map((s) => s.text).join("\n")).toContain("You answer the doctor's history questions on their behalf");
  });

  it("list_options(history) offers no question nobody can answer, and says why", async () => {
    const c = quiet((x) => (x.patient.nonVerbalWhen = { always: true }));
    const t1 = await makeSession({ caseDef: c, scripts: [toolCallScript([{ id: "c1", name: "list_options", args: { kind: "history" } }]), textScript("Noted.")] });
    await t1.session.run({ type: "clinical_action", action: { type: "start" } });
    const call = msgsOf(await t1.session.run({ type: "user_message", text: "What can I ask?", to: "clinician" }), "tool_call_end").find((e) => e.tool === "list_options")!;
    expect(call.output).toContain("Li Ming cannot answer: intubated and sedated.");
    expect(call.output).not.toContain("[onset]");
  });

  it("the clinician's ask_patient gets the narration (and no fact) when nobody can answer", async () => {
    const c = quiet((x) => (x.patient.nonVerbalWhen = { always: true }));
    const t1 = await makeSession({ caseDef: c, scripts: [toolCallScript([{ id: "c1", name: "ask_patient", args: { question: "When did the chest pain start?" } }]), textScript("He cannot answer.")] });
    await t1.session.run({ type: "clinical_action", action: { type: "start" } });
    const events = await t1.session.run({ type: "user_message", text: "Take the history.", to: "clinician" });
    const call = msgsOf(events, "tool_call_end").find((e) => e.tool === "ask_patient")!;
    expect(call.output).toBe("Li Ming cannot answer: intubated and sedated.");
    expect(t1.session.state.asked).toEqual([]);
  });
});

describe("septic-shock-cap after intubation (the built-in case)", () => {
  it("the patient narrates on approach; the daughter answers history in her own words", async () => {
    const parsed = parseCase(JSON.parse(readFileSync(new URL("../../../content/cases/septic-shock-cap/case.json", import.meta.url), "utf8")));
    if (!parsed.ok) throw new Error("septic-shock-cap");
    const c = parsed.value;
    const t1 = await makeSession({ caseDef: c });
    await t1.session.run({ type: "clinical_action", action: { type: "start" } });
    const before = msgsOf(await t1.session.run({ type: "user_message", text: "", to: "patient" }), "agent_message").at(-1)!;
    expect(before.grounding).toBe("opening");
    // a high-risk act: given straight through the engine (no approval to answer in this test)
    expect(t1.session.dispatch({ type: "intervene", interventionId: "intubation" }).rejected).toBeUndefined();
    const approach = msgsOf(await t1.session.run({ type: "user_message", text: "", to: "patient" }), "agent_message").at(-1)!;
    expect(approach).toMatchObject({ agent: "patient", grounding: "narrated", text: "Lin Xiuzhen cannot speak: intubated, sedated and on mechanical ventilation after rapid-sequence induction." });
    const allergies = c.history.find((h) => h.id === "hx-allergies")!;
    const reply = msgsOf(await t1.session.run({ type: "user_message", text: t(allergies.question, "en") }), "agent_message").at(-1)!;
    expect(reply).toMatchObject({ agent: "companion", text: t(allergies.answer, "en"), grounded: ["hx-allergies"] });
  });
});
