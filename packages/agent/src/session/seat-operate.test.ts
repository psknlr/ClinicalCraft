/**
 * A place in the care team in a session (docs/TEAM.md §1, docs/PROCEDURE.md §3 and §7): the learner's operative steps
 * are their place's — the first assistant takes port B and keeps its traction; a step outside the place's controls
 * (dissection) is refused NOT_AUTHORIZED before anyone is asked to approve it, in the learner's language; nobody but the
 * session names who acts (`actor`) or which step of a plan a step is (`ref`); a body-less call — the learner, the CLI,
 * MCP, the external clinician — is the learner's body (A6); a place needs in-world mode and is never the
 * demonstration's; and once a place's start is accepted the learner's body stands at the team's table, once.
 *
 * A place is taken by dispatching the start to the session kernel (`theatreSession({start})`): the learner's own path
 * still refuses one until a stand-in surgeon operates. The operator's steps are raw, actor-less dispatches.
 */
import { describe, expect, it } from "vitest";
import type { DomainEvent, SessionState } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import type { AgentEvent } from "../protocol.js";
import type { ToolContext } from "../tools/types.js";
import { MemoryTranscript, replayTranscript } from "../transcript.js";
import { ACCESS, kernelOf, LATERAL, operatorSteps, sendToScrubRoom, standAtTable, system, THEATRE, theatreSession } from "./__fixtures__/theatre.js";
import { offlineClinicianTurn, type AutopilotHost } from "./autopilot.js";
import { embodiedOfflineTurn, type EmbodiedAutopilotHost } from "./embodied-autopilot.js";

const FIRST = { type: "start", seat: "first-assistant" } as const;
const DISSECT = { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false } as const;
const TAKE_B = { op: "hand-over", port: "B", to: "doc-1" } as const;
const JOINED = /join the team at the operating table/;

/** An operative step through the learner's own path (`clinical_action`); its events. */
const learnerStep = (t: TestSession, op: Record<string, unknown>, extra: Record<string, unknown> = {}) => t.session.run({ type: "clinical_action", action: { type: "operate", op, ...extra } as never });

/** The operative steps the field recorded in these events: op and actor. */
const recorded = (events: readonly AgentEvent[]) =>
  events.flatMap((e) => (e.msg.type === "clinical_event" && e.msg.event.type === "procedure.step" ? [[e.msg.event.op, (e.msg.event as Extract<DomainEvent, { type: "procedure.step" }>).actor ?? null]] : []));

/** Every approval asked for (answered `approved`); the summaries. */
function approvals(t: TestSession): string[] {
  const asked: string[] = [];
  t.session.subscribe((e) => {
    if (e.msg.type !== "approval_request") return;
    asked.push(e.msg.summary);
    t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
  });
  return asked;
}

/** A tool call's end in a run. */
const ended = (events: readonly AgentEvent[], callId: string) => msgsOf(events, "tool_call_end").find((m) => m.callId === callId)!;

