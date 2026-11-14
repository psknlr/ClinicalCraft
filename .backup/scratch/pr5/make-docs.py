"""Write docs/CMCR_105_CASES.md for the cases in the library (cmcr-105 cases at 1.1.x) with numbers measured from the
case files, the source map, the media review and the review journals of this session.

usage: python3 -I make-docs.py <branch holding the templates> <commit holding the templates> [--print-stats]
"""
import collections, glob, json, os, sys

SP = os.path.dirname(os.path.abspath(__file__))
WT = os.path.join(SP, "wt")
WF = "/root/.claude/projects/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/subagents/workflows"
BRANCH, COMMIT = sys.argv[1], sys.argv[2]

source = json.load(open(os.path.join(WT, "scripts/cmcr-105-sources.json")))
media = json.load(open(os.path.join(WT, "scripts/cmcr-105-media-review.json")))["files"]
cases = {}
for p in sorted(glob.glob(os.path.join(WT, "packages/content/cases/*/case.json"))):
    c = json.load(open(p))
    if "cmcr-105" in (c.get("tags") or []):
        cases[c["id"]] = c
included = sorted(cid for cid, c in cases.items() if str(c.get("version", "")).startswith("1.1"))
assert len(included) == len(cases), f"templates still in the library: {sorted(set(cases) - set(included))}"
awaiting = sorted(e["id"] for e in source["cases"] if e["id"] not in cases)
all_cases = sorted(glob.glob(os.path.join(WT, "packages/content/cases/*/case.json")))
library = len(all_cases)
cmcr20 = sum(1 for p in all_cases if "cmcr-20" in (json.load(open(p)).get("tags") or []))

# Review rounds: round 1 = the first independent review; the latest result of each (case, round) wins.
rounds = collections.defaultdict(dict)
for p in sorted(glob.glob(os.path.join(WF, "*", "journal.jsonl")), key=os.path.getmtime):
    for line in open(p):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        v = d.get("result")
        if d.get("type") == "result" and isinstance(v, dict) and "caseId" in v and "findings" in v and "allChecksPass" in v:
            rounds[v["caseId"]][int(v.get("round") or 1)] = v
# Rounds finished by single agents after their run was stopped (manual/<case>-r<N>.result.json).
for p in sorted(glob.glob(os.path.join(SP, "manual", "*.result.json"))):
    v = json.load(open(p))
    rounds[v["caseId"]][int(v["round"])] = v
status = json.load(open(os.path.join(SP, "case-status.json")))
# The pilots' first reviews (2026-10-30) ran before these journals: case-status.json and their READMEs record them.
pilot_first = sorted(cid for cid in included if 1 not in rounds.get(cid, {}) and status.get(cid, {}).get("reviewed"))
missing = [cid for cid in included if 1 not in rounds.get(cid, {}) and cid not in pilot_first]
assert not missing, f"no first review on record: {missing}"

per_round = collections.defaultdict(collections.Counter)
by_count = collections.Counter()
total = collections.Counter()
answered = 0
for cid in included:
    rs = rounds[cid]
    by_count[len(rs) + (1 if cid in pilot_first else 0)] += 1
    for r, v in rs.items():
        for f in v["findings"]:
            per_round[r][f["severity"]] += 1
            total[f["severity"]] += 1
            if f["severity"] != "minor" and not f["fixed"]:
                answered += 1

s = collections.Counter()
settings = collections.Counter()
for cid in included:
    c = cases[cid]
    settings[c.get("setting")] += 1
    s["phases"] += len(c["phases"])
    s["history"] += len(c["history"])
    s["exam"] += len(c["exam"])
    s["investigations"] += len(c["investigations"])
    s["interventions"] += len(c["interventions"])
    s["critical interventions"] += sum(1 for i in c["interventions"] if i.get("critical"))
    s["decisions"] += len(c["decisions"])
    s["options"] += sum(len(d["options"]) for d in c["decisions"])
    s["rubric"] += len(c["rubric"])
    s["critical rubric"] += sum(1 for r in c["rubric"] if r.get("critical"))
    s["outcomes"] += len(c["learningOutcomes"])
    s["teaching points"] += len(c["debrief"]["teachingPoints"])
    s["utterances"] += len((c.get("extensions") or {}).get("testUtterances") or [])
    s["source checked"] += 1 if (c.get("extensions") or {}).get("sourceTextChecked") else 0
    s[f"status {((c.get('provenance') or {}).get('review') or {}).get('status')}"] += 1

