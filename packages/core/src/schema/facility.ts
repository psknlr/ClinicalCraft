import { z } from "zod";
import { AppearanceSchema, CaseSettingSchema } from "./case.js";
import { CapabilitySchema, ConditionSchema, COUNT_STAGES, HexColorSchema, IdSchema, LocalizedTextSchema, RoomKindSchema } from "./common.js";
import { StaffPositionSchema, SurgicalControlSchema } from "./positions.js";

// The positions, places and controls (a leaf module: see positions.ts) — re-exported for every existing import.
export * from "./positions.js";

/**
 * Virtual environment — facilities, rooms, equipment and materials.
 *
 * World units: 1 unit = 1 voxel block = 1 metre. +Y is up. The player is
 * 1.78 units tall (V4 physics). Rotation `rot` is in degrees about +Y and
 * must be a multiple of 90 for colliders to stay axis-aligned.
 */

export const FACILITY_SCHEMA_ID = "clinicalcraft/facility@1" as const;
export const EQUIPMENT_SCHEMA_ID = "clinicalcraft/equipment-catalog@1" as const;

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

export const MaterialSchema = z
  .object({
    id: IdSchema,
    color: HexColorSchema,
    /** Procedural 16×16 pixel texture pattern (V4 style). */
    pattern: z.enum(["noise", "brick", "plank", "tile", "flat", "stripe", "grid", "dots", "screen"]).default("noise"),
    /** Brightness variance of the noise pattern (V4 default 0.11). */
    variance: z.number().min(0).max(0.5).default(0.11),
    emissive: HexColorSchema.optional(),
    emissiveIntensity: z.number().min(0).max(5).default(0.3),
    opacity: z.number().min(0).max(1).default(1),
    roughness: z.number().min(0).max(1).default(0.93),
    metalness: z.number().min(0).max(1).default(0),
    /** Excluded from shadow casting (floors, glass, water). */
    castShadow: z.boolean().default(true),
  })
  .strict();
export type MaterialDef = z.infer<typeof MaterialSchema>;

/* ------------------------------------------------------------------ */
/* Equipment                                                           */
/* ------------------------------------------------------------------ */

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

/** One box of a voxel model, relative to the equipment origin (floor centre). `p` is the box centre. */
export const VoxelPartSchema = z
  .object({
    m: IdSchema,
    p: Vec3,
    s: Vec3,
    /** Extra rotation about Y in degrees (any angle; cosmetic only). */
    r: z.number().optional(),
    /** Named sub-part: "screen" parts receive live canvas textures; "door"/"lid" may animate. */
    name: z.string().optional(),
    anim: z.enum(["none", "blink", "spin", "pulse", "slide"]).default("none"),
  })
  .strict();
export type VoxelPart = z.infer<typeof VoxelPartSchema>;

export const EQUIPMENT_CATEGORIES = [
  "imaging",
  "laboratory",
  "pathology",
  "monitoring",
  "resuscitation",
  "therapy",
  "surgery",
  "furniture",
  "computing",
  "teaching",
  "sanitation",
  "storage",
  "outdoor",
  "structure",
  "decor",
] as const;

/* ------------------------------------------------------------------ */
/* Embodiment: actor roles, device behaviours, models                  */
/* (docs/EMBODIED.md §3, §8; mirrored by @clinicalcraft/world)         */
/* ------------------------------------------------------------------ */

/** Roles of embodied actors: the learner's avatar (`clinician`) and the facility staff roles. */
export const ACTOR_ROLES = ["clinician", "nurse", "radiologist", "pathologist", "lab-tech", "attending", "pharmacist", "receptionist", "paramedic", "porter"] as const;
export const ActorRoleSchema = z.enum(ACTOR_ROLES);
export type ActorRole = z.infer<typeof ActorRoleSchema>;

/**
 * World predicates — preconditions of device operations (and skill pre/post
 * conditions). Distances in metres from footprints:
 * `actorWithin` the acting actor is within N m of this device;
 * `patientWithin` the acting actor is within N m of the bound patient;
 * `deviceAtBedside` this device stands within the bedside radius of the patient;
 * `actorHolding` the actor holds an item (entity id or equipment type id);
 * `state` the device is in one of these behaviour states;
 * `role` the actor has one of these roles; `handsClean` hand hygiene is valid;
 * `nearbyState` another in-service device of equipment type `type`, on the same
 * level within `within` m of this device (footprint to footprint, default
 * `NEARBY_STATE_RANGE`), is in one of `state` — equipment that depends on
 * equipment (an electrosurgical unit fires only with the smoke evacuator
 * running; a C-arm screens only with its lead shield in place).
 */
export type WorldPredicate =
  | { actorWithin: number }
  | { patientWithin: number }
  | { deviceAtBedside: true }
  | { actorHolding: string }
  | { state: string | string[] }
  | { role: ActorRole[] }
  | { handsClean: true }
  | { nearbyState: { type: string; state: string | string[]; within?: number } }
  | { all: WorldPredicate[] }
  | { any: WorldPredicate[] }
  | { not: WorldPredicate };

/** Default range (m, footprint to footprint, same level) of a `nearbyState` predicate: the bedside radius. */
export const NEARBY_STATE_RANGE = 6;

