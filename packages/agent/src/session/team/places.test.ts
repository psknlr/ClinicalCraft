/**
 * A place in the care team, in a session (docs/TEAM.md §1, §4.5): offered in in-world mode, with the stand-in surgeon
 * operating meanwhile — on the agent's theatre fixture (core's lap-chole team in general-hospital's theatre), through the
 * learner's own path only: the start, the learner's steps in the field as their place, `team reply` (no kernel shortcut).
 * Each place sees the reference operation through to its close with the learner's part played by a scripted learner;
 * a resume in the middle of a `team run` — from the transcript or from a snapshot — repeats and skips no step of the
 * stand-in's; a call-out the learner stops stops the stand-in until they say go on; a place is refused at the start where
 * the stand-in could not work.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSession as freshState, reduce, refOfBody, type ClinicalAction, type ProcedureOp } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { placesCase } from "../../../../core/src/engine/__fixtures__/team-places.js";
import { makeSession, msgsOf, type TestSession } from "../../__fixtures__/harness.js";
import type { AgentEvent } from "../../protocol.js";
import { MemoryTranscript, replayTranscript } from "../../transcript.js";
import { parseCatalog } from "@clinicalcraft/core";
import { theatreCatalog } from "../../../../world/src/__fixtures__/theatre.js";
import { catalogs } from "../../../../world/src/__fixtures__/world.js";
import { STAFF, THEATRE, theatreCase, theatreFacility, theatreSession, WHOLE_OPERATION } from "../__fixtures__/theatre.js";
import type { TeamMessage } from "./types.js";

const MINI = JSON.parse(readFileSync(new URL("../../../../core/src/engine/__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Record<string, unknown>;

type Start = Extract<ClinicalAction, { type: "start" }>;

/** The reference path with four ports: the stand-in's own grasper in the assist port D pulls the fundus cephalad first. */
const FOUR_PORTS: readonly ProcedureOp[] = [
  { op: "plan-ports", plan: "mirror-four-port" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "D", instrument: "grasper" },
  { op: "retract", port: "D", structure: "gallbladder-fundus", direction: ["cephalad"], force: "firm" },
  ...WHOLE_OPERATION.slice(3),
];
const fourPortCase = () => theatreCase({ solution: [{ type: "start" }, { type: "set-phase", phase: "theatre" }, ...FOUR_PORTS.map((op) => ({ type: "operate", op })), { type: "finish" }] });

/** What the learner did, and what the team said to them, while they played their place. */
interface Played {
  /** The learner's own steps in the field (their place's), as they asked them. */
  steps: ProcedureOp[];
  /** What was said to the learner, in order. */
  heard: TeamMessage[];
}

/**
 * The learner plays their place with the learner's own actions only: a request said to them is read back (`team reply`);
 * once the stand-in confirms, the step asked is done in the field as their place (`clinical_action operate`, no actor) and
 * reported; the stand-in's stop is answered "go on" (`onStop`). Otherwise the team takes one round (`team step`).
 */
