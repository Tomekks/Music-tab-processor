#!/usr/bin/env bash
# Parks one idea without discussing it: appends a dated line to the shared ideas file. The file lives in the git
# common dir, so it works from any worktree and never shows up as a change on a branch. /start lists the ideas.
# Usage: scripts/park.sh <one line idea>      (IDEAS_FILE overrides the file, for tests)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
F="${IDEAS_FILE:-$(cd "$(git rev-parse --git-common-dir)" && pwd)/ideas.md}"
TEXT="$(printf '%s' "$*" | tr '\n\r' '  ' | sed 's/^ *//; s/ *$//')"
[ -n "$TEXT" ] || { echo "park: nothing to park. Usage: scripts/park.sh <one line idea>"; exit 1; }
[ -f "$F" ] || printf '# Parked ideas (one line each, newest last). /start lists them; delete a line once it is decided.\n' > "$F"
printf -- '- %s %s\n' "$(date +%F)" "$TEXT" >> "$F"
echo "parked ($(grep -c '^- ' "$F") total): $TEXT"
