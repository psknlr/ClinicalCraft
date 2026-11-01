import { z } from "zod";
import { BailoutSchema, IdSchema, ImagingSchema, LocalizedTextSchema, type Bailout, type InjuryKind, type UnsafeCode } from "./common.js";

/**
 * Operative field — a case's procedure (docs/PROCEDURE.md): the anatomy the
 * operation acts on, the dissection regions that hide and reveal it, the port
 * sites and plans, the instruments, the safety views an irreversible step
 * needs (e.g. the critical view of safety) and the limits whose breach is a
 * complication. All geometry is in the patient frame, in metres:
 * +x the patient's left, +y cranial, +z anterior (the glTF frame of the case's
 * anatomy model). Data only: the engine (`engine/procedure`) is pure.
 */

/** A point or direction in the patient frame (m): +x patient left, +y cranial, +z anterior. */
export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

/**
 * Where a fact or a shape comes from (CASE_AUTHORING §9.5, the evidence ledger):
 * `published-case` — the source report; `imaging` — segmented from the patient's own imaging;
 * `reference` — reference anatomy adapted to the case (e.g. BodyParts3D mirrored);
 * `guideline` — a guideline or textbook principle; `authored` — designed for teaching;
 * `synthetic` — a simulation assumption with no source.
 */
export const ProvenanceTagSchema = z.enum(["published-case", "imaging", "reference", "guideline", "authored", "synthetic"]);
export type ProvenanceTag = z.infer<typeof ProvenanceTagSchema>;

/**
 * What a structure is to the operation. `specimen`: what is removed (the gallbladder and its parts);
 * `target`: may be clipped and divided once identified (the cystic duct and artery); `critical`: must
 * never be clipped, divided or burnt (common bile duct, hepatic ducts, hepatic arteries, portal vein);
 * `organ`: neighbouring viscera (liver, duodenum, stomach…); `landmark`: orientation only.
 */
export const StructureRoleSchema = z.enum(["specimen", "target", "critical", "organ", "landmark"]);
export type StructureRole = z.infer<typeof StructureRoleSchema>;

export const StructureKindSchema = z.enum(["organ", "duct", "artery", "vein", "ligament", "plate"]);
export type StructureKind = z.infer<typeof StructureKindSchema>;

/** Tubular structures: what can be isolated, clipped and divided. */
export const TUBULAR_KINDS: readonly StructureKind[] = ["duct", "artery", "vein"];

export const StructureSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    kind: StructureKindSchema,
    role: StructureRoleSchema,
    /** A part of another structure (the infundibulum is part of the gallbladder). */
    parent: IdSchema.optional(),
    /** Topology: the structures this one joins (a duct's confluence, an artery's origin). */
    joins: z.array(IdSchema).default([]),
    /** The organ a tubular structure enters (the cystic duct and artery enter the gallbladder). */
    enters: IdSchema.optional(),
    /** Centreline (tubular) or a few surface points (organs), patient frame (m). */
    points: z.array(Vec3Schema).min(1),
    /** Bounding radius (organ) or half-diameter (tube), m. */
    radius: z.number().positive(),
    /** Hidden until this region is cleared to `revealAt` (absent: visible once the abdomen is open). */
    in: IdSchema.optional(),
    /** Fraction of `in` cleared at which the structure comes into view (default 0.5). */
    revealAt: z.number().min(0).max(1).optional(),
    /**
     * What the operator sees in the field, without the anatomical name (agents and assessment mode):
     * `default`, and the first `when` whose exposure test holds (a common bile duct tented up by
     * traction in the wrong direction looks like the duct entering the infundibulum).
     */
    appearsAs: z
      .object({
        default: LocalizedTextSchema,
        when: z
          .array(
            z
              .object({
                /** Holds while this region's exposure is below `below`. */
                exposure: IdSchema,
                below: z.number().min(0).max(1),
                text: LocalizedTextSchema,
                /** While this holds the structure appears to enter this organ (counts against "only two structures"). */
                appearsToEnter: IdSchema.optional(),
              })
              .strict(),
          )
          .default([]),
      })
      .strict()
      .optional(),
    /** Node name of the structure in the case's anatomy model (GLB), when it has one. */
    mesh: z.string().optional(),
    provenance: ProvenanceTagSchema,
    note: LocalizedTextSchema.optional(),
  })
  .strict();
