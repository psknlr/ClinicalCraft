import { z } from "zod";
import { CapabilitySchema, ConditionSchema, IdSchema, LocalizedTextSchema } from "./common.js";

/**
 * Standing tasks of the facility's staff (docs/TEAM.md §5.1): work a colleague does **on their own** once it falls
 * due — a clinic assistant who prepares the treatment room and brings the acupuncture cart to the couch once the
 * patient has consented — without the learner asking for each step. A case lists them (`case.staffTasks`); the
 * session's staff carry them out in their own round, in-world with their own bodies, and the record keeps what
 * became of each one: started, blocked (with why), done.
 *
 * A task sets up conditions, never clinical acts: its steps bring equipment to the patient or work a device. What is
 * done to the patient stays the clinician's.
 */

/** One step of a standing task. */
export const StaffTaskStepSchema = z.union([
  /** Bring a cart that provides this capability to the patient's side (nothing to do when one stands there already). */
  z.object({ fetch: CapabilitySchema }).strict(),
  /**
   * Work a device that provides this capability: one operation of its behaviour (a heat lamp switched on, a couch
   * made ready). The device in the patient's room first; nothing to do when it is already in the state the operation
   * leads to.
   */
  z.object({ operate: CapabilitySchema, operation: IdSchema }).strict(),
]);
export type StaffTaskStep = z.infer<typeof StaffTaskStepSchema>;

/** A standing task of a staff member. */
export const StaffTaskSchema = z
  .object({
    id: IdSchema,
    /** What it is, as the status and the colleague's role state name it ("Prepare the treatment room"). */
    name: LocalizedTextSchema,
    /** Who does it: a staff id of the facility, or a role (the first staff member of that role). */
    staff: z.string().min(1).max(80),
    /** It falls due once this holds (absent: as the encounter starts). */
    when: ConditionSchema.optional(),
    steps: z.array(StaffTaskStepSchema).max(8).default([]),
    /** What they say when it is done (absent: nothing is said). */
    say: LocalizedTextSchema.optional(),
  })
  .strict();
export type StaffTask = z.infer<typeof StaffTaskSchema>;

const StaffRef = z.string().trim().min(1).max(80);

/**
 * The steps of a standing task as the record keeps them (`ClinicalAction` `staff-task`): `start` — the colleague has
 * taken it up; `blocked` — they cannot go on now, and why (nobody there, no device, no way to it: tried again later);
 * `done`. The session records them; a learner never enters them by hand.
 */
export const StaffTaskOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("start"), task: IdSchema, by: StaffRef }).strict(),
  z.object({ op: z.literal("blocked"), task: IdSchema, by: StaffRef, reason: z.string().trim().min(1).max(500) }).strict(),
  z.object({ op: z.literal("done"), task: IdSchema, by: StaffRef }).strict(),
]);
export type StaffTaskOp = z.infer<typeof StaffTaskOpSchema>;

export const STAFF_TASK_STATUSES = ["started", "blocked", "done"] as const;
export type StaffTaskStatus = (typeof STAFF_TASK_STATUSES)[number];

/** What became of one standing task in the encounter. */
export interface StaffTaskRecord {
  task: string;
  by: string;
  status: StaffTaskStatus;
  /** Why it cannot go on (status `blocked`). */
  reason?: string;
  /** Every status it went through, in order. */
  history: { status: StaffTaskStatus; at: number; seq: number; reason?: string }[];
}
