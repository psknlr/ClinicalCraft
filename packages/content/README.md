# @clinicalcraft/content

Built-in ClinicalCraft content as plain JSON: clinical cases, facilities
(worlds), room templates and equipment catalogs, plus the JSON Schemas
editors use to validate them. The package has no runtime code (`src/index.ts` is empty).
Node front-ends load it with `loadContent()` from `@clinicalcraft/agent/node`;
the web client bundles a case index built from these files at build time and
loads each full case as a lazy chunk (`packages/web/src/build/case-index-plugin.ts`).

```
cases/<id>/case.json        one case per folder (+ README.md: provenance, design, teaching notes)
facilities/<id>.json        clinic-v4, general-hospital, teaching-hospital
templates/<id>.json         room templates (clinicalcraft/room-template@1), expanded into facilities at load time
catalogs/<id>.json          materials, core-furniture, core-clinical, core-diagnostics
schemas/*.schema.json       case, facility, room-template, equipment-catalog, settings, skill, bench-scenario, grounding-set (generated: npm run schemas)
bench/<suite>/<id>.json     embodied benchmark scenarios (clinicalcraft/bench-scenario@1; suite embodied-v1: 41), run by `clinicalcraft bench`
grounding/<suite>/<split>/*.json  grounding benchmark items (clinicalcraft/grounding-set@1; suite grounding-v1: dev + held-out test), run by `clinicalcraft bench grounding` (docs/GROUNDING.md)
```

| | count |
|---|---|
| cases | 10 (9 synthetic, 1 adapted from a published case report), all `zh-CN` + `en` |
| facilities | 3 — `clinic-v4` (7 rooms, 21 placements, 1 patient slot), `general-hospital` (37 rooms, 258 placements, 14 patient slots, 10 staff) and `teaching-hospital` (2 levels; 22 room-template instances + 10 authored rooms → 32 rooms (18 on L0, 14 on L1), 275 placements (138 / 137), 17 patient slots (6 / 11), 11 staff (7 / 4), stairs + elevator, 2 access zones) |
| room templates | 15 — ED resus bay, ED cubicle, outpatient consult, orthopaedic examination, operating theatre, CT, X-ray, clinical laboratory, 4-bed ward bay, ICU bed space, rehabilitation gym, pharmacy, nursing station, teaching room, elevator car |
| equipment types | 97 — 39 furniture/scenery, 32 clinical, 26 diagnostic |
| materials | procedural pixel textures in `materials.json` (V4 palette + clinical additions) and a few catalog-specific ones |
| benchmark scenarios | 41 in `bench/embodied-v1` — 8 categories, 15 in zh-CN, 26 in en ([docs/EMBODIED.md §13](../../docs/EMBODIED.md#13-benchmark)) |

Authoring guides: [docs/CASE_AUTHORING.md](../../docs/CASE_AUTHORING.md) and
[docs/FACILITIES.md](../../docs/FACILITIES.md). Every case must pass both
checks:

```bash
npm run cc -- cases validate --all     # schema + referential integrity
npm run cc -- cases verify --all       # replays each `solution` + the extensions.testUtterances corpus
npm run cc -- facilities validate --all  # facilities (compiled), room templates and catalogs
npm run cc -- facilities compile teaching-hospital   # the flat facility a front-end loads
```

Extra content (your own cases, facilities, templates or catalogs) does not
need to live here: list directories that contain `cases/<id>/case.json`,
`facilities/`, `templates/` or `catalogs/` in the `contentDirs` setting.
Facilities place templates from every loaded directory.

Copyrighted figures and the source PDF of the published case are never
committed (`cases/*/assets/` is git-ignored); see
[docs/ASSETS.md](../../docs/ASSETS.md).
