#!/usr/bin/env bash
# Checks a task file/brief has every required part. Checks form, not content.
# Usage: scripts/check-brief.sh <task-file>
# Required headings (names match docs/work/TEMPLATE.md): see REQUIRED below.
set -uo pipefail
F="${1:?usage: scripts/check-brief.sh <task-file>}"
[ -f "$F" ] || { echo "no such file: $F"; exit 1; }
FAIL=0

# heading text (matched case-insensitively at the start of a line, after any #/** marks)
REQUIRED=("Status:" "Written against" "Modify only" "Do NOT touch" "Size" "Risk" "Acceptance checks" "Questions" "Next:")
for h in "${REQUIRED[@]}"; do
  grep -qiE "^[#*[:space:]-]*$h" "$F" || { echo "MISSING: $h"; FAIL=1; }
done

# Written against: a commit hash (7+ hex chars) on that line.
grep -iE "^[#*[:space:]-]*Written against" "$F" | grep -qE '[0-9a-f]{7,}' \
  || { echo "BAD: 'Written against' has no commit hash"; FAIL=1; }

# Modify only: at least one path listed in the lines that follow.
awk 'BEGIN{IGNORECASE=1} /^[#*[:space:]-]*Modify only/{f=1;next} f&&/^[#*[:space:]-]*(Do NOT touch|Size|Risk|Acceptance)/{exit} f&&/[`\/.]/{n++} END{exit n>0?0:1}' "$F" \
  || { echo "BAD: 'Modify only' lists no paths"; FAIL=1; }

# Acceptance checks: each item needs a command and an expected result (`cmd` ... →/expect).
n="$(awk 'BEGIN{IGNORECASE=1} /^[#*[:space:]-]*Acceptance checks/{f=1;next} f&&/^#/{exit} f&&/^[[:space:]]*[-*0-9]/{print}' "$F")"
[ -n "$n" ] || { echo "BAD: no acceptance check items"; FAIL=1; }
echo "$n" | grep -vE '`.+`.*(→|->|expect|should|prints|exit)' | grep -q . \
  && { echo "BAD: acceptance item(s) without a \`command\` and an expected result:"; echo "$n" | grep -vE '`.+`.*(→|->|expect|should|prints|exit)'; FAIL=1; }

[ "$FAIL" -eq 0 ] && echo "check-brief: OK" || echo "check-brief: FAIL"
exit "$FAIL"
