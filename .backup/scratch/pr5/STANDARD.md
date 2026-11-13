# Re-authoring standard for the 105 CMCR cases (version 1.1.0)

Brief for the per-case re-authoring of the 105 cases tagged `cmcr-105` (PR psknlr/ClinicalCraft#5, branch
`codex/cmcr-105-multispecialty`). Read it in full before you write; then read KIT.md (next to this file), which
says where things are, how the engine evaluates what you write and which mistakes earlier reviews caught.

Authoritative where this text is silent: the collection contract `packages/content/src/cmcr-105.test.ts` (what is
checked per case), `docs/CASE_AUTHORING.md` (the clinical content standard, §9; the safety outcome, §6–§7) and
`docs/GLOSSARY.md` (words). Models of the target depth and form: the reviewed cases `cmcr-1653411`, `cmcr-655458`,
`cmcr-1067495`, `cmcr-44848`, `cmcr-857041`, `cmcr-33790`, `cmcr-1551888`, `cmcr-561144`, `cmcr-70094` (read one in
full, skim a second for a different setting; never copy their sentences).

(This text was reconstructed on 2026-11-13 after the authoring environment was lost; the rules are unchanged.)

## 0. Facts and grounding

0.1 **Facts come from the source report only.** For version 1.1.0 the source is what version 1.0.0 recorded (§6).
Every patient fact — a history answer in either language, an examination finding, a value and its unit, a record's
text, a timing, a drug or dose that was given, the outcome — traces to the fact base. An added or changed fact is a
critical error; a clinically relevant fact dropped is a major one.

