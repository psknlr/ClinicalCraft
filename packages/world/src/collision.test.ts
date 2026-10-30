import { describe, expect, it } from "vitest";
import { mergeCatalogs } from "@clinicalcraft/core";
import { buildCollisionModel, colliderIndex, npcBodyBox, patientBodyBox, patientPose } from "./collision.js";
import { boxKey, colliderDigest, facilityFrom, loadCatalogs, loadFacility } from "./__fixtures__/content.js";
import { twoLevelInput } from "./__fixtures__/two-level.js";

const catalogs = loadCatalogs();
const equipment = mergeCatalogs(catalogs).equipment;
const firstSlot = (f: ReturnType<typeof loadFacility>) => f.patientSlots.slice(0, 1).map((s) => ({ slotId: s.id, posture: s.posture }));

/**
 * Parity pins. The digests were computed from the three.js renderer's own
 * collider set (world harness QA hook `__WORLD__.debug.colliders`, one patient
 * in the first slot, seed blocks) captured BEFORE the renderer was switched
 * to this model; the model reproduced every box exactly (max |Δ| = 0), every
 * door leaf, doorway area, NPC body and block. Since then the renderer takes
 * its colliders from this model, so a change here is a change in the 3D world.
 * general-hospital was re-pinned after a content fix (A4): `ward-monitor-1`
 * moved from (−44.7, −41.15) — wedged between the wall, bed 1 and its pump,
 * no reachable interaction point — to the other side of the bed head
 * (−42.4, −41.15); counts and kinds unchanged, digest 3201877c → 427e1029.
 * Re-pinned when the operating theatre got its records terminal (`or-records`,
 * the record-review rule of EMBODIED §6): one more equipment box, 614 → 615
 * colliders (equipment 224 → 225), digest 427e1029 → f8bf5701.
 * Re-pinned when the ward got a mobile non-invasive ventilator (`ward-niv`, capability `niv`): one more
 * equipment box, 615 → 616 colliders (equipment 225 → 226), digest f8bf5701 → 14308550.
 */
const PARITY = {
  "clinic-v4": { total: 86, doors: 1, digest: "e23bbedf", kinds: { tree: 12, wall: 24, window: 6, door: 2, partition: 14, equipment: 20, npc: 1, block: 7 } },
  "general-hospital": { total: 616, doors: 38, digest: "14308550", kinds: { tree: 28, wall: 94, window: 35, door: 53, partition: 160, equipment: 226, npc: 11, block: 9 } },
} as const;

