import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Primitive schemas                                                   */
/* ------------------------------------------------------------------ */

/** Stable identifiers: letters, digits, dot, underscore, dash. Case sensitive. */
export const IdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "ids may contain letters, digits, '.', '_' and '-' and must start with a letter or digit");

export const LocaleTagSchema = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "expected a locale tag such as 'zh-CN' or 'en'");

export const LocalizedTextSchema = z.union([z.string(), z.record(LocaleTagSchema, z.string())]);
export const LocalizedListSchema = z.union([z.array(z.string()), z.record(LocaleTagSchema, z.array(z.string()))]);

export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb");

/* ------------------------------------------------------------------ */
/* Vital signs                                                         */
/* ------------------------------------------------------------------ */

/**
 * Numeric vital signs tracked by the physiology model.
 * Units: hr bpm, sbp/dbp mmHg, rr /min, spo2 %, temp °C, gcs 3-15,
 * glucose mmol/L (bedside capillary), etco2 mmHg, pain 0-10.
 */
export const VITAL_KEYS = ["hr", "sbp", "dbp", "rr", "spo2", "temp", "gcs", "glucose", "etco2", "pain"] as const;
export type VitalKey = (typeof VITAL_KEYS)[number];
export const VitalKeySchema = z.enum(VITAL_KEYS);

/** Cardiac rhythms the bedside monitor can draw. */
export const RHYTHMS = [
  "sinus",
  "sinus-tachycardia",
  "sinus-bradycardia",
  "atrial-fibrillation",
  "atrial-flutter",
  "svt",
  "ventricular-tachycardia",
  "ventricular-fibrillation",
  "asystole",
  "pea",
  "paced",
] as const;
export type Rhythm = (typeof RHYTHMS)[number];
export const RhythmSchema = z.enum(RHYTHMS);

/** ECG waveform morphology overlays (drawn on top of the rhythm). */
export const ECG_MORPHOLOGIES = ["normal", "st-elevation", "st-depression", "peaked-t", "wide-qrs", "low-voltage"] as const;
export type EcgMorphology = (typeof ECG_MORPHOLOGIES)[number];

export const VitalsSchema = z
  .object({
    hr: z.number().min(0).max(300),
    sbp: z.number().min(0).max(300),
    dbp: z.number().min(0).max(200),
    rr: z.number().min(0).max(80),
    spo2: z.number().min(0).max(100),
    temp: z.number().min(25).max(45),
    gcs: z.number().int().min(3).max(15).optional(),
    glucose: z.number().min(0).max(100).optional(),
    etco2: z.number().min(0).max(150).optional(),
    pain: z.number().min(0).max(10).optional(),
    rhythm: RhythmSchema.optional(),
    ecg: z.enum(ECG_MORPHOLOGIES).optional(),
  })
  .strict();
export type Vitals = z.infer<typeof VitalsSchema>;

/* ------------------------------------------------------------------ */
/* Procedure condition leaf (docs/PROCEDURE.md §6)                     */
/* ------------------------------------------------------------------ */

export const BailoutSchema = z.enum([
  "call-help",
  "subtotal-fenestrating",
  "subtotal-reconstituting",
  "convert-open",
  "abandon-refer",
]);
export type Bailout = z.infer<typeof BailoutSchema>;

export const ImagingSchema = z.enum(["ioc", "lap-us"]);

export const InjuryKindSchema = z.enum([
  "bile-duct-injury",
  "vascular-injury",
  "bleeding",
  "perforation",
  "thermal-injury",
  "bile-leak",
]);
export type InjuryKind = z.infer<typeof InjuryKindSchema>;

/**
 * Unsafe acts the engine records whatever their outcome (docs/PROCEDURE.md §6). An unsafe act is not an
 * injury: clipping the right duct without a documented view is still unsafe.
 */
