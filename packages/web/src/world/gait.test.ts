import { describe, expect, it } from "vitest";
import { WalkingGait } from "./gait.js";

describe("first-person gait", () => {
  it("places footfalls by distance at the same count and phase across frame rates", () => {
    function walk(hz: number) {
      const gait = new WalkingGait();
      let contacts = 0;
      for (let i = 0; i < 3 * hz; i++) if (gait.update(3.9 / hz, 1 / hz, true, false, false)) contacts++;
      return { contacts, bob: gait.headOffset };
    }
    expect(walk(20).contacts).toBe(walk(144).contacts);
    expect(walk(20).contacts).toBeGreaterThan(5);
    expect(walk(20).bob).toBeCloseTo(walk(144).bob);
  });

  it("settles the head and hand at rest; pushing into a wall and moving in the air make no footsteps", () => {
    const gait = new WalkingGait();
    for (let i = 0; i < 20; i++) gait.update(0.03, 1 / 60, true, false, true);
    for (let i = 0; i < 60; i++) expect(gait.update(0, 1 / 60, true, false, false)).toBe(false);
    expect(Math.abs(gait.headOffset)).toBeLessThan(0.00001);
    expect(Math.abs(gait.handOffset)).toBeLessThan(0.00001);
    for (let i = 0; i < 60; i++) expect(gait.update(0.1, 1 / 60, false, false, false)).toBe(false);
  });
});
