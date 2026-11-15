/**
 * The care team's panel (docs/TEAM.md; `team-view.ts`): what it offers to answer and what it sends, on the web's own
 * session in a place in the care team — answers to what is said to the learner's own member in any place, none while
 * observing; Ask, Need and Count as the `team` ops the session takes (the count never typed); the stand-in surgeon's
 * call-out, an approval request it raised for its own body, as a card with "No objection" and "Stop" bound to that
 * request's approval response — any other request asked as always —, a Stop followed by the stand-in's "Stopped — tell
 * me what you see." and the learner's "Go on"; the members' own following of the work never shown as a request.
 */
import { afterEach, describe, expect, it } from "vitest";
import type { TeamCheckpoint, TeamMessage } from "@clinicalcraft/agent";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { LAP_CHOLE_TEAM } from "../../../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { THEATRE, theatreCase } from "../../../../world/src/__fixtures__/theatre.js";
import type { AppSession } from "../../app/session.js";
import { setLocale, tr } from "../../i18n/index.js";
import { TEAM_EN, TEAM_ZH } from "../../i18n/team.js";
import { answerCallouts, placeSession, play, said } from "./__fixtures__/team-play.js";
import { answersFor, askField, askOp, awaitedOf, calloutOf, countRow, learnerName, needItems, needOp, placeHeader, taskShown, type TeamAnswer } from "./team-view.js";

const open: AppSession[] = [];
afterEach(async () => {
  setLocale("zh-CN");
  for (const app of open.splice(0)) await app.close();
});
const session = async (...args: Parameters<typeof placeSession>) => {
  const app = await placeSession(...args);
  open.push(app);
  return app;
};

const ids = (answers: readonly TeamAnswer[]) => answers.map((a) => a.id);
const opsOf = (answers: readonly TeamAnswer[]) => answers.flatMap((a) => ("op" in a ? [a.op] : []));
/** What the stand-in waits on the learner for, as a line (a `team run` stops there). */
const awaitedLine = (cp: TeamCheckpoint): TeamMessage => {
  const w = awaitedOf(cp);
  if (w?.kind !== "line") throw new Error(`nothing awaited: ${JSON.stringify(w)}`);
  return w.message;
};