export const WorldPredicateSchema: z.ZodType<WorldPredicate> = z.lazy(() =>
  z.union([
    z.object({ actorWithin: z.number().positive() }).strict(),
    z.object({ patientWithin: z.number().positive() }).strict(),
    z.object({ deviceAtBedside: z.literal(true) }).strict(),
    z.object({ actorHolding: z.string().min(1) }).strict(),
    z.object({ state: z.union([IdSchema, z.array(IdSchema).min(1)]) }).strict(),
    z.object({ role: z.array(ActorRoleSchema).min(1) }).strict(),
    z.object({ handsClean: z.literal(true) }).strict(),
    z
      .object({
        nearbyState: z.object({ type: IdSchema, state: z.union([IdSchema, z.array(IdSchema).min(1)]), within: z.number().positive().max(20).optional() }).strict(),
      })
      .strict(),
    z.object({ all: z.array(WorldPredicateSchema) }).strict(),
    z.object({ any: z.array(WorldPredicateSchema) }).strict(),
    z.object({ not: WorldPredicateSchema }).strict(),
  ]),
);

/**
 * The clinical side of a device operation: a clinical tool run through the
 * session's normal tool path (hooks → precheck → approval → engine).
 * `select`: the case item comes from an operation parameter (`param`), is
 * the first case item whose `requires` this device provides (`capability`),
 * or is the case's monitoring intervention (`monitoring`).
 */
/**
 * The steps of a `surgical_count` effect (its `item`; docs/TEAM.md §4.3): the baseline before incision, a count at
 * a stage, an RF scan of the patient, an escalation of a discrepancy. The session records them from the world.
 */
export const COUNT_EFFECT_STEPS = ["baseline", ...COUNT_STAGES, "scan", "escalate"] as const;
/** The operative steps a device's operation may be (`ClinicalEffect.tool: "operate"`): its gas controls. */
export const DEVICE_OPERATIVE_STEPS = ["insufflate", "desufflate"] as const;

export const ClinicalEffectSchema = z
  .object({
    /**
     * `surgical_count`: an entry of the case's count record (a count board, an RF wand), `item` naming the step.
     * `operate`: a step of the operation itself, `item` naming it (`insufflate` — at the procedure's usual pressure,
     * or the operation's `pressure` parameter — or `desufflate`): a laparoscopy tower's gas controls are the
     * operation's own pneumoperitoneum, so the device, the record and the field never disagree.
     */
    tool: z.enum(["order_test", "read_result", "intervene", "check_vitals", "examine", "surgical_count", "operate"]),
    /** `item`: the case item with id `item` (a WHO board's `sign_in` → the case's `sign-in`; a count's step). */
    select: z.enum(["param", "capability", "monitoring", "item"]),
    item: IdSchema.optional(),
  })
  .strict()
  .refine((e) => (e.select === "item") === (e.item != null), { message: "`item` names the case item exactly when `select` is \"item\"" })
  .refine((e) => e.tool !== "surgical_count" || (e.select === "item" && (COUNT_EFFECT_STEPS as readonly string[]).includes(e.item ?? "")), {
    message: `a surgical_count effect names its step: select "item", item one of ${COUNT_EFFECT_STEPS.join(", ")}`,
  })
  .refine((e) => e.tool !== "operate" || (e.select === "item" && (DEVICE_OPERATIVE_STEPS as readonly string[]).includes(e.item ?? "")), {
    message: `an operate effect names its step: select "item", item one of ${DEVICE_OPERATIVE_STEPS.join(", ")}`,
  });
export type ClinicalEffect = z.infer<typeof ClinicalEffectSchema>;

/** One operation of a device behaviour (offered in the `from` states; `to` = state after success). */
export const BehaviorOperationSchema = z
  .object({
    name: LocalizedTextSchema,
    /** States the operation is offered in ("*" = any). */
    from: z.union([z.array(IdSchema).min(1), z.literal("*")]),
    /** State after success (omit: unchanged). */
    to: IdSchema.optional(),
    requires: z.array(WorldPredicateSchema).optional(),
    clinical: ClinicalEffectSchema.optional(),
    /** Simulated seconds the operation takes. */
    durationSeconds: z.number().min(0).optional(),
    /** Reserve the device for the acting actor (released by an operation with `release`). */
    reserve: z.boolean().optional(),
    release: z.boolean().optional(),
    /** Roles allowed (default: everyone). */
    roles: z.array(ActorRoleSchema).min(1).optional(),
    /**
     * The surgical control the operation is part of (docs/TEAM.md §1: `retract` for a grasp, `instruments` for loading
     * a needle): the world refuses it to a body that does not hold the control, right after `roles`
     * (docs/EMBODIED.md §8.2). Tag a theatre operation only when everyone who should do it holds that control.
     */
    control: SurgicalControlSchema.optional(),
  })
  .strict();
export type BehaviorOperation = z.infer<typeof BehaviorOperationSchema>;

/** What the parts named "screen" can show (an equipment type's `screen`; a state's look may change it). */
export const SCREEN_KINDS = ["none", "vitals", "ecg", "xray", "ct", "pacs", "lab", "text", "logo", "thoracoscopy"] as const;
/** The screens that are a picture drawn once — what a state's look may switch between (`vitals` and `ecg` are the patient's own, live). */
export const STATIC_SCREEN_KINDS = ["none", "xray", "ct", "pacs", "lab", "text", "logo", "thoracoscopy"] as const;

/** How a manikin is covered when it lies on its side, and whether its chest moves (`EquipmentManikinSchema`). */
export const MANIKIN_COVERS = ["clothes", "blanket", "drapes"] as const;
export const MANIKIN_BREATHING = ["none", "both", "one-lung"] as const;

