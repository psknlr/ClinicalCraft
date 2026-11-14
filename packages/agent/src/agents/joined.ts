/**
 * The debrief of a place in the team (docs/TEAM.md §1; docs/GLOSSARY.md "your place in the team", "done by the team
 * before you joined"): which place the learner held, and what the team had done before they joined — the assessment's
 * `joined` (the reference path up to the team's phase): shown, never credited to the learner. The offline examiner's
 * narrative, `/debrief` and the examiner's context all say it the same way, and count only the objectives left to the
 * learner when they joined.
 */
import { POSITION_TITLES, t, type AssessmentReport, type CaseDefinition } from "@clinicalcraft/core";
import { isZh, joinList, rt } from "../session/i18n.js";
import { investigationName, objectiveTitle } from "../tools/format.js";

/** What the team had done before the learner joined, part by part ("history (2 question(s))", "tests (ECG)"); empty when nothing scored. */
export function joinedParts(c: CaseDefinition, report: Pick<AssessmentReport, "joined">, locale: string): string[] {
  const L = locale;
  const j = report.joined;
  const parts: string[] = [];
  if (j?.history.length) parts.push(rt(L, "joined.history", { n: j.history.length }));
  if (j?.exam.length) parts.push(rt(L, "joined.exam", { n: j.exam.length }));
  if (j?.investigations.length) parts.push(rt(L, "joined.tests", { list: joinList(L, j.investigations.map((id) => investigationName(c, id, L))) }));
  if (j?.decisions.length) parts.push(rt(L, "joined.decisions", { n: j.decisions.length }));
  if (j?.objectives.length) parts.push(rt(L, "joined.objectives", { list: joinList(L, j.objectives.map((id) => objectiveTitle(c, id, L))) }));
  return parts;
}

/** The lines a debrief adds for a place in the team: the place, then what the team did before the learner joined (none for the operating surgeon). */
export function joinedLines(c: CaseDefinition, report: Pick<AssessmentReport, "seat" | "joined">, locale: string): string[] {
  if (!report.seat) return [];
  const L = locale;
  const parts = joinedParts(c, report, L);
  return [
    rt(L, "joined.place", { place: t(POSITION_TITLES[report.seat], L) }),
    parts.length ? rt(L, "joined.line", { parts: parts.join(isZh(L) ? "；" : "; ") }) : rt(L, "joined.nothing"),
  ];
}

/** The objectives that were the learner's: every one but those the team had done before they joined — how many are done. */
export function ownObjectives(report: Pick<AssessmentReport, "objectives" | "joined">): { done: number; total: number } {
  const theirs = new Set(report.joined?.objectives ?? []);
  const own = report.objectives.filter((o) => !theirs.has(o.id));
  return { done: own.filter((o) => o.done).length, total: own.length };
}
