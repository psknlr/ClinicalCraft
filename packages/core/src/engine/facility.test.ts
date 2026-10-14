import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EquipmentCatalog, FacilityDefinition } from "../schema/facility.js";
import {
  assignPatientSlot,
  checkCatalogs,
  checkFacility,
  facilityCapabilities,
  mergeCatalogs,
  parseCatalog,
  parseFacility,
  placementBox,
  placementCapabilities,
  regionAt,
  resolveWaypoint,
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
