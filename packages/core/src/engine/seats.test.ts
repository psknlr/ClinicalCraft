/**
 * Positions, places and controls (docs/TEAM.md §1): every position's default controls, the old name of the first
 * assistant, a member's position (their own, else their duties by priority), the camera following who is present (two
 * surgeons, three, one away, an override), the places a learner may take, the bodies of the members with and without a
 * place, and the controls the field and the world read — and the operative field's gate by control (`seatCheck`,
 * docs/PROCEDURE.md §3): what each member, a colleague outside the team and the operator may do, the stand-in surgeon
 * normalised to the operator, and the places a condition's `by` names.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { FacilityDefinition } from "../schema/facility.js";
import {
  canonicalPosition,
  DEFAULT_CONTROLS,
  FIELD_CONTROLS,
  isSterilePosition,
  NON_STERILE_CONTROLS,
  POSITION_TITLES,
  StaffPositionSchema,
  SURGICAL_CONTROLS,
  type StaffPosition,
} from "../schema/positions.js";
import type { ProcedureOp } from "../schema/procedure.js";
import { PLACES_TEAM, placesCase } from "./__fixtures__/team-places.js";
import { lapCholeTeamCase } from "./procedure/__fixtures__/lap-chole-team.js";
import { COLLEAGUE_OPS, createProcedureState, operate } from "./procedure/index.js";
import { createSession, reduce } from "./reducer.js";
import {
  bodyControls,
  canJoinTeam,
  dutyPosition,
  effectiveTeam,
  fieldControlFor,
  fieldControls,
  initialPhase,
  instrumentControl,
  isPlace,
  joinPath,
  LEARNER_BODY,
  memberBody,
  memberControls,
  memberPosition,
  normaliseStep,
  operatorOf,
  passingRequired,
  placeRefs,
  refOfBody,
  seatCheck,
  seatMember,
  seatsOf,
  staffPosition,
  standingBy,
  type Controls,
  type TeamChoice,
} from "./seats.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const MINI: Json = JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));
const c = placesCase(MINI);
const team = (patch: (t: Json) => void): CaseDefinition => {
  const t = structuredClone(PLACES_TEAM) as Json;
  patch(t);
  return placesCase(MINI, t);
};

/** The facility's staff as the resolvers read them (only `staff` is read). */
const FACILITY = {
  staff: [
    { id: "nurse-1", role: "nurse", room: "consult" },
    { id: "doc-0", role: "attending", room: "consult", position: "surgeon" },
    { id: "doc-2", role: "attending", room: "consult", position: "physician" },
    { id: "anaes-2", role: "attending", room: "consult", position: "anaesthetist" },
    { id: "mori", role: "attending", room: "consult", position: "assistant-surgeon" },
    { id: "porter-1", role: "porter", room: "consult" },
  ],
} as unknown as FacilityDefinition;

describe("positions and their default controls", () => {
  it("every position has its defaults; the sterile field's controls only on scrubbed positions, the equipment and the anaesthetic only on the others", () => {
    expect(Object.keys(DEFAULT_CONTROLS).sort()).toEqual([...StaffPositionSchema.options].sort());
    expect(Object.keys(POSITION_TITLES).sort()).toEqual([...StaffPositionSchema.options].sort());
    expect(DEFAULT_CONTROLS).toMatchObject({
      surgeon: ["operate", "camera", "retract", "suction", "close"],
      "first-assistant": ["retract", "suction"],
      "assistant-surgeon": ["retract", "suction"],
      "second-assistant": ["camera", "retract", "suction"],
      "scrub-nurse": ["instruments", "count"],
      "circulating-nurse": ["count", "equipment"],
      anaesthetist: ["anaesthesia"],
      "ward-nurse": [],
      porter: [],
    });
    for (const p of StaffPositionSchema.options) {
      for (const control of DEFAULT_CONTROLS[p]) {
        expect(SURGICAL_CONTROLS, p).toContain(control);
        if (FIELD_CONTROLS.includes(control)) expect(isSterilePosition(p), `${p} ${control}`).toBe(true);
        if (NON_STERILE_CONTROLS.includes(control)) expect(isSterilePosition(p), `${p} ${control}`).toBe(false);
      }
    }
    // the surgeon's controls cover every assistant's work: no reference path depends on an assistant
    for (const p of ["first-assistant", "second-assistant"] as const) for (const control of DEFAULT_CONTROLS[p]) expect(DEFAULT_CONTROLS.surgeon).toContain(control);
  });

  it("the assistant surgeon is the first assistant's old name: one position for controls, places and sterility, a card of its own", () => {
    expect(canonicalPosition("assistant-surgeon")).toBe("first-assistant");
    expect(canonicalPosition("second-assistant")).toBe("second-assistant");
    expect(isSterilePosition("assistant-surgeon")).toBe(true);
    expect(POSITION_TITLES["assistant-surgeon"]).toEqual({ en: "assistant surgeon", "zh-CN": "助手医生" });
    expect(POSITION_TITLES["first-assistant"]).toEqual({ en: "first assistant", "zh-CN": "第一助手" });
  });
});

