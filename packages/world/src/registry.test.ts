import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_REACH, parseCase, placementCapabilities, t, type CaseDefinition } from "@clinicalcraft/core";
import { buildCollisionModel } from "./collision.js";
import { RANGES } from "./contracts.js";
import { buildRegistry } from "./registry.js";
import { facilityFrom, loadCatalogs, loadFacility } from "./__fixtures__/content.js";
import { twoLevelInput } from "./__fixtures__/two-level.js";

const catalogs = loadCatalogs();
const loadCase = (id: string): CaseDefinition => {
  const r = parseCase(JSON.parse(readFileSync(new URL(`../../content/cases/${id}/case.json`, import.meta.url), "utf8")));
  if (!r.ok) throw new Error(id);
  return r.value;
};

const BINDINGS = {
  "clinic-v4": { caseId: "smzl-lung-adeno", slotId: "consult-1" },
  "general-hospital": { caseId: "stemi-inferior-rv", slotId: "resus-1" },
} as const;

function registryOf(id: keyof typeof BINDINGS, locale = "en") {
  const f = loadFacility(id);
  const caseDef = loadCase(BINDINGS[id].caseId);
  const binding = { caseDef, slotId: BINDINGS[id].slotId, locale };
  return { f, caseDef, registry: buildRegistry(f, catalogs, binding, buildCollisionModel(f, catalogs, {})) };
}

describe("semantic registry ids (EMBODIED §3)", () => {
  for (const id of ["clinic-v4", "general-hospital"] as const) {
    it(`${id}: every entity has a unique, kind-prefixed id`, () => {
      const { f, registry } = registryOf(id);
      const ids = registry.entities.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
      const prefix: Record<string, string> = { equipment: "eq", patient: "patient", staff: "staff", room: "room", door: "door", level: "level", connector: "connector" };
      for (const e of registry.entities) expect(e.id.startsWith(`${prefix[e.kind]}:`), e.id).toBe(true);
      expect(registry.ofKind("equipment")).toHaveLength(f.placements.length);
      expect(registry.ofKind("room")).toHaveLength(f.rooms.length);
      expect(registry.ofKind("staff")).toHaveLength(f.staff.length);
      expect(registry.ofKind("patient")).toHaveLength(1);
      expect(registry.ofKind("level").map((e) => e.id)).toEqual(["level:L0"]);
      for (const e of registry.entities) {
        expect(e.level).toBe("L0");
        expect(t(e.name, "en"), e.id).not.toBe("");
        expect(t(e.name, "zh-CN"), e.id).not.toBe("");
      }
    });
  }

  it("door entities use the renderer's door record ids", () => {
    const { registry } = registryOf("clinic-v4");
    expect(registry.ofKind("door").map((d) => d.id)).toEqual(["door:clinic:s:0"]);
    expect(registry.entity("door:clinic:s:0")).toMatchObject({ type: "double-door", interaction: "door", room: "corridor", position: { x: 0, y: 0, z: 8 } });
  });
});

describe("equipment entities", () => {
  const { f, registry } = registryOf("general-hospital");

  it("carry type, room, capabilities, interaction, reach, portability and the rotated footprint", () => {
    const ecg = registry.entity("eq:resus1-ecg")!;
    expect(ecg).toMatchObject({ kind: "equipment", type: "ecg-machine", room: "ed-resus", interaction: "device", portable: "cart", reach: DEFAULT_REACH.device, rot: 90 });
    // 0.6 × 0.55 footprint turned by 90°
    expect(ecg.footprint).toEqual({ w: 0.55, d: 0.6, h: 1.3 });
    expect(ecg.capabilities).toEqual(["ecg-12lead"]);
    expect(ecg.equipmentType?.behavior?.initial).toBe("idle");
    const lab = registry.entity("eq:lab-workstation")!;
    expect(lab.capabilities).toEqual(placementCapabilities(f, catalogs, "lab-workstation"));
    expect(lab).toMatchObject({ interaction: "workstation", reach: DEFAULT_REACH.workstation });
    expect(registry.entity("eq:resus1-oxygen")!.reach).toBe(2.2); // catalog reach: reached over the bed head
    expect(registry.entity("eq:resus1-monitor")).toMatchObject({ interaction: "monitor", reach: DEFAULT_REACH.monitor });
    expect(registry.entity("eq:resus1-monitor")!.portable).toBeUndefined();
    for (const e of registry.ofKind("equipment")) expect(e.reach, e.id).toBeGreaterThan(0);
  });

  it("finds the room by containment when the placement declares none", () => {
    const clinic = registryOf("clinic-v4").registry;
    // the entrance plants stand outdoors (no room); the sanitizer declares the corridor
    expect(clinic.entity("eq:entrance-plant-west")!.room).toBeNull();
    expect(clinic.entity("eq:entrance-sanitizer")!.room).toBe("corridor");
    const undeclared = f.placements.filter((p) => !p.room);
    for (const p of undeclared) expect(registry.entity(`eq:${p.id}`)!.room).toBe(registry.roomAt("L0", p.x, p.z));
  });
});

