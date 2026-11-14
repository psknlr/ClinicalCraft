# cmcr-33476 — Sudden left-sided paralysis · 12-year-old boy

> Facilitator guide (spoilers). Version 1.1.0, re-authored on 2026-11-14 from the facts recorded in version 1.0.0; not yet checked against the full source article and not yet reviewed by a licensed clinician.

## Case card

| Field | Value |
|---|---|
| Setting / facility | Inpatient paediatrics / `general-hospital` |
| Level | Senior medical student to paediatric or neurology resident; difficulty 4/5 |
| Time | About 45 minutes, plus 15 minutes of debrief |
| Patient | Jin Zhiyuan (金知远, pseudonym), a boy of 12, brought in by a relative about six hours after his left arm and leg suddenly stopped moving |
| Specialties | Pediatrics, neurology, cardiology, cardiac surgery, vascular surgery |
| Languages | Simplified Chinese and English |
| Clock | Static (historical case review); no physiology is simulated |
| What the learner can do | Take the history from the relative (the boy answers in a few words), examine, order imaging and tests, read records, give or withhold treatments, call colleagues, answer five decisions |
| Review status | Editorial (AI-assisted) against the cited guidance; facts not yet checked against the full article; not yet reviewed by a licensed clinician |

## Learning outcomes

1. Localise a left central facial and tongue palsy, left hemiplegia and a Babinski sign to the right hemisphere, and recognise from an absent left radial pulse, a blood pressure measurable only on the right, poor femoral pulses and cool legs that other arterial beds are ischaemic at the same time.
2. Run the first hour for a child with suspected stroke six hours after onset: brain and vessel imaging within the hour (RCPCH 2017; AHA/ASA 2026), the paediatric stroke team called now about thrombectomy, oxygen to SpO₂ > 92 %, glucose, bloods with clotting and nil by mouth — and state why IV thrombolysis is no longer an option.
3. Explain why heparin, recommended for acute limb ischaemia (ESVS 2020), waits for brain imaging in a child with an acute stroke, and what anticoagulation can and cannot prevent when the embolic source is a cardiac tumour (AHA/ASA 2019; AHA/ASA 2021).
4. Interpret a pedunculated left-atrial mass that prolapses into the mitral orifice as both an embolic source and an obstruction, refer for excision the same day, and describe how the stroke team and the cardiac surgeons set its timing together (AHA/ASA 2021 §5.6).
5. Assess new swollen, painful calves after limb ischaemia for compartment syndrome first — clinical signs, pressures when unclear, fasciotomy within two hours of the diagnosis (ESVS 2020) — and never compress ischaemic legs.
6. Plan follow-up after excision of a myxoma in a child: echocardiographic surveillance for recurrence, assessment for Carney complex with genetic counselling, and neurorehabilitation (Correa 2015).

## Clinical summary (spoilers)

A 12-year-old boy had a sudden onset of left-sided paralysis about six hours before he was seen, with no injury beforehand and very fast breathing at onset; at first the left arm and leg were weak and the right side could still move. On examination: left central facial and tongue palsy, power grade 0 in the left arm and leg, a positive Babinski sign (side not stated), normal power on the right; respiratory rate 40/min with widespread moist crackles over both lungs; no palpable left radial pulse, poor femoral pulses on both sides, cool legs; blood pressure 110/70 mmHg on the right and unmeasurable on the left.

Brain MRI and vascular imaging: multiple abnormal signals on both sides of the brain, predominantly right; stenosis/occlusion of the mid-to-distal right middle cerebral artery; occlusion of the left subclavian artery. Lower-limb vascular studies: severe ischaemic waveforms in both lower limbs; thrombus in the left popliteal vein and the femoropopliteal artery; later vascular imaging showed multiple arterial occlusions. Echocardiography: a pedunculated 5.5 × 3.5 cm mass on the left-atrial side of the atrial septum near the mitral valve, stalk about 1.6 cm, partly prolapsing into the mitral orifice in diastole, with mild-to-moderate regurgitation. On hospital day 3 both calves were obviously swollen and painful.

Supportive and anticoagulant treatment, among others, was given first; he was discharged after 40 days in hospital and the left atrial mass was resected about a month later. Pathology: **left atrial myxoma** (the composition of the individual emboli is not provided). Afterwards the left arm recovered; left-leg power was grade V− proximally and grade III distally; ultrasound showed no recurrence (length of follow-up not recorded).

Working diagnosis taught: multiple simultaneous arterial emboli (right MCA territory stroke, left subclavian occlusion, acute ischaemia of both legs) from a pedunculated left atrial mass that also prolapses into the mitral orifice, confirmed as a left atrial myxoma at resection.

