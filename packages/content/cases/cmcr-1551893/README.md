# cmcr-1551893 — Enlarging left scrotal mass · 40-year-old man

> **Published-case adaptation / 已发表病例改编.** Adapted from a case report in 鏡湖醫學 (Medical Journal of
> Kiang Wu) 2025 (CMCR collection, see [docs/CMCR_CASES.md](../../../../docs/CMCR_CASES.md)). The patient's
> name (韩先生 / Mr Han) is a pseudonym; hospital and calendar dates are removed. Dialogue, decisions and
> scoring are teaching material; it is not medical advice.
> 本病例依据已发表病例报告改编，患者为化名，已去除医院与日历日期；对话、决策和评分为教学设计，不构成医疗建议。

## Case card

| | |
|---|---|
| Case | `cmcr-1551893` · v1.1.1 |
| Source | 葉蔭霆, 陳泰業, 張錦標. 成人睾丸纖維性假瘤1例. 鏡湖醫學. 2025;25(1):66-67 (title names the diagnosis — facilitators only) |
| Setting | Urology outpatient clinic (`outpatient`), then theatre and a post-operative clinic visit |
| Facility | `general-hospital` (consult room 1; CT, MRI, theatre, pathology) |
| Difficulty | 3 / 5 |
| Estimated time | ~25 min (static clock: no physiology, results immediate) |
| Specialty | Urology, pathology |
| Languages | zh-CN (source language of the adaptation), en |
| Learner level | Final-year medical students, foundation/intern doctors, urology and surgical trainees |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have a urologist and a pathologist review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Examine a scrotal mass and combine palpation with ultrasound to judge whether it arises from the testis
   or beside it, managing any solid intrascrotal mass as possibly malignant until histology says otherwise.
2. Complete the EAU 2026 pre-operative work-up — bilateral testicular ultrasound, serum AFP, hCG and LDH,
   and staging CT — recognising that a normal β-hCG (or PSA) neither replaces nor completes that panel.
3. Choose an inguinal approach with frozen section for an indeterminate, marker-negative mass, so that a
   benign lesion is removed and the testis kept (radical inguinal orchidectomy if malignant), and never
   biopsy through the scrotum.
4. Before surgery, discuss the possible loss of the testis and sperm banking with the patient (EAU 2026,
   strong recommendation), and afterwards explain a benign result and the follow-up in plain words.
5. Interpret a fibrous pseudotumour report — mesothelial markers, mixed B and T lymphocytes, IgG4⁺ counts
   against the IgG4/IgG ratio — without diagnosing IgG4-related disease or starting treatment on cell
   counts alone (Boston consensus 2012).

These are `learningOutcomes` in `case.json`. They name the diagnosis, so front-ends show them before play
only behind the closed **Learning outcomes (5) · may reveal the diagnosis** disclosure and list them in
every debrief (CASE_AUTHORING §9.4, GLOSSARY §4).

## Clinical summary (spoilers)

A 40-year-old man felt a painless lump in the left side of his scrotum in the shower 11 months ago. It never
hurt or dragged, he walked and worked normally and he saw nobody until it kept growing. He denies scrotal
injury, orchitis and epididymitis. On examination the left hemiscrotum is markedly swollen; the left testis
is enlarged and cannot be separated from the epididymis; the mass is hard, well defined, non-tender and
fixed; the groins have no enlarged nodes.

Ultrasound shows multiple solid left scrotal masses, fairly distinct from the testis, about 7.0 × 3.6 cm,
suspected to be of soft-tissue origin. β-hCG is < 0.2 mIU/mL; the report says only that "tumour markers
such as PSA" were not raised (AFP and LDH have no separate result); FSH 8.2 IU/L, LH 4.47 IU/L and
testosterone 8.28 nmol/L are called normal without ranges. Contrast CT of the chest, abdomen and pelvis
shows mixed-density scrotal masses (the larger 4.1 × 4.3 × 5.4 cm), a possible neoplasm, a small fluid
collection and no metastasis. No scrotal MRI and no frozen section are recorded.

The team diagnosed "left testicular tumour, nature undetermined" and performed a **left high (radical
inguinal) orchidectomy**. Pathology favoured **paratesticular fibrous pseudotumour**: sclerosing
fibrocollagenous proliferation with inflammation, focal cyst-like spaces, mesothelial cells calretinin⁺ /
Ber-EP4⁻, mixed CD20/CD3 lymphocytes, IgG4⁺ cells focally > 50/HPF but IgG4/IgG < 20 %, with no lesion in
the surrounding testis, epididymis or cord. The authors concluded that MRI and frozen section could have
avoided removing the testis. No follow-up, recurrence, endocrine or fertility outcome is reported.

