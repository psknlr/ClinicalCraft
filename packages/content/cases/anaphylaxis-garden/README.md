# anaphylaxis-garden — Breathless after a sting in the garden · 30-year-old woman

> **Spoilers for case authors and facilitators.** This file names the diagnosis. Learners should
> open the case from the case library. The title, summary, chief complaint, tags, triage note, phase
> labels and objective titles do not name it.

> **Synthetic case.** This is a fictional teaching case. The patient (林晓岚 / Lin Xiaolan), her
> family, Nurse Zhou Min, Dr Gao Yan, Dr Shen and every clinical detail are invented. Nothing is based
> on a real patient. The case is not medical advice (`disclaimer`: 虚构教学病例，不构成医疗建议。/
> Fictional teaching case — not medical advice.).

## Case card

| | |
|---|---|
| Case | `anaphylaxis-garden` · v1.1.0 |
| Setting | `community` — the hospital's healing garden (garden-bench patient slot), then the ED resus bay |
| Facility | `general-hospital` (not playable embodied in `teaching-hospital`: no slot for a `community` patient) |
| Difficulty | 3 / 5 |
| Estimated time | ~25 min (simulated clock from 15:40, no time limit) |
| Specialty | Emergency medicine, allergy and immunology |
| Languages | zh-CN (source), en |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have an emergency or allergy clinician review it before teaching use |
| Clock | `simulated`, `realtimeScale` 1; costs ask 0.5 · examine 0.5 · order 0.5 · read 0.5 · intervene 1 · answer 0 min (a fast-paced resuscitation) |
| Phases | live progression, none learner-switchable: `scene` (garden, before treatment) → `treated` (garden, after the first IM adrenaline) → `ed-resus` (transferred after only one dose; resuscitation ongoing) → `ed` (transferred and two doses given; stabilising). Wrong path: `collapsed` (garden, peri-arrest before any adrenaline; left at the first IM dose) |
| Content | 46 history items (3 `unknown`, 3 `specific`, 9 required; 4 phase-specific "how are you now?" answers incl. the groan-only `status-collapsed`; 5 `ed`-only "now" answers for re-asked symptoms, phase twins of the 7 garden-time symptom items) · 25 exam findings · 14 investigations (4 useful, 5 neutral, 4 low-value, 1 harmful) · 21 interventions · 10 physiology trends · 19 scenario events (5 silent markers) · 5 objectives · 3 decisions · 16 rubric items (13 deterministic, 3 examiner-judged) · 5 NPCs · 113 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Recognise from sudden airway, breathing or circulation compromise after a likely trigger (WAO 2020
   criteria) that the reaction is life-threatening, without waiting for a rash, a blood-pressure
   threshold or a laboratory result.
2. Give the first-line drug within minutes at the correct dose, concentration, route and site, using
   closed-loop communication, and repeat it after a structured 5-minute reassessment when the
   response is inadequate.
3. Position a hypotensive, breathless patient safely and transfer her lying flat on a trolley; never
   sit, stand or walk her while she is hypotensive.
4. Give supportive care alongside first-line treatment — oxygen, IV fluid, a bronchodilator for
   persisting bronchospasm — keeping antihistamines and corticosteroids as adjuncts once she is
   stable.
5. Time the mast-cell tryptase samples (one as soon as resuscitation is under way, one at 1–2 h, a
   baseline ≥ 24 h after recovery) and interpret them with the 1.2 × baseline + 2 µg/L rule, never
   letting sampling delay treatment.
6. Set the observation period from the RCUK 2021 / NICE NG258 tiers and plan a safe discharge:
   adrenaline auto-injectors with teach-back training, a written action plan and specialist allergy
   referral.

These are `learningOutcomes` in `case.json`. Because the case card shows them before play, they
state the standard without naming the diagnosis, this patient's findings or the decisions' answers
(the title, summary and triage note do not name it either).

## Clinical summary (spoilers)

It is 15:40 in the hospital's healing garden. A 30-year-old secondary-school music teacher was
visiting her father on the cardiology ward. She was sitting on a bench by the lavender when a
honeybee stung her right forearm, about 8 minutes before the case starts. Within minutes she had
generalised itching and hives, then swollen lips and tongue, throat tightness with a hoarse voice,
wheeze, dizziness when she tried to stand, nausea and abdominal cramps. A ward nurse heard the shout
and ran over with the emergency bag. Her portable readings are **BP 78/44 mmHg (MAP 55), HR 128,
RR 26, SpO₂ 92 % on air**.

**History.** Mild asthma as a teenager, with no inhaler for years. She has spring hay fever and takes
cetirizine in season. Her only regular medicine is the combined oral contraceptive pill. She has no
known drug allergies and has never taken beta-blockers or ACE inhibitors. Last summer an ankle sting
(bee or wasp, she is not sure) caused a large local reaction. She was given no auto-injector and has
never had allergy testing. Her in-laws keep two beehives in the countryside, and she helps there most
summer weekends. Both of these facts are `specific` disclosures. She has not been unwell recently (no
cold, fever or infection — asked because infection is a cofactor). Three items are explicitly
unknown: tetanus status, any family history of mast-cell disorders, and her usual blood pressure.

**Examination at first contact (`scene`).** She has swollen lips (upper more than lower), a swollen
tongue and an oedematous uvula. Her voice is hoarse but there is no stridor at rest. There is
widespread polyphonic expiratory wheeze with reduced air entry at both bases. Her radial pulse is
thready and central capillary refill is about 4 s, with a flushed, warm trunk but cool, clammy hands.
She has generalised urticaria and conjunctival injection. The honeybee stinger and venom sac are
still in her right forearm. Her handbag holds no auto-injector and she has no medical alert card or
bracelet.