export const UnsafeCodeSchema = z.enum([
  "irreversible-without-pause",
  "irreversible-without-view",
  "irreversible-on-unidentified",
  "irreversible-on-misidentified",
  "blind-in-obscured-field",
  "energy-near-hidden-hazard",
  "excessive-traction",
  "continued-after-injury",
  "insufflation-over-max",
  "dissection-beyond-safe-plane",
]);
export type UnsafeCode = z.infer<typeof UnsafeCodeSchema>;

const Range = { gte: z.number().optional(), lte: z.number().optional() };

export const ProcedurePredicateSchema = z.union([
  z.object({ view: IdSchema }).strict(),
  z.object({ criterion: IdSchema }).strict(),
  /** A safety pause documented `documented`; `valid`: every criterion claimed true and truly met. */
  z.object({ documented: IdSchema, valid: z.boolean().optional() }).strict(),
  z.object({ injury: z.union([InjuryKindSchema, z.literal("any")]), recognised: z.boolean().optional() }).strict(),
  z.object({ unsafe: z.union([UnsafeCodeSchema, z.literal("any")]) }).strict(),
  z.object({ clipped: IdSchema, minCount: z.number().int().min(1).optional() }).strict(),
  z.object({ divided: IdSchema }).strict(),
  z.object({ isolated: IdSchema }).strict(),
  /** The operator named a structure (`as` absent: identified it correctly). */
  z.object({ identified: IdSchema, as: IdSchema.optional() }).strict(),
  z.object({ specimen: z.enum(["in-situ", "detached", "bagged", "extracted"]) }).strict(),
  z.object({ bailout: z.union([BailoutSchema, z.literal("any")]) }).strict(),
  z.object({ imaged: ImagingSchema }).strict(),
  z.object({ plan: IdSchema }).strict(),
  z.object({ insufflated: z.boolean(), pressure: z.object(Range).strict().optional() }).strict(),
  z.object({ bleeding: z.enum(["any", "ooze", "brisk", "major"]), controlled: z.boolean().optional() }).strict(),
  z.object({ spillage: z.enum(["bile", "stones"]), cleared: z.boolean().optional() }).strict(),
  z.object({ counter: z.enum(["steps", "exchanges", "clashes", "crossings"]), ...Range }).strict(),
  z.object({ inspected: z.boolean() }).strict(),
  /** The region was dissected while its exposure was at least `atLeast` (the best exposure of any dissection step there). */
  z.object({ dissectedExposed: IdSchema, atLeast: z.number().min(0).max(1) }).strict(),
  z.object({ closed: z.boolean() }).strict(),
  /** The session's anatomical variant is this one (`reference`: the base definition). Hidden truth: for rubric `scoredWhen` and gates. */
  z.object({ variant: IdSchema }).strict(),
]);
export type ProcedurePredicate = z.infer<typeof ProcedurePredicateSchema>;

/* ------------------------------------------------------------------ */
/* Condition DSL                                                       */
/* ------------------------------------------------------------------ */

