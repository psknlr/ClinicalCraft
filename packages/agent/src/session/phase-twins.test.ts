/**
 * History phase twins (`history[].supersedes`) in the agent runtime: the
 * patient pipeline, `list_options`/`/ask`, `reveal_facts` and `ask_patient`
 * resolution answer with the twin of the current phase, and asking it
 * credits the original without revealing it (docs/CASE_AUTHORING.md §3).
 * Also: order warnings with an `unless` condition (C1).
 */
import { assess, evaluate, type CaseDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase, makeSession } from "../__fixtures__/harness.js";
import { npcTools } from "../tools/npc.js";
import type { ToolContext } from "../tools/types.js";
import { actionFromToolInput } from "./action-input.js";
import { selectFacts } from "./patient-pipeline.js";

const L = (zh: string, en: string) => ({ "zh-CN": zh, en });

/** Mini case + a learner-switchable "ward" phase where "character-now" supersedes "character". */
function twinCase(characterPhases: string[] = ["ed"]): CaseDefinition {
  return loadMiniCase((input) => {
    const raw = input as unknown as { phases: unknown[]; history: Record<string, unknown>[]; orderMatching?: unknown };
    raw.phases.push({ id: "ward", label: L("病房", "Ward"), learnerSwitchable: true });
    raw.history.find((h) => h.id === "character")!.phases = characterPhases;
    raw.history.push({
      id: "character-now",
      topic: "pain",
      question: L("现在痛得怎么样？", "How does the pain feel now?"),
      answer: L("现在只是有点闷，不压了。", "Just a dull ache now, the pressure has gone."),
      keywords: { "zh-CN": ["现在痛"], en: ["pain now"] },
      phases: ["ward"],
      supersedes: ["character"],
    });
  });
}

async function onWard(c: CaseDefinition) {
  const t = await makeSession({ caseDef: c });
  await t.session.run({ type: "clinical_action", action: { type: "start" } });
  await t.session.run({ type: "clinical_action", action: { type: "set-phase", phase: "ward" } });
  expect(t.session.state.phase).toBe("ward");
  return t;
}

describe("phase twins in the patient pipeline", () => {
  it("a question about the superseded item is answered by the twin and credits the original", async () => {
    const c = twinCase();
    const t = await onWard(c);
    await t.session.run({ type: "user_message", text: "What does the pain feel like?", to: "patient" });
    const said = t.msgs("agent_message").map((m) => m.text).join("\n");
    expect(said).toContain("Just a dull ache now");
    expect(said).not.toContain("heavy weight");
    const s = t.session.state;
    expect(s.asked).toContain("character-now");
    expect(s.asked).not.toContain("character"); // never revealed
    expect(evaluate(c, s, { asked: "character" })).toBe(true); // …but credited (rubric rb-hx needs it)
    expect(assess(c, s).history.missingRequired).not.toContain("character");
  });

  it("selection never co-selects an item superseded in the current phase", () => {
    const c = twinCase(["ed", "ward"]);
    const s = { phase: "ward", asked: [] as string[] } as unknown as Parameters<typeof selectFacts>[1];
    expect(selectFacts(c, s, "What does the pain feel like now?", "en").selected).toEqual(["character-now"]);
    expect(selectFacts(c, { ...s, phase: "ed" }, "What does the pain feel like?", "en").selected).toEqual(["character"]);
  });

  it("list_options, /ask and ask_patient resolution offer the twin, not the superseded item", async () => {
    const c = twinCase(["ed", "ward"]);
    const t = await onWard(c);
    await t.session.run({ type: "slash_command", name: "ask", args: "" });
    const out = t.msgs("command_output").at(-1)!;
    const ids = (out.data as { items: { id: string }[] }).items.map((i) => i.id);
    expect(ids).toContain("character-now");
    expect(ids).not.toContain("character");
    const mapped = actionFromToolInput(c, { type: "ask", itemId: "character" }, { question: "What does the pain feel like?" }, "en", "ward");
    expect(mapped).toEqual({ ok: true, action: { type: "ask", itemId: "character-now" } });
    // A direct ask of the superseded item is refused by the engine.
    const before = t.session.state.asked.length;
    await t.session.run({ type: "clinical_action", action: { type: "ask", itemId: "character", via: "button" } });
    expect(t.session.state.asked.length).toBe(before);
    expect(t.msgs("warning").at(-1)?.message).toMatch(/phase/i);
  });

  it("reveal_facts reveals the twin for a superseded id", async () => {
    const c = twinCase();
    const t = await onWard(c);
    const reveal = npcTools().find((tool) => tool.name === "reveal_facts")!;
    const dispatched: string[] = [];
    const ctx = {
      caseDef: c,
      locale: "en",
      agent: "patient",
      state: () => t.session.state,
      dispatch: (action: { type: string; itemId?: string }) => {
        dispatched.push(action.itemId ?? action.type);
        return { state: t.session.state, events: [] };
      },
    } as unknown as ToolContext;
    const out = await reveal.run({ fact_ids: ["character"] }, ctx);
    expect(out.ok).toBe(true);
    expect(out.output).toContain("[character-now]");
    expect(out.output).not.toContain("heavy weight");
    expect(dispatched).toEqual(["character-now"]);
  });
});

describe("order warnings with `unless` (order_test tool)", () => {
  it("drops a warning whose condition held when the order was placed", async () => {
    const c = loadMiniCase((input) => {
      (input as unknown as { orderMatching: unknown }).orderMatching = {
        warnings: [{ investigation: "troponin", ifMatches: "poc|bedside", message: L("仅有实验室肌钙蛋白。", "Only a laboratory troponin is recorded."), unless: { read: "ecg" } }],
      };
    });
    const t = await makeSession({ caseDef: c });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "slash_command", name: "order", args: "bedside troponin" });
    expect(t.msgs("command_output").at(-1)!.text).toContain("Only a laboratory troponin is recorded.");
    // Once the ECG has been read the notice no longer applies (a new session: the troponin is already ordered here).
    const u = await makeSession({ caseDef: c });
    await u.session.run({ type: "clinical_action", action: { type: "start" } });
    await u.session.run({ type: "clinical_action", action: { type: "order", investigationId: "ecg" } });
    await u.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 10 } });
    await u.session.run({ type: "clinical_action", action: { type: "read", investigationId: "ecg" } });
    await u.session.run({ type: "slash_command", name: "order", args: "bedside troponin" });
    const text = u.msgs("command_output").at(-1)!.text;
    expect(text).not.toContain("Only a laboratory troponin is recorded.");
  });
});
