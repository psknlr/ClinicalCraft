/**
 * Text renderings for MCP results: the case library and the assessment.
 * Only case data and engine results are stated (grounding rules §2.1); every
 * assessment ends with the teaching-script notice.
 */
import { caseHandle, investigationName, joinList, rt } from "@clinicalcraft/agent";
import { t, type AssessmentReport, type CaseDefinition, type LocalizedText } from "@clinicalcraft/core";
import { mm } from "./i18n.js";

/**
 * Opaque, stable handle for a case (agent `caseHandle`, shared with the world
 * bridge's live sessions). Case ids name the diagnosis (`stemi-inferior-rv`,
 * `pulmonary-embolism-postop`), and the MCP client is the clinician being
 * assessed: it sees handles, never ids (`start_case` still accepts an id from
 * a caller who knows it).
 */
export { caseHandle };

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
  provenance: string | { kind: string };
}

/** Library entry for a case in one locale (spoiler-free: an opaque handle, never the id). */
export function caseListing(c: ListedCase, locale: string) {
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
  };
}

/** `list_cases` text. */
export function casesText(cases: readonly ListedCase[], locale: string): string {
  const lines = [mm(locale, "cases.header", { count: cases.length })];
  for (const c of cases) {
    const minutes = c.estimatedMinutes ? mm(locale, "cases.minutes", { minutes: c.estimatedMinutes }) : "";
    lines.push(mm(locale, "cases.line", { id: caseHandle(c.id), title: t(c.title, locale), specialty: c.specialty.join(", "), difficulty: c.difficulty, minutes }));
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
  options: { notice?: boolean; final?: boolean } = {},
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
