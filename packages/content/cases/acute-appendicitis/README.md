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
| setting / facility | `emergency` / `general-hospital` (first slot accepting `emergency`, currently `resus-1`; every capability the case needs is within 6 m of it) |
| locales | `zh-CN` (source language), `en` |
| clock | `simulated`, starts 02:15, `realtimeScale` 0.5, limit 360 min; ask 1 · examine 2 · order 1 · read 1 · intervene 2 min |
| phases | one phase, `ed` (急诊夜班 / ED night shift) |
| difficulty / time | 2 / 5 · about 35 min |
| content | 40 history items (4 `unknown`, 1 `specific`, 10 required) · 19 exam findings · 15 investigations · 20 interventions (8 wrong or low-value choices) · 6 objectives · 4 decisions · 18 rubric items (15 deterministic, 3 examiner-judged) · 5 NPCs · 78 test utterances (3 unrecorded-topic negatives) |

## Clinical story

A second-year computer science student arrives at 01:50 by taxi with his
roommate. About 18 hours earlier (≈08:00) he developed a dull periumbilical
ache. Around 15:00 it moved to the right iliac fossa and became sharp and
constant, worse with movement, coughing and speed bumps. He has had anorexia
since then (no lunch or dinner), nausea from midday, one vomit at about 22:00
(after the pain began) and has felt feverish since the evening. He has no
urinary or testicular symptoms, his bowels opened normally the previous
morning, and his roommates (same canteen food) are well. He is otherwise
healthy (no hepatitis or TB that he knows of, never transfused), takes no
medicines, has no known allergies, and has never had an operation or an
anaesthetic. He is unmarried with no children. His last food was at 07:30 the
previous day and his last sip of water was at midnight.

**Examination:** T 37.9 °C, HR 102, BP 124/76 (MAP 92), RR 18, SpO₂ 99 % on
air, pain 7/10. Tenderness is maximal at McBurney's point, with localised
voluntary guarding and rebound/percussion tenderness in the RIF. Rovsing's and
the psoas sign are positive; the obturator sign is equivocal. Cough and
heel-drop tests are positive. He has dry mucosa and reduced bowel sounds;
elsewhere the percussion note is tympanic, liver dullness is preserved and
there is no shifting dullness (consistent with "no free fluid" on imaging).
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
CT (`neutral` here; redundant once the ultrasound is diagnostic) agrees:
uncomplicated appendicitis, DLP ≈ 500 mGy·cm, ≈ 7.5 mSv.

**Diagnosis:** acute uncomplicated appendicitis.

**Management:** nil by mouth; Hartmann's; titrated IV morphine (≈0.1 mg/kg,
≈7 mg for 68 kg) plus IV paracetamol 1 g; ondansetron 4 mg; one
pre-operative IV dose of cefuroxime 1.5 g + metronidazole 500 mg (or
ceftriaxone 2 g + metronidazole 500 mg), given at diagnosis (re-dose
cefuroxime at induction if more than 4 h pass before incision); surgical referral; shared decision
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
3. **Analgesia does not mask the diagnosis** (Cochrane, Manterola 2011: opioids
   do not increase diagnostic or treatment-decision errors).
   - The scenario event `evt-analgesia-delay` fires at simulated minute 40 if
     no analgesia has been given. It sets `analgesia-delayed`, so rubric item
     `r-mx-analgesia` cannot be met afterwards.
   - `r-mx-analgesia` asks for *adequate* analgesia: titrated morphine, or
     parecoxib plus paracetamol. Paracetamol alone (pain ≈ 5.5/10) stops the
     nurse's prompt but does not meet the item.
   - The history objective's hint and guidance say he has had no analgesia
     and that treating pain need not wait for the history.
   - The objectives run history → **supportive care** → examination → work-up
     → diagnosis → definitive care, so the quest card asks for analgesia
     straight after the history (the supportive-care decision still needs a
     quick palpation; its waypoint points back to the patient until then). A
     thorough learner following the old order (full examination before
     supportive care) reached morphine at minute 48 and missed `r-mx-analgesia`;
     in the new order the same learner gives it at minute 28.
   - `iv-access` (cannula + bloods) is an orderable, always-indicated step,
     as in the other acute cases; the triage note says he has no IV access.
   - "Withhold analgesia" is an orderable wrong choice. It is contraindicated
     while pain ≥ 4.
4. **Imaging.** Ultrasound comes first in a young, slim patient. CT is
   modelled as `neutral`, not `low-value`: ACR (2022 update) rates
   contrast-enhanced CT the primary test for most adults, but here it adds
   radiation and contrast and rarely changes management once the ultrasound
   is diagnostic (WSES 2020 recommends ultrasound first when imaging is
   indicated). It earns its place when ultrasound is inconclusive, a
   complication is suspected, or antibiotics-first is being considered.
   `r-inv-us-first` rewards reading the US without ordering CT. CT is
   `alternativeTo` the ultrasound, so a learner who goes straight to CT is
   not told an essential investigation is missing; they lose only
   `r-inv-us-first`.
