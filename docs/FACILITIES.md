# Facilities, rooms & equipment

Schemas: `packages/core/src/schema/facility.ts`. Content lives in
`packages/content/facilities/*.json`, `packages/content/templates/*.json`
(room templates) and `packages/content/catalogs/*.json`.

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
| `board` | case board (decisions, phase switch, compare images; object type `evidence-board`) |
| `atlas` | anatomy atlas |
| `craft` | V4 crafting bench |
| `storage`/`sink`/`none` | flavour text only |

Interventions at the bedside require their capabilities within the patient's
room (or within 6 m of the slot). In **embodied mode** (the web's default;
`--embodied` in the CLI, `start_case {embodied}` in MCP) the world decides
this for every front-end — one bedside rule (`WorldRuntime.atBedside` /
`bedsideProviders`: in the slot's room, or within 6 m of the slot and
visible from it, never through a wall) and the spatial gate of the session
(docs/EMBODIED.md §6). In **clinical mode** the web checks where the learner
stands itself, and the CLI and MCP have no spatial rules: capability checks
there use the whole facility. In both modes the agent tools
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
every level (see "Levels in the web world" below).

**Levels.** `floor` (buildings, rooms) is the floor *material*; storeys are
levels.

| field | where | meaning |
|---|---|---|
| `levels: [{ id, name, elevation = 0, height = 5 }]` | facility | storeys; default `[]` = one implicit level `L0` at elevation 0 |
| `level` | rooms, placements, patient slots, staff | the level the entity stands on (default: the room's level, else the *default level* — the one at elevation 0, else the first) |
| `levels: [levelId…]` | buildings | levels the building spans (default: the default level); its walls and openings repeat on each, lifted by the level's elevation; off the default level only the inside of these buildings is walkable |
| `levels: [levelId…]` | building openings | the levels an opening exists on (default: every level the building spans) — e.g. the entrance door on the ground floor only, windows on every storey |
| `connectors: [{ id, kind: stairs \| elevator \| ramp, name, stops: [{ level, x, z }…] ≥ 2, travelSeconds?, accessible?, width?, roles = [] }]` | facility | portals between levels, stops listed in travel order; `travelSeconds` between adjacent stops (default stairs 15, ramp 10, elevator 20); `accessible` (default: elevators and ramps yes, stairs no) — wheelchairs, beds and pushed carts use only accessible ones; `width` of a stairs/ramp flight (m, default 2, ≤ 10); `roles` restrict who may use it (empty = everyone) |
| `access: [{ id, name, level?, rect, roles ≥ 1 }]` | facility | restricted areas: only these roles may plan through them (`ACCESS_DENIED` otherwise); an actor standing inside may always leave |

Roles (`ACTOR_ROLES`): `clinician` (the learner's avatar) and the staff roles
(`nurse`, `radiologist`, `pathologist`, `lab-tech`, `attending`,
`pharmacist`, `receptionist`, `paramedic`, `porter`).

**Equipment types.**

| field | meaning |
|---|---|
| `portable: "cart" \| "handheld"` | can be wheeled to another spot (`cart`) or carried (`handheld`); absent = fixed. The built-in carts: `ecg-machine`, `defibrillator`, `crash-cart`, `treatment-cart`, `oxygen-cylinder`, `nebulizer`, `glucometer-station`, `pocus-cart`, `ultrasound-machine`. Every actor knows where the departments keep them (embodied perception: "usually kept in …") until it sees one elsewhere |
| `reach` | interaction reach in metres from the footprint (≤ 10). Default by interaction kind (core `DEFAULT_REACH`): workstation 1.2, monitor 2, bed 1.5, device 1.2, atlas 1.5, board 2.5, craft 1.2, sink 1, storage 1, none 1 (doors 1.2, staff 2). `oxygen-outlet` declares 2.2 (reached over the bed head) |
| `interactionPoints: [{ x, z }]` | where an actor stands to use it: local offsets from the footprint centre, rotated with the placement; absent = any free spot within reach with line of sight |
| `behavior: { initial, states: { id: { name?, available? } }, operations: { id: { name, from: [state…] \| "*", to?, requires?: [WorldPredicate…], clinical?: { tool, select }, durationSeconds?, reserve?, release?, roles? } }, derived? }` | declarative device state machine (EMBODIED §8). `clinical` runs a clinical tool (`order_test`, `read_result`, `intervene`, `check_vitals`, `examine`) through the session's normal tool path; `select`: the case item comes from an operation parameter (`param`), is the first item whose `requires` this device provides (`capability`) or the case's monitoring intervention (`monitoring`). `derived: "monitor-attachment"` mirrors the engine's `monitorAttached` (states `attached` / `detached`, never stored). Built in: `ecg-machine` (idle → prepared → connected → completed: `prepare`, `connect`, `record` → `order_test` by capability, `reset`) and `patient-monitor` (derived; `attach` → `intervene` monitoring, `read`, `cycle_nibp`) |
| `model: { uri, sha256?, scale?, offset?, rot?, license, attribution? }` | optional GLB/glTF model — visual only: the voxel parts stay the fallback, the collider is always the footprint and a model is never interactive by itself |

**Patients on the move (EMBODIED §8, review G8).** No new field: the world
model reads what is there. A patient slot's `bed` of type `hospital-bed` or
`stretcher` (`TROLLEY_TYPES`) is the **trolley that travels with the
patient** — wheeled (lying) to a scanner and back, parked beside the device
meanwhile; other beds (an exam couch, a garden bench, an operating table)
stay. A study on the patient at a fixed device takes them to the device that
provides it (interaction `device`; a `workstation` only where no device does —
the V4 clinic's imaging workstation): onto a `bed` placed beside it within its
reach + 0.5 m (the cath-lab table by the C-arm), onto the device itself for
`ct`, `mri`, `pet-ct` and `xray` (`TABLE_CAPABILITIES`: the scanner's table),
else to a free spot within its reach (standing for `peak-flow` and `scale`).
A transfer resolves `{setting}` / `{roomKind}` to the first slot accepting
it, `{capability}` to that device. Give a device a patient can be brought to
a clear approach (a trolley needs ≈ 2 m in front of it) and its room an
accessible route (beds take lifts and ramps, never stairs).

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
parsing. Flights: a stairs/ramp flight that is not axis-aligned is not built
(warning), stairs steeper than 45° or ramps steeper than 1:8 (warnings);
an opening's `levels` naming a level the building does not span (error).

## Room templates and instances (EMBODIED R10)

A room template (`clinicalcraft/room-template@1`, `packages/content/templates/*.json`,
JSON Schema `room-template.schema.json`) is one self-contained room —
partitions, equipment, patient slots, staff, lights, sign and optional
access zones — in **template-local coordinates**: origin at the room centre,
+Z is the room's front, and by convention its door is on the local south
(`s`, +Z) side. A facility places it with an instance; `compileFacility`
(core, pure and deterministic) expands every instance into the flat format
before anything else sees the facility, so the renderer, the collision
model, navigation, the agent tools and validation never know templates exist.

| template field | meaning |
|---|---|
| `id`, `name` (bilingual), `description?`, `kind` | the room kind of the compiled room (`ROOM_KINDS`) |
| `size: { w, d }` | the room rect (m) before rotation |
| `floor?`, `sign?`, `lights: [{ x, z }]` | room floor material, wall sign, ceiling lamps |
| `partitions: [{ side, material?, base?, top?, height?, thickness?, openings: [{ kind, offset, width?, height? }] }]` | interior walls of the room's sides (offsets along the wall from its centre) |
| `placements`, `patientSlots`, `staff` | as in a facility, without `room`/`level` (the instance's); slot `bed`/`monitor` refer to template-local placement ids |
| `zones: [{ id, name, rect, roles ≥ 1 }]` | optional access zones (compiled to the facility's `access`) |
| `capabilities` | the capabilities the room is meant to provide (documentation; `facilities validate` warns when its equipment provides none of a declared one) |
| `tags` | free-form |

Instances (`facility.instances`, default `[]`):
`{ id, template, x, z, rot: 0 | 90 | 180 | 270 = 0, level?, building?, overrides? }`.
Compilation rules:

* Ids are deterministic: the room is the instance id; every placement,
  slot, staff member and zone is `${instance}.${local}` (`icu-1.bed`,
  `icu-1.slot`, `ward-a.bed-3`, `theatre.sterile`). Slot `bed`/`monitor`
  refs are prefixed the same way; the room's doors follow the room id like
  any partition door (`door:icu-1:s:0`).
* Coordinates rotate about the room centre like three.js `rotation.y`
  (`rotateLocal(x, z, 90) = (z, −x)`; at `rot: 180` the front faces −Z),
  then translate to `(x, z)`; equipment and staff `rot` add the instance's;
  partition sides rotate (`s` → `e` at 90°) and opening offsets keep their
  orientation along the rotated wall. Coordinates are rounded to 1 µm.
* A partition that lies on a wall of the instance's building is dropped (the
  building wall is already there, with its windows).
* `overrides` (local ids, template frame): `name`, `floor`, `sign` (`null`
  removes it), `partitions`, `lights`, `omit: [local ids]` (placements,
  slots, staff or zones), `placements: { localId: patch }` (any placement
  field but the id), `patientSlots: { localId: { accepts?, posture? } }`,
  `staff: { localId: { name?, role?, greeting?, appearance? } }`; an unknown
  local id is a warning.
* Errors: an unknown template, a rotation other than 0/90/180/270, an
  instance id that collides with an authored id or another instance, a
  compiled id that collides with an authored entity, instance rooms that
  overlap, slot refs that do not resolve. A room fully inside an authored
  room is allowed (an elevator car inside a lobby); a partial overlap with
  an authored room is a warning.
* A facility without instances is returned unchanged (`clinic-v4`,
  `general-hospital`: byte-identical).

Every loader compiles at load time: `loadContent` (node: CLI, server, MCP,
`CaseIndexer`), the web app (`app/content.ts`, bundled and server content)
and the world harness. A facility whose instances do not compile is
reported and left out. `clinicalcraft facilities compile <id | file> [--out]`
prints the flat facility; `facilities validate --all` also checks every
template (`checkRoomTemplate`: the template compiled alone at the origin,
with the facility rules); `cases schema template` prints the JSON Schema.

**Template library** (all bilingual, equipment from the built-in catalogs;
size w × d in m):

| template | kind | size | contents |
|---|---|---|---|
| `ed-resus-bay` | resus | 8 × 8 | bed, monitor, O₂, suction, IV pole, infusion pump, ECG cart, POCUS cart, nebuliser, defibrillator, crash cart, ventilator, sink; double door; emergency slot |
| `ed-cubicle` | emergency | 5 × 8 | stretcher, monitor, O₂, infusion pump, crash cart, peak-flow station, curtain; open front; emergency slot |
| `outpatient-consult` | consult | 6 × 8 | treatment plinth, desk, chairs, diagnostic wall set, records terminal, glucometer, scale, sink; outpatient slot |
| `ortho-exam` | consult | 6 × 8 | treatment plinth, X-ray lightbox, desk, records terminal, wheelchair, sink; outpatient slot |
| `operating-theatre` | operating-room | 10 × 8 | operating table, surgical light, anaesthesia machine, monitor, instrument table, suction, infusion pump, O₂, C-arm, medication cabinet, scrub sink; sliding door; restricted zone `sterile` (clinician, attending, nurse, porter); operating-room slot |
| `ct-room` | imaging | 7 × 8 | CT scanner, radiology console, O₂, sink; radiologist |
| `xray-room` | imaging | 6 × 8 | X-ray machine, chest stand, C-arm, ultrasound/echo machine, lightbox |
| `clinical-lab` | laboratory | 10 × 8 | chemistry, haematology, blood-gas and urinalysis analysers, flow cytometer, cytogenetics workstation, biosafety cabinet, centrifuge, microscope, blood-bank and lab fridges, workstation, tube station (13 laboratory/pathology capabilities); lab technician |
| `ward-bay-4` | ward | 12 × 8 | 4 beds, 4 monitors, 4 O₂ outlets, 2 infusion pumps, curtains, overbed tables, sink; double door; 4 inpatient/ward slots |
| `icu-bed-space` | icu | 5.5 × 8 | bed, monitor, O₂, ventilator, infusion pump, suction, dialysis machine, sink; sliding door; icu slot |
| `rehab-gym` | rehabilitation | 10 × 8 | parallel bars, treatment plinths, exercise bikes, wall bars, exercise mat, scale, wheelchair |
| `pharmacy` | pharmacy | 6 × 8 | counter, records terminal, medication cabinet and fridge, pharmacy shelves; restricted zone `dispensary` (pharmacist, nurse); pharmacist |
| `nursing-station` | nurse-station | 6 × 8 | nurse-station desk, records terminal, board, medication cabinet and fridge, glucometer, ECG cart, crash cart, defibrillator, sink; open front; nurse |
| `teaching-room` | teaching | 10 × 8 | case board, anatomy atlas kiosk, projector screen, whiteboard, bookshelf, 6 desks; attending |
| `elevator-cabin` | elevator | 2.4 × 2.4 | steel walls, 1.4 m glass sliding door: an elevator car (one per level it serves) |

Five catalog types were added for the rehabilitation gym (`core-clinical.json`):
`treatment-plinth` (bed interaction), `parallel-bars`, `exercise-bike`,
`wall-bars` (wall), `exercise-mat` (not solid).

## Levels in the web world (EMBODIED R10)

* **Storeys.** Every level a building spans gets its walls (the building's
  wall style) at the level's elevation; a building's roof is drawn on its top
  level only. Upper floors are the collision model's `slab` colliders
  (building rect minus the stairwells, 0.2 m thick): drawn in the batch of
  the storey below, so a slab is also that storey's ceiling. An upper room's
  floor keeps the stairwell open.
* **Flights.** Consecutive stops of a stairs/ramp connector are a flight's
  foot (lower level) and head; the flight runs straight between them along
  x or z, `width` wide. The collision model adds a `ramp` collider (a solid
  wedge under a linear surface: the avatar walks up and down it, steps of at
  most 0.5 m are climbed and the surface is followed 0.6 m down — physics
  `RAMP`), `rail` colliders on both long sides (from the lower floor to 1 m
  above the upper one) and across the stairwell's foot end upstairs. The
  renderer draws stairs as one riser per 0.18 m with nosings, stepped glass
  balustrades under sloped handrails, and a guard rail round the stairwell.
* **Elevators.** An elevator connector's car is a room on every level it
  serves (template `elevator-cabin`) containing its stop. The renderer adds
  a call panel beside the car door outside and a car panel inside; E on the
  call panel opens the car door, E on the car panel opens the floor choice
  (web: the elevator window). The ride closes the door, dims the view for
  a moment, moves the avatar to the same spot of the car on the chosen level
  and opens the door there (`WorldApi.rideElevator`).
* **Culling.** Each level above the default one is its own batch and group:
  indoors only the camera's level is drawn, plus the levels a stairwell
  within 9 m joins it to; outdoors every level (the upper storeys are the
  facade). Signs, screens, door leaves and NPCs follow the same rule; the
  aim ray ignores hidden levels; lights prefer fixtures on the avatar's level.
* **Map.** The minimap shows the avatar's level; the big map opens on it and
  has floor tabs (stairs and elevator cars drawn as symbols, a floor badge,
  the avatar and the destination faded on other floors). Destinations carry
  their level.
* **Auto-walk ("Go there").** `walkTo({ x, z, level })` to another level walks to the
  nearest flight's approach point, climbs or descends it, and walks on — or,
  without stairs, rides an elevator (fewest level changes first).
* Single-level facilities render, collide and navigate exactly as before.

## Equipment models (GLB/glTF)

An equipment type's optional `model` replaces its voxel parts in the web
world (docs/ASSETS.md has the asset pipeline: licences, hashes, local-only
files and `clinicalcraft assets inspect`). The renderer loads it with
three's GLTFLoader (+ MeshoptDecoder, imported only for a model that uses
it; DRACO only when a decoder path is configured), once per URL; relative
`uri`s resolve under `/local-assets/`.
It checks the pinned `sha256`, fits the model to the footprint (`fitModel`:
the reference `scale` — else a uniform fit inside the footprint — then
`rot`, the bounding box centred on the footprint on the floor, then
`offset`), casts shadows and is disposed with the world. Any error or a
missing file keeps the voxel parts. The collider is always the footprint and
the interaction target always the placement's: the model's meshes never
take the aim (an invisible footprint box does).

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
`ecg-machine` (device, ecg-12lead; prepare, connect and record need the cart at
the patient's side), `defibrillator` (device, defibrillator + cardiac-monitor: a
monitor-defibrillator), `crash-cart` (device, crash-cart + medications + airway +
suction + iv-access: the cannulation kit), `treatment-cart` (device, iv-access,
portable: the nursing treatment cart of ward bays, ICU bed spaces and theatres —
cannulas and sample tubes), `oxygen-outlet` (device, oxygen +
suction, wall), `oxygen-cylinder` (device, oxygen, portable),
`iv-pole` (no capability, interaction none: a stand), `infusion-pump` (device,
infusion-pump — infusion hardware; IV access is the patient's cannula, not
equipment),
`ventilator` (device, ventilator), `suction-unit` (device, suction),
`nebulizer` (device, nebulizer, portable), `glucometer-station` (device, point-of-care),
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
  capability groupings, case board, atlas kiosk, shelves, garden
  benches, pond, trees, flowers, horizon, build zone and crafting bench.
  Default for `outpatient` cases whose `facility` is `clinic-v4`.
* `general-hospital` — multi-department hospital (ED with resus bays and
  ambulance bay, outpatient clinic, radiology, laboratory, pathology,
  pharmacy, ward, ICU, operating theatre, nurse station, conference room,
  garden + build zone). Patient slots accept every case setting.
* `teaching-hospital` — a two-level teaching hospital composed from room
  templates (22 instances): **L0** entrance plaza, lobby with reception,
  triage, ED (2 resus bays, 2 cubicles, nursing station, store), radiology
  (CT, X-ray), laboratory, pharmacy (restricted dispensary: pharmacists and
  nurses), outpatient consult and orthopaedic examination rooms, ambulance
  bay; **L1** (elevation 4.5 m) medical wards A and B (4 beds each) with a
  nursing station, ICU (2 bed spaces, nursing station, store), teaching room,
  rehabilitation gym, operating theatre (restricted sterile zone), staff
  room. Main stairs (2 m wide, lobby → first-floor landing) and an elevator
  (cars on both levels). 17 patient slots (emergency, outpatient,
  inpatient/ward, icu, operating-room), 11 staff on both levels. It is
  nobody's own facility: the web offers it as an alternative for every case
  it can host without blocking capability gaps (9 of the 10 built-in cases).

### V4 workstation capability groupings (clinic-v4)

| V4 station | placement capabilities |
|---|---|
| 检验工作台 lab (−8, −7) | lab-hematology, lab-chemistry, lab-serology, flow-cytometry, cytology |
| 影像工作站 imaging (8, 3) | ct, ultrasound, pet-ct, xray |
| 病理与遗传工作台 path (8, −7) | histopathology, cytogenetics, molecular |
