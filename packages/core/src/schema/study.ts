import { z } from "zod";
import { CapabilitySchema, ConditionSchema, IdSchema, LocalizedListSchema, LocalizedTextSchema } from "./common.js";

/**
 * New investigations in an encounter (docs/STUDIES.md): studies the simulated hospital can perform although the
 * published case never reported them — a 12-lead ECG, a blood count, a chest radiograph. A case lists them as
 * versioned **test profiles** (`case.studies`): the profile owns what the test can reveal (its model), the engine
 * captures the patient's state when the study is acquired and computes the observations from it, a reporting agent
 * words them, and the chart labels the result **simulated**, apart from the published source records
 * (`investigations`, `performedAt: "records"`) and from historical material the source does not have.
 */

/** One measured analyte of a laboratory profile (simulated teaching values, never the patient's). */
export const StudyAnalyteSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    unit: z.string().min(1).max(20),
    /** Reference interval. */
    low: z.number(),
    high: z.number(),
    /** The teaching seed's value for this patient, and how far a sample may vary from it (seeded per accession). */
    base: z.number(),
    spread: z.number().min(0).default(0),
    decimals: z.number().int().min(0).max(3).default(1),
    /** Changes the patient's state makes at the moment of collection (a bleed lowers haemoglobin). */
    effects: z.array(z.object({ when: ConditionSchema, delta: z.number() }).strict()).default([]),
  })
  .strict();
export type StudyAnalyte = z.infer<typeof StudyAnalyteSchema>;

/** A finding an ECG or an image can show, when its condition holds at acquisition; `side`: the patient's own. */
const StudyFindingSchema = z
  .object({
    id: IdSchema,
    text: LocalizedTextSchema,
    when: ConditionSchema.optional(),
    side: z.enum(["left", "right"]).optional(),
  })
  .strict();

/** A study's category (docs/STUDIES.md §1). */
export const StudyCategorySchema = z.enum(["lab", "bedside", "imaging"]);
export type StudyCategory = z.infer<typeof StudyCategorySchema>;

/** A condition with the reason said when it stops a study (a restriction that holds, a prerequisite that does not). */
export const StudyRuleSchema = z.object({ when: ConditionSchema, reason: LocalizedTextSchema }).strict();
export type StudyRule = z.infer<typeof StudyRuleSchema>;

/** What the test can reveal, from the acquisition snapshot. */
export const StudyModelSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ecg"),
      /** The rhythm this patient is simulated in. */
      rhythm: LocalizedTextSchema,
      /** Interval ranges (ms), seeded per accession. */
      prMs: z.tuple([z.number(), z.number()]),
      qrsMs: z.tuple([z.number(), z.number()]),
      qtcMs: z.tuple([z.number(), z.number()]),
      /**
       * Dextrocardia: with the leads in their standard positions the tracing shows it (lead I inverted, reversed
       * R-wave progression); with the chest leads mirrored (right-sided) and the arm leads reversed it reads as a
       * normally placed heart. The configuration is part of the acquisition.
       */
      dextrocardia: z.boolean().default(false),
      findings: z.array(StudyFindingSchema).default([]),
    })
    .strict(),
  z.object({ kind: z.literal("lab"), analytes: z.array(StudyAnalyteSchema).min(1) }).strict(),
  z
    .object({
      kind: z.literal("imaging"),
      technique: LocalizedTextSchema,
      findings: z.array(StudyFindingSchema).min(1),
    })
    .strict(),
]);
export type StudyModel = z.infer<typeof StudyModelSchema>;

