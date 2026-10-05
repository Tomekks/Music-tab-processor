#!/usr/bin/env bash
# New isolated copy of the repo for one task: branch + worktree in ../worktrees/, with
# the gitignored files a fresh checkout lacks (.venv link; env files only with --with-env), safety hooks on,
# and dependencies installed.
# Usage: scripts/new-worktree.sh <branch-name> [--base <branch>] [--no-install] [--with-env] [--quick]
# --quick starts the task file from TEMPLATE-quick.md (1-3 files of plain logic, no risk trigger).
# The new branch starts from master unless --base says otherwise (never from whatever is checked out).
set -euo pipefail
NAME="${1:?usage: scripts/new-worktree.sh <branch-name> [--base <branch>] [--no-install] [--with-env] [--quick]}"
shift
BASE=master; INSTALL=1; WITH_ENV=0; TPL=TEMPLATE.md
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE="${2:?--base needs a branch}"; shift 2 ;;
    --no-install) INSTALL=0; shift ;;
    --with-env) WITH_ENV=1; shift ;;
    --quick) TPL=TEMPLATE-quick.md; shift ;;
    *) echo "unknown option: $1"; exit 1 ;;
  esac
done
SLUG="${NAME//\//-}"   # feat/x -> feat-x for folder and task file names
cd "$(git rev-parse --show-toplevel)"
ROOT="$(pwd)"
DEST="$(cd "$ROOT/.." && pwd)/worktrees/$(basename "$ROOT")-$SLUG"
[ ! -e "$DEST" ] || { echo "already exists: $DEST"; exit 1; }

git rev-parse --verify --quiet "$BASE" >/dev/null || { echo "base branch not found: $BASE"; exit 1; }
mkdir -p "$(dirname "$DEST")"
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
if [ -d "$ROOT/.venv" ]; then
  ln -s "$ROOT/.venv" .venv && echo "linked .venv"
  # .gitignore's `.venv/` matches folders only; hide the symlink locally so it never counts as a changed file.
  echo ".venv" >> "$(git rev-parse --git-path info/exclude)"
fi

# Task file from the template, with Branch and Written against already filled in.
if [ -f "docs/work/$TPL" ]; then
  sed "s#<<branch name>>#$NAME#; s#<<commit hash>>#$(git rev-parse --short HEAD)#; s#<<short name>>#$NAME#" \
    "docs/work/$TPL" > "docs/work/$SLUG.md"
  echo "created docs/work/$SLUG.md (fill it in, then: scripts/check-brief.sh docs/work/$SLUG.md)"
fi

if [ "$INSTALL" -eq 1 ]; then
  (cd app && npm install --silent) && echo "installed app dependencies"
  if [ -f tools/Control_Centre/package.json ]; then
    (cd tools/Control_Centre && npm install --silent && npm run tokens --silent) && echo "installed Control Centre dependencies and generated its design tokens"
  fi
  if [ -f tools/Design_System/package.json ]; then
    (cd tools/Design_System && npm install --silent) && echo "installed design system workbench dependencies"
  fi
fi

echo ""
echo "worktree: $DEST"
echo "branch:   $NAME"
echo "hooks:    $(git config core.hooksPath)"
echo "ports:    stage uses 3001, e2e uses 3000; check lsof -i :3000 -i :3001 before running them."
echo "remove:   git worktree remove $DEST   (after merging; ask first)"
