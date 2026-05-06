#!/usr/bin/env bash
# scripts/git/end-pr.sh
# main 同期 + session-pre-existing stash を pop する。
# squash merge 完了後に呼ぶ前提。
#
# Usage:
#   bash scripts/git/end-pr.sh [branch-to-delete]
#
# Exit codes:
#   0 = clean
#   1 = stash pop で conflict 等

set -euo pipefail

DELETED_BRANCH="${1:-}"

git checkout main
git pull --ff-only

# 削除予定 branch があれば local も削除 (remote は --delete-branch で消える前提)
if [ -n "$DELETED_BRANCH" ]; then
  git branch -d "$DELETED_BRANCH" 2>/dev/null || echo "[end-pr] branch $DELETED_BRANCH already gone"
fi

# session-pre-existing stash を探して pop
STASH_REF=$(git stash list | grep -E 'session-pre-existing' | head -1 |
  awk -F: '{print $1}' || true)

if [ -n "$STASH_REF" ]; then
  echo "[end-pr] popping $STASH_REF"
  git stash pop "$STASH_REF" || {
    echo "[end-pr] WARN: stash pop encountered conflicts, please resolve manually" >&2
    exit 1
  }
else
  echo "[end-pr] no session-pre-existing stash to pop"
fi

echo "[end-pr] working tree:"
git status --short