**Diagnosis.** Severe honeybee-venom anaphylaxis with airway, breathing and circulation involvement,
i.e. anaphylactic shock (WAO 2020 criteria; severe on the Brown grading: SpO₂ ≤ 92 % and systolic
BP < 90 mmHg). Skin features are present but are not required for the diagnosis. The timed 1–2 h
tryptase is 27.4 µg/L.

## Scenario timeline and physiology

* **No monitor in the garden (`physiology.monitor`).** The nurse's emergency bag has a portable pulse
  oximeter and BP cuff but nobody is monitoring her continuously: until `monitoring` is given (or she
  is transferred, lying flat and monitored, `transfer-ed`) the bedside shows only the nurse's
  portable readings at arrival — BP 78/44, HR 128, RR 26, SpO₂ 92 % (`spotChecks`: static, no alarm;
  **no temperature**, none was taken; no rhythm) — plus GCS. The `monitoring` response attaches the
  pulse oximeter and the automated cuff at once: from then on HR, BP, RR and SpO₂ are live and alarm,
  but there is **no rhythm** ("ECG leads not attached", a flat lead II) until the team's
  monitor-defibrillator (3-lead ECG) is there — `ecgWhen`: `call-help` (or the transfer to the ED).
  Calling for help shows the rhythm at once, although the team takes 3–4 minutes (the engine has no
  "minutes since X" condition); in the reference path the team was called 6.5 minutes before
  `monitoring`, so it is there by then. **No temperature** at any point (`measures` leaves out
  `temp`): neither the bag nor the monitor-defibrillator takes one, and the case records none. The
  IV-bolus scenario lines that read the ECG need the ECG, not just the oximeter (see below).
* **Two trend families per vital.**
  * The `*-early` trends stop at the **first** IM adrenaline dose.
  * The `*-persisting` trends stop only at the **second** dose (`minCount: 2`).
  * One dose therefore gives a partial response. At the 5-minute reassessment SBP is still about
    85–88 and the treated-phase findings show persistent hoarseness and wheeze, so the second dose is
    genuinely indicated.
  * Both families recover toward baseline after they stop (`recoverPerMinute`).
* **Each IM dose has two components.** A persistent component (SBP +8, DBP +4, HR −10, SpO₂ +2,
  RR −2) represents the reaction resolving. A 15-min transient component (SBP +8, DBP +4, HR +6 for
  8 min) represents the peak drug effect.
* **Supportive measures add their own effects:** legs raised (SBP +6), O₂ (SpO₂ +5), each crystalloid
  bolus (SBP +10, HR −8 over 10 min) and salbutamol (SpO₂ +2, RR −3, HR +6 for 30 min).

Replay of the reference solution (modelled values, including the deterministic monitor jitter; the
bedside shows them live from the `monitoring` step at 7.5 min — before that, only the static portable
readings at arrival; an intervention minute below is when its 1-minute action ends):

| minute | HR | BP (MAP) | RR | SpO₂ | context |
|---:|---:|---|---:|---:|---|
| 0 | 128 | 78/44 (55) | 26 | 92 | first contact |
| 4.5 | ≈135 | ≈72/43 (53) | ≈29 | ≈90 | 1st IM adrenaline |
| 9–10 | ≈128 | ≈87/51 (63) | ≈26 | ≈96 | reassessment (airway, chest, circulation): partial response on O₂ + legs up → 2nd dose at 11 |
| 12.5–14 | ≈128 | ≈95–103/54–57 | ≈25 | ≈98 | IV access + crystalloid bolus |
| 20 | ≈115 | ≈113/63 (80) | ≈21 | 100 | stabilising; transfer at 22.5 |
| 60–110 | ≈98 | ≈111/60 (77) | ≈19 | 100 | ED observation; sinus rhythm |

**Without adrenaline**, SBP falls to about 56 by minute 10. At that point the `peri-arrest` event
fires (GCS 10, "we're losing her") and the case enters the `collapsed` phase: she can no longer give
history (every history item except the groan-only `status-collapsed` is phase-locked) and the
general-appearance, circulation and neurological findings switch to peri-arrest variants. At minute
16 the `near-arrest` event follows (GCS 9, gasping, thready carotid pulse; SBP has bottomed out at
about 50, MAP about 37). GCS 10 is what the only neurological exam available in `collapsed` scores:
eyes to a loud voice or pain (E3), mumbling without answering questions (V2), localising to pain
(M5). The first IM dose leaves `collapsed` (for `treated`, or `ed-resus` after a deferred transfer);
`peri-arrest-partial` raises GCS to 14 once SBP reaches 65, and `peri-arrest-recovered` restores
GCS 15 at SBP ≥ 90, which takes the second dose. The other scripted events are:

* `adrenaline-prompt`: the nurse offers the drawn-up adrenaline at 5 min. It sets
  `adrenaline-delayed`, which fails the weighted rubric item.
* `upright-while-hypotensive`: she greys out when sat up with SBP < 90. The silent `upright-faint`
  puts GCS 13 on the bedside observations (unless she is already peri-arrest) and `upright-recovered`
  restores 15 once adrenaline has brought SBP to ≥ 90. Sitting up itself only lowers SBP by 14 for
  5 min, so a stabilised patient sat up in the ED does not faint.
