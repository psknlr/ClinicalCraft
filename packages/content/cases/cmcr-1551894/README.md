# cmcr-1551894 — Recurrent leg swelling and abdominal fullness · 35-year-old woman

> **Spoilers for facilitators.** This guide names the diagnosis. Learners open the case from the case
> library, whose title, summary and triage note give nothing away. The patient (姚女士 / Ms Yao) is a
> pseudonymous teaching role; the hospital and the calendar date are removed. Times are relative to the
> presentation (day 0).

## Case card

| | |
|---|---|
| Case | `cmcr-1551894` · v1.1.1 · CMCR collection (`cmcr-20`) |
| Source | 王立恒, 庄聰. 中西醫結合治療巴德-吉亞利綜合征1例. 鏡湖醫學. 2025;25(1):68 (references continued on p. 61) — the journal's Chinese-medicine column (中醫專欄) |
| Setting | Outpatient presentation (`outpatient`) → admission work-up → after angioplasty and stenting → discharge (phase locations) |
| Facility | `general-hospital` |
| Difficulty | 4 / 5 |
| Estimated time | ~35 min (static clock — a staged review of the historical record, no physiology) |
| Specialty | Hepatology, vascular medicine, integrative (Chinese and Western) medicine |
| Languages | zh-CN (the source is in traditional characters; the case uses simplified characters and mainland terms), en |
| Learner level | Final-year medical students, resident doctors in internal medicine, hepatology and interventional radiology; integrated Chinese–Western medicine programmes |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have a hepatologist experienced in vascular liver disease (and a clinical pharmacist for the herb section) review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Localise the obstruction to the inferior vena cava from the upward flow in the chest and abdominal
   wall veins, and link the leg oedema, gaiter pigmentation, ulcers and the enlarged liver and spleen to
   it.
2. Recognise IVC-type Budd–Chiari syndrome on Doppler ultrasound and MRI and distinguish it from
   cirrhosis, cardiac congestion (constrictive pericarditis, right heart failure), sinusoidal obstruction
   syndrome and secondary compression.
3. Interpret the low counts with a massive spleen as most likely hypersplenism, and state the evidence
   limits while liver tests and her thyroid treatment are unknown.
4. Outline current management with EASL 2025 — early anticoagulation, a cause work-up, stepwise
   angioplasty, TIPS and transplantation, multidisciplinary care — and identify what the report does not
   report (anticoagulation, the cause, variceal assessment).
5. Assess the bleeding risk of blood-activating herbs such as danshen and leech combined with
   anticoagulation and thrombocytopenia, involve the pharmacist, and explain why a single case cannot
   show an independent effect of the herbs.

These are `learningOutcomes` in `case.json`. They name the diagnosis, so front-ends show them before
play only behind the closed "Learning outcomes (5) · may reveal the diagnosis" disclosure and list them
in every debrief (CASE_AUTHORING §9.4, GLOSSARY §4).

## Clinical summary

A 35-year-old woman presents with more than ten years of recurrent swelling of both ankles, worse after
sitting and relieved by diuretics she took on her own (the drug is not named); nothing else bothered her
at first and she was never properly assessed. Over the past year the veins on her chest and abdomen have
become prominent, her upper abdomen feels full, the skin low on both shins has darkened and broken down,
she itches all over with a rash, and the leg swelling keeps returning. She has a history of
hyperthyroidism.

Examination (as printed): red tongue with a scant coating and a thready, rapid pulse (TCM descriptions);
hyperthyroid facies, an anaemic appearance and a thin build; a scattered rash all over, most marked on
the back, not weeping; prominent varicose veins over the front and sides of the chest and the abdominal
wall with **flow from below upwards**; a full, soft, non-tender abdomen; the liver palpable below the
costal margin and a **massive firm spleen**; "肝區無移動性濁音" (see Source and adaptation); gaiter-area
pigmentation with scattered healed wounds and grade II pitting oedema of both legs. No vital signs are
recorded.

Admission tests: WBC 2.5 ×10⁹/L, RBC 3.72 ×10¹²/L, haemoglobin 97 g/L, platelets 60 ×10⁹/L; ESR 14 mm/h;
thyroid function normal; coagulation, rheumatology, glucose, HbA1c, tumour markers, renal function,
electrolytes, sex hormones and stool "broadly normal"; **no liver function tests are reported**. Doppler
ultrasound: enlarged liver, spleen 74 mm thick, a patent main portal vein (12 mm) with hepatopetal flow
at 21 cm/s, widened hepatic veins (13–15 mm), a narrowed proximal IVC outflow channel with a peak
systolic velocity of 269 cm/s and aneurysmal dilatation beyond it (33 mm). MRI: a markedly enlarged liver
with disproportionate lobes; dilated, tortuous intrahepatic veins; a fusiform IVC up to 4.3 cm wide with
the intrahepatic segment narrowed to 1.3 cm; a markedly enlarged spleen, dilated splenic and abdominal
wall veins and abundant collaterals. The authors diagnose **Budd–Chiari syndrome** (IVC type).

