/**
 * Patient transport through the session (review G8, docs/EMBODIED.md §8) and truthful posture (G12): the
 * `transport_patient` learner tool (and `/transport`), a CT ordered with the patient brought to the scanner
 * (the refusal tells a model which tool to call next), a porter's — or a nurse's — delegated transport, a
 * transfer or a phase with a location relocating the patient (an output line and a notification; nothing
 * charged), no such place in the facility, the posture an intervention authors, delegation sentences in words.
 */
import { describe, expect, it } from "vitest";
import { type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type NavGoal, type WorldActionResult } from "@clinicalcraft/world";
import { builtinContent, command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { makeSession, msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { catalogsFor } from "../node/bootstrap.js";
import { isLearnerTool } from "../tools/learner.js";
import { DELEGATION_TASKS, WORLD_TOOL_NAMES } from "../tools/world.js";
import { MemoryTranscript } from "../transcript.js";
import { delegationText } from "./embodied.js";

const content = await builtinContent();

async function walk(t: TestSession, goal: NavGoal): Promise<WorldActionResult> {
  const events = await t.session.run({ type: "world_action", request: { actionId: `wa-${Math.random().toString(36).slice(2)}`, actorId: PRIMARY_ACTOR, operation: "navigate", goal } });
  return msgsOf(events, "world_action_result")[0]!.result;
}

const travel = (transcript: MemoryTranscript) =>
  transcript
    .ofType("action")
    .map((i) => i.payload.action)
    .filter((a): a is Extract<ClinicalAction, { type: "advance-time" }> => a.type === "advance-time" && a.reason === "travel");

/** A session of a case in the teaching hospital (a porter; the lift). */
async function teaching(caseDef: CaseDefinition, settingsPatch: Record<string, unknown> = {}): Promise<TestSession> {
  const facility = content.facilities.get("teaching-hospital")!.def;
  return makeSession({ caseDef, facility, catalogs: catalogsFor(content, facility), settingsPatch: { embodiment: "embodied", approvalMode: "bypass", ...settingsPatch } });
}

describe("transport_patient: a learner tool", () => {
  it("is a world tool and a learner tool, with its delegation task", async () => {
    expect(WORLD_TOOL_NAMES).toContain("transport_patient");
    expect(isLearnerTool("transport_patient")).toBe(true);
    expect(DELEGATION_TASKS).toContain("transport_patient");
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop" });
    const tool = t.session.tool("transport_patient")!;
    expect(tool.inputSchema).toMatchObject({ type: "object", properties: { destination: { type: "string" } } });
    expect(tool.readOnly).toBe(false);
    await t.session.close();
  });
});

describe("a CTPA: the patient taken to the scanner and back (PE, general hospital)", () => {
  it("refused in the ward with the way (and the tool) to bring the patient; wheeled there (travel charged once), ordered at the scanner, wheeled back", async () => {
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", transcript, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    const refused = await command(t, "order", "ctpa");
    expect(refused.ok).toBe(false);
    // the learner sentence has no tool id; the model line says what to call there
    expect(refused.text).toMatch(/take the patient there/i);
    expect(refused.text).toMatch(/transport_patient \{"destination":"eq:ct-scanner"\}/);
    // away from the patient: refused with the way to them
    const away = await command(t, "transport", "eq:ct-scanner");
    expect(away.ok).toBe(false);
    expect(w.patientPlace()).toMatchObject({ slot: "ward-1" });
    expect((await walk(t, { kind: "interact", id: "patient:ward-1" })).status).toBe("completed");
    const before = travel(transcript).length;
    const there = await command(t, "transport", "eq:ct-scanner");
    expect(there.ok, there.text).toBe(true);
    expect(there.text).toMatch(/CT/);
    expect(travel(transcript).length).toBe(before + 1);
    expect(w.patientPlace()).toMatchObject({ provider: "eq:ct-scanner", posture: "lying", trolley: "eq:ward-bed-1" });
    const ordered = await command(t, "order", "ctpa");
    expect(ordered.ok, ordered.text).toBe(true);
    const back = await command(t, "transport", "home");
    expect(back.ok, back.text).toBe(true);
    expect(w.patientPlace()).toMatchObject({ slot: "ward-1", provider: null });
    // the patient's monitor follows the patient
    expect(w.patientMonitor()).toBe("eq:ward-monitor-1");
    await t.session.close();
  });

  it("zh-CN: the same flow in Chinese — no raw ids in the learner sentences", async () => {
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", settingsPatch: { approvalMode: "bypass", locale: "zh-CN" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await walk(t, { kind: "interact", id: "patient:ward-1" });
    const there = await command(t, "transport", "eq:ct-scanner");
    expect(there.ok, there.text).toBe(true);
    expect(there.text).toMatch(/[一-鿿]/);
    expect(there.text.split("\n")[0]).not.toMatch(/eq:[a-z]|patient:[a-z0-9]|transport_patient/);
    await t.session.close();
  });
});

describe("delegate_task transport_patient (teaching hospital: a porter)", () => {
  it("the porter wheels the patient to CT (by the lift if needed); a nurse brings them back; the front desk may not", async () => {
    const stemi = content.cases.get("stemi-inferior-rv")!.def;
    const t = await teaching(stemi);
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    const out = await command(t, "delegate", "porter transport_patient eq:ct.scanner");
    expect(out.ok, out.text).toBe(true);
    expect(w.patientPlace()).toMatchObject({ provider: "eq:ct.scanner" });
    const result = out.data.delegation;
    expect(result).toMatchObject({ staffId: "staff:porter", task: "transport_patient", status: "completed" });
    expect(result.steps.map((s: { operation: string }) => s.operation)).toContain("transport_patient");
    // in words: the operation and the entities by name, never their ids
    expect(out.text).toMatch(/Transport the patient/);
    expect(out.text).not.toMatch(/\b(navigate|transport_patient)\b|eq:[a-z]|patient:[a-z0-9]|staff:[a-z]/);
    const nurse = await command(t, "delegate", "nurse transport_patient home");
    expect(nurse.ok, nurse.text).toBe(true);
    expect(w.patientPlace()).toMatchObject({ slot: "resus-1.slot" });
    const desk = await command(t, "delegate", "receptionist transport_patient eq:ct.scanner");
    expect(desk.ok).toBe(false);
    expect(desk.data.delegation).toMatchObject({ message: "not-authorized" });
    expect(w.patientPlace()).toMatchObject({ slot: "resus-1.slot" });
    await t.session.close();
  });
});

describe("relocation by a transfer or a phase (the team moves the patient)", () => {
  it("STEMI transfer to the cath lab: on the cath-lab table, the output and a notification say so, nothing charged for it", async () => {
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ transcript, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const before = travel(transcript).length;
    const events = await t.session.run({ type: "slash_command", name: "give", args: "transfer-cath-lab" });
    const out = msgsOf(events, "command_output")[0]!;
    expect(out.text).toMatch(/has been moved to/);
    expect(msgsOf(events, "notification").some((n) => /has been moved to/.test(n.body))).toBe(true);
    expect(t.session.world()!.patientPlace()).toMatchObject({ provider: "eq:cathlab-c-arm", support: "eq:cathlab-table", posture: "lying" });
    expect(travel(transcript).length).toBe(before);
    // where the patient is now is written to the transcript (a resume restores it)
    const last = transcript.ofType("world").at(-1)!.payload.snapshot as { entities: Record<string, { patient?: unknown }> };
    expect(last.entities["patient:resus-1"]?.patient).toBeDefined();
    await t.session.close();
  });

  it("no such place in the facility: the patient stays, and the output says so (both languages)", async () => {
    const stemi = structuredClone(content.cases.get("stemi-inferior-rv")!.def);
    stemi.interventions.find((i) => i.id === "transfer-cath-lab")!.destination = { capability: "mri" };
    stemi.phases.forEach((p) => delete p.location);
    for (const locale of ["en", "zh-CN"]) {
      const t = await teaching(stemi, { locale });
      await t.session.run({ type: "clinical_action", action: { type: "start" } });
      const events = await t.session.run({ type: "slash_command", name: "give", args: "transfer-cath-lab" });
      const out = msgsOf(events, "command_output")[0]!;
      expect(out.text).toMatch(locale === "en" ? /has no .*stays in/ : /留在/);
      expect(t.session.world()!.patientPlace()).toMatchObject({ slot: "resus-1.slot" });
      await t.session.close();
    }
  });

  it("anaphylaxis: lying flat changes the posture a bystander sees; the transfer's phase brings her into the ED", async () => {
    const t = await makeEmbodiedSession({ caseId: "anaphylaxis-garden", settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    const patient = "patient:garden-bench";
    await walk(t, { kind: "interact", id: patient });
    expect(w.inspect(PRIMARY_ACTOR, patient)!.cues?.posture).toBe("sitting");
    const events = await t.session.run({ type: "slash_command", name: "give", args: "position-supine-legs" });
    expect(msgsOf(events, "command_output")[0]!.text).not.toMatch(/Not here/);
    expect(w.inspect(PRIMARY_ACTOR, patient)!.cues?.posture).toBe("lying");
    expect(msgsOf(events, "world_event").some((e) => e.event.type === "patient.posture")).toBe(true);
    await t.session.run({ type: "slash_command", name: "give", args: "adrenaline-im" });
    await t.session.run({ type: "slash_command", name: "give", args: "transfer-ed" });
    expect(t.session.state.phase).toBe("ed-resus");
    expect(w.patientPlace()).toMatchObject({ slot: "resus-1", posture: "lying" });
    await t.session.close();
  });
});

describe("delegation sentences (extra review item 5)", () => {
  it("steps by operation name and the entity's name in the reader's language", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    const w = t.session.world()!;
    const result = {
      staffId: "staff:ed-nurse",
      role: "nurse",
      task: "attach_monitor",
      status: "completed" as const,
      steps: [
        { operation: "navigate", target: "patient:resus-1", status: "completed" as const, message: "" },
        { operation: "attach", target: "eq:resus1-monitor", status: "completed" as const, message: "" },
      ],
      elapsedSeconds: 12,
      clockMinutes: 0.2,
      distance: 9,
    };
    const en = delegationText(result, "en", w);
    expect(en).not.toMatch(/\bnavigate\b|eq:[a-z]|patient:[a-z0-9]|staff:[a-z]/);
    expect(en).toMatch(/Attach/);
    const zh = delegationText(result, "zh-CN", w);
    expect(zh).not.toMatch(/\b(navigate|attach)\b|eq:[a-z]|patient:[a-z0-9]/);
    await t.session.close();
  });
});
