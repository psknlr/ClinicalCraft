/**
 * The team scheduler (docs/TEAM.md §2): one per session, in the session layer. A round wakes the members who
 * have something to do — an unread message, a task under way, a need they noticed — in a fixed order
 * (answering first, then work under way, then noticing; then the oldest message; then the stable staff id).
 * Each awakened member proposes at most one thing from their own view (`policy.ts`); a message is said aloud
 * and delivered to whoever can hear it; a world act goes through the action bus with the member's own body,
 * under a stable action id (a retried id returns the recorded result, and a completed id is never run again),
 * and its receipt is kept and shown to the member before the next round.
 *
 * Time: rounds are logical. A browser and a headless runner advance the team the same way — `run` after the
 * learner's own acts (autonomy `auto`), or one `step` at a time (autonomy `step`); waiting counts rounds, so a
 * colleague who does not answer is rerouted or escalated after a bounded wait. The world charges simulated
 * time for walking and acting, as it does for everyone.
 *
 * Knowledge: a member's view is built from what their body perceives in the world (`find` with their own
 * awareness), what was said to them and their own tasks. The scenario's hidden set-up (where an item really
 * is, who is on a break) reaches the policies only through the world.
 */
import { t, type CaseTeam, type Condition, type TeamNeed, type TeamScenario } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, RANGES, type ActorState, type WorldActionRequest, type WorldActionResult, type WorldRuntime } from "@clinicalcraft/world";
import type { EventMsg } from "../../protocol.js";
import { both, SURGEON_NAME, type Bilingual } from "./i18n.js";
import { afterAct, propose, type ColleagueView, type ItemSighting, type MemberView } from "./policy.js";
import { TEAM_STATE_VERSION, type ActionReceipt, type KnownNeed, type MemberId, type MemberState, type Proposal, type SurgeonMode, type TaskPatch, type TeamAutonomy, type TeamCheckpoint, type TeamMessage, type TeamState, type TeamTask } from "./types.js";

/** What the scheduler needs from the session. */
export interface TeamHost {
  world(): WorldRuntime;
  act(request: WorldActionRequest, signal: AbortSignal): Promise<WorldActionResult>;
  /** Simulated minute now. */
  clock(): number;
  phase(): string;
  locale: string;
  emit(msg: EventMsg): void;
  /** A member's line, as the learner hears it. */
  say(speaker: string, text: string): void;
  /** Does a condition hold on the case record now (a count falls due; closure has begun)? */
  holds(cond: Condition): boolean;
}

/** Closure has begun (the count's hold is broken when this holds before the count is settled). */
const CLOSURE: Condition = { procedure: { closed: true } };

const TERMINAL = new Set(["done", "declined", "escalated"]);

/** A member's body id from the case's reference (`surgeon` → the learner's avatar). */
export function memberActor(ref: string): MemberId {
  return ref === "surgeon" ? PRIMARY_ACTOR : `staff:${ref}`;
}

export class TeamScheduler {
  state: TeamState;
  autonomy: TeamAutonomy;
  surgeon: SurgeonMode = "learner";
  private readonly scenario: TeamScenario | null;
  private setUp = false;

  constructor(
    private readonly host: TeamHost,
    readonly config: CaseTeam,
    scenarioId: string | null,
    autonomy: TeamAutonomy = "auto",
  ) {
    this.scenario = scenarioId ? (config.scenarios.find((s) => s.id === scenarioId) ?? null) : null;
    this.autonomy = autonomy;
    const absent = new Set(this.scenario?.absent ?? []);
    const members: MemberState[] = [
      ...config.members.map((m) => ({ id: memberActor(m.staff), staff: m.staff, duties: [...m.duties], inbox: [], memory: [], relief: false, absent: absent.has(m.staff) })),
      ...(this.scenario?.relief ?? []).map((m) => ({ id: memberActor(m.staff), staff: m.staff, duties: [...m.duties], inbox: [], memory: [], relief: true, absent: absent.has(m.staff) })),
    ];
    this.state = { version: TEAM_STATE_VERSION, scenario: this.scenario?.id ?? null, round: 0, seq: 0, members, messages: [], receipts: [], tasks: [], claims: {}, completed: [], posted: [], extra: [] };
  }

