#!/usr/bin/env bash
# scripts/ui-diff/capture-with-logs.sh
# capture-app.sh の wrapper。Maestro flow 実行と並行して logcat を捕捉し、
# 失敗時には uiautomator dump + summary.md を生成して Claude が解析できる形にする。
#
# 役割:
#   1. logcat バッファクリア (古いログを除外)
#   2. logcat を background で <out_dir>/logcat.log に書き出し
#   3. 既存 capture-app.sh を実行 (Maestro flow + adb screencap)
#   4. logcat を停止
#   5. 失敗時: uiautomator dump → <out_dir>/ui-hierarchy.xml
#   6. 必ず summary.md 生成 (Claude が Read で全文読める 50 行以内)
#
# 使い方:
#   bash scripts/ui-diff/capture-with-logs.sh <screen_id> <out_dir>
#
# 例:
#   bash scripts/ui-diff/capture-with-logs.sh paywall scripts/ui-diff/out/sess3-test/paywall

set -euo pipefail

SCREEN_ID="${1:?screen_id is required}"
OUT_DIR="${2:?out_dir is required}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CAPTURE_SH="$ROOT/scripts/ui-diff/capture-app.sh"

# debug_common.sh の helper (run_adb / info / warn / error / check_device) を流用
# shellcheck source=../debug/debug_common.sh
source "$ROOT/scripts/debug/debug_common.sh"
# shellcheck source=../debug/debug.config.sh
source "$ROOT/scripts/debug/debug.config.sh"

mkdir -p "$OUT_DIR"

LOGCAT_FILE="$OUT_DIR/logcat.log"
SUMMARY_FILE="$OUT_DIR/summary.md"
UI_HIER_FILE="$OUT_DIR/ui-hierarchy.xml"

# 1. logcat バッファクリア
run_adb logcat -c 2>/dev/null || true

# 2. logcat を background で書き出し (Maestro 起動前のクリーンな状態から)
run_adb logcat -v threadtime > "$LOGCAT_FILE" 2>&1 &
LOGCAT_PID=$!

# 終了時に必ず logcat を kill
cleanup() {
  if kill -0 "$LOGCAT_PID" 2>/dev/null; then
    kill "$LOGCAT_PID" 2>/dev/null || true
    wait "$LOGCAT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# 3. capture-app.sh を実行 (本体)
echo "[capture-with-logs] capture-app.sh $SCREEN_ID $OUT_DIR"
set +e
bash "$CAPTURE_SH" "$SCREEN_ID" "$OUT_DIR"
RC=$?
set -e

# 4. logcat 停止 (trap cleanup で kill されるが、明示的に止めることで grep が安定)
cleanup
trap - EXIT INT TERM

# 5. 失敗時: uiautomator dump (Claude が orphan testID 検出に使う)
if [ "$RC" -ne 0 ]; then
  run_adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  run_adb exec-out cat /sdcard/ui.xml > "$UI_HIER_FILE" 2>/dev/null || true
fi

# 6. summary.md 生成 (Claude が Read で読む、50 行以内)
{
  echo "# UI Diff Capture Summary: $SCREEN_ID"
  echo ""
  echo "- **Result**: $([ "$RC" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL (rc=$RC)")"
  echo "- **Timestamp**: $(date -Iseconds)"
  echo "- **Out dir**: \`$OUT_DIR\`"
  if [ -f "$OUT_DIR/app/$SCREEN_ID.png" ]; then
    SIZE=$(du -h "$OUT_DIR/app/$SCREEN_ID.png" | awk '{print $1}')
    echo "- **Screenshot**: \`app/$SCREEN_ID.png\` ($SIZE)"
  fi
  echo "- **Logcat**: \`logcat.log\` ($(wc -l < "$LOGCAT_FILE" 2>/dev/null || echo 0) lines)"
  [ -f "$UI_HIER_FILE" ] && echo "- **UI hierarchy** (failure only): \`ui-hierarchy.xml\` ($(wc -l < "$UI_HIER_FILE" 2>/dev/null || echo 0) lines)"
  echo ""
  # 失敗時のみ logcat から error / fatal を抽出 (10 行以内)
  if [ "$RC" -ne 0 ] && [ -f "$LOGCAT_FILE" ]; then
    echo "## Logcat errors (last 10)"
    echo '```'
    grep -iE 'FATAL|Exception|Error|ANR|CRASH' "$LOGCAT_FILE" 2>/dev/null | tail -10 || echo "(no fatal/exception lines)"
    echo '```'
  fi
} > "$SUMMARY_FILE"

echo "[capture-with-logs] $SCREEN_ID: $([ "$RC" -eq 0 ] && echo PASS || echo "FAIL ($RC)") | summary: $SUMMARY_FILE"
exit "$RC"
