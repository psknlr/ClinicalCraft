/**
 * A place in the care team at the start, in the web (docs/EMBODIED.md §2.1, docs/TEAM.md §1): the page's choices
 * (`?team=`, `?seat=`, `?lineup=`, `__QA__.start`) reach the start; the intro's picker shows nothing new for any built-in
 * case (none has a team) and the places and line-ups of a case that offers them; a saved encounter's own place; a case
 * served without its reference solution (`clinicalcraft serve`) gets its place path fetched beside it, so it offers the
 * same places and a start in a place joins the team exactly as the full case's does — and the learner's body joins the
 * team at the operating table, the first-person view following the world's pose once (a resume does not move it again).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { caseIndexEntry, type AgentEvent } from "@clinicalcraft/agent";
import { canJoinTeam, createSession, parseCase, placePath, reduce, seatsOf, type CaseDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { LAP_CHOLE_TEAM, REFERENCE_OPS } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { LAP_CHOLE_SIT } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { THEATRE, theatreCase, theatreCatalog, theatreFacility } from "../../../world/src/__fixtures__/theatre.js";
import { catalogs } from "../../../world/src/__fixtures__/world.js";
import type { WorldApi } from "../contracts.js";
import { ActionFeedback } from "../ui/feedback.js";
import { lapCholeTeamCase } from "../ui/panels/__fixtures__/lap-chole-sit.js";
import { answerCallouts } from "../ui/panels/__fixtures__/team-play.js";
import { POSITIONS_EN, POSITIONS_ZH } from "../i18n/positions.js";
import { fetchPlacePath, loadContent, placePathOf, placeReady } from "./content.js";
import { BrowserMover } from "./embodied.js";
import { EmbodiedLink } from "./embodied-link.js";
import { offersPlaces, pendingStart, placePicker, placesOffered, savedPlace, startAction, startChoiceFromSearch, startPace, teamGoesOn, withStartArgs, type StartChoice } from "./places.js";
import { startAppSession, type AppSession } from "./session.js";
import { defaultSettings } from "./settings.js";

const NONE: StartChoice = { team: null, seat: null, lineup: null };
const offline = { provider: "offline", model: null, mode: "offline" as const, fellBack: false };

/** A case's index entry as the library has it (the builder every front-end shares, on the full case's JSON). */
const cardOf = (c: CaseDefinition) => caseIndexEntry(JSON.parse(JSON.stringify(c)), "test")!;

