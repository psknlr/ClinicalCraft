# cmcr-70044 — Cough and fever · 10-year-old boy

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary and triage note name neither the drug reaction nor the allergy label. The patient (小川 / Xiaochuan)
> and his parent are pseudonymous; the case is a teaching adaptation of a published case report, not medical
> advice.
> 导师指南，含剧透。患者及家长均为化名；本病例改编自已发表的病例报告，不构成医疗建议。

## Case card

| | |
|---|---|
| Case | `cmcr-70044` · v1.1.1 · CMCR collection (`cmcr-20`) |
| Source | 张睿, 裴亮, 王佳, 张晗, 韩晓华. 头孢噻肟钠/舒巴坦钠致过敏性休克一例. 中国小儿急救医学. 2014;21(1):63 |
| Setting | Children's ward (`inpatient`); the reaction happens at the bedside |
| Facility | `general-hospital` |
| Difficulty | 4 / 5 (recognition is a core skill; the difficulty is the adrenaline strength, dose, route and site, and the allergy-label decision before the dose) |
| Estimated time | ~30 min (static clock; four phases, four decisions, 15 interventions) |
| Specialty | Paediatrics, emergency medicine, clinical pharmacology |
| Languages | zh-CN (source), en |
| Learner level | Final-year medical students, foundation doctors and paediatric residents, ward nurses |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have a paediatric emergency clinician review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Clarify a reported penicillin allergy (drug, reaction, timing, treatment) before prescribing a β-lactam,
   and explain why a negative penicillin skin test does not predict a cephalosporin reaction.
2. Diagnose anaphylaxis at the bedside from acute skin, breathing and circulatory involvement minutes after a
   drug, without waiting for monitor values or tests.
3. Give IM adrenaline 1 mg/mL 0.3 mL (300 micrograms) into the anterolateral thigh of a 6–12-year-old of
   unknown weight, repeat it after 5 minutes if needed, and position him, give high-flow oxygen and a
   10 mL/kg crystalloid bolus (RCUK 2021).
4. Contrast the report's steroid-first, IV-push sequence with current guidance (RCUK 2021, EAACI 2021), and
   name the two tenfold concentration errors.
5. Plan care after the reaction: tryptase sampling, observation by severity, recording the culprit drug,
   avoiding re-exposure and referral to an allergy service.

These are `learningOutcomes` in `case.json`. They name the reaction, so front-ends show them before play only
behind the closed **Learning outcomes (5) · may reveal the diagnosis** disclosure and list them in every
debrief (CASE_AUTHORING §9.4, GLOSSARY §4).

## Clinical summary (spoilers)

A 10-year-old boy has had a cough for 10 days and fever for 5. Four days of IV cefuroxime, ambroxol and
Yanhuning (炎琥宁) at a local clinic did not help. He carries a “penicillin batch allergy” label; an atopic
constitution and drug allergy in the family are denied. The chest X-ray shows left-sided inflammation, the
admission examination is unremarkable, and he is admitted with acute bronchopneumonia. After a negative
penicillin skin test, cefotaxime/sulbactam 1.25 g in 5% glucose 100 mL is started at 30 drops/min. About
15 seconds later he suddenly cannot breathe, with perioral and throat numbness and itching all over; he is
dazed and pale, with a patchy raised red rash, profuse sweating, perioral cyanosis, frothing at the mouth,
RR about 50/min, strong regular heart sounds at 140/min, a weak pulse, cold peripheries and capillary refill
> 5 s. The monitor then shows BP 60/30 mmHg and SpO₂ 85%.

The report's team stopped the drug and kept the line open with saline, gave **dexamethasone 5 mg IV first**,
attached the monitor, gave nasal oxygen 3 L/min, and then — anaphylactic shock considered — **2.5 mL of
1/10 000 adrenaline as an IV push** (0.25 mg, derived). Five minutes later his BP had risen to 116/60 mmHg,
SpO₂ > 95%, HR about 100/min, he was more alert and the wheeze eased; a second dexamethasone 5 mg was given
for persisting oral numbness, and about 3 minutes later his breathing settled. At 1 hour he was alert (HR
95/min, RR 25/min, SpO₂ > 95%). He went home cured after 10 days.

