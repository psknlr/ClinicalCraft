/**
 * C11 — travel time of an interrupted walk across levels: the flat distance
 * walked at WALK_SPEED plus the connector's seconds for every ride
 * completed; the navigation record's length adds the climb of every stairs
 * flight completed (as the planner's `length` does). An uninterrupted walk
 * charges exactly the plan.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, WALK_SPEED, type Mover, type NavGoal, type NavPlan } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { makeWorld } from "./__fixtures__/world.js";
import { connectorInfos, levelElevation } from "./levels.js";

const A = PRIMARY_ACTOR;

/** Stops at the path point `stopAt` (reports not arrived). */
function stoppingMover(stopAt: number): Mover {
  return {
    async move(_actor, plan) {
      const p = plan.path[stopAt]!;
      return { arrived: false, pose: { ...plan.target, x: p.x, z: p.z, level: p.level }, replans: 0 };
    },
  };
}

describe("C11: an interrupted walk across levels charges the flat walk plus the rides completed", () => {
  it("entrance → ICU bed 1 by the stairs (teaching hospital), stopping at every point of the path", async () => {
    const facility = loadFacility("teaching-hospital");
    const goal: NavGoal = { kind: "room", id: "icu-1" };
    const base = makeWorld("septic-shock-cap", { facility });
    const from = base.runtime.actor(A)!.pose;
    const plan = base.runtime.plan(A, goal) as Extract<NavPlan, { ok: true }>;
    expect(plan.ok).toBe(true);
    const viaIdx = plan.path.findIndex((p) => p.via);
    expect(viaIdx).toBeGreaterThan(0);
    const connector = connectorInfos(facility).find((c) => c.id === plan.path[viaIdx]!.via)!;
    // expected per stop: flat metres walked on the levels, rides and climbs completed
    let prev: { x: number; z: number; level: string } = from;
    let flat = 0;
    const expected: { seconds: number; length: number }[] = [];
    let rides = 0;
    let climb = 0;
    for (const p of plan.path) {
      if (p.via) {
        const c = connectorInfos(facility).find((x) => x.id === p.via)!;
        const a = c.stops.findIndex((s) => s.level === prev.level), b = c.stops.findIndex((s) => s.level === p.level);
        rides += c.travelSeconds * Math.abs(b - a);
        if (c.kind !== "elevator") climb += Math.hypot(p.x - prev.x, p.z - prev.z, levelElevation(facility, p.level) - levelElevation(facility, prev.level));
      } else if (p.level === prev.level) flat += Math.hypot(p.x - prev.x, p.z - prev.z);
      expected.push({ seconds: flat / WALK_SPEED + rides, length: flat + climb });
      prev = p;
    }
    // the whole path: exactly the plan
    expect(expected.at(-1)!.seconds).toBeCloseTo(plan.travelSeconds, 1);
    expect(expected.at(-1)!.length).toBeCloseTo(plan.length, 1);
    expect(connector.kind).toBe("stairs");
    for (let k = 0; k < plan.path.length; k++) {
      const w = makeWorld("septic-shock-cap", { facility, mover: stoppingMover(k) });
      const r = await w.act({ actorId: A, operation: "navigate", goal });
      expect(r.status).toBe("cancelled");
      const charged = w.harness.elapsed.reduce((s, e) => s + e.seconds, 0);
      expect(charged, `stop at #${k} (${plan.path[k]!.level}${plan.path[k]!.via ? ", just off the stairs" : ""})`).toBeCloseTo(expected[k]!.seconds, 1);
      expect(r.navigation!.length, `length at #${k}`).toBeCloseTo(expected[k]!.length, 1);
    }
  });

  it("a walk stopped before the connector charges only the flat distance (never a share of the stairs)", async () => {
    const facility = loadFacility("teaching-hospital");
    const w = makeWorld("septic-shock-cap", { facility, mover: stoppingMover(0) });
    const plan = w.runtime.plan(A, { kind: "room", id: "icu-1" }) as Extract<NavPlan, { ok: true }>;
    const from = w.runtime.actor(A)!.pose;
    const first = plan.path[0]!;
    await w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "icu-1" } });
    const charged = w.harness.elapsed.reduce((s, e) => s + e.seconds, 0);
    expect(charged).toBeCloseTo(Math.hypot(first.x - from.x, first.z - from.z) / WALK_SPEED, 2);
  });
});
