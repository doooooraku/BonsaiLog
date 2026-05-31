# Google Play 公開フロー (AAB ビルドから Closed Testing → 製品版まで)

最終更新: 2026-05-31 (Sess61 PR5)

BonsaiLog を Google Play Store に公開する完全ガイド。 ローカル CLI / GitHub Actions / EAS Submit / Closed Testing 12 testers/14 days ルール / Pre-Launch Report / 段階公開を網羅。

ADR-0050 (Android Release Automation) 準拠。 関連: ADR-0043 (Store Product API)、 ADR-0009 (F-13 課金)、 ADR-0033 (i18n policy)。

## 前提

- Expo SDK 55 + React Native 0.83 + EAS (BonsaiLog 現状)
- WSL2 (Ubuntu) + ローカルビルド (`--local`、 EAS クラウド枠を消費しない)
- 個人デベロッパーアカウント (2023-11-13 以降作成 → 12 testers/14 days ルール対象)
- BonsaiLog は Sess48 で初回 AAB 手動アップロード済 (Closed Testing Alpha track 配信中)

## 全体像

```
[Phase 1] 初回セットアップ (1 回のみ)
    ↓ Google Cloud Console SA 作成 + Play Console API access link
[Phase 2] 環境構築 + ローカル CLI (Sess61 完了)
    ↓ `pnpm release:android` で AAB ビルド + Submit → Draft
[Phase 3] GitHub Actions (Sess61 PR3 完了)
    ↓ `git tag v0.x.y && git push --tags` → CI で自動 Submit → Draft
[Phase 4] テスター運用 (12 testers/14 days)
    ↓ Closed Testing → Open Testing → Production 申請
[Phase 5] 段階公開 + 監視
    ↓ rollout 5% → 20% → 100% + Vitals + Pre-Launch Report
```

## Phase 1: 初回セットアップ

### 1-1. Google Cloud Console で Service Account 作成

1. https://console.cloud.google.com → プロジェクト作成 or 既存選択
2. APIs & Services → Library → 「Google Play Android Developer API」 を Enable
3. IAM & Admin → Service Accounts → Create Service Account
4. Roles: 不要 (Play Console 側で権限付与)
5. Manage keys → Create new key → JSON → ダウンロード (1 回のみ)
6. `docs/01_key/02_PlayStore/` に保管 (git 管理外)

### 1-2. Play Console 側で SA に権限付与

1. Play Console → Setup → API access
2. 「Link」 で先ほどの Google Cloud プロジェクトと連携
3. Service Account 一覧から先ほど作成した SA を選択
4. Grant access → アプリ別 or アカウント全体権限を選択
5. 最小権限: 「Releases」 「Pricing & Distribution」 「View app information」 のみ

### 1-3. アプリ初回登録

1. Play Console → アプリを作成
2. アプリ名 / デフォルト言語 / 種別 / 連絡先入力
3. コンテンツ評価アンケート (1 回のみ、 API 不可)
4. データセーフティ申告 (API 不可、 半年に 1 回更新)
5. 価格と配布地域 / カテゴリ

### 1-4. 初回 AAB を手動アップロード (Google Play 規約)

```bash
pnpm build:android:aab:local  # AAB ビルド
```

→ Play Console → Closed Testing → Alpha → Create new release → AAB を D&D。 これ以降は EAS Submit が使える。

## Phase 2: ローカル CLI (Sess61 完了)

### 2-1. `pnpm release:android` 1 コマンド

```bash
pnpm release:android   # = bash scripts/release-android-orchestrate.sh
```

内部実行 (8 ステップ、 約 15 分):

1. `release-log.mjs init` — タイムスタンプ + `dist/release-logs/<ts>-android/` 作成
2. `preflight:android --auto-fix` — 30 項目検査 + 修復可能項目自動修復
3. `release-snapshot.mjs before` — Play Console 状態撮影
4. `build:android:aab:local` — AAB ビルド (約 12 分)
5. `submit:android` — EAS Submit (track=alpha, draft, --no-wait)
6. `release-snapshot.mjs after` — 再撮影
7. `release-diff.mjs` — 4 検証 (Draft +1 / versionCode +1 / whatsnew 反映 / 経過時間 < 30 min)
8. `release-log.mjs summary` + `cleanup` — summary.md 生成 + 古いログ削除

### 2-2. summary.md を読んで Console で 1 クリック

```bash
cat dist/release-logs/$(ls -t dist/release-logs | head -1)/summary.md
```

→ Play Console URL → 「リリースを確認」 → 「ロールアウトを開始」。

### 2-3. 失敗時の対処

- preflight 不足: `pnpm preflight:android --auto-fix`
- ビルド失敗: `~/.claude/agents/eas-build-doctor.md` subagent で診断
- submit 失敗: `EXPO_TOKEN` / `secrets/google-service-account.json` / network 確認
- diff 不一致: `06-diff.json` 確認、 Console で目視

## Phase 3: GitHub Actions (Sess61 PR3 完了)

### 3-1. `git tag` push で全自動

```bash
git tag v0.2.0
git push --tags
```

