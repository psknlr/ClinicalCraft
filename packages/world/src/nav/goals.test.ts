/**
 * S7 — navigation goals have a global cost bound: a goal has at most 16
 * leaves in all, no duplicates, ranges of at most 30 m (`goalProblem`, every
 * entry point that takes a goal); and `plan()` shares ONE expansion budget
 * (and an optional wall-time budget) across every target a goal resolves to,
 * memoising identical targets and clamping ranges — so the reviewer's
 * denial-of-service shapes finish fast or are refused.
 */
import { describe, expect, it } from "vitest";
import { goalProblem, MAX_GOAL_LEAVES, MAX_GOAL_RANGE } from "../actions.js";
import { buildCollisionModel } from "../collision.js";
import { PRIMARY_ACTOR, type NavGoal } from "../contracts.js";
import { buildRegistry } from "../registry.js";
import { loadCatalogs, loadFacility } from "../__fixtures__/content.js";
import { makeWorld } from "../__fixtures__/world.js";
import { GridAStarBackend } from "./backend.js";

const catalogs = loadCatalogs();

const A = PRIMARY_ACTOR;

/** Pack leaves into nested `any` goals of at most 16 each (the reviewer's shape). */
function nest(leaves: NavGoal[]): NavGoal {
  const chunk = (xs: NavGoal[]): NavGoal[] => {
    const out: NavGoal[] = [];
    for (let i = 0; i < xs.length; i += 16) out.push({ kind: "any", goals: xs.slice(i, i + 16) });
    return out;
  };
  let level = chunk(leaves);
  while (level.length > 1) level = chunk(level);
  return level[0]!;
}

describe("S7: goal shape bounds (goalProblem)", () => {
  it("at most 16 leaves in all, nested or not; no duplicates; ranges ≤ 30 m", () => {
    const leaf = (i: number): NavGoal => ({ kind: "interact", id: `eq:x-${i}` });
    expect(MAX_GOAL_LEAVES).toBe(16);
    expect(MAX_GOAL_RANGE).toBe(30);
    expect(goalProblem(nest(Array.from({ length: 16 }, (_, i) => leaf(i))))).toBeNull();
    expect(goalProblem(nest(Array.from({ length: 17 }, (_, i) => leaf(i))))).toMatch(/16/);
    expect(goalProblem(nest(Array.from({ length: 64 }, (_, i) => leaf(i))))).toMatch(/16/);
    expect(goalProblem({ kind: "any", goals: [leaf(1), { kind: "any", goals: [leaf(1)] }] })).toMatch(/duplicate/);
    expect(goalProblem({ kind: "look", id: "eq:ct-scanner", range: 1000 })).toMatch(/30/);
    expect(goalProblem({ kind: "point", x: 0, z: 0, range: 31 })).toMatch(/30/);
    expect(goalProblem({ kind: "entity", id: "patient", range: 30 })).toBeNull();
  });
});

describe("S7: plan() is bounded whatever reaches it", () => {
  it("the reviewer's shapes finish in well under a second (or are refused)", () => {
    const w = makeWorld("stemi-inferior-rv");
    const ids = w.runtime.entities().filter((e) => e.kind === "equipment").map((e) => e.id);
    const time = (goal: NavGoal) => {
      const t0 = performance.now();
      const plan = w.runtime.plan(A, goal);
      return { ms: performance.now() - t0, plan };
    };
    // through the runtime: an invalid goal is refused before any search
    const look = time({ kind: "look", id: "eq:ct-scanner", range: 1000 });
    expect(look.plan.ok).toBe(false);
    expect(look.ms).toBeLessThan(1000);
    for (const n of [16, 64, 256]) {
      const r = time(nest(Array.from({ length: n }, (_, i) => ({ kind: "look", id: ids[i % ids.length]!, range: 1000 }) as NavGoal)));
      expect(r.ms, `${n} look leaves`).toBeLessThan(1000);
    }
  });

  it("the backend itself (a caller that skips goalProblem) caps targets, clamps ranges and shares one expansion budget", () => {
    const f = loadFacility("general-hospital");
    const collision = buildCollisionModel(f, catalogs, { patients: [] });
    const registry = buildRegistry(f, catalogs, null, collision);
    const ids = registry.ofKind("equipment").map((e) => e.id);
    const backend = new GridAStarBackend({ facility: f, collision, registry, locale: "en", maxExpanded: 50_000 });
    const from = { x: f.spawn.x, y: 0, z: f.spawn.z, yaw: 0, pitch: 0, level: "L0" };
    const plan = (goal: NavGoal) => {
      const t0 = performance.now();
      const r = backend.plan({ actorId: A, from, goal, role: "clinician" });
      return { r, ms: performance.now() - t0 };
    };
    for (const n of [64, 256]) {
      const look = plan(nest(Array.from({ length: n }, (_, i) => ({ kind: "look", id: ids[i % ids.length]!, range: 1000 }) as NavGoal)));
      expect(look.ms, `${n} look leaves`).toBeLessThan(1000);
      const interact = plan(nest(Array.from({ length: n }, (_, i) => ({ kind: "interact", id: ids[i % ids.length]! }) as NavGoal)));
      expect(interact.ms, `${n} interact leaves`).toBeLessThan(1000);
    }
    // the shared budget: unreachable targets do not get a budget each (a sealed point, sixteen times)
    const sealed = plan({ kind: "any", goals: Array.from({ length: 16 }, (_, i) => ({ kind: "point", x: -45 + i * 0.01, z: -7.2 }) as NavGoal) });
    expect(sealed.ms).toBeLessThan(1000);
    // identical targets are planned once and a normal goal still plans
    expect(plan({ kind: "any", goals: [{ kind: "interact", id: "eq:resus1-ecg" }, { kind: "interact", id: "eq:resus1-ecg" }] }).r.ok).toBe(true);
  });

  it("through the action bus: navigate with an oversized goal is an INVALID_REQUEST, at once", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const ids = w.runtime.entities().filter((e) => e.kind === "equipment").map((e) => e.id);
    const t0 = performance.now();
    const r = await w.act({ actorId: A, operation: "navigate", goal: nest(Array.from({ length: 64 }, (_, i) => ({ kind: "interact", id: ids[i % ids.length]! }) as NavGoal)) });
    expect(r).toMatchObject({ status: "failed", errorCode: "INVALID_REQUEST" });
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
