# cmcr-1653413 — Acute worsening of longstanding breathlessness · 74-year-old man

> **Spoilers for facilitators and case authors.** This guide names the diagnosis. Learners open the case from the
> case library, where the title, summary and tags give nothing away.

**Published-case review — 已发表病例改写.** Adapted from a case report (a traditional-Chinese-medicine column) in a
Chinese Medical Association journal (the CMCR collection). The source is in traditional characters; this case uses
simplified characters. The patient (蒋先生 / Mr Jiang) and his son (蒋文斌 / Jiang Wenbin) are pseudonyms; the hospital,
city and calendar dates are removed and time is given relatively. The original article remains the authority for the
historical facts. The herbal prescription is recorded only — not endorsed for efficacy or safety. It is not medical
advice and does not replace local protocols or current guidelines.

## Case card

| | |
|---|---|
| id / version | `cmcr-1653413` / `1.1.0` |
| setting / facility | `inpatient` (respiratory unit) / `general-hospital` |
| specialty | respiratory medicine, critical care, traditional Chinese medicine |
| difficulty / estimated time | 4 / 5 · ~35 min (static clock; historical review) |
| languages | `zh-CN` (source language, simplified), `en` |
| review status | `editorial` (2026-10-28): AI-assisted authoring and editorial review against the guidance under References; **not yet reviewed by a licensed clinician** — have a respiratory, intensive care or traditional-Chinese-medicine physician review it before teaching use |
| phases | `initial` (presentation & history) → `workup` (deterioration within hours & key decisions; learner-switchable) → `followup` (reported treatment & outcome; opens after all four decisions and objectives 1–2; not learner-switchable) |
| clock | static (historical review; no physiology model) |
| content | 14 history items, 6 exam findings, 6 investigations, 9 interventions, 4 decisions, 10 rubric items (9 deterministic + 1 examiner-judged), 5 learning outcomes, 5 objectives, 36 matcher test utterances |

## Learning outcomes

After the case the learner can:

1. Interpret serial blood gases to recognise acute-on-chronic hypercapnic respiratory failure and
   non-invasive-ventilation failure.
2. Assess suspected **acute exacerbation of IPF (AE-IPF)** by the 2016 International Working Group framework, and search
   for other reversible contributors.
3. Distinguish airway colonisation from invasive fungal disease (EORTC/MSGERC 2020) and interpret a sputum culture with
   caution.
4. Hold a goals-of-care discussion before escalation in AE-IPF.
5. Recognise aconite (processed aconite / 黑顺片) toxicity and medication safety, and state the limits of single-case
   attribution under multiple concurrent treatments.

These are distinct from the five HUD objectives (the in-game task list, below).

## Clinical summary

**Diagnosis (hidden from the learner).** A 74-year-old man with **9 years of idiopathic pulmonary fibrosis (IPF)** on
pirfenidone who, within hours of admission, develops **acute-on-chronic hypercapnic respiratory failure** —
**acute exacerbation of IPF (AE-IPF) with superimposed infection**. The report's Western diagnoses were IPF, fungal
pneumonia, bronchial asthma, type 2 respiratory failure and chronic cor pulmonale; the TCM diagnosis was 肺痿 (lung
atrophy — lung-kidney deficiency with phlegm-stasis). Management was integrative (non-invasive ventilation,
antimicrobials, corticosteroid escalation, nebulisers, and a high-dose aconite-containing 破格救心汤 decoction).

**Presentation.** Nine years of intermittent cough, sputum and breathlessness, worse for four days — now breathless at
rest and unable to get out of bed. Already on meropenem, voriconazole, methylprednisolone 40 mg/day and non-invasive
ventilation (the report does not say whether these began before or at admission), still breathless. Poor appetite and
sleep, constipation, oliguria, delirium and visual hallucinations. Exam: T 36.5 °C, HR 118, RR 47, BP 145/89; forced
posture, distressed, delirious; coarse breath sounds with basal crackles; no murmurs; tongue dark red with a white
greasy coating, pulse rapid-deep-thready-weak.

