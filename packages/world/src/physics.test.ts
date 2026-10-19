import { describe, expect, it } from "vitest";
import { boxCollider, clampPitch, ColliderGrid, collides, moveVector, overlapsXZ, PHYSICS, RAMP, rampGround, rampTop, stepPlayer, targetFov, type PhysicsCollider, type PlayerState } from "./physics.js";

const bounds = { minX: -35.5, maxX: 35.5, minZ: -35.5, maxZ: 35.5 };
const still = { forward: 0, side: 0, yaw: 0, sprint: false, jump: false };
const player = (o: Partial<PlayerState> = {}): PlayerState => ({ x: 0, y: 0, z: 0, vy: 0, grounded: true, ...o });

describe("V4 physics constants", () => {
  it("keeps the exact V4 numbers", () => {
    expect(PHYSICS).toMatchObject({ speed: 3.9, sprint: 6.2, gravity: 18, jump: 6.3, height: 1.78, radius: 0.28, eye: 1.62, fov: 73, fovSprint: 79, maxDt: 0.05 });
    expect(targetFov(true, true)).toBe(79);
    expect(targetFov(true, false)).toBe(73);
    expect(clampPitch(3)).toBe(1.48);
    expect(clampPitch(-3)).toBe(-1.48);
  });
});

describe("moveVector (V4 basis: yaw 0 looks towards −Z)", () => {
  it("forward at yaw 0 moves −Z at walking speed", () => {
    const v = moveVector({ forward: 1, side: 0, yaw: 0, sprint: false });
    expect(v.dx).toBeCloseTo(0);
    expect(v.dz).toBeCloseTo(-3.9);
  });
  it("strafe right at yaw 0 moves +X; diagonal input is normalised", () => {
    expect(moveVector({ forward: 0, side: 1, yaw: 0, sprint: false }).dx).toBeCloseTo(3.9);
    const d = moveVector({ forward: 1, side: 1, yaw: 0, sprint: true });
    expect(Math.hypot(d.dx, d.dz)).toBeCloseTo(6.2);
  });
  it("yaw π/2 turns forward towards −X", () => {
    const v = moveVector({ forward: 1, side: 0, yaw: Math.PI / 2, sprint: false });
    expect(v.dx).toBeCloseTo(-3.9);
    expect(v.dz).toBeCloseTo(0);
  });
});

describe("stepPlayer (V4 Pd)", () => {
  it("caps dt at 50 ms", () => {
    const p = stepPlayer(player(), { ...still, forward: 1 }, 1, [], bounds);
    expect(p.z).toBeCloseTo(-3.9 * 0.05);
  });
  it("clamps to the facility bounds", () => {
    const p = stepPlayer(player({ x: 35.45 }), { ...still, side: 1 }, 0.05, [], bounds);
    expect(p.x).toBe(35.5);
  });
  it("blocks movement into a wall but slides along the free axis", () => {
    const wall = boxCollider(0, 2.5, -1, 10, 5, 1); // z ∈ [−1.5, −0.5]
    const p = player({ z: -0.2 });
    for (let i = 0; i < 20; i++) stepPlayer(p, { ...still, forward: 1, side: 1 }, 0.05, [wall], bounds);
    expect(p.z).toBeGreaterThanOrEqual(-0.5 + PHYSICS.radius - 1e-9);
    expect(p.x).toBeGreaterThan(1);
  });
  it("disabled colliders (open doors) are ignored", () => {
    const door = boxCollider(0, 1.5, -0.6, 3, 3, 0.2, { enabled: false });
    const p = player();
    for (let i = 0; i < 10; i++) stepPlayer(p, { ...still, forward: 1 }, 0.05, [door], bounds);
    expect(p.z).toBeLessThan(-1);
  });
  it("jumps with v0 = 6.3 and lands back on the ground", () => {
    const p = player();
    stepPlayer(p, { ...still, jump: true }, 0.05, [], bounds);
    expect(p.grounded).toBe(false);
    expect(p.vy).toBeCloseTo(6.3 - 18 * 0.05);
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      stepPlayer(p, still, 0.05, [], bounds);
      peak = Math.max(peak, p.y);
    }
    expect(peak).toBeGreaterThan(0.9);
    expect(peak).toBeLessThan(1.2);
    expect(p.y).toBe(0);
    expect(p.grounded).toBe(true);
  });
  it("lands on top of a block and bumps its head on a ceiling", () => {
    const block = boxCollider(0.5, 0.5, 0.5, 1, 1, 1);
    const p = player({ x: 0.5, z: 0.5, y: 1.5, grounded: false });
    for (let i = 0; i < 30; i++) stepPlayer(p, still, 0.05, [block], bounds);
    expect(p.y).toBe(1);
    expect(p.grounded).toBe(true);
    const ceiling = boxCollider(0, 2.3, 0, 4, 0.2, 4);
    const q = player();
    stepPlayer(q, { ...still, jump: true }, 0.05, [ceiling], bounds);
    for (let i = 0; i < 5; i++) stepPlayer(q, still, 0.05, [ceiling], bounds);
    expect(q.y + PHYSICS.height).toBeLessThanOrEqual(2.2 + 1e-9);
  });
});

