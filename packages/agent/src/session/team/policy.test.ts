/**
 * The team's offline policies (docs/TEAM.md §4) on hand-built views: pure, so each rule is a plain input → proposal.
 */
import { describe, expect, it } from "vitest";
import type { TeamDuty } from "@clinicalcraft/core";
import { afterAct, propose, type ColleagueView, type ItemSighting, type MemberView, type SiteView } from "./policy.js";
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
    site: null,
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

/**
 * The operative site (docs/TEAM.md §4.5) on hand-built views: what each member does from what they have seen
 * themselves, what was said, and the room's record — never from where the mark really is.
 */
describe("the operative site", () => {
  const ANAES = "staff:or.anaes";
  const NAMES: Record<string, string> = { mark: "the skin mark", consent: "the consent form", imaging: "the CT", patient: "the patient himself", list: "the operating list", left: "the left", right: "the right" };
  const both = (en: string) => ({ en, "zh-CN": en });
  const SOURCES: SiteView["sources"] = [
    { id: "mark", kind: "mark", primary: false, readable: true },
    { id: "consent", kind: "document", primary: true, readable: true },
    { id: "imaging", kind: "imaging", primary: true, readable: true },
    { id: "patient", kind: "patient", primary: true, readable: true },
    { id: "list", kind: "document", primary: false, readable: true },
  ];
  function site(staff: string, extra: Partial<Omit<SiteView, "mine">> & { mine?: Record<string, string | null> } = {}): SiteView {
    const { mine = {}, ...rest } = extra;
    return {
      due: true,
      status: "unchecked",
      staff,
      sources: SOURCES,
      mine: new Map(Object.entries(mine)),
      open: null,
      pausedBy: null,
      verification: { verified: false, side: null, missing: ["consent", "imaging", "patient"], conflict: false, read: [] },
      corrections: [],
      confirmed: null,
      sideName: (x) => both(x === null ? "not marked" : (NAMES[x] ?? x)),
      sourceName: (x) => both(NAMES[x] ?? x),
      nameOf: (x) => both(x),
      step: both("the induction"),
      atPatient: true,
      ...rest,
    };
  }
  const nurse = member(CIRC, ["circulate"]);
  const surgeon = member(SURGEON, ["surgeon"]);
  const colleagues = [colleague(ANAES, ["anaesthesia"]), colleague(SCRUB, ["instruments"])];
  const siteTask = (extra: Partial<TeamTask> = {}): TeamTask => task({ id: "task-s", kind: "site", need: "site", item: "", thread: "thread-s", site: { told: [], reported: [] }, ...extra });
  const verifyTask = (extra: Partial<TeamTask> = {}): TeamTask => task({ id: "task-v", kind: "verify", need: "site", item: "", owner: SURGEON, initiator: CIRC, for: CIRC, thread: "thread-s", status: "accepted", ...extra });
  const act = (p: Proposal | null) => (p?.kind === "act" ? { operation: p.operation, ...(p.parameters ? { parameters: p.parameters } : {}), ...(p.goal ? { goal: p.goal } : {}) } : null);
  const RAISED = { by: "or.circulating", sources: ["mark", "consent"] as [string, string], values: ["right", "left"], escalated: false };
  const ALL_LEFT = { mark: "left", consent: "left", patient: "left", list: "left" };

  it("not due, or nothing for her: she does not start; due: she goes to the patient before she looks at the mark", () => {
    expect(propose(view(nurse, { site: site("or.circulating", { due: false, status: "none" }) }))).toBeNull();
    // settled by someone else before she began: not hers to redo
    expect(propose(view(nurse, { site: site("or.circulating", { status: "confirmed" }) }))).toBeNull();
    const first = propose(view(nurse, { site: site("or.circulating", { atPatient: false }) }));
    expect(act(first)).toEqual({ operation: "navigate", goal: { kind: "interact", id: "patient:or" } });
    expect(first!.patch).toContainEqual({ create: expect.objectContaining({ kind: "site", owner: CIRC, status: "open", site: { told: [], reported: [] } }) });
  });

  it("the first check: the mark, each document and the patient asked — her own eyes, once each; they agree: confirmed", () => {
    const steps: (Record<string, string | null> | undefined)[] = [undefined, { mark: "left" }, { mark: "left", consent: "left" }, { mark: "left", consent: "left", patient: "left" }];
    expect(steps.map((mine) => act(propose(view(nurse, { tasks: [siteTask()], site: site("or.circulating", mine ? { mine } : {}) })))?.parameters)).toEqual([{ source: "mark" }, { source: "consent" }, { source: "patient" }, { source: "list" }]);
    // she never reads the imaging herself; a patient who cannot answer is not asked
    const asleep = SOURCES.map((x) => (x.id === "patient" ? { ...x, readable: false } : x));
    expect(act(propose(view(nurse, { tasks: [siteTask()], site: site("or.circulating", { sources: asleep, mine: { mark: "left", consent: "left" } }) })))).toEqual({ operation: "site.read", parameters: { source: "list" } });
    expect(act(propose(view(nurse, { tasks: [siteTask()], site: site("or.circulating", { mine: ALL_LEFT }) })))).toEqual({ operation: "site.confirm", parameters: {} });
  });

  it("they do not agree — or there is no mark: raised between the mark and what differs from it", () => {
    expect(act(propose(view(nurse, { tasks: [siteTask()], site: site("or.circulating", { mine: { ...ALL_LEFT, mark: "right" } }) })))).toEqual({ operation: "site.raise", parameters: { sources: ["mark", "consent"] } });
    expect(act(propose(view(nurse, { tasks: [siteTask()], site: site("or.circulating", { mine: { ...ALL_LEFT, list: "right" } }) })))).toEqual({ operation: "site.raise", parameters: { sources: ["mark", "list"] } });
    expect(act(propose(view(nurse, { tasks: [siteTask()], site: site("or.circulating", { mine: { ...ALL_LEFT, mark: null } }) })))).toEqual({ operation: "site.raise", parameters: { sources: ["mark", "consent"] } });
  });

  it("a discrepancy open: she holds the step, asks the anaesthetist to hold and the surgeon to verify — then waits", () => {
    const open = (extra: Partial<SiteView> = {}) => site("or.circulating", { status: "discrepancy", open: RAISED, ...extra });
    expect(act(propose(view(nurse, { tasks: [siteTask()], colleagues, site: open() })))).toEqual({ operation: "site.pause", parameters: {} });
    const hold = propose(view(nurse, { tasks: [siteTask()], colleagues, site: open({ pausedBy: "or.circulating" }) }));
    expect(say(hold)).toMatchObject({ to: ANAES, message: { kind: "request", about: { site: { hold: true, sources: ["mark", "consent"], values: ["right", "left"] } }, text: { en: "Staff:or.anaes, please hold the induction: the site is not confirmed — the skin mark: the right; the consent form: the left." } } });
    expect(sets(hold)).toContainEqual({ site: { told: [ANAES], reported: [] } });
    const verify = propose(view(nurse, { tasks: [siteTask({ site: { told: [ANAES], reported: [] } })], colleagues, site: open({ pausedBy: "or.circulating" }) }));
    expect(say(verify)).toMatchObject({ to: SURGEON, message: { kind: "request", about: { site: { verify: true } } } });
    expect(say(verify)!.message.text.en).toContain("Please verify the side against the consent form, the CT and the patient himself, and mark the site.");
    expect(sets(verify)).toContainEqual(expect.objectContaining({ status: "asked", site: { told: [ANAES], reported: [], asked: 5 } }));
    // asked: nothing more until the surgeon reports — the hold stands
    const asked = siteTask({ status: "asked", site: { told: [ANAES], reported: [], asked: 5 } });
    expect(propose(view(nurse, { round: 40, tasks: [asked], colleagues, site: open({ pausedBy: "or.circulating" }) }))).toBeNull();
    // someone else's hold stands already: she does not place a second one
    expect(say(propose(view(nurse, { tasks: [siteTask()], colleagues, site: open({ pausedBy: "surgeon" }) })))).toMatchObject({ to: ANAES, message: { kind: "request" } });
  });

  it("check-back on the hold; the surgeon's report sends her to look again with her own eyes", () => {
    const asked = siteTask({ status: "asked", site: { told: [ANAES], reported: [], asked: 5 } });
    const s = site("or.circulating", { status: "discrepancy", open: RAISED, pausedBy: "or.circulating" });
    const readback = message({ id: "msg-3", thread: "thread-s", from: ANAES, to: CIRC, kind: "readback", about: { site: { hold: true } } });
    expect(say(propose(view(nurse, { tasks: [asked], inbox: [readback], site: s })))).toMatchObject({ to: ANAES, message: { kind: "confirm", replyTo: "msg-3", text: { en: "Yes — hold the induction." } } });
    const report = message({ id: "msg-4", thread: "thread-s", from: SURGEON, to: CIRC, kind: "report", about: { site: { verified: "left" } } });
    expect(sets(propose(view(nurse, { tasks: [asked], inbox: [report], site: s })))).toContainEqual(expect.objectContaining({ status: "accepted", site: { told: [ANAES], reported: [], asked: 5, recheck: true } }));
  });

  it("her second look: not verified — she says what is missing; verified — she reads everything again, then confirms", () => {
    const recheck = siteTask({ status: "accepted", site: { told: [ANAES], reported: [], asked: 5, recheck: true } });
    const open = (extra: Partial<SiteView> & { mine?: Record<string, string | null> }) => site("or.circulating", { status: "discrepancy", open: RAISED, pausedBy: "or.circulating", ...extra });
    const missing = propose(view(nurse, { tasks: [recheck], site: open({ verification: { verified: false, side: "left", missing: ["imaging", "patient"], conflict: false, read: [{ source: "consent", value: "left" }] } }) }));
    expect(say(missing)).toMatchObject({ to: SURGEON, message: { kind: "request", text: { en: "Not confirmed yet: nobody has checked the CT and the patient himself since the discrepancy." } } });
    expect(sets(missing)).toContainEqual(expect.objectContaining({ status: "asked", tried: [SURGEON], site: expect.objectContaining({ recheck: false }) }));
    const verified = { verified: true, side: "left", missing: [], conflict: false, read: [{ source: "consent", value: "left" }, { source: "imaging", value: "left" }, { source: "patient", value: "left" }] };
    // her looks from before the discrepancy do not count: she begins again at the mark
    expect(act(propose(view(nurse, { tasks: [recheck], site: open({ verification: verified }) })))).toEqual({ operation: "site.read", parameters: { source: "mark" } });
    // the mark still where it was: said, not confirmed
    expect(say(propose(view(nurse, { tasks: [recheck], site: open({ verification: verified, mine: { ...ALL_LEFT, mark: "right" } }) })))?.message.text.en).toBe("Not confirmed yet: the skin mark (the right) still does not agree with the consent form (the left).");
    expect(act(propose(view(nurse, { tasks: [recheck], site: open({ verification: verified, mine: ALL_LEFT }) })))).toEqual({ operation: "site.confirm", parameters: {} });
    // asked again and again with nothing changed: beyond the room
    expect(act(propose(view(nurse, { tasks: [{ ...recheck, tried: [SURGEON, SURGEON, SURGEON] }], site: open({ verification: verified, mine: { ...ALL_LEFT, mark: "right" } }) })))?.operation).toBe("site.escalate");
  });

  it("the evidence disagrees with itself: escalated with the reason, in both languages", () => {
    const recheck = siteTask({ status: "accepted", site: { told: [ANAES], reported: [], asked: 5, recheck: true } });
    const conflict = { verified: false, side: null, missing: [], conflict: true, read: [{ source: "consent", value: "right" }, { source: "imaging", value: "left" }] };
    const p = propose(view(nurse, { tasks: [recheck], site: site("or.circulating", { status: "discrepancy", open: RAISED, pausedBy: "or.circulating", verification: conflict }) }));
    expect(act(p)).toEqual({ operation: "site.escalate", parameters: { reason: { en: "the consent form says the right, but the CT says the left: what the side is verified against disagrees with itself", "zh-CN": expect.stringContaining("自相矛盾") } } });
    // escalated: said to the surgeon with the reason, and her task ends there — the hold is not released
    const said = propose(view(nurse, { tasks: [recheck], site: site("or.circulating", { status: "unresolved", open: { ...RAISED, escalated: true }, pausedBy: "or.circulating", verification: conflict }) }));
    expect(say(said)).toMatchObject({ to: SURGEON, message: { kind: "escalate", text: { en: "Site not confirmed — the consent form says the right, the CT says the left: it cannot be settled in this room, and the induction stays on hold." } } });
    expect(sets(said)).toContainEqual(expect.objectContaining({ status: "escalated", reason: "site-unresolved" }));
  });

  it("confirmed: her own hold released first, then said to the surgeon and to whoever was asked to hold", () => {
    const done = { by: "or.circulating", side: "left", basis: ["mark", "consent", "patient", "list"] };
    const verified = { verified: true, side: "left", missing: [], conflict: false, read: [{ source: "consent", value: "left" }, { source: "imaging", value: "left" }] };
    const corrected = (extra: Partial<SiteView> = {}) => site("or.circulating", { status: "corrected", confirmed: done, verification: verified, ...extra });
    const progress = { told: [ANAES], reported: [] as string[], asked: 5, recheck: true };
    expect(act(propose(view(nurse, { tasks: [siteTask({ site: progress })], site: corrected({ pausedBy: "or.circulating" }) })))).toEqual({ operation: "site.resume", parameters: {} });
    const toSurgeon = propose(view(nurse, { tasks: [siteTask({ site: progress })], site: corrected() }));
    expect(say(toSurgeon)).toMatchObject({ to: SURGEON, message: { kind: "report", about: { site: { confirmed: "left", released: true } } } });
    expect(say(toSurgeon)!.message.text.en).toBe("Site confirmed on the left: verified against the consent form and the CT, and I have looked at the mark and the consent form, the patient himself and the operating list again myself. The hold on the induction is released.");
    const toAnaesthetist = propose(view(nurse, { tasks: [siteTask({ site: { ...progress, reported: [SURGEON] } })], site: corrected() }));
    expect(say(toAnaesthetist)).toMatchObject({ to: ANAES, message: { kind: "report", text: { en: "Staff:or.anaes, the site is confirmed on the left — the hold on the induction is released." } } });
    expect(sets(propose(view(nurse, { tasks: [siteTask({ site: { ...progress, reported: [SURGEON, ANAES] } })], site: corrected() })))).toContainEqual(expect.objectContaining({ status: "done", verified: true }));
    // the control: no pause was ever called — one line to the surgeon, nobody else to tell
    const control = propose(view(nurse, { tasks: [siteTask()], site: site("or.circulating", { status: "confirmed", confirmed: done }) }));
    expect(say(control)!.message.text.en).toBe("Site checked: the mark is on the left, and the consent form, the patient himself and the operating list agree.");
    // someone else's hold still stands: it is theirs to release, and she says so
    expect(say(propose(view(nurse, { tasks: [siteTask({ site: progress })], site: corrected({ pausedBy: "surgeon" }) })))!.message.text.en).toContain("The hold on the induction is surgeon's to release.");
  });

  it("the simulated surgeon: reads back, verifies every piece of primary evidence, marks where it says, corrects a wrong document, reports", () => {
    const request = message({ id: "msg-5", thread: "thread-s", from: CIRC, to: SURGEON, kind: "request", about: { site: { verify: true } } });
    const begun = propose(view(surgeon, { inbox: [request], site: site("surgeon", { status: "discrepancy", open: RAISED }) }));
    expect(say(begun)).toMatchObject({ to: CIRC, message: { kind: "readback", replyTo: "msg-5", text: { en: "Stopping — I will verify the side myself." } } });
    expect(begun!.patch).toContainEqual({ create: expect.objectContaining({ kind: "verify", owner: SURGEON, initiator: CIRC, status: "accepted" }) });
    const at = (mine: Record<string, string | null>, extra: Partial<SiteView> = {}) => propose(view(surgeon, { tasks: [verifyTask()], site: site("surgeon", { status: "discrepancy", open: RAISED, mine, ...extra }) }));
    expect([{}, { consent: "left" }, { consent: "left", imaging: "left" }].map((mine) => act(at(mine))?.parameters)).toEqual([{ source: "consent" }, { source: "imaging" }, { source: "patient" }]);
    const primary = { consent: "left", imaging: "left", patient: "left" };
    // the mark is looked at, and made, beside the patient
    expect(act(at(primary, { atPatient: false }))).toEqual({ operation: "navigate", goal: { kind: "interact", id: "patient:or" } });
    expect(act(at(primary))).toEqual({ operation: "site.read", parameters: { source: "mark" } });
    expect(act(at({ ...primary, mark: "right" }))).toEqual({ operation: "site.mark", parameters: { side: "left" } });
    expect(act(at({ ...primary, mark: "left" }))).toEqual({ operation: "site.read", parameters: { source: "list" } });
    expect(act(at({ ...primary, mark: "left", list: "right" }))).toEqual({ operation: "site.amend", parameters: { source: "list", to: "left" } });
    const report = at({ ...primary, mark: "left", list: "left" }, { corrections: [{ what: "mark", side: "left", by: "surgeon" }] });
    expect(say(report)).toMatchObject({ to: CIRC, message: { kind: "report", about: { site: { verified: "left" } }, text: { en: "Verified against the consent form, the CT and the patient himself: the left. I have marked the site on the left." } } });
    expect(sets(report)).toContainEqual(expect.objectContaining({ status: "done" }));
    expect(say(at({ ...primary, mark: "left", list: "left" }))!.message.text.en).toBe("Verified against the consent form, the CT and the patient himself: the left. The mark is right.");
  });

  it("the simulated surgeon: evidence that disagrees with itself is said — nothing is marked on it", () => {
    const p = propose(view(surgeon, { tasks: [verifyTask()], site: site("surgeon", { status: "discrepancy", open: RAISED, mine: { consent: "right", imaging: "left", patient: "left" } }) }));
    expect(say(p)).toMatchObject({ to: CIRC, message: { kind: "decline", about: { site: { conflict: true } }, text: { en: "I cannot confirm the side: the consent form says the right, but the CT says the left." } } });
    expect(sets(p)).toContainEqual(expect.objectContaining({ status: "declined", reason: "site-conflict" }));
    // asked again: the same task taken up again, read back
    const again = message({ id: "msg-8", thread: "thread-s", from: CIRC, to: SURGEON, kind: "request", about: { site: { verify: true } } });
    const retaken = propose(view(surgeon, { inbox: [again], tasks: [verifyTask({ status: "done" })], site: site("surgeon", { status: "discrepancy", open: RAISED }) }));
    expect(say(retaken)).toMatchObject({ message: { kind: "readback" } });
    expect(sets(retaken)).toContainEqual(expect.objectContaining({ status: "accepted" }));
  });

  it("the anaesthetist reads the hold back; anything else said to them is taken in", () => {
    const anaesthetist = member(ANAES, ["anaesthesia"]);
    const hold = message({ id: "msg-2", thread: "thread-s", from: CIRC, to: ANAES, kind: "request", about: { site: { hold: true } } });
    expect(say(propose(view(anaesthetist, { inbox: [hold], site: site("or.anaes") })))).toMatchObject({ to: CIRC, message: { kind: "readback", replyTo: "msg-2", about: { site: { hold: true } }, text: { en: "Holding the induction." } } });
    expect(propose(view(anaesthetist, { inbox: [message({ id: "msg-6", from: CIRC, to: ANAES, kind: "report", about: { site: { confirmed: "left" } } })] }))).toEqual({ kind: "update", patch: [{ read: "msg-6" }] });
    expect(propose(view(anaesthetist))).toBeNull();
  });

  it("after a site act: refused for place — she walks where it points; refused by the record — said, never tried again blindly", () => {
    const t = siteTask({ status: "accepted", site: { told: [ANAES], reported: [], asked: 5, recheck: true } });
    const v = view(nurse, { tasks: [t], site: site("or.circulating") });
    const goal = { kind: "interact" as const, id: "patient:or" };
    expect(afterAct(v, t, { status: "completed", message: "ok", operation: "site.read" })).toBeNull();
    expect(afterAct(v, t, { status: "failed", code: "NOT_AT_PATIENT", message: "too far", operation: "site.read", hint: goal })).toEqual({ kind: "update", patch: [{ id: "task-s", set: { goal } }] });
    expect(act(propose(view(nurse, { tasks: [{ ...t, goal }], site: site("or.circulating") })))).toEqual({ operation: "navigate", goal });
    const refused = afterAct(v, t, { status: "failed", code: "REFUSED", message: "Not recorded: the mark has changed.", operation: "site.confirm" });
    expect(say(refused)).toMatchObject({ to: SURGEON, message: { kind: "request", text: { en: "Not confirmed yet: Not recorded: the mark has changed." } } });
    expect(sets(refused)).toContainEqual(expect.objectContaining({ status: "asked", tried: [SURGEON] }));
    const last = afterAct(v, { ...t, tried: [SURGEON, SURGEON, SURGEON] }, { status: "failed", code: "REFUSED", message: "Not recorded: the mark has changed.", operation: "site.confirm" });
    expect(say(last)).toMatchObject({ message: { kind: "escalate", text: { en: "Site not confirmed — Not recorded: the mark has changed." } } });
    // the surgeon's own refused act is said to whoever asked
    const mine = verifyTask();
    expect(say(afterAct(view(surgeon, { tasks: [mine], site: site("surgeon") }), mine, { status: "failed", code: "REFUSED", message: "Not recorded: no.", operation: "site.mark" }))).toMatchObject({ to: CIRC, message: { kind: "decline" } });
  });
});