**Diagnosis:** anaphylaxis with shock (anaphylactic shock) to cefotaxime/sulbactam in a boy with an
unclarified penicillin allergy label; the culprit component (cefotaxime, sulbactam or an impurity) was never
identified.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model — the CMCR contract (`cmcr-20.test.ts`) forbids
one. The case shows the report's recorded states only; it never invents how he would have responded to the
learner's treatment. Every response text says what the report did and did not record.

Every phase is **not learner-switchable**: time moves forward through the learner's own actions, so each
decision is committed before the next stage shows what happened.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | day of admission, before the first dose | start | history (parent; the boy answers questions put to him), admission examination, chest X-ray report, penicillin skin-test record, the first-dose prescription, admission bloods (not in the report); decision `pre-dose` |
| `reaction` | about 15 s into the first dose | decision `pre-dose` attempted | the boy's symptoms, the bedside findings (conscious level, skin, airway and breathing, heart, perfusion, monitor BP/SpO₂ once the monitor is on), the infusion record; decisions `diagnosis`, `adrenaline`; all the emergency interventions |
| `recovery` | after the emergency treatment | decision `adrenaline` attempted **and** IM adrenaline 300 µg or the report's 0.25 mg IV push given | the boy's own account, the report's 1-hour reassessment (labelled as the report's, after its treatment); decision `aftercare` |
| `followup` | to discharge | all four decisions decided | the report's full treatment sequence, doses, responses and outcome, and the authors' discussion |

The two tenfold errors (2.5 mg IV; 30 µg IM) and drugs other than adrenaline never move the record on: the
case does not simulate their consequences, and the response says so. A learner who gives no adrenaline stays
in the `reaction` phase (the `aftercare` decision needs adrenaline given).

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-history` — Take the history, including the allergy label (presentation, medications, allergies).
2. `obj-predose` — Before the first dose (skin-test record read, decision `pre-dose`).
3. `obj-recognise` — Recognise what is happening (skin, airway, perfusion examined; decision `diagnosis`).
4. `obj-treat` — Treat now (decision `adrenaline`, infusion stopped, adrenaline given).
5. `obj-after` — After the reaction (tryptase ordered, decision `aftercare`).
6. `obj-outcome` — Review the report's treatment and outcome (`followup`).

### Decisions

| id | opens after | correct answer | distractors (why they are tempting) |
|---|---|---|---|
| `pre-dose` | allergy question asked and the skin-test record read (before the infusion) | clarify the label and record it; slow first dose (the authors' 10 minutes) with someone watching, the monitor on, adrenaline 1 mg/mL to hand; skin-test the intended cephalosporin (China 2021) or choose a structurally different drug if a clear immediate reaction emerges | “penicillin test negative, so every β-lactam is safe” (closest to the report's sequence: the penicillin skin test, then the infusion at 30 drops/min); a routine cephalosporin skin test and no observation; avoid every β-lactam without asking |
| `diagnosis` | **any one** bedside step: asking him how he feels, or looking at his skin, breathing or circulation — no record or monitor value needed | anaphylaxis with shock to cefotaxime/sulbactam, treat now | vasovagal faint; asthma attack (salbutamol first); “just a drug rash” |
| `adrenaline` | the diagnosis | stop the drug, call for help; IM adrenaline 1 mg/mL 0.3 mL (300 µg, age band 6–12) into the anterolateral thigh, repeat after 5 min; lie flat (semi-recumbent if breathing is easier); high-flow oxygen; 10 mL/kg crystalloid; monitoring | IV push of 2.5 mL of 1:10 000 (**the report's practice**); dexamethasone first (**the report's first step**); 2.5 mL of 1 mg/mL IV (tenfold overdose); 0.3 mL of 0.1 mg/mL IM (tenfold underdose) |
| `aftercare` | the adrenaline decision and adrenaline given | tryptase samples with their times; longer monitored observation (he was shocked); record the culprit drug (notes, prescribing system, wristband) and tell the family in writing; no re-exposure, another drug for the pneumonia; allergy referral | rechallenge from another batch (the authors' impurity hypothesis); 3 days of steroids and antihistamines and routine care; “the penicillin test was negative, so it was not a true allergy” |

Every option has its own feedback. Decisions never lock once unlocked, so a learner who answers wrongly first
can answer again; the rubric scores the first attempt (`decidedFirstTry`).

### Rubric (11 deterministic items, 26 points, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-allergy-history` | History | allergy label, its details and the cephalosporin he already had | 2 |
| `rb-records` | Investigations | skin-test record and chest X-ray read before the dose | 1 |
| `rb-pre-dose` | Management | pre-dose decision, first attempt | 3 |
| `rb-bedside` | Examination | skin, airway and breathing, and circulation assessed | 2 |
| `rb-diagnosis` | Diagnosis | anaphylactic shock recognised at the bedside, first attempt (annotation: `critical`) | 4 |
| `rb-adrenaline-choice` | **Safety** | adrenaline strength, dose, route and site, first attempt (annotation: `critical`) | 4 |
| `rb-first-line` | Management | infusion stopped **and** IM adrenaline given (annotation: `critical`) | 3 |
| `rb-support` | Management | help called, lying flat, high-flow oxygen, crystalloid bolus, monitoring | 2 |
| `rb-no-unsafe-adrenaline` | **Safety** | IM adrenaline given with no IV push and no wrong-strength dose (needs the IM dose, so it cannot be earned by doing nothing; annotation: `critical`) | 2 |
| `rb-aftercare` | Management | aftercare decision, first attempt | 2 |
| `rb-tryptase` | Investigations | tryptase requested | 1 |
| `rb-communication` | Communication (examiner) | calm words to the boy during the emergency, a plain explanation to the parent, the drug to avoid, a written allergy record, teach-back | 1 |

