/**
 * The team's offline policies (docs/TEAM.md §4): what each member does next, from their own view only —
 * what their body perceives, what was said to them, and the tasks they carry. Pure and deterministic: the
 * same view gives the same proposal, so a replay needs no model and a restored session decides as the
 * original did. A member proposes at most one thing per round: a message, a world act, or a change to
 * their tasks.
 *
 * - `circulate` (the circulating nurse): notices a need and says so; chooses whom to ask (a colleague whose
 *   duty it is, free and in the room — nearest first; a relief colleague after them; one who is busy is worth
 *   waiting for a while); verifies the read-back (check-back); watches for the result and verifies it
 *   physically (she sees the person it was for holding an item of that type); reroutes when the colleague
 *   does not answer or cannot do it; escalates to the person it was for when nobody can, saying why.
 * - `instruments` (the scrub nurse): reads a request back and waits for the confirmation; locates an item of
 *   that type she can see in the room (claiming it, so two tasks never carry one item), picks it up, reaches
 *   the person and hands it over, then reports; declines with the reason when she cannot.
 * - `surgeon` (the simulated surgeon of observer mode): acknowledges what is escalated to them.
 *
 * Knowledge: a member uses only what is in their view. An item is used only when the member perceives it
 * now (a remembered one may have been moved since: she looks where she last saw it, in the room she is in,
 * and it is not there).
 */
import type { TeamDuty } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type NavGoal } from "@clinicalcraft/world";
import { phrase, type Bilingual, type TeamPhrase } from "./i18n.js";
import type { KnownNeed, MemberId, MemberState, Proposal, TaskPatch, TeamMessage, TeamTask } from "./types.js";

/** An item of a type, as the member knows of it. */
export interface ItemSighting {
  id: string;
  /** Who holds it now, when the member can tell (null: it lies somewhere). */
  holder: MemberId | null;
  /** Perceived now (seen, or within sight nearby); else only remembered where it was last seen. */
  perceived: boolean;
  /** Within the member's reach now (they can pick it up). */
  inReach: boolean;
  /** Where the member believes it is: in the team's room. */
  inRoom: boolean;
  /** Metres from the member. */
  distance: number;
  /** In service (an item taken out of service is not used). */
  usable: boolean;
}

export interface ColleagueView {
  id: MemberId;
  duties: readonly TeamDuty[];
  /** In the team's room now, and not on a break. */
  present: boolean;
  /** Carrying a task of their own that is not finished. */
  busy: boolean;
  relief: boolean;
  /** Not available (a break): never asked. */
  absent: boolean;
  /** Metres from the member (Infinity: elsewhere). */
  distance: number;
}

/** The count as a member can know it (docs/TEAM.md §4.3). */
export interface CountView {
  /** Equipment type counted. */
  item: string;
  /** The baseline: items in the room before incision. */
  of: number;
  /** The count is due now. */
  due: boolean;
  /** Where the circulating nurse searches, in order (entity ids). */
  places: readonly string[];
  name: Bilingual;
  /** Items of the type the member perceives in the room now (lying, or in anyone's hands). */
  seen(): number;
}

/** What one member knows and can do now (built by the scheduler from the world, role-scoped). */
export interface MemberView {
  me: MemberState & { holding: readonly string[]; inRoom: boolean };
  /** The team's room (a facility room id). */
  room: string;
  /** The count the team keeps (null: none). */
  count: CountView | null;
  /** The patient's entity id, as the member knows it (the wound is searched there). */
  patient: string | null;
  round: number;
  waitRounds: number;
  /** Unread messages delivered to this member, oldest first. */
  inbox: readonly TeamMessage[];
  /** This member's tasks, every status. */
  tasks: readonly TeamTask[];
  /** Needs this member noticed that no task of theirs covers yet. */
  needs: readonly KnownNeed[];
  colleagues: readonly ColleagueView[];
  /** Items of an equipment type the member knows of, nearest first. */
  items(type: string): ItemSighting[];
  /** Items of this type the member sees `who` holding (verification); empty when none, or out of sight. */
  heldBy(who: MemberId, type: string): string[];
  /** Is `who` in the team's room (the member can tell: they are there together, or it was said)? */
  inRoom(who: MemberId): boolean;
  /** Does the member see `who` from where they stand (line of sight, field of view)? */
  sees(who: MemberId): boolean;
  /** Within arm's reach of `who` (a hand-over), as the world measures it. */
  near(who: MemberId): boolean;
  /** Item claims of the team (item id → task id). */
  claims: Readonly<Record<string, string>>;
  /** Names in both languages (messages). */
  name(who: MemberId): Bilingual;
  itemName(type: string): Bilingual;
  /** A new id (tasks, threads). */
  newId(prefix: string): string;
}

