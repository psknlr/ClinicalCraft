export const meta = {
  name: 'cmcr105-second-review',
  description: 'A second and, where needed, third independent review of re-authored CMCR-105 cases (already reviewed once and committed): exhaustive fact tracing, guideline statements checked in their texts, the kit\'s checklist, assessment replays; fixes; repeated until a round finds no critical or major issue',
  phases: [
    { title: 'Second review', detail: 'one fresh reviewer per case: every patient fact traced, every guideline statement checked, the checklist, replays; then the fixes and all checks' },
    { title: 'Further rounds', detail: 'a new reviewer while the last round found a critical or major issue (at most two more)' },
  ],
}

// args: { cases: string[], maxRounds?: number }   (round 2 = the second review; a case's first review was in reauthor-v4/v5)
const SP = '/tmp/claude-0/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/scratchpad'
const W = `${SP}/pr5/wt`
const MAX_ROUND = 2 + (args.maxRounds ?? 2)

const COMMON = `Context: ClinicalCraft, a bilingual (zh-CN + en) clinical-simulation teaching framework (TypeScript ESM monorepo; CLAUDE.md conventions apply). You work ONLY in the git worktree ${W} (branch pr5-local: the revision of PR psknlr/ClinicalCraft#5, whose 105 cases tagged cmcr-105 were generated from templates in version 1.0.0 and are being re-authored to the library's clinical content standard). Read first, in full: ${SP}/pr5/STANDARD.md (the revision standard; §6 governs version 1.1.0, written from the facts 1.0.0 recorded because the full source articles are not available) and ${SP}/pr5/KIT.md (where things are, how the engine evaluates what you write, the mistakes earlier reviews caught — §3 items 1-16 —, the safety-outcome rules).
RULES: touch only packages/content/cases/<your case>/ and your own scratch directory ${SP}/work-<your case>/ (scripts, notes). Do NOT touch git (read-only git show/log/diff are fine) and do not edit shared files (docs, tests, scripts, the source map, the media review, facilities, catalogs): report a needed shared change instead. Other agents work in the same worktree on other cases at the same time. Run vitest with --maxWorkers=1 (shared machine) and keep command output short (tail/grep). Write JSON with 2-space indentation, atomically (temp file + rename). Every check of STANDARD §5 must pass before you finish (\`scripts/case-check.ts\` now also probes plain opening questions in both languages: KIT §3.10); never weaken a check.`

const FACTS = (id) => `THE FACT BASE of ${id} (version 1.0.0, commit 88ed0d2): \`git -C ${W} show 88ed0d2:packages/content/cases/${id}/case.json\` and \`git -C ${W} show 88ed0d2:packages/content/cases/${id}/README.md\` — every patient fact of 1.1.0 must trace to it. Its source-map entry (article URL, DOI verified or pending): scripts/cmcr-105-sources.json; its figures and their review: scripts/cmcr-105-media-review.json. The case's history on this branch: \`git -C ${W} log --oneline -- packages/content/cases/${id}\` (its 1.1.0 commit and the first review's fixes).`

const OUT = {
  type: 'object',
  properties: {
    caseId: { type: 'string' },
    round: { type: 'number', description: 'the review round you were given (2 = second review)' },
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
    checks: { type: 'string', description: 'each STANDARD §5 check on the final files and its result' },
    allChecksPass: { type: 'boolean' },
  },
  required: ['caseId', 'round', 'factsChecked', 'guidelinesChecked', 'findings', 'checks', 'allChecksPass'],
}

