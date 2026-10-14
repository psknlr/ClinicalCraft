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
docs/                       ARCHITECTURE (this), CASE_AUTHORING, PROVIDERS, PROTOCOL,
                            FACILITIES, ASSETS, DESIGN_PRINCIPLES
packages/core               @clinicalcraft/core     zod schemas + pure engine
packages/content            @clinicalcraft/content  built-in cases, facilities, catalogs + node loader
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
* Runtime dependencies are deliberately few: `zod` (core), `@anthropic-ai/sdk` (agent), `three` (web). Everything else is node built-ins.
* Workspace packages are consumed from source in tests/dev via aliases (vitest.config.ts, vite.config.ts) and from `dist/` when built.

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
  * `investigations[].alternativeTo` — investigation ids, default `[]`; a
    mutual "can stand in for" link used by `assess()` (§3.4).
  * `solution` — `ClinicalAction[]` (validated with `ClinicalActionSchema`
    from `schema/session.ts`, so a malformed step fails `parseCase` with a
    path such as `solution.7.itemId`); unknown ids inside steps are reported
    per step by `checkCaseIntegrity`.
* **Condition DSL** — `schema/common.ts`: `all/any/not/always`, `asked`,
  `examined`, `ordered`, `read`, `resultReady`, `decided`, `attempted`,
  `decidedFirstTry`, `intervened`, `phase`, `flag`, `objective`, `vital`,
  `elapsed`, `hints`. `decidedFirstTry: decisionId` is true iff the first
  recorded (i.e. accepted) attempt at that decision was correct — once the
  first answer is wrong it stays false, so it belongs in rubric items rather
  than objectives or `requires`.
* **Facility** — `schema/facility.ts` (`clinicalcraft/facility@1`): bounds,
  spawn, environment, terrain (paths, ponds, trees, flowers, horizon,
  clouds), buildings (walls with V4 course materials, openings, roof &
  skylights), rooms (kind, partitions, signs, lights), placements of
  equipment, patient slots (accepted case settings, bed, monitor), staff,
  signs, build zone.
* **Equipment catalog** — `schema/facility.ts` (`clinicalcraft/equipment-catalog@1`):
  materials (procedural pixel textures) and equipment types (voxel parts,
  footprint, capabilities, interaction kind, live screen, light).
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
checkCaseIntegrity(c: CaseDefinition): Issue[]          // referential integrity of every id in conditions, waypoints, results, figures, alternativeTo, solution steps…
verifyCase(c: CaseDefinition): { ok: boolean; issues: Issue[]; finalState: SessionState; assessment: AssessmentReport }
                                                        // replays c.solution; ok iff all objectives done, all decisions decided, no rejections
checkFacility(f: FacilityDefinition, catalogs: EquipmentCatalog[]): Issue[]   // unknown equipment/material ids, overlapping solids, slots outside rooms…

// session lifecycle (pure)
createSession(c: CaseDefinition): SessionState          // started=false, phase=initialPhase ?? phases[0].id, clock 0
reduce(c: CaseDefinition, s: SessionState, a: ClinicalAction): ReduceResult
replay(c: CaseDefinition, actions: ClinicalAction[]): { state: SessionState; events: DomainEvent[]; rejections: … }

// queries
evaluate(c: CaseDefinition, s: SessionState, cond: Condition): boolean
progress(c, s): { objectives: { id: string; done: boolean; doneAt?: number; current: boolean }[]; currentIndex: number; done: number; total: number; complete: boolean }
currentWaypoint(c, s): string | null                    // first waypoint of current objective whose `unless` is false
availableDecisions(c, s): { decision: Decision; unlocked: boolean; decided: boolean }[]
resultFor(c, investigationId, phase): Result | null     // null = no record in that phase
resultKey(investigationId, phase): string               // `${id}@${phase}`
orderStatus(c, s): { order: OrderRecord; ready: boolean; read: boolean }[]
vitalsAt(c, s, minute?: number): VitalsSnapshot         // pure function of (case, state, minute)
interface VitalsSnapshot { minute: number; vitals: Vitals & { map: number }; alarms: { vital: VitalKey; level: "warning" | "critical"; value: number }[]; trend: Partial<Record<VitalKey, -1 | 0 | 1>>;
                           baselineOnly?: boolean }      // true only for cases without `physiology` (placeholder values; no alarms/trend)

