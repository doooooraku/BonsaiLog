#!/usr/bin/env bash
# scripts/git/start-pr.sh
# feature/fix branch を作り、現在のワーキングツリーに残っている「他者 M ファイル」
# (今回の作業対象外の既存変更) を session-pre-existing stash で退避する。
#
# 解決する問題 (本セッション学び A8):
# - セッション開始時から M だった docs/how-to/.../P-00_ux-simulation.md が verify:format で fail
# - 各 PR で git stash push -- file を手動実行する必要があった (4 回繰り返し)
#
# Usage:
#   bash scripts/git/start-pr.sh <branch-name> [files-to-keep...]
#   bash scripts/git/start-pr.sh feat/foo                    # 全 M を退避
#   bash scripts/git/start-pr.sh feat/foo src/foo.ts         # src/foo.ts は退避しない (作業対象)
#
# Exit codes:
#   0 = ready
#   1 = staged changes exist (commit/unstage first)

set -euo pipefail

BRANCH="${1:?Usage: start-pr.sh <branch-name> [files-to-keep...]}"
shift || true
KEEP_FILES=("$@")

# Staged changes があれば中断 (混乱防止)
if ! git diff --cached --quiet; then
  echo "[start-pr] ERROR: staged changes exist, please commit or unstage first" >&2
  git status --short >&2
  exit 1
fi

# 既存の他者 M ファイル一覧
mapfile -t M_FILES < <(git diff --name-only)

# KEEP_FILES に該当するものは stash しない
STASH_FILES=()
for f in "${M_FILES[@]}"; do
  keep=0
  for k in "${KEEP_FILES[@]}"; do
    if [ "$f" = "$k" ]; then
      keep=1
      break
    fi
  done
  if [ "$keep" -eq 0 ]; then
    STASH_FILES+=("$f")
  fi
done

# ブランチ作成
git checkout -b "$BRANCH"

if [ "${#STASH_FILES[@]}" -gt 0 ]; then
  echo "[start-pr] stashing ${#STASH_FILES[@]} pre-existing modifications:"
  printf '  %s\n' "${STASH_FILES[@]}"
  git stash push --message "session-pre-existing on ${BRANCH}" -- "${STASH_FILES[@]}"
else
  echo "[start-pr] no pre-existing modifications to stash"
fi

echo "[start-pr] ready on $(git branch --show-current)"
