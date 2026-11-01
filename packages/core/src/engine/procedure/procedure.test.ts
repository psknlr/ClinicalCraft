/**
 * The operative field (docs/PROCEDURE.md): safe and unsafe paths through a laparoscopic
 * cholecystectomy in situs inversus. No unsafe path may come out with a valid critical view; injuries
 * follow from what was actually clipped, divided or burnt; the operator's view never names a duct.
 */
import { describe, expect, it } from "vitest";
import type { ClinicalAction } from "../../schema/session.js";
import type { ProcedureOp } from "../../schema/procedure.js";
import { assess } from "../assessment.js";
import { evaluate } from "../conditions.js";
import { checkCaseIntegrity } from "../integrity.js";
import { createSession, reduce } from "../reducer.js";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { observeField } from "./observe.js";
import { portReport } from "./geometry.js";

const c = lapCholeCase();
const def = c.procedure!;

function run(ops: ProcedureOp[]) {
  let s = reduce(c, createSession(c), { type: "start" }).state;
  s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
  const rejected: { op: ProcedureOp; message: string }[] = [];
  const signals: string[] = [];
  for (const op of ops) {
    const r = reduce(c, s, { type: "operate", op } as ClinicalAction);
    if (r.rejected) rejected.push({ op, message: r.rejected.message });
    for (const e of r.events) if (e.type === "procedure.step") signals.push(...e.signals);
    s = r.state;
  }
  return { s, p: s.procedure!, rejected, signals };
}

/** Handle of a structure (test-only: reads the hidden mapping). */
function handle(p: { handles: { handle: string; structure: string }[] }, structure: string): string {
  const h = p.handles.find((x) => x.structure === structure);
  if (!h) throw new Error(`no handle for ${structure}`);
  return h.handle;
}

const ACCESS: ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
];
const LATERAL: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" };
const TRIANGLE: ProcedureOp[] = Array.from({ length: 6 }, () => ({ op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }) as ProcedureOp);
const PLATE: ProcedureOp[] = Array.from({ length: 3 }, () => ({ op: "dissect", port: "C", region: "cystic-plate", energy: false }) as ProcedureOp);

/** Access, exposure and a full dissection of the triangle and the plate (handles not yet known). */
function dissected() {
  return run([...ACCESS, LATERAL, ...TRIANGLE, ...PLATE]);
}

/** The safe reference path to the end, built with the handles the field assigned. */
function safePath(): ProcedureOp[] {
  const { p } = dissected();
  const cd = handle(p, "cystic-duct");
  const ca = handle(p, "cystic-artery");
  return [
    ...ACCESS,
    LATERAL,
    ...TRIANGLE,
    ...PLATE,
    { op: "isolate", port: "C", handle: cd },
    { op: "isolate", port: "C", handle: ca },
    { op: "identify", handle: cd, as: "cystic-duct" },
    { op: "identify", handle: ca, as: "cystic-artery" },
    { op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: true } },
    { op: "withdraw", port: "C" },
    { op: "insert", port: "C", instrument: "clip-applier" },
    { op: "clip", port: "C", handle: cd, count: 3 },
    { op: "clip", port: "C", handle: ca, count: 2 },
    { op: "withdraw", port: "C" },
    { op: "insert", port: "C", instrument: "scissors" },
    { op: "divide", port: "C", handle: cd },
    { op: "divide", port: "C", handle: ca },
    { op: "withdraw", port: "C" },
    { op: "insert", port: "C", instrument: "hook" },
    { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["anterior", "cephalad"], force: "firm" },
    ...Array.from({ length: 4 }, () => ({ op: "dissect", port: "C", region: "gallbladder-bed", energy: true }) as ProcedureOp),
    { op: "inspect" },
    { op: "withdraw", port: "C" },
    { op: "insert", port: "C", instrument: "retrieval-bag" },
    { op: "bag", port: "C" },
    { op: "extract", port: "A" },
    { op: "close" },
  ];
}

describe("the procedure fixture", () => {
  it("passes the integrity checks", () => {
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
  });
});

