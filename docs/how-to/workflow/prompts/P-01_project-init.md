# P-01: プロジェクト初期化

- **渡す先**: Claude Code
- **タイミング**: Phase 0（最初の 1 回だけ）
- **目的**: リポジトリ・CI・ドキュメント基盤を一括セットアップ

---

## 指示

以下のドキュメントを読み込んでから、Expo (React Native) プロジェクトを初期化してください。

## 参照ドキュメント（作成済み 3 点）

- `{PROJECT_ROOT}/docs/explanation/product_strategy.md`
- `{PROJECT_ROOT}/docs/reference/basic_spec.md`
- `{PROJECT_ROOT}/docs/reference/functional_spec.md`

## やること（この順番で）

### 1. Expo プロジェクト作成

- `npx create-expo-app {APP_NAME} --template blank-typescript`
- TypeScript strict モード有効化

### 2. constraints.md の生成

テンプレート `{PROJECT_ROOT}/docs/reference/constraints.md` の `<!-- TODO -->` 箇所を
product_strategy.md の内容から埋めてください:

- セクション 1-1: アプリのデータ保存方針（ローカル/クラウド）
- セクション 2-2: Free/Pro の具体的な制限値
- セクション 3: 対応言語一覧
- セクション 4: 非ゴール（やらないことリスト）

※ product_strategy.md に記載がない項目は `<!-- TBD -->` のまま残す（推測で埋めない）

### 3. glossary.md の生成

テンプレート `{PROJECT_ROOT}/docs/reference/glossary.md` の `{{エンティティ}}` プレースホルダーを
basic_spec.md のドメイン用語で埋めてください。

### 4. パッケージインストール

basic_spec.md と functional_spec.md から技術要件を読み取り、
必要なパッケージを **pnpm** でインストール。
推測で追加しない。ドキュメントに書かれたものだけ。

### 5. ディレクトリ構造の作成

`{PROJECT_ROOT}/docs/how-to/development/coding_rules.md` のフォルダ構造に従う。

### 6. CI 設定

`{PROJECT_ROOT}/docs/how-to/workflow/whole_workflow.md` の W-08（ローカル検証）に
定義された 5 ゲートを CI に反映:

- lint → type-check → test → i18n:check → config:check
- GitHub Actions の `uses:` は commit SHA でピン止め

### 7. GitHub リポジトリ設定

`{PROJECT_ROOT}/docs/how-to/workflow/git_workflow.md` に従い:

- Issue Forms テンプレート（bug_report.yml + feature_request.yml）
- PR テンプレート（AC チェックリスト付き）
- CODEOWNERS
- main ブランチ保護（CI 必須 + レビュー必須 + force push 禁止）

### 8. セキュリティ基盤

- .gitignore に `.env` / `*.key` / `*.pem` / `credentials.json` を追加
- .env.example を作成（変数名のみ、値は空）

### 9. package.json スクリプト

`{PROJECT_ROOT}/docs/how-to/development/quickstart.md` のコマンド表に準拠。

## 完了条件

- [ ] `pnpm verify` が全パス
- [ ] `pnpm dev` で Metro が起動
- [ ] `docs/reference/constraints.md` の `<!-- TODO -->` が埋まっている
- [ ] `docs/reference/glossary.md` のプレースホルダーが埋まっている
- [ ] `.github/` に Issue Forms + PR テンプレート + CODEOWNERS + ci.yml
