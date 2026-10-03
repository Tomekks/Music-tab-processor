#!/usr/bin/env bash
# Checks a task file has the required parts. Checks form, not content.
# Usage: scripts/check-brief.sh <task-file>
# Unfilled <<placeholders>> from TEMPLATE.md / TEMPLATE-quick.md fail the check.
# Heading names match what scripts/start.sh reads (Status/Branch/Next/## Questions).
set -uo pipefail
F="${1:?usage: scripts/check-brief.sh <task-file>}"
[ -f "$F" ] || { echo "no such file: $F"; exit 1; }
FAIL=0
bad() { echo "$1"; FAIL=1; }

# "Template: quick" (docs/work/TEMPLATE-quick.md) has no Size/Risk sections; the full template needs both.
HEADS=(Status: Branch: Next: "Written against" "Modify only" "Do NOT touch" "Acceptance checks" Questions)
grep -qix "Template:[[:space:]]*quick" "$F" && HEADS+=(Rules) || HEADS+=(Size Risk)
for h in "${HEADS[@]}"; do
  grep -qiE "^[#*[:space:]-]*$h" "$F" || bad "MISSING: $h"
done

grep -iE "^[#*[:space:]-]*Written against" "$F" | grep -qE '[0-9a-f]{7,}' || bad "BAD: 'Written against' has no commit hash"

# Modify only: at least one non-empty list item before the next heading/label.
awk 'tolower($0) ~ /modify only/ {f=1; next} f && tolower($0) ~ /do not touch|^#/ {exit} f && /^[[:space:]]*[-*].*[A-Za-z]/ {n++} END{exit n>0?0:1}' "$F" \
  || bad "BAD: 'Modify only' lists no paths"

grep -qE '^[[:space:]]*[-*0-9].*`' <(awk 'tolower($0) ~ /acceptance checks/ {f=1; next} f && /^#/ {exit} f' "$F") \
  || bad "BAD: 'Acceptance checks' has no item with a \`command\`"

# Unfilled template placeholders look like <<this>>.
if grep -q '<<[^>]*>>' "$F"; then bad "UNFILLED placeholders:"; grep -n '<<[^>]*>>' "$F" | head -5; fi

[ "$FAIL" -eq 0 ] && echo "check-brief: OK" || echo "check-brief: FAIL"
exit "$FAIL"
