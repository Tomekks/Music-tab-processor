#!/usr/bin/env bash
# The builder's "run the checks" step: app verify always, plus the pipeline tests / Control Centre verify when
# files there changed since the task's "Written against" commit (committed or not).
# Prints only the footers (what ran with counts, what did not) and exits non-zero on any failure.
# Usage: scripts/verify-task.sh   (no arguments, so it can be allowed as one exact command)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
FAIL=0

BRANCH="$(git branch --show-current)"
TASK="$(grep -lx "Branch:[[:space:]]*$BRANCH" docs/work/*.md 2>/dev/null | head -1)"
BASE=""
[ -n "$TASK" ] && BASE="$(sed -n 's/^Written against:[[:space:]]*//p' "$TASK" | head -1 | grep -oE '[0-9a-f]{7,40}' | head -1)"
if [ -n "$BASE" ] && git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null; then
  CHANGED="$( { git diff --no-renames --name-only "$BASE"; git ls-files --others --exclude-standard; } | sort -u)"
else
  CHANGED="$(git status --porcelain | cut -c4-)"
fi

if [ -f app/package.json ]; then
  OUT="$(cd app && npm run verify --silent 2>&1)" || FAIL=1
  echo "$OUT" | tail -n 15
fi

if echo "$CHANGED" | grep -q '^pipeline/'; then
  echo "--- pipeline"
  OUT="$(bash scripts/verify-pipeline.sh --all 2>&1)" || FAIL=1
  echo "$OUT" | tail -n 8
fi

if echo "$CHANGED" | grep -q '^tools/Control_Centre/'; then
  echo "--- control centre"
  OUT="$(npm --prefix tools/Control_Centre run verify --silent 2>&1)" || FAIL=1
  echo "$OUT" | tail -n 8
fi

if echo "$CHANGED" | grep -q '^tools/Design_System/'; then
  echo "--- design system workbench"
  OUT="$(npm --prefix tools/Design_System run verify --silent 2>&1)" || FAIL=1
  echo "$OUT" | tail -n 8
fi

# Browser-test reminder: UI an e2e area watches changed without a spec change (a note, never a failure).
printf '%s\n' "$CHANGED" | bash scripts/e2e-revisit.sh

# The task's deliverables must exist: every `Modify only` path is present on disk.
if [ -n "$TASK" ]; then
  # shellcheck disable=SC2016  # the backticks are literal: paths are written `like this`
  for p in $(awk 'tolower($0) ~ /modify only/ {f=1; next} f && tolower($0) ~ /do not touch|^#/ {exit} f' "$TASK" | grep -oE '`[^`]+`' | tr -d '`'); do
    [ -e "$p" ] || { echo "verify-task: MISSING deliverable: $p (listed under Modify only in $TASK)"; FAIL=1; }
  done
fi

[ "$FAIL" -eq 0 ] && echo "verify-task: PASS" || echo "verify-task: FAIL"
exit "$FAIL"
