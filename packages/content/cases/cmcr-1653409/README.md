# cmcr-1653409 — Enlarging lump under the skin above the pubic bone · 15-year-old girl

> **Published-case adaptation / 已发表病例改编.** Adapted from a case report in 鏡湖醫學 (Medical Journal of
> Kiang Wu) 2025 (CMCR collection, see [docs/CMCR_CASES.md](../../../../docs/CMCR_CASES.md)). The names
> (郑悦 / Zheng Yue; her mother 冯女士 / Ms Feng) are pseudonyms, and the mother is a teaching addition;
> hospital and calendar dates are removed. Dialogue, decisions and scoring are teaching material; it is not
> medical advice.
> 本病例依据已发表病例报告改编，人名均为化名（陪同的母亲为教学增补），已去除医院与日历日期；对话、决策和评分为教学设计，
> 不构成医疗建议。

## Case card

| | |
|---|---|
| Case | `cmcr-1653409` · v1.1.1 |
| Source | 古杰鳴. 淺表性血管黏液瘤1例. 鏡湖醫學. 2025;25(2):57 (title names the diagnosis — facilitators only) |
| Setting | Outpatient clinic (`outpatient`); excision and pathology; a follow-up record 6 years later |
| Facility | `general-hospital` (consult room 1; pathology) |
| Difficulty | 3 / 5 |
| Estimated time | ~20 min (static clock: no physiology, results immediate) |
| Specialty | Dermatology, pathology (with paediatric/adolescent and surgical oncology teaching points) |
| Languages | zh-CN (source language of the adaptation), en |
| Learner level | Final-year medical students, foundation/intern doctors, dermatology, surgical and pathology trainees |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have a dermatologist or surgeon and a pathologist review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Assess an enlarging soft-tissue lump in a child or young person for red flags and arrange an ultrasound
   before any excision (NICE NG12: within 48 hours).
2. Choose between excisional biopsy and referral for image-guided core biopsy by the lesion's size, depth
   and ultrasound appearance (ESMO–EURACAN–GENTURIS 2021).
3. Integrate site, morphology and an immunohistochemical panel to diagnose superficial angiomyxoma and
   exclude its mimics, keeping the patient's own stains apart from literature comparisons.
4. Plan aftercare for a benign tumour that recurs after incomplete excision: confirm the margins, arrange
   local follow-up and avoid radiotherapy.
5. State when a superficial angiomyxoma should prompt evaluation for Carney complex (Stratakis 2001
   criteria) and why a single lesion is not enough to diagnose it.
6. Speak with the teenager directly, and explain a benign diagnosis, its recurrence risk and the follow-up
   to her and her parent.

These are `learningOutcomes` in `case.json`. They name the diagnosis, so front-ends show them before play
only behind the closed **Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in
every debrief (CASE_AUTHORING §9.4, GLOSSARY §4).

## Clinical summary (spoilers)

A 15-year-old girl noticed a lump under the skin above the pubic bone more than 20 days ago; it has slowly
grown. Her past history is unremarkable. On local examination it measures about 2 × 2 × 1.5 cm, well
defined, mobile and tender; "other examinations" are reported as unremarkable (one summary line). The
report records no pre-operative imaging. The lump was excised and sent to pathology: one soft gelatinous
nodule; indistinct nodules or lobules of many vessels, myxoid stroma and scattered spindle cells with
scattered neutrophils; spindle cells focally CD34⁺, CK⁻, desmin⁻, S-100⁻. Diagnosis: **superficial
angiomyxoma**. No recurrence or metastasis at 6 years. Margin status, operative details, epithelial
elements, the extra stains (SOX10, ER, PR) and any Carney complex assessment are not recorded.

