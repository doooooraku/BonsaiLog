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

---

## PR7 Amendment (2026-05-31、 PR6 検証後の信頼性 hotfix)

### 経緯

PR6 完成後、 versionCode 6 で実走検証中に 4 件の改善点が判明:

1. **EAS Submit 1 回目 ERRORED**: fastlane supply が "Edit has been deleted" で失敗
   - 原因: `release-snapshot.mjs before` の `createEdit` が EAS Submit ジョブ内の fastlane supply の edit と干渉
   - 並走する 2 つの edit transaction が Google Publisher API 側で競合した
2. **orchestrate.sh の nohup wrap で wait が機能せず**: 親シェルが先に exit、 build が orphan 化
3. **release-diff の経過時間チェックが critical 扱い**: セッション中断で 8739s (2.4h) となり summary が「完了していません」 と誤表示
4. **submission status の手動確認**: ERRORED 時に user に expo.dev を目視確認依頼していたが、 GraphQL API で Claude が直接取れることが判明

### Decision Amendment

**D7 (新規): orchestrate.sh は `--wait` モードで Submit 完了を確認してから snapshot を取る**:

- Step 4 を `pnpm submit:android` (--no-wait) → 直接 `eas submit --wait` 呼び出しに変更
- snapshot と Submit ジョブの edit transaction 並走を構造的に防止
- WSL2 session 切断耐性は GitHub Actions fallback で代替 (PR3 既存)

**D8 (新規): Expo GraphQL API で submission status を自動取得**:

- `scripts/release-utils/expo-graphql.mjs` 新規作成
- `getSubmissionStatus(id)` / `getSubmissionLogs(id)` / `parseSubmissionIdFromLog(path)` を export
- EXPO_TOKEN は `docs/01_key/03_Expo/access-tokens.txt` から自動 fallback (Sess61 中盤で確立済 SoT)
- `release-set-notes.mjs` の「draft なし」 abort 時に submission status を確認 + エラー詳細を user に表示

**D9 (新規): release-diff の critical/warning 重み付けを精緻化**:

- 経過時間チェックを `warning: true` に変更 (PR6 で critical だったが、 セッション中断時に自然と延びるため監視レベルに降格)
- whatsnew check も warning のまま (PR6 で setReleaseNotes 別 step に分離済み、 防御的 design)
- critical: new draft +1 + versionCode +1 のみ (= Submit 成否の本質)

### PR7 で同時対処した周辺改善

- #1 release-diff 経過時間 warning 降格 (← criticalPass の誤判定解消)
- #2 orchestrate.sh nohup 撤回 + Step 4 `--wait` 化 (← build orphan 化 + edit 干渉解消)
- #3 expo-graphql.mjs 新規 + release-set-notes 拡張 (← 失敗時の原因究明自動化)
- #4 snapshot/Submit 排他 (#2 の副作用として保証)

### 学び (lessons/release.md R-Sess61-7/8 追記)

**R-Sess61-7**: EAS Submit Android は内部で fastlane supply を使う (今回の logs から判明)。 つまり fastlane の挙動 / 制約 / バグが EAS にも継承される。 「EAS = AAB だけ」「fastlane = メタデータ + AAB + signing」 を区別。

**R-Sess61-8**: Google Publisher API の edit transaction は同一アプリで複数 active 可能だが、 fastlane supply が「前の active edit を find して reuse」 する設計のため、 並走 edit があると 「This Edit has been deleted」 エラーで失敗する。 → Submit と snapshot は時系列で排他にする。

### Future Work (PR8+)

- #6 Play Console URL config 化 (PR6 から繰り越し)
- #7 .gitignore 二重防御 (現状で十分、 削除候補)
- #8 ja-JP listing 原稿 = `/store-text` Skill 別 session
- composite action 化 (iOS/Android workflow 共通 step 抽出)
- staged rollout 自動化 (Production 公開時、 rollout 5% → 20% → 100% を Vitals 監視+API で自動 ramp)
- Pre-Launch Report 自動取得 (Publisher API、 crash 0 確認後 rollout 開始)
- スクリーンショット自動 PUT (`edits.images` endpoint)
- Sentry release 自動作成 + sourcemap upload

