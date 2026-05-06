#!/usr/bin/env bash
# scripts/ui-diff/capture-app.sh
# Maestro flow で対象画面を表示し、adb exec-out screencap で実機スクショを取得する。
# 引数: <screen_id> <out_dir>

set -euo pipefail

SCREEN_ID="${1:?screen_id is required}"
OUT_DIR="${2:?out_dir is required}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FLOW="$ROOT/maestro/flows/ui-diff/${SCREEN_ID}.yml"
MAESTRO="${MAESTRO_BIN:-/home/doooo/.maestro/bin/maestro}"
ADB="${ADB_BIN:-/usr/local/bin/adb}"

if [ ! -f "$FLOW" ]; then
  echo "[capture-app] ERROR: maestro flow not found: $FLOW" >&2
  exit 1
fi

if [ ! -x "$MAESTRO" ]; then
  echo "[capture-app] ERROR: maestro CLI not found: $MAESTRO" >&2
  exit 1
fi

if [ ! -x "$ADB" ]; then
  echo "[capture-app] ERROR: adb not found: $ADB" >&2
  exit 1
fi

mkdir -p "$OUT_DIR/app"

# 接続確認 (authorized device が 1 台以上)
# WSL2 の adb ラッパーは Windows 改行 (CR/LF) を返すため、tr -d '\r' で CR を削ってから awk に渡す。
if ! "$ADB" devices | tr -d '\r' | awk 'NR>1 && $2=="device" {found=1} END {exit !found}'; then
  echo "[capture-app] ERROR: no authorized adb device. run '$ADB devices' to confirm." >&2
  exit 1
fi

# 1. Maestro flow で画面遷移 (このあと画面はそのまま残る)
echo "[capture-app] running maestro flow: $FLOW"
"$MAESTRO" test "$FLOW"

# 2. 描画安定のため 0.5 秒待機
sleep 0.5

# 3. adb で実機スクショ (device 上に保存 → pull で取得)
#    NOTE: 'adb exec-out screencap -p > out.png' は WSL2 の Windows ADB ラッパー経由だと
#          stdout に CRLF 変換が入り PNG バイナリが壊れる (真っ黒な PNG になる)。
#          'adb shell screencap -p <device path>' でデバイス上に保存してから 'adb pull'
#          で取得する方式は CRLF を経由しないため安全。
OUT_PATH="$OUT_DIR/app/${SCREEN_ID}.png"
DEVICE_TMP="/sdcard/_uidiff_${SCREEN_ID}.png"
echo "[capture-app] adb shell screencap -p $DEVICE_TMP -> pull -> $OUT_PATH"
"$ADB" shell rm -f "$DEVICE_TMP" 2>/dev/null || true
"$ADB" shell screencap -p "$DEVICE_TMP"
"$ADB" pull "$DEVICE_TMP" "$OUT_PATH" >/dev/null
"$ADB" shell rm -f "$DEVICE_TMP" 2>/dev/null || true

# 4. ファイルサイズ確認 (空ファイル / 失敗検出)
SIZE=$(stat -c%s "$OUT_PATH")
if [ "$SIZE" -lt 1000 ]; then
  echo "[capture-app] ERROR: screenshot too small (${SIZE} bytes). adb screencap failed." >&2
  exit 1
fi

echo "[capture-app] saved: $OUT_PATH ($((SIZE / 1024)) KB)"
