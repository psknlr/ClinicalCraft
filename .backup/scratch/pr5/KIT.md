# Authoring kit for the CMCR-105 re-authoring (read after STANDARD.md)

Distilled from the pilot (cmcr-1067495, cmcr-44848, cmcr-857041, cmcr-1653411, cmcr-655458): where the schema
lives, how the engine evaluates what you write, and the mistakes the independent reviews caught. It saves you the
exploration the pilot authors needed; it does not replace STANDARD.md.

## 1. Where things are

- Case schema (authoritative, read the parts you use): `packages/core/src/schema/case.ts` —
  Persona/Companion 55-84, Patient 85-129, Phase 144-166, HistoryItem 221-293, ExamFinding 296-321,
  LabValue/Result/Investigation 322-405, Intervention 471-520, Waypoint/Objective 654-680,
  Decision 681-703, RubricItem 704-728, Debrief 729-746, NpcBrief 747-768, Case 769-855 (line numbers have moved a
  little since the audit's fields were added; search for the schema name).
  Condition DSL: `packages/core/src/schema/common.ts` (the `Condition` type, ~line 80).
- Cases that passed every check and an independent review (models of the target depth and form, after their fixes):
  `packages/content/cases/cmcr-1653411`, `cmcr-655458`, `cmcr-1067495`, `cmcr-44848`, `cmcr-857041`, `cmcr-33790`,
  `cmcr-1551888`, `cmcr-561144`, `cmcr-70094` — and the revised exemplars `cmcr-70044`, `cmcr-1551890`. Reading ONE
  of them in full is enough; skim a second for a different setting. Never copy their sentences: the collection test
  fails a teaching text shared by > 2 cases.
- Content lints: `packages/core/src/engine/content-standard.ts` (what `cases validate --strict` checks).

## 2. How the engine evaluates what you write

- **The first phase can never be selected again** once the case has left it (it has no `enterWhen`); a later
  phase can be selected again while its `enterWhen` holds. So an objective or decision that needs a record read
  (or a test ordered) in the first phase must either accept it from a later phase too
  (`{"any":[{"read":"x","phase":"admission"},{"read":"x","phase":"ward"}]}`) or the next phase must wait for it.
- **Phases advance by themselves** the moment a later phase's `enterWhen` holds (`timeline.ts`); the learner
  cannot switch to a phase with `learnerSwitchable: false`. The final follow-up phase must wait for every
  decision (`enterWhen` = flat `all` of `{decided: id}` for each decision, plus anything else); the contract
  checks this, following `objective`/`phase` references.
- **Objectives latch** the first moment their `completeWhen` holds (any order) and stay done.
- **Rubric `met` is evaluated on the final state.** A leaf like `{phase: "admission"}` is false at the end, so
  timing cannot be scored with a phase leaf in `met`. To score that an act was done IN TIME, give the
  intervention an `indicatedWhen` that is its time window (e.g. `{"phase": "admission"}`, or
  `{"not": {"read": "angiography", "phase": "course"}}`) and score `{"intervened": "x", "whenIndicated": true}`:
  it counts only doses given while `indicatedWhen` held (and `contraindicatedWhen` did not), judged at the moment
  of giving (new in core; `cases validate` errors if the intervention has no `indicatedWhen`). Or gate the phase
  that reveals the answer on the act itself (`enterWhen` includes `{"intervened": "x"}`).
- **Never put a condition that can become permanently false into an objective's `completeWhen`** (a
  `{"phase": …}` leaf, `whenIndicated`, `decidedFirstTry`, a `not`): objectives must ALL be complete before
  the case can be finished, so a learner who missed the window could never finish. The contract test checks
  this (it skips each act of the reference path, does it late, and requires the case still to finish).
- **`{read: id}` without `phase` is satisfied by reading ANY phase's result of that test — including an
  `available: false` "no result yet" placeholder.** Whenever a record is staged (different results per phase),
  every `read` in `requires`, `completeWhen`, `met`, `contraindicatedWhen`… must name the phase whose result
  matters: `{"read":"labs","phase":"day3"}`. Same for `ordered` (`phase` = the phase the order was placed in).
- **`decidedFirstTry`** is false for good once the first attempt is wrong: rubric only, never in `requires`,
  `completeWhen` or `enterWhen` (use `decided` / `attempted` there).
- **`scoredWhen`** on an avoided-harm item: the item counts only once its harm was possible; its `any` must list
  every harmful intervention and the decision that exposes the choice (lint `scoredWhen` coverage).
