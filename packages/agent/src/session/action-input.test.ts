/**
 * A learner's `answer` action ↔ `answer_decision` input (docs/PROTOCOL.md §6.1): the action reaches PreToolUse hooks
 * and the approval gate with its options as letters, and a hook's `updatedInput` comes back the way the tool reads it
 * — letters, numbers or exact ids, "A, C" as two options, each option once. Input the hook left alone keeps the
 * action's own ids; a token naming no option, or no decision, is refused (`invalid_action`) before any approval, and
 * an action naming a decision or option id its case lacks before the hooks too (`answerActionRefusal`).
 */
import { createSession as createEngineState, reduce, t, type CaseDefinition, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase, makeSession, msgsOf } from "../__fixtures__/harness.js";
import { stepForAction } from "../agents/offline.js";
import { labelledOptions } from "../tools/option-labels.js";
import { actionFromToolInput, actionToolArgs } from "./action-input.js";

/**
 * The mini case with Decision 1's options re-id'd "a", "b", "c" — one-letter ids, as some cases author them — under a
 * case id whose presentation order puts no option under its own letter (the letter "A" is never the id "a").
 */
function letteredCase(kind: "single" | "multiple" = "single"): CaseDefinition {
  for (let i = 0; i < 200; i++) {
    const c = loadMiniCase((x) => {
      x.id = `mini-lettered-${i}`;
      const d = x.decisions![0]!;
      d.kind = kind;
      d.options = [
        { ...d.options[0]!, id: "a" },
        { ...d.options[1]!, id: "b" },
        { id: "c", text: { "zh-CN": "主动脉夹层", en: "Aortic dissection" }, correct: kind === "multiple", feedback: { "zh-CN": "不支持。", en: "Not supported." } },
      ];
      for (const step of x.solution ?? []) if (step.type === "answer") step.optionIds = kind === "multiple" ? ["a", "c"] : ["a"];
    });
    if (labelledOptions(c, c.decisions[0]!).every((o) => o.label.toLowerCase() !== o.option.id)) return c;
  }
  throw new Error("no presentation order without a letter matching its id");
}

/** The engine state once the ECG has been read: Decision 1 is open. */
function unlocked(c: CaseDefinition): SessionState {
  let s = createEngineState(c);
  for (const action of [{ type: "start" }, { type: "order", investigationId: "ecg" }, { type: "advance-time", minutes: 10 }, { type: "read", investigationId: "ecg" }] as ClinicalAction[]) s = reduce(c, s, action).state;
  return s;
}

/** The letter a decision's option is presented under. */
function letterOf(c: CaseDefinition, optionId: string): string {
  return labelledOptions(c, c.decisions[0]!).find((o) => o.option.id === optionId)!.label;
}