export type Structure = z.infer<typeof StructureSchema>;

/** A named pull direction in the patient frame, or a vector. Named directions combine ("cephalad", "patient-left"). */
export const DirectionNameSchema = z.enum(["cephalad", "caudal", "patient-left", "patient-right", "anterior", "posterior"]);
export const DirectionSchema = z.union([Vec3Schema, z.array(DirectionNameSchema).min(1)]);
export type Direction = z.infer<typeof DirectionSchema>;

/** A retraction a region's exposure needs: grasp `structure` and pull it towards `direction`. */
export const ExposureNeedSchema = z
  .object({
    structure: IdSchema,
    direction: DirectionSchema,
    /** Exposure counts fully from this cosine between the pull and `direction` (default 0.8). */
    full: z.number().min(0).max(1).optional(),
  })
  .strict();
export type ExposureNeed = z.infer<typeof ExposureNeedSchema>;

export const RegionSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** Dissection steps to clear it (one `dissect` step clears 1, energy dissection 1.5). */
    units: z.number().int().positive(),
    centre: Vec3Schema,
    radius: z.number().positive(),
    /** Regions that must be cleared first (fraction ≥ 0.5) before this one can be dissected. */
    after: z.array(IdSchema).default([]),
    /** Retractions that open it; exposure = the weakest of them (1 when none are listed). */
    exposure: z.array(ExposureNeedSchema).default([]),
    /** Critical structures in or next to it: energy used while one of them is hidden and exposure is poor injures it. */
    hazards: z.array(IdSchema).default([]),
    /** Dissecting this region detaches the specimen from its bed (the gallbladder fossa). */
    bed: z.boolean().default(false),
  })
  .strict();
export type Region = z.infer<typeof RegionSchema>;

export const PortSiteSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    at: Vec3Schema,
    /** Outward abdominal-wall normal at the site (default +z, anterior). */
    normal: Vec3Schema.optional(),
  })
  .strict();
export type PortSite = z.infer<typeof PortSiteSchema>;

export const PortRoleSchema = z.enum(["camera", "working", "assist"]);
export const HandSchema = z.enum(["left", "right"]);

export const PortPlanSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** Where the operating surgeon stands (the patient's left or right). */
    surgeonSide: HandSchema,
    ports: z
      .array(
        z
          .object({
            site: IdSchema,
            role: PortRoleSchema,
            sizeMm: z.number().positive(),
            /** Which of the surgeon's hands works this port (working ports). */
            hand: HandSchema.optional(),
          })
          .strict(),
      )
      .min(2),
    provenance: ProvenanceTagSchema,
    note: LocalizedTextSchema.optional(),
  })
  .strict();
export type PortPlan = z.infer<typeof PortPlanSchema>;

/** The engine's instrument vocabulary (docs/PROCEDURE.md §3): what each one can do is fixed. */
export const InstrumentIdSchema = z.enum([
  "laparoscope",
  "grasper",
  "maryland",
  "hook",
  "scissors",
  "clip-applier",
  "suction",
  "retrieval-bag",
  "cholangiocatheter",
  "lap-us",
]);
export type InstrumentId = z.infer<typeof InstrumentIdSchema>;

export const InstrumentSchema = z
  .object({
    id: InstrumentIdSchema,
    diameterMm: z.number().positive().optional(),
    /** Working length of the shaft (m, default 0.34). */
    lengthM: z.number().positive().optional(),
  })
  .strict();

/** A safety criterion, evaluated on the field (never on what the operator claims). */
export const CriterionTestSchema = z.union([
  z.object({ cleared: IdSchema, atLeast: z.number().min(0).max(1) }).strict(),
  /** Exactly the structures that truly enter `organ` are isolated, and nothing else appears to enter it. */
  z.object({ onlyEntering: IdSchema }).strict(),
  z.object({ exposure: IdSchema, atLeast: z.number().min(0).max(1) }).strict(),
]);
export type CriterionTest = z.infer<typeof CriterionTestSchema>;

export const SafetyViewSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    criteria: z.array(z.object({ id: IdSchema, name: LocalizedTextSchema, test: CriterionTestSchema }).strict()).min(1),
    /** Irreversible steps (clip, divide) on `target` structures need this view documented at a safety pause first. */
    gatesIrreversible: z.boolean().default(true),
  })
  .strict();