describe("the start's choices: the page's address, the picker, __QA__.start", () => {
  it("?seat= and ?lineup= (and ?team=) reach the start; the operating surgeon's place is no place", () => {
    expect(startChoiceFromSearch("?seat=first-assistant&lineup=three-surgeons&team=scrub-break")).toEqual({ team: "scrub-break", seat: "first-assistant", lineup: "three-surgeons" });
    expect(startChoiceFromSearch("?seat=surgeon")).toEqual(NONE);
    expect(startChoiceFromSearch("?seat=porter&lineup=")).toEqual(NONE);
    expect(startChoiceFromSearch("")).toEqual(NONE);
    const k = lapCholeTeamCase();
    expect(startAction(k, startChoiceFromSearch("?seat=second-assistant&lineup=three-surgeons&team=second-away"))).toEqual({ type: "start", team: "second-away", seat: "second-assistant", lineup: "three-surgeons" });
    // a line-up or a team scenario the case does not have is not sent (as ?team= always was)
    expect(startAction(k, { team: "nope", seat: "scrub-nurse", lineup: "nope" })).toEqual({ type: "start", seat: "scrub-nurse" });
    // a place asked for is sent whenever the case offers places — never dropped: the session says whether it can be taken
    // (a place not offered with the line-up chosen, a member the team scenario makes absent: refused in its words)
    const card = cardOf(k);
    expect(startAction(k, { team: null, seat: "second-assistant", lineup: null }, card)).toEqual({ type: "start", seat: "second-assistant" });
    expect(startAction(k, { team: null, seat: "second-assistant", lineup: "three-surgeons" }, card)).toEqual({ type: "start", seat: "second-assistant", lineup: "three-surgeons" });
    expect(startAction(k, { team: "scrub-break", seat: "scrub-nurse", lineup: null }, card)).toEqual({ type: "start", team: "scrub-break", seat: "scrub-nurse" });
    // a case with no team, or whose card offers no place at all, is as it always was: the page's ?seat= is not its
    const noTeam = loadContent().cards[0]!;
    expect(startAction({ team: undefined }, { team: null, seat: "first-assistant", lineup: "three-surgeons" })).toEqual({ type: "start" });
    expect(noTeam.seats).toEqual([]);
    const noStandIn = lapCholeTeamCase({ team: { ...JSON.parse(JSON.stringify(k.team)), members: k.team!.members.map((m) => (m.staff === "surgeon" ? { staff: "surgeon", duties: ["surgeon"] } : m)) } });
    expect(startAction(noStandIn, { team: null, seat: "first-assistant", lineup: null }, cardOf(noStandIn))).toEqual({ type: "start" });
  });

  it("__QA__.start(case, facility, resume, team, seat, lineup) takes them; its four-argument form means no place, whatever the page chose", () => {
    const page = startChoiceFromSearch("?seat=scrub-nurse&lineup=three-surgeons&team=second-away");
    expect(withStartArgs(page, "scrub-break")).toEqual({ team: "scrub-break", seat: null, lineup: null });
    expect(withStartArgs(page)).toEqual({ team: "second-away", seat: null, lineup: null });
    expect(withStartArgs(NONE, "", "first-assistant", "three-surgeons")).toEqual({ team: null, seat: "first-assistant", lineup: "three-surgeons" });
    expect(withStartArgs(page, "", "surgeon", "")).toEqual({ team: null, seat: null, lineup: null });
    expect(withStartArgs(NONE)).toEqual(NONE);
    // one start after another in a page: the second, four-argument one is the operating surgeon's
    const first = withStartArgs(NONE, "", "first-assistant");
    expect(withStartArgs(first, "")).toEqual(NONE);
  });

  it("a start is sent once: never again once the encounter has started (a resumed save) or finished", () => {
    const k = lapCholeTeamCase();
    const start = startAction(k, { team: null, seat: "first-assistant", lineup: null });
    expect(pendingStart(createSession(k), start)).toEqual({ type: "start", seat: "first-assistant" });
    const started = reduce(k, createSession(k), { type: "start", seat: "first-assistant" }).state;
    expect(pendingStart(started, start)).toBeNull();
    expect(pendingStart({ started: false, finished: true }, start)).toBeNull();
  });
});

