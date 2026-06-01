# lessons/release.md — リリース工程の学び (Sess61〜)

このファイルは BonsaiLog の **リリース工程に関する繰り返し回避用 lesson** を集約。 ADR-0050 補完。

## R-Sess61-1: 介入度 3 (1 コマンド全代行) は「ログ落とし」 で透明性復活

- **背景**: Sess61 議論で私は当初「介入度 3 は『いつ何が直されたか』 不透明」 と懸念し、 介入度 1 (検査のみ、 修復は手動) を推奨した。
- **user 反論**: 「不透明であれば、 ログを落として残しておけばいいと思うのだが、 どう考える？」
- **学び**: 「透明性 vs 楽さ」 の二択ではなく、 **「楽さ + 全ログ保管 = 事後監査で透明性復活」** が正解だった。 私の懸念は早計だった。
- **対処**: 介入度 3 (`pnpm release:android` 1 コマンド全代行) を採用、 `dist/release-logs/<ts>-android/` に 9 種類のログ (preflight / auto-fix / snapshot-before / build / submit / snapshot-after / diff / summary / cleanup) を保管。
- **適用**: 「自動化 vs 透明性」 のトレードオフを論じる時は、 まず **「ログで両立できないか」** を検討する。 介入度を下げる前に、 ログ設計を詰める。
- **再発検知**: 議論で「○○は不透明だから△△」 と私が結論する時、 user に「ログで解決できないか」 を 1 度確認するパターンを追加。

## R-Sess61-2: ストア掲載原稿は **テンプレートのまま** の可能性を疑う

- **背景**: PR4 計画段階で「BonsaiLog の `fastlane/metadata/ja/` に日本語原稿が揃っている」 と仮定し、 Publisher API PUT で listing 自動追加と提案した。
- **実態**: `fastlane/metadata/ja/name.txt` = `{{APP_NAME}}` / `subtitle.txt` = 「アプリのキャッチコピー（30文字以内）」 等、 **App Store 用テンプレ placeholder のまま**。
- **学び**: 既存ファイルの存在 ≠ 実コンテンツ存在。 内容確認を怠ると「PR4 実行 → API PUT が `{{APP_NAME}}` を Console に送って事故」 になりえた。
- **対処**: `scripts/store-add-ja-jp.mjs` に 8 個の `PLACEHOLDER_MARKERS` 検出を組み込み、 placeholder 検出時は abort + `/store-text` Skill 委譲案内。
- **適用**: ファイル存在チェックの後は **内容 sample check** (先頭数行 grep) で実コンテンツか placeholder か区別する。

## R-Sess61-3: `.gitignore /android` の罠 (Expo prebuild)

- **背景**: PR1 で `android/whatsnew/whatsnew-en-US.txt` を作成したが、 `git add` で `The following paths are ignored by one of your .gitignore files: android` エラー。
- **原因**: BonsaiLog は Expo prebuild プロジェクトで `android/` は generated コードとして `.gitignore` (47 行目 `/android`)。 サブパス例外なし。
- **対処**: whatsnew を **リポジトリルート直下 `whatsnew/`** に移動。 EAS Submit はカスタムパス指定 (`--whatsnew-path` or eas.json) で読める設計。
- **適用**: Expo prebuild プロジェクトで android/ipa/ 配下に新規ファイルを置く時は、 リポジトリルート相対の代替パスを検討する。
- **再発検知**: PR1 で 1 回事故、 PR5 で `lessons/release.md` 化。 「3 回再発で hook 化」 (CLAUDE.md §9) の前段階。

## R-Sess61-4: EAS Submit の `changesNotSentForReview` 必須

- **背景**: EAS Submit Android で `eas.json submit.production.android.changesNotSentForReview` 未設定だと、 Play Console 側の保留 (例: データセーフティ更新の未承認) が API submit を**永遠ペンディング**にする罠。
- **対処**: PR1 で `changesNotSentForReview: true` を eas.json に追加。 「他の変更があっても、 今回の AAB アップロードだけは別審査に出す」 の意思表示。
- **適用**: BonsaiLog 以外の app-factory アプリでも初期構成時に `true` を必ず付ける。 template/app_template の eas.json にも反映予定 (Future Work)。

## R-Sess61-5: GitHub Secrets/Variables は **stdin 経由で `gh set`** が安全

