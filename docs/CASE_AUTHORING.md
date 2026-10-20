# Case authoring guide

A case is one JSON file, `packages/content/cases/<id>/case.json`, validated by
`CaseSchema` (`packages/core/src/schema/case.ts`; JSON Schema for editors in
`packages/content/schemas/case.schema.json`). Optional `README.md` beside it
explains provenance and teaching notes. Commands:

```bash
clinicalcraft cases new <id>                                         # scaffold a schema-valid bilingual template + README
clinicalcraft cases validate packages/content/cases/<id>/case.json   # schema + integrity (paths or --all)
clinicalcraft cases verify <id>                                      # replays `solution` + the utterance corpus (ids or --all)
clinicalcraft play <id> --provider offline                           # play it in the terminal
```

(From a checkout, `clinicalcraft` is `npm run cc --`; see the root README.)
A case outside `packages/content/cases` is found through the `contentDirs`
setting: each listed directory holds `cases/<id>/case.json`. A relative entry
resolves against the directory of the settings file that lists it — from
`<project>/.clinicalcraft/settings.json`, `"../content"` means
`<project>/content` (`"content"` would be `<project>/.clinicalcraft/content`);
an unknown-case error lists the directories searched. `clinicalcraft serve`
offers these cases to the web library too (marked "Server"; no reference
solution is sent to the browser).

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
  A history item whose `answer` is the patient's own words (a child saying how
  they feel) sets `speaker: "patient"`: it is then spoken by the patient, not
  the companion (default `companion` when it answers history).
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
  Never put answer content in keywords. An English phrase made mostly of
  stop-words ("where is the pain" → `pain`) matches any utterance with that
  one token; write it run together instead (`whereisthepain`,
  `wheredoesithurt`): it then matches only by containment (score 0.9), not
  token by token. `cases validate` warns on any keyword or alias of three or
  more words that reduces to one token ("what does he take" → `tak`, "when
  did it start" → `start`, "look at him" → `look`). Two-word phrases do it
  too ("live with" → `liv`, so "what do you do for a living?" reaches the
  household item): check them with the corpus.
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
  An answer in the present tense of the presenting state ("现在喘不上气",
  "my throat's closing") is wrong once treatment changes that state: give it
  only the phases where it holds, and give each later phase its own status
  item ("现在感觉怎么样？" / "How are you feeling now?") that agrees with that
  phase's scenario messages and exam findings (`dka-adult` `hx-status-*`,
  `anaphylaxis-garden` `status-*`). Two items with overlapping `phases` that
  answer the same question for different times are both selected and read as
  a contradiction — link them as phase twins instead (below).
