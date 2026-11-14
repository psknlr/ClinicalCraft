# After a container restart (the scratchpad and /home/user/ClinicalCraft are wiped; GitHub keeps the backups)

1. `git fetch origin`; the latest checkpoint is origin/claude/clinicalcraft-framework-upgrade-uzcezw (its message says
   "WIP checkpoint"). Its tree = the PR #5 worktree (pr5-local) with uncommitted case work; `.backup/scratch/` = this
   tooling (STANDARD.md, KIT.md, reauthor-v4.js, wave2.js, commit-cases.py, checkpoint.sh, case-status.json, args,
   runs.json); `.backup/trial.patch` = the audit worktree's uncommitted changes on `.backup/trial-head.txt`.
2. Parents of the checkpoint: the previous checkpoint, pr5-local's HEAD, audit-fixes' HEAD (when not already
   ancestors) — recreate the branches from them (`git log --format='%h %p %s' -1 <checkpoint>`).
3. Worktrees: `git branch -f pr5-backup <checkpoint>`; `git worktree add -b pr5-local $SP/pr5/wt <pr5-local head>`;
   `git -C $SP/pr5/wt checkout <checkpoint> -- packages/content/cases scripts/case-check.ts && git -C $SP/pr5/wt reset -q`;
   `git worktree add -b audit-fixes $SP/pr5/trial <trial head>`; `git -C $SP/pr5/trial apply --binary <(git show <checkpoint>:.backup/trial.patch)`;
   copy `.backup/scratch/*` back to $SP; `npm install` in both worktrees; bpy: `python3.11 -m venv $SP/bpy-venv && $SP/bpy-venv/bin/pip install bpy==5.0.1`.
4. Status: case-status.json; start new runs for what is not reviewed (reauthor-v5.js: two lanes, author -> review -> next; modes review/author, reportFile for an author report kept in pr5/reports), at most 3
   workflows; restart the 30-minute loop (loop.sh).
5. Second reviews (from 2026-11-14): review2.js over committed cases (args {cases:[id…]}); a case is done when its
   case-status.json entry has `roundsCommitted`; cases with rounds but none committed: start a new review2 run for
   them (the reviewer continues from ${SP}/work-<id>/review<round>.md notes and the uncommitted edits).

## Since 2026-11-14 15:10: reauthor-v6 (author + review rounds in one lane)

- New cases: author → review rounds 1..4 (at least 2; stop when a round finds no critical/major and all checks pass);
  committed by commit-cases.py only when their rounds are complete. Committed cases: rounds from 2 (args-rounds.json).
- After a limit or restart: `python3 -I plan-runs.py --split 2` rebuilds args-new-1/2.json and args-rounds.json from the
  journals and the worktree (writes reports/<id>.json and earlier/<id>.json); relaunch reauthor-v6.js with each (rounds
  items as {"id","mode":"rounds","from":N,"earlier":true}); restart loop.sh; record the runs in runs.json.
- commit-cases.py (v4) skips a case an agent is working on (started, no result, transcript written < 30 min ago).