describe("answers to what is said to the learner's own member, in any place", () => {
  it("the stand-in's request about the field: read back or can't — sent as the session's reply; none once observing", async () => {
    setLocale("en");
    for (const [seat, lineup, op] of [
      ["first-assistant", undefined, "camera"],
      ["second-assistant", "three-surgeons", "camera"],
      ["scrub-nurse", undefined, "pass"],
    ] as const) {
      const app = await session({ seat, ...(lineup ? { lineup } : {}) });
      // a team run stops where only the learner is awaited: the stand-in's request to them
      await app.session.run({ type: "team", action: "run", rounds: 80 });
      const cp = app.session.team()!;
      const m = awaitedLine(cp);
      expect(m, seat).toMatchObject({ to: PRIMARY_ACTOR, kind: "request", about: { field: { op } } });
      const answers = answersFor(cp, m);
      expect(ids(answers), seat).toEqual(["readback", "cannot"]);
      expect(opsOf(answers), seat).toEqual([
        { type: "team", action: "reply", message: m.id, kind: "readback" },
        { type: "team", action: "reply", message: m.id, kind: "decline" },
      ]);
      // nothing to answer for what is said to someone else
      for (const x of cp.state.messages.filter((x) => x.to !== PRIMARY_ACTOR)) expect(answersFor(cp, x), x.id).toEqual([]);
      // the panel's header and the learner's name in a place
      expect(placeHeader(app.session.caseDef, app.session.state)).toMatchObject({ place: seat, title: tr(`place.${seat}`) });
      expect(learnerName(app.session.state)).toBe(`${tr(`place.${seat}`)} (you)`);
      // observing, the team plays the learner's place: nothing to answer
      await app.session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
      const watched = app.session.team()!;
      expect(watched.state.messages.flatMap((x) => answersFor(watched, x)), seat).toEqual([]);
      expect(awaitedOf(watched), seat).toBeNull();
    }
  });

  it("a read-back is answered once: then the stand-in's confirmation offers the surgery window and the report; a read-back of the learner's own ask is confirmed or declined without words", async () => {
    setLocale("en");
    const app = await session({ seat: "first-assistant" });
    await app.session.run({ type: "team", action: "run", rounds: 80 });
    const request = awaitedLine(app.session.team()!);
    const readBack = answersFor(app.session.team()!, request).find((a) => a.id === "readback")!;
    expect(said(await app.session.run("op" in readBack ? readBack.op : (null as never)))).toEqual([]);
    // answered: nothing more to say to it
    expect(answersFor(app.session.team()!, request)).toEqual([]);
    // the stand-in confirms the read-back: the step is the learner's to do, then to report
    await app.session.run({ type: "team", action: "step" });
    const cp = app.session.team()!;
    const confirm = cp.state.messages.find((m) => m.thread === request.thread && m.kind === "confirm" && m.to === PRIMARY_ACTOR)!;
    expect(confirm).toBeDefined();
    expect(answersFor(cp, confirm).map((a) => [a.id, a.label])).toEqual([
      ["surgery", tr("team.doIt")],
      ["report", "I have the camera."],
    ]);
    // without a place, the learner's own ask is read back to them: Confirm / Not now, a confirmation or a decline without words
    const plain = await session();
    const s = plain.session;
    s.dispatch({ type: "set-phase", phase: "theatre" });
    const bed = s.world()!.patientPlace()!;
    s.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: { x: bed.x, y: 0, z: bed.z + 0.6, yaw: 0, pitch: 0, level: bed.level } });
    for (const op of [{ op: "plan-ports", plan: "three-port-left" }, { op: "insufflate", pressure: 12 }, { op: "insert", port: "A", instrument: "laparoscope" }, { op: "insert", port: "B", instrument: "grasper" }] as const) {
      expect(said(await s.run({ type: "clinical_action", action: { type: "operate", op } })), op.op).toEqual([]);
    }
    const ask = askOp("doc-1", "traction", { port: "B", structure: "gallbladder-infundibulum", direction: "caudal" })!;
    expect(said(await s.run(ask))).toEqual([]);
    await s.run({ type: "team", action: "step" });
    const read = s.team()!.state.messages.find((m) => m.kind === "readback" && m.to === PRIMARY_ACTOR)!;
    expect(read).toMatchObject({ from: "staff:doc-1" });
    const answers = answersFor(s.team()!, read);
    expect(ids(answers)).toEqual(["confirm", "decline"]);
    expect(opsOf(answers)).toEqual([
      { type: "team", action: "reply", message: read.id, kind: "confirm" },
      { type: "team", action: "reply", message: read.id, kind: "decline" },
    ]);
    expect(said(await s.run(opsOf(answers)[0]!))).toEqual([]);
    const yes = s.team()!.state.messages.at(-1)!;
    expect(yes).toMatchObject({ from: PRIMARY_ACTOR, kind: "confirm", text: { en: "Yes — go ahead.", "zh-CN": "对，开始吧。" } });
    // unseated, the learner is the surgeon, as always
    expect(placeHeader(s.caseDef, s.state)).toBeNull();
    expect(learnerName(s.state)).toBe(tr("team.surgeon"));
  });
});