// matching (offline NLU used by UI, CLI, scripted agents and as RAG hints for LLM agents)
normalizeQuery(text: string): string                    // lower-case, strip whitespace, full-width → ASCII punctuation (V4 rules)
matchOrders(c, query, locale): string[]                 // aliases + names of every locale → orderMatching.rules → exact (V4 semantics, generalised)
orderWarnings(c, query, investigationId, locale): string[]  // orderMatching.warnings whose ifMatches matches the normalised query
matchHistory(c, utterance, locale, options?: MatchOptions): { id: string; score: number }[]   // sorted desc, score 0..1
matchExam(c, utterance, locale, options?: MatchOptions): { id: string; score: number }[]
matchInterventions(c, utterance, locale): { id: string; score: number }[]
interface MatchOptions { phase?: string; includeUnknown?: boolean }   // §3.3; omitted = all phases, unknown items included
MATCH_THRESHOLD = 0.34; EXCLUDE_KEYWORD_FACTOR = 0.2
compactText, tokenize, canonicalToken, foldSpelling, tokensMatch, phraseScore, longestCommonSubstring,
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
regionAt(f, x, z, locale): string                       // smallest room containing the point → building name → outdoorRegion
assignPatientSlot(f, c): PatientSlot | null             // first slot accepting c.setting
resolveWaypoint(f, catalogs, target, options?: { from?: { x: number; z: number }; locale?: string; slotId?: string }): { x: number; z: number; label: string } | null
                                                        // "patient" | "board" | "atlas" | capability | room id | room kind | placement id (order in §3.4)

// utilities
createRng(seed: number): () => number                   // V4 LCG: k = k * 1664525 + 1013904223 >>> 0
t, tList, normalizeLocale, …                            // i18n.ts
CAPABILITIES, VITAL_KEYS, RHYTHMS, …                    // constants
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
  `result.ready` for results whose readiness crossed, emit `vitals.alarm` for
  vitals newly crossing warning/critical limits, apply automatic phase
  transitions (`enterWhen`), check `limitMinutes`.
* `ask` — unknown id → `unknown-id`. Item restricted to other phases →
  `phase-locked`. Adds to `asked` (idempotent; `firstTime` flag).
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
* Alarm limits: case `physiology.alarms` overrides defaults
  (adult: hr 50/120 critical 40/150; sbp 90/180 critical 80/220; rr 10/24
  critical 8/30; spo2 low 92 critical 88; temp 36/38.3 critical 35/40;
  gcs low 13 critical 8; glucose 3.9/15 critical 3/25).
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
  utterance is a fragment of the phrase);
* Latin phrase — share of phrase tokens present in the utterance, or 0.9
  when the phrase (≥ 4 chars, spacing/punctuation aside) is contained.
  Tokens (`canonicalToken`): lower-case words minus English stop-words, then
  British → American fold (`ae`/`oe` → `e` in words ≥ 5 letters;
  `-ise/-isation…` → `-ize…`), a light suffix stemmer, `-ological` →
  `-ology` (pathological ~ pathology, oncological ~ oncology) and a small
  lemma table (`ENGLISH_LEMMAS`: meds / medicine(s) / medicated →
  medication, abdominal → abdomen, …). Two tokens (`tokensMatch`) match
  when equal, when one (≥ 4 letters) prefixes the other (breath ~
  breathless), or when they share a ≥ 5-letter prefix after which **both**
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

`MatchOptions` (`matchHistory`/`matchExam` only): `phase` drops items whose
`phases` list exists and excludes it; `includeUnknown: false` drops history
items with `disclosure: "unknown"` (default `true`; ignored by `matchExam`).
The 3-argument form is unchanged.

Items with score ≥ `MATCH_THRESHOLD` (0.34) are returned, by score, then
declaration order. Deterministic and dependency-free; used offline and as
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
* **Assessment** — `unread` lists result keys (`cbc@pre`) ordered but never
  read whose result is `available: true`. `essentialMissing` lists essential
  investigations neither ordered (any phase) nor covered by an alternative
  whose `available: true` result was **read** in some phase (ordering an
  alternative, or reading its `available: false` record, does not count);
  `alternativeTo` links are mutual (A lists B or B lists A).
