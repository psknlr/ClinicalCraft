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
import {
  bodyControls,
  cameraPort,
  compareCount,
  countLedger,
  countStatus,
  memberBody,
  observeField,
  passingRequired,
  POSITION_TITLES,
  procedureFor,
  refOfBody,
  t,
  vocabularyStructures,
  type CaseDefinition,
  type CaseTeam,
  type Condition,
  type CountRecord,
  type FacilityDefinition,
  type FieldView,
  type ProcedureOp,
  type SessionState,
  type TeamNeed,
  type TeamScenario,
} from "@clinicalcraft/core";
import { PRIMARY_ACTOR, RANGES, type ActorState, type NavGoal, type WorldActionRequest, type WorldActionResult, type WorldRuntime } from "@clinicalcraft/world";
import type { EventMsg, TeamEvent } from "../../protocol.js";
import { checkTaskScope, THEATRE_TASK_CONTROL } from "../../tools/scope.js";
import { scopeActorOf } from "../../tools/scope-actor.js";
import type { SurgicalCount } from "../count.js";
import { afterFieldWalk, afterOperate, followStep } from "./assistant.js";
import { askText } from "./asks.js";
import { both, phrase, SURGEON_NAME, type Bilingual } from "./i18n.js";
import { afterAct, learnerCount, propose, type ColleagueView, type ItemSighting, type MemberView } from "./policy.js";
import { validTeamCheckpoint } from "./checkpoint.js";
import { TEAM_STATE_VERSION, type ActionReceipt, type FieldAsk, type KnownNeed, type MemberId, type MemberState, type Proposal, type SurgeonMode, type TaskPatch, type TeamAutonomy, type TeamCheckpoint, type TeamMessage, type TeamState, type TeamTask } from "./types.js";

/**
 * How a step in the operative field went (`TeamHost.operate`): the tool's outcome, with where the world points after a
 * refusal for reach, and the field's reason for a refusal in both languages, as the learner is told it (when the field
 * gives one: the member says it in their decline).
 */
export interface OperateOutcome {
  status: "completed" | "failed" | "cancelled";
  code?: string;
  message: string;
  hint?: NavGoal;
  reason?: Bilingual;
}

/** What the scheduler needs from the session. */
export interface TeamHost {
  /** The case, the facility and the session's state (the learner's place, the line-up: who is whose body). */
  readonly caseDef: CaseDefinition;
  readonly facility: FacilityDefinition | null;
  state(): SessionState;
  world(): WorldRuntime;
  act(request: WorldActionRequest, signal: AbortSignal): Promise<WorldActionResult>;
  /**
   * A member's step in the operative field: the `operate` tool through the team's caller, with the member's own body, the
   * step recorded with `ref` (the action id: carried out once) — in a turn of its own that always ends.
   */
  operate(member: MemberId, op: ProcedureOp, ref: string, signal: AbortSignal): Promise<OperateOutcome>;
  /** Has the field recorded a step with this ref (`ProcedureState.refs`)? */
  stepDone(ref: string): boolean;
  /** Simulated minute now. */
  clock(): number;
  phase(): string;
  locale: string;
  emit(msg: EventMsg): void;
  /** A member's line, as the learner hears it (`member`: who spoke — their body). */
  say(speaker: string, text: string, member?: MemberId): void;
  /**
   * Model-driven members (docs/CHARACTERS.md, `characters.engine: "llm"`): the member's move this round, decided by
   * their model from the legal moves (`rules` is the policy's own proposal). Absent: the rules decide.
   */
  decide?(member: MemberState, view: MemberView, rules: Proposal | null, signal: AbortSignal): Promise<Proposal | null>;
  /** Does a condition hold on the case record now (a count falls due; closure has begun)? */
  holds(cond: Condition): boolean;
  /** The session's surgical count (the one writer of the case's count record), or null. */
  count(): SurgicalCount | null;
  /** The case's count record now. */
  record(): CountRecord | undefined;
}

/** Closure has begun (the count's hold is broken when this holds before the count is settled). */
const CLOSURE: Condition = { procedure: { closed: true } };

