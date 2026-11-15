/**
 * The scrub nurse's bar (`scrub-bar.ts`): shown in the scrub nurse's place only, stacked on the scope dock — what the
 * stand-in asks for (its open request, whichever line of the thread came last: read back and confirmed, the pass is
 * still asked for until the field shows it), its pass when the field takes it now (the window's own `tableOffer`), the
 * passes waiting, what the learner carries handed to whoever operates; observing, the team plays the place and nothing
 * is offered; never a window: the encounter's time runs on while it shows.
 */
import { afterEach, describe, expect, it } from "vitest";
import { atOperatingTable, PRIMARY_ACTOR } from "@clinicalcraft/world";
import { encounterClockRuns, PAUSING_PANELS } from "../app/clocks.js";
import type { AppSession } from "../app/session.js";
import { placeSession, said } from "./panels/__fixtures__/team-play.js";
import { answersFor, awaitedOf } from "./panels/team-view.js";
import { carriedItems, scrubBarView } from "./scrub-bar.js";

const open: AppSession[] = [];
afterEach(async () => {
  for (const app of open.splice(0)) await app.close();
});
const viewOf = (app: AppSession, carried: string[] = []) => {
  const world = app.world()!;
  return scrubBarView({ c: app.session.caseDef, s: app.session.state, facility: app.session.facility, atTable: (body) => atOperatingTable(world, body) }, app.session.team(), carried);
};
const scrubPlace = async () => {
  const app = await placeSession({ seat: "scrub-nurse" });
  open.push(app);
  // the stand-in asks for the scope before it inserts it (in this place every instrument is passed first)
  await app.session.run({ type: "team", action: "run", rounds: 40 });
  return app;
};

describe("the scrub nurse's bar", () => {
  it("in the scrub nurse's place: the instrument asked for and its pass, then what waits to go in; no other place has one", async () => {
    const app = await scrubPlace();
    const asked = viewOf(app)!;
    expect(asked.asked).toEqual({ instrument: "laparoscope", pass: { op: "pass", instrument: "laparoscope" } });
    expect(asked).toMatchObject({ waiting: [], count: null, handTo: null, plays: true });
    // passed: it waits to go in, in the operator's hand
    expect(said(await app.session.run({ type: "clinical_action", action: { type: "operate", op: asked.asked!.pass! } }))).toEqual([]);
    expect(viewOf(app)!.waiting).toEqual(["laparoscope"]);
    expect(app.session.state.procedure!.passed).toEqual([{ instrument: "laparoscope", by: "nurse-2" }]);
    // the bar is no window: nothing it shows pauses the encounter
    expect(encounterClockRuns({ entered: true, approvalOpen: false, panel: null })).toBe(true);
    expect([...PAUSING_PANELS].sort()).toEqual(["confirm-reset", "help", "pause", "settings"]);
    // the first assistant's place, or none: no bar
    for (const start of [{ seat: "first-assistant" as const }, {}]) {
      const other = await placeSession(start);
      open.push(other);
      await other.session.run({ type: "team", action: "run", rounds: 10 });
      expect(viewOf(other), JSON.stringify(start)).toBeNull();
    }
    expect(app.world()!.actor(PRIMARY_ACTOR)).toBeTruthy();
  });

  it("read back and confirmed as the team window offers it, the instrument is still asked for, with its pass, until the field shows it passed", async () => {
    const app = await scrubPlace();
    const request = awaitedOf(app.session.team()!);
    expect(request).toMatchObject({ kind: "line", message: { kind: "request", about: { field: { op: "pass", instrument: "laparoscope" } } } });
    const readBack = answersFor(app.session.team()!, request!.kind === "line" ? request!.message : (null as never)).find((a) => a.id === "readback")!;
    expect(said(await app.session.run("op" in readBack ? readBack.op : (null as never)))).toEqual([]);
    // the stand-in confirms the read-back ("Yes — go ahead."): its latest line is the confirmation, the pass still asked for
    await app.session.run({ type: "team", action: "step" });
    const latest = awaitedOf(app.session.team()!);
    expect(latest).toMatchObject({ kind: "line", message: { kind: "confirm" } });
    expect(viewOf(app)!.asked).toEqual({ instrument: "laparoscope", pass: { op: "pass", instrument: "laparoscope" } });
    // passed: what the field shows — waiting to go in; no second pass of it offered
    expect(said(await app.session.run({ type: "clinical_action", action: { type: "operate", op: { op: "pass", instrument: "laparoscope" } } }))).toEqual([]);
    const after = viewOf(app)!;
    expect(after.waiting).toEqual(["laparoscope"]);
    expect(after.asked?.pass ?? null).toBeNull();
  });

  it("observing, the team plays the place: what is asked for is shown, nothing offered — no pass, no count, no hand-over", async () => {
    const app = await scrubPlace();
    await app.session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
    const watched = viewOf(app, ["eq:t-swab"])!;
    expect(watched.plays).toBe(false);
    expect(watched.count).toBeNull();
    expect(watched.handTo).toBeNull();
    expect(watched.asked?.pass ?? null).toBeNull();
  });

  it("what the learner carries may be handed to whoever operates — the stand-in's body —, never what is worn", async () => {
    const app = await scrubPlace();
    expect(viewOf(app, ["eq:t-swab"])!.handTo).toEqual({ to: "staff:doc-0", items: ["eq:t-swab"] });
    // what the learner carries, from the world's own record: a worn item does not fill a hand
    const world = {
      actor: (id: string) => (id === PRIMARY_ACTOR ? ({ holding: ["eq:a", "eq:b"] } as never) : null),
      snapshot: () => ({ entities: { "eq:a": { data: { equipped: true } }, "eq:b": {} } }) as never,
    };
    expect(carriedItems(world)).toEqual(["eq:b"]);
  });
});
