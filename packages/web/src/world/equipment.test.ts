import { describe, expect, it } from "vitest";
import { labelColor, surfaceTop } from "./equipment.js";

type Part = { m: string; p: [number, number, number]; s: [number, number, number]; name?: string };
const t = (parts: Part[]) => ({ parts }) as never;

describe("surfaceTop (patient on a bed / seat)", () => {
  it("uses the mattress, not the pillow lying on it (hospital bed)", () => {
    const bed = t([
      { m: "plastic", p: [0, 0.24, 0], s: [0.84, 0.12, 1.9] },
      { m: "mattress", p: [0, 0.56, 0], s: [0.88, 0.12, 1.92] },
      { m: "white", p: [0, 0.67, -0.77], s: [0.6, 0.1, 0.3] },
      { m: "plastic", p: [0, 0.625, -1.05], s: [0.96, 0.65, 0.1] },
    ]);
    expect(surfaceTop(bed)).toBeCloseTo(0.62);
  });
  it("counts segmented pads together (operating table)", () => {
    const table = t([
      { m: "steel", p: [0, 0.75, 0], s: [0.65, 0.06, 1.6] },
      { m: "navy", p: [0, 0.83, -0.6], s: [0.5, 0.06, 0.73] },
      { m: "navy", p: [0, 0.83, 0.2], s: [0.5, 0.06, 0.56] },
      { m: "navy", p: [0, 0.83, 0.75], s: [0.5, 0.06, 0.4] },
    ]);
    expect(surfaceTop(table)).toBeCloseTo(0.86);
  });
  it("prefers a part named mattress/seat and falls back to 0.9", () => {
    expect(surfaceTop(t([{ m: "x", p: [0, 0.45, 0], s: [0.4, 0.1, 0.4], name: "seat" }, { m: "x", p: [0, 0.9, 0], s: [1, 0.1, 1] }]))).toBeCloseTo(0.5);
    expect(surfaceTop(undefined)).toBe(0.9);
    expect(surfaceTop(t([{ m: "x", p: [0, 1, 0], s: [0.1, 2, 0.1] }]))).toBe(0.9);
  });
});

describe("station label colours", () => {
  it("follows V4 station colours by kind / capability family", () => {
    expect(labelColor("board", [])).toBe("#716541");
    expect(labelColor("workstation", ["lab-hematology"])).toBe("#f2c978");
    expect(labelColor("workstation", ["histopathology"])).toBe("#c7a1e5");
    expect(labelColor("workstation", ["ct"])).toBe("#79c9e6");
  });
});
