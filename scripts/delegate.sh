#!/usr/bin/env bash
# The one command Claude runs to hand a task to the builder model. Prints a short summary (about 10 lines).
# Usage: scripts/delegate.sh <task-file> [--critique]   (run it inside the task's worktree, on its branch)
#   --critique: the builder reads the brief cold and writes at most 5 questions (or "clear") under ## Questions.
#               Nothing is built or committed. One round: Claude amends, then runs without the flag.
# Env:   BUILDER_MODEL (default muse); everything run-builder.sh accepts.
# Exit:  0 built and checked | 1 built but failed a check, or the builder did not finish and auto-finish committed it | 2 stopped before the model ran (incl. a failing scope pre-flight) | 3 model down
# A model switch is never automatic: on 3, ask the owner, then re-run with BUILDER_MODEL set.
set -uo pipefail
TASK="${1:?usage: scripts/delegate.sh <task-file> [--critique]}"
CRITIQUE=0; [ "${2:-}" = "--critique" ] && CRITIQUE=1
cd "$(git rev-parse --show-toplevel)" || exit 1
FALLBACK="opencode-go/deepseek-v4.1-flash#high"
MODEL="${BUILDER_MODEL:-opencode-go/muse-spark-1.3-contributor#high}"
START="$(git rev-parse HEAD)"
[ "$CRITIQUE" -eq 1 ] || bash scripts/check-review.sh "$TASK" || exit 2   # Level 2 tasks need their review first
# A stale "Written against" makes finish.sh refuse after the build (every later commit counts as out of scope): catch it now.
[ "$CRITIQUE" -eq 1 ] || bash scripts/check-scope.sh "$TASK" >/dev/null 2>&1 || { echo "delegate: scope check fails BEFORE the build: 'Written against' is probably stale (or files are already changed). Set it to $(git rev-parse --short HEAD), commit, re-run. Detail: bash scripts/check-scope.sh $TASK"; exit 2; }
T0="$(date +%s)"
bash scripts/measure.sh mark "$TASK" delegate-start >/dev/null 2>&1 || true
trap 'bash scripts/measure.sh mark "$TASK" delegate-end "exit $?" >/dev/null 2>&1 || true' EXIT
LOG="docs/work/runs/$(basename "$TASK" .md).log"

run() { OUT="$(BUILDER_MODEL="$MODEL" BUILDER_MODE="$([ "$CRITIQUE" -eq 1 ] && echo critique)" bash scripts/run-builder.sh "$TASK" 2>&1)"; }
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
  printf '%s\n' "$OUT" | grep -v '^run-builder: .* on .*timeout' | head -8
  exit 2
fi
if printf '%s\n' "$OUT" | grep -q 'WARNING a free-tier model'; then
  echo "delegate: WARNING a free-tier model answered. Stop and tell the owner."; exit 1
fi

if [ "$CRITIQUE" -eq 1 ]; then
  echo "delegate: CRITIQUE by $MODEL (nothing built). Questions it wrote:"
  sed -n '/^## Questions/,/^## /p' "$TASK" | sed '1d;$d' | grep -v '^$' | head -8
  git status --short | grep -v "^.. ${TASK}$" | sed 's/^/  UNEXPECTED CHANGE: /'
  exit 0
fi

# Facts, checked here rather than taken from the builder's own report.
FAIL=0; REASON=""
NOCOMMIT=0; [ "$(git rev-parse HEAD)" = "$START" ] && NOCOMMIT=1
SCOPE="$(bash scripts/check-scope.sh "$TASK" 2>&1)"; SOK=$?
VERIFY="$(bash scripts/verify-task.sh 2>&1)"; VOK=$?
# The builder edited files but never committed (history: an API crash at the very end, after the code passed). If scope and
# verify pass and something besides the task file changed, run finish.sh here. The run still counts as "not first try".
BUILT="$(git status --short | grep -v "^.. ${TASK}$" | grep -c . || true)"
if [ "$NOCOMMIT" -eq 1 ] && [ "$SOK" -eq 0 ] && [ "$VOK" -eq 0 ] && [ "${BUILT:-0}" -gt 0 ]; then
  if FIN="$(bash scripts/finish.sh "$TASK" 2>&1)"; then
    echo "delegate: AUTO-FINISH: the builder did not commit (crash or stop); scope and verify passed, so finish.sh ran. Read the diff and write the Report."
    NOCOMMIT=0; FAIL=1; REASON="builder did not finish; auto-finish committed it"
  else
    echo "delegate: auto-finish tried and failed:"; printf '%s\n' "$FIN" | tail -5
  fi
fi
if [ "$NOCOMMIT" -eq 1 ]; then FAIL=1; REASON="no commit made (builder did not finish)"; fi
[ "$SOK" -eq 0 ] || { FAIL=1; REASON="${REASON:+$REASON; }out of scope"; }
[ "$VOK" -eq 0 ] || { FAIL=1; REASON="${REASON:+$REASON; }verify failed"; }

echo "delegate: $([ "$FAIL" -eq 0 ] && echo PASS || echo "FAIL ($REASON)")  model: $MODEL"
echo "scope:    $(printf '%s\n' "$SCOPE" | head -3 | tr '\n' ' ')"
echo "verify:   $(printf '%s\n' "$VERIFY" | tail -1)"
git diff --stat "$START" HEAD 2>/dev/null | tail -6
echo "log:      $LOG   (failures only: tail -40 $LOG)"
# One ready scorecard row; Claude appends it at merge time (docs/work/scorecard.md lives outside the task's scope).
# Tokens come from this run's own opencode session (parallel runs share the machine-wide totals, so a snapshot delta would mix them).
case "$MODEL" in *'#'*) VARIANT="${MODEL#*#}" ;; *) VARIANT=default ;; esac
read -r TOK1 COST1 <<< "$(bash scripts/measure.sh session "$TASK" "$T0" "$VARIANT")"
if [ "$TOK1" != na ]; then USED="${TOK1} tok, \$${COST1}, $(( $(date +%s) - T0 ))s"; else USED="$(( $(date +%s) - T0 ))s (tokens n/a)"; fi
echo "row:      | $(date +%F) | $(sed -n 's/^# Task:[[:space:]]*//p' "$TASK" | head -1) | ${MODEL#opencode-go/} | $([ "$FAIL" -eq 0 ] && echo yes || echo "no: $REASON") |  |  | ${USED} |  |"
exit "$FAIL"
