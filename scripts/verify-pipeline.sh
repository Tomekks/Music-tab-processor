#!/usr/bin/env bash
# Pipeline check: pytest + a footer. Runs only when pipeline/ or contracts/ files are staged
# (the pre-commit hook calls it with no args). `--all` forces a run.
# Prints the same kind of footer as `npm run verify`: what ran with counts, what did not.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ "${1:-}" != "--all" ] && ! git diff --cached --name-only | grep -qE '^(pipeline|contracts)/'; then
  echo "verify-pipeline: no pipeline/ or contracts/ files staged, skipped (use --all to force)"
  exit 0
fi

# A worktree has no .venv of its own; fall back to the main checkout's.
MAIN="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
PY=".venv/bin/python"; [ -x "$PY" ] || PY="$MAIN/.venv/bin/python"
[ -x "$PY" ] || { echo "verify-pipeline: no .venv found (looked in . and $MAIN)"; exit 1; }

OUT="$(mktemp)"; trap 'rm -f "$OUT"' EXIT
START=$SECONDS
"$PY" -m pytest pipeline/ -q 2>&1 | tee "$OUT"   # pipefail stops here on failure

SUMMARY="$(grep -E '^[0-9]+ passed' "$OUT" | tail -1)"
N="$(echo "$SUMMARY" | awk '{print $1}')"
[ -n "$N" ] && [ "$N" -gt 0 ] || { echo "verify-pipeline: ZERO tests ran, treating as failure"; exit 1; }

echo ""
echo "PIPELINE VERIFY: PASS"
echo "  ran:     pytest $N passed ($((SECONDS - START))s)"
echo "  not run: real-audio golden comparisons and the s01-s05 end-to-end run (see pipeline/VERIFY.md)"
