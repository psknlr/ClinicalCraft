# cmcr-1551890 — Worsening cardiac function after chest pain · 65-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners should open the case from the
> case library, where the title, summary, chief complaint, tags and triage note give nothing away.

**Published-case adaptation.** The case follows one published report from the CMCR collection
(docs/CMCR_CASES.md): 李文俊, 蕭鳳儀, 何澄邦. 急性心肌梗死併發室間隔破裂ECMO支持1例. 鏡湖醫學. 2025;25(1):62-63.
The patient (欧阳女士 / Ms Ouyang) is a pseudonym, and the ICU nurse (彭护士 / Nurse Peng) and attending (邓医生 / Dr
Deng) are invented teaching roles; hospitals, calendar dates and identifying details are removed. The course and
outcome are the report's; what the report does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-1551890` / `1.1.1` |
| setting / facility | `icu` / `general-hospital` (ICU bed 1) |
| specialty | cardiology, critical care |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language; the report is in traditional Chinese), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have a cardiologist or intensivist review it before teaching use |
| phases | `initial` 转入交接 / Arrival and handover → `workup` 床旁评估与支持 / Bedside assessment and support → `bridge` 机械支持过渡期 / Bridge on mechanical support → `followup` 原报告结局 / Reported outcome — all one-way, none learner-switchable |
| content | 16 history items (9 not recorded in the report, 5 required; the relative answers) · 3 exam findings · 13 investigations (7 record reviews; 3 without a reported result — blood gas/lactate, renal panel, the low-value CT) · 11 interventions (3 harmful, 1 timing-dependent) · 6 objectives · 4 decisions (17 options) · 10 rubric items (9 deterministic, weight 19; 1 examiner-judged) · 2 NPCs · 6 learning outcomes · 6 teaching points · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise a new systolic murmur with heart failure after a myocardial infarction as a mechanical complication —
   telling septal rupture from papillary-muscle and free-wall rupture — and confirm it at once with bedside
   echocardiography.
2. Explain the haemodynamics of septal rupture (left-to-right shunt, pulmonary over-circulation, biventricular
   failure) and use them to justify avoiding fluid boluses and reserving vasodilators for patients whose blood
   pressure allows it.
3. Plan vasoactive support with mechanical circulatory support (IABP, VA-ECMO) as a bridge, managed by the Heart
   Team at a centre with cardiac surgery, in line with ACC/AHA 2025 and ESC 2023 ACS guidance.
4. Monitor aortic-valve opening and LV size by echo during VA-ECMO, recognise LV overload and name at least two
   ways to unload the ventricle.
5. Weigh the timing of repair with the mortality data for no, early and delayed repair — including survivor
   bias — and explain why current guidance individualises the timing rather than fixing an interval.
6. State the ESC 2023 reperfusion windows (primary PCI within 120 min, fibrinolysis within 12 h, transfer after
   lysis, rescue PCI, routine angiography at 2–24 h) and identify the time points this record leaves out.

These are the case's `learningOutcomes` (case card on request, every debrief); the six HUD `objectives` below are
the in-game task list.

## Clinical summary

**At the first hospital (transfer records).** A 65-year-old woman with hypertension and hyperlipidaemia presented
after one day of chest pain. Cardiac enzymes were raised (no values given), the chest film showed pulmonary
oedema and the ECG ST elevation in V2–V5. Acute myocardial infarction was diagnosed and she received a coronary
vasodilator, anticoagulation and tenecteplase (TNK). She then deteriorated: a **new systolic murmur** appeared,
echo showed a **ventricular septal aneurysm with rupture (perforation)** and an emergency coronary angiogram showed
**three-vessel disease**. Her cardiac function kept deteriorating and she was transferred, already **mechanically
ventilated**, to the authors' ICU for further treatment.

**After transfer.** The ECG showed an acute extensive anterior infarction with complete right bundle branch block
(figure 1; machine header: HR 93/min, QRS 128 ms). CK-MB was 247 ng/mL and high-sensitivity troponin T
16,016 ng/L (both marked ↑, no ranges). Bedside echo showed the septal aneurysm and rupture, **defect 1.52 cm**,
with **left-to-right shunting** (figure 2). Ventilation continued and CRRT plus **IABP and VA-ECMO** were started,
with an immediate multidisciplinary discussion. Cardiovascular surgery judged early repair too dangerous and
advised elective repair once the margins had stabilised and scarred (**4–6 weeks**), bridged on ECMO; cardiology
found **no PCI indication and no conditions for percutaneous closure**. The ICU team checked the ventricles and the
defect by echo every day and adjusted ECMO to ScvO₂, lactate, loading, contractility, aortic-valve opening and
upper- versus lower-body perfusion (figure 3, a schematic). Once more stable she was **transferred back to the
referring hospital** for the next stage. Repair, ECMO duration and survival are not reported.

