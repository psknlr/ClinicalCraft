# @clinicalcraft/web

The 3D voxel clinical world (Vite + three@0.180.0, vanilla TypeScript DOM, no
UI framework). The world is built from a facility JSON and the equipment
catalogs; patients and staff are figures of real proportions built in code
(`src/world/figure/`: skin, hair and its style, build and stature from the
appearance; the uniform of a role as a position wears it; standing, sitting,
in bed under the covers — or, as the body an equipment type is drawn with
(a station's patient simulator: `manikin.ts`), on its side on a flexed table,
under a blanket or draped for an operation on the chest, breathing as its state
says; faces of one skin whose lids blink and whose lips
part over their teeth, a woman's features or a man's; hair in locks — long
and layered, in waves, bobbed, cropped, tied back; they breathe, turn to the
learner and speak),
and the player's hand holds a stethoscope; equipment is interactive
(workstations take orders, monitors show live vitals and an ECG trace, the
case board takes decisions, the atlas kiosk opens the anatomy viewer), and
what is drawn of a device follows its state in the world model — the layers of
its model, its screens' picture, its manikin (`live.ts`, `layers.ts`;
docs/FACILITIES.md "A look for each state").
The `ClinicalSession` runs in the browser, so the world is fully playable
offline. The UI is bilingual (zh-CN / en), in the words of
[docs/GLOSSARY.md](../../docs/GLOSSARY.md).