/** A test the simulated hospital can perform in this encounter. */
export const StudyProfileSchema = z
  .object({
    /** Stable test code (the order resolves aliases to it). */
    code: IdSchema,
    name: LocalizedTextSchema,
    aliases: LocalizedListSchema.default([]),
    /**
     * How it is acquired: `bedside-device` — a mobile device brought to the patient (a 12-lead ECG); `sample` — a
     * specimen taken at the bedside and analysed in the laboratory; `department` — the patient goes to a fixed
     * device (a chest radiograph in radiology).
     */
    acquisition: z.enum(["bedside-device", "sample", "department"]),
    /**
     * `lab` (a specimen analysed in the laboratory: blood count, chemistry, coagulation, group and screen, lactate),
     * `bedside` (at the patient with a device: ECG, point-of-care ultrasound, glucose, blood gas) or `imaging` (a
     * radiograph, CT, ultrasound in a department). Default from `acquisition`: sample → lab, bedside-device →
     * bedside, department → imaging.
     */
    category: StudyCategorySchema.optional(),
    /** When it may be ordered (absent: while the encounter runs); otherwise the order is refused as not yet possible. */
    orderableWhen: ConditionSchema.optional(),
    /** Safety restrictions: while one holds the order is refused with its reason (no transfer to CT with the abdomen open). */
    restrictions: z.array(StudyRuleSchema).default([]),
    /**
     * Prerequisites of the acquisition: while one does not hold the order is accepted but waits (`blocked`, with its
     * reason) — recoverable, it goes on once it holds (intravenous access for a sample, the patient at the device).
     */
    prerequisites: z.array(StudyRuleSchema).default([]),
    /** Roles that may acquire it (default: nurse, paramedic, attending, clinician at the bedside; a department's radiographer). */
    collectors: z.array(z.string().min(1).max(40)).default([]),
    /** Capabilities the facility must provide (the device, the analyser, the X-ray room). */
    requires: z.array(CapabilitySchema).default([]),
    /** Simulated minutes from acquisition to the report. */
    turnaroundMinutes: z.number().min(0).default(0),
    /** Who reviews the released report by default (a staff id or role; default: the requester). */
    reviewer: z.string().min(1).max(80).optional(),
    /** The published case's own record of this kind, if it has one (an investigation id): looked up, never invented. */
    historical: IdSchema.optional(),
    /** The profile's version (a benchmark freezes it with the case). */
    version: z.string().min(1).max(20).default("1"),
    model: StudyModelSchema,
  })
  .strict();
export type StudyProfile = z.infer<typeof StudyProfileSchema>;

/** One structured observation of an acquisition: a value with its unit and interval, or a finding. */
export interface StudyObservation {
  id: string;
  label: { en: string; "zh-CN": string };
  value?: number;
  unit?: string;
  low?: number;
  high?: number;
  flag?: "low" | "high" | "normal";
  text?: { en: string; "zh-CN": string };
  side?: "left" | "right";
}

/**
 * Where an order is in its workflow (docs/STUDIES.md §4): ordered → assigned (to the person who will acquire it) →
 * en route → at the patient → acquisition started → acquired → reported → reviewed; `blocked` (with `waiting`) when it
 * cannot proceed now. Nothing is acquired before `at-patient`: a nurse who cannot reach the patient takes no sample.
 */
export type StudyStage = "ordered" | "assigned" | "en-route" | "at-patient" | "acquisition-started" | "blocked" | "acquired" | "reported" | "reviewed";

/** An order of a study (`study-order`): what, why, how urgent, by whom; idempotent by `key`. */
export interface StudyOrder {
  id: string;
  code: string;
  key: string;
  indication?: string;
  priority: "routine" | "urgent";
  requester: string;
  reviewer?: string;
  configuration?: string;
  at: number;
  seq: number;
  /** A fulfilment that cannot proceed now, and why (recoverable: the device frees, the patient is moved). */
  waiting?: { reason: string; at: number };
  accessions: string[];
  /** Who acquires it (a staff id or role), once assigned. */
  assignee?: string;
  /** Its workflow stage now (absent: ordered). */
  stage?: StudyStage;
  /** Every stage it went through, in order: the order's own event stream. */
  stages?: { stage: StudyStage; at: number; seq: number; reason?: string }[];
}

