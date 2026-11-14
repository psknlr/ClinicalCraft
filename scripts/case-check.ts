/**
 * Per-case quality check for a re-authored case (CASE_AUTHORING §9): the depth floor, the reference path at 100 %,
 * doing nothing scoring 0, a wrong first answer scoring below the reference, no authoring language in a person's
 * voice, and a presenting complaint that plain opening questions reach in the first phase, in both languages.
 * Prints the measured scores the facilitator guide's "How wrong choices score" table quotes.
 *
 *   npx tsx --conditions=source scripts/case-check.ts <case-id> [<case-id> …]
 *
 * Exit code 1 if any check fails. The collection contracts (packages/content/src/cmcr-*.test.ts) hold the full set.
 */
import { readFileSync } from "node:fs";
import { assess, createSession, matchHistory, parseCase, reduce, verifyCase, type CaseDefinition } from "@clinicalcraft/core";

/** Authoring language that must never reach a patient's or carer's mouth, a persona or a triage note. */
const META = /原报告|原病历|原文|源病例|原始资料|原病例资料|source (report|notes?|record|case)|the report (does not|doesn't|did not)|educational role/i;

/** Plain opening questions a learner asks first; each must reach a history item in the case's first phase. */
const OPENERS: [locale: string, question: string][] = [
  ["en", "What brings you in today?"],
  ["en", "What happened?"],
  ["en", "What's the problem?"],
  ["en", "Tell me what's been going on."],
  ["en", "How long has this been going on?"],
  ["en", "When did it start?"],
  ["zh-CN", "这次怎么了？"],
  ["zh-CN", "哪里不舒服？"],
  ["zh-CN", "怎么回事？"],
  ["zh-CN", "有什么不舒服？"],
  ["zh-CN", "多久了？"],
  ["zh-CN", "什么时候开始的？"],
];

/** Every string of a value, recursively. */
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) for (const v of x) strings(v, out);
  else if (x && typeof x === "object") for (const v of Object.values(x)) strings(v, out);
  return out;
}

/** The reference path replayed, optionally answering every decision wrongly first; the final score in percent. */
function replay(c: CaseDefinition, wrongFirst: boolean): number {
  let state = createSession(c);
  for (const action of c.solution) {
    if (wrongFirst && action.type === "answer") {
      const decision = c.decisions.find((d) => d.id === action.decisionId);
      const wrong = decision?.options.find((o) => !o.correct);
      if (wrong) state = reduce(c, state, { ...action, optionIds: [wrong.id] }).state;
    }
    state = reduce(c, state, action).state;
  }
  return assess(c, state).score.percent;
}

/** One case: its problems (empty when it passes) and the measured scores. */
function check(id: string): { problems: string[]; lines: string[] } {
  const parsed = parseCase(JSON.parse(readFileSync(new URL(`../packages/content/cases/${id}/case.json`, import.meta.url), "utf8")));
  if (!parsed.ok) return { problems: [`does not parse: ${JSON.stringify(parsed.issues).slice(0, 400)}`], lines: [] };
  const c = parsed.value;
  const problems: string[] = [];
  const range = (what: string, n: number, lo: number, hi: number) => {
    if (n < lo || n > hi) problems.push(`${what}: ${n} (want ${lo}–${hi})`);
  };
  range("phases", c.phases.length, 3, 5);
  range("history items", c.history.length, 14, 40);
  range("required history items", c.history.filter((h) => h.required).length, 4, 10);
  range("investigations", c.investigations.length, 6, 20);
  range("interventions", c.interventions.length, 7, 20);
  range("decisions", c.decisions.length, 4, 5);
  range("rubric items", c.rubric.length, 10, 15);
  range("critical rubric items", c.rubric.filter((r) => r.critical).length, 1, 3);
  range("objectives", c.objectives.length, 5, 6);
  range("learning outcomes", c.learningOutcomes.length, 5, 6);
  range("teaching points", c.debrief.teachingPoints.length, 4, 6);
  range("key reasoning steps", (c.debrief.keyReasoning ?? []).length, 4, 6);
  const utterances = (c.extensions.testUtterances as unknown[] | undefined)?.length ?? 0;
  if (utterances < 35) problems.push(`test utterances: ${utterances} (want ≥ 35)`);
  for (const d of c.decisions) if (d.options.length < 3 || d.options.length > 5) problems.push(`decision ${d.id}: ${d.options.length} options (want 3–5)`);
  for (const h of c.history) for (const s of strings(h.answer)) if (META.test(s)) problems.push(`history ${h.id}: authoring language "${s.slice(0, 60)}"`);
  for (const s of strings(c.patient.persona)) if (META.test(s)) problems.push(`persona: authoring language "${s.slice(0, 60)}"`);
  for (const s of strings(c.patient.triageNote)) if (META.test(s)) problems.push(`triage note: authoring language "${s.slice(0, 60)}"`);

  const first = c.phases[0]?.id;
  if (!c.history.some((h) => h.topic === "presenting-complaint" && (!h.phases || (first !== undefined && h.phases.includes(first)))))
    problems.push(`no history item with topic "presenting-complaint" available in the first phase (${first})`);
  const missed = OPENERS.filter(([locale, q]) => matchHistory(c, q, locale, { phase: first }).length === 0).map(([, q]) => q);
  if (missed.length) problems.push(`plain openers that reach no history item in the first phase: ${missed.join(" | ")}`);

  const verified = verifyCase(c);
  const reference = verified.assessment?.score.percent ?? 0;
  if (!verified.ok) problems.push(`verify: ${JSON.stringify(verified.issues).slice(0, 400)}`);
  if (reference !== 100) problems.push(`reference path scores ${reference} %`);
  const started = reduce(c, createSession(c), { type: "start" }).state;
  const nothing = assess(c, started).score;
  if (nothing.earned !== 0) problems.push(`doing nothing earns ${nothing.earned}`);
  const wrong = replay(c, true);
  if (!(wrong < reference)) problems.push(`a wrong first answer at every decision scores ${wrong} %, not below the reference (${reference} %)`);

  const lines = [
    `reference ${reference} % · do nothing ${nothing.earned}/${nothing.possible} · wrong first at every decision ${wrong} %`,
    `${c.phases.length} phases · ${c.history.length} history (${c.history.filter((h) => h.required).length} required) · ${c.exam.length} exam · ${c.investigations.length} investigations · ${c.interventions.length} interventions · ${c.decisions.length} decisions · ${c.rubric.length} rubric · ${utterances} utterances`,
  ];
  return { problems, lines };
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("usage: npx tsx --conditions=source scripts/case-check.ts <case-id> [<case-id> …]");
  process.exit(2);
}
let failed = false;
for (const id of ids) {
  const { problems, lines } = check(id);
  console.log(`${problems.length ? "✗" : "✓"} ${id}`);
  for (const l of lines) console.log(`  ${l}`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
