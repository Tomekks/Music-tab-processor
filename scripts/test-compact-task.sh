#!/usr/bin/env bash
# Test for scripts/compact-task.sh (uses a stub instead of a model). Usage: bash scripts/test-compact-task.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }
mk() { { printf '# Task: t\n\nStatus: active\nBranch: b\nNext: do x\nWritten against: abc1234\n\n## Scope\n'; for i in $(seq 1 "$1"); do echo "line $i"; done; printf '\n## Report\n'; } > "$T/t.md"; }

mk 100; cp "$T/t.md" "$T/orig.md"
COMPACT_CMD='sed -i.bak "/^line [5-9][0-9]$/d" "$TASK_FILE"; rm -f "$TASK_FILE.bak"' bash scripts/compact-task.sh "$T/t.md" >/dev/null 2>&1
ok "$?" 0 "good compaction accepted"; ok "$([ "$(wc -l < "$T/t.md")" -lt 100 ] && echo short)" short "file got shorter"

cp "$T/orig.md" "$T/t.md"
COMPACT_CMD='sed -i.bak "s/^Next: .*/Next: changed/" "$TASK_FILE"; rm -f "$TASK_FILE.bak"' bash scripts/compact-task.sh "$T/t.md" >/dev/null 2>&1
ok "$?" 1 "changed Next line refused"; ok "$(cmp -s "$T/t.md" "$T/orig.md" && echo same)" same "refused run restores the file"

cp "$T/orig.md" "$T/t.md"
COMPACT_CMD='sed -i.bak "/^## Report/d" "$TASK_FILE"; rm -f "$TASK_FILE.bak"' bash scripts/compact-task.sh "$T/t.md" >/dev/null 2>&1
ok "$?" 1 "dropped heading refused"; ok "$(cmp -s "$T/t.md" "$T/orig.md" && echo same)" same "dropped-heading run restores the file"

cp "$T/orig.md" "$T/t.md"
COMPACT_CMD=': > "$TASK_FILE"' bash scripts/compact-task.sh "$T/t.md" >/dev/null 2>&1
ok "$?" 1 "emptied file refused"; ok "$(cmp -s "$T/t.md" "$T/orig.md" && echo same)" same "emptied run restores the file"
exit $fail
