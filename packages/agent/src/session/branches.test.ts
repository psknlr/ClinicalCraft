/**
 * Facts that follow the record (case `branches`, docs/CASE_AUTHORING.md §3.1) in the agent runtime: the patient
 * says, the examination finds and the record reads what the encounter's own record makes true — through every path
 * (typed question, button question, `examine`, `read_result`, the colleagues' tools) — and what the learner was told
 * stays what they were told.
 */
import type { CaseDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase, makeSession } from "../__fixtures__/harness.js";
import { factAnswers, obtainedResultsText } from "../tools/npc.js";
import { voiceGroundingInputs } from "./patient-pipeline.js";

const L = (zh: string, en: string) => ({ "zh-CN": zh, en });

/** The mini chest-pain case with a pain answer, a heart finding and an ECG report that follow the aspirin. */
function branchedCase(): CaseDefinition {
  return loadMiniCase((input) => {
    const raw = input as unknown as { history: Record<string, unknown>[]; exam: Record<string, unknown>[]; investigations: { id: string; results: Record<string, Record<string, unknown>> }[] };
    raw.history.find((h) => h.id === "character")!.branches = [{ id: "after-aspirin", when: { intervened: "aspirin" }, answer: L("嚼了药以后，没那么压了。", "Since chewing the tablet the pressure has eased a little.") }];
    raw.exam.find((e) => e.id === "heart")!.branches = [{ id: "after-aspirin", when: { intervened: "aspirin" }, finding: L("心率较前减慢，律齐。", "Rate slower than before; rhythm regular."), abnormal: false }];
    const ecg = raw.investigations.find((i) => i.id === "ecg")!;
    const phase = Object.keys(ecg.results)[0]!;
    ecg.results[phase]!.branches = [{ id: "after-aspirin", when: { intervened: "aspirin" }, note: L("服用阿司匹林后记录。", "Recorded after aspirin.") }];
  });
}

async function started(c: CaseDefinition) {
  const t = await makeSession({ caseDef: c });
  await t.session.run({ type: "clinical_action", action: { type: "start" } });
  return t;
}

const said = (t: Awaited<ReturnType<typeof started>>) => t.msgs("agent_message").map((m) => m.text).join("\n");

describe("an answer that follows the record", () => {
  it("a typed question is answered with the item's own answer while no branch holds", async () => {
    const t = await started(branchedCase());
    await t.session.run({ type: "user_message", text: "What does the pain feel like?", to: "patient" });
    expect(said(t)).not.toContain("the pressure has eased");
    expect(t.session.state.told).toEqual({ "history:character": "" });
  });

  it("…and with the branch once the record makes it true", async () => {
    const t = await started(branchedCase());
    await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "aspirin" } });
    await t.session.run({ type: "user_message", text: "What does the pain feel like?", to: "patient" });
    expect(said(t)).toContain("the pressure has eased");
    expect(t.session.state.told).toEqual({ "history:character": "after-aspirin" });
  });

  it("a button question speaks the same branch the engine records", async () => {
    const t = await started(branchedCase());
    await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "aspirin" } });
    await t.session.run({ type: "clinical_action", action: { type: "ask", itemId: "character" } });
    expect(said(t)).toContain("the pressure has eased");
    expect(t.session.state.told?.["history:character"]).toBe("after-aspirin");
  });

  it("asked again after the record changed, the patient says what is true now and the record follows", async () => {
    const t = await started(branchedCase());
    await t.session.run({ type: "user_message", text: "What does the pain feel like?", to: "patient" });
    expect(t.session.state.told?.["history:character"]).toBe("");
    await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "aspirin" } });
    // what was heard stays what was heard until it is asked again
    expect(factAnswers(t.session.caseDef, t.session.state, ["character"], "en")[0]!.answer).not.toContain("eased");
    await t.session.run({ type: "user_message", text: "What does the pain feel like?", to: "patient" });
    expect(said(t)).toContain("the pressure has eased");
    expect(t.session.state.told?.["history:character"]).toBe("after-aspirin");
    expect(t.session.state.asked.filter((x) => x === "character")).toHaveLength(1);
    expect(factAnswers(t.session.caseDef, t.session.state, ["character"], "en")[0]!.answer).toContain("eased");
  });

  it("no branch of an unasked item may be said: every one of its answers is unrevealed", async () => {
    const c = branchedCase();
    const t = await started(c);
    const { options } = voiceGroundingInputs(c, t.session.state, [], new Set(), "How are you?", null, "en");
    expect(options.unrevealed?.some((x) => x.includes("the pressure has eased"))).toBe(true);
    expect(options.unrevealed?.filter((x) => /pressure|weight|heavy/iu.test(x)).length).toBeGreaterThanOrEqual(2);
  });
});

describe("a finding and a result that follow the record", () => {
  it("`examine` returns the finding as it is found, with its own abnormality", async () => {
    const t = await started(branchedCase());
    await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "aspirin" } });
    await t.session.run({ type: "slash_command", name: "examine", args: "heart" });
    const out = t.msgs("command_output").at(-1)!;
    expect(out.text).toContain("Rate slower than before");
    expect(t.session.state.told?.["exam:heart"]).toBe("after-aspirin");
  });

  it("a result is read as the record made it, and colleagues see what the learner read", async () => {
    const c = branchedCase();
    const t = await started(c);
    await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "aspirin" } });
    await t.session.run({ type: "clinical_action", action: { type: "order", investigationId: "ecg" } });
    await t.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 30 } });
    await t.session.run({ type: "slash_command", name: "read", args: "ecg" });
    expect(t.msgs("command_output").at(-1)!.text).toContain("Recorded after aspirin");
    const key = Object.keys(t.session.state.told ?? {}).find((k) => k.startsWith("result:ecg@"))!;
    expect(t.session.state.told?.[key]).toBe("after-aspirin");
    const nurse = obtainedResultsText({ caseDef: c, locale: "en", state: () => t.session.state, agent: "nurse" } as never, "ecg");
    expect(nurse.text).toContain("Recorded after aspirin");
  });
});
