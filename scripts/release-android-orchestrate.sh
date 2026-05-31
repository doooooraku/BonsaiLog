#!/usr/bin/env bash
#
# release-android-orchestrate.sh — Android Closed Testing 自動 Submit パイプライン (Sess61 PR2+PR6+PR7)
#
# 9 ステップを順次実行 (介入度 3 = 全自動代行 + 完全ログ落とし):
#   0. release-log.mjs init       — タイムスタンプ + ログディレクトリ発行 + .current 永続化 (PR6)
#   1. preflight --auto-fix       — 30 項目検査 + 自動修復
#   2. snapshot before            — Play Console 状態を撮影
#   3. build:android:aab:local    — AAB ビルド (約 12 分、 PR7: nohup 撤回でシンプル化)
#   4. eas submit --wait          — EAS Submit (PR7: --wait モードで Submit ジョブ完了まで CLI 待機)
#                                   → 完了確認後にしか次の step に進まないため snapshot との edit 干渉なし
#   4.5 setReleaseNotes (PR6)     — fastlane/metadata から release notes を Publisher API で別途 PUT
#                                   (EAS Submit は release notes を扱わない公式仕様のため)
#   5. snapshot after             — Play Console 状態を再撮影 (Submit 完了済みなので即時取得可)
#   6. release-diff               — 差分検証 (critical: draft +1, versionCode +1 / warning: whatsnew, 経過時間)
#   7. release-log summary        — summary.md 整形
#   8. release-log cleanup        — 直近 10 リリース分のみ保持 (.current は温存)
#
# PR7 改善点:
#   - Step 3 の nohup wrap 撤回 (PR6 で導入したが wait が機能せず親シェルが先 exit する事象)
#   - Step 4 の --no-wait → --wait モード化 (Submit ジョブ完了を CLI が待機、 snapshot との edit 干渉防止)
#   - WSL2 session 切断耐性は GitHub Actions fallback (build-android-play.yml) で代替
#
# 失敗時: 該当ステップで非 0 終了し、 後続をスキップ (set -e)。 ログは dist/release-logs/<TS>-android/ に残る。
#
# Usage: bash scripts/release-android-orchestrate.sh
#
# 環境:
#   PATH=/usr/bin:/bin:... (WSL2 PATH literal ${PATH} 罠回避、 lessons/wsl2-environment 参照)

set -e
set -o pipefail

# WSL2 PATH 安定化
export PATH="/usr/bin:/bin:/home/doooo/.nvm/versions/node/v22.21.0/bin:/home/doooo/.nvm/versions/node/v20.19.6/bin:${PATH}"

echo "=================================================================="
echo "🌱 BonsaiLog Android Release Pipeline (Sess61 PR2+PR6+PR7)"
echo "=================================================================="

# Step 0: ログディレクトリ発行 + .current 永続化 (PR6)
TS=$(node scripts/release-log.mjs init)
export RELEASE_LOG_TS="${TS}"
LOG_DIR="dist/release-logs/${TS}-android"
echo "📁 Log directory: ${LOG_DIR}"
echo "📌 RELEASE_LOG_TS=${TS} (永続化: dist/release-logs/.current)"
echo ""

# Step 1: Preflight + auto-fix
echo "── Step 1/8: Preflight (検査 + 自動修復) ──"
node scripts/preflight-android-release.mjs --auto-fix
echo ""

# Step 2: Snapshot before
echo "── Step 2/8: Snapshot before (Publisher API 撮影) ──"
node scripts/release-snapshot.mjs before "${TS}"
echo ""

# Step 3: Build (PR7: nohup 撤回、 シンプル化)
echo "── Step 3/8: AAB ビルド (約 12 分) ──"
pnpm build:android:aab:local 2>&1 | tee "${LOG_DIR}/03-build.log"
BUILD_EXIT=${PIPESTATUS[0]}
if [ ${BUILD_EXIT} -ne 0 ]; then
  echo "❌ AAB build failed (exit=${BUILD_EXIT})"
  exit ${BUILD_EXIT}
fi
echo ""

# Step 4: Submit (PR7: --wait モード化、 Submit ジョブ完了まで CLI 待機)
echo "── Step 4/8: EAS Submit (track=alpha, draft、 --wait モードで完了確認) ──"
npx eas-cli@latest submit -p android \
  --path dist/app-production.aab \
  --profile production \
  --non-interactive \
  --wait \
  2>&1 | tee "${LOG_DIR}/04-submit.log"
SUBMIT_EXIT=${PIPESTATUS[0]}
if [ ${SUBMIT_EXIT} -ne 0 ]; then
  echo "❌ EAS Submit failed (exit=${SUBMIT_EXIT})"
  echo "💡 詳細は Submission Details URL or expo-graphql で確認可能"
  exit ${SUBMIT_EXIT}
fi
echo ""

# Step 4.5: setReleaseNotes (PR6 新規 = EAS が扱わない release notes を Publisher API で別途 PUT)
# PR7: --wait で Submit 完了確認済みなので即時 snapshot 可、 sleep 不要
echo "── Step 4.5/8: Release Notes 別途 PUT (Publisher API) ──"
# まず snapshot を一度取って draft の versionCode を確認
node scripts/release-snapshot.mjs after "${TS}"
# release notes 投稿
node scripts/release-set-notes.mjs "${TS}" 2>&1 | tee -a "${LOG_DIR}/04-submit.log"
echo ""

# Step 5: Snapshot after (release notes 反映後の最終状態)
echo "── Step 5/8: Snapshot after (release notes 反映確認) ──"
sleep 10
node scripts/release-snapshot.mjs after "${TS}"
echo ""

# Step 6: Diff
echo "── Step 6/8: 差分検証 (critical のみで判定、 warning は 注意のみ) ──"
node scripts/release-diff.mjs
echo ""

# Step 7: Summary
echo "── Step 7/8: Summary 生成 ──"
node scripts/release-log.mjs summary
echo ""

# Step 8: Cleanup (PR6: .current は温存)
echo "── Step 8/8: 古いログのクリーンアップ ──"
node scripts/release-log.mjs cleanup
echo ""

echo "=================================================================="
echo "✅ Release pipeline completed."
echo "📄 Summary: ${LOG_DIR}/summary.md"
echo "👉 次にやること: Play Console で「ロールアウトを開始」 1 クリック"
echo ""
echo "💡 PC オフライン / WSL2 切断時の fallback:"
echo "   git tag v0.x.y && git push --tags"
echo "   → GitHub Actions (build-android-play.yml) でサーバー側自動実行"
echo "=================================================================="
