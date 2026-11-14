/**
 * What is drawn of an equipment type in a state (docs/FACILITIES.md "A look for each state"): a behaviour
 * state's `look` resolved against the type — which layers of the model show, what the screens show, how the
 * manikin is. Pure, for the renderer, the previewer and the checks alike. A look decides nothing: the state
 * does, whoever brought it about, and the look follows it.
 */
import { coversOf, manikinCover, MANIKIN_BREATHING, MANIKIN_COVERS, type EquipmentManikin, type EquipmentType, type Placement } from "../schema/facility.js";

/** A manikin as it is drawn: the type's, with what a state changes, its cover said one way and its breathing said. */
export interface DrawnManikin extends Omit<EquipmentManikin, "cover" | "draped" | "breathing"> {
  cover: (typeof MANIKIN_COVERS)[number];
  breathing: (typeof MANIKIN_BREATHING)[number];
}

export interface ResolvedLook {
  /** The layers of the model that are drawn (the rest are hidden; what is in no layer is always drawn). */
  layers: string[];
  /** What the parts named "screen" show. */
  screen: EquipmentType["screen"];
  /** The type's manikin as it is in this state (null: the type has none). */
  manikin: DrawnManikin | null;
}

type Looked = Pick<EquipmentType, "behavior" | "screen" | "manikin">;

/** Does what is drawn of the type depend on its state? */
export function hasLooks(type: Pick<EquipmentType, "behavior">): boolean {
  return Object.values(type.behavior?.states ?? {}).some((s) => s.look !== undefined);
}

/** Every layer a state of the type shows, sorted: what its model has to have. */
export function lookLayers(type: Pick<EquipmentType, "behavior">): string[] {
  const out = new Set<string>();
  for (const s of Object.values(type.behavior?.states ?? {})) for (const l of s.look?.layers ?? []) out.add(l);
  return [...out].sort();
}

/** The state a placement starts in: its own `state`, else its type's `initial` (null: the type has no behaviour). */
export function initialState(type: Pick<EquipmentType, "behavior">, placement?: Pick<Placement, "state">): string | null {
  return placement?.state ?? type.behavior?.initial ?? null;
}

/** The type's manikin as drawn with nothing changed (null: none). */
export function drawnManikin(m: EquipmentManikin | undefined): DrawnManikin | null {
  if (!m) return null;
  const { cover: _cover, draped: _draped, breathing, ...rest } = m;
  return { ...rest, cover: manikinCover(m), breathing: breathing ?? "none" };
}

/**
 * What is drawn in `state` (null, or a state without a look: the type as it is, none of its model's layers).
 * A state's manikin changes are laid over the type's manikin; one that is no longer on its side loses what only
 * a body on its side has (the side that is up, the table's flex, one-lung breathing), and a cover the posture it
 * is now in does not take (`coversOf`) is its own clothes.
 */
export function lookOf(type: Looked, state: string | null): ResolvedLook {
  const look = (state !== null ? type.behavior?.states[state]?.look : undefined) ?? {};
  let manikin = drawnManikin(type.manikin);
  if (manikin && look.manikin) {
    const merged: DrawnManikin = { ...manikin };
    for (const [k, v] of Object.entries(look.manikin)) if (v !== undefined) (merged as unknown as Record<string, unknown>)[k] = v;
    if (merged.posture !== "lateral") {
      delete merged.sideUp;
      merged.flex = 0;
      if (merged.breathing === "one-lung") merged.breathing = "both";
    }
    // a cover the posture it is now in does not take: its own clothes
    if (!coversOf(merged.posture).includes(merged.cover)) merged.cover = "clothes";
    manikin = merged;
  }
  return { layers: [...(look.layers ?? [])], screen: look.screen ?? type.screen, manikin };
}

/** Do two drawn manikins need different figures (anything but how the chest moves)? */
export function sameFigure(a: DrawnManikin | null, b: DrawnManikin | null): boolean {
  if (!a || !b) return a === b;
  return a.posture === b.posture && a.sideUp === b.sideUp && a.cover === b.cover && a.flex === b.flex && a.asleep === b.asleep && a.x === b.x && a.y === b.y && a.z === b.z && a.rot === b.rot && JSON.stringify(a.appearance ?? {}) === JSON.stringify(b.appearance ?? {});
}
