import { z } from "zod";
import { AnaesthesiaOpSchema, type AnaesthesiaOp, type AnaesthesiaResponsibility } from "./anaesthesia.js";
import { AlarmResponseOpSchema, type AlarmEpisode, type AlarmResponseOp } from "./alarm.js";
import { CountStageSchema, IdSchema, type CountStage, type CountStatus, type Vitals, type VitalKey } from "./common.js";
import { StudyOpSchema, type StudyOp, type StudyRecord } from "./study.js";
import { ProcedureOpSchema, type ProcedureOp, type ProcedureOpType, type ProcedureSignal, type ProcedureState } from "./procedure.js";
import { SeatSchema, type Place } from "./positions.js";

/**
 * Session — the deterministic, event-sourced state of one learner working
 * one case. `reduce(caseDef, state, action)` is pure: replaying the same
 * actions always yields the same state (no Date.now/Math.random inside).
 */

export const SESSION_SCHEMA_ID = "clinicalcraft/session@1" as const;

/* ------------------------------------------------------------------ */
/* Actions (inputs)                                                    */
/* ------------------------------------------------------------------ */

export const ActorSchema = z.enum(["learner", "agent", "system", "replay"]);
export type Actor = z.infer<typeof ActorSchema>;

const base = { by: ActorSchema.optional() };

/**
 * Who placed or released a hold: a role or staff id as the session knows them ("attending", "anaesthetist",
 * "staff:or-7.anaesthetist"). Compared trimmed and case-insensitively.
 */
export const HolderSchema = z.string().trim().min(1).max(80);

/** An item counted (its entity id in the world: `eq:or-7-swab-3`). */
const CountedIdSchema = z.string().trim().min(1).max(120);
const CountedIds = z.array(CountedIdSchema).max(200);
const CountText = z.string().trim().min(1).max(500);

/**
 * One entry of the surgical count's record (docs/TEAM.md §4.3), by item identity — never a bare number. The ids are
 * what someone's body perceived in the world (the session computes them: a caller never supplies them), and
 * `staff` is who did it (a staff id, or `surgeon`):
 * - `baseline`: the items opened onto the field, counted before incision (once; the expected set).
 * - `count`: the items accounted for now (seen lying in the room or in someone's hands) at a `stage`.
 * - `scan`: the detection wand swept over the patient; `detected`: items it found inside.
 * - `recover`: items taken out of somewhere (`from`: the patient's wound) — evidence, not yet a recount.
 * - `add`: items opened onto the field after the baseline, and why (they join the expected set).
 * - `transfer`: items documented as leaving the field (`to`: the specimen pot) — or, for an item not in the count,
 *   set aside off the field; neither is then missing or unexpected.
 * - `escalate`: a discrepancy raised to `to` (the surgeon), with the reason (credited, separate from settling it).
 */
export const CountOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("baseline"), ids: CountedIds.min(1), staff: HolderSchema }).strict(),
  z.object({ op: z.literal("count"), ids: CountedIds, staff: HolderSchema, stage: CountStageSchema }).strict(),
  z.object({ op: z.literal("scan"), detected: CountedIds, staff: HolderSchema }).strict(),
  z.object({ op: z.literal("recover"), ids: CountedIds.min(1), staff: HolderSchema, from: CountText }).strict(),
  z.object({ op: z.literal("add"), ids: CountedIds.min(1), staff: HolderSchema, reason: CountText }).strict(),
  z.object({ op: z.literal("transfer"), ids: CountedIds.min(1), staff: HolderSchema, to: CountText, reason: CountText }).strict(),
  z.object({ op: z.literal("escalate"), staff: HolderSchema, to: CountText, reason: CountText }).strict(),
]);
export type CountOp = z.infer<typeof CountOpSchema>;

