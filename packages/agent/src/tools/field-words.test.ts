/**
 * Whom the operative field's words are said to (docs/PROCEDURE.md §7): "you" is the addressee — the acting body unless
 * the caller names another (a delegated step reports to the learner who delegated it) —, so a colleague's own call never
 * calls two people "you": the learner, said to a colleague, is named by their place. A record's staff reference shows
 * the member whose place the learner holds as "you" (A19).
 */
import { describe, expect, it } from "vitest";
import { createSession, reduce, type ClinicalAction } from "@clinicalcraft/core";
import { LAP_CHOLE_TEAM } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { ACCESS, operatorSteps, STAFF, standAtTable, THEATRE, theatreCase, theatreSession } from "../session/__fixtures__/theatre.js";
import { countLines } from "./requirements.js";
import type { ToolContext } from "./types.js";

/** A body's own call to a tool (as the care team's host makes one): the session's case, state and dispatch. */
function ctx(t: TestSession, actorId?: string, locale = "en"): ToolContext {
  const s = t.session;
  return {
    caseDef: s.caseDef,
    facility: s.facility,
    catalogs: s.catalogs,
    locale,
    agent: "clinician",
    state: () => s.state,
    dispatch: (a: ClinicalAction) => s.dispatch(a),
    ask: async () => ({ text: "", grounded: [] }),
    updatePlan: () => undefined,
    ...(actorId ? { actorId } : {}),
  };
}

describe("'you' is whom the words are said to", () => {
  it("a colleague's own call: they are 'you' and the learner in their place is named by it; the learner's own call and a delegated step's report call the learner 'you'", async () => {
    const t = await theatreSession({ start: { type: "start", seat: "first-assistant", lineup: "three-surgeons" }, settingsPatch: { approvalMode: "default" } });
    t.session.subscribe((e) => {
      if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
    });
    operatorSteps(t, ACCESS);
    // the learner, as first assistant, takes the grasper in B
    expect(msgsOf(await t.session.run({ type: "clinical_action", action: { type: "operate", op: { op: "hand-over", port: "B", to: "doc-1" } } as never }), "error")).toEqual([]);
    standAtTable(t, STAFF.second, -0.5);
    const s = t.session;
    // the second assistant's own look: her place is "your place"; the port is the learner's, named by their place
    const look = (await s.tool("observe_field")!.run({}, ctx(t, STAFF.second))).output;
    expect(look).toContain("grasper — held by the first assistant (the learner)");
    expect(look).toContain("Your place: second assistant (id doc-2); your controls: Camera, Traction, Suction.");
    expect(look).not.toContain("held by you");
    const zh = (await s.tool("observe_field")!.run({}, ctx(t, STAFF.second, "zh-CN"))).output;
    expect(zh).toContain("——由第一助手（学员）握持");
    // her own step meets the learner's port: said to her, about the learner
    const take = await s.tool("operate")!.run({ op: "hand-over", port: "B", to: "doc-2" }, ctx(t, STAFF.second));
    expect(take.output).toContain("The first assistant (the learner) holds the grasper in port B: they hand it over themselves first.");
    expect(take.output).not.toMatch(/You hold/);
    // the learner's own look: the port is theirs
    expect((await s.tool("observe_field")!.run({}, ctx(t))).output).toContain("grasper — held by you");
    // a delegated step reports to the learner who delegated it: the learner is "you", the colleague by name
    const events = await s.run({ type: "external_tool_call", callId: "d", tool: "delegate_task", args: { role: "staff:doc-2", task: "hold_traction", params: { port: "B" } } });
    const report = msgsOf(events, "tool_call_end").find((m) => m.callId === "d")!.output;
    expect(report).toContain("You hold the grasper in port B: you hand it over yourself first.");
    expect(s.state.procedure!.ports.find((p) => p.site === "B")!.holder).toBe("doc-1");
    await s.close();
  });
});

describe("a record's staff as the learner reads it (A19)", () => {
  it("the count's escalation by the member whose place the learner holds is 'you'; anyone else as recorded", () => {
    const c = theatreCase({ team: { ...structuredClone(LAP_CHOLE_TEAM), room: THEATRE, count: { item: "test-swab", when: { procedure: { specimen: "extracted" } }, searchPlaces: ["t-swab"] } } });
    const escalated = { op: "escalate" as const, staff: "nurse-2", to: "surgeon", reason: "one swab is missing", at: 0, seq: 1 };
    const record = { item: "test-swab", room: THEATRE, expected: ["eq:t-swab"], entries: [escalated], unsafe: [] };
    const placed = { ...reduce(c, createSession(c), { type: "start", seat: "scrub-nurse" }).state, count: record };
    expect(placed.seat).toBe("scrub-nurse");
    expect(countLines(c, placed, "en")).toContain("  Escalated: you → surgeon.");
    expect(countLines(c, placed, "zh-CN")).toContain("  已上报：你 → surgeon。");
    const operating = { ...reduce(c, createSession(c), { type: "start" }).state, count: record };
    expect(countLines(c, operating, "en")).toContain("  Escalated: nurse-2 → surgeon.");
  });
});
