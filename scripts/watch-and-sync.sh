#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
interval="${SYNC_INTERVAL_SECONDS:-20}"

while true; do
  npm run sync
  git add .halo-sync.json src/content/blog public/halo-assets
  if ! git diff --cached --quiet; then
    git commit -m "content: sync Halo posts"
    git pull --rebase origin main
    git push origin main
  fi
  sleep "$interval"
done
