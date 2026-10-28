/**
 * Content lints of the clinical content standard (docs/CASE_AUTHORING.md §9.8): what a peer-reviewed teaching
 * case needs beyond referential integrity. Every issue is a warning — `cases validate` reports them and
 * `cases validate --strict` fails on them; they never make a case unplayable.
 *
 * | lint | path |
 * |---|---|
 * | a DOI is well-formed (`WELL_FORMED_DOI`) in `provenance.doi` and in every reference that cites one | `provenance.doi`, `debrief.references.<i>` |
 * | every option of a decision has its own feedback | `decisions.<i>.options.<j>.feedback` |
 * | rubric ≥ 8 items with ≥ 1 safety item; ≥ 3 teaching points; ≥ 3 learning outcomes; `provenance.review` | `rubric`, `debrief.teachingPoints`, `learningOutcomes`, `provenance.review` |
 * | an objective hint does not name a correct decision option (answer leak) | `objectives.<i>.hint` |
 * | the triage note and the opening line are not the library summary | `patient.triageNote`, `patient.persona.openingLine` |
 * | test utterances paraphrase: none repeats its item's canonical question; every required history item has one | `extensions.testUtterances.<i>`, `history.<i>` |
 * | a record review (`performedAt: "records"`) needs no device and carries no risk | `investigations.<i>.requires` / `.risk` |
 * | no exam finding is a "not recorded" placeholder (`examNotRecorded` says that) | `exam.<i>.finding` |
 * | a child under 12 is not asked adult social history (smoking, alcohol, drugs, work) — the carer is | `history.<i>` |
 */
import type { CaseDefinition, HistoryItem } from "../schema/case.js";
import { PERSONAL_KIT } from "../schema/common.js";
import { hasLocale, t, type LocalizedText } from "../i18n.js";
import { createSession } from "./reducer.js";
import { historyVoice } from "./speech.js";
import { compactText } from "./text.js";
import { supersededItems } from "./twins.js";
import type { Issue } from "./types.js";

/** A well-formed DOI (Crossref's pattern for modern DOIs): ASCII only — an en dash or a space breaks it. */
export const WELL_FORMED_DOI = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;

/** The standard's minimums (docs/CASE_AUTHORING.md §7, §9.4). */
export const CONTENT_MINIMUMS = { rubricItems: 8, teachingPoints: 3, learningOutcomes: 3 } as const;

const warn = (path: string, message: string): Issue => ({ path, message, severity: "warning" });

/** The case's locales that a text has (every locale for a plain string). */
function localesOf(c: CaseDefinition, text: LocalizedText | undefined): string[] {
  if (text == null) return [];
  return c.locales.filter((l) => hasLocale(text, l));
}

/* ------------------------------------------------------------------ */
/* DOIs                                                                */
/* ------------------------------------------------------------------ */

/** DOIs a reference cites: a "10.…" after "doi:", "DOI：", "doi " or "doi.org/" (trailing sentence punctuation dropped). */
export function citedDois(reference: string): string[] {
  const out: string[] = [];
  for (const m of reference.matchAll(/\bdoi(?:\.org\/|\s*[:：]\s*|\s+)(\S+)/giu)) {
    let doi = m[1]!.replace(/[.,;:，。；]+$/u, "");
    if (!/^\d/.test(doi)) continue; // "doi" as a word ("the doi of…"), not a citation
    // a closing bracket the DOI did not open ends the citation: "(doi:10.x/y)"
    while (/[)\]]$/.test(doi) && (doi.match(/\(/g)?.length ?? 0) < (doi.match(/\)/g)?.length ?? 0)) doi = doi.slice(0, -1);
    out.push(doi);
  }
  return out;
}

function checkDois(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  const doi = c.provenance.doi?.trim();
  if (doi && !WELL_FORMED_DOI.test(doi)) issues.push(warn("provenance.doi", `DOI "${doi}" is not well-formed: write the bare DOI (10.<registrant>/<suffix>, ASCII only — no prefix, en dash or space)`));
  c.debrief.references.forEach((ref, i) => {
    if (!/\bdoi\b/i.test(ref)) return;
    const dois = citedDois(ref);
    if (dois.length === 0) issues.push(warn(`debrief.references.${i}`, 'the reference mentions "doi" but cites none: give it as "doi:10.xxxx/yyyy" or drop the word'));
    for (const d of dois) if (!WELL_FORMED_DOI.test(d)) issues.push(warn(`debrief.references.${i}`, `DOI "${d}" is not well-formed (10.<registrant>/<suffix>, ASCII only — an en dash or a space breaks it)`));
  });
  return issues;
}

/* ------------------------------------------------------------------ */
/* Decisions, teaching layer, hints                                    */
/* ------------------------------------------------------------------ */

