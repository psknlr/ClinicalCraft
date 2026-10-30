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
 * | an avoided-harm item gated by `scoredWhen` counts whenever its harm is done (each harmful step is in the gate) | `rubric.<i>.scoredWhen` |
 * | an option id names the option's content, not its correctness or position (`supported`, `alt-1`, `a`…) | `decisions.<i>.options.<j>.id` |
 * | the key of a single-best decision is the uniquely longest option in at most one decision per locale (length cue) | `decisions.<i>.options.<j>.text` |
 * | no authoring language ("原报告", "the source", "teaching role"…) in the patient's, carer's or nurse's learner-facing words | `history.<i>.answer`, `patient.persona.openingLine` / `.fallbackUnknown` / `.companion.name`, `patient.chiefComplaint`, `patient.triageNote` |
 * | no decision is gated on asking an item the case does not record (`disclosure: "unknown"`) | `decisions.<i>.requires…asked` |
 * | no redundant gate structure: `{always: true}` in an all/any list, an all directly in an all (an any in an any) | `phases.<i>.enterWhen…`, `decisions.<i>.requires…`, `objectives.<i>.completeWhen…` |
 * | a key reasoning point is not a copy of a teaching point | `debrief.keyReasoning.<i>` |
 * | a test utterance is not one of its expected item's keywords | `extensions.testUtterances.<i>` |
 * | every specialty id is canonical (`CANONICAL_SPECIALTIES`); a synonym's warning names its replacement | `specialty.<i>` |
 */
import type { CaseDefinition, Decision, HistoryItem } from "../schema/case.js";
import { PERSONAL_KIT, type Condition } from "../schema/common.js";
import { hasLocale, t, tList, type LocalizedText } from "../i18n.js";
import { canonicalSpecialty, isCanonicalSpecialty } from "../specialties.js";
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
/* Avoided-harm items gated by scoredWhen                              */
/* ------------------------------------------------------------------ */

/** A literal of a condition in disjunctive normal form: a leaf (asked, intervened, flag…) or its negation. */
interface Literal {
  leaf: Condition;
  positive: boolean;
}

/** `cond` (negated when `negate`) in disjunctive normal form — a list of conjunctions; null past `limit` of them. */
function dnf(cond: Condition, negate: boolean, limit = 256): Literal[][] | null {
  if ("not" in cond) return dnf(cond.not, !negate, limit);
  const or = (parts: Condition[]): Literal[][] | null => {
    const out: Literal[][] = [];
    for (const part of parts) {
      const d = dnf(part, negate, limit);
      if (d === null || out.length + d.length > limit) return null;
      out.push(...d);
    }
    return out;
  };
  const and = (parts: Condition[]): Literal[][] | null => {
    let out: Literal[][] = [[]];
    for (const part of parts) {
      const d = dnf(part, negate, limit);
      if (d === null || out.length * d.length > limit) return null;
      out = out.flatMap((a) => d.map((b) => [...a, ...b]));
    }
    return out;
  };
  if ("all" in cond) return negate ? or(cond.all) : and(cond.all);
  if ("any" in cond) return negate ? and(cond.any) : or(cond.any);
  if ("always" in cond) return cond.always !== negate ? [[]] : [];
  return [[{ leaf: cond, positive: !negate }]];
}

/** Doing one of these makes `scoredWhen` hold: the condition itself, or the leaves of its (nested) `any`. */
function triggers(cond: Condition): Condition[] {
  if ("any" in cond) return cond.any.flatMap(triggers);
  if ("all" in cond || "not" in cond || "always" in cond) return [];
  return [cond];
}

/**
 * Does the trigger hold whenever the step is done (`{ intervened: x }` covers `{ intervened: x, minCount: 2 }` and
 * `{ intervened: x, whenIndicated: true }`; a trigger `whenIndicated` covers only a step that is too)?
 */
function covers(trigger: Condition, step: Condition): boolean {
  if ("intervened" in trigger && "intervened" in step) {
    return trigger.intervened === step.intervened && (trigger.minCount ?? 1) <= (step.minCount ?? 1) && (!trigger.whenIndicated || !!step.whenIndicated);
  }
  if ("ordered" in trigger && "ordered" in step) return trigger.ordered === step.ordered && (trigger.phase === undefined || trigger.phase === step.phase);
  if ("flag" in trigger && "flag" in step) return trigger.flag === step.flag;
  return false;
}