/** A layer of a model: lower-case letters, digits, `_` and `-` — a node of the GLB named `layer:<id>` (docs/BLENDER.md). */
export const LayerIdSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, "a layer id is lower-case letters, digits, '_' and '-', and starts with a letter or digit");

/**
 * What a state changes of the type's `manikin` (a state's look): the body turned or covered differently, awake
 * or asleep, breathing or not. What it leaves out stays as the type says.
 */
export const ManikinLookSchema = z
  .object({
    posture: z.enum(["standing", "sitting", "lying", "lateral"]).optional(),
    sideUp: z.enum(["left", "right"]).optional(),
    cover: z.enum(MANIKIN_COVERS).optional(),
    flex: z.number().min(0).max(25).optional(),
    asleep: z.boolean().optional(),
    breathing: z.enum(MANIKIN_BREATHING).optional(),
  })
  .strict();
export type ManikinLook = z.infer<typeof ManikinLookSchema>;

/**
 * What is drawn of the equipment while it is in a state (docs/FACILITIES.md "A look for each state"): which
 * layers of its model show, what its screens show, how its manikin is. Visual only, and it decides nothing: the
 * state does — whoever brought it about, a learner, a colleague or an agent, through the same operation — and
 * the look follows the state.
 */
export const StateLookSchema = z
  .object({
    /**
     * The layers of the type's model drawn in this state (nodes of the GLB named `layer:<id>`: docs/BLENDER.md).
     * Every other layer is hidden; what belongs to no layer is always drawn. Omitted: no layer.
     */
    layers: z.array(LayerIdSchema).optional(),
    /** What the parts named "screen" show in this state (omitted: the type's `screen`). A picture drawn once, or `none`: dark. */
    screen: z.enum(STATIC_SCREEN_KINDS).optional(),
    /** What this state changes of the type's `manikin`. */
    manikin: ManikinLookSchema.optional(),
  })
  .strict();
export type StateLook = z.infer<typeof StateLookSchema>;

/**
 * Declarative device state machine (no code). States that mirror a clinical
 * fact are `derived` from the engine and never stored (EMBODIED R6):
 * `monitor-attachment` — "attached"/"detached" follow `monitorAttached(case, state)`.
 */
export const DeviceBehaviorSchema = z
  .object({
    initial: IdSchema,
    states: z.record(
      IdSchema,
      z
        .object({
          name: LocalizedTextSchema.optional(),
          available: z.boolean().optional(),
          /** `derived: "case-record"`: the device is in this state while the condition holds (the last listed that holds wins). */
          when: ConditionSchema.optional(),
          /**
           * The device's capabilities that work in this state (omit: all of them). A laparoscopy tower `off`
           * supplies none — no picture, no gas — and powered on supplies its camera, light source and insufflator;
           * the world's capability rule (bedside providers, the operation's equipment) follows it.
           */
          supplies: z.array(CapabilitySchema).optional(),
          /** What is drawn of the equipment in this state (omitted: the type as it is, none of its model's layers). */
          look: StateLookSchema.optional(),
        })
        .strict(),
    ),
    operations: z.record(IdSchema, BehaviorOperationSchema),
    /**
     * `case-record` (a WHO checklist board): in a case that defines every item its operations' clinical effects
     * name (`select: "item"`), the state is derived from the case record — the last state whose `when` holds, else
     * `initial` — and an operation's only effect is its clinical act, through the session's tool path (validation,
     * scope, approvals, the spatial gate); the board follows the record whoever made the entry. In a case without
     * those items the device keeps its own state machine and its operations are physical.
     */
    derived: z.enum(["monitor-attachment", "case-record"]).optional(),
  })
  .strict();
export type DeviceBehavior = z.infer<typeof DeviceBehaviorSchema>;

/**
 * Use status of a model file (docs/ASSETS.md "Sources and use status"):
 * `cleared` — its licence allows redistribution and the use intended (attribution
 * and other conditions recorded); `research-only` — non-commercial or research
 * terms: keep it local, out of commits and published builds; `pending` — licence,
 * release or third-party parts not yet checked: `assets inspect` fails.
 */
export const MODEL_USE = ["cleared", "research-only", "pending"] as const;
export type ModelUse = (typeof MODEL_USE)[number];

/** Where a model file came from: enough to find the exact release again and to credit it. */
export const ModelSourceSchema = z
  .object({
    /** Project, dataset, author or tool (e.g. "Poly Haven", "SurgeryCraft tools/blender"). */
    name: z.string().min(1),
    /** Page, download URL or DOI of the exact release. */
    url: z.string().min(1).optional(),
    /** Release, version or commit. */
    version: z.string().min(1).optional(),
    /** Date the file was retrieved or built (YYYY-MM-DD). */
    retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD").optional(),
    /** What was changed from the source (re-meshed, rescaled, parts split, materials…). */
    changes: z.string().min(1).optional(),
  })
  .strict();
export type ModelSource = z.infer<typeof ModelSourceSchema>;

/**
 * Optional GLB/glTF model of an equipment type — visual only: the voxel
 * parts stay the fallback, the collider is always the semantic footprint
 * and a model is never interactive by itself. Named `screen` parts keep
 * drawing their display over the model.
 */
