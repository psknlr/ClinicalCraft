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
                /** Holds while this region's exposure is below `below` (traction in the wrong direction). */
                exposure: IdSchema.optional(),
                /** Holds while this region is cleared to less than `below` (a structure only dissection resolves). */
                cleared: IdSchema.optional(),
                below: z.number().min(0).max(1),
                text: LocalizedTextSchema,
                /** While this holds the structure appears to enter this organ (counts against "only two structures"). */
                appearsToEnter: IdSchema.optional(),
              })
              .strict()
              .refine((w) => (w.exposure == null) !== (w.cleared == null), { message: "an appearance rule tests exactly one of `exposure` and `cleared`" }),
          )
          .default([]),
      })
      .strict()
      .optional(),
    /**
     * A duct or vessel that crosses this region's plane (a subvesical duct in the gallbladder bed, a
     * posterior cystic artery branch): completing the region's dissection divides it, as `divide` would,
     * unless it was divided before.
     */
    crosses: IdSchema.optional(),
    /** Node name of the structure in the case's anatomy model (GLB), when it has one. */
    mesh: z.string().optional(),
    provenance: ProvenanceTagSchema,
    note: LocalizedTextSchema.optional(),
  })
  .strict();
export type Structure = z.infer<typeof StructureSchema>;

/** A named pull direction in the patient frame, or a vector. Named directions combine ("cephalad", "patient-left"). */
export const DirectionNameSchema = z.enum(["cephalad", "caudal", "patient-left", "patient-right", "anterior", "posterior"]);
/** A named direction in the patient's terms (a traction's pull, a direction read out). */
export type DirectionName = z.infer<typeof DirectionNameSchema>;
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
    /**
     * Dense fibrosis (severe or chronic inflammation): the planes stop separating at `safeTo` of the
     * region. The step that reaches it stops there and is felt (`dense-fibrosis`); every step beyond is
     * unsafe and tears `injures` (default: the region's first hazard). `finding` is what the operator
     * sees once dissection there has begun.
     */
    fibrosis: z
      .object({
        safeTo: z.number().gt(0).lt(1),
        injures: IdSchema.optional(),
        finding: LocalizedTextSchema,
      })
      .strict()
      .optional(),
  })
  .strict();
export type Region = z.infer<typeof RegionSchema>;

/** A change to one of the base definition's regions (a variant cannot add regions: the operator's list stays the same). */
export const RegionPatchSchema = RegionSchema.partial().required({ id: true });
export type RegionPatch = z.infer<typeof RegionPatchSchema>;

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
  /**
   * Exactly the structures that truly enter `organ` are isolated, and nothing else appears to enter it. With
   * `count` (the usual number, 2 for the gallbladder), the operator reports at the safety pause how many structures
   * they see entering (a number claim; `true` means `count`): a report is right only when it is the true number —
   * so in anatomy with a third structure, "two and only two" is not credited and "three" is.
   */
  z.object({ onlyEntering: IdSchema, count: z.number().int().min(1).max(9).optional() }).strict(),
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

/**
 * An anatomical variant of the procedure (docs/PROCEDURE.md §9): what the patient's anatomy really is
 * in this session, chosen at `start` and never shown to the operator. It overlays the base definition:
 * `anatomy` replaces structures with the same id or adds new ones, `remove` drops structures, `regions`
 * patch the base regions (none can be added), `stones` overrides. Variants are counterfactual teaching
 * and benchmark material unless their provenance says otherwise.
 */
export const ProcedureVariantSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** What differs and why it matters (debrief and facilitator text; never shown to the operator). */
    summary: LocalizedTextSchema,
    provenance: ProvenanceTagSchema,
    /** Sources describing the variant (its existence and its surgical significance; not its frequency in this patient). */
    references: z.array(z.string().min(1).max(400)).max(8).default([]),
    anatomy: z.array(StructureSchema).default([]),
    remove: z.array(IdSchema).default([]),
    regions: z.array(RegionPatchSchema).default([]),
    stones: z.boolean().optional(),
  })
  .strict();
export type ProcedureVariant = z.infer<typeof ProcedureVariantSchema>;

/** The variant id that names the base definition itself (no variant). */
export const BASE_VARIANT = "reference" as const;

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
    /** Anatomical variants a session may be started with (`start {variant}`); the base definition is `reference`. */
    variants: z.array(ProcedureVariantSchema).default([]),
    note: LocalizedTextSchema.optional(),
  })
  .strict();
export type ProcedureDefinition = z.infer<typeof ProcedureDefinitionSchema>;

/* ------------------------------------------------------------------ */
/* Operations (the `operate` action's `op`)                            */
/* ------------------------------------------------------------------ */



/** Handles name what the operator sees ("T1", "T2"…) — never the anatomy, which is hidden state. */
export const HandleSchema = z.string().regex(/^T\d+$/);

