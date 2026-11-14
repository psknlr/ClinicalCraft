/**
 * The team's records (docs/TEAM.md §3): what was said (messages, with delivery, read-back and the sender's
 * verification kept apart), what was done (action receipts: the stable action id, who acted, on what, for
 * whom, the outcome and the world version after it), what each member is doing (tasks) and what each member
 * knows (observations with an evidence reference). Plain JSON: the whole state is a checkpoint.
 */
import type { DirectionName, InstrumentId, ProcedureOp, ProcedureOpType, TeamDuty, TeamNeed, ZoomLevel } from "@clinicalcraft/core";
import type { NavGoal } from "@clinicalcraft/world";
import type { Bilingual } from "./i18n.js";

/**
 * A member's body (core `memberBody`): `staff:<id>`; the learner's avatar for the learner's own member — the surgeon
 * while the learner operates, the place's member while they hold a place in the team —; the stand-in's staff body for
 * the surgeon while the learner holds a place.
 */
export type MemberId = string;

/**
 * What can be asked of a colleague in the operative field (docs/TEAM.md §4.4, `team ask`): hold traction with the
 * instrument in a port (`traction`: `port`, `structure`, `direction`, `force`), let go (`release`: a `port`, or all they
 * hold), take the camera (`camera`: the camera `port`), aim it (`aim`: a `region`, and a `zoom`), go closer or wider
 * (`zoom`), pass an instrument (`pass`: `instrument`).
 */
export type FieldAskOp = "traction" | "release" | "camera" | "aim" | "zoom" | "pass";

/** A request about the operative field, as it is said and read back (`TeamMessage.about.field`, `TeamTask.field`). */
export interface FieldAsk {
  op: FieldAskOp;
  port?: string;
  structure?: string;
  direction?: DirectionName[];
  force?: "gentle" | "firm" | "excessive";
  region?: string;
  zoom?: ZoomLevel;
  instrument?: InstrumentId;
}

export type MessageKind =
  /** Ask a colleague to do something (an instrument for someone). */
  | "request"
  /** The receiver repeats the request back (TeamSTEPPS check-back, step 2). */
  | "readback"
  /** The sender confirms the read-back is right (check-back, step 3). */
  | "confirm"
  /** Something done or found, told to whoever is owed it. */
  | "report"
  /** The receiver cannot do it, and why. */
  | "decline"
  /** Raised to the surgeon or the person responsible: the team cannot resolve it alone. */
  | "escalate"
  /** Something noticed, said aloud (a need). */
  | "notice";

export interface TeamMessage {
  id: string;
  /** The conversation it belongs to (one task's exchange). */
  thread: string;
  from: MemberId;
  to: MemberId;
  kind: MessageKind;
  /** What was said, in both languages. */
  text: Bilingual;
  /**
   * What it is about: the need, the item type, the person it is for; a decline's reason code; a count (`count` of
   * `of` accounted for, by item: the `ids` counted at `stage`, what was `missing` or not in the count —
   * `unexpected`), a hold on closure (`hold`), a recount asked for (`recount`), an item set aside off the field
   * (`setAside`: not in the count); a request about the operative field (`field`: traction, letting go, the camera, a
   * pass — read back and confirmed like any request); the call-out before the stand-in's critical step (`callout`: the
   * step and the handle it is done to).
   */
  about: {
    need?: string;
    item?: string;
    for?: MemberId;
    reason?: string;
    count?: number;
    of?: number;
    ids?: string[];
    missing?: string[];
    unexpected?: string[];
    stage?: "closing" | "recount";
    setAside?: string[];
    hold?: boolean;
    recount?: boolean;
    field?: FieldAsk;
    callout?: { op: ProcedureOpType; handle: string };
  };
  room: string;
  patient: string | null;
  /** Simulated minute and scheduler round when it was said. */
  at: number;
  round: number;
  /** Observation and receipt ids the sender relied on. */
  evidence: string[];
  replyTo?: string;
  /** Heard by the recipient (in the room, or a relief colleague by phone). */
  delivered: boolean;
  /** The recipient has taken it in. */
  read: boolean;
  /** For a request: the receiver read it back (check-back step 2) and the sender verified it (step 3). */
  readBack?: boolean;
  verified?: boolean;
}