* **Alarms** — computed on the noise-free, display-rounded signal (jitter
  never chatters): warning when `< low` or `> high` (strict), critical when
  `≤ criticalLow` or `≥ criticalHigh` (inclusive). A case's
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
  other target tries, in order, capability (nearest placement providing it) →
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
* **Providers** — one interface, two wire protocols: `anthropic` (official
  `@anthropic-ai/sdk`, Messages API streaming) and `openai` (raw fetch,
  Chat Completions SSE; OpenAI, xAI Grok, Zhipu GLM, DeepSeek, Moonshot, Qwen,
  OpenRouter, Ollama, LM Studio). Plus `offline` (deterministic responders,
  no network) and `proxy` (browser → `clinicalcraft serve`).
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
* **Transcripts** — JSONL "rollouts" (every Op, Event, ClinicalAction) under
  `~/.clinicalcraft/sessions/YYYY/MM/DD/<id>.jsonl`; resume = replay actions
  + restore conversations.

### 4.1 Approval modes

| mode      | none/low risk | moderate | high | read-only tools | inspiration |
|-----------|---------------|----------|------|-----------------|-------------|
| `default` | allow         | ask      | ask  | allow | Claude Code default / Codex on-request |
| `strict`  | ask (state-changing) | ask | ask | allow | Codex untrusted |
| `auto`    | allow         | allow    | ask  | allow | Claude Code acceptEdits |
| `plan`    | deny state-changing (agent must propose) | | | allow | Claude Code plan mode |
| `bypass`  | allow         | allow    | allow| allow | bypassPermissions / Codex never (headless, benchmarks) |

Rules (`permissions.allow|ask|deny`, Claude Code syntax `tool(pattern)` with
`*` glob, e.g. `intervene(thrombolysis*)`, `order(*)`, `examine`) are checked
deny → ask → allow before the mode table. An "approve for session" answer
adds an in-memory allow rule (Grok CLI "don't ask again this session").

### 4.2 Virtual-patient grounding contract

Need-to-know context (EasyMED/AIPatient lesson): the patient model never
sees unrevealed answers, the diagnosis, results, rubric or debrief.

Default pipeline **select → voice** (`settings.patient.pipeline = "select-voice"`):

1. **Route** — out-of-fiction requests (asking the "patient" for real medical
   advice, prompt-injection, meta questions) get an in-character deflection and
   a `warning` event; they never reach the fact selector.
2. **Select** — `matchHistory(utterance)`: hits ≥ 0.55 are selected (≤ 3);
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
   the answers of `usedFactIds` (or persona text); otherwise the reply is
   replaced by the authored answer(s) and `grounding: "template"` is logged.
5. **Offline** — steps 1-2 deterministic, step 3 = authored answer verbatim.

Alternative pipeline **tool** (`"tool"`): the patient model receives the fact
index and must call `reveal_facts {fact_ids}` to obtain answers before using
them; the verifier still runs. Exam findings, results and diagnoses are never
spoken by the patient — those come from engine actions.

## 5. Front-ends

* **web** — three.js voxel world built from facility + catalogs (V4 look:
  procedural 16×16 pixel textures, instanced boxes, V4 player physics,
  doors, build zone, crafting). Patients/staff are voxel NPCs; equipment is
  interactive (workstations order exams, monitors show live vitals/ECG,
  evidence board takes decisions, atlas kiosk opens the anatomy viewer).
  Panels: conversation (streaming, free text + suggested questions), exam,
  order entry, report & original image viewer, journal, evidence board,
  monitor, debrief, case library, settings (provider/model/approval/locale),
  approval dialog, map, inventory, help, pause/save/export. The session runs
  in the browser; LLM calls go direct (user key) or via the server proxy.
* **cli** — `clinicalcraft` REPL (plain text → current interlocutor,
  `@nurse …` addressing, `/commands`), `exec`/`-p` headless with
  `--output-format text|json|stream-json`, `--autopilot`, case tooling,
  `serve`, `mcp`, `import-v4`, `eval`.
* **server** — `node:http`: static web, `/api/content/*`, `/api/assets/*`,
  `/api/providers`, `POST /api/llm/stream` (provider-neutral SSE proxy; keys
  stay server-side), bound to 127.0.0.1 by default.
* **mcp** — stdio JSON-RPC 2.0 MCP server exposing clinical tools so Claude
  Code / Codex / Grok CLI can play the clinician.
