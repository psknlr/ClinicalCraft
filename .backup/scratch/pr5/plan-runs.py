"""Queues for the next reauthor-v6 runs, from the journals and the worktree (what each CMCR-105 case still needs).

usage: python3 -I plan-runs.py [--split N]   writes args-new-<k>.json (cases to author or still in their first rounds,
       split into N runs, cases with work in progress first) and args-rounds.json (committed cases needing review rounds)
       and prints a summary. Writes reports/<id>.json for authored cases whose review has not started (the author's report).
"""
import glob, json, os, subprocess, sys, time

SP = os.path.dirname(os.path.abspath(__file__))
WT = os.path.join(SP, "wt")
WF = "/root/.claude/projects/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/subagents/workflows"
MAX_ROUND, MIN_ROUND = 4, 2


def git(*a):
    return subprocess.run(["git", *a], cwd=WT, capture_output=True, text=True).stdout


def results():
    """author results, and review results by round (1 = first review), by case id; the latest result wins."""
    authors, rounds = {}, {}
    files = sorted(glob.glob(os.path.join(WF, "*", "journal.jsonl")), key=os.path.getmtime)
    for p in files:
        for line in open(p):
            try:
                d = json.loads(line)
            except ValueError:
                continue
            v = d.get("result")
            if d.get("type") != "result" or not isinstance(v, dict) or "caseId" not in v:
                continue
            if "findings" in v and "allChecksPass" in v:
                rounds.setdefault(v["caseId"], {})[int(v.get("round") or 1)] = v
            elif "extraction" in v:
                authors[v["caseId"]] = v
    return authors, rounds


def serious(v):
    return sum(1 for f in v["findings"] if f["severity"] in ("critical", "major"))


def brief(r, v):
    """What a later reviewer needs of an earlier round: its critical and major findings, and how many minor ones."""
    keep = [f for f in v["findings"] if f["severity"] != "minor"]
    return {"round": r, "minor": len(v["findings"]) - len(keep),
            "findings": [{"severity": f["severity"], "area": f["area"], "location": f["location"][:160],
                          "problem": f["problem"][:280], "fixed": f["fixed"]} for f in keep]}


def complete(rs):
    last = max(rs)
    return last >= MAX_ROUND or (last >= MIN_ROUND and serious(rs[last]) == 0 and rs[last]["allChecksPass"])


def main():
    split = int(sys.argv[sys.argv.index("--split") + 1]) if "--split" in sys.argv else 2
    ids = []
    for p in sorted(glob.glob(os.path.join(WT, "packages/content/cases/cmcr-*/case.json"))):
        if "cmcr-105" in (json.load(open(p)).get("tags") or []):
            ids.append(os.path.basename(os.path.dirname(p)))
    authors, rounds = results()
    os.makedirs(os.path.join(SP, "reports"), exist_ok=True)
    os.makedirs(os.path.join(SP, "earlier"), exist_ok=True)

    def earlier(cid, rs):
        f = os.path.join(SP, "earlier", f"{cid}.json")
        json.dump([brief(r, rs[r]) for r in sorted(rs)], open(f, "w"), indent=1, ensure_ascii=False)
        return f
    started, fresh, committed_rounds, done, waiting = [], [], [], [], []
    for cid in ids:
        head = json.loads(git("show", f"HEAD:packages/content/cases/{cid}/case.json") or "{}").get("version", "")
        rs = rounds.get(cid, {})
        if head.startswith("1.1"):
            later = {r: v for r, v in rs.items() if r >= 2}
            if later and complete(later):
                done.append(cid)
                continue
            frm = (max(later) + 1) if later else 2
            committed_rounds.append({"id": cid, "mode": "rounds", "from": frm, "earlierFile": earlier(cid, rs)})
            continue
        if rs:
            if complete(rs):
                waiting.append(cid)  # through its rounds: commit-cases.py commits it
                continue
            started.append({"id": cid, "mode": "rounds", "from": max(rs) + 1, "earlierFile": earlier(cid, rs)})
            continue
        if cid in authors:
            rf = os.path.join(SP, "reports", f"{cid}.json")
            json.dump(authors[cid], open(rf, "w"), indent=2, ensure_ascii=False)
            started.append({"id": cid, "mode": "rounds", "from": 1, "reportFile": rf})
            continue
        work = os.path.join(os.path.dirname(SP), f"work-{cid}")
        dirty = bool(git("status", "--porcelain", "--", f"packages/content/cases/{cid}").strip())
        item = {"id": cid, "mode": "author"}
        (started if dirty or (os.path.isdir(work) and os.listdir(work)) else fresh).append(item)
    new = started + fresh
    runs = [new[k::split] for k in range(split)]
    for k, run in enumerate(runs):
        json.dump({"cases": run}, open(os.path.join(SP, f"args-new-{k + 1}.json"), "w"), indent=1)
    json.dump({"cases": committed_rounds}, open(os.path.join(SP, "args-rounds.json"), "w"), indent=1)
    print(f"done {len(done)}; new cases through their rounds, to commit: {len(waiting)}; new in progress {len(started)}; "
          f"new to author {len(fresh)}; committed needing rounds {len(committed_rounds)}")
    for k, run in enumerate(runs):
        print(f"args-new-{k + 1}.json: {len(run)}:", " ".join(f"{c['id']}({c['mode'][0]}{c.get('from', '')})" for c in run[:8]), "…")
    print("args-rounds.json:", " ".join(f"{c['id']}(r{c['from']})" for c in committed_rounds[:10]), "…")


main()
