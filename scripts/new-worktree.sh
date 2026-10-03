#!/usr/bin/env bash
# New isolated copy of the repo for one task: branch + worktree next to the main checkout, with the
# gitignored files a fresh checkout lacks (env files, .opencode config, .venv link), safety hooks on,
# and dependencies installed.
# Usage: scripts/new-worktree.sh <branch-name> [--no-install]
set -euo pipefail
NAME="${1:?usage: scripts/new-worktree.sh <branch-name> [--no-install]}"
cd "$(git rev-parse --show-toplevel)"
ROOT="$(pwd)"
DEST="$(cd "$ROOT/.." && pwd)/$(basename "$ROOT")-$NAME"
[ ! -e "$DEST" ] || { echo "already exists: $DEST"; exit 1; }

git worktree add -b "$NAME" "$DEST"
cd "$DEST"
git config core.hooksPath .githooks

# Gitignored files a fresh checkout does not have.
for f in .env.local app/.env.local; do
  [ -f "$ROOT/$f" ] && cp "$ROOT/$f" "$f" && echo "copied $f"
done
for f in opencode.json .opencode/agents .opencode/commands; do
  if [ -e "$ROOT/$f" ] && [ ! -e "$f" ]; then mkdir -p "$(dirname "$f")"; cp -R "$ROOT/$f" "$f"; echo "copied $f"; fi
done
[ -d "$ROOT/.venv" ] && ln -s "$ROOT/.venv" .venv && echo "linked .venv"

if [ "${2:-}" != "--no-install" ]; then
  (cd app && npm install --silent) && echo "installed app dependencies"
fi

echo ""
echo "worktree: $DEST"
echo "branch:   $NAME"
echo "hooks:    $(git config core.hooksPath)"
echo "ports:    stage uses 3001, e2e uses 3000; check lsof -i :3000 -i :3001 before running them."
echo "remove:   git worktree remove $DEST   (after merging; ask first)"
