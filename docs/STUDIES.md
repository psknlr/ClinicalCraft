# New investigations · 新开检查

A published case records the investigations its patient had. A learner in the simulated hospital may want one the
source never reported — a 12-lead ECG before induction, a blood count, a chest radiograph. This page is the contract
for **new investigations**: studies the simulated hospital performs during the encounter, from the case's own **test
profiles**, kept apart from the published record.

Code: `packages/core/src/schema/study.ts`, `packages/core/src/engine/study.ts` (pure: orders, acquisitions and their
observations, releases, reviews, status), `packages/agent/src/session/studies.ts` (the ordering service, fulfilment,
the reporting agent and its validator, the review), `packages/agent/src/tools/studies.ts` (`order_study`,
`retrieve_report`, `read_study`). If code and this page disagree, fix one of them in the same change.

Learner-facing words follow [GLOSSARY.md](GLOSSARY.md): **simulated investigation** (模拟检查), **published source
record** (原始病例记录), **historical material unavailable** (原始病例中无此资料), **order a new investigation**
(开具新检查), **retrieve an existing report** (调阅已有报告).

## 1. Three kinds of evidence

The chart keeps four things apart and labels each one:

| label | what it is | where it comes from |
|---|---|---|
| **Published source record** · 原始病例记录 | what the published case reported | `investigations[]` (`order_test`, `read_result`; `performedAt: "records"` is read from the notes) |
| **Simulated investigation** · 模拟检查 | a study done in this encounter | a test profile (`case.studies[]`), acquired and reported by the simulated hospital |
| **Historical material unavailable** · 原始病例中无此资料 | the source has no such record | a profile's `historical` investigation that the case marks unavailable, or none at all |
| **Record not yet created** · 该记录尚未产生 | a document written later in the encounter (the operation record, the histology, the follow-up) | `recordAvailability` `not-yet`: its phase not reached, or its `availability.when` not holding — never another phase's text |

A simulated value is never shown as the patient's record, and a request for the record never creates a study.

## 2. Two commands

- **Retrieve an existing report** (`retrieve_report {query}`): looks up the published case. It answers with the
  record (labelled *published source record*), or says the source has none (*historical material unavailable*:
  Case 126's "No ECG is recorded in the published case"). It never orders anything.
- **Order a new investigation** (`order_study {code|query, indication?, priority?, lead_placement?, reviewer?,
  request_key?}`): resolves the request (code, name or alias, either language) to one of the case's profiles and
  records the order. The same `request_key` again is the same order (a retry: "already ordered", nothing new); a
  deliberate repeat (a new key) is a new order and a new accession.
- `read_study {code|query}`: the order's status, or the released report, labelled *simulated investigation*.

The three are session tools: the learner's chart and the built-in agents (the clinician agent of a demonstration) use
them. MCP and the world bridge do not serve them yet.

An **operative study is never ordered from the chart**: a request for a cholangiogram is refused with how it is done
(`operate {op: "image", modality: "ioc"}` at the table, once the anatomy allows it). A request alone produces no image
and nothing to report — a generic report request never bypasses an operative prerequisite.

## 3. Test profiles (`case.studies[]`)

```jsonc
{
  "code": "ecg-12lead",
  "name": { "en": "12-lead ECG (new, simulated)", "zh-CN": "十二导联心电图（新开，模拟）" },
  "aliases": { "en": ["ECG", "EKG"], "zh-CN": ["心电图"] },
  "acquisition": "bedside-device",       // bedside-device | sample | department
  "requires": ["ecg-12lead"],             // facility capabilities: the device, the analyser, the X-ray room
  "turnaroundMinutes": 10,                // simulated minutes from acquisition to the report
  "reviewer": "anaesthetist",             // who reviews the released report (staff id or role; default: the requester)
  "historical": "ecg-record",             // the case's own record of this kind, looked up, never invented
  "version": "1",                         // frozen with the case for a benchmark
  "model": { "kind": "ecg", "rhythm": {…}, "prMs": [160, 196], "qrsMs": [84, 104], "qtcMs": [412, 444], "dextrocardia": true, "findings": [] }
}
```

The **model** owns what the test can reveal:

- `ecg`: the rate from the patient's state at acquisition; seeded PR, QRS and QTc within the profile's ranges; the
  lead configuration (`standard` or `mirror`) is part of the acquisition — with dextrocardia and standard leads the
  tracing shows it (lead I inverted, reversed R-wave progression); mirrored, it reads as a normally placed heart;
  findings whose condition holds.
- `lab`: analytes with unit, reference interval, a teaching seed value and its seeded spread, and `effects` — changes
  the patient's state makes at the moment of collection (a bleed lowers haemoglobin; a bile duct injury raises
  bilirubin). The collection time is the acquisition's.
