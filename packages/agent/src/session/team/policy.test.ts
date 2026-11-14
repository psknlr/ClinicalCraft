/**
 * The team's offline policies (docs/TEAM.md §4) on hand-built views: pure, so each rule is a plain input → proposal.
 */
import { describe, expect, it } from "vitest";
import type { FieldView, TeamDuty } from "@clinicalcraft/core";
import { REFERENCE_OPS } from "../../../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { afterOperate } from "./assistant.js";
import { afterStandIn } from "./operator.js";
import { expectedInstruments, expectedTractions } from "./operator-plan.js";
import { afterAct, learnerCount, propose, type ColleagueView, type CountView, type ItemSighting, type MemberView } from "./policy.js";
import type { MemberState, Proposal, TeamMessage, TeamTask } from "./types.js";

const CIRC = "staff:or.circulating";
const SCRUB = "staff:or.scrub";
const RELIEF = "staff:next.scrub";
const SURGEON = "actor:clinician";
const NH = "needle-holder";

function member(id: string, duties: TeamDuty[], extra: Partial<MemberState> = {}): MemberState {
  return { id, staff: id.replace(/^staff:/, ""), duties, inbox: [], memory: [], relief: false, absent: false, ...extra };
}

function colleague(id: string, duties: TeamDuty[], extra: Partial<ColleagueView> = {}): ColleagueView {
  return { id, duties, present: true, busy: false, relief: false, absent: false, distance: 2, ...extra };
}

function view(me: MemberState, extra: Partial<MemberView> & { items?: ItemSighting[]; held?: Record<string, string[]>; seen?: string[] } = {}): MemberView {
  let n = 0;
  const { items = [], held = {}, seen = [SURGEON, CIRC, SCRUB], ...rest } = extra;
  return {
    me: { ...me, holding: [], inRoom: true },
    room: "or",
    count: null,
    patient: "patient:or",
    round: 5,
    waitRounds: 3,
    inbox: [],
    tasks: [],
    needs: [],
    colleagues: [],
    items: () => items,
    heldBy: (who) => held[who] ?? [],
    inRoom: () => true,
    sees: (who) => seen.includes(who),
    near: () => false,
    claims: {},
    name: (who) => ({ en: who, "zh-CN": who }),
    itemName: () => ({ en: "needle holder", "zh-CN": "持针器" }),
    newId: (p) => `${p}-${++n}`,
    ...rest,
  };
}

function task(extra: Partial<TeamTask>): TeamTask {
  return { id: "task-1", kind: "supply", need: "n1", item: NH, for: SURGEON, owner: CIRC, initiator: CIRC, thread: "thread-1", status: "open", since: 0, tried: [], acts: 0, ...extra };
}

function message(extra: Partial<TeamMessage>): TeamMessage {
  return { id: "msg-9", thread: "thread-1", from: SCRUB, to: CIRC, kind: "readback", text: { en: "", "zh-CN": "" }, about: { need: "n1", item: NH, for: SURGEON }, room: "or", patient: null, at: 0, round: 4, evidence: [], delivered: true, read: false, ...extra };
}

const sighting = (extra: Partial<ItemSighting> = {}): ItemSighting => ({ id: "eq:nh-1", holder: null, perceived: true, inReach: false, inRoom: true, distance: 1, usable: true, ...extra });
const say = (p: Proposal | null) => (p?.kind === "say" ? p : null);
const sets = (p: Proposal | null) => (p?.patch ?? []).flatMap((x) => ("set" in x ? [x.set] : []));

describe("circulating nurse", () => {
  const me = member(CIRC, ["circulate"]);

  it("a need she noticed: a supply task of hers, acknowledged to the person", () => {
    const p = propose(view(me, { needs: [{ need: { id: "n1", item: NH, for: "surgeon" }, forId: SURGEON, noticedBy: CIRC }] }));
    expect(say(p)).toMatchObject({ to: SURGEON, message: { kind: "notice", text: { en: "A needle holder for actor:clinician — on its way." } } });
    expect(p!.patch).toContainEqual({ create: expect.objectContaining({ kind: "supply", owner: CIRC, initiator: CIRC, status: "open", had: [] }) });
  });

  it("asks the nearest free colleague whose duty it is, in the room — never one on a break", () => {
    const colleagues = [colleague(SCRUB, ["instruments"], { distance: 4 }), colleague("staff:or.other", ["instruments"], { distance: 1, absent: true, present: false }), colleague("staff:or.anaes", ["anaesthesia"], { distance: 0.5 })];
    const p = propose(view(me, { tasks: [task({})], colleagues }));
    expect(say(p)).toMatchObject({ to: SCRUB, message: { kind: "request" } });
    expect(sets(p)).toContainEqual(expect.objectContaining({ status: "asked", assignee: SCRUB, tried: [SCRUB] }));
  });

  it("a relief colleague (by phone) when nobody in the room can; escalates when nobody can at all", () => {
    const relief = propose(view(me, { tasks: [task({})], colleagues: [colleague(SCRUB, ["instruments"], { absent: true, present: false }), colleague(RELIEF, ["instruments"], { relief: true, present: false, distance: Infinity })] }));
    expect(say(relief)).toMatchObject({ to: RELIEF, message: { kind: "request" } });
    const nobody = propose(view(me, { tasks: [task({ tried: [RELIEF] })], colleagues: [colleague(RELIEF, ["instruments"], { relief: true, present: false })] }));
    expect(say(nobody)).toMatchObject({ to: SURGEON, message: { kind: "escalate", text: { en: "The needle holder for actor:clinician hasn't arrived — nobody is free to bring it." } } });
  });

  it("a colleague busy in the room is worth waiting for, for a while", () => {
    const busy = [colleague(SCRUB, ["instruments"], { busy: true })];
    expect(propose(view(me, { tasks: [task({ since: 4 })], colleagues: busy }))).toBeNull();
    expect(say(propose(view(me, { round: 20, tasks: [task({ since: 4 })], colleagues: busy })))?.message.kind).toBe("escalate");
  });

  it("check-back: the right read-back is confirmed; a wrong one is asked again", () => {
    const asked = task({ status: "asked", assignee: SCRUB });
    const right = propose(view(me, { tasks: [asked], inbox: [message({})] }));
    expect(say(right)).toMatchObject({ to: SCRUB, message: { kind: "confirm", replyTo: "msg-9" } });
    expect(sets(right)).toContainEqual(expect.objectContaining({ status: "accepted" }));
    const wrong = propose(view(me, { tasks: [asked], inbox: [message({ about: { need: "n1", item: "scalpel", for: SURGEON } })] }));
    expect(say(wrong)?.message.kind).toBe("request");
  });

  it("done only when she sees the person holding one — not one they had, nor one another request was credited with", () => {
    const accepted = task({ status: "accepted", assignee: SCRUB, had: ["eq:nh-0"] });
    expect(say(propose(view(me, { tasks: [accepted], held: { [SURGEON]: ["eq:nh-0"] } })))).toBeNull();
    const other = task({ id: "task-0", status: "done", verified: true, itemId: "eq:nh-1" });
    expect(say(propose(view(me, { tasks: [other, accepted], held: { [SURGEON]: ["eq:nh-0", "eq:nh-1"] } })))).toBeNull();
    const done = propose(view(me, { tasks: [accepted], held: { [SURGEON]: ["eq:nh-0", "eq:nh-2"] } }));
    expect(say(done)).toMatchObject({ to: SURGEON, message: { kind: "report" } });
    expect(sets(done)).toContainEqual(expect.objectContaining({ status: "done", verified: true, itemId: "eq:nh-2" }));
  });

  it("out of sight of the person: she turns to see for herself", () => {
    const p = propose(view(me, { tasks: [task({ status: "accepted", assignee: SCRUB })], seen: [] }));
    expect(p).toMatchObject({ kind: "act", operation: "navigate", goal: { kind: "look", id: SURGEON, sameRoom: true } });
  });

  it("no read-back in time: the task is open again (the next colleague is asked)", () => {
    const p = propose(view(me, { round: 9, tasks: [task({ status: "asked", assignee: SCRUB, since: 5, tried: [SCRUB] })] }));
    expect(p).toMatchObject({ kind: "update" });
    expect(sets(p)).toContainEqual(expect.objectContaining({ status: "open", reason: "no-answer" }));
  });

  it("a decline: rerouted when another colleague may help, escalated when the reason is the person's", () => {
    const asked = task({ status: "asked", assignee: SCRUB, tried: [SCRUB] });
    const notFound = propose(view(me, { tasks: [asked], inbox: [message({ kind: "decline", about: { need: "n1", item: NH, for: SURGEON, reason: "not-found" } })] }));
    expect(sets(notFound)).toContainEqual(expect.objectContaining({ status: "open", reason: "not-found", reasonText: { en: "staff:or.scrub can't find one in the room", "zh-CN": "staff:or.scrub在手术间里找不到" } }));
    const away = propose(view(me, { tasks: [asked], inbox: [message({ kind: "decline", about: { need: "n1", item: NH, for: SURGEON, reason: "recipient-absent" } })] }));
    expect(say(away)).toMatchObject({ to: SURGEON, message: { kind: "escalate", text: { en: "The needle holder for actor:clinician hasn't arrived — actor:clinician isn't at the table." } } });
    expect(sets(away)).toContainEqual(expect.objectContaining({ status: "escalated", reason: "recipient-absent" }));
  });
});

