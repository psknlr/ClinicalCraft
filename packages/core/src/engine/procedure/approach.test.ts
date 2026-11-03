/**
 * Changes of approach and the presentation record (the Case 126 engineering brief, delivery 1): a bail-out asked
 * twice has no second effect and costs no second minute; a different subtotal technique needs an explicit revision;
 * conversion releases pressure, instruments and traction together and ends the laparoscopic view; exposure is the
 * traction held now — withdrawing the neck grasper narrows it at once — while dissection already done stays done;
 * every committed step carries a stable id and its sequence; the score carries the case version and the engine.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { ClinicalAction, DomainEvent } from "../../schema/session.js";
import type { ProcedureOp } from "../../schema/procedure.js";
import { assess } from "../assessment.js";
import { createSession, reduce } from "../reducer.js";
import { ENGINE_VERSION } from "../version.js";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { observeField } from "./observe.js";

const c = lapCholeCase();
const def = c.procedure!;

function run(ops: ProcedureOp[]) {
  let s = reduce(c, createSession(c), { type: "start" }).state;
  s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
  const rejected: { op: string; message: string }[] = [];
  const events: DomainEvent[] = [];
  for (const op of ops) {
    const r = reduce(c, s, { type: "operate", op, by: "agent" } as ClinicalAction);
    if (r.rejected) rejected.push({ op: op.op, message: r.rejected.message });
    events.push(...r.events);
    s = r.state;
  }
  return { s, p: s.procedure!, rejected, events };
}

const ACCESS: ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
];
const NECK: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" };
const TRIANGLE = Array.from({ length: 3 }, () => ({ op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }) as ProcedureOp);

describe("changes of approach", () => {
  it("a bail-out asked twice is refused: no second effect, no second minute", () => {
    const once = run([...ACCESS, { op: "bailout", strategy: "call-help" }]);
    const twice = run([...ACCESS, { op: "bailout", strategy: "call-help" }, { op: "bailout", strategy: "call-help" }]);
    expect(twice.rejected).toEqual([{ op: "bailout", message: expect.stringContaining("already under way") }]);
    expect(twice.p.bailouts).toEqual(["call-help"]);
    expect(twice.s.clock).toBe(once.s.clock);
  });

  it("a different subtotal technique needs an explicit revision; the superseded one is kept", () => {
    const r = run([...ACCESS, { op: "bailout", strategy: "subtotal-fenestrating" }, { op: "bailout", strategy: "subtotal-reconstituting" }]);
    expect(r.rejected[0]?.message).toMatch(/needs an explicit revision/);
    const revised = run([...ACCESS, { op: "bailout", strategy: "subtotal-fenestrating" }, { op: "bailout", strategy: "subtotal-reconstituting", revise: true }]);
    expect(revised.rejected).toEqual([]);
    expect(revised.p.bailouts).toEqual(["subtotal-reconstituting"]);
    expect(revised.p.superseded).toEqual(["subtotal-fenestrating"]);
  });

  it("conversion releases pressure, instruments and traction together and ends the laparoscopic view", () => {
    const r = run([...ACCESS, NECK, { op: "bailout", strategy: "convert-open" }]);
    expect(r.p).toMatchObject({ insufflated: false, pressure: 0, retractions: {} });
    expect(r.p.ports.every((p) => p.instrument === null && p.tip === null)).toBe(true);
    expect(observeField(def, r.p).inView).toBe(false);
  });
});

describe("exposure is the traction held now; dissection done stays done", () => {
  it("withdrawing the neck grasper narrows the window at once, before any further step", () => {
    const held = run([...ACCESS, NECK, ...TRIANGLE]);
    const triangle = (p: typeof held.p) => observeField(def, p).regions.find((x) => x.id === "hepatocystic-triangle")!;
    const before = triangle(held.p);
    const let_go = run([...ACCESS, NECK, ...TRIANGLE, { op: "withdraw", port: "B" }]);
    const after = triangle(let_go.p);
    expect(["partial", "good"]).toContain(before.exposure);
    expect(["none", "poor"]).toContain(after.exposure);
    expect(after.dissection).toBe(before.dissection);
    expect(let_go.p.retractions).toEqual({});
  });
});

describe("the presentation record", () => {
  it("every committed step has a stable id, its number, the sequence, the clock, who acted and the op", () => {
    const { events } = run([...ACCESS, NECK]);
    const steps = events.filter((e): e is Extract<DomainEvent, { type: "procedure.step" }> => e.type === "procedure.step");
    expect(steps.map((e) => e.id)).toEqual(["op-1", "op-2", "op-3", "op-4", "op-5", "op-6"]);
    expect(steps.at(-1)).toMatchObject({ op: "retract", step: 6, by: "agent", detail: NECK });
    expect(steps.map((e) => e.seq)).toEqual([...steps.map((e) => e.seq)].sort((a, b) => a! - b!));
  });

  it("the score carries the case version, the engine and whether the encounter finished", () => {
    const { s } = run(ACCESS);
    expect(assess(c, s)).toMatchObject({ caseVersion: c.version, engine: ENGINE_VERSION, finished: false });
    const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as { version: string };
    expect(ENGINE_VERSION).toBe(pkg.version);
  });
});