Management in the report: balloon dilatation and stent placement during the admission, then a modified
Huoxue Tongmai decoction (活血通脉汤加减; later adding danshen, leech, chuanniuxi, chaihu and cheqianzi).
After 13 days of combined treatment her symptoms had settled, the repeat blood count and ultrasound were
"clearly better" and she was discharged; Figs 1–3 show the veins, the back rash and the legs before and
after. The report gives no anticoagulation, cause work-up, variceal assessment, bleeding monitoring or
follow-up after discharge — the case's teaching gap.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`), no `physiology` block: this is a staged historical review, not a
physiological simulation. The learner switches between the first two phases; the last two open
themselves.

| Phase | When (relative) | Location (embodied) | What the learner can do |
|---|---|---|---|
| `initial` 就诊（门诊） | Day 0 | outpatient consult room | Her history (onset, modifiers, self-medication, the past year's changes, hyperthyroidism, the unknowns), the examination, `dec-localise` |
| `workup` 住院检查 | The admission (no days given) | ward bed (`location: inpatient`) | Blood tests, Doppler ultrasound, MRI, the unreported tests (liver tests, cause work-up, echocardiogram, gastroscopy), `dec-dx`, `dec-management`, MDT, anticoagulation, transfer to the IR suite, angioplasty and stenting |
| `treatment` 介入治疗后 | After the stenting | ward bed | Locked (`learnerSwitchable: false`); opens when `transfer-ir` and `angioplasty-stent` have been given; the procedure record and the herbal prescription (record reviews), the pharmacist's review, `dec-herbs` |
| `followup` 出院时 | After 13 days of combined treatment | ward bed | Locked; opens when all four decisions are answered and the stent is in; the discharge record, the repeat blood count and ultrasound (no values in the source), re-examination with Figs 1–3 |

The source gives one calendar date (the presentation, now day 0) and the 13 days of combined treatment;
the admission, the procedure and the start of the decoction are undated, and each result's `date` says
so.

## Decisions and assessment

### Objectives (HUD task list)

1. **Take the history of the swelling** — onset, modifiers, the self-medication, the past year's changes,
   past illnesses.
2. **Examine her and localise the obstruction** — chest and abdominal wall veins (flow direction),
   abdomen, legs, then `dec-localise`.
3. **Vascular imaging and the diagnosis** — Doppler ultrasound and MRI (admission phase), then `dec-dx`.
4. **Plan treatment and open the obstruction** — `dec-management`, MDT, transfer to the IR suite,
   angioplasty and stenting.
5. **After the stent: anticoagulation and the herbs** — the prescription record, `dec-herbs`, pharmacist
   review, anticoagulation.
6. **Review the outcome at discharge** — the discharge record.

### Decisions (5 options each; every option has its own feedback)

| id | kind | opens when | correct answer | distractors |
|---|---|---|---|---|
| `dec-localise` | single | veins, legs and abdomen examined + the past year's changes (or the veins) asked | IVC obstruction at or above its hepatic segment: the lower body drains upwards through wall collaterals | portal hypertension (cirrhosis) · SVC obstruction · leg DVT / chronic venous insufficiency · right heart failure or constrictive pericarditis |
| `dec-dx` | single | Doppler and MRI read (admission) + veins examined | IVC-type Budd–Chiari syndrome | cirrhosis with portal hypertension · sinusoidal obstruction syndrome · cardiac congestion from constrictive pericarditis · tumour invasion or external compression |
| `dec-management` | single | `dec-dx` decided + blood count read | stepwise: anticoagulation (weighing the thrombocytopenia), a cause work-up and MDT, with angioplasty and stenting of the focal IVC narrowing; TIPS if that fails, transplantation last | stent then herbs instead of anticoagulation (the report's own course) · carry on with diuretics · immediate transplant referral · TIPS first |
| `dec-herbs` | single | prescription record read (treatment) + blood count read | before the herbs and anticoagulation are given together, a herb-by-herb review by the clinical pharmacist and the TCM team; stop or adjust; monitor platelets, INR and bleeding | give both ("natural, no risk") · the decoction instead of anticoagulation · never anticoagulate because platelets are 60 · keep the decoction off the medication record |

`dec-localise` opens before any imaging, so the bedside sign is tested on its own; `dec-dx` names the
differentials the audit asked for, and two of its feedback texts point out that no echocardiogram is
reported (a cardiac cause is excluded by definition before the diagnosis is final). `dec-management`
makes the report's own course a distractor.

### Rubric (11 deterministic items, 23 points, + 1 examiner-judged)

| Domain | Item | Weight |
|---|---|---|
| History | Onset, modifiers, self-medication, the past year's changes, hyperthyroidism | 2 |
| History | Asked about clots, bleeding and pregnancy or hormones (none recorded) | 1 |
| Examination | Chest and abdominal wall veins with flow direction, abdomen (liver, spleen), legs | 3 |
| Diagnosis | `dec-localise` right at the first attempt | 2 |
| Investigations | Doppler ultrasound and MRI read in the admission phase | 2 |
| Investigations | Blood count and thyroid/routine tests read; liver tests requested (not in the report) | 1 |
| Diagnosis | `dec-dx` right at the first attempt | 3 |
| Management | `dec-management` right first time + MDT + angioplasty and stenting | 3 |
| Management | Anticoagulation started + cause work-up ordered | 2 |
| Safety | `dec-herbs` right first time + clinical pharmacist review (annotation: `critical`) | 3 |
| Safety | No TIPS once the management is decided (counts only after `dec-management` is attempted; annotation: `scoredWhen`) | 1 |
| Communication (examiner) | Explaining the diagnosis, the procedure, long-term anticoagulation and the risks of the herbs to her | 2 |

### How wrong choices score

Decisions are scored with `decidedFirstTry`: a wrong first answer followed by the right one unlocks the
case but loses the item. These actions are **contraindicated** and appear as safety events:

* `tips` — always (the IR team declines; the harm text explains the stepwise order); it also loses the
  stepwise safety item.
* `transfer-ir` and `angioplasty-stent` before any vascular imaging has been read.
* `anticoagulation` after the decoction has been given without the pharmacist's review, and the
  `decoction` on top of anticoagulation without that review (platelets 60 ×10⁹/L, blood-activating
  herbs).

`diuretic-only` and `transplant-referral` are neutral; their responses explain why they do not treat the
cause or come too early. The liver tests, the cause work-up, the echocardiogram and gastroscopy can be
ordered and return "not reported" (`available: false`).

## Reference path (`solution`)

71 steps: 22 history questions in the presentation phase (12 of them unknowns), 8 examinations and
`dec-localise`; in the admission phase the blood count, ESR, thyroid and routine tests, liver tests (not
reported), Doppler, MRI and the cause work-up (not reported), then `dec-dx`, `dec-management`, MDT,
**anticoagulation as soon as the management is decided**, transfer to the IR suite and angioplasty with
stenting; after the stent, the (unrecorded) "how are you" question, the procedure record, the herbal
prescription, the pharmacist's review and `dec-herbs`; at discharge her account, the three
re-examinations with Figs 1–3, the discharge record and the repeat blood count and ultrasound; finish. It
scores **23/23** with no contraindicated action (clinical and embodied mode alike).

## Clinical numbers check

* **Blood count.** WBC 2.5 ×10⁹/L ↓, RBC 3.72 ×10¹²/L, Hb 97 g/L ↓, PLT 60 ×10⁹/L ↓ — arrows as printed;
  the source gives no reference ranges, so none are added. ESR 14 mm/h.
* **Doppler.** Spleen 74 mm thick; main portal vein 12 mm, hepatopetal, 21 cm/s; hepatic veins
  13–15 mm; PSV 269 cm/s at the narrowed proximal IVC outflow; distal IVC 33 mm (structured `values`).
* **MRI.** IVC up to 4.3 cm (fusiform); intrahepatic IVC narrowed to 1.3 cm.
* **Two IVC diameters.** 33 mm on ultrasound vs 4.3 cm on MRI — different methods and probably levels;
  both are kept as printed, and the radiologist NPC says so.
* **Decoction.** Twelve herbs at 10 g (chuanxiong, danggui, mudanpi, chishao, gancao, taoren, honghua,
  zhiqiao, yanhusuo, xiangfu, wuyao, wulingzhi), baizhu 15 g, fuling 20 g and zhuling 20 g — 175 g of
  crude herbs per daily dose, decocted and taken as 2 × 150 ml; later danshen 10 g, shuizhi (leech) 10 g
  and chuanniuxi 10 g, with chaihu and cheqianzi (doses not given).
* **Duration.** 13 days of combined treatment to discharge; the repeat tests have no values.
* **Anticoagulation (added from guidance, not in the source).** Treatment-dose LMWH by weight and renal
  function, then a VKA with a target INR of 2–3; no weight is recorded, so no milligram dose is given.
  The case sets no platelet threshold: it teaches weighing PLT 60 ×10⁹/L with haematology and monitoring.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "She lived with swollen legs for ten years before anyone looked properly. How did it
   feel to piece her story together?"
2. **Description** — "Summarise the presentation and the examination findings that mattered most."
3. **Analysis**
   * "Which way did the abdominal wall veins flow, and what did that tell you before any imaging?"
   * "How do you tell IVC obstruction from portal hypertension, SVC obstruction and cardiac congestion at
     the bedside — and what is missing here to exclude a cardiac cause?"
   * "What did the Doppler and the MRI each add? Why might the two IVC diameters differ?"
   * "What explains the low counts, and what would you still want to know?"
   * "The report stented her but reports no anticoagulation or cause work-up. What does current guidance
     add, and in what order?"
   * "A decoction with danshen and leech is prescribed for a newly stented patient with platelets of 60
     who needs anticoagulation. What do you do, and whom do you involve?"
   * "The authors credit the combined treatment for the improvement at 13 days. What can a single case
     tell you, and what can't it?"
4. **Summary** — "What will you look for the next time a patient has long-standing leg oedema treated
   with diuretics?"

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| Treating long-standing oedema as benign | `no-care` answer; `diuretic-only` response; `mgmt-diuretic` feedback; key reasoning 2 |
| Not checking the direction of flow | `dec-localise` requires the vein examination; `loc-portal` and `loc-svc` feedback |
| Calling it cirrhosis from a big spleen and low counts | `dx-cirrhosis` feedback; liver tests "not reported"; key reasoning 4 |
| Forgetting a cardiac cause | `loc-cardiac` and `dx-cardiac` feedback; the echocardiogram is orderable but not reported |
| Copying the report's management | `mgmt-report` distractor (stent then herbs, no anticoagulation) |
| Jumping to TIPS or transplantation | `tips` contraindicated; `mgmt-tips`, `mgmt-transplant`; `transplant-referral` response |
| No cause work-up | cause work-up orderable ("not reported"); anticoagulation rubric item; teaching point 4 |
| Combining herbs and anticoagulation unchecked | contraindications; `dec-herbs`; weight-3 safety item; pharmacist NPC |
| Abandoning anticoagulation because of PLT 60 | `herb-no-anticoag` feedback |
| Crediting the herbs with the result | `followup` note; key reasoning 6; boundaries |

### Teaching points (as in the debrief)

1. Localise at the bedside: upward wall-vein flow, leg changes and hepatosplenomegaly — "一黑二大三曲张"
   (the source's discussion; a bedside sign, not a guideline recommendation).
2. Imaging confirms site and nature; consider BCS in liver disease of unknown cause; the differential
   and the missing echocardiogram and liver tests (AASLD 2020).
3. Current management is stepwise: early, usually long-term anticoagulation, the cause, then
   angioplasty/stenting, TIPS, transplantation, in an experienced MDT (EASL 2025; EASL 2016; APASL 2021).
4. Every BCS needs a cause work-up (EASL 2025; APASL 2021).
5. Assess herbs before combining them with anticoagulation (Chua 2015); one case cannot show their
   effect.

The interpretation of the low counts (hypersplenism likeliest; liver tests and her thyroid treatment
unknown; PLT 60 ×10⁹/L weighed with haematology) is key reasoning 4 rather than a teaching point, because
no guidance was checked for it.

## Embodied mode

* **Where the patient goes.** The case `setting` is `outpatient` (a consult room). Phase locations move
  her: `workup`, `treatment` and `followup` → the first ward bed (`{"setting": "inpatient"}`); `initial`
  names `outpatient`, so switching back puts her in clinic again. Nothing is charged for these moves.
* **Investigations.** Blood tests (`lab-hematology`, `lab-chemistry`, `lab-endocrine`; the cause work-up
  also `flow-cytometry` and `lab-serology`) are sampled at her side. Doppler (`ultrasound`) is done at the
  bedside or the ultrasound console; the MRI (`mri`) needs her taken to the scanner; the echocardiogram
  (`echocardiography`) and gastroscopy (`endoscopy`) are orderable but have no result in the source.
* **Record reviews.** The procedure record, the herbal prescription and the discharge record are
  `category: "record"` with `requires: ["records"]` and `risk: "none"`: they are read at a records
  terminal, never on a device. The annotation file adds `performedAt: "records"` for them.
* **The procedure.** `angioplasty-stent` needs the C-arm (`requires: ["fluoroscopy"]`), so the case has
  a separate transfer, `transfer-ir` (`kind: "disposition"`, `destination: {"capability":
  "fluoroscopy"}`), that takes her to the cath-lab table first — the STEMI case's `transfer-cath-lab`
  pattern; entering `treatment` returns her to the ward. `tips` also requires fluoroscopy (on the ward
  the world refuses it; at the C-arm it is contraindicated).
* **Scope of practice.** `angioplasty-stent` and `tips` are `scope: "medical"`; the MDT, pharmacist and
  transplant consults can be placed from anywhere; anticoagulation and the decoction are bedside
  medicines.
* **Figures.** Figs 1–3 open with the discharge re-examinations (`veins-after`, `rash-after`,
  `legs-after`) only.
* The offline demonstration scores 23/23 in both clinical and in-world mode.

## Source and adaptation

**From the report (paraphrased):** age, sex, the chief complaint and the ten-year history (ankle
swelling, worse with sitting, self-medicated diuretics, nothing else at first, never systematically
assessed); the past year's changes; hyperthyroidism; the examination, including the TCM tongue and pulse
descriptions; the blood count, ESR, thyroid function and the list of "broadly normal" tests; the Doppler
and MRI reports in full; balloon dilatation and stenting; the decoction with its doses, preparation and
later additions; 13 days of combined treatment; the improvement and discharge; Figs 1–3; the discussion's
definition and its "一黑二大三曲张".

**Adapted for teaching:** dialogue and lay wording; the first encounter staged as an outpatient visit
(the report says only "就診", presented) followed by an admission; four phases with relative times; the
procedure, the prescription and the discharge as record reviews; decisions, interventions (MDT, transfer
to the IR suite, anticoagulation, pharmacist review, diuretics only, TIPS, transplant referral), rubric
and debrief; the unreported tests (liver function, cause work-up, echocardiogram, gastroscopy) as
orderable items whose result says "not reported". Anticoagulation, the cause work-up, variceal
assessment and the pharmacist's review are **not** in the report and are labelled as added from current
guidance; the anticoagulation intervention's response says so.

**Labelled contradictions and unclear source text (kept, not resolved):**
* "肝區無移動性濁音" (no shifting dullness in the liver region): shifting dullness is a sign of ascites,
  not of the liver region; it most likely means no shifting dullness was found — `ascites` finding (as
  printed, with the caveat) and `unknowns`.
* The IVC diameter: 33 mm on ultrasound vs 4.3 cm on MRI — both kept; radiologist NPC.
* "B超靈敏度及特異度為最高，約85%" — the authors' citation of the literature; not used as a fact
  (radiologist NPC).
* The authors attribute the result to the combined treatment — the `followup` note, key reasoning 6 and
  the boundaries say one case cannot separate the herbs' effect.
* "各項異常指正" (the repeat tests) is a misprint for 指標 and is rendered as 指标 / "measurements".

**De-identification:** the calendar date of the presentation → day 0; the hospital is not named in case
text (the journal title in the citation is kept).

**Figures and PDF:** Figs 1–3 (before-and-after composites of the chest and abdominal wall, the back and
the legs) were viewed: no face, name, ID, hospital or date. They show the outcome, so they open only in
the followup phase; their titles and credits are rewritten. The source PDF (3 pages) was viewed in full:
page 1 is journal p. 68 (this report, "下轉61頁"); page 2 is journal p. 61 — the end of another article,
then this report's continued references; page 3 is the journal's back cover with this report's Figs 1–3
and other articles' clinical images. No patient identifier; one of the other articles' images (a software
screenshot) shows a file path containing a computer user name, not a patient's. The PDF title now says
what pages 2–3 hold. Nothing was withdrawn.

## Matcher notes

* 24 history items (4 required), 11 exam findings (3 required), 12 investigations, 9 interventions.
* Phase restriction carries the timeline: presenting-complaint items are `initial` + `workup`;
  `status-treatment` (unrecorded) is `treatment`-only and `status-discharge` is `followup`-only
  (`supersedes: ["status-treatment"]`); past history and the unknowns are available in every phase.
* `excludeKeywords` keep look-alikes apart: duration vs what makes the swelling worse (`presentation` vs
  `modifiers`, skin, abdomen); past illnesses vs her thyroid treatment, clots and the family
  (`pmh`); medicines vs allergies, thyroid and the pill; clots vs the family; work vs "sitting for long";
  the TCM pulse vs 静脉 (the single character 脉 matched "veins"); wall veins vs jugular and leg veins;
  palpation vs shifting dullness; angioplasty vs TIPS; anticoagulation and the decoction vs the
  pharmacist's review.
* `orderMatching`: an order that names the heart (心脏, 心超, 超声心动, echo) drops `doppler`, which also
  answers to 超声 / 彩超.
* English multi-word keywords that would reduce to one token are written run together (`whendiditstart`,
  `seenadoctor`, `beentohospital`, `lookedinto`, `godown`, `thepill`, `workforaliving`,
  `howareyoufeeling`).
* 40 `extensions.testUtterances` (21 zh-CN, 19 en; every required item has at least one) pass `cases
  verify`; a separate realistic probe set (track notes) reached 38/38 history, 18/18 exam, 17/17 orders
  and 11/11 interventions (PR #3's audit probe: 2/17 history, 1/8 exam).

## References

1. 王立恒, 庄聰. 中西醫結合治療巴德-吉亞利綜合征1例. 鏡湖醫學. 2025;25(1):68 (references continued on
   p. 61). https://rs.yiigle.com/cmaid/1551894. doi:10.12408/j.issn2223-4462.2025.01.021
2. European Association for the Study of the Liver. EASL Clinical Practice Guidelines on vascular diseases
   of the liver. J Hepatol. 2026;84(2):399-456. doi:10.1016/j.jhep.2025.08.001
3. European Association for the Study of the Liver. EASL Clinical Practice Guidelines: vascular diseases
   of the liver. J Hepatol. 2016;64(1):179-202. doi:10.1016/j.jhep.2015.07.040
4. Northup PG, Garcia-Pagan JC, Garcia-Tsao G, Intagliata NM, Superina RA, Roberts LN, et al. Vascular
   liver disorders, portal vein thrombosis, and procedural bleeding in patients with liver disease: 2020
   practice guidance by the American Association for the Study of Liver Diseases. Hepatology.
   2021;73(1):366-413. doi:10.1002/hep.31646
5. Shukla A, et al. Budd-Chiari syndrome: consensus guidance of the Asian Pacific Association for the
   study of the liver (APASL). Hepatol Int. 2021;15(3):531-567.
6. Chua YT, Ang XL, Zhong XM, Khoo KS. Interaction between warfarin and Chinese herbal medicines.
   Singapore Med J. 2015;56(1):11-18. doi:10.11622/smedj.2015004

The same strings are `debrief.references` in `case.json`. How each was checked (2026-10-28):
ref. 1 — the DOI printed in the article's PDF footer and the export record (doi.org, Crossref and
rs.yiigle.com are not reachable from this environment); refs. 2–4 and 6 — PubMed or journal records found
by web search (PMID 41224629, published online 2025-11-12, replacing the 2016 guideline; PMID 26516032;
PMID 33219529; Singapore Med J 2015); ref. 5 — the journal record, without a DOI (not verified). The
editorial check is labelled "EASL 2025" in the case text (the guideline's year; the journal issue is
2026).

### To verify

* EASL 2025 (ref. 2): the exact wording of the BCS recommendations the case paraphrases — the stepwise
  sequence, anticoagulation "as soon as possible, generally indefinitely", LMWH then VKA, a DOAC when
  liver function is preserved, transplantation from the outset only in acute liver failure — and whether
  it states a VKA INR target (the case uses 2–3, the usual VKA target).
* The BCS definition the `dx-bcs` feedback uses (hepatic venous outflow obstruction with cardiac causes
  excluded) as worded in EASL 2016/2025.
* AASLD 2020 (ref. 4): its BCS anticoagulation wording — the case cites it only for considering BCS in
  liver disease of unknown cause.
* APASL 2021 (ref. 5): the DOI, and the wording of anticoagulation as first line, IVC recanalisation in
  the Asia-Pacific and testing for myeloproliferative disorders and thrombophilia (the last taken from a
  commentary on the guidance).
* Chua 2015 (ref. 6): the danshen–warfarin wording (the case says only "reported to potentiate
  warfarin").
* 水蛭 (leech) as a 破血 ("blood-breaking") herb in the Chinese Pharmacopoeia (2020 edition) — confirmed
  from secondary sources only; no pharmacopoeia reference is cited.
* The mainland term 布-加综合征 against the 全国科学技术名词审定委员会 entry (termonline).
* The source DOI (ref. 1) against the publisher's landing page.

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

* **Options rebalanced so the key is not cued by length.** The keyed option was the uniquely longest in all 4
  single-best decisions in both languages; now it is in one (`dec-herbs`). Each distractor states its reasoning in the
  key's register: portal hypertension from the massive spleen and abdominal wall veins; SVC obstruction from the chest
  wall veins; leg venous disease from ten years of swelling and gaiter changes; right heart failure from the liver,
  oedema and veins; cirrhosis from the uneven, disproportionate liver and dilated splenic vein; SOS from blocked small
  hepatic veins; constriction from the widened IVC and hepatic veins; compression with dilatation beyond the
  narrowing; herbs instead of anticoagulation (the report's course) because of the platelet count; diuretics with
  three-monthly review; early transplantation for advanced disease; TIPS first to decompress liver and spleen; herbs
  and anticoagulant together because the herbs are natural and act differently; herbs to keep the stent open; no
  anticoagulation with platelets that low; herbs kept off the drug chart. The `dec-dx` key now names the imaging it
  rests on (the focal narrowing, its high-velocity flow and the dilatation beyond it); the other keys are tighter
  wording of the same plan. The feedback of the report's course and of the diuretic option also answers the platelet
  argument. Correct flags and scoring are unchanged.
* **Option ids:** all already name their content; none changed.
* **Matcher corpus:** two test utterances were keywords of their items (`cases validate --strict`): 「什么时候肿得厉害？」
  (`modifiers`) and 「甲亢吃过什么药？」 (`thyroid-treatment`) are now the paraphrases 「一般什么时候会更肿一些？」 and
  「你甲亢当时是怎么治疗的？」. No history item, answer or keyword changed.

### 1.1.0 — 2026-10-28 (editorial revision)

* **Current management taught** (audit A1, S2): `dec-management` rebuilt on the EASL 2025 stepwise
  approach (anticoagulation, cause work-up, MDT, angioplasty/stent, TIPS, transplantation) with the
  report's own course, diuretics, early transplant and TIPS-first as distractors; teaching points 3–4;
  anticoagulation, MDT, TIPS and transplant referral as interventions. Replaces `management`.
* **Herb safety** (A2, S2): the full decoction restored as a record review (doses, preparation, later
  additions, 13 days); `dec-herbs`, the pharmacist's review and contraindications for combining herbs and
  anticoagulation without it; teaching point 5; Chua 2015 added.
* **Decisions** (E2, S2): four decisions — `dec-localise`, `dec-dx` (replaces `diagnosis`, with the
  differentials of A3), `dec-management`, `dec-herbs` — five options each, distinct feedback, scored with
  `decidedFirstTry`.
* **Interventions** (E3, S2): 9 — MDT, transfer to the IR suite, angioplasty and stenting (the report's
  step), anticoagulation (added from guidance), the decoction (the report's step), pharmacist review,
  diuretics only, TIPS (contraindicated), transplant referral.
* **Rubric** (E4, S2): 12 items (11 deterministic, 23 points; 2 safety items; 1 judged communication
  item).
* **Learning outcomes** (E1, S2): 5; 6 key-reasoning points (the fourth interprets the low counts, A4);
  5 teaching points, each naming the guidance it rests on (the bedside one names the source's
  discussion); `unknowns` extended (vital signs, liver tests, the cause work-up, procedure details).
* **Matcher** (F1, S2): keywords rewritten (≥ 4 per item and locale, lay and clinical, both languages);
  40 genuine test utterances.
* **Source facts restored** (A4, B1–B6): general appearance and the TCM tongue and pulse; the generalised
  rash; the "肝區無移動性濁音" finding (labelled); the full Doppler and MRI reports with structured
  values; ESR and the routine tests; the onset ("nothing else") and "never systematically assessed"; a
  history item for her (unrecorded) thyroid treatment.
* **Consistency** (C1–C3): `thyroid` renamed "Thyroid function and other routine tests" and requires
  `lab-endocrine`, `lab-chemistry` and `lab-hematology`; the vein examination (now required) is separate
  from abdominal palpation; a presentation-only summary and a different triage note; lay first-person
  answers.
* **Register** (D1–D3): 布-加综合征（Budd-Chiari综合征） with a hyphen; lay English ("water tablets"); the
  library's fallback voice; title "35-year-old woman".
* **Phases**: presentation (outpatient) → admission → locked after-stent phase → locked discharge;
  `setting` is now `outpatient`.
* **Embodied** (F5): `transfer-ir` takes her to the C-arm before the angioplasty; `build: "slim"`.
* **References** (F2): Vancouver strings; EASL 2025 by DOI (the unconfirmed PII link removed), EASL 2016,
  AASLD 2020, APASL 2021 and Chua 2015 added.
* **Governance** (E5, F3, F5): `provenance.review` (editorial), version 1.1.0, difficulty 4, ~35 min; this
  README; asset titles say what the PDF pages hold; credits name the authors (as printed, in Chinese
  characters — the report gives no English byline).
* Removed ids (none are referenced by tests or e2e): history `skin` (split into `skin-legs` and
  `itch-rash`), decisions `diagnosis` and `management`, objectives `objective-1`…`objective-4`, rubric
  `rubric-1`…`rubric-4`. Kept: phases `initial`, `workup`, `followup`; investigations `cbc`, `doppler`,
  `mri`, `thyroid`, `followup`; exam `veins`, `abdomen`, `legs`; assets `fig01`–`fig03`, `source-pdf`.
* Not changed: the CLI `cases show` card prints the citation (whose title names the diagnosis) before
  play (F4) — a framework matter.

### 1.0.0

* Initial CMCR adaptation (PR #3).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1551894/case.json --strict   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1551894        # solution 71 steps · objectives 6/6 · decisions 4/4 · utterances 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1551894
npm run -s cc -- exec --case cmcr-1551894 --autopilot --approval bypass --provider offline --output-format json             # 23/23
npm run -s cc -- exec --case cmcr-1551894 --autopilot --approval bypass --provider offline --output-format json --embodied  # 23/23
npm run cc -- play cmcr-1551894 --provider offline
```

## 中文摘要

**病例概要。** 35岁女性，双踝反复浮肿10余年，久坐加重，自服利尿剂（药名不详）可消退，未系统诊治。近1年胸、腹壁静脉
曲张显露，上腹胀满，双小腿下部色素沉着伴皮损，全身瘙痒、皮疹；既往甲亢。查体：舌红苔少、脉细数（中医描述）；甲亢面容、
贫血貌、形体消瘦；全身散在皮疹，后背明显；胸前、两侧胸壁和腹壁静脉曲张，**血流由下向上**；肝肋下可及，巨脾质硬；原文
“肝区无移动性浊音”（照录并标注）；足靴区色素沉着、创面已愈合，双下肢Ⅱ度凹陷性水肿。血常规WBC 2.5×10⁹/L、Hb 97 g/L、
PLT 60×10⁹/L；未报告肝功能。超声：门静脉通畅、向肝血流，肝静脉增宽，下腔静脉近端狭窄（峰值流速269 cm/s）、远端瘤样扩张
（33 mm）；MRI：肝内段下腔静脉狭窄至1.3 cm，下腔静脉最宽4.3 cm，巨脾和大量腹壁侧支。诊断为下腔静脉型布-加综合征。原报告
行球囊扩张和支架植入，术后服活血通脉汤加减（后加丹参、水蛭、川牛膝等），中西医结合治疗13天后症状缓解、复查“明显改善”出院；
没有报告抗凝、病因筛查、静脉曲张评估或出血监测。

**学习目标。**
1. 根据胸腹壁静脉血流方向（由下向上）把梗阻定位在下腔静脉，并把下肢水肿、足靴区色素沉着、溃疡和肝脾大与之联系起来。
2. 结合多普勒超声和MRI识别下腔静脉型布-加综合征，并与肝硬化、心源性淤血（缩窄性心包炎、右心衰竭）、肝窦阻塞综合征和继发性压迫相鉴别。
3. 把巨脾伴全血细胞减少解释为最可能的脾功能亢进，并指出肝功能和甲亢用药缺失时的证据边界。
4. 按EASL 2025概述现行处理——尽早抗凝、病因筛查、阶梯式的血管成形、TIPS和肝移植，多学科管理——并指出原报告没有报告的内容（抗凝、病因、静脉曲张评估）。
5. 评估活血类中药（如丹参、水蛭）与抗凝、血小板减少同用的出血风险并请药师评估，同时说明为什么单个病例不能证明中药的独立疗效。

**关键决策。** ① 定位：血流由下向上 → 下腔静脉（肝段或其以上）梗阻（不是门静脉高压、上腔静脉梗阻、单纯下肢静脉病或心源性）；
② 诊断：下腔静脉型布-加综合征（鉴别肝硬化、肝窦阻塞综合征、缩窄性心包炎、肿瘤压迫；超声心动图原文没有，正式诊断前应补做）；
③ 处理：按EASL 2025阶梯策略——抗凝（权衡血小板减少并监测）、病因筛查、多学科评估，同时对局限性狭窄行血管成形和支架，无效再
TIPS，最后肝移植（原报告“支架后以中药代替抗凝”的做法是干扰项）；④ 中药与抗凝：同用之前请临床药师和中医科逐味评估活血、
破血类药物的出血风险和相互作用，决定停用或调整，并监测血小板、INR和出血征象。

**复盘要点（PEARLS）。** 先谈感受，再复述病史和关键体征；分析环节聚焦：血流方向如何定位梗阻；床旁如何区分下腔静脉梗阻、门静脉
高压、上腔静脉梗阻和心源性淤血，本例缺什么检查；超声和MRI各补充了什么、两个下腔静脉直径为何不同；全血细胞减少的解释和尚缺的
信息；现行指南在原报告之外补充了什么、顺序如何；含丹参、水蛭的汤剂遇上需要抗凝、血小板60×10⁹/L的患者该怎么办、找谁；单个病例
能说明什么、不能说明什么。抗凝、病因筛查、静脉曲张评估和药师评估是按现行指南加入的教学内容，原报告未记录；“肝区无移动性浊音”
和两个下腔静脉直径保留原样并标注。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
