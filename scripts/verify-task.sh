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

# The task's deliverables must exist: every `Modify only` path is present on disk.
BRANCH="$(git branch --show-current)"
TASK="$(grep -lx "Branch:[[:space:]]*$BRANCH" docs/work/*.md 2>/dev/null | head -1)"
if [ -n "$TASK" ]; then
  # shellcheck disable=SC2016  # the backticks are literal: paths are written `like this`
  for p in $(awk 'tolower($0) ~ /modify only/ {f=1; next} f && tolower($0) ~ /do not touch|^#/ {exit} f' "$TASK" | grep -oE '`[^`]+`' | tr -d '`'); do
    [ -e "$p" ] || { echo "verify-task: MISSING deliverable: $p (listed under Modify only in $TASK)"; FAIL=1; }
  done
fi

[ "$FAIL" -eq 0 ] && echo "verify-task: PASS" || echo "verify-task: FAIL"
exit "$FAIL"
