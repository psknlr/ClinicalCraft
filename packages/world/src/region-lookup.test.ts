/**
 * THE room and region lookups (`roomLookup`, `regionLookup`): the pure functions the registry, the locator's region
 * names (`WorldRuntime.regionName`) and the web's HUD share — so the place beside the map and the in-world badge are
 * one lookup (audit 2026-11-12 P2-15). Edges inclusive, the first listed room on a tie (the CT / MRI wall), a
 * building's corridor between rooms, the outdoor region outside, the level's own rooms upstairs.
 */
import { describe, expect, it } from "vitest";
import { buildingLevels, defaultLevelId, rectContains } from "@clinicalcraft/core";
import { regionLookup } from "./locate.js";
import { roomLookup } from "./registry.js";
import { loadFacility } from "./__fixtures__/content.js";
import { makeWorld } from "./__fixtures__/world.js";

describe("the world's room and region lookups", () => {
  const gh = loadFacility("general-hospital");
  const L0 = defaultLevelId(gh);
  const region = regionLookup(gh);

  it("the CT / MRI boundary (x = 26): the CT suite up to the wall's line, the first listed on the line, the MRI suite past it", () => {
    expect(region({ level: L0, x: 25.99, z: -36 }, "en")).toEqual({ room: "rad-ct", name: "CT Suite" });
    expect(region({ level: L0, x: 26, z: -36 }, "en")).toEqual({ room: "rad-ct", name: "CT Suite" });
    expect(region({ level: L0, x: 26.003, z: -36 }, "en")).toEqual({ room: "rad-mri", name: "MRI Suite" });
    expect(region({ level: L0, x: 26.1, z: -34.2 }, "zh-CN")).toEqual({ room: "rad-mri", name: "磁共振室" });
  });

  it("a building's corridor between rooms, the outdoor region outside", () => {
    // the general hospital's building is all rooms: a clinic with one room and space around it
    const clinic = {
      levels: [],
      rooms: [{ id: "consult", kind: "consult", name: { "zh-CN": "诊室", en: "Consulting room" }, rect: { x: 0, z: 0, w: 4, d: 4 } }],
      buildings: [{ id: "clinic", name: { "zh-CN": "社区诊所", en: "Community Clinic" }, rect: { x: 0, z: 0, w: 20, d: 12 } }],
      outdoorRegion: { "zh-CN": "疗愈花园", en: "Healing Garden" },
    } as never;
    const lookup = regionLookup(clinic);
    const level = defaultLevelId(clinic);
    expect(lookup({ level, x: 1, z: 1 }, "en")).toEqual({ room: "consult", name: "Consulting room" });
    expect(lookup({ level, x: 7, z: 1 }, "en")).toEqual({ room: null, name: "a corridor of Community Clinic" });
    expect(lookup({ level, x: 7, z: 1 }, "zh-CN")).toEqual({ room: null, name: "社区诊所走廊" });
    expect(lookup({ level, x: 30, z: 1 }, "en")).toEqual({ room: null, name: "Healing Garden" });
    const main = gh.buildings[0]!;
    expect(region({ level: L0, x: main.rect.x, z: main.rect.z + main.rect.d / 2 + 30 }, "en")).toEqual({ room: null, name: "Healing Garden" });
  });

  it("is the runtime's own: `regionName` and `roomAt` agree with it at every sampled point, in both languages", () => {
    const w = makeWorld("pulmonary-embolism-postop");
    const b = gh.bounds;
    let n = 0;
    for (let x = b.minX; x <= b.maxX; x += 1.7)
      for (let z = b.minZ; z <= b.maxZ; z += 1.3) {
        const at = { level: L0, x, z };
        for (const locale of ["en", "zh-CN"]) expect(w.runtime.regionName(at, locale), `${x}, ${z}`).toBe(region(at, locale).name);
        expect(w.runtime.roomAt(at)).toBe(region(at, "en").room);
        n++;
      }
    expect(n).toBeGreaterThan(1000);
  });

  it("teaching hospital: the same x / z names the room of the level asked", () => {
    const th = loadFacility("teaching-hospital");
    const lookup = regionLookup(th);
    expect(lookup({ level: "L0", x: -20, z: -6 }, "en").room).toBe("ct");
    expect(lookup({ level: "L1", x: -20, z: -6 }, "en").room).toBe("theatre");
    // a building spanning both levels: its corridor on either
    const building = th.buildings.find((x) => buildingLevels(th, x).length > 1);
    if (building) {
      const roomAt = roomLookup(th);
      for (const level of buildingLevels(th, building)) {
        let gap: { x: number; z: number } | null = null;
        for (let x = building.rect.x - building.rect.w / 2 + 0.25; x < building.rect.x + building.rect.w / 2 && !gap; x += 0.5)
          for (let z = building.rect.z - building.rect.d / 2 + 0.25; z < building.rect.z + building.rect.d / 2 && !gap; z += 0.5)
            if (rectContains(building.rect, x, z) && !roomAt(level, x, z)) gap = { x, z };
        if (gap) expect(lookup({ level, ...gap }, "en").room).toBeNull();
      }
    }
  });
});
