#!/usr/bin/env bash
# The one command that runs an e2e area's browser specs (docs/rules/e2e.md). For the builder and for Claude.
# It refuses to start if the area's ports are taken (a stale server would silently test old code), runs the
# area's command, makes sure nothing is left listening, and prints a short PASS/FAIL summary. Raw output goes
# to docs/work/runs/e2e-<area>.log (not in git); read it only on a FAIL.
# Usage: scripts/run-e2e.sh [area]      (default: workbench)
# Env:   E2E_CMD, E2E_PORTS override the area's command and ports (for the test).
# Exit:  0 pass | 1 specs failed | 2 not run (unknown area, or a port is taken)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
AREA="${1:-workbench}"
case "$AREA" in
  workbench) CMD="${E2E_CMD:-npm --prefix app run test:e2e:workbench}"; PORTS="${E2E_PORTS:-3000 5174}" ;;
  *) echo "run-e2e: unknown area '$AREA' (known: workbench)"; exit 2 ;;
esac
listeners() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null; }
for p in $PORTS; do
  [ -z "$(listeners "$p")" ] || { echo "run-e2e: NOT RUN, port $p is taken (a stale dev server?). Free it, then run again: lsof -nP -iTCP:$p -sTCP:LISTEN"; exit 2; }
done
mkdir -p docs/work/runs; LOG="docs/work/runs/e2e-$AREA.log"
bash -c "$CMD" > "$LOG" 2>&1; RC=$?
for p in $PORTS; do   # ports were free at the start, so anything listening now is a leftover of this run
  L="$(listeners "$p")"; [ -z "$L" ] || { kill $L 2>/dev/null; echo "run-e2e: stopped a leftover server on port $p"; }
done
if [ "$RC" -eq 0 ]; then
  echo "run-e2e: PASS ($AREA) $(grep -E '^[[:space:]]*[0-9]+ passed' "$LOG" | tail -1 | sed 's/^ *//')"; exit 0
fi
echo "run-e2e: FAIL ($AREA) $(grep -E '^[[:space:]]*[0-9]+ (passed|failed)' "$LOG" | tr -s ' ' | tr '\n' ' ')"
grep -E '^[[:space:]]*[0-9]+\) ' "$LOG" | head -10 | cut -c1-160
echo "run-e2e: full output in $LOG"; exit 1
