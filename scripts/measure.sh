#!/usr/bin/env bash
# Records time and builder tokens at workflow steps, so the process can be compared with the old one.
# Usage: scripts/measure.sh mark <task file or name> <event> [note]   append one row (time + opencode tokens)
#        scripts/measure.sh report <task name>                        seconds and tokens between marks
#        scripts/measure.sh snapshot                                  print "<tokens> <cost>" summed over opencode models
# Log: <git common dir>/measure.tsv, shared by all worktrees and never shown as a change (override with MEASURE_LOG). Claude's own usage can't be read from a script:
# add it as the note, e.g. mark <task> claude "5h=20 weekly=31 ctx=332741" (from get_usage).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
LOG="${MEASURE_LOG:-$(cd "$(git rev-parse --git-common-dir)" && pwd)/measure.tsv}"

# --days 365, not 0: "--days 0" means today only and would reset at midnight.
snapshot() {
  local out
  out="$(opencode stats --models --days 365 2>/dev/null)" || { echo "na na"; return; }
  printf '%s\n' "$out" | awk '
    /\$[0-9.]+[[:space:]]*$/ { c=$NF; sub(/\$/,"",c); t=$(NF-2); m=1
      if (t ~ /k$/) { m=1000; sub(/k$/,"",t) } else if (t ~ /M$/) { m=1000000; sub(/M$/,"",t) }
      tok+=t*m; cost+=c; seen=1 }
    END { if (seen) printf "%d %.2f\n", tok, cost; else print "na na" }'
}

case "${1:-}" in
  snapshot) snapshot ;;
  mark)
    TASK="$(basename "${2:?usage: measure.sh mark <task> <event> [note]}" .md)"; EVENT="${3:?event}"; NOTE="${4:-}"
    [ -f "$LOG" ] || printf 'iso\tepoch\ttask\tevent\topencode_tokens\topencode_cost_usd\tnote\n' > "$LOG"
    read -r TOK COST <<< "$(snapshot)"
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date +%FT%T%z)" "$(date +%s)" "$TASK" "$EVENT" "$TOK" "$COST" "$NOTE" >> "$LOG"
    echo "measure: $TASK $EVENT recorded"
    ;;
  report)
    TASK="$(basename "${2:?usage: measure.sh report <task>}" .md)"
    [ -f "$LOG" ] || { echo "measure: no log yet ($LOG)"; exit 0; }
    awk -F'\t' -v task="$TASK" '
      $3==task { n++; el=(prev_t==""?0:$2-prev_t); dt=($5=="na"||prev_k==""||prev_k=="na")?"":sprintf("%+d tok", $5-prev_k)
        printf "%-16s %5ds  %-12s %s\n", $4, el, dt, $7; if (first=="") first=$2; last=$2
        if ($5!="na") prev_k=$5; prev_t=$2 }
      END { if (n) printf "total: %d marks, %ds between first and last\n", n, last-first; else print "measure: no marks for " task }' "$LOG"
    ;;
  *) echo "usage: scripts/measure.sh mark|report|snapshot ..."; exit 2 ;;
esac
