/**
 * Positions said in words (docs/GLOSSARY.md "position", "camera holder"; docs/PROTOCOL.md §3): how a learner names a
 * colleague by the job they hold in this encounter's team — every position's title in either language
 * (`POSITION_TITLES`: "first assistant", "第一助手", "scrub nurse", "洗手护士"…), what the team says (主刀 and 术者 for
 * whoever operates, 一助, 二助) and the camera holder (扶镜手, "camera holder": whoever holds the camera port with the
 * scope in it, else a present member other than the surgeon who holds the camera control — never the surgeon member).
 * Resolved through the case's team as it is in this encounter (core `effectiveTeam`), never through the facility's
 * titles: the position tier of `lookupStaff`, which `@` mentions, `consult {staff}` and `delegate_task` share.
 */
import { cameraPort, canonicalPosition, effectiveTeam, memberControls, operatorOf, POSITION_TITLES, positionOfMember, StaffPositionSchema, type CaseDefinition, type SessionState, type StaffPosition, type TeamChoice } from "@clinicalcraft/core";

/** A position a word names, or the camera holder (who holds the camera port, not a position). */
export type PositionWord = StaffPosition | "camera-holder";

/** What the team says besides the titles: 主刀 / 术者 (whoever operates), 一助, 二助, the camera holder. */
const TEAM_WORDS: Readonly<Record<string, PositionWord>> = {
  主刀: "surgeon",
  术者: "surgeon",
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