const TERMINAL = new Set(["done", "declined", "escalated"]);
/** The surgeon's body (the learner's avatar; the simulated surgeon in observer mode). */
const SURGEON = PRIMARY_ACTOR;
/** Colleagues asked in turn before the circulator escalates. */
const MAX_TRIES = 3;

/** Why a colleague declined (the decline's code) → how the circulator tells it; `escalate`: rerouting cannot help. */
const WHY: Readonly<Record<string, { phrase: TeamPhrase; escalate: boolean }>> = {
  "not-found": { phrase: "why.notFound", escalate: false },
  "recipient-absent": { phrase: "why.notHere", escalate: true },
  "hands-full": { phrase: "why.handsFull", escalate: true },
};

const has = (d: readonly TeamDuty[], duty: TeamDuty) => d.includes(duty);

interface SayOptions {
  extra?: Record<string, Bilingual>;
  replyTo?: string;
  patch?: TaskPatch[];
  /** A decline's reason code (the circulator reads it). */
  reason?: string;
}

/** A message about a task, in both languages. */
function say(v: MemberView, to: MemberId, kind: TeamMessage["kind"], key: TeamPhrase, task: TeamTask, o: SayOptions = {}): Proposal {
  return {
    kind: "say",
    to,
    message: {
      thread: task.thread,
      kind,
      text: phrase(key, { item: v.itemName(task.item), for: v.name(task.for), to: v.name(to), ...o.extra }),
      about: { need: task.need, item: task.item, for: task.for, ...(o.reason ? { reason: o.reason } : {}) },
      evidence: [],
      ...(o.replyTo ? { replyTo: o.replyTo } : {}),
    },
    patch: o.patch ?? [],
  };
}

/** The member's next step (null: nothing to do now). */
export function propose(v: MemberView): Proposal | null {
  if (v.me.absent) return null;
  if (has(v.me.duties, "surgeon")) return surgeon(v);
  if (has(v.me.duties, "circulate")) {
    const p = circulate(v);
    if (p) return p;
  }
  if (has(v.me.duties, "instruments") || has(v.me.duties, "count")) return scrub(v);
  return null;
}

const num = (n: number): Bilingual => ({ en: String(n), "zh-CN": String(n) });

/* ------------------------------------------------------------------ */
/* circulate                                                           */
/* ------------------------------------------------------------------ */