const prompt = (id, round, earlier) => `${COMMON}

${FACTS(id)}

YOUR TASK: review round ${round} of the re-authored case ${id} (version 1.1.0). The case was authored, then reviewed and fixed by an independent reviewer${round > 2 ? ', then reviewed again' : ''}; you are a fresh reviewer and wrote none of it. Your job is to find what the earlier rounds missed, then fix it. Read the standard, the kit, the 1.0.0 fact base, then the case.json (section by section) and README in full. Work through these, writing your notes to ${SP}/work-${id}/review${round}.md as you go (an earlier attempt may have left notes there: continue from them):
1. EXHAUSTIVE FACT TRACE. List every string of case.json and README that states a patient fact — history answers, the persona, the triage note, exam findings, every investigation result and note, record texts, staff knowledge, decision prompts and feedback, intervention responses and harms, objectives and hints, the debrief (conclusion, key reasoning, teaching points), learning outcomes, the README's clinical summary and 中文摘要 — and trace each, in BOTH languages, to 1.0.0. Hunt specifically for KIT §3's classes: changed facts (1), invented descriptors (2), attributed treatments (3), added specificity (11: specimen, modality, approach, side, sample), widened/narrowed/graded facts in another voice (12: negatives, degrees, constancy, extent, "a few", events), sequences or simultaneity 1.0.0 does not state (13), values graded against an unrecorded reference range. zh and en must state exactly the same facts. An added or changed fact is critical; a clinically relevant dropped fact is major.
2. GUIDELINE STATEMENTS. For every statement the case attributes to a guideline, consensus, trial or textbook (body, title, year, threshold, dose, recommendation class): find the statement in the source's own text — WebSearch and WebFetch; the publisher's full text, PMC, the society's site; not an abstract, a press release or a secondary summary — for the patient's subgroup, and check the edition is current (a superseded edition cited as current is major). If you cannot reach the text, say so in guidelinesChecked, soften the attribution (teach the point without the guideline's name, or name the source that holds it) and list it in the README's To verify. An unverifiable statement asserted as a guideline's is major; a wrong threshold, dose or recommendation is critical.
3. CLINICAL ACCURACY of every keyed answer, feedback, harm text, dose (doseSpec and text), critical flag and teaching point against current practice; the safety outcome (KIT §6): critical flags, presets, high-alert medicines.
4. ASSESSMENT REPLAYS (write small scripts in your scratch directory with @clinicalcraft/core: \`npx tsx --conditions=source <script>\` from ${W}): (a) each harmful or contraindicated act added to the reference path lowers the score or fails the safety outcome (KIT §3.15c); (b) select-all keys are not exactly the longest options in either language; (c) no record's aliases name another test; (d) every decision opens before the result that answers it, and no feedback, objective title, hint or response leaks a later result (KIT §3.16); (e) doing nothing scores 0, a wrong first answer scores below the reference, a late step keeps the case finishable; (f) plain questions reach the right history and exam items in both languages (KIT §3.10; try at least 15 natural phrasings per language beyond the case's testUtterances, and examination requests in lay words), fixing gaps with keywords.
5. VOICE, PRIVACY, SPOILERS, IN-WORLD, README: as STANDARD §3-§4 and the kit; the README's numbers (counts, measured scores) match the files; its review status is honest (it must say this round happened, with the date 2026-11-14, and what remains to verify).
Then FIX every critical and major finding that holds (if one does not hold, say why), and minor ones when clearly right and cheap; keep case.json and README coherent; add a line to the README's 1.1.0 changelog entry ("Review round ${round} (2026-11-14): …", what it found and changed). Re-run every STANDARD §5 check on the final files until all pass.
${earlier ? `The earlier rounds of this workflow found (do not just re-check these: they are fixed or answered; look for what they missed): ${JSON.stringify(earlier).slice(0, 8000)}` : 'The first review\'s findings are not available here; its changes are in the git log of the case, and the README\'s changelog and To verify list summarise them.'}
Severity: critical = teaches something unsafe or false, or invents/changes a patient fact; major = substantive fact, guideline, teaching or validity gap; minor = polish.`

const queue = [...args.cases]
const results = []
const lane = async () => {
  while (queue.length) {
    const id = queue.shift()
    const rounds = []
    for (let round = 2; round <= MAX_ROUND; round++) {
      const r = await agent(prompt(id, round, rounds.length ? rounds.map((x) => ({ round: x.round, findings: x.findings.map((f) => ({ severity: f.severity, area: f.area, location: f.location, problem: f.problem.slice(0, 300), fixed: f.fixed })) })) : null), { label: `review${round}:${id}`, phase: round === 2 ? 'Second review' : 'Further rounds', schema: OUT })
      if (!r) break
      rounds.push(r)
      const serious = r.findings.filter((f) => f.severity !== 'minor').length
      log(`${id} round ${round}: ${r.findings.length} findings (${serious} critical/major); checks ${r.allChecksPass ? 'pass' : 'FAIL'}`)
      if (!serious && r.allChecksPass) break
    }
    results.push({ id, rounds })
  }
}
await parallel([() => lane(), () => lane()])
return results.map((x) => ({ id: x.id, rounds: x.rounds.map((r) => ({ round: r.round, allChecksPass: r.allChecksPass, critical: r.findings.filter((f) => f.severity === 'critical').length, major: r.findings.filter((f) => f.severity === 'major').length, minor: r.findings.filter((f) => f.severity === 'minor').length })) }))
