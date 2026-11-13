import { z } from "zod";
import { CapabilitySchema, ConditionSchema, IdSchema, LocalizedListSchema, LocalizedTextSchema } from "./common.js";

/**
 * Prescriptions as versioned, executable records (docs/PRESCRIPTIONS.md).
 *
 * A case lists the prescriptions that can be written in it (`case.prescriptions`): the medicinal products a line can
 * name, with the dispensary's stock; the **formulations** a prescriber can sign, each with its lines as data (product,
 * dose, unit), route, frequency and duration; and the dispensary's review rules. What happens in an encounter is the
 * record (`SessionState.prescriptions`), changed only by the `prescription` action:
 *
 *   sign (version n, superseding n − 1) → review by the dispensary (a query, or confirmed) → the query read →
 *   a revision signed (version n + 1) … → prepared, picked, label checked and dispensed at the dispensing device
 *
 * Only the current version, once confirmed, is dispensed; every refused attempt (an earlier version, an unreviewed
 * one, a formulation that may not be signed yet) is recorded with its reason and nothing else changes. Requests are
 * idempotent by key: the same key again is the same version, the same supply.
 */

/** Kinds of things a dispensary's review can find, and a supply can get wrong. */
export const REVIEW_FINDING_KINDS = ["stock", "unit", "dose", "duplicate", "identity", "interaction", "history", "other"] as const;
export const ReviewFindingKindSchema = z.enum(REVIEW_FINDING_KINDS);
export type ReviewFindingKind = z.infer<typeof ReviewFindingKindSchema>;

/** The dispensary's stock of a product at the start of the encounter. */
export const ProductStockSchema = z
  .object({
    /** Quantity on hand, in the product's unit. */
    quantity: z.number().min(0),
    batch: z.string().min(1).max(40).optional(),
    /** Expiry as printed (free text: "2027-03"); `expired` says whether it has passed (the case has no calendar). */
    expiry: z.string().min(1).max(20).optional(),
    expired: z.boolean().optional(),
    /** What the dispensary says about it when it is short (when it is expected, what it could offer instead). */
    note: LocalizedTextSchema.optional(),
  })
  .strict();

/** A medicinal product: what a prescription line names and the dispensary picks. */
export const MedicinalProductSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    synonyms: LocalizedListSchema.default([]),
    /** Identity of a medicinal material: the part used ("herb", "root") and its processing form ("honey-fried"). */
    part: LocalizedTextSchema.optional(),
    processing: LocalizedTextSchema.optional(),
    /**
     * The product's regulatory class where the case is set, as that jurisdiction names it (Singapore: `CPM`, a
     * Chinese proprietary medicine; `TMM`, a traditional medicinal material). Free text: the engine only shows it.
     */
    class: z.string().min(1).max(40).optional(),
    /** The unit its doses and stock are counted in ("g", "sachet", "tablet", "mL"). */
    unit: z.string().min(1).max(20),
    /** The usual daily dose in `unit` (a line outside it is queried at review). */
    usualDose: z.tuple([z.number().min(0), z.number().positive()]).optional(),
    /** Stock on hand (absent: not tracked — never short). */
    stock: ProductStockSchema.optional(),
    /** Products it can be mistaken for (a look-alike, a sound-alike name): picking one for the other is an identity error. */
    confusedWith: z.array(IdSchema).default([]),
  })
  .strict();
export type MedicinalProduct = z.infer<typeof MedicinalProductSchema>;

/** One line of a formulation: a product and its daily dose. */
export const PrescriptionLineSchema = z
  .object({
    product: IdSchema,
    /** The dose **per day**, in `unit`. */
    dose: z.number().positive(),
    unit: z.string().min(1).max(20),
    /** What the line is for, or how it is prepared ("decocted first") — shown with the line. */
    note: LocalizedTextSchema.optional(),
  })
  .strict();
export type PrescriptionLine = z.infer<typeof PrescriptionLineSchema>;

/** A formulation a prescriber can sign as a version of the prescription. */
export const FormulationSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** What a learner may call it when prescribing in words (per locale). */
    aliases: LocalizedListSchema.default([]),
    /** How it is supplied. */
    form: z.enum(["decoction-pieces", "granules", "decoction", "proprietary", "topical", "other"]),
    route: z.enum(["oral", "topical", "inhaled", "other"]).default("oral"),
    /** How it is taken, as the label says it ("1 sachet twice daily after meals, in warm water"). */
    frequency: LocalizedTextSchema,
    dosesPerDay: z.number().int().min(1).max(24),
    days: z.number().int().min(1).max(365),
    lines: z.array(PrescriptionLineSchema).min(1).max(60),
    /**
     * When it may be signed (absent: whenever the encounter runs). While it does not hold the attempt is refused and
     * recorded — nothing is signed — and `refusal` says why.
     */
    signableWhen: ConditionSchema.optional(),
    refusal: LocalizedTextSchema.optional(),
  })
  .strict();
