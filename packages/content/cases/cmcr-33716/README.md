# cmcr-33716 — Recurrent fever and haemoptysis · 29-year-old man

> **Spoilers for facilitators and case authors.** This guide names the diagnosis. Learners open the case from the
> case library, where the title, summary and tags give nothing away.

**Published case — 已发表病例改编.** Adapted from a case report in the CMCR collection (郭彩霞, 付强, 陈步星. 中华心血管病杂志
2014;42(2):172-173; see References). The patient (周先生 / Mr Zhou) and every staff member are pseudonyms; hospitals, the
city and calendar dates are removed and times are relative to admission (day 0). The reported course is a fact of the
record; the decisions teach current guidance and say where earlier care fell short. It is not medical advice.

## Case card

| | |
|---|---|
| id / version | `cmcr-33716` / `1.1.0` |
| setting / facility | `inpatient` (a ward bed: respiratory ward, then cardiology) / `general-hospital` |
| specialty | cardiology, infectious diseases, cardiac surgery |
| difficulty / estimated time | 3 / 5 · ~35 min (static clock) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` (2026-10-28): AI-assisted authoring and editorial review against the guidance listed under References; **not yet reviewed by a licensed clinician** — have a cardiologist or infectious-diseases physician review it before teaching use |
| phases | `initial` → `workup` → `followup`, each entered automatically (none is learner-switchable; see the timeline) |
| content | 23 history items (12 recorded as unknown, 7 required), 6 exam findings, 10 investigations, 7 interventions, 5 learning outcomes, 6 objectives, 4 decisions (4/5/4/4 options), 12 rubric items (11 deterministic, total 19; 1 examiner-judged), 3 NPC briefs, 40 matcher test utterances |
| source | <https://rs.yiigle.com/cmaid/33716> (local figure `fig01`; local PDF `source-pdf`, opened after completion) |

## Learning outcomes

After the case the learner can:

1. Recognise infective endocarditis as the unifying diagnosis when prolonged fever comes with a new murmur or a
   vascular event (intracranial haemorrhage, aneurysm), and take blood cultures before antibiotics and arrange
   echocardiography (ESC 2023).
2. Apply the ESC 2023 modified Duke criteria, including why E. faecium is not a 'typical' organism and how 1 major plus
   3 minor criteria make the diagnosis definite.
3. State the ESC 2023 indication for and timing of surgery in left-sided endocarditis with heart failure, and how a
   previous intracranial haemorrhage or ischaemic stroke affects the timing.
4. Explain why normal echocardiograms months earlier and no murmur at a first visit do not exclude infective
   endocarditis.
5. Identify the anchoring that delayed this diagnosis (fever labelled sepsis and hysteria, attention fixed on the
   brain) and describe how a febrile patient with an intracranial aneurysm should be worked up.

These are distinct from the six HUD objectives (below).

## Clinical summary

**Diagnosis (hidden from the learner).** Native mitral valve infective endocarditis due to *Enterococcus faecium*:
two old anterior-leaflet vegetations, prolapse with severe regurgitation and probable chordal rupture, heart failure
(orthopnoea, BNP 377 ng/L), with an intracranial haemorrhage from a left MCA aneurysm four months earlier (coiled) and
a probable right temporoparietal infarct. Definite by the ESC 2023 modified Duke criteria before surgery (1 major + 3
minor, whatever the status of the microbiological criterion) and by the pathological criterion after it.

**Course (from the report).** About a year earlier: road-traffic injury, over four months in a trauma centre, five
operations (laparotomy, mesenteric and retroperitoneal repairs and others; multiple fractures), four normal
echocardiograms within two months of the injury. Four months ago: fever without obvious cause, up to 39–40 °C with
rigors, headache, limb weakness and anorexia; on day 3 sudden agitation and delirium; at a first hospital T 37.7 °C,
HR 104 regular, **no murmur**, WBC 8.17×10⁹/L with 91.8 % neutrophils; admitted as **"sepsis, hysteria"**; CT
haemorrhage, CTA an intracranial aneurysm; three days later the left MCA aneurysm was coiled at another hospital;
antibiotics (unspecified) and home after a week. Fever 37–39 °C persisted through repeated visits and head CTs. Two
weeks ago, at a county hospital: neutrophils 85 %, lung CT and abdominal ultrasound unremarkable, sinus tachycardia.
One week ago: cough, sputum, haemoptysis, wheeze, palpitations, orthopnoea. Day −1, our ED: T 38.6 °C, WBC 10.4×10⁹/L,
neutrophils 88.1 %, Hb 98 g/L, platelets 112×10⁹/L, sinus tachycardia, chest film "right-sided lung infection" →
respiratory ward. Day 0: T 38.6 °C, P 120, RR 20, BP 120/70 mmHg; alert, listless; lungs clear; **harsh grade 3–4
systolic murmur at the mitral area**; abdomen unremarkable; no oedema; right-leg external fixator → suspected IE,
transferred to cardiology. Work-up: WBC 10.8×10⁹/L, neutrophils 85 %, Hb 95 g/L, platelets 145×10⁹/L; D-dimer
4.3 μg/mL (0–1.5); cardiac enzymes normal; BNP 377 ng/L (0–100); CRP 105 mg/L (0–3); ESR 38 mm/h; echo as above with a
markedly enlarged left atrium, an enlarged left ventricle and a small pericardial effusion; two consecutive cultures
*E. faecium*. Treatment: vegetation removal and mitral bioprosthetic valve replacement (date not given); pathology
consistent with IE.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`, no `physiology`): a historical course, results immediate, nothing worsens over
time.

