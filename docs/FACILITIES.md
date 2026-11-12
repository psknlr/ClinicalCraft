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
* Screens: name a part `"screen"` and set the equipment `screen` kind; the web
  client paints a canvas texture on it. `vitals` and `ecg` are live — the
  patient's monitor, redrawn as it changes. The others are a representative
  picture of what the equipment is for, drawn once: `xray` (a chest film), `ct`
  and `pacs` (an axial slice), `lab`, `text`, `logo`, and `thoracoscopy` — the
  round field of a rigid scope in the chest: ribs under the pleura with the
  vessels that run along them, the collapsed lung with its fissure and carbon
  pigment, a pad of fat, a grasper (`packages/web/src/world/scope-picture.ts`;
  every monitor of one size shows the same frame, as monitors on one camera
  do). A representative picture is never a patient's own finding.
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
  `node scripts/preview/render.mjs models --catalogs <catalog files> [--compare 1] [--states all|<ids>] --out <png>`
  draws the types' GLB models as the world does, beside their voxel parts, with the body a type is drawn with ("A
  body drawn with equipment" below; BLENDER.md "Looking at the result") — a type whose look follows its state as
  it starts, or once per state named (`--states all`: the storyboard of its states; "A look for each state" below).
  `node scripts/preview/render.mjs people --facility <facility file> [--only <staff ids>] [--view front|iso|back|side|face|face-iso|face-side|chest|hands] --out <png>`
  draws the facility's staff as the world does ("Staff in the 3D world" below; `--blink 0..1` and `--speak 0..1`
  shut their eyes and open their mouths that far); `--case <case.json>` draws a case's
  patient standing, sitting and in bed, and their companion; `--posture lateral [--up right] [--cover blanket|drapes]
  [--flex 9] [--asleep 1]` lays whoever is drawn on their side on an operating table ("A body drawn with
  equipment" below; `--view front|back|head|top`; `--breath` and `--rise` draw the chest that far out); `--sheet roles|positions|looks|patients` the
  reference sheets (every role's uniform, every theatre position, what an appearance can ask for);
  `--view hand` the hand by itself in each of its poses (`--detail 0`: as a figure has it), `--view held` the
  player's own hand and stethoscope as the camera sees them.
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
| `walls: { height = 5, base, body, top, thickness = 1, frame?, mullion? }` | buildings | the outer walls: materials by course (`base` the bottom row of each storey, `body`, `top` the last row); `frame` the window frames (default: `base`); `mullion` the mullions of windows ≥ 2.5 m wide, one every 1.5 m (default: `wood` — V4 —, else the frame) |
| `levels: [levelId…]` | building openings | the levels an opening exists on (default: every level the building spans) — e.g. the entrance door on the ground floor only, windows on every storey |
| `connectors: [{ id, kind: stairs \| elevator \| ramp, name, stops: [{ level, x, z }…] ≥ 2, travelSeconds?, accessible?, width?, roles = [] }]` | facility | portals between levels, stops listed in travel order; `travelSeconds` between adjacent stops (default stairs 15, ramp 10, elevator 20); `accessible` (default: elevators and ramps yes, stairs no) — wheelchairs, beds and pushed carts use only accessible ones; `width` of a stairs/ramp flight (m, default 2, ≤ 10); `roles` restrict who may use it (empty = everyone) |
| `access: [{ id, name, level?, rect, roles ≥ 1 }]` | facility | restricted areas: only these roles may plan through them (`ACCESS_DENIED` otherwise); an actor standing inside may always leave |

Roles (`ACTOR_ROLES`): `clinician` (the learner's avatar) and the staff roles
(`nurse`, `radiologist`, `pathologist`, `lab-tech`, `attending`,
`pharmacist`, `receptionist`, `paramedic`, `porter`).

**Staff in the 3D world.** A member of staff is drawn as a figure of real proportions (an adult
stands 1.74 m; the web's `src/world/figure/`), dressed for the job:

| who | wears |
|---|---|
| `nurse` | scrubs, a fob watch, pens and a name tag at the chest pocket, the identity card clipped below it, clogs |
| `attending` | shirt and tie under a white coat (lapels, three buttons, pockets), a stethoscope round the neck |
| `radiologist` | a white coat over scrubs, a dosimeter |
| `pathologist`, `pharmacist`, `lab-tech` | a white coat over a shirt or scrubs |
| `receptionist` | a shirt and belted trousers, the identity card on a lanyard |
| `paramedic` | a uniform shirt with epaulettes and reflective bands, boots |
| `porter` | a polo shirt, the identity card on a lanyard |
| position `surgeon`, `assistant-surgeon`, `scrub-nurse` | scrubbed: theatre cap, mask, sterile gown and gloves, the hands held together in front |
| position `anaesthetist`, `circulating-nurse` | theatre scrubs, cap and mask (the anaesthetist a stethoscope) |
| position `theatre-coordinator` | theatre scrubs and cap |
| position `recovery-nurse`, `radiographer` | scrubs — with a stethoscope, with a dosimeter |

A `position` (CHARACTERS.md §2) changes what its `role` wears, so nobody stands in theatre in a
white coat. `appearance` sets skin, hair and its style, build, stature, an accessory (glasses, a
mask, a cap…) and — with `shirt` and `pants` — the uniform's colours. The styles of hair:

| `hairStyle` | the hair |
|---|---|
| `short` | cropped: full on top, combed from the crown forward into a fringe and down the sides and the back to the hairline |
| `long` | layered, from a parting a little to one side: a curtain fringe swept either side of the brow to the cheekbones, lengths before the shoulders to the collarbones and behind them down the back |
| `wavy` | long loose waves from a middle parting under a fringe of wisps over the brows, a lock cut at the cheek beside each eye |
| `bob` | to the chin all round, cut straight, the ends turned a little in; a fringe of wisps |
| `bun`, `ponytail` | drawn back to where it is tied — a low knot, or a tail down the back — under a light fringe of wisps or a parted curtain, a fine strand left out before each ear |
| `curly` | a soft perm to the jaw, in close waves |
| `bald` | none |

`presentation` (`feminine` \| `masculine` \| `neutral`) says whether someone is drawn with a
woman's features and frame, a man's, or neither's in particular. Left out, a member of staff is
drawn by their hair: cropped or bald, a man's; any other style, a woman's — so say it for a woman
with cropped hair, a man with a ponytail, or whoever the name already tells of ("Ms Zheng"). The
people of a case are drawn by what the case records, never by their hair: the patient by their
`sex` (neither's when it is neither), a companion as neither's unless the case says who they are
(CASE_AUTHORING.md). A child is neither yet, a teenager on the way. What an appearance
leaves unsaid differs from one member of staff to the next (skin, hair and its style, build,
glasses, height by a few per cent) and is the same for the same staff id every time, so a theatre
team is three people, not one person three times. Everyone breathes, blinks, turns their head to
the learner and moves their jaw when they speak. A name tag floats over each.

A face is one skin (`figure/head.ts`, over the form of a head in `figure/skull.ts`): an oval, the
line of the jaw soft in to a small chin that stands under the lips, the jaw's lower border rising
to its angle under the ear. Lids and lips are that skin itself (`figure/eyes.ts`,
`figure/mouth.ts`: rings of finer points zipped into openings of the head's grid,
`figure/face-mesh.ts`), so they shade as one with the face and they move: a blink is the upper
lid coming down round the eye, its lashes with it, to shut on the lower lid; speech opens the
mouth as an oval — the lower lip and the chin go down, the corners half the way and a little in —
and under the upper lip the edge of the teeth shows over the dark of the mouth. Behind the lids
are eyes with an iris, a pupil and the lights in them; over them soft straight brows; the ears
are shells with a rim, a hollow and a lobe (`figure/ears.ts`). Skin gives a little light back in
shade, warmer than it took it (`figure/material.ts`), so a face out of the light stays rosy.

A woman's face and a man's differ where faces do (`FaceSpec.feminine` in `figure/skull.ts`; a
figure's frame in `figure/anatomy.ts`). Hers: larger eyes, more open, the upper lid over the top
of a large iris and a little fullness under the lower lid; finer, lighter brows; fuller lashes
that run on a touch beyond the outer corner; a smaller nose, low in the bridge; a narrower mouth
with fuller lips, their colour deepest along the line where they meet; rounder cheeks with a
flush that reaches up under the eyes and over the nose; a small chin; narrower shoulders and
waist, a slimmer neck. His: a heavier brow over narrower eyes, a larger nose, a wider mouth with
thinner lips of little more than the skin's colour, a broad jaw to a wide, taller chin, hardly
any flush; broader shoulders, a thicker neck.

Hair is hair (`figure/hair.ts`, `figure/locks.ts`): strands lying together in locks, each a
ribbon with a soft ridge that catches the light, thinning to its end — over a layer of hair close
to the scalp that is in their shade. From a parting the locks fan out over the head, or from the
crown; where the hair is long enough they go on down past the head — beside the face, before the
shoulders over the collarbones or behind them down the back, clear of the neck and the trunk — to
layered lengths, in waves that run round the head together if the style has them. A fringe is
separate locks that begin in the hair of the top: broad ones side by side with fine ones over
them, parting into ends the skin shows between; or a curtain swept from the parting. A band of
light where the head turns from the top to the sides is the sheen of healthy hair.

A face of an age, a width and a sex — and a style of hair on it — is sculpted once and kept as a
cast: everyone with such a face takes the cast in their own colours, so a hospital full of people
is built in the time of a few.

Hands are hands (`figure/hand*.ts`): one skin over a hand's bones — the knuckles half-way along
it, the fingers out of the palm through webs, the thumb out of its mound of muscle, nails — drawn
through a cage of a few hundred points and refined into a smooth surface (`figure/subdivide.ts`),
resting, laid flat on a lap or a bed, or closed over one another in front of a sterile gown. A
forearm turns with its hand (the wrist is wide the way the hand is wide) and the hand grows out
of the forearm's last ring, so wrist and arm are one surface. The player's own hand is the same
hand, refined once more, pinching the chest piece of its stethoscope pad to pad.

**Equipment types.**

| field | meaning |
|---|---|
| `portable: "cart" \| "handheld"` | can be wheeled to another spot (`cart`) or carried (`handheld`); absent = fixed. The built-in carts: `ecg-machine`, `defibrillator`, `crash-cart`, `treatment-cart`, `oxygen-cylinder`, `nebulizer`, `glucometer-station`, `pocus-cart`, `ultrasound-machine`. Every actor knows where the departments keep them (embodied perception: "usually kept in …") until it sees one elsewhere |
| `reach` | interaction reach in metres from the footprint (≤ 10). Default by interaction kind (core `DEFAULT_REACH`): workstation 1.2, monitor 2, bed 1.5, device 1.2, atlas 1.5, board 2.5, craft 1.2, sink 1, storage 1, none 1 (doors 1.2, staff 2). `oxygen-outlet` declares 2.2 (reached over the bed head) |
| `interactionPoints: [{ x, z }]` | where an actor stands to use it: local offsets from the footprint centre, rotated with the placement; absent = any free spot within reach with line of sight |
| `behavior: { initial, states: { id: { name?, available?, when?, supplies?, look? } }, operations: { id: { name, from: [state…] \| "*", to?, requires?: [WorldPredicate…], clinical?: { tool, select, item? }, durationSeconds?, reserve?, release?, roles?, uses?, sets?, link?, unlink?, newRun?, assessed? } }, derived?, runs? }` | declarative device state machine (EMBODIED §8). `clinical` runs a clinical tool (`order_test`, `read_result`, `intervene`, `check_vitals`, `examine`, `surgical_count`, `operate`) through the session's normal tool path — `operate` with `select: "item"` names a step of the operation (`insufflate`, at the procedure's usual pressure or the operation's `pressure` parameter, or `desufflate`: a tower's gas controls), and a step the operation refuses leaves the device's state as it was; `select`: the case item comes from an operation parameter (`param`), is the first item whose `requires` this device provides (`capability`) or the case's monitoring intervention (`monitoring`). `select: "item"` with `item` names one case item (a WHO board's `sign_in` → the case's `sign-in`). `derived: "monitor-attachment"` mirrors the engine's `monitorAttached` (states `attached` / `detached`, never stored). `derived: "case-record"` makes a board a view of the case record: in a case that defines every item its operations name (`select: "item"`), the state is the last state whose `when` condition holds (else `initial`) and each operation's only effect is its clinical act, through the session's tool path, so the board, the bedside and an agent make one entry and the board follows the record whoever made it; in a case without those items the device keeps its own state machine and its operations are physical. A state's `supplies` lists the type's capabilities that work in it (omit: all of them; each must be one of the type's capabilities, else an error): the world's capability rule (`WorldRuntime.provides` — bedside providers, an operation's equipment) follows it, so a laparoscopy tower `off` supplies no picture and no gas and powered on supplies its camera, light source and insufflator. A placement may start its device in another state (`Placement.state`, one of its type's states, else an error): a theatre set up before the list. A state's `look` is what the web world draws of the equipment in it — the layers of its model, its screens' picture, its manikin ("A look for each state" below). Built in: `ecg-machine` (idle → prepared → connected → completed: `prepare`, `connect`, `record` → `order_test` by capability, `reset`) and `patient-monitor` (derived; `attach` → `intervene` monitoring, `read`, `cycle_nibp`) |
| `screenNeeds: [WorldPredicate…]` | what the screens' picture needs, read by the world for this device — device predicates only (`state`, `nearbyState`, `linked`, `deviceAtBedside` and `all` / `any` / `not` of them; another kind fails parsing): while one does not hold, its screens are dark whatever the state's look says (`WorldRuntime.screenOf`). A camera's picture needs the tower on, lit and white-balanced and the scope in the chest: the tower's own monitor, the boom displays and a training station's monitor each say so, and the steps done under vision require the same predicates — one view ("Operations that work with other things" below) |
| `model: { uri, sha256?, scale?, offset?, rot?, license, attribution?, source?, use? }` | optional GLB/glTF model — visual only: the voxel parts stay the fallback, named `screen` parts keep drawing over it, the collider is always the footprint and a model is never interactive by itself; `source` and `use` (cleared / research-only / pending) are its provenance and use status (ASSETS.md) |

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
the patient), `{ actorHolding: id }` (an item id or an equipment type; worn
items count), `{ state: id | [id…] }`, `{ role: [role…] }`,
`{ handsClean: true }`, `{ nearbyState: { type, state, within? } }` (another
in-service device of that type on the same level within `within` m —
footprint to footprint, default 6 — is in one of the states: equipment that
depends on equipment, e.g. an electrosurgical unit that fires only with the
smoke evacuator running; `checkCatalogs` warns about an unknown type or
state), and `all` / `any` / `not`. A carried handheld item is in two states
at once — `held` / `equipped` and its own lifecycle state — and `from`,
`state` and `nearbyState` match either: `from: ["loaded"]` with
`requires: [{ "state": "held" }]` means loaded and in hand (EMBODIED §8.1).
Three more read what is in a hand or what is connected:
`{ actorHolding: id, itemState: id | [id…] }` — the actor holds one in that
state (a stapler with a reload in); `{ linked: { type, state?, via? } }` —
this device is connected, by instance, to a device of that type (in that
state), directly or through one of type `via` (a training station: the chest
tube in its chest, and through it the drainage unit on that tube); and
`nearbyState`'s `linked: { type, state? }` — the device nearby is connected
to one of that type (a drainage unit on water seal, connected to a chest tube
that is in). A refusal names what is missing: the item's state and the one
needed, the device not connected, the first alternative of an `any` (the rule
before its exception), the first failing part of an `all`, the device nearby
in a state a `not` excludes.

**Operations that work with other things.** An operation may change more than
its own device, each committed with it in the same action:

| field | |
|---|---|
| `uses: [{ item, from?, to?, link? }…]` | the item in the acting actor's hands it works with — of the alternatives in order, the first they hold in one of its `from` states (omitted: any). That very instrument moves to `to` (omitted: unchanged): a stapler fired at a training station is that stapler fired, its reload spent, exactly as when it is fired at the table. `link`: the item stays connected to the device (a chest tube placed in the station's chest). Refused when the actor holds none of them in such a state, naming the state the one in hand is in |
| `sets: [{ type, from?, to, within? }…]` | other devices: every in-service device of `type` within `within` m (default 6) — in one of `from`, when given — moves to `to` as a fresh one, its connections undone. A training station's reset puts back what the instructor presets for the next trainee |
| `link: { type, state?, within? }` | connect this device, by instance, to the nearest in-service device of `type` (in `state`) within `within` m (default `LINK_RANGE`, 2.5): both remember the other (`data.links`), across a hand-over, a put-down and a reload. Refused when there is none |
| `unlink: type \| true` | disconnect this device from the devices of a type (`true`: from all) |
| `assessed: [role…]` | the roles the step is assessed for. Taken by another role — which its `requires` may allow, e.g. `{ any: [{ role: [...] }, { nearbyState: { type: console, state: "practice" } }] }` — the result and the run record label it a role substitution, not assessed |
| `newRun: true` | on a device that keeps a run record: close the run and start the next |

**A run record** (`behavior.runs: true | { with: [type…], within? }`): a device that
keeps one — a training station — records every completed operation in the run under
way: the operation, its state before and after, who did it in which role, when (the
clinical clock), the items it used by instance with what became of them, a role
substitution; `with` adds the operations on the devices of those types within `within`
m (default 6) — the count board, the checklist, the drainage unit the drill uses — so
one trainee's run is one record, in the order it was done. An operation with `newRun`
closes the run (kept, the last ten) and starts the next with the presets its `sets`
put back. `WorldRuntime.runsOf(id)` returns the run under way and the closed ones.

**Validation** of the operations above: `checkCatalogs` warns about a `uses`, `sets`,
`link`, `unlink`, `linked`, `itemState` or `runs.with` naming a type no loaded catalog
defines or a state that type does not have, a `newRun` on a device without a run record,
an `assessed` role its `roles` do not allow, and `screenNeeds` on a type that shows
nothing on a screen; a `screenNeeds` state the type does not have is an error.

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
| `operating-theatre` | operating-room | 10 × 8 | operating table, surgical light, anaesthesia machine, monitor, instrument table, suction, infusion pump, O₂, C-arm, medication cabinet, records terminal, scrub sink; sliding door; restricted zone `sterile` (clinician, attending, nurse, porter); operating-room slot |
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
`offset`), casts shadows (except items under `MODEL_SHADOW_MIN` = 0.3 m on
every side) and is disposed with the world. Static placements of one model
on one level and in one 16 m square (`MODEL_CELL`) are drawn as instances
(`instanceModel`: a draw call per primitive however many placements; the
squares let the camera and the shadow pass cull what is out of view);
portable ones (carts, handheld items) are clones in their own group, so they
move, and so are the placements whose look follows their state. A model may have
**layers** — nodes named `layer:<id>` (docs/BLENDER.md "Layers") — drawn only in
the states whose look names them: an instance never draws one. Named `screen`
parts keep drawing their display over the model. Any error or a missing file keeps the
voxel parts. The collider is always the footprint and the interaction target
always the placement's: the model's meshes never take the aim (an invisible
footprint box does). docs/BLENDER.md has the Blender workflow.

## A body drawn with equipment (`manikin`)

A training station has a patient simulator on its table; a skills room has a manikin
on a trolley. An equipment type's optional `manikin` is such a body, drawn by the web
world with the equipment — by its own figure kit (`src/world/figure/`, placed by
`manikin.ts`), so it is one of the same figures as the people of the world and stays
one whatever that kit becomes. It is **nobody**: not an actor of the world model, no
record, nothing to examine or to talk to, no name tag. The aim finds the equipment,
the footprint stays the collider, and the body does not move. A case's patient is
never a manikin, and a manikin is never presented as a patient.

| field | |
|---|---|
| `posture` | `standing`, `sitting`, `lying` (on its back, under the covers), or `lateral`: on its side as for an operation on the chest — the arm underneath out in front on its board with the palm up, the upper arm straight forward over it on a support at shoulder height (no further from the trunk than a right angle, the face and the airway free), the leg underneath bent at hip and knee, the upper leg nearly straight on the pillow between them |
| `sideUp` | `lateral`: `left` (default) or `right` — the side operated on |
| `cover` | `lateral`: what covers it. `clothes` (default): what its `appearance` says — its own clothes, or a hospital gown. `blanket`: undressed, a theatre cap over the hair, a blanket over the hips and the legs that hangs a hand's breadth over the sides — on the table before the field is prepared, and after. `drapes`: undressed and draped for an operation on the side of the chest that is up — the theatre cap, four towels round the field (bare skin from the costal margin to under the armpit), a sheet over the hips and the legs that hangs over the sides and the foot of the table |
| `draped` | the earlier spelling of `cover: "drapes"`, kept for catalogs written with it (with `cover` as well, the two must agree) |
| `breathing` | whether its chest moves: `none` (default); `both` — it breathes, or is ventilated: in over a third of a five-second breath and out over the rest, on its side the chest wall that is up rising a millimetre; `one-lung` — on its side with only the lung underneath ventilated: half as deep, the side that is up all but still |
| `flex` | `lateral`: how far each half of a flexed table goes down from the break under the chest (degrees, 0–25): the trunk bends sideways over it and the head goes down with its end |
| `asleep` | eyes shut |
| `x`, `z` | where it is in the type's frame (m from the footprint centre, turned with the placement): the feet of one standing or sitting; the middle of what one lying on its back lies on; of one on its side, the middle of the table under the chest — where a flexed table breaks |
| `y` | height above the placement's floor of what it stands on, of its seat, or of the surface it lies on |
| `rot` | degrees about the vertical, as a placement's: at 0 one standing or sitting faces +Z and the head of one lying is towards −Z (on its side with the left up, the face is to −X) |
| `appearance` | its looks, as a person's (`presentation: "neutral"` for a body that is neither a woman's nor a man's) |

`sideUp`, `cover` (`draped`), `flex` and `breathing: "one-lung"` are refused on any
posture but `lateral`. What lies on the chest (the towels) breathes with it; the cloth
over the hips and the legs lies on the legs and does not. A state of the type's device
may change the cover, the breathing and the rest ("A look for each state" below).
Someone on their side lies with the back near the edge of the table, so that the bent knee stays
on it: the kit takes a table 0.58 m wide with its mattress, its middle 7 cm in front
of the middle of the body, breaking under the lower end of the breastbone, its foot
8 cm past the soles (`LATERAL` in `figure/anatomy.ts`); the surface is 19.6 cm below
the middle of the body, the shoulder underneath a little sunk into it.

The type's model and voxel parts are everything but the body — the table, the
supports, what stands on the skin — and are built round it: `placedPoint(rig, p)` and
`placedHeadPoint(rig, p)` (`manikin.ts`) say where a point of the figure's own frame
(a joint, a point of the trunk's surface, the mouth) is once the body is bent and laid
down, in the type's frame (docs/BLENDER.md "A model round a body"). `checkCatalogs`
warns when a manikin is put outside its type's footprint, above its height, or on a
handheld item. The models previewer draws it with the type.

## A look for each state (`look`)

What a device is like changes as it is used: a tower shows a picture once it is on; a
training station's simulator is under a blanket before the operation and draped
during it, ventilated on one lung while the chest is open, the scope standing in its
port from the moment it goes in. An equipment type with a behaviour may give each of
its states a `look` — what the web world draws of it in that state:

| field | |
|---|---|
| `layers` | the layers of the type's model drawn in this state: nodes of the GLB named `layer:<id>` (lower-case letters, digits, `_` and `-`; docs/BLENDER.md "Layers"). Every other layer is hidden; what is in no layer is always drawn. Omitted: no layer |
| `screen` | what the parts named `screen` show: a picture drawn once (`xray`, `ct`, `pacs`, `lab`, `text`, `logo`, `thoracoscopy`) or `none` — dark. Omitted: the type's `screen`. A patient's own live screen (`vitals`, `ecg`) is never a look's to change |
| `manikin` | what the state changes of the type's `manikin`: `cover`, `breathing`, `asleep` — or `posture`, `sideUp`, `flex`, though a model built round the body fits one body in one position. What it leaves out stays as the type says; a body turned off its side loses what only a body on its side has |

A state without a look, a state the type does not have, a device without a behaviour:
the type as it is, none of its model's layers (`lookOf` in core resolves a look).

**The look follows the state, and decides nothing.** The state is the world model's
(`WorldRuntime.stateOf`): stored, the one a placement starts in (`Placement.state`),
or derived from the case record. Whoever moves a device on — the learner at it, a
colleague asked to, an agent through `interact_object`, and so a model-driven member
of the team or a facilitator later — does it by the same operation under the same
rules, and the scene follows: the embodied link hands each `entity.state` event to the
renderer (`WorldApi.setEquipmentState(placementId, state, screen)`, `screen` being
`WorldRuntime.screenOf`: the state's picture, dark while what it needs does not hold),
asks every live placement again on any device's change of state, an item picked up,
put down or moved and a device taken out of service or back (a picture may need another
device), and on every clinical event (a state derived from the record has no event of
its own), and draws
every such placement as the world has it whenever the scene is drawn anew
(`syncScene`). A front-end never picks a look of its own; without a world model a
placement keeps the look of the state it starts in.

**Drawing** (`src/world/live.ts`). A placement whose type has looks is drawn as its own
copy of the model, not an instance, with screens and a manikin of its own. A change of
state shows and hides the copy's layers, paints the screens' picture (dark: no quad
drawn), and builds the manikin anew only when the figure itself changes — its cover,
its posture, asleep or awake; how its chest moves is animated every frame. Each layer
shown is a draw call more, and the triangles that count are the ones shown at once
(docs/BLENDER.md "Layers").

**Checks.** `checkCatalogs`: layers on a type without a model, a layer named twice, a
picture with no `screen` part to show it (warnings); a look that changes a patient's
live screen, changes a manikin the type does not have, or gives a body that is not on
its side what only one on its side has (errors). `clinicalcraft assets inspect --type
<id>`: every layer a look shows must be in the model (error), and a layer no look shows
is never drawn (warning). The models previewer draws a type in the states asked for —
`--states all` is the storyboard of its states.

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
`diagnostic-wall-set` (device, otoscope + stethoscope, wall: the two handles on coiled cords, the aneroid gauge over
its cuff basket, a stethoscope hung by its headset on a peg),
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
