/**
 * C16 — reachability across levels: an entity on another level is reachable
 * when a usable connector (the actor's role, a route to and from its stops)
 * leads there; its path distance is the walking-equivalent of the route
 * (walk to the stop + the ride at walking speed + walk from the arrival
 * stop), so `find {reachableOnly}` keeps it and the path sort ranks it with
 * the rest.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, WALK_SPEED, type NavPlan } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { makeWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;

describe("C16: reachability across levels through the connectors", () => {
  it("the ICU upstairs is reachable from the entrance; reachableOnly keeps it; the distance tracks the planned route", () => {
    const w = makeWorld("septic-shock-cap", { facility: loadFacility("teaching-hospital") });
    const all = w.runtime.find(A, { kind: "room", name: "ICU" });
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) expect(e).toMatchObject({ level: "L1", reachable: true, pathDistance: expect.any(Number) });
    const reachable = w.runtime.find(A, { kind: "room", name: "ICU", reachableOnly: true });
    expect(reachable.map((e) => e.id).sort()).toEqual(all.map((e) => e.id).sort());
    const icu1 = all.find((e) => e.id === "room:icu-1")!;
    const plan = w.runtime.plan(A, { kind: "room", id: "icu-1" }) as Extract<NavPlan, { ok: true }>;
    expect(plan.ok).toBe(true);
    // walking-equivalent metres of the route (grid lengths over-estimate the string-pulled path a little)
    const equivalent = plan.travelSeconds * WALK_SPEED;
    expect(icu1.pathDistance!).toBeGreaterThan(equivalent * 0.8);
    expect(icu1.pathDistance!).toBeLessThan(equivalent * 1.4);
  });

  it("the path sort ranks the other level by its route, not last", () => {
    const w = makeWorld("septic-shock-cap", { facility: loadFacility("teaching-hospital") });
    const list = w.runtime.find(A, { kind: "equipment", type: "patient-monitor", sort: "path" });
    const distances = list.map((e) => e.pathDistance ?? Infinity);
    expect(distances.every((d) => Number.isFinite(d))).toBe(true);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    expect(list.some((e) => e.level === "L1")).toBe(true);
  });

  it("a connector the role may not use does not count (none at all: unreachable)", () => {
    const facility = structuredClone(loadFacility("teaching-hospital"));
    for (const c of facility.connectors ?? []) c.roles = ["porter"];
    const w = makeWorld("septic-shock-cap", { facility });
    const icu = w.runtime.find(A, { kind: "room", name: "ICU" });
    for (const e of icu) expect(e.reachable).toBe(false);
    expect(w.runtime.find(A, { kind: "room", name: "ICU", reachableOnly: true })).toEqual([]);
  });
});
