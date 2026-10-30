# acute-appendicitis — Abdominal pain · 19-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners
> should open the case from the case library, where the title, summary, tags,
> triage note and objective titles give nothing away.

**Synthetic case.** This is a fictional teaching case written for ClinicalCraft.
The patient (周宇航（化名）/ Zhou Yuhang), his roommate (吴凡 / Wu Fan), the
university, the staff and every clinical detail are invented; nothing is based
on a real patient. Every number was written for teaching and checked for
internal consistency. It is not medical advice: 虚构教学病例，不构成医疗建议 /
Fictional teaching case — not medical advice.

## Case card

| | |
|---|---|
| id / version | `acute-appendicitis` / `1.1.2` |
| setting / facility | `emergency` (night shift; the first slot accepting `emergency`, currently `resus-1`) / `general-hospital` |
| specialty | emergency medicine, general surgery |
| difficulty | 2 / 5 |
| estimated time | about 35 min of learner time; the reference path takes 120 simulated minutes (02:15 → 04:15) |
| languages | `zh-CN` (source), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have an emergency physician or general surgeon review it before teaching use |
| phases | one phase, `ed` (急诊夜班 / ED night shift) |
| clock | simulated, starts 02:15, `realtimeScale` 0.5, limit 360 min. Costs: ask 1, examine 2, order 1, read 1, intervene 2 min |
| content | 40 history items (4 `unknown`, 1 `specific`, 10 required) · 19 exam findings (5 required) · 15 investigations (4 essential, 3 low-value) · 20 interventions (8 wrong or low-value choices) · 6 objectives · 4 decisions · 18 rubric items (15 deterministic, total weight 25; 3 examiner-judged) · 5 NPC briefs · 6 learning outcomes · 83 matcher test utterances |

## Learning outcomes

After the case the learner can:

1. Take a focused history that establishes the classic sequence (periumbilical
   pain migrating to the right iliac fossa, anorexia and nausea before
   vomiting), and examine for peritonism and the pertinent negatives,
   including the testes with consent and a chaperone.
2. Give titrated IV opioid analgesia, an antiemetic, IV fluids and nil by
   mouth within 40 minutes of first seeing him, without waiting for the
   work-up, and explain why analgesia does not mask the diagnosis.
3. Calculate the Alvarado and AIR scores from the findings obtained, explain
   why they disagree, and for a young, slim patient choose graded-compression
   ultrasound as the first imaging, stating when (low-dose) CT is needed
   instead.
4. Diagnose acute uncomplicated appendicitis from the combined clinical,
   laboratory and ultrasound findings, excluding torsion, ureteric colic,
   gastroenteritis and Crohn's disease with the recorded negatives.
5. Within 3 hours of first seeing him, give a single pre-operative dose of IV
   antibiotics covering enteric Gram-negative and anaerobic organisms
   (cefuroxime or ceftriaxone plus metronidazole) — no carbapenem, no
   duplicate regimen — and refer him to the surgical team.
6. Discuss laparoscopic appendectomy and the antibiotics-first option (CT
   confirmation needed; about a quarter to a third still need surgery within a
   year) and reach a shared, consented decision with the patient.

These are the case's `learningOutcomes` (shown on the case card and in the
debrief); the six HUD `objectives` below are the in-game task list.

## Clinical summary

A second-year computer science student arrives at 01:50 by taxi with his
roommate, walking bent over (triage category 3, pain 7/10, one vomit, no
medication and no IV access yet; on the monitor). The encounter starts at
02:15. About 18 hours earlier (≈ 08:00, after breakfast) he developed a dull
periumbilical ache. Around 15:00 it moved to the right iliac fossa (RIF) and
became sharp and constant, worse with movement, coughing and speed bumps, and
eased a little by lying still with the right leg bent. He has had no appetite
since (no lunch or dinner), nausea from midday, one vomit at about 22:00
(after the pain began) and has felt hot and shivery since the evening. He has
no urinary or testicular symptoms; his bowels opened normally the previous
morning and he is passing wind; his roommates (same canteen food) are well.
He is otherwise healthy (no hepatitis or TB that he knows of, never
transfused), takes no medicines, has no allergies (penicillin before without
problems) and has never had an operation or an anaesthetic. His father had an
appendicectomy when young. He is unmarried with no children, and his parents
live in another city. His last food was at 07:30 the previous day and his last
sip of water at midnight.

**ICE.** *Ideas*: a stomach bug from the canteen — then the internet said
"appendix". *Concerns*: an operation, with exams next week; worrying his
parents. *Expectations*: pain relief first, then an explanation; he will tell
his parents himself in the morning unless it is serious.

**Diagnosis: acute uncomplicated appendicitis.**

- Monitor: T 37.9 °C, HR 102 (sinus tachycardia on the ECG), BP 124/76
  (MAP 92), RR 18, SpO₂ 99 % on air, pain 7/10.
- Examination: maximal tenderness at McBurney's point with localised voluntary
  guarding and rebound/percussion tenderness in the RIF; Rovsing's and the
  psoas sign positive, the obturator sign equivocal; cough (Dunphy) and
  heel-drop tests positive; dry mucosa, slightly reduced bowel sounds, no
  shifting dullness, mild right anterior rectal tenderness on DRE.
  **Pertinent negatives:** normal testicular lie, no testicular tenderness and
  cremasteric reflexes present; clear hernial orifices; no renal-angle
  tenderness; clear chest; no rash or vesicles; normal throat and cervical
  nodes.
- Results: WBC 14.2 ×10⁹/L, neutrophils 11.6 ×10⁹/L (81.7 %), CRP 48 mg/L;
  electrolytes and renal function normal (urea 6.8 mmol/L, creatinine
  84 µmol/L); urinalysis concentrated (SG 1.026) with trace ketones, no
  infection or blood. Graded-compression ultrasound: a non-compressible,
  blind-ending 9 mm appendix (wall 4 mm, target sign, mural hyperaemia) with
  echogenic inflamed fat; no appendicolith, fluid or abscess; no
  hydronephrosis. CT (`neutral` here) agrees, at ≈ 7.5 mSv.
