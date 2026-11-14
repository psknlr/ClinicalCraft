export const meta = {
  name: 'cmcr105-reauthor-v6',
  description: 'CMCR-105 cases: author from the facts 1.0.0 records (sources unavailable), then independent review rounds (at least two, more while a round finds a critical or major issue, at most four) before the case is committed; also further rounds for cases already committed',
  phases: [
    { title: 'Author', detail: 'one agent per case: STANDARD §0-§6 and KIT from the 1.0.0 fact base, continuing any partial draft' },
    { title: 'Review rounds', detail: 'a fresh reviewer per round: every patient fact traced, every guideline statement checked in its text, the kit, replays; then the fixes and all checks' },
  ],
}

// args: { cases: { id, mode: 'author' | 'rounds', from?: number, earlierFile?: string, reportFile?: string }[], maxRound?: number }
//   author: write the case (continuing any partial draft), then review rounds 1.. (at least 2)
//   rounds: review rounds from `from` (1 = first independent review) — earlierFile: the critical and major findings of the
//           rounds already done (plan-runs.py writes it from the journals); reportFile: the author's report when the case is new
// Two lanes share the queue; a stopped run is not resumed: plan-runs.py makes the queue of a new run.
const SP = '/tmp/claude-0/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/scratchpad'
const W = `${SP}/pr5/wt`
const MAX_ROUND = args.maxRound ?? 4
const MIN_ROUND = 2

const COMMON = `Context: ClinicalCraft, a bilingual (zh-CN + en) clinical-simulation teaching framework (TypeScript ESM monorepo; CLAUDE.md conventions apply). You work ONLY in the git worktree ${W} (branch pr5-local: the revision of PR psknlr/ClinicalCraft#5, whose 105 cases tagged cmcr-105 were generated from templates in version 1.0.0 and are being re-authored to the library's clinical content standard). Read first, in full: ${SP}/pr5/STANDARD.md (the revision standard; §6 governs version 1.1.0, written from the facts 1.0.0 recorded because the full source articles are not available) and ${SP}/pr5/KIT.md (where things are, how the engine evaluates what you write, the mistakes earlier reviews caught — §3 items 1-18 —, the safety-outcome rules).
RULES: touch only packages/content/cases/<your case>/ and your own scratch directory ${SP}/work-<your case>/ (builder scripts, notes). Do NOT touch git (read-only git show/log/diff are fine) and do not edit shared files (docs, tests, scripts, the source map, the media review, facilities, catalogs): report a needed shared change instead (KIT §3.18). Other agents work in the same worktree on other cases at the same time. Run vitest with --maxWorkers=1 (shared machine) and keep command output short (tail/grep). Write JSON with 2-space indentation, atomically (temp file + rename), early and often: an earlier attempt may have been stopped by a usage limit or a restart, and so may you — if the case folder holds a partial draft or a review's partial fixes, or your scratch directory holds an earlier attempt's notes and builder scripts, read them and continue rather than starting over. Every check of STANDARD §5 must pass before you finish (\`scripts/case-check.ts\` also probes plain opening questions in both languages: KIT §3.10); never weaken a check.`

const FACTS = (id) => `THE FACT BASE of ${id} (version 1.0.0, commit 88ed0d2): \`git -C ${W} show 88ed0d2:packages/content/cases/${id}/case.json\` and \`git -C ${W} show 88ed0d2:packages/content/cases/${id}/README.md\` — every patient fact of 1.1.0 must trace to it. Its source-map entry (article URL, DOI verified or pending): scripts/cmcr-105-sources.json; its figures and their review: scripts/cmcr-105-media-review.json. The case's history on this branch: \`git -C ${W} log --oneline -- packages/content/cases/${id}\` (a case re-authored in this run is not committed yet: its files in the worktree are the case).`

const AUTHOR_OUT = {
  type: 'object',
  properties: {
    caseId: { type: 'string' },
    factBaseRead: { type: 'boolean' },
    summary: { type: 'string', description: 'what the case teaches and how: phases, decisions, interventions, rubric and critical items, measured scores' },
    extraction: { type: 'string', description: 'every 1.0.0 fact and the 1.1.0 field that holds it; contradictions kept; inferences; what stays unknown' },
    addedFacts: { type: 'array', items: { type: 'string' }, description: 'any patient fact not in 1.0.0 (should be empty)' },
    safetyFixes: { type: 'array', items: { type: 'string' } },
    guidelines: { type: 'array', items: { type: 'string' }, description: 'guidance cited (body, title, year) and whether checked online' },
    toVerify: { type: 'array', items: { type: 'string' } },
    checks: { type: 'string', description: 'each STANDARD §5 check on the final files and its result' },
    allChecksPass: { type: 'boolean' },
  },
  required: ['caseId', 'factBaseRead', 'summary', 'extraction', 'addedFacts', 'safetyFixes', 'guidelines', 'toVerify', 'checks', 'allChecksPass'],
}