describe("a member's position", () => {
  it("their own position, else their duties by priority — never their order: [count, instruments] is a scrub nurse", () => {
    expect(dutyPosition(["count", "instruments"])).toBe("scrub-nurse");
    expect(dutyPosition(["count", "circulate"])).toBe("circulating-nurse");
    expect(dutyPosition(["assist"])).toBe("first-assistant");
    expect(memberPosition(c, {}, "nurse-2")).toBe("scrub-nurse");
    expect(memberPosition(c, {}, "doc-1")).toBe("first-assistant");
    expect(memberPosition(c, {}, "surgeon")).toBe("surgeon");
    // a line-up's assistant is a member only with that line-up; a relief colleague only in that scenario
    expect(memberPosition(c, {}, "doc-2")).toBeNull();
    expect(memberPosition(c, { lineup: "three-surgeons" }, "doc-2")).toBe("second-assistant");
    expect(memberPosition(c, { teamScenario: "scrub-break" }, "nurse-9")).toBe("scrub-nurse");
  });

  it("for cards and dress: the team's position, the facility's, the duties by priority (line-ups and relief too), the role's", () => {
    expect(staffPosition(c, FACILITY, "doc-2")).toBe("second-assistant"); // the team's, over the facility's "physician"
    expect(staffPosition(c, FACILITY, "staff:mori")).toBe("assistant-surgeon");
    expect(staffPosition(c, FACILITY, "nurse-2")).toBe("scrub-nurse");
    expect(staffPosition(c, FACILITY, "nurse-9")).toBe("scrub-nurse");
    expect(staffPosition(c, FACILITY, "nurse-1")).toBe("circulating-nurse");
    expect(staffPosition(c, FACILITY, "porter-1")).toBe("porter");
    expect(staffPosition(c, FACILITY, "nobody")).toBeNull();
  });

  it("the team as it is: the line-up's assistants and the scenario's relief join, whoever is absent is not there", () => {
    const ids = (choice: TeamChoice) => effectiveTeam(c, choice).map((m) => m.staff);
    expect(ids({})).toEqual(["nurse-1", "nurse-2", "doc-1", "anaes-1", "surgeon"]);
    expect(ids({ lineup: "three-surgeons" })).toEqual(["nurse-1", "nurse-2", "doc-1", "anaes-1", "surgeon", "doc-2"]);
    expect(ids({ teamScenario: "scrub-break" })).toEqual(["nurse-1", "doc-1", "anaes-1", "surgeon", "nurse-9"]);
    expect(ids({ lineup: "three-surgeons", teamScenario: "second-away" })).toEqual(["nurse-1", "nurse-2", "doc-1", "anaes-1", "surgeon"]);
    expect(effectiveTeam(placesCase(MINI, undefined, { team: undefined }), {})).toEqual([]);
  });
});

