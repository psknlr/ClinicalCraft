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
| `app/` | app controller, session bridge, settings, LLM modes, persistence, local assets |
| `ui/` | HUD, intro/case library, approval dialog, panels (conversation, orders, report, monitor, board, journal, debrief, map with floor tabs, elevator, atlas, autopilot, inventory, help, pause) |
| `atlas/` | anatomy viewer (needs the local-only anatomy model) |
| `harness/` | `world-harness.html`, a QA page that renders facilities without a case (`?facility=teaching-hospital`; `?model=<equipment type>` draws that type with a generated GLB) |
| `build/` | the Vite plugin that bundles the case index (`virtual:clinicalcraft/case-index`) |

**Content:** the case library is an index built from `packages/content` at
build (and dev) time — the card, filter and facility-choice fields only;
every full case is its own lazy chunk, loaded (and validated) when the case
is selected or started. Facilities, room templates and equipment catalogs are
bundled; facilities that place room templates are compiled when loaded.

E2E tests start Vite on port 5197 (`CC_E2E_PORT`) and use the Chromium at
`CLINICALCRAFT_E2E_CHROMIUM` (or `PW_CHROMIUM`), else `/opt/pw-browsers/chromium`
when present, else Playwright's own (`npx playwright install chromium`;
`CLINICALCRAFT_E2E_CHROMIUM=playwright` forces it, as CI does).
