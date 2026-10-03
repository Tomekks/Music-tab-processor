#!/usr/bin/env bash
# Runs `opencode run --standalone <args>` into a log file and kills it FAST when it is dead:
#   no output at all within FIRST_OUTPUT_TIMEOUT seconds (default 60)  -> exit 125
#   no new output for STALL_TIMEOUT seconds (default 180)              -> exit 126
#   total time over the limit                                          -> exit 124
#   finished but the log is empty (silent failure)                     -> exit 127
# Otherwise exits with opencode's own exit code.
# Usage: scripts/oc-run.sh <logfile> <total-timeout-seconds> -- <opencode run args...>
set -uo pipefail
LOG="${1:?usage: scripts/oc-run.sh <logfile> <total-timeout> -- <opencode args>}"
TOTAL="${2:?total timeout seconds}"
shift 2
[ "${1:-}" = "--" ] && shift
FIRST="${FIRST_OUTPUT_TIMEOUT:-60}"
STALL="${STALL_TIMEOUT:-180}"

: > "$LOG"
# Own process group, so the whole tree (opencode and its helper server) can be killed together.
perl -e 'setpgrp(0, 0); exec @ARGV' opencode run --standalone "$@" > "$LOG" 2>&1 &
PID=$!

kill_tree() {
  kill -TERM -- "-$PID" 2>/dev/null
  sleep 1
  kill -KILL -- "-$PID" 2>/dev/null
  { wait "$PID"; } 2>/dev/null
}

start=$SECONDS; last_change=$SECONDS; last_size=0
while kill -0 "$PID" 2>/dev/null; do
  sleep 1
  size="$(wc -c < "$LOG" | tr -d ' ')"
  if [ "$size" -ne "$last_size" ]; then last_size="$size"; last_change=$SECONDS; fi
  elapsed=$((SECONDS - start))
  if [ "$size" -eq 0 ] && [ "$elapsed" -ge "$FIRST" ]; then kill_tree; exit 125; fi
  if [ $((SECONDS - last_change)) -ge "$STALL" ]; then kill_tree; exit 126; fi
  if [ "$elapsed" -ge "$TOTAL" ]; then kill_tree; exit 124; fi
done
wait "$PID"; rc=$?
[ -s "$LOG" ] || exit 127
exit "$rc"