0.2 **Nothing is invented.** No adjective, distribution, severity, side, size, duration, sequence or destination the
fact base does not state ("petechiae" stays "petechiae", "discharged on day 13" never becomes "went home
uneventfully"). No "normal" default for anything unrecorded: vital signs, labs, examination of other systems, past
history, medicines, allergies, family and social history stay unknown unless recorded.

0.3 **What is not recorded stays unknown, in voice.** The patient (or carer) says so in their own words ("I'm not
sure, doctor." / "这个我说不上来，医生。"); a record without a result says "No result is recorded for this test." /
"该检查没有记录结果。"; an examination the case does not hold uses `examNotRecorded`. Never authoring language in a
person's mouth or in a record ("the source does not provide", "原报告未提供", "the report does not say" — the
contract's `META` pattern fails them).

0.4 **Inconsistencies are kept, not resolved.** Where 1.0.0 contradicts itself (zh vs en, two timings that cannot
both hold), keep both readings in neutral wording and list the contradiction under README "To verify".

0.5 **Teaching devices are labelled.** Staging the case (which room a phase is in, what is read at a records
terminal, a staff member who asks) is allowed when the README's "Source and adaptation" labels it as teaching
design, not as a fact of the report.

0.6 **Privacy.** No dates, hospitals, cities, real names or identifiers; bilingual pseudonyms only, unique across the
library and distinct from the cmcr-20 cases.

## 1. The case (case.json)

1.1 **Frame.** `version` "1.1.0"; `locales` ["zh-CN","en"]; `clock.mode` "static" and no `physiology` (historical
reports establish no physiological response model); `facility` "general-hospital"; `provenance.kind`
"published-case" with the DOI exactly as `scripts/cmcr-105-sources.json` verifies it (a pending DOI stays pending);
the source article's URL in `debrief.references`.

1.2 **Review status (honest).** `provenance.review.status` "editorial"; reviewers ["ClinicalCraft editorial review
(AI-assisted)"]; at least 3 named guidelines in `review.guidelines`; `review.notes` in both languages saying the case
has not yet been reviewed by a licensed clinician ("not yet reviewed by a licensed clinician") and, while
`extensions.sourceTextChecked` is false, that the facts have not yet been checked against the full source article
("not yet been checked against the full source article" / "尚未对照原文全文核对").

1.3 **Phases (3–5): staged evidence.** The first phase holds what is known on arrival; later phases open by
`enterWhen` on the learner's acts and answers (they advance by themselves); results and records belong to the phase
in which they existed. The final phase is the outcome: `learnerSwitchable: false`, and its `enterWhen` waits for
every decision. The outcome record and any outcome figure appear only there.

1.4 **History (14–40 items; 4–10 required; at least one `disclosure: "unknown"`).** First person, lay and
age-appropriate; every answer that is not unknown has a `source`. A patient who cannot speak (an infant, an
unconscious adult) has `nonVerbalWhen` true in every phase and a companion whose persona `answersHistory`; a child
under 2 has `appearance.stature` "infant". A companion's presentation follows KIT §5. Keywords and aliases make the
natural questions reach the right item (test them).

1.5 **Examination.** Each finding with its `source`, in the phase it was found; nothing more than recorded.

1.6 **Investigations (6–20).** The decisive records of the report (read at a records terminal: `requires`
["records"], `performedAt` "records", `risk` "none") and the tests a learner would order now (orderable where the
general hospital provides them; `caseCapabilityGaps` must be empty). Results per phase with their `source`; a test the
report does not report is `available: false` with "No result is recorded for this test.". Staged records are read by
phase (KIT §2).

1.7 **Interventions (7–20).** The report's management, today's guideline steps, and the tempting wrong or
historical steps, each wrong one with a `harm` text that names its guidance (body and year). `effects` is empty (no
simulated physiology) and every intervention has a `response` in both languages saying what happens or what is
recorded. Risk, `indicatedWhen` (time windows for timed acts) and `contraindicatedWhen` as the clinical logic
requires; the safety outcome rules (KIT §6: `critical`, `doseSpec`, high-alert presets, names and aliases).

1.8 **Decisions (4–5) at the real decision points.** 3–5 options each, option ids naming the content, feedback of
its own on every option (why right or wrong, with guidance), none open at the start, each opening before the result
that answers it. Distractors are plausible and written with the key's specificity, register and length (KIT §2:
length cue). The prompt reveals only what the decision needs, never the answer.

1.9 **Objectives (5–6), the HUD's chapters.** Spoiler-free titles and hints; `completeWhen` never a condition that
can become permanently false (KIT §2).

1.10 **Rubric (10–15).** A safety item (domain "safety": the avoided harms, with `scoredWhen` listing every harmful
intervention and the decision that exposes the choice); decisions scored with `decidedFirstTry`; an examiner-judged
communication item (no `met`; `judgeGuidance` specific to this patient: Calgary–Cambridge, SPIKES where there is bad
news, teach-back); 1–3 critical items, each an act done in time (`{intervened, whenIndicated: true}` or a gated
phase) — never a decision alone, never creditable in hindsight. No rubric text repeats an option. Doing nothing
scores 0; a wrong first answer scores below the reference path.

1.11 **Staff.** An attending (`revealsDiagnosis: false`; Socratic, debriefs with PEARLS) and a nurse or midwife
(hands over with ISBAR), plus the specialists the case needs; their knowledge holds only case facts and guidance.

1.12 **Debrief.** `conclusion` (en ≥ 400 characters, zh-CN ≥ 120); `keyReasoning` 4–6 steps; `teachingPoints` 4–6,
at least 2 dated and guideline-attributed (body, title, year), contrasting the report's practice with today's where
they differ; `references` ≥ 4 in Vancouver style, the source article first, DOIs verified; `unknowns` ≥ 4.

1.13 **Learning outcomes (5–6)**, measurable and specific to this case.

1.14 **Spoilers.** Title "<presenting complaint> · <age> <sex>" in both languages; the library summary and the
triage note are different texts and neither names the diagnosis; no spoiler in the opening line, objective titles
or hints, record or figure names.

1.15 **Matcher corpus.** `extensions.testUtterances` ≥ 35 in both languages: genuine paraphrases (none identical to
a canonical question), at least 2 look-alike negatives (`expect: []`), at least one for every required history item.

1.16 **Figures.** Only figures approved in `scripts/cmcr-105-media-review.json` (`localOnly`, path
`/local-assets/cases/<id>/…`, sha256, credit), with a descriptive, spoiler-free title, attached where they do not
reveal an answer early (usually the outcome record).

## 2. Clinical accuracy and currency

- Keyed answers, feedback, doses, harms, teaching points and learning outcomes follow current guidance; name the body
  and year; verify a citation, version or threshold online when not certain (an unverifiable citation stated as fact
  is a major finding). Thresholds belong to the category the case can establish; population figures to the right
  subgroup (KIT §3).
- The report's historical practice stays the recorded fact and is taught against today's guidance — never presented
  as current, never rewritten.
- A keyed act names its preconditions (platelets and clotting before an LP; no TOE without asking about varices…).
- Doses: only doses the case or the cited guidance states; units always; KIT §6 for presets.

## 3. Voice, language, register

- zh-CN and en state the same facts and teach the same points; zh is natural clinical Chinese, en natural clinical
  English; learner-facing words per docs/GLOSSARY.md.
- Patients speak as patients (or carers as carers), staff as professionals; no authoring language anywhere a learner
  meets a person or a record.

## 4. README.md — the facilitator guide (CASE_AUTHORING §9.6)

These `##` sections, in this order (the contract checks the headings): **Case card** (setting, level, time, the
patient, what the learner can do); **Learning outcomes**; **Clinical summary (spoilers)**; **Scenario timeline and
physiology** (phases, what opens each; static clock); **Decisions and assessment** (objectives; decisions with the
key and why; the rubric with weights; "How wrong choices score", measured with core `assess`: reference, do nothing,
wrong first, each dangerous act; and the **Safety outcome.** paragraph, KIT §6); **Reference path (`solution`)**;
**Clinical numbers check** (every number, its source and any derived value); **Facilitator notes** (debrief questions
with PEARLS; common learner errors and how the case surfaces them); **Embodied mode** (records vs bedside, non-verbal
handling, facility, capabilities); **Source and adaptation (fidelity limits)** (what was adapted, the extraction
summary, contradictions kept, privacy, labelled teaching devices); **Matcher notes**; **References** (with
`### To verify`: what the source pass must check, and what a clinician of the specialty should confirm);
**Changelog** (`### 1.1.0 — <date> — …`, then `### 1.0.0`); **Validation** (the §5 commands); **中文摘要** (病例概要、
学习目标、关键决策、复盘要点、安全结果).

## 5. Per-case validation (all must pass)

From the worktree root:

```sh
npm run -s cc -- cases validate packages/content/cases/<id>/case.json --strict --lang en   # 0 errors, 0 warnings (incl. the new lints)
npm run -s cc -- cases verify <id> --lang en                                                 # reference path 100 %
npx tsx --conditions=source scripts/case-check.ts <id>                                       # depth floor, do-nothing 0, wrong-first < reference, patient voice
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "<id>:"              # collection contract for this case
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "<id>:"  # in-world demonstration, en + zh-CN
```

Write JSON with 2-space indentation, write atomically (temp file + rename), touch only
`packages/content/cases/<id>/` — shared files (docs, tests, source map, media review, facility, scripts) are
integrated centrally.

## 6. Authoring from the recorded facts (version 1.1.0, before the source texts are available)

The full source articles are not available in the authoring environment yet. Until they are, each case is
re-authored from the facts its version 1.0.0 already records, and the source pass (restoring what the template
dropped, checking every fact against the article, `extensions.sourceTextChecked: true`) follows later. This
section overrides §0.1 and §1.2's facts rule for version 1.1.0; everything else in this standard applies unchanged.

1. **The fact base** is version 1.0.0 at commit `88ed0d2`: `git show 88ed0d2:packages/content/cases/<id>/case.json`
   and `…/README.md`. Read both in full; every statement in them that is a patient fact is kept (split into items,
   placed in the phase it belongs to), and nothing is added.
2. **What 1.0.0 got wrong is replaced, not kept:** its template (three decisions of three options, no
   interventions, 15 generic history slots, hindsight critical items, "the source does not provide" answers) and its
   teaching errors (for example a key that rewarded continuing a drug the guidance stops, or that did not withdraw
   suspect drugs first).
3. **`extensions.sourceTextChecked: false`**, and the review notes say so (§1.2). The README's "Source and
   adaptation" states that the facts are 1.0.0's extraction and the check against the full article is pending, and
   its "To verify" lists what that check must confirm.
4. **Changelog:** `### 1.1.0 — <date> — re-authored to the clinical content standard from the facts recorded in
   1.0.0; not yet checked against the full source article`, with what changed and why (template defects, safety
   fixes, added interventions and decisions), and `### 1.0.0` describing the template version.
5. **Your report** maps every 1.0.0 fact to where it went (the extraction table), lists any inference (derived, not
   new) and every contradiction kept, and confirms nothing was added.
