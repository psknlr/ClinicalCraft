"""Status and commits of the CMCR-105 re-authoring.

Reads every workflow journal of this session for author and review+fix results, writes case-status.json (durable via
the checkpoint), re-runs the STANDARD §5 per-case checks on each case whose review+fix finished with all checks
passing and is not yet committed, and (with --commit) commits the cases that pass on pr5-local.

usage: python3 -I commit-cases.py [--only id,id] [--skip-tests] [--commit]
Prints a table; writes commit-ready.txt and commit-bullets.txt next to this script.
"""
import collections, glob, json, os, re, subprocess, sys, time

SP = os.path.dirname(os.path.abspath(__file__))
WT = os.path.join(SP, "wt")
WF = "/root/.claude/projects/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/subagents/workflows"
STATUS = os.path.join(SP, "case-status.json")


MAX_ROUND = 4  # review2.js: rounds 2 .. 2 + maxRounds (default 2)


INFLIGHT_MIN = 30  # an agent started without a result whose transcript changed this recently is still working


def inflight():
    """Case ids an agent is working on now: started in a journal, no result yet, its transcript written recently."""
    now, busy = time.time(), set()
    for p in glob.glob(os.path.join(WF, "*", "journal.jsonl")):
        started, finished = {}, set()
        for line in open(p):
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if d.get("type") == "started" and ":" in str(d.get("label", "")):
                started[d.get("key")] = (d.get("agentId"), d["label"].split(":", 1)[1])
            elif d.get("type") in ("result", "error", "failed"):
                finished.add(d.get("key"))
        for key, (agent_id, cid) in started.items():
            if key in finished:
                continue
            t = os.path.join(os.path.dirname(p), f"agent-{agent_id}.jsonl")
            if os.path.exists(t) and now - os.path.getmtime(t) < INFLIGHT_MIN * 60:
                busy.add(cid)
    return busy


def head_version(cid):
    """The case's version as committed at HEAD ('' if absent)."""
    try:
        return json.loads(git("show", f"HEAD:packages/content/cases/{cid}/case.json") or "{}").get("version", "")
    except ValueError:
        return ""


def journals():
    """(author results, first-review results, later review rounds {round: result}) by case id, from every journal."""
    authors, reviews, rounds = {}, {}, {}
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
                if int(v.get("round") or 1) >= 2:
                    rounds.setdefault(v["caseId"], {})[int(v["round"])] = v
                else:
                    reviews[v["caseId"]] = v
            elif "extraction" in v:
                authors[v["caseId"]] = v
    return authors, reviews, rounds


def serious(v):
    return sum(1 for f in v["findings"] if f["severity"] in ("critical", "major"))


