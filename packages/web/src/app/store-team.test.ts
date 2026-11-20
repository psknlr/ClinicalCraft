/**
 * The web store and the care team's own calls (docs/TEAM.md §4.5): the stand-in surgeon's steps run on
 * the session's team caller (agent `team`) in turns of their own that close. In the DEFAULT approval mode — its critical
 * steps asked as call-outs, one stopped and one let go on through the call-out card — the store never holds the `team`
 * agent busy, `agentDriving` stays false throughout, and afterwards the encounter's clocks run on: the team's round, the
 * staff's round and the real-time clock (app/clocks.ts unchanged). The team's clock holds while the stand-in waits on
 * the learner for what is still theirs to give (agent `owedByLearner`): a silent learner keeps their part.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { owedByLearner } from "@clinicalcraft/agent";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { theatreCatalog, theatreFacility } from "../../../world/src/__fixtures__/theatre.js";
import { catalogs } from "../../../world/src/__fixtures__/world.js";
import { ActionFeedback } from "../ui/feedback.js";
import { answerCallouts, placeSession, play } from "../ui/panels/__fixtures__/team-play.js";
import { answersFor, awaitedOf } from "../ui/panels/team-view.js";
import { encounterClockRuns } from "./clocks.js";
import { BrowserMover } from "./embodied.js";
import { EmbodiedLink } from "./embodied-link.js";
import type { AppSession } from "./session.js";
import { GameWorldLink, STAFF_STEP_MS, TEAM_STEP_MS } from "./world-bridge.js";

const apps: AppSession[] = [];
const disposers: (() => void)[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const dispose of disposers.splice(0)) dispose();
  for (const app of apps.splice(0)) await app.close();
});

describe("the care team's calls in the web store (the default approval mode)", () => {
  it("an approved call-out and a stopped one leave nothing driving; the team's clock, the staff's and the real-time clock run on", async () => {
    const app = await placeSession({ seat: "first-assistant" });
    apps.push(app);
    expect(app.settings.approvalMode).toBe("default");
    // the browser's link to the world, with no scene drawn (what it decides is the store's and the world's)
    const link = new EmbodiedLink({ app, renderer: () => null, mover: new BrowserMover({ renderer: () => null }), facility: theatreFacility(), caseDef: app.session.caseDef, slotId: null, feedback: new ActionFeedback(() => null, () => null, () => undefined), toast: () => undefined, locale: () => "en" });
    disposers.push(() => link.dispose());
    // whatever the store holds after each event, an agent never drives a body because of the team's calls
    const driving: string[] = [];
    let seen = 0;
    const offChange = app.store.onChange(() => {
      seen++;
      if (link.agentDriving()) driving.push(`${seen}: ${[...app.store.phases].map(([a, p]) => `${a}=${p}`).join(",")} ${app.store.runningTools().map((t) => t.tool).join(",")}`);
    });
    const { cards, off } = answerCallouts(app, (_card, n) => (n === 0 ? "stop" : "go"));
    // (every later call-out let go on through the card as well: nothing is left waiting on an answer)
    disposers.push(off);
    await play(app, () => (app.session.state.procedure?.clips["cystic-duct"] ?? 0) > 0, { rounds: 400 });
    offChange();
    // the call-outs were asked of the learner — the team's own caller, the stand-in's body — and answered by the card
    expect(cards.map((c) => c.line)).toEqual(["Clipping the cystic duct.", "Clipping the cystic duct."]);
    const asked = app.store.log.flatMap((e) => (e.kind === "event" && e.event.msg.type === "approval_request" ? [e.event.msg] : []));
    expect(asked.map((m) => [m.agent, m.actorId, m.callout])).toEqual([
      ["team", "staff:doc-0", "Clipping the cystic duct."],
      ["team", "staff:doc-0", "Clipping the cystic duct."],
    ]);
    expect([...app.store.resolved.values()]).toEqual(["denied", "approved"]);
    // the team's turns opened and closed in the store: none left busy, no tool left running, no approval waiting
    const started = app.store.log.filter((e) => e.kind === "event" && e.event.msg.type === "turn_started" && e.event.msg.agent === "team").length;
    expect(started).toBeGreaterThan(10);
    expect(seen).toBeGreaterThan(started);
    expect(driving).toEqual([]);
    expect(app.store.phaseOf("team")).toBeNull();
    expect(app.store.runningTools()).toEqual([]);
    expect(app.store.pendingApprovals()).toEqual([]);
    expect(link.agentDriving()).toBe(false);

    // the encounter's time runs (the team's window open or not), and every clock of the browser ticks
    const clockRunning = () => encounterClockRuns({ entered: true, approvalOpen: app.store.pendingApprovals().length > 0, panel: "team" });
    expect(clockRunning()).toBe(true);
    await app.session.run({ type: "team", action: "resume" });
    const caseDef = app.session.caseDef;
    // (a case clock that runs in real time, for the real-time tick)
    const realtime = { ...caseDef, clock: { ...caseDef.clock, mode: "simulated" as const, realtimeScale: 1 } };
    const bridge = new GameWorldLink({ world: () => null, app, caseDef: realtime, facility: theatreFacility(), catalogs: [...catalogs(), theatreCatalog()], slotId: null, locale: () => "en", playing: () => true, activeStaff: () => null, agentDriving: () => link.agentDriving(), embodied: () => link, clockRunning });
    disposers.push(() => bridge.dispose());
    const run = vi.spyOn(app.session, "run");
    const real = vi.spyOn(app.session, "advanceRealTime");
    const ticks = bridge as unknown as { teamTick(dt: number): void; staffTick(dt: number): void; onTick(): void; teamBusy: boolean; staffBusy: boolean };
    ticks.teamTick(TEAM_STEP_MS);
    ticks.staffTick(STAFF_STEP_MS);
    ticks.onTick();
    expect(run.mock.calls.map(([op]) => op)).toEqual(expect.arrayContaining([{ type: "team", action: "step" }, { type: "staff_step" }]));
    expect(real).toHaveBeenCalled();
    await vi.waitFor(() => expect(ticks.teamBusy || ticks.staffBusy).toBe(false));
    expect(link.agentDriving()).toBe(false);
    expect(app.world()!.actor(PRIMARY_ACTOR)).toBeTruthy();
  }, 120_000);
});

describe("the browser's team clock and a learner who has not answered yet", () => {
  it("holds while the stand-in waits on the learner — its request never runs out — and goes on once they answer", async () => {
    const app = await placeSession({ seat: "first-assistant" });
    apps.push(app);
    // the team at its own pace, as the web lets it go on once the encounter is entered
    await app.session.run({ type: "team", action: "resume" });
    const link = new EmbodiedLink({ app, renderer: () => null, mover: new BrowserMover({ renderer: () => null }), facility: theatreFacility(), caseDef: app.session.caseDef, slotId: null, feedback: new ActionFeedback(() => null, () => null, () => undefined), toast: () => undefined, locale: () => "en" });
    disposers.push(() => link.dispose());
    const bridge = new GameWorldLink({ world: () => null, app, caseDef: app.session.caseDef, facility: theatreFacility(), catalogs: [...catalogs(), theatreCatalog()], slotId: null, locale: () => "en", playing: () => true, activeStaff: () => null, agentDriving: () => link.agentDriving(), embodied: () => link, clockRunning: () => true });
    disposers.push(() => bridge.dispose());
    const ticks = bridge as unknown as { teamTick(dt: number): void; teamBusy: boolean };
    // one tick of the browser's clock (TEAM_STEP_MS), its round run to its end
    const tick = async () => {
      ticks.teamTick(TEAM_STEP_MS);
      await vi.waitFor(() => expect(ticks.teamBusy).toBe(false));
    };
    const owed = () => {
      const cp = app.session.team()!;
      return owedByLearner(cp.state, cp.surgeon);
    };
    for (let n = 0; n < 60 && !owed(); n++) await tick();
    // the stand-in asks the learner's place for its part: the camera, which the first assistant holds in this team
    const asked = awaitedOf(app.session.team()!);
    expect(asked).toMatchObject({ kind: "line", answered: false, message: { kind: "request", to: PRIMARY_ACTOR, text: { en: "The first assistant (you), take the camera, please.", "zh-CN": "第一助手（你），请扶镜。" } } });
    const request = asked!.kind === "line" ? asked!.message : null;
    // a minute of the browser's clock with no answer: no round is taken, and the request stands — never withdrawn, never
    // done by the stand-in itself
    const run = vi.spyOn(app.session, "run");
    const round = app.session.team()!.state.round;
    for (let n = 0; n < 30; n++) await tick();
    expect(run.mock.calls.filter(([op]) => op.type === "team")).toEqual([]);
    expect(app.session.team()!.state.round).toBe(round);
    expect(awaitedOf(app.session.team()!)).toMatchObject({ kind: "line", answered: false, message: { id: request!.id } });
    expect(app.session.team()!.state.messages.filter((m) => m.to === PRIMARY_ACTOR && m.kind === "decline")).toEqual([]);
    // read back, as the team window offers it: the clock goes on, and the stand-in confirms in its next round
    const readBack = answersFor(app.session.team()!, request!).find((a) => a.id === "readback");
    if (!readBack || !("op" in readBack)) throw new Error("no read-back offered");
    await app.session.run(readBack.op);
    expect(owed()).toBe(false);
    run.mockClear();
    await tick();
    expect(run.mock.calls.map(([op]) => op)).toContainEqual({ type: "team", action: "step" });
    expect(awaitedOf(app.session.team()!)).toMatchObject({ kind: "line", answered: false, message: { kind: "confirm", thread: request!.thread } });
  }, 120_000);
});