- Scores: Alvarado 10/10, AIR 7 (intermediate).
- Management: nil by mouth; Hartmann's; titrated IV morphine plus IV
  paracetamol; ondansetron; one pre-operative IV dose of cefuroxime +
  metronidazole (or ceftriaxone + metronidazole) at diagnosis; urgent surgical
  referral; a shared decision after the antibiotics-first option has been
  discussed; laparoscopic appendectomy on the emergency list. The case ends
  when he is listed for theatre.

## Scenario timeline and physiology

Baseline: HR 102 sinus, BP 124/76, RR 18, SpO₂ 99 % on air, T 37.9 °C, GCS 15,
pain 7. He is on the monitor from the start (the triage note says so; no
`physiology.monitor`), with default adult alarm limits.

| Element | Behaviour |
|---|---|
| Untreated trends | HR +0.06/min (to +14) and SBP −0.03/min (to −8) until fluids; pain +0.01/min (to +2) and RR +0.01/min (to +3) until any analgesic; temperature +0.003/min (to +0.8) until any antibiotic. Each trend recovers once stopped. |
| Effects | morphine: pain −4 over 8 min, HR −6, RR −1 (2–3 h); paracetamol: pain −1.5, T −0.5; parecoxib: pain −2; fluids: HR −10 over 60 min, SBP +4; any antibiotic: T −0.3 after 60 min. |
| `evt-analgesia-delay` | minute 40 (02:55) with no analgesic given: the nurse asks for analgesia ("7 to 8 out of 10 and sweating") and sets `analgesia-delayed`. |
| `evt-delay-warning` | minute 180 with no antibiotic and no theatre booking: the nurse escalates ("no antibiotics and no plan yet"), `delayed-source-control`. |
| `evt-perforation` | minute 300 with no antibiotic and no theatre booking: pain spreads across the lower abdomen; new baseline HR 112, BP 112/66, RR 22, T 38.3, pain 9 (plus the accumulated trends), `perforation-suspected`. Untreated, the events fire at minutes 40, 180 and 300 and the vitals go from HR 102, T 37.9, pain 7 to HR 125–127, SBP ≈ 104, RR 24–25, T 39.1, pain 10 (warning alarms only). |
| Silent markers | `evt-mark-theatre-premature` (`theatre-premature`) and `evt-mark-nom-without-ct` (`nom-without-ct`) fire at the moment of the unsafe order and feed the rubric only. |

The examination and imaging findings are fixed records: after the perforation
event the nurse's message and the monitor change, but the recorded abdominal
signs and scans do not. The event message and the debrief boundaries say that
the earlier records describe his state before the change.

## Decisions and assessment

### Objectives (HUD task list)

| id | completes when |
|---|---|
| `obj-history` | migration, anorexia, vomiting, urinary and testicular questions asked |
| `obj-stabilise` | nil by mouth, an analgesic, IV fluids, `dec-supportive` answered |
| `obj-exam` | palpation, guarding, rebound and the testes examined |
| `obj-workup` | FBC, CRP and urinalysis read; `dec-imaging` answered; ultrasound or CT read |
| `obj-diagnose` | `dec-diagnosis` answered |
| `obj-definitive` | any antibiotic; surgical referral; shared decision and consent; `dec-definitive`; laparoscopic appendectomy listed |

