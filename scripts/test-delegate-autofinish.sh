#!/usr/bin/env bash
# Test: delegate.sh runs finish.sh itself when the builder edited files but never committed (for example an API crash at
# the very end) and scope and verify pass; it does not when the builder changed nothing but the task file.
# Throwaway repo, fake opencode, no model call. Usage: bash scripts/test-delegate-autofinish.sh
set -uo pipefail
SRC="$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"
printf '#!/usr/bin/env bash\n[ "$1" = run ] || exit 0\necho fake\n[ -e "%s/edit-flag" ] && echo more >> allowed.txt\nexit 0\n' "$T" > "$T/bin/opencode"; chmod +x "$T/bin/opencode"
export PATH="$T/bin:$PATH"
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }
R="$T/repo"; mkdir -p "$R/docs/work"; cp -R "$SRC/scripts" "$R/scripts"; cp -R "$SRC/.opencode" "$R/.opencode"; cd "$R" || exit 1
git init -q -b feat/x && git config user.email t@t && git config user.name t
echo a > allowed.txt; echo "docs/work/runs/" > .gitignore
printf '# Task: t\n\nStatus: active\nBranch: feat/x\nNext: n\nWritten against: BASEHASH\n\n## Scope\n**Modify only:**\n- `allowed.txt`\n\n**Do NOT touch:**\n- the rest\n\n## Size\nFiles touched: 1.\n\n## Risk\nnone\n\n## Acceptance checks\n- Run: `bash scripts/verify-task.sh` / Expected: PASS\n\n## Questions\n(none open)\n\n## Report\n' > docs/work/t.md
git add -A && git commit -qm base && B="$(git rev-parse --short HEAD)"; sed -i '' "s/BASEHASH/$B/" docs/work/t.md; git commit -qam task; B="$(git rev-parse --short HEAD)"; sed -i '' "s/^Written against: .*/Written against: $B/" docs/work/t.md; git commit -qam task2

START="$(git rev-parse HEAD)"
touch "$T/edit-flag"; OUT="$(bash scripts/delegate.sh docs/work/t.md 2>&1)"
echo "$OUT" | grep -q "AUTO-FINISH" && echo "ok   says it auto-finished" || { echo "FAIL no AUTO-FINISH line: $OUT"; fail=1; }
[ "$(git rev-parse HEAD)" != "$START" ] && echo "ok   a checkpoint commit exists" || { echo "FAIL no commit made"; fail=1; }
ok "$(git show --stat --format= HEAD | grep -c allowed.txt)" 1 "the commit holds the edited file"
echo "$OUT" | grep -q "no: builder did not finish" && echo "ok   scorecard row is not a first-try yes" || { echo "FAIL row: $OUT"; fail=1; }

START="$(git rev-parse HEAD)"
rm -f "$T/edit-flag"; OUT="$(bash scripts/delegate.sh docs/work/t.md 2>&1)"
echo "$OUT" | grep -q "AUTO-FINISH" && { echo "FAIL auto-finish ran with nothing built: $OUT"; fail=1; } || echo "ok   no auto-finish when nothing but the task file changed"
ok "$(git rev-parse HEAD)" "$START" "no commit when nothing was built"
exit $fail
