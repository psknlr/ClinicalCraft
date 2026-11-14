/**
 * The scrub nurse keeps the sterile field (docs/TEAM.md §5, beside the anaesthetist's continuous responsibility): while
 * the operation is under way, the staff body of the team member with the instruments duty does not leave the team's room
 * unless another scrub nurse is in it to take over — whatever path asks: a request said to her, a direct move, a
 * delegated task, the care team's own move (every path goes through the one world-action guard). Staff bodies only:
 * the learner's body, in the scrub nurse's place too, moves by poses and walks no guard refuses.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type NavGoal } from "@clinicalcraft/world";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { ACCESS, kernelOf, operatorSteps, STAFF, system, THEATRE, theatreSession } from "./__fixtures__/theatre.js";

const SCRUB_ROOM: NavGoal = { kind: "room", id: "or-scrub" };
const KEEPS = /The scrub nurse keeps the sterile field while the operation is under way: another scrub nurse takes over in the room before she leaves\./;

/** A theatre session in the default approval mode (approvals answered `approved`), the operation under way unless `before`. */
async function underWay(opts: { before?: boolean; start?: { type: "start"; seat: "scrub-nurse" | "first-assistant"; team?: string } } = {}): Promise<TestSession> {
  const t = await theatreSession({ ...(opts.start ? { start: opts.start } : {}), settingsPatch: { approvalMode: "default" } });
  t.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
  });
  if (opts.before) {
    if (!t.session.state.started) system(t, { type: "start", by: "system" });
    system(t, { type: "set-phase", phase: "theatre", by: "system" });
  } else operatorSteps(t, opts.start?.seat === "scrub-nurse" ? ACCESS.slice(0, 2) : ACCESS);
  return t;
}

let walks = 0;
/** A direct move (a `world_action` op) of a body; its result. */
async function walk(t: TestSession, actorId: string, goal: NavGoal) {
  const events = await t.session.run({ type: "world_action", request: { actionId: `walk-${++walks}`, actorId, operation: "navigate", goal } });
  return msgsOf(events, "world_action_result").at(-1)!.result;
}

describe("the scrub nurse does not leave the sterile field during the operation", () => {
  it("refused for her staff body by every path: a request said to her, a direct move, a delegated task, the team's own move", async () => {
    const t = await underWay();
    const w = t.session.world()!;
    // a request said to her
    const asked = await t.session.run({ type: "user_message", text: "Please fetch the ECG machine.", to: "nurse", staff: "nurse-2" } as never);
    expect(msgsOf(asked, "agent_message").map((m) => m.text).join(" ")).toMatch(KEEPS);
    expect(w.roomOf(STAFF.scrub)).toBe(THEATRE);
    // a direct move
    expect(await walk(t, STAFF.scrub, SCRUB_ROOM)).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED", message: expect.stringMatching(KEEPS) });
    // a delegated task
    const callId = "fetch";
    const delegated = await t.session.run({ type: "external_tool_call", callId, tool: "delegate_task", args: { role: "staff:nurse-2", task: "fetch_equipment", target: "eq:cub2-ecg" } });
    const end = msgsOf(delegated, "tool_call_end").find((m) => m.callId === callId)!;
    expect(end.ok).toBe(false);
    expect(end.output).toMatch(KEEPS);
    // the care team's own move: its acts go through the same guard with the team's caller
    const team = await kernelOf(t).embodied!.act({ agent: "nurse", submission: "" }, { actorId: STAFF.scrub, operation: "navigate", goal: SCRUB_ROOM, actionId: "team.t1.1" });
    expect(team).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED", message: expect.stringMatching(KEEPS) });
    expect(w.roomOf(STAFF.scrub)).toBe(THEATRE);
    // within the theatre she moves freely, and the circulating nurse comes and goes
    expect((await walk(t, STAFF.scrub, { kind: "interact", id: "eq:or-instrument-table" })).status).toBe("completed");
    expect((await walk(t, STAFF.circulating, SCRUB_ROOM)).status).toBe("completed");
    await t.session.close();
  });

  it("another scrub nurse in the room frees her; before the operation is under way she may go", async () => {
    const t = await underWay();
    const w = t.session.world()!;
    expect((await walk(t, STAFF.scrub, SCRUB_ROOM)).status).toBe("failed");
    // the relief scrub nurse comes into the theatre
    expect((await walk(t, STAFF.relief, { kind: "room", id: THEATRE })).status).toBe("completed");
    expect(w.roomOf(STAFF.relief)).toBe(THEATRE);
    expect((await walk(t, STAFF.scrub, SCRUB_ROOM)).status).toBe("completed");
    expect(w.roomOf(STAFF.scrub)).toBe("or-scrub");
    await t.session.close();
    const before = await underWay({ before: true });
    expect((await walk(before, STAFF.scrub, SCRUB_ROOM)).status).toBe("completed");
    await before.session.close();
  });

  it("whoever holds the instruments duty is held: the relief of the scrub-break scenario; never the learner's body, in the scrub nurse's place too", async () => {
    const relief = await underWay({ start: { type: "start", seat: "first-assistant", team: "scrub-break" } });
    // nurse-9 relieves the scrub nurse in this encounter: once in the theatre, she keeps the field
    expect((await walk(relief, STAFF.relief, { kind: "room", id: THEATRE })).status).toBe("completed");
    expect(await walk(relief, STAFF.relief, SCRUB_ROOM)).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED" });
    await relief.session.close();
    const place = await underWay({ start: { type: "start", seat: "scrub-nurse" } });
    expect(place.session.world()!.roomOf(PRIMARY_ACTOR)).toBe(THEATRE);
    expect((await walk(place, PRIMARY_ACTOR, SCRUB_ROOM)).status).toBe("completed");
    expect(place.session.world()!.roomOf(PRIMARY_ACTOR)).toBe("or-scrub");
    // the colleague standing by in her place is not the field's keeper either
    expect((await walk(place, STAFF.scrub, SCRUB_ROOM)).status).toBe("completed");
    await place.session.close();
  });
});
