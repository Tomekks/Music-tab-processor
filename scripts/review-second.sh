#!/usr/bin/env bash
# Second, blind reviewer for /review: a cheap model answers the same questions on a copy of the brief that has no
# "## Review" section, read-only. Claude answers its own questions BEFORE opening the saved answer, then compares both.
# Usage: scripts/review-second.sh <task-file> [--show]
#   Level 1 task: questions 1, 4, 6 (max 5 bullets). Level 2: all eight. Level 0: nothing to do.
#   Prints only where the answer was saved (not its content) and whether the run was blind; --show prints the answer.
# Env:   REVIEW_MODEL (default opencode-go/muse-spark-1.3-contributor#high; paid opencode-go/ ids only, never -free).
# Exit:  0 saved | 1 not blind or no answer | 2 refused before the model ran | 3 model did not answer
set -uo pipefail
TASK="${1:?usage: scripts/review-second.sh <task-file> [--show]}"; SHOW="${2:-}"
cd "$(git rev-parse --show-toplevel)" || exit 2
[ -f "$TASK" ] || { echo "review-second: no such task file: $TASK"; exit 2; }
MODEL="${REVIEW_MODEL:-opencode-go/muse-spark-1.3-contributor#high}"
case "$MODEL" in opencode-go/*-free|opencode-go/*-free#*) echo "review-second: free-tier model refused: $MODEL"; exit 2 ;; opencode-go/*) ;; *) echo "review-second: model must be an opencode-go/ id, got: $MODEL"; exit 2 ;; esac

LEVEL="$(grep -oE 'Review level:[[:space:]]*[0-9]' "$TASK" | head -1 | grep -oE '[0-9]$')"
case "$LEVEL" in
  0) echo "review-second: Level 0, nothing to review."; exit 0 ;;
  1) QS="questions 1, 4 and 6, at most 5 bullets in total" ;;
  2) QS="all eight questions, one line each" ;;
  *) echo "review-second: no 'Review level: 0|1|2' in $TASK"; exit 2 ;;
esac

NAME="$(basename "$TASK" .md)"
mkdir -p docs/work/runs
BLIND="docs/work/runs/$NAME.review-brief.md"; LOG="docs/work/runs/$NAME.review2.log"
awk '/^## Review/{skip=1; next} /^## /{skip=0} !skip' "$TASK" > "$BLIND"

PROMPT="You are a read-only reviewer. Do not edit or create any file. Read docs/rules/review.md and the task brief $BLIND. Do not open any other file under docs/work/. Answer ONLY $QS of review.md for this brief, each ending in evidence (a file:line in the repo, or a command you ran and its output). Check every claim about existing code against the live files before writing sound. Flag only correctness or requirement gaps, never redesign. Print the answers as your final message."

T0="$(date +%s)"
env -i HOME="$HOME" PATH="$PATH" USER="${USER:-}" TERM=dumb LANG="${LANG:-en_US.UTF-8}" \
  OPENCODE_DISABLE_CLAUDE_CODE=1 OPENCODE_DISABLE_AUTOUPDATE=1 \
  bash scripts/oc-run.sh "$LOG" "${REVIEW_TIMEOUT:-300}" -- --agent plan -m "$MODEL" --title "review: $NAME" "$PROMPT"
RC=$?
sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g' "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
case "$RC" in
  0) ;;
  124|125|126|127) echo "review-second: $MODEL did not answer (code $RC). Nothing saved. Retry later or set REVIEW_MODEL."; exit 3 ;;
  *) echo "review-second: opencode failed (code $RC), see $LOG"; exit 3 ;;
esac

STATUS=0
# Blind = it never opened the real task file (its Review section holds Claude's answers). The blind copy is
# $NAME.review-brief.md, so the pattern below does not match it.
if grep -qE "(Read|cat) .*[/ ]$NAME\.md" "$LOG"; then
  echo "review-second: NOT BLIND. The reviewer opened $TASK, which may hold other answers. Treat the comparison with care."; STATUS=1
else
  echo "review-second: blind (the reviewer did not open $TASK)."
fi
read -r TOK COST <<< "$(MEASURE_TITLE_PREFIX=review bash scripts/measure.sh session "$NAME" "$T0" default 2>/dev/null)"
echo "review-second: Level $LEVEL answer by ${MODEL#opencode-go/} saved to $LOG ($(( $(date +%s) - T0 ))s, ${TOK:-na} tok). Write your own answers first; open the log only after."
[ "$SHOW" = --show ] && cat "$LOG"
exit "$STATUS"