describe("the intro's place picker", () => {
  it("shows nothing new for every built-in case (none has a team), in-world or not", () => {
    const cards = loadContent().cards;
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(offersPlaces(card), card.id).toBe(false);
      for (const embodied of [true, false]) expect(placePicker(card, embodied, { seat: "first-assistant", lineup: "three-surgeons" }), card.id).toBeNull();
    }
  });

  it("shows a case's line-ups and the places each offers, in-world only; a place asked for that is not offered is shown as such", () => {
    const card = cardOf(lapCholeTeamCase());
    expect(offersPlaces(card)).toBe(true);
    expect(placePicker(card, false, NONE)).toBeNull();
    expect(placePicker(card, true, NONE)).toEqual({ lineups: [{ id: "three-surgeons", name: { en: "Three surgeons", "zh-CN": "Three surgeons" }, provenance: "authored", seats: ["first-assistant", "second-assistant", "scrub-nurse"] }], lineup: null, places: ["first-assistant", "scrub-nurse"], seat: null, unavailable: null });
    // the second assistant without the line-up that has one: shown as asked, not offered — the start sends it, the session refuses it
    expect(placePicker(card, true, { seat: "second-assistant", lineup: null })).toMatchObject({ seat: null, unavailable: "second-assistant" });
    expect(placePicker(card, true, { seat: "second-assistant", lineup: "three-surgeons" })).toMatchObject({ lineup: "three-surgeons", seat: "second-assistant", unavailable: null });
    expect(placePicker(card, true, { seat: "first-assistant", lineup: "nope" })).toMatchObject({ lineup: null, seat: "first-assistant", unavailable: null });
    expect(placesOffered(card, "three-surgeons")).toEqual(seatsOf(lapCholeTeamCase(), { lineup: "three-surgeons" }).filter((x) => x !== "surgeon"));
  });

  it("with a team scenario chosen (?team=), leaves out the places whose member it makes absent — as core's seatsOf does —, once the full case is read", () => {
    const k = lapCholeTeamCase();
    const card = cardOf(k);
    for (const scenario of ["scrub-break", "second-away", "nope"]) {
      for (const lineup of [null, "three-surgeons"]) {
        const want = seatsOf(k, { ...(lineup ? { lineup } : {}), teamScenario: scenario }).filter((x) => x !== "surgeon");
        expect(placesOffered(card, lineup, { def: k, scenario }), `${scenario} ${lineup}`).toEqual(want);
      }
    }
    expect(placePicker(card, true, { seat: "scrub-nurse", lineup: null }, { def: k, scenario: "scrub-break" })).toMatchObject({ places: ["first-assistant"], seat: null, unavailable: "scrub-nurse" });
    // the full case not read yet: the card's places
    expect(placePicker(card, true, NONE, { def: null, scenario: "scrub-break" })?.places).toEqual(["first-assistant", "scrub-nurse"]);
  });

  it("says a saved encounter's own place (its recorded start)", () => {
    expect(savedPlace([{ type: "start", seat: "scrub-nurse", lineup: "three-surgeons" }, { type: "note", text: "x" }])).toEqual({ seat: "scrub-nurse", lineup: "three-surgeons" });
    expect(savedPlace([{ type: "start" }])).toEqual({ seat: null, lineup: null });
    expect(savedPlace([{ type: "start", seat: "surgeon" }])).toEqual({ seat: null, lineup: null });
    expect(savedPlace(null)).toEqual({ seat: null, lineup: null });
  });
});

