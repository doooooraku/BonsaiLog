# Repolog ノウハウ → app_template フィードバック — ハンドオフ資料

> 作成日: 2026-04-23
> 目的: Repolog (iOS/Android リリース済) の実戦知見を app_template にフィードバックする

---

## 全体像

Repolog アプリの開発・リリースで得たノウハウを、次アプリ開発用のテンプレート (`app_template`) に還元する。
テンプレートをクローンして新アプリ開発を始める前提で、汎用知見のみを移植する（Repolog 固有の PDF・写真・バックアップ機能は対象外）。

## 方針

- **Delta-only + Knowledge-first**: テンプレートと Repolog の差分を精密に特定し、汎用知見のみをピンポイントで移植
- **テンプレートの動作を壊さない**: 各 PR で `pnpm verify` (lint + type-check + test) 通過を確認
- **Issue 単位で個別 PR**: 独立した 5 つの Issue に分割済み

---

## 進捗状況

### Phase 1（完了）

| Issue                                                       | タイトル                                     | PR                                                           | ステータス |
| ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------ | ---------- |
| [#63](https://github.com/doooooraku/app_template/issues/63) | lessons.md に Repolog 汎用知見を統合（13件） | [PR #68](https://github.com/doooooraku/app_template/pull/68) | マージ待ち |
| [#66](https://github.com/doooooraku/app_template/issues/66) | src/ 汎用コードパターン改善                  | [PR #69](https://github.com/doooooraku/app_template/pull/69) | マージ待ち |

**PR #68 の内容:**

- `docs/reference/tasks/lessons.md` に 138 行追加
- 13 件の汎用知見（ストア申請、ビルド環境変数、ファイルパス、CI/CD、デバッグ、Android、開発環境、ドキュメント棚卸）

**PR #69 の内容:**

- `proService.ts`: `derivePlanType()` 純粋関数抽出、`addCustomerInfoListener()` 実装、テスト用エクスポート
- `legalService.ts`: URL バリデーション追加、optional パラメータ、boolean 返却
- `reviewService.ts`: 純粋決定関数 `shouldRequestReview()` 分離、fire-and-forget パターン
- `proStore.ts`: 新規（Zustand IAP 状態管理ストア）
- `langCode.ts`: 新規（言語コード正規化モジュール）
- `i18n.ts`: `useMemo` でメモ化

---

### Phase 2（未着手 — 次セッションで実施）

#### Issue #65: Fastlane メタデータ構造補完

**目的:** App Store Connect が要求する全フィールドのプレースホルダーをテンプレートに追加し、初回ストア申請をスムーズにする

**やること:**

1. `fastlane/metadata/` にカテゴリメタデータ 7 ファイルを追加
   - `primary_category.txt`（例: "UTILITIES"）
   - `secondary_category.txt`（例: "PRODUCTIVITY"）
   - `copyright.txt`（例: "YYYY Your Name"）
   - `primary_first_sub_category.txt`（空）
   - `primary_second_sub_category.txt`（空）
   - `secondary_first_sub_category.txt`（空）
   - `secondary_second_sub_category.txt`（空）
2. `fastlane/metadata/review_information/` ディレクトリを作成し 7 ファイルを追加
   - `demo_user.txt`, `demo_password.txt`, `email_address.txt`, `first_name.txt`, `last_name.txt`, `phone_number.txt`, `notes.txt`
   - 全てプレースホルダー値（例: `demo@example.com`, `+1-555-0100`）
3. `fastlane/screenshots/README.md` を追加（スクリーンショット寸法・セーフエリアガイド）
4. `fastlane/metadata/README.md` を更新（カテゴリ一覧表とレビュー情報の説明を追加）

**参照元:** `/home/doooo/04_app-factory/apps/Repolog/fastlane/metadata/`（19 ロケール × 10 フィールドの実データ）

**ブランチ名:** `feat/65-fastlane-metadata`

---

#### Issue #64: CI ワークフロー 3 本追加 + 既存改善

**目的:** テンプレートの CI/CD パイプラインを Repolog の実戦レベルに引き上げる

**やること:**

**新規追加（3 本）:**

1. `.github/workflows/download-app-store-metadata.yml`
   - App Store Connect からメタデータをダウンロードし PR を自動作成
   - 手動トリガー（workflow_dispatch）のみ
   - 参照元: `/home/doooo/04_app-factory/apps/Repolog/.github/workflows/download-app-store-metadata.yml`
   - 汎用化ポイント: `com.dooooraku.repolog` → `${{ vars.IOS_BUNDLE_IDENTIFIER }}` に置換

2. `.github/workflows/i18n-audit.yml`
   - 特定ロケールの i18n 監査レポートを生成
   - 19 言語のドロップダウン選択、JSON + Markdown 出力
   - 参照元: `/home/doooo/04_app-factory/apps/Repolog/.github/workflows/i18n-audit.yml`

3. `.github/workflows/ump-consent-validation.yml`
   - UMP 同意フロー検証チェックリスト生成
   - プラットフォーム × 地域の組み合わせで検証
   - 参照元: `/home/doooo/04_app-factory/apps/Repolog/.github/workflows/ump-consent-validation.yml`

**既存改善:** 4. `ci.yml`: GitHub Actions のバージョンをコミットハッシュでピン留め

- `actions/checkout@v4` → `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4`
- 同様に pnpm/action-setup, actions/setup-node も

5. `maestro-smoke.yml`: Gradle キャッシュキーに `gradle/libs.versions.toml` 追加 + リトライロジック + logcat/dumpsys 診断出力
6. `build-ios-testflight.yml`: ビルドサマリーステップを追加

**ブランチ名:** `feat/64-ci-workflows`

**注意:** CI secrets が未設定のため、ワークフローの実行テストはできない。YAML 構文チェックのみ

---

#### Issue #67: Docs 拡充（ADR パターン例 + how-to 追加）

**目的:** 次アプリ開発者が ADR の書き方を理解でき、ストアリリースを迷わず実行できるようにする

**やること:**

**ADR パターン例（5 本）:**

1. `docs/adr/ADR-0002-revenue-model.md` — 収益モデルの選択（サブスク vs 買い切り vs 広告）
   - Repolog ADR-0003 をベースに汎用化
2. `docs/adr/ADR-0003-storage-policy.md` — データ保存方針（SQLite vs AsyncStorage vs SecureStore）
   - Repolog ADR-0006 をベースに汎用化
3. `docs/adr/ADR-0004-language-set.md` — ローカライズ範囲（なぜ 18 言語、なぜ RTL 除外）
   - Repolog ADR-0005 をベースに汎用化
4. `docs/adr/ADR-0005-ios-encryption-compliance.md` — iOS 暗号化エクスポートコンプライアンス
   - Repolog ADR-0010 をベースに汎用化
5. `docs/adr/ADR-0006-in-app-review-trigger.md` — アプリ内レビュー促進のタイミング設計
   - Repolog ADR-0012 をベースに汎用化

**how-to ドキュメント（5 本）:**

1. `docs/how-to/development/admob_advertising_setup.md` — AdMob 広告セットアップガイド
2. `docs/how-to/development/dev_vs_preview_builds.md` — Dev Build vs Preview Build の使い分け
3. `docs/how-to/workflow/google_play_release.md` — Google Play ストアリリース手順
4. `docs/how-to/workflow/ios_testflight_release.md` — iOS TestFlight リリース手順
5. `docs/how-to/workflow/release_notes_template.md` — リリースノートテンプレート

**参照元 ADR:**

- `/home/doooo/04_app-factory/apps/Repolog/docs/adr/ADR-0003-admob-banner.md`
- `/home/doooo/04_app-factory/apps/Repolog/docs/adr/ADR-0005-language-set-19.md`
- `/home/doooo/04_app-factory/apps/Repolog/docs/adr/ADR-0006-storage-policy-asyncstorage-securestore.md`
- `/home/doooo/04_app-factory/apps/Repolog/docs/adr/ADR-0010-ios-encryption-export-compliance.md`
- `/home/doooo/04_app-factory/apps/Repolog/docs/adr/ADR-0012-in-app-review-trigger.md`

**参照元 how-to:**

- `/home/doooo/04_app-factory/apps/Repolog/docs/how-to/development/admob_advertising_setup.md`
- `/home/doooo/04_app-factory/apps/Repolog/docs/how-to/development/dev_vs_preview_builds.md`
- `/home/doooo/04_app-factory/apps/Repolog/docs/how-to/workflow/google_play_release.md`
- `/home/doooo/04_app-factory/apps/Repolog/docs/how-to/workflow/ios_testflight_release.md`
- `/home/doooo/04_app-factory/apps/Repolog/docs/how-to/workflow/release_notes_template.md`

**追加:** `docs/README.md` のファイルマップを更新

**ブランチ名:** `feat/67-docs-expansion`

**注意:**

- Repolog 固有の用語（Repolog, レポート, 写真, PDF 等）は全て汎用表現に置換すること
- ADR テンプレートは `docs/adr/adr_template.md` に従うこと
- how-to は Diátaxis の How-to 分類に従い、ステップバイステップ形式で記述

---

## 実施順序（推奨）

```
1. PR #68, #69 をマージ（Phase 1 のレビュー・マージ）
2. Issue #65 (Fastlane) — 小規模、独立、リスク低
3. Issue #64 (CI) — YAML のみ、secrets 未設定で実行不可
4. Issue #67 (Docs) — 最も工数大、独立して進行可能
```

---

## 各 PR で必ず確認すること

1. `pnpm lint` が通る
2. `pnpm type-check` が通る
3. `pnpm test` が通る（28 tests / 3 suites）
4. Repolog 固有の用語が残っていないこと
5. プレースホルダー（`{{APP_NAME}}` 等）の整合性
