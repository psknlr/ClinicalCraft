/**
 * Multi-level world (EMBODIED R10), the parts that need no WebGL: levels and
 * level-aware culling rules, region naming per level, elevator cars and the
 * autopilot's routes across levels — on the two-level teaching hospital
 * (compiled from room templates) and the single-level general hospital.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compileFacility, FacilitySchema, RoomTemplateSchema, type FacilityDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { inCar, type ElevatorStop } from "./elevator.js";
import { STAIRWELL_VIEW_RANGE, WorldLevels } from "./levels.js";
import { regionAt, roomAt } from "./region.js";
import { FLIGHT_APPROACH, flightEnds, routeLegs } from "./route.js";

const content = fileURLToPath(new URL("../../../content/", import.meta.url));
const templates = readdirSync(`${content}templates`)
  .filter((f) => f.endsWith(".json"))
  .map((f) => RoomTemplateSchema.parse(JSON.parse(readFileSync(`${content}templates/${f}`, "utf8"))));
function facility(id: string): FacilityDefinition {
  const raw = FacilitySchema.parse(JSON.parse(readFileSync(`${content}facilities/${id}.json`, "utf8")));
  const r = compileFacility(raw, templates);
  if (!r.ok) throw new Error(r.issues.map((i) => i.message).join("\n"));
  return r.facility;
}
const th = facility("teaching-hospital");
const gh = facility("general-hospital");

describe("WorldLevels", () => {
  const lv = new WorldLevels(th);
  it("lists the levels by elevation with the ground level first", () => {
    expect(lv.multi).toBe(true);
    expect(lv.list.map((l) => [l.id, l.elevation])).toEqual([
      ["L0", 0],
      ["L1", 4.5],
    ]);
    expect(lv.ground).toBe("L0");
    expect(lv.elevation("L1")).toBe(4.5);
    expect(lv.elevation("nope")).toBe(0);
    expect(lv.name("L1", "en")).toBe("First floor");
    expect(lv.name("L1", "zh-CN")).toBe("二层");
  });
  it("puts the avatar on the floor its feet are on (half-way up a flight is still the lower level)", () => {
    expect(lv.at(0)).toBe("L0");
    expect(lv.at(2.25)).toBe("L0");
    expect(lv.at(3.85)).toBe("L0");
    expect(lv.at(3.95)).toBe("L1");
    expect(lv.at(4.5)).toBe("L1");
  });
  it("indoors shows the camera's level only, plus the levels a nearby stairwell joins; outdoors every level", () => {
    const [stairs] = lv.flights;
    expect(stairs.connectorId).toBe("main-stairs");
    // the ICU (east wing) is far from the stairwell: the floor above / below is hidden
    expect(lv.visibleFrom("L1", "L0", 12, -6, true)).toBe(false);
    expect(lv.visibleFrom("L0", "L1", 12, -6, true)).toBe(false);
    expect(lv.visibleFrom("L1", "L1", 12, -6, true)).toBe(true);
    // in the lobby next to the stairs both are drawn
    expect(lv.visibleFrom("L1", "L0", -3, 8, true)).toBe(true);
    expect(lv.nearFlight(-5.6 + STAIRWELL_VIEW_RANGE + 1.5, 5, "L0")).toBe(false);
    // outdoors the upper storey is the building's facade
    expect(lv.visibleFrom("L1", "L0", 0, 20, false)).toBe(true);
  });
  it("is a no-op for a single-level facility", () => {
    const one = new WorldLevels(gh);
    expect(one.multi).toBe(false);
    expect(one.flights).toEqual([]);
    expect(one.at(12)).toBe(one.ground);
    expect(one.visibleFrom(one.ground, one.ground, 0, 0, true)).toBe(true);
  });
});

describe("regions per level", () => {
  it("names the room of the avatar's level at the same x/z", () => {
    // CT on the ground floor, the operating theatre above it
    expect(roomAt(th, -20, -6, "L0")?.id).toBe("ct");
    expect(roomAt(th, -20, -6, "L1")?.id).toBe("theatre");
    expect(regionAt(th, -20, -6, "en", "L1").roomId).toBe("theatre");
    // without a level: the smallest room at the point on any level (the single-level behaviour)
    expect(roomAt(th, 5.8, 3.2)?.kind).toBe("elevator");
  });
  it("is unchanged for a single-level facility", () => {
    const r = gh.rooms[0];
    expect(regionAt(gh, r.rect.x, r.rect.z, "en")).toEqual(regionAt(gh, r.rect.x, r.rect.z, "en", "L0"));
  });
});

describe("elevator cars", () => {
  it("a stop's car is its room: inside, minus the walls", () => {
    const room = th.rooms.find((r) => r.id === "lift-l1")!;
    const stop: ElevatorStop = { level: "L1", x: 5.8, z: 3.2, elevation: 4.5, room, door: null };
    expect(inCar(stop, 5.8, 3.2)).toBe(true);
    expect(inCar(stop, 6.8, 4.2)).toBe(true);
    expect(inCar(stop, 6.95, 3.2)).toBe(false); // in the east wall
    expect(inCar(stop, 4.5, 3.2)).toBe(false); // in the doorway / outside
    expect(inCar({ ...stop, room: null }, 6.5, 3.2)).toBe(true); // no car room: 1.2 m around the stop
  });
});

describe("autopilot routes across levels", () => {
  const lv = new WorldLevels(th);
  const lift = { id: "lift", stops: th.connectors.find((c) => c.id === "lift")!.stops.map((s) => ({ ...s, room: th.rooms.find((r) => r.kind === "elevator" && r.level === s.level) ?? null })) };
  const icuBed = { x: 7.75, z: -7.9 };
  it("same level: one final walk", () => {
    expect(routeLegs(lv.flights, [lift], "L0", "L0", { x: 0, z: 20 }, { x: -7, z: -6 })).toEqual([{ kind: "walk", level: "L0", goal: { x: -7, z: -6 }, final: true }]);
  });
  it("up: walk to the stairs' approach point, climb the flight to its exit point, walk to the goal", () => {
    const legs = routeLegs(lv.flights, [lift], "L0", "L1", { x: 0, z: 20 }, icuBed)!;
    const { approach, exit } = flightEnds(lv.flights[0], true);
    expect(approach.x).toBeCloseTo(-5.6);
    expect(approach.z).toBeCloseTo(8.3 + FLIGHT_APPROACH); // before the foot, on the ground floor
    expect(exit.z).toBeCloseTo(1.9 - FLIGHT_APPROACH); // beyond the head, on the first floor
    expect(legs).toEqual([
      { kind: "walk", level: "L0", goal: approach, final: false },
      { kind: "flight", level: "L1", path: [approach, exit] },
      { kind: "walk", level: "L1", goal: icuBed, final: true },
    ]);
  });
  it("down: the same flight the other way", () => {
    const legs = routeLegs(lv.flights, [lift], "L1", "L0", icuBed, { x: -7, z: -6 })!;
    const { approach, exit } = flightEnds(lv.flights[0], false);
    expect(approach.z).toBeCloseTo(1.9 - FLIGHT_APPROACH);
    expect(exit.z).toBeCloseTo(8.3 + FLIGHT_APPROACH);
    expect(legs.map((l) => l.kind)).toEqual(["walk", "flight", "walk"]);
    expect(legs[1]).toEqual({ kind: "flight", level: "L0", path: [approach, exit] });
  });
  it("without stairs it rides the elevator: walk into the car, ride, walk on", () => {
    const legs = routeLegs([], [lift], "L0", "L1", { x: 0, z: 20 }, icuBed);
    expect(legs).toEqual([
      { kind: "walk", level: "L0", goal: { x: 5.8, z: 3.2 }, final: false },
      { kind: "ride", connectorId: "lift", level: "L1" },
      { kind: "walk", level: "L1", goal: icuBed, final: true },
    ]);
  });
  it("an unconnected level cannot be reached", () => {
    expect(routeLegs([], [], "L0", "L1", { x: 0, z: 0 }, icuBed)).toBeNull();
    expect(routeLegs([], [{ ...lift, stops: lift.stops.map((s) => ({ ...s, room: null })) }], "L0", "L1", { x: 0, z: 0 }, icuBed)).toBeNull();
  });
});
