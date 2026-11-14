# cmcr-859819 — Fever and cough in the second trimester · 25-year-old woman

> **Spoilers for facilitators and case authors.** This guide names the diagnosis. Learners open the case from the
> case library, where the title, summary and tags give nothing away.

**Published-case review — 已发表病例改写.** Adapted from a case report in a Chinese Medical Association journal
(the CMCR collection). The patient (许女士 / Ms Xu) and her husband (卞磊 / Bian Lei) are pseudonyms; the hospital,
city, calendar dates and public-health agencies are removed and time is given as relative illness days. The original
article remains the authority for the historical facts. It is not medical advice and does not replace local protocols
or current guidelines.

## Case card

| | |
|---|---|
| id / version | `cmcr-859819` / `1.1.1` |
| setting / facility | `inpatient` (respiratory ward → ICU) / `general-hospital` |
| specialty | respiratory medicine, critical care, obstetrics, infectious diseases |
| difficulty / estimated time | 4 / 5 · ~35 min (static clock; historical review) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` (2026-10-28): AI-assisted authoring and editorial review against the guidance under References; **not yet reviewed by a licensed clinician** — have a respiratory, intensive care or infectious-diseases physician review it before teaching use |
| phases | `initial` (presentation & history) → `workup` (rapid deterioration & key decisions; `location` ICU; learner-switchable) → `followup` (reported treatment & outcome; opens after all four decisions and objectives 1–2; not learner-switchable) |
| clock | static (historical review; no physiology model) |
| content | 14 history items, 5 exam findings, 8 investigations, 13 interventions, 4 decisions, 10 rubric items (9 deterministic + 1 examiner-judged), 6 learning outcomes, 5 objectives, 38 matcher test utterances |

## Learning outcomes

After the case the learner can:

1. Start empirical neuraminidase-inhibitor treatment (oseltamivir) for suspected severe novel influenza A, including
   avian influenza, **before confirmation and in pregnancy** (CDC novel influenza A interim guidance; IDSA 2018).
2. Take a targeted exposure history (live-poultry markets, a family poultry trade) to recognise the epidemiology of
   human avian influenza.
3. Recognise non-invasive-ventilation failure and severe ARDS, and switch promptly to invasive lung-protective
   ventilation (tidal volume about 6 mL/kg).
4. Apply prone positioning for severe ARDS per ESICM 2023 and ATS 2024, and set the report's high-pressure recruitment
   manoeuvres against current recommendations.
5. State the evidence on and the controversy over corticosteroids and immunomodulators (immunoglobulin, thymosin) in
   severe influenza.
6. Start respiratory isolation and public-health notification, and coordinate maternal-fetal care with obstetrics.

These are distinct from the five HUD objectives (the in-game task list, below).

## Clinical summary

**Diagnosis (hidden from the learner).** Human **H7N9 avian influenza in pregnancy** (about 22 weeks) complicated by
**severe hypoxaemic respiratory failure / ARDS** (Berlin definition, oxygenation index < 100 mmHg).

**Presentation.** A 25-year-old housewife, previously well, just over 22 weeks pregnant by amenorrhoea (an ultrasound
had confirmed a second-trimester pregnancy), with a week of cough, white sticky sputum and fever to 40.2 °C, limb aches
and a sore throat. She lives next to an urban farmers' market where her parents sell poultry and her parents-in-law
sell pork. On admission: T 39.9 °C, flushed and febrile, coarse breath sounds without crackles; WBC 7.9 ×10⁹/L with a
neutrophil fraction of 0.84. Ceftriaxone and oxygen were started.

**Course.** Within about 10 hours she developed chest tightness and respiratory distress (RR up to 50/min, scattered
crackles); on mask oxygen the oxygenation index was only 42 mmHg. She was moved to intensive care (APACHE II 23,
oxygenation index 39 mmHg). One hour of non-invasive ventilation did not help, so she was intubated for lung-protective
ventilation (tidal volume ~6 mL/kg) with intermittent sustained-inflation recruitment, and proned on illness days 8–13.
Oseltamivir 150 mg via NG tube every 12 hours was started **before** the H7N9 nucleic-acid test confirmed the diagnosis
(at about illness day 10), together with immunoglobulin, thymosin α1 and enteral nutrition. On day 10 she became
hypotensive (83/53 mmHg) with pulmonary oedema, treated with albumin, furosemide and a short methylprednisolone course.
She was extubated on day 20 and delivered a healthy 3.3 kg girl by caesarean at just over 38 weeks (about illness day
110); mother and infant were well.

## Scenario timeline and physiology

This is a **static, staged historical review**, not a continuous physiological model (`clock.mode: "static"`, no
`physiology` block). Vital signs are recorded as exam findings, not a monitored trend.

* **`initial` (respiratory ward).** The week of fever and cough, the pregnancy, the poultry exposure and household,
  the admission ceftriaxone and oxygen; T 39.9 °C, coarse breath sounds. The patient answers for herself (breathless).
* **`workup` (ICU; `location: {setting: "icu"}`).** The deterioration within 10 hours, intubation and the key
  decisions. The chest film is a **portable bedside** film (`performedAt: "bedside"`); the blood gas, blood count and
  H7N9 nucleic-acid test are sampled at the bedside. Once she is intubated she cannot speak
  (`patient.nonVerbalWhen: {phase: "workup"}`, in the annotation file): her husband gives the deterioration history.
* **`followup` (record review).** The treatment, the day-10 shock, the extubation and the maternal-infant outcome,
  the public-health findings and the serial imaging — all **chart reviews** (`requires: ["records"]`;
  `performedAt: "records"` in the annotation file). Opens only after all four decisions and the history/exam
  objectives are done, so the outcome never pre-empts the reasoning.

## Decisions and assessment

**Objectives (chapters).** `objective-1` (history: presentation, associated symptoms, gestation, exposure) →
`objective-2` (exam: appearance, chest) → `objective-3` (**act before confirmation**: the empirical-antiviral decision)
→ `objective-4` (diagnosis and respiratory support decided) → `objective-5` (adjuncts decided and the follow-up record
read). Hints coach without naming a correct option.

**Decisions.**

* **`empirical-antiviral`** (select-all; **safety**) unlocks on `asked: exposure` **and** the oxygenation and chest
  film read — **not** on the nucleic-acid test. The four correct actions are: start oseltamivir now without waiting
  for the PCR; isolate and notify public health; send respiratory specimens for H7N9 testing; arrange critical-care
  review. The distractors are "continue ceftriaxone and wait for the PCR before antivirals" and "withhold oseltamivir
  because of the pregnancy". This is the case's restored first lesson (the audit's S1): the reference path answers it
  **before** the PCR is read.
* **`diagnosis`** (single) unlocks after the PCR, oxygenation and chest film are read: H7N9 with severe hypoxaemic
  respiratory failure / ARDS, against severe bacterial CAP alone, pulmonary oedema of pregnancy, and an uncomplicated
  URTI.
* **`respiratory-support`** (single) unlocks after the oxygenation result and the empirical decision: switch to
  invasive lung-protective ventilation (~6 mL/kg) and consider proning, against continuing NIV, large tidal volumes,
  or high-flow nasal oxygen alone.
* **`ards-adjuncts`** (single) unlocks after the diagnosis and respiratory-support decisions: prone positioning,
  lung-protective ventilation, conservative fluids, VV-ECMO referral if refractory and obstetric coordination —
  avoiding routine high-pressure recruitment, immunoglobulin/thymosin as proven therapy, and routine high-dose
  corticosteroids.

Every option carries its own bilingual feedback. Decisions are scored on first-attempt accuracy (`decidedFirstTry`).

**Rubric** (deterministic total 16; one examiner-judged communication item). Safety weighs most.

| Item | Domain | Weight | Met when |
|---|---|---|---|
| `r-hx` | history | 2 | presentation, associated symptoms, gestation and exposure asked |
| `r-exam` | examination | 1 | appearance, chest and the deterioration chest examined |
| `r-specimens` | investigations | 1 | respiratory specimens sent for H7N9 testing (`ordered: pcr`) |
| `r-oxygenation` | investigations | 1 | the oxygenation result and the chest film read |
| `r-empirical` | safety | **3** | `decidedFirstTry: empirical-antiviral` (empirical antivirals before confirmation) |
| `r-diagnosis` | diagnosis | 2 | `decidedFirstTry: diagnosis` |
| `r-support` | management | 2 | `decidedFirstTry: respiratory-support` |
| `r-adjuncts` | management | 2 | `decidedFirstTry: ards-adjuncts` |
| `r-safety-rm` | safety | 2 | did **not** apply the prolonged high-pressure recruitment manoeuvre (`not intervened: recruitment`) — counted only once management is engaged (`scoredWhen`, annotation file; `critical`) |
| `r-comm` | communication | 1 (judged) | isolation/severity explained to the family; maternal-fetal care coordinated with obstetrics; single-case limits stated honestly |

**How wrong choices score.** The reference path scores 16/16. A wrong first answer on a decision loses that decision's
`decidedFirstTry` item (3 for `empirical-antiviral`, 2 each for `diagnosis`, `respiratory-support`, `ards-adjuncts`);
answering correctly only after a wrong attempt does not restore it. Applying the prolonged high-pressure recruitment
manoeuvre (`recruitment`) is flagged **contraindicated** (shown in the debrief's safety list) and loses `r-safety-rm`
(2). `high-dose-steroid` is also contraindicated-as-routine. `ivig` and `thymosin` are selectable with educational
feedback (not scored as harm; tested through the `ards-adjuncts` decision). `r-safety-rm` is a harm-avoidance item, so
it is counted only once the learner has engaged management (decided the adjuncts or started oseltamivir) — doing
nothing does not earn it.

## Reference path (`solution`)

51 steps, finishing with 5/5 objectives, 4/4 decisions and 16/16, no rejection and no contraindicated intervention, in
both clinical and in-world mode. History (presentation, associated symptoms, gestation, exposure, occupation,
admission treatment, past history, smoking, allergies, family, alcohol, supplements, concerns) → exam (appearance,
vitals, chest) → **enter `workup`** (she is moved to ICU) → deterioration history (husband) and exam → order and read
the oxygenation and the portable chest film → **answer `empirical-antiviral` (before the PCR)** → give mask oxygen,
oseltamivir and isolation → order and read the PCR, blood count and obstetric record → answer `diagnosis` → trial NIV,
then intubate → answer `respiratory-support` → prone, conservative fluids, enteral nutrition, obstetric consult →
answer `ards-adjuncts` → **`followup` opens** → read the public-health, serial-imaging and treatment records → finish.

## Clinical numbers check

| Item | Value | Working / note |
|---|---|---|
| Oxygenation index (PaO₂/FiO₂) | 42 → 39 mmHg | < 100 mmHg = **severe** ARDS (Berlin definition); the case keeps the report's index values, not reconstructed PaO₂/FiO₂ |
| APACHE II | 23 | recorded at ICU admission (high) |
| Gestation | 22 weeks + 6 days | second trimester (13–27 weeks); by amenorrhoea, ultrasound confirmed the trimester |
| Blood count inconsistency | kept, labelled | 0.84 × 7.9 ≈ 6.6 ×10⁹/L neutrophils + 2.8 ×10⁹/L lymphocytes = 9.4 > the WBC of 7.9 ×10⁹/L; the report gives no explanation |
| Oseltamivir | 150 mg q12h × 7 days (NG) | double the standard 75 mg BID; a randomised trial (BMJ 2013) found no added benefit of double-dose in severe influenza; CDC: longer courses (e.g. 10 days) may be considered for severely ill hospitalised patients |
| Prone positioning | 4–6 h/session, twice daily, days 8–13 | PROSEVA used ≥ 16 h sessions with an oxygenation index < 150 mmHg (28-day mortality 16% vs 32.8%) |
| Recruitment | PEEP 30 cmH₂O held 30 s | ESICM 2023 strong recommendation against prolonged high-pressure recruitment; ATS 2024 strong against prolonged manoeuvres |
| Corticosteroid (day-10 shock) | methylprednisolone 200 mg then 120 mg/day × 2 d | 200 mg (day 1) exceeds the > 150 mg/day high-dose threshold linked to harm in H7N9 (Cao 2016); 120 mg/day is within the 25–150 mg low-moderate band |
| Delivery | illness day ~110, 38 weeks + 4 days, caesarean, 3.3 kg girl | mother and infant well |

Units: SI throughout; oxygenation index and APACHE II as the report records them; 1 mmHg ≈ 0.133 kPa.

## Facilitator notes

**Debrief questions (PEARLS order).**

1. *Reactions* — "How did it feel to start an antiviral before you had a confirmed diagnosis?"
2. *Description* — "Summarise her in two sentences: what was the illness, and what made this a maternal emergency?"
3. *Analysis*
   - "When did the indication for oseltamivir become clear — and what told you not to wait for the PCR?"
   - "An hour of NIV didn't help. How did you decide it had failed, and what did you change?"
   - "The report used sustained-inflation recruitment and prone positioning. Which does current guidance support, and
     which does it advise against — and why?"
   - "Where do corticosteroids, immunoglobulin and thymosin fit here — proven therapy, or adjuncts of uncertain value?"
   - "What did you tell her family about isolation and about the baby?"
4. *Summary* — "What three things would you do in the first hour for the next pregnant patient with suspected avian
   influenza?"

**Common learner errors and how the case surfaces them.**

| Error | How the case surfaces it |
|---|---|
| Waiting for the PCR before antivirals | `empirical-antiviral` option "wait-for-pcr" is wrong; the correct path answers before the PCR is read; `r-empirical` (weight 3) |
| Withholding oseltamivir in pregnancy | `empirical-antiviral` option "withhold-pregnancy" is wrong, with CDC/IDSA feedback |
| Not taking a poultry-exposure history | the exposure item gates `empirical-antiviral` and `diagnosis`; `r-hx` |
| Persisting with NIV after it has failed | `respiratory-support` option "continue-niv" is wrong |
| Large tidal volumes to fix the hypoxaemia | `respiratory-support` option "high-tidal" is wrong (lung-protective ~6 mL/kg) |
| Routine high-pressure recruitment | `recruitment` is contraindicated; `r-safety-rm` |
| Treating immunoglobulin/thymosin/high-dose steroids as proven | `ards-adjuncts` options "ivig-thymosin" and "highdose-steroid-routine" are wrong, with IDSA 2018 / WHO 2024 / Cao 2016 feedback |

**Teaching notes.**

* The whole point of the restored `empirical-antiviral` decision is the report's own first lesson: oseltamivir was
  started before confirmation. Keep the debrief on *timing*, not just drug choice.
* Historical practice vs current guidance: the report used a sustained-inflation recruitment manoeuvre (now advised
  against), prone positioning (now strongly recommended, though for longer sessions), and immunomodulators and a short
  steroid course (now unsupported or contentious). The follow-up record states what the team did; the decisions and
  debrief teach what current guidance recommends.
* The blood-count inconsistency is a real contradiction in the source and is kept, labelled — a chance to discuss not
  "correcting" a published record.

## Embodied mode

**Grounding (world policy).** The portable chest film is `performedAt: "bedside"` (nobody is moved for it); the blood
gas, blood count and H7N9 nucleic-acid test are sampled at the patient and read at a records terminal. The obstetric
scan, the public-health record, the serial imaging and the treatment/outcome record are **chart reviews**
(`requires: ["records"]`), read at a records terminal — never a device. IV items (immunoglobulin, high-dose steroids,
albumin/furosemide) take `iv-access`; she arrives on an IV ceftriaxone infusion, so
`extensions.embodied.ivAccessInSitu: true` (no cannulation procedure is needed before them). The oxygen item names its
`device` (`simple-mask`).

**Where the patient goes.** Entering `workup` moves her to an ICU bed (`phases[workup].location: {setting: "icu"}`);
the team relocation is not charged. The portable film and the bedside samples are done where she is.

**Scope of practice.** Intubation and invasive ventilation, and the recruitment manoeuvre, are medical acts
(`scope: "medical"`); oxygen, prone positioning, monitoring and NG oseltamivir are within nursing scope.

**Measured (offline autopilot, 2026-10-28).** `general-hospital`, en: 16/16 (100 %), 5/5 objectives, no contraindicated
intervention; clinical and in-world mode give the same score (static clock, 0 simulated minutes).

## Source and adaptation

* **Source and adaptation.**
  * *From the report:* age, sex, gestation, the poultry exposure and household, the admission exam and blood count,
    the oxygenation indices and APACHE II, the ventilation strategy, every drug and dose, the day-10 shock episode, the
    nucleic-acid testing and dates, the environmental positives and the 18 monitored contacts, the extubation and the
    maternal-infant outcome.
  * *Adapted for teaching:* the staged phases, the four decisions and the rubric are an educational framing; the
    `empirical-antiviral` decision restores the report's first lesson (its 1.0.0 only "assessed" antivirals after
    confirmation). A companion (her husband, 卞磊 / Bian Lei) is added as a teaching device so the deterioration
    history can be taken while she is intubated; the report records no companion.
  * *Labelled contradictions:* the blood count differential is internally inconsistent (kept uncorrected, with the
    arithmetic shown). The oseltamivir course is given as "7 days" in the body but "continued until viral tests were
    negative" in the discussion — both are kept and flagged (`followup` note, debrief boundaries); by the report's own
    dates a 7-day course from about day 8 would end before the first negative tests at about day 17.
  * *Figures used / moved:* `fig01` is the source's eight-panel composite (chest radiographs on illness days 8, 9, 10,
    12 and chest CT on days 15, 18, 23, 30 — the recovery). In 1.0.0 it was shown in the work-up phase as "the day-8
    film", which revealed the course before the decisions. It is **moved** to a `followup` serial-imaging record and
    retitled "serial chest radiographs and CT, illness days 8–30 (includes recovery)". The figure was viewed: it
    carries only panel numbers and the publisher's watermark, no burned-in identifier; the ECG leads visible on the
    films are consistent with portable ICU radiographs. The source PDF is kept for post-case review.
* No continuous physiology: vitals are recorded findings, not a monitored trend, and the deterioration is staged, not
  modelled.
* Fetal-monitoring values, the immunological results, the sputum-smear-guided antibiotic choice and long-term infant
  development are not recorded and are kept unknown.
* VV-ECMO is named in the `ards-adjuncts` option as current guidance for refractory cases; the report did not use it.

## Matcher notes

* `occupation` excludes 家禽/活禽/鸡鸭 (poultry) so "家里人是做什么的 / what do your parents do?" reaches the household
  item, not `exposure`; `medications` excludes 过敏 / allerg so allergy questions reach `allergies`; `pmh` excludes
  家里/家族/父母 so a family question stays `family-history`.
* English keywords that would reduce to a single everyday token are written run-together (`howmanydays`,
  `howmanyweeks`, `overthecounter`, `whatbringsyouin`, `feverandcough`, `othermedicines`, `doyousmoke`).
* `progression` is a `workup`-phase item voiced by the husband (she is intubated); its utterances use ward-time
  phrasings.
* All 38 test utterances select their intended history item under the patient pipeline's ≥ 0.55 rule.

## References

The case's `debrief.references` (one Vancouver string each). DOIs were verified on 2026-10-28 by web search, each
returning the publisher's, PubMed's or the journal's record for that DOI with matching title, journal, volume and pages
(the Crossref API, doi.org, PubMed E-utilities and rs.yiigle.com were not reachable from the editing session). The
source DOI matches the DOI printed in the source PDF. No DOI is given where none could be verified this session.

1. 颜骏, 吉木森, 刘竞, 孔宪如, 胡秀兰, 杨宏锋, 等. 妊娠合并H7N9禽流感一例. 中华结核和呼吸杂志. 2014;37(2):139-140.
   doi:10.3760/cma.j.issn.1001-0939.2014.02.021 (DOI printed in the source PDF)
2. https://rs.yiigle.com/cmaid/859819 (the collection's article URL)
3. Centers for Disease Control and Prevention. Interim guidance on the use of antiviral medications for treatment of
   human infections with novel influenza A viruses associated with severe human disease. Atlanta: CDC.
   https://www.cdc.gov/bird-flu/hcp/clinicians-evaluating-patients/interim-guidance-treatment-humans.html
   (accessed 2026-10-28).
4. Uyeki TM, Bernstein HH, Bradley JS, et al. Clinical practice guidelines by the Infectious Diseases Society of
   America: 2018 update on diagnosis, treatment, chemoprophylaxis, and institutional outbreak management of seasonal
   influenza. Clin Infect Dis. 2019;68(6):e1-e47. doi:10.1093/cid/ciy866
5. World Health Organization. Clinical practice guidelines for influenza. Geneva: WHO; 2024.
6. 国家卫生健康委员会办公厅, 国家中医药管理局综合司. 人感染禽流感诊疗方案（2024年版）. 北京; 2024.
7. Grasselli G, Calfee CS, Camporota L, et al. ESICM guidelines on acute respiratory distress syndrome: definition,
   phenotyping and respiratory support strategies. Intensive Care Med. 2023;49(7):727-759.
   doi:10.1007/s00134-023-07050-7
8. Qadir N, Sahetya S, Munshi L, et al. An update on management of adult patients with acute respiratory distress
   syndrome: an official American Thoracic Society clinical practice guideline. Am J Respir Crit Care Med.
   2024;209(1):24-36. doi:10.1164/rccm.202311-2011ST
9. Guérin C, Reignier J, Richard JC, et al. Prone positioning in severe acute respiratory distress syndrome. N Engl J
   Med. 2013;368(23):2159-2168. doi:10.1056/NEJMoa1214103
10. Cao B, Gao H, Zhou B, et al. Adjuvant corticosteroid treatment in adults with influenza A (H7N9) viral pneumonia.
    Crit Care Med. 2016;44(6):e318-e328. doi:10.1097/CCM.0000000000001616
11. South East Asia Infectious Disease Clinical Research Network. Effect of double dose oseltamivir on clinical and
    virological outcomes in children and adults admitted to hospital with severe influenza: double blind randomised
    controlled trial. BMJ. 2013;346:f3039. doi:10.1136/bmj.f3039
12. ARDS Definition Task Force; Ranieri VM, Rubenfeld GD, Thompson BT, et al. Acute respiratory distress syndrome: the
    Berlin definition. JAMA. 2012;307(23):2526-2533.

### To verify

- **CDC obstetric antiviral page** — the lay teaching point that oseltamivir is preferred in pregnancy and started
  without waiting for test results is taken from the CDC obstetric antiviral guidance; the current page's exact
  wording and date were not confirmed from the editing session (host not reachable), so it is cited through the
  general CDC interim guidance rather than as a separate reference.
- **人感染禽流感诊疗方案（2024年版）** — issued 29 July 2024 by the NHC and the National Administration of Traditional
  Chinese Medicine, superseding the 2017 H7N9 edition; its specific antiviral dose/duration and corticosteroid wording
  were not confirmed online, so the case cites it only in general terms.
- **Berlin ARDS definition (JAMA 2012)** — the citation is from the source's own reference list; its DOI was not
  verified this session, so it is cited without a DOI.
- **WHO 2024 influenza** — the conditional recommendations (for oseltamivir in severe illness; against corticosteroids
  and passive immune therapy) were confirmed through secondary summaries; the volume/report number was not retrieved.

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

- **Options rebalanced so the key is not cued by length.** The keyed option was the uniquely longest in all three
  single-best decisions in both languages (1.3–3.1 times the mean length of the other options); now it is in none
  (0.84–1.07). The `diagnosis` key now names the evidence it integrates (poultry exposure, a positive H7N9 test,
  bilateral opacities, severe hypoxaemia); each distractor now says why it tempts: bacterial pneumonia with air
  bronchograms, the poultry market dismissed as a common exposure; pulmonary oedema from the blood volume of
  pregnancy; an upper respiratory infection in a previously well woman; staying on NIV to spare her and the fetus
  sedation and invasive ventilation; large tidal volumes because the oxygenation index stays below 100 mmHg; high-flow
  nasal oxygen to avoid intubation in pregnancy; routine recruitment to reopen the lung before proning; immunoglobulin
  and thymosin to boost immunity in pregnancy; high-dose steroids citing ATS 2024. In the select-all
  `empirical-antiviral` decision, "withhold oseltamivir because of the pregnancy" now gives its reason (fetal safety
  at 22 weeks). Medical meaning, correct flags, scoring and the reference path are unchanged; the feedback of
  `bacterial-cap` and `continue-niv` now also answers the reason its text gives.
- **Option ids neutral:** every id already names its content; none renamed.
- Checked on 2026-10-30: see Validation.

### 1.1.0 — 2026-10-28 (editorial revision)

Substantive changes from PR #3's 1.0.0:

- **Restored the report's first lesson (audit S1).** Added the `empirical-antiviral` select-all decision, unlocked by
  the exposure history and the oxygenation and chest-film results — **not** the nucleic-acid test — so the time-critical
  step (start oseltamivir before confirmation; isolate; send specimens; arrange ICU review) is taught and scored
  (`r-empirical`, weight 3). The reference path answers it before reading the PCR. 1.0.0's only management decision
  unlocked after the PCR and merely "assessed" antivirals.
- **Restored source facts.** Occupation and household (housewife; parents sell poultry at the market; in-laws sell
  pork); the public-health findings (H7N9 in cages and droppings; 18 monitored contacts, all afebrile); the full
  treatment and outcome record (lung-protective ventilation, prone positioning days 8–13, oseltamivir 150 mg NG q12h
  × 7 days, immunoglobulin, thymosin α1, enteral nutrition, the day-10 shock with albumin/furosemide/methylprednisolone,
  the oxygenation trajectory, extubation on day 20, delivery at ~day 110); APACHE II 23 and the NIV→invasive switch;
  blood count with units and reference ranges. 1.0.0 marked occupation, household and family as "not recorded" although
  they are recorded.
- **Moved the spoiler figure.** `fig01` (the eight-panel composite over illness days 8–30, the recovery) moved from the
  work-up chest X-ray to a `followup` serial-imaging record and retitled; the work-up chest film is now text only and
  `performedAt: "bedside"`.
- **Phases and embodiment.** `workup` gains `location: {setting: "icu"}`; the chest film is a bedside portable film;
  record reviews use `requires: ["records"]`; `ivAccessInSitu` set (she arrives on IV ceftriaxone).
- **Decisions, interventions, rubric.** Four decisions (empirical antivirals, diagnosis, respiratory support, ARDS
  adjuncts) each with per-option feedback and plausible distractors including the report's own choices; 13 interventions
  (oxygen, NIV, intubation and lung-protective ventilation, prone positioning, recruitment [contraindicated],
  oseltamivir, isolation, immunoglobulin, thymosin, high-dose steroids [contraindicated], conservative fluids, enteral
  nutrition, obstetric consult); a 10-item rubric with two safety items and an examiner-judged communication item,
  decisions scored `decidedFirstTry`. 1.0.0 had 2 decisions with identical per-option feedback, a 4-item rubric with no
  safety or communication item, and 0 interventions.
- **Register.** First-person lay patient and companion speech replacing chart-register answers; `fallbackUnknown` in
  the library's first-person form; "second trimester" for 孕中期. Persona `affect` set to `breathless`.
- **Teaching layer.** 6 learning outcomes, 6 teaching points (each naming its guidance and setting historical practice
  against current recommendations), key reasoning and honest boundaries/unknowns; Vancouver references with verified
  DOIs; `provenance.review` (editorial); 38 paraphrased test utterances. Difficulty 4; estimated time 25 → 35 min.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-859819/case.json --strict
npm run -s cc -- cases verify cmcr-859819
npm run -s cc -- exec --case cmcr-859819 --autopilot --approval bypass --provider offline --output-format json
npm run -s cc -- exec --case cmcr-859819 --autopilot --approval bypass --provider offline --embodied --output-format json
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-859819
```