describe("the camera follows who is present", () => {
  it("two surgeons: the first assistant holds it; a three-surgeon line-up gives it to the second; with the second away it comes back", () => {
    expect(memberControls(c, {}, "doc-1")).toEqual(["camera", "retract", "suction"]);
    expect(memberControls(c, { lineup: "three-surgeons" }, "doc-1")).toEqual(["retract", "suction"]);
    expect(memberControls(c, { lineup: "three-surgeons" }, "doc-2")).toEqual(["camera", "retract", "suction"]);
    expect(memberControls(c, { lineup: "three-surgeons", teamScenario: "second-away" }, "doc-1")).toEqual(["camera", "retract", "suction"]);
  });

  it("never from the learner's place: the camera stays where it is whichever place the learner takes", () => {
    for (const seat of ["first-assistant", "scrub-nurse"] as const) expect(memberControls(c, { seat }, "doc-1")).toEqual(["camera", "retract", "suction"]);
    expect(memberControls(c, { seat: "second-assistant", lineup: "three-surgeons" }, "doc-2")).toEqual(["camera", "retract", "suction"]);
  });

  it("a member's own controls win: the surgeon keeps the camera, or the scrub nurse holds it too", () => {
    const surgeonsCamera = team((t) => (t.members[2].controls = ["retract", "suction"]));
    expect(memberControls(surgeonsCamera, {}, "doc-1")).toEqual(["retract", "suction"]);
    const scrubCamera = team((t) => (t.members[1].controls = ["count", "camera", "instruments"]));
    expect(memberControls(scrubCamera, {}, "nurse-2")).toEqual(["camera", "instruments", "count"]);
    expect(memberControls(c, {}, "surgeon")).toEqual(["operate", "camera", "retract", "suction", "close"]);
    expect(memberControls(c, {}, "nurse-1")).toEqual(["count", "equipment"]);
    expect(memberControls(c, {}, "anaes-1")).toEqual(["anaesthesia"]);
    expect(memberControls(c, {}, "doc-0")).toBeNull();
  });
});