**Case library:** each card states the case's clinical review status
("Editorial review" — the selected case: "Editorial review 2026-10-28 · not
yet reviewed by a licensed clinician"); the selected case's learning outcomes
sit in a closed "Learning outcomes (n) · may reveal the diagnosis" disclosure
(their text comes from the full case: the bundled index carries a count only);
the debrief lists them in full, with the guidance the review checked.

```bash
npm run dev                      # http://localhost:5173 (workspace packages from source, no build needed)
npm run build                    # packages/web/dist (served by `clinicalcraft serve`)
npm run build:standalone         # packages/web/dist-standalone/ClinicalCraft.html (one offline file)
npm run test:e2e                 # Playwright (Chromium + SwiftShader WebGL)
```

**Language models in the browser** (settings panel → LLM):

| mode | how |
|---|---|
| `offline` (default) | deterministic responders, no network |
| `proxy` | the page is served by `clinicalcraft serve`; calls go through `POST /api/llm/stream` and keys stay on the server |
| `direct` | your own key, kept in `sessionStorage` unless you opt in to remember it; Anthropic via the official SDK (`dangerouslyAllowBrowser` only in this mode), OpenAI-compatible providers via `fetch` |

**Embodied mode** — "In-world mode" to the learner (the default; docs/EMBODIED.md §2.1, §6): the UI shows no
more than the world lets the learner perceive and never decides by a rule of
its own. The monitor panel and the HUD's vitals strip show the live screen
only while the world's vitals check holds through that monitor's screen
(otherwise: why, and the way there); the panels' rows show the world's
verdict from where the learner stands (done here, a short step the UI takes
and announces, or the world's reason with "Go there" / the act to do first);
lab tests are ordered at the patient's side from the patient's **Tests** tab
(the sample is taken there); the demonstration's (autopilot's) live trace, the delegation
outcome and the HUD dock speak the learner's language (`ui/panels/trace-labels.ts`),
colleagues are named (`app/staff.ts`). Bodies the world moves are animated
(`app/embodied.ts`: `BrowserMover` follows the world's route; a transported
patient lies on the bed the walker pushes); real-time ticks pause while an
agent drives a body. Known behaviour, not changed in this release: a team
relocation (a transfer, a phase with a location) is not animated — the
patient is drawn where they arrive, with a toast naming the place; the
simulated clock keeps advancing while the tab is hidden; on a phone, toasts
at the top can briefly cover HUD buttons (docs/EMBODIED.md §14.3).

**External agent** (served by `clinicalcraft serve` only): in a running
encounter, `Esc` → “Allow an external agent to control this session” lets
your own MCP client (`clinicalcraft mcp --attach`) act as the clinician;
off by default, per encounter, never saved. The HUD badge shows the
live-session id and attach key to hand to the agent (copyable), the calls
running and Disconnect; its approval requests are labelled as the external
agent's (`app/external.ts`; docs/PROTOCOL.md §13.6).

The standalone build is offline only. It embeds the local-only V4 assets
when `assets/local/` exists at build time — such a file must never be
published; build a redistributable one with
`npm run build:standalone -- --no-local-assets` (from the repository root or
this package; docs/ASSETS.md).

**Controls:** `WASD` move · mouse look · `Space` jump · `Shift` sprint · `E`
interact · `T`/`Enter` talk · `V` monitor · `J` journal · `M` map ·
`B`/`Tab` bag · `1–9` hotbar · `Esc` pause. Touch controls appear on
touch screens.

**A place in the care team** (docs/EMBODIED.md §2.1): for a case that offers
places, the case-start card shows — in in-world mode — the team's line-up and
"Your place in the team" (the operating surgeon by default; first assistant,
second assistant, scrub nurse where the case's team has them); `?seat=` and
`?lineup=` (beside `?team=`) choose them from the address, `__QA__.start(case,
facility, resume, team, seat, lineup)` from a test (its four-argument form is
the operating surgeon). A place asked for is always sent: one the team does
not offer shows as such, and a place the session refuses is not entered — the
card says why, in the session's words; so is a saved encounter in a place whose
settings would stop the stand-in surgeon. Taken, you join the team at the
operating table and the stand-in surgeon operates — its team begins paused and
goes on once you are in the encounter, so its first call-out waits for its card,
and the encounter is saved again as it goes on (`app/places.ts` `startPace`,
`teamGoesOn`; `app/session.ts` `letTeamGoOn`); while the stand-in waits for your
answer the team's clock holds, so its request never runs out while it is yours
to answer; a case `clinicalcraft serve`
sends fetches its place path first (`/api/content/cases/:id/place-path`). The
**Demo** button (the demonstration works the case as the operating surgeon) is
greyed out in a place — the pause menu's and the panel's **Start** and **Watch**
too —, saying so in the session's words (`ui/demonstration.ts`). The
**surgery window** then works by place (docs/PROCEDURE.md §7): each port says
who holds it, with **Take**, **Hand back** and **Hand to …** (a colleague at
the table) where the field would take them, an insert where your place may put
one in (in the scrub nurse's place **Ask for the …** until it is passed), the
actions through the ports you hold, the **camera block** — aim at a region, the
whole field, follow the work, **Closer** / **Wider** — for the camera holder
(otherwise why not), and the **instrument table** (passing, for the scrub
nurse, each instrument to whoever may put it in); the operator's own steps stay
in view, read-only.

In a place the **Team** window (HUD **Team**, which says "Team · waits for you"
while the stand-in surgeon waits for your answer) says "You: First assistant"
and the line-up, lists the team with their positions ("First assistant: you ·
Dr Abe stands by"), puts first what the stand-in waits for you to do — "You
answered — the surgeon goes on" once you have —, and offers the answers to what
is said to your place while the stand-in's request is open: **Read back** /
**Can't** to a request, **Confirm** / **Not now** to a colleague's read-back of
your own ask, **Do it in the surgery window** and the report once the stand-in
confirms, and **Go on** after its stop (or once it said it cannot go on); **I
play my place** / **Observe** chooses who plays it. Operating, **Ask** (whom, and
traction, let go, the camera, an aim, closer, wider or a pass) asks the team;
**Need** (what the team can find and bring) and, in the scrub nurse's place,
**Say the count** (never typed) send the team's ops, and the session's refusal
shows as it is. The stand-in's **call-out** ("Dr Ito: Clipping the cystic
duct.") is its own card: **No objection** or **Stop** (Esc); stopped, the Team
window opens to answer. A colleague's window offers the operating table's work
the field lets them take now — **Hold port …**, **Let go**, **Hold the camera**,
**Camera on …**, **Pass the …** —, keeping the delegation and its outcome in that
window; `@一助`, `@二助`, `@扶镜手`, `@术者`, `@surgeon`, `@first assistant` or
`@camera holder` in a line names whoever holds that position now — the position
you hold yourself names nobody else (you are told so). The badge says the place
("In-world · OR 7 · First assistant", the place never cut short); in the scrub
nurse's place a bar on the scope dock (hidden while a window is open, with its
own **Hide**) says what is asked for, with its **Pass**, what waits to go in and
when the count is due, hands what you carry to the surgeon and opens **In my
hands** and the **Instrument table** (the operative field's, in the surgery
window: the world's instrument sets are opened at the set); at the sterile
field your hand is gloved.
A device's operations the world will not let you do are greyed out, with why
under them; one your own steps fix (the cart to fetch) stays to press, and the
world says the way.

| folder (`src/`) | |
|---|---|
| `world/` | voxel renderer — `index.ts` builds the `WorldApi` over a `VoxelWorld` (`voxel-world.ts`) and its parts: `stage.ts` (renderer, scene, lights), `facility-build.ts`, `people.ts` (patients and staff), `doors.ts`, `rides.ts`, `autowalk.ts`, `input.ts`, `interaction.ts`, `overlay.ts`, `blocks.ts`, `carts.ts`, `culling.ts`, `frame-loop.ts`, `map-data.ts`, `qa.ts`; equipment meshes (and optional GLB models, `models.ts`, their layers `layers.ts`; the body a type is drawn with, `manikin.ts`; a placement whose look follows its state, `live.ts`), live screens and the pictures of the others (`screens.ts`; a thoracoscope's picture: `scope-picture.ts`), NPCs, map, build zone; levels (`levels.ts`: storeys, stairs `stairs.ts`, elevators `elevator.ts`, level culling, cross-level autopilot `route.ts`); colliders, wall layout, physics, path-finding and build-zone rules come from `@clinicalcraft/world` (`geometry.ts`, `physics.ts`, `pathfind.ts`, `buildzone.ts` here re-export it) |
| `app/` | app controller, session bridge, settings, LLM modes, persistence, local assets, external control (`external.ts`: the world bridge for `clinicalcraft mcp --attach`) |
| `ui/` | HUD, intro/case library, approval dialog, panels (conversation, orders, report, monitor, board, journal, debrief, map with floor tabs, elevator, atlas, autopilot, inventory, help, pause) |
| `atlas/` | anatomy viewer (needs the local-only anatomy model) |
| `harness/` | `world-harness.html`, a QA page that renders facilities without a case (`?facility=teaching-hospital`; `?model=<equipment type>` draws that type with a generated GLB) |
| `build/` | the Vite plugin that bundles the case index (`virtual:clinicalcraft/case-index`) |

**Content:** the case library is an index built from `packages/content` at
build (and dev) time — the card, filter and facility-choice fields only;
every full case is its own lazy chunk, loaded (and validated) when the case
is selected or started. Facilities, room templates and equipment catalogs are
bundled; facilities that place room templates are compiled when loaded.

The e2e suite (70 tests in 24 spec files, `e2e/`) runs Chromium with
SwiftShader only — no other browser or real GPU is tested. E2E tests start
Vite on port 5197 (`CC_E2E_PORT`; `external-agent.spec.ts`
also builds the web into a temporary directory and runs `clinicalcraft serve`
and `clinicalcraft mcp --attach` from source) and use the Chromium at
`CLINICALCRAFT_E2E_CHROMIUM` (or `PW_CHROMIUM`), else `/opt/pw-browsers/chromium`
when present, else Playwright's own (`npx playwright install chromium`;
`CLINICALCRAFT_E2E_CHROMIUM=playwright` forces it, as CI does).
