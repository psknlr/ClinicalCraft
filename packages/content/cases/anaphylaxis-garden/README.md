# `anaphylaxis-garden`: breathless after a sting in the garden (30-year-old woman)

> **Spoilers for case authors.** This file names the diagnosis. Learners should
> open the case from the case library. The title, summary, chief complaint,
> tags, triage note, phase labels and objective titles do not name it.

> **Synthetic case.** This is a fictional teaching case. The patient (林晓岚 /
> Lin Xiaolan), her family, Nurse Zhou Min, Dr Gao Yan, Dr Shen and every
> clinical detail are invented. Nothing is based on a real patient. The case is
> not medical advice (`disclaimer`: 虚构教学病例，不构成医疗建议。/ Fictional
> teaching case — not medical advice.).

| | |
|---|---|
| id / version | `anaphylaxis-garden` / `1.0.0` |
| setting / facility | `community` / `general-hospital` (garden-bench patient slot in the healing garden) |
| locales | `zh-CN` (source language), `en` |
| clock | `simulated`, starts 15:40, `realtimeScale` 1, no time limit; costs: ask 0.5 · examine 0.5 · order 0.5 · read 0.5 · intervene 1 · answer 0 min (a fast-paced resuscitation) |
| phases | live progression, none learner-switchable: `scene` (garden, before treatment) → `treated` (garden, after the first IM adrenaline) → `ed-resus` (transferred after only one dose; resuscitation ongoing) → `ed` (transferred and two doses given; stabilising). Wrong path: `collapsed` (garden, peri-arrest before any adrenaline; left at the first IM dose) |
| difficulty / time | 3 / 5 · about 25 min |
| content | 46 history items (3 `unknown`, 3 `specific`, 9 required; 4 phase-specific "how are you now?" answers incl. the groan-only `status-collapsed`; 5 `ed`-only "now" answers for re-asked symptoms, phase twins (`supersedes`) of the 7 garden-time symptom items; all other items unavailable while `collapsed`) · 25 exam findings (phase-specific reassessment and peri-arrest variants) · 14 investigations (4 useful, 5 neutral, 4 low-value, 1 harmful; ED results for both `ed-resus` and `ed`) · 21 interventions (9 wrong or not-first-line choices) · 10 physiology trends · 16 scenario events (5 of them silent markers) · 5 objectives · 3 decisions · 16 rubric items (13 deterministic, 3 examiner-judged) · 5 NPCs · 113 test utterances (2 negative; 16 ED-time re-asks) |

## Clinical story

It is 15:40 in the hospital's healing garden. A 30-year-old secondary-school
music teacher was visiting her father on the cardiology ward. She was sitting
on a bench by the lavender when a honeybee stung her right forearm, about
8 minutes before the case starts. Within minutes she had generalised itching
and hives, then swollen lips and tongue, throat tightness with a hoarse voice,
wheeze, dizziness when she tried to stand, nausea and abdominal cramps. A ward
nurse heard the shout and ran over with the emergency bag. Her portable
readings are **BP 78/44 mmHg (MAP 55), HR 128, RR 26, SpO₂ 92 % on air**.

**History.** Mild asthma as a teenager, with no inhaler for years. She has
spring hay fever and takes cetirizine in season. Her only regular medicine is
the combined oral contraceptive pill. She has no known drug allergies and has
never taken beta-blockers or ACE inhibitors. Last summer an ankle sting (bee or
wasp, she is not sure) caused a large local reaction. She was given no
auto-injector and has never had allergy testing. Her in-laws keep two beehives
in the countryside, and she helps there most summer weekends. Both of these
facts are `specific` disclosures. She has not been unwell recently (no cold,
fever or infection — asked because infection is a cofactor). Three items are
explicitly unknown: tetanus status, any family history of mast-cell disorders,
and her usual blood pressure.