| phase | what the learner meets | entered when |
|---|---|---|
| `initial` 入院：呼吸科病房 · Admission: respiratory ward (day 0) | history; the admission examination (the murmur); the ED record (day −1) and the earlier hospital records; blood cultures sent; the immediate-plan decision and the look-back decision | start |
| `workup` 入院后检查（心内科）· Work-up after admission (cardiology) | echocardiography (figure 1), cultures (*E. faecium*, critical), blood tests, ECG, the neurological record and admission diagnoses; TOE and a current head CT have **no record**; the Duke and surgery decisions | the immediate-plan decision decided **and** the transfer to cardiology given (as the report's respiratory team did) |
| `followup` 原报告的治疗与转归 · The reported treatment and outcome | the operation, the pathology and the authors' discussion (record review) | the diagnosis and surgery decisions decided and the history, examination and surgery objectives done |

Ordering the echo, labs, ECG, neurological record, TOE or head CT in `initial` shows a notice that these were done
after the transfer (`orderMatching.warnings`, hidden in `workup`). The examination is recorded once, on admission, so
exam items exist only in `initial`; later examination requests return `examNotRecorded`.

## Decisions and assessment

**Objectives (chapters).** `obj-history` (the four-month timeline, this week's symptoms, the trauma operations,
earlier cardiac checks) → `obj-exam` (vital signs, heart, chest, legs) → `obj-plan` (ED and earlier records read,
`first-steps` decided, transferred to cardiology) → `obj-diagnosis` (echo, cultures and labs read, `diagnosis`
decided) → `obj-surgery` (neurological record read, Endocarditis Team, `surgery` decided, surgery arranged) →
`obj-review` (the reported outcome read, `first-presentation` decided). Hints coach without stating a result or an
option's text.

**Decisions** (each option has its own bilingual feedback; options shuffle):

| decision | opens when | correct | distractors (and why they are there) |
|---|---|---|---|
| `first-steps` | history (incl. this week, the brain event, earlier heart checks), the murmur and the ED record — **before** any echo or culture result | work up for IE: cultures before any new antibiotic, prompt echo (TOE if needed), cardiology to take over — what the report's respiratory team did | hospital-acquired pneumonia, antibiotics now (the ED film); a flow murmur from fever and anaemia; another brain bleed — repeat the head CT (**the first hospital's anchoring**) |
| `diagnosis` | echo and cultures read | definite IE: 1 major + 3 minor whatever the microbiological criterion | "possible" because E. faecium doesn't count; definite because E. faecium is a major criterion (right answer, wrong reason); rejected because of the earlier normal echos; pneumonia with sepsis |
| `surgery` | diagnosis decided, labs and neurological record read, the breathing history asked | urgent surgery within days; the haemorrhage (~4 months) is past the ≥ 4-week delay; probable infarct no reason to wait; Endocarditis Team | defer until a 6-week course ends; antibiotics alone; emergency surgery tonight without team review |
| `first-presentation` | earlier records read (any phase) | fever + intracranial haemorrhage/aneurysm = possible IE: repeated auscultation, cultures, echo, consider an infective aneurysm before treating it | "no murmur, so excluded"; hysteria plus empirical antibiotics; coil first, chase the fever later |