## Scenario timeline and physiology

Five phases, static clock, no simulated physiology. Every phase is locked (`learnerSwitchable: false`) and opens by itself.

| Phase | Opens when | What it holds |
|---|---|---|
| `arrival` — about six hours after onset | Start | History (relative and boy), the examination recorded on arrival (neurology, pulses, vital signs, lungs); orders placed here return "requested — the report is shown in the next part" for the MRI, the echo and the lower-limb studies, and "No result is recorded for this test." for glucose, bloods, ECG, chest X-ray and CT; decisions 1 and 2 |
| `first-results` | Decisions `mechanism` and `first-hour` answered correctly | The brain MRI and vascular imaging, echocardiography and lower-limb vascular study reports (re-ordered and read in this phase); decision 3 |
| `ward` — day 3 | Decision `mass-plan` answered (with 1 and 2) | The boy's calves (history and examination), the later vascular imaging record, creatine kinase (no result); decision 4 |
| `operation` — later in his course | Decision `calves-day3` answered (with 1–3) | The pathology report of the resected mass, genetic testing (no result), the skin question; decision 5 |
| `outcome` (final, `learnerSwitchable: false`) | All five decisions answered | The treatment and follow-up record |

The phases and their placement in time are teaching design: 1.0.0 records the day of the calf swelling (day 3), the 40 days in hospital and the resection "about a month later", but not when the imaging, the echo or the lower-limb studies were done. The later vascular imaging is shown in the ward phase because 1.0.0 calls it "later"; its date is not recorded.

## Decisions and assessment

### Objectives (HUD chapters)

| Objective | Title | Complete when |
|---|---|---|
| `obj-story` | Find out what happened | `presenting`, `sides`, `trauma`, `breathing` asked |
| `obj-exam` | Examine him and connect the findings | Neurology, pulses, vital signs and lungs examined; decision `mechanism` answered |
| `obj-first-hour` | Plan the first hour | Decision `first-hour`; brain MRI or CT/CTA ordered (any phase); stroke team called (any time) |
| `obj-results` | Read the first results and act on them | MRI, echo and lower-limb studies read in `first-results`; decision `mass-plan`; cardiac surgical referral (any time) |
| `obj-day3` | Day 3 on the ward | Calves asked about or examined; decision `calves-day3`; bedside compartment assessment (any time) |
| `obj-follow-through` | Follow him to the end of his course | Pathology read; decision `after-histology`; outcome record read |

No objective holds a phase leaf, `whenIndicated`, `decidedFirstTry` or `not`; the collection test confirms a learner who does any step late can still finish.

### Decisions

1. **`mechanism`** (arrival; after the history of onset and breathing and the four examinations). Key: *emboli from one source in the left heart blocking several arteries at once, with the crackles suggesting the same lesion obstructs left-heart filling*. Three territories at once (right hemisphere, left arm, both legs) with a sudden onset is embolism until proven otherwise. Distractors: focal cerebral arteriopathy (intracranial only; cannot abolish a radial pulse), Todd's paresis after an unwitnessed seizure (a diagnosis of exclusion; no arterial signs), large-vessel vasculitis (gradual; systemic symptoms unknown, not absent), shock with a watershed stroke (BP 110/70 mmHg on the right; the asymmetry is focal occlusion). Answered by the echo in the next phase.
2. **`first-hour`** (arrival). Key: *brain and vessel imaging within the hour (MRI/MRA, or CT/CTA if MRI cannot be done promptly), the paediatric stroke team called now about thrombectomy, oxygen to SpO₂ > 92 %, glucose, bloods with clotting, nil by mouth, an urgent vascular review — no thrombolysis, no antithrombotic until haemorrhage is excluded* (RCPCH 2017; AHA/ASA 2026). Distractors: alteplase now (imaging first; beyond 4.5 hours), heparin first for the limbs (ESVS 2020 heparin conflicts with an unimaged stroke), aspirin and a routine MRI (thrombectomy up to 24 hours in children ≥ 6 years with salvageable brain; aspirin before imaging; anticoagulation usually preferred for a cardiac cause, AHA/ASA 2019), treating the breathing first (imaging cannot wait). This key is deliberately the longest option here — the one decision allowed.
3. **`mass-plan`** (first results; after reading the echo and the MRI). Key: *cardiac surgery today, aiming at early excision, with the stroke team setting the timing of bypass from the imaging, watching for obstruction and deciding anticoagulation for thrombus jointly* — AHA/ASA 2021 §5.6 (adult, class 2a, LOE C-LD: resection can be beneficial; open-heart surgery the only established treatment); the Griborio-Guzman 2022 review: a cardiac myxoma calls for prompt diagnosis and surgical resection. Distractors: anticoagulate and re-scan in two weeks, discharge on anticoagulation and operate electively in two to three months (closest to the recorded course; today a case-by-case delay, not a routine one), thrombolysis to dissolve the mass, a catheter biopsy first.
4. **`calves-day3`** (ward; after the calves are asked about or examined). Key: *compartment syndrome first — tension, pain on passive stretch, sensation and movement, pressures if unsure, a vascular surgeon at the bedside ready to decompress; then venous thrombosis and new occlusion* (ESVS 2020 Recs 37, 38, 41–43, adult lower-limb; ASH/ISTH 2024 for symptomatic DVT). Distractors: more heparin and a scan tomorrow, elevation and compression stockings (NICE NG89 2018, adult), analgesia and observation, catheter-directed thrombolysis (ESVS 2020 Table 5: absolute contraindication within two months of a cerebrovascular event).
5. **`after-histology`** (later in his course; after the pathology; select all). Keys: *regular echocardiograms*, *assessment for Carney complex with genetic counselling, PRKAR1A testing where appropriate and screening of relatives*, *continued stroke rehabilitation with follow-up of the left leg* (Correa 2015). Distractors: lifelong warfarin to stop recurrence; "excision means cure, no imaging" (written longer than two keys, so the keys are not simply the longest options).