describe("scrub nurse", () => {
  const me = member(SCRUB, ["instruments", "count"]);
  const request = message({ id: "msg-2", from: CIRC, to: SCRUB, kind: "request" });

  it("reads a request back before acting (check-back)", () => {
    const p = propose(view(me, { inbox: [request], items: [sighting()] }));
    expect(say(p)).toMatchObject({ to: CIRC, message: { kind: "readback", replyTo: "msg-2" } });
    expect(p!.patch).toContainEqual({ create: expect.objectContaining({ kind: "deliver", owner: SCRUB, initiator: CIRC, status: "asked" }) });
  });

  it("nothing of that type she can see in the room: she says so at once — a remembered one does not count", () => {
    const p = propose(view(me, { inbox: [request], items: [sighting({ perceived: false })] }));
    expect(say(p)).toMatchObject({ to: CIRC, message: { kind: "decline", about: { reason: "not-found" } } });
  });

  it("an item another task claimed is not hers to take", () => {
    const deliver = task({ id: "task-7", kind: "deliver", owner: SCRUB, status: "accepted" });
    const p = propose(view(me, { tasks: [deliver], items: [sighting()], claims: { "eq:nh-1": "task-3" } }));
    expect(say(p)).toMatchObject({ message: { kind: "decline", about: { reason: "not-found" } } });
    const free = propose(view(me, { tasks: [deliver], items: [sighting({ id: "eq:nh-2", inReach: true })], claims: { "eq:nh-1": "task-3" } }));
    expect(free).toMatchObject({ kind: "act", operation: "pick_up", targetId: "eq:nh-2" });
    expect(free!.patch).toContainEqual({ claim: "eq:nh-2", task: "task-7" });
  });

  it("called in from outside: to the room first; holding it: to the person, then the hand-over", () => {
    const deliver = task({ id: "task-7", kind: "deliver", owner: SCRUB, status: "accepted" });
    const outside = view(member(RELIEF, ["instruments"], { relief: true }), { tasks: [{ ...deliver, owner: RELIEF }] });
    expect(propose({ ...outside, me: { ...outside.me, inRoom: false } })).toMatchObject({ kind: "act", operation: "navigate", goal: { kind: "room", id: "or" } });
    const holding = [sighting({ holder: SCRUB })];
    expect(propose(view(me, { tasks: [deliver], items: holding }))).toMatchObject({ kind: "act", operation: "navigate", goal: { kind: "follow", id: SURGEON } });
    expect(propose(view(me, { tasks: [deliver], items: holding, near: () => true }))).toMatchObject({ kind: "act", operation: "hand_over", parameters: { to: SURGEON }, recipient: SURGEON });
  });

  it("a refusal for reach: she walks where the world points; full hands: she says so", () => {
    const deliver = task({ id: "task-7", kind: "deliver", owner: SCRUB, status: "accepted", initiator: CIRC });
    const v = view(me, { tasks: [deliver] });
    const goal = { kind: "entity" as const, id: SURGEON, range: 1 };
    expect(afterAct(v, deliver, { status: "failed", code: "NOT_IN_RANGE", message: "too far", operation: "hand_over", hint: goal })).toEqual({ kind: "update", patch: [{ id: "task-7", set: { goal } }] });
    expect(propose(view(me, { tasks: [{ ...deliver, goal }], items: [sighting({ holder: SCRUB })] }))).toMatchObject({ kind: "act", operation: "navigate", goal });
    expect(say(afterAct(v, deliver, { status: "failed", code: "HANDS_FULL", message: "full", operation: "hand_over" }))).toMatchObject({ to: CIRC, message: { kind: "decline", about: { reason: "hands-full" } } });
    expect(say(afterAct(v, deliver, { status: "completed", message: "ok", operation: "hand_over" }))).toMatchObject({ to: CIRC, message: { kind: "report" } });
  });

  it("the person is not at the table: she waits, then says so", () => {
    const deliver = task({ id: "task-7", kind: "deliver", owner: SCRUB, status: "accepted", initiator: CIRC });
    const holding = [sighting({ holder: SCRUB })];
    expect(propose(view(me, { tasks: [deliver], items: holding, inRoom: () => false }))).toMatchObject({ kind: "update" });
    expect(propose(view(me, { tasks: [{ ...deliver, status: "waiting", since: 4 }], items: holding, inRoom: () => false }))).toBeNull();
    expect(say(propose(view(me, { round: 8, tasks: [{ ...deliver, status: "waiting", since: 4 }], items: holding, inRoom: () => false })))).toMatchObject({ message: { kind: "decline", about: { reason: "recipient-absent" } } });
  });
});

describe("simulated surgeon (observer mode)", () => {
  it("acknowledges an escalation", () => {
    const p = propose(view(member(SURGEON, ["surgeon"]), { inbox: [message({ from: CIRC, to: SURGEON, kind: "escalate" })] }));
    expect(say(p)).toMatchObject({ to: CIRC, message: { kind: "report", replyTo: "msg-9", text: { en: "Understood." } } });
  });

  it("the same view, the same proposal (a replay decides as the original did)", () => {
    const me = member(CIRC, ["circulate"]);
    const v = () => view(me, { tasks: [task({})], colleagues: [colleague(SCRUB, ["instruments"])] });
    expect(propose(v())).toEqual(propose(v()));
  });
});

/* ------------------------------------------------------------------ */
/* At the operating table: requests about the field (docs/TEAM.md §4.4) */
/* ------------------------------------------------------------------ */

