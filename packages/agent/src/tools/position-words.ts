/**
 * Positions said in words (docs/GLOSSARY.md "position", "camera holder"; docs/PROTOCOL.md §3): how a learner names a
 * colleague by the job they hold in this encounter's team — every position's title in either language
 * (`POSITION_TITLES`: "first assistant", "第一助手", "scrub nurse", "洗手护士"…), what the team says (主刀, 术者 and
 * "surgeon" for whoever operates — the team's own word for the stand-in, docs/GLOSSARY.md "surgeon" —, 一助, 二助) and
 * the camera holder (扶镜手, "camera holder": whoever holds the camera port with the
 * scope in it, else a present member other than the surgeon who holds the camera control — never the surgeon member).
 * Resolved through the case's team as it is in this encounter (core `effectiveTeam`), never through the facility's
 * titles: the position tier of `lookupStaff`, which `@` mentions, `consult {staff}` and `delegate_task` share.
 */
import { cameraPort, canonicalPosition, effectiveTeam, memberControls, operatorOf, POSITION_TITLES, positionOfMember, refOfBody, StaffPositionSchema, type CaseDefinition, type Place, type SessionState, type StaffPosition, type TeamChoice } from "@clinicalcraft/core";

/** A position a word names, or the camera holder (who holds the camera port, not a position). */
export type PositionWord = StaffPosition | "camera-holder";

/** What the team says besides the titles: 主刀 / 术者 / "surgeon" (whoever operates), 一助, 二助, the camera holder. */
const TEAM_WORDS: Readonly<Record<string, PositionWord>> = {
  主刀: "surgeon",
  术者: "surgeon",
  surgeon: "surgeon",
  一助: "first-assistant",
  二助: "second-assistant",
  扶镜手: "camera-holder",
  "camera holder": "camera-holder",
};

/** The position a word names (null: none) — case, a leading "@" and "the" ignored. */
export function positionWord(asked: string): PositionWord | null {
  const q = asked
    .trim()
    .replace(/^[@＠]/u, "")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .replace(/^the /u, "")
    .trim();
  if (!q) return null;
  const word = TEAM_WORDS[q];
  if (word) return word;
  return StaffPositionSchema.options.find((p) => POSITION_TITLES[p].en.toLowerCase() === q || POSITION_TITLES[p]["zh-CN"] === q) ?? null;
}

/** What a position is resolved against: the case and the start's choices, with the field when there is one (the camera port's holder). */
export interface TeamView {
  caseDef: CaseDefinition;
  state: TeamChoice & Pick<SessionState, "procedure">;
}

/**
 * The staff ids of the team as it is who answer to a position word (see the module docs): the members in that
 * position (the first assistant's old name counts as the first assistant); the operating surgeon is the stand-in while
 * the learner holds a place — otherwise the learner, no member of staff; the camera holder as A16 says. Empty without
 * a team.
 */
export function membersInPosition(view: TeamView, word: PositionWord): string[] {
  const c = view.caseDef;
  const s = view.state;
  if (!Array.isArray(c.team?.members)) return [];
  const team = effectiveTeam(c, s).filter((m) => m.staff !== "surgeon");
  if (word === "camera-holder") {
    const holder = s.procedure ? cameraPort(s.procedure)?.holder : undefined;
    if (holder) return [holder];
    return team.filter((m) => (memberControls(c, s, m.staff) ?? []).includes("camera")).map((m) => m.staff);
  }
  const want = canonicalPosition(word);
  if (want === "surgeon") {
    const standIn = operatorOf(c, s);
    return standIn ? [standIn] : [];
  }
  return team.filter((m) => {
    const p = positionOfMember(m);
    return p !== null && canonicalPosition(p) === want;
  }).map((m) => m.staff);
}

/**
 * The place the learner holds, when `asked` is a position word that names only it in this encounter's team (docs/GLOSSARY.md
 * "surgeon"): holding the first assistant's place, "first assistant" or "一助" — and "camera holder" while they hold the
 * camera — name the learner, not the colleague who stands by (still named by their name): nobody else answers to it.
 * Null otherwise: no place, not a position word, nobody in that position, or someone else holds it too. The same reading as
 * the browser's `@` mentions (web `staffAddress`), for a typed mention and `/delegate`.
 */
export function ownPlaceWord(view: TeamView, asked: string): Place | null {
  const seat = view.state.seat;
  if (!seat) return null;
  const word = positionWord(asked);
  if (!word) return null;
  // the learner's own place in the field: its member's staff id (core `refOfBody` of the learner's body)
  const own = refOfBody(view.caseDef, view.state);
  if (typeof own !== "string") return null;
  const holders = membersInPosition(view, word);
  return holders.length > 0 && holders.every((h) => h === own) ? seat : null;
}
