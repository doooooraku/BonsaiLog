#!/usr/bin/env bash
#
# release-android-orchestrate.sh — Android Closed Testing 自動 Submit パイプライン (Sess62 PR2 改修版)
#
# Sess62 PR2 (cloud-first migration):
#   - AAB build / Submit / Snapshot / Release notes / Diff は GitHub Actions workflow に移動
#     (build-android-play.yml が 4 steps 追加で同等機能を提供)
#   - 本 orchestrate.sh は「ローカル → クラウド trigger + artifact DL + smoke test」 に役割転換
#   - ★ PC が落ちる原因 = ローカル Gradle build を構造的に廃止 ★
#
# 7 ステップを順次実行:
#   0. release-log.mjs init       — タイムスタンプ + ログディレクトリ発行 + .current 永続化
#   1. preflight --auto-fix       — 30 項目検査 + 自動修復 (ローカル状態確認のみ)
#   2. cloud trigger              — gh workflow run + run-id 取得
#   3. gh run watch               — workflow 完了まで監視 (約 35 分 = 実測 33-35 分、 Claude が口頭中継)
#   4. gh run download            — AAB artifact + release-logs artifact をローカル DL
#   5. smoke test                 — 実機接続あれば adb で起動確認、 なければ skip
#   6. release-log summary        — summary.md 整形
#   7. release-log cleanup        — 直近 10 リリース分のみ保持
#
# 廃止 phase (= workflow に移動):
#   旧 Step 2 snapshot before     → workflow step
#   旧 Step 3 AAB build (★PC 落ちる主犯★) → workflow step (cloud runner)
#   旧 Step 4 EAS Submit          → workflow step
#   旧 Step 4.5 setReleaseNotes   → workflow step
#   旧 Step 5 snapshot after      → workflow step
#   旧 Step 6 diff                → workflow step
#
# 失敗時: 該当ステップで非 0 終了し、 後続をスキップ (set -e)。
#
# Usage:
#   pnpm release:android                    # cloud trigger + watch + DL + smoke test
#   pnpm release:android -- --skip-cloud    # 既存 artifact を使って smoke test のみ (再実行用)
#   pnpm release:android -- --skip-smoke    # cloud trigger + DL のみ (smoke test スキップ)
#
# 環境:
#   PATH=/usr/bin:/bin:... (WSL2 PATH literal ${PATH} 罠回避、 lessons/wsl2-environment 参照)
#   gh auth status で GitHub CLI 認証済みであること

set -e
set -o pipefail

# WSL2 PATH 安定化
export PATH="/usr/bin:/bin:/home/doooo/.local/bin:/home/doooo/.nvm/versions/node/v22.21.0/bin:/home/doooo/.nvm/versions/node/v20.19.6/bin:${PATH}"

# 引数 parse
SKIP_CLOUD=0
SKIP_SMOKE=0
for arg in "$@"; do
  case "${arg}" in
    --skip-cloud)
      SKIP_CLOUD=1
      ;;
    --skip-smoke)
      SKIP_SMOKE=1
      ;;
    *)
      ;;
  esac
done

echo "=================================================================="
echo "🌱 BonsaiLog Android Release Pipeline (Sess62 PR2: cloud-first)"
echo "=================================================================="

# Step 0: ログディレクトリ発行 + .current 永続化
TS=$(node scripts/release-log.mjs init)
export RELEASE_LOG_TS="${TS}"
LOG_DIR="dist/release-logs/${TS}-android"
echo "📁 Log directory: ${LOG_DIR}"
echo "📌 RELEASE_LOG_TS=${TS}"
echo ""

# Step 1: Preflight (ローカル状態確認のみ、 auto-fix は走らせるがクラウド build には影響しない)
echo "── Step 1/7: Preflight (ローカル状態検査 + 自動修復) ──"
node scripts/preflight-android-release.mjs --auto-fix
echo ""