describe("collision helpers", () => {
  it("overlapsXZ uses the player radius", () => {
    const c = { minX: 1, maxX: 2, minZ: 0, maxZ: 1 };
    expect(overlapsXZ({ x: 0.75, z: 0.5 }, c)).toBe(true);
    expect(overlapsXZ({ x: 0.7, z: 0.5 }, c)).toBe(false);
  });
  it("collides ignores colliders above the head", () => {
    expect(collides({ x: 0, y: 0, z: 0 }, [boxCollider(0, 3, 0, 1, 1, 1)])).toBe(false);
    expect(collides({ x: 0, y: 0, z: 0 }, [boxCollider(0, 1, 0, 1, 1, 1)])).toBe(true);
  });
  it("ColliderGrid returns nearby colliders exactly once", () => {
    const g = new ColliderGrid(2);
    const long = g.add(boxCollider(0, 2, 0, 30, 4, 1));
    const far = g.add(boxCollider(20, 1, 20, 1, 2, 1));
    const near = g.query(5, 0, 1);
    expect(near.filter((c) => c === long)).toHaveLength(1);
    expect(near).not.toContain(far);
    g.remove(long);
    expect(g.query(5, 0, 1)).not.toContain(long);
    expect(g.size).toBe(1);
  });
});

describe("ramps (stairs and ramp flights, EMBODIED R10)", () => {
  // a flight rising 4 m towards −Z from z = 6 (foot, y 0) to z = 0 (head, y 4), 2 m wide; an upper floor slab beyond the head
  const ramp: PhysicsCollider = { minX: -1, maxX: 1, minY: 0, maxY: 4, minZ: 0, maxZ: 6, ramp: { axis: "z", from: 6, to: 0, y0: 0, y1: 4 } };
  const slab: PhysicsCollider = boxCollider(0, 3.9, -5, 10, 0.2, 10); // top at y 4, z −10 … 0
  const colliders = [ramp, slab];
  const go = (p: PlayerState, yaw: number, steps: number, input: Partial<{ jump: boolean; sprint: boolean }> = {}, each?: (p: PlayerState) => void) => {
    for (let i = 0; i < steps; i++) {
      stepPlayer(p, { ...still, forward: 1, yaw, ...input }, 0.05, colliders, bounds);
      each?.(p);
    }
    return p;
  };

  it("rampTop is the surface under the disc's uphill edge (level beyond the flight, −∞ off it)", () => {
    expect(rampTop(ramp, 0, 3)).toBeCloseTo(((6 - 3 + PHYSICS.radius) / 6) * 4, 9);
    expect(rampTop(ramp, 0, 6 + PHYSICS.radius - 0.01)).toBeCloseTo(0, 1);
    expect(rampTop(ramp, 0, 0.1)).toBe(4);
    expect(rampTop(ramp, 0, 6.5)).toBe(-Infinity);
    expect(rampTop(ramp, 5, 3)).toBe(-Infinity);
    expect(rampGround({ x: 0, z: 3 }, colliders)).toBe(rampTop(ramp, 0, 3));
    expect(rampGround({ x: 0, z: 3 }, [slab])).toBe(-Infinity);
  });

  it("walks up the flight onto the upper floor, feet on the surface", () => {
    const p = player({ z: 7 });
    let last = 0;
    go(p, 0, 70, {}, (q) => {
      expect(q.y).toBeGreaterThanOrEqual(last - 1e-9);
      if (q.z > PHYSICS.radius && q.z < 6) expect(q.y).toBeCloseTo(rampTop(ramp, q.x, q.z), 6);
      last = q.y;
    });
    expect(p.z).toBeLessThan(-1);
    expect(p).toMatchObject({ y: 4, grounded: true });
    // sprinting up works too
    const fast = go(player({ z: 7 }), 0, 50, { sprint: true });
    expect(fast).toMatchObject({ y: 4, grounded: true });
  });

  it("walks down without leaving the surface and steps off onto the floor", () => {
    const p = player({ z: -1, y: 4 });
    go(p, Math.PI, 70, { sprint: true }, (q) => expect(q.grounded).toBe(true));
    expect(p.z).toBeGreaterThan(6);
    expect(p.y).toBe(0);
  });

  it("the flight's sides and its underside are walls; a low part can be stepped onto", () => {
    const side = player({ x: 3, z: 2 }); // beside the high part, walking west into it
    go(side, Math.PI / 2, 30);
    expect(side.x).toBeCloseTo(1 + PHYSICS.radius, 6);
    expect(side.y).toBe(0);
    const under = player({ z: -0.5 }); // on the lower floor beyond the head, walking under the flight
    go(under, Math.PI, 30);
    expect(under.z).toBeCloseTo(-PHYSICS.radius, 6);
    expect(collides({ x: 0, y: 0, z: 3 }, [ramp])).toBe(true);
    expect(collides({ x: 0, y: 2, z: 3 }, [ramp])).toBe(false);
    // the first 0.5 m of rise (RAMP.stepUp) can be stepped onto from the side
    const low = player({ x: 1.5, z: 5.7 });
    go(low, Math.PI / 2, 10);
    expect(low.x).toBeLessThan(1);
    expect(low.y).toBeGreaterThan(0);
    expect(low.y).toBeLessThanOrEqual(RAMP.stepUp);
  });

  it("a jump lands back on the surface", () => {
    const p = player({ z: 3, y: rampTop(ramp, 0, 3) });
    stepPlayer(p, { ...still, jump: true }, 0.05, colliders, bounds);
    expect(p.grounded).toBe(false);
    for (let i = 0; i < 40; i++) stepPlayer(p, still, 0.05, colliders, bounds);
    expect(p.grounded).toBe(true);
    expect(p.y).toBeCloseTo(rampTop(ramp, 0, 3), 6);
  });

  it("without ramps every step is unchanged (a ramp elsewhere does not alter a box trajectory)", () => {
    const wall = boxCollider(20, 2.5, -1, 10, 5, 1);
    const block = boxCollider(20.5, 0.5, 0.5, 1, 1, 1);
    const run = (extra: PhysicsCollider[]) => {
      const p = player({ x: 20, z: -0.2 });
      const trace: number[] = [];
      for (let i = 0; i < 40; i++) {
        stepPlayer(p, { ...still, forward: 1, side: 1, jump: i === 3 }, 0.05, [wall, block, ...extra], bounds);
        trace.push(p.x, p.y, p.z, p.vy, Number(p.grounded));
      }
      return trace;
    };
    expect(run([ramp])).toEqual(run([]));
  });
});