entries = {e["id"]: e for e in source["cases"]}
verified = [cid for cid in included if entries[cid].get("verifiedDoi")]
pending = [cid for cid in included if not entries[cid].get("verifiedDoi")]
approved = [m for m in media if m["case"] in included and m["status"] == "approved"]
withheld = [m for m in media if m["case"] in included and m["status"] == "withheld"]
fig_ok = sum(1 for m in approved if m["file"].endswith(".png"))
pdf_ok = sum(1 for m in approved if m["file"].endswith(".pdf"))
fig_no = sum(1 for m in withheld if m["file"].endswith(".png"))
pdf_no = sum(1 for m in withheld if m["file"].endswith(".pdf"))
assets = [(cid, a) for cid in included for a in (cases[cid].get("assets") or [])]
asset_cases = len({cid for cid, _ in assets})

if "--print-stats" in sys.argv:
    print(json.dumps({"included": len(included), "awaiting": len(awaiting), "library": library, "cmcr20": cmcr20,
                      "byCount": dict(by_count), "perRound": {r: dict(c) for r, c in sorted(per_round.items())},
                      "total": dict(total), "answered": answered, "stats": dict(s), "settings": dict(settings),
                      "verified": len(verified), "pending": pending, "figures": [fig_ok, fig_no], "pdfs": [pdf_ok, pdf_no],
                      "assets": [len(assets), asset_cases], "pilotFirst": pilot_first}, indent=1))
    sys.exit(0)

n, m = len(included), len(awaiting)
setting_en = ", ".join(f"{v} {k if k != 'icu' else 'intensive-care'}" for k, v in sorted(settings.items(), key=lambda kv: -kv[1]))
ZH_SETTING = {"inpatient": "住院", "emergency": "急诊", "icu": "重症监护", "outpatient": "门诊"}
setting_zh = "、".join(f"{ZH_SETTING.get(k, k)} {v} 例" for k, v in sorted(settings.items(), key=lambda kv: -kv[1]))
rounds_en = "; ".join(f"{by_count[k]} case{'s' if by_count[k] != 1 else ''} had {k} round{'s' if k > 1 else ''}" for k in sorted(by_count))
rounds_zh = "；".join(f"{by_count[k]} 例经 {k} 轮" for k in sorted(by_count))
round_rows = "\n".join(f"| {r} | {sum(1 for cid in included if r in rounds[cid])}{f' (+{len(pilot_first)} pilot reviews, below)' if r == 1 and pilot_first else ''} | {per_round[r]['critical']} | {per_round[r]['major']} | {per_round[r]['minor']} |" for r in sorted(per_round))
pilot_note = (f" The first reviews of {len(pilot_first)} cases ({', '.join(pilot_first)}) were the pilot reviews of 2026-10-30, before these records were kept; each case's README states what they found and what was changed, so the table does not count them." if pilot_first else "")
pending_rows = "\n".join(f"| {cid} | `{entries[cid].get('doiPendingVerification', '')}` | {entries[cid].get('doiPendingReason', '')} |" for cid in pending)
awaiting_list = ", ".join(f"`{cid}`" for cid in awaiting)

