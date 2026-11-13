# Prescriptions · 处方

A prescription in an encounter is more than a drug given: it is written, reviewed by a dispensary, sometimes queried,
revised, and only then supplied — and the supply can differ from what was signed. This page is the contract for
**prescriptions as versioned, executable records**: the versions a prescriber signs, the dispensary's review, the
supply at a dispensing device, and every attempt that was refused on the way.

Code: `packages/core/src/schema/prescription.ts`, `packages/core/src/engine/prescription.ts` (pure: versions,
reviews, supplies, refusals, the condition), `packages/agent/src/tools/prescriptions.ts` (`prescribe`,
`read_prescription`, `dispense`), `packages/agent/src/session/prescriptions.ts` (the dispensary working on its own),
`packages/world/src/policy.ts` and `clinical.ts` (where each step may be taken; a dispensing device's operations).
If code and this page disagree, fix one of them in the same change.

Learner-facing words follow [GLOSSARY.md](GLOSSARY.md): **version** (版本), **dispensary** (药房), **query**
(审方意见), **supply** (发药), **label** (标签).

## 1. The record

```text
sign (version n, superseding n − 1) ─→ review by the dispensary ─→ query ─→ read ─→ a revision signed (n + 1) …
                                                                └→ confirmed ─→ prepared · picked · label checked · supplied
```

- **Versions.** Signing a formulation makes the next version of its prescription and supersedes the one before.
  There is no editing: a change is a new version. Any number of versions can follow one another.
- **Review.** The dispensary reviews each signed version. What it finds is **computed by the engine** (§3), never
  supplied by whoever records the review. No findings: the version is *confirmed*. Findings: it is *queried* and on
  hold.
- **Supply.** Only the **current** version, once **confirmed**, is supplied — once. What was supplied (each line's
  product, batch and quantity, the label as printed, whether the label was checked) is recorded and compared with
  the version: every difference is a recorded **discrepancy**.
- **Refusals.** An attempt refused for a clinical reason — a formulation that may not be signed yet, an earlier,
  unreviewed or queried version selected for supply, a second supply, a pick the shelf cannot cover — is **an
  accepted action recorded as a refusal** (`refusals[]`, with who, when and why). Nothing else changes. An
  intercepted error therefore stays apart from what was done, and a rubric can ask for either.
- **Idempotent requests.** A signature and a supply carry a request key: the same key again is the same version, the
  same supply (`unchanged` — no event, nothing recorded). A retried "dispense" never supplies twice.

A version's status is `submitted` (signed, not reviewed), `queried`, `confirmed`, `preparing` (a supply is being put
together at the device), `dispensed`, or `superseded`. A prescription's status is its current version's (`none`
before anything is signed).

## 2. Authoring (`case.prescriptions[]`)

```jsonc
{
  "id": "herbal",
  "name": { "zh-CN": "中药处方", "en": "Herbal prescription" },
  "dispensary": "dispenser",            // a staff id of the facility, or a role (default "pharmacist")
  "requires": ["tcm-dispensing"],       // capabilities of the device it is dispensed at (default ["medications"])
  "dispensedBy": "staff",               // "staff" (default): the dispensary supplies it on its own · "learner": a dispensing station
  "products": [
    { "id": "sang-ji-sheng", "name": { "zh-CN": "桑寄生颗粒", "en": "Taxilli Herba granules" },
      "part": { "zh-CN": "带叶茎枝", "en": "leafy stem and branch" }, "class": "TMM",
      "unit": "g", "usualDose": [9, 15],
      "stock": { "quantity": 0, "note": { "zh-CN": "预计周四到货。", "en": "Expected on Thursday." } },
      "confusedWith": ["hu-ji-sheng"] },
    { "id": "hu-ji-sheng", "name": { "zh-CN": "槲寄生颗粒", "en": "Visci Herba granules" }, "unit": "g",
      "stock": { "quantity": 500, "batch": "V-2406", "expiry": "2027-03" } },
    { "id": "dang-gui", "name": { "zh-CN": "当归颗粒", "en": "Angelicae Sinensis Radix granules" }, "unit": "g", "usualDose": [6, 12] }
  ],
  "formulations": [
    { "id": "v1", "name": { "zh-CN": "独活寄生汤加减", "en": "Du Huo Ji Sheng Tang, modified" },
      "form": "granules", "route": "oral",
      "frequency": { "zh-CN": "每次1包，每日2次，饭后温水冲服", "en": "1 sachet twice daily after meals, in warm water" },
      "dosesPerDay": 2, "days": 7,
      "lines": [{ "product": "sang-ji-sheng", "dose": 12, "unit": "g" }, { "product": "dang-gui", "dose": 9, "unit": "g" }] },
    { "id": "v2", "name": { "zh-CN": "去桑寄生方", "en": "Without Taxilli Herba" }, "form": "granules",
      "frequency": { "zh-CN": "每次1包，每日2次", "en": "1 sachet twice daily" }, "dosesPerDay": 2, "days": 7,
      "lines": [{ "product": "hu-ji-sheng", "dose": 12, "unit": "g" }, { "product": "dang-gui", "dose": 9, "unit": "g" }],
      "signableWhen": { "prescription": { "id": "herbal", "acknowledged": true } },
      "refusal": { "zh-CN": "未签发：请先阅读药房的审方意见。", "en": "Not signed: read the dispensary's query first." } }
  ],
  "review": [
    { "id": "antiplatelet-history", "kind": "history", "products": ["dang-gui"],
      "when": { "not": { "asked": "antiplatelets" } },
      "text": { "zh-CN": "方中有活血药：请向患者确认是否服用抗血小板或抗凝药。", "en": "The formula has blood-activating herbs: please confirm any antiplatelet or anticoagulant." } }
  ],
  "deviations": [
    { "formulation": "v2", "label": { "frequency": { "zh-CN": "每日3次", "en": "three times daily" }, "dosesPerDay": 3 },
      "summary": { "zh-CN": "标签印成每日3次。", "en": "The label is printed three times daily." } }
  ]
}
```

