#!/usr/bin/env bash
# New isolated copy of the repo for one task: branch + worktree next to the main checkout, with
# the gitignored files a fresh checkout lacks (.venv link; env files only with --with-env), safety hooks on,
# and dependencies installed.
# Usage: scripts/new-worktree.sh <branch-name> [--base <branch>] [--no-install] [--with-env]
# The new branch starts from master unless --base says otherwise (never from whatever is checked out).
set -euo pipefail
NAME="${1:?usage: scripts/new-worktree.sh <branch-name> [--base <branch>] [--no-install] [--with-env]}"
shift
BASE=master; INSTALL=1; WITH_ENV=0
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE="${2:?--base needs a branch}"; shift 2 ;;
    --no-install) INSTALL=0; shift ;;
    --with-env) WITH_ENV=1; shift ;;
    *) echo "unknown option: $1"; exit 1 ;;
  esac
done
SLUG="${NAME//\//-}"   # feat/x -> feat-x for folder and task file names
cd "$(git rev-parse --show-toplevel)"
ROOT="$(pwd)"
DEST="$(cd "$ROOT/.." && pwd)/$(basename "$ROOT")-$SLUG"
[ ! -e "$DEST" ] || { echo "already exists: $DEST"; exit 1; }

git rev-parse --verify --quiet "$BASE" >/dev/null || { echo "base branch not found: $BASE"; exit 1; }
git worktree add -b "$NAME" "$DEST" "$BASE"
cd "$DEST"
git config core.hooksPath .githooks

# Gitignored files a fresh checkout does not have. Real database credentials are NOT copied unless asked:
# verify and the builder do not need them (CI passes with placeholders).
if [ "$WITH_ENV" -eq 1 ]; then
  for f in .env.local app/.env.local; do
    [ -f "$ROOT/$f" ] && cp "$ROOT/$f" "$f" && echo "copied $f"
  done
fi
[ -d "$ROOT/.venv" ] && ln -s "$ROOT/.venv" .venv && echo "linked .venv"

# Task file from the template, with Branch and Written against already filled in.
if [ -f docs/work/TEMPLATE.md ]; then
  sed "s#<<branch name>>#$NAME#; s#<<commit hash>>#$(git rev-parse --short HEAD)#; s#<<short name>>#$NAME#" \
    docs/work/TEMPLATE.md > "docs/work/$SLUG.md"
  echo "created docs/work/$SLUG.md (fill it in, then: scripts/check-brief.sh docs/work/$SLUG.md)"
fi

if [ "$INSTALL" -eq 1 ]; then
  (cd app && npm install --silent) && echo "installed app dependencies"
  if [ -f tools/Control_Centre/package.json ]; then
    (cd tools/Control_Centre && npm install --silent) && echo "installed Control Centre dependencies"
  fi
fi

echo ""
echo "worktree: $DEST"
echo "branch:   $NAME"
echo "hooks:    $(git config core.hooksPath)"
echo "ports:    stage uses 3001, e2e uses 3000; check lsof -i :3000 -i :3001 before running them."
echo "remove:   git worktree remove $DEST   (after merging; ask first)"