* `supersedes: [ids]` makes an item the **phase twin** of earlier items: in
  every phase where the twin is available it answers for them. Typical use:
  the scene-time `hpi-throat` ("my throat's squeezing shut", phases `scene`,
  `treated`, `ed-resus`) and the ED-time `now-airway-ed` ("my throat's not
  tight now", phase `ed`) with `"supersedes": ["hpi-throat"]` on the ED item.
  * **Selection** — in a phase where the twin is available, a question that
    would select a superseded item selects the twin instead (the twin keeps
    the better score), whether or not the superseded item is itself listed
    for that phase; so the two are never co-selected and the stale answer is
    never spoken. The superseded item cannot be asked there either (the
    engine rejects a direct `ask` as `phase-locked`; `/ask` and
    `list_options` leave it out). Chains are followed (C supersedes B
    supersedes A).
  * **Credit** — asking the twin credits every item it supersedes
    (transitively) for `asked` conditions (objectives, decisions' `requires`,
    rubric `met`, phase `enterWhen`, scenario `when`) and for the
    assessment's required history (`requiredAsked`, `missingRequired`). So a
    `required` scene-time item first asked about in the ED is not lost. The
    superseded item is **not** added to `asked`: its answer was never heard,
    so it stays out of the revealed-fact ledger, the journal and the
    transcript, and `history.asked` still counts the questions really asked.
  * Credit is one-way: asking the original never credits the twin — a
    re-assessment question ("how is your breathing *now*?") must be asked in
    its own phase. To score the re-assessment itself, put `asked: <twin id>`
    in the rubric.
  * Give the twin its own keywords for "now"-phrasings; the superseded
    item's question and keywords already route to it in its phases. List the
    twin in `testUtterances` with ED-time phrasings: `cases verify` judges an
    utterance in the first phase of its first expected item, applying twins
    there. `cases validate` reports unknown ids, self-references and cycles
    (errors) and an item superseded in every phase it is listed for (a
    warning: it could never be asked, only credited).
* A single English keyword that stems to an everyday token matches far too
  much ("testes" → `test`, so "psoas test" and "blood tests" hit it); use
  other forms ("testicles") or a run-together phrase ("thetestes"). A
  run-together keyword must not begin with a content word of 6+ letters:
  "examinetestes" is prefix-matched by "examine" in every exam request.

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
  where the result is called through (the nurse says the lab phoned for
  lab/microbiology/pathology/genetics, radiology for imaging, and a critical
  finding at the bedside for bedside/procedure/record tests).
* A text `value` or `refText` that differs by language is a `LocalizedText`
  (`{"zh-CN": "阴性", "en": "negative"}`, `{"zh-CN": "< 0.6 正常", "en": "< 0.6
  normal"}`) — never both languages in one string ("阴性 / negative"), which
  every locale would then show.
* `requires` capabilities (FACILITIES.md vocabulary), `turnaroundMinutes`
  (simulated cases: POC glucose 1, VBG 5, ECG 5, CBC 30–60, troponin 45–60,
  CT 20–40 incl. report, cultures → "pending"), `risk` (contrast CT `low`,
  LP `moderate`, arterial line `moderate`…).
* `aliases` per locale (common abbreviations both languages: "血气", "abg", "vbg").
* Multi-phase cases give results per phase; tests not done in a phase are simply
  absent (the UI says "no record").
* `alternativeTo: [ids]` marks interchangeable essentials (e.g. abdominal CT ↔
  ultrasound): reading either satisfies "essential investigations" in the assessment.
* `orderMatching.warnings` are shown whenever the order query matches, in every
  phase. Word them as a condition that stays true once it is met ("a result
  exists only once the lab has been activated and the patient is there"), not
  as an instruction ("activate the lab first") that reads wrong in the cath lab.
  A warning that stops applying once something has happened takes an
  optional `unless` condition (the full condition DSL): it is evaluated on
  the session as the order is placed (before it), and the warning is not
  shown while it holds — e.g. `"unless": {"all": [{"intervened":
  "activate-cath-lab"}, {"phase": "cath-lab"}]}` on the "only in the cath
  lab" notice. Its ids are checked by `cases validate` like any condition.

## 6. Interventions & physiology (acute cases)

* `clock.mode: "simulated"`, `startTime`, sensible `actionCosts`, optional
  `realtimeScale` (0–2), optional `limitMinutes`.
* `physiology.baseline` consistent with the presentation; `trends` for untreated
  deterioration that stop (`until`) when the right treatment is given (and
  `recoverPerMinute` for improvement); `events` for scripted turns (VF arrest if
  reperfusion is delayed, anaphylaxis biphasic warning…). Paediatric cases set
  `alarms` for age.
* The bedside shows only what a monitor measures (hr, BP, rr, SpO₂, T, EtCO₂)
  plus nursing observations (GCS, pain). A modelled glucose stays engine-only
  until a glucose test is read: list it in `physiology.revealedBy`
  (`{"glucose": ["poc-glucose"]}`). Arrest events need not set `pain` (an
  unresponsive patient has no pain score; the monitor shows no reading).
* **A monitor the learner must attach.** When the triage note leaves the
  patient off the monitor and the case has a monitoring intervention, set
  `physiology.monitor`:

  ```json
  "monitor": {
    "attachedWhen": { "any": [{ "intervened": "cardiac-monitoring" }, { "phase": "angio" }] },
    "spotChecks": ["hr", "sbp", "dbp", "rr", "spo2", "temp"]
  }
  ```

  Until `attachedWhen` holds (the engine latches the minute, so the monitor
  stays on when a phase condition later stops holding) no monitored vital,
  trend, alarm or rhythm is shown — the rhythm is a finding the learner
  earns from the monitor, the pulse or the ECG. `spotChecks` are what the
  triage/bedside staff measured by hand, exactly as the triage note records
  them: they are shown as static readings of the **baseline**, labelled as
  triage readings, never alarmed or trended (list only what the note gives —
  the anaphylaxis nurse took no temperature). Cover every realistic path in
  `attachedWhen`: the monitoring intervention, and arrival in a monitored
  area or a step that brings a monitor (transfer to the cath lab or ED,
  an arterial line, the team's defibrillator in an arrest). Omit
  `monitor` when the patient is on the monitor from the start (the triage
  note says so). The reference solution must attach it (`cases verify`
  warns otherwise). Two optional refinements, for a monitor that is not one
  device: `measures` lists what it measures once attached (default every
  monitored vital the baseline models — list the others out when nothing
  takes them: the anaphylaxis garden has no thermometer, so `measures`
  leaves out `temp`), and `ecgWhen` holds back the rhythm/ECG until the leads
  are on (a pulse oximeter and cuff go on with `monitoring`, the 3-lead ECG
  with the team's monitor-defibrillator: `{"any": [{"intervened":
  "call-help"}, {"intervened": "transfer-ed"}]}`) — then a scenario line that
  reads the ECG ("salvos of ectopics on the monitor") needs the ECG, not just
  the monitor, in its `when`. `vital` conditions are unaffected — they read the
  patient — but a rubric item or decision that expects the learner to have
  *seen* a value should only be reachable once the monitor (or a spot check)
  shows it.
* **Lines that read the monitor need one.** A scenario message that says
  "Monitor alarm", "on the monitor" or names a rhythm only a monitor shows
  must not fire before the monitor is attached: word it as what staff see
  and feel (a racing, irregular pulse; a blood pressure the nurse measured),
  or split it into a monitored and an unmonitored variant — the same
  `setVitals`/`setFlags`, `when` + the attaching leaf vs. `when` + its
  negation, each guarded by `{"not": {"flag": <the flag both set>}}` so that
  attaching the monitor later does not fire the other one (`dka-adult`
  `ev-k-crash` / `ev-k-crash-unmonitored`, `anaphylaxis-garden`
  `iv-bolus-*`). The same goes for NPC knowledge ("triage vital signs match
  the monitor"), persona acting notes ("keeps glancing at the monitor"),
  intervention responses and doses ("the SpO₂ on the monitor rises", "SpO₂
  quickly reaches 100 %", "KCl … ; continuous ECG monitoring" — say it
  *needs* monitoring, attach the monitor), exam findings and decision `need`
  texts ("read the BP from the monitor" — add "once it is attached") and
  result notes ("glucose is charted on the bedside monitor" — the bedside
  observations). The response of the step that attaches the monitor names
  no rhythm: a scenario event may have changed it before (dopamine-induced
  AF in `septic-shock-cap`) — the screen shows it.
* Scenario `setVitals` re-base the model: trends and intervention effects keep
  adding to the new values. Set `absolute: true` when the authored numbers
  must be exact from that minute — a ROSC or post-reperfusion state — so
  that, for the vitals the event sets, trends and drug effects that started
  earlier stop contributing (later ones still add). Without it a ROSC
  authored as BP 88/56 reads ~100 after a pre-arrest fluid bolus.
* Cardiac arrest is a rhythm: an event that sets `rhythm` to
  `ventricular-fibrillation` or `asystole` (or `pea`, or
  `ventricular-tachycardia` with `sbp: 0` for pulseless VT) makes the monitor
  read hr (VF/asystole only), BP and SpO₂ as unmeasurable whatever the
  baseline, trends and earlier drugs add, and caps a modelled EtCO₂ at 10
  (ARCHITECTURE §3.2). The arrest event need not set those vitals (they are
  overridden; only pulseless VT needs `sbp: 0` to mark it pulseless) — set
  what still applies (`rr: 0`, `gcs: 3`). `vital` conditions see the arrest
  readings, so guard other events with `{"not": {"flag": …}}` /
  `{"flag": "rosc"}` as needed. The ROSC event restores the additive model:
  give it every vital it changes and `absolute: true` (see the STEMI case).
* Scenario `message`s are spoken by staff: one that fires on time alone must
  not name the diagnosis or its treatment before the learner has established
  it (split it, e.g. `{"any": [{"read": "ctpa"}, {"decided": "risk-strat"}]}`
  vs. its negation — see the PE case). Who says it is inferred from the text
  — "Nurse:"/"护士：" → the nurse, "Monitor:"/monitor alarms → the monitor,
  "<patient name>:" (e.g. "Ms Lin:", "林女士说：") → the patient (or
  companion), anything else is narration ("Scene") — or set the event's
  `speaker` (`nurse`, `monitor`, `patient`, `companion`, `narrator`;
  `companion` needs a `persona.companion` — `cases validate` reports it).
  The monitor is not assumed: the nurse reports an abnormal value without
  saying "the monitor is alarming" (the patient may not be on one yet).
* Interventions: correct name, `dose` text (drug, dose, route, frequency — the
  learner sees it before giving anything, so write formulas such as
  "0.9 mg/kg, max 90 mg" or "adjust if creatinine clearance < 30 mL/min",
  never patient values the learner must elicit or measure: weight, creatinine
  clearance, pump settings, or a number derived from them — "urine ≥ 0.5
  mL/kg/h ≈ 28 mL/h" gives the weight away; put the concrete numbers in
  `response`), `risk`
  (high = irreversible/dangerous: thrombolysis, intubation, defibrillation,
  high-dose insulin bolus), `effects` with realistic magnitude/onset/ramp
  (e.g. salbutamol neb: spo2 +3 over 5–10 min; IM adrenaline: sbp +25 within 5 min,
  lasting 15–20 min), `indicatedWhen`/`contraindicatedWhen` capturing the key
  safety logic (nitrates in RV infarct/hypotension; insulin before K⁺ replacement
  when K⁺ < 3.5 mmol/L; thrombolysis with BP > 185/110), `harm` explaining the
  consequence, `response` describing what happens. Include common wrong choices
  so the learner can make them. One `harm` text serves every branch of
  `contraindicatedWhen`: lead with the commonest branch and make the others
  conditional ("If he is in VF, …"). A step that only makes sense after
  another (transfer after activating the cath lab) should not quietly succeed
  without it: gate the next phase on both, and flag the out-of-order step for
  the rubric (see `transfer-before-activation` in the STEMI case). Aliases
  must say what the learner means *now*: "/give epipen" during anaphylaxis is
  IM adrenaline, not a take-home prescription.

## 7. Learning design

* 4–6 `objectives` (chapters) in logical order with `hint`, `guidance` and
  `waypoints` (capability / role targets). The `hint` is the scored hint
  (shown for done objectives and on request); `guidance` is the quest-card and
  journal copy. Neither may state results the learner has not obtained.
* 2–5 `decisions` (single best answer or select-all) with educational feedback
  on **every** option, unlocked by `requires` once the evidence exists. A
  locked decision is shown only by number and `need`; once unlocked its
  prompt may use evidence its `requires` guarantees, but must not state
  another decision's answer unless it `requires` that decision. Options are
  presented in a seeded shuffle, so list them in any order.
* Conditions available everywhere: `all/any/not/always`, `asked`, `examined`,
  `ordered`, `read`, `resultReady`, `decided`, `decidedFirstTry` (rubric: first
  attempt correct), `attempted`, `intervened`, `phase`, `flag`, `objective`, `vital`,
  `elapsed`, `hints`.
* `rubric`: 8–15 deterministic items across domains (history, examination,
  investigations, diagnosis, management, safety, efficiency) + 1–3
  communication items judged by the examiner (`judgeGuidance`, no `met`).
  Score decisions with `decidedFirstTry`: with a few options and feedback on
  each, `decided` gives full marks to guess-and-retry.
* `npcs`: nurse (triage handover, logistics), consultants who interpret results
  the learner already has, attending (Socratic). Knowledge must not exceed the case,
  and must not contain result findings or derived values (another study's
  report, a creatinine clearance, a score total): model-backed NPCs get it in
  their prompt, and results reach them through `get_results` only once read.
  Keep it to interpretive/teaching knowledge and boundaries.
* `debrief`: conclusion, 3–6 key reasoning points, boundaries, unknowns, 3–6
  teaching points, guideline references, and the formative-assessment notice.
* `solution`: an array of typed `ClinicalAction`s — the reference action path (start → … → finish) that completes all
  objectives and answers all decisions correctly. `clinicalcraft cases verify`
  must pass.
* `extensions.testUtterances`: at least 15–40 `{ "text", "locale", "expect": [historyIds] }`
  paraphrases (both locales; the built-in cases carry several dozen) used as a
  matcher regression corpus. `cases verify` applies the patient pipeline's
  selection rule to each: the history items scoring ≥ 0.55 must include every
  expected id and be led by one of them; `expect: []` must select nothing.
  A missing corpus is a warning. So is an utterance whose selection would also
  credit a fact it does not ask about (the pipeline's full rule: ≥ 0.55,
  within 0.25 of the best, at most 3, in a phase of the first expected item):
  fix the keywords, or list a deliberate extra in the entry's `alsoOk: [ids]`.
  Chinese keywords: a phrase sharing only two characters with a question
  (not its first two, or a question bigram such as 怎么/什么) stays below the
  select band (0.5), so give each item the distinctive 3–4-character phrases
  learners use ("量过血压", "以前有什么病").

## 8. Facilities

Set `facility` to `general-hospital` (or `clinic-v4` for V4-style outpatient
cases) — `cases validate` fails when an objective or decision of the case
needs a capability its facility lacks (`caseCapabilityGaps`), and the web
offers another facility only if the case can be completed there — and
`setting` so a patient slot accepts it: outpatient → consult rooms,
emergency → resus bays/cubicles, inpatient/ward → ward beds, icu → ICU,
operating-room → theatre, community → garden bench.

**Grounding the kit (embodied mode, docs/EMBODIED.md §6).** In the 3D world
a clinical act needs what it names at the bedside, so `requires` is part of
the clinical content, not decoration:

* Name the kit an intervention needs: high-flow oxygen → `oxygen`, a
  nebuliser → `nebulizer` (+ `oxygen` when oxygen-driven), continuous
  monitoring → `cardiac-monitor`, an infusion → `infusion-pump`. An empty
  `requires` takes its kind's defaults (`KIND_DEFAULT_CAPABILITIES`): `oxygen`
  → `oxygen`, `monitoring` → `cardiac-monitor`, `fluid` → `iv-access`,
  `airway` → `airway`; anything else needs only the clinician at the patient.
  An item that is a plan or advice rather than equipment (an hourly
  monitoring plan, home blood-pressure monitoring) is kind `other`, not
  `monitoring`. Drugs and blood products (`medications`, `blood-bank`) are
  delivered to the bedside.
* Every IV item (an IV drug, infusion or bolus) requires `iv-access`. IV
  access is **patient state**: give the case one IV-access procedure (id
  `iv-access`, else a `procedure` requiring `iv-access`, else a cannulation
  id) — it needs the cannulation kit (a crash or treatment cart) at the
  bedside, and the other `iv-access` items then need it done first (they are
  refused with the procedure to do, no walk fixes it). The reference
  `solution` must place the cannula before the first IV item. A patient who
  arrives with a cannula in situ (a post-operative ward patient) sets
  `extensions.embodied.ivAccessInSitu: true`: IV items need no procedure
  first (the procedure then places a further line).
* Laboratory tests (`lab-*`, `blood-bank`, `flow-cytometry`, microbiology) are
  sampled at the patient: they are ordered at the patient's side, or — once
  the case's IV-access procedure has drawn the bloods (blood samples; urine
  is collected at the patient) — at any `records` terminal or a laboratory
  station. Results are read at a `records` terminal, at the patient or at a
  laboratory station; a bedside test (an ECG) is read at the patient or a
  records terminal, never on the device. Outpatient cases without an IV
  procedure therefore order their bloods at the patient's side.
* Say who may do it when another body acts (a delegated nurse, a skill step —
  EMBODIED §8 scope of practice): an intervention's optional `scope` is
  `nursing` (within a registered nurse's and a paramedic's scope: chest
  compressions, defibrillation by ILS/ALS-trained ED/CCU nurses, a urinary
  catheter, an NG tube, a bedside swallow screen, inhaler teaching) or
  `medical` (a doctor's act even when its kind is usually nursing, e.g. a
  drug only a doctor gives). Omitted, the kind decides: medication, fluid,
  oxygen, monitoring and positioning are nursing, the case's IV access is
  nursing, airway is also a paramedic's, everything else is medical.
* A `community` case has no kit outside: everything it needs (an oxygen
  cylinder, a crash or treatment cart, a monitor-defibrillator, a nebuliser)
  must be fetchable from the facility as a portable cart — check that the
  facility has an in-service portable placement providing each capability,
  and say in the README what the learner brings.

**Where the patient goes, how they look (embodied mode, EMBODIED §8; reviews
G8 / G12).** The patient's body moves and shows clinical state; author it,
never leave it to a guess:

* A study done **on the patient at a fixed device** (`ct`, `mri`, a fixed
  `xray`, `fluoroscopy`, `pet-ct`, `endoscopy`) or a **patient-performed test**
  at a station (`peak-flow`, `scale`) needs the patient brought there in
  embodied mode (`transport_patient`, by the learner, a porter or a nurse).
  A film taken with a portable machine at the bedside says so: investigation
  `performedAt: "bedside"` (default `"provider"`) — e.g. the resus "portable
  CXR" — and then needs nobody moved.
* A transfer that takes the patient somewhere names it: an intervention's
  optional `destination` — exactly one of `{ "setting": "icu" }` (the first
  patient slot accepting that setting), `{ "roomKind": "operating-room" }` or
  `{ "capability": "fluoroscopy" }` (the patient position at the providing
  device: the cath-lab table by the C-arm) — e.g. STEMI `transfer-cath-lab`,
  PE `transfer-hdu`, asthma `admit-picu`. A phase that happens somewhere else
  says where with `location` (same shape) — STEMI `cath` / `post-pci`, stroke
  `angio`, anaphylaxis `ed-resus` / `ed`. The patient is moved when the
  intervention is applied or the phase starts (nothing charged: the act's own
  time); a facility without such a place leaves the patient where they are,
  and the result says so. Never author a destination for an order, a consult
  or a discharge home.
* A positioning or transfer that changes how the patient lies or sits sets
  `posture` (`lying` | `sitting` | `standing`): "lie her flat with legs
  raised" → `lying`, "sit upright" → `sitting`, a trolley transfer →
  `lying`, a patient made to walk who collapses → `lying`. The latest applied
  intervention with a posture wins over `patient.posture`; bystanders, the
  collider and the web NPC show it.
* An oxygen intervention may name its delivery `device`: `nasal-cannula`,
  `high-flow-nasal-cannula`, `simple-mask`, `non-rebreather-mask`,
  `venturi-mask`, `nebuliser-mask`. Masks show a mask on the face, cannulae
  show cannulae. Without it, a mask named in the id, name or dose text in
  either language ("15 L/min via non-rebreather mask", "储氧面罩") counts.
