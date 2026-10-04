#!/usr/bin/env bash
# Records time and builder tokens at workflow steps, so the process can be compared with the old one.
# Usage: scripts/measure.sh mark <task file or name> <event> [note]   append one row (time + opencode tokens)
#        scripts/measure.sh report <task name>                        seconds and tokens between marks
#        scripts/measure.sh history [N]                               Claude tokens per day (last N days), from the session transcripts
#        scripts/measure.sh snapshot                                  print "<tokens> <cost>" summed over opencode models
# Log: <git common dir>/measure.tsv, shared by all worktrees and never shown as a change (override with MEASURE_LOG). Claude's own usage can't be read from a script:
# add it as the note, e.g. mark <task> claude "5h=20 weekly=31 ctx=332741" (from get_usage).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
LOG="${MEASURE_LOG:-$(cd "$(git rev-parse --git-common-dir)" && pwd)/measure.tsv}"

# Lifetime totals from `opencode stats --all --json` ("--days 0" is today only and resets at midnight; the text
# table caps at 5 models). tokens = input + output + reasoning + cache write (cache reads are cheap, left out).
# Covers all opencode use on this machine, so a window also includes any other opencode work done in it.
snapshot() {
  opencode stats --all --json 2>/dev/null | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin); t = d["tokens"]
    print(t["input"] + t["output"] + t["reasoning"] + t["cache"]["write"], "%.2f" % d["cost"])
except Exception:
    print("na na")' 2>/dev/null || echo "na na"
}

case "${1:-}" in
  snapshot) snapshot ;;
  mark)
    TASK="$(basename "${2:?usage: measure.sh mark <task> <event> [note]}" .md)"; EVENT="${3:?event}"; NOTE="${4:-}"
    [ -f "$LOG" ] || printf 'iso\tepoch\ttask\tevent\topencode_tokens\topencode_cost_usd\tnote\n' > "$LOG"
    read -r TOK COST <<< "$(snapshot)"
    AT="${MEASURE_AT:-$(date +%s)}"   # MEASURE_AT=<epoch> back-dates a mark (e.g. a plan's start); keep marks in time order
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -r "$AT" +%FT%T%z)" "$AT" "$TASK" "$EVENT" "$TOK" "$COST" "$NOTE" >> "$LOG"
    echo "measure: $TASK $EVENT recorded"
    ;;
  report)
    TASK="$(basename "${2:?usage: measure.sh report <task>}" .md)"
    [ -f "$LOG" ] || { echo "measure: no log yet ($LOG)"; exit 0; }
    EPOCHS="$(awk -F'\t' -v task="$TASK" '$3==task {print $2}' "$LOG" | tr '\n' ' ')"
    # Claude tokens between consecutive marks (empty if fewer than 2 marks or no python)
    CL="$(python3 "$(dirname "$0")/claude-usage.py" windows $EPOCHS 2>/dev/null || true)"
    CL="$CL" awk -F'\t' -v task="$TASK" '
      BEGIN { split(ENVIRON["CL"], c, "\n") }
      $3==task { n++; el=(prev_t==""?0:$2-prev_t); dt=($5=="na"||prev_k==""||prev_k=="na")?"":sprintf("%+d tok", $5-prev_k)
        printf "%-16s %5ds  builder %-14s", $4, el, dt; if (n>1 && c[n-1]!="") printf " | claude %s", c[n-1]; printf "  %s\n", $7
        if (first=="") first=$2; last=$2
        if ($5!="na") prev_k=$5; prev_t=$2 }
      END { if (n) printf "total: %d marks, %ds between first and last\n", n, last-first; else print "measure: no marks for " task }' "$LOG"
    ;;
  history) python3 "$(dirname "$0")/claude-usage.py" days ${2:+"$2"} ;;
  *) echo "usage: scripts/measure.sh mark|report|snapshot ..."; exit 2 ;;
esac
