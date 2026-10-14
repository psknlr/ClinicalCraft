# `acute-appendicitis`: abdominal pain at 02:15 (19-year-old man)

> **Spoilers for case authors.** This file names the diagnosis. Learners should
> open the case from the case library, where the title, summary and tags give
> nothing away.

> **Synthetic case.** This is a fictional teaching case. The patient (周宇航 /
> Zhou Yuhang), his roommate, the university and every clinical detail are
> invented. Nothing is based on a real patient. The case is not medical advice
> (`disclaimer`: 虚构教学病例，不构成医疗建议。/ Fictional teaching case — not
> medical advice.).

| | |
|---|---|
| id / version | `acute-appendicitis` / `1.0.0` |
| setting / facility | `emergency` / `general-hospital` (ED cubicle) |
| locales | `zh-CN` (source language), `en` |
| clock | `simulated`, starts 02:15, `realtimeScale` 0.5, limit 360 min; ask 1 · examine 2 · order 1 · read 1 · intervene 2 min |
| phases | one phase, `ed` (急诊夜班 / ED night shift) |
| difficulty / time | 2 / 5 · about 35 min |
| content | 39 history items (4 `unknown`, 1 `specific`, 10 required) · 19 exam findings · 15 investigations · 19 interventions (8 wrong or low-value choices) · 6 objectives · 4 decisions · 17 rubric items (14 deterministic, 3 examiner-judged) · 5 NPCs · 40 test utterances |

## Clinical story

A second-year computer science student arrives at 01:50 by taxi with his
roommate. About 18 hours earlier (≈08:00) he developed a dull periumbilical
ache. Around 15:00 it moved to the right iliac fossa and became sharp and
constant, worse with movement, coughing and speed bumps. He has had anorexia
since then (no lunch or dinner), nausea from midday, one vomit at about 22:00
(after the pain began) and has felt feverish since the evening. He has no
urinary or testicular symptoms, his bowels opened normally the previous
morning, and his roommates (same canteen food) are well. He is otherwise
healthy, takes no medicines, has no known allergies, and has never had an
operation or an anaesthetic. His last food was at 07:30 the previous day and
his last sip of water was at midnight.

**Examination:** T 37.9 °C, HR 102, BP 124/76 (MAP 92), RR 18, SpO₂ 99 % on
air, pain 7/10. Tenderness is maximal at McBurney's point, with localised
voluntary guarding and rebound/percussion tenderness in the RIF. Rovsing's and
the psoas sign are positive; the obturator sign is equivocal. Cough and
heel-drop tests are positive. He has dry mucosa and reduced bowel sounds.
**Pertinent negatives:** normal testes with cremasteric reflexes present,
clear hernial orifices, no renal-angle tenderness, clear chest, no rash, and a
normal throat and cervical nodes.

**Results:** WBC 14.2 ×10⁹/L, neutrophils 11.6 ×10⁹/L (81.7 %), CRP 48 mg/L.
Electrolytes are normal (anion gap 138 − (101 + 23) = 14 mmol/L). Urea is
6.8 mmol/L, creatinine 84 µmol/L, eGFR (CKD-EPI 2021) 118. Urinalysis shows
concentrated urine with trace ketones and no infection or blood.
Graded-compression ultrasound shows a non-compressible, blind-ending 9 mm
appendix (wall 4 mm, target sign, mural hyperaemia) with echogenic inflamed
fat. There is no appendicolith, fluid or abscess, and no hydronephrosis.
CT (low value here) agrees: uncomplicated appendicitis, DLP ≈ 500 mGy·cm,
≈ 7.5 mSv.

**Diagnosis:** acute uncomplicated appendicitis.

**Management:** nil by mouth; Hartmann's; titrated IV morphine (≈0.1 mg/kg,
≈7 mg for 68 kg) plus IV paracetamol 1 g; ondansetron 4 mg; one
pre-operative IV dose of cefuroxime 1.5 g + metronidazole 500 mg (or
ceftriaxone 2 g + metronidazole 500 mg); surgical referral; shared decision
after the antibiotics-first option has been discussed; laparoscopic
appendectomy. The case ends when he goes to theatre.

## Scores (computed from the recorded findings; also in `extensions.clinicalScores`)