On 2026-10-28 (version 1.1.0): validate 0 errors, 0 warnings; verify passes — 51 steps, objectives 5/5, decisions 4/4,
38/38 matcher test utterances; the reference path scores 16/16 with no rejection and no contraindicated intervention in
both clinical and in-world mode; the collection contract test for this case passes.

On 2026-10-30 (version 1.1.1): `cases validate --strict` 0 errors, 0 warnings; `cases verify` passes — 51 steps,
objectives 5/5, decisions 4/4, utterances 38/38, rubric 16/16 (100 %).

## 中文摘要

**病例概要。** 25岁家庭主妇，孕22周余，平素健康。咳嗽、咳痰、发热1周（最高40.2℃），伴四肢酸痛、咽痛。居住在农贸市场旁，其
父母在市场卖家禽，公婆卖猪肉。入院体温39.9℃，热病容，双肺呼吸音粗；白细胞 7.9×10⁹/L、中性粒细胞比例 0.84。予头孢曲松加吸氧
后约10小时内呼吸急转直下（呼吸最快50次/分），面罩吸氧氧合指数仅 42 mmHg，转入重症监护（APACHE Ⅱ 23分，氧合指数 39 mmHg）。
诊断为**人感染H7N9禽流感合并重度低氧性呼吸衰竭/急性呼吸窘迫综合征**。无创通气1小时无改善即改有创肺保护性通气，第8–13病日俯卧位，
确诊前即给予奥司他韦 150 mg 鼻饲每12小时一次，另用免疫球蛋白、胸腺肽α1、肠内营养；第10病日休克经白蛋白、呋塞米及短程甲泼尼龙处理
后稳定；第20病日拔管，约第110病日（孕38周余）剖宫产娩出健康女婴，母女均体健。