export type SafetyView = z.infer<typeof SafetyViewSchema>;

export const ProcedureDefinitionSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** Case phases in which `operate` is accepted. */
    phases: z.array(IdSchema).min(1),
    /** The organ removed (its parts are `specimen` structures with this parent). */
    specimen: IdSchema,
    /** The specimen holds stones (a perforation spills them as well as bile). */
    stones: z.boolean().default(false),
    anatomy: z.array(StructureSchema).min(1),
    regions: z.array(RegionSchema).min(1),
    portSites: z.array(PortSiteSchema).min(2),
    portPlans: z.array(PortPlanSchema).min(1),
    /** The operative target the port metrics measure to (the hepatocystic triangle). */
    target: Vec3Schema,
    instruments: z.array(InstrumentSchema).min(1),
    views: z.array(SafetyViewSchema).default([]),
    bailouts: z.array(BailoutSchema).default(["call-help", "subtotal-fenestrating", "subtotal-reconstituting", "convert-open"]),
    insufflation: z
      .object({
        /** Pressure (mmHg) of a usual pneumoperitoneum, and the highest the engine accepts without a warning. */
        usual: z.number().positive().default(12),
        max: z.number().positive().default(15),
      })
      .strict()
      .default({}),
    /** Minutes each kind of step takes on a simulated clock (defaults in docs/PROCEDURE.md §5). */
    minutes: z.record(z.string(), z.number().nonnegative()).default({}),
    note: LocalizedTextSchema.optional(),
  })
  .strict();
export type ProcedureDefinition = z.infer<typeof ProcedureDefinitionSchema>;

/* ------------------------------------------------------------------ */
/* Operations (the `operate` action's `op`)                            */
/* ------------------------------------------------------------------ */



/** Handles name what the operator sees ("T1", "T2"…) — never the anatomy, which is hidden state. */
export const HandleSchema = z.string().regex(/^T\d+$/);

export const ProcedureOpSchema = z.discriminatedUnion("op", [
  /** Choose the port plan (before the first incision). */
  z.object({ op: z.literal("plan-ports"), plan: IdSchema }).strict(),
  /** Make the incisions of the plan and establish the pneumoperitoneum at `pressure` mmHg. */
  z.object({ op: z.literal("insufflate"), pressure: z.number().positive().max(30) }).strict(),
  z.object({ op: z.literal("desufflate") }).strict(),
  z.object({ op: z.literal("insert"), port: IdSchema, instrument: InstrumentIdSchema }).strict(),
  z.object({ op: z.literal("withdraw"), port: IdSchema }).strict(),
  /** Grasp `structure` (a part the operator can see: the fundus, the infundibulum) and pull it. */
  z
    .object({
      op: z.literal("retract"),
      port: IdSchema,
      structure: IdSchema,
      direction: DirectionSchema,
      force: z.enum(["gentle", "firm", "excessive"]).default("firm"),
    })
    .strict(),
  z.object({ op: z.literal("release"), structure: IdSchema }).strict(),
  /** One dissection step in a region (with energy for the hook). */
  z.object({ op: z.literal("dissect"), port: IdSchema, region: IdSchema, energy: z.boolean().default(false) }).strict(),
  /** Dissect round a seen tubular structure until it is free all round. */
  z.object({ op: z.literal("isolate"), port: IdSchema, handle: HandleSchema }).strict(),
  /** Name what a handle is (the operator's identification; recorded, never trusted by the safety views). */
  z.object({ op: z.literal("identify"), handle: HandleSchema, as: IdSchema }).strict(),
  /**
   * Safety pause before an irreversible step: the operator states, per criterion of `view`, whether it
   * holds. The engine records the claims with what the field really shows.
   */
  z.object({ op: z.literal("safety-pause"), view: IdSchema, claims: z.record(IdSchema, z.boolean()) }).strict(),
  z.object({ op: z.literal("clip"), port: IdSchema, handle: HandleSchema, count: z.number().int().min(1).max(3).default(1) }).strict(),
  z.object({ op: z.literal("divide"), port: IdSchema, handle: HandleSchema }).strict(),
  z.object({ op: z.literal("coagulate"), port: IdSchema, handle: HandleSchema }).strict(),
  z.object({ op: z.literal("suction"), port: IdSchema }).strict(),
  z.object({ op: z.literal("irrigate"), port: IdSchema }).strict(),
  /** Intraoperative imaging of the biliary tree (cholangiography, laparoscopic ultrasound). */
  z.object({ op: z.literal("image"), modality: ImagingSchema, port: IdSchema }).strict(),
  /** Look over the field for bleeding, bile and spilled stones. */
  z.object({ op: z.literal("inspect") }).strict(),
  /** Say aloud that something has gone wrong (an injury the operator suspects). */
  z.object({ op: z.literal("recognise"), injury: z.enum(["bile-duct-injury", "vascular-injury", "bleeding", "perforation", "thermal-injury", "bile-leak"]) }).strict(),
  z.object({ op: z.literal("bag"), port: IdSchema }).strict(),
  z.object({ op: z.literal("extract"), port: IdSchema }).strict(),
  z.object({ op: z.literal("bailout"), strategy: BailoutSchema }).strict(),
  /** End the laparoscopy: instruments out, pneumoperitoneum released, ports closed. */
  z.object({ op: z.literal("close") }).strict(),
]);
export type ProcedureOp = z.infer<typeof ProcedureOpSchema>;
export type ProcedureOpType = ProcedureOp["op"];

