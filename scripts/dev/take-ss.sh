#!/usr/bin/env bash
# scripts/dev/take-ss.sh — adb 実機 スクリーンショット撮影 helper (Sess91 PR-A 起票)
#
# 役割:
#   adb 実機から SS (= PNG) を 連番命名 + dir 自動管理 で取得する。 Sess77/89/90 で 3 回再発した
#   「`adb shell screencap > file.png` の WSL bash CRLF 変換 罠」 を構造的に回避し、 PNG ヘッダー
#   破損時は即 検出 + 削除 + exit 1。
#
# 罠の詳細 (= 3 回再発の経緯):
#   - Sess77 / Sess89 / Sess90 で同型問題が再発、 SS 撮影時 PNG 解析が失敗していた。
#   - 原因: `adb shell screencap -p` は shell session 経由で stdout を出し、 WSL 内 bash が
#     PNG bytes 中の `\n` (= 0x0a) を `\r\n` (= 0x0d 0x0a) に変換することがある。
#   - 結果: PNG header (= 0x89 PNG 0x0d 0x0a 0x1a 0x0a) の `0x0d 0x0a` が `0x0d 0x0d 0x0a` に
#     なり、 file 形式判定で「data」 (= 不明) になる。 ImageMagick は読めない、 Claude も読めない。
#   - 解決: `adb exec-out` は shell session を介さず stdout を 直接 binary stream として渡す。
#
# 使い方:
#   bash scripts/dev/take-ss.sh <name> [session-tag]
#
#   例 1: 単発撮影 (tag は自動)
#     bash scripts/dev/take-ss.sh tags-light
#     → dist/ss-2026-06-10-1900/SS-01-tags-light.png + REPORT.md 雛形
#
#   例 2: session-tag 指定 (= 同 session の連続撮影で再利用)
#     bash scripts/dev/take-ss.sh tags-light sess91
#     bash scripts/dev/take-ss.sh tags-dark sess91
#     → 同 dist/sess91-verify-<timestamp>/ に SS-01 + SS-02 連番保存
#
#   例 3: env で session-tag 永続化
#     export TAKE_SS_TAG=sess91
#     bash scripts/dev/take-ss.sh tags-light    # → sess91 dir に保存
#
# 環境変数:
#   TAKE_SS_TAG          session-tag デフォルト (= 引数 2 と同等)
#   ADB_DEVICE_SERIAL    device 指定 (= 既存 reload-app.sh と同 pattern、 複数 device 接続時用)
#   TAKE_SS_REUSE_WINDOW  既存 dir 再利用の時間窓 (= 分単位、 default 60)
#
# 出力:
#   - dist/<tag>-verify-<YYYY-MM-DD-HHMM>/SS-<連番 2 桁>-<name>.png
#   - dist/<tag>-verify-<YYYY-MM-DD-HHMM>/REPORT.md (= 新規 dir 作成時のみ、 雛形)
#   - stdout に 保存 path 1 行 (= caller script で利用可)
#
# 終了コード:
#   0 = 成功 (= PNG 取得 + ヘッダー確認)
#   1 = adb 失敗 / PNG header 破損 / 引数不足
#
# 関連:
#   - 由来: Sess90 retro 改善策 #1 (= dist/sess90-verify/2026-06-10-0547/REPORT.md)
#   - 既存: scripts/dev/reload-app.sh (= adb 操作 pattern + 環境変数 documenting)
#   - lessons: docs/reference/tasks/lessons/retro.md Sess90 entry「教訓 5 (= adb exec-out)」

set -euo pipefail