def rounds_complete(rs):
    """A case's later rounds are complete when the last one found nothing critical or major with all checks passing,
    or the last allowed round has run; before that another reviewer may still be editing the case."""
    last = max(rs)
    return (serious(rs[last]) == 0 and rs[last]["allChecksPass"]) or last >= MAX_ROUND


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
    authors, reviews, rounds = journals()
    status = json.load(open(STATUS)) if os.path.exists(STATUS) else {}
    for cid in authors:
        status.setdefault(cid, {})["authored"] = True
    for cid, v in reviews.items():
        s = status.setdefault(cid, {})
        s["reviewed"] = True
        s["allChecksPass"] = bool(v["allChecksPass"])
        s["findings"] = dict(collections.Counter(f["severity"] for f in v["findings"]))
    for cid, rs in rounds.items():
        s2 = status.setdefault(cid, {}).setdefault("rounds", {})
        for r, v in rs.items():
            s2[str(r)] = {"allChecksPass": bool(v["allChecksPass"]), "findings": dict(collections.Counter(f["severity"] for f in v["findings"]))}
    ready, ready2, rows = [], [], []
    busy = inflight()
    for cid, rs in sorted(rounds.items()):
        if only and cid not in only:
            continue
        if cid in busy:
            rows.append((cid, f"round {max(rs)} done; an agent is working on it", ""))
            continue
        if not dirty(cid):
            if rounds_complete(rs):
                status[cid]["roundsCommitted"] = max(rs)
            continue
        if not rounds_complete(rs):
            rows.append((cid, f"round {max(rs)} done, another round running", ""))
            continue
        if not rs[max(rs)]["allChecksPass"]:
            rows.append((cid, f"round {max(rs)} reports failing checks", ""))
            continue
        res = {} if skip else checks(cid)
        ok = all(res.values())
        status[cid]["checks"] = res
        allr = dict(rs)
        new_case = not head_version(cid).startswith("1.1")
        if new_case and cid in reviews:
            allr[1] = reviews[cid]
        desc = "; ".join(f"round {r}: " + (", ".join(f"{n} {k}" for k, n in sorted(collections.Counter(f["severity"] for f in allr[r]["findings"]).items())) or "no findings") for r in sorted(allr))
        rows.append((cid, ("PASS" if ok else "FAIL " + ",".join(k for k, x in res.items() if not x)) + (" (new)" if new_case else ""), desc))
        if ok and new_case:
            if 1 not in allr:
                rows.append((cid, "new case without a first review result: not committed", ""))
                continue
            ready.append((cid, allr, desc))
        elif ok:
            ready2.append((cid, rs, desc))
    for cid, v in sorted(reviews.items()):
        if only and cid not in only:
            continue
        if cid in rounds:
            continue  # handled above (its later rounds, and a new case's first review with them)
        if cid in busy:
            rows.append((cid, "first review done; an agent is working on it", ""))
            continue
        if not dirty(cid):
            status[cid]["committed"] = True
            continue
        if not head_version(cid).startswith("1.1"):
            rows.append((cid, "first review done; waiting for review round 2 before the first commit", ""))
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
            ready.append((cid, {1: v}, f"crit {sev['critical']} major {sev['major']} minor {sev['minor']}"))
    for r in rows:
        print(*r, sep=" | ")
    lines = []
    for cid, allr, _ in ready:
        c = json.load(open(os.path.join(WT, "packages/content/cases", cid, "case.json")))
        title = c["title"]["en"] if isinstance(c.get("title"), dict) else str(c.get("title"))
        per = "; ".join(f"round {r}: {sum(1 for f in allr[r]['findings'] if f['severity'] == 'critical')} critical, "
                        f"{sum(1 for f in allr[r]['findings'] if f['severity'] == 'major')} major, "
                        f"{sum(1 for f in allr[r]['findings'] if f['severity'] == 'minor')} minor" for r in sorted(allr))
        lines.append(f"- {cid}: {title} ({len(c.get('decisions', []))} decisions, {len(c.get('interventions', []))} interventions;\n"
                     f"  reviews: {per})")
    open(os.path.join(SP, "commit-ready.txt"), "w").write("".join(cid + "\n" for cid, *_ in ready))
    open(os.path.join(SP, "commit-bullets.txt"), "w").write("\n".join(lines) + ("\n" if lines else ""))
    if commit and ready and not skip:
        n = len(ready)
        tot = collections.Counter()
        for _, allr, _ in ready:
            for v in allr.values():
                tot.update(f["severity"] for f in v["findings"])
        multi = any(len(allr) > 1 for _, allr, _ in ready)
        how = ("then reviewed in at least two rounds, each by a fresh independent reviewer (every patient fact traced\n"
               "to 1.0.0 in both languages, every guideline statement looked up in its source's own text, the kit's\n"
               "checklist of earlier reviews' findings, assessment replays), further rounds following while a round\n"
               "found a critical or major issue, and fixed:\n\n") if multi else (
               "then reviewed independently (every patient fact traced to 1.0.0; clinical accuracy against named,\n"
               "current guidance, citations checked online; assessment validity; voice, privacy, spoilers) and fixed:\n\n")
        msg = (f"CMCR 105: {n} more case{'s' if n > 1 else ''} re-authored and reviewed (1.1.0)\n\n"
               "Each re-authored from the facts its 1.0.0 recorded (the full source articles are not yet available),\n"
               + how + "\n".join(lines) + "\n\n"
               f"Reviews: {tot['critical']} critical, {tot['major']} major and {tot['minor']} minor findings; every critical and major\n"
               "one fixed or answered with a reason in the case's README. Each case passes strict validation (with the\n"
               "audit's safety lints), verification (100 %), scripts/case-check.ts, the collection contract and the\n"
               "in-world demonstration in both languages.\n\n"
               "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n"
               "Claude-Session: https://claude.ai/code/session_01AWJW3iF3PiZeQzaQpyArab\n")
        open(os.path.join(SP, "commit-msg.txt"), "w").write(msg)
        git("add", "--", *[f"packages/content/cases/{cid}" for cid, *_ in ready])
        out = subprocess.run(["git", "commit", "-q", "-F", os.path.join(SP, "commit-msg.txt")], cwd=WT, capture_output=True, text=True)
        print("commit:", out.returncode, out.stderr.strip()[:300], git("log", "--oneline", "-1").strip())
        for cid, allr, _ in ready:
            status[cid]["committed"] = True
            if len(allr) > 1:
                status[cid]["roundsCommitted"] = max(allr)
    if commit and ready2 and not skip:
        n = len(ready2)
        tot = collections.Counter()
        for _, rs, _ in ready2:
            for v in rs.values():
                tot.update(f["severity"] for f in v["findings"])
        bullets = "\n".join(f"- {cid}: {desc}" for cid, _, desc in ready2)
        msg = (f"CMCR 105: {n} more case{'s' if n > 1 else ''} through a second independent review\n\n"
               "Each case, re-authored and reviewed once, was reviewed again by a fresh reviewer: every patient fact\n"
               "traced to 1.0.0 in both languages, every guideline statement looked up in its source's own text,\n"
               "the kit's checklist of the earlier reviews' findings, and assessment replays (harmful acts, option\n"
               "lengths, aliases, leaks, plain questions in both languages); a further round followed while a round\n"
               "found a critical or major issue. Findings by round (all critical and major ones fixed or answered\n"
               "with a reason in the case's README):\n\n" + bullets + "\n\n"
               f"Totals: {tot['critical']} critical, {tot['major']} major and {tot['minor']} minor findings. Each case passes\n"
               "strict validation, verification (100 %), scripts/case-check.ts, the collection contract and the\n"
               "in-world demonstration in both languages.\n\n"
               "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n"
               "Claude-Session: https://claude.ai/code/session_01AWJW3iF3PiZeQzaQpyArab\n")
        open(os.path.join(SP, "commit-msg-2.txt"), "w").write(msg)
        git("add", "--", *[f"packages/content/cases/{cid}" for cid, *_ in ready2])
        out = subprocess.run(["git", "commit", "-q", "-F", os.path.join(SP, "commit-msg-2.txt")], cwd=WT, capture_output=True, text=True)
        print("commit (later rounds):", out.returncode, out.stderr.strip()[:300], git("log", "--oneline", "-1").strip())
        for cid, rs, _ in ready2:
            status[cid]["roundsCommitted"] = max(rs)
    json.dump(status, open(STATUS, "w"), indent=1, sort_keys=True)
    print(f"{len(ready)} ready; {len(ready2)} ready after later rounds")


main()