→ `.github/workflows/build-android-play.yml` が `ubuntu-latest` で起動 (約 25 分):

1. Checkout + pnpm + Node + Java 17 + EAS CLI install
2. `.env` を vars/secrets から組み立て
3. `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` を base64 展開
4. `preflight:android:ci` (Secrets/workflow も検査)
5. `pnpm verify:lint && verify:type-check && verify:test`
6. `eas build --local` → AAB
7. `postbuild-verify.mjs` で AAB 内 env 検査
8. `eas submit --no-wait` → Play Console Alpha track Draft
9. `actions/upload-artifact` で AAB 7 日保管
10. `$GITHUB_STEP_SUMMARY` に案内

### 3-2. GitHub Secrets / Variables (PR3 で登録済み)

| 種類     | 名前                                                                  | 用途                                                                               |
| -------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Secret   | `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`                                  | Play Console API 認証                                                              |
| Secret   | `REVENUECAT_ANDROID_API_KEY`                                          | アプリ内課金                                                                       |
| Secret   | `ADMOB_ANDROID_APP_ID`                                                | 広告                                                                               |
| Secret   | `ADMOB_ANDROID_BANNER_ID`                                             | 広告バナー                                                                         |
| Secret   | `EXPO_TOKEN`                                                          | **user 操作必須** (https://expo.dev/settings/access-tokens 発行 → `gh secret set`) |
| Variable | `APP_NAME` / `APP_SLUG` / `ANDROID_PACKAGE` / `IOS_BUNDLE_IDENTIFIER` | 公開可能なメタ情報                                                                 |

## Phase 4: テスター運用 (12 testers/14 days)

### 4-1. テスター招待

1. Play Console → Closed Testing → Alpha → Testers
2. Google Group (gmail) を作成 + tester メールアドレスを追加
3. Group を Play Console に登録 (一度登録すれば永続)
4. 招待リンクをコピペ → tester に共有

### 4-2. 12 testers / 14 days ルール

- 個人デベロッパー (2023-11-13 以降): Production 申請の条件
- 12 人以上 opt-in が 14 日連続必要
- Internal testing はカウント対象外 (Closed Testing/Alpha のみ)
- 1 人でも opt-out すれば 14 日カウント reset → 慎重に運用

### 4-3. Pre-Launch Report (無料 Robo crawler)

- AAB を Closed Testing にアップロードすると Google が自動実行
- 30 分後に Play Console → Quality → Pre-Launch Report で結果確認
- 内容: クラッシュ / セキュリティ / アクセシビリティ / 性能 / multiple devices test
- crash 0 を確認してから rollout を上げる

## Phase 5: 段階公開 (Production)

### 5-1. Closed Testing → Open Testing 経由

1. 14 日 + 12 testers クリア
2. Production access 申請
3. 審査 (数日)
4. 承認後、 Open Testing or 直接 Production 公開可能

### 5-2. Production rollout

- 5% → 1〜2 日様子見 → 20% → クラッシュ率/レビュー確認 → 50% → 1 週間 → 100%
- `eas.json` の `submit.production.android.rollout: 0.05` で API から rollout 値変更可能 (releaseStatus=inProgress 時)
- Future Work: `release-android` Skill の Phase 9 に「staged rollout 自動 ramp + Vitals 監視」 を追加

## 用語整理

| 用語            | 意味                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------- |
| versionCode     | Android アプリの内部バージョン番号 (整数、 単調増加)。 `eas.json autoIncrement: true` で自動 |
| version         | アプリの表示用バージョン (例: 1.0.1)。 `app.json` の version 値                              |
| track           | Play Console のリリース枠 (internal / alpha=Closed / beta=Open / production)                 |
| Draft           | Submit したが未配布の状態 (releaseStatus=draft)                                              |
| AAB             | Android App Bundle、 Play Store 提出形式 (APK の代わり)                                      |
| Service Account | Google Cloud のロボットアカウント、 API 認証用                                               |
| BCP-47          | 言語タグ形式 (例: ja-JP, en-US)                                                              |

## トラブルシューティング

### 「署名が一致しません」 エラー

- EAS Build のキーストアと Play Console のアップロード鍵が不一致
- `eas credentials --platform android` で確認 + 必要に応じて再生成

### API submit が永遠ペンディング

- `changesNotSentForReview: true` を `eas.json` に追加 (Sess61 PR1 で対応済)

### versionCode 衝突 (Play Console 側に同 versionCode が既に存在)

- `eas.json autoIncrement: true` が効いていない疑い
- preflight D-4 で Alpha track 最新 versionCode を取得 → ローカル expected と比較

### Pre-Launch Report で deprecated API warning

- 多くは無害 (Google が表示するだけで rollback 不要)
- crash 0 と ANR rate を優先確認

## 関連

- ADR-0050: Android Release Automation
- ADR-0043: Store Product API Automation
- ADR-0009: F-13 RevenueCat 課金設計
- `.claude/skills/release-android/SKILL.md`: `/release-android` Skill
- `docs/reference/tasks/lessons/release.md`: 学び集約
- 公式: https://docs.expo.dev/submit/android/ / https://support.google.com/googleplay/android-developer/answer/14151465
