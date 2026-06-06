#!/usr/bin/env bash
# scripts/dev/reload-app.sh — Claude 側で実機 BonsaiLog の最新コード反映を完結させる
# (Issue #455 Phase D / Sess71 PR-3 拡張)
#
# 役割:
#   0. (Sess71 PR-3) Native fingerprint check (dist/.native-dirty flag + git diff)
#      → Native 影響 detect なら自動 build + install (10-15 min)
#   1. Metro 接続のための adb reverse (PC port 8081 を実機に転送)
#   2. 実機のスリープ解除
#   3. BonsaiLog を強制終了 (確実な state リセット)
#   4. BonsaiLog を起動 (起動時に Metro から最新 bundle を取得)
#
# 前提:
#   - Metro が PC 側で起動済
#     例: `PATH=/home/doooo/.local/bin:$PATH nohup pnpm dev > /tmp/metro.log 2>&1 < /dev/null &`
#   - 実機が USB 接続済 + Dev Client インストール済 (`adb devices` で `device` 表示)
#   - `ADB_DEVICE_SERIAL` 環境変数で device 指定可、未指定なら adb のデフォルト
#
# 使い方:
#   bash scripts/dev/reload-app.sh
#   ADB_DEVICE_SERIAL=SX3LHMA362304722 bash scripts/dev/reload-app.sh
#
# 環境変数 (Sess71 PR-3 追加):
#   SKIP_BUILD_CHECK=1     Native fingerprint check を skip (緊急時用、 通常は不要)
#   AUTO_BUILD=0           Native flag あっても自動 build せず警告のみ (default: 1 = auto build)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FLAG_PATH="${PROJECT_ROOT}/dist/.native-dirty"

# Step 0: Native fingerprint check (Sess71 PR-3 / ADR-0046 Amendment)
if [ "${SKIP_BUILD_CHECK:-0}" != "1" ]; then
  # 補完: git diff で hook 経由でない手動編集 / git pull の変更も detect
  cd "${PROJECT_ROOT}"
  if [ -f "${FLAG_PATH}" ]; then
    echo "[reload-app] Native fingerprint flag found at ${FLAG_PATH}:"
    sed 's/^/[reload-app]   /' "${FLAG_PATH}" | head -20
  else
    # 起動時 git diff check で flag を立てる試み (補完経路、 plan 「F: pnpm dev / reload-app.sh の起動時 git diff check」)
    echo "[reload-app] No flag, running CLI-mode native impact check via git diff..."
    if PATH=/home/doooo/.local/bin:/usr/bin:/bin:${PATH:-} node "${PROJECT_ROOT}/scripts/check-native-impact.mjs" --from=cli 2>&1 | sed 's/^/[reload-app]   /' ; then
      :
    fi
  fi

  if [ -f "${FLAG_PATH}" ]; then
    if [ "${AUTO_BUILD:-1}" != "0" ]; then
      echo "[reload-app] Native impact detected → starting auto build (pnpm build:android:dev:local)"
      echo "[reload-app] This takes 10-15 minutes. Press Ctrl+C to skip (not recommended)."
      cd "${PROJECT_ROOT}"
      PATH=/home/doooo/.local/bin:/usr/bin:/bin:${PATH:-} pnpm build:android:dev:local
      echo "[reload-app] Build done. Installing dev APK..."
      PATH=/home/doooo/.local/bin:/usr/bin:/bin:${PATH:-} pnpm install:device:dev
      echo "[reload-app] Install done. Removing flag."
      rm -f "${FLAG_PATH}"
    else
      echo "[reload-app] AUTO_BUILD=0, skipping auto build. Run manually:"
      echo "[reload-app]   pnpm build:android:dev:local && pnpm install:device:dev"
      echo "[reload-app]   rm ${FLAG_PATH}"
    fi
  fi
else
  echo "[reload-app] SKIP_BUILD_CHECK=1, skipping native impact check."
fi

PACKAGE="com.dooooraku.bonsailog"
METRO_PORT=8081
DEVICE_FLAG=""
if [ -n "${ADB_DEVICE_SERIAL:-}" ]; then
  DEVICE_FLAG="-s ${ADB_DEVICE_SERIAL}"
fi

echo "[reload-app] adb reverse tcp:${METRO_PORT}"
adb ${DEVICE_FLAG} reverse tcp:${METRO_PORT} tcp:${METRO_PORT}

echo "[reload-app] wake up device"
adb ${DEVICE_FLAG} shell input keyevent KEYCODE_WAKEUP || true

echo "[reload-app] force-stop ${PACKAGE}"
adb ${DEVICE_FLAG} shell am force-stop ${PACKAGE}

echo "[reload-app] start ${PACKAGE}/.MainActivity"
adb ${DEVICE_FLAG} shell am start -n ${PACKAGE}/.MainActivity

echo "[reload-app] done — Dev Client が Metro から最新 bundle を取得します"