export const ClinicalActionSchema = z.discriminatedUnion("type", [
  /** `variant`: the procedure's anatomical variant for this session (docs/PROCEDURE.md §9; hidden from the operator). */
  z.object({
    type: z.literal("start"),
    variant: IdSchema.optional(),
    /** `team`: the team scenario for this session (docs/TEAM.md; hidden from the team's policies). */
    team: IdSchema.optional(),
    /**
     * `seat`: the learner's place in the case's care team (docs/TEAM.md §1). `surgeon` (the default) is the operating
     * surgeon, the learner as always; another place joins the team at its phase while the team's stand-in surgeon
     * operates — the case's reference path up to that phase is applied with the start, as the team's work.
     */
    seat: SeatSchema.optional(),
    /** `lineup`: one of the team's line-ups (`team.lineups`): the assistants added for this encounter. */
    lineup: IdSchema.optional(),
    ...base,
  }).strict(),
  /** Learner asked a history question (button, free text, or attributed by the patient agent). */
  z.object({ type: z.literal("ask"), itemId: IdSchema, via: z.enum(["button", "free-text", "agent"]).optional(), ...base }).strict(),
  z.object({ type: z.literal("examine"), findingId: IdSchema, ...base }).strict(),
  /** `at` = placement id of the workstation/device used (world-level rules check capabilities). */
  z.object({ type: z.literal("order"), investigationId: IdSchema, at: z.string().optional(), ...base }).strict(),
  /** Read the result of an investigation for `phase` (default: current phase). Must have been ordered in that phase. */
  z.object({ type: z.literal("read"), investigationId: IdSchema, phase: IdSchema.optional(), ...base }).strict(),
  z.object({ type: z.literal("set-phase"), phase: IdSchema, ...base }).strict(),
  z.object({ type: z.literal("hint"), ...base }).strict(),
  z.object({ type: z.literal("answer"), decisionId: IdSchema, optionIds: z.array(IdSchema).min(1), ...base }).strict(),
  z.object({ type: z.literal("intervene"), interventionId: IdSchema, ...base }).strict(),
  /**
   * Let simulated time pass. `reason` (optional, informational — the engine treats every reason alike):
   * `wait` (the learner or an agent waited), `travel` (an embodied walk, docs/EMBODIED.md R8),
   * `procedure` (the duration of a physical device operation).
   */
  z.object({ type: z.literal("advance-time"), minutes: z.number().positive().max(24 * 60), reason: z.enum(["wait", "travel", "procedure"]).optional(), ...base }).strict(),
  z.object({ type: z.literal("flag"), flag: IdSchema, value: z.boolean().default(true), ...base }).strict(),
  z.object({ type: z.literal("note"), text: z.string().max(4000), ...base }).strict(),
  /** One step of the case's operation (docs/PROCEDURE.md): the operative field's only way in. */
  z.object({
    type: z.literal("operate"),
    op: ProcedureOpSchema,
    /** A colleague who does this step (a staff id: the assistant holding a port); absent: the operator. */
    actor: z.string().min(1).max(80).optional(),
    ...base,
  }).strict(),
  /**
   * An explicit hold on an intervention (docs/PROTOCOL.md §3.1) — an anaesthetist or attending withholding
   * clearance for induction: who placed it and why. While it stands, the intervention is refused (`on-hold`);
   * missing information alone never places one.
   */
  z.object({ type: z.literal("hold"), interventionId: IdSchema, placedBy: HolderSchema, reason: z.string().trim().min(1).max(1000), ...base }).strict(),
  /**
   * Release a hold after a recorded reassessment — by whoever placed it. `reassessment` is the documented
   * decision (it may be to proceed under stated uncertainty).
   */
  z.object({ type: z.literal("release-hold"), interventionId: IdSchema, releasedBy: HolderSchema, reassessment: z.string().trim().min(1).max(1000), ...base }).strict(),
  /** A new investigation (`StudyOpSchema`; docs/STUDIES.md): order, wait, acquire, release, review. */
  z.object({ type: z.literal("study"), study: StudyOpSchema, ...base }).strict(),
  /** A step of anaesthesia responsibility (docs/TEAM.md §5): a relief requested, arrived, the hand-over accepted. */
  z.object({ type: z.literal("anaesthesia"), anaesthesia: AnaesthesiaOpSchema, ...base }).strict(),
  /**
   * What the operation's equipment supplies changed (docs/PROCEDURE.md "Equipment"): the session records it when the
   * equipment in the patient's room fails, is repaired, or a backup is connected. Not an operative step.
   */
  z.object({ type: z.literal("procedure-supply"), supply: z.object({ image: z.boolean(), gas: z.boolean(), source: z.string().max(200).optional() }).strict(), ...base }).strict(),
  /** A step of a staff member's response to a critical alarm (`AlarmResponseOpSchema`; docs/TEAM.md §5). */
  z.object({ type: z.literal("alarm-response"), alarm: AlarmResponseOpSchema, ...base }).strict(),
  /** The surgical count's record (`CountOpSchema`; cases whose team keeps a count). */
  z.object({ type: z.literal("count"), count: CountOpSchema, ...base }).strict(),
  z.object({ type: z.literal("finish"), ...base }).strict(),
]);
export type ClinicalAction = z.infer<typeof ClinicalActionSchema>;
export type ClinicalActionType = ClinicalAction["type"];

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface OrderRecord {
  /** `${investigationId}@${phase}` */
  key: string;
  investigationId: string;
  phase: string;
  orderedAt: number;
  readyAt: number;
  at?: string;
}