/**
 * Declarative predicates over a session's state. Used by objectives,
 * decisions (`requires`), waypoints, physiology trends/events,
 * intervention appropriateness and rubric items.
 *
 * Every leaf references ids declared elsewhere in the same case; the case
 * validator checks referential integrity.
 */
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { always: boolean }
  /** History item asked by the learner (or disclosed by the patient agent). */
  | { asked: string }
  /** Physical-exam finding performed. */
  | { examined: string }
  /** Investigation ordered; `phase` restricts to orders placed in that phase. */
  | { ordered: string; phase?: string }
  /** Investigation result read; `phase` restricts to the result for that phase. */
  | { read: string; phase?: string }
  /** Investigation result available (ordered and turnaround elapsed) but not necessarily read. */
  | { resultReady: string; phase?: string }
  /** Decision answered correctly. */
  | { decided: string }
  /** Decision answered at least once (correct or not). */
  | { attempted: string }
  /**
   * Decision answered correctly on the learner's first (accepted) attempt.
   * Once the first attempt is wrong this stays false for the rest of the
   * session — intended for rubric items, not for objectives or `requires`.
   */
  | { decidedFirstTry: string }
  /** Intervention given at least `minCount` times (default 1). */
  | { intervened: string; minCount?: number }
  /** Current case phase equals. */
  | { phase: string }
  /** Scenario flag set (by interventions, events or `flag` actions). */
  | { flag: string }
  /** Objective completed. */
  | { objective: string }
  /** Current value of a vital sign compared to `value`. */
  | { vital: VitalKey; op: "lt" | "lte" | "gt" | "gte" | "eq"; value: number }
  /** Simulated minutes elapsed since the case started. */
  | { elapsed: { gte?: number; lte?: number } }
  /** Number of hints used. */
  | { hints: { gte?: number; lte?: number } }
  | { procedure: ProcedurePredicate };

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(ConditionSchema) }).strict(),
    z.object({ any: z.array(ConditionSchema) }).strict(),
    z.object({ not: ConditionSchema }).strict(),
    z.object({ always: z.boolean() }).strict(),
    z.object({ asked: IdSchema }).strict(),
    z.object({ examined: IdSchema }).strict(),
    z.object({ ordered: IdSchema, phase: IdSchema.optional() }).strict(),
    z.object({ read: IdSchema, phase: IdSchema.optional() }).strict(),
    z.object({ resultReady: IdSchema, phase: IdSchema.optional() }).strict(),
    z.object({ decided: IdSchema }).strict(),
    z.object({ attempted: IdSchema }).strict(),
    z.object({ decidedFirstTry: IdSchema }).strict(),
    z.object({ intervened: IdSchema, minCount: z.number().int().min(1).optional() }).strict(),
    z.object({ phase: IdSchema }).strict(),
    z.object({ flag: IdSchema }).strict(),
    z.object({ objective: IdSchema }).strict(),
    z.object({ vital: VitalKeySchema, op: z.enum(["lt", "lte", "gt", "gte", "eq"]), value: z.number() }).strict(),
    z.object({ elapsed: z.object({ gte: z.number().optional(), lte: z.number().optional() }).strict() }).strict(),
    z.object({ hints: z.object({ gte: z.number().optional(), lte: z.number().optional() }).strict() }).strict(),
    /** The operative field (case `procedure`, docs/PROCEDURE.md §6). */
    z.object({ procedure: ProcedurePredicateSchema }).strict(),
  ]),
);

/* ------------------------------------------------------------------ */
/* Capabilities vocabulary                                             */
/* ------------------------------------------------------------------ */

/**
 * Controlled vocabulary linking what a case needs (investigations,
 * exam maneuvers, interventions) with what facility equipment provides.
 * Content may introduce new capability strings (the validator warns but
 * does not fail) — prefer these canonical ones.
 */
