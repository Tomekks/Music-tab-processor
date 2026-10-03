#!/usr/bin/env bash
# The command that answers "is this actually done" for app/.
# Default (local use): typecheck -> lint -> unit tests. Fast, no build --
# `npm run stage` already proves the build works, because a dev server
# can't run on broken output, so running `next build` a second time here
# would just be the same check paid for twice.
# --full (CI use): also runs the production build. CI has no human to
# preview a `stage` server, so it's the only place that check has to happen.
#
# Ends with a footer saying what ran (with counts) and what did NOT run, so a
# bare "PASS" can't be read as more than it is. Counts are parsed from the
# test runner's own summary lines -- no judgment involved.
set -euo pipefail
cd "$(dirname "$0")/.."

START=$SECONDS
TOTAL_TESTS=0
OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT

# Run a test command, echo its output, and set PASS_N / TESTS_N from the
# runner's own `ℹ pass N` / `ℹ tests N` summary lines. A failing command
# stops the script here (set -e + pipefail), so the footer never prints.
run_tests() {
  "$@" 2>&1 | tee "$OUT"
  PASS_N="$(awk '/^ℹ pass /{print $3}' "$OUT")"
  TESTS_N="$(awk '/^ℹ tests /{print $3}' "$OUT")"
  TOTAL_TESTS=$((TOTAL_TESTS + ${TESTS_N:-0}))
  # A runner that finds no tests still exits 0; that must not read as PASS.
  [ "${TESTS_N:-0}" -gt 0 ] || { echo "VERIFY: FAIL (zero tests ran: $*)"; exit 1; }
}

count_files() { find "$@" -name '*.test.*' -not -path '*/node_modules/*' | wc -l | tr -d ' '; }

echo "== typecheck (next typegen && tsc --noEmit) =="
npx next typegen
npx tsc --noEmit

echo "== lint =="
npm run lint

echo "== unit tests =="
run_tests npm test
UNIT="$PASS_N/$TESTS_N ($(count_files lib) files)"

echo "== design-system package tests =="
run_tests npm test --workspace @guitar-tabs/design-system
DS="$PASS_N/$TESTS_N ($(count_files packages/design-system) files)"

BUILD="not run (use --full)"
if [ "${1:-}" = "--full" ]; then
  echo "== production build =="
  npm run build
  BUILD="✓"
fi

E2E_N="$(find e2e -name '*.spec.ts' | wc -l | tr -d ' ')"

echo ""
echo "VERIFY: PASS"
echo "  ran:     typecheck ✓  lint ✓  unit $UNIT  design-system $DS  build $BUILD  ($TOTAL_TESTS tests, $((SECONDS - START))s)"
echo "  not run: e2e ($E2E_N specs; npm run test:e2e)"
