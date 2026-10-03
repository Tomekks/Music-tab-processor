#!/usr/bin/env bash
# Fails if the work changed any file outside the task's "Modify only" list (plus the task file itself).
# "Changed" = everything differing from the task's "Written against" commit: committed, staged, unstaged
# and untracked-but-not-ignored files. Run in the builder's worktree. Mechanical, no model.
# Usage: scripts/check-scope.sh <task-file>
# Modify-only entries are the `backticked` paths between "Modify only" and "Do NOT touch"; an entry
# ending in / allows everything under that folder.
set -uo pipefail
TASK="${1:?usage: scripts/check-scope.sh <task-file>}"
[ -f "$TASK" ] || { echo "no such file: $TASK"; exit 1; }
cd "$(git rev-parse --show-toplevel)" || exit 1

BASE="$(sed -n 's/^Written against:[[:space:]]*//p' "$TASK" | head -1 | grep -oE '[0-9a-f]{7,40}' | head -1)"
[ -n "$BASE" ] || { echo "check-scope: no 'Written against' commit in $TASK"; exit 1; }
git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null || { echo "check-scope: unknown commit $BASE"; exit 1; }

# shellcheck disable=SC2016  # the backticks are literal: paths are written `like this`
ALLOWED="$(awk 'tolower($0) ~ /modify only/ {f=1; next} f && tolower($0) ~ /do not touch|^#/ {exit} f' "$TASK" \
  | grep -oE '`[^`]+`' | tr -d '`')"
[ -n "$ALLOWED" ] || { echo "check-scope: no paths under 'Modify only' in $TASK"; exit 1; }
ALLOWED="$(printf '%s\n%s\n' "$ALLOWED" "$TASK")"

CHANGED="$( { git diff --no-renames --name-only "$BASE"; git ls-files --others --exclude-standard; } | sort -u)"

BAD=""
while IFS= read -r f; do
  [ -n "$f" ] || continue
  ok=0
  while IFS= read -r a; do
    case "$a" in
      */) case "$f" in "$a"*) ok=1 ;; esac ;;
      *)  [ "$f" = "$a" ] && ok=1 ;;
    esac
  done <<< "$ALLOWED"
  [ "$ok" -eq 1 ] || BAD="$BAD$f"$'\n'
done <<< "$CHANGED"

if [ -n "$BAD" ]; then
  echo "check-scope: FAIL, changed outside 'Modify only':"
  printf '%s' "$BAD" | sed 's/^/  /'
  exit 1
fi
echo "check-scope: OK ($(echo "$CHANGED" | grep -c .) changed file(s), all in scope)"