describe("a learner's answer as answer_decision input", () => {
  it("goes to hooks and the gate as letters (one-letter ids too), the decision by its id", () => {
    const c = letteredCase();
    const args = actionToolArgs(c, { type: "answer", decisionId: "dx", optionIds: ["a"] }, "en");
    expect(args).toEqual({ decision_id: "dx", option_ids: [letterOf(c, "a")] });
    expect(letterOf(c, "a")).not.toBe("A");
    // An id the decision lacks is kept as it is (the engine refuses it).
    expect(actionToolArgs(c, { type: "answer", decisionId: "dx", optionIds: ["zz"] }, "en")).toEqual({ decision_id: "dx", option_ids: ["zz"] });
  });

  it("comes back as the action's own ids when a hook leaves the input unchanged — an unknown id is never read as a letter", () => {
    const c = letteredCase();
    const s = unlocked(c);
    for (const optionIds of [["a"], ["b"], ["c"]]) {
      const action: ClinicalAction = { type: "answer", decisionId: "dx", optionIds, by: "learner" };
      expect(actionFromToolInput(c, action, actionToolArgs(c, action, "en"), "en", s)).toEqual({ ok: true, action });
    }
    // The review's case: option "b" of a decision whose options are "stemi" and "pe" — no option, whatever a letter says.
    const mini = loadMiniCase();
    const unknown: ClinicalAction = { type: "answer", decisionId: "dx", optionIds: ["b"] };
    expect(actionFromToolInput(mini, unknown, actionToolArgs(mini, unknown, "en"), "en", unlocked(mini))).toEqual({ ok: true, action: unknown });
    const number: ClinicalAction = { type: "answer", decisionId: "dx", optionIds: ["2"] };
    expect(actionFromToolInput(mini, number, actionToolArgs(mini, number, "en"), "en", unlocked(mini))).toEqual({ ok: true, action: number });
  });

  it("reads changed input as the tool does: letters, numbers and exact ids, the decision by number or id, each option once", () => {
    const c = letteredCase();
    const s = unlocked(c);
    const action: ClinicalAction = { type: "answer", decisionId: "dx", optionIds: ["b"], by: "learner" };
    const back = (input: Record<string, unknown>) => actionFromToolInput(c, action, input, "en", s);
    const idOf = (letter: string) => labelledOptions(c, c.decisions[0]!).find((o) => o.label === letter)!.option.id;
    // A letter is the presented option, also when an id is spelt the same ("a" is the letter A, not the id "a").
    for (const token of ["A", "a", "Ａ", "[A]", "1"]) expect(back({ decision_id: "dx", option_ids: [token] }), token).toEqual({ ok: true, action: { ...action, optionIds: [idOf("A")] } });
    expect(idOf("A")).not.toBe("a");
    // The decision by its number ("1", "D1", "决策 1") or its id; the option by an exact id that reads as no letter.
    for (const ref of ["1", "D1", "决策 1", "dx"]) expect(back({ decision_id: ref, option_ids: [letterOf(c, "c")] }), ref).toEqual({ ok: true, action: { ...action, optionIds: ["c"] } });
    // The same option twice counts once.
    expect(back({ decision_id: "1", option_ids: ["A", "1", "a"] })).toEqual({ ok: true, action: { ...action, optionIds: [idOf("A")] } });
  });

  it("reads \"A, C\" in one item as two options (a select-all decision)", () => {
    const c = letteredCase("multiple");
    const s = unlocked(c);
    const action: ClinicalAction = { type: "answer", decisionId: "dx", optionIds: ["b"] };
    const idOf = (letter: string) => labelledOptions(c, c.decisions[0]!).find((o) => o.label === letter)!.option.id;
    for (const item of ["A, C", "A,C", "Ａ，Ｃ", "A、C", "A C", "A; C"]) {
      expect(actionFromToolInput(c, action, { decision_id: "1", option_ids: [item] }, "en", s), item).toEqual({ ok: true, action: { ...action, optionIds: [idOf("A"), idOf("C")] } });
    }
  });

  it("refuses a token naming no option, separators only or no decision — the options by letter, the decisions by number", () => {
    const c = loadMiniCase();
    const s = unlocked(c);
    const action: ClinicalAction = { type: "answer", decisionId: "dx", optionIds: ["stemi"] };
    const back = (input: Record<string, unknown>, locale = "en") => actionFromToolInput(c, action, input, locale, s);
    const options = labelledOptions(c, c.decisions[0]!).map((o) => `${o.label} (${t(o.option.text, "en")})`).join("; ");
    expect(back({ decision_id: "dx", option_ids: ["Z"] })).toEqual({ ok: false, detail: `Unknown option(s): Z. Answer by letter — options: ${options}.` });
    expect(back({ decision_id: "dx", option_ids: ["A, C"] })).toEqual({ ok: false, detail: `Unknown option(s): C. Answer by letter — options: ${options}.` });
    expect(back({ decision_id: "dx", option_ids: ["b"] })).toMatchObject({ ok: true });
    expect(back({ decision_id: "dx", option_ids: [","] })).toEqual({ ok: false, detail: `No option given. Answer by letter — options: ${options}.` });
    expect(back({ decision_id: "dx", option_ids: ["A, B"] })).toEqual({ ok: false, detail: "Decision 1 takes a single best answer: answer with one letter." });
    expect(back({ decision_id: "carney", option_ids: ["A"] })).toEqual({ ok: false, detail: "No decision “carney”. Name a decision by its number: 1." });
    expect(back({ decision_id: "dx", option_ids: ["zz", "C"] }, "zh-CN")).toMatchObject({ ok: false, detail: expect.stringMatching(/^未知选项：zz、C。请按字母作答，可选：A（.+）；B（.+）。$/) });
    // A decision still locked: only what it needs, never its options.
    const locked = actionFromToolInput(c, action, { decision_id: "1", option_ids: ["Z"] }, "en", reduce(c, createEngineState(c), { type: "start" }).state);
    expect(locked).toEqual({ ok: false, detail: "Decision 1 is not yet answerable: Review the ECG first." });
  });
});

