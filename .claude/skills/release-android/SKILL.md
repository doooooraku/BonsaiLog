---
name: release-android
description: BonsaiLog Android クローズドテスト用 AAB ビルド + Play Console Alpha track 自動 Submit。 Sess62 PR2 で cloud-first 化、 GitHub Actions が build/submit/snapshot/release notes/diff を担当、 ローカルは preflight + cloud trigger + smoke test を担当。
user-invocable: true
argument-hint: '[--skip-cloud / --skip-smoke]'
---

# /release-android — Android Closed Testing 自動 Submit (Sess62 PR2 改修版)

ユーザーが「Android リリース」「クローズドテストに新しい AAB を上げて」「Play Console に提出」 と言ったらこの手順に従う。 ADR-0050 (Android Release Automation) D13 Amendment 準拠。

## 重要方針 (Sess62 PR2 で確立)

- **AAB build は必ず GitHub Actions** (= cloud runner) で実行する。
- ローカル WSL2 で `pnpm build:android:aab:local` を実行**しない** (PC が落ちる原因)。
- ローカル `pnpm release:android` は「**cloud trigger + AAB DL + smoke test**」 の役割に転換。
- 緊急時 (= GitHub Actions 障害 / gh CLI 不通) のみローカル build を fallback として使う。

## 起動条件

- ローカル WSL2 + main branch + working tree clean
- `gh auth status` で GitHub CLI 認証済 (`gh auth login`)
- `.env` に Android 必須キー (`REVENUECAT_ANDROID_API_KEY` / `ADMOB_ANDROID_APP_ID` / `ADMOB_ANDROID_BANNER_ID`) が埋まっている
- `secrets/google-service-account.json` が symlink で配置済み (Sess61 PR1 で完了)
- `eas.json` submit.production.android が `track=alpha / releaseStatus=draft / changesNotSentForReview=true` (Sess61 PR1 で完了)
- (smoke test 用) `~/.local/share/bundletool-all.jar` + `~/.android/debug.keystore` が配置済 (Sess62 PR1 で確立)
- (smoke test 用) Android 実機が USB 接続 + USB デバッグ許可済

## 9 Phase (Sess62 PR2 改修後)

### Phase 0 — 開始確認

「これから GitHub Actions で AAB を build + Play Console Alpha track に Draft で上げます。 cloud build 約 12 分 + Submit + release notes + snapshot + diff 込みで約 15 分。 その後ローカル smoke test 約 5 分。 合計 約 20 分。 PC 負荷は cloud 任せでほぼゼロ。 よろしいですか？」 を user に提示し、 Yes で進行。

### Phase 0.5 — git clean + branch check

```bash
git status --porcelain  # 空であること
git branch --show-current  # main であること (cloud build は main を基準)
```

dirty なら abort、 「commit/stash してから再実行」 と user に案内。

### Phase 1 — pnpm verify ゲート (任意、 user 自己確認用)

```bash
pnpm verify     # 21 項目 (lint+type+test+i18n+config+docs+metadata 等)
```

落ちたら abort + 該当 verify サブコマンドを user に提示。 CI でも同じ verify が再実行されるので、 急ぐ場合は skip 可。

### Phase 2 — preflight 検査

```bash
pnpm preflight:android         # A〜D グループ + A-EXPO-SDK (Sess62 PR1) 22 項目
pnpm preflight:android:fix    # 修復可能項目を一括修復
```

不足項目があれば user に説明 + 修復可否を提示。

### Phase 3 — Cloud build + submit (GitHub Actions workflow_dispatch)

```bash
gh workflow run build-android-play.yml --ref main
sleep 5
RUN_ID=$(gh run list --workflow=build-android-play.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "${RUN_ID}" --exit-status    # 完了まで監視 (約 15 分、 Claude が口頭中継)
```

cloud で実行される 14 steps:

