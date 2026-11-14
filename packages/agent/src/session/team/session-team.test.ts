/**
 * The care team in a session (docs/TEAM.md §5): the `team` op needs a case team in in-world mode, and a resume
 * restores the last saved team (`team` transcript items; anything malformed is ignored).
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { makeSession, msgsOf, type TestSession } from "../../__fixtures__/harness.js";
import { parseAgentMarkdown } from "../../agents/markdown.js";
import type { AgentEvent } from "../../protocol.js";
import { replayTranscript } from "../../transcript.js";
import { LAP_CHOLE_TEAM } from "../../../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { LAP_CHOLE_SIT } from "../../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import type { EventMsg } from "../../protocol.js";
import { ACCESS, kernelOf, LATERAL, operatorSteps, sendToScrubRoom, STAFF, standAtTable, THEATRE, theatreCase, theatreSession, WHOLE_OPERATION } from "../__fixtures__/theatre.js";
import type { TranscriptItem } from "../types.js";
import { validTeamCheckpoint } from "./checkpoint.js";
import type { TeamCheckpoint, TeamMessage } from "./types.js";

const checkpoint = (round: number): TeamCheckpoint => ({
  format: "clinicalcraft-team@1",
  state: { version: 1, scenario: "s", round, seq: 0, members: [], messages: [], receipts: [], tasks: [], claims: {}, completed: [], posted: [], extra: [] },
  autonomy: "auto",
  surgeon: "learner",
});

describe("the care team in a session", () => {
  it("a case without a team: the team op is refused, in the session's language", async () => {
    const t = await makeSession();
    const events = await t.session.run({ type: "team", action: "step" });
    expect(msgsOf(events, "error")).toMatchObject([{ code: "no_team" }]);
    expect(msgsOf(events, "team_event")).toEqual([]);
    await t.session.close();
  });

  it("resume: the last well-formed team checkpoint of the transcript", () => {
    const item = (ordinal: number, payload: unknown) => ({ type: "team", ordinal, ts: "", payload }) as TranscriptItem;
    const replayed = replayTranscript([item(1, { checkpoint: checkpoint(3) }), item(2, { checkpoint: checkpoint(7) }), item(3, { checkpoint: { format: "other" } })]);
    expect(replayed.team?.state.round).toBe(7);
    expect(replayTranscript([]).team).toBeNull();
  });

  it("a saved team is checked before it is trusted", () => {
    expect(validTeamCheckpoint(checkpoint(1))).not.toBeNull();
    expect(validTeamCheckpoint({ ...checkpoint(1), autonomy: "sometimes" })).toBeNull();
    expect(validTeamCheckpoint({ ...checkpoint(1), state: { ...checkpoint(1).state, version: 2 } })).toBeNull();
    expect(validTeamCheckpoint(null)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* At the operating table (docs/TEAM.md §4.4, §4.5)                    */
/* ------------------------------------------------------------------ */

type ApprovalAsked = Extract<EventMsg, { type: "approval_request" }>;

