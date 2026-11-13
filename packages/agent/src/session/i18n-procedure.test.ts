/**
 * The operative field's runtime words (docs/PROCEDURE.md §3, §7): a label in both languages for every new step, the
 * signal of work off the camera's aim and the camera's unsafe acts; a sentence for every reason the field gives a
 * refusal (core `FIELD_REFUSALS`), with the same blanks in both languages; the assist port called a port's role, never
 * the assistant (docs/GLOSSARY.md).
 */
import { FIELD_REFUSALS, UnsafeCodeSchema } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { rt } from "./i18n.js";
import { PROCEDURE_EN, PROCEDURE_ZH, procedureLabel } from "./i18n-procedure.js";

const blanks = (text: string) => [...text.matchAll(/\{(\w+)\}/gu)].map((m) => m[1]).sort();

describe("the operative field's words", () => {
  it("name the new steps, the work off the camera's aim and the camera's unsafe acts in both languages", () => {
    for (const value of ["aim", "zoom", "pass", "off-view", "out-of-frame", "scope-withdrawn-in-bleeding"]) {
      expect(procedureLabel("en", value), value).not.toBe(value);
      expect(procedureLabel("zh-CN", value), value).not.toBe(value);
      expect(procedureLabel("zh-CN", value), value).not.toBe(procedureLabel("en", value));
    }
    expect(UnsafeCodeSchema.options).toEqual(expect.arrayContaining(["out-of-frame", "scope-withdrawn-in-bleeding"]));
  });

  it("say why a step was refused, for every reason, with the same blanks in both languages", () => {
    for (const key of FIELD_REFUSALS) {
      const k = `op.reason.${key}` as keyof typeof PROCEDURE_EN;
      expect(PROCEDURE_EN[k], key).toBeTruthy();
      expect(PROCEDURE_ZH[k], key).toBeTruthy();
      expect(blanks(PROCEDURE_ZH[k]), key).toEqual(blanks(PROCEDURE_EN[k]));
    }
    expect(rt("en", "op.reason.port-held", { holder: "Dr Mori", instrument: "grasper", port: "B" })).toBe("Dr Mori holds the grasper in port B: ask for it back first.");
    expect(rt("zh-CN", "op.reason.pass-first", { instrument: "抓钳", to: "术者" })).toBe("抓钳还没有递给术者：在洗手护士岗位上，每件器械都要先递再置入。");
  });

  it("call a port's role the assist port, never the assistant", () => {
    expect([procedureLabel("en", "assist"), procedureLabel("zh-CN", "assist")]).toEqual(["assist", "辅助"]);
    expect(rt("en", "field.port", { port: "D", role: procedureLabel("en", "assist"), size: 5, hand: "", instrument: "grasper" })).toBe("  port D (assist, 5 mm): grasper");
  });
});
