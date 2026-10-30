import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EquipmentCatalog, FacilityDefinition } from "../schema/facility.js";
import {
  assignPatientSlot,
  buildingLevels,
  caseCapabilityGaps,
  checkCatalogs,
  checkFacility,
  defaultLevelId,
  entityLevel,
  facilityCapabilities,
  facilityLevels,
  mergeCatalogs,
  parseCase,
  parseCatalog,
  parseFacility,
  placementBox,
  placementCapabilities,
  regionAt,
  resolveWaypoint,
  roomLevel,
  type Issue,
} from "./index.js";

const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

function loadFacility(): FacilityDefinition {
  const r = parseFacility(fixture("mini.facility.json"));
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

function loadCatalog(): EquipmentCatalog {
  const r = parseCatalog(fixture("mini.catalog.json"));
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

const F = loadFacility();
const CATALOGS = [loadCatalog()];
const at = (issues: Issue[], path: string) => issues.filter((i) => i.path === path);

describe("catalogs & capabilities", () => {
  it("merges catalogs with later ids overriding earlier ones", () => {
    const override: EquipmentCatalog = { ...CATALOGS[0], id: "override", materials: [{ ...CATALOGS[0].materials[0], color: "#000000" }], equipment: [] };
    const merged = mergeCatalogs([...CATALOGS, override]);
    expect(merged.materials.get("grass")?.color).toBe("#000000");
    expect(merged.equipment.get("ct-scanner")?.capabilities).toEqual(["ct"]);
    expect(merged.materials.size).toBe(CATALOGS[0].materials.length);
  });

  it("combines equipment and placement capabilities", () => {
    expect(placementCapabilities(F, CATALOGS, "ws-lab")).toEqual(["lab-hematology", "lab-chemistry"]);
    expect(placementCapabilities(F, CATALOGS, "mon-1")).toEqual(["cardiac-monitor", "capnography"]);
    expect(placementCapabilities(F, CATALOGS, "nope")).toEqual([]);
    const caps = facilityCapabilities(F, CATALOGS);
    for (const cap of ["stethoscope", "thermometer", "reflex-hammer", "otoscope", "ct", "ultrasound", "lab-hematology", "evidence-board", "anatomy-atlas", "capnography"]) {
      expect(caps.has(cap)).toBe(true);
    }
    expect(caps.has("mri")).toBe(false);
  });
});

describe("spatial lookups", () => {
  it("names the smallest room containing a point, then the building, then the outdoor region", () => {
    expect(regionAt(F, -10, -2, "zh-CN")).toBe("抢救位");
    expect(regionAt(F, -6, 2, "en")).toBe("Consult room");
    expect(regionAt(F, 8, 0, "en")).toBe("Imaging");
    expect(regionAt(F, 0, 9, "en")).toBe("Clinic building");
    expect(regionAt(F, 0, 15, "zh-CN")).toBe("疗愈花园");
    expect(regionAt(F, 0, 15, "en")).toBe("Healing Garden");
  });

  it("assigns the first slot accepting the case setting", () => {
    expect(assignPatientSlot(F, { setting: "emergency" })?.id).toBe("slot-bay");
    expect(assignPatientSlot(F, { setting: "ward" })?.id).toBe("slot-ward");
    expect(assignPatientSlot(F, { setting: "icu" })).toBeNull();
  });

  it("resolves waypoint targets", () => {
    expect(resolveWaypoint(F, CATALOGS, "ct")).toEqual({ x: 8, z: 4, label: "影像工作站" });
    expect(resolveWaypoint(F, CATALOGS, "ct", { from: { x: 10, z: -4 }, locale: "en" })).toEqual({ x: 10, z: -2, label: "CT scanner" });
    expect(resolveWaypoint(F, CATALOGS, "lab-hematology", { locale: "en" })).toEqual({ x: -8, z: 4, label: "Lab workstation" });
    expect(resolveWaypoint(F, CATALOGS, "patient", { locale: "en" })).toEqual({ x: -10, z: -2, label: "Resus bay" });
    expect(resolveWaypoint(F, CATALOGS, "patient", { slotId: "slot-ward", locale: "en" })).toEqual({ x: -6, z: 2, label: "Consult room" });
    expect(resolveWaypoint(F, CATALOGS, "board", { locale: "en" })).toEqual({ x: 0, z: -8, label: "Evidence board" });
    expect(resolveWaypoint(F, CATALOGS, "atlas", { locale: "en" })).toEqual({ x: 4, z: -8, label: "Anatomy atlas" });
    expect(resolveWaypoint(F, CATALOGS, "imaging-suite", { locale: "en" })).toEqual({ x: 8, z: 0, label: "Imaging" });
    expect(resolveWaypoint(F, CATALOGS, "imaging", { locale: "en" })).toEqual({ x: 8, z: 0, label: "Imaging" });
    expect(resolveWaypoint(F, CATALOGS, "resus")).toEqual({ x: -10, z: -2, label: "抢救位" });
    expect(resolveWaypoint(F, CATALOGS, "couch-1", { locale: "en" })).toEqual({ x: -10, z: -2, label: "Exam couch" });
    expect(resolveWaypoint(F, CATALOGS, "mri")).toBeNull();
  });
});

describe("placementBox", () => {
  it("swaps footprint axes when rotated by 90°", () => {
    const ct = mergeCatalogs(CATALOGS).equipment.get("ct-scanner")!;
    const base = { id: "p", type: "ct-scanner", x: 0, z: 0, y: 0 };
    const b0 = placementBox({ ...base, rot: 0 }, ct);
    const b90 = placementBox({ ...base, rot: 90 }, ct);
    expect([b0.maxX - b0.minX, b0.maxZ - b0.minZ, b0.maxY]).toEqual([2, 4, 2]);
    expect(b90.maxX - b90.minX).toBeCloseTo(4);
    expect(b90.maxZ - b90.minZ).toBeCloseTo(2);
  });
});

describe("checkFacility", () => {
  it("accepts the fixture", () => {
    expect(checkFacility(F, CATALOGS)).toEqual([]);
    expect(checkCatalogs(CATALOGS)).toEqual([]);
  });

  it("reports unknown ids, bad references and positions", () => {
    const f = structuredClone(F);
    f.catalogs.push("hospital");
    f.terrain.ground = "lava";
    f.buildings[0].walls.body = "marble";
    f.buildings[0].walls.frame = "titanium";
    f.rooms[0].partitions[0].material = "cardboard";
    f.rooms.push({ ...f.rooms[0], id: "annex", building: "ghost-building", rect: { x: 18, z: 0, w: 10, d: 4 } });
    f.placements.push({ id: "mystery", type: "teleporter", x: 0, z: 0, y: 0, rot: 0 });
    f.placements.push({ id: "far", type: "workstation", x: 50, z: 0, y: 0, rot: 45, room: "nowhere" });
    f.placements.push({ ...f.placements[0] });
    f.patientSlots[0].bed = "ghost-bed";
    f.patientSlots[0].monitor = "ws-lab";
    f.patientSlots[1].room = "nowhere";
    f.patientSlots.push({ id: "outside", room: "consult", x: 0, z: 9, rot: 0, posture: "standing", accepts: ["icu"] });
    f.staff[0].room = "ghost-room";
    f.spawn = { x: 100, z: 0, yaw: 0 };
    f.buildZone!.materials.push("unobtainium");
    const issues = checkFacility(f, CATALOGS);
    const expectIssue = (path: string, severity: Issue["severity"], message: RegExp) =>
      expect(at(issues, path)).toContainEqual({ path, severity, message: expect.stringMatching(message) });

    expectIssue("catalogs.1", "warning", /catalog "hospital" is not loaded/);
    expectIssue("terrain.ground", "error", /unknown material "lava"/);
    expectIssue("buildings.0.walls.body", "error", /unknown material "marble"/);
    expectIssue("buildings.0.walls.frame", "error", /unknown material "titanium"/);
    expectIssue("rooms.0.partitions.0.material", "error", /unknown material "cardboard"/);
    expectIssue("buildZone.materials.4", "error", /unknown material "unobtainium"/);
    expectIssue("rooms.3.building", "error", /unknown building "ghost-building"/);
    expectIssue("rooms.3.rect", "warning", /outside the facility bounds/);
    expectIssue("placements.7.type", "error", /unknown equipment type "teleporter"/);
    expectIssue("placements.8", "error", /outside the facility bounds/);
    expectIssue("placements.8.rot", "warning", /not a multiple of 90/);
    expectIssue("placements.8.room", "error", /unknown room "nowhere"/);
    expectIssue("placements.9.id", "error", /duplicate placements id "ws-lab"/);
    expectIssue("placements.9", "warning", /overlaps solid "ws-lab"/);
    expectIssue("patientSlots.0.bed", "error", /unknown placement "ghost-bed"/);
    expectIssue("patientSlots.0.monitor", "warning", /is not a monitor/);
    expectIssue("patientSlots.1.room", "error", /unknown room "nowhere"/);
    expectIssue("patientSlots.2", "warning", /outside its room "consult"/);
    expectIssue("staff.0.room", "error", /unknown room "ghost-room"/);
    expectIssue("spawn", "error", /outside the facility bounds/);
  });

  it("detects overlapping solids rotation-aware, ignoring non-solids, stacked items and touching edges", () => {
    // ct-1 is a 2×4 scanner at (10, −2): x 9..11, z −4..0
    const overlapsWith = (extra: FacilityDefinition["placements"]) => {
      const f = structuredClone(F);
      f.placements.push(...extra);
      return checkFacility(f, CATALOGS).filter((i) => /overlaps/.test(i.message));
    };
    const ct2 = { id: "ct-2", type: "ct-scanner", x: 12.2, z: -2, y: 0 };
    expect(overlapsWith([{ ...ct2, rot: 0 }])).toEqual([]); // x 11.2..13.2
    const rotated = overlapsWith([{ ...ct2, rot: 90 }]); // 4×2 → x 10.2..14.2, z −3..−1
    expect(rotated).toEqual([{ path: "placements.7", severity: "warning", message: 'solid "ct-2" overlaps solid "ct-1" by 0.80×2.00 m' }]);
    expect(
      overlapsWith([
        { id: "mon-2", type: "patient-monitor", x: 10, z: -2, y: 0, rot: 0 }, // non-solid inside the scanner
        { id: "shelf-top", type: "workstation", x: 10, z: -2, y: 2.5, rot: 0 }, // above the 2 m scanner
        { id: "edge", type: "workstation", x: 8.02, z: -1, y: 0, rot: 0 }, // x 7.02..9.02: 0.02 m < tolerance
        { id: "touch", type: "workstation", x: 12, z: -2, y: 0, rot: 0 }, // x 11..13 touches the scanner face
      ]),
    ).toEqual([]);
  });
});

describe("placement extraParts / hideParts", () => {
  const withPlacement = (extra: Record<string, unknown>) => {
    const raw = structuredClone(fixture("mini.facility.json")) as { placements: Record<string, unknown>[] };
    Object.assign(raw.placements[0], extra);
    return parseFacility(raw);
  };

  it("parses extra parts (defaulting anim) and hidden part indices", () => {
    const r = withPlacement({
      hideParts: [1],
      extraParts: [
        { m: "white", p: [-0.97, 1.17, 0.15], s: [0.11, 0.4, 0.11] },
        { m: "screen", p: [0.6, 1.2, -0.2], s: [0.8, 0.6, 0.1], name: "screen", r: 15 },
      ],
    });
    if (!r.ok) throw new Error(JSON.stringify(r.issues));
    const ws = r.value.placements[0];
    expect(ws.hideParts).toEqual([1]);
    expect(ws.extraParts).toEqual([
      { m: "white", p: [-0.97, 1.17, 0.15], s: [0.11, 0.4, 0.11], anim: "none" },
      { m: "screen", p: [0.6, 1.2, -0.2], s: [0.8, 0.6, 0.1], name: "screen", r: 15, anim: "none" },
    ]);
    expect(checkFacility(r.value, CATALOGS)).toEqual([]);
    // optional: placements without them stay without them
    expect(r.value.placements[1].extraParts).toBeUndefined();
    expect(r.value.placements[1].hideParts).toBeUndefined();
  });

  it("rejects malformed extra parts and hidden indices with precise paths", () => {
    const bad = withPlacement({ extraParts: [{ m: "white", p: [0, 1], s: [1, 1, 1] }, { m: "white", p: [0, 1, 0], s: [1, 1, 1], colour: "red" }], hideParts: [-1, 0.5] });
    expect(bad.ok).toBe(false);
    const paths = bad.ok ? [] : bad.issues.map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["placements.0.extraParts.0.p", "placements.0.extraParts.1", "placements.0.hideParts.0", "placements.0.hideParts.1"]));
  });

  it("reports unknown materials, out-of-range hidden parts and extra parts outside the footprint", () => {
    const f = structuredClone(F);
    // workstation footprint 2 × 1 × 1.6, two parts
    f.placements[0].extraParts = [
      { m: "white", p: [0.5, 1, 0], s: [0.2, 0.2, 0.2], anim: "none" },
      { m: "kryptonite", p: [0, 1, 0], s: [0.2, 0.2, 0.2], anim: "none" },
      { m: "white", p: [1, 1, 0], s: [0.2, 0.2, 0.2], anim: "none" }, // x up to 1.1 > 1 + tolerance
      { m: "white", p: [0, 1.5, 0], s: [0.2, 0.2, 0.2], anim: "none" }, // top 1.6 = footprint height: inside
      { m: "white", p: [0, 1, 0.6], s: [0.2, 0.2, 0.2], anim: "none" }, // z up to 0.7 > 0.5
    ];
    f.placements[0].hideParts = [0, 1, 2];
    f.placements[0].rot = 90; // the footprint check is in the local frame: rotation changes nothing
    const issues = checkFacility(f, CATALOGS);
    expect(issues.filter((i) => i.path.startsWith("placements.0."))).toEqual([
      { path: "placements.0.extraParts.1.m", severity: "error", message: 'unknown material "kryptonite"' },
      { path: "placements.0.hideParts.2", severity: "error", message: '"workstation" has no part 2 (it has 2)' },
      { path: "placements.0.extraParts.2", severity: "warning", message: 'extra part extends outside the 2×1×1.6 footprint of "workstation"' },
      { path: "placements.0.extraParts.4", severity: "warning", message: 'extra part extends outside the 2×1×1.6 footprint of "workstation"' },
    ]);
  });

  it("accepts facility-local materials in extra parts", () => {
    const f = structuredClone(F);
    f.materials = [{ id: "tube-glass", color: "#eeeeee", pattern: "flat", variance: 0, emissiveIntensity: 0.3, opacity: 0.6, roughness: 0.2, metalness: 0, castShadow: false }];
    f.placements[0].extraParts = [{ m: "tube-glass", p: [0, 1, 0], s: [0.1, 0.4, 0.1], anim: "none" }];
    expect(checkFacility(f, CATALOGS)).toEqual([]);
  });
});

