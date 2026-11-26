import { z } from "zod";

/**
 * A tongue as inspection describes it, and a tongue image as it was captured (docs/STUDIES.md §8): the vocabulary a
 * tongue-capture study computes its observations in, an authored record states a captured photograph in, and the
 * engine draws its picture from (`engine/tongue.ts`). The words are those of tongue inspection in Chinese medicine
 * (舌质: colour and shape of the body; 舌苔: colour, thickness, texture and distribution of the coating).
 */

/** 舌色 — pale 淡白, pale-red 淡红 (the healthy colour), red 红, crimson 绛, purple 紫, bluish 青. */
export const TONGUE_BODY_COLORS = ["pale", "pale-red", "red", "crimson", "purple", "bluish"] as const;
/** 舌形 — enlarged 胖大, thin 瘦薄, teeth-marked 齿痕, cracked 裂纹, prickles 芒刺, stasis spots 瘀点. */
export const TONGUE_SHAPES = ["enlarged", "thin", "teeth-marked", "cracked", "prickles", "stasis-spots"] as const;
/** 苔色 — white 白, pale yellow 淡黄, yellow 黄, brown (焦黄 — or a stain), grey 灰, black 黑. */
export const COATING_COLORS = ["white", "pale-yellow", "yellow", "brown", "grey", "black"] as const;
/** 苔之厚薄 — none 无苔 (peeled), thin 薄, thick 厚. */
export const COATING_THICKNESSES = ["none", "thin", "thick"] as const;
/** 苔质 — moist 润, dry 燥, slippery 滑, greasy 腻, curdy 腐. */
export const COATING_TEXTURES = ["moist", "dry", "slippery", "greasy", "curdy"] as const;
/** Where the coating lies — the whole surface, the centre, the root, or in patches (花剥). */
export const COATING_DISTRIBUTIONS = ["full", "center", "root", "patchy"] as const;
/** The light a picture is taken in: a station's standard light, daylight, warm or cool room light, or too little. */
export const CAPTURE_LIGHTS = ["standard", "daylight", "warm", "cool", "dim"] as const;

export const TongueCoatingSchema = z
  .object({
    color: z.enum(COATING_COLORS),
    thickness: z.enum(COATING_THICKNESSES),
    texture: z.enum(COATING_TEXTURES).default("moist"),
    distribution: z.enum(COATING_DISTRIBUTIONS).default("full"),
  })
  .strict();
export type TongueCoating = z.infer<typeof TongueCoatingSchema>;

/** What a tongue looks like. */
export const TongueAppearanceSchema = z
  .object({
    body: z.enum(TONGUE_BODY_COLORS),
    shape: z.array(z.enum(TONGUE_SHAPES)).default([]),
    coating: TongueCoatingSchema,
    /** 舌下络脉 — seen with the tongue lifted; described, not drawn (the picture is the dorsal view). */
    sublingual: z.enum(["normal", "engorged"]).optional(),
  })
  .strict();
export type TongueAppearance = z.infer<typeof TongueAppearanceSchema>;

/** Part of an appearance: what a later state, or something lying on the tongue, changes of it. */
export const TongueAppearancePatchSchema = z
  .object({
    body: z.enum(TONGUE_BODY_COLORS).optional(),
    shape: z.array(z.enum(TONGUE_SHAPES)).optional(),
    coating: TongueCoatingSchema.partial().strict().optional(),
    sublingual: z.enum(["normal", "engorged"]).optional(),
  })
  .strict();
export type TongueAppearancePatch = z.infer<typeof TongueAppearancePatchSchema>;

/** How a tongue picture is taken: the light, whether a colour reference card is in the frame, and the focus. */
export const TongueCaptureSchema = z
  .object({
    light: z.enum(CAPTURE_LIGHTS).default("standard"),
    colorCard: z.boolean().default(true),
    focus: z.enum(["sharp", "soft"]).default("sharp"),
  })
  .strict();
export type TongueCapture = z.infer<typeof TongueCaptureSchema>;

/**
 * A picture the engine draws from structured data (`engine/tongue.ts` `drawPicture`): today a tongue image — what
 * it shows (as captured: a stain shows as coating, warm light as a colour cast) and how it was taken. Always labelled
 * as drawn from the recorded appearance: an illustration of the data, never a photograph of a patient.
 */
export const PictureSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("tongue"), appearance: TongueAppearanceSchema, capture: TongueCaptureSchema.default({}) }).strict(),
]);
export type Picture = z.infer<typeof PictureSchema>;
