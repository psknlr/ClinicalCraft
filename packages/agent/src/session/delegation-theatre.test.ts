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
import { ACCESS, operatorSteps, STAFF, standAtTable, system, THEATRE, theatreSession, type TheatreSessionOptions } from "./__fixtures__/theatre.js";

interface Delegation {
  staffId: string | null;
  status: string;
  message?: string;
  refusal?: string;
  camera?: { port: string };
  aimed?: { region: string; zoom: string };
  passed?: { instrument: string; to?: string };
  holding?: { port: string; instrument: string };
  letGo?: { port: string; instrument: string }[];
}

/** A theatre session in the default approval mode (every approval answered `approved`); `start`: a place taken first. */
async function theatre(start?: TheatreSessionOptions["start"]): Promise<TestSession> {
  const t = await theatreSession({ ...(start ? { start } : {}), settingsPatch: { approvalMode: "default" } });
  t.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
  });
  return t;
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
    expect(d.text).toContain("Dr Abe aims the camera at hepatocystic-triangle (close up).");
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
    expect(d.text).toContain("Chen Yu passed the hook to the operating surgeon.");
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
