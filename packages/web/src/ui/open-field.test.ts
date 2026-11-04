/**
 * The open-surgery view (after a conversion): the field in words — each dissection field and how far it is
 * cleared, each tubular structure with its clips, division and the name given to it — in both languages.
 */
import { describe, expect, it } from "vitest";
import { createSession, observeField, parseCase, reduce, type ProcedureOp, type SessionState } from "@clinicalcraft/core";
import { LAP_CHOLE_SIT } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { setLocale, tr } from "../i18n/index.js";
import { label } from "./panels/surgery-controls.js";
import { convertedToOpen, openFieldText } from "./open-field.js";

describe("the open-surgery view", () => {
  it("after a conversion the views show the open field, not a scope picture", () => {
    const parsed = parseCase(structuredClone(LAP_CHOLE_SIT));
    if (!parsed.ok) throw new Error("fixture");
    const c = parsed.value;
    let s: SessionState = reduce(c, createSession(c), { type: "start" }).state;
    s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
    const ops: ProcedureOp[] = [
      { op: "plan-ports", plan: "three-port-left" },
      { op: "insufflate", pressure: 12 },
      { op: "insert", port: "A", instrument: "laparoscope" },
      { op: "insert", port: "B", instrument: "grasper" },
      { op: "insert", port: "C", instrument: "maryland" },
      { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" },
      { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false },
    ];
    for (const op of ops) {
      const r = reduce(c, s, { type: "operate", op });
      expect(r.rejected, op.op).toBeUndefined();
      s = r.state;
    }
    const def = c.procedure!;
    expect(convertedToOpen(observeField(def, s.procedure!))).toBe(false);
    const converted = reduce(c, s, { type: "operate", op: { op: "bailout", strategy: "convert-open" } });
    expect(converted.rejected).toBeUndefined();
    const scope = observeField(def, converted.state.procedure!);
    expect(convertedToOpen(scope)).toBe(true);
    // the laparoscope is out: its view shows nothing; the open field shows what was done
    expect(scope.inView).toBe(false);
    expect(scope.regions).toEqual([]);
    const v = observeField(def, converted.state.procedure!, "open");
    expect(v.inView).toBe(false);
    expect(v.regions.length).toBeGreaterThan(0);
    for (const [locale, title, begun] of [["en", "Open field (converted to open surgery)", /: (started|begun)/u], ["zh-CN", "开腹术野（已中转开腹）", /：已开始/u]] as const) {
      setLocale(locale);
      const lines = openFieldText(v, locale, tr, label, (id) => id);
      expect(lines[0]).toBe(title);
      expect(lines.length).toBe(1 + v.regions.length + v.tubes.length);
      expect(lines.some((l) => begun.test(l)), lines.join(" | ")).toBe(true);
    }
    setLocale("en");
  });
});
