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
| id / version | `smzl-lung-adeno` / `1.1.0` |
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
  verbatim in `zh-CN` — with one documented divergence (see "Deliberate
  divergences from V4") — and English translations that keep every
  evidence-boundary caveat.
- The patient is a **pseudonymous** teaching NPC (王先生（化名）/ Mr. Wang). The
  avatar is generic and is not based on the real patient's appearance.

## Local-only assets (never committed)

The seven original figures and the source PDF are copyrighted by their original
rights holders. Each one is declared in `case.json` with `localOnly: true`, and
`packages/content/cases/*/assets/` is git-ignored. `clinicalcraft import-v4`
installs them as `cases/smzl-lung-adeno/<file>` under `assets/local/` or
`~/.clinicalcraft/assets/`, and every front-end serves them at
`/local-assets/cases/smzl-lung-adeno/<file>`. Until they are installed, the
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
| `Xd` matcher | `orderMatching` (V4's 7 rules + `exact` overrides, plus 2 English-only rules). The 平扫 notice is in `orderMatching.warnings` |
| `dh(id, phase)` | `results.pre` and `results.post` for every investigation (date, text, figures, note, source) |
| V4 station groups (`os`) | `requires` capabilities that match the `clinic-v4` workstation groupings |
| finish screen | `debrief` (title, conclusion, first key-reasoning point, boundaries, unknowns, notice) |
| source / scope screen | `provenance.notes` |
| other V4 UI copy (compare view, case label, save format, phase-switch toast, destination mapping) | `extensions.v4` |

Parity with V4 is a test:
[`packages/core/src/engine/smzl-parity.test.ts`](../../../core/src/engine/smzl-parity.test.ts)
embeds V4's decoded case logic (`Vd`, `Za`, `zn`, `mn`, `Ka`, `Wd`, `is`, `Xd`,
`dh`, `gh`) verbatim and asserts, against this file:

- every zh-CN string carried over from V4 is identical (questions, chapters and
  quest copy, decisions, investigation names and aliases, all 13 × 2 results,
  finish screen, patient tags, 平扫 notice), except the divergences pinned in
  the test's `V5_TEXT_DIVERGENCES` (each with its exact V4 and V5 text);
- `matchOrders` equals `Xd` for 100+ queries in V4's vocabulary, in both
  locales, and the 平扫 notice fires exactly when V4's does;
- objective completion, the current objective and the waypoint equal V4
  `zn`/`mn`/`gh` on the scripted V4 path, exhaustively over every combination
  of the 17 facts V4's gates read, and on 300 seeded random walks through
  `reduce()` in lock-step with V4's `Wd`;
- decision `requires` equals V4 `Ka[...].requires` (same exhaustive and random
  checks);
- the reference `solution` verifies, scores every deterministic rubric item,
  and also completes V4's own state machine.

V4 `gh()` destinations map to V5 waypoint targets through the clinic-v4
workstation groupings: `lab` → `lab-hematology` | `flow-cytometry` |
`lab-serology`, `imaging` → `ct`, `path` → `histopathology` | `cytogenetics`.
Once every objective is done V5 has no waypoint, where V4 pointed at the board.

## Deliberate divergences from V4

| item | V4 (`Za`) | V5 | why |
|---|---|---|---|
| `spleen.answer` | 大约30年前就发现脾大了。2024年11月的PET/CT又提示脾脏明显增大。**不能据这段病史认定淋巴瘤已经持续30年。** | the same without the last sentence (both locales) | The last sentence is a clinician's diagnostic caveat spoken in the patient's voice, against `persona.actingNotes` ("do not discuss … diagnostic conclusions"). The caveat is kept as teaching knowledge of the Socratic attending instead. |

The parity test (`V5_TEXT_DIVERGENCES` in `smzl-parity.test.ts`) pins this
entry exactly — V4's text still equals `Za`, and V5's is V4's minus that one
sentence — and keeps every other carried-over string strict.

## What V5 adds beyond V4 (all sourced; nothing invented)

| addition | source in the paper |
|---|---|
| English translation of every text | the V4 text |
| History `pmh-htn`: hypertension for years, levamlodipine besylate, controlled | 正文·既往史 |
| History `meds` (**pre only**): levamlodipine; aumolertinib 55 mg on odd-numbered and 110 mg on even-numbered days | 正文·既往史 (lung cancer diagnosed 6 months before the July 2025 admission) |
| History `meds-post` (**post only**): the same, plus the June 2025 change to 110 mg daily after the lung lesion grew | 正文·既往史 (2025-06) |
| History `allergies`: no drug or food allergies | 正文·既往史 |
| History `psh`: gallbladder removed (date and reason not recorded) | 正文·检查 (ultrasound and CT: post-cholecystectomy) |
| History `fever`: abdominal pain with fever in April 2025, improved with anti-infective treatment | 正文·一般资料 |
| History `general-since-onset` (**post only**): energy and appetite fair, sleep so-so, weight gain, normal bowels and bladder | 正文·一般资料 (recorded at the cycle-3 admission) |
| History `treatment-course` (**post only**): treatment initially refused; VP regimen from 2025-04-26; 2 cycles of rituximab (May, June) | 正文·一般资料／治疗 |
| History `numbness` (**post only**): distal numbness attributed to VP neurotoxicity, slightly improved | 正文·一般资料 |
| Physical examination (7 findings, **post only**) | 正文·体格检查, recorded **on admission for cycle 3**, after 2 cycles of rituximab |
| `examNotRecorded`; the pre-phase examination is explicitly not recorded | (absence in the source) |
| NPC briefs: radiologist, pathologist, Socratic attending (`revealsDiagnosis: false`) | caveats restated from V4 report notes; the attending also carries V4's spleen-history caveat (see divergences) |
| Rubric: 11 deterministic items + 2 communication items judged from the transcript. The four decision items (`rb-dx-combination`, `rb-safety-hbv`, `rb-dx-genetics`, `rb-mgmt-phase-review`) use `decidedFirstTry`: with 2–3 options and feedback on each, a wrong first answer followed by the right one must not score full marks | design |
| Spoiler-free library title and summary (V4's label `CASE 01 · SMZL 与肺腺癌并存` is kept in `extensions.v4.caseLabel`) | design |
| Debrief key reasoning 2: MCL (CD5, cyclin D1) and FL (CD10, BCL6) differential against this immunophenotype | 正文·诊断与鉴别诊断 |
| Debrief key reasoning 3: splenic histology is the gold standard; marrow biopsy with a matching immunophenotype can support SMZL; SDRPL still to be distinguished | 正文·讨论 |
| Debrief teaching point on sampling methods and denominators | V4 `marrow` and `flow` result caveats |
| Debrief references: BSH 2024 MZL guideline, JSH 2023 MZL guideline, the 2025 Chinese consensus on haematological plus solid tumours (all cited by the source), EASL 2025 HBV guideline (for the anti-CD20 / HBcAb safety decision; supersedes the 2017 guideline) | source reference list [1], [4], [14]; EASL |
| Case-level `unknowns` for agents: smoking and family history, occupation and alcohol, pain duration and score, diagnostic-phase examination | V4 `other` and `pain` answers; absence in the source |
| English order entry: aliases (non-contrast/plain CT, CT scan, bone marrow exam…), English alternatives in V4's rules (abdominal, splenic, chest, non-abdominal ultrasound, aspirate + biopsy), `exact` "ultrasound"/"CT scan", and the 平扫 notice for "non-contrast / unenhanced / plain" | V4 `Xd` semantics |
| `extensions.testUtterances`: 37 bilingual matcher regression utterances (3 must fall through to "not recorded") | design |
| Reference `solution` also asks smoking/family, medications and allergies, and reads the post-treatment chest CT, so it meets every deterministic rubric item | design |

All added history items are `required: false` and none contradicts V4. The
added keywords are tuned for the offline matcher: for example, "糖尿病" and
"diabetes" deliberately have no keyword, so those questions get the
"not recorded" fallback instead of being matched to the hypertension answer.
"既往病史" / "past medical history" selects both the lung cancer and the
hypertension items.

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
  mechanism of any common origin, and HBsAg (V4's list, also in `debrief`),
  plus smoking and family history, occupation and alcohol, pain duration and
  score, and the diagnostic-phase examination.

## Known limitations

- Only the medication items (`meds`, `meds-post`) carry `excludeKeywords`
  (过敏 / allerg, so allergy questions reach `allergies`). "家里有人得过肿瘤吗" /
  "any family history of cancer?" therefore still selects the patient's own
  `lung` item as well as `other` (both score 1.0). "past medical history" /
  "既往病史" selects `lung` and `pmh-htn` (in English `psh` also matches at 0.5,
  below the 0.55 selection score), but no longer the medication items (the
  matcher keeps "medical" ≁ "medication").
- The phase-restricted items (`meds` / `meds-post`, the post-only history) rely
  on the patient pipeline dropping candidates that are not available in the
  current phase; `matchHistory` itself filters phases only when called with
  `{ phase }`.
- `abdct` is rated `essential` and `us` `useful`, although V4's chapter 2
  accepts either. A learner who reads only the ultrasound completes the chapter
  but sees `abdct` under "essential investigations missed".
- Results are narrative text only (no `values` tables), as in V4; no
  `sha256` on the local-only assets yet.

## Checking the case

```sh
npx tsx -e "import {CaseSchema} from './packages/core/src/schema/case.ts'; import fs from 'node:fs'; \
  const r = CaseSchema.safeParse(JSON.parse(fs.readFileSync('packages/content/cases/smzl-lung-adeno/case.json','utf8'))); \
  console.log(r.success ? 'VALID' : r.error.issues)"
clinicalcraft cases validate packages/content/cases/smzl-lung-adeno/case.json   # schema + integrity
clinicalcraft cases verify smzl-lung-adeno   # replays `solution` (verifyCase) + the utterance corpus (takes an id, not a path)
```

Completion and decision records are teaching-script measures. They are not a
validated clinical competency score.
