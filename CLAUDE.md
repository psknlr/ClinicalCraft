# CLAUDE.md — working on the ClinicalCraft codebase (same as AGENTS.md)

This file is for contributors (Claude Code, Codex, Grok CLI, ZCode, humans).
`CLINICALCRAFT.md` is different: it is *runtime* memory for ClinicalCraft's own agents.

## Layout
- `packages/core` — zod schemas + pure deterministic engine (also room templates, GLB inspection, bystander cues, the operative field of a case's `procedure`: docs/PROCEDURE.md). No I/O, no `Date.now()`/`Math.random()`.
- `packages/world` — embodied world model (registry, collision, navigation, visibility, spatial policy, perception, device behaviours, action bus, patient transport, traces). Same purity rules as core: no DOM, no three.js, no `node:*`.
- `packages/content` — cases, facilities, room templates, equipment catalogs, benchmark scenarios (`bench/<suite>/`), JSON Schemas (data only; loaded by `loadContent` in `@clinicalcraft/agent/node`).
- `packages/agent` — runtime: Op/Event protocol, ClinicalSession (`src/session/`), providers, tools (clinical, world, scope of practice), approvals, hooks, skills, embodied mode, world-bridge client (`src/bridge/`), the care team (`src/session/team/`: scheduler + offline role policies, docs/TEAM.md), the characters (`src/characters/`: positions' role cards, model-driven team members and staff lines, docs/CHARACTERS.md). `src/node/` is the only place allowed to import `node:*`.
- `packages/cli`, `packages/server`, `packages/mcp` — front-ends (protocol clients); `server` also routes the live-world bridge, `mcp --attach` uses it.
- `packages/bench` — embodied agent benchmark (scenarios in `packages/content/bench`, `clinicalcraft bench`), the grounding benchmark and the operative benchmark (`bench operative`: suites in `<content dir>/operative/<suite>/`, anatomy variants hidden; docs/BENCHMARK_OPERATIVE.md) and the team benchmark (`bench team`: a case's care-team scenarios in observer mode; docs/TEAM.md).
- `packages/web` — Vite + three.js voxel world and UI (vanilla TS DOM); embodied by default (`src/app/embodied*.ts`). The people of the world and the player's hand are built in code in `src/world/figure/` (a sculpting kit, anatomy and postures, heads as one skin with lids and lips of its own — a woman's features or a man's, cast once a face, coloured per figure —, hands as one skin refined from a cage, clothes, hair in locks, the stethoscope; `src/world/npc.ts` is their rig: docs/FACILITIES.md "Staff in the 3D world"; `src/world/manikin.ts` draws the body an equipment type has — a station's patient simulator, on its side, under a blanket or draped, breathing — with the same figures: "A body drawn with equipment"; `src/world/live.ts` draws a device as its state is — the layers of its model, its screens, its manikin: "A look for each state").
- `scripts/blender` — the Blender side of equipment models (Python inside Blender or with the `bpy` module): `clinicalcraft_blender.py` (catalog lookup, blockout, export to the model contract), `clinicalcraft_shapes.py` (shapes in a type's frame; `k.layer(id)`: parts drawn only in some states), `clinicalcraft_refine.py` (a model from a type's voxel parts), `build.py` + `builtin_models.py` (the built-in models in `packages/content/assets/models`); `.mcp.json` registers blender-mcp, telemetry off (docs/BLENDER.md).
- Contracts: `docs/ARCHITECTURE.md`, `docs/PROTOCOL.md`, `docs/PROCEDURE.md`, `docs/BENCHMARK_OPERATIVE.md`, `docs/TEAM.md` (the care team working on its own), `docs/CHARACTERS.md` (positions, role cards, the character engine), `docs/EMBODIED.md` (authoritative; translated in `docs/zh-CN/EMBODIED.md`), `docs/FACILITIES.md`, `docs/CASE_AUTHORING.md`, `docs/ASSETS.md`.

## Commands
```bash
npm install               # no build needed: `npm run cc`, `npm run dev` and vitest run workspace packages from source
npm run typecheck          # tsc -b for libraries (also emits dist) + web tsc --noEmit
npm test                   # vitest (all packages)
npm run cc -- cases validate --all --strict && npm run cc -- cases verify --all   # --strict: content-standard lints fail
npm run cc -- facilities validate --all
npx tsx scripts/gen-json-schemas.ts --check   # JSON Schemas in step with the zod schemas (`npm run schemas` rewrites them)
npm run -s cc -- bench run --agent reference && npm run -s cc -- bench run --agent scripted-llm   # must stay 100 %
npm run -s cc -- bench team          # the care team's scenarios (cases with a `team`, e.g. a content pack's): must stay 100 %
npm run dev                # web world at http://localhost:5173
npm run build              # libraries (packages/*/dist: built binary, `serve`) + web
npm run test:e2e           # Playwright (web)
blender -b -P scripts/blender/build.py   # rebuild the built-in equipment models (Blender 4.1+, or `python3` with the `bpy` module), then `npm run build`
node scripts/preview/render.mjs models --catalogs packages/content/catalogs/materials.json,packages/content/catalogs/core-clinical.json --compare 1 --out /tmp/models.png   # the models as the world draws them, beside their voxel parts (docs/BLENDER.md); `--states all`: a type with looks in each of its states
node scripts/preview/render.mjs people --sheet roles,positions --out /tmp/people.png   # the people as the world draws them: staff by role and position (`--facility <file>`, `--case <case.json>`, `--view face|chest|hands|held|hand`; docs/FACILITIES.md)
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
