# `smzl-lung-adeno`: left upper abdominal pain and an enlarged spleen (74-year-old man)

> **Spoilers for case authors.** This file names the diagnosis. Learners should
> open the case from the case library, where the title and summary give nothing away.

This case ports **CASE 01 of _Virtual Patient V4_** (临床方块世界 / Clinical Craft V4, a
Chinese-language voxel clinic) to `clinicalcraft/case@1`. It is a published-case
review: a 74-year-old man with left upper abdominal pain and long-standing
splenomegaly is found to have **splenic marginal zone lymphoma (SMZL) with bone
marrow involvement**, alongside a known **EGFR-mutant invasive adenocarcinoma of the
left upper lung**. The case teaches:

- keeping two tumours on two separate evidence chains,
- HBV reactivation safety before anti-CD20 therapy,
- what a t(4;12)(q23;q13) karyotype can and cannot support, and
- separate post-treatment re-evaluation of each tumour.

| | |
|---|---|
| id / version | `smzl-lung-adeno` / `1.0.0` |
| setting / facility | `outpatient` / `clinic-v4` (the V4 world) |
| locales | `zh-CN` (source language; V4 text verbatim), `en` (translation) |
| phases | `pre` 诊断期 Diagnostic phase · `post` 治疗后复评期 Post-treatment re-evaluation (learner-switchable; static clock) |
| difficulty | 4 / 5 |

## Provenance

- **Source:** 丁凤丽，秦彩霞，汪家吉. 伴t(4;12)(q23;q13)易位合并肺腺癌的脾边缘区淋巴瘤1例.
  中国临床案例成果数据库, 2026. DOI [10.3760/cma.cmcr20260128-00421](https://doi.org/10.3760/cma.cmcr20260128-00421).
- **Port:** V4's case data (`Za` questions, `zn` chapters, `Ka` decisions, `is`
  investigations, `Xd` order matcher, `dh` results, quest copy, destination
  logic `gh`, and the finish, journal and source screens) is reproduced
  verbatim in `zh-CN`, with English translations that keep every
  evidence-boundary caveat.
- The patient is a **pseudonymous** teaching NPC (王先生（化名）/ Mr. Wang). The
  avatar is generic and is not based on the real patient's appearance.

## Local-only assets (never committed)

The seven original figures and the source PDF are copyrighted by their original
rights holders. Each one is declared in `case.json` with `localOnly: true`, and
`packages/content/cases/*/assets/` is git-ignored. Until they are installed, the
UI shows a placeholder.

| asset id | file | used by |
|---|---|---|
| `fig1` | `assets/fig1.png` | `pet` (pre and post) |
| `fig2` / `fig7` | `assets/fig2.png` / `assets/fig7.png` | `us` pre / post |
| `fig3` / `fig6` | `assets/fig3.png` / `assets/fig6.png` | `abdct` pre / post |
| `fig4` | `assets/fig4.png` | `karyo` |
| `fig5` | `assets/fig5.png` | `biopsy` |
| `paper` | `assets/source_case_report.pdf` | journal, "source case report" |

Install them from your own copy of Virtual Patient V4 (see `docs/ASSETS.md`):

```sh
# from the single-file V4 page
clinicalcraft import-v4 ./Virtual_Patient_V4.html
# or from the split archive (pass every part)
clinicalcraft import-v4 ./Virtual_Patient_V4_Part1.zip ./Virtual_Patient_V4_Part2.zip
```

## V4 → V5 mapping

| V4 (`custom.js`) | V5 (`case.json`) |
|---|---|
| `Za` (4 questions) | `history`: `pain`, `spleen` and `lung` are required; `other` is `disclosure: "unknown"` |
| `zn` (5 chapters) + quest copy `n[i]` | `objectives` `ch1-history` … `ch5-review` (`hint` and `guidance` verbatim) |
| `kn(state, id, phase = "pre")` | `{ "read": id, "phase": "pre" }`. Chapter checks default to the **pre** phase, as in V4 |
| `gh()` destinations `patient/lab/imaging/path/board` | waypoints `patient` → `lab-hematology` → `ct` → `histopathology` → `flow-cytometry` → `board` → `lab-serology` → `cytogenetics` → `board` |
| `Ka` (4 decisions) | `decisions` `diagnosis`, `safety`, `genetics` and `response` (`requires`, `need`, options and feedback verbatim) |
| `is` (13 investigations) | `investigations` in the **same order**, because match order follows declaration order |
| `Xd` matcher | `orderMatching` (7 rules + `exact` overrides). The 平扫 notice is in `orderMatching.warnings` |
| `dh(id, phase)` | `results.pre` and `results.post` for every investigation (date, text, figures, note, source) |
| V4 station groups (`os`) | `requires` capabilities that match the `clinic-v4` workstation groupings |
| finish screen | `debrief` (conclusion, key reasoning, boundaries, unknowns, notice) |
| source / scope screen | `provenance.notes` |
| other V4 UI copy (compare view, case label, save format) | `extensions.v4` |

