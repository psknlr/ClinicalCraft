# cmcr-33640 — Recurrent abdominal pain and black stools · boy aged 7 years 5 months

> Facilitator guide. **Spoilers below** (diagnosis, results, outcome). Version 1.1.0 is re-authored from the facts that
> version 1.0.0 recorded; those facts have **not yet been checked against the full source article** (see "Source and
> adaptation" and "To verify").

## Case card

| Field | Value |
|---|---|
| Setting / facility | Inpatient, children's ward · `general-hospital` |
| Level / time | Difficulty 4/5 · about 35 minutes |
| Specialty | Paediatrics, gastroenterology |
| The patient | Tang Zhiyuan (唐知远, pseudonym), a boy aged 7 years 5 months, with a relative (which relative is not recorded) |
| What the learner can do | Take the history from the boy and his relative, examine him, read the admission blood results and the report's endoscopy, nuclear-scan, CT and capsule reports, order today's tests (crossmatch, iron studies, film and reticulocytes, abdominal ultrasound), give or withhold 14 treatments and referrals, answer four decisions, then compare with the report's course |
| Languages | Simplified Chinese and English (`zh-CN`, `en`) |
| Clock | Static (historical case review; no simulated physiology) |
| Review status | `editorial` — AI-assisted authoring and editorial review against the cited guidance; **not yet reviewed by a licensed clinician**; facts not yet checked against the full article (`extensions.sourceTextChecked: false`) |

## Learning outcomes

1. Recognise gastrointestinal blood loss from black stools, pallor and a haemoglobin falling from 130.5 to 72.5 g/L with
   positive occult blood, despite earlier labels of mesenteric lymphadenitis and superficial gastritis.
2. Secure IV access and a crossmatch on admission, and decide on red-cell transfusion from the whole picture and the
   WS/T 795—2022 thresholds rather than from one number.
3. Sequence the search for the source: gastroscopy and colonoscopy, then capsule endoscopy as the first-line
   small-bowel test (ESGE 2022), with the paediatric checks (swallowing or endoscopic placement, no obstruction,
   weight-based preparation).
4. Explain what a capsule finding without active bleeding or histology can and cannot prove, and plan device-assisted
   enteroscopy if bleeding recurs.
5. Avoid unsupported or harmful steps — tranexamic acid (HALT-IT 2020), plasma with normal coagulation, NSAIDs, more
   antibiotics, surgery before localisation — and arrange iron and haemoglobin follow-up.
6. Explain the findings, the uncertainty and the follow-up plan to the boy and his relative, and check understanding
   with teach-back.

## Clinical summary (spoilers)

A boy aged 7 years 5 months had six months of bouts of pain around the navel, each lasting minutes and settling on its
own. Two months earlier he passed black stools twice, and 20 days earlier twice more, with pallor and fatigue at those
times. When the pain began there was no fever, cough, vomiting, diarrhoea or black stools. Earlier labels were
mesenteric lymphadenitis and superficial gastritis; anti-infective treatment did not clearly relieve the pain, and
later haemostatic and other treatment helped only briefly.

On examination he looked anaemic, heart rate 100/min, a grade II apical systolic murmur, a soft non-tender abdomen and
the spleen 1 cm below the costal margin. Haemoglobin had fallen from 130.5 g/L (earlier) through 74 g/L to 72.5 g/L on
admission; faecal occult blood was positive and coagulation normal. Colonoscopy showed no abnormality, gastroscopy
superficial gastritis, the ectopic gastric mucosa (Meckel) scan was negative, and small-bowel CT showed no obvious
narrowing, dilatation or soft-tissue mass. **Capsule endoscopy showed multiple focal thickened, tortuous vessels from
the upper to the terminal ileum, with no active bleeding**; the capsule passed at 48 hours and no tissue was taken.

After acid suppression, haemostatic treatment and transfusion, among others, the pain and black stools stopped and he
was discharged improved. **The report's diagnosis, per its title: small-intestinal capillary telangiectasia
(小肠毛细血管扩张症).** No long-term follow-up, enteroscopy, surgery or histology is recorded.

What the case teaches against the record: the earlier labels do not explain a haemoglobin of 72.5 g/L; safety
(access, crossmatch, a transfusion judged on the whole picture) comes before localisation; after negative upper and
lower endoscopy the small bowel is next, with capsule endoscopy first-line; a capsule finding without active bleeding
or tissue is a probable, not proven, source; and the report's haemostatic drugs and acid suppression are historical
practice whose effect cannot be judged from one case of intermittent bleeding.

## Scenario timeline and physiology

Static clock: no vital signs evolve, no treatment response is simulated, and every result is the report's.

| Phase (`id`) | Opens when | What exists in it |
|---|---|---|
| Admission (`admission`) | start | History (boy and relative), examination (all five findings), admission records: blood count (Hb series), faecal occult blood, coagulation; today's orderable tests (crossmatch, iron studies, film/reticulocytes, abdominal ultrasound: no result recorded). Decisions 1 and 2 open here. |
| Work-up results (`workup`) | decisions 1 and 2 answered correctly | The report's gastroscopy, colonoscopy, ectopic gastric mucosa scan and small-bowel CT reports (their timing relative to admission is not recorded; staging them here is a teaching device). Decision 3. |
| Further investigation (`further-tests`) | decision 3 answered correctly | The capsule endoscopy report. Decision 4. |
| Reported treatment and outcome (`outcome`) | all four decisions answered correctly | The report's treatment and outcome record, with the source figure (`fig01`). Not learner-switchable. |

The admission records carry the same text in every later phase (an earlier report stays in the notes); the work-up
reports exist from `workup` on, the capsule report from `further-tests` on, the outcome record only in `outcome`.
Ordering a later record early is refused ("does not exist yet at this stage of care").

## Decisions and assessment

### Objectives (HUD chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-story` Hear the story | presentation, pain pattern, black stools, pallor/tiredness, earlier treatment, earlier labels asked |
| 2 | `obj-examine` Examine him | appearance, heart rate, heart, abdomen, spleen examined |
| 3 | `obj-first-steps` Read the admission results and act on them | blood count, occult blood, coagulation read; IV access given; crossmatch ordered; decisions 1 and 2 right |
| 4 | `obj-source` Look for the source | gastroscopy, colonoscopy, Meckel scan, small-bowel CT read; decision 3 right |
| 5 | `obj-plan` Interpret the new report and plan ahead | capsule read; decision 4 right; enteroscopy plan; iron studies ordered; discharge plan |
| 6 | `obj-outcome` Compare with the report | outcome record read in `outcome` |

No objective holds a condition that can become permanently false (no phase leaf, `whenIndicated` or first-try
condition); titles and hints name no diagnosis and no option text.

### Decisions

| id | Opens after | Key (why) | Distractors (why they tempt) |
|---|---|---|---|
| `first-priorities` | presentation, black stools, pallor asked; all five findings examined; blood count, occult blood and coagulation read in `admission` | `blood-loss-first`: GI blood loss — circulation, cannula and crossmatch, no NSAIDs, then gastroscopy and colonoscopy (ACG 2015: the small bowel is considered once upper and lower endoscopy are negative) | `treat-labels` (the earlier diagnoses); `dietary-iron` (iron deficiency is common in children); `ct-angiography-now` (imaging feels decisive — but CT angiography looks for active bleeding, ACG 2015 Rec 17, and the last recorded black stools were 20 days earlier) |
| `transfusion` | decision 1; coagulation read in `admission` | `clinical-threshold`: judge the whole picture; blood ready; transfuse slowly by weight if he rebleeds, turns unstable or falls below 70 g/L with symptoms (WS/T 795—2022 §9.5.1: < 50 g/L transfuse, 50–70 g/L consider; §9.1.2 instability raises the threshold; §12.3 rate) | `transfuse-to-normal` (restore a "normal" Hb before endoscopy, quickly); `plasma-ratio` (fixed-ratio plasma and platelets — haemorrhagic-shock practice, §9.5.2); `no-blood` (chronic anaemia, iron only, no crossmatch) |
| `next-test` | gastroscopy, colonoscopy, Meckel scan, small-bowel CT read in `workup` | `capsule`: small-bowel capsule endoscopy soon after the latest bleed; can he swallow it or is it placed endoscopically; no narrowing on CT; preparation by weight (ESGE 2022 MR1–MR2) | `gastritis-explains` (an abnormal finding is on record); `laparotomy` (everything else is negative — ACG 2015 reserves intraoperative enteroscopy); `angiography` (find and treat in one session — it shows a bleeding point only while bleeding is brisk, about 0.5–1 mL/min; ACG 2015 keeps emergency angiography for unstable massive bleeding) |
| `after-capsule` | capsule read in `further-tests` | `probable-source`: probable, not proven; device-assisted enteroscopy to confirm and treat if he rebleeds or stays anaemic (ESGE 2022 MR5; ACG 2015 Rec 23 ties endoscopic therapy to significant ongoing anaemia or active bleeding); iron; Hb follow-up and return advice; ask about nosebleeds, telangiectases and the family | `incidental` (nothing was bleeding; ESGE 2022 MR3 does not recommend routine second-look endoscopy); `resection` (multiple lesions from the upper to the terminal ileum); `settled` (images as proof; stop follow-up when stools are no longer black) |

Every option has feedback of its own naming the guidance where one applies. Option ids name their content. Measured
option lengths (characters, zh-CN / en): the key is the uniquely longest only in decision 1 (67 / 222); a distractor is
longer in decision 2 (`transfuse-to-normal` 66 / 227 vs key 62 / 220), decision 3 (`gastritis-explains` 51 / 196 vs
49 / 186) and decision 4 (`incidental` 61 zh, `resection` 211 en vs 54 / 200).

### Rubric (13 deterministic items, weight 30, + 1 examiner-judged)

| id | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history-core` | history | 2 | presentation, pain pattern, black stools, pallor/tiredness, earlier treatment asked |
| `rb-history-context` | history | 1 | onset symptoms, earlier labels, regular medicines (NSAIDs), nosebleeds, family asked (the last three unrecorded: asking is the competency) |
| `rb-examination` | examination | 2 | appearance, heart rate, heart, abdomen, spleen |
| `rb-admission-results` | investigations | 1 | blood count, occult blood, coagulation read in `admission` |
| `rb-first-priorities` | diagnosis | 3 | decision 1 right first time |
| `rb-access-crossmatch` | management | 3 | **critical** — IV access given while `admission` holds (`whenIndicated`) **and** crossmatch ordered in `admission` |
| `rb-transfusion` | management | 3 | decision 2 right first time |
| `rb-workup-records` | investigations | 2 | the four work-up reports read in `workup` |
| `rb-next-test` | diagnosis | 3 | decision 3 right first time |
| `rb-no-laparotomy` | safety | 3 | **critical** — no laparotomy; `scoredWhen`: laparotomy given or decision 3 attempted |
| `rb-no-unsupported-treatment` | safety | 2 | no tranexamic acid, plasma, ibuprofen or further antibiotics; `scoredWhen`: any of them given, or decision 1 or 2 attempted |
| `rb-after-capsule` | diagnosis | 3 | decision 4 right first time |
| `rb-plan` | management | 2 | enteroscopy plan, iron studies ordered, discharge plan |
| `rb-communication` | communication | (judged) | Calgary–Cambridge explanation to the relative and, at his level, to the boy; honest uncertainty; teach-back (judge guidance in the case) |

**Critical items are acts done in time**, never a decision alone: `rb-access-crossmatch` counts IV access only while
its `indicatedWhen` (`{"phase": "admission"}`) holds, and the crossmatch only if ordered in `admission` — the first
phase cannot be re-entered, so neither is creditable in hindsight; the objective that needs them accepts them at any
time, so a late learner can still finish. `rb-no-laparotomy` is the avoided dangerous error.

### How wrong choices score (measured 2026-11-14 with core `assess` on replays of the reference path)

| Path | Score | Critical items missed / safety outcome |
|---|---|---|
| Reference path (`solution`) | 30/30 (100 %) | none / passed |
| Do nothing (start, then try to finish) | 0/25 (finish refused: objectives incomplete) | `rb-access-crossmatch` / passed |
| A wrong first answer at every decision, then the right one | 18/30 (60 %) | none / passed |
| Each of the 12 distractors first at one decision only | 27/30 (90 %) | none / passed |
| Reference path + tranexamic acid, or + plasma, or + ibuprofen, or + another antibiotic course (each alone) | 28/30 (93 %) | none; a contraindicated safety event is listed / passed (`critical: false`) |
| Reference path + exploratory laparotomy (before decision 3) | 27/30 (90 %) | `rb-no-laparotomy`; **safety outcome fails** (`critical: true`) |
| Reference path + red-cell transfusion, + acid suppression or + paracetamol | 30/30 (100 %) | none (neutral acts) |
| IV access given late (work-up), or crossmatch ordered late (work-up) | 27/30 (90 %) | `rb-access-crossmatch` / passed |
| No IV access and no crossmatch at all | stops at 27/30 (cannot finish: `obj-first-steps`) | `rb-access-crossmatch` |
| No enteroscopy plan, iron studies or discharge plan | stops at 28/30 (cannot finish: `obj-plan`) | none |

Doing nothing earns nothing (the avoided-harm items count only once their harm was possible), and every harmful act
with a harm text costs marks or fails the safety outcome.

**Safety outcome.** `laparotomy` (exploratory laparotomy with intraoperative enteroscopy) is `critical: true`, risk
high, contraindicated throughout: in a child with intermittent bleeding and no recorded shock, an operation before the
source is localised is irreversible harm that capsule endoscopy and enteroscopy make unnecessary (ACG 2015; ESGE 2022),
so giving it fails the run's safety outcome whatever the score. `tranexamic-acid`, `ffp`, `ibuprofen` and
`antibiotics` are contraindicated but explicitly `critical: false` (risk moderate): recoverable misjudgements without
evidence of benefit (HALT-IT 2020 and ESGE 2021 for tranexamic acid, whose only guideline place in GI bleeding — mild
bleeding in confirmed HHT, HHT 2020 B5 — does not apply; WS/T 795—2022 §9.5 for plasma; the UK SmPC of a children's
ibuprofen suspension for active or recurrent gastrointestinal haemorrhage; China's 2015 guiding principles for
antibacterials) — each is listed
as a safety event and costs `rb-no-unsupported-treatment`. Red-cell transfusion is deliberately not contraindicated:
the report transfused, and the decision belongs to the clinical picture.

## Reference path (`solution`)

Start → ask all 21 history items (the boy for where it hurts; the relative for the rest, 13 of them unrecorded) →
examine appearance, heart rate, heart, abdomen, spleen → **IV access → crossmatch** → observations → read blood count,
occult blood and coagulation (`admission`) → order iron studies and film/reticulocytes → decision 1 `blood-loss-first`
→ decision 2 `clinical-threshold` → (work-up) paediatric gastroenterology review → read gastroscopy, colonoscopy,
Meckel scan, small-bowel CT → decision 3 `capsule` → (further investigation) read the capsule report → enteroscopy plan
→ oral iron → discharge plan → decision 4 `probable-source` → (outcome) read the report's treatment and outcome →
finish. No transfusion, acid suppression or haemostatic drug is in the reference path; none is contraindicated except
the four unsupported drugs and the laparotomy.

## Clinical numbers check

| Number | Source | Note / derived |
|---|---|---|
| Age 89 months | 1.0.0 `patient.age` | = 7 years 5 months (title) |
| Pain 6 months; each bout minutes, settling by itself | 1.0.0 chief complaint, history | — |
| Black stools 2 months; twice 2 months earlier, twice 20 days earlier | 1.0.0 chief complaint, history | 4 recorded black stools in two bouts |
| Heart rate 100/min | 1.0.0 examination | not graded in the record; blood pressure, capillary refill and other vital signs not recorded |
| Grade II apical systolic murmur | 1.0.0 examination | — |
| Spleen 1 cm below the costal margin | 1.0.0 examination | side not stated in 1.0.0 (not added) |
| Hb 130.5 → 74 → 72.5 g/L (admission) | 1.0.0 blood record | unit g/L stated once for the series; fall 58 g/L (44 %) from the earlier value; dates of the first two not recorded |
| Faecal occult blood positive; coagulation normal | 1.0.0 blood record | no coagulation values |
| Capsule passed at 48 hours | 1.0.0 capsule record | it passed, so retention did not arise |
| WHO 2024: anaemia < 115 g/L, severe < 80 g/L at 5–11 years | WHO 2024 guideline | 72.5 g/L = severe by these cut-offs |
| WS/T 795—2022: non-life-threatening bleeding Hb < 50 g/L transfuse, 50–70 g/L consider | §9.5.1 (read in the standard's text) | 72.5 g/L is above the band; instability (§9.1.2), rebleeding and symptoms decide |
| Red cells about 5 mL/kg/h, ≤ 150 mL/h, slower first 15 min; small slow volumes in severe anaemia | WS/T 795—2022 §12.3.1–12.3.2 | weight not recorded: no volume can be computed |
| SBCE ideally within 48 h of an overt bleed | ESGE 2022 MR2 | — |

No dose is stated anywhere in the case: his weight is not recorded, every medicine is "dose by weight", and no
intervention carries a `doseSpec`. 1.0.0 had deliberately left out the report's bowel-preparation doses; they stay out.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions** — How did it feel to be handed the labels "mesenteric lymphadenitis" and "superficial gastritis"?
- **Description** — Walk me through what you knew on admission: which finding made you think of blood loss, and what did
  you put in place before anything else?
- **Analysis** —
  - Hb 72.5 g/L with a heart rate of 100/min: why is this not an automatic transfusion, and what would change your mind?
    (WS/T 795—2022 §9.5.1; instability, a rebleed, symptoms.)
  - Gastroscopy showed superficial gastritis. Why is that not the answer?
  - The Meckel scan was negative. Does that exclude a Meckel's diverticulum? Where does ACG 2015 put the scan?
  - What does the capsule prove, and what does it not? Why might the capsule see no active bleeding?
  - The report gave acid suppression, haemostatic treatment and transfusion, and the bleeding stopped. Which of these
    worked — and how would you know?
  - Multiple small-bowel vascular lesions in a child: which three questions would you add to the history? (Nosebleeds,
    skin/lip telangiectases, family — the Curaçao criteria.)
- **Summary** — Safety first; then upper and lower endoscopy; then the small bowel with a capsule; a capsule finding is
  a probable source; plan for the rebleed.

### Common learner errors and how the case surfaces them

| Error | Where it shows |
|---|---|
| Anchoring on the earlier labels | Decision 1 `treat-labels`; the antibiotics intervention (contraindicated event, −2) |
| Treating the number, not the child (transfuse to normal, or never) | Decision 2 `transfuse-to-normal` / `no-blood`; the transfusion response quotes the WS/T 795 rate |
| Forgetting access and crossmatch while thinking about the diagnosis | `rb-access-crossmatch` (critical) is missed if they come after the admission phase |
| Reaching for "haemostatics" or plasma | `tranexamic-acid`, `ffp` (contraindicated events, −2) |
| Giving an NSAID for the pain | `ibuprofen` (contraindicated event, −2); `paracetamol` is the neutral alternative |
| Operating because "everything is negative" | Decision 3 `laparotomy`; the `laparotomy` intervention fails the safety outcome |
| Treating a capsule image as proof, or as irrelevant | Decision 4 `settled` / `incidental` / `resection` |
| Stopping follow-up once the stools are normal | Decision 4 `settled`; `obj-plan` cannot complete without the plan acts |

## Embodied mode

- **Records vs bedside.** Every report of the case (blood count, occult blood, coagulation, gastroscopy, colonoscopy,
  ectopic gastric mucosa scan, small-bowel CT, capsule, outcome) is a record read at a records terminal or in the notes
  at the bedside (`requires: ["records"]`, `performedAt: "records"`, risk none): no transport, sample or device. The
  capsule study is not repeated in the world.
- **Today's tests.** The crossmatch goes to the blood bank, iron studies to chemistry, film/reticulocytes to
  haematology, and an abdominal ultrasound is bedside; none has a recorded result ("No result is recorded for this
  test.").
- **Bedside acts.** IV access and observations are within nursing scope; transfusion and plasma need the blood bank and
  IV access; the laparotomy needs the operating theatre (`surgery`) and is never in the reference path.
- **Speakers.** The boy speaks (he is verbal; no `nonVerbalWhen`); he answers "where does it hurt" himself
  (`speaker: "patient"`); his relative (`role: carer`, presentation left out because who they are is not recorded)
  answers the rest.
- **Facility.** `general-hospital`; `caseCapabilityGaps` is empty; the in-world demonstration
  (`embodied-autopilot.test.ts`) completes the reference path in en and zh-CN.

## Source and adaptation (fidelity limits)

**The facts are version 1.0.0's extraction** (commit `88ed0d2`); the full source article was not available while
re-authoring, so nothing has been checked against it yet (`extensions.sourceTextChecked: false`; the review notes say
so). Every patient fact traces to 1.0.0; nothing was added.

**Extraction summary (1.0.0 → 1.1.0).** Patient 89 months, male → `patient`; chief complaint and triage → `chiefComplaint`,
`triageNote`, history `presentation`; periumbilical bouts of minutes → `pain-site`, `pain-pattern`, opening line; black
stools (two months earlier ×2, 20 days earlier ×2) → `black-stools`; pallor and fatigue with them → `pallor-tiredness`;
no fever/cough/vomiting/diarrhoea/melaena at onset → `onset-symptoms`; anti-infective treatment without clear relief,
later haemostatic and other treatment with brief improvement → `earlier-treatment`; earlier labels → `earlier-labels`;
allergies, family, operations, regular medicines, past health, vaccinations, exposures, function and concerns
unrecorded → unknown items (some re-asked more specifically: medicines including NSAIDs, nosebleeds, family bleeding,
weight, swallowing, stools since admission, vomited blood); anaemic appearance, HR 100/min, grade II apical systolic
murmur, soft non-tender abdomen, spleen 1 cm → five exam findings; Hb 130.5 → 74 → 72.5 g/L, FOB positive,
coagulation normal → three admission records; colonoscopy, gastroscopy, ectopic gastric mucosa scan, small-bowel CT →
four work-up records; capsule findings, 48-hour passage, no tissue/histology → capsule record; the bowel preparation
1.0.0 described as a historical large-volume, adult-like preparation (doses omitted by 1.0.0) → capsule record note;
acid suppression, haemostasis, transfusion etc., pain and black stools stopped, discharged improved, no long-term
follow-up → outcome record; the article title's diagnosis → outcome record and debrief; figure `fig01` → outcome record.

**Contradictions and specificity differences kept (not resolved).**
1. 1.0.0's Chinese "抗感染" (anti-infective treatment) is rendered "antibiotics" in its English; 1.1.0 says "treated for
   an infection" in both languages.
2. "止血等治疗" (haemostatic and other treatment) is "haemostatic/supportive care" in 1.0.0's English; 1.1.0 keeps
   "treatment to stop the bleeding, among other things".
3. "贫血貌" (anaemic appearance) is "Pallor" in 1.0.0's English; 1.1.0 uses "He looks anaemic".
4. The triage note says pale and tired in general; the history ties pallor and fatigue to the black stools. 1.1.0's
   triage note and history both tie them to the black stools, and the persona says he looks pale (the examination's
   anaemic appearance).
5. 1.0.0's library summary graded the anaemia "marked/明显"; no grade is recorded, so 1.1.0 gives values and teaches
   the WHO 2024 grading.
6. "Hb 130.5 → 74 → 72.5 g/L": the unit is stated once for the series and the dates and settings of the first two
   values are not recorded; kept as such.

**Labelled teaching devices.** The children's ward and the relative; staging the gastroscopy, colonoscopy, scan and CT
reports in a work-up phase (their timing relative to admission is not recorded — gastroscopy may well predate
admission, as the earlier gastritis label suggests); the attending, nurse and paediatric gastroenterologist; the boy's
and the relative's words; every decision, intervention, option and score. The outcome phase is the report's course.

**What 1.0.0 got wrong and 1.1.0 replaces.** Template history slots answered with authoring language ("the source does
not provide…"); three decisions of three options with role-named ids (`yes`); a critical item scored from a decision
(`decidedFirstTry: management`), creditable without any act; no interventions, no nurse; a library summary that graded
the anaemia; generic teaching points without guidance. 1.0.0's main safety idea — do not copy the report's adult-style
bowel preparation to a child — is kept in decision 3 and the teaching points.

**Privacy.** Pseudonym 唐知远 / Tang Zhiyuan; no names, hospitals, cities or dates. The figure is the one approved in
`scripts/cmcr-105-media-review.json` (endoscopic images; local only; sha256 `a9fb1f27…`), attached only to the outcome
record so it cannot reveal the capsule finding early.

## Matcher notes

- The plain openers (en "What brings you in today?", "What happened?", "What's the problem?", "Tell me what's been going
  on.", "How long has this been going on?", "When did it start?"; zh 这次怎么了、哪里不舒服、怎么回事、有什么不舒服、多久了、
  什么时候开始的) all reach `presentation` in `admission` (probed with core `matchHistory`).
- Look-alikes separated by `excludeKeywords`: `black-stools` vs `stools-since` (住院后, since he came in) and vs
  `pallor-tiredness` (脸色, pale); `earlier-treatment` vs `earlier-drugs` (how much, dose, which antibiotic) vs
  `medicines` (regular, ibuprofen); `onset-symptoms` vs `vomited-blood` (blood, coffee); `growth` vs `weight`;
  `abdomen` vs `spleen`; `heart` vs `heart-rate`. Multi-word keywords that the matcher would reduce to one stopword-free
  token are written run together (`whendiditstart`, `comeandgo`, `thrownup`…).
- Interventions: `transfusion` excludes plasma/platelet words, so "输血浆" reaches `ffp`; generic "give …" aliases were
  removed so "give paracetamol" reaches `paracetamol`, not a blood product ("giveblood" is written run together).
- Orders: an `orderMatching` rule keeps "小肠镜" / "enteroscopy" from retrieving the colonoscopy record (its alias 肠镜 is
  a substring of 小肠镜); enteroscopy is the `dae-plan` intervention. The laparotomy carries `excludeKeywords`
  (会诊, 意见 / review, consult, opinion), so asking for a surgical opinion no longer offers the operation as a candidate.
- Corpus: 42 utterances (24 en, 18 zh-CN), 3 look-alike negatives, at least one for every required item; all pass
  `cases verify` with no extra selections.

## References

1. 郭城, 陈琍, 骆金芝, 吴婧, 刘泽玉, 赵翠平. 小肠毛细血管扩张症一例. 中华儿科杂志. 2013;51(9):694-695.
   doi:10.3760/cma.j.issn.0578-1310.2013.09.013. Available from: https://rs.yiigle.com/cmaid/33640 (DOI verified
   against publisher metadata 2026-10-29, per `scripts/cmcr-105-sources.json`).
2. Pennazio M, Rondonotti E, Despott EJ, et al. Small-bowel capsule endoscopy and device-assisted enteroscopy for
   diagnosis and treatment of small-bowel disorders: ESGE Guideline – Update 2022. Endoscopy. 2023;55(1):58-95.
   doi:10.1055/a-1973-3796 (main recommendations MR1–MR6, MR9 checked in the published recommendation list).
3. Gerson LB, Fidler JL, Cave DR, Leighton JA. ACG Clinical Guideline: Diagnosis and Management of Small Bowel Bleeding.
   Am J Gastroenterol. 2015;110(9):1265-87. doi:10.1038/ajg.2015.246 (the definition and recommendations 9, 16, 17,
   22, 23 and 28 checked in the full text, the ACG-hosted PDF, on 2026-11-14).
4. 中华人民共和国国家卫生健康委员会. WS/T 795—2022 儿科输血指南. 2022 (§9.1, §9.5, §12.3 read in the standard's text).
5. World Health Organization. Guideline on haemoglobin cutoffs to define anaemia in individuals and populations. 2024.
6. HALT-IT Trial Collaborators. Lancet. 2020;395(10241):1927-36. doi:10.1016/S0140-6736(20)30848-5.
7. Gralnek IM, Stanley AJ, Morris AJ, et al. ESGE Guideline – Update 2021 (NVUGIH). Endoscopy. 2021;53(3):300-32.
   doi:10.1055/a-1369-5274 (recommendation 9 read in the guideline's text).
8. Friedlander JA, Liu QY, Sahn B, et al. NASPGHAN Capsule Endoscopy Clinical Report. J Pediatr Gastroenterol Nutr.
   2017;64(3):485-94. doi:10.1097/MPG.0000000000001413.
9. Shovlin CL, Guttmacher AE, Buscarini E, et al. Diagnostic criteria for hereditary hemorrhagic telangiectasia
   (Rendu-Osler-Weber syndrome). Am J Med Genet. 2000;91(1):66-7. PMID 10751092.
10. 《抗菌药物临床应用指导原则》修订工作组. 抗菌药物临床应用指导原则（2015年版）（国卫办医发〔2015〕43号附件）. 2015
    (basic principle 一 read in the NHC text).
11. Faughnan ME, Mager JJ, Hetts SW, et al. Second International Guidelines for the Diagnosis and Management of
    Hereditary Hemorrhagic Telangiectasia. Ann Intern Med. 2020;173(12):989-1001. doi:10.7326/M20-1443 (recommendations
    B3, B5, B6 read in the guideline's text; cited in the tranexamic-acid harm and teaching point 5).
12. Ibuprofen 100 mg/5 ml oral suspension (Fenpaed): summary of product characteristics. emc; revised 2024 Oct 28.
    https://www.medicines.org.uk/emc/product/4573/smpc (section 4.3 read; cited in the ibuprofen harm text).

### To verify

**Source pass (against the full article, before `sourceTextChecked: true`):**
1. The haemoglobin series (130.5, 74, 72.5 g/L): units, dates and settings of the first two values; the faecal
   occult blood test's timing; any coagulation values.
2. The timing of gastroscopy, colonoscopy, the ectopic gastric mucosa scan and small-bowel CT relative to admission
   (the case stages them in a work-up phase); whether colonoscopy reached the terminal ileum; biopsies; scan
   pre-treatment; CT technique.
3. The capsule report's exact wording (回肠上段至末段多发局灶血管增粗迂曲), how the capsule was taken, and the bowel
   preparation's agent, volume and doses (1.0.0 calls it large-volume and adult-like) and which test it preceded (1.0.0
   discusses it with the capsule study, so the case attaches it to the capsule record).
4. The earlier treatment: 抗感染 vs "antibiotics", 止血等 vs "haemostatic/supportive care"; drug names and doses.
5. The in-hospital treatment: acid suppression, haemostatic drugs, the transfused component, volume, timing and the
   haemoglobin before it; any enteroscopy, surgery or histology; length of stay; follow-up.
6. Anything the article records that 1.0.0 dropped: blood pressure, weight, nosebleeds, skin or lip telangiectases,
   family history (relevant to HHT), other blood-count values, the authors' discussion.
7. Whether pallor and fatigue were general or only with the black stools (triage note vs history).
8. What `fig01` shows (capsule images are likely) and whether its title should say so after the check.

**Clinician review (paediatric gastroenterology, paediatric surgery, transfusion):**
1. Decision 2: applying WS/T 795—2022 §9.5.1 (non-life-threatening bleeding) to a symptomatic 7-year-old at 72.5 g/L
   with HR 100/min and unknown blood pressure; whether the key's "below 70 g/L with symptoms" wording is right.
2. ACG 2015 (now checked in its full text) is an adult guideline: confirm that the statements used here (the Meckel
   scan's place, angiography, intraoperative enteroscopy, surgery, endoscopic therapy with significant ongoing anaemia)
   carry over to a 7-year-old.
3. ESGE 2022 is built mainly on adult evidence; check the 2026 Chinese paediatric consensus on small-bowel capsule
   endoscopy (Subspecialty Group of Gastroenterology, Society of Pediatrics, Chinese Medical Association, et al. [Expert
   consensus on the clinical use of small bowel capsule endoscopy in children (2026)]. Zhonghua Er Ke Za Zhi.
   2026;64(6):610-617. doi:10.3760/cma.j.cn112140-20260209-00130 — no abstract or text available during authoring) for age, swallowing or
   placement, preparation and retention, and cite it if it supports the key.
4. WHO 2024 cut-offs were confirmed from a guideline summary; check the WHO document. Chinese textbooks grade
   anaemia differently (72.5 g/L would be moderate by the commonly taught 60–90 g/L band) — decide whether the zh text
   should show both.
5. Tranexamic acid: HALT-IT is an adult trial, and the 2020 international HHT guideline (B5, read in its text) suggests
   considering oral antifibrinolytics for mild HHT-related GI bleeding (weak, low-quality evidence); confirm that
   "contraindicated, not critical" fits a child without an HHT diagnosis, including after the capsule finding.
6. Laparotomy as the critical error: confirm with paediatric surgery (diagnostic laparoscopy for a suspected Meckel's
   diverticulum despite a negative scan is a different, debated question that the case does not score).
7. The ibuprofen contraindication (UK SmPC of a children's suspension, revised 2024): confirm in the BNF for Children.

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- Rebuilt from 1.0.0's facts (extraction table in the authoring report; contradictions above): 4 phases with staged
  evidence (admission → work-up → further investigation → outcome), 21 history items in the boy's and his relative's
  words (13 unknown in voice), 5 exam findings, 13 investigations (9 records, 4 orderable tests without recorded
  results), 14 interventions, 4 decisions of 4 options, 14 rubric items, 6 objectives, attending + nurse + paediatric
  gastroenterologist, dated guideline-attributed teaching points, 42 matcher utterances.
- Template defects removed: authoring language in answers, role-named option ids, the decision-only critical item, the
  absence of interventions and of a nurse.
- Safety design: critical act in time (IV access + crossmatch on admission); critical avoided harm (laparotomy before
  localisation, safety outcome fails); unsupported drugs (tranexamic acid, plasma, ibuprofen, more antibiotics) as
  non-critical contraindicated acts with guideline-named harm texts; no doses anywhere (weight unrecorded).
- Guidance verified online on 2026-11-14: ESGE 2022, ACG 2015 (summaries), WS/T 795—2022, WHO 2024, HALT-IT 2020,
  ESGE 2021, China's 2015 antibacterial principles, Curaçao criteria 2000, ibuprofen SmPC.
- Review status `editorial` (was `unreviewed`), three-plus named guidelines, `sourceTextChecked: false`.
- Independent review (same day): removed what 1.0.0 does not record — "stigmata" beside the capsule's "no active
  bleeding", "no bleeding" for "no active bleeding", the earlier labels placed before the black stools, and the earlier
  anti-infective treatment strengthened from "no clear relief" to "failed"; decision 1 now opens only after the
  coagulation result its prompt quotes has been read; the tranexamic-acid harm and teaching point 5 scoped to the
  evidence (HALT-IT, ESGE 2021) with the 2020 HHT guideline's weak recommendation for mild HHT-related bleeding; the
  ibuprofen contraindication cited from a verified paediatric SmPC (2024) instead of an unverifiable 2026 revision;
  ACG 2015 statements checked in its full text; an order rule so that "小肠镜" no longer retrieves the colonoscopy
  record; the laparotomy no longer offered for a surgical consult; wording (angiography's detection threshold, the
  Meckel-scan qualifier, no authoring language in the teaching points, the persona's age).

### 1.0.0

Template version (2026-10-28): a de-identified adaptation with four phases, 15 generic history slots (most answered
"the source case does not provide that information"), two examination findings, five records, no interventions, three
decisions of three options (ids `yes`, …), a critical item scored from the management decision, one attending and no
nurse; the bowel-preparation doses of the source were omitted on purpose.

## Validation

Run from the worktree root (2026-11-14):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-33640/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33640 --lang en                                                 # 59 steps, 6/6 objectives, 4/4 decisions, 42/42 utterances, 30/30 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-33640                                       # reference 100 %, do nothing 0/25, wrong first 60 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33640:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33640:"  # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要：** 7岁5个月男孩，脐周阵发痛半年（每次数分钟自行缓解），两个月前黑便2次、20天前又2次，黑便时面色苍白、乏力；
此前诊断“肠系膜淋巴结炎”“浅表性胃炎”。入院贫血貌，心率100次/分，心尖区Ⅱ级收缩期杂音，脾肋下1 cm；血红蛋白130.5→74→
72.5 g/L，便潜血阳性，凝血正常。结肠镜未见异常，胃镜示浅表性胃炎，异位胃黏膜显像阴性，小肠CT成像未见明显狭窄、扩张或软组织
块影；胶囊内镜见回肠上段至末段多发局灶性血管增粗、迂曲，未见活动性出血，胶囊48小时排出，未取组织。经抑酸、止血和输血等治疗后
腹痛、黑便停止，好转出院；原报告标题的诊断为小肠毛细血管扩张症。本版事实取自1.0.0版，尚未对照原文全文核对。

**学习目标：** 识别消化道失血、不被旧诊断锚定；入院当天建立静脉通路并配血，按整体情况和WS/T 795—2022决定输血；先胃镜和结肠镜，
再以胶囊内镜作为小肠一线检查（ESGE 2022）并做好儿童前提核查；说明胶囊发现的证据强度并安排再出血时的器械辅助小肠镜；避免氨甲环酸、
凝血正常时输血浆、非甾体抗炎药、再用抗生素和未定位手术；向孩子和家属解释并用回授法核实。

**关键决策：** ① 首先怎么做——按消化道失血处理，先保安全再找来源；② 是否输血——看整体情况，Hb<50 g/L应输，50–70 g/L结合病情；
③ 上下消化道检查阴性后——小肠胶囊内镜；④ 胶囊结果——“很可能的”来源，再出血时小肠镜确认并治疗，补铁、随访血红蛋白。

**复盘要点：** 72.5 g/L按WHO 2024为重度贫血，但输血不只看数字；浅表性胃炎和阴性梅克尔显像都不能结束检查；胶囊没看到活动性出血，也没取组织，
间歇性出血正好解释这一点；多发小肠血管病变要问流鼻血、皮肤口唇毛细血管扩张和家族史（库拉索标准）；原报告的抑酸、止血药是历史做法，
单个病例不能证明哪种药起了作用。

**安全结果：** 未定位前剖腹探查（`laparotomy`）为关键安全失误（`critical: true`），一旦实施即判安全结果不通过；氨甲环酸、新鲜冰冻
血浆、布洛芬和再用抗生素为禁忌但非关键（`critical: false`），记为安全事件并扣分。
