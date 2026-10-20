import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCase, type CaseDefinition, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { buildCollisionModel } from "../collision.js";
import { WALK_SPEED, type ActorRole, type DynamicObstacle, type NavGoal, type NavPlan, type Pose, type SemanticEntity, type Vec3 } from "../contracts.js";
import { lineOfSight } from "../pathfind.js";
import { distanceToArea, footprintArea, type WorldDynamics } from "../raster.js";
import { buildRegistry } from "../registry.js";
import { facilityFrom, loadCatalogs, loadFacility } from "../__fixtures__/content.js";
import { twoLevelInput } from "../__fixtures__/two-level.js";
import { GridAStarBackend, MIN_RANGE } from "./backend.js";

const catalogs = loadCatalogs();
const loadCase = (id: string): CaseDefinition => {
  const r = parseCase(JSON.parse(readFileSync(new URL(`../../../content/cases/${id}/case.json`, import.meta.url), "utf8")));
  if (!r.ok) throw new Error(id);
  return r.value;
};

/** Mutable physical state behind `WorldDynamics` (what the state store will provide). */
function stateOf() {
  const s = {
    locked: new Set<string>(),
    open: new Set<string>(),
    obstacles: [] as DynamicObstacle[],
    displaced: new Map<string, Vec3 & { level: string; rot?: number }>(),
    poses: new Map<string, Pose>(),
  };
  const dynamics: WorldDynamics = {
    doorState: (id) => (s.locked.has(id) || s.open.has(id) ? { open: s.open.has(id), locked: s.locked.has(id) } : null),
    obstacles: () => s.obstacles,
    displaced: () => [...s.displaced].map(([id, position]) => ({ id, position })),
    actorPose: (id) => s.poses.get(id) ?? null,
  };
  return { s, dynamics };
}

function world(f: FacilityDefinition, binding: { caseId: string; slotId: string } | null, extraCatalogs: EquipmentCatalog[] = []) {
  const cats = [...catalogs, ...extraCatalogs];
  const caseDef = binding ? loadCase(binding.caseId) : null;
  const slot = binding ? f.patientSlots.find((x) => x.id === binding.slotId)! : null;
  const posture = caseDef ? (caseDef.patient.posture ?? slot!.posture) : undefined;
  const collision = buildCollisionModel(f, cats, { patients: binding ? [{ slotId: binding.slotId, posture }] : [] });
  const registry = buildRegistry(f, cats, caseDef ? { caseDef, slotId: binding!.slotId, locale: "en" } : null, collision);
  const { s, dynamics } = stateOf();
  const backend = new GridAStarBackend({ facility: f, collision, registry, dynamics, locale: "en" });
  const spawn: Pose = { x: f.spawn.x, y: 0, z: f.spawn.z, yaw: f.spawn.yaw ?? 0, pitch: 0, level: "L0" };
  const plan = (goal: NavGoal, from: Pose = spawn, role: ActorRole = "clinician", extra: { accessibleOnly?: boolean } = {}) => backend.plan({ actorId: "actor:clinician", from, goal, role, ...extra });
  return { f, collision, registry, backend, s, dynamics, spawn, plan };
}

type W = ReturnType<typeof world>;

function ok(plan: NavPlan): Extract<NavPlan, { ok: true }> {
  if (!plan.ok) throw new Error(`${plan.code}: ${plan.message} ${JSON.stringify(plan.details ?? {})}`);
  return plan;
}