export interface AttemptRecord {
  decisionId: string;
  optionIds: string[];
  correct: boolean;
  at: number;
}

export interface InterventionRecord {
  interventionId: string;
  at: number;
  appropriateness: "indicated" | "neutral" | "contraindicated";
  /** `SessionState.seq` when it was committed (orders acts of the same minute; absent in sessions saved before). */
  seq?: number;
  /**
   * A checklist step attempted out of order (`checklist: true`, contraindicated when attempted): recorded, but
   * its effects and flags did not apply and it used none of `maxDoses`.
   */
  invalid?: true;
}

/** An explicit hold on an intervention (see the `hold` action): placed, and later released after a reassessment. */
export interface HoldRecord {
  interventionId: string;
  placedBy: string;
  reason: string;
  at: number;
  seq: number;
  released?: { by: string; reassessment: string; at: number; seq: number };
}

/**
 * What the care team had done when the learner joined it in a place (`start {seat}`, docs/TEAM.md §1): the case's
 * reference path after its own `start`, applied by the system with the learner's start until the case was in one of the
 * team's phases. None of it is the learner's: the assessment reports it as the team's.
 */
export interface JoinRecord {
  /** Reference actions applied. */
  actions: number;
  /** The record when the learner joined: the last sequence number and the minute. */
  seq: number;
  at: number;
  /** History items asked, findings examined, order keys (`id@phase`), decisions answered and objectives done by then. */
  asked: string[];
  examined: string[];
  orders: string[];
  decisions: string[];
  objectives: string[];
}

/** One entry of the count's record: the op as given, when, and — for a `count` — what it found missing or unexpected. */
export type CountEntry = CountOp & {
  at: number;
  seq: number;
  /** `count`: expected items (baseline, additions, less transfers) not accounted for. */
  missing?: string[];
  /** `count`: items accounted for that are not in the count (not expected, not added, not set aside). */
  unexpected?: string[];
};

/** Closure (or another irreversible step) made while the count was not settled: kept for the debrief, never erased. */
export interface CountUnsafe {
  what: "closure";
  status: CountStatus;
  missing: string[];
  unexpected: string[];
  at: number;
  seq: number;
}

/**
 * The surgical count of the encounter (docs/TEAM.md §4.3): one record per encounter and operating room, by item
 * identity. Append-only: every entry is evidence (who counted, scanned, recovered, transferred, escalated); the
 * status is derived (`countStatus`).
 */
export interface CountRecord {
  /** Equipment type counted. */
  item: string;
  /** The operating room (facility room id). */
  room: string;
  /** The items opened onto the field (the baseline), by entity id. */
  expected: string[];
  entries: CountEntry[];
  unsafe: CountUnsafe[];
}

