import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EquipmentCatalog, FacilityDefinition } from "../schema/facility.js";
import {
  assignPatientSlot,
  caseCapabilityGaps,
  checkCatalogs,
  checkFacility,
  facilityCapabilities,
  mergeCatalogs,
  parseCase,
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