1. checkout
2. pnpm setup
3. Node setup (`.nvmrc`)
4. Java 17 setup
5. EAS CLI install
6. pnpm install --frozen-lockfile
7. .env 生成 (Secrets/Variables から)
8. Google Service Account JSON 展開
9. preflight (`--ci`)
10. verify (lint + type-check + test)
11. **Expo SDK alignment check** (Sess62 PR1 D11)
12. **Snapshot before** (Sess62 PR2 D10)
13. AAB build (`eas build --local --profile production`) — **★ ローカル PC 負荷ゼロ ★**
14. Postbuild verify
15. Submit (`eas submit --wait`、 alpha/draft)
16. **Release notes 投稿** (Sess62 PR2 D10、 Publisher API)
17. **Snapshot after** (Sess62 PR2 D10)
18. **Diff 検証** (Sess62 PR2 D10、 critical: new draft +1 / versionCode +1)
19. AAB artifact upload (7 日保管)
20. release-logs artifact upload (snapshot/diff JSON も保管)
21. Post build summary (GitHub Step Summary)

### Phase 4 — Artifact ダウンロード (= AAB + release-logs)

```bash
gh run download "${RUN_ID}" -n "Android-AAB-${RUN_ID}" -D dist/
gh run download "${RUN_ID}" -n "Android-release-logs-${RUN_ID}" -D "dist/release-logs/${TS}-android/cloud-logs/"
```

`dist/app-production.aab` に新 versionCode の AAB が配置される。 cloud-logs/ には snapshot/diff の JSON が入る。

### Phase 5 — Smoke test (= 実機 install + 起動確認、 ローカル必須)

cloud には実機がないので、 ここはローカルでしかできない。

```bash
adb devices                                       # 認可状態確認
adb uninstall com.dooooraku.bonsailog 2>/dev/null || true
# bundletool で apks 抽出 (signed with debug keystore)
java -jar ~/.local/share/bundletool-all.jar build-apks \
  --bundle=dist/app-production.aab \
  --output=/tmp/bonsai-smoke.apks \
  --connected-device --overwrite \
  --ks=$HOME/.android/debug.keystore --ks-key-alias=androiddebugkey \
  --ks-pass=pass:android --key-pass=pass:android
java -jar ~/.local/share/bundletool-all.jar install-apks --apks=/tmp/bonsai-smoke.apks
# 起動 + crash 確認
adb logcat -c
adb shell monkey -p com.dooooraku.bonsailog -c android.intent.category.LAUNCHER 1
sleep 10
adb logcat -d -b crash | head -50
```

**判定**:
- crash buffer に FATAL なし + 画面が表示される → ✅ smoke test pass、 Phase 6 へ
- FATAL あり → ❌ release 中断、 stack trace を user に提示

**実機未接続 or USB 認可なし**: smoke test スキップ可。 ただし「Play Console internal testing 経由で user 自身が確認」 を Phase 6 で案内必須。

### Phase 6 — User report (= summary.md)

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
- `gh run view <run-id> --log-failed` で workflow logs 確認

### Phase 7 — Engram 履歴保存

```
mem_save(content="[release] BonsaiLog Android v{version} (versionCode {vc}) Alpha track Draft submit completed at {ts}. GitHub Actions run={run-id} smoke_test={pass|skip|fail}")
```

履歴は次回 `mem_search "android release"` で再生可能。

### Phase 8 — Cleanup

```bash
node scripts/release-log.mjs cleanup   # 直近 10 リリース分のみ保持
```

## 1 コマンド全代行 (= 介入度 3)

```bash
pnpm release:android                              # cloud trigger + watch + DL + smoke test
pnpm release:android -- --skip-cloud              # 既存 artifact を使って smoke test のみ
pnpm release:android -- --skip-smoke              # cloud trigger + DL のみ (smoke test スキップ)
```