/** A step a harm is made of: something given, ordered, or a flag the case's interventions and events set. */
const isStep = (leaf: Condition) => "intervened" in leaf || "ordered" in leaf || "flag" in leaf;

/**
 * An item gated by `scoredWhen` must count whenever it is lost by a harm: each way of failing `met` by doing
 * something (a conjunction of `¬met` with a step in it — omissions need no cover) has to make `scoredWhen` hold
 * through one of its steps, or doing only that harm would leave the item unscored and cost nothing.
 */
function checkScoredWhenCoverage(c: CaseDefinition): Issue[] {
  const issues: Issue[] = [];
  c.rubric.forEach((r, i) => {
    if (!r.met || !r.scoredWhen || ("always" in r.scoredWhen && r.scoredWhen.always)) return;
    const ways = dnf(r.met, true);
    if (ways === null) return; // too large to reason about
    const gate = triggers(r.scoredWhen);
    const reported = new Set<string>();
    for (const way of ways) {
      const steps = way.filter((l) => l.positive && isStep(l.leaf)).map((l) => l.leaf);
      if (steps.length === 0 || steps.some((s) => gate.some((g) => covers(g, s)))) continue;
      const shown = steps.map((s) => JSON.stringify(s)).join(" + ");
      if (reported.has(shown)) continue;
      reported.add(shown);
      issues.push(warn(`rubric.${i}.scoredWhen`, `rubric item "${r.id}" is lost by ${shown}, but its scoredWhen does not hold when only that is done (the harm would go unscored): add it to the scoredWhen "any"`));
    }
  });
  return issues;
}

/* ------------------------------------------------------------------ */
/* Decision options: neutral ids, no length cue                        */
/* ------------------------------------------------------------------ */

/**
 * An option id that names the option's role instead of its content: a correctness marker (`supported`, `correct`,
 * `wrong`, `yes`, `best`, `key`, `answer`…, also numbered or as `correct-answer`), a placeholder (`alternative`,
 * `alt-2`, `option-1`, `opt3`, `choice-b`), a distractor (`distractor…`), a single letter or a number (the authored
 * position — options are shown shuffled). Agents and MCP see letters, but the id still reaches the web board's markup, hook
 * payloads, traces and record exports.
 */
const ROLE_OPTION_ID =
  /^(?:(?:un|not-)?supported|correct|incorrect|right|wrong|true|false|yes|no|best|key|answer)(?:[-_.](?:answer|option|choice))?(?:[-_.]?\d+)?$|^(?:alternative|alt|option|opt|choice)(?:[-_.]?(?:\d+|[a-z]))?$|^distract[eo]r|^[a-z]$|^\d+$/i;

function checkOptionIds(c: CaseDefinition): Issue[] {
  return c.decisions.flatMap((d, i) =>
    d.options.flatMap((o, j) =>
      ROLE_OPTION_ID.test(o.id)
        ? [warn(`decisions.${i}.options.${j}.id`, `option id "${o.id}" names the option's role, not its content — the id reaches the web board, hook payloads, traces and exports, so it gives the answer or its position away: name what the option says (e.g. "ivig-now")`)]
        : [],
    ),
  );
}

/** The keyed option of a single-best decision (exactly one correct option) when it is the uniquely longest in `locale` (characters), else -1. */
function keyedLongest(d: Decision, locale: string): number {
  const keyed = d.options.flatMap((o, j) => (o.correct ? [j] : []));
  if (d.kind !== "single" || keyed.length !== 1 || !d.options.every((o) => hasLocale(o.text, locale))) return -1;
  const k = keyed[0]!;
  const lengths = d.options.map((o) => [...t(o.text, locale).trim()].length);
  return lengths.every((n, j) => j === k || n < lengths[k]!) ? k : -1;
}

/** A key that is the longest option in more than one decision teaches learners to pick the longest: per locale, one such decision is allowed. */
function checkLengthCue(c: CaseDefinition): Issue[] {
  const repeats = new Map<number, string[]>(); // decision index → the locales where an earlier decision has the cue
  for (const l of c.locales) {
    let seen = 0;
    c.decisions.forEach((d, i) => {
      if (keyedLongest(d, l) < 0 || seen++ === 0) return;
      repeats.set(i, [...(repeats.get(i) ?? []), l]);
    });
  }
  return [...repeats]
    .sort(([a], [b]) => a - b)
    .map(([i, locales]) => {
      const d = c.decisions[i]!;
      const k = keyedLongest(d, locales[0]!);
      return warn(`decisions.${i}.options.${k}.text`, `the correct option "${d.options[k]!.id}" of decision "${d.id}" is its longest option (${locales.join(", ")}), as in an earlier decision: a key that is the longest more than once is a length cue — make a distractor as long, or the key shorter`);
    });
}

