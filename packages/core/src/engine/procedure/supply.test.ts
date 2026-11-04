/**
 * The operation's equipment (docs/PROCEDURE.md "Equipment"): the picture needs a working camera and light source,
 * the pneumoperitoneum a working insufflator. A failure darkens the field or deflates it at once; a backup restores
 * only what it supplies; every change is in the record (`procedure.supply`), never an operative step.
 */
import { describe, expect, it } from "vitest";
import type { ClinicalAction, ProcedureOp, SessionState } from "../../schema/session.js";
import { parseCase } from "../parse.js";
import { createSession, reduce } from "../reducer.js";
import { observeField } from "./observe.js";
import { LAP_CHOLE_SIT } from "./__fixtures__/lap-chole-sit.js";

const parsed = parseCase(structuredClone(LAP_CHOLE_SIT));
if (!parsed.ok) throw new Error("fixture");
const c = parsed.value;
const def = c.procedure!;
const supply = (image: boolean, gas: boolean): ClinicalAction => ({ type: "procedure-supply", supply: { image, gas, source: "test" }, by: "system" });
const op = (o: ProcedureOp): ClinicalAction => ({ type: "operate", op: o });

function run(s: SessionState, a: ClinicalAction) {
  const r = reduce(c, s, a);
  return { s: r.rejected ? s : r.state, r };
}

describe("the laparoscopic equipment", () => {
  it("no picture without camera and light; no gas, no pneumoperitoneum; a backup restores only what it supplies", () => {
    let s = reduce(c, createSession(c), { type: "start" }).state;
    s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
    for (const o of [{ op: "plan-ports", plan: "three-port-left" }, { op: "insufflate", pressure: 12 }, { op: "insert", port: "A", instrument: "laparoscope" }, { op: "insert", port: "C", instrument: "maryland" }] as ProcedureOp[]) s = run(s, op(o)).s;
    expect(observeField(def, s.procedure!).inView).toBe(true);
    const steps = s.procedure!.counters.steps;

    // the camera fails: the field is dark at once, and a step that needs sight says why
    let step = run(s, supply(false, true));
    expect(step.r.events).toContainEqual({ type: "procedure.supply", image: false, gas: true, source: "test" });
    s = step.s;
    const dark = observeField(def, s.procedure!);
    expect(dark).toMatchObject({ inView: false, supply: { image: false, gas: true }, regions: [] });
    expect(run(s, op({ op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false })).r.rejected?.message).toMatch(/^There is no picture: the laparoscopic camera or light source is out of service/u);
    // the same supply again changes nothing
    expect(run(s, supply(false, true)).r.events).toEqual([]);

    // the gas goes too: the pneumoperitoneum is lost with it, and cannot be made again
    step = run(s, supply(false, false));
    expect(step.r.events).toContainEqual(expect.objectContaining({ type: "procedure.supply", gas: false, deflated: true }));
    s = step.s;
    expect(s.procedure).toMatchObject({ insufflated: false, pressure: 0 });
    expect(run(s, op({ op: "insufflate", pressure: 12 })).r.rejected?.message).toMatch(/^There is no CO₂ supply: the insufflator is out of service/u);

    // a stand-alone insufflator is connected: gas, but still no picture
    s = run(s, supply(false, true)).s;
    s = run(s, op({ op: "insufflate", pressure: 12 })).s;
    expect(s.procedure!.insufflated).toBe(true);
    expect(observeField(def, s.procedure!).inView).toBe(false);
    // a working tower: the picture is back
    s = run(s, supply(true, true)).s;
    expect(observeField(def, s.procedure!)).toMatchObject({ inView: true, supply: { image: true, gas: true } });
    // equipment changes are in the record, never operative steps (the re-insufflation is one)
    expect(s.procedure!.counters.steps).toBe(steps + 1);
  });

  it("without the equipment modelled nothing changes: the supply is whole by default", () => {
    let s = reduce(c, createSession(c), { type: "start" }).state;
    s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
    for (const o of [{ op: "plan-ports", plan: "three-port-left" }, { op: "insufflate", pressure: 12 }, { op: "insert", port: "A", instrument: "laparoscope" }] as ProcedureOp[]) s = run(s, op(o)).s;
    expect(s.procedure!.supply).toBeUndefined();
    expect(observeField(def, s.procedure!)).toMatchObject({ inView: true, supply: { image: true, gas: true } });
  });
});
