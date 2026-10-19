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
| `visibility.ts` | `VisibilityModel` (`lineOfSight`, `visibleFrom`, `canSee`, `invalidate`), `inFieldOfView`, `yawTowards`, `forwardOf`, `sightSamples` | 0.25 m occlusion grids at eye height; closed doors occlude (state read at query time); `canSee` samples the footprint (centre + inset corners) |
| `nav/` | `GridAStarBackend`, `NavGrids`, `astar`, `flood`, `nearestFreeCell`, `MIN_RANGE`, `NAV_CELL`, `NAV_RADIUS` | per-level 0.5 m grids, goals `point/entity/interact/room/follow/look/any`, portal graph over connectors, access zones, locked doors, dynamic obstacles, stable error codes |
| `geometry.ts`, `physics.ts`, `pathfind.ts`, `buildzone.ts` | V4 geometry, player physics (`stepPlayer`, `ColliderGrid`, `PHYSICS`; ramps: `RAMP`, `rampTop`, `rampGround`), grid A* for the web autopilot (`NavOptions.floors`: an upper level's walkable slabs), build-zone rules | moved from `packages/web/src/world` (re-exported there); without ramp colliders every physics step is V4's |
| `raster.ts`, `i18n.ts` | grid frames and rasterisation; bilingual names and messages | |
| `runtime.ts` | `createWorldRuntime(options)` → `WorldRuntime` | one world per encounter: builds the static layer (with the bound patient's body), the store (or restores `options.snapshot`), and wires the services below; default instant `Mover` |
| `state.ts` | `WorldStateStore`, `canonical`, `spawnPose` | actors (the clinician at the spawn, staff at their posts), per-entity runtime state, obstacles, global + per-entity versions, bounded event log, idempotency window, canonical snapshots; implements `WorldDynamics` |
| `locate.ts` | `WorldLocator` | where things are now (moved carts, carried items, walking actors), distance to the footprint, line of sight, effective reach, the bedside rule, the patient's monitor |
| `behaviors.ts`, `clinical.ts`, `authority.ts` | `behaviorOf`, `BUILTIN_BEHAVIORS`, `DeviceRules`, `evaluatePredicate`; `selectClinical`, `monitoringIntervention`; `ROLE_AUTHORITY`, `permits` | built-in behaviours per interaction kind and catalog state machines, derived monitor state, predicates, prechecks, reach, available actions; the case item of a clinical effect; role → operation classes |
| `policy.ts`, `reach.ts` | `DefaultSpatialPolicy`, `SpatialChecker`, `BEDSIDE_CAPABILITIES`, `DELIVERED_CAPABILITIES`; `Reachability` | the §6 policy as data and its evaluation with reasons and hints (delivered capabilities — `medications`, `blood-bank` — need only an in-service provider in the facility, never one at the bedside; option `deliveredCapabilities`); flood-fill walking distances cached per actor cell |
| `perception.ts`, `screen.ts` | `Perception`, `MAPPED_INTERACTIONS`; `formatScreen` | awareness levels, observe / find / inspect / roomInfo / canSee, cues, memory; the monitor screen line |
| `actions.ts`, `effects.ts` | `ActionBus`, `instantMover`, `requestProblem`, `goalProblem` | the commit order, per-actor queue, idempotency, versions, navigation, clinical effects through the `ClinicalPort`, carts and items, scenario controls |
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
* A posture change of the patient changes its body collider
  (`patientBodyBox`): a patient who lies down on the slot's bed has none —
  list `patient:<slot>` in `removed` and invalidate the slot's area; any
  other new body box needs a rebuilt collision model.

## Tests

`npx vitest run packages/world` — collision parity with the renderer
(counts, kinds and a digest of every box for `clinic-v4` and
`general-hospital`), wall/door/level semantics, registry ids and
descriptors, occlusion (walls, windows, doors, field of view, partial
occlusion, displaced carts), navigation on real routes, failures and the
synthetic two-level facility (`src/__fixtures__/two-level.ts`), purity.

The dynamic layer is tested over the real built-in content with a fake
session on the real engine (`src/__fixtures__/world.ts`: `makeWorld`,
`clinicalHarness` with a gate for approvals, `steppingMover`, a test catalog
with handheld items): `state.test.ts` (versions, snapshots),
`behaviors.test.ts` (operations per kind, predicates, the ECG machine, the
derived monitor, doors, sinks, storage, items), `policy.test.ts` (every §6
row with the hint that fixes it; a property over every item of the 10
cases), `perception.test.ts` (awareness, bounds, cues, no case fact in any
observation for 10 cases × 2 languages), `actions.test.ts` (idempotency,
stale versions, reservations, cancellation, queueing, availability,
authority, travel time, scenario controls), `runtime.test.ts` (resume,
determinism, traces), `trace.test.ts`.
