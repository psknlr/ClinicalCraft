/**
 * Standing tasks of the staff in the agent runtime (docs/TEAM.md §5.1): a colleague takes up what the case gives them
 * once it falls due and does it on their own — at once without a world; in-world with their own body (a cart wheeled
 * to the patient, a device worked) — says what the case has them say, and what blocks them is recorded and said once.
 * The learner never enters a colleague's task, and the demonstration waits for it.
 */
import { evaluate, staffTaskFacilityIssues, staffTaskRecord, type CaseDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { builtinContent } from "../__fixtures__/embodied.js";
import { loadMiniCase, makeSession, type TestSession } from "../__fixtures__/harness.js";
import { catalogsFor } from "../node/bootstrap.js";

const L = (zh: string, en: string) => ({ "zh-CN": zh, en });

type Task = { id: string; name: ReturnType<typeof L>; staff: string; when?: unknown; steps?: unknown[]; say?: ReturnType<typeof L> };

/** The mini chest-pain case with standing tasks (and, optionally, an edit of the raw case). */
function withTasks(tasks: Task[], edit?: (raw: Record<string, any>) => void): CaseDefinition { // eslint-disable-line @typescript-eslint/no-explicit-any
  return loadMiniCase((input) => {
    const raw = input as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    raw.staffTasks = tasks;
    edit?.(raw);
  });
}

const said = (t: TestSession) => t.msgs("agent_message").map((m) => m.text).join("\n");
const out = (t: TestSession) => t.msgs("command_output").at(-1)!.text;

async function inWorld(c: CaseDefinition): Promise<TestSession> {
  const content = await builtinContent();
  const facility = content.facilities.get("general-hospital")!.def;
  const t = await makeSession({ caseDef: c, facility, catalogs: catalogsFor(content, facility), settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
  await t.session.run({ type: "clinical_action", action: { type: "start" } });
  return t;
}

describe("without a world", () => {
  const tasks: Task[] = [
    { id: "ready", name: L("准备抢救床位", "Prepare the bay"), staff: "nurse", say: L("床位准备好了。", "The bay is ready.") },
    { id: "after-meds", name: L("核对用药清单", "Check the medicines list"), staff: "nurse", when: { asked: "meds" }, say: L("用药清单核对好了。", "The medicines list is checked.") },
  ];

  it("a task is done once it falls due, and what the case has them say is said once", async () => {
    const c = withTasks(tasks);
    const t = await makeSession({ caseDef: c });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "staff_step" });
    expect(staffTaskRecord(t.session.state, "ready")?.status).toBe("done");
    expect(staffTaskRecord(t.session.state, "after-meds")).toBeUndefined();
    await t.session.run({ type: "slash_command", name: "ask", args: "meds" });
    expect(evaluate(c, t.session.state, { staffTask: "after-meds" })).toBe(true);
    await t.session.run({ type: "staff_step" });
    expect(said(t).match(/The bay is ready\./gu)).toHaveLength(1);
    expect(said(t).match(/The medicines list is checked\./gu)).toHaveLength(1);
    await t.session.run({ type: "slash_command", name: "status", args: "" });
    expect(out(t)).toContain("Colleagues' tasks:");
    expect(out(t)).toContain("✓ Prepare the bay");
  });

  it("a learner can never record a colleague's task", async () => {
    const t = await makeSession({ caseDef: withTasks(tasks) });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const before = staffTaskRecord(t.session.state, "after-meds");
    await t.session.run({ type: "clinical_action", action: { type: "staff-task", task: { op: "done", task: "after-meds", by: "nurse" } } });
    expect(t.msgs("error").at(-1)).toMatchObject({ code: "permission_denied" });
    expect(staffTaskRecord(t.session.state, "after-meds")).toEqual(before);
  });

  it("case_status names a colleague's task in an objective and says it is theirs", async () => {
    const c = withTasks(tasks, (raw) => {
      raw.objectives[0].completeWhen = { all: [raw.objectives[0].completeWhen, { staffTask: "after-meds" }] };
    });
    const t = await makeSession({ caseDef: c });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "slash_command", name: "status", args: "" });
    expect(out(t)).toMatch(/· Check the medicines list — a colleague's task\n\s+→ next: a colleague does this on their own once it is due/u);
  });

  it("the demonstration waits for a colleague's task in the reference path instead of doing it", async () => {
    const c = withTasks(tasks, (raw) => {
      const last = raw.objectives.at(-1);
      last.completeWhen = { all: [last.completeWhen, { staffTask: "after-meds" }] };
      const finish = raw.solution.findIndex((a: { type: string }) => a.type === "finish");
      raw.solution.splice(finish, 0, { type: "ask", itemId: "meds" }, { type: "staff-task", task: { op: "done", task: "after-meds", by: "nurse" } });
    });
    const t = await makeSession({ caseDef: c, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "autopilot", maxTurns: 40 });
    expect(staffTaskRecord(t.session.state, "after-meds")?.status).toBe("done");
    expect(t.session.state.finished).toBe(true);
    expect(said(t)).toContain("The medicines list is checked.");
  });
});