export type Formulation = z.infer<typeof FormulationSchema>;

/** A rule of the dispensary's review: a finding when it applies to the version under review. */
export const ReviewRuleSchema = z
  .object({
    id: IdSchema,
    kind: ReviewFindingKindSchema,
    /** It applies to a version with a line naming one of these products (absent: any version). */
    products: z.array(IdSchema).min(1).optional(),
    /** …at a daily dose of at least this, in the product's unit (needs `products`; absent: any dose). */
    minDose: z.number().positive().optional(),
    /** …and only to a version of one of these formulations (absent: any formulation). */
    formulations: z.array(IdSchema).min(1).optional(),
    /** …while this holds on the session at review (absent: always). */
    when: ConditionSchema.optional(),
    /** The query, in the dispensary's words. */
    text: LocalizedTextSchema,
  })
  .strict();
export type ReviewRule = z.infer<typeof ReviewRuleSchema>;

/**
 * What the dispensary supplies for a formulation when it is **not** what was signed — an authored execution
 * discrepancy (a label printed with another frequency, a look-alike picked): hidden state, found by checking the
 * supply against the version. Applies to the dispensary's own supply (`dispensedBy: "staff"`), never a learner's.
 */
export const SupplyDeviationSchema = z
  .object({
    formulation: IdSchema,
    /** It happens while this holds as the version is dispensed (absent: always). */
    when: ConditionSchema.optional(),
    /** The label as printed where it differs from the version. */
    label: z.object({ frequency: LocalizedTextSchema.optional(), dosesPerDay: z.number().int().min(1).max(24).optional(), days: z.number().int().min(1).max(365).optional() }).strict().optional(),
    /** Lines supplied with another product. */
    substitutions: z.array(z.object({ product: IdSchema, with: IdSchema }).strict()).default([]),
    /** Facilitator note (never shown to the learner). */
    summary: LocalizedTextSchema.optional(),
  })
  .strict();
export type SupplyDeviation = z.infer<typeof SupplyDeviationSchema>;

/** A prescription that can be written in the case. */
export const PrescriptionDefinitionSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    products: z.array(MedicinalProductSchema).min(1),
    formulations: z.array(FormulationSchema).min(1),
    /** Who reviews and supplies it: a staff id of the facility, or a role (default: a pharmacist). */
    dispensary: z.string().min(1).max(80).default("pharmacist"),
    /** Capabilities of the device it is dispensed at (a medication cabinet; a herb cabinet). */
    requires: z.array(CapabilitySchema).min(1).default(["medications"]),
    /**
     * Who works the dispensing device: `staff` — the dispensary's own staff, on their own (default); `learner` — the
     * learner (a dispensing skills station: select the version, pick each product, check the label, supply).
     */
    dispensedBy: z.enum(["staff", "learner"]).default("staff"),
    /** The dispensary's review rules, besides what it checks from the data itself (stock, units, doses, duplicates). */
    review: z.array(ReviewRuleSchema).default([]),
    /** Authored supply discrepancies (see `SupplyDeviationSchema`). */
    deviations: z.array(SupplyDeviationSchema).default([]),
  })
  .strict();
export type PrescriptionDefinition = z.infer<typeof PrescriptionDefinitionSchema>;

/* ------------------------------------------------------------------ */
/* The record                                                          */
/* ------------------------------------------------------------------ */

type Bi = { en: string; "zh-CN": string };

/** One finding of a review: its kind, the rule or the product it concerns, and the query in both languages. */
export interface ReviewFinding {
  kind: ReviewFindingKind;
  /** The authored rule (absent: found from the data — stock, unit, dose, duplicate). */
  rule?: string;
  product?: string;
  text: Bi;
}

/** A review of a version by the dispensary. No findings: confirmed. */
export interface PrescriptionReview {
  by: string;
  at: number;
  seq: number;
  findings: ReviewFinding[];
}

/** Where a version stands: signed and waiting for review, queried, confirmed, being prepared, dispensed — or superseded by a later one. */
export type VersionStatus = "submitted" | "queried" | "confirmed" | "preparing" | "dispensed" | "superseded";

