#!/usr/bin/env bash
# A cheap model compacts a task file; this script checks the result and restores the original if it is wrong.
# Usage: scripts/compact-task.sh <task-file>   Then Claude reads `git diff` and commits (or `git checkout`s) it.
# Exit:  0 compacted and checked | 1 refused (file restored) | 2 model did not answer (file untouched)
# Env:   COMPACT_MODEL (default deepseek-v4.1-flash), COMPACT_CMD (test stub; replaces the model call)
set -uo pipefail
TASK="${1:?usage: scripts/compact-task.sh <task-file>}"
[ -f "$TASK" ] || { echo "no such file: $TASK"; exit 1; }
MODEL="${COMPACT_MODEL:-opencode-go/deepseek-v4.1-flash}"
case "$MODEL" in *free*) echo "refusing free-tier model: $MODEL"; exit 1 ;; esac
case "$MODEL" in opencode-go/*) ;; *) echo "compact: model must be an opencode-go/ id, got: $MODEL"; exit 1 ;; esac
BAK="$(mktemp)"; trap 'rm -f "$BAK"' EXIT; cp "$TASK" "$BAK"
SAVE="$(git rev-parse --git-dir 2>/dev/null)/compact-last.md"; cp "$TASK" "$SAVE" 2>/dev/null   # undo copy, outside the repo files
export TASK_FILE="$TASK"

if [ -n "${COMPACT_CMD:-}" ]; then eval "$COMPACT_CMD"; RC=0
else
  PROMPT="Edit only $TASK. Compact it to about 60 lines: fold finished checklist steps into one-line Done entries, delete text that is no longer true or contradicts Next. Keep the title, every '## ' heading, and the Status, Branch, Template, Written against and Next lines word for word. Do not add anything new. Edit nothing else."
  LOG="$(mktemp)"
  env -i HOME="$HOME" PATH="$PATH" USER="${USER:-}" TERM=dumb LANG="${LANG:-en_US.UTF-8}" \
    OPENCODE_DISABLE_CLAUDE_CODE=1 OPENCODE_DISABLE_AUTOUPDATE=1 OPENCODE_DISABLE_LSP_DOWNLOAD=1 \
    bash scripts/oc-run.sh "$LOG" 300 -- --agent builder -m "$MODEL" --title "compact: $(basename "$TASK" .md)" "$PROMPT"
  RC=$?; rm -f "$LOG"
fi
[ "$RC" -eq 0 ] || { cp "$BAK" "$TASK"; echo "compact: model failed (exit $RC), file untouched"; exit 2; }

bad=""
[ -s "$TASK" ] || bad="file is empty"
for key in '# Task:' 'Status:' 'Branch:' 'Template:' 'Written against:' 'Next:'; do
  [ "$(grep -m1 "^$key" "$BAK")" = "$(grep -m1 "^$key" "$TASK")" ] || bad="$bad; '$key' line changed"
done
[ "$(grep '^## ' "$BAK")" = "$(grep '^## ' "$TASK")" ] || bad="$bad; a '## ' heading was added, removed or renamed"
[ "$(wc -l < "$TASK")" -le "$(wc -l < "$BAK")" ] || bad="$bad; file got longer"
if [ -n "$bad" ]; then cp "$BAK" "$TASK"; echo "compact: REFUSED (${bad#; }); original restored"; exit 1; fi
echo "compact: ok $(wc -l < "$BAK") -> $(wc -l < "$TASK") lines. Read 'git diff $TASK' before committing; 'cp $SAVE $TASK' undoes it."