**Today's answer:** ultrasound before excision (NICE NG12); excisional biopsy for a small superficial lesion
with benign imaging, sarcoma referral for image-guided core biopsy otherwise (ESMO–EURACAN–GENTURIS 2021);
diagnosis from site + morphology + stains; confirm the margins and follow up locally; consider Carney complex
when lesions are multiple, on the ear or breast, or accompanied by spotty pigmentation (Stratakis 2001).

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`): no physiology, results immediate. Three phases, none switchable by the
learner (as in `new-onset-t2dm`), so nobody can step back into a phase that can no longer be re-entered:

| Phase | Entered | What happens |
|---|---|---|
| `initial` — Clinic assessment | start | history (she answers; her mother is present), examination, ultrasound ("no record"), decision `pre-excision`, the excision |
| `excision` — Excision and pathology (as reported) | `pre-excision` decided **and** `excision` given | gross, microscopy and immunohistochemistry (Figs 1–4), additional stains ("no record"), the operation and margin record; decisions `diagnosis`, `follow-up`, `carney` |
| `followup` — Reported follow-up (6 years after surgery) | `follow-up` and `carney` decided | the 6-year follow-up record; she can say nothing has grown back |

The pathology opens only after the pre-excision decision, so `pre-excision` tests reasoning about an
undiagnosed lump rather than hindsight. Questions about other lumps, pigmentation, family history and the
rest of the unrecorded history can be asked in any phase, so a learner who forgot them before the excision
can still ask before the Carney decision.

## Decisions and assessment

### Objectives (HUD chapters)

1. **Find out the lump's story and the relevant history** — presentation, growth, past health, other lumps.
2. **Examine the lump and complete the examination** — the lump, the rest of the examination.
3. **Decide what must happen before removal** — `pre-excision` decided, the excision done.
4. **Make the diagnosis from the specimen** — `diagnosis` decided.
5. **Plan follow-up and review the outcome** — `follow-up` and `carney` decided, the follow-up record read.

### Decisions

| id | kind | unlocked by | correct answer | distractors (each with its own feedback) |
|---|---|---|---|---|
| `pre-excision` | single | presentation + growth asked, lump examined | ultrasound first; excisional biopsy if small, superficial and benign-looking, sarcoma team (MRI + image-guided core biopsy) if suspicious, deep or large | watch 1–2 months; incisional biopsy in clinic; wide "sarcoma" excision without imaging |
| `diagnosis` | single | gross, microscopy, IHC read | superficial angiomyxoma (cutaneous myxoma) | dermal nerve sheath myxoma (S-100/SOX10⁺); aggressive angiomyxoma (deep, desmin/ER/PR⁺); low-grade myxofibrosarcoma (curvilinear vessels, atypia) |
| `follow-up` | single | `diagnosis` + operation/margin record read | confirm the margins with pathology (re-excise if incomplete), local follow-up, self-check | no follow-up; adjuvant radiotherapy; "one myxoma proves Carney complex" |
| `carney` | multiple | `diagnosis` (asking about other lumps and pigmentation is scored by `r-hx-carney`, not a gate: the report records neither) | multiple myxomas · a lesion on the external ear or breast · spotty pigmentation of lips, eyelids/conjunctiva or genital mucosa | a single tender suprapubic lesion with none of these; focal CD34 positivity |

### Interventions (9)

`excision` (the report's step; indicated after the decision and an ultrasound request), `incisional-biopsy`
(always contraindicated), `observe` (always contraindicated), `wide-excision` (contraindicated before any
excision), `sarcoma-referral` and `carney-evaluation` (neutral consults: right in other circumstances),
`pathology-consult` (indicated once the margin record is read), `follow-up` (indicated after the follow-up
decision), `adjuvant-rt` (always contraindicated). No physiological effects (static clock).

### Rubric (11 deterministic items, 18 points, + 1 examiner-judged)

| Domain | Item | Weight |
|---|---|---|
| Management | Pre-excision step correct **at the first attempt** | 3 |
| Safety | No watch-and-wait, incisional biopsy, unimaged wide excision or radiotherapy (critical; counts once management has begun — annotation) | 3 |
| Investigations | Ultrasound requested before the excision | 2 |
| Diagnosis | Diagnosis correct at the first attempt | 2 |
| Management | Post-excision plan correct at the first attempt + follow-up arranged | 2 |
| History | Lump characterised: when, where, growth, past health | 1 |
| History | Other lumps and skin pigmentation asked (Carney clues) | 1 |
| History | Adolescent history: school and home, smoking or alcohol | 1 |
| Examination | Lump examined and the rest of the examination completed | 1 |
| Investigations | Margin status checked with pathology | 1 |
| Diagnosis | Carney features identified at the first attempt | 1 |
| Communication (examiner) | Speaks to the teenager directly; explains ultrasound, operation, benign diagnosis and recurrence risk to her and her mother | 2 |

How wrong choices score: a wrong first answer loses that decision's first-attempt item; skipping the
ultrasound costs `r-imaging`; the always-contraindicated steps cost the weight-3 safety item and appear as
contraindicated actions. A replayed path with wrong first answers, no ultrasound, no margin check and no
adolescent history scores 6/18.

## Reference path (`solution`)

41 steps: the history (15 items, all asked of her; her mother is present), the lump and the rest of the
examination; ultrasound ("no record") → `pre-excision`; excision → phase `excision`; gross, microscopy,
immunohistochemistry and the additional stains ("no record") → `diagnosis`; the operation and margin record;
pathology consult → `follow-up`, `carney` → phase `followup`; follow-up arranged, "has it come back?", the
follow-up record; finish. It scores **18/18** with no contraindicated action (offline demonstration, clinical
and in-world mode, zh-CN and en).

## Clinical numbers check

* **Size:** 2 cm × 2 cm × 1.5 cm (local examination), as printed; superficial and mobile.
* **Course:** more than 20 days (20余天), growing — rendered "twenty-odd days" in her voice and "more than 20
  days" in clinical text; follow-up 6 years.
* **Recurrence figures** are the source's citation, labelled as such: about 30–40 % after incomplete
  excision, at 6–58 months (mean 18 months), higher with epithelial elements.
* **Stains** reported for this patient: CD34 focal +, CK −, desmin −, S-100 −. Everything else in the
  discussion is a literature comparison.
* No drug doses (no medicine is part of this case).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How was it, talking to a shy 15-year-old about a lump in a private area with her mother
   in the room?"
2. **Description** — "What did you know about the lump before it was removed, and what did you not know?"
3. **Analysis**
   * "It was small, well defined and mobile. Why scan it before taking it out?"
   * "When would you have sent her to a sarcoma team instead of excising it?"
   * "CD34 was positive. Why is that not enough for the diagnosis?"
   * "Which stains would you have added to exclude the mimics, and which ones were actually done?"
   * "It is benign. Why follow her up — and what is missing from the record?"
   * "What would have made you think of Carney complex?"
4. **Summary** — "What will you do the next time a young person shows you a growing lump?"

### Teaching notes

* **Historical practice vs current guidance:** the report records no imaging before the excision; NICE NG12
  asks for an ultrasound within 48 hours for an unexplained, growing lump in a child or young person. The
  case says plainly that the record is silent — not that imaging was never done.
* **Excisional biopsy is legitimate** for a superficial lesion under 3 cm after imaging (ESMO–EURACAN–
  GENTURIS 2021); the danger is the unimaged, unplanned operation on what might be a sarcoma.
* **Read the stains with the morphology and the site.** The discussion's comparator profiles (SOX10, ER, PR,
  SMA, actin) were not tested in this patient.
* **Benign is not "no follow-up":** recurrence after incomplete excision is the main risk, and the margin
  status is unrecorded.
* **Carney complex:** one cutaneous myxoma is one major criterion; look and ask for the others (Stratakis
  2001). The source flags multiple lesions and ear/breast sites.
* **Adolescent communication:** let her answer her own history, offer time without her mother for
  sensitive questions, ask consent and offer a chaperone; consent for surgery involves the parent.

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| "Mobile and well defined, so benign — watch it" | `pre-excision` distractor; contraindicated `observe` |
| Cutting into it in clinic | `pre-excision` distractor; contraindicated `incisional-biopsy` |
| Treating it as a sarcoma without imaging or biopsy | `pre-excision` distractor; contraindicated `wide-excision` |
| Diagnosing on CD34 alone / confusing the mimics | `diagnosis` distractors with marker-by-marker feedback |
| "Benign, so discharge" | `follow-up` distractor; `r-follow`, `r-margins` |
| Radiotherapy for a benign tumour | `follow-up` distractor; contraindicated `adjuvant-rt` |
| Over- or under-calling Carney complex | `follow-up` and `carney` decisions |
| Expanding "other examinations unremarkable" into specific negatives | keyReasoning; skin-survey, node and heart examinations fall to `examNotRecorded` |

## Embodied mode

**Grounding (in-world mode).** The ultrasound needs an ultrasound device at the bedside (the demonstration
brings a portable unit to consult room 1; the result is "no record"). The pathology investigations are
ordered and read where histopathology is provided (the demonstration uses the laboratory microscope); the
operation/margin and follow-up records are chart reviews at
a records terminal. The excision, biopsies and radiotherapy are authored `scope: "medical"`; consults and
dispositions need no place. No study requires moving her, and no phase has a location: the source does not
say where the excision was done, so she stays in the clinic room.

**Companion.** Her mother (`persona.companion`, `answersHistory: false`) is present and defers history
questions to her daughter.

**Annotations for fields arriving later** (`S/pr3/fxc-annotations/cmcr-1653409.json`): `operative-record` and
`followup` are record reviews (`performedAt: "records"`); `r-safety` counts only once management has begun
(`scoredWhen`: the pre-excision decision attempted or any management step given) and is `critical`. The case is
correct with and without them.

## Source and adaptation

**From the report** (section-level `source` notes): age, sex, the 20-odd-day growing suprapubic subcutaneous
lump, the unremarkable past history, the local examination (2 × 2 × 1.5 cm, well defined, mobile, tender), the
one-line "other examinations unremarkable", the excision and submission to pathology, the gross, microscopic and
immunohistochemical findings with Figs 1–4, the diagnosis, the 6-year follow-up without recurrence or metastasis,
the authors' differential (dermal nerve sheath myxoma, aggressive angiomyxoma, low-grade myxofibrosarcoma), the
recurrence figures, the epithelial-component remark and the Carney triggers (multiple lesions; breast or external
ear).

**Adapted for teaching:** the mother as companion (the report does not say who came with her); the persona
(shy, brief; nothing beyond the record); the phases; decisions, interventions, rubric, objectives and NPC briefs;
adolescent-appropriate social questions (school and home, smoking including vapes, alcohol) in place of the
1.0.0 adult template (work, independence). Unrecorded data are `unknown` items (pain or itching, other lumps,
pigmentation, cardiac and endocrine symptoms, periods, medicines, allergies, family, school and home, smoking,
alcohol, worries), `available: false` results (ultrasound, extra stains) or `examNotRecorded`.

**Ambiguities kept and labelled:** 其他檢查未見異常 may mean the physical examination or include investigations;
the case keeps the one line as printed, as an examination summary, and never expands it into specific
negatives. The source cites recurrence data from the literature; the case labels them as the source's figures.
(The source's reference list prints the same DOI for its references 2 and 5 — irrelevant to the case, noted for
editors.)

**Figures:** Figs 1–4 (gross specimen; low- and high-power H&E; CD34) were viewed and carry no identifier; all
belong to the excision phase. **The source PDF is no longer referenced:** its page 2 is the journal's back cover,
which reprints other articles' clinical images — among them a PET/CT screenshot (from the issue's page 54) with
a burned-in hospital name and lines that read as a date of birth and an examination date. Under the collection's
privacy rule a figure with a burned-in hospital or acquisition date is withdrawn, and so is a PDF that reprints
it (as for 70005 and 1074569); the case's findings stay as text and the reference points to the publisher's
copy. The withdrawal list (`scripts/cmcr-withdrawn-assets.json`) is the coordinator's to update.

**Privacy:** pseudonyms; no hospital or calendar date in the case text.

## Matcher notes

* All 40 `extensions.testUtterances` (25 zh-CN, 15 en) reach their intended item; none repeats a canonical
  question; every required item (presentation, growth, past health, other lumps, pigmentation) has at least one
  paraphrase. The audit's misses now resolve: 它有变大吗 / "Has it been getting bigger?" → `growth`; 以前生过什么病吗
  / "Have you had any illnesses before?" → `pmh`; 身上别的地方还有类似的包吗 / "Do you have any other lumps anywhere
  else?" → `other-lesions`; "Any freckles or dark spots on your skin?" → `pigmentation`; 平时痛吗 / "Does it hurt?"
  → `pain`.
* English keywords avoid stop-word collapses ("more lumps" → `lump` matched every lump question;
  "examine everything" → `examin` matched every examination request); `followup-status` ignores past-history
  wording (以前做过手术吗 → `pmh`).
* Examination: `mass` ignores skin-survey, lymph-node and heart requests and `other-exam` ignores skin, node and
  heart wording, so those fall to `examNotRecorded` rather than to a finding the source does not hold.
* Order entry: 病理 / "pathology" offers gross, microscopy and immunohistochemistry; two-letter aliases
  ("ck", "er", "pr", "us") are avoided because order matching finds them inside other words ("er/pr" is used
  instead).

## References

1. 古杰鳴. 淺表性血管黏液瘤1例. 鏡湖醫學. 2025;25(2):57. doi:10.12408/j.issn2223-4462.2025.02.019. Available from:
   https://rs.yiigle.com/cmaid/1653409
2. National Institute for Health and Care Excellence. Suspected cancer: recognition and referral. NICE guideline
   NG12. London: NICE; 2015 (last updated 2026). Available from: https://www.nice.org.uk/guidance/ng12
3. Gronchi A, Miah AB, Dei Tos AP, et al. Soft tissue and visceral sarcomas: ESMO–EURACAN–GENTURIS Clinical Practice
   Guidelines for diagnosis, treatment and follow-up. Ann Oncol. 2021;32(11):1348-1365. doi:10.1016/j.annonc.2021.07.006
4. Stratakis CA, Kirschner LS, Carney JA. Clinical and molecular features of the Carney complex: diagnostic criteria
   and recommendations for patient evaluation. J Clin Endocrinol Metab. 2001;86(9):4041-4046.
   doi:10.1210/jcem.86.9.7903

The same strings are `debrief.references`. How each was checked (2026-10-28; doi.org and Crossref cannot be
reached from this environment): ref. 1 — DOI printed on the article page and in the export record, and listed with
volume, issue and page on the journal's own site (mjokw.magtechjournal.com); ref. 2 — recommendations 1.11.6–1.11.7
(very urgent direct-access ultrasound within 48 hours; very urgent referral within 48 hours if the scan suggests
sarcoma or is uncertain with persisting concern) and the "last updated 15 April 2026" date, by web search of the
NICE pages; ref. 3 — authors, volume, issue and pages by web search (ScienceDirect, Annals of Oncology), the DOI
from the PR #3 audit's repository record (UCL Discovery), and the wording on core-needle and excisional biopsy;
ref. 4 — citation and DOI from the PR #3 audit (academic.oup.com).

### To verify

* NICE NG12: that recommendations 1.11.6–1.11.7 are unchanged in the April 2026 update (checked against copies
  and summaries that predate it).
* ESMO–EURACAN–GENTURIS 2021: the exact wording on imaging before biopsy (the search summary reads "after imaging,
  multiple core needle biopsies"); the DOI was not re-checked in this session.
* Stratakis 2001: the criteria table (cutaneous myxoma and spotty pigmentation as major criteria; two major, or one
  major plus one supplemental, criteria for the diagnosis) is stated from the paper's well-known content and the
  source's own list; it was not re-read online in this session.
* Which WHO volume (soft tissue and bone, or skin tumours) classifies superficial angiomyxoma — not cited until
  checked.
* The specialty label `dermatology` has no zh/en label in the framework (reported).

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

* **Options rebalanced so the key is not cued by length.** In all three single-best decisions the keyed option was
  the uniquely longest in both languages (1.4–2.2 times the mean option length); now it is in none. The
  `pre-excision` key says the same in fewer words (and the `follow-up` key in English). The four `diagnosis` options
  now each carry a parenthesis — cutaneous myxoma (the key, as before), a Schwann-cell tumour, deep angiomyxoma, a
  myxoid sarcoma. Each other distractor gives the reason it tempts: small, well defined, mobile and tender like a
  benign or inflamed lump (watch); a tissue diagnosis from part of the lump decides the surgery (incisional biopsy);
  one wide excision deals with a sarcoma and a benign lump alike; no metastasis has ever been reported (no
  follow-up); recurrence is not rare and the margins are unknown (radiotherapy); a cutaneous myxoma is a major
  manifestation (Carney complex on one lesion). The feedback of `watch`, `nerve-sheath-myxoma` and `no-follow-up`
  now also answers the reason its text gives. Medical meaning, correct flags, scoring and the reference path are
  unchanged; no new patient fact is introduced.
* **Option ids neutral:** every id already names its content (`multiple` in the select-all `carney` decision is
  "multiple myxomas"); none renamed.
* **No hidden gate** (`cases validate --strict`): `carney` no longer requires asking `other-lesions` and
  `pigmentation`, which the report does not record (she can only say she does not know); it opens once the diagnosis
  is made (`need`: 先作出诊断。/ "First make the diagnosis."). Asking both is still scored by `r-hx-carney`,
  `other-lesions` is still part of objective 1, and the reference path still asks both before the decision.
* **Matcher corpus:** the test utterance "Where is the lump?" was one of `presentation`'s keywords
  (`cases validate --strict`); it is now "Whereabouts is this lump located?". No history item, answer or keyword
  changed.

### 1.1.0 — 2026-10-28 (editorial revision)

* **Timing of the key decision (audit A1):** the pre-excision decision `pre-excision` (ultrasound first, then
  excisional biopsy or sarcoma referral, vs watch, incisional biopsy or an unimaged wide excision) now comes before
  any pathology; the specimen's results sit in a locked `excision` phase.
* **Diagnosis decision rebuilt (A2):** four real differentials, each with marker-by-marker feedback that separates
  the patient's stains from the discussion's comparisons; `follow-up` and a multiple-answer `carney` decision split
  the 1.0.0 straw-man distractor (A4) and add radiotherapy as a distractor.
* **Every option has its own feedback** (1.0.0 repeated one text on both options); 4 decisions × 4–5 options,
  scored with `decidedFirstTry`.
* **Teaching (A3, E1):** 6 learning outcomes, 5 teaching points naming NICE NG12, ESMO–EURACAN–GENTURIS 2021 and
  Stratakis 2001; Vancouver references; `provenance.review` (editorial).
* **9 interventions** (none in 1.0.0); **rubric** 4 → 12 items with safety and communication items.
* **Voice and history (D1, D2, B3):** a first-person teenage voice; adult template questions (work, independence)
  replaced by school and home, vapes and alcohol; her mother added as a companion who defers to her; title and
  chief complaint in lay register; pigmentation, cardiac and puberty/period questions added; the 6-year outcome
  speakable in the follow-up phase.
* **Source fidelity (B1, B2):** the "other examinations" ambiguity and the unreported epithelial component added
  to `unknowns`; the examination finding no longer reads as a meta-sentence (C2).
* **Investigations:** an ultrasound ("no record") and the additional stains ("no record") added; record reviews
  use `records`; pathologist, nurse and attending NPC briefs added.
* **Privacy:** the source PDF is no longer referenced (its back cover reprints another article's PET/CT with a
  burned-in hospital name and dates — reported for the withdrawal list); the 1.0.0 pseudonym 小宁 / Ning was shared
  with cmcr-51617 and is now 郑悦 / Zheng Yue.
* Phases are no longer learner-switchable; difficulty 4 → 3, time 25 → 20 min.

### 1.0.0

* Initial CMCR adaptation (PR #3).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1653409/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1653409      # solution 41 steps · objectives 5/5 · decisions 4/4 · utterances 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1653409                 # collection contract: passed
npm run -s cc -- exec --case cmcr-1653409 --autopilot --approval bypass --provider offline --output-format json            # 18/18, 5/5
npm run -s cc -- exec --case cmcr-1653409 --autopilot --approval bypass --provider offline --output-format json --embodied # 18/18, 5/5
```