**Rubric** (deterministic total 19; safety and management items weigh most):

| item | domain | weight | met when |
|---|---|---|---|
| `r-hx-timeline` | history | 2 | presentation, fever onset, the brain event, the first hospital's labels and this week's symptoms asked |
| `r-hx-risk` | history | 1 | operations, earlier heart checks, dental work and injecting drug use asked |
| `r-exam-heart` | examination | 2 | vital signs and cardiac auscultation |
| `r-exam-systems` | examination | 1 | general state, chest, abdomen and legs (the fixator) |
| `r-records` | investigations | 1 | ED and earlier records read in `initial` |
| `r-cultures` | safety | **3** | `first-steps` right first time, cultures sent, no pneumonia antibiotics first |
| `r-workup` | investigations | 1 | echo, cultures and labs read; IE antibiotics given |
| `r-dx` | diagnosis | 2 | `diagnosis` right first time |
| `r-surgery` | management | **3** | `surgery` right first time, Endocarditis Team, surgery arranged |
| `r-no-deferral` | safety | 2 | surgery not deferred (harm-avoidance) |
| `r-lesson` | diagnosis | 1 | `first-presentation` right first time |
| `r-comm` | communication | 1 (judged) | plain explanation of the valve infection, why surgery now, the long antibiotic course; acknowledges the delay without blame; teach-back |

**Wrong choices and the engine's response.**

| choice | engine response |
|---|---|
| Broad-spectrum antibiotics for pneumonia (`hap-antibiotics`) | `contraindicated`; costs `r-cultures` |
| IE antibiotics before any culture is ordered (`iv-antibiotics`) | `contraindicated` (harm: cultures first); recorded in the debrief's safety list but **not** scored by the rubric (the engine cannot see the order of two actions) |
| Defer surgery (`defer-surgery`) | `contraindicated`; costs `r-no-deferral` |
| No transfer to cardiology | `workup` stays locked; the `obj-plan` hint points to handing him over |

