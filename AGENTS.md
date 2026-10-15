# Working on the ClinicalCraft codebase (for coding agents and humans)

This file is for contributors (Claude Code, Codex, Grok CLI, ZCode, humans).
`CLINICALCRAFT.md` is different: it is *runtime* memory for ClinicalCraft's own agents.

## Layout
- `packages/core` — zod schemas + pure deterministic engine. No I/O, no `Date.now()`/`Math.random()`.
- `packages/content` — cases, facilities, equipment catalogs, JSON Schemas (data only; loaded by `loadContent` in `@clinicalcraft/agent/node`).
- `packages/agent` — runtime: Op/Event protocol, ClinicalSession, providers, tools, approvals, hooks. `src/node/` is the only place allowed to import `node:*`.
- `packages/cli`, `packages/server`, `packages/mcp` — front-ends (protocol clients).
- `packages/web` — Vite + three.js voxel world and UI (vanilla TS DOM).
- Contracts: `docs/ARCHITECTURE.md`, `docs/PROTOCOL.md`, `docs/FACILITIES.md`, `docs/CASE_AUTHORING.md`.

## Commands
```bash
npm install
npm run build:lib          # libraries → packages/*/dist (`npm run cc` loads workspace packages from dist)
npm run typecheck          # tsc -b for libraries (also emits dist) + web tsc --noEmit
npm test                   # vitest (all packages)
npm run cc -- cases validate --all && npm run cc -- cases verify --all
npm run dev                # web world at http://localhost:5173
npm run build              # libraries + web
npm run test:e2e           # Playwright (web)
```

## Conventions
- TypeScript ESM, `NodeNext`: relative imports end in `.js`.
- Contract types first; keep modules small (no god files); JSDoc on exports.
- All user-facing strings are bilingual (zh-CN + en) — runtime strings in `*/i18n.ts`, content as `LocalizedText`.
- Grounding: agents may only state facts from case data; never add "normal" defaults for unrecorded data.
- Never commit `assets/local/`, imported figures/PDFs, API keys, or `.clinicalcraft/settings.local.json`.
- Every new case must pass `cases verify` (reference `solution` path) and carry `extensions.testUtterances`.
