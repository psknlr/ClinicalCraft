# ClinicalCraft V5 — Architecture & Contracts

> Status: authoritative contract for all packages. If code and this document
> disagree, fix one of them in the same change.

ClinicalCraft V5 turns the single-file *Virtual Patient V4* voxel clinic into an
**agent framework**: a deterministic clinical simulation core, LLM-driven
virtual patients and staff grounded in case data, an agent runtime whose design
borrows from agentic coding CLIs (Claude Code, Codex CLI, Grok CLI, ZCode), and
several front-ends (3D voxel web world, terminal REPL, headless exec, HTTP
server, MCP server) that all speak one protocol.

```
                        ┌─────────────────────────────────────────────┐
  content (data)        │  @clinicalcraft/content                     │
  cases / facilities /  │  cases/*/case.json  facilities/*.json       │
  equipment catalogs    │  catalogs/*.json    (zod-validated)          │
                        └──────────────┬──────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────────────────────┐
  simulation            │  @clinicalcraft/core   (isomorphic, pure)    │
                        │  schemas · reduce() · conditions · matcher   │
                        │  physiology · assessment · validation        │
                        └──────────────┬──────────────────────────────┘
                                       │
                        ┌──────────────▼──────────────────────────────┐
  agents                │  @clinicalcraft/agent                        │
                        │  Op ⇄ Event protocol (SQ/EQ) · ClinicalSession│
                        │  providers · agent loop · tools · approvals   │
                        │  hooks · slash commands · NPC/clinician agents│
                        │  settings · memory · transcripts (node/)      │
                        └───┬─────────┬──────────┬──────────┬─────────┘
                            │         │          │          │
              ┌─────────────▼─┐ ┌─────▼────┐ ┌───▼─────┐ ┌──▼──────────┐
  front-ends  │ web (Vite +   │ │ cli REPL │ │ server  │ │ mcp (stdio) │
              │ three.js)     │ │ + exec   │ │ HTTP+SSE│ │ JSON-RPC    │
              └───────────────┘ └──────────┘ └─────────┘ └─────────────┘
```

## 1. Monorepo layout

```
package.json                npm workspaces, scripts
tsconfig.base.json          NodeNext ESM, strict
vitest.config.ts            one test runner for every package (src aliases)
docs/                       ARCHITECTURE (this), PROTOCOL (runtime, providers, front-ends),
                            CASE_AUTHORING, FACILITIES, ASSETS, DESIGN_PRINCIPLES
scripts/                    gen-json-schemas.ts (`npm run schemas`), preview/render.mjs (content visual QA)
packages/core               @clinicalcraft/core     zod schemas + pure engine
packages/world              @clinicalcraft/world    embodied world model (pure, headless): collision model, navigation,
                                                    visibility, semantic registry; `createWorldRuntime` — versioned
                                                    physical state, device behaviours, spatial policy, perception,
                                                    action bus, traces (docs/EMBODIED.md)
packages/content            @clinicalcraft/content  built-in cases, facilities, catalogs, JSON Schemas (data only;
                                                    loaded by `loadContent` in @clinicalcraft/agent/node)
packages/agent              @clinicalcraft/agent    runtime ("." isomorphic, "./node" fs/child_process)
packages/cli                @clinicalcraft/cli      `clinicalcraft` binary
packages/server             @clinicalcraft/server   HTTP server (web host + LLM proxy + content API)
packages/mcp                @clinicalcraft/mcp      MCP stdio server
packages/web                @clinicalcraft/web      3D voxel client (Vite, three@0.180.0)
.clinicalcraft/             example project config: settings.json, commands/, agents/, hooks/
CLINICALCRAFT.md            project memory/instructions injected into agents (like CLAUDE.md / AGENTS.md / GROK.md)
```

Conventions:

* TypeScript 5.9, ESM only, `"module": "NodeNext"` → **relative imports end in `.js`**.
* Node ≥ 22 (global `fetch`, `ReadableStream`, `DecompressionStream`).
* No `Date.now()`/`Math.random()` inside `@clinicalcraft/core` — determinism. Use the seeded PRNG in `core/src/engine/random.ts`.
* Every package exports from `src/index.ts`; tests live next to code as `*.test.ts` (vitest).
* Runtime dependencies are deliberately few: `zod` (core, agent), `@anthropic-ai/sdk` (agent), `three` (web). Everything else is node built-ins.
* Workspace packages are consumed from source in tests/dev and from `dist/` when built — see "Source vs dist" below.

**Source vs dist.** Every workspace package but `web` (`core`, `world`, `content`, `agent` incl.
`./node`, `server`, `mcp`, `cli`) maps each code entry point in its `package.json`
`exports` to three conditions, in this order: `"source"` → `./src/….ts`,
`"types"` → `./dist/….d.ts`, `"default"` → `./dist/….js`. Who picks what:

| runner | how `@clinicalcraft/*` resolves | needs a build? |
|---|---|---|
| `npm run cc -- …` (dev CLI), `npm run validate:content` | `tsx --conditions=source packages/cli/src/bin.ts`: Node's resolver honours the custom `source` condition, so every workspace import, transitively, loads the TypeScript sources (CI validates and verifies content this way before building) | no |
| `npx vitest` / `npm test` | not the condition: root `vitest.config.ts` `resolve.alias` maps each package (and `@clinicalcraft/agent/node`) to its `src/index.ts` | no |
| web dev/build (Vite), web `tsc --noEmit` | Vite `resolve.alias` in `packages/web/vite.config.ts` (mirroring vitest's), `paths` in `packages/web/tsconfig.json` | no |
| `tsc -b` (`npm run typecheck`, `build:lib`) | NodeNext resolution with the `types` condition → the referenced projects' `dist/*.d.ts` (project references build them first); emits `dist/` | — (it is the build) |
| `node packages/cli/dist/bin.js`, installed packages, `npx tsx <script>` **without** `--conditions=source` | `default` → `dist/*.js` — only as fresh as the last `npm run build:lib` (or `typecheck`, which emits too) | yes |

So a script that imports workspace packages by name must run after a build
or with `tsx --conditions=source`. `scripts/gen-json-schemas.ts` imports the
schema sources by relative path and needs neither — which is why the agent
settings schema (`settings/schema.ts`) imports nothing but zod.

## 2. Content model (`@clinicalcraft/core/src/schema/*`)

The schemas are the single source of truth (zod → TS types via `z.infer`,
JSON Schema exported to `packages/content/schemas/` for editors).

* **Case** — `schema/case.ts` (`clinicalcraft/case@1`): patient & persona, phases,
  clock, history items (with disclosure policy), exam findings, investigations
  (results per phase, aliases, turnaround, risk, value, `alternativeTo`),
  order-matching rules, interventions (vital effects, flags,
  indicated/contraindicated conditions), physiology (baseline, trends,
  scenario events, alarm limits), objectives (with waypoints), decisions,
  rubric, NPC briefs, debrief, unknowns, assets, reference `solution`.
  Optional authoring fields (all defaulted, so older case files stay valid):
  * `history[].excludeKeywords`, `exam[].excludeKeywords`,
    `interventions[].excludeKeywords` — `LocalizedList`, default `[]`;
    phrases that argue *against* the item in the offline matcher (§3.3).
    Every locale's phrases apply to every utterance, so `parseCase` does not
    warn about a locale missing from them.
  * `physiology.revealedBy` — `{vital: investigationId[]}`, default `{}`;
    a vital the monitor does not measure (glucose) is shown, charted and
    alarmed only once one of these investigations has been read (§3.2);
    unknown ids are integrity errors.
  * `physiology.monitor` — `{attachedWhen: Condition, spotChecks?:
    VitalKey[], measures?: VitalKey[], ecgWhen?: Condition}` (strict),
    optional: a bedside monitor the learner must
    attach (a monitoring intervention, arrival in a monitored area). Until
    `attachedWhen` first holds (latched as `SessionState.monitorAttachedAt`)
    the monitored vitals and the rhythm are not shown, charted, trended or
    alarmed, except the `spotChecks`, shown as static manual readings of the
    baseline (§3.2). Once attached it shows the monitored vitals it
    `measures` (default all; e.g. no temperature from a monitor nobody took
    one with), and the rhythm/ECG only while `ecgWhen` (when set — ECG
    leads that come separately, e.g. a pulse oximeter and cuff first, the
    team's monitor-defibrillator later; evaluated on the state, not
    latched) also holds. Absent: monitored from minute 0 (unchanged behaviour).
    `checkCaseIntegrity` checks `attachedWhen` and `ecgWhen` like any
    condition (and warns when `attachedWhen` can never hold); a spot check
    must be a monitored vital the baseline models, a measured vital a
    monitored one (errors), each listed once, with sbp/dbp as a pair
    (warnings). `verifyCase` warns when the reference solution never
    attaches the monitor, or never its ECG leads.
  * `investigations[].alternativeTo` — investigation ids, default `[]`; a
    mutual "can stand in for" link used by `assess()` (§3.4).
  * `history[].supersedes` — history ids, optional; **phase twins**: in a
    phase where this item is available it answers for the items it
    supersedes (selection routes to it, they cannot be asked there) and
    asking it credits them for `asked` conditions and the history
    assessment without revealing them (§3.1, §3.3, §3.4;
    docs/CASE_AUTHORING.md §3). Unknown ids, self-references and cycles
    are integrity errors.
  * `orderMatching.warnings[].unless` — `Condition`, optional; the warning
    no longer applies (is not returned by `orderWarnings`) while it holds on
    the session as the order is placed.
  * `history[].speaker` — `"patient" | "companion"`, optional; who speaks
    the answer when the case has a history-answering companion (default
    the companion; `"patient"` for the patient's own words, e.g. a child
    saying how he feels — docs/CASE_AUTHORING.md §2).
  * `physiology.events[].speaker` — `"nurse" | "monitor" | "patient" |
    "companion" | "narrator"`, optional; who voices the scenario message
    (default inferred from the text, PROTOCOL §4 "Turn bracketing").
    `"companion"` on a case without `persona.companion` is an integrity
    error.
  * `investigations[].results.*.values[].value` — a number or a
    `LocalizedText`, and `refText` — `LocalizedText`; a plain string stays
    valid (the same text in every locale). A text value that differs by
    language is written per locale, never "阴性 / negative"
    (docs/CASE_AUTHORING.md §5).
  * `solution` — `ClinicalAction[]` (validated with `ClinicalActionSchema`
    from `schema/session.ts`, so a malformed step fails `parseCase` with a
    path such as `solution.7.itemId`); unknown ids inside steps are reported
    per step by `checkCaseIntegrity`.
* **Condition DSL** — `schema/common.ts`: `all/any/not/always`, `asked`,
  `examined`, `ordered`, `read`, `resultReady`, `decided`, `attempted`,
  `decidedFirstTry`, `intervened`, `phase`, `flag`, `objective`, `vital`,
  `elapsed`, `hints`. `asked: id` also holds when a history item that
  supersedes `id` (phase twins, transitively) was asked. `decidedFirstTry: decisionId` is true iff the first
  recorded (i.e. accepted) attempt at that decision was correct — once the
  first answer is wrong it stays false, so it belongs in rubric items rather
  than objectives or `requires`.
* **Facility** — `schema/facility.ts` (`clinicalcraft/facility@1`): bounds,
  spawn, environment, terrain (paths, ponds, trees, flowers, horizon,
  clouds), buildings (walls with V4 course materials, openings, roof &
  skylights), rooms (kind, partitions, signs, lights), placements of
  equipment, patient slots (accepted case settings, bed, monitor), staff,
  signs, build zone; optional `levels`, `connectors`, `access` zones and
  per-entity `level` (FACILITIES.md "Embodiment fields").
* **Equipment catalog** — `schema/facility.ts` (`clinicalcraft/equipment-catalog@1`):
  materials (procedural pixel textures) and equipment types (voxel parts,
  footprint, capabilities, interaction kind, live screen, light; optional
  `portable`, `reach`, `interactionPoints`, `behavior`, `model`).
* **Session** — `schema/session.ts`: `ClinicalAction` (zod, discriminated by
  `type`), `SessionState`, `DomainEvent`, `ReduceResult`.

### 2.1 Grounding rules (non-negotiable, inherited from V4)

1. Only case data is fact. Agents may paraphrase; they may not add numbers,
   findings, dates, diagnoses or history that the case does not contain.
2. Missing data stays missing: `disclosure: "unknown"` history items,
   `available: false` results, case-level `unknowns`, `examNotRecorded`.
3. Results keep their original date/phase; switching phase is "historical
   review", not live progression, unless the case clock is `simulated`.
4. Published-case assets (figures, PDFs) are `localOnly` — never committed;
   installed by `clinicalcraft import-v4` (see docs/ASSETS.md).
5. Every completion/score screen says it is a teaching-script measure, not a
   validated competency score.

## 3. Engine API (`@clinicalcraft/core`) — exact exports

```ts
// validation & loading
parseCase(json: unknown): { ok: true; value: CaseDefinition; warnings: Issue[] } | { ok: false; issues: Issue[] }
parseFacility(json: unknown): same shape with FacilityDefinition
parseCatalog(json: unknown): same shape with EquipmentCatalog
interface Issue { path: string; message: string; severity: "error" | "warning" }   // path dot-joined: "objectives.0.completeWhen.all.1.asked" ("" = root)
checkCaseIntegrity(c: CaseDefinition): Issue[]          // referential integrity of every id in conditions, waypoints, results, figures, alternativeTo, solution steps…;
                                                        // warnings for keyword wildcards (an English keyword of ≥ 3 words that tokenizes to one token, §3.3)
verifyCase(c: CaseDefinition): { ok: boolean; issues: Issue[]; finalState: SessionState; assessment: AssessmentReport }
                                                        // replays c.solution; ok iff all objectives done, all decisions decided, no rejections
checkFacility(f: FacilityDefinition, catalogs: EquipmentCatalog[]): Issue[]   // unknown equipment/material ids, overlapping solids, slots outside rooms,
                                                        // levels / connectors / access zones (FACILITIES.md "Embodiment fields")…

// session lifecycle (pure)
createSession(c: CaseDefinition): SessionState          // started=false, phase=initialPhase ?? phases[0].id, clock 0
reduce(c: CaseDefinition, s: SessionState, a: ClinicalAction): ReduceResult
replay(c: CaseDefinition, actions: ClinicalAction[]): { state: SessionState; events: DomainEvent[]; rejections: … }

// queries
evaluate(c: CaseDefinition, s: SessionState, cond: Condition): boolean
progress(c, s): { objectives: { id: string; done: boolean; doneAt?: number; current: boolean }[]; currentIndex: number; done: number; total: number; complete: boolean }
currentWaypoint(c, s): string | null                    // first waypoint of current objective whose `unless` is false
availableDecisions(c, s): { decision: Decision; unlocked: boolean; decided: boolean }[]
presentedOptions(c, decision): Option[]                 // options in presentation order: a deterministic shuffle seeded by case + decision id (every front-end; ids unchanged)
resultFor(c, investigationId, phase): Result | null     // null = no record in that phase
resultKey(investigationId, phase): string               // `${id}@${phase}`
orderStatus(c, s): { order: OrderRecord; ready: boolean; read: boolean }[]
vitalsAt(c, s, minute?: number): VitalsSnapshot         // pure function of (case, state, minute); only `shownVitals` (§3.2)
shownVitals(c, s, minute?): Set<VitalKey>; alarmingVitals(c, s, minute?): Set<VitalKey>   // what the bedside shows / may alarm on at that minute (§3.2)
monitorAttached(c, s, minute?): boolean; monitorAttachedAt(c, s): number | null   // the bedside monitor (`physiology.monitor`, §3.2); 0 = from the start
ecgAttached(c, s, minute?): boolean                     // attached and `monitor.ecgWhen` (if any) holds: the rhythm/ECG are shown
spotCheckVitals(c): VitalKey[]; measuredVitals(c): VitalKey[]   // the spot checks shown by hand before the monitor / what it measures once attached
MONITORED_VITALS, OBSERVED_VITALS                       // hr sbp dbp rr spo2 temp etco2 / gcs pain
type DisplayedVitals = Partial<Vitals> & { map?: number } // only the shown vitals; map with a shown BP; rhythm/ecg need an attached monitor with its ECG leads
interface VitalsSnapshot { minute: number; vitals: DisplayedVitals; alarms: { vital: VitalKey; level: "warning" | "critical"; value: number }[]; trend: Partial<Record<VitalKey, -1 | 0 | 1>>;
                           baselineOnly?: boolean;       // true only for cases without `physiology` (placeholder values; no alarms/trend)
                           monitorAttached?: boolean;    // cases with `physiology.monitor` only: false until it is attached
                           ecgAttached?: boolean;        // cases with `monitor.ecgWhen` only: false until the rhythm/ECG are shown
                           spotChecks?: VitalKey[];      // while not attached: the vitals in `vitals` that are static manual (triage) readings
                           unmeasurable?: VitalKey[] }   // only during a cardiac-arrest rhythm on an attached monitor (§3.2): vitals it cannot read (value 0)

// matching (offline NLU used by UI, CLI, scripted agents and as RAG hints for LLM agents)
normalizeQuery(text: string): string                    // lower-case, strip whitespace, full-width → ASCII punctuation (V4 rules)
matchOrders(c, query, locale): string[]                 // aliases + names of every locale → orderMatching.rules → exact (V4 semantics, generalised)
orderWarnings(c, query, investigationId, locale, state?): string[]  // orderMatching.warnings whose ifMatches matches the normalised query
                                                        // and (with `state`, the session before the order) whose `unless` does not hold
matchHistory(c, utterance, locale, options?: MatchOptions): { id: string; score: number }[]   // sorted desc, score 0..1; with `phase`, phase twins applied (§3.3)
matchExam(c, utterance, locale, options?: MatchOptions): { id: string; score: number }[]
matchInterventions(c, utterance, locale): { id: string; score: number }[]
matchSpecificity(c, kind: "history"|"exam"|"interventions", utterance, locale, id): number   // coverage (chars) of the item's best phrase; tie-break only (§3.3)
interface MatchOptions { phase?: string; includeUnknown?: boolean }   // §3.3; omitted = all phases, unknown items included

// history phase twins (`history[].supersedes`, twins.ts)
historyTwin(c, id, phase): string | null                // the item answering for `id` in `phase`: itself, its (transitive) superseding twin, or null
historyAvailable(c, id, phase): boolean                 // listed for `phase` and not superseded there (askable)
supersededIn(c, id, phase): string | null               // the item available in `phase` that supersedes `id` directly or transitively — also through
                                                        // an intermediate twin not available there (C ⊃ B ⊃ A) —, the deepest such item, declaration order
supersededItems(c, id): string[]; hasHistoryTwins(c): boolean
historyCredited(c, s, id): boolean                      // asked, or an item superseding it (transitively) was asked — what `asked` conditions test
creditedHistory(c, s): string[]                         // asked ids, then ids credited through twins (assessment)
MATCH_THRESHOLD = 0.34; EXCLUDE_KEYWORD_FACTOR = 0.2
compactText, tokenize, canonicalToken, foldSpelling, tokensMatch, phraseScore, phraseCoverage, longestCommonSubstring,
ENGLISH_STOP_WORDS, ENGLISH_LEMMAS                      // text primitives behind the scored matchers (§3.3)

// assessment
assess(c, s): AssessmentReport
interface AssessmentReport {
  caseId: string; completed: boolean; minutes: number; hints: number;
  objectives: { id: string; done: boolean; at?: number }[];
  history: { asked: number; required: number; requiredAsked: number; missingRequired: string[] };
  exam: { performed: number; required: number; requiredPerformed: number; missingRequired: string[] };
  investigations: { ordered: number; essentialMissing: string[]; lowValue: string[]; harmful: string[]; unread: string[] };   // unread = result keys, §3.4
  decisions: { id: string; firstTryCorrect: boolean; attempts: number; decided: boolean }[];
  safety: { contraindicated: { interventionId: string; at: number }[]; criticalAlarms: number };
  rubric: { id: string; domain: string; weight: number; met: boolean | null }[];   // null = needs examiner agent
  score: { earned: number; possible: number; percent: number };                    // deterministic rubric only
}

// facility helpers
mergeCatalogs(catalogs: EquipmentCatalog[]): { materials: Map<string, MaterialDef>; equipment: Map<string, EquipmentType> }
placementCapabilities(f, catalogs, placementId): string[]
facilityCapabilities(f, catalogs): Set<string>          // every placement's capabilities ∪ PERSONAL_KIT
caseCapabilityGaps(c, f, catalogs): CapabilityGap[]     // items an objective/decision/solution uses that f cannot provide; `blocking` = an objective or decision has no alternative (FACILITIES.md)
regionAt(f, x, z, locale): string                       // smallest room containing the point → building name → outdoorRegion
assignPatientSlot(f, c): PatientSlot | null             // first slot accepting c.setting
resolveWaypoint(f, catalogs, target, options?: { from?: { x: number; z: number }; locale?: string; slotId?: string; preferPatientSlot?: boolean }): { x: number; z: number; label: string } | null
                                                        // "patient" | "board" | "atlas" | capability | room id | room kind | placement id (order in §3.4)

// utilities
createRng(seed: number): () => number                   // V4 LCG: k = k * 1664525 + 1013904223 >>> 0
hashString(text): number; seedFrom(...parts): number    // deterministic seeds (e.g. noise per case/minute/vital)
t, tList, normalizeLocale, …                            // i18n.ts
CAPABILITIES, VITAL_KEYS, RHYTHMS, …                    // constants

// lower-level helpers, also exported (used by front-ends, tests and tooling)
issuesFromZodError, contentWarnings, formatPath         // parse.ts
conditionRefs, parseResultKey, isOrderReady, currentObjective
vitalValue, alarmsAt, patientAlarmsAt, alarmLevel, alarmLimitsFor, roundVital, trendContribution, effectFraction,
DEFAULT_ALARM_LIMITS, NOISE_AMPLITUDE, NORMAL_ADULT_VITALS, PHYSIOLOGICAL_RANGES          // physiology.ts (the bedside) over signal.ts (the patient's signal;
                                                        // `vital` conditions read it) and monitor.ts (attachment, MONITORED/OBSERVED_VITALS)
arrestKind(base): "vf-asystole" | "pea-pvt" | null; applyArrest; UNMEASURABLE_IN_ARREST; ARREST_MAX_ETCO2   // arrest.ts (§3.2)
unmeasurableAt(c, s, minute?): VitalKey[]               // what an attached monitor cannot read then (arrest) — VitalsSnapshot.unmeasurable
countCriticalAlarms(c, s): number                       // assessment.ts; the patient's critical-band onsets (patientAlarmsAt), monitor or not
checkCatalogs(catalogs): Issue[]; placementBox; rectContains; SPATIAL_TOLERANCE           // facility.ts
facilityLevels(f): Level[]; defaultLevelId(f); roomLevel(f, room); entityLevel(f, {level?, room?}); buildingLevels(f, b)
                                                        // levels with defaults (implicit "L0"; default level = elevation 0, else first; FACILITIES.md)
ACTOR_ROLES, DEFAULT_REACH, DEFAULT_LEVEL_ID, WorldPredicateSchema, DeviceBehaviorSchema // schema/facility.ts: embodiment vocabulary (EMBODIED §3, §8)
```

### 3.1 Reducer semantics

* `start` — sets `started`; emits `session.started`. All other actions before
  `start` are rejected `not-started`, except `set-phase`, `note`, `flag`.
  After `finish`, everything is rejected `finished`.
* Static clock: actions cost 0 minutes; turnaround is ignored (results ready
  immediately). Simulated clock: each action advances `clock` by
  `clock.actionCosts[type]` (order/read/ask/examine/intervene/answer), results
  are ready at `orderedAt + turnaroundMinutes`; `advance-time` moves the
  clock. After every clock change: fire due scenario events (by `atMinute` or
  `when`), record `trendStops` for trends whose `until` became true, emit
  `result.ready` for results whose readiness crossed, apply automatic phase
  transitions (`enterWhen`), latch `monitorAttachedAt` the first time
  `physiology.monitor.attachedWhen` holds, emit `vitals.alarm` for vitals
  newly crossing warning/critical limits (a monitor just attached alarms on
  every abnormal monitored vital, as at `start`), check `limitMinutes`.
* `ask` — unknown id → `unknown-id`. Item restricted to other phases, or
  superseded in the current phase by an available phase twin
  (`history[].supersedes`) → `phase-locked`. Adds to `asked` (idempotent;
  `firstTime` flag). Only the item asked is added: items it supersedes are
  credited by `asked` conditions and `assess()` (`historyCredited`), never
  revealed.
* `examine` — same pattern for `examined`.
* `order` — key `${id}@${phase}`; duplicates emit `order.duplicate` (no state
  change). Records `readyAt`.
* `read` — phase defaults to current. Rejected `not-ordered` if no order with
  that key, `not-ready` if turnaround not elapsed, `no-record` if
  `resultFor` is null (still counts as "read" for the V4 "no record" notice?
  **No**: a missing result cannot be read; the UI shows "no record" from
  `resultFor` before ordering). Adds key to `seen`.
* `set-phase` — unknown phase → `unknown-id`; `learnerSwitchable: false` →
  `phase-locked`.
* `hint` — increments `hints`; emits `hint.used` with current objective id.
* `answer` — decision not unlocked (`requires` false) → `requirements-unmet`;
  already decided → `already-decided`. Correct iff (single) the chosen option
  is correct; (multiple) the chosen set equals the set of correct options.
  Appends to `attempts`; on correct sets `decisions[id] = clock`.
* `intervene` — `maxDoses` exceeded → `max-doses`. Appropriateness:
  `contraindicated` if `contraindicatedWhen` true (evaluated **before**
  applying), else `indicated` if `indicatedWhen` true, else `neutral`.
  Applies `setFlags`; effects are applied lazily by `vitalsAt` from the
  intervention records.
* `finish` — rejected `objectives-incomplete` unless `progress().complete`
  (V4 behaviour); sets `finished`; emits `case.finished`.
* After **every accepted** action: newly completed objectives (in order of
  definition, all whose `completeWhen` is true and not yet in
  `objectivesDone`) emit `objective.completed`; when the last completes emit
  `case.completed` once.

### 3.2 Physiology (`vitalsAt`)

`value(v, t) = clamp( base(v, t) + Σ trend(v, t) + Σ effect(v, t) + noise(v, t) )`

* `base` = `physiology.baseline` overridden by `baselineOverrides` (scenario
  `setVitals` writes there when fired).
* trend contribution: `perMinute × (min(t, stop) − startMinute)⁺`, clamped
  to `[min, max]`; if stopped and `recoverPerMinute` set, decays toward 0 at
  that rate after `stop`.
* effect contribution (per intervention record at time `a`): 0 before
  `a + onset`; linear ramp over `rampMinutes`; full `delta` (or
  `target − valueBeforeEffect` for `target`) for `durationMinutes`
  (or forever); then 0 (instant offset — keep it simple and documented).
* `noise`: deterministic, `noise × amplitude(v)` from `createRng(seed(caseId, minute, vital))`
  where amplitudes are hr 2, sbp 2, dbp 1, rr 1, spo2 0.5, temp 0.05, etco2 1.
* clamp to physiological ranges (hr 0–250, sbp 0–260, dbp 0–160, rr 0–60,
  spo2 40–100, temp 30–43, gcs 3–15 (rounded), glucose 0.5–60, etco2 0–100, pain 0–10).
* **Absolute events** — a scenario event with `absolute: true` (default
  false) *replaces* rather than re-bases: for each numeric vital in its
  `setVitals`, from the minute it fired, trends whose `startMinute` and
  intervention effects whose onset (`at + onsetMinutes`) fall **before**
  that minute stop contributing; trends/effects starting at or after it
  still add. The latest fired absolute event per vital wins; a later
  non-absolute event only changes the baseline. An absolute event that sets
  no numeric vital draws an integrity warning.
* **Cardiac-arrest rhythms** (`arrestKind(base)`, `engine/arrest.ts`) — the
  rhythm in force (baseline + fired `setVitals`) overrides the sum above,
  whatever the trends/effects/noise:
  * `ventricular-fibrillation`, `asystole` (`"vf-asystole"`): hr, sbp, dbp,
    map and spo2 read 0;
  * `pea`, and `ventricular-tachycardia` when that baseline has `sbp: 0`
    (pulseless VT) (`"pea-pvt"`): sbp, dbp, map, spo2 read 0, hr keeps the
    modelled electrical rate (trends/effects/noise still apply to it);
    VT with any other sbp is perfusing and modelled normally;
  * both: etco2, when the case models it, is capped at 10 (never invented);
    the snapshot lists `unmeasurable` (`["hr","sbp","dbp","spo2"]` or
    `["sbp","dbp","spo2"]`; spo2 0 bypasses its 40–100 clamp and means "no
    reading") whose trend arrows are 0; hr always alarms **critical**
    regardless of the case's hr limits (other vitals alarm on their limits,
    e.g. sbp/spo2 0 are critical with the adult defaults) and the
    `vitals.alarm` event of an unmeasurable vital carries `unmeasurable:
    true` (its value is the placeholder 0 — front-ends print "no reading"
    for hr and leave BP/SpO₂ to the hr alarm, never "SBP 0 mmHg"); `vital`
    conditions see the same overridden values.
  Returning to a perfusing rhythm (ROSC event) restores the additive model
  (set `absolute` on that event to drop pre-arrest drug effects/trends).
* Alarm limits: case `physiology.alarms` overrides defaults
  (adult: hr 50/120 critical 40/150; sbp 90/180 critical 80/220; rr 10/24
  critical 8/30; spo2 low 92 critical 88; temp 36/38.3 critical 35/40;
  gcs low 13 critical 8; glucose 3.9/15 critical 3/25).
* **What the bedside shows** (grounding rule 2 — nobody has measured the
  rest): `MONITORED_VITALS` (hr, sbp, dbp, rr, spo2, temp, etco2) are shown
  and alarm while the bedside monitor is attached; `OBSERVED_VITALS` (gcs,
  pain — nursing observations) are shown but never raise a monitor alarm;
  any other vital (glucose) is engine-only (`vital` conditions, trends)
  until one of its `physiology.revealedBy` investigations has been read, and
  from then on is shown and — while the monitor is attached — alarms like a
  monitored one. `vitalsAt` leaves
  hidden vitals out of `vitals`, `trend` and `alarms`, and `alarmsAt` (hence
  `vitals.alarm` events) only covers `alarmingVitals`. `countCriticalAlarms`
  counts the patient's critical episodes instead (`patientAlarmsAt`: the
  same vitals on a monitor attached from minute 0), so the safety metric
  does not depend on when — or whether — the learner attached the monitor.
  A self-reported pain score is left out while the
  patient cannot give one (arrest, GCS ≤ 8).