**Examination at first contact (`scene`).** She has swollen lips (upper more
than lower), a swollen tongue and an oedematous uvula. Her voice is hoarse but
there is no stridor at rest. There is widespread polyphonic expiratory wheeze
with reduced air entry at both bases. Her radial pulse is thready and central
capillary refill is about 4 s, with a flushed, warm trunk but cool, clammy
hands. She has generalised urticaria and conjunctival injection. The honeybee
stinger and venom sac are still in her right forearm. Her handbag holds no
auto-injector and she has no medical alert card or bracelet.

**Diagnosis.** Severe honeybee-venom anaphylaxis with airway, breathing and
circulation involvement, i.e. anaphylactic shock (WAO 2020 criteria). Skin
features are present but are not required for the diagnosis.

**Reference management** (`solution`, verified by `verifyCase`):

1. Ask what happened, then call the hospital emergency team.
2. Rapid A–B–C assessment: airway, chest and circulation.
3. **IM adrenaline 0.5 mg (0.5 mL of 1 mg/mL) into the anterolateral thigh at
   minute 4.5.**
4. Lie her flat with legs raised. She is breathless when completely flat, so
   the nurse raises her head and shoulders slightly and keeps her legs up.
5. High-flow O₂ 15 L/min, monitoring, an 18G cannula with bloods, and a
   500–1000 mL crystalloid bolus.
6. Reassess at 5 minutes. She is still hoarse and wheezy, with SBP about 87.
   Give a **second IM dose** about 6–7 minutes after the first.
7. Salbutamol 5 mg nebulised for wheeze that persists after adrenaline.
8. Remove the stinger.
9. Take a focused history: drug allergies, medicines including beta-blockers
   and ACE inhibitors, asthma, previous sting reaction, auto-injector.
10. Take timed tryptase samples.
11. Transfer her to the ED on a trolley, lying flat.
12. In the ED: VBG and ECG, then cetirizine for residual itch once she can
    swallow safely.
13. Keep her in overnight: observe for **≥ 12 h after resolution**. Two doses
    alone would mean ≥ 6 h, but the reaction involved severe respiratory
    compromise (laryngeal signs, hypoxaemia), which means ≥ 12 h (RCUK 2021,
    adopted by NICE NG258).
14. Prescribe two auto-injectors with training and a written action plan.
15. Refer her to the allergy clinic for venom immunotherapy (VIT) assessment.

## Physiology model (what the monitor does)

* **No monitor in the garden (`physiology.monitor`).** The nurse's emergency
  bag has a portable pulse oximeter and BP cuff but nobody is monitoring her
  continuously: until `monitoring` is given (or she is transferred, lying
  flat and monitored, `transfer-ed`) the bedside shows only the nurse's
  portable readings at arrival — BP 78/44, HR 128, RR 26, SpO₂ 92 %
  (`spotChecks`: static, no alarm; **no temperature**, none was taken; no
  rhythm) — plus GCS. The `monitoring` response attaches the pulse oximeter
  and the automated cuff at once: from then on HR, BP, RR and SpO₂ are live
  and alarm, but there is **no rhythm** ("ECG leads not attached", a flat
  lead II) until the team's monitor-defibrillator (3-lead ECG) is there —
  `ecgWhen`: `call-help` (or the transfer to the ED). Calling for help shows
  the rhythm at once, although the team takes 3–4 minutes (the engine has no
  "minutes since X" condition); in the reference path the team was called 7
  minutes before `monitoring`, so it is there by then. **No temperature** at
  any point (`measures` leaves out `temp`): neither the bag nor the
  monitor-defibrillator takes one, and the case records none. The IV-bolus
  scenario lines that read the ECG need the ECG, not just the oximeter (see
  below).

* **Two trend families per vital.**
  * The `*-early` trends stop at the **first** IM adrenaline dose.
  * The `*-persisting` trends stop only at the **second** dose (`minCount: 2`).
  * One dose therefore gives a partial response. At the 5-minute reassessment
    SBP is still about 85–88 and the treated-phase findings show persistent
    hoarseness and wheeze, so the second dose is genuinely indicated.
  * Both families recover toward baseline after they stop (`recoverPerMinute`).
