#!/usr/bin/env bash
# scripts/dev/reload-app.sh — Claude 側で実機 BonsaiLog の最新コード反映を完結させる
# (Issue #455 Phase D / Sess71 PR-3 拡張 / Sess77 Follow-up T3 debuggable 検出)
#
# 役割:
#   0. (Sess71 PR-3) Native fingerprint check (dist/.native-dirty flag + git diff)
#      → Native 影響 detect なら自動 build + install (10-15 min)
#   0.5. (Sess77 Follow-up T3) APK debuggable 確認
#      → debuggable=false (Release/Preview build) なら Metro bundle 反映不可、 dev APK へ 切替推奨
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
# 環境変数:
#   SKIP_BUILD_CHECK=1         Native fingerprint check を skip (緊急時用、 通常は不要)
#   AUTO_BUILD=0               Native flag あっても自動 build せず警告のみ (default: 1 = auto build)
#   SKIP_DEBUGGABLE_CHECK=1    APK debuggable check を skip (Sess77 Follow-up、 緊急時のみ)
#   AUTO_FIX_DEBUGGABLE=1      Release/Preview build 検出時、 自動で uninstall + dev APK install
#                              (★ DB データ wipe 注意、 default: 0 = warn のみで exit 1)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FLAG_PATH="${PROJECT_ROOT}/dist/.native-dirty"

# Sess77 Follow-up T3: 共通変数は Step 0.5 で 使うため 冒頭で定義 (旧版は L67-72 で 定義していた)
PACKAGE="com.dooooraku.bonsailog"
METRO_PORT=8081
DEVICE_FLAG=""
if [ -n "${ADB_DEVICE_SERIAL:-}" ]; then
  DEVICE_FLAG="-s ${ADB_DEVICE_SERIAL}"
fi
DEV_APK_PATH="${PROJECT_ROOT}/dist/bonsailog-dev.apk"

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

# Step 0.5: APK debuggable check (Sess77 Follow-up T3)
# Release/Preview build (debuggable=false) が installed されていると、 アプリは Metro bundle ではなく
# **embedded bundle** (APK 内蔵 JS) を 使用するため、 最新コードが 反映されない (= 10 分以上ロス事例 Sess77)。
# 検出: `adb shell dumpsys package <pkg> | grep "pkgFlags=" | grep "DEBUGGABLE"` で 判定
# 対処: dev APK 再 install (DB wipe 注意)、 SKIP_DEBUGGABLE_CHECK=1 で 強制 skip 可
if [ "${SKIP_DEBUGGABLE_CHECK:-0}" != "1" ]; then
  # パッケージ未 install なら skip (= clean install シナリオ、 後の adb install で 対処可)
  # 注 1: adb shell 出力は CRLF (\r\n) なので `tr -d '\r'` で 正規化必須 (Sess77 Follow-up 検出罠)
  # 注 2: `set -o pipefail` + `grep -q` は 早期 exit で 上流 SIGPIPE (rc=141) → 偽 false 検出。
  #       `grep -c` (常に 全 input 読込) + `|| true` で pipefail 安全 + count 判定で 回避。
  PKG_COUNT="$(adb ${DEVICE_FLAG} shell pm list packages 2>/dev/null | tr -d '\r' | grep -c "^package:${PACKAGE}$" || true)"
  if [ "${PKG_COUNT}" -gt 0 ]; then
    PKG_FLAGS="$(adb ${DEVICE_FLAG} shell dumpsys package "${PACKAGE}" 2>/dev/null | tr -d '\r' | grep -E "^\s*pkgFlags=" | head -1 || true)"
    DBG_COUNT="$(echo "${PKG_FLAGS}" | grep -c "DEBUGGABLE" || true)"
    if [ "${DBG_COUNT}" -gt 0 ]; then
      echo "[reload-app] ✅ APK debuggable=true (Dev Build)、 Metro bundle 反映可"
    else
      echo "[reload-app] ⚠️  APK debuggable=false 検出 (Release/Preview build)"
      echo "[reload-app]    pkgFlags: ${PKG_FLAGS}"
      echo "[reload-app]    → embedded bundle を 使用するため、 Metro bundle が 反映されません"
      echo "[reload-app]    → Sess76 release APK が 残っている可能性、 dev APK への 切替推奨"
      echo ""
      if [ "${AUTO_FIX_DEBUGGABLE:-0}" = "1" ]; then
        if [ ! -f "${DEV_APK_PATH}" ]; then
          echo "[reload-app] ❌ AUTO_FIX_DEBUGGABLE=1 だが dev APK 不在: ${DEV_APK_PATH}"
          echo "[reload-app]    先に `pnpm build:android:dev:local` で 作成してください"
          exit 1
        fi
        echo "[reload-app] AUTO_FIX_DEBUGGABLE=1 → uninstall + dev APK install を 自動実行"
        echo "[reload-app] ★ DB データ wipe されます (= 既存 盆栽 / 記録 / 写真 全削除)"
        echo "[reload-app] キャンセルする場合は 5 秒以内に Ctrl+C"
        sleep 5
        echo "[reload-app] uninstall ${PACKAGE}"
        adb ${DEVICE_FLAG} uninstall "${PACKAGE}"
        echo "[reload-app] install ${DEV_APK_PATH}"
        adb ${DEVICE_FLAG} install "${DEV_APK_PATH}"
        echo "[reload-app] ✅ dev APK 切替完了"
      else
        echo "[reload-app] 対処方法:"
        echo "[reload-app]   (a) dev APK へ 切替 (DB wipe 伴う):"
        echo "[reload-app]       adb uninstall ${PACKAGE} && adb install ${DEV_APK_PATH}"
        echo "[reload-app]   (b) Auto fix で 上記を 自動実行 (5秒 grace period 付き):"
        echo "[reload-app]       AUTO_FIX_DEBUGGABLE=1 bash scripts/dev/reload-app.sh"
        echo "[reload-app]   (c) 今回だけ skip (Metro 反映不可なので 検証は 期待通り動かない):"
        echo "[reload-app]       SKIP_DEBUGGABLE_CHECK=1 bash scripts/dev/reload-app.sh"
        echo "[reload-app]   (d) ローカル dev APK が 存在しない 場合は 先に build:"
        echo "[reload-app]       pnpm build:android:dev:local"
        exit 1
      fi
    fi
  else
    echo "[reload-app] パッケージ未 install (= clean install scenario)、 debuggable check skip"
  fi
else
  echo "[reload-app] SKIP_DEBUGGABLE_CHECK=1, skipping APK debuggable check"
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
