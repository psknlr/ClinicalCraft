import { z } from "zod";

/**
 * The jobs people hold in the simulated hospital and the parts of an operation each may work — the one vocabulary for
 * positions, places and controls (docs/TEAM.md §1, docs/CHARACTERS.md §2). A leaf module: it imports only zod, because
 * `facility.ts` imports `case.ts`, which imports `team.ts` and `session.ts` — were those to take the positions from
 * `facility.ts`, they would read them before they exist.
 */

/** A name in both languages (the shape of `LocalizedText`, kept here so the leaf imports nothing of the schema). */
export interface PositionName {
  en: string;
  "zh-CN": string;
}

/**
 * A staff member's position — the job they hold, finer than `role` (which decides what their body may do in the
 * world): a nurse is a scrub, circulating, ward or recovery nurse; an attending is a surgeon, a first or second
 * assistant, an anaesthetist or a physician. `assistant-surgeon` is the old name of the first assistant: it stays
 * valid, keeps its own role card, and counts as `first-assistant` wherever controls, places or sterility are decided
 * (`canonicalPosition`). Each position has a role card (the agent's `characters/roles.ts`): its responsibilities,
 * authority, limits, communication protocol and whom it escalates to (docs/CHARACTERS.md).
 */
export const StaffPositionSchema = z.enum([
  "surgeon",
  "assistant-surgeon",
  "first-assistant",
  "second-assistant",
  "anaesthetist",
  "scrub-nurse",
  "circulating-nurse",
  "ward-nurse",
  "recovery-nurse",
  "theatre-coordinator",
  "physician",
  "educator",
  "radiologist",
  "radiographer",
  "pathologist",
  "lab-technician",
  "transfusion-scientist",
  "pharmacist",
  "receptionist",
  "porter",
  "paramedic",
]);
export type StaffPosition = z.infer<typeof StaffPositionSchema>;

/** Each position's name in both languages: the one source of role-card titles, refusals and labels. */
export const POSITION_TITLES: Readonly<Record<StaffPosition, PositionName>> = {
  surgeon: { en: "operating surgeon", "zh-CN": "主刀医生" },
  "assistant-surgeon": { en: "assistant surgeon", "zh-CN": "助手医生" },
  "first-assistant": { en: "first assistant", "zh-CN": "第一助手" },
  "second-assistant": { en: "second assistant", "zh-CN": "第二助手" },
  anaesthetist: { en: "anaesthetist", "zh-CN": "麻醉医生" },
  "scrub-nurse": { en: "scrub nurse", "zh-CN": "洗手护士" },
  "circulating-nurse": { en: "circulating nurse", "zh-CN": "巡回护士" },
  "ward-nurse": { en: "ward nurse", "zh-CN": "病房护士" },
  "recovery-nurse": { en: "recovery nurse", "zh-CN": "复苏室护士" },
  "theatre-coordinator": { en: "theatre coordinator", "zh-CN": "手术室协调护士" },
  physician: { en: "physician", "zh-CN": "医生" },
  educator: { en: "clinical educator", "zh-CN": "带教老师" },
  radiologist: { en: "radiologist", "zh-CN": "放射科医生" },
  radiographer: { en: "radiographer", "zh-CN": "放射技师" },
  pathologist: { en: "pathologist", "zh-CN": "病理科医生" },
  "lab-technician": { en: "laboratory technician", "zh-CN": "检验技师" },
  "transfusion-scientist": { en: "transfusion scientist", "zh-CN": "输血科技师" },
  pharmacist: { en: "pharmacist", "zh-CN": "药师" },
  receptionist: { en: "receptionist", "zh-CN": "接待员" },
  porter: { en: "porter", "zh-CN": "护工" },
  paramedic: { en: "paramedic", "zh-CN": "急救员" },
};

/** The position a decision about controls, places or sterility reads: `assistant-surgeon` is the first assistant. */
export function canonicalPosition(p: StaffPosition): StaffPosition {
  return p === "assistant-surgeon" ? "first-assistant" : p;
}

/**
 * The places a learner may take in a care team (`start {seat}`; docs/TEAM.md §1): `surgeon` is the operating surgeon —
 * the learner as always, who may also do the team's parts — and the other three are places in the team, joined at
 * the team's phase while a stand-in surgeon operates.
 */