describe("the safe path", () => {
  it("achieves and documents the critical view, divides only the cystic duct and artery, and ends without injury or unsafe act", () => {
    const { p, s, rejected } = run(safePath());
    expect(rejected).toEqual([]);
    expect(p.pauses).toHaveLength(1);
    expect(p.pauses[0]).toMatchObject({ achieved: true, truth: { triangle: true, plate: true, two: true } });
    expect(p.unsafe).toEqual([]);
    expect(p.injuries).toEqual([]);
    expect(p.divided.sort()).toEqual(["cystic-artery", "cystic-duct"]);
    expect(p.specimen).toBe("extracted");
    expect(p.closed).toBe(true);
    const report = assess(c, s);
    expect(report.safety.verdict).toBe("clear");
    expect(report.score.percent).toBe(100);
  });

  it("is deterministic: replaying it gives a deep-equal state", () => {
    expect(run(safePath()).s).toEqual(run(safePath()).s);
  });

  it("costs simulated minutes", () => {
    expect(run(safePath()).s.clock).toBeGreaterThan(20);
  });
});

describe("what the operator sees", () => {
  it("never names a duct or vessel before imaging; organs are named", () => {
    const { p } = dissected();
    const view = observeField(def, p);
    expect(view.tubes.length).toBeGreaterThanOrEqual(3);
    for (const tube of view.tubes) {
      expect(tube.handle).toMatch(/^T\d+$/);
      expect(tube.imaging).toBeNull();
      expect(JSON.stringify(tube)).not.toMatch(/cystic-duct|common-bile-duct|cystic-artery/);
    }
    expect(view.organs.map((o) => o.id)).toContain("liver");
    expect(JSON.stringify(view)).not.toMatch(/truth|unsafe|injur/);
  });

  it("cholangiography shows the ducts by name", () => {
    const { p } = dissected();
    const cd = handle(p, "cystic-duct");
    const after = run([
      ...ACCESS,
      LATERAL,
      ...TRIANGLE,
      ...PLATE,
      { op: "isolate", port: "C", handle: cd },
      { op: "withdraw", port: "C" },
      { op: "insert", port: "C", instrument: "clip-applier" },
      { op: "clip", port: "C", handle: cd, count: 1 },
      { op: "withdraw", port: "C" },
      { op: "insert", port: "C", instrument: "cholangiocatheter" },
      { op: "image", modality: "ioc", port: "C" },
    ]);
    expect(after.rejected).toEqual([]);
    const tubes = observeField(def, after.p).tubes;
    expect(tubes.find((t) => t.handle === cd)?.imaging).toMatchObject({ en: "Cystic duct" });
  });
});