* **The bedside monitor** (`engine/monitor.ts`) — a case with
  `physiology.monitor` starts off the monitor. The reducer latches
  `monitorAttachedAt` = the minute `attachedWhen` first held (after a
  settle; it stays attached when the condition later stops holding — a
  phase left, a flag cleared); `monitorAttached(c, s, minute)` is
  `minute ≥ monitorAttachedAt` (a state not yet settled whose condition
  holds — before `start`, built by hand — counts as attached from 0).
  Without `physiology.monitor` it is attached from minute 0. While not
  attached: no monitored vital is shown or trended, nothing alarms (a read
  glucose is shown but does not alarm — a critical result is called
  through as such) and there is no
  rhythm/ECG, except the `spotChecks` (monitored vitals the baseline models),
  shown as static readings of the case **baseline** (what the triage note
  records: no jitter, no trend arrow, no alarm, unaffected by an arrest) and
  listed in the snapshot's `spotChecks`; the snapshot says `monitorAttached:
  false`. A cardiac arrest before attachment is in the signal (`vital`
  conditions, scenario events) but shows no reading and no `unmeasurable`.
  Once attached, everything is as above for the vitals it `measures`
  (`measuredVitals`: default all monitored ones; the others stay
  engine-only — not shown, trended or alarmed, nor counted by
  `countCriticalAlarms`); trend arrows of monitored vitals look back no
  further than the attachment. With `ecgWhen` the snapshot carries
  `ecgAttached`, and the rhythm/ECG are shown only while it is true
  (`ecgAttached(c, s)`: attached and `ecgWhen` holds on the state): a
  monitor without its leads shows the numbers, no rhythm (front-ends: "no
  ECG leads", a flat lead II). Engine truth (`vitalValue`,
  `vital` conditions, trends, events) and the safety metric
  (`countCriticalAlarms`, which counts the patient's critical episodes
  from minute 0) never depend on the monitor.
* Cases without `physiology` return a fixed normal adult snapshot flagged
  as `baseline only` (UI shows "not recorded" style).

### 3.3 Matching

`normalizeQuery`: `toLowerCase()`, remove all whitespace, `（）` → `()`, full-width
letters/digits → ASCII. `matchOrders` reproduces V4 `Xd` exactly when the case
supplies the equivalent `orderMatching` (the SMZL port does) — unit tests
assert V4 parity on V4's examples. Its candidates come from the aliases
**and names** of every locale (`locale` does not narrow them).

History/exam/intervention matching is a scored keyword matcher: candidate
phrases = question/maneuver/name + keywords (+ aliases) for the locale and
for every locale (cross-lingual); score = max over phrases of:

* CJK phrase — longest-common-substring length / phrase length (1 when
  contained, 0 when fewer than 2 characters are shared, +0.15 when the
  utterance is a fragment of the phrase); a shared run of only 2 characters
  is capped at 0.5 (below the patient pipeline's 0.55 select band) unless
  it is the phrase's own start and not a question bigram (怎么, 什么, 有没…),
  or the whole phrase occurs in order within a few extra characters
  ("摸一下肚子" ⊇ 摸…肚子) — so "量过血压" ∩ "出过血" never credits a fact;
* Latin phrase — share of phrase tokens present in the utterance, or 0.9
  when the phrase (≥ 4 chars, spacing/punctuation aside) is contained.
  Tokens (`canonicalToken`): lower-case words minus English stop-words, then
  British → American fold (`ae`/`oe` → `e` in words ≥ 5 letters;
  `-ise/-isation…` → `-ize…`), a light suffix stemmer, `-ological` →
  `-ology` (pathological ~ pathology, oncological ~ oncology) and a small
  lemma table (`ENGLISH_LEMMAS`: meds / medicine(s) / medicated →
  medication, abdominal → abdomen, …). Two tokens (`tokensMatch`) match
  when equal, when one prefixes the other — with any ending when the shorter
  has ≥ 6 letters (breath ~ breathless), only an inflectional ending
  (`-s`, `-ed`, `-ing`, `-er`, `-y`, `-ful`, `-ness`, `-less`…) when it has
  4–5 (pain ~ painful, but hear ≁ heart, back ≁ background, heart ≁
  heartburn) —, or when they share a ≥ 5-letter prefix after which **both**
  end within 3 letters — 4 letters when the shared prefix has ≥ 8 — (allergy
  ~ allergic, nausea ~ nauseous, anticoagulant ~ anticoagulation,
  prophylaxis ~ prophylactic). So medical ≁ medication, history ≁
  historical, hypertension ≁ hyperthermia, thrombosis ≁ thrombolysis,
  cholecystitis ≁ cholecystectomy.

`excludeKeywords`: if the utterance, normalised with `compactText`
(`normalizeQuery` minus punctuation — case, spacing and punctuation are
ignored), contains any exclude phrase of an item (any locale, same
normalisation), the item's score is multiplied by `EXCLUDE_KEYWORD_FACTOR`
= 0.2 before the threshold, which in practice removes it (1 × 0.2 < 0.34).
Containment is on whitespace-free text, so prefer distinctive phrases
("past medical", "过敏") over short fragments.

A keyword's stop-words carry no weight: "what does he take" tokenizes to
`tak` alone and scores 1 against any utterance with "take". So
`checkCaseIntegrity` warns on an English keyword/alias of three or more
words that reduces to exactly one token (a one-word wildcard); write it run
together ("whatdoeshetake" — containment only, 0.9) or as the word itself.

`MatchOptions` (`matchHistory`/`matchExam` only): `phase` drops items whose
`phases` list exists and excludes it; `includeUnknown: false` drops history
items with `disclosure: "unknown"` (default `true`; ignored by `matchExam`).
The 3-argument form is unchanged. For `matchHistory`, `phase` also applies
**phase twins**: a hit on an item superseded in that phase
(`history[].supersedes` of an item available there, followed transitively)
counts for the twin instead — whether or not the superseded item is listed
for the phase — with the better of the two scores, so a stale answer is
never selected (nor co-selected with its twin) in that phase. Without
`phase` nothing is routed.

Items with score ≥ `MATCH_THRESHOLD` (0.34) are returned, by score, then
declaration order. `matchSpecificity` tells resolvers which of two items tied
at the same score matched the longer, more specific phrase (scores and order
are unchanged). Deterministic and dependency-free; used offline and as
RAG hints.

### 3.4 Semantics notes

Behaviour the implementation fixes where the summaries above are silent:

* **Clock & records** — an accepted action is applied at the clock value
  *before* its cost: order `orderedAt`/`readyAt`, intervention `at`, attempt
  `at`, `decisions[id]`, notes and objectives completed by the action are
  stamped at the action's start. The reducer then settles at that minute and,
  for a time-consuming action, advances the clock by its cost (one
  `time.advanced {from, to}` per such action; `advance-time` likewise), firing
  results/events/alarms at their own minutes on the way. Rejected actions
  return the input state with a single `action.rejected` and cost nothing.
* **Phases** — automatic transitions fire on `enterWhen` **false → true
  edges** only (truth compared with the state before the action; at session
  start an already-true `enterWhen` counts as an edge), so a learner who
  switches back is not pulled forward again while the condition stays true.
* **Answers** — checks in order: unknown decision → unknown option ids
  (`unknown-id`) → a `single` decision given ≠ 1 distinct option (`invalid`)
  → `already-decided` → `requirements-unmet` (`requires` on the pre-action
  state). Rejected answers are not attempts (`attempted`/`decidedFirstTry`
  ignore them); duplicate option ids are de-duplicated.
* **Orders** — a duplicate order (same `${id}@${phase}`) emits
  `order.duplicate` and returns the input state untouched (no `seq`, no time
  cost). A phase with no result key is "no record": no `result.ready`, and
  `read` is rejected `no-record`. An `available: false` result *is* a record:
  it is readable (key added to `seen`), satisfies `read`/`resultReady`, gets a
  `result.ready` like any other result, but is never listed in
  `assess().investigations.unread`.
* **Assessment** — `history.requiredAsked` / `missingRequired` count a
  required item as asked when it, or an item that supersedes it (phase
  twins), was asked (`creditedHistory`); `history.asked` counts the items
  really asked. `unread` lists result keys (`cbc@pre`) ordered but never
  read whose result is `available: true`. `essentialMissing` lists essential
  investigations neither ordered (any phase) nor covered by an alternative
  whose `available: true` result was **read** in some phase (ordering an
  alternative, or reading its `available: false` record, does not count);
  `alternativeTo` links are mutual (A lists B or B lists A).
* **Alarms** — computed on the noise-free, display-rounded signal (jitter
  never chatters), for `alarmingVitals` at that minute only (nothing — not a
  read glucose either — before the monitor is attached): warning when `< low` or
  `> high` (strict), critical when `≤ criticalLow` or `≥ criticalHigh`
  (inclusive). A case's
  `physiology.alarms[vital]` **replaces** that vital's default limits
  wholesale (unspecified bounds are off). `vitals.alarm` is emitted when a
  vital's level rises; at `start` every abnormal vital alarms (no history).
  `vital` conditions use the same noise-free rounded value.
* **Baseline-only vitals** — a case without `physiology` gets a fixed normal
  adult snapshot with `baselineOnly: true`, no alarms and no trend arrows;
  `vital` conditions on it are always false (missing data stays missing).
* **Facility** — `facilityCapabilities` includes `PERSONAL_KIT` (stethoscope,
  thermometer, reflex hammer, otoscope). `regionAt` returns the smallest room
  containing the point, else the smallest building's name, else
  `outdoorRegion`. `resolveWaypoint(f, catalogs, target, {from, locale,
  slotId})`: `"patient"` → slot `slotId` (default the first slot);
  `"board"`/`"atlas"` → nearest placement with that interaction kind; any
  other target tries, in order, capability (nearest placement providing it;
  with `preferPatientSlot` the slot's linked `monitor`, then the nearest
  provider in the slot's room, first — the web uses it so a waypoint names
  the patient's own bedside kit wherever the learner stands) →
  room id (room centre) → room kind (nearest room) → placement id. No match →
  `null`. "Nearest" is measured from `from` (default the facility spawn);
  labels use `locale` (default zh-CN).
* **Issues** — every `Issue.path` is dot-joined with numeric array indices
  (`solution.3.itemId`, `investigations.2.alternativeTo.0`).

## 4. Agent runtime (`@clinicalcraft/agent`)

See `docs/PROTOCOL.md` for full message shapes. Summary:

* **Protocol (Codex SQ/EQ)** — front-ends `submit(Op)` and consume a stream
  of `AgentEvent`s. The runtime never touches a UI. Every front-end (web,
  REPL, exec, server, MCP) is a protocol client.
* **ClinicalSession** — owns `CaseDefinition` + `SessionState` (via core
  `reduce`), NPC conversations, the approval gate, hooks, transcript sink.
  Processes submissions serially. Deterministic `clinical_action` ops work
  with no LLM at all.
* **Agents** — markdown + frontmatter definitions (Claude Code subagents):
  `patient`, `companion`, `nurse`, `radiologist`, `pathologist`, `attending`
  (preceptor), `examiner`, `clinician` (autopilot). Custom agents in
  `.clinicalcraft/agents/*.md`. Each NPC has a tool allow-list and a
  grounding contract (§4.2).
* **Providers** — one interface, two wire protocols: `anthropic-messages`
  (official `@anthropic-ai/sdk`, Messages API streaming; Anthropic and the
  Anthropic-compatible Zhipu and Moonshot endpoints) and
  `openai-chat-completions` (raw fetch, Chat Completions SSE; OpenAI, xAI
  Grok, Zhipu GLM, Z.ai, DeepSeek, Moonshot, Qwen, OpenRouter, Ollama, LM
  Studio). Plus `offline` (deterministic responders, no network) and `proxy`
  (browser → `clinicalcraft serve`). Catalogue: PROTOCOL §5.
* **Tools** — clinical action tools wrap `reduce`; each has a JSON schema,
  a `risk(args, ctx)` classifier and `readOnly`. The **approval gate**
  applies `approvalMode` + allow/ask/deny rules before execution.
* **Hooks** — `SessionStart`, `UserPromptSubmit`, `PreToolUse`,
  `PostToolUse`, `ClinicalEvent`, `Notification`, `PreCompact`, `Stop`,
  `SessionEnd`; in-process functions everywhere, shell commands in node.
* **Slash commands** — built-ins + `.clinicalcraft/commands/*.md` templates.
* **Settings** — layered: defaults < user `~/.clinicalcraft/settings.json` <
  project `.clinicalcraft/settings.json` < local `.clinicalcraft/settings.local.json`
  < env < CLI flags < profile. Memory: `CLINICALCRAFT.md` (user, project, nested; `@path` imports).
  The project and local files live in a directory the user may have cloned:
  project settings never carry secrets (provider `apiKey`/`apiKeyEnv`,
  non-loopback `baseUrl`, `server.host`/`server.token` are dropped; a
  loopback `baseUrl` survives only for a provider that sends no key — the
  keyless ollama/lmstudio templates or a provider the project defines without
  one — since any local user can listen on a loopback port), and
  until the user trusts the project (`clinicalcraft trust`; a user-only store
  in `<home>/trusted-projects.json` keyed by the root's realpath and pinned to
  a digest of both files) both layers also lose `hooks` and provider
  `headers`, and the local file gets the project restrictions. Dropped keys
  are reported on stderr, not only with `--verbose` (PROTOCOL §7).
* **Transcripts** — JSONL "rollouts" (every Op, Event, ClinicalAction) under
  `~/.clinicalcraft/sessions/YYYY/MM/DD/<YYYY-MM-DDTHH-MM-SSZ>-<id>.jsonl`
  (UTC); resume = replay actions + restore conversations.

### 4.1 Approval modes

| mode      | none/low risk | moderate | high | read-only tools | inspiration |
|-----------|---------------|----------|------|-----------------|-------------|
| `default` | allow         | ask      | ask  | allow | Claude Code default / Codex on-request |
| `strict`  | ask (state-changing) | ask | ask | allow | Codex untrusted |
| `auto`    | allow         | allow    | ask  | allow | Claude Code acceptEdits |
| `plan`    | deny state-changing (agent must propose) | | | allow | Claude Code plan mode |
| `bypass`  | allow         | allow    | allow| allow | bypassPermissions / Codex never (headless, benchmarks) |

Unattended front-ends never answer "ask" silently: headless `exec`
approves only in `bypass`; in `auto` it approves low/moderate-risk requests
and denies always-ask, ask-rule and high-risk ones unless
`--approve-high-risk` is passed. MCP sessions default to `auto` and turn an
"ask" into a two-step confirmation (`confirm: true` on a second call that
repeats the refused one; on a first call it is refused like any other).
`bypass` is for benchmarks only (PROTOCOL §11).

Rules (`permissions.allow|ask|deny`, Claude Code syntax `tool(pattern)` with
`*` glob over tool names from PROTOCOL §3, e.g. `intervene(thrombolysis*)`,
`order_test(*)`, `examine`) are checked
deny → ask → allow before the mode table. An "approve for session" answer
adds an in-memory allow rule (Grok CLI "don't ask again this session").

### 4.2 Virtual-patient grounding contract

Need-to-know context (EasyMED/AIPatient lesson): the patient model never
sees unrevealed answers, the diagnosis, results, rubric or debrief.

Default pipeline **select → voice** (`settings.patient.pipeline = "select-voice"`):

1. **Route** — out-of-fiction requests (asking the "patient" for real medical
   advice, prompt-injection, meta questions) get an in-character deflection and
   a `warning` event; they never reach the fact selector.
2. **Select** — `matchHistory(utterance, {phase})`: items available in the
   current phase, a hit on an item superseded there by a phase twin counting
   for the twin (§3.3); hits ≥ 0.55 are selected (≤ 3, within 0.25 of the best);
   0.34–0.55 → optional LLM re-rank over the **fact index** (id, topic,
   canonical question — never answers), strict JSON `{factIds, clarify}`
   restricted to the candidate enum; nothing → `fallbackUnknown` (or the
   `unknown` item's authored answer when that matched).
   `disclosure: "specific"` facts require a direct match (score ≥ 0.55);
   `volunteer` facts may be offered on open questions (≤ 1 per turn).
   Each newly selected id dispatches `ask` with `via: "agent"` (learner credit).
3. **Voice** — `PatientContext` = persona, affect, companion, revealed-fact
   ledger (re-injected every turn), selected facts (answers), volunteer
   queue, fallback line, locale. Output JSON `{say, nonverbal, usedFactIds,
   affectHint}` via `responseFormat`.
4. **Verify** — numbers, units, drug names and dates in `say` must appear in
   the answers of `usedFactIds` (or persona text) — so must named conditions
   (stroke, heart attack, 糖尿病…, as whole words: "hives" is not "HIV";
   the case's decision options) and relative dates without digits ("last
   year", "去年"), and no distinctive phrase of a fact not yet revealed may
   appear (a pair of English content words, or a 4-character Chinese window
   inside one punctuation-delimited run with at least two content
   characters; `disclosure: "unknown"` answers are not facts); otherwise the
   reply is replaced by the authored answer(s) and `grounding: "template"`
   is logged. The learner's `warning` (and an MCP client's notices) name
   only the violation **categories** ("a number, a fact not yet asked
   about"), never the quoted text — it may be the unasked fact or the
   diagnosis the check hid; the detailed list goes to the transcript as a
   `diagnostic` item only (PROTOCOL §10).
   The `nonverbal` cue passes the same check and is dropped (with a warning)
   when it is long, has a number, names a sign or measurement, or shares
   words with an exam finding not yet examined (`checkNonverbal`).
5. **Offline** — steps 1-2 deterministic, step 3 = authored answer verbatim.

Alternative pipeline **tool** (`"tool"`): the patient model receives the fact
index and must call `reveal_facts {fact_ids}` to obtain answers before using
them; the verifier still runs. Exam findings, results and diagnoses are never
spoken by the patient — those come from engine actions.

## 5. Front-ends

* **web** — three.js voxel world built from facility + catalogs (V4 look:
  procedural 16×16 pixel textures, instanced boxes, V4 player physics,
  doors, build zone, crafting). Its walls and every collider come from the
  `@clinicalcraft/world` collision model (EMBODIED R2), so the headless
  world and the 3D view agree box for box. Patients/staff are voxel NPCs; equipment is
  interactive (workstations order exams, monitors show live vitals/ECG,
  evidence board takes decisions, atlas kiosk opens the anatomy viewer).
  Panels: conversation (streaming, free text + suggested questions), exam,
  order entry, report & original image viewer, journal, evidence board,
  monitor, debrief, case library, settings (provider/model/approval/locale),
  approval dialog, map, inventory, help, pause/save/export. The session runs
  in the browser; LLM calls go direct (user key) or via the server proxy.
  The case library is a bundled index (`CaseIndexEntry`, built at build time
  by the shared builder in `@clinicalcraft/agent` library.ts); every full case
  is a lazy chunk loaded when the case is selected or started (PROTOCOL §11).
  Before a case's monitor is attached (`monitorAttached: false`) the HUD
  vitals strip shows "NO MONITOR · TRIAGE" / "未接监护 · 分诊手测" and only the
  spot checks (muted: no trend, no alarm colour), the monitor screens (panel
  and in-world) are dark ("MONITOR NOT ATTACHED" / "未连接监护": no trace,
  number or rhythm), and the monitor panel lists the triage readings,
  disables NIBP and offers "Attach the monitor" (the case's monitoring
  intervention named in `attachedWhen`, through the approval gate). The
  voxel patient still looks distressed when a monitored vital is critical
  (engine truth — the patient looks ill without a monitor).
* **cli** — `clinicalcraft` REPL (plain text → current interlocutor,
  `@nurse …` addressing, `/commands`), `exec`/`-p` headless with
  `--output-format text|json|stream-json`, `--autopilot`, case tooling,
  `serve`, `mcp`, `import-v4`, `eval`.
* **server** — `node:http`: static web, `GET /api/health`, `/api/content/*`
  (a paginated, filterable case index; cases validated on first request;
  strong ETags),
  `/api/providers`, `POST /api/llm/stream` (provider-neutral SSE proxy; keys
  stay server-side), `POST /api/transcripts/:id`, local-only assets at
  `/local-assets/*`; bound to 127.0.0.1 by default (any other host needs a
  token). Routes: PROTOCOL §11.
* **mcp** — stdio JSON-RPC 2.0 MCP server exposing clinical tools so Claude
  Code / Codex / Grok CLI can play the clinician (approval mode `auto`;
  high-risk actions need a second call with `confirm: true` that repeats the
  refused one; session warnings such as an offline fallback come back with
  each result).
