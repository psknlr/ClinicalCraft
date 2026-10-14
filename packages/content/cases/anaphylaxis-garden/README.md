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
| phases | live progression, none learner-switchable: `scene` (garden, before treatment) → `treated` (garden, after the first IM adrenaline) → `ed` (after transfer to the ED) |
| difficulty / time | 3 / 5 · about 25 min |
| content | 34 history items (3 `unknown`, 3 `specific`, 9 required) · 21 exam findings (phase-specific reassessment) · 14 investigations (4 useful, 5 neutral, 4 low-value, 1 harmful) · 21 interventions (9 wrong or not-first-line choices) · 10 physiology trends · 7 scenario events · 5 objectives · 3 decisions · 15 rubric items (12 deterministic, 3 examiner-judged) · 5 NPCs · 40 test utterances |

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
facts are `specific` disclosures. Three items are explicitly unknown: tetanus
status, any family history of mast-cell disorders, and her usual blood
pressure.

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
   minute 3.5.**
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

Replay of the reference solution (displayed values, including the deterministic monitor jitter):

| minute | HR | BP (MAP) | RR | SpO₂ | context |
|---:|---:|---|---:|---:|---|
| 0 | 128 | 78/44 (55) | 26 | 92 | first contact |
| 3.5 | ≈135 | ≈71/40 (50) | ≈28 | ≈90 | 1st IM adrenaline |
| 8.5–10 | ≈129 | ≈87/50 (62) | ≈26 | ≈96 | 5-min reassessment: partial response on O₂ + legs up → 2nd dose at 10 |
| 13.5 | ≈126 | ≈101/56 (71) | ≈25 | ≈98 | IV access + crystalloid bolus |
| 20 | ≈115 | ≈113/63 (80) | ≈21 | 100 | stabilising; transfer at 21.5 |
| 60–110 | ≈98 | ≈111/60 (77) | ≈18 | 100 | ED observation; sinus rhythm |

Without adrenaline, SBP falls to about 56 by minute 10. At that point the
`peri-arrest` event fires (GCS 12, "we're losing her"). GCS recovers only
after IM adrenaline brings SBP to ≥ 90. The other scripted events are:

* `adrenaline-prompt`: the nurse offers the drawn-up adrenaline at 5 min. It
  sets `adrenaline-delayed`, which fails the weighted rubric item.
* `upright-while-hypotensive`: she greys out when sat up with SBP < 90.
* `iv-bolus-arrhythmia`: broad-complex runs and a hypertensive spike after an
  IV bolus. This does **not** stop the anaphylaxis trends.
* `sinus-in-ed`: the rhythm label changes to sinus once HR < 100 in the ED.
* `asks-to-leave`: at 90 min she asks to go home. This is the disposition
  teaching prompt.

## Tempting wrong choices (all playable)

| choice | appropriateness | why |
|---|---|---|
| Adrenaline 0.5 mg **IV bolus** | contraindicated (high risk) | Undiluted IV bolus of the IM dose causes hypertension, VT, ischaemia and pulmonary oedema. IV adrenaline is for arrest or an expert-titrated infusion. |
| Adrenaline **subcutaneous** | contraindicated | Slow, unreliable absorption in shock. Only a small, delayed effect, and the trends continue. |
| **Antihistamine** (oral cetirizine or IV chlorphenamine) or **hydrocortisone** before adrenaline | contraindicated | Adjuncts that treat none of A/B/C. Delaying adrenaline is the avoidable factor. IV chlorphenamine is also flagged if SBP < 90. |
| **Sit her upright / stand her** with SBP < 90 | contraindicated | "Empty ventricle": SBP −14 and GCS −3 for 5 min. |
| **Walk her (or wheelchair) to the ED** | contraindicated | Same mechanism. Transfer lying flat on a trolley after adrenaline. |
| **Transfer before IM adrenaline** | contraindicated | Delays treatment. The phase stays `scene` until adrenaline is given. |
| **Discharge now** | contraindicated | Two doses and severe respiratory compromise (≥ 12 h), no auto-injector, biphasic risk. |
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
    stabilisation, and only when she can swallow safely.
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
  * In the garden (`scene` / `treated`): POC glucose and sample-based lab
    tests drawn from the cannula. Tryptase, FBC and U&E are available from
    first contact; venom sIgE, troponin and CRP from `treated`.
  * ED only: 12-lead ECG, VBG (blood-gas analyser), CXR, CTPA, POCUS and
    urine hCG.
* Ordering one of these in the garden gives "no record in this phase". The
  nurse brief and the ECG note explain why.

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

## Authoring notes and known limitations

* **Phase-specific exam findings share vocabulary.** The airway, chest,
  circulation and general-appearance findings have `scene`, `treated` and
  `ed` variants. `matchExam` has no notion of phase, so "listen to the chest"
  scores all variants equally. Front-ends and agents should filter hits to
  items available in the current phase. Otherwise the top hit may be rejected
  as `phase-locked`.
* **History keywords avoid single-token collisions.** History items are
  ordered so that specific items win ties. For example, `prev-reaction`
  precedes `allergy-drug`, `family` precedes `allergy-drug`, and `pmh-*`
  precedes `meds`. All 40 `extensions.testUtterances` return the expected
  item as the top hit.
* **Static text with dynamic vitals.** Exam text cannot react to individual
  interventions within a phase. For example, `ex-chest-treated` still
  describes wheeze after salbutamol. The salbutamol `response` narrates the
  improvement instead.
* **The 5-minute repeat interval is not encoded.** The condition DSL has no
  "minutes since the last dose", so `adrenaline-im` is `indicated` whenever
  SBP < 90, SpO₂ < 94 or RR > 24, even if the previous dose was given a minute
  earlier. The reference solution repeats at about 6–7 minutes.
* **Effect offset is instant.** By engine design, effects end abruptly, so
  SBP steps down about 8 mmHg when each dose's transient component ends,
  15 min after its ramp.
* **Tryptase turnaround is 90 simulated minutes.** In real practice the assay
  is often batched (1–2 days). The result note says so.

## Validate

```bash
clinicalcraft cases validate packages/content/cases/anaphylaxis-garden/case.json
clinicalcraft cases verify anaphylaxis-garden
clinicalcraft play anaphylaxis-garden --provider offline
```