export const EquipmentModelSchema = z
  .object({
    /** Relative path or URL of a `.glb` / `.gltf` file. */
    uri: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/, "expected a lowercase hex SHA-256").optional(),
    /** Uniform scale or [x, y, z]. */
    scale: z.union([z.number().positive(), Vec3]).optional(),
    /** Local offset (m) from the footprint centre on the floor, rotated with the placement. */
    offset: Vec3.optional(),
    /** Extra rotation about Y (degrees). */
    rot: z.number().optional(),
    /** SPDX id or licence text. */
    license: z.string().min(1),
    attribution: LocalizedTextSchema.optional(),
    /** Provenance of the file. */
    source: ModelSourceSchema.optional(),
    /** Use status (`MODEL_USE`); `assets inspect` notes a reference without one. */
    use: z.enum(MODEL_USE).optional(),
  })
  .strict();
export type EquipmentModel = z.infer<typeof EquipmentModelSchema>;

/**
 * A body drawn with the equipment — the patient simulator of a training station, a manikin on a trolley. It is
 * one of the world's own figures (the people of the world are drawn the same way) and it is nobody: not an actor
 * of the world model, no record, nothing to examine or to talk to. Visual only, like a model: the footprint stays
 * the collider and the aim finds the equipment (docs/FACILITIES.md "A body drawn with equipment").
 */
export const EquipmentManikinSchema = z
  .object({
    /**
     * How it is placed: `standing`, `sitting`, `lying` on its back — or `lateral`: on its side as for an operation
     * on the chest (the arm underneath out in front on its board, the upper arm forward on a support, the leg
     * underneath bent at hip and knee).
     */
    posture: z.enum(["standing", "sitting", "lying", "lateral"]),
    /** `lateral`: the side that is up — the side operated on (default `left`). */
    sideUp: z.enum(["left", "right"]).optional(),
    /**
     * `lateral`: what covers it. `clothes` (default): what its appearance says — its own clothes, or a hospital
     * gown. `blanket`: undressed, a theatre cap over the hair, a blanket to the waist — on the table before the
     * field is prepared. `drapes`: undressed and draped for an operation on the side of the chest that is up —
     * the theatre cap, towels round the field, a sheet over the hips and the legs.
     */
    cover: z.enum(MANIKIN_COVERS).optional(),
    /** The earlier spelling of `cover: "drapes"` (kept for catalogs written with it). */
    draped: z.boolean().optional(),
    /**
     * Whether its chest moves: `none` (omitted: none), `both` — it breathes, or is ventilated — or `one-lung`: on
     * its side with only the lung underneath ventilated, the side that is up all but still. (No default is filled
     * in: a catalog written before it reads back as it was written.)
     */
    breathing: z.enum(MANIKIN_BREATHING).optional(),
    /**
     * `lateral`: how far each half of a flexed table goes down from the break under the chest (degrees): the trunk
     * bends sideways over it, as it does on the table.
     */
    flex: z.number().min(0).max(25).default(0),
    /** Eyes shut (anaesthetised; a simulator at rest). */
    asleep: z.boolean().default(false),
    /**
     * Where it is, in the type's frame (m from the footprint centre on the floor, rotated with the placement): the
     * feet of one standing or sitting; the middle of what one lying on its back lies on; of one on its side, the
     * middle of the table under the chest (where a flexed table breaks).
     */
    x: z.number().default(0),
    z: z.number().default(0),
    /** Height (m above the placement's floor) of what it stands on, of the seat or of the surface it lies on. */
    y: z.number().min(0).default(0),
    /** Turned about the vertical (degrees) as a placement is: at 0 one standing or sitting faces +Z, the head of one lying is towards −Z. */
    rot: z.number().default(0),
    /** Its looks (default: an adult of average build). */
    appearance: AppearanceSchema.partial().optional(),
  })
  .strict()
  .refine((m) => m.posture === "lateral" || (m.sideUp === undefined && !m.draped && m.cover === undefined && m.flex === 0 && m.breathing !== "one-lung"), {
    message: "`sideUp`, `cover` (`draped`), `flex` and `breathing: \"one-lung\"` describe a manikin on its side (`posture: \"lateral\"`)",
  })
  .refine((m) => m.cover === undefined || m.draped === undefined || m.draped === (m.cover === "drapes"), { message: "`draped` is the earlier spelling of `cover: \"drapes\"`: say one, or the same with both" });
export type EquipmentManikin = z.infer<typeof EquipmentManikinSchema>;

/** How a manikin on its side is covered: its `cover`, or what the earlier `draped` said (`clothes` when neither does). */
export function manikinCover(m: Pick<EquipmentManikin, "cover" | "draped">): (typeof MANIKIN_COVERS)[number] {
  return m.cover ?? (m.draped ? "drapes" : "clothes");
}

/**
 * Default interaction reach (m from the footprint) by interaction kind, used
 * when an equipment type has no `reach` (`talk`: staff conversation; patients
 * use the contact range 1.5).
 */
export const DEFAULT_REACH = {
  workstation: 1.2,
  monitor: 2,
  bed: 1.5,
  device: 1.2,
  atlas: 1.5,
  board: 2.5,
  craft: 1.2,
  door: 1.2,
  sink: 1,
  storage: 1,
  talk: 2,
  none: 1,
} as const;