/** One world act of a member, as the world recorded it. */
export interface ActionReceipt {
  /** The stable action id (a retried id returns the recorded result: exactly once). */
  id: string;
  actor: MemberId;
  /** A world operation (`navigate`, `hand_over`…), or `operate`: a step in the operative field (`step`). */
  operation: string;
  /** `operate`: the step, as it was asked of the field (its `op`). */
  step?: ProcedureOpType;
  target?: string;
  /** Who it was for (a hand-over's recipient). */
  recipient?: MemberId;
  /** Who set the task in motion (the true initiator, kept through every step). */
  initiator: MemberId;
  outcome: "completed" | "failed" | "cancelled";
  code?: string;
  message: string;
  worldVersion: number;
  at: number;
  /** Simulated seconds the act took (walking, the operation). */
  seconds?: number;
  round: number;
  task: string;
}

export type TaskStatus = "open" | "asked" | "accepted" | "waiting" | "done" | "declined" | "escalated";

/** The circulating nurse's work on a count discrepancy: the hold, the search, the recount. */
export interface CountCheck {
  /** Items expected (the baseline). */
  of: number;
  /** Every count reported so far. */
  counted: number[];
  /** The surgeon read the hold back (check-back). */
  held?: boolean;
  /** The surgeon reported the wound checked. */
  wound?: boolean;
  /** Search places done, in order; the one being walked to. */
  searched: string[];
  at?: string;
  /** The latest count's missing items and items not in the count (by id). */
  missing?: string[];
  unexpected?: string[];
  /** Items not in the count the circulating nurse took off the field (documented). */
  setAside?: string[];
}

export interface TeamTask {
  id: string;
  /**
   * `supply`: see that someone gets an item (the circulator's); `deliver`: take an item to someone (the scrub
   * nurse's); `count`: a count (the counter's); `check`: a count discrepancy seen through — hold, search, recount
   * (the circulator's); `wound`: the surgeon checks the wound (the simulated surgeon's); `assist`: a request about the
   * operative field seen through — read back, walked to the table, the port taken, the step done, reported (an
   * assistant's, the scrub nurse's pass; `field`); `operate`: the operator's own plan (the stand-in surgeon's; `cursor`).
   */
  kind: "supply" | "deliver" | "count" | "check" | "wound" | "assist" | "operate";
  need: string;
  /** Equipment type id. */
  item: string;
  /** The item chosen (once located). */
  itemId?: string;
  for: MemberId;
  owner: MemberId;
  initiator: MemberId;
  /** `supply`: the colleague asked. */
  assignee?: MemberId;
  thread: string;
  status: TaskStatus;
  /** Round of the last status change (deadlines count from it). */
  since: number;
  /** Colleagues already asked (rerouting skips them). */
  tried: MemberId[];
  /** World acts so far (the next action id). */
  acts: number;
  /** Verified against the world: the person it was for holds the item. */
  verified?: boolean;
  /** `supply`: items of that type the person already held when the need was noticed (they do not count). */
  had?: string[];
  /** Where a multi-step task has got to (`wound`: `searched` once the wound was searched). */
  step?: string;
  /** `count`: the number counted; `check`: the discrepancy's progress. */
  counted?: number;
  count?: CountCheck;
  /** Where the world pointed after a refusal for reach or sight (walk there, then act again). */
  goal?: NavGoal;
  /** `assist`: what was asked of the operative field (the request's `about.field`). */
  field?: FieldAsk;
  /** `operate`: where the operator's plan has got to (the next reference step). */
  cursor?: number;
  /** Why it ended this way (declined, escalated): a short code, and what was said. */
  reason?: string;
  reasonText?: Bilingual;
}

export interface Observation {
  id: string;
  round: number;
  at: number;
  kind: "need" | "message" | "receipt" | "seen" | "holder";
  /** The message, receipt, need or entity it refers to. */
  ref: string;
  fact: string;
}

export interface MemberState {
  id: MemberId;
  /** The facility staff id (`or-7.scrub-nurse`), or `surgeon`. */
  staff: string;
  duties: TeamDuty[];
  /** Unread messages addressed to this member. */
  inbox: string[];
  memory: Observation[];
  /** A colleague from outside the room the team may call (scenario `relief`). */
  relief: boolean;
  /** Not available (scenario `absent`). */
  absent: boolean;
}

export const TEAM_STATE_VERSION = 2 as const;

