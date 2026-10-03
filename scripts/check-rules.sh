#!/usr/bin/env bash
# Checks the lean rule files against the rule ledger and the size caps.
#  1. every KEEP/MERGE ledger id is claimed in docs/rules/covers.txt or listed in ledger/exempt.md
#  2. AGENTS.md <= 80 lines, each docs/rules/*.md <= 70 lines
# Exit 0 = clean. Read-only, no model.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
L=docs/work/ledger
FAIL=0

# Final verdict per id: overrides.psv wins over verdicts-rules-final.psv.
need="$(cat "$L/verdicts-rules-final.psv" "$L/overrides.psv" | awk -F'|' '{v[$1]=$2} END{for(k in v) if(v[k]=="KEEP"||v[k]=="MERGE") print k}' | sort -u)"
covered="$(grep -v '^#' docs/rules/covers.txt | grep -o 'R[0-9][0-9]*' | sort -u)"
exempt="$(grep -E '^(R[0-9]+ *)+$' "$L/exempt.md" | grep -o 'R[0-9][0-9]*' | sort -u)"

missing="$(comm -23 <(echo "$need") <(printf '%s\n%s\n' "$covered" "$exempt" | sort -u))"
unknown="$(comm -13 <(cut -d'|' -f1 "$L/verdicts-rules-final.psv" | sort -u) <(echo "$covered"))"

echo "rules: $(echo "$need" | wc -l | tr -d ' ') to cover, $(echo "$covered" | wc -l | tr -d ' ') claimed, $(echo "$exempt" | wc -l | tr -d ' ') exempt"
if [ -n "$missing" ]; then echo "UNCLAIMED: ${missing//$'\n'/ }"; FAIL=1; fi
if [ -n "$unknown" ]; then echo "UNKNOWN ids in covers.txt: ${unknown//$'\n'/ }"; FAIL=1; fi

check_cap() { # file cap
  n="$(wc -l < "$1" | tr -d ' ')"
  if [ "$n" -gt "$2" ]; then echo "TOO LONG: $1 is $n lines (cap $2)"; FAIL=1; fi
}
check_cap AGENTS.md 80
for f in docs/rules/*.md; do check_cap "$f" 70; done

[ "$FAIL" -eq 0 ] && echo "check-rules: OK" || echo "check-rules: FAIL"
exit "$FAIL"
