#!/usr/bin/env bash
# Is opencode answering right now? One-word request through the reviewer agent (read-only), cut off after
# 45 seconds. Run it before a dry run or a long job so a dead endpoint costs seconds, not minutes.
# Usage: scripts/oc-health.sh [model]     (default deepseek-v4.1-flash; try the builder model too)
# Exit: 0 healthy, 1 unhealthy
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
MODEL="${1:-opencode-go/deepseek-v4.1-flash}"
case "$MODEL" in *free*) echo "refusing free-tier model: $MODEL"; exit 1 ;; esac
case "$MODEL" in opencode-go/*) ;; *) echo "model must be an opencode-go/ id, got: $MODEL"; exit 1 ;; esac

export OPENCODE_DISABLE_CLAUDE_CODE=1 OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_LSP_DOWNLOAD=1
LOG="$(mktemp)"; trap 'rm -f "$LOG"' EXIT
t0=$SECONDS
FIRST_OUTPUT_TIMEOUT=45 bash scripts/oc-run.sh "$LOG" 60 -- --agent reviewer -m "$MODEL" "Reply with the single word ok."
RC=$?
if [ "$RC" -eq 0 ] && grep -qi 'ok' "$LOG"; then
  echo "oc-health: HEALTHY ($MODEL answered in $((SECONDS - t0))s)"
  exit 0
fi
case "$RC" in
  125) echo "oc-health: UNHEALTHY, no response within 45s ($MODEL)" ;;
  126) echo "oc-health: UNHEALTHY, stalled ($MODEL)" ;;
  127) echo "oc-health: UNHEALTHY, empty log (silent failure) ($MODEL)" ;;
  *)   echo "oc-health: UNHEALTHY, exit $RC ($MODEL)"; tail -5 "$LOG" ;;
esac
exit 1
