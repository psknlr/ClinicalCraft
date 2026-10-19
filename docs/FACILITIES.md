# Facilities, rooms & equipment

Schemas: `packages/core/src/schema/facility.ts`. Content lives in
`packages/content/facilities/*.json` and `packages/content/catalogs/*.json`.

## Conventions

* 1 unit = 1 voxel block = 1 m. +Y up. Ground surface is y = 0 (V4: ground
  blocks occupy y ∈ [−1, 0]).
* Equipment origin = centre of its footprint **on the floor**. A part's `p` is
  the centre of the box, `s` its size. Parts must stay inside the declared
  footprint (preview draws the footprint in red).
* **Front faces +Z** (towards the viewer at `rot: 0`). `rot` (degrees, multiple
  of 90) rotates about Y; at `rot: 180` the front faces −Z.
* Wall-mounted items (oxygen outlet, clock, whiteboard, lightbox) set
  `solid: false`, keep their parts near local z = −footprint.d/2 (the back),
  and are placed with their back against a wall.
* Screens: name a part `"screen"` and set the equipment `screen` kind
  (`vitals`, `ecg`, `pacs`, …); the web client paints a live canvas texture on it.
* Per-placement details: `placement.extraParts` adds voxel parts to one
  placement (same frame as the type's `parts`, rotated with the placement,
  rendered the same way, no collider) and `placement.hideParts` skips type
  parts by index — together they move or replace parts for one station
  (clinic-v4: the lab's test tubes; the pathology microscope and the monitor
  moved 0.6 m right, V4 `Q(L, .6)`). `checkFacility` reports unknown
  materials and out-of-range indices (errors) and extra parts outside the
  type's footprint (warnings).
* Use materials from `catalogs/materials.json` (V4 palette + clinical
  additions). A catalog may add its own materials; ids must be unique across
  loaded catalogs.
* Visual QA (required for content authors):
  `node scripts/preview/render.mjs equipment --catalogs packages/content/catalogs/materials.json,packages/content/catalogs/<file>.json --out <png>` and
  `node scripts/preview/render.mjs facility --facility packages/content/facilities/<id>.json --catalogs <all catalog files> --out <png>`.
  Files may lie outside the checkout (a `contentDirs` folder): only the files
  named on the command line are served. A file that fails to load or parse
  ends the run at once with `{"ok": false, …}` and exit code 1.

## Personal kit

The learner always carries `stethoscope`, `thermometer`, `reflex-hammer`,
`otoscope` (constant `PERSONAL_KIT` in core). Other capabilities must be
provided by equipment in the facility (workstation placements may add
capabilities via `placement.capabilities`).

## Interaction semantics (web world)

| `interaction.kind` | aimed + `E` opens |
|---|---|
| `workstation` | order entry for investigations whose `requires ⊆` placement capabilities (V4 workstation) |
| `device` | actions panel: investigations + interventions whose `requires` intersect the device capabilities (ECG cart → 12-lead ECG; defibrillator → shocks; O₂ outlet → oxygen) |
| `monitor` | bedside monitor panel (live vitals, ECG trace, alarms) for the patient in the linked slot |
| `bed` | nothing by itself (talk to the patient NPC) |
| `board` | evidence board (decisions, phase switch, compare images) |
| `atlas` | anatomy atlas |
| `craft` | V4 crafting bench |
| `storage`/`sink`/`none` | flavour text only |

Interventions at the bedside require their capabilities within the patient's
room (or within 6 m of the slot). The CLI and MCP have no spatial rules:
capability checks there use the whole facility — the agent tools
(`examine`, `order_test`, `intervene`; learner commands, model tool calls
and MCP alike) refuse, before any approval prompt, an item whose `requires`
are missing from `facilityCapabilities` ("Not available here: … needs …").