# --- 引数チェック ----------------------------------------------------------
if [[ $# -lt 1 || -z "${1:-}" ]]; then
  echo "ERROR: usage: bash scripts/dev/take-ss.sh <name> [session-tag]" >&2
  echo "       例: bash scripts/dev/take-ss.sh tags-light sess91" >&2
  exit 1
fi
NAME="$1"
TAG="${2:-${TAKE_SS_TAG:-ss}}"
REUSE_WINDOW="${TAKE_SS_REUSE_WINDOW:-60}"

# --- adb 接続確認 ----------------------------------------------------------
ADB_ARGS=()
if [[ -n "${ADB_DEVICE_SERIAL:-}" ]]; then
  ADB_ARGS+=(-s "$ADB_DEVICE_SERIAL")
fi
if ! adb "${ADB_ARGS[@]}" get-state >/dev/null 2>&1; then
  echo "ERROR: adb device 未接続 (= ADB_DEVICE_SERIAL='${ADB_DEVICE_SERIAL:-}' or default)" >&2
  echo "       'adb devices' で接続確認、 USB ケーブル + USB debugging を確認してください。" >&2
  exit 1
fi

# --- dir 自動管理 ----------------------------------------------------------
# REUSE_WINDOW 分以内に作成された同 tag dir があれば再利用、 なければ新規作成
DIR=""
if [[ -d dist ]]; then
  CANDIDATE=$(find dist -maxdepth 1 -type d -name "${TAG}-verify-*" -mmin "-${REUSE_WINDOW}" 2>/dev/null | sort -r | head -1)
  if [[ -n "$CANDIDATE" ]]; then
    DIR="$CANDIDATE"
  fi
fi
if [[ -z "$DIR" ]]; then
  TS=$(date +%Y-%m-%d-%H%M)
  DIR="dist/${TAG}-verify-${TS}"
  mkdir -p "$DIR"
  # --- REPORT.md 雛形 (= 新規 dir 作成時のみ) -----------------------------
  DEVICE_MODEL=$(adb "${ADB_ARGS[@]}" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "(unknown)")
  cat > "$DIR/REPORT.md" <<EOF
# ${TAG} 実機検証 REPORT

**実施日時**: $(date '+%Y-%m-%d %H:%M %Z')
**device**: ${DEVICE_MODEL} (= ${ADB_DEVICE_SERIAL:-default device})
**main HEAD**: $(git -C "$(dirname "$0")/../.." rev-parse --short HEAD 2>/dev/null || echo "(unknown)")
**取得 SS**: 0 (撮影完了後、 ls 結果を以下に貼付)

---

## 検証結果サマリ

(撮影後 ここに記入: bug fix 確認 / regression check / 期待動作整合)

---

## 取得 SS 一覧

| # | file | screen | mode | 確認内容 |
| - | ---- | ------ | ---- | -------- |

---

## 学び

(adb 罠 / 座標誤認識 / framework 罠 等、 session 内で 出た知見を追記)

---

## 関連 PR

- (PR 番号と title を貼付)
EOF
fi

# --- 連番計算 + SS 撮影 ---------------------------------------------------
N=$(find "$DIR" -maxdepth 1 -name "SS-*.png" 2>/dev/null | wc -l)
NEXT=$(printf "%02d" $((N + 1)))
OUT="$DIR/SS-${NEXT}-${NAME}.png"

# adb exec-out で binary-safe (= CRLF 変換罠回避)
if ! adb "${ADB_ARGS[@]}" exec-out screencap -p > "$OUT" 2>/dev/null; then
  echo "ERROR: adb exec-out screencap 失敗" >&2
  rm -f "$OUT"
  exit 1
fi

# --- PNG ヘッダー verify (= 罠再発時の即検出) -----------------------------
if ! file -b "$OUT" 2>/dev/null | grep -q "^PNG image data"; then
  echo "ERROR: 出力 file が PNG ではない (= adb 罠再発の可能性)" >&2
  echo "       file -b 出力: $(file -b "$OUT" 2>/dev/null || echo '(file 判定失敗)')" >&2
  echo "       破損 file を削除します: $OUT" >&2
  rm -f "$OUT"
  exit 1
fi

echo "$OUT"
