#!/usr/bin/env bash
# Test for the scope pre-flight in scripts/delegate.sh (throwaway repo, fake opencode, no model call).
# Usage: bash scripts/test-delegate-preflight.sh
set -uo pipefail
SRC="$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"
printf '#!/usr/bin/env bash\n[ "$1" = run ] && touch "%s/model-called"\necho fake\n' "$T" > "$T/bin/opencode"; chmod +x "$T/bin/opencode"
export PATH="$T/bin:$PATH"
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }

R="$T/repo"; mkdir -p "$R/docs/work"; cp -R "$SRC/scripts" "$R/scripts"; cp -R "$SRC/.opencode" "$R/.opencode"; cd "$R" || exit 1
git init -q -b feat/x && git config user.email t@t && git config user.name t
echo a > allowed.txt; echo b > other.txt
task() { printf '# Task: t\n\nStatus: active\nBranch: feat/x\nNext: n\nWritten against: %s\n\n## Scope\n**Modify only:**\n- `allowed.txt`\n\n**Do NOT touch:**\n- the rest\n\n## Size\nFiles touched: 1.\n\n## Risk\nReview level: 0.\n\n## Acceptance checks\n- Run: `true` / Expected: nothing\n\n## Questions\n(none open)\n' "$1" > docs/work/t.md; }
git add -A && git commit -qm base && BASE="$(git rev-parse --short HEAD)"
echo c >> other.txt && git commit -qam "later commit outside the task's files"

task "$BASE"; git add -A && git commit -qm "task written against the old commit"
OUT="$(bash scripts/delegate.sh docs/work/t.md 2>&1)"; RC=$?
ok "$RC" "2" "stale Written against: delegate stops with exit 2"
echo "$OUT" | grep -q "scope check fails BEFORE the build" && echo "ok   says why and how to fix" || { echo "FAIL message: $OUT"; fail=1; }
echo "$OUT" | grep -q "Written against" && echo "ok   names Written against" || { echo "FAIL hint: $OUT"; fail=1; }
[ ! -e "$T/model-called" ] && echo "ok   model not called" || { echo "FAIL model was called"; fail=1; }

task "$(git rev-parse --short HEAD)"; git add -A && git commit -qm "task refreshed"; task "$(git rev-parse --short HEAD)"
OUT="$(bash scripts/delegate.sh docs/work/t.md 2>&1)"
echo "$OUT" | grep -q "scope check fails BEFORE the build" && { echo "FAIL fresh Written against was refused: $OUT"; fail=1; } || echo "ok   fresh Written against is not refused by the pre-flight"
exit $fail