function checkDecisionFeedback(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  c.decisions.forEach((d, i) =>
    d.options.forEach((o, j) => {
      for (const other of d.options.slice(0, j)) {
        const same = c.locales.filter((l) => hasLocale(o.feedback, l) && hasLocale(other.feedback, l) && compactText(t(o.feedback, l)) !== "" && compactText(t(o.feedback, l)) === compactText(t(other.feedback, l)));
        if (same.length === 0) continue;
        issues.push(warn(`decisions.${i}.options.${j}.feedback`, `option "${o.id}" has the same feedback as option "${other.id}" (${same.join(", ")}): give each option its own feedback`));
        return;
      }
    }),
  );
  return issues;
}

function checkTeachingLayer(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  const min = CONTENT_MINIMUMS;
  if (c.rubric.length < min.rubricItems) issues.push(warn("rubric", `the rubric has ${c.rubric.length} item(s): the standard asks for at least ${min.rubricItems} (8–15 deterministic across the domains, 1–3 judged communication items)`));
  if (!c.rubric.some((r) => r.domain === "safety")) issues.push(warn("rubric", 'no safety item: the rubric needs at least one item of domain "safety"'));
  if (c.debrief.teachingPoints.length < min.teachingPoints) issues.push(warn("debrief.teachingPoints", `${c.debrief.teachingPoints.length} teaching point(s): the standard asks for 3–6, each tied to the cited guidance`));
  if (c.learningOutcomes.length < min.learningOutcomes) issues.push(warn("learningOutcomes", `${c.learningOutcomes.length} learning outcome(s): the standard asks for at least ${min.learningOutcomes} measurable outcomes (an action verb and its standard)`));
  if (!c.provenance.review) issues.push(warn("provenance.review", "no provenance.review: state how far the content has been checked (unreviewed, editorial or clinician-reviewed)"));
  return issues;
}

/** Is an option label specific enough that finding it in a hint gives the answer away (not "Yes", "否")? */
function significant(label: string): boolean {
  return /\p{Script=Han}/u.test(label) ? label.length >= 3 : label.length >= 6;
}

function checkHintLeaks(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  c.objectives.forEach((o, i) => {
    for (const d of c.decisions) {
      for (const option of d.options.filter((x) => x.correct)) {
        const leaked = c.locales.filter((l) => {
          if (!hasLocale(o.hint, l) || !hasLocale(option.text, l)) return false;
          const label = compactText(t(option.text, l));
          return significant(label) && compactText(t(o.hint, l)).includes(label);
        });
        if (leaked.length > 0) issues.push(warn(`objectives.${i}.hint`, `hint names "${t(option.text, leaked[0]!)}", a correct option of decision "${d.id}" (${leaked.join(", ")}): coach without the answer`));
      }
    }
  });
  return issues;
}

function checkSummaryEchoes(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  const echoes = (text: LocalizedText | undefined) =>
    localesOf(c, text).filter((l) => {
      if (!hasLocale(c.summary, l)) return false;
      const a = compactText(t(text, l));
      const summary = compactText(t(c.summary, l));
      return summary !== "" && (a === summary || (summary.length >= 10 && a.includes(summary)));
    });
  const triage = echoes(c.patient.triageNote);
  if (triage.length) issues.push(warn("patient.triageNote", `the triage note repeats the library summary (${triage.join(", ")}): write the nurse's handover, not the card text`));
  const opening = echoes(c.patient.persona.openingLine);
  if (opening.length) issues.push(warn("patient.persona.openingLine", `the opening line repeats the library summary (${opening.join(", ")}): write what the patient says on approach`));
  return issues;
}

/* ------------------------------------------------------------------ */
/* Matcher corpus                                                      */
/* ------------------------------------------------------------------ */

/** One entry of `extensions.testUtterances` (the matcher regression corpus, docs/CASE_AUTHORING.md §7). */
export interface TestUtterance {
  text: string;
  locale: string;
  expect: string[];
  /** Further ids the pipeline may select with the expected ones. */
  alsoOk?: string[];
}

/** `extensions.testUtterances`, read defensively (malformed entries dropped); null when the case has no corpus. */
export function caseTestUtterances(c: CaseDefinition): TestUtterance[] | null {
  const raw = (c.extensions as Record<string, unknown>).testUtterances;
  if (!Array.isArray(raw)) return null;
  return raw.filter(
    (u): u is TestUtterance => !!u && typeof u === "object" && typeof (u as TestUtterance).text === "string" && typeof (u as TestUtterance).locale === "string" && Array.isArray((u as TestUtterance).expect),
  );
}

/** The item's canonical question in `locale`, compacted. */
function canonical(item: HistoryItem, locale: string): string {
  return compactText(t(item.question, locale));
}