**Diagnosis.** Post-infarction ventricular septal rupture after an anterior STEMI treated with fibrinolysis,
with progressive cardiac failure bridged on IABP + VA-ECMO.

## Scenario timeline and physiology

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the report's.
- **Four one-way phases** (none learner-switchable, so a learner cannot open a later record early or be trapped
  in an earlier one):
  - `initial` — arrival: the relative's history, the bedside look, the first hospital's ECG, chest film, enzymes
    and angiogram report, and the ICU's own ECG and markers. The bedside echo and the first hospital's echo
    report are **not** available yet (an order-entry notice says why).
  - `workup` — entered on the first attempt at decision 1 (`attempted: diagnosis`): the bedside echo, the first
    hospital's echo report, decisions 2 and 3, support and consultations.
  - `bridge` — entered once decisions 2 and 3 are right: the ICU course and MDT record (the report's actual
    support, the surgeons' 4–6-week advice, cardiology's view, the daily monitoring, figure 3) and decision 4.
  - `followup` — entered once decision 4 is right, the bridge record has been read and objectives 1–2 are done:
    the transfer-out and outcome record.
- Records read in one phase stay readable later (orders keep their phase); referral records carry results in
  both `initial` and `workup`, so a learner who skipped them can still read them.
- No prompt, hint, order response or harm text states the report's later course before its record opens. Only
  after a learner commits to a wrong option or a harmful order does its feedback name what the report's team did
  (the surgeons' 4–6-week advice, cardiology's "no PCI indication" and "no percutaneous closure"); the correct
  `support` option's feedback names the report's support.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-handover` Take the history from her relative | presentation, first-hospital treatment, course, past history and onset-to-lysis interval asked |
| 2 | `obj-first-look` Examine her and review the transfer records | general inspection and heart auscultation; first-hospital ECG and chest film (phase `initial`) and enzymes read |
| 3 | `obj-mechanism` Explain why she deteriorated | `diagnosis` right |
| 4 | `obj-support` Confirm the cause and stabilise her | ICU ECG, markers and bedside echo read; `support` right; ventilation, vasoactive infusion and IABP or VA-ECMO given |
| 5 | `obj-heart-team` Agree the definitive plan with the Heart Team | both consultations, angiogram read, `management` right |
| 6 | `obj-bridge` Follow her ICU course and review the reported outcome | `lv-unloading` right; bridge record and outcome record read |

The journal lists later objective titles before they are reached, so the titles name no lesion, device or repair.
Hints coach with questions ("which complication is more typical after an anterior and which after an inferior
infarct?", "what does the ECMO return do to the left ventricle?") and never contain an option's text.

### Decisions

- `diagnosis` (before any echo; needs the course, the murmur, the first ECG and chest film): a mechanical
  complication, most likely septal rupture after an anterior infarct, confirmed by bedside echo. Distractors:
  re-occlusion → repeat lysis; papillary-muscle rupture "because it follows anterior infarcts"; free-wall rupture →
  blind pericardiocentesis.
- `support` (needs the bedside echo and markers): vasoactive drugs + early MCS (IABP, VA-ECMO if perfusion is not
  restored), ventilation, daily echo, Heart Team at a cardiac-surgical centre — the report's choice and current
  guidance. Distractors: fluid boluses; multivessel PCI first; vasodilator without support.
- `management` (needs both consultations and the angiogram; the report's own plan is **not** shown before it):
  an individualised Heart-Team timing. Distractors: "immediate repair is always best (≈ 90 % die unrepaired)";
  "4–6 weeks is always safer — fix the date now" (**the report's surgical advice, made a rule**); "no repair once
  ECMO has stabilised her"; "device closure now".
- `lv-unloading` (bridge phase): a shut aortic valve with a dilating LV → lower the flow, support ejection, add
  unloading. Distractors: raise the flow; remove the IABP; give fluid.

Every option has its own feedback (why it is right or wrong, with the guidance it rests on).

### Rubric (9 deterministic items, total weight 19, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 2 | presentation, treatment, course, past history, onset-to-lysis asked |
| `rb-first-look` | examination | 1 | general + cardiac examined; first ECG and chest film read |
| `rb-dx` | diagnosis | 3 | `diagnosis` right first time |
| `rb-confirm` | investigations | 2 | ICU ECG, markers and bedside echo read |
| `rb-support` | management | 3 | `support` right first time; ventilation, vasoactive, IABP and VA-ECMO given |
| `rb-safety` | safety | 3 | no fluid bolus, repeat lysis or multivessel PCI request |
| `rb-heart-team` | management | 2 | both consultations; `management` right first time |
| `rb-lv-unloading` | management | 2 | `lv-unloading` right first time |
| `rb-review` | investigations | 1 | bridge and outcome records read |
| `rb-communication` | communication | (judged) | explains the tear, the bridge, the uncertain timing and the high risk to the relative without false reassurance |

### How wrong choices score

- Decisions are scored with `decidedFirstTry`: guessing through the options costs the item.
- `fluid-bolus`, `repeat-lysis` and `request-multivessel-pci` are always `contraindicated` (safety events in the
  debrief, and they fail `rb-safety`); each has its own harm text.
- `transfer-back` is `contraindicated` in `initial`/`workup` (before the lesion is defined and support is running)
  and `neutral` afterwards; it is not in the reference path because the report does not say what the referring
  hospital offers (see the teaching point on cardiac-surgical centres).
- `crrt` is `neutral`: the report started it without stating why.
- **Pending framework fields** (S/pr3/fxc-annotations/cmcr-1551890.json, applied by the coordinator):
  `rb-safety` gets `scoredWhen` (counts once the learner has attempted the support decision or given any support or
  harmful item) and `critical: true`. Until then, as in every case, doing nothing earns `rb-safety` (3/19).

## Reference path (`solution`)

52 steps, static clock: start → all 16 history questions → general inspection and heart auscultation → first ECG,
chest film, enzymes (records) → ICU ECG and markers → `diagnosis` → (phase `workup`) bedside echo, first echo report,
angiogram report → ventilation, vasoactive infusion, IABP, VA-ECMO, CRRT → `support` → cardiac surgery and
cardiology consultations → `management` → (phase `bridge`) `lv-unloading` → bridge-phase inspection → bridge
record → (phase `followup`) outcome record → finish. `cases verify` passes; the deterministic rubric scores 19/19.

## Clinical numbers check

All numbers are the report's; nothing is derived or invented.

- CK-MB 247 ng/mL ↑, hs-TnT 16,016 ng/L ↑ (the report gives no reference ranges; shown as "reference range not
  reported").
- Figure 1 machine header (labelled as such in the result note): HR 93/min, PR 154 ms, QRS 128 ms, QT/QTc
  364/422 ms, P/QRS/T axes 59°/43°/65°.
- Defect 1.52 cm (figure 2 caliper "Dist 1.52 cm"), left-to-right shunt.
- ECMO targets from the report's discussion, used as formulas in the VA-ECMO dose text: initial flow
  50–70 mL/kg/min, MAP > 65 mmHg, SvO₂ > 60 %. No patient weight is recorded, so no flow is computed.
- Outcome figures quoted by the report and used in feedback: in-hospital mortality of VSR ≈ 71.2 %; 91.5 % without
  vs 52.3 % with repair (its ref. 7); STS: 54.1 % for repair within 7 days vs 18.4 % later (its ref. 8). Not used:
  incidence ≈ 3/1000 AMI for mechanical complications and ≈ 1/1000 for VSR; VSR within 10–14 days, mean 2.6 days;
  ECMO survival 30–40 % vs < 10 % (uncited in the report).
- Repair plan 4–6 weeks (the report's surgeons).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to take over a patient who could not tell you anything herself?"
2. **Description.** "In two sentences: what had happened to her, and what did you put in place?"
3. **Analysis.**
   - "Before the echo, what did you think the murmur was, and why — what made septal rupture likelier than
     papillary-muscle rupture here?"
   - "Why were fluids the wrong answer to her poor circulation?"
   - "What does VA-ECMO do to the left ventricle? What would you look for on tomorrow's echo?"
   - "The surgeons wanted to wait 4–6 weeks. What does that buy, what does it cost, and what would make you
     operate sooner?"
   - "She came in after a day of pain and was thrombolysed. What would you need to know to judge that choice
     today?" (the record does not give the onset-to-lysis time — do not let the group call it late)
   - "What would you want to know about the referring hospital before sending her back?"
   - "How did you explain to her relative what is going on and what may happen?"
4. **Summary.** "What will you do the next time a patient's heart failure worsens with a new murmur days after an
   infarct?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Waiting for the echo before thinking | decision 1 opens before any echo; the order-entry notice explains | `rb-dx` |
| Treating it as re-occlusion (repeat lysis) | `reocclusion` feedback; `repeat-lysis` contraindicated | `rb-dx`, `rb-safety` |
| Fluids for "hypotension" | `fluids-first` feedback; `fluid-bolus` contraindicated | `rb-support`, `rb-safety` |
| "Open the arteries first" | `pci-first` feedback; `request-multivessel-pci` contraindicated, cardiology declines | `rb-support`, `rb-safety` |
| Accepting a fixed 4–6-week wait (or the opposite extreme) | `always-delay` / `always-immediate` feedback; the bridge record then shows the report's actual plan | `rb-heart-team` |
| More ECMO flow for a closed aortic valve | `more-flow` feedback | `rb-lv-unloading` |
| Inventing what the record lacks (vitals, ECMO settings, repair) | unknown items, not-reported results, `examNotRecorded` | — |

### Teaching points for the debrief

The six `debrief.teachingPoints`: (1) new murmur + deterioration → mechanical complication, emergency echo (ESC
2023 ACS); (2) shunt haemodynamics, vasoactive drugs and IABP, no fluid (ESC 2023; ACC/AHA 2025 text); (3) VA-ECMO
is a bridge and loads the LV — flow, aortic-valve opening, unloading, complications (report; ELSO 2021); (4) repair
timing as a Heart-Team trade-off — survivor bias; ACC/AHA 2025 Class 1 (cardiac-surgical centre) and 2a (MCS
bridge); the report's fixed 4–6 weeks then vs no fixed interval now; (5) revascularisation does not close the defect
(cardiology's view; CULPRIT-SHOCK; AHA 2021 on percutaneous closure); (6) the reperfusion window and the unrecorded
onset-to-lysis time (ESC 2023).

## Embodied mode

- **Where things are (`general-hospital`).** The patient lies in ICU bed 1 and is never moved in the reference path
  (offline autopilot, en and zh-CN: no `patient.moved`; 19/19 in clinical and in-world mode). Record reviews are
  ordered and read at a `records` terminal (the ICU station). The ICU ECG uses the unit's ECG cart; the bedside echo
  needs the portable ultrasound/echo cart, which the autopilot wheels from imaging; the markers are sampled at the
  patient. Ventilation needs the bed's ventilator, the vasoactive infusion an infusion pump at the bed, CRRT the
  unit's dialysis machine; IABP and VA-ECMO need only the clinician at the patient (the facility has no ECMO or IABP
  equipment type). The low-value chest CT would need her taken to the scanner — a deliberate lesson in transport
  risk.
- **IV access in situ.** She received tenecteplase intravenously at the first hospital, so she arrives with venous
  access: `extensions.embodied.ivAccessInSitu: true`; there is no IV-access procedure.
- **Scope of practice.** The vasoactive infusion and the fluid bolus are nursing-scope (kind default); ventilation,
  IABP, ECMO and CRRT are medical procedures; consultations and the transfer are phone/disposition acts.
- **Record reviews.** All seven `records` items require only `records`; the coordinator adds `performedAt:
  "records"` when the framework field lands (annotation file).
- **She cannot speak.** Until `patient.nonVerbalWhen` (annotation: `{ "always": true }`, reason "on a ventilator") is
  honoured, the companion answers every history question (`answersHistory: true`), the patient's opening line is a
  bracketed narration, her persona is an actor brief ("never speaks; do not act out responsiveness") and she has no
  `concerns`.
- **Truthful cues — limitation.** `appearance.accessory` has no endotracheal tube, ventilator or ECMO-cannula value,
  so the 3D figure lies in bed without visible support devices (`accessory: "none"`); the exam findings and the
  triage note say what she is on.

## Source and adaptation (fidelity limits)

**From the report.** Age, sex, past history (hypertension, hyperlipidaemia), one day of chest pain, the first
hospital's findings (raised enzymes, pulmonary oedema, ST elevation V2–V5) and treatment (coronary vasodilator,
anticoagulation, TNK), the new systolic murmur, the first echo (septal aneurysm with rupture) and emergency
angiogram (three-vessel disease), continued ventilation, the transfer ECG, markers and echo with their values, the
support (CRRT, IABP + VA-ECMO), the MDT views (4–6-week delayed repair with ECMO bridging; no PCI indication or
percutaneous-closure option), the daily monitoring parameters, and the outcome (more stable, transferred back for
the next stage). The authors' discussion supplies the reasoning used in feedback (new murmur → bedside echo; shunt
physiology; ECMO as a bridge, flow targets, aortic-valve opening, IABP/Impella unloading, complications; the
mortality data and the risks of blind delay).

**Adapted for teaching.** The relative (the report mentions no family) and all dialogue; the ICU nurse and
attending; the four decisions, their options and feedback; the eleven interventions (the reported steps plus
tempting wrong ones), their dose texts (standard practice; the ECMO targets are the report's) and responses (each
says what the report does not record); the phase gating; the rubric; the low-value CT and the three not-reported
results (blood gas/lactate, renal panel); the "artificial airway" wording (the report says only that mechanical
ventilation was continued).

**Labelled contradictions.** None found: the structured abstract and the case text agree, and the PDF matches the
text. One ambiguity is kept open: the report lists "IABP + ECMO" together, so their order is unknown.

**Unknowns kept honest** (`unknowns`, unknown history items, not-reported results, `examNotRecorded`): onset-to-lysis
time and dose; the days of the murmur, echo, angiogram and transfer; when and why she was intubated; vital signs,
drug doses, lactate/ScvO₂, renal function and the reason for CRRT; murmur details and any other examination;
echo details beyond the defect and shunt; coronary detail and any PCI; device timing, settings, anticoagulation,
complications and duration; repair, survival; her usual function, smoking, family history, medicines, allergies
and wishes.

**Figures.** All three published figures are used and none was dropped: fig01 (transfer ECG; machine-measurement
header only — no name, ID, hospital or acquisition time) with `ecg`; fig02 (bedside echo; machine settings and the
1.52 cm caliper only; the journal prints it on the back cover) with `echo` in `workup`; fig03 (the report's
haemodynamic schematic — labelled "not an image of the patient") with the bridge record. The source PDF (pages 1–2
the article, including the authors' affiliation and e-mail as published; page 3 the journal's back cover with other
articles' clinical images, no direct identifier) opens only after the case is complete; its title says so. The
asset list is unchanged: **4 entries** (3 figures + the source PDF), checksums unchanged.

## Matcher notes

- **Shared words separated with `excludeKeywords`:** `presentation` (chest pain) vs onset-to-lysis timing, pain
  character and first-hospital questions; `medications` (first-hospital treatment) vs usual medicines, allergies,
  "after the treatment" and wishes; `first-tests` vs treatment and scan questions; `pain-detail` vs timing;
  `home-meds` vs allergies and the first hospital; `pmh` vs family history, diabetes and stroke (which reach the
  unknown `other-pmh`).
- English keywords are real words and phrases, never run-together strings: a phrase of three or more words keeps at
  least two content words ("brought her into hospital", "reason for the transfer", "put on the ventilator"), and
  short questions are caught by two-word phrases ("brought in", "find out", "would want"); `cases validate` reports
  0 warnings. A bare "how did all this start?" or "what was the pain like?" scores below the select band and is left
  to the clarifying fallback.
- **Order entry:** referral and bedside versions of the ECG and echo share words, so `orderMatching.rules` send any
  query with 外院/转院/首诊/那边/之前/referral/outside/first hospital/referring/previous/transfer to the record
  (`ecg-referral`, `referral-echo`). Notices: the echo and the first echo report open after decision 1; only the
  first hospital's chest film is on record.
- The corpus (`extensions.testUtterances`, 40 paraphrases, 20 per language, every required item covered, none equal
  to a canonical question) passes `cases verify` with no extra selections.

## References

- 李文俊, 蕭鳳儀, 何澄邦. 急性心肌梗死併發室間隔破裂ECMO支持1例. 鏡湖醫學. 2025;25(1):62-63. doi:10.12408/j.issn2223-4462.2025.01.017. Available from: https://rs.yiigle.com/cmaid/1551890
- Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J. 2023;44(38):3720-3826. doi:10.1093/eurheartj/ehad191
- Rao SV, O'Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI guideline for the management of patients with acute coronary syndromes: a report of the American College of Cardiology/American Heart Association Joint Committee on Clinical Practice Guidelines. Circulation. 2025;151(13):e771-e862. doi:10.1161/CIR.0000000000001309
- Damluji AA, van Diepen S, Katz JN, Menon V, Tamis-Holland JE, Bakitas M, et al. Mechanical complications of acute myocardial infarction: a scientific statement from the American Heart Association. Circulation. 2021;144(2):e16-e35. doi:10.1161/CIR.0000000000000985
- Lorusso R, Shekar K, MacLaren G, et al. ELSO interim guidelines for venoarterial extracorporeal membrane oxygenation in adult cardiac patients. ASAIO J. 2021;67(8):827-844. doi:10.1097/MAT.0000000000001510
- Arnaoutakis GJ, Zhao Y, George TJ, et al. Surgical repair of ventricular septal defect after myocardial infarction: outcomes from the Society of Thoracic Surgeons National Database. Ann Thorac Surg. 2012;94(2):436-443. doi:10.1016/j.athoracsur.2012.04.020
- Sánchez Vega JD, Alonso Salinas GL, Viéitez Florez JM, et al. Optimal surgical timing after post-infarction ventricular septal rupture. Cardiol J. 2022;29(5):773-781. doi:10.5603/CJ.a2022.0035
- 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 急性ST段抬高型心肌梗死诊断和治疗指南(2019). 中华心血管病杂志. 2019;47(10):766-783.

How each DOI was verified (2026-10-28; doi.org, Crossref, PubMed and the publishers' sites are not reachable from
this environment, so WebSearch records were used): the source article — printed on page 1 of the PDF and in the
export record; ESC 2023 — university repository and PubMed records (volume, issue, pages, DOI); ACC/AHA 2025 —
AHA/Duke records (volume 151, issue 13, pages e771–e862); AHA 2021 — PubMed-mirror and university records (author
list, volume, issue, pages); ELSO 2021 — university repository records; Arnaoutakis 2012 and Sánchez Vega 2022 —
printed in the source PDF's reference list (refs 8 and 7, authors as printed there). The Chinese guideline carries
no DOI: its volume and pages appear only in citing articles.

### To verify

- **ESC 2023 ACS wording and classes** (the primary text was not reachable; secondary summaries only): emergency
  TTE for suspected mechanical complications or shock (Class I C per a lecture deck); IABP for instability or shock
  due to mechanical complications (IIa C in most summaries, IIb in one); routine IABP not recommended in shock
  without a mechanical complication (III B); short-term MCS in severe shock (IIb C); fibrinolysis within 12 h when
  primary PCI is not possible within 120 min (I A), transfer after lysis, emergency angiography for heart
  failure/shock, rescue PCI and routine angiography at 2–24 h. The teaching points state the recommendations
  without classes where only one secondary source gave them.
- **ACC/AHA 2025:** the two mechanical-complication recommendations (Class 1 C-EO: a facility with cardiac surgical
  expertise; Class 2a B-NR: short-term MCS as a bridge to surgery) and the supporting text that an IABP reduces
  left-to-right shunting come from secondary summaries. Two correction notices exist (Circulation
  2025;151(13):e865, doi:10.1161/CIR.0000000000001328; Circulation 2025;152(19):e402,
  doi:10.1161/CIR.0000000000001397); their content was not read.
- **AHA 2021 statement:** confirmed at abstract level (multidisciplinary care, practice varying with local
  expertise); its text on transcatheter closure and repair timing was not read.
- **ELSO 2021:** its wording on LV distension monitoring and unloading was not read; the case's flow targets and
  unloading options are the source report's.
- **CULPRIT-SHOCK** is cited from trial summaries (culprit-only better than immediate multivessel PCI in
  infarct-related shock); the ESC 2023 class for non-culprit PCI in shock was not confirmed, so the case names the
  trial, not a class.
- **中国STEMI指南（2019）:** listed for Chinese readers; its recommendations on mechanical complications and
  reperfusion windows were not accessed in this review, and no DOI could be confirmed.

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

- **Options rebalanced so the key is not cued by length.** The keyed option was the uniquely longest in all 4
  single-best decisions in both languages; now it is in one (`lv-unloading`). Each distractor states its reasoning in
  the key's register: re-occlusion after lysis with an ischaemic murmur; papillary-muscle rupture with severe mitral
  regurgitation, confirmed by echo; free-wall rupture as the most rapidly fatal complication; fluid boluses because
  positive-pressure ventilation lowers preload; multivessel PCI to restore pump function; a titrated vasodilator with
  support in reserve; immediate repair because each day on support adds complications; a fixed 4–6-week date (the
  report's surgical advice) on ECMO and the IABP; no repair while support holds; device closure to spare a sternotomy;
  more ECMO flow with CRRT ultrafiltration; removing the IABP to spare a femoral line; a fluid bolus to fill the
  ventricle. The keys of `support`, `management` and `lv-unloading` are tighter wording of the same plan; the
  `diagnosis` key text is unchanged. The more-flow feedback also answers the ultrafiltration argument. Correct flags
  and scoring are unchanged.
- **Option id `supported`** (it named the answer) is now `septal-rupture`; the reference `solution` answers with it. No
  test, benchmark scenario or e2e spec referred to it (`packages/web/e2e/cmcr.spec.ts` replays the `solution`).
- **Companion named in character** (`cases validate --strict`): 「家属（教学设定）」/ "Relative (teaching role)" →
  「欧阳女士的家属（化名）」/ "Ms Ouyang's relative (pseudonym)", as in cmcr-138898. The persona, the answers and
  the unrecorded relationship are unchanged.

### 1.1.0 — 2026-10-28 (editorial revision)

- **She cannot speak (audit B1, D1, D4).** The ventilated patient no longer greets the learner: an actor brief
  (never speaks; no invented responsiveness), a bracketed opening narration, affect `drowsy`, no concerns; a relative
  (teaching role, 「家属（教学设定）」/ "Relative (teaching role)") answers every history question in plain first-person
  speech. Annotation `patient.nonVerbalWhen: { "always": true }` written for the coordinator.
- **History rebuilt (C3, B2, D2, C5).** 16 items: 7 recorded facts in the relative's voice (presentation, the first
  hospital's tests and treatment, the course with the new murmur and transfer, what the family was told,
  ventilation, past history) and 9 honest unknowns (onset-to-lysis time — A2 —, pain character, other illness,
  usual medicines, allergies, smoking, family history, usual function, her wishes); chart-register and meta answers
  removed; occupation, alcohol, self-care, ICE, syncope and previous-surgery items dropped; ≥ 4 keywords per
  language.
- **Exam (C2).** The unrecorded `vitals` item (shown as a normal row) removed; `general` (on invasive ventilation)
  and `general-bridge` (on IABP + VA-ECMO with CRRT) added; the murmur is labelled as the referring team's finding.
- **Investigations (C1, B4, B6, B3, B5).** The chest film is a record review (`requires: ["records"]`), no longer an
  X-ray-room study that would wheel a ventilated patient away; the first hospital's ECG, chest film, enzymes,
  angiogram and echo are separate record reviews; the transfer ECG keeps figure 1 and adds the labelled machine
  header; the markers carry values with "reference range not reported"; a new ICU course and MDT record restores the
  4–6-week surgical plan, cardiology's view and the monitoring parameters and describes figure 3; honest
  not-reported results for blood gas/lactate and renal function; a low-value chest CT; the outcome record expanded.
- **Phases.** `initial` → `workup` → `bridge` → `followup`, one-way, so each decision opens before the result that
  would answer it.
- **Decisions (A1, A3, C4).** 2 → 4: the mechanism before any echo; the support plan (MCS bridge); repair timing with
  plausible over-generalisations, including the report's own 4–6-week plan as a rule; LV unloading on VA-ECMO. Every
  option has its own feedback citing the guidance.
- **Interventions (E2).** 0 → 11: ventilation, vasoactive infusion, IABP, VA-ECMO, CRRT, cardiac-surgery and
  cardiology consultations, the transfer back; harmful choices: fluid bolus, repeat tenecteplase, multivessel PCI
  request.
- **Rubric (E3).** 4 → 10 items: first-try scoring of all four decisions, a weight-3 safety item, an examiner-judged
  communication item (prognosis with the family). Annotation: `rb-safety` `scoredWhen` + `critical`.
- **Debrief (A4, A5, A2).** Conclusion and key reasoning restated (cardiology's actual judgement: no PCI indication,
  no percutaneous closure); 1 → 6 teaching points, each with its guidance and version, including then-versus-now on
  the fixed 4–6-week wait and the unrecorded fibrinolysis window; unknowns expanded.
- **Teaching layer.** `learningOutcomes` (6), `provenance.review` (editorial, AI-assisted, not clinician-reviewed),
  references in Vancouver form with verified DOIs (ESC 2023, ACC/AHA 2025, AHA 2021, ELSO 2021 and the two studies the
  report cites); the AHA news URL removed (F1).
- **Card and naming (D3, D4).** English title "· 65-year-old woman"; new summary and triage note (spoiler-free and
  different from each other); patient tags no longer repeat the chief complaint; pseudonym 林女士 → 欧阳女士 / Ms Ouyang
  (the library already has five 林 patients) and staff names (Nurse Peng, Dr Deng) used by no other case and not English
  words; neutral objective titles (the journal lists them before they are
  reached); figure titles and credits reworded; intervention responses and harm texts name no lesion before decision 1.
- **Matcher.** 16 canonical test utterances → 40 paraphrases (20 per language).
- **Calibration.** Difficulty 4 (unchanged), estimated time 25 → 35 min; version 1.0.0 → 1.1.0.

### 1.0.0

- First CMCR release (PR #3): 15 history items, 2 exam findings, 6 investigations, 2 decisions, 4 rubric items, no
  interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1551890/case.json --strict   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1551890                                      # 52 steps, objectives 6/6, decisions 4/4, utterances 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1551890
npm run -s cc -- exec --case cmcr-1551890 --autopilot --approval bypass --provider offline --output-format json             # 19/19
npm run -s cc -- exec --case cmcr-1551890 --autopilot --approval bypass --provider offline --output-format json --embodied  # 19/19
```

