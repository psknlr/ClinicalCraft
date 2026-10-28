# Local-only assets

Some content cannot (or should not) live in a public repository:

| asset | why local-only | source |
|---|---|---|
| SMZL case figures `fig1`–`fig7` and the source PDF | © original rights holders (Chinese Medical Association journal) — local teaching use only | Virtual Patient V4 package |
| CMCR 20-case collection: 20 source PDFs and 23 referenced figures (24 figures downloaded) | © original rights holders — local teaching use only | User's Drive CMCR corpus; [installation and source mapping](CMCR_CASES.md) |
| Anatomy model (`anatomy.glb.gz`, 25 MB) + organ catalog | size (Z-Anatomy / BodyParts3D, CC BY-SA 4.0 — attribution kept) | Virtual Patient V4 package |

## Install

```bash
# from the merged V4 html, the .part01/.part02 files, or the two zip archives
clinicalcraft import-v4 "Virtual_Patient_V4(1).html"
clinicalcraft import-v4 Virtual_Patient_V4_Part1.zip Virtual_Patient_V4_Part2.zip
```

(From a repository checkout, `clinicalcraft` is `npm run cc --`.) Zip
archives are read defensively: at most 16 html/`.partNN` entries, 128 MiB per
entry and 256 MiB inflated across all archives, and entries whose data overlap
(one compressed stream listed several times) are rejected. The
importer checks the V4 SHA-256 when the full file can be reconstructed (a
mismatch is only a warning), then writes (default destination
`${CLINICALCRAFT_HOME:-~/.clinicalcraft}/assets`, or `--dest assets/local` inside a repo checkout):

```
<dest>/anatomy/anatomy.glb.gz
<dest>/anatomy/catalog.json
<dest>/cases/smzl-lung-adeno/fig1.png … fig7.png
<dest>/cases/smzl-lung-adeno/source_case_report.pdf
<dest>/manifest.json            # sha256 of every file
```

## Serving

Every front-end resolves local assets through one URL scheme:
`/local-assets/anatomy/anatomy.glb.gz`, `/local-assets/cases/<caseId>/<file>`.

* `clinicalcraft serve` and the Vite dev server (plugin in `packages/web/vite.config.ts`)
  search `assets/local/` (repo checkout) then `${CLINICALCRAFT_HOME:-~/.clinicalcraft}/assets/`.
  Only passive types are served (png, jpg/jpeg, webp, gif, pdf, json, gz, glb, mp3, mp4,
  webm), every non-PDF one with a sandboxing `Content-Security-Policy`: an SVG, HTML or
  script file in an asset directory (e.g. from an untrusted checkout) would otherwise run
  with the app's origin. The standalone build embeds the same types only, and the journal
  opens the source PDF only when it is served as `application/pdf`.
* The standalone single-file build (`npm run build:standalone`) embeds them
  only if they are present in the repository's `assets/local/` at build time
  (`~/.clinicalcraft/assets` is not read). Never commit or publish such a
  build; `npm run build:standalone -w @clinicalcraft/web -- --no-local-assets`
  makes one without them.
* Missing assets → the UI shows a placeholder explaining how to import them;
  the case remains fully playable (report text is always available).

## Equipment models (GLB/glTF)

An equipment type may name a 3D model (EMBODIED §11; schema in
`packages/core/src/schema/facility.ts`, rendering rules in
docs/FACILITIES.md "Equipment models"):

```json
"model": {
  "uri": "models/icu-bed.glb",
  "sha256": "<64 lowercase hex>",
  "scale": 1,
  "offset": [0, 0, 0],
  "rot": 0,
  "license": "CC-BY-4.0",
  "attribution": { "en": "ICU bed by A. Author (source URL), scaled to 1 m units", "zh-CN": "ICU 病床模型，作者 A. Author（来源链接），已按米制缩放" }
}
```

* **Files are local-only by default.** Put them in `assets/local/models/`
  (repo checkout, git-ignored) or `${CLINICALCRAFT_HOME:-~/.clinicalcraft}/assets/models/`;
  a relative `uri` resolves under `/local-assets/` (served by
  `clinicalcraft serve` and the Vite dev server, `.glb` only). Commit a model
  only when its licence allows redistribution, and never commit one without
  the licence and attribution recorded in the catalog. Prefer single-file
  `.glb` (a `.gltf` with external buffers or images is not served).
* **Licence and attribution.** `license` is an SPDX id (`CC0-1.0`,
  `CC-BY-4.0`, `MIT`, …) or the licence text; "unknown", "none",
  "proprietary" and the like are rejected by the inspector. CC-BY-style
  licences need `attribution` (author, source, changes) in both languages.
* **Hashes.** Pin `sha256` (the inspector prints it). The web renderer
  checks it with WebCrypto and keeps the voxel parts on a mismatch, so a
  replaced file is never loaded silently.
* **Units and fit.** glTF is metres, +Y up; the model's front should face +Z
  like the voxel parts. The renderer scales it by `scale` (a number or
  `[x, y, z]`; without it: a uniform fit inside the footprint), turns it by
  `rot` (degrees about Y), centres its bounding box on the footprint, stands
  it on the floor and moves it by `offset` (m, in the equipment's frame).
  The collider stays the footprint, the interaction the equipment type's.
* **Extensions.** Loaded: `EXT_meshopt_compression` (MeshoptDecoder),
  `KHR_mesh_quantization`, `KHR_texture_transform`, `KHR_materials_*`,
  `KHR_lights_punctual`, `EXT_texture_webp`/`avif`,
  `EXT_mesh_gpu_instancing`. `KHR_draco_mesh_compression` only when the
  world is given a DRACO decoder path (`WorldOptions.models.dracoPath`);
  `KHR_texture_basisu` is not supported. A model that needs an unsupported
  extension, fails to load or is missing falls back to the voxel parts (the
  world lists it in its warnings).
* **Compression and the CSP.** The meshopt and DRACO decoders compile
  WebAssembly. The meshopt decoder is imported only when a model declares
  `EXT_meshopt_compression`, so a world without such models never compiles
  WebAssembly; under `clinicalcraft serve`'s strict policy
  (`script-src 'self'`, no `'wasm-unsafe-eval'`) a meshopt- or
  DRACO-compressed model falls back to its voxel parts. Prefer uncompressed
  or `KHR_mesh_quantization` GLBs — equipment models are small.

### Inspecting a model

```bash
clinicalcraft assets inspect assets/local/models/icu-bed.glb
clinicalcraft assets inspect assets/local/models/icu-bed.glb --type icu-bed   # check against the catalog reference
clinicalcraft assets inspect model.glb --json
```

The inspector is pure Node (no renderer; core `parseGlb` /
`checkModelReference`): GLB header and chunks (or a `.gltf` JSON document),
the asset's generator and copyright, counts (scenes, nodes, meshes,
primitives, triangles, vertices, materials, textures, images, animations,
skins), the bounding box from the POSITION accessors' min/max through the
default scene's node transforms, extensions used and required, and the
file's SHA-256. With `--type` it checks the type's `model` reference: a
usable licence (error) and attribution for CC-BY (warning), the pinned hash
(missing: warning; different: error), required extensions the renderer
cannot load (error), and the size of the model as placed against the
footprint (more than 25 % off: warning; more than twice or half: error — e.g.
a model authored in centimetres; without `scale`, the fitted factor is
reported and very different proportions warn). Exit code 1 on any error.
`--draco` assumes a configured DRACO decoder.

Tests generate their models in code (`encodeGlb` in core); no binary model
is committed.
