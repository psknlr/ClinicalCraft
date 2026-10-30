/**
 * Everyone answers words with words and acts (docs/EMBODIED.md §8.4): a colleague asked to do something does it with
 * their own body within their role — acknowledging, then reporting the outcome in their own voice — or says, in
 * their own voice, that it is not their job and who can; they come, go back, show the way and say where things
 * are; the patient lies down, sits up or stands when asked — the case's positioning treatment when it has one.
 */
import { describe, expect, it } from "vitest";
import { t as tx } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type NavGoal } from "@clinicalcraft/world";
import { makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { textScript, toolCallScript } from "../providers/scripted.js";

async function walk(t: TestSession, goal: NavGoal): Promise<void> {
  const events = await t.session.run({ type: "world_action", request: { actionId: `wa-${Math.random().toString(36).slice(2)}`, actorId: PRIMARY_ACTOR, operation: "navigate", goal } });
  expect(msgsOf(events, "world_action_result")[0]?.result.status).toBe("completed");
}

const say = (t: TestSession, text: string, to: string, staff?: string) => t.session.run({ type: "user_message", text, to, ...(staff ? { staff } : {}) });
const lines = (events: Awaited<ReturnType<TestSession["session"]["run"]>>) => msgsOf(events, "agent_message").map((m) => ({ staffId: m.staffId, speaker: m.speaker, text: m.text }));

describe("a colleague asked to do something", () => {
  it("a nurse by name puts the patient on the monitor: acknowledges, does it with her own body, says it is done", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", settingsPatch: { approvalMode: "bypass" } });
    const out = await say(t, "Please put him on the monitor", "nurse", "ed-nurse");
    const said = lines(out);
    expect(said[0]).toMatchObject({ staffId: "ed-nurse", text: "Right away — I'll attach the monitor." });
    expect(said.at(-1)).toMatchObject({ staffId: "ed-nurse", text: "Done: attach the monitor." });
    expect(t.session.state.interventions.some((i) => i.interventionId === "cardiac-monitoring")).toBe(true);
    // the nurse walked there with her own body
    const nurse = t.session.world()!.actor("staff:ed-nurse")!;
    const bed = t.session.world()!.patientPlace()!;
    expect(Math.hypot(nurse.pose.x - bed.x, nurse.pose.z - bed.z)).toBeLessThan(3);
    // the structured report, as the delegate chips get it
    expect(msgsOf(out, "command_output").some((m) => m.name === "delegate")).toBe(true);
    // she remembers what she was asked and said
    expect(JSON.stringify(t.session.conversationOf("nurse#ed-nurse"))).toContain("put him on the monitor");
    await t.session.close();
  });

  it("a treatment through the same approval gate (bypass here): the nurse gives the aspirin", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", settingsPatch: { approvalMode: "bypass" } });
    const out = await say(t, "Give aspirin 300 mg", "nurse", "ed-nurse");
    expect(lines(out)[0]?.text).toMatch(/I'll give Aspirin/i);
    expect(t.session.state.interventions.some((i) => i.interventionId === "aspirin")).toBe(true);
    await t.session.close();
  });

  it("outside their role: the receptionist says so in her own voice, what she can do and who can — nothing is done", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", settingsPatch: { approvalMode: "bypass" } });
    const out = await say(t, "Could you attach the monitor?", "nurse", "receptionist");
    const said = lines(out);
    expect(said).toHaveLength(1);
    expect(said[0]).toMatchObject({ staffId: "receptionist" });
    expect(said[0]!.text).toMatch(/not a receptionist's job/);
    expect(said[0]!.text).toMatch(/A nurse can\./);
    expect(msgsOf(out, "command_output")).toEqual([]);
    expect(t.session.state.interventions.some((i) => i.interventionId === "cardiac-monitoring")).toBe(false);
    await t.session.close();
  });

  it("a treatment the case does not have is talk for the colleague's own agent (no acknowledgement, nothing done)", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    const out = await say(t, "Give unicorn dust", "nurse", "ed-nurse");
    expect(lines(out).every((l) => !/Right away/.test(l.text))).toBe(true);
    expect(lines(out).length).toBeGreaterThan(0);
    await t.session.close();
  });

  it("in Chinese too: 给他做个心电图 — the ECG recorded with the cart", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", settingsPatch: { approvalMode: "bypass", locale: "zh-CN" } });
    const out = await say(t, "给他做个心电图", "nurse", "ed-nurse");
    const said = lines(out);
    expect(said[0]?.text).toMatch(/好的，我这就去/);
    expect(said.at(-1)?.text).toMatch(/已经办好了/);
    expect(t.session.state.orders.some((o) => o.investigationId.includes("ecg"))).toBe(true);
    await t.session.close();
  });
});

