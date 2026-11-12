import { z } from "zod";

/**
 * A staff member's response to a critical alarm (docs/TEAM.md §5), as the record keeps it: an episode per alarm —
 * detected, the way to the patient blocked (with why), the responder confirmed at the patient by the world, the alarm
 * cleared. Detection, blocked travel and arrival are separate steps, so nobody is said to be at the patient before
 * the world has them there, a blocked walk is retried until it succeeds, and a save and resume replays one alarm
 * history (never a second announcement). The session records these steps; a learner never enters them by hand.
 */

const StaffRef = z.string().min(1).max(80);
const Vital = z.string().min(1).max(40);

export const AlarmResponseOpSchema = z.discriminatedUnion("op", [
  /** A new critical alarm the responder has recognised (no open episode of this vital). */
  z.object({ op: z.literal("detect"), vital: Vital, value: z.number(), by: StaffRef }).strict(),
  /** The responder could not reach the patient, and why (a locked door, no route). */
  z.object({ op: z.literal("blocked"), vital: Vital, by: StaffRef, reason: z.string().trim().min(1).max(500) }).strict(),
  /** The responder is at the patient (the world confirmed it): their response is said. */
  z.object({ op: z.literal("arrived"), vital: Vital, by: StaffRef }).strict(),
  /** The alarm is no longer critical: the episode ends (a recurrence is a new one). */
  z.object({ op: z.literal("cleared"), vital: Vital }).strict(),
]);
export type AlarmResponseOp = z.infer<typeof AlarmResponseOpSchema>;

export type AlarmStage = "detected" | "blocked" | "arrived" | "cleared";

/** One alarm episode and the response to it. */
export interface AlarmEpisode {
  /** `alarm-<n>`: the n-th episode of the encounter. */
  id: string;
  vital: string;
  /** The value when it was recognised. */
  value: number;
  by: string;
  stage: AlarmStage;
  /** Why the responder could not reach the patient (stage `blocked`). */
  reason?: string;
  /** Every stage the episode went through, in order. */
  history: { stage: AlarmStage; at: number; seq: number; reason?: string }[];
}