export const SEAT_POSITIONS = ["surgeon", "first-assistant", "second-assistant", "scrub-nurse"] as const;
export const SeatSchema = z.enum(SEAT_POSITIONS);
export type Seat = z.infer<typeof SeatSchema>;

/** The positions that work scrubbed at the sterile field (gowned and gloved); every other position is non-sterile. */
export const STERILE_POSITIONS: readonly StaffPosition[] = ["surgeon", "assistant-surgeon", "first-assistant", "second-assistant", "scrub-nurse"];

/** Whether a position works scrubbed at the sterile field (`STERILE_POSITIONS`). */
export function isSterilePosition(p: StaffPosition): boolean {
  return STERILE_POSITIONS.includes(p);
}

/**
 * A control: a named permission to work one part of an operation (docs/TEAM.md §1). Positions hold default controls
 * (`DEFAULT_CONTROLS`) and a case team may give a member a different set; who works at a given moment is decided by
 * holding — a port's holder in the operative field, a carried item's holder in the world — never by the control alone.
 * - `operate`: the operating surgeon's own steps;
 * - `camera`: the laparoscope or thoracoscope — hold it, aim it, insert or withdraw it in a camera port;
 * - `retract`: traction and counter-traction with a grasper;
 * - `suction`: suction and irrigation;
 * - `close`: closing the wound (sutures, closure in layers);
 * - `instruments`: the instrument table — passing instruments, loading needles, clips and stapler reloads;
 * - `count`: the surgical count (the scrub and the circulating nurse count together);
 * - `equipment`: the theatre's equipment outside the sterile field (the tower, the generator, the pendants);
 * - `anaesthesia`: the anaesthetic (the airway, a double-lumen tube, lung isolation).
 */
export const SURGICAL_CONTROLS = ["operate", "camera", "retract", "suction", "close", "instruments", "count", "equipment", "anaesthesia"] as const;
export const SurgicalControlSchema = z.enum(SURGICAL_CONTROLS);
export type SurgicalControl = z.infer<typeof SurgicalControlSchema>;

/** Each control's name in both languages (docs/GLOSSARY.md "controls"). */
export const CONTROL_TITLES: Readonly<Record<SurgicalControl, PositionName>> = {
  operate: { en: "Operate", "zh-CN": "主刀操作" },
  camera: { en: "Camera", "zh-CN": "扶镜" },
  retract: { en: "Traction", "zh-CN": "牵引显露" },
  suction: { en: "Suction", "zh-CN": "吸引" },
  close: { en: "Closure", "zh-CN": "关闭切口" },
  instruments: { en: "Instrument table", "zh-CN": "器械台" },
  count: { en: "Count", "zh-CN": "清点" },
  equipment: { en: "Equipment", "zh-CN": "设备" },
  anaesthesia: { en: "Anaesthesia", "zh-CN": "麻醉" },
};

/** The controls worked at the sterile field: held by sterile positions only. */
export const FIELD_CONTROLS: readonly SurgicalControl[] = ["operate", "camera", "retract", "suction", "close", "instruments"];
/** The controls worked outside the sterile field: held by non-sterile positions only. `count` is held on both sides. */
export const NON_STERILE_CONTROLS: readonly SurgicalControl[] = ["equipment", "anaesthesia"];

/**
 * The controls each position holds unless its case team says otherwise. The surgeon's cover every assistant's work, so
 * no reference path depends on an assistant; a first assistant also holds the camera when no second assistant is
 * present (the team's resolvers derive it).
 */
export const DEFAULT_CONTROLS: Readonly<Record<StaffPosition, readonly SurgicalControl[]>> = {
  surgeon: ["operate", "camera", "retract", "suction", "close"],
  "assistant-surgeon": ["retract", "suction"],
  "first-assistant": ["retract", "suction"],
  "second-assistant": ["camera", "retract", "suction"],
  anaesthetist: ["anaesthesia"],
  "scrub-nurse": ["instruments", "count"],
  "circulating-nurse": ["count", "equipment"],
  "ward-nurse": [],
  "recovery-nurse": [],
  "theatre-coordinator": [],
  physician: [],
  educator: [],
  radiologist: [],
  radiographer: [],
  pathologist: [],
  "lab-technician": [],
  "transfusion-scientist": [],
  pharmacist: [],
  receptionist: [],
  porter: [],
  paramedic: [],
};
