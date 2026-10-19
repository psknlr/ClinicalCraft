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

**Implemented (static layer, `@clinicalcraft/world`).**
`buildRegistry(facility, catalogs, binding, collision)` returns the
`SemanticRegistry` of an encounter: levels, rooms, doors, connectors,
equipment placements, the bound patient and the staff, each with its
localized `name` (`LocalizedText`), `level`, `room` (declared, else the
smallest room containing it on its level), `position` (level elevation added
to `y`), `rot`, rotated `footprint`, `capabilities`
(`placementCapabilities`), interaction kind, `portable`, `reach`, declared
`interactionPoints` (world coordinates) and tags. `resolveId(alias)` accepts
prefixed ids, unprefixed placement / staff / slot / room / level /
connector / door ids that exactly one entity has, and `"patient"`; an
ambiguous alias (room `consult-1` and the patient in slot `consult-1`)
resolves to null. Ids are unique in both built-in facilities (tested).

* Door ids: `door:<owner>:<side>:<n>` numbers the doors of one owner side in
  build order (`facilityWalls`); a building spanning several levels gets
  `door:<building>@<level>:<side>:<n>` off the default level. Without the
  `door:` prefix the id is the renderer's door record id (`clinic:s:0`).
* Public descriptors (bystander view): patient — `{ name, tag, posture }`
  (display name, age/sex tag such as "58 years male" / "58岁男性", posture)
  and nothing else from the case; staff — `{ role, name }`. Patients lying on
  their slot's bed are centred on it and span its footprint.
* Default `reach` (m from the footprint) when the equipment type has none
  (core `DEFAULT_REACH`): workstation 1.2, monitor 2 (reached from the
  bedside), bed 1.5, device 1.2, atlas 1.5, board 2.5, craft 1.2, door 1.2,
  sink 1, storage 1, staff (`talk`) 2, none 1; the patient uses the contact
  range 1.5. The wall oxygen outlet declares 2.2 (reached over the bed head).
  Navigation never plans closer than one cell beyond the collider inflation:
  effective ranges are at least `MIN_RANGE` = 0.88 m.

Contract refinements made while implementing the static layer (semantics
unchanged): `ColliderKind` adds `sign` (the post of a free-standing sign —
the renderer collides with it); `DoorSpec` adds `height`, `owner`, `side`
and the doorway `area`; `CollisionModel` adds `walls` (the `WallSpec` layout
both the renderer and the model are built from); `SemanticEntity` adds
`interactionPoints`; `NavRequest` adds `accessibleOnly` (no stairs: pushing a
cart, a bed or a wheelchair); `WorldDynamics` is the read interface the
grids use for door states, obstacles, displaced/removed entities and actor
poses; `ActorRole`, `WorldPredicate`, `ClinicalEffect`, `BehaviorOperation`
and `DeviceBehavior` are now the core zod-inferred types of the catalog
schema.