/* ------------------------------------------------------------------ */
/* State (SessionState.procedure)                                      */
/* ------------------------------------------------------------------ */

/** Something the operator sees or feels as a step completes (never the hidden anatomy or the score). */
export type ProcedureSignal =
  | "instrument-clash"
  | "hands-cross"
  | "bleeding"
  | "major-bleeding"
  | "bile-in-field"
  | "stones-spilled"
  | "field-obscured"
  | "field-clear"
  | "bleeding-controlled"
  | "specimen-detached"
  | "imaging-done"
  | "pressure-high";

export interface PortState {
  /** Port site id (= the port's id in ops). */
  site: string;
  role: "camera" | "working" | "assist";
  sizeMm: number;
  hand?: "left" | "right";
  instrument: InstrumentId | null;
  /** Where its instrument's tip last worked (patient frame), for shaft clashes. */
  tip: Vec3 | null;
}

export interface Retraction {
  port: string;
  /** Unit pull direction. */
  direction: Vec3;
  force: "gentle" | "firm" | "excessive";
}

export interface Injury {
  kind: InjuryKind;
  structure: string;
  at: number;
  /** Seen in the field (bile, bleeding) — an occluded duct is not until imaged. */
  visible: boolean;
  recognised: boolean;
  /** `major`: needs an open repair or a specialist; `minor`: manageable laparoscopically. */
  severity: "minor" | "major";
}

export interface SafetyPause {
  at: number;
  view: string;
  claims: Record<string, boolean>;
  /** What the field really showed for each criterion at the pause (hidden from the operator). */
  truth: Record<string, boolean>;
  /** Every criterion truly met. */
  achieved: boolean;
  /** `steps` count at the pause: a later dissection or change makes it stale. */
  step: number;
}

export interface Bleeding {
  source: string;
  severity: "ooze" | "brisk" | "major";
  controlled: boolean;
  /** Suctioned since it started (a brisk bleed can then be seen and controlled). */
  suctioned: boolean;
}

export interface ProcedureState {
  plan: string | null;
  ports: PortState[];
  insufflated: boolean;
  pressure: number;
  retractions: Record<string, Retraction>;
  /** Region id → dissection units done. */
  cleared: Record<string, number>;
  isolated: string[];
  /** Handle ("T1"…) → structure id, in the order the structures came into view. */
  handles: { handle: string; structure: string }[];
  /** Handle → what the operator named it. */
  claims: Record<string, string>;
  /** Structure id → clips applied. */
  clips: Record<string, number>;
  divided: string[];
  injuries: Injury[];
  bleeding: Bleeding[];
  spillage: { bile: boolean; stones: boolean; cleared: boolean };
  pauses: SafetyPause[];
  unsafe: { code: UnsafeCode; at: number; structure?: string }[];
  imaged: ("ioc" | "lap-us")[];
  specimen: "in-situ" | "detached" | "bagged" | "extracted";
  bailouts: Bailout[];
  inspected: boolean;
  closed: boolean;
  counters: { steps: number; exchanges: number; clashes: number; crossings: number; falseAlarms: number };
}

