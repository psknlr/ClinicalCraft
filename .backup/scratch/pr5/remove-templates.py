"""Leave the cmcr-105 cases still at 1.0.x out of the library: `git rm` their folders and list them in the source map's
`awaitingReauthoring` (with where their drafts are kept). Stages the changes; does not commit.

usage: python3 -I remove-templates.py <branch holding the drafts> <commit holding the drafts> [--dry-run]
"""
import glob, json, os, subprocess, sys

SP = os.path.dirname(os.path.abspath(__file__))
WT = os.path.join(SP, "wt")
BRANCH, COMMIT = sys.argv[1], sys.argv[2]
DRY = "--dry-run" in sys.argv


def git(*a, check=True):
    p = subprocess.run(["git", *a], cwd=WT, capture_output=True, text=True)
    if check and p.returncode:
        raise SystemExit(f"git {' '.join(a)}: {p.stderr.strip()}")
    return p.stdout


if git("status", "--porcelain", "--", "packages/content/cases").strip():
    raise SystemExit("case folders hold uncommitted changes: commit or restore them first")
templates, kept = [], []
for p in sorted(glob.glob(os.path.join(WT, "packages/content/cases/*/case.json"))):
    c = json.load(open(p))
    if "cmcr-105" not in (c.get("tags") or []):
        continue
    (kept if str(c.get("version", "")).startswith("1.1") else templates).append(c["id"])
src_path = os.path.join(WT, "scripts/cmcr-105-sources.json")
source = json.load(open(src_path))
ids = {e["id"] for e in source["cases"]}
assert set(templates) <= ids and set(kept) <= ids and len(ids) == 105, "source map and case folders disagree"
print(f"keep {len(kept)} re-authored cases; leave out {len(templates)} templates")
if DRY:
    print(" ".join(templates))
    sys.exit(0)
note = (f"These reports' cases are not in the library: their 1.0.0 versions are template drafts that do not meet the "
        f"content standard (docs/CASE_AUTHORING.md §9) and await re-authoring from the source report. The drafts are on "
        f"branch {BRANCH} (commit {COMMIT}): restore one with `git checkout {COMMIT} -- packages/content/cases/<id>`, "
        f"re-author it to 1.1.0, then remove its id from this list.")
out = {}
for k, v in source.items():
    if k == "cases":
        out["awaitingReauthoring"] = {"note": note, "ids": sorted(templates)}
    out[k] = v
tmp = src_path + ".tmp"
open(tmp, "w").write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
os.replace(tmp, src_path)
git("rm", "-r", "-q", "--", *[f"packages/content/cases/{cid}" for cid in templates])
git("add", "scripts/cmcr-105-sources.json")
print("staged:", git("diff", "--cached", "--shortstat").strip())
