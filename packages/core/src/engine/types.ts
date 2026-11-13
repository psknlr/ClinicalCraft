/**
 * Engine-level types shared by the validation, simulation, matching and
 * assessment modules (see docs/ARCHITECTURE.md §3).
 */
import type { CountReport } from "./count.js";
import type { z } from "zod";
import type { Decision } from "../schema/case.js";
import type { VitalKey, Vitals } from "../schema/common.js";
import type { PatientSlotSchema } from "../schema/facility.js";
import type { ClinicalAction, DomainEvent, DoseErrorRecord, OrderRecord, RejectionCode, SessionState } from "../schema/session.js";
import type { LocalizedText } from "../i18n.js";

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * One validation finding. `path` is a dot-joined path into the JSON document
 * with numeric array indices (e.g. `objectives.0.completeWhen.all.1.asked`);
 * the empty string denotes the document root.
 */
export interface Issue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

/** Result of `parseCase` / `parseFacility` / `parseCatalog`. */
export type ParseResult<T> = { ok: true; value: T; warnings: Issue[] } | { ok: false; issues: Issue[] };

/* ------------------------------------------------------------------ */
/* Session queries                                                     */
/* ------------------------------------------------------------------ */

/** Learner progress through the case objectives (V4 quest track). */
export interface ObjectiveProgress {
  objectives: { id: string; done: boolean; doneAt?: number; current: boolean }[];
  /** Index of the first objective not yet done; equals `total` when complete. */
  currentIndex: number;
  done: number;
  total: number;
  complete: boolean;
}

/** A decision with its lock/answer state. */
export interface DecisionAvailability {
  decision: Decision;
  unlocked: boolean;
  decided: boolean;
}

/** An order with its readiness/read state. */
export interface OrderStatus {
  order: OrderRecord;
  ready: boolean;
  read: boolean;
}

/** One rejected action during `replay`. */
export interface ReplayRejection {
  /** Index in the replayed action list. */
  index: number;
  action: ClinicalAction;
  code: RejectionCode;
  message: string;
}

/** Result of `replay`. */
export interface ReplayResult {
  state: SessionState;
  events: DomainEvent[];
  rejections: ReplayRejection[];
}

/* ------------------------------------------------------------------ */
/* Physiology                                                          */
/* ------------------------------------------------------------------ */

/** Severity of a vital-sign alarm. */
export type AlarmLevel = "warning" | "critical";

/** One active monitor alarm. */
export interface VitalAlarm {
  vital: VitalKey;
  level: AlarmLevel;
  value: number;
}

/**
 * The vitals a bedside snapshot shows: only `shownVitals` are present (an
 * unread glucose, a pain score the patient cannot give and — while the
 * monitor is not attached — every monitored vital but the spot checks are
 * absent). `map` accompanies a shown blood pressure; `rhythm`/`ecg` need an
 * attached monitor with its ECG leads (`physiology.monitor.ecgWhen`).
 */
export type DisplayedVitals = Partial<Vitals> & { map?: number };

/**
 * Bedside view of the patient at `minute` (pure function of case, state and
 * minute). `baselineOnly` is true for cases without a physiology model: the
 * values are a fixed normal adult placeholder the UI should present as "not
 * recorded".
 */
export interface VitalsSnapshot {
  minute: number;
  vitals: DisplayedVitals;
  alarms: VitalAlarm[];
  trend: Partial<Record<VitalKey, -1 | 0 | 1>>;
  baselineOnly?: boolean;
  /**
   * Present for a case with `physiology.monitor` (a monitor the learner must
   * attach): `false` until it is attached — no rhythm, no monitor alarms, no
   * live monitored vitals; UIs label the bedside "monitor not attached".
   * Absent otherwise (the patient is monitored from the start).
   */
  monitorAttached?: boolean;
  /**
   * Present for a case whose monitor gets its ECG leads separately
   * (`physiology.monitor.ecgWhen`): whether the rhythm and ECG are shown —
   * `false` while the monitor is not attached, or attached without leads
   * (e.g. a pulse oximeter and cuff before the team's monitor-defibrillator);
   * UIs then name no rhythm and draw no ECG. Absent otherwise.
   */
  ecgAttached?: boolean;
  /**
   * While the monitor is not attached: the vitals in `vitals` that are
   * static manual readings (the case's spot checks — the triage set), in
   * `VITAL_KEYS` order. UIs label them as triage/manual readings, not live.
   */
  spotChecks?: VitalKey[];
  /**
   * Vitals the monitor cannot read right now (`VITAL_KEYS` order), present
   * only during a cardiac-arrest rhythm: `["hr", "sbp", "dbp", "spo2"]` for
   * VF/asystole, `["sbp", "dbp", "spo2"]` for PEA/pulseless VT. Their value
   * in `vitals` is 0 (so is `map`); UIs should show "no reading" (e.g. `---`).
   */
  unmeasurable?: VitalKey[];
}

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

/** A scored match of free text against a case item (score 0..1). */
export interface MatchHit {
  id: string;
  score: number;
}