**How wrong choices score.** A steroid or an antihistamine before any adrenaline is `contraindicated` (a
safety event with harm text: it delays first-line treatment); after adrenaline the second dexamethasone, as
in the report, is neutral. The report's IV push, the 1 mg/mL IV push, the 0.1 mg/mL IM injection and
restarting the drug are `contraindicated` (`contraindicatedWhen: always`) and cost `rb-no-unsafe-adrenaline`.
Nasal oxygen 3 L/min (the report's) is neutral, with a response that explains why a non-rebreather mask is
needed. A third IM dose is refused (`maxDoses: 2` — after two doses it is refractory anaphylaxis for
specialists). Replayed paths (2026-10-28): the report's own sequence finishes with 12/26 and two safety
events; a minimal correct path (no extra history, no supportive care) with 21/26; skipping ahead is refused
(`phase-locked`, `not-ordered`, `requirements-unmet`).

## Reference path (`solution`)

47 steps: the history (all 12 admission-time items, including the six unknowns), the admission examination,
chest X-ray, skin-test record and first-dose prescription read at the records terminal, admission bloods,
decision `pre-dose` → reaction: the boy's symptoms, skin, airway, perfusion, decision `diagnosis`; stop the
infusion, call for help, IM adrenaline, lie him flat, high-flow oxygen, monitoring, a crystalloid bolus; the
parent's account, conscious level, heart, monitor readings, tryptase; decision `adrenaline` → recovery: the
boy's account, reassessment, the aftercare plan, decision `aftercare` → follow-up record → finish. It scores
**26/26** with no contraindicated action, in clinical and in-world mode, in both languages.

## Clinical numbers check

* **Adrenaline strengths.** 1 mg/mL = 1 in 1000 = 1:1000; 0.1 mg/mL = 1 in 10 000 = 1:10 000 (the report
  writes 1/10 000).
  * Report: 2.5 mL × 0.1 mg/mL = **0.25 mg IV push** (derived by the editors; labelled in the case).
  * Correct IM dose: 0.3 mL × 1 mg/mL = **300 micrograms** (RCUK 2021 age band 6–12 years; his weight is not
    recorded, so the age band is the only check).
  * Error 1: 2.5 mL × 1 mg/mL = 2.5 mg IV (ten times the report's dose).
  * Error 2: 0.3 mL × 0.1 mg/mL = 30 micrograms IM (a tenth of the dose).
* **Fluid.** RCUK 2021: a rapid IV bolus of 10 mL/kg in a child with hypotension or shock, or a poor
  response to the first adrenaline. No weight → the case prints mL/kg and tells the learner to estimate.
* **The infusion.** 1.25 g in 100 mL of 5% glucose at 30 drops/min. The giving set's drop factor is not
  recorded, so no mL/min or dose-per-minute figure is given. The discussion gives the labelled
  cefotaxime : sulbactam ratio as 2 : 1; the case does not split the 1.25 g into components (the report does
  not say whether it is the total).
* **Vital signs (all from the report).** Reaction: HR 140/min (auscultation), RR about 50/min, CRT > 5 s,
  BP 60/30 mmHg and SpO₂ 85% on the monitor. Five minutes after the IV push: BP 116/60 mmHg, SpO₂ > 95%, HR
  about 100/min. One hour: HR 95/min, RR 25/min, SpO₂ > 95% (no BP given). No temperature, weight or
  admission vital signs are recorded, and none are added.
* **Steroid and antihistamine doses** are not printed beyond the report's dexamethasone 5 mg (route and
  timing from the report); the case does not recommend them.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — “What went through your head when he said he couldn't breathe, 15 seconds into the drip?”
2. **Description** — “Take me through the first five minutes: what did you see, what did you give, in what
   order?”
3. **Analysis**
   * “What did ‘penicillin batch allergy’ tell you — and what didn't it? What does a negative penicillin skin
     test say about cefotaxime/sulbactam?”
   * “You had no weight. How did you choose the adrenaline dose?”
   * “Say the dose aloud in mg/mL and micrograms. Where could a tenfold error happen on this ward?”
   * “The report gave dexamethasone first and then IV adrenaline, and he recovered. Does that show the IV push
     was right?”
   * “He has settled. What would make you keep him monitored longer, and what must happen before he goes
     home?”
4. **Summary** — “What will you check before the next first dose of a β-lactam in a child with an allergy
   label?”

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| Taking the negative penicillin skin test as clearance (the report's sequence: skin test, then the infusion) | `pre-dose` distractor; feedback cites China 2021 and AAAAI/ACAAI 2022 |
| Reading the monitor or the chart before treating | `diagnosis` opens on any one bedside step; no record is needed to treat |
| Steroid or antihistamine first (the report's first step) | `contraindicated` before adrenaline; `adrenaline` distractor |
| IV push on the ward (the report's practice) | `contraindicated`; distractor; the record still moves on because it is what the report did |
| 1 mg/mL given IV, or 0.1 mg/mL given IM | `contraindicated`; distractors; the record does not move on |
| Nasal oxygen for hypoxic shock | neutral, with a response pointing to the non-rebreather mask |
| No tryptase, no allergy record, rechallenge | `aftercare` distractors; `restart-infusion` is contraindicated; `rb-tryptase` |

## Embodied mode

* **Where the patient is.** Ward bed (`inpatient`), sitting up at the start; `position-flat` lays him down
  (`posture: "lying"`). He never leaves the ward: the admission chest X-ray is an existing report
  (`requires: ["records"]`), not a new film (1.0.0 sent the child in shock to radiology).
* **IV access.** The cannula is already in place because the infusion is running
  (`extensions.embodied.ivAccessInSitu: true`), so fluids and IV drugs need no new cannula.
* **Record reviews.** The chest X-ray report, the skin-test record, the infusion record (prescription and
  first-dose record) and the follow-up record are read at a records terminal — never a device, a sample or a
  risk. The coordinator's annotation file adds `performedAt: "records"` to them once the framework supports
  it. Bloods (admission, blood gas, tryptase) are sampled at the patient; oxygen comes from the ward outlet
  next to the bed; the monitor (`cardiac-monitor`) gives the BP and SpO₂.
* **Demonstration route (2026-10-28).** 98.9 m to the bedside, 12.4 m to the records terminal, 12.4 m back to
  the patient, 1 m to the oxygen outlet, 13.1 m to the terminal for the follow-up record; no patient
  transport.
* **Scope of practice.** Stopping the infusion is `scope: "nursing"`; drugs, fluids, oxygen and monitoring
  follow their kinds; calling for help is a consult.
* **The boy's voice.** He answers questions put to him (`speaker: "patient"` on his symptom items) and speaks
  throughout — the report says he described the numbness himself — so no `nonVerbalWhen` annotation is
  needed. His parent answers the history (`companion.answersHistory`).
* Clinical, in-world, zh-CN and en demonstrations all score 26/26 with every objective done.

## Source and adaptation

**From the report (kept as fact).** Age, sex, the 10-day cough and 5-day fever, the clinic drugs (cefuroxime
— written “头孢呋辛纳” — ambroxol, Yanhuning, 4 days, no doses), the “penicillin batch allergy” label, the
denied atopy and family drug allergy, the chest X-ray and admission examination as summarised, the admitting
diagnosis, the negative penicillin skin test, the culprit infusion (1.25 g in 5% glucose 100 mL at
30 drops/min) and the 15-second onset, every finding and value during the reaction, the full treatment
sequence with doses, the responses at 5 minutes, 3 minutes after the second dexamethasone and 1 hour, the
discharge after 10 days, and the authors' discussion (the 2:1 ratio, the product's listed adverse effects,
the literature on cefotaxime anaphylaxis, the IgE mechanism, the three unconfirmed hypotheses, and their
advice: anticipate, watch closely, calm the child, slow first 10 minutes).

**Adapted for teaching.** The parent's and the boy's words (lay speech built on the recorded facts); the
parent's worries (role); the parent's account of the onset; the first-dose prescription shown before the
dose; the patient sitting up before the reaction (not recorded; an in-world staging choice); the decisions,
interventions, rubric and feedback (current guidance). The recovery phase shows the report's own
1-hour reassessment, labelled as such, whatever effective adrenaline the learner gave.

**Labelled discrepancies and inferences in the source (not resolved).**
* The label is “批次过敏” (batch allergy) in the past history and the discussion, but “批号过敏” (lot-number
  allergy) in the case course. Both wordings appear in the item's source note and the follow-up record.
* The first examination does not describe wheeze, yet after treatment the report says “呼吸费力及喘憋较前缓解”
  (the laboured breathing and wheeze eased). The airway finding gives the recorded signs and states the
  inference in brackets.

**Figures.** The article has no figures or tables. The source PDF (one page, page 63, carrying only this
article; viewed 2026-10-28: the text, the references and the usual bibliographic footer — DOI, author
affiliation, correspondence and the received date — and no patient identifier) stays a local-only asset that
opens after the case is complete; its title now says it is page 63, this article only, and that it contains
the treatment course.

**Unknown and kept unknown** (`unknowns`, unknown history items, `examNotRecorded`): his weight; admission
vital signs and blood tests; the drug, features, timing and treatment of the earlier penicillin reaction;
any reaction during the clinic's cefuroxime; vaccinations, earlier illnesses, the home; the giving set's drop
factor; temperature, blood gas or other tests during the reaction; tryptase; the culprit component; the
antibiotic used afterwards, the observation period, any allergy record or follow-up, and later β-lactam use.

## Matcher notes

* 39 `extensions.testUtterances` (20 zh-CN, 19 en), none equal to a canonical question; every required
  history item has at least two (`presentation` 4, `medications` 4, `allergies` 3, `allergy-detail` 5,
  `reaction` 2).
* `reaction` (the boy, reaction phase only) **supersedes** `presentation`: during the reaction “哪里不舒服？”
  or “How long has he had the cough?” is answered by the boy's “Can't… breathe…”, and asking him credits the
  presentation item. `status-recovery` is the recovery-phase twin in content but not by `supersedes` (that
  chain would make the recovery answer replace the cough history), so it carries its own keywords.
* `reaction-onset` excludes 青霉素/上次/penicillin/last time/cefuroxime so “What happened the last time he had
  penicillin?” reaches `allergy-detail`; `medications` excludes 过敏/反应/不舒服/allerg/react/problem so
  “Did the drips at the clinic cause any problems?” reaches `cefuroxime-reaction`.
* Interventions: no item answers to a bare “adrenaline” / “肾上腺素” — “give adrenaline” is ambiguous (named,
  nothing done) until the learner says the route. IM excludes 静推/静注/静脉/万分之一/intraven/IV push/IV
  adrenaline. Numeric strengths are not used as exclusions: compact matching merges numbers, so “1:1000 0.3”
  would contain “10000”. The clear-winner rule with specificity resolves “1:1000 adrenaline 2.5 ml IV” to the
  1 mg/mL IV error, “1:10000 … IM” to the dilute-IM error, and “IM adrenaline 1:1000 0.3 mL” to the correct
  IM dose.
* Vital signs are an exam item (`vitals`, `requires: ["cardiac-monitor"]`) rather than an investigation, so
  “check his blood pressure” / “测血压” finds them.

## References

1. 张睿, 裴亮, 王佳, 张晗, 韩晓华. 头孢噻肟钠/舒巴坦钠致过敏性休克一例. 中国小儿急救医学. 2014;21(1):63.
   doi:10.3760/cma.j.issn.1673-4912.2014.01.026. https://rs.yiigle.com/cmaid/70044
2. Resuscitation Council UK. Emergency treatment of anaphylaxis: guidelines for healthcare providers. London:
   Resuscitation Council UK; 2021.
3. Dodd A, Hughes A, Sargant N, Whyte AF, Soar J, Turner PJ. Evidence update for the treatment of
   anaphylaxis. Resuscitation. 2021;163:86-96. doi:10.1016/j.resuscitation.2021.04.010
4. Muraro A, Worm M, Alviani C, et al. EAACI guidelines: anaphylaxis (2021 update). Allergy.
   2022;77(2):357-377. doi:10.1111/all.15032
5. Khan DA, Banerji A, Blumenthal KG, et al. Drug allergy: a 2022 practice parameter update. J Allergy Clin
   Immunol. 2022;150(6):1333-1393. doi:10.1016/j.jaci.2022.08.028
6. 国家卫生健康委员会办公厅. β内酰胺类抗菌药物皮肤试验指导原则（2021年版）. 2021.

The same strings are `debrief.references`. Checked on 2026-10-28 by web search (doi.org, Crossref, PubMed
E-utilities and rs.yiigle.com are not reachable from this environment): ref. 1 against the export record
(`artDoi`, volume 21, issue 01, page 63) and the DOI printed on the PDF page; ref. 2 on the RCUK publication
listing (May 2021 PDF; cited without a DOI or URL); refs 3–5 on indexing and publisher pages that print the
DOI (ref. 3 PubMed 33895231; ref. 4 PubMed 34343358, also verified in the audit); ref. 6 by its publication
notices (no DOI exists).

### To verify

* RCUK 2021: the exact positioning wording (the case says only “lie flat, or semi-recumbent if that makes
  breathing easier; avoid sudden posture changes” — whether leg elevation is advised was not checked, so it
  is not printed); the observation periods by severity (not printed); the tryptase sampling time points (not
  printed — the case says “times recorded, per the guideline and local protocol”); its advice on
  antihistamines once the patient is stable (not printed).
* The 2021 Chinese guidance (ref. 6): its document number, issue date (13 or 16 April in secondary
  sources) and the exact clause on cephalosporin skin tests in patients with an immediate penicillin
  history.
* AAAAI/ACAAI 2022 (ref. 5): the recommendation on structurally dissimilar cephalosporins after penicillin
  anaphylaxis was taken from published summaries — check the wording and grading in the full text.
* The Yanhuning gloss (“an andrographolide-derived injection”) is an editorial note, not from the report.
* Clinician input: a paediatric emergency clinician should review the `adrenaline` and `pre-dose` option
  wording (audit A2) and confirm the age-band dose and fluid volume against the current RCUK algorithm.

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

* **Options rebalanced so the key is not cued by length.** The keyed option was the uniquely longest in all four
  decisions in both languages (1.3–5.2 times the mean length of the other options); now it is in none
  (0.85–1.09). The `pre-dose` and `aftercare` keys say the same in fewer words; in `adrenaline` every option now
  carries the same supportive steps (stop the drug, call for help, lie flat, high-flow oxygen, a 10 mL/kg
  crystalloid bolus, monitoring), so only the adrenaline strength, dose, route and site — the point of the
  decision — tell the options apart. Each distractor now says why it tempts: the negative penicillin test plus
  the clinic's four days of cefuroxime; routine cephalosporin skin tests "as many wards do"; lifelong avoidance
  recorded as a severe allergy; a frightened child fainting; asthma after ten days of cough; a typical
  urticarial rash; the IV push because IV acts faster in shock (the report's practice); dexamethasone to damp
  the reaction; the standard 1 mg/mL ampoule pushed IV; the 1 in 10 000 resuscitation strength given IM; a
  rechallenge with steroid premedication; steroids against a biphasic reaction; "an infusion that ran too fast,
  not an allergy". Medical meaning, correct flags, scoring and the reference path are unchanged; the feedback of
  `skin-test-clears`, `iv-bolus-report`, both concentration errors, `rechallenge`, `steroids-home` and
  `not-allergy` now also answers the reason its text gives.
* **Option ids neutral:** `iv-1mg-error` → `iv-push-1-in-1000` and `im-dilute-error` → `im-1-in-10000` (the
  suffix named the option as wrong). No solution step, rubric item, test, benchmark scenario or e2e spec
  referred to them.
* Checked on 2026-10-30: `cases validate --strict` 0 errors, 0 warnings; `cases verify` passes (47 steps,
  objectives 6/6, decisions 4/4, utterances 39/39, rubric 26/26).

### 1.1.0 — 2026-10-28 (editorial revision)

* **Treatment no longer waits for the records:** `diagnosis` opens on any one bedside step (1.0.0 required
  reading the observations and the infusion chart first); vital signs moved to a bedside exam item behind the
  monitor; the chest X-ray became an admission record review (1.0.0 sent the shocked child to radiology).
* **Timeline:** `initial` / `workup` became `admission` → `reaction` → `recovery` → `followup`, all
  forward-only.
* **Decisions:** four single-best-answer decisions with option-specific feedback replace the two binary ones
  with shared feedback: `pre-dose` (new), `diagnosis` (bedside), `adrenaline` (strength, dose, route, site —
  with the report's IV push, steroid-first and both tenfold errors as distractors; replaces `management`),
  `aftercare` (new).
* **Interventions:** 15 added (none before), the report's steps (stop the drug, monitoring, nasal oxygen,
  dexamethasone, the IV push) and the current ones (call for help, IM adrenaline, lying flat, high-flow
  oxygen, crystalloid, aftercare), and the traps (1 mg/mL IV, 0.1 mg/mL IM, antihistamine first, restart).
* **Source facts restored:** the culprit infusion (1.25 g, 5% glucose 100 mL, 30 drops/min); frothing at the
  mouth; strong regular heart sounds; HR 140/min exactly (1.0.0 said “about”); the complete treatment
  sequence with both dexamethasone doses, nasal oxygen 3 L/min, the 2.5 mL of 1/10 000 adrenaline IV push
  (0.25 mg derived) and the responses at 5 minutes, after the second dexamethasone and at 1 hour; the
  admitting diagnosis; the authors' discussion and advice.
* **Voice:** adult social-history items (smoking, alcohol, occupation, self-care, supplements, travel)
  removed; the parent answers, the boy speaks for himself; unknown items for the earlier reaction, the
  clinic cefuroxime, weight, vaccinations, earlier illnesses and the home; persona briefs an actor; the
  library's fallback line; the pseudonym 小川 / Xiaochuan (1.0.0's “An” is an English word); summary and
  triage note no longer announce the allergy history or the infusion emergency.
* **Teaching:** five learning outcomes, five teaching points naming their guidance, a 12-item rubric with
  two safety items, `provenance.review`, Vancouver references with verified DOIs, this facilitator guide;
  difficulty 4, 30 minutes.
* Ids changed (none is referenced outside this case): phases `initial`/`workup` → `admission`/`reaction`/
  `recovery` (`followup` kept); objectives `objective-1…4` → `obj-*`; rubric `rubric-1…4` → `rb-*`; decision
  `management` → `adrenaline` (`diagnosis` kept; `pre-dose`, `aftercare` new); exam `initial` →
  `admission-exam`, `initial-vitals` removed (now `vitals`, from the monitor), `skin` and `perfusion` kept,
  `consciousness`, `airway`, `heart`, `recovery-status` new; investigation `observations` removed (→ exam
  `vitals`), `xray`, `skin-test`, `infusion-chart`, `followup` kept with restructured contents,
  `admission-labs`, `blood-gas`, `tryptase` new; history items `smoking`, `alcohol`, `occupation`,
  `self-care`, `supplements`, `travel` removed, `cefuroxime-reaction`, `allergy-detail`, `pmh`, `household`,
  `reaction-onset`, `status-recovery` new.

### 1.0.0

* Initial CMCR version (PR #3).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-70044/case.json --strict   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-70044        # solution 47 steps · objectives 6/6 · decisions 4/4 · utterances 39/39
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-70044              # 1 passed
npm run -s cc -- exec --case cmcr-70044 --autopilot --approval bypass --provider offline --output-format json             # 26/26, 6/6
npm run -s cc -- exec --case cmcr-70044 --autopilot --approval bypass --provider offline --output-format json --embodied  # 26/26, 6/6
```

## 中文摘要

**病例概要。** 10岁男孩，咳嗽10天、发热5天，在诊所静脉滴注头孢呋辛、氨溴索、炎琥宁4天无好转；有“青霉素批次过敏”史，
否认过敏体质及家属药物过敏史；胸片示左肺炎症，诊断急性支气管肺炎收住院，入院查体未见异常。青霉素皮试阴性后输注头孢噻肟钠/
舒巴坦钠1.25 g（加5%葡萄糖100 mL，30滴/分），约15秒后突发呼吸困难、口周咽部麻木、全身瘙痒，神志恍惚、面色苍白、周身片状
隆起红色皮疹、大汗、口周发绀、口吐白沫、呼吸约50次/分、心率140次/分、脉弱、四肢凉、CRT>5秒，监护血压60/30 mmHg、SpO₂ 85%。
原报告停药后先静注地塞米松5 mg、鼻导管吸氧3 L/min，再静脉推注1/10 000肾上腺素2.5 mL（即0.25 mg，编者换算），5分钟后血压
116/60 mmHg、SpO₂>95%；再次地塞米松后约3分钟呼吸平稳；1小时后神志清醒；治疗10天后出院。

**学习目标。**
1. 使用β-内酰胺类前澄清青霉素过敏标签（药物、反应、时间、处理），并解释青霉素皮试阴性为何不能预测头孢菌素反应。
2. 依据用药后数分钟内的皮肤、呼吸与循环受累，在床旁诊断严重过敏反应，不等监护数值和检查。
3. 对体重未知的6–12岁儿童，于大腿前外侧肌注1 mg/mL肾上腺素0.3 mL（300 µg），必要时5分钟后重复，并完成体位、高流量吸氧和
   晶体液10 mL/kg推注（RCUK 2021）。
4. 对比原报告“先激素、静推肾上腺素”的顺序与现行指南（RCUK 2021、EAACI 2021），并说出两种10倍浓度错误。
5. 制定反应后的处理：类胰蛋白酶采样、按严重程度观察、记录致敏药物、避免再暴露和转诊变态反应科。

**关键决策。** ① 首剂前：澄清过敏标签，慢速首剂、专人看护、肾上腺素在手边（青霉素皮试阴性不能放行所有β-内酰胺类）；
② 床旁一看即可诊断过敏性休克，不必先调阅记录；③ 肌注1 mg/mL肾上腺素0.3 mL于大腿前外侧，原报告的静推、先用激素以及
两种10倍浓度错误均为干扰项；④ 反应后：类胰蛋白酶、延长监护观察、记录致敏药物、不再激发、转诊变态反应科。

**复盘要点（PEARLS）。** 先谈感受；复述最初五分钟看到了什么、给了什么、先后顺序；分析环节聚焦：过敏标签与青霉素皮试能
说明什么、没有体重时如何定剂量、用mg/mL和微克说出剂量、原报告静推后好转能否证明静推正确、出院前必须完成什么。
本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