describe("checkCatalogs", () => {
  it("reports duplicates across catalogs, unknown part materials and parts outside the footprint", () => {
    const extra = structuredClone(CATALOGS[0]);
    extra.id = "extra";
    extra.materials = [extra.materials[0]];
    extra.equipment = [structuredClone(extra.equipment[0])];
    extra.equipment[0].parts.push({ m: "plutonium", p: [3, 0.5, 0], s: [1, 1, 1], anim: "none" });
    extra.equipment[0].parts = extra.equipment[0].parts.filter((p) => p.name !== "screen");
    const issues = checkCatalogs([...CATALOGS, extra]);
    expect(issues.map((i) => [i.path, i.severity])).toEqual([
      ["catalog(extra).materials.0.id", "warning"],
      ["catalog(extra).equipment.0.id", "warning"],
      ["catalog(extra).equipment.0.parts.1.m", "error"],
      ["catalog(extra).equipment.0.parts.1", "warning"],
      ["catalog(extra).equipment.0.screen", "warning"],
    ]);
  });
});

describe("resolveWaypoint: the patient's own bedside kit", () => {
  const content = new URL("../../../content/", import.meta.url);
  const read = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, content), "utf8"));
  const hospital = parseFacility(read("facilities/general-hospital.json"));
  const catalogIds = hospital.ok ? hospital.value.catalogs : [];
  const catalogs = catalogIds.flatMap((id) => {
    const r = parseCatalog(read(`catalogs/${id}.json`));
    return r.ok ? [r.value] : [];
  });
  it.skipIf(!hospital.ok || catalogs.length === 0)("points to the slot's linked monitor, not the one nearest the player (DKA: resus bay, not cubicle 1)", () => {
    const f = hospital.ok ? hospital.value : (null as never);
    const spawn = { x: f.spawn.x, z: f.spawn.z };
    const nearest = resolveWaypoint(f, catalogs, "cardiac-monitor", { from: spawn, locale: "en", slotId: "resus-1" });
    const own = resolveWaypoint(f, catalogs, "cardiac-monitor", { from: spawn, locale: "en", slotId: "resus-1", preferPatientSlot: true });
    const resusMonitor = f.placements.find((p) => p.id === "resus1-monitor")!;
    expect(own).toMatchObject({ x: resusMonitor.x, z: resusMonitor.z });
    expect(nearest).not.toEqual(own); // the old behaviour: nearest to wherever the learner stands
    // A capability the patient's room lacks still falls back to the nearest provider.
    expect(resolveWaypoint(f, catalogs, "lab-hematology", { from: spawn, locale: "en", slotId: "resus-1", preferPatientSlot: true })).toEqual(resolveWaypoint(f, catalogs, "lab-hematology", { from: spawn, locale: "en" }));
  });
});