Parity with V4 was checked by running V4's own `Xd`, `zn`, `Ka` and `dh` against
this file. All zh-CN texts match exactly. 87 order queries return identical
results in the engine's `matchOrders`, in both locales. The V4 state machine
replays `solution` to completion with 4/4 decisions correct on the first try.

## What V5 adds beyond V4 (all sourced; nothing invented)

| addition | source in the paper |
|---|---|
| English translation of every text | the V4 text |
| History `pmh-htn`: hypertension for years, levamlodipine besylate, controlled | 正文·既往史 |
| History `meds`: aumolertinib dosing (55/110 mg alternate days, then 110 mg daily from June 2025) and levamlodipine | 正文·既往史 |
| History `allergies`: no drug or food allergies | 正文·既往史 |
| History `psh`: gallbladder removed (date and reason not recorded) | 正文·检查 (ultrasound and CT: post-cholecystectomy) |
| History `fever`: abdominal pain with fever in April 2025, improved with anti-infective treatment | 正文·一般资料 |
| History `general-since-onset` (**post only**): energy and appetite fair, sleep so-so, weight gain, normal bowels and bladder | 正文·一般资料 (recorded at the cycle-3 admission) |
| History `treatment-course` (**post only**): treatment initially refused; VP regimen from 2025-04-26; 2 cycles of rituximab (May, June) | 正文·一般资料／治疗 |
| History `numbness` (**post only**): distal numbness attributed to VP neurotoxicity, slightly improved | 正文·一般资料 |
| Physical examination (7 findings, **post only**) | 正文·体格检查, recorded **on admission for cycle 3**, after 2 cycles of rituximab |
| `examNotRecorded`; the pre-phase examination is explicitly not recorded | (absence in the source) |
| NPC briefs: radiologist, pathologist, Socratic attending (`revealsDiagnosis: false`) | caveats restated from V4 report notes |
| Rubric: 11 deterministic items + 2 communication items judged from the transcript | design |
| Spoiler-free library title and summary (V4's label `CASE 01 · SMZL 与肺腺癌并存` is kept in `extensions.v4.caseLabel`) | design |

All added history items are `required: false` and none contradicts V4. The
added keywords are tuned for the offline matcher: for example, "糖尿病" and
"diabetes" deliberately have no keyword, so those questions get the
"not recorded" fallback instead of being matched to the hypertension answer.

## Evidence boundaries kept from V4

- No DICOM. The figures are representative slices, and the CT figures show the
  abdomen only, so there is no local image of the lung nodule. Volume is never
  estimated from 2-D measurements.
- No raw flow cytometry plots. Aspirate (2%), flow (1.58%) and biopsy (~15%)
  use different denominators.
- The karyotype does not establish a fusion gene or a common origin.
- HBsAg is not reported and must not be assumed negative.
- PR is the authors' assessment. The source contradicts itself on whether the
  lung cancer progressed.
- `unknowns`: the EGFR variant, lung cancer TNM stage, lung nodule size, the
  mechanism of any common origin, and HBsAg.

## Checking the case

```sh
npx tsx -e "import {CaseSchema} from './packages/core/src/schema/case.ts'; import fs from 'node:fs'; \
  const r = CaseSchema.safeParse(JSON.parse(fs.readFileSync('packages/content/cases/smzl-lung-adeno/case.json','utf8'))); \
  console.log(r.success ? 'VALID' : r.error.issues)"
clinicalcraft case verify packages/content/cases/smzl-lung-adeno/case.json   # replays `solution` (verifyCase)
```

Completion and decision records are teaching-script measures. They are not a
validated clinical competency score.
