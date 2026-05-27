#!/usr/bin/env bash
# scripts/dev/reload-app.sh — Claude 側で実機 BonsaiLog の最新コード反映を完結させる
# (Issue #455 Phase D、本セッション議論「Metro 自動 reload」結論)
#
# 役割:
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
set -euo pipefail

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
