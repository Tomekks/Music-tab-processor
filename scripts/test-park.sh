#!/usr/bin/env bash
# Test for scripts/park.sh and the Ideas lines in scripts/start.sh. Usage: bash scripts/test-park.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export IDEAS_FILE="$T/ideas.md"
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }

bash scripts/park.sh "first idea" >/dev/null; ok "$(grep -c '^- ' "$IDEAS_FILE")" 1 "park appends one line"
ok "$(sed -n 2p "$IDEAS_FILE" | grep -cE '^- [0-9]{4}-[0-9]{2}-[0-9]{2} first idea$')" 1 "line is dated and holds the text"
bash scripts/park.sh "second" "idea with args" >/dev/null; ok "$(tail -1 "$IDEAS_FILE" | grep -c 'second idea with args')" 1 "several words are joined"
bash scripts/park.sh "multi
line" >/dev/null; ok "$(grep -c '^- ' "$IDEAS_FILE")" 3 "a newline never splits one idea into two lines"
bash scripts/park.sh "   " >/dev/null 2>&1; ok "$?" 1 "empty idea is refused"
ok "$(grep -c '^- ' "$IDEAS_FILE")" 3 "refused idea writes nothing"

# /start: no active task lists the ideas, an active task shows only the count
mkdir "$T/work"
OUT="$(START_WORK_DIR="$T/work" bash scripts/start.sh "" 2>&1)"
echo "$OUT" | grep -q "ideas (3 parked" && echo "ok   start lists ideas when no task is active" || { echo "FAIL start ideas header: $OUT"; fail=1; }
echo "$OUT" | grep -q "first idea" && echo "ok   start shows the idea text" || { echo "FAIL start idea text"; fail=1; }
printf '# Task: t\n\nStatus: active\nBranch: %s\nNext: n\n' "$(git branch --show-current)" > "$T/work/t.md"
OUT="$(START_WORK_DIR="$T/work" bash scripts/start.sh "" 2>&1)"
echo "$OUT" | grep -q "ideas:   3 parked" && echo "ok   start shows only a count when a task is active" || { echo "FAIL start count: $OUT"; fail=1; }
echo "$OUT" | grep -q "first idea" && { echo "FAIL idea text shown during an active task"; fail=1; } || echo "ok   idea text hidden during an active task"
rm "$IDEAS_FILE"; OUT="$(START_WORK_DIR="$T/empty" bash scripts/start.sh "" 2>&1)"
echo "$OUT" | grep -q "ideas" && { echo "FAIL ideas line shown with no ideas"; fail=1; } || echo "ok   no ideas line when none are parked"
[ "$fail" -eq 0 ] && echo "test-park: PASS" || { echo "test-park: FAIL"; exit 1; }