describe("places", () => {
  it("the operating surgeon's always; a place in the team with a stand-in and a present member in it, per line-up and scenario", () => {
    expect(seatsOf(c)).toEqual(["surgeon", "first-assistant", "scrub-nurse"]);
    expect(seatsOf(c, { lineup: "three-surgeons" })).toEqual(["surgeon", "first-assistant", "second-assistant", "scrub-nurse"]);
    expect(seatsOf(c, { lineup: "three-surgeons", teamScenario: "second-away" })).toEqual(["surgeon", "first-assistant", "scrub-nurse"]);
    // the scrub nurse on a break: her place is not offered — a relief colleague is never a place
    expect(seatsOf(c, { teamScenario: "scrub-break" })).toEqual(["surgeon", "first-assistant"]);
    expect(seatsOf(team((t) => delete t.members[4].standIn))).toEqual(["surgeon"]);
    expect(seatsOf(placesCase(MINI, undefined, { team: undefined }))).toEqual(["surgeon"]);
  });

  it("a case served without its reference solution offers the operating surgeon's place only — unless it starts in the team's phase", () => {
    // the content API's form (`publicCase`, `learnerCase`): everything but the solution, parsed as a front-end parses it
    const served = placesCase(MINI, PLACES_TEAM, { solution: undefined });
    expect(served.solution).toEqual([]);
    expect(canJoinTeam(c)).toBe(true);
    expect(canJoinTeam(served)).toBe(false);
    expect(seatsOf(served)).toEqual(["surgeon"]);
    expect(seatsOf(served, { lineup: "three-surgeons" })).toEqual(["surgeon"]);
    // a team that works from the first phase needs no path to join
    const fromTheStart = placesCase(MINI, { ...PLACES_TEAM, phases: ["arrival", "observation"] }, { solution: undefined });
    expect(initialPhase(fromTheStart)).toBe("arrival");
    expect(canJoinTeam(fromTheStart)).toBe(true);
    expect(seatsOf(fromTheStart)).toEqual(["surgeon", "first-assistant", "scrub-nurse"]);
  });

  it("who is who: the member whose place the learner holds, the stand-in operating, the colleague standing by", () => {
    expect(isPlace({})).toBe(false);
    expect(isPlace({ seat: "scrub-nurse" })).toBe(true);
    expect(seatMember(c, {})).toBeUndefined();
    expect(seatMember(c, { seat: "scrub-nurse" })?.staff).toBe("nurse-2");
    expect(seatMember(c, { seat: "second-assistant", lineup: "three-surgeons" })?.staff).toBe("doc-2");
    expect(operatorOf(c, {})).toBeUndefined();
    expect(operatorOf(c, { seat: "first-assistant" })).toBe("doc-0");
    expect(standingBy(c, {})).toBeNull();
    expect(standingBy(c, { seat: "first-assistant" })).toBe("staff:doc-1");
  });

  it("a member's body and a body's member are each other's inverse, with a place and without", () => {
    for (const choice of [{}, { seat: "first-assistant" }, { seat: "scrub-nurse" }, { seat: "second-assistant", lineup: "three-surgeons" }] as TeamChoice[]) {
      const refs = effectiveTeam(c, choice).map((m) => m.staff);
      for (const ref of refs) expect(refOfBody(c, choice, memberBody(c, choice, ref)), `${JSON.stringify(choice)} ${ref}`).toBe(ref === "surgeon" ? undefined : ref);
      for (const body of refs.map((ref) => memberBody(c, choice, ref))) expect(memberBody(c, choice, refOfBody(c, choice, body) ?? "surgeon"), body).toBe(body);
    }
    // without a place the learner operates; in one, the learner is that place's member and the stand-in operates
    expect(memberBody(c, {}, "surgeon")).toBe(LEARNER_BODY);
    expect(refOfBody(c, {}, LEARNER_BODY)).toBeUndefined();
    expect(refOfBody(c, {}, "staff:doc-0")).toBe("doc-0");
    expect(memberBody(c, { seat: "first-assistant" }, "surgeon")).toBe("staff:doc-0");
    expect(memberBody(c, { seat: "first-assistant" }, "doc-1")).toBe(LEARNER_BODY);
    expect(refOfBody(c, { seat: "first-assistant" }, LEARNER_BODY)).toBe("doc-1");
    expect(refOfBody(c, { seat: "first-assistant" }, "staff:doc-0")).toBeUndefined();
  });

  it("a body's member is closed: a call with no body is the learner's; the colleague standing by and every other body have no part in the field", () => {
    for (const choice of [{}, { seat: "first-assistant" }, { seat: "scrub-nurse" }, { seat: "second-assistant", lineup: "three-surgeons" }] as TeamChoice[]) {
      // a call with no body is the learner's body (from the learner, the CLI, MCP or an external clinician)
      expect(refOfBody(c, choice), JSON.stringify(choice)).toBe(refOfBody(c, choice, LEARNER_BODY));
      // only the learner's body and staff bodies have a part in the field: nothing else is the operator
      for (const body of ["patient:bay-1", "actor:ghost", "", "staff:", "clinician"]) expect(refOfBody(c, choice, body), `${JSON.stringify(choice)} ${body}`).toBeNull();
    }
    // in a place, the colleague standing by has no field identity of their own: never taken for the learner's place
    for (const choice of [{ seat: "first-assistant" }, { seat: "scrub-nurse" }, { seat: "second-assistant", lineup: "three-surgeons" }] as TeamChoice[]) {
      const by = standingBy(c, choice)!;
      expect(refOfBody(c, choice, by), by).toBeNull();
      expect(refOfBody(c, choice, LEARNER_BODY)).toBe(by.slice("staff:".length));
    }
    // without a place they are a member like any other
    expect(refOfBody(c, {}, "staff:doc-1")).toBe("doc-1");
    // a place with no member (a choice the start refuses): the learner's body has no part either
    expect(refOfBody(c, { seat: "second-assistant" }, LEARNER_BODY)).toBeNull();
    expect(bodyControls(c, { seat: "second-assistant" }, null, LEARNER_BODY, "field")).toEqual([]);
  });

  it("a body's controls and its member's field controls agree: the learner, the members, the colleague standing by, every refused body", () => {
    for (const choice of [{}, { seat: "first-assistant" }, { seat: "scrub-nurse" }, { seat: "second-assistant", lineup: "three-surgeons" }] as TeamChoice[]) {
      const standIn = choice.seat ? "staff:doc-0" : null;
      const members = effectiveTeam(c, choice).map((m) => memberBody(c, choice, m.staff)).filter((b) => b !== standIn);
      const bodies = [LEARNER_BODY, ...members, ...(choice.seat ? [standingBy(c, choice)!] : []), "patient:bay-1", "actor:ghost", ""];
      for (const body of bodies) {
        expect(fieldControls(c, choice, refOfBody(c, choice, body)), `${JSON.stringify(choice)} ${body}`).toEqual(bodyControls(c, choice, null, body, "field"));
      }
    }
    // the stand-in's steps are the operator's in the field, while their body holds the surgeon member's controls
    expect(fieldControls(c, { seat: "scrub-nurse" }, refOfBody(c, { seat: "scrub-nurse" }, "staff:doc-0"))).toBe("all");
    expect(bodyControls(c, { seat: "scrub-nurse" }, null, "staff:doc-0", "field")).toEqual(memberControls(c, {}, "surgeon"));
    // a refused body works nothing in the field
    expect(fieldControls(c, {}, null)).toEqual([]);
  });
});