| Score | Components | Total |
|---|---|---|
| Alvarado (MANTRELS) | migration 1 + anorexia 1 + nausea/vomiting 1 + RIF tenderness 2 + rebound 1 + T ≥ 37.3 °C 1 + WBC > 10 2 + neutrophils > 75 % 1 | **10 / 10** |
| AIR | vomiting 1 + RIF pain 1 + rebound/guarding moderate 2 + T ≥ 38.5 °C 0 + PMN 70–84 % 1 + WBC 10.0–14.9 1 + CRP 10–49 mg/L 1 | **7 / 12** (intermediate, 5–8) |

If rebound/guarding is graded "light", AIR is 6, which is still intermediate.
The two scores disagree on purpose: Alvarado says "very likely", while AIR
says "intermediate, so image". Scores stratify risk; they are not a
diagnosis. Units are SI throughout. The English text adds conventional units
in parentheses where clinicians expect them (BUN ≈ 19 mg/dL, creatinine
0.95 mg/dL, glucose 101 mg/dL, PvCO₂ 42 mmHg).

Other consistency checks the generator asserts:
- WBC differential sums to 14.2.
- MCV = Hct/RBC.
- The VBG obeys Henderson–Hasselbalch: pH 7.36 = 6.1 + log(23 / (0.03 × 42)).
- BE is −1.9.
- eGFR is 118 by CKD-EPI 2021.
- BMI is 22.0.

## Teaching notes

1. **Sequence of symptoms.** Visceral periumbilical pain becomes somatic RIF
   pain, and anorexia and nausea come before vomiting. Vomiting before pain,
   or diarrhoea, suggests gastroenteritis instead.
2. **Pertinent negatives in a young man.** Torsion (testes and cremasteric
   reflex), ureteric colic and pyelonephritis (urinalysis, renal angles,
   hydronephrosis), gastroenteritis (contacts, diarrhoea), Crohn's (chronic
   symptoms), right lower lobe pneumonia (chest) and shingles (skin) are all
   recorded so the learner can exclude them. DRE is available but adds little.
   The rubric does not require it.
3. **Analgesia does not mask the diagnosis** (Cochrane, Manterola 2011).
   - The scenario event `evt-analgesia-delay` fires at simulated minute 40 if
     no analgesia has been given. It sets `analgesia-delayed`, so rubric item
     `r-mx-analgesia` cannot be met afterwards.
   - "Withhold analgesia" is an orderable wrong choice. It is contraindicated
     while pain ≥ 4.
4. **Imaging.** Ultrasound comes first in a young, slim patient. CT is
   modelled as `low-value`: it is accurate and ACR rates it "usually
   appropriate" in adults, but here it adds radiation and contrast and rarely
   changes management. It earns its place when ultrasound is inconclusive, a
   complication is suspected, or antibiotics-first is being considered.
   `r-inv-us-first` rewards reading the US without ordering CT.
5. **Antibiotics.**
   - Give a single pre-operative dose with Gram-negative and anaerobic cover.
   - Give no post-operative course if the appendicitis is uncomplicated.
   - Meropenem is orderable. It is a neutral choice, but the pharmacist
     comments on stewardship and rubric item `r-mx-abx` is not met.
   - A second antibiotic regimen is contraindicated (duplication).
6. **Antibiotics-first versus surgery** (APPAC, CODA). Antibiotics-first is a
   legitimate option for CT-confirmed uncomplicated appendicitis without an
   appendicolith, after an informed discussion. About a quarter to a third of
   patients need an appendectomy within a year, and more fail when an
   appendicolith is present.
   - `abx-first-nom` is **contraindicated unless a CT has been read**, because
     ultrasound cannot reliably exclude an appendicolith. After a CT it is
     neutral.
   - The decision's best answer is laparoscopic appendectomy after shared
     decision-making.
   - The consent intervention's narrative records the patient's choice.
7. **Tempting wrong choices** are contraindicated and appear in the
   assessment's safety list. Discharging him and laxatives or enemas are
   always contraindicated. Withholding analgesia is contraindicated while
   pain ≥ 4. Allowing food or drink is always contraindicated. Booking theatre
   before surgical review, imaging and consent is also contraindicated.
   Oxygen (SpO₂ 99 % on air) and an NG tube are neutral, with explanatory
   responses.

## Physiology model

- **Baseline:** HR 102, BP 124/76, RR 18, SpO₂ 99, T 37.9, GCS 15, pain 7,
  sinus rhythm.
- **Untreated trends:**
  - HR +0.06/min up to +14 and SBP −0.03/min down to −8, stopping when
    fluids are given.
  - Pain +0.01/min up to +2 and RR +0.01/min up to +3, stopping when any
    analgesic is given.
  - Temperature +0.003/min up to +0.8, stopping when any antibiotic is given.
  - Each trend recovers once stopped.
