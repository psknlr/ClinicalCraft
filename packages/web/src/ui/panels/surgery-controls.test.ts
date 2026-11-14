/**
 * The surgery window by place (docs/PROCEDURE.md §7): what each place in the care team is offered is the field's own
 * verdict — its gates (core `fieldGate`: the session's precheck of a step) and then the engine's (the reducer, which the
 * window asks without taking the step: core `operateRefusal`) — never a rule of the web's own: Take, Hand back and Hand
 * to (to a colleague at the operating table: the world's rule) by the controls, consent and two hands; the camera aimed
 * only by the camera holder, or by the operator while nobody holds the camera port; "Ask for" instead of an insert where
 * every instrument is passed first (the scrub nurse's place) and none waits; no insert before the gas; passing for the
 * place that holds the instrument table, each instrument to whoever may put it in. Every candidate step is checked both
 * ways against the session: an offer is taken, a step not offered is refused.
 */
import {
  createSession,
  effectiveTeam,
  fieldGate,
  LEARNER_BODY,
  observeField,
  reduce,
  refOfBody,
  type CaseDefinition,
  type ClinicalAction,
  type FacilityDefinition,
  type FieldView,
  type InstrumentId,
  type ProcedureOp,
  type SessionState,
} from "@clinicalcraft/core";
import { atOperatingTable } from "@clinicalcraft/world";
import { describe, expect, it } from "vitest";
import { STAFF, theatreWorld, standBeside, operate as operateIn } from "../../../../world/src/__fixtures__/theatre.js";
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

/**
 * What the session does with the learner's step: its precheck before any approval (core `fieldGate`, each body's
 * controls) and then the engine (the reducer) — the oracle every offer is checked against, both ways.
 */
