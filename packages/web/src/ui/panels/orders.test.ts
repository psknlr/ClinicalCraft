/**
 * The device panel and the team's panel ask the world (docs/EMBODIED.md §8.2, §8.6), never a rule of the web's own: a
 * device's operations are greyed out where the world's own verdict for the learner's body refuses them
 * (`WorldRuntime.offers` — its role and control, the device's state, preconditions; never where the learner stands),
 * with the world's reason; the search of the wound is offered as the world's `searchRefusal` allows it (the wound rule).
 */
import { afterEach, describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { DEVICE } from "../../../../world/src/__fixtures__/theatre.js";
import type { AppSession } from "../../app/session.js";
import { placeSession } from "./__fixtures__/team-play.js";
import { deviceOpOffers } from "./orders.js";

const open: AppSession[] = [];
afterEach(async () => {
  for (const app of open.splice(0)) await app.close();
});
const session = async (...args: Parameters<typeof placeSession>) => {
  const app = await placeSession(...args);
  open.push(app);
  return app;
};

describe("the device panel greys out what the world does not offer the learner's body", () => {
  it("in the scrub nurse's place the stapler is loaded, never fired — the world's reason; without a place every control is the learner's", async () => {
    const scrub = await session({ seat: "scrub-nurse" });
    const offers = deviceOpOffers(scrub.world(), DEVICE.stapler);
    expect(offers.get("load")).toEqual({ op: "load", available: true });
    expect(offers.get("fire")).toEqual({ op: "fire", available: false, code: "NOT_AUTHORIZED", reason: "Fire the stapler is for the operating surgeon: you are the scrub nurse." });
    // exactly what the world calls available
    expect([...offers.values()].filter((o) => o.available).map((o) => o.op)).toEqual(scrub.world()!.inspect(PRIMARY_ACTOR, DEVICE.stapler)!.availableActions);
    // the tower is the circulating nurse's equipment: not the scrub nurse's
    expect(deviceOpOffers(scrub.world(), DEVICE.tower).get("power_on")).toMatchObject({ available: false, code: "NOT_AUTHORIZED" });
    // operating (no place), the learner holds every control: only the device's own state stands in the way (the
    // stapler is empty — loaded first, then fired), as the world says it
    const operating = await session();
    const mine = deviceOpOffers(operating.world(), DEVICE.stapler);
    expect(mine.get("load")).toEqual({ op: "load", available: true });
    expect(mine.get("fire")).toMatchObject({ available: false });
    expect(mine.get("fire")!.code).not.toBe("NOT_AUTHORIZED");
    expect(deviceOpOffers(operating.world(), DEVICE.tower).get("power_on")).toEqual({ op: "power_on", available: true });
    // no world (clinical mode): nothing greyed out — the world decides on the click
    expect(deviceOpOffers(null, DEVICE.stapler).size).toBe(0);
  });
});

describe("the team's panel offers the search of the wound as the world allows it", () => {
  it("during the operation: the scrub nurse's place is told it is not theirs, the first assistant's checks it", async () => {
    const scrub = await session({ seat: "scrub-nurse" });
    await scrub.session.run({ type: "team", action: "run", rounds: 20 });
    expect(scrub.session.state.procedure).toBeDefined();
    const patient = `patient:${scrub.world()!.patientPlace()!.slot}`;
    expect(scrub.world()!.searchRefusal(PRIMARY_ACTOR, patient)).toEqual({ code: "NOT_AUTHORIZED", message: "Checking the wound during the operation needs Traction, held by the operating surgeon, first assistant: you are the scrub nurse." });
    // a search within reach is anyone's
    expect(scrub.world()!.searchRefusal(PRIMARY_ACTOR)).toBeNull();
    const first = await session({ seat: "first-assistant" });
    await first.session.run({ type: "team", action: "run", rounds: 20 });
    expect(first.world()!.searchRefusal(PRIMARY_ACTOR, patient)).toBeNull();
  });
});
