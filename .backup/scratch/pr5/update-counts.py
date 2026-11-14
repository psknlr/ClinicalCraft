"""Bring the case counts in README.md, packages/content/README.md, docs/CMCR_CASES.md and docs/ASSETS.md in step with
the library after the templates are left out (numbers from make-docs.py --print-stats, read from stdin as JSON).

usage: python3 -I make-docs.py <branch> <commit> --print-stats | python3 -I update-counts.py
"""
import json, os, sys

SP = os.path.dirname(os.path.abspath(__file__))
WT = os.path.join(SP, "wt")
st = json.load(sys.stdin)
N, M, LIB = st["included"], st["awaiting"], st["library"]
C = 20 + N
FIG, PDF = st["figures"][0], st["pdfs"][0]


def edit(path, pairs):
    p = os.path.join(WT, path)
    s = open(p).read()
    for old, new in pairs:
        assert s.count(old) == 1, f"{path}: {old[:60]!r} found {s.count(old)} times"
        s = s.replace(old, new)
    open(p, "w").write(s)
    print("updated", path)


edit("README.md", [
    ("内置 135 个中英双语教学病例（原有 10 例，以及中华病例说 125 例：原选 20 例、新增 105 例；新增病例正在依据原文重写，尚不可用于教学）",
     f"内置 {LIB} 个中英双语教学病例（原有 10 例，以及中华病例说 {C} 例：原选 20 例、新增 {N} 例；新增病例依据其报告已提取的事实重写，经 AI 辅助的独立审核，尚未经执业医师审核）"),
    ("[中华病例说 · 新增 105 例 / CMCR additional cases](docs/CMCR_105_CASES.md)",
     f"[中华病例说 · 新增 {N} 例 / CMCR additional cases](docs/CMCR_105_CASES.md)"),
    ("135 bilingual cases (the original ten and 125 adapted from published CMCR case reports)",
     f"{LIB} bilingual cases (the original ten and {C} adapted from published CMCR case reports)"),
])
edit("packages/content/README.md", [
    ("| cases | 135, all `zh-CN` + `en`: the original 10 (9 synthetic, 1 adapted from a published case report) and 125 adapted from published CMCR case reports — the original selection of 20 ([docs/CMCR_CASES.md](../../docs/CMCR_CASES.md)) and 105 additional cases being re-authored ([docs/CMCR_105_CASES.md](../../docs/CMCR_105_CASES.md)) |",
     f"| cases | {LIB}, all `zh-CN` + `en`: the original 10 (9 synthetic, 1 adapted from a published case report) and {C} adapted from published CMCR case reports — the original selection of 20 ([docs/CMCR_CASES.md](../../docs/CMCR_CASES.md)) and {N} additional cases re-authored and independently reviewed ([docs/CMCR_105_CASES.md](../../docs/CMCR_105_CASES.md); {M} more selected reports await re-authoring) |"),
])
edit("docs/CMCR_CASES.md", [
    ("The separate [105-case expansion](CMCR_105_CASES.md), which is being re-authored from its sources and is not yet ready for teaching, brings the library to 135 cases: the 10 earlier cases and 125 CMCR cases.",
     f"The separate [additional collection](CMCR_105_CASES.md) — {N} cases re-authored from the facts their reports' first adaptations recorded and independently reviewed — brings the library to {LIB} cases: the 10 earlier cases and {C} CMCR cases."),
    ("本页保留原 20 例的来源和审核记录；新增 105 例（正在依据原文重写，尚不可用于教学）详见独立文档。全库共 135 例：原有 10 例和中华病例说 125 例。",
     f"本页保留原 20 例的来源和审核记录；新增 {N} 例（依据其报告已提取的事实重写并经独立审核）详见独立文档。全库共 {LIB} 例：原有 10 例和中华病例说 {C} 例。"),
])
edit("docs/ASSETS.md", [
    ("| CMCR additional 105 cases: 105 PDFs, 101 figures and 9 tables downloaded; 1 PDF and 69 figures approved in the media review, and only those are installed |",
     f"| CMCR additional cases ({N} in the library of the 105 reports selected): 105 PDFs, 101 figures and 9 tables downloaded; for the cases in the library the media review approves {FIG} figures and {PDF} PDF{'s' if PDF != 1 else ''}, and only those are installed |"),
])
