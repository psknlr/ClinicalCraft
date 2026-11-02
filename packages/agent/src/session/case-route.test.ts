/**
 * The way through a theatre case, at the tool level (docs/PROTOCOL.md §3.1; the Case 126 audit):
 *
 * - `case_status` names what the current objective still needs, each requirement met or open, with the next action;
 * - a checklist step out of order is reported as INVALID (never "given"); `list_options` does not count it;
 * - `intervene` for the operation itself points at the operative field and names what still opens it;
 *   `observe_field` and `operate` say the same before the operation is under way (with the engine's own reason);
 * - an explicit hold refuses the step for everyone, names who placed it and why; the attending's tools place and
 *   release it in the attending's own name;
 * - `consult {staff}` resolves a named colleague (a case consultant by name) or refuses with who can be asked;
 * - one result status for every role: a record the case does not have is "no result", never "back";
 * - authored corrections: the attending corrects a matched misconception, offline and when a model endorses it;
 * - the same call failing the same way, with nothing changed, is flagged.
 */
import { describe, expect, it } from "vitest";
import { parseCase, type CaseDefinition } from "@clinicalcraft/core";
import { LAP_CHOLE_SIT } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { RepeatedFailures } from "../loop.js";
import { textScript, toolCallScript } from "../providers/scripted.js";
import { makeSession, msgsOf, type TestSession } from "../__fixtures__/harness.js";

const L = (en: string) => ({ en, "zh-CN": en });