- **Doing nothing must score 0** at once and at the time limit: an item met by `not` alone needs `scoredWhen`.
- **A wrong first answer must score below the reference**: score decisions with `decidedFirstTry`.
- **Option ids reach the web board's markup and traces**: name the content (`tpe-now`, `steroids-alone`), never
  the role (`correct`, `supported`, `alt-1`, `a`, `yes`). Learners and agents see options as letters A, B, C… in a
  shuffled order, decisions as numbers.
- **Length cue**: the key may be the uniquely longest option in at most ONE decision per language. Write
  distractors with the same specificity, register and length as the key (and keys no longer than they need). In a
  select-all decision, the keys must not be exactly the longest options either.

## 3. Mistakes the pilot reviews caught (avoid them up front)

1. **Changed facts in teaching text.** A debrief line said "loss of the R wave" where the record says "fall in
   R-wave amplitude" (QS was recorded only later). Re-read every sentence of `conclusion`, `keyReasoning`,
   `teachingPoints`, feedback, NPC knowledge and the README against the records: same finding, same lead, same
   day, same value.
2. **Invented descriptors.** "Scattered petechiae" where 1.0.0 says "petechiae"; "discharged uneventfully" or "went
   home" where 1.0.0 says "discharged on day 13". No adjective, distribution, severity, side, size, timing or
   destination that 1.0.0 does not state.