describe("unsafe paths are never a valid critical view", () => {
  it("habitual traction (towards the patient's right) closes the triangle: the common bile duct looks like the duct entering the gallbladder", () => {
    const wrong: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-right", "caudal"], force: "firm" };
    const { p } = run([...ACCESS, wrong, ...Array.from({ length: 12 }, () => TRIANGLE[0]), ...PLATE]);
    const view = observeField(def, p);
    const cbd = handle(p, "common-bile-duct");
    expect(view.tubes.find((t) => t.handle === cbd)?.appears).toMatchObject({ en: "a duct that seems to run into the gallbladder neck" });
    expect(view.regions.find((r) => r.id === "hepatocystic-triangle")?.exposure).toBe("none");
    // fully dissected or not, a third structure appears to enter the gallbladder
    const paused = run([...ACCESS, wrong, ...Array.from({ length: 12 }, () => TRIANGLE[0]), ...PLATE, { op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: true } }]);
    expect(paused.p.pauses[0].achieved).toBe(false);
    expect(paused.p.pauses[0].truth.two).toBe(false);
  });

  it("clipping and dividing the common bile duct taken for the cystic duct is a bile duct injury and a safety-critical failure", () => {
    const wrong: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-right", "caudal"], force: "firm" };
    const base = [...ACCESS, wrong, ...Array.from({ length: 12 }, () => TRIANGLE[0])];
    const cbd = handle(run(base).p, "common-bile-duct");
    const { p, s, rejected } = run([
      ...base,
      { op: "isolate", port: "C", handle: cbd },
      { op: "identify", handle: cbd, as: "cystic-duct" },
      { op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: true } },
      { op: "withdraw", port: "C" },
      { op: "insert", port: "C", instrument: "clip-applier" },
      { op: "clip", port: "C", handle: cbd, count: 3 },
      { op: "withdraw", port: "C" },
      { op: "insert", port: "C", instrument: "scissors" },
      { op: "divide", port: "C", handle: cbd },
    ]);
    expect(rejected).toEqual([]);
    expect(p.injuries.map((i) => [i.kind, i.structure])).toContainEqual(["bile-duct-injury", "common-bile-duct"]);
    expect(p.unsafe.map((u) => u.code)).toEqual(expect.arrayContaining(["irreversible-without-view", "irreversible-on-misidentified"]));
    expect(evaluate(c, s, { procedure: { documented: "cvs", valid: true } })).toBe(false);
    expect(evaluate(c, s, { procedure: { identified: "common-bile-duct", as: "cystic-duct" } })).toBe(true);
    const report = assess(c, s);
    expect(report.safety.verdict).toBe("safety-critical");
    expect(report.score.percent).toBeLessThanOrEqual(30);
    expect(report.procedure?.injuries[0]).toMatchObject({ kind: "bile-duct-injury", recognised: false });
  });

  it("clipping without a safety pause is unsafe even on the right structure", () => {
    const { p } = dissected();
    const cd = handle(p, "cystic-duct");
    const r = run([...ACCESS, LATERAL, ...TRIANGLE, ...PLATE, { op: "isolate", port: "C", handle: cd }, { op: "identify", handle: cd, as: "cystic-duct" }, { op: "withdraw", port: "C" }, { op: "insert", port: "C", instrument: "clip-applier" }, { op: "clip", port: "C", handle: cd, count: 2 }]);
    expect(r.p.unsafe.map((u) => u.code)).toContain("irreversible-without-pause");
    expect(r.p.injuries).toEqual([]);
    expect(assess(c, r.s).safety.verdict).toBe("safety-critical");
  });

  it("a pause claiming a view the field does not show is recorded as such", () => {
    const { p } = run([...ACCESS, LATERAL, TRIANGLE[0], TRIANGLE[1], { op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: true } }]);
    expect(p.pauses[0].achieved).toBe(false);
    expect(p.pauses[0].truth).toEqual({ triangle: false, plate: false, two: false });
  });
});

describe("complications follow from the anatomy", () => {
  it("dividing the cystic artery on one clip bleeds: the field is obscured until suctioned, and a clip on the stump controls it", () => {
    const { p } = dissected();
    const ca = handle(p, "cystic-artery");
    const steps: ProcedureOp[] = [
      ...ACCESS,
      LATERAL,
      ...TRIANGLE,
      ...PLATE,
      { op: "isolate", port: "C", handle: ca },
      { op: "identify", handle: ca, as: "cystic-artery" },
      { op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: true } },
      { op: "withdraw", port: "C" },
      { op: "insert", port: "C", instrument: "clip-applier" },
      { op: "clip", port: "C", handle: ca, count: 1 },
      { op: "withdraw", port: "C" },
      { op: "insert", port: "C", instrument: "scissors" },
      { op: "divide", port: "C", handle: ca },
    ];
    const bled = run(steps);
    expect(bled.signals).toContain("bleeding");
    expect(observeField(def, bled.p).findings).toContain("field-obscured");
    const blocked = run([...steps, { op: "dissect", port: "C", region: "cystic-plate", energy: false }]);
    expect(blocked.rejected.at(-1)?.message).toMatch(/obscured/);
    const managed = run([...steps, { op: "withdraw", port: "C" }, { op: "insert", port: "C", instrument: "suction" }, { op: "suction", port: "C" }, { op: "recognise", injury: "bleeding" }, { op: "withdraw", port: "C" }, { op: "insert", port: "C", instrument: "clip-applier" }, { op: "clip", port: "C", handle: ca, count: 1 }]);
    expect(managed.rejected).toEqual([]);
    expect(managed.p.bleeding[0]).toMatchObject({ controlled: true });
    expect(managed.p.injuries[0]).toMatchObject({ kind: "bleeding", recognised: true });
  });

  it("energy in a poorly exposed triangle burns a hidden duct", () => {
    const { p } = run([
      ...ACCESS.slice(0, 4),
      { op: "insert", port: "C", instrument: "hook" },
      { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-right"], force: "firm" },
      { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: true },
    ]);
    expect(p.unsafe.map((u) => u.code)).toContain("energy-near-hidden-hazard");
    expect(p.injuries.map((i) => i.kind)).toContain("thermal-injury");
  });

  it("excessive traction tears the gallbladder and spills bile and stones", () => {
    const { p, signals, s } = run([...ACCESS, { op: "retract", port: "B", structure: "gallbladder-fundus", direction: ["cephalad"], force: "excessive" }]);
    expect(p.injuries.map((i) => i.kind)).toEqual(["perforation"]);
    expect(signals).toEqual(expect.arrayContaining(["bile-in-field", "stones-spilled"]));
    expect(assess(c, s).safety.verdict).toBe("complication");
  });
});