/** Optional filters for `matchHistory` / `matchExam`. */
export interface MatchOptions {
  /**
   * Drop items whose `phases` do not include this phase (items without `phases` are always eligible);
   * for `matchHistory` also route hits on items superseded in this phase to their twin (`history[].supersedes`).
   */
  phase?: string;
  /** `false` drops history items with `disclosure: "unknown"` (default true; ignored by `matchExam`). */
  includeUnknown?: boolean;
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

/**
 * Deterministic teaching-script assessment of a session (not a validated
 * competency score — UIs must say so).
 */
export interface AssessmentReport {
  caseId: string;
  /** The case version and the engine that scored it (a score is only comparable with both frozen). */
  caseVersion: string;
  engine: string;
  /** Every objective met (`completed`); the encounter ended with `finish` (`finished`). */
  completed: boolean;
  finished: boolean;
  /**
   * `source-only`: the encounter used the published record alone; `expanded`: it ordered new investigations
   * (simulated, docs/STUDIES.md) — scores of the two are reported apart, never compared.
   */
  evidence: "source-only" | "expanded";
  /** The new investigations of an expanded encounter and how far each got (docs/STUDIES.md §4). */
  studies?: { code: string; status: "ordered" | "waiting" | "acquired" | "released" | "reviewed"; accessions: number }[];
  minutes: number;
  hints: number;
  objectives: { id: string; done: boolean; at?: number }[];
  history: { asked: number; required: number; requiredAsked: number; missingRequired: string[] };
  exam: { performed: number; required: number; requiredPerformed: number; missingRequired: string[] };
  /** `unread` lists result keys (`${id}@${phase}`) ordered but never read. */
  investigations: { ordered: number; essentialMissing: string[]; lowValue: string[]; harmful: string[]; unread: string[] };
  decisions: { id: string; firstTryCorrect: boolean; attempts: number; decided: boolean }[];
  safety: {
    contraindicated: { interventionId: string; at: number }[];
    criticalAlarms: number;
    /**
     * Case safety gates that hold (docs/PROCEDURE.md §8), and the verdict they give: `safety-critical`
     * (no score compensates it — the percentage is capped), `complication`, or `clear`. Present when the
     * case has gates.
     */
    gates?: { id: string; verdict: "safety-critical" | "complication" }[];
    verdict?: "clear" | "complication" | "safety-critical";
    /**
     * The safety outcome, reported beside the score and never folded into it: false when a critical safety failure
     * happened (`criticalFailures`), a dose error was critical, or a safety-critical gate holds. Every debrief and
     * export shows it next to the score; a run that did not pass is never presented as passed.
     */
    passed: boolean;
    /**
     * A `critical` intervention given while contraindicated (`interventions[].critical`), in order, with its `harm`
     * text: the case's dangerous error. Its effects applied — the learner met the consequence.
     */
    criticalFailures: { interventionId: string; at: number; harm?: LocalizedText }[];
    /** Orders not given because their dose conflicted with the preset (`DoseErrorRecord`), in order. */
    doseErrors: AssessedDoseError[];
  };
  /**
   * What the operation really did (cases with a `procedure`, once it has begun): unsafe acts, injuries and
   * whether they were recognised, safety pauses with what was claimed against what the field showed, and
   * the counters. For the debrief — never shown to an operator during the case.
   */
  procedure?: {
    unsafe: { code: string; structure?: string; at: number }[];
    injuries: { kind: string; structure: string; recognised: boolean; severity: "minor" | "major" }[];
    pauses: { view: string; at: number; achieved: boolean; claimsMatchField: boolean }[];
    counters: { steps: number; exchanges: number; clashes: number; crossings: number; falseAlarms: number };
  };
  /**
   * The surgical count (cases whose team keeps one; docs/TEAM.md §4.3), by item identity: its status, the items
   * still missing or not in the count, documented transfers and additions, escalations, recoveries and scans, and
   * every unsafe progression (closure on an open count) — the debrief's record, never erased.
   */
  count?: CountReport;
  /**
   * `met: null` = transcript-judged item (needs the examiner agent). `scored: false` (present only then): the
   * item's `scoredWhen` does not hold, so it counts neither as earned nor as possible. `critical: true`
   * (present only then): a critical item.
   */
  rubric: { id: string; domain: string; weight: number; met: boolean | null; scored?: false; critical?: true }[];
  /** Deterministic rubric items only, scored ones only (`scoredWhen`). */
  score: { earned: number; possible: number; percent: number; uncapped?: number };
  /**
   * Critical deterministic items missed — scored and not met — in rubric order. Present when the case marks
   * any item `critical` (empty: none missed); every debrief shows them prominently. Judged critical items are
   * missed when the examiner judges them unmet.
   */
  criticalMissed?: string[];
}

/** A dose error as the assessment reports it: the session's record without its action sequence number. */
export type AssessedDoseError = Omit<DoseErrorRecord, "seq">;

/* ------------------------------------------------------------------ */
/* Facility                                                            */
/* ------------------------------------------------------------------ */

/** A patient slot of a facility (bed/chair position accepting case settings). */
export type PatientSlot = z.infer<typeof PatientSlotSchema>;

/** A resolved navigation target in world coordinates. */
export interface WaypointLocation {
  x: number;
  z: number;
  label: string;
  /** Level of the target — set only in facilities with more than one level. */
  level?: string;
}

/** Result of `verifyCase`. */
export interface VerifyResult {
  ok: boolean;
  issues: Issue[];
  finalState: SessionState;
  assessment: AssessmentReport;
}