describe("a case served without its solution: the place path fetched beside it (clinicalcraft serve)", () => {
  let open: { app: AppSession; link?: EmbodiedLink }[] = [];
  afterEach(async () => {
    for (const o of open) {
      o.link?.dispose();
      await o.app.close();
    }
    open = [];
  });

  /** The case as the content API serves it, parsed as the web parses what it fetched: no reference solution. */
  function served(full: CaseDefinition): CaseDefinition {
    const { solution: _solution, ...rest } = JSON.parse(JSON.stringify(full)) as Record<string, unknown>;
    const r = parseCase(rest);
    if (!r.ok) throw new Error(JSON.stringify(r.issues.slice(0, 2)));
    return r.value;
  }

  it("takes a path only for that case, every action valid", () => {
    const full = theatreCase();
    const path = JSON.parse(JSON.stringify(placePath(full)));
    expect(placePathOf({ id: full.id, path }, full.id)).toEqual(path);
    expect(placePathOf({ id: "other", path }, full.id)).toBeNull();
    expect(placePathOf({ id: full.id, path: [...path, { type: "bogus" }] }, full.id)).toBeNull();
    expect(placePathOf(null, full.id)).toBeNull();
  });

  it("offers the full case's places, and a start in a place joins the team as the full case's — the body at the operating table, the view following once", async () => {
    const full = theatreCase();
    const bare = served(full);
    // the library lists the places (the server's index reads the case file, solution and all) ...
    expect(cardOf(full).seats).toEqual(["first-assistant", "scrub-nurse"]);
    // ... but the case the browser receives cannot join along a path it lacks
    expect(canJoinTeam(bare)).toBe(false);
    expect(seatsOf(bare)).toEqual(["surgeon"]);
    const fetched: string[] = [];
    const ready = await placeReady(bare, async (id) => {
      fetched.push(id);
      return JSON.parse(JSON.stringify({ id, path: placePath(full) }));
    });
    expect(fetched).toEqual([full.id]);
    expect(seatsOf(ready)).toEqual(seatsOf(full));
    // a case that carries its solution (a bundled one) fetches nothing
    expect(await placeReady(full, async () => Promise.reject(new Error("no fetch")))).toBe(full);
    await expect(placeReady(bare, async () => ({ id: "another-case", path: [] }))).rejects.toMatchObject({ name: "PlacePathError", kind: "malformed" });

    // the web's own session: the start in the first assistant's place
    const facility = theatreFacility();
    const app = await startAppSession({ caseDef: ready, facility, catalogs: [...catalogs(), theatreCatalog()], stored: defaultSettings(), choice: offline, locale: "en", served: false, embodiment: "embodied" });
    const start = pendingStart(app.session.state, startAction(ready, { team: null, seat: "first-assistant", lineup: null }))!;
    const events = await app.session.run({ type: "clinical_action", action: start });
    expect(events.filter((e) => e.msg.type === "error")).toEqual([]);
    const want = reduce(full, createSession(full), start).state;
    expect({ seat: app.session.state.seat, phase: app.session.state.phase, joined: app.session.state.joined }).toEqual({ seat: "first-assistant", phase: want.phase, joined: want.joined });
    // the learner's body joined the team at the table: one notice, the world's pose beside the patient
    expect(events.flatMap((e) => (e.msg.type === "notification" ? [e.msg.body] : []))).toEqual(["You join the team at the operating table as the first assistant."]);
    const pose = app.world()!.actor(PRIMARY_ACTOR)!.pose;
    const patient = app.world()!.patientPlace()!;
    expect(Math.hypot(pose.x - patient.x, pose.z - patient.z)).toBeLessThan(2);

    // the first-person view follows the world's pose there, once
    const teleported: unknown[] = [];
    const api = { position: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, level: pose.level }, teleport: (x: number, z: number, yaw?: number, level?: string) => teleported.push({ x, z, yaw, level }) } as unknown as WorldApi;
    const link = new EmbodiedLink({ app, renderer: () => api, mover: new BrowserMover({ renderer: () => api }), facility, caseDef: ready, slotId: null, feedback: new ActionFeedback(() => null, () => null, () => undefined), toast: () => undefined, locale: () => "en" });
    open.push({ app, link });
    expect(link.followWorldPose()).toBe(true);
    expect(teleported).toEqual([{ x: pose.x, z: pose.z, yaw: pose.yaw, level: pose.level }]);

    // the learner steps back from the table and the encounter is saved; resumed, nothing starts again — the body stays where it was
    app.session.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: { ...pose, x: pose.x + 1.2 } });
    const snapshot = app.snapshot();
    const again = await startAppSession({ caseDef: ready, facility, catalogs: [...catalogs(), theatreCatalog()], stored: defaultSettings(), choice: offline, locale: "en", served: false, resume: snapshot });
    open.push({ app: again });
    expect(again.session.state.seat).toBe("first-assistant");
    expect(pendingStart(again.session.state, start)).toBeNull();
    expect(again.world()!.actor(PRIMARY_ACTOR)!.pose.x).toBeCloseTo(pose.x + 1.2, 5);
  });

  it("a case that starts in its team's phase — joined at once without its solution — still gets its place path: the stand-in surgeon works from it", async () => {
    const full = theatreCase({ initialPhase: "theatre", solution: theatreCase().solution.filter((a) => a.type !== "set-phase") });
    const bare = served(full);
    // served, it can be joined (nothing to join along) and offers its places ...
    expect(canJoinTeam(bare)).toBe(true);
    expect(cardOf(full).seats).toEqual(["first-assistant", "scrub-nurse"]);
    expect(seatsOf(bare)).toEqual(seatsOf(full));
    // ... but the operative steps the stand-in works from are the solution's: fetched beside it all the same
    const fetched: string[] = [];
    const ready = await placeReady(bare, async (id) => {
      fetched.push(id);
      return JSON.parse(JSON.stringify({ id, path: placePath(full) }));
    });
    expect(fetched).toEqual([full.id]);
    expect(ready.solution.filter((a) => a.type === "operate")).toEqual(full.solution.filter((a) => a.type === "operate"));
    // in the web's own session the stand-in operates — without the path it would stand at the table with no plan
    const facility = theatreFacility();
    const operated = async (caseDef: CaseDefinition) => {
      const app = await startAppSession({ caseDef, facility, catalogs: [...catalogs(), theatreCatalog()], stored: defaultSettings(), choice: offline, locale: "en", served: false, embodiment: "embodied" });
      open.push({ app });
      const r = await app.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
      expect(r.filter((e) => e.msg.type === "error")).toEqual([]);
      expect(app.session.state.joined?.actions ?? 0).toBe(0);
      const steps = () => (app.session.state.procedure?.refs ?? []).filter((x) => x.startsWith("standin:"));
      for (let i = 0; i < 12 && steps().length < 2; i++) await app.session.run({ type: "team", action: "step" });
      return steps();
    };
    expect(await operated(ready)).toEqual(["standin:0", "standin:1"]);
    expect(await operated(bare)).toEqual([]);
  });

  it("a place path that cannot be had says why by kind — the server's status, no answer in time, no server, an answer not JSON —, worded in both languages", async () => {
    const at = (body: BodyInit | null, init: ResponseInit) => async () => new Response(body, init);
    const cases: [() => Promise<Response>, Record<string, unknown>][] = [
      [at(JSON.stringify({ error: { message: "Not found" } }), { status: 404, headers: { "content-type": "application/json" } }), { kind: "http", status: 404 }],
      [at("<html>oops</html>", { status: 200, headers: { "content-type": "text/html" } }), { kind: "malformed", status: 200 }],
      [async () => Promise.reject(new TypeError("Failed to fetch")), { kind: "network" }],
      [
        // nothing comes back until the request is given up
        async () => new Promise<Response>(() => undefined),
        { kind: "timeout" },
      ],
    ];
    for (const [fake, want] of cases) {
      vi.stubGlobal("fetch", (_url: string, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("This operation was aborted", "AbortError")));
          fake().then(resolve, reject);
        }),
      );
      try {
        await expect(fetchPlacePath("lap-team", 30)).rejects.toMatchObject({ name: "PlacePathError", ...want });
      } finally {
        vi.unstubAllGlobals();
      }
    }
    // each kind has its words in both languages (the app's title and cause; the raw cause goes to the console only)
    for (const key of ["intro.place.pathFailed", "intro.place.pathFailedWhy", "intro.place.path.notFound", "intro.place.path.http", "intro.place.path.timeout", "intro.place.path.network", "intro.place.path.malformed"] as const) {
      expect(POSITIONS_EN[key], key).toBeTruthy();
      expect(POSITIONS_ZH[key], key).toMatch(/\p{Script=Han}/u);
    }
  });
});

