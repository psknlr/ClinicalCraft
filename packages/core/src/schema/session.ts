import { z } from "zod";
import { AnaesthesiaOpSchema, type AnaesthesiaOp, type AnaesthesiaResponsibility } from "./anaesthesia.js";
import { AlarmResponseOpSchema, type AlarmEpisode, type AlarmResponseOp } from "./alarm.js";
import { CountStageSchema, IdSchema, RoomKindSchema, type CountStage, type CountStatus, type RoomKind, type SiteStatus, type Vitals, type VitalKey } from "./common.js";
import { StudyOpSchema, type StudyOp, type StudyRecord } from "./study.js";
import { ProcedureOpSchema, type ProcedureOp, type ProcedureOpType, type ProcedureSignal, type ProcedureState } from "./procedure.js";

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

/** What a site entry is about: the skin mark, or a piece of the evidence (its id in the case's team site). */
const SiteSourceSchema = z.union([z.literal("mark"), IdSchema]);

/**
 * One entry of the operative site's verification (docs/TEAM.md §4.5). What was read is never supplied by a caller:
 * the record holds where the mark is and what each piece of evidence says, and the engine writes what the reader
 * saw. `staff` is who did it (a staff id, or `surgeon`):
 * - `open`: the record begun for this encounter (in-world: the session's, once; the mark and the evidence as the
 *   case and the team scenario have them).
 * - `read`: someone looked at the mark, read a document or the imaging's orientation marker, or asked the patient.
 * - `raise`: a discrepancy raised between two things the raiser has read themselves.
 * - `mark`: the site marked (again) on `side`, by the one who operates.
 * - `amend`: a document that is not primary evidence corrected to `to`.
 * - `confirm`: the site confirmed by someone who has seen the mark and read a document and found them to agree —
 *   after a discrepancy, only once the primary evidence was read again and agrees with it.
 * - `escalate`: a discrepancy that cannot be resolved in the room, and why.
 */
export const SiteOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("open"), staff: HolderSchema }).strict(),
  z.object({ op: z.literal("read"), source: SiteSourceSchema, staff: HolderSchema }).strict(),
  z.object({ op: z.literal("raise"), sources: z.tuple([SiteSourceSchema, SiteSourceSchema]), staff: HolderSchema }).strict(),
  z.object({ op: z.literal("mark"), side: IdSchema, staff: HolderSchema }).strict(),
  z.object({ op: z.literal("amend"), source: IdSchema, to: IdSchema, staff: HolderSchema }).strict(),
  z.object({ op: z.literal("confirm"), staff: HolderSchema }).strict(),
  z.object({ op: z.literal("escalate"), staff: HolderSchema, reason: z.string().trim().min(1).max(500) }).strict(),
]);
export type SiteOp = z.infer<typeof SiteOpSchema>;