A facility can host a case only if the case can be completed there:
`caseCapabilityGaps(case, facility, catalogs)` lists the exam findings,
investigations and interventions an objective, a decision or the reference
`solution` uses that the facility cannot provide, `blocking` when an
objective or decision has no alternative. The web offers a facility for a
case only without blocking gaps (the case's own facility always);
`cases validate` fails on blocking gaps in the case's own facility; and
`facilities validate --all` warns for every case a slot accepts but the
facility cannot complete.

## Embodiment fields (optional; docs/EMBODIED.md)

All additive: facilities and catalogs without them stay valid and unchanged
(`clinicalcraft/facility@1`, `clinicalcraft/equipment-catalog@1`). The
headless world model (`@clinicalcraft/world`) derives colliders, navigation
grids, occlusion and the semantic registry from them; the web world renders
the default level.

**Levels.** `floor` (buildings, rooms) is the floor *material*; storeys are
levels.

| field | where | meaning |
|---|---|---|
| `levels: [{ id, name, elevation = 0, height = 5 }]` | facility | storeys; default `[]` = one implicit level `L0` at elevation 0 |
| `level` | rooms, placements, patient slots, staff | the level the entity stands on (default: the room's level, else the *default level* — the one at elevation 0, else the first) |
| `levels: [levelId…]` | buildings | levels the building spans (default: the default level); its walls and openings repeat on each, lifted by the level's elevation; off the default level only the inside of these buildings is walkable |
| `connectors: [{ id, kind: stairs \| elevator \| ramp, name, stops: [{ level, x, z }…] ≥ 2, travelSeconds?, accessible?, roles = [] }]` | facility | portals between levels, stops listed in travel order; `travelSeconds` between adjacent stops (default stairs 15, ramp 10, elevator 20); `accessible` (default: elevators and ramps yes, stairs no) — wheelchairs, beds and pushed carts use only accessible ones; `roles` restrict who may use it (empty = everyone) |
| `access: [{ id, name, level?, rect, roles ≥ 1 }]` | facility | restricted areas: only these roles may plan through them (`ACCESS_DENIED` otherwise); an actor standing inside may always leave |

Roles (`ACTOR_ROLES`): `clinician` (the learner's avatar) and the staff roles
(`nurse`, `radiologist`, `pathologist`, `lab-tech`, `attending`,
`pharmacist`, `receptionist`, `paramedic`, `porter`).

**Equipment types.**

| field | meaning |
|---|---|
| `portable: "cart" \| "handheld"` | can be wheeled to another spot (`cart`) or carried (`handheld`); absent = fixed. The built-in carts: `ecg-machine`, `defibrillator`, `crash-cart`, `oxygen-cylinder`, `glucometer-station`, `pocus-cart`, `ultrasound-machine` |
| `reach` | interaction reach in metres from the footprint (≤ 10). Default by interaction kind (core `DEFAULT_REACH`): workstation 1.2, monitor 2, bed 1.5, device 1.2, atlas 1.5, board 2.5, craft 1.2, sink 1, storage 1, none 1 (doors 1.2, staff 2). `oxygen-outlet` declares 2.2 (reached over the bed head) |
| `interactionPoints: [{ x, z }]` | where an actor stands to use it: local offsets from the footprint centre, rotated with the placement; absent = any free spot within reach with line of sight |
| `behavior: { initial, states: { id: { name?, available? } }, operations: { id: { name, from: [state…] \| "*", to?, requires?: [WorldPredicate…], clinical?: { tool, select }, durationSeconds?, reserve?, release?, roles? } }, derived? }` | declarative device state machine (EMBODIED §8). `clinical` runs a clinical tool (`order_test`, `read_result`, `intervene`, `check_vitals`, `examine`) through the session's normal tool path; `select`: the case item comes from an operation parameter (`param`), is the first item whose `requires` this device provides (`capability`) or the case's monitoring intervention (`monitoring`). `derived: "monitor-attachment"` mirrors the engine's `monitorAttached` (states `attached` / `detached`, never stored). Built in: `ecg-machine` (idle → prepared → connected → completed: `prepare`, `connect`, `record` → `order_test` by capability, `reset`) and `patient-monitor` (derived; `attach` → `intervene` monitoring, `read`, `cycle_nibp`) |
| `model: { uri, sha256?, scale?, offset?, rot?, license, attribution? }` | optional GLB/glTF model — visual only: the voxel parts stay the fallback, the collider is always the footprint and a model is never interactive by itself |

World predicates (`requires`): `{ actorWithin: m }` (the acting actor is
within m of this device), `{ patientWithin: m }` (… of the bound patient),
`{ deviceAtBedside: true }` (this device stands within the bedside radius of
the patient), `{ actorHolding: id }`, `{ state: id | [id…] }`,
`{ role: [role…] }`, `{ handsClean: true }`, and `all` / `any` / `not`.

**Validation.** `checkFacility`: unknown level ids (buildings, rooms,
placements, slots, staff, access zones; errors), an entity on another level
than its room, a room on a level its building does not span, two levels at
one elevation (warnings); connector stops on undefined levels, outside the
bounds, consecutive stops on one level, fewer than two levels (errors), an
upper-level stop outside every building on that level (warning); access
zones outside the bounds (warning); duplicate ids; solids on different
levels never "overlap". `checkCatalogs`: behaviour `initial` / `from` / `to` /
predicate states that do not exist, a derived monitor attachment without
`attached` / `detached` (errors); a monitor attachment on a non-monitor, a
`capability` selection on a type without capabilities, `monitoring` with a
tool other than `intervene`, a `release` without any `reserve`, interaction
points inside a solid footprint or beyond reach, a wall-mounted portable cart
(`solid: false` or tag `wall`), a handheld item over 1 × 1 × 1.5 m, a model
that is not `.glb` / `.gltf` (warnings). Unknown predicate shapes fail
parsing.

## Equipment catalogs (ids are a contract — facilities reference them)

`core-furniture.json` — structure, furniture, teaching, outdoor, decor:
`workstation` (V4 desk + monitor, kind workstation, capabilities via placement),
`desk`, `chair`, `office-chair`, `stool`, `waiting-chairs`, `reception-desk`,
`nurse-station-desk` (capability records), `records-terminal` (records),
`exam-couch` (V4 consult bed with pillow & blanket), `hospital-bed`,
`stretcher`, `wheelchair`, `bedside-table`, `overbed-table`, `privacy-curtain`
(solid false), `bookshelf` (V4 shelves with binders), `cabinet`, `locker`,
`sink`, `scrub-sink`, `hand-sanitizer`, `potted-plant`, `wall-clock`,
`whiteboard`, `evidence-board` (V4 board, kind board, evidence-board),
`anatomy-atlas-kiosk` (V4 atlas station, kind atlas, anatomy-atlas),
`crafting-bench` (V4, kind craft, crafting), `projector-screen`,
`vending-machine`, `water-dispenser`, `trash-bin`, `sharps-bin`,
`glove-dispenser`, `garden-bench` (V4 bench), `lamp-post`, `signpost`,
`ambulance`, `bus-stop`.

`core-clinical.json` — monitoring, resuscitation, therapy, surgery, pharmacy:
`patient-monitor` (kind monitor, screen vitals, cardiac-monitor + capnography),
`ecg-machine` (device, ecg-12lead), `defibrillator` (device, defibrillator),
`crash-cart` (device, crash-cart + medications + airway + suction),
`oxygen-outlet` (device, oxygen + suction, wall), `oxygen-cylinder` (device, oxygen),
`iv-pole` (device, iv-access), `infusion-pump` (device, infusion-pump + iv-access),
`ventilator` (device, ventilator), `suction-unit` (device, suction),
`nebulizer` (device, nebulizer), `glucometer-station` (device, point-of-care),
`diagnostic-wall-set` (device, otoscope + stethoscope, wall),
`anesthesia-machine` (device, anesthesia + airway), `operating-table`,
`surgical-light` (light), `instrument-table`, `medication-cabinet`
(device, medications), `medication-fridge` (storage, medications),
`pharmacy-shelves`, `blood-bank-fridge` (device, blood-bank),
`dialysis-machine` (device, dialysis), `exam-light`, `peak-flow-station`
(device, peak-flow), `weighing-scale` (device, scale).

`core-diagnostics.json` — imaging, laboratory, pathology:
`ct-scanner` (device, ct), `mri-scanner` (device, mri), `xray-machine`
(device, xray), `xray-chest-stand`, `c-arm` (device, fluoroscopy),
`pet-ct-scanner` (device, pet-ct), `ultrasound-machine` (device, ultrasound +
echocardiography), `pocus-cart` (device, ultrasound), `radiology-console`
(workstation, screen pacs), `xray-lightbox` (wall), `hematology-analyzer`
(device, lab-hematology), `chemistry-analyzer` (device, lab-chemistry +
lab-endocrine + lab-serology), `blood-gas-analyzer` (device, lab-blood-gas),
`centrifuge`, `microscope` (device, cytology + histopathology), `lab-bench`,
`biosafety-cabinet` (lab-microbiology), `lab-fridge`, `flow-cytometer`
(device, flow-cytometry), `urinalysis-analyzer` (device, lab-urinalysis),
`pneumatic-tube-station`, `cytogenetics-workstation` (workstation,
cytogenetics + molecular), `slide-scanner`, `microtome`, `tissue-processor`,
`endoscopy-tower` (device, endoscopy).

## Facilities

* `clinic-v4` — faithful data port of the V4 world: healing garden, single
  clinic building (consult, lab, imaging, pathology, corridor, conference
  area), V4 doors/windows/skylight/lamps/signs, workstations with V4
  capability groupings, evidence board, atlas kiosk, shelves, garden
  benches, pond, trees, flowers, horizon, build zone and crafting bench.
  Default for `outpatient` cases whose `facility` is `clinic-v4`.
* `general-hospital` — multi-department hospital (ED with resus bays and
  ambulance bay, outpatient clinic, radiology, laboratory, pathology,
  pharmacy, ward, ICU, operating room, nurse station, conference room,
  garden + build zone). Patient slots accept every case setting.

### V4 workstation capability groupings (clinic-v4)

| V4 station | placement capabilities |
|---|---|
| 检验工作台 lab (−8, −7) | lab-hematology, lab-chemistry, lab-serology, flow-cytometry, cytology |
| 影像工作站 imaging (8, 3) | ct, ultrasound, pet-ct, xray |
| 病理与遗传工作台 path (8, −7) | histopathology, cytogenetics, molecular |