**学习目标。** ①怀疑新型甲型流感（含禽流感）重症时，于确诊前即经验性开始奥司他韦，妊娠期亦然；②采集针对性暴露史（活禽市场、家庭
家禽贸易）；③识别无创通气失败与重度急性呼吸窘迫综合征并及时改有创肺保护性通气；④按 ESICM 2023/ATS 2024 实施俯卧位，并将原报告
高压肺复张手法与当前推荐对照；⑤说明激素与免疫调节剂在重症流感中的证据与争议；⑥启动呼吸道隔离与上报，并与产科协同管理母胎。

**关键决策。** 经验性抗病毒（核酸未回报即给药、隔离、送检、请重症评估；不等核酸、不因妊娠停药）；诊断（H7N9合并重度急性呼吸窘迫
综合征）；呼吸支持（无创失败后及时有创肺保护性通气并俯卧位）；辅助治疗（俯卧位、肺保护性通气、保守液体、难治转诊体外膜肺；避免常规
高压肺复张、免疫球蛋白/胸腺肽作为确证治疗、常规大剂量激素）。评分：确定性总分16分，经验性抗病毒权重最高（3分，安全项），决策按
首次作答正确计分，另有1项由考官评判的沟通项。

**复盘要点（PEARLS）。** 先谈在未确诊时启动抗病毒的感受；用两句话概括病情与母体危急的原因；分析围绕：何时确立抗病毒指征、为何不等
核酸；无创通气失败的判断与改有创的时机；原报告的肺复张（当前不推荐）与俯卧位（强推荐但时程更长）之分歧；激素、免疫球蛋白、胸腺肽的
证据定位；如何向家属交代隔离与胎儿安全。历史处置仅作记录，不等于当前推荐；合并多药的单例不能证明某一辅助药物的独立疗效。