export const EquipmentTypeSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    category: z.enum(EQUIPMENT_CATEGORIES),
    description: LocalizedTextSchema,
    /** How a clinician uses it — shown when inspecting, given to agents as tool docs. */
    usage: LocalizedTextSchema.optional(),
    capabilities: z.array(CapabilitySchema).default([]),
    /** Axis-aligned footprint in units before rotation (w along X, d along Z, h up). */
    footprint: z.object({ w: z.number().positive(), d: z.number().positive(), h: z.number().positive() }).strict(),
    /** Blocks player movement (collider = footprint). */
    solid: z.boolean().default(true),
    parts: z.array(VoxelPartSchema).min(1),
    interaction: z
      .object({
        kind: z.enum(["workstation", "monitor", "bed", "device", "atlas", "board", "craft", "door", "sink", "storage", "none"]),
        /** Hint shown when aimed at (e.g. "E · 调阅检查"). */
        prompt: LocalizedTextSchema.optional(),
      })
      .strict()
      .default({ kind: "none" }),
    /**
     * What is shown on the parts named "screen": the patient's live `vitals` / `ecg`, or a representative picture of
     * what the equipment is for (`xray`, `ct`, `pacs`, `lab`, `text`, `logo`, `thoracoscopy` — the round field of a
     * rigid scope in the chest). A representative picture is never a patient's own finding.
     */
    screen: z.enum(SCREEN_KINDS).default("none"),
    /** Point light emitted by the equipment (surgical lights, lamps). */
    light: z
      .object({ color: HexColorSchema, intensity: z.number().min(0), distance: z.number().min(0), y: z.number() })
      .strict()
      .optional(),
    tags: z.array(z.string()).default([]),
    /** Can be moved: `cart` (wheeled to another spot) or `handheld` (carried by an actor). Absent: fixed. */
    portable: z.enum(["cart", "handheld"]).optional(),
    /** Interaction reach in metres from the footprint (default per interaction kind, @clinicalcraft/world `DEFAULT_REACH`). */
    reach: z.number().positive().max(10).optional(),
    /** Where an actor stands to use it: local offsets from the footprint centre (rotated with the placement). Absent: any free spot within reach. */
    interactionPoints: z.array(z.object({ x: z.number(), z: z.number() }).strict()).min(1).optional(),
    /** Declarative device state machine (EMBODIED §8). */
    behavior: DeviceBehaviorSchema.optional(),
    /** Optional GLB/glTF model (visual only). */
    model: EquipmentModelSchema.optional(),
    /** A body drawn with the equipment by the world's figure kit (visual only): a patient simulator, a manikin. */
    manikin: EquipmentManikinSchema.optional(),
  })
  .strict();
export type EquipmentType = z.infer<typeof EquipmentTypeSchema>;

export const EquipmentCatalogSchema = z
  .object({
    schema: z.literal(EQUIPMENT_SCHEMA_ID),
    id: IdSchema,
    name: LocalizedTextSchema,
    materials: z.array(MaterialSchema).default([]),
    equipment: z.array(EquipmentTypeSchema).default([]),
  })
  .strict();
export type EquipmentCatalog = z.infer<typeof EquipmentCatalogSchema>;

/* ------------------------------------------------------------------ */
/* Facility layout                                                     */
/* ------------------------------------------------------------------ */

export const RectSchema = z.object({ x: z.number(), z: z.number(), w: z.number().positive(), d: z.number().positive() }).strict();
export type Rect = z.infer<typeof RectSchema>;

export const SideSchema = z.enum(["n", "s", "e", "w"]);

export const OpeningSchema = z
  .object({
    side: SideSchema,
    /** Offset of the opening centre from the wall's centre, along the wall. */
    offset: z.number().default(0),
    width: z.number().positive().default(2),
    height: z.number().positive().default(3),
    kind: z.enum(["opening", "door", "double-door", "sliding-door", "window"]).default("opening"),
    /** Window sill height (windows only). */
    sill: z.number().min(0).default(1),
    /**
     * Building openings only: the levels this opening exists on (default:
     * every level the building spans — e.g. an entrance door only on the
     * ground floor, windows on every storey). Ignored on room partitions.
     */
    levels: z.array(IdSchema).min(1).optional(),
  })
  .strict();

export const WallStyleSchema = z
  .object({
    height: z.number().positive().default(5),
    /** Materials by course: base (row 0), body, top (last row). V4: teal / cream / wood. */
    base: IdSchema.default("teal"),
    body: IdSchema.default("cream"),
    top: IdSchema.default("wood"),
    thickness: z.number().positive().default(1),
    /** Window frames (default: the base material). */
    frame: IdSchema.optional(),
    /** Mullions of windows ≥ 2.5 m wide, one every 1.5 m (default: "wood" when the library has it — V4 —, else the frame). */
    mullion: IdSchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Levels, connectors, access zones (EMBODIED R10; all optional)       */
/* ------------------------------------------------------------------ */

/** Id of the implicit single level of a facility without `levels`. */
export const DEFAULT_LEVEL_ID = "L0" as const;

/**
 * A storey. `floor` (buildings, rooms) is the floor *material*; storeys are
 * `level`s. A facility without `levels` has one implicit level "L0" at
 * elevation 0; entities without `level` stand on the default level (the one
 * at elevation 0, else the first listed).
 */
export const LevelSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** Floor elevation (m); the ground level is 0. */
    elevation: z.number().default(0),
    /** Storey height (m). */
    height: z.number().positive().default(5),
  })
  .strict();
export type Level = z.infer<typeof LevelSchema>;

export const CONNECTOR_KINDS = ["stairs", "elevator", "ramp"] as const;

