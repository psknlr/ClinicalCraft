# @clinicalcraft/web

The 3D voxel clinical world (Vite + three@0.180.0, vanilla TypeScript DOM, no
UI framework). The world is built from a facility JSON and the equipment
catalogs; patients and staff are voxel NPCs; equipment is interactive
(workstations take orders, monitors show live vitals and an ECG trace, the
evidence board takes decisions, the atlas kiosk opens the anatomy viewer).
The `ClinicalSession` runs in the browser, so the world is fully playable
offline. The UI is bilingual (zh-CN / en).

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

**Embodied mode** (the default; docs/EMBODIED.md §2.1, §6): the UI shows no
more than the world lets the learner perceive and never decides by a rule of
its own. The monitor panel and the HUD's vitals strip show the live screen
only while the world's vitals check holds through that monitor's screen
(otherwise: why, and the way there); the panels' rows show the world's
verdict from where the learner stands (done here, a short step the UI takes
and announces, or the world's reason with "Go there" / the act to do first);
lab tests are ordered at the patient's side from the patient's **Tests** tab
(the sample is taken there); the autopilot's live trace, the delegation
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

| folder (`src/`) | |
|---|---|
| `world/` | voxel renderer, equipment meshes (and optional GLB models, `models.ts`), live screens, NPCs, map, build zone; levels (`levels.ts`: storeys, stairs `stairs.ts`, elevators `elevator.ts`, level culling, cross-level autopilot `route.ts`); colliders, wall layout, physics, path-finding and build-zone rules come from `@clinicalcraft/world` (`geometry.ts`, `physics.ts`, `pathfind.ts`, `buildzone.ts` here re-export it) |
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

The e2e suite (45 tests in 16 spec files, `e2e/`) runs Chromium with
SwiftShader only — no other browser or real GPU is tested. E2E tests start
Vite on port 5197 (`CC_E2E_PORT`; `external-agent.spec.ts`
also builds the web into a temporary directory and runs `clinicalcraft serve`
and `clinicalcraft mcp --attach` from source) and use the Chromium at
`CLINICALCRAFT_E2E_CHROMIUM` (or `PW_CHROMIUM`), else `/opt/pw-browsers/chromium`
when present, else Playwright's own (`npx playwright install chromium`;
`CLINICALCRAFT_E2E_CHROMIUM=playwright` forces it, as CI does).
