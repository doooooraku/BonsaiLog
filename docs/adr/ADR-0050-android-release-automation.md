# ADR-0050: Android Closed Testing Submit 自動化 + `/release-android` Skill (Sess61)

- Status: Accepted
- Date: 2026-05-31
- Deciders: @doooooraku
- Related: ADR-0043 (Store Product API Automation: monetization、 本 ADR は publishing で orthogonal) / ADR-0009 (F-13 RevenueCat 課金) / ADR-0033 (i18n translation policy) / Sess61 議論 (6 専門家チーム + Plan agent 8 観点 validation) / 1 次情報 [Google Play Android Publisher API edits.listings.update](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.listings/update) + [Google Play closed testing 12 testers/14 days rule](https://support.google.com/googleplay/android-developer/answer/14151465) + [EAS Submit Android docs](https://docs.expo.dev/submit/android/)

---

## Context

BonsaiLog は Play Console Closed Testing (Alpha track) で v1.0.0 (versionCode 2) を配布中。 リリース毎の作業負荷:

- AAB を Console から手動アップロード (3 分)
- リリースノートを言語別にコピペ (10 分)
- Console 操作 約 30 回
- 合計 約 14 分 / リリース

ユーザー要望 (Sess61):

1. EAS Submit 自動化で「ロールアウト開始」 1 クリックに圧縮
2. 不足キー検出 + 取得元提示 + Claude 修復可能なら自動修復
3. 事前/事後 snapshot で「Submit が想定通り Draft に到達したか」 を機械検証
4. 完全ログ落としで介入度 3 (1 コマンド全代行) の透明性確保
5. `/release-android` Skill で 1 発起動

### 調査で判明した事実 (1 次情報)

- **12 testers / 14 days ルール (Google Play, 2023-11-13 以降)**: 個人デベロッパー口座は Closed testing track で連続 14 日 12 人以上 opt-in が production 申請の条件。 Internal testing track はカウント対象外、 **Alpha (Closed) track が必須**。
- **EAS Submit Android profile**: `track` (internal/alpha/beta/production) / `releaseStatus` (completed/draft/halted/inProgress) / `changesNotSentForReview` (default false; true にしないと Play Console データセーフティ等の保留が API submit を永遠ペンディングにする罠あり) / `rollout` (0〜1、 inProgress 時のみ有効) / `serviceAccountKeyPath` を指定可能。
- **初回 AAB は手動アップロード必須** (Sess48 で完了済み、 EAS Submit を使える状態に到達)。
- **既存 Google SA JSON**: `docs/01_key/02_PlayStore/spry-catcher-482116-c4-5ca425301daf.json` (Sess47/48 で実 API 検証済み、 有効)。
- **Play Console 現状**: Alpha track 最新 v2 (1.0.0) completed / ストア掲載言語 = en-US のみ (ja-JP 未登録、 PR4 で自動追加)。

## Decision

1. **Submit 自動化フェーズを 2 段で並行採用**:
   - Phase 1 (ローカル CLI): `pnpm release:android` 1 コマンドで完結 (`scripts/release-android-orchestrate.sh`)。
   - Phase 2 (GitHub Actions): タグ push (v\*) で `ubuntu-latest` でビルド + Submit (`.github/workflows/build-android-play.yml`)。
   - 両方使い分け可能: ローカルは即時、 CI は外出先 / PC オフライン時。 iOS workflow と対称。

2. **eas.json submit.production.android**:
   - `track: "alpha"` (Closed testing カウント対象)
   - `releaseStatus: "draft"` (手動「ロールアウト開始」 ボタンを安全弁として温存)
   - `changesNotSentForReview: true` (API submit 永遠ペンディング罠の予防)
   - `serviceAccountKeyPath: "./secrets/google-service-account.json"` (symlink、 `.gitignore` 保護)

3. **介入度 3 + 完全ログ落とし**:
   - `release:android` 1 コマンドで preflight + auto-fix + build + submit + snapshot + diff + summary を順次実行。
   - 各ステップのログを `dist/release-logs/<ts>-android/{00-preflight,01-auto-fix,02-snapshot-before,03-build,04-submit,05-snapshot-after,06-diff,summary}.{json,log,md}` に保管。
   - 透明性は「ログ全保管」 で確保 (Sess61 議論で user 提案、 当初の私の懸念を解消)。
   - 直近 10 リリース分のみ保持 (`release-log.mjs cleanup`)。

4. **事前/事後 snapshot + 差分検証 (postflight)**:
   - Publisher API で tracks / listings / drafts を撮影。
   - 4 検証 (new draft +1 / versionCode > before.latest / whatsnew 反映 / 経過時間 < 30 min)。
   - 機械的に「Submit 成功」 を保証、 user は `summary.md` を読んで Console で「ロールアウト開始」 1 クリックのみ。

5. **ja-JP ストア掲載は Publisher API + `fastlane/metadata/ja/` SoT** (ADR-0033 i18n policy 準拠):
   - `scripts/store-add-ja-jp.mjs` で `--dry-run` / `--commit` 二段ゲート (ADR-0043 パターン踏襲)。
   - 原稿が placeholder のままなら abort + `/store-text` Skill 委譲案内。
   - スクリーンショット (graphics) は本 ADR スコープ外、 必要時に別途実装。

6. **versionCode SoT = `eas.json` `autoIncrement: true`** + Publisher API alpha latest 比較ゲート:
   - preflight D-4 で Alpha track 最新 versionCode を取得、 次の build が `> latest` を期待値表示。
   - ローカル/クラウド両 build で衝突しないよう EAS サーバ counter に統一。

7. **GitHub Secrets 5 個 + Variables 4 個を `gh secret set` / `gh variable set` で代行** (user `gh auth` 済み前提):
   - Secrets: GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 / REVENUECAT_ANDROID_API_KEY / ADMOB_ANDROID_APP_ID / ADMOB_ANDROID_BANNER_ID。 EXPO_TOKEN は web 発行が user 操作必須 (iOS workflow と共用)。
   - Variables: APP_NAME / APP_SLUG / ANDROID_PACKAGE / IOS_BUNDLE_IDENTIFIER。
   - 登録は stdin 経由で process listing に値が漏れないパターン。

8. **`/release-android` Skill** (11 phase):
   - Phase 0 確認 → 0.5 git clean → 1 verify → 2 preflight → 2.5 auto-fix → 3 snapshot before → 4 build → 5 submit → 6 snapshot after → 7 diff → 7.5 user report → 8 Engram → 9 cleanup。
   - 介入度 3 を口頭で進捗説明しながら走らせる対話型インターフェイス。

## Consequences

### Positive

- ✅ 14 分 / 30 操作の手作業が 1 操作 (`pnpm release:android` or `git tag v0.x.y && git push --tags`) に圧縮。
- ✅ Submit 成否を機械検証、 user は Console 操作不要で確信できる (snapshot 差分)。
- ✅ 全工程ログ保管で監査トレース + 失敗原因究明が容易。
- ✅ ja-JP 自動追加で日本語テスターに日本語 listing + whatsnew を届けられる (原稿準備後)。
- ✅ iOS workflow と対称、 app-factory 横展開で再利用可能。

### Negative / Trade-off

- ⚠️ EXPO_TOKEN 発行だけは user 操作必須 (web 認証、 自動化不可)。
- ⚠️ 初回 AAB 手動アップロード前提 (Sess48 で完了済み、 新規アプリ立ち上げ時は再度必要)。
- ⚠️ `--auto-fix` で eas.json 等が user 知らない間に変更される。 ログ落としで透明性確保するが、 git diff で確認推奨。
- ⚠️ Publisher API 障害時はローカル orchestrate.sh が落ちる (snapshot ステップ)。 `--no-snapshot` で迂回可能。

## Alternatives Considered

- **A. 手動アップロード継続**: 14 分 × 月数回のコスト、 漏れリスク、 タイポ事故継続。 棄却。
- **B. Fastlane supply のみ**: 既存 EAS Submit (eas.json 配線済み) と二重投資。 fastlane supply は Ruby 環境必要。 棄却。
- **C. Phase 1 のみ (CI 化見送り)**: PC オフライン時のリリース不可、 監査ログが local-only。 一旦 PR3 で CI 化済み、 user 判断で `git tag` フローを採用可。
- **D. 介入度 1 (検査のみ、 修復は手動)**: user の手数増 (preflight 結果見て個別修復)、 「ログ落とせばいい」 の user 提案で介入度 3 に統一。 これが本 ADR の最終形。
- **E. iOS/Android workflow を composite action 化**: 共通 step (pnpm setup / EAS CLI install / .env 生成) を `.github/actions/` で抽象化。 今回見送り、 3 つ目の workflow が出たタイミングで再評価 (Future Work)。

## Implementation (Sess61 で完了)

- PR1 #920: secrets symlink + eas.json (track=alpha + changesNotSentForReview) + package.json scripts + whatsnew/whatsnew-en-US.txt
- PR2 #921: preflight + snapshot + diff + log + orchestrate.sh + publisher-api.mjs (Node 統一、 989 行)
- PR3 #922: build-android-play.yml workflow + gh secret/variable set 8 個
- PR4 #923: store-add-ja-jp.mjs + whatsnew-ja-JP.txt + publisher-api.mjs に commitEdit() 追加
- PR5 #924 (本 PR): release-android Skill + ADR-0050 + lessons + google_play_release.md 全面改訂 + release-check Skill 更新

## Future Work

- composite action 化 (iOS/Android workflow の共通 step 抽出)
- staged rollout 自動化 (Production 公開時、 rollout 5% → 20% → 100% を Vitals 監視+API で自動 ramp)
- Pre-Launch Report 自動取得 (Publisher API、 crash 0 確認後 rollout 開始)
- スクリーンショット自動 PUT (`edits.images` endpoint、 ja-JP の画像も自動)
- Sentry release 自動作成 + sourcemap upload (mapping.txt 連携)

## Trace

- Sess61 議論 (6 専門家 + 4 ペルソナ評価 + Plan agent 8 観点 validation)
- Engram: `mem_save id=454` (Sess61 議論完遂、 5 PR 構成確定) / `id=455` (Sess61 検証完遂、 3/4 ✅ 確認)
- plan file: `~/.claude/plans/tidy-pondering-spark.md`

---

## PR6 Amendment (2026-05-31、 Sess61 検証後の hotfix)

### 経緯

PR1-5 完成後、 `/release-android` Skill フル実走で **whatsnew (release notes) が空のまま Play Console Alpha track Draft (versionCode 4) に到達** する事象を発見。 原因調査の結果、 EAS Submit Android は **release notes を扱わない公式仕様** と判明 (Expo docs):

> "EAS Submit uploads your binary but does not manage store listing metadata, screenshots, or release notes."

PR1 で `/whatsnew/whatsnew-*.txt` を repo root に置いた設計は **EAS Submit から無視される運命** だった。 ADR-0050 D5 (Publisher API + fastlane/metadata SoT) と PR1 配置の **二重化** が根本原因。

### Decision Amendment

**D4 を完全達成するため、 release notes 投稿経路を以下に確定**:

1. **`scripts/release-utils/publisher-api.mjs` 拡張**:
   - `updateTrack(token, packageName, editId, track, body)` (PUT)
   - `setReleaseNotes(token, packageName, track, versionCode, notesMap)` 冪等パターン:
     - createEdit → getTrack → 該当 release を find → releaseNotes を inject (他フィールド温存) → updateTrack PUT → commitEdit
2. **`scripts/release-set-notes.mjs` 新規作成**:
   - fastlane/metadata/<lang>/release_notes.txt から各言語の release notes を読む
   - `scripts/release-utils/i18n-mapping.mjs` で fastlane code (`ja`) → Publisher API BCP-47 (`ja-JP`) 変換
   - publisher-api.mjs setReleaseNotes で Play Console へ PUT
3. **`scripts/release-android-orchestrate.sh` Phase 5.5 追加**:
   - Phase 5 (EAS Submit) 直後に sleep 90 (実測 EAS → Play 反映時間)
   - Phase 5.5 で setReleaseNotes 実行
   - Phase 6 (snapshot after) 直前で再 snapshot
4. **SoT 整理**: `whatsnew/` ディレクトリ廃止 → `fastlane/metadata/{en-US,ja}/release_notes.txt` 一本化 (ADR-0033 i18n policy 整合)
5. **release-diff.mjs 重み付け**: whatsnew check を warning 化、 critical (Draft+1, versionCode+1, 経過時間) のみで `criticalPass` 判定 (PR6 で setReleaseNotes 別 step のため、 万一失敗時の検知用に残す防御的 design)
6. **release-log.mjs `.current` 永続化**: RELEASE_LOG_TS env が揮発しても `dist/release-logs/.current` から fallback、 session 切断時の再開耐性
7. **orchestrate.sh `nohup` wrap**: WSL2 ターミナル切断 (SIGHUP) 耐性

### PR6 で同時対処した周辺改善 (Plan agent validation 反映)

- #2 sleep 5 → 90 (実測値)
- #3 diff allPass の critical/warning 重み付け
- #4 session resume 対応 (nohup + Actions fallback 案内)
- #5 RELEASE_LOG_TS 永続化 (.current ファイル)

### 延期 (PR7+)

- #6 Play Console URL config 化 (eas.json `extra` 議論)
- #7 .gitignore 二重防御 (現状 dist/ 全体保護で十分)
- #8 ja-JP listing 原稿 = `/store-text` Skill 別 session

### 学び

`lessons/release.md` R-Sess61-6 として追記: **EAS Submit は AAB バイナリのみ。 metadata (release notes / screenshots / store text) は Publisher API or fastlane supply 経由で別途扱う必要がある。 思い込みで設計せず 1 次情報を確認すること。**