function checkUtteranceCorpus(c: CaseDefinition): Issue[] {
  const corpus = caseTestUtterances(c);
  if (corpus === null) return []; // `cases verify` warns that the corpus is missing
  const issues: Issue[] = [];
  const byId = new Map(c.history.map((h) => [h.id, h]));
  const echo = (u: TestUtterance, id: string) => {
    const item = byId.get(id);
    return item !== undefined && canonical(item, u.locale) === compactText(u.text);
  };
  corpus.forEach((u, i) => {
    const echoed = u.expect.filter((id) => echo(u, id));
    if (echoed.length) issues.push(warn(`extensions.testUtterances.${i}`, `"${u.text}" repeats the canonical question of "${echoed[0]}": write a paraphrase a learner would type`));
  });
  c.history.forEach((h, i) => {
    if (!h.required) return;
    // a phase twin's paraphrase counts for the items it supersedes (asking it credits them)
    const answers = new Set([h.id, ...c.history.filter((x) => supersededItems(c, x.id).includes(h.id)).map((x) => x.id)]);
    const paraphrased = corpus.some((u) => u.expect.some((id) => answers.has(id) && !echo(u, id)));
    if (!paraphrased) issues.push(warn(`history.${i}`, `required history item "${h.id}" has no paraphrase in extensions.testUtterances`));
  });
  return issues;
}

/* ------------------------------------------------------------------ */
/* Record reviews, exam placeholders, children                         */
/* ------------------------------------------------------------------ */

function checkRecordReviews(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  const kit = new Set<string>([...PERSONAL_KIT, "records"]);
  c.investigations.forEach((inv, i) => {
    if (inv.performedAt !== "records") return;
    const devices = inv.requires.filter((r) => !kit.has(r));
    if (devices.length) issues.push(warn(`investigations.${i}.requires`, `record review "${inv.id}" requires ${devices.join(", ")}: an existing report is read at a records terminal or at the bedside — require at most "records"`));
    if (inv.risk !== "none") issues.push(warn(`investigations.${i}.risk`, `record review "${inv.id}" has risk "${inv.risk}": retrieving a report carries no procedure risk ("none")`));
  });
  return issues;
}

/** A finding text that says the finding is not recorded (a placeholder, not a finding). */
const NOT_RECORDED = /\bnot (?:recorded|documented|described|reported|available in the (?:source|record))\b|\bno record(?:ed)? (?:of|in)\b|\bunrecorded\b|未记录|未描述|无记录|没有记录|未见记录|未予记录|未提及/iu;

function checkExamPlaceholders(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  c.exam.forEach((f, i) => {
    const said = localesOf(c, f.finding).filter((l) => NOT_RECORDED.test(t(f.finding, l)));
    if (said.length) issues.push(warn(`exam.${i}.finding`, `finding "${f.id}" says it is not recorded (${said.join(", ")}): leave the manoeuvre out — examNotRecorded answers for anything unrecorded`));
  });
  return issues;
}

/** Adult social history: smoking, alcohol, drugs, sexual history, occupation. */
const ADULT_SOCIAL = /\b(?:smok\w*|cigarettes?|tobacco|vap(?:e|es|ing)|alcohol|drink(?:s|ing)? alcohol|beer|wine|spirits|recreational|illicit|cannabis|drugs? use|sexual|sexually|occupation|job|employ\w*|work(?:s|ing)? as)\b|吸烟|抽烟|烟草|喝酒|饮酒|酒精|吸毒|毒品|性生活|性伴|职业|做什么工作|上班/iu;

function ageYears(c: CaseDefinition): number {
  const { age, ageUnit } = c.patient;
  return ageUnit === "months" ? age / 12 : ageUnit === "days" ? age / 365 : age;
}

function checkChildSocialHistory(c: CaseDefinition): Issue[] {
  if (ageYears(c) >= 12) return [];
  const issues: Issue[] = [];
  const s = createSession(c);
  const unit = { years: "years", months: "months", days: "days" }[c.patient.ageUnit];
  c.history.forEach((h, i) => {
    if (h.topic !== "social" || historyVoice(c, s, h.id) !== "patient") return;
    if (!localesOf(c, h.question).some((l) => ADULT_SOCIAL.test(t(h.question, l)))) return;
    issues.push(warn(`history.${i}`, `"${h.id}" asks the child (${c.patient.age} ${unit}) about smoking, alcohol, drugs or work: ask the carer (household smoking, schooling) instead`));
  });
  return issues;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/** Every content-standard lint of a parsed case (warnings only; see the module table). */
export function checkContentStandard(c: CaseDefinition): Issue[] {
  return [
    ...checkDois(c),
    ...checkDecisionFeedback(c),
    ...checkTeachingLayer(c),
    ...checkHintLeaks(c),
    ...checkSummaryEchoes(c),
    ...checkUtteranceCorpus(c),
    ...checkRecordReviews(c),
    ...checkExamPlaceholders(c),
    ...checkChildSocialHistory(c),
  ];
}
