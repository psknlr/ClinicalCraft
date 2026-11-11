/**
 * The looks of staff a facility does not describe: skin, hair and its style, build, glasses and height differ
 * from one member of staff to the next — and are the same for the same id every time, on every machine.
 */
import { hashString } from "../textures.js";

const SKIN = ["#cba88a", "#d8b494", "#e0bc9c", "#c99d78", "#e3c2a2", "#cfa47f", "#d6ae8b", "#b98d6a", "#e4c4a6", "#a97c5a"];
const HAIR = ["#1f1a17", "#2b2420", "#2d241d", "#3b3027", "#1c1c1c", "#2e2622", "#4a3b30", "#2a2a2a", "#5a5651"];
const STYLES = ["short", "short", "short", "short", "bun", "bun", "ponytail", "ponytail", "long", "curly", "short", "bald"] as const;
const BUILDS = ["average", "average", "average", "slim", "slim", "heavy", "average"] as const;

/** Looks for the member of staff `id` (an appearance the facility gives overrides any of it). */
export function looksOf(id: string): { skin: string; hair: string; hairStyle: (typeof STYLES)[number]; build: (typeof BUILDS)[number]; accessory: "none" | "glasses" } {
  const h = hashString(`looks:${id}`);
  const pick = <T>(list: readonly T[], shift: number): T => list[(h >>> shift) % list.length]!;
  return { skin: pick(SKIN, 0), hair: pick(HAIR, 5), hairStyle: pick(STYLES, 10), build: pick(BUILDS, 15), accessory: (h >>> 20) % 5 === 0 ? "glasses" : "none" };
}

/** Height of the member of staff `id` against the average (0.94 … 1.05). */
export function heightOf(id: string): number {
  return 0.94 + ((hashString(`height:${id}`) % 1000) / 1000) * 0.11;
}
