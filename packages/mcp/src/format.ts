/**
 * Text renderings for MCP results: the case library and the assessment.
 * Only case data and engine results are stated (grounding rules §2.1); every
 * assessment ends with the teaching-script notice.
 */
import { investigationName, joinList, rt } from "@clinicalcraft/agent";
import { t, type AssessmentReport, type CaseDefinition } from "@clinicalcraft/core";
import { mm } from "./i18n.js";

/** Library entry for a case in one locale (spoiler-free). */
export function caseListing(c: CaseDefinition, locale: string) {
  return {
    id: c.id,
    title: t(c.title, locale),
    summary: t(c.summary, locale),
    specialty: [...c.specialty],
    difficulty: c.difficulty,
    setting: c.setting,
    estimatedMinutes: c.estimatedMinutes ?? null,
    locales: [...c.locales],
    provenance: c.provenance.kind,
  };
}

/** `list_cases` text. */
export function casesText(cases: readonly CaseDefinition[], locale: string): string {
  const lines = [mm(locale, "cases.header", { count: cases.length })];
  for (const c of cases) {
    const minutes = c.estimatedMinutes ? mm(locale, "cases.minutes", { minutes: c.estimatedMinutes }) : "";
    lines.push(mm(locale, "cases.line", { id: c.id, title: t(c.title, locale), specialty: c.specialty.join(", "), difficulty: c.difficulty, minutes }));
    const summary = t(c.summary, locale);
    if (summary) lines.push(`  ${summary}`);
  }
  return lines.join("\n");
}

/** Assessment report (+ examiner judgements and narrative) as text; ends with the teaching-script notice unless `notice: false`. */
export function assessmentText(
  c: CaseDefinition,
  report: AssessmentReport,
  narrative: string | null,
  judged: readonly { id: string; met: boolean; evidence: string }[],
  locale: string,
  options: { notice?: boolean } = {},
): string {
  const L = locale;
  const name = (id: string) => investigationName(c, id, L);
  const lines = [mm(L, "debrief.header", { title: t(c.title, L) })];
  if (!report.completed) lines.push(mm(L, "debrief.interim"));
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
  if (inv.essentialMissing.length) lines.push(mm(L, "debrief.missing", { list: joinList(L, inv.essentialMissing.map(name)) }));
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
