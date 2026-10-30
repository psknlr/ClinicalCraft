# CMCR 105 expansion: validation record

> The 105 cases are being re-authored from their source reports and are not yet ready for teaching ([CMCR_105_CASES.md](CMCR_105_CASES.md)). This record describes the checks run when they were integrated; counts and claims that a later review found mislabelled or stale are corrected below and listed under [Corrections](#corrections-2026-10-30).

Validated on Windows with Node 24.19.0, against repository base `5525897c16b7f4a64cf2e4ba2882376c48f537d0`. The library contains 135 cases: 105 additional CMCR cases, the earlier 20 CMCR cases and 10 existing cases. Original source files and runtime logs remain outside the repository.

## Content and simulation

| Check | Result |
| --- | --- |
| Strict case validation | 135 cases; no errors or warnings |
| Reference solutions | All 135 pass |
| Facilities | All 22 validate; 21 existing warnings, none naming a new case |
| Generated schema consistency | Pass |
| Reference benchmark | 123/123 runs (41 scenarios × 3 seeds); no safety, spatial or unauthorised-action violations; no scenario uses a CMCR case, so this does not exercise the new cases |
| Scripted-LLM benchmark | 123/123 runs (41 scenarios × 3 seeds); no safety, spatial or unauthorised-action violations; no scenario uses a CMCR case, so this does not exercise the new cases |
| Clinical versus in-world reference completion | All 135 cases in both languages agree on completion, objectives and scoring |
| Device release | General hospital, teaching hospital and clinic loops pass without retaining a device reservation |
| New collection contract | 108 tests pass (3 collection tests and 105 per-case tests) across the content run and focused repeats, including final pseudonym uniqueness and verified-DOI checks |
| Existing CMCR collection contract | 43 tests pass |

The collection contracts check strict authored content, source identity, stage-gated evidence, reference paths, first-answer scoring, safety-weighted rubrics, unknown observations, non-verbal infant representation, facility capabilities and approved local media. The new cases contain 315 decisions and 3,920 bilingual matcher utterances.

The initial combined content/in-world run exposed missing explicit debrief links in 35 cases, an overly literal infant-stage assertion and aggregate timeouts while other jobs were active. The links were added; the infant assertion now evaluates each stage. The earlier collection's uniqueness assertion now reads the name fields once rather than repeatedly validating whole cases. Focused repeats passed without increasing timeouts. Results are the latest executed outcomes across the initial run and focused reruns, not a claim of one clean combined run.

## Language grounding

The same 1,519 held-out items were compared before and after integration, with unchanged suite digests and item outcomes:

| Split | Before | After | Newly failing items |
| --- | --- | --- | --- |
| Development | 647/676 (95.7%) | 647/676 (95.7%) | 0 |
| Test | 743/843 (88.1%) | 743/843 (88.1%) | 0 |

The existing 29 development failures and 100 test failures remain. In particular, test routing accuracy remains 54.4%. The two successful offline benchmarks verify deterministic infrastructure on the 10 earlier cases (no scenario uses a CMCR case); they do not measure a live model's clinical competence. The grounding suite, too, covers only the 10 earlier cases.

## Browser and local deployment

Nine browser checks passed against a separate local preview: adult and 18-hour-old infant cases in both languages, the earlier collection, and real and synthetic large-library interactions. These check bedside presentation, completed-case review, and source identity/media remaining locked before completion. The browser completion checks execute reference actions through QA dispatch; spatial navigation and bedside enforcement are covered separately by the in-world tests, rather than by manual keyboard traversal in these browser checks.

On the requested `http://127.0.0.1:5173/` service, both real-library checks passed (135 total, separate 20/105 collections, bilingual search and a 390-pixel viewport), followed by the infant bedside/review check. The focused UI and index-watcher unit tests also passed: the files the change added or extended hold ten tests (library 3, patient age 2, case-index plugin 5), not the twelve this record first stated. The content directory watcher now detects new cases outside the web root and normalises Windows paths, preventing a running preview from retaining its old catalogue.

Repository type checking and the production build pass. This is a local deployment; no public production deployment is implied.

## Wider test suite

The remaining 187 test files were also run, excluding the three content/in-world files covered above. That initial run exited with failures: 163 files passed and 24 failed; 2,935 assertions passed, 69 failed and three were skipped, with 12 uncaught subprocess errors. This is **not** a clean `npm test` result.

Seven selected failures reproduce on an isolated checkout of the exact base commit: Windows path separators, shell hooks and an oversized-request connection reset. Independent spawn probes also confirm that `sh` and the extensionless `.bin/tsx` command used by the subprocess tests are unavailable in this Windows environment. This evidence does not establish that every failure is pre-existing.

Five of the 23 timing failures passed a focused local repeat with unchanged thresholds (the SMZL random walk, spatial policy and three embodied-mode assertions). The remaining 18 did not obtain a completed local repeat after the test process was interrupted; they are not counted as local passes. The three label/index failures collected while content was changing also passed the final two-file, seven-assertion repeat.

Independently, the committed snapshot `6a6ec32` passed the complete Linux [CI build-test job](https://github.com/psknlr/ClinicalCraft/actions/runs/40866266668/job/123421712276): all unit/integration tests, strict content validation, reference solutions, type checking, production build, the built-binary offline smoke for every case, and both required embodied benchmarks. This verifies the full code/content snapshot in CI while preserving the Windows limitations above.

The first CI browser run passed 55 of 58 tests, including all four adult/infant bilingual completion flows and the original CMCR collection. Its three failures exposed an English mobile-width overflow in two library tests and an older search test's assumption that the broad query “脾” matches only one case. These findings are addressed separately from the Windows timing failures.

The follow-up uses shrinkable grid tracks for the mobile catalogue and its filters. Both layout checks retain the viewport boundary assertion and additionally reject internal horizontal overflow. The older search check now verifies the expected broad-query match and uses a specific presenting complaint for its unique-match assertion. All three previously failing browser tests passed a focused local run (3.3 minutes), including the full SMZL clinical flow, without increasing timeouts. CI then passed on the follow-up commit `88ed0d2` ([run 40890346283](https://github.com/psknlr/ClinicalCraft/actions/runs/40890346283), 2026-10-29): the build-test job (type checking, unit and integration tests, strict content validation and reference solutions, build, the built-binary offline smoke for every case and both benchmarks) and both browser shards.

## Sources, assets and review limits

All 105 source reports have publisher identity checks; 101 have a verified DOI. Four DOIs are pending verification and are omitted while their publisher URLs are retained: `cmcr-1068618` and `cmcr-1068587` (an ambiguous trailing period), `cmcr-1551889` (an article number out of sequence with its issue) and `cmcr-1322371` (a 2009 issue in the DOI against a 2010 citation, with a trailing ".1"). The verification records stay in the local source directory, outside Git. Downloads comprise 105 PDFs, 101 figures and 9 tables, with file size/signature/hash verification. One PDF missing from the corpus media was retrieved from the publisher URL recorded in the corpus.

All 101 figures were visually reviewed: 69 approved and 32 withheld. Five PDFs were fully inspected: one approved and four withheld. The remaining 100 PDFs are not cleared for display. The application has 70 approved local assets across 49 new cases; original media and signed download URLs are excluded from Git.

These are educational adaptations, with 47 AI-assisted editorial reviews and 58 explicitly unreviewed cases as integrated; the split follows the authoring batches, not one checklist applied to every case. None claims licensed clinician review. Full specialty review is still required before teaching use. Historical report findings and treatments do not establish a current recommendation or a continuous physiology model.

## Corrections (2026-10-30)

A governance review of the pull request found these statements mislabelled or stale; they are corrected above:

- The benchmark results are **runs** (41 scenarios × 3 seeds), not scenarios, and no benchmark scenario uses a CMCR case.
- The collection contracts count **tests** (`it` blocks), not assertions: 108 (3 + 105) and 43.
- The focused UI and index-watcher files hold ten tests, not twelve.
- The "next CI run" is recorded: CI passed on `88ed0d2`, browser shards included.
- DOIs: 101 verified and 4 pending, not 104 and 1 (`cmcr-1322371` was moved to pending on 2026-10-30). `cmcr-1068587`'s DOI ends with the same ambiguous period as `cmcr-1068618`'s, and `cmcr-1551889`'s "…2025.01.16" is out of sequence with its issue (…01.014, …01.015, …01.017); doi.org and Crossref could not be reached to resolve either. The source map gives each pending string and the reason.