**How paths score** (replayed with the engine on 1.1.0, before the coordinator's `scoredWhen` annotation):

| path | score | points lost |
|---|---|---|
| a. reference path | 19/19 (100 %) | — |
| b. pneumonia antibiotics before any blood culture | 16/19 (84 %) | `r-cultures` 3 |
| b2. IE antibiotics before the cultures were ordered | 19/19 (100 %); contraindicated event in the debrief | — (see Fidelity limits) |
| c. surgery deferred until the antibiotics are finished | 17/19 (89 %) | `r-no-deferral` 2 |
| d. first answer wrong on every decision | 10/19 (53 %) | `r-cultures` 3, `r-dx` 2, `r-surgery` 3, `r-lesson` 1 |
| e. never transferred to cardiology | 13/19 so far; cannot finish (`workup` locked) | `r-workup`, `r-dx`, `r-surgery` |
| f. no Endocarditis Team | 16/19 so far; cannot finish (`obj-surgery` open) | `r-surgery` 3 |
| g. earlier records never read | 17/19 so far; cannot finish (`first-presentation` locked) | `r-records` 1, `r-lesson` 1 |
| h. nothing done | 2/19 (11 %) — the harm-avoidance item; 0/17 once `scoredWhen` applies | everything else |

## Reference path (`solution`)

50 steps: start; history (presentation, fever onset, the brain event, the first hospital, after the coiling, the county
hospital, this week, the ED visit, operations, earlier heart checks, medicines, dental, injecting drugs, allergies, the
fixator); examination (vital signs, general, chest, heart, abdomen, legs); ED and earlier records read; blood cultures
sent; `first-steps` and `first-presentation`; IV cannula; transfer to cardiology → `workup`; echo, cultures, labs, ECG
and neurological record read; IE antibiotics; `diagnosis`; Endocarditis Team; `surgery`; surgery arranged →
`followup`; the reported outcome read; finish. No rejection or contraindicated intervention; 6/6 objectives, 4/4
decisions, 19/19.

## Clinical numbers check

Also in `extensions.authorChecks`.

| item | value | working |
|---|---|---|
| Duke (ESC 2023) | definite: 1 major + 3 minor (2 major if the cultures count) | major: vegetations; minor: fever 38.6 °C (≥ 38), vascular phenomena (intracranial haemorrhage, aneurysm), positive cultures not meeting a major criterion; E. faecium is non-typical and needs persistently positive cultures (e.g. two positives > 12 h apart — interval not reported) |
| Pathological criterion | met | vegetation with inflammatory necrosis, fibrinous exudate, granulation tissue |
| Surgery timing | urgent (3–5 days), not emergency | heart-failure symptoms (orthopnoea, BNP 377 ng/L, chordal rupture) with BP 120/70 mmHg and no shock |
| Neurological timing | haemorrhage ~4 months before admission | > the ≥ 4-week delay considered after a significant haemorrhage; a probable ischaemic infarct is not a reason to delay |
| BNP, CRP, D-dimer | 3.8 ×, 35 × and 2.9 × the upper limits printed | 377/100; 105/3; 4.3/1.5 |
| Haemoglobin | 98 → 95 g/L (ED → ward) | the authors note anaemia; no ranges printed |
| Timeline | trauma ~1 year; fever month −4; coiling ~day 3 of the first admission; county hospital ~2 weeks; new symptoms 1 week; ED day −1; admission day 0 | relative times from the report |

## Facilitator notes

**Debrief questions (PEARLS order).**

1. *Reactions* — "How did it feel when you heard that murmur, after he had been to so many hospitals?"
2. *Description* — "Tell his story in two sentences, from the first fever to today."
3. *Analysis*
   - "Four months ago he had fever, delirium, a brain haemorrhage and an aneurysm. What should that combination have
     made someone think of?"
   - "Why did the first hospital call it 'sepsis, hysteria', and what did that label stop people doing?"
   - "His heart sounded normal then and four echos were normal a year ago. Why doesn't that settle it?"
   - "Why blood cultures before any antibiotic, in a man who has had so many antibiotics already?"
   - "Is E. faecium a 'typical' organism? Does it matter for the diagnosis here?"
   - "What makes him need surgery, and how soon? What does the haemorrhage four months ago change?"
   - "What did the authors say about the timing of the aneurysm procedure?"
4. *Summary* — "What will you do next time you meet prolonged fever with a new murmur or an unexplained brain bleed?"

**Common learner errors and how the case surfaces them.**

| error | how the case surfaces it |
|---|---|
| Accepting the ED film's "pneumonia" | `first-steps` option b; `hap-antibiotics` contraindicated; `r-cultures` |
| Calling a new harsh murmur a flow murmur | `first-steps` c; `diagnosis` e |
| Anchoring on the brain | `first-steps` d; `first-presentation` c and d |
| Thinking old normal echos or a murmur-free first visit exclude IE | `diagnosis` d; `first-presentation` b |
| Miscounting the Duke criteria for a non-typical organism | `diagnosis` b and c |
| Deferring surgery because of an old haemorrhage | `surgery` b; `defer-surgery` contraindicated; `r-no-deferral` |
| Operating without the team | `surgery` d; `obj-surgery` needs the Endocarditis Team |

## Embodied mode

**Grounding.** The echo (`echocardiography`) and the ECG (`ecg-12lead`) are bedside studies: the machine comes to the
bedside. Blood cultures and blood tests are sampled at the patient (or at a records terminal or laboratory station
after the IV-access procedure has drawn bloods). The ED record, the earlier records, the neurological record and the
reported outcome are record reviews at a records terminal. The IE antibiotics and the pneumonia antibiotics require
`iv-access`: the case's `iv-access` procedure comes first in the reference path. The head CT (not in the reference
path; no record) would need the patient taken to the scanner.

**Scope of practice.** The cannula is nursing (the case's IV access); the antibiotics are nursing by kind; the
transfer, the Endocarditis Team referral, arranging and deferring surgery are medical.

**Where the patient goes.** He stays in his ward bed space: the transfers (respiratory → cardiology → cardiac surgery)
are recorded as dispositions without a destination, and the `followup` phase is a record review with no phase
location (the report does not say where he was after the operation).

**Measured (offline autopilot, 2026-10-28, `general-hospital`).** Clinical and in-world mode, zh-CN and en: 19/19
(100 %), 6/6 objectives, no contraindicated intervention; static clock (0 minutes).

## Source and adaptation

**From the report** (checked fact by fact against the full text, the print PDF pp. 172–173 and the export record):
the whole timeline above; the first hospital's examination, blood count and labels; the CT and CTA findings; the
coiling and the unspecified antibiotics; the county hospital's findings; the ED values and chest film; the admission
examination; every laboratory value with the reference ranges the report prints (D-dimer, BNP, CRP); the echo; the two
cultures; the six admission diagnoses; the operation and pathology; the authors' discussion (Duke criteria, enterococcal
biology, the three candidate sources and their reasoning, the missed diagnosis, the question of aneurysm timing).

