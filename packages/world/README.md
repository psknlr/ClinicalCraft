# @clinicalcraft/world

The embodied world model of ClinicalCraft (design: [docs/EMBODIED.md](../../docs/EMBODIED.md)).
One pure, deterministic, headless model of the 3D hospital, shared by the
three.js renderer (`packages/web`), the CLI, the HTTP server, MCP and the
benchmark. three.js is only a *view* of it.

This package currently holds the **static layer** (immutable per encounter):
collision model, wall layout, navigation grids and backend, occlusion /
visibility, semantic registry — plus the contracts of the dynamic layer
(state store, action bus, devices, spatial policy, observations, traces;
`src/contracts.ts`).

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
| `collision.ts` | `buildCollisionModel(facility, catalogs, { patients?, blocks?, staff? })` | every collider the world has, with stable ids, `kind`, `level`, `entity`, `opaque`, `passable`, plus door records; the renderer registers exactly these (parity pinned in `collision.test.ts`) |
| | `wallSolidBoxes`, `doorLeafBoxes`, `doorwayArea`, `npcBodyBox`, `patientBodyBox`, `patientPose`, `staffBodyBox`, `blockBox`, `treeBox`, `signPostBox`, `EYE_HEIGHT` | the box rules (the renderer uses `patientBodyBox` / `blockBox` for runtime changes) |
| `walls.ts` | `facilityWalls(facility)` → `WallSpec[]` | building walls per level and deduplicated room partitions with resolved openings and door/window ids — drawn by the renderer, collided by the model |
| `levels.ts` | `levelInfos`, `levelElevation`, `connectorInfos`, `accessZones`, `defaultLevelId`, `entityLevel`, … | levels/connectors/access zones with defaults (`L0` when none) |
| `registry.ts` | `buildRegistry(facility, catalogs, binding, collision)` → `SemanticRegistry` | entities with prefixed ids (`eq:` `patient:` `staff:` `room:` `door:` `level:` `connector:`), localized names, level, room, position, rotated footprint, capabilities, interaction kind, portability, reach, public descriptors; `entity(id)`, `resolveId(alias)`, `ofKind`, `inRoom`, `roomAt` |
| `visibility.ts` | `VisibilityModel` (`lineOfSight`, `visibleFrom`, `canSee`, `invalidate`), `inFieldOfView`, `yawTowards`, `forwardOf`, `sightSamples` | 0.25 m occlusion grids at eye height; closed doors occlude (state read at query time); `canSee` samples the footprint (centre + inset corners) |
| `nav/` | `GridAStarBackend`, `NavGrids`, `astar`, `flood`, `nearestFreeCell`, `MIN_RANGE`, `NAV_CELL`, `NAV_RADIUS` | per-level 0.5 m grids, goals `point/entity/interact/room/follow/look/any`, portal graph over connectors, access zones, locked doors, dynamic obstacles, stable error codes |
| `geometry.ts`, `physics.ts`, `pathfind.ts`, `buildzone.ts` | V4 geometry, player physics (`stepPlayer`, `ColliderGrid`, `PHYSICS`), grid A* for the web autopilot, build-zone rules | moved from `packages/web/src/world` (re-exported there) |
| `raster.ts`, `i18n.ts` | grid frames and rasterisation; bilingual names and messages | |

```ts
import { buildCollisionModel, buildRegistry, GridAStarBackend } from "@clinicalcraft/world";

const collision = buildCollisionModel(facility, catalogs, { patients: [{ slotId: "resus-1", posture: "lying" }] });
const registry = buildRegistry(facility, catalogs, { caseDef, slotId: "resus-1", locale: "en" }, collision);
const nav = new GridAStarBackend({ facility, collision, registry, dynamics: store, locale: "en" });
const plan = nav.plan({ actorId: "actor:clinician", from: pose, goal: { kind: "interact", id: "resus1-ecg" }, role: "clinician" });
// plan.ok → path (with `via: connector:<id>` on level changes), length, travelSeconds, target pose facing the cart
// !plan.ok → code (TARGET_NOT_FOUND | TARGET_NOT_REACHABLE | PATH_BLOCKED | ACCESS_DENIED | NO_INTERACTION_POINT | NAVIGATION_TIMEOUT), message, details
```

## Building the dynamic layer on it

* Build once per encounter: `buildCollisionModel` (with the bound patient's
  slot and posture, `bindingPosture`), `buildRegistry`, then one
  `VisibilityModel` and one `GridAStarBackend` sharing the same
  `WorldDynamics` (pass the visibility model to the backend).
* Implement `WorldDynamics` on the state store: `doorState` (read at
  query time — but call `backend.invalidate(area)` after a lock change, the
  planner caches its masks per invalidation), `obstacles`, `displaced`
  (moved carts; invalidate their old and new areas), `removed` (carried
  items), `actorPose` (follow goals; staff that walked away).
* Distances for spatial checks should use the same rules as the planner:
  ranges from the footprint (`footprintArea`, `distanceToArea`), line of
  sight with `visibility.visibleFrom` / `canSee`, effective reach at least
  `MIN_RANGE` (a planned interaction cell may lie up to one cell beyond the
  collider inflation).
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
