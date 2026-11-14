/**
 * The surgery window by place (docs/PROCEDURE.md §7): what each place in the care team is offered is core's verdict —
 * the field's gates (`seatCheck` with each body's controls, `stepPartyRefusal`, `COLLEAGUE_OPS`), never a rule of the
 * web's own: Take, Hand back and Hand to by the controls; the camera aimed only by the camera holder, or by the
 * operator while nobody holds the camera port; "Ask for" instead of an insert where every instrument is passed first
 * (the scrub nurse's place) and none waits; passing for the place that holds the instrument table. Each offer is also
 * sent through the engine: an offer is taken, a step not offered is refused.
 */
import {
  bodyControls,
  COLLEAGUE_OPS,
  createSession,
  effectiveTeam,
  LEARNER_BODY,
  memberBody,
  normaliseStep,
  observeField,
  procedureStateOf,
  reduce,
  refOfBody,
  seatCheck,
  stepPartyRefusal,
  type CaseDefinition,
  type ClinicalAction,
  type Controls,
  type FieldView,
  type InstrumentId,
  type ProcedureOp,
  type SessionState,
} from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { lapCholeTeamCase } from "./__fixtures__/lap-chole-sit.js";
import { cameraOffer, controlsForPlace, holderOf, learnerRef, portsForPlace, stepOffered, tableOffer, type FieldSeat } from "./surgery-controls.js";

const k = lapCholeTeamCase();
const def = k.procedure!;
type Start = Extract<ClinicalAction, { type: "start" }>;

/** A step as the engine records it: by the stand-in (`doc-0`, the operator in a place), a colleague, or the operator (no actor). */
interface Step {
  op: ProcedureOp;
  actor?: string;
}

