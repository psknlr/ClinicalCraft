export const meta = {
  name: 'cmcr105-reauthor-v4',
  description: 'Re-author CMCR-105 cases from the facts their 1.0.0 records (sources unavailable): author, then one independent reviewer who also applies the fixes',
  phases: [
    { title: 'Author', detail: 'one agent per case: STANDARD §0-§6 and KIT from the 1.0.0 fact base (skipped for cases already authored)' },
    { title: 'Review and fix', detail: 'one independent reviewer per case: facts, clinical accuracy, assessment validity, voice, privacy, spoilers; then the fixes and all checks' },
  ],
}

// args: { cases: { id: string, mode: 'author' | 'review' }[] }
//   author: write the case (continuing any partial 1.1.0 draft), then review it
//   review: the case is already authored at 1.1.0 (the author's report is not available): review and fix it
const SP = '/tmp/claude-0/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/scratchpad'
const W = `${SP}/pr5/wt`
const CASES = args.cases

const COMMON = `Context: ClinicalCraft, a bilingual (zh-CN + en) clinical-simulation teaching framework (TypeScript ESM monorepo; CLAUDE.md conventions apply). You work ONLY in the git worktree ${W} (branch pr5-local: the revision of PR psknlr/ClinicalCraft#5, whose 105 cases tagged cmcr-105 were generated from templates in version 1.0.0 and are being re-authored to the library's clinical content standard). Read first, in full: ${SP}/pr5/STANDARD.md (the revision standard; §6 governs version 1.1.0, written from the facts 1.0.0 recorded because the full source articles are not available) and ${SP}/pr5/KIT.md (where things are, how the engine evaluates what you write, the mistakes earlier reviews caught, the safety-outcome rules). Then read ONE reviewed case in full as a model of depth and form (KIT §1) — never copy its sentences.
RULES: touch only packages/content/cases/<your case>/ and your own scratch directory ${SP}/work-<your case>/ (builder scripts, notes). Do NOT touch git (read-only git show/log/diff are fine) and do not edit shared files (docs, tests, scripts, the source map, the media review, facilities, catalogs): report a needed shared change instead. Other agents work in the same worktree on other cases at the same time. Run vitest with --maxWorkers=1 (shared machine) and keep command output short (tail/grep). Write JSON with 2-space indentation, atomically (temp file + rename), early and often: an earlier attempt may have been stopped by a usage limit or a restart, and so may you — if the case folder already holds a partial 1.1.0 draft or a review's partial fixes, read them and continue rather than starting over. Every check of STANDARD §5 must pass before you finish; never weaken a check.`

const FACTS = (id) => `THE FACT BASE of ${id} (version 1.0.0, commit 88ed0d2): \`git -C ${W} show 88ed0d2:packages/content/cases/${id}/case.json\` and \`git -C ${W} show 88ed0d2:packages/content/cases/${id}/README.md\` — every patient fact of 1.1.0 must trace to it. Its source-map entry (article URL, DOI verified or pending): scripts/cmcr-105-sources.json; its figures and their review: scripts/cmcr-105-media-review.json.`

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

const REVIEWFIX_OUT = {
  type: 'object',
  properties: {
    caseId: { type: 'string' },
    factsChecked: { type: 'number', description: 'how many patient facts you traced to 1.0.0' },
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
    checks: { type: 'string', description: 'each STANDARD §5 check on the final files and its result' },
    allChecksPass: { type: 'boolean' },
  },
  required: ['caseId', 'factsChecked', 'findings', 'checks', 'allChecksPass'],
}