describe("the learner's operative steps are their place's", () => {
  it("the first assistant takes port B and keeps its traction — the place member's steps; the field shows them their place", async () => {
    const t = await theatreSession({ start: FIRST });
    operatorSteps(t, ACCESS);
    const take = await learnerStep(t, TAKE_B);
    const pull = await learnerStep(t, LATERAL);
    expect([...msgsOf(take, "error"), ...msgsOf(pull, "error"), ...msgsOf(take, "warning"), ...msgsOf(pull, "warning")]).toEqual([]);
    const p = t.session.state.procedure!;
    expect(p.ports.find((x) => x.site === "B")).toMatchObject({ holder: "doc-1", instrument: "grasper" });
    expect(p.retractions["gallbladder-infundibulum"]).toMatchObject({ port: "B" });
    // recorded as the first assistant's own steps — never typed in by the learner
    expect([...recorded(take), ...recorded(pull)]).toEqual([
      ["hand-over", "doc-1"],
      ["retract", "doc-1"],
    ]);
    const look = await t.session.run({ type: "external_tool_call", callId: "look", tool: "observe_field", args: {} });
    const field = ended(look, "look").output;
    expect(field).toContain("port B (working, 5 mm, left hand): grasper — held by you");
    expect(field).toContain("Your place: first assistant (id doc-1); your controls: Camera, Traction, Suction.");
    // the camera: the operator (the stand-in) holds it, named
    expect(field).toContain("Camera (port A): the whole field, wide — held by Dr Ito.");
    await t.session.close();
  });

  it("dissection is refused NOT_AUTHORIZED before any approval is asked — in English and in Chinese, by the learner and by a body-less external call", async () => {
    for (const [locale, said] of [
      ["en", "You are the first assistant: dissection is the operating surgeon's."],
      ["zh-CN", "你是第一助手：分离由主刀完成。"],
    ] as const) {
      const t = await theatreSession({ start: FIRST, settingsPatch: { locale, permissions: { ask: ["operate"] } } });
      operatorSteps(t, ACCESS);
      const asked = approvals(t);
      const steps = t.session.state.procedure!.counters.steps;
      const r = await learnerStep(t, DISSECT);
      expect(msgsOf(r, "error"), locale).toEqual([expect.objectContaining({ code: "NOT_AUTHORIZED", message: said })]);
      const ext = await t.session.run({ type: "external_tool_call", callId: "x", tool: "operate", args: DISSECT });
      expect(ended(ext, "x"), locale).toMatchObject({ output: said, data: { code: "NOT_AUTHORIZED" } });
      expect(asked, locale).toEqual([]);
      expect(t.session.state.procedure!.counters.steps, locale).toBe(steps);
      // what the place may do still asks, as the rules say
      await learnerStep(t, TAKE_B);
      expect(asked.length, locale).toBe(1);
      expect(t.session.state.procedure!.ports.find((x) => x.site === "B")!.holder, locale).toBe("doc-1");
      await t.session.close();
    }
  });

  it("a refusal by the field keeps the engine's English message after the reason said in the learner's words", async () => {
    for (const [locale, lead] of [
      ["en", "Port C is the operator's: it has not been handed to you."],
      ["zh-CN", "C 孔属于术者：尚未交给你。"],
    ] as const) {
      const t = await theatreSession({ start: FIRST, settingsPatch: { locale } });
      operatorSteps(t, ACCESS);
      const pullC = { ...LATERAL, port: "C" };
      const r = await learnerStep(t, pullC);
      expect(msgsOf(r, "warning")[0]!.message, locale).toContain(`${lead} Port "C" is the operator's: it has not been handed to doc-1.`);
      const ext = await t.session.run({ type: "external_tool_call", callId: "x", tool: "operate", args: pullC });
      expect(ended(ext, "x").output, locale).toContain(`${lead} Port "C" is the operator's: it has not been handed to doc-1.`);
      await t.session.close();
    }
  });

  it("nobody but the session names who acts or which plan step a step is: a forged actor and a ref are refused", async () => {
    const t = await theatreSession({ start: FIRST });
    operatorSteps(t, ACCESS);
    const forged = await learnerStep(t, TAKE_B, { actor: "doc-0" });
    expect(msgsOf(forged, "error")[0]).toMatchObject({ code: "permission_denied" });
    const planned = await learnerStep(t, TAKE_B, { ref: "standin:3" });
    expect(msgsOf(planned, "error")[0]).toMatchObject({ code: "permission_denied" });
    expect(msgsOf(planned, "error")[0]!.message).toMatch(/recorded by the care team, never entered/);
    const p = t.session.state.procedure!;
    expect(p.ports.find((x) => x.site === "B")!.holder).toBeUndefined();
    expect(p.refs).toBeUndefined();
    await t.session.close();
  });

  it("without a place the learner operates as always: every step the operator's, no actor", async () => {
    const t = await theatreSession();
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    system(t, { type: "set-phase", phase: "theatre", by: "system" });
    standAtTable(t, PRIMARY_ACTOR);
    const events: AgentEvent[] = [];
    for (const op of [...ACCESS, LATERAL, DISSECT]) {
      const r = await learnerStep(t, op);
      expect(msgsOf(r, "error"), op.op).toEqual([]);
      events.push(...r);
    }
    expect(recorded(events).map(([, actor]) => actor)).toEqual(Array(ACCESS.length + 2).fill(null));
    expect(t.session.state.seat).toBeUndefined();
    const look = await t.session.run({ type: "external_tool_call", callId: "look", tool: "observe_field", args: {} });
    expect(ended(look, "look").output).not.toMatch(/Your place/);
    await t.session.close();
  });
});