---

## Sess62 Amendment (2026-06-01): smoke test 必須化 + SDK 整合ゲート

### Context

Sess61 PR7 で versionCode 6 AAB を Play Console alpha track に submit + ロールアウト → テスター端末で **アプリ tap で起動即クラッシュ**。 自動化パイプラインは「Submit が成功したか」 までは検証していたが、 「AAB が実機で起動できるか」 のチェックは含まれていなかった。

### 真の root cause (logcat 一次情報)

```
FATAL EXCEPTION: pool-2-thread-1
java.lang.NoClassDefFoundError: Failed resolution of:
    Lexpo/modules/kotlin/types/AnyTypeCache;
  at expo.modules.webbrowser.WebBrowserModule.definition(WebBrowserModule.kt:181)
Caused by: java.lang.ClassNotFoundException:
    expo.modules.kotlin.types.AnyTypeCache
```

- `expo-web-browser ^56.0.5` のみ Expo SDK 56 系混入
- 残り全ての expo-\* は SDK 55 系 (`expo-modules-core 55.0.23` に `AnyTypeCache` クラスなし)
- 起動時に web-browser モジュールが `NoClassDefFoundError` で死亡 → 即クラッシュ
- 副次発見: `pnpm expo install --check` で **33 個の依存が SDK 55 推奨と mismatch** (うち MAJOR 違反 4 件)

### 当初仮説の誤判定

Claude (私) は AAB の `dex/classes*.dex` を `strings` で grep し、 `"Default FirebaseApp is not initialized in this process"` 文字列を発見 → 「expo-notifications が google-services.json なしで Firebase init failure でクラッシュ」 と推論し、 user に Firebase 設定追加 PR を提案。 しかし user が adb logcat 取得 → 真の原因は別物 (NoClassDefFoundError / AnyTypeCache) と判明。

→ **lessons/release.md R-Sess62-58 起票**: 「dex 文字列だけで原因を確定せず、 必ず adb logcat 一次情報を取る」

### Decision Amendment

**D10 (新規): `release-android` パイプラインに smoke test phase 必須化**:

- `.claude/skills/release-android/SKILL.md` に Phase 7.6 smoke test を追加
- AAB を local install + monkey で起動 + `adb logcat -d -b crash` で新規 FATAL EXCEPTION の有無を判定
- crash buffer に新規 FATAL があれば release 中断 (exit 1)
- 結果は `dist/release-logs/<ts>-android/07-smoke-test.log` に保管
- adb 接続不可なら `--skip-smoke-test` フラグで skip 可 (非推奨)

**D11 (新規): preflight に SDK 整合ゲート追加**:

- `scripts/preflight-android-release.mjs` に A-EXPO-SDK チェック追加
- 内部で `pnpm expo install --check` を実行
- 1 件以上 mismatch があれば preflight ❌ で停止
- `--auto-fix` で `pnpm expo install --fix` を提案

**D12 (新規): production AAB に dev 専用 plugin を含めない**:

- `app.config.ts` で `process.env.APP_ENV !== 'production'` のときのみ `expo-dev-client` plugin を登録
- `eas.json` の `build.{development,preview,base}.env.APP_ENV` で profile 別注入を活用
- production AAB の dex bloat (`DevLauncherPackage` 等) + 潜在副作用を防止

### Sess62 PR で同時対処した変更

- #1 `pnpm expo install --fix` で 33 件依存整合 (= クラッシュ直接原因の解消)
- #2 `app.config.ts` expo-localization plugin: BCP-47 そのまま渡し (新版 plugin が `b+zh+Hans` を reject)
- #3 `app.config.ts` expo-dev-client plugin: APP_ENV 分岐 (D12)
- #4 `.claude/skills/release-android/SKILL.md` Phase 7.6 smoke test 追加 (D10)
- #5 `scripts/preflight-android-release.mjs` A-EXPO-SDK チェック追加 (D11)
- #6 `lessons/release.md` R-Sess62-58/59/60/61 追記

