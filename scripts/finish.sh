#!/usr/bin/env bash
# The builder's "save my work" step: scope check, stage ONLY the task's allowed paths, one checkpoint
# commit (the pre-commit hook runs verify), then print the facts for the report.
# Usage: scripts/finish.sh [<task-file>]   (defaults to $TASK_FILE, which scripts/run-builder.sh sets)
set -uo pipefail
TASK="${1:-${TASK_FILE:?usage: scripts/finish.sh <task-file> (or set TASK_FILE)}}"
cd "$(git rev-parse --show-toplevel)" || exit 1
HERE="$(cd "$(dirname "$0")" && pwd)"

bash "$HERE/check-scope.sh" "$TASK" || { echo "finish: stopped, nothing staged or committed"; exit 1; }

# Deletions the owner approved with the brief: only these, only here (the builder has no rm).
# shellcheck disable=SC2016  # the backticks are literal: paths are written `like this`
awk 'tolower($0) ~ /^\*\*delete/ {f=1; next} f && tolower($0) ~ /^#|^\*\*/ {exit} f' "$TASK" | grep -oE '`[^`]+`' | tr -d '`' \
  | while IFS= read -r d; do [ -n "$d" ] && [ -e "$d" ] && git rm -q -r -- "$d"; done

# shellcheck disable=SC2016  # the backticks are literal: paths are written `like this`
PATHS="$(awk 'tolower($0) ~ /modify only/ {f=1; next} f && tolower($0) ~ /do not touch|^#/ {exit} f' "$TASK" \
  | grep -oE '`[^`]+`' | tr -d '`')"
{ echo "$TASK"; echo "$PATHS"; } | while IFS= read -r p; do
  [ -n "$p" ] && git add -A -- "$p"
done

git diff --cached --quiet && { echo "finish: nothing to commit"; exit 1; }

NAME="$(sed -n 's/^# Task:[[:space:]]*//p' "$TASK" | head -1)"
if ! OUT="$(git commit -q -m "task: ${NAME:-$(basename "$TASK" .md)}" -m "Built from $TASK by the builder model." 2>&1)"; then
  echo "$OUT" | tail -25
  echo "finish: commit failed (the pre-commit check blocked it). Fix the problem, then run finish again."
  exit 1
fi

# Add the commit facts to the task file's report and fold them into the same commit (the hash itself
# can't be inside the commit it names; `git log -1` shows it).
FOOTER="$(echo "$OUT" | grep -A3 '^VERIFY' | head -5)"
{
  echo ""
  echo "### Checkpoint (written by scripts/finish.sh)"
  echo '```'
  git diff --stat HEAD~1
  [ -z "$FOOTER" ] || { echo "---"; echo "$FOOTER"; }
  echo '```'
} >> "$TASK"
git add -- "$TASK"
if ! OUT2="$(git commit -q --amend --no-edit 2>&1)"; then
  echo "$OUT2" | tail -25
  echo "finish: committed, but folding the checkpoint block into the commit failed"
  exit 1
fi

echo "finish: committed $(git rev-parse --short HEAD)"
git diff --stat HEAD~1
[ -z "$FOOTER" ] || echo "$FOOTER"
echo "--- git status --short"
git status --short