const TERMINAL = new Set(["done", "declined", "escalated"]);

/** The operating table's delegation tasks (`checkTaskScope` by control): what a colleague may be handed there. */
const TABLE_TASKS: readonly string[] = Object.keys(THEATRE_TASK_CONTROL);

/** The kinds of task whose steps are the operative field's (an act's id may be in the field's record before the team's). */
const FIELD_TASKS: ReadonlySet<TeamTask["kind"]> = new Set(["assist", "operate"]);

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
    // each member is their body (core `memberBody`): the learner's own member — the surgeon, or the place they hold — is
    // the learner's avatar; the surgeon, while the learner holds a place, the stand-in's; the chosen line-up's
    // assistants join the base team; the colleague whose place the learner holds is not in it (they stand by)
    const lineup = host.state().lineup;
    const added = lineup ? ((config.lineups ?? []).find((l) => l.id === lineup)?.members ?? []) : [];
    const member = (m: { staff: string; duties: readonly CaseTeam["members"][number]["duties"][number][] }, relief: boolean): MemberState => ({ id: this.body(m.staff), staff: m.staff, duties: [...m.duties], inbox: [], memory: [], relief, absent: absent.has(m.staff) });
    const members: MemberState[] = [...config.members.map((m) => member(m, false)), ...added.map((m) => member(m, false)), ...(this.scenario?.relief ?? []).map((m) => member(m, true))];
    this.state = { version: TEAM_STATE_VERSION, scenario: this.scenario?.id ?? null, lifecycle: "pending", round: 0, seq: 0, members, messages: [], receipts: [], tasks: [], claims: {}, completed: [], posted: [], extra: [] };
  }

  /* ---------------------------------------------------------------- */
  /* Checkpoint                                                        */
  /* ---------------------------------------------------------------- */

  /** The whole team state (JSON): round, inboxes, tasks, claims, receipts, completed action ids. */
  checkpoint(): TeamCheckpoint {
    // closure on an open count is the case record's (its unsafe progression): the team's record follows it
    if (this.state.count && (this.record()?.unsafe.length ?? 0) > 0) this.state.count.closedOnHold = true;
    return structuredClone({ format: "clinicalcraft-team@1" as const, state: this.state, autonomy: this.autonomy, surgeon: this.surgeon });
  }

  /**
   * Restore a checkpoint: outstanding work resumes; completed actions are never run again. The scenario is set up
   * in the world only if it was still pending when saved (the world restored with an active one already holds it).
   */
  restore(cp: TeamCheckpoint): void {
    const valid = validTeamCheckpoint(cp);
    if (!valid) throw new Error(`not a team checkpoint (clinicalcraft-team@1, state version ${TEAM_STATE_VERSION})`);
    this.state = structuredClone(valid.state);
    this.autonomy = valid.autonomy;
    this.surgeon = valid.surgeon;
    this.setUp = this.state.lifecycle !== "pending";
  }

  /* ---------------------------------------------------------------- */
  /* Running                                                           */
  /* ---------------------------------------------------------------- */

  /** Does the team work now (its phases)? */
  active(): boolean {
    return this.autonomy !== "off" && this.config.phases.includes(this.host.phase());
  }

  /**
   * The scenario's set-up in the world (items moved) and its needs, once, when the team's phases begin. The count's
   * baseline is taken first — the items opened onto the field, by identity, before anything is moved — and a
   * documented transfer of the scenario is recorded in the count as it is set up.
   */
  private prepare(): void {
    if (!this.setUp) {
      this.setUp = true;
      const w = this.host.world();
      this.state.lifecycle = "active";
      const count = this.config.count;
      const counter = this.state.members.find((m) => m.duties.includes("count") && !m.relief)?.staff ?? this.circulator()?.staff ?? "surgeon";
      if (count) this.host.count()?.ensureBaseline(counter);
      if (count && !this.state.count) this.state.count = { item: count.item, baseline: this.record() ? countLedger(this.record()!).expected.length : 0, holds: 0 };
      const patient = w.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id ?? null;
      for (const item of this.scenario?.items ?? []) {
        const beside = item.beside === "patient" ? patient : `eq:${item.beside}`;
        if (beside) w.placeItem(`eq:${item.placement}`, beside, { ...(item.concealed ? { concealed: true } : {}), ...(item.inside ? { inside: true } : {}) });
        if (item.transfer) this.host.count()?.transfer(item.transfer.by ?? this.circulator()?.staff ?? counter, [`eq:${item.placement}`], t(item.transfer.to, "en"), t(item.transfer.reason, "en"));
      }
      this.state.setup = { round: this.state.round, at: this.host.clock(), worldVersion: w.version };
      this.host.emit({ type: "team_event", event: this.statusEvent() });
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
    if (this.state.lifecycle === "completed") this.state.lifecycle = "active";
    this.state.extra.push(structuredClone(need));
    const by = this.noticer(need);
    if (by) this.observe(by, "need", need.id, `${need.for} needs ${need.item}`);
  }

  /** The case's count record (the session's), if any. */
  private record(): CountRecord | undefined {
    return this.host.record();
  }

  /** The member who circulates (in the room, not on a break). */
  private circulator(): MemberState | undefined {
    return this.state.members.find((m) => m.duties.includes("circulate") && !m.relief && !m.absent);
  }

  private needs(): TeamNeed[] {
    return [...(this.scenario?.needs ?? []), ...this.state.extra];
  }

  private noticer(need: TeamNeed): MemberState | null {
    if (need.noticedBy) return this.member(this.body(need.noticedBy));
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

  /**
   * Something was set in motion, and all of it ended: every posted need's supply task, the count once due, and the work
   * in the operative field (`assist`, `operate` tasks) — one waiting only for the learner's confirmation is theirs to end.
   */
  settled(): boolean {
    const posted = this.state.posted;
    const ledger = this.state.count;
    const needsDone = posted.every((need) => this.state.tasks.some((t) => t.kind === "supply" && t.need === need && TERMINAL.has(t.status)));
    const countDone = !ledger || ledger.dueRound === undefined || ledger.settledRound !== undefined;
    const field = this.state.tasks.filter((t) => FIELD_TASKS.has(t.kind));
    const fieldDone = field.every((t) => TERMINAL.has(t.status) || (t.status === "asked" && t.initiator === PRIMARY_ACTOR && this.surgeon === "learner"));
    return (posted.length > 0 || ledger?.dueRound !== undefined || field.length > 0) && needsDone && countDone && fieldDone;
  }

  /** One round: each awakened member proposes and carries out at most one thing. True when something was said or done. */
  async round(signal: AbortSignal): Promise<boolean> {
    if (!this.active()) return false;
    this.prepare();
    this.watchCount();
    this.syncSteps();
    let busy = false;
    for (const member of this.order()) {
      if (signal.aborted) break;
      const view = this.view(member);
      const rules = propose(view);
      const p = this.host.decide ? await this.host.decide(member, view, rules, signal) : rules;
      if (!p) continue;
      busy = (await this.carryOut(member, p, signal)) || busy;
    }
    this.state.round++;
    if (this.state.lifecycle === "active" && this.settled()) this.state.lifecycle = "completed";
    this.host.emit({ type: "team_event", event: this.statusEvent() });
    return busy;
  }

  /** The scheduler's status: the round, the pace, who answers as the surgeon, and the learner's place and line-up (when chosen). */
  statusEvent(): Extract<TeamEvent, { kind: "status" }> {
    const s = this.host.state();
    return { kind: "status", round: this.state.round, autonomy: this.autonomy, surgeon: this.surgeon, ...(s.seat ? { seat: s.seat } : {}), ...(s.lineup ? { lineup: s.lineup } : {}) };
  }

  /** The count's timing: when it fell due; closure on an open count (read from the case's count record: its unsafe progression). */
  private watchCount(): void {
    const ledger = this.state.count;
    const count = this.config.count;
    if (!ledger || !count) return;
    if (ledger.dueRound === undefined && this.host.holds(count.when)) ledger.dueRound = this.state.round;
    if (!ledger.closedOnHold && ((this.record()?.unsafe.length ?? 0) > 0 || (ledger.detectedRound !== undefined && ledger.settledRound === undefined && this.host.holds(CLOSURE)))) ledger.closedOnHold = true;
  }

  /**
   * What was said goes into the case's count record first — a count (the ids, at its stage, by who counted), an
   * escalation (by who raised it), an item set aside off the field — then the team's timing follows: a hold asked
   * for, the count settled. The outcome is the record's status, never the team's say-so.
   */
  private noteCount(m: TeamMessage): void {
    const ledger = this.state.count;
    const count = this.host.count();
    if (!ledger || !count) return;
    const staff = this.member(m.from)?.staff ?? count.staffOf(m.from);
    if (m.about.ids && m.about.stage) count.record({ op: "count", ids: m.about.ids, staff, stage: m.about.stage });
    if (m.about.setAside?.length) count.transfer(staff, m.about.setAside, "set aside off the field", "not in this count");
    const surgeon = this.surgeonBody();
    if (m.kind === "escalate" && m.about.count !== undefined) count.record({ op: "escalate", staff, to: m.to === surgeon ? "surgeon" : (this.member(m.to)?.staff ?? m.to), reason: m.text.en });
    if (m.kind === "request" && m.about.hold) {
      ledger.holds++;
      ledger.detectedRound ??= this.state.round;
      return;
    }
    if (m.to !== surgeon || m.about.count === undefined || m.about.of === undefined || ledger.settledRound !== undefined) return;
    if (m.kind !== "report" && m.kind !== "escalate") return;
    const status = countStatus(this.record());
    ledger.outcome = status === "correct" ? "correct" : status === "reconciled" ? "reconciled" : "unresolved";
    ledger.settledRound = this.state.round;
  }

  /**
   * Awake members in order: answering, then work under way, then noticing — a need, the count due, the work to follow
   * with the camera they hold; oldest message; stable id.
   */
  private order(): MemberState[] {
    const following = this.following();
    const rank = (m: MemberState): [number, number, string] => {
      const unread = m.inbox.map((id) => this.state.messages.findIndex((x) => x.id === id)).filter((i) => i >= 0);
      if (unread.length) return [0, Math.min(...unread), m.id];
      if (this.state.tasks.some((t) => t.owner === m.id && !TERMINAL.has(t.status))) return [1, 0, m.id];
      if (this.pendingNeeds(m).length || this.countDue(m) || following(m)) return [2, 0, m.id];
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

  /**
   * Who holds the camera with the work to follow (`followStep`, the same rule their policy follows: the field as the
   * record has it now and their own tasks) — read once a round, and only while a colleague holds the camera port and
   * the work has a region.
   */
  private following(): (m: MemberState) => boolean {
    const c = this.host.caseDef;
    const s = this.host.state();
    const def = procedureFor(c, s);
    const procedure = s.procedure;
    if (!def || !procedure || !procedure.working || !cameraPort(procedure)?.holder) return () => false;
    let field: FieldView | null = null;
    return (m) => {
      const ref = refOfBody(c, s, m.id);
      if (typeof ref !== "string" || ref !== cameraPort(procedure)?.holder) return false;
      field ??= observeField(def, procedure);
      return followStep(field, ref, this.state.tasks.filter((t) => t.owner === m.id)) !== null;
    };
  }

  /** Needs a member noticed that no task of theirs covers yet. */
  private pendingNeeds(m: MemberState): KnownNeed[] {
    const noticed = new Set(m.memory.filter((o) => o.kind === "need").map((o) => o.ref));
    return this.needs()
      .filter((n) => noticed.has(n.id) && !this.state.tasks.some((t) => t.owner === m.id && t.need === n.id))
      .map((n) => ({ need: n, forId: this.body(n.for), noticedBy: m.id }));
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
    if (p.kind === "operate") return this.carryOutStep(member, p, signal);
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
    // the member inspects the receipt at once: a hand-over done is reported; a refusal they cannot fix is said (a field
    // task's walk to the table, in its own words)
    const outcome = { status: r.status, ...(r.errorCode ? { code: r.errorCode } : {}), message: r.message, operation: p.operation, ...(r.hint?.goal ? { hint: r.hint.goal } : {}) };
    const follow = task.kind === "assist" ? afterFieldWalk(this.view(member), task, outcome) : afterAct(this.view(member), task, outcome);
    if (follow && follow.kind === "say") {
      this.apply(member, follow.patch ?? []);
      this.send(member, follow);
    } else if (follow?.kind === "update") this.apply(member, follow.patch);
    this.emitTask(task);
    return true;
  }

  /**
   * A step in the operative field, under a stable action id (`team.<task>.<n>`, the step's `ref` in the field's record):
   * carried out once — an id the record or the team holds as done is never run again —, through the member's own body
   * (`TeamHost.operate`); its receipt is kept and shown to the member, who inspects the outcome at once (`afterOperate`).
   */
  private async carryOutStep(member: MemberState, p: Extract<Proposal, { kind: "operate" }>, signal: AbortSignal): Promise<boolean> {
    this.apply(member, p.patch ?? []);
    const task = this.task(p.task);
    if (!task) return false;
    this.syncSteps();
    const actionId = `team.${task.id}.${task.acts + 1}`;
    const done = this.state.completed.includes(actionId) || this.host.stepDone(actionId);
    const r: OperateOutcome = done ? { status: "completed", message: "" } : await this.host.operate(member.id, p.op, actionId, signal);
    task.acts++;
    if (r.status === "completed" && !this.state.completed.includes(actionId)) this.state.completed.push(actionId);
    const op = p.op;
    const target: string | undefined = "port" in op ? op.port : "instrument" in op ? op.instrument : undefined;
    const receipt: ActionReceipt = {
      id: actionId,
      actor: member.id,
      operation: "operate",
      step: op.op,
      ...(target ? { target } : {}),
      initiator: task.initiator,
      outcome: r.status,
      ...(r.code ? { code: r.code } : {}),
      message: r.message.split("\n")[0] ?? "",
      worldVersion: this.host.world().version,
      at: this.host.clock(),
      round: this.state.round,
      task: task.id,
    };
    this.state.receipts.push(receipt);
    this.observe(member, "receipt", receipt.id, `${op.op} ${receipt.outcome}`);
    this.host.emit({ type: "team_event", event: { kind: "receipt", receipt: structuredClone(receipt) } });
    const follow = afterOperate(this.view(member), task, { ...r, op });
    if (follow?.kind === "say") {
      this.apply(member, follow.patch ?? []);
      this.send(member, follow);
    } else if (follow?.kind === "update") this.apply(member, follow.patch);
    this.emitTask(task);
    return true;
  }

  /**
   * The team's record catching up with the field's and the world's (exactly once across a save): an action id of a
   * field task's that the field recorded as a step's `ref`, or the world as a result, is that act done — its counter moves
   * past it, so the next act never takes its id and nothing is done twice. What the field cannot show once it is done is
   * taken from the record too: a pass task with a step recorded has passed (the instrument may be in already), a letting
   * go with a step recorded was said.
   */
  private syncSteps(): void {
    const w = this.host.world();
    for (const task of this.state.tasks) {
      if (!FIELD_TASKS.has(task.kind)) continue;
      for (;;) {
        const next = `team.${task.id}.${task.acts + 1}`;
        const stepped = this.host.stepDone(next);
        if (!stepped && !w.feedback(next)) break;
        task.acts++;
        if (!this.state.completed.includes(next) && (stepped || w.feedback(next)?.status === "completed")) this.state.completed.push(next);
        if (stepped && task.kind === "assist" && task.field?.op === "pass") task.step = "passed";
        if (stepped && task.kind === "assist" && task.field?.op === "release") task.step ??= "announced";
      }
    }
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
    // check-back bookkeeping on the request a read-back or a confirmation answers: a read-back counts only from the
    // person the request was said to, about the same item for the same person
    const req = p.message.replyTo ? this.state.messages.find((m) => m.id === p.message.replyTo) : undefined;
    if (req && message.kind === "readback" && req.to === member.id && (message.about.item ?? null) === (req.about.item ?? null) && (message.about.for ?? null) === (req.about.for ?? null)) req.readBack = true;
    if (req && message.kind === "confirm") {
      const original = this.state.messages.find((m) => m.thread === message.thread && m.kind === "request");
      if (original) original.verified = true;
    }
    this.state.messages.push(message);
    this.noteCount(message);
    if (delivered && to) to.inbox.push(id);
    if (delivered && to) this.observe(to, "message", id, `${message.kind} from ${member.id}`);
    this.host.emit({ type: "team_event", event: { kind: "message", message: structuredClone(message) } });
    this.host.say(this.displayName(member.id), t(message.text, this.host.locale), member.id);
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

  /**
   * The surgeon (the learner) answers a message said to them — a read-back, a confirmation or a decline, recorded
   * like any member's: in their own words (`text`), else a confirmation says "Yes — go ahead.", a decline "No — not
   * now.", anything else repeats what it answers. A message said to someone else is theirs to answer (refused:
   * `notYours`); observing, nothing is answered (`observer`). A read-back is about what it names: an instrument named
   * (`item`, or in its words) other than the one asked for reads back nothing — the request is not read back, and the
   * sender asks again.
   */
  reply(messageId: string, kind: TeamMessage["kind"], text?: string, item?: string): { message: TeamMessage } | { refused: "unknown" } | { refused: "notYours"; to: MemberId } | { refused: "observer" } {
    // observing: the learner's part is played for them (the simulated surgeon answers)
    if (this.surgeon === "simulated") return { refused: "observer" };
    const to = this.state.messages.find((m) => m.id === messageId);
    if (!to) return { refused: "unknown" };
    if (to.to !== PRIMARY_ACTOR) return { refused: "notYours", to: to.to };
    const surgeon = this.learnerMember();
    // the learner's own words; without them a confirmation or a decline says so ("Yes — go ahead."), anything else repeats what it answers
    const said: Bilingual = text ? { en: text, "zh-CN": text } : kind === "confirm" ? phrase("reply.confirm") : kind === "decline" ? phrase("reply.decline") : to.text;
    // the reply is about the same thing (item, person); a count — its items, what was set aside — is only ever the counter's to report
    const { count: _count, of: _of, ids: _ids, stage: _stage, setAside: _setAside, ...about } = to.about;
    const named = item?.trim() || (text ? this.itemNamedIn(text) : null);
    if (named) about.item = named;
    this.send(surgeon, { kind: "say", to: to.from, message: { thread: to.thread, kind, text: said, about, evidence: [], replyTo: to.id } });
    to.read = true;
    return { message: this.state.messages.at(-1)! };
  }

  /** The learner's own member: the surgeon while they operate, the place's member while they hold one. */
  private learnerMember(): MemberState {
    return this.member(PRIMARY_ACTOR) ?? ({ id: PRIMARY_ACTOR, staff: "surgeon", duties: ["surgeon"], inbox: [], memory: [], relief: false, absent: false } satisfies MemberState);
  }

  /**
   * The learner asks a member of the team for something in the operative field (`team ask`): said aloud as a request
   * from the learner's own member (`about.field`), in both languages; the member reads it back, the learner confirms it
   * (`reply`), the member acts and reports — or declines at once, saying why. Refused: observing, nobody of that name in
   * the team (`to`: their staff id, or `staff:<id>`), the learner's own member, one away this encounter, the one who
   * operates, one who is not in the team's room now (a relief colleague is called by phone: asked all the same).
   */
  ask(to: string, field: FieldAsk): { message: TeamMessage } | { refused: "observer" } | { refused: "unknown" | "self" | "absent" | "operator" | "away"; to: string } {
    if (this.surgeon === "simulated") return { refused: "observer" };
    const ref = to.replace(/^staff:/u, "");
    // by staff id, as the facility names them, or by body (the stand-in is the surgeon member's body)
    const target = this.state.members.find((m) => m.id === to || m.id === `staff:${ref}` || m.staff === ref);
    if (!target) return { refused: "unknown", to };
    if (target.id === PRIMARY_ACTOR) return { refused: "self", to: target.id };
    if (target.absent) return { refused: "absent", to: target.id };
    if (target.id === this.surgeonBody()) return { refused: "operator", to: target.id };
    // said aloud in the room: one who is not there would never hear it (the same rule `send` delivers by)
    if (!target.relief && this.host.world().actor(target.id)?.room !== this.config.room) return { refused: "away", to: target.id };
    const me = this.learnerMember();
    const v = this.view(me);
    if (this.state.lifecycle === "completed") this.state.lifecycle = "active";
    this.send(me, { kind: "say", to: target.id, message: { thread: v.newId("thread"), kind: "request", text: askText(v, field, target.id), about: { field: structuredClone(field) }, evidence: [] } });
    return { message: this.state.messages.at(-1)! };
  }

  /**
   * The learner who holds the count says it (`team count`): exactly what the simulated counter's policy would say in
   * their place (`learnerCount`), from the same `CountView` — a recount asked of them, else the count once due — and the
   * items are the view's, what the team in the room can account for: never typed. Refused: observing, no count kept, the
   * count not theirs (`counters`: whose it is); nothing to count now — the count not due yet (`notDue`), or said already
   * with no recount asked for (`said`).
   */
  count(): { message: TeamMessage } | { refused: "observer" | "none" | "notDue" | "said" } | { refused: "notYours"; counters: MemberId[] } {
    if (this.surgeon === "simulated") return { refused: "observer" };
    if (!this.config.count || !this.host.count() || !this.record()) return { refused: "none" };
    const me = this.learnerMember();
    if (!me.duties.includes("count")) return { refused: "notYours", counters: this.state.members.filter((m) => m.duties.includes("count") && !m.absent).map((m) => m.id) };
    this.prepare();
    this.watchCount();
    const p = learnerCount(this.view(me));
    if (!p || p.kind !== "say") return { refused: this.state.count?.dueRound !== undefined && this.state.tasks.some((t) => t.owner === me.id && t.kind === "count") ? "said" : "notDue" };
    this.apply(me, p.patch ?? []);
    this.send(me, p);
    return { message: this.state.messages.at(-1)! };
  }

  /** The equipment type a reply names in its words (the longest name of a type in the room's hospital), or null. */
  private itemNamedIn(text: string): string | null {
    const said = text.toLowerCase();
    let best: { type: string; length: number } | null = null;
    for (const e of this.host.world().entities()) {
      const type = e.equipmentType;
      if (!type || e.portable !== "handheld") continue;
      const plain = this.itemName(type.id);
      const words = plain.en.trim().split(/\s+/u);
      // what people call it: its name, without an eponym ("Mayo-Hegar needle holder" → "needle holder", "持针器")
      const spoken = [plain.en, plain["zh-CN"], words.length >= 3 ? words.slice(-2).join(" ") : "", plain["zh-CN"].replace(/^[A-Za-z0-9 .\-]+/u, "")];
      for (const n of [both(type.name).en, both(type.name)["zh-CN"], ...spoken]) {
        const name = n.toLowerCase().trim();
        if (name.length >= 2 && said.includes(name) && (!best || name.length > best.length)) best = { type: type.id, length: name.length };
      }
    }
    return best?.type ?? null;
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
    const c = this.host.caseDef;
    const s = this.host.state();
    const facility = this.host.facility;
    // a body's controls in the field and the operating table's tasks it may be handed (asked for only when needed)
    const controlsOf = (id: MemberId) => bodyControls(c, s, facility, id, "field");
    const handedTo = (id: MemberId): string[] => {
      const scope = scopeActorOf(c, s, facility, w, id, "en");
      return scope ? TABLE_TASKS.filter((task) => checkTaskScope(scope, task, c, "en").ok) : [...TABLE_TASKS];
    };
    const colleagues: ColleagueView[] = this.state.members
      .filter((m) => m.id !== me.id)
      .map((m) => {
        const colleague: ColleagueView = { id: m.id, duties: m.duties, present: !m.absent && actorOf(m.id)?.room === room, busy: busy(m.id), relief: m.relief, absent: m.absent, distance: distance(body, actorOf(m.id)) };
        return lazy(lazy(colleague, "controls", () => controlsOf(m.id)), "handed", () => handedTo(m.id));
      });
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
    const record = this.record();
    const counting = this.host.count();
    const inCount = record ? (() => {
      const l = countLedger(record);
      return l.expected.filter((id) => !l.transferred.includes(id)).length;
    })() : (ledger?.baseline ?? 0);
    const view: Omit<MemberView, "controls" | "atTable" | "field"> = {
      me: { ...me, holding: body?.holding ?? [], inRoom: body?.room === room },
      room,
      count:
        count && ledger && counting && record
          ? {
              item: count.item,
              of: inCount,
              due: ledger.dueRound !== undefined,
              places: count.searchPlaces.map((p) => `eq:${p}`),
              name: count.name ? both(count.name) : this.itemName(count.item),
              // what the team in the room can account for now, item by item (lying in the room, or in anyone's hands there)
              seen: () => counting.accounted(),
              check: (ids) => compareCount(this.record() ?? record, ids),
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
      name: (who) => this.nameOf(who),
      itemName: (type) => this.itemName(type),
      newId: (prefix) => `${prefix}-${++this.state.seq}`,
      surgeon: this.surgeonBody(),
      learner: PRIMARY_ACTOR,
      passingRequired: passingRequired(c, s),
      plan: null,
      refOf: (who) => refOfBody(c, s, who) ?? undefined,
      bodyOf: (ref) => memberBody(c, s, ref ?? "surgeon"),
      label: (id) => this.label(id),
    };
    // what the member's body can work and see in the operative field: asked for only by work in the field
    const def = procedureFor(c, s);
    const atTable = () => !!def && !!s.procedure && w.checkSpatial(me.id, { tool: "operate", kind: "operate" }).ok;
    const field = (): FieldView | null => (def && s.procedure && w.checkSpatial(me.id, { tool: "observe_field", kind: "observe" }).ok ? observeField(def, s.procedure) : null);
    return lazy(lazy(lazy(view as MemberView, "controls", () => controlsOf(me.id)), "atTable", atTable), "field", field);
  }

  /** A body's name as the team says it: whoever operates is "the surgeon" (术者); the learner in a place, by that place ("the first assistant (you)"). */
  private nameOf(who: MemberId): Bilingual {
    if (who === this.surgeonBody()) return SURGEON_NAME;
    const seat = this.host.state().seat;
    if (who === PRIMARY_ACTOR && seat) return phrase("clause.learner", { position: both(POSITION_TITLES[seat]) });
    return both(this.host.world().entity(who)?.name ?? who);
  }

  /** A part or a region of the operation by its name (the vocabulary's, the same whatever the anatomy), else its id. */
  private label(id: string): Bilingual {
    const def = procedureFor(this.host.caseDef, this.host.state());
    const named = def ? (vocabularyStructures(def).find((x) => x.id === id)?.name ?? def.regions.find((r) => r.id === id)?.name) : undefined;
    return named ? both(named) : { en: id, "zh-CN": id };
  }

  /** The body a member reference works with (core `memberBody`). */
  private body(ref: string): MemberId {
    return memberBody(this.host.caseDef, this.host.state(), ref);
  }

  /** Whoever operates: the learner's avatar, or the stand-in's body while the learner holds a place. */
  private surgeonBody(): MemberId {
    return this.body("surgeon");
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

  /** Who speaks a line: a member of staff by their own name; the learner as the surgeon, or by the place they hold. */
  private displayName(id: MemberId): string {
    if (id === PRIMARY_ACTOR) return t(this.nameOf(id), this.host.locale);
    const e = this.host.world().entity(id);
    return e ? t(e.name, this.host.locale) : id;
  }
}

/** An object with a property computed on first read, then kept (the view's costly parts: only what a policy asks for). */
function lazy<T extends object, K extends string, V>(o: T, key: K, get: () => V): T & Record<K, V> {
  let value: { v: V } | null = null;
  return Object.defineProperty(o, key, {
    enumerable: true,
    configurable: true,
    get: () => (value ??= { v: get() }).v,
  }) as T & Record<K, V>;
}