describe("a place's team opens paused: the stand-in's call-out waits until the call-out card can answer it", () => {
  let open: AppSession[] = [];
  afterEach(async () => {
    for (const a of open) await a.close();
    open = [];
  });

  /**
   * The theatre case whose team works from the clipping on: a place joins along the reference path to just before the
   * first clip, so the stand-in surgeon's first step is a critical one — asked as its call-out before it is taken.
   */
  const callOutFirst = (): CaseDefinition => {
    const clipAt = REFERENCE_OPS.findIndex((op) => op.op === "clip");
    const operate = (ops: typeof REFERENCE_OPS) => ops.map((op) => ({ type: "operate", op }));
    const raw = structuredClone(LAP_CHOLE_SIT) as unknown as { phases: unknown[]; procedure: Record<string, unknown> };
    return theatreCase({
      phases: [...raw.phases, { id: "clipping", label: { en: "Clipping", "zh-CN": "夹闭" } }],
      procedure: { ...raw.procedure, phases: ["theatre", "clipping"] },
      team: { ...structuredClone(LAP_CHOLE_TEAM), room: THEATRE, phases: ["clipping"] },
      solution: [{ type: "start" }, { type: "set-phase", phase: "theatre" }, ...operate(REFERENCE_OPS.slice(0, clipAt)), { type: "set-phase", phase: "clipping" }, ...operate(REFERENCE_OPS.slice(clipAt)), { type: "finish" }],
    });
  };
  const sessionOf = async (caseDef: CaseDefinition, teamPace?: "step") => {
    const app = await startAppSession({ caseDef, facility: theatreFacility(), catalogs: [...catalogs(), theatreCatalog()], stored: defaultSettings(), choice: offline, locale: "en", served: false, embodiment: "embodied", ...(teamPace ? { embodied: { teamPace } } : {}) });
    open.push(app);
    return app;
  };

  it("a new start in a place opens its team paused and lets it go on once entered; no place, a refused start, a resume: nothing to send", () => {
    const c = callOutFirst();
    const start = startAction(c, { team: null, seat: "first-assistant", lineup: null });
    expect(startPace(start)).toBe("step");
    expect(teamGoesOn({ seat: "first-assistant" }, start)).toEqual({ type: "team", action: "resume" });
    // the operating surgeon's start (no place), no start at all (a resumed encounter), a start the session refused
    expect(startPace(startAction(c, NONE))).toBeUndefined();
    expect(startPace(null)).toBeUndefined();
    expect(teamGoesOn({ seat: "first-assistant" }, null)).toBeNull();
    expect(teamGoesOn({}, startAction(c, NONE))).toBeNull();
    expect(teamGoesOn({}, start)).toBeNull();
  });

  it("at the session's own pace the start's own team round asks the call-out — before the browser can show it —; at the web's pace for a place the start asks nothing, and the call-out comes once the team goes on, answered on the card", async () => {
    const c = callOutFirst();
    const start = startAction(c, { team: null, seat: "first-assistant", lineup: null });
    expect(pendingStart(createSession(c), start)).toEqual(start);

    // the session's own pace (auto): the start runs a team round, and the stand-in's call-out is asked inside the start's
    // own run — in the browser that is before the store is subscribed and the approval dialog can show the card
    const auto = await sessionOf(c);
    const askedInStart: string[] = [];
    auto.session.subscribe((e) => {
      if (e.msg.type !== "approval_request") return;
      askedInStart.push(e.msg.callout ?? "");
      auto.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
    });
    await auto.session.run({ type: "clinical_action", action: start });
    expect(askedInStart).toEqual(["Clipping the cystic duct."]);

    // the web's pace for a new start in a place: the start takes no team round — nothing asked, no step of the stand-in's
    const app = await sessionOf(c, startPace(start));
    const events = await app.session.run({ type: "clinical_action", action: start });
    expect(events.filter((e) => e.msg.type === "error")).toEqual([]);
    expect(app.session.state.seat).toBe("first-assistant");
    expect(app.session.state.phase).toBe("clipping");
    expect(events.filter((e) => e.msg.type === "approval_request" || (e.msg.type === "turn_started" && e.msg.agent === "team"))).toEqual([]);
    expect(app.session.team()?.autonomy).toBe("step");
    expect((app.session.state.procedure?.refs ?? []).filter((r) => r.startsWith("standin:"))).toEqual([]);

    // entered (the store subscribed, the call-out card able to answer): the team goes on at its own pace — its call-out is
    // asked of the learner as the card, let go on, and the stand-in clips
    const { cards, off } = answerCallouts(app, () => "go");
    await app.session.run(teamGoesOn(app.session.state, start)!);
    off();
    expect(cards.map((x) => [x.line, x.requestId.length > 0])).toEqual([["Clipping the cystic duct.", true]]);
    expect([...app.store.resolved.values()]).toEqual(["approved"]);
    expect(app.store.pendingApprovals()).toEqual([]);
    expect(app.session.team()?.autonomy).toBe("auto");
    expect(app.session.state.procedure?.clips["cystic-duct"] ?? 0).toBeGreaterThan(0);
  }, 60_000);
});