/** One signed version of a prescription. */
export interface PrescriptionVersion {
  prescription: string;
  /** 1, 2, 3 … within its prescription. */
  n: number;
  formulation: string;
  key: string;
  by: string;
  at: number;
  seq: number;
  /** The version that replaced it (absent: it is the current one). */
  supersededBy?: number;
  /** Its reviews, oldest first (the last one stands). */
  reviews: PrescriptionReview[];
  /** When the prescriber read its latest review. */
  acknowledged?: { by: string; at: number; seq: number };
}

/** One line as it was supplied. */
export interface SuppliedLine {
  /** The product the version's line names. */
  line: string;
  /** The product actually picked. */
  product: string;
  batch?: string;
  quantity: number;
  unit: string;
}

/** What a supply got wrong against its version. */
export interface SupplyDiscrepancy {
  kind: "identity" | "omitted" | "label" | "expired" | "label-unchecked";
  line?: string;
  detail: Bi;
}

/** A supply being put together at the device (a learner's, step by step). */
export interface Preparation {
  prescription: string;
  version: number;
  by: string;
  device?: string;
  at: number;
  seq: number;
  /** Line (the prescribed product) → the product picked. */
  picks: Record<string, string>;
  labelChecked?: { at: number; seq: number; matches: boolean };
}

/** A completed supply of one version. */
export interface Dispensing {
  prescription: string;
  version: number;
  key: string;
  by: string;
  device?: string;
  at: number;
  seq: number;
  lines: SuppliedLine[];
  /** The label as printed. */
  label: { frequency: Bi; dosesPerDay: number; days: number };
  labelChecked: boolean;
  discrepancies: SupplyDiscrepancy[];
  /** When the prescriber read the record of this supply (what was supplied, the label as printed, how it differs). */
  read?: { by: string; at: number; seq: number };
}

/** An attempt the engine refused for a clinical reason: recorded, nothing else changed. */
export interface PrescriptionRefusal {
  prescription: string;
  op: "submit" | "prepare" | "pick" | "dispense";
  formulation?: string;
  version?: number;
  code: "not-signable" | "not-current" | "not-reviewed" | "queried" | "already-dispensed" | "not-prepared" | "unknown-line" | "unknown-product" | "out-of-stock";
  reason: string;
  by: string;
  at: number;
  seq: number;
}

/** The encounter's prescriptions. */
export interface PrescriptionRecord {
  versions: PrescriptionVersion[];
  preparations: Preparation[];
  dispensings: Dispensing[];
  refusals: PrescriptionRefusal[];
  /** Stock on hand by product id, for the products that track it (reduced by each supply). */
  stock: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

const Who = z.string().trim().min(1).max(80);
const Key = z.string().min(1).max(120);

/**
 * The prescription actions (`ClinicalAction` `prescription`):
 * - `submit` — sign a formulation as the next version (idempotent by `key`);
 * - `review` — the dispensary reviews a version: the engine computes the findings from the data and the rules;
 * - `acknowledge` — the prescriber has read the prescription's record: the latest review of the version named and
 *   every supply made so far (what was supplied, the label as printed);
 * - `prepare` — a supply of a version is started at the device (default: the current version);
 * - `pick` — a product is picked for a line (no `line`: every remaining line as prescribed);
 * - `check-label` — the label is checked against the version;
 * - `dispense` — the supply is completed (idempotent by `key`). With no preparation open it is the dispensary's whole
 *   act: prepared, picked as prescribed, the label checked.
 */
export const PrescriptionOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("submit"), prescription: IdSchema, formulation: IdSchema, key: Key, by: Who }).strict(),
  z.object({ op: z.literal("review"), prescription: IdSchema, version: z.number().int().min(1), by: Who }).strict(),
  z.object({ op: z.literal("acknowledge"), prescription: IdSchema, version: z.number().int().min(1), by: Who }).strict(),
  z.object({ op: z.literal("prepare"), prescription: IdSchema, version: z.number().int().min(1).optional(), by: Who, device: z.string().max(120).optional() }).strict(),
  z.object({ op: z.literal("pick"), prescription: IdSchema, line: IdSchema.optional(), product: IdSchema.optional(), by: Who }).strict(),
  z.object({ op: z.literal("check-label"), prescription: IdSchema, by: Who }).strict(),
  z.object({ op: z.literal("dispense"), prescription: IdSchema, version: z.number().int().min(1).optional(), key: Key, by: Who, device: z.string().max(120).optional() }).strict(),
]);
export type PrescriptionOp = z.infer<typeof PrescriptionOpSchema>;

/** The dispensing steps a device operation may be (`ClinicalEffect.tool: "dispense"`, `item` naming the step). */
export const DISPENSING_STEPS = ["prepare", "pick", "check-label", "dispense"] as const;
export type DispensingStep = (typeof DISPENSING_STEPS)[number];