### 学び (lessons/release.md R-Sess62-58/59/60/61 追記)

- **R-Sess62-58**: Android クラッシュ調査は dex 文字列だけで原因を確定せず、 必ず adb logcat 一次情報を取る
- **R-Sess62-59**: 依存追加・更新後は `pnpm expo install --check` で SDK 整合を必須確認
- **R-Sess62-60**: production AAB に `expo-dev-client` を条件分岐で除外
- **R-Sess62-61**: production AAB 提出前に smoke test phase 必須 (= release-android Skill Phase 7.6)

---

## Sess62 PR2 Amendment (2026-06-01): cloud-first migration (D13)

### Context

Sess62 PR1 (#927) 完了直後、 ローカル `pnpm release:android` を 3 回連続で実行したところ、 **Phase 4 の AAB build (Gradle + ABI ×4 + Hermes、 メモリ 8〜10 GB を 18 分連続消費)** で **PC が複数回落ちる** 事象が発生。 セッション中断 + 再起動 + 再開を繰り返し、 リリース完了が大幅に遅延した。

原因: WSL2 上の Gradle build が Windows + Chrome + Claude Code 等とメモリを奪い合い、 OS が不安定化。

### Decision Amendment

**D13 (新規): AAB build は GitHub Actions (cloud runner) で実行する**:

- 本 ADR 当初 (D1) の「Phase 1 (ローカル CLI) + Phase 2 (GitHub Actions) で並行採用」 を以下に方針転換:
  - **標準 = GitHub Actions** (build / submit / snapshot / release notes / diff を一括代行)
  - **予備 = ローカル** (GitHub Actions 障害 / gh CLI 不通時のみ、 緊急 fallback)
- 理由: ローカル PC 負荷でクラッシュ → 構造的に解消するため cloud に集約
- ローカル `pnpm release:android` (= `scripts/release-android-orchestrate.sh`) を改修:
  - Phase 2-7 (snapshot before / build / submit / release notes / snapshot after / diff) を **削除** し workflow に移動
  - 新 Phase 3 で `gh workflow run` + `gh run watch` + `gh run download` を実行
  - 残り phase: preflight / cloud trigger / artifact DL / smoke test / summary / cleanup

**GitHub Actions workflow 改修** (`.github/workflows/build-android-play.yml`):

10 steps → 14 steps に拡張、 ローカル `release-android-orchestrate.sh` と機能等価に:

```
新規追加:
  step 11: Expo SDK alignment check (= pnpm expo install --check、 PR1 D11 と整合)
  step 12: Snapshot before (publisher-api 経由)
  step 16: Post release notes (publisher-api 経由、 ADR-0050 D5 整合)
  step 17: Snapshot after
  step 18: Release diff verification (continue-on-error で warning 継続)
  + artifact upload: Android-release-logs-${run-id} (snapshot/diff JSON 7 日保管)

修正:
  step 15 (旧 Submit): --no-wait → --wait モード (D7 整合)
```

**ローカル orchestrate.sh の新 phase 構成**:

1. release-log.mjs init (LOG_DIR 発行)
2. preflight --auto-fix (ローカル状態確認のみ)
3. gh workflow run + run-id 取得
4. gh run watch (workflow 完了監視)
5. gh run download (AAB + release-logs artifact 取得)
6. smoke test (実機 install + 起動確認、 cloud では実行不可)
7. release-log.mjs summary
8. release-log.mjs cleanup

### Sess62 PR2 で同時対処した変更

- #1 `.github/workflows/build-android-play.yml` に 4 steps 追加 (snapshot before / release notes / snapshot after / diff) + SDK 整合 check + release-logs artifact upload
- #2 `scripts/release-android-orchestrate.sh` を「cloud trigger + smoke test」 に書き換え (9 phase → 7 step)
- #3 `.claude/skills/release-android/SKILL.md` を新 9 phase 構成に更新、 ローカル build を「緊急時 fallback」 と位置付け
- #4 `docs/reference/tasks/lessons/release.md` R-Sess62-62 追記 (cloud-first 方針)

### 学び (lessons/release.md R-Sess62-62 追記)

- **R-Sess62-62**: AAB build は必ず GitHub Actions で実行 (ローカル build は緊急時のみ fallback)。 WSL2 上の Gradle build はメモリ消費 8〜10 GB × 18 分連続で OS 不安定化リスクが高い。

### Trade-off

- ✅ ローカル PC 負荷ゼロ (= PC が落ちる原因の構造的排除)
- ✅ workflow_dispatch + tag push の 2 経路で起動可能
- ✅ AAB + release-logs を 7 日保管 (GitHub artifact)、 smoke test 用に DL 可
- ⚠️ smoke test だけは cloud では不可 (実機がない) → ローカル orchestrate.sh で実行
- ⚠️ gh CLI 認証が必須 (`gh auth login` を user 1 回実行)
- ⚠️ workflow 1 run あたり cloud runner 約 15-20 分 (GitHub Free tier は private repo で 2000 min/month、 1 release ≈ 15-20 min → 月 100 回まで OK)

---

## Sess103 Amendment (2026-06-12): cloud build 実測時間の反映 (15-20 分 → 33-35 分)

### Context

Sess102 の vc14 release 実走 (GitHub Actions run 27353729812) で cloud workflow の実所要が 33 分だった (Sess101 vc13 でも同水準)。本 ADR・Skill・how-to の「約 15-20 分」記載は過小で、`release-diff.mjs` の経過時間閾値 30 min (1800s) も実測 1940s で誤警報を出した (warning 扱いのため criticalPass には影響しないが、正常 release のたびに警報が出る)。

### Decision Amendment

- `scripts/release-diff.mjs` の経過時間検証を < 30 min (1800s) → **< 45 min (2700s)** へ拡大 (実測 33-35 分 + 余裕)
- `.claude/skills/release-android/SKILL.md` / `docs/how-to/workflow/google_play_release.md` の所要時間を実測値に更新 (cloud 約 35 分 + smoke 約 5 分 = 合計約 40 分)
- GitHub Free tier 試算の更新: 2000 min/month ÷ 35 min ≈ 月 57 release まで可 (運用上問題なし)

---

## Sess106 Amendment (2026-06-13): iOS TestFlight 自動化統合 (案 B = macos-15 + `--local`)

### Context

- 既存 `.github/workflows/build-ios-testflight.yml` は Repolog 由来テンプレが 5/9 commit されたまま未稼働 (`gh run list --workflow=build-ios-testflight.yml` 実走 0 回)。
- ASC API で実態裏付け: BonsaiLog アプリは登録済 (`ascAppId=6763495229`、`bundleId=com.dooooraku.bonsailog`、SKU=`bonsai-ios-003`)、App Store Versions 1.0 が `PREPARE_FOR_SUBMISSION` で停止、TestFlight Pre-Release Versions / Builds / Beta Groups いずれも 0 件。
- 一方で必要情報はローカルに全て揃っている: `.p8` (`6768KZU85A`) / Issuer ID (`1f21bf99-fe11-4f44-9827-5b0bfbc3390e`、Repolog/eas.json 由来、Issuer 画面の表示と一致) / `ascAppId` (`6763495229`、config.bonsailog.json apple.appId) / Apple Team ID (`HSH4HJ72Y8`、ASC API bundleIds.seedId)。
- ASC API キーは `App Manager` ロール (スクショ確認)、TestFlight 完全自走に必要十分。
- 既存 iOS Distribution Certificate (`89L2ZXTPB4`、有効期限 2026-12-26) を流用可能。BonsaiLog 用 Provisioning Profile は未作成だが ASC API Key 経由で EAS が初回 build 時に自動生成可能 → user 手作業 0。
- Repolog の同型 workflow は 4 月時点で連続 5 回 success (平均 17 分)、構成は実証済み。

### User 意思

- 案 B (macos-15 + `--local`) を採用。理由: EAS Free 月 30 回上限を PoC 試行で超えるリスクを避けるため、`eas build --local` で Cloud quota 消費 0 にする。
- BonsaiLog repo は public 確定、macOS runner は無料、minute 制限の影響なし。
- Expo Free プラン継続、Pro 切替予定なし。
- macos-15 に pin (macos-latest でなく、突然壊れるリスク最小化)。
- 出来るだけ user 手作業を省く方針 (= ASC API + ローカル探索で取得可能な値は全部 Claude が自動取得)。

### Decision

1. **iOS workflow を `macos-15` + `eas build --local` 構成に全面改修** (`.github/workflows/build-ios-testflight.yml`)。Android `build-android-play.yml` と対称構造 (verify → AdMob stage gate → ASC Key setup → prebuild env check → build --local → Privacy Manifest 検証 → submit --wait → cleanup → artifact (failure 時のみ) → summary)。
2. **`eas.json` `submit.production.ios` 追加** (= ascAppId / ascApiKeyId / ascApiKeyIssuerId / ascApiKeyPath = `./secrets/AuthKey.p8`)。build 側は `extends: base` のみ (macos runner image を使うので cloud-specific 設定不要)。
3. **`eas build --local` の Cloud quota 非消費を恒久前提** (公式: https://docs.expo.dev/build-reference/local-builds/)。月 30 ビルド上限を完全回避。
4. **credentials 管理は EAS サーバー側委譲** (案 A と同方式)。初回 build 時に EAS が ASC API Key 経由で Apple Developer Portal から Distribution Cert + Provisioning Profile を自動取得・登録。証明書年次更新も EAS 自動。
5. **Apple Team ID + Type は GitHub Variables 経由**: `APPLE_TEAM_ID=HSH4HJ72Y8` / `APPLE_TEAM_TYPE=INDIVIDUAL`。EAS CLI が `EXPO_APPLE_TEAM_ID` / `EXPO_APPLE_TEAM_TYPE` env から読み取り、初回 credentials 取得に使用。
6. **submit は `--wait` モード** (Repolog テンプレは `--no-wait` だった、改善)。submit ジョブ完了まで watch、失敗即時検知。
7. **Privacy Manifest 同梱検証ステップ追加** (= `unzip -l dist/app.ipa | grep PrivacyInfo.xcprivacy`、ADR-0017 §⑤ の構造防御)。アプリ側自分宣言 + SDK 同梱 (AdMob/UMP) の最低 2 件期待。
8. **AdMob banner ID stage gate** (Android workflow と同型): RELEASE_STAGE が production 時はデモ ID を fail にして「戻し忘れ収益ゼロ事故」 を構造防止 (Sess95 PR-6 R-68 同型)。
9. **artifact 保持は failure 時のみ** (Android workflow `if: always()` から改善): 成功時は ASC が永続保持するため不要、200MB × 7 日節約。
10. **`/release-ios` Skill 起票** (`.claude/skills/release-ios/SKILL.md`、Android 9 Phase から流用、iOS 固有 step (Privacy Manifest 検証 / ASC Key setup) 追加)。
11. **GitHub Secrets 6 個 + Variables 2 個を `gh secret set` / `gh variable set` で代行** (D7 と同方式):
    - Secrets: `ASC_API_KEY_P8_BASE64` / `ASC_API_KEY_ID` / `ASC_API_KEY_ISSUER_ID` / `ADMOB_IOS_APP_ID` / `ADMOB_IOS_BANNER_ID` / `REVENUECAT_IOS_API_KEY`
    - Variables: `APPLE_TEAM_ID` (= `HSH4HJ72Y8`) / `APPLE_TEAM_TYPE` (= `INDIVIDUAL`)
    - EXPO_TOKEN は Android workflow と共用 (登録済)。
12. **`docs/how-to/release/ios_release.md` 新規起票** (= iOS リリースのトラブルシュート + 初回フロー + 用語集)。

### Consequences

#### Positive

- iOS リリースが Android 同様 cloud-first で「`/release-ios` 1 コマンド」 完結。
- EAS Free 月 30 回上限を完全回避、PoC 試行回数の制限なし。
- 必要情報全部ローカル + ASC API で自動取得済、user 手作業 0 で TestFlight 到達可能 (Apple ID + 2FA すら不要)。
- Privacy Manifest 同梱が CI で構造検証、Apple 審査リスク低減。
- 案 A への切替も eas.json + workflow yml の最小変更で可能 (= `--local` 削除 + runs-on ubuntu-latest)。

#### Negative

- macos-15 runner image アップデートで Xcode 互換性問題が稀に発生 → 月 1 回 Claude が macos-16 移行検討タイミングで対処。
- 初回 build は credentials 自動登録 + Pods install で 25-35 分の見込み (Repolog 平均 17 分は warm 状態)。
- credentials が Expo サーバー側管理 = Expo 信頼に依存 (= 案 A と同じ)。

### 試走で判明 (2026-06-13、PR #1269)

- 1 回目 (55s): `REVENUECAT_IOS_API_KEY` が EAS server-side env (production) 未登録 → `eas env:create --environment production` で登録、解決
- 2-3 回目 (135s / 17m): EAS の Distribution Certificate non-interactive 自動生成は仕様外 (新規 = interactive のみ、 修復のみ非対話可)。 対処 = Claude セッション内で `pexpect` (Python pty) 経由で `eas credentials:configure-build --platform ios --profile production` を ASC API Key 環境変数 + 対話自動応答で完遂、user 手作業 0 で Distribution Cert `89L2ZXTPB4` 流用 + Provisioning Profile `28YN889XWP` 新規生成。 詳細 = Engram id=628 (= release/ios-credentials-automation topic)
- 3 回目 (17m): Xcode 16 (macos-15 default) + Expo SDK 55 の Swift 6 strict concurrency バグ (`AnyExpoSwiftUIHostingView updateProps actor-isolated error`、 [expo/expo#42525](https://github.com/expo/expo/issues/42525) 未解決) → **`runs-on: macos-15` → `macos-14` に変更** (default Xcode 15.4 = Swift 5 で構造的回避)、 Expo SDK 56+ で fix されたら macos-15 + Xcode 16 へ昇格検討
- 4 回目 (217s): EAS build pre-build phase の `expo doctor` 内で 3 件 fail (knip script 衝突 / `@expo/log-box` `expo-image-loader` 重複 / `@expo/metro-runtime` overridden) → `package.json` `scripts.knip` → `scripts.knip:check` rename + `pnpm.overrides` で 3 依存固定 + `pnpm install --lockfile-only` で lockfile 反映
- 5 回目 (182s): `expo doctor` の「Check native tooling versions」 で **`Your Expo SDK version 55 is not compatible with Xcode 15.4.0. Required Xcode version: >=26.0.0`** が判明。Apple が 2025 後半に Xcode を year-based versioning へ統一 (= Xcode 26)、GitHub Actions runner image (macos-14 / macos-15 双方) は **Xcode 26 を提供していない**。**案 B (eas build --local) は物理的に成立不能**

### 5 回目試走の帰結と Sess107 引き継ぎ (user 判断 2026-06-13)

- **判明事実**: BonsaiLog の現状 Expo SDK 55 + GitHub Actions macOS runner では `eas build --local` が物理的に走らない。Apple Xcode の versioning 変更 (15→16→26) と Expo SDK 55 公式要件のすれ違いが原因
- **EAS Cloud Build (案 A) は技術的に成立**: Expo のサーバー側は Xcode 26 を保有して SDK 55 を build 可
- **user 判断**: 「Expo SDK 56 アップグレード検討」 を **別セッション (Sess107 以降)** で進める。本 PR #1269 は SDK 56 アップグレード完了後に試走 + merge
- **本 PR #1269 の現状**: コード (eas.json + workflow yml + Skill + how-to + ADR + package.json 依存修復) は配線済、 GitHub Secrets 6 + Variables 2 投入済、 EAS server-side env + iOS credentials (Distribution Cert + Provisioning Profile) Expo サーバー側登録済。 **試走の阻害要因は Expo SDK バージョン互換性のみ**。SDK 56 へのアップグレード後の workflow 再試走で TestFlight 到達見込み

### Sess107 以降 引き継ぎ task

- [ ] **Expo SDK 55 → 56 アップグレード PR** (別 PR、大規模):
  - `npx expo install --fix` で SDK 56 + RN 0.84 互換性 audit
  - `expo upgrade` or 公式 migration guide ([Expo SDK 56 changelog](https://expo.dev/changelog/sdk-56)) に従う
  - 全 deps の互換性確認 + `pnpm.overrides` の見直し (= SDK 56 で不要になる可能性)
  - dev/preview ビルドで実機検証 (Android 既存パイプで先行)
  - lint/type-check/test 全 PASS
  - 完了後に PR #1269 (本 PR) の workflow 再試走
- [ ] **本 PR #1269 は保留中** (= SDK 56 アップグレード PR が main に入った後に rebase + 再試走 + merge)
- [ ] Sess107 開始時に user に「PR #1269 が保留中であり、SDK 56 アップグレード後に再開」 を冒頭で確認

---

## Sess107 Amendment (2026-06-13): SDK 56 アップグレード後の 道 A 切替

### 経緯

Sess107 で Expo SDK 55 → 56 アップグレード (PR #1270、 ADR-0062) を main merge 後、 PR #1269 を rebase + **道 A (= `ubuntu-latest` + EAS Cloud Build)** に切替。 SDK 56 でも Xcode 26.4 必須は変わらず、 GitHub Actions の macOS runner は Xcode 16 max なので、 案 B (= `eas build --local`) は物理的に不可能と再確定。

### Decision (Sess107)

1. **`runs-on: macos-14` → `runs-on: ubuntu-latest`** (= Linux runner、 Public repo 完全無料)
2. **`eas build --platform ios --profile production --local --non-interactive --output=dist/app.ipa` → `eas build --platform ios --profile production --non-interactive --auto-submit`**:
   - `--local` 削除 (= EAS Cloud で build = Xcode 26.4 で SDK 56 native compile 可能)
   - `--auto-submit` 追加 (= build success 後に eas.json submit.production.ios プロファイルで自動 TestFlight 送信)
   - `--output` 削除 (= EAS Cloud は artifact を Expo サーバーに永続保持)
3. **Privacy Manifest 検証 step 削除** (= EAS Cloud build では runner 上に IPA が無いため `unzip -l` 不可。 `app.config.ts` `ios.privacyManifests` 配列を信頼)
4. **Upload IPA artifact step 削除** (= EAS Cloud は build artifact 永続保持)
5. **timeout-minutes: 90 → 60** (= EAS Cloud 経由なので runner 時間短縮)
6. **`/release-ios` Skill を Sess107 道 A 用に書換**
7. **EAS Free 月 30 ビルド上限の運用**: 実 release 月 5-10 回想定で許容、 PoC 多発時は Expo Pro $19/月 検討

### Sess107 試走 + merge

- `gh workflow run build-ios-testflight.yml --ref feat/release-ios-cloud-first` で試走
- EAS Cloud build 25-40 分 + auto-submit 5-10 分 + ASC API processing 10-15 分 = 約 40-65 分
- ASC API で `processingState=VALID` 到達確認後、 PR #1269 を merge

### Acceptance

- [ ] `eas.json` `submit.production.ios` 4 フィールド配線
- [ ] `.github/workflows/build-ios-testflight.yml` macos-15 + `--local` 構成
- [ ] GitHub Secrets 6 個 + Variables 2 個登録
- [ ] `/release-ios` Skill 配線
- [ ] `docs/how-to/release/ios_release.md` 起票
- [ ] 試走 1 回 success (= TestFlight Pre-Release Versions が 1 件、Builds が 1 件、ASC `processingState=VALID` 到達)
- [ ] Privacy Manifest 同梱検証 step pass (= IPA 内 `PrivacyInfo.xcprivacy` ≥1 件)
- [ ] submit `--wait` で TestFlight processing 反映確認
