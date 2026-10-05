#!/usr/bin/env bash
# Test: /start lists active tasks in other worktrees. Usage: bash scripts/test-start-worktrees.sh
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"; cd "$ROOT" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
fail=0
git init -q "$T/main" && cd "$T/main" && git config user.email t@t && git config user.name t
mkdir -p docs/work scripts && cp "$ROOT/scripts/start.sh" scripts/ && touch a && git add -A && git commit -qm init
git worktree add -q -b feat/x "$T/wt" && mkdir -p "$T/wt/docs/work"
printf '# Task: x\n\nStatus: active\nBranch: feat/x\nNext: finish x\n' > "$T/wt/docs/work/x.md"
OUT="$(IDEAS_FILE="$T/ideas.md" bash scripts/start.sh "" 2>&1)"
echo "$OUT" | grep -q "active in other worktrees" && echo "$OUT" | grep -q "x.md" && echo "$OUT" | grep -q "finish x" && echo "ok   lists another worktree's active task with its Next" || { echo "FAIL other worktree: $OUT"; fail=1; }
sed -i '' 's/Status: active/Status: done/' "$T/wt/docs/work/x.md"
OUT="$(IDEAS_FILE="$T/ideas.md" bash scripts/start.sh "" 2>&1)"
echo "$OUT" | grep -q "other worktrees" && { echo "FAIL a done task is listed"; fail=1; } || echo "ok   a done task is not listed"
exit $fail
