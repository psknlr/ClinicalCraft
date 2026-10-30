/**
 * Talking in the world (docs/EMBODIED.md §6, §8.4; PROTOCOL §4):
 *
 * - free text to the patient (or the companion) is held to the `ask_patient` requirement — from across the
 *   hospital nothing is answered, disclosed or credited; at the bedside the patient answers as before;
 * - movement requests in the learner's words ("follow me", "come with me to the CT", "wait here", "please take
 *   the patient to CT") are world actions on the learner's tool path, narrated from what the world did;
 * - a colleague addressed by name (`user_message.staff`) answers under their own name, with their own
 *   conversation, and the turn's events carry their staff id.
 */
import { describe, expect, it } from "vitest";
import { t as tx } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type NavGoal } from "@clinicalcraft/world";
import { makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { textScript } from "../providers/scripted.js";

async function walk(t: TestSession, goal: NavGoal): Promise<void> {
  const events = await t.session.run({ type: "world_action", request: { actionId: `wa-${Math.random().toString(36).slice(2)}`, actorId: PRIMARY_ACTOR, operation: "navigate", goal } });
  expect(msgsOf(events, "world_action_result")[0]?.result.status).toBe("completed");
}

const say = (t: TestSession, text: string, to = "patient", staff?: string) => t.session.run({ type: "user_message", text, to, ...(staff ? { staff } : {}) });

describe("free text to the patient is a conversation in the room (the ask_patient requirement)", () => {
  it("from the entrance: refused with the way there — no reply, nothing disclosed or credited; at the bedside: answered", async () => {
    const t = await makeEmbodiedSession({ caseId: "smzl-lung-adeno" });
    const c = t.session.caseDef;
    const question = tx(c.history[0]!.question, "en");
    const far = await say(t, question);
    const error = msgsOf(far, "error")[0];
    expect(error?.code).toBe("SPATIAL_REQUIREMENT_UNMET");
    expect(error?.message).toMatch(/navigate_to/);
    expect(msgsOf(far, "agent_message")).toEqual([]);
    expect(t.session.state.asked).toEqual([]);
    expect(t.session.conversationOf("patient")).toEqual([]);
    await walk(t, { kind: "interact", id: "patient" });
    const near = await say(t, question);
    expect(msgsOf(near, "error")).toEqual([]);
    expect(msgsOf(near, "agent_message").some((m) => m.agent === "patient" && m.text.trim())).toBe(true);
    expect(t.session.state.asked.length).toBeGreaterThan(0);
    await t.session.close();
  });

  it("the companion at the patient's side too; the opening approach (an empty message) is no conversation", async () => {
    const t = await makeEmbodiedSession({ caseId: "pediatric-asthma" });
    const far = await say(t, "When did the wheeze start?", "companion");
    expect(msgsOf(far, "error")[0]?.code).toBe("SPATIAL_REQUIREMENT_UNMET");
    const approach = await say(t, "");
    expect(msgsOf(approach, "error")).toEqual([]);
    await t.session.close();
  });

  it("clinical mode has no world: the patient answers wherever the learner is", async () => {
    const t = await makeEmbodiedSession({ caseId: "smzl-lung-adeno", clinical: true });
    const out = await say(t, tx(t.session.caseDef.history[0]!.question, "en"));
    expect(msgsOf(out, "error")).toEqual([]);
    expect(msgsOf(out, "agent_message").length).toBeGreaterThan(0);
    await t.session.close();
  });
});

describe("movement requests in the learner's words", () => {
  it("'Follow me' — the patient walks with the learner (narrated, nothing credited); 'Wait here' — they stay", async () => {
    const t = await makeEmbodiedSession({ caseId: "smzl-lung-adeno" });
    const w = t.session.world()!;
    await walk(t, { kind: "interact", id: "patient" });
    const follow = await say(t, "Please follow me");
    const line = msgsOf(follow, "agent_message")[0];
    expect(line).toMatchObject({ agent: "patient", grounding: "narrated", grounded: [] });
    expect(line?.text).toMatch(/walks with you/);
    expect(w.patientPlace()?.escort).toBe(PRIMARY_ACTOR);
    expect(t.session.state.asked).toEqual([]);
    await walk(t, { kind: "interact", id: "eq:ws-imaging" });
    const me = w.actor(PRIMARY_ACTOR)!;
    expect(Math.hypot(w.patientPlace()!.x - me.pose.x, w.patientPlace()!.z - me.pose.z)).toBeLessThan(1.2);
    const wait = await say(t, "Wait here");
    expect(msgsOf(wait, "agent_message")[0]?.text).toMatch(/waits in/);
    expect(w.patientPlace()?.escort).toBeUndefined();
    await t.session.close();
  });

  it("'Come with me to the CT scanner' — a step to the patient's side, then they walk upright to the CT and lie down on its table", async () => {
    const t = await makeEmbodiedSession({ caseId: "smzl-lung-adeno", settingsPatch: { approvalMode: "bypass" } });
    const w = t.session.world()!;
    // within earshot, not yet at the patient's side
    await walk(t, { kind: "look", id: "patient", range: 2.6 });
    const out = await say(t, "Come with me to the CT scanner, please");
    expect(msgsOf(out, "error")).toEqual([]);
    expect(w.patientPlace()).toMatchObject({ provider: "eq:ct-scanner", posture: "lying" });
    expect(msgsOf(out, "agent_message")[0]).toMatchObject({ grounding: "narrated" });
    // back to bed in Chinese words
    const back = await say(t, "我们回去吧");
    expect(msgsOf(back, "error")).toEqual([]);
    expect(w.patientPlace()).toMatchObject({ slot: "consult-1", posture: "standing" });
    await t.session.close();
  });

  it("a patient who cannot walk is not walked: the world's reason, narrated", async () => {
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop" });
    await walk(t, { kind: "interact", id: "patient" });
    const out = await say(t, "Follow me");
    expect(msgsOf(out, "agent_message")[0]?.text).toMatch(/lying down/);
    expect(t.session.world()!.patientPlace()).toMatchObject({ slot: "ward-1" });
    await t.session.close();
  });

  it("'Please take the patient to CT' to a nurse by name — she says so in her own voice and wheels the patient there", async () => {
    const t = await makeEmbodiedSession({ caseId: "acute-ischemic-stroke", settingsPatch: { approvalMode: "bypass" } });
    const out = await say(t, "Please take the patient to CT", "nurse", "ed-nurse");
    const ack = msgsOf(out, "agent_message")[0];
    expect(ack).toMatchObject({ agent: "nurse", staffId: "ed-nurse" });
    expect(ack?.text).toMatch(/I'll take/);
    const report = msgsOf(out, "command_output").find((m) => m.name === "delegate");
    expect((report?.data as { ok?: boolean } | undefined)?.ok, report?.text).toBe(true);
    expect(t.session.world()!.patientPlace()).toMatchObject({ provider: "eq:ct-scanner", posture: "lying" });
    await t.session.close();
  });

  it("clinical mode: no world, so 'follow me' is talk for the patient to answer", async () => {
    const t = await makeEmbodiedSession({ caseId: "smzl-lung-adeno", clinical: true });
    const out = await say(t, "Follow me");
    expect(msgsOf(out, "agent_message").some((m) => m.grounding !== "narrated")).toBe(true);
    await t.session.close();
  });
});

describe("colleagues by name (user_message.staff)", () => {
  it("two nurses share a profile, never a voice: their own name, their own conversation, their staff id on the events", async () => {
    const t = await makeEmbodiedSession({ caseId: "acute-ischemic-stroke" });
    const f = t.session.facility!;
    const nameOf = (id: string) => tx(f.staff.find((s) => s.id === id)!.name, "en");
    const a = await say(t, "Hello, could you help me?", "nurse", "triage-nurse");
    expect(msgsOf(a, "turn_started")[0]).toMatchObject({ agent: "nurse", staffId: "triage-nurse", speaker: nameOf("triage-nurse") });
    expect(msgsOf(a, "agent_message")[0]).toMatchObject({ speaker: nameOf("triage-nurse"), staffId: "triage-nurse" });
    const b = await say(t, "Hello, could you help me?", "nurse", "staff:ed-nurse");
    expect(msgsOf(b, "agent_message")[0]).toMatchObject({ speaker: nameOf("ed-nurse"), staffId: "ed-nurse" });
    expect(t.session.conversationOf("nurse#triage-nurse").length).toBeGreaterThan(0);
    expect(t.session.conversationOf("nurse#ed-nurse").length).toBeGreaterThan(0);
    expect(t.session.conversationOf("nurse")).toEqual([]);
    await t.session.close();
  });

  it("a staff id whose role does not speak through the addressed agent is ignored (the agent answers as itself)", async () => {
    const t = await makeEmbodiedSession({ caseId: "acute-ischemic-stroke" });
    const out = await say(t, "Hello", "nurse", "radiologist");
    expect(msgsOf(out, "agent_message")[0]?.staffId).toBeUndefined();
    expect(msgsOf(out, "turn_started")[0]?.staffId).toBeUndefined();
    await t.session.close();
  });

  it("a receptionist speaking through the nurse profile is told who they are — never handed the nurse's case knowledge", async () => {
    const t = await makeEmbodiedSession({ caseId: "acute-ischemic-stroke", scripts: [textScript("Hello, how can I help?")] });
    const out = await say(t, "Hi there", "nurse", "receptionist");
    expect(msgsOf(out, "agent_message")[0]).toMatchObject({ staffId: "receptionist", text: "Hello, how can I help?" });
    const system = t.provider!.requests.at(-1)!.system.map((s) => s.text).join("\n");
    const name = tx(t.session.facility!.staff.find((s) => s.id === "receptionist")!.name, "en");
    expect(system).toContain("<speaking_as>");
    expect(system).toContain(name);
    expect(system).not.toMatch(/Ward knowledge:/);
    await t.session.close();
  });
});