describe("caseCapabilityGaps (C3/C4)", () => {
  const parsed = parseCase(fixture("mini-anaphylaxis.case.json"));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  const c = parsed.value;

  it("names the items a facility cannot provide, and which objectives they block", () => {
    const gaps = caseCapabilityGaps(c, F, CATALOGS);
    const epi = gaps.find((g) => g.id === "epi");
    // The mini facility has no "medications" capability: adrenaline (objective "treat") cannot be given there.
    expect(epi).toMatchObject({ kind: "intervention", missing: ["medications"], blocking: true });
    expect(epi!.neededBy).toContain("treat");
    // stethoscope is personal kit: the airway exam is never a gap.
    expect(gaps.find((g) => g.id === "airway")).toBeUndefined();
  });

  it("an alternative in the condition keeps an item non-blocking; a facility with everything has no gaps", () => {
    const withAlternative = { ...c, objectives: c.objectives.map((o) => (o.id === "treat" ? { ...o, completeWhen: { any: [{ intervened: "epi" }, { intervened: "chlorphenamine" }] } } : o)) } as typeof c;
    expect(caseCapabilityGaps(withAlternative, F, CATALOGS).find((g) => g.id === "epi")?.blocking).toBe(false);
    const everything = { ...F, placements: [...F.placements, { ...F.placements[0]!, id: "all-caps", capabilities: ["medications", "oxygen", "iv-access", "lab-blood-gas", "lab-chemistry", "xray", "ct"] }] } as typeof F;
    expect(caseCapabilityGaps(c, everything, CATALOGS)).toEqual([]);
  });
});

