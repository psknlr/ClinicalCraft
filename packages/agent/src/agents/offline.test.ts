import { createSession as createEngineState, reduce, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase } from "../__fixtures__/harness.js";
import { specialistOffline } from "./offline.js";

describe("the offline anaesthetist", () => {
  it("reads no value off the monitor in a cardiac arrest: the placeholder 0 is no measurement", () => {
    const c = loadMiniCase((input) => {
      (input.physiology as { baseline: Record<string, unknown> }).baseline.rhythm = "ventricular-fibrillation";
    });
    let s: SessionState = createEngineState(c);
    s = reduce(c, s, { type: "start", by: "learner" } as ClinicalAction).state;
    const voice = { staffId: "or-7.anaesthetist", name: "Dr Tanaka (anaesthesia)" };
    const en = specialistOffline({ caseDef: c, locale: "en", state: () => s }, voice);
    expect(en).not.toMatch(/HR 0\b|BP 0\/0|SpO₂ 0\b/);
    expect(en).toContain("no reading");
    expect(specialistOffline({ caseDef: c, locale: "zh-CN", state: () => s }, voice)).toContain("测不出");
  });
});