describe("in-world: the colleague's own body", () => {
  it("a cart is wheeled to the patient's side and a device worked; only then is the task done and said", async () => {
    const c = withTasks([
      {
        id: "glucose-ready",
        name: L("准备床旁血糖仪并打开药品冰箱", "Bring the glucometer and open the medicines fridge"),
        staff: "ed-nurse",
        when: { asked: "meds" },
        steps: [{ fetch: "point-of-care" }, { operate: "medications", operation: "open" }],
        say: L("血糖仪推过来了，药品冰箱也打开了。", "The glucometer is here and the medicines fridge is open."),
      },
    ]);
    const t = await inWorld(c);
    const w = t.session.world()!;
    // not due yet: nothing moves
    await t.session.run({ type: "staff_step" });
    expect(w.bedsideProviders("point-of-care")).toEqual([]);
    expect(staffTaskRecord(t.session.state, "glucose-ready")).toBeUndefined();
    // due once the question is asked (at the patient's side): the nurse's round after that act
    const patient = w.entities().find((e) => e.kind === "patient")!.id;
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: patient } } as never });
    await t.session.run({ type: "slash_command", name: "ask", args: "meds" });
    expect(t.session.state.asked).toContain("meds");
    expect(staffTaskRecord(t.session.state, "glucose-ready")).toMatchObject({ status: "done", by: "ed-nurse" });
    expect(w.bedsideProviders("point-of-care").length).toBe(1);
    // the fridge the nurse could reach first: the one at their station
    expect(w.inspect("staff:ed-nurse", "eq:ed-med-fridge")?.state).toBe("open");
    expect(said(t)).toContain("The glucometer is here and the medicines fridge is open.");
    // a second round changes nothing
    const events = t.events.length;
    await t.session.run({ type: "staff_step" });
    expect(t.msgs("agent_message").filter((m) => m.text.includes("The glucometer is here"))).toHaveLength(1);
    expect(t.events.length - events).toBeLessThan(20);
  });

  it("what blocks a task is recorded with its reason, said once, and shown in the colleague's role state", async () => {
    const c = withTasks([
      { id: "nobody", name: L("无人之事", "Nobody's job"), staff: "night-porter", steps: [{ fetch: "point-of-care" }] },
      { id: "treat", name: L("记录心电图", "Record an ECG"), staff: "ed-nurse", steps: [{ operate: "ecg-12lead", operation: "record" }] },
    ]);
    const t = await inWorld(c);
    await t.session.run({ type: "staff_step" });
    await t.session.run({ type: "staff_step" });
    expect(staffTaskRecord(t.session.state, "nobody")).toMatchObject({ status: "blocked", reason: "nobody is there to do it" });
    expect(staffTaskRecord(t.session.state, "treat")?.status).toBe("blocked");
    expect(staffTaskRecord(t.session.state, "treat")?.reason).toContain("acts on the patient");
    expect(t.msgs("agent_message").filter((m) => m.text.includes("acts on the patient"))).toHaveLength(1);
    const nurse = t.session.staffStates().find((s) => s.actorId === "staff:ed-nurse")!;
    expect(nurse.currentGoal).toBe("Record an ECG");
    expect(nurse.blockedReason).toContain("acts on the patient");
    await t.session.run({ type: "slash_command", name: "status", args: "" });
    expect(out(t)).toMatch(/⏸ Record an ECG — [^\n]*\(.*acts on the patient/u);
  });

  it("an operation that would reserve the device is not a colleague's task", async () => {
    const c = withTasks([{ id: "prep-ecg", name: L("准备心电图机", "Prepare the ECG machine"), staff: "ed-nurse", steps: [{ operate: "ecg-12lead", operation: "prepare" }] }]);
    const t = await inWorld(c);
    await t.session.run({ type: "staff_step" });
    expect(staffTaskRecord(t.session.state, "prep-ecg")?.reason).toContain("left free for whoever uses it");
    expect(Object.values(t.session.world()!.snapshot().entities).some((e) => e.reservedBy === "staff:ed-nurse")).toBe(false);
  });

  it("the facility check names what a facility lacks for a task", async () => {
    const content = await builtinContent();
    const facility = content.facilities.get("general-hospital")!.def;
    const c = withTasks([
      {
        id: "x",
        name: L("x", "x"),
        staff: "night-porter",
        steps: [{ fetch: "tongue-imaging" }, { operate: "moxibustion", operation: "switch_on" }, { operate: "medications", operation: "switch_on" }, { operate: "ecg-12lead", operation: "record" }, { operate: "ecg-12lead", operation: "prepare" }, { fetch: "point-of-care" }],
      },
    ]);
    const messages = staffTaskFacilityIssues(c, facility, catalogsFor(content, facility)).map((i) => `${i.path}: ${i.message}`);
    expect(messages).toEqual([
      'staffTasks.0.staff: facility "general-hospital" has no staff "night-porter" (an id or a role)',
      'staffTasks.0.steps.0.fetch: facility "general-hospital" has no cart that provides "tongue-imaging" to bring to the patient',
      'staffTasks.0.steps.1.operate: facility "general-hospital" has no device that provides "moxibustion"',
      'staffTasks.0.steps.2.operation: no device that provides "medications" offers the operation "switch_on"',
      'staffTasks.0.steps.3.operation: "record" has a clinical effect (the clinician\'s act): a colleague\'s standing task cannot do it',
      'staffTasks.0.steps.4.operation: "prepare" reserves the device: a colleague\'s standing task cannot do it',
    ]);
  });

  it("the in-world demonstration waits for the colleague's body to do it", async () => {
    const c = withTasks(
      [{ id: "glucose-ready", name: L("准备床旁血糖仪", "Bring the glucometer"), staff: "ed-nurse", when: { asked: "character" }, steps: [{ fetch: "point-of-care" }], say: L("血糖仪推过来了。", "The glucometer is here.") }],
      (raw) => {
        const last = raw.objectives.at(-1);
        last.completeWhen = { all: [last.completeWhen, { staffTask: "glucose-ready" }] };
        const finish = raw.solution.findIndex((a: { type: string }) => a.type === "finish");
        raw.solution.splice(finish, 0, { type: "staff-task", task: { op: "done", task: "glucose-ready", by: "ed-nurse" } });
      },
    );
    const content = await builtinContent();
    const facility = content.facilities.get("general-hospital")!.def;
    const t = await makeSession({ caseDef: c, facility, catalogs: catalogsFor(content, facility), settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
    await t.session.run({ type: "autopilot", maxTurns: 80 });
    expect(staffTaskRecord(t.session.state, "glucose-ready")).toMatchObject({ status: "done", by: "ed-nurse" });
    expect(t.session.world()!.bedsideProviders("point-of-care").length).toBe(1);
    expect(t.session.state.finished).toBe(true);
  });
});