const ROUND_OUT = {
  type: 'object',
  properties: {
    caseId: { type: 'string' },
    round: { type: 'number', description: 'the review round you were given (1 = the first independent review)' },
    factsChecked: { type: 'number', description: 'how many patient-fact statements you traced to 1.0.0 (both languages count once)' },
    guidelinesChecked: { type: 'array', items: { type: 'string' }, description: 'each guideline statement the case attributes, and how you checked it (the text you read, or why it could not be checked)' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          area: { type: 'string', enum: ['invented-fact', 'changed-fact', 'dropped-fact', 'clinical-accuracy', 'guideline-citation', 'internal-consistency', 'teaching-design', 'assessment-validity', 'bilingual', 'patient-voice', 'privacy', 'spoiler', 'in-world', 'readme', 'other'] },
          location: { type: 'string' },
          problem: { type: 'string', description: 'quote the case text and the 1.0.0 text or guideline it conflicts with' },
          fixed: { type: 'boolean' },
          resolution: { type: 'string', description: 'what you changed, or why it was not changed' },
        },
        required: ['severity', 'area', 'location', 'problem', 'fixed', 'resolution'],
      },
    },
    sharedChanges: { type: 'array', items: { type: 'string' }, description: 'engine, lint or doc changes the case needs that you may not make (KIT §3.18)' },
    checks: { type: 'string', description: 'each STANDARD §5 check on the final files and its result' },
    allChecksPass: { type: 'boolean' },
  },
  required: ['caseId', 'round', 'factsChecked', 'guidelinesChecked', 'findings', 'sharedChanges', 'checks', 'allChecksPass'],
}

const authorPrompt = (id) => `${COMMON}

Then read ONE reviewed case in full as a model of depth and form (KIT §1) — never copy its sentences.

${FACTS(id)}

YOUR TASK: re-author ${id} to version 1.1.0 — a case a clinician-educator of its specialty would be proud to teach with: thorough, professional, safe and true to its facts. Independent reviewers will trace every patient fact you write to 1.0.0 and look up every guideline statement in its source's own text, in at least two rounds, so avoid KIT §3's classes from the start. Work through STANDARD §0-§6 and the KIT:
1. Read the fact base in full and list every patient fact (your extraction table), every contradiction between its fields or languages, and what it leaves unknown.
2. Design the teaching: the real decision points of this patient's course and today's guidance at each; phases that stage the evidence; 4-5 decisions that open before the result that answers them; the report's management, today's steps and the tempting wrong or historical steps as interventions (harm texts naming their guidance; critical and doseSpec per KIT §6); a rubric whose critical items are acts done in time; the attending and the nurse; dated, guideline-attributed teaching points; the history in the patient's (or carer's) own words, with a presenting-complaint item the plain openers reach (KIT §3.10).
3. Write case.json and README.md (the 16-part facilitator guide of STANDARD §4, with the measured scores, the Safety outcome paragraph and the To-verify list).
4. Validate and iterate until every check of STANDARD §5 passes; check every guideline statement, edition and threshold in the source's own text (WebSearch, WebFetch) — or soften it and list it under To verify.
Report as the schema asks; the extraction must account for every 1.0.0 fact.`

