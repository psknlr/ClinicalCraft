import { z } from "zod";
import { LocalizedTextSchema } from "./common.js";

/**
 * Where a piece of evidence comes from, when it was captured and how good it is (docs/CASE_AUTHORING.md §5.2): what a
 * clinician weighs before using a finding — a tongue photo the patient took at a kiosk under warm light is not the
 * tongue seen in daylight after a rinse. Optional on results and examination findings (and on their branches); front
 * ends show it beside the evidence and the agents' tools return it with the text.
 */

/**
 * How the evidence was obtained:
 * - `direct-observation` — what the examiner sees, hears or feels now (an examination);
 * - `patient-captured` — a photo or reading the patient took themselves (a kiosk, a home device, a phone);
 * - `clinician-captured` — an image or recording a clinician or the clinic's staff took with a device;
 * - `clinician-description` — a clinician's written description (a note, a referral letter);
 * - `device-measurement` — a value a device measured;
 * - `agent-interpretation` — what a model or a program concluded from other evidence;
 * - `published-record` — the published case's own record.
 */
export const EVIDENCE_SOURCES = ["direct-observation", "patient-captured", "clinician-captured", "clinician-description", "device-measurement", "agent-interpretation", "published-record"] as const;
export const EvidenceSourceSchema = z.enum(EVIDENCE_SOURCES);
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

/**
 * Why the case has this evidence as it is: `recorded` — from the source record; `authored` — written for teaching
 * (a branch that follows what was done included); `simulated` — computed by the engine's model in the encounter.
 */
export const EVIDENCE_BASES = ["recorded", "authored", "simulated"] as const;
export const EvidenceBasisSchema = z.enum(EVIDENCE_BASES);
export type EvidenceBasis = z.infer<typeof EvidenceBasisSchema>;

/** A quality check of the capture: passed, failed (with why), or not checked. */
export const EvidenceQualitySchema = z
  .object({
    status: z.enum(["passed", "failed", "not-checked"]),
    reasons: z.array(LocalizedTextSchema).max(12).default([]),
  })
  .strict();
export type EvidenceQuality = z.infer<typeof EvidenceQualitySchema>;

export const ProvenanceSchema = z
  .object({
    source: EvidenceSourceSchema,
    /** Who or what captured it, as the record names it ("the waiting-area intake kiosk", "Siti (clinic assistant)"). */
    by: LocalizedTextSchema.optional(),
    /** When it was captured, as the record says it ("Today 10:24, before the consultation"). */
    capturedAt: LocalizedTextSchema.optional(),
    quality: EvidenceQualitySchema.optional(),
    basis: EvidenceBasisSchema.optional(),
  })
  .strict();
export type Provenance = z.infer<typeof ProvenanceSchema>;