Option ids name their content; every option has its own feedback; no decision is open at the start; each opens before the record that answers it.

### Rubric (35 points; one examiner-judged item)

| Item | Domain | Weight | Met when |
|---|---|---|---|
| `rb-story` | history | 2 | `presenting`, `sides`, `trauma`, `breathing` asked |
| `rb-background` | history | 1 | heart history, family, medicines, allergies, witnesses asked (all unknown) |
| `rb-exam` | examination | 2 | neurology, pulses, vital signs, lungs examined |
| `rb-mechanism` | diagnosis | 3 | `decidedFirstTry: mechanism` |
| `rb-first-hour-plan` | management | 3 | `decidedFirstTry: first-hour` |
| **`rb-imaging-now`** (critical) | investigations | 4 | brain MRI or CT/CTA ordered **in the arrival phase** |
| `rb-first-hour-acts` | management | 2 | stroke team (arrival), vascular review, oxygen, nil by mouth in their windows; glucose and bloods ordered in arrival |
| `rb-records` | investigations | 2 | MRI, echo, lower-limb studies (first results) and later imaging (ward) read |
| `rb-mass-plan` | management | 3 | `decidedFirstTry: mass-plan` |
| **`rb-surgery-referral`** (critical) | management | 4 | cardiac surgical referral given **while its window holds** (echo read, still in the first-results phase — before day 3) |
| `rb-calves` | management | 3 | `decidedFirstTry: calves-day3` and the compartment assessment given in its window (ward, after the calves are known) |
| `rb-follow-up` | management | 2 | `decidedFirstTry: after-histology` and the follow-up plan arranged |
| **`rb-no-harm`** (critical) | safety | 4 | none of: alteplase, heparin before the MRI is read, leg thrombolysis, compression and elevation; scored once decision 2 or 4 has been attempted or any of those acts given |
| `rb-communication` | communication | 1 (judged) | Calgary–Cambridge, SPIKES for the bad news, the 12-year-old involved, teach-back (`judgeGuidance`) |

### How wrong choices score (measured with core `assess`, 2026-11-14)

| Path | Score | Safety outcome | Critical items missed |
|---|---|---|---|
| Reference path (`solution`) | 100 % (35/35) | passes | none |
| Start, then finish (do nothing) | 0 % (0/31; the no-harm item is not yet scorable) | — (cannot finish: objectives open) | imaging, referral |
| Wrong first answer at every decision, then corrected | 60 % (21/35) | passes | none |
| Wrong first at one single-answer decision (any of 1–4) | 91 % (32/35) | passes | none |
| Wrong first at decision 5 | 94 % (33/35) | passes | none |
| Reference + alteplase on arrival | 89 % (31/35) | **fails** (alteplase) | `rb-no-harm` |
| Reference + heparin on arrival, before the MRI is read | 89 % (31/35) | **fails** (heparin) | `rb-no-harm` |
| Reference + heparin after the MRI is read and bloods are sent | 100 % | passes | none (allowed, not credited) |
| Reference + catheter-directed leg thrombolysis on day 3 | 89 % (31/35) | **fails** (leg thrombolysis) | `rb-no-harm` |
| Reference + compression and elevation on day 3 | 89 % (31/35) | passes (not critical) | `rb-no-harm` |
| Brain imaging first ordered only after the arrival phase | 89 % (31/35) | passes | `rb-imaging-now` |
| Cardiac referral made only on day 3 | 89 % (31/35) | passes | `rb-surgery-referral` |
| Stroke team called only after the first results | 94 % (33/35) | passes | none |
| No compartment assessment | 91 % (32/35) before finishing; the case cannot be finished until it is done (late: no credit for `rb-calves`) | passes | none |