/** Path sanity: every waypoint in a free cell, straight segments clear of obstacles, travel time = walk / speed (+ connectors). */
function expectSound(w: W, plan: Extract<NavPlan, { ok: true }>, from: Pose = w.spawn) {
  let prev = { x: from.x, z: from.z, level: from.level };
  let walked = 0;
  for (const p of plan.path) {
    const g = w.backend.grids.grid(p.level)!;
    const view = { minX: g.minX, minZ: g.minZ, cell: g.cell, cols: g.cols, rows: g.rows, blocked: g.base };
    if (!p.via && prev.level === p.level) {
      expect(lineOfSight(view, prev, p), `segment ${JSON.stringify(prev)} → ${JSON.stringify(p)}`).toBe(true);
      walked += Math.hypot(p.x - prev.x, p.z - prev.z);
    }
    prev = p;
  }
  if (!plan.path.some((p) => p.via)) {
    expect(plan.length).toBeCloseTo(walked, 6);
    expect(plan.travelSeconds).toBeCloseTo(walked / WALK_SPEED, 6);
  }
}

/** Arrived within reach of the entity, with line of sight, facing it. */
function expectAtEntity(w: W, plan: Extract<NavPlan, { ok: true }>, e: SemanticEntity, reach = Math.max(e.reach, MIN_RANGE)) {
  const area = footprintArea(e);
  expect(distanceToArea(plan.target.x, plan.target.z, area)).toBeLessThanOrEqual(reach + 1e-6);
  expect(plan.targetEntity).toBe(e.id);
  expect(plan.target.level).toBe(e.level);
  // facing it: inside a narrow 60° view cone, with line of sight
  expect(w.backend.visibility.canSee(plan.target, e, { fovDeg: 60 })).toBe(true);
}