5. **Antibiotics.**
   - Give a single pre-operative dose with Gram-negative and anaerobic cover.
   - Give no post-operative course if the appendicitis is uncomplicated.
   - Meropenem is orderable. It is a neutral choice, but the pharmacist
     comments on stewardship and rubric item `r-mx-abx` is not met.
   - A second antibiotic regimen is contraindicated (duplication), and
     `r-mx-abx` requires exactly one of the two pre-operative regimens.
   - `r-eff-timely` requires any antibiotic before the 3-hour escalation
     (`evt-delay-warning`). The choice of regimen is scored only by `r-mx-abx`,
     so antibiotics-first without a CT costs `r-mx-abx` + `r-safety` (80 %)
     rather than three items.
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
   - The rubric sees the time-dependent ones through two silent marker events
     (no message): `evt-mark-theatre-premature` sets `theatre-premature` and
     `evt-mark-nom-without-ct` sets `nom-without-ct` at the moment of the
     unsafe order. `r-safety` (which also covers a perforation caused by
     delay) and `r-mx-definitive` read those flags.
8. **Decisions unlock only with their evidence.** `dec-supportive` needs
   palpation and the nausea/vomiting question; `dec-diagnosis` needs FBC, CRP,
   urinalysis and imaging read and the testes examined, because its feedback
   cites them. `r-dx` and `r-mx-definitive` use `decidedFirstTry`, so guessing
   through the diagnosis or the definitive-management options costs that item.
9. **Conditions use actions, not flags.** Objectives, rubric items, trends,
   events and contraindications test `intervened` rather than the flags the
   interventions set. A learner-sent `flag` action cannot complete an
   objective or earn a positive rubric item. Every flag a condition reads
   (including the penalty flags `analgesia-delayed`, `theatre-premature`,
   `nom-without-ct`, `perforation-suspected` and `delayed-source-control`) is
   set by an intervention or event, so `ClinicalSession` refuses learner
   `flag` actions on it. A raw engine replay could still clear one.
10. **NPC briefs stay within what the learner has elicited.**
    - The pharmacist's brief no longer states "no known drug allergies"
      (`hx-allergies` is a required history item). It prompts the learner to
      ask before any antibiotic.
    - The surgical registrar's brief describes the operative routine, so it
      names the diagnosis. It is therefore marked `revealsDiagnosis: true`,
      and its own text says to discuss the routine only after the learner
      has committed to a diagnosis.

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
  - Untreated replay: the events fire at minutes 40, 180 and 300. Vitals go
    from HR 102, T 37.9, pain 7 to HR 125–127, SBP ≈ 104, RR 24–25, T 39.1,
    pain 10. Only warning alarms sound, never critical ones.
  - Two silent marker events (`evt-mark-theatre-premature`,
    `evt-mark-nom-without-ct`) feed the rubric only.
- **Limitation:** the examination and imaging findings are fixed records.
  After the perforation event, the nurse's message and the monitor change,
  but the recorded abdominal signs and scan do not. The event message and the
  debrief boundaries say that the earlier records describe his state before
  the change.

## Reference solution

Run with `clinicalcraft cases verify acute-appendicitis`. The solution path
covers:
- focused history, then the abdominal and peritonism examination;
- IV access, nil by mouth, morphine, ondansetron and fluids by minute 29;
- the supportive-care decision, then orders for FBC, CRP, U&E and
  urinalysis;
- the rest of the history (including pre-operative questions and ICE), then
  the special signs and pertinent negatives;
- the imaging decision (US), the US order and paracetamol;
- advancing 45 min, then reading the results;
- the diagnosis, antibiotics, surgical consult, consent, the definitive
  decision, laparoscopic appendectomy and finish.

The verify run finishes at simulated minute 120 (04:15). Every intervention
is `indicated`, with no rejections and no alarms, and the deterministic
rubric scores 25/25.

Replayed wrong paths:

| Path | Score |
|---|---|
| Dawdling 5 h, then finishing the standard pathway (perforation fired) | 72 % |
| Theatre booked before surgical review and consent | 80 % |
| Antibiotics-first without a CT | 80 % (`r-mx-abx`, `r-safety`) |
| Meropenem instead of a narrow pre-operative regimen | 92 % (`r-mx-abx` only) |
| Guessing the diagnosis | 92 % (loses `r-dx` only) |
| Guessing the definitive plan (antibiotics-first, then laparoscopy) | 92 % (loses `r-mx-definitive` only) |
| CT instead of ultrasound | 92 % (loses `r-inv-us-first` only; nothing "essential missing") |
| Skipping the urinalysis or the testicular history and examination | cannot finish; the diagnosis decision stays locked |