# Step 2: Cloud trigger (gh workflow run)
if [ ${SKIP_CLOUD} -eq 0 ]; then
  echo "── Step 2/7: GitHub Actions workflow trigger ──"

  # gh CLI 認証確認
  if ! gh auth status >/dev/null 2>&1; then
    echo "❌ gh CLI 未認証。 'gh auth login' を実行してください。"
    exit 1
  fi

  # main ブランチに居ることを確認 (cloud build は main 基準)
  CUR_BRANCH=$(git branch --show-current)
  if [ "${CUR_BRANCH}" != "main" ]; then
    echo "⚠️  現在 ${CUR_BRANCH} ブランチ。 cloud build は main で実行されます。"
    echo "    'git checkout main && git pull' で切り替えてから再実行を推奨。"
  fi

  # workflow_dispatch で trigger
  echo "🚀 gh workflow run build-android-play.yml --ref main"
  gh workflow run build-android-play.yml --ref main
  echo "⏳ workflow 起動を 5 秒待機..."
  sleep 5

  # 直近の run-id 取得
  RUN_ID=$(gh run list --workflow=build-android-play.yml --limit 1 --json databaseId --jq '.[0].databaseId')
  if [ -z "${RUN_ID}" ]; then
    echo "❌ run-id 取得失敗"
    exit 1
  fi
  echo "🆔 RUN_ID=${RUN_ID}"
  echo "${RUN_ID}" > "${LOG_DIR}/.run-id"
  echo ""

  # Step 3: gh run watch (workflow 完了まで監視)
  echo "── Step 3/7: workflow 完了監視 (約 15 分) ──"
  gh run watch "${RUN_ID}" --exit-status 2>&1 | tee "${LOG_DIR}/03-cloud-build.log"
  WATCH_EXIT=${PIPESTATUS[0]}
  if [ ${WATCH_EXIT} -ne 0 ]; then
    echo "❌ workflow run failed (exit=${WATCH_EXIT})"
    echo "💡 詳細: gh run view ${RUN_ID} --log-failed"
    exit ${WATCH_EXIT}
  fi
  echo ""

  # Step 4: gh run download (AAB + release-logs artifact 取得)
  echo "── Step 4/7: artifact ダウンロード (AAB + release-logs) ──"
  mkdir -p dist
  gh run download "${RUN_ID}" -n "Android-AAB-${RUN_ID}" -D dist/ || {
    echo "⚠️  AAB artifact DL 失敗 (workflow が AAB を出力していない可能性)"
  }
  gh run download "${RUN_ID}" -n "Android-release-logs-${RUN_ID}" -D "${LOG_DIR}/cloud-logs/" || {
    echo "⚠️  release-logs artifact DL 失敗 (workflow 側で release-logs が生成されていない可能性)"
  }
  if [ -f "dist/app-production.aab" ]; then
    echo "✅ dist/app-production.aab ($(stat -c %s dist/app-production.aab) bytes)"
  fi
  echo ""
else
  echo "── Step 2-4/7: ⏩ --skip-cloud で cloud trigger スキップ ──"
  echo "    既存 dist/app-production.aab を使って smoke test に進みます"
  echo ""
fi

