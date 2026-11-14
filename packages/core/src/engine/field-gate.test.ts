/**
 * The operative field's gate before the physics (`fieldGate`, docs/PROCEDURE.md §3) — the one composition the session's
 * precheck of an `operate` call and a front-end's offers ask — and the engine's verdict on a step without taking it
 * (`operateRefusal`): always the reducer's own, the state untouched.
 */
import { describe, expect, it } from "vitest";
import type { FacilityDefinition } from "../schema/facility.js";
import type { ProcedureOp } from "../schema/procedure.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import { fieldGate } from "./field-gate.js";
import { lapCholeTeamCase, REFERENCE_OPS } from "./procedure/__fixtures__/lap-chole-team.js";
import { createSession, operateRefusal, reduce } from "./reducer.js";
import { LEARNER_BODY } from "./seats.js";

const k = lapCholeTeamCase();
type Start = Extract<ClinicalAction, { type: "start" }>;

/** The encounter after its start, in the theatre, and `steps` (each accepted). */
function encounter(start: Start, steps: readonly { op: ProcedureOp; actor?: string }[] = []): SessionState {
  let s = reduce(k, createSession(k), start).state;
  if (s.phase !== "theatre") s = reduce(k, s, { type: "set-phase", phase: "theatre" }).state;
  for (const x of steps) {
    const r = reduce(k, s, { type: "operate", op: x.op, ...(x.actor ? { actor: x.actor } : {}) });
    if (r.rejected) throw new Error(`${x.op.op}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}

/** The operator's access (the stand-in's, `doc-0`, in a place): the plan, the gas, the scope in A, a grasper in B, the Maryland in C. */
const access = (actor?: string) => REFERENCE_OPS.slice(0, 5).map((op) => ({ op, ...(actor ? { actor } : {}) }));

describe("fieldGate: whether the field takes a body's step at all, before the physics", () => {
  it("no part for the colleague standing by; a colleague's operator-only step; whom a step names; the controls", () => {
    const first = encounter({ type: "start", seat: "first-assistant" }, access("doc-0"));
    // the first assistant's own body stands by while the learner holds their place
    expect(fieldGate(k, first, null, { op: "retract", port: "B", structure: "gallbladder-fundus", direction: ["cephalad"], force: "firm" }, "staff:doc-1")).toEqual({ kind: "no-part" });
    // the learner in the first assistant's place: dissection is the operator's
    expect(fieldGate(k, first, null, { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false })).toEqual({
      kind: "operator-only",
      step: { op: { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }, actor: "doc-1" },
      reason: { key: "operator-only", params: { op: "dissect", actor: "doc-1" } },
    });
    // taking the grasper: the first assistant holds traction — let through (the physics answers the rest)
    expect(fieldGate(k, first, null, { op: "hand-over", port: "B", to: "doc-1" })).toBeNull();
    // the Maryland is the operator's own: nobody's control covers it
    expect(fieldGate(k, first, null, { op: "hand-over", port: "C", to: "doc-1" })).toMatchObject({ kind: "control", refusal: { reason: { key: "needs-control", params: { who: "doc-1", control: "operate" } } } });
    // three surgeons: the camera is the second assistant's, not the first's
    const three = encounter({ type: "start", seat: "first-assistant", lineup: "three-surgeons" }, access("doc-0"));
    expect(fieldGate(k, three, null, { op: "hand-over", port: "A", to: "doc-1" })).toMatchObject({ kind: "control", refusal: { reason: { key: "needs-control", params: { who: "doc-1", control: "camera" } } } });
    // a pass to someone the team scenario makes absent: the scrub nurse on a break
    const relief = encounter({ type: "start", team: "scrub-break" }, access());
    expect(fieldGate(k, relief, null, { op: "pass", instrument: "hook", to: "nurse-2" }, "staff:nurse-9")).toMatchObject({ kind: "party", step: { actor: "nurse-9" }, refusal: { reason: { key: "member-absent", params: { who: "nurse-2" } } } });
    // operating, the learner's own steps are the operator's: nothing gated
    const operating = encounter({ type: "start" }, access());
    expect(fieldGate(k, operating, null, { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }, LEARNER_BODY)).toBeNull();
  });

  it("a taker's controls by their facility position when the team does not list them (bodyControls): an anaesthetist takes no grasper, a surgeon does", () => {
    const facility = {
      staff: [
        { id: "or-gas", role: "attending", position: "anaesthetist", name: { en: "Dr Gas", "zh-CN": "麻醉医生" } },
        { id: "or-help", role: "attending", position: "surgeon", name: { en: "Dr Help", "zh-CN": "外科医生" } },
      ],
    } as unknown as FacilityDefinition;
    const operating = encounter({ type: "start" }, access());
    expect(fieldGate(k, operating, facility, { op: "hand-over", port: "B", to: "or-gas" })).toMatchObject({ kind: "control", refusal: { reason: { key: "needs-control", params: { who: "or-gas", control: "retract" } } } });
    expect(fieldGate(k, operating, facility, { op: "hand-over", port: "B", to: "or-help" })).toBeNull();
    // nobody the facility knows: no control at all
    expect(fieldGate(k, operating, null, { op: "hand-over", port: "B", to: "or-help" })).toMatchObject({ kind: "control" });
  });
});

describe("operateRefusal: the engine's verdict on a step without taking it", () => {
  it("is the reducer's own rejection (null: taken), and leaves the state as it was", () => {
    const states = [
      encounter({ type: "start" }),
      encounter({ type: "start" }, access().slice(0, 2)),
      encounter({ type: "start" }, access()),
      encounter({ type: "start", seat: "first-assistant" }, access("doc-0").slice(0, 1)),
      encounter({ type: "start", seat: "first-assistant" }, access("doc-0")),
      encounter({ type: "start", seat: "scrub-nurse" }, access("doc-0").slice(0, 2)),
    ];
    const steps: { op: ProcedureOp; actor?: string }[] = [
      { op: { op: "insert", port: "A", instrument: "laparoscope" } },
      { op: { op: "insert", port: "A", instrument: "laparoscope" }, actor: "doc-1" },
      { op: { op: "insert", port: "D", instrument: "suction" }, actor: "doc-1" },
      { op: { op: "hand-over", port: "B", to: "doc-1" }, actor: "doc-1" },
      { op: { op: "hand-over", port: "B", to: "doc-1" } },
      { op: { op: "hand-over", port: "C", to: "doc-1" }, actor: "doc-1" },
      { op: { op: "aim", port: "A", at: "hepatocystic-triangle" } },
      { op: { op: "aim", port: "A" }, actor: "doc-1" },
      { op: { op: "zoom", port: "A", level: "close" } },
      { op: { op: "pass", instrument: "hook" }, actor: "nurse-2" },
      { op: { op: "pass", instrument: "hook", to: "doc-1" }, actor: "nurse-2" },
      { op: { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false } },
      { op: { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }, actor: "doc-0" },
      { op: { op: "withdraw", port: "B" }, actor: "doc-1" },
    ];
    for (const s of states) {
      const before = structuredClone(s);
      for (const x of steps) {
        const label = `${s.seat ?? "operating"} after ${s.procedure?.counters.steps ?? 0} steps: ${x.op.op} by ${x.actor ?? "the operator"}`;
        const r = reduce(k, s, { type: "operate", op: x.op, ...(x.actor ? { actor: x.actor } : {}) });
        expect(operateRefusal(k, s, x.op, x.actor), label).toEqual(r.rejected ?? null);
      }
      expect(s).toEqual(before);
    }
    // before the start, and after the finish: the reducer's own guard
    expect(operateRefusal(k, createSession(k), { op: "insufflate", pressure: 12 })?.code).toBe("not-started");
  });
});