/* ------------------------------------------------------------------ */
/* Authoring language in what the learner reads                        */
/* ------------------------------------------------------------------ */

/**
 * Authoring language: words about the source or the teaching design ("原病历", "the source", "teaching role"). Learners
 * read the patient's and carer's words, the chief complaint and the triage note; only record-facing text (results,
 * `examNotRecorded`, the debrief) may name the report. "The source of the bleeding" is clinical language, not this.
 */
const AUTHORING_LANGUAGE =
  /原报告|原病历|原文|源病例|原始资料|教学设定|教学改写|教学角色|\bthe source\b(?!\s+of\b)|\bsource (?:notes?|reports?)\b|\bthe original report\b|\beducational role\b|\bteaching (?:role|device)\b/iu;

function checkAuthoringLanguage(c: CaseDefinition): Issue[] {
  const { persona } = c.patient;
  const texts: [path: string, what: string, text: LocalizedText | undefined][] = [
    ...c.history.map((h, i): [string, string, LocalizedText] => [`history.${i}.answer`, `the answer to "${h.id}"`, h.answer]),
    ["patient.persona.openingLine", "the opening line", persona.openingLine],
    ["patient.persona.fallbackUnknown", "the fallback answer", persona.fallbackUnknown],
    ["patient.persona.companion.name", "the companion's name", persona.companion?.name],
    ["patient.chiefComplaint", "the chief complaint", c.patient.chiefComplaint],
    ["patient.triageNote", "the triage note", c.patient.triageNote],
  ];
  const issues: Issue[] = [];
  for (const [path, what, text] of texts) {
    const found = localesOf(c, text).flatMap((l) => {
      const m = AUTHORING_LANGUAGE.exec(t(text, l));
      return m ? [`"${m[0]}" (${l})`] : [];
    });
    if (found.length) issues.push(warn(path, `${what} uses authoring language — ${found.join(", ")}: learners read it, so write it in character; only record-facing text (results, examNotRecorded, the debrief) may name the report`));
  }
  return issues;
}

/* ------------------------------------------------------------------ */
/* Gates: unrecorded history, redundant structure                      */
/* ------------------------------------------------------------------ */

/** The leaves of a condition (through all, any and not), each with its path below `path`. */
function leaves(cond: Condition, path: string): [Condition, string][] {
  if ("all" in cond) return cond.all.flatMap((x, k) => leaves(x, `${path}.all.${k}`));
  if ("any" in cond) return cond.any.flatMap((x, k) => leaves(x, `${path}.any.${k}`));
  if ("not" in cond) return leaves(cond.not, `${path}.not`);
  return [[cond, path]];
}

/** A decision gated on asking an item the case does not record is a hidden gate: the question has no answer to find. */
function checkUnrecordedGates(c: CaseDefinition): Issue[] {
  const unrecorded = new Set(c.history.filter((h) => h.disclosure === "unknown").map((h) => h.id));
  return c.decisions.flatMap((d, i) =>
    leaves(d.requires, `decisions.${i}.requires`).flatMap(([leaf, path]) =>
      "asked" in leaf && unrecorded.has(leaf.asked)
        ? [warn(`${path}.asked`, `decision "${d.id}" requires asking "${leaf.asked}", which the case does not record (disclosure "unknown"): gate it on recorded evidence — a question without an answer is a hidden gate`)]
        : [],
    ),
  );
}