# Step 5: Smoke test (ローカルでしかできない実機起動確認)
if [ ${SKIP_SMOKE} -eq 0 ]; then
  echo "── Step 5/7: Smoke test (実機 install + 起動確認) ──"

  if ! command -v adb >/dev/null 2>&1; then
    echo "⚠️  adb コマンド未検出 — smoke test スキップ"
  elif ! adb devices 2>&1 | grep -qE "device$"; then
    echo "⚠️  認可済の Android 端末未接続 — smoke test スキップ"
    echo "    USB 接続 + USB デバッグ許可 ダイアログで OK してから再実行可能:"
    echo "    pnpm release:android -- --skip-cloud"
  elif [ ! -f "dist/app-production.aab" ]; then
    echo "⚠️  dist/app-production.aab が無い — smoke test スキップ"
  else
    echo "📱 接続済端末: $(adb devices | grep device$ | head -1 | cut -f1)"
    SMOKE_LOG="${LOG_DIR}/05-smoke-test.log"
    {
      echo "=== Smoke test started at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
      echo "=== Uninstall old version (Play 配信版 or 前回 local) ==="
      adb uninstall com.dooooraku.bonsailog 2>&1 || echo "(skipped uninstall)"

      echo "=== bundletool で apks 抽出 (connected device 専用) ==="
      BUNDLETOOL_JAR="${HOME}/.local/share/bundletool-all.jar"
      KEYSTORE="${HOME}/.android/debug.keystore"
      if [ ! -f "${BUNDLETOOL_JAR}" ] || [ ! -f "${KEYSTORE}" ]; then
        echo "❌ bundletool-all.jar or debug.keystore 未設定 — smoke test を実行できません"
        echo "  必要: ${BUNDLETOOL_JAR}, ${KEYSTORE}"
        exit 0
      fi
      java -jar "${BUNDLETOOL_JAR}" build-apks \
        --bundle=dist/app-production.aab \
        --output=/tmp/bonsai-smoke.apks \
        --connected-device \
        --overwrite \
        --ks="${KEYSTORE}" \
        --ks-key-alias=androiddebugkey \
        --ks-pass=pass:android \
        --key-pass=pass:android

      echo "=== Install apks ==="
      java -jar "${BUNDLETOOL_JAR}" install-apks --apks=/tmp/bonsai-smoke.apks

      echo "=== Clear logcat + launch app ==="
      adb logcat -c
      adb shell monkey -p com.dooooraku.bonsailog -c android.intent.category.LAUNCHER 1
      sleep 10

      echo "=== Crash buffer dump ==="
      CRASH_OUT=$(adb logcat -d -b crash 2>&1)
      RUNTIME_OUT=$(adb logcat -d AndroidRuntime:E '*:S' 2>&1 | head -100)

      if echo "${CRASH_OUT}" | grep -qE "FATAL EXCEPTION.*com.dooooraku.bonsailog"; then
        echo "❌ Smoke test FAILED: FATAL EXCEPTION in crash buffer"
        echo "${CRASH_OUT}" | head -50
        exit 1
      elif echo "${RUNTIME_OUT}" | grep -qE "FATAL EXCEPTION.*com.dooooraku.bonsailog"; then
        echo "❌ Smoke test FAILED: FATAL EXCEPTION in AndroidRuntime"
        echo "${RUNTIME_OUT}" | head -50
        exit 1
      else
        echo "✅ Smoke test PASSED: no FATAL EXCEPTION"
      fi

      echo "=== Screenshot ==="
      adb shell screencap -p /sdcard/smoke-test.png
      adb pull /sdcard/smoke-test.png "${LOG_DIR}/05-smoke-test.png" 2>&1 | tail -3

      echo "=== Smoke test ended at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
    } 2>&1 | tee "${SMOKE_LOG}"
  fi
  echo ""
else
  echo "── Step 5/7: ⏩ --skip-smoke で smoke test スキップ ──"
  echo ""
fi

# Step 6: Summary
echo "── Step 6/7: Summary 生成 ──"
node scripts/release-log.mjs summary 2>&1 || echo "(summary 生成 skipped、 cloud-logs/ が必要)"
echo ""

# Step 7: Cleanup
echo "── Step 7/7: 古いログのクリーンアップ ──"
node scripts/release-log.mjs cleanup
echo ""

echo "=================================================================="
echo "✅ Release pipeline completed."
echo ""
echo "📁 ローカルログ: ${LOG_DIR}/"
echo "📁 クラウドログ: ${LOG_DIR}/cloud-logs/"
if [ -f "${LOG_DIR}/.run-id" ]; then
  echo "🌐 GitHub Actions run: https://github.com/doooooraku/BonsaiLog/actions/runs/$(cat ${LOG_DIR}/.run-id)"
fi
echo ""
echo "👉 次にやること:"
echo "   1. Play Console → クローズドテスト → Alpha → 「ロールアウトを開始」 を 1 クリック"
echo "   2. テスター 12 人の端末で起動確認"
echo ""
echo "💡 緊急時 fallback (gh CLI が使えない / GitHub Actions 障害):"
echo "   git tag v0.x.y && git push --tags"
echo "   → tag push trigger で workflow 自動起動"
echo "=================================================================="