export interface SessionState {
  schema: typeof SESSION_SCHEMA_ID;
  caseId: string;
  caseVersion: string;
  started: boolean;
  finished: boolean;
  /** Simulated minutes since start (0 in static cases unless advanced explicitly). */
  clock: number;
  phase: string;
  /** Every phase the encounter has been in, in the order first reached (a record of a later phase does not exist yet). */
  phasesReached?: string[];
  asked: string[];
  examined: string[];
  orders: OrderRecord[];
  /** Result keys read, `${investigationId}@${phase}` */
  seen: string[];
  /** Decisions answered correctly → minute answered. */
  decisions: Record<string, number>;
  attempts: AttemptRecord[];
  interventions: InterventionRecord[];
  flags: string[];
  hints: number;
  notes: { at: number; text: string }[];
  /** Scenario event ids already fired → minute. */
  firedEvents: Record<string, number>;
  /** Physiology trend ids whose `until` became true → minute. */
  trendStops: Record<string, number>;
  /** Objective ids completed → minute. */
  objectivesDone: Record<string, number>;
  /** Baseline vitals after scenario events (physiology recomputes the live value from this). */
  baselineOverrides: Partial<Vitals>;
  /**
   * Minute the bedside monitor was attached: the first settle at which the
   * case's `physiology.monitor.attachedWhen` held (latched — it stays on).
   * Absent until then, and always for cases without `physiology.monitor`
   * (on the monitor from the start). See `monitorAttached`.
   */
  monitorAttachedAt?: number;
  /** The operative field (cases with a `procedure`), from the first accepted `operate`. */
  procedure?: ProcedureState;
  /** The procedure's anatomical variant chosen at `start` (absent: the base definition). Hidden state. */
  variant?: string;
  /** The team scenario chosen at `start` (docs/TEAM.md). Hidden state. */
  teamScenario?: string;
  /**
   * The learner's place in the care team chosen at `start` (docs/TEAM.md §1): a first or second assistant or the scrub
   * nurse. Absent: the operating surgeon (`start {seat: "surgeon"}` is recorded as no place).
   */
  seat?: Place;
  /** The team's line-up chosen at `start` (`team.lineups`). Absent: the base team. */
  lineup?: string;
  /**
   * In a place (`seat`): what the team had done when the learner joined — the case's reference path up to the team's
   * phase, applied with the start (docs/TEAM.md §1). The assessment reports it as the team's, never the learner's.
   */
  joined?: JoinRecord;
  /** Holds placed on interventions, in order (absent until the first; sessions saved before have none). */
  holds?: HoldRecord[];
  /** The surgical count (cases whose team keeps one), from the baseline on. */
  count?: CountRecord;
  /** New investigations ordered in this encounter (docs/STUDIES.md), from the first order on. */
  studies?: StudyRecord;
  /** Who is responsible for the anaesthetised patient, and the hand-overs (absent: the case team's anaesthetist). */
  anaesthesia?: AnaesthesiaResponsibility;
  /** Critical alarms and the responses to them (docs/TEAM.md §5), one episode per alarm. */
  alarms?: AlarmEpisode[];
  /**
   * What the operation's equipment supplies, recorded apart from the operation (`procedure-supply`): a tower failing
   * before the Time Out is an equipment fault, never the start of the operation. The operation takes it over when it
   * opens (`ProcedureState.supply`). Absent: everything supplied.
   */
  equipment?: { image: boolean; gas: boolean; source?: string };
  /** Monotonic count of accepted actions (for transcripts / ordering). */
  seq: number;
}

/* ------------------------------------------------------------------ */
/* Domain events (outputs)                                             */
/* ------------------------------------------------------------------ */