async function play(t: TestSession, o: { until?: (t: TestSession) => boolean; onStop?: (m: TeamMessage) => Promise<void>; rounds?: number } = {}): Promise<Played> {
  const played: Played = { steps: [], heard: [] };
  const seen = new Set(t.session.team()?.state.messages.filter((m) => m.to === PRIMARY_ACTOR).map((m) => m.id) ?? []);
  const asked = new Map<string, TeamMessage>();
  const me = refOfBody(t.session.caseDef, t.session.state, PRIMARY_ACTOR) as string;
  const until = o.until ?? ((x: TestSession) => !!x.session.state.procedure?.closed);
  const operate = async (op: ProcedureOp) => {
    played.steps.push(op);
    const r = await t.session.run({ type: "clinical_action", action: { type: "operate", op } });
    expect(msgsOf(r, "error"), JSON.stringify(op)).toEqual([]);
  };
  const reply = async (m: TeamMessage, kind: "readback" | "confirm" | "report", text?: string) => {
    const r = await t.session.run({ type: "team", action: "reply", message: m.id, kind, ...(text ? { text } : {}) });
    expect(msgsOf(r, "error"), `${kind} to ${m.id}`).toEqual([]);
  };
  for (let i = 0; i < (o.rounds ?? 400) && !until(t); i++) {
    const fresh = t.session.team()!.state.messages.filter((m) => m.to === PRIMARY_ACTOR && !seen.has(m.id));
    for (const m of fresh) seen.add(m.id);
    played.heard.push(...fresh);
    let acted = false;
    for (const m of fresh) {
      if (m.kind === "request" && m.about.field) {
        asked.set(m.thread, m);
        await reply(m, "readback");
        acted = true;
      } else if (m.kind === "request" && m.about.callout) {
        if (o.onStop) await o.onStop(m);
        else await reply(m, "confirm", "Clips on the cystic duct only: go on.");
        acted = true;
      } else if (m.kind === "confirm" && asked.has(m.thread)) {
        const f = asked.get(m.thread)!.about.field!;
        const camera = t.session.state.procedure!.ports.find((p) => p.role === "camera")!.site;
        if (f.op === "camera") await operate({ op: "hand-over", port: f.port ?? camera, to: me });
        if (f.op === "aim") await operate({ op: "aim", port: camera, at: f.region! });
        if (f.op === "aim" && f.zoom) await operate({ op: "zoom", port: camera, level: f.zoom });
        if (f.op === "zoom") await operate({ op: "zoom", port: camera, level: f.zoom! });
        if (f.op === "pass") await operate({ op: "pass", instrument: f.instrument! });
        if (f.op === "traction") await operate({ op: "hand-over", port: f.port!, to: me });
        await reply(m, "report", "Done.");
        acted = true;
      }
    }
    if (!acted) await t.session.run({ type: "team", action: "step" });
  }
  return played;
}

/** The stand-in's steps as the field recorded them (its plan refs, in order). */
const standInRefs = (t: TestSession) => (t.session.state.procedure?.refs ?? []).filter((r) => r.startsWith("standin:"));

/** The operation seen through: closed, the specimen out, the view of safety documented and real, nothing unsafe. */
function seenThrough(t: TestSession, plan: number): void {
  const p = t.session.state.procedure!;
  expect(p).toMatchObject({ closed: true, specimen: "extracted", unsafe: [], injuries: [] });
  expect(p.pauses.map((x) => x.achieved)).toEqual([true]);
  // every plan step of the stand-in's recorded once, in order (the extraction's port taken back first)
  const refs = standInRefs(t);
  expect(new Set(refs).size).toBe(refs.length);
  expect(refs.filter((r) => /^standin:\d+$/u.test(r))).toEqual(Array.from({ length: plan }, (_, k) => `standin:${k}`));
  expect(new Set(p.refs).size).toBe(p.refs!.length);
}

/** A theatre session started in a place by the learner's own start. */
async function inPlace(start: Start, o: Parameters<typeof theatreSession>[0] = {}): Promise<TestSession> {
  const t = await theatreSession({ ...o, settingsPatch: { approvalMode: "bypass", ...(o.settingsPatch ?? {}) } });
  const r = await t.session.run({ type: "clinical_action", action: start });
  expect(msgsOf(r, "error")).toEqual([]);
  expect(t.session.state.seat).toBe(start.seat);
  return t;
}

