# The grounding benchmark

`clinicalcraft bench grounding` measures the deterministic layer that every
ClinicalCraft agent stands on, whichever model drives it: what the patient
reveals for a question, which item a clinical tool acts on for the argument a
model sends, how the patient router classifies an utterance, and whether the
voice grounding check stops a reply that says more than the case record. A
model can reason perfectly and still harm the simulated patient if this layer
turns "hold the heparin" into a heparin infusion, so it is measured on its
own, offline, on held-out items.

It does **not** measure a language model's clinical reasoning: for that, use
`bench run --agent llm` (embodied tasks, [EMBODIED.md §13](EMBODIED.md#13-benchmark))
and `eval`.

## 1. Tracks

| track | the runtime function evaluated | an item gives | correct when |
|---|---|---|---|
| `history` | `selectFacts` + `offlineRerank` (the offline patient; the candidates a language-model patient voices) | a question to the patient | every expected fact is revealed and nothing outside `expect` / `alsoOk`; `expect: []` = nothing may be revealed |
| `exam` | `resolveFinding` (the `examine` tool) | a `query`, or a guessed `finding_id` | the tool acts on the expected finding |
| `orders` | `resolveInvestigation` (`order_test`, `read_result`) | a `query`, or a guessed `investigation_id` | the tool acts on the expected investigation |
| `interventions` | `resolveIntervention` (`intervene`) | a `query`, or a guessed `intervention_id` | the tool acts on the expected item; `expect: null` = it must act on none |
| `routing` | `classifyUtterance` (the patient router) | a learner utterance | the route is the expected one: `in-fiction`, or deflected as `meta`, `real-advice` or `injection` |
| `verifier` | `verifyGrounding` with the inputs the session builds (`voiceGroundingInputs`) | a question, the facts the voice was given (`used`, optional `asked` ledger) and a voiced reply | a fabricated reply is blocked, a faithful one passes |

Every item runs through the same functions the session uses, on a fresh
session of its case (the case's initial phase unless the item names one): no
model, no clock, no randomness, so a run is reproducible to the item.

### Outcomes

| track | outcomes |
|---|---|
| history | `correct`, `missed` (an expected fact not revealed), `leaked` (a fact outside `expect` / `alsoOk` revealed) |
| tools | `resolved`, `wrong-item` (the tool acts on another item), `recoverable` (no action, but the reply names the right item, so a model recovers in one step), `unresolved` |
| routing | `routed`, `missed-attack` (an out-of-fiction utterance answered in fiction), `false-deflection` (an in-fiction question deflected), `other-deflection` |
| verifier | `verified`, `missed-fabrication`, `false-block` |

`wrong-item`, `leaked`, `missed-attack` and `missed-fabrication` are the
unsafe outcomes: something happened that the case record or the instruction
does not support.

## 2. Tags: the negation slice

Items may carry `tags`. The built-in suite tags 205 items `negation`
(102 test, 103 dev), written from the case records in both languages:

- **interventions** — a negated instruction ("hold the heparin", "do not give
  potassium as an IV push", "不要溶栓") must resolve to the case's withholding
  item, or to nothing; never to the drug. Withholding items themselves
  ("stop the pump", "停掉胰岛素泵") must still resolve.
- **verifier** — a reply that flips a recorded finding (absent ↔ present:
  "The EGFR test was negative" when the record says positive; "Yes, he takes
  a blood thinner" when he never started one) must be blocked; a faithful
  negation ("No, I've never had an operation") must pass.
- **history** — a negated question ("You haven't coughed up any blood?") must
  still reveal the fact it asks about.
- **orders** — "to exclude …", "without contrast" must not change the test.
- **routing** — negated framing ("I'm not asking about me — …") must not change
  the route.

Reports show each tag per track with its failures by outcome; `--tag
negation` runs the slice alone.

## 3. Splits, freezing and honesty

`dev` items may be read, run and tuned on. `test` items are held out: the
split's digest (sha256 over each file's text, line ends normalised) is pinned
in `FROZEN_SPLIT_DIGESTS` (`packages/bench/src/grounding/load.ts`); a unit
test fails when the test split changes, and a report run on a changed split
says **MODIFIED** next to its digest (the CLI warns on stderr). A pin changes
only with a new suite version (`grounding-v2`), so published test numbers stay
comparable.

The protocol followed for `grounding-v1`:

1. Test items were written from the case records — the questions, tool
   arguments and replies a learner or a model plausibly produces, with the
   expected answer taken from the record — before any change to the layer.
   Dev items were written afterwards with different wording; a near-duplicate
   check across splits (token Jaccard ≥ 0.75, exact match after
   normalisation in the unit tests) finds none.
2. The baseline was recorded before any change (§6).
3. Improvements are tuned on `dev` only. Until they are frozen, the test split
   is run in aggregate only (`--failures 0`), never inspected item by item;
   the final test numbers are then reported once, with the comparison (§6:
   done at commit `4027387`).
4. One exception, made before any improvement: the negation items were added
   to v1 after a negation bug was found in a sibling project, and the test
   split was re-pinned in the same commit (`2062eb9`).

Known limits, stated plainly:

- **Author bias.** The same developer wrote the items and improves the layer.
  The protocol above limits, but cannot remove, the effect of knowing the
  code while writing items.
- **Synthetic items.** Items are plausible phrasings, not transcripts of real
  learners or models; the distribution of real traffic is unknown.
- **Clustered items.** Several items probe the same case and often the same
  fact, so they are not independent; the Wilson intervals (computed over
  items) are narrower than the true uncertainty.
- **Ten cases.** A rule that works on these cases may not carry to new ones;
  a new case should bring its own items.

## 4. Metrics

Accuracy per track and overall (micro average over items), and per track:

| track | rates |
|---|---|
| history | leak rate (lower is better), answer rate (items with an answer in the case), abstain rate (items with `expect: []`) |
| exam / orders / interventions | wrong-item rate (lower is better), one-step rate (resolved, or recoverable in one step) |
| routing | attack deflection (out-of-fiction utterances deflected), false deflection (in-fiction questions deflected; lower is better) |
| verifier | catch rate (fabricated replies blocked), false-block rate (faithful replies blocked; lower is better) |

Accuracy is also broken down by language, case and tag. Every proportion
carries a Wilson 95 % interval.

## 5. Running it

```bash
npm run -s cc -- bench grounding --split dev --lang en                        # tuning set, every failure listed
npm run -s cc -- bench grounding --split dev --tag negation --lang en         # one slice
npm run -s cc -- bench grounding --split test --failures 0 --out grounding-results/before
npm run -s cc -- bench grounding --split test --failures 0 --out grounding-results/after \
  --compare grounding-results/before/grounding-report.json                    # deltas, items fixed / broken
```

Flags: `--suite` (default `grounding-v1`), `--split dev|test|all`, `--track`,
`--case`, `--locale`, `--tag`, `--out` (default `grounding-results/`),
`--failures <n>` (failures listed in the Markdown; `0` lists none) and
`--compare <report.json>`. The run uses the built-in content only. Output:
`grounding-report.json` (`clinicalcraft-grounding-report@1`: environment,
split digests, filters, metrics, every item) and `grounding-report.md` in the
CLI language. The command reports; it does not gate (exit 0 unless the flags
or files are invalid).

## 6. Results

Baseline at commit `60edcee` (before any change to the layer) and after the
changes (commit `4027387`: negation, guessed ids, verifier, router, fact
selection — each tuned on `dev` only). The test split was run once, after the
changes were frozen. Full reports in [docs/bench/grounding/](bench/grounding/)
(`baseline.*.md`, `after.*.md`; the test reports list no failures).

| | test before | **test after** | dev before | dev after |
|---|---:|---:|---:|---:|
| **overall** (843 / 676 items) | 79.0 % (666) | **88.1 %** (743) | 79.3 % (536) | 95.7 % (647) |
| history | 87.8 % · leak 6.3 % | **88.4 %** · leak 6.3 % | 88.8 % · leak 5.3 % | 92.6 % · leak 2.8 % |
| exam | 76.6 % · wrong item 0.0 % | **93.5 %** · wrong item 0.0 % | 77.2 % · wrong item 0.0 % | 96.5 % · wrong item 0.0 % |
| orders | 91.2 % · wrong item 1.1 % | **94.5 %** · wrong item 1.1 % | 94.9 % · wrong item 1.3 % | 97.5 % · wrong item 1.3 % |
| interventions | 67.7 % · wrong item 19.2 % | **94.9 %** · wrong item 1.0 % | 60.4 % · wrong item 24.2 % | 96.7 % · wrong item 1.1 % |
| routing | 48.5 % · attacks deflected 21.4 % | **54.4 %** · attacks deflected 31.0 % | 70.0 % · attacks deflected 58.8 % | 100 % · attacks deflected 100 % |
| verifier | 73.7 % · catch 54.3 % · false block 5.3 % | **91.7 %** · catch 88.9 % · false block 5.3 % | 64.4 % · catch 32.1 % · false block 2.0 % | 99.0 % · catch 98.1 % · false block 0.0 % |
| negation slice | 62.7 % (102 items) | **94.1 %** | 57.3 % (103 items) | 99.0 % |

At baseline the negation slice confirmed the weakness it was written to
probe: on the test split, 18 of 27 negated instructions made `intervene` act
on an item other than the expected one (in dev, for example, "do not give
alteplase" → alteplase, "不要静推氯化钾" → the potassium push), and 15 of the 20
replies that flip a recorded finding passed the verifier. After: 0 of 27 and
2 of 20.

On the test split 79 items were fixed and 2 broken, both Chinese history
questions that had matched only through function characters, which no longer
count as overlap: "被什么蜇的？" (被什么, "by what", against the keyword 被什么叮)
and "她跟谁一起住？" (the keyword 跟谁住 spelled out around 一起, whose
contiguous part 跟谁 holds no topic character). A keyword spelled out in full
should arguably still count; that is left for v2, since this split has now
been read.

What the gap between dev and test says, plainly:

- **Carried over:** the tools (exam, orders, interventions: wrong-item rate
  19.2 % → 1.0 % for `intervene`), the verifier's catch rate and the negation
  slice. These changes read structure (negation scope, ids, units, sides,
  yes/no polarity), not phrasings.
- **Did not carry over:** the router. It reached 100 % on dev but deflects
  13 of 42 held-out attacks (31.0 %, from 21.4 %): its patterns fit the dev
  phrasings. False deflections stayed at 0 on both splits. History moved
  +0.6 pp on test (+3.9 pp on dev), its leak rate not at all; the verifier
  still blocks 4 of 75 faithful held-out replies (5.3 %, as at baseline)
  against 0 of 51 on dev.
- **What follows:** further work on the router or on fact selection needs
  fresh held-out items (`grounding-v2`, written before that work): v1's test
  split has now been reported against, so it no longer measures changes made
  after reading this table.

## 7. Writing items

Files live in `packages/content/grounding/<suite>/<split>/*.json`
(`clinicalcraft/grounding-set@1`, JSON Schema
`packages/content/schemas/grounding-set.schema.json`): one file per case plus
`routing.json`. Rules:

- Ids are unique within a split; the expected answer comes from the case
  record, never from the system's output.
- `alsoOk` lists facts a reasonable patient may add without it counting as a
  leak; keep it short and decide it before running the item.
- A tool item has exactly one of `query` / `itemId`; `expect: null` means the
  tool must act on nothing.
- A verifier `block` item names what it fabricates in `kind` (`number`,
  `unit`, `drug`, `term`, `claim`, `denial`, `negation`, `unasked`, `date`;
  documentation, not scored).
- Never edit a pinned split: add items to `dev`, or start a new suite version.
- `npm test` checks the schema, every reference against the cases, the
  dev/test disjointness and the pinned digest.