**Today's answer** (EAU 2026): complete AFP, hCG and LDH and check the other testis; consider MRI when
ultrasound is inconclusive; explore through the groin with frozen section, excise the lesion and keep the
testis if benign; discuss sperm banking before surgery; never biopsy through the scrotum.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`): no physiology model, results are immediate, and nothing the report
does not record is simulated. Three phases, none switchable by the learner (as in `new-onset-t2dm`), so nobody
steps back into a phase that could not be re-entered:

| Phase | Entered | What happens |
|---|---|---|
| `initial` — Clinic assessment and pre-operative work-up | start | history, scrotal and groin examination; ultrasound, markers, hormones, CT, MRI (not done — "no record"); decisions `origin`, `plan`, `consent`; sperm banking; the choice of operation |
| `operation` — Operation and pathology (as reported) | locked; `plan` and `consent` decided **and** an operation chosen (`inguinal-exploration-fs` or `radical-orchidectomy`) | location `{"roomKind": "operating-room"}` (theatre). Pre-operative diagnosis and operation record, frozen section ("no record"), surgical pathology with Fig. 2; decision `pathology` |
| `followup` — Reported outcome and follow-up | locked; `pathology` decided | location `{"setting": "outpatient"}` (back to the clinic room). The authors' reflection and the absent outcome data; follow-up plan |

Whichever operation the learner chooses, the case continues with the operation the report records (a
radical orchidectomy without frozen section) — the intervention responses say so; what a frozen section
would have shown is never invented. The pathology (and its gross-specimen figure) opens only after the
pre-operative decisions, so `plan` tests reasoning rather than hindsight.

## Decisions and assessment

### Objectives (HUD chapters)

1. **Find out the story of the lump and the risk factors** — presentation, growth, pain/dragging, injury or
   orchitis/epididymitis.
2. **Examine the scrotum and groins** — inspection, palpation of testis, epididymis and mass, groin nodes.
3. **Pre-operative work-up: imaging, markers and staging** — ultrasound, markers, CT read, `origin` decided.
4. **Choose the operation and counsel him** — `plan` and `consent` decided, an operation chosen.
5. **Interpret the pathology and review the report** — `pathology` decided, the outcome record read in
   the follow-up phase.

Hints coach without naming a correct option.

### Decisions

| id | kind | unlocked by | correct answer | distractors (each with its own feedback) |
|---|---|---|---|---|
| `origin` | single | presentation + progression asked, mass examined, ultrasound read | solid mass of uncertain origin (exam and ultrasound disagree) → manage as possibly malignant until histology | hydrocele/epididymal cyst; chronic epididymo-orchitis → antibiotics; "paratesticular on ultrasound, so cancer is excluded" |
| `plan` | single | `origin` + ultrasound, markers, CT read | complete AFP/β-hCG/LDH and check the other testis; MRI if ultrasound still inconclusive; inguinal exploration with frozen section — keep the testis if benign, radical orchidectomy if malignant | trans-scrotal biopsy; immediate radical orchidectomy **(the report's choice)**; watch and re-scan in 3 months |
| `consent` | multiple | `plan` | possible loss of the testis · sperm banking before surgery · groin (not scrotal) incision | "markers are normal, so promise it is not cancer"; "chemotherapy is certain" |
| `pathology` | single | pathology read | benign paratesticular fibrous pseudotumour; the IgG4 ratio does not support IgG4-RD; no adjuvant therapy; follow-up of the remaining testis, testosterone, fertility | IgG4-RD → steroids; malignant mesothelioma (calretinin⁺) → adjuvant treatment; germ-cell-tumour surveillance/RPLND |

### Interventions (8)

`sperm-banking` (indicated before the operation), `inguinal-exploration-fs` (indicated once ultrasound,
markers and CT are read), `radical-orchidectomy` (the report's operation; neutral), `trans-scrotal-biopsy`
(always contraindicated: scrotal violation), `observation` (always contraindicated), `steroids-igg4` and
`adjuvant-chemo` (always contraindicated), `follow-up-plan` (indicated after the pathology decision). Either
operation is contraindicated when given before the ultrasound and markers have been read (EAU: markers
before orchidectomy). No intervention has physiological effects (static clock, as in `new-onset-t2dm`).

### Rubric (11 deterministic items, 19 points, + 1 examiner-judged)

| Domain | Item | Weight |
|---|---|---|
| Management | Pre-operative plan correct **at the first attempt** (`plan`) | 3 |
| Safety | No trans-scrotal biopsy, no watch-and-wait, no steroids or chemotherapy (critical; counts once management has begun — annotation) | 3 |
| Diagnosis | Mass of uncertain origin managed as possibly malignant, first attempt (`origin`) | 2 |
| Management | Inguinal exploration with frozen section, not an immediate radical orchidectomy | 2 |
| Management | Sperm banking discussed and counselling content correct at the first attempt (`consent`) | 2 |
| Diagnosis | Pathology interpreted correctly at the first attempt (`pathology`) | 2 |
| History | Lump characterised: onset, growth, pain/dragging, injury/orchitis | 1 |
| History | Risk factors and fertility asked: undescended testis, children | 1 |
| Examination | Inspection, palpation of testis/epididymis/mass, groin nodes | 1 |
| Investigations | Ultrasound, markers and staging CT read | 1 |
| Investigations | Scrotal MRI requested for the unclear origin | 1 |
| Communication (examiner) | Uncertainty, operation and possible loss of the testis, sperm banking; afterwards the benign result and follow-up | 2 |

How wrong choices score: decisions answered wrongly first lose their first-attempt item (and the
`r-fertility` item for `consent`); a radical orchidectomy costs `r-op-choice`; a scrotal biopsy, observation,
steroids or chemotherapy cost the weight-3 safety item and appear as contraindicated actions. A replayed
"historical" path (radical orchidectomy, wrong first answers, steroids for "IgG4-RD", no sperm banking)
scores 3/19.

## Reference path (`solution`)

48 steps: the full history (17 items), inspection, palpation and groin nodes; ultrasound → `origin`;
markers, hormones, CT and MRI ("no record"); `plan`, `consent`; sperm banking; inguinal exploration with
frozen section → phase `operation` (theatre); operation record, frozen section ("no record"), pathology →
`pathology`; phase `followup` (clinic); follow-up plan, the post-operative status question, the outcome
record; finish. It scores **19/19** with no contraindicated action (offline demonstration, clinical and
in-world mode, zh-CN and en).

## Clinical numbers check

* **Sizes as printed:** ultrasound 7.0 × 3.6 cm (multiple masses); CT, the larger mass 4.1 × 4.3 × 5.4 cm;
  specimen: testis beside the mass 3 × 2.5 × 2 cm, cord 10 × 1.5 × 1 cm. The ultrasound and CT figures do
  not agree and are both kept as printed (labelled in `unknowns`).
* **Markers and hormones:** β-hCG < 0.2 mIU/mL; FSH 8.2 IU/L; LH 4.47 IU/L; testosterone 8.28 nmol/L (SI, as
  printed). The source gives no reference ranges and calls them normal; the case shows "no range given
  (reported as normal)" rather than inventing ranges. AFP, LDH and PSA have no values.
* **IgG4:** > 50 IgG4⁺ cells/HPF focally with IgG4/IgG < 20 %. The Boston consensus reads counts with the
  ratio (usual threshold > 40 %) after the morphology; the ratio here is below half of that threshold.
* **No drug doses** are authored: the case's medicines (steroids, chemotherapy) are contraindicated
  distractors without an indication, so no dose is shown.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did it feel to plan an operation that might remove a 40-year-old man's testis?"
2. **Description** — "Summarise what the examination, the ultrasound, the markers and the CT told you —
   and what they did not."
3. **Analysis**
   * "The testis felt enlarged, but ultrasound put the masses beside it. How did you resolve that?"
   * "Which markers does the guidance ask for before orchidectomy? Which ones did this report give?"
   * "Why not simply biopsy it through the scrotum?"
   * "The team removed the testis; the lesion was benign. What would you have needed to keep it?"
   * "What did you tell him about fertility before the operation?"
   * "IgG4⁺ cells were > 50/HPF. Why is that not IgG4-related disease?"
4. **Summary** — "What will you do the next time you see a solid scrotal mass with normal markers?"

### Teaching notes

* **The case's tension is the source's own lesson:** examination and ultrasound disagree, markers are
  incomplete, and the team chose radical surgery; the authors themselves argue for MRI and frozen section.
  Historical practice and current guidance are contrasted explicitly, not corrected.
* **Markers:** a normal β-hCG excludes nothing; AFP and LDH are missing; PSA is irrelevant to a testicular
  mass. The source's discussion even claims the work-up "excluded testicular tumour" — a contradiction to
  discuss, not to resolve.
* **Inguinal approach:** both frozen-section exploration and radical orchidectomy go through the groin;
  scrotal violation is the classic error (EAU: higher local recurrence).
* **Fertility:** EAU 2026 (strong): discuss sperm banking with every man before any treatment. The report
  does not record it — a gap the learner should close.
* **Pathology literacy:** calretinin/Ber-EP4 identify mesothelial cells, not malignancy; IgG4 counts without
  the ratio and the morphology mislead; ACR/EULAR criteria classify, they do not diagnose.

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| Trusting the ultrasound location ("not testicular, so not cancer") | `origin` distractor; feedback on exam–ultrasound disagreement |
| Treating normal β-hCG/PSA as reassuring | `plan` "observe" distractor; `consent` "promise it is not cancer" distractor; contraindicated `observation` |
| Trans-scrotal biopsy | contraindicated `trans-scrotal-biopsy`; `plan` distractor; weight-3 safety item |
| Radical orchidectomy without considering frozen section | `plan` "radical-now" (the report's choice) distractor; `r-op-choice` |
| Forgetting fertility | `consent` multiple-answer decision; `r-fertility`; sperm-banking intervention |
| Calling it IgG4-related disease on the count alone | `pathology` distractor; contraindicated `steroids-igg4` |
| Reading calretinin positivity as mesothelioma | `pathology` distractor |

## Embodied mode

**Grounding (in-world mode).** The scrotal ultrasound needs an ultrasound device at the bedside (the
demonstration fetches a portable unit to consult room 1). The markers and hormones are laboratory tests
sampled at the patient's side. CT and MRI are studies at fixed devices: the patient is taken to the CT
scanner and the MRI scanner and back (the MRI returns "no record"). The operation record and the outcome
record are chart reviews at a records terminal; the frozen section and pathology are ordered and read where
histopathology is provided (the demonstration uses the laboratory microscope). Procedures and counselling are done at the patient. The operations, the biopsy,
sperm-banking counselling and chemotherapy are authored `scope: "medical"` (a delegated nurse may not do
them); the steroid distractor keeps the medication default, and the dispositions need no place.

**Where the patient goes.** The `operation` phase moves him to the theatre (`{"roomKind":
"operating-room"}`; he lies on the operating table — both operations set `posture: "lying"`), and the
`followup` phase brings him back to the clinic room (`{"setting": "outpatient"}`; he stays lying on the
couch, as for a post-operative wound check). Offline demonstration in `general-hospital`: consult room →
CT → consult room → MRI → consult room → theatre (team) → consult room (team). Embodied score = clinical
score (19/19) in both languages.

**Annotations for fields arriving later** (`S/pr3/fxc-annotations/cmcr-1551893.json`, not yet in
`case.json`): `operative-record` and `followup` are record reviews (`performedAt: "records"`); the patient
cannot speak in the `operation` phase (`nonVerbalWhen: {"phase": "operation"}`, with a bilingual reason);
`r-safety` counts only once management has begun (`scoredWhen`: the plan attempted or any operation,
biopsy, observation, steroid or chemotherapy given) and is `critical`. The case is correct with and without
them; until they apply, the patient answers "not recorded" in theatre and the safety item is met by default.

## Source and adaptation

**From the report** (section-level `source` notes in every item): age, sex, the 11-month history
(noticed in the shower; painless, no dragging, walking normal, never assessed; progressive growth); no
scrotal trauma, orchitis or epididymitis; the examination (swelling, enlarged testis, testis–epididymis
boundary not palpable, hard, well defined, non-tender, fixed; no inguinal nodes); ultrasound, markers,
hormones and CT as printed, including the CT impression "neoplastic lesion possible" and the ultrasound's
"suspected tumour of scrotal soft-tissue origin"; the pre-operative diagnosis and the high orchidectomy; the
full pathology paragraph (cystic spaces, specimen sizes, epididymis indistinct, mesothelial
calretinin⁺/Ber-EP4⁻, mixed CD20/CD3, IgG4 > 50/HPF with ratio < 20 %, "favor fibrous pseudotumor",
surrounding tissues normal) and Fig. 2's legend; the authors' differential (haemangiopericytoma-like
tumours, mesothelioma of the tunica vaginalis, solitary fibrous tumour) and their reflection.

**Adapted for teaching:** the dialogue and persona (calm, reserved; nothing beyond the record); the three
phases and the theatre/clinic locations; the decisions, interventions, rubric and objectives; the NPC
briefs; β-hCG shown with the tumour markers (the source lists it with the sex hormones — noted in both
results); the follow-up phase (the report has no follow-up data, which the phase states). Unrecorded data
are `disclosure: "unknown"` items (undescended testis, family history, children, other illnesses,
medicines, allergies, smoking, alcohol, occupation, concerns, urinary symptoms, post-operative status),
`available: false` results (MRI, frozen section) or `examNotRecorded` (other testis, transillumination,
abdomen).

**Contradictions kept and labelled** (`unknowns`, result notes): (1) the discussion says ultrasound and
markers "excluded testicular tumour", while the pre-operative diagnosis was "testicular tumour, nature
undetermined" and a radical operation was done; (2) the introduction says the disease arises mainly in the
testicular parenchyma, the discussion that two-thirds arise in the tunica vaginalis — and the title says
"testicular" while the pathology found the surrounding testis normal; (3) ultrasound 7.0 × 3.6 cm vs CT
4.1 × 4.3 × 5.4 cm; (4) the discussion's "possibly IgG4-mediated" vs this patient's ratio < 20 %.

**Figures:** Fig. 1 (three ultrasound panels: "LEFT TESTICLE", masses "M", testis "TE"; machine settings
and calipers only) and Fig. 2 (resected specimen and its section) were viewed and carry no direct
identifier; Fig. 1 is attached to the ultrasound (clinic phase) and Fig. 2 to the pathology (operation
phase, after the pre-operative decisions). The source PDF opens only after completion; its page 1 carries
the authors' affiliation and the article's own dating of the admission and operation, and the lower half of
page 2 another article's references (the asset title says so).

**Privacy:** pseudonym; no hospital or calendar date in the case text (the source's admission year and
operation date are replaced by relative phases).

## Matcher notes

* All 40 `extensions.testUtterances` (24 zh-CN, 16 en) reach their intended item; none repeats a canonical
  question; every required item (presentation, progression, pain, trauma, cryptorchidism, fertility) has
  at least one paraphrase. The audit's misses now resolve: 那里受过伤吗 / "Have you ever injured your
  testicles?" → `trauma`; 包块有没有变大 / "Has the lump got bigger?" → `progression`; 阴囊有坠胀感吗 →
  `pain`; 有孩子吗 / "Are you planning to have children?" → `fertility`.
* `excludeKeywords` keep look-alikes apart: `pain` ignores orchitis/epididymitis (the compact text
  "orchitisorepididymitis" contains "sore"); `trauma` ignores undescended-testis wording; `fertility`
  ignores "as a child"; `occupation` ignores "waterworks"; `postop-status` ignores past-history wording
  (以前做过什么手术 → `pmh`); `mass` ignores the other testis and the abdomen, so "examine the right
  testicle" or 摸一下肚子 falls to `examNotRecorded`.
* Order matching: a rule removes `ct` when the query contains "section" ("frozen section" no longer
  orders a CT). 随访 resolves to the follow-up plan, not to watch-and-wait.

## References

1. 葉蔭霆, 陳泰業, 張錦標. 成人睾丸纖維性假瘤1例. 鏡湖醫學. 2025;25(1):66-67.
   doi:10.12408/j.issn2223-4462.2025.01.020. Available from: https://rs.yiigle.com/cmaid/1551893
2. European Association of Urology. EAU Guidelines on Testicular Cancer. Arnhem: EAU Guidelines Office;
   2026 (limited text update March 2026). Available from: https://uroweb.org/guidelines/testicular-cancer
3. Deshpande V, Zen Y, Chan JK, et al. Consensus statement on the pathology of IgG4-related disease. Mod
   Pathol. 2012;25(9):1181-1192. doi:10.1038/modpathol.2012.72
4. Wallace ZS, Naden RP, Chari S, et al. The 2019 American College of Rheumatology/European League Against
   Rheumatism classification criteria for IgG4-related disease. Arthritis Rheumatol. 2020;72(1):7-19.
   doi:10.1002/art.41120
5. Zhang Z, Yang J, Li M, et al. Paratesticular fibrous pseudotumor: a report of five cases and literature
   review. Front Med. 2014;8(4):484-488. doi:10.1007/s11684-014-0325-3

The same strings are `debrief.references`. How each was checked (2026-10-28; doi.org, Crossref and the
EAU site cannot be reached from this environment, so checks used web search): ref. 1 — DOI printed on the
article's first page and in the export record, and listed with volume, issue and pages on the journal's
own site (mjokw.magtechjournal.com); ref. 2 — EAU 2026 pocket and summary texts (bilateral ultrasound,
markers before orchidectomy, testis-sparing surgery only with frozen section, sperm banking); ref. 3 —
PubMed record (PMID 22596100, verified by the PR #3 audit) and the journal's listing; ref. 4 — PubMed record
(PMID 31793250); ref. 5 — the DOI printed in the source article's reference list (its reference 7).

### To verify

* EAU 2026 full text: the exact wording and grade of the scrotal-MRI statement (confirmed only in the
  2023–2025 texts: MRI when ultrasound is inconclusive, e.g. to stage for testis-sparing surgery or to tell
  intra- from paratesticular lesions), and the recommendation grade of "markers before orchidectomy".
* EAU wording on scrotal violation is quoted from the 2024 full text ("a scrotal approach should be avoided
  when TC is suspected as it results in a higher local recurrence rate"); confirm it is unchanged in 2026.
* AUA early-stage testicular cancer guideline (2019, amended 2023): reported by a search summary to advise
  against MRI in the initial evaluation — not cited in the case until checked on auanet.org.
* Boston consensus: the > 40 % IgG4/IgG ratio threshold is confirmed from secondary sources, not from the
  full text of the statement.
* Specialty labels `urology` and `pathology` have no zh/en labels in the framework (reported).

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

* **Options rebalanced so the key is not cued by length.** The keyed option was the uniquely longest in all 3
  single-best decisions in both languages; now it is in one (`origin`). Each distractor states its reasoning in the
  key's register: a hydrocele or cyst because the lump is painless with no groin nodes; epididymo-orchitis as a
  tumour mimic, with antibiotics and a repeat scan; cancer excluded because ultrasound outranks palpation; a scrotal
  core biopsy as a quick day case that spares an operation; radical orchidectomy without frozen section (the report's
  operation) because a solid, growing mass cannot be called benign; observation because β-hCG and PSA are not raised
  and the CT shows no spread; IgG4-related disease with steroids and an organ screen; mesothelioma with CT staging and
  oncology referral; germ-cell follow-up because the testis was removed as a suspected tumour. The keys of `origin`,
  `plan` and `pathology` are tighter wording of the same content. In the multiple-answer `consent` decision the two
  distractors name their false grounds. The reassurance and IgG4 feedback also answer the CT and organ-screen
  arguments. Correct flags and scoring are unchanged.
* **Option ids:** all already name their content; none changed.
* **Matcher corpus:** the test utterance 「疼不疼？」 was a keyword of `pain` (`cases validate --strict`); it is now the
  paraphrase 「这个包块平时会痛吗？」. No history item, answer or keyword changed.

### 1.1.0 — 2026-10-28 (editorial revision)

* **Timing of the key decision (audit A1/A2):** the post-orchidectomy pathology no longer sits in the
  work-up; a locked `operation` phase (theatre) holds the operation record, frozen section and pathology,
  and opens only after the new pre-operative decisions `plan` (inguinal exploration with frozen section vs
  scrotal biopsy, the report's immediate radical orchidectomy, observation) and `consent` (multiple answer:
  possible loss of the testis, sperm banking, groin incision). New `origin` decision on exam–ultrasound
  discordance; the post-pathology decision now tests IgG4, mesothelial markers and follow-up.
* **Every option has its own feedback** (1.0.0 repeated one text on both options); 4 decisions × 4–5
  options, scored with `decidedFirstTry`.
* **Source facts restored (B1–B6):** "left testis enlarged" in the examination; the CT impression and the
  ultrasound's "tumour" wording; the pre-operative working diagnosis; the full pathology (cystic spaces,
  specimen sizes, mesothelial calretinin/Ber-EP4, CD20/CD3); prior care split from medicines; four source
  contradictions labelled.
* **8 interventions** (none in 1.0.0), including the tempting wrong ones (scrotal biopsy, observation,
  steroids, chemotherapy) and sperm banking; the report's radical orchidectomy is a neutral, historical
  choice.
* **Rubric** 4 → 12 items (safety, communication, first-attempt decisions); 1.0.0 gave 100 % to every
  finisher.
* **Teaching:** 5 learning outcomes, 5 teaching points naming EAU 2026, the Boston consensus and ACR/EULAR
  2019; references in Vancouver style; `provenance.review` (editorial).
* **Voice and matching:** first-person lay answers and an actor's persona replace chart-voice text;
  history 15 → 18 items (undescended testis, other illnesses, post-operative status added; medicines split
  from prior care); 5–12 keywords per item and language; 40 genuine paraphrases (1.0.0: 16 copies of the
  questions).
* **Investigations:** markers split from hormones (lab-chemistry + lab-endocrine); CT is an order (risk
  low); MRI and frozen section added as "no record"; record reviews use `records`; urologist, pathologist
  and nurse NPC briefs added.
* Phases are no longer learner-switchable; the unrecorded-history items can be asked in any phase.
* British spelling and standard terms (orchidectomy, Ber-EP4, 经腹股沟根治性睾丸切除); title "40-year-old
  man"; triage note no longer equals the summary; difficulty 4 → 3, time 25 min (unchanged).

### 1.0.0

* Initial CMCR adaptation (PR #3).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1551893/case.json --strict   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1551893      # solution 48 steps · objectives 5/5 · decisions 4/4 · utterances 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1551893                 # collection contract: passed
npm run -s cc -- exec --case cmcr-1551893 --autopilot --approval bypass --provider offline --output-format json            # 19/19, 5/5
npm run -s cc -- exec --case cmcr-1551893 --autopilot --approval bypass --provider offline --output-format json --embodied # 19/19, 5/5
```

