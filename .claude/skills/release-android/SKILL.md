---
name: release-android
description: BonsaiLog Android クローズドテスト用 AAB ビルド + Play Console Alpha track 自動 Submit。 preflight 検査 + 自動修復 + 事前/事後 snapshot + 差分検証 + 完全ログを 11 phase で代行。
user-invocable: true
argument-hint: '[--dry-run / --skip-verify / --no-snapshot]'
---

# /release-android — Android Closed Testing 自動 Submit

ユーザーが「Android リリース」「クローズドテストに新しい AAB を上げて」「Play Console に提出」 と言ったらこの手順に従う。 ADR-0050 (Android Release Automation) 準拠。

## 起動条件

- ローカル WSL2 + main branch + working tree clean
- `.env` に Android 必須キー (REVENUECAT_ANDROID_API_KEY / ADMOB_ANDROID_APP_ID / ADMOB_ANDROID_BANNER_ID) が埋まっている
- `secrets/google-service-account.json` が symlink で配置済み (PR1 で完了)
- `eas.json` submit.production.android が `track=alpha / releaseStatus=draft / changesNotSentForReview=true` (PR1 で完了)

## 11 Phase

### Phase 0 — 開始確認

「これから AAB を Play Console Alpha track に Draft で上げます。 ビルド約 12 分 + Submit 約 3 分 = 15 分。 よろしいですか？」 を user に提示し、 Yes で進行。 No なら中断。

### Phase 0.5 — git clean + branch check

```bash
git status --porcelain  # 空であること
git rev-parse HEAD       # vs upstream
```

dirty なら abort、 「commit/stash してから再実行」 と user に案内。

### Phase 1 — pnpm verify ゲート

```bash
pnpm verify     # 21 項目 (lint+type+test+i18n+config+docs+metadata 等)
```

落ちたら abort + 該当 verify サブコマンドを user に提示。

### Phase 2 — preflight 検査

```bash
pnpm preflight:android   # A〜D グループ 21 項目
```

不足項目があれば user に説明 + 修復可否を提示。

### Phase 2.5 — preflight --auto-fix

```bash
pnpm preflight:android:fix   # 修復可能項目を一括修復
```

修復ログは `dist/release-logs/<ts>-android/01-auto-fix.log` に保存。

### Phase 3 — snapshot before

```bash
node scripts/release-snapshot.mjs before
```

Play Console 状態を撮影、 `dist/release-logs/<ts>-android/02-snapshot-before.json` に保存。

### Phase 4 — AAB ビルド

```bash
pnpm build:android:aab:local
```

`dist/app-production.aab` 生成 (約 12 分)。 ビルドログは `03-build.log`。 `postbuild-verify.mjs` で AAB 内 env 検査も同時実行。

### Phase 5 — EAS Submit

```bash
pnpm submit:android
```

Play Console Alpha track に Draft 投稿 (--no-wait)。 submit ID を `04-submit.log` に保存。

### Phase 5.5 — Release Notes 別途 PUT (PR6 で追加)

```bash
sleep 90   # EAS → Play Console 反映待ち実測値
node scripts/release-snapshot.mjs after   # 反映後に snapshot
node scripts/release-set-notes.mjs        # fastlane/metadata から release notes を Publisher API で別途 PUT
```

EAS Submit Android は **release notes (whatsnew) を扱わない公式仕様** (Sess61 検証で判明)。 そのため、 Submit 後に `publisher-api.mjs setReleaseNotes` で fastlane/metadata から release notes を Play Console に別途 PUT する。 ADR-0050 PR6 Amendment 参照。

SoT: `fastlane/metadata/{en-US,ja}/release_notes.txt` (ADR-0033 i18n policy 準拠)
言語コード変換: `scripts/release-utils/i18n-mapping.mjs` (fastlane `ja` → Publisher API `ja-JP`)

### Phase 6 — (旧) EAS Submit ✏️ 廃止、 Phase 5 に統合

Play Console Alpha track に Draft 投稿 (--no-wait)。 submit ID を `04-submit.log` に保存。

### Phase 6 — snapshot after

```bash
node scripts/release-snapshot.mjs after
```

Submit 反映を待ってもう一度撮影 (`05-snapshot-after.json`)。

### Phase 7 — release-diff

```bash
node scripts/release-diff.mjs
```

4 検証 (new draft +1 / versionCode > before.latest / whatsnew 反映 / 経過時間 < 30 min)。 結果は `06-diff.json`。

### Phase 7.5 — user report (= summary.md)

```bash
node scripts/release-log.mjs summary
```

`summary.md` 生成 + ターミナルに以下を表示:

1. Play Console URL: `https://play.google.com/console/u/0/developers/-/app/-/tracks/closed-testing`
2. Alpha track の Draft (versionCode N) を確認
3. 「リリースを確認」 → 「ロールアウトを開始」 を 1 クリック
4. テスター 12 人のスマホに配信開始

失敗時の rollback:
- Console から Draft を「破棄」
- ローカルブランチを `git reset` (commit 済みなら revert)
- Submit ID は `04-submit.log` 参照

### Phase 8 — Engram 履歴保存

```
mem_save(content="[release] BonsaiLog Android v{version} (versionCode {vc}) Alpha track Draft submit completed at {ts}. submit_id={id} new_drafts=1 diff_pass=4/4")
```

履歴は次回 `mem_search "android release"` で再生可能。

### Phase 9 — cleanup

```bash
node scripts/release-log.mjs cleanup   # 直近 10 リリース分のみ保持
```

## 1 コマンド全代行 (= 介入度 3 + 完全ログ)

```bash
pnpm release:android   # = bash scripts/release-android-orchestrate.sh
```

これで Phase 0.5〜9 を順次実行。 user が口頭で進捗を見守れる Skill モードと違い、 純粋なコマンド実行モード。 ログは `dist/release-logs/<ts>-android/` に完全保管。

## 引数 (Skill 起動時)

- `--dry-run`: Phase 4 (build) / Phase 5 (submit) をスキップ、 preflight + snapshot before のみ
- `--skip-verify`: Phase 1 (pnpm verify) を省略 (時間短縮、 推奨しない)
- `--no-snapshot`: Phase 3/6/7 をスキップ (Play Console API 接続不可の時)

## 失敗時の対処

| Phase | 失敗 | 対処 |
|---|---|---|
| 0.5 | git dirty | `git status` 確認 → commit or stash |
| 1 | verify 落ち | 該当 lint/type/test を修正 |
| 2 | preflight 不足 | `preflight:android:fix` で一括修復 |
| 4 | ビルド失敗 | `eas-build-doctor` subagent で診断 |
| 5 | submit 失敗 | EXPO_TOKEN / SA JSON / network 確認 |
| 7 | diff 不一致 | Play Console で目視確認、 必要なら手動 Submit |

## 関連 ADR / docs

- ADR-0050: Android Release Automation
- ADR-0043: Store Product API Automation
- ADR-0009: F-13 RevenueCat 課金設計
- `docs/how-to/workflow/google_play_release.md`: 手動フロー + EAS Submit + Pre-Launch Report
- `docs/reference/tasks/lessons/release.md`: 学び集約

## 制約

- 本 Skill は **Android のみ**。 iOS は `.github/workflows/build-ios-testflight.yml` (タグ push 自動化済み)。
- Closed testing (Alpha track) 専用。 Production rollout は手動 (Console 操作)。
- 12 testers/14 days ルールは本 Skill 対象外 (Play Console 側のテスター招待)。
