#!/usr/bin/env bash
# Blind code reviewer: a cheap model reads the branch diff and the brief's acceptance checks (no builder log), read-only.
# Claude reads the same diff and writes its bullets BEFORE opening the saved findings, then compares both.
# Usage: scripts/review-code.sh <task-file> [--show]   Diff base = the task's "Written against:" commit (master if missing).
#   Prints only where the findings were saved and whether the run was blind; --show prints them.
# Env:   REVIEW_MODEL (default opencode-go/deepseek-v4.1-flash#high, backup opencode-go/muse-spark-1.3-contributor#high; paid opencode-go/ ids only, never -free), REVIEW_MAX_LINES (default 3000).
# Exit:  0 saved | 1 not blind or no answer | 2 refused before the model ran | 3 model did not answer
# Copied from scripts/review-second.sh (keep in step): model gate, env -i + oc-run.sh call, ANSI strip, rc case, blind grep, measure line.
set -uo pipefail
TASK="${1:?usage: scripts/review-code.sh <task-file> [--show]}"; SHOW="${2:-}"
SD="$(cd "$(dirname "$0")" && pwd)"
cd "$(git rev-parse --show-toplevel)" || exit 2
[ -f "$TASK" ] || { echo "review-code: no such task file: $TASK"; exit 2; }
MODEL="${REVIEW_MODEL:-opencode-go/deepseek-v4.1-flash#high}"
case "$MODEL" in opencode-go/*-free|opencode-go/*-free#*) echo "review-code: free-tier model refused: $MODEL"; exit 2 ;; opencode-go/*) ;; *) echo "review-code: model must be an opencode-go/ id, got: $MODEL"; exit 2 ;; esac

NAME="$(basename "$TASK" .md)"
mkdir -p docs/work/runs
PATCH="docs/work/runs/$NAME.code-diff.patch"; BRIEF="docs/work/runs/$NAME.code-brief.md"; LOG="docs/work/runs/$NAME.code-review.log"
awk '/^## Acceptance checks/{p=1} p&&/^## /&&!/^## Acceptance checks/{p=0} p' "$TASK" > "$BRIEF"
[ -s "$BRIEF" ] || { echo "review-code: no '## Acceptance checks' section in $TASK"; exit 2; }

BASE="$(sed -n 's/^Written against:[[:space:]]*\([0-9a-fA-F]\{7,40\}\).*/\1/p' "$TASK" | head -1)"; BASE="${BASE:-master}"
git rev-parse --verify -q "$BASE^{commit}" >/dev/null || { echo "review-code: diff base $BASE is not a commit here"; exit 2; }
git diff "$BASE...HEAD" -- . ':(exclude)docs/work/runs' ':(exclude)package-lock.json' ':(exclude)pnpm-lock.yaml' ':(exclude)yarn.lock' > "$PATCH"
N="$(wc -l < "$PATCH" | tr -d ' ')"
[ "$N" -gt 0 ] || { echo "review-code: empty diff against $BASE, nothing to review."; exit 2; }
[ "$N" -le "${REVIEW_MAX_LINES:-3000}" ] || { echo "review-code: diff is $N lines (cap ${REVIEW_MAX_LINES:-3000}). Split the task or skip the review."; exit 2; }
[ -z "$(git status --porcelain -- . ':(exclude)docs/work/runs')" ] || echo "review-code: WARNING uncommitted changes are not in the diff."

PROMPT="You are a read-only code reviewer. Do not edit or create any file. Read the diff $PATCH (changes since $BASE) and the acceptance checks $BRIEF, then read the repo files the diff touches. Never open any .env* file. Do not open anything under docs/work/ except those two files, and no *.log file. Flag ONLY real bugs or gaps against the acceptance checks, each as file:line plus a one-line failing case (input or state, wrong result). No redesign, no style notes. If you find nothing, answer one line: sound. At most 8 findings. Print them as your final message."

T0="$(date +%s)"
env -i HOME="$HOME" PATH="$PATH" USER="${USER:-}" TERM=dumb LANG="${LANG:-en_US.UTF-8}" \
  OPENCODE_DISABLE_CLAUDE_CODE=1 OPENCODE_DISABLE_AUTOUPDATE=1 \
  bash "$SD/oc-run.sh" "$LOG" "${REVIEW_TIMEOUT:-300}" -- --agent plan -m "$MODEL" --title "code-review: $NAME" "$PROMPT"
RC=$?
sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g' "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
case "$RC" in
  0) ;;
  124|125|126|127) echo "review-code: $MODEL did not answer (code $RC). Nothing saved. Retry later or set REVIEW_MODEL."; exit 3 ;;
  *) echo "review-code: opencode failed (code $RC), see $LOG"; exit 3 ;;
esac
[ -s "$LOG" ] || { echo "review-code: empty answer, see $LOG"; exit 3; }

STATUS=0
# Blind = it never opened the real task file or the builder log ($NAME.log). Its own inputs are $NAME.code-*, which do not match.
if grep -qE "(Read|cat) .*[/ ]$NAME\.(md|log)" "$LOG"; then
  echo "review-code: NOT BLIND. The reviewer opened $TASK or the builder log. Treat the comparison with care."; STATUS=1
else
  echo "review-code: blind (the reviewer did not open $TASK or the builder log)."
fi
VARIANT=default; case "$MODEL" in *#*) VARIANT="$VARIANT" ;; esac   # measure.sh matches the session's model variant
read -r TOK COST <<< "$(MEASURE_TITLE_PREFIX=code-review bash "$SD/measure.sh" session "$NAME" "$T0" "$VARIANT" 2>/dev/null)"
echo "review-code: findings by ${MODEL#opencode-go/} saved to $LOG ($(( $(date +%s) - T0 ))s, ${TOK:-na} tok). Write your own bullets first; open the log only after."
[ "$SHOW" = --show ] && cat "$LOG"
exit "$STATUS"