/** Stairs, an elevator or a ramp between levels (a portal of the navigation graph). */
export const ConnectorSchema = z
  .object({
    id: IdSchema,
    kind: z.enum(CONNECTOR_KINDS),
    name: LocalizedTextSchema,
    /** Where it is entered/left on each level it serves (≥ 2; listed in travel order, e.g. bottom to top). */
    stops: z.array(z.object({ level: IdSchema, x: z.number(), z: z.number() }).strict()).min(2),
    /** Seconds between adjacent stops (default by kind: stairs 15, ramp 10, elevator 20). */
    travelSeconds: z.number().min(0).optional(),
    /**
     * Stairs and ramps: width (m) of the walkable flight between consecutive
     * stops (default 2). Consecutive stops are the foot and the head of a
     * straight, axis-aligned flight whose surface rises from the lower stop's
     * level to the upper stop's; stops at one x/z make a navigation-only
     * connector (no flight). Elevators: ignored (the cabin is a room).
     */
    width: z.number().positive().max(10).optional(),
    /** Usable with a wheelchair, bed or cart (default: elevators and ramps yes, stairs no). */
    accessible: z.boolean().optional(),
    /** Roles allowed to use it (empty = everyone). */
    roles: z.array(ActorRoleSchema).default([]),
  })
  .strict();
export type Connector = z.infer<typeof ConnectorSchema>;

/** A restricted area: only the listed roles may enter it (others cannot plan through it). */
export const AccessZoneSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    level: IdSchema.optional(),
    rect: RectSchema,
    roles: z.array(ActorRoleSchema).min(1),
  })
  .strict();
export type AccessZone = z.infer<typeof AccessZoneSchema>;

export const BuildingSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    rect: RectSchema,
    /** Levels the building spans (default: the default level only). Walls and openings repeat on each. */
    levels: z.array(IdSchema).min(1).optional(),
    floor: IdSchema.default("floor"),
    walls: WallStyleSchema.default({}),
    openings: z.array(OpeningSchema).default([]),
    roof: z
      .object({
        material: IdSchema.default("roof"),
        /** Glass skylights (rects in world coordinates). */
        skylights: z.array(RectSchema).default([]),
        beams: IdSchema.optional(),
      })
      .strict()
      .default({}),
    sign: z.object({ text: LocalizedTextSchema, side: SideSchema, color: HexColorSchema.optional() }).strict().optional(),
  })
  .strict();


/** One interior partition wall of a room side (with its openings, offsets along the wall from its centre). */
export const RoomPartitionSchema = z
  .object({
    side: SideSchema,
    material: IdSchema.default("white"),
    base: IdSchema.default("teal"),
    height: z.number().positive().default(4),
    thickness: z.number().positive().default(0.35),
    openings: z.array(OpeningSchema.omit({ side: true, levels: true })).default([]),
  })
  .strict();
export type RoomPartition = z.infer<typeof RoomPartitionSchema>;

/** A room's wall sign (on the inside of `side`, default north). */
export const RoomSignSchema = z.object({ text: LocalizedTextSchema, color: HexColorSchema.optional(), side: SideSchema.optional() }).strict();

export const RoomSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    kind: RoomKindSchema,
    building: IdSchema.optional(),
    /** Level the room is on (default: the default level). */
    level: IdSchema.optional(),
    rect: RectSchema,
    floor: IdSchema.optional(),
    /** Interior partition walls generated around the rect (only listed sides). */
    partitions: z.array(RoomPartitionSchema).default([]),
    sign: RoomSignSchema.optional(),
    /** Ceiling lights (world x,z). */
    lights: z.array(z.object({ x: z.number(), z: z.number() }).strict()).default([]),
  })
  .strict();
export type Room = z.infer<typeof RoomSchema>;

export const PlacementSchema = z
  .object({
    id: IdSchema,
    type: IdSchema,
    x: z.number(),
    z: z.number(),
    y: z.number().default(0),
    rot: z.number().default(0),
    room: IdSchema.optional(),
    /** Level (default: the room's level, else the default level). */
    level: IdSchema.optional(),
    label: LocalizedTextSchema.optional(),
    /** Extra capabilities granted by this placement (e.g. a generic workstation configured as "lab"). */
    capabilities: z.array(CapabilitySchema).optional(),
    /**
     * Decorative voxel parts for this placement only — per-station details a
     * shared equipment type cannot express (V4: the lab workstation's test
     * tubes, the pathology station's microscope). Same frame as the type's
     * `parts`: relative to the placement origin (footprint centre on the
     * floor) and rotated with `rot`. Rendered after the type's parts and in
     * the same way (a part named "screen" shows the type's screen); they add
     * no collider (the type's footprint stays the collider) and should stay
     * inside the footprint. Unknown materials are `checkFacility` errors.
     */
    extraParts: z.array(VoxelPartSchema).optional(),
    /**
     * Indices into the equipment type's `parts` that this placement does not
     * render. With `extraParts` this moves or replaces type parts for one
     * placement (V4's pathology station draws the shared monitor 0.6 m to the
     * right). Out-of-range indices are `checkFacility` errors.
     */
    hideParts: z.array(z.number().int().min(0)).optional(),
    /**
     * The device's behaviour state at the start (default: its type's `initial`) — a theatre set up before the list
     * has its laparoscopy tower on and white-balanced, while the spare in the store is off. One of the type's states.
     */
    state: IdSchema.optional(),
  })
  .strict();
export type Placement = z.infer<typeof PlacementSchema>;

