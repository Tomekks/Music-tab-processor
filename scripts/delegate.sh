#!/usr/bin/env bash
# The one command Claude runs to hand a task to the builder model. Prints a short summary (about 10 lines).
# Usage: scripts/delegate.sh <task-file>      (run it inside the task's worktree, on its branch)
# Env:   BUILDER_MODEL (default muse); everything run-builder.sh accepts.
# Exit:  0 built and checked | 1 built but failed a check | 2 stopped before the model ran | 3 model down
# A model switch is never automatic: on 3, ask the owner, then re-run with BUILDER_MODEL set.
set -uo pipefail
TASK="${1:?usage: scripts/delegate.sh <task-file>}"
cd "$(git rev-parse --show-toplevel)" || exit 1
FALLBACK="opencode-go/deepseek-v4.1-flash"
MODEL="${BUILDER_MODEL:-opencode-go/muse-spark-1.3-contributor}"
START="$(git rev-parse HEAD)"
LOG="docs/work/runs/$(basename "$TASK" .md).log"

run() { OUT="$(BUILDER_MODEL="$MODEL" bash scripts/run-builder.sh "$TASK" 2>&1)"; }
down() { printf '%s\n' "$OUT" | grep -qE 'NO RESPONSE|STALLED|TIMEOUT|empty log'; }

run
if down; then echo "delegate: $MODEL did not answer, retrying once"; run; fi
if down; then
  echo "delegate: MODEL DOWN: $MODEL did not answer twice. Nothing was changed by the builder."
  [ "$MODEL" = "$FALLBACK" ] || echo "delegate: recommend $FALLBACK. Ask the owner, then re-run: BUILDER_MODEL=$FALLBACK scripts/delegate.sh $TASK"
  exit 3
fi

if printf '%s\n' "$OUT" | grep -qE '^run-builder: (stopped|DRIFT|never|task says|.Modify only|builder model|refusing)|no such file'; then
  echo "delegate: STOPPED BEFORE THE MODEL RAN (pre-flight):"
  printf '%s\n' "$OUT" | grep -E '^run-builder:|^check-brief|^  ' | head -8
  exit 2
fi
if printf '%s\n' "$OUT" | grep -q 'WARNING a free-tier model'; then
  echo "delegate: WARNING a free-tier model answered. Stop and tell the owner."; exit 1
fi

# Facts, checked here rather than taken from the builder's own report.
FAIL=0; REASON=""
if [ "$(git rev-parse HEAD)" = "$START" ]; then FAIL=1; REASON="no commit made (builder did not finish)"; fi
SCOPE="$(bash scripts/check-scope.sh "$TASK" 2>&1)" || { FAIL=1; REASON="${REASON:+$REASON; }out of scope"; }
VERIFY="$(bash scripts/verify-task.sh 2>&1)" || { FAIL=1; REASON="${REASON:+$REASON; }verify failed"; }

echo "delegate: $([ "$FAIL" -eq 0 ] && echo PASS || echo "FAIL ($REASON)")  model: $MODEL"
echo "scope:    $(printf '%s\n' "$SCOPE" | head -3 | tr '\n' ' ')"
echo "verify:   $(printf '%s\n' "$VERIFY" | tail -1)"
git diff --stat "$START" HEAD 2>/dev/null | tail -6
echo "log:      $LOG   (failures only: tail -40 $LOG)"
exit "$FAIL"