- **背景**: PR3 で `gh secret set NAME --body "$VAL"` を使うと process listing に値が漏れるリスク。
- **対処**: `grep '^NAME=' .env | cut -d= -f2- | gh secret set NAME` または `base64 -w0 file | gh secret set NAME` で stdin から渡す。
- **適用**: app-factory 共通 best practice。 Secrets 登録時のセキュリティガード。

## R-Sess61-6: EAS Submit Android は release notes (whatsnew) を **扱わない公式仕様**

- **背景**: Sess61 PR1 で `/whatsnew/whatsnew-en-US.txt` を repo root に置けば EAS Submit が自動投稿してくれると仮定。 PR1-5 完成後の実証検証 (versionCode 4 Submit) で **release notes が空のまま Play Console に到達**。
- **原因 (1 次情報)**: Expo 公式 docs にて確認:
  > "EAS Submit uploads your binary but does not manage store listing metadata, screenshots, or release notes. For Google Play Store, configure your store listing directly in Google Play Console before submitting."
- **学び**: 「EAS Submit は AAB バイナリを上げるだけ」 を勘違いしていた。 metadata (release notes / screenshots / store listing text) は EAS の役割外、 Publisher API or Console UI で別途扱う必要がある。
- **対処 (PR6)**:
  - `scripts/release-utils/publisher-api.mjs` に `updateTrack` (PUT) + `setReleaseNotes` 関数を追加
  - `scripts/release-set-notes.mjs` 新規作成、 fastlane/metadata から release notes を読んで Publisher API 経由で別途 PUT
  - `scripts/release-android-orchestrate.sh` Phase 5.5 に組み込み
  - SoT 整理: `whatsnew/` ディレクトリ廃止、 `fastlane/metadata/<lang>/release_notes.txt` 一本化 (ADR-0033 整合)
- **適用**: app-factory の他アプリでも EAS Submit を使う時、 release notes / screenshots / store text 投稿は **必ず Publisher API or fastlane supply 経由** にする。 EAS だけで完結すると思い込まない。
- **再発検知**: PR 計画時に「EAS Submit が扱う / 扱わない」 を 1 次情報で必ず確認、 思い込みで設計しない。
- **PR6 で同時修正した周辺改善**:
  - sleep 5 → 90 (EAS → Play 反映待ち実測値)
  - diff allPass の重み付け (critical / warning 分離)
  - orchestrate.sh build step を nohup wrap (WSL2 session 切断耐性)
  - RELEASE_LOG_TS を `dist/release-logs/.current` に永続化 (env 揮発対策)

## R-Sess61-7: EAS Submit Android は内部で **fastlane supply** を使う

- **背景**: PR6 検証時に release notes 反映が失敗。 EAS Submit ジョブの logs を Expo GraphQL API で取得して中身を見たところ、 `fastlaneArgs: ["supply", "--aab", ..., "--track", "alpha", ...]` という記述を発見。
- **原因 (1 次情報)**: EAS Submit は **fastlane supply** をラップしている (公式 docs では明示されていない)。
- **学び**: EAS = AAB バイナリだけ / fastlane = メタデータ + AAB + signing + ジョブ管理。 つまり fastlane の挙動・制約・バグが EAS にも継承される。
- **適用**:
  - EAS Submit が失敗した時、 まず fastlane supply の挙動から疑う
  - fastlane の `metadata_path` 慣習 (`android/fastlane/metadata/android/<lang>/changelogs/<versionCode>.txt`) は EAS の中で使われている可能性
  - ただし EAS は `--aab` 引数のみ渡して metadata は別 (= release notes 等は EAS は無視) という挙動を採用
- **再発検知**: EAS の挙動を「ブラックボックス」 と見ず、 logs を Expo GraphQL API で取得 + fastlane の挙動と照らし合わせて理解する習慣。

## R-Sess61-8: Google Publisher API の edit transaction は **並走 NG**

- **背景**: PR6 検証で `release-snapshot.mjs before` が `createEdit` した直後に EAS Submit ジョブが起動 → fastlane supply 内の edit と並走 → `"This Edit has been deleted"` で 5 回 retry 全敗 → 失敗。
- **原因**:
  - Google Publisher API の edit transaction は同一アプリで複数 active 可能 (仕様上)
  - だが fastlane supply は **「前の active edit を find して reuse」** する設計
  - → 並走する別の edit transaction があると、 fastlane が古い edit を掴んで「deleted」 エラー
- **対処 (PR7)**:
  - `orchestrate.sh` の Step 4 を `eas submit --wait` で完了確認待ち
  - snapshot before は build 前 (Step 2) / snapshot after は Submit 完了後 (Step 4.5) で時系列排他
