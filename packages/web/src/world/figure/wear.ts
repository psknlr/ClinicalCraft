/**
 * What a figure wears and carries. A patient or a visitor wears their own clothes (or a hospital gown); staff
 * wear the uniform of their role, refined by the position they hold (docs/CHARACTERS.md §2): a scrub nurse or
 * a surgeon is scrubbed — theatre cap, mask, sterile gown and gloves, hands held in front — an anaesthetist or
 * a circulating nurse is in theatre scrubs, cap and mask, and nobody wears a white coat in theatre.
 */
import type { ShoeKind } from "./body.js";

/** The cut of what covers the trunk. */
export type Top = "scrub" | "shirt" | "tee" | "polo" | "gown";

export interface Wear {
  top: Top;
  /** Worn over the top: a white coat, or a sterile surgical gown. */
  over: "none" | "coat" | "sterile";
  shoes: ShoeKind;
  /** Shoe colour (default by kind). */
  shoe?: string;
  /** A theatre cap over the hair. */
  cap: boolean;
  /** A surgical mask. */
  mask: boolean;
  /** Sterile gloves. */
  gloves: boolean;
  /** Hands hanging, or held together in front (scrubbed). */
  hands: "relaxed" | "clasped";
  /** An identity badge on the chest. */
  badge: boolean;
  /** A stethoscope round the neck. */
  stethoscope: boolean;
  /** A nurse's fob watch on the chest. */
  watch: boolean;
  /** Pens in the chest pocket. */
  pens: boolean;
  /** A personal dosimeter (staff who work with radiation). */
  dosimeter: boolean;
  /** A patient's identity band on the wrist. */
  wristband: boolean;
  /** Reflective bands of this colour on chest, arms and legs (a paramedic). */
  stripe?: string;
  /** A tie of this colour with a shirt. */
  tie?: string;
}

/** Everyday clothes: a top and trousers, nothing carried. */
export const PLAIN: Wear = { top: "tee", over: "none", shoes: "trainer", cap: false, mask: false, gloves: false, hands: "relaxed", badge: false, stethoscope: false, watch: false, pens: false, dosimeter: false, wristband: false };

/** A patient: their own clothes or a gown (the appearance says which), and an identity band on the wrist. */
export const PATIENT_WEAR: Wear = { ...PLAIN, wristband: true };

/** A staff uniform: colours (an appearance may override them) and what is worn. */
export interface Uniform {
  shirt: string;
  pants: string;
  hairStyle?: "short" | "long" | "bald" | "bun" | "ponytail" | "curly" | "bob" | "wavy";
  wear: Wear;
}

const scrubs = (extra: Partial<Wear> = {}): Wear => ({ ...PLAIN, top: "scrub", shoes: "clog", badge: true, ...extra });
const coat = (top: Top, extra: Partial<Wear> = {}): Wear => ({ ...PLAIN, top, over: "coat", shoes: "leather", badge: true, pens: true, ...extra });

/** Role uniforms (staff NPCs). */
export const ROLE_UNIFORMS: Record<string, Uniform> = {
  nurse: { shirt: "#6fa8c7", pants: "#6fa8c7", wear: scrubs({ watch: true, pens: true }) },
  attending: { shirt: "#6d9fba", pants: "#354442", wear: coat("shirt", { stethoscope: true, tie: "#2c4264" }) },
  radiologist: { shirt: "#34506b", pants: "#34506b", wear: coat("scrub", { dosimeter: true, shoes: "clog" }) },
  pathologist: { shirt: "#a397bc", pants: "#354442", wear: coat("shirt") },
  "lab-tech": { shirt: "#5f9e6e", pants: "#5f9e6e", wear: coat("scrub", { shoes: "clog" }) },
  pharmacist: { shirt: "#5f9e6e", pants: "#354442", wear: coat("shirt") },
  receptionist: { shirt: "#aa6854", pants: "#354442", wear: { ...PLAIN, top: "shirt", shoes: "leather", badge: true } },
  paramedic: { shirt: "#34506b", pants: "#34506b", wear: { ...PLAIN, top: "shirt", shoes: "boot", badge: true, stripe: "#e3c04f" } },
  porter: { shirt: "#8a8f5a", pants: "#4f5440", wear: { ...PLAIN, top: "polo", shoes: "trainer", badge: true } },
};

/** Theatre scrubs: one colour for everyone who works in theatre. */
export const THEATRE_SCRUBS = "#5d9a96";
/** A sterile gown and a theatre cap. */
export const STERILE_GOWN = "#5d8fb8";
export const THEATRE_CAP = "#6fa3c4";

const theatre = (extra: Partial<Wear> = {}): Wear => scrubs({ cap: true, mask: true, ...extra });
const scrubbed: Wear = theatre({ over: "sterile", gloves: true, hands: "clasped", badge: false });

/** What a position changes in its role's uniform (positions not listed wear the role's). */
const POSITION_WEAR: Record<string, { colours?: boolean; wear: Wear }> = {
  surgeon: { colours: true, wear: scrubbed },
  "assistant-surgeon": { colours: true, wear: scrubbed },
  "scrub-nurse": { colours: true, wear: scrubbed },
  anaesthetist: { colours: true, wear: theatre({ stethoscope: true }) },
  "circulating-nurse": { colours: true, wear: theatre({ pens: true }) },
  "theatre-coordinator": { colours: true, wear: scrubs({ cap: true, pens: true }) },
  "recovery-nurse": { wear: scrubs({ watch: true, pens: true, stethoscope: true }) },
  radiographer: { wear: scrubs({ dosimeter: true }) },
};

/** The uniform of a member of staff: their role's, as their position wears it. */
export function uniformOf(role: string, position?: string | null): Uniform {
  const base = ROLE_UNIFORMS[role] ?? { shirt: "#f1ead5", pants: "#354442", wear: { ...PLAIN, top: "shirt" as const, shoes: "leather" as const, badge: true } };
  const p = position ? POSITION_WEAR[position] : undefined;
  if (!p) return base;
  return p.colours ? { ...base, shirt: THEATRE_SCRUBS, pants: THEATRE_SCRUBS, wear: p.wear } : { ...base, wear: p.wear };
}