  /* ---------------------------------------------------------------- */
  /* Checkpoint                                                        */
  /* ---------------------------------------------------------------- */

  /** The whole team state (JSON): round, inboxes, tasks, claims, receipts, completed action ids. */
  checkpoint(): TeamCheckpoint {
    return structuredClone({ format: "clinicalcraft-team@1" as const, state: this.state, autonomy: this.autonomy, surgeon: this.surgeon });
  }

  /** Restore a checkpoint: outstanding work resumes; completed actions are never run again. */
  restore(cp: TeamCheckpoint): void {
    if (cp.format !== "clinicalcraft-team@1" || cp.state?.version !== TEAM_STATE_VERSION) throw new Error(`not a team checkpoint (clinicalcraft-team@1, state version ${TEAM_STATE_VERSION})`);
    this.state = structuredClone(cp.state);
    this.autonomy = cp.autonomy;
    this.surgeon = cp.surgeon;
    this.setUp = true; // the world restored with it already holds the scenario's set-up
  }

  /* ---------------------------------------------------------------- */
  /* Running                                                           */
  /* ---------------------------------------------------------------- */

  /** Does the team work now (its phases)? */
  active(): boolean {
    return this.autonomy !== "off" && this.config.phases.includes(this.host.phase());
  }

  /** The scenario's set-up in the world (items moved) and its needs, once, when the team's phases begin. */
  private prepare(): void {
    if (!this.setUp) {
      this.setUp = true;
      const w = this.host.world();
      // the count's baseline: every item of the type the room holds, counted before incision (before anything went missing)
      const count = this.config.count;
      if (count && !this.state.count) this.state.count = { item: count.item, baseline: w.facility.placements.filter((p) => p.type === count.item && p.room === this.config.room).length, holds: 0 };
      const patient = w.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id ?? null;
      for (const item of this.scenario?.items ?? []) {
        const beside = item.beside === "patient" ? patient : `eq:${item.beside}`;
        if (beside) w.placeItem(`eq:${item.placement}`, beside, { ...(item.concealed ? { concealed: true } : {}), ...(item.inside ? { inside: true } : {}) });
      }
    }
    for (const need of this.scenario?.needs ?? []) {
      if (this.state.posted.includes(need.id)) continue;
      this.state.posted.push(need.id);
      const by = this.noticer(need);
      if (by) this.observe(by, "need", need.id, `${need.for} needs ${need.item}`);
    }
  }

  /** Post a need now (a request made in the room: "I need a needle holder"). */
  postNeed(need: TeamNeed): void {
    if (this.state.posted.includes(need.id)) return;
    this.state.posted.push(need.id);
    this.state.extra.push(structuredClone(need));
    const by = this.noticer(need);
    if (by) this.observe(by, "need", need.id, `${need.for} needs ${need.item}`);
  }

  private needs(): TeamNeed[] {
    return [...(this.scenario?.needs ?? []), ...this.state.extra];
  }

  private noticer(need: TeamNeed): MemberState | null {
    if (need.noticedBy) return this.member(memberActor(need.noticedBy));
    return this.state.members.find((m) => m.duties.includes("circulate") && !m.relief && !m.absent) ?? null;
  }

  /**
   * Run rounds until the team is idle (no message said, no act done in a round) — `untilIdle` — or every need
   * is settled, or `maxRounds`. Returns the rounds run.
   */
  async run(signal: AbortSignal, opts: { maxRounds?: number; untilIdle?: boolean } = {}): Promise<number> {
    if (!this.active()) return 0;
    const max = opts.maxRounds ?? 40;
    let n = 0;
    for (; n < max && !signal.aborted; n++) {
      const busy = await this.round(signal);
      if (opts.untilIdle !== false && !busy) {
        n++;
        break;
      }
      if (opts.untilIdle === false && this.settled()) {
        n++;
        break;
      }
    }
    return n;
  }

