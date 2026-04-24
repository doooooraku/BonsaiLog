# 次セッション用 Claude Code プロンプト

> このファイルの内容をそのまま Claude Code に貼り付けて Phase 2 を開始してください。

---

## プロンプト（以下をコピー）

```
/plan

## 背景

Repolog アプリ（iOS/Android リリース済）の実戦ノウハウを app_template にフィードバックしています。
Phase 1（PR #68: lessons.md 統合、PR #69: src/ コードパターン改善）は完了済みです。

今回は **Phase 2**（残り 3 Issue）を実装します。

## 方針

- **Delta-only + Knowledge-first**: Repolog の汎用知見のみを移植（固有機能は対象外）
- **テンプレートの動作を壊さない**: 各 PR で `pnpm verify` 通過を確認
- **Issue 単位で個別 PR**: 独立した 3 Issue を順番に実装

## ハンドオフ資料

詳細な実装仕様は以下にまとめてあります。必ず最初に読んでください:
- `docs/reports/repolog-feedback-handoff.md` — Phase 2 の全 Issue の詳細仕様

## 実施順序

### 1. PR #68, #69 のマージ確認
まず Phase 1 の PR がマージ済みか確認してください。未マージなら先にマージしてください。

### 2. Issue #65: Fastlane メタデータ構造補完
- ブランチ: `feat/65-fastlane-metadata`
- 内容: カテゴリメタデータ 7 ファイル + review_information/ 7 ファイル + screenshots/README.md + metadata/README.md 更新
- 参照元: `/home/doooo/04_app-factory/apps/Repolog/fastlane/metadata/`
- リスク: 低（新規ファイル追加のみ）

### 3. Issue #64: CI ワークフロー 3 本追加 + 既存改善
- ブランチ: `feat/64-ci-workflows`
- 新規: download-app-store-metadata.yml, i18n-audit.yml, ump-consent-validation.yml
- 既存改善: ci.yml アクションピン留め, maestro-smoke.yml 診断強化, build-ios-testflight.yml サマリー追加
- 参照元: `/home/doooo/04_app-factory/apps/Repolog/.github/workflows/`
- 注意: CI secrets 未設定のため実行テスト不可。YAML 構文チェックのみ
- 汎用化: `com.dooooraku.repolog` → `${{ vars.IOS_BUNDLE_IDENTIFIER }}` 等に置換

### 4. Issue #67: Docs 拡充（ADR 5 本 + how-to 5 本）
- ブランチ: `feat/67-docs-expansion`
- ADR: 収益モデル, ストレージ選択, ローカライズ範囲, iOS 暗号化コンプライアンス, アプリ内レビュー
- how-to: AdMob セットアップ, Dev vs Preview ビルド, Google Play リリース, TestFlight リリース, リリースノートテンプレート
- 参照元: `/home/doooo/04_app-factory/apps/Repolog/docs/adr/` と `docs/how-to/`
- 注意: Repolog 固有用語（Repolog, レポート, 写真, PDF 等）は全て汎用表現に置換すること

## 各 PR で必ず確認すること

1. `pnpm lint` が通る
2. `pnpm type-check` が通る
3. `pnpm test` が通る
4. Repolog 固有の用語が残っていないこと
5. プレースホルダー（`{{APP_NAME}}` 等）の整合性

## リポジトリ情報

- テンプレート: `/home/doooo/04_app-factory/template/app_template` (https://github.com/doooooraku/app_template)
- 参照元: `/home/doooo/04_app-factory/apps/Repolog` (https://github.com/doooooraku/Repolog)
```