- **適用**: Publisher API edits を使う複数スクリプトを並走させない。 1 つの edit transaction を 1 つの目的で使い切ってから次へ。
- **再発検知**: `createEdit` 呼ぶスクリプトを設計する時は、 並走する別の edit が無いことを保証 (orchestrate.sh の Step 順序、 もしくは mutex)。

## R-Sess61-9: EAS CLI に無い機能は **Expo GraphQL API** を直接叩く

- **背景**: PR6 検証で submission が失敗した時、 EAS CLI に submission status 照会 sub-command が無く、 user に expo.dev で目視確認を依頼していた。
- **発見**: `https://api.expo.dev/graphql` に `EXPO_TOKEN` で Bearer 認証 + `submissions { byId(submissionId: $id) { status error logsUrl } }` クエリで Claude が直接取得可能。
- **対処 (PR7)**: `scripts/release-utils/expo-graphql.mjs` 新規作成。 `getSubmissionStatus(id)` / `getSubmissionLogs(id)` / `parseSubmissionIdFromLog(path)` を共通 export。
- **適用**:
  - EAS CLI に sub-command が無い操作は Expo GraphQL API を直接叩く
  - EXPO_TOKEN は `docs/01_key/03_Expo/access-tokens.txt` に永続化済み (Sess61 中盤で確立)
  - 同パターンを他の Expo 関連操作 (builds 照会、 credentials 確認 等) にも展開可能
- **再発検知**: 「CLI に無い → 諦める or user 確認依頼」 ではなく「GraphQL or REST API 直叩き」 が選択肢。

## R-Sess62-58: Android クラッシュ調査は **dex 文字列だけで原因を確定せず、 必ず adb logcat 一次情報を取る**

- **背景**: Sess61 PR7 で versionCode 6 AAB を Play Console alpha track に submit + ロールアウト → テスター端末で起動即クラッシュ。 Sess62 で原因調査。
- **失敗パターン**: AAB を `unzip` で展開、 `dex/classes*.dex` を `strings` で grep → `"Default FirebaseApp is not initialized in this process"` 文字列を発見 → **「expo-notifications が google-services.json なしで Firebase 初期化失敗してクラッシュ」** と推論。 user に Firebase 設定追加 PR を提案。
- **真実**: user に adb logcat 取ってもらったところ stack trace は別物だった:
  ```
  FATAL EXCEPTION: pool-2-thread-1
  java.lang.NoClassDefFoundError: Failed resolution of:
      Lexpo/modules/kotlin/types/AnyTypeCache;
    at expo.modules.webbrowser.WebBrowserModule.definition(WebBrowserModule.kt:181)
  Caused by: java.lang.ClassNotFoundException:
      expo.modules.kotlin.types.AnyTypeCache
  ```
- **真の原因**: `expo-web-browser ^56.0.5` のみ SDK 56 系混入、 残り全 expo-\* は SDK 55 系 (`expo-modules-core 55.0.23` に AnyTypeCache クラスなし) → 起動時 expo-web-browser が AnyTypeCache を呼んで `NoClassDefFoundError` → 即クラッシュ。 Firebase init はそもそも到達しない (起動の前半段階で死ぬ)。
- **学び**: dex の文字列は library 自体のエラーメッセージで、 実際にそのコードパスが実行されたとは限らない。 ROOT CAUSE 確定する前に **必ず `adb logcat -d -b crash`** で stack trace 一次情報を取得。
- **適用 (= 今後の調査手順)**:
  1. user 報告 (Play Console 起動クラッシュ) → adb で端末認可 → `adb logcat -d -b crash` で stack trace を最初に取る
  2. その上で AAB 解剖 / 依存調査 / source code 確認の優先順位を決める
  3. Firebase / Hermes / dev-client / native lib などの仮説は logcat の `Caused by:` 行で裏取り
- **再発検知**: クラッシュ調査で「これだ!」 と感じたら、 必ず logcat 確認していたか自問。 dex 文字列のみで PR 出すのは禁止。

## R-Sess62-59: 依存追加・更新後は **`pnpm expo install --check` で SDK 整合を必須確認**

