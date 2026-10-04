#!/usr/bin/env bash
# Test for scripts/measure.sh (fake opencode, temp log). Usage: bash scripts/test-measure.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export MEASURE_LOG="$T/measure.tsv"
mkdir -p "$T/bin"
cat > "$T/bin/opencode" <<'FAKE'
#!/usr/bin/env bash
cat <<OUT
last 365 days · all projects

MODELS
model                                 tokens       steps        cost
opencode-go/muse-spark-1.3-contri…    $(cat "$FAKE_TOK" 2>/dev/null || echo 100k)          36       \$0.01
opencode-go/deepseek-v4.1-flash#d…      3.1k           1       \$0.00
OUT
FAKE
chmod +x "$T/bin/opencode"
export PATH="$T/bin:$PATH" FAKE_TOK="$T/tok"
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }

echo 100k > "$T/tok"
ok "$(bash scripts/measure.sh snapshot)" "103100 0.01" "snapshot sums tokens (k suffix) and cost over models"
bash scripts/measure.sh mark docs/work/demo-task.md brief-written "note one" >/dev/null
ok "$(sed -n 2p "$MEASURE_LOG" | cut -f3,4,5,7)" "$(printf 'demo-task\tbrief-written\t103100\tnote one')" "mark appends task, event, tokens, note"
echo 1.2M > "$T/tok"
sleep 1
bash scripts/measure.sh mark demo-task build-done >/dev/null
REPORT="$(bash scripts/measure.sh report demo-task)"
printf '%s\n' "$REPORT" | grep -q "build-done.*+1100000 tok" && echo "ok   report shows token delta between marks" || { echo "FAIL report token delta: $REPORT"; fail=1; }
printf '%s\n' "$REPORT" | grep -qE "build-done +[1-9][0-9]*s" && echo "ok   report shows elapsed seconds" || { echo "FAIL report elapsed: $REPORT"; fail=1; }
PATH="/usr/bin:/bin" bash scripts/measure.sh mark demo-task no-opencode >/dev/null
ok "$(tail -1 "$MEASURE_LOG" | cut -f5)" "na" "missing opencode records na, never fails"
exit $fail
