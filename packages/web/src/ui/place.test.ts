/**
 * The place beside the map and the in-world badge are one lookup (audit 2026-11-12 P2-15): after the PE patient's bed
 * transport the map read "CT Suite" while the badge read "In-world · MRI Suite" — two lookups of two positions,
 * refreshed by two paths. Now both texts come from the one place the renderer reports (the world's region lookup at
 * the avatar's position), and a body moved while a window is open is reported too.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { compileFacility, parseFacility, type FacilityDefinition } from "@clinicalcraft/core";
import { regionLookup } from "@clinicalcraft/world";
import { setLocale } from "../i18n/index.js";
import { movedSince } from "../world/frame-loop.js";
import { placeAt } from "../world/region.js";
import { placeTexts } from "./place.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.resolve(here, "../../../content/facilities/general-hospital.json"), "utf8"));
const parsed = parseFacility(raw);
if (!parsed.ok) throw new Error("general-hospital does not parse");
const compiled = compileFacility(parsed.value, []);
if (!compiled.ok) throw new Error("general-hospital does not compile");
const gh: FacilityDefinition = compiled.facility;

afterEach(() => setLocale("zh-CN"));

describe("one place for the map's label and the badge", () => {
  it("at the CT / MRI wall (x = 26, the audit's spot x = 26.1): both texts name the same room, in both languages", () => {
    for (const [locale, ct, mri] of [
      ["en", "CT Suite", "MRI Suite"],
      ["zh-CN", "CT 室", "磁共振室"],
    ] as const) {
      setLocale(locale);
      for (const [x, z, room] of [
        [25.998, -36, ct],
        [26, -36, ct],
        [26.003, -36, mri],
        [26.1, -34.2, mri],
      ] as const) {
        const where = placeAt(gh, x, z, locale);
        expect(where.name, `${x}`).toBe(room);
        const t = placeTexts({ region: where.name }, { walking: false });
        expect(t.region).toBe(room);
        expect(t.badge).toContain(room);
      }
    }
  });

  it("the HUD's lookup is the world's (the one `WorldRuntime.regionName` uses)", () => {
    const world = regionLookup(gh);
    const b = gh.bounds;
    for (let x = b.minX; x <= b.maxX; x += 2.3)
      for (let z = b.minZ; z <= b.maxZ; z += 1.9) {
        const w = world({ level: "L0", x, z }, "en");
        expect(placeAt(gh, x, z, "en")).toEqual({ name: w.name, roomId: w.room });
      }
  });

  it("the badge: the same place in-world, 'walking…' while the world moves the body, its own words in clinical mode", () => {
    setLocale("en");
    expect(placeTexts({ region: "MRI Suite" }, { walking: false })).toEqual({ region: "MRI Suite", badge: "In-world · MRI Suite" });
    expect(placeTexts({ region: "Theatre", levelName: "First floor" }, { walking: false })).toEqual({ region: "Theatre · First floor", badge: "In-world · Theatre" });
    expect(placeTexts({ region: "MRI Suite" }, { walking: true }).badge).toBe("In-world · walking…");
    expect(placeTexts({ region: "MRI Suite" }, null).region).toBe("MRI Suite");
    expect(placeTexts({ region: "MRI Suite" }, null).badge).not.toContain("MRI");
  });

  it("a body moved while nobody plays is reported (a reposition, a walk settling on its spot); one standing still is not", () => {
    expect(movedSince(null, { x: 0, z: 0, y: 0 })).toBe(true);
    expect(movedSince({ x: 25.998, z: -36, y: 0 }, { x: 25.998, z: -36, y: 0 })).toBe(false);
    expect(movedSince({ x: 25.998, z: -36, y: 0 }, { x: 26.003, z: -36, y: 0 })).toBe(true);
    expect(movedSince({ x: 1, z: 2, y: 0 }, { x: 1, z: 2, y: 4.5 })).toBe(true);
  });
});
