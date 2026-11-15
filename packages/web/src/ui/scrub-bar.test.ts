/**
 * The scrub nurse's bar (`scrub-bar.ts`): shown in the scrub nurse's place only, beside the scope dock — what the stand-in
 * asks for, its pass when the field takes it now (the window's own `tableOffer`), the passes waiting; never a window: the
 * encounter's time runs on while it shows.
 */
import { afterEach, describe, expect, it } from "vitest";
import { atOperatingTable, PRIMARY_ACTOR } from "@clinicalcraft/world";
import { encounterClockRuns, PAUSING_PANELS } from "../app/clocks.js";
import type { AppSession } from "../app/session.js";
import { placeSession, said } from "./panels/__fixtures__/team-play.js";
import { scrubBarView } from "./scrub-bar.js";

const open: AppSession[] = [];
afterEach(async () => {
  for (const app of open.splice(0)) await app.close();
});
const viewOf = (app: AppSession) => {
  const world = app.world()!;
  return scrubBarView({ c: app.session.caseDef, s: app.session.state, facility: app.session.facility, atTable: (body) => atOperatingTable(world, body) }, app.session.team());
};

describe("the scrub nurse's bar", () => {
  it("in the scrub nurse's place: the instrument asked for and its pass, then what waits to go in; no other place has one", async () => {
    const app = await placeSession({ seat: "scrub-nurse" });
    open.push(app);
    // the stand-in asks for the scope before it inserts it (in this place every instrument is passed first)
    await app.session.run({ type: "team", action: "run", rounds: 40 });
    const asked = viewOf(app)!;
    expect(asked.asked).toEqual({ instrument: "laparoscope", pass: { op: "pass", instrument: "laparoscope" } });
    expect(asked.waiting).toEqual([]);
    expect(asked.count).toBeNull();
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
});