- `imaging`: the technique and findings whose condition holds; `side` is the patient's own.

Values are simulated teaching values (the profile says so), never the patient's. `cases validate` checks that every
profile's `historical` names an investigation of the case and every capability is a known one.

## 4. The record (`SessionState.studies`)

One `study` action (`ClinicalAction {type: "study", study: StudyOp}`) changes it; `study.recorded {op, code, id}` is
its event. The engine is pure and deterministic (`applyStudy`):

| op | records | notes |
|---|---|---|
| `order` | `{id: ord-n, code, key, indication?, priority, requester, reviewer?, configuration?, at, seq}` | idempotent by `key`: the same key returns the existing order, unchanged |
| `wait` | the order's `waiting {reason, at}`, stage `blocked` | recoverable: "the Mobile ECG machine is in use by …", "transfer required …", "no device in this hospital provides …", "Nurse Aisyah could not reach the patient: …" |
| `assign` | the order's `assignee` (who acquires it), stage `assigned` | once per person; not after the acquisition |
| `progress` | stage `en-route`, `at-patient` or `acquisition-started` | `at-patient` only after the world confirmed the collector there; `acquisition-started` only from `at-patient` |
| `acquire` | an accession `{id: <code>-n, order, collector, at, revision, configuration?, quality, observations, dueAt, profileVersion}` | refused unless the order is `at-patient` (or `acquisition-started`) and the collector is its assignee — no specimen, no tracing without someone at the patient. **The acquisition snapshot**: observations computed once, from the state now and a seed of case, profile version and accession — a sample drawn before a bleed keeps its values whenever it is reported, and a replay reproduces every number |
| `release` | a report `{accession, revision, findings, impression, limitations?, generator, at, seq}` | only from an acquisition, only once due; the text is recorded, so a reload, a language change or a retry never changes it; an amendment is a new revision of the same accession |
| `review` | `{accession, by, at, seq}` | only a released report |