describe("come here, go back, show the way, where is …", () => {
  it("the nurse comes to the learner, then goes back to her post", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    const w = t.session.world()!;
    await walk(t, { kind: "room", id: "lobby" });
    const come = await say(t, "Come here, please", "nurse", "ed-nurse");
    expect(lines(come)[0]).toMatchObject({ staffId: "ed-nurse", text: "Coming." });
    const me = w.actor(PRIMARY_ACTOR)!.pose;
    const her = w.actor("staff:ed-nurse")!.pose;
    expect(Math.hypot(me.x - her.x, me.z - her.z)).toBeLessThan(2.5);
    const back = await say(t, "You can go back now", "nurse", "ed-nurse");
    expect(lines(back)[0]?.text).toMatch(/I'll be back at/);
    const post = w.entity("staff:ed-nurse")!.position;
    const now = w.actor("staff:ed-nurse")!.pose;
    expect(Math.hypot(now.x - post.x, now.z - post.z)).toBeLessThan(1);
    await t.session.close();
  });

  it("the receptionist says where the CT scanner is (the hospital directory, never a case fact) and shows the way", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    const w = t.session.world()!;
    const where = await say(t, "Where is the CT scanner?", "nurse", "receptionist");
    expect(lines(where)[0]).toMatchObject({ staffId: "receptionist" });
    expect(lines(where)[0]!.text).toMatch(/CT.*about \d+ m from here/);
    const guide = await say(t, "Show me the way to the pharmacy", "nurse", "receptionist");
    expect(lines(guide)[0]!.text).toMatch(/^Follow me/);
    expect(w.actor("staff:receptionist")!.room).toBe("pharmacy");
    // where the patient is: where the world has them now
    const patient = await say(t, "Where is the patient?", "nurse", "receptionist");
    expect(lines(patient)[0]!.text).toMatch(/Resus/i);
    await t.session.close();
  });

  it("a place nobody knows is talk (the colleague's agent answers)", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    const out = await say(t, "Where is the unicorn stable?", "nurse", "receptionist");
    expect(lines(out).every((l) => !/from here|Follow me/.test(l.text))).toBe(true);
    await t.session.close();
  });
});