describe("a body-less call is the learner's body (A6)", () => {
  it("in a place, an MCP-style and a CLI-style dissection are refused NOT_AUTHORIZED; what the place may do, they do as the place", async () => {
    const t = await theatreSession({ start: FIRST });
    operatorSteps(t, ACCESS);
    const s = t.session;
    const steps = s.state.procedure!.counters.steps;
    // MCP: the bridge runs the session's own tool with the learner's context and no body (mcp bridge.ts `context`)
    const operate = s.tool("operate")!;
    const mcp = { caseDef: s.caseDef, facility: s.facility, catalogs: s.catalogs, locale: s.locale, agent: "learner", state: () => s.state, dispatch: (a) => s.dispatch(a), ask: async () => ({ text: "", grounded: [] }), updatePlan: () => undefined } as ToolContext;
    expect(operate.precheck!(DISSECT, mcp)).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED" } });
    expect(await operate.run(DISSECT, mcp)).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED" } });
    // the CLI: a slash command's tool runs on the learner's own tool path, with no body
    const cli = await kernelOf(t).learner.runToolDetailed("cli", "operate", DISSECT);
    expect(cli).toMatchObject({ status: "error", output: { ok: false, data: { code: "NOT_AUTHORIZED" } } });
    expect(s.state.procedure!.counters.steps).toBe(steps);
    // a step the place may do is the place's, whoever sends it without a body
    expect(await operate.run(TAKE_B, mcp)).toMatchObject({ ok: true });
    expect(s.state.procedure!.ports.find((x) => x.site === "B")!.holder).toBe("doc-1");
    await s.close();
  });
});

