/**
 * The grounding benchmark's data contract — `clinicalcraft/grounding-set@1`
 * (docs/GROUNDING.md). A grounding set holds held-out free-text items that
 * probe the deterministic layer every ClinicalCraft agent stands on:
 *
 * - `history` — a question to the patient → the facts the patient pipeline
 *   reveals (`selectFacts` + the offline re-rank: what the offline patient
 *   says, and the candidates a language-model patient voices);
 * - `exam` / `orders` / `interventions` — a tool argument as a clinician
 *   model sends it (`query`, or a guessed `id`) → the item the clinical tool
 *   acts on (`resolveFinding` / `resolveInvestigation` /
 *   `resolveIntervention`), or no item (`expect: null`);
 * - `routing` — a learner utterance → the patient router's route
 *   (`classifyUtterance`: in-fiction, or deflected as meta, real-advice or
 *   injection);
 * - `verifier` — a voiced patient reply with the facts it was given → the
 *   grounding verifier lets it pass or blocks it (`verifyGrounding`).
 *
 * Files live in `packages/content/grounding/<suite>/<split>/*.json`; the
 * `test` split is held out (frozen by its digest, docs/GROUNDING.md §3).
 */
import { IdSchema } from "@clinicalcraft/core";
import { z } from "zod";

export const GROUNDING_SET_FORMAT = "clinicalcraft/grounding-set@1" as const;

/** The built-in grounding suite. */
export const DEFAULT_GROUNDING_SUITE = "grounding-v1";

/** `dev` items may be inspected while improving the layer; `test` items are held out. */
export const GROUNDING_SPLITS = ["dev", "test"] as const;
export type GroundingSplit = (typeof GROUNDING_SPLITS)[number];

/** The benchmark's tracks (one per layer probed). */
export const GROUNDING_TRACKS = ["history", "exam", "orders", "interventions", "routing", "verifier"] as const;
export type GroundingTrack = (typeof GROUNDING_TRACKS)[number];

/** Tracks whose items refer to one case's items. */
export const CASE_TRACKS: readonly GroundingTrack[] = ["history", "exam", "orders", "interventions", "verifier"];

/** Tool tracks (an argument → the item a clinical tool acts on). */
export const TOOL_TRACKS = ["exam", "orders", "interventions"] as const;
export type ToolTrack = (typeof TOOL_TRACKS)[number];

/** Routes of the patient router (`classifyUtterance`). */
export const GROUNDING_ROUTES = ["in-fiction", "meta", "real-advice", "injection"] as const;
export type GroundingRoute = (typeof GROUNDING_ROUTES)[number];

export const GROUNDING_LOCALES = ["zh-CN", "en"] as const;

const ItemId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "an item id (lower-case letters, digits and -)");
const Locale = z.enum(GROUNDING_LOCALES);
const Note = z.string().max(300);
const Text = z.string().trim().min(1).max(600);
/** Slices reported on their own (e.g. `negation`: a negated finding, question or instruction). */
const Tags = z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/, "a tag (lower-case letters, digits and -)")).min(1).max(6);

/** A question to the patient and the history items that answer it (all must be revealed; `[]` = nothing may be). */
export const HistoryItemSchema = z
  .object({
    id: ItemId,
    locale: Locale,
    text: Text,
    expect: z.array(IdSchema).max(4),
    /** Further items the patient may reveal with the expected ones without it counting as a leak. */
    alsoOk: z.array(IdSchema).max(6).optional(),
    /** The phase the question is asked in (default: the case's initial phase). */
    phase: IdSchema.optional(),
    tags: Tags.optional(),
    note: Note.optional(),
  })
  .strict();
export type HistoryItem = z.infer<typeof HistoryItemSchema>;

/** A clinical tool argument as a model sends it — free text (`query`) or a guessed id (`id`) — and the item it means (null: none of the case's items). */
export const ToolItemSchema = z
  .object({
    id: ItemId,
    locale: Locale,
    query: Text.optional(),
    itemId: z.string().trim().min(1).max(120).optional(),
    expect: IdSchema.nullable(),
    /** The phase the tool is used in (default: the case's initial phase). */
    phase: IdSchema.optional(),
    tags: Tags.optional(),
    note: Note.optional(),
  })
  .strict()
  .refine((x) => (x.query === undefined) !== (x.itemId === undefined), { message: "exactly one of query / itemId" });
export type ToolItem = z.infer<typeof ToolItemSchema>;

/** A learner utterance to the patient and the route it must take. */
export const RoutingItemSchema = z
  .object({
    id: ItemId,
    locale: Locale,
    text: Text,
    expect: z.enum(GROUNDING_ROUTES),
    tags: Tags.optional(),
    note: Note.optional(),
  })
  .strict();
export type RoutingItem = z.infer<typeof RoutingItemSchema>;

/** A voiced reply, the question it answers and the facts it was given: the verifier must let it `pass` or `block` it. */
export const VerifierItemSchema = z
  .object({
    id: ItemId,
    locale: Locale,
    question: Text,
    /** Facts the voice was given and used (their answers are the reply's sources). */
    used: z.array(IdSchema).max(4),
    /** Facts revealed earlier in the encounter (the ledger: not counted as unasked). */
    asked: z.array(IdSchema).max(40).optional(),
    reply: Text,
    expect: z.enum(["pass", "block"]),
    /** What a `block` item fabricates (documentation; not scored): `negation` flips a recorded finding (absent ↔ present). */
    kind: z.enum(["number", "unit", "drug", "term", "claim", "denial", "negation", "unasked", "date"]).optional(),
    tags: Tags.optional(),
    note: Note.optional(),
  })
  .strict();
export type VerifierItem = z.infer<typeof VerifierItemSchema>;

/** One grounding-set file. */
export const GroundingSetSchema = z
  .object({
    $schema: z.string().optional(),
    format: z.literal(GROUNDING_SET_FORMAT),
    suite: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    split: z.enum(GROUNDING_SPLITS),
    /** The case the case tracks refer to (absent for a routing-only file). */
    caseId: IdSchema.optional(),
    description: z.string().max(600).optional(),
    history: z.array(HistoryItemSchema).max(400).optional(),
    exam: z.array(ToolItemSchema).max(200).optional(),
    orders: z.array(ToolItemSchema).max(200).optional(),
    interventions: z.array(ToolItemSchema).max(200).optional(),
    routing: z.array(RoutingItemSchema).max(400).optional(),
    verifier: z.array(VerifierItemSchema).max(200).optional(),
  })
  .strict()
  .superRefine((set, ctx) => {
    const seen = new Set<string>();
    for (const track of GROUNDING_TRACKS) {
      const items = set[track] ?? [];
      if (items.length > 0 && CASE_TRACKS.includes(track) && !set.caseId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [track], message: `${track} items need caseId` });
      items.forEach((item, i) => {
        if (seen.has(item.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [track, i, "id"], message: `duplicate item id "${item.id}"` });
        seen.add(item.id);
      });
    }
  });
export type GroundingSet = z.infer<typeof GroundingSetSchema>;

/** Parse a grounding-set file (issues as "path: message" lines). */
export function parseGroundingSet(json: unknown): { ok: true; set: GroundingSet } | { ok: false; issues: string[] } {
  const r = GroundingSetSchema.safeParse(json);
  if (r.success) return { ok: true, set: r.data };
  return { ok: false, issues: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
}
