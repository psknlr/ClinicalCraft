/**
 * Delegation at the operating table (docs/PROTOCOL.md "delegate_task", docs/EMBODIED.md §8.3): the theatre's tasks go
 * to whoever holds the control they are worked with, in the patient's room — `hold_camera` (walk to the table; take the
 * camera port by hand-over, or put the laparoscope into an empty one), `aim_camera {region, zoom?}`, `pass_instrument
 * {instrument, to?}`, traction —; a role is narrowed by control and ranked by position (traction: the first assistant,
 * the second, the surgeon; the camera: whoever holds the camera port), never the colleague standing by while the
 * learner holds their place, never the surgeon member for the camera; a position in words ("first assistant", "一助",
 * "扶镜手") names whoever holds it in this encounter; and someone who lets go hands back every port they hold, the
 * camera said as the camera.
 */
import { describe, expect, it } from "vitest";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { lookupStaff } from "../tools/consult-target.js";
import { ACCESS, LATERAL, operatorSteps, sendToScrubRoom, STAFF, standAtTable, system, THEATRE, theatreFacility, theatreSession, type TheatreSessionOptions } from "./__fixtures__/theatre.js";

interface Delegation {
  staffId: string | null;
  status: string;
  message?: string;
  refusal?: string;
  asked?: string;
  camera?: { port: string };
  aimed?: { region: string; zoom: string };
  passed?: { instrument: string; to?: string };
  holding?: { port: string; instrument: string };
  letGo?: { port: string; instrument: string }[];
}

/** Approvals asked for in a session (each answered `approved`): their summaries. */
const asked = new WeakMap<TestSession, string[]>();

/**
 * A theatre session in the default approval mode (every approval answered `approved`); `start`: a place taken first;
 * `options`: more of the session's options (the facility, settings).
 */
async function theatre(start?: TheatreSessionOptions["start"], options: Omit<TheatreSessionOptions, "start"> = {}): Promise<TestSession> {
  const t = await theatreSession({ ...options, ...(start ? { start } : {}), settingsPatch: { approvalMode: "default", ...(options.settingsPatch ?? {}) } });
  const summaries: string[] = [];
  asked.set(t, summaries);
  t.session.subscribe((e) => {
    if (e.msg.type !== "approval_request") return;
    summaries.push(e.msg.summary);
    t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
  });
  return t;
}

/** general-hospital's theatre without its physician (`attending`, a bare staff id that spells the role): a role then names only the theatre's attendings. */
function noPhysician() {
  const f = theatreFacility();
  f.staff = f.staff.filter((x) => x.id !== "attending");
  return f;
}

let calls = 0;
/** `delegate_task` as an external agent's call; its result and its text. */
async function delegate(t: TestSession, args: Record<string, unknown>): Promise<{ delegation: Delegation; text: string }> {
  const callId = `d-${++calls}`;
  const events = await t.session.run({ type: "external_tool_call", callId, tool: "delegate_task", args });
  const end = msgsOf(events, "tool_call_end").find((m) => m.callId === callId)!;
  return { delegation: (end.data as { delegation: Delegation }).delegation, text: end.output };
}

const port = (t: TestSession, site: string) => t.session.state.procedure!.ports.find((p) => p.site === site)!;
const camera = (t: TestSession, asked: string) => lookupStaff(t.session.facility, asked, THEATRE, { caseDef: t.session.caseDef, state: t.session.state });