## 中文摘要

**病例概要。** 40岁男性，11个月前洗澡时发现左侧阴囊无痛性肿物，进行性增大；无外伤、睾丸炎或附睾炎史。查体：左侧
阴囊明显肿胀，左睾丸增大，触诊分不清睾丸与附睾，肿块质硬、界清、无压痛、固定，腹股沟淋巴结不大。超声：左阴囊多发
实性肿块，与睾丸分界尚清，约7.0 cm×3.6 cm；β-hCG<0.2 mIU/mL，AFP和LDH无单独结果，性激素“正常”；增强CT未见转移。
原报告术前诊断“左侧睾丸肿瘤，性质待定”，行左侧高位睾丸切除；病理倾向睾丸旁纤维性假瘤（IgG4阳性细胞>50/HPF，但
IgG4/IgG<20%）。作者事后认为MRI和术中冰冻本可避免切除睾丸。

**学习目标。**
1. 结合触诊与超声判断阴囊肿物的来源，在组织学明确前按可能恶性处理实性肿物。
2. 按EAU 2026完成术前评估（双侧睾丸超声、AFP/hCG/LDH、分期CT），认识到β-hCG或PSA正常不能代替这组标志物。
3. 对性质不明、标志物阴性的肿物选择经腹股沟探查加快速冰冻，良性则保留睾丸；绝不经阴囊活检。
4. 术前讨论可能切除睾丸与精子冷冻保存，术后用通俗语言解释良性结果和随访。
5. 正确解读纤维性假瘤病理报告，不凭IgG4细胞计数诊断IgG4相关疾病或启动治疗。

**关键决策。** ① 来源不明的实性肿块须按可能恶性处理；② 术前方案：补齐标志物、确认对侧睾丸、必要时MRI，经腹股沟
探查并送冰冻（原报告直接根治性切除是干扰项之一）；③ 术前谈话（多选）：可能切除睾丸、精子冷冻、腹股沟切口；④ 病理：
良性纤维性假瘤，IgG4比值不支持IgG4相关疾病，无需辅助治疗，随访留下的睾丸、睾酮与生育。

**复盘要点（PEARLS）。** 先谈感受，再复述查体、超声、标志物与CT各说明了什么、没说明什么；分析环节聚焦查体与超声的
矛盾、缺失的AFP/LDH、为什么不能经阴囊活检、保住睾丸需要什么、术前怎样谈生育、为什么IgG4>50/HPF不等于IgG4相关疾病。
原文内部的矛盾（讨论称术前检查“排除了睾丸肿瘤”）要拿出来讨论，而不是替原文调和。本病例为人工智能辅助编写、经编辑
审核的教学材料，尚未经执业医师审核。
