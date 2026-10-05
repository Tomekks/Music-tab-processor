#!/usr/bin/env bash
# Compare the two builder runs of the effort test (same brief, #low and #high), from facts rather than the builders' reports.
# Usage: scripts/effort-compare.sh <task-file> <low-worktree> <high-worktree> <brief-commit> [--append]
#   Prints per run: commits, diff size, scope, verify, own tokens/cost; then the diff between the two diffs.
#   --append: also adds two rows to the scorecard "Effort test" table (Defects, Merged and Note stay blank for Claude/owner).
# Reads only; the worktrees are not changed. Run from the main checkout (the scorecard lives there).
set -uo pipefail
TASK="${1:?usage: scripts/effort-compare.sh <task-file> <low-worktree> <high-worktree> <brief-commit> [--append]}"
LOW="${2:?low worktree}"; HIGH="${3:?high worktree}"; BRIEF="${4:?brief commit}"; APPEND="${5:-}"
NAME="$(basename "$TASK" .md)"
ROOT="$(git rev-parse --show-toplevel)" || exit 1
SINCE="$(git -C "$ROOT" log -1 --format=%ct "$BRIEF")" || exit 1
ROWS=""

for EFFORT in low high; do
  W="$LOW"; [ "$EFFORT" = high ] && W="$HIGH"
  [ -d "$W" ] || { echo "no such worktree: $W"; exit 1; }
  COMMITS="$(git -C "$W" rev-list --count "$BRIEF"..HEAD)"
  STAT="$(git -C "$W" diff --shortstat "$BRIEF" HEAD)"
  SCOPE="$(cd "$W" && bash scripts/check-scope.sh "$TASK" 2>&1 | head -2 | tr '\n' ' ')" && SC=ok || SC=FAIL
  VERIFY="$(cd "$W" && bash scripts/verify-task.sh 2>&1)" && VF=PASS || VF=FAIL
  read -r TOK COST <<< "$(cd "$W" && bash scripts/measure.sh session "$NAME" "$SINCE" "$EFFORT")"
  echo "== $EFFORT ($W)"
  echo "commits:  $COMMITS   diff:${STAT:- none}"
  echo "scope:    $SC  $SCOPE"
  echo "verify:   $VF  $(printf '%s\n' "$VERIFY" | tail -1)"
  echo "usage:    $TOK tok, \$$COST (own session; time: see delegate.sh output)"
  [ "$COMMITS" -gt 0 ] && [ "$VF" = PASS ] && [ "$SC" = ok ] && FT=yes || FT="no (commits $COMMITS, scope $SC, verify $VF)"
  ROWS="$ROWS| $(date +%F) | $NAME | $EFFORT | $FT |  |  | $TOK tok, \$$COST |  |  |
"
done

echo "== difference between the two diffs (< low, > high)"
diff <(git -C "$LOW" diff "$BRIEF" HEAD) <(git -C "$HIGH" diff "$BRIEF" HEAD) | head -80
echo "(diff capped at 80 lines; full: diff <(git -C $LOW diff $BRIEF HEAD) <(git -C $HIGH diff $BRIEF HEAD))"

if [ "$APPEND" = --append ]; then
  ROWS="$ROWS" python3 - "$ROOT/docs/work/scorecard.md" <<'PY'
import os, sys
p = sys.argv[1]; rows = os.environ["ROWS"].rstrip("\n")
s = open(p).read()
i = s.index("\n## Model switches")
s = s[:i].rstrip("\n") + "\n" + rows + "\n" + s[i:]
open(p, "w").write(s)
PY
  echo "scorecard: 2 rows appended (fill Defects, Merged, Note)"
fi
