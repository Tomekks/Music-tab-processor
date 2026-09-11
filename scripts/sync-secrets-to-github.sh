#!/usr/bin/env bash
# Run this yourself, in your own terminal. Claude never runs this script and
# never sees the values inside app/.env.local -- it only reads the file
# locally, on your machine, and hands each value straight to `gh`.
#
# Usage: ./scripts/sync-secrets-to-github.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="app/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "No $ENV_FILE found -- nothing to sync." >&2
  exit 1
fi

echo "Syncing secrets from $ENV_FILE to GitHub Actions (repo: $(gh repo view --json nameWithOwner -q .nameWithOwner))"
echo ""

while IFS='=' read -r key value; do
  # Skip blank lines and comments
  [ -z "$key" ] && continue
  case "$key" in \#*) continue ;; esac
  # Only sync keys that look like real secrets, not NEXT_PUBLIC_* (those are
  # meant to be visible in the browser bundle, never treat them as secret)
  case "$key" in
    NEXT_PUBLIC_*) continue ;;
  esac
  echo "Setting $key..."
  gh secret set "$key" --body "$value"
done < "$ENV_FILE"

echo ""
echo "Done. Verify with: gh secret list"
