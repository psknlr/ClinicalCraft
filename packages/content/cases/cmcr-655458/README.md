# cmcr-655458 — Markedly raised white count in cord blood · 18-hour-old boy

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (王予宁 / Wang Yuning) is a
> pseudonym, and his relative, the attending (华医生 / Dr Hua), the nurse (苗护士 / Nurse Miao) and the
> consultant (钟医生 / Dr Zhong) are teaching roles. The case adapts one published case report; it is not
> medical advice.
> 导师指南，含剧透。患者为化名，家属与医护人物为教学角色；本病例改编自已发表的单例报告，不构成医疗建议。

**Status of the facts.** Version 1.1.0 was re-authored from the facts recorded in version 1.0.0 (commit
`88ed0d2`), the only fact base available in the authoring environment. Those facts have **not yet been
checked against the full source article** (`extensions.sourceTextChecked: false`); the source pass follows
when the article text is available. Everything listed under "To verify" is part of that pass.

## Case card

| | |
|---|---|
| id / version | `cmcr-655458` · `1.1.0` · CMCR additional collection (`cmcr-105`) |
| Source | 刘兆娥, 陈鲁, 朱学梅. 生后脐血检查发现先天性淋巴细胞白血病一例. 中华儿科杂志. 2011;49(1):72-73 |
| Setting / facility | Neonatal unit, ward bed (`inpatient`) / `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 min (static clock; four phases, five decisions, 16 investigations, 16 interventions) |
| Specialty | Neonatology, haematology (`neonatology`, `hematology`) |
| Languages | `zh-CN` (source language), `en` |
| Learner level | Final-year students, paediatric and neonatal residents; neonatal nurses for the first-hours and handover parts |
| Review status | `editorial`, 2026-10-30 — AI-assisted teaching design with an editorial review against the cited guidance; **not yet reviewed by a licensed clinician**, and the patient facts are not yet checked against the full article. Have a neonatologist and a paediatric haemato-oncologist review it before teaching use |
| Phases | `admission` 入院：生后18小时 / Admission: 18 hours old → `work-up` 住院第2天起：确诊检查 / From hospital day 2: the diagnostic tests → `course` 第4天起：病情变化 / From day 4: a change in his condition → `outcome` 原报告记录的转归 / Reported course and outcome — none learner-switchable |
| Content | 21 history items (7 required, 7 unknown; the relative answers) · 9 exam findings · 16 investigations (2 record reviews; 10 with no result recorded in one or more phases) · 16 interventions (5 contraindicated; the ward LP is a harmful investigation) · 6 objectives · 5 decisions (20 options) · 12 rubric items (11 deterministic, weight 30; 1 examiner-judged; 2 critical) · 3 staff · 6 learning outcomes · 6 teaching points · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise congenital leukaemia in a newborn who looks well from an extreme white count of immature
   lymphoid cells, an enlarged liver and spleen and low platelets, and tell it from a leukaemoid reaction, the
   transient abnormal myelopoiesis of Down's syndrome and an analyser artefact.
2. Start tumour-lysis prevention for ALL with white cells ≥ 100 × 10⁹/L before the diagnosis is confirmed
   (BSH 2015) — potassium-free hydration, allopurinol until G6PD deficiency is excluded, frequent electrolytes
   and urine output — and avoid red cells for pallor, steroids before the diagnostic samples and an unplanned
   lumbar puncture.
3. Read CD19, cCD79a, CD34 and HLA-DR with a negative POX as B-lymphoblastic leukaemia under the WHO 5th
   edition (2022), and explain why a normal karyotype and a limited RT-PCR panel cannot exclude KMT2A
   rearrangement without FISH.
4. Explain why infant ALL is treated on an infant protocol at an experienced centre, and give the family the
   odds of his group — about one in five event-free for ALL from birth (Interfant-99, 2009) and in the
   Interfant-06 high-risk group (2019) — not the all-infant average.
5. Break news of a life-threatening diagnosis to a newborn's parents with SPIKES, share the decision while the
   outcome is uncertain, and plan palliative care in parallel (BAPM 2025).
6. Treat fever and reduced responsiveness in a newborn with leukaemia as suspected late-onset sepsis — blood
   culture, then IV antibiotics within 1 hour of deciding to treat (NICE NG195, 2021, updated 2024) — and look
   for intracranial bleeding.

These are the case's `learningOutcomes`; they name the diagnosis, so front-ends show them before play only
behind the closed "Learning outcomes (6) · may reveal the diagnosis" disclosure and list them in every debrief
(CASE_AUTHORING §9.4, GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A boy born by caesarean section at 38 weeks (3.08 kg) had his cord blood taken for storage; the test done for
it showed a very high white count. Ten hours after the family learned of it, at 18 hours of life, he was
admitted to the neonatal ward. He had cried loudly at birth (no cord round the neck) and was alert with a
strong cry and no rash. His mother reported no radiation, medicines or toxins in pregnancy; his parents are
healthy and unrelated, his 5-year-old brother is well, and there is no genetic disease or malignancy in the
family.

**On admission:** temperature 36.8 °C, pulse 128/min, respiratory rate 36/min; alert but pale (面色欠红润); no
palpable superficial lymph nodes, no rash; a distended abdomen with the liver 4 cm below the costal margin and
2 cm below the xiphisternum and the spleen 1.5 cm below the costal margin, firm with blunt edges. White cells
513.62 × 10⁹/L, platelets 94 × 10⁹/L, lymphoblasts and prolymphocytes (原幼淋巴细胞) 95 % on the film. The next
day: white cells 556.94 × 10⁹/L, blasts 90 %.

**Diagnosis:** marrow lymphoblasts and prolymphocytes 91 %, POX negative; flow cytometry showed an abnormal
population of 89 % expressing CD19, cCD79a, CD34 and HLA-DR, reported as acute B-lymphoblastic leukaemia. The
karyotype showed no abnormality and a multiplex RT-PCR of limited coverage found no fusion gene. The report's
diagnosis: **congenital B-lymphoblastic leukaemia**. KMT2A status, CD10 and the CSF are not recorded.

**Course:** petechiae appeared after admission; on day 4 a violaceous lumbosacral nodule appeared and was not
biopsied; low-grade fever and reduced responsiveness followed. On day 9 the family withdrew treatment and he
was discharged; at follow-up he was reported to have died at 45 days of life. The case records no treatment
given during the admission, no cause of death and no reasons for the family's decision.

**Today's answer:** an extreme white count is an emergency in its own right — tumour-lysis prevention from the
first hours (BSH 2015), no red cells for pallor, no steroids before the diagnostic samples, no unplanned LP;
KMT2A testing by FISH; referral to a centre treating infant ALL on an infant protocol, with honest odds (about
one in five event-free for ALL from birth, not the all-infant 46 %); fever treated as sepsis; and a shared,
honest decision with the family, with palliative care planned in parallel as an equally legitimate choice.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires. The case
shows the recorded states only; no response to the learner's treatment is simulated, and every intervention's
response says what the case does and does not record.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | 18 hours of life | start | the relative's history (incl. a labelled teaching worry), the admission examination, the cord-blood result (record review), the admission count and film (critical value), unrecorded admission tests (electrolytes/urate, clotting, G6PD, blood culture, TORCH), decisions `working-diagnosis` and `first-hours`, the first-hours interventions |
| `work-up` | hospital day 2 (marrow and genetics: day not recorded) | objectives `obj-handover`, `obj-examine`, `obj-first-hours` complete (history, examination, count read, decisions 1–2, and potassium-free hydration, allopurinol and the TLS bloods or 4–6-hourly chart given) | the next-day count, marrow, immunophenotype, karyotype, RT-PCR screen, FISH (no result recorded), the family's teaching worry, decisions `classification` and `family-plan`, the family meeting and palliative-care referral |
| `course` | from day 4 to before day 9 | objectives `obj-classify`, `obj-family` complete | the relative's account of the change, the re-examination (petechiae, lumbosacral nodule, low-grade fever, reduced responsiveness), blood culture, cranial ultrasound, skin biopsy (not done), decision `deterioration` |
| `outcome` | to 45 days of life | all five decisions decided | the reported course and outcome record |

Marrow and genetic results exist only in `work-up`; ordering them in another phase shows an order-entry notice
saying so (`orderMatching.warnings`). The outcome record opens only in the final phase.

## Decisions and assessment

### Objectives (HUD chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-handover` Find out why he was sent here | presentation, birth, pregnancy exposures, family, family history asked |
| 2 | `obj-examine` Examine him from head to toe | vital signs, general look, skin, lymph nodes, liver and spleen examined |
| 3 | `obj-first-hours` Read the count and act in the first hours | admission count read; decisions 1 and 2 right; potassium-free hydration and allopurinol given, and the TLS bloods ordered or the 4–6-hourly TLS chart set up — so the prophylaxis comes before the confirming marrow and flow results |
| 4 | `obj-classify` Pin down the diagnosis and its type | marrow, immunophenotype, karyotype and RT-PCR read in `work-up`; decision 3 right |
| 5 | `obj-family` Talk with the family about the next steps | family meeting arranged; decision 4 right |
| 6 | `obj-course` Respond to the change and review the outcome | skin and responsiveness re-examined; decision 5 right; outcome record read |