describe("the camera", () => {
  it("hold_camera by hand-over: asked of the attendings, the camera holder (the first assistant: no second assistant) takes the scope in A", async () => {
    const t = await theatre();
    operatorSteps(t, ACCESS);
    expect(camera(t, "扶镜手")).toMatchObject({ kind: "one", staff: { id: "doc-1" } });
    const d = await delegate(t, { role: "attending", task: "hold_camera" });
    expect(d.delegation).toMatchObject({ staffId: STAFF.first, status: "completed", camera: { port: "A" } });
    expect(port(t, "A")).toMatchObject({ instrument: "laparoscope", holder: "doc-1" });
    expect(d.text).toContain("Dr Abe has the camera in port A.");
    // the camera holder is now whoever holds the camera port
    expect(camera(t, "camera holder")).toMatchObject({ kind: "one", staff: { id: "doc-1" } });
    await t.session.close();
  });

  it("hold_camera into an empty camera port: with the scope out, the camera holder puts it back into A and holds it", async () => {
    const t = await theatre();
    operatorSteps(t, [...ACCESS, { op: "withdraw", port: "A" }]);
    expect(port(t, "A").instrument).toBeFalsy();
    const d = await delegate(t, { role: "first assistant", task: "hold_camera" });
    expect(d.delegation).toMatchObject({ staffId: STAFF.first, status: "completed", camera: { port: "A" } });
    expect(port(t, "A")).toMatchObject({ instrument: "laparoscope", holder: "doc-1" });
    await t.session.close();
  });

  it("aim_camera: the camera holder takes the camera and aims it where asked, close up; an aim needs a region", async () => {
    const t = await theatre();
    operatorSteps(t, ACCESS);
    const d = await delegate(t, { role: "一助", task: "aim_camera", params: { region: "hepatocystic-triangle", zoom: "close" } });
    expect(d.delegation).toMatchObject({ staffId: STAFF.first, status: "completed", camera: { port: "A" }, aimed: { region: "hepatocystic-triangle", zoom: "close" } });
    expect(t.session.state.procedure!.camera).toMatchObject({ at: "hepatocystic-triangle", zoom: "close" });
    // the region by its name, its id in brackets (as observe_field shows it)
    expect(d.text).toContain("Dr Abe aims the camera at Hepatocystic triangle (hepatocystic-triangle), close up.");
    const none = await delegate(t, { role: "一助", task: "aim_camera" });
    expect(none.delegation).toMatchObject({ status: "failed", message: "no-target" });
    expect(none.text).toMatch(/needs a region to aim at/);
    await t.session.close();
  });

  it("whoever lets go hands back every port they hold — the camera said as the camera", async () => {
    const t = await theatre();
    operatorSteps(t, ACCESS);
    await delegate(t, { role: "first assistant", task: "hold_camera" });
    await delegate(t, { role: "first assistant", task: "hold_traction", params: { port: "B" } });
    expect([port(t, "A").holder, port(t, "B").holder]).toEqual(["doc-1", "doc-1"]);
    const d = await delegate(t, { role: "一助", task: "release_traction" });
    expect(d.delegation).toMatchObject({ staffId: STAFF.first, status: "completed" });
    expect(d.delegation.letGo).toEqual([
      { port: "A", instrument: "laparoscope" },
      { port: "B", instrument: "grasper" },
    ]);
    expect(d.text).toContain("Dr Abe let go of the camera in port A.");
    expect(d.text).toMatch(/Dr Abe let go of the grasper in port B/);
    expect([port(t, "A").holder, port(t, "B").holder]).toEqual([undefined, undefined]);
    await t.session.close();
  });
});