Contract refinements made while implementing the dynamic layer (additive):
`WorldRuntimeOptions.port` (the session's `ClinicalPort`: the bus had no way
to reach the tool path) and `trace` (a `TraceSink`, implemented by
`TraceRecorder`); `checkSpatial(actor, intent, { recheck })` (the session's
re-check before the engine commit reports `SPATIAL_PRECONDITION_CHANGED`);
`SpatialCheck` failures carry `details` (distance, range, missing
capabilities, providers); `SpatialRequirement` `at-provider` takes
`fixedOnly` (§6); the event `entity.availability` (scenario availability
changes); `SightTarget.id` (a door never hides itself, §4). Actors' versions
live in `WorldStateSnapshot.entities[actorId].version` like any entity's.

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
  Implemented as `VisibilityModel`: 0.25 m occlusion grids per level from
  the collision model's `opaque` colliders that span the eye height (1.62 m
  above their floor) — so the lintel over a doorway, a window's sill and
  low furniture do not hide anything, while terrain trees and build-zone
  blocks do; door leaves occlude while the door is closed (state read at
  query time); a displaced cart occludes where it stands after
  `invalidate(area)`. `canSee(pose, entity)` samples the footprint (centre
  and four corners inset to ¾) — partial occlusion still counts as visible
  — and a target never hides itself (the ray stops at its footprint). Yaw 0
  looks towards −Z (the renderer's convention).
* Reachability is computed separately (path exists for this actor's role,
  respecting restricted areas, locked doors and dynamic obstacles).
* Observations are bounded (`maxEntities`, nearest first, `truncated` flag)
  and localised; they never contain case answers, unread results, debrief
  content, decision options or hidden engine fields.

**Implemented (dynamic layer, `perception.ts`).** `observe`, `find`,
`inspect`, `roomInfo`, `canSee` of `WorldRuntime`; every entity is labelled
with what the actor knows of it:

| awareness | rule |
|---|---|
| `visible` | same level, within `visibilityRange` (15 m) of the footprint, inside the field of view (120°) with line of sight (`VisibilityModel.canSee`); an item in hand; the room one stands in |
| `nearby` | same level, within `nearbyRange` (8 m), line of sight in any direction — what one notices by turning round, never through a wall |
| `remembered` | seen earlier by this actor (`ActorState.seen`) |
| `mapped` | the public directory: rooms, doors, connectors, fixed interactive equipment (workstations, devices, monitors, boards, atlases, craft benches, sinks) and the encounter's patient (the clinician knows which bed). Never portable equipment, staff or other actors |

* `observe` lists perceived entities (visible, nearby) nearest first, then
  remembered ones nearest first — at most `maxEntities` (40), `truncated`
  when more; mapped ones are for `find` (default: every awareness level;
  filters by kind, type, capabilities, name in either language, room, level,
  distance, `visibleOnly`, `reachableOnly`; sorted by walking distance) and
  `roomInfo` (a room, its exits through doors, what the actor knows in it).
  `recentEvents`: the last 8 events, task bookkeeping left out.
* Each `ObservedEntity` carries distance to the footprint, bearing relative to
  the facing (+ = right), `inReach` (within reach with line of sight),
  `reachable` / `pathDistance` (a Dijkstra flood of the planner's grid per
  actor cell, role and allowed zones, cached; an entity counts as reachable
  when one of its interaction cells — the planner's rule — is flooded and has
  line of sight to it; another level: `null`), the behaviour `state`
  (`out-of-service` when a scenario took it out), `stateVersion` and
  `availableActions`.
* Cues: the patient's — `ClinicalView.cues(slot)` (posture, distressed,
  accessory, speaking) — only while perceived; a monitor's `screen` /
  `alarms` — `ClinicalView.bedside()`, the `check_vitals` snapshot in one
  line (`screen.ts`) — only while the monitor is visible, within the 6 m
  screen range, the patient's monitor and attached; a case without physiology
  shows "no reading recorded", never the placeholder vitals. Tested for all
  10 built-in cases in both languages: a JSON-stringified observation, search,
  inspection or room report never contains a history answer, finding, result
  text, diagnosis or decision option of the case.
* Memory and versions: `observe` / `find` / `inspect` / `roomInfo` record the
  entities they report as `visible` in the actor's memory; a navigation
  records what is visible on arrival (`actor.discovered`). Memory changes no
  version and emits no event, so read-only tools are idempotent with respect
  to `version` (`canSee` records nothing).
* Fix to the static layer found here: a closed door hid itself (its leaves
  are rasterised thin-safe, ±0.25 m, wider than its 0.2 m footprint), so no
  door had an interaction point and no door could be operated. `SightTarget`
  takes the target's `id`; a door's own leaves never hide it (regression
  tests in `visibility.test.ts` and `nav/backend.test.ts`).
* Measured (general-hospital, same machine as §7): `observe` at the resus
  bedside 1.5 ms median (the first call of a new actor cell builds the
  flood: ≤ 70 ms), `find {}` 7 ms, `checkSpatial` 0.1 ms with a warm flood.

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

**Implemented (dynamic layer, `actions.ts`, `effects.ts`).**
`execute(request, signal)` commits in this order:

