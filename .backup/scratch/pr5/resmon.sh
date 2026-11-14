#!/usr/bin/env bash
# Every minute: memory, load and the number of node/claude processes, so a container restart can be diagnosed.
L=/tmp/claude-0/-home-user-ClinicalCraft/61c17a21-a923-5d20-a08c-1c8a508459b0/scratchpad/pr5/resmon.log
while true; do
  echo "$(date -u +%H:%M) $(free -m | awk '/Mem:/{print "used="$3"M avail="$7"M"}') load=$(cut -d' ' -f1-3 /proc/loadavg) node=$(pgrep -c node) claude=$(pgrep -fc claude) vitest=$(pgrep -fc vitest)" >> $L
  sleep 60
done
