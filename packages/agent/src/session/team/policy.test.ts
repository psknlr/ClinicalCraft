/**
 * The team's offline policies (docs/TEAM.md §4) on hand-built views: pure, so each rule is a plain input → proposal.
 */
import { describe, expect, it } from "vitest";
import type { TeamDuty } from "@clinicalcraft/core";
import { afterAct, propose, type ColleagueView, type ItemSighting, type MemberView } from "./policy.js";
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

describe("information a colleague holds (docs/TEAM.md §4.5)", () => {
  const TRIAGE = "staff:triage";
  const INFO = "anticoagulants";
  const FACT = { en: "(Wife) No, none of them.", "zh-CN": "（妻子）没有，一样都没有。" };
  const NAME = { en: "his anticoagulant history", "zh-CN": "他的抗凝用药情况" };
  const need = { need: { id: "i1", history: INFO, heldBy: "triage", for: "surgeon", blocks: "tenecteplase" }, forId: SURGEON, holderId: TRIAGE, noticedBy: CIRC };
  const inform = (extra: Partial<TeamTask> = {}) => task({ kind: "inform", need: "i1", item: INFO, holder: TRIAGE, blocks: "tenecteplase", ...extra });
  const infoView = (me: MemberState, extra: Partial<MemberView> = {}) =>
    view(me, { itemName: () => NAME, actName: () => ({ en: "IV tenecteplase", "zh-CN": "替奈普酶静脉溶栓" }), colleagues: [colleague(TRIAGE, ["inform"], { relief: true, present: false })], ...extra });

  it("the circulating nurse notices it, says who holds it and what waits meanwhile", () => {
    const p = say(propose(infoView(member(CIRC, ["circulate"]), { informs: [need] })));
    expect(p).toMatchObject({ to: SURGEON, message: { kind: "notice", about: { need: "i1", info: INFO, for: SURGEON } } });
    // (the test view names everyone by their body id)
    expect(p!.message.text.en).toBe("His anticoagulant history for actor:clinician — staff:triage has it; I'm getting it. IV tenecteplase waits until it's confirmed.");
    expect(p!.patch?.[0]).toMatchObject({ create: { kind: "inform", owner: CIRC, holder: TRIAGE, blocks: "tenecteplase", status: "open" } });
  });

  it("asks the one member who holds it (by phone), and escalates at once when they are away — with the reason", () => {
    const asked = say(propose(infoView(member(CIRC, ["circulate"]), { tasks: [inform()] })));
    expect(asked).toMatchObject({ to: TRIAGE, message: { kind: "request", about: { info: INFO } } });
    expect(sets(asked)).toContainEqual(expect.objectContaining({ status: "asked", assignee: TRIAGE }));
    const away = say(propose(infoView(member(CIRC, ["circulate"]), { tasks: [inform()], colleagues: [colleague(TRIAGE, ["inform"], { relief: true, absent: true })] })));
    expect(away).toMatchObject({ to: SURGEON, message: { kind: "escalate" } });
    expect(away!.message.text.en).toMatch(/hasn't come — staff:triage isn't available\. IV tenecteplase still waits\./);
    expect(sets(away)).toContainEqual(expect.objectContaining({ status: "escalated", reason: "holder-absent" }));
    // no answer within the wait: escalated (nobody else holds it, so there is no one to reroute to)
    const silent = say(propose(infoView(member(CIRC, ["circulate"]), { round: 9, tasks: [inform({ status: "asked", since: 5 })] })));
    expect(sets(silent)).toContainEqual(expect.objectContaining({ status: "escalated", reason: "no-answer" }));
  });

  it("the holder reports what they learned — the case's recorded answer — or says they do not have it", () => {
    const request = message({ id: "msg-3", from: CIRC, to: TRIAGE, kind: "request", about: { need: "i1", info: INFO, for: SURGEON } });
    const holder = member(TRIAGE, ["inform"], { relief: true });
    const told = say(propose(infoView(holder, { inbox: [request], knows: (info) => (info === INFO ? FACT : null) })));
    expect(told).toMatchObject({ to: CIRC, message: { kind: "report", replyTo: "msg-3", about: { info: INFO, fact: FACT } } });
    expect(told!.message.text.en).toBe("His anticoagulant history: (Wife) No, none of them.");
    const unknown = say(propose(infoView(holder, { inbox: [request], knows: () => null })));
    expect(unknown).toMatchObject({ message: { kind: "decline", about: { reason: "not-known" } } });
  });

  it("tells the person once they are in the room, confirms a right read-back, and says it again after a wrong one", () => {
    const me = member(CIRC, ["circulate"]);
    const report = message({ id: "msg-4", from: TRIAGE, to: CIRC, kind: "report", about: { need: "i1", info: INFO, for: SURGEON, fact: FACT } });
    const kept = propose(infoView(me, { inbox: [report], tasks: [inform({ status: "asked" })] }));
    expect(sets(kept)).toContainEqual(expect.objectContaining({ status: "waiting", fact: FACT }));
    // the doctor is out of the room: nothing said yet; in the room: told, as the holder said it
    expect(propose(infoView(me, { tasks: [inform({ status: "waiting", since: 5, fact: FACT })], inRoom: () => false }))).toBeNull();
    const relay = say(propose(infoView(me, { tasks: [inform({ status: "waiting", since: 5, fact: FACT })] })));
    expect(relay).toMatchObject({ to: SURGEON, message: { kind: "report", about: { info: INFO, fact: FACT } } });
    expect(relay!.message.text.en).toBe("His anticoagulant history, from staff:triage: (Wife) No, none of them.");
    const accepted = inform({ status: "accepted", fact: FACT });
    const right = say(propose(infoView(me, { inbox: [message({ id: "msg-6", from: SURGEON, to: CIRC, kind: "readback", about: { need: "i1", info: INFO, for: SURGEON, fact: FACT } })], tasks: [accepted] })));
    expect(right).toMatchObject({ to: SURGEON, message: { kind: "confirm", replyTo: "msg-6" } });
    expect(sets(right)).toContainEqual(expect.objectContaining({ status: "done", verified: true }));
    const wrong = say(propose(infoView(me, { inbox: [message({ id: "msg-7", from: SURGEON, to: CIRC, kind: "readback", about: { need: "i1", info: "allergies", for: SURGEON } })], tasks: [accepted] })));
    expect(wrong).toMatchObject({ to: SURGEON, message: { kind: "report", about: { info: INFO, fact: FACT } } });
    expect(sets(wrong)).toEqual([]);
  });

  it("the simulated surgeon reads information back, as it was said", () => {
    const told = message({ id: "msg-8", from: CIRC, to: SURGEON, kind: "report", about: { need: "i1", info: INFO, for: SURGEON, fact: FACT } });
    const p = say(propose(view(member(SURGEON, ["surgeon"]), { inbox: [told], itemName: () => NAME })));
    expect(p).toMatchObject({ to: CIRC, message: { kind: "readback", replyTo: "msg-8", about: { info: INFO, fact: FACT } } });
    expect(p!.message.text["zh-CN"]).toBe("复述——他的抗凝用药情况：（妻子）没有，一样都没有。");
  });
});
