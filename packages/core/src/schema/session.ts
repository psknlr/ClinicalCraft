import { z } from "zod";
import { IdSchema, type Vitals, type VitalKey } from "./common.js";

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

export const ClinicalActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), ...base }).strict(),
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
  | { type: "intervention.applied"; interventionId: string; appropriateness: "indicated" | "neutral" | "contraindicated" }
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
  | { type: "action.rejected"; action: ClinicalActionType; code: RejectionCode; message: string };

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
  | "invalid";

export interface ReduceResult {
  state: SessionState;
  events: DomainEvent[];
  /** Present when the action was rejected (state unchanged except where noted). */
  rejected?: { code: RejectionCode; message: string };
}
