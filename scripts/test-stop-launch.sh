#!/usr/bin/env bash
# Tests for scripts/stop-launch-check.sh: launch command without lsof+kill blocks; with both, or none, passes.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
FAIL=0
mk() { # name, assistant text -> transcript path
  python3 - "$T/$1.jsonl" "$2" <<'PY'
import json, sys
open(sys.argv[1], "w").write(
    json.dumps({"type": "user", "message": {"content": "go"}}) + "\n" +
    json.dumps({"type": "assistant", "message": {"content": [{"type": "text", "text": sys.argv[2]}]}}) + "\n")
PY
}
run() { printf '{"transcript_path":"%s"%s}' "$T/$1.jsonl" "${2:-}" | bash scripts/stop-launch-check.sh 2>/dev/null; echo $?; }
check() { [ "$2" = "$3" ] && echo "ok   $1" || { echo "FAIL $1 (got $3, want $2)"; FAIL=1; }; }

mk bad 'Run:
```bash
cd app && npm run dev -- -p 3000
```'
check "launch without stop blocks" 2 "$(run bad)"
check "retry turn is let through" 0 "$(run bad ',"stop_hook_active":true')"

mk good 'Run:
```bash
lsof -i :3000
```
```bash
npm --prefix tools/Design_System run dev
```
```bash
kill $(lsof -ti :3000)
```'
check "launch with lsof and kill passes" 0 "$(run good)"

mk none 'No server here. `npm run dev` is mentioned inline only.
```bash
git status
```'
check "no launch in a code block passes" 0 "$(run none)"
check "missing transcript passes" 0 "$(printf '{"transcript_path":"/nope"}' | bash scripts/stop-launch-check.sh 2>/dev/null; echo $?)"

[ "$FAIL" = 0 ] && echo "test-stop-launch: PASS" || { echo "test-stop-launch: FAIL"; exit 1; }