Every order keeps its **stages** (`StudyOrder.stage` and `stages[]`, each with `at`, `seq` and a block's `reason`):
ordered → assigned → en route → at the patient → acquisition started → acquired → reported → reviewed, or blocked
(and back on the way when it clears). They are the order's own event stream: a reload restores them, and the chart
shows where an order is ("Nurse Aisyah is on the way", "blocked — …").

`studyStatus(state, code)` is the latest of ordered → waiting → acquired → released → reviewed; the condition leaf
`{study: code, status?}` reads it (default `ordered`) for objectives, rubric items and events.

A learner orders; the hospital does the rest. A learner's `study` action other than `order` is refused
(`permission_denied`, "acquired, reported and reviewed by the hospital, not entered by hand").

## 5. Fulfilment (`SessionStudies`)

After every learner act and every demonstration step (like the care team), the service works the open orders:

1. **Resolve and check capability.** The profile's `requires` against the facility's devices; none: `wait` "no
   device in this hospital provides …".
2. **Staff and device** (in-world mode, with bodies):
   - `bedside-device`: a device in service (all out of service: `wait` "the Mobile ECG machine is out of service")
     and free (not reserved or held by someone else; otherwise `wait` "in use by <holder>").
     If none is at the patient, the case team's circulating nurse fetches it — a delegation `fetch_equipment` with
     their own body: locate, reserve, walk, bring; the world keeps the device's custody, so everyone sees who holds
     it and where it is. A failed fetch waits with its reason and is retried after the next act.
   - `sample`: the nurse walks to the patient and takes it.
   - `department`: acquired only with the patient in the device's room; otherwise `wait` "transfer required".
   In clinical (text) mode the hospital acquires at once.
3. **At the patient, then the acquisition.** The order is assigned to the collector (`assign`); the collector walks
   to the patient with their own body (`progress en-route`); only when the world confirms them at the patient —
   within reach and in sight (the examination rule), the study's device at the bedside, their role one that may
   take it (nurse, paramedic, doctor) — is `progress at-patient` recorded and the study acquired (`study acquire`:
   the engine takes the snapshot). A walk that fails (a locked door, no route) blocks the order with the reason —
   no specimen, no result; a blocked order tries again quietly after each act and resumes once it clears, the same
   order, one accession.
4. **Report**, once due: the **reporting agent** writes the narrative; it never owns the values. The pipeline is
   clinical engine → structured observations → deterministic structured report (`templateReport`) → a model's
   narrative (`SessionStudies.writer`, optional) → **semantic validation** (`validateReport`) → release:
   - a writer returns `bindings` — the phrase stating each observation, in each language — and `supportedBy`, the
     observations the impression rests on;
   - every number in a bound phrase must be that observation's own value or interval (a heart rate of 78 and a PR
     interval of 169 written as 169 and 78 are refused, though both numbers occur), every number of the findings
     must lie in a bound phrase, every number of the impression must belong to an observation it rests on, and each
     of those must be a real observation; a side named must be a side an observation shows; no finding the
     observations do not make;
   - a writer that fails, times out (`writerTimeoutMs`) or does not validate is replaced by the template — never an
     invented report. The template passes the same check (its phrases are bound).
   The engine refuses a release whose `supportedBy` names an observation the acquisition does not have, and records
   the report's **provenance**, machine-readable: `{kind: "simulated-investigation", source: "case-teaching-profile",
   profile, profileVersion, observations, generator}`; the report's text says "Generated within the training
   environment; not present in the original source report." A front-end plugs a writer in with the session options
   `reportWriter` and `reportWriterTimeoutMs`.
5. **Review**: the order's reviewer (Case 126: the anaesthetist) reviews the report in their own name
   (`study review`) and says so in their voice ("I've reviewed the simulated 12-lead ECG: …").

The responsible clinician stays the requester throughout; the service never orders on its own.

## 6. What the learner sees

- `case_status` lists "New investigations (simulated)" with each study's status; `read_study` shows the report:

  ```
  Simulated investigation · 12-lead ECG (new, simulated) · ecg-12lead-1
  Acquired 08:12 by Nurse Aisyah (circulating), leads mirrored for dextrocardia · reported 08:22 (template)
  Findings: …
  Impression: …
  Limitations: Simulated from the case's teaching profile, not the patient's record; values are labelled simulated.
  Dr Tanaka (anaesthesia) reviewed the 12-lead ECG …
  ```
- Notifications: an order that waits, with its reason (once per reason), and a released report; the reviewer says
  the review aloud.
- The record survives a save and a reload (`snapshot()`/`resume`: the actions replay the same orders, accessions and
  reports), and a change of language shows the same values in the other language.

## 7. Benchmarks

A benchmark freezes the case version and each profile's `version`. Runs that use new investigations are reported
apart from source-only runs: a score from an expanded encounter is never compared with one from the published record
alone. The export (`AssessmentReport`) carries `caseVersion`, `engine` (`ENGINE_VERSION`) and `finished`.
