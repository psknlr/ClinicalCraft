#!/usr/bin/env bash
# Every 30 minutes: commit the newly reviewed cases that pass their checks, then back everything up. Runs ~110 min.
SP=/tmp/claude-0/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/scratchpad/pr5
for i in 1 2 3 4; do
  sleep 1500
  echo "== $(date -u +%H:%M) round $i" >> $SP/loop.log
  (cd $SP && timeout 1500 python3 -I commit-cases.py --commit >> $SP/loop.log 2>&1)
  bash $SP/checkpoint.sh "periodic backup $(date -u +%H:%M) UTC" >> $SP/loop.log 2>&1
done
