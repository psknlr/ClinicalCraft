/**
 * Engine-level types shared by the validation, simulation, matching and
 * assessment modules (see docs/ARCHITECTURE.md §3).
 */
import type { z } from "zod";
import type { Decision } from "../schema/case.js";
import type { VitalKey, Vitals } from "../schema/common.js";
import type { PatientSlotSchema } from "../schema/facility.js";
import type { ClinicalAction, DomainEvent, OrderRecord, RejectionCode, SessionState } from "../schema/session.js";

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
  completed: boolean;
  minutes: number;
  hints: number;
  objectives: { id: string; done: boolean; at?: number }[];
  history: { asked: number; required: number; requiredAsked: number; missingRequired: string[] };
  exam: { performed: number; required: number; requiredPerformed: number; missingRequired: string[] };
  /** `unread` lists result keys (`${id}@${phase}`) ordered but never read. */
  investigations: { ordered: number; essentialMissing: string[]; lowValue: string[]; harmful: string[]; unread: string[] };
  decisions: { id: string; firstTryCorrect: boolean; attempts: number; decided: boolean }[];
  safety: { contraindicated: { interventionId: string; at: number }[]; criticalAlarms: number };
  /** `met: null` = transcript-judged item (needs the examiner agent). */
  rubric: { id: string; domain: string; weight: number; met: boolean | null }[];
  /** Deterministic rubric items only. */
  score: { earned: number; possible: number; percent: number };
}

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
