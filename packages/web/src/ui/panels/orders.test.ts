/**
 * The device panel and the team's panel ask the world (docs/EMBODIED.md §8.2, §8.6), never a rule of the web's own: a
 * device's operation is greyed out where the world's own verdict for the learner's body refuses it and no step of the
 * learner's fixes it (`WorldRuntime.offers` — its role and control, the device's state, a condition; never where the
 * learner stands), the world's reasons said under the buttons; a refusal the learner's own steps fix (the cart away from
 * the bedside) stays to press, so the world's way comes back ("Go there"); the search of the wound is offered as the
 * world's `searchRefusal` allows it for the patient's body the panel names (the wound rule).
 */
import { afterEach, describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { DEVICE, theatreFacility } from "../../../../world/src/__fixtures__/theatre.js";
import { makeWorld } from "../../../../world/src/__fixtures__/world.js";
import { EmbodiedLink } from "../../app/embodied-link.js";
import { BrowserMover } from "../../app/embodied.js";
import type { AppSession } from "../../app/session.js";
import { ActionFeedback } from "../feedback.js";
import { placeSession } from "./__fixtures__/team-play.js";
import { deviceOpOffer, deviceOpOffers, deviceOpReasons } from "./orders.js";
import { woundSearch } from "./team-view.js";

const open: AppSession[] = [];
const disposers: (() => void)[] = [];
afterEach(async () => {
  for (const dispose of disposers.splice(0)) dispose();
  for (const app of open.splice(0)) await app.close();
});
const session = async (...args: Parameters<typeof placeSession>) => {
  const app = await placeSession(...args);
  open.push(app);
  return app;
};

describe("the device panel greys out what the world does not offer the learner's body", () => {
  it("in the scrub nurse's place the stapler is loaded, never fired — the world's reason, said under the buttons; without a place every control is the learner's", async () => {
    const scrub = await session({ seat: "scrub-nurse" });
    const offers = deviceOpOffers(scrub.world(), DEVICE.stapler);
    expect(offers.get("load")).toEqual({ op: "load", available: true });
    expect(offers.get("fire")).toEqual({ op: "fire", available: false, code: "NOT_AUTHORIZED", reason: "Fire the stapler is for the operating surgeon: you are the scrub nurse." });
    // the buttons: Load offered, Fire greyed out with the world's reason — in the title and under the buttons
    expect(deviceOpOffer(offers.get("load"))).toEqual({ offered: true, why: null });
    expect(deviceOpOffer(offers.get("fire"))).toEqual({ offered: false, why: "Fire the stapler is for the operating surgeon: you are the scrub nurse." });
    expect(deviceOpReasons(offers)[0]).toBe("Fire the stapler is for the operating surgeon: you are the scrub nurse.");
    // exactly what the world calls available
    expect([...offers.values()].filter((o) => o.available).map((o) => o.op)).toEqual(scrub.world()!.inspect(PRIMARY_ACTOR, DEVICE.stapler)!.availableActions);
    // the tower is the circulating nurse's equipment: not the scrub nurse's
    expect(deviceOpOffer(deviceOpOffers(scrub.world(), DEVICE.tower).get("power_on")).offered).toBe(false);
    // operating (no place), the learner holds every control: only the device's own state stands in the way (the
    // stapler is empty — loaded first, then fired), as the world says it
    const operating = await session();
    const mine = deviceOpOffers(operating.world(), DEVICE.stapler);
    expect(mine.get("load")).toEqual({ op: "load", available: true });
    expect(mine.get("fire")).toMatchObject({ available: false });
    expect(mine.get("fire")!.code).not.toBe("NOT_AUTHORIZED");
    expect(deviceOpOffer(mine.get("fire")).offered).toBe(false);
    expect(deviceOpOffer(deviceOpOffers(operating.world(), DEVICE.tower).get("power_on"))).toEqual({ offered: true, why: null });
    // no world (clinical mode): nothing greyed out — the world decides on the click
    expect(deviceOpOffers(null, DEVICE.stapler).size).toBe(0);
    expect(deviceOpOffer(undefined)).toEqual({ offered: true, why: null });
  });

  it("a refusal the learner's own steps fix stays to press — the world's way comes back on the click; the state's are greyed out, their reasons said", async () => {
    // a cubicle's ECG cart, far from the resus bed (an encounter without a team, as on the base): Prepare is pressed and
    // the world answers with its way — fetch the cart and wheel it to the patient ("Go there")
    const w = makeWorld("stemi-inferior-rv", { facility: "general-hospital" });
    const cart = "eq:cub2-ecg";
    const offers = deviceOpOffers(w.runtime, cart);
    expect(offers.get("prepare")).toMatchObject({ available: false, code: "PRECONDITION_FAILED", fixable: true });
    expect(deviceOpOffer(offers.get("prepare")).offered).toBe(true);
    const tried = await w.act({ actorId: PRIMARY_ACTOR, operation: "prepare", targetId: cart });
    expect(tried.hint?.goal).toBeDefined();
    // the rest wait for the cart's state: greyed out, and why is said under them (never only in a tooltip)
    const greyed = [...offers.values()].filter((o) => !deviceOpOffer(o).offered);
    expect(greyed.length).toBeGreaterThan(0);
    const reasons = deviceOpReasons(offers);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(3);
    for (const r of reasons) expect(greyed.map((o) => o.reason)).toContain(r);
    // each reason once, a control's first
    const many = new Map([
      ["a", { op: "a", available: false, code: "PRECONDITION_FAILED", reason: "state" }],
      ["b", { op: "b", available: false, code: "PRECONDITION_FAILED", reason: "state" }],
      ["c", { op: "c", available: false, code: "NOT_AUTHORIZED", reason: "control" }],
      ["d", { op: "d", available: false, code: "PRECONDITION_FAILED", reason: "fixable", fixable: true }],
      ["e", { op: "e", available: true }],
    ] as const) as unknown as Map<string, Parameters<typeof deviceOpOffer>[0] & object>;
    expect(deviceOpReasons(many)).toEqual(["control", "state"]);
  });
});

describe("the team's panel offers the search of the wound as the world allows it", () => {
  /** The patient's body as the team's panel names it (`EmbodiedLink.patientId`), the browser's link drawing nothing. */
  const patientOf = (app: AppSession): string | null => {
    const link = new EmbodiedLink({ app, renderer: () => null, mover: new BrowserMover({ renderer: () => null }), facility: theatreFacility(), caseDef: app.session.caseDef, slotId: app.world()!.patientPlace()!.slot, feedback: new ActionFeedback(() => null, () => null, () => undefined), toast: () => undefined, locale: () => "en" });
    disposers.push(() => link.dispose());
    return link.patientId();
  };

  it("during the operation: the scrub nurse's place is told it is not theirs — the button greyed, the reason said —, the first assistant's checks it", async () => {
    const scrub = await session({ seat: "scrub-nurse" });
    await scrub.session.run({ type: "team", action: "run", rounds: 20 });
    expect(scrub.session.state.procedure).toBeDefined();
    const patient = patientOf(scrub);
    expect(patient).toBe(`patient:${scrub.world()!.patientPlace()!.slot}`);
    expect(woundSearch(scrub.world(), patient)).toEqual({ targetId: patient, offered: false, why: "Checking the wound during the operation needs Traction, held by the operating surgeon, first assistant: you are the scrub nurse." });
    // a search within reach is anyone's
    expect(scrub.world()!.searchRefusal(PRIMARY_ACTOR)).toBeNull();
    const first = await session({ seat: "first-assistant" });
    await first.session.run({ type: "team", action: "run", rounds: 20 });
    expect(woundSearch(first.world(), patientOf(first))).toEqual({ targetId: patient, offered: true, why: null });
    // no patient's body (clinical mode, or none bound): no wound to offer
    expect(woundSearch(first.world(), null)).toBeNull();
  });
});