  /** Something was set in motion, and all of it ended: every posted need's supply task, and the count once due. */
  settled(): boolean {
    const posted = this.state.posted;
    const ledger = this.state.count;
    const needsDone = posted.every((need) => this.state.tasks.some((t) => t.kind === "supply" && t.need === need && TERMINAL.has(t.status)));
    const countDone = !ledger || ledger.dueRound === undefined || ledger.settledRound !== undefined;
    return (posted.length > 0 || ledger?.dueRound !== undefined) && needsDone && countDone;
  }

  /** One round: each awakened member proposes and carries out at most one thing. True when something was said or done. */
  async round(signal: AbortSignal): Promise<boolean> {
    if (!this.active()) return false;
    this.prepare();
    this.watchCount();
    let busy = false;
    for (const member of this.order()) {
      if (signal.aborted) break;
      const view = this.view(member);
      const p = propose(view);
      if (!p) continue;
      busy = (await this.carryOut(member, p, signal)) || busy;
    }
    this.state.round++;
    this.host.emit({ type: "team_event", event: { kind: "status", round: this.state.round, autonomy: this.autonomy, surgeon: this.surgeon } });
    return busy;
  }

  /** The count's record: when it fell due; closure begun while a discrepancy was unresolved. */
  private watchCount(): void {
    const ledger = this.state.count;
    const count = this.config.count;
    if (!ledger || !count) return;
    if (ledger.dueRound === undefined && this.host.holds(count.when)) ledger.dueRound = this.state.round;
    if (ledger.detectedRound !== undefined && ledger.settledRound === undefined && !ledger.closedOnHold && this.host.holds(CLOSURE)) ledger.closedOnHold = true;
  }

  /** The count's record follows what was said: a hold asked for, the count settled (correct, reconciled, unresolved). */
  private noteCount(m: TeamMessage): void {
    const ledger = this.state.count;
    if (!ledger) return;
    if (m.kind === "request" && m.about.hold) {
      ledger.holds++;
      ledger.detectedRound ??= this.state.round;
      return;
    }
    if (m.to !== PRIMARY_ACTOR || m.about.count === undefined || m.about.of === undefined || ledger.settledRound !== undefined) return;
    if (m.kind === "report" && m.about.count >= m.about.of) {
      ledger.outcome = ledger.holds > 0 ? "reconciled" : "correct";
      ledger.settledRound = this.state.round;
    } else if (m.kind === "escalate") {
      ledger.outcome = "unresolved";
      ledger.settledRound = this.state.round;
    }
  }