これで Phase 0.5〜8 を順次実行。 user が口頭で進捗を見守れる Skill モードと違い、 純粋なコマンド実行モード。 ログは `dist/release-logs/<ts>-android/` に完全保管。

## 失敗時の対処

| Phase | 失敗 | 対処 |
|---|---|---|
| 0.5 | git dirty | `git status` 確認 → commit or stash |
| 1 | verify 落ち | 該当 lint/type/test を修正 |
| 2 | preflight 不足 | `preflight:android:fix` で一括修復 |
| 2 | A-EXPO-SDK mismatch | `pnpm expo install --fix` で 1 件以上 mismatch 解消 (Sess62 PR1) |
| 3 | gh workflow run 失敗 | `gh auth status` 確認、 認証なら `gh auth login` |
| 3 | run watch で workflow fail | `gh run view <id> --log-failed` で詳細 → 該当 step 個別対処 |
| 4 | artifact DL 失敗 | run の retention (7 日) 切れの可能性、 `gh workflow run` で再 build |
| 5 | smoke test FATAL | crash stack trace を Read で確認 → root cause 別 PR |
| 5 | adb 未接続 | 実機 USB 接続 + USB デバッグ許可、 もしくは `--skip-smoke` で続行 |

## 緊急時 fallback (= cloud が使えない時のみ)

GitHub Actions 全停止 / gh CLI 不通 / WSL2 で gh auth が壊れた等の場合:

```bash
# ローカル build (★ PC が落ちる可能性あり、 chrome 等を全部閉じる ★)
pnpm build:android:aab:local        # 約 18 分、 メモリ 8〜10 GB 消費
pnpm submit:android                  # AAB を Play Console へ
node scripts/release-set-notes.mjs   # release notes 投稿
```

または:
```bash
git tag v0.0.1 && git push --tags    # tag push で workflow 自動起動 (cloud 側)
```

## 関連 ADR / docs

- ADR-0050: Android Release Automation (Sess62 D13 Amendment 含む)
- ADR-0033: i18n translation policy (release notes SoT)
- `.github/workflows/build-android-play.yml`: cloud build + submit workflow
- `scripts/release-android-orchestrate.sh`: ローカル cloud trigger + smoke test
- `docs/how-to/workflow/google_play_release.md`: 手動フロー + EAS Submit + Pre-Launch Report
- `docs/reference/tasks/lessons/release.md`: R-Sess61-1〜9 + R-Sess62-58/59/60/61/62

## 制約

- 本 Skill は **Android のみ**。 iOS は別 Skill (`/release-ios` 未実装、 Future Work)。
- Closed testing (Alpha track) 専用。 **Production rollout は必ず Play Console UI で実行**:
  - 直リンク: `https://play.google.com/console/u/0/developers/<dev_id>/app/<app_id>/tracks/production`
  - Console UI 操作: Release > Production > **Promote release from Closed testing** > Roll out percentage 選択 > Submit
  - **Sess81 R-68**: rollout 後 24h はストア商品の territory プロパゲーションが入りうる → テスター 12 人に「価格表示は数時間後に反映」 と明示
- **14 days / 12 testers opted-in ルール** (2026 Google Play 新規則): Closed testing rollout 後 14 日連続で 12 人以上の opted-in tester が必要。 **本 Skill の Submit Draft 完了直後に、 user に「Console UI で Roll out ボタンを押してください」 を明示提示** (= 機械化漏れの 1 ステップ、 Sess81 で R-61 機械判定原則違反として認識)。
- **Sess81 R-68 適用**: IAP / AdMob / Sentry 等の外部サービス連携機能は preflight smoke test (`pnpm preflight:android:ci`) が green でない限り本 Skill は release を中断する (= G グループ RC offerings 取得試行 = `scripts/preflight-android-release.mjs` 参照)。 ローカル開発時は自動 skip。
- smoke test に実機が必要 (USB 接続 + 認可)、 実機なしなら Phase 5 スキップ。
