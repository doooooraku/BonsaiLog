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

## 参考

- ADR-0050: Android Release Automation (PR6 Amendment 含む)
- `.claude/skills/release-android/SKILL.md`: 11+ phase Skill (Phase 5.5 setReleaseNotes 追加)
- `docs/how-to/workflow/google_play_release.md`: 手動フロー + EAS Submit + 12 testers/14 days + Pre-Launch Report
- Sess61 plan: `~/.claude/plans/tidy-pondering-spark.md`
