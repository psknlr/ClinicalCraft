"""Numbers for docs/CMCR_105_CASES.md and the PR description: the 105 cmcr-105 cases as they stand in the worktree,
and the latest review of each case from the workflow journals (+ case-status.json for reviews whose journals are gone).

usage: python3 -I collection-stats.py [--json]
"""
import collections, glob, json, os, sys

SP = os.path.dirname(os.path.abspath(__file__))
WT = os.path.join(SP, "wt")
WF = "/root/.claude/projects/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/subagents/workflows"

cases = []
for p in sorted(glob.glob(os.path.join(WT, "packages/content/cases/*/case.json"))):
    d = json.load(open(p))
    if "cmcr-105" in (d.get("tags") or []):
        cases.append(d)

reviews = {}
for p in glob.glob(os.path.join(WF, "*", "journal.jsonl")):
    for line in open(p):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        v = d.get("result")
        if d.get("type") == "result" and isinstance(v, dict) and "findings" in v and "caseId" in v:
            reviews[v["caseId"]] = v
status = json.load(open(os.path.join(SP, "case-status.json"))) if os.path.exists(os.path.join(SP, "case-status.json")) else {}

s = collections.Counter()
settings = collections.Counter()
versions = collections.Counter()
sev = collections.Counter()
reviewed = 0
for c in cases:
    versions[c.get("version")] += 1
    settings[c.get("setting")] += 1
    s["decisions"] += len(c.get("decisions", []))
    s["options"] += sum(len(d.get("options", [])) for d in c.get("decisions", []))
    s["interventions"] += len(c.get("interventions", []))
    s["critical interventions"] += sum(1 for i in c.get("interventions", []) if i.get("critical"))
    s["investigations"] += len(c.get("investigations", []))
    s["history items"] += len(c.get("history", []))
    s["exam items"] += len(c.get("exam", []))
    s["rubric items"] += len(c.get("rubric", []))
    s["critical rubric items"] += sum(1 for r in c.get("rubric", []) if r.get("critical"))
    s["phases"] += len(c.get("phases", []))
    s["learning outcomes"] += len(c.get("learningOutcomes", []))
    s["teaching points"] += len(c.get("debrief", {}).get("teachingPoints", []))
    s["utterances"] += len((c.get("extensions") or {}).get("testUtterances", []) or [])
    s["source text checked"] += 1 if (c.get("extensions") or {}).get("sourceTextChecked") else 0
    r = reviews.get(c["id"])
    if r:
        reviewed += 1
        sev.update(f["severity"] for f in r["findings"])
        s["unfixed critical/major"] += sum(1 for f in r["findings"] if f["severity"] in ("critical", "major") and not f["fixed"])
    elif status.get(c["id"], {}).get("reviewed"):
        reviewed += 1
        sev.update(status[c["id"]].get("findings", {}))

out = {"cases": len(cases), "versions": dict(versions), "settings": dict(settings), "reviewed": reviewed,
       "findings": dict(sev), **dict(s)}
if "--json" in sys.argv:
    print(json.dumps(out, indent=1, ensure_ascii=False))
else:
    for k, v in out.items():
        print(f"{k}: {v}")