describe("controls in the field and in the world", () => {
  it("the field: the operator unrestricted, a member their controls, a colleague outside the team traction and suction", () => {
    expect(fieldControls(c, {}, undefined)).toBe("all");
    expect(fieldControls(c, {}, "surgeon")).toBe("all");
    expect(fieldControls(c, {}, "doc-1")).toEqual(["camera", "retract", "suction"]);
    expect(fieldControls(c, {}, "nurse-2")).toEqual(["instruments", "count"]);
    expect(fieldControls(c, {}, "anaes-1")).toEqual(["anaesthesia"]);
    expect(fieldControls(c, {}, "doc-0")).toEqual(["retract", "suction"]);
    expect(fieldControls(c, {}, "stranger")).toEqual(["retract", "suction"]);
    // in a place the stand-in operates; the learner works as the place's member
    expect(fieldControls(c, { seat: "first-assistant" }, "doc-0")).toBe("all");
    expect(fieldControls(c, { seat: "first-assistant" }, "doc-1")).toEqual(["camera", "retract", "suction"]);
  });

  it("bodies: the learner every control or the place's; the stand-in the surgeon's; the colleague standing by none; outside the team, the position's", () => {
    const body = (choice: TeamChoice, id: string, purpose: "field" | "world") => bodyControls(c, choice, FACILITY, id, purpose);
    expect(body({}, LEARNER_BODY, "world")).toBe("all");
    expect(body({}, LEARNER_BODY, "field")).toBe("all");
    expect(body({ seat: "scrub-nurse" }, LEARNER_BODY, "world")).toEqual(["instruments", "count"]);
    expect(body({ seat: "first-assistant" }, LEARNER_BODY, "field")).toEqual(["camera", "retract", "suction"]);
    expect(body({ seat: "first-assistant" }, "staff:doc-1", "world")).toEqual([]);
    expect(body({ seat: "first-assistant" }, "staff:doc-0", "world")).toEqual(["operate", "camera", "retract", "suction", "close"]);
    expect(body({}, "staff:nurse-2", "world")).toEqual(["instruments", "count"]);
    expect(body({ teamScenario: "scrub-break" }, "staff:nurse-9", "field")).toEqual(["instruments", "count"]);
    // outside the team: the position's defaults in the world; in the field, only the traction and suction they allow
    expect(body({}, "staff:doc-0", "world")).toEqual(["operate", "camera", "retract", "suction", "close"]);
    expect(body({}, "staff:doc-0", "field")).toEqual(["retract", "suction"]);
    expect(body({}, "staff:anaes-2", "world")).toEqual(["anaesthesia"]);
    expect(body({}, "staff:anaes-2", "field")).toEqual([]);
    expect(body({}, "staff:mori", "field")).toEqual(["retract", "suction"]);
    expect(body({}, "staff:porter-1", "world")).toEqual([]);
    expect(body({}, "staff:nobody", "world")).toEqual([]);
    expect(body({}, "patient:bay-1", "world")).toEqual([]);
    // members are resolved without the facility: both questions give one answer
    for (const ref of ["nurse-1", "nurse-2", "doc-1", "anaes-1"]) expect(bodyControls(c, {}, null, `staff:${ref}`, "world")).toEqual(fieldControls(c, {}, ref));
  });
});

