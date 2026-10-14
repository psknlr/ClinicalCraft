# Case authoring guide

A case is one JSON file, `packages/content/cases/<id>/case.json`, validated by
`CaseSchema` (`packages/core/src/schema/case.ts`; JSON Schema for editors in
`packages/content/schemas/case.schema.json`). Optional `README.md` beside it
explains provenance and teaching notes. Commands:

```bash
clinicalcraft cases validate packages/content/cases/<id>/case.json   # schema + integrity
clinicalcraft cases verify <id>                                      # replays `solution`
clinicalcraft play <id> --provider offline                           # play it in the terminal
```

## 1. Non-negotiables

1. **Grounding** — the case file is the only source of truth (ARCHITECTURE §2.1).
   Anything the learner might reasonably ask that the case does not answer must
   be covered by `disclosure: "unknown"` items, `available: false` results,
   `examNotRecorded` or `unknowns`.
2. **Synthetic cases are labelled synthetic**: `provenance.kind: "synthetic"`,
   pseudonymous patient names, a `disclaimer` ("虚构教学病例，不构成医疗建议。" /
   "Fictional teaching case — not medical advice."). Never base a synthetic case
   on an identifiable real patient.
3. **Clinical accuracy** — management must follow current major guidelines
   (name them in `debrief.references` as plain citations, e.g. "Surviving Sepsis
   Campaign 2021 adult guidelines"); doses, thresholds and time windows must be
   correct for the stated patient (weight, age, renal function). Do not invent
   DOIs or URLs.
4. **Bilingual** — `locales: ["zh-CN", "en"]` (source language first); every
   `LocalizedText` has both. Use standard Chinese medical terminology
   (e.g. 急性ST段抬高型心肌梗死, 糖尿病酮症酸中毒) and natural lay Chinese in
   the patient's voice; same for English.
5. **No spoilers** in `title`, `summary`, `patient.chiefComplaint`, `tags`,
   `triageNote` or objective titles. (Title may name the presentation:
   "胸痛 · 58岁男性" / "Chest pain · 58-year-old man".)

## 2. Patient & persona

* `persona.personality`, `speechStyle`, `healthLiteracy`, `affect` shape the voice;
  `openingLine` is spoken on approach (may contain `volunteer` facts only);
  `fallbackUnknown` is what they say for anything unrecorded
  ("我不太清楚，医生。" / "I'm not sure, doctor.").
* `concerns` (ICE) — 1–3 realistic worries the patient raises when relevant.
* `actingNotes` — how to behave (in pain, breathless short sentences, anxious
  parent…). Never put facts here.
* Children, aphasia, delirium: add `persona.companion` with `answersHistory: true`.
* `appearance` matches age/sex/build (stature `child` for 2–12 y, `infant` < 2 y);
  `posture` matches the setting (lying in resus, sitting in clinic).

## 3. History

* 15–40 items. Cover the presenting complaint thoroughly (SOCRATES/OPQRST for pain:
  site, onset, character, radiation, associated symptoms, timing,
  exacerbating/relieving, severity), red flags, PMH, PSH, medications (with doses
  where the patient would know them), allergies (state "none known" explicitly if
  none), social (smoking, alcohol, occupation, living situation), family, focused
  ROS, ICE.
* `question` is the canonical clinician question; `answer` is in the patient's
  own words (lay language, may be imprecise the way real patients are).
* `keywords` per locale: 4–12 paraphrases/colloquialisms/key nouns a learner
  might type (e.g. zh-CN 胸口, 胸闷, 心口; en "chest", "tightness", "pressure").
  Never put answer content in keywords.
* `disclosure`: `volunteer` for what any patient says unprompted (chief complaint
  gist), `on-ask` (default), `specific` for things only a targeted question
  elicits (e.g. recent cocaine use, a specific family history), `unknown` for
  explicitly unrecorded/unknown facts.
* `required: true` for the 4–10 items a competent clinician must elicit.
* `excludeKeywords` per locale stop look-alike questions from selecting an item
  (its match score is multiplied by 0.2): e.g. on a medications item add
  `["allerg", "过敏"]` so "any drug allergies?" reaches the allergy item instead;
  on the patient's own cancer history add `["family", "家里", "家族"]`.
* `phases` restricts an item to phases (e.g. a medication changed after treatment);
  the patient pipeline only selects items available in the current phase.

## 4. Examination

* 8–25 findings across relevant systems, including pertinent negatives. `requires`
  only for capabilities beyond the personal kit (stethoscope, thermometer,
  reflex hammer and otoscope are always available).
* `abnormal: true` for positives; `required: true` for key manoeuvres.
* Vital signs belong in `physiology.baseline` (the monitor) — exam items may still
  describe general appearance.

## 5. Investigations

* Realistic panel: essential, useful, neutral, low-value and (if instructive)
  harmful tests (`value`). Results with `values` (analyte, value, unit, refLow,
  refHigh, flag) for labs; narrative `text` for imaging/ECG; `critical: true`
  where the lab would phone it through.
* `requires` capabilities (FACILITIES.md vocabulary), `turnaroundMinutes`
  (simulated cases: POC glucose 1, VBG 5, ECG 5, CBC 30–60, troponin 45–60,
  CT 20–40 incl. report, cultures → "pending"), `risk` (contrast CT `low`,
  LP `moderate`, arterial line `moderate`…).
* `aliases` per locale (common abbreviations both languages: "血气", "abg", "vbg").
* Multi-phase cases give results per phase; tests not done in a phase are simply
  absent (the UI says "no record").
* `alternativeTo: [ids]` marks interchangeable essentials (e.g. abdominal CT ↔
  ultrasound): reading either satisfies "essential investigations" in the assessment.

## 6. Interventions & physiology (acute cases)

* `clock.mode: "simulated"`, `startTime`, sensible `actionCosts`, optional
  `realtimeScale` (0–2), optional `limitMinutes`.
* `physiology.baseline` consistent with the presentation; `trends` for untreated
  deterioration that stop (`until`) when the right treatment is given (and
  `recoverPerMinute` for improvement); `events` for scripted turns (VF arrest if
  reperfusion is delayed, anaphylaxis biphasic warning…). Paediatric cases set
  `alarms` for age.
* Interventions: correct name, `dose` text (drug, dose, route, frequency), `risk`
  (high = irreversible/dangerous: thrombolysis, intubation, defibrillation,
  high-dose insulin bolus), `effects` with realistic magnitude/onset/ramp
  (e.g. salbutamol neb: spo2 +3 over 5–10 min; IM adrenaline: sbp +25 within 5 min,
  lasting 15–20 min), `indicatedWhen`/`contraindicatedWhen` capturing the key
  safety logic (nitrates in RV infarct/hypotension; insulin before K⁺ replacement
  when K⁺ < 3.5 mmol/L; thrombolysis with BP > 185/110), `harm` explaining the
  consequence, `response` describing what happens. Include common wrong choices
  so the learner can make them.

## 7. Learning design

* 4–6 `objectives` (chapters) in logical order with `hint`, `guidance` and
  `waypoints` (capability / role targets).
* 2–5 `decisions` (single best answer or select-all) with educational feedback
  on **every** option, unlocked by `requires` once the evidence exists.
* Conditions available everywhere: `all/any/not/always`, `asked`, `examined`,
  `ordered`, `read`, `resultReady`, `decided`, `decidedFirstTry` (rubric: first
  attempt correct), `attempted`, `intervened`, `phase`, `flag`, `objective`, `vital`,
  `elapsed`, `hints`.
* `rubric`: 8–15 deterministic items across domains (history, examination,
  investigations, diagnosis, management, safety, efficiency) + 1–3
  communication items judged by the examiner (`judgeGuidance`, no `met`).
* `npcs`: nurse (triage handover, logistics), consultants who interpret results
  the learner already has, attending (Socratic). Knowledge must not exceed the case.
* `debrief`: conclusion, 3–6 key reasoning points, boundaries, unknowns, 3–6
  teaching points, guideline references, and the formative-assessment notice.
* `solution`: an array of typed `ClinicalAction`s — the reference action path (start → … → finish) that completes all
  objectives and answers all decisions correctly. `clinicalcraft cases verify`
  must pass.
* `extensions.testUtterances`: 15–40 `{ "text", "locale", "expect": [historyIds] }`
  paraphrases (both locales) used as a matcher regression corpus.

## 8. Facilities

Set `facility` to `general-hospital` (or `clinic-v4` for V4-style outpatient
cases) and `setting` so a patient slot accepts it: outpatient → consult rooms,
emergency → resus bays/cubicles, inpatient/ward → ward beds, icu → ICU,
operating-room → theatre, community → garden bench.
