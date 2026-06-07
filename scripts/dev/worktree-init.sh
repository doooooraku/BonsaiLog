#!/usr/bin/env bash
# scripts/dev/worktree-init.sh — Git worktree 初回作成後の DX 自動化 (Sess75 PR-A、 R-64 起票)
#
# 役割:
#   1. 親 repo (= main worktree) の `.env` を新 worktree に symlink
#   2. 親 repo の `node_modules` を新 worktree に symlink (pnpm install 5-10 分節約)
#   3. 既存 symlink は skip、 既存通常 file は警告のみ (上書きしない)
#
# 背景 (Sess73 + Sess75 で 2 回再発した罠):
#   - worktree に `.env` がないと Expo `app.config.ts` の `required('APP_NAME')` が
#     fail → Metro 起動できない (`pnpm dev` → exit 1 "Missing required env var")
#   - worktree に `node_modules` がないと `pnpm verify` 等が module 解決失敗
#   - 毎回手動で `ln -s` するのは R-9/R-19 違反 (= 仕組み化必須)
#
# 使い方:
#   git worktree add .claude/worktrees/<name> -b feat-<name>
#   cd .claude/worktrees/<name>
#   bash scripts/dev/worktree-init.sh
#   # → .env + node_modules symlink 完了
#   pnpm dev
#
# 環境変数:
#   FORCE_RELINK=1  既存 symlink を一旦削除して再 link (本物の file は触らない)
#
# Related:
#   - R-64 (.claude/recurrence-prevention/specialized.md)
#   - docs/how-to/development/dev-workflow.md §Worktree 利用時の準備
#   - Sess73 worktree pattern (sess73-verify-integration)
#   - Sess75 PR-A (本 script の起票元)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_WORKTREE="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# git worktree list の 1 行目が main worktree (root)
# porcelain 形式: "worktree <path>" の最初の entry
if ! command -v git >/dev/null 2>&1; then
  echo "[worktree-init] git not found in PATH" >&2
  exit 1
fi

MAIN_WORKTREE="$(git -C "$CURRENT_WORKTREE" worktree list --porcelain | awk '/^worktree / {print $2; exit}')"

if [ -z "$MAIN_WORKTREE" ]; then
  echo "[worktree-init] could not detect main worktree (git worktree list は空)" >&2
  exit 1
fi

if [ "$MAIN_WORKTREE" = "$CURRENT_WORKTREE" ]; then
  echo "[worktree-init] you are already in the main worktree — no init needed"
  exit 0
fi

echo "[worktree-init] main worktree: $MAIN_WORKTREE"
echo "[worktree-init] current worktree: $CURRENT_WORKTREE"

# symlink_if_missing <target_in_main> <link_in_current>
symlink_if_missing() {
  local name="$1"
  local target="$MAIN_WORKTREE/$name"
  local link="$CURRENT_WORKTREE/$name"

  if [ ! -e "$target" ]; then
    echo "[worktree-init] skip $name: $target does not exist in main"
    return
  fi

  # 既存 symlink の処理
  if [ -L "$link" ]; then
    if [ "${FORCE_RELINK:-0}" = "1" ]; then
      echo "[worktree-init] FORCE_RELINK=1: rm $link"
      rm "$link"
    else
      echo "[worktree-init] keep $name: already symlinked"
      return
    fi
  elif [ -e "$link" ]; then
    # symlink でなく real file/dir → 上書きしない (user 編集の可能性、 安全策)
    echo "[worktree-init] warn $name: real file/dir exists at $link — not touched" >&2
    return
  fi

  ln -s "$target" "$link"
  echo "[worktree-init] linked $name → $target"
}

symlink_if_missing ".env"
symlink_if_missing "node_modules"

echo "[worktree-init] done — pnpm dev / pnpm verify can be run now"
