import { z } from "zod";

/**
 * Anaesthesia responsibility (docs/TEAM.md §5, the engineering recommendations P0-3): who is responsible for the
 * anaesthetised patient now, and how responsibility moves — a relief is requested, the colleague arrives at the
 * patient, a structured hand-over is accepted, and only then is the new anaesthetist responsible (and bound by the
 * same rule: nobody responsible leaves an anaesthetised patient). The session records these steps; a learner never
 * enters them by hand.
 */

const StaffRef = z.string().min(1).max(80);

export const AnaesthesiaOpSchema = z.discriminatedUnion("op", [
  /** The responsible anaesthetist asks a colleague to take over. */
  z.object({ op: z.literal("request-relief"), from: StaffRef, to: StaffRef }).strict(),
  /** The colleague is at the patient (the world confirmed it). */
  z.object({ op: z.literal("relief-arrived"), by: StaffRef }).strict(),
  /**
   * The structured hand-over, accepted by the colleague: responsibility moves to them. Its content is what the record
   * holds (intervention ids, vitals at the hand-over, drugs given, open issues) — never prose made up for it.
   */
  z
    .object({
      op: z.literal("handover"),
      from: StaffRef,
      to: StaffRef,
      airway: z.array(z.string().max(80)).max(20).default([]),
      ventilation: z.record(z.string().max(20), z.number()).default({}),
      haemodynamics: z.record(z.string().max(20), z.number()).default({}),
      drugs: z.array(z.object({ id: z.string().max(80), at: z.number() }).strict()).max(50).default([]),
      unresolved: z.array(z.string().max(200)).max(20).default([]),
    })
    .strict(),
]);
export type AnaesthesiaOp = z.infer<typeof AnaesthesiaOpSchema>;

/** One accepted hand-over. */
export interface AnaesthesiaHandover {
  from: string;
  to: string;
  at: number;
  seq: number;
  airway: string[];
  ventilation: Record<string, number>;
  haemodynamics: Record<string, number>;
  drugs: { id: string; at: number }[];
  unresolved: string[];
  accepted: true;
}

/** Who is responsible for the anaesthetised patient, and where a hand-over stands. */
export interface AnaesthesiaResponsibility {
  /** The responsible anaesthetist (a staff id). */
  responsible: string;
  /** The colleague asked to take over, until the hand-over. */
  relief?: string;
  handoverStatus: "none" | "requested" | "relief-arrived" | "accepted" | "transferred";
  handovers: AnaesthesiaHandover[];
}