function circulate(v: MemberView): Proposal | null {
  // 1. answers to my requests first (oldest first)
  for (const m of v.inbox) {
    // a count, from whoever counts (never the surgeon's word for one)
    if (m.kind === "report" && m.about.count !== undefined && m.about.of !== undefined && m.from !== SURGEON) return countReported(v, m);
    const check = v.tasks.find((t) => t.thread === m.thread && t.kind === "check" && !TERMINAL.has(t.status));
    if (check) return checkMessage(v, check, m);
    const task = v.tasks.find((t) => t.thread === m.thread && t.kind === "supply");
    if (!task || TERMINAL.has(task.status)) return { kind: "update", patch: [{ read: m.id }] };
    if (m.kind === "readback") {
      // check-back: the read-back must say the same item for the same person
      if (m.about.item === task.item && m.about.for === task.for) return say(v, m.from, "confirm", "confirm", task, { replyTo: m.id, patch: [{ read: m.id }, { id: task.id, set: { status: "accepted", since: v.round } }] });
      return say(v, m.from, "request", "request", task, { replyTo: m.id, patch: [{ read: m.id }] });
    }
    if (m.kind === "decline") {
      const why = WHY[m.about.reason ?? ""] ?? { phrase: "why.failed" as const, escalate: false };
      const reasonText = phrase(why.phrase, { to: v.name(m.from), for: v.name(task.for), item: v.itemName(task.item) });
      const reason = m.about.reason ?? "declined";
      if (why.escalate) return escalate(v, { ...task, reason }, reasonText, [{ read: m.id }]);
      return { kind: "update", patch: [{ read: m.id }, { id: task.id, set: { status: "open", since: v.round, reason, reasonText } }] };
    }
    return { kind: "update", patch: [{ read: m.id }] };
  }
  // 2. a need noticed and not yet mine to see through: a supply task, acknowledged aloud to the person
  for (const n of v.needs) {
    const task: TeamTask = { id: v.newId("task"), kind: "supply", need: n.need.id, item: n.need.item, for: n.forId, owner: v.me.id, initiator: v.me.id, thread: v.newId("thread"), status: "open", since: v.round, tried: [], acts: 0, had: v.heldBy(n.forId, n.need.item) };
    return { kind: "say", to: n.forId, message: { thread: task.thread, kind: "notice", text: phrase("notice", { item: v.itemName(task.item), for: v.name(task.for) }), about: { need: task.need, item: task.item, for: task.for }, evidence: [] }, patch: [{ create: task }] };
  }
  // 3. a count discrepancy under way: search, then the recount
  for (const task of v.tasks) {
    if (task.kind === "check" && task.status === "open") {
      const p = searchStep(v, task);
      if (p) return p;
    }
  }
  // 4. my supply tasks
  for (const task of v.tasks) {
    if (task.kind !== "supply" || TERMINAL.has(task.status)) continue;
    // verified physical completion: I see the person it was for holding an item of that type — one they did not
    // have already, and not one that answered another request of theirs
    const credited = new Set(v.tasks.filter((x) => x.kind === "supply" && x.id !== task.id && x.verified && x.itemId).map((x) => x.itemId!));
    const held = v.heldBy(task.for, task.item).find((id) => !credited.has(id) && !(task.had ?? []).includes(id));
    if (held) return say(v, task.for, "report", "verified", task, { patch: [{ id: task.id, set: { status: "done", verified: true, since: v.round, itemId: held } }] });
    if (task.status === "open") {
      const p = ask(v, task);
      if (p) return p;
      continue;
    }
    // under way, and the person it is for is in the room but out of my sight: I turn (or step) to see for myself
    if (task.status === "accepted" && v.inRoom(task.for) && !v.sees(task.for)) return { kind: "act", task: task.id, operation: "navigate", goal: { kind: "look", id: task.for, sameRoom: true } };
    if (task.status === "asked" && v.round - task.since >= v.waitRounds) {
      // no read-back in time: ask the next colleague (or escalate when there is none)
      return { kind: "update", patch: [{ id: task.id, set: { status: "open", since: v.round, reason: "no-answer", reasonText: phrase("why.noAnswer", { to: v.name(task.assignee ?? "") }) } }] };
    }
    if (task.status === "accepted" && v.round - task.since >= v.waitRounds * 4) {
      // accepted, and nothing has come of it for long: raise it
      return escalate(v, { ...task, reason: "no-result" }, phrase("why.noAnswer", { to: v.name(task.assignee ?? "") }));
    }
  }
  return null;
}

/** Ask the right colleague, wait for one, or escalate. */
function ask(v: MemberView, task: TeamTask): Proposal | null {
  const qualified = v.colleagues.filter((c) => has(c.duties, "instruments") && !c.absent && !task.tried.includes(c.id));
  // free and in the room first (nearest), then a relief colleague (by phone)
  const free = qualified.filter((c) => c.present && !c.busy && !c.relief).sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : 1));
  const relief = qualified.filter((c) => c.relief && !c.busy).sort((a, b) => (a.id < b.id ? -1 : 1));
  const pick = task.tried.length < MAX_TRIES ? (free[0] ?? relief[0]) : undefined;
  if (pick) return say(v, pick.id, "request", "request", task, { patch: [{ id: task.id, set: { status: "asked", assignee: pick.id, since: v.round, tried: [...task.tried, pick.id] } }] });
  // a colleague whose duty it is is busy in the room: worth waiting for, for a while
  if (qualified.some((c) => c.present && c.busy) && v.round - task.since < v.waitRounds * 2) return null;
  return escalate(v, task, task.reasonText ?? phrase("why.nobody"));
}

