#!/usr/bin/env bash
# Test for scripts/e2e-revisit.sh. Usage: bash scripts/test-e2e-revisit.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
printf '%s\n' '# comment' 'demo | src/ui lib/x.ts | e2e/demo | npm run e2e' > "$T/areas.txt"
export E2E_AREAS_FILE="$T/areas.txt"
fail=0; has() { if echo "$1" | grep -q "$2"; then echo "ok   $3"; else echo "FAIL $3: [$1]"; fail=1; fi; }
lacks() { if echo "$1" | grep -q "$2"; then echo "FAIL $3: [$1]"; fail=1; else echo "ok   $3"; fi; }
OUT="$(printf 'src/ui/a.svelte\n' | bash scripts/e2e-revisit.sh)"; has "$OUT" "NOTE demo UI changed" "UI change without a spec warns"
OUT="$(printf 'src/ui/a.svelte\ne2e/demo/a.spec.ts\n' | bash scripts/e2e-revisit.sh)"; has "$OUT" "specs changed with the UI" "UI plus spec change says run them"; lacks "$OUT" NOTE "no warning when a spec changed"
OUT="$(printf 'docs/x.md\n' | bash scripts/e2e-revisit.sh)"; ok="$OUT"; [ -z "$ok" ] && echo "ok   unrelated change prints nothing" || { echo "FAIL unrelated: [$OUT]"; fail=1; }
OUT="$(printf 'src/ui/a.test.ts\n' | bash scripts/e2e-revisit.sh)"; [ -z "$OUT" ] && echo "ok   a unit test alone does not trigger" || { echo "FAIL unit test: [$OUT]"; fail=1; }
printf 'x\n' | E2E_AREAS_FILE="$T/missing" bash scripts/e2e-revisit.sh; [ "$?" -eq 0 ] && echo "ok   missing areas file exits 0" || { echo "FAIL missing file"; fail=1; }
exit "$fail"