describe("routes in clinic-v4 (V4 clinic, one entrance)", () => {
  const w = world(loadFacility("clinic-v4"), { caseId: "smzl-lung-adeno", slotId: "consult-1" });

  it("spawn → the patient's interaction point (through the front door, into the consult room)", () => {
    const plan = ok(w.plan({ kind: "interact", id: "patient:consult-1" }));
    expectSound(w, plan);
    expectAtEntity(w, plan, w.registry.entity("patient:consult-1")!, 1.5);
    expect(plan.path.length).toBeGreaterThan(1);
    expect(plan.length).toBeGreaterThan(15);
  });

  it("every interactive station is reachable from the spawn", () => {
    for (const e of w.registry.ofKind("equipment").filter((x) => x.interaction !== "none")) {
      const plan = ok(w.plan({ kind: "interact", id: e.id }));
      expectAtEntity(w, plan, e);
    }
  });

  it("a locked front door → PATH_BLOCKED naming it; unlocked → a route again", () => {
    w.s.locked.add("door:clinic:s:0");
    w.backend.invalidate();
    const blocked = w.plan({ kind: "interact", id: "eq:ws-lab" });
    expect(blocked).toMatchObject({ ok: false, code: "PATH_BLOCKED", details: { doors: ["door:clinic:s:0"], obstacles: [] } });
    expect(blocked.ok ? "" : blocked.message).toMatch(/blocked/);
    w.s.locked.clear();
    w.backend.invalidate();
    ok(w.plan({ kind: "interact", id: "eq:ws-lab" }));
  });

  it("a dynamic obstacle in the doorway → PATH_BLOCKED; removed with a local invalidate → a route (same grid as a rebuild)", () => {
    const wet: DynamicObstacle = { id: "wet-floor", level: "L0", rect: { x: 0, z: 9, w: 4, d: 1.2 }, label: { "zh-CN": "地面湿滑", en: "Wet floor" } };
    const area = { level: "L0", minX: -2, maxX: 2, minZ: 8.4, maxZ: 9.6 };
    w.s.obstacles.push(wet);
    w.backend.invalidate(area);
    expect(w.plan({ kind: "room", id: "corridor" })).toMatchObject({ ok: false, code: "PATH_BLOCKED", details: { obstacles: ["wet-floor"] } });
    const rebuilt = world(w.f, { caseId: "smzl-lung-adeno", slotId: "consult-1" });
    rebuilt.s.obstacles.push(wet);
    rebuilt.backend.invalidate();
    const a = w.backend.grids.grid("L0")!, b = rebuilt.backend.grids.grid("L0")!;
    expect([...a.dynamic]).toEqual([...b.dynamic]);
    expect([...a.base]).toEqual([...b.base]);
    w.s.obstacles.length = 0;
    w.backend.invalidate(area);
    ok(w.plan({ kind: "room", id: "corridor" }));
    expect(w.backend.grids.grid("L0")!.dynamic.every((x) => x === 0)).toBe(true);
  });

  it("ignoreObstacles (a team setting things aside) plans through a dynamic obstacle, never through a locked door", () => {
    const wet: DynamicObstacle = { id: "wet-floor", level: "L0", rect: { x: 0, z: 9, w: 4, d: 1.2 }, label: { "zh-CN": "地面湿滑", en: "Wet floor" } };
    const area = { level: "L0", minX: -2, maxX: 2, minZ: 8.4, maxZ: 9.6 };
    w.s.obstacles.push(wet);
    w.backend.invalidate(area);
    const request = { actorId: "actor:clinician", from: w.spawn, goal: { kind: "room", id: "corridor" } as NavGoal, role: "nurse" as ActorRole };
    expect(w.backend.plan(request)).toMatchObject({ ok: false, code: "PATH_BLOCKED" });
    const through = ok(w.backend.plan({ ...request, ignoreObstacles: true }));
    expect(through.length).toBeGreaterThan(0);
    w.s.locked.add("door:clinic:s:0");
    w.backend.invalidate();
    expect(w.backend.plan({ ...request, ignoreObstacles: true })).toMatchObject({ ok: false, code: "PATH_BLOCKED", details: { doors: ["door:clinic:s:0"] } });
    w.s.locked.clear();
    w.s.obstacles.length = 0;
    w.backend.invalidate();
  });

  it("unknown ids and non-interactive targets (messages in zh-CN and en)", () => {
    expect(w.plan({ kind: "interact", id: "eq:nope" })).toMatchObject({ ok: false, code: "TARGET_NOT_FOUND", message: 'Target "eq:nope" not found.' });
    const zh = new GridAStarBackend({ facility: w.f, collision: w.collision, registry: w.registry, locale: "zh-CN" });
    expect(zh.plan({ actorId: "actor:clinician", from: w.spawn, goal: { kind: "interact", id: "eq:nope" }, role: "clinician" })).toMatchObject({ ok: false, message: "找不到目标「eq:nope」。" });
    expect(w.plan({ kind: "room", id: "nowhere" })).toMatchObject({ ok: false, code: "TARGET_NOT_FOUND" });
    expect(w.plan({ kind: "interact", id: "level:L0" })).toMatchObject({ ok: false, code: "NO_INTERACTION_POINT" });
  });

  it("declared interaction points behind a wall → NO_INTERACTION_POINT", () => {
    const panel: EquipmentCatalog = {
      schema: "clinicalcraft/equipment-catalog@1",
      id: "test-panel",
      name: "Test",
      materials: [],
      equipment: [
        {
          id: "wall-panel",
          name: { "zh-CN": "墙板", en: "Wall panel" },
          category: "decor",
          description: "Test",
          capabilities: [],
          footprint: { w: 1, d: 0.2, h: 2 },
          solid: false,
          parts: [{ m: "white", p: [0, 1, -0.05], s: [1, 2, 0.1], anim: "none" }],
          interaction: { kind: "device" },
          screen: "none",
          tags: ["wall"],
          // "stand here": 0.9 m behind the panel — inside the building's front wall
          interactionPoints: [{ x: 0, z: -0.9 }],
        },
      ],
    };
    // on the inside of the front wall (z 7.5…8.5), facing into the corridor (rot 180: local +Z → world −Z)
    const f = structuredClone(loadFacility("clinic-v4"));
    f.placements.push({ id: "panel", type: "wall-panel", x: -2.2, z: 7.4, y: 0, rot: 180, room: "corridor" });
    const v = world(f, null, [panel]);
    expect(v.plan({ kind: "interact", id: "panel" })).toMatchObject({ ok: false, code: "NO_INTERACTION_POINT", details: { declaredPoints: 1 } });
    // a declared point 1 m in front of it (in the corridor) is used
    panel.equipment[0].interactionPoints = [{ x: 0, z: 1 }];
    const front = world(f, null, [panel]);
    const plan = ok(front.plan({ kind: "interact", id: "panel" }));
    expect(Math.hypot(plan.target.x - -2.2, plan.target.z - 6.4)).toBeLessThan(0.75);
    const off = plan.target.yaw - Math.PI; // facing +Z (yaw ±π), towards the panel
    expect(Math.abs(Math.atan2(Math.sin(off), Math.cos(off)))).toBeLessThan(0.3);
  });
});

