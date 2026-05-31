#!/usr/bin/env bash
#
# release-android-orchestrate.sh — Android Closed Testing 自動 Submit パイプライン (Sess61 PR2+PR6)
#
# 9 ステップを順次実行 (介入度 3 = 全自動代行 + 完全ログ落とし):
#   0. release-log.mjs init       — タイムスタンプ + ログディレクトリ発行 + .current 永続化 (PR6)
#   1. preflight --auto-fix       — 30 項目検査 + 自動修復
#   2. snapshot before            — Play Console 状態を撮影
#   3. build:android:aab:local    — AAB ビルド (nohup wrap で session 切断耐性、 PR6)
#   4. submit:android             — EAS Submit (track=alpha, draft)
#   4.5 setReleaseNotes (PR6)     — fastlane/metadata から release notes を Publisher API で別途 PUT
#                                   (EAS Submit は release notes を扱わない公式仕様のため)
#   5. snapshot after             — Play Console 状態を再撮影 (sleep 90 = EAS→Play 反映待ち、 PR6)
#   6. release-diff               — 差分検証 (新 draft +1, versionCode +1, whatsnew 反映, 経過時間)
#   7. release-log summary        — summary.md 整形
#   8. release-log cleanup        — 直近 10 リリース分のみ保持 (.current は温存)
#
# 失敗時: 該当ステップで非 0 終了し、 後続をスキップ (set -e)。 ログは dist/release-logs/<TS>-android/ に残る。
#
# Usage: bash scripts/release-android-orchestrate.sh
#
# 環境:
#   PATH=/usr/bin:/bin:... (WSL2 PATH literal ${PATH} 罠回避、 lessons/wsl2-environment 参照)

set -e

# WSL2 PATH 安定化
export PATH="/usr/bin:/bin:/home/doooo/.nvm/versions/node/v22.21.0/bin:/home/doooo/.nvm/versions/node/v20.19.6/bin:${PATH}"

echo "=================================================================="
echo "🌱 BonsaiLog Android Release Pipeline (Sess61 PR2+PR6)"
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

# Step 3: Build (PR6: nohup wrap で WSL2 session 切断耐性)
echo "── Step 3/8: AAB ビルド (約 12 分、 nohup wrap) ──"
# nohup を使うことで SIGHUP に耐性を持つ (WSL2 ターミナル切断時にも継続)
# stdout/stderr を log に流す + フォアグラウンド待機 (wait) で完了同期
nohup bash -c "pnpm build:android:aab:local 2>&1 | tee \"${LOG_DIR}/03-build.log\"" &
BUILD_PID=$!
wait ${BUILD_PID}
BUILD_EXIT=$?
if [ ${BUILD_EXIT} -ne 0 ]; then
  echo "❌ AAB build failed (exit=${BUILD_EXIT})"
  exit ${BUILD_EXIT}
fi
echo ""

# Step 4: Submit
echo "── Step 4/8: EAS Submit (track=alpha, draft) ──"
pnpm submit:android 2>&1 | tee "${LOG_DIR}/04-submit.log"
echo ""

# Step 5: Snapshot after (PR6: sleep 5 → 90 = EAS → Play Console 反映待ち実測値)
echo "── Step 5/8: Snapshot after (90 秒反映待ち) ──"
sleep 90
node scripts/release-snapshot.mjs after "${TS}"
echo ""

# Step 5.5: setReleaseNotes (PR6 新規 = EAS が扱わない release notes を Publisher API で別途 PUT)
echo "── Step 5.5/8: Release Notes 別途 PUT (Publisher API、 PR6) ──"
node scripts/release-set-notes.mjs "${TS}" 2>&1 | tee -a "${LOG_DIR}/04-submit.log"
# release notes 投稿後にもう一度 snapshot して検証データを更新
echo ""
echo "── Step 5.5b: Snapshot after re-fetch ──"
sleep 10
node scripts/release-snapshot.mjs after "${TS}"
echo ""

# Step 6: Diff
echo "── Step 6/8: 差分検証 ──"
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