/** Redundant structure below `path`: `{always: true}` in an all or any list; an all directly in an all, an any in an any. */
function redundantGate(cond: Condition, path: string): Issue[] {
  if ("not" in cond) return redundantGate(cond.not, `${path}.not`);
  if (!("all" in cond) && !("any" in cond)) return [];
  const kind = "all" in cond ? "all" : "any";
  const list = "all" in cond ? cond.all : cond.any;
  return list.flatMap((x, k) => {
    const at = `${path}.${kind}.${k}`;
    const own: Issue[] = [];
    if ("always" in x && x.always) own.push(warn(at, kind === "all" ? '{"always": true} in an "all" list adds nothing: drop it' : '{"always": true} in an "any" list makes the whole "any" hold from the start: gate on what the learner does'));
    if (kind in x) own.push(warn(at, `an "${kind}" directly in an "${kind}" list: move its conditions into the outer list`));
    return [...own, ...redundantGate(x, at)];
  });
}

function checkRedundantGates(c: CaseDefinition): Issue[] {
  return [
    ...c.phases.flatMap((p, i) => (p.enterWhen ? redundantGate(p.enterWhen, `phases.${i}.enterWhen`) : [])),
    ...c.decisions.flatMap((d, i) => redundantGate(d.requires, `decisions.${i}.requires`)),
    ...c.objectives.flatMap((o, i) => redundantGate(o.completeWhen, `objectives.${i}.completeWhen`)),
  ];
}

/* ------------------------------------------------------------------ */
/* Echoes: key reasoning, keyword utterances                           */
/* ------------------------------------------------------------------ */

function checkKeyReasoningEchoes(c: CaseDefinition): Issue[] {
  const { keyReasoning, teachingPoints } = c.debrief;
  return keyReasoning.flatMap((k, i) => {
    for (const [j, point] of teachingPoints.entries()) {
      const same = c.locales.filter((l) => hasLocale(k, l) && hasLocale(point, l) && compactText(t(k, l)) !== "" && compactText(t(k, l)) === compactText(t(point, l)));
      if (same.length) return [warn(`debrief.keyReasoning.${i}`, `the key reasoning point repeats debrief.teachingPoints.${j} (${same.join(", ")}): give the reasoning chain that leads to the answer, not the teaching point again`)];
    }
    return [];
  });
}

/** `caseTestUtterances` with each entry's index in `extensions.testUtterances` (malformed entries are skipped). */
function indexedUtterances(c: CaseDefinition): [number, TestUtterance][] {
  const raw = (c.extensions as Record<string, unknown>).testUtterances;
  return Array.isArray(raw) ? (caseTestUtterances(c) ?? []).map((u) => [raw.indexOf(u), u]) : [];
}

function checkKeywordUtterances(c: CaseDefinition): Issue[] {
  const byId = new Map(c.history.map((h) => [h.id, h]));
  return indexedUtterances(c).flatMap(([i, u]) => {
    const text = compactText(u.text);
    const item = text === "" ? undefined : u.expect.find((id) => tList(byId.get(id)?.keywords, "*").some((k) => compactText(k) === text));
    return item === undefined ? [] : [warn(`extensions.testUtterances.${i}`, `"${u.text}" is a keyword of "${item}", so it tests nothing the keyword does not: write a paraphrase a learner would type`)];
  });
}

/* ------------------------------------------------------------------ */
/* Specialty ids                                                       */
/* ------------------------------------------------------------------ */

/** Every specialty id is canonical, so the library filter lists each discipline once (packages/core/src/specialties.ts). */
function checkSpecialties(c: CaseDefinition): Issue[] {
  return c.specialty.flatMap((id, i) => {
    if (isCanonicalSpecialty(id)) return [];
    const replacement = canonicalSpecialty(id, c.specialty);
    if (replacement === null) return [warn(`specialty.${i}`, `specialty "${id}" is not a canonical id: use one of CANONICAL_SPECIALTIES (packages/core/src/specialties.ts), or add the discipline there with its bilingual label`)];
    const use = replacement.map((r) => `"${r}"`).join(" + ");
    const child = /^p(?:a)?ediatric-/.test(id) && !replacement.includes("pediatric-surgery");
    return [warn(`specialty.${i}`, `specialty "${id}" is a synonym: use ${use}${child ? ' — a child\'s organ specialty is the adult id beside the age group ("pediatrics", or "neonatology" for a newborn)' : ""}`)];
  });
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
    ...checkScoredWhenCoverage(c),
    ...checkOptionIds(c),
    ...checkLengthCue(c),
    ...checkAuthoringLanguage(c),
    ...checkUnrecordedGates(c),
    ...checkRedundantGates(c),
    ...checkKeyReasoningEchoes(c),
    ...checkKeywordUtterances(c),
    ...checkSpecialties(c),
  ];
}