| step | refusal |
|---|---|
| 1. idempotency: a recorded action id returns its recorded result; an id still running returns the same promise | — |
| 2. request and goal shape; the actor | `INVALID_REQUEST`, `UNKNOWN_ACTOR` |
| 3. per-actor queue: one actor's actions run one at a time, in order; actors run concurrently | `CANCELLED` (aborted while queued) |
| 4. `expectedWorldVersion` (strict), then `expectedTargetVersion` (per entity) | `STALE_STATE` |
| 5. target (`resolveId`: prefixed ids, unprefixed aliases, `patient`, `clinician`) | `TARGET_NOT_FOUND` |
| 6. operation offered by the target's behaviour | `OPERATION_NOT_SUPPORTED` |
| 7. authority (§8), availability, reservation, state, preconditions | `NOT_AUTHORIZED`, `DEVICE_UNAVAILABLE`, `DEVICE_BUSY`, `PRECONDITION_FAILED`, `HANDS_FULL`, `NOT_HOLDING` |
| 8. spatial: range from the current footprint, same level, line of sight | `NOT_IN_RANGE`, `NOT_VISIBLE` (+ `hint` when a route leads there) |
| 9. clinical effect: item selection, the §6 policy, the device locked while `ClinicalPort.invoke` runs the tool (hooks, precheck, approval, engine) | `SPATIAL_REQUIREMENT_UNMET`, `APPROVAL_DENIED`, `CLINICAL_REJECTED`, `CANCELLED` — none commits a transition |
| 10. commit: device transition and reservation, physical effects, events, time, the result (recorded; `action.completed` closes it) | — |

* Navigation operations — `navigate {goal}`, `approach {target}` (its best
  interaction point), `look_at {target}` (a vantage point facing it), and a
  cart's `move_to {goal}` (accessible route; the cart is parked on a free
  cell within 1.25 m — else 2 m, 3 m — of the actor, nearest the goal's
  target, never in a doorway): plan with the backend, move with the `Mover`
  (default: instant), commit the reported pose, emit `actor.moved`,
  `actor.entered-room`, `actor.discovered`, charge `elapse(travelSeconds,
  "travel")` once, return a `NavigationRecord` (goal, path, length walked,
  replans, travel seconds, arrival error, failure code). Interrupted
  (`cancel(actorId)`, the signal, a mover stopping short): `cancelled` with
  `MOVEMENT_INTERRUPTED`; the partial pose is kept and the part walked is
  charged.
* Time: physical operations charge their `durationSeconds`
  (`elapse(…, "procedure")`); an operation with a clinical effect charges
  nothing itself — the engine's action cost (`clock.actionCosts`) is the time
  of the clinical act. Failed actions change no version and charge nothing.
* Results are recorded whatever their status (a window of 128): retry a
  transient failure (`DEVICE_BUSY`) with a new action id. Refusals that can be
  fixed by walking carry a `hint` verified by planning; when no route leads
  there the hint is null and the message names the planner's code.
* Versions (R4): the global `version` steps with every committed change by
  the bus or a scenario control; every entity (actors included) has its own
  counter, bumped only when that entity changes; a sensor `updatePose` bumps
  only the actor's own counter — so another actor walking, or the human
  turning, never stales a device action that pins `expectedTargetVersion`.
  Memory, tasks, events, results and in-flight device locks bump nothing.
* TOCTOU: the bus checks the §6 policy before invoking; the re-check
  immediately before the engine commit belongs to the session's tool path
  (`checkSpatial(actor, intent, { recheck: true })` →
  `SPATIAL_PRECONDITION_CHANGED`). Once the engine committed, the device
  transition is committed too (the clinical fact happened).
* Scenario controls: `setObstacle` (grids re-stamped locally),
  `setAvailability` (an out-of-service device offers nothing and provides no
  capability to the policy; event `entity.availability`), `setDoor` (locking
  implies closing; a lock change re-stamps the doorway).
* Snapshots (`WorldStateSnapshot`, `state.ts`) are canonical JSON — keys
  sorted at every level, actors by id — so the same history gives the same
  bytes; `createWorldRuntime({ snapshot })` restores them (grids and occlusion
  read the restored doors, obstacles, moved carts and carried items) and
  `snapshot()` reproduces them exactly. The engine's state is not part of it
  (derived device states are re-read from the restored session).

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

