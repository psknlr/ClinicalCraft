/**
 * Text renderings for MCP results: the case library and the assessment.
 * Only case data and engine results are stated (grounding rules §2.1); every
 * assessment ends with the teaching-script notice.
 */
import { caseHandle, criticalMissLines, decisionNumber, investigationName, joinList, labelledOptions, reviewStatusLine, rt } from "@clinicalcraft/agent";
import { specialtyLabels, t, type AssessmentReport, type CaseDefinition, type LocalizedText } from "@clinicalcraft/core";
import { mm } from "./i18n.js";

/**
 * Opaque, stable handle for a case (agent `caseHandle`, shared with the world
 * bridge's live sessions). Case ids name the diagnosis (`stemi-inferior-rv`,
 * `pulmonary-embolism-postop`), and the MCP client is the clinician being
 * assessed: it sees handles, never ids (`start_case` still accepts an id from
 * a caller who knows it).
 */
export { caseHandle };

/**
 * The letters a learner's answer is presented under (`labelledOptions`, as `list_options(decisions)` lists them):
 * the state and transcript resources say what the learner chose by letter, never by the authored option ids,
 * which can name the answer ("supported", "alternative-1"). An option the case lacks reads "?".
 */
export function answerLetters(c: Pick<CaseDefinition, "id" | "decisions">, decisionId: string, optionIds: readonly string[]): string[] {
  const d = c.decisions.find((x) => x.id === decisionId);
  const labelled = d ? labelledOptions(c, d) : [];
  return optionIds.map((id) => labelled.find((o) => o.option.id === id)?.label ?? "?");
}

/** A learner's answer as the resources show it: what `learnerAnswer` gives in place of the authored ids. */
export interface LearnerAnswer {
  /** The decision's number in case order (as `list_options(decisions)` and `case_status` show it); null if unknown. */
  decision: number | null;
  /** The options chosen, by their letters (`answerLetters`). */
  options: string[];
}

/**
 * A learner's answer by the names the learner reads: the decision by its number in case order, the options by their
 * letters — never the authored ids, which can name the diagnosis or the answer ("carney", "supported").
 */
export function learnerAnswer(c: Pick<CaseDefinition, "id" | "decisions">, decisionId: string, optionIds: readonly string[]): LearnerAnswer {
  const n = decisionNumber(c, decisionId);
  return { decision: n > 0 ? n : null, options: answerLetters(c, decisionId, optionIds) };
}

/** The case a `start_case` reference names: a handle from `list_cases`, else an exact case id. */
export function resolveCaseRef<T extends { id: string }>(cases: Iterable<T>, ref: string): T | null {
  const list = [...cases];
  return list.find((c) => caseHandle(c.id) === ref) ?? list.find((c) => c.id === ref) ?? null;
}

/** What the library shows of a case: a full case or a case index entry (`CaseIndexEntry`). */
export interface ListedCase {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  specialty: readonly string[];
  difficulty: number;
  setting: string;
  estimatedMinutes?: number | null;
  locales: readonly string[];
  provenance: string | { kind: string; review?: { status: string; reviewedAt?: string | null } | undefined };
  /** Index entries: the review summary (a full case keeps it under `provenance.review`). */
  review?: { status: string; reviewedAt?: string | null } | null;
  /** Index entries: how many learning outcomes the case states (a full case has `learningOutcomes`). */
  learningOutcomeCount?: number;
  learningOutcomes?: readonly unknown[];
}

/** How many learning outcomes a listed case states (never their text: they usually name the diagnosis). */
function outcomeCount(c: ListedCase): number {
  return c.learningOutcomeCount ?? c.learningOutcomes?.length ?? 0;
}

/** The case's recorded review (index entry or full case), or null. */
function reviewOf(c: ListedCase): { status: string; reviewedAt: string | null } | null {
  const review = c.review ?? (typeof c.provenance === "string" ? null : (c.provenance.review ?? null));
  return review ? { status: review.status, reviewedAt: review.reviewedAt ?? null } : null;
}

/**
 * Library entry for a case in one locale (spoiler-free: an opaque handle, never the id). The review status is
 * stated honestly; the learning outcomes only as a count — they usually name the diagnosis, and the MCP client
 * is the learner being assessed (`get_debrief` lists them once the case is complete; docs/GLOSSARY.md §4).
 */
