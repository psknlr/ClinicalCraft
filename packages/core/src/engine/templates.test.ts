import { describe, expect, it } from "vitest";
import { FacilitySchema, RoomTemplateSchema, type FacilityDefinition, type FacilityInput, type RoomTemplate, type RoomTemplateInput } from "../schema/facility.js";
import { checkFacility, parseCatalog } from "./index.js";
import { checkRoomTemplate, compileFacility, offsetSign, parseRoomTemplate, rotateLocal, rotateSide } from "./templates.js";

const catalog = (() => {
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "t",
    name: "T",
    materials: [
      { id: "white", color: "#ffffff" },
      { id: "teal", color: "#2f7d76" },
      { id: "floor", color: "#cccccc" },
      ...["grass", "cream", "wood", "roof"].map((id) => ({ id, color: "#888888" })),
    ],
    equipment: [
      { id: "bed", name: "Bed", category: "furniture", description: "Bed", footprint: { w: 1, d: 2.2, h: 1 }, parts: [{ m: "white", p: [0, 0.5, 0], s: [1, 1, 2.2] }], interaction: { kind: "bed" } },
      { id: "monitor", name: "Monitor", category: "monitoring", description: "M", capabilities: ["cardiac-monitor"], footprint: { w: 0.6, d: 0.6, h: 1.8 }, parts: [{ m: "white", p: [0, 0.9, 0], s: [0.6, 1.8, 0.6] }], interaction: { kind: "monitor" } },
      { id: "desk", name: "Desk", category: "furniture", description: "D", footprint: { w: 1.4, d: 0.7, h: 0.9 }, parts: [{ m: "white", p: [0, 0.45, 0], s: [1.4, 0.9, 0.7] }] },
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
})();

/** A 6 × 8 bay: door on the local south side 1 m east of centre, bed against the north wall, monitor at its head (west), a desk in the south-east corner. */
const BAY: RoomTemplateInput = {
  schema: "clinicalcraft/room-template@1",
  id: "bay",
  name: { "zh-CN": "床位", en: "Bay" },
  kind: "ward",
  size: { w: 6, d: 8 },
  partitions: [
    { side: "n" },
    { side: "w" },
    { side: "e" },
    { side: "s", openings: [{ kind: "door", width: 1.6, offset: 1 }] },
  ],
  sign: { text: { "zh-CN": "床位", en: "Bay" }, side: "n" },
  lights: [{ x: 0, z: -1 }],
  placements: [
    { id: "bed", type: "bed", x: 0, z: -2.5 },
    { id: "monitor", type: "monitor", x: -1.2, z: -3.4, rot: 0 },
    { id: "desk", type: "desk", x: 2, z: 3, rot: 180 },
  ],
  patientSlots: [{ id: "slot", x: 0, z: -2.5, posture: "lying", bed: "bed", monitor: "monitor", accepts: ["inpatient"] }],
  staff: [{ id: "nurse", role: "nurse", name: { "zh-CN": "护士", en: "Nurse" }, x: 1.5, z: 1, rot: 0 }],
  zones: [{ id: "clean", name: "Clean zone", rect: { x: 0, z: -2.5, w: 4, d: 3 }, roles: ["nurse", "clinician"] }],
  capabilities: ["cardiac-monitor"],
};

const template = (input: RoomTemplateInput = BAY): RoomTemplate => RoomTemplateSchema.parse(input);

function facility(instances: FacilityInput["instances"], extra: Partial<FacilityInput> = {}): FacilityDefinition {
  return FacilitySchema.parse({
    schema: "clinicalcraft/facility@1",
    id: "f",
    name: "F",
    description: "F",
    bounds: { minX: -40, maxX: 40, minZ: -40, maxZ: 40 },
    spawn: { x: 0, z: 30 },
    catalogs: ["t"],
    buildings: [{ id: "block", name: "Block", rect: { x: 0, z: 0, w: 60, d: 40 } }],
    instances,
    ...extra,
  });
}

describe("rotation helpers (three.js rotation.y: local +Z → (sin, cos))", () => {
  it("rotate offsets, sides and opening offsets consistently", () => {
    expect(rotateLocal(0, 1, 90)).toEqual([1, 0]); // +Z → +X
    expect(rotateLocal(1, 0, 90)).toEqual([0, -1]);
    expect(rotateLocal(2, 3, 180)).toEqual([-2, -3]);
    expect(rotateLocal(2, 3, 270)).toEqual([-3, 2]);
    expect(rotateLocal(2, 3, 360)).toEqual([2, 3]);
    expect(["n", "s", "e", "w"].map((s) => rotateSide(s as "n", 90))).toEqual(["w", "e", "n", "s"]);
    expect(["n", "s", "e", "w"].map((s) => rotateSide(s as "n", 180))).toEqual(["s", "n", "w", "e"]);
    expect(["n", "s", "e", "w"].map((s) => rotateSide(s as "n", 270))).toEqual(["e", "w", "s", "n"]);
    // an opening 1 m along a south wall (+X) is 1 m along −Z on the east wall after 90°
    expect(offsetSign("s", 90)).toBe(-1);
    expect(offsetSign("e", 90)).toBe(1);
    expect(offsetSign("s", 180)).toBe(-1);
    expect(offsetSign("e", 270)).toBe(-1);
    expect(offsetSign("n", 270)).toBe(1);
  });
});

describe("compileFacility", () => {
  const T = template();

  it("returns a facility without instances unchanged (same object)", () => {
    const f = facility([]);
    const r = compileFacility(f, [T]);
    expect(r).toEqual({ ok: true, facility: f, issues: [] });
    expect(r.facility).toBe(f);
  });

  it("expands an instance at rot 0: room, placements, slot, staff, zone, lights, sign with prefixed ids", () => {
    const r = compileFacility(facility([{ id: "a", template: "bay", x: 10, z: -5 }]), [T]);
    expect(r.issues).toEqual([]);
    const f = r.facility;
    expect(f.instances).toEqual([]);
    expect(f.rooms).toEqual([
      {
        id: "a",
        name: { "zh-CN": "床位", en: "Bay" },
        kind: "ward",
        building: "block",
        rect: { x: 10, z: -5, w: 6, d: 8 },
        partitions: T.partitions,
        sign: { text: { "zh-CN": "床位", en: "Bay" }, side: "n" },
        lights: [{ x: 10, z: -6 }],
      },
    ]);
    expect(f.placements.map((p) => [p.id, p.type, p.x, p.z, p.rot, p.room])).toEqual([
      ["a.bed", "bed", 10, -7.5, 0, "a"],
      ["a.monitor", "monitor", 8.8, -8.4, 0, "a"],
      ["a.desk", "desk", 12, -2, 180, "a"],
    ]);
    expect(f.patientSlots).toEqual([{ id: "a.slot", room: "a", x: 10, z: -7.5, rot: 0, posture: "lying", bed: "a.bed", accepts: ["inpatient"], monitor: "a.monitor" }]);
    expect(f.staff).toEqual([{ id: "a.nurse", role: "nurse", name: { "zh-CN": "护士", en: "Nurse" }, room: "a", x: 11.5, z: -4, rot: 0 }]);
    expect(f.access).toEqual([{ id: "a.clean", name: "Clean zone", rect: { x: 10, z: -7.5, w: 4, d: 3 }, roles: ["nurse", "clinician"] }]);
    // the compiled facility is a valid hand-written facility
    expect(FacilitySchema.parse(JSON.parse(JSON.stringify(f)))).toEqual(f);
    expect(checkFacility(f, [catalog]).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("rotates rects, positions, rotations, sides and door offsets (90/180/270)", () => {
    const at = (rot: 0 | 90 | 180 | 270) => compileFacility(facility([{ id: "r", template: "bay", x: 0, z: 0, rot }]), [T]).facility;
    const r90 = at(90);
    expect(r90.rooms[0].rect).toEqual({ x: 0, z: 0, w: 8, d: 6 });
    // the bed against the local north wall is now against the west wall, turned by 90°
    expect(r90.placements[0]).toMatchObject({ id: "r.bed", x: -2.5, z: 0, rot: 90 });
    expect(r90.placements[2]).toMatchObject({ id: "r.desk", x: 3, z: -2, rot: 270 });
    expect(r90.patientSlots[0]).toMatchObject({ x: -2.5, z: 0, rot: 90 });
    expect(r90.staff[0]).toMatchObject({ x: 1, z: -1.5, rot: 90 });
    expect(r90.access[0].rect).toEqual({ x: -2.5, z: 0, w: 3, d: 4 });
    expect(r90.rooms[0].sign?.side).toBe("w");
    expect(r90.rooms[0].lights).toEqual([{ x: -1, z: 0 }]);
    // the door: local south, 1 m along +X → east wall, 1 m along −Z
    const door90 = r90.rooms[0].partitions.find((p) => p.openings.length)!;
    expect(door90.side).toBe("e");
    expect(door90.openings[0]).toMatchObject({ kind: "door", offset: -1, width: 1.6 });
    // door centre in world space = the rotated local centre (0 + 1, +4) → (4, −1)
    const centre = (rot: number, side: string, offset: number, w: number, d: number) =>
      side === "n" ? [offset, -d / 2] : side === "s" ? [offset, d / 2] : side === "e" ? [w / 2, offset] : [-w / 2, offset];
    for (const rot of [0, 90, 180, 270] as const) {
      const f = at(rot);
      const room = f.rooms[0];
      const p = room.partitions.find((x) => x.openings.length)!;
      const [x, z] = centre(rot, p.side, p.openings[0].offset, room.rect.w, room.rect.d);
      const [ex, ez] = rotateLocal(1, 4, rot);
      expect([x + 0, z + 0], `rot ${rot}`).toEqual([ex, ez]);
      // every side is still listed once
      expect(new Set(room.partitions.map((q) => q.side)).size).toBe(4);
    }
    const r180 = at(180);
    expect(r180.placements[0]).toMatchObject({ x: 0, z: 2.5, rot: 180 });
    const r270 = at(270);
    expect(r270.placements[0]).toMatchObject({ x: 2.5, z: 0, rot: 270 });
    expect(r270.placements[1]).toMatchObject({ id: "r.monitor", x: 3.4, z: -1.2, rot: 270 });
  });

  it("a side on a wall of its building uses that wall (no partition there)", () => {
    // block: x −30…30, z −20…20, 1 m walls; a bay against the north wall (room z −20…−12) and one inside
    const r = compileFacility(
      facility([
        { id: "north", template: "bay", x: 0, z: -16 },
        { id: "inside", template: "bay", x: 10, z: 0 },
        { id: "corner", template: "bay", x: -27, z: 16, rot: 180 },
      ]),
      [T],
    );
    expect(r.ok).toBe(true);
    const sides = (id: string) => r.facility.rooms.find((x) => x.id === id)!.partitions.map((p) => p.side).sort();
    expect(sides("north")).toEqual(["e", "s", "w"]);
    expect(sides("inside")).toEqual(["e", "n", "s", "w"]);
    // rotated by 180°: local north (the back) is the south facade; the west side is the west facade
    expect(sides("corner")).toEqual(["e", "n"]);
  });

  it("is deterministic and keeps instance order", () => {
    const input = [
      { id: "b", template: "bay", x: -10, z: 0, rot: 90 as const },
      { id: "a", template: "bay", x: 10, z: 0, rot: 270 as const },
    ];
    const one = compileFacility(facility(input), [T]);
    const two = compileFacility(facility(structuredClone(input)), [template()]);
    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
    expect(one.facility.rooms.map((r) => r.id)).toEqual(["b", "a"]);
    expect(one.facility.patientSlots.map((s) => s.id)).toEqual(["b.slot", "a.slot"]);
  });

  it("appends after authored entities and puts instances on their level and building", () => {
    const f = facility([{ id: "up", template: "bay", x: 0, z: 0, level: "L1" }], {
      levels: [
        { id: "L0", name: "G" },
        { id: "L1", name: "1", elevation: 4.5 },
      ],
      buildings: [
        { id: "block", name: "Block", rect: { x: 0, z: 0, w: 60, d: 40 } },
        { id: "tower", name: "Tower", rect: { x: 0, z: 0, w: 20, d: 20 }, levels: ["L1"] },
      ],
      rooms: [{ id: "hall", name: "Hall", kind: "corridor", rect: { x: 0, z: 15, w: 20, d: 4 } }],
      placements: [{ id: "chair", type: "desk", x: 0, z: 15 }],
    });
    const r = compileFacility(f, [T]);
    expect(r.issues).toEqual([]);
    expect(r.facility.rooms.map((x) => [x.id, x.level, x.building])).toEqual([
      ["hall", undefined, undefined],
      ["up", "L1", "tower"],
    ]);
    expect(r.facility.placements.map((p) => p.id)).toEqual(["chair", "up.bed", "up.monitor", "up.desk"]);
    expect(r.facility.access[0]).toMatchObject({ id: "up.clean", level: "L1" });
  });

  it("applies overrides: name, omit, placement patches, slot accepts, staff, sign, partitions", () => {
    const r = compileFacility(
      facility([
        {
          id: "a",
          template: "bay",
          x: 0,
          z: 0,
          overrides: {
            name: { "zh-CN": "A 床", en: "Bay A" },
            omit: ["desk", "clean", "ghost"],
            placements: { monitor: { label: "Bay A monitor", capabilities: ["capnography"] }, nope: { label: "x" } },
            patientSlots: { slot: { accepts: ["icu", "inpatient"], posture: "sitting" } },
            staff: { nurse: { name: "Nurse Li", greeting: "Hello" } },
            sign: null,
            partitions: [{ side: "s", openings: [{ kind: "opening", width: 4 }] }],
          },
        },
      ]),
      [T],
    );
    expect(r.ok).toBe(true);
    const f = r.facility;
    expect(f.rooms[0].name).toEqual({ "zh-CN": "A 床", en: "Bay A" });
    expect(f.rooms[0].sign).toBeUndefined();
    expect(f.rooms[0].partitions).toHaveLength(1);
    expect(f.placements.map((p) => p.id)).toEqual(["a.bed", "a.monitor"]);
    expect(f.placements[1]).toMatchObject({ label: "Bay A monitor", capabilities: ["capnography"] });
    expect(f.patientSlots[0]).toMatchObject({ accepts: ["icu", "inpatient"], posture: "sitting" });
    expect(f.staff[0]).toMatchObject({ name: "Nurse Li", greeting: "Hello" });
    expect(f.access).toEqual([]);
    expect(r.issues.map((i) => [i.path, i.severity])).toEqual([
      ["instances.0.overrides.omit", "warning"],
      ["instances.0.overrides.placements.nope", "warning"],
    ]);
  });

  it("reports unknown templates, duplicate instances, bad rotations, overlaps, id collisions and dangling slot references", () => {
    const f = facility(
      [
        { id: "a", template: "bay", x: 0, z: 0 },
        { id: "a", template: "bay", x: 20, z: 0 },
        { id: "ghost", template: "no-such-template", x: 20, z: 0 },
        { id: "b", template: "bay", x: 3, z: 0 }, // overlaps a by 3 × 8 m
        { id: "c", template: "bay", x: -20, z: 0, overrides: { omit: ["bed"] } }, // the slot's bed is gone
        { id: "hall", template: "bay", x: 20, z: 10 }, // room id taken by an authored room
      ],
      {
        rooms: [{ id: "hall", name: "Hall", kind: "corridor", rect: { x: -20, z: 2, w: 4, d: 2 } }],
        placements: [{ id: "a.bed", type: "bed", x: 30, z: 30 }],
      },
    );
    // a rotation outside the schema (unparsed input) is refused too
    const raw = { ...f, instances: [...f.instances, { id: "skew", template: "bay", x: 0, z: 30, rot: 45 as never }] };
    const r = compileFacility(raw, [T]);
    expect(r.ok).toBe(false);
    const brief = r.issues.map((i) => [i.path, i.severity, i.message]);
    expect(brief).toEqual(
      expect.arrayContaining([
        ["instances.0.id", "error", 'compiled placement id "a.bed" collides with an authored placement'],
        ["instances.1.id", "error", 'duplicate instance id "a"'],
        ["instances.2.template", "error", 'unknown room template "no-such-template"'],
        ["instances.3", "error", 'room of instance "b" overlaps instance "a" by 3.00×8.00 m on level "L0"'],
        ["instances.4.template", "error", 'slot "slot" of template "bay" (patientSlots.0.bed) names placement "bed", which the instance omits'],
        ["instances.5.id", "error", 'compiled room id "hall" collides with an authored room'],
        ["instances.6.rot", "error", "rotation 45° is not one of 0, 90, 180, 270"],
      ]),
    );
    // the instance "c" overlapping the authored room "hall" is only a warning, and it is left out (it has an error)
    expect(r.facility.rooms.map((x) => x.id)).toEqual(["hall", "a", "b", "hall"]);
  });

  it("an instance room partly overlapping an authored room is a warning; one nested inside it is fine", () => {
    const r = compileFacility(facility([{ id: "a", template: "bay", x: 0, z: 0 }], { rooms: [{ id: "half", name: "Half", kind: "waiting", rect: { x: 4, z: 0, w: 4, d: 4 } }] }), [T]);
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([{ path: "instances.0", severity: "warning", message: 'room of instance "a" overlaps authored room "half" by 1.00×4.00 m' }]);
    const nested = compileFacility(facility([{ id: "a", template: "bay", x: 0, z: 0 }], { rooms: [{ id: "big", name: "Big", kind: "waiting", rect: { x: 0, z: 0, w: 10, d: 10 } }] }), [T]);
    expect(nested.issues).toEqual([]);
  });
});

describe("parseRoomTemplate / checkRoomTemplate", () => {
  it("parses with defaults and reports schema errors with paths", () => {
    const r = parseRoomTemplate(BAY);
    if (!r.ok) throw new Error(JSON.stringify(r.issues));
    expect(r.value.placements[0]).toMatchObject({ y: 0, rot: 0 });
    expect(r.value.partitions[0]).toMatchObject({ material: "white", height: 4, thickness: 0.35, openings: [] });
    const bad = parseRoomTemplate({ ...BAY, size: { w: -1, d: 2 }, placements: [{ id: "x", type: "bed", x: 0, z: 0, room: "r" }] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.issues.map((i) => i.path)).toEqual(expect.arrayContaining(["size.w", "placements.0"]));
  });

  it("checks equipment, references, positions and declared capabilities", () => {
    expect(checkRoomTemplate(template(), [catalog]).filter((i) => i.severity === "error")).toEqual([]);
    const broken = template({
      ...BAY,
      capabilities: ["cardiac-monitor", "ventilator"],
      placements: [...(BAY.placements ?? []), { id: "ghost", type: "no-such-type", x: 0, z: 0 }, { id: "far", type: "desk", x: 9, z: 0 }],
      patientSlots: [{ id: "slot", x: 0, z: -2.5, bed: "nope", accepts: ["inpatient"] }],
    });
    const brief = checkRoomTemplate(broken, [catalog]).map((i) => [i.path, i.severity, i.message]);
    expect(brief).toEqual(
      expect.arrayContaining([
        ["", "error", 'slot "slot" of template "bay" (patientSlots.0.bed) names placement "nope", which the template does not have'],
        ["capabilities.1", "warning", 'template "bay" declares "ventilator", which none of its equipment provides'],
      ]),
    );
    // compiled alone (without the dangling slot) the unknown type and the far desk are reported on template paths
    const noSlot = template({ ...BAY, patientSlots: [], placements: [...(BAY.placements ?? []), { id: "ghost", type: "no-such-type", x: 0, z: 0 }, { id: "far", type: "desk", x: 9, z: 0 }] });
    const issues = checkRoomTemplate(noSlot, [catalog]).map((i) => [i.path, i.severity]);
    expect(issues).toEqual(expect.arrayContaining([["placements.3.type", "error"], ["placements.4", "warning"]]));
  });
});