describe("the patient asked to change position", () => {
  it("an outpatient lies down on the couch, then stands up again (narrated; nothing credited)", async () => {
    const t = await makeEmbodiedSession({ caseId: "smzl-lung-adeno" });
    await walk(t, { kind: "interact", id: "patient" });
    const lie = await say(t, "Please lie down on the couch", "patient");
    expect(msgsOf(lie, "agent_message")[0]).toMatchObject({ grounding: "narrated", grounded: [] });
    expect(msgsOf(lie, "agent_message")[0]?.text).toMatch(/lies down/);
    expect(t.session.world()!.patientPlace()?.posture).toBe("lying");
    // the body is on the couch a step away (beyond conversation range): the learner steps over (the web does it by itself)
    await walk(t, { kind: "interact", id: "patient" });
    const stand = await say(t, "Stand up, please", "patient");
    expect(msgsOf(stand, "agent_message")[0]?.text).toMatch(/stands up/);
    expect(t.session.world()!.patientPlace()?.posture).toBe("standing");
    expect(t.session.state.asked).toEqual([]);
    await t.session.close();
  });

  it("the case's positioning treatment when it has one: 'Please sit up' gives PE's positioning (scored)", async () => {
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop", settingsPatch: { approvalMode: "bypass" } });
    await walk(t, { kind: "interact", id: "patient" });
    const out = await say(t, "Please sit up", "patient");
    expect(t.session.state.interventions.some((i) => i.interventionId === "positioning")).toBe(true);
    const item = tx(t.session.caseDef.interventions.find((i) => i.id === "positioning")!.name, "en");
    expect(msgsOf(out, "agent_message")[0]?.text).toContain(item);
    expect(t.session.world()!.patientPlace()?.posture).toBe("sitting");
    await t.session.close();
  });

  it("a posture a positioning treatment imposes is kept (anaphylaxis: laid flat, asked to stand)", async () => {
    const t = await makeEmbodiedSession({ caseId: "anaphylaxis-garden", settingsPatch: { approvalMode: "bypass" } });
    await walk(t, { kind: "interact", id: "patient" });
    await say(t, "Lie flat for me", "patient");
    expect(t.session.state.interventions.some((i) => i.interventionId === "position-supine-legs")).toBe(true);
    const out = await say(t, "Stand up, please", "patient");
    expect(msgsOf(out, "agent_message")[0]?.text).toMatch(/stays as positioned/);
    await t.session.close();
  });

  it("'Can you lie flat?' is a history question (orthopnoea), answered — not an instruction", async () => {
    const t = await makeEmbodiedSession({ caseId: "pulmonary-embolism-postop" });
    await walk(t, { kind: "interact", id: "patient" });
    const out = await say(t, "Can you lie flat?", "patient");
    expect(msgsOf(out, "agent_message").some((m) => m.grounding !== "narrated")).toBe(true);
    expect(t.session.world()!.patientPlace()?.posture).toBe("lying");
    await t.session.close();
  });
});

describe("a colleague voiced by a model acts with the tool only", () => {
  it("in a turn the learner started, the nurse's model gets do_task and attaches the monitor with her own body", async () => {
    const t = await makeEmbodiedSession({
      caseId: "stemi-inferior-rv",
      settingsPatch: { approvalMode: "bypass" },
      scripts: [toolCallScript([{ id: "c1", name: "do_task", args: { task: "attach_monitor" } }]), textScript("He's on the monitor now.")],
    });
    // free words the deterministic recogniser does not take: the model decides, the tool acts
    const out = await say(t, "Lin, when you get a second could you get him hooked up to everything?", "nurse", "ed-nurse");
    const first = t.provider!.requests[0]!;
    expect((first.tools ?? []).map((x) => x.name)).toContain("do_task");
    expect(t.session.state.interventions.some((i) => i.interventionId === "cardiac-monitoring")).toBe(true);
    expect(msgsOf(out, "command_output").some((m) => m.name === "delegate")).toBe(true);
    expect(msgsOf(out, "agent_message").at(-1)).toMatchObject({ staffId: "ed-nurse", text: "He's on the monitor now." });
    await t.session.close();
  });

  it("not in clinical mode (no body to act with)", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", clinical: true, scripts: [textScript("Sure.")] });
    await say(t, "Could you get him hooked up to everything?", "nurse");
    expect((t.provider!.requests[0]!.tools ?? []).map((x) => x.name)).not.toContain("do_task");
    await t.session.close();
  });
});

describe("offline, every colleague answers as who they are", () => {
  it("the receptionist (through the nurse's profile) and the lab technician (through the pathologist's) never read out the nurse's or the pathologist's notes", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    const desk = await say(t, "Hello", "nurse", "receptionist");
    expect(msgsOf(desk, "agent_message")[0]?.text).toMatch(/at reception/);
    const lab = await say(t, "Hello", "pathologist", "lab-tech");
    expect(msgsOf(lab, "agent_message")[0]?.text).toMatch(/in the lab/);
    await t.session.close();
  });
});