* **Each IM dose has two components.** A persistent component (SBP +8,
  DBP +4, HR −10, SpO₂ +2, RR −2) represents the reaction resolving. A 15-min
  transient component (SBP +8, DBP +4, HR +6 for 8 min) represents the peak
  drug effect.
* **Supportive measures add their own effects:** legs raised (SBP +6), O₂
  (SpO₂ +5), each crystalloid bolus (SBP +10, HR −8 over 10 min) and
  salbutamol (SpO₂ +2, RR −3, HR +6 for 30 min).

Replay of the reference solution (modelled values, including the deterministic monitor jitter; the bedside shows them live from the `monitoring` step at 7.5 min — before that, only the static portable readings at arrival):

| minute | HR | BP (MAP) | RR | SpO₂ | context |
|---:|---:|---|---:|---:|---|
| 0 | 128 | 78/44 (55) | 26 | 92 | first contact |
| 4.5 | ≈135 | ≈72/43 (53) | ≈29 | ≈90 | 1st IM adrenaline |
| 9–10 | ≈128 | ≈87/51 (63) | ≈26 | ≈96 | reassessment (airway, chest, circulation): partial response on O₂ + legs up → 2nd dose at 11 |
| 12.5–14 | ≈128 | ≈92–103/53–57 | ≈25 | ≈98 | IV access + crystalloid bolus |
| 20 | ≈115 | ≈113/63 (80) | ≈21 | 100 | stabilising; transfer at 22.5 |
| 60–110 | ≈98 | ≈111/60 (77) | ≈18 | 100 | ED observation; sinus rhythm |

Without adrenaline, SBP falls to about 56 by minute 10. At that point the
`peri-arrest` event fires (GCS 10, "we're losing her") and the case enters the
`collapsed` phase: she can no longer give history (every history item except
the groan-only `status-collapsed` is phase-locked) and the general-appearance,
circulation and neurological findings switch to peri-arrest variants. At
minute 16 the `near-arrest` event follows (GCS 9, gasping, thready carotid
pulse; SBP has bottomed out at about 50, MAP about 37). GCS 10 is what the only
neurological exam available in `collapsed` scores: eyes to a loud voice or
pain (E3), mumbling without answering questions (V2), localising to pain (M5). The first IM dose
leaves `collapsed` (for `treated`, or `ed-resus` after a deferred transfer);
`peri-arrest-partial` raises GCS to 14 once SBP reaches 65, and
`peri-arrest-recovered` restores GCS 15 at SBP ≥ 90, which takes the second
dose. The other scripted events are:

* `adrenaline-prompt`: the nurse offers the drawn-up adrenaline at 5 min. It
  sets `adrenaline-delayed`, which fails the weighted rubric item.
* `upright-while-hypotensive`: she greys out when sat up with SBP < 90. The
  silent `upright-faint` puts GCS 13 on the bedside observations (unless she is already
  peri-arrest) and `upright-recovered` restores 15 once adrenaline has brought
  SBP to ≥ 90. Sitting up itself only lowers SBP by 14 for 5 min, so a
  stabilised patient sat up in the ED does not faint.
* `iv-bolus-arrhythmia`: broad-complex runs and a hypertensive spike after an
  IV bolus. This does **not** stop the anaphylaxis trends.
  `iv-bolus-ischaemia` then puts ST depression on the monitor while SBP is
  above 145, and `iv-bolus-wears-off` clears it once SBP falls back below 135
  ("the IV push has not controlled the reaction"). Each has an
  `*-unmonitored` twin that fires instead when she has no ECG on yet —
  `monitoring` with the team called, or the ED, gives one; the oximeter alone
  does not — (her pounding head and chest, a racing chaotic pulse, then a weak radial
  pulse again): same `setVitals`/`setFlags`, guarded on the flag they set
  (`iv-adrenaline-harm`, `iv-bolus-st-change`, `iv-bolus-settled`), so
  attaching the monitor later never replays the screen version.
