# App Factory テンプレート

本番レベルのモバイルアプリをすぐに作り始められる、全部入りの Expo テンプレートです。

## 含まれているもの

| カテゴリ               | 内容                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| **フレームワーク**     | Expo SDK 55, React Native 0.83.4, Expo Router v55                |
| **UI**                 | Tamagui v1, Reanimated, Gesture Handler                          |
| **状態管理**           | Zustand + AsyncStorage による永続化（persist）                   |
| **データ**             | expo-sqlite（マイグレーション対応）                              |
| **多言語対応**         | 19 言語、自動検出、Zustand ベース                                |
| **収益化**             | RevenueCat（アプリ内課金）、AdMob（広告）、UMP 同意管理          |
| **CI/CD**              | GitHub Actions（verify、Maestro smoke、Dependabot）              |
| **品質管理**           | ESLint, Prettier, lint-staged, pre-commit hooks                  |
| **テスト**             | Jest（ユニット）、Maestro（E2E）                                 |
| **スクリプト**         | デバッグツール、dev-start、i18n 監査、設定チェック、UMP チェック |
| **スクリーンショット** | Playwright + Sharp によるストア掲載用スクショパイプライン        |
| **ドキュメント**       | Diataxis 構成（explanation、reference、how-to、ADR）             |

## クイックスタート

```bash
# 1. このテンプレートから新しいリポジトリを作成（GitHub の「Use this template」ボタン）

# 2. クローンしてセットアップを実行
git clone https://github.com/YOUR_USER/YOUR_APP.git
cd YOUR_APP
bash setup.sh

# 3. 開発を始める
pnpm dev
```

## セットアップスクリプト

`setup.sh` を実行すると、すべての `{{PLACEHOLDER}}` が実際の値に置き換わります。

| プレースホルダー            | 説明                   | 例                  |
| --------------------------- | ---------------------- | ------------------- |
| `{{APP_NAME}}`              | 表示名                 | `MyApp`             |
| `{{APP_SLUG}}`              | URL 用スラッグ         | `myapp`             |
| `{{ANDROID_PACKAGE}}`       | Android パッケージ名   | `com.example.myapp` |
| `{{IOS_BUNDLE_IDENTIFIER}}` | iOS バンドル ID        | `com.example.myapp` |
| `{{APP_SCHEME}}`            | ディープリンクスキーム | `myapp`             |
| `{{DESCRIPTION}}`           | 一行の説明文           | `A great app`       |
| `{{EAS_PROJECT_ID}}`        | EAS プロジェクト ID    | `uuid`              |

## 主なコマンド

```bash
pnpm dev              # Metro バンドラーを起動
pnpm verify           # すべての品質チェックを実行
pnpm dev:android      # ADB 確認 + ポート転送 + Metro 起動
pnpm test             # ユニットテストを実行
pnpm test:e2e         # Maestro E2E テストを実行
pnpm i18n:audit       # 未使用・不足している i18n キーを検出
pnpm format:fix       # 全ファイルを自動フォーマット
pnpm debug:start      # デバッグセッションを開始
pnpm debug:stop       # デバッグセッションを終了してログを収集
pnpm monitor          # リアルタイムでクラッシュ・エラーを監視
```

## プロジェクト構成

```
app/                  # Expo Router ページ
src/
  core/               # 共通ユーティリティ（i18n、デバッグ）
  db/                 # SQLite データベース層
  features/           # 機能ごとの垂直スライス
  services/           # ビジネスロジックサービス
  stores/             # Zustand ステートストア
  types/              # TypeScript 型定義
scripts/              # 開発・ビルドスクリプト
plugins/              # Expo 設定プラグイン
docs/                 # ドキュメント（Diataxis 構成）
__tests__/            # ユニットテスト
maestro/              # E2E テストフロー
```

## ドキュメント

ドキュメントの全体マップは `docs/README.md` を参照してください。

## セットアップ後にやること

1. `.env` に API キーを入力する（AdMob、RevenueCat、Sentry、EAS）
2. `src/features/example/` と `src/db/` のサンプルコードを削除する
3. `docs/explanation/product_strategy.md` にプロダクトのビジョンを書く
4. `docs/reference/functional_spec.md` に機能仕様を書く
5. `docs/adr/` に最初の ADR（Architecture Decision Record）を作成する