export type DomainEvent =
  | { type: "session.started" }
  | { type: "history.asked"; itemId: string; firstTime: boolean; disclosure: string }
  | { type: "exam.performed"; findingId: string; firstTime: boolean }
  | { type: "order.placed"; investigationId: string; phase: string; key: string; readyAt: number }
  | { type: "order.duplicate"; investigationId: string; phase: string; key: string }
  | { type: "result.ready"; key: string; investigationId: string; phase: string; critical: boolean }
  | { type: "result.read"; key: string; investigationId: string; phase: string; firstTime: boolean }
  | { type: "phase.changed"; from: string; to: string; automatic: boolean }
  | { type: "decision.answered"; decisionId: string; correct: boolean; firstTry: boolean; optionIds: string[] }
  /** `invalid`: a checklist step attempted out of order — recorded, nothing applied (see `Intervention.checklist`). */
  | { type: "intervention.applied"; interventionId: string; appropriateness: "indicated" | "neutral" | "contraindicated"; invalid?: true }
  /**
   * A vital newly crossing an alarm limit on the bedside monitor. `unmeasurable`: the monitor has no
   * reading — `value` is the cardiac-arrest placeholder 0 (`VitalsSnapshot.unmeasurable`), never a measurement.
   */
  | { type: "vitals.alarm"; vital: VitalKey; level: "warning" | "critical"; value: number; unmeasurable?: true }
  | { type: "scenario.event"; eventId: string; severity: "info" | "warning" | "critical" }
  | { type: "objective.completed"; objectiveId: string; index: number }
  | { type: "case.completed" }
  | { type: "case.finished"; timedOut: boolean }
  | { type: "hint.used"; objectiveId: string | null }
  | { type: "time.advanced"; from: number; to: number }
  | { type: "flag.changed"; flag: string; value: boolean }
  | { type: "note.added" }
  /** A step of the operation was carried out; `signals` are what the operator sees or feels (never the hidden anatomy). */
  /**
   * A committed operative step (`id` `op-<step>`: stable across replays; `step` its number in the operation, `seq`
   * the session's action sequence, `at` the clock, `by` who acted, `detail` the op as committed) — what a
   * presentation queue animates in order, once.
   */
  | { type: "procedure.step"; op: ProcedureOpType; signals: ProcedureSignal[]; id?: string; step?: number; seq?: number; at?: number; by?: Actor; actor?: string; detail?: ProcedureOp }
  | { type: "hold.placed"; interventionId: string; placedBy: string; reason: string }
  | { type: "hold.released"; interventionId: string; releasedBy: string; reassessment: string }
  /** An entry of the count's record; `status` after it; a count's `missing` / `unexpected` items. */
  | {
      type: "count.recorded";
      op: CountOp["op"];
      staff: string;
      status: CountStatus;
      /** `count`: its stage, how many of the items in the count were accounted for, and what was missing or not in it. */
      stage?: CountStage;
      accounted?: number;
      of?: number;
      missing?: string[];
      unexpected?: string[];
      /** `scan`: what the wand detected in the patient. */
      detected?: string[];
    }
  /** A study op recorded: the order, acquisition or report it concerns (`id`). */
  | { type: "study.recorded"; op: StudyOp["op"]; code: string; id: string; reason?: string }
  | { type: "anaesthesia.recorded"; op: AnaesthesiaOp["op"]; responsible: string; relief?: string }
  /** The operation's equipment supply changed (`deflated`: the pneumoperitoneum was lost with the gas). */
  | { type: "procedure.supply"; image: boolean; gas: boolean; source?: string; deflated?: true }
  /** An alarm response step (`id`: the episode). */
  | { type: "alarm.response"; op: AlarmResponseOp["op"]; id: string; vital: string; by?: string; reason?: string }
  /** Closure while the count was not settled (`CountUnsafe`): recorded for the debrief. */
  | { type: "count.unsafe"; what: "closure"; status: CountStatus; missing: string[]; unexpected: string[] }
  /**
   * A refused operative step also carries `at` (the clock), `after` (the action sequence it came after: the record's
   * order), `detail` (the step as asked) and `actor`: the scope shows it with its reason, the field unchanged.
   */
  | { type: "action.rejected"; action: ClinicalActionType; code: RejectionCode; message: string; at?: number; after?: number; detail?: ProcedureOp; actor?: string };

export type RejectionCode =
  | "not-started"
  | "finished"
  | "unknown-id"
  | "not-ordered"
  | "not-ready"
  | "no-record"
  | "phase-locked"
  | "requirements-unmet"
  | "max-doses"
  | "already-decided"
  | "objectives-incomplete"
  /** `ask`: the patient cannot speak now (`patient.nonVerbalWhen`) and the case has no companion to answer. */
  | "cannot-answer"
  /** `intervene`: an explicit hold stands on this intervention (see the `hold` action); it is not carried out. */
  | "on-hold"
  | "invalid";

export interface ReduceResult {
  state: SessionState;
  events: DomainEvent[];
  /** Present when the action was rejected (state unchanged except where noted). */
  rejected?: { code: RejectionCode; message: string };
}