**Course.** Admission ABG pH 7.430, PaCO₂ 56.3, PaO₂ 76.2, HCO₃⁻ 37.4, BE 13.0 (compensated chronic hypercapnia with a
metabolic alkalosis). Sputum culture: yeast-like fungi and hyphae, plus *Stenotrophomonas maltophilia*. WBC 10.28
×10⁹/L, neutrophils 89.8 %, Hb 74 g/L, CRP 12.9 mg/L. Chest CT: bilateral interstitial disease, honeycombing and
fibrosis (left > right), a small right lung with nodules, pleural thickening/calcification, and — in the caption —
subcutaneous and mediastinal emphysema with a small pneumothorax. Echo: trace mitral/tricuspid regurgitation, reduced
LV diastolic function. **About 5 hours later** he deteriorated (RR 57, SpO₂ 78 %, HR 120, blood-streaked sputum): ABG
pH 7.149, PaCO₂ 118.5, PaO₂ 20.7, HCO₃⁻ 40.3, BE 9.2; BNP 364 ng/L. AE-IPF was considered; methylprednisolone was
raised to 160 mg q12h, meropenem + fluconazole continued, and the 破格救心汤 decoction (黑顺片/aconite 60 g) added. The
inflammation improved by day 10 and he was discharged after about 3 weeks with **fibrosis unchanged**.

## Scenario timeline and physiology

This is a **static, staged historical review** (`clock.mode: "static"`, no `physiology` block). Vital signs are
recorded as exam findings, not a monitored trend; the SpO₂ of 78 % is a recorded value, not a modelled saturation.

* **`initial`.** The 9-year history, the activity decline, the past IPF and pirfenidone, the treatment already given,
  the exam (forced posture, delirium; coarse breath sounds with basal crackles; the normal heart sounds; the TCM
  tongue and pulse). The patient is delirious and severely breathless and cannot give a reliable account
  (`patient.nonVerbalWhen: {always: true}`, in the annotation file): **his son gives the history**.
* **`workup`.** The 5-hour deterioration and the four decisions. The serial blood gases, chest CT, sputum culture,
  blood count and echocardiogram are reviewed here. The chest CT is a fixed-device study with `risk: "moderate"` (an
  unstable patient would be taken to the scanner).
* **`followup` (record review).** The full treatment course and the outcome — a **chart review**
  (`requires: ["records"]`; `performedAt: "records"` in the annotation file). It opens only after all four decisions
  and the history/exam objectives, so the aconite prescription and the outcome never pre-empt the reasoning.

## Decisions and assessment

**Objectives (chapters).** `objective-1` (history: presentation, activity, past lung disease, treatment given) →
`objective-2` (exam: general, chest, vitals) → `objective-3` (gases/imaging/microbiology: diagnosis and fungal decided)
→ `objective-4` (respiratory support and management decided) → `objective-5` (follow-up record read). Hints coach
without naming a correct option.

**Decisions.**

* **`diagnosis`** (single) unlocks after the blood gases, CT and sputum culture are read: acute deterioration of
  fibrotic lung disease with infection and acute hypercapnic failure, against "fungi alone prove invasive fungal
  pneumonia", "just slow IPF progression" and "the temperature is normal, so not urgent".
* **`fungal`** (single) unlocks after the sputum culture: yeast/hyphae are most likely colonisation, not proven
  invasive fungal disease (EORTC/MSGERC 2020), against "confirmed aspergillosis, treat regardless" and "ignore the
  fungi entirely".
* **`ventilation`** (single) unlocks after the gases and CT: recognise NIV failure, check the caption air leak before
  positive pressure, and discuss goals of care before invasive escalation — against "the temperature is normal",
  "turn the oxygen up" and "intubate immediately regardless of the air leak or goals".
* **`management`** (single) unlocks after the diagnosis, the blood count and the treatment history: critical-care and
  respiratory review of ventilation, reversible contributors and goals of care, with infection control — herbal
  treatment not replacing respiratory support, and no single-agent attribution. The distractors include the report's
  own choice ("copy the high-dose aconite decoction and conclude it reversed the fibrosis") and "steroids as the sole
  proven treatment" and "stop all antimicrobials".

Every option carries its own bilingual feedback; decisions are scored on first-attempt accuracy (`decidedFirstTry`).

**Rubric** (deterministic total 16; one examiner-judged communication item). Safety weighs most.