| field | meaning |
|---|---|
| `products[]` | what a line can name and the dispensary picks: `name`, `synonyms`, identity (`part`, `processing`), the regulatory `class` as the case's jurisdiction names it (free text — Singapore: `CPM`, `TMM`; the engine only shows it), `unit`, the `usualDose` per day in that unit, `stock` (`quantity`, `batch`, `expiry` as printed, `expired`, and a `note` the dispensary adds when it is short), `confusedWith` (look-alikes on the shelf). No `stock`: not tracked, never short |
| `formulations[]` | what a prescriber can sign: `form` (`decoction-pieces`, `granules`, `decoction`, `proprietary`, `topical`, `other`), `route`, `frequency` (the label's words), `dosesPerDay`, `days`, and `lines[]` — each a `product`, its **daily** `dose` and `unit`. `aliases` are what a learner may call it. `signableWhen` + `refusal`: while the condition does not hold the attempt is refused and recorded, and the refusal says why |
| `review[]` | the dispensary's rules beside what it checks from the data (§3): `kind` (`stock`, `unit`, `dose`, `duplicate`, `identity`, `interaction`, `history`, `other`), `products` (it applies to a version with a line naming one of them — at `minDose` per day or more, when given), `formulations` (only versions of these), `when` (while this holds at review) and the query's `text` |
| `deviations[]` | an authored **execution discrepancy** of the dispensary's own supply: for a `formulation` (while `when` holds as it is supplied), the `label` printed otherwise and/or `substitutions` (`product` supplied `with` another). It is what the dispensary supplies however its steps are recorded — at once, or one by one at the device — and it goes out with the label unchecked. Hidden state: nothing said, announced or emitted gives it away; it is found by reading the supply against the version. Never applies to a learner's supply |
| `dispensary` | who reviews and supplies: a staff id of the facility, else the first staff member of that role |
| `requires` | capabilities of the dispensing device (`medications`: a medication cabinet; `tcm-dispensing`: a herb cabinet or granule dispenser) |
| `dispensedBy` | `staff`: the dispensary's staff work the device on their own · `learner`: the learner does (a dispensing skills station: select the version, pick each product, check the label, supply) |

`cases validate` checks every id (a line's product, a look-alike, a rule's products and formulations, a deviation's
formulation and substitutions, every condition), warns about a `signableWhen` without `refusal`, a deviation that
changes nothing or can never apply, and reports a facility with no device that provides `requires` as a capability
gap. A prescription id must differ from every intervention id.

## 3. The review

`review` is recorded in the reviewer's name; the engine computes the findings **as they hold at that moment**:

| finding | from |
|---|---|
| `duplicate` | a product named by two lines of the version |
| `unit` | a line's unit is not its product's (a dose written in mg for a product dispensed in tablets) |
| `dose` | a line's daily dose outside the product's `usualDose` |
| `stock` | stock on hand short of the supply (dose × days); an expired batch counts as none; the product's stock `note` is added |
| a rule's `kind` | each of the case's `review` rules that applies |

A review with the same findings as the last one changes nothing. A **query the prescriber resolves without a
revision** — the history the rule asked for is now recorded — is confirmed by the next review of the same version;
a query that needs another medicine (no stock) is resolved by signing a new version. A superseded or supplied version
is not reviewed.

## 4. Actions (`ClinicalAction` `prescription`)

| op | by | effect |
|---|---|---|
| `submit {prescription, formulation, key, by}` | the prescriber | the next version (idempotent by `key`); refused and recorded while `signableWhen` does not hold |
| `review {prescription, version, by}` | the dispensary (system) | the engine's findings recorded as the version's latest review |
| `acknowledge {prescription, version, by}` | the prescriber | the record read as it stands: the version's latest review, and every supply made so far |
| `prepare {prescription, version?, by, device?}` | whoever works the device | a supply of the version is started (default: the current one); an earlier, unreviewed, queried or supplied version is refused and recorded |
| `pick {prescription, line?, product?, by}` | 〃 | `product` picked for `line` (the product the line prescribes; default: itself). No `line`: every remaining line as prescribed. Picking again replaces the pick and voids the label check |
| `check-label {prescription, by}` | 〃 | the label and what is picked are checked against the version; the result is on the preparation |
| `dispense {prescription, version?, key, by, device?}` | 〃 | the supply is completed (idempotent by `key`); stock is reduced. With no preparation open it is the dispensary's whole act — picked as prescribed, the label checked. A supply the shelf cannot cover is refused and recorded (`out-of-stock`); an authored deviation of the dispensary's supply applies either way |

A request that is itself wrong (an unknown prescription, formulation or version; nothing to read yet) is a
**rejection** (`unknown-id`, `invalid`, `requirements-unmet`) and records nothing. A clinical refusal is accepted and
recorded (§1). Every accepted op emits `prescription.recorded {op, prescription, version?, refused?, findings?,
discrepancies?}` — `findings`: how many points a review raised; `discrepancies`: how many differences a **label
check** found. What a completed supply got wrong is never in an event: it is on the record, and found by reading it.

On the learner's op path (`clinical_action`) a learner can never record a `review` (`permission_denied`: a version
is reviewed by the dispensary) and acts under their own name whatever `by` says.

