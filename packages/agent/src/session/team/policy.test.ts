/**
 * The team's offline policies (docs/TEAM.md §4) on hand-built views: pure, so each rule is a plain input → proposal.
 */
import { describe, expect, it } from "vitest";
import type { FieldView, TeamDuty } from "@clinicalcraft/core";
import { afterOperate } from "./assistant.js";
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

  it("holding the camera, follows the work: one aim for each change of region, never a loop", () => {
    const camera = fieldTask(FIRST, { op: "camera" }, { status: "done" });
    const held = (extra: Partial<FieldView>) => field({ ports: [{ ...field().ports[0]!, holder: "or.first" }, ...field().ports.slice(1)], camera: { port: "A", at: null, zoom: "wide", holder: "or.first" }, ...extra });
    const triangle = propose(table(me, { tasks: [camera], field: held({ working: "hepatocystic-triangle" }) }));
    expect(operated(triangle)).toEqual({ op: "aim", port: "A", at: "hepatocystic-triangle" });
    expect(sets(triangle)).toContainEqual({ step: "followed:hepatocystic-triangle" });
    // the same region again (the aim refused, or turned elsewhere since): no second aim
    expect(propose(table(me, { tasks: [{ ...camera, step: "followed:hepatocystic-triangle" }], field: held({ working: "hepatocystic-triangle" }) }))).toBeNull();
    // aimed there already: nothing to do
    expect(propose(table(me, { tasks: [camera], field: held({ working: "hepatocystic-triangle", camera: { port: "A", at: "hepatocystic-triangle", zoom: "wide", holder: "or.first" } }) }))).toBeNull();
    // the work moves on: one more aim
    expect(operated(propose(table(me, { tasks: [{ ...camera, step: "followed:hepatocystic-triangle" }], field: held({ working: "cystic-plate" }) })))).toEqual({ op: "aim", port: "A", at: "cystic-plate" });
    // not holding the camera: never
    expect(propose(table(me, { tasks: [camera], field: field({ working: "cystic-plate" }) }))).toBeNull();
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
