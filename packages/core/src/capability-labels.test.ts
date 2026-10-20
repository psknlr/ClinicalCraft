/**
 * Display labels of the capability vocabulary: learners and models read
 * "临床生化" / "clinical chemistry", never the id `lab-chemistry` — one
 * bilingual table for every message that names a capability.
 */
import { describe, expect, it } from "vitest";
import { CAPABILITIES, CAPABILITY_LABELS, capabilityLabel, capabilityLabels } from "./index.js";

describe("capability display labels", () => {
  it("cover the whole CAPABILITIES vocabulary in zh-CN and en, never the bare id", () => {
    for (const id of Object.keys(CAPABILITIES)) {
      const label = CAPABILITY_LABELS[id];
      expect(label, id).toBeDefined();
      expect(label!["zh-CN"].trim(), id).not.toBe("");
      expect(label!.en.trim(), id).not.toBe("");
      // an English word may be its own label ("oxygen", "ultrasound"); a hyphenated id never is
      if (id.includes("-")) expect(label!.en, id).not.toBe(id);
      expect(label!["zh-CN"], id).not.toBe(id);
      // Chinese labels are Chinese (a CJK character; Latin acronyms such as CT may accompany it)
      expect(/[一-鿿]/.test(label!["zh-CN"]), `${id}: ${label!["zh-CN"]}`).toBe(true);
    }
    expect(Object.keys(CAPABILITY_LABELS).sort()).toEqual(Object.keys(CAPABILITIES).sort());
  });

  it("resolve per locale; a non-canonical capability keeps its id", () => {
    expect(capabilityLabel("lab-chemistry", "en")).toBe("clinical chemistry");
    expect(capabilityLabel("lab-chemistry", "zh-CN")).toBe("临床生化");
    expect(capabilityLabel("records", "en")).toBe("an electronic health record terminal");
    expect(capabilityLabel("records", "zh-CN")).toBe("电子病历终端");
    expect(capabilityLabel("zh-only-thing", "en")).toBe("zh-only-thing");
    expect(capabilityLabels(["ecg-12lead", "oxygen"], "en")).toEqual(["a 12-lead ECG", "oxygen"]);
    expect(capabilityLabels(["ecg-12lead", "oxygen"], "zh")).toEqual(["十二导联心电图", "氧气"]);
  });
});