describe("bail-outs and access", () => {
  it("a subtotal cholecystectomy ends the dissection and lets the operation close", () => {
    const { p, rejected } = run([...ACCESS, LATERAL, TRIANGLE[0], { op: "bailout", strategy: "subtotal-fenestrating" }, { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }, { op: "close" }]);
    expect(rejected.map((r) => r.op.op)).toEqual(["dissect"]);
    expect(p.bailouts).toEqual(["subtotal-fenestrating"]);
    expect(p.closed).toBe(true);
    expect(p.unsafe).toEqual([]);
  });

  it("the specimen cannot be left inside: closing needs it out or a bail-out", () => {
    const { rejected } = run([...ACCESS, { op: "close" }]);
    expect(rejected[0]?.message).toMatch(/still inside/);
  });

  it("a 10 mm scope does not pass a 5 mm port", () => {
    const { rejected } = run([{ op: "plan-ports", plan: "three-port-left" }, { op: "insufflate", pressure: 12 }, { op: "insert", port: "B", instrument: "laparoscope" }]);
    expect(rejected[0]?.message).toMatch(/does not pass/);
  });

  it("insufflating above the procedure's maximum is unsafe", () => {
    const { p, signals } = run([{ op: "plan-ports", plan: "three-port-left" }, { op: "insufflate", pressure: 20 }]);
    expect(p.unsafe.map((u) => u.code)).toEqual(["insufflation-over-max"]);
    expect(signals).toContain("pressure-high");
  });

  it("ports placed as for usual anatomy reach the left-sided triangle only with the shafts fencing", () => {
    const habitual = portReport(def, def.portPlans.find((x) => x.id === "habitual")!);
    expect(habitual.warnings).toContain("sword-fighting");
    expect(habitual.manipulationAngle!).toBeLessThan(25);
  });

  it("an instrument cannot reach beyond its shaft", () => {
    const far = structuredClone(def);
    far.portSites.find((x) => x.id === "C")!.at = [0.5, 0.5, 0];
    const fc = { ...c, procedure: far };
    let s = reduce(fc, createSession(fc), { type: "start" }).state;
    s = reduce(fc, s, { type: "set-phase", phase: "theatre" }).state;
    for (const op of ACCESS) s = reduce(fc, s, { type: "operate", op }).state;
    const r = reduce(fc, s, { type: "operate", op: { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false } });
    expect(r.rejected?.message).toMatch(/reach/);
  });

  it("the published three-port plan crosses the surgeon's hands; the mirrored four-port plan does not", () => {
    const three = portReport(def, def.portPlans.find((x) => x.id === "three-port-left")!);
    const four = portReport(def, def.portPlans.find((x) => x.id === "mirror-four-port")!);
    expect(three.handsCross).toBe(true);
    expect(four.handsCross).toBe(false);
    expect(three.manipulationAngle).toBeGreaterThan(25);
  });

  it("operate is refused outside the procedure's phases", () => {
    const s = reduce(c, createSession(c), { type: "start" }).state;
    const r = reduce(c, s, { type: "operate", op: { op: "plan-ports", plan: "three-port-left" } });
    expect(r.rejected?.code).toBe("phase-locked");
  });
});
