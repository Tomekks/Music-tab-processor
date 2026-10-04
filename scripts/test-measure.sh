#!/usr/bin/env bash
# Test for scripts/measure.sh (fake opencode, temp log). Usage: bash scripts/test-measure.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export MEASURE_LOG="$T/measure.tsv"
mkdir -p "$T/bin"
cat > "$T/bin/opencode" <<'FAKE'
#!/usr/bin/env bash
# fake `opencode stats --all --json`: input tokens come from $FAKE_TOK
cat <<OUT
{"tokens":{"input":$(cat "$FAKE_TOK" 2>/dev/null || echo 1000),"output":100,"reasoning":10,"cache":{"read":99999,"write":5}},"cost":0.01}
OUT
FAKE
chmod +x "$T/bin/opencode"
export PATH="$T/bin:$PATH" FAKE_TOK="$T/tok"
fail=0; ok() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: expected [$2] got [$1]"; fail=1; fi; }

echo 1000 > "$T/tok"
ok "$(bash scripts/measure.sh snapshot)" "1115 0.01" "snapshot = input + output + reasoning + cache write (cache reads excluded), and cost"
bash scripts/measure.sh mark docs/work/demo-task.md brief-written "note one" >/dev/null
ok "$(sed -n 2p "$MEASURE_LOG" | cut -f3,4,5,7)" "$(printf 'demo-task\tbrief-written\t1115\tnote one')" "mark appends task, event, tokens, note"
echo 1001000 > "$T/tok"
sleep 1
bash scripts/measure.sh mark demo-task build-done >/dev/null
REPORT="$(bash scripts/measure.sh report demo-task)"
printf '%s\n' "$REPORT" | grep -q "build-done.*+1000000 tok" && echo "ok   report shows token delta between marks" || { echo "FAIL report token delta: $REPORT"; fail=1; }
printf '%s\n' "$REPORT" | grep -qE "build-done +[1-9][0-9]*s" && echo "ok   report shows elapsed seconds" || { echo "FAIL report elapsed: $REPORT"; fail=1; }
PATH="/usr/bin:/bin" bash scripts/measure.sh mark demo-task no-opencode >/dev/null
ok "$(tail -1 "$MEASURE_LOG" | cut -f5)" "na" "missing opencode records na, never fails"
# --- claude-usage.py: counts each message once, windows are (from, to], days group by local day
mkdir -p "$T/tx/sub"
mk() { printf '{"timestamp":"%s","message":{"id":"%s","usage":{"output_tokens":%s,"cache_creation_input_tokens":%s,"cache_read_input_tokens":%s,"input_tokens":1}}}\n' "$1" "$2" "$3" "$4" "$5"; }
{ mk 2026-10-01T10:00:00Z m1 100 10 1000; mk 2026-10-01T10:00:01Z m1 100 10 1000; mk 2026-10-01T11:00:00Z m2 50 5 500; } > "$T/tx/a.jsonl"
mk 2026-10-01T11:00:02Z m3 7 1 10 > "$T/tx/sub/b.jsonl"
export CLAUDE_TRANSCRIPTS="$T/tx"
E0=$(python3 -c "from datetime import datetime;print(datetime.fromisoformat('2026-10-01T09:00:00+00:00').timestamp())")
E1=$(python3 -c "from datetime import datetime;print(datetime.fromisoformat('2026-10-01T10:30:00+00:00').timestamp())")
E2=$(python3 -c "from datetime import datetime;print(datetime.fromisoformat('2026-10-01T12:00:00+00:00').timestamp())")
W="$(python3 scripts/claude-usage.py windows "$E0" "$E1" "$E2")"
printf '%s\n' "$W" | sed -n 1p | grep -q "1 msgs  out       100" && echo "ok   usage: duplicate message counted once" || { echo "FAIL usage window 1: $W"; fail=1; }
printf '%s\n' "$W" | sed -n 2p | grep -q "2 msgs  out        57" && echo "ok   usage: second window sums two messages incl. subfolder" || { echo "FAIL usage window 2: $W"; fail=1; }
python3 scripts/claude-usage.py days | grep -q "3 msgs  out       157" && echo "ok   usage: days totals" || { echo "FAIL usage days"; fail=1; }
# report shows Claude tokens per interval (marks written with known epochs)
printf 'iso\tepoch\ttask\tevent\topencode_tokens\topencode_cost_usd\tnote\n2026-10-01T10:00:00\t%s\tdemo\tstart\t100\t0.01\t\n2026-10-01T12:00:00\t%s\tdemo\tend\t200\t0.02\t\n' "${E0%.*}" "${E2%.*}" > "$MEASURE_LOG"
bash scripts/measure.sh report demo | grep -q "claude .*3 msgs  out       157" && echo "ok   report: claude tokens between marks" || { echo "FAIL report claude column"; bash scripts/measure.sh report demo; fail=1; }
bash scripts/measure.sh history | grep -q "3 msgs" && echo "ok   history prints per-day line" || { echo "FAIL history"; fail=1; }
unset CLAUDE_TRANSCRIPTS
exit $fail
