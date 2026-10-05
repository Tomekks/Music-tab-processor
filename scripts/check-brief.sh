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

# Modify only paths the builder may not edit (.opencode/agents/builder.md "edit:" rules; the LAST matching rule wins).
ROOT="$(git rev-parse --show-toplevel)"
RULES="$(awk '/^  edit:/{f=1;next} f && /^  [a-z]+:/{exit} f && /^    "/ {print}' "$ROOT/.opencode/agents/builder.md" | sed -E 's/^    "([^"]*)": *([a-z]+).*/\2 \1/')"
# shellcheck disable=SC2016  # the backticks are literal: paths are written `like this`
for p in $(awk 'tolower($0) ~ /modify only/ {f=1; next} f && tolower($0) ~ /do not touch|^#/ {exit} f' "$F" | grep -oE '`[^`]+`' | tr -d '`'); do
  # A name with no folder is read by verify-task as a file at the repo root. Write the full path, or keep the name out of backticks.
  [[ "$p" == */* ]] || [ -e "$ROOT/$p" ] || { bad "BAD: '$p' under Modify only is not a full path from the repo root (verify-task would report it missing); write the folder or drop the backticks"; continue; }
  verdict=""; hit=""
  while read -r v pat; do
    # shellcheck disable=SC2053  # $pat is a glob on purpose
    [[ "$p" == $pat ]] && { verdict="$v"; hit="$pat"; }
  done <<< "$RULES"
  [ "$verdict" = deny ] && bad "BLOCKED for the builder: $p matches the deny rule '$hit' in .opencode/agents/builder.md (Claude writes it, or move it out of Modify only)"
done

# Unfilled template placeholders look like <<this>>.
if grep -q '<<[^>]*>>' "$F"; then bad "UNFILLED placeholders:"; grep -n '<<[^>]*>>' "$F" | head -5; fi

[ "$FAIL" -eq 0 ] && echo "check-brief: OK" || echo "check-brief: FAIL"
exit "$FAIL"
