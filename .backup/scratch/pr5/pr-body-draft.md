## 概要

本 PR 把病例库从 30 例扩展为 {{LIB}} 例：从中华病例说选出的 105 篇报告中，{{N}} 例依据各自 1.0.0 版记录的事实重写为 1.1.0 版，并经独立审核与修订后收入病例库。其余 {{M}} 例的 1.0.0 版仍是模板草稿，未达到内容标准，不随本 PR 合并；草稿保存在分支 `{{BRANCH}}`，待逐例重写。本 PR 同时包含 2026-11-12 外部审计的两组修复。

所有病例都是 AI 辅助的教学改编，没有执业医师审核；原始报告全文在重写期间无法取得，病例只沿用 1.0.0 版已提取的事实（`sourceTextChecked: false`），用于教学前仍需专科审核。

## Summary

This PR grows the case library from 30 to {{LIB}} cases. Of the 105 reports selected from the Chinese Medical Case Repository (CMCR), {{N}} cases are included, each re-authored to version 1.1.0 from the facts its 1.0.0 version recorded, then independently reviewed and fixed. The other {{M}} are still 1.0.0 template drafts that do not meet the content standard; they are not part of this PR and are kept on branch `{{BRANCH}}` for re-authoring. The PR also carries both sets of fixes from the external audit of 2026-11-12.

All cases are AI-assisted teaching adaptations without a licensed clinician's review. The full source articles were not available while the cases were rewritten, so each case keeps only the facts its 1.0.0 version had extracted (`sourceTextChecked: false`); specialty review is still needed before teaching use.

## 病例统计 / Case tally

| | main | this PR |
|---|---|---|
| Original cases | 10 | 10 |
| CMCR original selection (cmcr-20) | 20 | 20 |
| CMCR additional cases (cmcr-105) | 0 | {{N}} |
| **Library** | **30** | **{{LIB}}** |
| Reports awaiting re-authoring (drafts on `{{BRANCH}}`) | — | {{M}} |

The {{N}} cases hold {{STATS}}. Settings: {{SETTINGS}}.

## 重写与审核 / How each case was re-authored and reviewed

- **Re-authoring** to the clinical content standard (docs/CASE_AUTHORING.md §9): phases that stage the evidence; 4–5 decisions at the real decision points, each opening before the result that answers it; the report's management, today's care and tempting wrong or historical steps as interventions with guideline-named harms; a rubric whose critical items are acts done in time; the history in the patient's or carer's own words, with explicit unknowns; dated, guideline-attributed teaching points; a 16-part facilitator guide in each README.
- **Safety outcome**: high-risk acts carry `critical` flags and dose presets, so a dangerous act fails the run whatever the score.
- **Independent review**, by an agent that did not write the case: every patient fact traced to 1.0.0 in both languages (an added or changed fact is critical); guideline statements looked up in the source's own text; keys, feedback, doses and harms; assessment replays (harmful acts, option lengths, aliases, leaks of later results, plain questions in both languages); voice, privacy, spoilers. Fixes followed and every check had to pass again. {{ROUNDS}}
- **Commit gate**: strict validation, reference path 100 %, `scripts/case-check.ts` (depth, doing nothing scores 0, a wrong first answer scores below the reference, plain opening questions reach the presenting complaint in both languages), the collection contract, the in-world demonstration in both languages, and the spatial policy test.

{{ROUND_TABLE}}

## 审计修复 / Audit fixes (2026-11-12)

First set (P0-1 – P0-3, P1-4, P1-5):
- Critical interventions: giving one while contraindicated fails the run's **safety outcome** (`safety.passed`, `criticalFailures`, `doseErrors`), shown beside the score in the web debrief, CLI, MCP, server, transcripts and benchmark reports; a benchmark run whose safety did not pass is never a success.
- **Orders as written**: the engine reads the dose from the learner's own words in both languages and compares it with the case's preset (`doseSpec`); an equivalent dose is given, a conflicting one is read back by the nurse and kept as a dose error (critical when tenfold, or with a critical or high-risk medicine at twice the preset or by another route), an unreadable one is asked about.
- `elapsedSince` for repeat-dose windows; reference paths may not give a contraindicated act or a wrong dose unless declared as taught error recovery; new content lints.

Second set (P1-7 – P2-15; P1-6 is handled in psknlr/ClinicalCraft#23):
- P1-7 imaging studies stage by stage (ordered, acquired with the patient on the device, released, reviewed); P1-8 going where one believes a thing is, absence learned on arrival; P1-9 an information-handoff team scenario (acute-ischemic-stroke 1.1.4); P1-10 benchmark denominators, controls labelled, a held-out test split, four non-cardiac encounters.
- P2-11 the patient's journeys in the event log; P2-12 handheld items with a handoff receipt; P2-13 live screens decided by the world; P2-14 coverage by kind and `cases safety-review`; P2-15 one place lookup for the map and the badge; dose follow-ups (loading then maintenance, bolus and infusion presets, split regimens, preparations read clause by clause).

## 验证 / Validation

{{VALIDATION}}

## 局限与后续 / Limitations and follow-ups

- No case has been checked against its full source article or reviewed by a licensed clinician; each README lists what remains to verify.
- {{SECOND_REVIEW}}
- {{M}} reports await re-authoring (`{{BRANCH}}`); the source map lists them (`awaitingReauthoring`).
- A follow-up of the audit's second set (believed state of things out of sight, devices unplugged when the patient leaves, the follower's own path, rate checks for split doses, multi-drug orders, several blocked acts in a team scenario) is not included: its final independent check found three regressions in dose and order reading, which will be fixed in a separate PR.
- Engine gaps the case reviewers reported (enoxaparin in anti-Xa IU, per-kg rates written as U/(kg·h), "不透气" read as a negation, an opener fallback for plain questions) are also left for that PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01AWJW3iF3PiZeQzaQpyArab