## 5. Who does what

**The prescriber** (the learner, or the clinician agent):

| tool | effect |
|---|---|
| `prescribe {formulation \| query, prescription?, request_key?}` | signs (`submit`). Free text resolves by id, name or alias in either language; several matches sign nothing and list the candidates |
| `read_prescription {prescription?}` | the record in words: every version and its status, its lines, the dispensary's review, what was supplied with its label and how it differs from the version, the refused attempts. Reading records `acknowledge` when something is unread — so "the query was read" and "the supply was checked" are facts on the record |
| `dispense {step, …}` | a dispensing step — refused (`NOT_AUTHORIZED`) unless the case makes the learner the dispenser |

Commands: `/prescribe <formulation>`, `/rx [prescription]`, `/dispense <step> [line] [product]`. `case_status` lists
each prescription's current version. The tools are offered only in a case with prescriptions.

**The dispensary, on its own** (`SessionPrescriptions`, part of the staff's own round — docs/TEAM.md §5): after every
act of the learner and on the staff's clock, the staff member the prescription names

- **reviews** a version just signed, and a queried one again (a resolved query is then confirmed), and says the
  outcome in their own voice — the query point by point, or that it is in order; a notification announces it;
- **supplies** a confirmed current version (`dispensedBy: "staff"`). Without a world, at once. In in-world mode with
  **their own body**: they walk to a device that provides `requires` — the one made for the formulation's form when
  the dispensary has one (an equipment type tagged with the form: `granules`, `decoction-pieces`…), then one with
  dispensing operations — and work it. Nothing is supplied from the bedside, and nothing without somebody at the
  device: no staff member, no device or no way there is said once per reason and tried again every round.

The prescriber stays the prescriber: the service never signs and never reads a review for them.

**A dispensing device** (docs/FACILITIES.md, docs/EMBODIED.md §8) gives its operations a clinical effect naming the
step:

```jsonc
"behavior": {
  "initial": "idle",
  "states": { "idle": {}, "prepared": {}, "picked": {}, "checked": {} },
  "operations": {
    "select_version": { "name": { "zh-CN": "选定版本", "en": "Select the version" }, "from": ["idle"], "to": "prepared",
                        "clinical": { "tool": "dispense", "select": "item", "item": "prepare" } },
    "pick":           { "name": { "zh-CN": "取药", "en": "Pick" }, "from": ["prepared", "picked", "checked"], "to": "picked",
                        "clinical": { "tool": "dispense", "select": "item", "item": "pick" } },
    "check_label":    { "name": { "zh-CN": "核对标签", "en": "Check the label" }, "from": ["picked"], "to": "checked",
                        "clinical": { "tool": "dispense", "select": "item", "item": "check-label" } },
    "dispense":       { "name": { "zh-CN": "发药", "en": "Supply" }, "from": ["picked", "checked"], "to": "idle",
                        "clinical": { "tool": "dispense", "select": "item", "item": "dispense" } }
  }
}
```

An operation takes the parameters `prescription` (default: the case's only one, else the first this device
supplies), `version`, `line`, `product` and `request_key`; the supply records the device it was made at. The
dispensary's staff run the operations in order; a learner-dispenser runs them one by one (the web's device panel
shows the version, each line with a choice among everything the dispensary holds, the label check and the supply).
A device without such operations is a plain cabinet: the staff's supply is recorded once the world has them at it.

