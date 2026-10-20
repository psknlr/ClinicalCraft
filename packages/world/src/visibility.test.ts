import { describe, expect, it } from "vitest";
import { buildCollisionModel } from "./collision.js";
import type { Collider, CollisionModel, Pose } from "./contracts.js";
import { buildRegistry } from "./registry.js";
import { forwardOf, inFieldOfView, VisibilityModel, yawTowards } from "./visibility.js";
import { loadCatalogs, loadFacility } from "./__fixtures__/content.js";

const catalogs = loadCatalogs();
const pose = (x: number, z: number, yaw: number, level = "L0"): Pose => ({ x, y: 0, z, yaw, pitch: 0, level });
const facing = (x: number, z: number, target: { x: number; z: number }) => pose(x, z, yawTowards({ x, z }, target));

describe("field of view (renderer convention: yaw 0 looks towards −Z)", () => {
  it("forward and facing", () => {
    expect(forwardOf(0).z).toBeCloseTo(-1);
    expect(forwardOf(Math.PI / 2).x).toBeCloseTo(-1);
    expect(yawTowards({ x: 0, z: 0 }, { x: 0, z: -5 })).toBeCloseTo(0);
    expect(yawTowards({ x: 0, z: 0 }, { x: -5, z: 0 })).toBeCloseTo(Math.PI / 2);
  });
  it("inside / outside the horizontal field of view", () => {
    const p = pose(0, 0, 0);
    expect(inFieldOfView(p, { x: 0, z: -10 })).toBe(true);
    expect(inFieldOfView(p, { x: 0, z: 10 })).toBe(false); // behind
    // atan(10 / 5.5) = 61.2° off-axis: outside the default 120° view, inside a 130° one
    expect(inFieldOfView(p, { x: 10, z: -5.5 })).toBe(false);
    expect(inFieldOfView(p, { x: 10, z: -5.5 }, 130)).toBe(true);
    expect(inFieldOfView(p, { x: 10, z: -6 }, 120)).toBe(true); // 59°
    expect(inFieldOfView(p, { x: 0, z: 10 }, 360)).toBe(true);
  });
});

describe("occlusion in clinic-v4", () => {
  const f = loadFacility("clinic-v4");
  const collision = buildCollisionModel(f, catalogs, { patients: [{ slotId: "consult-1" }] });
  const registry = buildRegistry(f, catalogs, null, collision);
  const doorOpen = new Set<string>();
  const vis = new VisibilityModel(f, collision, { dynamics: { doorState: (id) => (doorOpen.has(id) ? { open: true, locked: false } : null) } });
  const imaging = registry.entity("eq:ws-imaging")!;
  const board = registry.entity("eq:evidence-board")!;

  it("walls block", () => {
    // from the garden, the solid front wall between the door and the imaging window hides the imaging workstation
    expect(vis.canSee(facing(0, 12, imaging.position), imaging)).toBe(false);
    // from inside the imaging room it is in plain view
    expect(vis.canSee(facing(5, 4, imaging.position), imaging)).toBe(true);
  });

  it("windows do not block", () => {
    // straight through the imaging room's window (south wall, x 5.7…10.3, sill 1.3 m, 2 m high)
    expect(vis.canSee(facing(8, 12, imaging.position), imaging)).toBe(true);
    expect(vis.lineOfSight("L0", { x: 8, z: 12 }, { x: 8, z: 5 })).toBe(true);
  });

  it("a closed door never hides itself (its leaves are rasterised wider than its 0.2 m footprint)", () => {
    const door = registry.entity("door:clinic:s:0")!;
    for (const dz of [-1, -0.6, 0.6, 1]) {
      const eye = { x: door.position.x, z: door.position.z + dz };
      expect(vis.visibleFrom("L0", eye, { ...door, id: door.id }), `dz ${dz}`).toBe(true);
      // without the id, the closed leaves hide it (what the planner saw before: no door had an interaction point)
      expect(vis.visibleFrom("L0", eye, { level: door.level, position: door.position, footprint: door.footprint })).toBe(false);
    }
    // for anything else the closed door stays opaque: the board behind it is hidden from the garden
    expect(vis.canSee(facing(0, 13, board.position), { ...board, id: board.id }, { range: 30 })).toBe(false);
  });

  it("closed doors block, open doors do not (read at query time)", () => {
    const from = facing(0, 13, board.position);
    expect(vis.canSee(from, board, { range: 30 })).toBe(false);
    doorOpen.add("door:clinic:s:0");
    expect(vis.canSee(from, board, { range: 30 })).toBe(true);
    doorOpen.clear();
    expect(vis.canSee(from, board, { range: 30 })).toBe(false);
  });

  it("field of view and range", () => {
    const inside = registry.entity("eq:ws-imaging")!;
    expect(vis.canSee(pose(5, 4, yawTowards({ x: 5, z: 4 }, inside.position) + Math.PI), inside)).toBe(false); // looking away
    expect(vis.canSee(facing(5, 4, inside.position), inside, { range: 0.5 })).toBe(false); // too far
  });

  it("tall equipment occludes, low furniture does not", () => {
    const g = vis.grid("L0")!;
    const at = (x: number, z: number) => g.opaque[Math.floor((z - g.minZ) / g.cell) * g.cols + Math.floor((x - g.minX) / g.cell)];
    expect(at(8, 3)).toBe(1); // 2.05 m workstation
    expect(at(-10.6, 2.9)).toBe(0); // 1.13 m exam couch
    expect(at(-13, 3)).toBe(0); // west wall window (sill 1, 2 m high)
    expect(at(-13, -2)).toBe(1); // solid west wall
  });
});