* `iv-bolus-arrhythmia`: broad-complex runs and a hypertensive spike after an IV bolus. This does
  **not** stop the anaphylaxis trends. `iv-bolus-ischaemia` then puts ST depression on the monitor
  while SBP is above 145, and `iv-bolus-wears-off` clears it once SBP falls back below 135 ("the IV
  push has not controlled the reaction"). Each has an `*-unmonitored` twin that fires instead when she
  has no ECG on yet — `monitoring` with the team called, or the ED, gives one; the oximeter alone does
  not — (her pounding head and chest, a racing chaotic pulse, then a weak radial pulse again): same
  `setVitals`/`setFlags`, guarded on the flag they set (`iv-adrenaline-harm`, `iv-bolus-st-change`,
  `iv-bolus-settled`), so attaching the monitor later never replays the screen version.
* `sinus-in-ed`: the rhythm label changes to sinus once HR < 100 in the ED.
* `asks-to-leave`: at 90 min she asks to go home. This is the disposition teaching prompt. The event
  sets `speaker: "patient"`, so she says it herself.
* Silent scoring markers (no message): `reassessed-before-repeat` (a treated-phase reassessment
  between the first and second IM dose), `adjunct-before-adrenaline` (antihistamine, steroid or
  salbutamol before any adrenaline) and `moved-before-adrenaline` (transfer or walking before any
  adrenaline). The condition DSL cannot ask "was X before Y", so these events record it when it
  happens.

**Results by place.** Phases encode location. In the garden (`scene` / `collapsed` / `treated`): POC
glucose and sample-based lab tests. Tryptase, FBC and U&E are available from first contact (a sample
drawn during the collapse gives an initial tryptase of 14.9 µg/L with a "never delay adrenaline"
note); venom sIgE, troponin and CRP from `treated`. ED only (`ed-resus` and `ed`): 12-lead ECG, VBG
(blood-gas analyser), CXR, CTPA, POCUS and urine hCG. The `ed-resus` results reflect an incomplete
response to one dose: VBG lactate 4.4 mmol/L with pH 7.30, ECG sinus tachycardia 122/min, an
under-filled hyperdynamic heart on POCUS and an initial tryptase of 18.4 µg/L. Ordering one of the ED
tests in the garden gives "no record in this phase"; the nurse brief and the ECG note explain why.
Tryptase turns around in 90 simulated minutes (in real practice the assay is often batched over 1–2
days; the result note says so).

## Decisions and assessment

### Objectives (HUD chapters)

1. **Rapid ABCDE assessment** — what happened; airway, chest, circulation and skin (any phase
   variant); the diagnostic-criteria decision.
2. **Immediate first-line treatment** — call for help, IM adrenaline, lie her flat with legs raised,
   the first-line decision.
3. **Support and reassess at 5 minutes** — high-flow oxygen, IV access and a crystalloid bolus, a
   treated-phase reassessment and the second IM dose.
4. **Focused history, samples and transfer** — previous sting reaction, medicines incl.
   beta-blockers/ACE inhibitors, drug allergies, asthma; timed tryptase samples; transfer lying flat.
5. **Observation, discharge preparation and follow-up** — the disposition decision, overnight
   observation, two auto-injectors with training, allergy referral.

The hints coach with questions ("What is the first-line drug — dose, concentration, route and
site?"); none states a result the learner has not obtained.

### Decisions

| id | kind | unlocked by | correct answer |
|---|---|---|---|
| `dx-criteria` | multiple | what happened + airway, chest, circulation and skin examined | onset after a likely allergen · airway · breathing · circulation · skin/mucosa (not "tryptase needed", not "previous large local reaction") |
| `first-line` | single | what happened + airway and chest examined | Adrenaline 0.5 mg IM (0.5 mL of 1 mg/mL), anterolateral mid-thigh, repeat after 5 min |
| `disposition` | single | adrenaline + transfer + an ED reassessment + SBP ≥ 90 | Overnight: ≥ 12 h after full resolution, two auto-injectors with training, written plan, allergy referral |

Distractors with feedback: IV bolus, antihistamine + steroid, subcutaneous, salbutamol first, the
1:10 000 ten-fold underdose; 2-h fast-track, steroid/antihistamine discharge, ICU 48 h, one pen and no
referral.

* Decisions unlock only once their evidence exists: `dx-criteria` needs the airway, chest,
  circulation and skin examinations; `disposition` needs a reassessment in the stabilised `ed` phase
  with SBP ≥ 90.
* `r-dx` and `r-dispo` use `decidedFirstTry`, so cycling through options earns the objective but not
  the rubric point.

### Rubric (13 deterministic items, 18 points, + 3 examiner-judged)

| Domain | Item | Weight |
|---|---|---|
| Management | IM adrenaline 0.5 mg into the anterolateral thigh within 5 minutes | 3 |
| Safety | IM route — never an IV bolus or subcutaneous | 2 |
| Safety | Transferred lying flat; never sat up, stood or walked while hypotensive | 2 |
| Management | ≥ 12 h observation at the first attempt + two auto-injectors + allergy referral | 2 |
| Safety | Adrenaline first: no antihistamine, steroid or salbutamol and no moving her before it | 1 |
| Management | Reassessed after the first dose and repeated it because the response was inadequate | 1 |
| Management | Called for help and laid her flat with legs raised | 1 |
| Management | High-flow oxygen, crystalloid bolus, salbutamol for wheeze persisting after adrenaline | 1 |
| History | Previous sting reactions | 1 |
| History | Medicines (incl. beta-blockers/ACE inhibitors) and drug allergies | 1 |
| Examination | Rapid airway, breathing and circulation assessment | 1 |
| Diagnosis | Clinical criteria recognised at the first attempt | 1 |
| Investigations | Timed tryptase samples (initial + 1–2 h) | 1 |
| Communication (examiner) | Short, calm explanation and reassurance | 1 |
| Communication (examiner) | Closed-loop drug communication with the nurse | 1 |
| Communication (examiner) | Discharge counselling and safety-netting | 1 |

The safety items require the safe action itself (IM route given; transfer lying flat), so doing
nothing does not earn them.

### Tempting wrong choices (all playable)

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

### Scoring and wrong-path behaviour (engine replay, 18 points)

| path | outcome |
|---|---|
| reference solution | 5/5 objectives, 18/18, no contraindicated actions; SBP ≥ 100 from minute 15, ≈ 111/60 in the ED |
| never gives adrenaline, late doses at 22 and 30 min | `collapsed` from minute 10 (history locked, peri-arrest findings), SBP ≈ 50, GCS 10 → 9; first dose → `treated`, GCS 14 at SBP ≥ 65; GCS 15 only after the second dose; `r-adr-early` fails |
| salbutamol, antihistamines and steroid first, sits her up, one late dose, transfer | 5 contraindicated actions; GCS 13 after sitting up, then `collapsed`; stuck in `ed-resus` with SBP ≈ 66–74; 2/18 (only the IM-route item) |
| IV bolus, SC adrenaline, walks her, discharge | ST depression then collapse; 0/18 |
| transfer before adrenaline, otherwise correct | completes, 17/18 (`r-adr-first` fails) |
| adrenaline first, A–B–C examination afterwards | no `adrenaline-delayed`; `dx-criteria` unlocks from the `treated` findings; no "missed examination" in the debrief |
| one dose only, then transfer | stays in `ed-resus`, SBP ≈ 83–86; cannot finish (needs the second dose); disposition locked |
| sits her up once stable in the ED | `neutral`, SBP ≈ 95, GCS 15, no faint |
| brute-forcing the evidence board, second dose without reassessment | cannot finish; `r-dx`, `r-dispo` and `r-adr-repeat` fail |

## Reference path (`solution`)

55 steps, verified by `verifyCase`:

1. Ask what happened, then call the hospital emergency team.
2. Rapid A–B–C assessment: airway, chest and circulation.
3. **IM adrenaline 0.5 mg (0.5 mL of 1 mg/mL) into the anterolateral thigh, given at minute 4.5.**
4. Lie her flat with legs raised. She is breathless when completely flat, so the nurse raises her
   head and shoulders slightly and keeps her legs up.
5. High-flow O₂ 15 L/min, monitoring, an 18G cannula with bloods, and a 500–1000 mL crystalloid
   bolus.
6. Reassess at 5 minutes. She is still hoarse and wheezy, with SBP about 87. Give a **second IM dose**
   about 6–7 minutes after the first.
7. Salbutamol 5 mg nebulised for wheeze that persists after adrenaline.
8. Remove the stinger.
9. Take a focused history: drug allergies, medicines including beta-blockers and ACE inhibitors,
   asthma, previous sting reaction, auto-injector.
10. Take timed tryptase samples.
11. Transfer her to the ED on a trolley, lying flat.
12. In the ED: VBG and ECG, then cetirizine for residual itch once she can swallow safely.
13. Keep her in overnight: observe for **≥ 12 h after resolution**. Two doses alone would mean ≥ 6 h,
    but the reaction involved severe respiratory compromise (laryngeal signs, hypoxaemia), which
    means ≥ 12 h (RCUK 2021, adopted by NICE NG258).
14. Prescribe two auto-injectors with training and a written action plan.
15. Refer her to the allergy clinic for venom immunotherapy (VIT) assessment.

It scores **18/18** on the deterministic rubric with no contraindicated action and ends at simulated
minute 114.5 (embodied autopilot: 115.0 / 114.5 in en / zh-CN).

## Clinical numbers check

| Item | Value | Working / source |
|---|---|---|
| Arrival BP | 78/44 mmHg, MAP 55 | (78 + 2 × 44)/3 = 55.3 |
| Severity | Brown grade **severe** | SpO₂ 92 % (≤ 92) and SBP 78 (< 90) (Brown 2004) |
| IM adrenaline | **0.5 mg = 0.5 mL of 1 mg/mL** | adult / > 12 y dose (RCUK 2021); 62 kg × 0.01 mg/kg = 0.62 → capped at 0.5 mg |
| Ten-fold error | 0.5 mL of 1:10 000 = **0.05 mg** | 0.1 mg/mL × 0.5 mL |
| Paediatric IM doses (not this patient) | 6–12 y 0.3 mg · 6 months–6 y 0.15 mg · < 6 months 0.1–0.15 mg | RCUK 2021 |
| Fluids · O₂ · salbutamol | 500–1000 mL crystalloid · 15 L/min NRB, then SpO₂ 94–98 % · 5 mg nebulised | RCUK 2021 |
| Adjuncts | cetirizine 10 mg PO · chlorphenamine 10 mg IV · hydrocortisone 200 mg IV | RCUK 2021 (not first-line; steroids not routine) |
| VBG `ed-resus` | pH 7.30, pCO₂ 4.7 kPa ≈ 35 mmHg, HCO₃⁻ 17, AG 16, lactate 4.4 | 139 − (106 + 17) = 16; Winter's 1.5 × 17 + 8 = 33.5 ± 2; 6.1 + log(17 / (0.03 × 35.3)) = 7.31 |
| VBG `ed` | pH 7.32, pCO₂ 5.0 kPa ≈ 37.5 mmHg, HCO₃⁻ 19, AG 14, lactate 3.1, K⁺ 3.4 | 139 − (106 + 19) = 14; Winter's 36.5 ± 2 |
| Tryptase | initial 9.2 (before adrenaline) / 14.9 (collapse) / 13.8–21.6 (by time drawn); timed 1–2 h **27.4 µg/L** (URL 11.4) | 27.4 > 1.2 × B + 2 for any baseline B < 21.2 µg/L |
| Observation | ≥ 6 h after two doses; **≥ 12 h** with severe respiratory compromise | RCUK 2021 §8.2, adopted by NICE NG258 (2026) |
| Biphasic reactions | ≈ 5 % (4.6 % pooled); median onset 11 h (0.2–72 h) | Lee 2015 meta-analysis |
| Weight / BMI | 62 kg, 1.65 m → 22.8 kg/m² | 62 / 1.65² |

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How was that? What did you feel when the nurse held up the syringe and said her
   pressure was still falling?"
2. **Description** — "Take me through what happened, from the bench to the ED: what you found, what
   you gave and when."
3. **Analysis** — advocacy–inquiry on what the run shows:
   * "I saw the adrenaline go in at minute N. What was in your head before you gave it? What would
     have made you give it sooner?"
   * "Say the order out loud as you gave it to the nurse. What would 0.5 mL of 1:10 000 have given
     her?"
   * "She was breathless lying flat and hypotensive sitting up. How did you choose her position?"
   * "At 5 minutes she was still hoarse with an SBP in the 80s. What told you to repeat the dose?
     What would you do after a third?" (refractory anaphylaxis: expert help, an adrenaline infusion)
   * "Where did the antihistamine and the steroid fit, and why not first?"
   * "She asked to go home at 90 minutes. Why overnight, and what does she take with her?"
4. **Summary** — "What three things will you do in the first five minutes of the next anaphylaxis
   you meet?"

### Teaching notes

* **Recognition is clinical.** The criteria are sudden onset after a likely allergen plus airway,
  breathing or circulation problems. Do not wait for a BP threshold or a tryptase. Skin features are
  absent in 10–20 % of cases, and urticaria alone is not anaphylaxis.
* **"IM, thigh, 1 mg/mL, 0.5 mL."** Say it aloud, get a read-back, note the time, and reassess at 5
  minutes. Watch for the ten-fold error: 1:10 000 (0.1 mg/mL) at 0.5 mL gives only 0.05 mg.
  Paediatric IM doses (RCUK 2021) are 6–12 y 0.3 mg, 6 months–6 y 0.15 mg and < 6 months
  0.1–0.15 mg.
* **Refractory anaphylaxis** is failure to improve after two IM doses. It needs expert help and a
  low-dose IV adrenaline infusion. That pathway is outside this case's scope and is mentioned in the
  debrief and the attending brief.
* **Positioning follows the BP.** For hypotension or faintness, lie her flat with legs raised. For
  breathing difficulty with a normal BP, she may sit up. When she has both, as here, use a compromise:
  head and shoulders slightly up and legs still raised. The `position-supine-legs` response models
  this.
* **Adjuncts.**
  * Non-sedating oral antihistamine for skin symptoms only after stabilisation, and only when she can
    swallow safely. `cetirizine-po` is `indicated` only in the `ed` phase (tongue back to normal size,
    swallowing easily); after adrenaline but while the tongue is still swollen (`treated` /
    `ed-resus`) it is `neutral`.
  * Corticosteroids are not routine (RCUK 2021). Consider them only for refractory reactions or
    ongoing asthma or shock after initial resuscitation.
  * There is no reliable evidence that either agent prevents biphasic reactions (the 2020
    AAAAI/ACAAI practice parameter suggests against using them for that purpose).
* **Tryptase timing.**
  * Take the first sample as soon as feasible once resuscitation is under way, never delaying
    treatment. The case returns a *normal* 9.2 µg/L if it is drawn before adrenaline (about 10 min
    after onset). That is the lesson that an early normal value does not exclude the diagnosis.
  * Take a second sample at 1–2 h, and no later than 4 h (27.4 µg/L).
  * Take a baseline sample ≥ 24 h after recovery. The case leaves this explicitly unknown.
  * Interpret with the 20 % + 2 rule: acute > 1.2 × baseline + 2 µg/L.
* **Disposition (RCUK 2021, adopted by NICE NG258 in 2026).**
  * Fast-track discharge after 2 h requires all of these: a good response to a single dose given
    within 30 min of onset, complete resolution, unused auto-injectors already held with training,
    and supervision at home.
  * Two doses, or a previous biphasic reaction, mean ≥ 6 h.
  * More than two doses, severe asthma, a reaction involving severe respiratory compromise, an
    out-of-hours presentation or poor access to care mean ≥ 12 h. Her hoarse voice with uvular
    oedema and hypoxaemia count as severe respiratory compromise, so the correct disposition is
    ≥ 12 h (overnight).
  * Biphasic reactions occur in about 5 % (reported 1–20 %). In a meta-analysis the median onset was
    about 11 h (range 0.2–72 h); hypotension at presentation is a risk factor (Lee 2015).
* **Discharge bundle.**
  * Two adrenaline auto-injectors carried at all times, with teach-back training.
  * A written anaphylaxis action plan.
  * Referral to an allergy clinic for venom-specific IgE or skin tests at about 4–6 weeks, a baseline
    tryptase, and VIT assessment. EAACI 2018 recommends VIT for adults whose systemic sting reactions
    go beyond the skin and whose sensitisation is documented. Her in-laws' beekeeping makes
    re-exposure likely.
* **Risk modifiers to ask about:** asthma, beta-blockers or ACE inhibitors (beta-blockade can blunt
  the response to adrenaline), mast-cell disorders, and cofactors such as exercise, alcohol and
  NSAIDs.
* **A large local reaction** carries only a low risk (about 4–10 %) of a later systemic reaction. It
  is neither a diagnostic criterion nor, on its own, an indication for an auto-injector. Today's
  systemic reaction is.

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| History and tests before adrenaline | nurse prompt at 5 min (`adrenaline-delayed` fails the weight-3 item); `collapsed` at 10 min |
| Antihistamine, steroid or salbutamol first | contraindicated; `adjunct-before-adrenaline` fails `r-adr-first` |
| IV bolus or subcutaneous adrenaline | ectopics/ST depression then relapse; little effect SC; `r-safe-route` fails |
| Sitting her up, walking her | grey-out (GCS 13), collapse; `r-safe-posture` fails |
| One dose and done | partial response: SBP stays in the 80s, she cannot reach the stabilised `ed` phase |
| Repeat dose without reassessing | `r-adr-repeat` needs the treated-phase reassessment |
| Discharge at 2 h, or without pens | the disposition distractors; `discharge-now` contraindicated |

## Embodied mode

**Environment (garden + emergency bag).** Without embodiment the nurse's emergency bag (contents
listed in the nurse NPC brief) provides adrenaline 1 mg/mL × 5; portable O₂ up to 15 L/min with
non-rebreather and nebuliser masks; a bag-valve-mask; cannulas and 2 × 500 mL crystalloid; salbutamol,
cetirizine, chlorphenamine and hydrocortisone 100 mg × 2; a pulse oximeter, automated BP cuff and
glucometer. The bag has **no** defibrillator, suction or ECG machine: those arrive with the emergency
team, or are available in the ED.

**Grounding (world policy).** In embodied mode a clinical act needs the kit it names at the bedside
and IV access is patient state (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8): there is no kit in
the healing garden, so what the reference management uses is brought from the hospital: high-flow
oxygen (`oxygen-high-flow`) requires `oxygen` — the ED store's portable oxygen cylinder
(`eq:ed-store-o2-1`); nebulised salbutamol (`salbutamol-neb`) requires `nebulizer` + `oxygen`
(oxygen-driven); continuous monitoring (`monitoring`) requires `cardiac-monitor` — a
monitor-defibrillator wheeled over (its ECG leads still go on when the team arrives:
`physiology.monitor.ecgWhen` is unchanged); the 18G cannula (`iv-cannula`) requires `iv-access` — the
cannulation kit of a crash or treatment cart — and the IV items (`adrenaline-iv-bolus`,
`fluid-bolus`, `chlorphenamine-iv`, `hydrocortisone-iv`) require `iv-access`, i.e. the cannula placed
first. IM adrenaline, positioning, removing the stinger and calling for help need nothing beyond the
ward nurse's emergency bag. The case stays completable: `cases verify` passes, the embodied autopilot
fetches the cylinder, the monitor-defibrillator, a cart and the nebuliser (score 100 in both
languages), and the benchmark scenario `workflow-anaphylaxis-garden-oxygen` fetches the portable
cylinder. The learner (or the autopilot) therefore brings an oxygen cylinder, a
monitor-defibrillator, a crash or treatment cart and a nebuliser to the garden.

**Scope of practice.** `remove-sting` is authored `scope: "nursing"` (first aid any nurse gives when
delegated; docs/EMBODIED.md §8 scope of practice).

**Where the patient goes and how they look** (reviews G8/G12). Positioning sets the posture
bystanders, the collider and the web NPC show — `position-supine-legs` → `lying`,
`position-sit-upright` → `sitting`, `walk-to-ed` → `lying` (she collapses as she stands and is
lowered to the ground), `transfer-ed` → `lying` (on the trolley); the `ed-resus` and `ed` phases have
`location: {"setting": "emergency"}`, so when the transfer phase starts the team moves her from the
garden bench to the first emergency bed space (resus-1 in the general hospital, about 74 m; no time
charged beyond the transfer's own); `cxr` is `performedAt: "bedside"` (portable); `oxygen-high-flow`
names `device: "non-rebreather-mask"` (a mask on her face, as the dose says). `walk-to-ed` moves
nobody (she never gets there). Scores are unchanged.

## Fidelity limits

* **Static text with dynamic vitals.** Exam text cannot react to individual interventions within a
  phase. For example, `ex-chest-treated` still describes wheeze after salbutamol. The salbutamol
  `response` narrates the improvement instead.
* **The 5-minute repeat interval is not encoded.** The condition DSL has no "minutes since the last
  dose". A repeat dose is `indicated` only after a reassessment (`reassessed-before-repeat`) while
  SBP < 90, SpO₂ < 94 or RR > 24, and `r-adr-repeat` requires that marker. A learner can still
  reassess and repeat within a minute. The reference solution repeats at 6.5 minutes.
* **Phase entry is immediate.** `ed` starts when the second dose is given in the ED, so its "so much
  better" findings can be read a minute or two before SBP reaches 90. The disposition decision is
  additionally gated on SBP ≥ 90.
* **Untreated plateau.** Without adrenaline she reaches `near-arrest` (GCS 9, SBP ≈ 50) and stays
  there; cardiac arrest is outside this case's scope.
* **Effect offset is instant.** By engine design, effects end abruptly, so SBP steps down about
  8 mmHg when each dose's transient component ends, 15 min after its ramp.
* **The team's ECG arrives at once.** Calling for help shows the rhythm immediately although the team
  takes 3–4 minutes (no "minutes since" condition).
* **Tryptase turnaround is 90 simulated minutes**; in real practice the assay is often batched (1–2
  days). The result note says so.
* **Adult doses only**; the paediatric doses are quoted for teaching. The narrative distance to the ED
  ("about 150 m") is the story's, not the facility map's.

## Matcher notes

* **Phase-specific exam findings share vocabulary.** The airway, chest, circulation and
  general-appearance findings have `scene`, `treated` (also used in `ed-resus`) and `ed` variants,
  plus `collapsed` variants for general appearance, circulation and conscious level (the scene airway
  and chest findings also cover `collapsed`). `matchExam(…, { phase })` filters them correctly, but
  callers must pass the phase. The agent's `examine` tool (`resolveFinding`) passes the session
  phase, so "listen to the chest" resolves to the current phase's variant.
* **History keywords avoid single-token collisions.** History items are ordered so that specific
  items win ties. For example, `prev-reaction` precedes `allergy-drug`, `family` precedes
  `allergy-drug`, and `pmh-*` precedes `meds`. `excludeKeywords` stop generic words stealing matches
  ("before" on `pc-sting`, "allergy"/"family" on `meds`/`pmh-asthma`, "a bit" on `hpi-insect`, 哮喘 on
  `hpi-breathing`). Chinese keywords are scored as longest common substring ÷ keyword length, so no
  keyword may be ≥ 55 % function words (有没有过敏, 叮你的, 多少斤 were removed or lengthened: they
  matched "有没有发烧", "你的手机呢", "多少岁"). A generic past-history question ("以前有啥病",
  "PMH?") deliberately selects both `pmh-asthma` and `pmh-other`.
* **Matcher regression.** All 113 `extensions.testUtterances` pass the CLI rule (every expected id
  selected at ≥ 0.55, an expected id first; the two `expect: []` entries select nothing). 356 further
  paraphrases, three rounds of them written after the previous tuning, reach recall@3 = 1.0 with
  phase-aware pipeline selection; the last untuned round scored 0.94 before its four misses were
  fixed. The grounding benchmark (`grounding-v1`) holds this case's held-out items; the 1.1.0 edits
  changed no history question, answer or keyword.
* **Re-asked symptoms in the ED are phase twins.** `hpi-*` answers describe the acute reaction in the
  present tense. Each `now-*-ed` item is the `ed` phase twin of the garden-time items it re-asks
  (`supersedes`): `now-breathing-ed` → `hpi-breathing`; `now-airway-ed` → `hpi-throat`,
  `hpi-lips-tongue`; `now-dizzy-ed` → `hpi-dizzy`, `hpi-chest-palp`; `now-skin-ed` →
  `hpi-itch-rash`; `now-gi-ed` → `hpi-gi`.
  * Those seven `hpi-*` items keep only `scene`, `treated` and `ed-resus`, where their answers hold.
    `ed` is deliberately not listed for them: twins route and credit whether or not it is
    (CASE_AUTHORING §3), and a listing would offer the stale question in front-ends that filter by
    `phases` alone (the web's suggested questions) and count its answer as unrevealed for the
    grounding check.
  * In `ed`, any question that would select one of them selects its twin, so the patient never says
    both ("Can't… get a full breath… whistling… Now? Much easier…") or volunteers "big raised lumps
    everywhere" after the nurse's report that the rash has nearly gone; a direct `ask` of one is
    rejected as `phase-locked`.
  * Asking a twin credits what it supersedes: a learner who first asks about throat, breathing and
    dizziness in `ed` has the required `hpi-throat`, `hpi-breathing` and `hpi-dizzy` counted in the
    history assessment, without the stale answers entering the transcript or the revealed-fact
    ledger. Credit is one-way: the garden-time questions never credit the ED re-assessment. The 16
    ED-time utterances in the corpus (judged in `ed`) fail without the links.
* **An EpiPen now is IM adrenaline.** "epipen", "epi pen", "jext", "auto-injector" and 肾上腺素笔
  resolve to `adrenaline-im`; `prescribe-aai` answers only prescription phrasing ("prescribe an
  epipen", "two auto-injectors", "pens to take home", 开两支肾上腺素笔), and `adrenaline-im` excludes
  those. Before, `/give epipen` in the garden prescribed take-home pens while her BP kept falling.
* **Required examination.** Only `ex-skin` is `required`. The scene-only airway, chest and circulation
  findings are not required: giving adrenaline before a formal look locks them, and the debrief would
  list "Assess the airway" as missed after the learner had reassessed it. `r-ex-abc` (any phase
  variant) still scores the A–B–C assessment.
* **Lab interpretation is reachable.** Dr Shen's brief uses the `pathologist` role (immunology
  laboratory, by phone) with `interprets` limited to the lab tests, because the runtime only provides
  nurse, radiologist, pathologist and attending agents.
* **The patient voice gets no phase, clock or vitals.** Phase effects on what she says therefore live
  in data (phase-locked history, `status-*`, `now-*-ed`), and `actingNotes` hold behaviour only: no
  facts and nothing conditional on treatment or deterioration that the voice cannot observe.
* **Option and result texts reveal nothing early.** The `llr-criterion` distractor reads "A previous
  large local reaction to a sting…", so it does not disclose last summer's reaction (a `specific`
  item) before she is asked. The urine hCG value and reference are per-locale `LocalizedText`
  (阴性 / negative), never both languages in one string. `unknown-usual-bp` excludes medication
  phrasing, so "Are you on any blood pressure tablets?" selects only `meds-bb`.

## References

1. Resuscitation Council UK. Emergency treatment of anaphylaxis: guidelines for healthcare providers.
   London: Resuscitation Council UK; 2021.
2. Cardona V, Ansotegui IJ, Ebisawa M, et al. World Allergy Organization anaphylaxis guidance 2020.
   World Allergy Organ J. 2020;13(10):100472. doi:10.1016/j.waojou.2020.100472
3. Muraro A, Worm M, Alviani C, et al. EAACI guidelines: Anaphylaxis (2021 update). Allergy.
   2022;77(2):357-377. doi:10.1111/all.15032
4. Golden DBK, Wang J, Waserman S, et al. Anaphylaxis: A 2023 practice parameter update. Ann Allergy
   Asthma Immunol. 2024;132(2):124-176. doi:10.1016/j.anai.2023.09.015
5. Shaker MS, Wallace DV, Golden DBK, et al. Anaphylaxis—a 2020 practice parameter update, systematic
   review, and Grading of Recommendations, Assessment, Development and Evaluation (GRADE) analysis.
   J Allergy Clin Immunol. 2020;145(4):1082-1123. doi:10.1016/j.jaci.2020.01.017
6. National Institute for Health and Care Excellence. Anaphylaxis: assessment and referral after
   emergency treatment. NICE guideline NG258. London: NICE; 2026 (updates and replaces CG134, 2011).
7. Sturm GJ, Varga EM, Roberts G, et al. EAACI guidelines on allergen immunotherapy: Hymenoptera venom
   allergy. Allergy. 2018;73(4):744-764. doi:10.1111/all.13262
8. Lee S, Bellolio MF, Hess EP, et al. Time of Onset and Predictors of Biphasic Anaphylactic
   Reactions: A Systematic Review and Meta-analysis. J Allergy Clin Immunol Pract.
   2015;3(3):408-416. doi:10.1016/j.jaip.2014.12.010
9. Brown SGA. Clinical features and severity grading of anaphylaxis. J Allergy Clin Immunol.
   2004;114(2):371-376. doi:10.1016/j.jaci.2004.04.029
10. 中国医学救援协会. 严重过敏反应诊断和早期治疗规范（团体标准 T/CADERM 3008—2019）. 2019.

The same strings are `debrief.references` in `case.json`. Every DOI was checked by web lookup on
2026-10-28 (PubMed, the publisher or an institutional repository record with the same title,
journal, volume and pages); none was added from memory. RCUK 2021, NICE NG258 (published 27 May
2026; its observation and admission recommendations are based on RCUK 2021 section 8.2) and
T/CADERM 3008—2019 have no DOI.

### To verify

* The "about 4–10 %" risk of a later systemic reaction after a large local reaction (teaching notes,
  the `llr-criterion` feedback): secondary sources give 4–10 %; the primary source (the AAAAI/ACAAI
  stinging-insect practice parameter) was not checked line by line.
* NICE NG258 also revised its auto-injector recommendation in 2026; the case's "two auto-injectors"
  wording follows RCUK 2021 and was not compared with the NG258 text.

## Changelog

### 1.1.0 — 2026-10-28 (editorial review)

* Added six `learningOutcomes` and `provenance.review` (status `editorial`, the guidance checked);
  `provenance.notes` names NICE NG258 (2026).
* References in one Vancouver style with verified DOIs (WAO 2020, EAACI 2021, AAAAI/ACAAI 2020 and
  2023, EAACI 2018); the 2020 practice parameter now carries its full title; NICE NG258 carries its
  series number and publisher.
* Two references added for statements the case already made: Lee 2015 (biphasic reactions: median
  onset 11 h, range 0.2–72 h) and Brown 2004 (the severity grading used in the debrief conclusion).
* Rubric: "transferred lying flat; never sat up, stood or walked the hypotensive patient" is
  safety-critical (upright posture in anaphylactic shock can precipitate arrest) and now weighs 2,
  like the IM-route item (deterministic total 17 → 18; the wrong-path scores above are recomputed).
* Debrief teaching points name the guidance they rest on (RCUK 2021, NICE NG258, Lee 2015,
  AAAAI/ACAAI 2020, EAACI 2018 and 2021).
* README restructured to the facilitator-guide template; the event count corrected (19 events, 5
  silent — the unmonitored twins had not been counted) and the garden-to-resus distance taken from
  the measured route (about 74 m).

### 1.0.0

* Initial release.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/anaphylaxis-garden/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify anaphylaxis-garden     # solution 55 steps · objectives 5/5 · decisions 3/3 · utterances 113/113
npx vitest run packages/agent/src/session/embodied-autopilot.test.ts                 # embodied score = clinical score
npm run -s cc -- bench run --agent reference && npm run -s cc -- bench run --agent scripted-llm   # 100 %
npm run -s cc -- bench grounding --split dev && npm run -s cc -- bench grounding --split test     # this case: dev 54/54, test 71/79 (= baseline)
npm run cc -- play anaphylaxis-garden --provider offline
```

## 中文摘要

**病例概要。** 30岁女性中学音乐教师，在医院疗愈花园探视父亲时右前臂被蜜蜂蜇伤，数分钟内出现全身荨麻疹、
口唇及舌肿胀、声音嘶哑、哮鸣、头晕、腹部绞痛。护士带病区急救包到场，测得BP 78/44 mmHg、HR 128次/分、
RR 26次/分、SpO₂ 92%。诊断：蜜蜂毒液所致严重过敏反应（过敏性休克，Brown分级重度）。正确路径：呼救、
大腿前外侧肌注肾上腺素0.5 mg（1 mg/mL 0.5 mL）、平卧抬腿（头肩稍抬高）、高流量吸氧、静脉晶体液，
5分钟再评估后重复肌注；肾上腺素后对持续哮鸣雾化沙丁胺醇；定时采集类胰蛋白酶（1–2小时样本27.4 µg/L）；
平卧推床转运急诊；因严重呼吸受累留观≥12小时，出院带2支自动注射笔、培训与书面计划，转诊变态反应专科。

**学习目标。**
1. 依据可能诱因后急性出现的气道、呼吸或循环受累（WAO 2020标准）判断反应已危及生命，不等待皮疹、血压阈值或化验结果。
2. 数分钟内经闭环沟通，以正确的剂量、浓度、途径和部位给予一线药物；5分钟时系统再评估，反应不足即重复。
3. 为低血压且呼吸困难的患者安全摆放体位，平卧推床转运；低血压时绝不让她坐起、站立或步行。
4. 在一线治疗的同时给予支持治疗（吸氧、静脉补液、针对持续支气管痉挛的支气管扩张剂），抗组胺药和糖皮质激素仅作辅助。
5. 按时采集类胰蛋白酶并按“1.2×基础值 + 2 µg/L”解读，绝不因采样延误治疗。
6. 依据RCUK 2021/NICE NG258分层确定观察时长，并安排安全出院：自动注射笔及回示培训、书面应急计划和专科转诊。

**关键决策。** ① 诊断标准（多选）：接触过敏原后急性起病，气道、呼吸、循环、皮肤黏膜受累（不需要类胰蛋白酶，
既往大局部反应不是标准）；② 一线治疗：肾上腺素0.5 mg肌注于大腿前外侧，5分钟无改善重复；③ 去向：
留院过夜（症状缓解后≥12小时），2支自动注射笔、回示培训、书面应急计划及专科转诊。

**复盘要点（PEARLS）。** 先谈感受，再请学员复述从长椅到急诊的经过；分析环节聚焦：肾上腺素何时给、为何不能
更早；医嘱复述与1:10 000的十倍剂量错误；血压决定体位；5分钟再评估与第二剂；抗组胺药和激素的位置；为何留观
过夜、出院要带什么。最后请学员总结下一次严重过敏反应前五分钟要做的三件事。本病例为AI辅助编写、经编辑审核的
教学材料，尚未经执业医师审核。