* `sinus-in-ed`: the rhythm label changes to sinus once HR < 100 in the ED.
* `asks-to-leave`: at 90 min she asks to go home. This is the disposition
  teaching prompt. The event sets `speaker: "patient"`, so she says it herself.
* Silent scoring markers (no message): `reassessed-before-repeat` (a
  treated-phase reassessment between the first and second IM dose),
  `adjunct-before-adrenaline` (antihistamine, steroid or salbutamol before any
  adrenaline) and `moved-before-adrenaline` (transfer or walking before any
  adrenaline). The condition DSL cannot ask "was X before Y", so these events
  record it when it happens.

## Tempting wrong choices (all playable)

| choice | appropriateness | why |
|---|---|---|
| Adrenaline 0.5 mg **IV bolus** | contraindicated (high risk) | Undiluted IV bolus of the IM dose causes hypertension, VT, ischaemia and pulmonary oedema. IV adrenaline is for arrest or an expert-titrated infusion. |
| Adrenaline **subcutaneous** | contraindicated | Slow, unreliable absorption in shock. Only a small, delayed effect, and the trends continue. |
| **Antihistamine** (oral cetirizine or IV chlorphenamine) or **hydrocortisone** before adrenaline | contraindicated | Adjuncts that treat none of A/B/C. Delaying adrenaline is the avoidable factor. IV chlorphenamine is also flagged if SBP < 90. |
| **Sit her upright / stand her** with SBP < 90 | contraindicated | "Empty ventricle": SBP −14 for 5 min, faint event and GCS 13 until adrenaline restores SBP ≥ 90. |
| **Walk her (or wheelchair) to the ED** | contraindicated | Same mechanism. Transfer lying flat on a trolley after adrenaline. |
| **Transfer before IM adrenaline** | contraindicated | Delays treatment. The phase stays `scene` until adrenaline is given, then goes to `ed-resus`. Sets `moved-before-adrenaline`, which fails `r-adr-first`. |
| **Discharge now** | contraindicated | Shock and severe respiratory compromise (≥ 12 h), auto-injectors and training still needed, biphasic risk. The texts make no claim about how many doses were given, so they stay true on every path. |
| **Salbutamol** before adrenaline | contraindicated | "Treating it as asthma": bronchospasm only, not laryngeal oedema or shock, and it delays adrenaline (same logic as antihistamine/steroid first). After adrenaline it is indicated. |
| CTPA | `harmful` investigation | Contrast and leaving resus during an anaphylaxis observation period, with no indication. |
| CXR, troponin, CRP, venom sIgE | `low-value` | None changes acute management. Venom sIgE may be falsely negative early; repeat at 4–6 weeks. |

## Teaching notes

* **Recognition is clinical.** The criteria are sudden onset after a likely
  allergen plus airway, breathing or circulation problems. Do not wait for a
  BP threshold or a tryptase. Skin features are absent in 10–20 % of cases,
  and urticaria alone is not anaphylaxis.
* **"IM, thigh, 1 mg/mL, 0.5 mL."** Say it aloud, get a read-back, note the
  time, and reassess at 5 minutes. Watch for the ten-fold error: 1:10 000
  (0.1 mg/mL) at 0.5 mL gives only 0.05 mg. Paediatric IM doses (RCUK 2021)
  are 6–12 y 0.3 mg, 6 months–6 y 0.15 mg and < 6 months 0.1–0.15 mg.
* **Refractory anaphylaxis** is failure to improve after two IM doses. It
  needs expert help and a low-dose IV adrenaline infusion. That pathway is
  outside this case's scope and is mentioned in the debrief and the attending
  brief.
* **Positioning follows the BP.** For hypotension or faintness, lie her flat
  with legs raised. For breathing difficulty with a normal BP, she may sit up.
  When she has both, as here, use a compromise: head and shoulders slightly
  up and legs still raised. The `position-supine-legs` response models this.