const FIRST = "staff:or.first";
const ANAES = "staff:or.anaes";
const PATIENT = "patient:or";
const NAMES: Record<string, { en: string; "zh-CN": string }> = {
  [SURGEON]: { en: "the surgeon", "zh-CN": "术者" },
  [FIRST]: { en: "Dr Abe", "zh-CN": "阿部医生" },
  [SCRUB]: { en: "Chen Yu", "zh-CN": "陈雨" },
  [ANAES]: { en: "Dr Wang", "zh-CN": "王医生" },
};
const LABELS: Record<string, { en: string; "zh-CN": string }> = {
  "gallbladder-infundibulum": { en: "Infundibulum", "zh-CN": "胆囊颈" },
  "hepatocystic-triangle": { en: "Hepatocystic triangle", "zh-CN": "胆囊三角" },
  "cystic-plate": { en: "Cystic plate", "zh-CN": "胆囊板" },
};
const TRACTION = { op: "traction", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" } as const;

/** The laparoscopic field on the screen: the scope in A, a grasper in B and the Maryland in C, all the operator's. */
function field(extra: Partial<FieldView> = {}): FieldView {
  return {
    plan: "three-port-left",
    ports: [
      { port: "A", role: "camera", sizeMm: 10, instrument: "laparoscope" },
      { port: "B", role: "working", sizeMm: 5, hand: "left", instrument: "grasper" },
      { port: "C", role: "working", sizeMm: 5, hand: "right", instrument: "maryland" },
    ],
    insufflated: true,
    pressure: 12,
    inView: true,
    supply: { image: true, gas: true },
    organs: [],
    tubes: [],
    regions: [],
    names: [],
    retractions: [],
    findings: [],
    specimen: "in-situ",
    bailouts: [],
    imaged: [],
    pauses: 0,
    closed: false,
    camera: { port: "A", at: null, zoom: "wide" },
    passed: [],
    ...extra,
  };
}

/** A member at the operating table, the field in sight; `controls` their own (the first assistant's by default). */
function table(me: MemberState, extra: Partial<MemberView> & { held?: Record<string, string[]>; items?: ItemSighting[] } = {}): MemberView {
  return view(me, {
    surgeon: SURGEON,
    learner: SURGEON,
    controls: ["camera", "retract", "suction"],
    field: field(),
    atTable: true,
    passingRequired: false,
    plan: null,
    patient: PATIENT,
    colleagues: [colleague(FIRST, ["assist"], { controls: ["camera", "retract", "suction"], handed: ["hold_traction", "release_traction", "hold_camera", "aim_camera"] }), colleague(SURGEON, ["surgeon"], { controls: "all", handed: [] })],
    refOf: (who) => (who === SURGEON ? undefined : who.replace(/^staff:/u, "")),
    bodyOf: (ref) => (ref ? `staff:${ref}` : SURGEON),
    label: (id) => LABELS[id] ?? { en: id, "zh-CN": id },
    name: (who) => NAMES[who] ?? { en: who, "zh-CN": who },
    ...extra,
  });
}

/** A request about the field from the surgeon (the learner) to `to`. */
const ask = (to: string, field: TeamMessage["about"]["field"], extra: Partial<TeamMessage> = {}) => message({ id: "msg-5", thread: "thread-5", from: SURGEON, to, kind: "request", about: { field }, ...extra });

/** An accepted field task of `owner`'s for the surgeon. */
const fieldTask = (owner: string, f: NonNullable<TeamTask["field"]>, extra: Partial<TeamTask> = {}): TeamTask => task({ id: "task-5", kind: "assist", need: `field:${f.op}`, item: f.port ?? f.instrument ?? "", owner, initiator: SURGEON, for: SURGEON, thread: "thread-5", status: "accepted", field: f, ...extra });

const operated = (p: Proposal | null) => (p?.kind === "operate" ? p.op : null);

/** The member's tasks once a proposal's changes to them are made (a task made, fields of one set). */
function applied(tasks: readonly TeamTask[], p: Proposal | null): TeamTask[] {
  const out = tasks.map((x) => structuredClone(x));
  for (const change of p?.patch ?? []) {
    if ("create" in change) out.push(structuredClone(change.create));
    else if ("set" in change) Object.assign(out.find((x) => x.id === change.id)!, change.set);
  }
  return out;
}

describe("an assistant at the operating table", () => {
  const me = member(FIRST, ["assist"]);

  it("reads a request back to the one who asked, before anything is done (check-back)", () => {
    const p = propose(table(me, { inbox: [ask(FIRST, TRACTION)] }));
    expect(say(p)).toMatchObject({ to: SURGEON, message: { kind: "readback", replyTo: "msg-5", about: { field: TRACTION } } });
    expect(say(p)!.message.text).toEqual({ en: "The grasper in port B, pulling the infundibulum to the patient's left and caudally — confirm?", "zh-CN": "B 孔的抓钳，把胆囊颈向患者左侧、尾侧牵拉——确认吗？" });
    expect(p!.patch).toContainEqual({ create: expect.objectContaining({ kind: "assist", owner: FIRST, initiator: SURGEON, status: "asked", field: TRACTION }) });
    // the confirmation accepts it
    const asked = fieldTask(FIRST, TRACTION, { status: "asked" });
    const confirmed = propose(table(me, { tasks: [asked], inbox: [message({ id: "msg-7", thread: "thread-5", from: SURGEON, to: FIRST, kind: "confirm", about: { field: TRACTION } })] }));
    expect(sets(confirmed)).toContainEqual(expect.objectContaining({ status: "accepted" }));
  });

  it("walks to the table first, then takes the port: the operator's by hand-over, an empty one by putting the instrument in", () => {
    const accepted = fieldTask(FIRST, TRACTION);
    expect(propose(table(me, { tasks: [accepted], atTable: false }))).toMatchObject({ kind: "act", task: "task-5", operation: "navigate", goal: { kind: "interact", id: PATIENT } });
    expect(operated(propose(table(me, { tasks: [accepted] })))).toEqual({ op: "hand-over", port: "B", to: "or.first" });
    // an empty assist port: the grasper put into it; an empty camera port: the laparoscope
    const fourPorts = field({ plan: "mirror-four-port", ports: [...field().ports, { port: "D", role: "assist", sizeMm: 5, instrument: null }] });
    expect(operated(propose(table(me, { tasks: [fieldTask(FIRST, { ...TRACTION, port: "D" })], field: fourPorts })))).toEqual({ op: "insert", port: "D", instrument: "grasper" });
    const noScope = field({ ports: [{ port: "A", role: "camera", sizeMm: 10, instrument: null }, ...field().ports.slice(1)], camera: undefined });
    expect(operated(propose(table(me, { tasks: [fieldTask(FIRST, { op: "camera" })], field: noScope })))).toEqual({ op: "insert", port: "A", instrument: "laparoscope" });
    expect(operated(propose(table(me, { tasks: [fieldTask(FIRST, { op: "camera" })] })))).toEqual({ op: "hand-over", port: "A", to: "or.first" });
  });

  it("holding the port, pulls as asked; the traction done is reported — 'Holding.'", () => {
    const accepted = fieldTask(FIRST, TRACTION);
    const holding = field({ ports: [field().ports[0]!, { ...field().ports[1]!, holder: "or.first" }, field().ports[2]!] });
    const v = table(me, { tasks: [accepted], field: holding });
    expect(operated(propose(v))).toEqual({ op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" });
    const done = afterOperate(v, accepted, { status: "completed", message: "Done.", op: { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" } });
    expect(say(done)).toMatchObject({ to: SURGEON, message: { kind: "report", text: { en: "Holding.", "zh-CN": "拉住了。" } } });
    expect(sets(done)).toContainEqual(expect.objectContaining({ status: "done" }));
    // a refusal of the field ends it declined, with the field's reason
    const refused = afterOperate(v, accepted, { status: "failed", code: "invalid", message: "Rejected (invalid): Dr Abe already holds two ports (A, C).\ndetail", op: { op: "hand-over", port: "B", to: "or.first" } });
    expect(say(refused)).toMatchObject({ message: { kind: "decline", text: { en: "I couldn't do it: Rejected (invalid): Dr Abe already holds two ports (A, C)." } } });
  });

  it("never withdraws or lets go unasked: holding the traction with nothing asked, nothing is proposed", () => {
    const holding = field({ ports: [field().ports[0]!, { ...field().ports[1]!, holder: "or.first" }, field().ports[2]!], retractions: [{ structure: "gallbladder-infundibulum", port: "B", direction: ["patient-left", "caudal"], force: "firm" }] });
    expect(propose(table(me, { field: holding, tasks: [fieldTask(FIRST, TRACTION, { status: "done" })] }))).toBeNull();
  });

  it("asked to let go: 'Letting go now.', then the traction released and the port handed back", () => {
    const release = fieldTask(FIRST, { op: "release" });
    const holding = field({ ports: [field().ports[0]!, { ...field().ports[1]!, holder: "or.first" }, field().ports[2]!], retractions: [{ structure: "gallbladder-infundibulum", port: "B", direction: ["patient-left", "caudal"], force: "firm" }] });
    const first = propose(table(me, { tasks: [release], field: holding }));
    expect(say(first)).toMatchObject({ to: SURGEON, message: { kind: "report", text: { en: "Letting go now.", "zh-CN": "我松手了。" } } });
    expect(sets(first)).toContainEqual({ step: "announced" });
    const announced = { ...release, step: "announced" };
    expect(operated(propose(table(me, { tasks: [announced], field: holding })))).toEqual({ op: "release", structure: "gallbladder-infundibulum" });
    const pulledNoMore = field({ ports: holding.ports });
    expect(operated(propose(table(me, { tasks: [announced], field: pulledNoMore })))).toEqual({ op: "hand-over", port: "B" });
    expect(sets(propose(table(me, { tasks: [announced] })))).toContainEqual(expect.objectContaining({ status: "done" }));
  });

  /** The laparoscope in A held by the first assistant: the work in `working`, the camera aimed at `at`. */
  const held = (working: string | null, at: string | null = null): FieldView => field({ ports: [{ ...field().ports[0]!, holder: "or.first" }, ...field().ports.slice(1)], camera: { port: "A", at, zoom: "wide", holder: "or.first" }, ...(working ? { working } : {}) });
  const tookCamera = fieldTask(FIRST, { op: "camera" }, { id: "task-4", thread: "thread-4", status: "done" });

  it("holding the camera, follows the work under a task of its own: one aim for each change of region, never a loop", () => {
    // the work in the triangle, the camera on the whole field: an aim there — under the member's own task, never a request's
    const first = propose(table(me, { tasks: [tookCamera], field: held("hepatocystic-triangle") }));
    expect(first).toMatchObject({ kind: "operate", op: { op: "aim", port: "A", at: "hepatocystic-triangle" } });
    expect(first!.patch).toEqual([{ create: expect.objectContaining({ kind: "assist", need: "field:follow", owner: FIRST, initiator: FIRST, status: "done", followed: { working: "hepatocystic-triangle", at: "hepatocystic-triangle" } }) }]);
    const tasks = applied([tookCamera], first);
    expect(first).toMatchObject({ task: tasks[1]!.id });
    // aimed there: nothing more, round after round
    expect(propose(table(me, { tasks, field: held("hepatocystic-triangle", "hepatocystic-triangle") }))).toBeNull();
    // the aim refused (the camera still on the whole field): noted, never tried again while the work stays there
    const refused = propose(table(me, { tasks, field: held("hepatocystic-triangle") }));
    expect(refused).toEqual({ kind: "update", patch: [{ id: tasks[1]!.id, set: { followed: { working: "hepatocystic-triangle", at: null } } }] });
    expect(propose(table(me, { tasks: applied(tasks, refused), field: held("hepatocystic-triangle") }))).toBeNull();
    // the work moves on: one more aim, under the same task of its own
    expect(propose(table(me, { tasks, field: held("cystic-plate", "hepatocystic-triangle") }))).toMatchObject({ kind: "operate", task: tasks[1]!.id, op: { op: "aim", port: "A", at: "cystic-plate" } });
    // not holding the camera, or no work yet: never
    expect(propose(table(me, { tasks: [tookCamera], field: field({ working: "cystic-plate" }) }))).toBeNull();
    expect(propose(table(me, { tasks: [tookCamera], field: held(null) }))).toBeNull();
  });

  it("an aim someone asked for stands until the work moves on; when the work comes back, the camera follows it", () => {
    const following = task({ id: "task-6", kind: "assist", need: "field:follow", item: "A", owner: FIRST, initiator: FIRST, for: FIRST, thread: "thread-6", status: "done", field: { op: "aim", port: "A" }, followed: { working: "hepatocystic-triangle", at: "hepatocystic-triangle" } });
    // the camera aimed at the cystic plate since (a request, a delegation) while the work stays in the triangle: noted, no aim
    const asked = propose(table(me, { tasks: [tookCamera, following], field: held("hepatocystic-triangle", "cystic-plate") }));
    expect(asked).toEqual({ kind: "update", patch: [{ id: "task-6", set: { followed: { working: "hepatocystic-triangle", at: "cystic-plate" } } }] });
    let tasks = applied([tookCamera, following], asked);
    expect(propose(table(me, { tasks, field: held("hepatocystic-triangle", "cystic-plate") }))).toBeNull();
    // the work moves to the cystic plate, where the camera is: noted
    const there = propose(table(me, { tasks, field: held("cystic-plate", "cystic-plate") }));
    expect(there).toEqual({ kind: "update", patch: [{ id: "task-6", set: { followed: { working: "cystic-plate", at: "cystic-plate" } } }] });
    tasks = applied(tasks, there);
    // and back to the triangle: the camera follows it
    expect(propose(table(me, { tasks, field: held("hepatocystic-triangle", "cystic-plate") }))).toMatchObject({ kind: "operate", task: "task-6", op: { op: "aim", port: "A", at: "hepatocystic-triangle" } });
  });

  it("a request about the camera under way comes first: no following meanwhile, and only that request, confirmed and done as asked, is reported", () => {
    const aim = { op: "aim", region: "cystic-plate" } as const;
    const asked = fieldTask(FIRST, aim, { status: "asked" });
    // read back, waiting for the confirmation: the camera stays where it is
    expect(propose(table(me, { tasks: [tookCamera, asked], field: held("hepatocystic-triangle") }))).toBeNull();
    const aimed = (at: string): Parameters<typeof afterOperate>[2] => ({ status: "completed", message: "Done.", op: { op: "aim", port: "A", at } });
    // an aim done at another region never reports the request — asked or under way
    expect(afterOperate(table(me, { tasks: [tookCamera, asked], field: held("hepatocystic-triangle", "hepatocystic-triangle") }), asked, aimed("hepatocystic-triangle"))).toBeNull();
    const accepted = { ...asked, status: "accepted" as const };
    expect(afterOperate(table(me, { tasks: [tookCamera, accepted], field: held("hepatocystic-triangle", "hepatocystic-triangle") }), accepted, aimed("hepatocystic-triangle"))).toBeNull();
    // under way, the step is the one asked; done as asked, it is reported, and the view asked for stands
    expect(operated(propose(table(me, { tasks: [tookCamera, accepted], field: held("hepatocystic-triangle") })))).toEqual({ op: "aim", port: "A", at: "cystic-plate" });
    const reported = afterOperate(table(me, { tasks: [tookCamera, accepted], field: held("hepatocystic-triangle", "cystic-plate") }), accepted, aimed("cystic-plate"));
    expect(say(reported)).toMatchObject({ to: SURGEON, message: { kind: "report", text: { en: "Camera on the cystic plate.", "zh-CN": "镜头已对准胆囊板。" } } });
    expect(reported!.patch).toContainEqual({ create: expect.objectContaining({ need: "field:follow", followed: { working: "hepatocystic-triangle", at: "cystic-plate" } }) });
    // the camera's own following of the work says nothing
    const following = task({ id: "task-6", kind: "assist", need: "field:follow", item: "A", owner: FIRST, initiator: FIRST, for: FIRST, thread: "thread-6", status: "done", field: { op: "aim", port: "A" } });
    expect(afterOperate(table(me, { tasks: [following], field: held("cystic-plate", "cystic-plate") }), following, aimed("cystic-plate"))).toBeNull();
  });

  it("declines what its controls do not cover, saying why and who can: the scrub nurse asked for traction, the anaesthetist for the camera", () => {
    const scrub = propose(table(member(SCRUB, ["instruments", "count"]), { controls: ["instruments", "count"], inbox: [ask(SCRUB, TRACTION)] }));
    expect(say(scrub)).toMatchObject({ to: SURGEON, message: { kind: "decline", about: { reason: "no-control" }, text: { en: "I don't hold the Traction control: ask Dr Abe.", "zh-CN": "我没有牵引显露的分工权限：请找阿部医生。" } } });
    expect(scrub!.patch).toContainEqual({ create: expect.objectContaining({ status: "declined", reason: "no-control" }) });
    const anaes = propose(table(member(ANAES, ["anaesthesia"]), { controls: ["anaesthesia"], inbox: [ask(ANAES, { op: "camera" })] }));
    expect(say(anaes)).toMatchObject({ message: { kind: "decline", text: { en: "I don't hold the Camera control: ask Dr Abe." } } });
    // nobody else may be handed it: no one named
    const alone = propose(table(member(ANAES, ["anaesthesia"]), { controls: ["anaesthesia"], colleagues: [], inbox: [ask(ANAES, TRACTION)] }));
    expect(say(alone)!.message.text.en).toBe("I don't hold the Traction control.");
    // the operator's own instrument is never taken (A13); a port a colleague holds is theirs to hand over
    expect(say(propose(table(me, { inbox: [ask(FIRST, { ...TRACTION, port: "C" })] })))).toMatchObject({ message: { kind: "decline", about: { reason: "operator-instrument" }, text: { en: "The Maryland dissector in port C is the operator's own instrument." } } });
    const heldBySecond = field({ ports: [field().ports[0]!, { ...field().ports[1]!, holder: "or.second" }, field().ports[2]!] });
    expect(say(propose(table(me, { field: heldBySecond, inbox: [ask(FIRST, TRACTION)] })))).toMatchObject({ message: { kind: "decline", about: { reason: "port-held" } } });
  });

  it("a decline never names the one who asked: holding the control themselves, they are told it is theirs", () => {
    // the learner in the first assistant's place (two surgeons: traction and the camera are theirs); the stand-in operates
    const STANDIN = "staff:or.standin";
    const inPlace = (learnerHanded: string[], more: ColleagueView[] = []) =>
      table(member(SCRUB, ["instruments", "count"]), {
        controls: ["instruments", "count"],
        surgeon: STANDIN,
        colleagues: [colleague(SURGEON, ["assist"], { handed: learnerHanded }), colleague(STANDIN, ["surgeon"], { controls: "all", handed: [] }), colleague(ANAES, ["anaesthesia"], { handed: [] }), ...more],
        name: (who) => (who === SURGEON ? { en: "the first assistant (you)", "zh-CN": "第一助手（你）" } : (NAMES[who] ?? { en: who, "zh-CN": who })),
        inbox: [ask(SCRUB, TRACTION)],
      });
    const yours = propose(inPlace(["hold_traction", "release_traction", "hold_camera", "aim_camera"]));
    expect(say(yours)).toMatchObject({ to: SURGEON, message: { kind: "decline", about: { reason: "no-control" }, text: { en: "I don't hold the Traction control: you do.", "zh-CN": "我没有牵引显露的分工权限：你有。" } } });
    // the one who asked may not: whoever else may is named — never the asker, never the stand-in
    const other = propose(inPlace([], [colleague(FIRST, ["assist"], { handed: ["hold_traction"] })]));
    expect(say(other)!.message.text).toEqual({ en: "I don't hold the Traction control: ask Dr Abe.", "zh-CN": "我没有牵引显露的分工权限：请找阿部医生。" });
  });

  it("a camera step the field would refuse is declined before anything is taken: closer with nothing aimed at, a region the field does not have", () => {
    const closer = { op: "zoom", zoom: "close" } as const;
    expect(say(propose(table(me, { inbox: [ask(FIRST, closer)] })))).toMatchObject({ message: { kind: "decline", about: { reason: "aim-first" }, text: { en: "A close view needs something to look at: tell me where to aim the camera first.", "zh-CN": "推近需要先对准一个部位：请先告诉我镜头对准哪里。" } } });
    // aimed at something: read back
    expect(say(propose(table(me, { inbox: [ask(FIRST, closer)], field: field({ camera: { port: "A", at: "cystic-plate", zoom: "wide" } }) })))).toMatchObject({ message: { kind: "readback" } });
    // the field in view lists its regions: one it does not have is declined
    const regions: FieldView["regions"] = [{ id: "hepatocystic-triangle", name: { en: "Hepatocystic triangle" }, dissection: "untouched", exposure: "none" }];
    expect(say(propose(table(me, { inbox: [ask(FIRST, { op: "aim", region: "nowhere" })], field: field({ regions }) })))).toMatchObject({ message: { kind: "decline", about: { reason: "unknown-region" }, text: { en: "There is no region nowhere." } } });
    // confirmed earlier, the camera unaimed since: declined at the table — the port is never taken first
    const p = propose(table(me, { tasks: [fieldTask(FIRST, closer)] }));
    expect(p).toMatchObject({ kind: "say", message: { kind: "decline", about: { reason: "aim-first" } } });
    expect(operated(p)).toBeNull();
  });

  it("asked to let go with nothing in their hands: declined — never 'Letting go now.'", () => {
    const p = propose(table(me, { tasks: [fieldTask(FIRST, { op: "release" })] }));
    expect(say(p)).toMatchObject({ to: SURGEON, message: { kind: "decline", about: { reason: "nothing-held" }, text: { en: "I'm not holding anything.", "zh-CN": "我手上没有握持器械。" } } });
    expect(sets(p)).toContainEqual(expect.objectContaining({ status: "declined", reason: "nothing-held" }));
    // holding the camera only: a port named that they do not hold is nothing to let go of either
    const camera = field({ ports: [{ ...field().ports[0]!, holder: "or.first" }, ...field().ports.slice(1)] });
    expect(say(propose(table(me, { tasks: [fieldTask(FIRST, { op: "release", port: "B" })], field: camera })))).toMatchObject({ message: { kind: "decline", about: { reason: "nothing-held" } } });
  });

  it("a refusal of the field is said with the field's own reason, in both languages, once", () => {
    const accepted = fieldTask(FIRST, { op: "zoom", zoom: "close" });
    const message = "Rejected (requirements-unmet): Aim the camera first: a close view needs a region to look at. Aim the camera first: a close view needs a region to look at.";
    const reason = { en: "Aim the camera first: a close view needs a region to look at.", "zh-CN": "请先把镜头对准：推近需要一个对准的区域。" };
    const refused = afterOperate(table(me, { tasks: [accepted] }), accepted, { status: "failed", code: "requirements-unmet", message, reason, op: { op: "zoom", port: "A", level: "close" } });
    expect(say(refused)!.message.text).toEqual({ en: "I couldn't do it: Aim the camera first: a close view needs a region to look at.", "zh-CN": "没能做到：请先把镜头对准：推近需要一个对准的区域。" });
  });

  it("the same view, the same proposal", () => {
    const v = () => table(me, { inbox: [ask(FIRST, TRACTION)] });
    expect(propose(v())).toEqual(propose(v()));
    const w = () => table(me, { tasks: [fieldTask(FIRST, TRACTION)] });
    expect(propose(w())).toEqual(propose(w()));
  });
});

describe("the scrub nurse's passes", () => {
  const me = member(SCRUB, ["instruments", "count"]);
  const scrubAt = (extra: Partial<MemberView> = {}) => table(me, { controls: ["instruments", "count"], ...extra });

  it("an instrument asked for is read back, then passed into the asker's hand — the operator's (no `to`), a colleague's (theirs) — and reported", () => {
    const readback = propose(scrubAt({ inbox: [ask(SCRUB, { op: "pass", instrument: "hook" })] }));
    expect(say(readback)).toMatchObject({ to: SURGEON, message: { kind: "readback", text: { en: "Hook to the surgeon — confirm?", "zh-CN": "电钩递给术者——确认吗？" } } });
    const pass = fieldTask(SCRUB, { op: "pass", instrument: "hook" });
    expect(propose(scrubAt({ tasks: [pass], atTable: false }))).toMatchObject({ kind: "act", operation: "navigate", goal: { kind: "interact", id: PATIENT } });
    expect(operated(propose(scrubAt({ tasks: [pass] })))).toEqual({ op: "pass", instrument: "hook" });
    expect(operated(propose(scrubAt({ tasks: [{ ...pass, initiator: FIRST, for: FIRST }] })))).toEqual({ op: "pass", instrument: "hook", to: "or.first" });
    const done = afterOperate(scrubAt({ tasks: [pass] }), pass, { status: "completed", message: "Done.", op: { op: "pass", instrument: "hook" } });
    expect(say(done)).toMatchObject({ to: SURGEON, message: { kind: "report", text: { en: "Passed.", "zh-CN": "递好了。" } } });
  });

  it("never passes unasked: at the table with nothing asked, nothing is proposed", () => {
    expect(propose(scrubAt())).toBeNull();
  });

  it("her count and her needle holder are as before: a request for an item is read back; the count, once due, is said", () => {
    const deliver = message({ id: "msg-2", from: CIRC, to: SCRUB, kind: "request" });
    expect(say(propose(scrubAt({ inbox: [deliver], items: [sighting()] })))).toMatchObject({ to: CIRC, message: { kind: "readback", text: { en: "A needle holder to the surgeon — confirm?", "zh-CN": "持针器递给术者——确认吗？" } } });
    const count: CountView = { item: "swab", of: 5, due: true, places: [], name: { en: "swabs", "zh-CN": "纱布" }, seen: () => ["s1", "s2", "s3", "s4", "s5"], check: () => ({ missing: [], unexpected: [] }) };
    const counted = propose(scrubAt({ count, colleagues: [colleague(CIRC, ["circulate"])] }));
    expect(say(counted)).toMatchObject({ to: CIRC, message: { kind: "report", text: { en: "Count of swabs: 5 of 5." }, about: { count: 5, of: 5, ids: ["s1", "s2", "s3", "s4", "s5"], stage: "closing" } } });
    // the learner who holds the count says exactly that, from the same view (`team count`)
    expect(learnerCount(scrubAt({ count, colleagues: [colleague(CIRC, ["circulate"])] }))).toEqual(counted);
  });
});

/* ------------------------------------------------------------------ */
/* The stand-in surgeon (docs/TEAM.md §4.5)                            */
/* ------------------------------------------------------------------ */

describe("the stand-in surgeon", () => {
  const STANDIN = "staff:or.standin";
  /** The learner's body: in the first assistant's place, the first assistant's member (`or.first` in the field). */
  const LEARNER = SURGEON;
  /** The plan: core's reference path (0 plan-ports … 5 retract B, 6–11 the triangle, 12–14 the plate, 19 the pause, 22 the first clip, 39 the extraction, 40 the close). */
  const PLAN = REFERENCE_OPS.map((op, k) => ({ k, op }));
  const done = (to: number, more: string[] = []) => [...Array.from({ length: to }, (_, k) => `standin:${k}`), ...more];
  const me = member(STANDIN, ["surgeon"]);
  const NAMES_IN_PLACE: Record<string, { en: string; "zh-CN": string }> = { ...NAMES, [LEARNER]: { en: "the first assistant (you)", "zh-CN": "第一助手（你）" }, [STANDIN]: { en: "the surgeon", "zh-CN": "术者" } };
  /** The regions as the screen shows them before plan step `k`: each cleared once the reference's run of it is done. */
  const regionsAt = (k: number): FieldView["regions"] => [
    { id: "hepatocystic-triangle", name: { en: "Hepatocystic triangle" }, dissection: k <= 6 ? "untouched" : k < 12 ? "mostly" : "cleared", exposure: "good" },
    { id: "cystic-plate", name: { en: "Cystic plate" }, dissection: k <= 12 ? "untouched" : k < 15 ? "partly" : "cleared", exposure: "good" },
    { id: "gallbladder-bed", name: { en: "Gallbladder bed" }, dissection: k <= 31 ? "untouched" : k < 35 ? "partly" : "cleared", exposure: "good" },
  ];
  /** The triangle not cleared yet (its run's reference steps done). */
  const TRIANGLE_OPEN: FieldView["regions"] = regionsAt(12).map((r) => (r.id === "hepatocystic-triangle" ? { ...r, dissection: "mostly" as const } : r));
  /**
   * The field at the table before plan step `k` (12 unless given), as the reference leaves it: each port's instrument and
   * each traction the reference's, the regions dissected so far, the scope in A — the camera, which the first assistant
   * (the learner) took and holds, on the whole field.
   */
  const open = (extra: Partial<FieldView> = {}, k = 12): FieldView => {
    const instruments = expectedInstruments(PLAN, k);
    return field({
      regions: regionsAt(k),
      retractions: expectedTractions(PLAN, k).map((t) => ({ structure: t.structure, port: t.port, direction: t.direction, force: t.force })),
      camera: { port: "A", at: null, zoom: "wide", holder: "or.first" },
      ports: field().ports.map((p) => ({ ...p, instrument: instruments.get(p.port) ?? null, ...(p.port === "A" ? { holder: "or.first" } : {}) })),
      ...extra,
    });
  };
  /** Its plan task (the camera handed on after the scope went in). */
  const planTask = (extra: Partial<TeamTask> = {}): TeamTask => task({ id: "task-9", kind: "operate", need: "operate", item: "", for: STANDIN, owner: STANDIN, initiator: STANDIN, thread: "thread-9", status: "accepted", cursor: 0, requested: ["camera:2"], ...extra });

  /** The stand-in at the table with its plan done up to `upTo` (the field's own record), the learner in the first assistant's place. */
  function standIn(upTo: number, extra: Partial<MemberView> = {}): MemberView {
    return table(me, {
      surgeon: STANDIN,
      learner: LEARNER,
      controls: "all",
      plan: PLAN,
      refs: done(upTo),
      injuries: [],
      where: (handle) => (handle === "T2" || handle === "T3" ? "hepatocystic-triangle" : null),
      gasControl: () => null,
      countSettled: null,
      field: open({}, upTo),
      tasks: [planTask({ cursor: upTo })],
      colleagues: [
        colleague(LEARNER, ["assist"], { controls: ["camera", "retract", "suction"] }),
        colleague(SCRUB, ["instruments", "count"], { controls: ["instruments", "count"] }),
        colleague(ANAES, ["anaesthesia"], { controls: ["anaesthesia"] }),
      ],
      refOf: (who) => (who === STANDIN ? undefined : who === LEARNER ? "or.first" : who.replace(/^staff:/u, "")),
      bodyOf: (ref) => (ref === undefined ? STANDIN : ref === "or.first" ? LEARNER : `staff:${ref}`),
      name: (who) => NAMES_IN_PLACE[who] ?? { en: who, "zh-CN": who },
      ...extra,
    });
  }
  const said = (p: Proposal | null) => (p?.kind === "say" ? { to: p.to, kind: p.message.kind, text: p.message.text.en, about: p.message.about } : null);
  const stepOf = (p: Proposal | null) => (p?.kind === "operate" ? { op: p.op, ref: p.ref } : null);
  const requestOf = (p: Proposal | null) => sets(p).find((x) => x.request)?.request;

  it("starts its plan at the first reference step the field has not recorded: a colleague's steps never move it, the place member's own steps are passed over", () => {
    // nothing done: the operation begins (its plan task made with the first step, at the table first)
    const first = propose(standIn(0, { tasks: [], field: null }));
    expect(stepOf(first)).toEqual({ op: { op: "plan-ports", plan: "three-port-left" }, ref: "standin:0" });
    expect(first!.patch).toContainEqual({ create: expect.objectContaining({ kind: "operate", owner: STANDIN, status: "accepted" }) });
    expect(propose(standIn(0, { tasks: [], atTable: false }))).toMatchObject({ kind: "act", operation: "navigate", goal: { kind: "interact", id: PATIENT } });
    // the camera taken and aimed by colleagues (their own refs) leaves the plan where the field's record has it
    expect(stepOf(propose(standIn(6, { refs: [...done(6), "team.task-3.1", "team.task-3.2"] })))).toEqual({ op: REFERENCE_OPS[6], ref: "standin:6" });
    // a step the reference gives the learner's place (`actor`) is theirs: the plan goes on after it
    const theirs = PLAN.map((x) => (x.k === 5 ? { ...x, actor: "or.first" } : x));
    expect(stepOf(propose(standIn(5, { plan: theirs })))).toEqual({ op: REFERENCE_OPS[6], ref: "standin:6" });
  });

  it("a dissection run is one move: it goes on until the region shows cleared — past the reference's steps, never past the run's length", () => {
    // the triangle (6–11) dissected as the reference does, not cleared yet: one more dissection, an extra step of the run
    const notCleared = open({ regions: TRIANGLE_OPEN });
    expect(stepOf(propose(standIn(12, { field: notCleared })))).toEqual({ op: REFERENCE_OPS[11], ref: "standin:11:dissect:1" });
    const extra = (n: number) => Array.from({ length: n }, (_, i) => `standin:11:dissect:${i + 1}`);
    expect(stepOf(propose(standIn(12, { field: notCleared, refs: done(12, extra(5)) })))).toEqual({ op: REFERENCE_OPS[11], ref: "standin:11:dissect:6" });
    // as many extra steps as the run has: then the plan goes on
    expect(stepOf(propose(standIn(12, { field: notCleared, refs: done(12, extra(6)) })))).toEqual({ op: REFERENCE_OPS[12], ref: "standin:12" });
    // halfway through the run's reference steps: the next of them
    expect(stepOf(propose(standIn(9, { field: notCleared })))).toEqual({ op: REFERENCE_OPS[9], ref: "standin:9" });
    // cleared before the reference's steps are all done: the rest of the run is passed over
    expect(stepOf(propose(standIn(9)))).toEqual({ op: REFERENCE_OPS[12], ref: "standin:12" });
    // and once a later step is recorded the run stays passed, whatever the screen shows (after the close it shows nothing)
    expect(stepOf(propose(standIn(13, { field: notCleared })))).toEqual({ op: REFERENCE_OPS[13], ref: "standin:13" });
  });

  it("hands the camera on after its own scope insert: 'Take the camera, please.' to the camera holder, then waits for it", () => {
    const scopeIn = open({ camera: { port: "A", at: null, zoom: "wide" }, ports: field().ports, retractions: [] });
    const p = propose(standIn(3, { field: scopeIn, tasks: [planTask({ requested: [] })] }));
    expect(said(p)).toMatchObject({ to: LEARNER, kind: "request", text: "The first assistant (you), take the camera, please.", about: { field: { op: "camera", port: "A" } } });
    const req = requestOf(p)!;
    expect(req).toMatchObject({ key: "camera:2", to: LEARNER, times: 1 });
    const asked = (extra: Partial<TeamTask>) => planTask({ requested: [], ...extra });
    // waiting for the read-back: nothing else happens meanwhile
    expect(propose(standIn(3, { field: scopeIn, tasks: [asked({ request: req })] }))).toBeNull();
    // the camera holder's read-back is confirmed (check-back); a read-back of something else gets the request again
    const readback = message({ id: "msg-21", thread: req.thread, from: LEARNER, to: STANDIN, kind: "readback", about: { field: { op: "camera", port: "A" } } });
    expect(said(propose(standIn(3, { field: scopeIn, tasks: [asked({ request: req })], inbox: [readback] })))).toMatchObject({ to: LEARNER, kind: "confirm", text: "Yes — go ahead." });
    const wrong = { ...readback, about: { field: { op: "aim" as const, region: "cystic-plate" } } };
    expect(said(propose(standIn(3, { field: scopeIn, tasks: [asked({ request: req })], inbox: [wrong] })))).toMatchObject({ kind: "request", text: "The first assistant (you), take the camera, please." });
    // the camera taken (the field shows them holding it): the request is over, the plan goes on
    const held = open({ retractions: [] });
    const over = propose(standIn(3, { field: held, tasks: [asked({ request: { ...req, confirmed: true } })] }));
    expect(sets(over)).toContainEqual(expect.objectContaining({ request: undefined, requested: ["camera:2"] }));
    expect(stepOf(propose(standIn(3, { field: held })))).toEqual({ op: REFERENCE_OPS[3], ref: "standin:3" });
  });

  it("a request not read back is said once more, then given up and withdrawn — the stand-in carries on itself", () => {
    const scopeIn = open({ camera: { port: "A", at: null, zoom: "wide" }, ports: field().ports, retractions: [] });
    const req = { key: "camera:2", to: LEARNER, field: { op: "camera" as const, port: "A" }, thread: "thread-30", times: 1, since: 1 };
    const asked = (extra: Partial<TeamTask>) => planTask({ requested: [], ...extra });
    expect(propose(standIn(3, { field: scopeIn, round: 3, tasks: [asked({ request: req })] }))).toBeNull();
    const again = propose(standIn(3, { field: scopeIn, round: 4, tasks: [asked({ request: req })] }));
    expect(said(again)).toMatchObject({ to: LEARNER, kind: "request" });
    expect(requestOf(again)).toMatchObject({ times: 2, since: 4 });
    const gaveUp = propose(standIn(3, { field: scopeIn, round: 8, tasks: [asked({ request: { ...req, times: 2, since: 4 } })] }));
    expect(said(gaveUp)).toMatchObject({ to: LEARNER, kind: "decline", text: "No — not now." });
    expect(sets(gaveUp)).toContainEqual(expect.objectContaining({ request: undefined, requested: ["camera:2"] }));
    // given up: it carries on holding the camera itself
    expect(stepOf(propose(standIn(3, { field: scopeIn, tasks: [planTask()] })))).toEqual({ op: REFERENCE_OPS[3], ref: "standin:3" });
    // read back and confirmed but not done in time: withdrawn too
    const late = propose(standIn(3, { field: scopeIn, round: 13, tasks: [asked({ request: { ...req, confirmed: true, since: 3 } })] }));
    expect(said(late)).toMatchObject({ kind: "decline", text: "No — not now." });
  });

  it("asks for the camera on the region of its next step while a colleague holds it aimed elsewhere; held by nobody, it aims it itself", () => {
    const aimed = (at: string, holder?: string) => open({ camera: { port: "A", at, zoom: "wide", ...(holder ? { holder } : {}) }, ports: [{ ...field().ports[0]!, ...(holder ? { holder } : {}) }, ...field().ports.slice(1)] });
    // the cystic plate next (12), the camera on the triangle in the first assistant's hands
    const p = propose(standIn(12, { refs: done(12, ["standin:11:dissect:1"]), field: aimed("hepatocystic-triangle", "or.first") }));
    expect(said(p)).toMatchObject({ to: LEARNER, kind: "request", text: "The first assistant (you), camera on the cystic plate, please.", about: { field: { op: "aim", region: "cystic-plate" } } });
    expect(requestOf(p)).toMatchObject({ key: "aim:12" });
    // the camera already there: no request
    expect(stepOf(propose(standIn(12, { field: aimed("cystic-plate", "or.first") })))).toEqual({ op: REFERENCE_OPS[12], ref: "standin:12" });
    // a duct in the triangle next (15: isolate T2), the camera on the plate: where the duct lies
    expect(said(propose(standIn(15, { field: aimed("cystic-plate", "or.first") })))).toMatchObject({ text: "The first assistant (you), camera on the hepatocystic triangle, please." });
    // nobody holds the camera: the operator aims it itself, an extra step of its plan
    expect(stepOf(propose(standIn(12, { field: aimed("hepatocystic-triangle") })))).toEqual({ op: { op: "aim", port: "A", at: "cystic-plate" }, ref: "standin:12:aim:1" });
    // given up: the camera port taken back first ("I'll take port A."), then aimed by the operator
    const gaveUp = planTask({ requested: ["aim:12"] });
    const take = propose(standIn(12, { field: aimed("hepatocystic-triangle", "or.first"), tasks: [gaveUp] }));
    expect(said(take)).toMatchObject({ to: LEARNER, kind: "notice", text: "I'll take port A." });
    expect(stepOf(propose(standIn(12, { field: aimed("hepatocystic-triangle", "or.first"), tasks: [{ ...gaveUp, step: "take:A:12" }] })))).toEqual({ op: { op: "hand-over", port: "A" }, ref: "standin:12:take:1" });
  });

  it("'Closer.' before the safety pause (aimed first when the camera looks at the whole field), 'Wider.' after it", () => {
    const held = (at: string | null, zoom: "wide" | "close") => open({ camera: { port: "A", at, zoom, holder: "or.first" }, working: "hepatocystic-triangle", ports: [{ ...field().ports[0]!, holder: "or.first" }, ...field().ports.slice(1)] });
    expect(said(propose(standIn(19, { field: held("hepatocystic-triangle", "wide") })))).toMatchObject({ kind: "request", text: "The first assistant (you), closer, please.", about: { field: { op: "zoom", zoom: "close" } } });
    expect(said(propose(standIn(19, { field: held(null, "wide") })))).toMatchObject({ text: "The first assistant (you), camera on the hepatocystic triangle, close up, please.", about: { field: { op: "aim", region: "hepatocystic-triangle", zoom: "close" } } });
    // close: the pause itself
    expect(stepOf(propose(standIn(19, { field: held("hepatocystic-triangle", "close") })))).toEqual({ op: REFERENCE_OPS[19], ref: "standin:19" });
    // after the pause, still close: wider before anything else
    expect(said(propose(standIn(20, { field: held("hepatocystic-triangle", "close") })))).toMatchObject({ text: "The first assistant (you), wider, please.", about: { field: { op: "zoom", zoom: "wide" } } });
    expect(requestOf(propose(standIn(20, { field: held("hepatocystic-triangle", "close") })))).toMatchObject({ key: "wider:19" });
  });

  it("'I'll take port P.' before a step on a port a colleague holds, then takes it back — the camera port before the extraction through it too", () => {
    const heldB = open({ ports: [field().ports[0]!, { ...field().ports[1]!, holder: "or.first" }, field().ports[2]!] });
    const p = propose(standIn(30, { field: heldB }));
    expect(said(p)).toMatchObject({ to: LEARNER, kind: "notice", text: "I'll take port B.", about: {} });
    expect(said(p)).toBeTruthy();
    expect(sets(p)).toContainEqual(expect.objectContaining({ step: "take:B:30" }));
    expect(stepOf(propose(standIn(30, { field: heldB, tasks: [planTask({ step: "take:B:30" })] })))).toEqual({ op: { op: "hand-over", port: "B" }, ref: "standin:30:take:1" });
    // the extraction through the camera port its holder holds (A12)
    const bagged = open({ specimen: "bagged", camera: { port: "A", at: "gallbladder-bed", zoom: "wide", holder: "or.first" }, ports: [{ ...field().ports[0]!, holder: "or.first" }, ...field().ports.slice(1)] });
    expect(said(propose(standIn(39, { field: bagged })))).toMatchObject({ text: "I'll take port A." });
    expect(stepOf(propose(standIn(39, { field: bagged, tasks: [planTask({ step: "take:A:39" })] })))).toEqual({ op: { op: "hand-over", port: "A" }, ref: "standin:39:take:1" });
    const takenBack = open({ specimen: "bagged", camera: { port: "A", at: "gallbladder-bed", zoom: "wide" }, ports: field().ports });
    expect(stepOf(propose(standIn(39, { field: takenBack, refs: done(39, ["standin:39:take:1"]) })))).toEqual({ op: { op: "extract", port: "A" }, ref: "standin:39" });
  });

  it("hands its traction on an assist port to the traction assistant — read back, confirmed, held ('Holding.'); given up, it takes the port back and pulls again itself", () => {
    // four ports: its own grasper in D pulls the fundus cephalad (the reference's step 4)
    const plan = [...PLAN.slice(0, 3), { k: 3, op: { op: "insert", port: "D", instrument: "grasper" } as const }, { k: 4, op: { op: "retract", port: "D", structure: "gallbladder-fundus", direction: ["cephalad"], force: "firm" } as const }, ...PLAN.slice(3).map((x) => ({ ...x, k: x.k + 2 }))];
    const FIRST_ASSISTANT = FIRST;
    const D = { port: "D", role: "assist" as const, sizeMm: 5, instrument: "grasper" as const };
    const pulled = (holder?: string, pulling = true) =>
      open({
        plan: "mirror-four-port",
        camera: { port: "A", at: null, zoom: "wide", holder: "or.second" },
        ports: [{ ...field().ports[0]!, holder: "or.second" }, ...field().ports.slice(1), { ...D, ...(holder ? { holder } : {}) }],
        retractions: pulling ? [{ structure: "gallbladder-fundus", port: "D", direction: ["cephalad"], force: "firm" }] : [],
      });
    const colleagues = [colleague(FIRST_ASSISTANT, ["assist"], { controls: ["retract", "suction"] }), colleague(LEARNER, ["assist"], { controls: ["camera", "retract", "suction"] }), colleague(SCRUB, ["instruments", "count"], { controls: ["instruments", "count"] })];
    const view = (extra: Partial<MemberView>) => standIn(5, { plan, colleagues, ...extra });
    const p = propose(view({ field: pulled() }));
    expect(said(p)).toMatchObject({ to: FIRST_ASSISTANT, kind: "request", text: "Dr Abe, please hold the grasper in port D, pulling the fundus cephalad.", about: { field: { op: "traction", port: "D", structure: "gallbladder-fundus", direction: ["cephalad"], force: "firm" } } });
    const req = requestOf(p)!;
    expect(req).toMatchObject({ key: "traction:4", to: FIRST_ASSISTANT });
    // waiting for them (the read-back, then the port taken)
    expect(propose(view({ field: pulled(), tasks: [planTask({ request: { ...req, confirmed: true } })] }))).toBeNull();
    // they hold it, pulling as the reference does: done — the plan goes on
    const holding = propose(view({ field: pulled("or.first"), tasks: [planTask({ request: { ...req, confirmed: true } })] }));
    expect(sets(holding)).toContainEqual(expect.objectContaining({ requested: ["traction:4"] }));
    // given up while they hold the port and the pull has gone: the port taken back, then pulled again by the operator
    const lost = pulled("or.first", false);
    const gaveUp = planTask({ requested: ["traction:4"] });
    expect(said(propose(standIn(8, { plan, colleagues, field: lost, tasks: [gaveUp], refs: [...done(8)] })))).toMatchObject({ to: FIRST_ASSISTANT, text: "I'll take port D." });
    expect(stepOf(propose(standIn(8, { plan, colleagues, field: lost, tasks: [{ ...gaveUp, step: "take:D:8" }] })))).toEqual({ op: { op: "hand-over", port: "D" }, ref: "standin:8:take:1" });
    const back = pulled(undefined, false);
    expect(stepOf(propose(standIn(8, { plan, colleagues, field: back, tasks: [gaveUp], refs: done(8, ["standin:8:take:1"]) })))).toEqual({ op: { op: "retract", port: "D", structure: "gallbladder-fundus", direction: ["cephalad"], force: "firm" }, ref: "standin:8:retract:1" });
  });

  it("in the scrub nurse's place every instrument is asked for and waited for — never put in without the pass", () => {
    const scrubPlace = (extra: Partial<MemberView>) =>
      standIn(4, { passingRequired: true, colleagues: [colleague(FIRST, ["assist"], { controls: ["camera", "retract", "suction"] }), colleague(LEARNER, ["instruments", "count"], { controls: ["instruments", "count"] })], name: (who) => (who === LEARNER ? { en: "the scrub nurse (you)", "zh-CN": "洗手护士（你）" } : (NAMES_IN_PLACE[who] ?? { en: who, "zh-CN": who })), field: open({ ports: [field().ports[0]!, field().ports[1]!, { ...field().ports[2]!, instrument: null }] }), ...extra });
    const p = propose(scrubPlace({}));
    expect(said(p)).toMatchObject({ to: LEARNER, kind: "request", text: "The scrub nurse (you), Maryland dissector, please.", about: { field: { op: "pass", instrument: "maryland" } } });
    const req = requestOf(p)!;
    // read back, confirmed, not passed yet: it waits — asked once more, then it keeps waiting and says what for
    expect(propose(scrubPlace({ tasks: [planTask({ request: { ...req, confirmed: true } })] }))).toBeNull();
    const waiting = propose(scrubPlace({ round: 30, tasks: [planTask({ request: { ...req, confirmed: true, times: 2 } })] }));
    expect(said(waiting)).toMatchObject({ to: LEARNER, kind: "notice", text: "I'm waiting for the Maryland dissector to be passed." });
    expect(propose(scrubPlace({ round: 31, tasks: [planTask({ request: { ...req, confirmed: true, times: 2 }, reason: "pass:maryland" })] }))).toBeNull();
    // passed: the request is over, then the Maryland goes in (the pass taken)
    const passed = open({ ports: [field().ports[0]!, field().ports[1]!, { ...field().ports[2]!, instrument: null }], passed: [{ instrument: "maryland", by: "or.scrub" }] });
    expect(sets(propose(scrubPlace({ field: passed, tasks: [planTask({ request: { ...req, confirmed: true } })] })))).toContainEqual(expect.objectContaining({ requested: ["pass:standin:4"] }));
    expect(stepOf(propose(scrubPlace({ field: passed })))).toEqual({ op: { op: "insert", port: "C", instrument: "maryland" }, ref: "standin:4" });
    // out of the scrub nurse's place: no pass asked for
    expect(stepOf(propose(scrubPlace({ passingRequired: false })))).toEqual({ op: { op: "insert", port: "C", instrument: "maryland" }, ref: "standin:4" });
  });

  it("calls a critical step out one round before it: 'Clipping the cystic duct.' to the learner, then the clip", () => {
    const named = open({ tubes: [{ handle: "T2", appears: null, isolated: true, clips: 0, divided: false, namedAs: "cystic-duct", imaging: null }], ports: [field().ports[0]!, field().ports[1]!, { ...field().ports[2]!, instrument: "clip-applier" }] });
    const view = (extra: Partial<MemberView> = {}) => standIn(22, { field: named, label: (id) => (id === "cystic-duct" ? { en: "Cystic duct", "zh-CN": "胆囊管" } : (LABELS[id] ?? { en: id, "zh-CN": id })), ...extra });
    const p = propose(view());
    expect(p).toMatchObject({ kind: "say", to: LEARNER, message: { kind: "notice", text: { en: "Clipping the cystic duct.", "zh-CN": "正在夹闭胆囊管。" }, about: { callout: { op: "clip", handle: "T2" } } } });
    expect(sets(p)).toContainEqual(expect.objectContaining({ step: "callout:22" }));
    expect(stepOf(propose(view({ tasks: [planTask({ step: "callout:22" })] })))).toEqual({ op: REFERENCE_OPS[22], ref: "standin:22" });
    // a handle nobody named is called out by its handle
    expect(said(propose(standIn(22, { field: { ...named, tubes: [{ ...named.tubes[0]!, namedAs: null }] } })))).toMatchObject({ text: "Clipping T2." });
  });

  it("stopped by the learner: it looks at the field, says 'Stopped — tell me what you see.', waits for their word, then calls the step out again", () => {
    const stopped = afterStandIn(standIn(22), planTask({ step: "callout:22" }), { status: "failed", code: "DENIED", message: "The learner denied this action.", byLearner: true, ref: "standin:22" });
    expect(sets(stopped)).toContainEqual(expect.objectContaining({ step: "denied:22", status: "waiting" }));
    const looks = propose(standIn(22, { tasks: [planTask({ step: "denied:22", status: "waiting" })] }));
    expect(looks).toMatchObject({ kind: "observe", task: "task-9" });
    const asks = propose(standIn(22, { tasks: [planTask({ step: "inspected:22", status: "waiting" })] }));
    expect(said(asks)).toMatchObject({ to: LEARNER, kind: "request", text: "Stopped — tell me what you see.", about: { callout: { op: "clip", handle: "T2" } } });
    expect(asks!.kind === "say" && asks!.message.text["zh-CN"]).toBe("停下了——告诉我你看到了什么。");
    const req = requestOf(asks)!;
    const waiting = planTask({ step: "stopped:22", status: "waiting", request: req });
    // nothing until the learner says so — however long
    expect(propose(standIn(22, { round: 50, tasks: [waiting] }))).toBeNull();
    // their report is taken in; their confirmation sets it going: the same step, called out again
    const report = message({ id: "msg-40", thread: req.thread, from: LEARNER, to: STANDIN, kind: "report", about: {} });
    expect(sets(propose(standIn(22, { tasks: [waiting], inbox: [report] })))).toEqual([]);
    const confirm = message({ id: "msg-41", thread: req.thread, from: LEARNER, to: STANDIN, kind: "confirm", about: {} });
    const going = propose(standIn(22, { tasks: [waiting], inbox: [confirm] }));
    expect(sets(going)).toContainEqual(expect.objectContaining({ step: undefined, request: undefined, status: "accepted" }));
    expect(sets(propose(standIn(22, { tasks: [planTask()] })))).toContainEqual(expect.objectContaining({ step: "callout:22" }));
    // a refusal by a rule is not the learner's Stop
    expect(sets(afterStandIn(standIn(22), planTask({ step: "callout:22" }), { status: "failed", code: "DENIED", message: "denied", ref: "standin:22" }))).toContainEqual(expect.objectContaining({ failed: expect.objectContaining({ ref: "standin:22", times: 1 }) }));
  });

  it("says aloud an injury the screen shows — or one a colleague called — before its next step", () => {
    const p = propose(standIn(12, { injuries: [{ kind: "perforation", recognised: false }] }));
    expect(stepOf(p)).toEqual({ op: { op: "recognise", injury: "perforation" }, ref: "standin:12:recognise:1" });
    // a colleague's word is never the operator's: it says it itself
    expect(stepOf(propose(standIn(12, { injuries: [{ kind: "bile-duct-injury", recognised: false, calledBy: "or.first" }] })))).toEqual({ op: { op: "recognise", injury: "bile-duct-injury" }, ref: "standin:12:recognise:1" });
    expect(stepOf(propose(standIn(12, { injuries: [{ kind: "perforation", recognised: true }] })))).toEqual({ op: REFERENCE_OPS[12], ref: "standin:12" });
  });

  it("suctions the field when blood obscures it — the suction put into its working port when none is in — and irrigates spillage first", () => {
    const suction = open({ findings: ["bleeding", "field-obscured"], ports: [...field().ports, { port: "D", role: "working", sizeMm: 5, instrument: "suction" }] });
    expect(stepOf(propose(standIn(12, { field: suction })))).toEqual({ op: { op: "suction", port: "D" }, ref: "standin:12:suction:1" });
    const none = open({ findings: ["bleeding", "field-obscured"] });
    expect(stepOf(propose(standIn(12, { field: none })))).toEqual({ op: { op: "insert", port: "C", instrument: "suction" }, ref: "standin:12:insert:1" });
    const spill = open({ findings: ["bile", "stones"], ports: [...field().ports, { port: "D", role: "working", sizeMm: 5, instrument: "suction" }] });
    expect(stepOf(propose(standIn(12, { field: spill })))).toEqual({ op: { op: "irrigate", port: "D" }, ref: "standin:12:irrigate:1" });
    expect(stepOf(propose(standIn(12, { field: spill, refs: done(12, ["standin:12:irrigate:1"]) })))).toEqual({ op: { op: "suction", port: "D" }, ref: "standin:12:suction:1" });
    // the suction done as often as it may be: the plan goes on; the Maryland back in C first when the suction took its place
    expect(stepOf(propose(standIn(12, { field: suction, refs: done(12, ["standin:12:suction:1", "standin:12:suction:2"]) })))).toEqual({ op: REFERENCE_OPS[12], ref: "standin:12" });
    const exchanged = open({ ports: [field().ports[0]!, field().ports[1]!, { ...field().ports[2]!, instrument: "suction" }] });
    expect(stepOf(propose(standIn(12, { field: exchanged, refs: done(12, ["standin:12:insert:1", "standin:12:suction:1"]) })))).toEqual({ op: { op: "insert", port: "C", instrument: "maryland" }, ref: "standin:12:insert:2" });
  });

  it("no gas or no picture: it waits and says what for, once", () => {
    const noGas = open({ supply: { image: true, gas: false } });
    const p = propose(standIn(1, { field: noGas }));
    expect(said(p)).toMatchObject({ to: LEARNER, kind: "notice", text: "No CO₂ — I'm waiting for the insufflator." });
    expect(propose(standIn(1, { field: noGas, tasks: [planTask({ reason: "no-gas", status: "waiting" })] }))).toBeNull();
    expect(said(propose(standIn(12, { field: open({ supply: { image: false, gas: true } }) })))).toMatchObject({ text: "No picture — I'm waiting for the camera." });
    // back: the step, and the wait forgotten
    expect(sets(propose(standIn(1, { tasks: [planTask({ reason: "no-gas", status: "waiting" })] })))).toContainEqual(expect.objectContaining({ status: "accepted", reason: undefined }));
  });

  it("the gas through the device that offers it now (the tower), with its own body; at the table when none does", () => {
    const tower = { id: "eq:tower", operation: "start_insufflation" };
    expect(propose(standIn(1, { gasControl: (step) => (step === "insufflate" ? tower : null) }))).toMatchObject({ kind: "act", operation: "start_insufflation", targetId: "eq:tower", parameters: { pressure: 12 }, ref: "standin:1" });
    expect(stepOf(propose(standIn(1)))).toEqual({ op: { op: "insufflate", pressure: 12 }, ref: "standin:1" });
  });

  it("closes only once the count is settled — never on an open count", () => {
    const out = open({ specimen: "extracted" });
    expect(said(propose(standIn(40, { field: out, countSettled: false })))).toMatchObject({ to: LEARNER, kind: "notice", text: "I'll close once the count is settled." });
    expect(propose(standIn(40, { field: out, countSettled: false, tasks: [planTask({ reason: "count", status: "waiting" })] }))).toBeNull();
    expect(stepOf(propose(standIn(40, { field: out, countSettled: true })))).toEqual({ op: { op: "close" }, ref: "standin:40" });
    expect(stepOf(propose(standIn(40, { field: out, countSettled: null })))).toEqual({ op: { op: "close" }, ref: "standin:40" });
    // the plan done: its task ends
    expect(sets(propose(standIn(41, { field: open({ closed: true }) })))).toContainEqual(expect.objectContaining({ status: "done" }));
  });

  it("after a refusal: where the world points for reach; three refusals of one step in a row stop the operation there, saying why", () => {
    const goal = { kind: "interact" as const, id: PATIENT };
    expect(sets(afterStandIn(standIn(12), planTask(), { status: "failed", code: "SPATIAL_REQUIREMENT_UNMET", message: "Too far.", hint: goal, ref: "standin:12" }))).toContainEqual({ goal });
    expect(propose(standIn(12, { tasks: [planTask({ goal })] }))).toMatchObject({ kind: "act", operation: "navigate", goal });
    const once = afterStandIn(standIn(12), planTask(), { status: "failed", code: "invalid", message: "Rejected (invalid): no.", ref: "standin:12" });
    expect(sets(once)).toContainEqual({ failed: { ref: "standin:12", times: 1, code: "invalid" } });
    const third = afterStandIn(standIn(12), planTask({ failed: { ref: "standin:12", times: 2 } }), { status: "failed", code: "invalid", message: "Rejected (invalid): no.", reason: { en: "The hook cannot dissect here.", "zh-CN": "电钩在这里无法分离。" }, ref: "standin:12" });
    expect(said(third)).toMatchObject({ to: LEARNER, kind: "escalate", text: "I can't go on: The hook cannot dissect here." });
    expect(sets(third)).toContainEqual(expect.objectContaining({ status: "escalated" }));
    expect(sets(afterStandIn(standIn(12), planTask({ failed: { ref: "standin:12", times: 1 } }), { status: "completed", message: "Done.", ref: "standin:12" }))).toContainEqual({ failed: undefined });
  });

  it("answers a hold on closure as any surgeon does, and checks the wound", () => {
    const hold = message({ id: "msg-50", from: CIRC, to: STANDIN, kind: "request", about: { item: "swab", hold: true } });
    expect(say(propose(standIn(40, { inbox: [hold] })))).toMatchObject({ to: CIRC, message: { kind: "readback", text: { en: "Holding closure — checking the wound." } } });
  });

  it("the same view, the same proposal", () => {
    for (const upTo of [0, 3, 12, 19, 22, 39]) {
      const v = () => standIn(upTo, { tasks: upTo ? [planTask()] : [] });
      expect(propose(v()), String(upTo)).toEqual(propose(v()));
    }
  });
});