export const PatientSlotSchema = z
  .object({
    id: IdSchema,
    room: IdSchema,
    /** Level (default: the room's level). */
    level: IdSchema.optional(),
    x: z.number(),
    z: z.number(),
    rot: z.number().default(0),
    posture: z.enum(["standing", "sitting", "lying"]).default("standing"),
    /** Placement id of the bed/chair the patient occupies. */
    bed: IdSchema.optional(),
    /** Case settings this slot accepts (first slot accepting a case's setting wins). */
    accepts: z.array(CaseSettingSchema).min(1),
    /** Placement id of the bedside monitor showing this patient's vitals. */
    monitor: IdSchema.optional(),
  })
  .strict();


export const StaffSchema = z
  .object({
    id: IdSchema,
    role: z.enum(["nurse", "radiologist", "pathologist", "lab-tech", "attending", "pharmacist", "receptionist", "paramedic", "porter"]),
    /** The job they hold (default: from the case team's duties, else from `role`). */
    position: StaffPositionSchema.optional(),
    name: LocalizedTextSchema,
    room: IdSchema,
    /** Level (default: the room's level). */
    level: IdSchema.optional(),
    x: z.number(),
    z: z.number(),
    rot: z.number().default(0),
    appearance: AppearanceSchema.partial().optional(),
    /** Ambient line when approached without an active case question. */
    greeting: LocalizedTextSchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------ */
/* Room templates (EMBODIED R10: an authoring-time macro)              */
/* ------------------------------------------------------------------ */

export const ROOM_TEMPLATE_SCHEMA_ID = "clinicalcraft/room-template@1" as const;

/** Rotations a template instance may have (degrees about +Y; colliders stay axis-aligned). */
export const TEMPLATE_ROTATIONS = [0, 90, 180, 270] as const;

const LocalPointSchema = z.object({ x: z.number(), z: z.number() }).strict();

/** A placement in template-local coordinates (its `room` and `level` come from the instance). */
export const TemplatePlacementSchema = PlacementSchema.omit({ room: true, level: true });
/** A patient slot in template-local coordinates; `bed` / `monitor` name local placement ids. */
export const TemplateSlotSchema = PatientSlotSchema.omit({ room: true, level: true });
/** A staff member in template-local coordinates. */
export const TemplateStaffSchema = StaffSchema.omit({ room: true, level: true });

/**
 * An interaction zone of a template (template-local rect): an area only
 * the listed roles may enter — compiled into the facility's `access` zones
 * (the pharmacy's dispensary, the theatre's sterile field).
 */
export const TemplateZoneSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    rect: RectSchema,
    roles: z.array(ActorRoleSchema).min(1),
  })
  .strict();

/**
 * A reusable room (`clinicalcraft/room-template@1`): a rect of `size`
 * centred on the template origin with partitions, sign, ceiling lights,
 * equipment, patient slots, staff and interaction zones in template-local
 * coordinates (x along the width, z along the depth; by convention the
 * door is on the local south side, +Z). `capabilities` documents what the
 * room provides (checked against its equipment). A facility places
 * templates with `instances`; `compileFacility` expands them into the flat
 * facility format.
 */
export const RoomTemplateSchema = z
  .object({
    schema: z.literal(ROOM_TEMPLATE_SCHEMA_ID),
    id: IdSchema,
    name: LocalizedTextSchema,
    description: LocalizedTextSchema.optional(),
    kind: RoomKindSchema,
    /** Room size before rotation (w along local X, d along local Z). */
    size: z.object({ w: z.number().positive(), d: z.number().positive() }).strict(),
    floor: IdSchema.optional(),
    partitions: z.array(RoomPartitionSchema).default([]),
    sign: RoomSignSchema.optional(),
    /** Ceiling lights (template-local x, z). */
    lights: z.array(LocalPointSchema).default([]),
    placements: z.array(TemplatePlacementSchema).default([]),
    patientSlots: z.array(TemplateSlotSchema).default([]),
    staff: z.array(TemplateStaffSchema).default([]),
    zones: z.array(TemplateZoneSchema).default([]),
    /** Capabilities this room guarantees (documentation; `checkRoomTemplate` checks its equipment provides them). */
    capabilities: z.array(CapabilitySchema).default([]),
    tags: z.array(z.string()).default([]),
  })
  .strict();
export type RoomTemplate = z.infer<typeof RoomTemplateSchema>;
export type RoomTemplateInput = z.input<typeof RoomTemplateSchema>;

/** Per-instance changes to one template placement (template-local frame). */
const PlacementPatchSchema = TemplatePlacementSchema.omit({ id: true }).partial().strict();
/** Per-instance changes to one template patient slot. */
const SlotPatchSchema = z.object({ accepts: z.array(CaseSettingSchema).min(1).optional(), posture: z.enum(["standing", "sitting", "lying"]).optional() }).strict();
/** Per-instance changes to one template staff member. */
const StaffPatchSchema = z
  .object({ name: LocalizedTextSchema.optional(), role: StaffSchema.shape.role.optional(), position: StaffPositionSchema.optional(), greeting: LocalizedTextSchema.optional(), appearance: AppearanceSchema.partial().optional() })
  .strict();

/** What one instance changes in its template (local ids; template-local frame). */
export const TemplateOverridesSchema = z
  .object({
    /** Room name (default: the template's). */
    name: LocalizedTextSchema.optional(),
    floor: IdSchema.optional(),
    /** Replace the sign, or `null` for none. */
    sign: z.union([RoomSignSchema, z.null()]).optional(),
    /** Replace the template's partitions (local sides). */
    partitions: z.array(RoomPartitionSchema).optional(),
    /** Replace the template's ceiling lights (local x, z). */
    lights: z.array(LocalPointSchema).optional(),
    /** Local ids of placements, patient slots, staff or zones to leave out. */
    omit: z.array(IdSchema).optional(),
    placements: z.record(IdSchema, PlacementPatchSchema).optional(),
    patientSlots: z.record(IdSchema, SlotPatchSchema).optional(),
    staff: z.record(IdSchema, StaffPatchSchema).optional(),
  })
  .strict();