* **Adjuncts.**
  * Non-sedating oral antihistamine for skin symptoms only after
    stabilisation, and only when she can swallow safely. `cetirizine-po` is
    `indicated` only in the `ed` phase (tongue back to normal size, swallowing
    easily); after adrenaline but while the tongue is still swollen
    (`treated` / `ed-resus`) it is `neutral`.
  * Corticosteroids are not routine (RCUK 2021). Consider them only for
    refractory reactions or ongoing asthma or shock after initial
    resuscitation.
  * There is no reliable evidence that either agent prevents biphasic
    reactions.
* **Tryptase timing.**
  * Take the first sample as soon as feasible once resuscitation is under
    way, never delaying treatment. The case returns a *normal* 9.2 µg/L if it
    is drawn before adrenaline (about 10 min after onset). That is the lesson
    that an early normal value does not exclude the diagnosis.
  * Take a second sample at 1–2 h, and no later than 4 h (27.4 µg/L).
  * Take a baseline sample ≥ 24 h after recovery. The case leaves this
    explicitly unknown.
  * Interpret with the 20 % + 2 rule: acute > 1.2 × baseline + 2 µg/L.
* **Disposition (RCUK 2021).**
  * Fast-track discharge after 2 h requires all of these: a good response to a
    single dose given within 30 min of onset, complete resolution, unused
    auto-injectors already held with training, and supervision at home.
  * Two doses, or a previous biphasic reaction, mean ≥ 6 h.
  * More than two doses, severe asthma, a reaction involving severe
    respiratory compromise, an out-of-hours presentation or poor access to
    care mean ≥ 12 h. Her hoarse voice with uvular oedema and hypoxaemia count
    as severe respiratory compromise, so the correct disposition is ≥ 12 h
    (overnight). NICE NG258 (2026) adopted these RCUK tiers.
  * Biphasic reactions occur in about 5 % (reported 1–20 %). In a
    meta-analysis the median onset was about 11 h (range 0.2–72 h);
    hypotension at presentation is a risk factor.
* **Discharge bundle.**
  * Two adrenaline auto-injectors carried at all times, with teach-back
    training.
  * A written anaphylaxis action plan.
  * Referral to an allergy clinic for venom-specific IgE or skin tests at
    about 4–6 weeks, a baseline tryptase, and VIT assessment. EAACI 2018
    recommends VIT for adults whose systemic sting reactions go beyond the
    skin and whose sensitisation is documented. Her in-laws' beekeeping makes
    re-exposure likely.
* **Risk modifiers to ask about:** asthma, beta-blockers or ACE inhibitors
  (beta-blockade can blunt the response to adrenaline), mast-cell disorders,
  and cofactors such as exercise, alcohol and NSAIDs.
* **A large local reaction** carries only a low risk (about 4–10 %) of a later
  systemic reaction. It is neither a diagnostic criterion nor, on its own, an
  indication for an auto-injector. Today's systemic reaction is.

## Environment design (garden + emergency bag)

* All interventions have `requires: []`. The nurse's emergency bag (contents
  listed in the nurse NPC brief) provides:
  * adrenaline 1 mg/mL × 5
  * portable O₂ up to 15 L/min with non-rebreather and nebuliser masks
  * a bag-valve-mask
  * cannulas and 2 × 500 mL crystalloid
  * salbutamol, cetirizine, chlorphenamine and hydrocortisone 100 mg × 2
  * a pulse oximeter, automated BP cuff and glucometer
* The bag has **no** defibrillator, suction or ECG machine. Those arrive with
  the emergency team, or are available in the ED.
* Investigations use their real capabilities. Phases encode location:
  * In the garden (`scene` / `collapsed` / `treated`): POC glucose and
    sample-based lab tests. Tryptase, FBC and U&E are available from first
    contact (a sample drawn during the collapse gives an initial tryptase of
    14.9 µg/L with a "never delay adrenaline" note); venom sIgE, troponin and
    CRP from `treated`.
  * ED only (`ed-resus` and `ed`): 12-lead ECG, VBG (blood-gas analyser),
    CXR, CTPA, POCUS and urine hCG. The `ed-resus` results reflect an
    incomplete response to one dose: VBG lactate 4.4 mmol/L with pH 7.30,
    ECG sinus tachycardia 122/min, an under-filled hyperdynamic heart on POCUS
    and an initial tryptase of 18.4 µg/L.
