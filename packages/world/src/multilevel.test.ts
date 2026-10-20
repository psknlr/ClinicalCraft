/**
 * Multi-level facilities (EMBODIED R10): flights and slabs, the collision
 * model of the template-built `teaching-hospital` (two levels, main stairs,
 * an elevator), the avatar walking up and down the real stairs colliders,
 * and navigation across levels by stairs and by elevator.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkFacility, parseCase, type CaseDefinition } from "@clinicalcraft/core";
import { buildCollisionModel, colliderIndex } from "./collision.js";
import type { NavGoal, NavPlan, Pose } from "./contracts.js";
import { connectorFlights, levelSlabs, RAIL_HEIGHT, SLAB_THICKNESS, subtractAreas } from "./levels.js";
import { GridAStarBackend } from "./nav/backend.js";
import { ColliderGrid, PHYSICS, RAMP, rampTop, stepPlayer, type PhysicsCollider, type PlayerState } from "./physics.js";
import { buildRegistry } from "./registry.js";
import { VisibilityModel } from "./visibility.js";
import { colliderDigest, facilityFrom, loadCatalogs, loadFacility } from "./__fixtures__/content.js";
import { twoLevelInput } from "./__fixtures__/two-level.js";

const catalogs = loadCatalogs();
const TH = loadFacility("teaching-hospital");
const loadCase = (id: string): CaseDefinition => {
  const r = parseCase(JSON.parse(readFileSync(new URL(`../../content/cases/${id}/case.json`, import.meta.url), "utf8")));
  if (!r.ok) throw new Error(id);
  return r.value;
};
const area = (a: { minX: number; maxX: number; minZ: number; maxZ: number }) => (a.maxX - a.minX) * (a.maxZ - a.minZ);

describe("flights and slabs (pure geometry)", () => {
  it("subtractAreas: a rect minus holes as disjoint rects covering exactly the rest", () => {
    const rect = { minX: -10, maxX: 10, minZ: -5, maxZ: 5 };
    const hole = { minX: -2, maxX: 2, minZ: -1, maxZ: 3 };
    const parts = subtractAreas(rect, [hole]);
    expect(parts.reduce((s, r) => s + area(r), 0)).toBeCloseTo(area(rect) - area(hole), 9);
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        expect(Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) <= 1e-9 || Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) <= 1e-9).toBe(true);
      }
    expect(parts).toHaveLength(4);
    expect(subtractAreas(rect, [hole])).toEqual(parts); // deterministic
    // a hole on the edge leaves three rects; no hole, the rect itself
    expect(subtractAreas(rect, [{ minX: -2, maxX: 2, minZ: 3, maxZ: 5 }])).toHaveLength(3);
    expect(subtractAreas(rect, [])).toEqual([rect]);
  });

  it("the teaching hospital's main stairs: one flight from the lobby (L0) up to the first-floor corridor (L1)", () => {
    const flights = connectorFlights(TH);
    expect(flights).toEqual([
      {
        connector: "connector:main-stairs",
        connectorId: "main-stairs",
        kind: "stairs",
        index: 0,
        foot: { level: "L0", x: -5.6, z: 8.3, elevation: 0 },
        head: { level: "L1", x: -5.6, z: 1.9, elevation: 4.5 },
        width: 2,
        area: { minX: -6.6, maxX: -4.6, minZ: 1.9, maxZ: 8.3 },
        surface: { axis: "z", from: 8.3, to: 1.9, y0: 0, y1: 4.5 },
      },
    ]);
    // stairs whose stops share x/z (the two-level fixture) are navigation-only: no flight, no hole
    const fixture = facilityFrom(twoLevelInput());
    expect(connectorFlights(fixture)).toEqual([]);
    expect(levelSlabs(fixture)).toEqual([{ level: "L1", building: "block", elevation: 4.5, rects: [{ minX: -12, maxX: 12, minZ: -8, maxZ: 8 }], holes: [] }]);
  });

  it("the first floor's slab is the building minus the stairwell", () => {
    const [slab, ...more] = levelSlabs(TH);
    expect(more).toEqual([]);
    expect(slab).toMatchObject({ level: "L1", building: "main", elevation: 4.5, holes: [{ minX: -6.6, maxX: -4.6, minZ: 1.9, maxZ: 8.3 }] });
    expect(slab.rects.reduce((s, r) => s + area(r), 0)).toBeCloseTo(50 * 20 - 2 * 6.4, 6);
  });
});

describe("teaching hospital: content and collision model", () => {
  const model = buildCollisionModel(TH, catalogs, { patients: [{ slotId: "resus-1.slot", posture: "lying" }] });
  const byId = colliderIndex(model);

  it("is a valid compiled facility: no errors, unique ids, entities on both levels", () => {
    expect(TH.instances).toEqual([]);
    expect(checkFacility(TH, catalogs).filter((i) => i.severity === "error")).toEqual([]);
    expect(new Set(model.colliders.map((c) => c.id)).size).toBe(model.colliders.length);
    const levels = new Set(model.colliders.map((c) => c.level));
    expect([...levels].sort()).toEqual(["L0", "L1"]);
  });

  it("pins the model (counts by kind and a digest of every box)", () => {
    const kinds: Record<string, number> = {};
    for (const c of model.colliders) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
    expect({ total: model.colliders.length, doors: model.doors.length, kinds, digest: colliderDigest(model.colliders) }).toMatchSnapshot();
  });

  it("walls per level: the entrance doors on the ground floor only, windows on both floors", () => {
    const doors = model.doors.map((d) => d.id);
    expect(doors).toEqual(expect.arrayContaining(["door:main:s:0", "door:main:e:0"]));
    expect(doors.filter((d) => d.startsWith("door:main@L1"))).toEqual([]);
    expect(model.colliders.filter((c) => c.kind === "window" && c.level === "L0").length).toBe(model.colliders.filter((c) => c.kind === "window" && c.level === "L1").length);
    expect(byId.get("window:main@L1:s:0")).toMatchObject({ level: "L1", minY: 5.5 });
    // first-floor walls stand on the slab: 4.5 … 9.0
    const l1Walls = model.colliders.filter((c) => c.kind === "wall" && c.level === "L1");
    expect(Math.min(...l1Walls.map((c) => c.minY))).toBeCloseTo(4.5);
    expect(Math.max(...l1Walls.map((c) => c.maxY))).toBeCloseTo(9);
  });

  it("slab, ramp and balustrades of the main stairs", () => {
    const slabs = model.colliders.filter((c) => c.kind === "slab");
    expect(slabs.every((c) => c.level === "L1" && c.maxY === 4.5 && Math.abs(c.minY - (4.5 - SLAB_THICKNESS)) < 1e-9)).toBe(true);
    // no slab over the stairwell
    expect(slabs.some((c) => c.minX < -5.6 && c.maxX > -5.6 && c.minZ < 5 && c.maxZ > 5)).toBe(false);
    expect(byId.get("ramp:main-stairs:0")).toMatchObject({ kind: "ramp", level: "L0", minX: -6.6, maxX: -4.6, minZ: 1.9, maxZ: 8.3, minY: 0, maxY: 4.5, ramp: { axis: "z", from: 8.3, to: 1.9, y0: 0, y1: 4.5 } });
    expect(byId.get("rail:main-stairs:0:w")).toMatchObject({ level: "L1", maxX: -6.6, minY: 0, maxY: 4.5 + RAIL_HEIGHT });
    expect(byId.get("rail:main-stairs:0:e")).toMatchObject({ level: "L1", minX: -4.6, minY: 0, maxY: 4.5 + RAIL_HEIGHT });
    expect(byId.get("rail:main-stairs:0:end")).toMatchObject({ level: "L1", minZ: 8.3, minY: 4.5 });
    // single-level facilities have none of them (their pins are unchanged)
    for (const id of ["clinic-v4", "general-hospital"] as const) expect(buildCollisionModel(loadFacility(id), catalogs).colliders.filter((c) => ["slab", "ramp", "rail"].includes(c.kind))).toEqual([]);
  });

  it("the elevator cars are rooms with sliding doors on both levels; patients and staff stand on their level", () => {
    expect(model.doors.find((d) => d.id === "door:lift-l0:w:0")).toMatchObject({ kind: "sliding-door", level: "L0" });
    expect(model.doors.find((d) => d.id === "door:lift-l1:w:0")).toMatchObject({ kind: "sliding-door", level: "L1" });
    expect(byId.get("eq:icu-1.bed")).toMatchObject({ level: "L1", minY: 4.5 });
    expect(byId.get("staff:teaching.attending")).toMatchObject({ level: "L1", minY: 4.5 });
    expect(byId.get("staff:receptionist")).toMatchObject({ level: "L0", minY: 0 });
  });
});

describe("physics on the real stairs (stepPlayer + the model's colliders, as the renderer runs it)", () => {
  const model = buildCollisionModel(TH, catalogs, { patients: [] });
  const grid = new ColliderGrid<PhysicsCollider>(2);
  for (const c of model.colliders) grid.add({ minX: c.minX, maxX: c.maxX, minY: c.minY, maxY: c.maxY, minZ: c.minZ, maxZ: c.maxZ, ...(c.kind === "door" ? { door: true } : {}), ...(c.ramp ? { ramp: c.ramp } : {}) });
  // interior door leaves are closed by default; open them all (doorways are not under test here)
  for (const c of grid.values()) if (c.door) c.enabled = false;
  const ramp = grid.values().find((c) => c.ramp)!;
  const bounds = TH.bounds;
  const walk = (p: PlayerState, yaw: number, seconds: number, onStep?: (p: PlayerState) => void) => {
    for (let t = 0; t < seconds; t += 0.05) {
      stepPlayer(p, { forward: 1, side: 0, yaw, sprint: false, jump: false }, 0.05, grid.query(p.x, p.z, 1.6), bounds);
      onStep?.(p);
    }
    return p;
  };

  it("rampTop: the surface under the disc's uphill edge, level beyond the flight, none off it", () => {
    expect(rampTop(ramp, -5.6, 8.3 + PHYSICS.radius + 0.01)).toBe(-Infinity);
    expect(rampTop(ramp, -5.6, 8.3)).toBeCloseTo((PHYSICS.radius / 6.4) * 4.5, 9);
    expect(rampTop(ramp, -5.6, 5.4)).toBeCloseTo(((8.3 - 5.4 + PHYSICS.radius) / 6.4) * 4.5, 9);
    expect(rampTop(ramp, -5.6, 1.7)).toBe(4.5);
    expect(rampTop({ ...ramp, ramp: undefined }, -5.6, 5)).toBe(-Infinity);
  });

  it("walks up the stairs from the lobby to the first floor (feet on the surface all the way)", () => {
    const p: PlayerState = { x: -5.6, y: 0, z: 9.2, vy: 0, grounded: true };
    let prevY = 0;
    walk(p, 0, 4, (q) => {
      expect(q.y).toBeGreaterThanOrEqual(prevY - 1e-9); // never falls back
      const top = rampTop(ramp, q.x, q.z);
      if (top > -Infinity && q.z > 1.9 + PHYSICS.radius) expect(Math.abs(q.y - top)).toBeLessThan(0.05);
      prevY = q.y;
    });
    expect(p.z).toBeLessThan(1.9);
    expect(p.y).toBe(4.5);
    expect(p.grounded).toBe(true);
    // keeps walking along the first-floor corridor on the slab
    walk(p, Math.PI / 2, 1);
    expect(p).toMatchObject({ y: 4.5, grounded: true });
  });

  it("walks back down without leaving the surface", () => {
    const p: PlayerState = { x: -5.6, y: 4.5, z: 1.0, vy: 0, grounded: true };
    walk(p, Math.PI, 4, (q) => {
      expect(q.grounded).toBe(true);
      const top = rampTop(ramp, q.x, q.z);
      if (top > -Infinity) expect(q.y - top).toBeLessThanOrEqual(RAMP.snapDown);
    });
    expect(p.z).toBeGreaterThan(8.3);
    expect(p.y).toBe(0);
  });

  it("the stairwell is guarded upstairs and the flight's side is a wall downstairs", () => {
    const up: PlayerState = { x: -3.2, y: 4.5, z: 5, vy: 0, grounded: true };
    walk(up, Math.PI / 2, 2); // west, towards the stairwell
    expect(up.x).toBeGreaterThanOrEqual(-4.6 + PHYSICS.radius - 1e-9);
    expect(up).toMatchObject({ y: 4.5, grounded: true });
    const down: PlayerState = { x: -3.2, y: 0, z: 4, vy: 0, grounded: true };
    walk(down, Math.PI / 2, 2);
    expect(down.x).toBeGreaterThanOrEqual(-4.6 + PHYSICS.radius - 1e-9);
    expect(down.y).toBe(0);
    // under the high end of the flight: the wedge is solid
    const under: PlayerState = { x: -5.6, y: 0, z: 0.5, vy: 0, grounded: true };
    walk(under, Math.PI, 2);
    expect(under.z).toBeLessThanOrEqual(1.9 - PHYSICS.radius + 1e-9);
    expect(under.y).toBe(0);
  });
});

describe("teaching hospital: navigation across levels", () => {
  const caseDef = loadCase("pulmonary-embolism-postop");
  const world = (f = TH, slotId = "icu-1.slot") => {
    const collision = buildCollisionModel(f, catalogs, { patients: [{ slotId, posture: "lying" }] });
    const registry = buildRegistry(f, catalogs, { caseDef, slotId, locale: "en" }, collision);
    const backend = new GridAStarBackend({ facility: f, collision, registry, locale: "en" });
    const spawn: Pose = { x: f.spawn.x, y: 0, z: f.spawn.z, yaw: 0, pitch: 0, level: "L0" };
    const plan = (goal: NavGoal, opts: { from?: Pose; role?: Parameters<typeof backend.plan>[0]["role"]; accessibleOnly?: boolean } = {}) =>
      backend.plan({ actorId: "actor:clinician", from: opts.from ?? spawn, goal, role: opts.role ?? "clinician", ...(opts.accessibleOnly ? { accessibleOnly: true } : {}) });
    return { collision, registry, backend, plan, spawn };
  };
  const ok = (p: NavPlan) => {
    if (!p.ok) throw new Error(`${p.code}: ${p.message} ${JSON.stringify(p.details ?? {})}`);
    return p;
  };
  const vias = (p: Extract<NavPlan, { ok: true }>) => p.path.filter((x) => x.via).map((x) => x.via);
  const w = world();

  it("spawn (L0) → the ICU patient on L1 by the main stairs", () => {
    const plan = ok(w.plan({ kind: "interact", id: "patient" }));
    expect(vias(plan)).toEqual(["connector:main-stairs"]);
    expect(plan.target).toMatchObject({ level: "L1", y: 4.5 });
    expect(plan.targetEntity).toBe("patient:icu-1.slot");
    // the stairs add their 4.5 m climb to the length and 15 s to the travel time
    expect(plan.length).toBeGreaterThan(Math.hypot(6.4, 4.5));
    expect(plan.travelSeconds).toBeGreaterThan(15);
  });

  it("the accessible route (a wheelchair, a bed, a cart) takes the elevator; so does a clinician when the stairs are for porters", () => {
    const lift = ok(w.plan({ kind: "interact", id: "patient" }, { accessibleOnly: true }));
    expect(vias(lift)).toEqual(["connector:lift"]);
    expect(lift.target.level).toBe("L1");
    const staffStairs = structuredClone(TH);
    staffStairs.connectors[0].roles = ["porter"];
    expect(vias(ok(world(staffStairs).plan({ kind: "interact", id: "patient" })))).toEqual(["connector:lift"]);
    expect(vias(ok(world(staffStairs).plan({ kind: "interact", id: "patient" }, { role: "porter" })))).toEqual(["connector:main-stairs"]);
  });

  it("back down to the entrance, and across the first floor without a connector", () => {
    const icu = ok(w.plan({ kind: "interact", id: "patient" })).target;
    const out = ok(w.plan({ kind: "point", x: 0, z: 20, level: "L0" }, { from: icu }));
    expect(vias(out)).toHaveLength(1);
    expect(out.target).toMatchObject({ level: "L0", x: 0, z: 20 });
    expect(vias(ok(w.plan({ kind: "room", id: "teaching" }, { from: icu })))).toEqual([]);
  });

  it("access zones: the dispensary is for pharmacists and nurses; the theatre for clinical staff", () => {
    expect(w.plan({ kind: "interact", id: "pharmacy.drug-cabinet" })).toMatchObject({ ok: false, code: "ACCESS_DENIED", details: { zones: ["pharmacy.dispensary"] } });
    ok(w.plan({ kind: "interact", id: "pharmacy.drug-cabinet" }, { role: "pharmacist" }));
    ok(w.plan({ kind: "interact", id: "pharmacy.records" })); // the public side of the counter
    ok(w.plan({ kind: "interact", id: "theatre.anaesthesia" }));
    expect(w.plan({ kind: "interact", id: "theatre.anaesthesia" }, { role: "lab-tech" })).toMatchObject({ ok: false, code: "ACCESS_DENIED", details: { zones: ["theatre.sterile"] } });
  });

  it("every interactive placement is reachable from the spawn (the dispensary's by a pharmacist)", () => {
    const failures = w.registry
      .ofKind("equipment")
      .filter((e) => e.interaction !== "none")
      .filter((e) => !w.plan({ kind: "interact", id: e.id }, { role: e.id.startsWith("eq:pharmacy.") ? "pharmacist" : "clinician" }).ok)
      .map((e) => e.id);
    expect(failures).toEqual([]);
    // every patient slot too (lying patients on their beds)
    for (const slot of TH.patientSlots) ok(world(TH, slot.id).plan({ kind: "interact", id: "patient" }));
  });

  it("the stairwell is void upstairs and the flight blocks the lobby floor downstairs; no sight between levels", () => {
    const l1 = w.backend.grids.grid("L1")!;
    const l0 = w.backend.grids.grid("L0")!;
    const cell = (g: typeof l1, x: number, z: number) => g.base[Math.floor((z - g.minZ) / g.cell) * g.cols + Math.floor((x - g.minX) / g.cell)];
    expect(cell(l1, -5.6, 5)).toBe(1);
    expect(cell(l1, -2, 5)).toBe(0);
    expect(cell(l0, -5.6, 5)).toBe(1);
    expect(cell(l0, -3, 6.5)).toBe(0);
    const vis = new VisibilityModel(TH, w.collision);
    const icu = w.registry.entity("patient:icu-1.slot")!;
    expect(vis.canSee({ x: icu.position.x, y: 0, z: icu.position.z + 3, yaw: 0, pitch: 0, level: "L0" }, icu, { fovDeg: 360 })).toBe(false);
  });
});
