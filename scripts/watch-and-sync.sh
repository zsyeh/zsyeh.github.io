#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
interval="${SYNC_INTERVAL_SECONDS:-20}"

while true; do
  npm run sync
  git add .halo-sync.json src/content/blog public/halo-assets
  if ! git diff --cached --quiet; then
    git commit -m "content: sync Halo posts"
  fi

  # A failed push leaves a valid local commit behind. Retry it on later loops
  # even when the next Halo sync produces no additional file changes.
  if [[ "$(git rev-list --count origin/main..HEAD)" -gt 0 ]]; then
    if git pull --rebase origin main && git push origin main; then
      :
    else
      echo "GitHub sync failed; will retry after ${interval}s" >&2
    fi
  fi
  sleep "$interval"
done
