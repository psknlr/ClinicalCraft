/**
 * A care team with places for the learner (docs/TEAM.md §1), for the mini anaphylaxis case (`mini-anaphylaxis.case.json`,
 * read by the test): the team works in the observation phase, which the reference path reaches after the airway, two
 * history questions, adrenaline and oxygen. The base team has two surgeons — a first assistant, who then also holds the
 * camera — and a scrub nurse listed `[count, instruments]`; a three-surgeon line-up adds a second assistant; the
 * surgeon's stand-in is `doc-0`. Scenarios: the scrub nurse on a break (relief `nurse-9`), the second assistant away.
 * Test data, not a team any hospital works with.
 */
import type { CaseDefinition } from "../../schema/case.js";
import { parseCase } from "../parse.js";

const L = (en: string) => ({ en, "zh-CN": en });

/** The team (raw JSON, as a case author writes it). */
export const PLACES_TEAM = {
  room: "consult",
  phases: ["observation"],
  members: [
    { staff: "nurse-1", duties: ["circulate"] },
    { staff: "nurse-2", duties: ["count", "instruments"] },
    { staff: "doc-1", duties: ["assist"] },
    { staff: "anaes-1", duties: ["anaesthesia"] },
    { staff: "surgeon", duties: ["surgeon"], standIn: "doc-0" },
  ],
  lineups: [{ id: "three-surgeons", name: L("Three surgeons"), provenance: "authored", members: [{ staff: "doc-2", duties: ["assist"], position: "second-assistant" }] }],
  scenarios: [
    { id: "scrub-break", name: L("Scrub nurse on a break"), summary: L("The scrub nurse is on a break; a colleague relieves her."), provenance: "authored", absent: ["nurse-2"], relief: [{ staff: "nurse-9", duties: ["instruments"] }] },
    { id: "second-away", name: L("Second assistant away"), summary: L("The second assistant has been called away."), provenance: "authored", absent: ["doc-2"] },
  ],
};

type Json = Record<string, unknown>;

/** The mini case (its raw JSON) with a team — `PLACES_TEAM` unless given — and any other top-level fields replaced. */
export function placesCase(mini: Json, team: unknown = PLACES_TEAM, extra: Json = {}): CaseDefinition {
  const parsed = parseCase({ ...structuredClone(mini), team: structuredClone(team), ...extra });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3), null, 2));
  return parsed.value;
}
