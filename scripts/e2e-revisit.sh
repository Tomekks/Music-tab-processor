#!/usr/bin/env bash
# Reminds when a task changed UI code that an e2e area watches but touched none of that area's specs.
# Prints a NOTE per area and always exits 0 (a reminder, not a gate). Areas: docs/rules/e2e-areas.txt.
# Usage: printf '%s\n' <changed files> | bash scripts/e2e-revisit.sh      (env E2E_AREAS_FILE overrides the list)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 0
AREAS="${E2E_AREAS_FILE:-docs/rules/e2e-areas.txt}"
[ -f "$AREAS" ] || exit 0
CHANGED="$(cat)"
while IFS='|' read -r name watched specs cmd; do
  case "$name" in ''|'#'*) continue ;; esac
  name="$(echo "$name" | xargs)"; specs="$(echo "$specs" | xargs)"; cmd="$(echo "$cmd" | sed 's/^ *//; s/ *$//')"
  hit=""
  for w in $watched; do
    hit="$hit$(printf '%s\n' "$CHANGED" | grep -E "^$w" | grep -vE '\.test\.(ts|mjs)$' | head -3)"$'\n'
  done
  hit="$(printf '%s' "$hit" | sed '/^$/d' | sort -u | head -3)"
  [ -z "$hit" ] && continue
  if printf '%s\n' "$CHANGED" | grep -qE "^$specs/"; then
    echo "e2e-revisit: $name specs changed with the UI; run them: $cmd"
  else
    echo "e2e-revisit: NOTE $name UI changed ($(echo "$hit" | tr '\n' ' ')) but no spec in $specs did. Add or update specs, or say in the Report why not. Run: $cmd"
  fi
done < "$AREAS"
exit 0
