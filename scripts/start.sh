#!/usr/bin/env bash
# Session-start helper (used by /start). Prints the facts a fresh session needs.
# Read-only, no model. Active task = a docs/work/*.md with a "Status: active" line.
# Usage: scripts/start.sh [task-name-fragment] [--no-mark]   (--no-mark: read-only, for /next; no measure row, no usage prompt)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
WORK="${START_WORK_DIR:-docs/work}"
WANT="${1:-}"
NOMARK=0; [ "${2:-}" = "--no-mark" ] && NOMARK=1
BRANCH="$(git branch --show-current)"

echo "folder:  $(pwd)"
echo "branch:  ${BRANCH:-(detached)}"
[ "$(git config core.hooksPath)" = ".githooks" ] || echo "WARNING: safety hooks are off here (secret scan, verify). Run: git config core.hooksPath .githooks"

# Parked ideas (scripts/park.sh): listed when no task is active, only counted otherwise so they do not hijack the session.
IDEAS_F="${IDEAS_FILE:-$(cd "$(git rev-parse --git-common-dir)" && pwd)/ideas.md}"
NIDEAS="$(grep -c '^- ' "$IDEAS_F" 2>/dev/null || true)"; NIDEAS="${NIDEAS:-0}"

# Active tasks in OTHER worktrees: a task file lives on its own branch, so the folder you are in does not show them.
ME="$(pwd)"
other_active() {
  local wt f
  while read -r wt; do
    [ "$wt" = "$ME" ] && continue
    for f in "$wt"/docs/work/*.md; do
      [ -f "$f" ] || continue
      [[ "${f##*/}" == TEMPLATE* ]] && continue
      grep -qE '^Status:[[:space:]]*active' "$f" || continue
      echo "  $f  (next: $(sed -n 's/^Next:[[:space:]]*//p' "$f" | head -1 | cut -c1-90))"
    done
  done < <(git worktree list --porcelain | sed -n 's/^worktree //p')
}
OTHERS="$(other_active | head -8)"
[ -z "$OTHERS" ] || { echo "active in other worktrees (invisible here; merge or finish them first, they may overlap):"; echo "$OTHERS"; }

# Active task files (top level of docs/work only), optionally filtered by name.
ACTIVE=()
for f in "$WORK"/*.md; do
  [ -f "$f" ] || continue
  case "${f##*/}" in TEMPLATE*.md) continue ;; esac   # the blank template is not a task
  grep -qE '^Status:[[:space:]]*active' "$f" || continue
  [ -z "$WANT" ] || [[ "${f##*/}" == *"$WANT"* ]] || continue
  ACTIVE+=("$f")
done

if [ "${#ACTIVE[@]}" -eq 0 ]; then
  echo "task:    none active"
  # Pending plans: a plan with a top "**Status (date):**" line is live; make a task file to start it.
  PEND=""
  for p in docs/plans/*/; do
    pf="$p$(basename "$p").md"
    [ -f "$pf" ] || continue
    ST="$(grep -m1 -E '^\*\*Status \(' "$pf" | sed -E 's/^\*\*Status \(([^)]*)\):\*\*[[:space:]]*/\1: /' | cut -c1-110)"
    [ -z "$ST" ] || PEND="$PEND  $(basename "$p")  [$ST...]\n"
  done
  [ -z "$PEND" ] || { echo "pending plans (no task file yet):"; printf "$PEND"; }
  [ "$NIDEAS" -eq 0 ] || { echo "ideas ($NIDEAS parked, newest last; file: $IDEAS_F):"; grep '^- ' "$IDEAS_F" | tail -8 | cut -c1-120 | sed 's/^/  /'; }
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
[ "$NIDEAS" -eq 0 ] || echo "ideas:   $NIDEAS parked (cat $IDEAS_F)"
# Rules freshness: AGENTS.md or docs/rules changed after this task was written (the rules this session loaded may differ from the task's).
WA="$(sed -n 's/^Written against:[[:space:]]*//p' "$T" | head -1 | awk '{print $1}')"
if [ -n "$WA" ] && git rev-parse --verify --quiet "$WA^{commit}" >/dev/null; then
  RN="$(git rev-list --count "$WA..HEAD" -- AGENTS.md docs/rules 2>/dev/null)"
  [ "${RN:-0}" -eq 0 ] || echo "rules:   $RN commit(s) changed AGENTS.md or docs/rules since this task was written (latest: $(git log -1 --format='%h %cs' -- AGENTS.md docs/rules)). Read docs/rules/process.md before acting; the task's wording may be older."
fi
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

# Measurement (time and tokens): mark the session start; Claude usage can't be read by a script.
if [ "$NOMARK" -eq 0 ] && { [ -z "${START_WORK_DIR:-}" ] || [ -n "${MEASURE_LOG:-}" ]; }; then
  bash "$(dirname "$0")/measure.sh" mark "$T" session-start >/dev/null 2>&1 || true
  echo "measure: now log Claude usage: get_usage, then bash scripts/measure.sh mark $(basename "$T" .md) claude \"5h=<n> weekly=<n> ctx=<n>\""
fi