**Where** (the spatial policy, in-world mode): a version is signed at a records terminal; the record is read at a
terminal or from the notes at the patient's side; a dispensing step is taken at a device that provides the
prescription's `requires`, wherever the patient is.

**Approvals and scope.** `prescribe` and `dispense` are low risk and need the full scope of practice;
`read_prescription` is a work-up tool. The dispensary's own steps at its device never ask the learner for approval.
A pharmacist's scope covers `read_prescription` and `dispense`.

## 6. Conditions

`{ "prescription": { … } }` — every given field must hold (`{}`: something was signed). With no `id`, one of the
case's prescriptions must satisfy them all.

| field | holds when |
|---|---|
| `id` | which prescription |
| `status` | its current version's status is (one of) `none`, `submitted`, `queried`, `confirmed`, `preparing`, `dispensed` |
| `current` | the current version signs this formulation |
| `signed` | a version of this formulation was signed at any time |
| `dispensed` | a version of this formulation was supplied (`true`: any) |
| `versions {gte?, lte?}` | how many versions were signed |
| `queried` | a review raised a query (ever — the credit stays) |
| `acknowledged` | the prescriber read a review that raised one |
| `refused` | an attempt was refused and recorded (`true`: any; or the step: `submit`, `prepare`, `pick`, `dispense`) |
| `discrepancy` | a supply differed from its version (`true`: any; or the kind: `identity`, `omitted`, `label`, `expired`, `label-unchecked`) |
| `labelChecked` | the latest supply's label was (not) checked |
| `supplyRead` | the prescriber has (not) read the record of the latest supply — neither holds before anything is supplied |

Usable wherever a condition is: objectives, a decision's `requires`, rubric items and safety events, a phase's
`enterWhen`, an intervention's `indicatedWhen` (counselling only once the supply was made), and the `when` of a
branch (docs/CASE_AUTHORING.md §3.1) — a follow-up answer that depends on which formulation was supplied.

## 7. Reference solutions and the demonstration

A reference `solution` lists the dispensary's steps where they happen, exactly as the record will hold them:

```jsonc
{ "type": "prescription", "prescription": { "op": "submit", "prescription": "herbal", "formulation": "v1", "key": "ref-1", "by": "learner" } },
{ "type": "prescription", "prescription": { "op": "review", "prescription": "herbal", "version": 1, "by": "dispenser" } },
{ "type": "prescription", "prescription": { "op": "acknowledge", "prescription": "herbal", "version": 1, "by": "learner" } },
{ "type": "prescription", "prescription": { "op": "submit", "prescription": "herbal", "formulation": "v2", "key": "ref-2", "by": "learner" } },
{ "type": "prescription", "prescription": { "op": "review", "prescription": "herbal", "version": 2, "by": "dispenser" } },
{ "type": "prescription", "prescription": { "op": "dispense", "prescription": "herbal", "version": 2, "key": "ref-supply", "by": "dispenser" } }
```

`cases verify` replays them as written (the engine is pure: nobody acts on their own in a replay). The offline
demonstration (`exec --autopilot`, the web's walkthrough) takes the prescriber's steps with the prescriber's tools
and **waits** for the colleague whose work a step is — the review, the staff's supply — instead of doing it: the
dispensary does them in its own round, in-world with its own body. A colleague's step that never comes is reported
as missed. Where the case makes the learner the dispenser, the in-world demonstration walks to the device and runs
its operations.

## 8. What is not modelled

Counselling stays an intervention (gate it on `{ "prescription": { "status": "dispensed" } }`); adherence and what a
patient reports at follow-up are authored branches on the supply (`branches`, docs/CASE_AUTHORING.md §3.1). A
restock during the encounter, a formulation composed line by line by the learner, and a supply split over two devices
(pieces picked at the cabinet, then decocted) are not modelled.
