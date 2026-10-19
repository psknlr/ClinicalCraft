import { PHYSICS, stepPlayer, type PlayerState } from "@clinicalcraft/world";
import { describe, expect, it } from "vitest";
import { nextWaypoint, steer, turnTowards, WAYPOINT_RADIUS, walkBudget } from "./steer.js";

const BOUNDS = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };

/** Walk a path the way the renderer's auto-walk does (no obstacles): steps until within `arrive` of the end. */
function simulate(start: { x: number; z: number; yaw: number }, path: { x: number; z: number }[], dt: number, arrive = 0.4, maxSteps = 4000) {
  const p: PlayerState = { x: start.x, y: 0, z: start.z, vy: 0, grounded: true };
  let yaw = start.yaw;
  let index = 0;
  const end = path[path.length - 1]!;
  for (let step = 0; step < maxSteps; step++) {
    if (Math.hypot(end.x - p.x, end.z - p.z) <= arrive) return { arrived: true, steps: step, seconds: step * dt, x: p.x, z: p.z };
    index = nextWaypoint(path, index, p.x, p.z);
    const s = steer(yaw, p.x, p.z, path[index]!, dt);
    yaw = s.yaw;
    stepPlayer(p, { forward: s.forward, side: 0, yaw, sprint: s.sprint, jump: false }, dt, [], BOUNDS);
  }
  return { arrived: false, steps: maxSteps, seconds: maxSteps * dt, x: p.x, z: p.z };
}

describe("auto-walk steering", () => {
  it("reaches a point just behind it on slow frames instead of orbiting it (regression)", () => {
    // the resus bay case: the avatar stood past the route's first point, the last one behind a turn
    const path = [
      { x: 28.25, z: -18.75 },
      { x: 29.25, z: -18.75 },
    ];
    for (const dt of [1 / 60, 1 / 30, PHYSICS.maxDt]) {
      for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 18.158607926562212]) {
        const r = simulate({ x: 28.76, z: -18.5, yaw }, path, dt);
        expect(r.arrived, `dt ${dt} yaw ${yaw}`).toBe(true);
        expect(r.seconds).toBeLessThan(3);
      }
    }
  });

  it("follows zig-zag routes with sharp turns at any frame rate", () => {
    const routes = [
      [
        { x: 1, z: -1 },
        { x: 1, z: -3 },
        { x: -1, z: -3 },
        { x: -1, z: -1 },
      ],
      [
        { x: 0, z: -0.6 },
        { x: 0.5, z: 0.4 },
        { x: -0.5, z: 0.4 },
        { x: 0, z: -2 },
      ],
      [
        { x: 11.75, z: 8.75 },
        { x: 11.75, z: -0.75 },
        { x: 18.75, z: -3.25 },
        { x: 23.75, z: -6.75 },
        { x: 25.25, z: -9.75 },
        { x: 26.75, z: -10.25 },
        { x: 30.25, z: -14.75 },
      ],
    ];
    for (const path of routes)
      for (const dt of [1 / 60, PHYSICS.maxDt]) {
        const r = simulate({ x: 0, z: 0, yaw: Math.PI }, path, dt);
        expect(r.arrived, `${JSON.stringify(path[0])} dt ${dt}`).toBe(true);
        // never much slower than walking the polyline
        let len = Math.hypot(path[0]!.x, path[0]!.z);
        for (let i = 1; i < path.length; i++) len += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.z - path[i - 1]!.z);
        expect(r.seconds).toBeLessThan(len / PHYSICS.speed + 2.5);
      }
  });

  it("skips waypoints reached or already passed, never the last one", () => {
    const path = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 2, z: 2 },
    ];
    // within the waypoint radius
    expect(nextWaypoint(path, 0, 0.2, 0.1)).toBe(1);
    // past it along the next segment (a long step on a slow frame)
    expect(nextWaypoint(path, 0, 0.5, 0.25)).toBe(1);
    // before it (not passed): keep heading there
    expect(nextWaypoint(path, 0, -0.6, 0)).toBe(0);
    // far from it, even if "ahead": not passed
    expect(nextWaypoint(path, 0, 1.5, 1.5)).toBe(0);
    // the last point is only reached by the arrival radius
    expect(nextWaypoint(path, 2, 2, 2 + WAYPOINT_RADIUS / 2)).toBe(2);
    expect(nextWaypoint(path, 1, 2.3, 0.4)).toBe(2);
  });

  it("turns at the same rate whatever the frame rate", () => {
    let a = 0, b = 0;
    for (let i = 0; i < 30; i++) a = turnTowards(a, 2, 1 / 60);
    for (let i = 0; i < 10; i++) b = turnTowards(b, 2, 1 / 20);
    expect(Math.abs(a - b)).toBeLessThan(0.02);
    // the short way round
    expect(turnTowards(3, -3, 1 / 60)).toBeGreaterThan(3);
  });

  it("turns in place when facing away from a nearby waypoint, walks when aligned", () => {
    const behind = steer(0, 0, 0, { x: 0, z: 1 }, 1 / 60);
    expect(behind.forward).toBe(0);
    const ahead = steer(0, 0, 0, { x: 0, z: -1 }, 1 / 60);
    expect(ahead.forward).toBe(1);
    // sprint only far from the waypoint
    expect(steer(0, 0, 0, { x: 0, z: -10 }, 1 / 60).sprint).toBe(true);
    expect(ahead.sprint).toBe(false);
  });

  it("gives a route walk a time budget that grows with its length", () => {
    expect(walkBudget(0)).toBeGreaterThan(5);
    expect(walkBudget(40)).toBeGreaterThan(walkBudget(10));
    expect(walkBudget(40)).toBeGreaterThan(40 / PHYSICS.speed * 2);
  });
});
