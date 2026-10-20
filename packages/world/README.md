# @clinicalcraft/world

The embodied world model of ClinicalCraft (design: [docs/EMBODIED.md](../../docs/EMBODIED.md)).
One pure, deterministic, headless model of the 3D hospital, shared by the
three.js renderer (`packages/web`), the CLI, the HTTP server, MCP and the
benchmark. three.js is only a *view* of it.

It holds the **static layer** (immutable per encounter: collision model,
wall layout, navigation grids and backend, occlusion / visibility, semantic
registry) and the **dynamic layer** (`createWorldRuntime`: the versioned
physical state, device behaviours and authority, the spatial policy,
perception, the action bus and traces). The contracts are in
`src/contracts.ts`.

## Determinism rules

* No DOM, no three.js, no `node:*`, no `Date.now()` / `new Date()` /
  `Math.random()` / `performance.now()` in library code (`src/purity.test.ts`
  enforces it). Clocks and id generators are injected (`WorldRuntimeOptions`).
* Every builder is a pure function of its inputs (facility, catalogs,
  binding, options); the same inputs give the same colliders, ids, grids and
  plans, in the same order.
* Mutable physical state (door locks, obstacles, moved carts, actor poses)
  is never stored here: grids read it through the `WorldDynamics` interface
  (implemented by the state store) and are told to re-read an area with
  `invalidate(area)`.
* Tests (`*.test.ts`) and `src/__fixtures__/` may use `node:fs`; they are
  excluded from the build.

## API overview

