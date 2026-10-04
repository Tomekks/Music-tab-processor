#!/usr/bin/env bash
# Gate for Level 2 tasks (docs/rules/review.md): the task file must hold one answer line per question
# under "## Review" before the builder may start. delegate.sh calls this. Exit 0 = fine, 1 = refused.
# Usage: scripts/check-review.sh <task-file>
set -uo pipefail
TASK="${1:?usage: scripts/check-review.sh <task-file>}"
grep -qiE 'Review level:[[:space:]]*2' "$TASK" || exit 0
N="$(awk '/^## Review/{f=1;next} /^## /{f=0} f && NF && $0 !~ /^\(/' "$TASK" | wc -l | tr -d ' ')"
if [ "$N" -lt 8 ]; then
  echo "check-review: REFUSED. Level 2 task needs 8 answers under '## Review' (docs/rules/review.md), found $N. Run /review first."
  exit 1
fi
exit 0