export type TemplateOverrides = z.infer<typeof TemplateOverridesSchema>;

/**
 * A room template placed in a facility: its origin at (x, z), rotated by
 * `rot` (0, 90, 180 or 270°, three.js `rotation.y`: local +Z → (sin, cos)),
 * on `level`, in `building` (default: the building containing the origin on
 * that level). Compiled ids are `${id}.${localId}`; the room's id is `id`.
 */
export const TemplateInstanceSchema = z
  .object({
    id: IdSchema,
    template: IdSchema,
    x: z.number(),
    z: z.number(),
    rot: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
    level: IdSchema.optional(),
    building: IdSchema.optional(),
    overrides: TemplateOverridesSchema.optional(),
  })
  .strict();
export type TemplateInstance = z.infer<typeof TemplateInstanceSchema>;

export const TerrainSchema = z
  .object({
    ground: IdSchema.default("grass"),
    /** Paths / plazas painted on the ground (material per rect). */
    paths: z.array(RectSchema.extend({ material: IdSchema.default("path") })).default([]),
    ponds: z.array(RectSchema).default([]),
    trees: z.array(z.object({ x: z.number(), z: z.number(), h: z.number().int().min(2).max(9) }).strict()).default([]),
    flowers: z
      .object({ count: z.number().int().min(0).max(500), seed: z.number().int().default(7103), exclude: z.array(RectSchema).default([]) })
      .strict()
      .default({ count: 0, seed: 7103, exclude: [] }),
    /** Ring of boulders/hills beyond the walkable area (V4 horizon). */
    horizon: z.object({ count: z.number().int().min(0).max(200), radius: z.number().positive() }).strict().optional(),
    clouds: z.number().int().min(0).max(60).default(14),
  })
  .strict();

export const FacilitySchema = z
  .object({
    schema: z.literal(FACILITY_SCHEMA_ID),
    id: IdSchema,
    name: LocalizedTextSchema,
    description: LocalizedTextSchema,
    /** Walkable bounds (player is clamped inside). */
    bounds: z.object({ minX: z.number(), maxX: z.number(), minZ: z.number(), maxZ: z.number() }).strict(),
    spawn: z.object({ x: z.number(), z: z.number(), yaw: z.number().default(0) }).strict(),
    environment: z
      .object({
        sky: HexColorSchema.default("#a8d5e0"),
        fog: z.object({ color: HexColorSchema, near: z.number(), far: z.number() }).strict().default({ color: "#b9d8d6", near: 38, far: 82 }),
        sunIntensity: z.number().min(0).default(3.4),
        hemisphere: z.object({ sky: HexColorSchema, ground: HexColorSchema, intensity: z.number() }).strict().optional(),
      })
      .strict()
      .default({}),
    /** Equipment catalog ids this facility uses (default: ["core"]). */
    catalogs: z.array(IdSchema).default(["core"]),
    /** Additional facility-local materials. */
    materials: z.array(MaterialSchema).default([]),
    terrain: TerrainSchema.default({}),
    buildings: z.array(BuildingSchema).default([]),
    rooms: z.array(RoomSchema).default([]),
    placements: z.array(PlacementSchema).default([]),
    patientSlots: z.array(PatientSlotSchema).default([]),
    staff: z.array(StaffSchema).default([]),
    signs: z
      .array(
        z
          .object({
            text: LocalizedTextSchema,
            x: z.number(),
            y: z.number(),
            z: z.number(),
            rot: z.number().default(0),
            width: z.number().positive().default(3),
            color: HexColorSchema.optional(),
            post: z.boolean().default(false),
          })
          .strict(),
      )
      .default([]),
    /** Free voxel building area (V4 garden). */
    buildZone: z
      .object({
        rect: RectSchema,
        maxHeight: z.number().int().positive().default(7),
        maxBlocks: z.number().int().positive().default(600),
        materials: z.array(IdSchema).default(["wood", "stone", "glass", "lamp"]),
        seedBlocks: z.array(z.object({ cell: z.tuple([z.number().int(), z.number().int(), z.number().int()]), type: IdSchema }).strict()).default([]),
      })
      .strict()
      .optional(),
    /** Region name lookup fallbacks when outside every room. */
    outdoorRegion: LocalizedTextSchema.default({ "zh-CN": "疗愈花园", en: "Healing Garden" }),
    /** Storeys (default []: one implicit level "L0" at elevation 0). */
    levels: z.array(LevelSchema).default([]),
    /** Stairs, elevators and ramps between levels. */
    connectors: z.array(ConnectorSchema).default([]),
    /** Restricted areas (roles). */
    access: z.array(AccessZoneSchema).default([]),
    /**
     * Room templates placed in this facility (`clinicalcraft/room-template@1`).
     * Front-ends compile them at load time (`compileFacility`) into rooms,
     * placements, patient slots, staff and access zones; a compiled facility
     * has none left and is indistinguishable from a hand-written one.
     */
    instances: z.array(TemplateInstanceSchema).default([]),
  })
  .strict();
export type FacilityDefinition = z.infer<typeof FacilitySchema>;
export type FacilityInput = z.input<typeof FacilitySchema>;
