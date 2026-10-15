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
`npm run build:standalone -w @clinicalcraft/web -- --no-local-assets`
(docs/ASSETS.md).

**Controls:** `WASD` move · mouse look · `Space` jump · `Shift` sprint · `E`
interact · `T`/`Enter` talk · `V` monitor · `J` journal · `M` map ·
`B`/`Tab` bag · `1–9` hotbar · `Esc` pause. Touch controls appear on
touch screens.

| folder (`src/`) | |
|---|---|
| `world/` | voxel renderer, equipment meshes, live screens, NPCs, physics, path-finding, map, build zone |
| `app/` | app controller, session bridge, settings, LLM modes, persistence, local assets |
| `ui/` | HUD, intro/case library, approval dialog, panels (conversation, orders, report, monitor, board, journal, debrief, map, atlas, autopilot, inventory, help, pause) |
| `atlas/` | anatomy viewer (needs the local-only anatomy model) |
| `harness/` | `world-harness.html`, a QA page that renders facilities without a case |

E2E tests start Vite on port 5197 (`CC_E2E_PORT`) and use the Chromium at
`PW_CHROMIUM` or `/opt/pw-browsers/chromium` when present, else Playwright's
own (`npx playwright install chromium`).