**Adapted for teaching.** The three phases and their transitions; first-person lay dialogue (the city he travelled to is not
named: "since coming here"); the persona; the nurse's handover; the decision options and feedback; the interventions (the report's
transfers and operation, standard IE antibiotics, and the tempting wrong ones); the rubric; the notice that work-up
results come after the transfer.

**Restored in 1.1.0** (audit B1–B8): the first-presentation record (no murmur, the "sepsis, hysteria" labels, the
first blood count) and the intervening care (a new `prior-records` review); the ED record with the chest film
(`ed-record`) that the old pneumonia distractor depended on; the probable right temporoparietal infarct and the
authors' "cerebral embolism" (`neuro-record`); the general, abdominal and lower-limb findings, including the right-leg
external fixator; the road accident and the fractures; "old" vegetations, the markedly enlarged left atrium and the
small effusion; D-dimer, cardiac enzymes, RBC and the printed reference ranges; sputum and wheeze in the chief
complaint.

**Labelled points in the source.** The admission diagnoses call the right temporoparietal infarct "probable", while the
discussion states "cerebral embolism" without qualification; no imaging is given for either (both kept, labelled, in
`neuro-record` and the debrief). The export record and the text file print the DOI with an en dash
(`0253–3758`); the PDF footer prints a hyphen, which the case uses. No numerical contradictions were found.

**Figures.** `fig01` (apical four-chamber and left-ventricular long-axis echo views, arrows on the anterior-leaflet
vegetation) was viewed: it carries the CMA watermark and scale marks, no name, ID, hospital or date — kept, attached to
the `workup` echo result. The source PDF (`source-pdf`, opened only after completion) carries the report on page 1 and
the top of page 2 and the start of another case report from the lower half of page 2 (its title says so); like the
published article, it prints the authors' affiliation and the calendar date of admission, and the other report prints
dates — no patient name, ID or image overlay. The case text contains none of these.

**Fidelity limits.** No peripheral stigmata, neurological examination, oxygen saturation or current brain imaging are
recorded; the number and timing of culture sets, susceptibilities, the antibiotic regimen, the date of surgery, the
post-operative course and the neurological outcome are not reported. The source of the infection is the authors'
hypothesis. `r-no-deferral` is a harm-avoidance item earned by omission until the framework's pending `scoredWhen`
field is applied to it (then it counts once surgery has been decided, arranged or deferred). The rubric cannot see the
order of two actions, so IE antibiotics given before cultures are flagged as contraindicated in the debrief but not
scored (the pneumonia-antibiotic trap is scored through `r-cultures`).

## Matcher notes

- `presentation` and `breathing` are present-tense and limited to `initial` and `workup`; past history stays
  available in every phase. After the operation the report records nothing the patient could say, so `followup`
  questions get the unknown-history fallback.
- `excludeKeywords` separate look-alikes: the aneurysm event vs what happened after the coiling (做完/术后), the trauma
  operations vs heart checks and the aneurysm, the first hospital's labels vs being told about a murmur, the amount of
  blood vs the week's symptoms, and the IE antibiotics vs the pneumonia antibiotics (肺炎/广谱/pneumonia/broad-spectrum).
- English keywords avoid stop-word phrases that reduce to one token ("how much blood" → "amount of blood"; the
  amount question avoids "coughing" so "Have you been coughing up blood?" reaches `breathing`).
- 40/40 test utterances pass with no extra selections; 65/65 further realistic probes (history, exam incl. unrecorded
  stigmata falling to `examNotRecorded`, orders, interventions) reach the intended item.

## References

`debrief.references`, one Vancouver string each:

1. 郭彩霞, 付强, 陈步星. 屎肠球菌致感染性心内膜炎一例. 中华心血管病杂志. 2014;42(2):172-173.
   doi:10.3760/cma.j.issn.0253-3758.2014.02.016. Available from: https://rs.yiigle.com/cmaid/33716
2. Delgado V, Ajmone Marsan N, de Waha S, et al. 2023 ESC Guidelines for the management of endocarditis. Eur Heart J.
   2023;44(39):3948-4042. doi:10.1093/eurheartj/ehad193
