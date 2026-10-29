/**
 * The trail people walk behind a walker (EMBODIED §8.4): a distance along the walker's own path — round a corner,
 * never across it — the start when the trail is shorter, a fresh start after a jump or on another floor.
 */
import { describe, expect, it } from "vitest";
import { Trail } from "./trail.js";

describe("Trail", () => {
  it("keeps a distance along the path walked, round a corner (never cutting it)", () => {
    const t = new Trail([{ x: 0, z: 0, level: "L0" }]);
    for (let i = 1; i <= 20; i++) t.push(i * 0.1, 0, "L0"); // east 2 m
    for (let i = 1; i <= 20; i++) t.push(2, -i * 0.1, "L0"); // then north 2 m (−Z)
    const behind = t.at(1)!;
    // 1 m back along the path: on the northbound leg, 1 m north of the corner
    expect(behind.x).toBeCloseTo(2, 5);
    expect(behind.z).toBeCloseTo(-1, 5);
    // facing the way walked there (north: yaw 0)
    expect(behind.yaw).toBeCloseTo(0, 5);
    const further = t.at(2.5)!;
    // past the corner: on the eastbound leg, 0.5 m before it
    expect(further.x).toBeCloseTo(1.5, 5);
    expect(further.z).toBeCloseTo(0, 5);
    expect(Math.abs(further.yaw!)).toBeCloseTo(Math.PI / 2, 5);
  });

  it("a trail shorter than the distance: its start (where the follower stood)", () => {
    const t = new Trail([
      { x: 5, z: 5, level: "L0" },
      { x: 5.4, z: 5, level: "L0" },
    ]);
    expect(t.at(1.05)).toMatchObject({ x: 5, z: 5, level: "L0" });
  });

  it("a jump or another floor starts afresh behind the walker — never on top of it", () => {
    const t = new Trail([{ x: 0, z: 0, level: "L0" }]);
    t.push(0.5, 0, "L0");
    // teleported 20 m east, facing north (yaw 0, towards −Z): followers 1 m behind it, to the south
    t.push(20, 0, "L0", 0);
    expect(t.at(1)).toMatchObject({ x: expect.closeTo(20, 5), z: expect.closeTo(1, 5) });
    t.push(20, 0.1, "L1", Math.PI / 2);
    expect(t.head).toEqual({ x: 20, z: 0.1, level: "L1" });
    // facing west (yaw π/2): behind is east
    expect(t.at(1)).toMatchObject({ x: expect.closeTo(21, 5), level: "L1" });
  });

  it("standing still adds nothing; tiny steps do not pile points up", () => {
    const t = new Trail([{ x: 0, z: 0, level: "L0" }]);
    for (let i = 0; i < 1000; i++) t.push(0, 0, "L0");
    for (let i = 1; i <= 100; i++) t.push(i * 0.01, 0, "L0");
    expect(t.at(0.5)!.x).toBeCloseTo(0.5, 1);
    expect(t.head).toMatchObject({ x: 1 });
  });
});
