/**
 * The operative field with a care team, through the reducer (docs/PROCEDURE.md §3): in a place the stand-in surgeon is
 * the operator — the step recorded without an actor, a `to` naming them without a `to`; whom a step names must be of the
 * team as it is; passes are needed in the scrub nurse's place only, and refused there with their reason; refusals carry
 * a structured reason on the result and on `action.rejected`; a step's `ref` is recorded when the step is accepted,
 * never when it is refused; the English messages the field said before stay as they were, byte for byte; and the
 * reference path reaches the same clinical outcome whatever the camera does — with no place, with the operating
 * surgeon's, with a colleague holding and aiming the camera — in every anatomical variant.
 */
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../../schema/case.js";
import type { Seat } from "../../schema/positions.js";
import type { ProcedureOp, ProcedureState } from "../../schema/procedure.js";
import type { ClinicalAction, DomainEvent, ReduceResult, SessionState } from "../../schema/session.js";
import { createSession, reduce } from "../reducer.js";
import { procedureFor } from "./variant.js";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { LAP_CHOLE_SOLUTION, lapCholeTeamCase, REFERENCE_OPS } from "./__fixtures__/lap-chole-team.js";

const k = lapCholeTeamCase();
const SCOPE_IN: ProcedureOp = { op: "insert", port: "A", instrument: "laparoscope" };

/** A session started (in a place, with a line-up…) and in the theatre: a place joins there with its start. */
function theatre(c: CaseDefinition, start: { seat?: Seat; lineup?: string; variant?: string } = {}): SessionState {
  const r = reduce(c, createSession(c), { type: "start", ...start });
  if (r.rejected) throw new Error(r.rejected.message);
  return r.state.phase === "theatre" ? r.state : reduce(c, r.state, { type: "set-phase", phase: "theatre" }).state;
}
const step = (c: CaseDefinition, s: SessionState, op: ProcedureOp, actor?: string, ref?: string): ReduceResult =>
  reduce(c, s, { type: "operate", op, by: "agent", ...(actor ? { actor } : {}), ...(ref ? { ref } : {}) } as ClinicalAction);
