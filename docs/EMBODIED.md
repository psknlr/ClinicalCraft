# ClinicalCraft VNext — Embodied Clinical Agents

> Status: authoritative design for the embodied layer (`@clinicalcraft/world`,
> embodied mode of `@clinicalcraft/agent`, the web world bridge, the MCP world
> tools and the embodied benchmark). It revises the *Comprehensive Technical
> Upgrade Proposal v1.0 (2026-10-19)*: every goal of the proposal is kept; the
> changes below are refinements made after reading the code. The status table
> at the end separates **Implemented / Tested / Validated / Production-ready**
> exactly as the proposal's §21 asks — never read "implemented" as "validated".

## 0. Goal in one sentence

An agent — an LLM, a script, an MCP client or the learner's own avatar — can
**observe** the 3D hospital, **locate** the patient and equipment,
**navigate** there, **operate** equipment through validated object actions,
perform **clinically valid simulated actions** through the existing approval
gate and deterministic engine, and **verify** the effect against authoritative
state, with an auditable trace — in the browser *and* headless.

## 1. Refinements to the proposal (and why)

| # | Proposal | Revision | Reason (from the code) |
|---|---|---|---|
| R1 | `world-agent` contracts + a browser adapter in `packages/web` | **One authoritative, headless world model** in a new pure package `@clinicalcraft/world` (no DOM, no three.js, no `node:*`), used identically by the browser, the CLI, the HTTP server, MCP and the benchmark. three.js becomes a *view* (animation), an *input device* (the human avatar's pose) and a *sensor* (camera frames). | Reproducible benchmarks with fixed seeds, CI, and MCP access without a browser all need the world to run headless. A browser-only adapter would make every embodied test a Playwright test and make MCP depend on an open tab. |
| R2 | Reuse `ColliderGrid`, A\*, raycasting | The collision model is **derived from facility data by a pure function** (`buildCollisionModel`) that the renderer consumes too. Walls, partitions, windows, doors, solid equipment, NPC bodies and trees come from one place. | Today colliders are created inside the mesh builders (`structures.ts`, `equipment.ts`, `terrain.ts`, `index.ts`). A headless world that re-implemented them would drift; deriving once gives parity by construction (plus a parity test). |
| R3 | A separate World Action API next to the clinical tools | Embodiment is a **session mode** (`embodiment: "clinical" \| "embodied"`, fixed per encounter). In embodied mode the *existing* clinical tools (`ask_patient`, `examine`, `check_vitals`, `order_test`, `read_result`, `intervene`) are **spatially gated** (before the approval gate *and* again immediately before the engine commit), and a small set of world tools is added. Object operations with a clinical effect run the clinical tool **through the same tool path** (hooks → precheck → approval → engine). | "Do not allow a model to bypass denied actions by switching from a clinical tool to a world-interaction tool" (§15.1) is only guaranteed if there is exactly one path to a clinical effect. |
| R4 | `expectedWorldVersion` | **Per-entity optimistic concurrency** (`expectedTargetVersion`), with the global `worldVersion` kept for ordering and optional strict checks. | The human avatar streams poses at ~10 Hz; a global-version check would make every agent action fail spuriously while anyone moves. |
| R5 | `SpatialClinicalActionGate` | **Spatial requirements are data** (`SpatialRequirement`), derived from semantics the content already has: investigation/intervention `requires` capabilities, intervention `kind`, the bedside rule of the web world (FACILITIES.md "Interaction semantics"). Facilities may override. Every refusal carries a stable code and a **navigation hint** (a goal the agent can pass to `navigate_to`). | The web UI already enforces these rules ad hoc (`app/stations.ts`); making them a shared policy lets the CLI/MCP/LLM path be held to the same rules and gives agents actionable failures (mineflayer-pathfinder style). |
| R6 | Equipment state machines | Device behaviours are **declarative** (catalog JSON, no code). **Device states that mirror clinical facts are derived from the engine, never stored** (e.g. "monitor attached" ⇐ `monitorAttached(case, state)`); only physical state (power, leads on, cart position, door open, reservations) is stored in the world. | Two stores for one fact diverge on resume, replay and rejection. The engine stays authoritative for every clinical outcome (§4.3). |
| R7 | Visibility and information boundaries | Observations label each entity with an **awareness level** — `visible` (field of view + line of sight + range), `nearby`, `remembered` (seen earlier by this actor), `mapped` (on the public hospital directory). Patients expose only what a bystander sees (name tag, posture, visible distress, oxygen mask); monitors expose their screen only when visible and attached (same function as `check_vitals`). | Grounding rule (ARCHITECTURE §2.1) extended to space: a CT scanner can be *known* to be in Radiology without being visible from the ED; a visible patient never reveals unread results. |
| R8 | Movement time vs clinical time (§8.5) | **Travel costs simulated time explicitly**: a completed navigation dispatches `advance-time { reason: "travel" }` for `pathLength / walkSpeed × clock.realtimeScale` (static clocks: free). In the browser, real-time ticks are paused while an *agent* drives a body, so walking costs the same in both runtimes. | The web currently advances the clock only by real-time ticks while no panel is open — an autopilot walk with the autopilot panel open was a zero-time action. |
| R9 | Skill library (Voyager) | **Skills are declarative workflows** (JSON) whose steps are tool calls and whose success is checked by **postconditions in the existing Condition DSL** plus world predicates. Model-proposed skills are validated data, never code, and execute through the normal tool path. | Verifiable by construction; no `eval`; the same gate applies. |
| R10 | Room templates, multiple floors | **Templates are an authoring-time macro** compiled (`compileFacility`) into today's flat facility format, so renderer, navigation and tools need no template awareness. Levels (`levels`, `level`) and `connectors` (stairs, elevator, ramp) are **additive optional fields** — existing facilities stay valid without a migration; a breaking change would bump `clinicalcraft/facility@2` with a pure migration. | Keeps `clinic-v4` and `general-hospital` byte-identical and every existing tool working. (`floor` is already taken: it is the floor *material*.) |
| R11 | Benchmark | The benchmark **separates infrastructure validation** (reference replay, scripted agents — must be 100%) from **model competence** (live models, reported with Wilson 95 % intervals over seeds). Live runs need explicit flags and a spending cap and never run in CI. | Offline replay proves the plumbing, not reasoning (§16.3). |
| R12 | Open-source dependencies | Mineflayer, mineflayer-pathfinder, mineflayer-statemachine, Voyager, AI2-THOR and VirtualHome are **design references** (API shapes, goal semantics, object-state vocabularies). `navcat`, `recast-navigation-js`, `Yuka` and `three-mesh-bvh` are **evaluated, not adopted** in v1: the grid A\* already meets the navigation targets at current scale (measurements in §11); the `NavigationBackend` interface keeps the door open. `GLTFLoader` (ships with three) is adopted. | §19: "verify maintenance, license, bundle impact… avoid redundant navigation implementations." |
| R13 | MCP SDK v2, browser bridge | Keep the existing MCP server (no SDK rewrite); add **tool annotations** (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`); expose embodied tools over a **headless world** per MCP session; bridge to a **live browser world** through the existing authenticated HTTP server (session registration, SSE command channel, correlation ids, timeouts, dedupe, expiry). | §14.4 asks for incremental adoption; the server already has auth, SSE and transcripts. |

## 2. Architecture

```
                    learner · instructor · LLM agent · MCP client · benchmark runner
                                              │
                ┌─────────────────────────────▼──────────────────────────────┐
  agent runtime │ ClinicalSession (embodiment: clinical | embodied)          │
  (@cc/agent)   │  tools: clinical (spatially gated) · world · skills         │
                │  approval gate · hooks · transcripts · traces               │
                └──────┬───────────────────────────────┬─────────────────────┘
                       │ WorldPort                      │ ClinicalPort (tool path)
                ┌──────▼───────────────────────────────▼─────────────────────┐
  world model   │ @clinicalcraft/world  (pure, deterministic, headless)       │
                │  registry ─ collision ─ navigation ─ visibility ─ policy    │
                │  state store (versioned) ─ action bus ─ devices ─ traces    │
                └──────┬───────────────────────────────┬─────────────────────┘
                       │ Mover / Sensor (optional)      │ reads
          ┌────────────▼──────────┐          ┌─────────▼──────────────────┐
          │ three.js renderer     │          │ @clinicalcraft/core engine │
          │ (web: view + human    │          │ (authoritative clinical    │
          │  input + camera)      │          │  outcomes, physiology)     │
          └───────────────────────┘          └────────────────────────────┘
```

* **Static layer** (immutable per encounter): facility (compiled), catalogs,
  levels, collision model, navigation grids, semantic registry.
* **Physical layer** (`WorldStateStore`, versioned): actor poses, device
  states, door states, portable equipment positions, held items,
  reservations, per-actor memory, dynamic obstacles, event log.
* **Clinical layer** (core engine, authoritative): history, exam, orders,
  results, interventions, physiology, decisions, scores.

The **action bus** is the only writer of the physical layer. A world action
with a clinical effect is committed in this order:
`validate → resolve target → authority → preconditions (state, reservation)
→ spatial (range, reachability, visibility) → clinical tool via the session's
tool path (hooks, precheck, approval) → re-validate spatial + target version
(TOCTOU) → engine commit → device transition → events → result`. If the
engine rejects or the approval is denied, no device transition is committed.

## 3. Identifiers and entities

Agent-facing ids are stable, readable and prefixed by kind:

| kind | id | source |
|---|---|---|
| `equipment` | `eq:<placementId>` | facility placement |
| `patient` | `patient:<slotId>` | case bound to a patient slot |
| `staff` | `staff:<staffId>` | facility staff (also controllable actors) |
| `actor` | `actor:<name>` | embodied agents/players; the learner's avatar is `actor:clinician` |
| `room` | `room:<roomId>` | facility room |
| `door` | `door:<ownerId>:<side>:<n>` | building/partition openings (same ids as the renderer's door records) |
| `level` | `level:<levelId>` | facility level (default `L0`) |
| `connector` | `connector:<id>` | stairs / elevator / ramp |
| `item` | `item:<id>` | handheld items (portable equipment carried by an actor) |

Tools accept an unprefixed placement id when it is unambiguous. three.js
objects, mesh indices and instance indices are never agent-facing.

## 4. Perception

Read-only tools (embodied mode): `observe_world`, `get_agent_state`,
`find_entities`, `find_objects`, `inspect_object`, `get_nearby_objects`,
`get_visible_objects`, `get_room_info`, `get_action_feedback`, and
`get_camera_frame` (browser runtime + vision-capable model only).

* Visibility = within `visibilityRange` (default 15 m) **and** inside the
  horizontal field of view (default 120°) **and** line of sight on the
  occlusion grid (walls, partitions, closed doors and solid equipment taller
  than eye height block; windows do not). Interaction additionally needs line
  of sight (no operating a workstation through a partition).
* Reachability is computed separately (path exists for this actor's role,
  respecting restricted areas, locked doors and dynamic obstacles).
* Observations are bounded (`maxEntities`, nearest first, `truncated` flag)
  and localised; they never contain case answers, unread results, debrief
  content, decision options or hidden engine fields.

## 5. Actions

State-changing world tools: `navigate_to` (goal), `approach_object` (entity →
best interaction point), `look_at`, `interact_object` (entity, operation,
parameters), `cancel_action`; delegation: `delegate_task`; skills:
`execute_skill`. Operations offered by an object are listed in its
`availableActions` (they depend on its behaviour and current state): e.g.
doors `open`/`close`/`lock`/`unlock`; workstations `order`/`read`; monitors
`attach`/`read`/`cycle_nibp`; ECG cart `prepare`/`connect`/`record`/`reset`;
carts `move_to`; handheld items `pick_up`/`put_down`/`equip`; sinks
`wash_hands`. A CT scanner never advertises `pick_up`; a door never
advertises `order`.

Every request carries an `actionId`; a retried request with the same id
returns the recorded result (idempotency). Stable error codes:

```
navigation   TARGET_NOT_FOUND TARGET_NOT_REACHABLE PATH_BLOCKED STALE_DESTINATION
             MOVEMENT_INTERRUPTED NAVIGATION_TIMEOUT ACCESS_DENIED NO_INTERACTION_POINT
interaction  INVALID_REQUEST UNKNOWN_ACTOR OPERATION_NOT_SUPPORTED PRECONDITION_FAILED
             NOT_IN_RANGE NOT_VISIBLE NOT_AUTHORIZED DEVICE_BUSY DEVICE_UNAVAILABLE
             STALE_STATE HANDS_FULL NOT_HOLDING CANCELLED
clinical     SPATIAL_REQUIREMENT_UNMET SPATIAL_PRECONDITION_CHANGED CLINICAL_REJECTED
             APPROVAL_DENIED
```

## 6. Spatially grounded clinical operations

Default policy (data in `@clinicalcraft/world`, overridable per facility):

| clinical action | requirement | notes |
|---|---|---|
| `ask_patient` (history), companion | `near-patient` 3 m + line of sight | conversation range |
| `examine` | `at-patient` 1.5 m (+ bedside providers for non-personal-kit capabilities) | contact |
| `check_vitals` | any of: `near-patient` 6 m + LOS (monitor screen / bedside obs); `at-provider` `records` (chart) | |
| `order_test`, `read_result` | bedside capabilities (`ecg-12lead`, `point-of-care`, `ultrasound`, `peak-flow`, `scale`, …): `bedside-provider` (device within the bedside radius of the patient **and** actor at the patient); other capabilities: `at-provider` (workstation/device providing every required capability, within reach, line of sight); no capability: anywhere | ordering bloods at the lab workstation does not require standing at the analyser |
| `intervene` kind `medication` `fluid` `oxygen` `procedure` `positioning` `airway` `monitoring` `other` | `bedside-provider` for its capabilities (e.g. defibrillator, infusion pump, O₂ outlet must be at the bedside; a cart may be wheeled there) + actor `at-patient` | |
| `intervene` kind `consult` `disposition`, `consult`, `delegate_task` | anywhere (phone/pager) | delegated staff walk physically |
| `answer_decision`, `update_workup`, `wait`, `set_phase`, `finish_case`, `list_options`, `case_status` | anywhere | cognitive |

Ranges are measured from the actor to the target's footprint (not its
centre). Refusals return `SPATIAL_REQUIREMENT_UNMET` with the unmet
requirement and a `hint.goal` (e.g. `{ kind: "interact", id: "patient:resus-1" }`).
The check runs before the approval gate (no approval prompt for an impossible
action) and again immediately before the engine commit (the actor may have
moved while an approval was pending): `SPATIAL_PRECONDITION_CHANGED`.
A failed embodied operation never falls back to the non-spatial path.

In the browser the human avatar is held to the same policy; the web layer may
auto-approach (a short animated step, ≤ the 5.5 m aim reach) before
submitting an action the learner started from a panel.

## 7. Navigation

`NavigationBackend.plan(request)` with mineflayer-pathfinder-style goals:
`point` (GoalNear), `entity` (near an entity), `interact` (GoalReachable /
GoalAdjacent: the best free interaction point within the object's reach, with
line of sight, facing it), `room` (GoalRoom), `follow` (GoalFollowEntity,
one-shot), `look` (GoalLookAt: a cell with line of sight within range) and
`any` (composite: best satisfiable). The default backend is the existing grid
A\* (0.5 m cells, corner-safe diagonals, string-pulled paths) per level, with
a portal graph across `connectors` (stairs, elevators, ramps; accessibility
and role restrictions) and restricted `access` zones. Dynamic obstacles and
moved carts update the grid locally. Metrics per navigation: requested goal,
route, length, replans, travel time, arrival error, failure code.

## 8. Devices, authority and multi-agent work

* Built-in behaviours per interaction kind (workstation, monitor, device,
  door, sink, storage, bed) plus optional declarative `behavior` state
  machines on equipment types (states, operations with `from`/`to`, world
  preconditions, an optional clinical effect, duration, reservation).
* Actor roles (`clinician`, `nurse`, `radiologist`, …) map to permitted
  operations and clinical tools; delegated tasks (`delegate_task`) are
  executed by staff actors through the same action bus and report a
  structured completion. Device reservations prevent two actors from running
  the same device; a busy device returns `DEVICE_BUSY`.
* Staff movement is deterministic path following (no LLM per frame).

## 9. Skills

Declarative workflows (`SkillDefinition`): parameters, required tools,
preconditions, steps (tool calls with templated arguments, retry/recovery
policy), postconditions (Condition DSL + world predicates), safety class,
cancellation. Built-in skills: `locate_patient`, `approach_patient`,
`wash_hands`, `fetch_equipment`, `perform_bedside_exam`, `perform_ecg`,
`attach_monitor`, `obtain_result`, `review_imaging`,
`administer_treatment`, `reassess_patient`. Project skills live in
`.clinicalcraft/skills/*.json`. A skill succeeds only when its
postconditions hold in authoritative state.

## 10. Traces

`EpisodeTrace` (JSONL) links typed spans —
`observation → plan → navigation → interaction → clinical_action →
state_change → verification → assessment` — with action ids, world/target
versions, clinical event ids and simulated/real time. Embodied sessions
write world snapshots into their transcript so `--resume` restores the
physical state.

## 11. Content scale, facilities and assets

* Case **index** (metadata only) generated at build time; full cases load
  lazily (per-case chunks in the web bundle; paginated, filterable, ETag'd
  server API with bounded concurrency). Targets 100/500/1 000 cases are
  measured with a synthetic catalogue (transfer size, parse time, memory,
  startup and case-switch latency) — not assumed.
* Facilities: `levels`, `connectors`, `access` zones, per-entity `level`;
  room **templates** compiled into flat facilities; equipment `portable`,
  `reach`, `interactionPoints`, `behavior`, and optional `model` (GLB/glTF
  with sha256, scale, offset, licence and attribution; voxel parts remain the
  fallback and the collider is always the semantic footprint — a model is
  never interactive by itself).

## 12. MCP and the browser bridge

MCP tools carry annotations. `start_case { embodied: true }` creates a
headless world for that MCP session. `clinicalcraft mcp --attach <server>`
forwards world and clinical tools to a **registered live browser session**
through the HTTP server (token-authenticated registration, SSE command
channel, correlation ids, acknowledgements, timeouts, cancellation,
dedupe, expiry). World actions are rejected when no matching session exists.

## 13. Benchmark

`clinicalcraft bench` runs scenario suites (perception, spatial reasoning,
navigation, interaction, clinical workflow, recovery, multi-agent, safety)
with fixed seeds, records every tool call and result, evaluates from
authoritative state and reports success rates with Wilson 95 % intervals,
tool calls, tokens, latency, spatial-rule violations and unauthorised-action
acceptance. Agents: `reference` (scripted, must score 100 % — infrastructure
validation), `scripted-llm` (mock provider — harness validation) and live
models (opt-in, budget-capped, never in CI).

## 14. Roadmap and status

The status table is filled in as work lands (see the end of this file).