export const CAPABILITIES = {
  // Laboratory
  "lab-hematology": "Complete blood count, smear, coagulation",
  "lab-chemistry": "Electrolytes, renal/liver function, enzymes, lipids, troponin",
  "lab-blood-gas": "Arterial/venous blood gas, lactate",
  "lab-serology": "Viral serology, antibodies, hepatitis panels",
  "lab-microbiology": "Cultures, gram stain, rapid antigen/PCR tests",
  "lab-urinalysis": "Urinalysis, urine ketones, pregnancy test",
  "lab-endocrine": "Hormones, HbA1c, ketones",
  "flow-cytometry": "Immunophenotyping by flow cytometry",
  "point-of-care": "Bedside glucose, ketones, troponin, hemoglobin",
  // Imaging
  "xray": "Plain radiography",
  "ct": "Computed tomography (incl. contrast)",
  "mri": "Magnetic resonance imaging",
  "ultrasound": "Diagnostic ultrasound / POCUS",
  "pet-ct": "PET/CT",
  "fluoroscopy": "Fluoroscopy / angiography / cath lab",
  "echocardiography": "Echocardiography",
  // Pathology / genetics
  "histopathology": "Biopsy processing, histology, immunohistochemistry",
  "cytology": "Cytology, bone marrow aspirate morphology",
  "cytogenetics": "Karyotype, FISH",
  "molecular": "Molecular / gene mutation testing",
  // Bedside diagnostics & monitoring
  "ecg-12lead": "12-lead ECG",
  "cardiac-monitor": "Continuous ECG, NIBP, SpO2 monitoring",
  "capnography": "End-tidal CO2 monitoring",
  "stethoscope": "Auscultation",
  "otoscope": "Otoscopy / fundoscopy",
  "reflex-hammer": "Neurological reflex exam",
  "thermometer": "Temperature measurement",
  "scale": "Weight / height measurement",
  "peak-flow": "Peak expiratory flow measurement",
  // Therapy & resuscitation
  "oxygen": "Oxygen delivery (nasal cannula, mask, NRB)",
  "suction": "Airway suction",
  "airway": "Advanced airway equipment, intubation",
  "ventilator": "Mechanical ventilation (an ICU ventilator; also provides NIV)",
  "niv": "Non-invasive ventilation (CPAP / BiPAP), at the bedside",
  "nebulizer": "Nebulised medication delivery",
  "iv-access": "Peripheral IV access, infusions",
  "infusion-pump": "Controlled infusions (insulin, vasopressors, heparin)",
  "defibrillator": "Defibrillation, cardioversion, transcutaneous pacing",
  "crash-cart": "Resuscitation drugs and equipment",
  "medications": "Medication dispensing",
  "blood-bank": "Blood products",
  "surgery": "Operating theatre",
  "anesthesia": "Anaesthesia machine",
  "endoscopy": "Endoscopy suite",
  "dialysis": "Haemodialysis",
  // Teaching & records
  "anatomy-atlas": "3D anatomical reference",
  "evidence-board": "Case conference / decision board",
  "records": "Electronic health record terminal",
  "crafting": "Garden crafting bench (game mechanic)",
} as const;
export type CanonicalCapability = keyof typeof CAPABILITIES;
export const CapabilitySchema = z.string().min(1).max(60);

/* ------------------------------------------------------------------ */
/* Room kinds (facilities; a case destination names one)               */
/* ------------------------------------------------------------------ */

export const ROOM_KINDS = [
  "entrance",
  "reception",
  "waiting",
  "consult",
  "triage",
  "resus",
  "emergency",
  "ward",
  "icu",
  "operating-room",
  "imaging",
  "laboratory",
  "pathology",
  "pharmacy",
  "nurse-station",
  "conference",
  "office",
  "corridor",
  "storage",
  "restroom",
  "garden",
  "build-zone",
  "rehabilitation",
  "teaching",
  "elevator",
  "stairwell",
] as const;
export const RoomKindSchema = z.enum(ROOM_KINDS);

/* ------------------------------------------------------------------ */
/* Assets                                                              */
/* ------------------------------------------------------------------ */

export const AssetRefSchema = z
  .object({
    id: IdSchema,
    kind: z.enum(["image", "pdf", "model", "audio", "video"]),
    /** Path relative to the case/facility directory (e.g. "assets/fig3.png") or an absolute URL. */
    path: z.string().min(1),
    title: LocalizedTextSchema.optional(),
    credit: LocalizedTextSchema.optional(),
    license: z.string().optional(),
    /**
     * Local-only assets are never committed or redistributed (copyrighted
     * figures, source PDFs). They are installed on the learner's machine via
     * `clinicalcraft import-v4` or `clinicalcraft assets add`. The UI shows a
     * placeholder until they exist.
     */
    localOnly: z.boolean().default(false),
    sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  })
  .strict();
export type AssetRef = z.infer<typeof AssetRefSchema>;

/** Capabilities every learner carries (no equipment needed). */
export const PERSONAL_KIT = ["stethoscope", "thermometer", "reflex-hammer", "otoscope"] as const;