Titles and hints name no diagnosis and contain no option text (the journal lists later titles early).

### Decisions

| id | Opens after | Key | Distractors (why they tempt) |
|---|---|---|---|
| `working-diagnosis` | presentation asked, general look and liver/spleen examined, admission count read | `congenital-leukaemia`: neonatal leukaemia, treat as an emergency, set lineage by flow and marrow, look for Down's features | `leukaemoid-reaction` (newborn counts run high, he looks well — 1.0.0's template "birth stress" distractor, made plausible); `transient-myelopoiesis` (the commonest cause of circulating blasts in a newborn); `counting-artefact` (nucleated red cells) |
| `first-hours` | decision 1, count read | `tls-prevention`: potassium-free hydration, allopurinol until G6PD known, 4–6-hourly electrolytes/urate/creatinine with fluid balance, no red cells without a measured need, monitoring, same-day haemato-oncology | `transfuse-exchange` (pallor + "dangerous" count → red cells then exchange); `steroid-first` (bring the count down, defer the marrow); `watch-overnight` (looks well, restrict fluids for his kidneys) |
| `classification` | marrow, immunophenotype, karyotype, RT-PCR read | `b-lineage-kmt2a-open`: B-ALL established; KMT2A not excluded → break-apart FISH, complete CD10 | `myeloid-m0` (POX negative + CD34/HLA-DR; aberrant B antigens — 1.0.0's POX option made plausible); `standard-risk` (normal karyotype, no fusion → older-child protocol locally); `mixed-phenotype` (CD34/HLA-DR read as myeloid) |
| `family-plan` | decision 3 | `shared-decision`: SPIKES with the family, honest chances and burdens of an infant protocol, palliative care planned in parallel as an equal choice, care continued, a time agreed to talk again | `futility-advice` (1.0.0's futility option: "babies in such reports die within weeks"); `await-remission` (spontaneous remission of congenital leukaemia); `palliative-if-declined` (the near-miss: recommend transfer for treatment and raise palliative care only if the family declines it) |
| `deterioration` | skin, temperature and responsiveness re-examined in `course` | `sepsis-bleed-screen`: blood culture, IV antibiotics within 1 h, count and clotting, platelets for a measured low count, bedside cranial ultrasound, LP deferred until safe | `tumour-fever` (fever and spots are the leukaemia; wait for the family); `biopsy-first` (prove leukaemia cutis, hold antibiotics); `lumbar-puncture-first` (rule out meningitis before choosing antibiotics) |

Every option has its own feedback (2–4 sentences naming the guidance, issuing body and year). Option ids name
their content. No key is the uniquely longest option of its decision in either locale (in `deterioration` the
key and `tumour-fever` tie in zh-CN).

### Rubric (11 deterministic items, weight 30, + 1 examiner-judged)

| id | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history-perinatal` | history | 2 | presentation, birth mode, pregnancy exposures, family, family history asked |
| `rb-history-gaps` | history | 1 | antenatal/Down's screening, infection in pregnancy, medicines since birth (vitamin K), vaccines asked (all unrecorded: asking is the competency) |
| `rb-examination` | examination | 2 | vital signs, general look, skin, lymph nodes, liver and spleen |
| `rb-workup` | investigations | 2 | admission count read, clotting and G6PD ordered on admission; marrow, immunophenotype, karyotype, RT-PCR read in `work-up` |
| `rb-working-diagnosis` | diagnosis | 3 | decision 1 right first time |
| `rb-tls-prevention` | management | 4 | **critical** — potassium-free hydration and allopurinol given, and the TLS bloods ordered in `admission` or the 4–6-hourly TLS chart set up (all gated in `admission` by `obj-first-hours`) |
| `rb-first-hours` | management | 3 | decision 2 right first time; haemato-oncology referral; monitoring |
| `rb-no-harm` | safety | 4 | **critical** — none of: red-cell top-up, prednisolone, rasburicase, fluid restriction with furosemide, routine discharge, ward LP; `scoredWhen` = decision 2 attempted or any of those six acts |
| `rb-classification` | diagnosis | 3 | decision 3 right first time and FISH ordered in `work-up` |
| `rb-family-plan` | management | 3 | decision 4 right first time; family meeting; palliative-care referral |
| `rb-deterioration` | management | 3 | decision 5 right first time; blood culture and cranial ultrasound ordered in `course`; IV antibiotics |
| `rb-communication` | communication | (judged) | SPIKES-structured conversation with the family — the relative who is here, the parents invited (see judge guidance) |

**Critical items are acts**, not decisions: `rb-tls-prevention` (the missed life-saving act) and `rb-no-harm`
(the dangerous errors). An `intervened` condition carries no phase, so the timing of the prophylaxis is enforced
the way the exemplars enforce theirs (cmcr-70044 `obj-treat`, cmcr-1067495 `obj-before-birth`, cmcr-44848
`obj-first-hour`): `obj-first-hours`, which opens `work-up` — the marrow, flow and genetic results that confirm
the diagnosis — completes only once potassium-free hydration and allopurinol are given and the TLS bloods are
ordered (or the 4–6-hourly TLS chart is set up). Nobody reaches the confirming results, let alone day 4, without
them, so the item cannot be met late. (As first written, the objective needed only the count and decisions 1–2,
and a replay that started the prophylaxis after the deterioration scored 30/30.) The chart counts for the bloods
because it orders the same electrolytes, urate and creatinine 4–6-hourly.

### How wrong choices score (measured 2026-10-30 with core `assess`)

| Path | Score | Critical items missed |
|---|---|---|
| Reference path (`solution`) | 30/30 (100 %) | none |
| Do nothing (start, then try to finish) | 0 (finish refused: objectives incomplete) | `rb-tls-prevention` |
| A wrong first answer at every decision, then the right one | 15/30 (50 %) | none |
| Every wrong option first at one decision only (each of the 15 distractors) | 27/30 (90 %) | none |
| Reference path plus any one harmful act (red cells, prednisolone, rasburicase, fluid restriction with furosemide, routine discharge or the ward LP) | 26/30 (87 %), and the act is a contraindicated safety event | `rb-no-harm` |
| Prophylaxis given late (hydration and allopurinol held back for after the deterioration — the review's replay) | not possible any more: `work-up` stays closed until both are given, so they land in `admission`; a learner who never gives them stops there at 15/30 (50 %) | `rb-tls-prevention` (if never given) |
| No TLS bloods and no TLS chart (hydration and allopurinol given) | stays in `admission`; 15/30 (50 %) if the learner stops there | `rb-tls-prevention` |
| No first-hours treatment at all (no hydration, allopurinol, chart, monitor or referral) | stays in `admission`; 12/30 (40 %) | `rb-tls-prevention` |
| The 4–6-hourly TLS chart instead of ordering the admission TLS bloods | 30/30 (100 %) | none |
| No antibiotics or cranial ultrasound when he deteriorates | 27/30 (90 %) | none |
| No family meeting or palliative-care referral | stays in `work-up` (`obj-family`); 24/30 (80 %) | none |

Contraindicated acts are listed as safety events in every debrief. `exchange-transfusion` and `platelets` are
neutral (no measured count or leukostasis is recorded); `antibiotics` is indicated in `course`.

## Reference path (`solution`)

80 steps: start → all 17 admission-time history questions (including the seven unrecorded ones, which teach
what to ask) → vital signs, general look, skin, lymph nodes, abdomen, liver and spleen → cord-blood result
(records) → IV access and bloods → admission count and film, electrolytes/urate, clotting, G6PD, blood culture
→ decision 1 → potassium-free hydration, allopurinol, fluid chart, monitoring, haemato-oncology referral →
decision 2 → (`work-up`) the family's worry → next-day count, marrow, immunophenotype, karyotype, RT-PCR, FISH →
decision 3 → family meeting, palliative-care referral → decision 4 → (`course`) the relative's account, fever
and nodule questions → skin, temperature and responsiveness → blood culture, IV antibiotics, count, clotting,
cranial ultrasound → decision 5 → (`outcome`) the outcome record → finish. It scores 30/30 with no
contraindicated act, in clinical and in-world mode, in both languages. The demonstration does not biopsy the
nodule on the day he deteriorates — the case's own feedback says the biopsy is not that day's priority and must
not delay antibiotics; learners may still order it (no result is recorded).

## Clinical numbers check

Every patient value below is from version 1.0.0 (field in brackets) and keeps its unit; none is new. The source
check against the full article is pending.

| Value | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| Age 18 hours (stored 0.75 days; core shows "18 hours") | `title`, `patient.age` | `title`, `patient.age`, triage note |
| Weight 3.08 kg | `patient.weightKg`, history `weight` | `patient.weightKg`, history `weight`, triage note |
| Cord-blood white count "very high", known for 10 hours (no value) | history `presentation`, `chiefComplaint` | history `presentation`, `cord-blood-numbers`; `chiefComplaint`; `cord-blood-test` |
| Caesarean section at 38 weeks; loud cry; no nuchal cord | history `birth` | `birth-mode`, `birth-cry` |
| Brother aged 5, healthy | history `family` | `family` |
| T 36.8 °C, P 128/min, R 36/min | exam `initial-state` | exam `vitals-admission`, triage note, nurse handover |
| Liver 4 cm below the costal margin, 2 cm below the xiphisternum; spleen 1.5 cm | exam `liver-spleen` | exam `liver-spleen` |
| Admission WBC 513.62 × 10⁹/L, platelets 94 × 10⁹/L, 原幼淋巴细胞 95 % | `counts` (workup) | `fbc-film` (`admission`) values, critical |
| Next-day WBC 556.94 × 10⁹/L, 原始细胞 90 % | `counts` (workup) | `fbc-film` (`work-up`) values, critical |
| Marrow 原幼淋巴细胞 91 %, POX negative | `marrow` (confirmation) | `marrow` (`work-up`) |
| Flow abnormal population 89 %: CD19, cCD79a, CD34, HLA-DR | `marrow` (confirmation) | `immunophenotype` (`work-up`) |
| Nodule on day 4; withdrawal on day 9; death at 45 days of life | `followup` | status/exam items in `course`; `outcome` record |

**Reference ranges.** None is recorded; every lab value carries "reference range not recorded". The two white
counts are flagged HH (1.0.0 calls them very high); platelets and percentages carry no flag.

**Derived values (facilitator orientation only; not shown to learners).**
* Immature lymphoid cells on admission ≈ 513.62 × 0.95 ≈ 488 × 10⁹/L; next-day blasts ≈ 556.94 × 0.90 ≈
  501 × 10⁹/L. The two percentages count different categories (原幼淋巴细胞 vs 原始细胞), so compare with
  care. White cells rose by 43.32 × 10⁹/L (+8.4 %) in a day.
* The cord-blood result was known from about 8 hours of life (18 − 10 hours).
* Weight-based orientation for 3.08 kg (the case prints only formulas): the BSH 2015 hyperhydration figure for
  children, 200 mL/kg/day, would be ≈ 616 mL/day ≈ 25.7 mL/h — several times a term newborn's first-day
  maintenance volume, which is why the dose text has the neonatal team start from a newborn's requirement and
  step up (see "To verify"); allopurinol at 10 mg/kg/day ≈ 31 mg/day; rasburicase 0.2 mg/kg ≈ 0.62 mg
  (contraindicated here: no G6PD result). No length is recorded, so no body surface area or per-m² volume can
  be calculated.
* Thresholds used in teaching: ALL with white cells ≥ 100 × 10⁹/L is high TLS risk (BSH 2015). The Interfant-06
  high-risk group is KMT2A-rearranged, younger than 6 months, with white cells ≥ 300 × 10⁹/L or a poor prednisone
  response (as the trial registry gives it; see "To verify"): his counts (513.62 and 556.94 × 10⁹/L) and his age
  put him there if KMT2A-rearranged.
* Outlook figures quoted in the case: Interfant-06 6-year EFS 46.1 % and OS 58.2 % for all 651 infants, EFS
  20.9 % (SE 3.4) in the high-risk group (Pieters 2019); ALL diagnosed in the first month of life on
  Interfant-99, 30 infants, 2-year EFS and survival 20 % (SE 9.1 %), survival 17 % at last follow-up
  (van der Linden 2009). "About one in five" in the case's lay wording stands for these 20 %.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "He looked so well. How did it feel when the count came back above 500?"
2. **Description** — "Take me through his first 18 hours and what you set up in the first hours on the unit."
3. **Analysis**
   * "What on the film made you think leukaemia rather than a leukaemoid reaction, transient abnormal
     myelopoiesis or an analyser artefact?"
   * "Why did tumour-lysis prevention start before the marrow? Which steps did you avoid, and why — red cells
     for his pallor, prednisolone, rasburicase without a G6PD result, fluid restriction, a ward LP?"
   * "What do a normal karyotype and a negative multiplex RT-PCR tell you about KMT2A — and what don't they?"
   * "How did you open the conversation with his family? What did you ask them first, what odds did you give —
     from which group of infants — and what did you say about treatment, its burden and palliative care?"
   * "When he became febrile and less responsive, what did you rule out first, and how without moving him?"
   * "The family withdrew treatment on day 9 and he died at 45 days. What does that outcome tell us about
     modern infant-leukaemia treatment — and what does it not?"
4. **Summary** — "What will you do in the first hour the next time a newborn has an extreme white count?"

### Common learner errors and how the case surfaces them

| Error | What the case does | Where it scores |
|---|---|---|
| Reassured by his appearance; "repeat the count tomorrow" | `leukaemoid-reaction`, `watch-overnight`; `routine-discharge` contraindicated | `rb-working-diagnosis`, `rb-first-hours`, `rb-no-harm` |
| Red cells for pallor at this count | `transfuse-exchange`; `rbc-top-up` contraindicated | `rb-first-hours`, `rb-no-harm` |
| Steroids to bring the count down before the samples | `steroid-first`; `prednisolone-now` contraindicated | `rb-first-hours`, `rb-no-harm` |
| Rasburicase without a G6PD result | `rasburicase` contraindicated (G6PD not recorded) | `rb-no-harm` |
| Fluid restriction with a diuretic "for his kidneys" | `watch-overnight`; `restrict-furosemide` contraindicated | `rb-first-hours`, `rb-no-harm` |
| Ordering a ward LP early (or before antibiotics later) | `ward-lp` is a harmful investigation (note explains); `lumbar-puncture-first` | `rb-no-harm`, `rb-deterioration` |
| POX negativity read as myeloid; CD34/HLA-DR read as mixed | `myeloid-m0`, `mixed-phenotype` | `rb-classification` |
| Normal karyotype + negative PCR taken as "standard risk" | `standard-risk`; FISH order needed | `rb-classification` |
| Holding the prophylaxis until the diagnosis is confirmed | `obj-first-hours` keeps `work-up` (the confirming results) closed until hydration and allopurinol are given | `rb-tls-prevention` |
| Futility from this old case; waiting for remission; palliative care raised only if the family refuses treatment | `futility-advice`, `await-remission`, `palliative-if-declined` | `rb-family-plan`, communication |
| Quoting the all-infant survival (46 % on Interfant-06) as his chances | the key's feedback, teaching point 4 and the judge guidance give his group's figures (about one in five) | communication (judged) |
| "Tumour fever"; biopsy before antibiotics | `tumour-fever`, `biopsy-first` | `rb-deterioration` |

## Embodied mode

* **Where he is.** A ward bed in the general hospital (`inpatient`), lying; he is never moved. The cord-blood
  result and the outcome record are record reviews (`performedAt: "records"`, `requires: ["records"]`, risk
  none), read at a records terminal or the ward nursing station.
* **IV access** is a nursing procedure (`iv-access`); it is placed before the
  first IV item and draws the bloods (the ward's crash cart carries the cannulation kit). Laboratory, marrow, flow, cytogenetic, molecular and culture samples are
  taken at the patient; results are read at a records terminal or the bedside.
* **Devices.** The monitor (`cardiac-monitor`) and infusion pump are at the ward bed; the bedside cranial
  ultrasound (`performedAt: "bedside"`) needs a portable ultrasound cart wheeled to the cot; blood products and
  drugs are delivered to the bedside; an exchange transfusion would need the ward's neonatal incubator
  (`neonatal-care`), the blood bank and IV access. No chest film is offered: the facility has no portable X-ray,
  and moving a newborn for a neutral test would teach the wrong thing.
* **He cannot speak** (`nonVerbalWhen: {always: true}`, reason "a newborn, too young to speak" — true in every
  phase, so it names no age): his relative (`companion`, role `carer`, "王予宁的家属（化名）/ Wang Yuning's
  relative (pseudonym)") answers every question; the opening line is a bracketed narration.
* **The family conversation.** The only family member in the world is that relative, whose answers speak of
  "his mum and dad", so the family meeting (`family-meeting`), the decision 4 key and the judge guidance hold
  the conversation with the relative present and the parents invited; the examiner judges it on that basis.
* **Scope of practice.** IV access and the fluid chart are nursing scope; the family meeting is a doctor's act;
  drugs, fluids and monitoring follow their kinds; referrals are consults.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-655458:"` passes: the offline demonstration finishes
  in-world in en and zh-CN with every objective done and the clinical-mode score.

## Source and adaptation (fidelity limits)

**From the facts of version 1.0.0 (kept, reorganised into phases and lay speech, not yet checked against the
article).** Age, sex, weight; the cord-blood test done for storage, its very high white count and the
10-hour interval; neonatal admission; caesarean birth at 38 weeks with a loud cry and no nuchal cord; the
mother's report of no radiation, medicines or toxins; healthy, unrelated parents and a healthy 5-year-old
brother; no genetic disease or malignancy in the family; alert with a strong cry and no rash on arrival; the
admission signs; both blood counts; marrow morphology, POX and immunophenotype; the karyotype and the
multiplex RT-PCR "of limited coverage"; the diagnosis; petechiae, the day-4 lumbosacral nodule (not biopsied),
low-grade fever and reduced responsiveness; withdrawal of treatment on day 9; death at 45 days of life.

**Moved to the phase where it is true.** The deterioration, which 1.0.0 held only in the outcome record, now
also appears as the relative's account and the re-examination in `course`, so the learner can act on it before
the outcome opens. The next-day count is a separate phase result.

**Adapted for teaching (labelled).** The relative (role and relationship not recorded — persona says so),
all dialogue, and two worries that add no clinical fact (`concerns-admission`, `family-thoughts`, sourced
"Teaching device"); the staff; the phases' wording; decisions, options, feedback, interventions, rubric,
teaching points; the unrecorded tests offered to the learner with "No result is recorded for this test."; the
order-entry notices; the cot-side staging in the opening line.

**Contradictions and ambiguities kept, not resolved.**
* The admission film counts 原幼淋巴细胞 (lymphoblasts plus prolymphocytes) 95 %, the next-day count 原始细胞
  (blasts) 90 %; 1.0.0's English rendered the first as "lymphoblasts". Both readings are shown; the result note
  says they cannot be compared directly.
* "Day 4" and "day 9" do not say whether they count days in hospital or days of life; the case keeps "day 4"
  and "day 9".
* "质韧，边缘钝" (firm, blunt edges) may describe the liver only or both organs; the finding keeps the original
  order.
* Whether "limited coverage" of the RT-PCR is the authors' statement or a later gloss is not clear from 1.0.0.
* The weight (3.08 kg) is not dated (birth or admission).

**Privacy.** Pseudonym unique in the collection; no hospital, city, date or identifying detail; times are hours
of life and days in hospital. The source citation (which names the diagnosis) is shown only after the case.

**Figures.** `fig01` (approved in `scripts/cmcr-105-media-review.json`, checksum unchanged) stays a local-only
asset attached to no result, as in 1.0.0, because its content could not be inspected in this environment and
the review reason is a grouped one. Its title now says it is a composite that may show later findings and is
for the debrief. The critic asked for a re-review of this grouped approval (an infant's body photographs may be
included): see "To verify".

**Survey findings fixed** (survey.json: template SI-01–SI-25, governance findings 1, 3 and 10, critic gaps 9
and 14): template history slots and authoring language in the patient's and carer's mouths (“这项情况原病例资料
没有说明…”, "Companion (educational role)") replaced; the broken judge-guidance concatenation quoted for this
case replaced by case-specific SPIKES guidance; the end-of-life gap answered with decision `family-plan`, the
communication item and BAPM/SPIKES teaching; the summary no longer says "clonal disease"; review status
editorial with five named guidelines; one Vancouver citation (no zero-padded issue, `doi:` without a space, no
duplicated bare URLs); content option ids; no hindsight critical item; interventions, investigations,
examination, objectives, staff and unknowns at the revised-20 depth; the matcher corpus rewritten as
paraphrases with negatives; one extension schema (`sourceDoi` + `doiVerifiedAt` replace
`sourceDoiVerification`, `sourceTextChecked: false`). The age stays 0.75 days: the schema has no hour unit,
0.75 is exact, and the core formatter shows "18 hours" everywhere (an integer day would read "0 days").

**Independent review applied (2026-10-30, same version).** "Scattered" dropped from the day-4 skin finding
(1.0.0 records only "petechiae", no distribution); the karyotype renamed "染色体核型分析 / Karyotype" (1.0.0
names no specimen); the unknowns keep the day count open ("up to day 9"); the non-verbal reason names no age, so
it is true in every phase; the prophylaxis gated before the confirming results (`obj-first-hours`), with the
4–6-hourly TLS chart accepted for the admission bloods; the family conversation re-based on the odds of his group
(congenital ALL on Interfant-99, van der Linden 2009; the Interfant-06 high-risk group) instead of the all-infant
average, with the plainly unprofessional `consent-pressure` replaced by the near-miss `palliative-if-declined`
and the key shortened below the longest distractor; the conversation held with the relative present and the
parents invited; the attending's example questions made open (the list of traps kept for the debrief); the
`myeloid-m0` and `mixed-phenotype` feedback no longer assert an absent myeloid panel (it is not recorded) and the
`biopsy-first` feedback answers the option's "changes staging" claim; the skin biopsy dropped from the
demonstration; the newborn hydration volume, the NG195 date and the BAPM page numbers corrected; the matcher's
`term` and "risk in" collisions fixed and the English corpus extended. The last review finding reached this pass
truncated; its visible part (the README's "the report's 'birth stress' option", which was 1.0.0's template
distractor, and the `myeloid-m0` and `biopsy-first` feedback) is addressed as described.

## Matcher notes

* 40 `extensions.testUtterances` (19 zh-CN, 21 en), written as a learner would type them; none equals a keyword
  or a canonical question; 3 look-alike negatives (a home address, jaundice, and "Is he at risk in the short
  term?", the old `term` collision). Every required item and both phase twins have a paraphrase in both
  languages, and every history item has at least one; `cases verify` passes 40/40 with no extra selections.
  The standard caps the corpus at 40, so `apgar`, `output` and `nodule-detail` are tested in English only and
  `antenatal-checks`, `feeding` and `weight` in Chinese only; their other-language phrasings were probed with
  core `matchHistory` while authoring, each selecting its item alone ("Any problems on the antenatal scans or
  the Down's test?", "How's he taking his milk?", "Is he breastfeeding or on formula?", "Do you know what he
  weighed?"; "出生评分是几分？", "尿尿了吗？胎便下来没有？", "后背那个紫色的疙瘩是怎么回事？").
* `birth-mode` no longer has the bare keyword `term` ("full term" and "born at term" instead) and excludes
  "long term" and "short term" (长期, 远期, 短期), so "What's the long-term plan for him?" reaches
  `family-thoughts` (new keywords "long-term plan", "thoughts on treatment", "hoping for") instead of the birth
  answer, and "Is he at risk in the short term?" selects nothing. `early-course` has "his skin" rather than
  "skin" (the run-together "risk in" contains "skin") and excludes "came out" and "as soon as", so "Did he cry as
  soon as he came out?" reaches `birth-cry` (new "first cry", "cry as soon as").
* `cases verify` scores every history item whatever its phase, so keywords are kept apart across phases:
  `presentation` has no generic "怎么回事" and excludes number words (they go to `cord-blood-numbers`); the
  baby's own items (`early-course`, `fever-detail`, `medicines-since-birth`) exclude 妈妈/怀孕/孕期 and
  "pregnan"/"mum", and `pregnancy-exposures` excludes fever, rash and infection words so the mother's illness
  reaches `maternal-infection` (which excludes the baby's own skin and temperature); vitamin K vs vaccines are
  separated both ways; `family` excludes cancer and genetic words, which go to `family-history`.
* Phase twins: `status-course` (course) supersedes `early-course`; `family-thoughts` (work-up) supersedes
  `concerns-admission`.
* English keywords of three or more words keep two content words or are written run together
  (`whatstheproblem`, `howishenow`, `lookathim`), so none reduces to a one-word wildcard.

## References

1. 刘兆娥, 陈鲁, 朱学梅. 生后脐血检查发现先天性淋巴细胞白血病一例. 中华儿科杂志. 2011;49(1):72-73.
   doi:10.3760/cma.j.issn.0578-1310.2011.01.016. Available from: https://rs.yiigle.com/cmaid/655458
2. Roberts I, Fordham NJ, Rao A, Bain BJ. Neonatal leukaemia. Br J Haematol. 2018;182(2):170-184.
   doi:10.1111/bjh.15246
3. Alaggio R, Amador C, Anagnostopoulos I, et al. The 5th edition of the World Health Organization
   Classification of Haematolymphoid Tumours: Lymphoid Neoplasms. Leukemia. 2022;36(7):1720-1748.
   doi:10.1038/s41375-022-01620-2
4. Jones GL, Will A, Jackson GH, Webb NJ, Rule S; British Committee for Standards in Haematology. Guidelines for
   the management of tumour lysis syndrome in adults and children with haematological malignancies on behalf
   of the British Committee for Standards in Haematology. Br J Haematol. 2015;169:661-671.
   doi:10.1111/bjh.13403
5. New HV, Berryman J, Bolton-Maggs PH, et al. Guidelines on transfusion for fetuses, neonates and older
   children. Br J Haematol. 2016;175(5):784-828. doi:10.1111/bjh.14233
6. Pieters R, De Lorenzo P, Ancliffe P, et al. Outcome of infants younger than 1 year with acute lymphoblastic
   leukemia treated with the Interfant-06 protocol: results from an international phase III randomized study.
   J Clin Oncol. 2019;37(25):2246-2256. doi:10.1200/JCO.19.00261
7. National Institute for Health and Care Excellence. Neonatal infection: antibiotics for prevention and
   treatment. NICE guideline NG195. London: NICE; 2021.
8. Wilkinson D, Bertaud S, Mancini A, Murdoch E; BAPM Working Group. Recognising uncertainty: an integrated
   framework for palliative care in perinatal medicine. Arch Dis Child Fetal Neonatal Ed. 2025;110(3):236-244.
   doi:10.1136/archdischild-2024-327662
9. Baile WF, Buckman R, Lenzi R, Glober G, Beale EA, Kudelka AP. SPIKES—a six-step protocol for delivering bad
   news: application to the patient with cancer. Oncologist. 2000;5(4):302-311. doi:10.1634/theoncologist.5-4-302

The same strings are `debrief.references`. How they were checked (2026-10-30; PubMed and publisher pages could
not be fetched from this environment, so web-search records were used): ref. 1 — the source map's
`verifiedDoi` (publisher page checked 2026-10-29); ref. 2 — PubMed record 29806701 (volume, issue, pages, DOI);
ref. 3 — bibliographic records (PMID 35732829; an erratum exists, doi:10.1038/s41375-023-01962-5); ref. 4 —
BSH guideline page and repository records (volume 169, pages 661–671, DOI; the issue number was not confirmed
and is left out); ref. 5 — PubMed 27861734 (a 2020 addendum exists); ref. 6 — PMID 31283407 and repository
records; ref. 7 — the NICE guideline page (the 1-hour standard; NICE lists 2026 updates); ref. 8 — journal and
repository records; ref. 9 — PubMed 10964998.

### To verify

**Against the full source article (the source pass):**
* Every patient fact listed in "Clinical numbers check" and "Source and adaptation", word for word.
* The full admission blood panel: haemoglobin, neutrophils, the film description, any nucleated red cells.
* Whether the film reports 原幼淋巴细胞 or 原始细胞 at each time point.
* The immunophenotype panel: CD10, CD20, CD22, myeloid (MPO, CD13, CD33) and T-cell markers, CD15 or NG2 if
  reported.
* The multiplex RT-PCR targets (does it cover KMT2A partners such as AFF1?), whether "limited coverage" is the
  authors' phrase, and whether any FISH or KMT2A test was done.
* CSF examination, chest imaging, cranial imaging, electrolytes/urate, clotting, G6PD.
* What treatment, if any, was given during the 9 days (fluids, uric-acid control, transfusions, antibiotics,
  steroids or chemotherapy) and whether a family meeting or palliative care is described.
* The day count of "day 4" and "day 9" (days in hospital or of life); whether the weight is the birth weight.
* The nodule: why it was not biopsied; any other skin lesions.
* The neonatal outcome: care after discharge, cause and place of death at 45 days, and the family's stated
  reasons for withdrawing treatment.
* Who accompanied the baby (to name the companion by relation) and whether the referral came from another
  hospital or a cord-blood bank.
* `fig01`: what it shows, a descriptive bilingual title, whether it can be attached to a result, and the
  privacy re-review of the grouped approval (critic gap 14).

**Guidance details (secondary sources only in this review):**
* BSH 2015: the exact hydration wording (3 L/m²/day; 200 mL/kg/day below 10 kg?), the rasburicase dose
  (0.2 mg/kg) and G6PD wording, the monitoring frequency for high risk, the risk category "ALL with white cells
  ≥ 100 × 10⁹/L" (adopted from the 2010 TLS panel), and its advice on diuretics.
* Allopurinol dosing in a newborn (the case prints "children commonly about 10 mg/kg/day"; neonatal dosing is
  left to the specialist team).
* BSH 2016 (and its 2020 addendum): the neonatal red-cell and platelet thresholds; any statement on
  transfusion in hyperleucocytosis (the case attributes only "a measured haemoglobin" to BSH 2016; the
  viscosity caution comes from oncology-emergency practice, e.g. children's hospital hyperleucocytosis
  guidelines).
* Exchange transfusion or leukapheresis for neonatal hyperleucocytosis (the ASFA 2023 category was not
  confirmed and is not printed).
* Interfant-06 (Pieters 2019): the high-risk definition — search summaries disagreed on the age criterion
  (younger vs older than 6 months), so the case prints only that KMT2A, age, white count and prednisone
  response decide the outlook; the 6-year EFS 46.1 % and OS 58.2 % were confirmed.
* Newer infant-ALL evidence not cited in the case: blinatumomab added to Interfant-06 chemotherapy (van der
  Sluis et al., N Engl J Med 2023;388(17):1572-1581, doi:10.1056/NEJMoa2214171; 30 infants with KMT2A-rearranged
  ALL, 2-year disease-free survival 81.6 % vs 49.4 % in historical controls) and the NCI PDQ statement that
  infants ≤ 90 days fare worse (seen only in a 2019 mirror) — consider adding after review.
* NICE NG195: the lumbar-puncture wording ("if it is thought safe and will not delay antibiotics") and the
  date of the latest update (NICE lists 2026 changes).
* RCPCH 2015 framework (Larcher et al., Arch Dis Child 2015;100 Suppl 2:s1-s23,
  doi:10.1136/archdischild-2014-306666) is being replaced (RCPCH: late 2026, "Navigating decisions to provide,
  limit or withdraw treatment in children towards the end of life"); not cited in the case for that reason.
* Chinese guidance to add after review: 中华医学会儿科学分会新生儿学组等《新生儿败血症诊断及治疗专家共识（2019年版）》
  (中华儿科杂志 2019;57(4):252-257; DOI not confirmed) and the national children's ALL diagnosis and treatment
  norms (the version — 2018 or 2019 — could not be confirmed).
* Collection contract vs STANDARD §6.6: the contract test matches the English review note with the
  case-sensitive pattern "not yet reviewed by a licensed clinician", which the §6.6 sentence ("… Not yet reviewed
  by a licensed clinician.") does not match; the case keeps all of §6.6's content with the clause moved into the
  first sentence. The coordinator should align the standard and the test.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Story and phases.** `initial` / `workup` / `confirmation` / `followup` → `admission` (18 hours) →
  `work-up` (hospital day 2) → `course` (from day 4) → `outcome`, gated on objectives and decisions, the outcome
  after all five decisions. The deterioration became a phase the learner acts in.
* **Decisions.** 3 → 5, each with 4 options and its own guideline-based feedback: recognition, the first hours
  (tumour-lysis prevention), classification and the missing KMT2A test, the family conversation, the
  deterioration. Option ids `supported` / `stress` / `infection` / `aml` … → content ids; the key is the longest
  option in only one decision per locale.
* **Interventions.** 0 → 16: IV access, potassium-free hydration, allopurinol, fluid chart, monitoring,
  haemato-oncology referral, family meeting, palliative-care referral, antibiotics, platelets and exchange
  transfusion (neutral), and five contraindicated traps with harm texts (red cells for pallor, prednisolone,
  rasburicase without G6PD, fluid restriction with furosemide, routine discharge), plus the ward LP as a harmful
  investigation.
* **History and examination.** 15 template slots (11 "the source case does not provide…" answers, adult
  items such as surgery, regular medicines, function) → 21 neonatal items in the relative's voice (7 required,
  7 honest unknowns in lay words); 2 bundled findings → 9 manoeuvres including the re-examination in `course`;
  `examNotRecorded` now says "This case does not record this examination."
* **Investigations.** 4 bundles → 16 single tests with structured values ("reference range not recorded"),
  critical counts, neutral and harmful records, and honest "No result is recorded for this test." entries.
* **Assessment.** The single critical item on the third decision → 2 critical acts (`rb-tls-prevention`,
  `rb-no-harm` with `scoredWhen`); 12 rubric items with first-try scoring; a SPIKES communication item written
  for this family. Do nothing scores 0; a wrong first answer everywhere scores 50 %.
* **Teaching layer.** 6 learning outcomes, 6 key reasoning steps, 6 teaching points with guidance and year,
  8 unknowns, 3 staff (attending, nurse, haemato-oncology consultant), 9 Vancouver references (DOIs found by
  search), editorial review status with five guidelines and the §6.6 notes.
* **Card and voice.** Title "· 18-hour-old boy"; spoiler-free summary (no "clonal disease") distinct from the
  triage note; 3 patient tags; the relative named in character; persona fields written as actor briefs; no
  authoring language in anything the carer says.
* **Corpus and schema.** 40 paraphrased utterances with negatives; extensions unified (`sourceDoi`,
  `doiVerifiedAt`, `sourceTextChecked: false`; `sourceDoiVerification` dropped as redundant).
* **Media.** `fig01` kept (approved, unattached), retitled.

### 1.0.0

* Initial template version (PR #5, batch 3): 15 history items, 2 exam findings, 4 records, 3 decisions,
  11 rubric items, no interventions.

## Validation

Run from the worktree root (all passed on 2026-10-30):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-655458/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-655458 --lang en          # 82 steps · objectives 6/6 · decisions 5/5 · utterances 40/40 · rubric 30/30
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-655458        # depth floor, do-nothing 0, wrong-first 50 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-655458:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-655458:"   # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 足月男婴，孕38周剖宫产，体重3.08 kg，出生时哭声响、无脐带绕颈。为储存脐血所做的化验发现白细胞很高，
得知结果10小时后（生后18小时）转入新生儿病房。母亲诉孕期无放射线、药物及毒物接触；父母健康、非近亲，5岁哥哥健康，
无遗传病及恶性肿瘤家族史。入院体温36.8 ℃，脉搏128次/分，呼吸36次/分，反应好，面色欠红润，浅表淋巴结未触及，未见皮疹，
腹膨隆，肝肋下4 cm、剑突下2 cm，脾肋下1.5 cm，质韧，边缘钝。入院白细胞513.62×10⁹/L，血小板94×10⁹/L，原幼淋巴细胞95%；
次日白细胞556.94×10⁹/L，原始细胞90%。骨髓原幼淋巴细胞91%，POX阴性；流式异常细胞群89%，表达CD19、cCD79a、CD34、HLA-DR；
核型未见异常，多重RT-PCR（覆盖范围有限）未检出融合基因。报告诊断：先天性B淋巴细胞白血病。住院后出现出血点，第4天腰骶部
紫红色结节（未活检），之后低热、反应变差；第9天家属放弃治疗出院，随访得知生后45天死亡。住院期间的治疗和死因均无记录。
本版事实沿用1.0.0版的提取内容，尚未对照原文全文核对。

**学习目标。**
1. 从极高白细胞、原幼淋巴细胞为主的涂片、肝脾肿大和血小板减少识别外观良好新生儿的先天性白血病，并与类白血病反应、
   唐氏综合征的暂时性异常骨髓造血和计数误差鉴别。
2. 对白细胞≥100×10⁹/L的急性淋巴细胞白血病在确诊前就预防肿瘤溶解（BSH 2015）：不含钾的水化、排除G6PD缺乏前用别嘌醇、
   频繁复查电解质和尿量；避免因面色差输红细胞、确诊前用激素和计划外腰穿。
3. 按WHO第5版（2022）判读免疫分型为B淋巴母细胞白血病，说明正常核型和有限的RT-PCR不能排除KMT2A重排、需要FISH。
4. 说明婴儿急性淋巴细胞白血病要在有经验的中心按婴儿方案治疗，用Interfant-06（2019）的数据讲清获益与负担。
5. 用SPIKES与父母沟通，在结局不确定时共同决策，并与姑息治疗并行计划（BAPM 2025）。
6. 把白血病新生儿的发热和反应变差按疑似晚发型败血症处理（NICE NG195，2021：决定治疗后1小时内静脉抗生素），并排查颅内出血。

**关键决策。** ① 初步判断：新生儿（先天性）白血病，按急症处理，用流式和骨髓定系别，查唐氏特征（干扰项：类白血病反应、
暂时性异常骨髓造血、计数误差）；② 最初几小时：不含钾的水化、别嘌醇、每4–6小时复查、没有实测指征不输红细胞、监护、当天联系
血液肿瘤科（干扰项：输红细胞后换血、先用激素、限液观察）；③ 分型：B系已确立，KMT2A未排除，需FISH并补CD10（干扰项：M0、
标危本院诱导、混合表型）；④ 与家属谈：SPIKES、讲清获益负担和不确定性、并行计划姑息治疗（干扰项：宣布无效、等待自发缓解、
施压签字）；⑤ 病情变化：血培养后1小时内静脉抗生素、查血常规凝血、床旁头颅超声、腰穿待安全（干扰项：肿瘤热、先活检、先腰穿）。
关键项：最初几小时预防肿瘤溶解的处置，以及避免六种危险操作。

**复盘要点（PEARLS）。** 先谈感受；复述最初18小时和最初几小时的处置；分析：涂片为什么指向白血病、为什么确诊前就预防肿瘤溶解、
哪些操作看似合理却危险、阴性遗传学结果能说明什么不能说明什么、怎样和父母谈治疗与姑息、发热和反应变差时先排除什么；最后讨论：
家属放弃治疗后的死亡结局不能证明现代治疗无效。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