/** One acquisition (`study-acquire`): the specimen or the tracing, who took it, when, at which state revision. */
export interface StudyAccession {
  id: string;
  order: string;
  code: string;
  collector: string;
  at: number;
  /** The session's action sequence at acquisition: the state the observations were computed from. */
  revision: number;
  /** Lead configuration, specimen, view. */
  configuration?: string;
  quality: "good" | "limited";
  observations: StudyObservation[];
  /** When the report is due (acquisition + turnaround). */
  dueAt: number;
  profileVersion: string;
}

/** A released report (`study-release`): its text from the observations, who/what wrote it; an amendment is a new revision. */
export interface StudyReport {
  accession: string;
  revision: number;
  findings: { en: string; "zh-CN": string };
  impression: { en: string; "zh-CN": string };
  limitations?: { en: string; "zh-CN": string };
  /** `template` or the model that wrote it (validated before release). */
  generator: string;
  at: number;
  seq: number;
  /** The observations the impression rests on (each one of this accession's). */
  supportedBy?: string[];
  /** Where it comes from, machine-readable: a simulated investigation of the case's teaching profile — never the source's. */
  provenance: { kind: "simulated-investigation"; source: "case-teaching-profile"; profile: string; profileVersion: string; observations: string[]; generator: string };
}

/**
 * Why a colleague reviewed a report, resolved when it was ready: `named` — the reviewer the order named by name or
 * staff id (a consultant asked to review, wherever they are); `responsible` — the anaesthetist responsible for the
 * patient now, by the anaesthesia record (after a handover, the one who took over); `on-duty` — the colleague of that
 * role where the patient is.
 */
export type ReviewBasis = "named" | "responsible" | "on-duty";

/** The encounter's studies. */
export interface StudyRecord {
  orders: StudyOrder[];
  accessions: StudyAccession[];
  reports: StudyReport[];
  /** Who reviewed which released report, when, and why them (`basis`). */
  reviews: { accession: string; by: string; basis?: ReviewBasis; at: number; seq: number }[];
}

const Bilingual = z.object({ en: z.string().trim().min(1).max(4000), "zh-CN": z.string().trim().min(1).max(4000) }).strict();

/** The study actions (`ClinicalAction` `study`): order, wait, acquire, release, review. */
export const StudyOpSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("order"),
      code: IdSchema,
      key: z.string().min(1).max(120),
      indication: z.string().max(500).optional(),
      priority: z.enum(["routine", "urgent"]).default("routine"),
      requester: z.string().min(1).max(80),
      reviewer: z.string().min(1).max(80).optional(),
      /** How it is to be acquired (an ECG's lead placement: `standard` or `mirror`). */
      configuration: z.string().max(40).optional(),
    })
    .strict(),
  z.object({ op: z.literal("wait"), order: z.string().min(1), reason: z.string().min(1).max(300) }).strict(),
  /** The person who will acquire it (a staff id or role). */
  z.object({ op: z.literal("assign"), order: z.string().min(1), to: z.string().min(1).max(80) }).strict(),
  /** The acquisition under way: the collector on the way, at the patient (confirmed by the world), starting. */
  z.object({ op: z.literal("progress"), order: z.string().min(1), stage: z.enum(["en-route", "at-patient", "acquisition-started"]) }).strict(),
  z.object({ op: z.literal("acquire"), order: z.string().min(1), collector: z.string().min(1).max(80), configuration: z.string().max(40).optional(), quality: z.enum(["good", "limited"]).default("good") }).strict(),
  z.object({ op: z.literal("release"), accession: z.string().min(1), findings: Bilingual, impression: Bilingual, limitations: Bilingual.optional(), generator: z.string().min(1).max(80), supportedBy: z.array(z.string().min(1).max(80)).max(50).optional() }).strict(),
  z.object({ op: z.literal("review"), accession: z.string().min(1), by: z.string().min(1).max(80), basis: z.enum(["named", "responsible", "on-duty"]).optional() }).strict(),
]);
export type StudyOp = z.infer<typeof StudyOpSchema>;