function escalate(v: MemberView, task: TeamTask, reason: Bilingual, patch: TaskPatch[] = []): Proposal {
  const clause = { en: reason.en.replace(/[.。]\s*$/u, ""), "zh-CN": reason["zh-CN"].replace(/[.。]\s*$/u, "") };
  return say(v, task.for, "escalate", "unresolved", task, { extra: { reason: clause }, patch: [...patch, { id: task.id, set: { status: "escalated", since: v.round, reason: task.reason ?? "unresolved", reasonText: reason } }] });
}

/* ------------------------------------------------------------------ */
/* instruments                                                         */
/* ------------------------------------------------------------------ */

/** Items of the type the member could take now: perceived, in the room, in service, nobody's, not another task's. */
function takeable(v: MemberView, type: string, task?: TeamTask): ItemSighting[] {
  return v.items(type).filter((s) => s.perceived && s.inRoom && s.usable && !s.holder && (!v.claims[s.id] || v.claims[s.id] === task?.id));
}

function scrub(v: MemberView): Proposal | null {
  const instruments = has(v.me.duties, "instruments");
  // 1. requests and confirmations addressed to me
  for (const m of v.inbox) {
    if (m.kind === "request" && m.about.recount && has(v.me.duties, "count") && v.count) return recount(v, m);
    if (m.kind === "request" && m.about.item && m.about.for && instruments) {
      const existing = v.tasks.find((t) => t.thread === m.thread && t.kind === "deliver");
      if (existing) return { kind: "update", patch: [{ read: m.id }] }; // the same request again: already answered
      const task: TeamTask = { id: v.newId("task"), kind: "deliver", need: m.about.need ?? "", item: m.about.item, for: m.about.for, owner: v.me.id, initiator: m.from, thread: m.thread, status: "asked", since: v.round, tried: [], acts: 0 };
      // in the room and none of that type in sight (and none in my hands): say so at once, with the reason
      const mine = v.items(task.item).some((s) => s.holder === v.me.id);
      if (v.me.inRoom && !mine && takeable(v, task.item).length === 0) {
        return say(v, m.from, "decline", "notFound", task, { replyTo: m.id, reason: "not-found", patch: [{ read: m.id }, { create: { ...task, status: "declined", reason: "not-found" } }] });
      }
      // check-back: repeat it to the sender before acting
      return say(v, m.from, "readback", "readback", task, { replyTo: m.id, patch: [{ read: m.id }, { create: task }] });
    }
    if (m.kind === "confirm") {
      const task = v.tasks.find((t) => t.thread === m.thread && t.kind === "deliver" && t.status === "asked");
      return { kind: "update", patch: [{ read: m.id }, ...(task ? [{ id: task.id, set: { status: "accepted" as const, since: v.round } }] : [])] };
    }
    return { kind: "update", patch: [{ read: m.id }] };
  }
  // 2. the count, when it falls due
  if (has(v.me.duties, "count") && v.count?.due && !v.tasks.some((t) => t.kind === "count")) return firstCount(v, v.count);
  // 3. my accepted deliveries
  for (const task of v.tasks) {
    if (task.kind !== "deliver" || (task.status !== "accepted" && task.status !== "waiting")) continue;
    const step = deliver(v, task);
    if (step) return step;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* the count (docs/TEAM.md §4.3)                                       */
/* ------------------------------------------------------------------ */

/** Whom a count is reported to: the circulating nurse in the room, else the surgeon. */
function countTo(v: MemberView): MemberId {
  return v.colleagues.find((c) => has(c.duties, "circulate") && c.present)?.id ?? SURGEON;
}

/** The counter counts what she can see, and says it. */
function firstCount(v: MemberView, count: CountView): Proposal {
  const n = count.seen();
  const task: TeamTask = { id: v.newId("task"), kind: "count", need: "count", item: count.item, for: v.me.id, owner: v.me.id, initiator: v.me.id, thread: v.newId("thread"), status: "done", since: v.round, tried: [], acts: 0, counted: n };
  return { kind: "say", to: countTo(v), message: { thread: task.thread, kind: "report", text: phrase("countReport", { item: count.name, n: num(n), of: num(count.of) }), about: { item: count.item, count: n, of: count.of }, evidence: [] }, patch: [{ create: task }] };
}

/** Asked to recount: count again, and say it in the same thread. */
function recount(v: MemberView, m: TeamMessage): Proposal {
  const count = v.count!;
  const n = count.seen();
  const mine = v.tasks.find((t) => t.kind === "count");
  return {
    kind: "say",
    to: m.from,
    message: { thread: m.thread, kind: "report", text: phrase("countReport", { item: count.name, n: num(n), of: num(count.of) }), about: { item: count.item, count: n, of: count.of }, evidence: [], replyTo: m.id },
    patch: [{ read: m.id }, ...(mine ? [{ id: mine.id, set: { counted: n } }] : [])],
  };
}

/** The circulating nurse hears a count: correct — said to the surgeon; short — the hold, then the search. */
function countReported(v: MemberView, m: TeamMessage): Proposal {
  const n = m.about.count!;
  const of = m.about.of!;
  const name = v.count?.name ?? v.itemName(m.about.item ?? "");
  const surgeon = SURGEON;
  const check = v.tasks.find((t) => t.kind === "check" && !TERMINAL.has(t.status));
  const params = { item: name, n: num(n), of: num(of) };
  const about = { item: m.about.item ?? "", count: n, of };
  if (check) {
    const c = { ...check.count!, counted: [...check.count!.counted, n] };
    if (n >= of) return { kind: "say", to: surgeon, message: { thread: check.thread, kind: "report", text: phrase("countReconciled", params), about, evidence: [m.id] }, patch: [{ read: m.id }, { id: check.id, set: { status: "done", verified: true, since: v.round, count: c } }] };
    return { kind: "say", to: surgeon, message: { thread: check.thread, kind: "escalate", text: phrase("countUnresolved", params), about, evidence: [m.id] }, patch: [{ read: m.id }, { id: check.id, set: { status: "escalated", since: v.round, reason: "count-unresolved", count: c } }] };
  }
  // a count already settled (the same report again): taken in
  if (v.tasks.some((t) => t.kind === "check")) return { kind: "update", patch: [{ read: m.id }] };
  const task: TeamTask = { id: v.newId("task"), kind: "check", need: "count", item: m.about.item ?? "", for: surgeon, owner: v.me.id, initiator: v.me.id, thread: v.newId("thread"), status: n >= of ? "done" : "open", since: v.round, tried: [], acts: 0, count: { of, counted: [n], searched: [] } };
  if (n >= of) return { kind: "say", to: surgeon, message: { thread: task.thread, kind: "report", text: phrase("countCorrect", params), about, evidence: [m.id] }, patch: [{ read: m.id }, { create: { ...task, verified: true } }] };
  // short: stop the line — the surgeon holds closure and checks the wound (a read-back is expected)
  return { kind: "say", to: surgeon, message: { thread: task.thread, kind: "request", text: phrase("countHold", params), about: { ...about, hold: true }, evidence: [m.id] }, patch: [{ read: m.id }, { create: task }] };
}

/** The surgeon answers in the check's thread: the hold read back (confirmed: check-back), or the wound checked. */
function checkMessage(v: MemberView, check: TeamTask, m: TeamMessage): Proposal {
  const c = check.count!;
  if (m.kind === "readback") return { kind: "say", to: m.from, message: { thread: check.thread, kind: "confirm", text: phrase("holdConfirm"), about: m.about, evidence: [], replyTo: m.id }, patch: [{ read: m.id }, { id: check.id, set: { count: { ...c, held: true } } }] };
  if (m.kind === "report" || m.kind === "decline") return { kind: "update", patch: [{ read: m.id }, { id: check.id, set: { count: { ...c, wound: true } } }] };
  return { kind: "update", patch: [{ read: m.id }] };
}

/** The search of the room, place by place (the same places whatever happened), then the recount. */
function searchStep(v: MemberView, check: TeamTask): Proposal | null {
  const count = v.count;
  const c = check.count!;
  if (!count) return null;
  const foundAll = count.seen() >= c.of;
  const next = foundAll ? undefined : count.places.find((p) => !c.searched.includes(p));
  if (next) {
    if (check.goal) return { kind: "act", task: check.id, operation: "navigate", goal: check.goal, patch: [{ id: check.id, set: { goal: undefined } }] };
    if (c.at !== next) return { kind: "act", task: check.id, operation: "approach", targetId: next, patch: [{ id: check.id, set: { count: { ...c, at: next } } }] };
    return { kind: "act", task: check.id, operation: "search", patch: [{ id: check.id, set: { count: { ...c, searched: [...c.searched, next] } } }] };
  }
  // the room is searched (or the missing one is in sight): wait a while for the surgeon's wound check, then a recount
  if (!foundAll && !c.wound && v.round - check.since < v.waitRounds * 3) return null;
  const counter = v.colleagues.find((x) => has(x.duties, "count") && x.present);
  if (!counter) {
    // nobody else counts: I count again myself
    const n = count.seen();
    return countReported(v, { id: "self", thread: check.thread, from: v.me.id, to: v.me.id, kind: "report", text: phrase("countReport", { item: count.name, n: num(n), of: num(c.of) }), about: { item: count.item, count: n, of: c.of }, room: v.room, patient: null, at: 0, round: v.round, evidence: [], delivered: true, read: false });
  }
  return { kind: "say", to: counter.id, message: { thread: check.thread, kind: "request", text: phrase("recount", { to: v.name(counter.id), item: count.name }), about: { item: count.item, recount: true }, evidence: [] }, patch: [{ id: check.id, set: { status: "asked", since: v.round } }] };
}

function deliver(v: MemberView, task: TeamTask): Proposal | null {
  const release = task.itemId ? [{ release: task.itemId }] : [];
  const mine = v.items(task.item).find((s) => s.holder === v.me.id);
  if (!mine) {
    // called in from outside: go to the room first, then look
    if (!v.me.inRoom) return { kind: "act", task: task.id, operation: "navigate", goal: { kind: "room", id: v.room } };
    // the world pointed somewhere after a refusal: walk there first
    if (task.goal) return { kind: "act", task: task.id, operation: "navigate", goal: task.goal, patch: [{ id: task.id, set: { goal: undefined } }] };
    // locate one I can see: the one I claimed, else the nearest
    const free = takeable(v, task.item, task);
    const item = free.find((s) => s.id === task.itemId) ?? free[0];
    if (!item) return say(v, task.initiator, "decline", "notFound", task, { reason: "not-found", patch: [{ id: task.id, set: { status: "declined", since: v.round, reason: "not-found" } }, ...release] });
    const claim: TaskPatch[] = v.claims[item.id] === task.id ? [] : [{ claim: item.id, task: task.id }];
    const patch: TaskPatch[] = [...claim, { id: task.id, set: { itemId: item.id } }];
    return { kind: "act", task: task.id, operation: item.inReach ? "pick_up" : "approach", targetId: item.id, patch };
  }
  // holding it: the person must be at the table; then reach them and hand it over
  if (!v.inRoom(task.for)) {
    if (task.status !== "waiting") return { kind: "update", patch: [{ id: task.id, set: { status: "waiting", since: v.round } }] };
    if (v.round - task.since >= v.waitRounds) return say(v, task.initiator, "decline", "notHere", task, { reason: "recipient-absent", patch: [{ id: task.id, set: { status: "declined", since: v.round, reason: "recipient-absent" } }] });
    return null;
  }
  if (task.status === "waiting") return { kind: "update", patch: [{ id: task.id, set: { status: "accepted", since: v.round } }] };
  if (task.goal) return { kind: "act", task: task.id, operation: "navigate", goal: task.goal, patch: [{ id: task.id, set: { goal: undefined } }] };
  if (!v.near(task.for)) return { kind: "act", task: task.id, operation: "navigate", goal: { kind: "follow", id: task.for, range: 1 } };
  return { kind: "act", task: task.id, operation: "hand_over", targetId: mine.id, parameters: { to: task.for }, recipient: task.for };
}

/** After an act: what the member does with its outcome (a refusal they cannot recover from is said, with the reason). */
export function afterAct(v: MemberView, task: TeamTask, outcome: { status: string; code?: string; message: string; operation: string; hint?: NavGoal }): Proposal | null {
  const release = task.itemId ? [{ release: task.itemId }] : [];
  if (outcome.status === "completed") {
    if (outcome.operation === "search" && task.kind === "wound") return { kind: "update", patch: [{ id: task.id, set: { step: "searched" } }] };
    if (outcome.operation === "hand_over") return say(v, task.initiator, "report", "handed", task, { patch: [{ id: task.id, set: { status: "done", since: v.round } }, ...release] });
    return null;
  }
  if (outcome.code === "HANDS_FULL") return say(v, task.initiator, "decline", "handsFull", task, { reason: "hands-full", patch: [{ id: task.id, set: { status: "declined", since: v.round, reason: "hands-full" } }] });
  // reach and sight: walk where the world points (if it does), then try again from a fresh view
  if (outcome.code === "NOT_IN_RANGE" || outcome.code === "NOT_VISIBLE" || outcome.code === "MOVEMENT_INTERRUPTED") return outcome.hint ? { kind: "update", patch: [{ id: task.id, set: { goal: outcome.hint } }] } : null;
  const reason = outcome.message.split("\n")[0]!.replace(/[.。]\s*$/u, "");
  return say(v, task.initiator, "decline", "failedAct", task, { extra: { reason: { en: reason, "zh-CN": reason } }, reason: outcome.code ?? "failed", patch: [{ id: task.id, set: { status: "declined", since: v.round, reason: outcome.code ?? "failed" } }, ...release] });
}

/* ------------------------------------------------------------------ */
/* surgeon (observer mode)                                             */
/* ------------------------------------------------------------------ */

function surgeon(v: MemberView): Proposal | null {
  for (const m of v.inbox) {
    if (m.kind === "request" && m.about.hold) {
      // check-back: the hold read back; then the wound is checked
      const task: TeamTask = { id: v.newId("task"), kind: "wound", need: "count", item: m.about.item ?? "", for: v.me.id, owner: v.me.id, initiator: m.from, thread: m.thread, status: "accepted", since: v.round, tried: [], acts: 0 };
      return { kind: "say", to: m.from, message: { thread: m.thread, kind: "readback", text: phrase("holdReadback"), about: m.about, evidence: [], replyTo: m.id }, patch: [{ read: m.id }, { create: task }] };
    }
    if (m.kind === "escalate") {
      return { kind: "say", to: m.from, message: { thread: m.thread, kind: "report", text: phrase("acknowledged"), about: m.about, evidence: [m.id], replyTo: m.id }, patch: [{ read: m.id }] };
    }
    return { kind: "update", patch: [{ read: m.id }] };
  }
  for (const task of v.tasks) {
    if (task.kind !== "wound" || task.status !== "accepted" || !v.patient) continue;
    if (task.goal) return { kind: "act", task: task.id, operation: "navigate", goal: task.goal, patch: [{ id: task.id, set: { goal: undefined } }] };
    if (task.step !== "searched") return { kind: "act", task: task.id, operation: "search", targetId: v.patient };
    // what the search brought to light is taken out (and so counted); then the wound is reported checked
    const out = v.count && v.me.holding.length < 2 ? v.items(v.count.item).find((s) => s.perceived && !s.holder && s.distance <= 2.5) : undefined;
    if (out) return { kind: "act", task: task.id, operation: out.inReach ? "pick_up" : "approach", targetId: out.id };
    return { kind: "say", to: task.initiator, message: { thread: task.thread, kind: "report", text: phrase("woundChecked"), about: { item: task.item }, evidence: [] }, patch: [{ id: task.id, set: { status: "done", since: v.round } }] };
  }
  return null;
}