describe("partial occlusion (synthetic)", () => {
  const box = (id: string, minX: number, maxX: number, minZ: number, maxZ: number, extra: Partial<Collider> = {}): Collider => ({ id, kind: "wall", level: "L0", minX, maxX, minY: 0, maxY: 3, minZ, maxZ, opaque: true, passable: false, ...extra });
  const model = (colliders: Collider[]): CollisionModel => ({ bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, colliders, doors: [], walls: [] });
  const facility = { levels: [], bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 } };
  // a 4 m wide target 5 m north of the viewer
  const target = { level: "L0", position: { x: 0, z: -5 }, footprint: { w: 4, d: 0.5 } };
  const viewer = pose(0, 0, 0);

  it("a pillar hiding the centre still leaves the target visible by its corners", () => {
    const vis = new VisibilityModel(facility, model([box("pillar", -0.5, 0.5, -3, -2)]));
    expect(vis.lineOfSight("L0", viewer, target.position)).toBe(false);
    expect(vis.canSee(viewer, target)).toBe(true);
  });

  it("a wall across the whole view hides it; a window or a low wall does not", () => {
    expect(new VisibilityModel(facility, model([box("wall", -9, 9, -3, -2.6)])).canSee(viewer, target)).toBe(false);
    expect(new VisibilityModel(facility, model([box("glass", -9, 9, -3, -2.6, { kind: "window", opaque: false })])).canSee(viewer, target)).toBe(true);
    expect(new VisibilityModel(facility, model([box("low", -9, 9, -3, -2.6, { maxY: 1.2 })])).canSee(viewer, target)).toBe(true);
    // a lintel above eye height does not hide what is beyond the doorway
    expect(new VisibilityModel(facility, model([box("lintel", -9, 9, -3, -2.6, { minY: 3, maxY: 5 })])).canSee(viewer, target)).toBe(true);
  });

  it("a tall target does not hide itself; a displaced cart occludes after invalidate", () => {
    const self = new VisibilityModel(facility, model([box("self", -2, 2, -5.25, -4.75, { kind: "equipment", entity: "eq:cab" })]));
    expect(self.canSee(viewer, target)).toBe(true);
    let moved = false;
    const vis = new VisibilityModel(facility, model([box("cart", 6, 9, 6, 9, { kind: "equipment", entity: "eq:cart" })]), {
      dynamics: { displaced: () => (moved ? [{ id: "eq:cart", position: { x: 0, y: 0, z: -2.5, level: "L0" } }] : []) },
    });
    expect(vis.canSee(viewer, target)).toBe(true);
    moved = true;
    vis.invalidate({ level: "L0", minX: -2, maxX: 9, minZ: -4, maxZ: 9 });
    // the 3 × 3 cart now stands between the viewer and the target's centre and left corner…
    expect(vis.lineOfSight("L0", viewer, target.position)).toBe(false);
    // …a full rebuild agrees with the local re-rasterisation
    const fresh = new VisibilityModel(facility, model([box("cart", 6, 9, 6, 9, { kind: "equipment", entity: "eq:cart" })]), {
      dynamics: { displaced: () => [{ id: "eq:cart", position: { x: 0, y: 0, z: -2.5, level: "L0" } }] },
    });
    expect([...vis.grid("L0")!.dynamic]).toEqual([...fresh.grid("L0")!.dynamic]);
    expect([...vis.grid("L0")!.opaque]).toEqual([...fresh.grid("L0")!.opaque]);
  });
});