describe("a learner's answer through PreToolUse hooks (session)", () => {
  /** A session over `c` in strict mode whose PreToolUse hook rewrites answer_decision input with `rewrite`. */
  async function hooked(c: CaseDefinition, rewrite: (input: Record<string, unknown>) => Record<string, unknown> | undefined) {
    const t = await makeSession({ caseDef: c, settingsPatch: { approvalMode: "strict" } });
    const approvals: string[] = [];
    t.session.subscribe((e) => {
      if (e.msg.type !== "approval_request") return;
      approvals.push(e.msg.summary);
      t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
    });
    t.session.hooks.on("PreToolUse", (input) => {
      if (input.hook_event_name !== "PreToolUse" || input.tool_name !== "answer_decision") return;
      const updatedInput = rewrite(input.tool_input as Record<string, unknown>);
      return updatedInput ? { updatedInput } : undefined;
    });
    for (const action of [{ type: "order", investigationId: "ecg" }, { type: "advance-time", minutes: 10 }, { type: "read", investigationId: "ecg" }] as ClinicalAction[]) {
      await t.session.run({ type: "clinical_action", action });
    }
    approvals.length = 0;
    return { t, approvals };
  }

  it("a hook that returns the input unchanged does not turn an unknown option id into an answer", async () => {
    const { t, approvals } = await hooked(loadMiniCase(), (input) => ({ ...input }));
    const events = await t.session.run({ type: "clinical_action", action: { type: "answer", decisionId: "dx", optionIds: ["b"] } });
    // Refused before the hooks and the gate: no approval of "B" (Inferior STEMI) for an answer the engine would refuse.
    expect(approvals).toEqual([]);
    expect(msgsOf(events, "error")).toEqual([expect.objectContaining({ code: "invalid_action", message: expect.stringMatching(/^Invalid clinical action: Unknown option\(s\): b\. Answer by letter — options: A \(.+\); B \(.+\)\.$/) })]);
    expect(t.session.state.attempts).toEqual([]);
  });

  it("an action naming a decision or option id its case lacks is refused before the hooks and the gate — never read as a number or letter", async () => {
    let hookCalls = 0;
    const { t, approvals } = await hooked(loadMiniCase(), () => void hookCalls++);
    const refusal = async (action: ClinicalAction, session = t.session) => {
      const events = await session.run({ type: "clinical_action", action });
      const errors = msgsOf(events, "error");
      expect(errors.map((e) => e.code), JSON.stringify(action)).toEqual(["invalid_action"]);
      return errors[0]!.message;
    };
    // The review's cases: an option by its number or letter, the decision by its number — all read as ids.
    expect(await refusal({ type: "answer", decisionId: "dx", optionIds: ["2"] })).toMatch(/^Invalid clinical action: Unknown option\(s\): 2\. Answer by letter — options: A \(.+\); B \(.+\)\.$/);
    expect(await refusal({ type: "answer", decisionId: "dx", optionIds: ["stemi", "B", "B"] })).toMatch(/Unknown option\(s\): B\. Answer by letter/);
    for (const decisionId of ["1", "D1", "carney"]) expect(await refusal({ type: "answer", decisionId, optionIds: ["stemi"] })).toBe(`Invalid clinical action: No decision “${decisionId}”. Name a decision by its number: 1.`);
    expect(hookCalls).toBe(0);
    expect(approvals).toEqual([]);
    expect(t.session.state.attempts).toEqual([]);
    const zh = await makeSession({ settingsPatch: { locale: "zh-CN" } });
    expect(await refusal({ type: "answer", decisionId: "1", optionIds: ["stemi"] }, zh.session)).toBe("无效的临床操作：没有决策“1”。请用决策编号指明：1。");
    // The action's own ids still answer, through the hooks and the gate.
    await t.session.run({ type: "clinical_action", action: { type: "answer", decisionId: "dx", optionIds: ["stemi"] } });
    expect(hookCalls).toBe(1);
    expect(approvals).toHaveLength(1);
    expect(t.session.state.attempts).toEqual([expect.objectContaining({ decisionId: "dx", optionIds: ["stemi"], correct: true })]);
  });

  it("an unknown option id on a decision still locked is refused with what it needs, never its options", async () => {
    const t = await makeSession({ settingsPatch: { approvalMode: "strict" } });
    const events = await t.session.run({ type: "clinical_action", action: { type: "answer", decisionId: "dx", optionIds: ["b"] } });
    expect(msgsOf(events, "approval_request")).toEqual([]);
    expect(msgsOf(events, "error")).toEqual([expect.objectContaining({ code: "invalid_action", message: "Invalid clinical action: Decision 1 is not yet answerable: Review the ECG first." })]);
  });

  it("a token naming no option is refused with invalid_action and the letters — before any approval", async () => {
    const { t, approvals } = await hooked(loadMiniCase(), (input) => ({ ...input, option_ids: ["Z"] }));
    const events = await t.session.run({ type: "clinical_action", action: { type: "answer", decisionId: "dx", optionIds: ["stemi"] } });
    expect(approvals).toEqual([]);
    expect(msgsOf(events, "error")[0]).toMatchObject({ code: "invalid_action", message: expect.stringMatching(/Unknown option\(s\): Z\. Answer by letter — options: A \(.+\); B \(.+\)\./) });
    expect(t.session.state.attempts).toEqual([]);
  });

  it("\"A, C\" from a hook answers A and C, as on the model path and /answer", async () => {
    const c = letteredCase("multiple");
    const { t } = await hooked(c, (input) => ({ ...input, option_ids: ["A, C"] }));
    await t.session.run({ type: "clinical_action", action: { type: "answer", decisionId: "dx", optionIds: ["b"] } });
    const idOf = (letter: string) => labelledOptions(c, c.decisions[0]!).find((o) => o.label === letter)!.option.id;
    expect(t.session.state.attempts.map((a) => a.optionIds)).toEqual([[idOf("A"), idOf("C")]]);
  });
});

describe("the demonstration answers by letter (stepForAction)", () => {
  it("passes the letters of one-letter ids presented under other letters, and the walkthrough records the authored answer", async () => {
    for (const kind of ["single", "multiple"] as const) {
      const c = letteredCase(kind);
      const solution = kind === "multiple" ? ["a", "c"] : ["a"];
      const step = stepForAction(c, { type: "answer", decisionId: "dx", optionIds: solution }, "en");
      expect(step).toMatchObject({ kind: "tool", tool: "answer_decision", args: { decision_id: "dx", option_ids: solution.map((id) => letterOf(c, id)) } });
      expect(solution.map((id) => letterOf(c, id))).not.toEqual(solution.map((id) => id.toUpperCase()));
      // The offline demonstration runs those steps through the tool: it records the authored options, right first time.
      const t = await makeSession({ caseDef: c });
      await t.session.run({ type: "autopilot" });
      expect(t.session.state.attempts, kind).toEqual([expect.objectContaining({ decisionId: "dx", optionIds: solution, correct: true })]);
    }
  });
});