describe("collision model parity with the renderer (EMBODIED R2)", () => {
  for (const id of ["clinic-v4", "general-hospital"] as const) {
    it(`${id}: same colliders as the renderer (count, kinds, digest of every box)`, () => {
      const f = loadFacility(id);
      const model = buildCollisionModel(f, catalogs, { patients: firstSlot(f) });
      const pin = PARITY[id];
      expect(model.colliders).toHaveLength(pin.total);
      expect(model.doors).toHaveLength(pin.doors);
      const kinds: Record<string, number> = {};
      for (const c of model.colliders) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
      expect(kinds).toEqual(pin.kinds);
      expect(colliderDigest(model.colliders)).toBe(pin.digest);
      // ids are stable and unique; door leaves belong to their door
      expect(new Set(model.colliders.map((c) => c.id)).size).toBe(model.colliders.length);
      const byId = colliderIndex(model);
      for (const d of model.doors) for (const leaf of d.colliders) expect(byId.get(leaf)).toMatchObject({ kind: "door", entity: d.id, passable: true, opaque: true });
    });
  }

  it("clinic-v4: sample boxes (V4 front double door, a tree, the standing patient, a workstation)", () => {
    const f = loadFacility("clinic-v4");
    const byId = colliderIndex(buildCollisionModel(f, catalogs, { patients: firstSlot(f) }));
    expect(boxKey(byId.get("door:clinic:s:0:0")!)).toBe(boxKey({ minX: -1.5, maxX: 0, minY: 0, maxY: 3, minZ: 7.9, maxZ: 8.1 }));
    expect(boxKey(byId.get("door:clinic:s:0:1")!)).toBe(boxKey({ minX: 0, maxX: 1.5, minY: 0, maxY: 3, minZ: 7.9, maxZ: 8.1 }));
    expect(byId.get("tree:0")).toMatchObject({ kind: "tree", minX: -18.5, maxX: -17.5, minY: 0, maxY: 4, minZ: 9.5, maxZ: 10.5 });
    // consult-1: standing in front of the V4 exam couch (0.85 × 1.88 × 0.6 body)
    expect(boxKey(byId.get("patient:consult-1")!)).toBe(boxKey({ minX: -8.425, maxX: -7.575, minY: 0, maxY: 1.88, minZ: 2.9, maxZ: 3.5 }));
    expect(byId.get("eq:exam-couch")).toMatchObject({ kind: "equipment", minY: 0, maxY: 1.13, opaque: false });
    const lab = byId.get("eq:ws-lab")!;
    expect(lab).toMatchObject({ kind: "equipment", entity: "eq:ws-lab", opaque: true }); // 2.05 m workstation hides what is behind it
    expect(lab.maxY).toBeCloseTo(2.05);
  });

  it("general-hospital: sample boxes (main entrance, a wall run, staff body)", () => {
    const f = loadFacility("general-hospital");
    const model = buildCollisionModel(f, catalogs, { patients: firstSlot(f) });
    const byId = colliderIndex(model);
    expect(model.doors[0]).toMatchObject({ id: "door:main:s:0", kind: "double-door", centre: { x: 0, z: 10 }, width: 4, height: 3.2, interior: false, rooms: ["lobby", null], area: { minX: -2, maxX: 2, minZ: 8.6, maxZ: 11.4 } });
    expect(boxKey(byId.get("wall:main:s:32")!)).toBe(boxKey({ minX: 29.5, maxX: 31.5, minY: 0, maxY: 1.3, minZ: 9.5, maxZ: 10.5 }));
    const nurse = f.staff.find((s) => s.id === "ed-nurse")!;
    expect(boxKey(byId.get("staff:ed-nurse")!)).toBe(boxKey({ minX: nurse.x - 0.425, maxX: nurse.x + 0.425, minY: 0, maxY: 1.88, minZ: nurse.z - 0.3, maxZ: nurse.z + 0.3 }));
    // every patient of the hospital lies/sits on its bed or chair except the standing consult patient
    const all = buildCollisionModel(f, catalogs, { patients: f.patientSlots.map((s) => ({ slotId: s.id, posture: s.posture })) });
    expect(all.colliders.filter((c) => c.id.startsWith("patient:")).map((c) => c.id)).toEqual(["patient:consult-1"]);
    expect(colliderDigest(all.colliders)).toBe(PARITY["general-hospital"].digest);
    // interior doors name both rooms
    const lab = model.doors.find((d) => d.id === "door:laboratory:s:0")!;
    expect(lab.interior).toBe(true);
    expect(lab.rooms[0]).toBe("laboratory");
    expect(lab.name).toEqual({ "zh-CN": expect.stringMatching(/门$/), en: expect.stringMatching(/ door$/) });
  });
});

