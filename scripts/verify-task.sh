#!/usr/bin/env bash
# The builder's "run the checks" step: app verify always, pipeline tests too when pipeline/ files changed.
# Prints only the footers (what ran with counts, what did not) and exits non-zero on any failure.
# Usage: scripts/verify-task.sh   (no arguments, so it can be allowed as one exact command)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
FAIL=0

if [ -f app/package.json ]; then
  OUT="$(cd app && npm run verify --silent 2>&1)" || FAIL=1
  echo "$OUT" | tail -n 15
fi

if git status --porcelain | grep -q '^.. pipeline/'; then
  echo "--- pipeline"
  OUT="$(bash scripts/verify-pipeline.sh --all 2>&1)" || FAIL=1
  echo "$OUT" | tail -n 8
fi

[ "$FAIL" -eq 0 ] && echo "verify-task: PASS" || echo "verify-task: FAIL"
exit "$FAIL"
