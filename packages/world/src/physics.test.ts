import { describe, expect, it } from "vitest";
import { boxCollider, clampPitch, ColliderGrid, collides, moveVector, overlapsXZ, PHYSICS, stepPlayer, targetFov, type PlayerState } from "./physics.js";

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