/** The encounter after its start (in the theatre) and `steps`, each of which must be accepted. */
function encounter(start: Start, steps: readonly Step[] = [], c: CaseDefinition = k): SessionState {
  let s = reduce(c, createSession(c), start).state;
  if (s.phase !== "theatre") s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
  for (const x of steps) {
    const r = reduce(c, s, { type: "operate", op: x.op, ...(x.actor ? { actor: x.actor } : {}) } as ClinicalAction);
    if (r.rejected) throw new Error(`${x.op.op} by ${x.actor ?? "the operator"}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}

/** The engine's verdict on the learner's own step: their place's member as its actor (none operating), as the session sends it. */
function engineTakes(c: CaseDefinition, s: SessionState, op: ProcedureOp): boolean {
  const me = refOfBody(c, s, LEARNER_BODY);
  if (me === null) return false;
  return !reduce(c, s, { type: "operate", op, ...(me ? { actor: me } : {}) } as ClinicalAction).rejected;
}

/** Core's gates before the physics, for the learner's step: the oracle the acceptance names (`seatCheck`, with each body's controls). */
function gatesLetThrough(f: FieldSeat, op: ProcedureOp): boolean {
  const me = refOfBody(f.c, f.s, LEARNER_BODY);
  if (me === null) return false;
  const step = normaliseStep(f.c, f.s, op, me);
  if (step.actor !== undefined && !COLLEAGUE_OPS.has(step.op.op)) return false;
  if (stepPartyRefusal(f.c, f.s, step.op, step.actor)) return false;
  const controlsOf = (who: string): Controls => bodyControls(f.c, f.s, f.facility, memberBody(f.c, f.s, who), "field");
  return seatCheck(f.c, { ...f.s, procedure: procedureStateOf(f.s) }, step.op, step.actor, controlsOf) === null;
}

const field = (s: SessionState): FieldView => observeField(def, s.procedure!);
const seatOf = (s: SessionState, c: CaseDefinition = k): FieldSeat => ({ c, s, facility: null });

/** The operator's access: four ports (D an assist port), the gas, the scope in A, a grasper in B, the Maryland in C. */
const ACCESS = (operator?: string): Step[] =>
  [
    { op: "plan-ports", plan: "mirror-four-port" },
    { op: "insufflate", pressure: 12 },
    { op: "insert", port: "A", instrument: "laparoscope" },
    { op: "insert", port: "B", instrument: "grasper" },
    { op: "insert", port: "C", instrument: "maryland" },
  ].map((op) => ({ op: op as ProcedureOp, ...(operator ? { actor: operator } : {}) }));

/** The operator's access in the scrub nurse's place: each instrument passed by the learner's place (`nurse-2`) first. */
const SCRUB_ACCESS: Step[] = ACCESS("doc-0").flatMap((x) => (x.op.op === "insert" ? [{ op: { op: "pass", instrument: x.op.instrument } as ProcedureOp, actor: "nurse-2" }, x] : [x]));

/** The places, with the field after the operator's access. */
const PLACES = [
  { name: "operating (no place)", start: { type: "start" } as Start, steps: ACCESS() },
  { name: "first assistant, two surgeons (traction, suction, the camera)", start: { type: "start", seat: "first-assistant" } as Start, steps: ACCESS("doc-0") },
  { name: "first assistant, three surgeons (traction, suction)", start: { type: "start", seat: "first-assistant", lineup: "three-surgeons" } as Start, steps: ACCESS("doc-0") },
  { name: "second assistant, three surgeons (the camera, traction, suction)", start: { type: "start", seat: "second-assistant", lineup: "three-surgeons" } as Start, steps: ACCESS("doc-0") },
  { name: "scrub nurse (the instrument table, the count)", start: { type: "start", seat: "scrub-nurse" } as Start, steps: SCRUB_ACCESS },
] as const;

describe("the window by place: core's verdicts, never a rule of the web's own", () => {
  it("every port offer of every place is what core's gates say — and the engine takes each offer and refuses each step not offered", () => {
    for (const place of PLACES) {
      const s = encounter(place.start, place.steps);
      const f = seatOf(s);
      const me = learnerRef(f);
      const offers = portsForPlace(f, def, field(s));
      for (const offer of offers) {
        const label = `${place.name} · port ${offer.port}`;
        // Take: a port the operator holds, into the learner's place (operating, nothing to take)
        const take = typeof me === "string" && offer.instrument && offer.holder.kind === "operator" ? { op: "hand-over" as const, port: offer.port, to: me } : null;
        expect(offer.take, label).toEqual(take && gatesLetThrough(f, take) ? take : null);
        if (take) expect(engineTakes(k, s, take), `${label} take`).toBe(!!offer.take);
        // Hand to: the members of the team as it is whose controls cover the port's instrument (never anyone else)
        const members = new Set(effectiveTeam(k, s).map((m) => m.staff));
        for (const to of ["nurse-1", "nurse-2", "doc-1", "doc-2", "anaes-1"]) {
          const op = { op: "hand-over" as const, port: offer.port, to };
          const offered = offer.handTo.some((x) => x.to === to);
          if (offer.instrument && offer.mine) expect(offered, `${label} hand to ${to}`).toBe(members.has(to) && to !== me && gatesLetThrough(f, op));
          else expect(offered, `${label} hand to ${to}`).toBe(false);
          if (offered) expect(engineTakes(k, s, op), `${label} hand to ${to}`).toBe(true);
        }
        // an insert into the empty assist port: a colleague's only what fits and their controls cover
        if (!offer.instrument && typeof me === "string") {
          for (const instrument of def.instruments.map((i) => i.id)) {
            const op = { op: "insert" as const, port: offer.port, instrument };
            const insert = offer.insert.includes(instrument) || offer.askFor.some((a) => a.instrument === instrument);
            if (insert) expect(gatesLetThrough(f, op), `${label} insert ${instrument}`).toBe(true);
            if (offer.insert.includes(instrument)) expect(engineTakes(k, s, op), `${label} insert ${instrument}`).toBe(true);
            if (!insert) expect(engineTakes(k, s, op), `${label} insert ${instrument} (not offered)`).toBe(false);
          }
        }
      }
    }
  });

  it("Take, Hand back and Hand to are offered by the controls of each place", () => {
    const takes = (start: Start, steps: Step[] = ACCESS("doc-0")) => portsForPlace(seatOf(encounter(start, steps)), def, field(encounter(start, steps))).filter((o) => o.take).map((o) => o.port);
    // the camera is the first assistant's while no second assistant is present
    expect(takes({ type: "start", seat: "first-assistant" })).toEqual(["A", "B"]);
    expect(takes({ type: "start", seat: "first-assistant", lineup: "three-surgeons" })).toEqual(["B"]);
    expect(takes({ type: "start", seat: "second-assistant", lineup: "three-surgeons" })).toEqual(["A", "B"]);
    expect(takes({ type: "start", seat: "scrub-nurse" }, SCRUB_ACCESS)).toEqual([]);
    // the Maryland is the operator's own: nobody takes it
    for (const place of PLACES) expect(portsForPlace(seatOf(encounter(place.start, place.steps)), def, field(encounter(place.start, place.steps))).find((o) => o.port === "C")!.take, place.name).toBeNull();

    // operating: each port handed only to whom its instrument's control covers
    const handTo = (start: Start) => {
      const s = encounter(start, ACCESS());
      return Object.fromEntries(portsForPlace(seatOf(s), def, field(s)).map((o) => [o.port, o.handTo.map((x) => x.to)]));
    };
    expect(handTo({ type: "start" })).toEqual({ A: ["doc-1"], B: ["doc-1"], C: [], D: [] });
    expect(handTo({ type: "start", lineup: "three-surgeons" })).toEqual({ A: ["doc-2"], B: ["doc-1", "doc-2"], C: [], D: [] });

    // the first assistant takes the grasper: theirs now — hand it back, or hand it on to the second assistant
    const s = encounter({ type: "start", seat: "first-assistant", lineup: "three-surgeons" }, [...ACCESS("doc-0"), { op: { op: "hand-over", port: "B", to: "doc-1" }, actor: "doc-1" }]);
    const b = portsForPlace(seatOf(s), def, field(s)).find((o) => o.port === "B")!;
    expect(b).toMatchObject({ holder: { kind: "you" }, mine: true, take: null, handBack: { op: "hand-over", port: "B" }, withdraw: { op: "withdraw", port: "B" } });
    expect(b.handTo.map((x) => x.to)).toEqual(["doc-2"]);
    for (const op of [b.handBack!, b.withdraw!, b.handTo[0]!.op]) expect(engineTakes(k, s, op), op.op).toBe(true);
    // the stand-in's ports read as the operator's (by name in the window), the learner's as "you"
    expect(portsForPlace(seatOf(s), def, field(s)).find((o) => o.port === "A")!.holder).toEqual({ kind: "operator", ref: "doc-0" });
    expect(holderOf(seatOf(s), "doc-1")).toEqual({ kind: "you" });
    expect(holderOf(seatOf(encounter({ type: "start" }, ACCESS())), undefined)).toEqual({ kind: "you" });
  });

  it("two hands: a place holding two ports is offered no third — to take or to put in —, as the engine refuses it", () => {
    const steps = [...ACCESS("doc-0"), { op: { op: "hand-over", port: "A", to: "doc-1" } as ProcedureOp, actor: "doc-1" }];
    const one = encounter({ type: "start", seat: "first-assistant" }, steps);
    expect(portsForPlace(seatOf(one), def, field(one)).find((o) => o.port === "B")!.take).toEqual({ op: "hand-over", port: "B", to: "doc-1" });
    const two = encounter({ type: "start", seat: "first-assistant" }, [...steps, { op: { op: "hand-over", port: "B", to: "doc-1" }, actor: "doc-1" }]);
    const d = portsForPlace(seatOf(two), def, field(two)).find((o) => o.port === "D")!;
    expect([d.insert, d.askFor]).toEqual([[], []]);
    expect(engineTakes(k, two, { op: "insert", port: "D", instrument: "suction" })).toBe(false);
    // handed one back, the hand is free again
    const back = encounter({ type: "start", seat: "first-assistant" }, [...steps, { op: { op: "hand-over", port: "B", to: "doc-1" }, actor: "doc-1" }, { op: { op: "hand-over", port: "B" }, actor: "doc-1" }]);
    expect(portsForPlace(seatOf(back), def, field(back)).find((o) => o.port === "D")!.insert).toEqual(["grasper", "suction"]);
  });

  it("the actions through a port: only one the learner holds — operating, all its instrument does; in a place, the place's by its controls", () => {
    const operating = encounter({ type: "start" }, ACCESS());
    const at = (s: SessionState, port: string) => field(s).ports.find((p) => p.port === port)!;
    expect(controlsForPlace(seatOf(operating), at(operating, "C"))).toEqual(["retract", "dissect", "isolate", "coagulate"]);
    expect(controlsForPlace(seatOf(operating), at(operating, "A"))).toEqual(["aim", "zoom"]);
    // handed to the first assistant: the operator works it no more until it comes back
    const handed = encounter({ type: "start" }, [...ACCESS(), { op: { op: "hand-over", port: "B", to: "doc-1" } }]);
    expect(controlsForPlace(seatOf(handed), at(handed, "B"))).toEqual([]);
    // in a place: through the ports the place holds, what its controls cover — never the operator's own steps
    const first = encounter({ type: "start", seat: "first-assistant" }, [...ACCESS("doc-0"), { op: { op: "hand-over", port: "B", to: "doc-1" }, actor: "doc-1" }, { op: { op: "insert", port: "D", instrument: "suction" }, actor: "doc-1" }]);
    expect(controlsForPlace(seatOf(first), at(first, "B"))).toEqual(["retract"]);
    expect(controlsForPlace(seatOf(first), at(first, "D"))).toEqual(["suction", "irrigate"]);
    expect(controlsForPlace(seatOf(first), at(first, "C"))).toEqual([]);
    expect(stepOffered(seatOf(first), { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false })).toBe(false);
    expect(stepOffered(seatOf(first), { op: "recognise", injury: "bleeding" })).toBe(true);
    // the Maryland handed to a place? its control is nobody's but the operator's
    const maryland = encounter({ type: "start", seat: "first-assistant" }, ACCESS("doc-0"));
    expect(stepOffered(seatOf(maryland), { op: "hand-over", port: "C", to: "doc-1" })).toBe(false);
    expect(engineTakes(k, maryland, { op: "hand-over", port: "C", to: "doc-1" })).toBe(false);
  });
});

describe("the camera block: aimed only by the camera holder, or by the operator on an unheld camera port", () => {
  const aims = (s: SessionState) => cameraOffer(seatOf(s), field(s))?.aims ?? null;
  const aimOp: ProcedureOp = { op: "aim", port: "A", at: "hepatocystic-triangle" };

  it("operating: the operator aims while nobody holds the camera port, not once it is handed to the camera holder", () => {
    const free = encounter({ type: "start" }, ACCESS());
    expect(cameraOffer(seatOf(free), field(free))).toMatchObject({ port: "A", at: null, zoom: "wide", holder: { kind: "you" }, aims: true });
    expect(engineTakes(k, free, aimOp)).toBe(true);
    const handed = encounter({ type: "start" }, [...ACCESS(), { op: { op: "hand-over", port: "A", to: "doc-1" } }]);
    expect(cameraOffer(seatOf(handed), field(handed))).toMatchObject({ holder: { kind: "colleague", ref: "doc-1" }, aims: false });
    expect(engineTakes(k, handed, aimOp)).toBe(false);
  });

  it("in a place: only the camera holder — after taking the camera port, with the camera control", () => {
    for (const [start, holds] of [
      [{ type: "start", seat: "first-assistant" }, true],
      [{ type: "start", seat: "second-assistant", lineup: "three-surgeons" }, true],
      [{ type: "start", seat: "first-assistant", lineup: "three-surgeons" }, false],
      [{ type: "start", seat: "scrub-nurse" }, false],
    ] as [Start, boolean][]) {
      const steps = start.seat === "scrub-nurse" ? SCRUB_ACCESS : ACCESS("doc-0");
      const before = encounter(start, steps);
      // the operator holds it: not the place's to aim
      expect(aims(before), `${start.seat} ${start.lineup}`).toBe(false);
      expect(engineTakes(k, before, aimOp)).toBe(false);
      const me = learnerRef(seatOf(before)) as string;
      const take: ProcedureOp = { op: "hand-over", port: "A", to: me };
      expect(engineTakes(k, before, take), `${start.seat} ${start.lineup} takes the camera`).toBe(holds);
      if (!holds) continue;
      const after = encounter(start, [...steps, { op: take, actor: me }]);
      expect(aims(after)).toBe(true);
      expect(engineTakes(k, after, aimOp)).toBe(true);
    }
    // a camera nobody may aim from where it is: no laparoscope in a camera port
    const dark = encounter({ type: "start", seat: "first-assistant" }, ACCESS("doc-0").slice(0, 2));
    expect(cameraOffer(seatOf(dark), field(dark))).toBeNull();
  });
});

describe("the instrument table and 'Ask for': every instrument passed first in the scrub nurse's place", () => {
  /** The team with a scrub nurse who also holds the camera (a member's own controls) and a second one at the instrument table. */
  const two = lapCholeTeamCase({
    team: {
      room: "theatre-1",
      phases: ["theatre"],
      members: [
        { staff: "nurse-1", duties: ["circulate"] },
        { staff: "nurse-2", duties: ["count", "instruments"], controls: ["instruments", "count", "camera"] },
        { staff: "nurse-3", duties: ["instruments"] },
        { staff: "doc-1", duties: ["assist"] },
        { staff: "anaes-1", duties: ["anaesthesia"] },
        { staff: "surgeon", duties: ["surgeon"], standIn: "doc-0" },
      ],
    },
  });
  const open: Step[] = [
    { op: { op: "plan-ports", plan: "mirror-four-port" }, actor: "doc-0" },
    { op: { op: "insufflate", pressure: 12 }, actor: "doc-0" },
  ];
  const portA = (s: SessionState, c: CaseDefinition) => portsForPlace(seatOf(s, c), c.procedure!, observeField(c.procedure!, s.procedure!)).find((o) => o.port === "A")!;

  it("'Ask for' replaces the insert while a pass is required and none is waiting — and the insert comes back once one waits", () => {
    const scrub = encounter({ type: "start", seat: "scrub-nurse" }, open, two);
    expect(portA(scrub, two)).toMatchObject({ insert: [], askFor: [{ instrument: "laparoscope", to: "nurse-3" }] });
    // the engine says the same: no insert before the pass
    expect(reduce(two, scrub, { type: "operate", op: { op: "insert", port: "A", instrument: "laparoscope" }, actor: "nurse-2" }).rejected?.reason?.key).toBe("pass-first");
    const passed = encounter({ type: "start", seat: "scrub-nurse" }, [...open, { op: { op: "pass", instrument: "laparoscope", to: "nurse-2" }, actor: "nurse-3" }], two);
    expect(portA(passed, two)).toMatchObject({ insert: ["laparoscope"], askFor: [] });
    expect(engineTakes(two, passed, { op: "insert", port: "A", instrument: "laparoscope" })).toBe(true);
    // in any other place nothing is passed first: the insert is offered as it is
    const first = encounter({ type: "start", seat: "first-assistant" }, open, two);
    expect(portA(first, two)).toMatchObject({ insert: ["laparoscope"], askFor: [] });
    expect(engineTakes(two, first, { op: "insert", port: "A", instrument: "laparoscope" })).toBe(true);
  });

  it("the table: what is on it and what waits; passing for the place holding the instrument table, to whom the gates allow", () => {
    const scrub = encounter({ type: "start", seat: "scrub-nurse" }, SCRUB_ACCESS.slice(0, 3));
    const offer = tableOffer(seatOf(scrub), def, field(scrub));
    expect(offer.instruments).toEqual(def.instruments.map((i) => i.id as InstrumentId));
    expect(offer.passed).toEqual([{ instrument: "laparoscope", by: "nurse-2" }]);
    expect(offer.pass?.to).toEqual([undefined, "nurse-1", "doc-1", "anaes-1"]);
    for (const to of offer.pass!.to) expect(engineTakes(k, scrub, { op: "pass", instrument: "grasper", ...(to ? { to } : {}) }), String(to)).toBe(true);
    for (const place of PLACES.filter((p) => p.start.seat !== "scrub-nurse")) {
      const s = encounter(place.start, place.steps);
      expect(tableOffer(seatOf(s), def, field(s)).pass, place.name).toBeNull();
      expect(engineTakes(k, s, { op: "pass", instrument: "grasper" }), place.name).toBe(false);
    }
  });
});