describe("passes and traction", () => {
  it("pass_instrument: asked of the nurses, the scrub nurse passes — to the operator, or into a colleague's hand", async () => {
    const t = await theatre();
    operatorSteps(t, ACCESS);
    const d = await delegate(t, { role: "nurse", task: "pass_instrument", params: { instrument: "hook" } });
    expect(d.delegation).toMatchObject({ staffId: STAFF.scrub, status: "completed", passed: { instrument: "hook" } });
    // without a place the operator is the learner: the pass is into their hand ("you")
    expect(d.text).toContain("Chen Yu passed the hook to you.");
    const e = await delegate(t, { role: "scrub nurse", task: "pass_instrument", params: { instrument: "suction", to: "doc-1" } });
    expect(e.delegation).toMatchObject({ staffId: STAFF.scrub, status: "completed", passed: { instrument: "suction", to: "doc-1" } });
    expect(e.text).toContain("Chen Yu passed the suction–irrigation to Dr Abe.");
    expect(t.session.state.procedure!.passed).toEqual([
      { instrument: "hook", by: "nurse-2" },
      { instrument: "suction", by: "nurse-2", to: "doc-1" },
    ]);
    const nothing = await delegate(t, { role: "nurse", task: "pass_instrument" });
    expect(nothing.delegation).toMatchObject({ status: "failed", message: "no-target" });
    await t.session.close();
  });

  it("traction asked of the attendings reaches the first assistant, not the anaesthetist; 'first assistant' and '一助' name him", async () => {
    const t = await theatre();
    operatorSteps(t, ACCESS);
    // the anaesthetist stands right at the table: nearer, and still never chosen for traction
    standAtTable(t, STAFF.anaesthetist, 0.4);
    const d = await delegate(t, { role: "attending", task: "hold_traction", params: { port: "B" } });
    expect(d.delegation).toMatchObject({ staffId: STAFF.first, status: "completed", holding: { port: "B", instrument: "grasper" } });
    for (const role of ["first assistant", "一助", "the first assistant", "第一助手"]) {
      expect((await delegate(t, { role, task: "release_traction" })).delegation, role).toMatchObject({ staffId: STAFF.first, status: "completed" });
    }
    // a line-up with a second assistant: 二助 names her
    await t.session.close();
    const three = await theatreSession({ start: { type: "start", seat: "scrub-nurse", lineup: "three-surgeons" } });
    expect(camera(three, "二助")).toMatchObject({ kind: "one", staff: { id: "doc-2" } });
    expect(camera(three, "扶镜手")).toMatchObject({ kind: "one", staff: { id: "doc-2" } });
    await three.session.close();
  });
});