- **Effects:**
  - Morphine: pain −4 over 8 min, HR −6, RR −1.
  - Paracetamol: pain −1.5, T −0.5.
  - Fluids: HR −10 over 60 min, SBP +4.
  - Antibiotics: T −0.3 after 60 min.
- **Scripted events:**
  - `evt-analgesia-delay` (minute 40, no analgesia).
  - `evt-delay-warning` (minute 180, no antibiotics and no surgery booked).
  - `evt-perforation` (minute 300, no antibiotics and no surgery booked): new
    baseline HR 112, BP 112/66, RR 22, T 38.3, pain 9, plus the accumulated
    trends.
- **Limitation:** the examination findings are fixed records. After the
  perforation event, the nurse's message and the monitor change, but the
  recorded abdominal signs do not.

## Reference solution

Run with `clinicalcraft cases verify acute-appendicitis`. The solution path
covers:
- focused history, then the abdominal and peritonism examination;
- nil by mouth, morphine, ondansetron and fluids by minute 27;
- the supportive-care decision, then orders for FBC, CRP, U&E and
  urinalysis;
- the rest of the history (including pre-operative questions and ICE), then
  the special signs and pertinent negatives;
- the imaging decision (US), the US order and paracetamol;
- advancing 45 min, then reading the results;
- the diagnosis, antibiotics, surgical consult, consent, the definitive
  decision, laparoscopic appendectomy and finish.

The verify run finishes at simulated minute 118 (04:13). Every intervention
is `indicated`, with no rejections and no alarms, and the deterministic
rubric scores 23/23.

## Matcher notes (`extensions.testUtterances`)

All 40 utterances (21 zh-CN, 19 en) rank the expected history item first
and alone. Known, accepted ties that come from token stemming in the offline
matcher:
- "Is the pain constant?" ties `hx-timing` with `hx-bowels`, because
  "constant" and "constipated" share a 5-letter prefix. `hx-timing` ranks
  first by declaration order.
- "Where did the pain start?" scores `hx-onset` 1.0 and `hx-site-initial`
  0.67, because "where" and "when" are stop-words. Both answers are selected
  by the patient pipeline.
- Some English keywords are deliberately unspaced (`comeandgo`,
  `hadthisbefore`). The matcher then scores them by compact containment
  instead of single generic tokens.

## Guideline references

- Di Saverio S, et al. Diagnosis and treatment of acute appendicitis: 2020 update of the WSES Jerusalem guidelines. *World J Emerg Surg.* 2020;15:27.
- Gorter RR, et al. Diagnosis and management of acute appendicitis. EAES consensus development conference 2015. *Surg Endosc.* 2016;30:4668–4690.
- American College of Radiology. ACR Appropriateness Criteria: Right Lower Quadrant Pain (current revision).
- Alvarado A. A practical score for the early diagnosis of acute appendicitis. *Ann Emerg Med.* 1986;15(5):557–564.
- Andersson M, Andersson RE. The appendicitis inflammatory response score. *World J Surg.* 2008;32(8):1843–1849.
- Manterola C, et al. Analgesia in patients with acute abdominal pain. *Cochrane Database Syst Rev.* 2011;(1):CD005660.
- CODA Collaborative. A randomized trial comparing antibiotics with appendectomy for appendicitis. *N Engl J Med.* 2020;383(20):1907–1919.
- Salminen P, et al. APPAC randomized clinical trial. *JAMA.* 2015;313(23):2340–2348; five-year follow-up *JAMA.* 2018;320(12):1259–1265.
- Bratzler DW, et al. Clinical practice guidelines for antimicrobial prophylaxis in surgery. *Am J Health Syst Pharm.* 2013;70(3):195–283.
- Solomkin JS, et al. SIS/IDSA guidelines for complicated intra-abdominal infection. *Clin Infect Dis.* 2010;50(2):133–164.
- NICE CG174. Intravenous fluid therapy in adults in hospital (2013, updated 2017).
- O'Driscoll BR, et al. BTS guideline for oxygen use in healthcare and emergency settings. *Thorax.* 2017;72(Suppl 1):ii1–ii90.

## Validation

```bash
clinicalcraft cases validate packages/content/cases/acute-appendicitis/case.json
clinicalcraft cases verify acute-appendicitis
clinicalcraft play acute-appendicitis --provider offline
```
