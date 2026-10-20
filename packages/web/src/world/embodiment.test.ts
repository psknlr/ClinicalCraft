import { describe, expect, it } from "vitest";
import { frameSize, MAX_FRAME_WIDTH } from "./capture.js";
import { connectorIdOf, normAngle, polylineLength, rigRotationOf, stepTowards, worldRouteLegs, yawOfRig, yawTowards, type ConnectorKindOf } from "./embodiment.js";

const kinds: ConnectorKindOf = (id) => (id === "lift-a" ? "elevator" : id === "stair-w" ? "stairs" : id === "ramp-e" ? "ramp" : null);

describe("world-model routes → renderer legs", () => {
  it("walks the points of a route on one level as one final path leg", () => {
    const legs = worldRouteLegs(
      [
        { x: 1, z: 2, level: "L0" },
        { x: 3, z: 2, level: "L0" },
      ],
      "L0",
      kinds,
    );
    expect(legs).toEqual([
      {
        kind: "path",
        level: "L0",
        points: [
          { x: 1, z: 2 },
          { x: 3, z: 2 },
        ],
        final: true,
      },
    ]);
  });

  it("climbs a flight straight from the point before the stairs, then walks on", () => {
    const legs = worldRouteLegs(
      [
        { x: 0, z: 0, level: "L0" },
        { x: 4, z: 0, level: "L0" },
        { x: 4, z: 6, level: "L1", via: "connector:stair-w" },
        { x: 8, z: 6, level: "L1" },
      ],
      "L0",
      kinds,
    );
    expect(legs.map((l) => l.kind)).toEqual(["path", "flight", "path"]);
    expect(legs[1]).toEqual({
      kind: "flight",
      level: "L1",
      path: [
        { x: 4, z: 0 },
        { x: 4, z: 6 },
      ],
    });
    expect(legs[0]).toMatchObject({ final: false });
    expect(legs[2]).toMatchObject({ level: "L1", final: true, points: [{ x: 8, z: 6 }] });
  });

  it("rides an elevator and steps out at the arrival stop", () => {
    const legs = worldRouteLegs(
      [
        { x: 2, z: 2, level: "L0" },
        { x: 2, z: 2, level: "L1", via: "connector:lift-a" },
        { x: 5, z: 2, level: "L1" },
      ],
      "L0",
      kinds,
    );
    expect(legs).toEqual([
      { kind: "path", level: "L0", points: [{ x: 2, z: 2 }], final: false },
      { kind: "ride", connectorId: "lift-a", level: "L1" },
      {
        kind: "path",
        level: "L1",
        points: [
          { x: 2, z: 2 },
          { x: 5, z: 2 },
        ],
        final: true,
      },
    ]);
  });

  it("starts a flight where the body stands when the route begins on the stairs", () => {
    const legs = worldRouteLegs([{ x: 4, z: 6, level: "L1", via: "connector:ramp-e" }], "L0", kinds);
    expect(legs).toEqual([{ kind: "flight", level: "L1", path: [{ x: 4, z: 6 }] }]);
  });

  it("returns no legs for an empty route (already there)", () => {
    expect(worldRouteLegs([], "L0", kinds)).toEqual([]);
  });
});

describe("embodiment arithmetic", () => {
  it("converts between world yaw and voxel rig rotation", () => {
    for (const yaw of [0, 0.5, -1.2, Math.PI / 2, 3]) {
      expect(normAngle(yawOfRig(rigRotationOf(yaw)) - yaw)).toBeCloseTo(0, 9);
    }
    // a rig rotated by 0 faces +Z: the world yaw looking towards +Z is π
    expect(Math.abs(yawOfRig(0))).toBeCloseTo(Math.PI, 9);
    expect(yawTowards(0, 0, 0, -5)).toBeCloseTo(0, 9);
    expect(yawTowards(0, 0, 5, 0)).toBeCloseTo(-Math.PI / 2, 9);
  });

  it("steps towards a point and reports what is left over", () => {
    const s = stepTowards(0, 0, { x: 3, z: 4 }, 2);
    expect(s.x).toBeCloseTo(1.2, 9);
    expect(s.z).toBeCloseTo(1.6, 9);
    expect([s.reached, s.rest]).toEqual([false, 0]);
    expect(stepTowards(0, 0, { x: 3, z: 4 }, 7)).toEqual({ x: 3, z: 4, reached: true, rest: 2 });
    expect(polylineLength(0, 0, [{ x: 3, z: 4 }, { x: 3, z: 10 }])).toBe(11);
    expect(connectorIdOf("connector:lift-a")).toBe("lift-a");
    expect(connectorIdOf("lift-a")).toBe("lift-a");
  });

  it("caps camera frames at 768 px and never upscales", () => {
    expect(frameSize(1280, 760, 768)).toEqual({ width: 768, height: 456 });
    expect(frameSize(1280, 760, 4096)).toEqual({ width: MAX_FRAME_WIDTH, height: 456 });
    expect(frameSize(390, 844, 768)).toEqual({ width: 390, height: 844 });
    expect(frameSize(1280, 760, 320)).toEqual({ width: 320, height: 190 });
    expect(frameSize(1280, 760, NaN).width).toBe(768);
  });
});