const B_TRACTION = { op: "traction", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"] } as const;

/** The team's events in a run. */
const teamOf = (events: readonly AgentEvent[]) => msgsOf(events, "team_event").map((m) => m.event);
const saidIn = (events: readonly AgentEvent[]) => teamOf(events).flatMap((e) => (e.kind === "message" ? [e.message] : []));
const receiptsIn = (events: readonly AgentEvent[]) => teamOf(events).flatMap((e) => (e.kind === "receipt" ? [e.receipt] : []));

/** The theatre, the operation begun by its operator (no place: the learner), the learner's body at the table. */
async function atTheTable(settingsPatch: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): Promise<TestSession> {
  const t = await theatreSession({ settingsPatch, ...extra });
  await t.session.run({ type: "clinical_action", action: { type: "start" } });
  operatorSteps(t, ACCESS);
  standAtTable(t, PRIMARY_ACTOR);
  return t;
}

/** The learner asks, the member reads it back and the learner confirms: the events of the three, and the read-back. */
async function askAndConfirm(t: TestSession, to: string, field: Record<string, unknown>): Promise<{ events: AgentEvent[]; readback: TeamMessage }> {
  const asked = await t.session.run({ type: "team", action: "ask", to, field } as never);
  expect(msgsOf(asked, "error")).toEqual([]);
  const readback = saidIn(asked).find((m) => m.kind === "readback");
  expect(readback, "a read-back").toBeDefined();
  const confirmed = await t.session.run({ type: "team", action: "reply", message: readback!.id, kind: "confirm" });
  expect(msgsOf(confirmed, "error")).toEqual([]);
  return { events: [...asked, ...confirmed], readback: readback! };
}

/**
 * What a front-end following each agent's phase holds after these events (the web store's `phases` and its running
 * tools): an agent whose turn never idled, or a tool call never ended, would keep `agentDriving` and stop the clocks.
 */
function stillDriving(events: readonly AgentEvent[]): string[] {
  const phases = new Map<string, string>();
  const running = new Map<string, string>();
  for (const { msg } of events) {
    if (msg.type === "turn_started") phases.set(String(msg.agent), "awaiting_model");
    else if (msg.type === "turn_phase") msg.phase === "idle" ? phases.delete(String(msg.agent)) : phases.set(String(msg.agent), msg.phase);
    else if (msg.type === "tool_call_begin") {
      phases.set(String(msg.agent), "executing_tools");
      running.set(msg.callId, msg.tool);
    } else if (msg.type === "tool_call_end") running.delete(msg.callId);
  }
  return [...[...phases.keys()].map((a) => `phase:${a}`), ...[...running.values()].map((tool) => `tool:${tool}`)];
}

describe("the team's status and the learner's replies", () => {
  it("status carries the learner's place and line-up (absent without them)", async () => {
    const placed = await theatreSession({ start: { type: "start", seat: "second-assistant", lineup: "three-surgeons" } });
    const status = teamOf(await placed.session.run({ type: "team", action: "step" })).filter((e) => e.kind === "status");
    expect(status.at(-1)).toMatchObject({ kind: "status", seat: "second-assistant", lineup: "three-surgeons", surgeon: "learner" });
    await placed.session.close();
    const plain = await atTheTable();
    const none = teamOf(await plain.session.run({ type: "team", action: "step" })).filter((e) => e.kind === "status");
    expect(none.at(-1)).not.toHaveProperty("seat");
    expect(none.at(-1)).not.toHaveProperty("lineup");
    await plain.session.close();
  });

  it("observing, the learner's part is played for them: a reply, an ask and a count are refused, in both languages", async () => {
    for (const [locale, said] of [
      ["en", /You are observing: the team plays your part/],
      ["zh-CN", /你正在观察：你的岗位由团队代为完成/],
    ] as const) {
      const t = await atTheTable({ locale });
      await t.session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
      const reply = await t.session.run({ type: "team", action: "reply", message: "msg-1", kind: "confirm" });
      expect(msgsOf(reply, "error"), locale).toEqual([expect.objectContaining({ code: "permission_denied", message: expect.stringMatching(said) })]);
      const ask = await t.session.run({ type: "team", action: "ask", to: "doc-1", field: B_TRACTION } as never);
      expect(msgsOf(ask, "error"), locale).toEqual([expect.objectContaining({ code: "permission_denied" })]);
      expect(saidIn(ask), locale).toEqual([]);
      await t.session.close();
    }
  });

  it("need.for names a member of the team (the surgeon by default)", async () => {
    const t = await atTheTable();
    const nobody = await t.session.run({ type: "team", action: "need", item: "test-swab", for: "porter-1" });
    expect(msgsOf(nobody, "error")).toEqual([expect.objectContaining({ code: "invalid_op", message: "There is nobody called porter-1 in the team." })]);
    expect(t.session.team()!.state.posted).toEqual([]);
    const surgeon = await t.session.run({ type: "team", action: "need", item: "test-swab" });
    expect(msgsOf(surgeon, "error")).toEqual([]);
    expect(t.session.team()!.state.extra).toEqual([expect.objectContaining({ item: "test-swab", for: "surgeon" })]);
    const assistant = await t.session.run({ type: "team", action: "need", item: "test-swab", for: "staff:doc-1" });
    expect(msgsOf(assistant, "error")).toEqual([]);
    expect(t.session.team()!.state.extra.at(-1)).toMatchObject({ for: "doc-1" });
    await t.session.close();
  });
});

describe("whom a need is for", () => {
  it("in a place the stand-in's own id is the surgeon's; a member's id is theirs; anyone else is refused", async () => {
    const t = await theatreSession({ start: { type: "start", seat: "first-assistant" } });
    for (const forRef of ["doc-0", "staff:doc-0", "surgeon"]) {
      expect(msgsOf(await t.session.run({ type: "team", action: "need", item: "test-swab", for: forRef }), "error"), forRef).toEqual([]);
      expect(t.session.team()!.state.extra.at(-1), forRef).toMatchObject({ item: "test-swab", for: "surgeon" });
    }
    // the learner's own place is a member: the need is theirs
    expect(msgsOf(await t.session.run({ type: "team", action: "need", item: "test-swab", for: "doc-1" }), "error")).toEqual([]);
    expect(t.session.team()!.state.extra.at(-1)).toMatchObject({ for: "doc-1" });
    // the colleague of the line-up not chosen, a porter: not in this team
    for (const forRef of ["doc-2", "porter-1"]) expect(msgsOf(await t.session.run({ type: "team", action: "need", item: "test-swab", for: forRef }), "error"), forRef).toEqual([expect.objectContaining({ code: "invalid_op", message: `There is nobody called ${forRef} in the team.` })]);
    await t.session.close();
  });

  it("a team that lists no surgeon member: the need is still the surgeon's by default — and the team sees it through", async () => {
    const team = structuredClone(LAP_CHOLE_TEAM) as { members: { staff: string }[]; room: string };
    team.members = team.members.filter((m) => m.staff !== "surgeon");
    team.room = THEATRE;
    const t = await theatreSession({ caseDef: theatreCase({ team }) });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    operatorSteps(t, ACCESS);
    standAtTable(t, PRIMARY_ACTOR);
    for (const asked of [{}, { for: "surgeon" }]) {
      const need = await t.session.run({ type: "team", action: "need", item: "test-swab", ...asked });
      expect(msgsOf(need, "error"), JSON.stringify(asked)).toEqual([]);
      expect(t.session.team()!.state.extra.at(-1)).toMatchObject({ item: "test-swab", for: "surgeon" });
    }
    // the circulating nurse noticed it and said so to the surgeon
    expect(t.session.team()!.state.messages.some((m) => m.kind === "notice" && m.to === PRIMARY_ACTOR)).toBe(true);
    await t.session.close();
  });
});

describe("team ask: a closed loop at the operating table", () => {
  it("the learner (the operating surgeon) asks the first assistant for traction on port B: read-back, confirm, they walk, take the port, pull — 'Holding.'; then to let go", async () => {
    const t = await atTheTable();
    const { events, readback } = await askAndConfirm(t, "doc-1", B_TRACTION);
    const request = saidIn(events).find((m) => m.kind === "request")!;
    expect(request).toMatchObject({ from: PRIMARY_ACTOR, to: STAFF.first, about: { field: { op: "traction", port: "B", force: "firm" } } });
    expect(request.text.en).toBe("Dr Abe, please hold the grasper in port B, pulling the infundibulum to the patient's left and caudally.");
    expect(request.text["zh-CN"]).toBe("阿部医生，请拉住 B 孔的抓钳，把Infundibulum向患者左侧、尾侧牵拉。");
    expect(readback).toMatchObject({ from: STAFF.first, to: PRIMARY_ACTOR, replyTo: request.id });
    expect(readback.text.en).toBe("The grasper in port B, pulling the infundibulum to the patient's left and caudally — confirm?");
    // nothing is done before the confirmation
    expect(t.session.state.procedure!.ports.find((p) => p.site === "B")!.holder).toBeUndefined();
    const ran = await t.session.run({ type: "team", action: "run" });
    const acts = receiptsIn(ran).filter((r) => r.actor === STAFF.first);
    expect(acts.map((r) => (r.operation === "operate" ? `operate:${r.step}` : r.operation))).toEqual(["navigate", "operate:hand-over", "operate:retract"]);
    expect(acts.every((r) => r.outcome === "completed" && r.initiator === PRIMARY_ACTOR && /^team\.task-\d+\.\d+$/u.test(r.id))).toBe(true);
    const p = t.session.state.procedure!;
    expect(p.ports.find((x) => x.site === "B")).toMatchObject({ holder: "doc-1", instrument: "grasper" });
    expect(p.retractions["gallbladder-infundibulum"]).toMatchObject({ port: "B", force: "firm" });
    // the steps are the first assistant's own, each recorded once with its action id
    expect(p.refs).toEqual(acts.filter((r) => r.operation === "operate").map((r) => r.id));
    const report = saidIn(ran).at(-1)!;
    expect(report).toMatchObject({ from: STAFF.first, to: PRIMARY_ACTOR, kind: "report", text: { en: "Holding.", "zh-CN": "拉住了。" } });
    expect(msgsOf(ran, "agent_message").map((m) => `${m.speaker}: ${m.text}`)).toContain("Dr Abe: Holding.");
    // asked to let go: said first, then the traction released and the port handed back
    const letGo = await askAndConfirm(t, "doc-1", { op: "release" });
    expect(letGo.readback.text.en).toBe("Letting go of everything I hold — confirm?");
    const released = await t.session.run({ type: "team", action: "run" });
    expect(saidIn(released).map((m) => m.text.en)).toEqual(["Letting go now."]);
    expect(receiptsIn(released).map((r) => r.step)).toEqual(["release", "hand-over"]);
    const after = t.session.state.procedure!;
    expect(after.ports.find((x) => x.site === "B")!.holder).toBeUndefined();
    expect(after.retractions["gallbladder-infundibulum"]).toBeUndefined();
    await t.session.close();
  });

  it("the turn of every team step closes in the default approval mode — no approval asked, nothing left driving: the clocks keep running", async () => {
    const t = await atTheTable({ approvalMode: "default" });
    const all: AgentEvent[] = [];
    all.push(...(await askAndConfirm(t, "doc-1", B_TRACTION)).events);
    all.push(...(await t.session.run({ type: "team", action: "run" })));
    all.push(...(await askAndConfirm(t, "doc-1", { op: "release" })).events);
    all.push(...(await t.session.run({ type: "team", action: "run" })));
    const started = msgsOf(all, "turn_started").filter((m) => m.agent === "team");
    expect(started.length).toBe(4);
    for (const turn of started) {
      const own = all.map((e) => e.msg).filter((m) => "turnId" in m && m.turnId === turn.turnId);
      expect(own.map((m) => m.type)).toEqual(["turn_started", "tool_call_begin", "tool_call_end", "turn_complete", "turn_phase"]);
      expect(own.at(-1)).toMatchObject({ type: "turn_phase", agent: "team", phase: "idle" });
    }
    expect(msgsOf(all, "approval_request")).toEqual([]);
    expect(stillDriving(all)).toEqual([]);
    // and the encounter goes on: the staff's own round and the team's round still run
    expect(msgsOf(await t.session.run({ type: "staff_step" }), "error")).toEqual([]);
    expect(teamOf(await t.session.run({ type: "team", action: "step" })).some((e) => e.kind === "status")).toBe(true);
    await t.session.close();
  });

  it("asking someone who cannot: the scrub nurse and the anaesthetist decline traction at once, saying why and who can — in both languages", async () => {
    const t = await atTheTable();
    const scrub = saidIn(await t.session.run({ type: "team", action: "ask", to: "nurse-2", field: B_TRACTION } as never));
    expect(scrub.map((m) => [m.from, m.kind])).toEqual([
      [PRIMARY_ACTOR, "request"],
      [STAFF.scrub, "decline"],
    ]);
    expect(scrub[1]!.text).toEqual({ en: "I don't hold the Traction control: ask Dr Abe.", "zh-CN": "我没有牵引显露的分工权限：请找阿部医生。" });
    expect(scrub[1]!.about).toMatchObject({ reason: "no-control" });
    const anaesthetist = saidIn(await t.session.run({ type: "team", action: "ask", to: "anaes-1", field: { op: "camera" } } as never));
    expect(anaesthetist[1]).toMatchObject({ from: STAFF.anaesthetist, kind: "decline", about: { reason: "no-control" } });
    expect(anaesthetist[1]!.text.en).toBe("I don't hold the Camera control: ask Dr Abe.");
    // nothing moved
    expect(t.session.state.procedure!.ports.every((p) => p.holder === undefined)).toBe(true);
    await t.session.close();
  });

  it("in a place, a decline never sends the learner to themselves: holding the control, they are told it is theirs — in both languages", async () => {
    for (const [locale, line] of [
      ["en", "I don't hold the Traction control: you do."],
      ["zh-CN", "我没有牵引显露的分工权限：你有。"],
    ] as const) {
      const t = await theatreSession({ start: { type: "start", seat: "first-assistant" }, settingsPatch: { locale } });
      operatorSteps(t, ACCESS);
      standAtTable(t, PRIMARY_ACTOR);
      expect(t.session.state.seat).toBe("first-assistant");
      const said = saidIn(await t.session.run({ type: "team", action: "ask", to: "nurse-2", field: B_TRACTION } as never));
      expect(said[1], locale).toMatchObject({ from: STAFF.scrub, to: PRIMARY_ACTOR, kind: "decline", about: { reason: "no-control" } });
      expect(said[1]!.text[locale], locale).toBe(line);
      await t.session.close();
    }
  });

  it("a camera step the field would refuse — closer with nothing aimed at — is declined, and the camera is never taken for it", async () => {
    const t = await atTheTable();
    // the field out of sight from where he stands: read back; then, at the table, declined — before any hand-over
    await askAndConfirm(t, "doc-1", { op: "zoom", zoom: "close" });
    const ran = await t.session.run({ type: "team", action: "run" });
    expect(receiptsIn(ran).map((r) => r.step ?? r.operation)).toEqual(["navigate"]);
    expect(saidIn(ran)).toEqual([expect.objectContaining({ from: STAFF.first, to: PRIMARY_ACTOR, kind: "decline", about: expect.objectContaining({ reason: "aim-first" }), text: { en: "A close view needs something to look at: tell me where to aim the camera first.", "zh-CN": "推近需要先对准一个部位：请先告诉我镜头对准哪里。" } })]);
    expect(t.session.state.procedure!.ports.find((p) => p.site === "A")!.holder).toBeUndefined();
    await t.session.close();
  });

  it("asked to let go holding nothing: declined — never 'Letting go now.'", async () => {
    const t = await atTheTable();
    // read back from where he stands (the field out of sight); at the table, he sees he holds nothing
    await askAndConfirm(t, "doc-1", { op: "release" });
    const ran = await t.session.run({ type: "team", action: "run" });
    expect(receiptsIn(ran).map((r) => r.step ?? r.operation)).toEqual(["navigate"]);
    expect(saidIn(ran)).toEqual([expect.objectContaining({ from: STAFF.first, kind: "decline", about: expect.objectContaining({ reason: "nothing-held" }), text: { en: "I'm not holding anything.", "zh-CN": "我手上没有握持器械。" } })]);
    expect(t.session.team()!.state.tasks.find((x) => x.kind === "assist")).toMatchObject({ status: "declined", reason: "nothing-held" });
    await t.session.close();
  });

  it("asking someone who is not in the theatre now is refused, saying so — nothing is said that nobody hears", async () => {
    const t = await atTheTable();
    sendToScrubRoom(t, STAFF.first);
    const away = await t.session.run({ type: "team", action: "ask", to: "doc-1", field: B_TRACTION } as never);
    expect(msgsOf(away, "error")).toEqual([expect.objectContaining({ code: "permission_denied", message: "Dr Abe is not in the theatre now: ask a colleague at the table." })]);
    expect(saidIn(away)).toEqual([]);
    expect(t.session.team()!.state.messages).toEqual([]);
    await t.session.close();
  });

  it("whom the learner may ask: a member of the team, not their own place, not one away, not the one who operates", async () => {
    const t = await atTheTable();
    const nobody = await t.session.run({ type: "team", action: "ask", to: "porter-1", field: B_TRACTION } as never);
    expect(msgsOf(nobody, "error")).toEqual([expect.objectContaining({ code: "invalid_op", message: "There is nobody called porter-1 in the team." })]);
    const self = await t.session.run({ type: "team", action: "ask", to: "surgeon", field: B_TRACTION } as never);
    expect(msgsOf(self, "error")).toEqual([expect.objectContaining({ code: "permission_denied" })]);
    const malformed = await t.session.run({ type: "team", action: "ask", to: "doc-1", field: { op: "traction", port: "B" } } as never);
    expect(msgsOf(malformed, "error")).toEqual([expect.objectContaining({ code: "invalid_op" })]);
    await t.session.close();
    const placed = await theatreSession({ start: { type: "start", seat: "first-assistant" } });
    operatorSteps(placed, ACCESS);
    const operator = await placed.session.run({ type: "team", action: "ask", to: "doc-0", field: { op: "pass", instrument: "maryland" } } as never);
    expect(msgsOf(operator, "error")).toEqual([expect.objectContaining({ code: "permission_denied", message: "Dr Ito is operating: ask a colleague at the table." })]);
    const own = await placed.session.run({ type: "team", action: "ask", to: "doc-1", field: B_TRACTION } as never);
    expect(msgsOf(own, "error")).toEqual([expect.objectContaining({ message: "That is your own place in the team: ask a colleague." })]);
    await placed.session.close();
  });

  /**
   * The session saved part-way through a request — the team restored as it was saved right after the confirmation, before
   * any act (its record behind the field's and the world's, as after a crash in the middle of `team run`) — and the team
   * run again.
   */
  async function restoredBehind(t: TestSession, to: string, field: Record<string, unknown>, until: (t: TestSession) => boolean): Promise<{ r: TestSession; ran: AgentEvent[] }> {
    await askAndConfirm(t, to, field);
    const lagging = structuredClone(t.session.team()!);
    // the confirmation said, not yet taken in; no act done
    expect(lagging.state.tasks.find((x) => x.kind === "assist")).toMatchObject({ status: "asked", acts: 0 });
    for (let i = 0; i < 12 && !until(t); i++) await t.session.run({ type: "team", action: "step" });
    expect(until(t)).toBe(true);
    const saved = JSON.parse(JSON.stringify(t.session.snapshot())) as ReturnType<typeof t.session.snapshot>;
    await t.session.close();
    const r = await theatreSession({ resume: { sessionId: saved.sessionId, actions: saved.actions, messages: saved.messages, dialogue: saved.dialogue }, embodied: { snapshot: saved.world!, team: lagging } } as never);
    return { r, ran: await r.session.run({ type: "team", action: "run" }) };
  }

  /** The team's steps in the field, as the session recorded them (each with its action id as `ref`). */
  const teamSteps = (t: TestSession) => t.session.snapshot().actions.flatMap((a) => (a.type === "operate" && a.ref?.startsWith("team.") ? [{ op: a.op.op, ref: a.ref }] : []));
  const holderOf = (t: TestSession, site: string) => t.session.state.procedure!.ports.find((p) => p.site === site)!.holder;
  const pulling = (t: TestSession) => t.session.state.procedure!.retractions["gallbladder-infundibulum"] !== undefined;

  it("saved and restored in the middle of the request, the team's record behind the field's: every act is carried out exactly once (team.<task>.<n>)", async () => {
    // the first assistant walks to the table first (act 1, the world's), then takes port B (2) and pulls (3): saved after
    // the hand-over, or after every act
    for (const cut of ["after the hand-over", "after every act"] as const) {
      const { r, ran } = await restoredBehind(await atTheTable(), "doc-1", B_TRACTION, (t) => (cut === "after the hand-over" ? holderOf(t, "B") === "doc-1" : pulling(t)));
      // nothing done twice: after the hand-over only the traction; after every act no step and no walk at all
      expect(receiptsIn(ran).map((x) => x.step ?? x.operation), cut).toEqual(cut === "after the hand-over" ? ["retract"] : []);
      expect(pulling(r), cut).toBe(true);
      const steps = teamSteps(r);
      expect(steps.map((x) => x.op), cut).toEqual(["hand-over", "retract"]);
      expect(new Set(steps.map((x) => x.ref)).size, cut).toBe(2);
      expect(r.session.state.procedure!.refs, cut).toEqual(steps.map((x) => x.ref));
      // the report is said from the restored record (the record it was said in was lost with the team's)
      expect(saidIn(ran).map((m) => m.text.en), cut).toEqual(["Holding."]);
      const receipts = r.session.team()!.state.receipts.map((x) => x.id);
      expect(new Set(receipts).size, cut).toBe(receipts.length);
      await r.session.close();
    }
  });

  it("restored behind the field with the assistant at the table from the start: the traction gets an id of its own — never the hand-over's — and is done", async () => {
    const t = await atTheTable();
    standAtTable(t, STAFF.first, -0.6);
    const { r, ran } = await restoredBehind(t, "doc-1", B_TRACTION, (x) => holderOf(x, "B") === "doc-1");
    // the hand-over was act 1: the traction is act 2, carried out (not taken for done under the hand-over's id)
    expect(receiptsIn(ran).map((x) => `${x.step}:${x.outcome}`)).toEqual(["retract:completed"]);
    expect(pulling(r)).toBe(true);
    const steps = teamSteps(r);
    expect(steps.map((x) => x.op)).toEqual(["hand-over", "retract"]);
    expect(steps.map((x) => x.ref.replace(/^team\.task-\d+\./u, ""))).toEqual(["1", "2"]);
    expect(saidIn(ran).map((m) => m.text.en)).toEqual(["Holding."]);
    await r.session.close();
  });

  it("restored behind the field after the scrub nurse's pass: never passed again, and reported as passed", async () => {
    const t = await atTheTable();
    const { r, ran } = await restoredBehind(t, "nurse-2", { op: "pass", instrument: "hook" }, (x) => (x.session.state.procedure!.passed ?? []).length > 0);
    expect(receiptsIn(ran).filter((x) => x.operation === "operate")).toEqual([]);
    expect(r.session.state.procedure!.passed).toEqual([{ instrument: "hook", by: "nurse-2" }]);
    expect(teamSteps(r).map((x) => x.op)).toEqual(["pass"]);
    expect(saidIn(ran).map((m) => [m.from, m.kind, m.text.en])).toEqual([[STAFF.scrub, "report", "Passed."]]);
    expect(r.session.team()!.state.tasks.find((x) => x.kind === "assist")).toMatchObject({ status: "done" });
    await r.session.close();
  });
});

describe("the camera holder follows the work", () => {
  /** The operator's dissection in the hepatocystic triangle (its first two steps); then the rest of it and a first step in the cystic plate. */
  const TRIANGLE = WHOLE_OPERATION.slice(6, 8);
  const PLATE = WHOLE_OPERATION.slice(8, 13);

  /** The theatre with the first assistant holding the camera, taken when the learner asked for it. */
  async function cameraHeld(): Promise<TestSession> {
    const t = await atTheTable();
    await askAndConfirm(t, "doc-1", { op: "camera" });
    const took = await t.session.run({ type: "team", action: "run" });
    expect(saidIn(took).at(-1)).toMatchObject({ from: STAFF.first, kind: "report", text: { en: "I have the camera." } });
    expect(t.session.state.procedure!.ports.find((p) => p.site === "A")!.holder).toBe("doc-1");
    return t;
  }

  it("holding the camera, the first assistant follows the operator's work, one round later: one aim for each change of region, nothing said", async () => {
    const t = await cameraHeld();
    // no tissue step yet: nothing to follow
    expect(receiptsIn(await t.session.run({ type: "team", action: "step" }))).toEqual([]);
    // the operator works in the hepatocystic triangle: the next round, the camera is there
    operatorSteps(t, [LATERAL, ...TRIANGLE]);
    const first = await t.session.run({ type: "team", action: "step" });
    expect(receiptsIn(first).map((r) => [r.actor, r.step, r.outcome])).toEqual([[STAFF.first, "aim", "completed"]]);
    expect(t.session.state.procedure!.camera).toMatchObject({ at: "hepatocystic-triangle" });
    expect(saidIn(first)).toEqual([]);
    // the work stays there: nothing more, round after round
    for (let i = 0; i < 3; i++) expect(receiptsIn(await t.session.run({ type: "team", action: "step" }))).toEqual([]);
    // the work moves on to the cystic plate: one more aim
    operatorSteps(t, PLATE);
    const second = await t.session.run({ type: "team", action: "run" });
    expect(receiptsIn(second).map((r) => r.step)).toEqual(["aim"]);
    expect(t.session.state.procedure!.camera).toMatchObject({ at: "cystic-plate" });
    // each aim the first assistant's own step, recorded once, under a task of their own (never a request's)
    const follow = t.session.team()!.state.tasks.find((x) => x.need === "field:follow")!;
    expect(follow).toMatchObject({ kind: "assist", owner: STAFF.first, initiator: STAFF.first, status: "done", acts: 2 });
    expect(t.session.state.procedure!.refs!.filter((ref) => ref.startsWith(`team.${follow.id}.`))).toEqual([`team.${follow.id}.1`, `team.${follow.id}.2`]);
    await t.session.close();
  });

  it("the camera taken through a delegation (no request of the team's) is followed all the same; an aim delegated stands until the work moves on", async () => {
    // an external agent's delegations (the default approval mode, every approval answered "approved")
    const t = await atTheTable({ approvalMode: "default" });
    t.session.subscribe((e) => {
      if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
    });
    operatorSteps(t, [LATERAL, ...TRIANGLE]);
    let calls = 0;
    const delegate = (args: Record<string, unknown>) => t.session.run({ type: "external_tool_call", callId: `d-${++calls}`, tool: "delegate_task", args });
    // the team's turn after the learner's act: the camera holder aims where the work is
    const held = await delegate({ role: "first assistant", task: "hold_camera" });
    expect(t.session.state.procedure!.ports.find((p) => p.site === "A")!.holder).toBe("doc-1");
    expect(receiptsIn(held).map((r) => [r.actor, r.step])).toEqual([[STAFF.first, "aim"]]);
    expect(t.session.state.procedure!.camera).toMatchObject({ at: "hepatocystic-triangle" });
    // aimed elsewhere by a delegation: it stays there while the work stays in the triangle
    const aimed = await delegate({ role: "first assistant", task: "aim_camera", params: { region: "cystic-plate" } });
    expect(receiptsIn(aimed)).toEqual([]);
    expect(t.session.state.procedure!.camera).toMatchObject({ at: "cystic-plate" });
    expect(receiptsIn(await t.session.run({ type: "team", action: "run", rounds: 3 }))).toEqual([]);
    expect(t.session.state.procedure!.camera).toMatchObject({ at: "cystic-plate" });
    await t.session.close();
  });

  it("an aim asked for waits for its confirmation — the camera stays put meanwhile, not even following the work —; confirmed, it is done as asked and stands while the work stays where it was", async () => {
    const t = await cameraHeld();
    operatorSteps(t, [LATERAL, ...TRIANGLE]);
    const asked = await t.session.run({ type: "team", action: "ask", to: "doc-1", field: { op: "aim", region: "cystic-plate" } } as never);
    const readback = saidIn(asked).find((m) => m.kind === "readback")!;
    expect(readback.text.en).toBe("Camera on the cystic plate — confirm?");
    expect(saidIn(asked).map((m) => m.kind)).toEqual(["request", "readback"]);
    expect(receiptsIn(asked)).toEqual([]);
    expect(receiptsIn(await t.session.run({ type: "team", action: "step" }))).toEqual([]);
    expect(t.session.state.procedure!.camera).toBeUndefined();
    expect(t.session.team()!.state.tasks.find((x) => x.need === "field:aim")).toMatchObject({ status: "asked" });
    // the learner's confirmation in words of its own — never the read-back said back as theirs
    const confirmed = await t.session.run({ type: "team", action: "reply", message: readback.id, kind: "confirm" });
    expect(saidIn(confirmed)).toEqual([expect.objectContaining({ from: PRIMARY_ACTOR, to: STAFF.first, kind: "confirm", text: { en: "Yes — go ahead.", "zh-CN": "对，开始吧。" } })]);
    expect(msgsOf(confirmed, "agent_message").map((m) => `${m.speaker}: ${m.text}`)).toEqual(["the surgeon: Yes — go ahead."]);
    const ran = await t.session.run({ type: "team", action: "run" });
    expect(receiptsIn(ran).map((r) => r.step)).toEqual(["aim"]);
    expect(t.session.state.procedure!.camera).toMatchObject({ at: "cystic-plate" });
    expect(saidIn(ran).map((m) => m.text.en)).toEqual(["Camera on the cystic plate."]);
    // the view asked for stands while the work stays in the triangle
    for (let i = 0; i < 2; i++) expect(receiptsIn(await t.session.run({ type: "team", action: "step" }))).toEqual([]);
    expect(t.session.state.procedure!.camera).toMatchObject({ at: "cystic-plate" });
    await t.session.close();
  });
});

describe("the team's caller and the approval gate: only the stand-in's call-out asks", () => {
  /** Up to the first clip of the reference (the clip applier in C, the duct named), in the first assistant's place. */
  const BEFORE_CLIP = WHOLE_OPERATION.slice(0, WHOLE_OPERATION.findIndex((op) => op.op === "clip"));
  const CLIP = { op: "clip", port: "C", handle: "T2", count: 3 } as const;

  /** The theatre case whose cystic duct is called 胆囊管 in Chinese (the fixture names its parts in English only). */
  function zhNamedCase() {
    const procedure = structuredClone(LAP_CHOLE_SIT.procedure) as { anatomy: { id: string; name: Record<string, string> }[] };
    procedure.anatomy.find((s) => s.id === "cystic-duct")!.name["zh-CN"] = "胆囊管";
    return theatreCase({ procedure });
  }

  /** Every approval asked (each answered `approved`). */
  function approvals(t: TestSession): ApprovalAsked[] {
    const asked: ApprovalAsked[] = [];
    t.session.subscribe((e) => {
      if (e.msg.type !== "approval_request") return;
      asked.push(e.msg);
      t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
    });
    return asked;
  }

  it("the stand-in's clip asks first, as their call-out — actorId the stand-in, the line in the learner's language — and is done once approved", async () => {
    for (const [locale, line] of [
      ["en", "Clipping the cystic duct."],
      ["zh-CN", "正在夹闭胆囊管。"],
    ] as const) {
      const t = await theatreSession({ caseDef: zhNamedCase(), start: { type: "start", seat: "first-assistant" }, settingsPatch: { locale, approvalMode: "default" } });
      operatorSteps(t, BEFORE_CLIP);
      standAtTable(t, STAFF.standIn, 0.3);
      const asked = approvals(t);
      const r = await kernelOf(t).team.operateAs(STAFF.standIn, CLIP, "team.test-1.1");
      expect(r.status, `${locale}: ${r.message}`).toBe("completed");
      expect(asked, locale).toEqual([expect.objectContaining({ agent: "team", actorId: STAFF.standIn, tool: "operate", callout: line, ruleId: "team.callout", allowSession: false })]);
      expect(t.session.state.procedure!.clips["cystic-duct"], locale).toBe(3);
      expect(t.session.state.procedure!.refs, locale).toEqual(["team.test-1.1"]);
      await t.session.close();
    }
  });

  it("the call-out's turn always ends in the default approval mode — approved (No objection) or denied (Stop): nothing left driving, the clocks run on", async () => {
    for (const decision of ["approved", "denied"] as const) {
      const t = await theatreSession({ start: { type: "start", seat: "first-assistant" }, settingsPatch: { approvalMode: "default" } });
      operatorSteps(t, BEFORE_CLIP);
      standAtTable(t, STAFF.standIn, 0.3);
      const events: AgentEvent[] = [];
      const off = t.session.subscribe((e) => {
        events.push(e);
        if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision });
      });
      const r = await kernelOf(t).team.operateAs(STAFF.standIn, CLIP, "team.test-1.1");
      off();
      expect(r.status, decision).toBe(decision === "approved" ? "completed" : "failed");
      expect(msgsOf(events, "approval_request"), decision).toEqual([expect.objectContaining({ agent: "team", actorId: STAFF.standIn, callout: "Clipping the cystic duct." })]);
      const turns = msgsOf(events, "turn_started").filter((m) => m.agent === "team");
      expect(turns, decision).toHaveLength(1);
      const own = events.map((e) => e.msg).filter((m) => "turnId" in m && m.turnId === turns[0]!.turnId);
      expect(own.map((m) => (m.type === "turn_phase" ? `phase:${m.phase}` : m.type)), decision).toEqual(["turn_started", "tool_call_begin", "phase:awaiting_approval", "phase:executing_tools", "tool_call_end", "turn_complete", "phase:idle"]);
      expect(stillDriving(events), decision).toEqual([]);
      // the clip done once approved, nothing once stopped
      expect(t.session.state.procedure!.clips["cystic-duct"] ?? 0, decision).toBe(decision === "approved" ? 3 : 0);
      expect(t.session.state.procedure!.refs ?? [], decision).toEqual(decision === "approved" ? ["team.test-1.1"] : []);
      // and the encounter goes on: the staff's own round and the team's round still run
      expect(msgsOf(await t.session.run({ type: "staff_step" }), "error"), decision).toEqual([]);
      expect(teamOf(await t.session.run({ type: "team", action: "step" })).some((e) => e.kind === "status"), decision).toBe(true);
      await t.session.close();
    }
  });

  it("in bypass mode the call-out never asks; without a place nobody's step is a call-out", async () => {
    const t = await theatreSession({ start: { type: "start", seat: "first-assistant" }, settingsPatch: { approvalMode: "bypass" } });
    operatorSteps(t, BEFORE_CLIP);
    standAtTable(t, STAFF.standIn, 0.3);
    const asked = approvals(t);
    expect((await kernelOf(t).team.operateAs(STAFF.standIn, CLIP, "team.test-1.1")).status).toBe("completed");
    expect(asked).toEqual([]);
    await t.session.close();
  });

  it("an assistant's traction and the scrub nurse's pass never ask, in any approval mode", async () => {
    for (const approvalMode of ["default", "strict", "auto"] as const) {
      const t = await atTheTable({ approvalMode });
      standAtTable(t, STAFF.first, -0.6);
      standAtTable(t, STAFF.scrub, 0.9);
      const asked = approvals(t);
      const team = kernelOf(t).team;
      expect((await team.operateAs(STAFF.first, { op: "hand-over", port: "B", to: "doc-1" }, "team.task-1.1")).status, approvalMode).toBe("completed");
      expect((await team.operateAs(STAFF.first, LATERAL, "team.task-1.2")).status, approvalMode).toBe("completed");
      expect((await team.operateAs(STAFF.scrub, { op: "pass", instrument: "hook" }, "team.task-2.1")).status, approvalMode).toBe("completed");
      expect(asked, approvalMode).toEqual([]);
      expect(t.session.state.procedure!.passed, approvalMode).toEqual([{ instrument: "hook", by: "nurse-2" }]);
      await t.session.close();
    }
  });
});