## 中文摘要

**病例概要。** 65岁女性，有高血压、高脂血症，胸痛1天后在外院就诊：心肌酶谱升高、胸片肺水肿、V2–V5导联ST段抬高，诊断急性心肌梗死，予扩冠、抗凝及替奈普酶溶栓。之后病情进展，出现新发收缩期杂音，超声见室间隔瘤形成并破裂穿孔，急诊冠脉造影为三支病变，心功能持续恶化，在机械通气下转入本院ICU。转入后心电图为急性广泛前壁心肌梗死伴完全性右束支传导阻滞，CK-MB 247 ng/mL，高敏肌钙蛋白T 16016 ng/L，床旁超声示缺损直径 1.52 cm、左向右分流。予继续机械通气、CRRT、IABP联合VA-ECMO，多学科讨论：心外科建议 4–6 周后择期修补、期间ECMO过渡；心内科认为暂无PCI及介入封堵条件。病情较前稳定后转回原医院，修补与存活情况未报告。患者不能说话，病史由家属（教学设定）回答。

**学习目标。**

1. 识别心肌梗死后新发收缩期杂音伴心衰为机械并发症（区分室间隔破裂、乳头肌断裂和游离壁破裂），并立即床旁超声确认。
2. 解释室间隔破裂的血流动力学，并据此说明为何避免快速补液、血管扩张剂须以血压为前提。
3. 按ACC/AHA 2025和ESC 2023指南制定血管活性药加机械循环支持（IABP、VA-ECMO）的过渡方案，在有心外科的中心由心脏团队管理。
4. VA-ECMO期间用超声监测主动脉瓣开放和左心室大小，识别左心室负荷过重并说出至少两种减负措施。
5. 结合不修补、早期和延期修补的死亡率数据（含幸存者偏倚）权衡修补时机，说明现行指南为何个体化而不设固定间隔。
6. 复述ESC 2023的再灌注时间窗，并指出本例记录缺失的关键时间点。

