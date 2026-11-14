/**
 * A place in the care team at the start, in the web (docs/EMBODIED.md §2.1, docs/TEAM.md §1): the page's choices
 * (`?team=`, `?seat=`, `?lineup=`, `__QA__.start`) reach the start; the intro's picker shows nothing new for any built-in
 * case (none has a team) and the places and line-ups of a case that offers them; a saved encounter's own place; a case
 * served without its reference solution (`clinicalcraft serve`) gets its place path fetched beside it, so it offers the
 * same places and a start in a place joins the team exactly as the full case's does — and the learner's body joins the
 * team at the operating table, the first-person view following the world's pose once (a resume does not move it again).
 */
import { afterEach, describe, expect, it } from "vitest";
import { caseIndexEntry } from "@clinicalcraft/agent";
import { canJoinTeam, createSession, parseCase, placePath, reduce, seatsOf, type CaseDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { theatreCase, theatreCatalog, theatreFacility } from "../../../world/src/__fixtures__/theatre.js";
import { catalogs } from "../../../world/src/__fixtures__/world.js";
import type { WorldApi } from "../contracts.js";
import { ActionFeedback } from "../ui/feedback.js";
import { lapCholeTeamCase } from "../ui/panels/__fixtures__/lap-chole-sit.js";
import { loadContent, placePathOf, placeReady } from "./content.js";
import { BrowserMover } from "./embodied.js";
import { EmbodiedLink } from "./embodied-link.js";
import { offersPlaces, pendingStart, placePicker, placesOffered, savedPlace, startAction, startChoiceFromSearch, withStartArgs, type StartChoice } from "./places.js";
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
    // what the case does not have is not sent (as ?team= always was); a place whenever the case has a team — with its card,
    // only the places the card offers with the line-up: what the picker shows is what is sent
    expect(startAction(k, { team: "nope", seat: "scrub-nurse", lineup: "nope" })).toEqual({ type: "start", seat: "scrub-nurse" });
    const card = cardOf(k);
    expect(startAction(k, { team: null, seat: "second-assistant", lineup: null }, card)).toEqual({ type: "start" });
    expect(startAction(k, { team: null, seat: "second-assistant", lineup: "three-surgeons" }, card)).toEqual({ type: "start", seat: "second-assistant", lineup: "three-surgeons" });
    // a scenario that makes the place's member absent is the session's to refuse: the card lists the place
    expect(startAction(k, { team: "scrub-break", seat: "scrub-nurse", lineup: null }, card)).toEqual({ type: "start", team: "scrub-break", seat: "scrub-nurse" });
    const noTeam = loadContent().cards[0]!;
    expect(startAction({ team: undefined }, { team: null, seat: "first-assistant", lineup: "three-surgeons" })).toEqual({ type: "start" });
    expect(noTeam.seats).toEqual([]);
  });

  it("__QA__.start(case, facility, resume, team, seat, lineup) takes them; its four-argument form keeps the page's place", () => {
    const page = startChoiceFromSearch("?seat=scrub-nurse&lineup=three-surgeons");
    expect(withStartArgs(page, "scrub-break")).toEqual({ team: "scrub-break", seat: "scrub-nurse", lineup: "three-surgeons" });
    expect(withStartArgs(NONE, "", "first-assistant", "three-surgeons")).toEqual({ team: null, seat: "first-assistant", lineup: "three-surgeons" });
    expect(withStartArgs(page, undefined, "surgeon", "")).toEqual({ team: null, seat: null, lineup: null });
    expect(withStartArgs(NONE)).toEqual(NONE);
  });

  it("a start is sent once: never again once the encounter has started (a resumed save) or finished", () => {
    const k = lapCholeTeamCase();
    const choice = { team: null, seat: "first-assistant" as const, lineup: null };
    expect(pendingStart(createSession(k), k, choice)).toEqual({ type: "start", seat: "first-assistant" });
    const started = reduce(k, createSession(k), { type: "start", seat: "first-assistant" }).state;
    expect(pendingStart(started, k, choice)).toBeNull();
    expect(pendingStart({ started: false, finished: true }, k, choice)).toBeNull();
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

  it("shows a case's line-ups and the places each offers, in-world only; a choice the case does not offer reads as the default", () => {
    const card = cardOf(lapCholeTeamCase());
    expect(offersPlaces(card)).toBe(true);
    expect(placePicker(card, false, NONE)).toBeNull();
    expect(placePicker(card, true, NONE)).toEqual({ lineups: [{ id: "three-surgeons", name: { en: "Three surgeons", "zh-CN": "Three surgeons" }, provenance: "authored", seats: ["first-assistant", "second-assistant", "scrub-nurse"] }], lineup: null, places: ["first-assistant", "scrub-nurse"], seat: null });
    expect(placePicker(card, true, { seat: "second-assistant", lineup: null })?.seat).toBeNull();
    expect(placePicker(card, true, { seat: "second-assistant", lineup: "three-surgeons" })).toMatchObject({ lineup: "three-surgeons", seat: "second-assistant" });
    expect(placePicker(card, true, { seat: "first-assistant", lineup: "nope" })).toMatchObject({ lineup: null, seat: "first-assistant" });
    expect(placesOffered(card, "three-surgeons")).toEqual(seatsOf(lapCholeTeamCase(), { lineup: "three-surgeons" }).filter((x) => x !== "surgeon"));
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
    await expect(placeReady(bare, async () => ({ id: "another-case", path: [] }))).rejects.toThrow(/place path/);

    // the web's own session: the start in the first assistant's place
    const facility = theatreFacility();
    const app = await startAppSession({ caseDef: ready, facility, catalogs: [...catalogs(), theatreCatalog()], stored: defaultSettings(), choice: offline, locale: "en", served: false, embodiment: "embodied" });
    const start = pendingStart(app.session.state, ready, { team: null, seat: "first-assistant", lineup: null })!;
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
    expect(pendingStart(again.session.state, ready, { team: null, seat: "first-assistant", lineup: null })).toBeNull();
    expect(again.world()!.actor(PRIMARY_ACTOR)!.pose.x).toBeCloseTo(pose.x + 1.2, 5);
  });
});