/** The warnings a session gave while it started (replayed by `events()`, up to `session_configured`). */
async function startupWarnings(t: TestSession): Promise<string[]> {
  const warnings: string[] = [];
  for await (const e of t.session.events()) {
    if (e.msg.type === "warning") warnings.push(e.msg.message);
    if (e.msg.type === "session_configured") break;
  }
  return warnings;
}

describe("the team's caller is reserved", () => {
  it("a user or project profile named “team” is never used — the session says so at start, in both languages", async () => {
    for (const [locale, said] of [
      ["en", "The agent profile named “team” is not used"],
      ["zh-CN", "名为“team”的智能体配置未被使用"],
    ] as const) {
      const t = await makeSession({ agents: [parseAgentMarkdown("---\nname: team\nrole: npc\n---\nYou are the ward team.", "project", "team")], settingsPatch: { locale } });
      expect(await startupWarnings(t), locale).toEqual([expect.stringContaining(said)]);
      expect(t.session.availableAgents(), locale).not.toContain("team");
      await t.session.close();
    }
    const plain = await makeSession();
    expect(await startupWarnings(plain)).toEqual([]);
    await plain.session.close();
  });
});

describe("the scrub nurse's passes and the learner's count", () => {
  it("asked for an instrument, the scrub nurse reads it back, walks to the table, passes it into the asker's hand and says so — never unasked", async () => {
    const t = await atTheTable();
    // nothing asked: nothing passed, however long the team works
    await t.session.run({ type: "team", action: "run", rounds: 5 });
    expect(t.session.state.procedure!.passed).toBeUndefined();
    const { readback } = await askAndConfirm(t, "nurse-2", { op: "pass", instrument: "hook" });
    expect(readback.text).toEqual({ en: "Hook to the surgeon — confirm?", "zh-CN": "电钩递给术者——确认吗？" });
    const ran = await t.session.run({ type: "team", action: "run" });
    expect(receiptsIn(ran).filter((r) => r.actor === STAFF.scrub).map((r) => r.step ?? r.operation)).toEqual(["navigate", "pass"]);
    // into the operator's hand: the field records no `to`, by the scrub nurse
    expect(t.session.state.procedure!.passed).toEqual([{ instrument: "hook", by: "nurse-2" }]);
    expect(saidIn(ran).at(-1)).toMatchObject({ from: STAFF.scrub, to: PRIMARY_ACTOR, kind: "report", text: { en: "Passed.", "zh-CN": "递好了。" } });
    await t.session.close();
  });

  it("team count: the learner holding the count says what the scrub nurse's CountView gives — the room's accounting, never typed ids; the surgeon holds no count", async () => {
    const COUNT = { item: "test-swab", name: { en: "swabs", "zh-CN": "纱布" }, when: { phase: "theatre" }, searchPlaces: ["or-instrument-table"], closure: "record" };
    const caseDef = theatreCase({ team: { ...structuredClone(LAP_CHOLE_TEAM), room: THEATRE, count: COUNT } });
    const surgeon = await theatreSession({ caseDef });
    await surgeon.session.run({ type: "clinical_action", action: { type: "start" } });
    operatorSteps(surgeon, ACCESS);
    const notYours = await surgeon.session.run({ type: "team", action: "count" });
    expect(msgsOf(notYours, "error")).toEqual([expect.objectContaining({ code: "permission_denied", message: "The count is not yours to say: Chen Yu counts." })]);
    await surgeon.session.close();
    // in the scrub nurse's place the count is the learner's (their member counts)
    const t = await theatreSession({ caseDef, start: { type: "start", seat: "scrub-nurse" } });
    const counted = await t.session.run({ type: "team", action: "count", ids: ["eq:forged"] } as never);
    expect(msgsOf(counted, "error")).toEqual([]);
    const accounted = kernelOf(t).embodied!.count.accounted();
    expect(accounted).toEqual(["eq:t-swab"]);
    const report = saidIn(counted).find((m) => m.about.count !== undefined && m.from === PRIMARY_ACTOR)!;
    expect(report).toMatchObject({ kind: "report", to: STAFF.circulating, about: { ids: accounted, count: 1, of: 1, stage: "closing", missing: [], unexpected: [] }, text: { en: "Count of swabs: 1 of 1." } });
    // the case's count record took the same items, by the place's member (shown to the learner as "you")
    expect(t.session.state.count!.entries.filter((e) => e.op === "count")).toEqual([expect.objectContaining({ ids: accounted, staff: "nurse-2", stage: "closing" })]);
    // said once, no recount asked for: nothing more to count now — and it says why
    const again = await t.session.run({ type: "team", action: "count" });
    expect(msgsOf(again, "warning")).toEqual([expect.objectContaining({ message: "You have said the count: there is nothing more to count until a recount is asked for." })]);
    expect(saidIn(again)).toEqual([]);
    await t.session.close();
  });
});