const authorPrompt = (id) => `${COMMON}

${FACTS(id)}

YOUR TASK: re-author ${id} to version 1.1.0 — a case a clinician-educator of its specialty would be proud to teach with: thorough, professional, safe and true to its facts. Work through STANDARD §0-§6 and the KIT:
1. Read the fact base in full and list every patient fact (your extraction table), every contradiction between its fields or languages, and what it leaves unknown.
2. Design the teaching: the real decision points of this patient's course and today's guidance at each; phases that stage the evidence; 4-5 decisions that open before the result that answers them; the report's management, today's steps and the tempting wrong or historical steps as interventions (harm texts naming their guidance; critical and doseSpec per KIT §6); a rubric whose critical items are acts done in time; the attending and the nurse; dated, guideline-attributed teaching points; the history in the patient's (or carer's) own words.
3. Write case.json and README.md (the 16-part facilitator guide of STANDARD §4, with the measured scores, the Safety outcome paragraph and the To-verify list).
4. Validate and iterate until every check of STANDARD §5 passes; verify every guideline citation, edition and threshold you are not certain of with WebSearch.
Report as the schema asks; the extraction must account for every 1.0.0 fact.`

const reviewFixPrompt = (id, a) => `${COMMON}

${FACTS(id)}

YOUR TASK: an independent, adversarial review of the re-authored case ${id} (version 1.1.0) — you did not write it — and then the fixes. Read the standard (incl. §6) and the kit, the 1.0.0 fact base via git show, then the new case.json and README.md in full. Check, quoting both texts:
1. Fact preservation: trace EVERY patient fact of the new case (history answers in both languages, exam findings, every value and unit, record texts, timings, drugs and doses given, outcome) to 1.0.0. An added or changed fact is critical; a clinically relevant 1.0.0 fact the new case dropped is major. zh and en must state the same facts.
2. Clinical accuracy and currency: keyed answers, feedback, intervention doses, harms, teaching points and learning outcomes against current guidance (body, title, year; flag invented or misdated guidance, wrong thresholds or doses). Verify with WebSearch every guideline citation, version and quoted threshold you are not certain of; an unverifiable citation stated as fact is major.
3. Assessment validity: neutral option ids; no length or hedging cue; plausible distractors; decisions unlock before the result that answers them; prompts reveal only what requires guarantees; critical items are acts done in time (whenIndicated or a gated phase, never hindsight, never a phase-bound objective); scoredWhen on avoided harms; doing nothing scores 0; the final phase waits for every decision; the case stays finishable when a step is done late (the contract checks it); the safety outcome (critical flags, presets, high-alert medicines, names and aliases: KIT §6).
4. Teaching design, patient voice (lay, first person, age-appropriate, no authoring language), privacy (no dates, hospitals, identifiers), spoilers (title, summary, triage, opening line, objective titles/hints, record names, figure titles), in-world fidelity (records vs bedside, capabilities, non-verbal handling), README to §4 with an honest status and a To-verify list.
Then FIX: every critical and major finding that holds against the 1.0.0 fact base, the standard and current guidance (if one does not hold, say why); minor ones when clearly right and cheap. Keep the teaching coherent across case.json and README. Re-run every check of STANDARD §5 on the final files until all pass (never weaken a check), and report each finding with what you did.
${a ? `The author reported: ${JSON.stringify(a).slice(0, 12000)}` : 'The author\'s report is not available (an earlier run authored this case): read its README (extraction table, changelog, To verify) instead.'}
Severity: critical = teaches something unsafe or false, or invents/changes a patient fact; major = substantive fact, teaching or validity gap; minor = polish.`

const results = await pipeline(
  CASES,
  (c) => (c.mode === 'review' ? Promise.resolve({ authored: 'earlier' }) : agent(authorPrompt(c.id), { label: `author:${c.id}`, phase: 'Author', schema: AUTHOR_OUT })),
  (a, c) => {
    const report = a && !a.authored ? a : null
    return agent(reviewFixPrompt(c.id, report), { label: `review+fix:${c.id}`, phase: 'Review and fix', schema: REVIEWFIX_OUT }).then((r) => ({ id: c.id, author: report, review: r }))
  },
)
const done = results.filter(Boolean)
log(`${done.length}/${CASES.length} cases through the pipeline; ${done.filter((x) => x.review && x.review.allChecksPass).length} with all checks passing`)
return done.map((x) => ({ id: x.id, allChecksPass: !!(x.review && x.review.allChecksPass), findings: x.review ? x.review.findings.length : null }))