describe("the path a place joins after", () => {
  it("the reference solution after its own start, up to a finish or the operation's close", () => {
    expect(joinPath(c)).toEqual(c.solution.slice(1, -1));
    const s = (solution: unknown[]) => joinPath({ solution } as unknown as CaseDefinition);
    expect(s([{ type: "set-phase", phase: "x" }, { type: "start" }, { type: "ask", itemId: "a" }, { type: "operate", op: { op: "close" } }, { type: "ask", itemId: "b" }])).toEqual([{ type: "ask", itemId: "a" }]);
    expect(s([{ type: "ask", itemId: "a" }])).toEqual([{ type: "ask", itemId: "a" }]);
  });

  it("every position the enum knows is a position a member can hold", () => {
    for (const p of StaffPositionSchema.options as readonly StaffPosition[]) expect(team((t) => (t.members[3].position = p)).team!.members[3].position).toBe(p);
  });
});

describe("the operative field's gate by control (seatCheck)", () => {
  const k = lapCholeTeamCase();
  /** The field: four ports — the scope in A, a grasper in B, the hook in C, the suction in D. */
  const field = (() => {
    let f = createProcedureState();
    const ops: ProcedureOp[] = [
      { op: "plan-ports", plan: "mirror-four-port" },
      { op: "insufflate", pressure: 12 },
      { op: "insert", port: "A", instrument: "laparoscope" },
      { op: "insert", port: "B", instrument: "grasper" },
      { op: "insert", port: "C", instrument: "hook" },
      { op: "insert", port: "D", instrument: "suction" },
    ];
    for (const op of ops) f = operate(k.procedure!, f, op, 0).state;
    return f;
  })();
  /** One step of each kind (a hand-over: the actor takes port B for themselves). */
  const steps = (actor: string): Record<string, ProcedureOp> => ({
    aim: { op: "aim", port: "A", at: "hepatocystic-triangle" },
    zoom: { op: "zoom", port: "A", level: "wide" },
    retract: { op: "retract", port: "B", structure: "gallbladder-fundus", direction: ["cephalad"], force: "firm" },
    release: { op: "release", structure: "gallbladder-fundus" },
    suction: { op: "suction", port: "D" },
    irrigate: { op: "irrigate", port: "D" },
    pass: { op: "pass", instrument: "grasper" },
    recognise: { op: "recognise", injury: "bleeding" },
    "scope in": { op: "insert", port: "A", instrument: "laparoscope" },
    "grasper in": { op: "insert", port: "D", instrument: "grasper" },
    "hook in": { op: "insert", port: "D", instrument: "hook" },
    "take the grasper": { op: "hand-over", port: "B", to: actor },
    "hook out": { op: "withdraw", port: "C" },
    dissect: { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false },
  });
  /** What the gate says to each step: "ok", or the control it lacks (`operate`: an instrument only the operator works). */
  const verdicts = (choice: TeamChoice, actor: string, controls?: Controls) =>
    Object.fromEntries(Object.entries(steps(actor)).map(([name, op]) => [name, seatCheck(k, { ...choice, procedure: field }, op, actor, controls)?.reason.params.control ?? "ok"]));
  const ALL_OK = Object.fromEntries(Object.keys(steps("x")).map((name) => [name, "ok"]));
  const CAMERA = { aim: "camera", zoom: "camera", "scope in": "camera" };
  const RETRACT = { retract: "retract", release: "retract", "grasper in": "retract", "take the grasper": "retract" };
  const SUCTION = { suction: "suction", irrigate: "suction" };
  const OPERATOR = { "hook in": "operate", "hook out": "operate" };

  it("the operator is free; the surgeon member is the operator", () => {
    for (const actor of ["surgeon"]) expect(verdicts({}, actor)).toEqual(ALL_OK);
    for (const op of Object.values(steps("doc-1"))) expect(seatCheck(k, { procedure: field }, op)).toBeNull();
  });

  it("the first assistant: the camera, traction and suction with two surgeons; no camera with three; never a pass or an operating instrument", () => {
    expect(verdicts({}, "doc-1")).toEqual({ ...ALL_OK, pass: "instruments", ...OPERATOR });
    expect(verdicts({ lineup: "three-surgeons" }, "doc-1")).toEqual({ ...ALL_OK, pass: "instruments", ...OPERATOR, ...CAMERA });
    // a place does not move the camera: the first assistant's place is the same member's
    expect(verdicts({ seat: "first-assistant" }, "doc-1")).toEqual(verdicts({}, "doc-1"));
  });

  it("the second assistant holds the camera in the three-surgeon line-up; without it they are a colleague outside the team", () => {
    expect(verdicts({ lineup: "three-surgeons" }, "doc-2")).toEqual({ ...ALL_OK, pass: "instruments", ...OPERATOR });
    expect(verdicts({}, "doc-2")).toEqual({ ...ALL_OK, pass: "instruments", ...OPERATOR, ...CAMERA });
  });

  it("the scrub nurse passes — and says an injury aloud — nothing else", () => {
    expect(verdicts({}, "nurse-2")).toEqual({ ...ALL_OK, ...CAMERA, ...RETRACT, ...SUCTION, ...OPERATOR });
    // the relief scrub nurse of a team scenario holds the same controls
    expect(verdicts({ teamScenario: "scrub-break" }, "nurse-9")).toEqual(verdicts({}, "nurse-2"));
  });

  it("an anaesthetist member holds no control of the field: refused traction, never refused saying what they see", () => {
    expect(verdicts({}, "anaes-1")).toEqual({ ...ALL_OK, ...CAMERA, ...RETRACT, ...SUCTION, ...OPERATOR, pass: "instruments" });
    expect(seatCheck(k, { procedure: field }, steps("anaes-1").retract!, "anaes-1")).toEqual({
      code: "invalid",
      message: "anaes-1 cannot retract: it needs the retract control, which anaes-1 does not hold.",
      reason: { key: "needs-control", params: { who: "anaes-1", control: "retract", op: "retract", instrument: "grasper", port: "B" } },
    });
  });

  it("a colleague outside the team keeps traction and suction (no camera); their dissect is left to the field, which says so", () => {
    expect(verdicts({}, "or-7.assistant")).toEqual({ ...ALL_OK, pass: "instruments", ...OPERATOR, ...CAMERA });
    expect(seatCheck(k, { procedure: field }, steps("x").dissect!, "or-7.assistant")).toBeNull();
    let s = reduce(k, createSession(k), { type: "start" }).state;
    s = reduce(k, s, { type: "set-phase", phase: "theatre" }).state;
    const r = reduce(k, s, { type: "operate", op: steps("x").dissect!, actor: "or-7.assistant" });
    expect(r.rejected).toEqual({
      code: "invalid",
      message: 'Only the operator does "dissect": or-7.assistant assists (hand-over, retract, release, withdraw, suction, irrigate).',
      reason: { key: "operator-only", params: { op: "dissect", actor: "or-7.assistant" } },
    });
    // a session narrows a colleague's controls (by their facility position): the narrower set is the one asked
    expect(verdicts({}, "or-7.assistant", [])).toEqual({ ...ALL_OK, pass: "instruments", ...OPERATOR, ...CAMERA, ...RETRACT, ...SUCTION });
  });

  it("a hand-over to a taker without the control is refused, whoever hands it", () => {
    const toScrub: ProcedureOp = { op: "hand-over", port: "B", to: "nurse-2" };
    for (const actor of [undefined, "nurse-2"]) expect(seatCheck(k, { procedure: field }, toScrub, actor)?.reason).toEqual({ key: "needs-control", params: { who: "nurse-2", control: "retract", op: "hand-over", instrument: "grasper", port: "B" } });
    expect(seatCheck(k, { procedure: field }, { op: "hand-over", port: "B", to: "doc-1" })).toBeNull();
    expect(seatCheck(k, { procedure: field }, { op: "hand-over", port: "C", to: "doc-1" })?.message).toBe("The hook is the operator's own instrument: doc-1 cannot take it.");
    // nothing in the port: the field's own refusal ("nothing to hand over")
    const empty = operate(k.procedure!, field, { op: "withdraw", port: "B" }, 0).state;
    expect(seatCheck(k, { procedure: empty }, { op: "hand-over", port: "B", to: "nurse-2" }, "nurse-2")).toBeNull();
  });

  it("the stand-in surgeon is the operator in a place: the actor and a `to` naming them are left out", () => {
    const place: TeamChoice = { seat: "first-assistant" };
    const dissect = steps("x").dissect!;
    expect(normaliseStep(k, place, dissect, "doc-0")).toEqual({ op: dissect });
    expect(normaliseStep(k, place, { op: "hand-over", port: "B", to: "doc-0" }, "doc-1")).toEqual({ op: { op: "hand-over", port: "B" }, actor: "doc-1" });
    expect(normaliseStep(k, {}, { op: "pass", instrument: "hook", to: "surgeon" }, "nurse-2")).toEqual({ op: { op: "pass", instrument: "hook" }, actor: "nurse-2" });
    expect(normaliseStep(k, {}, dissect, "surgeon")).toEqual({ op: dissect });
    // without a place the stand-in is nobody special: a colleague outside the team
    expect(normaliseStep(k, {}, dissect, "doc-0")).toEqual({ op: dissect, actor: "doc-0" });
    // in the record: the step has no actor, and the colleague counter does not move
    let s = reduce(k, createSession(k), { type: "start", seat: "first-assistant" }).state;
    expect(s.phase).toBe("theatre");
    const r = reduce(k, s, { type: "operate", op: { op: "plan-ports", plan: "three-port-left" }, actor: "doc-0" });
    expect(r.rejected).toBeUndefined();
    const step = r.events.find((e) => e.type === "procedure.step") as Extract<(typeof r.events)[number], { type: "procedure.step" }>;
    expect(step.actor).toBeUndefined();
    s = r.state;
    expect(s.procedure!.counters.colleague).toBeUndefined();
  });

  it("which control each step needs, and which instrument is whose", () => {
    expect(InstrumentList.map((i) => [i, instrumentControl(i)])).toEqual([
      ["laparoscope", "camera"],
      ["grasper", "retract"],
      ["maryland", null],
      ["hook", null],
      ["scissors", null],
      ["clip-applier", null],
      ["suction", "suction"],
      ["retrieval-bag", null],
      ["cholangiocatheter", null],
      ["lap-us", null],
    ]);
    // every colleague op needs a control (or none: saying an injury aloud); every other op is the operator's
    for (const op of COLLEAGUE_OPS) if (op !== "insert" && op !== "withdraw" && op !== "hand-over") expect(fieldControlFor({ op } as ProcedureOp), op).not.toBe("operator");
    for (const op of ["plan-ports", "insufflate", "desufflate", "dissect", "isolate", "identify", "safety-pause", "clip", "divide", "coagulate", "image", "inspect", "bag", "extract", "bailout", "close"]) {
      expect(COLLEAGUE_OPS.has(op as ProcedureOp["op"]), op).toBe(false);
      expect(fieldControlFor({ op } as ProcedureOp), op).toBe("operator");
    }
    expect(fieldControlFor({ op: "recognise", injury: "bleeding" })).toBeNull();
    expect(fieldControlFor({ op: "withdraw", port: "A" }, null)).toBeNull();
  });

  it("passes are needed in the scrub nurse's place only; a place in a condition is the team's member in it", () => {
    expect(["surgeon", "first-assistant", "second-assistant", "scrub-nurse", undefined].map((seat) => passingRequired(k, seat === "surgeon" || seat === undefined ? {} : { seat: seat as TeamChoice["seat"] }))).toEqual([false, false, false, true, false]);
    expect(placeRefs(k, {}, "first-assistant")).toEqual(["doc-1"]);
    expect(placeRefs(k, {}, "second-assistant")).toEqual([]);
    expect(placeRefs(k, { lineup: "three-surgeons" }, "second-assistant")).toEqual(["doc-2"]);
    expect(placeRefs(k, { teamScenario: "scrub-break" }, "scrub-nurse")).toEqual(["nurse-9"]);
    expect(placeRefs(k, { seat: "scrub-nurse" }, "scrub-nurse")).toEqual(["nurse-2"]);
  });
});

const InstrumentList = ["laparoscope", "grasper", "maryland", "hook", "scissors", "clip-applier", "suction", "retrieval-bag", "cholangiocatheter", "lap-us"] as const;
