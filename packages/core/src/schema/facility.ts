import { z } from "zod";
import { AppearanceSchema, CaseSettingSchema } from "./case.js";
import { CapabilitySchema, HexColorSchema, IdSchema, LocalizedTextSchema } from "./common.js";

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
    /** Live screen content rendered on parts named "screen". */
    screen: z.enum(["none", "vitals", "ecg", "xray", "ct", "pacs", "lab", "text", "logo"]).default("none"),
    /** Point light emitted by the equipment (surgical lights, lamps). */
    light: z
      .object({ color: HexColorSchema, intensity: z.number().min(0), distance: z.number().min(0), y: z.number() })
      .strict()
      .optional(),
    tags: z.array(z.string()).default([]),
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
  })
  .strict();

export const BuildingSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    rect: RectSchema,
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
] as const;
export const RoomKindSchema = z.enum(ROOM_KINDS);

export const RoomSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    kind: RoomKindSchema,
    building: IdSchema.optional(),
    rect: RectSchema,
    floor: IdSchema.optional(),
    /** Interior partition walls generated around the rect (only listed sides). */
    partitions: z
      .array(
        z
          .object({
            side: SideSchema,
            material: IdSchema.default("white"),
            base: IdSchema.default("teal"),
            height: z.number().positive().default(4),
            thickness: z.number().positive().default(0.35),
            openings: z.array(OpeningSchema.omit({ side: true })).default([]),
          })
          .strict(),
      )
      .default([]),
    sign: z.object({ text: LocalizedTextSchema, color: HexColorSchema.optional(), side: SideSchema.optional() }).strict().optional(),
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
    label: LocalizedTextSchema.optional(),
    /** Extra capabilities granted by this placement (e.g. a generic workstation configured as "lab"). */
    capabilities: z.array(CapabilitySchema).optional(),
  })
  .strict();
export type Placement = z.infer<typeof PlacementSchema>;

export const PatientSlotSchema = z
  .object({
    id: IdSchema,
    room: IdSchema,
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
    name: LocalizedTextSchema,
    room: IdSchema,
    x: z.number(),
    z: z.number(),
    rot: z.number().default(0),
    appearance: AppearanceSchema.partial().optional(),
    /** Ambient line when approached without an active case question. */
    greeting: LocalizedTextSchema.optional(),
  })
  .strict();

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
  })
  .strict();
export type FacilityDefinition = z.infer<typeof FacilitySchema>;
export type FacilityInput = z.input<typeof FacilitySchema>;
