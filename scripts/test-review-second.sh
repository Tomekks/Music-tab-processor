#!/usr/bin/env bash
# Test for scripts/review-second.sh with a fake opencode (no model call). Usage: bash scripts/test-review-second.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; mkdir -p docs/work/runs
trap 'rm -rf "$T" docs/work/runs/rs-test-*' EXIT
mkdir -p "$T/bin"
cat > "$T/bin/opencode" <<'FAKE'
#!/usr/bin/env bash
# fake `opencode run`: records its args, prints a reviewer answer. The script under test runs it with env -i, so
# settings come from files next to this one: "silent" (print nothing) and "peek" (print a Read line for that path).
D="$(dirname "$0")"
[ "$1" = session ] && exit 0
printf '%s\n' "$@" > "$D/args"
[ -e "$D/silent" ] && exit 0
[ -e "$D/peek" ] && echo "→ Read $(cat "$D/peek")"
echo "Q1 sound (file:1)"
FAKE
chmod +x "$T/bin/opencode"
export PATH="$T/bin:$PATH"; FAKE_ARGS="$T/bin/args"
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }
mk() { printf '# Task: t\n\n## Risk\nReview level: %s\n\n## Review\nSECRET-ANSWER line\n\n## Steps\n- step one\n' "$2" > "docs/work/runs/rs-test-$1.md"; }

mk l1 1; OUT="$(bash scripts/review-second.sh docs/work/runs/rs-test-l1.md 2>&1)"; RC=$?
ok "$RC" "0" "level 1 run exits 0"
echo "$OUT" | grep -q "blind (the reviewer did not open" && echo "ok   reports blind" || { echo "FAIL blind message: $OUT"; fail=1; }
grep -q "questions 1, 4 and 6" "$FAKE_ARGS" && echo "ok   level 1 asks questions 1, 4, 6" || { echo "FAIL level 1 prompt"; fail=1; }
grep -q "SECRET-ANSWER" docs/work/runs/rs-test-l1.review-brief.md && { echo "FAIL blind copy still holds the Review section"; fail=1; } || echo "ok   blind copy has no Review section"
grep -q "step one" docs/work/runs/rs-test-l1.review-brief.md && echo "ok   blind copy keeps the other sections" || { echo "FAIL blind copy lost Steps"; fail=1; }
echo "$OUT" | grep -q "Q1 sound" && { echo "FAIL answer content printed without --show"; fail=1; } || echo "ok   answer not printed without --show"
bash scripts/review-second.sh docs/work/runs/rs-test-l1.md --show 2>&1 | grep -q "Q1 sound" && echo "ok   --show prints the answer" || { echo "FAIL --show"; fail=1; }

mk l2 2; bash scripts/review-second.sh docs/work/runs/rs-test-l2.md >/dev/null 2>&1
grep -q "all eight questions" "$FAKE_ARGS" && echo "ok   level 2 asks all eight" || { echo "FAIL level 2 prompt"; fail=1; }

mk l0 0; OUT="$(bash scripts/review-second.sh docs/work/runs/rs-test-l0.md 2>&1)"; ok "$?" "0" "level 0 exits 0"
[ ! -e docs/work/runs/rs-test-l0.review2.log ] && echo "ok   level 0 calls no model" || { echo "FAIL level 0 made a log"; fail=1; }

mk peek 1; echo docs/work/runs/rs-test-peek.md > "$T/bin/peek"; bash scripts/review-second.sh docs/work/runs/rs-test-peek.md >"$T/o" 2>&1; ok "$?" "1" "reviewer that opens the real task file: exit 1"
grep -q "NOT BLIND" "$T/o" && echo "ok   says NOT BLIND" || { echo "FAIL not-blind message"; fail=1; }

rm -f "$T/bin/peek"; touch "$T/bin/silent"; mk silent 1; bash scripts/review-second.sh docs/work/runs/rs-test-silent.md >/dev/null 2>&1; ok "$?" "3" "empty answer: exit 3"; rm -f "$T/bin/silent"
mk free 1; REVIEW_MODEL=opencode-go/some-model-free bash scripts/review-second.sh docs/work/runs/rs-test-free.md >/dev/null 2>&1; ok "$?" "2" "free-tier model refused"
REVIEW_MODEL=openai/gpt bash scripts/review-second.sh docs/work/runs/rs-test-free.md >/dev/null 2>&1; ok "$?" "2" "non opencode-go model refused"
printf '# Task: x\n' > docs/work/runs/rs-test-nolevel.md; bash scripts/review-second.sh docs/work/runs/rs-test-nolevel.md >/dev/null 2>&1; ok "$?" "2" "task without a Review level refused"
[ "$fail" -eq 0 ] && echo "test-review-second: PASS" || { echo "test-review-second: FAIL"; exit 1; }