describe("a team saved before requests about the field", () => {
  it("an old checkpoint (state version 2, none of the new fields or task kinds) loads unchanged and the team carries on", async () => {
    const old: TeamCheckpoint = {
      format: "clinicalcraft-team@1",
      state: {
        version: 2,
        scenario: null,
        lifecycle: "active",
        setup: { round: 0, at: 0, worldVersion: 1 },
        round: 3,
        seq: 4,
        members: [
          { id: STAFF.circulating, staff: "nurse-1", duties: ["circulate"], inbox: [], memory: [], relief: false, absent: false },
          { id: STAFF.scrub, staff: "nurse-2", duties: ["count", "instruments"], inbox: [], memory: [], relief: false, absent: false },
          { id: STAFF.first, staff: "doc-1", duties: ["assist"], inbox: [], memory: [], relief: false, absent: false },
          { id: STAFF.anaesthetist, staff: "anaes-1", duties: ["anaesthesia"], inbox: [], memory: [], relief: false, absent: false },
          { id: PRIMARY_ACTOR, staff: "surgeon", duties: ["surgeon"], inbox: ["msg-1"], memory: [], relief: false, absent: false },
        ],
        messages: [{ id: "msg-1", thread: "thread-2", from: STAFF.circulating, to: PRIMARY_ACTOR, kind: "notice", text: { en: "A swab for the surgeon — on its way.", "zh-CN": "给术者的纱布马上来。" }, about: { need: "asked-1", item: "test-swab", for: PRIMARY_ACTOR }, room: THEATRE, patient: null, at: 0, round: 1, evidence: [], delivered: true, read: false }],
        receipts: [],
        tasks: [{ id: "task-3", kind: "supply", need: "asked-1", item: "test-swab", for: PRIMARY_ACTOR, owner: STAFF.circulating, initiator: STAFF.circulating, thread: "thread-2", status: "open", since: 1, tried: [], acts: 0, had: [] }],
        claims: {},
        completed: [],
        posted: ["asked-1"],
        extra: [{ id: "asked-1", item: "test-swab", for: "surgeon" }],
      },
      autonomy: "step",
      surgeon: "learner",
    };
    expect(validTeamCheckpoint(structuredClone(old))).toEqual(old);
    const t = await theatreSession({ embodied: { team: structuredClone(old) } } as never);
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    operatorSteps(t, ACCESS);
    standAtTable(t, PRIMARY_ACTOR);
    expect(t.session.team()!.state).toMatchObject({ round: 3, tasks: [expect.objectContaining({ id: "task-3", kind: "supply" })] });
    const step = await t.session.run({ type: "team", action: "step" });
    expect(msgsOf(step, "error")).toEqual([]);
    expect(t.session.team()!.state.round).toBe(4);
    // and a request about the field goes on beside it
    const asked = await t.session.run({ type: "team", action: "ask", to: "doc-1", field: B_TRACTION } as never);
    expect(msgsOf(asked, "error")).toEqual([]);
    expect(t.session.team()!.state.messages.some((m) => m.about.field?.op === "traction")).toBe(true);
    await t.session.close();
  });
});