| Item | Domain | Weight | Met when |
|---|---|---|---|
| `r-hx` | history | 2 | presentation, activity, past lung disease and treatment given asked |
| `r-exam` | examination | 1 | general appearance, chest and vitals examined |
| `r-abg` | investigations | 2 | serial blood gases read (`read: abg`) |
| `r-ct-airleak` | safety | 2 | the air leak in the CT caption read (`read: ct`) before continuing positive pressure |
| `r-diagnosis` | diagnosis | 2 | `decidedFirstTry: diagnosis` |
| `r-fungal` | diagnosis | 1 | `decidedFirstTry: fungal` |
| `r-ventilation` | management | 2 | `decidedFirstTry: ventilation` |
| `r-management` | management | 2 | `decidedFirstTry: management` |
| `r-safety-aconite` | safety | 2 | did **not** give the high-dose aconite decoction as the primary rescue (`not intervened: tcm-decoction-aconite`) — counted only once management is engaged (`scoredWhen`, annotation file; `critical`) |
| `r-comm` | communication | 1 (judged) | goals-of-care discussion with the family in AE-IPF |

**How wrong choices score.** The reference path scores 16/16. A wrong first answer on a decision loses that decision's
`decidedFirstTry` item (2 for `diagnosis`, `ventilation`, `management`; 1 for `fungal`); answering correctly only after
a wrong attempt does not restore it. Giving the high-dose aconite decoction (`tcm-decoction-aconite`) is flagged
**contraindicated** (shown in the debrief's safety list) and loses `r-safety-aconite` (2); it is a harm-avoidance item
counted only once management is engaged (decided or NIV continued), so doing nothing does not earn it. `r-abg` and
`r-ct-airleak` reward reading the serial gases and the CT caption.

## Reference path (`solution`)

46 steps, finishing with 5/5 objectives, 4/4 decisions and 16/16, no rejection and no contraindicated intervention, in
both clinical and in-world mode. History (presentation, activity, past lung disease, treatment given, exposure,
associated problems, sputum, allergies, family, smoking, alcohol, occupation, concerns — the son answering) → exam
(general, vitals, chest, heart, TCM tongue/pulse) → **enter `workup`** → the 5-hour deterioration history and vitals →
order and read the serial gases, CT, sputum culture, blood count and echo → answer `diagnosis`, `fungal`, `ventilation`
→ answer `management` → give controlled oxygen, continue NIV, antimicrobials, steroid escalation, nebulised
bronchodilator, mucolytic and a goals-of-care discussion (**not** the aconite decoction, **not** intubation) →
**`followup` opens** → read the treatment/outcome record → finish.

## Clinical numbers check

| Item | Value | Working / note |
|---|---|---|
| Admission ABG | pH 7.430, PaCO₂ 56.3, PaO₂ 76.2, HCO₃⁻ 37.4, BE 13.0 | Henderson–Hasselbalch: 6.1 + log(37.4 / (0.03 × 56.3)) ≈ 7.44 — compensated chronic hypercapnia **with a metabolic alkalosis** (HCO₃⁻ above the expected ~0.35 × ΔPaCO₂ rise) |
| 5-hour ABG | pH 7.149, PaCO₂ 118.5, PaO₂ 20.7, HCO₃⁻ 40.3, BE 9.2 | 6.1 + log(40.3 / (0.03 × 118.5)) ≈ 7.15 — acute-on-chronic respiratory acidosis despite NIV |
| SpO₂ vs PaO₂ at 5 h | SpO₂ 78 % with PaO₂ 20.7 mmHg | **physiologically discordant** (at PaO₂ ≈ 21 mmHg, SaO₂ should be well below 50 %, lower still with acidaemia; P50 ≈ 27 mmHg); the sample type is not stated, so both values are kept uncorrected (labelled contradiction) |
| Blood count | WBC 10.28 ×10⁹/L (H), neutrophils 89.8 % (H), Hb 74 g/L (L), CRP 12.9 mg/L (H) | anaemia and a neutrophilic infective picture |
| BNP | 364 ng/L (at deterioration) | raised; with the echo, consistent with the cor pulmonale diagnosis |
| Aconite (黑顺片) | 60 g in the 破格救心汤 decoction | 黑顺片 is processed aconite; **compare with the dose range for 附子 in the 2020 Chinese Pharmacopoeia** (not verified online for this edition — see "To verify") |
| Outcome | CT aeration increased, inflammation resolved, **fibrosis unchanged**, discharged ~3 weeks | the verifiable endpoint; obtained under concurrent steroids, antimicrobials and NIV |

Units: SI throughout; blood gases in mmHg as the report records them (1 mmHg ≈ 0.133 kPa).

## Facilitator notes

**Debrief questions (PEARLS order).**

1. *Reactions* — "A man with nine years of fibrosis crashes within hours of admission. How did that sit with you?"
2. *Description* — "Summarise him in two sentences: what was acute, and what was the background?"
3. *Analysis*
   - "His temperature was normal. What actually told you how critical he was?" (serial gases, NIV failure)
   - "Sputum grew yeast and hyphae. Does that make this invasive fungal pneumonia? What would you need?"
   - "What did the CT caption show that matters before positive-pressure ventilation?"
   - "In end-stage fibrosis, where does a goals-of-care conversation fit — and when?"
   - "The decoction contained 60 g of aconite. What are the safety concerns, and can we say it reversed the fibrosis?"
4. *Summary* — "What three things would you fix first for the next patient with an acute exacerbation of fibrosis?"

**Common learner errors and how the case surfaces them.**

| Error | How the case surfaces it |
|---|---|
| Reading the normal temperature as reassurance | `diagnosis` option "temp-reassuring" and `ventilation` option "ignore-temp" are wrong |
| Calling sputum fungi invasive fungal disease | `fungal` option "confirmed-aspergillosis" is wrong (EORTC/MSGERC 2020) |
| Missing the air leak before positive pressure | `r-ct-airleak` rewards reading the CT; `ventilation` correct option names the pneumothorax |
| Intubating without the air leak or goals of care | `ventilation` option "intubate-now" is wrong |
| Uncontrolled high-flow oxygen in hypercapnia | `ventilation` option "high-fio2" is wrong |
| Treating the aconite decoction as proven / reversing fibrosis | `management` option "copy-aconite" is wrong; `tcm-decoction-aconite` is contraindicated; `r-safety-aconite` |
| Stopping antimicrobials because the fungi are colonisers | `management` option "stop-antimicrobials" is wrong |

**Teaching notes.**

* Keep the debrief honest about attribution: the only verifiable outcome is resolution of acute inflammation and
  symptoms with unchanged fibrosis, obtained under concurrent steroids, antimicrobials and NIV. The case must never
  read as efficacy evidence for the decoction.
* Historical practice vs current guidance: the report escalated steroids (limited evidence in AE-IPF), switched
  voriconazole to fluconazole (no mould activity) and added high-dose aconite. The follow-up record states what the
  team did; the decisions and debrief teach what current frameworks say.
* The pharmacist NPC can be used for the aconite dose and the steroid escalation; the attending frames the AE-IPF and
  colonisation points.

## Embodied mode

**Grounding (world policy).** The serial blood gases, sputum culture and blood count are sampled at the patient and
read at a records terminal; the echocardiogram is a bedside study. The treatment/outcome record is a **chart review**
(`requires: ["records"]`), read at a records terminal — never a device. IV items (steroid escalation, antimicrobials)
take `iv-access`; he arrives on an IV meropenem infusion, so `extensions.embodied.ivAccessInSitu: true` (no cannulation
procedure is needed first). The controlled-oxygen item names its `device` (`venturi-mask`); the nebuliser needs
`nebulizer`.

**Where the patient goes.** The chest CT (`ct`, `risk: "moderate"`) needs the patient taken to the scanner in
embodied mode — an unstable transfer that approval gates and the facilitator notes flag. No phase relocation is
authored (he stays in the respiratory unit).

**Scope of practice.** Intubation and invasive ventilation are medical acts (`scope: "medical"`); oxygen, nebulisers
and NIV management follow their kind defaults.

**Measured (offline autopilot, 2026-10-28).** `general-hospital`, en: 16/16 (100 %), 5/5 objectives, no contraindicated
intervention; clinical and in-world mode give the same score (static clock, 0 simulated minutes).

## Source and adaptation

* **Source and adaptation.**
  * *From the report:* age, sex, the 9-year course, the activity decline, the pre-admission treatment, the exam
    (including the normal heart sounds and the TCM tongue/pulse), both blood gases with HCO₃⁻ and BE, the sputum
    microbiology, the blood count and BNP, the CT report and caption, the echocardiogram, the Western and TCM
    diagnoses, the full treatment course (steroid escalation to 160 mg q12h; meropenem + fluconazole; nebulised
    budesonide + ipratropium; myrtol; NIV; Shengmai injection, Simo decoction, the 破格救心汤 decoction with its exact
    herbs and doses including 黑顺片 60 g, and the day-10 additions) and the outcome (resolving inflammation,
    unchanged fibrosis, discharge at ~3 weeks).
  * *Adapted for teaching:* the staged phases, the four decisions and the rubric are an educational framing. A companion
    (his son, 蒋文斌 / Jiang Wenbin) is added as a teaching device because the patient is delirious and severely
    breathless; the report records no companion.
  * *Labelled contradictions:* the simultaneous SpO₂ of 78 % and PaO₂ of 20.7 mmHg are physiologically discordant and
    are kept uncorrected, with the discordance explained (`abg` note, debrief boundaries); the report does not state the
    sample type.
  * *Figures used:* `fig01` is the acute-illness chest CT (shown in `workup`); `fig02` is the post-treatment CT with
    unchanged fibrosis (shown in `followup`) — the gating 1.0.0 already had, kept. Both figures were viewed: they are
    screen photographs of CT slices with only the scanner's R/L/P markers and a cursor, no burned-in identifier. The
    source PDF is kept for post-case review.
* No continuous physiology: vitals and the SpO₂ are recorded values, not a monitored trend.
* The CT's timing relative to the deterioration, the air-leak timing and treatment, the NIV settings, detailed
  susceptibilities, further invasive-fungal evidence, the right-heart assessment and long-term follow-up are not
  recorded and are kept unknown.

## Matcher notes

* `pmh` excludes 家里/家族/遗传 (family) so a family question reaches `family`, and `medications` excludes 过敏 / allerg
  so allergy questions reach `allergies`.
* `sputum.keywords.en` keeps "whatisthesputumlike" run-together (it would otherwise collapse to a single everyday
  token); `later` uses deterioration-specific phrasings (喘得更厉害 / 痰中带血) so it is not confused with the admission
  `sputum` item.
* Companion-answered items carry the son's lay voice; the free-text fallback is in his voice too.
* All 36 test utterances select their intended history item under the patient pipeline's ≥ 0.55 rule.

## References

The case's `debrief.references` (one Vancouver string each). The guideline DOIs were verified against the publisher's,
PubMed's or the journal's record (confirmed in the case audit; AJRCCM/CID DOI forms match their schemes); the source
DOI matches the DOI printed in the source PDF. The Crossref API, doi.org, PubMed E-utilities and rs.yiigle.com were not
reachable from the editing session. No DOI is given where none could be verified.

1. 何政恒, 黄卓健, 冼慧雯. 中西医结合治疗特发性肺纤维化合并肺炎1例. 镜湖医学. 2025;25(2):65-66.
   doi:10.12408/j.issn2223-4462.2025.02.022 (DOI printed in the source PDF)
2. https://rs.yiigle.com/cmaid/1653413 (the collection's article URL)
3. Raghu G, Remy-Jardin M, Richeldi L, et al. Idiopathic pulmonary fibrosis (an update) and progressive pulmonary
   fibrosis in adults: an official ATS/ERS/JRS/ALAT clinical practice guideline. Am J Respir Crit Care Med.
   2022;205(9):e18-e47. doi:10.1164/rccm.202202-0399ST
4. Collard HR, Ryerson CJ, Corte TJ, et al. Acute exacerbation of idiopathic pulmonary fibrosis. An international
   working group report. Am J Respir Crit Care Med. 2016;194(3):265-275. doi:10.1164/rccm.201604-0801CI
5. Donnelly JP, Chen SC, Kauffman CA, et al. Revision and update of the consensus definitions of invasive fungal
   disease from the European Organization for Research and Treatment of Cancer and the Mycoses Study Group Education
   and Research Consortium. Clin Infect Dis. 2020;71(6):1367-1376. doi:10.1093/cid/ciz1008
6. Hong Kong Department of Health, Chinese Medicines Regulatory Office. Alert on herbal medicine poisoning (aconitine).
   2020. https://www.cmro.gov.hk/
7. 国家药典委员会. 中华人民共和国药典（2020年版）一部·附子. 北京: 中国医药科技出版社; 2020.

### To verify

- **2020 Chinese Pharmacopoeia dose range for 附子.** The teaching point that the 60 g aconite dose should be compared
  with the Pharmacopoeia range is made without quoting a number — the exact range was not confirmed online. Check the
  printed 《中国药典》2020年版 before quoting a figure in teaching.
- **AE-IPF 2016 IWG infection-triggered scope.** The 2016 International Working Group definition is cited for the
  revised AE-IPF framework; that it covers infection-triggered as well as unexplained exacerbations was taken from a
  secondary review in the audit — confirm in the full text before leaning on it.
- **2011 ATS/ERS/JRS/ALAT IPF statement on corticosteroids/ventilation in AE-IPF** was considered but is **not cited**,
  because its exact wording on steroids and mechanical ventilation was not verified; the case relies on the 2022 update
  and the 2016 AE-IPF report instead.
- **Guideline DOIs** (refs 3–5) were verified in the case audit, not re-verified live this session (the publisher hosts
  were unreachable); they are well-formed AJRCCM/CID DOIs.

## Changelog

### 1.1.0 — 2026-10-28 (editorial revision)

Substantive changes from PR #3's 1.0.0:

- **Restored the deterioration and the source facts (audit S2).** Added the 5-hour deterioration vitals (RR 57, SpO₂
  78 %, HR 120) as an exam finding and the full serial blood gases with HCO₃⁻ and BE as structured values; restored the
  echocardiogram, the authors' Western and TCM diagnoses, the normal heart sounds and the TCM tongue/pulse, the CT
  caption findings (right-lung nodules, honeycombing/reticulation, subcutaneous/mediastinal emphysema and the small
  pneumothorax), and the full treatment record — including the 破格救心汤 prescription with 黑顺片 (aconite) 60 g that a
  decision option refers to, the steroid escalation to 160 mg q12h, and the day-10 additions. 1.0.0's follow-up said
  only "traditional medicines" and omitted the deterioration vitals, the echo, the steroid escalation and the
  diagnoses.
- **Aconite safety (audit A1).** The `management` decision's wrong option and its feedback, a dedicated debrief
  teaching point, a `tcm-decoction-aconite` intervention (contraindicated, with a `harm` text) and a pharmacist NPC now
  carry the aconite toxicity and single-case-attribution teaching; `r-safety-aconite` scores not using it as the
  primary rescue.
- **Re-anchored the guidance (audit A2).** Added the 2016 AE-IPF International Working Group report and the EORTC/MSGERC
  2020 invasive-fungal-disease definitions, which the management and fungal teaching rest on; the 2022 ATS/ERS/JRS/ALAT
  IPF guideline is kept for the diagnosis of IPF/PPF. (1.0.0 cited only the 2022 IPF guideline, which does not address
  AE-IPF management.)
- **Labelled the source discordance (audit B1).** The simultaneous SpO₂ 78 % and PaO₂ 20.7 mmHg are kept and flagged as
  physiologically discordant, uncorrected.
- **Persona and register.** `affect` set to `breathless`; the opening line and history move to the son's lay voice
  (`persona.companion`), replacing the "calm, full-sentence" persona that contradicted the recorded distress and
  delirium; `fallbackUnknown` in a first-person form.
- **Decisions, interventions, rubric.** Four decisions (diagnosis, fungal colonisation vs invasion, ventilation/goals
  of care, management/aconite safety) with per-option feedback and plausible distractors including the report's own
  choices; 9 interventions (NIV, intubation, controlled oxygen, steroid escalation, antimicrobials, nebuliser,
  mucolytic, the aconite decoction [contraindicated], goals-of-care discussion); a 10-item rubric with two safety items
  and an examiner-judged communication item, decisions scored `decidedFirstTry`. 1.0.0 had 2 decisions with identical
  per-option feedback, a 4-item rubric with no safety or communication item, and 0 interventions.
- **Embodiment.** The chest CT gains `risk: "moderate"` (unstable transfer); the treatment record uses
  `requires: ["records"]`; `ivAccessInSitu` set (he arrives on IV meropenem). A `traditional-chinese-medicine`
  specialty tag is added so facilitators can filter the case.
- **Teaching layer.** 5 learning outcomes, 5 teaching points (each naming its guidance), key reasoning and honest
  boundaries/unknowns; Vancouver references; `provenance.review` (editorial); 36 paraphrased test utterances; the
  chief complaint and first tag restored to include 间断咳嗽. Difficulty 4; estimated time 25 → 35 min.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1653413/case.json
npm run -s cc -- cases verify cmcr-1653413
npm run -s cc -- exec --case cmcr-1653413 --autopilot --approval bypass --provider offline --output-format json
npm run -s cc -- exec --case cmcr-1653413 --autopilot --approval bypass --provider offline --embodied --output-format json
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1653413
```

On 2026-10-28 (version 1.1.0): validate 0 errors, 0 warnings; verify passes — 46 steps, objectives 5/5, decisions 4/4,
36/36 matcher test utterances; the reference path scores 16/16 with no rejection and no contraindicated intervention in
both clinical and in-world mode; the collection contract test for this case passes.

## 中文摘要

**病例概要。** 74岁男性，特发性肺纤维化9年、长期服用吡非尼酮，4天来静息气促加重、下不了床，由儿子陪同入院。入院已用美罗培南、
伏立康唑、甲泼尼龙40 mg及无创呼吸机，仍喘憋，伴纳眠差、便秘、少尿、谵妄、幻视。查体 T 36.5℃、HR 118、RR 47、BP 145/89，强迫
体位、谵妄，双下肺爆裂音及湿啰音，心律齐无杂音；舌暗红苔白腻，脉数沉细弱。入院血气示慢性代偿高碳酸血症（pH 7.430、PaCO₂ 56.3、
HCO₃⁻ 37.4）；约5小时后急剧恶化（RR 57、SpO₂ 78%、HR 120，痰中带血），血气 pH 7.149、PaCO₂ 118.5、PaO₂ 20.7，BNP 364 ng/L，
考虑**特发性肺纤维化急性加重合并感染**。在无创通气、抗感染、激素升至160 mg q12h基础上，加用含黑顺片（附子）60克的破格救心汤。
约3周后炎症吸收、症状改善，但纤维化同前出院。

**学习目标。** ①解读连续血气，识别急性-慢性高碳酸血症失代偿与无创通气失败；②按2016国际工作组框架评估特发性肺纤维化急性加重并
搜寻可逆诱因；③按EORTC/MSGERC 2020区分真菌定植与侵袭性真菌病；④在急性加重中于升级前开展治疗目标讨论；⑤识别附子毒性与用药安全，
说明多药同期下单例归因的局限。

**关键决策。** 诊断框定（纤维化急性加重合并感染、急性高碳酸血症失代偿）；真菌解读（多为定植，非确诊侵袭性真菌病）；呼吸支持（识别
无创通气失败、核对图注气漏、升级前讨论治疗目标）；管理与安全（循证呼吸支持与感染控制，不以中药替代呼吸支持、不以高剂量附子方剂为
主要救治、不认定其逆转纤维化）。评分：确定性总分16分，含两项安全项（图注气漏、附子安全）与一项由考官评判的沟通项（治疗目标讨论）；
决策按首次作答正确计分。

**复盘要点（PEARLS）。** 先谈数小时内骤然恶化的感受；用两句话区分急性与基础问题；分析围绕：体温正常为何不能当作放心的依据（连续
血气、无创失败）；痰中真菌为何多为定植；正压通气前须核对的图注气漏；终末期纤维化中治疗目标讨论的时机；附子60克的安全性与单例归因的
局限。历史处置仅作记录，不作疗效或安全性背书；可核对的结局是炎症吸收、症状改善而纤维化未变，且在多药并用下取得，无法归因于某一药物。