## Matcher notes (`extensions.testUtterances`)

All 75 positive utterances (38 zh-CN, 37 en) rank an expected history item first, at or above the 0.55 selection score. Three negatives with `expect: []` (最近压力大吗？, 你喜欢看什么电影？, "Which football team do you support?") select nothing, so the patient falls back to `fallbackUnknown`.
They include 28 colloquial, typo and abbreviation paraphrases (拉稀没有,
尿尿疼不疼, 恶新想吐不, 输过血没, "any n/v?", "NKDA?", "any alergies",
"When did u last drink water", "Any pain in your penis?").

Authoring lessons for the offline matcher, all applied here:
- **English stop words.** "how", "when", "where", "what", "it", "any",
  "only" and "off" are dropped, so "how long", "where did it begin" or "off
  your food" reduce to one generic token ("long", "begin", "food") that
  matches unrelated questions. Such phrases are written unspaced and start
  with a stop word (`howlong`, `wherediditbegin`, `offyourfood`), so they
  match only by compact containment.
- **Prefix rule.** An unspaced keyword must not *start* with a content word
  of 4 or more letters. "feellike", "sincewhen", "passedout" and
  "whatisitlike" are prefix-matched by "feel", "since", "pass" and "whats".
- **Generic stems.** Avoid keywords that stem to everyday tokens: "testes"
  becomes "test" (matching "blood tests" and "psoas test"), "discharge"
  revealed the `specific` sexual-history item on "discharge you home", and
  "how much pain" and "painkillers" matched every "pain" question.
- **Chinese keywords.** A keyword of 3 characters whose 2-character core is an
  everyday word (拉肚子, 怎么了, 一直疼, 住在哪, 什么病) scores 0.67, above
  the 0.55 selection threshold, on any utterance containing that word. Use
  4 or more characters. Note also 性病 ⊂ 慢性病.
- **excludeKeywords.** These separate onset from site, contacts from bowels,
  family from personal history, and identity from weight loss.
- **Prefix collisions found in the third review** (an utterance token of ≥ 4
  letters prefixes a one-token keyword of another item and scores 1.0):
  - test → testis/testicle (blood tests);
  - part → partner (the `specific` sexual-history item, on "which part hurts?");
  - peni(s) → penicillin;
  - press → prescrib(ed);
  - water → waterworks;
  - heart → heartburn;
  - head → headache;
  - flat → flatus;
  - side → "which side".

  They are handled with `excludeKeywords` or by rewording the keyword.
- **Substring containment.** A one-word keyword of ≥ 4 letters scores 0.9
  whenever it appears *inside* another word: "ease" ⊂ please/disease, and
  "operation" ⊂ cooperation.
- **Stop words also hide inside phrases.** "done", "like" and "on" are stop
  words, so "tests done" is the single token "test"; use unspaced forms
  that start with a stop word ("anytestsdone", "thepainlike", "onyourmind").
- **Chinese generic cores** add to the list above: 怕什么 (什么), 吐了吗 (了吗)
  and 还有什么问题 (5/6 = 0.83 on any 有什么问题 sentence).

On 313 paraphrases the patient pipeline's select step picks the expected
fact 98 % of the time, with no extra fact 96 % of the time (before the
second review: 73 % and 66 %). The third review measured recall@3 on four
fresh held-out sets *before* tuning on each: 0.903, 0.912, 0.910 and 0.881
for the committed case (0.88–0.92 on unseen paraphrases). After tuning, all
313 + 313 probes reach 1.000. 36 bedside statements ("lie flat",
"press here", "we need some blood tests", "which part of your tummy hurts")
no longer select a `specific` or `unknown` fact.

## Guideline references

- Di Saverio S, et al. Diagnosis and treatment of acute appendicitis: 2020 update of the WSES Jerusalem guidelines. *World J Emerg Surg.* 2020;15:27.
- Gorter RR, et al. Diagnosis and management of acute appendicitis. EAES consensus development conference 2015. *Surg Endosc.* 2016;30:4668–4690.
- Expert Panel on Gastrointestinal Imaging. ACR Appropriateness Criteria® Right Lower Quadrant Pain: 2022 Update. *J Am Coll Radiol.* 2022;19(11S):S445–S461.
- Kumar SS, Collings AT, Lamm R, et al. SAGES guideline for the diagnosis and treatment of appendicitis. *Surg Endosc.* 2024.
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