describe("a place in the care team: refused where the stand-in could not work", () => {
  it("a clinical session refuses it — not in-world, with a facility or none — in both languages; the operating surgeon starts as always", async () => {
    const caseDef = placesCase(MINI);
    // the engine itself would take the place and join the team at its phase
    expect(reduce(caseDef, freshState(caseDef), { type: "start", seat: "first-assistant" }).rejected).toBeUndefined();
    const refusals = [
      ["en", "Action not permitted: the first assistant's place in the team needs in-world mode: the team works at the table with their own hands."],
      ["zh-CN", "操作不被允许：团队中的第一助手岗位需要实景模式：团队成员要在手术台旁亲手操作。"],
    ] as const;
    for (const [locale, refusal] of refusals) {
      const sessions = [await makeSession({ caseDef, settingsPatch: { locale } }), await theatreSession({ clinical: true, settingsPatch: { locale } })];
      for (const t of sessions) {
        const refused = await t.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
        expect(msgsOf(refused, "error"), locale).toEqual([expect.objectContaining({ code: "not_embodied", message: refusal })]);
        expect(msgsOf(refused, "clinical_event")).toEqual([]);
        expect(t.session.state.started).toBe(false);
        const started = await t.session.run({ type: "clinical_action", action: { type: "start", seat: "surgeon" } });
        expect(msgsOf(started, "error")).toEqual([]);
        expect(t.session.state.started).toBe(true);
        expect(t.session.state.seat).toBeUndefined();
        await t.session.close();
      }
    }
  });

  it("settings that would stop the stand-in refuse the place at the start — plan mode, a deny rule on operate, a practice scope without it — saying why", async () => {
    const cases = [
      [{ approvalMode: "plan" }, /plan mode/iu],
      [{ permissions: { deny: ["operate(clip)"] } }, /operate\(clip\)/u],
      [{ permissions: { deny: ["operate"] } }, /deny rule/iu],
      [{ practiceScope: "workup" }, /practice scope|scope/iu],
    ] as const;
    for (const [settingsPatch, why] of cases) {
      const t = await theatreSession({ settingsPatch: settingsPatch as Record<string, unknown> });
      const refused = await t.session.run({ type: "clinical_action", action: { type: "start", seat: "scrub-nurse" } });
      const error = msgsOf(refused, "error");
      expect(error, JSON.stringify(settingsPatch)).toEqual([expect.objectContaining({ code: "permission_denied", message: expect.stringContaining("while you hold the scrub nurse's place the stand-in surgeon operates, and this session's settings would stop them") })]);
      expect(error[0]!.message).toMatch(why);
      expect(t.session.state.started).toBe(false);
      await t.session.close();
    }
    // in Chinese
    const zh = await theatreSession({ settingsPatch: { locale: "zh-CN", approvalMode: "plan" } });
    const refused = await zh.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
    expect(msgsOf(refused, "error")[0]!.message).toMatch(/^操作不被允许：你担任第一助手岗位时由主刀同事主刀，而本会话的设置会阻止其操作（/u);
    await zh.session.close();
    // a deny rule on another tool leaves the place offered
    const other = await theatreSession({ settingsPatch: { permissions: { deny: ["intervene"] } } });
    expect(msgsOf(await other.session.run({ type: "clinical_action", action: { type: "start", seat: "scrub-nurse" } }), "error")).toEqual([]);
    expect(other.session.state.seat).toBe("scrub-nurse");
    await other.session.close();
  });
});