describe("routes in general-hospital", () => {
  const w = world(loadFacility("general-hospital"), { caseId: "stemi-inferior-rv", slotId: "resus-1" });

  it("spawn → the resus patient, the bedside ECG cart and the lab workstation", () => {
    for (const id of ["patient:resus-1", "eq:resus1-ecg", "eq:lab-workstation"]) {
      const plan = ok(w.plan({ kind: "interact", id }));
      expectSound(w, plan);
      expectAtEntity(w, plan, w.registry.entity(id)!, id.startsWith("patient:") ? 1.5 : undefined);
    }
  });

  it("room, entity, point, look and any goals", () => {
    const lab = w.registry.entity("room:laboratory")!;
    const inLab = ok(w.plan({ kind: "room", id: "laboratory" }));
    expectSound(w, inLab);
    expect(distanceToArea(inLab.target.x, inLab.target.z, footprintArea(lab))).toBe(0);
    expect(inLab.targetEntity).toBe("room:laboratory");

    const nurse = ok(w.plan({ kind: "entity", id: "ed-nurse", range: 2 }));
    expect(distanceToArea(nurse.target.x, nurse.target.z, footprintArea(w.registry.entity("staff:ed-nurse")!))).toBeLessThanOrEqual(2);

    const point = ok(w.plan({ kind: "point", x: -36, z: -33 }));
    expectSound(w, point);
    expect(point.target).toMatchObject({ x: -36, z: -33, level: "L0" });
    const near = ok(w.plan({ kind: "point", x: -36, z: -33, range: 3 }));
    expect(Math.hypot(near.target.x + 36, near.target.z + 33)).toBeLessThanOrEqual(3);
    expect(near.length).toBeLessThan(point.length);
    // a point inside furniture: the nearest free cell
    const bed = w.registry.entity("eq:resus2-bed")!;
    const inBed = ok(w.plan({ kind: "point", x: bed.position.x, z: bed.position.z }));
    expect(Math.hypot(inBed.target.x - bed.position.x, inBed.target.z - bed.position.z)).toBeLessThan(2.5);

    const patient = w.registry.entity("patient:resus-1")!;
    const look = ok(w.plan({ kind: "look", id: "patient:resus-1" }));
    expect(w.backend.visibility.canSee(look.target, patient)).toBe(true);
    expect(look.length).toBeLessThan(ok(w.plan({ kind: "interact", id: "patient:resus-1" })).length);
    // already in view: no movement
    const still = ok(w.plan({ kind: "look", id: "patient:resus-1" }, look.target));
    expect(still.path).toEqual([]);

    const anyEcg = ok(w.plan({ kind: "any", goals: [{ kind: "interact", id: "ward-ecg" }, { kind: "interact", id: "resus1-ecg" }] }));
    expect(anyEcg.targetEntity).toBe("eq:resus1-ecg"); // the nearer of the two from the entrance
  });

  it("follow: the target's current pose (a staff member who walked away)", () => {
    const here: Pose = { x: 0, y: 0, z: -2, yaw: 0, pitch: 0, level: "L0" };
    w.s.poses.set("staff:lab-tech", here);
    const plan = ok(w.plan({ kind: "follow", id: "staff:lab-tech", range: 1.5 }));
    expect(Math.hypot(plan.target.x - here.x, plan.target.z - here.z)).toBeLessThanOrEqual(1.5 + 0.43);
    w.s.poses.clear();
  });

  it("every door has a reachable interaction point (a closed door does not hide itself)", () => {
    const doors = w.registry.ofKind("door");
    expect(doors.length).toBeGreaterThan(30);
    for (const d of doors) expectAtEntity(w, ok(w.plan({ kind: "interact", id: d.id })), d);
  });

  it("an unreachable interaction point → TARGET_NOT_REACHABLE (a monitor wedged between the wall, bed 1 and its pump)", () => {
    // the ward monitor's pre-fix position (content fix A4: it now stands at the bed head's other side)
    const wedged = structuredClone(w.f);
    Object.assign(wedged.placements.find((p) => p.id === "ward-monitor-1")!, { x: -44.7, z: -41.15 });
    const ww = world(wedged, { caseId: "stemi-inferior-rv", slotId: "resus-1" });
    expect(ww.plan({ kind: "interact", id: "ward-monitor-1" })).toMatchObject({ ok: false, code: "TARGET_NOT_REACHABLE" });
  });

  it("every interactive placement is reachable from the spawn", () => {
    const failures = w.registry
      .ofKind("equipment")
      .filter((e) => e.interaction !== "none")
      .filter((e) => !w.plan({ kind: "interact", id: e.id }).ok)
      .map((e) => e.id);
    expect(failures).toEqual([]);
  });

  it("locked laboratory doors → PATH_BLOCKED with the door ids", () => {
    const doors = w.collision.doors.filter((d) => d.rooms.includes("laboratory")).map((d) => d.id);
    expect(doors.length).toBeGreaterThanOrEqual(3);
    for (const d of doors) w.s.locked.add(d);
    w.backend.invalidate();
    const plan = w.plan({ kind: "interact", id: "lab-workstation" });
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.code).toBe("PATH_BLOCKED");
      expect(doors).toEqual(expect.arrayContaining(plan.details!.doors as string[]));
      expect((plan.details!.doors as string[]).length).toBeGreaterThan(0);
    }
    w.s.locked.clear();
    w.backend.invalidate();
    ok(w.plan({ kind: "interact", id: "lab-workstation" }));
  });

  it("a moved cart: planned at its new spot; local re-stamping equals a rebuild", () => {
    const ecg = w.registry.entity("eq:resus1-ecg")!;
    const to = { x: 25, y: 0, z: -2, level: "L0", rot: 0 };
    const g = w.backend.grids.grid("L0")!;
    const cell = (x: number, z: number) => Math.floor((z - g.minZ) / g.cell) * g.cols + Math.floor((x - g.minX) / g.cell);
    expect(g.base[cell(ecg.position.x, ecg.position.z)]).toBe(1);
    w.s.displaced.set(ecg.id, to);
    const pad = 1;
    w.backend.invalidate({ level: "L0", minX: ecg.position.x - pad, maxX: ecg.position.x + pad, minZ: ecg.position.z - pad, maxZ: ecg.position.z + pad });
    w.backend.invalidate({ level: "L0", minX: to.x - pad, maxX: to.x + pad, minZ: to.z - pad, maxZ: to.z + pad });
    expect(g.base[cell(ecg.position.x, ecg.position.z)]).toBe(0);
    expect(g.dynamic[cell(to.x, to.z)]).toBeGreaterThan(0);
    const plan = ok(w.plan({ kind: "interact", id: ecg.id }));
    expect(distanceToArea(plan.target.x, plan.target.z, { minX: to.x - 0.3, maxX: to.x + 0.3, minZ: to.z - 0.275, maxZ: to.z + 0.275 })).toBeLessThanOrEqual(ecg.reach + 1e-6);
    const rebuilt = world(w.f, { caseId: "stemi-inferior-rv", slotId: "resus-1" });
    rebuilt.s.displaced.set(ecg.id, to);
    rebuilt.backend.invalidate();
    const r = rebuilt.backend.grids.grid("L0")!;
    expect([...g.base]).toEqual([...r.base]);
    expect([...g.dynamic].map((x) => x > 0)).toEqual([...r.dynamic].map((x) => x > 0));
    w.s.displaced.clear();
    w.backend.invalidate();
  });
});