/** The messages of one type among a run's events. */
const msgsOf = <T extends AgentEvent["msg"]["type"]>(events: readonly AgentEvent[], type: T) => events.flatMap((e) => (e.msg.type === type ? [e.msg as Extract<AgentEvent["msg"], { type: T }>] : []));

describe("the settings while a place is held: the web keeps what the session runs with", () => {
  let open: AppSession[] = [];
  afterEach(async () => {
    for (const a of open) await a.close();
    open = [];
  });
  const facility = theatreFacility();
  const inPlace = async (stored = defaultSettings(), resume?: AppSession["snapshot"] extends () => infer S ? S : never) => {
    const app = await startAppSession({ caseDef: theatreCase(), facility, catalogs: [...catalogs(), theatreCatalog()], stored, choice: offline, locale: "en", served: false, embodiment: "embodied", ...(resume ? { resume } : {}) });
    open.push(app);
    return app;
  };
  const withMode = (approvalMode: "plan" | "default" | "strict", practiceScope: "full" | "workup" = "full") => {
    const stored = defaultSettings();
    stored.agent.approvalMode = approvalMode;
    stored.agent.practiceScope = practiceScope;
    return stored;
  };

  it("a change the session refuses (place.configRefused) comes back as the values it kept, said once — never asked again on the next change", async () => {
    const app = await inPlace();
    const said: string[] = [];
    app.session.subscribe((e) => {
      if (e.msg.type === "error") said.push(e.msg.message);
    });
    expect(msgsOf(await app.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } }), "error")).toEqual([]);
    // plan mode would stop the stand-in surgeon: refused, the session keeps its own — and says what it kept
    expect(await app.reconfigure(withMode("plan"), offline, "en")).toEqual({ approvalMode: "default", practiceScope: "full" });
    expect(said).toEqual([expect.stringMatching(/^While you hold the first assistant's place the stand-in surgeon operates, and this change would stop them/u)]);
    expect([app.session.settings.approvalMode, app.settings.approvalMode]).toEqual(["default", "default"]);
    // the preferences taken back (as the app does), a language switch asks for nothing the session refused
    expect(await app.reconfigure(withMode("default"), offline, "zh-CN")).toBeNull();
    expect(said).toHaveLength(1);
    expect(app.session.settings.locale).toBe("zh-CN");
    // a practice scope without the operation: refused the same way; strict mode stops nothing: taken
    expect(await app.reconfigure(withMode("default", "workup"), offline, "zh-CN")).toEqual({ approvalMode: "default", practiceScope: "full" });
    expect(await app.reconfigure(withMode("strict"), offline, "zh-CN")).toBeNull();
    expect(app.session.settings.approvalMode).toBe("strict");
  });

  it("a saved encounter in a place, resumed with settings that would stop the stand-in: the session says so before it goes on", async () => {
    const app = await inPlace();
    await app.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
    const snapshot = app.snapshot();
    expect(app.session.standInRefusal()).toBeNull();
    const plan = await inPlace(withMode("plan"), snapshot);
    expect(plan.session.state.seat).toBe("first-assistant");
    expect(plan.session.standInRefusal()).toMatch(/^Action not permitted: while you hold the first assistant's place the stand-in surgeon operates, and this session's settings would stop them \(.*\)\. Change the approval mode, the practice scope or the deny rules to go on with this encounter\.$/su);
    const fine = await inPlace(withMode("default"), snapshot);
    expect(fine.session.standInRefusal()).toBeNull();
  });
});