3. **Treatments attributed to the recorded course** that 1.0.0 does not record ("the team gave medical therapy
   and planned elective angiography"). The README and feedback may describe only what 1.0.0 records as done; staff
   knowledge too (a surgeon's brief must not state a cannulation route the record does not give).
4. **Critical acts creditable in hindsight.** Calling the catheter laboratory after reading the angiography and
   outcome records; starting tumour-lysis prophylaxis three days late; antibiotics after the normal CSF. Score
   the time-critical act with `{"intervened": "x", "whenIndicated": true}` and a time-window `indicatedWhen`
   (§2), or gate the revealing phase on the act — never with a phase-bound objective (§2: it can make the case
   impossible to finish).
5. **A keyed act that ignores a recorded or unknown safety condition.** A lumbar puncture keyed in the first
   hour in a newborn with petechiae and an unknown platelet count, clotting and vitamin-K status; a TOE in the
   reference path with varices and clotting unknown. Name the precondition in the key, the feedback and the
   reference path (check platelets and clotting, correct them, then LP — or defer it and treat empirically).
6. **Guideline thresholds in the wrong category.** LDL-C < 1.4 mmol/L belongs to the 2023 Chinese lipid
   guideline's 超高危 (extreme risk), not 极高危 (< 1.8 mmol/L); and a category the recorded facts cannot
   establish must not be asserted. Quote a threshold only with the category the case can establish.
7. **Population statistics applied to the wrong subgroup.** An all-infant leukaemia survival figure quoted for a
   newborn with hyperleucocytosis (most likely KMT2A-rearranged, far poorer outcome). Use the subgroup figure, or
   no number.
8. **Unphased reads of staged records** (§2): a decision that "hands over" values the learner never read; an
   intervention trap that fires on a placeholder.
9. **A guideline year that does not hold the statement.** A recommendation quoted from the 2025 edition that only
   the 2021 edition makes. Verify the edition online; cite the edition that says it.
10. **Matcher gaps.** The chief complaint asked in plain words ("Are your legs swollen?", "What brings you in?")
    reaching the wrong item or none. Probe the natural questions and test them in `testUtterances`.
    Give the case ONE history item with topic `presenting-complaint`, available in the first phase, whose answer
    says what brought the patient (or carer) in and since when, in their words; give it the plain openers as keywords
    in both languages ("what brings you in", "what happened", "what's the problem", "tell me what's been going on",
    "how long", "when did it start"; 怎么了, 这次怎么了, 哪里不舒服, 怎么回事, 有什么不舒服, 多久了, 什么时候开始的).
    Probe them with `matchHistory` in the first phase (the reviews found them reaching nothing in 44 of 45 cases).

### The second round of reviews (2026-11-14): the most frequent critical and major findings

11. **Specificity added to a record or a fact.** "Serum amylase" where 1.0.0 says "amylase" (blood and urine
    amylase have different reference intervals); "transthoracic echocardiogram" where it says "echocardiography";
    "they took blood for gene tests" where only the result is recorded; "fresh thrombus" for "thrombus". Keep
    1.0.0's level of specificity in record names, results and teaching, and say in the result's note what is not
    recorded (specimen, modality, approach, side); the more specific names may stay in `aliases` for ordering.
12. **A recorded fact widened, narrowed or graded in another voice.** The patient's words, the persona and both
    languages must cover exactly what 1.0.0 records: "no chronic lung disease" is not "nothing wrong with my lungs
    before"; "treatment helped little" is not "no effect"; "dry mouth for a month" is not "dry all the time";
    "fatigue" is not "no strength at all"; "crepitus at the neck, anterior chest and abdominal wall" is not "from
    neck to abdominal wall"; "a few bibasal crackles" keeps "a few"; "became unresponsive soon after chest
    tightness" does not add a fall (倒下); "严重毁损" does not add a crush (压得稀烂). A value above a reference range
    that 1.0.0 does not give is "above the report's reference range" — never "mildly" or "markedly" raised.
13. **An order or a simultaneity 1.0.0 does not state.** "the other tests sent with them", "later in the
    admission", "after the transfer they took blood…", "three drugs started at once". State a sequence only when
    1.0.0 states it; otherwise the note says the timing is not recorded.
14. **A guideline credited with a statement it does not make** (the most frequent major finding). Examples the
    reviews caught: ATLS for a diagnostic rule it does not hold; the Endocrine Society 2011 hyperprolactinaemia
    guideline for other hormones; the WHO laboratory manual for a clinical rule the EAU guideline holds; ESC 2023
    ACS for "coma is no reason to defer PCI"; ERC–ESICM 2025 quoted with the wrong fever threshold (it targets
    ≤ 37.5 °C); ESC 2023 endocarditis's aminoglycoside (prosthetic-valve IE only) applied to a native valve; IAP/APA
    2013 cited as current (superseded by the 2025 revised international acute-pancreatitis guidelines). Find the
    statement in the guideline's own text (not its abstract or a secondary summary) for the patient's subgroup
    before you attribute it; if you cannot, teach it without a guideline name or name the source that holds it, and
    list it under To verify.
15. **Assessment gaps the checks do not catch.** (a) In a select-all decision the keys must not be exactly the
    longest options: measure the character lengths in both languages. (b) A record's aliases must not name another
    test (thyroid-function aliases on a parathyroid-hormone assay let the wrong order earn a critical item).
    (c) Every harmful act with a harm text must cost something: replay the reference path plus that act and check
    that the score falls or the safety outcome fails. (d) No `validate --strict` warning may remain: a warning fails
    STANDARD §5 (the "high-risk intervention … does not say whether giving it then is a critical safety failure"
    warning reached three reviews; KIT §6). (e) At least one history item with disclosure `unknown` (STANDARD 1.4).
16. **Leaks of later results.** A work-up feedback quoting a value only the follow-up record holds; objective
    titles (the journal lists later objectives by title from the start) that name the decision or the diagnosis
    ("decide on reperfusion"); the response of an act available before a decision that states its answer.

## 4. Practicalities

- Write the full case.json draft early (atomic rename) and iterate; a restart must not lose your work. If the case
  folder already holds a partial 1.1.0 draft from an earlier attempt, read it and continue from it.
- Validate often: `npm run -s cc -- cases validate packages/content/cases/<id>/case.json --strict --lang en`
  takes ~2 s; `cases verify <id>` ~3 s; `scripts/case-check.ts` ~5 s; the contract and in-world tests ~30-90 s each.
- The in-world demonstration (`embodied-autopilot.test.ts -t "<id>:"`) replays your `solution` in the general
  hospital: every test, intervention and record must be reachable there (`caseCapabilityGaps`).
- **Before you finish, sweep for §3's most frequent findings** (2, 11-13): grep your case.json and README for words
  of degree (mild, slight, marked, severe, fresh, all the time, constantly, never, completely; 轻度, 明显, 新鲜, 一直,
  老是, 完全), of time and order (then, after, later, with, at the same time, since; 后, 随后, 之后, 同时), of extent
  (from … to, whole, both, all; 全, 双, 均) and of specificity (serum, transthoracic, venous, arterial, blood, left,
  right; 血清, 经胸, 静脉, 动脉, 左, 右), and check each against 1.0.0; then re-read the English and Chinese
  conclusions side by side: the same facts, no more, no fewer.
- **Token economy** (your context is what the run costs; a whole case.json is ~150 KB): never `cat` a whole case.json
  or README — print the part you need (`python3 -I -c "import json;d=json.load(open('…/case.json'));print(json.dumps(d['rubric'],ensure_ascii=False,indent=1))"`,
  `grep -n`, `sed -n a,bp`); pipe long command output through `| tail -25` or `| grep -E "✗|error|warning|Tests "`; do
  not re-read a file you already have in context; read ONE exemplar in full (case.json section by section) and skim
  a second only for its setting. Write the case in a few large, complete edits rather than many small ones.

## 5. The figures in the 3D world (main's rules since 2026-11)

- The patient is drawn by `patient.sex`. A **companion** is drawn as neither man nor woman unless the case says
  who they are: when the companion's English name states it — "(his wife)", "(her mother)", "(his son)", or
  "Mr Li (…" / "Ms Li (…" / "Mrs Li (…" — set `companion.appearance.presentation` to "feminine" or "masculine" to
  match (a test checks this). When the relationship or sex is not recorded, leave `presentation` out and name them
  neutrally ("Ms Ouyang's relative (pseudonym)" / "欧阳女士的家属（化名）"); if their persona says the record does
  not say who they are, `presentation` must be absent. Hair says nothing about it.

## 6. The safety outcome (external audit of 2026-11-12; in core since 2026-11-13 — read CASE_AUTHORING §6-§7)

- **`critical` on every high-risk intervention that can be contraindicated.** Every `risk: "high"` intervention with a
  `contraindicatedWhen` states `"critical": true` or `"critical": false` (put it right after `risk`); `cases validate
  --strict` warns while it is unset. `true` = giving it while contraindicated is this case's dangerous error, with
  irreversible or life-threatening harm (lysis with a single-figure platelet count or 8 days after spinal surgery,
  intubating a talking patient with massive PE, steroids before the diagnostic samples of a suspected leukaemia,
  a nitrate in RV infarction): the run's safety outcome fails whatever the score, and every debrief and export shows
  it. `false` = a recoverable misjudgement (a non-preferred drug, a low-value test, advice the next clinician
  corrects). Judge each one as the specialty's examiner would; do not mark everything critical. A critical
  intervention normally also sits in a critical avoided-harm rubric item (`scoredWhen` lists it).
- **README:** one short paragraph `**Safety outcome.**` at the end of "Decisions and assessment" naming the critical
  (and the explicitly non-critical high-risk) interventions and why, and one sentence `**安全结果。**` in the 中文摘要.
- **`doseSpec`** (encouraged): for a medication with a single fixed dose that the case states in its `dose` text (e.g.
  "IM adrenaline 0.5 mg"), add `"doseSpec": {"amount": 0.5, "unit": "mg", "route": "IM"}` matching the text exactly
  (units: g, mg, microgram, mL, unit, mmol, each optionally `/kg` and `/h` or `/min`; routes IM IV IO SC PO SL PR IN INH
  TOP; `upTo` for a range). A learner who types a different dose is then challenged and nothing is given. Never
  invent a dose; leave it out for infusions, titrations, schedules and doses with alternatives.
- **The reference path must be safe:** `cases verify` now fails a `solution` that gives any intervention while it is
  contraindicated, has a dose error or ends with a safety-critical gate holding. (`errorRecovery` exists for cases
  that teach error recovery on purpose; these cases do not use it.)
- **Repeat doses:** a repeat's time window is `indicatedWhen` with `{"elapsedSince": {"intervened": "x", "gte": 5}}`
  (minutes since the last dose), scored with `{"intervened": "x", "whenIndicated": true, "minCount": 2}`.
- **The audit's second round (in core since 2026-11-13; `cases validate --strict` warns on each):**
  - Every **high-alert medicine** (an insulin, potassium, a heparin or LMWH, an opioid, a thrombolytic) whose `dose`
    text states exactly one dose or one range gets a `doseSpec` matching it. A bolus followed by an infusion, a
    schedule or alternatives are exempt — or split the item in two (bolus, infusion) when both matter.
  - An intervention's **name or aliases** state a dose only if it is the preset's, written first: "IM adrenaline
    300 micrograms (0.3 mL of 1 mg/mL)", not "IM adrenaline (1 mg/mL, 0.3 mL)". A learner who types the name is checked
    against the preset.
  - A **`critical: true`** intervention is `risk: "moderate"` or `"high"`, never low or none.
  - A preset may **span the doses the case's cited guidance allows** (`upTo`) around the dose its text states (text
    "aspirin 300 mg", preset 150–325 mg): a learner who orders another guideline dose is not challenged. Never
    wider than the guidance the case cites.
  - How an order is read and judged (docs/PROTOCOL.md §3.2): the engine reads the dose from the order's own words (zh
    and en numerals, a volume with its strength, a rate); an equivalent dose is given; a conflicting one is not (the
    nurse reads it back; a dose error is kept); a tenfold error, or for a critical or high-risk item a twofold
    overdose or another route, fails the safety outcome. Write `dose` texts a clinician would write, with units.
