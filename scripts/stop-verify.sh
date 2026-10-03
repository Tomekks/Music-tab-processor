#!/usr/bin/env bash
# Claude Code Stop hook: blocks "done" while app/ has uncommitted tracked
# changes that fail `npm run verify`. Exit 2 = block (stderr goes back to
# Claude); anything else lets the turn end. Claude Code sessions only --
# opencode/other tools are covered by .githooks/pre-commit instead.
#
# Cheap by design: skips when app/ is unchanged vs HEAD, skips when this exact
# diff already passed, and skips on the retry turn (stop_hook_active) so a
# failing check can never loop forever. Untracked-only changes are not seen.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 0

# Retry turn: Claude is already continuing because of this hook. Let it end.
if grep -qE '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then exit 0; fi

# Nothing in app/ changed since the last commit: nothing to verify.
git diff HEAD --quiet -- app/ && exit 0

KEY="$(git diff HEAD -- app/ | shasum | cut -d' ' -f1)"
MARK="$(git rev-parse --git-dir)/verify-ok"
[ -f "$MARK" ] && [ "$(cat "$MARK")" = "$KEY" ] && exit 0

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT
if (cd app && npm run verify --silent) >"$OUT" 2>&1; then
  echo "$KEY" >"$MARK"
  exit 0
fi

{
  echo "BLOCKED: app/ has changes and 'npm run verify' failed. Fix it before finishing."
  echo "Last lines of output:"
  tail -n 25 "$OUT"
} >&2
exit 2
