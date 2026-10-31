# Working on the ClinicalCraft codebase (for coding agents and humans)

This file is for contributors (Claude Code, Codex, Grok CLI, ZCode, humans).
`CLINICALCRAFT.md` is different: it is *runtime* memory for ClinicalCraft's own agents.

## Layout
- `packages/core` — zod schemas + pure deterministic engine (also room templates, GLB inspection, bystander cues). No I/O, no `Date.now()`/`Math.random()`.
- `packages/world` — embodied world model (registry, collision, navigation, visibility, spatial policy, perception, device behaviours, action bus, patient transport, traces). Same purity rules as core: no DOM, no three.js, no `node:*`.
- `packages/content` — cases, facilities, room templates, equipment catalogs, benchmark scenarios (`bench/<suite>/`), JSON Schemas (data only; loaded by `loadContent` in `@clinicalcraft/agent/node`).
- `packages/agent` — runtime: Op/Event protocol, ClinicalSession (`src/session/`), providers, tools (clinical, world, scope of practice), approvals, hooks, skills, embodied mode, world-bridge client (`src/bridge/`). `src/node/` is the only place allowed to import `node:*`.
- `packages/cli`, `packages/server`, `packages/mcp` — front-ends (protocol clients); `server` also routes the live-world bridge, `mcp --attach` uses it.
- `packages/bench` — embodied agent benchmark (scenarios in `packages/content/bench`, `clinicalcraft bench`).
- `packages/web` — Vite + three.js voxel world and UI (vanilla TS DOM); embodied by default (`src/app/embodied*.ts`).
- `scripts/blender` — the Blender side of equipment models (Python inside Blender or with the `bpy` module): `clinicalcraft_blender.py` (catalog lookup, blockout, export to the model contract), `clinicalcraft_shapes.py` (shapes in a type's frame), `clinicalcraft_refine.py` (a model from a type's voxel parts), `build.py` + `builtin_models.py` (the built-in models in `packages/content/assets/models`); `.mcp.json` registers blender-mcp, telemetry off (docs/BLENDER.md).
- Contracts: `docs/ARCHITECTURE.md`, `docs/PROTOCOL.md`, `docs/EMBODIED.md` (authoritative; translated in `docs/zh-CN/EMBODIED.md`), `docs/FACILITIES.md`, `docs/CASE_AUTHORING.md`, `docs/ASSETS.md`.

## Commands
```bash
npm install               # no build needed: `npm run cc`, `npm run dev` and vitest run workspace packages from source
npm run typecheck          # tsc -b for libraries (also emits dist) + web tsc --noEmit
npm test                   # vitest (all packages)
npm run cc -- cases validate --all --strict && npm run cc -- cases verify --all   # --strict: content-standard lints fail
npm run cc -- facilities validate --all
npx tsx scripts/gen-json-schemas.ts --check   # JSON Schemas in step with the zod schemas (`npm run schemas` rewrites them)
npm run -s cc -- bench run --agent reference && npm run -s cc -- bench run --agent scripted-llm   # must stay 100 %
npm run dev                # web world at http://localhost:5173
npm run build              # libraries (packages/*/dist: built binary, `serve`) + web
npm run test:e2e           # Playwright (web)
blender -b -P scripts/blender/build.py   # rebuild the built-in equipment models (Blender 4.1+, or `python3` with the `bpy` module), then `npm run build`
```

## Conventions
- TypeScript ESM, `NodeNext`: relative imports end in `.js`.
- Contract types first; keep modules small (no god files); JSDoc on exports.
- All user-facing strings are bilingual (zh-CN + en) — runtime strings in `*/i18n.ts`, content as `LocalizedText`.
- Words follow `docs/GLOSSARY.md`: learner-facing terms (in-world mode / 实景模式, demonstration / 示范接诊, 智能体, 学员…) vs technical names (embodied, autopilot), and the register rules; add a term there first.
- Grounding: agents may only state facts from case data; never add "normal" defaults for unrecorded data.
- Embodied mode has one path to a clinical effect (the session's tool path) and one bedside rule / one screen rule in `@clinicalcraft/world` — front-ends ask the world, never re-implement a rule.
- Docs: if code and a contract doc disagree, fix one of them in the same change; keep `docs/zh-CN/EMBODIED.md` in step with `docs/EMBODIED.md`, and keep the status table honest.
- Never commit `assets/local/`, imported figures/PDFs, API keys, or `.clinicalcraft/settings.local.json`.
- Every new case must pass `cases verify` (reference `solution` path) and carry `extensions.testUtterances`.