function sessionTakes(f: FieldSeat, op: ProcedureOp): boolean {
  return fieldGate(f.c, f.s, f.facility, op, LEARNER_BODY) === null && engineTakes(f.c, f.s, op);
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

describe("the window by place: the field's own verdicts, never a rule of the web's own", () => {
  it("every port offer of every place is what the session would take — each offer taken, each step not offered refused", () => {
    // the places as the operator's access leaves them, and after the place has taken the grasper in port B
    const states = PLACES.flatMap((place) => {
      const s = encounter(place.start, place.steps);
      const me = learnerRef(seatOf(s));
      const took = typeof me === "string" && sessionTakes(seatOf(s), { op: "hand-over", port: "B", to: me }) ? [{ name: `${place.name}, holding port B`, s: encounter(place.start, [...place.steps, { op: { op: "hand-over", port: "B", to: me }, actor: me }]) }] : [];
      return [{ name: place.name, s }, ...took];
    });
    for (const { name, s } of states) {
      const f = seatOf(s);
      const me = learnerRef(f);
      const offers = portsForPlace(f, def, field(s));
      for (const offer of offers) {
        const label = `${name} · port ${offer.port}`;
        // Take: into the learner's place — or, operating, back from the colleague who holds it
        const take: ProcedureOp | null = offer.mine || !offer.instrument ? null : me === undefined ? { op: "hand-over", port: offer.port } : { op: "hand-over", port: offer.port, to: me! };
        if (take) expect(offer.take, `${label} take`).toEqual(sessionTakes(f, take) ? take : null);
        else expect(offer.take, `${label} take`).toBeNull();
        // Hand back (a place's own port) and withdraw: what the session takes
        if (offer.mine && offer.instrument && me !== undefined) {
          const back: ProcedureOp = { op: "hand-over", port: offer.port };
          expect(offer.handBack, `${label} hand back`).toEqual(sessionTakes(f, back) ? back : null);
          const out: ProcedureOp = { op: "withdraw", port: offer.port };
          expect(offer.withdraw, `${label} withdraw`).toEqual(sessionTakes(f, out) ? out : null);
        }
        // Hand to: every member of the team as it is but the learner's place, both ways (never anyone else)
        const members = new Set(effectiveTeam(k, s).map((m) => m.staff));
        for (const to of ["nurse-1", "nurse-2", "nurse-9", "doc-0", "doc-1", "doc-2", "anaes-1"]) {
          const op: ProcedureOp = { op: "hand-over", port: offer.port, to };
          const offered = offer.handTo.some((x) => x.to === to);
          const want = !!offer.instrument && offer.mine && members.has(to) && to !== me && to !== "doc-0" && sessionTakes(f, op);
          expect(offered, `${label} hand to ${to}`).toBe(want);
        }
        // an insert into an empty port: a colleague's, what the session takes ("Ask for" where it needs a pass first)
        if (!offer.instrument && typeof me === "string") {
          for (const instrument of def.instruments.map((i) => i.id)) {
            const op: ProcedureOp = { op: "insert", port: offer.port, instrument };
            expect(offer.insert.includes(instrument), `${label} insert ${instrument}`).toBe(sessionTakes(f, op));
            if (offer.askFor.some((a) => a.instrument === instrument)) expect(fieldGate(k, s, null, op, LEARNER_BODY), `${label} ask for ${instrument}`).toBeNull();
          }
        }
      }
    }
  });

  it("no insert before the gas: the engine's own verdict, in a place — not a gate the window could offer through", () => {
    const plan = encounter({ type: "start", seat: "first-assistant" }, ACCESS("doc-0").slice(0, 1));
    const a = portsForPlace(seatOf(plan), def, field(plan)).find((o) => o.port === "A")!;
    expect(stepOffered(seatOf(plan), { op: "insert", port: "A", instrument: "laparoscope" })).toBe(true);
    expect(engineTakes(k, plan, { op: "insert", port: "A", instrument: "laparoscope" })).toBe(false);
    expect([a.insert, a.askFor]).toEqual([[], []]);
    const gas = encounter({ type: "start", seat: "first-assistant" }, ACCESS("doc-0").slice(0, 2));
    expect(portsForPlace(seatOf(gas), def, field(gas)).find((o) => o.port === "A")!.insert).toEqual(["laparoscope"]);
  });

  it("Hand to only a colleague at the operating table — the world's own rule (a port held away from it is let go at once)", () => {
    const w = theatreWorld();
    operateIn(w, ACCESS());
    const seatIn = (): FieldSeat => ({ c: w.caseDef, s: w.harness.state(), facility: w.facility, atTable: (body) => atOperatingTable(w.runtime, body) });
    const handTo = () => portsForPlace(seatIn(), w.caseDef.procedure!, observeField(w.caseDef.procedure!, w.harness.state().procedure!)).find((o) => o.port === "B")!.handTo.map((x) => x.to);
    // the first assistant at their post, across the theatre: not handed the grasper
    expect(atOperatingTable(w.runtime, STAFF.first)).toBe(false);
    expect(handTo()).toEqual([]);
    // beside the patient on the table: handed it
    standBeside(w, STAFF.first, w.patientId);
    expect(atOperatingTable(w.runtime, STAFF.first)).toBe(true);
    expect(handTo()).toEqual(["doc-1"]);
    // no world (clinical mode): no table rule
    expect(portsForPlace({ ...seatIn(), atTable: undefined }, w.caseDef.procedure!, observeField(w.caseDef.procedure!, w.harness.state().procedure!)).find((o) => o.port === "B")!.handTo.map((x) => x.to)).toEqual(["doc-1"]);
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
    expect(cameraOffer(seatOf(free), field(free))?.refusal).toBeUndefined();
    expect(engineTakes(k, free, aimOp)).toBe(true);
    const handed = encounter({ type: "start" }, [...ACCESS(), { op: { op: "hand-over", port: "A", to: "doc-1" } }]);
    // not the operator's while the camera holder has it: the field's own reason
    expect(cameraOffer(seatOf(handed), field(handed))).toMatchObject({ holder: { kind: "colleague", ref: "doc-1" }, aims: false, refusal: { key: "port-held", params: { holder: "doc-1", port: "A" } } });
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
      // the operator holds it: not the place's to aim — not handed to them, or not their control
      expect(aims(before), `${start.seat} ${start.lineup}`).toBe(false);
      expect(cameraOffer(seatOf(before), field(before))?.refusal?.key, `${start.seat} ${start.lineup}`).toBe(holds ? "not-handed" : "needs-control");
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

  it("the table: what is on it and what waits; passing for the place holding the instrument table — each instrument to whoever may put it in", () => {
    const scrub = encounter({ type: "start", seat: "scrub-nurse" }, SCRUB_ACCESS.slice(0, 3));
    const f = seatOf(scrub);
    const offer = tableOffer(f, def, field(scrub));
    expect(offer.instruments).toEqual(def.instruments.map((i) => i.id as InstrumentId));
    expect(offer.passed).toEqual([{ instrument: "laparoscope", by: "nurse-2" }]);
    // the operator puts in every instrument; the first assistant (two surgeons) the grasper, the suction and the
    // laparoscope (the camera holder) — never an operating instrument; the circulating nurse and the anaesthetist nothing
    expect(offer.pass?.to).toMatchObject({ grasper: [undefined, "doc-1"], suction: [undefined, "doc-1"], hook: [undefined], "clip-applier": [undefined], maryland: [undefined] });
    // the laparoscope passed already waits for the operator: passed again only to the camera holder
    expect(offer.pass?.to.laparoscope).toEqual(["doc-1"]);
    for (const [instrument, takers] of Object.entries(offer.pass!.to) as [InstrumentId, (string | undefined)[]][]) {
      for (const to of [undefined, "nurse-1", "doc-1", "anaes-1"]) {
        const op: ProcedureOp = { op: "pass", instrument, ...(to ? { to } : {}) };
        if (takers.includes(to)) expect(sessionTakes(f, op), `${instrument} to ${to}`).toBe(true);
        else if (to === undefined || to === "doc-1") expect(sessionTakes(f, op) && !(instrument === "laparoscope" && to === undefined), `${instrument} to ${to}`).toBe(false);
      }
      expect(takers.filter((x) => x === "nurse-1" || x === "anaes-1"), instrument).toEqual([]);
    }
    for (const place of PLACES.filter((p) => p.start.seat !== "scrub-nurse")) {
      const s = encounter(place.start, place.steps);
      expect(tableOffer(seatOf(s), def, field(s)).pass, place.name).toBeNull();
      expect(engineTakes(k, s, { op: "pass", instrument: "grasper" }), place.name).toBe(false);
    }
  });
});
