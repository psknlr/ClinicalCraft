/**
 * Patient transport through the session (review G8, docs/EMBODIED.md §8) and truthful posture (G12): the
 * `transport_patient` learner tool (and `/transport`), a CT ordered with the patient brought to the scanner
 * (the refusal tells a model which tool to call next), a porter's — or a nurse's — delegated transport, a
 * transfer or a phase with a location relocating the patient (an output line and a notification; nothing
 * charged), no such place in the facility, the posture an intervention authors, delegation sentences in words.
 */
import { describe, expect, it } from "vitest";
import { assess, evaluate, type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
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
  it("ordered at the bedside — not done until she is on the scanner (audit P1-7); wheeled there (travel charged once): done on arrival; wheeled back", async () => {
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", transcript, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    // away from the patient: refused with the way to them
    const away = await command(t, "transport", "eq:ct-scanner");
    expect(away.ok).toBe(false);
    expect(w.patientPlace()).toMatchObject({ slot: "ward-1" });
    expect((await walk(t, { kind: "interact", id: "patient:ward-1" })).status).toBe("completed");
    // ordered from the ward: recorded with its device, not done — the learner sentence has no tool id, the model line
    // says what to call there
    const ordered = await command(t, "order", "ctpa");
    expect(ordered.ok, ordered.text).toBe(true);
    expect(ordered.text.split("\n")[0]).toMatch(/Not done yet — the patient must go to a CT scanner/);
    expect(ordered.text.split("\n")[0]).not.toMatch(/transport_patient|eq:/);
    expect(ordered.text).toMatch(/transport_patient \{"destination":"eq:ct-scanner"\}/);
    const order = () => t.session.state.orders.find((o) => o.investigationId === "ctpa")!;
    expect(order()).toMatchObject({ modality: ["ct"], by: "learner" });
    expect(order().acquired).toBeUndefined();
    const listed = await command(t, "results");
    expect(listed.text).toMatch(/ordered — the patient must go to a CT scanner/);
    const before = travel(transcript).length;
    const there = await command(t, "transport", "eq:ct-scanner");
    expect(there.ok, there.text).toBe(true);
    expect(there.text).toMatch(/CT/);
    expect(travel(transcript).length).toBe(before + 1);
    expect(w.patientPlace()).toMatchObject({ provider: "eq:ct-scanner", posture: "lying", trolley: "eq:ward-bed-1" });
    // done on arrival, by the department, at the scanner: the result's clock starts there
    expect(order().acquired).toMatchObject({ at: t.session.state.clock, collector: "radiographer", where: "eq:ct-scanner" });
    expect(order().readyAt).toBe(order().acquired!.at + t.session.caseDef.investigations.find((i) => i.id === "ctpa")!.turnaroundMinutes);
    const acquire = transcript.ofType("action").map((i) => i.payload.action).find((a) => a.type === "acquire");
    expect(acquire).toMatchObject({ type: "acquire", investigationId: "ctpa", by: "system" });
    const back = await command(t, "transport", "home");
    expect(back.ok, back.text).toBe(true);
    expect(w.patientPlace()).toMatchObject({ slot: "ward-1", provider: null });
    // the patient's monitor follows the patient
    expect(w.patientMonitor()).toBe("eq:ward-monitor-1");
    // a learner never enters an acquisition
    const typed = await t.session.run({ type: "clinical_action", action: { type: "acquire", investigationId: "ctpa" } });
    expect(msgsOf(typed, "error")[0]).toMatchObject({ code: "permission_denied" });
    await t.session.close();
  });

  it("ordered with the patient already on the scanner: done at once; text mode keeps the acquisition implied at the order", async () => {
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await walk(t, { kind: "interact", id: "patient:ward-1" });
    expect((await command(t, "transport", "eq:ct-scanner")).ok).toBe(true);
    const ordered = await command(t, "order", "ctpa");
    expect(ordered.ok, ordered.text).toBe(true);
    // done as the order arrives — she is on the table: at the order's minute, released a turnaround later (as an order
    // in text mode)
    const o = t.session.state.orders.find((x) => x.investigationId === "ctpa")!;
    expect(o.acquired).toMatchObject({ at: o.orderedAt, where: "eq:ct-scanner", collector: "radiographer" });
    expect(o.acquired!.seq).toBe(o.seq! + 1);
    expect(o.readyAt).toBe(o.orderedAt + t.session.caseDef.investigations.find((i) => i.id === "ctpa")!.turnaroundMinutes);
    await t.session.close();
    const text = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", clinical: true, settingsPatch: { approvalMode: "bypass" } });
    await text.session.run({ type: "clinical_action", action: { type: "start" } });
    expect((await command(text, "order", "ctpa")).ok).toBe(true);
    const implied = text.session.state.orders.find((x) => x.investigationId === "ctpa")!;
    expect(implied.modality).toBeUndefined();
    expect(implied.acquired).toMatchObject({ implied: true, at: implied.orderedAt });
    await text.session.close();
  });

  it("the audit's replay (P1-7): ordered at minute 1, neither done nor released at minute 30 on the ward; then each stage recorded, in order", async () => {
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", settingsPatch: { approvalMode: "bypass" } });
    const c = t.session.caseDef;
    const w = t.session.world()!;
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    expect((await walk(t, { kind: "interact", id: "patient:ward-1" })).status).toBe("completed");
    await t.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 1 - t.session.state.clock } });
    expect(t.session.state.clock).toBe(1);
    expect((await command(t, "order", "ctpa")).ok).toBe(true);
    const order = () => t.session.state.orders.find((o) => o.investigationId === "ctpa")!;
    expect(order()).toMatchObject({ orderedAt: 1, by: "learner", modality: ["ct"] });
    expect((await command(t, "give", "monitoring")).ok).toBe(true);
    // the patient stays on the ward: at minute 30 nothing is done, nothing released, nothing to read at the console
    await t.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 30 - t.session.state.clock } });
    expect(t.session.state.clock).toBe(30);
    expect(w.patientPlace()).toMatchObject({ slot: "ward-1" });
    expect(order().acquired).toBeUndefined();
    expect(order().readyAt).toBeUndefined();
    expect((await command(t, "results")).text).toMatch(/ordered — the patient must go to a CT scanner/);
    // read at the bedside: the study is not done — said there, never "go to the console" (re-review)
    const early = await command(t, "read", "ctpa");
    expect(early.ok).toBe(false);
    expect(early.text).toMatch(/has been ordered but not done: the patient must go to a CT scanner/);
    expect(early.text).not.toMatch(/Radiology Order & Reading Console/);
    expect((await walk(t, { kind: "interact", id: "eq:radiology-console" })).status).toBe("completed");
    const read = await command(t, "read", "ctpa");
    expect(read.ok).toBe(false);
    expect(read.text).toMatch(/has been ordered but not done: the patient must go to a CT scanner/);
    expect(w.patientPlace()).toMatchObject({ slot: "ward-1" });
    expect(order().acquired).toBeUndefined();
    const report = assess(c, t.session.state).investigations;
    expect(report.essentialMissing).toContain("ctpa");
    expect(report.notAcquired).toEqual(["ctpa@ward"]);
    expect(evaluate(c, t.session.state, { ordered: "ctpa" })).toBe(false);
    // there and back with the portable monitor at the bedside: done on arrival, released a turnaround later
    expect((await walk(t, { kind: "interact", id: "patient:ward-1" })).status).toBe("completed");
    expect((await command(t, "transport", "eq:ct-scanner monitor")).ok).toBe(true);
    const there = w.snapshot().entities["patient:ward-1"]?.patient?.legs?.at(-1);
    expect(there).toMatchObject({ by: PRIMARY_ACTOR, role: "clinician", to: { provider: "eq:ct-scanner" }, monitor: "eq:ward-defibrillator", status: "arrived" });
    expect(order().acquired).toMatchObject({ at: there!.arrivedAt, collector: "radiographer", where: "eq:ct-scanner" });
    expect(order().readyAt).toBe(there!.arrivedAt + c.investigations.find((i) => i.id === "ctpa")!.turnaroundMinutes);
    expect((await command(t, "transport", "home monitor")).ok).toBe(true);
    expect(w.patientPlace()).toMatchObject({ slot: "ward-1" });
    // the review at the console once released, then the resulting action
    await t.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: order().readyAt! - t.session.state.clock } });
    expect((await walk(t, { kind: "interact", id: "eq:radiology-console" })).status).toBe("completed");
    expect((await command(t, "read", "ctpa")).ok).toBe(true);
    expect((await command(t, "give", "consult-pert")).ok).toBe(true);
    const o = order();
    expect(o.reviewed).toMatchObject({ by: "learner" });
    expect(o.next).toMatchObject({ type: "intervene", id: "consult-pert" });
    const stages = [o.orderedAt, there!.departedAt, there!.arrivedAt, o.acquired!.at, o.readyAt!, o.reviewed!.at, o.next!.at];
    expect([...stages].sort((a, b) => a - b)).toEqual(stages);
    expect(o.readyAt! - o.acquired!.at).toBe(30);
    const seqs = [o.seq!, o.acquired!.seq, o.reviewed!.seq, o.next!.seq];
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
    await t.session.close();
  });

  it("a caller's modality is never taken: text mode records none, in-world the world's (re-review); a team relay is never a learner's", async () => {
    const text = await makeSession({ caseDef: (await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop" })).session.caseDef, settingsPatch: { approvalMode: "bypass" } });
    await text.session.run({ type: "clinical_action", action: { type: "start" } });
    await text.session.run({ type: "clinical_action", action: { type: "order", investigationId: "ctpa", modality: ["ct"] } });
    const plain = text.session.state.orders.find((o) => o.investigationId === "ctpa")!;
    expect(plain.modality).toBeUndefined();
    expect(plain.readyAt).toBeDefined();
    await text.session.close();
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await walk(t, { kind: "interact", id: "patient:ward-1" });
    await t.session.run({ type: "clinical_action", action: { type: "order", investigationId: "ctpa", modality: ["mri"] } });
    expect(t.session.state.orders.find((o) => o.investigationId === "ctpa")!.modality).toEqual(["ct"]);
    // what a colleague passed on is the session's to record
    const item = t.session.caseDef.history[0]!.id;
    const relay = await t.session.run({ type: "clinical_action", action: { type: "ask", itemId: item, via: "team" } });
    expect(msgsOf(relay, "error")[0]).toMatchObject({ code: "permission_denied" });
    expect(t.session.state.asked).not.toContain(item);
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

describe("saved in the middle of a transport (the engineering recommendations: the porter's journey)", () => {
  /** A mover that takes `ms` per walk, so a save can fall in the middle of one. */
  const slow = (ms: number) => ({
    async move(_actor: string, plan: { target: { x: number; z: number; level: string; y: number; yaw: number; pitch: number } }, signal?: AbortSignal) {
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, ms / 10));
        if (signal?.aborted) return { arrived: false, pose: { ...plan.target }, replans: 0 };
      }
      return { arrived: true, pose: { ...plan.target }, replans: 0 };
    },
  });

  it("on reload the patient, the porter, the trolley and the destination agree, and the journey is carried out once — one transfer, travel charged once", async () => {
    const stemi = content.cases.get("stemi-inferior-rv")!.def;
    const facility = content.facilities.get("teaching-hospital")!.def;
    const base = { caseDef: stemi, facility, catalogs: catalogsFor(content, facility), settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } } as const;
    const t = await makeSession({ ...base, embodied: { mover: slow(400) as never } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    const home = w.patientPlace()!;
    // the porter is sent; the save falls while they wheel the patient
    void t.session.run({ type: "external_tool_call", callId: "porter", tool: "delegate_task", args: { role: "porter", task: "transport_patient", target: "eq:ct.scanner" }, allowBypass: true });
    for (let i = 0; i < 400 && !w.patientPlace()?.transit; i++) await new Promise((r) => setTimeout(r, 5));
    const transit = w.patientPlace()!.transit!;
    expect(transit.by).toBe("staff:porter");
    const saved = JSON.parse(JSON.stringify(t.session.snapshot()));
    expect(saved.world.journey).toMatchObject({ by: "staff:porter", patient: expect.stringMatching(/^patient:/), parameters: expect.objectContaining({}) });
    // the bodies as saved: the patient still in their bed space, the porter at their side (a walk commits when it ends)
    expect(saved.world.entities[saved.world.journey.patient]?.patient?.slot ?? home.slot).toBe(home.slot);
    const clockAtSave = saved.state?.clock ?? null;
    await t.session.close();

    const transcript = new MemoryTranscript();
    const r = await makeSession({ ...base, transcript, resume: { sessionId: saved.sessionId, actions: saved.actions, messages: saved.messages, dialogue: saved.dialogue }, embodied: { snapshot: saved.world, team: saved.team } });
    const done = await r.session.resumedJourney();
    expect(done?.status, done?.message).toBe("completed");
    const rw = r.session.world()!;
    expect(rw.patientPlace()).toMatchObject({ provider: "eq:ct.scanner", trolley: transit.trolley ?? expect.anything() });
    expect(rw.roomOf("staff:porter")).toBe(rw.roomOf("eq:ct.scanner"));
    // one transfer: the patient moved once, and the walk charged once (nothing was charged for the walk the save cut short)
    expect(travel(transcript)).toHaveLength(1);
    if (clockAtSave != null) expect(r.session.state.clock).toBeGreaterThan(clockAtSave);
    // the journey is not carried out twice (a second look finds none)
    expect(rw.restoredJourney()).toBeNull();
    await r.session.close();
  });
});
