#!/usr/bin/env bash
# Session-start helper (used by /start). Prints the facts a fresh session needs.
# Read-only, no model. Active task = a docs/work/*.md with a "Status: active" line.
# Usage: scripts/start.sh [task-name-fragment]
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
WORK="${START_WORK_DIR:-docs/work}"
WANT="${1:-}"
BRANCH="$(git branch --show-current)"

echo "folder:  $(pwd)"
echo "branch:  ${BRANCH:-(detached)}"
[ "$(git config core.hooksPath)" = ".githooks" ] || echo "WARNING: safety hooks are off here (secret scan, verify). Run: git config core.hooksPath .githooks"

# Active task files (top level of docs/work only), optionally filtered by name.
ACTIVE=()
for f in "$WORK"/*.md; do
  [ -f "$f" ] || continue
  grep -qE '^Status:[[:space:]]*active' "$f" || continue
  [ -z "$WANT" ] || [[ "${f##*/}" == *"$WANT"* ]] || continue
  ACTIVE+=("$f")
done

if [ "${#ACTIVE[@]}" -eq 0 ]; then
  echo "task:    none active"
  echo "-> No active task. Ask the user what to work on; suggest /grill-with-docs for a new idea."
  exit 0
fi
if [ "${#ACTIVE[@]}" -gt 1 ]; then
  echo "task:    ${#ACTIVE[@]} active, pick one with /start <name>:"
  printf '           %s\n' "${ACTIVE[@]}"
  exit 0
fi

T="${ACTIVE[0]}"
NEXT="$(sed -n 's/^Next:[[:space:]]*//p' "$T" | head -1)"
TBRANCH="$(sed -n 's/^Branch:[[:space:]]*//p' "$T" | head -1)"
if [ -z "$NEXT" ] || [ -z "$TBRANCH" ]; then
  echo "task:    $T"
  echo "ERROR: task file needs 'Branch:' and 'Next:' header lines. Fix the file before continuing."
  exit 2
fi
echo "task:    $T"
echo "next:    $NEXT"
[ "$TBRANCH" = "$BRANCH" ] || echo "WARNING: task is for branch '$TBRANCH' but you are on '${BRANCH:-detached}'."

# Open questions: anything under '## Questions' other than '(none open)'.
Q="$(awk '/^## Questions/{f=1;next} /^## /{f=0} f && NF && $0 !~ /none open/' "$T")"
[ -z "$Q" ] || echo "WARNING: open questions in the task file for the owner."

# Working-tree state (untracked paths are ignored: they are always present here and only add noise).
CHANGED="$(git status --short | grep -vc '^??' || true)"
if UP="$(git rev-list --count '@{u}..HEAD' 2>/dev/null)"; then PUSH="$UP unpushed"; else PUSH="no upstream (not pushed)"; fi
echo "git:     $CHANGED uncommitted tracked, $PUSH"
[ "$CHANGED" -eq 0 ] || echo "WARNING: uncommitted tracked changes. If you did not make them, another session may be working here."

# Stale task file: commits since it last changed (uncommitted edits count as fresh).
if git diff --quiet HEAD -- "$T" 2>/dev/null; then
  LAST="$(git log -1 --format=%H -- "$T")"
  if [ -n "$LAST" ]; then
    N="$(git rev-list --count "$LAST..HEAD")"
    [ "$N" -le 3 ] || echo "WARNING: task file is $N commits behind HEAD; its Next: may be stale."
  fi
fi

# Cold start: a long gap means the orientation docs are worth reading.
AGE=$(( ( $(date +%s) - $(git log -1 --format=%ct) ) / 86400 ))
[ "$AGE" -lt 14 ] || echo "COLD START: last commit $AGE days ago. Also read docs/GUIDE.md, docs/ARCHITECTURE.md, docs/DECISIONS.md."

# Approximate size of the one file /start asks the agent to read (AGENTS.md is already loaded).
echo "boot:    ~$(( $(wc -c < "$T" | tr -d ' ') / 4 )) tokens (task file)"