describe("who is chosen while the learner holds a place", () => {
  it("the colleague standing by is passed over; the surgeon member (the stand-in) is never chosen for the camera, however near", async () => {
    const t = await theatre({ type: "start", seat: "first-assistant", lineup: "three-surgeons" });
    operatorSteps(t, ACCESS);
    // the stood-down first assistant and the stand-in surgeon stand nearest the patient
    standAtTable(t, STAFF.first, 0.3);
    standAtTable(t, STAFF.standIn, -0.3);
    const traction = await delegate(t, { role: "attending", task: "hold_traction", params: { port: "B" } });
    expect(traction.delegation).toMatchObject({ staffId: STAFF.second, status: "completed" });
    await delegate(t, { role: "attending", task: "release_traction" });
    const cam = await delegate(t, { role: "attending", task: "hold_camera" });
    expect(cam.delegation).toMatchObject({ staffId: STAFF.second, status: "completed", camera: { port: "A" } });
    // a position word: the first assistant's place is the learner's — the colleague standing by says so
    const self = await delegate(t, { role: "first assistant", task: "hold_traction", params: { port: "B" } });
    expect(self.delegation).toMatchObject({ staffId: STAFF.first, status: "failed", message: "not-authorized" });
    expect(self.text).toMatch(/Dr Abe stands by: you hold the first assistant's place/);
    // 主刀 / 术者: whoever operates — the stand-in while the learner holds a place
    expect(camera(t, "主刀")).toMatchObject({ kind: "one", staff: { id: "doc-0" } });
    expect(camera(t, "术者")).toMatchObject({ kind: "one", staff: { id: "doc-0" } });
    await t.session.close();
  });

  it("without a place nobody stands by, and the operating surgeon is the learner: 主刀 names no colleague", async () => {
    const t = await theatre();
    system(t, { type: "start", by: "system" });
    expect(camera(t, "主刀")).toEqual({ kind: "none" });
    expect(t.session.staffStates().every((r) => !r.standingBy)).toBe(true);
    await t.session.close();
  });
});

/** The operating table's tasks (`THEATRE_TASK_CONTROL`). */
const TABLE_TASKS = ["hold_traction", "release_traction", "hold_camera", "aim_camera", "pass_instrument"];
const FIRST = { type: "start", seat: "first-assistant" } as const;
const learnerStep = (t: TestSession, op: Record<string, unknown>) => t.session.run({ type: "clinical_action", action: { type: "operate", op } as never });

describe("the body that operates is handed none of the table's tasks (A16), and nobody the field takes no part from is chosen", () => {
  it("the stand-in surgeon: named (主刀) he is refused the camera, with who holds it; asked of the attendings he is never chosen, however near — the ports the learner holds stay theirs", async () => {
    // two surgeons, the learner as first assistant (who holds the camera); no physician spelling the role
    const t = await theatre(FIRST, { facility: noPhysician() });
    operatorSteps(t, ACCESS);
    standAtTable(t, STAFF.standIn, 0.3);
    standAtTable(t, STAFF.anaesthetist, -0.9);
    const named = await delegate(t, { role: "主刀", task: "hold_camera" });
    expect(named.delegation).toMatchObject({ staffId: STAFF.standIn, status: "failed", message: "not-authorized" });
    expect(named.delegation.refusal).toBe(
      "Dr Ito operates: the operating table's tasks — traction, the camera, passing — go to the assistants and the scrub nurse. In this team the Camera control is held by you (first assistant).",
    );
    // his role state offers none of them
    expect(t.session.staffStates().find((r) => r.actorId === STAFF.standIn)!.delegable.filter((x) => TABLE_TASKS.includes(x))).toEqual([]);
    // the learner takes the camera in A and the grasper in B, and keeps the traction
    for (const op of [{ op: "hand-over", port: "A", to: "doc-1" }, { op: "hand-over", port: "B", to: "doc-1" }, LATERAL]) expect(msgsOf(await learnerStep(t, op), "error")).toEqual([]);
    const field = () => JSON.stringify([port(t, "A"), port(t, "B"), t.session.state.procedure!.retractions]);
    const before = field();
    for (const [task, params] of [
      ["hold_camera", {}],
      ["aim_camera", { region: "hepatocystic-triangle" }],
      ["hold_traction", { port: "B" }],
    ] as const) {
      const d = await delegate(t, { role: "attending", task, params });
      expect(d.delegation.staffId, task).not.toBe(STAFF.standIn);
      expect(d.delegation, task).toMatchObject({ status: "failed", message: "not-authorized" });
    }
    expect(field()).toBe(before);
    expect([port(t, "A").holder, port(t, "B").holder]).toEqual(["doc-1", "doc-1"]);
    expect(asked.get(t)).toEqual([]);
    await t.session.close();
  });

  it("traction asked of the attendings while the stand-in is the only one at hand who holds it: refused, never taken back from the learner", async () => {
    const t = await theatre(FIRST);
    operatorSteps(t, ACCESS);
    sendToScrubRoom(t, STAFF.second);
    for (const op of [{ op: "hand-over", port: "B", to: "doc-1" }, LATERAL]) expect(msgsOf(await learnerStep(t, op), "error")).toEqual([]);
    const d = await delegate(t, { role: "attending", task: "hold_traction", params: { port: "B" } });
    expect(d.delegation.staffId).not.toBe(STAFF.standIn);
    expect(d.delegation).toMatchObject({ status: "failed", message: "not-authorized" });
    expect(port(t, "B").holder).toBe("doc-1");
    expect(t.session.state.procedure!.retractions["gallbladder-infundibulum"]).toMatchObject({ port: "B" });
    await t.session.close();
  });

  it("a colleague the field takes no part from is never chosen nor offered the table's tasks: outside the team while the learner holds a place, or absent this encounter", async () => {
    // the first assistant's place, two surgeons: the second assistant (another line-up's) is outside this team
    const t = await theatre(FIRST, { settingsPatch: { permissions: { ask: ["operate"] } } });
    operatorSteps(t, ACCESS);
    standAtTable(t, STAFF.second, 0.4);
    const d = await delegate(t, { role: "attending", task: "hold_traction", params: { port: "B" } });
    expect(d.delegation.staffId).not.toBe(STAFF.second);
    expect(d.delegation).toMatchObject({ status: "failed", message: "not-authorized" });
    const named = await delegate(t, { role: "staff:doc-2", task: "hold_traction", params: { port: "B" } });
    expect(named.delegation.refusal).toBe(
      "Dr Sato is not in this encounter's care team: they take no part in the operation. In this team the Traction control is held by you (first assistant).",
    );
    expect(t.session.staffStates().find((r) => r.actorId === STAFF.second)!.delegable.filter((x) => TABLE_TASKS.includes(x))).toEqual([]);
    expect(asked.get(t)).toEqual([]);
    await t.session.close();
    // no place, three surgeons, the second assistant away (still in the theatre) and the first out of it: the facility's
    // surgeon outside the team takes the traction — never the absent colleague
    const away = await theatre({ type: "start", lineup: "three-surgeons", team: "second-away" } as never);
    operatorSteps(away, ACCESS);
    sendToScrubRoom(away, STAFF.first);
    standAtTable(away, STAFF.second, 0.3);
    const held = await delegate(away, { role: "attending", task: "hold_traction", params: { port: "B" } });
    expect(held.delegation).toMatchObject({ staffId: STAFF.standIn, status: "completed", holding: { port: "B", instrument: "grasper" } });
    expect(away.session.staffStates().find((r) => r.actorId === STAFF.second)!.delegable.filter((x) => TABLE_TASKS.includes(x))).toEqual([]);
    await away.session.close();
  });
});

describe("the camera tasks work the camera port", () => {
  it("a working port named is refused before anyone moves, and no camera is reported held", async () => {
    const t = await theatre();
    operatorSteps(t, ACCESS);
    const before = JSON.stringify(t.session.state.procedure!.ports);
    for (const [task, params] of [
      ["hold_camera", { port: "B" }],
      ["aim_camera", { port: "B", region: "hepatocystic-triangle" }],
    ] as const) {
      const d = await delegate(t, { role: "attending", task, params });
      expect(d.delegation, task).toMatchObject({ status: "failed", message: "not-camera-port", asked: "B", steps: [] });
      expect(d.delegation.camera, task).toBeUndefined();
      expect(d.text, task).toMatch(/needs a camera port \(the laparoscope in it, or empty\): port B is not one\./);
    }
    expect(JSON.stringify(t.session.state.procedure!.ports)).toBe(before);
    await t.session.close();
  });

  it("a hand-over the field refuses reports no camera held: the camera holder already holds two ports — the reason said to the learner", async () => {
    const t = await theatre();
    operatorSteps(t, [...ACCESS, { op: "withdraw", port: "C" }, { op: "insert", port: "C", instrument: "suction" }]);
    standAtTable(t, STAFF.first);
    for (const site of ["B", "C"]) system(t, { type: "operate", op: { op: "hand-over", port: site, to: "doc-1" }, actor: "doc-1", by: "system" });
    const d = await delegate(t, { role: "first assistant", task: "hold_camera" });
    expect(d.delegation).toMatchObject({ staffId: STAFF.first, status: "failed" });
    expect(d.delegation.camera).toBeUndefined();
    expect(d.text).toMatch(/Dr Abe already holds two ports \(B, C\): a colleague holds at most two\./);
    expect(d.text).not.toMatch(/has the camera/);
    expect(port(t, "A").holder).toBeUndefined();
    await t.session.close();
  });
});

describe("the report names people and regions as the learner reads them", () => {
  it("a pass into the learner's hand is to 'you'; the operator's token is the operator — the stand-in by name; a region by its name, in either language", async () => {
    const t = await theatre(FIRST);
    operatorSteps(t, ACCESS);
    const mine = await delegate(t, { role: "nurse", task: "pass_instrument", params: { instrument: "suction", to: "doc-1" } });
    expect(mine.delegation).toMatchObject({ status: "completed", passed: { instrument: "suction", to: "doc-1" } });
    expect(mine.text).toContain("Chen Yu passed the suction–irrigation to you.");
    const op = await delegate(t, { role: "nurse", task: "pass_instrument", params: { instrument: "hook", to: "surgeon" } });
    expect(op.delegation.passed).toEqual({ instrument: "hook" });
    expect(op.text).toContain("Chen Yu passed the hook to Dr Ito.");
    await t.session.close();
    const zh = await theatre(undefined, { settingsPatch: { locale: "zh-CN" } });
    operatorSteps(zh, ACCESS);
    const aimed = await delegate(zh, { role: "一助", task: "aim_camera", params: { region: "hepatocystic-triangle", zoom: "close" } });
    expect(aimed.text).toContain("阿部医生把镜头对准Hepatocystic triangle（hepatocystic-triangle），近景。");
    await zh.session.close();
  });
});