**Implemented (`policy.ts`: `DefaultSpatialPolicy`, `SpatialChecker`).** The
table above, made concrete:

| clinical action | requirement (implemented) |
|---|---|
| `ask_patient` | `near-patient` 3 m + line of sight |
| `examine` | `at-patient` 1.5 m; a finding needing capabilities beyond the personal kit (`PERSONAL_KIT`): `bedside-provider` for them |
| `check_vitals` | `any-of` `near-patient` 6 m + line of sight · `at-provider` `records` |
| `order_test`, `read_result` | no capability: anywhere · personal kit only: `at-patient` · all in `BEDSIDE_CAPABILITIES`: `any-of` `bedside-provider` · `at-provider` with `fixedOnly` · otherwise `at-provider` |
| `intervene` `consult` / `disposition` | anywhere |
| `intervene` other kinds | nothing beyond the personal kit: `at-patient` 1.5 m · otherwise `bedside-provider` |
| `consult`, `delegate`, cognitive tools; unresolved items | anywhere (`examine` without a finding: `at-patient`) |

* `BEDSIDE_CAPABILITIES` = `ecg-12lead`, `point-of-care`, `ultrasound`,
  `echocardiography`, `peak-flow`, `scale`, `cardiac-monitor`, `capnography`,
  `oxygen`, `suction`. Refinement: a bedside test may also be requested at a
  **fixed** provider of it (`at-provider` + `fixedOnly`: the radiology
  console for a formal ultrasound, the triage peak-flow station, the V4
  clinic's imaging workstation) — as the web's order entry allows — but never
  at a portable device standing elsewhere (that one must be wheeled to the
  patient). Without it `pediatric-asthma` (peak flow at the triage station)
  and `smzl-lung-adeno` (ultrasound only at the imaging workstation) could
  not be completed embodied.
* `at-provider`: equipment of interaction kind workstation / device /
  monitor providing every capability (stations.ts `providersOf`), in service,
  where it stands now, within its reach (≥ `MIN_RANGE`) with line of sight.
* `bedside-provider`: each capability provided by an in-service placement of
  any kind at the bedside — within `BEDSIDE_RADIUS` (6 m) of the slot point
  or in the slot's room (stations.ts `atBedside` / `bedsideCaps`; a moved cart
  counts where it stands, a carried item where its holder is) — and the actor
  within 1.5 m of the patient with line of sight.
* Reasons: `not-near-patient`, `patient-not-visible`, `not-at-patient`,
  `no-provider-in-reach`, `provider-not-at-bedside`,
  `no-provider-in-facility`, `no-patient`; `details` carry the distance, the
  range, the missing capabilities and the providers. Hints are `interact`
  goals: the patient, or the provider nearest by walking distance (another
  level or unreachable: by straight-line distance; navigating then reports
  why); a bedside capability elsewhere: the nearest portable provider to
  fetch (`move_to` it to the patient), or null when none can be brought;
  null when nothing in service provides it. `any-of` reports the option whose
  hint is nearest, preferring hints one navigation fixes over a cart to fetch.
* Property (tested over every investigation, intervention and finding of the
  10 built-in cases in their own facility, from the entrance): following the
  hint passes the check — one navigation for a patient or provider hint,
  navigation + `move_to` for a cart. The only item without a way is
  `acute-ischemic-stroke` `sich-protocol` (needs `blood-bank` at the bedside;
  the blood bank fridge is fixed in the laboratory) — not part of its
  reference solution.
* A monitor without a reachable interaction point (tested with
  `ward-monitor-1` at its position before content fix A4, wedged between the
  wall, bed 1 and its pump): the patient's `monitoring` intervention needs a
  monitor at the bedside (any in the ward room); the monitor's `attach`
  declares `patientWithin` only, so it is attached from the patient's side;
  `read` works from the 6 m screen range (a `look` hint); `cycle_nibp`
  (1.5 m) is refused with no hint and the planner's reason.

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

**Implemented (static layer): `GridAStarBackend`** over `NavGrids` built
from the collision model (EMBODIED R2), one grid per level:

* Cells are blocked where a body of radius 0.38 m (avatar 0.28 + 0.08 margin
  + 0.02, as the web autopilot) would touch a collider between 0.05 m and
  1.78 m above the floor: walls, partitions, windows, solid equipment,
  patient bodies and beds, trees, blocks, sign posts. Door leaves are
  passable unless the door is locked. **Staff bodies are not on the static
  grid** (staff walk; the mover avoids them and re-plans). Off the default
  level only the inside of the buildings spanning that level is walkable.
* Goals: `point` (exact point, or the nearest free cell inside furniture;
  with `range`, any cell within it), `entity` (range default 1.5 m),
  `interact` (free cells within `reach` of the footprint — or the declared
  `interactionPoints` — with line of sight, never inside the target; the
  cheapest to reach wins; yaw faces it), `room` (any free cell inside),
  `follow` (one-shot, on the target's current pose from
  `WorldDynamics.actorPose`), `look` (range default 15 m; line of sight,
  tested lazily on popped cells), `any` (shortest travel time).
* Multi-level: Dijkstra over a portal graph (the start and every stop of
  every usable connector; walking edges from grid floods, riding edges
  `travelSeconds` × stops) — connectors whose `roles` exclude the actor, and
  stairs when `accessibleOnly`, are not usable. Paths mark the first point
  after a ride with `via: connector:<id>`. `travelSeconds` = walking on the
  levels / `WALK_SPEED` + the connectors' seconds; `length` adds the 3D
  distance between the stops of stairs and ramps (elevators: none).
* Failures are diagnosed by relaxing restrictions: `ACCESS_DENIED` (a route
  exists without the access zones / connector role limits; `details.zones`,
  `details.connectors`, `details.role` — an actor may always leave the zone
  it stands in), `PATH_BLOCKED` (a route exists through locked doors or
  dynamic obstacles; `details.doors`, `details.obstacles`),
  `TARGET_NOT_REACHABLE` (no route at all — a connected-component check
  answers without searching), `NO_INTERACTION_POINT` (no free spot within
  reach with line of sight; a look goal without any vantage cell),
  `TARGET_NOT_FOUND`, `NAVIGATION_TIMEOUT` (A\* expansion budget, default
  200 000 per search). Messages are localised (zh-CN / en).
* `invalidate(area)` re-stamps the area (grown by the inflation radius) from
  the static colliders plus `WorldDynamics` (obstacles, displaced or removed
  entities, door locks); tests check that a local re-stamp equals a rebuild.
  The web autopilot (`walkTo`) still plans with its own grid over the
  renderer's colliders — which are now the model's.
* Used by the dynamic layer (W2): the action bus plans every navigation
  operation with the backend (carts with `accessibleOnly`), verifies refusal
  hints by planning them, and invalidates the doorway after a lock change,
  an obstacle's rect, and a moved cart's or item's old and new spots.
  Perception and hint ranking use the grids directly (`Reachability`: one
  flood per actor cell instead of an A* per entity). Every door of both
  built-in facilities now has an interaction point (a closed door no longer
  hides itself, §4).

**Measurements** (2026-10-19, Intel Xeon @ 2.10 GHz, 4 cores, Node 22.22.0;
`general-hospital`, 120 × 100 m, 614 colliders, 240 × 200 nav cells,
480 × 400 occlusion cells): collision model 8–11 ms, registry 2–3 ms, nav
grids 1–2 ms, occlusion grids 3 ms (medians of 7 builds). 20 representative
routes from the entrance (interaction points of the resus patient, ECG cart,
defibrillator, lab and pathology workstations, CT, ward ECG, ICU crash cart,
pharmacy terminal, sink; three rooms; two staff; a look goal; two points; an
`any` goal; 35–96 m) on a fresh backend: median 3.5–4.8 ms, p95 14–24 ms,
max ≤ 32 ms over 6 rounds. An unreachable target fails in < 1 ms once the
grid components are cached. `clinic-v4`: every build ≤ 1.5 ms.
Reproduce: `packages/world/src/nav/backend.test.ts` ("measurements"; asserts
only generous bounds).

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

**Implemented (`behaviors.ts`, `clinical.ts`, `authority.ts`).** Built-in
behaviours apply to equipment types without a catalog `behavior`; a catalog
behaviour replaces them (`ecg-machine`, `patient-monitor`):