The objectives run history → **supportive care** → examination → work-up →
diagnosis → definitive care, so the quest card asks for analgesia straight
after the history (the supportive-care decision needs only a quick palpation
and the nausea question; its waypoint points back to the patient until then).
A thorough learner who did the full examination first reached morphine at
minute 48 and missed `r-mx-analgesia`; in this order the same learner gives it
at about minute 28. The history objective's hint and guidance say he has had no
analgesia and that treating pain need not wait for the history. The hints
coach without giving the decision answers ("Does analgesia have to wait until
the surgeon has examined him?", "Which test can answer the question in a young,
slim man without radiation?", "Which organisms must the pre-operative
antibiotic cover?").

### Decisions

- `dec-supportive` (select all; unlocked by palpation and the nausea/vomiting
  question): nil by mouth, IV crystalloid (Hartmann's), titrated IV opioid,
  IV antiemetic. The distractors are withholding analgesia until the surgeon
  has examined, a laxative or enema, and a routine NG tube.
- `dec-imaging` (single; unlocked by palpation and the migration question):
  graded-compression ultrasound with renal and pelvic views. The distractors
  are immediate contrast CT ("not the best first choice": the feedback gives
  ACR's rating of CT and WSES 2025's preference for low-dose CT where
  available, and why scores plus ultrasound — the alternative WSES accepts —
  suit this slim 19-year-old), a plain abdominal film, MRI and "no imaging,
  observe at home".
- `dec-diagnosis` (single; unlocked once FBC, CRP, urinalysis and imaging have
  been read and the testes examined, because its feedback cites them): acute
  uncomplicated appendicitis. The distractors are perforation with abscess,
  mesenteric adenitis, terminal ileitis (Crohn's), right ureteric colic,
  testicular torsion and gastroenteritis.
- `dec-definitive` (single; after the diagnosis): laparoscopic appendectomy on
  the emergency list after shared decision-making, with a single
  pre-operative antibiotic dose. The distractors are antibiotics-first without
  further imaging ("not the best answer": legitimate only after CT and an
  informed discussion), open appendectomy, observation without antibiotics and
  discharge on oral antibiotics.

### Rubric (deterministic items, total weight 25)

| id | domain | weight | met when |
|---|---|---:|---|
| `r-hx-classic` | history | 2 | migration, anorexia, nausea/vomiting asked |
| `r-hx-mimics` | history | 1 | urinary, testicular and bowel questions asked |
| `r-hx-preop` | history | 1 | allergies, medicines, previous surgery/anaesthesia, last oral intake |
| `r-ex-peritonism` | examination | 2 | palpation, guarding, rebound |
| `r-ex-negatives` | examination | 1 | testes and renal angles |
| `r-inv-bloods` | investigations | 1 | FBC, CRP and urinalysis read |
| `r-inv-us-first` | investigations | 2 | ultrasound read and no CT ordered |
| `r-dx` | diagnosis | 2 | `dec-diagnosis` right first time |
| `r-mx-analgesia` | management | 2 | titrated morphine (or parecoxib + paracetamol) before the nurse's 40-minute prompt |
| `r-mx-supportive` | management | 1 | nil by mouth and IV fluids |
| `r-mx-abx` | management | 2 | exactly one of the two pre-operative regimens, no meropenem |
| `r-mx-definitive` | management | 2 | surgical referral, `dec-definitive` right first time, theatre listed only after review, imaging and consent |
| `r-safety` | safety | **3** | no withheld analgesia, discharge, laxative or oral intake; no premature theatre booking; no antibiotics-first without CT; no perforation from delay — scored once supportive care has begun (`dec-supportive` attempted or an analgesic given) or one of these has happened |
| `r-eff-lowvalue` | efficiency | 1 | no plain abdominal film, chest film or blood cultures — scored once the imaging decision is reached or one of them is ordered |
| `r-eff-timely` | efficiency | 2 | an antibiotic before the nurse's 3-hour escalation |

Three examiner-judged communication items: plain-language explanation,
surgery versus antibiotics-first and informed consent with teach-back
(`r-comm-consent`); explanation, consent and a chaperone before intimate
examination (`r-comm-intimate`); ICE — exams, parents, pain relief
(`r-comm-ice`).

### How wrong choices score

The percentage comes from the weighted deterministic rubric. A contraindicated
step is also recorded as a **safety event** and listed in the debrief.
`r-dx` and `r-mx-definitive` use `decidedFirstTry`, so guessing through the
options costs that item; every option has feedback.

- Discharge, a laxative or enema and allowing food or drink are always
  contraindicated; withholding analgesia is contraindicated while pain ≥ 4.
  Booking theatre before surgical review, imaging and consent is
  contraindicated, and so is antibiotics-first before a CT has been read
  (ultrasound cannot reliably exclude an appendicolith); after a CT it is
  neutral. A second antibiotic regimen is contraindicated (duplication).
- Meropenem is orderable and neutral, but the pharmacist phones about
  stewardship (meropenem is kept for severe or resistant infection) and
  `r-mx-abx` is not met. Oxygen at SpO₂ 99 % and an NG tube are neutral,
  with explanatory responses. Plain films and blood cultures are
  `low-value`; CT is `neutral` (see the imaging note below).
- `r-mx-analgesia` asks for *adequate* analgesia: paracetamol alone
  (pain ≈ 5.5/10) stops the nurse's prompt but does not meet the item.
- `r-eff-timely` needs any antibiotic before the 3-hour escalation; the choice
  of regimen is scored only by `r-mx-abx`, so antibiotics-first without a CT
  costs `r-mx-abx` and `r-safety` rather than three items.
- Imaging: CT is modelled as `neutral`, not `low-value` — ACR (2022) rates
  contrast CT the primary test for most adults and WSES 2025 prefers low-dose
  CT where available — but here it adds radiation and contrast and rarely
  changes management once the ultrasound is diagnostic. CT is `alternativeTo`
  the ultrasound, so a learner who goes straight to CT is not told an
  essential investigation is missing; they lose only `r-inv-us-first`.

Replayed paths (the engine, 2026-10-28):

| path | score |
|---|---|
| reference solution | 25/25 (100 %) |
| nothing done (the learner stops at once) | 0/21 (0 %): `r-safety` and `r-eff-lowvalue` are not scored before care begins (4/25 in 1.1.0) |
| CT instead of ultrasound | 92 % (`r-inv-us-first`) |
| meropenem instead of cefuroxime + metronidazole | 92 % (`r-mx-abx`) |
| guessing the diagnosis, or antibiotics-first before laparoscopy in the definitive decision | 92 % (`r-dx`, or `r-mx-definitive`) |
| paracetamol without morphine | 92 % (`r-mx-analgesia`) |
| withholding analgesia first | 88 % (`r-safety`) |
| antibiotics-first without a CT (then laparoscopy) | 80 % (`r-mx-abx`, `r-safety`) |
| theatre booked before surgical review and consent | 80 % (`r-mx-definitive`, `r-safety`) |
| analgesia and tests on time, results left unread until after minute 300 | 80 % (`r-eff-timely`, `r-safety`) |
| nothing done for the first 3½–4 hours, then the standard path | 72 % (`r-mx-analgesia`, `r-eff-timely`, `r-safety`) |
| urinalysis or testicular examination skipped | the diagnosis decision stays locked (and the testicular question is part of the history objective) |

### Design notes (scoring integrity)

- **Conditions use actions, not flags.** Objectives, rubric items, trends,
  events and contraindications test `intervened` rather than the flags the
  interventions set, so a learner-sent `flag` action cannot complete an
  objective or earn a positive rubric item. Every flag a condition reads
  (including the penalty flags `analgesia-delayed`, `theatre-premature`,
  `nom-without-ct`, `perforation-suspected` and `delayed-source-control`) is
  set by an intervention or event, so `ClinicalSession` refuses learner `flag`
  actions on it (a raw engine replay could still clear one).
- `iv-access` (cannula + bloods) is an orderable, always-indicated step, as in
  the other acute cases; the triage note says he has no IV access.
- **NPC briefs stay within what the learner has elicited.** The pharmacist's
  brief does not state his allergy status (`hx-allergies` is a required
  history item) and prompts the learner to ask before any antibiotic. The
  surgical registrar's brief describes the operative routine, so it names the
  diagnosis: it is marked `revealsDiagnosis: true`, and its own text says to
  discuss the routine only after the learner has committed to a diagnosis.
  The ED attending confirms the scores only after the learner has calculated
  them, component by component against the results the learner has.

## Reference path (`solution`)

Minute-checked by replaying the solution through the engine (61 steps;
minute 0 = 02:15):

- **0–13:** the presenting complaint, onset, site at onset, migration,
  character, severity, aggravating factors, appetite, nausea/vomiting, fever,
  urinary and testicular symptoms, allergies.
- **13–21:** general inspection, palpation, guarding, rebound.
- **21–31:** IV cannula and bloods (21), nil by mouth (23), titrated morphine
  (25, i.e. 02:40), ondansetron (27), Hartmann's (29); `dec-supportive` at 31.
- **31–35:** FBC, CRP, U&E and urinalysis ordered.
- **35–45:** bowels, medicines, previous surgery, last intake, PMH, sexual
  history, exposures and ICE.
- **45–59:** Rovsing's, psoas and obturator signs, testes (with consent and a
  chaperone), hernial orifices, renal angles, chest.
- **59–62:** `dec-imaging` (ultrasound), ultrasound ordered, IV paracetamol.
- **62–107:** wait 45 minutes.
- **107–112:** FBC, CRP, U&E, urinalysis and ultrasound read; `dec-diagnosis`.
- **112–120:** cefuroxime + metronidazole (112, i.e. 04:07), surgical referral,
  shared decision and consent, `dec-definitive`, laparoscopic appendectomy
  listed (118); finish at minute 120 (04:15).

`cases verify` passes with no issues: every intervention is `indicated`, there
are no rejections and no alarms, and the deterministic rubric scores 25/25.

## Clinical numbers check

`extensions.clinicalScores` records the scores and derived values.

| score | components | total |
|---|---|---|
| Alvarado (MANTRELS) | migration 1 + anorexia 1 + nausea/vomiting 1 + RIF tenderness 2 + rebound 1 + T ≥ 37.3 °C 1 + WBC > 10 2 + neutrophils > 75 % 1 | **10 / 10** |
| AIR | vomiting 1 + RIF pain 1 + rebound/guarding moderate 2 + T ≥ 38.5 °C 0 + PMN 70–84 % 1 + WBC 10.0–14.9 1 + CRP 10–49 mg/L 1 | **7 / 12** (intermediate, 5–8) |

If rebound/guarding is graded "light", AIR is 6, still intermediate. The two
scores disagree on purpose: Alvarado says "very likely", AIR says
"intermediate, so image". Scores stratify risk; they are not a diagnosis.

- Weight 68 kg, height 176 cm → BMI 22.0 kg/m²; MAP (124 + 2 × 76)/3 = 92 mmHg.
- WBC differential 11.6 + 1.8 + 0.58 + 0.18 + 0.04 = 14.2 ×10⁹/L; neutrophils
  11.6/14.2 = 81.7 %; MCV = Hct/RBC = 0.45/5.1 ≈ 88 fL.
- Anion gap 138 − (101 + 23) = 14 mmol/L.
- Urea 6.8 mmol/L ≈ BUN 19 mg/dL; creatinine 84 µmol/L = 0.95 mg/dL; eGFR
  (CKD-EPI 2021, male, 19 y) 118 mL/min/1.73 m²; glucose 5.6 mmol/L
  (101 mg/dL), the same as the capillary glucose.
- VBG: pH 6.1 + log₁₀(23 / (0.03 × 42)) = 7.36 (PvCO₂ 5.6 kPa = 42 mmHg);
  BE (Van Slyke) ≈ −1.9 mmol/L; lactate 1.3 mmol/L.
- CT: DLP ≈ 500 mGy·cm × 0.015 mSv/(mGy·cm) ≈ 7.5 mSv — the "roughly
  5–10 mSv" the imaging feedback avoids.
- Doses for 68 kg: morphine up to ≈ 0.1 mg/kg ≈ 7 mg in 2–3 mg steps (the dose
  text is the formula; ≈ 7 mg is in the `response`); paracetamol 1 g IV
  6-hourly (≥ 50 kg), ≤ 4 g/24 h; maintenance fluid 25–30 mL/kg/day ≈ 1.7–2.0
  L/day ≈ 70–85 mL/h ("about 80 mL/h" in the `response`); cefuroxime re-dosed
  at induction if more than 4 h pass before incision (ceftriaxone needs no
  re-dose).
- Timeline: pain 08:00 → migration 15:00 (7 h) → arrival 01:50 → encounter
  02:15 (≈ 18 h of pain). Fasting at 02:15: food ≈ 18¾ h (07:30), clear
  fluid ≈ 2¼ h (midnight).
- Units are SI throughout; the English text adds conventional units in
  parentheses where clinicians expect them (BUN, creatinine mg/dL, glucose
  mg/dL, PvCO₂ mmHg).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did that feel? What was it like managing his pain while
   you were still working out what was wrong?"
2. **Description.** "Summarise him in two sentences: the diagnosis, the
   evidence for it, and what you did in the first 30 minutes."
3. **Analysis.**
   - "What in the story pointed to appendicitis — and what would have pointed
     to gastroenteritis instead?" (the sequence; vomiting before pain,
     diarrhoea, ill contacts)
   - "When did you give analgesia, and what, if anything, held you back?"
     (Cochrane 2011; the nurse's prompt at minute 40)
   - "What were his Alvarado and AIR scores, and why do they disagree? What
     did that mean for imaging?"
   - "Why ultrasound before CT for him — and when would you have wanted a
     CT?" (WSES 2020 and 2025, ACR 2022, SAGES 2024)
   - "Which mimics did you exclude, and with which findings?" (torsion,
     ureteric colic, pyelonephritis, gastroenteritis, Crohn's, right lower lobe
     pneumonia, shingles)
   - "Which antibiotic, how many doses, and why not meropenem?"
   - "How did you present the antibiotics-first option, and what did he need
     to know to choose?" (`r-comm-consent`)
   - "How did you handle his wish not to ring his parents tonight?"
     (`r-comm-ice`)
4. **Summary.** "Name two things you will do the next time you see a young
   man with right iliac fossa pain."

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Holding analgesia until the surgeon has examined | `withhold-analgesia` is contraindicated while pain ≥ 4; the nurse asks at minute 40 (`evt-analgesia-delay`) | `r-mx-analgesia`, `r-safety`, safety event |
| Paracetamol alone for pain of 7/10 | stops the nurse's prompt, but pain stays ≈ 5.5/10 | `r-mx-analgesia` |
| Forgetting the testes | `obj-exam` stays open and `dec-diagnosis` stays locked | `r-ex-negatives` |
| Skipping the urinalysis | `dec-diagnosis` stays locked | `r-inv-bloods` |
| CT first | allowed (`neutral`); `img-ct` feedback | `r-inv-us-first` |
| Plain films or blood cultures | `low-value`; the abdominal-film and culture notes explain why | `r-eff-lowvalue` |
| Meropenem | the pharmacist phones about stewardship | `r-mx-abx` |
| Two antibiotic regimens | contraindicated (duplication) | `r-mx-abx`, safety event |
| Antibiotics-first on ultrasound alone | contraindicated without a CT read; `nom-without-ct` | `r-mx-abx`, `r-safety` |
| Listing for theatre before review, imaging and consent | contraindicated; `theatre-premature` | `r-mx-definitive`, `r-safety` |
| Laxative or enema, food or drink, discharge | always contraindicated; the nurse queries, the attending stops the discharge | `r-safety`, safety event |
| Oxygen at SpO₂ 99 %, a routine NG tube | `neutral`; the responses explain (BTS target 94–98 %) | — |
| No antibiotics or plan for hours | the nurse escalates at 180 min; perforation at 300 min | `r-eff-timely`, `r-safety` |
| Guessing a decision | `decidedFirstTry` | `r-dx`, `r-mx-definitive` |

The DRE is available but adds little in this patient; the rubric does not
require it. Senior learners can discuss why WSES 2025 prefers low-dose CT
where it is available, and in which patients they would choose CT as the
first test.

## Embodied mode

**Grounding the kit (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8).** IV
access is patient state: `iv-fluids`, `morphine`, `paracetamol`, `parecoxib`,
`ondansetron`, the three antibiotic options and `abx-first-nom` require
`iv-access`, so the case's `iv-access` procedure (cannula + bloods, which needs
the cannulation kit of a crash or treatment cart at the bedside) comes first;
the reference solution places it at minute 21, before the first IV item. The
blood tests are ordered at the patient's side or, once the cannula has drawn
the bloods, at a `records` terminal or a laboratory station; the urine is
collected at the patient. The capillary glucose (`point-of-care`), the ECG
(`ecg-12lead`) and the ultrasound (`ultrasound`: the resus bay's point-of-care
scanner) are bedside tests — the benchmark scenario
`workflow-appendicitis-bedside-ultrasound` orders and reads the scan there.
`oxygen` names `device: "nasal-cannula"` (bystanders and the web patient show
nasal cannulae, never a mask). In `general-hospital` the case takes the first
slot accepting `emergency` (`resus-1`); every capability it needs is within
6 m of it.

**Scope of practice (EMBODIED §8).** `ng-tube` (nasogastric decompression) is
authored `scope: "nursing"`: a delegated nurse may pass it. The other items
follow their kind (medications, fluids and oxygen are nursing, the case's IV
access is nursing); the surgical referral, the consent discussion and the
listing for theatre stay medical.

**Where the patient goes, how he looks (reviews G8 / G12).** He lies on the
resus trolley throughout (`patient.posture: "lying"`; no intervention changes
it). Studies done on the patient at a fixed device — the CT (`inv-ct`) and the
departmental films (`inv-cxr`, `inv-axr`, no `performedAt: "bedside"`) — need
him taken to radiology (`transport_patient`, by the learner, a porter or a
nurse). The reference path images with the bedside ultrasound, so the embodied
autopilot moves nobody (final clock 120 min in both modes). Listing him for
theatre (`lap-appendectomy`, a disposition) has no `destination`: the case
ends at that decision.

## Fidelity limits

- **Fixed records.** Examination and imaging findings do not change with
  simulated time; after the perforation event only the nurse's message and
  the monitor change (the event text and the debrief say so).
- **Teaching physiology.** The monitor trends are a teaching model, not a real
  patient's course; effects end when their duration lapses (morphine 2–3 h,
  paracetamol 4–5 h).
