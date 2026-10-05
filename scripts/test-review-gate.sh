#!/usr/bin/env bash
# Test for scripts/check-review.sh. Usage: bash scripts/test-review-gate.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }
rev() { printf '## Review\n'; for i in $(seq 1 "$1"); do printf '%s. answer with evidence\n' "$i"; done; }
mk() { printf '# Task: t\n\n## Risk\nReview level: %s.\n\n' "$1" > "$2"; }

mk 1 "$T/l1.md";                              ok "$(bash scripts/check-review.sh "$T/l1.md" >/dev/null; echo $?)" 0 "level 1 task needs no review section"
mk 2 "$T/l2none.md";                          ok "$(bash scripts/check-review.sh "$T/l2none.md" >/dev/null; echo $?)" 1 "level 2 without a Review section is refused"
mk 2 "$T/l2few.md"; rev 7 >> "$T/l2few.md";   ok "$(bash scripts/check-review.sh "$T/l2few.md" >/dev/null; echo $?)" 1 "level 2 with 7 answers is refused"
mk 2 "$T/l2ok.md";  rev 8 >> "$T/l2ok.md";    ok "$(bash scripts/check-review.sh "$T/l2ok.md" >/dev/null; echo $?)" 0 "level 2 with 8 answers passes"
mk 2 "$T/l2tpl.md"; printf '## Review\n(Level 2: answer each question)\n' >> "$T/l2tpl.md"
ok "$(bash scripts/check-review.sh "$T/l2tpl.md" >/dev/null; echo $?)" 1 "the template's placeholder line is not an answer"
exit $fail
