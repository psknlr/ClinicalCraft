# CMCR 105 expansion: validation record

Validated on Windows with Node 24.19.0, against repository base `5525897c16b7f4a64cf2e4ba2882376c48f537d0`. The library contains 135 cases: 105 additional CMCR cases, the earlier 20 CMCR cases and 10 existing cases. Original source files and runtime logs remain outside the repository.

## Content and simulation

| Check | Result |
| --- | --- |
| Strict case validation | 135 cases; no errors or warnings |
| Reference solutions | All 135 pass |
| Facilities | All 22 validate; 21 existing warnings, none naming a new case |
| Generated schema consistency | Pass |
| Reference benchmark | 123/123 scenarios; no safety, spatial or unauthorised-action violations |
| Scripted-LLM benchmark | 123/123 scenarios; no safety, spatial or unauthorised-action violations |
| Clinical versus in-world reference completion | All 135 cases in both languages agree on completion, objectives and scoring |
| Device release | General hospital, teaching hospital and clinic loops pass without retaining a device reservation |
| New collection contract | 108 assertions pass across the content run and focused repeats, including final pseudonym uniqueness and verified-DOI checks |
| Existing CMCR collection contract | 43 assertions pass |

The collection contracts check strict authored content, source identity, stage-gated evidence, reference paths, first-answer scoring, safety-weighted rubrics, unknown observations, non-verbal infant representation, facility capabilities and approved local media. The new cases contain 315 decisions and 3,920 bilingual matcher utterances.

The initial combined content/in-world run exposed missing explicit debrief links in 35 cases, an overly literal infant-stage assertion and aggregate timeouts while other jobs were active. The links were added; the infant assertion now evaluates each stage. The earlier collection's uniqueness assertion now reads the name fields once rather than repeatedly validating whole cases. Focused repeats passed without increasing timeouts. Results are the latest executed outcomes across the initial run and focused reruns, not a claim of one clean combined run.

## Language grounding

The same 1,519 held-out items were compared before and after integration, with unchanged suite digests and item outcomes:

| Split | Before | After | Newly failing items |
| --- | --- | --- | --- |
| Development | 647/676 (95.7%) | 647/676 (95.7%) | 0 |
| Test | 743/843 (88.1%) | 743/843 (88.1%) | 0 |

The existing 29 development failures and 100 test failures remain. In particular, test routing accuracy remains 54.4%. The two successful offline benchmarks verify deterministic infrastructure; they do not measure a live model's clinical competence.

## Browser and local deployment

Nine browser checks passed against a separate local preview: adult and 18-hour-old infant cases in both languages, the earlier collection, and real and synthetic large-library interactions. These check bedside presentation, completed-case review, and source identity/media remaining locked before completion. The browser completion checks execute reference actions through QA dispatch; spatial navigation and bedside enforcement are covered separately by the in-world tests, rather than by manual keyboard traversal in these browser checks.

On the requested `http://127.0.0.1:5173/` service, both real-library checks passed (135 total, separate 20/105 collections, bilingual search and a 390-pixel viewport), followed by the infant bedside/review check. Twelve focused UI and index-watcher unit tests also passed. The content directory watcher now detects new cases outside the web root and normalises Windows paths, preventing a running preview from retaining its old catalogue.

Repository type checking and the production build pass. This is a local deployment; no public production deployment is implied.

## Wider test suite

The remaining 187 test files were also run, excluding the three content/in-world files covered above. That initial run exited with failures: 163 files passed and 24 failed; 2,935 assertions passed, 69 failed and three were skipped, with 12 uncaught subprocess errors. This is **not** a clean `npm test` result.

Seven selected failures reproduce on an isolated checkout of the exact base commit: Windows path separators, shell hooks and an oversized-request connection reset. Independent spawn probes also confirm that `sh` and the extensionless `.bin/tsx` command used by the subprocess tests are unavailable in this Windows environment. This evidence does not establish that every failure is pre-existing.

The initial run also includes 23 timing failures and three label/index assertions collected while content was still changing. These are being rechecked separately with the original timeout thresholds; results will be added before the final handoff. The draft remains open for review rather than being merged with unresolved checks.

## Sources, assets and review limits

All 105 source reports have publisher identity checks; 104 have a verified DOI. The ambiguous DOI for `cmcr-1068618` is omitted while its publisher URL is retained. Downloads comprise 105 PDFs, 101 figures and 9 tables, with file size/signature/hash verification. One PDF missing from Drive was retrieved from the publisher URL recorded in the corpus.

All 101 figures were visually reviewed: 69 approved and 32 withheld. Five PDFs were fully inspected: one approved and four withheld. The remaining 100 PDFs are not cleared for display. The application has 70 approved local assets across 49 new cases; original media and signed Drive URLs are excluded from Git.

These are educational adaptations, with 47 AI-assisted editorial reviews and 58 explicitly unreviewed cases. None claims licensed clinician review. Full specialty review is still required before teaching use. Historical report findings and treatments do not establish a current recommendation or a continuous physiology model.
