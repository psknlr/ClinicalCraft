# @clinicalcraft/content

Built-in ClinicalCraft content as plain JSON: clinical cases, facilities
(worlds) and equipment catalogs, plus the JSON Schemas editors use to
validate them. The package has no runtime code (`src/index.ts` is empty).
Node front-ends load it with `loadContent()` from `@clinicalcraft/agent/node`;
the web client imports the JSON directly (`@clinicalcraft/content/cases/…`).

```
cases/<id>/case.json        one case per folder (+ README.md: provenance, design, teaching notes)
facilities/<id>.json        clinic-v4, general-hospital
catalogs/<id>.json          materials, core-furniture, core-clinical, core-diagnostics
schemas/*.schema.json       case, facility, equipment-catalog, settings (generated: npm run schemas)
```

| | count |
|---|---|
| cases | 10 (9 synthetic, 1 adapted from a published case report), all `zh-CN` + `en` |
| facilities | 2 — `clinic-v4` (7 rooms, 21 placements, 1 patient slot) and `general-hospital` (37 rooms, 258 placements, 14 patient slots, 10 staff) |
| equipment types | 90 — 39 furniture/scenery, 25 clinical, 26 diagnostic |
| materials | procedural pixel textures in `materials.json` (V4 palette + clinical additions) and a few catalog-specific ones |

Authoring guides: [docs/CASE_AUTHORING.md](../../docs/CASE_AUTHORING.md) and
[docs/FACILITIES.md](../../docs/FACILITIES.md). Every case must pass both
checks:

```bash
npm run cc -- cases validate --all     # schema + referential integrity
npm run cc -- cases verify --all       # replays each `solution` + the extensions.testUtterances corpus
npm run cc -- facilities validate --all
```

Extra content (your own cases, facilities or catalogs) does not need to live
here: list directories that contain `cases/<id>/case.json`, `facilities/` or
`catalogs/` in the `contentDirs` setting.

Copyrighted figures and the source PDF of the published case are never
committed (`cases/*/assets/` is git-ignored); see
[docs/ASSETS.md](../../docs/ASSETS.md).