**Safety outcome.** Three interventions are `critical: true` (each `risk: "high"`): **IV alteplase** — always contraindicated, because he arrived about six hours after onset, outside the 4.5-hour window of RCPCH 2017 and the AHA/ASA 2026 paediatric recommendation, so it adds bleeding risk without proven benefit; **IV unfractionated heparin** — contraindicated until the brain MRI has been read, because anticoagulating an acute stroke before haemorrhage is excluded can cause an intracranial bleed (RCPCH 2017; AHA/ASA 2019), even though ESVS 2020 recommends heparin for acute limb ischaemia; and **catheter-directed thrombolysis of the leg arteries** — always contraindicated, because a cerebrovascular event within two months is an absolute contraindication (ESVS 2020, Table 5). Giving any of them while contraindicated fails the run's safety outcome whatever the score. **Elevation with compression stockings** is `critical: false` (`risk: "moderate"`): harmful on ischaemic legs (NICE NG89 2018; ESVS 2020) but recoverable once a colleague removes them, so it costs the no-harm item without failing the safety outcome. No intervention has a preset dose (`doseSpec`): the heparin text gives a protocol, not a number, and alteplase can never be given correctly here.

## Reference path (`solution`)

63 steps. **Arrival:** ask onset, side, injury, breathing, witnesses, fit, headache, earlier symptoms, heart history, past illnesses, medicines, allergies, family, worries; examine neurology, pulses, vital signs, lungs; order the brain MRI and vascular imaging first; oxygen, monitoring with PedNIHSS, nil by mouth, IV cannula, call the paediatric stroke team, urgent vascular review; glucose, bloods with clotting, ECG (read: no results recorded); order the echo and the lower-limb studies; decision 1 (`left-heart-emboli`), decision 2 (`image-call-support`). **First results:** order and read the MRI, the echo and the lower-limb studies; refer to neurorehabilitation; urgent cardiac surgical referral; decision 3 (`urgent-excision`). **Ward, day 3:** ask about the legs, examine the calves, bedside compartment assessment, read the later vascular imaging, creatine kinase (no result); decision 4 (`compartment-first`). **Later:** read the pathology, ask about skin spots, arrange follow-up and the genetics referral, genetic testing (no result); decision 5 (`echo-surveillance`, `carney-genetics`, `rehab-limb`). **Outcome:** read the treatment and follow-up record; finish. Heparin is not in the reference path: its preconditions (no haemorrhage on imaging, platelets and clotting known) cannot be established from the recorded facts, so the path leaves it to the teams.

## Clinical numbers check