  /** Awake members in order: answering, then work under way, then noticing; oldest message; stable id. */
  private order(): MemberState[] {
    const rank = (m: MemberState): [number, number, string] => {
      const unread = m.inbox.map((id) => this.state.messages.findIndex((x) => x.id === id)).filter((i) => i >= 0);
      if (unread.length) return [0, Math.min(...unread), m.id];
      if (this.state.tasks.some((t) => t.owner === m.id && !TERMINAL.has(t.status))) return [1, 0, m.id];
      if (this.pendingNeeds(m).length || this.countDue(m)) return [2, 0, m.id];
      return [3, 0, m.id];
    };
    return this.state.members
      .filter((m) => !m.absent && !(m.id === PRIMARY_ACTOR && this.surgeon === "learner"))
      .map((m) => ({ m, r: rank(m) }))
      .filter((x) => x.r[0] < 3)
      .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || (a.r[2] < b.r[2] ? -1 : a.r[2] > b.r[2] ? 1 : 0))
      .map((x) => x.m);
  }

  /** The count is due and this member counts and has not counted yet. */
  private countDue(m: MemberState): boolean {
    return m.duties.includes("count") && this.state.count?.dueRound !== undefined && !this.state.tasks.some((t) => t.owner === m.id && t.kind === "count");
  }

  /** Needs a member noticed that no task of theirs covers yet. */
  private pendingNeeds(m: MemberState): KnownNeed[] {
    const noticed = new Set(m.memory.filter((o) => o.kind === "need").map((o) => o.ref));
    return this.needs()
      .filter((n) => noticed.has(n.id) && !this.state.tasks.some((t) => t.owner === m.id && t.need === n.id))
      .map((n) => ({ need: n, forId: memberActor(n.for), noticedBy: m.id }));
  }

  /* ---------------------------------------------------------------- */
  /* Carrying out a proposal                                           */
  /* ---------------------------------------------------------------- */

  private async carryOut(member: MemberState, p: Proposal, signal: AbortSignal): Promise<boolean> {
    if (p.kind === "update") {
      // taking a message in or changing one's own task is progress too (the next round has more to do)
      this.apply(member, p.patch);
      return p.patch.length > 0;
    }
    if (p.kind === "say") {
      this.apply(member, p.patch ?? []);
      this.send(member, p);
      return true;
    }
    // a world act, under a stable id: never twice, and a retry returns the recorded result
    this.apply(member, p.patch ?? []);
    const task = this.task(p.task);
    if (!task) return false;
    const actionId = `team.${task.id}.${task.acts + 1}`;
    const w = this.host.world();
    let r: WorldActionResult | null = this.state.completed.includes(actionId) ? w.feedback(actionId) : null;
    if (!r) {
      r = await this.host.act(
        { actionId, actorId: member.id, operation: p.operation, ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.goal ? { goal: p.goal } : {}), ...(p.parameters ? { parameters: p.parameters } : {}), onBehalfOf: task.initiator },
        signal,
      );
    }
    task.acts++;
    if (r.status === "completed" && !this.state.completed.includes(actionId)) this.state.completed.push(actionId);
    const receipt: ActionReceipt = {
      id: actionId,
      actor: member.id,
      operation: p.operation,
      ...(p.targetId ? { target: p.targetId } : {}),
      ...(p.recipient ? { recipient: p.recipient } : {}),
      initiator: task.initiator,
      outcome: r.status === "completed" ? "completed" : r.status === "cancelled" ? "cancelled" : "failed",
      ...(r.errorCode ? { code: r.errorCode } : {}),
      message: r.message.split("\n")[0] ?? "",
      worldVersion: w.version,
      at: this.host.clock(),
      ...(r.elapsedSeconds ? { seconds: r.elapsedSeconds } : {}),
      round: this.state.round,
      task: task.id,
    };
    this.state.receipts.push(receipt);
    this.observe(member, "receipt", receipt.id, `${receipt.operation} ${receipt.outcome}`);
    this.host.emit({ type: "team_event", event: { kind: "receipt", receipt: structuredClone(receipt) } });
    // the member inspects the receipt at once: a hand-over done is reported; a refusal they cannot fix is said
    const follow = afterAct(this.view(member), task, { status: r.status, ...(r.errorCode ? { code: r.errorCode } : {}), message: r.message, operation: p.operation, ...(r.hint?.goal ? { hint: r.hint.goal } : {}) });
    if (follow && follow.kind === "say") {
      this.apply(member, follow.patch ?? []);
      this.send(member, follow);
    } else if (follow?.kind === "update") this.apply(member, follow.patch);
    this.emitTask(task);
    return true;
  }

  /** Say a message: recorded, delivered to whoever can hear it, heard by the learner as the member's line. */
  private send(member: MemberState, p: Extract<Proposal, { kind: "say" }>): void {
    const to = this.member(p.to);
    const w = this.host.world();
    const sameRoom = (id: MemberId) => w.actor(id)?.room === this.config.room;
    // in the room aloud; a relief colleague by phone; the surgeon at the table (observer mode: the simulated surgeon)
    // an escalation reaches the person it is raised to wherever they are (they are called)
    const delivered = to ? !to.absent && (to.relief || sameRoom(to.id) || p.message.kind === "escalate") : p.to === PRIMARY_ACTOR;
    const id = `msg-${++this.state.seq}`;
    const message: TeamMessage = {
      id,
      ...p.message,
      from: member.id,
      to: p.to,
      room: this.config.room,
      patient: w.patientPlace() ? (w.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id ?? null) : null,
      at: this.host.clock(),
      round: this.state.round,
      delivered,
      read: false,
    };
    // check-back bookkeeping on the request a read-back or a confirmation answers
    const req = p.message.replyTo ? this.state.messages.find((m) => m.id === p.message.replyTo) : undefined;
    if (req && message.kind === "readback") req.readBack = true;
    if (req && message.kind === "confirm") {
      const original = this.state.messages.find((m) => m.thread === message.thread && m.kind === "request");
      if (original) original.verified = true;
    }
    this.state.messages.push(message);
    this.noteCount(message);
    if (delivered && to) to.inbox.push(id);
    if (delivered && to) this.observe(to, "message", id, `${message.kind} from ${member.id}`);
    this.host.emit({ type: "team_event", event: { kind: "message", message: structuredClone(message) } });
    this.host.say(this.displayName(member.id), t(message.text, this.host.locale));
  }

  private apply(member: MemberState, patches: readonly TaskPatch[]): void {
    for (const patch of patches) {
      if ("create" in patch) {
        if (!this.state.tasks.some((t) => t.id === patch.create.id)) {
          this.state.tasks.push(structuredClone(patch.create));
          this.emitTask(this.state.tasks.at(-1)!);
        }
      } else if ("claim" in patch) {
        // two tasks never carry one item: the first claim holds
        if (!this.state.claims[patch.claim]) this.state.claims[patch.claim] = patch.task;
      } else if ("release" in patch) {
        delete this.state.claims[patch.release];
      } else if ("read" in patch) {
        const m = this.state.messages.find((x) => x.id === patch.read);
        if (m) m.read = true;
        member.inbox = member.inbox.filter((x) => x !== patch.read);
      } else {
        const task = this.task(patch.id);
        if (task) {
          Object.assign(task, patch.set);
          this.emitTask(task);
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Learner as the surgeon                                            */
  /* ---------------------------------------------------------------- */

  /** The surgeon (the learner) answers a message: a read-back, a confirmation or a decline, recorded like any member's. */
  reply(messageId: string, kind: TeamMessage["kind"], text?: string): TeamMessage | null {
    const to = this.state.messages.find((m) => m.id === messageId);
    if (!to) return null;
    const surgeon = this.member(PRIMARY_ACTOR) ?? ({ id: PRIMARY_ACTOR, staff: "surgeon", duties: ["surgeon"], inbox: [], memory: [], relief: false, absent: false } satisfies MemberState);
    const said: Bilingual = text ? { en: text, "zh-CN": text } : to.text;
    // the reply is about the same thing (item, person); a count is only ever the counter's to report
    const { count: _count, of: _of, ...about } = to.about;
    this.send(surgeon, { kind: "say", to: to.from, message: { thread: to.thread, kind, text: said, about, evidence: [], replyTo: to.id } });
    to.read = true;
    return this.state.messages.at(-1) ?? null;
  }

  /* ---------------------------------------------------------------- */
  /* A member's view (role-scoped)                                     */
  /* ---------------------------------------------------------------- */

  private view(me: MemberState): MemberView {
    const w = this.host.world();
    const body = w.actor(me.id);
    const room = this.config.room;
    const actorOf = (id: MemberId): ActorState | null => w.actor(id);
    const distance = (a: ActorState | null, b: ActorState | null) => (a && b && a.pose.level === b.pose.level ? Math.hypot(a.pose.x - b.pose.x, a.pose.z - b.pose.z) : Infinity);
    const sees = (id: MemberId) => id === me.id || w.canSee(me.id, id);
    const busy = (id: MemberId) => this.state.tasks.some((t) => t.owner === id && !TERMINAL.has(t.status) && t.status !== "asked");
    const colleagues: ColleagueView[] = this.state.members
      .filter((m) => m.id !== me.id)
      .map((m) => ({ id: m.id, duties: m.duties, present: !m.absent && actorOf(m.id)?.room === room, busy: busy(m.id), relief: m.relief, absent: m.absent, distance: distance(body, actorOf(m.id)) }));
    const holderOf = (itemId: string) => w.actors().find((a) => a.holding.includes(itemId))?.id ?? null;
    const outOfService = new Set(Object.entries(w.snapshot().entities).filter(([, e]) => e.available === false).map(([id]) => id));
    // what the member's own body perceives or remembers (a remembered item is reported where it was last seen)
    const items = (type: string): ItemSighting[] =>
      w
        .find(me.id, { kind: "equipment", type, awareness: ["visible", "nearby", "remembered"], limit: 40 })
        .map((e) => {
          const perceived = e.awareness === "visible" || e.awareness === "nearby";
          const holder = holderOf(e.id);
          return {
            id: e.id,
            holder: holder && (perceived || holder === me.id) ? holder : null,
            perceived,
            inReach: e.inReach,
            inRoom: e.room === room || holder === me.id,
            distance: e.distance,
            usable: !outOfService.has(e.id),
          };
        })
        .sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : 1));
    const count = this.config.count;
    const ledger = this.state.count;
    return {
      me: { ...me, holding: body?.holding ?? [], inRoom: body?.room === room },
      room,
      count:
        count && ledger
          ? {
              item: count.item,
              of: ledger.baseline,
              due: ledger.dueRound !== undefined,
              places: count.searchPlaces.map((p) => `eq:${p}`),
              name: count.name ? both(count.name) : this.itemName(count.item),
              // what my eyes can count now: the items of the type I perceive in the room (lying, or in anyone's hands)
              seen: () => items(count.item).filter((s) => s.perceived && s.inRoom).length,
            }
          : null,
      patient: w.find(me.id, { kind: "patient", limit: 1 })[0]?.id ?? null,
      round: this.state.round,
      waitRounds: this.config.waitRounds,
      inbox: me.inbox.map((id) => this.state.messages.find((m) => m.id === id)!).filter(Boolean),
      tasks: this.state.tasks.filter((t) => t.owner === me.id),
      needs: this.pendingNeeds(me),
      colleagues,
      items,
      heldBy: (who, type) => {
        const a = actorOf(who);
        if (!a || !sees(who)) return [];
        return a.holding.filter((h) => w.entity(h)?.type === type);
      },
      inRoom: (who) => actorOf(who)?.room === room,
      sees: (who) => sees(who),
      // the world's own measure (to the person's footprint), as a hand-over checks it
      near: (who) => (w.find(me.id, { kind: ["actor", "staff"], maxDistance: RANGES.contact + 1 }).find((e) => e.id === who)?.distance ?? Infinity) <= RANGES.contact,
      claims: this.state.claims,
      name: (who) => (who === PRIMARY_ACTOR ? SURGEON_NAME : both(w.entity(who)?.name ?? who)),
      itemName: (type) => this.itemName(type),
      newId: (prefix) => `${prefix}-${++this.state.seq}`,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Small helpers                                                     */
  /* ---------------------------------------------------------------- */

  private member(id: MemberId): MemberState | null {
    return this.state.members.find((m) => m.id === id) ?? null;
  }

  private task(id: string): TeamTask | undefined {
    return this.state.tasks.find((t) => t.id === id);
  }

  private observe(m: MemberState, kind: "need" | "message" | "receipt" | "seen" | "holder", ref: string, fact: string): void {
    m.memory.push({ id: `obs-${++this.state.seq}`, round: this.state.round, at: this.host.clock(), kind, ref, fact });
  }

  private emitTask(task: TeamTask): void {
    this.host.emit({ type: "team_event", event: { kind: "task", task: structuredClone(task) } });
  }

  /** What the team calls an item type aloud: a need's `name`, else the type's name without its details. */
  private itemName(type: string): Bilingual {
    const named = this.needs().find((n) => n.item === type && n.name);
    if (named?.name) return both(named.name);
    const e = this.host.world().entities().find((x) => x.equipmentType?.id === type);
    const name = both(e?.equipmentType?.name ?? e?.name ?? type);
    return { en: name.en.replace(/\s*\([^)]*\)\s*$/u, ""), "zh-CN": name["zh-CN"].replace(/\s*[（(][^）)]*[）)]\s*$/u, "") };
  }

  private displayName(id: MemberId): string {
    if (id === PRIMARY_ACTOR) return t(SURGEON_NAME, this.host.locale);
    const e = this.host.world().entity(id);
    return e ? t(e.name, this.host.locale) : id;
  }
}