3. Fowler VG Jr, Durack DT, Selton-Suty C, et al. The 2023 Duke-International Society for Cardiovascular Infectious
   Diseases criteria for infective endocarditis: updating the modified Duke criteria. Clin Infect Dis.
   2023;77(4):518-526. doi:10.1093/cid/ciad271
4. 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 成人感染性心内膜炎预防、诊断和治疗专家共识. 中华心血管病杂志.
   2014;42(10):806-816.

How they were checked (doi.org, Crossref and PubMed E-utilities are not reachable from the editing session): ref. 1 —
the DOI printed in the PDF footer (hyphen; the export record's en dash is a defect); refs 2–4 — the PR #3 audit's web
checks (ref. 2: ACC "Ten points to remember" and ESC Congress pages; ref. 3: PubMed 37138445; ref. 4: a citing
article, no DOI found, none given). The session's web-search budget ran out before these could be re-checked
independently; see To verify.

### To verify

- **ESC 2023 bibliographic details** (ref. 2: issue 39, pages 3948–4042, DOI) were taken from the audit and match the
  editors' knowledge, but were not re-checked in this session.
- **ESC 2023 wording** used in decisions and teaching points was confirmed by the audit through secondary sources:
  heart failure as the main indication; emergency < 24 h vs urgent 3–5 days; do not delay after TIA/ischaemic stroke;
  consider ≥ 4 weeks after a significant haemorrhage. No recommendation class is quoted.
- **Typical organisms** (oral streptococci, S. gallolyticus, HACEK, S. aureus, E. faecalis) and the "persistently
  positive" rule (> 12 h apart) for non-typical organisms come from secondary sources and standard Duke wording; check
  them against the ESC 2023 and Duke-ISCVID 2023 tables. Likewise the ESC 2023 wording of the vascular minor criterion
  (intracranial haemorrhage, infective aneurysm).
- **Blood cultures before antibiotics** and **TOE when TTE is non-diagnostic or for complications** are taught without
  the number of sets or a recommendation class.
- Whether a **newer Chinese IE guideline** has replaced the 2014 consensus was not checked.

## Changelog

### 1.1.0 — 2026-10-28 (editorial revision)

- **DOI fixed:** `10.3760/cma.j.issn.0253-3758.2014.02.016` (hyphen, as printed in the PDF) in `provenance.doi`, the
  citation and the references; the export record's en dash is noted in the provenance.
- **Source records restored:** first presentation and intervening care (`prior-records`), the ED record with the chest
  film (`ed-record`), the probable infarct and "cerebral embolism" (`neuro-record`), the general, abdominal and leg
  findings (the external fixator), the accident and fractures, "old" vegetations, the markedly enlarged left atrium,
  the effusion, D-dimer, cardiac enzymes, RBC and printed reference ranges; chief complaint with sputum and wheeze.
- **Decisions 2 → 4,** placed in time: `first-steps` (before any result), `diagnosis` (Duke, with the E. faecium
  subtlety), `surgery` (indication and timing per ESC 2023 — the audit's central reasoning moment), `first-presentation`
  (the report's lesson); option-specific feedback; first-try scoring. The old option that cited an unseen chest film is
  gone; the pneumonia distractor now rests on the ED record it requires.
- **Interventions 0 → 7** (IV access, transfer to cardiology, IE antibiotics after cultures, pneumonia antibiotics as a
  trap, Endocarditis Team, arrange surgery, defer surgery as a trap); **rubric 4 → 12** with two safety items and an
  examiner-judged communication item.
- **Phases:** `workup` is entered after the immediate-plan decision and the transfer (no longer learner-switchable), so
  the first decision is made before the echo and cultures.
- **Teaching layer:** 4 teaching points (ESC 2023, Duke-ISCVID 2023), 5 key reasoning points, 5 learning outcomes,
  8 case unknowns; debrief conclusion names the basis of the diagnosis; boundaries name the labelled discrepancy.
- **Voice:** first-person lay speech, the library's unknown-history fallback (no meta-language), persona and acting
  notes, affect `breathless`, posture `sitting`; title "· 29-year-old man"; summary and handover rewritten (different
  texts, no clue).
- **Matcher:** history 15 → 23 items with ≥ 4 real keywords per language; 16 verbatim test utterances → 40 paraphrases.
- **References** in Vancouver style (ESC 2023, Duke-ISCVID 2023, the 2014 Chinese consensus); figure credit names the
  authors; `provenance.review` (editorial); version 1.0.0 → 1.1.0; difficulty 4 → 3; estimated time 25 → 35 min.
- Ids changed (no test or e2e reference): history `neurological` → `neuro-event`, `fever-range` → `fever-onset` (+
  `after-coiling`, `county-hospital`, `first-hospital`, `ed-visit`), `medications` → `meds`, `occupation`/`self-care`/
  `expectations` → `work-home`/`ice`; exam `respiratory` → `chest` (+ `general`, `abdomen`, `legs`); decision
  `management` → `surgery` (+ `first-steps`, `first-presentation`); objectives and rubric renamed `obj-*` / `r-*`;
  option ids renamed. Investigation ids `echo`, `culture`, `labs`, `neuro-record`, `followup` kept.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-33716/case.json
npm run -s cc -- cases verify cmcr-33716
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-33716
npm run -s cc -- exec --case cmcr-33716 --autopilot --approval bypass --provider offline --output-format json
npm run -s cc -- exec --case cmcr-33716 --autopilot --approval bypass --provider offline --output-format json --embodied
```

On 2026-10-28 (1.1.0): validate 0 errors, 0 warnings; verify passes — 50 steps, objectives 6/6, decisions 4/4,
utterances 40/40; the collection test passes; the offline demonstration scores 19/19 (100 %) with every objective done
in clinical and in-world mode (zh-CN and en).

## 中文摘要

**病例概要。** 29岁男性。约1年前车祸外伤，急救中心住院4月余、手术5次（含剖腹探查）；外伤后2个月内4次超声心动图正常。4个月前
起无诱因发热（38～40 ℃，伴寒战、头痛、乏力、纳差），第3天突发烦躁、谵妄，首诊医院查体未闻及杂音，以“败血症、癔症”收治，CT
示脑出血、CTA示颅内动脉瘤，3天后转院行左大脑中动脉瘤栓塞；此后间断发热4个月。近1周咳嗽、咯血、喘息、心悸、夜间不能平卧，急诊
胸片提示右肺感染，收入呼吸科。入院查体二尖瓣区3～4级粗糙收缩期杂音，右下肢外固定器。超声心动图：二尖瓣前叶2个陈旧性赘生物，前
叶脱垂伴重度关闭不全，腱索断裂可能，左心房明显增大；BNP 377 ng/L，CRP 105 mg/L；连续2次血培养屎肠球菌。行赘生物清除并二尖瓣
生物瓣置换，病理符合感染性心内膜炎。

**学习目标。** ① 长期发热伴新杂音或血管事件时识别感染性心内膜炎，抗菌药前采集血培养并做超声心动图（ESC 2023）；② 运用改良
Duke标准（屎肠球菌非“典型”致病菌；1主3次即“确定”）；③ 说明心衰时的手术指征与时机，以及脑出血、缺血性卒中对时机的影响；
④ 解释既往正常超声和首诊无杂音不能排除；⑤ 认识本例的“锚定”误诊，说明发热伴颅内动脉瘤时应如何评估。

**关键决策。** 入院后的第一步（按感染性心内膜炎评估：抗菌药前血培养、尽快超声心动图、转心内科——不按肺炎先上抗生素，也不再盯着
脑部）；Duke归类（确定，无论培养是否达到微生物主要标准）；手术（限期、数天内；脑出血已约4个月；心内膜炎团队共同决定）；回看首诊
（发热+颅内出血/动脉瘤应想到感染性心内膜炎和感染性动脉瘤）。评分：确定性总分19分，抗菌药前血培养3分、手术指征与时机3分为最高
权重，另有1项由考官智能体评判的沟通项。

**复盘要点（PEARLS）。** 先谈感受，再用两句话讲清他的病程；分析时围绕：发热、谵妄、脑出血和动脉瘤同时出现应想到什么；“败血症、
癔症”的标签让人少做了什么；为什么既往正常的超声和首诊无杂音不能排除；为什么要在抗菌药之前采血培养；屎肠球菌在Duke标准中的地位；
他为什么需要手术、什么时候做、4个月前的脑出血改变了什么；作者为何质疑动脉瘤介入的时机。最后请学员总结：下次遇到长期发热伴新
杂音或不明原因的颅内出血时要做的事。
