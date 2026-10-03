#!/usr/bin/env bash
# Rule-ledger step 4: send one batch of rows to a cheap model, then check the
# answer mechanically (every id answered exactly once, valid verdict/home).
# Usage: scripts/ledger/classify.sh <rules|incidents> <start_row> <count>
# Paid opencode-go models only (never a "-free" id). Runs the model from a
# throwaway directory outside the repo so it cannot touch project files.
set -euo pipefail
KIND="${1:?rules|incidents}"; START="${2:?start row (1 = first data row)}"; COUNT="${3:-50}"
MODEL="${LEDGER_MODEL:-opencode-go/muse-spark-1.3-contributor}"
case "$MODEL" in *-free) echo "refusing free-tier model: $MODEL" >&2; exit 1;; esac

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/docs/work/ledger/$KIND.tsv"
OUT="$ROOT/docs/work/ledger/verdicts-$KIND-$START.psv"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

# id|file:line|section|text  (pipes inside text become slashes so the format stays parseable)
awk -F'\t' -v s="$START" -v c="$COUNT" 'NR>1 && NR-1>=s && NR-1<s+c { gsub(/\|/,"/",$6); print $1"|"$3"|"$4"|"$6 }' "$SRC" > "$WORK/batch.psv"
N="$(wc -l < "$WORK/batch.psv" | tr -d ' ')"
[ "$N" -gt 0 ] || { echo "no rows in range" >&2; exit 1; }

( cd "$WORK" && perl -e 'alarm 420; exec @ARGV' opencode run -m "$MODEL" -f "$WORK/batch.psv" "$(cat "$ROOT/scripts/ledger/${LEDGER_PROMPT:-prompt.md}")" ) > "$WORK/raw.txt" 2>&1 || true
grep -E '^[RI][0-9]{3}\|' "$WORK/raw.txt" > "$OUT" || true

# Mechanical validation: same ids, same order, valid fields.
cut -d'|' -f1 "$WORK/batch.psv" > "$WORK/want"; cut -d'|' -f1 "$OUT" > "$WORK/got"
GOT="$(wc -l < "$OUT" | tr -d ' ')"
echo "sent $N rows, got $GOT answer lines -> $OUT"
diff "$WORK/want" "$WORK/got" > "$WORK/iddiff" && echo "ids: all answered, in order" || { echo "ids: MISMATCH"; head -10 "$WORK/iddiff"; }
BAD="$(awk -F'|' '!($2 ~ /^(KEEP|MERGE|DROP|SUPERSEDED|INCIDENT|NOISE)$/) || NF!=6 {print $1}' "$OUT" | wc -l | tr -d ' ')"
echo "rows with bad format/verdict: $BAD"
echo "verdicts:"; cut -d'|' -f2 "$OUT" | sort | uniq -c