describe("each place sees the reference operation through, the learner playing it with their own actions", () => {
  it("the first assistant (two surgeons): the camera holder — takes the camera, aims it, closer and wider when asked; the port taken back for the extraction", async () => {
    const t = await inPlace({ type: "start", seat: "first-assistant" });
    const played = await play(t);
    seenThrough(t, WHOLE_OPERATION.length);
    // the learner's own steps: the camera taken, aimed, closer, wider — all the camera's, as the first assistant (doc-1)
    expect(played.steps[0]).toEqual({ op: "hand-over", port: "A", to: "doc-1" });
    expect(new Set(played.steps.map((s) => s.op))).toEqual(new Set(["hand-over", "aim", "zoom"]));
    const theirs = t.session.snapshot().actions.flatMap((a) => (a.type === "operate" && a.actor === "doc-1" ? [a.op.op] : []));
    expect(theirs).toEqual(played.steps.map((s) => s.op));
    // what they were asked, and the stand-in's call-outs
    expect(played.heard.filter((m) => m.kind === "request").map((m) => m.text.en)).toEqual([
      "The first assistant (you), take the camera, please.",
      "The first assistant (you), camera on the hepatocystic triangle, close up, please.",
      "The first assistant (you), wider, please.",
      "The first assistant (you), camera on the gallbladder bed, please.",
    ]);
    expect(played.heard.filter((m) => m.about.callout).map((m) => m.text.en)).toEqual(["Clipping the cystic duct.", "Clipping the cystic artery.", "Dividing the cystic duct.", "Dividing the cystic artery."]);
    expect(played.heard.some((m) => m.text.en === "I'll take port A.")).toBe(true);
    // nothing worked off the picture
    expect(t.session.state.procedure!.counters.offView).toBeUndefined();
    await t.session.close();
  });

  it("the second assistant (three surgeons): the camera holder — the simulated first assistant holds the traction the stand-in hands on", async () => {
    const t = await inPlace({ type: "start", seat: "second-assistant", lineup: "three-surgeons" }, { caseDef: fourPortCase() });
    const played = await play(t);
    seenThrough(t, FOUR_PORTS.length);
    expect(played.steps[0]).toEqual({ op: "hand-over", port: "A", to: "doc-2" });
    expect(new Set(played.steps.map((s) => s.op))).toEqual(new Set(["hand-over", "aim", "zoom"]));
    // the traction on the assist port: asked of the first assistant, read back, confirmed, held — by his own steps
    const said = t.session.team()!.state.messages;
    const traction = said.find((m) => m.about.field?.op === "traction")!;
    expect(traction).toMatchObject({ from: STAFF.standIn, to: STAFF.first, kind: "request", text: { en: "Dr Abe, please hold the grasper in port D, pulling the fundus cephalad." } });
    expect(said.filter((m) => m.thread === traction.thread).map((m) => [m.from, m.kind, m.text.en])).toEqual([
      [STAFF.standIn, "request", "Dr Abe, please hold the grasper in port D, pulling the fundus cephalad."],
      [STAFF.first, "readback", "The grasper in port D, pulling the fundus cephalad — confirm?"],
      [STAFF.standIn, "confirm", "Yes — go ahead."],
      [STAFF.first, "report", "Holding."],
    ]);
    const handedOn = t.session.snapshot().actions.find((a) => a.type === "operate" && a.actor === "doc-1");
    expect(handedOn).toMatchObject({ op: { op: "hand-over", port: "D", to: "doc-1" }, ref: expect.stringMatching(/^team\.task-\d+\.\d+$/u) });
    await t.session.close();
  });

  it("the scrub nurse: every instrument the stand-in puts in is asked for and passed by the learner first — never put in without the pass", async () => {
    const t = await inPlace({ type: "start", seat: "scrub-nurse" });
    const played = await play(t);
    seenThrough(t, WHOLE_OPERATION.length);
    const inserted = WHOLE_OPERATION.flatMap((op) => (op.op === "insert" ? [op.instrument] : []));
    // the learner passed exactly those, in that order, each asked for first ("Maryland dissector, please.")
    expect(played.steps).toEqual(inserted.map((instrument) => ({ op: "pass", instrument })));
    expect(played.heard.filter((m) => m.kind === "request" && m.about.field?.op === "pass").map((m) => m.about.field!.instrument)).toEqual(inserted);
    expect(played.heard.find((m) => m.about.field?.instrument === "maryland")!.text.en).toBe("The scrub nurse (you), Maryland dissector, please.");
    // every pass taken by the stand-in's insert: nothing left waiting
    expect(t.session.state.procedure!.passed).toBeUndefined();
    // the camera is the simulated first assistant's
    expect(t.session.team()!.state.messages.some((m) => m.from === STAFF.first && m.text.en === "I have the camera.")).toBe(true);
    await t.session.close();
  });

  it("the first assistant with the scrub nurse on a break: no pass is needed; the relief scrub nurse brings what the stand-in needs", async () => {
    const t = await inPlace({ type: "start", seat: "first-assistant", team: "scrub-break" });
    // the stand-in needs a swab: the team sees to it — the circulating nurse calls the relief scrub nurse in
    const need = await t.session.run({ type: "team", action: "need", item: "test-swab" });
    expect(msgsOf(need, "error")).toEqual([]);
    await play(t);
    seenThrough(t, WHOLE_OPERATION.length);
    expect(t.session.state.procedure!.passed).toBeUndefined();
    const handed = t.session.team()!.state.receipts.find((r) => r.operation === "hand_over" && r.outcome === "completed");
    expect(handed).toMatchObject({ actor: STAFF.relief, recipient: STAFF.standIn });
    await t.session.close();
  });
});

