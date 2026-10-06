#!/usr/bin/env bash
# Test for scripts/review-code.sh with a fake opencode in a throwaway git repo (no model call). Usage: bash scripts/test-review-code.sh
set -uo pipefail
S="$(cd "$(git rev-parse --show-toplevel)" && pwd)/scripts"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/repo"
cat > "$T/bin/opencode" <<'FAKE'
#!/usr/bin/env bash
# fake `opencode run`: records its args, prints a finding. Settings are files next to this one (the script runs it
# with env -i): "silent" (print nothing), "peek" (print a Read line for that path), "called" is touched on every run.
D="$(dirname "$0")"
[ "$1" = session ] && exit 0
touch "$D/called"; printf '%s\n' "$@" > "$D/args"
[ -e "$D/silent" ] && exit 0
[ -e "$D/peek" ] && echo "→ Read $(cat "$D/peek")"
echo "F1 a.txt:2 off by one"
FAKE
chmod +x "$T/bin/opencode"; export PATH="$T/bin:$PATH"
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }
has() { if grep -q -- "$1" "$2"; then echo "ok   $3"; else echo "FAIL $3"; fail=1; fi; }
hasnt() { if grep -q -- "$1" "$2"; then echo "FAIL $3"; fail=1; else echo "ok   $3"; fi; }

cd "$T/repo" && git init -q && git config user.email t@t && git config user.name t && git checkout -q -b master
echo "EARLIER-TASK-LINE" > early.txt; git add -A; git commit -qm early
BASE="$(git rev-parse --short HEAD)"
printf 'one\ntwo\n' > a.txt; git add -A; git commit -qm work
TASKF="docs/work/t.md"; mkdir -p docs/work
printf '# Task: t\nWritten against: %s\n\n## Review\nSECRET-ANSWER\n\n## Acceptance checks\n- Run: x / Expected: y\n\n## Report\nBUILDER-NOTES\n' "$BASE" > "$TASKF"
args="$T/bin/args"; run() { bash "$S/review-code.sh" "$@" 2>&1; }

OUT="$(run $TASKF)"; ok "$?" "0" "non-empty diff: exit 0"
echo "$OUT" | grep -q "F1 a.txt" && { echo "FAIL findings printed without --show"; fail=1; } || echo "ok   findings not printed without --show"
run $TASKF --show | grep -q "F1 a.txt" && echo "ok   --show prints findings" || { echo "FAIL --show"; fail=1; }
has "docs/work/runs/t.code-diff.patch" "$args" "prompt names the diff file"
has "docs/work/runs/t.code-brief.md" "$args" "prompt names the brief file"
hasnt "docs/work/t.md" "$args" "prompt does not name the task file"
has "Never open any .env" "$args" "prompt forbids .env files"
has "a.txt" docs/work/runs/t.code-diff.patch "diff holds this task's change"
hasnt "EARLIER-TASK-LINE" docs/work/runs/t.code-diff.patch "diff base is the Written against commit, not master"
has "Run: x" docs/work/runs/t.code-brief.md "brief copy holds Acceptance checks"
hasnt "SECRET-ANSWER\|BUILDER-NOTES" docs/work/runs/t.code-brief.md "brief copy holds no Review or Report text"

rm -f "$T/bin/called"; git commit -q --allow-empty -m none; printf '# T\nWritten against: %s\n\n## Acceptance checks\n- x\n' "$(git rev-parse --short HEAD)" > docs/work/e.md
run docs/work/e.md >/dev/null; ok "$?" "2" "empty diff: exit 2"
[ ! -e "$T/bin/called" ] && echo "ok   empty diff: model not called" || { echo "FAIL model called on empty diff"; fail=1; }

REVIEW_MAX_LINES=3 run $TASKF >/dev/null; ok "$?" "2" "diff over the cap: exit 2"
[ ! -e "$T/bin/called" ] && echo "ok   over cap: model not called" || { echo "FAIL model called over cap"; fail=1; }

REVIEW_MODEL=opencode-go/some-model-free run $TASKF >/dev/null; ok "$?" "2" "free-tier model refused"
REVIEW_MODEL=openai/gpt run $TASKF >/dev/null; ok "$?" "2" "non opencode-go model refused"

echo docs/work/t.md > "$T/bin/peek"; OUT="$(run $TASKF)"; ok "$?" "1" "reviewer that reads the task file: exit 1"
echo "$OUT" | grep -q "NOT BLIND" && echo "ok   says NOT BLIND" || { echo "FAIL not-blind message"; fail=1; }
echo docs/work/runs/t.log > "$T/bin/peek"; run $TASKF >/dev/null; ok "$?" "1" "reviewer that reads the builder log: exit 1"
rm -f "$T/bin/peek"

touch "$T/bin/silent"; run $TASKF >/dev/null; ok "$?" "3" "silent model: exit 3"; rm -f "$T/bin/silent"
run docs/work/missing.md >/dev/null; ok "$?" "2" "no task file: exit 2"
printf '# T\nWritten against: %s\n\n## Steps\n- x\n' "$BASE" > docs/work/n.md; run docs/work/n.md >/dev/null; ok "$?" "2" "no Acceptance checks: exit 2"
[ "$fail" -eq 0 ] && echo "test-review-code: PASS" || { echo "test-review-code: FAIL"; exit 1; }