describe("people", () => {
  it("the patient's public descriptor is the name tag, age/sex and posture — nothing else from the case", () => {
    const { caseDef, registry } = registryOf("general-hospital");
    const patient = registry.entity("patient:resus-1")!;
    expect(patient).toMatchObject({ kind: "patient", type: "patient", room: "ed-resus", interaction: "talk", reach: RANGES.contact });
    expect(Object.keys(patient.public!).sort()).toEqual(["name", "posture", "tag"]);
    expect(patient.public).toEqual({ name: "Liu Zhenhua (pseudonym)", tag: "58 years male", posture: "lying" });
    // lying on the resus bed: centred on it, spanning it
    expect(patient.position).toMatchObject({ x: 31, z: -17.325 });
    expect(patient.footprint).toEqual({ w: 1, d: 2.2, h: 1.02 });
    // no case facts anywhere in the entity (complaint, triage note, card tags, history answers, diagnosis)
    const text = JSON.stringify(patient);
    const facts = [caseDef.patient.chiefComplaint, caseDef.patient.triageNote, ...caseDef.patient.tags, ...caseDef.history.slice(0, 5).map((h) => h.answer)].flatMap((x) => (x == null ? [] : typeof x === "string" ? [x] : Object.values(x)));
    expect(facts.length).toBeGreaterThan(3);
    for (const fact of facts) if (fact.length > 3) expect(text, fact).not.toContain(fact);
    expect(text).not.toMatch(/STEMI|infarct|心梗|梗死/i);
    // localized
    const zh = registryOf("general-hospital", "zh-CN").registry.entity("patient:resus-1")!;
    expect(zh.public).toEqual({ name: "刘振华（化名）", tag: "58岁男性", posture: "lying" });
  });

  it("a standing outpatient stands at the slot; staff expose role and name", () => {
    const { registry } = registryOf("clinic-v4");
    expect(registry.entity("patient:consult-1")).toMatchObject({ position: { x: -8, y: 0, z: 3.2 }, footprint: { w: 0.85, d: 0.6, h: 1.88 }, public: { posture: "standing" } });
    const hospital = registryOf("general-hospital").registry;
    expect(hospital.entity("staff:ed-nurse")).toMatchObject({ kind: "staff", type: "nurse", room: "ed-station", interaction: "talk", public: { role: "Nurse", name: expect.any(String) } });
    expect(Object.keys(hospital.entity("staff:ed-nurse")!.public!).sort()).toEqual(["name", "role"]);
  });

  it("no binding, no patient entity", () => {
    const f = loadFacility("general-hospital");
    expect(buildRegistry(f, catalogs, null, buildCollisionModel(f, catalogs, {})).ofKind("patient")).toEqual([]);
  });
});

describe("resolveId", () => {
  const { registry } = registryOf("general-hospital");

  it("accepts prefixed ids and unambiguous unprefixed ones", () => {
    expect(registry.resolveId("eq:resus1-ecg")).toBe("eq:resus1-ecg");
    expect(registry.resolveId("resus1-ecg")).toBe("eq:resus1-ecg");
    expect(registry.resolveId("ed-nurse")).toBe("staff:ed-nurse");
    expect(registry.resolveId("laboratory")).toBe("room:laboratory");
    expect(registry.resolveId("main:s:0")).toBe("door:main:s:0");
    expect(registry.resolveId("L0")).toBe("level:L0");
    expect(registry.resolveId("resus-1")).toBe("patient:resus-1");
    expect(registry.resolveId("patient")).toBe("patient:resus-1");
    expect(registry.resolveId("nope")).toBeNull();
  });

  it("refuses ambiguous aliases", () => {
    const clinic = registryOf("clinic-v4").registry;
    // "consult-1" is the bound slot only; "laboratory" is a room in both
    expect(clinic.resolveId("consult-1")).toBe("patient:consult-1");
    const f = loadFacility("general-hospital");
    const caseDef = loadCase("new-onset-t2dm");
    const bound = buildRegistry(f, catalogs, { caseDef, slotId: "consult-1", locale: "en" }, buildCollisionModel(f, catalogs, {}));
    // room "consult-1" and patient slot "consult-1"
    expect(bound.resolveId("consult-1")).toBeNull();
    expect(bound.resolveId("room:consult-1")).toBe("room:consult-1");
  });
});

describe("levels and connectors", () => {
  const f = facilityFrom(twoLevelInput());
  const registry = buildRegistry(f, catalogs, null, buildCollisionModel(f, catalogs, {}));

  it("levels, connectors and entities on the upper level (elevation applied to y)", () => {
    expect(registry.ofKind("level").map((l) => [l.id, l.position.y])).toEqual([
      ["level:L0", 0],
      ["level:L1", 4.5],
    ]);
    expect(registry.entity("connector:stairs")).toMatchObject({ type: "stairs", level: "L0", room: "hall", tags: expect.arrayContaining(["level:L0", "level:L1"]) });
    expect(registry.entity("connector:lift")!.tags).toContain("accessible");
    expect(registry.entity("eq:ward-ecg")).toMatchObject({ level: "L1", room: "ward", position: { x: -1.5, y: 4.5, z: -5 } });
    expect(registry.entity("staff:ward-nurse")).toMatchObject({ level: "L1", position: { y: 4.5 } });
    expect(registry.roomAt("L1", -4, 0)).toBe("ward");
    expect(registry.roomAt("L0", -4, 0)).toBe("hall");
    expect(registry.entity("door:block@L1:s:0")).toMatchObject({ level: "L1" });
    expect(new Set(registry.entities.map((e) => e.id)).size).toBe(registry.entities.length);
  });
});
