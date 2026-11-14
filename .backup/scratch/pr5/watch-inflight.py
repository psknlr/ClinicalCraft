"""Wait until a case run needs attention: one of its lanes starts a case outside the in-flight set, or all of its
in-flight cases are complete. Prints what happened and the state of each in-flight case, then exits.

usage: python3 -I watch-inflight.py <runId>[!]=<case>,<case> [...]   (polls the journals every 60 s; ! = completion only)
"""
import json, os, sys, time

WF = "/root/.claude/projects/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/subagents/workflows"
MAX_ROUND, MIN_ROUND = 4, 2


def state(run):
    starts, rounds, authored = [], {}, set()
    p = os.path.join(WF, run, "journal.jsonl")
    if not os.path.exists(p):
        return starts, rounds, authored
    for line in open(p):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if d.get("type") == "started" and ":" in str(d.get("label", "")):
            starts.append(d["label"])
        v = d.get("result")
        if d.get("type") == "result" and isinstance(v, dict) and "caseId" in v:
            if "findings" in v and "allChecksPass" in v:
                rounds.setdefault(v["caseId"], {})[int(v.get("round") or 1)] = v
            elif "extraction" in v:
                authored.add(v["caseId"])
    return starts, rounds, authored


def complete(rs):
    if not rs:
        return False
    last = max(rs)
    serious = sum(1 for f in rs[last]["findings"] if f["severity"] in ("critical", "major"))
    return last >= MAX_ROUND or (last >= MIN_ROUND and serious == 0 and rs[last]["allChecksPass"])


def describe(cid, rs, authored):
    if not rs:
        return f"{cid}: {'authored, ' if cid in authored else ''}no review round yet"
    parts = []
    for r in sorted(rs):
        v = rs[r]
        c = sum(1 for f in v["findings"] if f["severity"] == "critical")
        m = sum(1 for f in v["findings"] if f["severity"] == "major")
        parts.append(f"r{r}: {c}c/{m}M{'' if v['allChecksPass'] else ' FAIL'}")
    return f"{cid}: {'; '.join(parts)}{' — COMPLETE' if complete(rs) else ''}"


def main():
    runs, quiet = {}, set()
    for a in sys.argv[1:]:
        run, cases = a.split("=", 1)
        if run.endswith("!"):  # "<run>!=…": wait for completion only, ignore a lane that has moved on
            run = run[:-1]
            quiet.add(run)
        runs[run] = cases.split(",")
    while True:
        for run, allowed in runs.items():
            starts, rounds, authored = state(run)
            outside = [] if run in quiet else [s for s in starts if s.split(":", 1)[1] not in allowed]
            done = [c for c in allowed if complete(rounds.get(c, {}))]
            if outside or len(done) == len(allowed):
                print(time.strftime("%H:%M UTC", time.gmtime()), run,
                      "ALL COMPLETE" if len(done) == len(allowed) else f"started outside the set: {outside}")
                for c in allowed:
                    print("  ", describe(c, rounds.get(c, {}), authored))
                print("   last started:", starts[-3:])
                return
        time.sleep(60)


main()