* Ordering one of these in the garden gives "no record in this phase". The
  nurse brief and the ECG note explain why.

## Scoring and wrong-path behaviour (engine replay)

Replayed with `reduce`/`vitalsAt` (17 rubric points; the solution scores
17/17):

| path | outcome |
|---|---|
| reference solution | 5/5 objectives, 17/17, no contraindicated actions; SBP ≥ 100 from minute 15, ≈ 111/60 in the ED |
| never gives adrenaline, late doses at 22 and 30 min | `collapsed` from minute 10 (history locked, peri-arrest findings), SBP ≈ 50, GCS 10 → 9; first dose → `treated`, GCS 14 at SBP ≥ 65; GCS 15 only after the second dose; `r-adr-early` fails |
| salbutamol, antihistamines and steroid first, sits her up, one late dose, transfer | 5 contraindicated actions; GCS 13 after sitting up (SBP ≈ 40), then `collapsed`; stuck in `ed-resus` with SBP ≈ 66–74; 2/17 |
| IV bolus, SC adrenaline, walks her, discharge | ST depression then collapse to SBP ≈ 40; 0/17 |
| transfer before adrenaline, otherwise correct | completes, 16/17 (`r-adr-first` fails) |
| adrenaline first, A–B–C examination afterwards | no `adrenaline-delayed`; `dx-criteria` unlocks from the `treated` findings; no "missed examination" in the debrief |
| one dose only, then transfer | stays in `ed-resus`, SBP ≈ 83–86; cannot finish (needs the second dose); disposition locked |
| sits her up once stable in the ED | `neutral`, SBP ≈ 95, GCS 15, no faint |
| brute-forcing the evidence board, second dose without reassessment | cannot finish; `r-dx`, `r-dispo` and `r-adr-repeat` fail |

* Decisions unlock only once their evidence exists: `dx-criteria` needs the
  airway, chest, circulation and skin examinations; `disposition` needs a
  reassessment in the stabilised `ed` phase with SBP ≥ 90.
* `r-dx` and `r-dispo` use `decidedFirstTry`, so cycling through options earns
  the objective but not the rubric point.
* The safety items require the safe action itself (IM route given; transfer
  lying flat), so doing nothing no longer earns them.

## Guideline references

* Resuscitation Council UK. *Emergency treatment of anaphylaxis: Guidelines
  for healthcare providers.* 2021.
* Cardona V, Ansotegui IJ, Ebisawa M, et al. *World Allergy Organization
  anaphylaxis guidance 2020.* World Allergy Organ J. 2020;13(10):100472.
* Muraro A, Worm M, Alviani C, et al. *EAACI guidelines: Anaphylaxis (2021
  update).* Allergy. 2022;77(2):357-377.
* Golden DBK, Wang J, Waserman S, et al. *Anaphylaxis: A 2023 practice
  parameter update.* Ann Allergy Asthma Immunol. 2024;132(2):124-176.
* Shaker MS, Wallace DV, Golden DBK, et al. *Anaphylaxis—a 2020 practice
  parameter update, systematic review, and GRADE analysis.* J Allergy Clin
  Immunol. 2020;145(4):1082-1123.
* National Institute for Health and Care Excellence. *Anaphylaxis: assessment
  and referral after emergency treatment* (NG258). 2026 (replaces CG134, 2011).
* Sturm GJ, Varga EM, Roberts G, et al. *EAACI guidelines on allergen
  immunotherapy: Hymenoptera venom allergy.* Allergy. 2018;73(4):744-764.
* 中国医学救援协会. *严重过敏反应诊断和早期治疗规范*（团体标准
  T/CADERM 3008—2019）. 2019.

## Authoring notes and known limitations