describe("where a place is offered", () => {
  it("a place needs in-world mode (not_embodied); in-world the learner's own start in one is not offered yet; the surgeon's place is the learner as always", async () => {
    const c = await theatreSession({ clinical: true });
    const refused = await c.session.run({ type: "clinical_action", action: FIRST });
    expect(msgsOf(refused, "error")[0]).toMatchObject({ code: "not_embodied" });
    expect(msgsOf(refused, "error")[0]!.message).toMatch(/first assistant's place in the team needs in-world mode/);
    expect(c.session.state.started).toBe(false);
    await c.session.close();
    const e = await theatreSession();
    const notYet = await e.session.run({ type: "clinical_action", action: FIRST });
    expect(msgsOf(notYet, "error")[0]).toMatchObject({ code: "permission_denied" });
    expect(e.session.state.started).toBe(false);
    await e.session.run({ type: "clinical_action", action: { type: "start", seat: "surgeon" } });
    expect(e.session.state).toMatchObject({ started: true });
    expect(e.session.state.seat).toBeUndefined();
    await e.session.close();
  });

  it("the demonstration is refused in a place: nothing is done, and it says why", async () => {
    const t = await theatreSession({ start: FIRST });
    const seq = t.session.state.seq;
    const r = await t.session.run({ type: "autopilot", maxTurns: 3 });
    expect(msgsOf(r, "error")[0]).toMatchObject({ code: "permission_denied" });
    expect(msgsOf(r, "error")[0]!.message).toMatch(/The demonstration works the case as the operating surgeon: it does not run while you hold the first assistant's place/);
    expect(t.session.state.seq).toBe(seq);
    await t.session.close();
    // each walkthrough turn says so and does nothing — in clinical mode and in-world
    const said: string[] = [];
    const host = {
      caseDef: t.session.caseDef,
      locale: "zh-CN",
      state: () => ({ seat: "scrub-nurse" }) as SessionState,
      narrate: (_turn: string, text: string) => void said.push(text),
    } as unknown as AutopilotHost;
    expect(await offlineClinicianTurn(host, "t1", 10)).toMatchObject({ done: true, toolCalls: 0 });
    expect(await embodiedOfflineTurn(host, {} as EmbodiedAutopilotHost, "t2", 10)).toMatchObject({ done: true, toolCalls: 0 });
    expect(said).toEqual(["示范接诊是以主刀医生的身份完成病例：你担任洗手护士岗位时不能使用。", "示范接诊是以主刀医生的身份完成病例：你担任洗手护士岗位时不能使用。"]);
  });
});

describe("the learner's body joins the team at the table", () => {
  it("after a place's start the body stands at the team's table — once: a save and resume, from the snapshot or the transcript, restores it where it was", async () => {
    const transcript = new MemoryTranscript();
    const t = await theatreSession({ start: FIRST, transcript });
    const w = t.session.world()!;
    expect(w.roomOf(PRIMARY_ACTOR)).toBe(THEATRE);
    expect(w.checkSpatial(PRIMARY_ACTOR, { tool: "operate", kind: "operate" }).ok).toBe(true);
    expect(t.msgs("notification").filter((n) => JOINED.test(n.body)).map((n) => n.body)).toEqual(["You join the team at the operating table as the first assistant."]);
    // one recorded action: the start in the place (the join is the start's, docs/TEAM.md §1)
    expect(t.session.snapshot().actions).toEqual([expect.objectContaining({ type: "start", seat: "first-assistant" })]);
    // the learner steps out to the scrub room, and the encounter is saved there
    sendToScrubRoom(t);
    const away = w.actor(PRIMARY_ACTOR)!.pose;
    expect(w.roomOf(PRIMARY_ACTOR)).not.toBe(THEATRE);
    const saved = JSON.parse(JSON.stringify(t.session.snapshot()));
    await t.session.close();
    const fromSnapshot = await theatreSession({ resume: { sessionId: saved.sessionId, actions: saved.actions, messages: saved.messages, dialogue: saved.dialogue }, embodied: { snapshot: saved.world } });
    expect(fromSnapshot.session.state.seat).toBe("first-assistant");
    expect(fromSnapshot.session.world()!.actor(PRIMARY_ACTOR)!.pose).toEqual(away);
    expect(fromSnapshot.msgs("notification").filter((n) => JOINED.test(n.body))).toEqual([]);
    await fromSnapshot.session.close();
    const replayed = replayTranscript(transcript.items);
    const fromTranscript = await theatreSession({ resume: { sessionId: t.session.id, actions: replayed.actions, messages: replayed.messages }, embodied: { snapshot: replayed.world! } });
    expect(fromTranscript.session.state.seat).toBe("first-assistant");
    expect(fromTranscript.session.world()!.actor(PRIMARY_ACTOR)!.pose).toEqual(away);
    expect(fromTranscript.msgs("notification").filter((n) => JOINED.test(n.body))).toEqual([]);
    await fromTranscript.session.close();
  });

  it("without a place the learner's body is not moved at the start", async () => {
    const t = await theatreSession();
    const before = t.session.world()!.actor(PRIMARY_ACTOR)!.pose;
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    expect(t.session.world()!.actor(PRIMARY_ACTOR)!.pose).toEqual(before);
    expect(t.msgs("notification").filter((n) => JOINED.test(n.body))).toEqual([]);
    await t.session.close();
  });
});