## 中文摘要

**病例概要。** 15岁女孩，发现耻骨上方皮下肿物20余天，逐渐增大，既往史无特殊。专科检查：约2 cm×2 cm×1.5 cm，边界清楚、
可活动、有压痛；“其他检查未见异常”（原文仅一句）。原文未记录术前影像。手术切除后病理：胶冻样软结节；镜下模糊结节/分叶状，
血管多、黏液样间质中散在梭形细胞，伴散在中性粒细胞；梭形细胞CD34局部阳性，CK、Desmin、S-100阴性——浅表性血管黏液瘤。
术后随访6年无复发和转移。切缘、上皮成分、SOX10/ER/PR及Carney综合征评估均未记录。

**学习目标。**
1. 评估儿童/青少年逐渐增大的软组织肿物，切除前安排超声（NICE NG12：48小时内）。
2. 按大小、深度和超声表现，在切除活检与转诊肉瘤团队行影像引导粗针活检之间选择（ESMO–EURACAN–GENTURIS 2021）。
3. 综合部位、形态与免疫组化诊断浅表性血管黏液瘤，排除相似病变，区分本例染色与文献对照。
4. 制定术后计划：确认切缘、局部随访，不做放疗。
5. 说明何时应评估Carney综合征（Stratakis 2001），以及为什么单个病灶不足以诊断。
6. 直接与青少年沟通，向她和家长解释良性诊断、复发风险和随访。

**关键决策。** ① 切除前：先做超声，小而表浅、表现良性者切除活检，可疑、深在或较大者转诊肉瘤团队（观察、门诊切开活检、
未做影像的广泛切除均为干扰项）；② 诊断：浅表性血管黏液瘤（与神经鞘黏液瘤、侵袭性血管黏液瘤、低级别黏液纤维肉瘤鉴别）；
③ 术后：向病理科确认切缘、局部随访（不需随访、放疗、“一个病灶即诊断Carney综合征”为干扰项）；④ Carney综合征线索（多选）：
多发病灶、外耳或乳房病灶、典型分布的斑点状色素沉着。

**复盘要点（PEARLS）。** 先谈感受，再复述切除前知道什么、不知道什么；分析环节聚焦为什么小而活动的肿物也要先做超声、何时转诊
肉瘤团队、CD34为什么不够、哪些染色本例并未做、良性肿瘤为什么还要随访、什么情况下考虑Carney综合征，以及如何与青少年及家长沟通。
原文PDF因封底印有其他文章带医院名称和日期的影像而不再引用。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