export function caseListing(c: ListedCase, locale: string) {
  const review = reviewOf(c);
  return {
    id: caseHandle(c.id),
    title: t(c.title, locale),
    summary: t(c.summary, locale),
    specialty: [...c.specialty],
    difficulty: c.difficulty,
    setting: c.setting,
    estimatedMinutes: c.estimatedMinutes ?? null,
    locales: [...c.locales],
    provenance: typeof c.provenance === "string" ? c.provenance : c.provenance.kind,
    review: review ? { ...review, text: reviewStatusLine(locale, review) } : null,
    learningOutcomeCount: outcomeCount(c),
  };
}

/** `list_cases` text. */
export function casesText(cases: readonly ListedCase[], locale: string): string {
  const lines = [mm(locale, "cases.header", { count: cases.length })];
  for (const c of cases) {
    const minutes = c.estimatedMinutes ? mm(locale, "cases.minutes", { minutes: c.estimatedMinutes }) : "";
    lines.push(mm(locale, "cases.line", { id: caseHandle(c.id), title: t(c.title, locale), specialty: joinList(locale, specialtyLabels(c.specialty, locale)), difficulty: c.difficulty, minutes }));
    const summary = t(c.summary, locale);
    if (summary) lines.push(`  ${summary}`);
    const review = reviewStatusLine(locale, reviewOf(c));
    if (review) lines.push(mm(locale, "cases.review", { text: review }));
    const outcomes = outcomeCount(c);
    if (outcomes > 0) lines.push(mm(locale, "cases.outcomes", { n: outcomes }));
  }
  return lines.join("\n");
}

/**
 * Assessment report (+ examiner judgements and narrative) as text; ends with the teaching-script notice unless
 * `notice: false`. Once final, the critical rubric items missed come first (unless `critical: false`: the case
 * debrief that follows lists them).
 */
export function assessmentText(
  c: CaseDefinition,
  report: AssessmentReport,
  narrative: string | null,
  judged: readonly { id: string; met: boolean; evidence: string }[],
  locale: string,
  options: { notice?: boolean; final?: boolean; critical?: boolean } = {},
): string {
  const L = locale;
  const name = (id: string) => investigationName(c, id, L);
  const lines = [mm(L, "debrief.header", { title: t(c.title, L) })];
  if (!report.completed) lines.push(mm(L, "debrief.interim"));
  // Critical items missed, prominently — never mid-case (an answer key).
  if ((options.final ?? report.completed) && options.critical !== false) lines.push(...criticalMissLines(c, report, L));
  lines.push(
    mm(L, "debrief.score", {
      percent: report.score.percent,
      earned: report.score.earned,
      possible: report.score.possible,
      done: report.objectives.filter((o) => o.done).length,
      total: report.objectives.length,
      firstTry: report.decisions.filter((d) => d.firstTryCorrect).length,
      decisions: report.decisions.length,
    }),
    mm(L, "debrief.coverage", {
      asked: report.history.requiredAsked,
      required: report.history.required,
      examined: report.exam.requiredPerformed,
      examRequired: report.exam.required,
      hints: report.hints,
    }),
  );
  const inv = report.investigations;
  // Mid-case the names of essential tests not yet ordered would be an answer key: a count only (the web rule).
  const final = options.final ?? report.completed;
  if (inv.essentialMissing.length) {
    lines.push(final ? mm(L, "debrief.missing", { list: joinList(L, inv.essentialMissing.map(name)) }) : mm(L, "debrief.missingCount", { count: inv.essentialMissing.length }));
  }
  if (inv.lowValue.length) lines.push(mm(L, "debrief.lowValue", { list: joinList(L, inv.lowValue.map(name)) }));
  if (inv.harmful.length) lines.push(mm(L, "debrief.harmful", { list: joinList(L, inv.harmful.map(name)) }));
  if (inv.unread.length) lines.push(mm(L, "debrief.unread", { list: joinList(L, inv.unread) }));
  if (report.safety.contraindicated.length) lines.push(mm(L, "debrief.unsafe", { count: report.safety.contraindicated.length }));
  if (judged.length) {
    lines.push(mm(L, "debrief.judged"));
    for (const j of judged) lines.push(`  ${j.met ? "✓" : "·"} ${j.id}${j.evidence ? ` — ${j.evidence}` : ""}`);
  }
  if (narrative) lines.push("", narrative);
  if (options.notice !== false) lines.push("", rt(L, "cmd.debrief.notice"));
  return lines.join("\n");
}
