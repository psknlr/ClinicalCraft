/**
 * Custom slash commands addressed to the examiner or the attending send their
 * expanded prompt to that agent's model instead of triggering an assessment;
 * mid-case the examiner never sees (so cannot reveal) the debrief, rubric
 * texts or judge guidance (C8). Also: a learner `set-phase` to an automatic
 * phase gets the "not switchable" wording (C4).
 */
import { describe, expect, it } from "vitest";
import type { SlashCommand } from "../agents/types.js";
import { loadMiniCase, makeSession } from "../__fixtures__/harness.js";
import { textScript } from "../providers/scripted.js";
import type { ChatRequest } from "../providers/types.js";

const OSCE: SlashCommand = {
  name: "osce-checklist",
  description: "Which domains have I not covered?",
  source: "project",
  agent: "examiner",
  template: "Without revealing any facts I have not elicited, list the history and examination domains I have not yet covered. $ARGUMENTS",
};
const DIFF: SlashCommand = { name: "differential", description: "Challenge my differential", source: "project", agent: "attending", template: "My differential is: $ARGUMENTS. Challenge it." };

/** Everything the model was given for a request (system + messages). */
function requestText(r: ChatRequest): string {
  return [...r.system.map((s) => s.text), ...r.messages.flatMap((m) => m.content.map((p) => (p.type === "text" ? p.text : "")))].join("\n");
}

const SOLUTION = [
  { type: "start" },
  { type: "ask", itemId: "onset", via: "button" },
  { type: "ask", itemId: "character", via: "button" },
  { type: "order", investigationId: "ecg" },
  { type: "advance-time", minutes: 5 },
  { type: "read", investigationId: "ecg" },
  { type: "answer", decisionId: "dx", optionIds: ["stemi"] },
] as const;

describe("custom commands addressed to the examiner (C8)", () => {
  it("offline: says a language model is needed and runs no assessment", async () => {
    const t = await makeSession({ commands: [OSCE] });
    await t.session.run({ type: "slash_command", name: "osce-checklist", args: "" });
    const out = t.msgs("command_output").at(-1)!;
    expect(out.data).toMatchObject({ error: "needs-model", agent: "examiner" });
    expect(t.msgs("assessment")).toHaveLength(0);
  });

  it("with a model: the examiner answers the prompt (no assessment), seeing no debrief, rubric or guidance mid-case", async () => {
    const t = await makeSession({ commands: [OSCE], scripts: [textScript("You have not yet covered the social history or a cardiovascular examination.")] });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "clinical_action", action: { type: "ask", itemId: "onset", via: "button" } });
    await t.session.run({ type: "slash_command", name: "osce-checklist", args: "Be brief." });

    expect(t.msgs("assessment")).toHaveLength(0);
    const reply = t.msgs("agent_message").filter((m) => m.agent === "examiner");
    expect(reply.map((m) => m.text)).toEqual(["You have not yet covered the social history or a cardiovascular examination."]);
    expect(t.provider!.requests).toHaveLength(1);
    const req = t.provider!.requests[0]!;
    expect(req.responseFormat).toBeUndefined(); // prose, not a verdict
    const text = requestText(req);
    expect(text).toContain("list the history and examination domains I have not yet covered. Be brief.");
    expect(text).toContain("<encounter_status>in progress</encounter_status>");
    expect(text).toContain("History topics asked so far: presenting-complaint.");
    expect(text).toContain("About two hours ago"); // the transcript the learner already has
    // Need-to-know: nothing the learner has not earned.
    const c = loadMiniCase();
    for (const secret of [
      "Inferior STEMI",
      "下壁STEMI",
      "Typical pain plus inferior ST elevation",
      "ECG within 10 minutes",
      "Explains the heart's blood supply problem",
      "Establishes onset and character",
      "<debrief>",
      "Like a heavy weight", // an answer not yet elicited
    ]) {
      expect(text, secret).not.toContain(secret);
    }
    expect(c.debrief.conclusion).toBeTruthy();
  });

  it("after finish the examiner may discuss the authored debrief", async () => {
    const t = await makeSession({ commands: [OSCE], scripts: [textScript("Well done.")] });
    for (const action of SOLUTION) await t.session.run({ type: "clinical_action", action: { ...action } as never });
    await t.session.run({ type: "clinical_action", action: { type: "finish" } });
    expect(t.session.state.finished).toBe(true);
    await t.session.run({ type: "slash_command", name: "osce-checklist", args: "" });
    const text = requestText(t.provider!.requests[0]!);
    expect(text).toContain("<encounter_status>finished</encounter_status>");
    expect(text).toContain("<debrief>");
    expect(text).toContain("Inferior STEMI.");
    expect(t.msgs("assessment")).toHaveLength(0);
  });

  it("a plain message to the examiner still runs the assessment", async () => {
    const t = await makeSession();
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "user_message", text: "how am I doing?", to: "examiner" });
    expect(t.msgs("assessment")).toHaveLength(1);
  });
});

describe("custom commands addressed to the attending (C8)", () => {
  it("offline: needs a model; with a model: the expanded prompt is the attending's message", async () => {
    const off = await makeSession({ commands: [DIFF] });
    await off.session.run({ type: "slash_command", name: "differential", args: "ACS, PE" });
    expect(off.msgs("command_output").at(-1)!.data).toMatchObject({ error: "needs-model", agent: "attending" });

    const t = await makeSession({ commands: [DIFF], scripts: [textScript("What would the ECG add?")] });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "slash_command", name: "differential", args: "ACS, PE" });
    const req = t.provider!.requests[0]!;
    const last = req.messages.at(-1)!;
    expect(last.role).toBe("user");
    expect(last.content.map((p) => (p.type === "text" ? p.text : "")).join("\n")).toContain("My differential is: ACS, PE. Challenge it.");
    expect(t.msgs("agent_message").filter((m) => m.agent === "attending").map((m) => m.text)).toContain("What would the ECG add?");
    expect(t.msgs("assessment")).toHaveLength(0);
    // The attending's prompt never carries the debrief (it does not reveal the diagnosis in this case).
    expect(requestText(req)).not.toContain("Inferior STEMI");
  });
});

describe("set-phase rejection wording (C4)", () => {
  it("a learner set-phase to an automatic phase says it cannot be switched manually", async () => {
    const c = loadMiniCase((input) => {
      (input as unknown as { phases: unknown[] }).phases.push({ id: "cath-lab", label: { "zh-CN": "导管室", en: "Cath lab" }, learnerSwitchable: false, enterWhen: { decided: "dx" } });
    });
    const t = await makeSession({ caseDef: c });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "clinical_action", action: { type: "set-phase", phase: "cath-lab" } });
    const warning = t.msgs("warning").at(-1)!.message;
    expect(warning).toContain("cannot be switched manually");
    expect(warning).not.toContain("Not available in the current phase");
    expect(t.session.state.phase).toBe("ed");
  });
});