function theatreCase(): CaseDefinition {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.phases = [
    { id: "theatre", label: L("Theatre") },
    { id: "operation", label: L("Laparoscopic cholecystectomy"), learnerSwitchable: false, enterWhen: { intervened: "time-out", valid: true } },
  ];
  raw.procedure.phases = ["operation"];
  raw.interventions = [
    { id: "attach-monitor", name: L("Attach the monitor"), kind: "monitoring", maxDoses: 1 },
    { id: "sign-in", name: L("WHO Sign In"), kind: "consult", checklist: true, maxDoses: 1, contraindicatedWhen: { not: { intervened: "attach-monitor" } }, harm: L("Sign In before the monitor.") },
    { id: "induction", name: L("Induction"), kind: "airway", maxDoses: 1, contraindicatedWhen: { not: { intervened: "sign-in", valid: true } } },
    {
      id: "time-out",
      name: L("WHO Time Out"),
      kind: "consult",
      checklist: true,
      maxDoses: 1,
      contraindicatedWhen: { not: { all: [{ intervened: "sign-in", valid: true }, { intervened: "induction" }] } },
      harm: L("Time Out out of order."),
    },
  ];
  raw.investigations = [
    { id: "histology", name: L("Histology"), category: "pathology", turnaroundMinutes: 0, risk: "none", value: "neutral", results: { operation: { text: L("Chronic cholecystitis.") } } },
  ];
  raw.objectives = [
    {
      id: "periop",
      title: L("Checks"),
      hint: L("Monitor, Sign In, induction, Time Out."),
      completeWhen: { all: [{ intervened: "attach-monitor" }, { intervened: "sign-in", valid: true }, { intervened: "induction" }, { intervened: "time-out", valid: true }] },
    },
    ...raw.objectives,
  ];
  const correction = {
    id: "preox",
    misconception: L("EtCO2 shows preoxygenation."),
    match: [["etco2"], ["preoxygen"]],
    say: L("Correction: preoxygenation is judged by end-tidal OXYGEN, not end-tidal CO2."),
    marks: ["end-tidal oxygen"],
  };
  raw.npcs = [
    { role: "nurse", knowledge: L("Theatre nurse.") },
    { role: "attending", knowledge: L("Supervises."), corrections: [correction] },
    { role: "consultant", name: L("Anaesthetist"), knowledge: L("Runs the anaesthetic.") },
  ];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

async function session(scripts?: Parameters<typeof makeSession>[0]["scripts"]): Promise<TestSession> {
  const t = await makeSession({ caseDef: theatreCase(), settingsPatch: { approvalMode: "bypass" }, ...(scripts ? { scripts } : {}) });
  await t.session.run({ type: "clinical_action", action: { type: "start" } });
  return t;
}

let seq = 0;
async function tool(t: TestSession, name: string, args: Record<string, unknown> = {}) {
  const events = await t.session.run({ type: "external_tool_call", callId: `c-${++seq}`, tool: name, args, allowBypass: true });
  return msgsOf(events, "tool_call_end").at(-1) as { ok: boolean; output: string; data?: any };
}

describe("the way through a theatre case", () => {
  it("case_status names what is met, what is open and the next action; an out-of-order step is INVALID, never given", async () => {
    const t = await session();
    const early = await tool(t, "intervene", { intervention_id: "sign-in" });
    expect(early.ok).toBe(false);
    expect(early.output).toMatch(/^Recorded as INVALID — out of order; nothing was applied and it can be repeated in order\. Sign In before the monitor\./);
    expect((await tool(t, "list_options", { kind: "interventions" })).output).toMatch(/\[sign-in\] WHO Sign In\n/);
    await tool(t, "intervene", { intervention_id: "attach-monitor" });
    await tool(t, "intervene", { intervention_id: "sign-in" });
    await tool(t, "intervene", { intervention_id: "induction" });
    const status = (await tool(t, "case_status")).output;
    expect(status).toContain("Now: Checks");
    expect(status).toContain("  ✓ Attach the monitor");
    expect(status).toContain("  ✓ WHO Sign In — a valid attempt, in order");
    expect(status).toContain("  ✓ Induction");
    expect(status).toContain('  · WHO Time Out — a valid attempt, in order\n    → next: intervene {intervention_id: "time-out"}');
    expect(status).toContain("Operation: not under way in this phase.");
    await t.session.close();
  });

  it("the operation asked for as an intervention points at the field; observe_field and operate say what still opens it", async () => {
    const t = await session();
    const asked = await tool(t, "intervene", { query: "laparoscopic cholecystectomy" });
    expect(asked.ok).toBe(false);
    expect(asked.data).toMatchObject({ unresolved: "operation" });
    expect(asked.output).toMatch(/is the operation itself, not an intervention/);
    expect(asked.output).toMatch(/It is not under way yet\. Still needed:\n  · WHO Time Out — a valid attempt, in order\n    → next: intervene/);
    expect((await tool(t, "observe_field")).output).toMatch(/^Operation: not under way in this phase/);
    const op = await tool(t, "operate", { op: "plan-ports", plan: "three-port-left" });
    expect(op.output).toMatch(/Rejected \(phase-locked\): Not available in the current phase\. the operation is not under way in phase "theatre"/);
    expect(op.output).toMatch(/Still needed:\n  · WHO Time Out/);
    // an unrelated free text is still a plain "no match"
    expect((await tool(t, "intervene", { query: "a cup of tea" })).output).toMatch(/^No match for "a cup of tea"/);
    // under way: the operation's own status, and the engine's reasons for a step out of order
    for (const id of ["attach-monitor", "sign-in", "induction", "time-out"]) expect((await tool(t, "intervene", { intervention_id: id })).ok, id).toBe(true);
    expect((await tool(t, "case_status")).output).toMatch(/Operation under way: no port plan yet/);
    expect((await tool(t, "operate", { op: "insert", port: "A", instrument: "laparoscope" })).output).toMatch(/Rejected \([a-z-]+\): .+\. .+/);
    await t.session.close();
  });

  it("a hold placed by the attending (its own tool, its own name) refuses the step; only the attending releases it", async () => {
    const t = await session([
      toolCallScript([{ id: "h1", name: "place_hold", args: { intervention_id: "induction", reason: "Airway not assessed." } }]),
      textScript("Not yet: the airway has not been assessed."),
      toolCallScript([{ id: "h2", name: "release_hold", args: { intervention_id: "induction", reassessment: "Airway assessed: Mallampati II. Proceed." } }]),
      textScript("Cleared."),
    ]);
    for (const id of ["attach-monitor", "sign-in"]) await tool(t, "intervene", { intervention_id: id });
    await t.session.run({ type: "user_message", text: "Can we induce?", to: "attending" });
    expect(t.session.state.holds).toMatchObject([{ interventionId: "induction", placedBy: "attending", reason: "Airway not assessed." }]);
    const refused = await tool(t, "intervene", { intervention_id: "induction" });
    expect(refused.ok).toBe(false);
    expect(refused.output).toBe("Rejected (on-hold): Not done: Induction is on hold — placed by attending: Airway not assessed. Ask attending to reassess; only they can release it.");
    expect((await tool(t, "case_status")).output).toContain("On hold:\n  ⏸ Induction — placed by attending: Airway not assessed.");
    expect(t.session.state.interventions.some((r) => r.interventionId === "induction")).toBe(false);
    await t.session.run({ type: "user_message", text: "The airway is assessed now.", to: "attending" });
    expect(t.session.state.holds?.[0]?.released).toMatchObject({ by: "attending", reassessment: "Airway assessed: Mallampati II. Proceed." });
    expect((await tool(t, "intervene", { intervention_id: "induction" })).ok).toBe(true);
    await t.session.close();
  });

  it("consult names its recipient; a case consultant answers by name; an unknown name is refused, not sent to the nurse", async () => {
    const t = await session();
    const anaesthetist = await tool(t, "consult", { staff: "anaesthetist", question: "Ready?" });
    expect(anaesthetist.output.split("\n")[0]).toBe("To: Anaesthetist (consultant)");
    const nobody = await tool(t, "consult", { staff: "receptionist", question: "Has the family arrived?" });
    expect(nobody.ok).toBe(false);
    expect(nobody.output).toBe("Nobody here answers to “receptionist”. You can ask: Anaesthetist [consultant].");
    expect((await tool(t, "consult", { role: "nurse", question: "Hello" })).output.split("\n")[0]).toBe("To: Nurse");
    await t.session.close();
  });

  it("one result status for every role: a record the case does not have in this phase is never 'back'", async () => {
    const t = await session();
    expect(t.session.dispatch({ type: "order", investigationId: "histology", by: "system" }).rejected).toBeUndefined();
    expect((await tool(t, "case_status")).output).toMatch(/\[histology@theatre\] no record/);
    const nurse = await tool(t, "consult", { role: "nurse", question: "Any results back?" });
    expect(nurse.output).toMatch(/No result for this phase \(nothing will come back\): Histology \(Theatre\)/);
    expect(nurse.output).not.toMatch(/Back and waiting/);
    await t.session.close();
  });

  it("the attending corrects an authored misconception: offline, and when a model endorses it", async () => {
    const wrong = "EtCO2 above 40 means the preoxygenation is adequate, right?";
    const offline = await session();
    expect((await tool(offline, "consult", { role: "attending", question: wrong })).output).toMatch(/Correction: preoxygenation is judged by end-tidal OXYGEN/);
    await offline.session.close();
    const model = await session([textScript("Yes, that's right.")]);
    const events = await model.session.run({ type: "user_message", text: wrong, to: "attending" });
    const said = msgsOf(events, "agent_message").map((m) => m.text);
    expect(said).toEqual(["Yes, that's right.", "Correction: preoxygenation is judged by end-tidal OXYGEN, not end-tidal CO2."]);
    expect(JSON.stringify(model.provider!.requests[0]!.messages)).toContain("<must_correct>");
    // a reply that makes the correction itself gets nothing appended
    const good = await session([textScript("No — judge preoxygenation by end-tidal oxygen.")]);
    const ok = msgsOf(await good.session.run({ type: "user_message", text: wrong, to: "attending" }), "agent_message").map((m) => m.text);
    expect(ok).toEqual(["No — judge preoxygenation by end-tidal oxygen."]);
    await model.session.close();
    await good.session.close();
  });
});

describe("repeated identical failures", () => {
  const call = { id: "c", name: "interact_object", args: { target: "eq:board", operation: "cavity_count" } };
  const failed = { status: "error" as const, output: { ok: false, output: "Too far." } };
  it("count the same call failing the same way with nothing changed; a success, another output or a commit resets it", () => {
    const r = new RepeatedFailures();
    expect(r.note(call, failed, 5)).toBe(1);
    expect(r.note({ ...call, id: "d", args: { operation: "cavity_count", target: "eq:board" } }, failed, 5)).toBe(2);
    expect(r.note(call, failed, 6)).toBe(1);
    expect(r.note(call, { status: "error", output: { ok: false, output: "Other." } }, 6)).toBe(1);
    expect(r.note(call, { status: "ok", output: { ok: true, output: "Done." } }, 6)).toBe(0);
    expect(r.note(call, failed, 6)).toBe(1);
  });
});