**关键决策。**

- 机制（看超声之前）：前壁梗死后新杂音伴心衰——首先考虑机械并发症（最可能室间隔破裂），立即床旁超声；干扰项为再次溶栓、乳头肌断裂“多见于前壁梗死”、盲目心包穿刺。
- 循环支持：血管活性药＋早期机械循环支持（IABP，灌注不恢复时加VA-ECMO），继续通气，每日超声，心脏团队；不补液、不先做多支PCI、不单用血管扩张剂。
- 修补时机：心脏团队个体化——稳定时可延期，支持下恶化则提前；“立即手术永远最好”和“4–6 周后永远更安全”（原报告外科意见被当成规则）都是过度概括；ECMO不能替代修补；急性期一般不宜经皮封堵。
- 左心室减负：主动脉瓣持续不开、左心室扩大——降低ECMO流量、支持射血（正性肌力药、IABP），必要时Impella或左心引流；不要加大流量、撤IABP或补液。

**复盘要点。**

- 新杂音＋恶化＝机械并发症，急诊床旁超声（ESC 2023）。
- 左向右分流解释肺水肿和双心室衰竭；血管活性药与IABP，不补液。
- VA-ECMO是过渡而非修补，会加重左心室后负荷：看主动脉瓣开放与左心室大小，流量不宜过高，必要时减负；警惕出血、血栓、肢体缺血、溶血、感染。
- 修补时机由心脏团队权衡：91.5% 对 52.3%、54.1% 对 18.4%（延期组为幸存者）；在有心外科能力的中心处理（ACC/AHA 2025 Ⅰ类），机械支持作为手术过渡（2a类）；原报告的固定 4–6 周不是现行规则。
- 开通血管不能关闭破口；多支PCI在休克中不优于只处理罪犯血管。
- 追问发病到溶栓的时间：本例记录没有写，不能断定溶栓是否超窗。
- 本病例经AI辅助编辑审核，尚未经执业医师审核；用于教学前请由心内科或重症医学科医师审核。