* **Phase-specific exam findings share vocabulary.** The airway, chest,
  circulation and general-appearance findings have `scene`, `treated` (also
  used in `ed-resus`) and `ed` variants, plus `collapsed` variants for
  general appearance, circulation and conscious level (the scene airway and
  chest findings also cover `collapsed`). `matchExam(…, { phase })` filters
  them correctly, but callers must pass the phase. The agent's `examine` tool
  (`resolveFinding`) passes the session phase, so "listen to the chest"
  resolves to the current phase's variant.
* **History keywords avoid single-token collisions.** History items are
  ordered so that specific items win ties. For example, `prev-reaction`
  precedes `allergy-drug`, `family` precedes `allergy-drug`, and `pmh-*`
  precedes `meds`. `excludeKeywords` stop generic words stealing matches
  ("before" on `pc-sting`, "allergy"/"family" on `meds`/`pmh-asthma`, "a
  bit" on `hpi-insect`, 哮喘 on `hpi-breathing`). Chinese keywords are scored
  as longest common substring ÷ keyword length, so no keyword may be ≥ 55 %
  function words (有没有过敏, 叮你的, 多少斤 were removed or lengthened: they
  matched "有没有发烧", "你的手机呢", "多少岁"). A generic past-history question
  ("以前有啥病", "PMH?") deliberately selects both `pmh-asthma` and
  `pmh-other`.
* **Matcher regression.** All 113 `extensions.testUtterances` pass the CLI rule
  (every expected id selected at ≥ 0.55, an expected id first; the two
  `expect: []` entries select nothing). 356 further paraphrases, three
  rounds of them written after the previous tuning, reach recall@3 = 1.0 with
  phase-aware pipeline selection; the last untuned round scored 0.94 before
  its four misses were fixed.
* **Re-asked symptoms in the ED are phase twins.** `hpi-*` answers describe
  the acute reaction in the present tense. Each `now-*-ed` item is the `ed`
  phase twin of the garden-time items it re-asks (`supersedes`):
  `now-breathing-ed` → `hpi-breathing`; `now-airway-ed` → `hpi-throat`,
  `hpi-lips-tongue`; `now-dizzy-ed` → `hpi-dizzy`, `hpi-chest-palp`;
  `now-skin-ed` → `hpi-itch-rash`; `now-gi-ed` → `hpi-gi`.
  * Those seven `hpi-*` items keep only `scene`, `treated` and `ed-resus`,
    where their answers hold. `ed` is deliberately not listed for them:
    twins route and credit whether or not it is (CASE_AUTHORING §3), and a
    listing would offer the stale question in front-ends that filter by
    `phases` alone (the web's suggested questions) and count its answer as
    unrevealed for the grounding check.
  * In `ed`, any question that would select one of them selects its twin, so
    the patient never says both ("Can't… get a full breath… whistling… Now?
    Much easier…") or volunteers "big raised lumps everywhere" after the
    nurse's report that the rash has nearly gone; a direct `ask` of one is
    rejected as `phase-locked`.
  * Asking a twin credits what it supersedes: a learner who first asks about
    throat, breathing and dizziness in `ed` has the required `hpi-throat`,
    `hpi-breathing` and `hpi-dizzy` counted in the history assessment,
    without the stale answers entering the transcript or the revealed-fact
    ledger. Credit is one-way: the garden-time questions never credit the ED
    re-assessment. The 16 ED-time utterances in the corpus (judged in `ed`)
    fail without the links.
* **An EpiPen now is IM adrenaline.** "epipen", "epi pen", "jext",
  "auto-injector" and 肾上腺素笔 resolve to `adrenaline-im`; `prescribe-aai`
  answers only prescription phrasing ("prescribe an epipen", "two
  auto-injectors", "pens to take home", 开两支肾上腺素笔), and `adrenaline-im`
  excludes those. Before, `/give epipen` in the garden prescribed take-home pens
  while her BP kept falling.
* **Required examination.** Only `ex-skin` is `required`. The scene-only
  airway, chest and circulation findings are no longer required: giving
  adrenaline before a formal look locks them, and the debrief would list
  "Assess the airway" as missed after the learner had reassessed it.
  `r-ex-abc` (any phase variant) still scores the A–B–C assessment.
* **Lab interpretation is reachable.** Dr Shen's brief uses the `pathologist`
  role (immunology laboratory, by phone) with `interprets` limited to the lab
  tests, because the runtime only provides nurse, radiologist, pathologist
  and attending agents; the earlier `consultant` role was never consulted.
* **The patient voice gets no phase, clock or vitals.** Phase effects on what
  she says therefore live in data (phase-locked history, `status-*`,
  `now-*-ed`), and `actingNotes` hold behaviour only: no facts and nothing
  conditional on treatment or deterioration that the voice cannot observe.
* **Static text with dynamic vitals.** Exam text cannot react to individual
  interventions within a phase. For example, `ex-chest-treated` still
  describes wheeze after salbutamol. The salbutamol `response` narrates the
  improvement instead.
* **The 5-minute repeat interval is not encoded.** The condition DSL has no
  "minutes since the last dose". A repeat dose is `indicated` only after a
  reassessment (`reassessed-before-repeat`) while SBP < 90, SpO₂ < 94 or
  RR > 24, and `r-adr-repeat` requires that marker. A learner can still
  reassess and repeat within a minute. The reference solution repeats at
  6.5 minutes.
* **Phase entry is immediate.** `ed` starts when the second dose is given in
  the ED, so its "so much better" findings can be read a minute or two before
  SBP reaches 90. The disposition decision is additionally gated on SBP ≥ 90.
* **Untreated plateau.** Without adrenaline she reaches `near-arrest`
  (GCS 9, SBP ≈ 50) and stays there; cardiac arrest is outside this case's
  scope.
* **Effect offset is instant.** By engine design, effects end abruptly, so
  SBP steps down about 8 mmHg when each dose's transient component ends,
  15 min after its ramp.
* **Option and result texts reveal nothing early.** The `llr-criterion`
  distractor reads "A previous large local reaction to a sting…", so it no
  longer discloses last summer's reaction (a `specific` item) before she is
  asked. The urine hCG value and reference are per-locale `LocalizedText`
  (阴性 / negative), never both languages in one string. `unknown-usual-bp`
  excludes medication phrasing, so "Are you on any blood pressure tablets?"
  selects only `meds-bb`.
* **Tryptase turnaround is 90 simulated minutes.** In real practice the assay
  is often batched (1–2 days). The result note says so.

## Embodied grounding (world policy)

In embodied mode a clinical act needs the kit it names at the bedside and IV access is patient state (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8): there is no kit in the healing garden, so what the reference management uses is brought from the hospital: high-flow oxygen (`oxygen-high-flow`) requires `oxygen` — the ED store's portable oxygen cylinder (`eq:ed-store-o2-1`); nebulised salbutamol (`salbutamol-neb`) requires `nebulizer` + `oxygen` (oxygen-driven); continuous monitoring (`monitoring`) requires `cardiac-monitor` — a monitor-defibrillator wheeled over (its ECG leads still go on when the team arrives: `physiology.monitor.ecgWhen` is unchanged); the 18G cannula (`iv-cannula`) requires `iv-access` — the cannulation kit of a crash or treatment cart — and the IV items (`adrenaline-iv-bolus`, `fluid-bolus`, `chlorphenamine-iv`, `hydrocortisone-iv`) require `iv-access`, i.e. the cannula placed first. IM adrenaline, positioning, removing the stinger and calling for help need nothing beyond the ward nurse's emergency bag. The case stays completable: `cases verify` passes, the embodied autopilot fetches the cylinder, the monitor-defibrillator, a cart and the nebuliser (score 100 in both languages), and the benchmark scenario `workflow-anaphylaxis-garden-oxygen` fetches the portable cylinder.

## Validate

```bash
clinicalcraft cases validate packages/content/cases/anaphylaxis-garden/case.json
clinicalcraft cases verify anaphylaxis-garden
clinicalcraft play anaphylaxis-garden --provider offline
```