| kind | states | operations |
|---|---|---|
| workstation | — | `order` / `read` — clinical `order_test` / `read_result` of parameter `investigation` (also `investigation_id`); the station must provide every capability the item requires (stations.ts `investigationsAt`); `read` takes an optional `phase` |
| monitor | `attached` / `detached`, derived: the patient's monitor (the slot's linked one, else monitors at the bedside) is attached when `monitorAttached(case, state)`; other monitors are always detached and offer nothing | `attach` (detached; device at the bedside, actor within 1.5 m of the patient; `intervene` of the case's monitoring intervention — the first `intervened` id of `physiology.monitor.attachedWhen`, else the first monitoring intervention the device provides; 60 s), `read` (attached; within 6 m with line of sight: the screen), `cycle_nibp` (attached; within 1.5 m; physical, 45 s) |
| device | — | `use` — parameter `investigation` → `order_test`, or `intervention` → `intervene`; the item's requires must intersect the device's capabilities (stations.ts `deviceActions`); the §6 policy decides where |
| door | `open` / `closed` / `locked` (the door record) | `open` (closed), `close` (open; nobody in the doorway area), `lock` (closed → locked), `unlock` (locked → closed) |
| sink | — | `wash_hands`: hand hygiene valid for 30 simulated minutes (`handsCleanUntil` = clock + 30), event `hygiene`, 30 s |
| storage | `closed` / `open` (stored) | `open`, `close` |
| bed, board, atlas, craft, none; people, rooms | — | none |
| + `portable: "cart"` | — | `move_to {goal}` (§5) |
| + `portable: "handheld"` | `held` / `equipped` while carried | `pick_up` (in reach, at most `MAX_HELD` = 2 → `HANDS_FULL`), `put_down` (on a free spot in front), `equip` (`NOT_HOLDING` unless carried) |

Catalog operations: `select: "capability"` takes the first case item whose
non-empty requires the device provides (the ECG cart's `record` → the case's
12-lead ECG; a parameter may pick another such item). Built-in effects attach
by name to catalog behaviours too (a monitor's `read` shows the screen).

* Predicates: `actorWithin` / `patientWithin` are checked in the spatial
  phase (`NOT_IN_RANGE` / `NOT_VISIBLE` + hint: the interaction point when the
  reach is enough, else a `look` goal with that range); `state`, `role`,
  `handsClean`, `actorHolding` and `deviceAtBedside` are preconditions
  (`PRECONDITION_FAILED`; `deviceAtBedside` hints a portable device to
  fetch). An operation that declares neither `actorWithin` nor
  `patientWithin` must be done within the entity's reach.
* `availableActions` lists the operations valid now for the actor — state,
  role, availability, reservation, preconditions — not position (`inReach`
  says that); `inspect` lists every operation with `available` and the reason
  (spatial included).
* Reservations: an operation with `reserve` holds the device for the actor
  until one with `release` (`reservation.changed`); while an operation's
  clinical tool runs, or a cart is pushed, the device is locked in memory
  (not persisted). Anyone else gets `DEVICE_BUSY`.
* Authority — each operation has a class; a role holds classes; an
  operation's own `roles` narrow it further (`NOT_AUTHORIZED`):

| class | operations |
|---|---|
| `move` | navigate, approach, look_at, cancel |
| `physical` | open / close (doors, storage), wash_hands, move_to, pick_up, put_down, equip, device operations without a clinical effect |
| `secure` | lock, unlock |
| `clinical` | every operation with a clinical effect |

| role | move | physical | secure | clinical |
|---|:-:|:-:|:-:|:-:|
| clinician (the learner's avatar) | ✓ | ✓ | – | ✓ |
| nurse, attending, paramedic, radiologist, pathologist, lab-tech, pharmacist | ✓ | ✓ | – | ✓ |
| porter, receptionist (facilities / front desk: they hold the keys) | ✓ | ✓ | ✓ | – |

  The clinical class only lets an actor ask for a clinical effect; the
  session's tool path (hooks, approval, practice scope) still decides.

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

**Implemented (`trace.ts`).** `TraceRecorder` (injected `now`, simulated
`clock` and `newId`; `start(kind, name, …).end({ ok, … })`, `add(span)`,
`spans()`, `trace()`, `toJsonl()` — a header line `{format, episodeId,
caseId, facilityId, embodiment}`, then one span per line in recording order;
optional `maxSpans`). Given `WorldRuntimeOptions.trace` (a `TraceSink`), the
runtime records every action — a root span (`navigation` for navigate /
approach / look_at / move_to, else `interaction`; refs: action id, entities,
error code; data: status, navigation telemetry, elapsed seconds) with
children `clinical_action` (tool, ok, clinical event ids) and `state_change`
(the committed event types and entities) — and an `observation` span for
`observe`, `find` and `inspect` (`recordActionSpans` does the same for any
sink). Plan, verification and assessment spans belong to the session and
the benchmark. A deterministic run gives byte-identical JSONL (tested).

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

### Measured content scale

How it is built (PROTOCOL §2, §7, §11): one index-entry builder
(`caseIndexEntry`, agent `library.ts`) feeds the web bundle (a Vite plugin
serves the index as `virtual:clinicalcraft/case-index`; every full case is
its own lazy chunk), `clinicalcraft serve` (`GET /api/content/cases`,
paginated and filtered, strong ETags; cases validated on first request) and
`clinicalcraft cases index`.

Measured 2026-10-19 with
`npx tsx --conditions=source scripts/bench/content-scale.ts --cases 100,500,1000`
(defaults: 300 listing requests and 100 full-case loads per size) on an
Intel Xeon @ 2.10 GHz, `nproc` 4, 15.7 GiB RAM, Node v22.22.0, Linux 6.18.
The synthetic catalogue is the 10 built-in cases cloned round-robin with new
ids and titles (pretty-printed JSON, 0.26 MiB per case), written under the OS
temp directory and deleted afterwards; each size runs in a fresh process.
Clones compress far better than varied cases, so the gzip figures are a
lower bound. These are the numbers of that run on that machine — nothing
below is extrapolated.

**Web bundle** (`vite build`, the 10 built-in cases; commit 917df5e
compared with the same tree plus only the index and lazy loading):

| | before | after |
|---|---:|---:|
| main chunk (entry) | 2,600,518 B (gzip -9: 839,670 B) | 812,873 B (253,962 B) |
| `materials` chunk (modulepreload, unchanged) | 1,073,784 B (282,473 B) | 1,073,784 B (282,473 B) |
| initial JS (entry + modulepreload) | 3,674,302 B (1,122,143 B) | 1,886,657 B (536,435 B) |
| full cases | inside the main chunk | 10 lazy chunks of 85,313–226,242 B (27,498–72,949 B gzip), 1,815,662 B in all |
| bundled index (10 cases) | — | 14.3 KiB (5.1 KiB gzip) |

**Index** (`CaseIndexer` over the synthetic directory only):

| cases | case files | cold build (stat + read + hash + build) | re-stat, nothing changed | index JSON raw / gzip | `JSON.parse` of it | rss / heapUsed after indexing (before) |
|---:|---:|---:|---:|---:|---:|---|
| 100 | 26.1 MiB | 326 ms | 5.2 ms | 145.0 KiB / 8.6 KiB | 0.82 ms | 151.6 / 24.1 MiB (136.4 / 23.3 MiB) |
| 500 | 130.4 MiB | 1,453 ms | 17.9 ms | 725.9 KiB / 21.5 KiB | 1.86 ms | 169.2 / 25.4 MiB (134.3 / 23.3 MiB) |
| 1 000 | 260.9 MiB | 2,491 ms | 31.4 ms | 1,451.9 KiB / 36.4 KiB | 5.69 ms | 179.4 / 28.8 MiB (139.4 / 23.4 MiB) |

**Server** (`clinicalcraft serve` on a free local port, only the synthetic
directory, keep-alive, sequential requests; p50 / p95 in ms). Listing =
`GET /api/content/cases` over a fixed mix of pages (`limit` 20/50/200) and
filters (`q`, `specialty`, `setting`, `locale`); full case =
`GET /api/content/cases/:id`; the first load reads, validates
(`parseCase`) and serialises the case:

| cases | listing, first request of a query (n) | listing, repeated | listing, 304 | full case, first load (n) | full case, cached | full case, 304 | rss / heapUsed after the loads |
|---:|---:|---:|---:|---:|---:|---:|---|
| 100 | 1.61 / 4.20 (187) | 1.12 / 3.74 | 0.97 / 1.50 | 147 / 209 (100) | 2.04 / 2.56 | 0.52 / 0.90 | 420.6 / 60.7 MiB |
| 500 | 2.04 / 5.50 (295) | 1.88 / 5.28 | 1.37 / 3.20 | 164 / 226 (100) | 1.95 / 3.18 | 0.51 / 0.75 | 503.6 / 76.0 MiB |
| 1 000 | 2.35 / 6.05 (300) | 2.03 / 5.26 | 1.64 / 4.60 | 157 / 235 (100) | 1.71 / 2.35 | 0.43 / 0.67 | 506.6 / 76.7 MiB |

Reading the numbers: the initial JS no longer grows with the case files —
only with the index, 1.45 KiB of JSON per case in this catalogue (1,451.9 KiB
for 1 000), so a large bundled library belongs behind the server's paginated
listing; listing latency stays in single-digit milliseconds up to 1 000
cases; the cost that remains per case is validation on first load
(p50 147–164 ms for these 0.26 MiB cases), paid once per case and file
version. Not yet measured: browser startup and case-switch latency with a
large catalogue.

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

| area | implemented | tested | validated | production-ready |
|---|---|---|---|---|
| Facility schema: `levels`, `connectors`, `access`, per-entity `level`; equipment `portable`, `reach`, `interactionPoints`, `behavior`, `model`; `checkFacility` / `checkCatalogs` rules; JSON Schemas | yes (W1) | core unit tests | built-in content and catalogs validate with no new issue | — |
| Collision model (`buildCollisionModel`, `facilityWalls`); the renderer takes every collider from it | yes (W1) | parity: the renderer's own collider set captured before and after the switch is identical to the model (every box, door leaf, doorway, NPC body, block) for `clinic-v4`, `general-hospital` and the harness test facility; pinned counts/digests | web e2e suite | — |
| Semantic registry (`buildRegistry`) | yes (W1) | unit (ids, aliases, descriptors, levels) | — | — |
| Visibility (`VisibilityModel`) | yes (W1; W2: a door never hides itself) | unit (walls, windows, doors, FOV, partial occlusion, displaced carts, closed doors seen from their interaction points) | — | — |
| Navigation (`GridAStarBackend`, `NavGrids`) | yes (W1) | unit (real routes in both facilities, every interactive placement, every door, failures, locks, zones, obstacles, moved carts, two-level fixture); measured (§7) | — | — |
| State store (`WorldStateStore`: actors, versions, events, idempotency window, canonical snapshots) | yes (W2) | unit (version rules incl. sensor updates, dynamics, bounded log, snapshot identity and refusal) | — | — |
| Device behaviours, authority (`behaviors.ts`, `clinical.ts`, `authority.ts`) | yes (W2) | unit over the built-in catalogs + a test catalog (operations per kind, predicates, ECG state machine with reservation and durations, derived monitor state following the engine, doors, sinks, storage, handheld items, role restrictions) | — | — |
| Spatial policy (`DefaultSpatialPolicy`, `SpatialChecker`) | yes (W2) | every §6 row (ok, each failure reason, the hint that fixes it); property over every item of the 10 built-in cases in their own facility | — | — |
| Perception (`observe`, `find`, `inspect`, `roomInfo`, `canSee`) | yes (W2) | unit (awareness levels, bounds, bearings, cues, monitor screen rules, memory without versions); no case fact in any observation (10 cases × 2 languages) | — | — |
| Action bus, runtime (`createWorldRuntime`), traces | yes (W2) | unit (commit order, idempotency, stale versions, reservations and in-flight locks, cancellation mid-walk and mid-approval, per-actor queue, availability, authority, travel charged once, scenario controls, resume, determinism, trace trees) over a fake session on the real engine | not yet wired into the agent session, the web, the server or MCP | — |
