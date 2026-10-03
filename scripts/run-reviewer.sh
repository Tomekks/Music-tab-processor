#!/usr/bin/env bash
# Runs the read-only reviewer model on a task file (and its diff, if the work has been built).
# Usage: scripts/run-reviewer.sh <task-file> [note for the reviewer]
# Env:   REVIEWER_MODEL (default deepseek-v4.1-flash, no-training), REVIEWER_TIMEOUT seconds (default 600)
set -uo pipefail
TASK="${1:?usage: scripts/run-reviewer.sh <task-file> [note]}"
NOTE="${2:-}"
cd "$(git rev-parse --show-toplevel)" || exit 1
[ -f "$TASK" ] || { echo "no such file: $TASK"; exit 1; }

MODEL="${REVIEWER_MODEL:-opencode-go/deepseek-v4.1-flash}"
TIMEOUT="${REVIEWER_TIMEOUT:-600}"
case "$MODEL" in *free*) echo "refusing free-tier model: $MODEL"; exit 1 ;; esac
case "$MODEL" in opencode-go/*) ;; *) echo "reviewer model must be an opencode-go/ id, got: $MODEL"; exit 1 ;; esac

BASE="$(sed -n 's/^Written against:[[:space:]]*//p' "$TASK" | head -1 | grep -oE '[0-9a-f]{7,40}' | head -1)"
BEFORE="$(git status --porcelain; git rev-parse HEAD)"

export OPENCODE_DISABLE_CLAUDE_CODE=1 OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_LSP_DOWNLOAD=1
LOG="$(mktemp -d)/reviewer.log"
PROMPT="Review the task file $TASK. If work has been built, the changes since the task was written are shown by: git diff ${BASE:-HEAD} (and git diff --stat ${BASE:-HEAD})."
[ -z "$NOTE" ] || PROMPT="$PROMPT Note from the owner: $NOTE"

echo "run-reviewer: $MODEL on $TASK (timeout ${TIMEOUT}s, log $LOG)"
perl -e 'alarm shift; exec @ARGV' "$TIMEOUT" opencode run --standalone --agent reviewer -m "$MODEL" \
  --title "review: $(basename "$TASK" .md)" "$PROMPT" > "$LOG" 2>&1
RC=$?

[ "$RC" -ne 142 ] || echo "run-reviewer: TIMEOUT after ${TIMEOUT}s (stuck, or the model is not responding)."
[ -s "$LOG" ] || echo "run-reviewer: no output at all, the model may be unavailable right now."
if grep -qiE '^> [^ ]+ · .*free' "$LOG"; then echo "run-reviewer: WARNING a free-tier model answered. Stop and tell the owner."; fi
[ "$BEFORE" = "$(git status --porcelain; git rev-parse HEAD)" ] || echo "run-reviewer: WARNING the working tree or HEAD changed during a read-only review"
echo "--- review"; grep -vE '^\s*$' "$LOG" | grep -vE '^(\x1b\[[0-9;]*m)?> reviewer' | tail -60