const roundPrompt = (id, round, earlier, author, reportFile, earlierFile) => `${COMMON}

${FACTS(id)}

YOUR TASK: review round ${round} of the re-authored case ${id} (version 1.1.0). ${round === 1 ? 'Another agent authored it; you are its first independent reviewer and wrote none of it.' : `The case was authored, then reviewed and fixed by ${round - 1 === 1 ? 'an independent reviewer' : `${round - 1} independent reviewers in turn`}; you are a fresh reviewer and wrote none of it.`} Your job is to find what ${round === 1 ? 'the author got wrong or left out' : 'the earlier rounds missed'}, then fix it. Read the standard, the kit, the 1.0.0 fact base, then the case.json (section by section) and README in full. Work through these, writing your notes to ${SP}/work-${id}/review${round}.md as you go (an earlier attempt may have left notes there: continue from them):
1. EXHAUSTIVE FACT TRACE. List every string of case.json and README that states a patient fact — history answers, the persona, the triage note, exam findings, every investigation result and note, record texts, staff knowledge, decision prompts and feedback, intervention responses and harms, objectives and hints, the debrief (conclusion, key reasoning, teaching points), learning outcomes, the README's clinical summary and 中文摘要 — and trace each, in BOTH languages, to 1.0.0. Hunt specifically for KIT §3's classes: changed facts (1), invented descriptors (2), attributed treatments (3), added specificity (11: specimen, modality, approach, side, sample), widened/narrowed/graded facts in another voice (12: negatives, degrees, constancy, extent, "a few", events), sequences or simultaneity 1.0.0 does not state (13), values graded against an unrecorded reference range. zh and en must state exactly the same facts. An added or changed fact is critical; a clinically relevant dropped fact is major.
2. GUIDELINE STATEMENTS. For every statement the case attributes to a guideline, consensus, trial or textbook (body, title, year, threshold, dose, recommendation class): find the statement in the source's own text — WebSearch and WebFetch; the publisher's full text, PMC, the society's site; not an abstract, a press release or a secondary summary — for the patient's subgroup, and check the edition is current (a superseded edition cited as current is major). If you cannot reach the text, say so in guidelinesChecked, soften the attribution (teach the point without the guideline's name, or name the source that holds it) and list it in the README's To verify. An unverifiable statement asserted as a guideline's is major; a wrong threshold, dose or recommendation is critical.
3. CLINICAL ACCURACY of every keyed answer, feedback, harm text, dose (doseSpec and text), critical flag and teaching point against current practice; the safety outcome (KIT §6): critical flags, presets, high-alert medicines.
4. ASSESSMENT REPLAYS (write small scripts in your scratch directory with @clinicalcraft/core: \`npx tsx --conditions=source <script>\` from ${W}): (a) each harmful or contraindicated act added to the reference path lowers the score or fails the safety outcome (KIT §3.15c); (b) select-all keys are not exactly the longest options in either language; (c) no record's aliases name another test; (d) every decision opens before the result that answers it, and no feedback, objective title, hint or response leaks a later result (KIT §3.16); (e) doing nothing scores 0, a wrong first answer scores below the reference, a late step keeps the case finishable; (f) plain questions reach the right history and exam items in both languages (KIT §3.10; try at least 15 natural phrasings per language beyond the case's testUtterances, and examination requests in lay words), fixing gaps with keywords; (g) plain orders in both languages reach the right intervention and not a contraindicated neighbour, and a negated order withholds.
5. VOICE, PRIVACY, SPOILERS, IN-WORLD, README: as STANDARD §3-§4 and the kit (§3.17: no out-of-date engine limits); the README's numbers (counts, measured scores) match the files; its review status is honest (it must say this round happened, with the date 2026-11-14 or later as today's date, and what remains to verify).
Then FIX every critical and major finding that holds (if one does not hold, say why), and minor ones when clearly right and cheap; keep case.json and README coherent; add a line to the README's 1.1.0 changelog entry ("Review round ${round} (<date>): …", what it found and changed). Re-run every STANDARD §5 check on the final files until all pass.
${earlierFile ? `The critical and major findings of the rounds before this run are in ${earlierFile} (JSON): read it first (do not just re-check them: they are fixed or answered; look for what they missed).` : ''}
${earlier && earlier.length ? `The earlier rounds of this run found (do not just re-check these: they are fixed or answered; look for what they missed): ${JSON.stringify(earlier).slice(0, 9000)}` : round > 1 && !earlierFile ? 'The earlier rounds\' findings are not available here; their changes are in the git log of the case, and the README\'s changelog and To verify list summarise them.' : ''}
${round === 1 ? (author ? `The author reported: ${JSON.stringify(author).slice(0, 12000)}` : reportFile ? `The author's report (an earlier run authored this case) is in ${reportFile} (JSON): read it first, then the README (extraction table, changelog, To verify).` : 'The author\'s report is not available (an earlier run authored this case): read its README (extraction table, changelog, To verify) instead.') : ''}
Severity: critical = teaches something unsafe or false, or invents/changes a patient fact; major = substantive fact, guideline, teaching or validity gap; minor = polish.`

const brief = (r) => ({ round: r.round, findings: r.findings.map((f) => ({ severity: f.severity, area: f.area, location: f.location, problem: f.problem.slice(0, 300), fixed: f.fixed })) })

const rounds = async (c, author) => {
  const done = []
  for (let round = c.from || 1; round <= MAX_ROUND; round++) {
    const r = await agent(roundPrompt(c.id, round, done, author, c.reportFile, c.earlierFile || (c.earlier === true ? `${SP}/pr5/earlier/${c.id}.json` : null)), { label: `review${round}:${c.id}`, phase: 'Review rounds', schema: ROUND_OUT })
    if (!r) { log(`${c.id} round ${round}: no result (a later run continues from this round)`); return { id: c.id, last: round - 1, complete: false } }
    done.push(brief(r))
    const serious = r.findings.filter((f) => f.severity !== 'minor').length
    log(`${c.id} round ${round}: ${r.findings.length} findings (${serious} critical/major); checks ${r.allChecksPass ? 'pass' : 'FAIL'}${r.sharedChanges.length ? `; shared changes: ${r.sharedChanges.length}` : ''}`)
    if (round >= MIN_ROUND && !serious && r.allChecksPass) return { id: c.id, last: round, complete: true }
  }
  return { id: c.id, last: MAX_ROUND, complete: true }
}

const queue = [...args.cases]
const results = []
const lane = async () => {
  while (queue.length) {
    const c = queue.shift()
    if (c.mode === 'author') {
      const a = await agent(authorPrompt(c.id), { label: `author:${c.id}`, phase: 'Author', schema: AUTHOR_OUT })
      if (!a) { log(`author:${c.id} returned nothing: a later run continues the draft`); results.push({ id: c.id, last: 0, complete: false }); continue }
      results.push(await rounds({ id: c.id, from: 1 }, a))
    } else {
      results.push(await rounds(c, null))
    }
  }
}
await parallel([() => lane(), () => lane()])
log(`${results.filter((x) => x.complete).length}/${args.cases.length} cases through their review rounds`)
return results
