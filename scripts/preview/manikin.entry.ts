/**
 * What the models page draws with the web world's own code (bundled by render.mjs; three.js stays the page's own
 * instance): the body an equipment type is drawn with (`EquipmentType.manikin`), and a type as it is in a state
 * (a state's `look`: the layers of its model, its screens' picture, its manikin — docs/FACILITIES.md).
 */
import { EquipmentTypeSchema, hasLooks, initialState, lookOf, type EquipmentType, type ResolvedLook } from "@clinicalcraft/core";

export { buildManikin } from "../../packages/web/src/world/manikin.js";
export { showLayers } from "../../packages/web/src/world/layers.js";
export { createScreenTexture } from "../../packages/web/src/world/screens.js";

/** A catalog's equipment type as the engine reads it (defaults filled in); null when it does not parse. */
export function parseType(raw: unknown): EquipmentType | null {
  const r = EquipmentTypeSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/**
 * The states a type is drawn in, and how: `asked` — one state, several, or "all" — for a type whose look follows
 * its state; a type without looks is drawn once, as it is. A state the type does not have is left out.
 */
export function looksOf(type: EquipmentType, asked: string[]): { state: string | null; look: ResolvedLook }[] {
  const first = initialState(type);
  if (!hasLooks(type)) return [{ state: null, look: lookOf(type, first) }];
  const all = Object.keys(type.behavior?.states ?? {});
  const states = asked.includes("all") ? all : asked.filter((s) => all.includes(s));
  return (states.length ? states : [first]).map((state) => ({ state, look: lookOf(type, state) }));
}