doc = f"""# 中华病例说：新增病例 / CMCR additional cases

> **状态：** 从中华病例说选出的 105 篇报告中，{n} 例已收入病例库：每例依据其 1.0.0 版记录的事实重写为 1.1.0 版，再经独立审核与修订。其余 {m} 例仍是 1.0.0 版模板草稿，未达到内容标准，暂不收入病例库，待逐例重写；草稿保存在分支 `{BRANCH}`（提交 `{COMMIT[:12]}`）。所有病例都是 AI 辅助的教学改编，没有执业医师审核；原始报告全文尚未逐例核对（`sourceTextChecked: false`），用于教学前仍需专科审核。
>
> **Status:** Of the 105 reports selected from the Chinese Medical Case Repository (CMCR), {n} cases are in the library. Each was re-authored to version 1.1.0 from the facts its 1.0.0 version recorded, then independently reviewed and fixed. The other {m} are still 1.0.0 template drafts that do not meet the content standard. They stay out of the library until they are re-authored; the drafts are kept on branch `{BRANCH}` (commit `{COMMIT[:12]}`). All are AI-assisted teaching adaptations without a licensed clinician's review. None has yet been checked against its full source article (`sourceTextChecked: false`), so specialty review is still needed before teaching use.

病例库现有 {library} 个中英双语教学病例：原有 10 例、中华病例说原选 {cmcr20} 例和新增 {n} 例。在病例库中选择“中华病例说 · 新增病例（{n} 例）”，再按专科、场景或关键词筛选。完整文献引用、DOI 及获准展示的原始资料在完成病例后开放。

The library has {library} bilingual cases: the 10 earlier cases, the original {cmcr20} CMCR cases and these {n}. In the case library choose **CMCR · additional cases ({n})**, then filter by specialty, setting or keyword. Search covers the Chinese and English public summaries. The source citation, DOI and authors stay out of the opening catalogue until the case is complete.

## Source and adaptation

The source is the user's own copy of the deduplicated CMCR corpus, with its full-text records and article media; it stays outside Git. The original 20 IDs are excluded. The corpus has 57,571 parseable records; malformed lines 19,624 and 27,321 are excluded. Its SHA-256 is `{source.get("sourceCorpusSha256", "")}`.

The [source map](../scripts/cmcr-105-sources.json) records all 105 selected reports: publisher links, article metadata, source-text hashes and the DOI state of each. Its `awaitingReauthoring` list names the {m} reports whose case is not in the library yet; the collection test checks that each of them has no case folder and that every other report has exactly one case.

Each case was re-authored from the facts its 1.0.0 version recorded, because the full source articles were not available while the cases were rewritten. Every patient fact of 1.1.0 is traced to 1.0.0 (an added or changed fact is a critical review finding); what 1.0.0 left unrecorded stays unknown, and the patient says so in their own words. Conversations, decisions, interventions, scoring and teaching points are teaching adaptations; each case's README states its sources, adaptations and what remains to verify. Patient names are pseudonyms; clinical dates become relative intervals.

原报告、配图和 PDF 的版权仍归出版方和作者所有，均不纳入 Git。这些病例是转述原报告的教学改编；超出本人教学范围分发之前，请先确认使用许可的依据。本仓库的 MIT 许可只声明适用于代码，这些改编文本尚未声明许可，转发许可待定。

The original reports, figures and PDFs remain © their publishers and authors and stay outside Git. The cases are teaching adaptations that paraphrase the reports; confirm the permission basis for your use before distributing them beyond your own teaching. The repository's MIT licence is stated for its code; no licence has been stated for these adaptations, so permission to redistribute them is pending.

### DOIs

Of the {n} cases, {len(verified)} cite a DOI verified against publisher metadata (checked on 2026-10-29). {len(pending)} {'is' if len(pending) == 1 else 'are'} pending verification and cite the publisher article URL without a DOI:

| Case | DOI as supplied | Why it is pending |
|---|---|---|
{pending_rows}

doi.org and Crossref could not be reached from the authoring environment. Once a DOI resolves, record it as `verifiedDoi` in the source map and give the case its `provenance.doi`; the collection test keeps the two in step.

## How each case was re-authored and reviewed

The 1.0.0 versions were generated from one template: three decisions of three options, no interventions, fifteen generic history items with authoring language in the patient's answers, and a hindsight critical item. Each 1.1.0 version was written to the library's clinical content standard (docs/CASE_AUTHORING.md §9):

- **Teaching design.** Phases that stage the evidence; four or five decisions at the real decision points of the course, each opening before the result that answers it; the report's management, today's care and tempting wrong or historical steps as interventions, with harm texts naming their guidance; a rubric whose critical items are acts done in time; an attending and a nurse; dated, guideline-attributed teaching points; the history in the patient's or carer's own words, with explicit unknowns.
- **Safety outcome.** High-risk acts carry `critical` flags and dose presets, so a dangerous act fails the run's safety outcome whatever the score (CASE_AUTHORING §6–§7).
- **Independent review.** A different agent reviewed each case after it was written: every patient fact traced to 1.0.0 in both languages; guideline statements looked up in the source's own text; clinical accuracy of keys, feedback, doses and harms; assessment replays (harmful acts, option lengths, aliases, leaks of later results, plain questions in both languages); voice, privacy and spoilers. Fixes followed, and every check had to pass again. Later rounds, each by a fresh reviewer, followed while a round still found a critical or major problem: {rounds_en}.
- **Commit gate.** A case was committed only when it passed strict validation, verification of its reference path (100 %), `scripts/case-check.ts` (depth, doing nothing scores 0, a wrong first answer scores below the reference, plain opening questions reach the presenting complaint in both languages), the collection contract, the in-world demonstration in both languages and the spatial policy test.

| Review round | Cases | Critical findings | Major findings | Minor findings |
|---|---|---|---|---|
{round_rows}

{pilot_note.strip()}{' ' if pilot_note else ''}All {total['critical']} critical and {total['major']} major findings in the table were fixed{f", or answered with a reason in the case's README ({answered})" if answered else ""}. Most cases have had one independent review; a second review of each remains the next step, as do the full source articles and a specialty clinician's review.

每例 1.1.0 版均依据内容标准重写：分阶段呈现证据，在病程的真实决策点设置 4–5 个先于答案开放的决策，纳入报告中的处理、当前推荐与常见错误或过时做法（其危害说明注明所依据的指南），关键评分项为及时完成的操作，高风险操作设置安全结局。写完后由另一智能体独立审核：逐条核对患者事实与 1.0.0 版是否一致（中英文均核对），在指南原文中核对引用的推荐，回放评分与匹配，检查语气、隐私与剧透；发现的问题全部修复后重新通过全部检查。{rounds_zh}。

## Clinical teaching content

The {n} cases contain {s['phases']} phases, {s['history']} history items, {s['exam']} examination findings, {s['investigations']} investigations, {s['interventions']} interventions ({s['critical interventions']} marked critical for the safety outcome), {s['decisions']} decisions with {s['options']} options, {s['rubric']} rubric items ({s['critical rubric']} critical), {s['outcomes']} learning outcomes, {s['teaching points']} teaching points and {s['utterances']} bilingual matcher utterances. Settings: {setting_en}.

A historical treatment is not automatically a correct contemporary recommendation: the debrief distinguishes the published course, current guidance and remaining uncertainty. First-answer scoring stays: a learner can correct a wrong answer and continue, but does not regain the first-answer mark. Vital signs, values, timings and outcomes the record does not give stay unknown.

**These are AI-assisted educational adaptations.** Case-level review status is authoritative: `editorial` describes the AI-assisted editorial review recorded in the case's README, not a licensed clinician's review. Outstanding clinical questions are listed in each README's To verify list.

## In-world fidelity

These cases use the existing general hospital. Earlier reports (CT, pathology, laboratory) are read at a records terminal or from bedside notes (`performedAt: "records"`) without repeating an invasive procedure. A procedure done in a fixed room names where the patient goes (`destination`: the theatre, the angiography suite, the CT room, the endoscopy suite), so every act of a case can be carried out in the 3D world (`packages/world/src/policy.test.ts`). The source does not establish a continuous physiological response model, so none is invented.

History and examination remain bedside actions. Infants use the infant appearance, correct age units and a carer who answers their history; non-verbal patients have an explicit reason. Evidence and outcomes open in stages. There is one examinable patient per case; fetal or family findings are records rather than additional simulated patients.

## Local media

The local `selected-105` directory contains the individual article JSON/text, 105 PDFs, 101 PNG figures and 9 CSV tables, all verified for size and applicable file signatures; it stays outside Git, and no download IDs or signed URLs are published.

```sh
node scripts/install-cmcr-assets.mjs "<selected-105 directory>" cmcr-105 --dry-run   # checks only; writes and removes nothing
node scripts/install-cmcr-assets.mjs "<selected-105 directory>" cmcr-105
npm run dev
```

The installer copies a file only when a case in the library lists it, the [media review](../scripts/cmcr-105-media-review.json) approves it, and the case's sha256 equals both the approved one and the file's own. It also checks PNG/PDF signatures, refuses withdrawn files (by name or by checksum), never overwrites a differing local file, and copies nothing unless every asset passes. The cases work without images because their clinical reports are present as text. `packages/content/src/install-cmcr-assets.test.ts` checks these rules.

### Privacy and display boundaries

Each displayed figure was visually checked for recognisable faces, identifying overlays and patient calendar dates. Unsafe or uncertain figures are withheld and listed in `scripts/cmcr-withdrawn-assets.json`; their clinical findings remain in the case text. Original image bytes are never generatively altered. Most full PDFs are not embedded because a journal page may contain another patient's images: only a separately reviewed PDF may be displayed. For the {n} cases in the library, the media review approves {fig_ok} figures and {pdf_ok} full PDF{'s' if pdf_ok != 1 else ''} and withholds {fig_no} figures and {pdf_no} PDF{'s' if pdf_no != 1 else ''}; the cases list {len(assets)} assets across {asset_cases} cases.

## Validation

The collection contract is `packages/content/src/cmcr-105.test.ts`. It takes the collection from the source map, checks that every CMCR case carries exactly one collection tag (so no case escapes both this contract and `cmcr-20.test.ts`), that each DOI is verified or pending as the source map records it, that no teaching text is shared by more than two cases, and, case by case, the content standard, evidence gates, source attribution, approved local-only assets, infant representation, facility compatibility and executable reference paths. The all-case in-world test runs both languages and compares in-world completion with clinical-mode completion; `packages/world/src/policy.test.ts` checks that every act can be carried out in the case's facility. `e2e/cmcr-105.spec.ts` exercises real cases in the browser.

```sh
npm run cc -- cases validate --all --strict
npm run cc -- cases verify --all
npx tsx --conditions=source scripts/case-check.ts <case-id>
npm test
npm run typecheck
npm run build
```

The [validation record](CMCR_105_VALIDATION.md) lists the checks run at integration and for this revision.

## Awaiting re-authoring

{m} reports are not in the library yet; their 1.0.0 drafts are on branch `{BRANCH}`: {awaiting_list}.
"""
open(os.path.join(WT, "docs/CMCR_105_CASES.md"), "w").write(doc)
print(f"written: {n} cases, {m} awaiting; library {library}")
