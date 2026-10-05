#!/usr/bin/env bash
# Test for scripts/run-e2e.sh. Usage: bash scripts/test-run-e2e.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }
PORT=58123
OUT="$(E2E_PORTS=$PORT E2E_CMD='echo "  2 passed (1s)"' bash scripts/run-e2e.sh 2>&1)"; ok "$?" 0 "passing command exits 0"
echo "$OUT" | grep -q "PASS (workbench) 2 passed" && echo "ok   PASS line shows the count" || { echo "FAIL PASS line: $OUT"; fail=1; }
OUT="$(E2E_PORTS=$PORT E2E_CMD='printf "  1 failed\n    1) spec one\n  1 passed\n"; exit 1' bash scripts/run-e2e.sh 2>&1)"; ok "$?" 1 "failing command exits 1"
echo "$OUT" | grep -q "1) spec one" && echo "ok   FAIL lists the failing spec" || { echo "FAIL list: $OUT"; fail=1; }
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 & SRV=$!; sleep 1
OUT="$(E2E_PORTS=$PORT E2E_CMD='echo should-not-run' bash scripts/run-e2e.sh 2>&1)"; ok "$?" 2 "a taken port exits 2"
echo "$OUT" | grep -q "NOT RUN, port $PORT" && echo "ok   says which port" || { echo "FAIL port msg: $OUT"; fail=1; }
kill $SRV 2>/dev/null
OUT="$(E2E_PORTS=$PORT E2E_CMD='python3 -m http.server '$PORT' --bind 127.0.0.1 >/dev/null 2>&1 & sleep 1' bash scripts/run-e2e.sh 2>&1)"
echo "$OUT" | grep -q "stopped a leftover server" && echo "ok   a leftover server is stopped" || { echo "FAIL leftover: $OUT"; fail=1; }
ok "$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null | wc -l | tr -d ' ')" 0 "nothing listens afterwards"
OUT="$(bash scripts/run-e2e.sh nope 2>&1)"; ok "$?" 2 "unknown area exits 2"
exit $fail