/** How close the laparoscope looks (`zoom`): the wide view shows the whole field, a close one only where it is aimed. */
export const ZoomLevelSchema = z.enum(["wide", "close"]);
export type ZoomLevel = z.infer<typeof ZoomLevelSchema>;

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
  /**
   * Pass the instrument in `port` — and the traction it holds — to a colleague (`to`: their staff id), or take it
   * back (no `to`, or `surgeon`). Done by the one who holds it or the one who takes it — a colleague takes a port only
   * from the operator or from a colleague handing it over themselves, and holds at most two; while a colleague holds a
   * port, only they work it (retract, release, withdraw, suction, irrigate, the camera's steps). Withdrawn before the
   * hand-over, the traction falls.
   */
  z.object({ op: z.literal("hand-over"), port: IdSchema, to: z.string().min(1).max(80).optional() }).strict(),
  /**
   * Point the laparoscope in the camera port at a region (`at`: a region id) or back at the whole field (no `at`) —
   * the camera holder's step, or the operator's while nobody holds the camera port (docs/PROCEDURE.md §3).
   */
  z.object({ op: z.literal("aim"), port: IdSchema, at: IdSchema.optional() }).strict(),
  /** Bring the laparoscope closer to what it is aimed at, or back to the wide view (a close view needs an aim). */
  z.object({ op: z.literal("zoom"), port: IdSchema, level: ZoomLevelSchema }).strict(),
  /**
   * Put an instrument from the table into the hand of the one who will insert it (`to`: their staff id; absent, or
   * `surgeon`: the operator) — a colleague's step (the scrub nurse's). It waits until that one inserts it.
   */
  z.object({ op: z.literal("pass"), instrument: InstrumentIdSchema, to: z.string().min(1).max(80).optional() }).strict(),
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
  z.object({ op: z.literal("safety-pause"), view: IdSchema, claims: z.record(IdSchema, z.union([z.boolean(), z.number().int().min(0).max(9)])) }).strict(),
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
  /**
   * A change of approach or a call for help. Asked twice, it is refused (no second effect, no second minute). A
   * different subtotal technique once one is committed needs `revise: true` (the earlier one is superseded, kept in
   * the record).
   */
  z.object({ op: z.literal("bailout"), strategy: BailoutSchema, revise: z.boolean().optional() }).strict(),
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
  | "pressure-high"
  /** The planes have stopped separating: dense fibrosis (further dissection there tears what lies in it). */
  | "dense-fibrosis"
  /** Traction let go (released, withdrawn, exchanged): a region being dissected fell below half exposure. */
  | "exposure-lost"
  /** The operator worked in a region the camera is not aimed at: the step is off the picture's centre. */
  | "off-view";

/**
 * Why the operative field refused a step, for a front-end to say in the learner's own language with the people's names
 * (`RefusalReason.key`; docs/PROCEDURE.md §3) — the engine's English `message` stays as it is:
 * - `operator-only` {op, actor}: a step only the operator does;
 * - `port-held` {holder, instrument, port}: a colleague holds the port; `not-handed` {port, actor}: the port is the
 *   operator's, never handed to the actor;
 * - `take-from-colleague` {holder, instrument, port}: the colleague who holds it hands it over themselves;
 * - `hands-full` {who, ports}: a colleague holds two ports already;
 * - `needs-control` {who, control, op, instrument, port}: a control the colleague does not hold (`control` `operate`:
 *   an instrument only the operator works);
 * - `unknown-member` {who}: a `to` who is not in the team as it is; `member-absent` {who}: an actor or a `to` the
 *   encounter's team scenario makes absent — away, they take no part;
 * - `holds-already` {who, instrument, port} and `not-a-party` {instrument, port}: a hand-over to the one who has it,
 *   or by someone who neither holds nor takes it;
 * - `port-occupied` {port, instrument} and `port-role` {port, role, instrument}: a colleague puts an instrument only
 *   into an empty port of its kind (the laparoscope into a camera port, a grasper or the suction into an assist port);
 * - `camera-port` {port, role}: the camera's steps are worked from the camera port; `aim-first` {port}: a close view
 *   needs an aim; `unknown-port` {port}, `no-instrument` {port}, `instrument-cannot` {instrument, op, port},
 *   `field-closed` {} (no pneumoperitoneum or no laparoscope), `no-picture` {} (the camera or the light source is not
 *   working) and `unknown-region` {region}: the camera's steps refused as any step on a port is;
 * - `colleague-only` {op}: a step the operator leaves to a colleague (a pass); `not-on-table` {instrument}: a pass
 *   of what is not on the instrument table; `pass-self` {who, instrument}; `pass-waiting` {instrument, to}: passed
 *   already, waiting to go in; `pass-first` {instrument, to}: in the scrub nurse's place every instrument is passed
 *   before it goes in (`to` empty: the operator).
 */
export const FIELD_REFUSALS = [
  "operator-only",
  "port-held",
  "not-handed",
  "take-from-colleague",
  "hands-full",
  "needs-control",
  "unknown-member",
  "member-absent",
  "holds-already",
  "not-a-party",
  "port-occupied",
  "port-role",
  "camera-port",
  "aim-first",
  "unknown-port",
  "no-instrument",
  "instrument-cannot",
  "field-closed",
  "no-picture",
  "unknown-region",
  "colleague-only",
  "not-on-table",
  "pass-self",
  "pass-waiting",
  "pass-first",
] as const;
export type FieldRefusal = (typeof FIELD_REFUSALS)[number];