- **背景**: Sess62 root cause が `expo-web-browser ^56.0.5` のみ SDK 56 系混入。 過去のどこかで `pnpm add expo-web-browser` で latest 取得した名残と推測。 SDK 55 ベースのプロジェクトに 56 系が混ざると AnyTypeCache 等の新クラス参照で起動即死。
- **副次発見**: `pnpm expo install --check` 走らせると **33 個の依存が SDK 55 推奨と mismatch** だった。 MAJOR 違反 4 件 (expo-web-browser 56→55、 async-storage 3→2、 datetimepicker 9→8、 get-random-values 2→1) を含む。
- **対処**: `pnpm expo install --fix` で 33 件一括整合 + `app.config.ts` の `expo-localization` プラグインの supportedLocales を BCP-47 そのまま渡すよう修正 (新版 plugin が `b+zh+Hans` 形式を reject、 内部で変換する設計に変わった)。
- **適用**:
  - `pnpm add` / `pnpm update` 実行後は必ず `pnpm expo install --check` で 0 件 mismatch を確認
  - dependabot や renovate の auto-merge 後も同様
  - **preflight-android-release.mjs に A-EXPO-SDK チェックを追加** (Sess62 で実装、 release:android で必須化)
- **再発検知**:
  - PR diff に `package.json` の dep 変更があれば、 `pnpm expo install --check` の結果を PR 本文に貼る
  - `release:android` の Phase 2 preflight が 0 件 mismatch をゲートで保証

## R-Sess62-60: production AAB に `expo-dev-client` を **条件分岐で除外**

- **背景**: Sess62 AAB 解剖で `dex/classes4.dex` に `expo/modules/devlauncher/DevLauncherPackage` 等が混入していることを発見。 即クラッシュ原因ではなかったが、 容量肥大 + 潜在副作用 (production で Metro server 接続を試みる等) のリスク。
- **原因**:
  - `package.json` で `expo-dev-client` が production dependencies に入っている (= ローカル開発で必要、 これは正しい)
  - しかし `app.config.ts` で `ensurePlugin(plugins, 'expo-dev-client', { toolsButton: false })` が無条件登録 → production AAB にも plugin が適用 → native コードが bundle
- **対処**: `app.config.ts` で `process.env.APP_ENV !== 'production'` の時のみ plugin を登録するよう条件分岐:
  ```ts
  if (process.env.APP_ENV !== 'production') {
    plugins = ensurePlugin(plugins, 'expo-dev-client', { toolsButton: false });
  }
  ```
  `eas.json` の `build.{development,preview,base}.env.APP_ENV` で profile 別に APP_ENV を注入済みなので、 production profile のみ plugin が外れる。
- **適用**: app-factory の他アプリでも同じパターン。 dev 専用 plugin (expo-dev-client / @rnef/dev-launcher 等) は APP_ENV 分岐で production から除外。

## R-Sess62-61: production AAB 提出前に **smoke test phase 必須** (= release-android Skill Phase 7.6)

- **背景**: Sess61 自動化パイプラインは「Submit 成功 = リリース完成」 と判定し、 実機起動確認を含んでいなかった。 結果、 versionCode 6 配信版がテスター端末で即クラッシュ。
- **対処**: `.claude/skills/release-android/SKILL.md` に Phase 7.6 smoke test を追加:
  ```
  adb install -r dist/app-production.aab           # local install
  adb shell monkey -p com.dooooraku.bonsailog 1    # 起動
  adb logcat -d -b crash > dist/release-logs/<ts>/07-smoke-test.log
  ```
  crash buffer に新規 FATAL EXCEPTION があれば exit 1 で release 停止。
- **適用**: iOS 側にも同等の smoke test phase を追加 (TestFlight 配信前に Simulator で起動確認)。 app-factory 他アプリでも共通パターン化。
- **再発検知**: release:android が smoke test なしで完了したら Engram に「Skill 仕様違反」 警告を残す (将来の改善)。

## 参考

- ADR-0050: Android Release Automation (PR6 Amendment + PR7 Amendment + Sess62 D10 Amendment 含む)
- `.claude/skills/release-android/SKILL.md`: 11+ phase Skill (Phase 5.5 setReleaseNotes + Phase 7.6 smoke test)
- `docs/how-to/workflow/google_play_release.md`: 手動フロー + EAS Submit + 12 testers/14 days + Pre-Launch Report
- `scripts/release-utils/expo-graphql.mjs`: Expo GraphQL API 共通モジュール (R-Sess61-9 反映)
- `scripts/preflight-android-release.mjs`: A-EXPO-SDK チェック (R-Sess62-59 反映)
- Sess61 plan: `~/.claude/plans/tidy-pondering-spark.md`
- Sess62 plan: `~/.claude/plans/wise-twirling-widget.md`
