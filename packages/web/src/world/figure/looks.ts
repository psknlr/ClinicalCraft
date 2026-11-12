/**
 * The looks of staff a facility does not describe: skin, hair and its style, build, glasses and height differ
 * from one member of staff to the next — and are the same for the same id every time, on every machine. And how
 * anyone is drawn whose appearance does not say: with a woman's features, a man's or neither's (`presentationOf`
 * for staff, `presentationOfSex` for the people of a case).
 */
import { hashString } from "../textures.js";

const SKIN = ["#cba88a", "#d8b494", "#e0bc9c", "#c99d78", "#e3c2a2", "#cfa47f", "#d6ae8b", "#b98d6a", "#e4c4a6", "#a97c5a"];
const HAIR = ["#1f1a17", "#2b2420", "#2d241d", "#3b3027", "#1c1c1c", "#2e2622", "#4a3b30", "#2a2a2a", "#5a5651"];
const STYLES = ["short", "short", "short", "short", "bun", "bun", "ponytail", "ponytail", "long", "curly", "short", "bald", "bob", "wavy"] as const;
const BUILDS = ["average", "average", "average", "slim", "slim", "heavy", "average"] as const;

/** Looks for the member of staff `id` (an appearance the facility gives overrides any of it). */
export function looksOf(id: string): { skin: string; hair: string; hairStyle: (typeof STYLES)[number]; build: (typeof BUILDS)[number]; accessory: "none" | "glasses" } {
  const h = hashString(`looks:${id}`);
  const pick = <T>(list: readonly T[], shift: number): T => list[(h >>> shift) % list.length]!;
  return { skin: pick(SKIN, 0), hair: pick(HAIR, 5), hairStyle: pick(STYLES, 10), build: pick(BUILDS, 15), accessory: (h >>> 20) % 5 === 0 ? "glasses" : "none" };
}

/** How someone is drawn: with a woman's features and frame, a man's, or neither's in particular. */
export type Presentation = "feminine" | "masculine" | "neutral";

/**
 * How a member of staff is drawn when their appearance does not say: by their hair — a woman's features if it is
 * long, tied back, bobbed or permed, a man's if it is cropped or gone. (Staff are the facility's own invention;
 * nobody's record says otherwise.)
 */
export function presentationOf(hairStyle: string | undefined): "feminine" | "masculine" {
  return hairStyle === "short" || hairStyle === "bald" || hairStyle === undefined ? "masculine" : "feminine";
}

/**
 * How someone out of a case is drawn when their appearance does not say: by the sex the case records — and as
 * neither in particular when it records none (a patient whose sex is neither's, a companion the case does not
 * describe): the world shows no more than the record says.
 */
export function presentationOfSex(sex: string | undefined): Presentation {
  return sex === "female" ? "feminine" : sex === "male" ? "masculine" : "neutral";
}

/** How much a presentation is a woman's (1), a man's (0) or neither's (0.5): `FigureSpec.feminine`. */
export function feminineOf(presentation: Presentation): number {
  return presentation === "feminine" ? 1 : presentation === "masculine" ? 0 : 0.5;
}

/** Height of the member of staff `id` against the average (0.94 … 1.05). */
export function heightOf(id: string): number {
  return 0.94 + ((hashString(`height:${id}`) % 1000) / 1000) * 0.11;
}