describe("collider semantics", () => {
  const f = loadFacility("general-hospital");
  const model = buildCollisionModel(f, catalogs, { patients: firstSlot(f) });

  it("walls, partitions, closed doors, trees and blocks are opaque; windows, bodies and low furniture are not", () => {
    for (const c of model.colliders) {
      if (["wall", "partition", "door", "tree", "block"].includes(c.kind)) expect(c.opaque, c.id).toBe(true);
      if (["window", "npc", "sign"].includes(c.kind)) expect(c.opaque, c.id).toBe(false);
      if (c.kind === "equipment") expect(c.opaque, c.id).toBe(c.minY <= 1.62 && c.maxY >= 1.62);
      expect(c.passable, c.id).toBe(c.kind === "door");
    }
    expect(model.colliders.some((c) => c.kind === "equipment" && c.opaque)).toBe(true);
    expect(model.colliders.some((c) => c.kind === "equipment" && !c.opaque)).toBe(true);
  });

  it("staff can be left out (dynamic for navigation), blocks replaced by a restored save", () => {
    const noStaff = buildCollisionModel(f, catalogs, { staff: false, blocks: [{ cell: [-55, 0, 30], type: "wood" }, { cell: [999, 0, 0], type: "wood" }, { cell: [-55, 0, 30], type: "wood" }] });
    expect(noStaff.colliders.filter((c) => c.id.startsWith("staff:"))).toEqual([]);
    // invalid / duplicate blocks are dropped by the build-zone rules
    expect(noStaff.colliders.filter((c) => c.kind === "block").map((c) => c.id)).toEqual(["block:-55,0,30"]);
  });

  it("patients by posture: standing body, nothing on a bed or chair, a lying body without a bed", () => {
    expect(patientBodyBox(f, equipment, "resus-1", "lying")).toBeNull();
    expect(patientBodyBox(f, equipment, "consult-2", "sitting")).toBeNull();
    expect(patientPose(f, equipment, "resus-1", "lying")).toMatchObject({ onBed: true, bed: { id: "resus1-bed" } });
    const standing = patientBodyBox(f, equipment, "resus-1", "standing")!;
    expect(standing.maxY).toBeCloseTo(1.88);
    expect(npcBodyBox("lying", false, 0, 0)).toEqual({ minX: -0.4, maxX: 0.4, minY: 0, maxY: 0.5, minZ: -1.05, maxZ: 1.05 });
    expect(npcBodyBox("sitting", false, 1, 1)).toMatchObject({ minY: 0, maxY: 1.2 });
    expect(patientBodyBox(f, equipment, "nope")).toBeNull();
  });
});

describe("levels", () => {
  const f = facilityFrom(twoLevelInput());
  const model = buildCollisionModel(f, catalogs, { patients: [{ slotId: "ward-1" }] });
  const byId = colliderIndex(model);

  it("a building spanning two levels has walls and doors on each, lifted to the level's elevation", () => {
    const l0 = model.colliders.filter((c) => c.kind === "wall" && c.level === "L0");
    const l1 = model.colliders.filter((c) => c.kind === "wall" && c.level === "L1");
    expect(l0.length).toBeGreaterThan(0);
    expect(l1).toHaveLength(l0.length);
    expect(Math.min(...l1.map((c) => c.minY))).toBeCloseTo(4.5);
    expect(model.doors.map((d) => d.id)).toEqual(expect.arrayContaining(["door:block:s:0", "door:block@L1:s:0", "door:store:n:0", "door:ward:e:0"]));
    expect(byId.get("door:block@L1:s:0:0")).toMatchObject({ level: "L1", minY: 4.5 });
    expect(model.doors.find((d) => d.id === "door:ward:e:0")).toMatchObject({ level: "L1", rooms: ["ward", "office"], interior: true });
  });

  it("building walls carry their window frame and mullion materials (absent: the renderer's defaults)", () => {
    const styled = structuredClone(f);
    styled.buildings[0]!.walls = { ...styled.buildings[0]!.walls, frame: "steel", mullion: "black" };
    const outer = (m: ReturnType<typeof buildCollisionModel>) => m.walls.filter((w) => !w.partition);
    expect(outer(buildCollisionModel(styled, catalogs)).every((w) => w.materials.frame === "steel" && w.materials.mullion === "black")).toBe(true);
    expect(outer(model).every((w) => w.materials.frame === undefined && w.materials.mullion === undefined)).toBe(true);
  });

  it("entities take their room's level and elevation", () => {
    expect(byId.get("eq:ward-ecg")).toMatchObject({ level: "L1", minY: 4.5 });
    expect(byId.get("eq:store-shelves")).toMatchObject({ level: "L0", minY: 0 });
    expect(byId.get("staff:ward-nurse")).toMatchObject({ level: "L1", minY: 4.5 });
    // the patient lies on the ward bed: no body collider
    expect(byId.has("patient:ward-1")).toBe(false);
    // partitions are built per level (the L0 store and the L1 ward partitions do not dedupe each other)
    expect(model.colliders.some((c) => c.kind === "partition" && c.level === "L1")).toBe(true);
    expect(model.colliders.some((c) => c.kind === "partition" && c.level === "L0")).toBe(true);
  });
});