/** An insufflator whose gas controls are the operation's own pneumoperitoneum (an `operate` effect), ready in the theatre. */
function insufflatorWorld(): Pick<Parameters<typeof theatreSession>[0] & object, "facility" | "catalogs"> {
  const L = (en: string, zh: string) => ({ en, "zh-CN": zh });
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "places-insufflator",
    name: L("Insufflator", "气腹机"),
    equipment: [
      {
        id: "test-insufflator",
        name: L("Insufflator", "气腹机"),
        category: "surgery",
        description: L("An insufflator", "气腹机"),
        footprint: { w: 0.4, d: 0.4, h: 1 },
        solid: false,
        parts: [{ m: "white", p: [0, 0.5, 0], s: [0.4, 1, 0.4] }],
        interaction: { kind: "device" },
        behavior: {
          initial: "ready",
          states: { ready: { name: L("ready", "待机") }, insufflating: { name: L("insufflating", "充气中") } },
          operations: {
            start_insufflation: { name: L("Start insufflation", "开始充气"), from: ["ready"], to: "insufflating", clinical: { tool: "operate", select: "item", item: "insufflate" } },
            stop_insufflation: { name: L("Stop and desufflate", "停止并放气"), from: ["insufflating"], to: "ready", clinical: { tool: "operate", select: "item", item: "desufflate" } },
          },
        },
      },
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  const facility = theatreFacility();
  facility.placements.push({ id: "t-insufflator", type: "test-insufflator", x: -23.1, z: -10.3, y: 0, rot: 0, room: THEATRE });
  return { facility, catalogs: [...catalogs(), theatreCatalog(), r.value] };
}

describe("the stand-in uses the devices as the demonstration does", () => {
  it("insufflation through the device that offers it — the stand-in's own body and the world's operation, recorded as its plan step; the device shows it", async () => {
    const t = await inPlace({ type: "start", seat: "first-assistant" }, insufflatorWorld());
    await t.session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
    const ran = await t.session.run({ type: "team", action: "run", rounds: 12 });
    expect(msgsOf(ran, "error")).toEqual([]);
    const w = t.session.world()!;
    expect(w.stateOf("eq:t-insufflator")).toBe("insufflating");
    expect(t.session.state.procedure).toMatchObject({ insufflated: true, pressure: 12 });
    // its plan step 1, recorded once, by the device's operate effect under the team's caller
    expect(standInRefs(t).slice(0, 2)).toEqual(["standin:0", "standin:1"]);
    const insufflation = t.session.snapshot().actions.find((a) => a.type === "operate" && a.op.op === "insufflate");
    expect(insufflation).toMatchObject({ ref: "standin:1", by: "agent" });
    expect(insufflation).not.toHaveProperty("actor");
    const device = msgsOf(ran, "world_action_result").find((m) => m.result.status === "completed" && /^team\.task-\d+\.\d+$/u.test(m.result.actionId) && m.result.events.some((e) => e.type === "entity.state"));
    expect(device).toBeDefined();
    expect(msgsOf(ran, "tool_call_begin").filter((m) => m.tool === "operate" && (m.args as { op?: string }).op === "insufflate").map((m) => m.agent)).toEqual(["team"]);
    await t.session.close();
  });
});

describe("the stand-in's steps exactly once across a resume in the middle of a team run", () => {
  /** A place in observer mode (the team plays the learner's part too), its team run cut once the stand-in has done step `cut`. */
  async function cutRun(cut: string): Promise<{ t: TestSession; transcript: MemoryTranscript; items: MemoryTranscript["items"]; snapshot: ReturnType<TestSession["session"]["snapshot"]> }> {
    const transcript = new MemoryTranscript();
    const t = await inPlace({ type: "start", seat: "first-assistant" }, { transcript });
    await t.session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
    let items: MemoryTranscript["items"] | null = null;
    let snapshot: ReturnType<TestSession["session"]["snapshot"]> | null = null;
    const off = t.session.subscribe(() => {
      if (items || !t.session.state.procedure?.refs?.includes(cut)) return;
      items = structuredClone(transcript.items);
      snapshot = JSON.parse(JSON.stringify(t.session.snapshot()));
    });
    await t.session.run({ type: "team", action: "run", rounds: 200 });
    off();
    expect(items, "cut in the middle of the run").not.toBeNull();
    return { t, transcript, items: items!, snapshot: snapshot! };
  }

  it("resumed from the transcript and from a session snapshot: no step of the stand-in's repeated or skipped", async () => {
    const { t, items, snapshot } = await cutRun("standin:22");
    seenThrough(t, WHOLE_OPERATION.length);
    const whole = standInRefs(t);
    await t.session.close();
    // the transcript: the team's last record is older than the field's (a team item is written when a run ends)
    const replayed = replayTranscript(items);
    expect(replayed.team?.state.round ?? 0).toBeLessThan(snapshot.team!.state.round);
    for (const [from, resume] of [
      ["transcript", { resume: { sessionId: snapshot.sessionId, actions: replayed.actions, messages: replayed.messages, dialogue: replayed.dialogue }, embodied: { snapshot: replayed.world!, ...(replayed.team ? { team: replayed.team } : {}) } }],
      ["snapshot", { resume: { sessionId: snapshot.sessionId, actions: snapshot.actions, messages: snapshot.messages, dialogue: snapshot.dialogue }, embodied: { snapshot: snapshot.world!, team: snapshot.team! } }],
    ] as const) {
      const r = await theatreSession({ ...(resume as object), settingsPatch: { approvalMode: "bypass" } } as never);
      expect(standInRefs(r), from).toEqual(whole.slice(0, whole.indexOf("standin:22") + 1));
      // observing as before the cut (the transcript's team, older, may still have the learner playing: observe again)
      await r.session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
      const ran: AgentEvent[] = await r.session.run({ type: "team", action: "run", rounds: 200 });
      expect(msgsOf(ran, "error"), from).toEqual([]);
      seenThrough(r, WHOLE_OPERATION.length);
      expect(standInRefs(r), from).toEqual(whole);
      // the team never took a lost task's acts for a new one's
      const receipts = r.session.team()!.state.receipts.map((x) => x.id);
      expect(new Set(receipts).size, from).toBe(receipts.length);
      await r.session.close();
    }
  });
});

describe("the call-out the learner stops", () => {
  it("a denied clip stops the stand-in — it looks, asks what the learner sees, and waits — until the learner says go on; then it calls it out again and completes", async () => {
    const t = await inPlace({ type: "start", seat: "first-assistant" }, { settingsPatch: { approvalMode: "default" } });
    const answers: string[] = [];
    t.session.subscribe((e) => {
      if (e.msg.type !== "approval_request") return;
      const decision = e.msg.callout === "Clipping the cystic duct." && !answers.includes("denied") ? "denied" : "approved";
      answers.push(decision);
      expect(e.msg).toMatchObject({ agent: "team", actorId: STAFF.standIn, tool: "operate" });
      t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision });
    });
    let stops = 0;
    let waited = 0;
    await play(t, {
      onStop: async (m) => {
        stops++;
        expect(m).toMatchObject({ from: STAFF.standIn, kind: "request", text: { en: "Stopped — tell me what you see.", "zh-CN": "停下了——告诉我你看到了什么。" }, about: { callout: { op: "clip", handle: "T2" } } });
        // stopped: no clip, however long the team works, until the learner says so
        for (let i = 0; i < 6; i++) await t.session.run({ type: "team", action: "step" });
        waited = t.session.state.procedure!.clips["cystic-duct"] ?? 0;
        const r = await t.session.run({ type: "team", action: "reply", message: m.id, kind: "confirm", text: "The clips are on the cystic duct, clear of the common duct: go on." });
        expect(msgsOf(r, "error")).toEqual([]);
      },
    });
    expect(stops).toBe(1);
    expect(waited).toBe(0);
    seenThrough(t, WHOLE_OPERATION.length);
    expect(t.session.state.procedure!.clips).toEqual({ "cystic-duct": 3, "cystic-artery": 2 });
    // asked for each critical step, the clip twice (stopped, then let go on)
    expect(answers).toEqual(["denied", "approved", "approved", "approved", "approved"]);
    // it looked at the field after the stop, with its own body, through the team's caller
    expect(t.session.team()!.state.receipts.filter((r) => r.operation === "observe_field").map((r) => [r.actor, r.outcome])).toEqual([[STAFF.standIn, "completed"]]);
    await t.session.close();
  });
});