/** A refusal's reason in words a front-end localises (`key`, with `params` — staff ids, ports, instruments, ops). */
export interface RefusalReason {
  key: string;
  params: Record<string, string>;
}

export interface PortState {
  /** Port site id (= the port's id in ops). */
  site: string;
  role: "camera" | "working" | "assist";
  sizeMm: number;
  hand?: "left" | "right";
  instrument: InstrumentId | null;
  /** Where its instrument's tip last worked (patient frame), for shaft clashes. */
  tip: Vec3 | null;
  /** A colleague who holds its instrument (a staff id: the assistant keeping traction, the camera holder); absent: the operator. */
  holder?: string;
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
  /** The operator said it aloud (`recognise` with no actor): what the gates and `continued-after-injury` read. */
  recognised: boolean;
  /** `major`: needs an open repair or a specialist; `minor`: manageable laparoscopically. */
  severity: "minor" | "major";
  /** The colleague whose step caused it (a staff id: excessive traction by an assistant); absent: the operator's. */
  by?: string;
  /**
   * The colleague who said it aloud before anyone else did (anyone in the room may); absent: nobody, or the operator
   * first. It credits nobody else: `recognised` stays the operator's own word.
   */
  recognisedBy?: string;
}

/** What a `recognise` names aloud. */
export type SaidInjury = Extract<ProcedureOp, { op: "recognise" }>["injury"];

/** The camera's view (`aim`, `zoom`): the region it is aimed at (null: the whole field) and how close it looks. */
export interface CameraView {
  at: string | null;
  zoom: ZoomLevel;
}

/** An instrument passed into a hand and waiting to go in (`pass`): `to` the one who will insert it (absent: the operator), `by` who passed it. */
export interface PassedInstrument {
  instrument: InstrumentId;
  to?: string;
  by: string;
}

export interface SafetyPause {
  at: number;
  view: string;
  /** Per criterion: holds (true/false), or for a counting criterion how many structures the operator sees entering. */
  claims: Record<string, boolean | number>;
  /** Counting criteria: how many structures truly enter the organ (hidden from the operator). */
  entering?: Record<string, number>;
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

/**
 * What the operation's equipment supplies now (docs/PROCEDURE.md "Equipment"): `image` — a working camera and light
 * source (no picture without both), `gas` — a working insufflator (no pneumoperitoneum without it). Absent: both, as
 * in a facility that does not model the equipment.
 */
export interface ProcedureSupply {
  image: boolean;
  gas: boolean;
}

/** The capabilities each supply needs from the equipment in the patient's room (all of them, from any in-service device). */
export const PROCEDURE_SUPPLY: Readonly<Record<keyof ProcedureSupply, readonly string[]>> = {
  image: ["endoscopic-camera", "light-source"],
  gas: ["insufflator"],
};

export interface ProcedureState {
  plan: string | null;
  ports: PortState[];
  insufflated: boolean;
  pressure: number;
  /** What the equipment supplies (absent: everything). */
  supply?: ProcedureSupply;
  retractions: Record<string, Retraction>;
  /** Region id → dissection units done. */
  cleared: Record<string, number>;
  /** Region id → the best exposure at which it was dissected (latched: the record outlives the retraction). */
  exposedMax: Record<string, number>;
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
  /** `by`: the colleague whose step it was (a staff id); absent: the operator's. */
  unsafe: { code: UnsafeCode; at: number; structure?: string; by?: string }[];
  imaged: ("ioc" | "lap-us")[];
  specimen: "in-situ" | "detached" | "bagged" | "extracted";
  bailouts: Bailout[];
  /** Subtotal techniques superseded by an explicit revision (absent until one). */
  superseded?: Bailout[];
  inspected: boolean;
  closed: boolean;
  /**
   * The camera's view (`aim`, `zoom`): absent until the first of them — the whole field, as always — and dropped when
   * the laparoscope leaves the camera port (withdrawn, exchanged, a conversion, the close).
   */
  camera?: CameraView;
  /** The region of the operator's last tissue step (dissect, isolate, clip, divide, coagulate); absent before the first. */
  working?: string;
  /** Instruments passed and waiting to go in (`pass`), in order; an insert by the one they were passed to takes one. Absent: none. */
  passed?: PassedInstrument[];
  /** The `ref` of every accepted `operate` action that carried one, in order (informational, never read by a rule; absent until the first). */
  refs?: string[];
  /**
   * A colleague's false alarms, in order: an injury they said aloud that the field does not have (`by` their staff id,
   * `at` the clock); absent: none. The operator's own are counted in `counters.falseAlarms`.
   */
  colleagueFalseAlarms?: { injury: SaidInjury; by: string; at: number }[];
  /**
   * `colleague`: the steps a colleague did themselves (absent: none) — the operator's are `steps - colleague`;
   * `offView`: the operator's tissue steps in a region the camera was not aimed at (absent: none). Crossed hands and
   * false alarms count the operator's own steps only.
   */
  counters: { steps: number; exchanges: number; clashes: number; crossings: number; falseAlarms: number; colleague?: number; offView?: number };
}

