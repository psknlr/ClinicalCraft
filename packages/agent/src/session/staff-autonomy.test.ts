/**
 * Each colleague's role state (docs/TEAM.md §5, docs/PROTOCOL.md "staffStates"), derived from the record and the world:
 * the care team's work of theirs — a request not yet answered, a task not yet done — read by their member id (their
 * body, `staff:<id>`), and, for the theatre, the place they stand in, the controls they hold in the operative field,
 * the tasks they may be handed now (by role; the operating table's by control) and whether they stand by while the
 * learner holds their place.
 */
import { describe, expect, it } from "vitest";
import type { TestSession } from "../__fixtures__/harness.js";
import { STAFF, system, theatreSession } from "./__fixtures__/theatre.js";

const role = (t: TestSession, actorId: string) => t.session.staffStates().find((r) => r.actorId === actorId)!;
const CARE = ["attach_monitor", "record_ecg", "obtain_iv_access", "fetch_equipment", "give_intervention", "transport_patient"];

describe("a colleague's role state", () => {
  it("lists the care team's work of theirs: the request she has not answered yet, then the task she carries", async () => {
    const t = await theatreSession();
    system(t, { type: "start", by: "system" });
    system(t, { type: "set-phase", phase: "theatre", by: "system" });
    await t.session.run({ type: "team", action: "pause" });
    await t.session.run({ type: "team", action: "need", item: "test-swab" });
    for (let i = 0; i < 12 && role(t, STAFF.scrub).pendingRequests.length === 0; i++) await t.session.run({ type: "team", action: "step" });
    const asked = role(t, STAFF.scrub);
    expect(asked.pendingRequests.length).toBe(1);
    const request = t.session.team()!.state.messages.find((m) => m.id === asked.pendingRequests[0])!;
    expect(request).toMatchObject({ kind: "request", to: STAFF.scrub, from: STAFF.circulating });
    // she answers it: no longer pending — her task is hers until it is done
    for (let i = 0; i < 12 && role(t, STAFF.scrub).pendingRequests.length > 0; i++) await t.session.run({ type: "team", action: "step" });
    const working = role(t, STAFF.scrub);
    expect(working.pendingRequests).toEqual([]);
    const task = t.session.team()!.state.tasks.find((x) => x.owner === STAFF.scrub)!;
    expect(task).toBeDefined();
    if (!["done", "declined", "escalated"].includes(task.status)) expect(working.responsibility).toContain(`task ${task.id}`);
    // the circulating nurse's own task (she noticed the need) is hers
    const noticed = t.session.team()!.state.tasks.find((x) => x.owner === STAFF.circulating)!;
    expect(noticed).toBeDefined();
    if (!["done", "declined", "escalated"].includes(noticed.status)) expect(role(t, STAFF.circulating).responsibility).toContain(`task ${noticed.id}`);
    await t.session.close();
  });

  it("names the place each colleague stands in, their controls in the field and the tasks they may be handed", async () => {
    const t = await theatreSession();
    system(t, { type: "start", by: "system" });
    expect(role(t, STAFF.scrub)).toMatchObject({ seat: "scrub-nurse", controls: ["instruments", "count"], delegable: [...CARE, "pass_instrument"], standingBy: false });
    expect(role(t, STAFF.first)).toMatchObject({ seat: "first-assistant", controls: ["camera", "retract", "suction"], delegable: [...CARE, "hold_traction", "release_traction", "hold_camera", "aim_camera"], standingBy: false });
    expect(role(t, STAFF.anaesthetist)).toMatchObject({ seat: null, controls: ["anaesthesia"], delegable: CARE, standingBy: false });
    expect(role(t, STAFF.circulating)).toMatchObject({ seat: null, controls: ["count", "equipment"], delegable: CARE, standingBy: false });
    // the second assistant's place exists only with the three-surgeon line-up
    expect(role(t, STAFF.second).seat).toBeNull();
    await t.session.close();
    const three = await theatreSession({ start: { type: "start", seat: "scrub-nurse", lineup: "three-surgeons" } });
    expect(role(three, STAFF.second)).toMatchObject({ seat: "second-assistant", controls: ["camera", "retract", "suction"] });
    // the first assistant holds no camera while a second assistant is present
    expect(role(three, STAFF.first).controls).toEqual(["retract", "suction"]);
    expect(role(three, STAFF.first).delegable).not.toContain("hold_camera");
    // the scrub nurse whose place the learner holds stands by: no controls, no task
    expect(role(three, STAFF.scrub)).toMatchObject({ seat: "scrub-nurse", controls: [], delegable: [], standingBy: true });
    await three.session.close();
  });
});
