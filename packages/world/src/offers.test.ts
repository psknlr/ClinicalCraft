/**
 * What a front-end asks the world before it offers anything (docs/EMBODIED.md §8.2, §8.6): `offers` — each operation of
 * an entity with the action bus's own verdict for this actor, never where it stands — and `searchRefusal` — whether a
 * search would be refused before it runs (its role, the wound rule). Both read-only: no trace span, nothing remembered,
 * the world unchanged; and both agree with what the action bus then does.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "./contracts.js";
import { DEVICE, operate, STAFF, standBeside, theatreWorld, WHOLE_OPERATION } from "./__fixtures__/theatre.js";
import { makeWorld } from "./__fixtures__/world.js";

describe("offers: the world's verdict on each operation, for one body", () => {
  it("equals availableActions and says why not as the action bus does", async () => {
    const w = theatreWorld();
    for (const actor of [STAFF.scrub, STAFF.circulating, STAFF.anaesthetist, PRIMARY_ACTOR]) {
      for (const id of Object.values(DEVICE)) {
        const offers = w.runtime.offers(actor, id);
        expect(offers.length, `${actor} ${id}`).toBeGreaterThan(0);
        // what `observe` / `inspect` call availableActions, exactly
        expect(offers.filter((o) => o.available).map((o) => o.op), `${actor} ${id}`).toEqual(w.runtime.inspect(actor, id)!.availableActions);
      }
    }
    // the scrub nurse may load the stapler, not fire it: the refusal is the one the action bus gives
    const fire = w.runtime.offers(STAFF.scrub, DEVICE.stapler).find((o) => o.op === "fire")!;
    expect(fire).toMatchObject({ available: false, code: "NOT_AUTHORIZED", reason: "Fire the stapler is for the operating surgeon: Chen Yu is the scrub nurse." });
    expect(w.runtime.offers(STAFF.scrub, DEVICE.stapler).find((o) => o.op === "load")).toEqual({ op: "load", available: true });
    standBeside(w, STAFF.scrub, DEVICE.stapler);
    const done = await w.act({ actorId: STAFF.scrub, operation: "fire", targetId: DEVICE.stapler });
    expect({ code: done.errorCode, message: done.message }).toEqual({ code: fire.code, message: fire.reason });
    // an unknown id or body offers nothing
    expect(w.runtime.offers(PRIMARY_ACTOR, "eq:nothing-here")).toEqual([]);
    expect(w.runtime.offers("staff:nobody", DEVICE.stapler)).toEqual([]);
  });

  it("says when the actor's own steps fix a refusal (`fixable`: the way the action bus gives as the hint), never for a role or a state", async () => {
    // a cubicle's ECG cart, far from the resus bed: preparing it needs it at the bedside — fetch it there
    const w = makeWorld("stemi-inferior-rv", { facility: "general-hospital" });
    const cart = "eq:cub2-ecg";
    const offers = new Map(w.runtime.offers(PRIMARY_ACTOR, cart).map((o) => [o.op, o]));
    expect(offers.get("prepare")).toMatchObject({ available: false, code: "PRECONDITION_FAILED", fixable: true });
    // the attempt returns that way as its hint (fetch the cart, then wheel it to the patient)
    const tried = await w.act({ actorId: PRIMARY_ACTOR, operation: "prepare", targetId: cart });
    expect({ code: tried.errorCode, message: tried.message }).toEqual({ code: "PRECONDITION_FAILED", message: offers.get("prepare")!.reason });
    expect(tried.hint?.then).toMatchObject({ operation: "move_to", targetId: cart });
    // a step its state does not offer yet has no way to fix it from here: not fixable
    for (const [op, o] of offers) if (op !== "prepare" && !o.available) expect(o.fixable, op).toBeUndefined();
    // nor a refusal by control
    const t = theatreWorld();
    expect(t.runtime.offers(STAFF.scrub, DEVICE.stapler).find((o) => o.op === "fire")).not.toHaveProperty("fixable");
  });

  it("a thing the actor does not perceive and believes elsewhere, or knows to be missing: refused where it believes it is, as the action bus refuses it — never by its true place or state (audit P1-8, W1)", async () => {
    // the ED nurse wheels the cubicle's ECG cart to the patient and connects it while the clinician is in the office
    const w = makeWorld("stemi-inferior-rv", { facility: "general-hospital" });
    const cart = "eq:cub2-ecg";
    const nurse = "staff:ed-nurse";
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    expect((await w.act({ actorId: nurse, operation: "approach", targetId: cart })).status).toBe("completed");
    expect((await w.act({ actorId: nurse, operation: "move_to", targetId: cart, goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    for (const op of ["prepare", "connect"]) expect((await w.act({ actorId: nurse, operation: op, targetId: cart })).status, op).toBe("completed");
    const agrees = async (why: RegExp, fixable: boolean) => {
      const offers = w.runtime.offers(PRIMARY_ACTOR, cart);
      expect(offers.length).toBeGreaterThan(0);
      // nothing offered, as `inspect` offers nothing (what it offers depends on where it really is)
      expect(offers.filter((o) => o.available).map((o) => o.op)).toEqual(w.runtime.inspect(PRIMARY_ACTOR, cart)!.availableActions);
      expect(offers.filter((o) => o.available)).toEqual([]);
      for (const o of offers) {
        expect(o, o.op).toMatchObject({ available: false, code: "NOT_IN_RANGE" });
        expect(o.reason, o.op).toMatch(why);
        // nothing of where it truly is, what it is doing or who is using it
        expect(o.reason, o.op).not.toMatch(/in use|Lin Xiao|Idle|onnected|bedside/u);
        // the attempt: refused in the same words, with a way there exactly when `offers` says its steps fix it
        const tried = await w.act({ actorId: PRIMARY_ACTOR, operation: o.op, targetId: cart });
        expect({ code: tried.errorCode, message: tried.message }, o.op).toEqual({ code: o.code, message: o.reason });
        expect(!!tried.hint, o.op).toBe(fixable);
        expect(!!o.fixable, o.op).toBe(fixable);
      }
    };
    // believed in the cubicle, where it is usually kept: refused there — the walk there is the way
    await agrees(/you believe it is in ED Cubicle 2/u, true);
    // looked for there and not found: missing — refused with no way to go
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: cart } })).errorCode).toBe("STALE_DESTINATION");
    await agrees(/You do not know where Cubicle ECG Cart is now/u, false);
  });

  it("is read-only: no trace span, nothing remembered, the world unchanged", () => {
    const w = theatreWorld();
    const snap = JSON.stringify(w.runtime.snapshot());
    const n = w.trace.spans().length;
    w.runtime.offers(STAFF.scrub, DEVICE.stapler);
    w.runtime.offers(PRIMARY_ACTOR, DEVICE.tower);
    expect(JSON.stringify(w.runtime.snapshot())).toBe(snap);
    expect(w.trace.spans().length).toBe(n);
  });
});

describe("searchRefusal: the wound rule asked before a search", () => {
  it("refuses whom the action bus refuses, in the same words; null where the search would run", async () => {
    const w = theatreWorld({ start: { type: "start", lineup: "three-surgeons" } });
    // before the operation: nobody is refused the patient
    expect(w.runtime.searchRefusal(STAFF.circulating, w.patientId)).toBeNull();
    operate(w, WHOLE_OPERATION.slice(0, 3));
    for (const who of [STAFF.circulating, STAFF.scrub, STAFF.anaesthetist, STAFF.porter]) {
      const refused = w.runtime.searchRefusal(who, w.patientId);
      expect(refused, who).toMatchObject({ code: "NOT_AUTHORIZED" });
      standBeside(w, who, w.patientId, 1.3);
      const r = await w.act({ actorId: who, operation: "search", targetId: w.patientId });
      expect({ code: r.errorCode, message: r.message }, who).toEqual(refused);
    }
    expect(w.runtime.searchRefusal(STAFF.circulating, w.patientId)!.message).toBe("Checking the wound during the operation needs Traction, held by the operating surgeon, first assistant, second assistant: Lin Xiao is the circulating nurse.");
    // whoever holds traction; anyone searching where they stand; a body the world does not know
    for (const who of [PRIMARY_ACTOR, STAFF.first, STAFF.second]) expect(w.runtime.searchRefusal(who, w.patientId), who).toBeNull();
    for (const who of [STAFF.circulating, STAFF.scrub]) expect(w.runtime.searchRefusal(who), who).toBeNull();
    expect(w.runtime.searchRefusal("staff:nobody", w.patientId)).toBeNull();
    // the learner in the scrub nurse's place is told it is not theirs, in the learner's words
    const seat = theatreWorld({ start: { type: "start", seat: "scrub-nurse" } });
    operate(seat, WHOLE_OPERATION.slice(0, 2));
    expect(seat.runtime.searchRefusal(PRIMARY_ACTOR, seat.patientId)).toEqual({ code: "NOT_AUTHORIZED", message: "Checking the wound during the operation needs Traction, held by the operating surgeon, first assistant: you are the scrub nurse." });
  });

  it("is read-only: no trace span, the world unchanged", () => {
    const w = theatreWorld();
    operate(w, WHOLE_OPERATION.slice(0, 3));
    const snap = JSON.stringify(w.runtime.snapshot());
    const n = w.trace.spans().length;
    w.runtime.searchRefusal(STAFF.circulating, w.patientId);
    w.runtime.searchRefusal(PRIMARY_ACTOR);
    expect(JSON.stringify(w.runtime.snapshot())).toBe(snap);
    expect(w.trace.spans().length).toBe(n);
  });
});
