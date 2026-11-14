#!/usr/bin/env bash
# Back up everything a container restart would lose, as one [skip ci] commit on top of the previous checkpoint
# (refs/heads/pr5-backup), pushed to the designated branch as a fast-forward:
#   - the PR #5 worktree (wt): tracked + untracked files, .gitignore respected (the commit's tree);
#   - the audit worktree (trial): its uncommitted changes as .backup/trial.patch (git apply --binary), its HEAD;
#   - the tooling in the scratchpad (standard, kit, workflow scripts, helpers) under .backup/scratch/.
# pr5-local's and audit-fixes' HEADs become extra parents, so their commits stay reachable.
# Never touches either worktree's HEAD or index.   usage: checkpoint.sh "<what changed>"
set -euo pipefail
SP=/tmp/claude-0/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/scratchpad
P=$SP/pr5
cd "$P/trial"
export GIT_INDEX_FILE="$P/trial-backup.index"
rm -f "$GIT_INDEX_FILE"; git read-tree HEAD; git add -A
git diff --cached --binary HEAD > "$P/trial.patch"
TRIALHEAD=$(git rev-parse HEAD)
cd "$P/wt"
export GIT_INDEX_FILE="$P/backup.index"
rm -f "$GIT_INDEX_FILE"; git read-tree HEAD; git add -A
add_file() { # <source file> <path in the snapshot>
  local sha; sha=$(git hash-object -w "$1"); git update-index --add --cacheinfo "100644,$sha,$2"
}
add_file "$P/trial.patch" .backup/trial.patch
echo "$TRIALHEAD" > "$P/trial-head.txt"; add_file "$P/trial-head.txt" .backup/trial-head.txt
for f in "$P"/*.md "$P"/*.js "$P"/*.py "$P"/*.sh "$P"/*.json "$P"/*.txt "$P"/reports/*.json "$SP"/audit2/*.js "$SP"/audit2/*.txt; do
  [ -f "$f" ] || continue
  case "$f" in *trial.patch|*trial-head.txt) continue;; esac
  rel=${f#"$SP"/}; add_file "$f" ".backup/scratch/$rel"
done
if git diff --cached --name-only HEAD | grep -E "(^|/)assets/local/|settings\.local\.json|\.env$|\.pdf$|\.png$|\.xlsx$"; then
  echo "refusing: a file that must never be committed is in the snapshot" >&2; exit 1
fi
TREE=$(git write-tree)
unset GIT_INDEX_FILE
PARENT=$(git rev-parse refs/heads/pr5-backup)
EXTRA=()
for h in "$(git rev-parse HEAD)" "$TRIALHEAD"; do
  if ! git merge-base --is-ancestor "$h" "$PARENT"; then
    dup=0; for e in "${EXTRA[@]:-}"; do [ "$e" = "$h" ] && dup=1; done
    [ $dup = 1 ] || EXTRA+=(-p "$h")
  fi
done
if [ "$(git rev-parse "$PARENT^{tree}")" = "$TREE" ] && [ ${#EXTRA[@]} -eq 0 ]; then echo "no change since the last checkpoint"; exit 0; fi
MSG=$(printf 'WIP checkpoint: %s [skip ci]\n\nBackup of the uncommitted work on the PR #5 line (and the audit worktree as .backup/trial.patch,\nthe authoring tooling under .backup/scratch/). Not a reviewable state.\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01AWJW3iF3PiZeQzaQpyArab' "${1:-PR #5 revision in progress}")
C=$(git commit-tree "$TREE" -p "$PARENT" "${EXTRA[@]}" -m "$MSG")
git update-ref refs/heads/pr5-backup "$C" "$PARENT"
for i in 1 2 3 4; do
  if timeout 120 git push -q origin pr5-backup:claude/clinicalcraft-framework-upgrade-uzcezw; then echo "checkpoint $C pushed"; exit 0; fi
  sleep $((2 ** i))
done
echo "push failed" >&2; exit 1
