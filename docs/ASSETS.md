# Local-only assets

Some content cannot (or should not) live in a public repository:

| asset | why local-only | source |
|---|---|---|
| SMZL case figures `fig1`–`fig7` and the source PDF | © original rights holders (Chinese Medical Association journal) — local teaching use only | Virtual Patient V4 package |
| Anatomy model (`anatomy.glb.gz`, 25 MB) + organ catalog | size (Z-Anatomy / BodyParts3D, CC BY-SA 4.0 — attribution kept) | Virtual Patient V4 package |

## Install

```bash
# from the merged V4 html, the .part01/.part02 files, or the two zip archives
clinicalcraft import-v4 "Virtual_Patient_V4(1).html"
clinicalcraft import-v4 Virtual_Patient_V4_Part1.zip Virtual_Patient_V4_Part2.zip
```

(From a repository checkout, `clinicalcraft` is `npm run cc --`.) The
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
