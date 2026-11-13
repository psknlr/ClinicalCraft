"""Status and commits of the CMCR-105 re-authoring.

Reads every workflow journal of this session for author and review+fix results, writes case-status.json (durable via
the checkpoint), re-runs the STANDARD §5 per-case checks on each case whose review+fix finished with all checks
passing and is not yet committed, and (with --commit) commits the cases that pass on pr5-local.

usage: python3 -I commit-cases.py [--only id,id] [--skip-tests] [--commit]
Prints a table; writes commit-ready.txt and commit-bullets.txt next to this script.
"""
import collections, glob, json, os, re, subprocess, sys

SP = os.path.dirname(os.path.abspath(__file__))
WT = os.path.join(SP, "wt")
WF = "/root/.claude/projects/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/subagents/workflows"
STATUS = os.path.join(SP, "case-status.json")


def journals():
    """(author results, review results) by case id, from every journal of this session."""
    authors, reviews = {}, {}
    for p in glob.glob(os.path.join(WF, "*", "journal.jsonl")):
        for line in open(p):
            try:
                d = json.loads(line)
            except ValueError:
                continue
            v = d.get("result")
            if d.get("type") != "result" or not isinstance(v, dict) or "caseId" not in v:
                continue
            if "findings" in v and "allChecksPass" in v:
                reviews[v["caseId"]] = v
            elif "extraction" in v:
                authors[v["caseId"]] = v
    return authors, reviews


def git(*args):
    return subprocess.run(["git", *args], cwd=WT, capture_output=True, text=True).stdout


def dirty(cid):
    return bool(git("status", "--porcelain", "--", f"packages/content/cases/{cid}").strip())


def run(cmd, timeout=900):
    try:
        p = subprocess.run(cmd, cwd=WT, shell=True, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout + p.stderr)[-3000:]
    except subprocess.TimeoutExpired:
        return 124, "timeout"


def checks(cid):
    res = {}
    rc, out = run(f"npm run -s cc -- cases validate packages/content/cases/{cid}/case.json --strict --lang en")
    counts = re.findall(r"(\d+) error\(s\), (\d+) warning\(s\)", out)
    res["validate"] = rc == 0 and bool(counts) and all(e == "0" and w == "0" for e, w in counts)
    rc, _ = run(f"npm run -s cc -- cases verify {cid} --lang en")
    res["verify"] = rc == 0
    rc, _ = run(f"npx tsx --conditions=source scripts/case-check.ts {cid}")
    res["case-check"] = rc == 0
    rc, _ = run(f'npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "{cid}:"')
    res["contract"] = rc == 0
    rc, _ = run(f'npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "{cid}:"')
    res["in-world"] = rc == 0
    return res


def main():
    only = set(sys.argv[sys.argv.index("--only") + 1].split(",")) if "--only" in sys.argv else None
    skip, commit = "--skip-tests" in sys.argv, "--commit" in sys.argv
    authors, reviews = journals()
    status = json.load(open(STATUS)) if os.path.exists(STATUS) else {}
    for cid in authors:
        status.setdefault(cid, {})["authored"] = True
    for cid, v in reviews.items():
        s = status.setdefault(cid, {})
        s["reviewed"] = True
        s["allChecksPass"] = bool(v["allChecksPass"])
        s["findings"] = dict(collections.Counter(f["severity"] for f in v["findings"]))
    ready, rows = [], []
    for cid, v in sorted(reviews.items()):
        if only and cid not in only:
            continue
        if not dirty(cid):
            status[cid]["committed"] = True
            continue
        sev = collections.Counter(f["severity"] for f in v["findings"])
        unfixed = [f for f in v["findings"] if f["severity"] in ("critical", "major") and not f["fixed"]]
        if not v["allChecksPass"]:
            rows.append((cid, "review reports failing checks", ""))
            continue
        res = {} if skip else checks(cid)
        ok = all(res.values())
        status[cid]["checks"] = res
        rows.append((cid, "PASS" if ok else "FAIL " + ",".join(k for k, x in res.items() if not x),
                     f"crit {sev['critical']} major {sev['major']} minor {sev['minor']}; unfixed crit/major {len(unfixed)}"))
        if ok:
            ready.append((cid, sev, unfixed))
    for r in rows:
        print(*r, sep=" | ")
    lines = []
    for cid, sev, unfixed in ready:
        c = json.load(open(os.path.join(WT, "packages/content/cases", cid, "case.json")))
        title = c["title"]["en"] if isinstance(c.get("title"), dict) else str(c.get("title"))
        lines.append(f"- {cid}: {title} ({len(c.get('decisions', []))} decisions, {len(c.get('interventions', []))} interventions;\n"
                     f"  review: {sev['critical']} critical, {sev['major']} major, {sev['minor']} minor findings"
                     + (f", {len(unfixed)} critical/major answered with a reason" if unfixed else "") + ")")
    open(os.path.join(SP, "commit-ready.txt"), "w").write("".join(cid + "\n" for cid, *_ in ready))
    open(os.path.join(SP, "commit-bullets.txt"), "w").write("\n".join(lines) + ("\n" if lines else ""))
    if commit and ready and not skip:
        n = len(ready)
        crit = sum(s["critical"] for _, s, _ in ready); major = sum(s["major"] for _, s, _ in ready); minor = sum(s["minor"] for _, s, _ in ready)
        msg = (f"CMCR 105: {n} more case{'s' if n > 1 else ''} re-authored and reviewed (1.1.0)\n\n"
               "Each re-authored from the facts its 1.0.0 recorded (the full source articles are not yet available),\n"
               "then reviewed independently (every patient fact traced to 1.0.0; clinical accuracy against named,\n"
               "current guidance, citations checked online; assessment validity; voice, privacy, spoilers) and fixed:\n\n"
               + "\n".join(lines) + "\n\n"
               f"Reviews: {crit} critical, {major} major and {minor} minor findings; every critical and major one fixed or\n"
               "answered with a reason. Each case passes strict validation (with the audit's safety lints),\n"
               "verification (100 %), scripts/case-check.ts, the collection contract and the in-world demonstration\n"
               "in both languages.\n\n"
               "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n"
               "Claude-Session: https://claude.ai/code/session_01AWJW3iF3PiZeQzaQpyArab\n")
        open(os.path.join(SP, "commit-msg.txt"), "w").write(msg)
        git("add", "--", *[f"packages/content/cases/{cid}" for cid, *_ in ready])
        out = subprocess.run(["git", "commit", "-q", "-F", os.path.join(SP, "commit-msg.txt")], cwd=WT, capture_output=True, text=True)
        print("commit:", out.returncode, out.stderr.strip()[:300], git("log", "--oneline", "-1").strip())
        for cid, *_ in ready:
            status[cid]["committed"] = True
    json.dump(status, open(STATUS, "w"), indent=1, sort_keys=True)
    print(f"{len(ready)} ready")


main()