describe("the stand-in's call-out", () => {
  it("is a card only for an approval request carrying the stand-in's line and raised for its body; 'No objection' and 'Stop' are that request's approval response", () => {
    const c = theatreCase();
    const placed = { seat: "first-assistant" as const };
    const card = calloutOf({ requestId: "r-1", callout: "Clipping the cystic duct.", actorId: "staff:doc-0" }, c, placed);
    expect(card).toEqual({
      requestId: "r-1",
      line: "Clipping the cystic duct.",
      actorId: "staff:doc-0",
      go: { type: "approval_response", requestId: "r-1", decision: "approved" },
      stop: { type: "approval_response", requestId: "r-1", decision: "denied" },
    });
    // any other request is asked as always: no actor (the learner's own), a colleague's body, no line, no place
    expect(calloutOf({ requestId: "r-2", callout: "Clipping the cystic duct." }, c, placed)).toBeNull();
    expect(calloutOf({ requestId: "r-3", callout: "Clipping the cystic duct.", actorId: "staff:doc-1" }, c, placed)).toBeNull();
    expect(calloutOf({ requestId: "r-4", actorId: "staff:doc-0" }, c, placed)).toBeNull();
    expect(calloutOf({ requestId: "r-5", callout: "Clipping the cystic duct.", actorId: "staff:doc-0" }, c, {})).toBeNull();
    // its words, in both languages (docs/GLOSSARY.md "call-out")
    expect([TEAM_EN["callout.go"], TEAM_EN["callout.stop"]]).toEqual(["No objection", "Stop"]);
    expect([TEAM_ZH["callout.go"], TEAM_ZH["callout.stop"]]).toEqual(["无异议", "停"]);
  });

  it("stopped: the stand-in looks and asks what the learner sees, and waits for 'Go on'; let go on, it calls the clip out again and clips", async () => {
    setLocale("en");
    // the first assistant with two surgeons: the camera holder — the stand-in's camera requests are theirs to answer
    const app = await session({ seat: "first-assistant" });
    const { cards, off } = answerCallouts(app, (_card, n) => (n === 0 ? "stop" : "go"));
    let halts = 0;
    let stopLine: TeamMessage | null = null;
    await play(app, () => (app.session.state.procedure?.clips["cystic-duct"] ?? 0) > 0, {
      rounds: 400,
      onHalt: async () => {
        halts++;
        const cp = app.session.team()!;
        stopLine = awaitedLine(cp);
        // nothing clipped while it waits, however long the team works
        for (let i = 0; i < 4; i++) await app.session.run({ type: "team", action: "step" });
        expect(app.session.state.procedure!.clips["cystic-duct"] ?? 0).toBe(0);
        expect(ids(answersFor(app.session.team()!, stopLine))).toEqual(["goOn"]);
      },
    });
    off();
    expect(cards.map((c) => [c.line, c.actorId])).toEqual([
      ["Clipping the cystic duct.", "staff:doc-0"],
      ["Clipping the cystic duct.", "staff:doc-0"],
    ]);
    expect(halts).toBe(1);
    expect(stopLine).toMatchObject({ from: "staff:doc-0", to: PRIMARY_ACTOR, kind: "request", text: { en: "Stopped — tell me what you see.", "zh-CN": "停下了——告诉我你看到了什么。" }, about: { callout: { op: "clip", handle: "T2" } } });
    // "Go on" was a confirmation without words
    const goOn = app.session.team()!.state.messages.find((m) => m.replyTo === stopLine!.id)!;
    expect(goOn).toMatchObject({ from: PRIMARY_ACTOR, kind: "confirm", text: { en: "Yes — go ahead." } });
    expect(app.session.state.procedure!.clips["cystic-duct"]).toBe(3);
    // the learner held the camera as they were asked (each request read back, confirmed, done in the field, reported)
    expect(app.session.state.procedure!.ports.find((p) => p.role === "camera")!.holder).toBe("doc-1");
    const asked = app.session.team()!.state.messages.filter((m) => m.to === PRIMARY_ACTOR && m.kind === "request" && m.about.field).map((m) => m.about.field!.op);
    expect(asked).toEqual(["camera", "aim", "zoom"]);
    expect(app.session.team()!.state.messages.filter((m) => m.from === PRIMARY_ACTOR && m.kind === "report").map((m) => m.text.en)).toEqual(["I have the camera.", "Camera on it.", "Done."]);
  }, 120_000);
});

