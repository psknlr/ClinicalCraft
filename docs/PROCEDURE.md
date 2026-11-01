# The operative field (procedure model)

A case may carry a **procedure**: the operation its operative phases carry out. The procedure
model is a pure, deterministic part of `@clinicalcraft/core` (`packages/core/src/engine/procedure`,
schema `packages/core/src/schema/procedure.ts`). It gives a laparoscopic operation the same footing
as the rest of a case: one action (`operate`) changes it, conditions read it, the assessment scores
it, and an agent sees only what a surgeon at the screen could see.

It is a **state model**, not a physics engine. Tissue is described by what has been dissected,
exposed, held, clipped, divided, burnt or torn. Instruments pivot about their ports and must reach
what they act on; nothing deforms by calculation. A front-end may draw deformation, but no rule may
depend on it. This contract is authoritative: if the code and this page disagree, one of them is
wrong.

## 1. What a procedure is made of

| part | what it is |
|---|---|
| `anatomy` | structures, each with `kind`, `role` and `points` (a centreline or a few surface points) and a `radius`. Optional: `parent` (a part of a structure), `joins` (topology), `enters` (the organ a duct or vessel enters), `in`/`revealAt` (the region that hides it and the clearance at which it shows), `crosses` (a region whose plane it crosses, §3), `appearsAs` (how it looks without its name) and `mesh` (its node in the case's model). `provenance` is required. |
| `regions` | dissection fields with `units` of work, a `centre`, `after` (regions to open first), `exposure` (the retractions that open the region), `hazards` (critical structures in or next to it), `bed` (the specimen's bed: dissecting it frees the specimen) and optional `fibrosis` (dense inflammation, §3). |
| `portSites`, `portPlans` | where ports can go, with an outward wall normal. Each plan sets the surgeon's side, every port's role and size, and the hand that works each working port. |
| `instruments` | which of the engine's instruments are on the table, with optional diameter and length overrides. |
| `views` | safety views, each a list of criteria. The **critical view of safety** has three criteria: `cleared` (region fully dissected), `cleared` (the plate) and `onlyEntering` (two and only two structures entering the gallbladder). |
| `bailouts`, `insufflation`, `minutes`, `specimen`, `stones`, `target`, `phases` | the alternatives offered, the usual and maximum pressure, the time a step takes, the organ removed, whether it holds stones, the point port metrics measure to, and the case phases in which `operate` is accepted. |
| `variants` | anatomical variants a session can be started with (§9). |

Coordinates are in metres in the **patient frame**: +x is the patient's left, +y cranial, +z
anterior. This is the glTF frame of the case's anatomy model, so the model and the procedure share
one set of numbers. A front-end must never take the screen's left for the patient's left.

`role` drives the consequences:

- `specimen`: what is removed.
- `target`: may be clipped and divided once identified (the cystic duct and artery).
- `critical`: must never be clipped, divided or burnt (the common bile duct, hepatic ducts, hepatic
  arteries, portal vein).
- `organ` and `landmark`: neighbouring structures and orientation points.

`checkCaseIntegrity` checks every id, the topology references and that a port plan reaches the
target with a standard shaft.

## 2. Ports and instruments

Instruments pivot about their port. `reach(port, normal, point)` holds when the point lies within
the shaft's length (0.34 m) and within 80° of the inward wall normal. An instrument that cannot
reach is **rejected**; a step never silently succeeds out of reach. Two shafts that pass within
8 mm of each other inside the abdomen, short of their last 4 cm, **clash**. Clashes are counted and
signalled.

`portReport(def, plan)` describes a plan's ergonomics:

- reach and wall angle of every port;
- the manipulation angle between the two hands at the target (25–100° works; below 25° the shafts
  fence);
- whether the hands cross outside the body, judged from the surgeon's side;
- ports too close to the target (< 7 cm), and working ports in line with the scope.

It states consequences, never a verdict: there is no single right plan.

| instrument | can |
|---|---|
| laparoscope | show the field (in any port its diameter passes) |
| grasper | retract |
| maryland | retract, dissect, isolate, coagulate (energy) |
| hook | dissect (energy), isolate, coagulate |
| scissors | dissect, divide |
| clip-applier | clip |
| suction | suction, irrigate |
| retrieval-bag | bag |
| cholangiocatheter | intraoperative cholangiography |
| lap-us | laparoscopic ultrasound |

An instrument wider than its port does not pass.

## 3. Operations (`operate`)

`{ type: "operate", op }` is accepted only while the session is in one of `procedure.phases`. It
applies one step:

```
plan-ports · insufflate · desufflate · insert · withdraw · retract · release · dissect · isolate ·
identify · safety-pause · clip · divide · coagulate · suction · irrigate · image · inspect ·
recognise · bag · extract · bailout · close
```

A step that is **physically impossible** is rejected, with nothing changed. For example:

- out of reach, or the wrong instrument;
- clipping a structure that is not free all round;
- dissecting in a field obscured by blood;
- a 10 mm scope in a 5 mm port;
- closing with the specimen still inside.

A step that is possible but **unsafe** is carried out and recorded (§5). Its consequence comes from
the anatomy, never from a script.

Exposure of a region is the weakest of its retraction needs. Each need is the cosine between the
actual pull and the needed direction, divided by `full` (default 0.8), and is 0 when the part is not
held. A region dissects at half speed while its exposure is below 0.5. In mirror-image anatomy the
habitual pull (towards the patient's right) gives exposure 0: the triangle stays closed.

Two region and structure properties model tissue that does not behave like the textbook:

- **Dense fibrosis** (`region.fibrosis`: `safeTo`, `injures`, `finding`). The planes stop separating at
  `safeTo` of the region. The step that reaches that point stops there and is felt (`dense-fibrosis`).
  Every step beyond is recorded as `dissection-beyond-safe-plane` and tears `injures` (default: the
  region's first hazard), with the consequences of dividing it. Nothing in the region can be freed all
  round below the plane, so a view that needs the region cleared cannot be reached safely. The operator
  sees `finding` once dissection there has begun.
- **A structure crossing a plane** (`structure.crosses`), such as a duct in the gallbladder bed or a
  posterior cystic artery. Completing that region's dissection divides the structure, as `divide` would,
  unless it was divided before. Two clips first make it safe; otherwise it leaks or bleeds.

Each step costs simulated minutes (`minutes` overrides the defaults in `reduce.ts`). The engine
returns `signals`, which are what the operator sees or feels: a clash, bleeding, bile in the field,
the field obscured, the specimen free, imaging ready.

## 4. The safety views

A criterion is evaluated **on the field**, never on what the operator claims:

- `cleared` and `exposure` read the dissection and the retractions.
- `onlyEntering` holds when every structure that truly enters the organ is in view, free all round
  and undivided, and nothing else *appears* to enter it. A common bile duct tented by traction in the
  wrong direction appears to (`appearsAs.when[].appearsToEnter`). An appearance rule tests either a
  region's `exposure` (traction) or how far it is `cleared` (a duct crossing the triangle that only a
  complete dissection shows running to the liver).

`safety-pause` records the operator's claims together with the field's truth. The claims are the
surgeon's judgement; the truth is the evaluator. A pause's view is `achieved` only when every
criterion truly holds.

## 5. Unsafe acts, injuries and complications

An irreversible step (`clip`, `divide`) on a target or critical structure is recorded against the
following checks:

| code | when |
|---|---|
| `irreversible-without-pause` | no safety pause on a gating view |
| `irreversible-without-view` | the last pause's view was not truly achieved |
| `irreversible-on-unidentified` | the operator never named the structure |
| `irreversible-on-misidentified` | the operator's name for it is wrong |
| `blind-in-obscured-field` | done while the field is obscured |
| `continued-after-injury` | a visible injury has not been recognised (also checked at closing) |

The following are also recorded as unsafe:

- `energy-near-hidden-hazard`: energy in a region with exposure below 0.6 while one of its hazards is
  still hidden.
- `excessive-traction`.
- `insufflation-over-max`.
- `dissection-beyond-safe-plane`: dissection carried on past dense fibrosis's safe limit (§3).

Injuries follow from the anatomy:

| what was done | what follows |
|---|---|
| clip on a critical duct | bile duct injury (occlusion, not visible until imaged) |
| division of a critical duct | bile duct injury (visible: bile in the field) |
| clip or division of a critical artery or vein | vascular injury; division also causes major bleeding |
| division of a target duct with fewer than 2 clips | cystic stump leak (bile in the field) |
| division of a target artery with fewer than 2 clips | brisk bleeding: the field is obscured until suctioned; a clip or coagulation on the stump controls it |
| energy with exposure below 0.4 next to a hidden critical structure | thermal injury (not visible) |
| excessive traction on the specimen, or energy in its bed with poor exposure | perforation: bile, and stones if `stones` |
| coagulation of a critical structure | thermal injury |
| dissection beyond dense fibrosis's safe plane | the structure it tears, as if divided (a common bile duct: bile duct injury, bile in the field) |
| completing a region a structure crosses | that structure divided (target: leak or bleeding unless clipped twice) |

Major bleeding cannot be controlled laparoscopically in this model: it needs `bailout`.

`recognise` names an injury aloud: it marks matching injuries recognised, and counts a false alarm
otherwise. `image` (cholangiography through a free, clipped, undivided cystic duct, or ultrasound)
makes duct injuries visible and shows the ducts by name.

Bail-outs work as follows:

- `call-help` changes nothing in the field.
- `subtotal-*` ends the dissection.
- `convert-open` ends the laparoscopy and controls the bleeding.
- `abandon-refer` ends the laparoscopy.

## 6. Conditions

The `procedure` leaf of the condition DSL (schema `ProcedurePredicateSchema`) reads the field for
rubric items, objectives, phases, scenario events and safety gates:

```
{ "view": id } · { "criterion": id } · { "documented": id, "valid"?: bool } ·
{ "injury": kind|"any", "recognised"?: bool } · { "unsafe": code|"any" } ·
{ "clipped": id, "minCount"? } · { "divided": id } · { "isolated": id } ·
{ "identified": id, "as"?: id } · { "specimen": state } · { "bailout": strategy|"any" } ·
{ "imaged": "ioc"|"lap-us" } · { "plan": id } · { "insufflated": bool, "pressure"?: range } ·
{ "bleeding": severity|"any", "controlled"?: bool } · { "spillage": "bile"|"stones", "cleared"?: bool } ·
{ "counter": "steps"|"exchanges"|"clashes"|"crossings", gte?, lte? } · { "inspected": bool } · { "closed": bool } ·
{ "dissectedExposed": region, "atLeast": 0–1 } · { "variant": id|"reference" }
```

`variant` reads the session's anatomical variant (§9). It is hidden truth, like the anatomy. It lets
rubric items be `scoredWhen` a variant is in force and lets gates depend on it. Structure ids in
conditions may name a structure of any variant; in the others the condition is simply false.

`view` and `criterion` read the field **now**, so they are false once the laparoscopy has ended. To score
what was achieved, use `documented` (the safety pause's record) or `dissectedExposed` (the best exposure
any dissection step in the region had).

Everything except `identified` reads what really happened. `identified` reads the operator's claim:
without `as` it means named correctly; with `as` it means named as that. The learner's `flag` action
cannot reach the field, so a condition cannot be faked.

## 7. What the operator and agents see

`observeField(def, state)` is the operator's view. Ducts and vessels appear as **handles** (`T1`,
`T2`…), numbered in the order they came into view. Each has what it looks like (`appearsAs`), whether
it is free all round, its clips, whether it is divided, what the operator named it, and what
imaging showed. The view also has organs by name, each region's dissection and exposure as coarse
bins, the retractions and the findings.

It never contains a safety-view verdict, an injury the field does not show, an unsafe-act record, a
score or the session's variant. `names` lists the ids a duct or vessel can be given with `identify`.
The list is the same whatever the variant: the ducts and vessels of the base definition and of every
variant. `identify` accepts any of them, so naming never reveals the anatomy. A region with dense
fibrosis carries its `finding` once dissection there has begun.

The agent tools are `observe_field` and `operate` (`packages/agent/src/tools/procedure.ts`). They
give agents this view and nothing else. Clip, divide, coagulate and bail-out are high-risk tool
calls: the approval gate asks in supervised modes. The web's **laparoscopic surgery window** (`packages/web/src/ui/panels/surgery.ts`, view
`laparoscopy/index.ts`) is offered from the HUD while the session is in one of the procedure's phases.
In in-world mode it also opens from equipment with the `surgery` capability (the operating table). Its
picture and controls come from `observeField` (and `portReport` while choosing a plan), and every
control submits `operate` through the app's action path.

It draws the procedure's shapes, and the case's `anatomy` model asset for the organ surfaces when the
case lists one. The debrief adds an *Operation* section once the case is finished, and for a case with
an operation it holds the score back until then. A front-end may draw the anatomy from the model,
but it must not label a duct or vessel by name unless the view's `imaging` does. An assessment or
instructor mode may show more, as long as it is never what a benchmark agent receives.

## 8. Assessment and safety gates

`assess` adds `procedure` (unsafe acts, injuries with whether each was recognised, safety pauses
with claims against the field, and counters) for the debrief. A case's `safetyGates` are conditions
no score compensates:

- `safety-critical` gates set the verdict and cap the reported percentage (default 40). The uncapped
  figure stays in `score.uncapped`.
- `complication` gates set the verdict `complication`.

The verdict is `safety-critical`, `complication` or `clear`. A rubric item for managing a
complication should be `scoredWhen` the complication occurred. When it did not, the item counts
neither as earned nor as possible, and the percentage renormalises over the rest.

## 9. Variants

A procedure may list **anatomical variants** (`variants`). Each variant sets out what the patient's
anatomy really is in a session started with `{ "type": "start", "variant": id }`. The base definition
is the variant `reference`, and is used when none is given. `SessionState.variant` records the
choice. `procedureFor(case, state)` resolves the definition every reader uses: the reducer,
conditions, the operator's view and the surgery window. `resolveProcedure(def, id)` lays the variant
over the base:

- `anatomy` replaces structures with the same id, or adds new ones;
- `remove` drops structures (never the specimen);
- `regions` patch base regions by id (a variant cannot add a region, so the operator's list of regions
  stays the same);
- `stones` overrides.

Each variant has a `name`, a `summary` for the debrief and the facilitator, `provenance` and
`references`. A variant is hidden state. It never appears in the operator's view, its structures show
only as handles, and the naming vocabulary is shared (§7). `checkCaseIntegrity` checks each variant's
own references, then checks the resolved definition like the base.

Variants are how a case teaches or benchmarks anatomy the source does not report. They are
counterfactual unless their provenance says otherwise. The base definition stays what the source
documents; a variant never replaces it silently. The operative benchmark (`clinicalcraft bench
operative`, `docs/BENCHMARK_OPERATIVE.md`) draws variants per run, so an agent must work the anatomy
out from the field.

## 10. Fidelity limits

- The anatomy is whatever the case supplies. Its provenance tags (`reference`, `authored`,
  `imaging`…) must say what it is.
- Tissue mechanics, bleeding rates and thermal spread are rule-based states, not calibrated models.
- The score is a teaching-script measure. It is not a validated skills score, and not GOALS.
- Content built on this model must say all of this in its case card and README.