- **Titration is one step.** "Titrated morphine" is a single intervention
  (`maxDoses` 2); individual 2–3 mg increments, sedation scores and the
  naloxone pathway are not modelled.
- **Fluids** act only through HR and BP; fluid balance, maintenance rate and
  urine output are not modelled.
- **One CT report.** Only a contrast-enhanced (portal venous) CT exists; a
  low-dose or non-contrast order is warned about (`orderMatching.warnings`).
- **The case ends at the decision to operate.** Operative findings, histology,
  the post-operative course, the transfer to theatre and the 24–48 h
  reassessment of antibiotics-first treatment are outside it.

## Matcher notes

All 80 positive utterances (38 zh-CN, 42 en) of `extensions.testUtterances`
rank an expected history item first, at or above the 0.55 selection score.
Three negatives with `expect: []` (最近压力大吗？, 你喜欢看什么电影？, "Which
football team do you support?") select nothing, so the patient falls back to
`fallbackUnknown`. They include 28 colloquial, typo and abbreviation
paraphrases (拉稀没有, 尿尿疼不疼, 恶新想吐不, 输过血没, "any n/v?",
"NKDA, or any allergies?", "any alergies", "When did u last drink water",
"Any pain in your penis?").

Authoring lessons for the offline matcher, all applied here:

- **English stop words.** "how", "when", "where", "what", "it", "any",
  "only" and "off" are dropped, so "how long", "where did it begin" or "off
  your food" reduce to one generic token ("long", "begin", "food") that
  matches unrelated questions. Such phrases are written unspaced and start
  with a stop word (`howlong`, `wherediditbegin`, `offyourfood`), so they
  match only by compact containment.
- **Prefix rule.** An unspaced keyword must not *start* with a content word of
  4 or more letters: "feellike", "sincewhen", "passedout" and "whatisitlike"
  are prefix-matched by "feel", "since", "pass" and "whats".
- **Generic stems.** Avoid keywords that stem to everyday tokens: "testes"
  becomes "test" (matching "blood tests" and "psoas test"), "discharge"
  revealed the `specific` sexual-history item on "discharge you home", and
  "how much pain" and "painkillers" matched every "pain" question.
- **Chinese keywords.** A keyword of 3 characters whose 2-character core is an
  everyday word (拉肚子, 怎么了, 一直疼, 住在哪, 什么病) scores 0.67, above the
  0.55 selection threshold, on any utterance containing that word; use 4 or
  more characters. Note also 性病 ⊂ 慢性病. Generic cores also include 怕什么
  (什么), 吐了吗 (了吗) and 还有什么问题 (5/6 = 0.83 on any 有什么问题 sentence).
- **excludeKeywords** separate onset from site, contacts from bowels, family
  from personal history, and identity from weight loss.
- **Prefix collisions** (an utterance token of ≥ 4 letters prefixes a one-token
  keyword of another item and scores 1.0): test → testis/testicle (blood
  tests); part → partner (the `specific` sexual-history item, on "which part
  hurts?"); peni(s) → penicillin; press → prescrib(ed); water → waterworks;
  heart → heartburn; head → headache; flat → flatus; side → "which side". They
  are handled with `excludeKeywords` or by rewording the keyword.
- **Substring containment.** A one-word keyword of ≥ 4 letters scores 0.9
  whenever it appears *inside* another word: "ease" ⊂ please/disease, and
  "operation" ⊂ cooperation.
- **Stop words also hide inside phrases.** "done", "like" and "on" are stop
  words, so "tests done" is the single token "test"; use unspaced forms that
  start with a stop word ("anytestsdone", "thepainlike", "onyourmind").
- **Look-alike questions.** "Is it in the same place now or has it travelled?"
  selected `hx-exposures` through `travel`, "hurt more when you move or
  cough?" selected `hx-resp` through the one-token `cough`, and "bowels been
  working normally?" selected `hx-occupation` through `work`. `hx-exposures`
  and `hx-resp` now exclude those phrasings, and `hx-occupation` uses
  run-together forms (`doyouwork`, `forwork`, `areyouworking`…). The required
  `ex-testes` takes "testicles", "genitalia" and run-together
  "thetestes"/"histestes" (not "testes", which stems to `test`, nor
  "examinetestes", which "examine" prefix-matches). "最后一次吃东西是什么时候？"
  does not also credit `hx-anorexia` (it excludes 最后一次 / 上一顿 / "last
  ate").
- **Dose text is a formula.** The morphine dose reads ≈ 0.1 mg/kg and the
  fluids give maintenance as 25–30 mL/kg/day; ≈ 7 mg and ≈ 80 mL/h for his
  68 kg are only in the `response`s.
- **Per-locale result texts.** Urinalysis, group-and-screen and imaging values
  are `LocalizedText` (阴性 / negative), never both languages in one string.

On 313 paraphrases the patient pipeline's select step picks the expected fact
98 % of the time, with no extra fact 96 % of the time (before the second
matcher review: 73 % and 66 %). The third review measured recall@3 on four
fresh held-out sets *before* tuning on each: 0.903, 0.912, 0.910 and 0.881
(0.88–0.92 on unseen paraphrases); after tuning, all 313 + 313 probes reach
1.000. 36 bedside statements ("lie flat", "press here", "we need some blood
tests", "which part of your tummy hurts") do not select a `specific` or
`unknown` fact.

## References

- Podda M, Ceresoli M, De Simone B, et al. Diagnosis and treatment of acute appendicitis: 2025 edition of the World Society of Emergency Surgery Jerusalem guidelines. JAMA Surg. 2026;161(3):283-295. doi:10.1001/jamasurg.2025.6218 — risk scores (AIR, AAS) with imaging; low-dose CT preferred where available, scores with ultrasound as the alternative in adults; antibiotics-first for selected uncomplicated cases; appendectomy within 24 h; laparoscopy as standard.
- Di Saverio S, Podda M, De Simone B, et al. Diagnosis and treatment of acute appendicitis: 2020 update of the WSES Jerusalem guidelines. World J Emerg Surg. 2020;15(1):27. doi:10.1186/s13017-020-00306-3 — AIR/AAS risk stratification, ultrasound first and (low-dose) CT if inconclusive, a single pre-operative antibiotic dose, no post-operative antibiotics when uncomplicated, a short in-hospital delay (< 24 h).
- Gorter RR, Eker HH, Gorter-Stam MAW, et al. Diagnosis and management of acute appendicitis. EAES consensus development conference 2015. Surg Endosc. 2016;30(11):4668-4690. doi:10.1007/s00464-016-5245-7
- Expert Panel on Gastrointestinal Imaging; Kambadakone AR, Santillan CS, et al. ACR Appropriateness Criteria® right lower quadrant pain: 2022 update. J Am Coll Radiol. 2022;19(11S):S445-S461. doi:10.1016/j.jacr.2022.09.011 — contrast CT the primary test in non-pregnant adults; ultrasound and MRI in pregnancy.
- Kumar SS, Collings AT, Lamm R, et al. SAGES guideline for the diagnosis and treatment of appendicitis. Surg Endosc. 2024;38(6):2974-2994. doi:10.1007/s00464-024-10813-y — ultrasound a reasonable first test, CT and MRI the most definitive; operative management of uncomplicated appendicitis, immediate (< 12 h) or delayed (> 12 h).
- Alvarado A. A practical score for the early diagnosis of acute appendicitis. Ann Emerg Med. 1986;15(5):557-564. doi:10.1016/s0196-0644(86)80993-3
- Andersson M, Andersson RE. The appendicitis inflammatory response score: a tool for the diagnosis of acute appendicitis that outperforms the Alvarado score. World J Surg. 2008;32(8):1843-1849. doi:10.1007/s00268-008-9649-y
- Manterola C, Vial M, Moraga J, Astudillo P. Analgesia in patients with acute abdominal pain. Cochrane Database Syst Rev. 2011;(1):CD005660. doi:10.1002/14651858.CD005660.pub3 — opioid analgesia does not increase diagnostic or treatment-decision errors.
- CODA Collaborative. A randomized trial comparing antibiotics with appendectomy for appendicitis. N Engl J Med. 2020;383(20):1907-1919. doi:10.1056/NEJMoa2014320 — about 29 % of the antibiotics group had an appendectomy by 90 days.
- Salminen P, Paajanen H, Rautio T, et al. Antibiotic therapy vs appendectomy for treatment of uncomplicated acute appendicitis: the APPAC randomized clinical trial. JAMA. 2015;313(23):2340-2348. doi:10.1001/jama.2015.6154 — CT-confirmed uncomplicated appendicitis; 27.3 % of the antibiotics group had an appendectomy within 1 year.
- Salminen P, Tuominen R, Paajanen H, et al. Five-year follow-up of antibiotic therapy for uncomplicated acute appendicitis in the APPAC randomized clinical trial. JAMA. 2018;320(12):1259-1265. doi:10.1001/jama.2018.13201 — cumulative recurrence 39.1 % at 5 years.
- Bratzler DW, Dellinger EP, Olsen KM, et al. Clinical practice guidelines for antimicrobial prophylaxis in surgery. Am J Health Syst Pharm. 2013;70(3):195-283. — timing within 60 min of incision; cefuroxime re-dosing interval 4 h.
- Mazuski JE, Tessier JM, May AK, et al. The Surgical Infection Society revised guidelines on the management of intra-abdominal infection. Surg Infect (Larchmt). 2017;18(1):1-76. doi:10.1089/sur.2016.261
- Solomkin JS, Mazuski JE, Bradley JS, et al. Diagnosis and management of complicated intra-abdominal infection in adults and children: guidelines by the Surgical Infection Society and the Infectious Diseases Society of America. Clin Infect Dis. 2010;50(2):133-164. — regimens by severity; meropenem and imipenem among the agents for severe community-acquired infection.
- National Institute for Health and Care Excellence. Intravenous fluid therapy in adults in hospital (CG174). London: NICE; 2013 (updated 2017). — maintenance 25–30 mL/kg/day.
- O'Driscoll BR, Howard LS, Earis J, Mak V. BTS guideline for oxygen use in adults in healthcare and emergency settings. Thorax. 2017;72(Suppl 1):ii1-ii90. doi:10.1136/thoraxjnl-2016-209729 — target SpO₂ 94–98 % in most acutely ill patients.

DOIs were checked on 2026-10-28 against the publisher or indexer record
(title, journal, year, volume and pages); none is given where that could not
be done (Bratzler 2013, Solomkin 2010).

Guidelines differ on the first imaging test in adults. The case teaches the
risk scores with graded-compression ultrasound first for this slim
19-year-old and names the alternatives in feedback:

- WSES 2020: ultrasound first, (low-dose) CT if it is inconclusive.
- WSES 2025: low-dose CT preferred where available; risk scores with
  ultrasound the alternative for the initial work-up of adults.
- ACR 2022: contrast-enhanced CT the primary test in non-pregnant adults.
- SAGES 2024: ultrasound a reasonable first test; CT and MRI the most
  definitive.

### To verify

Items this editorial pass could not settle; a clinician reviewer should check
them:

- The WSES 2025 edition was checked through its abstract, the publisher's
  listing and published summaries, not the full text: the adult imaging
  recommendation (low-dose CT preferred where available; AIR/AAS with
  ultrasound as the alternative), the < 24 h delay and laparoscopy as standard.
  A reviewer should confirm whether its full text names patient groups (for
  example adults with obesity) in which CT should come first.
- `r-inv-us-first` (weight 2) rewards ultrasound without CT. With WSES 2025
  preferring low-dose CT where available, confirm that this scoring suits the
  intended teaching setting (CT stays `neutral`, never unsafe).
- No Chinese national guideline or expert consensus on adult acute
  appendicitis could be found and verified in this review; the case cites
  international guidance only.
- The antibiotics-first example regimen (ertapenem, then levofloxacin +
  metronidazole, as in APPAC) sits beside the "no carbapenem" teaching for the
  pre-operative dose and the pharmacist's stewardship call on meropenem;
  check both against the local formulary. Parecoxib's availability also varies by country. ASHP 2013 lists
  cefoxitin, cefotetan or cefazolin + metronidazole for appendectomy; the case
  uses cefuroxime or ceftriaxone + metronidazole, as many UK and Chinese
  hospitals do.
- The fluid regimen (Hartmann's 500 mL over 30 min, then 500 mL over 2 h) is a
  teaching regimen within NICE CG174 principles; check it against local
  policy.
- DOIs for Bratzler 2013 and Solomkin 2010 could not be verified and are left
  out.

## Changelog

### 1.1.2 — 2026-10-30 (assessment validity)

- **Options rebalanced so the key is not cued by length.** In 2 of the 3
  single-best decisions (`dec-imaging`, `dec-definitive`) the keyed option was
  the uniquely longest in both languages; now it is in none. The distractors
  carry the detail and register of the key and say why they tempt: contrast CT
  as "the most accurate test", a plain film "to look for an appendicolith,
  free gas or bowel obstruction", MRI as radiation-free, home on oral
  analgesia; antibiotics-first with its regimen (IV ≥ 24 h, then oral, about
  7–10 days — the `abx-first-nom` dose), open appendectomy with the same
  single pre-operative antibiotic dose as the key, admission for untreated
  observation, discharge with a surgical clinic review. The laparoscopy key
  is tighter wording of the same plan. Medical meaning, correct flags,
  feedback and scoring are unchanged; `dec-supportive` and `dec-diagnosis`
  had no cue and are untouched.
- **Option ids:** all already name their content; none changed.
- **Matcher corpus:** five `extensions.testUtterances` that were one of their
  item's keywords (`cases validate --strict`) are now paraphrases; no history
  item, answer or keyword changed.

### 1.1.1 — 2026-10-28 (assessment integrity)

- **Avoided-harm items count only once the harm was possible** (`scoredWhen`):
  `r-safety` counts once supportive care has begun (`dec-supportive`
  attempted or an analgesic given) or one of its harms has happened;
  `r-eff-lowvalue` once the imaging decision is reached or a low-value test is
  ordered. Doing nothing scored 4/25 (16 %) from these two items alone and now
  scores 0/21 (0 %); the reference path keeps 25/25 and every path in the
  table above scores as before (replayed with the engine).
- **Matcher corpus:** four `extensions.testUtterances` that repeated their
  item's canonical question are now paraphrases (`cases validate --strict`);
  no history item, answer or keyword changed.

### 1.1.0 — 2026-10-28 (editorial review)

- **Imaging guidance brought up to date (WSES 2025).** The imaging decision's
  feedback (both the ultrasound and the CT option), the imaging key-reasoning
  point and the radiologist's brief now state that the 2025 WSES edition
  prefers low-dose CT where available and accepts the risk scores with
  ultrasound as the alternative for adults — why ultrasound first remains
  the best answer for this slim 19-year-old, and when CT is needed. The
  laparoscopy and < 24 h delay statements cite both WSES editions; the AIR/AAS
  teaching point notes that the 2025 edition keeps both scores. The answer
  and the option ids are unchanged.
- **Stewardship wording.** The meropenem response said carbapenems are
  reserved for "severe, complicated or resistant" intra-abdominal infection;
  it now says meropenem is kept for severe or resistant infection (IDSA/SIS
  2010 lists it among the agents for severe infection), with cefuroxime or
  ceftriaxone plus metronidazole preferred for a community-acquired source.
- **Teaching design.** `learningOutcomes` (6) added — their timings anchored to
  the encounter (the case clock starts 25 min after he arrived), the antibiotic
  outcome naming the spectrum the regimen covers. Three objective hints
  (`obj-stabilise`, `obj-workup`, `obj-definitive`) listed the supportive-care
  answers, the imaging answer and the antibiotic regimen; they now coach with
  questions instead. Three debrief teaching points name the evidence they rest
  on (Cochrane 2011; WSES 2020 and ASHP 2013, with the 60-minute timing of the
  pre-operative dose; APPAC, CODA and WSES).
- **Consistency:** "leucocyte esterase" in British spelling, as in the other
  library cases; the patient's and roommate's names carry the pseudonym marker
  used across the library ("周宇航（化名）" / "Zhou Yuhang (pseudonym)").
- **References:** normalised to one Vancouver-style string each with verified
  DOIs; the WSES 2025 edition (JAMA Surg 2026) and the SIS 2017
  intra-abdominal infection guideline added; volume, issue and pages
  completed (WSES 2020, EAES, SAGES 2024); the ACR first authors named and
  the BTS title corrected ("… oxygen use in adults in healthcare and
  emergency settings").
- **Governance:** `provenance.review` (editorial, AI-assisted, not
  clinician-reviewed) added; version 1.0.0 → 1.1.0.
- **README** restructured to the facilitator-guide template; the reference
  path re-timed and the wrong-path scores re-measured by replaying them through
  the engine.

### 1.0.0

- First release.

## Validation

```bash
npm run cc -- cases validate packages/content/cases/acute-appendicitis/case.json
npm run cc -- cases verify acute-appendicitis
npm run -s cc -- bench grounding --split dev --case acute-appendicitis
npx vitest run packages/agent/src/session/embodied-autopilot.test.ts
npm run cc -- play acute-appendicitis --provider offline
```

## 中文摘要

**病例概要。** 19岁男性大学生（计算机专业大二），01:50由室友陪同打车来急诊，弯腰走入，分诊3级，疼痛评分7/10，已上监护；02:15开始接诊。约18小时前（早饭后约8点）出现脐周隐痛，下午3点左右转移至右下腹并转为持续性刺痛，活动、咳嗽、颠簸时加重；伴食欲减退、自中午起恶心，晚10点呕吐1次（呕吐出现在腹痛之后），晚上起自觉发热。无泌尿系统及睾丸症状，排便正常，同食者无发病；既往体健，无过敏，无手术史。体温37.9 ℃，心率102次/分。麦氏点压痛、右下腹局限性肌紧张及反跳痛，Rovsing征、腰大肌征阳性；睾丸、疝口、肾区和肺部检查阴性。WBC 14.2×10⁹/L（中性粒细胞81.7%），CRP 48 mg/L，尿常规无感染或血尿；分级加压超声示阑尾不可压缩、外径9 mm，无粪石、积液或脓肿。Alvarado 10/10，AIR 7（中危）。诊断：急性非复杂性阑尾炎。

**学习目标。**

1. 采集重点病史，确认典型时序（脐周痛转移至右下腹，厌食和恶心先于呕吐），检查腹膜刺激征和关键阴性体征，包括在征得同意、有陪检者在场时检查睾丸。
2. 接诊后40分钟内、不必等检查完成，给予静脉阿片类滴定镇痛、止吐、静脉补液并禁食，并能说明镇痛不会掩盖诊断。
3. 依据已获得的资料计算Alvarado和AIR评分并解释两者为何结论不同；为年轻、体型偏瘦的患者首选分级加压超声，并说明何时改行（低剂量）CT。
4. 综合临床、检验和超声结果诊断急性非复杂性阑尾炎，并用已记录的阴性结果排除睾丸扭转、输尿管结石、胃肠炎和克罗恩病。
5. 接诊后3小时内给予单次术前静脉抗生素，覆盖肠道革兰阴性菌和厌氧菌（头孢呋辛或头孢曲松联合甲硝唑），不用碳青霉烯类、不重复用药，并请外科会诊。
6. 与患者讨论腹腔镜阑尾切除术和“抗生素优先”方案（需CT确认；约四分之一到三分之一一年内仍需手术），共同决策并取得知情同意。

**关键决策。**

- 支持治疗（多选）：禁食、静脉补液（乳酸钠林格注射液）、静脉阿片类滴定镇痛、止吐；不应等外科查体后才镇痛，不用泻药或灌肠，不常规留置胃管。
- 影像选择：分级加压超声（加扫肾脏和盆腔）。WSES 2020建议超声优先；2025版在条件允许时首选低剂量CT，并认可评分联合超声作为替代方案；ACR 2022将增强CT列为成人首选——对表现典型、体型偏瘦的19岁患者，超声是合理的首选。
- 诊断：急性非复杂性阑尾炎；鉴别穿孔伴脓肿、肠系膜淋巴结炎、克罗恩病、输尿管结石、睾丸扭转和胃肠炎。
- 确定性处理：经共同决策（含讨论“抗生素优先”方案）后行腹腔镜阑尾切除术，术前单次静脉抗生素；“抗生素优先”需先经CT确认非复杂性、无粪石。

**复盘要点。**

- 症状时序很关键：定位不清的脐周内脏痛 → 壁腹膜受累后定位明确的右下腹躯体痛；厌食、恶心先于呕吐。
- 早期充分镇痛不会掩盖诊断（Cochrane 2011）；护士在第40分钟会提醒镇痛。
- 评分用于分层而非确诊：Alvarado 10分（很可能）与AIR 7分（中危，需影像）结论不同。
- 年轻男性下腹痛必须检查睾丸和疝口；尿常规、肾区叩痛和超声排除泌尿系疾病。
- 术前单次抗生素覆盖肠道革兰阴性菌和厌氧菌；非复杂性者术后无需继续用药；不用碳青霉烯类。
- 尊重成年患者的自主权（何时告知父母），如实说明“抗生素优先”的失败率并用复述确认理解。
- 本病例经AI辅助编辑审校，尚未经执业临床医师审阅；用于教学前请由本专科医师审核。