describe("two levels: stairs, elevator, access zones", () => {
  const w = world(facilityFrom(twoLevelInput()), null);
  const start: Pose = { x: 0, y: 0, z: 12, yaw: 0, pitch: 0, level: "L0" };

  it("reaches the upper ward by the stairs; travel time adds the stairs' seconds", () => {
    const plan = ok(w.plan({ kind: "interact", id: "ward-ecg" }, start));
    expectAtEntity(w, plan, w.registry.entity("eq:ward-ecg")!);
    const via = plan.path.filter((p) => p.via);
    expect(via).toEqual([{ x: 9, z: -5, level: "L1", via: "connector:stairs" }]);
    expect(plan.path.at(-1)!.level).toBe("L1");
    expect(plan.target).toMatchObject({ level: "L1", y: 4.5 });
    // walking (on both floors) at WALK_SPEED + 15 s of stairs; the length counts the 4.5 m climb
    let walked = 0;
    let prev = { x: start.x, z: start.z };
    for (const p of plan.path) {
      if (!p.via) walked += Math.hypot(p.x - prev.x, p.z - prev.z);
      prev = p;
    }
    expect(plan.travelSeconds).toBeCloseTo(walked / WALK_SPEED + 15, 6);
    expect(plan.length).toBeGreaterThan(walked + 4.5 - 1e-6);
  });

  it("accessible routes take the elevator; with stairs only there is none", () => {
    const plan = ok(w.plan({ kind: "interact", id: "ward-ecg" }, start, "clinician", { accessibleOnly: true }));
    expect(plan.path.filter((p) => p.via).map((p) => p.via)).toEqual(["connector:lift"]);
    expect(plan.travelSeconds).toBeGreaterThan(30);
    const input = twoLevelInput();
    input.connectors = input.connectors!.filter((c) => c.kind === "stairs");
    const stairsOnly = world(facilityFrom(input), null);
    expect(stairsOnly.plan({ kind: "interact", id: "ward-ecg" }, start, "clinician", { accessibleOnly: true })).toMatchObject({ ok: false, code: "TARGET_NOT_REACHABLE", details: { reason: "no-accessible-route" } });
    ok(stairsOnly.plan({ kind: "interact", id: "ward-ecg" }, start, "clinician"));
  });

  it("goals on the same level never ride a connector; coming back down works too", () => {
    const desk = ok(w.plan({ kind: "interact", id: "office-desk" }, start));
    const up = desk.target;
    const back = ok(w.plan({ kind: "point", x: 0, z: 12, level: "L0" }, up));
    expect(back.path.some((p) => p.via)).toBe(true);
    expect(back.target).toMatchObject({ x: 0, z: 12, level: "L0" });
    const across = ok(w.plan({ kind: "room", id: "ward" }, up));
    expect(across.path.some((p) => p.via)).toBe(false);
  });

  it("access zones: the pharmacy store is pharmacists only (ACCESS_DENIED for others; anyone may leave it)", () => {
    const denied = w.plan({ kind: "interact", id: "store-shelves" }, start, "clinician");
    expect(denied).toMatchObject({ ok: false, code: "ACCESS_DENIED", details: { zones: ["store-zone"], role: "clinician" } });
    expect(denied.ok ? "" : denied.message).toMatch(/clinician|Clinician/);
    ok(w.plan({ kind: "interact", id: "store-shelves" }, start, "pharmacist"));
    const inside: Pose = { x: -9, y: 0, z: 4, yaw: 0, pitch: 0, level: "L0" };
    ok(w.plan({ kind: "point", x: 0, z: 0 }, inside, "nurse"));
  });

  it("role-restricted connectors: staff stairs force the elevator; no usable connector → ACCESS_DENIED", () => {
    const input = twoLevelInput();
    input.connectors![0].roles = ["nurse"];
    const staffStairs = world(facilityFrom(input), null);
    const clinician = ok(staffStairs.plan({ kind: "interact", id: "ward-ecg" }, start, "clinician"));
    expect(clinician.path.filter((p) => p.via).map((p) => p.via)).toEqual(["connector:lift"]);
    const nurse = ok(staffStairs.plan({ kind: "interact", id: "ward-ecg" }, start, "nurse"));
    expect(nurse.path.filter((p) => p.via).map((p) => p.via)).toEqual(["connector:stairs"]);
    input.connectors![1].roles = ["porter"];
    const none = world(facilityFrom(input), null);
    expect(none.plan({ kind: "interact", id: "ward-ecg" }, start, "clinician")).toMatchObject({ ok: false, code: "ACCESS_DENIED", details: { connectors: expect.arrayContaining([expect.stringMatching(/^connector:/)]) } });
  });

  it("an upper level is walkable only inside the buildings on it", () => {
    const g = w.backend.grids.grid("L1")!;
    const at = (x: number, z: number) => g.base[Math.floor((z - g.minZ) / g.cell) * g.cols + Math.floor((x - g.minX) / g.cell)];
    expect(at(0, 14)).toBe(1); // outside the block on L1: void
    expect(at(0, 0)).toBe(0);
    expect(w.plan({ kind: "point", x: 0, z: 14, level: "L1" }, start)).toMatchObject({ ok: false });
  });
});