/** Each step accepted, in order. */
function all(c: CaseDefinition, s: SessionState, steps: readonly { op: ProcedureOp; actor?: string; ref?: string }[]): SessionState {
  for (const x of steps) {
    const r = step(c, s, x.op, x.actor, x.ref);
    if (r.rejected) throw new Error(`${x.op.op}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}
const stepEvent = (r: ReduceResult) => r.events.find((e) => e.type === "procedure.step") as Extract<DomainEvent, { type: "procedure.step" }>;

describe("in a place the stand-in surgeon is the operator", () => {
  it("their steps are recorded without an actor, and a `to` naming them — or `surgeon` — is back to the operator", () => {
    let s = theatre(k, { seat: "first-assistant" });
    const plan = step(k, s, REFERENCE_OPS[0]!, "doc-0");
    expect(stepEvent(plan)).toMatchObject({ op: "plan-ports", detail: REFERENCE_OPS[0] });
    expect(stepEvent(plan).actor).toBeUndefined();
    s = all(k, plan.state, REFERENCE_OPS.slice(1, 5).map((op) => ({ op, actor: "doc-0" })));
    expect(s.procedure!.counters).toMatchObject({ steps: 5 });
    expect(s.procedure!.counters.colleague).toBeUndefined();
    // the learner (the first assistant) takes the grasper; handed "to the stand-in", it is back with the operator
    s = all(k, s, [{ op: { op: "hand-over", port: "B", to: "doc-1" }, actor: "doc-1" }]);
    for (const to of ["doc-0", "surgeon"]) {
      const back = step(k, s, { op: "hand-over", port: "B", to }, "doc-1");
      expect(back.rejected).toBeUndefined();
      expect(stepEvent(back)).toMatchObject({ actor: "doc-1", detail: { op: "hand-over", port: "B" } });
      expect(stepEvent(back).detail).not.toHaveProperty("to");
      expect(back.state.procedure!.ports.find((p) => p.site === "B")!.holder).toBeUndefined();
    }
    // a refused step of theirs is recorded normalised too
    const refused = step(k, s, { op: "withdraw", port: "B" }, "doc-0");
    expect(refused.events).toEqual([expect.objectContaining({ type: "action.rejected", detail: { op: "withdraw", port: "B" }, reason: { key: "port-held", params: { holder: "doc-1", instrument: "grasper", port: "B" } } })]);
    expect(refused.events[0]).not.toHaveProperty("actor");
  });

  it("whom a step names must be of the team as it is: a pass always, a hand-over in a place", () => {
    const open = REFERENCE_OPS.slice(0, 5).map((op) => ({ op }));
    const s = all(k, theatre(k), open);
    expect(step(k, s, { op: "pass", instrument: "hook", to: "or-7.assistant" }, "nurse-2").rejected).toEqual({ code: "unknown-id", message: 'There is no "or-7.assistant" in the team.', reason: { key: "unknown-member", params: { who: "or-7.assistant" } } });
    // with no place, a colleague outside the team still takes a port handed to them (Case 126's assistant surgeon)
    expect(step(k, s, { op: "hand-over", port: "B", to: "or-7.assistant" }, "or-7.assistant").rejected).toBeUndefined();
    // in a place, only the team's members
    const placed = all(k, theatre(k, { seat: "first-assistant" }), REFERENCE_OPS.slice(0, 5).map((op) => ({ op, actor: "doc-0" })));
    expect(step(k, placed, { op: "hand-over", port: "B", to: "or-7.assistant" }).rejected?.reason).toEqual({ key: "unknown-member", params: { who: "or-7.assistant" } });
    expect(step(k, placed, { op: "hand-over", port: "B", to: "doc-1" }).rejected).toBeUndefined();
    // the relief of the scenario is of the team; the colleague they relieve is not
    const relief = all(k, reduce(k, reduce(k, createSession(k), { type: "start", team: "scrub-break" }).state, { type: "set-phase", phase: "theatre" }).state, open);
    expect(step(k, relief, { op: "pass", instrument: "hook" }, "nurse-9").rejected).toBeUndefined();
    expect(step(k, relief, { op: "pass", instrument: "hook", to: "nurse-2" }, "nurse-9").rejected?.code).toBe("unknown-id");
  });
});

describe("passing", () => {
  it("is needed in the scrub nurse's place only: every insert there waits for a pass to the one who inserts", () => {
    // the reference path with no place, or in the first assistant's place, inserts with no pass
    expect(all(k, theatre(k), REFERENCE_OPS.slice(0, 5).map((op) => ({ op }))).procedure!.ports.map((p) => p.instrument)).toEqual(["laparoscope", "grasper", "maryland"]);
    expect(all(k, theatre(k, { seat: "first-assistant" }), REFERENCE_OPS.slice(0, 5).map((op) => ({ op, actor: "doc-0" }))).procedure!.passed).toBeUndefined();
    // the scrub nurse's place: the stand-in's first insert is refused, with its reason
    const s = all(k, theatre(k, { seat: "scrub-nurse" }), REFERENCE_OPS.slice(0, 2).map((op) => ({ op, actor: "doc-0" })));
    const refused = step(k, s, SCOPE_IN, "doc-0");
    const message = "The laparoscope has not been passed to the operator: in the scrub nurse's place every instrument is passed before it goes in.";
    expect(refused.rejected).toEqual({ code: "requirements-unmet", message, reason: { key: "pass-first", params: { instrument: "laparoscope", to: "" } } });
    expect(refused.state).toBe(s);
    expect(refused.events).toEqual([{ type: "action.rejected", action: "operate", code: "requirements-unmet", message, at: s.clock, after: s.seq, detail: SCOPE_IN, reason: { key: "pass-first", params: { instrument: "laparoscope", to: "" } } }]);
    // the learner — the scrub nurse — passes it to the stand-in: the operator's; the insert takes it
    const passed = step(k, s, { op: "pass", instrument: "laparoscope", to: "doc-0" }, "nurse-2");
    expect(stepEvent(passed)).toMatchObject({ actor: "nurse-2", detail: { op: "pass", instrument: "laparoscope" } });
    expect(passed.state.procedure!.passed).toEqual([{ instrument: "laparoscope", by: "nurse-2" }]);
    const inserted = step(k, passed.state, SCOPE_IN, "doc-0");
    expect(inserted.rejected).toBeUndefined();
    expect(inserted.state.procedure!.passed).toBeUndefined();
    // a colleague's insert waits for a pass to them: the first assistant putting the scope in
    const theirs = step(k, s, SCOPE_IN, "doc-1");
    expect(theirs.rejected?.reason).toEqual({ key: "pass-first", params: { instrument: "laparoscope", to: "doc-1" } });
    const toThem = all(k, s, [{ op: { op: "pass", instrument: "laparoscope", to: "doc-1" }, actor: "nurse-2" }, { op: SCOPE_IN, actor: "doc-1" }]);
    expect(toThem.procedure!.ports.find((p) => p.site === "A")).toMatchObject({ instrument: "laparoscope", holder: "doc-1" });
    expect(toThem.procedure!.passed).toBeUndefined();
  });
});

describe("a step's ref", () => {
  it("is recorded when the step is accepted, in order — never when it is refused; it changes nothing else", () => {
    let s = theatre(k);
    const plan = step(k, s, REFERENCE_OPS[0]!, undefined, "standin:2");
    expect(stepEvent(plan).ref).toBe("standin:2");
    expect(plan.state.procedure!.refs).toEqual(["standin:2"]);
    s = plan.state;
    const refused = step(k, s, { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }, undefined, "standin:3");
    expect(refused.rejected).toBeDefined();
    expect(refused.state.procedure!.refs).toEqual(["standin:2"]);
    s = step(k, s, REFERENCE_OPS[1]!, undefined, "standin:3:retract:1").state;
    expect(s.procedure!.refs).toEqual(["standin:2", "standin:3:retract:1"]);
    // the same steps without refs: the same field but the refs
    const bare = all(k, theatre(k), REFERENCE_OPS.slice(0, 2).map((op) => ({ op })));
    const { refs: _refs, ...rest } = s.procedure!;
    expect(rest).toEqual(bare.procedure);
    // a ref is a short lower-case token
    for (const ref of ["Standin 4", "x".repeat(81), ""]) expect(step(k, s, REFERENCE_OPS[2]!, undefined, ref || "\u0000").rejected?.code).toBe("invalid");
  });
});

describe("the English messages stay as they were", () => {
  const c = lapCholeCase();
  const ACCESS = REFERENCE_OPS.slice(0, 5).map((op) => ({ op }));
  const AS = "or-7.assistant";

  it("the hand-over and holding refusals, word for word, now with their reasons", () => {
    const s = all(c, theatre(c), ACCESS);
    const held = all(c, s, [{ op: { op: "hand-over", port: "B", to: AS }, actor: AS }]);
    const said = (r: ReduceResult) => [r.rejected?.message, r.rejected?.reason?.key];
    expect([
      said(step(c, held, { op: "withdraw", port: "B" })),
      said(step(c, s, { op: "suction", port: "C" }, AS)),
      said(step(c, s, { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }, AS)),
      said(step(c, all(c, s, [{ op: { op: "withdraw", port: "B" } }]), { op: "hand-over", port: "B", to: AS }, AS)),
      said(step(c, held, { op: "hand-over", port: "B", to: AS }, AS)),
      said(step(c, s, { op: "hand-over", port: "B" })),
      said(step(c, held, { op: "hand-over", port: "B" }, "or-7.second")),
      said(step(c, theatre(c), { op: "insufflate", pressure: 12 })),
      said(step(c, theatre(c), SCOPE_IN)),
      said(step(c, all(c, theatre(c), REFERENCE_OPS.slice(0, 2).map((op) => ({ op }))), { op: "insert", port: "B", instrument: "lap-us" })),
    ]).toEqual([
      ['or-7.assistant holds the grasper in port "B": ask them to hand it back first.', "port-held"],
      ['Port "C" is the operator\'s: it has not been handed to or-7.assistant.', "not-handed"],
      ['Only the operator does "dissect": or-7.assistant assists (hand-over, retract, release, withdraw, suction, irrigate).', "operator-only"],
      ['No instrument is in port "B": there is nothing to hand over.', undefined],
      ['or-7.assistant already holds the grasper in port "B".', "holds-already"],
      ['The operator already holds the grasper in port "B".', "holds-already"],
      ['Only the one who holds the grasper in port "B" or the one who takes it can hand it over.', "not-a-party"],
      ["Choose the port plan first.", undefined],
      ['There is no port "A" in the chosen plan.', undefined],
      ["No lap-us is on the instrument table.", undefined],
    ]);
  });
});

describe("the reference path, whatever the camera does", () => {
  const variants = [undefined, ...k.procedure!.variants.map((v) => v.id)];
  const ops = LAP_CHOLE_SOLUTION.flatMap((a) => (a.type === "operate" ? [(a as { op: ProcedureOp }).op] : []));

  /** The field's clinical outcome: everything but the camera, the colleagues' own steps, the refs and who holds a port. */
  function outcome(s: SessionState) {
    const { camera: _camera, refs: _refs, counters, pauses, ports, ...rest } = s.procedure as ProcedureState;
    const { colleague: _colleague, offView: _offView, steps, ...counted } = counters;
    return {
      ...rest,
      operatorSteps: steps - (counters.colleague ?? 0),
      counters: counted,
      pauses: pauses.map(({ step: _step, ...p }) => p),
      ports: ports.map(({ holder: _holder, ...p }) => p),
      clock: s.clock,
      objectives: s.objectivesDone,
      finished: s.finished,
      phase: s.phase,
    };
  }

  /** The reference path, the first assistant taking the camera once it is in and aiming it before every tissue step. */
  function withCamera(start: { variant?: string }): { s: SessionState; refusedCamera: number } {
    let s = theatre(k, start);
    let refusedCamera = 0;
    const camera = (op: ProcedureOp) => {
      const r = step(k, s, op, "doc-1");
      if (r.rejected) refusedCamera++;
      else s = r.state;
    };
    let tissue = 0;
    // the region a tissue step works in (test-only: the hidden mapping from handles to structures)
    const regionOf = (op: ProcedureOp): string | undefined => {
      if (op.op === "dissect") return op.region;
      if (op.op !== "isolate" && op.op !== "clip" && op.op !== "divide" && op.op !== "coagulate") return undefined;
      const structure = s.procedure?.handles.find((h) => h.handle === op.handle)?.structure;
      return procedureFor(k, s)!.anatomy.find((x) => x.id === structure)?.in;
    };
    for (const op of ops) {
      const region = regionOf(op);
      if (region && s.procedure?.ports.find((p) => p.site === "A")?.holder === "doc-1") {
        // on the work and close, elsewhere and wide, the whole field
        const turn = tissue++ % 3;
        if (turn === 0) [{ op: "aim", port: "A", at: region } as ProcedureOp, { op: "zoom", port: "A", level: "close" } as ProcedureOp].forEach(camera);
        else if (turn === 1) [{ op: "zoom", port: "A", level: "wide" } as ProcedureOp, { op: "aim", port: "A", at: region === "cystic-plate" ? "gallbladder-bed" : "cystic-plate" } as ProcedureOp].forEach(camera);
        else camera({ op: "aim", port: "A" });
      }
      s = step(k, s, op).state;
      if (op.op === "insert" && op.port === "A") camera({ op: "hand-over", port: "A", to: "doc-1" });
    }
    return { s, refusedCamera };
  }

  it("with the operating surgeon's seat it is the field with no place, in every variant", () => {
    for (const variant of variants) {
      const none = ops.reduce((s, op) => step(k, s, op).state, theatre(k, variant ? { variant } : {}));
      const surgeon = ops.reduce((s, op) => step(k, s, op).state, theatre(k, { seat: "surgeon", ...(variant ? { variant } : {}) }));
      expect(surgeon, variant ?? "reference").toEqual(none);
    }
  });

  it("with a colleague holding and aiming the camera it reaches the same clinical outcome, in every variant", () => {
    for (const variant of variants) {
      const start = variant ? { variant } : {};
      const none = ops.reduce((s, op) => step(k, s, op).state, theatre(k, start));
      const { s: aimed, refusedCamera } = withCamera(start);
      expect(outcome(aimed), variant ?? "reference").toEqual(outcome(none));
      // the camera did work: held, aimed, the work sometimes off its aim
      expect(aimed.procedure!.counters.colleague ?? 0, variant ?? "reference").toBeGreaterThan(10);
      if (!variant) {
        expect(refusedCamera).toBe(0);
        expect(none.procedure!).toMatchObject({ closed: true, specimen: "extracted", injuries: [], unsafe: [] });
        expect(aimed.procedure!.counters.offView).toBeGreaterThan(0);
      }
    }
  });
});