| module | exports | what |
|---|---|---|
| `contracts.ts` | `EntityId`, `Collider`, `CollisionModel`, `DoorSpec`, `SemanticEntity`, `NavGoal`, `NavPlan`, `NavigationBackend`, `WorldDynamics`, `WorldRuntime`, … | the contracts (EMBODIED §2–§10); behaviour types (`DeviceBehavior`, `BehaviorOperation`, `WorldPredicate`, `ClinicalEffect`, `ActorRole`) are the core zod-inferred types |
| `collision.ts` | `buildCollisionModel(facility, catalogs, { patients?, blocks?, staff? })` | every collider the world has, with stable ids, `kind`, `level`, `entity`, `opaque`, `passable`, plus door records; the renderer registers exactly these (parity pinned in `collision.test.ts`). Multi-level facilities add upper-floor `slab:<building>@<level>:<k>` boxes (stairwells cut out), a walkable `ramp:<connector>:<k>` wedge per stairs/ramp flight (`ramp` surface) and `rail:` balustrades (snapshot in `multilevel.test.ts`) |
| | `wallSolidBoxes`, `doorLeafBoxes`, `doorwayArea`, `npcBodyBox`, `patientBodyBox`, `patientPose`, `staffBodyBox`, `blockBox`, `treeBox`, `signPostBox`, `EYE_HEIGHT` | the box rules (the renderer uses `patientBodyBox` / `blockBox` for runtime changes) |
| `walls.ts` | `facilityWalls(facility)` → `WallSpec[]` | building walls per level and deduplicated room partitions with resolved openings and door/window ids — drawn by the renderer, collided by the model |
| `levels.ts` | `levelInfos`, `levelElevation`, `connectorInfos`, `accessZones`, `defaultLevelId`, `entityLevel`, `connectorFlights`, `levelSlabs`, `subtractAreas`, … | levels/connectors/access zones with defaults (`L0` when none); stairs/ramp flights (foot, head, width, area, surface) and the upper floors minus their stairwells |
| `registry.ts` | `buildRegistry(facility, catalogs, binding, collision)` → `SemanticRegistry` | entities with prefixed ids (`eq:` `patient:` `staff:` `room:` `door:` `level:` `connector:`), localized names, level, room, position, rotated footprint, capabilities, interaction kind, portability, reach, public descriptors; `entity(id)`, `resolveId(alias)`, `ofKind`, `inRoom`, `roomAt` |
| `visibility.ts` | `VisibilityModel` (`lineOfSight`, `visibleFrom`, `visibleWith`, `canSee`, `invalidate`), `inFieldOfView`, `yawTowards`, `forwardOf`, `sightSamples` | 0.25 m occlusion grids at eye height; closed doors occlude (state read at query time); `canSee` samples the footprint (centre + inset corners); `visibleWith`: would a cart parked at a spot hide the target |
| `nav/` | `GridAStarBackend`, `NavGrids`, `astar`, `flood`, `nearestFreeCell`, `MIN_RANGE`, `NAV_CELL`, `NAV_RADIUS` | per-level 0.5 m grids, goals `point/entity/interact/room/follow/look/any` (`look` with `sameRoom`: only from the target's room — a screen is never read through a window), portal graph over connectors, access zones, locked doors, dynamic obstacles and bodies (the patient's body where it is now), stable error codes |
| `geometry.ts`, `physics.ts`, `pathfind.ts`, `buildzone.ts` | V4 geometry, player physics (`stepPlayer`, `ColliderGrid`, `PHYSICS`; ramps: `RAMP`, `rampTop`, `rampGround`), grid A* for the web autopilot (`NavOptions.floors`: an upper level's walkable slabs), build-zone rules | moved from `packages/web/src/world` (re-exported there); without ramp colliders every physics step is V4's |
| `raster.ts`, `i18n.ts` | grid frames and rasterisation; bilingual names and messages | |
| `runtime.ts` | `createWorldRuntime(options)` → `WorldRuntime` | one world per encounter: builds the static layer (with the bound patient's body), the store (or restores `options.snapshot`), and wires the services below; default instant `Mover` |
| `state.ts` | `WorldStateStore`, `canonical`, `spawnPose` | actors (the clinician at the spawn, staff at their posts), per-entity runtime state, obstacles, global + per-entity versions, bounded event log, idempotency window, canonical snapshots; implements `WorldDynamics` |
| `locate.ts` | `WorldLocator` | where things are now (moved carts, carried items, walking actors, the patient's body), where they are kept (`home`) or were seen (`placedAt`), distance to the footprint, line of sight, effective reach, the bedside rule, the patient's monitor (`patientMonitor`), THE screen rule (`screenInView`: the monitor's room, 6 m, line of sight — the policy's `monitor-screen`, the monitor's `read`, perception's screen cue), `regionName` (room → a building's corridor → the outdoor region) |
| `patient.ts`, `transport.ts` | `PatientBody`, `resolveTarget`, `patientProviders`, `freeCellNear`, `trolleySpot`; `transportPatient`, `relocatePatient`, `refreshPatient`, `destinationOf` | the patient's body (EMBODIED §8): where they are (a bed space, a spot at a provider: the CT table, the cath-lab table, the peak-flow station), posture (the place's, else clinical state's), support, trolley, `home`; destinations (setting / room kind / capability / provider / bed space / home) resolved per facility; `transport_patient` (a body wheels the trolley there: travel charged once) and team relocations (a transfer, a phase with a location: nothing charged; the team's route recorded with carts and people set aside, `NavRequest.ignoreObstacles`) |
| `bedside.ts` | `BedsideRule`, `rhythmAtBedside`, `OPEN_ROOM_KINDS` | THE bedside rule (`WorldRuntime.atBedside`): measured from where the patient is now — their bed space's room, or within 6 m and visible from its point or a short walk away — never through a wall; whether a monitor / ECG / defibrillator at the bedside can show a rhythm |
| `capabilities.ts` | `BEDSIDE_CAPABILITIES`, `LAB_CAPABILITIES`, `BLOOD_SAMPLE_CAPABILITIES`, `DELIVERED_CAPABILITIES`, `KIND_DEFAULT_CAPABILITIES`, `RHYTHM_CAPABILITIES`, `PATIENT_AT_PROVIDER_CAPABILITIES`, `PATIENT_PERFORMED_CAPABILITIES`, `TABLE_CAPABILITIES`, `TROLLEY_TYPES`, … | the capability groups of the policy and of patient transport |
| `behaviors.ts`, `clinical.ts`, `authority.ts` | `behaviorOf`, `BUILTIN_BEHAVIORS`, `DeviceRules`, `evaluatePredicate`; `selectClinical`, `monitoringIntervention`; `ROLE_AUTHORITY`, `permits` | built-in behaviours per interaction kind and catalog state machines, derived monitor state, predicates, prechecks, reach, available actions; the case item of a clinical effect; role → operation classes |
| `policy.ts`, `reach.ts` | `DefaultSpatialPolicy`, `SpatialChecker`; `Reachability` | the §6 policy as data (vitals by the attached monitor's screen, hands or chart; labs sampled at the patient and ordered at a records terminal; results never on the device; IV access as patient state through a `clinical` requirement; kind defaults; delivered capabilities) and its evaluation with reasons, display-labelled messages and hints (fetches carry `then: move_to`; the patient to bring to a device or back to fixed kit `then: transport_patient`; a study on the patient at a fixed device needs `patient-at-provider`), ranked lazily (a failure's hint is ranked when first read); flood-fill walking distances cached per actor cell, across levels through the connectors |
| `perception.ts`, `screen.ts` | `Perception`, `MAPPED_INTERACTIONS`; `formatScreen` | awareness levels (portable equipment mapped where it is kept), believed whereabouts (`lastKnown`), observe / find / inspect / roomInfo / canSee, cues, memory, recent events the observer may know; the monitor screen line |
| `actions.ts`, `effects.ts`, `placement.ts` | `ActionBus`, `instantMover`, `requestProblem`, `goalProblem` (≤ 16 leaves, no duplicates, bounded ranges), `progressAlong`; `operationPlacement`, `placesByBoth` | the commit order, per-actor queue, idempotency, versions, navigation (interrupted walks charged by distance and completed rides), clinical effects through the `ClinicalPort`, where an operation involving the device and the patient can be done (a joint spot, else a fetch), carts and items, scenario controls |
| `trace.ts` | `TraceRecorder`, `recordActionSpans` | episode spans and JSONL |

```ts
import { buildCollisionModel, buildRegistry, GridAStarBackend } from "@clinicalcraft/world";

const collision = buildCollisionModel(facility, catalogs, { patients: [{ slotId: "resus-1", posture: "lying" }] });
const registry = buildRegistry(facility, catalogs, { caseDef, slotId: "resus-1", locale: "en" }, collision);
const nav = new GridAStarBackend({ facility, collision, registry, dynamics: store, locale: "en" });
const plan = nav.plan({ actorId: "actor:clinician", from: pose, goal: { kind: "interact", id: "resus1-ecg" }, role: "clinician" });
// plan.ok → path (with `via: connector:<id>` on level changes), length, travelSeconds, target pose facing the cart
// !plan.ok → code (TARGET_NOT_FOUND | TARGET_NOT_REACHABLE | PATH_BLOCKED | ACCESS_DENIED | NO_INTERACTION_POINT | NAVIGATION_TIMEOUT), message, details
```

## The dynamic layer

```ts
import { createWorldRuntime, PRIMARY_ACTOR } from "@clinicalcraft/world";

const world = createWorldRuntime({
  facility, catalogs,
  binding: { caseDef, slotId: "resus-1", locale: "en" },
  clinical,            // ClinicalView: caseDef, state(), bedside() (= vitalsAt), cues(slot), clock()
  port,                // ClinicalPort: invoke(actor, tool, args, signal) through the session's tool path; elapse(seconds, reason)
  now, newId,          // injected clock and ids (determinism)
  mover,               // optional: the browser animates bodies; default instant
  trace,               // optional TraceSink (TraceRecorder)
  snapshot,            // optional: resume
});
const check = world.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "ecg-12lead" });
if (!check.ok && check.hint) await world.execute({ actionId: "a1", actorId: PRIMARY_ACTOR, operation: "navigate", goal: check.hint.goal });
await world.execute({ actionId: "a2", actorId: PRIMARY_ACTOR, operation: "prepare", targetId: "resus1-ecg" });
const seen = world.observe(PRIMARY_ACTOR); // bounded, localised, never case facts
```

* One writer: every physical change goes through `execute` (validate →
  queue per actor → versions → target → operation → authority →
  availability / reservation → preconditions → spatial → clinical effect via
  the port → commit) or a scenario control (`setObstacle`,
  `setAvailability`, `setDoor`). `updatePose` is a sensor update from a
  human-driven body: it bumps only that actor's own version.
* The store implements `WorldDynamics` for the grids and the occlusion
  (doors, obstacles, moved carts, carried items, actor poses); the bus calls
  `backend.invalidate(area)` (and the visibility model's) after a lock,
  obstacle, cart or item change.
* Integration (agent session): build a `ClinicalView` and a `ClinicalPort`
  over the session; spatially gate the clinical tools with `checkSpatial`
  before the approval gate and again with `{ recheck: true }` immediately
  before dispatching to the engine; map a refusal to the tool result with its
  `hint`. Write `snapshot()` into the transcript to resume.
* The patient's body moves (EMBODIED §8): `execute({ operation:
  "transport_patient", targetId: "patient", parameters: { destination } })`
  from the patient's side (a bed space, `eq:<device>`, `room:<id>`, `home`),
  or `relocatePatient(destination)` when a transfer is given or a phase with
  a location starts (the session does this). `patientPlace()` says where they
  are; the grids, the occlusion, the bedside rule, the patient's monitor and
  perception follow; `patient.moved` carries the route. A clinical posture
  change (an authored `posture`, G12) is applied with `refreshPatient()`:
  the body box (`patientBodyBox`) is re-stamped and `patient.posture` emitted.

## Tests

`npx vitest run packages/world` — collision parity with the renderer
(counts, kinds and a digest of every box for `clinic-v4` and
`general-hospital`; `multilevel.test.ts`: the teaching hospital's slabs,
flights, rails, physics on its real stairs and navigation across its
levels), wall/door/level semantics, registry ids and descriptors
(`registry.test.ts`), occlusion (walls, windows, doors, field of view,
partial occlusion, displaced carts), navigation on real routes, failures and
the synthetic two-level facility (`src/__fixtures__/two-level.ts`), V4
geometry, physics and the web autopilot's path-finding, purity.

The dynamic layer is tested over the real built-in content with a fake
session on the real engine (`src/__fixtures__/world.ts`: `makeWorld`,
`clinicalHarness` with a gate for approvals, `steppingMover`, a test catalog
with handheld items): `state.test.ts` (versions, snapshots),
`behaviors.test.ts` (operations per kind, predicates, the ECG machine, the
derived monitor, doors, sinks, storage, items), `policy.test.ts` (every §6
row with the hint that fixes it; a property over every item of the 10
cases, transports included), `transport.test.ts` (relocations, transports by
the clinician and a porter, time charged once, the body, trolleys, the
policy's patient-at-provider), `screen-rule.test.ts` (read ⇔ the policy's
screen option over sampled points), `hint-cost.test.ts` (lazy hint ranking:
budget and identical results), `i18n.test.ts` (both languages, no raw ids), `bedside.test.ts` (the bedside rule on every slot of the three
built-in hospitals, never through a wall; rhythm sources),
`operability.test.ts` (C7: device operations involving the patient
converge for every slot × device of the three hospitals), `perception.test.ts`
(awareness, bounds, cues, recent events, no case fact in any observation for
10 cases × 2 languages), `whereabouts.test.ts` (mapped portable equipment,
last-seen beliefs, region names), `reach.test.ts` (reachability across
levels), `travel.test.ts` (interrupted multi-level walks), `nav/goals.test.ts`
(goal cost bounds), `actions.test.ts` (idempotency, stale versions,
reservations, cancellation, queueing, availability, authority, travel time,
scenario controls), `clinical-port.test.ts` (the action id reaches the session, C4; a refusal keeps its code and hint, C13),
`runtime.test.ts` (resume, determinism, traces), `trace.test.ts`.

Status (docs/EMBODIED.md §14): implemented and tested, validated on the
built-in content through the agent session, the CLI, MCP, the benchmark and
the web e2e suite; not production-ready. Measurements: EMBODIED §4 and §7
(`nav/backend.test.ts` "measurements" prints one round).