describe("measurements (general-hospital)", () => {
  it("grid build and 20 representative routes", () => {
    const f = loadFacility("general-hospital");
    const t0 = performance.now();
    const w = world(f, { caseId: "stemi-inferior-rv", slotId: "resus-1" });
    const build = performance.now() - t0;
    const goals: NavGoal[] = [
      { kind: "interact", id: "patient:resus-1" },
      { kind: "interact", id: "resus1-ecg" },
      { kind: "interact", id: "lab-workstation" },
      { kind: "interact", id: "resus1-defibrillator" },
      { kind: "interact", id: "ed-nurse-station" },
      { kind: "interact", id: "ct-scanner" },
      { kind: "interact", id: "path-workstation" },
      { kind: "interact", id: "ward-ecg" },
      { kind: "interact", id: "icu-crash-cart" },
      { kind: "interact", id: "pharmacy-records" },
      { kind: "interact", id: "resus-sink" },
      { kind: "room", id: "laboratory" },
      { kind: "room", id: "ward" },
      { kind: "room", id: "rad-control" },
      { kind: "entity", id: "staff:radiologist" },
      { kind: "entity", id: "staff:pharmacist" },
      { kind: "look", id: "patient:resus-1" },
      { kind: "point", x: -36, z: -33 },
      { kind: "point", x: 53, z: -2 },
      { kind: "any", goals: [{ kind: "interact", id: "ward-glucometer" }, { kind: "interact", id: "ed-glucometer" }] },
    ];
    w.plan(goals[0]); // warm-up (JIT)
    const times: number[] = [];
    for (const goal of goals) {
      const t = performance.now();
      ok(w.plan(goal));
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    const median = (times[9] + times[10]) / 2;
    const p95 = times[18];
    console.log(`[world nav] general-hospital: model+registry+grids ${build.toFixed(1)} ms; 20 routes median ${median.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, max ${times[19].toFixed(1)} ms`);
    // generous bounds: catch pathological regressions, not machine speed
    expect(p95).toBeLessThan(1000);
    expect(build).toBeLessThan(5000);
  });
});