describe("levels, connectors and access zones (EMBODIED R10)", () => {
  it("are optional: a facility without them has one implicit level L0", () => {
    expect(F.levels).toEqual([]);
    expect(F.connectors).toEqual([]);
    expect(F.access).toEqual([]);
    expect(facilityLevels(F)).toEqual([{ id: "L0", name: { "zh-CN": "一层", en: "Ground floor" }, elevation: 0, height: 5 }]);
    expect(defaultLevelId(F)).toBe("L0");
    expect(entityLevel(F, F.placements[0])).toBe("L0");
    expect(checkFacility(F, CATALOGS).filter((i) => /level|connector|access/.test(i.path))).toEqual([]);
  });

  it("parse with defaults and resolve entity levels (own level → room's level → default level)", () => {
    const raw = structuredClone(fixture("mini.facility.json")) as Record<string, unknown> & { rooms: Record<string, unknown>[]; placements: Record<string, unknown>[] };
    raw.levels = [
      { id: "B1", name: { "zh-CN": "地下一层", en: "Basement" }, elevation: -4 },
      { id: "G", name: { "zh-CN": "一层", en: "Ground" } },
    ];
    raw.rooms[2].level = "B1";
    const r = parseFacility(raw);
    if (!r.ok) throw new Error(JSON.stringify(r.issues));
    const f = r.value;
    expect(f.levels[1]).toEqual({ id: "G", name: { "zh-CN": "一层", en: "Ground" }, elevation: 0, height: 5 });
    expect(defaultLevelId(f)).toBe("G"); // elevation 0, not the first listed
    expect(roomLevel(f, f.rooms[0])).toBe("G");
    expect(entityLevel(f, { room: "imaging-suite" })).toBe("B1");
    expect(entityLevel(f, { room: "imaging-suite", level: "G" })).toBe("G");
    expect(buildingLevels(f, f.buildings[0])).toEqual(["G"]);
  });

  it("reports unknown levels, level mismatches, bad connector stops and access zones", () => {
    const f = structuredClone(F);
    f.levels = [
      { id: "L0", name: "Ground", elevation: 0, height: 5 },
      { id: "L1", name: "First", elevation: 5, height: 5 },
      { id: "L1", name: "Dup", elevation: 5, height: 5 },
    ];
    f.buildings[0].levels = ["L0", "L9"];
    f.rooms[0].level = "L1"; // the clinic building does not span L1
    f.placements[0].level = "L0"; // its room "consult" is on L1
    f.staff = [{ id: "s1", role: "nurse", name: "N", room: "consult", level: "L7", x: -8, z: 0, rot: 0 }];
    f.connectors = [
      { id: "stairs", kind: "stairs", name: "Stairs", stops: [{ level: "L0", x: 0, z: 0 }, { level: "L1", x: 0, z: 2 }], roles: [] },
      { id: "bad", kind: "elevator", name: "Lift", stops: [{ level: "L0", x: 0, z: 0 }, { level: "L0", x: 99, z: 0 }, { level: "L5", x: 0, z: 0 }], roles: [] },
      { id: "flat", kind: "ramp", name: "Ramp", stops: [{ level: "L1", x: 30, z: 0 }, { level: "L0", x: 5, z: 0 }], roles: ["porter"] },
    ];
    f.access = [{ id: "or", name: "OR", level: "L3", rect: { x: 0, z: 0, w: 60, d: 4 }, roles: ["attending"] }];
    const issues = checkFacility(f, CATALOGS).filter((i) => /^(levels|buildings|rooms|placements|staff|connectors|access)\b/.test(i.path) && /level|connector|access|elevation|stop/i.test(i.message + i.path));
    const brief = issues.map((i) => [i.path, i.severity, i.message]);
    expect(brief).toEqual(
      expect.arrayContaining([
        ["levels.2.id", "error", 'duplicate levels id "L1"'],
        ["buildings.0.levels.1", "error", 'unknown level "L9"'],
        ["rooms.0.level", "warning", 'room "consult" is on level "L1", which building "clinic" does not span'],
        ["placements.0.level", "warning", 'placement "ws-lab" is on level "L0" but its room "consult" is on "L1"'],
        ["staff.0.level", "error", 'unknown level "L7"'],
        ["connectors.1.stops.1", "error", 'stop (99, 0) of connector "bad" is outside the facility bounds'],
        ["connectors.1.stops.1.level", "error", 'consecutive stops of connector "bad" are on the same level "L0"'],
        ["connectors.1.stops.2.level", "error", 'unknown level "L5"'],
        ["connectors.2.stops.0", "warning", 'stop of connector "flat" on level "L1" is outside every building on that level'],
        ["access.0.level", "error", 'unknown level "L3"'],
        ["access.0.rect", "warning", 'access zone "or" extends outside the facility bounds'],
      ]),
    );
    // stairs inside the clinic building on L1? The building spans L0 and the unknown L9 only → warning
    expect(brief).toContainEqual(["connectors.0.stops.1", "warning", 'stop of connector "stairs" on level "L1" is outside every building on that level']);
  });

  it("does not report solids on different levels as overlapping", () => {
    const f = structuredClone(F);
    f.levels = [
      { id: "L0", name: "Ground", elevation: 0, height: 5 },
      { id: "L1", name: "First", elevation: 5, height: 5 },
    ];
    f.buildings[0].levels = ["L0", "L1"];
    f.placements.push({ ...f.placements.find((p) => p.id === "ct-1")!, id: "ct-upstairs", level: "L1", room: undefined });
    expect(checkFacility(f, CATALOGS).filter((i) => /overlaps/.test(i.message))).toEqual([]);
  });
});