/**
 * Where the assigned scenario is (docs/TEAM.md §5): `pending` — the team's phases have not begun, nothing is set up
 * in the world yet (a session saved before the operation); `active` — set up once in the world, the team working;
 * `completed` — everything it set in motion has ended. Saved and restored with the team: a restore sets the scenario
 * up only while it is still pending, so a reload before the operation activates the same obligations as a run that
 * was never interrupted, and one after it never sets anything up twice.
 */
export type TeamLifecycle = "pending" | "active" | "completed";

export interface TeamState {
  version: typeof TEAM_STATE_VERSION;
  scenario: string | null;
  lifecycle: TeamLifecycle;
  /** When the scenario was set up in the world: the round, the simulated minute and the world version after it. */
  setup?: { round: number; at: number; worldVersion: number };
  round: number;
  /** Next id number (messages, observations, tasks). */
  seq: number;
  members: MemberState[];
  messages: TeamMessage[];
  receipts: ActionReceipt[];
  tasks: TeamTask[];
  /** Item entity → the task that claimed it (two tasks never carry one item). */
  claims: Record<string, string>;
  /** Action ids already carried out (never run twice, across a save and restore). */
  completed: string[];
  /** Needs already posted (by id). */
  posted: string[];
  /** Needs posted during the session beyond the scenario's (the surgeon asked for something). */
  extra: TeamNeed[];
  /** The count (a case team with `count`): the baseline and what happened, for the record and the benchmark. */
  count?: CountLedger;
}

/**
 * The team's own record of its work on the count (docs/TEAM.md §4.3) — the timing and the holds, for the benchmark.
 * The count itself (which items, missing, not in the count, escalated, settled) is the case's count record
 * (`SessionState.count`); `outcome` and `closedOnHold` are read from it.
 */
export interface CountLedger {
  item: string;
  /** Items in the count (the baseline). */
  baseline: number;
  /** Round the count fell due; a discrepancy was raised (the hold asked for); the count was settled. */
  dueRound?: number;
  detectedRound?: number;
  settledRound?: number;
  /** `correct` first time; `reconciled` after a search; `unresolved` (escalated). */
  outcome?: "correct" | "reconciled" | "unresolved";
  /** Holds on closure asked for. */
  holds: number;
  /** Closure began while a discrepancy was unresolved. */
  closedOnHold?: boolean;
}

/** How the team advances: on its own after each act of the learner, one round at a time (`step` ops), or not at all. */
export type TeamAutonomy = "auto" | "step" | "off";
/** Who answers as the surgeon: the learner (learner mode), or the team's simulated surgeon (observer mode). */
export type SurgeonMode = "learner" | "simulated";

/**
 * The team, saved (a session snapshot's `team`, a transcript `team` item): everything a restored session needs to
 * carry on mid-task — inboxes, tasks, claims, receipts and the action ids already carried out (never run twice).
 */
export interface TeamCheckpoint {
  format: "clinicalcraft-team@1";
  state: TeamState;
  autonomy: TeamAutonomy;
  surgeon: SurgeonMode;
}

/**
 * What a member decides to do this round (at most one): say something; act in the world (`act`, the action bus); take
 * a step in the operative field (`operate`: the `operate` tool with the member's own body, through the team's caller —
 * carried out once, under the task's next action id); or change their own tasks.
 */
export type Proposal =
  | { kind: "say"; to: MemberId; message: Pick<TeamMessage, "thread" | "kind" | "text" | "about" | "evidence"> & { replyTo?: string }; patch?: TaskPatch[] }
  | { kind: "act"; task: string; operation: string; targetId?: string; goal?: NavGoal; parameters?: Record<string, unknown>; recipient?: MemberId; patch?: TaskPatch[] }
  | { kind: "operate"; task: string; op: ProcedureOp; patch?: TaskPatch[] }
  | { kind: "update"; patch: TaskPatch[] };

/** A change to the task list: a new task, or fields of an existing one. */
export type TaskPatch = { create: TeamTask } | { id: string; set: Partial<TeamTask> } | { claim: string; task: string } | { release: string } | { read: string };

/** A need as the team knows it (the scenario's need, once noticed). */
export interface KnownNeed {
  need: TeamNeed;
  /** The body the need is for. */
  forId: MemberId;
  noticedBy: MemberId;
}
