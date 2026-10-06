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
# rules freshness: a rules change after "Written against" is flagged; none is silent
mkdir -p AGENTS_DIR; echo r1 > AGENTS.md; mkdir -p docs/rules; git add -A >/dev/null; git commit -qm "rules" ; W="$(git rev-parse --short HEAD)"
printf '# Task: t\n\nStatus: active\nBranch: main\nNext: n\nWritten against: %s\n' "$W" > docs/work/t.md; git add -A >/dev/null; git commit -qm task
git branch -m main 2>/dev/null
OUT="$(IDEAS_FILE="$T/ideas.md" bash scripts/start.sh "" 2>&1)"
echo "$OUT" | grep -q "^rules:" && { echo "FAIL rules line shown with no rules change"; fail=1; } || echo "ok   no rules line when rules are unchanged"
echo r2 > AGENTS.md; git commit -qam "change rules"
OUT="$(IDEAS_FILE="$T/ideas.md" bash scripts/start.sh "" 2>&1)"
echo "$OUT" | grep -q "^rules:   1 commit" && echo "ok   rules line when AGENTS.md changed after the task" || { echo "FAIL rules line: $OUT"; fail=1; }
# pending plans: a plan's "**Next task:**" line is shown under it
git checkout -q -b scratch; git rm -q docs/work/t.md; git commit -qm "drop task"
mkdir -p docs/plans/p1; printf '# P\n\n**Status (2026-10-05):** live\n\n**Next task:** 1g Save/Discard (brief in save-ui)\n' > docs/plans/p1/p1.md; git add -A >/dev/null; git commit -qm plan
OUT="$(IDEAS_FILE="$T/ideas.md" bash scripts/start.sh "" 2>&1)"
echo "$OUT" | grep -q "next task: 1g Save/Discard" && echo "ok   pending plan shows its Next task" || { echo "FAIL next task: $OUT"; fail=1; }
exit $fail