| Number | Source | Use / derived value |
|---|---|---|
| Age 12 years | 1.0.0 patient | Thrombectomy recommendation applies from 6 years (AHA/ASA 2026); tPA "could be considered" over 8 years within criteria (RCPCH 2017) |
| About 6 hours from onset to arrival | 1.0.0 chief complaint and onset answer | Beyond the 4.5-hour IV thrombolysis window (RCPCH 2017; AHA/ASA 2026); inside the 6-to-24-hour thrombectomy window with salvageable brain (AHA/ASA 2026) |
| Respiratory rate 40/min | 1.0.0 examination | Fast for a 12-year-old (the report's reference range is not given) |
| BP 110/70 mmHg on the right; unmeasurable on the left | 1.0.0 examination | The asymmetry fits the left subclavian occlusion on imaging |
| Power grade 0, left arm and leg | 1.0.0 examination | The usual 0–5 (0–Ⅴ) muscle power scale |
| Mass 5.5 × 3.5 cm; stalk about 1.6 cm | 1.0.0 echocardiography | No reference values apply; the stalk dimension is not specified as length or width |
| Hospital day 3 | 1.0.0 history | Calves obviously swollen and painful |
| 40 days in hospital; resection about 1 month later | 1.0.0 outcome | Derived: roughly 70 days from admission to resection, if "about a month later" counts from discharge (the reading kept; see To verify) |
| Left-leg power V− proximal, III distal | 1.0.0 outcome | Same 0–5 (0–Ⅴ) scale; V− kept as recorded |
| SpO₂ > 92 %; glucose within 15 minutes; imaging within 1 hour | RCPCH 2017 (recommendations; pathway poster) | Decision 2 key, oxygen and monitoring texts |
| Thrombectomy ≥ 6 years, within 6 hours or up to 24 hours with salvageable brain | AHA/ASA 2026 (AHA's release and summaries; COR/LOE to verify) | Decision 2, teaching point 2 |
| Aspirin 5 mg/kg (maximum 300 mg) | RCPCH 2017 | Appears only in a distractor ("aspirin and a routine MRI") |
| Fasciotomy within 2 hours of the diagnosis; not delayed beyond 6 hours | ESVS 2020 Recs 42–43 (adult, lower limb) | Decision 4, compartment assessment |
| Thrombolysis contraindicated within 2 months of a cerebrovascular event | ESVS 2020 Table 5 | Leg-thrombolysis harm, decisions 3–4 |
| Class 2a, LOE C-LD | AHA/ASA 2021 §5.6 | Resection of a left-sided cardiac tumour after stroke |

No drug dose from the report is recorded in 1.0.0; the case gives none.

## Facilitator notes

PEARLS debrief:

- **Reactions:** "What did it feel like to have a child with a stroke and cold legs at the same time?"
- **Description:** "Walk us through the first hour: what was done first, and why?"
- **Analysis:** "Which finding made you look beyond the brain?" — "What does six hours rule out, and what does it leave open?" — "Two guidelines pulled opposite ways about heparin; how did you decide which spoke first?" — "What can anticoagulation do for this boy, and what can it not do?" — "Why does the mass need surgery rather than drugs, and who decides when?" — "What did you fear most when his calves swelled on day 3?" — "The record shows an operation after discharge: what would you need to see documented to accept that interval today?"
- **Summary:** "Name the three acts that could not wait."

Common learner errors and where the case surfaces them:

- Treating it as an isolated stroke and never feeling the pulses — decision 1 cannot open until the pulses are examined; its distractors name the brain-only explanations.
- "Too late for anything at six hours" — decision 2's aspirin-and-routine-MRI distractor; the critical imaging item.
- Thrombolysing because the deficit is disabling — the alteplase trap (critical) and decision 2.
- Giving heparin for the cold limbs before the brain is imaged — the heparin trap (critical) and decision 2's heparin-first distractor.
- Anticoagulating the mass and waiting — decision 3's distractors; the referral window.
- Reading the calves as DVT or as "expected" — decision 4; the compression trap; the compartment window.
- Stopping at "cured" after excision — decision 5.

## Embodied mode

- **Bedside:** history (the relative answers; the boy answers questions put to him in a few words), examination, oxygen by mask, the monitor, nil by mouth, the cannula, the echo (`echocardiography`, brought to the bedside), the lower-limb studies (`ultrasound`), the ECG and a portable chest X-ray, point-of-care glucose.
- **Provider:** brain MRI (`mri`) and CT/CTA (`ct`) — the patient is taken to imaging.
- **Laboratory:** bloods (`lab-hematology`, `lab-chemistry`), creatine kinase (`lab-chemistry`), genetic testing (`molecular`).
- **Records terminal:** later vascular imaging, the pathology report, the treatment and follow-up record (`requires: ["records"]`, `performedAt: "records"`, `risk: "none"`); each exists only from its phase on.
- **Consults:** stroke team, vascular and cardiac surgeons, rehabilitation and genetics are calls, not transports; catheter-directed thrombolysis would need `fluoroscopy` (a trap, always contraindicated).
- **Speech:** no `nonVerbalWhen` — the case lets the boy say a few words (his conscious level and speech are not recorded; a staging choice). The companion is "Jin Zhiyuan's relative (pseudonym)", role `carer`, with no `presentation` because the relationship and sex are not recorded.
- **Facility:** `general-hospital`; `caseCapabilityGaps` is empty; the in-world demonstration passes in English and Chinese.

## Source and adaptation (fidelity limits)

**Facts.** Every patient fact is 1.0.0's extraction of the report (commit 88ed0d2); the check against the full article is pending (`extensions.sourceTextChecked: false`). Extraction summary — history: sudden left-sided paralysis for six hours; no injury before onset; very fast breathing at onset; at first the left arm and leg weak, the right side able to move; both calves obviously swollen and painful on hospital day 3. Examination: left central facial and tongue palsy; power 0 in the left arm and leg; Babinski positive; normal power on the right; left radial pulse not palpable; femoral pulses poor on both sides; legs cool; BP 110/70 mmHg on the right, unmeasurable on the left; respiratory rate 40/min; widespread moist crackles over both lungs. Records: brain MRI and vascular imaging; lower-limb vascular studies; later vascular imaging; echocardiography; resection pathology; treatment and outcome (all as in the Clinical summary). Unknown in 1.0.0 and kept unknown: earlier cardiac tests, medicines, allergies, family history, operations, vaccinations, exposures, baseline function, concerns, other admissions, embolus histology, the full coagulation work-up, the reason for the surgical interval, long-term recurrence.

**Inferences (derived, not new facts).** Left-sided signs localise to the right hemisphere; three territories at once suggest a single embolic source; the left subclavian occlusion explains the absent left radial pulse and the unmeasurable left blood pressure; the crackles and fast breathing with a mass prolapsing into the mitral orifice are taught as *suggesting* impaired left-heart filling (pulmonary oedema itself is not recorded — 1.0.0's distractor about "improved pulmonary oedema" was a hypothetical, not a fact); "waveforms" suggest Doppler ultrasound, so the lower-limb studies need `ultrasound` and carry Doppler aliases, while the record keeps 1.0.0's name; by sentence order the resection followed discharge.

**Contradictions kept (both readings, neutral wording).** (1) Calves: Chinese 明显肿痛 ("obviously" swollen and painful), English without a degree word — kept as "obviously". (2) Treatment: Chinese 抗凝 (anticoagulant), English "antithrombotic" — the record says anticoagulant and its note says the antithrombotic drug is not recorded. (3) Later imaging: Chinese 血管成像 (vascular imaging), English "angiography" — named "later vascular imaging" with "angiography" as an alias. (4) Recurrence check: Chinese 超声 (ultrasound), English "echocardiographic" — "ultrasound". (5) Left-leg proximal power: Chinese Ⅴ-, English "near grade V" — "V−". (6) "About a month later" has no explicit reference point. (7) The side of the femoropopliteal arterial thrombus and of the Babinski sign are not stated. (8) Whether the lower-limb studies came before or after the day-3 calf swelling is not recorded (1.0.0's history said "later records" describe the calves).

**Privacy.** Pseudonym 金知远 / Jin Zhiyuan (kept from 1.0.0; unique in the library and distinct from the cmcr-20 cases); no dates, hospitals or places.

**Teaching devices (labelled design, not facts of the report).** The five phases and their placement in time; staged records (orders on arrival return "requested — shown in the next part"); the later vascular imaging shown in the ward phase; the orderable tests with no recorded result (CT/CTA, glucose, bloods, ECG, chest X-ray, creatine kinase, genetic testing); the relative's role and the boy's and the relative's voiced worries; the boy saying a few words; the nurse, attending, cardiac and vascular surgeons and their knowledge (case facts and cited guidance only); every intervention response ("not recorded… not simulated").

**1.0.0 template defects replaced.** Three decisions of three options, no interventions, 15 generic history slots with authoring language in the patient's mouth ("the source does not provide…"), a critical rubric item scored on a decision alone, no dated guidance, and a management key that did not name thrombolysis, anticoagulation timing or compartment syndrome.

## Matcher notes

- The presenting-complaint item takes the plain openers in both languages ("What brings you in?", "What happened?", "How long?", "When did it start?"; 怎么了, 哪里不舒服, 多久了, 什么时候开始的) — checked by `scripts/case-check.ts` in the first phase.
- Run-together keywords (`whatbringsyou`, `whendiditstart`, `anyonewithhim`, `seeithappen`) avoid one-token wildcards.
- Exclusions keep the near neighbours apart: onset vs witnesses ("did anybody see it happen"), heart history vs earlier symptoms ("以前查出过心脏病"), injury vs earlier symptoms ("before this"), the side question vs the day-3 calves ("你右边的手和腿能动吗"), medicines vs snacks.
- 40 test utterances (both languages), four look-alike negatives (football, which team, the weather, snacks); every required item has a paraphrase; `cases verify` reports 40/40 with no extra selections.

## References

1. 孙兴珍, 田向阳, 刘娟. 左房黏液瘤并发全身多发性血管栓塞一例. 中华儿科杂志. 2013;51(7):548. doi:10.3760/cma.j.issn.0578-1310.2013.07.019. Available from: https://rs.yiigle.com/cmaid/33476
2. Royal College of Paediatrics and Child Health. Stroke in childhood: clinical guideline for diagnosis, management and rehabilitation. London: RCPCH; 2017. Available from: https://www.rcpch.ac.uk/stroke-guideline
3. Prabhakaran S, Gonzalez NR, Zachrison KS, et al. 2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke: a guideline from the American Heart Association/American Stroke Association. Stroke. 2026;57(8):e316-e436. doi:10.1161/STR.0000000000000513
4. Ferriero DM, Fullerton HJ, Bernard TJ, et al. Management of stroke in neonates and children: a scientific statement from the American Heart Association/American Stroke Association. Stroke. 2019;50(3):e51-e96. doi:10.1161/STR.0000000000000183
5. Kleindorfer DO, Towfighi A, Chaturvedi S, et al. 2021 Guideline for the prevention of stroke in patients with stroke and transient ischemic attack. Stroke. 2021;52(7):e364-e467. doi:10.1161/STR.0000000000000375
6. Björck M, Earnshaw JJ, Acosta S, et al. Editor's Choice – European Society for Vascular Surgery (ESVS) 2020 Clinical Practice Guidelines on the Management of Acute Limb Ischaemia. Eur J Vasc Endovasc Surg. 2020;59(2):173-218. doi:10.1016/j.ejvs.2019.09.006
7. Monagle P, Azzam M, Bercovitz R, et al. American Society of Hematology/International Society on Thrombosis and Haemostasis 2024 updated guidelines for treatment of venous thromboembolism in pediatric patients. Blood Adv. 2025;9(10):2587-2636. doi:10.1182/bloodadvances.2024015328
8. National Institute for Health and Care Excellence. Venous thromboembolism in over 16s: reducing the risk of hospital-acquired deep vein thrombosis or pulmonary embolism (NG89). London: NICE; 2018. Available from: https://www.nice.org.uk/guidance/ng89
9. Correa R, Salpea P, Stratakis CA. Carney complex: an update. Eur J Endocrinol. 2015;173(4):M85-M97. doi:10.1530/EJE-15-0209
10. Griborio-Guzman AG, Aseyev OI, Shah H, Sadreddini M. Cardiac myxomas: clinical presentation, diagnosis and management. Heart. 2022;108(11):827-833. doi:10.1136/heartjnl-2021-319479

**Verification (2026-11-14).** The source DOI is verified in `scripts/cmcr-105-sources.json` (publisher check 2026-10-29). Checked in the guideline's own text: RCPCH 2017 (full recommendations and pathway poster), AHA/ASA 2019 (Ferriero), AHA/ASA 2021 §5.6, ESVS 2020 (Recs 9, 10, 37–43, 58, 60; Table 5), ASH/ISTH 2024 Rec 1, NICE NG89 1.3.1, Correa 2015, the Griborio-Guzman 2022 abstract. The AHA/ASA 2026 paediatric statements were checked against the PubMed record, the AHA's own news release and secondary summaries only (the full text was not reachable). DOIs and pages confirmed with Crossref and PubMed.

### To verify

Against the full source article (the source pass):

- Every fact above; in particular the timing of the brain MRI, the echo and the lower-limb studies relative to arrival and to day 3, and what the "later records" say about the calves.
- 明显肿痛 vs no degree (calves); 抗凝 vs "antithrombotic" (which drug, dose, start and monitoring); 血管成像 vs "angiography"; 超声 vs "echocardiographic"; Ⅴ- vs "near grade V".
- The reference point of "about a month later"; the side of the femoropopliteal arterial thrombus and of the Babinski sign; which valve regurgitated.
- Whether the report gives haemorrhage status, infarct size, vital signs beyond RR and BP, conscious level, laboratory results, treatment of the limbs or the calves, the reason for operating after discharge, operative details, embolus histology, Carney complex assessment and the length of follow-up.
- Historical drug doses (1.0.0 omitted them).

For a clinician of the specialty (paediatric neurology / stroke, paediatric cardiology and cardiac surgery, vascular surgery):

- The class and level of evidence of the AHA/ASA 2026 paediatric thrombolysis and thrombectomy recommendations, and whether a mid-to-distal MCA occlusion counts as a "large-vessel occlusion" there.
- The keyed timing of excision ("today's referral, timing set with the stroke team") against current practice after multiple infarcts — no guideline fixes the interval.
- Applying adult guidance to a 12-year-old: ESVS 2020 compartment recommendations, NICE NG89 on stockings, AHA/ASA 2021 §5.6 on cardiac tumours.
- Correa 2015's "biannually" (taught as "more often than yearly") for imaging after a myxoma in Carney complex.
- That heparin is rightly left out of the reference path while haemorrhage status and clotting are unrecorded.

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- Template replaced: five phases (arrival, first results, ward day 3, later course, outcome) instead of four generic ones; five decisions of five options at the real decision points (mechanism, first hour, the mass, the calves, follow-up) instead of three of three; 14 interventions (the report's anticoagulation and resection, today's first-hour steps, and the tempting wrong steps) where there were none; 21 history items in the relative's and the boy's own words, unknowns said in voice, instead of 15 slots with "the source does not provide" answers; 13 investigations with staged reports and unrecorded tests instead of five records.
- Safety fixes: no thrombolysis at six hours (critical trap); heparin only after brain imaging (critical trap, the ESVS-versus-brain conflict taught); no leg thrombolysis after a stroke (critical trap); no compression of ischaemic legs; compartment syndrome first on day 3. The old management key, which named none of these, is replaced.
- Assessment: critical items are now acts done in time (imaging in the arrival phase, the cardiac referral before day 3) plus the avoided-harm item, instead of a decision scored alone; first-try scoring on every decision; examiner-judged communication with Calgary–Cambridge, SPIKES and teach-back.
- Teaching: six dated, guideline-attributed teaching points (RCPCH 2017, AHA/ASA 2026, AHA/ASA 2019, AHA/ASA 2021, ESVS 2020, ASH/ISTH 2024, NICE NG89 2018, Correa 2015), each contrasting the recorded course with today's practice; staff (nurse with ISBAR, attending with PEARLS, cardiac and vascular surgeons); a 40-utterance matcher corpus.
- Review status: editorial (AI-assisted); `sourceTextChecked: false`; pseudonym kept.

### 1.0.0 — 2026-10-28

Template version generated for the cmcr-105 collection: four phases, three decisions of three options, no interventions, 15 generic history items with authoring language in the patient's answers, three examination findings and five records, a rubric whose critical item was a decision scored alone, no dated guidance; DOI verified 2026-10-29.

## Validation

Run from the worktree root on 2026-11-14; all pass.

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-33476/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33476 --lang en                                                 # 63 steps, objectives 6/6, decisions 5/5, utterances 40/40, rubric 35/35 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-33476                                       # reference 100 %, do nothing 0/31, wrong first 60 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33476:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33476:"  # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要：** 12岁男孩突发左侧肢体瘫痪约6小时就诊，发病前无外伤，发病时呼吸急促。左侧中枢性面舌瘫、左上下肢肌力0级、Babinski征阳性；呼吸40次/分，双肺广泛湿啰音；左桡动脉未触及，双股动脉搏动差，下肢皮温低；右侧血压110/70 mmHg，左侧测不出。头颅MRI及血管成像示双侧多发脑异常信号（右侧为主）、右大脑中动脉中远段狭窄闭塞、左锁骨下动脉闭塞；下肢血管检查示双下肢重度缺血频谱、左腘静脉及股腘动脉血栓，后续血管成像见多处动脉闭塞；超声心动图示左房面房间隔及二尖瓣附近5.5 cm×3.5 cm有蒂团块，舒张期部分突入二尖瓣口，轻中度反流。住院第3天双侧小腿明显肿痛。先行支持、抗凝等治疗，住院40天后出院，约1个月后切除左房肿物，病理为左房黏液瘤；此后左上肢恢复，左下肢肌力近端Ⅴ-级、远端Ⅲ级，超声未见复发。

**学习目标：** 把多部位同时缺血归到同一栓子来源；为发病6小时的卒中患儿安排第一个小时（1小时内脑和血管影像、呼叫卒中团队评估取栓、不溶栓、影像前不抗栓）；理解肢体缺血需要肝素与脑出血风险之间的冲突；当天请心脏外科并由卒中团队定手术时机；小腿肿痛先排查骨筋膜室综合征；切除后随访复发并评估Carney综合征。

**关键决策：** ①统一解释：左心来源的多发栓塞；②第一个小时：影像、卒中团队、支持治疗，不溶栓、影像前不抗栓；③团块：今天请心脏外科，尽早切除，时机由卒中团队根据影像决定；④第3天小腿肿痛：先排查骨筋膜室综合征；⑤切除后：超声心动图随访、Carney综合征评估与遗传咨询、康复。

**复盘要点：** RCPCH 2017与AHA/ASA 2026的儿童卒中首小时和超急性期推荐；AHA/ASA 2019与ESVS 2020在抗凝上的取舍；AHA/ASA 2021关于卒中后切除左侧心脏肿瘤的推荐；ESVS 2020骨筋膜室综合征推荐；Correa 2015关于黏液瘤复发和Carney综合征的随访。报告记录的出院后约1个月才切除团块，今天需要写明理由。本病例尚未对照原文全文核对，也尚未经执业医师审核。

**安全结果。** 时间窗外静脉阿替普酶溶栓、头颅影像排除出血前使用肝素、卒中后下肢动脉导管溶栓是本病例的关键安全错误（critical），给任何一项都判定安全结果不通过；给缺血的腿抬高并穿弹力袜为可纠正的错误（非critical），扣分但不判定安全失败。