export const ClinicalActionSchema = z.discriminatedUnion("type", [
  /** `variant`: the procedure's anatomical variant for this session (docs/PROCEDURE.md §9; hidden from the operator). */
  z.object({
    type: z.literal("start"),
    variant: IdSchema.optional(),
    /** `team`: the team scenario for this session (docs/TEAM.md; hidden from the team's policies). */
    team: IdSchema.optional(),
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
  /**
   * `place` (where the patient was: the facility room, its kind, the bed space) and `receivedBy` (the member of staff
   * who took the patient over in person) are what the world confirmed in in-world mode — the session fills them for
   * an intervention given at a place (`Intervention.at`) or received by a position (`Intervention.receivers`); a
   * caller never supplies them. Absent in text mode.
   */
  z
    .object({
      type: z.literal("intervene"),
      interventionId: IdSchema,
      place: z.object({ room: z.string().trim().min(1).max(120), kind: RoomKindSchema.optional(), slot: z.string().trim().min(1).max(120).optional() }).strict().optional(),
      receivedBy: HolderSchema.optional(),
      ...base,
    })
    .strict(),
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
  /** An entry of the operative site's verification (`SiteOpSchema`; docs/TEAM.md §4.5). */
  z.object({ type: z.literal("site"), site: SiteOpSchema, ...base }).strict(),
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
  /**
   * The patient arrived in another room (docs/TEAM.md §5): the world moved them there — wheeled by someone
   * (`broughtBy`: their staff id, or the learner's avatar) or transferred by the team (absent). Recorded by the
   * session from the world in in-world mode, never entered by hand; `room` is the facility room, `kind` its kind,
   * `slot` the bed space.
   */
  z
    .object({
      type: z.literal("arrival"),
      room: z.string().trim().min(1).max(120),
      kind: RoomKindSchema.optional(),
      slot: z.string().trim().min(1).max(120).optional(),
      broughtBy: HolderSchema.optional(),
      ...base,
    })
    .strict(),
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
  /** Where the patient was when it was given (in-world mode: what the world confirmed; see the `intervene` action). */
  place?: PatientPlaceRecord;
  /** The member of staff who took the patient over in person (`Intervention.receivers`; in-world mode). */
  receivedBy?: string;
  /** A hand-over (`Intervention.handover`): what the record held when it was given — never prose made up for it. */
  handover?: HandoverContent;
}

/** Where the patient is: the facility room, its kind and the bed space (in-world mode). */
export interface PatientPlaceRecord {
  room: string;
  kind?: RoomKind;
  slot?: string;
}

/** The patient arrived in another room (the `arrival` action): where, who brought them, when. */
export interface ArrivalRecord extends PatientPlaceRecord {
  /** Who wheeled them (a staff id, or the learner's avatar); absent: a transfer by the team. */
  broughtBy?: string;
  at: number;
  seq: number;
}

/**
 * The content of a hand-over (docs/TEAM.md §5), taken from the record as it stands when it is given (`handoverFromRecord`):
 * the airway interventions given, the vitals then, the drugs given and when, the holds still open, whether the
 * patient can speak, the operation as it ended (its injuries, recognised or not) and the count's status.
 */
export interface HandoverContent {
  airway: string[];
  ventilation: Record<string, number>;
  haemodynamics: Record<string, number>;
  drugs: { id: string; at: number }[];
  unresolved: string[];
  /** The patient can speak now (`patient.nonVerbalWhen` does not hold). */
  speaks: boolean;
  /** Cases with an operation: how it ended and what happened in it. */
  procedure?: {
    closed: boolean;
    specimen: string;
    bailouts: string[];
    injuries: { kind: string; structure: string; recognised: boolean }[];
  };
  /** Cases whose team keeps a count: its status. */
  count?: CountStatus;
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
 * One entry of the site's record: the op as given, when, and what the engine wrote for it — what a `read` saw
 * (`value`: a side, or null: no mark), what a `raise` found to differ (`values`, in the order of its `sources`), the
 * side a `confirm` settled on and what the confirmer had read (`basis`).
 */
export type SiteEntry = SiteOp & {
  at: number;
  seq: number;
  value?: string | null;
  values?: (string | null)[];
  side?: string;
  basis?: string[];
};

/**
 * The operative site's verification for the encounter (docs/TEAM.md §4.5). `mark`: where the skin mark is now
 * (null: not marked); `says`: what each piece of evidence states now (a corrected document states the corrected
 * side) — both hidden until someone reads them: an entry is what a reader saw. Append-only evidence of who looked,
 * who raised, who verified what, who corrected what and who confirmed; the status is derived (`siteStatus`).
 */
export interface SiteRecord {
  mark: string | null;
  says: Record<string, string>;
  entries: SiteEntry[];
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
  /** Holds placed on interventions, in order (absent until the first; sessions saved before have none). */
  holds?: HoldRecord[];
  /** The surgical count (cases whose team keeps one), from the baseline on. */
  count?: CountRecord;
  /** The operative site's verification (cases whose team verifies one; in-world mode), from its opening on. */
  site?: SiteRecord;
  /** New investigations ordered in this encounter (docs/STUDIES.md), from the first order on. */
  studies?: StudyRecord;
  /** Who is responsible for the anaesthetised patient, and the hand-overs (absent: the case team's anaesthetist). */
  anaesthesia?: AnaesthesiaResponsibility;
  /** Critical alarms and the responses to them (docs/TEAM.md §5), one episode per alarm. */
  alarms?: AlarmEpisode[];
  /** Where the patient has been taken, in order (`arrival`; in-world mode): absent until the first move. */
  arrivals?: ArrivalRecord[];
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
  /** The patient arrived in another room (`arrival`). */
  | { type: "patient.arrived"; room: string; kind?: RoomKind; slot?: string; broughtBy?: string }
  /** An entry of the operative site's verification (docs/TEAM.md §4.5); `status` after it. */
  | { type: "site.recorded"; op: SiteOp["op"]; staff: string; status: SiteStatus; source?: string; value?: string | null; side?: string; sources?: [string, string]; values?: (string | null)[] }
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
