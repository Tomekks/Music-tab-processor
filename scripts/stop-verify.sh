#!/usr/bin/env bash
# Claude Code Stop hook: blocks "done" while app/, tools/Design_System or
# tools/Control_Centre has uncommitted tracked changes that fail `npm run verify`. Exit 2 = block (stderr goes back to
# Claude); anything else lets the turn end. Claude Code sessions only --
# opencode/other tools are covered by .githooks/pre-commit instead.
#
# Cheap by design: skips a folder that is unchanged vs HEAD, or whose node_modules is not installed, skips when this exact
# diff already passed, and skips on the retry turn (stop_hook_active) so a
# failing check can never loop forever. Untracked-only changes are not seen.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 0

# Retry turn: Claude is already continuing because of this hook. Let it end.
if grep -qE '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then exit 0; fi

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT
FAILED=0
for DIR in app tools/Design_System tools/Control_Centre; do
  # Nothing changed in this folder since the last commit: nothing to verify.
  git diff HEAD --quiet -- "$DIR" && continue
  if [ ! -d "$DIR/node_modules" ]; then echo "stop-verify: skipped $DIR (dependencies not installed here)" >&2; continue; fi

  KEY="$(git diff HEAD -- "$DIR" | shasum | cut -d' ' -f1)"
  MARK="$(git rev-parse --git-dir)/verify-ok-${DIR//\//-}"
  [ -f "$MARK" ] && [ "$(cat "$MARK")" = "$KEY" ] && continue

  if (cd "$DIR" && npm run verify --silent) >"$OUT" 2>&1; then
    echo "$KEY" >"$MARK"
  else
    FAILED=1
    {
      echo "BLOCKED: $DIR/ has changes and 'npm run verify' failed. Fix it before finishing."
      echo "Last lines of output:"
      tail -n 25 "$OUT"
    } >&2
  fi
done
[ "$FAILED" = 1 ] && exit 2
exit 0
