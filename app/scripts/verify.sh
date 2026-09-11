#!/usr/bin/env bash
# The command that answers "is this actually done" for app/.
# Default (local use): typecheck -> lint -> unit tests. Fast, no build --
# `npm run stage` already proves the build works, because a dev server
# can't run on broken output, so running `next build` a second time here
# would just be the same check paid for twice.
# --full (CI use): also runs the production build. CI has no human to
# preview a `stage` server, so it's the only place that check has to happen.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== typecheck (next typegen && tsc --noEmit) =="
npx next typegen
npx tsc --noEmit

echo "== lint =="
npm run lint

echo "== unit tests =="
npm test

if [ "${1:-}" = "--full" ]; then
  echo "== production build =="
  npm run build
fi

echo ""
echo "VERIFY: PASS"