describe("Ask, Need and Count", () => {
  it("send the team's ask, need and count; the session's refusals and warnings shown as they are", async () => {
    setLocale("en");
    // ask: what each request about the field needs, as the session parses it
    expect(askField("traction", { port: "B", structure: "gallbladder-infundibulum", direction: "caudal" })).toEqual({ op: "traction", port: "B", structure: "gallbladder-infundibulum", direction: ["caudal"], force: "firm" });
    expect(askField("traction", { port: "B" })).toBeNull();
    expect(askField("release", {})).toEqual({ op: "release" });
    expect(askField("camera", { port: "A" })).toEqual({ op: "camera", port: "A" });
    expect(askField("aim", {})).toBeNull();
    expect(askField("aim", { region: "cystic-plate" })).toEqual({ op: "aim", region: "cystic-plate" });
    expect(askField("closer", {})).toEqual({ op: "zoom", zoom: "close" });
    expect(askField("wider", {})).toEqual({ op: "zoom", zoom: "wide" });
    expect(askOp("nurse-2", "pass", { instrument: "maryland" })).toEqual({ type: "team", action: "ask", to: "nurse-2", field: { op: "pass", instrument: "maryland" } });
    expect(askOp("", "pass", { instrument: "maryland" })).toBeNull();
    // the scrub nurse's place, a team that keeps a count: the count is the learner's, never typed — said once, then
    // the session's warning as it is
    const COUNT = { item: "test-swab", name: { en: "swabs", "zh-CN": "纱布" }, when: { phase: "theatre" }, searchPlaces: ["or-instrument-table"], closure: "record" };
    const counted = theatreCase({ team: { ...structuredClone(LAP_CHOLE_TEAM), room: THEATRE, count: COUNT } });
    const scrub = await session({ seat: "scrub-nurse" }, "en", counted);
    await scrub.session.run({ type: "team", action: "step" });
    const row = countRow(scrub.session.team()!)!;
    expect(row.op).toEqual({ type: "team", action: "count" });
    expect(said(await scrub.session.run(row.op))).toEqual([]);
    expect(scrub.session.team()!.state.messages.at(-1)).toMatchObject({ from: PRIMARY_ACTOR, kind: "report", text: { en: "Count of swabs: 1 of 1." } });
    expect(said(await scrub.session.run(row.op))).toEqual(["You have said the count: there is nothing more to count until a recount is asked for."]);
    // a team that keeps no count offers none; the first assistant holds no count
    const noCount = await session({ seat: "scrub-nurse" });
    await noCount.session.run({ type: "team", action: "step" });
    expect(countRow(noCount.session.team()!)).toBeNull();
    const first = await session({ seat: "first-assistant" }, "en", counted);
    await first.session.run({ type: "team", action: "step" });
    expect(countRow(first.session.team()!)).toBeNull();
    // need: for the surgeon, or for the learner's place
    const c = first.session.caseDef;
    expect(needOp(c, first.session.state, "test-swab", false)).toEqual({ type: "team", action: "need", item: "test-swab" });
    expect(needOp(c, first.session.state, "test-swab", true)).toEqual({ type: "team", action: "need", item: "test-swab", for: "doc-1" });
    expect(said(await first.session.run(needOp(c, first.session.state, "test-swab", true)))).toEqual([]);
    expect(first.session.team()!.state.extra.at(-1)).toMatchObject({ item: "test-swab", for: "doc-1" });
    // what the Need row offers: the needs the case's team scenarios name, that the hospital has, by the team's word
    const withNeeds = { team: { ...c.team!, scenarios: [{ ...c.team!.scenarios![0]!, needs: [{ id: "n1", item: "test-swab", for: "surgeon", name: { en: "a swab", "zh-CN": "纱布" } }, { id: "n2", item: "nowhere", for: "surgeon" }] }] } } as never;
    expect(needItems(withNeeds, (item) => (item === "test-swab" ? "Test swab" : null))).toEqual([{ item: "test-swab", name: "a swab" }]);
    // ask someone who is not in the room: the session's refusal, as it says it
    const relief = first.session.world()!.actor("staff:nurse-9")!.pose;
    first.session.submit({ type: "world_pose", actorId: "staff:nurse-2", pose: { ...relief, x: relief.x + 0.8 } });
    const away = await first.session.run(askOp("nurse-2", "pass", { instrument: "maryland" })!);
    expect(said(away)).toEqual([expect.stringContaining("Chen Yu")]);
  });

  it("the members' own following of the work with the camera is never listed as a request", () => {
    const follow = { kind: "assist", need: "field:follow" } as never;
    const asked = { kind: "assist", need: "field:traction" } as never;
    expect([taskShown(follow), taskShown(asked), taskShown({ kind: "operate", need: "operate" } as never)]).toEqual([false, true, true]);
  });
});