describe("checkCatalogs: embodiment fields", () => {
  const withType = (patch: Record<string, unknown>) => {
    const raw = structuredClone(fixture("mini.catalog.json")) as { equipment: Record<string, unknown>[] };
    Object.assign(raw.equipment.find((e) => e.id === "patient-monitor")!, patch);
    const r = parseCatalog(raw);
    if (!r.ok) throw new Error(JSON.stringify(r.issues));
    const index = r.value.equipment.findIndex((e) => e.id === "patient-monitor");
    return { issues: checkCatalogs([r.value]).filter((i) => i.path.startsWith(`catalog(${r.value.id}).equipment.${index}.`)), prefix: `catalog(${r.value.id}).equipment.${index}` };
  };

  it("parses portable, reach, interactionPoints, behaviour and model", () => {
    const { issues } = withType({
      solid: true, // the mini catalog's monitor is non-solid (wall-mounted carts are flagged)
      portable: "cart",
      reach: 1.4,
      interactionPoints: [{ x: 0, z: 0.8 }],
      behavior: {
        initial: "detached",
        derived: "monitor-attachment",
        states: { detached: {}, attached: { name: { "zh-CN": "已连接", en: "Attached" } } },
        operations: {
          attach: { name: "Attach", from: ["detached"], to: "attached", requires: [{ all: [{ patientWithin: 1.5 }, { not: { state: "attached" } }] }], clinical: { tool: "intervene", select: "monitoring" } },
          read: { name: "Read", from: "*", requires: [{ actorWithin: 6 }] },
        },
      },
      model: { uri: "models/monitor.glb", sha256: "a".repeat(64), scale: 0.5, license: "CC0-1.0" },
    });
    expect(issues).toEqual([]);
  });

  it("rejects malformed behaviours and predicates at parse time", () => {
    const raw = structuredClone(fixture("mini.catalog.json")) as { equipment: Record<string, unknown>[] };
    raw.equipment[0].behavior = { initial: "a", states: { a: {} }, operations: { go: { name: "Go", from: ["a"], requires: [{ teleport: true }] } } };
    raw.equipment[1].portable = "trolley";
    const r = parseCatalog(raw);
    expect(r.ok).toBe(false);
    expect(r.ok ? [] : r.issues.map((i) => i.path)).toEqual(expect.arrayContaining(["equipment.0.behavior.operations.go.requires.0", "equipment.1.portable"]));
  });

  it("reports behaviour inconsistencies, odd interaction points, wall-mounted carts and non-GLB models", () => {
    const { issues, prefix } = withType({
      solid: false,
      portable: "cart",
      interactionPoints: [{ x: 0, z: 0 }, { x: 0, z: 9 }],
      behavior: {
        initial: "off",
        derived: "monitor-attachment",
        states: { on: {}, attached: {} },
        operations: {
          start: { name: "Start", from: ["off", "on"], to: "running", requires: [{ any: [{ state: "broken" }] }], clinical: { tool: "check_vitals", select: "monitoring" }, release: true },
        },
      },
      model: { uri: "models/monitor.fbx", license: "CC-BY-4.0" },
    });
    const brief = issues.map((i) => [i.path.slice(prefix.length + 1), i.severity]);
    expect(brief).toEqual(
      expect.arrayContaining([
        ["behavior.initial", "error"],
        ["behavior.states", "error"], // derived monitor attachment needs "detached"
        ["behavior.operations.start.from.0", "error"],
        ["behavior.operations.start.to", "error"],
        ["behavior.operations.start.requires.0", "error"],
        ["behavior.operations.start.clinical.tool", "warning"],
        ["behavior.operations.start.release", "warning"],
        ["interactionPoints.1", "warning"], // 8.7 m away, beyond reach
        ["portable", "warning"], // solid: false (wall-mounted)
        ["model.uri", "warning"],
      ]),
    );
    // a point inside a non-solid footprint is fine (wall-mounted items are approached from the front)
    expect(brief).not.toContainEqual(["interactionPoints.0", "warning"]);
    const solid = withType({ solid: true, interactionPoints: [{ x: 0, z: 0 }] });
    expect(solid.issues.map((i) => i.message)).toEqual([expect.stringMatching(/lies inside the solid/)]);
  });

  it("the built-in catalogs' behaviours and portable flags are consistent", () => {
    const content = new URL("../../../content/", import.meta.url);
    const read = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, content), "utf8"));
    const catalogs = ["materials", "core-furniture", "core-clinical", "core-diagnostics"].map((id) => {
      const r = parseCatalog(read(`catalogs/${id}.json`));
      if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.issues)}`);
      return r.value;
    });
    expect(checkCatalogs(catalogs)).toEqual([]);
    const equipment = mergeCatalogs(catalogs).equipment;
    const ecg = equipment.get("ecg-machine")!;
    expect(ecg.portable).toBe("cart");
    expect(ecg.behavior?.initial).toBe("idle");
    expect(Object.keys(ecg.behavior!.operations)).toEqual(["prepare", "connect", "record", "reset"]);
    expect(ecg.behavior!.operations.record.clinical).toEqual({ tool: "order_test", select: "capability" });
    const monitor = equipment.get("patient-monitor")!;
    expect(monitor.behavior).toMatchObject({ derived: "monitor-attachment", initial: "detached" });
    expect(monitor.behavior!.operations.attach.clinical).toEqual({ tool: "intervene", select: "monitoring" });
    expect(Object.keys(monitor.behavior!.operations)).toEqual(["attach", "read", "cycle_nibp"]);
    for (const id of ["defibrillator", "crash-cart", "pocus-cart", "ultrasound-machine", "glucometer-station", "oxygen-cylinder"]) expect(equipment.get(id)?.portable).toBe("cart");
    // nothing wall-mounted or fixed became portable
    for (const e of equipment.values()) if (e.portable) expect(e.solid && !e.tags.includes("wall")).toBe(true);
  });
});
