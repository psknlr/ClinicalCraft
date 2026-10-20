/**
 * Settings of embodied mode: `embodiment` (default clinical) and
 * `perception` overrides — validated, merged by precedence like other keys.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings, mergeSettingsDetailed } from "./merge.js";

describe("embodiment / perception settings", () => {
  it("default to clinical mode and the world's perception defaults", () => {
    expect(DEFAULT_SETTINGS.embodiment).toBe("clinical");
    expect(DEFAULT_SETTINGS.perception).toEqual({});
  });

  it("merge by precedence (a flag layer wins) and keep perception overrides", () => {
    const s = mergeSettings([
      { source: "user", settings: { embodiment: "embodied", perception: { visibilityRange: 20 } } },
      { source: "flag", settings: { perception: { fovDeg: 90 } } },
    ]);
    expect(s.embodiment).toBe("embodied");
    expect(s.perception).toMatchObject({ fovDeg: 90 });
    expect(mergeSettings([{ source: "user", settings: { embodiment: "embodied" } }, { source: "flag", settings: { embodiment: "clinical" } }]).embodiment).toBe("clinical");
  });

  it("rejects unknown modes and malformed perception (reported, not applied)", () => {
    const r = mergeSettingsDetailed([{ source: "user", settings: { embodiment: "virtual", perception: { fovDeg: -5, unknown: 1 } } }]);
    expect(r.settings.embodiment).toBe("clinical");
    expect(r.issues.map((i) => i.path).join(" ")).toMatch(/embodiment/);
    expect(r.issues.map((i) => i.path).join(" ")).toMatch(/perception/);
  });
});
