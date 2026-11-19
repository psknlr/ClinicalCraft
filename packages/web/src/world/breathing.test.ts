import { describe, expect, it } from "vitest";
import type { VitalsSnapshot } from "@clinicalcraft/core";
import { breathingRate, PatientBreathing } from "./breathing.js";

const reading: VitalsSnapshot = { minute: 3, vitals: { rr: 24 }, trend: {}, alarms: [] };

describe("the patient's respiratory movement", () => {
  it("takes only a current reading, including a measured zero", () => {
    expect(breathingRate(reading)).toBe(24);
    expect(breathingRate({ ...reading, vitals: { rr: 0 } })).toBe(0);
    for (const extra of [{ baselineOnly: true }, { spotChecks: ["rr"] as const }, { monitorAttached: false }, { vitals: {} }, { vitals: { rr: NaN } }]) {
      expect(breathingRate({ ...reading, ...extra } as VitalsSnapshot)).toBeNull();
    }
  });

  it("uses the same cycle at different frame rates and preserves phase when the reading changes", () => {
    for (const fps of [8, 30, 120]) {
      const breath = new PatientBreathing(0);
      breath.rate = 20; // One second to inspire, two seconds to expire.
      for (let i = 0; i < fps; i++) breath.step(1 / fps);
      expect(breath.step(0)).toBeCloseTo(0.028, 8);
      breath.rate = 40;
      expect(breath.step(0)).toBeCloseTo(0.028, 8);
      for (let i = 0; i < fps; i++) breath.step(1 / fps);
      expect(breath.step(0)).toBeCloseTo(0, 8);
      breath.rate = 0;
      expect(breath.step(2)).toBe(0);
      breath.rate = null;
      expect(breath.step(2)).toBeNull();
    }
  });
});
